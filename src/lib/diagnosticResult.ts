import type { AIRecommendationResult, Product } from '../types';
import { getProductTruth } from './catalogTruth';
import { pickSkinKnowledgeProfile, type SkinKnowledgeProfile } from './knowledge/skin';
import {
  ADVISORY_LOOP_NOTE,
  buildSkinAdvisoryRoutine,
  buildSkinAdvisorySummary,
  pickSkinLessons,
  pickSkinObservations,
  type SkinLesson,
  type SkinObservation,
} from './knowledge/skinAdvisory';

export type DiagnosticAvailability = 'available' | 'preorder' | 'pending_validation' | 'formulation_target' | 'unavailable';

export interface DiagnosticProfileField {
  key: string;
  label: string;
  value: string;
  known: boolean;
}

export interface DiagnosticResultProduct {
  product: Product;
  availability: DiagnosticAvailability;
  availabilityLabel: string;
  availabilityMessage: string;
  actionLabel: string;
  actionable: boolean;
  countryLabel: string;
  price: number | null;
  why: string;
}

export interface DiagnosticRoutineStep {
  label: string;
  action: string;
  why: string;
  /** Usage concret (quantité, ordre, fréquence) — couche conseil KURLA Skin. */
  how?: string;
  /** Horizon honnête, zéro promesse de résultat — couche conseil KURLA Skin. */
  expect?: string;
}

export interface DiagnosticResultModel {
  isSkin: boolean;
  generatedWithAI: boolean;
  aiLabel: string;
  profileFields: DiagnosticProfileField[];
  certain: string[];
  unknown: string[];
  priorities: string[];
  morning: DiagnosticRoutineStep[];
  evening: DiagnosticRoutineStep[];
  weekly: DiagnosticRoutineStep[];
  products: DiagnosticResultProduct[];
  followUp: {
    firstObservation: string;
    nextObservation: string;
    journalHref: string;
    shelfHref: string;
  };
  warnings: string[];
  summary: string;
  skinKnowledgeProfile: SkinKnowledgeProfile | null;
  /** Leçons pédagogiques sélectionnées sur les préoccupations déclarées (peau uniquement). */
  lessons: SkinLesson[];
  /** Observations suivies J+7 / J+14 / J+30 (peau uniquement). */
  observations: SkinObservation[];
  /** Note sur la boucle de réévaluation J+30 (peau uniquement). */
  advisoryLoop: string | null;
}

const UNKNOWN = new Set(['', 'inconnu', 'inconnue', 'unknown', 'undefined', 'null']);

const LABELS: Record<string, string> = {
  mixte: 'Mixte', normale: 'Normale', seche: 'Sèche', tres_seche: 'Très sèche', grasse: 'Grasse', sensible: 'Sensible', deshydratee: 'Déshydratée', mature: 'Mature',
  clair: 'Clair', intermediaire: 'Intermédiaire', fonce: 'Foncé', tres_fonce: 'Très foncé',
  faible: 'Faible', moyenne: 'Moyenne', elevee: 'Élevée', forte: 'Forte',
  taches: 'Taches / HPI', teint_terne: 'Teint terne', teint_non_uniforme: 'Teint non uniforme', imperfections: 'Imperfections',
  secheresse: 'Sécheresse', deshydratation: 'Déshydratation', sensibilite: 'Sensibilité', protection_solaire: 'Protection solaire',
  hydrater: 'Hydratation', eclat: 'Éclat', uniformiser: 'Uniformiser le teint', attenuer_taches: 'Atténuer les taches', apaiser: 'Apaiser',
  reduire_imperfections: 'Réduire les imperfections', renforcer_barriere: 'Renforcer la barrière', proteger_spf: 'Protection solaire',
  gel: 'Gel', lotion: 'Lotion', creme: 'Crème', baume: 'Baume', mat: 'Mat', naturel: 'Naturel', glowy: 'Glowy',
  moins_40: 'Moins de 40 € / mois', '40_70': '40–70 € / mois', '70_100': '70–100 € / mois', premium: 'Premium',
  quotidien: 'Tous les jours', parfois: 'Parfois', jamais: 'Jamais', recherche: 'Recherche SPF sans trace blanche',
  parfum: 'Parfum', frequente: 'Fréquente',
  aucune: 'Aucune', basique: 'Basique', complete: 'Complète',
};

function isKnown(value: unknown): value is string {
  return typeof value === 'string' && !UNKNOWN.has(value.trim().toLowerCase());
}

