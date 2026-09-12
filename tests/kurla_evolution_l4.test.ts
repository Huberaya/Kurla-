/**
 * BANC — L4 « Re-recommandation après feedback » : J+30 du diagnostic, un seul
 * nudge « évolution » si le profil a changé, zéro sinon
 * ============================================================================
 *
 * Promesse du plan de chantiers : une cliente qui a suivi sa routine + 1
 * outcome reçoit à J+30 une recommandation marquée « évolution » avec la
 * raison ; 0 push si le profil n'a pas changé.
 *
 * Ce banc verrouille :
 *  - le déclencheur pur (retentionNudges) : seuil J+30, signaux post-diagnostic
 *    (routine suivie, retours, journal), message avec la raison, clé stable ;
 *  - la pondération apprise (recommendationEngine) : seuil de 2 observations
 *    par ingrédient, delta et raison — la même règle que le moteur complet ;
 *  - l'orchestrateur (runRetentionNudges, mode mémoire) : le scan inclut les
 *    utilisateurs à profil seul, la notification est créée une seule fois
 *    (idempotence), aucun nudge sans signal.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_evolution_l4.test.ts
 */

import assert from 'node:assert/strict';

import {
  computeNudges,
  Nudge,
  NudgeEvolution,
  PROFILE_EVOLUTION_AFTER_DAYS
} from '../src/lib/retentionNudges';
import {
  learnIngredientWeights,
  learnedOutcomeAdjustmentsForProduct
} from '../src/lib/recommendationEngine';
import { runRetentionNudges } from '../src/lib/db/retentionNudgesStore';
import { serverDb } from '../src/lib/serverDb';
import { intelligenceStore } from '../src/lib/intelligenceStore';
import type { OutcomeObservation } from '../src/lib/outcomeEvidence';

