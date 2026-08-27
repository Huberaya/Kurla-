/**
 * KURLA SHELF — l'inventaire réel de l'utilisateur.
 *
 * Toute l'industrie recommande à partir de l'historique d'achat. C'est la pire
 * base possible : acheter n'est pas utiliser. Un sérum acheté il y a huit mois
 * peut être terminé, abandonné, ou donné.
 *
 * Le Shelf inverse la question : non pas « que veux-tu acheter ? » mais
 * « que te manque-t-il vraiment ? ». KURLA doit être capable de répondre
 * « tu n'as rien à acheter ».
 */

export type ShelfStatus = 'owned' | 'in_use' | 'paused' | 'finished' | 'abandoned';

export type AbandonmentReason =
  | 'texture_mismatch'
  | 'too_heavy'
  | 'too_light'
  | 'fragrance'
  | 'reaction'
  | 'ineffective'
  | 'too_expensive'
  | 'changed_mind'
  | 'damaged'
  | 'other';

export const ABANDONMENT_REASONS: AbandonmentReason[] = [
  'texture_mismatch', 'too_heavy', 'too_light', 'fragrance', 'reaction',
  'ineffective', 'too_expensive', 'changed_mind', 'damaged', 'other'
];

export const ABANDONMENT_LABELS: Record<AbandonmentReason, string> = {
  texture_mismatch: 'Ne convenait pas à ma texture',
  too_heavy: 'Trop riche / trop lourd',
  too_light: 'Pas assez riche',
  fragrance: 'Parfum désagréable',
  reaction: 'Réaction cutanée ou du cuir chevelu',
  ineffective: 'Aucun résultat constaté',
  too_expensive: 'Trop cher pour le résultat',
  changed_mind: 'Changement de routine',
  damaged: 'Produit abîmé',
  other: 'Autre'
};

/**
 * Étapes fonctionnelles d'une routine. C'est le niveau auquel on raisonne en
 * doublon : deux leave-in sont redondants, un leave-in et une huile ne le sont
 * pas même s'ils contiennent des ingrédients proches.
 */
export type RoutineStep =
  | 'cleanse'
  | 'condition'
  | 'deep_condition'
  | 'leave_in'
  | 'seal_oil'
  | 'styling_definer'
  | 'scalp_treatment'
  | 'protein_treatment'
  | 'skin_cleanser'
  | 'skin_treatment'
  | 'skin_moisturizer'
  | 'skin_spf'
  | 'other';

export const ROUTINE_STEPS: RoutineStep[] = [
  'cleanse', 'condition', 'deep_condition', 'leave_in', 'seal_oil', 'styling_definer',
  'scalp_treatment', 'protein_treatment', 'skin_cleanser', 'skin_treatment',
  'skin_moisturizer', 'skin_spf', 'other'
];

export const ROUTINE_STEP_LABELS: Record<RoutineStep, string> = {
  cleanse: 'Shampooing / nettoyant',
  condition: 'Après-shampooing',
  deep_condition: 'Masque / soin profond',
  leave_in: 'Leave-in',
  seal_oil: 'Huile de scellement',
  styling_definer: 'Définissant / coiffant',
  scalp_treatment: 'Soin du cuir chevelu',
  protein_treatment: 'Soin protéiné',
  skin_cleanser: 'Nettoyant visage',
  skin_treatment: 'Sérum / traitement',
  skin_moisturizer: 'Hydratant visage',
  skin_spf: 'Protection solaire',
  other: 'Autre'
};

