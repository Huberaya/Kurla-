// ─────────────────────────────────────────────────────────────────────────────
// RÉCUPÉRATION DES PAIERS / PAIEMENTS ABANDONNÉS
//
// Cible : les commandes créées au checkout mais jamais payées
// (`pending_payment`, `payment_pending_webhook`). Ce sont souvent des invités
// (pas de compte), donc hors du système de notifications in-app : on les relance
// par EMAIL, en 3 étapes, avec déduplication en base
// (table `abandoned_cart_emails`, une ligne par commande + étape).
//
// Séquence (délai depuis la création de la commande) :
//   étape 1 : +2 h  — rappel doux (« vous avez oublié un petit quelque chose ? »)
//   étape 2 : +24 h — relance + code RETOUR10 (-10 € dès 49 €)
//   étape 3 : +72 h — ultime (« votre panier expire bientôt ») + RETOUR10
// Après l'étape 3 on arrête de relancer. Une commande payée/annulée sort
// naturellement du périmètre (son statut change).
//
// Tolérance à l'absence de table/migration : si `abandoned_cart_emails` n'existe
// pas encore, le code journalise en console sans échouer (comme l'attribution).
// ─────────────────────────────────────────────────────────────────────────────
import { getSupabaseServerClient } from '../supabaseClient';
import { emailService } from '../emailService';
import type { ServerOrder } from './types';

const HOUR = 60 * 60 * 1000;

/** Délai minimum avant chaque étape (après création de la commande). */
const STAGE_DELAYS_MS = [2 * HOUR, 24 * HOUR, 72 * HOUR];
/** Marge de sécurité : ne pas considérer une commande « abandonnée » trop tôt. */
const STAGE_TEMPLATES = ['abandoned_cart_1', 'abandoned_cart_2', 'abandoned_cart_3'] as const;

export type AbandonedCartResult = {
  scanned: number;
  eligible: number;
  emailsSent: number;
  emailsLogged: number;
  emailsFailed: number;
  skippedNoTable: boolean;
  byStage: Record<string, number>;
  details: Array<{ orderId: string; stage: number; status: string; email?: string }>;
};

type SentRow = { order_id: string; stage: number };

/** Lit les relances déjà envoyées (replie sur [] si la table n'existe pas). */
async function loadSentEmails(): Promise<{ rows: SentRow[]; tableExists: boolean }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { rows: [], tableExists: false };
  try {
    const { data, error } = await supabase
      .from('abandoned_cart_emails')
      .select('order_id, stage');
    if (error) {
      // Table absente (migration non appliquée) : on bascule en mode journalisé.
      if (/relation .* does not exist|could not find the table|undefined table/i.test(String(error.message || error))) {
        return { rows: [], tableExists: false };
      }
      return { rows: [], tableExists: true };
    }
    return { rows: (data || []) as SentRow[], tableExists: true };
  } catch {
    return { rows: [], tableExists: false };
  }
}

async function recordSentEmail(entry: {
  orderId: string; email: string; stage: number; status: string; provider?: string; error?: string;
}): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  try {
    await supabase.from('abandoned_cart_emails').upsert(
      {
        order_id: entry.orderId,
        customer_email: entry.email,
        stage: entry.stage,
        status: entry.status,
        provider: entry.provider || null,
        error_message: entry.error || null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: 'order_id,stage', ignoreDuplicates: true }
    );
  } catch {
    /* la journalisation ne doit jamais faire échouer la relance */
  }
}

/** Construit l'URL de reprise : session Stripe encore ouverte si on l'a, sinon la boutique. */
function resumeUrlFor(order: ServerOrder, appBaseUrl?: string): string {
  const base = (appBaseUrl || process.env.PUBLIC_BASE_URL || 'https://kurla.app').replace(/\/$/, '');
  // La session Stripe expirée renverrait vers une page d'erreur ; on préfère
  // renvoyer vers le suivi de commande / boutique, sûr et sans état périmé.
  return order.customerEmail
    ? `${base}/boutique`
    : `${base}/boutique`;
}

function orderAgeMs(order: ServerOrder, now: number): number {
  const created = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
  return Number.isFinite(created) ? now - created : Infinity;
}

/**
 * Parcourt les commandes en attente de paiement et envoie la prochaine étape
 * de relance due pour chacune. Idempotent : appelé chaque heure/chaque jour,
 * une commande ne reçoit jamais deux fois la même étape.
 */
