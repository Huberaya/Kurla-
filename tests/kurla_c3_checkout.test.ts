import { strict as assert } from 'node:assert';
import http from 'node:http';
import { buildSkinKitQuotes } from '../src/lib/skinKitPricing';
import { peauKitsAsProducts } from '../src/lib/peauKits';
import { isCheckoutEligibleProduct } from '../src/lib/catalogTruth';

const VERIFIED = {
  ingredientVerificationStatus: 'verified',
  claimsValidationStatus: 'verified',
  imagesValidationStatus: 'verified',
  stockValidationStatus: 'verified',
  certificationsValidationStatus: 'verified',
  translationsValidationStatus: 'verified',
  brandVerificationStatus: 'verified',
  imageOwnershipStatus: 'brand_provided'
};

function component(id: string, price: number, extra: Record<string, unknown> = {}): any {
  return {
    id,
    slug: id,
    name: id,
    brand: 'Marque vérifiée',
    price,
    category: 'peau',
    ingredients: ['Eau'],
    image: 'https://cdn.example.test/product.jpg',
    galleryImages: [],
    countryAvailability: ['FR'],
    isActive: true,
    catalogStatus: 'published',
    inStock: true,
    isPromo: false,
    ...VERIFIED,
    ...extra
  };
}

const kitOneIds = ['peau-ess-001', 'peau-ess-002', 'peau-ess-003'];
const allComponents = [
  component(kitOneIds[0], 14),
  component(kitOneIds[1], 18),
  component(kitOneIds[2], 22)
];

const reconciled = buildSkinKitQuotes(allComponents, 'FR')[0];
assert.equal(reconciled.priceSource, 'server_reconciled');
assert.equal(reconciled.reconciled, true);
assert.equal(reconciled.priceSeparate, 54);
assert.equal(reconciled.priceBundle, 51.30, 'Le bundle doit appliquer 5 % au total serveur, pas le prix cible statique.');
assert.equal(reconciled.economy, 2.70);
assert.equal(reconciled.shippingCents, 490);
assert.equal(reconciled.checkoutEligible, false, 'C1 suspendu : même un kit réconcilié reste non achetable.');
assert.match(reconciled.reason, /C1/);

const missingComponent = buildSkinKitQuotes(allComponents.slice(0, 2), 'FR')[0];
assert.equal(missingComponent.priceSource, 'indicative_target');
assert.equal(missingComponent.reconciled, false);
assert.equal(missingComponent.priceBundle, 49.70);
assert.equal(missingComponent.priceSeparate, 52.60);
assert.match(missingComponent.reason, /indicatif/);

const targetComponent = component(kitOneIds[2], 22, {
  badges: ['formulation-target'],
  sourceSupplier: 'Formulation cible interne'
});
const blocked = buildSkinKitQuotes([...allComponents.slice(0, 2), targetComponent], 'FR')[0];
assert.equal(blocked.priceSource, 'server_reconciled');
assert.equal(blocked.checkoutEligible, false);
assert.equal(blocked.components[2].checkoutEligible, false);
assert.match(blocked.reason, /non achetable/);
assert.equal(isCheckoutEligibleProduct(targetComponent), false);

const pseudoKit = peauKitsAsProducts()[0];
assert.equal(pseudoKit.availabilityState, 'formulation_target');
assert.equal(isCheckoutEligibleProduct(pseudoKit), false, 'Un pseudo-kit de formulation cible ne doit jamais franchir la truth layer.');

// Parcours HTTP réel : le SKU cible est refusé par l'endpoint checkout avant
// toute tentative d'appel Stripe. Ce test ne simule donc pas un succès de
// paiement et vérifie le verrou à la frontière serveur.
process.env.STRIPE_SECRET_KEY = 'sk_test_c3_checkout_guard';
process.env.KURLA_TEST_NO_SERVER = 'true';
const { app } = await import('../server');
const httpServer = http.createServer(app);
await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
try {
  const address = httpServer.address();
  assert.ok(address && typeof address === 'object');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ product_id: 'kit-peau-ess-001', quantity: 1 }],
      customerEmail: 'test@example.com',
      shippingMethod: 'standard',
      shippingAddress: {
        fullName: 'Test Client',
        street: '12 rue Test',
        city: 'Nantes',
        postalCode: '44000',
        country: 'FR'
      }
    })
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.match(String(body.error), /disponible à la vente/i);
} finally {
  await new Promise<void>(resolve => httpServer.close(() => resolve()));
}

console.log('[PASS] C3.3 : devis kits réconciliés côté serveur, prix indicatifs conservés si composants absents, checkout kit verrouillé.');
