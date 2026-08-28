import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

import {
  buildRecommendations,
  computeUsageCost,
  explainLearning,
  learnIngredientWeights,
  MINIMUM_OBSERVATIONS_FOR_ADJUSTMENT,
  parseYieldMonths,
  EngineContext,
  EngineProduct
} from '../src/lib/recommendationEngine';
import {
  describeIntent,
  parseSearchIntent,
  searchByIntent
} from '../src/lib/semanticSearch';
import {
  buildRoutine,
  ESSENTIAL_STEPS,
  isExperienceLevel,
  maxStepsForLevel,
  substituteSlot
} from '../src/lib/routineBuilder';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { ShelfItem } from '../src/lib/shelf';
import { OutcomeObservation, valenceOf } from '../src/lib/outcomeEvidence';
import { readServerSources } from './support/serverSources';

const NOW = '2026-08-27T09:00:00.000Z';

function product(partial: Partial<EngineProduct> & { id: string; name: string }): EngineProduct {
  return {
    slug: partial.id,
    brand: 'Marque test',
    price: 20,
    category: 'cheveux',
    inStock: true,
    needs: [],
    keyIngredients: [],
    ingredientIds: [],
    ...partial
  } as EngineProduct;
}

function shelfItem(partial: Partial<ShelfItem> & { id: string }): ShelfItem {
  return {
    userId: 'engine-user',
    status: 'in_use',
    ingredientIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...partial
  } as ShelfItem;
}

function observation(
  partial: Partial<OutcomeObservation> & { id: string; ingredientId: string; signal: OutcomeObservation['signal'] }
): OutcomeObservation {
  return {
    userId: 'engine-user',
    valence: valenceOf(partial.signal),
    isConsentShared: false,
    observedAt: NOW,
    createdAt: NOW,
    ...partial
  } as OutcomeObservation;
}

function baseContext(partial: Partial<EngineContext> = {}): EngineContext {
  return { shelf: [], observations: [], ...partial };
}

