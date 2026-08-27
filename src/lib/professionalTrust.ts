/**
 * KURLA TRUST SCORE — confiance professionnelle.
 *
 * Le marché regorge de scores opaques : un nombre sur 5, sans dire ce qu'il
 * mesure, achetable en accumulant des avis. KURLA fait l'inverse.
 *
 * Trois règles structurelles :
 *  1. Le score est la somme de composantes VÉRIFIABLES, chacune affichée avec
 *     son état. Un professionnel peut contester chaque ligne.
 *  2. Rien n'est achetable : aucune composante ne dépend d'un paiement, d'un
 *     abonnement ou d'un volume d'achat.
 *  3. Sous les seuils, le score n'est pas publié. Un score calculé sur deux
 *     avis est du bruit présenté comme une mesure.
 *
 * Ce module est pur : aucune dépendance Supabase, testable unitairement.
 */

/** Seuil d'avis réels en dessous duquel aucune moyenne n'est publiée. */
export const MINIMUM_REVIEWS_FOR_RATING = 5;

/** Seuil de co-signatures en dessous duquel le taux d'accord n'est pas publié. */
export const MINIMUM_ENDORSEMENTS_FOR_RATE = 10;

export type TrustComponentKey =
  | 'identity_verified'
  | 'qualification_on_file'
  | 'charter_accepted'
  | 'real_reviews'
  | 'professional_agreement';

export interface TrustComponent {
  key: TrustComponentKey;
  label: string;
  satisfied: boolean;
  /** Poids sur 100. La somme des poids vaut 100. */
  weight: number;
  /** Ce qui est vérifié, ou ce qui manque. Jamais vide. */
  detail: string;
}

export interface ProfessionalTrustInput {
  professionalId: string;
  /** Identité contrôlée par un administrateur humain, pas automatiquement. */
  identityVerified: boolean;
  identityVerifiedAt?: string;
  /** Diplôme ou certification au dossier. */
  qualificationOnFile: boolean;
  qualificationLabel?: string;
  /** Charte KURLA signée. */
  charterAccepted: boolean;
  /** Avis réels, issus d'une prestation confirmée. */
  reviewRatings: number[];
  /** Co-signatures : accord du pro avec les propositions de l'IA. */
  endorsementStats?: {
    total: number;
    approved: number;
  };
  /** Ancienneté vérifiée, en années. */
  verifiedExperienceYears?: number;
}

export interface ReviewSummary {
  count: number;
  average: number | null;
  publishable: boolean;
  suppressionReason?: string;
}

export interface ProfessionalTrustAssessment {
  professionalId: string;
  /** 0 à 100, ou `null` si le score n'est pas publiable. */
  score: number | null;
  publishable: boolean;
  components: TrustComponent[];
  reviews: ReviewSummary;
  /** Ce que le score ne dit pas. Affiché avec le score, jamais masqué. */
  limitations: string[];
  statement: string;
}

const WEIGHTS: Record<TrustComponentKey, number> = {
  identity_verified: 30,
  qualification_on_file: 25,
  charter_accepted: 15,
  real_reviews: 20,
  professional_agreement: 10
};

/**
 * Résumé des avis réels. Sous le seuil, la moyenne n'est pas publiée : c'est la
 * même règle que pour la note par archétype. Une plateforme qui affiche 5,00
 * sur deux avis vend une illusion.
 */
export function summarizeRealReviews(ratings: Iterable<number>): ReviewSummary {
  const values = Array.from(ratings).filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
  if (values.length < MINIMUM_REVIEWS_FOR_RATING) {
    return {
      count: values.length,
      average: null,
      publishable: false,
      suppressionReason: `${values.length} avis vérifié(s), sous le seuil de ${MINIMUM_REVIEWS_FOR_RATING}. KURLA n'affiche pas de moyenne sur si peu d'avis.`
    };
  }
  const average = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  return { count: values.length, average, publishable: true };
}

/**
 * Taux d'accord du professionnel avec les propositions de l'IA.
 *
 * C'est la composante la plus intéressante et la plus inconfortable : un
 * professionnel qui contredit souvent l'IA fait *baisser* son score d'accord,
 * mais c'est précisément ce qui permet à KURLA de corriger son moteur. Le score
 * global ne pénalise donc pas la contradiction — il la rend visible.
 */
export function agreementRate(stats?: { total: number; approved: number }): { rate: number | null; publishable: boolean; detail: string } {
  if (!stats || stats.total <= 0) {
    return { rate: null, publishable: false, detail: 'Aucune co-signature enregistrée : rien à mesurer.' };
  }
  if (stats.total < MINIMUM_ENDORSEMENTS_FOR_RATE) {
    return {
      rate: null,
      publishable: false,
      detail: `${stats.total} co-signature(s), sous le seuil de ${MINIMUM_ENDORSEMENTS_FOR_RATE} : le taux n'est pas publié.`
    };
  }
  const rate = Number((stats.approved / stats.total).toFixed(2));
  return { rate, publishable: true, detail: `${Math.round(rate * 100)} % des routines proposées par l'IA validées sans modification, sur ${stats.total} co-signatures.` };
}