export interface ShelfItem {
  id: string;
  userId: string;
  productId?: string;
  freeLabel?: string;
  status: ShelfStatus;
  category?: string;
  routineStep?: RoutineStep;
  ingredientIds: string[];
  openedAt?: string;
  finishedAt?: string;
  estimatedRemainingPercent?: number | null;
  purchasePrice?: number | null;
  abandonmentReason?: AbandonmentReason;
  abandonmentNote?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export function isAbandonmentReason(value: unknown): value is AbandonmentReason {
  return typeof value === 'string' && (ABANDONMENT_REASONS as string[]).includes(value);
}

export function isRoutineStep(value: unknown): value is RoutineStep {
  return typeof value === 'string' && (ROUTINE_STEPS as string[]).includes(value);
}

/** Un produit « possédé » sans être ouvert n'est pas encore consommé : il ne couvre pas un besoin actif. */
export function isCoveringNeed(item: ShelfItem): boolean {
  return item.status === 'in_use' || (item.status === 'owned' && (item.estimatedRemainingPercent ?? 100) > 0);
}

export function activeItems(items: Iterable<ShelfItem>): ShelfItem[] {
  return Array.from(items).filter(item => item.status === 'in_use' || item.status === 'owned' || item.status === 'paused');
}

export interface StepCoverage {
  routineStep: RoutineStep;
  label: string;
  covered: boolean;
  items: ShelfItem[];
  surplusCount: number;
}

/**
 * Couverture fonctionnelle de l'étagère. C'est ce qui permet de dire
 * « il te manque un leave-in » au lieu de « voici douze produits à acheter ».
 */
export function analyseCoverage(items: Iterable<ShelfItem>, requiredSteps: Iterable<RoutineStep>): StepCoverage[] {
  const active = activeItems(items);
  return Array.from(requiredSteps).map(routineStep => {
    const matching = active.filter(item => item.routineStep === routineStep);
    return {
      routineStep,
      label: ROUTINE_STEP_LABELS[routineStep],
      covered: matching.length > 0,
      items: matching,
      surplusCount: Math.max(0, matching.length - 1)
    };
  });
}

export interface ShelfGap {
  routineStep: RoutineStep;
  label: string;
  message: string;
  /** Une lacune critique bloque la routine ; une lacune optionnelle ne la bloque pas. */
  critical: boolean;
}

const CRITICAL_STEPS: RoutineStep[] = ['cleanse', 'condition', 'skin_cleanser', 'skin_moisturizer', 'skin_spf'];

export function findGaps(items: Iterable<ShelfItem>, requiredSteps: Iterable<RoutineStep>): ShelfGap[] {
  return analyseCoverage(items, requiredSteps)
    .filter(coverage => !coverage.covered)
    .map(coverage => ({
      routineStep: coverage.routineStep,
      label: coverage.label,
      critical: CRITICAL_STEPS.includes(coverage.routineStep),
      message: `Aucun ${coverage.label.toLowerCase()} dans votre étagère.`
    }))
    .sort((a, b) => Number(b.critical) - Number(a.critical));
}

export interface SurplusFinding {
  routineStep: RoutineStep;
  label: string;
  count: number;
  message: string;
}

/**
 * Détection de doublons fonctionnels. Dire à l'utilisateur qu'il a trois
 * leave-in ouverts est un acte de confiance : ça réduit la vente immédiate et
 * augmente la fidélité de long terme.
 */
export function findSurplus(items: Iterable<ShelfItem>, requiredSteps: Iterable<RoutineStep>): SurplusFinding[] {
  return analyseCoverage(items, requiredSteps)
    .filter(coverage => coverage.surplusCount > 0)
    .map(coverage => ({
      routineStep: coverage.routineStep,
      label: coverage.label,
      count: coverage.items.length,
      message: `Vous avez ${coverage.items.length} ${coverage.label.toLowerCase()}${coverage.items.length > 1 ? 's' : ''} ouverts. Terminez-en un avant d'en racheter.`
    }));
}

export interface ShelfVerdict {
  needsPurchase: boolean;
  gaps: ShelfGap[];
  surplus: SurplusFinding[];
  /** La phrase la plus importante du produit : dire non à une vente. */
  message: string;
}

/**
 * Verdict d'achat. Si rien ne manque, KURLA le dit explicitement.
 */
export function buildShelfVerdict(items: Iterable<ShelfItem>, requiredSteps: Iterable<RoutineStep>): ShelfVerdict {
  const steps = Array.from(requiredSteps);
  const gaps = findGaps(items, steps);
  const surplus = findSurplus(items, steps);
  const criticalGaps = gaps.filter(gap => gap.critical);
  const needsPurchase = criticalGaps.length > 0;
  const message = needsPurchase
    ? `Il vous manque ${criticalGaps.map(gap => gap.label.toLowerCase()).join(' et ')}.`
    : gaps.length > 0
      ? 'Votre routine est complète sur l’essentiel. Les étapes manquantes sont optionnelles : rien à acheter maintenant.'
      : 'Votre étagère couvre déjà toutes les étapes de votre routine. Vous n’avez rien à acheter.';
  return { needsPurchase, gaps, surplus, message };
}

export interface AbandonmentPattern {
  reason: AbandonmentReason;
  label: string;
  count: number;
  share: number;
}

/**
 * Motifs d'abandon agrégés. C'est la donnée négative : plus informative que
 * les avis, qui ne viennent que des acheteurs satisfaits.
 */
export function summarizeAbandonments(items: Iterable<ShelfItem>): AbandonmentPattern[] {
  const abandoned = Array.from(items).filter(item => item.status === 'abandoned' && item.abandonmentReason);
  if (abandoned.length === 0) return [];
  const counts = new Map<AbandonmentReason, number>();
  for (const item of abandoned) {
    const reason = item.abandonmentReason as AbandonmentReason;
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      label: ABANDONMENT_LABELS[reason],
      count,
      share: Number((count / abandoned.length).toFixed(2))
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Ingrédients à écarter pour cet utilisateur, déduits de ses propres abandons.
 * Un ingrédient n'est écarté que s'il apparaît dans au moins deux abandons
 * motivés par une réaction ou une incompatibilité : une seule occurrence est
 * anecdotique et ne justifie pas d'écarter un ingrédient.
 */
export function deriveAvoidedIngredients(items: Iterable<ShelfItem>, minimumOccurrences = 2): { ingredientId: string; occurrences: number; reasons: AbandonmentReason[] }[] {
  const signals = new Map<string, { occurrences: number; reasons: Set<AbandonmentReason> }>();
  for (const item of items) {
    if (item.status !== 'abandoned' || !item.abandonmentReason) continue;
    if (item.abandonmentReason !== 'reaction' && item.abandonmentReason !== 'texture_mismatch') continue;
    for (const ingredientId of item.ingredientIds) {
      const entry = signals.get(ingredientId) || { occurrences: 0, reasons: new Set<AbandonmentReason>() };
      entry.occurrences += 1;
      entry.reasons.add(item.abandonmentReason);
      signals.set(ingredientId, entry);
    }
  }
  return Array.from(signals.entries())
    .filter(([, entry]) => entry.occurrences >= minimumOccurrences)
    .map(([ingredientId, entry]) => ({
      ingredientId,
      occurrences: entry.occurrences,
      reasons: Array.from(entry.reasons)
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Réassort prédictif. Basé sur le rythme de consommation déclaré, pas sur une
 * date d'achat : c'est la différence entre un message utile et une promotion.
 */
export interface ReplenishmentSignal {
  itemId: string;
  label: string;
  remainingPercent: number;
  daysUntilEmpty: number | null;
  shouldNotify: boolean;
  message: string;
}

export function evaluateReplenishment(
  item: ShelfItem,
  options: { weeklyUsagePercent: number; notifyThresholdPercent?: number; now?: Date }
): ReplenishmentSignal {
  const label = item.freeLabel || item.productId || 'Produit';
  const remaining = item.estimatedRemainingPercent ?? null;
  const notifyThreshold = options.notifyThresholdPercent ?? 20;
  if (remaining === null || !Number.isFinite(options.weeklyUsagePercent) || options.weeklyUsagePercent <= 0) {
    return {
      itemId: item.id,
      label,
      remainingPercent: remaining ?? 0,
      daysUntilEmpty: null,
      shouldNotify: false,
      message: 'Consommation non renseignée : KURLA ne peut pas estimer la date de fin. Elle ne devine pas.'
    };
  }
  const daysUntilEmpty = Math.round((remaining / options.weeklyUsagePercent) * 7);
  const shouldNotify = remaining <= notifyThreshold;
  return {
    itemId: item.id,
    label,
    remainingPercent: remaining,
    daysUntilEmpty,
    shouldNotify,
    message: shouldNotify
      ? `${label} : environ ${remaining} % restant, soit ${daysUntilEmpty} jour${daysUntilEmpty > 1 ? 's' : ''} d usage au rythme déclaré.`
      : `${label} : environ ${remaining} % restant, aucune action nécessaire.`
  };
}
