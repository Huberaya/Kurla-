import { randomUUID } from 'node:crypto';

import {
  LOYALTY_AXES,
  LOYALTY_BADGES,
  LOYALTY_EVENT_RULES,
  LOYALTY_LEVELS,
  LOYALTY_MAX_SCORE,
  LOYALTY_MAX_SCORE_WITHOUT_PURCHASE,
  LOYALTY_REWARDS,
  LOYALTY_RULE_BY_KIND,
  LoyaltyEventKind,
  isLoyaltyEventKind,
  levelForScore,
  nextLevelFor,
} from '../loyaltyRules';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type {
  LoyaltyAccountRecord,
  LoyaltyEventRecord,
  LoyaltyRedemptionRecord,
  LoyaltyRetentionCohort,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.3 — KURLA PROGRESSION.
 *
 * Loyalty par progression, pas par points seuls : cinq axes plafonnés, dont
 * l'achat (80 points sur 460). Un utilisateur qui ne commande jamais peut
 * atteindre le dernier niveau ; un utilisateur qui ne fait qu'acheter s'arrête au
 * niveau 2. Ce n'est pas une promesse d'écran, c'est une propriété du barème —
 * et `tests/loyalty_progression.test.ts` la vérifie dans les deux sens.
 *
 * Les récompenses sont débloquées par niveau, jamais achetées avec des points.
 *
 * Avec Supabase, le calcul passe par la RPC `apply_loyalty_event` : plafonds,
 * idempotence et niveau sont appliqués dans la transaction, et aucune politique
 * RLS n'autorise l'écriture directe dans `loyalty_events`. Sans Supabase, le
 * repli mémoire applique exactement le même barème.
 */

// ---------------------------------------------------------------------------
// Lectures de lignes (volontairement non exportées : `bindDomain` recolle sur le
// store tout ce qu'un module de domaine exporte)
// ---------------------------------------------------------------------------

function mapAccountRow(row: any): LoyaltyAccountRecord {
  return {
    userId: row.user_id,
    level: Number(row.level) || 1,
    progressionScore: Number(row.progression_score) || 0,
    axisScores: row.axis_scores && typeof row.axis_scores === 'object' ? row.axis_scores : {},
    badges: Array.isArray(row.badges) ? row.badges : [],
    firstActivityAt: row.first_activity_at,
    lastActivityAt: row.last_activity_at ?? null
  };
}

function mapEventRow(row: any): LoyaltyEventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    axis: row.axis,
    points: Number(row.points) || 0,
    sourceRef: row.source_ref || undefined,
    dedupeKey: row.dedupe_key,
    occurredAt: row.occurred_at
  };
}

function mapRedemptionRow(row: any): LoyaltyRedemptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    rewardCode: row.reward_code,
    status: row.status,
    note: row.note || undefined,
    createdAt: row.created_at,
    handledAt: row.handled_at ?? null,
    handledBy: row.handled_by ?? null
  };
}

function emptyAccount(userId: string): LoyaltyAccountRecord {
  return {
    userId,
    level: 1,
    progressionScore: 0,
    axisScores: {},
    badges: [],
    firstActivityAt: new Date().toISOString(),
    lastActivityAt: null
  };
}

// ---------------------------------------------------------------------------
// Barème appliqué localement (repli mémoire) — mêmes règles que la RPC
// ---------------------------------------------------------------------------

