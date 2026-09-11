import assert from 'node:assert/strict';

import { PEAU_KITS } from '../src/lib/peauKits';
import {
  SKIN_HERO_SCOPE,
  evaluateSkinMetadata,
  evaluateSkinProductReadiness,
  skinHeroAcceptance,
} from '../src/lib/skinCommercialReadiness';

let checks = 0;
function ok(label: string, test: () => void): void {
  test();
  checks += 1;
  console.log(`✓ ${label}`);
}

const baseProduct = {
  id: 'peau-ess-901',
  name: 'Soin peau documenté',
  category: 'peau',
  skinTypes: ['mixte'],
  concerns: ['deshydratation'],
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
  lotReference: 'LOT-2026-01',
  bestBeforeOrPao: 'PAO 12M',
  countryAvailability: ['FR'],
  image: 'https://cdn.example.test/kurla-soin.jpg',
  imageOwnershipStatus: 'licensed',
  imagesValidationStatus: 'verified',
  inStock: true,
  stockQuantity: 20,
  isActive: true,
  catalogStatus: 'published',
  claimsValidationStatus: 'verified',
};

ok('le contrat C1 exige les champs peau et ne complète aucune valeur', () => {
  const metadata = evaluateSkinMetadata(baseProduct);
  assert.equal(metadata.complete, true);
  assert.equal(metadata.coveragePercent, 100);

  const incomplete = evaluateSkinMetadata({ ...baseProduct, inci: '' });
  assert.equal(incomplete.complete, false);
  assert.ok(incomplete.missing.some(item => item.field === 'inci'));
});

ok('un SPF doit prouver whitecast, phototypes IV–VI et sous-tons teintés', () => {
  const spf = {
    ...baseProduct,
    id: 'peau-ess-003',
    name: 'SPF 50+ Invisible Teinté',
    routineStep: 'SPF 50+',
    concerns: ['protection_solaire'],
    isTinted: true,
    whitecastRisk: 'low',
    whitecastTestStatus: 'verified',
    testedPhototypes: ['IV', 'V', 'VI'],
    testedUndertones: ['neutre', 'chaud', 'froid'],
  };
  assert.equal(evaluateSkinMetadata(spf).complete, true);
  const missing = evaluateSkinMetadata({ ...spf, testedPhototypes: ['I', 'II', 'III'] });
  assert.ok(missing.missing.some(item => item.field === 'tested_phototypes'));
});

ok('une source formulation interne ne peut pas devenir ready_to_buy', () => {
  const readiness = evaluateSkinProductReadiness({
    ...baseProduct,
    id: SKIN_HERO_SCOPE[0],
    sourceSupplier: 'KURLA Skincare — formulation interne (précommande)',
  });
  assert.equal(readiness.commercialState, 'formulation_target');
  assert.ok(readiness.blockers.some(item => item.field === 'source_supplier'));
});

ok('une précommande externe documentée reste une précommande, pas une formulation cible', () => {
  const readiness = evaluateSkinProductReadiness({
    ...baseProduct,
    id: SKIN_HERO_SCOPE[1],
    sourceSupplier: 'Distributeur UE vérifié',
    isPreorder: true,
  });
  assert.equal(readiness.internalSource, false);
  assert.equal(readiness.commercialState, 'preorder_verified');
});

ok('l’acceptation héros reste à zéro tant que les trois preuves ne sont pas réunies', () => {
  const report = SKIN_HERO_SCOPE.map(id => evaluateSkinProductReadiness({
    ...baseProduct,
    id,
    sourceSupplier: 'KURLA Skincare — formulation interne (précommande)',
  }));
  const acceptance = skinHeroAcceptance(report);
  assert.equal(acceptance.acceptedCount, 0);
  assert.equal(acceptance.meetsThreeToFive, false);
  assert.deepEqual(acceptance.missingHeroIds, [...SKIN_HERO_SCOPE]);
});

ok('tous les composants de kits utilisent des IDs catalogue connus, sans placeholder', () => {
  const productIds = new Set([
    'peau-ess-001', 'peau-ess-002', 'peau-ess-003',
    'peau-ess-005', 'peau-ess-006', 'peau-ess-011', 'peau-ess-013',
  ]);
  for (const kit of PEAU_KITS) {
    for (const product of kit.products) {
      assert.ok(productIds.has(product.id), `${kit.id}: ${product.id} non référencé`);
      assert.equal('placeholder' in product, false);
    }
  }
});

console.log(`\n${checks} contrôles C1 peau passés — héros acceptés: 0 sans preuves fournisseur.\n`);