export function displayDiagnosticValue(value: unknown): string {
  if (!isKnown(value)) return 'Non renseigné';
  const raw = String(value);
  return LABELS[raw] || raw.replaceAll('_', ' ');
}

function arrayValues(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isKnown).map(displayDiagnosticValue) : [];
}

function availabilityFor(product: Product): { availability: DiagnosticAvailability; label: string; message: string; action: string; actionable: boolean } {
  // /api/products returns the server's already-computed truth projection. Do
  // not recompute it in the browser: governance fields are intentionally not
  // public and a client-side recomputation would downgrade a valid product.
  const projected = product.availabilityState;
  if (projected === 'available') return { availability: 'available', label: product.availabilityLabel || 'Disponible', message: product.availabilityMessage || 'Référence vérifiée et achetable.', action: 'Ajouter', actionable: product.inStock === true };
  if (projected === 'preorder') return { availability: 'preorder', label: product.availabilityLabel || 'Précommande', message: product.availabilityMessage || 'Référence vérifiée, délai à confirmer sur la fiche.', action: 'Voir la fiche', actionable: false };
  if (projected === 'formulation_target') return { availability: 'formulation_target', label: product.availabilityLabel || 'Formulation cible', message: product.availabilityMessage || 'Cette cible n’est pas un produit achetable.', action: 'Non achetable', actionable: false };
  if (projected === 'pending_validation' || projected === 'placeholder' || projected === 'draft') return { availability: 'pending_validation', label: product.availabilityLabel || 'Validation en cours', message: product.availabilityMessage || 'La référence n’est pas encore publiable.', action: 'Voir la fiche', actionable: false };
  if (projected === 'unavailable') return { availability: 'unavailable', label: product.availabilityLabel || 'Indisponible', message: product.availabilityMessage || 'Cette référence n’est pas disponible actuellement.', action: 'Indisponible', actionable: false };

  // Pure callers/tests and old cached catalog payloads use the shared truth
  // function as a conservative fallback.
  const truth = getProductTruth(product);
  if (truth.commercialState === 'formulation_target') return { availability: 'formulation_target', label: truth.availabilityLabel, message: truth.availabilityMessage, action: 'Non achetable', actionable: false };
  if (truth.commercialState === 'pending_validation' || truth.commercialState === 'placeholder' || truth.commercialState === 'draft') return { availability: 'pending_validation', label: truth.availabilityLabel, message: truth.availabilityMessage, action: 'Voir la fiche', actionable: false };
  if (truth.commercialState === 'preorder') return { availability: 'preorder', label: truth.availabilityLabel, message: truth.availabilityMessage, action: 'Voir la fiche', actionable: false };
  if (truth.commercialState === 'unavailable') return { availability: 'unavailable', label: truth.availabilityLabel, message: truth.availabilityMessage, action: 'Indisponible', actionable: false };
  return { availability: 'available', label: truth.availabilityLabel, message: truth.availabilityMessage, action: 'Ajouter', actionable: truth.isCheckoutEligible };
}

function countryLabel(product: Product): string {
  if (Array.isArray(product.countryAvailability) && product.countryAvailability.length > 0) {
    return product.countryAvailability.includes('FR') ? 'France' : 'France non confirmée';
  }
  if (product.shippingInfo?.countries?.includes('FR')) return 'France';
  return 'Pays à confirmer';
}

function whyFor(product: Product, priorities: string[]): string {
  const step = `${product.routineStep} ${product.name}`.toLowerCase();
  if (/spf|solair|protection/.test(step)) return 'Protection du matin et soutien de la prévention des marques ; l’absence de trace blanche doit être prouvée séparément.';
  if (/nettoy|clean/.test(step)) return 'Première étape : retirer les impuretés sans remplacer l’observation de la tolérance.';
  if (/hydrat|crème|creme|barrière|barriere|squalane|céramide|ceramide/.test(step)) return 'Soutient le confort et la barrière cutanée, selon le besoin déclaré.';
  if (/serum|niacin|azel|vitamine|tache|hpi|bha|aha/.test(step)) return priorities.length ? `Étape ciblée reliée à ${priorities.slice(0, 2).join(' et ')}.` : 'Étape ciblée proposée à partir des réponses déclarées.';
  return 'Référence proposée à partir des réponses du questionnaire et du catalogue serveur.';
}

