import { GoogleGenAI } from '@google/genai';

/**
 * CHANTIER 8.1 — client Gemini, extrait de `server.ts`.
 *
 * Construit à la demande : sans clé, l'assistant répond par son repli
 * déterministe au lieu de tomber. Aucun appel réseau n'a lieu à l'import.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Modèle Gemini à utiliser. Configurable via GEMINI_MODEL. Le défaut est un nom
 * de modèle RÉEL et disponible (gemini-2.5-flash) : l'ancienne valeur
 * « gemini-3.6-flash » n'existait pas et faisait échouer 100 % des appels, ce
 * qui renvoyait silencieusement la réponse de repli générique (d'où une
 * assistante qui « ne répondait pas »).
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
