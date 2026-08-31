import type { Express } from 'express';

import { Type } from '@google/genai';

import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { deriveAvoidedIngredients } from '../../lib/shelf';
import { intelligenceStore } from '../../lib/intelligenceStore';
import { buildRecommendations, explainLearning } from '../../lib/recommendationEngine';
import { describeIntent, parseSearchIntent, searchByIntent } from '../../lib/semanticSearch';
import { buildRoutine, isExperienceLevel, isRequestedRoutineStep } from '../../lib/routineBuilder';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { RoutineStep } from '../../lib/shelf';
import { asyncRoute, rateLimit } from '../http';
import { authenticateRequest, bearerToken, requireUser } from '../auth';
import { getAvailableCatalog, selectOperationalKnowledgeCards, type AvailableCatalogEntry } from '../ai/catalog';
import {
  AI_DISCLAIMER,
  medicalTriage,
  normalizeAiCountry,
  normalizeAiLocale,
  queryNeeds,
} from '../ai/assistant';
import { jurisdictionForCountry } from '../../lib/jurisdiction';
import { loadJurisdictionGraph, resolveDeclaredIngredients, type JurisdictionGraph } from '../compliance';
import { getGeminiClient } from '../ai/client';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types';
import type { Response } from 'express';

/**
 * CHANTIER 8.1 — moteur de recommandation v2, recherche sémantique et routine
 * builder, extraits de `server.ts`. `buildEngineContext` et `toEngineProducts`
 * ne servaient qu'ici : ils suivent leurs routes. Chemins inchangés.
 */

