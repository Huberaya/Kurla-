/**
 * PIPELINE DE MISE EN VENTE (chantier 17/09 — lot 1 : B + C).
 *
 * Les vues de gouvernance sont dérivées par des fonctions pures
 * (`src/lib/catalogPipeline.ts`), sans DOM ni réseau. Contrats :
 *   - 6 stades, d'un seul tenant appro → boutique : identifié → fiche créée
 *     → dossier en cours → conforme → publié → vendable ;
 *   - l'« anomalie boutique » = publié ET visible ET non conforme : c'est le
 *     cas que l'exploitant a volontairement laissé en boutique pour tester —
 *     il est SIGNALÉ, jamais masqué ;
 *   - veille d'expiration réglementaire : documents CPNP / pers. responsable /
 *     CPSR / PIF expirés ou expirant sous 60 jours, mappés aux produits
 *     concernés ; un document SANS date n'est pas surveillé (on ne devine pas
 *     une date), un type non suivi est ignoré ;
 *   - `now` est injectable : le calcul de jours est figé et vérifiable ;
 *   - rien n'est inventé : candidat sans fiche = « identifié », ligne produit
 *     sans fiche = « identifié », champs absents absents.
 */
import { strict as assert } from 'node:assert';
import {
  PIPELINE_STAGES,
  EXPIRY_WATCH_DAYS,
  TRACKED_DOCUMENT_TYPES,
  documentTypeLabel,
  derivePipelineStage,
  buildCatalogPipeline,
  findBoutiqueAnomalies,
  buildExpiryWatch,
  type PipelineProductInput
} from '../src/lib/catalogPipeline';

/* 1. derivePipelineStage — les six stades, porte par porte, fail-closed. */
{
  const ready = { ready: true, missing: [] as string[] };
  const notReady = { ready: false, missing: ['CPNP', 'Personne responsable UE'] };

  // Vendable : checkout éligible → stade terminal, même si publié.
  const v = derivePipelineStage({ id: 'p1', catalogStatus: 'published', truth: { isPubliclyListable: true, isCheckoutEligible: true } }, ready);
  assert.equal(v.stage, 'vendable');
  assert.equal(v.anomaly, false);

  // Publié + visible + conforme → publié (anomalie non).
  const p = derivePipelineStage({ id: 'p2', catalogStatus: 'published', truth: { isPubliclyListable: true } }, ready);
  assert.equal(p.stage, 'publie');
  assert.equal(p.anomaly, false);

  // Publié + visible + NON conforme → publié AVEC anomalie (le cas test de l'exploitant).
  const a = derivePipelineStage({ id: 'p3', catalogStatus: 'published', truth: { isPubliclyListable: true } }, notReady);
  assert.equal(a.stage, 'publie');
  assert.equal(a.anomaly, true, 'visible en boutique mais non conforme → anomalie signalée');

  // Publié mais non visible (truth) + conforme → conforme (à républier, pas publié).
  const c1 = derivePipelineStage({ id: 'p4', catalogStatus: 'published', truth: { isPubliclyListable: false } }, ready);
  assert.equal(c1.stage, 'conforme');

  // Draft conforme → conforme (à publier).
  const c2 = derivePipelineStage({ id: 'p5', catalogStatus: 'draft', truth: {} }, ready);
  assert.equal(c2.stage, 'conforme');

  // Draft non conforme → fiche créée (dossier à compléter).
  const d1 = derivePipelineStage({ id: 'p6', catalogStatus: 'draft' }, notReady);
  assert.equal(d1.stage, 'draft');

  // Readiness absente → non conforme (fail-closed) : draft reste « fiche créée ».
  const d2 = derivePipelineStage({ id: 'p7', catalogStatus: 'draft' }, null);
  assert.equal(d2.stage, 'draft');
  assert.equal(d2.anomaly, false);

  // Ni draft ni publié (ex. archivé), non conforme → dossier en cours.
  const d3 = derivePipelineStage({ id: 'p8', catalogStatus: 'archived' }, notReady);
  assert.equal(d3.stage, 'dossier');

  // Vendable ET non conforme au readiness : checkout éligible gagne,
  // mais l'anomalie « visible non conforme » reste signalée.
  const v2 = derivePipelineStage({ id: 'p9', catalogStatus: 'published', truth: { isPubliclyListable: true, isCheckoutEligible: true } }, notReady);
  assert.equal(v2.stage, 'vendable');
  assert.equal(v2.anomaly, true);

  console.log('✓ 6 stades : vendable/publié/conforme/fiche/dossier, fail-closed, anomalie = visible + non conforme');
}

