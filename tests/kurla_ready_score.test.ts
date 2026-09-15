import assert from 'node:assert/strict';

import { evaluateKurlaReady } from '../src/lib/kurlaReadyScore';

/**
 * BANC — SCORE « KURLA READY » (chantier C1, 15/09/2026).
 *
 * Le score ne juge que sur du réel : les blocages durs viennent de
 * `truth.blockers` (catalogTruth), les manques de qualité sont des champs
 * objectivement vides. Aucune invention : une fiche sans truth chargée est
 * bloquée, pas « prête ».
 */

const complete = {
  name: 'Sérum complet',
  brand: 'KURLA',
  description: 'Description complète du sérum.',
  inci: 'Aqua, Niacinamide, …',
  image: 'https://cdn.example.com/serum.jpg',
  ean: '3760000000012',
  truth: { blockers: [], isTestListing: false },
};

function main(): void {
  // 1. Fiche complète sans blocage = prête, score 100.
  const ready = evaluateKurlaReady(complete);
  assert.equal(ready.state, 'ready');
  assert.equal(ready.score, 100);
  assert.deepEqual(ready.hardBlockers, []);

  // 2. Un blocage dur (catalogTruth) fait basculer en « blocked », jamais « ready ».
  const blocked = evaluateKurlaReady({ ...complete, truth: { blockers: ['CPNP expiré le 01/09/2026'], isTestListing: false } });
  assert.equal(blocked.state, 'blocked');
  assert.ok(blocked.score < 100);
  assert.deepEqual(blocked.hardBlockers, ['CPNP expiré le 01/09/2026']);

  // 3. Manques de qualité : pénalisés et listés, mais non bloquants seuls.
  const gaps = evaluateKurlaReady({ ...complete, inci: '', ean: null });
  assert.equal(gaps.state, 'partial');
  assert.ok(gaps.qualityGaps.includes('INCI absente'));
  assert.ok(gaps.qualityGaps.includes('EAN/code-barres absent'));
  assert.deepEqual(gaps.hardBlockers, []);

  // 4. Sans truth chargée, la fiche est bloquée — jamais « prête » par défaut.
  const noTruth = evaluateKurlaReady({ ...complete, truth: undefined });
  assert.equal(noTruth.state, 'blocked');
  assert.ok(noTruth.hardBlockers.length > 0);

  // 5. Le drapeau test est remonté (les dérogations seront gouvernées en C5).
  const testListing = evaluateKurlaReady({ ...complete, truth: { blockers: [], isTestListing: true } });
  assert.equal(testListing.isTestListing, true);

  // 6. Score borné à [0, 100] même avec beaucoup de blocages.
  const worst = evaluateKurlaReady({ name: 'x', truth: { blockers: ['a', 'b', 'c', 'd', 'e'] } });
  assert.equal(worst.score, 0);
  assert.ok(worst.score >= 0 && worst.score <= 100);

  console.log('[PASS] Score KURLA Ready : ready/partial/blocked, blocages durs issus de truth, manques de qualité listés, jamais prêt sans truth, score borné.');
}

main();