function profileFields(answers: Record<string, unknown>, isSkin: boolean): DiagnosticProfileField[] {
  if (!isSkin) {
    return [
      ['texture', 'Texture'], ['porosity', 'Porosité'], ['priority', 'Besoin prioritaire'], ['budget', 'Budget']
    ].map(([key, label]) => ({ key, label, value: displayDiagnosticValue(answers[key]), known: isKnown(answers[key]) }));
  }
  const fields: Array<[string, string, unknown]> = [
    ['skinType', 'Type de peau', answers.skinType],
    ['skinConcerns', 'Préoccupations', arrayValues(answers.skinConcerns).join(', ')],
    ['skinObjectives', 'Objectifs', arrayValues(answers.skinObjectives).join(', ')],
    ['sensitivity', 'Sensibilité', answers.sensitivity],
    ['budget', 'Budget peau', answers.budget],
    ['texturePreference', 'Texture préférée', answers.texturePreference],
    ['finishPreference', 'Fini préféré', answers.finishPreference],
    ['hyperpigmentationTendency', 'Tendance HPI déclarée', answers.hyperpigmentationTendency],
    ['sensitivities', 'Sensibilités déclarées', arrayValues(answers.sensitivities).join(', ')],
    ['spfUsage', 'Usage SPF déclaré', answers.spfUsage],
    ['currentRoutine', 'Routine existante', answers.currentRoutine || answers.routine],
  ];
  if (answers.phototypeConsent === true && answers.phototype !== undefined && answers.phototype !== null) fields.push(['phototype', 'Phototype déclaré', `Phototype ${answers.phototype}`]);
  return fields.map(([key, label, value]) => ({ key, label, value: Array.isArray(value) ? value.map(displayDiagnosticValue).join(', ') || 'Non renseigné' : displayDiagnosticValue(value), known: Array.isArray(value) ? value.length > 0 : isKnown(value) }));
}

/**
 * Routine peau : produite par la couche conseil (`knowledge/skinAdvisory`),
 * qui adapte chaque étape au contexte déclaré (type, hydratation, sensibilité,
 * préoccupations) et porte pourquoi / comment / à attendre sur chaque étape.
 * Le contrat est assuré par le banc `kurla_diagnostic_advisory`.
 */
function routineForSkin(answers: Record<string, unknown>): Pick<DiagnosticResultModel, 'morning' | 'evening' | 'weekly'> {
  return buildSkinAdvisoryRoutine({
    skinType: typeof answers.skinType === 'string' ? answers.skinType : undefined,
    hydrationLevel: typeof answers.hydrationLevel === 'string' ? answers.hydrationLevel : undefined,
    sensitivity: typeof answers.sensitivity === 'string' ? answers.sensitivity : undefined,
    sensitivities: Array.isArray(answers.sensitivities) ? answers.sensitivities.filter((value): value is string => typeof value === 'string') : undefined,
    skinConcerns: Array.isArray(answers.skinConcerns) ? answers.skinConcerns.filter((value): value is string => typeof value === 'string') : undefined,
    skinObjectives: Array.isArray(answers.skinObjectives) ? answers.skinObjectives.filter((value): value is string => typeof value === 'string') : undefined,
    hyperpigmentationTendency: typeof answers.hyperpigmentationTendency === 'string' ? answers.hyperpigmentationTendency : undefined,
    spfUsage: typeof answers.spfUsage === 'string' ? answers.spfUsage : undefined,
    acne: typeof answers.acne === 'string' ? answers.acne : undefined,
  });
}

function routineForHair(result: AIRecommendationResult | null): Pick<DiagnosticResultModel, 'morning' | 'evening' | 'weekly'> {
  const steps = result?.steps?.slice(0, 6) || [];
  const items = steps.length ? steps : ['Commencer par une routine courte.', 'Introduire un seul changement à la fois.', 'Observer la tolérance.'];
  return {
    morning: items.slice(0, 2).map((action, i) => ({ label: String(i + 1), action, why: 'Étape issue du résultat calculé.' })),
    evening: items.slice(2, 4).map((action, i) => ({ label: String(i + 1), action, why: 'Étape issue du résultat calculé.' })),
    weekly: items.slice(4).map((action, i) => ({ label: 'Hebdo', action, why: 'À ajuster selon les observations.' })),
  };
}

