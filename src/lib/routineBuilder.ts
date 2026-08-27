/**
 * CHANTIER 5 — Routine Builder : relier l'IA au commerce.
 *
 * Une routine n'est pas une liste de produits. C'est un ensemble d'étapes,
 * dont chacune doit être justifiée, et dont l'utilisateur peut remplacer
 * n'importe quel maillon. Un panier qu'on ne peut pas modifier pièce par pièce
 * est un panier qu'on abandonne.
 */

import { EngineProduct, Recommendation } from './recommendationEngine';
import { ROUTINE_STEPS, ROUTINE_STEP_LABELS, RoutineStep, ShelfItem, activeItems } from './shelf';
import { ConflictFinding } from './ingredientGraph';

export type ExperienceLevel = 'debutant' | 'intermediaire' | 'avance';

export interface RoutineBuilderRequest {
  goal: string;
  budgetLimit?: number;
  /** Minutes disponibles par jour. Une routine qui ne tient pas dans le temps déclaré ne sera pas suivie. */
  availableMinutesPerDay?: number;
  experienceLevel?: ExperienceLevel;
  /** Étapes explicitement demandées. Sinon, l'ensemble essentiel est proposé. */
  requestedSteps?: RoutineStep[];
}

export interface RoutineSlot {
  routineStep: RoutineStep;
  label: string;
  /** Produit proposé, ou `null` si rien d'assez vérifiable n'existe. */
  recommendation: Recommendation | null;
  /** Produit déjà possédé qui couvre l'étape : dans ce cas on ne vend rien. */
  alreadyOwned?: ShelfItem;
  /** Chaque étape doit pouvoir dire pourquoi elle est là. */
  reason: string;
  alternatives: Recommendation[];
  optional: boolean;
  durationMinutes: number;
}

export interface BuiltRoutine {
  request: RoutineBuilderRequest;
  slots: RoutineSlot[];
  totalPrice: number;
  totalItems: number;
  /** Étapes déjà couvertes par l'étagère : aucun achat nécessaire. */
  alreadyCovered: RoutineStep[];
  conflicts: ConflictFinding[];
  /** Ce qui n'a pas pu être pourvu, dit explicitement. */
  unfulfilled: { routineStep: RoutineStep; label: string; reason: string }[];
  cartItems: { productId: string; slug: string; name: string; price: number; quantity: number }[];
  overBudget: boolean;
  overTime: boolean;
  notes: string[];
}

/** Étapes essentielles : sans elles, la routine ne remplit pas sa fonction. */
export const ESSENTIAL_STEPS: RoutineStep[] = ['cleanse', 'condition', 'leave_in'];

const OPTIONAL_STEPS: RoutineStep[] = ['deep_condition', 'seal_oil', 'styling_definer', 'scalp_treatment', 'protein_treatment'];

const STEP_DURATIONS: Record<RoutineStep, number> = {
  cleanse: 8,
  condition: 6,
  deep_condition: 25,
  leave_in: 3,
  seal_oil: 3,
  styling_definer: 5,
  scalp_treatment: 5,
  protein_treatment: 20,
  skin_cleanser: 4,
  skin_treatment: 3,
  skin_moisturizer: 3,
  skin_spf: 2,
  other: 5
};

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  return typeof value === 'string' && (['debutant', 'intermediaire', 'avance'] as string[]).includes(value);
}

export function isRequestedRoutineStep(value: unknown): value is RoutineStep {
  return typeof value === 'string' && (ROUTINE_STEPS as string[]).includes(value);
}

function ownedForStep(shelf: ShelfItem[], step: RoutineStep): ShelfItem | undefined {
  return activeItems(shelf).find(item => item.routineStep === step);
}

/**
 * Nombre d'étapes raisonnable selon le niveau. Un débutant à qui l'on propose
 * huit étapes abandonne la routine en une semaine.
 */
export function maxStepsForLevel(level: ExperienceLevel): number {
  if (level === 'debutant') return 3;
  if (level === 'intermediaire') return 5;
  return 8;
}

