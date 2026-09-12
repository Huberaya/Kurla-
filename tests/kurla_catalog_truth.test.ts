import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getCatalogTruth,
  isCatalogPubliclyListable,
  isCheckoutEligibleProduct,
} from '../src/lib/catalogTruth';
import { toPublicProduct } from '../src/lib/db/internal';

function verified(extra: Record<string, unknown> = {}) {
  return {
    id: 'truth-product',
    slug: 'truth-product',
    name: 'Produit preuve',
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
    stock_quantity: 3,
    price: 18,
    ...extra,
  };
}

const target = verified({
  id: 'skin-target',
  source_supplier: 'KURLA Skincare — formulation interne (précommande)',
  image_ownership_status: 'illustrative',
  ingredient_verification_status: 'pending',
  claims_validation_status: 'pending',
  in_stock: false,
  stock_quantity: 0,
  is_preorder: true,
  badges: ['preorder', 'formulation-target'],
});
const placeholder = verified({
  id: 'placeholder',
  image_ownership_status: 'illustrative',
  image: 'https://cdn.example.test/illustration.jpg',
  in_stock: false,
  stock_quantity: 0,
});
const pendingValidation = verified({
  id: 'pending-validation',
  claims_validation_status: 'pending',
});
const preorder = verified({
  id: 'preorder',
  is_preorder: true,
  in_stock: false,
  stock_quantity: 0,
  badges: ['preorder'],
  source_supplier: 'Fournisseur externe documenté',
  supplier_id: 'supplier-fixture',
  supplier_sku: 'SKU-PREORDER-FIXTURE',
});
// Décision du 12/09/2026, épinglée ici pour qu'elle ne revienne pas en
// silence. Mesuré en production : 0 produit publié sur 63 portait un
// `supplier_sku`, alors que `supplier_id` et `source_supplier` étaient
// renseignés sur les 63. Exiger le SKU a donc masqué l'intégralité du
// catalogue — `/api/products` répondait `count: 0` en 200, sans erreur.
// Le fournisseur et sa source suffisent à documenter une précommande ; le SKU
// reste signalé comme manquant par la préparation au sourcing, qui est son
// vrai canal. Une alerte, jamais un blocage de mise en ligne.
const preorderSansSku = verified({
  id: 'preorder-sans-sku',
  is_preorder: true,
  in_stock: false,
  stock_quantity: 0,
  badges: ['preorder'],
  source_supplier: 'Distristar (grossiste marques afro US, Bobigny) — achat-revente',
  supplier_id: 'sup-brands-wholesale',
  supplier_sku: undefined,
});
const available = verified({ id: 'available', in_stock: true, stock_quantity: 2 });
const unavailable = verified({ id: 'unavailable', in_stock: false, stock_quantity: 0 });

assert.equal(getCatalogTruth(target).commercialState, 'formulation_target');
assert.equal(getCatalogTruth(target).proofState, 'incomplete');
assert.equal(isCatalogPubliclyListable(target), false);
assert.equal(isCheckoutEligibleProduct(target), false);

assert.equal(getCatalogTruth(placeholder).commercialState, 'placeholder');
assert.equal(isCatalogPubliclyListable(placeholder), false);
assert.equal(isCheckoutEligibleProduct(placeholder), false);

assert.equal(getCatalogTruth(pendingValidation).commercialState, 'pending_validation');
assert.equal(getCatalogTruth(pendingValidation).availabilityLabel, 'Validation en attente');
assert.equal(isCatalogPubliclyListable(pendingValidation), false);
assert.equal(isCheckoutEligibleProduct(pendingValidation), false);

assert.equal(getCatalogTruth(preorder).commercialState, 'preorder');
assert.equal(getCatalogTruth(preorder).proofState, 'compliant');
assert.equal(getCatalogTruth(preorder).preorderDocumented, true);
assert.equal(isCatalogPubliclyListable(preorder), true);
assert.equal(isCheckoutEligibleProduct(preorder), true);

