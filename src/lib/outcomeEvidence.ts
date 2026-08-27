/**
 * KURLA OUTCOME EVIDENCE — le MOAT réel.
 *
 * La donnée brute d'ingrédients s'achète (bases INCI du marché). Ce qui ne
 * s'achète pas, c'est l'efficacité observée d'un ingrédient sur un archétype
 * donné, dans un climat donné. C'est ce que ce module agrège.
 *
 * Règles non négociables :
 *  - aucune observation individuelle n'est stockée dans l'agrégat ;
 *  - seule une observation avec consentement explicite y contribue ;
 *  - sous le seuil k, rien n'est publié.
 */

import { DEFAULT_K_ANONYMITY_THRESHOLD } from './archetype';

export type OutcomeSignal =
  | 'more_hydration'
  | 'less_hydration'
  | 'more_flexible'
  | 'more_breakage'
  | 'less_breakage'
  | 'product_heavy'
  | 'buildup'
  | 'reaction'
  | 'spots_improving'
  | 'spots_not_improving'
  | 'skin_tight'
  | 'scalp_itchy'
  | 'scalp_calm'
  | 'definition_improved'
  | 'frizz_reduced'
  | 'no_change';

export const OUTCOME_SIGNALS: OutcomeSignal[] = [
  'more_hydration', 'less_hydration', 'more_flexible', 'more_breakage', 'less_breakage',
  'product_heavy', 'buildup', 'reaction', 'spots_improving', 'spots_not_improving',
  'skin_tight', 'scalp_itchy', 'scalp_calm', 'definition_improved', 'frizz_reduced', 'no_change'
];

export const OUTCOME_SIGNAL_LABELS: Record<OutcomeSignal, string> = {
  more_hydration: 'Mieux hydraté',
  less_hydration: 'Moins hydraté',
  more_flexible: 'Fibre plus souple',
  more_breakage: 'Plus de casse',
  less_breakage: 'Moins de casse',
  product_heavy: 'Sensation lourde / poisseuse',
  buildup: 'Résidus accumulés',
  reaction: 'Réaction cutanée',
  spots_improving: 'Taches en amélioration',
  spots_not_improving: 'Taches sans amélioration',
  skin_tight: 'Peau qui tire',
  scalp_itchy: 'Cuir chevelu qui démange',
  scalp_calm: 'Cuir chevelu apaisé',
  definition_improved: 'Définition améliorée',
  frizz_reduced: 'Frisottis réduits',
  no_change: 'Aucun changement constaté'
};

/** Valence : +1 bénéfice, -1 préjudice, 0 neutre. Jamais déduite, toujours déclarée. */
export const SIGNAL_VALENCE: Record<OutcomeSignal, -1 | 0 | 1> = {
  more_hydration: 1,
  less_hydration: -1,
  more_flexible: 1,
  more_breakage: -1,
  less_breakage: 1,
  product_heavy: -1,
  buildup: -1,
  reaction: -1,
  spots_improving: 1,
  spots_not_improving: -1,
  skin_tight: -1,
  scalp_itchy: -1,
  scalp_calm: 1,
  definition_improved: 1,
  frizz_reduced: 1,
  no_change: 0
};

export function isOutcomeSignal(value: unknown): value is OutcomeSignal {
  return typeof value === 'string' && (OUTCOME_SIGNALS as string[]).includes(value);
}

export function valenceOf(signal: OutcomeSignal): -1 | 0 | 1 {
  return SIGNAL_VALENCE[signal] ?? 0;
}

export interface OutcomeObservation {
  id: string;
  userId: string;
  productId?: string;
  ingredientId?: string;
  archetypeId?: string;
  shelfItemId?: string;
  signal: OutcomeSignal;
  valence: -1 | 0 | 1;
  observedAfterDays?: number | null;
  climateContext?: string;
  note?: string;
  /** Consentement granulaire : améliorer MES recommandations ≠ contribuer à la recherche. */
  isConsentShared: boolean;
  observedAt: string;
  createdAt: string;
}

export interface OutcomeAggregate {
  ingredientId: string;
  archetypeId: string;
  climateContext: string;
  observationCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  medianDaysToResult: number | null;
  kAnonymityThreshold: number;
  isPublishable: boolean;
  computedAt: string;
}

/**
 * Agrège des observations en un compte publié. Ne conserve aucune référence à
 * un utilisateur : une fois agrégée, la donnée ne permet plus de remonter à
 * une personne.
 */
export function aggregateOutcomes(
  observations: Iterable<OutcomeObservation>,
  options: { kAnonymityThreshold?: number; now?: Date } = {}
): OutcomeAggregate[] {
  const k = options.kAnonymityThreshold ?? DEFAULT_K_ANONYMITY_THRESHOLD;
  const now = (options.now || new Date()).toISOString();

  const buckets = new Map<string, {
    ingredientId: string;
    archetypeId: string;
    climateContext: string;
    positive: number;
    neutral: number;
    negative: number;
    days: number[];
  }>();

  for (const observation of observations) {
    // Sans consentement explicite, l'observation améliore le profil de son
    // auteur mais ne contribue à aucune statistique partagée.
    if (!observation.isConsentShared) continue;
    if (!observation.ingredientId || !observation.archetypeId) continue;

    const climateContext = observation.climateContext || 'any';
    const key = `${observation.ingredientId}|${observation.archetypeId}|${climateContext}`;
    const bucket = buckets.get(key) || {
      ingredientId: observation.ingredientId,
      archetypeId: observation.archetypeId,
      climateContext,
      positive: 0,
      neutral: 0,
      negative: 0,
      days: []
    };
    if (observation.valence > 0) bucket.positive += 1;
    else if (observation.valence < 0) bucket.negative += 1;
    else bucket.neutral += 1;
    if (typeof observation.observedAfterDays === 'number' && Number.isFinite(observation.observedAfterDays)) {
      bucket.days.push(observation.observedAfterDays);
    }
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).map(bucket => {
    const observationCount = bucket.positive + bucket.neutral + bucket.negative;
    const sortedDays = bucket.days.slice().sort((a, b) => a - b);
    const medianDaysToResult = sortedDays.length === 0
      ? null
      : sortedDays.length % 2 === 0
        ? Math.round((sortedDays[sortedDays.length / 2 - 1] + sortedDays[sortedDays.length / 2]) / 2)
        : sortedDays[Math.floor(sortedDays.length / 2)];

    return {
      ingredientId: bucket.ingredientId,
      archetypeId: bucket.archetypeId,
      climateContext: bucket.climateContext,
      observationCount,
      positiveCount: bucket.positive,
      neutralCount: bucket.neutral,
      negativeCount: bucket.negative,
      medianDaysToResult,
      kAnonymityThreshold: k,
      isPublishable: observationCount >= k,
      computedAt: now
    };
  }).sort((a, b) => b.observationCount - a.observationCount);
}