function computeLocalState(store: SupabaseServerStore, userId: string): LoyaltyAccountRecord {
  const events = eventsFor(store, userId);
  const axisScores: Record<string, number> = {};
  for (const axisRule of LOYALTY_AXES) {
    const raw = events
      .filter(event => event.axis === axisRule.axis)
      .reduce((total, event) => total + event.points, 0);
    if (raw > 0) axisScores[axisRule.axis] = Math.min(raw, axisRule.maxPoints);
  }
  const score = Object.values(axisScores).reduce((total, value) => total + value, 0);
  const distinctDays = new Set(events.map(event => event.occurredAt.slice(0, 10))).size;
  const level = levelForScore(score).level;
  const hasOrder = events.some(event => event.kind === 'order_paid');

  const badges = LOYALTY_BADGES.filter(badge => {
    const criterion = badge.criterion as Record<string, any>;
    if (typeof criterion.kind === 'string') {
      return events.filter(event => event.kind === criterion.kind).length >= Number(criterion.count);
    }
    if (typeof criterion.axis === 'string') {
      return events.filter(event => event.axis === criterion.axis).length >= Number(criterion.count);
    }
    if (typeof criterion.distinct_days === 'number') {
      return distinctDays >= criterion.distinct_days;
    }
    if (typeof criterion.level === 'number') {
      if (level < criterion.level) return false;
      if (typeof criterion.without_kind === 'string') return !hasOrder;
      return true;
    }
    return false;
  }).map(badge => badge.code);

  const existing = store.inMemoryLoyaltyAccounts.get(userId);
  return {
    userId,
    level,
    progressionScore: score,
    axisScores,
    badges,
    firstActivityAt: existing?.firstActivityAt ?? (events.at(-1)?.occurredAt || new Date().toISOString()),
    lastActivityAt: events.length ? events[0].occurredAt : null
  };
}

function eventsFor(store: SupabaseServerStore, userId: string): LoyaltyEventRecord[] {
  return store.inMemoryLoyaltyEvents.filter(event => event.userId === userId);
}

// ---------------------------------------------------------------------------
// API du domaine
// ---------------------------------------------------------------------------

export async function getLoyaltyAccount(
  store: SupabaseServerStore,
  userId: string
): Promise<LoyaltyAccountRecord> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('loyalty_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    ensureDatabaseSuccess('lecture du compte de progression', error);
    return data ? mapAccountRow(data) : emptyAccount(userId);
  }
  return store.inMemoryLoyaltyAccounts.get(userId) ?? emptyAccount(userId);
}

export async function getLoyaltyEvents(
  store: SupabaseServerStore,
  userId: string,
  limit = 50
): Promise<LoyaltyEventRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('loyalty_events')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 200));
    ensureDatabaseSuccess('lecture des faits de progression', error);
    return (data || []).map(mapEventRow);
  }
  return eventsFor(store, userId).slice(0, Math.min(Math.max(limit, 1), 200));
}

/**
 * Applique un fait de progression. Idempotent par construction : la clé est
 * dérivée du fait lui-même (utilisateur + kind + référence), donc un retry ne
 * compte pas deux fois.
 */
