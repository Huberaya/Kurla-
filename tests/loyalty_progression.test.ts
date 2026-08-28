/**
 * CHANTIER 8.3 — KURLA PROGRESSION.
 *
 * Le critère de sortie du chantier E est une phrase : « un utilisateur qui ne
 * commande pas progresse et est récompensé ». Ce banc en fait une propriété
 * exécutable, vérifiée dans les deux sens :
 *
 *   1. un membre qui ne passe AUCUNE commande atteint le dernier niveau ;
 *   2. un membre qui ne fait QU'acheter s'arrête au niveau 2 — l'axe achat est
 *      plafonné à 80 points sur 460, donc acheter ne peut pas, seul, faire
 *      monter d'un niveau.
 *
 * S'y ajoutent : l'idempotence (un webhook rejoué ne compte pas deux fois), les
 * plafonds journalier et par axe, les récompenses débloquées par niveau et non
 * achetées, l'absence de politique d'écriture directe sur le journal (le barème
 * est infalsifiable côté client), et l'absence de dérive entre le barème de la
 * migration et celui de `src/lib/loyaltyRules.ts`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';

process.env.KURLA_TEST_NO_SERVER = 'true';

const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');
const rules = await import('../src/lib/loyaltyRules');

const MIGRATION = readFileSync('supabase/migrations/20260862000000_loyalty_progression.sql', 'utf8');

async function requestApp(path: string, init: RequestInit = {}) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, init);
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

await serverDb.initialize([]);

const NON_BUYER = '11111111-1111-4111-8111-111111111111';
const BUYER = '22222222-2222-4222-8222-222222222222';
const IDEMPOTENT = '33333333-3333-4333-8333-333333333333';

// ---------------------------------------------------------------------------
// 1. Barème : la migration et le module TS disent la même chose
// ---------------------------------------------------------------------------
for (const level of rules.LOYALTY_LEVELS) {
  const row = new RegExp(`\\(${level.level}, '${level.code}',\\s*'[^']*',\\s*${level.minScore},`);
  assert.match(MIGRATION, row, `niveau ${level.code} : seuil ${level.minScore} absent de la migration`);
}
for (const axis of rules.LOYALTY_AXES) {
  const row = new RegExp(`\\('${axis.axis}',\\s*'[^']*',\\s*${axis.maxPoints},`);
  assert.match(MIGRATION, row, `axe ${axis.axis} : plafond ${axis.maxPoints} absent de la migration`);
}
for (const rule of rules.LOYALTY_EVENT_RULES) {
  const cap = rule.dailyCap === null ? 'NULL' : String(rule.dailyCap);
  const row = new RegExp(`\\('${rule.kind}',\\s*'${rule.axis}',\\s*${rule.points},\\s*${cap},`);
  assert.match(MIGRATION, row, `règle ${rule.kind} : ${rule.points} points / plafond ${cap} absents de la migration`);
}

// La propriété structurante, vérifiée sur les nombres eux-mêmes.
const purchaseCap = rules.LOYALTY_AXES.find(axis => axis.axis === 'achat')!.maxPoints;
const level3 = rules.LOYALTY_LEVELS.find(level => level.level === 3)!;
assert.ok(
  purchaseCap < level3.minScore,
  `le plafond de l'axe achat (${purchaseCap}) doit rester sous le seuil du niveau 3 (${level3.minScore}) : sinon acheter suffirait à progresser`
);
assert.ok(
  rules.LOYALTY_MAX_SCORE_WITHOUT_PURCHASE >= rules.LOYALTY_LEVELS.at(-1)!.minScore,
  'le dernier niveau doit être atteignable sans aucune commande'
);

// ---------------------------------------------------------------------------
// 2. Critère de sortie : un membre qui n'achète pas atteint le dernier niveau
// ---------------------------------------------------------------------------
// La progression s'étale dans le temps : les plafonds journaliers bornent ce
// qu'une seule journée peut rapporter. On simule donc une activité répartie sur
// plusieurs jours en datant chaque fait au moment où il est enregistré (c'est ce
// que fait la RPC en conditions réelles, avec now()).
function dateForDay(dayOffset: number): string {
  const date = new Date('2026-06-01T09:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString();
}

async function emitOnDay(userId: string, kind: string, reference: string, dayOffset: number) {
  const result = await serverDb.applyLoyaltyEvent(userId, kind, reference, `test:${kind}:${reference}`);
  const event = serverDb.inMemoryLoyaltyEvents.find(item => item.dedupeKey === `test:${kind}:${reference}`);
  if (event) event.occurredAt = dateForDay(dayOffset);
  return result;
}

/** Une semaine type d'un membre assidu qui n'achète rien. */
const WEEKLY_FACTS: Array<[string, number]> = [
  ['routine_task_done', 3],
  ['journal_entry', 2],
  ['scan_performed', 3],
  ['routine_feedback', 2],
  ['question_asked', 1],
  ['ai_feedback', 1],
  ['outcome_observed', 1]
];

