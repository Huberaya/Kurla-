/**
 * BANC — C-05 : « une routine courte n'est pas une routine tronquée »
 * ===================================================================
 *
 * La peau sensible et la débutante veulent MOINS de produits ; le builder les
 * invitait à en composer plus. Le plafond par niveau existait déjà — 3 étapes
 * pour un débutant — mais il coupait la liste en silence : la cliente recevait
 * un extrait sans savoir qu'il était un extrait, ni ce qui existait au-delà.
 *
 * Ce banc verrouille :
 *
 *   1. le plafond tient — jamais plus de trois étapes pour un débutant ;
 *   2. ce qui est écarté est dit, une étape à la fois, avec sa raison ;
 *   3. chaque étape repoussée dit ce qu'elle apporte ET quand elle cesse
 *      d'être superflue — une notice vide serait une case cochée ;
 *   4. une étape n'est jamais à la fois dans la routine et dans la liste
 *      d'attente ;
 *   5. quand la cliente choisit ses étapes elle-même, rien ne lui est
 *      repoussé : ce n'est plus un plafond, c'est son choix.
 *
 * Point de vigilance assumé : ces justifications sont contre-commerciales.
 * Quatre des cinq étapes optionnelles disent « n'ajoutez ceci que si… ». Le
 * banc vérifie que cette franchise survit aux prochaines modifications.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_routine_minimale.test.ts
 */

import assert from 'node:assert/strict';
import {
  buildRecommendations,
  type EngineContext,
  type EngineProduct,
} from '../src/lib/recommendationEngine';
import {
  buildRoutine,
  maxStepsForLevel,
  ESSENTIAL_STEPS,
  JUSTIFICATIONS_ETAPES,
} from '../src/lib/routineBuilder';
import type { ShelfItem } from '../src/lib/shelf';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function produit(partial: Partial<EngineProduct> & { id: string; name: string }): EngineProduct {
  return {
    slug: partial.id,
    brand: 'Marque test',
    price: 20,
    category: 'cheveux',
    inStock: true,
    needs: ['hydrater_cheveux'],
    keyIngredients: [],
    ingredientIds: [],
    targetHairTypes: ['4c'],
    ...partial,
  } as EngineProduct;
}

const ETAPES = [
  'cleanse', 'condition', 'leave_in', 'deep_condition',
  'seal_oil', 'styling_definer', 'scalp_treatment', 'protein_treatment',
] as const;

const CATALOGUE = ETAPES.map((step, i) =>
  produit({ id: `r-${step}`, name: `Produit ${step}`, price: 10 + i, routineStep: step }),
);

const contexte: EngineContext = { shelf: [] as ShelfItem[], observations: [] };
const recommandations = buildRecommendations(CATALOGUE, contexte).recommendations;

const debutante = buildRoutine(recommandations, [], {
  goal: 'Hydrater mes cheveux crépus',
  experienceLevel: 'debutant',
});
const intermediaire = buildRoutine(recommandations, [], {
  goal: 'Hydrater mes cheveux crépus',
  experienceLevel: 'intermediaire',
});
const avancee = buildRoutine(recommandations, [], {
  goal: 'Hydrater mes cheveux crépus',
  experienceLevel: 'avance',
});
const choisie = buildRoutine(recommandations, [], {
  goal: 'Hydrater mes cheveux crépus',
  experienceLevel: 'debutant',
  requestedSteps: ['cleanse', 'condition'],
});

console.log('\nBANC C-05 — routine minimale, étapes écartées dites\n');

// ── 1. Le plafond tient ─────────────────────────────────────────────────────
ok('une débutante ne reçoit jamais plus de trois étapes', () => {
  assert.equal(maxStepsForLevel('debutant'), 3);
  assert.ok(debutante.slots.length <= 3, `${debutante.slots.length} étapes proposées`);
  assert.ok(ESSENTIAL_STEPS.every(step => debutante.slots.some(s => s.routineStep === step)),
    'les trois étapes essentielles doivent être servies avant toute option');
});

// ── 2. Ce qui est écarté est dit ────────────────────────────────────────────
ok('les étapes écartées par le plafond sont listées', () => {
  const attendues = ETAPES.length - debutante.slots.length;
  assert.equal(debutante.deferred.length, attendues,
    `${debutante.deferred.length} étapes repoussées, ${attendues} attendues`);
  for (const etape of debutante.deferred) {
    assert.ok(etape.reason.length > 20, `${etape.routineStep} : raison absente`);
    assert.match(etape.reason, /niveau/, `${etape.routineStep} : la raison doit nommer le plafond`);
    assert.ok(etape.durationMinutes > 0);
  }
});

ok('chaque étape repoussée dit ce qu’elle apporte et quand la reprendre', () => {
  for (const etape of debutante.deferred) {
    assert.ok(etape.apporte.length > 20, `${etape.routineStep} : « ce qu’elle apporte » manque`);
    assert.ok(etape.quand.length > 40, `${etape.routineStep} : « quand » trop court pour être utile`);
  }
});

ok('les justifications restent contre-commerciales', () => {
  // Si toutes les étapes devenaient « à ajouter dès que possible », le chantier
  // serait dénaturé en argumentaire de vente.
  const textes = Object.values(JUSTIFICATIONS_ETAPES).map(j => `${j.apporte} ${j.quand}`.toLowerCase());
  const conditionnelles = textes.filter(t => /que si|superflue|à réserver|à n’ajouter|à ajouter quand|pas d’effet/.test(t));
  assert.ok(conditionnelles.length >= 3,
    `${conditionnelles.length} justifications posent une condition : la franchise doit rester majoritaire`);
});

// ── 3. Cohérence ────────────────────────────────────────────────────────────
ok('aucune étape n’est à la fois retenue et repoussée', () => {
  const retenues = new Set(debutante.slots.map(s => s.routineStep));
  const repoussees = debutante.deferred.map(d => d.routineStep);
  for (const step of repoussees) {
    assert.equal(retenues.has(step), false, `${step} figure dans les deux listes`);
  }
});

ok('le plafond intermédiaire repousse moins que le plafond débutant', () => {
  assert.ok(intermediaire.slots.length > debutante.slots.length);
  assert.ok(intermediaire.deferred.length < debutante.deferred.length);
});

ok('au niveau avancé, plus rien n’est repoussé', () => {
  assert.equal(avancee.deferred.length, 0, 'toutes les étapes tiennent dans la routine avancée');
});

ok('une cliente qui choisit ses étapes n’a rien de repoussé', () => {
  // Ce n'est plus un plafond subi, c'est une sélection : la présenter comme une
  // limitation du niveau serait faux.
  assert.equal(choisie.deferred.length, 0);
  assert.equal(choisie.slots.length, 2);
});

console.log(`\n${checks} contrôles passés — routine minimale : ${debutante.slots.length} étapes, ${debutante.deferred.length} écartées et dites\n`);
