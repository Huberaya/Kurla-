import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

import {
  bestEvidenceFor,
  checkJurisdiction,
  detectFunctionalDuplicates,
  findConflicts,
  inciPositionNote,
  isKnownInciName,
  normalizeInciName,
  resolveIngredient,
  sortByInciRank,
  Ingredient,
  IngredientEvidence
} from '../src/lib/ingredientGraph';
import {
  DEFAULT_K_ANONYMITY_THRESHOLD,
  deriveArchetype,
  evaluateCohort,
  fallbackCohortDimensions,
  relaxArchetypeKey,
  specificityOf
} from '../src/lib/archetype';
import {
  analyseCoverage,
  buildShelfVerdict,
  deriveAvoidedIngredients,
  evaluateReplenishment,
  findGaps,
  findSurplus,
  summarizeAbandonments,
  ShelfItem
} from '../src/lib/shelf';
import {
  buildDailyTasks,
  buildWashDayPlan,
  WASH_DAY_STEP_ORDER
} from '../src/lib/washDay';
import {
  assessTractionRisk,
  buildRecoveryProtocol,
  defaultMaxWearDays,
  summarizeTractionHistory,
  ProtectiveStyleEpisode
} from '../src/lib/protectiveStyle';
import {
  aggregateOutcomes,
  computeArchetypeRating,
  readAggregate,
  valenceOf,
  OutcomeObservation
} from '../src/lib/outcomeEvidence';
import {
  returnInsightPrompt,
  summarizeReturnInsights,
  ReturnInsightRecord
} from '../src/lib/returnInsight';
import {
  canDisplayEndorsement,
  endorsementDisclaimer,
  handleContradiction,
  summarizeEndorsements,
  ProfessionalEndorsement
} from '../src/lib/proEndorsement';
import { AI_GUARDRAILS, AI_TRANSPARENCY } from '../src/lib/ai/guardrails';
import { intelligenceStore } from '../src/lib/intelligenceStore';
import { resolveRoute } from '../src/lib/routeTable';
import { createEmptyBeautyProfile } from '../src/lib/beautyProfile';
import { readServerSources } from './support/serverSources';

const NOW = new Date('2026-08-27T09:00:00.000Z');

function shelfItem(partial: Partial<ShelfItem> & { id: string }): ShelfItem {
  return {
    userId: 'shelf-user',
    status: 'in_use',
    ingredientIds: [],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...partial
  } as ShelfItem;
}

function episode(partial: Partial<ProtectiveStyleEpisode> & { id: string }): ProtectiveStyleEpisode {
  return {
    userId: 'style-user',
    style: 'braids',
    tension: 'normal',
    installedAt: '2026-07-01T09:00:00.000Z',
    maxWearDays: defaultMaxWearDays('braids'),
    signals: [],
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...partial
  } as ProtectiveStyleEpisode;
}

function observation(partial: Partial<OutcomeObservation> & { id: string; ingredientId: string; archetypeId: string; signal: OutcomeObservation['signal'] }): OutcomeObservation {
  return {
    userId: 'outcome-user',
    valence: valenceOf(partial.signal),
    isConsentShared: true,
    observedAt: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    ...partial
  } as OutcomeObservation;
}

function endorsement(partial: Partial<ProfessionalEndorsement> & { id: string }): ProfessionalEndorsement {
  return {
    professionalId: 'pro-1',
    professionalName: 'Aminata D.',
    professionalVerified: true,
    clientUserId: 'client-1',
    stance: 'approved',
    rationale: 'Routine cohérente avec la porosité déclarée.',
    amendments: [],
    isDisplayable: true,
    clientConsentAt: NOW.toISOString(),
    createdAt: NOW.toISOString(),
    ...partial
  } as ProfessionalEndorsement;
}

