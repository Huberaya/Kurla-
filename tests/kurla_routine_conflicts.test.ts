/**
 * CHANTIER D-03 — banc des conflits d'actifs sur l'étagère réelle.
 *
 * Ce que ce banc verrouille :
 *
 *  1. **Le conflit est attribué aux bons produits.** Un conflit n'a de valeur
 *     que s'il nomme les deux flacons concernés. Un conflit interne à une
 *     formule ne doit pas être reproché à l'association avec un autre
 *     produit — c'est le piège le plus facile à écrire, et le plus trompeur.
 *
 *  2. **On ne prévient que de ce qui est appliqué.** Un produit abandonné,
 *     terminé ou en pause n'entre pas dans la routine du soir : l'inclure
 *     produirait un avertissement pour une situation qui n'existe pas.
 *
 *  3. **L'absence de conflit n'est pas une étagère saine.** Un produit sans
 *     composition rattachée est déclaré non évalué. Le message doit le dire
 *     au lieu d'afficher « aucun conflit » comme si tout avait été vérifié.
 *
 * Les règles utilisées ici sont les vraies règles du projet
 * (`INGREDIENT_INCOMPATIBILITIES`), pas des règles écrites pour le test.
 */
import { strict as assert } from 'node:assert';
import { INGREDIENT_INCOMPATIBILITIES } from '../src/lib/ingredientIncompatibilities';
import { ShelfItem } from '../src/lib/shelf';
import {
  analyseShelfConflicts,
  conflictAdvice,
  conflictsBetween,
  isApplied,
  shelfItemCarrier
} from '../src/lib/routineConflicts';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const RULES = INGREDIENT_INCOMPATIBILITIES;

let seq = 0;
function item(partial: Partial<ShelfItem> & { ingredientIds: string[] }): ShelfItem {
  seq += 1;
  return {
    id: `shelf-${seq}`,
    userId: 'user-1',
    status: 'in_use',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...partial
  };
}

// ——— 1. Deux produits appliqués ensemble : le conflit nomme les deux ———
{
  const serumRetinol = item({ id: 'serum-retinol', freeLabel: 'Sérum rétinol', ingredientIds: ['retinol'], routineStep: 'skin_treatment' });
  const exfoliantBha = item({ id: 'exfo-bha', freeLabel: 'Exfoliant BHA', ingredientIds: ['salicylic-acid'], routineStep: 'skin_cleanser' });
  const { conflicts } = analyseShelfConflicts([serumRetinol, exfoliantBha], RULES);

  const hit = conflicts.find(c => c.ingredientA === 'retinol' && c.ingredientB === 'salicylic-acid');
  assert.ok(hit, 'conflit rétinol × BHA non détecté');
  const labels = [hit.products[0].label, hit.products[1].label].sort();
  assert.deepEqual(labels, ['Exfoliant BHA', 'Sérum rétinol']);
  assert.equal(hit.withinSameProduct, false);
  ok('rétinol × BHA : conflit détecté, les deux flacons sont nommés');
}

// ——— 2. Le conflit est porté par le bon produit de chaque côté ———
{
  const a = item({ id: 'a', freeLabel: 'Crème A', ingredientIds: ['retinol'] });
  const b = item({ id: 'b', freeLabel: 'Gel B', ingredientIds: ['salicylic-acid'] });
  const [conflict] = conflictsBetween(shelfItemCarrier(a), shelfItemCarrier(b), RULES);
  const carrierOf = (ingredient: string) => conflict.products.find(p =>
    (p.itemId === 'a' && a.ingredientIds.includes(ingredient))
    || (p.itemId === 'b' && b.ingredientIds.includes(ingredient)))?.itemId;
  assert.equal(carrierOf('retinol'), 'a');
  assert.equal(carrierOf('salicylic-acid'), 'b');
  ok('chaque actif est rattaché au produit qui le contient, pas à l’autre');
}

// ——— 3. Conflit interne à une formule : détecté, et marqué comme tel ———
{
  const combo = item({ id: 'combo', freeLabel: 'Sérum double actif', ingredientIds: ['retinol', 'salicylic-acid'] });
  const { conflicts } = analyseShelfConflicts([combo], RULES);
  const internal = conflicts.filter(c => c.withinSameProduct);
  assert.ok(internal.length > 0, 'conflit interne non détecté');
  assert.ok(internal.every(c => c.products[0].itemId === 'combo' && c.products[1].itemId === 'combo'));
  assert.ok(internal[0].advice.includes('formule peut être stabilisée'));
  ok('un conflit interne à une formule est détecté, sans conseil de séparation impossible');
}

// ——— 4. Un conflit interne n’est pas reproché à l’association ———
{
  // Le piège : passer l'union des ingrédients au moteur fait remonter le
  // conflit interne au produit A comme s'il opposait A et B.
  const combo = item({ id: 'combo', ingredientIds: ['retinol', 'salicylic-acid'] });
  const tiers = item({ id: 'niacinamide', ingredientIds: ['niacinamide'] });
  const { conflicts } = analyseShelfConflicts([combo, tiers], RULES);
  const retinolBha = conflicts.filter(c =>
    c.ingredientA === 'retinol' && c.ingredientB === 'salicylic-acid');
  assert.equal(retinolBha.length, 1, 'le conflit interne est compté plusieurs fois');
  assert.equal(retinolBha[0].withinSameProduct, true);
  ok('le conflit interne à un produit n’est pas dupliqué en conflit entre deux produits');
}

