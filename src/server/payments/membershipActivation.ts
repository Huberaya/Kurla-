import { serverDb } from '../../lib/serverDb';
import { isMembershipPlanCode } from '../../lib/membership';

/**
 * CHANTIER 8.5 — activation d'un abonnement KURLA+ depuis un webhook Stripe.
 *
 * Séparé de `server.ts` pour une raison simple : ce chemin est testable sans
 * clé Stripe. `tests/membership_kurla_plus.test.ts` lui passe une session
 * reconstituée et vérifie les refus — paiement non confirmé, montant incohérent,
 * devise incohérente, métadonnées absentes.
 *
 * Rien ici n'accorde un accès sans trace : `activateMembership` exige une
 * référence de paiement, en base comme en mémoire.
 */

export interface MembershipSessionLike {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  subscription?: string | { id: string } | null;
  metadata?: Record<string, string | undefined> | null;
}

export interface MembershipActivationResult {
  activated: boolean;
  userId?: string;
  planCode?: string;
  periodEnd?: string;
  reason?: string;
}

/** Fin de période : un mois ou douze mois calendaires à partir de maintenant. */
export function nextPeriodEnd(billing: 'monthly' | 'annual', from: Date = new Date()): string {
  const end = new Date(from.getTime());
  end.setUTCMonth(end.getUTCMonth() + (billing === 'annual' ? 12 : 1));
  return end.toISOString();
}

function subscriptionIdOf(session: MembershipSessionLike): string | null {
  const subscription = session.subscription;
  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id ?? null;
}

export async function activateMembershipFromCheckoutSession(
  session: MembershipSessionLike,
  now: Date = new Date()
): Promise<MembershipActivationResult> {
  const metadata = session.metadata ?? {};
  const userId = metadata.userId;
  const planCode = metadata.membershipPlan;
  const billing = metadata.membershipBilling === 'annual' ? 'annual' : 'monthly';

  if (metadata.kind !== 'membership' || !userId || !planCode) {
    return { activated: false, reason: 'Métadonnées d’abonnement absentes : cette session ne concerne pas KURLA+.' };
  }
  if (!isMembershipPlanCode(planCode) || planCode === 'libre') {
    return { activated: false, userId, reason: `Plan d’abonnement invalide : ${String(planCode)}.` };
  }
  if (session.payment_status !== 'paid') {
    return { activated: false, userId, planCode, reason: `Paiement non confirmé (${session.payment_status ?? 'statut absent'}).` };
  }
  if (session.currency && session.currency.toLowerCase() !== 'eur') {
    throw new Error(`Devise incohérente pour l'abonnement ${session.id} : ${session.currency}.`);
  }

  // Le montant attendu a été calculé à la création de la session, TVA du pays
  // comprise. Sans lui, on refuse plutôt que de deviner.
  const expected = Number(metadata.expectedAmountCents);
  if (!Number.isFinite(expected) || expected <= 0) {
    return { activated: false, userId, planCode, reason: 'Montant attendu absent des métadonnées : activation refusée.' };
  }
  if (session.amount_total !== expected) {
    throw new Error(`Montant incohérent pour l'abonnement ${session.id} : attendu ${expected}, reçu ${session.amount_total ?? 'null'}.`);
  }

  const periodEnd = nextPeriodEnd(billing, now);
  const state = await serverDb.activateMembership(userId, {
    planCode,
    // Référence de paiement : l'identifiant de souscription s'il existe, sinon
    // celui de la session. Les deux sont uniques et rejouables sans effet.
    paymentRef: subscriptionIdOf(session) ?? session.id,
    periodEnd,
    stripeSubscriptionId: subscriptionIdOf(session)
  });

  return { activated: true, userId, planCode, periodEnd, reason: state.status };
}

/** Résiliation notifiée par Stripe : l'accès s'arrête, l'essai reste consommé. */
export async function cancelMembershipFromSubscription(
  subscription: { id?: string; metadata?: Record<string, string | undefined> | null }
): Promise<{ canceled: boolean; userId?: string; reason?: string }> {
  const userId = subscription.metadata?.userId;
  if (!userId) return { canceled: false, reason: 'Souscription sans utilisateur : résiliation ignorée.' };
  try {
    await serverDb.cancelMembership(userId, false);
    return { canceled: true, userId };
  } catch (error) {
    // Aucune adhésion en base (essai jamais ouvert, ligne déjà close) : ce n'est
    // pas une erreur à rejouer indéfiniment.
    return { canceled: false, userId, reason: error instanceof Error ? error.message : 'Résiliation impossible.' };
  }
}


// ---------------------------------------------------------------------------
// Renouvellement
// ---------------------------------------------------------------------------

export interface MembershipInvoiceLike {
  id: string;
  paid?: boolean;
  status?: string | null;
  /** `subscription_create` pour la première facture, `subscription_cycle` ensuite. */
  billing_reason?: string | null;
  amount_paid?: number | null;
  currency?: string | null;
  subscription?: string | { id: string } | null;
  metadata?: Record<string, string | undefined> | null;
  lines?: { data?: Array<{ period?: { end?: number | null } | null }> } | null;
}

export interface MembershipRenewalResult {
  renewed: boolean;
  subscriptionId?: string;
  periodEnd?: string;
  reason?: string;
}

/**
 * Reconduit l'abonnement quand une nouvelle période est encaissée.
 *
 * La souscription est retrouvée par son identifiant : les métadonnées d'une
 * facture ne sont pas une source fiable. La première facture
 * (`subscription_create`) est ignorée — c'est `checkout.session.completed` qui
 * active, et la traiter deux fois créerait une double période.
 */
export async function renewMembershipFromInvoice(
  invoice: MembershipInvoiceLike,
  now: Date = new Date()
): Promise<MembershipRenewalResult> {
  const subscription = invoice.subscription;
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id ?? null;

  if (invoice.billing_reason === 'subscription_create') {
    return { renewed: false, reason: 'Première facture : l’activation passe par le Checkout.' };
  }
  if (!subscriptionId) {
    return { renewed: false, reason: 'Facture sans souscription : renouvellement ignoré.' };
  }
  if (invoice.paid !== true && invoice.status !== 'paid') {
    return { renewed: false, subscriptionId, reason: `Facture non payée (${invoice.status ?? invoice.paid ?? 'statut absent'}).` };
  }
  if (invoice.currency && invoice.currency.toLowerCase() !== 'eur') {
    throw new Error(`Devise incohérente pour la facture ${invoice.id} : ${invoice.currency}.`);
  }

  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  if (typeof periodEnd !== 'number' || !Number.isFinite(periodEnd)) {
    return { renewed: false, subscriptionId, reason: 'Période absente de la facture : renouvellement ignoré.' };
  }
  const periodEndIso = new Date(Math.max(periodEnd * 1000, now.getTime() + 60_000)).toISOString();

  try {
    const state = await serverDb.renewMembershipBySubscription(subscriptionId, periodEndIso);
    return { renewed: true, subscriptionId, periodEnd: state.accessUntil ?? periodEndIso, reason: state.status };
  } catch (error) {
    // Souscription inconnue : rien à reconduire. Ce n'est pas une erreur à
    // rejouer, mais elle est tracée plutôt qu'avalée.
    return { renewed: false, subscriptionId, reason: error instanceof Error ? error.message : 'Renouvellement impossible.' };
  }
}
