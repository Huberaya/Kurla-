/**
 * Test d'intégration de l'orchestrateur de relances (runRetentionNudges),
 * mode mémoire : création des notifications + idempotence (dédoublonnage sur
 * deux passages) + respect de la boucle (pas de nud sur donnée absente).
 */
import assert from 'node:assert';

import { runRetentionNudges } from '../src/lib/db/retentionNudgesStore';
import { intelligenceStore } from '../src/lib/intelligenceStore';
import { serverDb } from '../src/lib/serverDb';

const NOW = new Date('2026-08-30T12:00:00.000Z');
const isoDaysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

function notificationsFor(userId: string): any[] {
  return (serverDb as any).inMemoryNotifications.filter((n: any) => n.userId === userId);
}
function kindsFor(userId: string): string[] {
  return notificationsFor(userId).map((n) => n.type).sort();
}

async function main() {
  // ---- Utilisateur A : tout est dû (feedback J+14 + wash day + coiffure) ----
  const userA = 'user-ret-a';
  const shelfA = await intelligenceStore.addShelfItem(userA, {
    freeLabel: 'Crème hydratante karité',
    status: 'in_use',
  });
  // L'item date de 20 jours (au-delà du délai J+14).
  const createdAgo = isoDaysAgo(20);
  await intelligenceStore.updateShelfItem(userA, shelfA.id, {
    freeLabel: 'Crème hydratante karité',
    status: 'in_use',
  });
  // On force la date de création via le map mémoire (addShelfItem date de « maintenant »).
  const forced = (await intelligenceStore.getShelf(userA)).find((i) => i.id === shelfA.id);
  if (forced) (forced as any).createdAt = createdAgo;

  // Wash day : dernier lavage il y a 10 jours, intervalle 7 → dû.
  await intelligenceStore.saveWashDayCycle(userA, { intervalDays: 7, lastWashDayAt: isoDaysAgo(10) });

  // Coiffure protectrice : installée il y a 60 jours (dépassement des 56 max).
  await intelligenceStore.startProtectiveStyle(userA, {
    style: 'braids',
    tension: 'normal',
    installedAt: isoDaysAgo(60),
    maxWearDays: 56,
  });

  // ---- Utilisateur B : rien d'exigible (produit récent + wash à jour) ----
  const userB = 'user-ret-b';
  await intelligenceStore.addShelfItem(userB, {
    freeLabel: 'Gel lin neuf',
    status: 'in_use',
  });
  await intelligenceStore.saveWashDayCycle(userB, { intervalDays: 7, lastWashDayAt: isoDaysAgo(2) });

  // ---- Utilisateur C : feedback déjà donné (observation existante) ----
  const userC = 'user-ret-c';
  const shelfC = await intelligenceStore.addShelfItem(userC, {
    freeLabel: 'Après-shampooing',
    status: 'in_use',
  });
  const forcedC = (await intelligenceStore.getShelf(userC)).find((i) => i.id === shelfC.id);
  if (forcedC) (forcedC as any).createdAt = isoDaysAgo(20);
  await intelligenceStore.recordOutcome(userC, {
    signal: 'more_hydration',
    productId: 'prod-ret-c',
    shelfItemId: shelfC.id,
    isConsentShared: false,
  });

  // --- Premier passage ---
  const run1 = await runRetentionNudges(serverDb as any, { now: NOW });

  const usersScanned = run1.perUser.map((p) => p.userId).sort();
  assert.deepStrictEqual(
    usersScanned.sort(),
    [userA, userB, userC].sort(),
    'les trois utilisateurs ayant une donnée de boucle sont scannés'
  );

  const aKinds = kindsFor(userA);
  assert.ok(aKinds.includes('outcome_feedback'), 'A reçoit un nud feedback J+14');
  assert.ok(aKinds.includes('wash_day_due'), 'A reçoit un nud wash day dû');
  assert.ok(aKinds.includes('protective_style_removal'), 'A reçoit un nud coiffure à retirer');
  assert.strictEqual(aKinds.length, 3, `A reçoit exactement 3 nuds, reçu ${aKinds.length}`);

  const bKinds = kindsFor(userB);
  assert.strictEqual(bKinds.length, 0, `B ne reçoit aucun nud (rien d\u2019exigible), reçu ${bKinds.length}`);

  const cKinds = kindsFor(userC);
  assert.ok(
    !cKinds.includes('outcome_feedback'),
    'C ne reçoit PAS de nud feedback : une observation existe déjà sur ce produit'
  );

  const totalBefore = run1.nudgesCreated;
  assert.ok(totalBefore >= 3, `au moins 3 nuds créés au premier passage (${totalBefore})`);

  // --- Deuxième passage : idempotence, aucun doublon ---
  const run2 = await runRetentionNudges(serverDb as any, { now: NOW });
  assert.strictEqual(run2.nudgesCreated, 0, `le second passage ne crée aucun nud (dédoublonnage), créé ${run2.nudgesCreated}`);
  assert.strictEqual(
    notificationsFor(userA).length,
    3,
    'A a toujours exactement 3 notifications après le second passage'
  );

  console.log('[PASS] Orchestrateur relances : nuds créés pour les cas exigibles, rien sur données absentes/observées, et idempotent (dédoublonné sur 2 passages).');
}

main().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
