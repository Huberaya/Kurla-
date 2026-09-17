import assert from 'node:assert/strict';

import {
  CRITERION_FAMILIES, SALES_CRITERIA, SALES_CRITERIA_VERSION,
  criterionById, criteriaByFamily, matchCriterion
} from '../src/lib/salesCriteria';
import { evaluateCatalogPublicationReadiness } from '../src/lib/db/catalogStore';
import { COSMETIC_REQUIRED_DOCS, evaluateCosmeticCompliance, requiresCpnp } from '../src/lib/cosmeticCompliance';
import { evaluateCatalogSourcingReadiness } from '../src/lib/catalogSourcingReadiness';

/**
 * BANC — CARTE DES CRITÈRES DE MISE EN VENTE (chantier A).
 *
 * Acceptation du chantier : « la carte correspond exactement au comportement
 * existant (aucune règle ne change), versionnée, banc qui fige la liste. »
 *
 * Ce banc prouve les deux sens de la correspondance :
 *  1. COUVERTURE : tout champ émis par les trois portes du moteur (base,
 *     CPNP, gouvernance sourcing) existe dans la carte — zéro blocage
 *     sans critère nommé.
 *  2. ZÉRO FANTÔME : chaque critère de la carte (portes base/CPNP/sourcing)
 *     est réellement émis par le moteur sur un cas construit — la carte ne
 *     décrit pas de règle inexistante.
 * Et le libellé émis est toujours reconciliable (canonique ou variante).
 */

const TODAY = '2026-09-17';

// Produit intégralement vérifié : le moteur doit le laisser passer.
const VALID: any = {
  id: 'p1', name: 'Shampoing Doux', brand: 'TestBrand',
  is_active: true,
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'brand_provided',
  ingredients: ['aqua', 'cocamidopropyl betaine'],
  galleryImages: [{ url: 'https://cdn.example.com/i.jpg' }],
  country_availability: ['fr'],
};

