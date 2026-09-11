/**
 * ADÉQUATION AU STYLE PORTÉ — la couche qui manquait au moteur.
 *
 * Constat à l'origine de ce module : `calculateKurlaFit` calcule
 * `(needs - unmetNeeds) / needs * 100`. C'est un **ratio booléen** : chaque
 * besoin compte pareil. Un produit portant un seul besoin couvert score 100,
 * un produit pertinent sur deux besoins sur trois score 67. Le moteur sait
 * donc dire « ce produit correspond », pas « ce produit est le bon conseil
 * pour cette personne, dans cette coiffure, à ce stade ».
 *
 * Symptôme observé : une personne portant des locks recevait des
 * recommandations « tout juste » — dont des définitions de boucles, qui pour
 * des locks sont une erreur de catégorie et non une nuance.
 *
 * Ce module n'invente aucune propriété cosmétique. Il n'utilise que :
 *  - le style déclaré dans Hair ID (`hair.protectiveStyles`, `hair.texturePatterns`) ;
 *  - le rôle du produit dans la routine (`routineStep`), déjà au catalogue ;
 *  - les retours d'usage de l'utilisateur (`OutcomeObservation.signal`).
 *
 * Ce qu'il ne sait PAS est dit, pas estimé : le caractère occlusif d'une
 * formule n'est déclaré nulle part au catalogue. La mise en garde sur les
 * résidus est donc fondée sur le rôle du produit, et sa limite est affichée.
 */

import { BeautyProfile } from './beautyProfile';
import { OutcomeObservation, OutcomeSignal } from './outcomeEvidence';

/** Style porté, déduit du profil. `aucun` inclut « non renseigné ». */
export type StyleContext = 'locks' | 'tresses' | 'perruque' | 'autre_protege' | 'aucun';

export interface StyleRule {
  label: string;
  /** Besoins au cœur de la situation : ils doivent dominer le classement. */
  centralNeeds: string[];
  /** Besoins utiles mais secondaires. */
  secondaryNeeds: string[];
  /**
   * Besoins sans objet dans ce style. Les recommander n'est pas une nuance
   * discutable, c'est une erreur de catégorie : on ne « définit » pas des
   * locks, on ne coiffe pas des boucles sous une perruque.
   */
  notApplicableNeeds: string[];
  /**
   * Vrai quand un résidu ne peut pas être éliminé par un rinçage ordinaire.
   * Pour les locks, un produit qui laisse un film reste **à l'intérieur** de
   * la mèche : il ne part pas au lavage suivant. C'est le risque central.
   */
  residueSensitive: boolean;
}

export const STYLE_RULES: Record<Exclude<StyleContext, 'aucun'>, StyleRule> = {
  locks: {
    label: 'locks',
    centralNeeds: ['entretenir_locks', 'cuir_chevelu', 'apaiser_cuir_chevelu'],
    secondaryNeeds: ['hydrater_cheveux', 'reduire_casse'],
    notApplicableNeeds: ['definir_boucles', 'reduire_frisottis'],
    residueSensitive: true
  },
  tresses: {
    label: 'tresses',
    centralNeeds: ['entretenir_tresses', 'cuir_chevelu', 'apaiser_cuir_chevelu'],
    secondaryNeeds: ['hydrater_cheveux', 'reduire_casse', 'proteger_nuit'],
    notApplicableNeeds: ['definir_boucles'],
    residueSensitive: false
  },
  perruque: {
    label: 'perruque',
    centralNeeds: ['entretenir_perruque', 'cuir_chevelu', 'apaiser_cuir_chevelu'],
    secondaryNeeds: ['hydrater_cheveux', 'proteger_nuit'],
    notApplicableNeeds: ['definir_boucles', 'reduire_frisottis'],
    residueSensitive: false
  },
  autre_protege: {
    label: 'style protecteur',
    centralNeeds: ['entretenir_tresses', 'cuir_chevelu'],
    secondaryNeeds: ['hydrater_cheveux', 'reduire_casse', 'proteger_nuit'],
    notApplicableNeeds: [],
    residueSensitive: false
  }
};

/**
 * Étapes dont le produit **reste** sur la fibre sans rinçage complet. Sous
 * locks, ce sont les plus exposées au résidu. À l'inverse, `cleanse` et
 * `scalp_treatment` sont celles dont une personne lockée a le plus besoin :
 * le cuir chevelu reste accessible, les longueurs ne se rincent pas.
 */
const RESIDUE_EXPOSED_STEPS = ['leave_in', 'seal_oil', 'styling_definer', 'deep_condition', 'protein_treatment'];
const SCALP_PRIORITY_STEPS = ['cleanse', 'scalp_treatment'];

export const RESIDUE_LIMITATION =
  'Le caractère occlusif de la formule n’est déclaré nulle part au catalogue : cette mise en garde se fonde sur le rôle du produit dans la routine, pas sur une propriété mesurée.';

