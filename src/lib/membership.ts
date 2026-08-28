import { vatRateForCountry } from './vat';
import { SETTLEMENT_CURRENCY } from './currency';

/**
 * CHANTIER 8.5 — ABONNEMENT KURLA+.
 *
 * Module pur : plans, droits, éligibilité, cycle de vie, prix. Aucune lecture de
 * base, aucune dépendance à Express — tout est testable sans serveur.
 *
 * ---------------------------------------------------------------------------
 * LA RÈGLE STRUCTURANTE
 * ---------------------------------------------------------------------------
 * KURLA+ n'enlève rien. Toute capacité marquée `essential` est incluse dans
 * l'offre gratuite, et `tests/membership_kurla_plus.test.ts` vérifie cette
 * propriété en bouclant sur le registre : ajouter une capacité essentielle sans
 * la rendre gratuite fait échouer le banc.
 *
 * Ce qui est payant, c'est la **profondeur d'analyse** de données que le membre
 * a déjà — jamais l'accès à une fonction, jamais ses données, jamais une
 * récompense de progression (celles-ci se débloquent par niveau, cf. chantier
 * 8.3, et ne s'achètent pas).
 *
 * ---------------------------------------------------------------------------
 * « LE DOSSIER DOIT VALOIR QUELQUE CHOSE »
 * ---------------------------------------------------------------------------
 * La stratégie pose cette condition à la ligne de revenu « Abonnement KURLA+ ».
 * Elle devient du code : `evaluateMembershipOffer` ne propose l'abonnement que
 * si le dossier a de la substance, et énonce ce que l'abonnement **ne changerait
 * pas**. Aucun écran de vente sur un dossier vide.
 */

export type MembershipPlanCode = 'libre' | 'kurla_plus';
export type MembershipBilling = 'monthly' | 'annual';
/** Statut dérivé : il ne dépend que de la ligne stockée et de l'heure. */
export type MembershipStatus = 'none' | 'trialing' | 'active' | 'expired' | 'canceled';

export interface MembershipPlan {
  code: MembershipPlanCode;
  label: string;
  tagline: string;
  /** Prix hors taxe, en centimes. La TVA s'ajoute au taux du pays de destination. */
  monthlyPriceCents: number;
  annualPriceCents: number;
  /** Jours d'essai sans moyen de paiement. 0 pour l'offre gratuite. */
  trialDays: number;
  isPaid: boolean;
}

export const MEMBERSHIP_TRIAL_DAYS = 14;
export const MEMBERSHIP_SETTLEMENT_CURRENCY = SETTLEMENT_CURRENCY;

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    code: 'libre',
    label: 'KURLA Libre',
    tagline: 'Tout ce qui existe aujourd’hui, sans échéance.',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    trialDays: 0,
    isPaid: false
  },
  {
    code: 'kurla_plus',
    label: 'KURLA+',
    tagline: 'L’analyse approfondie de ce que vous avez déjà déclaré.',
    monthlyPriceCents: 700,
    annualPriceCents: 7_000,
    trialDays: MEMBERSHIP_TRIAL_DAYS,
    isPaid: true
  }
];

export const MEMBERSHIP_PLAN_BY_CODE = new Map<MembershipPlanCode, MembershipPlan>(
  MEMBERSHIP_PLANS.map(plan => [plan.code, plan])
);

export function isMembershipPlanCode(value: unknown): value is MembershipPlanCode {
  return value === 'libre' || value === 'kurla_plus';
}

// ---------------------------------------------------------------------------
// Registre des capacités
// ---------------------------------------------------------------------------

export interface MembershipCapability {
  code: string;
  label: string;
  description: string;
  /**
   * Une capacité essentielle ne peut jamais devenir payante : droit RGPD,
   * alerte de sécurité, suivi de base. Le banc vérifie que toute capacité
   * essentielle est bien `includedInFree`.
   */
  essential: boolean;
  includedInFree: boolean;
  includedInPlus: boolean;
  /**
   * Le droit est-il réellement appliqué dans le produit, ou seulement déclaré ?
   * Un droit déclaré non branché est affiché comme tel à l'écran et dans l'API —
   * jamais présenté comme acquis.
   */
  applied: boolean;
  /** Raison précise quand `applied` est faux. */
  pendingReason?: string;
}

