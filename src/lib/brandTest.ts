import { DEFAULT_K_ANONYMITY_THRESHOLD } from './archetype';
import { calculateKurlaFit } from './kurlaFit';
import { SIGNAL_VALENCE, isOutcomeSignal } from './outcomeEvidence';

import type { BeautyProfile } from './beautyProfile';

/**
 * CHANTIER 8.6c2 — ESPACE MARQUE : TESTS PRODUITS CIBLÉS (feature 41).
 *
 * Ce qu'une marque vient chercher : savoir si son produit répond à un besoin
 * précis, chez les personnes qui déclarent ce besoin. Ce qu'elle ne doit jamais
 * obtenir : qui ces personnes sont.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST NON NÉGOCIABLE
 * ---------------------------------------------------------------------------
 * 1. **Le ciblage se fait par besoin, jamais par personne.** Une cohorte est une
 *    liste de codes de besoins (et éventuellement d'archétypes). Toute tentative
 *    de cibler par e-mail, ville, âge, genre, historique d'achat ou identifiant
 *    est **refusée nommément** — pas ignorée silencieusement, parce qu'un refus
 *    silencieux laisse croire que le ciblage a fonctionné.
 *
 * 2. **Le rapport ne reçoit que des comptes.** `buildBrandTestReport` prend des
 *    effectifs agrégés, pas des lignes individuelles : il ne peut pas divulguer
 *    ce qu'il ne reçoit jamais. L'agrégation a lieu en amont, dans le store.
 *
 * 3. **k-anonymité appliquée, pas promise.** Une cellule sous le seuil est
 *    absente du rapport et comptée dans `totals.suppressedCells`. Sous le seuil
 *    au global, la distribution des signaux vaut `null` : la marque apprend que
 *    le test n'est pas publiable, pas un résultat approximatif.
 *
 * 4. **Un résultat déclaré n'est pas un essai clinique.** Le rapport le dit, et
 *    aucun mot du vocabulaire de la preuve ne doit y apparaître.
 */

// ---------------------------------------------------------------------------
// Cohorte : ce qu'on a le droit de demander
// ---------------------------------------------------------------------------

/** Seules ces clés définissent une cohorte. */
export const COHORT_ALLOWED_KEYS = ['needs', 'archetypeIds'] as const;

/**
 * Clés explicitement refusées. La liste est écrite plutôt que déduite : une
 * règle « tout ce qui n'est pas autorisé est refusé » suffirait techniquement,
 * mais nommer les refus attendus rend la règle vérifiable et lisible.
 */
export const FORBIDDEN_COHORT_KEYS = [
  'email',
  'emails',
  'phone',
  'name',
  'firstName',
  'lastName',
  'address',
  'city',
  'postalCode',
  'country',
  'age',
  'birthDate',
  'gender',
  'userId',
  'userIds',
  'members',
  'orderIds',
  'purchaseHistory',
  'revenue'
] as const;

export interface BrandTestCohort {
  /** Codes de besoins reconnus par le moteur d'adéquation. */
  needs: string[];
  /** Facultatif : restreindre à des archétypes déjà k-anonymes. */
  archetypeIds?: string[];
}

export type CohortValidation =
  | { ok: true; cohort: BrandTestCohort }
  | { ok: false; reason: string; refusedKeys: string[] };

export function validateCohortDefinition(input: unknown, knownNeeds: string[]): CohortValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, reason: 'Une cohorte se définit par ses besoins.', refusedKeys: [] };
  }

  const record = input as Record<string, unknown>;
  const refusedKeys = Object.keys(record).filter(
    key => !(COHORT_ALLOWED_KEYS as readonly string[]).includes(key)
  );
  if (refusedKeys.length > 0) {
    return {
      ok: false,
      reason:
        'KURLA ne cible pas des personnes. Une cohorte se définit par des besoins ' +
        `(clés acceptées : ${COHORT_ALLOWED_KEYS.join(', ')}).`,
      refusedKeys
    };
  }

  const rawNeeds = Array.isArray(record.needs) ? record.needs : [];
  const needs = Array.from(new Set(rawNeeds.filter((need): need is string => typeof need === 'string' && need.trim() !== '')));
  const unknownNeeds = needs.filter(need => !knownNeeds.includes(need));
  if (needs.length === 0) {
    return { ok: false, reason: 'Au moins un besoin doit définir la cohorte.', refusedKeys };
  }
  if (unknownNeeds.length > 0) {
    return {
      ok: false,
      reason: `Besoins inconnus : ${unknownNeeds.join(', ')}. Un besoin inventé ne correspond à personne.`,
      refusedKeys
    };
  }

  const archetypeIds = Array.isArray(record.archetypeIds)
    ? Array.from(new Set((record.archetypeIds as unknown[]).filter((id): id is string => typeof id === 'string' && id.trim() !== '')))
    : undefined;

  return { ok: true, cohort: { needs, ...(archetypeIds && archetypeIds.length > 0 ? { archetypeIds } : {}) } };
}

