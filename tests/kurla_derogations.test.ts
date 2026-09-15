import assert from 'node:assert/strict';

import { classifyDerogation, isProtectedByDerogation, summarizeDerogations, buildDerogationAlertText } from '../src/lib/derogations';

/**
 * BANC — DÉROGATIONS DATÉES (chantier C5, 15/09/2026).
 *
 * Une dérogation protège tant qu'elle est valide ; une date illisible est
 * traitée comme EXPIRÉE (protection refusée, jamais inventée).
 */

const NOW = new Date('2026-09-15T12:00:00Z');

function main(): void {
  // 1. Classification : active / bientôt expirée (≤ 7 j) / expirée.
  assert.equal(classifyDerogation('2026-10-15T00:00:00Z', NOW), 'active');
  assert.equal(classifyDerogation('2026-09-20T00:00:00Z', NOW), 'expiring_soon');
  assert.equal(classifyDerogation('2026-09-01T00:00:00Z', NOW), 'expired');
  // Date illisible = expirée : on ne protège jamais sur une donnée invalide.
  assert.equal(classifyDerogation('pas-une-date', NOW), 'expired');

  // 2. Protection : active et bientôt-expirée protègent ; expirée et absente non.
  const rows = [
    { productId: 'a', reason: 'test', decidedBy: 'x', expiresAt: '2026-10-15T00:00:00Z' },
    { productId: 'b', reason: 'test', decidedBy: 'x', expiresAt: '2026-09-01T00:00:00Z' },
  ];
  assert.equal(isProtectedByDerogation('a', rows, NOW), true);
  assert.equal(isProtectedByDerogation('b', rows, NOW), false, 'expirée = plus de protection');
  assert.equal(isProtectedByDerogation('inconnu', rows, NOW), false);
  assert.equal(isProtectedByDerogation('a', null, NOW), false);

  // 3. Récapitulatif.
  const summary = summarizeDerogations([
    { productId: 'a', reason: 'r', decidedBy: 'x', expiresAt: '2026-10-15T00:00:00Z' },
    { productId: 'b', reason: 'r', decidedBy: 'x', expiresAt: '2026-09-20T00:00:00Z' },
    { productId: 'c', reason: 'r', decidedBy: 'x', expiresAt: '2026-09-01T00:00:00Z' },
  ], NOW);
  assert.deepEqual(summary, { total: 3, active: 1, expiringSoon: 1, expired: 1 });

  // 4. Texte d'alerte : ne liste que du réel, cite les fiches à traiter.
  const text = buildDerogationAlertText([
    { productId: 'a', name: 'Sérum A', reason: 'test vitrine', decidedBy: 'x', expiresAt: '2026-09-20T00:00:00Z' },
    { productId: 'b', name: 'Sérum B', reason: 'test vitrine', decidedBy: 'x', expiresAt: '2026-09-01T00:00:00Z' },
  ], NOW);
  assert.ok(text.includes('expirent sous 7 jours : 1'));
  assert.ok(text.includes('expirées (la porte peut proposer le retrait) : 1'));
  assert.ok(text.includes('Sérum A') && text.includes('Sérum B'));
  assert.ok(text.includes('EXPIRÉE le 01/09/2026'), 'la fiche expirée est nommée avec sa date');

  console.log('[PASS] Dérogations : classification active/bientôt/expirée, date illisible = expirée, protection bornée, récapitulatif et texte d’alerte réels.');
}

main();