export interface OutcomeReading {
  publishable: boolean;
  observationCount: number;
  positiveShare: number;
  medianDaysToResult: number | null;
  /** Ce qui est dit à l'utilisateur. Jamais de conclusion au-delà des données. */
  statement: string;
  limitations: string[];
}

/**
 * Formule la lecture d'un agrégat. Trois garde-fous :
 *  - sous le seuil k, on dit qu'on ne sait pas encore ;
 *  - on ne transforme jamais une corrélation déclarative en causalité ;
 *  - on rappelle que l'observation n'est pas un essai contrôlé.
 */
export function readAggregate(
  aggregate: OutcomeAggregate | undefined,
  context: { ingredientLabel: string; archetypeLabel: string; climateLabel?: string }
): OutcomeReading {
  const climate = context.climateLabel ? ` en climat ${context.climateLabel.toLowerCase()}` : '';

  if (!aggregate || !aggregate.isPublishable) {
    const count = aggregate?.observationCount ?? 0;
    return {
      publishable: false,
      observationCount: count,
      positiveShare: 0,
      medianDaysToResult: null,
      statement: `KURLA ne dispose pas encore d’assez d’observations pour ${context.ingredientLabel} sur ${context.archetypeLabel}${climate} (${count} observation${count > 1 ? 's' : ''}, seuil de ${aggregate?.kAnonymityThreshold ?? DEFAULT_K_ANONYMITY_THRESHOLD}). Aucune conclusion n’est proposée.`,
      limitations: [
        'Sous le seuil de k-anonymité : publier une statistique sur un si petit groupe pourrait rendre une personne identifiable.',
        'L’absence de donnée n’est pas une preuve d’inefficacité ni d’innocuité.'
      ]
    };
  }

  const positiveShare = Number((aggregate.positiveCount / aggregate.observationCount).toFixed(2));
  const limitations = [
    'Ces observations sont déclaratives et non contrôlées : elles ne constituent pas un essai clinique.',
    'Elles portent sur un archétype, pas sur votre profil exact.'
  ];

  let statement: string;
  if (positiveShare >= 0.7) {
    statement = `${context.ingredientLabel} sur ${context.archetypeLabel}${climate} : ${Math.round(positiveShare * 100)} % de retours favorables sur ${aggregate.observationCount} observations.`;
  } else if (positiveShare <= 0.3) {
    statement = `${context.ingredientLabel} sur ${context.archetypeLabel}${climate} : retours majoritairement défavorables (${Math.round(positiveShare * 100)} % de favorables sur ${aggregate.observationCount} observations). Cela ne signifie pas que cela ne peut pas vous convenir, mais le signal va dans le sens contraire.`;
    limitations.push('Un signal défavorable sur un archétype justifie d’introduire le produit seul et d’observer, jamais de le combiner à d’autres actifs.');
  } else {
    statement = `${context.ingredientLabel} sur ${context.archetypeLabel}${climate} : retours partagés (${Math.round(positiveShare * 100)} % de favorables sur ${aggregate.observationCount} observations). Le contexte semble déterminant.`;
  }

  if (aggregate.medianDaysToResult !== null) {
    statement += ` Résultat médian observé après ${aggregate.medianDaysToResult} jour(s).`;
  }

  return {
    publishable: true,
    observationCount: aggregate.observationCount,
    positiveShare,
    medianDaysToResult: aggregate.medianDaysToResult,
    statement,
    limitations
  };
}

/**
 * Note par archétype. Remplace la note globale unique : un 4,6/5 toutes
 * populations confondues est une information fausse pour un 4C faible porosité.
 */
export interface ArchetypeRating {
  productId: string;
  archetypeId: string;
  archetypeLabel: string;
  rating: number | null;
  reviewCount: number;
  publishable: boolean;
  suppressionReason?: string;
}

export function computeArchetypeRating(
  productId: string,
  archetypeId: string,
  archetypeLabel: string,
  ratings: Iterable<number>,
  kAnonymityThreshold = 5
): ArchetypeRating {
  const values = Array.from(ratings).filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
  const publishable = values.length >= kAnonymityThreshold;
  if (!publishable) {
    return {
      productId,
      archetypeId,
      archetypeLabel,
      rating: null,
      reviewCount: values.length,
      publishable: false,
      suppressionReason: `${values.length} avis sur cet archétype, sous le seuil de ${kAnonymityThreshold}. KURLA n’affiche pas de note calculée sur si peu d’avis.`
    };
  }
  const rating = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
  return { productId, archetypeId, archetypeLabel, rating, reviewCount: values.length, publishable: true };
}
