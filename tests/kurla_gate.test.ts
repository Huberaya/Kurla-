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

function main(): void {
  const proposals = evaluateGateProposals(products);

  const publish = proposals.filter(p => p.action === 'publish');
  const withdraw = proposals.filter(p => p.action === 'withdraw');

  assert.equal(publish.length, 1, 'une seule fiche prête à publier');
  assert.equal(publish[0].productId, 'p-ready-draft');
  assert.equal(publish[0].score, 100);

  assert.equal(withdraw.length, 1, 'une seule fiche à retirer');
  assert.equal(withdraw[0].productId, 'p-blocked-published');
  assert.ok(withdraw[0].reason.includes('CPNP expiré'), 'le retrait est motivé par le blocage réel');

  // Invariant de sûreté : la fiche test non conforme n'est JAMAIS proposée au retrait.
  assert.equal(proposals.some(p => p.productId === 'p-test-published'), false, 'dérogation test ignorée');
  // Ni publiée ni retirée d'office : les fiches conformes et les brouillons bloqués ne bougent pas.
  assert.equal(proposals.some(p => p.productId === 'p-ok-published'), false);
  assert.equal(proposals.some(p => p.productId === 'p-blocked-draft'), false);
  assert.equal(proposals.some(p => p.productId === 'p-unavailable'), false, 'fiche retirée volontairement intouchable');

  // findProposal exige la PAIRE (produit, action) : une action inventée ne matche pas.
  assert.ok(findProposal(proposals, 'p-ready-draft', 'publish'));
  assert.equal(findProposal(proposals, 'p-ready-draft', 'withdraw'), null);
  assert.equal(findProposal(proposals, 'p-inexistant', 'publish'), null);

  // Entrée vide ou nulle : aucune proposition, aucune exception.
  assert.deepEqual(evaluateGateProposals([]), []);

  console.log('[PASS] Porte de publication : publier si prête, retirer si non conforme, dérogations test ignorées, fiches retirées intouchables, paire produit/action exigée.');
}

main();
