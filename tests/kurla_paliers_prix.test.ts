import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  PRICE_BANDS,
  PRICE_BAND_ALL,
  isPriceBandId,
  matchesPriceBand,
  priceBandLabel,
  priceBandOf
} from '../src/lib/priceBands';

/**
 * Paliers de prix — la promesse « moins cher » doit être triable, pas seulement vraie.
 *
 * Constat mesuré le 13/09/2026 : le tri « € Prix croissant » existait déjà dans
 * la boutique. Ce qui manquait, c'est la réponse à « **je n'ai que 10 €** ».
 *
 * Un filtre budget existait (`skinBudget`), mais il était enfermé dans
 * `if (skinContextActive)` de `BoutiquePage` : un client qui regardait les
 * accessoires ou les cheveux n'avait **aucun** filtre de prix. C'était le seul
 * endroit du site où l'on pouvait dire « pas plus de X € », et il ne marchait
 * que sur une catégorie — alors que 28 des 63 produits publiés sont des
 * accessoires à 4,90 € et plus.
 *
 * Ce banc verrouille quatre choses :
 *
 *  1. **Le palier est un plafond inclusif**, pas une tranche. « Moins de 10 € »
 *     doit contenir le produit à 4,90 € ; une tranche « 10–20 € » l'exclurait.
 *  2. **Un prix absent ou invalide est exclu** dès qu'un plafond est actif.
 *     `Number(null)` et `Number('')` valent **0** : sans garde, un produit sans
 *     prix passerait pour un produit à 0 € et s'afficherait dans tous les
 *     paliers. C'est un bug réel, trouvé en testant, pas une précaution.
 *  3. **Les seuils suivent le catalogue réel**, pas une intuition.
 *  4. **Le filtre est branché hors du bloc peau** — garde statique.
 */

// ── 1. Les paliers existent et sont ordonnés ────────────────────────────────
assert.ok(PRICE_BANDS.length >= 3, 'au moins trois paliers, sinon le filtre ne sert à rien');
const plafonds = PRICE_BANDS.map(band => band.cap);
assert.equal(plafonds[plafonds.length - 1], null, 'le dernier palier doit être « tous les prix »');
for (let i = 1; i < plafonds.length - 1; i += 1) {
  assert.ok((plafonds[i] as number) > (plafonds[i - 1] as number),
    `les paliers doivent être croissants : position ${i}`);
}
for (const band of PRICE_BANDS) {
  assert.ok(band.label.trim().length > 0, `palier ${band.id} sans libellé`);
  assert.equal(priceBandLabel(band.id), band.label);
}
assert.equal(isPriceBandId(PRICE_BAND_ALL), true);
assert.equal(isPriceBandId('bidon'), false);
assert.equal(isPriceBandId(42), false);
assert.equal(priceBandLabel('bidon'), null, 'un identifiant inconnu ne doit pas produire de libellé inventé');

// ── 2. Plafond inclusif ─────────────────────────────────────────────────────
assert.equal(matchesPriceBand(10, 'prix_10'), true, '10 € pile est DANS « Moins de 10 € »');
assert.equal(matchesPriceBand(10.01, 'prix_10'), false, '10,01 € est HORS « Moins de 10 € »');
assert.equal(matchesPriceBand(4.9, 'prix_10'), true, 'le peigne à 4,90 € est dans le palier le plus bas');
assert.equal(matchesPriceBand(9999, 'prix_60'), false, 'un kit à 149,90 € n’est pas dans « Moins de 60 € »');

