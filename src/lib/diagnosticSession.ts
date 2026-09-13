/**
 * KURLA — état de session du diagnostic (peau ET cheveux).
 *
 * Les deux diagnostics écrivent des clés différentes :
 *   - peau   : kurla_diagnostic_answers_skin (sessionStorage) +
 *              kurla_skin_answers (localStorage — parcours peau, persistant)
 *   - cheveux: kurla_diagnostic_answers (sessionStorage)
 *   - résultat commun : kurla_diagnostic_result (sessionStorage)
 *
 * Bug corrigé (13/09/2026) : sans marqueur, la page résultat lisait la clé
 * peau EN PREMIER — le localStorage peau (persistant) masquait donc les
 * réponses fraîches du diagnostic cheveux dans le même onglet. Le marqueur
 * « dernier diagnostic » (kurla_diagnostic_latest, écrit par chaque page au
 * submit) tranche maintenant : le pôle le plus récent gagne.
 *
 * Contract (banc `kurla_diagnostic_session`) : le marqueur prime, le
 * contenu détermine le pôle affiché, le résultat reste le dernier généré.
 */

import type { AIRecommendationResult } from '../types';

export type DiagnosticPole = 'skin' | 'hair';

export type StoredAnswers = Record<string, any>;

const MARKER_KEY = 'kurla_diagnostic_latest';
const SKIN_SESSION_KEY = 'kurla_diagnostic_answers_skin';
const SKIN_STORAGE_KEY = 'kurla_skin_answers';
const HAIR_KEY = 'kurla_diagnostic_answers';
const HAIR_STORAGE_KEY = 'kurla_hair_answers';
const RESULT_KEY = 'kurla_diagnostic_result';

export const FALLBACK_RESULT: AIRecommendationResult = {
  summary: 'Aucun résultat généré n’est disponible dans cette session.',
  recommendedRoutine: 'Résultat à recalculer',
  reason: 'Les réponses restent disponibles localement. Relancez le diagnostic pour obtenir une recommandation actualisée.',
  steps: [],
  warnings: ['Résultat de secours : aucun conseil personnalisé supplémentaire n’a été généré.'],
  productHandles: [],
  requiresHumanReview: false,
  generatedWithAI: false,
  source: 'fallback',
};

function sessionGet(key: string): string | null {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null; } catch { return null; }
}

function localGet(key: string): string | null {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
}

function safeParse(raw: string | null): StoredAnswers | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as StoredAnswers) : null;
  } catch { return null; }
}

/** Écrit par chaque page de diagnostic à la soumission. */
export function markLatestDiagnostic(pole: DiagnosticPole): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(MARKER_KEY, pole);
  } catch { /* stockage indisponible : la déduction par contenu reste en secours */ }
}

/** Le pôle dont le contenu est effectivement celui affiché. */
function poleFromContent(answers: StoredAnswers): DiagnosticPole {
  return Boolean(answers.skinType || answers.skinConcerns || answers.skinObjectives || answers.toneDepth || answers.hydrationLevel)
    ? 'skin'
    : 'hair';
}

export interface DiagnosticSession {
  answers: StoredAnswers;
  result: AIRecommendationResult;
  isSkin: boolean;
  /** Pôle effectivement affiché (marqueur, sinon contenu, sinon « peau » par compatibilité). */
  pole: DiagnosticPole;
}

/**
 * Lit la session du diagnostic pour la page résultat :
 *  1. le marqueur « dernier diagnostic » choisit le pôle (s’il existe) ;
 *  2. sinon, le contenu disponible détermine le pôle (comportement hérité :
 *     peau d’abord, car son localStorage est persistant) ;
 *  3. le résultat affiché est toujours le dernier généré (clé commune).
 */
