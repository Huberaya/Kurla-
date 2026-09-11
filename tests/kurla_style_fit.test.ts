import assert from 'node:assert/strict';
import { buildRecommendations, learnIngredientWeights, EngineProduct } from '../src/lib/recommendationEngine';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { detectStyleContext, assessStyleFit, signalWeight } from '../src/lib/styleFit';
import { OutcomeObservation } from '../src/lib/outcomeEvidence';

/**
 * Banc « le conseil tient compte de la coiffure portée ».
 *
 * Fait déclencheur : une personne portant des locks recevait des
 * recommandations « tout juste ». Cause mesurée dans le code : `calculateKurlaFit`
 * renvoie `(needs - unmetNeeds) / needs * 100`, un ratio booléen où chaque
 * besoin compte pareil. Un produit à un seul besoin couvert score 100 ; rien
 * ne distinguait un besoin central d'une erreur de catégorie.
 *
 * Ce banc est comportemental : il exécute `buildRecommendations`, pas une
 * réimplémentation.
 */

function locksProfile() {
  const profile = createEmptyBeautyProfile();
  profile.hair.protectiveStyles = ['locks'];
  profile.hair.texturePatterns = ['locks'];
  return profile;
}

function product(partial: Partial<EngineProduct> & { id: string; name: string }): EngineProduct {
  return {
    slug: partial.id,
    brand: 'KURLA',
    price: 20,
    category: 'cheveux',
    inStock: true,
    ...partial
  } as EngineProduct;
}

// Trois produits volontairement contrastés.
const CLEANSER = product({
  id: 'cleanser',
  name: 'Shampooing clarifiant sans résidu',
  needs: ['entretenir_locks', 'cuir_chevelu'],
  routineStep: 'cleanse'
});
const DEFINER = product({
  id: 'definer',
  name: 'Gel définisseur de boucles',
  needs: ['definir_boucles'],
  routineStep: 'styling_definer'
});
const LEAVE_IN = product({
  id: 'leave_in',
  name: 'Beurre leave-in riche',
  needs: ['hydrater_cheveux'],
  routineStep: 'leave_in'
});

function observation(partial: Partial<OutcomeObservation> & { id: string; signal: OutcomeObservation['signal'] }): OutcomeObservation {
  return {
    userId: 'u1',
    valence: -1,
    isConsentShared: false,
    observedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...partial
  } as OutcomeObservation;
}

async function runStyleFitTests(): Promise<void> {
  // --- 1. Détection du style -------------------------------------------
  assert.equal(detectStyleContext(locksProfile()), 'locks');
  assert.equal(detectStyleContext(createEmptyBeautyProfile()), 'aucun');
  assert.equal(detectStyleContext(undefined), 'aucun');

  // --- 2. Le scénario signalé : locks + définisseur de boucles ----------
  const result = buildRecommendations([CLEANSER, DEFINER, LEAVE_IN], {
    profile: locksProfile(),
    shelf: [],
    observations: []
  });

  assert.equal(result.styleContext, 'locks');

  const byId = new Map(result.recommendations.map(recommendation => [recommendation.product.id, recommendation]));
  const cleanser = byId.get('cleanser')!;
  const definer = byId.get('definer')!;
  const leaveIn = byId.get('leave_in')!;
  assert.ok(cleanser && definer && leaveIn, 'les trois produits doivent être classés');

  // Le nettoyant passe devant le définisseur.
  assert.ok(
    (cleanser.rank ?? 99) < (definer.rank ?? 99),
    `le nettoyant (rang ${cleanser.rank}) doit précéder le définisseur de boucles (rang ${definer.rank})`
  );

  // L'erreur de catégorie est nommée, pas seulement pénalisée.
  const categoryError = definer.adjustments.find(a => a.kind === 'style' && a.delta < 0);
  assert.ok(categoryError, 'le définisseur doit porter un écart négatif de style');
  assert.match(categoryError!.reason, /locks/);
  assert.match(categoryError!.reason, /ne s'applique pas/);
  assert.ok(categoryError!.evidenceId?.includes('protectiveStyles'), 'l’écart doit citer le champ du profil');

  // --- 3. Résidu : avertissement ET limite affichée ---------------------
  const residue = leaveIn.adjustments.find(a => a.kind === 'style' && a.limitation);
  assert.ok(residue, 'un leave-in sous locks doit porter la mise en garde sur les résidus');
  assert.match(residue!.limitation!, /n’est déclaré nulle part au catalogue/);
  assert.ok(residue!.delta < 0);

  // Le nettoyant, lui, est bonifié : le cuir chevelu est la zone accessible.
  const scalpBonus = cleanser.adjustments.find(a => a.kind === 'style' && a.delta > 0 && /cuir chevelu/i.test(a.reason));
  assert.ok(scalpBonus, 'le nettoyant doit être bonifié au titre du cuir chevelu');

  // --- 4. Non-régression : sans style déclaré, aucun écart de style -----
  const neutral = buildRecommendations([CLEANSER, DEFINER, LEAVE_IN], {
    profile: createEmptyBeautyProfile(),
    shelf: [],
    observations: []
  });
  assert.equal(neutral.styleContext, 'aucun');
  const neutralStyleAdjustments = neutral.recommendations
    .flatMap(recommendation => recommendation.adjustments)
    .filter(adjustment => adjustment.kind === 'style');
  assert.equal(neutralStyleAdjustments.length, 0, 'aucun écart de style ne doit apparaître sans style déclaré');

  // --- 5. Le signal « résidus » pèse plus lourd sous locks --------------
  const observations = [
    observation({ id: 'o1', ingredientId: 'beurre_karite', signal: 'buildup', valence: -1 }),
    observation({ id: 'o2', ingredientId: 'beurre_karite', signal: 'buildup', valence: -1 })
  ];
  const underLocks = learnIngredientWeights(observations, 'locks').get('beurre_karite')!;
  const underNone = learnIngredientWeights(observations, 'aucun').get('beurre_karite')!;
  assert.ok(
    Math.abs(underLocks.net) > Math.abs(underNone.net),
    `le résidu doit peser davantage sous locks (locks=${underLocks.net}, aucun=${underNone.net})`
  );
  assert.equal(signalWeight('buildup', 'locks'), 2);
  assert.equal(signalWeight('buildup', 'aucun'), 1);
  assert.equal(signalWeight('more_hydration', 'locks'), 1, 'un signal positif ne doit pas être surpondéré');

  // --- 6. Une erreur de catégorie est détectable en tant que telle ------
  const assessment = assessStyleFit(DEFINER, locksProfile());
  assert.equal(assessment.hasCategoryError, true);
  assert.equal(assessStyleFit(CLEANSER, locksProfile()).hasCategoryError, false);

  console.log(
    '[PASS] Adéquation au style : sous locks le nettoyant précède le définisseur, l’erreur de catégorie est nommée, le résidu est signalé avec sa limite, et rien ne change sans style déclaré.'
  );
}

runStyleFitTests().catch(error => {
  console.error('[FAIL] Adéquation au style :', error);
  process.exitCode = 1;
});