// ── 3. Le garde-fou : un prix absent ne passe pas ───────────────────────────
for (const [valeur, pourquoi] of [
  [undefined, 'absent'],
  [null, 'null — Number(null) vaut 0'],
  ['', 'chaîne vide — Number(\'\') vaut 0'],
  ['   ', 'chaîne blanche'],
  ['abc', 'non numérique'],
  [NaN, 'NaN'],
  [Infinity, 'infini'],
] as Array<[unknown, string]>) {
  assert.equal(matchesPriceBand(valeur, 'prix_10'), false,
    `un prix ${pourquoi} doit être EXCLU dès qu'un plafond est actif : `
    + 'l’afficher sous « Moins de 10 € » serait mentir sur le palier');
}
// …mais « tous les prix » n'exclut rien, même sans prix
for (const valeur of [undefined, null, '', 'abc']) {
  assert.equal(matchesPriceBand(valeur, PRICE_BAND_ALL), true,
    '« Tous les prix » ne doit rien exclure, même un produit sans prix');
}
// un prix réel de 0 reste admis : c'est une gratuite explicite, pas une absence
assert.equal(matchesPriceBand(0, 'prix_10'), true, 'un prix de 0 € explicite reste dans le palier');

// ── 4. Un identifiant inconnu ne bloque rien ────────────────────────────────
for (const valeur of ['inconnu', undefined, null, '', 42, {}]) {
  assert.equal(matchesPriceBand(5, valeur), true,
    `un palier illisible (${JSON.stringify(valeur)}) ne doit rien exclure : `
    + 'mieux vaut afficher trop que vider la boutique sur une URL malformée');
}

// ── 5. priceBandOf renvoie le palier le plus serré ──────────────────────────
assert.equal(priceBandOf(4.9), 'prix_10');
assert.equal(priceBandOf(14.9), 'prix_20');
assert.equal(priceBandOf(49.9), 'prix_60');
assert.equal(priceBandOf(149.9), PRICE_BAND_ALL, 'au-delà du dernier plafond, on retombe sur « tous »');
assert.equal(priceBandOf(undefined), PRICE_BAND_ALL, 'un prix absent n’appartient à aucun palier');

// ── 6. Application aux prix RÉELS du catalogue ──────────────────────────────
// Mesurés en base le 13/09/2026 (SQL direct, projet qzwgsarfdegqtfdnqiql).
const prixReels: Array<[string, number]> = [
  ['peigne afro métal', 4.9], ['brosse à edges', 5.9], ['filet de protection', 5.9],
  ['peigne démêloir', 6.9], ['chouchous satin', 6.9], ['pinces crocodile', 6.9],
  ['brosse silicone', 7.9], ['vaporisateur', 7.9], ['durag satin', 8.9],
  ['gel Eco Style', 8.9], ['shampoing Cantu', 12.9], ['Mielle', 14.9],
  ['Camille Rose', 15.9], ['Shea Moisture masque', 16.9], ['ApHogee', 19.9],
  ['appareil 24,90', 24.9], ['appareil 34,90', 34.9],
  ['kit ENTRY', 49.9], ['kit CORE', 69.9], ['appareil 99,90', 99.9], ['kit PREMIUM', 149.9],
];
const comptes = new Map<string, number>();
for (const band of PRICE_BANDS) {
  comptes.set(band.id, prixReels.filter(([, prix]) => matchesPriceBand(prix, band.id)).length);
}
// Chaque palier doit être inclus dans le suivant : un plafond ne peut pas
// rétrécir l'offre, sinon le sélecteur ment.
let precedent = 0;
for (const band of PRICE_BANDS) {
  const nombre = comptes.get(band.id) as number;
  assert.ok(nombre >= precedent,
    `le palier « ${band.label} » couvre ${nombre} produits, moins que le précédent (${precedent}) : un plafond ne peut pas rétrécir l'offre`);
  precedent = nombre;
}
assert.equal(comptes.get(PRICE_BAND_ALL), prixReels.length, '« Tous les prix » doit tout couvrir');