export const MEMBERSHIP_CAPABILITIES: MembershipCapability[] = [
  {
    code: 'data_export',
    label: 'Export et suppression de vos données',
    description: 'Récupérer l’intégralité de votre dossier, ou le faire supprimer, à tout moment.',
    essential: true,
    includedInFree: true,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'safety_alerts',
    label: 'Alertes de sécurité',
    description: 'Retrait de produit, restriction réglementaire, rappel : vous êtes prévenu sans condition.',
    essential: true,
    includedInFree: true,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'assistant_base',
    label: 'Assistant KURLA',
    description: 'Questions, réponses structurées, sources et mise en garde affichées.',
    essential: true,
    includedInFree: true,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'journey_full_history',
    label: 'Parcours complet',
    description: 'La chronologie de votre évolution, sans fenêtre coupée : tout votre historique reste lisible.',
    essential: true,
    includedInFree: true,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'routine_tracking',
    label: 'Suivi de routine et journal',
    description: 'Tâches, journal de progression, cycles : le suivi quotidien ne dépend d’aucun abonnement.',
    essential: true,
    includedInFree: true,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'progression_rewards',
    label: 'Progression et récompenses',
    description: 'Les niveaux et les récompenses se débloquent par progression, jamais par paiement.',
    essential: true,
    includedInFree: true,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'journey_synthesis',
    label: 'Synthèse écrite du parcours',
    description: 'Tous les trois mois, un texte qui résume ce que vous avez déclaré et ce qui a bougé — avec ses limites.',
    essential: false,
    includedInFree: false,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'journey_deep_comparison',
    label: 'Comparaisons de photos approfondies',
    description: 'Toutes les paires de photos séparées d’au moins 14 jours, pas seulement la première et la dernière.',
    essential: false,
    includedInFree: false,
    includedInPlus: true,
    applied: true
  },
  {
    code: 'assistant_dossier',
    label: 'Assistant nourri du dossier longitudinal',
    description: 'L’assistant reçoit l’historique complet du parcours plutôt que la fenêtre récente.',
    essential: false,
    includedInFree: false,
    includedInPlus: true,
    applied: false,
    pendingReason: 'Le branchement sur le moteur de l’assistant n’est pas fait : la route IA n’a pas encore été modifiée.'
  },
  {
    code: 'custom_alerts',
    label: 'Alertes personnalisées',
    description: 'Rappels de fin de cycle, de réassort et de reprise de routine, réglables par le membre.',
    essential: false,
    includedInFree: false,
    includedInPlus: true,
    applied: false,
    pendingReason: 'Les préférences de notification ne distinguent pas encore les alertes de confort des alertes de sécurité.'
  }
];

export const MEMBERSHIP_CAPABILITY_BY_CODE = new Map<string, MembershipCapability>(
  MEMBERSHIP_CAPABILITIES.map(capability => [capability.code, capability])
);

/** Capacités réellement appliquées pour un plan donné. */
export function capabilitiesFor(plan: MembershipPlanCode): MembershipCapability[] {
  return MEMBERSHIP_CAPABILITIES.filter(capability =>
    plan === 'kurla_plus' ? capability.includedInPlus : capability.includedInFree
  );
}

export function hasCapability(plan: MembershipPlanCode, code: string): boolean {
  const capability = MEMBERSHIP_CAPABILITY_BY_CODE.get(code);
  if (!capability) return false;
  return plan === 'kurla_plus' ? capability.includedInPlus : capability.includedInFree;
}

/**
 * Droits tels qu'exposés à l'écran : le drapeau `applied` distingue un droit
 * actif d'un droit annoncé mais pas encore branché.
 */
