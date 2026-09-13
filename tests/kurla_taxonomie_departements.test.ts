import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CATALOG_CATEGORIES,
  CATALOG_DEPARTMENTS,
  COSMETIC_DEPARTMENTS,
  normalizeDepartment
} from '../src/lib/catalogManagement';
import { isAccessoryProduct, requiresCpnp } from '../src/lib/cosmeticCompliance';
import { getCatalogTruth, isCatalogPubliclyListable } from '../src/lib/catalogTruth';

/**
 * Taxonomie du catalogue — 10 départements, et le classement qui va avec.
 *
 * Constat mesuré le 13/09/2026 : le site ne déclarait que **2 départements**
 * (`cheveux`, `peau`) alors que la base en portait déjà **6**. Trois verrous
 * codés en dur interdisaient tout le reste :
 *
 *   - `catalogStore.ts` normalisait uniquement « peau » et « cheveu » ;
 *   - `catalogStore.ts` **rejetait** tout autre département
 *     (« Utilisez cheveux ou peau ») ;
 *   - `cosmeticCompliance.ts` et `catalogTruth.ts` listaient `['cheveux','peau']`.
 *
 * Résultat : impossible de référencer un rouge à lèvres, un parfum ou un
 * vernis. Élargir le sourcing sans lever ces verrous n'aurait rien donné.
 *
 * Ce banc verrouille deux choses, dont la seconde est un garde-fou juridique :
 *
 *  1. **La largeur** — les 10 départements existent, chacun a au moins une
 *     sous-catégorie, aucun slug n'est doublé.
 *  2. **Le classement cosmétique / non cosmétique.** C'est le point dangereux :
 *     rattacher `accessoires` à `COSMETIC_DEPARTMENTS` imposerait un dossier
 *     CPNP à un peigne ; oublier `maquillage` laisserait passer un produit
 *     cosmétique sans contrôle. Les deux erreurs sont verrouillées ici.
 */

// ── 1. Les départements existent ────────────────────────────────────────────
/** `as const` donne un type littéral strict ; cette liste ne sert qu'à comparer. */
const slugs: string[] = CATALOG_DEPARTMENTS.map(department => department.slug);
for (const attendu of ['cheveux', 'peau', 'maquillage', 'parfum', 'hygiene', 'ongles', 'accessoires', 'kits', 'enfants', 'hommes']) {
  assert.ok(slugs.includes(attendu), `département manquant : ${attendu}`);
}

// ── 2. Aucun doublon, aucun département vide ────────────────────────────────
const vus = new Set<string>();
for (const slug of slugs) {
  assert.equal(vus.has(slug), false, `doublon de département : ${slug}`);
  vus.add(slug);
}
const sousCategoriesParDepartement = new Map<string, number>();
for (const categorie of CATALOG_CATEGORIES) {
  sousCategoriesParDepartement.set(categorie.department, (sousCategoriesParDepartement.get(categorie.department) || 0) + 1);
}
for (const department of CATALOG_DEPARTMENTS) {
  assert.ok((sousCategoriesParDepartement.get(department.slug) || 0) > 0,
    `département « ${department.slug} » déclaré sans aucune sous-catégorie : il serait inutilisable`);
}
const slugsSousCategories = CATALOG_CATEGORIES.map(c => c.slug);
assert.equal(new Set(slugsSousCategories).size, slugsSousCategories.length,
  'deux sous-catégories partagent le même slug : la validation par ensemble en laisserait passer une');
for (const categorie of CATALOG_CATEGORIES) {
  assert.ok(slugs.includes(categorie.department),
    `sous-catégorie « ${categorie.slug} » rattachée au département inconnu « ${categorie.department} »`);
}

// ── 3. Le classement cosmétique / non cosmétique ────────────────────────────
const cosmetiques = new Set(COSMETIC_DEPARTMENTS);
for (const attendu of ['cheveux', 'peau', 'maquillage', 'parfum', 'hygiene', 'ongles']) {
  assert.equal(cosmetiques.has(attendu), true,
    `« ${attendu} » est un produit cosmétique au sens du règlement 1223/2009 : `
    + 'il doit être dans COSMETIC_DEPARTMENTS, sinon le garde CPNP ne le voit pas');
}
for (const exclu of ['accessoires', 'kits', 'enfants', 'hommes']) {
  assert.equal(cosmetiques.has(exclu), false,
    `« ${exclu} » ne doit PAS être dans COSMETIC_DEPARTMENTS. `
    + 'Un accessoire n’est pas un cosmétique : l’y rattacher imposerait un dossier '
    + 'CPNP à un peigne. Pour « enfants » et « hommes », ce sont des départements '
    + 'transverses — c’est la sous-catégorie qui décide, pas le département.');
}