/** Déduit le style porté. Les locks priment : c'est la contrainte la plus forte. */
export function detectStyleContext(profile: BeautyProfile | undefined): StyleContext {
  if (!profile) return 'aucun';
  const styles = (profile.hair.protectiveStyles || []).filter(v => v && v !== 'inconnu' && v !== 'aucun');
  const textures = (profile.hair.texturePatterns || []).filter(v => v && v !== 'inconnu');
  const has = (value: string) => styles.includes(value) || textures.includes(value);

  if (has('locks')) return 'locks';
  if (has('tresses') || has('twists') || has('vanilles')) return 'tresses';
  if (has('perruque')) return 'perruque';
  if (styles.length > 0) return 'autre_protege';
  return 'aucun';
}

export interface StyleAdjustment {
  delta: number;
  reason: string;
  /** Preuve citable : le champ du profil ou l'observation qui fonde l'écart. */
  evidence?: string;
  /** Ce que KURLA ne peut pas établir. Affiché, jamais masqué. */
  limitation?: string;
}

export interface StyleFitAssessment {
  context: StyleContext;
  adjustments: StyleAdjustment[];
  /** Vrai si au moins un besoin sans objet a été détecté. */
  hasCategoryError: boolean;
}

export const STYLE_CENTRAL_BONUS = 22;
export const STYLE_SECONDARY_BONUS = 8;
export const STYLE_CATEGORY_ERROR_PENALTY = 45;
export const STYLE_RESIDUE_CAUTION = 18;
export const STYLE_SCALP_PRIORITY_BONUS = 12;

/**
 * Évalue l'adéquation d'un produit au style porté.
 *
 * Ne modifie pas le score de base : le moteur ajoute ces écarts aux autres,
 * avec leur motif. Un écart sans motif n'est pas acceptable ici.
 */
export function assessStyleFit(
  product: { needs?: string[]; concerns?: string[]; routineStep?: string; name: string },
  profile: BeautyProfile | undefined
): StyleFitAssessment {
  const context = detectStyleContext(profile);
  if (context === 'aucun') return { context, adjustments: [], hasCategoryError: false };

  const rule = STYLE_RULES[context];
  const productNeeds = Array.from(new Set([...(product.needs || []), ...(product.concerns || [])]));
  const declaredStyles = (profile?.hair.protectiveStyles || []).filter(v => v && v !== 'inconnu');
  const adjustments: StyleAdjustment[] = [];
  let hasCategoryError = false;

  // 1. Besoin sans objet dans ce style : erreur de catégorie.
  const categoryErrors = productNeeds.filter(need => rule.notApplicableNeeds.includes(need));
  if (categoryErrors.length > 0) {
    hasCategoryError = true;
    adjustments.push({
      delta: -STYLE_CATEGORY_ERROR_PENALTY,
      reason: `Vous portez des ${rule.label} : « ${categoryErrors.join(', ')} » ne s'applique pas à ce style. Ce produit répond à une autre situation que la vôtre.`,
      evidence: `hair.protectiveStyles = ${declaredStyles.join(', ')}`
    });
  }

  // 2. Besoin central : il doit dominer, pas être compté comme les autres.
  const central = productNeeds.filter(need => rule.centralNeeds.includes(need));
  if (central.length > 0) {
    adjustments.push({
      delta: STYLE_CENTRAL_BONUS,
      reason: `« ${central.join(', ')} » est au cœur de l'entretien des ${rule.label}, pas un besoin parmi d'autres.`,
      evidence: `hair.protectiveStyles = ${declaredStyles.join(', ')}`
    });
  } else {
    const secondary = productNeeds.filter(need => rule.secondaryNeeds.includes(need));
    if (secondary.length > 0) {
      adjustments.push({
        delta: STYLE_SECONDARY_BONUS,
        reason: `« ${secondary.join(', ')} » reste utile avec des ${rule.label}, sans être la priorité.`,
        evidence: `hair.protectiveStyles = ${declaredStyles.join(', ')}`
      });
    }
  }

  // 3. Résidu : le risque propre aux locks.
  const step = product.routineStep || '';
  if (rule.residueSensitive && RESIDUE_EXPOSED_STEPS.includes(step)) {
    adjustments.push({
      delta: -STYLE_RESIDUE_CAUTION,
      reason:
        `Ce produit s'applique sans rinçage complet (${step.replaceAll('_', ' ')}). Sous ${rule.label}, un résidu ne part pas au lavage suivant : il reste dans la mèche. ` +
        'Préférez une texture fluide, en petite quantité, et un lavage clarifiant régulier.',
      evidence: `routineStep = ${step}`,
      limitation: RESIDUE_LIMITATION
    });
  }

  // 4. Accès au cuir chevelu : ce qui compte vraiment sous locks.
  if (rule.residueSensitive && SCALP_PRIORITY_STEPS.includes(step)) {
    adjustments.push({
      delta: STYLE_SCALP_PRIORITY_BONUS,
      reason: `Étape « ${step.replaceAll('_', ' ')} » : sous ${rule.label}, le cuir chevelu est la seule zone réellement accessible et rinçable. C'est là que se joue l'entretien.`,
      evidence: `routineStep = ${step}`
    });
  }

  return { context, adjustments, hasCategoryError };
}