export function readDiagnosticSession(): DiagnosticSession {
  let marker: DiagnosticPole | null = null;
  try {
    const raw = sessionGet(MARKER_KEY);
    if (raw === 'skin' || raw === 'hair') marker = raw;
  } catch { /* stockage indisponible */ }

  const skinAnswers = safeParse(sessionGet(SKIN_SESSION_KEY)) ?? safeParse(localGet(SKIN_STORAGE_KEY));
  const hairAnswers = safeParse(sessionGet(HAIR_KEY));

  let answers: StoredAnswers;
  let pole: DiagnosticPole;
  if (marker === 'hair') {
    if (hairAnswers) { answers = hairAnswers; pole = 'hair'; }
    else if (skinAnswers) { answers = skinAnswers; pole = 'skin'; } // dernier recours : la page ne doit jamais être vide
    else { answers = {}; pole = 'hair'; }
  } else if (marker === 'skin') {
    if (skinAnswers) { answers = skinAnswers; pole = 'skin'; }
    else if (hairAnswers) { answers = hairAnswers; pole = 'hair'; }
    else { answers = {}; pole = 'skin'; }
  } else if (skinAnswers) {
    answers = skinAnswers; pole = 'skin';
  } else if (hairAnswers) {
    answers = hairAnswers; pole = 'hair';
  } else {
    answers = {}; pole = poleFromContent({});
  }

  // Garde-fou : le pôle affiché suit le contenu réel des réponses (un
  // fallback croisé ne doit jamais faire afficher la peau sur du contenu
  // cheveux, ni l’inverse).
  if (Object.keys(answers).length > 0) pole = poleFromContent(answers);

  let result: AIRecommendationResult = FALLBACK_RESULT;
  const cached = safeParse(sessionGet(RESULT_KEY));
  if (cached) result = { ...FALLBACK_RESULT, ...(cached as unknown as AIRecommendationResult) };

  return { answers, result, isSkin: pole === 'skin', pole };
}

/**
 * Pré-remplissage des diagnostics (« Modifier mes réponses »).
 *
 * Les deux pôles partagent le même comportement (13/09/2026) : au retour
 * sur le diagnostic, les réponses précédentes sont pré-remplies. La source
 * est la clé de session (dernier diagnostic dans l’onglet), sinon la clé
 * persistante du pôle (kurla_hair_answers / kurla_skin_answers — écrites au
 * submit, c’est l’état exact du formulaire).
 *
 * Robustesse : mergeStoredAnswers ne reprend que les clés qui existent dans
 * les défauts du formulaire, avec contrôle de type (string / string[]).
 * Clé inconnue, JSON corrompu ou type inversé → écartée, défaut conservé.
 * Le payload stocké étant produit par le formulaire lui-même, chaque valeur
 * est par construction une option du formulaire — pas de vocabulaire à
 * dupliquer ici.
 */

/** Persistance des réponses cheveux pour pré-remplissage (miroir du parcours peau). */
export function storeHairAnswers(answers: object): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(HAIR_STORAGE_KEY, JSON.stringify(answers));
  } catch { /* stockage indisponible */ }
}

/** Réponses stockées du pôle — session d’abord, puis persistant du pôle. */
export function readStoredPrefill(pole: DiagnosticPole): string | null {
  if (pole === 'skin') return sessionGet(SKIN_SESSION_KEY) ?? localGet(SKIN_STORAGE_KEY);
  return sessionGet(HAIR_KEY) ?? localGet(HAIR_STORAGE_KEY);
}

/** Fusion stockée → défauts du formulaire (garde-fou clé + type). */
export function mergeStoredAnswers<T extends object>(defaults: T, raw: string | null): T {
  const parsed = safeParse(raw);
  if (!parsed) return defaults;
  const merged: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [key, value] of Object.entries(parsed)) {
    const def = (defaults as Record<string, unknown>)[key];
    if (def === undefined) continue; // clé inconnue du formulaire → écartée
    if (typeof def === 'string' && typeof value === 'string') merged[key] = value;
    else if (Array.isArray(def) && Array.isArray(value) && value.every(v => typeof v === 'string')) merged[key] = value;
  }
  return merged as T;
}