// Jour 0 : le socle de connaissance, puis six semaines d'activité.
await emitOnDay(NON_BUYER, 'profile_completed', 'profile', 0);
await emitOnDay(NON_BUYER, 'archetype_known', 'archetype', 0);
await emitOnDay(NON_BUYER, 'routine_preferences', 'preferences', 0);

let factCounter = 0;
for (let week = 0; week < 6; week += 1) {
  for (const [kind, times] of WEEKLY_FACTS) {
    for (let i = 0; i < times; i += 1) {
      factCounter += 1;
      // Un jour différent par fait : les plafonds journaliers ne mordent pas,
      // seuls les plafonds par axe — qui sont la vraie règle — s'appliquent.
      await emitOnDay(NON_BUYER, kind, `w${week}-${factCounter}`, week * 7 + i);
    }
  }
}
// Dernier fait : déclenche le recalcul du compte sur l'ensemble daté.
await emitOnDay(NON_BUYER, 'wash_day_completed', 'final', 42);

const nonBuyer = await serverDb.getLoyaltyAccount(NON_BUYER);
const topLevel = rules.LOYALTY_LEVELS.at(-1)!;
assert.equal(
  nonBuyer.level,
  topLevel.level,
  `un membre qui ne commande jamais doit atteindre le niveau ${topLevel.level}, obtenu ${nonBuyer.level} (${nonBuyer.progressionScore} points)`
);
assert.equal(
  nonBuyer.axisScores.achat ?? 0,
  0,
  'aucun point d’achat ne doit apparaître sur un compte sans commande'
);
for (const axis of rules.LOYALTY_AXES) {
  assert.ok(
    (nonBuyer.axisScores[axis.axis] ?? 0) <= axis.maxPoints,
    `l'axe ${axis.axis} ne doit jamais dépasser ${axis.maxPoints}`
  );
}

const overview = await serverDb.getLoyaltyOverview(NON_BUYER);
assert.ok(overview.badges.some(badge => badge.code === 'sans_achat' && badge.earned), 'le badge « Progression libre » doit être obtenu');
assert.ok(overview.badges.some(badge => badge.code === 'explorateur' && badge.earned), 'le badge « Explorateur » doit être obtenu après douze scans');
assert.ok(overview.badges.some(badge => badge.code === 'contributeur' && badge.earned), 'le badge « Contributeur » doit être obtenu');
assert.equal(overview.nextLevel, null, 'au dernier niveau, il n’y a plus de palier suivant');
assert.ok(
  overview.rewards.every(reward => reward.unlocked),
  'au dernier niveau, toutes les récompenses sont débloquées'
);

