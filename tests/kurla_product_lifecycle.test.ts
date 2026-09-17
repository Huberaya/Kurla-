/**
 * CHANTIER 1 — cycle de vie (lecture) + mapping 50 besoins.
 *
 * Invariants : pas de 5ᵉ enum écrit, un identifié n'est jamais public,
 * un test listing n'est jamais publié, un texte libre n'est pas un
 * fournisseur, les 50 besoins n'inventent aucune valeur hors SKIN_NEEDS.
 */
import assert from 'node:assert/strict';

import { SKIN_NEED_VALUES } from '../src/lib/skinTaxonomy';
import {
  DOCUMENTED_SKIN_NEEDS,
  documentedNeedFromSourcingItemId,
  mappingUsesOnlyExistingSkinNeeds,
  skinNeedForDocumentedNeed,
} from '../src/lib/skinNeedMapping';
import type { ProductSource } from '../src/lib/supplyModel';
import {
  BUSINESS_STAGES,
  CANONICAL_TABLES,
  WRITE_TARGET_BY_INTENT,
  YEAR1_FULFILLMENT_MODELS,
  businessStageFromPipelineStage,
  countByStage,
  dropshipEligibility,
  identifiedDedupKey,
  parseConsolidatedPositionId,
  primarySupplierIdFromSources,
  publiclyListableCount,
  resolveLifecycle,
  resolveSupplierIdentity,
  unifyCandidate,
  unifyFondPosition,
  unifyProduct,
} from '../src/lib/productLifecycle';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

ok('les 50 besoins documentés sont tous là, numérotés 1–50', () => {
  assert.equal(DOCUMENTED_SKIN_NEEDS.length, 50);
  assert.deepEqual(DOCUMENTED_SKIN_NEEDS.map(need => need.number), Array.from({ length: 50 }, (_, i) => i + 1));
});

ok('aucune valeur skinNeed n’est inventée hors skinTaxonomy.ts', () => {
  assert.equal(mappingUsesOnlyExistingSkinNeeds(), true);
  for (const need of DOCUMENTED_SKIN_NEEDS) {
    if (need.skinNeed != null) assert.ok(SKIN_NEED_VALUES.includes(need.skinNeed), need.title);
  }
});

ok('les besoins éducatifs / cheveu / maquillage n’inventent pas de filtre boutique', () => {
  for (const number of [1, 5, 6, 14, 32, 44, 45, 46, 47, 50]) {
    assert.equal(skinNeedForDocumentedNeed(number), null, `besoin ${number}`);
  }
  assert.equal(skinNeedForDocumentedNeed(30), 'spf');
  assert.equal(skinNeedForDocumentedNeed(9), 'taches');
});

ok('l’id de fond fond-50-n07 se relit en besoin 7 → barrière', () => {
  assert.equal(documentedNeedFromSourcingItemId('fond-50-n07'), 7);
  assert.equal(skinNeedForDocumentedNeed(7), 'barriere');
  assert.equal(documentedNeedFromSourcingItemId('autre-chose'), null);
});

ok('un identifié (fond, sans fiche) n’est jamais public', () => {
  const resolved = resolveLifecycle({ kind: 'fond_position' });
  assert.equal(resolved.stage, 'identified');
  assert.equal(resolved.isPublic, false);
  assert.equal(resolved.publishable, false);
});

ok('une RFQ ouverte passe en sourcing, toujours hors boutique', () => {
  const resolved = resolveLifecycle({ kind: 'candidate', rfqOpen: true });
  assert.equal(resolved.stage, 'sourcing');
  assert.equal(resolved.isPublic, false);
});

ok('une fiche draft est en catalogue, pas publiée', () => {
  const resolved = resolveLifecycle({ kind: 'product', catalogStatus: 'draft' });
  assert.equal(resolved.stage, 'catalog');
  assert.equal(resolved.isPublic, false);
});

