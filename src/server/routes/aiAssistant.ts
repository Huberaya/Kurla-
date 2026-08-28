import type { Express } from 'express';

import { Type } from '@google/genai';

import { AI_GUARDRAILS, AI_TRANSPARENCY } from '../../lib/ai/guardrails';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { formatKnowledgeContext, selectKnowledgeCards } from '../../lib/ai/knowledgeBase';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { authenticateRequest, bearerToken, requireUser } from '../auth';
import { getGeminiClient } from '../ai/client';
import { getAvailableCatalog, selectOperationalKnowledgeCards } from '../ai/catalog';
import {
  normalizeAiCountry,
  normalizeAiLocale,
  AI_DISCLAIMER,
  budgetLimit,
  catalogForPrompt,
  fallbackAnswer,
  medicalTriage,
  persistAiExchange,
  queryNeeds,
  recommendationsForSlugs,
  sanitizeStructuredAnswer,
} from '../ai/assistant';
import type { AuthenticatedRequest } from '../types';
import type { Request, Response } from 'express';

/**
 * CHANTIER 8.1 — assistant beauté (routes), extrait de `server.ts`. La chaîne de
 * réponse vit dans `src/server/ai/assistant.ts` ; ici ne restent que le transport
 * HTTP, la divulgation IA et la persistance de l'échange. Chemins inchangés.
 */