// Dès le premier jour, sans rien acheter, la progression a déjà commencé.
const dayOneUser = '55555555-5555-4555-8555-555555555555';
await serverDb.applyLoyaltyEvent(dayOneUser, 'profile_completed', 'profile', 'day1:profile');
await serverDb.applyLoyaltyEvent(dayOneUser, 'scan_performed', 'barcode', 'day1:scan');
const dayOne = await serverDb.getLoyaltyAccount(dayOneUser);
assert.ok(dayOne.progressionScore > 0, 'un premier jour sans achat doit déjà faire progresser');
assert.ok(dayOne.level >= 1, 'le niveau doit être défini dès la première activité');

// ---------------------------------------------------------------------------
// 3. Contre-épreuve : acheter seul ne fait pas progresser au-delà du niveau 2
// ---------------------------------------------------------------------------
for (let i = 0; i < 12; i += 1) {
  await serverDb.applyLoyaltyEvent(BUYER, 'order_paid', `ORD-LOYALTY-${i}`, `test:order:${i}`);
}
const buyer = await serverDb.getLoyaltyAccount(BUYER);
assert.equal(buyer.axisScores.achat, purchaseCap, `l'axe achat doit être plafonné à ${purchaseCap}`);
assert.equal(buyer.progressionScore, purchaseCap, 'aucun autre axe ne doit être crédité');
assert.ok(
  buyer.level < 3,
  `douze commandes réglées ne doivent pas suffire à atteindre le niveau 3 (obtenu ${buyer.level})`
);
assert.ok(
  buyer.progressionScore < nonBuyer.progressionScore,
  'un membre qui n’achète pas mais contribue doit dépasser un membre qui ne fait qu’acheter'
);

// ---------------------------------------------------------------------------
// 4. Idempotence et plafonds
// ---------------------------------------------------------------------------
const first = await serverDb.applyLoyaltyEvent(IDEMPOTENT, 'scan_performed', 'same-ref', 'fixed-key');
const replay = await serverDb.applyLoyaltyEvent(IDEMPOTENT, 'scan_performed', 'same-ref', 'fixed-key');
assert.equal(first.duplicated, false, 'le premier fait doit compter');
assert.equal(replay.duplicated, true, 'le rejeu de la même clé ne doit pas compter');
assert.equal(replay.awardedPoints, 0, 'un rejeu ne rapporte aucun point');

const onceFirst = await serverDb.applyLoyaltyEvent(IDEMPOTENT, 'profile_completed', 'p1', 'once-1');
const onceSecond = await serverDb.applyLoyaltyEvent(IDEMPOTENT, 'profile_completed', 'p2', 'once-2');
assert.ok(onceFirst.awardedPoints > 0, 'le profil complété compte la première fois');
assert.equal(onceSecond.awardedPoints, 0, 'un fait marqué unique ne compte qu’une fois');

// Plafond journalier du scan : au-delà, plus un point.
const scanUser = '44444444-4444-4444-8444-444444444444';
const scanRule = rules.LOYALTY_RULE_BY_KIND.get('scan_performed')!;
let scanTotal = 0;
for (let i = 0; i < 10; i += 1) {
  const result = await serverDb.applyLoyaltyEvent(scanUser, 'scan_performed', `barcode-${i}`, `scan:${i}`);
  scanTotal += result.awardedPoints;
}
assert.ok(
  scanTotal <= (scanRule.dailyCap ?? Infinity),
  `le plafond journalier (${scanRule.dailyCap}) doit borner les points de scan, obtenu ${scanTotal}`
);
assert.ok(scanTotal > 0, 'les premiers scans du jour doivent rapporter');

// ---------------------------------------------------------------------------
// 5. Récompenses : débloquées par niveau, jamais achetées
// ---------------------------------------------------------------------------
const level3Reward = rules.LOYALTY_REWARDS.find(reward => reward.levelRequired === 3)!;
await assert.rejects(
  () => serverDb.requestLoyaltyReward(BUYER, level3Reward.code),
  /Niveau 3 requis/,
  'une récompense de niveau 3 doit être refusée à un compte de niveau inférieur'
);
const granted = await serverDb.requestLoyaltyReward(NON_BUYER, level3Reward.code);
assert.equal(granted.status, 'requested', 'la demande doit être enregistrée');
await assert.rejects(
  () => serverDb.requestLoyaltyReward(NON_BUYER, level3Reward.code),
  /déjà demandée/,
  'une même récompense ne se demande pas deux fois'
);
await assert.rejects(
  () => serverDb.requestLoyaltyReward(NON_BUYER, 'reward_inexistante'),
  /introuvable/,
  'une récompense inconnue doit être refusée'
);