ok('published + listable + hors test = publié public', () => {
  const resolved = resolveLifecycle({
    kind: 'product',
    catalogStatus: 'published',
    isPubliclyListable: true,
  });
  assert.equal(resolved.stage, 'published');
  assert.equal(resolved.isPublic, true);
});

ok('un listing test published n’est pas public', () => {
  const resolved = resolveLifecycle({
    kind: 'product',
    catalogStatus: 'published',
    isPubliclyListable: true,
    isTestListing: true,
  });
  assert.equal(resolved.isPublic, false);
  assert.equal(resolved.stage, 'catalog');
});

ok('refusé / abandonné / unavailable sont refusés, jamais vendables', () => {
  assert.equal(resolveLifecycle({ kind: 'product', catalogStatus: 'unavailable' }).stage, 'refused');
  assert.equal(resolveLifecycle({ kind: 'sourcing_item', sourcingItemStatus: 'abandoned' }).stage, 'refused');
  assert.equal(resolveLifecycle({ kind: 'product', workflowState: 'refused' }).isPublic, false);
});

ok('une offre (devis ou product_sources) n’élève pas le stade à publié', () => {
  const withOffer = resolveLifecycle({ kind: 'fond_position', sourcesCount: 2, hasPricedQuote: true });
  assert.equal(withOffer.stage, 'identified');
  assert.equal(withOffer.hasOffer, true);
  assert.equal(withOffer.isPublic, false);
});

ok('le pipeline 6 stades se projette sur le langage métier sans 5ᵉ enum', () => {
  assert.equal(businessStageFromPipelineStage('identified'), 'identified');
  assert.equal(businessStageFromPipelineStage('draft'), 'catalog');
  assert.equal(businessStageFromPipelineStage('conforme'), 'catalog');
  assert.equal(businessStageFromPipelineStage('publie'), 'published');
  assert.equal(businessStageFromPipelineStage('vendable'), 'published');
});

ok('l’offre canonique est product_sources ; supplier_id n’est qu’une projection', () => {
  assert.equal(CANONICAL_TABLES.offer, 'product_sources');
  assert.equal(CANONICAL_TABLES.catalogSku, 'products');
  assert.match(WRITE_TARGET_BY_INTENT.import_identified, /sourcing_fond_positions/);
  assert.match(WRITE_TARGET_BY_INTENT.import_identified, /sourcing_product_candidates/);
  assert.match(WRITE_TARGET_BY_INTENT.publish, /isPublishableProduct/);
  const sources: ProductSource[] = [
    {
      productId: 'p1', supplierId: 'sup-a', partnerName: null, model: 'dropshipping',
      isPrimary: false, costCents: 1, feeCents: null, fulfillmentCostCents: null,
      commissionPct: null, affiliateUrl: null, cookieDays: null, leadTimeDays: null,
      shipsFrom: null, currency: 'EUR', available: true, notes: null, id: 's1',
    },
    {
      productId: 'p1', supplierId: 'sup-b', partnerName: null, model: '3pl',
      isPrimary: true, costCents: 1, feeCents: null, fulfillmentCostCents: null,
      commissionPct: null, affiliateUrl: null, cookieDays: null, leadTimeDays: null,
      shipsFrom: null, currency: 'EUR', available: true, notes: null, id: 's2',
    },
  ];
  assert.equal(primarySupplierIdFromSources(sources), 'sup-b');
});

ok('un nom libre n’est pas un fournisseur ; source_supplier n’est pas un nom', () => {
  const free = resolveSupplierIdentity({ unresolvedLabel: 'AfricanFabs (canal)' });
  assert.equal(free.supplierId, null);
  assert.equal(free.unresolvedLabel, 'AfricanFabs (canal)');
  const marked = resolveSupplierIdentity({
    sourceSupplierMarker: 'formulation interne',
    unresolvedLabel: 'formulation interne',
  });
  assert.equal(marked.supplierId, null);
  const structured = resolveSupplierIdentity({
    productSupplierId: 'sup-a',
    primarySourceSupplierId: 'sup-b',
  });
  assert.equal(structured.supplierId, 'sup-b');
  assert.equal(structured.primaryDivergesFromProduct, true);
});

