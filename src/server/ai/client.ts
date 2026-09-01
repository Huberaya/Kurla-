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
 * Modèle Gemini à utiliser. Configurable via GEMINI_MODEL. Le défaut est
 * `gemini-3.5-flash` : modèle récent disponible pour les NOUVELLES clés du
 * niveau gratuit. (Les clés récentes n'ont plus accès à gemini-2.5-flash, et
 * gemini-3.6/3.7-flash renvoient parfois un 503 « forte demande » ; 3.5-flash
 * répond de façon stable et accepte la sortie structurée JSON.) Surchargeable
 * par la variable d'environnement GEMINI_MODEL.
 */
// Modèle principal + modèle de repli. Le niveau gratuit applique un quota
// quotidien PAR MODÈLE : en cas de 429 sur le modèle principal, on bascule sur
// le modèle « lite » (quota distinct, JSON structuré pris en charge) avant de
// tomber sur le repli déterministe. Surchargeable via GEMINI_MODEL /
// GEMINI_MODEL_FALLBACK.
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
export const GEMINI_MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK?.trim() || 'gemini-3.5-flash-lite';