// Sans SKU fournisseur, mais fournisseur et source documentés : la précommande
// est réputée prouvée et la fiche reste en ligne. Voir la décision ci-dessus.
assert.equal(getCatalogTruth(preorderSansSku).preorderDocumented, true);
assert.equal(getCatalogTruth(preorderSansSku).proofState, 'compliant');
assert.equal(isCatalogPubliclyListable(preorderSansSku), true);
assert.equal(isCheckoutEligibleProduct(preorderSansSku), true);
const undocumentedPreorder = verified({
  id: 'preorder-undocumented',
  is_preorder: true,
  in_stock: false,
  stock_quantity: 0,
  badges: ['preorder'],
});
assert.equal(getCatalogTruth(undocumentedPreorder).commercialState, 'pending_validation');
assert.equal(getCatalogTruth(undocumentedPreorder).preorderDocumented, false);
assert.equal(isCheckoutEligibleProduct(undocumentedPreorder), false);
const claimBlocked = verified({
  id: 'claim-blocked',
  claims_validation_status: 'pending',
  description: 'Résultat garanti dès la première application.',
});
assert.equal(getCatalogTruth(claimBlocked).claimsClean, false);
assert.equal(isCatalogPubliclyListable(claimBlocked), false);
assert.equal(isCheckoutEligibleProduct(claimBlocked), false);
const skinIncomplete = verified({
  id: 'peau-ess-901',
  category: 'peau',
  skinTypes: ['mixte'],
  skinObjectives: ['hydrater_peau'],
});
assert.equal(getCatalogTruth(skinIncomplete).skinGoverned, true);
assert.equal(getCatalogTruth(skinIncomplete).commercialState, 'pending_validation');
assert.equal(isCheckoutEligibleProduct(skinIncomplete), false);
const publicPreorder = toPublicProduct(preorder);
assert.equal(publicPreorder.availabilityState, 'preorder');
assert.equal(publicPreorder.isPreorder, true);
assert.equal(publicPreorder.inStock, false, 'une précommande ne doit jamais être exposée comme du stock');

assert.equal(getCatalogTruth(available).commercialState, 'available');
assert.equal(isCheckoutEligibleProduct(available), true);
assert.equal(getCatalogTruth(unavailable).commercialState, 'unavailable');
assert.equal(isCheckoutEligibleProduct(unavailable), false);

// Les objets mappés camelCase et les lignes brutes snake_case doivent produire
// exactement la même vérité.
const camel = {
  ...verified(),
  isActive: true,
  catalogStatus: 'published',
  ingredientVerificationStatus: 'verified',
  claimsValidationStatus: 'verified',
  imagesValidationStatus: 'verified',
  stockValidationStatus: 'verified',
  certificationsValidationStatus: 'verified',
  translationsValidationStatus: 'verified',
  brandVerificationStatus: 'verified',
  imageOwnershipStatus: 'brand_provided',
  countryAvailability: ['FR'],
  inStock: true,
  stockQuantity: 1,
};
for (const [field, expected] of [
  ['commercialState', 'available'],
  ['isPubliclyListable', true],
  ['isCheckoutEligible', true],
] as const) {
  assert.equal(getCatalogTruth(camel)[field], expected, `lecture camelCase incohérente pour ${field}`);
}

const generator = readFileSync(join(process.cwd(), 'scripts/generate-skin-range-sql.ts'), 'utf8');
assert.match(generator, /s\('draft'\)/, 'la gamme interne doit être générée en brouillon');
assert.match(generator, /'FALSE',\s*\n\s*s\('draft'\)/, 'la gamme interne doit être inactive');
assert.match(generator, /formulation-target/, 'le statut cible doit être explicite');

console.log('[PASS] Truth layer catalogue : cible, placeholder, précommande, disponible, indisponible, projection publique et parité snake/camel.');