async function runRecommendationEngineTests() {
  const serverSource = await readServerSources();

  // Le chantier doit être branché sur l'API, pas seulement exister en lib.
  assert.ok(serverSource.includes("app.post('/api/recommendations'"), 'Le moteur doit être exposé.');
  assert.ok(serverSource.includes("app.get('/api/search'"), 'La recherche sémantique doit être exposée.');
  assert.ok(serverSource.includes("app.post('/api/routine-builder'"), 'Le routine builder doit être exposé.');
  assert.ok(serverSource.includes('deriveAvoidedIngredients(shelf)'), 'Les ingrédients écartés doivent venir des abandons réels.');
  assert.ok(serverSource.includes('await intelligenceStore.getOutcomes(user.id)'), 'Le moteur doit consommer les observations : c’est la boucle qui se referme.');

  // ---------- Coût d'usage réel ----------
  assert.equal(parseYieldMonths('3 mois'), 3);
  assert.equal(parseYieldMonths('6 semaines'), 1.38);
  assert.equal(parseYieldMonths('45 jours'), 1.48);
  assert.equal(parseYieldMonths('250 ml'), null, 'Une contenance n’est pas un rendement : ne pas la convertir en durée.');
  assert.equal(parseYieldMonths(undefined), null);

  const cost = computeUsageCost({ price: 24, estimatedYield: '3 mois' });
  assert.equal(cost.monthlyCost, 8);
  assert.equal(cost.monthsOfUse, 3);

  const unknownCost = computeUsageCost({ price: 24 });
  assert.equal(unknownCost.monthlyCost, null, 'Sans rendement déclaré, aucun coût mensuel ne doit être inventé.');
  assert.match(unknownCost.limitation!, /ne peut pas être calculé/);

  // ---------- Pondérations apprises ----------
  const weights = learnIngredientWeights([
    observation({ id: 'o1', ingredientId: 'glycerin', signal: 'more_hydration' }),
    observation({ id: 'o2', ingredientId: 'glycerin', signal: 'product_heavy' }),
    observation({ id: 'o3', ingredientId: 'glycerin', signal: 'more_hydration' }),
    observation({ id: 'o4', ingredientId: 'shea', signal: 'reaction' })
  ]);
  assert.equal(weights.get('glycerin')?.net, 1, '2 favorables - 1 défavorable = +1.');
  assert.equal(weights.get('glycerin')?.observationCount, 3);
  assert.equal(weights.get('shea')?.net, -1);
  assert.equal(
    weights.get('shea')?.observationCount < MINIMUM_OBSERVATIONS_FOR_ADJUSTMENT,
    true,
    'Une seule observation ne doit pas suffire à ajuster.'
  );

  // ---------- Exclusion : ce que l'utilisateur possède déjà ----------
  const ownedCatalog = [
    product({ id: 'p-owned', name: 'Leave-in Kurla', price: 18, routineStep: 'leave_in', ingredientIds: ['glycerin'] }),
    product({ id: 'p-new', name: 'Huile de scellement', price: 15, routineStep: 'seal_oil', ingredientIds: ['castor'] })
  ];
  const ownedResult = buildRecommendations(ownedCatalog, baseContext({
    shelf: [shelfItem({ id: 's1', productId: 'p-owned', freeLabel: 'Leave-in Kurla', routineStep: 'leave_in', estimatedRemainingPercent: 80 })]
  }));
  const ownedRec = ownedResult.recommendations.find(item => item.product.id === 'p-owned')!;
  assert.equal(ownedRec.excluded, true, 'Un produit possédé et encore utilisable ne doit pas être recommandé.');
  assert.equal(ownedRec.rank, null, 'Un produit exclu ne doit pas être classé.');
  assert.ok(ownedRec.adjustments.some(adjustment => adjustment.kind === 'owned'));
  assert.match(ownedResult.summary, /écarté/);

  // Presque terminé → redevient recommandable.
  const almostEmpty = buildRecommendations(ownedCatalog, baseContext({
    shelf: [shelfItem({ id: 's1', productId: 'p-owned', freeLabel: 'Leave-in Kurla', routineStep: 'leave_in', estimatedRemainingPercent: 10 })]
  }));
  const almostRec = almostEmpty.recommendations.find(item => item.product.id === 'p-owned')!;
  assert.equal(almostRec.excluded, false, 'Un produit à 10 % restant doit redevoir recommandable.');
  assert.equal(almostRec.exclusionReason, undefined, 'Une recommandation non exclue ne doit pas porter de motif d’exclusion.');
  assert.match(
    almostRec.adjustments.find(adjustment => adjustment.kind === 'owned')!.reason,
    /fin de vie/,
    'Le réassort doit être justifié par l’état réel du produit.'
  );

  // ---------- Surplus fonctionnel ----------
  const surplusResult = buildRecommendations(ownedCatalog, baseContext({
    shelf: [
      shelfItem({ id: 's1', freeLabel: 'Leave-in A', routineStep: 'leave_in' }),
      shelfItem({ id: 's2', freeLabel: 'Leave-in B', routineStep: 'leave_in' })
    ]
  }));
  const surplusRec = surplusResult.recommendations.find(item => item.product.id === 'p-owned')!;
  assert.ok(
    surplusRec.adjustments.some(adjustment => adjustment.kind === 'surplus'),
    'Un troisième leave-in doit être pénalisé, pas proposé en tête.'
  );

  // ---------- Ingrédients écartés ----------
  const avoidedResult = buildRecommendations(ownedCatalog, baseContext({ avoidedIngredientIds: ['castor'] }));
  const avoidedRec = avoidedResult.recommendations.find(item => item.product.id === 'p-new')!;
  assert.equal(avoidedRec.excluded, true, 'Un produit contenant un ingrédient écarté doit être exclu.');
  assert.match(avoidedRec.exclusionReason!, /écarté/);

  // ---------- Indisponible ----------
  const stockResult = buildRecommendations(
    [product({ id: 'p-oos', name: 'Rupture', inStock: false })],
    baseContext()
  );
  assert.equal(stockResult.recommendations[0].excluded, true);
  assert.equal(stockResult.recommendations[0].rank, null);

  // ---------- Budget ----------
  const budgetResult = buildRecommendations(
    [product({ id: 'p-expensive', name: 'Sérum premium', price: 95 })],
    baseContext({ budgetLimit: 40 })
  );
  const budgetRec = budgetResult.recommendations[0];
  assert.ok(budgetRec.adjustments.some(adjustment => adjustment.kind === 'budget'));
  assert.match(budgetRec.adjustments.find(a => a.kind === 'budget')!.reason, /budget indicatif/);

  // ---------- CRITÈRE DE SORTIE : le moteur apprend et le prouve ----------
  const learningCatalog = [
    product({ id: 'p-glycerin', name: 'Soin glycérine', price: 20, ingredientIds: ['glycerin'], needs: ['hydrater_cheveux'] }),
    product({ id: 'p-shea', name: 'Beurre de karité', price: 20, ingredientIds: ['shea'], needs: ['hydrater_cheveux'] })
  ];
  const profile = createEmptyBeautyProfile();
  profile.hair.curlPattern = '4c';
  profile.hair.porosity = 'faible';
  profile.hair.dryness = 'forte';
  profile.hair.zones.lengths.dryness = 'forte';

  const learningResult = buildRecommendations(learningCatalog, baseContext({
    profile,
    observations: [
      observation({ id: 'obs-1', ingredientId: 'glycerin', signal: 'product_heavy' }),
      observation({ id: 'obs-2', ingredientId: 'glycerin', signal: 'buildup' }),
      observation({ id: 'obs-3', ingredientId: 'shea', signal: 'more_hydration' }),
      observation({ id: 'obs-4', ingredientId: 'shea', signal: 'more_flexible' })
    ]
  }));

  const glycerinRec = learningResult.recommendations.find(item => item.product.id === 'p-glycerin')!;
  const sheaRec = learningResult.recommendations.find(item => item.product.id === 'p-shea')!;

  assert.ok(
    glycerinRec.adjustments.some(adjustment => adjustment.kind === 'negative_outcome'),
    'Deux retours défavorables sur la glycérine doivent abaisser la recommandation.'
  );
  assert.ok(
    sheaRec.adjustments.some(adjustment => adjustment.kind === 'positive_outcome'),
    'Deux retours favorables sur le karité doivent remonter la recommandation.'
  );
  assert.ok(
    (sheaRec.rank ?? 99) < (glycerinRec.rank ?? 99),
    'Le produit soutenu par les retours de l’utilisateur doit passer devant.'
  );

  const learning = explainLearning(learningResult);
  assert.ok(learning.length >= 2, 'Le moteur doit pouvoir citer ce qu’il a appris.');
  assert.ok(
    learning.every(entry => typeof entry.evidenceId === 'string' && entry.evidenceId.length > 0),
    'Chaque apprentissage doit citer l’observation qui l’a provoqué.'
  );
  assert.ok(
    learning.some(entry => entry.evidenceId === 'obs-1' || entry.evidenceId === 'obs-2'),
    'L’observation source doit être identifiable.'
  );

  // Une seule observation ne doit rien changer.
  const singleObservation = buildRecommendations(learningCatalog, baseContext({
    profile,
    observations: [observation({ id: 'obs-1', ingredientId: 'glycerin', signal: 'product_heavy' })]
  }));
  assert.equal(
    explainLearning(singleObservation).length,
    0,
    'Une observation unique est du bruit : elle ne doit rien modifier.'
  );

  // ---------- Conflits dans le panier recommandé ----------
  const conflictCatalog = [
    product({ id: 'p-retinol', name: 'Sérum rétinol', price: 30, ingredientIds: ['retinol'], routineStep: 'skin_treatment' }),
    product({ id: 'p-aha', name: 'Exfoliant AHA', price: 25, ingredientIds: ['aha'], routineStep: 'skin_treatment' })
  ];
  const conflictResult = buildRecommendations(conflictCatalog, baseContext({
    incompatibilityRules: [{ ingredientA: 'retinol', ingredientB: 'aha', severity: 'space_out', explanation: 'Cumul irritant.', evidenceLevel: 'B' }]
  }));
  assert.equal(conflictResult.conflicts.length, 1, 'Un conflit entre deux produits recommandés doit être signalé.');
  assert.equal(conflictResult.conflicts[0].severity, 'space_out');

  // ---------- Recherche sémantique ----------
  const intent = parseSearchIntent('Je veux une routine cheveux crépus secs pour moins de 50 €');
  assert.equal(intent.wantsRoutine, true, '« routine » doit être reconnu.');
  assert.ok(intent.textures.includes('4c'), '« crépus » doit mapper sur 4c.');
  assert.ok(intent.needs.includes('hydrater_cheveux'), '« secs » doit mapper sur le besoin d’hydratation.');
  assert.equal(intent.budget?.maxPerItem, 50);
  assert.equal(intent.budget?.maxTotal, undefined);
  assert.equal(intent.unresolved.length, 0, 'Cette requête doit être entièrement comprise.');
  assert.match(describeIntent(intent), /routine complète/);

  const totalBudget = parseSearchIntent('routine complète 80 € au total');
  assert.equal(totalBudget.budget?.maxTotal, 80, '« au total » doit être interprété comme un budget global.');

  const ambiguous = parseSearchIntent('quelque chose à 30 €');
  assert.equal(ambiguous.budget?.maxPerItem, 30);
  assert.ok(ambiguous.unresolved.length > 0, 'Un prix nu est ambigu : il doit être signalé, pas silently interprété.');

  const opaque = parseSearchIntent('bonjour');
  assert.ok(opaque.unresolved.some(message => message.includes('Aucun besoin')), 'Une requête sans contrainte doit le dire.');

  const fragrance = parseSearchIntent('sérum sans parfum pour peau sensible');
  assert.equal(fragrance.excludesFragrance, true);
  assert.ok(fragrance.needs.includes('peau_sensible'));

  // ---------- Filtrage par intention ----------
  const searchCatalog = [
    { id: 's1', slug: 's1', name: 'Leave-in crépu', brand: 'A', price: 22, category: 'cheveux', needs: ['hydrater_cheveux'], routineStep: 'leave_in', targetHairTypes: ['4c', '4b'] },
    { id: 's2', slug: 's2', name: 'Gel définissant boucles', brand: 'B', price: 18, category: 'cheveux', needs: ['definir_boucles'], routineStep: 'styling_definer', targetHairTypes: ['3b'] },
    { id: 's3', slug: 's3', name: 'Sérum premium', brand: 'C', price: 90, category: 'cheveux', needs: ['hydrater_cheveux'], routineStep: 'leave_in', targetHairTypes: ['4c'] },
    { id: 's4', slug: 's4', name: 'Crème visage', brand: 'D', price: 25, category: 'peau', needs: ['hydrater_peau'], routineStep: 'skin_moisturizer' }
  ];
  const searchResults = searchByIntent(searchCatalog, intent);
  assert.ok(searchResults.length > 0, 'La recherche doit produire des résultats.');
  assert.equal(searchResults[0].product.id, 's1', 'Le produit qui satisfait le plus de contraintes doit passer en premier.');
  assert.ok(!searchResults.some(result => result.product.id === 's3'), 'Un produit au-dessus du plafond doit être écarté.');
  assert.ok(!searchResults.some(result => result.product.id === 's4'), 'Une catégorie hors demande doit être écartée.');
  assert.ok(searchResults[0].matchedOn.length > 0, 'Chaque résultat doit dire sur quoi il correspond.');

  // ---------- Routine Builder ----------
  assert.equal(isExperienceLevel('debutant'), true);
  assert.equal(isExperienceLevel('expert'), false);
  assert.equal(maxStepsForLevel('debutant'), 3, 'Un débutant à qui l’on propose huit étapes abandonne.');

  const routineCatalog = [
    product({ id: 'r-cleanse', name: 'Shampooing doux', price: 14, routineStep: 'cleanse', needs: ['hydrater_cheveux'] }),
    product({ id: 'r-condition', name: 'Après-shampooing', price: 16, routineStep: 'condition', needs: ['hydrater_cheveux'] }),
    product({ id: 'r-leavein', name: 'Leave-in', price: 18, routineStep: 'leave_in', needs: ['hydrater_cheveux'] }),
    product({ id: 'r-oil', name: 'Huile', price: 12, routineStep: 'seal_oil', needs: ['hydrater_cheveux'] })
  ];
  const engineForRoutine = buildRecommendations(routineCatalog, baseContext({ profile }));
  const routine = buildRoutine(engineForRoutine.recommendations, [], {
    goal: 'Hydrater mes cheveux crépus',
    experienceLevel: 'debutant',
    availableMinutesPerDay: 20
  });

  assert.ok(ESSENTIAL_STEPS.every(step => routine.slots.some(slot => slot.routineStep === step)), 'Les étapes essentielles doivent être proposées.');
  assert.equal(routine.slots.length, 3, 'Un débutant ne doit pas recevoir plus de trois étapes.');
  assert.equal(routine.totalItems, 3);
  assert.equal(routine.totalPrice, 48);
  assert.ok(routine.slots.every(slot => slot.reason.length > 0), 'Chaque étape doit expliquer pourquoi elle est là.');

  // Une étape déjà couverte par l'étagère ne doit pas être vendue.
  const routineWithShelf = buildRoutine(engineForRoutine.recommendations, [
    shelfItem({ id: 's1', freeLabel: 'Mon shampooing', routineStep: 'cleanse' })
  ], { goal: 'Hydrater', experienceLevel: 'intermediaire' });
  assert.deepEqual(routineWithShelf.alreadyCovered, ['cleanse']);
  assert.ok(!routineWithShelf.cartItems.some(item => item.productId === 'r-cleanse'), 'Une étape déjà couverte ne doit pas entrer dans le panier.');
  assert.ok(routineWithShelf.notes.some(note => note.includes('déjà couverte')));

  // Budget : on ne dépasse pas, on le dit.
  const tightRoutine = buildRoutine(engineForRoutine.recommendations, [], { goal: 'Hydrater', budgetLimit: 25, experienceLevel: 'intermediaire' });
  assert.ok(tightRoutine.totalPrice <= 25, 'Le panier doit rester dans le budget.');
  assert.ok(tightRoutine.unfulfilled.length > 0, 'Ce qui n’a pas pu être ajouté doit être déclaré.');
  assert.ok(tightRoutine.unfulfilled.some(item => item.reason.includes('budget')));

  // Une étape non pourvue est déclarée, jamais remplie au hasard.
  const partialCatalog = [product({ id: 'r-only', name: 'Shampooing', price: 14, routineStep: 'cleanse' })];
  const partialEngine = buildRecommendations(partialCatalog, baseContext({ profile }));
  const partialRoutine = buildRoutine(partialEngine.recommendations, [], { goal: 'Routine complète', experienceLevel: 'intermediaire' });
  assert.ok(partialRoutine.unfulfilled.some(item => item.routineStep === 'condition'), 'Une étape essentielle manquante doit être déclarée.');
  assert.ok(partialRoutine.notes.some(note => note.includes('essentielle')));

  // Temps déclaré dépassé.
  const timeRoutine = buildRoutine(engineForRoutine.recommendations, [], {
    goal: 'Hydrater',
    experienceLevel: 'avance',
    availableMinutesPerDay: 5,
    requestedSteps: ['cleanse', 'condition', 'leave_in', 'deep_condition']
  });
  assert.equal(timeRoutine.overTime, true, 'Une routine qui ne tient pas dans le temps déclaré doit être signalée.');
  assert.ok(timeRoutine.notes.some(note => note.includes('minutes')));

  // Substitution d'un maillon, sans reconstruire toute la routine.
  const substituted = substituteSlot(routine, 'leave_in', product({ id: 'r-leavein-alt', name: 'Leave-in alternatif', price: 25, routineStep: 'leave_in' }));
  assert.equal(substituted.totalPrice, 55, 'La substitution doit recalculer le prix.');
  assert.ok(substituted.cartItems.some(item => item.productId === 'r-leavein-alt'));
  assert.ok(!substituted.cartItems.some(item => item.productId === 'r-leavein'));
  assert.equal(substituted.slots.length, routine.slots.length, 'Les autres étapes ne doivent pas bouger.');

  console.log('[PASS] Chantier 5 : moteur hybride avec pondérations apprises et traçabilité, exclusion des doublons, ingrédients écartés, conflits, coût d’usage, recherche sémantique et routine builder validés.');
}

runRecommendationEngineTests().catch(error => {
  console.error('[FAIL] Chantier 5 — moteur de recommandation:', error);
  process.exitCode = 1;
});
