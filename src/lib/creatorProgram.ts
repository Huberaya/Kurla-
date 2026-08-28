import { SIGNAL_VALENCE, isOutcomeSignal } from './outcomeEvidence';

/**
 * CHANTIER 8.6c1 — PROGRAMME EXPERTS / CRÉATEURS (39) + RÉMUNÉRATION AU
 * RÉSULTAT (40).
 *
 * Module pur : aucune lecture de base, aucun réseau. Tout est testable.
 *
 * ---------------------------------------------------------------------------
 * LES DEUX RÈGLES QUI FONT CE PROGRAMME
 * ---------------------------------------------------------------------------
 * 1. **La visibilité ne s'achète pas.** Le score de visibilité est une fonction
 *    des contributions vérifiées, des appuis de professionnels et des résultats
 *    déclarés — jamais d'un budget. Le type ne comporte aucun champ de paiement,
 *    et le banc vérifie que deux dossiers identiques hormis une propriété
 *    `budget` ajoutée en contrebande obtiennent exactement le même score.
 *
 * 2. **Un clic ne vaut rien, par construction.** `ATTRIBUTION_VALUES` met
 *    clic, ajout au shelf et achat à **0**. Seul un résultat déclaré par le
 *    membre compte. Ce n'est pas un réglage : c'est la table de valeurs.
 *
 * ---------------------------------------------------------------------------
 * LE PIÈGE ÉVITÉ
 * ---------------------------------------------------------------------------
 * Payer uniquement les résultats positifs fabriquerait des créateurs
 * intéressés à la satisfaction, et découragerait les déclarations honnêtes.
 * Ici le taux est **identique quel que soit le signe du résultat** : le créateur
 * est rémunéré pour avoir provoqué un usage informé et un retour honeste, pas
 * pour un résultat agréable.
 *
 * La contrepartie est une garde : au-delà d'une part de résultats négatifs, la
 * rémunération part en revue plutôt que d'être versée. On ne réduit pas le taux
 * (ce qui recréerait le biais), on suspend et on regarde.
 */

// ---------------------------------------------------------------------------
// 39 — Profils et statut
// ---------------------------------------------------------------------------

export type CreatorKind = 'expert' | 'creator';
export type CreatorStatus = 'applied' | 'verified' | 'published' | 'rejected' | 'suspended';

export const isCreatorKind = (value: unknown): value is CreatorKind =>
  value === 'expert' || value === 'creator';

export const isCreatorStatus = (value: unknown): value is CreatorStatus =>
  value === 'applied' || value === 'verified' || value === 'published' || value === 'rejected' || value === 'suspended';

export const CREATOR_KIND_LABELS: Record<CreatorKind, string> = {
  expert: 'Expert (diplôme ou pratique vérifiable)',
  creator: 'Créateur de contenu'
};

export const CREATOR_STATUS_LABELS: Record<CreatorStatus, string> = {
  applied: 'Candidature déposée',
  verified: 'Identité et compétence vérifiées',
  published: 'Publié',
  rejected: 'Refusé',
  suspended: 'Suspendu'
};

/** Transitions autorisées. Tout le reste est refusé. */
export const CREATOR_TRANSITIONS: Record<CreatorStatus, CreatorStatus[]> = {
  applied: ['verified', 'rejected'],
  verified: ['published', 'rejected', 'suspended'],
  published: ['suspended'],
  rejected: [],
  suspended: ['verified']
};