/**
 * Un membre appartient à la cohorte si le moteur d'adéquation reconnaît le
 * besoin dans son profil. On réutilise le seul matcher existant plutôt que d'en
 * écrire un second : deux logiques de besoin finiraient par diverger.
 */
export function profileMatchesNeed(profile: BeautyProfile, need: string): boolean {
  const result = calculateKurlaFit({ category: '', needs: [need] } as never, profile);
  return !result.unmetNeeds.includes(need);
}

export function profileMatchesCohort(profile: BeautyProfile, cohort: BrandTestCohort): boolean {
  return cohort.needs.some(need => profileMatchesNeed(profile, need));
}

// ---------------------------------------------------------------------------
// Cycle de vie d'un test
// ---------------------------------------------------------------------------

export type BrandTestStatus = 'submitted' | 'approved' | 'recruiting' | 'running' | 'closed' | 'rejected';

export const BRAND_TEST_STATUS_LABELS: Record<BrandTestStatus, string> = {
  submitted: 'Demande déposée',
  approved: 'Demande acceptée',
  recruiting: 'Recrutement ouvert',
  running: 'Test en cours',
  closed: 'Test clôturé',
  rejected: 'Demande refusée'
};

/** Transitions autorisées. Tout le reste est refusé. */
export const BRAND_TEST_TRANSITIONS: Record<BrandTestStatus, BrandTestStatus[]> = {
  submitted: ['approved', 'rejected'],
  approved: ['recruiting', 'rejected'],
  recruiting: ['running', 'closed'],
  running: ['closed'],
  closed: [],
  rejected: []
};

export function canTransitionBrandTest(from: BrandTestStatus, to: BrandTestStatus): boolean {
  return (BRAND_TEST_TRANSITIONS[from] ?? []).includes(to);
}

export const isBrandTestStatus = (value: unknown): value is BrandTestStatus =>
  value === 'submitted' || value === 'approved' || value === 'recruiting' || value === 'running' || value === 'closed' || value === 'rejected';

/** On ne peut rejoindre un test que pendant le recrutement. */
export function canJoinBrandTest(status: BrandTestStatus): boolean {
  return status === 'recruiting';
}

/** On ne déclare un résultat que pendant le test. */
export function canDeclareBrandTestOutcome(status: BrandTestStatus): boolean {
  return status === 'running';
}

// ---------------------------------------------------------------------------
// Rapport : des comptes, jamais des personnes
// ---------------------------------------------------------------------------

/** Même seuil que les cohortes d'archétypes : k = 30. */
export const BRAND_TEST_K_THRESHOLD = DEFAULT_K_ANONYMITY_THRESHOLD;

/**
 * Entrée du rapport : des effectifs. Aucun identifiant, aucun profil, aucune
 * coordonnée ne peut entrer ici — le type ne le permet pas.
 */
export interface BrandTestAggregateRow {
  need: string;
  /** Membres ayant consenti, non retirés, et ayant déclaré au moins un résultat. */
  participants: number;
  positive: number;
  neutral: number;
  negative: number;
  /** Signaux non reconnus : comptés, jamais interprétés. */
  unknown: number;
  /** Retraits de consentement : exclus des effectifs, comptés à part. */
  withdrawals: number;
}

export interface BrandTestReportCell {
  need: string;
  participants: number;
  positive: number;
  neutral: number;
  negative: number;
  /** 0 à 1, ou `null` si aucun signal interprétable. */
  positiveShare: number | null;
}

export interface BrandTestReport {
  testId: string;
  brandName: string;
  productName: string;
  hypothesis: string;
  cohortNeeds: string[];
  generatedAt: string;
  totals: {
    participants: number;
    withdrawals: number;
    /** Cellules absentes du rapport parce que sous le seuil. */
    suppressedCells: number;
    publishable: boolean;
  };
  /** Cellules au seuil uniquement. Les autres ne sont pas ici. */
  cells: BrandTestReportCell[];
  /** `null` quand l'effectif global est sous le seuil : rien n'est publié. */
  signals: { positive: number; neutral: number; negative: number; unknown: number } | null;
  kThreshold: number;
  caveats: string[];
}

