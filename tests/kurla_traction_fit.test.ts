import assert from 'node:assert/strict';
import { buildRecommendations, EngineProduct } from '../src/lib/recommendationEngine';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { assessTractionRisk, ProtectiveStyleEpisode } from '../src/lib/protectiveStyle';
import { styleContextOf, isOpenEpisode, assessOpenEpisode } from '../src/lib/styleFit';

/**
 * Banc « le risque de traction influence enfin une recommandation ».
 *
 * Constat à l'origine du chantier B : `assessTractionRisk` était entièrement
 * écrit — durée pondérée par la tension, signaux d'escalade, protocole de
 * récupération, limites explicites — et la table
 * `public.protective_style_episodes` était déjà écrite et lue par
 * `intelligenceStore`. Vérifié par grep : le modèle n'était importé par
 * **aucun** moteur de recommandation. Le branchement seul manquait.
 */

function braidsProfile() {
  const profile = createEmptyBeautyProfile();
  profile.hair.protectiveStyles = ['tresses'];
  return profile;
}

function product(partial: Partial<EngineProduct> & { id: string; name: string }): EngineProduct {
  return { slug: partial.id, brand: 'KURLA', price: 20, category: 'cheveux', inStock: true, ...partial } as EngineProduct;
}

const SOOTHING = product({
  id: 'soothing',
  name: 'Sérum apaisant cuir chevelu',
  needs: ['apaiser_cuir_chevelu', 'cuir_chevelu'],
  routineStep: 'scalp_treatment'
});
const DEFINER = product({
  id: 'definer',
  name: 'Gel définition forte',
  needs: ['entretenir_tresses'],
  routineStep: 'styling_definer'
});

function episode(partial: Partial<ProtectiveStyleEpisode>): ProtectiveStyleEpisode {
  return {
    id: 'ep1',
    userId: 'u1',
    style: 'braids',
    tension: 'normal',
    installedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    maxWearDays: 56,
    signals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial
  } as ProtectiveStyleEpisode;
}

function run(label: string, episodeArg: ProtectiveStyleEpisode | undefined) {
  return buildRecommendations([SOOTHING, DEFINER], {
    profile: braidsProfile(),
    shelf: [],
    observations: [],
    protectiveEpisode: episodeArg
  });
}

function tractionDeltas(result: ReturnType<typeof run>, productId: string): number {
  return result.recommendations
    .find(recommendation => recommendation.product.id === productId)!
    .adjustments
    .filter(adjustment => adjustment.kind === 'traction')
    .reduce((sum, adjustment) => sum + adjustment.delta, 0);
}

async function runTractionTests(): Promise<void> {
  // --- 1. Le modèle lui-même : un épisode récent et peu serré est bénin ---
  const benign = episode({ installedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(), tension: 'loose' });
  const benignRisk = assessTractionRisk(benign);
  assert.equal(benignRisk.riskLevel, 'low');
  assert.equal(benignRisk.escalationRequired, false);

  // --- 2. Tension serrée + dépassement : risque élevé --------------------
  const overdue = episode({
    installedAt: new Date(Date.now() - 70 * 86_400_000).toISOString(),
    tension: 'tight'
  });
  const overdueRisk = assessTractionRisk(overdue);
  assert.ok(['elevated', 'high'].includes(overdueRisk.riskLevel), `risque attendu élevé, obtenu ${overdueRisk.riskLevel}`);

  // --- 3. Un signal d'escalade force le niveau haut et la consultation ---
  const alarming = episode({ signals: ['pain', 'hairline_thinning'] });
  const alarmingRisk = assessTractionRisk(alarming);
  assert.equal(alarmingRisk.riskLevel, 'high');
  assert.equal(alarmingRisk.escalationRequired, true);
  assert.match(alarmingRisk.recommendation, /consultez un professionnel/);

  // --- 4. Le branchement : le risque déplace la priorité -----------------
  const benignResult = run('bénin', benign);
  const overdueResult = run('dépassé', overdue);

  // Le modèle conseille toujours, même en régime bénin : c'est voulu. Ce qui
  // change, c'est le niveau de risque et donc les écarts de classement.
  assert.ok(benignResult.tractionRecommendation, 'un épisode ouvert doit produire un conseil, même bénin');
  assert.ok(!/consultez un professionnel/.test(benignResult.tractionRecommendation!),
    'un épisode bénin ne doit pas appeler à consulter');
  assert.ok(overdueResult.tractionRecommendation, 'un épisode à risque doit produire une recommandation');
  assert.notEqual(benignResult.tractionRecommendation, overdueResult.tractionRecommendation,
    'le conseil doit différer selon le niveau de risque');

  const soothingBenign = tractionDeltas(benignResult, 'soothing');
  const soothingOverdue = tractionDeltas(overdueResult, 'soothing');
  assert.ok(
    soothingOverdue > soothingBenign,
    `l'apaisant doit être mieux classé sous risque (${soothingOverdue}) qu'en régime bénin (${soothingBenign})`
  );

  const definerOverdue = tractionDeltas(overdueResult, 'definer');
  assert.ok(definerOverdue < 0, `le gel définition doit être pénalisé sous risque, obtenu ${definerOverdue}`);
  assert.equal(tractionDeltas(benignResult, 'definer'), 0, 'aucune pénalité en régime bénin');

  // --- 5. Les limites du modèle sont remontées, pas masquées --------------
  assert.ok(overdueResult.tractionLimitations.length > 0, 'sans ressenti renseigné, la limite doit être dite');
  assert.match(overdueResult.tractionLimitations[0], /Aucun ressenti renseigné/);

  // La recommandation prime sur le classement : elle figure dans le résumé.
  assert.ok(overdueResult.summary.includes(overdueResult.tractionRecommendation!),
    'la recommandation de traction doit apparaître dans le résumé');

  // --- 6. Épisode clos : le passé ne dit rien du présent ------------------
  const closed = episode({ removedAt: new Date().toISOString() });
  assert.equal(isOpenEpisode(closed), false);
  const closedResult = run('clos', closed);
  assert.equal(closedResult.tractionRecommendation, undefined, 'un épisode clos ne doit produire aucun conseil');
  const closedDeltas = closedResult.recommendations
    .flatMap(recommendation => recommendation.adjustments)
    .filter(adjustment => adjustment.kind === 'traction');
  assert.equal(closedDeltas.length, 0, 'un épisode clos ne doit produire aucun écart de traction');

  // --- 7. Aucun épisode : rien ne change ----------------------------------
  const noneResult = run('aucun', undefined);
  assert.equal(noneResult.tractionRecommendation, undefined);
  assert.equal(
    noneResult.recommendations.flatMap(recommendation => recommendation.adjustments).filter(a => a.kind === 'traction').length,
    0
  );

  // --- 8. Cohérence du mapping style → contexte --------------------------
  assert.equal(styleContextOf('locs'), 'locks');
  assert.equal(styleContextOf('braids'), 'tresses');
  assert.equal(styleContextOf('knotless_braids'), 'tresses');
  assert.equal(styleContextOf('wig'), 'perruque');
  assert.equal(styleContextOf('buns'), 'autre_protege');
  assert.equal(assessOpenEpisode(SOOTHING as any, undefined), null);

  console.log(
    '[PASS] Risque de traction : branché au moteur, il déplace la priorité vers le cuir chevelu, pénalise la manipulation, impose la consultation sur signal d’alerte, et se tait sur un épisode clos ou absent.'
  );
}

runTractionTests().catch(error => {
  console.error('[FAIL] Risque de traction :', error);
  process.exitCode = 1;
});