export async function applyLoyaltyEvent(
  store: SupabaseServerStore,
  userId: string,
  kind: LoyaltyEventKind | string,
  sourceRef?: string,
  dedupeKey?: string
): Promise<{ level: number; progressionScore: number; axisScores: Record<string, number>; badges: string[]; awardedPoints: number; duplicated: boolean }> {
  if (!isLoyaltyEventKind(kind)) {
    throw new Error(`Fait de progression inconnu : ${String(kind)}`);
  }
  const rule = LOYALTY_RULE_BY_KIND.get(kind)!;
  const key = dedupeKey || `${kind}:${userId}:${sourceRef || ''}`;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('apply_loyalty_event', {
      p_user_id: userId,
      p_kind: kind,
      p_source_ref: sourceRef ?? null,
      p_dedupe_key: key
    });
    ensureDatabaseSuccess('application du fait de progression', error);
    const result = (data || {}) as Record<string, any>;
    return {
      level: Number(result.level) || 1,
      progressionScore: Number(result.progressionScore) || 0,
      axisScores: result.axisScores && typeof result.axisScores === 'object' ? result.axisScores : {},
      badges: Array.isArray(result.badges) ? result.badges : [],
      awardedPoints: Number(result.awardedPoints) || 0,
      duplicated: result.duplicated === true
    };
  }

  // --- repli mémoire : même barème, mêmes plafonds -------------------------
  const events = store.inMemoryLoyaltyEvents;
  if (events.some(event => event.dedupeKey === key)) {
    const account = store.inMemoryLoyaltyAccounts.get(userId) ?? emptyAccount(userId);
    return { ...account, awardedPoints: 0, duplicated: true };
  }
  if (rule.onceOnly && events.some(event => event.userId === userId && event.kind === kind)) {
    const account = store.inMemoryLoyaltyAccounts.get(userId) ?? emptyAccount(userId);
    return { ...account, awardedPoints: 0, duplicated: true };
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  let points = rule.points;

  if (rule.dailyCap !== null) {
    const todayPoints = events
      .filter(event => event.userId === userId && event.kind === kind && event.occurredAt.slice(0, 10) === today)
      .reduce((total, event) => total + event.points, 0);
    if (todayPoints >= rule.dailyCap) points = 0;
  }

  const axisRule = LOYALTY_AXES.find(axis => axis.axis === rule.axis)!;
  const axisSum = events
    .filter(event => event.userId === userId && event.axis === rule.axis)
    .reduce((total, event) => total + event.points, 0);
  points = Math.max(0, Math.min(points, axisRule.maxPoints - axisSum));

  events.unshift({
    id: randomUUID(),
    userId,
    kind,
    axis: rule.axis,
    points,
    sourceRef,
    dedupeKey: key,
    occurredAt: now
  });

  const account = computeLocalState(store, userId);
  store.inMemoryLoyaltyAccounts.set(userId, account);
  return { ...account, awardedPoints: points, duplicated: false };
}

/**
 * Vue d'ensemble de l'écran Progression : où en est l'utilisateur, sur quels
 * axes, ce qu'il peut débloquer ensuite, et ce que vaut sa progression sans
 * aucun achat.
 */
export async function getLoyaltyOverview(store: SupabaseServerStore, userId: string) {
  const account = await getLoyaltyAccount(store, userId);
  const events = await getLoyaltyEvents(store, userId, 30);
  const current = levelForScore(account.progressionScore);
  const next = nextLevelFor(account.progressionScore);

  return {
    account,
    currentLevel: current,
    nextLevel: next
      ? { ...next, pointsMissing: Math.max(0, next.minScore - account.progressionScore) }
      : null,
    axes: LOYALTY_AXES.map(axisRule => ({
      ...axisRule,
      score: account.axisScores[axisRule.axis] ?? 0,
      remaining: Math.max(0, axisRule.maxPoints - (account.axisScores[axisRule.axis] ?? 0))
    })),
    maxScore: LOYALTY_MAX_SCORE,
    maxScoreWithoutPurchase: LOYALTY_MAX_SCORE_WITHOUT_PURCHASE,
    levels: LOYALTY_LEVELS,
    rules: LOYALTY_EVENT_RULES,
    badges: LOYALTY_BADGES.map(badge => ({
      ...badge,
      earned: account.badges.includes(badge.code)
    })),
    rewards: LOYALTY_REWARDS.filter(reward => reward.isActive).map(reward => ({
      ...reward,
      unlocked: account.level >= reward.levelRequired
    })),
    recentEvents: events.map(event => ({
      ...event,
      label: LOYALTY_RULE_BY_KIND.get(event.kind as LoyaltyEventKind)?.label ?? event.kind
    }))
  };
}

export async function getLoyaltyRedemptions(
  store: SupabaseServerStore,
  userId: string
): Promise<LoyaltyRedemptionRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('loyalty_redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des récompenses demandées', error);
    return (data || []).map(mapRedemptionRow);
  }
  return store.inMemoryLoyaltyRedemptions.filter(item => item.userId === userId);
}

/**
 * Demande une récompense. Le niveau est vérifié ici ET par la base (la politique
 * d'insertion limite `status` à `requested`, et le niveau requis est revérifié
 * côté administration avant tout octroi).
 */