export const BRAND_TEST_CAVEATS: string[] = [
  'Ces résultats sont déclarés par les membres, en conditions réelles d’usage. Ce n’est pas un essai clinique et cela n’en a pas la valeur.',
  'Aucune donnée personnelle n’est transmise : le rapport ne contient que des effectifs agrégés.',
  'Une cellule dont l’effectif est sous le seuil k est absente du rapport. Un résultat peut donc exister sans apparaître ici.',
  'Un résultat négatif a la même valeur qu’un résultat positif : KURLA ne filtre pas les déclarations défavorables.',
  'KURLA ne revend aucune donnée personnelle. Ce rapport est un agrégat, pas un fichier.',
  'Un membre est rattaché à un seul besoin de la cohorte, le premier qu’il déclare : les cellules sont disjointes et personne n’est compté deux fois.'
];

/** Vocabulaire de la preuve, interdit dans un rapport de résultats déclarés. */
export const FORBIDDEN_PROOF_WORDS = ['prouvé', 'garanti', 'cliniquement', 'efficacité démontrée', 'certifié'];

export interface BuildBrandTestReportInput {
  testId: string;
  brandName: string;
  productName: string;
  hypothesis: string;
  /** La cohorte demandée, telle que validée. Jamais déduite des lignes. */
  cohortNeeds: string[];
  rows: BrandTestAggregateRow[];
  kThreshold?: number;
  generatedAt?: string;
}

/**
 * Construit le rapport destiné à la marque.
 *
 * Deux seuils, pas un :
 *  - **par cellule** : une cellule sous k disparaît du rapport ;
 *  - **au global** : sous k participants au total, la distribution des signaux
 *    vaut `null`. Publier « 12 participants, 8 positifs » serait révéler un
 *    comportement individuel à un cheveu près.
 */
export function buildBrandTestReport(input: BuildBrandTestReportInput): BrandTestReport {
  const kThreshold = input.kThreshold ?? BRAND_TEST_K_THRESHOLD;

  const totals = {
    participants: 0,
    withdrawals: 0,
    suppressedCells: 0,
    publishable: false
  };
  const cells: BrandTestReportCell[] = [];
  const signals = { positive: 0, neutral: 0, negative: 0, unknown: 0 };

  for (const row of input.rows) {
    totals.participants += Math.max(0, Math.round(row.participants));
    totals.withdrawals += Math.max(0, Math.round(row.withdrawals));

    if (row.participants < kThreshold) {
      // La cellule est comptée, son contenu ne sort pas.
      totals.suppressedCells += 1;
      continue;
    }

    const interpretable = row.positive + row.neutral + row.negative;
    cells.push({
      need: row.need,
      participants: row.participants,
      positive: row.positive,
      neutral: row.neutral,
      negative: row.negative,
      positiveShare: interpretable > 0 ? Number((row.positive / interpretable).toFixed(3)) : null
    });
  }

  totals.publishable = totals.participants >= kThreshold;
  if (totals.publishable) {
    for (const cell of cells) {
      signals.positive += cell.positive;
      signals.neutral += cell.neutral;
      signals.negative += cell.negative;
    }
    // Les signaux non reconnus des cellules publiées restent comptés à part.
    signals.unknown = input.rows
      .filter(row => row.participants >= kThreshold)
      .reduce((sum, row) => sum + Math.max(0, Math.round(row.unknown)), 0);
  }

  return {
    testId: input.testId,
    brandName: input.brandName,
    productName: input.productName,
    hypothesis: input.hypothesis,
    cohortNeeds: input.cohortNeeds,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    totals,
    cells,
    signals: totals.publishable ? signals : null,
    kThreshold,
    caveats: BRAND_TEST_CAVEATS
  };
}

/**
 * Garde éditoriale du rapport. Un rapport de résultats déclarés ne doit jamais
 * employer le vocabulaire de la preuve — y compris par sous-chaîne, d'où la
 * recherche sur le texte complet et non sur des mots isolés.
 */
export function brandTestReportBreaches(report: Pick<BrandTestReport, 'caveats'> & { productName?: string; hypothesis?: string }): string[] {
  const haystack = [
    ...report.caveats,
    report.productName ?? '',
    report.hypothesis ?? ''
  ]
    .join(' ')
    .toLowerCase();
  return FORBIDDEN_PROOF_WORDS.filter(word => haystack.includes(word));
}

/** Rappelle la nature déclarative d'un signal, sans l'interpréter. */
export function describeSignal(signal: string): { known: boolean; valence: 'positif' | 'neutre' | 'negatif' | 'inconnu' } {
  if (!isOutcomeSignal(signal)) return { known: false, valence: 'inconnu' };
  const valence = SIGNAL_VALENCE[signal];
  return { known: true, valence: valence === 1 ? 'positif' : valence === -1 ? 'negatif' : 'neutre' };
}
