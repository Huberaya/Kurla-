/**
 * BANC — D-01 : « comparer deux produits au prix est un mauvais service »
 * =======================================================================
 *
 * La boutique comparait déjà deux à trois produits côte à côte, mais sur
 * quatre lignes : prix, texture, format, pays. C'est-à-dire sur ce qui est
 * renseigné partout, jamais sur ce qui départage.
 *
 * Le comparateur ne montrait pas le coût par utilisation, alors que KURLA sait
 * le calculer depuis D-04 (doses SCCS/1647/22). Deux shampoings : 250 ml à
 * 12 € et 400 ml à 18 €. Le second coûte 6 € de plus à l'achat et revient
 * moins cher à l'usage. Sans la ligne « coût par utilisation », l'écran fait
 * pour départager deux produits désignait le plus cher comme le moins
 * avantageux — l'inverse de la vérité.
 *
 * Ce banc verrouille :
 *   1. le calcul — le coût par utilisation est présent et correct ;
 *   2. le renversement — le produit le plus cher à l'achat est bien identifié
 *      comme le moins cher à l'usage ;
 *   3. la divergence — seuls les champs qui diffèrent sont signalés ;
 *   4. la retenue — une catégorie sans référence de dose affiche sa raison,
 *      jamais un chiffre arrangé ; aucun score, aucun « meilleur choix ».
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_comparateur.test.ts
 */

import assert from 'node:assert/strict';
import { comparerProduits, pointsDeDivergence } from '../src/lib/productCompare';
import { estimerUsage } from '../src/lib/usageDosage';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  \u2713 ${label}`);
}

/** Deux shampoings : le grand format coûte plus cher et revient moins cher. */
const petit = {
  id: 'a', name: 'Shampoing doux 250 ml', brand: 'Cantu', category: 'cheveux', subcategory: 'lavage',
  sizeLabel: '250ml', price: 12, texture: 'Crème', keyIngredients: ['Beurre de karité'], countryAvailability: ['FR'],
};
const grand = {
  id: 'b', name: 'Shampoing doux 400 ml', brand: 'Cantu', category: 'cheveux', subcategory: 'lavage',
  sizeLabel: '400ml', price: 18, texture: 'Crème', keyIngredients: ['Beurre de karité'], countryAvailability: ['FR'],
};

const estimationPetit = estimerUsage(petit);
const estimationGrand = estimerUsage(grand);

// ── 1. Le calcul ────────────────────────────────────────────────────────────
ok('le coût par utilisation est calculé pour les deux formats', () => {
  assert.ok(estimationPetit.costPerUse !== null, 'le petit format doit être estimable');
  assert.ok(estimationGrand.costPerUse !== null, 'le grand format doit être estimable');
  assert.ok(estimationPetit.uses !== null && estimationPetit.uses > 1);
  assert.ok(estimationGrand.uses !== null && estimationGrand.uses > estimationPetit.uses,
    'le grand format doit offrir plus d’utilisations');
});

ok('l’hypothèse de calcul est affichable', () => {
  // Un chiffre sans sa dose ni sa fréquence n'est pas vérifiable : la ligne
  // porte toujours de quoi la contester.
  assert.ok(estimationPetit.assumption.length > 0, 'aucune hypothèse affichable');
});

// ── 2. Le renversement ──────────────────────────────────────────────────────
ok('le plus cher à l’achat est identifié comme le moins cher à l’usage', () => {
  assert.ok(grand.price > petit.price, 'le grand format doit bien coûter plus cher à l’achat');
  assert.ok(estimationGrand.costPerUse! < estimationPetit.costPerUse!,
    `${estimationGrand.costPerUse?.toFixed(3)} € contre ${estimationPetit.costPerUse?.toFixed(3)} € : `
    + 'l’écart doit s’inverser à l’usage, sinon la comparaison par le prix ment');
});

ok('la ligne « coût par utilisation » distingue les deux produits', () => {
  const comparaison = comparerProduits([petit, grand]);
  const ligne = comparaison.lignes.find(l => l.champ === 'Coût par utilisation');
  assert.ok(ligne, 'la ligne doit exister');
  assert.equal(ligne?.divergent, true);
});

// ── 3. La divergence ────────────────────────────────────────────────────────
ok('seuls les champs réellement différents sont signalés', () => {
  const identiques = comparerProduits([
    { ...petit, id: 'a' },
    { ...petit, id: 'b' },
  ]);
  assert.deepEqual(pointsDeDivergence(identiques), [],
    'deux fiches identiques ne doivent faire apparaître aucune divergence');

  const differents = pointsDeDivergence(comparerProduits([petit, grand]));
  assert.ok(differents.includes('Coût par utilisation'));
  assert.ok(differents.includes('Format'));
  assert.ok(differents.includes('Prix'));
  assert.ok(!differents.includes('Marque'), 'la marque est la même : elle ne doit pas être signalée');
  assert.ok(!differents.includes('Texture'), 'la texture est la même');
});

ok('la comparaison reste sans score ni vainqueur', () => {
  const comparaison = comparerProduits([petit, grand]);
  const texte = JSON.stringify(comparaison);
  for (const interdit of ['meilleur', 'gagnant', 'score', 'recommandé', 'vainqueur']) {
    assert.ok(!texte.toLowerCase().includes(interdit),
      `« ${interdit} » : un comparateur montre les écarts, il ne conclut pas`);
  }
});

// ── 4. La retenue ───────────────────────────────────────────────────────────
ok('une catégorie sans référence de dose affiche sa raison, pas un chiffre', () => {
  const inconnu = { ...petit, id: 'c', category: 'cheveux', subcategory: 'inconnu_au_registre', sizeLabel: '250ml' };
  const comparaison = comparerProduits([petit, inconnu]);
  const ligne = comparaison.lignes.find(l => l.champ === 'Coût par utilisation');
  const valeurProduitInconnu = ligne?.valeurs[1] ?? '';
  assert.ok(!/^\d+(\.\d+)?\s*€$/.test(valeurProduitInconnu.trim()),
    `un chiffre a été fabriqué : « ${valeurProduitInconnu} »`);
  assert.ok(valeurProduitInconnu.length > 0, 'la raison de l’absence doit être dite');
  assert.equal(comparaison.estimationsIncompletes, true);
});

ok('une contenance absente n’est pas estimée', () => {
  const sansFormat = { ...petit, id: 'd', sizeLabel: undefined, name: 'Shampoing sans contenance' };
  const estimation = estimerUsage(sansFormat);
  assert.equal(estimation.costPerUse, null);
  assert.ok((estimation.limitation || '').length > 0);
});

console.log(`\n${checks} contrôles passés — comparateur : ${estimationPetit.costPerUse?.toFixed(3)} € contre `
  + `${estimationGrand.costPerUse?.toFixed(3)} € l’usage, pour ${petit.price} € et ${grand.price} € à l’achat\n`);