// ── 4. Le garde CPNP suit le classement, dans les deux sens ─────────────────
const fiche = (extra: Record<string, unknown>) => ({
  id: 'x', slug: 'x', name: 'Produit de test', price: 9.9,
  image_url: 'https://example.com/x.jpg', country_availability: ['FR'],
  is_active: true, catalog_status: 'published', is_preorder: true, badges: [],
  ingredient_verification_status: 'verified', claims_validation_status: 'verified',
  images_validation_status: 'verified', stock_validation_status: 'verified',
  certifications_validation_status: 'verified', translations_validation_status: 'verified',
  brand_verification_status: 'verified', image_ownership_status: 'licensed',
  source_supplier: 'BLACKETIQUE SASU (grossiste, stock France)',
  supplier_id: 'sup-blacketique', supplier_sku: '',
  ...extra
});

const rouge = fiche({ category: 'maquillage', subcategory: 'levres_maquillage', brand: 'IDC Institute', ingredients: ['Ricinus Communis Seed Oil'] });
assert.equal(requiresCpnp(rouge), true,
  'un rouge à lèvres est un cosmétique : le garde CPNP doit le voir');

const peigne = fiche({ category: 'accessoires', subcategory: 'peignes_brosses', brand: 'KURLA', ingredients: ['Acier inoxydable'] });
assert.equal(isAccessoryProduct(peigne), true, 'un peigne reste un accessoire');
assert.equal(requiresCpnp(peigne), false,
  'un peigne n’est pas un cosmétique : aucune obligation CPNP');

const kit = fiche({ category: 'kits', subcategory: 'kit_core', brand: 'KURLA', ingredients: ['Aqua'] });
assert.equal(requiresCpnp(kit), false,
  'un kit est un assemblage : sa conformité est celle de ses composants');

// ── 5. Une notification CPNP expirée bloque un cosmétique, pas un accessoire ─
const perime = fiche({ category: 'maquillage', subcategory: 'teint', brand: 'IDC Institute', ingredients: ['Aqua'], cpnpNotified: false });
assert.equal(isCatalogPubliclyListable(perime), false,
  'un fond de teint dont la notification CPNP est expirée ne doit pas être publié');
assert.equal(getCatalogTruth(perime).blockers.some(texte => /CPNP/i.test(texte)), true);

const accessoirePerime = fiche({ category: 'accessoires', subcategory: 'peignes_brosses', brand: 'KURLA', ingredients: ['Acier inoxydable'], cpnpNotified: false });
assert.equal(isCatalogPubliclyListable(accessoirePerime), true,
  'une notification CPNP expirée ne doit pas dépublier un accessoire : il n’y est pas soumis');

// ── 6. La normalisation accepte ce qui était rejeté ─────────────────────────
const cas: Array<[string, string | null]> = [
  ['peau', 'peau'], ['Peau sèche', 'peau'],
  ['cheveux', 'cheveux'], ['Cheveux crépus', 'cheveux'],
  ['maquillage', 'maquillage'], ['make-up', 'maquillage'],
  ['parfum', 'parfum'], ['Fragrance', 'parfum'],
  ['hygiene', 'hygiene'], ['Hygiène', 'hygiene'], ['Gel douche', 'hygiene'],
  ['ongles', 'ongles'], ['Manucure', 'ongles'],
  ['accessoires', 'accessoires'], ['Outils', 'accessoires'],
  ['kits', 'kits'], ['Kit Complet', 'kits'],
  ['enfants', 'enfants'], ['Bébé', 'enfants'],
  ['hommes', 'hommes'], ['Rasage & Barbe', 'hommes'],
  ['', null], ['inconnu', null],
  // Le piège réel : « men » ne doit pas matcher dans « électroménager ».
  ['electromenager', null], ['Électroménager', null],
];
for (const [entree, attendu] of cas) {
  assert.equal(normalizeDepartment(entree), attendu,
    `normalizeDepartment(${JSON.stringify(entree)}) doit donner ${JSON.stringify(attendu)}`);
}

// ── 7. Garde statique : les verrous en dur ne reviennent pas ────────────────
const fichiers = ['../src/lib/cosmeticCompliance.ts', '../src/lib/catalogTruth.ts', '../src/lib/db/catalogStore.ts'];
for (const chemin of fichiers) {
  const absolu = fileURLToPath(new URL(chemin, import.meta.url));
  const contenu = readFileSync(absolu, 'utf8');
  assert.equal(contenu.includes("['cheveux', 'peau']"), false,
    `REGRESSION dans ${chemin} : la liste ['cheveux', 'peau'] est codée en dur. `
    + 'Utilisez CATALOG_DEPARTMENTS / COSMETIC_DEPARTMENTS — sinon ajouter un '
    + 'département exige de modifier plusieurs fichiers sans qu’aucun ne prévienne.');
  assert.equal(/Utilisez cheveux ou peau/.test(contenu), false,
    `REGRESSION dans ${chemin} : le message « Utilisez cheveux ou peau » est revenu`);
}

console.log(`[PASS] Taxonomie du catalogue : 7 contrats verrouillés — ${CATALOG_DEPARTMENTS.length} départements, `
  + `${CATALOG_CATEGORIES.length} sous-catégories, ${COSMETIC_DEPARTMENTS.length} cosmétiques et `
  + `${CATALOG_DEPARTMENTS.length - COSMETIC_DEPARTMENTS.length} non cosmétiques, `
  + 'garde CPNP aligné dans les deux sens, normalisation sans faux positif, aucun verrou en dur.');
