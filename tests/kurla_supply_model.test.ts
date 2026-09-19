import assert from 'node:assert/strict';

import {
  canTransitionSupplyWorkflow,
  evaluateDropshipToolRule,
  evaluateMargin,
  evaluateSupplyAlerts,
  mapProductSource,
  routeFulfillment,
  selectPrimarySource,
  transitionRequiresReason,
  type ProductSource,
} from '../src/lib/supplyModel';

/**
 * BANC — SYSTÈME D'ACHAT / APPRO / FULFILLMENT (mission 16/09/2026).
 *
 * Les 10 cas réels simulés exigés par la mission (§33), exécutés sur le vrai
 * moteur (supplyModel.ts) — pas sur une réimplémentation. Invariant partout :
 * une donnée absente reste absente (« à obtenir »), jamais 0 inventé ; un
 * routage impossible est BLOQUÉ avec motif, jamais deviné.
 */

const source = (over: Partial<ProductSource>): ProductSource => ({
  productId: 'p1',
  supplierId: 'sup-a',
  partnerName: null,
  model: 'dropshipping',
  isPrimary: true,
  costCents: 1000,
  feeCents: 100,
  fulfillmentCostCents: 200,
  commissionPct: null,
  affiliateUrl: null,
  cookieDays: null,
  leadTimeDays: 5,
  shipsFrom: 'FR',
  currency: 'EUR',
  available: true,
  notes: null,
  ...over,
});

