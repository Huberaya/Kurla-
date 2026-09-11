import assert from 'node:assert/strict';
import { buildRecommendations, EngineProduct } from '../src/lib/recommendationEngine';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { assessWigFit, detectStyleContext, OCCLUSION_LIMITATION } from '../src/lib/styleFit';
import { DEFAULT_MAX_WEAR_DAYS, ProtectiveStyleEpisode } from '../src/lib/protectiveStyle';

/**
 * Banc « sous perruque, le moteur nomme l'objet de soin ».
 *
 * Le défaut : `entretenir_perruque` vise la perruque — fibre, lace, colles —
 * tandis que `cuir_chevelu` vise ce qu'il y a dessous, occlus. Le moteur les
 * traitait comme deux besoins équivalents. Recommander un shampooing pour
 * perruque à quelqu'un dont le cuir chevelu démange sous un lace front est une
 * erreur, et l'inverse aussi.
 */

function wigProfile() {
  const profile = createEmptyBeautyProfile();
  profile.hair.protectiveStyles = ['perruque'];
  return profile;
}

function product(partial: Partial<EngineProduct> & { id: string; name: string }): EngineProduct {
  return { slug: partial.id, brand: 'KURLA', price: 20, category: 'cheveux', inStock: true, ...partial } as EngineProduct;
}

const WIG_SHAMPOO = product({
  id: 'wig_shampoo',
  name: 'Shampooing pour perruque et lace',
  needs: ['entretenir_perruque'],
  routineStep: 'cleanse'
});
const SCALP_SERUM = product({
  id: 'scalp_serum',
  name: 'Sérum cuir chevelu apaisant',
  needs: ['apaiser_cuir_chevelu', 'cuir_chevelu'],
  routineStep: 'scalp_treatment'
});
const LEAVE_IN = product({
  id: 'leave_in',
  name: 'Leave-in riche',
  needs: ['hydrater_cheveux'],
  routineStep: 'leave_in'
});
const CURL_DEF = product({
  id: 'curl_def',
  name: 'Gel définition boucles',
  needs: ['definir_boucles'],
  routineStep: 'styling_definer'
});

function episode(partial: Partial<ProtectiveStyleEpisode>): ProtectiveStyleEpisode {
  return {
    id: 'ep-wig',
    userId: 'u1',
    style: 'wig',
    tension: 'normal',
    installedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    maxWearDays: DEFAULT_MAX_WEAR_DAYS.wig,
    signals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial
  } as ProtectiveStyleEpisode;
}

async function runWigTests(): Promise<void> {
  const profile = wigProfile();
  assert.equal(detectStyleContext(profile), 'perruque');

  // --- 1. Les deux objets de soin sont nommés, pas confondus --------------
  const result = buildRecommendations([WIG_SHAMPOO, SCALP_SERUM, LEAVE_IN, CURL_DEF], {
    profile,
    shelf: [],
    observations: []
  });

  const byId = new Map(result.recommendations.map(recommendation => [recommendation.product.id, recommendation]));
  assert.equal(byId.get('wig_shampoo')!.careTarget, 'la perruque');
  assert.equal(byId.get('scalp_serum')!.careTarget, 'le cuir chevelu sous la perruque');
  assert.equal(byId.get('curl_def')!.careTarget, null, 'un définisseur de boucles ne sert aucun des deux objets');

  // Le motif est lisible dans la raison, pas seulement dans un champ interne.
  const wigReason = byId.get('wig_shampoo')!.adjustments.find(adjustment => /perruque elle-même/.test(adjustment.reason));
  assert.ok(wigReason, 'la raison doit dire que le produit s’adresse à la perruque elle-même');
  const scalpReason = byId.get('scalp_serum')!.adjustments.find(adjustment => /cuir chevelu sous la perruque/.test(adjustment.reason));
  assert.ok(scalpReason, 'la raison doit dire que le produit s’adresse au cuir chevelu sous la perruque');

  // --- 2. Occlusion : le mécanisme propre à la perruque -------------------
  const occluded = byId.get('scalp_serum')!.adjustments.find(adjustment => adjustment.limitation === OCCLUSION_LIMITATION);
  assert.ok(occluded, 'un produit laissé sur le cuir chevelu sous perruque doit porter la mise en garde d’occlusion');
  assert.ok(occluded!.delta < 0);
  assert.match(occluded!.reason, /chaud et humide/);

  const leaveInOcclusion = byId.get('leave_in')!.adjustments.find(adjustment => adjustment.limitation === OCCLUSION_LIMITATION);
  assert.ok(leaveInOcclusion, 'un leave-in sous perruque doit porter la mise en garde d’occlusion');

  // Le shampooing pour perruque, rincé, ne la porte pas.
  assert.ok(
    !byId.get('wig_shampoo')!.adjustments.some(adjustment => adjustment.limitation === OCCLUSION_LIMITATION),
    'un produit rincé ne doit pas porter la mise en garde d’occlusion'
  );

  // --- 3. Erreur de catégorie toujours détectée sous perruque -------------
  const categoryError = byId.get('curl_def')!.adjustments.find(adjustment => adjustment.kind === 'style' && adjustment.delta < 0);
  assert.ok(categoryError, 'un définisseur de boucles sous perruque reste une erreur de catégorie');
  assert.match(categoryError!.reason, /ne s'applique pas/);

  // --- 4. La limite de port courte (14 jours) mord vraiment ---------------
  assert.equal(DEFAULT_MAX_WEAR_DAYS.wig, 14);
  const overdueWig = episode({ installedAt: new Date(Date.now() - 20 * 86_400_000).toISOString() });
  const overdueResult = buildRecommendations([WIG_SHAMPOO, SCALP_SERUM], {
    profile,
    shelf: [],
    observations: [],
    protectiveEpisode: overdueWig
  });
  assert.ok(overdueResult.tractionRecommendation, 'une perruque portée 20 jours pour 14 doit produire une recommandation');
  const traction = overdueResult.recommendations
    .find(recommendation => recommendation.product.id === 'scalp_serum')!
    .adjustments
    .filter(adjustment => adjustment.kind === 'traction');
  assert.ok(traction.length > 0 && traction[0].delta > 0, 'le cuir chevelu doit être priorisé quand la perruque dépasse sa durée');

  // --- 5. Sans perruque, rien de tout cela --------------------------------
  const neutral = buildRecommendations([WIG_SHAMPOO, SCALP_SERUM, LEAVE_IN], {
    profile: createEmptyBeautyProfile(),
    shelf: [],
    observations: []
  });
  assert.ok(
    neutral.recommendations.every(recommendation => recommendation.careTarget === undefined || recommendation.careTarget === null),
    'aucun objet de soin « perruque » ne doit apparaître sans perruque déclarée'
  );
  assert.equal(
    neutral.recommendations
      .flatMap(recommendation => recommendation.adjustments)
      .filter(adjustment => adjustment.limitation === OCCLUSION_LIMITATION).length,
    0,
    'aucune mise en garde d’occlusion sans perruque'
  );
  assert.equal(assessWigFit(SCALP_SERUM as any, createEmptyBeautyProfile()).careTarget, null);

  console.log(
    '[PASS] Perruque : la perruque et le cuir chevelu dessous sont nommés séparément, l’occlusion est signalée avec sa limite, la durée de port de 14 jours mord, et rien ne change sans perruque.'
  );
}

runWigTests().catch(error => {
  console.error('[FAIL] Perruque :', error);
  process.exitCode = 1;
});