/* 2. buildCatalogPipeline — consolidation des 250+ candidats + fiches. */
{
  const products: PipelineProductInput[] = [
    { id: 'prod-vendable', catalogStatus: 'published', truth: { isPubliclyListable: true, isCheckoutEligible: true } },
    { id: 'prod-publie', name: 'Fiche test', slug: 'fiche-test', catalogStatus: 'published', isTestListing: true, truth: { isPubliclyListable: true } },
    { id: 'prod-conforme', catalogStatus: 'draft', truth: { isPubliclyListable: false } },
    { id: 'prod-dossier', catalogStatus: 'draft' },
    { id: 'prod-dossier2', catalogStatus: 'archived' }
  ];
  const readiness = [
    { productId: 'prod-vendable', ready: true, missing: [] as string[] },
    { productId: 'prod-publie', ready: false, missing: ['CPNP', 'Personne responsable UE'] },
    { productId: 'prod-conforme', ready: true, missing: [] as string[] },
    { productId: 'prod-dossier', ready: false, missing: ['CPNP', 'CPSR'] },
    { productId: 'prod-dossier2', ready: false, missing: ['CPNP', 'Visuel produit'] }
  ];
  const rows = [
    { kind: 'product' as const, id: 'prod-vendable', name: 'V', supplierName: 'F1', priceEur: 10 },
    { kind: 'product' as const, id: 'prod-publie', name: 'PT', supplierName: 'F1', priceEur: 5 },
    { kind: 'product' as const, id: 'prod-conforme', name: 'C', supplierName: 'F2', priceEur: 12 },
    { kind: 'product' as const, id: 'prod-dossier', name: 'D', supplierName: 'F2', priceEur: 8 },
    { kind: 'product' as const, id: 'prod-dossier2', name: 'D2', supplierName: null, priceEur: null },
    { kind: 'product' as const, id: 'prod-orphelin', name: 'Orphelin', supplierName: 'F3', priceEur: 7 },
    { kind: 'candidate' as const, id: 'cand-1', name: 'Candidat A', supplierName: 'F3', priceEur: 9 },
    { kind: 'candidate' as const, id: 'cand-2', name: 'Candidat B', supplierName: 'F4', priceEur: null }
  ];

  const result = buildCatalogPipeline({ rows, products, readiness });

  assert.equal(result.total, 8);
  assert.deepEqual(result.counts, { identified: 3, draft: 1, dossier: 1, conforme: 1, publie: 1, vendable: 1 });
  assert.equal(result.anomalies, 1, 'une seule fiche visible non conforme');
  assert.equal(result.testCount, 1);

  // Candidat et ligne produit sans fiche → « identifié » (honnêteté, pas d'invention).
  const identified = result.rows.filter(r => r.stage === 'identified');
  assert.deepEqual(identified.map(r => r.id).sort(), ['cand-1', 'cand-2', 'prod-orphelin']);
  const cand = result.rows.find(r => r.id === 'cand-1');
  assert.equal(cand?.kind, 'candidate');
  assert.equal(cand?.focusProductId, undefined, 'un candidat n’a pas de fiche à ouvrir');
  const orphelin = result.rows.find(r => r.id === 'prod-orphelin');
  assert.equal(orphelin?.kind, 'product');
  assert.equal(orphelin?.anomaly, false);

  // La fiche anomalie porte bien ses manquants + le focus catalogue.
  const anomalyRow = result.rows.find(r => r.id === 'prod-publie');
  assert.equal(anomalyRow?.anomaly, true);
  assert.equal(anomalyRow?.isTest, true);
  assert.deepEqual(anomalyRow?.missing, ['CPNP', 'Personne responsable UE']);
  assert.equal(anomalyRow?.focusProductId, 'prod-publie');

  // Matrice de filtres : critères manquants les plus fréquents, nommés.
  assert.equal(result.topCriteria[0]?.label, 'CPNP');
  assert.equal(result.topCriteria[0]?.count, 3);
  assert.equal(result.topCriteria.length, 4); // CPNP + 3 critères à 1

  // Vide → zéro, sans plantage.
  const empty = buildCatalogPipeline({ rows: [], products: [], readiness: [] });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.counts, { identified: 0, draft: 0, dossier: 0, conforme: 0, publie: 0, vendable: 0 });
  assert.deepEqual(empty.topCriteria, []);
  console.log('✓ consolidation : 8 stades, candidats/orphelins identifiés, compteurs, anomalie, matrice de critères');
}

