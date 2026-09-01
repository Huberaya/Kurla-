import { notificationExists, sendNotification } from './notificationsStore';
import { intelligenceStore } from '../intelligenceStore';
import { getSupabaseServerClient } from '../supabaseClient';
import { getProducts } from './catalogStore';

import type { SupabaseServerStore } from '../serverDb';
import {
  NudgeInput,
  NudgeOrder,
  computeNudges,
} from '../retentionNudges';

/**
 * BOUCLE DE DONNÉES — orchestrateur de relances.
 *
 * Parcourt les utilisateurs actifs (ceux qui au moins une donnée de boucle :
 * étagère, cycle de lavage, coiffure protectrice), calcule les nuds de
 * rétention (retour J+14, wash day dû, coiffure protectrice à retirer) et les
 * matérialise en notifications in-app dédoublonnées. La clé stable de chaque
 * nud sert de `dedupe_key`, donc un nud n'est jamais créé deux fois, ni par
 * deux passages quotidiens — le run est idempotent.
 *
 * Ce module n'envoie pas d'email : ce sont des nudges in-app. Le
 * déclenchement se fait par une route admin protégée (appelée par le cron).
 *
 * Toutes les lectures passent par `intelligenceStore`, qui gère Supabase ET le
 * repli mémoire : une seule voie de code, testable sans base.
 */

export interface RetentionRunResult {
  usersScanned: number;
  nudgesCreated: number;
  nudgesByKind: Record<string, number>;
  perUser: Array<{ userId: string; created: number }>;
}

function inc(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/**
 * Utilisateurs ayant au moins une commande payée avec un compte (user_id
 * renseigné). Les invités (sans compte) reçoivent déjà les emails
 * transactionnels mais pas de notification in-app : on les exclut ici.
 */
async function listOrderingUserIds(limit: number): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  try {
    const paid = ['paid', 'processing', 'packed', 'shipped', 'delivered'];
    const { data, error } = await supabase
      .from('orders')
      .select('user_id')
      .in('status', paid)
      .not('user_id', 'is', null)
      .limit(limit);
    if (error) return [];
    const ids = new Set<string>();
    for (const row of (data || []) as any[]) {
      if (row?.user_id) ids.add(String(row.user_id));
    }
    return Array.from(ids);
  } catch {
    return [];
  }
}

/**
 * Rassemble les données commerciales d'un utilisateur : commandes payées (avec
 * slug/catégorie pour construire les liens et le flag réassort) et avis déjà
 * déposés (pour ne pas redemander). Aucune donnée inventée : un produit absent
 * du catalogue n'est pas marqué consommable.
 */
async function loadCommercialData(
  store: SupabaseServerStore,
  userId: string
): Promise<{ orders: NudgeOrder[]; productReviews: Array<{ productId?: string }> }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { orders: [], productReviews: [] };

  const [ordersRaw, catalog, reviewsRaw] = await Promise.all([
    store.getOrdersByCustomer('', userId),
    getProducts(store, { publishedOnly: true }).catch(() => [] as any[]),
    supabase
      .from('reviews')
      .select('product_id')
      .eq('user_id', userId),
  ]);

  const catalogById = new Map<string, any>(catalog.map((p: any) => [p.id, p]));
  const CONSUMABLE_CATEGORIES = /shampoing|après|apres|co-wash|cowash|leave-in|leavein|masque|huile|beurre|gel|coiffant|soin|crème|creme/i;

  const orders: NudgeOrder[] = ordersRaw
    .filter((o: any) => ['paid', 'processing', 'packed', 'shipped', 'delivered'].includes(o.status))
    .map((o: any) => {
      const dateRef = o.updatedAt || o.createdAt;
      return {
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        items: (o.items || []).map((it: any) => {
          const pid = it.productId || it.product_id;
          const product = pid ? catalogById.get(pid) : undefined;
          const category = String(product?.category || '');
          const isKit = product?.category === 'kits' || String(pid || '').startsWith('launch-k');
          const repurchase = !isKit && CONSUMABLE_CATEGORIES.test(category) && category !== 'Accessoire';
          return {
            productId: pid,
            name: it.name || product?.name || 'votre soin',
            slug: product?.slug || it.slug,
            quantity: Number(it.quantity) || 1,
            repurchase,
          };
        }).filter((it: any) => it.productId),
      } as NudgeOrder;
    })
    .filter((o: NudgeOrder) => o.items.length > 0);

  const productReviews = ((reviewsRaw.data || []) as any[])
    .map((r) => ({ productId: r.product_id ? String(r.product_id) : undefined }))
    .filter((r) => r.productId);

  return { orders, productReviews };
}

