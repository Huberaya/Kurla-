import { randomUUID } from 'node:crypto';

import {
  MEMBERSHIP_PLANS,
  MEMBERSHIP_TRIAL_DAYS,
  MembershipBilling,
  MembershipDossier,
  MembershipOffer,
  MembershipPlanCode,
  MembershipRecord,
  MembershipState,
  entitlementsFor,
  evaluateMembershipOffer,
  isMembershipPaymentConfigured,
  isMembershipPlanCode,
  membershipPrice,
  resolveMembershipState
} from '../membership';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.5 — ABONNEMENT KURLA+.
 *
 * Trois règles, appliquées ici ET dans la migration :
 *
 *   1. Aucun abonnement payant sans référence de paiement — la RPC refuse une
 *      référence vide, et le repli mémoire refuse aussi.
 *   2. Un seul essai par compte, à vie — la preuve est le journal
 *      `membership_events`, pas la ligne courante.
 *   3. Aucune écriture directe : le statut ne change que par RPC, exécutables
 *      par `service_role` seulement.
 *
 * L'échéance ne dépend d'aucun traitement planifié : `resolveMembershipState`
 * dérive le statut de l'heure. `expireMemberships` aligne la base, il ne crée
 * aucun droit.
 */

export interface MembershipEventRecord {
  id: string;
  userId: string;
  kind: 'trial_started' | 'activated' | 'canceled' | 'expired' | string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

function mapRow(row: any): MembershipRecord {
  return {
    userId: row.user_id,
    planCode: isMembershipPlanCode(row.plan_code) ? row.plan_code : 'libre',
    status: row.status === 'active' || row.status === 'trialing' || row.status === 'canceled' || row.status === 'expired'
      ? row.status
      : 'canceled',
    startedAt: row.started_at,
    currentPeriodEnd: row.current_period_end ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    canceledAt: row.canceled_at ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    paymentRef: row.payment_ref ?? null
  };
}

function addDaysIso(from: Date, days: number): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export async function getMembership(
  store: SupabaseServerStore,
  userId: string
): Promise<MembershipRecord | null> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    ensureDatabaseSuccess("lecture de l'adhésion", error);
    return data ? mapRow(data) : null;
  }
  return store.inMemoryMemberships.get(userId) ?? null;
}

/** État effectif : ce à quoi le membre a droit maintenant. */
export async function getMembershipState(
  store: SupabaseServerStore,
  userId: string
): Promise<MembershipState> {
  return resolveMembershipState(await getMembership(store, userId));
}

// ---------------------------------------------------------------------------
// Essai, activation, résiliation, échéance
// ---------------------------------------------------------------------------

export async function startMembershipTrial(
  store: SupabaseServerStore,
  userId: string,
  planCode: string = 'kurla_plus'
): Promise<MembershipState> {
  if (!isMembershipPlanCode(planCode)) {
    throw new Error(`Plan inconnu : ${String(planCode)}`);
  }
  const plan = MEMBERSHIP_PLANS.find(entry => entry.code === planCode)!;
  if (!plan.isPaid || plan.trialDays <= 0) {
    throw new Error(`Le plan ${planCode} ne propose pas d'essai.`);
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.rpc('start_membership_trial', {
      p_user_id: userId,
      p_plan_code: planCode
    });
    ensureDatabaseSuccess("ouverture de l'essai", error);
    return resolveMembershipState(await getMembership(store, userId));
  }

  // --- repli mémoire : mêmes refus que la RPC ------------------------------
  const events = store.inMemoryMembershipEvents;
  if (events.some(event => event.userId === userId && event.kind === 'trial_started')) {
    throw new Error('Essai déjà utilisé sur ce compte.');
  }
  const current = store.inMemoryMemberships.get(userId);
  const now = new Date();
  if (current && ['trialing', 'active'].includes(current.status)) {
    const end = current.currentPeriodEnd ? Date.parse(current.currentPeriodEnd) : NaN;
    if (!Number.isFinite(end) || end > now.getTime()) {
      throw new Error('Un abonnement est déjà en cours.');
    }
  }

  const trialEndsAt = addDaysIso(now, MEMBERSHIP_TRIAL_DAYS);
  const record: MembershipRecord = {
    userId,
    planCode,
    status: 'trialing',
    startedAt: now.toISOString(),
    currentPeriodEnd: trialEndsAt,
    trialEndsAt,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: null,
    paymentRef: null
  };
  store.inMemoryMemberships.set(userId, record);
  events.unshift({
    id: randomUUID(),
    userId,
    kind: 'trial_started',
    payload: { plan: planCode, trialDays: MEMBERSHIP_TRIAL_DAYS, trialEndsAt },
    occurredAt: now.toISOString()
  });
  return resolveMembershipState(record, now);
}

/**
 * Active un abonnement payant. Appelée uniquement par le backend après
 * confirmation de paiement : sans référence, elle refuse — en base comme en
 * mémoire.
 */
