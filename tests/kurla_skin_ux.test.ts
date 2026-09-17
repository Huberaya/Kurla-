/**
 * CHANTIER 14 — UX Skin : empty state honnête, pas de panier fantôme.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';
import {
  canShowAddToCart,
  countSellableSkinSkus,
  isSellableSkinSku,
  isSkinCosmeticProduct,
  productsForSkinShelf,
  skinShelfEmpty,
  SKIN_EMPTY_COPY,
} from '../src/lib/skinCommerce';

let checks = 0;
const ok = (label: string, fn: () => void) => { fn(); checks += 1; console.log(`  ✓ ${label}`); };

console.log('\n=== C14 — UX Skin empty state / pas de panier fantôme ===\n');

const hair = {
  id: 'p1',
  category: 'accessoires',
  price: 12,
  inStock: true,
  isPreorder: false,
};

const peauSellable = {
  id: 'skin-live',
  category: 'peau',
  price: 19.9,
  inStock: true,
  availabilityState: 'available' as const,
};

const peauDraft = {
  id: 'skin-draft',
  category: 'peau',
  price: 24,
  inStock: true,
  availabilityState: 'pending_validation' as const,
};

const peauFormulation = {
  id: 'skin-cible',
  category: 'peau',
  price: 49.7,
  inStock: false,
  availabilityState: 'formulation_target' as const,
};

const peauTest = {
  id: 'skin-test',
  category: 'peau',
  price: null,
  inStock: true,
  testListing: true,
  availabilityState: 'available' as const,
};

ok('Hair accessoire reste achetable (panier Hair intact)', () => {
  assert.equal(canShowAddToCart(hair), true);
  assert.equal(isSkinCosmeticProduct(hair), false);
  assert.equal(isSellableSkinSku(hair), false);
});

ok('0 SKU Skin → étagère vide, fail-closed si non mesurée', () => {
  assert.equal(countSellableSkinSkus([hair, peauDraft, peauFormulation, peauTest]), 0);
  assert.equal(skinShelfEmpty([hair], true), true);
  assert.equal(skinShelfEmpty(null, false), true);
  assert.equal(skinShelfEmpty([peauSellable], true), false);
});

ok('SKU Skin publié + prix → fiche vendable, panier OK', () => {
  assert.equal(isSellableSkinSku(peauSellable), true);
  assert.equal(canShowAddToCart(peauSellable), true);
  assert.equal(countSellableSkinSkus([peauSellable, hair]), 1);
});

ok('draft / formulation / test listing → jamais « Ajouter »', () => {
  assert.equal(canShowAddToCart(peauDraft), false);
  assert.equal(canShowAddToCart(peauFormulation), false);
  assert.equal(canShowAddToCart(peauTest), false);
  assert.equal(isSellableSkinSku(peauTest), false);
});

ok('grille peau : Hair et tests exclus, fiches publiées conservées', () => {
  const shelf = productsForSkinShelf([hair, peauSellable, peauTest, peauFormulation] as any[]);
  assert.deepEqual(shelf.map(p => p.id), ['skin-live', 'skin-cible']);
});

ok('diagnostic peau : SKU Hair dans les handles → 0 carte, pas de panier', () => {
  const model = buildDiagnosticResultModel({
    isSkin: true,
    answers: { skinType: 'mixte' },
    result: {
      summary: 's',
      recommendedRoutine: 'r',
      reason: 'x',
      steps: [],
      warnings: [],
      productHandles: ['p1'],
      requiresHumanReview: false,
      generatedWithAI: false,
    },
    products: [{
      id: 'p1',
      slug: 'p1',
      name: 'Peigne afro',
      brand: 'KURLA',
      category: 'accessoires',
      price: 12,
      rating: 0,
      reviewsCount: 0,
      image: '',
      badges: [],
      forWho: '',
      notIdealIf: '',
      howToUse: '',
      routineStep: '',
      keyIngredients: [],
      inci: '',
      description: '',
      inStock: true,
    } as any],
  });
  assert.equal(model.products.length, 0);
  assert.equal(model.isSkin, true);
});

ok('diagnostic peau : SKU Skin achetable → Ajouter possible', () => {
  const model = buildDiagnosticResultModel({
    isSkin: true,
    answers: { skinType: 'mixte' },
    result: {
      summary: 's',
      recommendedRoutine: 'r',
      reason: 'x',
      steps: [],
      warnings: [],
      productHandles: ['serum-hpi'],
      requiresHumanReview: false,
      generatedWithAI: false,
    },
    products: [{
      id: 'skin-001',
      slug: 'serum-hpi',
      name: 'Sérum HPI',
      brand: 'Marque',
      category: 'peau',
      price: 19.9,
      rating: 0,
      reviewsCount: 0,
      image: '',
      badges: [],
      forWho: '',
      notIdealIf: '',
      howToUse: '',
      routineStep: 'Sérum',
      keyIngredients: [],
      inci: '',
      description: '',
      inStock: true,
      availabilityState: 'available',
    } as any],
  });
  assert.equal(model.products.length, 1);
  assert.equal(model.products[0].actionable, true);
});

ok('copy empty state Skin présente et honnête', () => {
  assert.match(SKIN_EMPTY_COPY.title, /aucun soin peau/i);
  assert.match(SKIN_EMPTY_COPY.text, /panier/i);
});

ok('surfaces publiques Skin branchées sur skinCommerce', () => {
  const boutique = readFileSync('src/pages/BoutiquePage.tsx', 'utf8');
  const diagnostic = readFileSync('src/pages/DiagnosticResultPage.tsx', 'utf8');
  const landing = readFileSync('src/pages/SkinLandingPage.tsx', 'utf8');
  const fiche = readFileSync('src/pages/ProductDetailPage.tsx', 'utf8');
  assert.match(boutique, /canShowAddToCart/);
  assert.match(boutique, /SKIN_EMPTY_COPY/);
  assert.match(diagnostic, /SKIN_EMPTY_COPY/);
  assert.match(landing, /countSellableSkinSkus/);
  assert.match(fiche, /canShowAddToCart/);
  assert.doesNotMatch(boutique, /workspace === 'skin' && </);
});

console.log(`\n[PASS] C14 UX Skin : ${checks} contrats.`);