export function buildDiagnosticResultModel(input: {
  answers: Record<string, unknown>;
  result: AIRecommendationResult | null;
  products: Product[];
  isSkin: boolean;
}): DiagnosticResultModel {
  const { answers, result, products, isSkin } = input;
  const priorities = isSkin
    ? [...arrayValues(answers.skinConcerns), ...arrayValues(answers.skinObjectives)].filter((value, index, list) => list.indexOf(value) === index).slice(0, 3)
    : [displayDiagnosticValue(answers.priority)].filter(value => value !== 'Non renseigné');
  const fields = profileFields(answers, isSkin);
  const certain = fields.filter(field => field.known).map(field => `${field.label} : ${field.value}`);
  const unknown = fields.filter(field => !field.known).map(field => field.label);
  const routine = isSkin ? routineForSkin(answers) : routineForHair(result);
  const advisoryCtx = {
    skinType: typeof answers.skinType === 'string' ? answers.skinType : undefined,
    hydrationLevel: typeof answers.hydrationLevel === 'string' ? answers.hydrationLevel : undefined,
    sensitivity: typeof answers.sensitivity === 'string' ? answers.sensitivity : undefined,
    sensitivities: Array.isArray(answers.sensitivities) ? answers.sensitivities.filter((value): value is string => typeof value === 'string') : undefined,
    skinConcerns: Array.isArray(answers.skinConcerns) ? answers.skinConcerns.filter((value): value is string => typeof value === 'string') : undefined,
    skinObjectives: Array.isArray(answers.skinObjectives) ? answers.skinObjectives.filter((value): value is string => typeof value === 'string') : undefined,
    hyperpigmentationTendency: typeof answers.hyperpigmentationTendency === 'string' ? answers.hyperpigmentationTendency : undefined,
    spfUsage: typeof answers.spfUsage === 'string' ? answers.spfUsage : undefined,
    acne: typeof answers.acne === 'string' ? answers.acne : undefined,
  };
  const skinKnowledgeProfile = isSkin ? pickSkinKnowledgeProfile({
    acne: typeof answers.acne === 'string' ? answers.acne : undefined,
    skinConcerns: Array.isArray(answers.skinConcerns) ? answers.skinConcerns.filter((value): value is string => typeof value === 'string') : undefined,
    skinObjectives: Array.isArray(answers.skinObjectives) ? answers.skinObjectives.filter((value): value is string => typeof value === 'string') : undefined,
    skinType: typeof answers.skinType === 'string' ? answers.skinType : undefined,
    hydrationLevel: typeof answers.hydrationLevel === 'string' ? answers.hydrationLevel : undefined,
    hyperpigmentationTendency: typeof answers.hyperpigmentationTendency === 'string' ? answers.hyperpigmentationTendency : undefined,
  }) : null;
  const handles = new Set(result?.productHandles || []);
  const productsInResult = products.filter(product => handles.has(product.slug) || handles.has(product.id));
  const productCards = productsInResult.map(product => {
    const availability = availabilityFor(product);
    return {
      product,
      availability: availability.availability,
      availabilityLabel: availability.label,
      availabilityMessage: availability.message,
      actionLabel: availability.action,
      actionable: availability.actionable,
      countryLabel: countryLabel(product),
      price: (availability.availability === 'available' || availability.availability === 'preorder') && Number.isFinite(product.price) ? product.price : null,
      why: whyFor(product, priorities),
    };
  });
  const generatedWithAI = result?.generatedWithAI === true;
  return {
    isSkin,
    generatedWithAI,
    aiLabel: generatedWithAI ? 'Généré avec aide IA' : 'Calculé à partir de vos réponses',
    profileFields: fields,
    certain,
    unknown,
    priorities,
    morning: routine.morning,
    evening: routine.evening,
    weekly: routine.weekly,
    products: productCards,
    followUp: {
      firstObservation: 'J+0 · noter le confort et toute réaction',
      nextObservation: 'J+7 · comparer la tolérance et la régularité',
      journalHref: isSkin ? '/peau/journal' : '/account/progress',
      shelfHref: isSkin ? '/account/shelf?cat=peau' : '/account/shelf',
    },
    warnings: [
      ...(result?.warnings || []),
      'Conseil cosmétique : ce résultat ne constitue pas un avis médical ni un diagnostic.',
    ].filter((warning, index, list) => list.indexOf(warning) === index),
    summary: result?.summary || (isSkin ? buildSkinAdvisorySummary(advisoryCtx, priorities) : 'Résultat calculé à partir des réponses déclarées.'),
    skinKnowledgeProfile,
    lessons: isSkin ? pickSkinLessons(advisoryCtx) : [],
    observations: isSkin ? pickSkinObservations(advisoryCtx) : [],
    advisoryLoop: isSkin ? ADVISORY_LOOP_NOTE : null,
  };
}