/** Construit l'entrée du calcul à partir des données du store (déjà mappées). */
function buildInput(userId: string, data: {
  shelf: any[];
  washCycle: any;
  episodes: any[];
  observations: any[];
  orders?: NudgeOrder[];
  productReviews?: Array<{ productId?: string }>;
}): NudgeInput {
  // Un cycle par défaut (jamais de lavage enregistré) n'est pas exploitable :
  // on ne doit pas déclencher de nud « wash day dû » sans historique.
  const hasWashHistory = Boolean(data.washCycle?.lastWashDayAt);
  return {
    userId,
    shelf: data.shelf.map((item) => ({
      id: String(item.id),
      freeLabel: item.freeLabel,
      productId: item.productId,
      status: item.status,
      createdAt: item.createdAt,
    })),
    washCycle: hasWashHistory
      ? {
          intervalDays: Number(data.washCycle.intervalDays) || 7,
          lastWashDayAt: data.washCycle.lastWashDayAt ?? null,
        }
      : null,
    protectiveEpisodes: data.episodes.map((ep) => ({
      id: String(ep.id),
      style: ep.style,
      tension: ep.tension,
      installedAt: ep.installedAt,
      plannedRemovalAt: ep.plannedRemovalAt ?? null,
      removedAt: ep.removedAt ?? null,
      maxWearDays: ep.maxWearDays ? Number(ep.maxWearDays) : undefined,
      signals: Array.isArray(ep.signals) ? ep.signals : [],
    })),
    observations: data.observations.map((obs) => ({
      shelfItemId: obs.shelfItemId,
      productId: obs.productId,
    })),
    orders: data.orders ?? [],
    productReviews: data.productReviews ?? [],
  };
}

export async function runRetentionNudges(
  store: SupabaseServerStore,
  options: { now?: Date; limitUsers?: number } = {}
): Promise<RetentionRunResult> {
  const now = options.now ?? new Date();
  const result: RetentionRunResult = { usersScanned: 0, nudgesCreated: 0, nudgesByKind: {}, perUser: [] };

  // Union des utilisateurs à relancer : ceux de la boucle routine (étagère,
  // wash-day, coiffure) ET ceux qui ont commandé (avis + réassort).
  const limit = options.limitUsers ?? 5000;
  const [routineUsers, orderingUsers] = await Promise.all([
    intelligenceStore.listActiveLoopUserIds(limit),
    listOrderingUserIds(limit),
  ]);
  const userIds = Array.from(new Set([...routineUsers, ...orderingUsers])).slice(0, limit);

  // Catalogue mis en cache une seule fois par run (catégorie/slug des produits).
  for (const userId of userIds) {
    result.usersScanned += 1;

    let data;
    try {
      const [shelf, washCycle, episodes, observations, commercial] = await Promise.all([
        intelligenceStore.getShelf(userId),
        intelligenceStore.getWashDayCycle(userId),
        intelligenceStore.getProtectiveStyles(userId),
        intelligenceStore.getOutcomes(userId),
        loadCommercialData(store, userId),
      ]);
      data = { shelf, washCycle, episodes, observations, orders: commercial.orders, productReviews: commercial.productReviews };
    } catch (err) {
      // Un utilisateur illisible ne doit pas faire échouer tout le run.
      console.error(`[Retention] lecture impossible pour ${userId}:`, (err as Error)?.message);
      result.perUser.push({ userId, created: 0 });
      continue;
    }

    const input = buildInput(userId, data);

    let created = 0;
    for (const nudge of computeNudges(input, now)) {
      try {
        // Idempotence : si la clé stable existe déjà (run précédent le même
        // jour), on ne recrée ni ne compte la notification.
        if (await notificationExists(store, nudge.dedupeKey)) continue;
        await sendNotification(
          store,
          userId,
          nudge.kind,
          nudge.title,
          nudge.message,
          nudge.link,
          undefined,
          nudge.dedupeKey
        );
        created += 1;
        inc(result.nudgesByKind, nudge.kind);
      } catch (err) {
        console.error(`[Retention] notification ${nudge.kind} pour ${userId}:`, (err as Error)?.message);
      }
    }
    result.nudgesCreated += created;
    result.perUser.push({ userId, created });
  }

  return result;
}