/**
 * Construit l'évaluation de confiance. Chaque composante est retournée, y
 * compris celles qui ne sont pas satisfaites : cacher une ligne manquante
 * transformerait le score en argument marketing.
 */
export function assessProfessionalTrust(input: ProfessionalTrustInput): ProfessionalTrustAssessment {
  const reviews = summarizeRealReviews(input.reviewRatings);
  const agreement = agreementRate(input.endorsementStats);

  const components: TrustComponent[] = [
    {
      key: 'identity_verified',
      label: 'Identité vérifiée',
      satisfied: input.identityVerified === true,
      weight: WEIGHTS.identity_verified,
      detail: input.identityVerified
        ? `Identité contrôlée manuellement par un administrateur${input.identityVerifiedAt ? ` le ${new Date(input.identityVerifiedAt).toLocaleDateString('fr-FR')}` : ''}.`
        : 'Identité non vérifiée : ce professionnel ne peut pas être proposé à la réservation.'
    },
    {
      key: 'qualification_on_file',
      label: 'Qualification au dossier',
      satisfied: input.qualificationOnFile === true,
      weight: WEIGHTS.qualification_on_file,
      detail: input.qualificationOnFile
        ? `Diplôme ou certification au dossier${input.qualificationLabel ? ` : ${input.qualificationLabel}` : ''}.`
        : 'Aucun diplôme ni certification au dossier. Cela n\'empêche pas la compétence, mais KURLA ne peut pas l\'attester.'
    },
    {
      key: 'charter_accepted',
      label: 'Charte KURLA signée',
      satisfied: input.charterAccepted === true,
      weight: WEIGHTS.charter_accepted,
      detail: input.charterAccepted
        ? 'Charte signée : hygiène, conseils personnalisés, absence de jugement de texture.'
        : 'Charte non signée.'
    },
    {
      key: 'real_reviews',
      label: 'Avis issus de prestations réelles',
      satisfied: reviews.publishable,
      weight: WEIGHTS.real_reviews,
      detail: reviews.publishable
        ? `${reviews.count} avis vérifiés, moyenne ${reviews.average?.toFixed(2)} sur 5.`
        : reviews.suppressionReason || 'Aucun avis vérifié.'
    },
    {
      key: 'professional_agreement',
      label: 'Accord avec les recommandations de l\'IA',
      satisfied: agreement.publishable,
      weight: WEIGHTS.professional_agreement,
      detail: agreement.detail
    }
  ];

  const earned = components.reduce((sum, component) => sum + (component.satisfied ? component.weight : 0), 0);

  // Un professionnel dont l'identité n'est pas vérifiée n'est pas publiable,
  // quel que soit son score : c'est la condition d'entrée, pas une composante
  // comme les autres.
  const publishable = input.identityVerified === true;

  const limitations: string[] = [
    'Ce score mesure des éléments vérifiables, pas la qualité du travail ni l\'affinité avec votre texture.',
    'Aucune composante n\'est achetable : ni abonnement, ni mise en avant, ni volume d\'achat.'
  ];
  if (!reviews.publishable) {
    limitations.push('La moyenne d\'avis n\'est pas publiée : trop peu d\'avis vérifiés pour être représentative.');
  }
  if (!agreement.publishable) {
    limitations.push('Le taux d\'accord avec l\'IA n\'est pas publié : échantillon insuffisant.');
  }
  if (!input.qualificationOnFile) {
    limitations.push('L\'absence de diplôme au dossier n\'est pas une absence de compétence : de nombreux excellents praticiens sont autodidactes.');
  }

  const missing = components.filter(component => !component.satisfied);
  const statement = !publishable
    ? 'Identité non vérifiée : ce professionnel n\'est pas proposé à la réservation.'
    : missing.length === 0
      ? 'Toutes les composantes vérifiables sont satisfaites.'
      : `Score ${earned}/100. Manque : ${missing.map(component => component.label.toLowerCase()).join(', ')}.`;

  return {
    professionalId: input.professionalId,
    score: publishable ? earned : null,
    publishable,
    components,
    reviews,
    limitations,
    statement
  };
}

/**
 * Un professionnel est réservable uniquement si son identité est vérifiée.
 * Séparé du score : on peut être vérifié et sans avis, l'inverse jamais.
 */
export function isBookable(assessment: Pick<ProfessionalTrustAssessment, 'publishable'>): boolean {
  return assessment.publishable === true;
}
