import assert from 'node:assert/strict';

import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { kitShippingCost, peauKitsAsProducts, PEAU_KITS } from '../src/lib/peauKits';
import { buildSkinRoutine } from '../src/lib/skinRoutine';
import type { Product } from '../src/types';

let checks = 0;
function ok(label: string, test: () => void): void {
  test();
  checks += 1;
  console.log(`✓ ${label}`);
}

const componentIds = new Set([
  'peau-ess-001', 'peau-ess-002', 'peau-ess-003',
  'peau-ess-005', 'peau-ess-006', 'peau-ess-011', 'peau-ess-013',
]);

ok('les trois kits C3 ont les SKU, prix cibles et économies du plan', () => {
  assert.deepEqual(PEAU_KITS.map(kit => kit.id), ['KPEAU-01', 'KPEAU-02', 'KPEAU-03']);
  assert.deepEqual(PEAU_KITS.map(kit => kit.priceBundle), [49.70, 62.00, 84.90]);
  assert.deepEqual(PEAU_KITS.map(kit => kit.priceSeparate), [52.60, 71.40, 99.80]);
  assert.deepEqual(PEAU_KITS.map(kit => kit.economyPct), [5, 13, 15]);
});

ok('les kits ne référencent aucun placeholder et leurs composants existent', () => {
  for (const kit of PEAU_KITS) {
    assert.ok(kit.products.length >= 3, `${kit.id}: contenu insuffisant`);
    for (const product of kit.products) {
      assert.ok(componentIds.has(product.id), `${kit.id}: composant inconnu ${product.id}`);
      assert.equal('placeholder' in product, false, `${kit.id}: placeholder interdit`);
    }
  }
});

ok('les kits restent explicitement non commercialisables tant que C1 est suspendu', () => {
  const projected = peauKitsAsProducts();
  assert.equal(projected.length, 3);
  for (const kit of projected) {
    assert.equal(kit.availabilityState, 'formulation_target');
    assert.equal(kit.inStock, false);
    assert.equal(kit.image, '');
  }
  assert.equal(kitShippingCost('KPEAU-01'), 4.90);
  assert.equal(kitShippingCost('KPEAU-02'), 0);
  assert.equal(kitShippingCost('KPEAU-03'), 0);
});

function product(partial: Partial<Product>): Product {
  return {
    id: 'product',
    slug: 'product',
    name: 'Produit peau',
    brand: 'Test',
    category: 'peau',
    price: 12,
    rating: 0,
    reviewsCount: 0,
    image: 'https://example.test/product.jpg',
    badges: [],
    forWho: '',
    notIdealIf: '',
    howToUse: '',
    routineStep: '',
    keyIngredients: [],
    inci: '',
    description: '',
    inStock: true,
    ...partial,
  };
}

ok('la routine ne sélectionne jamais une fiche formulation_target', () => {
  const profile = createEmptyBeautyProfile();
  const blocked = product({
    id: 'blocked-cleanser',
    name: 'Nettoyant formulation cible',
    routineStep: 'Nettoyant doux',
    availabilityState: 'formulation_target',
  });
  const available = product({
    id: 'available-cleanser',
    name: 'Nettoyant validé',
    routineStep: 'Nettoyant doux',
    availabilityState: 'available',
  });
  const routine = buildSkinRoutine(profile, [blocked, available], { tier: 'Essentielle' });
  assert.ok(routine.steps.some(step => step.product?.id === 'available-cleanser'));
  assert.equal(routine.steps.some(step => step.product?.id === 'blocked-cleanser'), false);
});

ok('une routine sans phototype ne déclasse pas un SPF sur une hypothèse de carnation', () => {
  const profile = createEmptyBeautyProfile();
  profile.skin.toneDepth = 'tres_fonce';
  const mineral = product({
    id: 'mineral-spf',
    name: 'SPF 50 minéral',
    routineStep: 'SPF 50+',
    inci: 'Aqua, Zinc Oxide',
    description: 'SPF',
    availabilityState: 'available',
  });
  const routine = buildSkinRoutine(profile, [mineral], { tier: 'Essentielle' });
  assert.equal(routine.steps.some(step => step.alert?.includes('trace blanche')), false);
});

ok('une routine avec phototype VI explicite signale le risque whitecast minéral', () => {
  const profile = createEmptyBeautyProfile();
  profile.skin.phototype = 6;
  profile.skin.phototypeConsent = true;
  const mineral = product({
    id: 'mineral-spf',
    name: 'SPF 50 minéral',
    routineStep: 'SPF 50+',
    inci: 'Aqua, Zinc Oxide',
    description: 'SPF',
    availabilityState: 'available',
  });
  const routine = buildSkinRoutine(profile, [mineral], { tier: 'Essentielle' });
  assert.equal(routine.steps.some(step => step.alert?.includes('trace blanche')), true);
});

console.log(`\n${checks} contrôles C3 kits/routine passés.\n`);
