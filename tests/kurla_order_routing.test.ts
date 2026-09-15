import assert from 'node:assert/strict';

import { routeOrderItems } from '../src/lib/orderRouting';
import type { ProductSource } from '../src/lib/supplyModel';

/**
 * BANC — JONCTION COMMANDE → ROUTEUR (16/09/2026).
 *
 * Au paiement, chaque ligne reçoit sa route FIGÉE. Invariants : aucune route
 * inventée (ligne sans source = bloquée avec motif), responsables agrégés
 * pour répondre à « qui expédie cette commande ? ».
 */

const source = (over: Partial<ProductSource>): ProductSource => ({
  productId: 'p1',
  supplierId: 'sup-a',
  partnerName: null,
  model: 'dropshipping',
  isPrimary: true,
  costCents: 1000,
  feeCents: null,
  fulfillmentCostCents: null,
  commissionPct: null,
  affiliateUrl: null,
  cookieDays: null,
  leadTimeDays: 4,
  shipsFrom: 'FR',
  currency: 'EUR',
  available: true,
  notes: null,
  ...over,
});

function main(): void {
  // 1. Commande mixte : une ligne routée, une ligne sans source = bloquée.
  const plan = routeOrderItems(
    [
      { id: 'i1', productId: 'p1', name: 'Sérum A', quantity: 2 },
      { id: 'i2', productId: 'p2', name: 'Crème B', quantity: 1 },
    ],
    { p1: [source({})] },
    { 'sup-a': 'BLACKETIQUE SAS' },
  );
  assert.equal(plan.routes.length, 2);
  assert.equal(plan.blocked, true, 'une ligne sans source bloque la commande');
  assert.equal(plan.blockedCount, 1);
  const routeA = plan.routes[0];
  assert.equal(routeA.responsible, 'BLACKETIQUE SAS');
  assert.equal(routeA.model, 'dropshipping');
  assert.equal(routeA.leadTimeDays, 4);
  const routeB = plan.routes[1];
  assert.deepEqual(routeB.blockers, ['aucune source d’approvisionnement']);
  assert.equal(routeB.model, null, 'pas de modèle deviné');

  // 2. « Qui expédie cette commande ? » — l'agrégat par responsable.
  assert.deepEqual(plan.responsibleSummary, { 'BLACKETIQUE SAS': 2, 'à déterminer': 1 });

  // 3. Commande entièrement routable : non bloquée.
  const clean = routeOrderItems(
    [{ id: 'i1', productId: 'p1', name: 'Sérum A', quantity: 3 }],
    { p1: [source({})] },
    { 'sup-a': 'BLACKETIQUE SAS' },
  );
  assert.equal(clean.blocked, false);
  assert.deepEqual(clean.responsibleSummary, { 'BLACKETIQUE SAS': 3 });

  // 4. Quantité invalide replacée à 1 — jamais 0, jamais NaN.
  const odd = routeOrderItems(
    [{ productId: 'p1', quantity: 0 }, { productId: 'p1', quantity: Number.NaN }],
    { p1: [source({})] },
    { 'sup-a': 'A' },
  );
  assert.equal(odd.routes[0].quantity, 1);
  assert.equal(odd.routes[1].quantity, 1);

  // 5. Ligne sans productId ignorée, commande vide non bloquée.
  const empty = routeOrderItems([{ productId: '' }], {}, {});
  assert.deepEqual(empty.routes, []);
  assert.equal(empty.blocked, false);

  console.log('[PASS] Jonction commande→routeur : routes figées par ligne, ligne sans source bloquée avec motif, agrégat « qui expédie », quantités sûres.');
}

main();
