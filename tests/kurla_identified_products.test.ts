/**
 * CHANTIER 2 — identifiés hors boutique.
 *
 * Invariants : un identifié n'est jamais public ; l'import vise fond ou
 * candidat, jamais `products` published ; un nom libre n'est pas un
 * fournisseur ; les 50 besoins ne créent pas de 16ᵉ SKIN_NEED.
 */
import assert from 'node:assert/strict';

import { unifyCandidate, unifyFondPosition, unifyProduct } from '../src/lib/productLifecycle';
import {
  IDENTIFIED_WRITE_TABLES,
  countIdentified,
  duplicateGroups,
  filterIdentified,
  identifiedFromConsolidated,
  importNeverPublishes,
  isIdentifiedRecord,
  parseIdentifiedImportText,
  planIdentifiedImport,
  selectIdentified,
} from '../src/lib/identifiedProducts';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const fond = unifyFondPosition({
  sourcing_item_id: 'fond-50-n30',
  rang: 1,
  marque: 'Nivea',
  produit: 'SPF 50 fluide',
  fournisseur_canal: 'pharmacie',
});
const candidate = unifyCandidate({ id: 'c1', product: 'Sérum niacinamide', brand: 'The Ordinary' });
const published = unifyProduct({
  id: 'p-hair',
  name: 'Bonnet',
  category: 'accessoires',
  catalogStatus: 'published',
  truth: { isPubliclyListable: true },
});
const linked = unifyCandidate({
  id: 'c2',
  product: 'Crème',
  draft_product_id: 'peau-ess-001',
  catalogStatus: 'draft',
});

ok('un fond et un candidat sans fiche sont identifiés, jamais publics', () => {
  assert.equal(isIdentifiedRecord(fond), true);
  assert.equal(fond.lifecycle.isPublic, false);
  assert.equal(isIdentifiedRecord(candidate), true);
  assert.equal(candidate.lifecycle.isPublic, false);
});

ok('une fiche publiée et un candidat déjà lié au catalogue ne sont pas identifiés', () => {
  assert.equal(isIdentifiedRecord(published), false);
  assert.equal(isIdentifiedRecord(linked), false);
  assert.equal(selectIdentified([fond, candidate, published, linked]).length, 2);
});

ok('le consolidé ignore les fiches products : 0 publique', () => {
  const rows = identifiedFromConsolidated([
    { kind: 'position', id: 'pos-fond-50-n07-1', name: 'Céramides', brand: 'CeraVe', supplierName: 'canal' },
    { kind: 'candidate', id: 'c9', name: 'Huile', brand: 'Marque' },
    { kind: 'candidate', id: 'c8', name: 'Lié', linkedProductId: 'peau-ess-001' },
    { kind: 'product', id: 'p1', name: 'Bonnet' },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.every(r => r.lifecycle.isPublic === false), true);
  assert.equal(rows.find(r => r.documentedNeed === 7)?.skinNeed, 'barriere');
});

ok('filtres besoin documenté / skinNeed / origine', () => {
  const byNeed = filterIdentified([fond, candidate], { documentedNeed: 30 });
  assert.equal(byNeed.length, 1);
  assert.equal(byNeed[0].skinNeed, 'spf');
  const none = filterIdentified([fond, candidate], { skinNeed: 'none' });
  assert.equal(none.length, 1);
  assert.equal(none[0].kind, 'candidate');
  const onlyFond = filterIdentified([fond, candidate], { kind: 'fond_position' });
  assert.equal(onlyFond.length, 1);
});

ok('compteurs et doublons : rien n’est inventé', () => {
  const twin = unifyFondPosition({
    sourcing_item_id: 'fond-50-n30',
    rang: 2,
    marque: 'nivea',
    produit: 'SPF 50 fluide',
  });
  const counts = countIdentified([fond, twin, candidate, published]);
  assert.equal(counts.total, 3);
  assert.equal(counts.fond, 2);
  assert.equal(counts.candidate, 1);
  assert.equal(counts.duplicateGroups, 1);
  assert.equal(duplicateGroups([fond, twin])[0].records.length, 2);
});

ok('CSV : besoin 24 → fond ; sans besoin → candidat ; published refusé', () => {
  const drafts = parseIdentifiedImportText(
    'marque,nom,besoin,canal,ean\nCeraVe,Crème lavante,24,pharmacie,\nThe Ordinary,Niacinamide,,piste,\nFake,Produit,1,x,published\n'
  );
  // La 3e ligne n'a pas catalog_status en colonne 5 si ean=published — on teste aussi un JSON.
  const plan = planIdentifiedImport([
    drafts[0],
    drafts[1],
    { brand: 'X', title: 'Y', documentedNeed: 1, channelLabel: null, ean: null, forbiddenTarget: 'published' },
  ], [fond, candidate]);
  assert.equal(plan.accepted[0].writeTarget, IDENTIFIED_WRITE_TABLES.coverage);
  assert.equal(plan.accepted[1].writeTarget, IDENTIFIED_WRITE_TABLES.candidate);
  assert.equal(plan.wouldPublish, 1);
  assert.equal(plan.rejected.some(r => /published/.test(r.reason)), true);
  assert.equal(importNeverPublishes(plan), false);
});

ok('JSON : cible products refusée ; nom vide refusé ; jamais de published accepté', () => {
  const drafts = parseIdentifiedImportText(JSON.stringify([
    { brand: 'A', name: 'Sérum', need: 9 },
    { brand: 'B', name: '', need: 2 },
    { brand: 'C', name: 'Crème', target: 'products' },
  ]));
  const plan = planIdentifiedImport(drafts, []);
  assert.equal(plan.accepted.length, 1);
  assert.equal(plan.accepted[0].skinNeed, 'taches');
  assert.equal(plan.rejected.length, 2);
  assert.equal(plan.wouldPublish, 1);
  const clean = planIdentifiedImport([drafts[0]], []);
  assert.equal(importNeverPublishes(clean), true);
  assert.ok(clean.accepted.every(row => row.writeTarget === 'sourcing_fond_positions' || row.writeTarget === 'sourcing_product_candidates'));
});

ok('un identifié existant est signalé doublon, pas réécrit en boutique', () => {
  const plan = planIdentifiedImport(
    [{ brand: 'Nivea', title: 'SPF 50 fluide', documentedNeed: 30, channelLabel: null, ean: null }],
    [fond],
  );
  assert.equal(plan.accepted[0].duplicateOf, fond.uid);
  assert.equal(plan.accepted[0].writeTarget, 'sourcing_fond_positions');
});

console.log(`\n[PASS] Identifiés (chantier 2) : ${checks} contrôles — hors boutique, import → fond/candidat, 0 published.`);
