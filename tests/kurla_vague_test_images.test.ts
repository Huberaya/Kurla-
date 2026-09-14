import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { getProducts } from '../src/lib/db/catalogStore';
import { toPublicProduct } from '../src/lib/db/internal';
import {
  getCatalogTruth,
  isCatalogPubliclyListable,
  isCheckoutEligibleProduct,
  isTestListableProduct,
  isTestListingProduct,
} from '../src/lib/catalogTruth';

/**
 * Vague test « images fournisseur » — migration 20260926000000.
 *
 * Demande de l'exploitant (14/09/2026) : « mise en boutique avec des images
 * issues des fournisseurs, nécessaires pour faire des tests ; l'envoi des
 * emails viendra en deuxième position ». Sans contractualisation, aucune
 * preuve (prix, droits visuels, INCI vérifiée) n'existe : publier ces fiches
 * dans la boutique réelle serait un mensonge. Le mode test (`?test=1`) sert
 * ces fiches via une porte SÉPARÉE, `isTestListableProduct`, tandis que la
 * porte réelle `isCatalogPubliclyListable` reste inchangée.
 *
 * Données réelles embarquées pour ce banc : six fiches reprises de la page
 * publique d'EOLYS Beauté le 2026-09-14 (visuel produit, INCI complète, EAN ;
 * deux fiches portent la Personne Responsable UE publiée par le fournisseur :
 * AK Biocosmetics GmbH (AT) et Cosmetrade S.L. (ES)).
 */

// ── 0. La migration porte bien les deux colonnes ────────────────────────────
const sql = readFileSync(fileURLToPath(new URL(
  '../supabase/migrations/20260926000000_test_listings.sql', import.meta.url)), 'utf8');
assert.ok(sql.includes('is_test_listing boolean NOT NULL DEFAULT false'),
  'is_test_listing doit exister, booléen, défaut false');
assert.ok(sql.includes('test_listing_note text'),
  'test_listing_note doit exister pour documenter chaque fiche test');

// ── fixtures ────────────────────────────────────────────────────────────────
const ficheTest = (extra: Record<string, unknown> = {}) => ({
  id: 'peau-test-torriden-dive-in-serum',
  slug: 'peau-test-torriden-dive-in-serum',
  name: 'TORRIDEN DIVE-IN SÉRUM À L’ACIDE HYALURONIQUE - 50 ML',
  brand: 'Torriden',
  category: 'peau',
  subcategory: 'serum',
  price: 0, // placeholder technique NOT NULL — la projection publique doit dire null
  image_url: 'https://www.eolys-beaute.com/15238-pdt_540/dive-in-serum-a-l-acide-hyaluronique-50-ml.jpg',
  ingredients: ['Aqua', 'Butylene Glycol', 'Glycerin', 'Sodium Hyaluronate'],
  inci: 'Aqua, Butylene Glycol, Glycerin, Sodium Hyaluronate',
  country_availability: ['FR'],
  is_active: true,
  catalog_status: 'published',
  in_stock: false,
  stock_quantity: 0,
  is_test_listing: true,
  test_listing_note: 'Visuel et INCI repris de la page publique EOLYS le 2026-09-14.',
  // Preuves volontairement NON vérifiées : c'est l'objet du mode test.
  ingredient_verification_status: 'pending',
  claims_validation_status: 'pending',
  images_validation_status: 'pending',
  stock_validation_status: 'pending',
  certifications_validation_status: 'pending',
  translations_validation_status: 'pending',
  brand_verification_status: 'pending',
  image_ownership_status: 'unverified',
  source_supplier: 'EOLYS Beauté — page publique (visuel + INCI)',
  supplier_id: 'sup-eolys-beaute',
  fulfillment_channel: 'not_set',
  supplier_authorization_status: 'not_contacted',
  ...extra
});

const ficheReelle = (extra: Record<string, unknown> = {}) => ({
  ...ficheTest({ id: 'shampoing-reel', slug: 'shampoing-reel', name: 'Shampoing réel', category: 'cheveux', is_test_listing: false }),
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'licensed',
  in_stock: true,
  stock_quantity: 5,
  price: 12.9,
  ...extra
});

const ficheBrouillon = ficheTest({ id: 'peau-brouillon', slug: 'peau-brouillon', is_test_listing: false, catalog_status: 'draft' });

const store = { inMemoryProducts: [ficheTest(), ficheReelle(), ficheBrouillon] } as any;

// ── 1. La fiche test ne satisfait JAMAIS la porte réelle ────────────────────
assert.equal(isCatalogPubliclyListable(ficheTest()), false,
  'une fiche test ne doit pas satisfaire la porte réelle');
// Même sabotage : toutes preuves vérifiées + visuel « licensed ». Le drapeau
// test doit continuer de l'écarter de la boutique réelle.
const testConforme = ficheTest({
  ingredient_verification_status: 'verified', claims_validation_status: 'verified',
  images_validation_status: 'verified', stock_validation_status: 'verified',
  certifications_validation_status: 'verified', translations_validation_status: 'verified',
  brand_verification_status: 'verified', image_ownership_status: 'licensed',
});
assert.equal(isCatalogPubliclyListable(testConforme), false,
  'même pleinement « conforme », une fiche test reste hors boutique réelle');

// ── 2. Sans mode test, la boutique réelle ne voit pas les fiches test ──────
const reel = await getProducts(store, { publishedOnly: true });
assert.deepEqual(reel.map(p => p.id), ['shampoing-reel'],
  'sans includeTestListings, seule la fiche réelle publiée est servie');

// ── 3. En mode test, la fiche test apparaît ; le brouillon reste caché ─────
const avecTest = await getProducts(store, { publishedOnly: true, includeTestListings: true });
const ids = avecTest.map(p => p.id).sort();
assert.deepEqual(ids, ['peau-test-torriden-dive-in-serum', 'shampoing-reel'],
  'le mode test ajoute la fiche test sans exposer les brouillons');

// ── 4. La porte test exige le minimum honnête ───────────────────────────────
assert.equal(isTestListableProduct(ficheTest()), true, 'fiche test complète : test-listable');
assert.equal(isTestListableProduct(ficheTest({ image_url: '' })), false, 'sans visuel : pas test-listable');
assert.equal(isTestListableProduct(ficheTest({ brand: '  ' })), false, 'sans marque : pas test-listable');
assert.equal(isTestListableProduct(ficheTest({ catalog_status: 'draft' })), false, 'non publiée : pas test-listable');
assert.equal(isTestListableProduct(ficheReelle()), false, 'une fiche réelle n’emprunte pas la porte test');
assert.equal(isTestListingProduct(ficheReelle()), false);

// ── 5. Projection publique : jamais « 0 € », jamais achetable ──────────────
const publicTest = toPublicProduct(ficheTest());
assert.equal(publicTest.price, null, 'le placeholder 0 devient une absence explicite');
assert.equal(publicTest.testListing, true);
assert.ok(String(publicTest.priceNote).includes('contractualiser'), 'le libellé prix annonce la contractualisation');
const publicReel = toPublicProduct(ficheReelle());
assert.equal(publicReel.price, 12.9, 'une fiche réelle garde son prix');
assert.equal(publicReel.testListing, undefined);
assert.equal(isCheckoutEligibleProduct(ficheTest()), false, 'fiche test : checkout impossible');
assert.equal(getCatalogTruth(ficheTest()).isTestListing, true);
assert.equal(getCatalogTruth(ficheReelle()).isTestListing, false);

console.log('[PASS] kurla_vague_test_images — porte test séparée, boutique réelle intacte, jamais 0 €');