const handled = await serverDb.handleLoyaltyRedemption('00000000-0000-4000-8000-0000000000ad', granted.id, 'granted', 'Séance planifiée');
assert.equal(handled.status, 'granted', 'l’administration doit pouvoir honorer la demande');

// ---------------------------------------------------------------------------
// 6. Rétention : mesurée, jamais inventée
// ---------------------------------------------------------------------------
const retention = await serverDb.getLoyaltyRetention();
assert.deepEqual(retention, [], 'sans base réelle, la rétention renvoie une liste vide plutôt que des taux inventés');
assert.match(MIGRATION, /CREATE OR REPLACE FUNCTION public\.get_loyalty_retention\(\)/, 'la RPC de rétention doit exister');
assert.match(MIGRATION, /current_date >= cohort_week \+ 95/, 'une cohorte dont la fenêtre n’est pas écoulée ne doit pas produire de taux');

// ---------------------------------------------------------------------------
// 7. Le barème est infalsifiable côté client
// ---------------------------------------------------------------------------
assert.match(MIGRATION, /CREATE OR REPLACE FUNCTION public\.apply_loyalty_event/, 'la RPC d’application doit exister');
assert.match(MIGRATION, /SECURITY DEFINER/, 'la RPC s’exécute avec les droits du propriétaire, pas ceux du client');
for (const table of ['loyalty_events', 'loyalty_accounts']) {
  const insertPolicy = new RegExp(`CREATE POLICY[^;]*ON public\\.${table}\\s+FOR (INSERT|ALL)`, 'i');
  assert.doesNotMatch(MIGRATION, insertPolicy, `aucune politique d'écriture directe ne doit exister sur ${table}`);
}
assert.match(MIGRATION, /dedupe_key text NOT NULL UNIQUE/, 'la clé d’idempotence doit être unique en base');

// ---------------------------------------------------------------------------
// 8. HTTP : le barème est public, le compte est privé
// ---------------------------------------------------------------------------
const rulesResponse = await requestApp('/api/loyalty/rules');
assert.equal(rulesResponse.status, 200, 'le barème doit être lisible sans compte');
const barème = await rulesResponse.json();
assert.equal(barème.purchaseCapPoints, purchaseCap, 'le plafond de l’axe achat doit être exposé tel quel');
assert.equal(barème.totalPoints, rules.LOYALTY_MAX_SCORE, 'le total des axes doit être exposé');
assert.ok(barème.levels.length === rules.LOYALTY_LEVELS.length, 'tous les niveaux doivent être exposés');
assert.ok(barème.rewards.every((reward: any) => typeof reward.levelRequired === 'number'), 'les récompenses sont annoncées par niveau, pas par prix');

for (const path of ['/api/loyalty', '/api/loyalty/events', '/api/loyalty/rewards', '/api/admin/loyalty/redemptions', '/api/admin/loyalty/retention']) {
  const response = await requestApp(path);
  assert.equal(response.status, 401, `${path} doit refuser une requête sans jeton`);
}
const scanResponse = await requestApp('/api/loyalty/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ barcode: '3760000000000' })
});
assert.equal(scanResponse.status, 401, 'un scan ne peut pas être enregistré sans identité');

console.log(
  `[PASS] Chantier 8.3 — progression sans achat jusqu'au niveau ${topLevel.level} (${nonBuyer.progressionScore} pts), ` +
    `achat seul plafonné à ${buyer.progressionScore} pts (niveau ${buyer.level}), idempotence, plafonds, ` +
    `récompenses par niveau, barème public et infalsifiable vérifiés.`
);