export async function activateMembership(
  store: SupabaseServerStore,
  userId: string,
  input: { planCode: string; paymentRef: string; periodEnd: string; stripeSubscriptionId?: string | null }
): Promise<MembershipState> {
  if (!isMembershipPlanCode(input.planCode)) {
    throw new Error(`Plan inconnu : ${String(input.planCode)}`);
  }
  const paymentRef = typeof input.paymentRef === 'string' ? input.paymentRef.trim() : '';
  if (!paymentRef) {
    throw new Error('Aucun abonnement payant sans référence de paiement.');
  }
  const periodEnd = Date.parse(input.periodEnd);
  if (!Number.isFinite(periodEnd) || periodEnd <= Date.now()) {
    throw new Error('Fin de période invalide : elle doit être dans le futur.');
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.rpc('activate_membership', {
      p_user_id: userId,
      p_plan_code: input.planCode,
      p_payment_ref: paymentRef,
      p_period_end: new Date(periodEnd).toISOString(),
      p_stripe_subscription_id: input.stripeSubscriptionId ?? null
    });
    ensureDatabaseSuccess("activation de l'abonnement", error);
    return resolveMembershipState(await getMembership(store, userId));
  }

  const now = new Date();
  const record: MembershipRecord = {
    userId,
    planCode: input.planCode,
    status: 'active',
    startedAt: now.toISOString(),
    currentPeriodEnd: new Date(periodEnd).toISOString(),
    trialEndsAt: store.inMemoryMemberships.get(userId)?.trialEndsAt ?? null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    paymentRef
  };
  store.inMemoryMemberships.set(userId, record);
  store.inMemoryMembershipEvents.unshift({
    id: randomUUID(),
    userId,
    kind: 'activated',
    payload: { plan: input.planCode, periodEnd: record.currentPeriodEnd, paymentRef },
    occurredAt: now.toISOString()
  });
  return resolveMembershipState(record, now);
}

export async function cancelMembership(
  store: SupabaseServerStore,
  userId: string,
  atPeriodEnd = true
): Promise<MembershipState> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.rpc('cancel_membership', {
      p_user_id: userId,
      p_at_period_end: atPeriodEnd
    });
    ensureDatabaseSuccess("résiliation de l'abonnement", error);
    return resolveMembershipState(await getMembership(store, userId));
  }

  const current = store.inMemoryMemberships.get(userId);
  if (!current) throw new Error('Aucun abonnement à résilier.');
  if (!['trialing', 'active'].includes(current.status)) {
    throw new Error(`Abonnement déjà clos (statut ${current.status}).`);
  }
  const now = new Date();
  const record: MembershipRecord = atPeriodEnd
    ? { ...current, cancelAtPeriodEnd: true }
    : { ...current, status: 'canceled', canceledAt: now.toISOString(), cancelAtPeriodEnd: false };
  store.inMemoryMemberships.set(userId, record);
  store.inMemoryMembershipEvents.unshift({
    id: randomUUID(),
    userId,
    kind: 'canceled',
    payload: { atPeriodEnd, status: record.status, accessUntil: record.currentPeriodEnd },
    occurredAt: now.toISOString()
  });
  return resolveMembershipState(record, now);
}

/**
 * Reconduit un abonnement après l'encaissement d'une nouvelle période.
 *
 * Retrouvé par identifiant de souscription, pas par les métadonnées de la
 * facture : Stripe ne les recopie pas de façon fiable. Une souscription inconnue
 * est une erreur — reconduire au hasard accorderait un accès sans contrepartie.
 */
export async function renewMembershipBySubscription(
  store: SupabaseServerStore,
  stripeSubscriptionId: string,
  periodEnd: string
): Promise<MembershipState> {
  const subscriptionId = typeof stripeSubscriptionId === 'string' ? stripeSubscriptionId.trim() : '';
  if (!subscriptionId) throw new Error('Souscription manquante.');
  const end = Date.parse(periodEnd);
  if (!Number.isFinite(end) || end <= Date.now()) {
    throw new Error('Fin de période invalide : elle doit être dans le futur.');
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.rpc('renew_membership', {
      p_stripe_subscription_id: subscriptionId,
      p_period_end: new Date(end).toISOString()
    });
    ensureDatabaseSuccess("renouvellement de l'abonnement", error);
    const { data, error: readError } = await supabase
      .from('memberships')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    ensureDatabaseSuccess("lecture de l'adhésion renouvelée", readError);
    return resolveMembershipState(data ? mapRow(data) : null);
  }

  const entry = [...store.inMemoryMemberships.entries()].find(
    ([, record]) => record.stripeSubscriptionId === subscriptionId
  );
  if (!entry) throw new Error(`Aucun abonnement pour la souscription ${subscriptionId}.`);
  const [userId, record] = entry;
  const renewed: MembershipRecord = {
    ...record,
    status: 'active',
    currentPeriodEnd: new Date(end).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null
  };
  store.inMemoryMemberships.set(userId, renewed);
  store.inMemoryMembershipEvents.unshift({
    id: randomUUID(),
    userId,
    kind: 'renewed',
    payload: { plan: renewed.planCode, periodEnd: renewed.currentPeriodEnd, stripeSubscriptionId: subscriptionId },
    occurredAt: new Date().toISOString()
  });
  return resolveMembershipState(renewed);
}

