import assert from 'node:assert/strict';

import { evaluateGateProposals, findProposal } from '../src/lib/catalogGate';

/**
 * BANC — PORTE DE PUBLICATION (chantier C4, 15/09/2026).
 *
 * La porte ne calcule que des PROPOSITIONS. Deux invariants de sûreté :
 *  - une fiche prête encore en brouillon est proposée à la publication ;
 *  - une fiche publiée non conforme est proposée au retrait, SAUF si c'est
 *    une fiche test : les dérogations assumées ne sont jamais retirées ici.
 */

const ready = { truth: { blockers: [] }, brand: 'K', description: 'd', inci: 'Aqua', image: 'https://x/y.jpg', ean: '123' };

const products = [
  // 1. Prête mais en brouillon → publier.
  { id: 'p-ready-draft', name: 'Sérum prêt', catalogStatus: 'draft', ...ready },
  // 2. Publiée mais non conforme → retirer.
  { id: 'p-blocked-published', name: 'Sérum périmé', catalogStatus: 'published', ...ready, truth: { blockers: ['CPNP expiré'] } },
  // 3. Publiée non conforme MAIS fiche test → aucune proposition (dérogation).
  { id: 'p-test-published', name: 'Fiche test', catalogStatus: 'published', isTestListing: true, ...ready, truth: { blockers: ['preuve en attente'], isTestListing: true } },
  // 4. Publiée et conforme → rien à faire.
  { id: 'p-ok-published', name: 'Sérum en ligne', catalogStatus: 'published', ...ready },
  // 5. Brouillon non conforme → pas de publication.
  { id: 'p-blocked-draft', name: 'Sérum incomplet', catalogStatus: 'draft', ...ready, truth: { blockers: ['visuel placeholder'] } },
  // 6. Retirée volontairement → la porte n'y touche jamais.
  { id: 'p-unavailable', name: 'Retirée', catalogStatus: 'unavailable', ...ready, truth: { blockers: ['x'] } },
];

const NOW = new Date('2026-09-15T12:00:00Z');

function main(): void {
  const proposals = evaluateGateProposals(products, [], NOW);

  const publish = proposals.filter(p => p.action === 'publish');
  const withdraw = proposals.filter(p => p.action === 'withdraw');

  assert.equal(publish.length, 1, 'une seule fiche prête à publier');
  assert.equal(publish[0].productId, 'p-ready-draft');
  assert.equal(publish[0].score, 100);

  // SANS dérogation, une fiche publiée non conforme est proposée au retrait —
  // y compris une fiche test : depuis C5 la protection vient de la dérogation
  // datée, plus du simple drapeau test.
  assert.equal(withdraw.length, 2, 'deux fiches non conformes sans dérogation');
  const withdrawnIds = withdraw.map(p => p.productId).sort();
  assert.deepEqual(withdrawnIds, ['p-blocked-published', 'p-test-published']);
  assert.ok(withdraw.find(p => p.productId === 'p-blocked-published')!.reason.includes('CPNP expiré'), 'le retrait est motivé par le blocage réel');

  // Une fiche test sous dérogation ACTIVE est protégée (cas couvert plus bas) ;
  // les fiches conformes, brouillons bloqués et retirées ne bougent jamais.
  assert.equal(proposals.some(p => p.productId === 'p-ok-published'), false);
  assert.equal(proposals.some(p => p.productId === 'p-blocked-draft'), false);
  assert.equal(proposals.some(p => p.productId === 'p-unavailable'), false, 'fiche retirée volontairement intouchable');

  // findProposal exige la PAIRE (produit, action) : une action inventée ne matche pas.
  assert.ok(findProposal(proposals, 'p-ready-draft', 'publish'));
  assert.equal(findProposal(proposals, 'p-ready-draft', 'withdraw'), null);
  assert.equal(findProposal(proposals, 'p-inexistant', 'publish'), null);

  // Entrée vide ou nulle : aucune proposition, aucune exception.
  assert.deepEqual(evaluateGateProposals([]), []);

  // --- C5 : les dérogations datées gouvernent les fiches test ---
  const blockedTest = { id: 'p-test-published', name: 'Fiche test', catalogStatus: 'published', isTestListing: true, ...ready, truth: { blockers: ['preuve en attente'], isTestListing: true } };

  // Dérogation ACTIVE → la fiche test reste protégée.
  const protectedProposals = evaluateGateProposals([blockedTest], [{ productId: 'p-test-published', reason: 'test', decidedBy: 'x', expiresAt: '2026-10-15T00:00:00Z' }], NOW);
  assert.deepEqual(protectedProposals, [], 'dérogation active = aucune proposition');

  // Dérogation bientôt expirée (≤ 7 j) → protège encore.
  const soonProposals = evaluateGateProposals([blockedTest], [{ productId: 'p-test-published', reason: 'test', decidedBy: 'x', expiresAt: '2026-09-20T00:00:00Z' }], NOW);
  assert.deepEqual(soonProposals, [], 'dérogation bientôt expirée = protégée, signalée ailleurs');

  // Dérogation EXPIRÉE → la protection tombe, le retrait est proposé et motivé.
  const expiredProposals = evaluateGateProposals([blockedTest], [{ productId: 'p-test-published', reason: 'test', decidedBy: 'x', expiresAt: '2026-09-01T00:00:00Z' }], NOW);
  assert.equal(expiredProposals.length, 1, 'dérogation expirée = retrait proposé');
  assert.equal(expiredProposals[0].action, 'withdraw');
  assert.ok(expiredProposals[0].reason.includes('dérogation expirée'), 'le motif cite l’expiration');

  // Une fiche sous dérogation n'est jamais publiée d'office, même prête.
  const readyDraftDerog = { id: 'p-draft-derog', name: 'Brouillon sous dérogation', catalogStatus: 'draft', ...ready };
  const neverAutoPublish = evaluateGateProposals([readyDraftDerog], [{ productId: 'p-draft-derog', reason: 'test', decidedBy: 'x', expiresAt: '2026-10-15T00:00:00Z' }], NOW);
  assert.deepEqual(neverAutoPublish, [], 'dérogation = pas de publication automatique');

  console.log('[PASS] Porte de publication : publier si prête, retirer si non conforme, dérogations actives protégées, expirées = retrait motivé, jamais de publication sous dérogation.');
}

main();