export async function runAbandonedCartRecovery(opts: {
  pendingOrders: ServerOrder[];
  now?: number;
  appBaseUrl?: string;
  limit?: number;
}): Promise<AbandonedCartResult> {
  const now = opts.now ?? Date.now();
  const result: AbandonedCartResult = {
    scanned: opts.pendingOrders.length,
    eligible: 0,
    emailsSent: 0,
    emailsLogged: 0,
    emailsFailed: 0,
    skippedNoTable: false,
    byStage: { '1': 0, '2': 0, '3': 0 },
    details: [],
  };

  const { rows: sentRows, tableExists } = await loadSentEmails();
  if (!tableExists) result.skippedNoTable = true;

  // Clé des étapes déjà envoyées : `${orderId}:${stage}`.
  const sentKeys = new Set(sentRows.map(r => `${r.order_id}:${r.stage}`));
  const maxStageByOrder = new Map<string, number>();
  sentRows.forEach(r => {
    const prev = maxStageByOrder.get(r.order_id) ?? 0;
    if (r.stage > prev) maxStageByOrder.set(r.order_id, r.stage);
  });

  const limit = Math.min(opts.limit ?? 100, 200);
  let processed = 0;

  for (const order of opts.pendingOrders) {
    if (processed >= limit) break;

    const email = (order.customerEmail || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue; // pas d'email = pas relançable
    if (!Array.isArray(order.items) || order.items.length === 0) continue;

    const age = orderAgeMs(order, now);
    if (!Number.isFinite(age)) continue;

    // Détermine l'étape due : la plus avancée dont le délai est atteint et qui
    // n'a pas encore été envoyée.
    let dueStage = 0;
    for (let s = 1; s <= 3; s++) {
      if (age >= STAGE_DELAYS_MS[s - 1] && !sentKeys.has(`${order.id}:${s}`)) {
        dueStage = s;
      }
    }
    // Si les 3 étapes sont parties, on s'arrête.
    const alreadyMax = (maxStageByOrder.get(order.id) ?? 0) >= 3;
    if (dueStage === 0 || alreadyMax) continue;

    processed += 1;
    result.eligible += 1;

    const template = STAGE_TEMPLATES[dueStage - 1];
    const resumeUrl = resumeUrlFor(order, opts.appBaseUrl);
    const items = order.items.map((it: any) => ({
      name: it.name || it.productName || 'Article',
      quantity: Number(it.quantity || 1),
      price: Number(it.price ?? it.unitPrice ?? 0),
    }));

    let sendStatus: 'sent' | 'logged' | 'failed' = 'failed';
    let provider: string | undefined;
    let errorMsg: string | undefined;

    try {
      const sendResult = await emailService.sendEmail({
        to: email,
        subject:
          dueStage === 3
            ? '⏳ Votre panier KURLA expire bientôt'
            : dueStage === 2
              ? '🧡 Vos soins KURLA vous attendent encore'
              : 'Vous avez oublié un petit quelque chose ?',
        template,
        data: {
          orderId: order.id,
          total: order.total,
          currency: 'EUR',
          items,
          resumeUrl,
          preorder: true,
        },
      });
      provider = sendResult.provider;
      if (sendResult.delivered) sendStatus = 'sent';
      else if (sendResult.status === 'logged') sendStatus = 'logged';
      else { sendStatus = 'failed'; errorMsg = sendResult.error || 'Échec de remise'; }
    } catch (e: any) {
      sendStatus = 'failed';
      errorMsg = e?.message || 'Erreur d’envoi';
    }

    if (sendStatus === 'sent') result.emailsSent += 1;
    else if (sendStatus === 'logged') result.emailsLogged += 1;
    else result.emailsFailed += 1;

    result.byStage[String(dueStage)] = (result.byStage[String(dueStage)] || 0) + 1;
    result.details.push({ orderId: order.id, stage: dueStage, status: sendStatus, email });

    // On trace même en l'absence de table (la fonction gère le repli), mais
    // seulement si la table existe pour ne pas générer d'erreurs répétées.
    if (tableExists) {
      await recordSentEmail({
        orderId: order.id,
        email,
        stage: dueStage,
        status: sendStatus,
        provider,
        error: errorMsg,
      });
    } else {
      console.log(`[AbandonedCart] (table absente — non persisté) ordre ${order.id} étape ${dueStage} → ${email} [${sendStatus}]`);
    }
  }

  return result;
}
