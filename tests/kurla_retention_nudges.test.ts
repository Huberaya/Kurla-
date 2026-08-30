import assert from 'node:assert/strict';

import { computeNudges, OUTCOME_FEEDBACK_AFTER_DAYS, NudgeInput } from '../src/lib/retentionNudges';

/**
 * BOUCLE DE DONNÉES — banc des relances (logique pure).
 * Vérifie que chaque nud se déclenche au bon moment et jamais sur une
 * donnée absente : pas de rappel inventé.
 */

const now = new Date('2026-09-15T12:00:00.000Z');
function daysAgo(n: number): string {
  return new Date(now.getTime() - n * 86400000).toISOString();
}
function daysAhead(n: number): string {
  return new Date(now.getTime() + n * 86400000).toISOString();
}

const base: NudgeInput = {
  userId: 'u1',
  shelf: [],
  washCycle: null,
  protectiveEpisodes: [],
  observations: [],
};

// 1. Feedback J+14
{
  const input: NudgeInput = {
    ...base,
    shelf: [
      { id: 's-old', freeLabel: 'Leave-in karité', status: 'in_use', createdAt: daysAgo(OUTCOME_FEEDBACK_AFTER_DAYS + 2) },
      { id: 's-new', freeLabel: 'Gel', status: 'in_use', createdAt: daysAgo(3) },
      { id: 's-done', freeLabel: 'Huile', status: 'in_use', createdAt: daysAgo(30) },
      { id: 's-finished', freeLabel: 'Masque', status: 'finished', createdAt: daysAgo(40) },
    ],
    observations: [{ shelfItemId: 's-done' }],
  };
  const nudges = computeNudges(input, now);
  const feedback = nudges.filter((n) => n.kind === 'outcome_feedback');
  assert.equal(feedback.length, 1, 'un seul nud de feedback (produit éligible non déjà observé)');
  assert.equal(feedback[0].refId, 's-old');
  assert.ok(!nudges.some((n) => n.refId === 's-new'), 'produit trop récent : pas de nud');
  assert.ok(!nudges.some((n) => n.refId === 's-done'), 'produit déjà observé : pas de redemande');
  assert.ok(!nudges.some((n) => n.refId === 's-finished'), 'produit terminé : pas de nud');
}

// 2. Wash day dû
{
  const due = computeNudges({ ...base, washCycle: { intervalDays: 7, lastWashDayAt: daysAgo(9) } }, now);
  assert.equal(due.filter((n) => n.kind === 'wash_day_due').length, 1, 'wash day en retard');
  const notDue = computeNudges({ ...base, washCycle: { intervalDays: 7, lastWashDayAt: daysAgo(3) } }, now);
  assert.equal(notDue.filter((n) => n.kind === 'wash_day_due').length, 0, 'wash day pas encore dû');
  const noHistory = computeNudges({ ...base, washCycle: { intervalDays: 7, lastWashDayAt: null } }, now);
  assert.equal(noHistory.filter((n) => n.kind === 'wash_day_due').length, 0, 'sans historique : pas de rappel inventé');
}

// 3. Coiffure protectrice
{
  // Dépassement de durée max
  const overdue = computeNudges({
    ...base,
    protectiveEpisodes: [{ id: 'p1', style: 'Braids', tension: 'normal', installedAt: daysAgo(60), maxWearDays: 56, removedAt: null, signals: [] }],
  }, now);
  assert.equal(overdue.filter((n) => n.kind === 'protective_style_removal').length, 1);
  assert.match(overdue[0].title, /retirer/);

  // Tension forte avant la durée
  const tight = computeNudges({
    ...base,
    protectiveEpisodes: [{ id: 'p2', style: 'Locks', tension: 'tight', installedAt: daysAgo(10), maxWearDays: 56, removedAt: null, signals: [] }],
  }, now);
  assert.equal(tight.filter((n) => n.kind === 'protective_style_removal').length, 1, 'tension forte alerte tôt');

  // Signal de douleur
  const pain = computeNudges({
    ...base,
    protectiveEpisodes: [{ id: 'p3', style: 'Twists', tension: 'normal', installedAt: daysAgo(12), maxWearDays: 56, removedAt: null, signals: ['douleur tempes'] }],
  }, now);
  assert.equal(pain.filter((n) => n.kind === 'protective_style_removal').length, 1, 'signal de douleur alerte');

  // Coiffure récente et saine : rien
  const fresh = computeNudges({
    ...base,
    protectiveEpisodes: [{ id: 'p4', style: 'Braids', tension: 'loose', installedAt: daysAgo(5), maxWearDays: 56, removedAt: null, signals: [] }],
  }, now);
  assert.equal(fresh.filter((n) => n.kind === 'protective_style_removal').length, 0, 'coiffure saine : pas de nud');

  // Coiffure retirée : rien
  const removed = computeNudges({
    ...base,
    protectiveEpisodes: [{ id: 'p5', style: 'Braids', tension: 'tight', installedAt: daysAgo(60), maxWearDays: 56, removedAt: daysAgo(2), signals: [] }],
  }, now);
  assert.equal(removed.filter((n) => n.kind === 'protective_style_removal').length, 0, 'coiffure retirée : pas de nud');
}

// 4. Clés de dédoublonnage stables
{
  const input: NudgeInput = {
    ...base,
    shelf: [{ id: 's-x', freeLabel: 'X', status: 'in_use', createdAt: daysAgo(20) }],
  };
  const a = computeNudges(input, now);
  const b = computeNudges(input, now);
  assert.equal(a[0].dedupeKey, b[0].dedupeKey, 'dedupeKey déterministe');
}

console.log('[PASS] Relances rétention : feedback J+14 ciblé, wash day au bon moment, coiffure protectrice (durée/tension/douleur), jamais de nud inventé, dédoublonnage stable.');