// ——— 5. Deux produits compatibles : aucun conflit ———
{
  const hydratant = item({ ingredientIds: ['glycerin', 'squalane'] });
  const nettoyant = item({ ingredientIds: ['coco-glucoside'] });
  const { conflicts, message } = analyseShelfConflicts([hydratant, nettoyant], RULES);
  assert.equal(conflicts.length, 0);
  assert.ok(message.includes('Aucun conflit détecté'));
  ok('deux produits sans interaction déclarée ne déclenchent rien');
}

// ——— 6. On ne prévient que de ce qui est réellement appliqué ———
{
  const enCours = item({ id: 'actif', ingredientIds: ['retinol'] });
  const abandonne = item({ status: 'abandoned', ingredientIds: ['salicylic-acid'] });
  const termine = item({ status: 'finished', ingredientIds: ['salicylic-acid'] });
  const enPause = item({ status: 'paused', ingredientIds: ['salicylic-acid'] });
  assert.equal(isApplied(enCours), true);
  assert.equal(isApplied(abandonne), false);
  assert.equal(isApplied(termine), false);
  assert.equal(isApplied(enPause), false);
  const { conflicts, analysedCount } = analyseShelfConflicts([enCours, abandonne, termine, enPause], RULES);
  assert.equal(analysedCount, 1);
  assert.equal(conflicts.length, 0);
  ok('abandonné, terminé, en pause : exclus — on ne prévient pas d’un produit quitté');
}

// ——— 7. Composition inconnue : déclarée non évaluée, jamais « saine » ———
{
  const sansComposition = item({ id: 'inconnu', freeLabel: 'Crème rapportée de voyage', ingredientIds: [] });
  const connue = item({ ingredientIds: ['glycerin'] });
  const { conflicts, unanalysed, message } = analyseShelfConflicts([sansComposition, connue], RULES);
  assert.equal(conflicts.length, 0);
  assert.equal(unanalysed.length, 1);
  assert.equal(unanalysed[0].label, 'Crème rapportée de voyage');
  assert.ok(message.includes('n’ont pas pu être évalués'), `message trompeur : ${message}`);
  ok('un produit sans composition est déclaré non évalué, pas compté comme sain');
}

// ——— 8. Étiquette lisible, même sans nom de produit ———
{
  const { conflicts } = analyseShelfConflicts([
    item({ id: 'p1', productId: 'prod-42', ingredientIds: ['retinol'] }),
    item({ id: 'p2', ingredientIds: ['salicylic-acid'] })
  ], RULES, { displayNames: { 'prod-42': 'Sérum KURLA nuit' } });
  assert.equal(conflicts[0].products[0].label, 'Sérum KURLA nuit');
  const brut = analyseShelfConflicts([
    item({ id: 'p3', productId: 'prod-43', ingredientIds: ['retinol'] }),
    item({ id: 'p4', ingredientIds: ['salicylic-acid'] })
  ], RULES).conflicts[0];
  assert.equal(brut.products[0].label, 'prod-43');
  ok('le nom du produit est résolu quand il est connu, l’identifiant sinon — jamais vide');
}

// ——— 9. Gravité : ce qu’il faut éviter passe avant ce qu’il faut espacer ———
{
  const { conflicts } = analyseShelfConflicts([
    item({ ingredientIds: ['retinol'] }),                 // × BHA : avoid
    item({ ingredientIds: ['salicylic-acid'] }),          //
    item({ ingredientIds: ['ascorbic-acid'] }),           // × BHA : space_out
    item({ ingredientIds: ['citric-acid'] })              // × rétinol : caution
  ], RULES);
  assert.ok(conflicts.length >= 3, `attendu au moins 3 conflits, obtenu ${conflicts.length}`);
  const rank = { avoid: 0, space_out: 1, caution: 2 } as const;
  for (let i = 1; i < conflicts.length; i += 1) {
    assert.ok(rank[conflicts[i - 1].severity] <= rank[conflicts[i].severity], 'ordre de gravité non respecté');
  }
  ok('les conflits sont triés : à éviter, puis à espacer, puis sous surveillance');
}

// ——— 10. Un conseil actionnable par niveau, pas un avertissement vide ———
{
  assert.ok(conflictAdvice('avoid', false).includes('pas les deux le même jour'));
  assert.ok(conflictAdvice('space_out', false).includes('matin'));
  assert.ok(conflictAdvice('caution', false).includes('surveillant'));
  assert.ok(conflictAdvice('avoid', true).includes('stabilisée'));
  ok('chaque gravité porte un geste concret — jamais « demandez à un médecin »');
}

// ——— 11. Le niveau de preuve est conservé jusqu’à l’affichage ———
{
  const { conflicts } = analyseShelfConflicts([
    item({ ingredientIds: ['retinol'] }),
    item({ ingredientIds: ['salicylic-acid'] })
  ], RULES);
  const hit = conflicts.find(c => c.ingredientA === 'retinol' && c.ingredientB === 'salicylic-acid');
  assert.ok(hit);
  assert.equal(hit.evidenceLevel, 'B');
  assert.ok(hit.explanation.length > 40);
  ok('le niveau de preuve et l’explication du graphe traversent l’analyse intacts');
}

// ——— 12. Étagère vide : aucune conclusion hâtive ———
{
  const vide = analyseShelfConflicts([], RULES);
  assert.equal(vide.conflicts.length, 0);
  assert.equal(vide.analysedCount, 0);
  assert.ok(vide.message.includes('étagère est vide'));
  const sansRien = analyseShelfConflicts([item({ ingredientIds: [] })], RULES);
  assert.ok(sansRien.message.includes('ne peuvent pas être évalués'));
  ok('étagère vide et étagère non renseignée ne donnent pas le même message');
}

console.log(`\n  ${checks} contrôles passés — conflits d’actifs (D-03)\n`);