export function registerAiAssistantRoutes(app: Express): void {
  // AI Endpoint: General Beauty Assistant Query
  app.post('/api/ai/assistant', rateLimit('ai-assistant', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query || query.length > 2000) return res.status(400).json({ error: 'La question est obligatoire et doit rester sous 2 000 caractères.' });

    const token = bearerToken(req);
    const user = await authenticateRequest(req);
    if (token && !user) return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
    void serverDb.recordAiUsage('assistant', true, user?.id).catch(error => console.error('[AI] usage event error:', error));

    const locale = normalizeAiLocale(req.body?.locale);
    const country = normalizeAiCountry(req.body?.country);
    const memoryConsent = req.body?.memoryConsent === true;
    const requestedSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
    if ((memoryConsent || requestedSessionId) && !user) return res.status(401).json({ error: 'Connectez-vous pour utiliser la mémoire de l’assistant.' });
    if (requestedSessionId && !memoryConsent) return res.status(400).json({ error: 'Le consentement mémoire doit rester actif pour reprendre une session.' });

    const objective = typeof req.body?.objective === 'string' ? req.body.objective.trim().slice(0, 160) : undefined;
    const profileRecord = user ? await serverDb.getBeautyProfile(user.id) : undefined;
    const profile = profileRecord?.profile;
    const needs = queryNeeds(`${objective || ''} ${query}`);
    const cards = await selectOperationalKnowledgeCards(query, needs);
    const fullCatalog = await getAvailableCatalog(country);
    const maxPrice = budgetLimit(profile);
    const catalog = maxPrice === undefined ? fullCatalog : fullCatalog.filter(entry => entry.price <= maxPrice);
    const fits = new Map<string, any>();
    for (const entry of catalog) {
      if (profile) fits.set(entry.slug, calculateKurlaFit(entry.product, profile));
    }
    const recommendationCatalog = needs.length > 0
      ? catalog.filter(entry => entry.needs.some(need => needs.includes(need)) || (fits.get(entry.slug)?.score || 0) > 0)
      : catalog;

    let session;
    if (memoryConsent && user) {
      if (requestedSessionId) {
        const existing = await serverDb.getAiSession(user.id, requestedSessionId);
        if (!existing) return res.status(404).json({ error: 'Session IA introuvable ou non autorisée.' });
        session = existing.session;
      } else {
        session = await serverDb.createAiSession(user.id, objective || 'assistant-beauté', locale, country, true, objective);
      }
    }

    const triage = medicalTriage(query);
    if (triage.review) {
      const persistence = await persistAiExchange(user, session, query, triage.message, { kind: 'medical_triage', emergency: triage.emergency }, cards.map(card => card.id), 'Avis professionnel recommandé ; aucun diagnostic n’est établi.');
      if (triage.emergency) {
        return res.json({ isMedicalRedirect: true, medicalMessage: triage.message, requiresHumanReview: true, disclaimer: AI_DISCLAIMER, ...persistence });
      }
      return res.json({ isMedicalRedirect: true, medicalMessage: triage.message, requiresHumanReview: true, disclaimer: AI_DISCLAIMER, ...persistence });
    }

    const aiClient = getGeminiClient();
    let answer: any;
    let modelUsed = false;
    if (aiClient) {
      try {
        const catalogContext = catalogForPrompt(recommendationCatalog, fits);
        const systemInstruction = `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\n\nLANGUE DE SORTIE : ${locale}. Réponds dans cette langue avec des phrases simples.\nPAYS : ${country}. OBJECTIF : ${objective || 'à préciser'}. BUDGET MAXIMUM INDICATIF : ${budgetLimit(profile) === undefined ? 'non renseigné' : `${budgetLimit(profile)} EUR par article`}.\n\nPROFIL KURLA ID (données déclarées, possiblement incomplètes) :\n${JSON.stringify(profile || { unavailable: true })}\n\nBASE DE CONNAISSANCES KURLA SÉLECTIONNÉE :\n${formatKnowledgeContext(cards)}\n\nCATALOGUE VÉRIFIÉ :\n${JSON.stringify(catalogContext)}\n\nContraintes absolues : n’utilise aucune connaissance comme preuve clinique si son statut n’est pas validé ; ne pose aucun diagnostic ; usefulProducts doit contenir uniquement des objets dont productSlug est un slug EXACT du catalogue ; n’invente ni produit, ni lien, ni disponibilité. Explique chaque recommandation avec evidence reliée au profil ou indique que la personnalisation est limitée. N’utilise pas de score dans la réponse.`;
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: JSON.stringify({ query, objective, locale, country }),
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                shortAnswer: { type: Type.STRING },
                simpleExplanation: { type: Type.STRING },
                routineSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                usefulProducts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { productSlug: { type: Type.STRING }, reason: { type: Type.STRING }, evidence: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['productSlug', 'reason', 'evidence'] } },
                avoidCombinations: { type: Type.ARRAY, items: { type: Type.STRING } },
                usefulTools: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'description'] } },
                errorsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
                whenToConsultPro: { type: Type.STRING },
                uncertainty: { type: Type.STRING }
              },
              required: ['shortAnswer', 'simpleExplanation', 'routineSteps', 'immediateActions', 'usefulProducts', 'avoidCombinations', 'usefulTools', 'errorsToAvoid', 'whenToConsultPro', 'uncertainty']
            }
          }
        });
        answer = sanitizeStructuredAnswer(JSON.parse(response.text || '{}'), query, locale, cards, recommendationCatalog, fits, needs, profile);
        modelUsed = true;
      } catch (error) {
        console.error('[AI Assistant] constrained model failed, using deterministic safe answer:', error);
      }
    }
    if (!answer) answer = fallbackAnswer(query, locale, cards, recommendationCatalog, fits, needs, profile);

    const persistence = await persistAiExchange(user, session, query, JSON.stringify(answer), { kind: 'structured_answer', modelUsed, profileConfidence: profileRecord?.confidence || null, country, locale, objective }, cards.map(card => card.id), answer.uncertainty);
    // Article 50(1) du règlement (UE) 2024/1689 : la nature artificielle de
    // l'interlocuteur est renvoyée avec chaque réponse, et non seulement dans
    // les CGU ou via un libellé ambigu.
    res.json({
      isMedicalRedirect: false,
      requiresHumanReview: false,
      answer,
      disclaimer: AI_DISCLAIMER,
      aiGenerated: true,
      aiDisclosure: AI_TRANSPARENCY.disclosure,
      aiResponseMarker: AI_TRANSPARENCY.responseMarker,
      profileAvailable: !!profile,
      profileConfidence: profileRecord?.confidence,
      ...persistence
    });
  }));

  /**
   * Divulgation centralisée pour tout point d'entrée qui expose une interaction
   * avec l'assistant. Une seule source de texte, pour que la conformité ne dépende
   * pas de la vigilance de chaque route.
   */
  app.get('/api/ai/disclosure', (_req: Request, res: Response) => {
    res.json({
      aiGenerated: true,
      disclosure: AI_TRANSPARENCY.disclosure,
      responseMarker: AI_TRANSPARENCY.responseMarker,
      disclaimer: AI_DISCLAIMER,
      regulatoryBasis: 'Règlement (UE) 2024/1689, article 50(1), applicable depuis le 2 août 2026.'
    });
  });

  // ============================================================

}