export function entitlementsFor(plan: MembershipPlanCode): Array<{
  code: string;
  label: string;
  description: string;
  included: boolean;
  essential: boolean;
  applied: boolean;
  pendingReason?: string;
}> {
  return MEMBERSHIP_CAPABILITIES.map(capability => ({
    code: capability.code,
    label: capability.label,
    description: capability.description,
    included: plan === 'kurla_plus' ? capability.includedInPlus : capability.includedInFree,
    essential: capability.essential,
    applied: capability.applied,
    pendingReason: capability.pendingReason
  }));
}

// ---------------------------------------------------------------------------
// Prix
// ---------------------------------------------------------------------------

export interface MembershipPrice {
  planCode: MembershipPlanCode;
  billing: MembershipBilling;
  country: string | null;
  /** Hors taxe. */
  netCents: number;
  /** `null` quand le pays n'a pas de taux connu : on n'invente pas de TVA. */
  vatRatePercent: number | null;
  vatCents: number | null;
  /** TTC. `null` si le taux est inconnu. */
  grossCents: number | null;
  /** Équivalent mensuel, pour comparer mensuel et annuel sans calcul mental. */
  monthlyEquivalentCents: number | null;
  currency: string;
}

export function membershipPrice(
  planCode: MembershipPlanCode,
  billing: MembershipBilling,
  country?: unknown
): MembershipPrice {
  const plan = MEMBERSHIP_PLAN_BY_CODE.get(planCode)!;
  const netCents = billing === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents;
  const rate = country === undefined || country === null || country === '' ? null : vatRateForCountry(country);
  const vatCents = rate === null ? null : Math.round((netCents * rate) / 100);
  return {
    planCode,
    billing,
    country: typeof country === 'string' && country.trim() ? country.trim().toUpperCase() : null,
    netCents,
    vatRatePercent: rate,
    vatCents,
    grossCents: vatCents === null ? null : netCents + vatCents,
    monthlyEquivalentCents: billing === 'annual' ? Math.round(netCents / 12) : netCents,
    currency: MEMBERSHIP_SETTLEMENT_CURRENCY
  };
}

/** Économie annuelle réelle, en centimes HT. Jamais négative par construction. */
export function annualSavingCents(planCode: MembershipPlanCode): number {
  const plan = MEMBERSHIP_PLAN_BY_CODE.get(planCode)!;
  return Math.max(0, plan.monthlyPriceCents * 12 - plan.annualPriceCents);
}

// ---------------------------------------------------------------------------
// Cycle de vie
// ---------------------------------------------------------------------------

export interface MembershipRecord {
  userId: string;
  planCode: MembershipPlanCode;
  /**
   * Statut stocké. Le statut effectif, lui, se dérive avec l'heure : une ligne
   * `active` dont la période est échue ne donne plus aucun droit payant, même si
   * `expire_memberships()` n'a pas encore tourné.
   */
  status: 'trialing' | 'active' | 'canceled' | 'expired';
  startedAt: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  stripeSubscriptionId: string | null;
  /** Référence de paiement : absente pour un essai, obligatoire pour un abonnement payant. */
  paymentRef: string | null;
}

