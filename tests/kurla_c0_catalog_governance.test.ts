import assert from 'node:assert/strict';

import { CATALOG_GUARD_EXPECTED, assertCatalogIntegrity } from '../src/lib/catalogGuard';
import {
  getCatalogTruth,
  getProductTruth,
  isCatalogPubliclyListable,
  isCheckoutEligibleProduct,
} from '../src/lib/catalogTruth';
import { catalogAdminView } from '../src/lib/db/catalogStore';
import { normalizeCartItems } from '../src/lib/db/orderStore';
import { toPublicProduct } from '../src/lib/db/internal';

function verified(extra: Record<string, unknown> = {}) {
  return {
    id: 'c0-product',
    slug: 'c0-product',
    name: 'Produit C0',
    title: 'Produit C0',
    brand: 'KURLA Botanicals',
    category: 'peau',
    is_active: true,
    catalog_status: 'published',
    ingredient_verification_status: 'verified',
    claims_validation_status: 'verified',
    images_validation_status: 'verified',
    stock_validation_status: 'verified',
    certifications_validation_status: 'verified',
    translations_validation_status: 'verified',
    brand_verification_status: 'verified',
    image_ownership_status: 'brand_provided',
    ingredients: ['Glycerin'],
    image: 'https://cdn.example.test/product.jpg',
    country_availability: ['FR'],
    in_stock: true,
    stock_quantity: 4,
    price: 18,
    ...extra,
  };
}

// Une cible de formulation n'est ni listable, ni achetable, même si un
// historique SQL lui a laissé published et le badge preorder.
const target = verified({
  id: 'target',
  source_supplier: 'KURLA — formulation interne',
  badges: ['formulation-target', 'preorder'],
  is_preorder: true,
  in_stock: false,
  stock_quantity: 0,
});
const pending = verified({ id: 'pending', claims_validation_status: 'pending' });
const available = verified({ id: 'available' });
const preorder = verified({ id: 'preorder', is_preorder: true, in_stock: false, stock_quantity: 0, badges: ['preorder'] });

assert.deepEqual(getProductTruth(target), getCatalogTruth(target));
assert.equal(getCatalogTruth(target).commercialState, 'formulation_target');
assert.equal(isCatalogPubliclyListable(target), false);
assert.equal(isCheckoutEligibleProduct(target), false);
assert.equal(getCatalogTruth(pending).commercialState, 'pending_validation');
assert.equal(isCatalogPubliclyListable(pending), false);
assert.equal(isCheckoutEligibleProduct(pending), false);

for (const product of [available, preorder]) {
  const truth = getCatalogTruth(product);
  const publicProduct = toPublicProduct(product);
  const adminProduct = catalogAdminView({} as never, product);
  assert.equal(truth.isPubliclyListable, true);
  assert.equal(truth.isCheckoutEligible, true);
  assert.equal(publicProduct.availabilityState, truth.commercialState);
  assert.equal(publicProduct.availabilityLabel, truth.availabilityLabel);
  assert.equal(publicProduct.availabilityMessage, truth.availabilityMessage);
  assert.deepEqual(adminProduct.truth, truth, `${product.id}: l'admin doit lire la même vérité serveur`);
}
assert.equal(toPublicProduct(preorder).inStock, false);
assert.equal(toPublicProduct(preorder).availabilityState, 'preorder');

const checkoutStore = {
  getProductById: async (id: string) => ({ target, preorder } as Record<string, any>)[id],
} as never;
await assert.rejects(
  () => normalizeCartItems(checkoutStore, [{ productId: 'target', quantity: 1 }]),
  /non éligible au checkout/,
);
assert.deepEqual(
  await normalizeCartItems(checkoutStore, [{ productId: 'preorder', quantity: 1 }]),
  [{ productId: 'preorder', quantity: 1, variantId: undefined }],
  'une précommande vérifiée reste ajoutable au panier sans être appelée disponible',
);

// Le compte 54/77 est résolu explicitement contre la source du dépôt : aucun
// SKU n'est supprimé pour faire passer artificiellement la garde.
assert.deepEqual(CATALOG_GUARD_EXPECTED, {
  products: 77,
  kits: 10,
  file: 'src/lib/launchCatalog.ts',
  rule: CATALOG_GUARD_EXPECTED.rule,
});
assert.equal(assertCatalogIntegrity().ok, true);

console.log('[PASS] C0 — truth serveur cohérente entre public, checkout, admin et garde catalogue 77/10.');
