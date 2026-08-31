import type { Express } from 'express';

import { Type } from '@google/genai';

import { AI_GUARDRAILS, AI_TRANSPARENCY } from '../../lib/ai/guardrails';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { formatKnowledgeContext, selectKnowledgeCards } from '../../lib/ai/knowledgeBase';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { authenticateRequest, bearerToken, requireUser } from '../auth';
import { getGeminiClient, GEMINI_MODEL } from '../ai/client';
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
        const systemInstruction = `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\\n\\nLANGUE DE SORTIE : ${locale}. PAYS : ${country}. OBJECTIF : ${objective || 'à préciser'}. BUDGET MAXIMUM INDICATIF : ${budgetLimit(profile) === undefined ? 'non renseigné' : `${budgetLimit(profile)} EUR par article`}.\\n\\nPROFIL KURLA ID (données déclarées, possiblement incomplètes) :\\n${JSON.stringify(profile || { unavailable: true })}\\n\\nBASE DE CONNAISSANCES KURLA SÉLECTIONNÉE :\\n${formatKnowledgeContext(cards)}\\n\\nCATALOGUE VÉRIFIÉ :\\n${JSON.stringify(catalogContext)}\\n\\n=== EXIGENCE DE QUALITÉ ET DE PROFONDEUR ===\\nTu es l'experte cheveux texturés de référence. Ne donne PAS de réponse courte ou superficielle. Fournis une réponse COMPLÈTE, PÉDAGOGIQUE et ACTIONNABLE :\\n- shortAnswer : une introduction chaleureuse de 1 à 2 phrases qui répond directement.\\n- simpleExplanation : un vrai développement de 3 à 6 phrases. Explique le POURQUOI (mécanisme : porosité, hydratation vs nutrition, écaille de la fibre, cuir chevelu, causes mécaniques/environnementales) en langage simple. Relie la réponse à la texture/porosité de la personne et à son profil KURLA ID si connu.\\n- routineSteps : 5 à 7 étapes CONCRÈTES et ORDONNÉES, chacune en une phrase complète avec le type de produit, le moment et la fréquence (ex. « 1 fois/semaine », « sur cheveux humides »). Couvre le lavage, l'hydratation, la nutrition/scellement, la protection.\\n- immediateActions : 3 à 5 gestes à faire dès maintenant.\\n- usefulProducts : choisis des produits adaptés et propose un ordre de la routine.\\n- errorsToAvoid et avoidCombinations : cite des erreurs précises et fréquentes (ex. huile sur cheveux secs sans eau, shampoing agressif, traction, surcharge protéinée).\\n- whenToConsultPro : signe concrets (plaies, rougeurs, croûtes, douleur, chute soudaine).\\n- uncertainty : dis ce qui n'est pas connu et ce qui affinerait le conseil.\\n- Si la question concerne un ENFANT : adapte tout au cuir chevelu et à la fibre d'un enfant (produits légers et doux, geste ludique et sans tiraillement, ne pas de produits agressifs, fréquence plus souple).\\n- Varie la fréquence selon les besoins, sois précise et bienveillante, évite les généralités vides.\\n\\nContraintes absolues : n’utilise aucune connaissance comme preuve clinique si son statut n’est pas validé ; ne pose aucun diagnostic médical ; usefulProducts ne peut contenir que des objets dont productSlug est un slug EXACT du catalogue fourni ; n’invente ni produit, ni lien, ni disponibilité ; si aucun produit du catalogue n'est adapté, renvoie une liste utileProducts vide et concentre-toi sur le conseil. N’utilise pas de score dans la réponse.`;
        const response = await aiClient.models.generateContent({
          model: GEMINI_MODEL,
          contents: JSON.stringify({ query, objective, locale, country }),
          config: {
            temperature: 0.45,
            maxOutputTokens: 4096,
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
        console.error('[AI Assistant] constrained model failed, using deterministic safe answer:', (error as Error)?.message || error);
      }
    }
    if (!answer) answer = fallbackAnswer(query, locale, cards, recommendationCatalog, fits, needs, profile);
    // Le repli précise lui-même sa provenance (knowledge_base / out_of_scope /
    // generic_fallback) ; si l'IA générative a répondu, c'est 'gemini'.
    const answerSource = modelUsed ? 'gemini' : (answer.answerSource || 'generic_fallback');

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
      answerSource,
      modelConfigured: Boolean(aiClient),
      modelUsed,
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