export interface MembershipState {
  status: MembershipStatus;
  /** Plan dont les droits s'appliquent maintenant. */
  effectivePlan: MembershipPlanCode;
  record: MembershipRecord | null;
  /** Date à laquelle les droits payants s'arrêtent, si elle est connue. */
  accessUntil: string | null;
  cancelAtPeriodEnd: boolean;
  /** Un essai a déjà été consommé : il n'y en a qu'un par compte, à vie. */
  trialUsed: boolean;
  isPaid: boolean;
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/**
 * Dérive le statut effectif de la ligne stockée et de l'heure courante.
 *
 * Un abonnement échu n'a pas besoin d'un cron pour cesser de donner des droits :
 * la lecture suffit. `expire_memberships` (RPC) existe pour que la base reflète
 * la même chose, mais l'absence d'exécution ne prolonge aucun droit.
 */
export function resolveMembershipState(
  record: MembershipRecord | null,
  now: Date = new Date()
): MembershipState {
  const free: MembershipState = {
    status: 'none',
    effectivePlan: 'libre',
    record: null,
    accessUntil: null,
    cancelAtPeriodEnd: false,
    trialUsed: false,
    isPaid: false
  };
  if (!record) return free;

  const nowTime = now.getTime();
  const trialEnd = parseDate(record.trialEndsAt);
  const periodEnd = parseDate(record.currentPeriodEnd);
  const everPaid = Boolean(record.paymentRef);

  if (record.status === 'canceled') {
    return { ...free, status: 'canceled', record, trialUsed: trialEnd !== null || everPaid };
  }

  // Statut écrit par expire_memberships(). Même effet que la dérivation par
  // l'heure : plus de droits payants, et l'essai reste consommé.
  if (record.status === 'expired') {
    return { ...free, status: 'expired', record, trialUsed: trialEnd !== null, isPaid: everPaid };
  }

  if (record.status === 'trialing') {
    if (trialEnd !== null && trialEnd > nowTime) {
      return {
        status: 'trialing',
        effectivePlan: 'kurla_plus',
        record,
        accessUntil: record.trialEndsAt,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        trialUsed: true,
        isPaid: false
      };
    }
    // Essai échu sans paiement : les droits payants s'arrêtent, l'essai reste consommé.
    return { ...free, status: 'expired', record, trialUsed: true };
  }

  // status === 'active'
  if (periodEnd !== null && periodEnd <= nowTime) {
    return { ...free, status: 'expired', record, trialUsed: trialEnd !== null, isPaid: everPaid };
  }
  return {
    status: 'active',
    effectivePlan: 'kurla_plus',
    record,
    accessUntil: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    trialUsed: trialEnd !== null,
    isPaid: everPaid
  };
}

/** Le plan dont les droits s'appliquent, à partir d'un état résolu. */
export function effectivePlanOf(state: MembershipState): MembershipPlanCode {
  return state.effectivePlan;
}

// ---------------------------------------------------------------------------
// Éligibilité : « le dossier doit valoir quelque chose »
// ---------------------------------------------------------------------------

export interface MembershipDossier {
  profileComplete: boolean;
  journalEntries: number;
  photos: number;
  profileRevisions: number;
  loyaltyLevel: number;
  activeDays: number;
  /** Nombre de mesures exploitables sur la métrique la mieux renseignée. */
  bestMetricPoints: number;
}

export interface MembershipOffer {
  shouldPropose: boolean;
  /** 0 à 100. Déclaré, pas caché derrière une décision opaque. */
  dossierScore: number;
  /** Ce qui justifie le score, en clair. */
  reasons: string[];
  /** Pourquoi on ne propose pas, quand c'est le cas. */
  blockers: string[];
  /** Ce que l'abonnement changerait concrètement, pour ce dossier-là. */
  whatItWouldChange: string[];
  /** Ce qu'il ne changerait pas. Toujours présent, y compris quand on propose. */
  whatItWouldNotChange: string[];
}

/** En dessous, KURLA+ n'est pas proposé : il n'y aurait rien à approfondir. */
export const MIN_DOSSIER_SCORE_TO_PROPOSE = 35;

/** Barème du score de dossier. Somme des poids = 100. */
export const DOSSIER_SCORE_WEIGHTS = {
  profileComplete: 20,
  journalEntries: 25,
  photos: 15,
  profileRevisions: 10,
  loyaltyLevel: 20,
  activeDays: 10
} as const;

/** Seuils au-delà desquels un critère ne rapporte plus rien (plafonnement). */
const DOSSIER_CAPS = {
  journalEntries: 30,
  photos: 4,
  profileRevisions: 3,
  activeDays: 20
} as const;

export function scoreMembershipDossier(dossier: MembershipDossier): number {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const level = Math.max(1, Math.min(5, Math.round(dossier.loyaltyLevel) || 1));
  const score =
    (dossier.profileComplete ? DOSSIER_SCORE_WEIGHTS.profileComplete : 0) +
    clamp01(dossier.journalEntries / DOSSIER_CAPS.journalEntries) * DOSSIER_SCORE_WEIGHTS.journalEntries +
    clamp01(dossier.photos / DOSSIER_CAPS.photos) * DOSSIER_SCORE_WEIGHTS.photos +
    clamp01(dossier.profileRevisions / DOSSIER_CAPS.profileRevisions) * DOSSIER_SCORE_WEIGHTS.profileRevisions +
    ((level - 1) / 4) * DOSSIER_SCORE_WEIGHTS.loyaltyLevel +
    clamp01(dossier.activeDays / DOSSIER_CAPS.activeDays) * DOSSIER_SCORE_WEIGHTS.activeDays;
  return Math.round(score);
}

/** Ce que KURLA+ ne change jamais. Liste figée : elle n'est pas négociable par écran. */
export const MEMBERSHIP_NEVER_CHANGES: string[] = [
  'Rien de ce qui est gratuit aujourd’hui ne disparaît ni n’est bridé.',
  'L’export et la suppression de vos données restent gratuits : c’est un droit, pas une option.',
  'Les niveaux et les récompenses de progression se débloquent par progression, jamais par paiement.',
  'L’accès aux professionnels vérifiés ne dépend pas de l’abonnement.',
  'Les alertes de sécurité vous parviennent sans abonnement.',
  'KURLA+ n’est pas un avis médical et ne garantit aucun résultat : ce sont vos déclarations qui sont analysées.'
];

export function evaluateMembershipOffer(dossier: MembershipDossier): MembershipOffer {
  const score = scoreMembershipDossier(dossier);
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (dossier.profileComplete) reasons.push('votre profil beauté est complété');
  else blockers.push('votre profil beauté n’est pas encore complété');

  if (dossier.journalEntries >= 5) reasons.push(`${dossier.journalEntries} entrées de journal`);
  else blockers.push(`${dossier.journalEntries} entrée${dossier.journalEntries > 1 ? 's' : ''} de journal : trop peu pour dégager une évolution`);

  if (dossier.photos >= 2) reasons.push(`${dossier.photos} photos datées`);
  else blockers.push('moins de deux photos datées : aucune comparaison possible');

  if (dossier.bestMetricPoints >= 3) reasons.push(`${dossier.bestMetricPoints} mesures sur une même métrique`);
  else blockers.push('moins de trois mesures sur une même métrique : aucune tendance lisible');

  if (dossier.loyaltyLevel >= 2) reasons.push(`niveau de progression ${dossier.loyaltyLevel}`);

  const whatItWouldChange: string[] = [];
  if (dossier.journalEntries >= 5) {
    whatItWouldChange.push(`Une synthèse écrite tous les trois mois, à partir de vos ${dossier.journalEntries} entrées de journal.`);
  }
  if (dossier.photos >= 2) {
    whatItWouldChange.push(`Toutes les paires de photos séparées d’au moins 14 jours — vous en avez ${dossier.photos} — plutôt que la seule comparaison la plus écartée.`);
  }
  if (whatItWouldChange.length === 0) {
    whatItWouldChange.push('Rien de mesurable aujourd’hui : votre dossier ne contient pas encore assez de déclarations.');
  }

  return {
    shouldPropose: score >= MIN_DOSSIER_SCORE_TO_PROPOSE && blockers.length <= 2,
    dossierScore: score,
    reasons,
    blockers,
    whatItWouldChange,
    whatItWouldNotChange: [...MEMBERSHIP_NEVER_CHANGES]
  };
}

// ---------------------------------------------------------------------------
// Ce que l'écran de vente doit dire — y compris contre lui-même
// ---------------------------------------------------------------------------

export const MEMBERSHIP_DISCLAIMERS: string[] = [
  'Les prix sont indiqués hors taxe ; la TVA du pays de livraison s’ajoute au moment du paiement.',
  'L’essai de 14 jours ne demande aucun moyen de paiement et se termine tout seul.',
  'Aucun paiement n’est possible tant que la configuration de paiement n’est pas active : l’écran le dit au lieu de simuler un encaissement.',
  'KURLA+ analyse vos déclarations. Ce n’est ni un diagnostic, ni une promesse de résultat.'
];

/** Le paiement est-il réellement possible ? Une clé manquante n'est jamais masquée. */
export function isMembershipPaymentConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}