export function buildRoutine(
  recommendations: Recommendation[],
  shelf: ShelfItem[],
  request: RoutineBuilderRequest,
  conflicts: ConflictFinding[] = []
): BuiltRoutine {
  const level: ExperienceLevel = isExperienceLevel(request.experienceLevel) ? request.experienceLevel : 'debutant';
  const requested = (request.requestedSteps || []).filter(step => isRequestedRoutineStep(step));
  const availableMinutes = typeof request.availableMinutesPerDay === 'number' && request.availableMinutesPerDay > 0
    ? request.availableMinutesPerDay
    : undefined;

  const wantedSteps = requested.length > 0
    ? requested
    : [...ESSENTIAL_STEPS, ...OPTIONAL_STEPS].slice(0, maxStepsForLevel(level));

  const notes: string[] = [];
  const slots: RoutineSlot[] = [];
  const unfulfilled: BuiltRoutine['unfulfilled'] = [];
  const cartItems: BuiltRoutine['cartItems'] = [];
  let totalPrice = 0;
  let totalItems = 0;
  let totalTime = 0;

  for (const step of wantedSteps) {
    const label = ROUTINE_STEP_LABELS[step];
    const optional = OPTIONAL_STEPS.includes(step);
    const owned = ownedForStep(shelf, step);

    const candidates = recommendations
      .filter(recommendation => !recommendation.excluded && recommendation.product.routineStep === step)
      .slice();

    if (owned) {
      slots.push({
        routineStep: step,
        label,
        recommendation: null,
        alreadyOwned: owned,
        reason: `Vous avez déjà ${owned.freeLabel || 'un produit'} pour cette étape. Aucun achat nécessaire.`,
        alternatives: candidates.slice(0, 3),
        optional,
        durationMinutes: STEP_DURATIONS[step]
      });
      continue;
    }

    const best = candidates[0] || null;
    if (!best) {
      unfulfilled.push({
        routineStep: step,
        label,
        reason: optional
          ? 'Étape optionnelle : aucun produit du catalogue disponible ne la couvre de façon assez vérifiable.'
          : 'Aucun produit du catalogue disponible ne couvre cette étape de façon assez vérifiable. KURLA ne remplit pas une étape avec un produit approximatif.'
      });
      slots.push({
        routineStep: step,
        label,
        recommendation: null,
        reason: 'Aucune proposition vérifiable pour cette étape.',
        alternatives: [],
        optional,
        durationMinutes: STEP_DURATIONS[step]
      });
      continue;
    }

    const price = best.product.price;
    if (request.budgetLimit !== undefined && totalPrice + price > request.budgetLimit) {
      unfulfilled.push({
        routineStep: step,
        label,
        reason: `Ajout refusé : ${best.product.name} (${price} €) ferait dépasser le budget de ${request.budgetLimit} €.`
      });
      slots.push({
        routineStep: step,
        label,
        recommendation: null,
        reason: `Écarté pour rester dans le budget. Alternative la moins chère retenue si disponible.`,
        alternatives: candidates.slice(1, 4),
        optional,
        durationMinutes: STEP_DURATIONS[step]
      });
      continue;
    }

    totalPrice = Number((totalPrice + price).toFixed(2));
    totalItems += 1;
    totalTime += STEP_DURATIONS[step];
    cartItems.push({
      productId: best.product.id,
      slug: best.product.slug,
      name: best.product.name,
      price,
      quantity: 1
    });

    const baseReason = best.baseReasons[0] || 'Produit le mieux classé pour cette étape d’après votre profil.';
    const adjustmentNote = best.adjustments
      .filter(adjustment => adjustment.kind === 'positive_outcome' || adjustment.kind === 'negative_outcome')
      .map(adjustment => adjustment.reason);

    slots.push({
      routineStep: step,
      label,
      recommendation: best,
      reason: [baseReason, ...adjustmentNote].join(' '),
      alternatives: candidates.slice(1, 4),
      optional,
      durationMinutes: STEP_DURATIONS[step]
    });
  }

  const alreadyCovered = slots.filter(slot => slot.alreadyOwned).map(slot => slot.routineStep);
  const overTime = availableMinutes !== undefined && totalTime > availableMinutes;
  if (overTime) {
    notes.push(`Cette routine demande environ ${totalTime} minutes par jour pour ${availableMinutes} déclarées. Retirez une étape optionnelle ou espacez les soins profonds.`);
  }
  if (unfulfilled.some(item => !OPTIONAL_STEPS.includes(item.routineStep))) {
    notes.push('Au moins une étape essentielle n’a pas pu être pourvue. Une routine incomplète sur l’essentiel ne doit pas être présentée comme complète.');
  }
  if (alreadyCovered.length > 0) {
    notes.push(`${alreadyCovered.length} étape(s) déjà couverte(s) par votre étagère : elles ne sont pas ajoutées au panier.`);
  }
  if (conflicts.length > 0) {
    notes.push(`${conflicts.length} incompatibilité(s) détectée(s) entre les produits proposés. Ne les utilisez pas le même jour sans espacer les applications.`);
  }

  return {
    request,
    slots,
    totalPrice,
    totalItems,
    alreadyCovered,
    conflicts,
    unfulfilled,
    cartItems,
    overBudget: request.budgetLimit !== undefined && totalPrice > request.budgetLimit,
    overTime,
    notes
  };
}

/**
 * Remplacement d'un maillon. L'utilisateur doit pouvoir changer un seul produit
 * sans reconstruire toute la routine — et voir l'effet sur le prix.
 */
export function substituteSlot(
  routine: BuiltRoutine,
  routineStep: RoutineStep,
  replacement: EngineProduct
): BuiltRoutine {
  const slots = routine.slots.map(slot => {
    if (slot.routineStep !== routineStep) return slot;
    const currentPrice = slot.recommendation?.product.price ?? 0;
    return {
      ...slot,
      recommendation: {
        ...(slot.recommendation as Recommendation),
        product: replacement
      },
      reason: `Substitution demandée : ${replacement.name} remplace ${slot.recommendation?.product.name ?? 'la proposition initiale'}.`,
      alternatives: [slot.recommendation, ...slot.alternatives].filter(Boolean) as Recommendation[]
    };
  });

  const cartItems = slots
    .filter(slot => slot.recommendation)
    .map(slot => ({
      productId: slot.recommendation!.product.id,
      slug: slot.recommendation!.product.slug,
      name: slot.recommendation!.product.name,
      price: slot.recommendation!.product.price,
      quantity: 1
    }));

  const totalPrice = Number(cartItems.reduce((sum, item) => sum + item.price, 0).toFixed(2));

  return {
    ...routine,
    slots,
    cartItems,
    totalPrice,
    totalItems: cartItems.length,
    overBudget: routine.request.budgetLimit !== undefined && totalPrice > routine.request.budgetLimit
  };
}