/* 2bis. topCriteria — plafonnée à 8 critères nommés. */
{
  const products: PipelineProductInput[] = Array.from({ length: 9 }, (_, i) => ({
    id: `p${i}`, catalogStatus: 'draft', truth: {}
  }));
  const readiness = products.map((p, i) => ({ productId: p.id, ready: false, missing: [`Critère n°${i + 1}`] }));
  const rows = products.map((p, i) => ({ kind: 'product' as const, id: p.id, name: `P${i}`, supplierName: null, priceEur: null }));
  const result = buildCatalogPipeline({ rows, products, readiness });
  assert.equal(result.topCriteria.length, 8, 'plafond 8 critères');
  assert.equal(result.counts.draft, 9);
  console.log('✓ topCriteria : plafonnée à 8, triée par fréquence');
}

/* 3. findBoutiqueAnomalies — liste nominative, triée, sans faux positifs. */
{
  const products: PipelineProductInput[] = [
    { id: 'a', name: 'A', slug: 'a', catalogStatus: 'published', truth: { isPubliclyListable: true } },
    { id: 'b', name: 'B', catalogStatus: 'published', isTestListing: true, truth: { isPubliclyListable: true } },
    { id: 'c', name: 'C', catalogStatus: 'published', truth: { isPubliclyListable: false } }, // pas visible → exclu
    { id: 'd', name: 'D', catalogStatus: 'draft', truth: { isPubliclyListable: true } },       // pas publié → exclu
    { id: 'e', name: 'E', catalogStatus: 'published', truth: { isPubliclyListable: true } },   // conforme → exclu
    { id: 'f', name: 'F', catalogStatus: 'published', truth: { isPubliclyListable: true } }    // pas de readiness → exclu (fail-closed, pas inventée)
  ];
  const readiness = [
    { productId: 'a', ready: false, missing: ['CPNP', 'CPSR', 'Visuel produit'] },
    { productId: 'b', ready: false, missing: ['CPNP'] },
    { productId: 'c', ready: false, missing: ['CPNP'] },
    { productId: 'd', ready: false, missing: ['CPNP'] },
    { productId: 'e', ready: true, missing: [] as string[] }
    // pas d'entrée pour 'f'
  ];

  const found = findBoutiqueAnomalies(products, readiness);
  assert.deepEqual(found.map(x => x.productId), ['a', 'b'], 'seuls les publiés+visibles+non conformes, triés par manquants');
  assert.equal(found[0].missing.length, 3);
  assert.equal(found[1].isTest, true);
  assert.equal(found[0].slug, 'a');

  // Tied : même nombre de manquants → tri par nom.
  const tied = findBoutiqueAnomalies(
    [
      { id: 'z', name: 'Zeta', catalogStatus: 'published', truth: { isPubliclyListable: true } },
      { id: 'y', name: 'Yuma', catalogStatus: 'published', truth: { isPubliclyListable: true } }
    ],
    [
      { productId: 'z', ready: false, missing: ['CPNP'] },
      { productId: 'y', ready: false, missing: ['CPSR'] }
    ]
  );
  assert.deepEqual(tied.map(x => x.productId), ['y', 'z']);

  assert.deepEqual(findBoutiqueAnomalies([], []), []);
  console.log('✓ anomalies boutique : filtre exact, tri manquants → nom, fail-closed sur readiness absente');
}