async function runKurlaIntelligenceTests() {
  const migrationSource = await readFile(new URL('../supabase/migrations/20260845000000_kurla_intelligence_foundation.sql', import.meta.url), 'utf8');
  const migrationWashDaySource = await readFile(new URL('../supabase/migrations/20260846000000_wash_day_cycle.sql', import.meta.url), 'utf8');
  const professionalsPageSource = await readFile(new URL('../src/pages/ProfessionalsPage.tsx', import.meta.url), 'utf8');
  const assistantPageSource = await readFile(new URL('../src/pages/AiBeautyAssistantPage.tsx', import.meta.url), 'utf8');
  const serverSource = await readServerSources();

  // ---------- Action 5/6 : le graphe de connaissances existe ----------
  for (const table of [
    'public.ingredients', 'public.product_ingredients', 'public.ingredient_evidence',
    'public.ingredient_incompatibilities', 'public.ingredient_jurisdiction_restrictions',
    'public.archetypes', 'public.user_archetypes', 'public.user_products',
    'public.outcome_observations', 'public.ingredient_archetype_outcomes',
    'public.protective_style_episodes', 'public.professional_endorsements',
    'public.kurla_taxonomy_terms'
  ]) {
    assert.ok(migrationSource.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `La migration doit créer ${table}.`);
  }
  assert.ok(migrationSource.includes('ENABLE ROW LEVEL SECURITY'), 'Les nouvelles tables doivent activer la RLS.');
  assert.ok(
    migrationSource.includes('observation_count >= k_anonymity_threshold'),
    'La publication d’un agrégat doit être conditionnée au seuil de k-anonymité.'
  );
  assert.ok(
    migrationSource.includes('is_consent_shared = FALSE OR note IS NULL'),
    'Une observation partagée ne doit pas conserver de note libre.'
  );

  // ---------- Action 2 : plus de faux professionnels en production ----------
  assert.ok(!professionalsPageSource.includes("from '../data/mockData'"), 'L’annuaire ne doit plus importer de données fictives.');
  assert.ok(!/MOCK_PROS\s*\}/.test(professionalsPageSource), 'L’annuaire ne doit plus consommer la liste de professionnels fictifs.');
  assert.ok(professionalsPageSource.includes('/api/professionals'), 'L’annuaire doit lire l’API des professionnels vérifiés.');
  assert.ok(serverSource.includes("app.get('/api/professionals'"), 'Le serveur doit exposer l’annuaire vérifié.');

  // ---------- Action 1 : disclosure IA (AI Act art. 50(1)) ----------
  assert.ok(assistantPageSource.includes('assistant d’intelligence artificielle'), 'L’UI doit informer que l’interlocuteur est une IA.');
  assert.ok(assistantPageSource.includes('Réponse générée par une intelligence artificielle'), 'Chaque réponse doit porter son marquage.');
  assert.ok(serverSource.includes('aiDisclosure'), 'Le serveur doit renvoyer la divulgation avec chaque réponse.');
  assert.ok(AI_TRANSPARENCY.disclosure.includes('intelligence artificielle'), 'La divulgation doit nommer explicitement l’IA.');

  // ---------- Action 17 : triage médical unifié, par racines ----------
  // Ces trois formulations ne déclenchaient RIEN avec l'ancienne liste de
  // phrases exactes. C'est précisément le trou de couverture à refermer.
  for (const phrase of ['je n’arrive plus à respirer', 'j’ai la gorge qui gonfle', 'difficulté à respirer']) {
    const result = AI_GUARDRAILS.triage(phrase);
    assert.equal(result.emergency, true, `« ${phrase} » doit déclencher l’urgence.`);
    assert.ok(result.message.includes('15') && result.message.includes('112'), 'Le message d’urgence doit citer le 15 et le 112.');
  }
  assert.equal(AI_GUARDRAILS.triage('mes cheveux tombent par poignées depuis 3 semaines').review, true, 'Une chute brutale doit orienter vers un professionnel.');
  assert.equal(AI_GUARDRAILS.triage('je suis enceinte, puis-je utiliser un rétinoïde ?').review, true, 'La grossesse doit orienter vers un professionnel.');
  const benign = AI_GUARDRAILS.triage('quelle routine pour hydrater mes boucles ?');
  assert.equal(benign.emergency, false, 'Une question cosmétique courante ne doit pas déclencher l’urgence.');
  assert.equal(benign.review, false, 'Une question cosmétique courante ne doit pas déclencher d’alerte médicale.');
  assert.ok(
    !serverSource.includes("const emergencyTerms = ['difficulté à respirer'"),
    'Le serveur ne doit plus maintenir sa propre liste divergente.'
  );

  // ---------- Graphe d'ingrédients ----------
  assert.equal(normalizeInciName('  Butyrospermum Parkii (Shea) Butter  '), 'butyrospermum parkii shea butter');
  assert.equal(normalizeInciName('Glycérine'), normalizeInciName('glycerine'), 'Les accents ne doivent pas créer deux ingrédients.');
  assert.equal(normalizeInciName('ab'), 'ab', 'La normalisation ne juge pas : elle transforme.');
  assert.equal(isKnownInciName('ab'), false, 'Une mention trop courte n’est pas un INCI exploitable.');
  assert.equal(isKnownInciName('Glycérine'), true);

  const catalog: Ingredient[] = [
    { id: 'glycerin', inciName: 'Glycerin', inciNameNormalized: 'glycerin', commonNames: ['Glycérine'], functions: ['humectant'], isAllergenRegulated: false, verificationStatus: 'verified' },
    { id: 'shea', inciName: 'Butyrospermum Parkii Butter', inciNameNormalized: 'butyrospermum parkii butter', commonNames: ['Beurre de karité', 'Shea Butter'], functions: ['emollient'], isAllergenRegulated: false, verificationStatus: 'verified' }
  ];
  assert.equal(resolveIngredient('Glycérine', catalog)?.id, 'glycerin', 'Un nom usuel doit résoudre vers l’entité.');
  assert.equal(resolveIngredient('Shea Butter', catalog)?.id, 'shea', 'Un synonyme doit résoudre vers l’entité.');
  assert.equal(resolveIngredient('Huile magique inconnue', catalog), null, 'Une mention non résolue doit renvoyer null, jamais une approximation.');

  const ranked = sortByInciRank([
    { productId: 'p1', ingredientId: 'shea', inciRank: 4, isKeyIngredient: false, source: 'inci_label' as const },
    { productId: 'p1', ingredientId: 'glycerin', inciRank: 2, isKeyIngredient: true, source: 'inci_label' as const }
  ]);
  assert.equal(ranked[0].ingredientId, 'glycerin', 'Le tri doit suivre l’ordre INCI.');
  assert.match(inciPositionNote(ranked[0], 8), /concentration probablement élevée/);

  const conflicts = findConflicts(['retinol', 'aha', 'glycerin'], [
    { ingredientA: 'retinol', ingredientB: 'aha', severity: 'space_out', explanation: 'Cumul irritant.', evidenceLevel: 'B' },
    { ingredientA: 'retinol', ingredientB: 'benzoyl', severity: 'avoid', explanation: 'Irritation majeure.', evidenceLevel: 'A' }
  ]);
  assert.equal(conflicts.length, 1, 'Seule la paire réellement présente doit remonter.');
  assert.equal(conflicts[0].ingredientB, 'aha');

  const jurisdiction = checkJurisdiction(['hydroquinone', 'glycerin'], [
    { ingredientId: 'hydroquinone', jurisdiction: 'EU', status: 'prohibited', reference: 'Règl. 1223/2009 annexe II' },
    { ingredientId: 'glycerin', jurisdiction: 'EU', status: 'allowed' }
  ], 'eu');
  assert.equal(jurisdiction.length, 1, 'Un ingrédient autorisé ne doit pas produire d’alerte.');
  assert.equal(jurisdiction[0].status, 'prohibited');
  assert.match(jurisdiction[0].message, /interdit/);

  const duplicates = detectFunctionalDuplicates(
    { id: 'a', ingredientIds: ['glycerin', 'shea', 'water'] },
    { id: 'b', ingredientIds: ['glycerin', 'shea', 'panthenol'] }
  );
  assert.equal(duplicates.duplicate, true, 'Deux produits partageant l’essentiel de leur formule sont des doublons fonctionnels.');
  assert.deepEqual(duplicates.shared.sort(), ['glycerin', 'shea']);

  const evidences: IngredientEvidence[] = [
    { id: 'e1', ingredientId: 'glycerin', claim: 'Hydrate', evidenceLevel: 'B', populationsStudied: ['peau claire'], textureScope: ['wavy'], toneScope: ['light'], climateScope: [], sourceKind: 'peer_reviewed' },
    { id: 'e2', ingredientId: 'glycerin', claim: 'Hydrate en climat sec', evidenceLevel: 'C', populationsStudied: [], textureScope: ['kinky'], toneScope: ['deep'], climateScope: ['dry'], sourceKind: 'consensus' }
  ];
  const matched = bestEvidenceFor(evidences, { textureBand: 'kinky', toneBand: 'deep', climate: 'dry' });
  assert.equal(matched.evidence?.id, 'e2', 'Une preuve transposable doit primer sur une preuve plus forte mais hors périmètre.');
  const offScope = bestEvidenceFor(evidences, { textureBand: 'coily', toneBand: 'medium' });
  assert.equal(offScope.transposable, false, 'Une preuve obtenue hors périmètre doit être marquée non transposable.');
  assert.ok(offScope.caveat, 'Une preuve non transposable doit produire une réserve explicite.');

  // ---------- Archétypes et k-anonymité ----------
  const profile = createEmptyBeautyProfile();
  profile.hair.curlPattern = '4c';
  profile.hair.porosity = 'faible';
  profile.hair.density = 'forte';
  profile.skin.toneDepth = 'fonce';
  profile.environment.climate = 'sec';
  const derived = deriveArchetype(profile);
  assert.equal(derived.key.hairTextureBand, 'kinky', 'Un 4C doit être classé kinky.');
  assert.equal(derived.key.porosityBand, 'low');
  assert.equal(derived.key.toneDepthBand, 'deep');
  assert.equal(derived.key.climateBand, 'dry');
  assert.equal(derived.knownDimensions, 5, 'La sensibilité non renseignée doit rester manquante.');
  assert.ok(derived.missingLabels.includes('sensibilité cutanée'), 'Un champ manquant doit être nommé, pas comblé.');

  const emptyProfile = deriveArchetype(createEmptyBeautyProfile());
  assert.equal(emptyProfile.knownDimensions, 0, 'Un profil vide ne doit produire aucune dimension inventée.');
  assert.equal(emptyProfile.confidence, 0);

  const tooSmall = evaluateCohort('kinky__low__high__deep__unclassified__dry', 'Cohorte test', 12);
  assert.equal(tooSmall.publishable, false, 'Sous le seuil k, rien ne doit être publié.');
  assert.ok(tooSmall.suppressionReason?.includes('identifiable'), 'La suppression doit être expliquée.');
  const largeEnough = evaluateCohort('arch', 'Cohorte test', DEFAULT_K_ANONYMITY_THRESHOLD);
  assert.equal(largeEnough.publishable, true, 'Au seuil exact, la cohorte est publiable.');

  const relaxable = fallbackCohortDimensions();
  assert.equal(relaxable[0], 'climateBand', 'Le climat est la dimension la moins déterminante à relâcher en premier.');
  assert.ok(!relaxable.includes('hairTextureBand'), 'La texture ne doit jamais être relâchée : c’est le cœur de la spécificité KURLA.');
  const relaxed = relaxArchetypeKey(derived.key, 'climateBand');
  assert.equal(relaxed.climateBand, 'unclassified');
  assert.equal(specificityOf(relaxed), specificityOf(derived.key) - 1);

  // ---------- KURLA Shelf ----------
  const shelf = [
    shelfItem({ id: 's1', routineStep: 'cleanse', freeLabel: 'Shampooing doux' }),
    shelfItem({ id: 's2', routineStep: 'condition', freeLabel: 'Après-shampooing' }),
    shelfItem({ id: 's3', routineStep: 'leave_in', freeLabel: 'Leave-in A' }),
    shelfItem({ id: 's4', routineStep: 'leave_in', freeLabel: 'Leave-in B', status: 'owned' })
  ];
  const requiredSteps = ['cleanse', 'condition', 'leave_in', 'seal_oil'] as const;
  const coverage = analyseCoverage(shelf, requiredSteps);
  assert.equal(coverage.find(item => item.routineStep === 'seal_oil')?.covered, false);
  assert.equal(coverage.find(item => item.routineStep === 'leave_in')?.surplusCount, 1, 'Deux leave-in ouverts constituent un surplus.');

  const gaps = findGaps(shelf, requiredSteps);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].routineStep, 'seal_oil');

  const surplus = findSurplus(shelf, requiredSteps);
  assert.equal(surplus.length, 1);
  assert.match(surplus[0].message, /Terminez-en un avant/);

  const fullShelf = [...shelf, shelfItem({ id: 's5', routineStep: 'seal_oil', freeLabel: 'Huile' })];
  const verdict = buildShelfVerdict(fullShelf, requiredSteps);
  assert.equal(verdict.needsPurchase, false, 'Une étagère complète ne doit pas déclencher d’achat.');
  assert.match(verdict.message, /rien à acheter/, 'KURLA doit savoir dire « tu n’as rien à acheter ».');

  const criticalGapShelf = [shelfItem({ id: 's1', routineStep: 'condition', freeLabel: 'Après-shampooing' })];
  const criticalVerdict = buildShelfVerdict(criticalGapShelf, requiredSteps);
  assert.equal(criticalVerdict.needsPurchase, true, 'L’absence d’étape critique doit déclencher un besoin.');

  const abandonments = summarizeAbandonments([
    shelfItem({ id: 'a1', status: 'abandoned', abandonmentReason: 'too_heavy', ingredientIds: ['shea'] }),
    shelfItem({ id: 'a2', status: 'abandoned', abandonmentReason: 'too_heavy', ingredientIds: ['shea', 'castor'] }),
    shelfItem({ id: 'a3', status: 'abandoned', abandonmentReason: 'changed_mind', ingredientIds: ['glycerin'] })
  ]);
  assert.equal(abandonments[0].reason, 'too_heavy', 'Le motif dominant doit remonter en premier.');
  assert.equal(abandonments[0].count, 2);

  // 'changed_mind' n'est pas un signal formulation : il ne doit pas écarté d'ingrédient.
  const avoided = deriveAvoidedIngredients([
    shelfItem({ id: 'a1', status: 'abandoned', abandonmentReason: 'reaction', ingredientIds: ['fragrance_x'] }),
    shelfItem({ id: 'a2', status: 'abandoned', abandonmentReason: 'reaction', ingredientIds: ['fragrance_x'] }),
    shelfItem({ id: 'a3', status: 'abandoned', abandonmentReason: 'changed_mind', ingredientIds: ['glycerin'] })
  ]);
  assert.equal(avoided.length, 1, 'Un motif non lié à la formulation ne doit pas écarter d’ingrédient.');
  assert.equal(avoided[0].ingredientId, 'fragrance_x');
  assert.equal(avoided[0].occurrences, 2);

  const replenishment = evaluateReplenishment(shelfItem({ id: 's1', freeLabel: 'Shampooing', estimatedRemainingPercent: 15 }), { weeklyUsagePercent: 10, now: NOW });
  assert.equal(replenishment.shouldNotify, true);
  assert.equal(replenishment.daysUntilEmpty, 11, '15 % restant à 10 %/semaine = 10,5 jours, arrondi à 11.');
  const unknownUsage = evaluateReplenishment(shelfItem({ id: 's2', freeLabel: 'Masque', estimatedRemainingPercent: null }), { weeklyUsagePercent: 0, now: NOW });
  assert.equal(unknownUsage.shouldNotify, false, 'Sans rythme connu, KURLA ne doit pas inventer de date.');
  assert.match(unknownUsage.message, /ne peut pas estimer/);

  // ---------- Wash Day OS ----------
  const washPlan = buildWashDayPlan({
    cycle: { intervalDays: 7, lastWashDayAt: '2026-08-20T09:00:00.000Z', deepConditionEveryNWashDays: 1, proteinEveryNWashDays: 4 },
    humidityPercent: 28,
    now: NOW
  });
  assert.equal(washPlan.daysSinceLastWashDay, 7);
  assert.equal(washPlan.isOverdue, true, 'À 7 jours pour un intervalle de 7, le wash day est dû.');
  assert.ok(washPlan.tasks.some(task => task.step === 'pre_poo'), 'Une humidité à 28 % doit déclencher un pré-poo.');
  assert.ok(washPlan.tasks.every(task => task.reason.length > 0), 'Chaque tâche doit expliquer pourquoi elle est là.');
  assert.deepEqual(
    washPlan.tasks.map(task => task.step),
    [...washPlan.tasks.map(task => task.step)].sort((a, b) => WASH_DAY_STEP_ORDER.indexOf(a) - WASH_DAY_STEP_ORDER.indexOf(b)),
    'Les tâches doivent suivre l’ordre réel du wash day.'
  );

  const humidPlan = buildWashDayPlan({
    cycle: { intervalDays: 14, lastWashDayAt: '2026-08-20T09:00:00.000Z', deepConditionEveryNWashDays: 2, proteinEveryNWashDays: null },
    humidityPercent: 78,
    now: NOW
  });
  assert.ok(!humidPlan.tasks.some(task => task.step === 'pre_poo'), 'Sans signal, le pré-poo ne doit pas être ajouté systématiquement.');
  assert.ok(!humidPlan.tasks.some(task => task.step === 'protein_treatment'), 'Un soin protéiné désactivé ne doit pas être planifié.');
  assert.ok(!humidPlan.tasks.some(task => task.step === 'deep_condition'), 'Le masque suit sa propre fréquence, pas celle du wash day.');
  assert.ok(humidPlan.adaptationNotes.some(note => note.includes('Humidité à 78')), 'Le contexte humide doit produire une explication.');

  const dailyUnderProtective = buildDailyTasks({ protectiveStyleActive: true, nightProtection: 'bonnet' });
  assert.equal(dailyUnderProtective.length, 1, 'Sous coiffure protectrice, le quotidien doit rester minimal.');

  // ---------- Timeline de coiffure protectrice ----------
  const recentEpisode = episode({ id: 'e-recent', installedAt: '2026-08-20T09:00:00.000Z' });
  const recentRisk = assessTractionRisk(recentEpisode, NOW);
  assert.equal(recentRisk.riskLevel, 'low');
  assert.equal(recentRisk.wearDays, 7);

  const overdueEpisode = episode({ id: 'e-overdue', installedAt: '2026-06-01T09:00:00.000Z' });
  const overdueRisk = assessTractionRisk(overdueEpisode, NOW);
  assert.equal(overdueRisk.riskLevel, 'high', '87 jours pour un maximum de 56 doit être élevé.');

  const painfulEpisode = episode({ id: 'e-pain', installedAt: '2026-08-24T09:00:00.000Z', signals: ['pain', 'crusts'] });
  const painfulRisk = assessTractionRisk(painfulEpisode, NOW);
  assert.equal(painfulRisk.escalationRequired, true, 'Douleur et croûtes exigent une orientation professionnelle, pas un conseil d’entretien.');
  assert.match(painfulRisk.recommendation, /consultez un professionnel/);
  assert.ok(painfulRisk.limitations.length === 0, 'Avec des signaux renseignés, aucune limitation de données ne doit être affichée.');

  const tightEpisode = episode({ id: 'e-tight', installedAt: '2026-07-20T09:00:00.000Z', tension: 'tight' });
  const tightRisk = assessTractionRisk(tightEpisode, NOW);
  assert.equal(tightRisk.tensionFactor, 2, 'Une tension « tight » double le vieillissement effectif.');
  assert.ok(tightRisk.wearRatio > 1, 'La tension doit faire dépasser la limite avant la durée maximale.');

  const history = summarizeTractionHistory([
    episode({ id: 'h1', installedAt: '2026-05-01T09:00:00.000Z', removedAt: '2026-06-26T09:00:00.000Z', signals: ['pain'] }),
    episode({ id: 'h2', installedAt: '2026-07-01T09:00:00.000Z', removedAt: '2026-08-26T09:00:00.000Z', signals: ['pain', 'hairline_thinning'] })
  ], NOW);
  assert.equal(history.episodeCount, 2);
  assert.ok(history.recurringSignals.some(item => item.signal === 'pain' && item.count === 2), 'Un signal répété sur deux poses doit être identifié.');
  assert.match(history.pattern, /avis professionnel/, 'Un signal d’alerte récurrent doit orienter vers un professionnel.');

  const emptyHistory = summarizeTractionHistory([], NOW);
  assert.equal(emptyHistory.episodeCount, 0);
  assert.match(emptyHistory.pattern, /ne déduit rien d’un historique vide/, 'KURLA ne doit rien déduire d’un historique vide.');

  const recovery = buildRecoveryProtocol(painfulRisk);
  assert.ok(recovery.length > 0, 'Un risque élevé doit produire un protocole de récupération.');
  assert.ok(recovery.every(step => !/pousse|repousse garantie/i.test(step.label)), 'Aucune repousse ne doit être promise.');
  assert.equal(buildRecoveryProtocol(recentRisk).length, 0, 'Un risque faible ne nécessite aucun protocole.');

  // ---------- Outcome evidence : le MOAT ----------
  const consented: OutcomeObservation[] = Array.from({ length: 32 }, (_, index) => observation({
    id: `o-${index}`,
    ingredientId: 'glycerin',
    archetypeId: 'kinky__low__high__deep__unclassified__dry',
    signal: index < 24 ? 'more_hydration' : 'product_heavy',
    climateContext: 'dry',
    observedAfterDays: index % 2 === 0 ? 14 : 21
  }));
  const aggregate = aggregateOutcomes(consented, { now: NOW })[0];
  assert.equal(aggregate.observationCount, 32);
  assert.equal(aggregate.positiveCount, 24);
  assert.equal(aggregate.negativeCount, 8);
  assert.equal(aggregate.medianDaysToResult, 18);
  assert.equal(aggregate.isPublishable, true);

  const noConsent = aggregateOutcomes(consented.map(item => ({ ...item, isConsentShared: false })), { now: NOW });
  assert.equal(noConsent.length, 0, 'Sans consentement explicite, aucune statistique partagée ne peut être produite.');

  const belowThreshold = aggregateOutcomes(consented.slice(0, 5), { now: NOW })[0];
  assert.equal(belowThreshold.isPublishable, false, 'Sous le seuil k, l’agrégat ne doit pas être publiable.');

  const publishedReading = readAggregate(aggregate, { ingredientLabel: 'Glycérine', archetypeLabel: 'cheveux crépus · porosité faible', climateLabel: 'sec' });
  assert.equal(publishedReading.publishable, true);
  assert.match(publishedReading.statement, /75 % de retours favorables/);
  assert.match(publishedReading.statement, /18 jour/);
  assert.ok(publishedReading.limitations.some(limit => limit.includes('non contrôlées')), 'Une observation déclarative ne doit pas être présentée comme un essai clinique.');

  const suppressedReading = readAggregate(belowThreshold, { ingredientLabel: 'Glycérine', archetypeLabel: 'cheveux crépus' });
  assert.equal(suppressedReading.publishable, false);
  assert.match(suppressedReading.statement, /ne dispose pas encore d’assez d’observations/, 'Sous le seuil, KURLA doit dire qu’elle ne sait pas.');
  assert.ok(suppressedReading.limitations.some(limit => limit.includes('n’est pas une preuve'), 'L’absence de donnée ne doit pas être lue comme une innocuité.'));

  const sharedRating = computeArchetypeRating('prod-1', 'arch-1', 'crépus · porosité faible', [5, 4, 5, 4, 5]);
  assert.equal(sharedRating.publishable, true);
  assert.equal(sharedRating.rating, 4.6);
  const thinRating = computeArchetypeRating('prod-1', 'arch-2', 'bouclés', [5, 4]);
  assert.equal(thinRating.publishable, false, 'Une note sur 2 avis ne doit pas être affichée.');
  assert.equal(thinRating.rating, null);

  // ---------- Intelligence des retours ----------
  const returns: ReturnInsightRecord[] = [
    { returnId: 'r1', orderId: 'o1', productId: 'prod-1', archetypeId: 'arch-1', reason: 'too_heavy', textureMismatch: false, isShared: true, createdAt: NOW.toISOString() },
    { returnId: 'r2', orderId: 'o2', productId: 'prod-1', archetypeId: 'arch-1', reason: 'too_heavy', textureMismatch: false, isShared: true, createdAt: NOW.toISOString() },
    { returnId: 'r3', orderId: 'o3', productId: 'prod-1', archetypeId: 'arch-1', reason: 'too_heavy', textureMismatch: false, isShared: true, createdAt: NOW.toISOString() },
    { returnId: 'r4', orderId: 'o4', productId: 'prod-1', archetypeId: 'arch-1', reason: 'fragrance', textureMismatch: false, isShared: true, createdAt: NOW.toISOString() },
    { returnId: 'r5', orderId: 'o5', productId: 'prod-1', archetypeId: 'arch-1', reason: 'damaged', textureMismatch: false, isShared: true, createdAt: NOW.toISOString() },
    { returnId: 'r6', orderId: 'o6', productId: 'other', archetypeId: 'arch-1', reason: 'too_heavy', textureMismatch: false, isShared: true, createdAt: NOW.toISOString() }
  ];
  const returnSummary = summarizeReturnInsights('prod-1', returns, { minimumInformative: 4 });
  assert.equal(returnSummary.totalReturns, 5, 'Les retours d’un autre produit ne doivent pas être comptés.');
  assert.equal(returnSummary.informativeReturns, 4, 'Un colis endommagé n’apprend rien sur la formulation.');
  assert.equal(returnSummary.topReasons[0].reason, 'too_heavy');
  assert.ok(returnSummary.catalogAlert?.includes('arch-1'), 'Une concentration sur un archétype doit alerter sur la mention « pour qui ».');
  assert.ok(returnSummary.limitations.some(limit => limit.includes('Volume vendu')), 'Un nombre de retours sans base de comparaison doit être signalé comme non interprétable.');

  const tooFew = summarizeReturnInsights('prod-1', returns.slice(0, 1));
  assert.equal(tooFew.catalogAlert, undefined, 'Un retour unique ne doit produire aucune conclusion produit.');

  assert.equal(returnInsightPrompt().options.length, 10, 'Le formulaire doit rester court : un formulaire long détruit la donnée.');

  // ---------- Co-signature professionnelle ----------
  assert.equal(canDisplayEndorsement({ professionalVerified: true, isDisplayable: true, clientConsentAt: NOW.toISOString() }).allowed, true);
  assert.equal(canDisplayEndorsement({ professionalVerified: false, isDisplayable: true, clientConsentAt: NOW.toISOString() }).allowed, false, 'Un professionnel non vérifié ne peut pas co-signer publiquement.');
  assert.equal(canDisplayEndorsement({ professionalVerified: true, isDisplayable: true, clientConsentAt: undefined }).allowed, false, 'Sans consentement du client, rien n’est public.');
  assert.match(endorsementDisclaimer({ professionalSpecialty: 'locticienne', stance: 'approved' }), /ni un diagnostic ni une prescription/);

  const impact = summarizeEndorsements('pro-1', [
    endorsement({ id: 'en1', stance: 'approved' }),
    endorsement({ id: 'en2', stance: 'approved' }),
    endorsement({ id: 'en3', stance: 'amended' }),
    endorsement({ id: 'en4', stance: 'contradicted' })
  ]);
  assert.equal(impact.total, 4);
  assert.equal(impact.agreementRate, 0.5);
  assert.match(impact.statement, /échantillon trop faible/, 'Sous le seuil d’échantillon, le taux ne doit pas être publié.');

  const contradiction = handleContradiction(endorsement({ id: 'en5', stance: 'contradicted', rationale: 'Cette routine surcharge la fibre en protéines.' }));
  assert.equal(contradiction.applyOverride, true, 'Une contradiction professionnelle doit primer sur l’IA.');
  assert.match(contradiction.escalation, /correction du moteur/, 'Une contradiction est un signal de correction, pas une exception à écarter.');
  assert.equal(handleContradiction(endorsement({ id: 'en6', stance: 'approved' })).applyOverride, false);

  // ---------- Store : la persistance s'exécute réellement ----------
  // Ces assertions passent par intelligenceStore, donc par le vrai chemin de
  // code (normalisation, validation, écriture, lecture, suppression), pas par
  // une réimplémentation de test.
  const userId = 'intelligence-store-user';
  await intelligenceStore.deleteIntelligenceData(userId);

  const storeProfile = createEmptyBeautyProfile();
  storeProfile.hair.curlPattern = '4c';
  storeProfile.hair.porosity = 'faible';
  storeProfile.hair.density = 'forte';
  storeProfile.skin.toneDepth = 'fonce';
  storeProfile.environment.climate = 'sec';
  const derivation = await intelligenceStore.syncUserArchetype(userId, storeProfile);
  assert.equal(derivation.key.hairTextureBand, 'kinky', 'Le store doit dériver l’archétype depuis le profil réel.');
  assert.equal(derivation.key.climateBand, 'dry', 'Le climat déclaré doit être pris en compte.');

  await assert.rejects(
    () => intelligenceStore.addShelfItem(userId, { status: 'owned' }),
    /produit du catalogue ou porter un libellé/,
    'Un article sans produit ni libellé doit être refusé.'
  );
  await assert.rejects(
    () => intelligenceStore.addShelfItem(userId, { freeLabel: 'Leave-in', status: 'abandoned' }),
    /doit porter un motif/,
    'Un abandon sans motif doit être refusé : le motif est la seule donnée exploitable.'
  );

  const added = await intelligenceStore.addShelfItem(userId, { freeLabel: 'Shampooing doux', status: 'in_use', routineStep: 'cleanse', estimatedRemainingPercent: 120 });
  assert.equal(added.estimatedRemainingPercent, 100, 'Un pourcentage hors borne doit être borné, pas accepté tel quel.');
  const shelfItems = await intelligenceStore.getShelf(userId);
  assert.equal(shelfItems.length, 1);
  assert.equal(shelfItems[0].id, added.id);

  const patched = await intelligenceStore.updateShelfItem(userId, added.id, { status: 'in_use', freeLabel: 'Shampooing doux', routineStep: 'cleanse', estimatedRemainingPercent: 20 });
  assert.equal(patched?.estimatedRemainingPercent, 20);
  assert.ok(patched!.updatedAt >= added.updatedAt, 'Une mise à jour doit faire avancer l’horodatage.');
  assert.equal(await intelligenceStore.updateShelfItem(userId, 'inexistant', { freeLabel: 'x' }), undefined, 'Un article d’un autre utilisateur ne doit pas être modifiable.');

  await assert.rejects(
    () => intelligenceStore.recordOutcome(userId, { signal: 'signal_inconnu' }),
    /inconnue/,
    'Un signal hors taxonomie doit être refusé.'
  );
  await assert.rejects(
    () => intelligenceStore.recordOutcome(userId, { signal: 'more_hydration' }),
    /produit ou sur un ingrédient/,
    'Une observation sans cible doit être refusée.'
  );
  await assert.rejects(
    () => intelligenceStore.recordOutcome(userId, { signal: 'more_hydration', ingredientId: 'glycerin', isConsentShared: true, note: 'note libre' }),
    /ne peut pas conserver de note libre/,
    'Une observation partagée ne doit pas conserver de note libre : l’agrégat doit rester non relisible.'
  );

  const recorded = await intelligenceStore.recordOutcome(userId, {
    signal: 'more_hydration',
    ingredientId: 'glycerin',
    observedAfterDays: 14,
    climateContext: 'dry',
    isConsentShared: true
  }, storeProfile);
  assert.equal(recorded.valence, 1, 'La valence doit être dérivée du signal, jamais fournie par le client.');
  assert.equal(recorded.archetypeId, derivation.id, 'L’observation doit être rattachée à l’archétype dérivé.');

  const notShared = await intelligenceStore.recordOutcome(userId, { signal: 'product_heavy', ingredientId: 'glycerin', climateContext: 'dry' }, storeProfile);
  assert.equal(notShared.isConsentShared, false, 'Le partage doit être opt-in.');

  const evidence = await intelligenceStore.getIngredientOutcomeEvidence(userId, 'glycerin', { climateContext: 'dry' });
  assert.equal(evidence.aggregate?.observationCount, 1, 'Seule l’observation consentie doit contribuer à l’agrégat.');
  assert.equal(evidence.aggregate?.isPublishable, false, 'Une seule observation ne peut pas être publiée.');

  const suppressed = readAggregate(evidence.aggregate, { ingredientLabel: 'Glycérine', archetypeLabel: derivation.labelFr });
  assert.equal(suppressed.publishable, false);
  assert.match(suppressed.statement, /ne dispose pas encore/, 'Sous le seuil, l’API doit dire qu’elle ne sait pas.');

  const opened = await intelligenceStore.startProtectiveStyle(userId, { style: 'braids', tension: 'tight', installedAt: '2026-06-01T09:00:00.000Z' });
  assert.equal(opened.tension, 'tight');
  assert.equal(opened.maxWearDays, 56, 'La durée maximale par défaut doit suivre le type de coiffure.');

  await assert.rejects(
    () => intelligenceStore.addProtectiveStyleSignal(userId, opened.id, 'signal_inconnu'),
    /Signal inconnu/,
    'Un signal hors taxonomie doit être refusé.'
  );
  const withSignal = await intelligenceStore.addProtectiveStyleSignal(userId, opened.id, 'pain');
  assert.deepEqual(withSignal?.signals, ['pain']);
  const idempotent = await intelligenceStore.addProtectiveStyleSignal(userId, opened.id, 'pain');
  assert.deepEqual(idempotent?.signals, ['pain'], 'Un signal déjà présent ne doit pas être dupliqué.');

  const closed = await intelligenceStore.closeProtectiveStyle(userId, opened.id, 'Retrait anticipé');
  assert.ok(closed?.removedAt, 'La clôture doit horodater le retrait.');
  const styles = await intelligenceStore.getProtectiveStyles(userId);
  assert.equal(styles.length, 1);
  assert.equal(styles[0].removalReason, 'Retrait anticipé');

  // ---------- Écrans : le Shelf et le Wash Day OS sont réellement branchés ----------
  // Sans UI, la couche d'intelligence ne collecte rien et le MOAT ne démarre pas.
  const shelfPageSource = await readFile(new URL('../src/pages/ShelfPage.tsx', import.meta.url), 'utf8');
  const washDayPageSource = await readFile(new URL('../src/pages/WashDayPage.tsx', import.meta.url), 'utf8');
  const navbarSource = await readFile(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');

  // Depuis le chantier 7.1, le routage est déclaratif (`src/lib/routeTable.tsx`).
  // On vérifie donc la résolution réelle de la route plutôt que la présence
  // d'une chaîne dans `App.tsx` : chercher le texte ne prouvait pas que l'URL
  // menait quelque part, alors que `resolveRoute` traverse le vrai chemin.
  assert.ok(resolveRoute('/account/shelf'), 'Le Shelf doit avoir une route.');
  assert.ok(resolveRoute('/account/wash-day'), 'Le Wash Day OS doit avoir une route.');
  assert.ok(resolveRoute('/account/protective-timeline'), 'La timeline protectrice doit avoir une route.');
  assert.ok(navbarSource.includes('/account/shelf'), 'Le Shelf doit être accessible depuis la navigation.');
  assert.ok(navbarSource.includes('/account/wash-day'), 'Le Wash Day OS doit être accessible depuis la navigation.');

  assert.ok(shelfPageSource.includes('getShelfVerdict'), 'Le Shelf doit afficher le verdict d’achat.');
  assert.ok(shelfPageSource.includes('Tu n’as rien à acheter'), 'Le Shelf doit savoir afficher l’absence d’achat à faire.');
  assert.ok(shelfPageSource.includes('ABANDONMENT_REASONS'), 'L’abandon doit passer par la taxonomie de motifs.');
  assert.ok(shelfPageSource.includes('required'), 'Le motif d’abandon doit être obligatoire dans le formulaire.');
  assert.ok(shelfPageSource.includes('recordOutcome'), 'Le Shelf doit ouvrir la boucle d’apprentissage.');
  assert.ok(shelfPageSource.includes('isConsentShared') || shelfPageSource.includes('shareOutcome'), 'Le consentement au partage doit être explicite et séparé.');

  assert.ok(washDayPageSource.includes('getWashDay'), 'Le Wash Day OS doit charger le cycle réel.');
  assert.ok(washDayPageSource.includes('adaptationNotes'), 'Chaque adaptation doit être expliquée.');
  assert.ok(washDayPageSource.includes('task.reason'), 'Chaque tâche doit afficher sa raison.');
  assert.ok(washDayPageSource.includes('proteinEnabled'), 'Le soin protéiné doit être désactivable.');
  assert.ok(washDayPageSource.includes('PROTECTIVE_SIGNAL_LABELS'), 'La timeline protectrice doit être reliée à l’écran.');
  assert.ok(washDayPageSource.includes('PROTECTIVE_SIGNALS'), 'Les signaux de traction doivent être déclarables.');
  assert.ok(serverSource.includes("app.get('/api/wash-day'"), 'Le cycle doit être exposé par l’API.');
  assert.ok(serverSource.includes("app.post('/api/wash-day/mark-done'"), 'Le wash day doit pouvoir être marqué comme fait.');
  assert.ok(migrationWashDaySource.includes('wash_day_cycles'), 'Le cycle doit être persisté.');
  assert.ok(
    migrationWashDaySource.includes('user_id = auth.uid()'),
    'Le cycle de lavage doit être protégé par RLS.'
  );
  assert.ok(
    migrationWashDaySource.includes('protein_every_n_wash_days SMALLINT CHECK'),
    'Le soin protéiné doit rester nullable : NULL signifie désactivé, pas inconnu.'
  );

  // RGPD : la suppression doit vider toute la couche d'intelligence.
  await intelligenceStore.deleteIntelligenceData(userId);
  assert.equal((await intelligenceStore.getShelf(userId)).length, 0, 'L’étagère doit être vidée.');
  assert.equal((await intelligenceStore.getOutcomes(userId)).length, 0, 'Les observations doivent être vidées.');
  assert.equal((await intelligenceStore.getProtectiveStyles(userId)).length, 0, 'Les épisodes de coiffure doivent être vidés.');
  assert.equal(intelligenceStore.getUserArchetype(userId), undefined, 'L’archétype dérivé doit être oublié.');

  // Wash Day OS : le cycle se persiste, se normalise et se purge.
  const cycleUserId = 'wash-day-cycle-user';
  await intelligenceStore.deleteIntelligenceData(cycleUserId);
  const defaultCycle = await intelligenceStore.getWashDayCycle(cycleUserId);
  assert.equal(defaultCycle.intervalDays, 7, 'Un cycle non configuré doit partir de 7 jours.');
  assert.equal(defaultCycle.proteinEveryNWashDays, null, 'Le soin protéiné doit être désactivé par défaut.');

  const savedCycle = await intelligenceStore.saveWashDayCycle(cycleUserId, {
    intervalDays: 999,
    deepConditionEveryNWashDays: 2,
    proteinEveryNWashDays: 4,
    hardWater: true
  });
  assert.equal(savedCycle.intervalDays, 42, 'Un intervalle hors borne doit être borné, pas accepté tel quel.');
  assert.equal(savedCycle.hardWater, true);

  const disabledProtein = await intelligenceStore.saveWashDayCycle(cycleUserId, { proteinEveryNWashDays: null });
  assert.equal(disabledProtein.proteinEveryNWashDays, null, 'Désactiver le soin protéiné doit rester explicite.');

  const reloaded = await intelligenceStore.getWashDayCycle(cycleUserId);
  assert.equal(reloaded.intervalDays, 42, 'Le cycle doit être relu tel qu’enregistré.');

  await intelligenceStore.deleteIntelligenceData(cycleUserId);
  assert.equal((await intelligenceStore.getWashDayCycle(cycleUserId)).intervalDays, 7, 'Après purge, le cycle doit revenir à l’état par défaut.');

  console.log('[PASS] KURLA Intelligence : graphe d’ingrédients, archétypes k-anonymes, Shelf, Wash Day OS, timeline protectrice, outcome evidence, intelligence des retours, co-signature, triage médical unifié, disclosure IA et persistance du store validés.');
}

runKurlaIntelligenceTests().catch(error => {
  console.error('[FAIL] KURLA Intelligence:', error);
  process.exitCode = 1;
});