export async function requestLoyaltyReward(
  store: SupabaseServerStore,
  userId: string,
  rewardCode: string
): Promise<LoyaltyRedemptionRecord> {
  const reward = LOYALTY_REWARDS.find(item => item.code === rewardCode && item.isActive);
  if (!reward) throw new Error('Récompense introuvable.');
  const account = await getLoyaltyAccount(store, userId);
  if (account.level < reward.levelRequired) {
    throw new Error(
      `Niveau ${reward.levelRequired} requis pour « ${reward.label} » (niveau ${account.level} atteint).`
    );
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const existing = await getLoyaltyRedemptions(store, userId);
    if (existing.some(item => item.rewardCode === rewardCode && item.status === 'requested')) {
      throw new Error('Cette récompense est déjà demandée.');
    }
    const { data, error } = await supabase
      .from('loyalty_redemptions')
      .insert({ id: randomUUID(), user_id: userId, reward_code: rewardCode, status: 'requested' })
      .select('*')
      .single();
    ensureDatabaseSuccess('demande de récompense', error);
    return mapRedemptionRow(data);
  }

  const pending = store.inMemoryLoyaltyRedemptions;
  if (pending.some(item => item.userId === userId && item.rewardCode === rewardCode && item.status === 'requested')) {
    throw new Error('Cette récompense est déjà demandée.');
  }
  const record: LoyaltyRedemptionRecord = {
    id: randomUUID(),
    userId,
    rewardCode,
    status: 'requested',
    createdAt: new Date().toISOString(),
    handledAt: null,
    handledBy: null
  };
  pending.unshift(record);
  return record;
}

export async function getAdminLoyaltyRedemptions(store: SupabaseServerStore): Promise<LoyaltyRedemptionRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('loyalty_redemptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    ensureDatabaseSuccess('lecture des récompenses à traiter', error);
    return (data || []).map(mapRedemptionRow);
  }
  return store.inMemoryLoyaltyRedemptions;
}

export async function handleLoyaltyRedemption(
  store: SupabaseServerStore,
  adminId: string,
  redemptionId: string,
  status: 'granted' | 'cancelled',
  note?: string
): Promise<LoyaltyRedemptionRecord> {
  if (status !== 'granted' && status !== 'cancelled') {
    throw new Error('Statut de traitement invalide.');
  }
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('loyalty_redemptions')
      .update({ status, note: note ?? null, handled_at: new Date().toISOString(), handled_by: adminId })
      .eq('id', redemptionId)
      .select('*')
      .maybeSingle();
    ensureDatabaseSuccess('traitement de la récompense', error);
    if (!data) throw new Error('Demande de récompense introuvable.');
    await store.recordAdminAudit(adminId, 'loyalty_redemption_handle', { redemptionId, status });
    return mapRedemptionRow(data);
  }
  const record = store.inMemoryLoyaltyRedemptions.find(item => item.id === redemptionId);
  if (!record) throw new Error('Demande de récompense introuvable.');
  record.status = status;
  record.note = note;
  record.handledAt = new Date().toISOString();
  record.handledBy = adminId;
  return record;
}

/**
 * Rétention mesurée — le critère de sortie du chantier E. Sans Supabase, la
 * rétention n'est pas mesurable : on renvoie une liste vide plutôt que des taux
 * inventés.
 */
export async function getLoyaltyRetention(store: SupabaseServerStore): Promise<LoyaltyRetentionCohort[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_loyalty_retention');
  ensureDatabaseSuccess('lecture de la rétention', error);
  return (data || []).map((row: any) => ({
    cohortWeek: row.cohort_week,
    cohortSize: Number(row.cohort_size) || 0,
    activeD30: Number(row.active_d30) || 0,
    activeD60: Number(row.active_d60) || 0,
    activeD90: Number(row.active_d90) || 0,
    rateD30: row.rate_d30 === null || row.rate_d30 === undefined ? null : Number(row.rate_d30),
    rateD60: row.rate_d60 === null || row.rate_d60 === undefined ? null : Number(row.rate_d60),
    rateD90: row.rate_d90 === null || row.rate_d90 === undefined ? null : Number(row.rate_d90)
  }));
}