function main(): void {
  // ————————————————— BLOC 1 — structure figée de la carte —————————————————
  assert.equal(SALES_CRITERIA.length, 33, '33 critères nommés — la liste est figée');
  const ids = SALES_CRITERIA.map(c => c.id);
  assert.equal(new Set(ids).size, 33, 'aucun id dupliqué');
  for (const criterion of SALES_CRITERIA) {
    assert.match(criterion.id, /^[a-z_]+(:[a-z_]+)?$/i, `id = clé de champ moteur : ${criterion.id}`);
    assert.ok(Object.keys(CRITERION_FAMILIES).includes(criterion.family), `famille valide : ${criterion.family}`);
    assert.ok(['tous', 'cosmetiques', 'produits_categorises'].includes(criterion.appliesTo), `portée valide : ${criterion.appliesTo}`);
    assert.ok(criterion.label.trim() !== '' && criterion.rule.trim() !== '' && criterion.source.trim() !== '', `libellé/règle/source non vides : ${criterion.id}`);
  }
  assert.match(SALES_CRITERIA_VERSION, /^\d+\.\d+\.\d+$/, 'version sémantique');
  const families = criteriaByFamily();
  assert.equal(families.length, 4, '4 familles');
  assert.equal(families.reduce((a, f) => a + f.count, 0), 33, 'les familles somment à la carte');
  assert.equal(criterionById('supplier_document:cpsr')?.label, 'Rapport de sécurité (CPSR) manquant');
  assert.equal(criterionById('n_invente'), null, 'clé inconnue = null, jamais un critère fabriqué');

  // ————————————————— BLOC 2 — porte base : couverture + zéro fantôme —————————————————
  const validResult = evaluateCatalogPublicationReadiness(VALID, 'p1');
  assert.deepEqual(validResult.missing.map(m => m.field), [], 'produit intégralement vérifié = aucun blocage (comportement existant)');
  assert.equal(validResult.ready, true);

  // Le filet truth layer s'active sur une incohérence nouvelle (formulation cible).
  const target = evaluateCatalogPublicationReadiness({ ...VALID, catalog_stage: 'formulation_target' }, 'p1');
  assert.deepEqual(target.missing.map(m => m.field), ['catalog_truth'], 'formulation cible sans preuve = blocage truth layer nommé');

  // Chaque critère de la porte base est réellement émis (zéro fantôme) et tous
  // les champs émis appartiennent à la carte (couverture).
  const baseViolations: Array<[string, Record<string, any>]> = [
    ['is_active', { is_active: false }],
    ['ingredient_verification_status', { ingredient_verification_status: 'not_provided' }],
    ['claims_validation_status', { claims_validation_status: null }],
    ['images_validation_status', { images_validation_status: 'pending' }],
    ['stock_validation_status', { stock_validation_status: undefined }],
    ['certifications_validation_status', { certifications_validation_status: 'not_provided' }],
    ['translations_validation_status', { translations_validation_status: 'not_provided' }],
    ['brand_verification_status', { brand_verification_status: 'not_provided' }],
    ['image_ownership_status', { image_ownership_status: 'unknown' }],
    ['brand', { brand: '' }],
    ['ingredients', { ingredients: [], inci: '' }],
    ['images', { galleryImages: [], image: null }],
    ['country_availability', { country_availability: [] }],
    ['promotion', { is_promo: true }],
  ];
  for (const [field, patch] of baseViolations) {
    const result = evaluateCatalogPublicationReadiness({ ...VALID, ...patch }, 'p1');
    assert.ok(result.missing.some(m => m.field === field), `le cas construit émet « ${field} »`);
    for (const m of result.missing) {
      assert.ok(criterionById(m.field), `champ moteur « ${m.field} » présent dans la carte`);
      assert.ok(matchCriterion(m.label), `libellé « ${m.label} » reconciliable avec la carte`);
    }
  }

  // ————————————————— BLOC 3 — porte CPNP —————————————————
  const cosmetic: any = { ...VALID, category: 'shampoing' };
  assert.equal(requiresCpnp(cosmetic), true, 'shampoing = cosmétique (comportement existant)');
  assert.equal(requiresCpnp({ ...cosmetic, category: 'accessoire' }), false, 'accessoire = non soumis au CPNP');

  // Sans fournisseur : les trois documents bloquants, nommément.
  const noSupplier = evaluateCosmeticCompliance({ ...cosmetic, supplierId: null }, [], [], undefined);
  assert.deepEqual(noSupplier.missing.map(m => m.field).sort(), [...COSMETIC_REQUIRED_DOCS].map(d => `supplier_document:${d}`).sort());
  for (const m of noSupplier.missing) {
    assert.ok(m.label.endsWith('— aucun fournisseur rattaché'), `motif nommé : ${m.label}`);
    assert.ok(criterionById(m.field), `champ « ${m.field} » dans la carte`);
    assert.ok(matchCriterion(m.label), `libellé « ${m.label} » reconciliable`);
  }

  // Fournisseur non vérifié : les documents ne sont pas opposables.
  const unverified = evaluateCosmeticCompliance({ ...cosmetic, supplierId: 'sup1' }, [], [], 'pending');
  assert.ok(unverified.missing.some(m => m.field === 'supplier_verification_status'));
  assert.ok(matchCriterion(unverified.missing.find(m => m.field === 'supplier_verification_status')!.label));

  // Document expiré : toujours bloquant, libellé variant.
  const expired = evaluateCosmeticCompliance({ ...cosmetic, supplierId: 'sup1' }, [...COSMETIC_REQUIRED_DOCS], ['cpsr'], 'verified');
  assert.deepEqual(expired.missing.map(m => m.field), ['supplier_document:cpsr']);
  assert.ok(matchCriterion(expired.missing[0].label), 'libellé « document expiré » reconciliable');

  // La porte complète du rapport émet aussi l'agrégat « aucun fournisseur ».
  assert.ok(criterionById('supplier_document:cpnp'), 'agrégat rapport présent dans la carte');
  assert.equal(criterionById('supplier_document:cpnp')?.appliesTo, 'cosmetiques');

  // ————————————————— BLOC 4 — porte de gouvernance sourcing —————————————————
  const worst: any = { id: 's1', category: 'cheveux' };
  const srcCases: Array<[string, any, { supplier?: any; documents?: any[] }]> = [
    ['cas limite (rien)', worst, { supplier: null }],
    ['+ prix saisi', { ...worst, price: 10 }, { supplier: null }],
    ['+ variantes exigées', { ...worst, variantsRequired: true }, { supplier: null }],
    ['+ fournisseur déclaré mais introuvable', { ...worst, supplierId: 'supX', source_supplier: 'X' }, { supplier: null }],
    ['+ fournisseur non vérifié', { ...worst, supplierId: 'supX', source_supplier: 'X' }, { supplier: { id: 'supX', verificationStatus: 'pending' } }],
    ['+ cosmétique sans composition', { id: 's2', category: 'shampoing' }, { supplier: null }],
  ];
  const emitted = new Set<string>();
  for (const [name, product, context] of srcCases) {
    const result = evaluateCatalogSourcingReadiness(product, { ...context, documents: context.documents || [], today: TODAY });
    assert.ok(result.missing.length > 0, `${name} : au moins un blocage nommé`);
    for (const m of result.missing) {
      emitted.add(m.field);
      assert.ok(criterionById(m.field), `${name} : champ « ${m.field} » dans la carte`);
      assert.ok(matchCriterion(m.label), `${name} : libellé « ${m.label} » reconciliable`);
    }
  }
  // Champs attendus par cas (comportement existant figé).
  assert.ok(emitted.has('source_supplier') && emitted.has('supplier_id') && emitted.has('supplier_sku'));
  assert.ok(emitted.has('size_label') && emitted.has('price') && emitted.has('vat_rate'));
  assert.ok(emitted.has('country_availability') && emitted.has('lead_time_days') && emitted.has('returns_policy'));
  assert.ok(emitted.has('image') && emitted.has('image_ownership_status') && emitted.has('inci') && emitted.has('stock_quantity') && emitted.has('stock_validation_status'));
  const variantsCase = evaluateCatalogSourcingReadiness({ ...worst, variantsRequired: true }, { supplier: null, documents: [], today: TODAY });
  assert.ok(variantsCase.missing.some(m => m.field === 'variants'), 'variantes annoncées mais absentes = bloquant nommé');
  const notFound = evaluateCatalogSourcingReadiness({ ...worst, supplierId: 'supX', source_supplier: 'X' }, { supplier: null, documents: [], today: TODAY });
  assert.ok(notFound.missing.some(m => m.field === 'supplier_id' && m.label === 'fournisseur déclaré mais introuvable dans le référentiel'), 'fournisseur introuvable = motif exact');
  const pending = evaluateCatalogSourcingReadiness({ ...worst, supplierId: 'supX', source_supplier: 'X' }, { supplier: { id: 'supX', verificationStatus: 'pending' }, documents: [], today: TODAY });
  assert.ok(pending.missing.some(m => m.field === 'supplier_verification_status'), 'fournisseur non vérifié = bloquant');

  // Zéro fantôme : les 12 champs propres à la porte sourcing sont tous émis
  // par le moteur (la carte ne décrit rien d'inexistant).
  for (const id of ['source_supplier', 'supplier_sku', 'size_label', 'price', 'price_includes_vat', 'vat_rate', 'variants', 'lead_time_days', 'returns_policy', 'image', 'inci', 'stock_quantity']) {
    assert.ok(emitted.has(id) || id === 'variants', `critère sourcing « ${id} » réellement émis par le moteur`);
  }
  assert.ok(variantsCase.missing.some(m => m.field === 'variants'), 'variants réellement émis');

  console.log('[PASS] Carte des critères (chantier A) : 33 critères figés, versionnée, les 3 portes du moteur couvertes sans aucun critère fantôme, libellés reconciliables.');
}

main();
