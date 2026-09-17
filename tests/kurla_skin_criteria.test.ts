/**
 * CHANTIER 5 — critères Skin déjà dans le projet, branchés sur identifié / catalogue.
 * Aucun critère inventé : 50 documentés, 15 SKIN_NEEDS, SKIN_REQUIRED_METADATA.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { unifyCandidate, unifyFondPosition, unifyProduct } from '../src/lib/productLifecycle';
import { SKIN_REQUIRED_METADATA } from '../src/lib/skinCommercialReadiness';
import {
  SKIN_CRITERIA_SOURCES,
  criteriaIdsAreKnown,
  evaluateCatalogSkinCriteria,
  evaluateIdentifiedSkinCriteria,
} from '../src/lib/skinCriteria';
import { mappingUsesOnlyExistingSkinNeeds } from '../src/lib/skinNeedMapping';
import { SKIN_NEEDS, SKIN_NEED_VALUES } from '../src/lib/skinTaxonomy';

const SRC = join(process.cwd(), 'src');
const read = (relative: string) => readFileSync(join(SRC, relative), 'utf8');

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

const skinCatalog = {
  id: 'peau-c5-1',
  name: 'Sérum C5',
  category: 'peau',
  skinTypes: ['mixte'],
  concerns: ['hydrater', 'taches'],
  skinObjectives: ['hydrater_peau'],
  activeIngredients: [{ name: 'Glycérine', concentration: '5 %' }],
  activeConcentrationsStatus: 'verified',
  inci: 'Aqua, Glycerin, Caprylic/Capric Triglyceride',
  inciVisibilityStatus: 'verified',
  texture: 'Gel-crème',
  finish: 'Naturel',
  fragrance: 'Sans parfum',
  allergens: [],
  routineStep: 'Hydratant',
  warnings: [],
  manufacturingStatus: 'verified',
  lotReference: 'LOT-C5',
  bestBeforeOrPao: 'PAO 12M',
  countryAvailability: ['FR'],
  image: 'https://cdn.example.test/kurla-c5.jpg',
  imageOwnershipStatus: 'licensed',
  imagesValidationStatus: 'verified',
  inStock: true,
  stockQuantity: 12,
};

ok('trois sources seulement — pas de 3ᵉ grille, pas de 16ᵉ besoin', () => {
  assert.deepEqual([...SKIN_CRITERIA_SOURCES], ['documented_needs', 'skin_needs', 'skin_required_metadata']);
  assert.equal(SKIN_NEEDS.length, 15);
  assert.equal(mappingUsesOnlyExistingSkinNeeds(), true);
  assert.ok(SKIN_REQUIRED_METADATA.length >= 18);
});

ok('fond #17 (plis) : besoin 50 ok, boutique = corps, métadonnées n/a, complet', () => {
  const record = unifyFondPosition({
    sourcingItemId: 'fond-50-n17',
    rang: 1,
    produit: 'Soin plis',
    marque: 'Marque C5',
  });
  const checklist = evaluateIdentifiedSkinCriteria(record);
  assert.equal(criteriaIdsAreKnown(checklist), true);
  assert.equal(checklist.subject, 'identified');
  assert.equal(checklist.applicable, true);
  assert.equal(checklist.items.find(i => i.id === 'documented_need')?.status, 'ok');
  assert.equal(checklist.items.find(i => i.id === 'boutique_need')?.status, 'ok');
  assert.match(checklist.items.find(i => i.id === 'boutique_need')?.label || '', /corps/i);
  assert.ok(checklist.items.filter(i => i.source === 'skin_required_metadata').every(i => i.status === 'not_applicable'));
  assert.equal(checklist.complete, true);
});

ok('fond #50 (grossesse) : pas de filtre boutique, volontaire, pas un trou', () => {
  const record = unifyFondPosition({ sourcingItemId: 'fond-50-n50', rang: 1, produit: 'Carte grossesse' });
  const checklist = evaluateIdentifiedSkinCriteria(record);
  assert.equal(checklist.items.find(i => i.id === 'boutique_need')?.status, 'voluntary_none');
  assert.equal(checklist.complete, true);
});

ok('fond sans besoin 1–50 : documented manquant', () => {
  const record = unifyFondPosition({ sourcingItemId: 'vague-peau-1', rang: 1, produit: 'Hors 50' });
  const checklist = evaluateIdentifiedSkinCriteria(record);
  assert.equal(checklist.items.find(i => i.id === 'documented_need')?.status, 'missing');
  assert.equal(checklist.complete, false);
});

ok('candidat hors fond : besoin 50 n/a, pas un manque inventé', () => {
  const record = unifyCandidate({ id: 'cand-c5', product: 'Candidat', brand: 'X' });
  const checklist = evaluateIdentifiedSkinCriteria(record);
  assert.equal(checklist.items.find(i => i.id === 'documented_need')?.status, 'not_applicable');
  assert.equal(checklist.complete, true);
});

ok('fiche Hair : grille Skin non applicable, 0 manque', () => {
  const product = unifyProduct({ id: 'p-hair-c5', name: 'Huile Hair', category: 'cheveux' });
  const checklist = evaluateCatalogSkinCriteria({ id: product.linkedProductId, name: product.title, category: product.category });
  assert.equal(checklist.applicable, false);
  assert.equal(checklist.complete, true);
  assert.ok(checklist.items.every(i => i.status === 'not_applicable'));
});

ok('fiche Skin : 15 besoins lus, métadonnées = SKIN_REQUIRED_METADATA, INCI vide = manque', () => {
  const complete = evaluateCatalogSkinCriteria(skinCatalog);
  assert.equal(criteriaIdsAreKnown(complete), true);
  assert.equal(complete.applicable, true);
  assert.equal(complete.items.find(i => i.id === 'boutique_need')?.status, 'ok');
  assert.equal(complete.complete, true);
  const incomplete = evaluateCatalogSkinCriteria({ ...skinCatalog, inci: '', concerns: [] });
  assert.equal(incomplete.items.find(i => i.id === 'inci')?.status, 'missing');
  assert.equal(incomplete.items.find(i => i.id === 'boutique_need')?.status, 'missing');
  assert.ok(incomplete.missingCount >= 2);
  assert.equal(incomplete.complete, false);
  assert.ok(!incomplete.items.some(i => !SKIN_NEED_VALUES.includes(i.id) && !['documented_need', 'boutique_need', ...SKIN_REQUIRED_METADATA.map(f => f.field)].includes(i.id)));
});

ok('aucun id hors des critères déjà là', () => {
  const samples = [
    evaluateIdentifiedSkinCriteria(unifyFondPosition({ sourcingItemId: 'fond-50-n07', rang: 2, produit: 'Barrière' })),
    evaluateCatalogSkinCriteria(skinCatalog),
    evaluateCatalogSkinCriteria({ category: 'cheveux', name: 'Shampoing' }),
  ];
  for (const checklist of samples) assert.equal(criteriaIdsAreKnown(checklist), true);
});

ok('UI : checklist sur identifié et catalogue ; fulfillment/launchCatalog intacts', () => {
  const identified = read('components/IdentifiedProductsPanel.tsx');
  const editor = read('components/ProductNeedsEditor.tsx');
  const checklist = read('components/SkinCriteriaChecklist.tsx');
  assert.ok(identified.includes('SkinCriteriaChecklist'));
  assert.ok(identified.includes('evaluateIdentifiedSkinCriteria'));
  assert.ok(editor.includes('SkinCriteriaChecklist'));
  assert.ok(editor.includes('evaluateCatalogSkinCriteria'));
  assert.ok(checklist.includes('Aucun critère inventé') || checklist.includes('aucun critère inventé') || checklist.includes('Pas de 16ᵉ besoin'));
  assert.ok(!read('lib/skinCriteria.ts').includes('from \'./fulfillment\''));
  assert.ok(!read('lib/fulfillment.ts').includes('skinCriteria'));
  assert.ok(!read('lib/launchCatalog.ts').includes('skinCriteria'));
  assert.ok(!read('lib/skinCriteria.ts').includes('SKIN_NEED_16'));
});

console.log(`\n[PASS] Critères Skin (chantier 5) : ${checks} contrôles — 50 + 15 + SKIN_REQUIRED_METADATA, 0 inventé.`);