export function canTransitionCreator(from: CreatorStatus, to: CreatorStatus): boolean {
  return (CREATOR_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Publier exige une vérification. Un profil non vérifié ne peut pas être rendu
 * public, quel que soit l'appelant : c'est ce qui distingue ce programme d'un
 * simple formulaire d'inscription.
 */
export function canPublishCreator(status: CreatorStatus): boolean {
  return status === 'verified';
}

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  kind: CreatorKind;
  specialty: string;
  biography: string;
  portfolioUrl: string | null;
  status: CreatorStatus;
  appliedAt: string;
  verifiedAt: string | null;
  publishedAt: string | null;
  adminComment: string | null;
}

// ---------------------------------------------------------------------------
// 39 — Visibilité : elle dérive des contributions, pas d'un budget
// ---------------------------------------------------------------------------

export interface CreatorStandingInput {
  /** Cartes de savoir validées, verdicts produits, réponses d'expert publiées. */
  contributions: number;
  /** Appuis de professionnels vérifiés. */
  endorsements: number;
  /** Contradictions argumentées reçues. */
  contradictions: number;
  /** Résultats déclarés par les membres sur ses recommandations. */
  outcomeReports: number;
}

export interface CreatorStanding {
  contributions: number;
  endorsements: number;
  contradictions: number;
  outcomeReports: number;
  /** 0 à 100. */
  visibilityScore: number;
  /** Un profil sans contribution vérifiée n'est pas classé. */
  rankable: boolean;
  /** Ce qui fait le score, en clair. */
  drivers: string[];
}

/** Somme des poids = 100. Aucun poids ne porte sur de l'argent. */
export const VISIBILITY_WEIGHTS = {
  contributions: 45,
  endorsements: 25,
  outcomeReports: 30
} as const;

/**
 * Points retirés par contradiction argumentée. La pénalité est plafonnée au
 * score positif : on descend à zéro, jamais en dessous — mais on y descend
 * vraiment, quel que soit le nombre de contradictions.
 */
export const CONTRADICTION_PENALTY_PER_UNIT = 4;

/** Plafonds au-delà desquels un critère ne rapporte plus rien. */
export const STANDING_CAPS = {
  contributions: 20,
  endorsements: 10,
  outcomeReports: 30
} as const;

/** En dessous, un profil n'entre pas dans le classement. */
export const MIN_CONTRIBUTIONS_TO_RANK = 3;

export function computeCreatorStanding(input: CreatorStandingInput): CreatorStanding {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const contributions = Math.max(0, Math.round(input.contributions) || 0);
  const endorsements = Math.max(0, Math.round(input.endorsements) || 0);
  const contradictions = Math.max(0, Math.round(input.contradictions) || 0);
  const outcomeReports = Math.max(0, Math.round(input.outcomeReports) || 0);

  const positive =
    clamp01(contributions / STANDING_CAPS.contributions) * VISIBILITY_WEIGHTS.contributions +
    clamp01(endorsements / STANDING_CAPS.endorsements) * VISIBILITY_WEIGHTS.endorsements +
    clamp01(outcomeReports / STANDING_CAPS.outcomeReports) * VISIBILITY_WEIGHTS.outcomeReports;

  // Plafonnée au score positif : un profil très contradit tombe à zéro, il ne
  // garde pas un reste de visibilité.
  const penalty = Math.min(positive, contradictions * CONTRADICTION_PENALTY_PER_UNIT);
  const visibilityScore = Math.max(0, Math.min(100, Math.round(positive - penalty)));
  const rankable = contributions >= MIN_CONTRIBUTIONS_TO_RANK;

  const drivers: string[] = [];
  if (contributions > 0) drivers.push(`${contributions} contribution${contributions > 1 ? 's' : ''} vérifiée${contributions > 1 ? 's' : ''}`);
  if (endorsements > 0) drivers.push(`${endorsements} appui${endorsements > 1 ? 's' : ''} de professionnel${endorsements > 1 ? 's' : ''} vérifié${endorsements > 1 ? 's' : ''}`);
  if (outcomeReports > 0) drivers.push(`${outcomeReports} résultat${outcomeReports > 1 ? 's' : ''} déclaré${outcomeReports > 1 ? 's' : ''} par des membres`);
  if (contradictions > 0) drivers.push(`${contradictions} contradiction${contradictions > 1 ? 's' : ''} argumentée${contradictions > 1 ? 's' : ''} reçue${contradictions > 1 ? 's' : ''} (pénalité)`);
  if (!rankable) drivers.push(`moins de ${MIN_CONTRIBUTIONS_TO_RANK} contributions : hors classement`);

  return { contributions, endorsements, contradictions, outcomeReports, visibilityScore, rankable, drivers };
}

// ---------------------------------------------------------------------------
// 40 — Rémunération au résultat, pas au clic
// ---------------------------------------------------------------------------

export type AttributionEvent = 'click' | 'add_to_shelf' | 'purchase' | 'outcome_declared';

/**
 * La table de valeurs. Un clic, une intention et un achat valent **0** : aucun
 * réglage ne peut les rendre rémunérateurs sans modifier cette table, et le banc
 * la vérifie.
 */
export const ATTRIBUTION_VALUES: Record<AttributionEvent, number> = {
  click: 0,
  add_to_shelf: 0,
  purchase: 0,
  outcome_declared: 1
};

export const isAttributionEvent = (value: unknown): value is AttributionEvent =>
  value === 'click' || value === 'add_to_shelf' || value === 'purchase' || value === 'outcome_declared';

/** Centimes versés par résultat déclaré, quel que soit son signe. */
/**
 * Un événement qui ouvre un versement doit être un fait qualifié : on ne paie pas
 * un compteur incrémenté. Les trois autres événements sont enregistrés sans
 * exiger de signal, puisqu'ils ne donnent droit à rien.
 */
export function attributionRequiresSignal(event: AttributionEvent | string): boolean {
  return event === 'outcome_declared';
}

export const PAYOUT_RATE_CENTS_PER_OUTCOME = 150;
/** En dessous, rien n'est versé : pas de micro-paiement. */
export const MIN_OUTCOMES_FOR_PAYOUT = 3;
/** Au-delà de cette part de résultats négatifs, la rémunération part en revue. */
export const NEGATIVE_SHARE_REVIEW_THRESHOLD = 0.6;

export interface CreatorAttribution {
  id: string;
  creatorId: string;
  productId: string | null;
  event: AttributionEvent | string;
  /** Signal déclaré par le membre, pour un événement `outcome_declared`. */
  outcomeSignal?: string | null;
  occurredAt: string;
}

export type CreatorPayoutStatus = 'versable' | 'sous_le_seuil' | 'en_attente_de_revue';

export interface CreatorPayout {
  creatorId: string;
  /** Nombre d'événements examinés, tous types confondus. */
  examined: number;
  /** Dont ceux qui comptent. */
  paidEvents: number;
  counts: Record<AttributionEvent, number>;
  ignored: number;
  /** Déclarations positives / neutres / négatives. */
  positive: number;
  neutral: number;
  negative: number;
  unknownSignal: number;
  negativeShare: number | null;
  rateCentsPerOutcome: number;
  payoutCents: number;
  status: CreatorPayoutStatus;
  /** Toujours present : pourquoi ce montant, y compris quand il est nul. */
  explanation: string;
}

/**
 * Calcule la rémunération d'un créateur.
 *
 * Le taux est le même pour un résultat positif, neutre ou négatif : rémunérer la
 * déclaration, pas la satisfaction. Une part élevée de résultats négatifs ne
 * réduit pas le taux — elle suspend le versement pour revue.
 */
export function computeCreatorPayout(
  creatorId: string,
  attributions: CreatorAttribution[]
): CreatorPayout {
  const counts: Record<AttributionEvent, number> = { click: 0, add_to_shelf: 0, purchase: 0, outcome_declared: 0 };
  const seen = new Set<string>();
  let ignored = 0;
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let unknownSignal = 0;
  let examined = 0;

  for (const attribution of attributions) {
    examined += 1;
    // Un même événement rejoué ne compte qu'une fois.
    if (attribution.id && seen.has(attribution.id)) {
      ignored += 1;
      continue;
    }
    if (attribution.id) seen.add(attribution.id);

    if (!isAttributionEvent(attribution.event)) {
      ignored += 1;
      continue;
    }
    counts[attribution.event] += ATTRIBUTION_VALUES[attribution.event];
    // Seul un résultat déclaré est examiné pour le signe.
    if (attribution.event !== 'outcome_declared') continue;

    const signal = attribution.outcomeSignal;
    if (!isOutcomeSignal(signal)) {
      unknownSignal += 1;
      continue;
    }
    const valence = SIGNAL_VALENCE[signal];
    if (valence > 0) positive += 1;
    else if (valence < 0) negative += 1;
    else neutral += 1;
  }

  const paidEvents = counts.outcome_declared;
  const declared = positive + neutral + negative + unknownSignal;
  const negativeShare = declared > 0 ? Number((negative / declared).toFixed(4)) : null;

  let payoutCents = 0;
  let status: CreatorPayoutStatus;
  let explanation: string;

  if (paidEvents === 0) {
    status = 'sous_le_seuil';
    explanation =
      `Aucun résultat déclaré : ${counts.click} clic${counts.click > 1 ? 's' : ''}, ` +
      `${counts.add_to_shelf} ajout${counts.add_to_shelf > 1 ? 's' : ''} au shelf et ${counts.purchase} achat${counts.purchase > 1 ? 's' : ''} ne donnent droit à rien. ` +
      'Seul un résultat déclaré par un membre est rémunéré.';
  } else if (negativeShare !== null && negativeShare > NEGATIVE_SHARE_REVIEW_THRESHOLD) {
    status = 'en_attente_de_revue';
    explanation =
      `${Math.round(negativeShare * 100)} % des ${declared} résultats déclarés sont négatifs, au-dessus du seuil de ` +
      `${Math.round(NEGATIVE_SHARE_REVIEW_THRESHOLD * 100)} %. Le versement est suspendu pour revue — le taux n’est pas réduit, ` +
      'car payer moins un résultat négatif inciterait à ne rapporter que du positif.';
  } else if (paidEvents < MIN_OUTCOMES_FOR_PAYOUT) {
    status = 'sous_le_seuil';
    explanation =
      `${paidEvents} résultat${paidEvents > 1 ? 's' : ''} déclaré${paidEvents > 1 ? 's' : ''}, sous le seuil de ${MIN_OUTCOMES_FOR_PAYOUT} : ` +
      'rien n’est versé, pour éviter les micro-paiements.';
  } else {
    status = 'versable';
    payoutCents = paidEvents * PAYOUT_RATE_CENTS_PER_OUTCOME;
    explanation =
      `${paidEvents} résultat${paidEvents > 1 ? 's' : ''} déclaré${paidEvents > 1 ? 's' : ''} × ${PAYOUT_RATE_CENTS_PER_OUTCOME} centimes = ${payoutCents} centimes. ` +
      `Répartition : ${positive} positif${positive > 1 ? 's' : ''}, ${neutral} neutre${neutral > 1 ? 's' : ''}, ${negative} négatif${negative > 1 ? 's' : ''}` +
      (unknownSignal > 0 ? `, ${unknownSignal} signal non reconnu` : '') +
      '. Le taux est identique quel que soit le signe du résultat.';
  }

  return {
    creatorId,
    examined,
    paidEvents,
    counts,
    ignored,
    positive,
    neutral,
    negative,
    unknownSignal,
    negativeShare,
    rateCentsPerOutcome: PAYOUT_RATE_CENTS_PER_OUTCOME,
    payoutCents,
    status,
    explanation
  };
}

/** Ce que le programme ne fait pas. Affiché tel quel, pas promis. */
export const CREATOR_PROGRAM_DISCLAIMERS: string[] = [
  'La visibilité ne s’achète pas : aucun emplacement payant n’existe dans ce programme.',
  'Un clic, un ajout au shelf ou un achat ne rapporte rien au créateur. Seul un résultat déclaré par un membre compte.',
  'Le taux versé est le même pour un résultat positif, neutre ou négatif : KURLA rémunère la déclaration honnête, pas la satisfaction.',
  'Les résultats rapportés sont des déclarations de membres, pas des mesures cliniques.',
  'Un créateur suspendu ou non vérifié n’apparaît pas dans l’annuaire public.'
];