ok('cosmétique Skin/Hair : dropship interdit ; accessoires : autorisé ; inconnu : pas deviné', () => {
  assert.equal(dropshipEligibility('peau'), 'forbidden');
  assert.equal(dropshipEligibility('cheveux'), 'forbidden');
  assert.equal(dropshipEligibility('accessoires'), 'allowed');
  assert.equal(dropshipEligibility(''), 'unknown');
  assert.ok(YEAR1_FULFILLMENT_MODELS.includes('dropshipping'));
  assert.ok(!YEAR1_FULFILLMENT_MODELS.includes('stock_kurla'));
});

ok('unifier une position de fond : besoin 30, SPF, hors boutique, prix absent = null', () => {
  const row = unifyFondPosition({
    sourcing_item_id: 'fond-50-n30',
    rang: 1,
    marque: 'Nivea',
    produit: 'SPF 50 fluide',
    prix_constate_cents: null,
    fournisseur_canal: 'pharmacie à désigner',
  });
  assert.equal(row.kind, 'fond_position');
  assert.equal(row.documentedNeed, 30);
  assert.equal(row.skinNeed, 'spf');
  assert.equal(row.lifecycle.stage, 'identified');
  assert.equal(row.lifecycle.isPublic, false);
  assert.equal(row.priceEur, null);
  assert.equal(row.supplierId, null);
  assert.equal(row.unresolvedSupplierLabel, 'pharmacie à désigner');
});

ok('un prix public constaté n’est pas une offre fournisseur', () => {
  const row = unifyFondPosition({
    sourcing_item_id: 'fond-50-n30',
    rang: 2,
    produit: 'SPF 50 fluide',
    prix_constate_cents: 1990,
    fournisseur_canal: 'pharmacie',
  });
  assert.equal(row.priceEur, 19.9);
  assert.equal(row.lifecycle.hasOffer, false);
  assert.equal(row.lifecycle.stage, 'identified');
});

ok('un candidat lié à une fiche draft reste en catalogue, pas public', () => {
  const row = unifyCandidate({
    id: 'c1',
    product: 'Sérum niacinamide',
    draft_product_id: 'peau-ess-001',
    catalogStatus: 'draft',
  });
  assert.equal(row.lifecycle.stage, 'catalog');
  assert.equal(row.lifecycle.isPublic, false);
  assert.equal(row.linkedProductId, 'peau-ess-001');
});

ok('une fiche test published unifiée n’est pas publique', () => {
  const row = unifyProduct({
    id: 'peau-test-001',
    name: 'Test SPF',
    category: 'peau',
    catalogStatus: 'published',
    isTestListing: true,
    truth: { isPubliclyListable: true },
  });
  assert.equal(row.lifecycle.isPublic, false);
  assert.equal(row.lifecycle.isTestListing, true);
});

ok('compteurs : identifié + publié, sans inventer un public', () => {
  const rows = [
    unifyFondPosition({ sourcing_item_id: 'fond-50-n01', rang: 1, produit: 'A' }),
    unifyProduct({
      id: 'p-hair', name: 'Bonnet', category: 'accessoires', catalogStatus: 'published',
      truth: { isPubliclyListable: true },
    }),
  ];
  const counts = countByStage(rows);
  assert.equal(counts.identified, 1);
  assert.equal(counts.published, 1);
  assert.equal(publiclyListableCount(rows), 1);
  assert.equal(identifiedDedupKey('CeraVe', 'Crème lavante'), identifiedDedupKey('cerave', 'creme lavante'));
});

ok('les stades métier tiennent en 5 valeurs, offre et validé restent des faits', () => {
  assert.deepEqual([...BUSINESS_STAGES], ['identified', 'sourcing', 'catalog', 'published', 'refused']);
});

console.log(`\n[PASS] Cycle de vie produit (chantier 1) : ${checks} contrôles — identifié ≠ publié, offre = product_sources, 50 besoins sans taxonomie inventée.`);
