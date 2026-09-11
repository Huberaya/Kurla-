import assert from 'node:assert/strict';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';
import type { Product } from '../src/types';

let checks = 0;
const ok = (label: string, fn: () => void) => { fn(); checks += 1; console.log(`✓ ${label}`); };

const product = (patch: Record<string, unknown> = {}): Product => ({
  id: 'skin-001', slug: 'serum-hpi', name: 'Sérum HPI vérifié', brand: 'Marque test', category: 'peau', price: 19.9,
  rating: 4.5, reviewsCount: 4, image: 'https://cdn.example.test/serum.jpg', badges: [], forWho: 'Peau', notIdealIf: '', howToUse: 'Le soir', routineStep: 'Sérum ciblé', keyIngredients: ['niacinamide'], inci: 'AQUA', description: 'Produit test', inStock: true,
  countryAvailability: ['FR'],
  catalog_status: 'published', is_active: true, image_ownership_status: 'brand_provided', cpnp_ready: true,
  ingredient_verification_status: 'verified', claims_validation_status: 'verified', images_validation_status: 'verified', stock_validation_status: 'verified', certifications_validation_status: 'verified', translations_validation_status: 'verified', brand_verification_status: 'verified',
  ...patch,
} as Product);

const result = (handles: string[], generatedWithAI = false) => ({
  summary: 'Résumé', recommendedRoutine: 'Routine', reason: 'Réponses', steps: ['Étape'], warnings: [], productHandles: handles, requiresHumanReview: false, generatedWithAI,
});

console.log('\n=== C4 — résultat traçable peau ===\n');

ok('profil mixte, phototype V consenti et HPI fréquente : personnalisation visible sans IA inventée', () => {
  const model = buildDiagnosticResultModel({
    isSkin: true,
    answers: { skinType: 'mixte', skinConcerns: ['taches'], skinObjectives: ['uniformiser'], sensitivity: 'moyenne', budget: '40_70', sensitivities: ['parfum'], phototype: 5, phototypeConsent: true },
    result: result(['serum-hpi']),
    products: [product()],
  });
  assert.equal(model.generatedWithAI, false);
  assert.ok(model.profileFields.some(field => field.label === 'Phototype déclaré' && field.value === 'Phototype 5'));
  assert.deepEqual(model.priorities, ['Taches / HPI', 'Uniformiser le teint']);
  assert.equal(model.products[0].availability, 'available');
  assert.equal(model.products[0].price, 19.9);
  assert.equal(model.products[0].countryLabel, 'France');
});

ok('peau sèche sensible, phototype IV et budget bas : inconnus séparés, sans prix fallback', () => {
  const model = buildDiagnosticResultModel({
    isSkin: true,
    answers: { skinType: 'seche', skinConcerns: ['secheresse'], skinObjectives: ['hydrater'], sensitivity: 'elevee', budget: 'moins_40', phototype: 4, phototypeConsent: true },
    result: result(['target-formulation']),
    products: [product({ id: 'target-1', slug: 'target-formulation', price: 49.7, inStock: false, source_supplier: 'Formulation cible KURLA' })],
  });
  assert.ok(model.certain.some(item => item.startsWith('Type de peau')));
  assert.ok(model.unknown.includes('Texture préférée'));
  assert.equal(model.products[0].availability, 'formulation_target');
  assert.equal(model.products[0].actionable, false);
  assert.equal(model.products[0].price, null);
  assert.match(model.products[0].availabilityMessage, /cible de formulation/i);
});

ok('peau grasse imperfections avec routine existante : réponse Gemini explicitement signalée', () => {
  const model = buildDiagnosticResultModel({
    isSkin: true,
    answers: { skinType: 'grasse', skinConcerns: ['imperfections'], skinObjectives: ['reduire_imperfections'], sensitivity: 'faible', budget: '40_70', currentRoutine: 'complete', phototype: 2, phototypeConsent: false },
    result: result(['serum-hpi'], true),
    products: [product({ price: 12.5 })],
  });
  assert.equal(model.generatedWithAI, true);
  assert.equal(model.profileFields.some(field => field.label === 'Phototype déclaré'), false);
  assert.ok(model.evening.some(step => /imperfections/i.test(step.action)));
  assert.equal(model.products[0].price, 12.5);
});

console.log(`\n${checks} checks résultat diagnostic C4 validés.`);
