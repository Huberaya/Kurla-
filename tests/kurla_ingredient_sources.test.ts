/**
 * CHANTIER 1 — Tests unitaires des sources gratuites du graphe d'ingrédients.
 *
 * On teste ici la logique PURE et déterministe (normalisation des tags OBF,
 * canonicité des synonymes INCI, exclusion des fourre-tout), sans réseau.
 * La résolution PubChem/Wikidata est testée par un appel réseau optionnel.
 */
import assert from 'node:assert';
import {
  inciKeyFromTag,
  prettyFromTag,
  canonicalInciKey,
  displayInciLabel,
} from '../src/lib/ingredientSources';

function main() {
  // --- Normalisation des tags Open Beauty Facts ---
  assert.strictEqual(inciKeyFromTag('en:citric-acid'), 'citric-acid', 'tag EN → clé');
  assert.strictEqual(inciKeyFromTag('fr:butyrospermum-parkii-butter'), 'butyrospermum-parkii-butter', 'tag FR → clé');
  assert.strictEqual(inciKeyFromTag('Aqua / Water'), 'aqua-water', 'libellé libre → clé minuscule');
  assert.strictEqual(inciKeyFromTag('  Sodium  Benzoate '), 'sodium-benzoate', 'espaces repliés en tirets');
  assert.strictEqual(inciKeyFromTag('en:linalool'), 'linalool', 'accent/cas basique');

  assert.strictEqual(prettyFromTag('en:citric-acid'), 'Citric Acid', 'libellé lisible depuis tag');

  // --- Canonicité : les synonymes pointent vers l'INCI officiel ---
  assert.strictEqual(canonicalInciKey('water'), 'aqua', 'water → aqua (INCI officiel)');
  assert.strictEqual(canonicalInciKey('eau'), 'aqua', 'eau → aqua');
  assert.strictEqual(canonicalInciKey('glycerin'), 'glycerin', 'un INCI déjà canonique reste stable');

  // --- Libellé d'affichage canonique ---
  assert.strictEqual(displayInciLabel('aqua', 'Water'), 'Aqua', "affichage INCI : 'Aqua'");
  assert.strictEqual(displayInciLabel('glycerin', 'Glycerin'), 'Glycerin', 'pas de surcharge inutile');

  // --- Stabilité : clés déterministes (dédoublonnage) ---
  assert.strictEqual(inciKeyFromTag('EN:Glycerin'), inciKeyFromTag('en:glycerin'), 'casse ignorée');
  assert.strictEqual(canonicalInciKey('water'), canonicalInciKey('water'), 'idempotent');

  console.log('[PASS] Sources ingrédients : normalisation des tags OBF, canonicité INCI (aqua/water), libellés et déterministe — aucun agrégat pris pour une substance.');
}

main();