/**
 * Poids d'un retour d'usage selon son signal.
 *
 * `learnIngredientWeights` ne lisait que `valence` : un « résidus accumulés »
 * et un « je n'aime pas l'odeur » pesaient pareil. Sous locks, le résidu est
 * LE mode d'échec — il ne se corrige pas en changeant de marque au prochain
 * achat, il s'accumule. Il doit peser davantage.
 */
export function signalWeight(signal: OutcomeSignal, context: StyleContext): number {
  if (context === 'locks' && (signal === 'buildup' || signal === 'product_heavy')) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// CHANTIER B — risque de traction
// ---------------------------------------------------------------------------

import type { ProtectiveStyle, ProtectiveStyleEpisode, TractionRiskAssessment } from './protectiveStyle';
import { assessTractionRisk } from './protectiveStyle';

/**
 * `assessTractionRisk` existait, entièrement écrit — durée pondérée par la
 * tension, signaux d'escalade, protocole de récupération, limites explicites —
 * et n'était importé par **aucun** moteur de recommandation. Vérifié par grep
 * avant ce chantier. La donnée, elle, est déjà persistée :
 * `public.protective_style_episodes` est écrite et lue par `intelligenceStore`.
 * Il ne manquait que le branchement.
 */

const STYLE_TO_CONTEXT: Record<ProtectiveStyle, StyleContext> = {
  locs: 'locks',
  braids: 'tresses',
  knotless_braids: 'tresses',
  twists: 'tresses',
  cornrows: 'tresses',
  wig: 'perruque',
  weave: 'autre_protege',
  buns: 'autre_protege',
  other: 'autre_protege'
};

export function styleContextOf(style: ProtectiveStyle): StyleContext {
  return STYLE_TO_CONTEXT[style] ?? 'autre_protege';
}

/** Un épisode clos ne dit rien du présent. */
export function isOpenEpisode(episode: ProtectiveStyleEpisode): boolean {
  return !episode.removedAt;
}

/**
 * Sous risque de traction, la priorité se déplace : ce qui compte n'est plus
 * la fibre mais le cuir chevelu et la réduction de toute manipulation.
 *
 * Ces écarts ne remplacent jamais la recommandation du modèle de traction —
 * ils la secondent. Un produit ne peut pas compenser une coiffure trop serrée,
 * et le dire serait une promesse de santé que KURLA ne peut pas tenir.
 */
export const TRACTION_SCALP_BONUS: Record<TractionRiskAssessment['riskLevel'], number> = {
  low: 0,
  moderate: 10,
  elevated: 20,
  high: 30
};
export const TRACTION_MANIPULATION_PENALTY: Record<TractionRiskAssessment['riskLevel'], number> = {
  low: 0,
  moderate: 0,
  elevated: -10,
  high: -22
};

/** Étapes qui ajoutent du poids aux racines ou imposent une manipulation. */
const MANIPULATION_STEPS = ['styling_definer', 'seal_oil', 'deep_condition', 'protein_treatment'];

export interface TractionFitResult {
  adjustments: StyleAdjustment[];
  /** La recommandation du modèle, reprise telle quelle : elle prime sur tout. */
  recommendation: string;
  limitations: string[];
}

export function assessTractionFit(
  product: { needs?: string[]; concerns?: string[]; routineStep?: string },
  assessment: TractionRiskAssessment
): TractionFitResult {
  const adjustments: StyleAdjustment[] = [];
  const needs = Array.from(new Set([...(product.needs || []), ...(product.concerns || [])]));
  const step = product.routineStep || '';

  const scalpBonus = TRACTION_SCALP_BONUS[assessment.riskLevel];
  if (scalpBonus > 0 && (needs.includes('apaiser_cuir_chevelu') || needs.includes('cuir_chevelu') || step === 'scalp_treatment')) {
    adjustments.push({
      delta: scalpBonus,
      reason:
        `Risque de traction ${assessment.riskLevel} (${assessment.wearDays}/${assessment.maxWearDays} jours, tension ${assessment.tensionFactor}). ` +
        'Le cuir chevelu devient la priorité devant la fibre.',
      evidence: `episode ${assessment.episodeId}`
    });
  }

  const manipulation = TRACTION_MANIPULATION_PENALTY[assessment.riskLevel];
  if (manipulation < 0 && MANIPULATION_STEPS.includes(step)) {
    adjustments.push({
      delta: manipulation,
      reason:
        `Cette étape (${step.replaceAll('_', ' ')}) ajoute du poids aux racines ou impose une manipulation. ` +
        `Avec un risque de traction ${assessment.riskLevel}, ce n'est pas le moment.`,
      evidence: `episode ${assessment.episodeId}`
    });
  }

  return { adjustments, recommendation: assessment.recommendation, limitations: assessment.limitations };
}

/** Évalue un épisode ouvert s'il existe. Retourne null si aucun épisode actif. */
export function assessOpenEpisode(
  product: { needs?: string[]; concerns?: string[]; routineStep?: string },
  episode: ProtectiveStyleEpisode | undefined,
  now = new Date()
): TractionFitResult | null {
  if (!episode || !isOpenEpisode(episode)) return null;
  return assessTractionFit(product, assessTractionRisk(episode, now));
}
