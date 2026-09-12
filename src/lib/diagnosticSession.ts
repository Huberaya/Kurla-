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
