/**
 * CHANTIER 5 — Moteur de recommandation v2.
 *
 * Le moteur précédent (`calculateKurlaFit`) est conservé tel quel : ses règles
 * explicites et son `score: null` plutôt qu'une invention sont un actif. Ce
 * module ajoute la couche qui manquait.
 *
 * Trois principes :
 *  1. Chaque ajustement est traçable. Si le score bouge, la réponse dit
 *     pourquoi et cite l'observation qui l'a provoqué.
 *  2. Ce que l'utilisateur possède déjà n'est pas recommandé. Recommander un
 *     deuxième leave-in à quelqu'un qui en a trois ouverts est une faute.
 *  3. Une pondération apprise ne remplace jamais une règle de sécurité. Elle
 *     réordonne, elle n'autorise pas.
 */

import { calculateKurlaFit, KurlaFitResult } from './kurlaFit';
import { BeautyProfile } from './beautyProfile';
import { findConflicts, ConflictFinding, IncompatibilityRule } from './ingredientGraph';
import { OutcomeObservation } from './outcomeEvidence';
import { ROUTINE_STEPS, RoutineStep, ShelfItem, activeItems, analyseCoverage } from './shelf';

export interface EngineProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  needs?: string[];
  concerns?: string[];
  routineStep?: string;
  keyIngredients?: string[];
  ingredientIds?: string[];
  /** Rendement déclaré, ex. « 3 mois ». Sert au coût d'usage réel. */
  estimatedYield?: string;
  sizeLabel?: string;
  usageFrequency?: string;
  inStock: boolean;
}

export interface EngineContext {
  profile?: BeautyProfile;
  shelf: ShelfItem[];
  /** Observations de l'utilisateur uniquement (pas les agrégats partagés). */
  observations: OutcomeObservation[];
  /** Ingrédients écartés par l'utilisateur, déduits de ses abandons. */
  avoidedIngredientIds?: string[];
  incompatibilityRules?: IncompatibilityRule[];
  budgetLimit?: number;
}

export type AdjustmentKind =
  | 'owned'
  | 'surplus'
  | 'avoided_ingredient'
  | 'negative_outcome'
  | 'positive_outcome'
  | 'budget'
  | 'out_of_stock'
  | 'conflict';

export interface Adjustment {
  kind: AdjustmentKind;
  delta: number;
  reason: string;
  /** Preuve citable. Sans elle, l'ajustement n'est pas explicable. */
  evidenceId?: string;
}

export interface Recommendation {
  product: EngineProduct;
  baseScore: number | null;
  baseConfidence: number;
  adjustments: Adjustment[];
  finalScore: number | null;
  /** Rang final. `null` si le produit est exclu. */
  rank: number | null;
  excluded: boolean;
  exclusionReason?: string;
  baseReasons: string[];
  unmetNeeds: string[];
  /** Coût d'usage réel quand le rendement est déclaré, sinon null. */
  usageCost: UsageCost | null;
}

export interface UsageCost {
  monthlyCost: number | null;
  monthsOfUse: number | null;
  /** Ce que KURLA ne peut pas calculer est dit, pas estimé. */
  limitation?: string;
}

