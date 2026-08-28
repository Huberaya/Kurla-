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