/**
 * Bascule en `expired` les essais et abonnements échus. Idempotente, et sans
 * effet sur les droits : la lecture les dérive déjà de l'heure.
 */
export async function expireMemberships(
  store: SupabaseServerStore
): Promise<{ expiredTrials: number; expiredSubscriptions: number }> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('expire_memberships');
    ensureDatabaseSuccess("échéance des adhésions", error);
    const result = (data || {}) as Record<string, any>;
    return {
      expiredTrials: Number(result.expiredTrials) || 0,
      expiredSubscriptions: Number(result.expiredSubscriptions) || 0
    };
  }

  const now = Date.now();
  let trials = 0;
  let subscriptions = 0;
  for (const [userId, record] of store.inMemoryMemberships) {
    if (record.status === 'trialing' && record.trialEndsAt && Date.parse(record.trialEndsAt) <= now) {
      store.inMemoryMemberships.set(userId, { ...record, status: 'expired' });
      trials += 1;
    } else if (record.status === 'active' && record.currentPeriodEnd && Date.parse(record.currentPeriodEnd) <= now) {
      store.inMemoryMemberships.set(userId, { ...record, status: 'expired' });
      subscriptions += 1;
    }
  }
  return { expiredTrials: trials, expiredSubscriptions: subscriptions };
}

// ---------------------------------------------------------------------------
// Dossier et offre : « le dossier doit valoir quelque chose »
// ---------------------------------------------------------------------------

async function buildMembershipDossier(
  store: SupabaseServerStore,
  userId: string
): Promise<MembershipDossier> {
  const [profileRecord, photos, profileHistory, routineState, loyaltyAccount] = await Promise.all([
    store.getBeautyProfile(userId),
    store.getBeautyProfilePhotos(userId),
    store.getBeautyProfileHistory(userId),
    store.getAdaptiveRoutineState(userId),
    store.getLoyaltyAccount(userId)
  ]);

  const journal = routineState?.journal ?? [];
  const metricCounts = ['hydrationScore', 'breakageScore', 'comfortScore', 'detanglingScore'].map(key =>
    journal.filter(entry => typeof (entry as any)[key] === 'number').length
  );
  const activeDays = new Set(journal.map(entry => String(entry.entryDate).slice(0, 10))).size;

  return {
    profileComplete: (profileRecord?.confidence?.overall ?? 0) >= 60,
    journalEntries: journal.length,
    photos: (photos ?? []).length,
    profileRevisions: (profileHistory ?? []).length,
    loyaltyLevel: loyaltyAccount?.level ?? 1,
    activeDays,
    bestMetricPoints: metricCounts.length ? Math.max(...metricCounts) : 0
  };
}

export interface MembershipOverview {
  state: MembershipState;
  entitlements: ReturnType<typeof entitlementsFor>;
  dossier: MembershipDossier;
  offer: MembershipOffer;
  pricing: Array<{
    planCode: MembershipPlanCode;
    label: string;
    tagline: string;
    monthly: ReturnType<typeof membershipPrice>;
    annual: ReturnType<typeof membershipPrice>;
  }>;
  /** Un paiement est-il réellement possible ? Jamais simulé. */
  paymentConfigured: boolean;
  disclaimers: string[];
  persistence: 'supabase' | 'server_fallback';
}

export async function getMembershipOverview(
  store: SupabaseServerStore,
  userId: string,
  country?: string
): Promise<MembershipOverview> {
  const billing: MembershipBilling[] = ['monthly', 'annual'];
  const [state, dossier] = await Promise.all([
    getMembershipState(store, userId),
    buildMembershipDossier(store, userId)
  ]);

  return {
    state,
    entitlements: entitlementsFor(state.effectivePlan),
    dossier,
    offer: evaluateMembershipOffer(dossier),
    pricing: MEMBERSHIP_PLANS.map(plan => ({
      planCode: plan.code,
      label: plan.label,
      tagline: plan.tagline,
      monthly: membershipPrice(plan.code, billing[0], country),
      annual: membershipPrice(plan.code, billing[1], country)
    })),
    paymentConfigured: isMembershipPaymentConfigured(),
    disclaimers: [
      'Les prix sont indiqués hors taxe ; la TVA du pays de livraison s’ajoute au moment du paiement.',
      'L’essai de 14 jours ne demande aucun moyen de paiement et se termine tout seul.',
      'KURLA+ analyse vos déclarations. Ce n’est ni un diagnostic, ni une promesse de résultat.'
    ],
    persistence: getSupabaseServerClient() ? 'supabase' : 'server_fallback'
  };
}