export interface EngineResult {
  recommendations: Recommendation[];
  /** Conflits détectés dans le panier recommandé. */
  conflicts: ConflictFinding[];
  /** Étapes de routine non couvertes par le Shelf ni par la recommandation. */
  uncoveredSteps: RoutineStep[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Coût d'usage
// ---------------------------------------------------------------------------

const YIELD_PATTERNS: { pattern: RegExp; months: number }[] = [
  { pattern: /(\d+(?:[.,]\d+)?)\s*(?:mois|months?)/i, months: 1 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*(?:semaines?|weeks?)/i, months: 1 / 4.345 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*(?:jours?|days?)/i, months: 1 / 30.44 }
];

/**
 * Rendement déclaré en mois. Retourne `null` si le rendement n'est pas
 * déclaré : un coût d'usage inventé serait pire qu'un coût absent.
 */
export function parseYieldMonths(estimatedYield: unknown): number | null {
  if (typeof estimatedYield !== 'string' || estimatedYield.trim() === '') return null;
  for (const { pattern, months } of YIELD_PATTERNS) {
    const match = estimatedYield.match(pattern);
    if (match) {
      const value = Number(match[1].replace(',', '.'));
      if (Number.isFinite(value) && value > 0) return Number((value * months).toFixed(2));
    }
  }
  return null;
}

export function computeUsageCost(product: Pick<EngineProduct, 'price' | 'estimatedYield'>): UsageCost {
  const months = parseYieldMonths(product.estimatedYield);
  if (months === null) {
    return {
      monthlyCost: null,
      monthsOfUse: null,
      limitation: 'Rendement non déclaré : le coût mensuel réel ne peut pas être calculé. Le prix affiché n’est pas comparable à un autre produit de contenance différente.'
    };
  }
  return { monthlyCost: Number((product.price / months).toFixed(2)), monthsOfUse: months };
}

// ---------------------------------------------------------------------------
// Pondérations apprises
// ---------------------------------------------------------------------------

/**
 * Une pondération apprise ne s'applique qu'à partir d'un nombre minimal
 * d'observations. En dessous, le signal est du bruit : trois retours négatifs
 * sur un produit ne justifient pas de l'écarter.
 */
export const MINIMUM_OBSERVATIONS_FOR_ADJUSTMENT = 2;

export interface LearnedWeight {
  ingredientId: string;
  positive: number;
  negative: number;
  net: number;
  observationCount: number;
  /** L'observation la plus récente, citée comme preuve. */
  latestObservationId: string;
}

/**
 * Pondérations apprises depuis les observations de l'utilisateur, agrégées par
 * ingrédient. Ce sont SES résultats, pas ceux d'une cohorte.
 */
export function learnIngredientWeights(observations: Iterable<OutcomeObservation>): Map<string, LearnedWeight> {
  const weights = new Map<string, LearnedWeight>();
  const sorted = Array.from(observations).sort(
    (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
  );
  for (const observation of sorted) {
    if (!observation.ingredientId) continue;
    const entry = weights.get(observation.ingredientId) || {
      ingredientId: observation.ingredientId,
      positive: 0,
      negative: 0,
      net: 0,
      observationCount: 0,
      latestObservationId: observation.id
    };
    if (observation.valence > 0) entry.positive += 1;
    else if (observation.valence < 0) entry.negative += 1;
    entry.observationCount += 1;
    entry.net = entry.positive - entry.negative;
    weights.set(observation.ingredientId, entry);
  }
  return weights;
}

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

const BUDGET_PENALTY = 25;
const STOCK_PENALTY = 40;
const AVOIDED_PENALTY = 30;
const NEGATIVE_OUTCOME_PENALTY = 20;
const POSITIVE_OUTCOME_BONUS = 15;

function productIngredientIds(product: EngineProduct): string[] {
  if (product.ingredientIds && product.ingredientIds.length > 0) return product.ingredientIds;
  // Repli sur les libellés déclarés, normalisés : mieux que rien, mais ce ne
  // sont pas des entités résolues.
  return (product.keyIngredients || []).map(name => name.trim().toLowerCase()).filter(Boolean);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Un produit déjà possédé et encore utilisable ne doit pas être recommandé.
 * C'est la règle la plus importante du moteur : elle réduit la vente immédiate
 * et c'est précisément ce qui construit la confiance.
 */
function ownedMatch(product: EngineProduct, shelf: ShelfItem[]): ShelfItem | undefined {
  const active = activeItems(shelf);
  return active.find(item => {
    if (item.productId && item.productId === product.id) return true;
    if (!item.freeLabel) return false;
    const label = item.freeLabel.toLowerCase();
    return label.includes(product.name.toLowerCase()) || product.name.toLowerCase().includes(label);
  });
}

/**
 * Étape déjà couverte plusieurs fois dans l'étagère : recommander un énième
 * produit de la même étape n'apporte rien.
 */
function surplusStep(product: EngineProduct, shelf: ShelfItem[]): { step: RoutineStep; count: number } | undefined {
  const step = (ROUTINE_STEPS as string[]).includes(product.routineStep || '')
    ? product.routineStep as RoutineStep
    : undefined;
  if (!step) return undefined;
  const coverage = analyseCoverage(shelf, [step]).find(item => item.routineStep === step);
  if (!coverage || coverage.surplusCount === 0) return undefined;
  return { step, count: coverage.items.length };
}

/**
 * Construit les recommandations. Chaque produit porte la trace complète de ses
 * ajustements : un score final sans trace n'est pas acceptable.
 */
export function buildRecommendations(catalog: Iterable<EngineProduct>, context: EngineContext): EngineResult {
  const weights = learnIngredientWeights(context.observations);
  const avoided = new Set(context.avoidedIngredientIds || []);
  const recommendations: Recommendation[] = [];

  for (const product of catalog) {
    const fit: KurlaFitResult | null = context.profile
      ? calculateKurlaFit(product as any, context.profile)
      : null;

    const adjustments: Adjustment[] = [];
    let excluded = false;
    let exclusionReason: string | undefined;

    if (!product.inStock) {
      adjustments.push({ kind: 'out_of_stock', delta: -STOCK_PENALTY, reason: 'Produit indisponible.' });
      excluded = true;
      exclusionReason = 'Indisponible';
    }

    // --- Ce que l'utilisateur possède déjà -------------------------------
    const owned = ownedMatch(product, context.shelf);
    if (owned) {
      const remaining = owned.estimatedRemainingPercent ?? null;
      const nearlyEmpty = remaining !== null && remaining <= 20;
      adjustments.push({
        kind: 'owned',
        delta: nearlyEmpty ? 0 : -100,
        reason: nearlyEmpty
          ? `Vous en avez encore ${remaining} %, mais le produit arrive en fin de vie : le réassort est légitime.`
          : 'Vous possédez déjà ce produit et il est encore utilisable. KURLA ne recommande pas un doublon.',
        evidenceId: owned.id
      });
      // Un produit presque terminé redevient recommandable : il n'est donc pas
      // exclu, et ne doit pas porter de motif d'exclusion.
      if (!nearlyEmpty) {
        excluded = true;
        exclusionReason = 'Déjà dans votre étagère et encore utilisable.';
      }
    }

    const surplus = surplusStep(product, context.shelf);
    if (surplus && !excluded) {
      adjustments.push({
        kind: 'surplus',
        delta: -35,
        reason: `Vous avez déjà ${surplus.count} produits ouverts pour l’étape « ${surplus.step} ». Terminez-en un avant d’en ajouter.`
      });
    }

    // --- Ingrédients écartés par l'utilisateur ---------------------------
    const ingredients = productIngredientIds(product);
    const avoidedHit = ingredients.filter(id => avoided.has(id));
    if (avoidedHit.length > 0) {
      excluded = true;
      exclusionReason = `Contient ${avoidedHit.length} ingrédient(s) que vous avez écarté(s) après abandon.`;
      adjustments.push({
        kind: 'avoided_ingredient',
        delta: -AVOIDED_PENALTY,
        reason: `Contient ${avoidedHit.join(', ')}, écarté(s) d’après vos abandons précédents.`
      });
    }

    // --- Pondérations apprises -------------------------------------------
    for (const ingredientId of ingredients) {
      const weight = weights.get(ingredientId);
      if (!weight || weight.observationCount < MINIMUM_OBSERVATIONS_FOR_ADJUSTMENT) continue;
      if (weight.net < 0) {
        adjustments.push({
          kind: 'negative_outcome',
          delta: -NEGATIVE_OUTCOME_PENALTY,
          reason: `Cet ingrédient (${ingredientId}) a produit ${weight.negative} retour(s) défavorable(s) et ${weight.positive} favorable(s) dans votre historique.`,
          evidenceId: weight.latestObservationId
        });
      } else if (weight.net > 0) {
        adjustments.push({
          kind: 'positive_outcome',
          delta: POSITIVE_OUTCOME_BONUS,
          reason: `Cet ingrédient (${ingredientId}) a produit ${weight.positive} retour(s) favorable(s) dans votre historique.`,
          evidenceId: weight.latestObservationId
        });
      }
    }

    // --- Budget -----------------------------------------------------------
    if (context.budgetLimit !== undefined && product.price > context.budgetLimit) {
      adjustments.push({
        kind: 'budget',
        delta: -BUDGET_PENALTY,
        reason: `Au-dessus de votre budget indicatif de ${context.budgetLimit} € par article (${product.price} €).`
      });
    }

    const baseScore = fit?.score ?? null;
    const totalDelta = adjustments.reduce((sum, adjustment) => sum + adjustment.delta, 0);
    const finalScore = baseScore === null ? null : clampScore(baseScore + totalDelta);

    recommendations.push({
      product,
      baseScore,
      baseConfidence: fit?.confidence ?? 0,
      adjustments,
      finalScore,
      rank: null,
      excluded,
      exclusionReason,
      baseReasons: fit?.reasons ?? [],
      unmetNeeds: fit?.unmetNeeds ?? [],
      usageCost: computeUsageCost(product)
    });
  }

  // Classement : les produits sans score exploitable passent en dernier plutôt
  // que d'être inventés en tête de liste.
  const ranked = recommendations
    .slice()
    .sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
      const scoreA = a.finalScore === null ? -1 : a.finalScore;
      const scoreB = b.finalScore === null ? -1 : b.finalScore;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.baseConfidence - a.baseConfidence;
    });

  let rank = 0;
  for (const recommendation of ranked) {
    if (!recommendation.excluded) {
      rank += 1;
      recommendation.rank = rank;
    }
  }

  // --- Conflits dans le panier recommandé ---------------------------------
  const topIngredients = ranked
    .filter(recommendation => !recommendation.excluded && recommendation.rank !== null && recommendation.rank <= 5)
    .flatMap(recommendation => productIngredientIds(recommendation.product));
  const conflicts = findConflicts(topIngredients, context.incompatibilityRules || []);

  // --- Étapes non couvertes ------------------------------------------------
  const coveredByShelf = new Set(
    activeItems(context.shelf).map(item => item.routineStep).filter((step): step is RoutineStep => step !== undefined)
  );
  const coveredByRecommendation = new Set(
    ranked
      .filter(recommendation => !recommendation.excluded && recommendation.rank !== null && recommendation.rank <= 5)
      .map(recommendation => recommendation.product.routineStep)
      .filter((step): step is string => typeof step === 'string')
  );
  const uncoveredSteps = ROUTINE_STEPS.filter(
    step => !coveredByShelf.has(step) && !coveredByRecommendation.has(step)
      && ['cleanse', 'condition', 'leave_in'].includes(step)
  ) as RoutineStep[];

  const available = ranked.filter(recommendation => !recommendation.excluded);
  const excludedCount = ranked.length - available.length;
  const learnedCount = ranked.filter(recommendation =>
    recommendation.adjustments.some(adjustment => adjustment.kind === 'negative_outcome' || adjustment.kind === 'positive_outcome')
  ).length;

  let summary: string;
  if (available.length === 0) {
    summary = 'Aucun produit à recommander : votre étagère couvre déjà vos besoins, ou le catalogue disponible ne contient rien d’assez vérifiable pour vous.';
  } else {
    summary = `${available.length} produit(s) recommandé(s)${excludedCount > 0 ? `, ${excludedCount} écarté(s)` : ''}.`;
    if (learnedCount > 0) {
      summary += ` ${learnedCount} recommandation(s) ont été modifiée(s) par vos propres retours d’usage.`;
    }
  }

  return { recommendations: ranked, conflicts, uncoveredSteps, summary };
}

/**
 * Preuve d'apprentissage : cite les observations qui ont modifié le classement.
 * C'est le critère de sortie du chantier — un moteur qui apprend doit pouvoir
 * montrer ce qu'il a appris.
 */
export function explainLearning(result: EngineResult): { product: string; reason: string; evidenceId?: string }[] {
  return result.recommendations
    .filter(recommendation => recommendation.adjustments.some(adjustment => adjustment.kind === 'negative_outcome' || adjustment.kind === 'positive_outcome'))
    .flatMap(recommendation =>
      recommendation.adjustments
        .filter(adjustment => adjustment.kind === 'negative_outcome' || adjustment.kind === 'positive_outcome')
        .map(adjustment => ({ product: recommendation.product.name, reason: adjustment.reason, evidenceId: adjustment.evidenceId }))
    );
}
