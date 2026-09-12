import assert from 'node:assert/strict';

import { getCatalogTruth, isCatalogPubliclyListable } from '../src/lib/catalogTruth';
import { hasDocumentedExternalPreorder, isInternalFormulationSource } from '../src/lib/preorderEvidence';
import { isDropshipProduct } from '../src/lib/preorderPromise';
import { getProductFulfillmentMode } from '../src/lib/fulfillment';

/**
 * Verrou d'arbitrage — preuve de précommande, et accessoires en dropship.
 *
 * Ce banc existe parce que la règle a basculé **cinq fois** :
 *
 *   d0d6115  assouplit (boutique vide en production)
 *   2777034  rétablit le SKU obligatoire
 *   3a9ba62  réapplique l'assouplissement
 *   872d27a  rétablit le SKU obligatoire
 *   98c7fa7  réapplique l'assouplissement — état actuel
 *
 * Chaque bascule était défendable prise isolément ; c'est l'absence de verrou
 * qui a coûté cher. Celui-ci fige l'arbitrage du 12/09/2026, tranché par le
 * porteur du projet et consigné dans `src/lib/preorderEvidence.ts` :
 *
 *   **Le SKU fournisseur n'est pas une condition de mise en ligne.**
 *   Source localisable + fournisseur identifié suffisent. Le SKU reste réclamé
 *   par la préparation au sourcing ; son canal est la collecte, pas le blocage.
 *
 * Il fige aussi la contrepartie, sans laquelle l'assouplissement serait une
 * simple absence de règle : **sans fournisseur OU sans source, rien ne passe.**
 *
 * Seconde partie : les accessoires sont en dropship (décision du 12/09/2026,
 * année 1 sans stock). Le dropship est décidé par la catégorie, pas par une
 * liste ; la liste des 28 identifiants sert de garde anti-régression.
 *
 * Pour changer cet arbitrage : un nouvel arbitrage explicite, et ce banc
 * modifié dans le même commit.
 */

const fiche = (extra: Record<string, unknown> = {}) => ({
  id: 'launch-p35',
  slug: 'peigne-afro-metal',
  name: 'Peigne afro métal (fro pick)',
  category: 'accessoires',
  brand: 'KURLA',
  price: 4.9,
  image_url: 'https://example.com/peigne.jpg',
  ingredients: ['Acier inoxydable'],
  country_availability: ['FR', 'BE'],
  is_active: true,
  catalog_status: 'published',
  is_preorder: true,
  badges: [],
  // Les sept champs de preuve au vert : mesuré en base, les 63 publiés les passent.
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'licensed',
  source_supplier: 'Distristar (grossiste marques afro US, Bobigny) — achat-revente',
  supplier_id: 'sup-distristar',
  supplier_sku: '',
  ...extra
});

// ── 1. L'arbitrage : le SKU n'est pas requis ────────────────────────────────
const sansSku = fiche();
assert.equal(hasDocumentedExternalPreorder(sansSku), true,
  'ARBITRAGE du 12/09/2026 : source + fournisseur suffisent, le SKU fournisseur n’est pas requis');
assert.equal(isCatalogPubliclyListable(sansSku), true,
  'une précommande sans SKU mais avec source et fournisseur doit être listable — sinon la boutique se vide');
const verite = getCatalogTruth(sansSku);
assert.equal(verite.commercialState, 'preorder');
assert.equal(verite.isCheckoutEligible, true);

// ── 2. La contrepartie : la règle a toujours des dents ──────────────────────
for (const [manque, libelle] of [
  [{ supplier_id: '' }, 'sans fournisseur'],
  [{ source_supplier: '' }, 'sans source'],
  [{ supplier_id: '', source_supplier: '' }, 'sans fournisseur ni source'],
] as const) {
  const trouee = fiche(manque as Record<string, unknown>);
  assert.equal(hasDocumentedExternalPreorder(trouee), false,
    `${libelle} : la précommande ne doit pas être réputée documentée`);
  assert.equal(isCatalogPubliclyListable(trouee), false,
    `${libelle} : la fiche ne doit pas être listable — l'assouplissement porte sur le SKU, pas sur tout`);
  assert.equal(getCatalogTruth(trouee).isCheckoutEligible, false,
    `${libelle} : non achetable`);
}

// ── 3. Une formulation interne n'est jamais une précommande vendable ────────
const interne = fiche({ source_supplier: 'KURLA Skincare — formulation interne (précommande)' });
assert.equal(isInternalFormulationSource(interne), true);
assert.equal(hasDocumentedExternalPreorder(interne), false,
  'une formulation interne ne doit pas être validée comme précommande externe documentée');

// ── 4. Les 28 accessoires publiés sont en dropship ──────────────────────────
// Identifiants mesurés en base le 12/09/2026 (category='accessoires',
// catalog_status='published'). Le dropship est décidé par la catégorie ; cette
// liste est une garde anti-régression, pas la source de la règle.
const accessoires = [
  'launch-p16', 'launch-p17', 'launch-p18', 'launch-p19', 'launch-p20', 'launch-p21',
  'launch-p22', 'launch-p23', 'launch-p24', 'launch-p25', 'launch-p26', 'launch-p27',
  'launch-p35', 'launch-p36', 'launch-p37', 'launch-p38', 'launch-p39', 'launch-p40',
  'launch-p41', 'launch-p42', 'launch-p43', 'launch-p44', 'launch-p45', 'launch-p46',
  'launch-p47', 'launch-p48', 'launch-p49', 'launch-p50'
];
assert.equal(accessoires.length, 28, '28 accessoires publiés, mesurés en base');
for (const id of accessoires) {
  const produit = { id, category: 'accessoires' };
  assert.equal(isDropshipProduct(produit), true, `${id} doit être traité en dropship`);
  assert.equal(getProductFulfillmentMode(produit), 'dropship_24_48h',
    `${id} doit annoncer un fulfilment dropship 24-48h`);
}

// ── 5. Contre-exemple : les soins ne héritent pas du dropship ───────────────
assert.equal(isDropshipProduct({ id: 'launch-p01', category: 'cheveux' }), false,
  'un soin capillaire ne doit pas hériter du dropship des accessoires');
assert.equal(getProductFulfillmentMode({ id: 'launch-p01', category: 'cheveux' }), 'preorder_3_5j');

console.log('[PASS] Arbitrage précommande verrouillé : source + fournisseur suffisent (le SKU n’est pas requis), mais sans fournisseur ou sans source rien n’est listable ni achetable, et une formulation interne n’est jamais une précommande vendable. Les 28 accessoires publiés sont en dropship 24-48h, sans que les soins capillaires en héritent.');