// La promesse commerciale, mesurée : le catalogue est bien un catalogue
// d'entrée de gamme. 80 % des 63 publiés sont sous 20 €.
const sousVingt = comptes.get('prix_20') as number;
assert.ok(sousVingt / prixReels.length > 0.5,
  `« Moins de 20 € » doit couvrir plus de la moitié de l'échantillon réel (obtenu ${sousVingt}/${prixReels.length}) — `
  + 'sinon le palier censé porter la promesse « moins cher » serait décoratif');
assert.ok((comptes.get('prix_10') as number) > 0,
  'le palier « Moins de 10 € » doit correspondre à une offre réelle, pas être vide');

// ── 7. Garde statique : le filtre est branché HORS du bloc peau ─────────────
const chemin = fileURLToPath(new URL('../src/pages/BoutiquePage.tsx', import.meta.url));
const page = readFileSync(chemin, 'utf8');

assert.match(page, /matchesPriceBand\(p\.price, priceBand\)/,
  'REGRESSION : le filtre de palier de prix a disparu de la boutique');

const positionFiltre = page.indexOf('matchesPriceBand(p.price, priceBand)');
const positionBlocPeau = page.indexOf('if (skinContextActive) {');
assert.ok(positionFiltre > 0 && positionBlocPeau > 0, 'repères introuvables dans BoutiquePage');
assert.ok(positionFiltre < positionBlocPeau,
  'REGRESSION : le filtre de palier est passé DANS le bloc `if (skinContextActive)`. '
  + 'C’était précisément le défaut d’origine : `skinBudget` n’y est visible que sur '
  + 'la catégorie peau, donc un client qui regarde les accessoires ou les cheveux '
  + 'n’a aucun filtre de prix.');

// La dépendance du useMemo : sans elle, changer de palier ne recalcule rien.
// ⚠️ Le fichier contient 8 occurrences de `}, [` — chercher depuis la première
// fait matcher `priceBand,` sur la ligne de DÉCLARATION de l'état, et la garde
// passe à vide. Contrôlé négativement : sans cette précision, retirer la
// dépendance ne faisait pas tomber le banc.
const ancreDeps = 'onlyAfroCommunity, onlyCompatible, selectedCountry, searchQuery, sortBy';
const positionDeps = page.indexOf(ancreDeps);
assert.ok(positionDeps > 0,
  `ancre des dépendances du useMemo introuvable (${ancreDeps}) : la structure de BoutiquePage a changé, cette garde ne vérifie plus rien`);
const ligneDeps = page.slice(positionDeps, page.indexOf('\n', positionDeps));
assert.match(ligneDeps, /\bpriceBand\b/,
  'REGRESSION : `priceBand` a disparu des dépendances du useMemo — le filtre ne se recalculerait jamais, '
  + 'le sélecteur tournerait dans le vide');

// La boucle complète, sinon le filtre est actif de façon invisible.
assert.match(page, /sp\.set\('prix', priceBand\)/, 'le palier doit être écrit dans l’URL');
assert.match(page, /sp\.get\('prix'\)/, 'le palier doit être relu depuis l’URL, sinon un lien partagé n’applique rien');
assert.match(page, /isPriceBandId\(prix\)/,
  'la valeur lue de l’URL doit être validée : une URL malformée ne doit pas produire un état incohérent');
assert.match(page, /setPriceBand\(PRICE_BAND_ALL\)/, 'le bouton « réinitialiser » doit aussi réinitialiser le palier');

// Pas de confusion avec le budget mensuel du profil beauté.
assert.match(page, /skinBudget/, 'le filtre budget peau existant doit rester en place');
assert.equal(page.includes("priceBand: 'moins_40'"), false,
  'les identifiants du budget mensuel du profil (moins_40…) ne doivent pas être réutilisés comme paliers de prix');

console.log(`[PASS] Paliers de prix : 7 contrats verrouillés — ${PRICE_BANDS.length} paliers en plafonds inclusifs, `
  + 'prix absent exclu (Number(null) vaut 0), seuils alignés sur le catalogue réel, '
  + 'filtre branché hors du bloc peau et branché de bout en bout.');