/* 4. buildExpiryWatch — veille CPNP/RP/CPSR/PIF, now injectable, bornes exactes. */
{
  const now = new Date('2026-09-15T12:00:00Z');
  const suppliers = [
    {
      id: 's1', legalName: 'Supplier One', complianceDocs: [
        { documentType: 'cpnp_notification', expiresOn: '2026-09-10' },                 // J-5 → expiré
        { documentType: 'responsible_person', expiresOn: '2026-09-20T00:00:00Z' }       // J+5 → expiring
      ]
    },
    {
      id: 's2', legalName: 'Supplier Two', complianceDocs: [
        { documentType: 'cpsr', expiresOn: '2026-11-14T12:00:00Z' },                    // J+60 pile → expiring (borne ≤ 60)
        { documentType: 'pif', expiresOn: '2026-11-15T12:00:00Z' },                     // J+61 → hors fenêtre
        { documentType: 'cpnp_notification', expiresOn: null },                         // pas de date → ignoré
        { documentType: 'invoice_scan', expiresOn: '2026-09-16' }                       // type non suivi → ignoré
      ]
    },
    {
      id: 's5', legalName: 'Supplier Five', complianceDocs: [
        { documentType: 'pif', expiresOn: '2026-09-16T12:00:00Z' }                      // J+1 → expiring
      ]
    },
    {
      id: 's6', legalName: 'Supplier Six', complianceDocs: [
        { documentType: 'cpsr', expiresOn: '2026-11-14T13:00:00Z' }                     // J+60h01 → ceil 61 → hors fenêtre
      ]
    },
    { id: 's3', tradeName: 'Supplier Three', complianceDocs: [] },
    { id: 's4' }
  ];
  const products = [
    { id: 'p1', name: 'Produit S1-A', supplierId: 's1' },
    { id: 'p2', name: 'Produit S1-B', supplierId: 's1' },
    { id: 'p3', name: 'Produit S2', supplierId: 's2' },
    { id: 'p4', name: 'Sans fournisseur', supplierId: null }
  ];

  const alerts = buildExpiryWatch(suppliers, products, now);
  assert.equal(alerts.length, 4, '4 documents surveillés (expiré + 3 expirants) ; J+61, J+60h01, sans date, type non suivi exclus');

  // Expirés d'abord, puis le plus proche de l'expiration.
  assert.deepEqual(alerts.map(a => [a.supplierId, a.documentType, a.state, a.daysLeft]), [
    ['s1', 'cpnp_notification', 'expired', -5],
    ['s5', 'pif', 'expiring', 1],
    ['s1', 'responsible_person', 'expiring', 5],
    ['s2', 'cpsr', 'expiring', 60]
  ]);

  // Mapping produits concernés par fournisseur.
  const s1Alert = alerts[0];
  assert.deepEqual(s1Alert.affectedProducts.map(x => x.id), ['p1', 'p2']);
  assert.equal(alerts[2].affectedProducts.length, 2);
  assert.deepEqual(alerts.find(a => a.supplierId === 's2')?.affectedProducts.map(x => x.id), ['p3']);
  assert.deepEqual(alerts.find(a => a.supplierId === 's5')?.affectedProducts, [], 'fournisseur sans produit rattaché → liste vide, pas inventée');

  // Dates tronquées au jour, noms honnêtes.
  assert.equal(s1Alert.expiresOn, '2026-09-10');
  assert.equal(alerts.find(a => a.supplierId === 's5')?.supplierName, 'Supplier Five');

  // Vide → vide, sans plantage.
  assert.deepEqual(buildExpiryWatch([], [], now), []);
  console.log('✓ veille expiration : J-5 expiré, J+1/J+5/J+60 expirants, J+61 et J+60h01 exclus, sans date ignoré, mapping produits');
}

/* 5. Constantes, libellés, déterminisme. */
{
  assert.equal(EXPIRY_WATCH_DAYS, 60);
  assert.equal(TRACKED_DOCUMENT_TYPES.size, 4);
  for (const t of ['cpnp_notification', 'responsible_person', 'cpsr', 'pif']) assert.ok(TRACKED_DOCUMENT_TYPES.has(t));
  assert.equal(documentTypeLabel('cpnp_notification'), 'Notification CPNP');
  assert.equal(documentTypeLabel('responsible_person'), 'Personne responsable UE');
  assert.equal(documentTypeLabel('type_inconnu'), 'type_inconnu', 'type inconnu → affiché tel quel, pas inventé');
  assert.equal(PIPELINE_STAGES.length, 6);
  assert.deepEqual(PIPELINE_STAGES.map(s => s.id), ['identified', 'draft', 'dossier', 'conforme', 'publie', 'vendable']);

  // Déterminisme : mêmes entrées → même résultat.
  const products: PipelineProductInput[] = [{ id: 'x', catalogStatus: 'published', truth: { isPubliclyListable: true } }];
  const readiness = [{ productId: 'x', ready: false, missing: ['CPNP'] }];
  const a = findBoutiqueAnomalies(products, readiness);
  const b = findBoutiqueAnomalies(products, readiness);
  assert.deepEqual(a, b);
  console.log('✓ constantes (60 j, 4 types, 6 stades), libellés, déterminisme');
}

console.log('\n5 blocs de contrôles « Pipeline de mise en vente » validés — 6 stades, anomalies boutique signalées, veille expiration bornée, zéro donnée inventée.');