let checks = 0;
const ok = async (label: string, fn: () => void | Promise<void>) => {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const NOW = new Date('2026-09-12T12:00:00Z');
const daysAgo = (days: number): string => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const evolutionInput = (userId: string, evolution: NudgeEvolution | null | undefined) => ({
  userId,
  shelf: [],
  evolution
});

const evolutionNudges = (evolution: NudgeEvolution | null | undefined): Nudge[] =>
  computeNudges(evolutionInput('u-test', evolution), NOW).filter(n => n.kind === 'profile_evolution');

console.log('Banc L4 — re-recommandation après feedback\n');

// ---------------------------------------------------------------------------
// 1. Déclencheur pur : seuil J+30 et signaux post-diagnostic
// ---------------------------------------------------------------------------
await ok('acceptation : routine suivie + 1 retour à J+31 → un nudge « évolution » avec la raison', () => {
  const nudges = evolutionNudges({
    diagnosticAt: daysAgo(31),
    routineCompletedTasks: [{ completedAt: daysAgo(5) }],
    outcomes: [{ observedAt: daysAgo(6) }],
    journalEntries: []
  });
  assert.equal(nudges.length, 1);
  assert.match(nudges[0].title, /évolution/i);
  assert.match(nudges[0].message, /routine suivie \(1 étape terminée\)/);
  assert.match(nudges[0].message, /1 retour/);
  assert.doesNotMatch(nudges[0].message, /journal/);
  assert.equal(nudges[0].link, '/account/kurla-id');
  assert.equal(nudges[0].dedupeKey, `nudge:profile-evolution:u-test:${daysAgo(31).slice(0, 10)}`);
});

await ok('la raison ne cite que les signaux présents (retour seul)', () => {
  const nudges = evolutionNudges({
    diagnosticAt: daysAgo(40),
    outcomes: [{ observedAt: daysAgo(10) }],
    routineCompletedTasks: [],
    journalEntries: []
  });
  assert.equal(nudges.length, 1);
  assert.match(nudges[0].message, /retour/);
  assert.doesNotMatch(nudges[0].message, /routine suivie/);
  assert.doesNotMatch(nudges[0].message, /journal/);
});

await ok('0 push : J+45 sans aucun signal post-diagnostic', () => {
  assert.equal(evolutionNudges({ diagnosticAt: daysAgo(45) }).length, 0);
  assert.equal(
    evolutionNudges({
      diagnosticAt: daysAgo(45),
      outcomes: [{ observedAt: daysAgo(20) }],
      routineCompletedTasks: [{ completedAt: daysAgo(15) }],
      journalEntries: []
    }).length,
    1
  );
});

await ok('trop tôt : J+10 avec signaux → pas de nudge', () => {
  assert.equal(
    evolutionNudges({
      diagnosticAt: daysAgo(10),
      outcomes: [{ observedAt: daysAgo(2) }],
      routineCompletedTasks: [{ completedAt: daysAgo(1) }],
      journalEntries: [{ date: daysAgo(1) }]
    }).length,
    0
  );
  assert.equal(PROFILE_EVOLUTION_AFTER_DAYS, 30);
});

await ok('les signaux antérieurs au diagnostic ne comptent pas comme évolution', () => {
  assert.equal(
    evolutionNudges({
      diagnosticAt: daysAgo(31),
      outcomes: [{ observedAt: daysAgo(40) }],
      routineCompletedTasks: [{ completedAt: daysAgo(45) }],
      journalEntries: [{ date: daysAgo(50) }]
    }).length,
    0
  );
});

await ok('le journal seul suffit à qualifier l évolution du profil', () => {
  const nudges = evolutionNudges({
    diagnosticAt: daysAgo(31),
    journalEntries: [{ date: daysAgo(20) }, { date: daysAgo(12) }]
  });
  assert.equal(nudges.length, 1);
  assert.match(nudges[0].message, /journal \(2 entrées\)/);
});

await ok('sans profil (pas de diagnostic) : jamais de nudge évolution', () => {
  assert.equal(evolutionNudges(null).length, 0);
  assert.equal(evolutionNudges({ diagnosticAt: null }).length, 0);
  assert.equal(evolutionNudges({}).length, 0);
});

// ---------------------------------------------------------------------------
// 2. Pondérations apprises : la même règle que le moteur (seuil 2 observations)
// ---------------------------------------------------------------------------
const observation = (extra: Partial<OutcomeObservation>): OutcomeObservation => ({
  id: `obs-${Math.random().toString(36).slice(2, 8)}`,
  userId: 'u-test',
  signal: 'more_hydration',
  valence: 1,
  isConsentShared: false,
  observedAt: daysAgo(5),
  createdAt: daysAgo(5),
  ...extra
});

const weightsFrom = (observations: OutcomeObservation[]) => learnIngredientWeights(observations);

await ok('2 retours défavorables sur un ingrédient → ajustement -20 avec raison et preuve', () => {
  const weights = weightsFrom([
    observation({ ingredientId: 'glycerin', valence: -1 }),
    observation({ ingredientId: 'glycerin', valence: -1 })
  ]);
  const adjustments = learnedOutcomeAdjustmentsForProduct({ ingredientIds: ['glycerin'] }, weights);
  assert.equal(adjustments.length, 1);
  assert.equal(adjustments[0].kind, 'negative_outcome');
  assert.equal(adjustments[0].delta, -20);
  assert.match(adjustments[0].reason, /glycerin/);
  assert.ok(adjustments[0].evidenceId);
});

await ok('1 seule observation = bruit : aucun ajustement (seuil 2)', () => {
  const weights = weightsFrom([observation({ ingredientId: 'glycerin', valence: -1 })]);
  assert.equal(learnedOutcomeAdjustmentsForProduct({ ingredientIds: ['glycerin'] }, weights).length, 0);
  assert.equal(learnedOutcomeAdjustmentsForProduct({}, weights).length, 0);
});

await ok('2 retours favorables → bonus +15 ; ingrédient absent du produit → rien', () => {
  const weights = weightsFrom([
    observation({ ingredientId: 'glycerin', valence: 1 }),
    observation({ ingredientId: 'glycerin', valence: 1 }),
    observation({ ingredientId: 'panthenol', valence: -1 }),
    observation({ ingredientId: 'panthenol', valence: -1 })
  ]);
  const adjustments = learnedOutcomeAdjustmentsForProduct({ ingredientIds: ['glycerin'] }, weights);
  assert.equal(adjustments.length, 1);
  assert.equal(adjustments[0].kind, 'positive_outcome');
  assert.equal(adjustments[0].delta, 15);
});

// ---------------------------------------------------------------------------
// 3. Orchestrateur (mode mémoire) : scan profils, notification unique
// ---------------------------------------------------------------------------

const seedProfileAt = async (userId: string, daysAgoProfile: number): Promise<void> => {
  const record = await serverDb.saveBeautyProfile(userId, {
    hair: { washFrequency: '2-3 fois par semaine' },
    skin: { skinType: 'seche' }
  });
  // Fixage du « premier diagnostic » : la création date de `daysAgoProfile` jours.
  serverDb.inMemoryBeautyProfiles.set(userId, { ...record, createdAt: daysAgo(daysAgoProfile) });
};

await ok('orchestrateur : profil seul + routine suivie + 1 retour → notification « évolution »', async () => {
  const userId = 'u-l4-full';
  await seedProfileAt(userId, 31);
  const plan = await serverDb.saveAdaptiveRoutine(userId, {});
  assert.ok(plan.tasks.length > 0, 'le plan doit générer des tâches');
  await serverDb.updateAdaptiveRoutineTask(userId, plan.tasks[0].id, 'completed');
  await intelligenceStore.recordOutcome(userId, { signal: 'more_hydration', ingredientId: 'glycerin' });

  const result = await runRetentionNudges(serverDb, { now: NOW });
  assert.ok(result.usersScanned >= 1);
  assert.equal(result.nudgesByKind['profile_evolution'] ?? 0, 1);

  const notifications = await serverDb.getNotifications(userId);
  const evolutionNotif = notifications.find(n => n.type === 'profile_evolution');
  assert.ok(evolutionNotif, 'la notification « évolution » doit exister');
  assert.match(evolutionNotif!.message, /routine suivie/);
  assert.equal(evolutionNotif!.link, '/account/kurla-id');
});

await ok('idempotence : un second run ne recrée pas la notification (clé stable)', async () => {
  const userId = 'u-l4-full';
  const before = (await serverDb.getNotifications(userId)).filter(n => n.type === 'profile_evolution').length;
  const result = await runRetentionNudges(serverDb, { now: NOW });
  assert.equal(result.nudgesByKind['profile_evolution'] ?? 0, 0);
  const after = (await serverDb.getNotifications(userId)).filter(n => n.type === 'profile_evolution').length;
  assert.equal(after, before);
});

await ok('0 push : profil J+45 sans signal → aucun nudge évolution pour cet utilisateur', async () => {
  const userId = 'u-l4-signal-less';
  await seedProfileAt(userId, 45);

  const result = await runRetentionNudges(serverDb, { now: NOW });
  assert.equal(result.nudgesByKind['profile_evolution'] ?? 0, 0);
  const notifications = await serverDb.getNotifications(userId);
  assert.equal(notifications.filter(n => n.type === 'profile_evolution').length, 0);
});

await ok('profil récent (J+5) avec signaux → pas encore de nudge, pas de crash du run', async () => {
  const userId = 'u-l4-recent';
  await seedProfileAt(userId, 5);
  await intelligenceStore.recordOutcome(userId, { signal: 'more_hydration', ingredientId: 'glycerin' });

  const result = await runRetentionNudges(serverDb, { now: NOW });
  assert.equal(result.nudgesByKind['profile_evolution'] ?? 0, 0);
  assert.equal((await serverDb.getNotifications(userId)).filter(n => n.type === 'profile_evolution').length, 0);
});

console.log(`\n${checks} vérifications L4 réussies.`);
if (checks < 14) {
  console.error('Banc incomplet : le nombre de vérifications est inférieur à 14.');
  process.exitCode = 1;
}