export function registerRecommendationRoutes(app: Express): void {
  // CHANTIER 5 — Moteur v2, recherche sémantique, routine builder
  // ============================================================

  /**
   * Construit le contexte du moteur depuis les données réelles de l'utilisateur :
   * profil, étagère, observations, abandons. C'est ici que la boucle se referme —
   * le feedback cesse d'être collecté pour rien.
   */
  async function buildEngineContext(
    user: AuthenticatedUser,
    options: { budgetLimit?: number; country?: string } = {}
  ) {
    const profileRecord = await serverDb.getBeautyProfile(user.id);
    const shelf = await intelligenceStore.getShelf(user.id);
    const observations = await intelligenceStore.getOutcomes(user.id);

    // CHANTIER 7.7 — la juridiction fait partie du contexte de recommandation.
    // Une base illisible ne bloque pas la recommandation (ce n'est pas une vente :
    // la porte fail-closed est au checkout), mais le fait est déclaré dans la
    // réponse via `jurisdictionChecked` plutôt que passé sous silence.
    const country = options.country || 'FR';
    const jurisdiction = jurisdictionForCountry(country);
    let graph: JurisdictionGraph | null = null;
    if (jurisdiction) {
      try {
        graph = await loadJurisdictionGraph(jurisdiction);
      } catch (error: any) {
        console.error('[Jurisdiction] graphe illisible, filtrage réglementaire désactivé pour cette requête :', error?.message);
      }
    }

    return {
      profile: profileRecord?.profile,
      shelf,
      observations,
      avoidedIngredientIds: deriveAvoidedIngredients(shelf).map(entry => entry.ingredientId),
      budgetLimit: options.budgetLimit,
      jurisdiction: graph?.jurisdiction,
      jurisdictionRestrictions: graph?.restrictions,
      jurisdictionChecked: Boolean(graph),
      incompatibilityRules: await intelligenceStore.getIncompatibilityRules(),
      /** Graphe complet (catalogue inclus) : sert à résoudre les noms déclarés. */
      jurisdictionGraph: graph
    };
  }

  /**
   * Résout les noms déclarés d'un produit en identifiants du graphe, pour que le
   * moteur puisse appliquer les restrictions réglementaires. Un nom non résolu
   * n'est pas inventé : il reste hors graphe, et l'évaluation dira `no_data`.
   */
  function toEngineProducts(catalog: AvailableCatalogEntry[], graph: JurisdictionGraph | null) {
    if (!graph) return catalog.map(entry => entry.product as any);
    return catalog.map(entry => {
      const names: string[] = [
        ...(Array.isArray(entry.product?.ingredients) ? (entry.product.ingredients as string[]) : []),
        ...((entry as any).keyIngredients || [])
      ].filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
      const ids = resolveDeclaredIngredients(names, graph.catalog).map(item => item.ingredientId);
      return { ...(entry.product as any), ingredientIds: ids };
    });
  }

  /**
   * Recommandations. Chaque résultat porte la trace complète de ses ajustements :
   * un score final sans trace n'est pas renvoyé.
   */
  app.post('/api/recommendations', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const country = normalizeAiCountry(req.body?.country);
    const budgetLimit = typeof req.body?.budgetLimit === 'number' && Number.isFinite(req.body.budgetLimit) && req.body.budgetLimit > 0
      ? req.body.budgetLimit
      : undefined;
    const context = await buildEngineContext(user, { budgetLimit, country });
    const catalog = await getAvailableCatalog(country);
    const jurisdictionGraph = context.jurisdiction && context.jurisdictionRestrictions
      ? { catalog: [], restrictions: context.jurisdictionRestrictions, jurisdiction: context.jurisdiction }
      : null;
    const result = buildRecommendations(
      toEngineProducts(catalog, context.jurisdictionGraph ?? null),
      context
    );
    res.json({
      ...result,
      learning: explainLearning(result),
      context: {
        shelfSize: context.shelf.length,
        observationCount: context.observations.length,
        avoidedIngredients: context.avoidedIngredientIds,
        profileAvailable: Boolean(context.profile),
        jurisdiction: context.jurisdiction,
        jurisdictionChecked: context.jurisdictionChecked
      }
    });
  }));

  /**
   * Recherche sémantique. Renvoie ce que KURLA a compris ET ce qu'elle n'a pas
   * compris : une contrainte mal interprétée doit être visible, pas devinée.
   */
  app.get('/api/search', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const intent = parseSearchIntent(rawQuery);
    const country = normalizeAiCountry(req.query.country);
    const catalog = await getAvailableCatalog(country);
    const matches = searchByIntent(
      catalog.map(entry => entry.product as any),
      intent
    );
    res.json({
      intent,
      interpretation: describeIntent(intent),
      results: matches.slice(0, 24),
      total: matches.length
    });
  }));

  /**
   * Routine Builder : relie l'IA au commerce. Une étape déjà couverte par
   * l'étagère n'est pas ajoutée au panier, et une étape non pourvue est déclarée
   * plutôt que remplie avec un produit approximatif.
   */
  app.post('/api/routine-builder', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const country = normalizeAiCountry(req.body?.country);
    const budgetLimit = typeof req.body?.budgetLimit === 'number' && Number.isFinite(req.body.budgetLimit) && req.body.budgetLimit > 0
      ? req.body.budgetLimit
      : undefined;

    const context = await buildEngineContext(user, { budgetLimit, country });
    const catalog = await getAvailableCatalog(country);
    const engine = buildRecommendations(toEngineProducts(catalog, context.jurisdictionGraph ?? null), context);

    const requestedSteps = Array.isArray(req.body?.requestedSteps)
      ? req.body.requestedSteps.filter((step: unknown): step is RoutineStep => isRequestedRoutineStep(step))
      : [];

    const routine = buildRoutine(
      engine.recommendations,
      context.shelf,
      {
        goal: typeof req.body?.goal === 'string' ? req.body.goal.trim().slice(0, 200) : '',
        budgetLimit,
        availableMinutesPerDay: typeof req.body?.availableMinutesPerDay === 'number' ? req.body.availableMinutesPerDay : undefined,
        experienceLevel: isExperienceLevel(req.body?.experienceLevel) ? req.body.experienceLevel : undefined,
        requestedSteps
      },
      engine.conflicts
    );

    res.json({ routine, summary: engine.summary });
  }));

  // Consent-aware AI history and feedback APIs.
  app.get('/api/ai/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ sessions: await serverDb.getAiSessions(user.id) });
  }));

  app.get('/api/ai/history/:sessionId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
    const session = await serverDb.getAiSession(user.id, sessionId);
    if (!session) return res.status(404).json({ error: 'Session IA introuvable ou non autorisée.' });
    res.json(session);
  }));

  app.delete('/api/ai/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    await serverDb.deleteAiSessions(user.id);
    res.json({ success: true });
  }));

  app.post('/api/ai/feedback', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const rating = req.body?.rating;
    if (!['helpful', 'incorrect', 'unsafe'].includes(rating)) return res.status(400).json({ error: 'Feedback IA invalide.' });
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
    const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : undefined;
    if (messageId && !sessionId) return res.status(400).json({ error: 'La session est requise pour référencer un message IA.' });
    if (sessionId) {
      const ownedSession = await serverDb.getAiSession(user.id, sessionId);
      if (!ownedSession || (messageId && !ownedSession.messages.some(message => message.id === messageId))) return res.status(404).json({ error: 'Référence de session ou de message IA non autorisée.' });
    }
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : undefined;
    await serverDb.recordAiFeedback(user.id, rating, comment, sessionId, messageId);
    res.status(201).json({ success: true });
  }));

  app.post('/api/ai/human-review', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) return res.status(400).json({ error: 'La raison de la revue est obligatoire.' });
    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
    const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : undefined;
    if (messageId && !sessionId) return res.status(400).json({ error: 'La session est requise pour référencer un message IA.' });
    if (sessionId) {
      const ownedSession = await serverDb.getAiSession(user.id, sessionId);
      if (!ownedSession || (messageId && !ownedSession.messages.some(message => message.id === messageId))) return res.status(404).json({ error: 'Référence de session ou de message IA non autorisée.' });
    }
    const payload = typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {};
    const review = await serverDb.requestAiHumanReview(user.id, reason, payload, sessionId, messageId);
    res.status(201).json({ review });
  }));

  // AI Endpoint: Generate a routine from the public diagnostic. Products are
  // still selected only from the country-filtered, in-stock catalog.
  app.post('/api/ai/routine-result', rateLimit('ai-routine', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const diagnosticType = req.body?.diagnosticType === 'skin' ? 'skin' : req.body?.diagnosticType === 'hair' ? 'hair' : null;
    if (!diagnosticType || !req.body?.answers || typeof req.body.answers !== 'object') return res.status(400).json({ error: 'Diagnostic invalide.' });
    const answers = req.body.answers;
    const { email: _diagnosticEmail, ...answersForAi } = answers as Record<string, unknown>;
    const answerText = JSON.stringify(answersForAi);
    const triage = medicalTriage(answerText);
    const locale = normalizeAiLocale(req.body?.locale);
    const country = normalizeAiCountry(req.body?.country);
    const fullCatalog = await getAvailableCatalog(country);
    const diagnosticPriorityMap: Record<string, string[]> = diagnosticType === 'hair'
      ? {
        hydratation: ['hydrater_cheveux'],
        casse: ['reduire_casse'],
        definition: ['definir_boucles'],
        cuir_chevelu: ['cuir_chevelu'],
        entretien_protective: ['entretenir_tresses', 'entretenir_locks'],
        demelage_enfant: ['demeler_cheveux']
      }
      : {
        taches: ['taches_hyperpigmentation'],
        teint_irregulier: ['taches_hyperpigmentation'],
        hydratation: ['hydrater_peau'],
        spf: ['protection_solaire'],
        acne_legere: ['imperfections_acne'],
        sensibilite: ['peau_sensible']
      };
    const needs = Array.from(new Set([...queryNeeds(`${diagnosticType} ${answerText}`, diagnosticType), ...(diagnosticPriorityMap[String(answers.priority)] || [])]));
    const cards = await selectOperationalKnowledgeCards(answerText, [diagnosticType, ...needs]);
    const authenticatedUser = await authenticateRequest(req);
    if (bearerToken(req) && !authenticatedUser) return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
    void serverDb.recordAiUsage('routine_result', true, authenticatedUser?.id).catch(error => console.error('[AI] usage event error:', error));
    const profileRecord = authenticatedUser ? await serverDb.getBeautyProfile(authenticatedUser.id) : undefined;
    const profile = profileRecord?.profile;
    const diagnosticBudget = typeof answers.budget === 'string' ? ({ moins_40: 40, '40_70': 70, '70_100': 100, premium: Number.POSITIVE_INFINITY } as Record<string, number>)[answers.budget] : undefined;
    const catalog = diagnosticBudget === undefined ? fullCatalog : fullCatalog.filter(entry => entry.price <= diagnosticBudget);
    const fits = new Map<string, any>();
    catalog.forEach(entry => { if (profile) fits.set(entry.slug, calculateKurlaFit(entry.product, profile)); });
    const candidateSlugs = catalog.filter(entry => entry.needs.some(need => needs.includes(need))).slice(0, 5).map(entry => entry.slug);

    if (triage.review) {
      return res.json({ summary: triage.message, recommendedRoutine: 'Avis professionnel recommandé', reason: triage.message, steps: ['Suspendre les produits nouveaux ou irritants.', 'Ne pas appliquer de cosmétique sur une zone lésée.', 'Demander un avis médical ou dermatologique.'], warnings: [AI_DISCLAIMER], productHandles: [], requiresHumanReview: true, sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })) });
    }

    let parsed: any;
    const aiClient = getGeminiClient();
    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: JSON.stringify({ diagnosticType, answers: answersForAi, locale, country }),
          config: {
            systemInstruction: `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\nRéponds en ${locale}. Tu reçois uniquement ce catalogue vérifié et disponible : ${JSON.stringify(catalog.map(entry => ({ slug: entry.slug, name: entry.name, needs: entry.needs, category: entry.category })))}\nNe crée aucun slug. productHandles doit être une sous-liste exacte des slugs reçus, ou []. Ne présente jamais un conseil cosmétique comme médical.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: { summary: { type: Type.STRING }, recommendedRoutine: { type: Type.STRING }, reason: { type: Type.STRING }, steps: { type: Type.ARRAY, items: { type: Type.STRING } }, warnings: { type: Type.ARRAY, items: { type: Type.STRING } }, productHandles: { type: Type.ARRAY, items: { type: Type.STRING } }, requiresHumanReview: { type: Type.BOOLEAN } },
              required: ['summary', 'recommendedRoutine', 'reason', 'steps', 'warnings', 'productHandles', 'requiresHumanReview']
            }
          }
        });
        parsed = JSON.parse(response.text || '{}');
      } catch (error) {
        console.error('[AI Routine] constrained model failed, using deterministic catalog routine:', error);
      }
    }

    const validSlugs = new Set(catalog.map(entry => entry.slug));
    const relevantSlugs = new Set(candidateSlugs);
    const requestedHandles = Array.isArray(parsed?.productHandles) ? parsed.productHandles : candidateSlugs;
    const filteredRequestedHandles = requestedHandles.filter((slug: unknown): slug is string => typeof slug === 'string' && validSlugs.has(slug) && relevantSlugs.has(slug));
    const productHandles = Array.from(new Set(filteredRequestedHandles.length > 0 ? filteredRequestedHandles : candidateSlugs));
    const isHair = diagnosticType === 'hair';
    const safeResult = {
      summary: typeof parsed?.summary === 'string' ? parsed.summary : (isHair ? 'Routine capillaire structurée à ajuster progressivement.' : 'Routine de soin de la peau structurée à ajuster progressivement.'),
      recommendedRoutine: typeof parsed?.recommendedRoutine === 'string' ? parsed.recommendedRoutine : (isHair ? 'Routine capillaire KURLA' : 'Routine peau KURLA'),
      reason: typeof parsed?.reason === 'string' ? parsed.reason : 'Les étapes sont proposées à partir des réponses et des produits disponibles, sans diagnostic médical.',
      steps: Array.isArray(parsed?.steps) ? parsed.steps.filter((step: unknown): step is string => typeof step === 'string').slice(0, 8) : ['Commencer doucement et introduire un changement à la fois.', 'Observer la tolérance et ajuster la fréquence.', 'Demander un avis professionnel en cas de symptôme persistant.'],
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.filter((warning: unknown): warning is string => typeof warning === 'string').slice(0, 8) : [AI_DISCLAIMER],
      productHandles,
      requiresHumanReview: parsed?.requiresHumanReview === true,
      sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })),
      uncertainty: profile ? 'La routine tient compte des champs complétés du profil KURLA ID.' : 'La routine est basée uniquement sur les réponses du diagnostic ; le profil KURLA ID n’a pas été partagé.'
    };
    res.json(safeResult);
  }));


  // ============================================================
}
