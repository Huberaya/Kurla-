import type { Express } from 'express';

import { Type } from '@google/genai';

import { AI_GUARDRAILS, AI_TRANSPARENCY } from '../../lib/ai/guardrails';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { formatKnowledgeContext, selectKnowledgeCards } from '../../lib/ai/knowledgeBase';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { authenticateRequest, bearerToken, requireUser } from '../auth';
import { getGeminiClient, GEMINI_MODEL, GEMINI_MODEL_FALLBACK } from '../ai/client';
import { salvageStructuredJson } from '../ai/structuredJson';
import { getAvailableCatalog, selectOperationalKnowledgeCards, getRelevantIngredientFacts, detectIngredientAvoidance, filterCatalogByAvoidance, enrichCatalogWithIngredientFacts } from '../ai/catalog';
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
    // Faits ingrédient vérifiés issus du graphe KURLA (transparence réglementaire).
    const ingredientFacts = await getRelevantIngredientFacts(`${objective || ''} ${query}`);
    // Contraintes « sans X » / allergies : on détecte ce que la personne refuse
    // et on retire du catalogue les produits qui le contiennent réellement.
    const avoidance = detectIngredientAvoidance(`${objective || ''} ${query}`);
    const maxPrice = budgetLimit(profile);
    const budgeted = maxPrice === undefined ? fullCatalog : fullCatalog.filter(entry => entry.price <= maxPrice);
    const avoidanceFilter = filterCatalogByAvoidance(budgeted, avoidance.avoided, avoidance.avoidRaw);
    const catalog = avoidanceFilter.kept;
    // Fiches ingrédient vérifiées rattachées à chaque produit (transparence).
    const productIngredientFacts = await enrichCatalogWithIngredientFacts(catalog);
    const fits = new Map<string, any>();
    for (const entry of catalog) {
      if (profile) fits.set(entry.slug, calculateKurlaFit(entry.product, profile));
    }
    const recommendationCatalog = needs.length > 0
      ? catalog.filter(entry => entry.needs.some(need => needs.includes(need)) || (fits.get(entry.slug)?.score || 0) > 0)
      : catalog;

    let session;
    let sessionMessages: Array<{ sender: string; message: string }> = [];
    if (memoryConsent && user) {
      if (requestedSessionId) {
        const existing = await serverDb.getAiSession(user.id, requestedSessionId);
        if (!existing) return res.status(404).json({ error: 'Session IA introuvable ou non autorisée.' });
        session = existing.session;
        sessionMessages = existing.messages || [];
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
        // Mémoire de conversation : on renvoie au modèle les derniers échanges
        // de la session pour que les questions de suivi gardent le contexte
        // (« et le shampoing ? », « pour ma fille, c'est pareil ? »…). On ne
        // remet que les réponses courtes pour rester léger.
        const recentHistory = sessionMessages.slice(-12);
        const historyContext = recentHistory.length
          ? recentHistory.map(m => `${m.sender === 'user' ? 'Cliente' : 'Toi (KURLA)'} : ${String(m.message).slice(0, 320)}`).join('\\n')
          : 'Aucun échange précédent dans cette conversation.';
        // Composition vérifiée rattachée à chaque produit du catalogue.
        const productFactsContext = productIngredientFacts.size
          ? JSON.stringify(Object.fromEntries([...productIngredientFacts.entries()].map(([slug, facts]) => [slug, facts])))
          : 'Aucune fiche ingrédient rattachée aux produits du catalogue.';
        // Contraintes « sans X » / allergies.
        const avoidanceContext = (avoidance.avoided.length || avoidance.avoidRaw.length)
          ? `La personne EXCLUT : ${[...avoidance.avoided.map(a => a.label), ...avoidance.avoidRaw.map(r => `« ${r.trim()} »`)].join(', ')}. Le catalogue fourni a déjà été filtré : n'y recommande QUE ces produits (${avoidanceFilter.excluded.length} produit(s) en ont été retirés car ils contiennent l'ingrédient exclu). Ne recommande jamais un produit retiré ; si tu n'as pas de certitude sur la composition d'un produit, dis-le dans uncertainty plutôt que d'affirmer qu'il est « sans ». Pour une ALLERGIE déclarée, rappelle de vérifier l'INCI sur l'emballage et de consulter en cas de réaction.`
          : 'Aucune exclusion d’ingrédient exprimée.';
        // Le bouton « Diagnostic cheveux » est ajouté automatiquement dans
        // sanitizeStructuredAnswer quand le profil manque d'infos capillaires.
        const profileHair = (profile && (profile as any).hair) || {};
        const hasHairBasicsForHint = Boolean(profileHair.porosity || (Array.isArray(profileHair.texturePatterns) && profileHair.texturePatterns.length) || profileHair.dryness);
        const diagnosticHint = !hasHairBasicsForHint
          ? 'Quand la porosité/le type de boucle changerait concrètement la routine et que le profil ne les contient pas, mentionne en une phrase qu’un diagnostic cheveux express (3 min) affinerait la recommandation (un bouton est proposé sous la réponse). Ne le mentionne pas pour une question purement informative sur un ingrédient.'
          : '';
        const systemInstruction = `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\\n\\nLANGUE DE SORTIE : ${locale}. PAYS : ${country}. OBJECTIF : ${objective || 'à préciser'}.\\n\\nHISTORIQUE DE LA CONVERSATION (réponds en CONTINUITÉ ; une question courte comme « et le shampoing ? » ou « c'est pareil pour elle ? » fait référence au dernier échange — réutilise le profil, la texture et le sujet déjà discutés, et ne redemande pas ce qui est déjà connu) :\\n${historyContext}\\n\\nBUDGET MAXIMUM INDICATIF : ${budgetLimit(profile) === undefined ? 'non renseigné' : `${budgetLimit(profile)} EUR par article`}.\\n\\nPROFIL KURLA ID (données déclarées, possiblement incomplètes) :\\n${JSON.stringify(profile || { unavailable: true })}\\n\\nBASE DE CONNAISSANCES KURLA SÉLECTIONNÉE :\\n${formatKnowledgeContext(cards)}\\n\\nCATALOGUE VÉRIFIÉ :\\n${JSON.stringify(catalogContext)}\\n\\nFICHES INGRÉDIENT VÉRIFIÉES (graphe KURLA, source de vérité composition) :\\n${ingredientFacts.length ? JSON.stringify(ingredientFacts) : 'Aucun ingrédient mentionné résolu dans le graphe KURLA.'}\\nQuand la question porte sur un ingrédient (rôle, danger, « sans X », comédogénicité, allergène, concentration), appuie-toi EXCLUSIVEMENT sur ces fiches pour toute affirmation factuelle : cite le nom INCI, sa fonction concrète, son statut allergène réglementé, sa concentration maximale UE et son indice comédogène s’ils sont fournis. Quand tu recommandes un produit du catalogue dont les keyIngredients sont fournis, et qu’au moins un de ces ingrédients figure dans les fiches ci-dessus, cite 1 à 3 ingrédients clés VÉRIFIÉS de ce produit dans le champ reason (nom INCI + ce qu’il apporte concrètement), en ne puisant ces précisions que dans les fiches. Ne prétends pas qu’un produit contient un ingrédient s’il n’est ni dans ses keyIngredients ni dans une fiche.\\nSi la question est très vague ou se réfère à un échange précédent sans que le contexte soit suffisant, fais l’hypothèse la plus utile à partir du profil et de l’historique, réponds quand même concrètement, et indique dans uncertainty la seule info qui affinerait vraiment — ne réponds jamais par une simple question en retour.\\nSi un ingrédient n’est PAS dans ces fiches, dis-le FRANCHEMENT et d’emblée : « KURLA n’a pas encore de fiche vérifiée pour cet ingrédient, je ne peux donc rien affirmer sur sa sécurité ou sa concentration » ; n’invente ni restriction, ni allergène, ni concentration, ni fonction ; ne le qualifie jamais d’« interdit », « toxique » ou « dangereux » sans fiche l’étayant ; propose de vérifier le nom INCI exact.\\n\\nCOMPOSITION VÉRIFIÉE PAR PRODUIT (slug produit → fiches ingrédient réelles) :\\n${productFactsContext}\\nQuand tu recommandes un produit présent dans cette liste, cite dans reason 1 à 3 de ces ingrédients INCI avec leur fonction concrète (puisée dans les fiches) ; n'attribue jamais à un produit un ingrédient absent de cette liste ou de ses keyIngredients.\\n\\nCONTRAINTES D’EXCLUSION / ALLERGIES (sans X) :\\n${avoidanceContext}\\n\\n=== EXIGENCE DE QUALITÉ ET DE PROFONDEUR ===\\nTu es l'experte cheveux texturés de référence. Ne donne PAS de réponse courte ou superficielle. Fournis une réponse COMPLÈTE, PÉDAGOGIQUE et ACTIONNABLE :\\n- shortAnswer : une introduction chaleureuse de 1 à 2 phrases qui répond directement.\\n- simpleExplanation : un vrai développement de 3 à 6 phrases. Explique le POURQUOI (mécanisme : porosité, hydratation vs nutrition, écaille de la fibre, cuir chevelu, causes mécaniques/environnementales) en langage simple. Relie la réponse à la texture/porosité de la personne et à son profil KURLA ID si connu.\\n- routineSteps : 5 à 7 étapes CONCRÈTES et ORDONNÉES, chacune en une phrase complète avec le type de produit, le moment et la fréquence (ex. « 1 fois/semaine », « sur cheveux humides »). Couvre le lavage, l'hydratation, la nutrition/scellement, la protection.\\n- immediateActions : 3 à 5 gestes à faire dès maintenant.\\n- usefulProducts : choisis des produits adaptés et propose un ordre de la routine.\\n- errorsToAvoid et avoidCombinations : cite des erreurs précises et fréquentes (ex. huile sur cheveux secs sans eau, shampoing agressif, traction, surcharge protéinée).\\n- whenToConsultPro : signe concrets (plaies, rougeurs, croûtes, douleur, chute soudaine).\\n- uncertainty : dis ce qui n'est pas connu et ce qui affinerait le conseil.\\n- Si la question concerne un ENFANT : adapte tout au cuir chevelu et à la fibre d'un enfant (produits légers et doux, geste ludique et sans tiraillement, ne pas de produits agressifs, fréquence plus souple).\\n- Varie la fréquence selon les besoins, sois précise et bienveillante, évite les généralités vides.\\n\\n${diagnosticHint}\\n\\nContraintes absolues : n’utilise aucune connaissance comme preuve clinique si son statut n’est pas validé ; ne pose aucun diagnostic médical ; usefulProducts ne peut contenir que des objets dont productSlug est un slug EXACT du catalogue fourni ; n’invente ni produit, ni lien, ni disponibilité ; si aucun produit du catalogue n'est adapté, renvoie une liste utileProducts vide et concentre-toi sur le conseil. N’utilise pas de score dans la réponse.`;
        // Essai 1 (réponse complète). Essai 2 : si le JSON est tronqué ou que
        // le modèle bute, on redemande une version plus ramassée avec un budget
        // de sortie plus large — on ne bascule en repli déterministe qu'après.
        const schemaConfig = {
          temperature: 0.45,
          maxOutputTokens: 8192,
          systemInstruction,
          responseMimeType: 'application/json' as const,
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
        };

        // Détecte une erreur de quota/débit (429) : dans ce cas on ne brûle PAS
        // un second essai tout de suite, on attend le délai conseillé par Google
        // puis on réessaie une seule fois.
        const isRateLimit = (e: any): { limited: boolean; delayMs: number } => {
          const msg = String((e as any)?.message || e || '');
          if (!/429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)) return { limited: false, delayMs: 0 };
          const m = msg.match(/retry in ([\d.]+)s/i) || msg.match(/retryDelay[^0-9]*([\d.]+)s?/i);
          return { limited: true, delayMs: Math.min(8000, Math.max(1500, Math.round((m ? parseFloat(m[1]) : 3) * 1000))) };
        };

        const callModel = async (concise: boolean, useFallbackModel = false): Promise<void> => {
          const sys = concise
            ? `${systemInstruction}\nIMPORTANT : réponds en JSON VALIDE et complet. Sois un peu plus concis dans les textes longs (simpleExplanation max 4 phrases, routineSteps 5 étapes, reason produit en 1 phrase) pour éviter toute troncature. N'omet aucun champ du schéma.`
            : systemInstruction;
          const response = await aiClient.models.generateContent({
            model: useFallbackModel ? GEMINI_MODEL_FALLBACK : GEMINI_MODEL,
            contents: JSON.stringify({ query, objective, locale, country }),
            config: { ...schemaConfig, systemInstruction: sys }
          });
          const text = response.text || '';
          const finishReason = (response as any)?.candidates?.[0]?.finishReason;
          const parsed = salvageStructuredJson(text);
          if (!parsed) throw new Error(`JSON structuré illisible (finishReason=${finishReason ?? 'n/a'}, ${text.length} car.)`);
          answer = sanitizeStructuredAnswer(parsed, query, locale, cards, recommendationCatalog, fits, needs, profile);
          modelUsed = true;
          if (finishReason === 'MAX_TOKENS' && !concise) throw new Error('TRUNCATED');
        };

        try {
          try {
            await callModel(false);
          } catch (firstError) {
            const rate = isRateLimit(firstError);
            if (rate.limited) {
              // Quota du modèle principal épuisé : bascule sur le modèle lite
              // (quota distinct), sans attendre.
              console.warn('[AI Assistant] quota modèle principal atteint, bascule modèle lite.');
              await callModel(false, true);
            } else if ((firstError as Error)?.message === 'TRUNCATED' || /JSON structuré illisible|JSON/.test((firstError as Error)?.message || '')) {
              // JSON tronqué/illisible : second essai plus ramassé.
              try {
                await callModel(true);
              } catch (conciseError) {
                if (isRateLimit(conciseError).limited) await callModel(true, true);
                else throw conciseError;
              }
            } else {
              // Autre erreur (503…) : tente aussi le modèle de repli.
              try { await callModel(false, true); } catch { throw firstError; }
            }
          }
        } catch (finalError) {
          if (isRateLimit(finalError).limited) {
            console.warn('[AI Assistant] quota Gemini atteint (niveau gratuit) — repli déterministe temporaire.');
          } else {
            console.error('[AI Assistant] Gemini échoué, repli déterministe :', (finalError as Error)?.message || finalError);
          }
        }
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