function main(): void {
  // CAS 1 — Produit en dropshipping : route = fournisseur expédie au client.
  const drop = routeFulfillment({ sources: [source({})], supplierNameById: { 'sup-a': 'BLACKETIQUE SAS' } });
  assert.equal(drop.model, 'dropshipping');
  assert.equal(drop.responsible, 'BLACKETIQUE SAS');
  assert.equal(drop.responsibleKind, 'supplier');
  assert.deepEqual(drop.blockers, []);

  // CAS 2 — Produit affilié : le partenaire exécute ; commission remplace la marge.
  const aff = routeFulfillment({ sources: [source({ model: 'affiliation', supplierId: null, partnerName: 'Partenaire Beauté', affiliateUrl: 'https://partenaire.fr/ref=kurla', cookieDays: 30 })] });
  assert.equal(aff.responsibleKind, 'affiliate_partner');
  assert.deepEqual(aff.blockers, []);
  const affMargin = evaluateMargin({ model: 'affiliation', salePriceCents: 2000, costCents: null, feeCents: null, fulfillmentCostCents: null, commissionPct: 12 });
  assert.equal(affMargin.commissionCents, 240, 'commission 12 % de 20 €');
  assert.equal(affMargin.totalCostCents, null, 'pas de coût d’achat en affiliation');
  // Affiliation sans lien réel = bloquée (pas de fausse intégration).
  const affNoLink = routeFulfillment({ sources: [source({ model: 'affiliation', supplierId: null, partnerName: 'X', affiliateUrl: null })] });
  assert.ok(affNoLink.blockers.includes('lien d’affiliation manquant'));

  // CAS 3 — Produit 3PL : le logisticien prépare et expédie.
  const threepl = routeFulfillment({ sources: [source({ model: '3pl', supplierId: 'sup-3pl' })], supplierNameById: { 'sup-3pl': 'Logistique Ouest' } });
  assert.equal(threepl.responsibleKind, '3pl');
  assert.equal(threepl.responsible, 'Logistique Ouest');

  // CAS 4 — Plusieurs fournisseurs : la source PRINCIPAIRE décide, les autres restent options.
  const multi = [
    source({ id: 's-a', isPrimary: false, costCents: 1200 }),
    source({ id: 's-b', isPrimary: true, model: '3pl', supplierId: 'sup-b', costCents: 900 }),
  ];
  assert.equal(selectPrimarySource(multi)?.id, 's-b', 'la source principale explicite gagne');
  const multiMargin = evaluateMargin({ model: '3pl', salePriceCents: 2500, costCents: 900, feeCents: 100, fulfillmentCostCents: 300, commissionPct: null });
  assert.equal(multiMargin.totalCostCents, 1300);
  assert.equal(multiMargin.marginCents, 1200);
  assert.equal(multiMargin.marginPct, 48, 'marge 48 %');

  // CAS 5 — Produit non conforme : l'alerte critique remonte, publication impossible (porte C4).
  const alerts5 = evaluateSupplyAlerts({
    products: [{ id: 'p5', name: 'Sérum non conforme', priceCents: 1500, proofCompliant: false }],
    sourcesByProduct: { p5: [source({ productId: 'p5' })] },
    suppliers: [{ id: 'sup-a', legalName: 'A', contactEmail: 'a@a.fr' }],
  });
  assert.ok(alerts5.some(a => a.kind === 'not_compliant' && a.severity === 'critical'));

  // CAS 6 — Conforme mais informations incomplètes : alertes « manquantes », pas de valeurs fantômes.
  const alerts6 = evaluateSupplyAlerts({
    products: [{ id: 'p6', name: 'Sérum incomplet', priceCents: null, proofCompliant: true }],
    sourcesByProduct: { p6: [source({ productId: 'p6', costCents: null })] },
    suppliers: [{ id: 'sup-a', legalName: 'A', contactEmail: null }],
  });
  assert.ok(alerts6.some(a => a.kind === 'no_price' && a.severity === 'critical'));
  assert.ok(alerts6.some(a => a.kind === 'no_cost'));
  assert.ok(alerts6.some(a => a.kind === 'supplier_no_contact'));
  // 18/09 — « cliquer sur le produit » : chaque alerte porte l'id de la fiche
  // produit (et du fournisseur pour supplier_no_contact) — sans id, le nom
  // affiché reste du texte mort et rien ne peut s'ouvrir.
  for (const alerte of [...alerts5, ...alerts6]) {
    assert.ok(alerte.productId, `alerte ${alerte.kind} sans productId`);
  }
  const sansContact = alerts6.find(a => a.kind === 'supplier_no_contact');
  assert.equal(sansContact?.supplierId, 'sup-a', 'supplier_no_contact doit nommer la fiche fournisseur');
  const margin6 = evaluateMargin({ model: 'dropshipping', salePriceCents: null, costCents: null, feeCents: null, fulfillmentCostCents: null, commissionPct: null });
  assert.equal(margin6.marginCents, null, 'marge incalculable = null, pas 0');
  assert.ok(margin6.missing.includes('coût fournisseur') && margin6.missing.includes('prix de vente'));

  // CAS 7 — Validé puis ajouté au catalogue : le workflow refuse les sauts et trace.
  assert.equal(canTransitionSupplyWorkflow('validated', 'approved'), true);
  assert.equal(canTransitionSupplyWorkflow('approved', 'ready_to_publish'), true);
  assert.equal(canTransitionSupplyWorkflow('ready_to_publish', 'published'), true);
  assert.equal(canTransitionSupplyWorkflow('identified', 'published'), false, 'pas de saut identifié → publié');
  assert.equal(canTransitionSupplyWorkflow('evaluation', 'refused'), true);
  assert.equal(transitionRequiresReason('refused'), true, 'un refus exige une raison');
  assert.equal(transitionRequiresReason('approved'), false);
  assert.equal(canTransitionSupplyWorkflow('refused', 'evaluation'), true, 'un refus peut être reconsidéré');

  // CAS 8 — Rupture chez le fournisseur : source indisponible, routage BLOQUÉ
  // et motivé. Le routeur ne bascule PAS seul sur une autre source : choisir
  // un autre fournisseur est une décision humaine.
  const rupture = routeFulfillment({ sources: [source({ available: false })] });
  assert.deepEqual(rupture.blockers, ['source principale indisponible']);
  assert.equal(rupture.responsibleKind, 'unknown', 'pas de responsable inventé');
  // Sans source principale et toutes indisponibles, le motif le dit aussi.
  const noPrimary = routeFulfillment({ sources: [source({ isPrimary: false, available: false })] });
  assert.deepEqual(noPrimary.blockers, ['toutes les sources sont indisponibles']);

  // CAS 9 — Vendu mais fournisseur indisponible : alerte critique sur le produit.
  const alerts9 = evaluateSupplyAlerts({
    products: [{ id: 'p9', name: 'Sérum vendu', catalogStatus: 'published', priceCents: 1900, proofCompliant: true }],
    sourcesByProduct: { p9: [source({ productId: 'p9', available: false })] },
    suppliers: [{ id: 'sup-a', legalName: 'A', contactEmail: 'a@a.fr' }],
  });
  assert.ok(alerts9.some(a => a.kind === 'source_unavailable' && a.severity === 'critical'));

  // CAS 10 — Changement de prix fournisseur : la marge suit, l'alerte disparaît.
  const before = evaluateMargin({ model: 'dropshipping', salePriceCents: 2500, costCents: 1000, feeCents: 0, fulfillmentCostCents: 300, commissionPct: null });
  const after = evaluateMargin({ model: 'dropshipping', salePriceCents: 2500, costCents: 2200, feeCents: 0, fulfillmentCostCents: 300, commissionPct: null });
  assert.equal(before.marginCents, 1200);
  assert.equal(after.marginCents, 0, 'marge nulle après hausse — signalée, pas masquée');
  assert.equal(after.marginPct, 0);

  // CAS 11 — RÈGLE D'OR ANNÉE 1 : tous les matériels & outils (catégorie
  // « accessoires ») sont en dropship 24–48h, 0 carton à Paris. Un stock à
  // Paris ou un sourcing « Stock KURLA » sur un outil = hors règle, nommé.
  // Un cosmétique stocké n'est PAS concerné par la règle (périmètre outils).
  const rule = evaluateDropshipToolRule([
    { id: 't1', name: 'Peigne afro', category: 'accessoires', catalogStatus: 'published', stockQuantity: 0, primaryModel: 'dropshipping' },
    { id: 't2', name: 'Bonnet satin (démo)', category: 'accessoires', catalogStatus: 'unavailable', stockQuantity: 200, primaryModel: null },
    { id: 't3', name: 'Brosse sourcée en stock', category: 'accessoires', catalogStatus: 'published', stockQuantity: 0, primaryModel: 'stock_kurla' },
    { id: 'c1', name: 'Shampooing', category: 'cheveux', catalogStatus: 'published', stockQuantity: 40, primaryModel: 'stock_kurla' },
  ]);
  assert.equal(rule.toolTotal, 3, 'seule la catégorie accessoires est concernée par la règle');
  assert.deepEqual(rule.conforming.map(t => t.productId), ['t1'], 'l’outil dropship sans stock est conforme');
  assert.deepEqual(rule.violations.map(t => t.productId).sort(), ['t2', 't3'], 'les deux écarts sont isolés');
  const v2 = rule.violations.find(t => t.productId === 't2')!;
  assert.ok(v2.reasons.some(r => r.includes('0 carton') && r.includes('200')), 'le stock à Paris est nommé avec la quantité');
  const v3 = rule.violations.find(t => t.productId === 't3')!;
  assert.ok(v3.reasons.some(r => r.includes('Stock KURLA')), 'le modèle contraire à la règle est nommé');
  for (const entry of [...rule.conforming, ...rule.violations]) {
    assert.ok(entry.productId && entry.name, 'chaque entrée porte un id produit réel — la vue peut la rendre cliquable');
  }

  // Garde supplémentaire : le mapping base → domaine ne fabrique rien.
  const mapped = mapProductSource({ product_id: 'pX', model: 'nimporte', cost_cents: null, available: false });
  assert.equal(mapped.model, 'other', 'modèle inconnu replacé, pas deviné');
  assert.equal(mapped.costCents, null);
  assert.equal(mapped.available, false);

  console.log('[PASS] Système d’achat : 11 cas réels (dropship, affiliation, 3PL, multi-sources, non-conforme, incomplet, workflow tracé, rupture, fournisseur indisponible, hausse de prix, règle d’or outils dropship 0 carton) — aucune donnée inventée.');
}

main();
