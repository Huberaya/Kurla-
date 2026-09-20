import type { Express } from 'express';

import { Type } from '@google/genai';

import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { estBesoinPeau } from '../../lib/skinTaxonomy';
import { activeItems, deriveAvoidedIngredients } from '../../lib/shelf';
import { intelligenceStore } from '../../lib/intelligenceStore';
import { buildRecommendations, explainLearning, productIngredientIds } from '../../lib/recommendationEngine';
import { describeIntent, parseSearchIntent, searchByIntent } from '../../lib/semanticSearch';
import { buildRoutine, isExperienceLevel, isRequestedRoutineStep } from '../../lib/routineBuilder';
import { getHairDiagnosticSegment, getSegmentFocusLabel, getSegmentFocusNeeds } from '../../lib/diagnosticSegments';
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../../lib/knowledge/hairAdvisory';
import { deriveHairObservations } from '../../lib/knowledge/diagnosticDerivations';
import { validateHairAiOutput } from '../../lib/knowledge/aiGuardrail';
import { validateSkinAiOutput } from '../../lib/knowledge/aiGuardrail';
import { buildSkinAdvisoryContext, buildSkinEngineSteps, buildSkinFallback, buildSkinPromptNote, skinExfoliationBlocked } from '../../lib/knowledge/skinAdvisory';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { RoutineStep } from '../../lib/shelf';
import { asyncRoute, rateLimit } from '../http';
import { pickFreeTextForTriage } from '../../lib/ai/guardrails';
import { authenticateRequest, bearerToken, requireUser } from '../auth';
import { getAvailableCatalog, selectOperationalKnowledgeCards, type AvailableCatalogEntry } from '../ai/catalog';
import {
  AI_DISCLAIMER,
  medicalTriage,
  normalizeAiCountry,
  normalizeAiLocale,
  queryNeeds,
} from '../ai/assistant';
import { conflictsBetween, shelfItemCarrier } from '../../lib/routineConflicts';
import { jurisdictionForCountry } from '../../lib/jurisdiction';
import { loadJurisdictionGraph, resolveDeclaredIngredients, type JurisdictionGraph } from '../compliance';
import { getGeminiClient, GEMINI_MODEL } from '../ai/client';
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

    // D-03 — les conflits du moteur ne couvrent que les produits proposés. Une
    // routine se construit aussi avec ce que la personne possède déjà, et c'est
    // précisément là que l'avertissement sert : proposer un BHA à quelqu'un qui
    // applique déjà du rétinol sans rien dire est le pire service à rendre.
    const rules = context.incompatibilityRules || [];
    const owned = activeItems(context.shelf);
    // Une étape déjà couverte par l'étagère n'entre pas dans le panier : la
    // signaler produirait un conflit pour un produit qui ne sera pas acheté.
    const coveredSteps = new Set<string>(
      owned.map(item => item.routineStep).filter((step): step is RoutineStep => step !== undefined)
    );
    const crossConflicts = engine.recommendations
      .filter(recommendation => !recommendation.excluded && recommendation.rank !== null && recommendation.rank <= 5)
      .filter(recommendation => !recommendation.product.routineStep || !coveredSteps.has(recommendation.product.routineStep))
      .flatMap(recommendation => owned.flatMap(item => conflictsBetween(
        shelfItemCarrier(item),
        {
          id: String(recommendation.product.id),
          label: recommendation.product.name || String(recommendation.product.id),
          ingredientIds: productIngredientIds(recommendation.product),
          routineStep: recommendation.product.routineStep
        },
        rules
      )))
      .map(conflict => ({
        ingredientA: conflict.ingredientA,
        ingredientB: conflict.ingredientB,
        severity: conflict.severity,
        explanation: `Avec « ${conflict.products[0].label} » que vous avez déjà : ${conflict.explanation} ${conflict.advice}`,
        evidenceLevel: conflict.evidenceLevel
      }));

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
      [...engine.conflicts, ...crossConflicts]
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
    // Le triage médical ne porte que sur du texte libre : un identifiant de
    // questionnaire (« gonfle », « glue ») n'est pas un propos de santé.
    const answerText = pickFreeTextForTriage(answersForAi);
    const triage = answerText ? medicalTriage(answerText) : { emergency: false, review: false, message: '', matched: [] };
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
    // Chantier diagnostic adaptatif : la préoccupation du segment déclaré
    // (texture + coiffage) pilote aussi les besoins — en plus des questions
    // existantes. Pour la peau, answers.focus est absent → aucun besoin ajouté.
    const focusNeeds = getSegmentFocusNeeds(typeof answers.focus === 'string' ? answers.focus : undefined);
    const needs = Array.from(new Set([...queryNeeds(`${diagnosticType} ${answerText}`, diagnosticType), ...(diagnosticPriorityMap[String(answers.priority)] || []), ...focusNeeds]));
    const cards = await selectOperationalKnowledgeCards(answerText, [diagnosticType, ...needs]);
    const authenticatedUser = await authenticateRequest(req);
    if (bearerToken(req) && !authenticatedUser) return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
    void serverDb.recordAiUsage('routine_result', true, authenticatedUser?.id).catch(error => console.error('[AI] usage event error:', error));
    const profileRecord = authenticatedUser ? await serverDb.getBeautyProfile(authenticatedUser.id) : undefined;
    const profile = profileRecord?.profile;

    // CHANTIER ESPACE PERSONNEL — pour un utilisateur connecté, on rattache les
    // réponses du diagnostic à son profil beauté KURLA ID (sinon tout reste en
    // sessionStorage et est perdu). Mapping des réponses publiques vers le profil.
    // Best-effort : un échec de sauvegarde ne doit jamais casser la recommandation.
    if (authenticatedUser && diagnosticType === 'hair') {
      try {
        const textureMap: Record<string, string> = {
          crepue: 'crépue', frisee: 'bouclée', bouclee: 'bouclée', ondulee: 'ondulée', locksee: 'locks', protective: 'protectrice', defrisee: 'défrisée', inconnue: 'inconnue'
        };
        const porosityMap: Record<string, string> = {
          forte: 'forte', faible: 'faible', moyenne: 'moyenne', inconnue: 'inconnue'
        };
        const scalpMap: Record<string, string> = {
          normal: 'normal', sec: 'sec', demangeaisons: 'démangeaisons', pellicules: 'pellicules', irritation: 'sensible'
        };
        const budgetMap: Record<string, string> = {
          moins_40: 'moins de 40 €', '40_70': '40 à 70 €', '70_100': '70 à 100 €', premium: 'premium'
        };
        const a = answersForAi as Record<string, string>;
        const existingHair = (profile?.hair ?? {}) as Record<string, unknown>;
        await serverDb.saveBeautyProfile(authenticatedUser.id, {
          ...(profile ?? {}),
          hair: {
            ...existingHair,
            texturePatterns: [textureMap[String(a.texture)] || 'inconnue'],
            porosity: porosityMap[String(a.porosity)] || profile?.hair?.porosity || 'inconnue',
            scalpCondition: scalpMap[String(a.scalp)] || profile?.hair?.scalpCondition || 'inconnue',
            washFrequency: String(a.frequency || '') || profile?.hair?.washFrequency || 'inconnue',
            budget: budgetMap[String(a.budget)] || profile?.hair?.budget || 'inconnue',
          },
          // D2 — la boucle d'évolution a besoin du POINT DE DÉPART côté
          // serveur : les mêmes réponses, déjà collectées à l'écran, sont
          // conservées en énumérations (jamais de texte libre ici).
          diagnostic: {
            // D6 — l'autre moitié (peau) du dernier instantané survit à une
            // sauvegarde cheveux : on complète, on n'efface pas.
            ...(((profile as any)?.diagnostic ?? {}) as Record<string, unknown>),
            at: new Date().toISOString(),
            source: 'diagnostic',
            texture: String(a.texture || ''),
            style: String(a.style || ''),
            focus: String(a.focus || ''),
            priority: String(a.priority || ''),
            porosity: String(a.porosity || ''),
            scalp: String(a.scalp || ''),
            frequency: String(a.frequency || ''),
            length: String(a.length || ''),
            experience: String(a.experience || ''),
          },
        }, 'diagnostic');
      } catch (error) {
        console.error('[BeautyProfile] sauvegarde diagnostic impossible :', (error as Error)?.message);
      }
    }
    // D6 — miroir exact du bloc cheveux : le diagnostic peau ancre la boucle
    // d'évolution cutanée (énumérations seules, jamais de texte libre).
    if (authenticatedUser && diagnosticType === 'skin') {
      try {
        const sa = answers as Record<string, unknown>;
        const listText = (v: unknown): string => (Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string').join(',') : '');
        await serverDb.saveBeautyProfile(authenticatedUser.id, {
          ...(profile ?? {}),
          diagnostic: {
            ...(((profile as any)?.diagnostic ?? {}) as Record<string, unknown>),
            atSkin: new Date().toISOString(),
            skinType: String(sa.skinType ?? ''),
            skinHydration: String(sa.hydrationLevel ?? ''),
            skinSensitivity: String(sa.sensitivity ?? ''),
            skinConcerns: listText(sa.skinConcerns),
            skinObjectives: listText(sa.skinObjectives),
            skinSpf: String(sa.spfUsage ?? ''),
            skinAcne: String(sa.acne ?? ''),
            skinMarks: String(sa.hyperpigmentationTendency ?? ''),
          },
        }, 'diagnostic');
      } catch (error) {
        console.error('[BeautyProfile] sauvegarde diagnostic peau impossible :', (error as Error)?.message);
      }
    }
    const diagnosticBudget = typeof answers.budget === 'string' ? ({ moins_40: 40, '40_70': 70, '70_100': 100, premium: Number.POSITIVE_INFINITY } as Record<string, number>)[answers.budget] : undefined;
    const catalog = diagnosticBudget === undefined ? fullCatalog : fullCatalog.filter(entry => entry.price <= diagnosticBudget);
    const fits = new Map<string, any>();
    catalog.forEach(entry => { if (profile) fits.set(entry.slug, calculateKurlaFit(entry.product, profile)); });
    // C-07 — `queryNeeds` ajoute « hydrater_cheveux » dès que le texte des
    // réponses contient « cheveu ». Un diagnostic PEAU dont le champ libre
    // mentionne les cheveux remontait donc des produits capillaires, qui
    // devenaient les candidats proposés à l'IA. Un diagnostic peau ne retient
    // que des produits porteurs d'un besoin peau.
    const candidats = catalog.filter(entry => entry.needs.some(need => needs.includes(need)));
    const candidatsDuRayon = diagnosticType === 'skin'
      ? candidats.filter(entry => entry.needs.some(estBesoinPeau))
      : candidats;
    const candidateSlugs = candidatsDuRayon.slice(0, 5).map(entry => entry.slug);

    if (triage.review) {
      return res.json({ summary: triage.message, recommendedRoutine: 'Avis professionnel recommandé', reason: triage.message, steps: ['Suspendre les produits nouveaux ou irritants.', 'Ne pas appliquer de cosmétique sur une zone lésée.', 'Demander un avis médical ou dermatologique.'], warnings: [AI_DISCLAIMER], productHandles: [], requiresHumanReview: true, generatedWithAI: false, source: 'fallback', sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })) });
    }

    // Chantier routine segmentée + D3 : les calculs moteur du profil (segment,
    // préoccupation, dérivations D1, routine) sont faits AVANT l'appel IA.
    // Ils servent de garde-fou à la sortie du modèle comme de fallback
    // déterministe si la sortie échoue à la porte — jamais un générique.
    const isHair = diagnosticType === 'hair';
    // D6 — parité peau : le même triangle moteur→note→porte→fallback, avec
    // la logique de la peau. Construit avant l'appel IA, servi après rejet.
    const skinCtx = diagnosticType === 'skin' ? buildSkinAdvisoryContext(answers as Record<string, unknown>) : null;
    const skinPriorities = [
      ...(Array.isArray(answers.skinConcerns) ? (answers.skinConcerns as unknown[]).filter((v): v is string => typeof v === 'string') : []),
      ...(Array.isArray(answers.skinObjectives) ? (answers.skinObjectives as unknown[]).filter((v): v is string => typeof v === 'string') : []),
    ];
    const skinEngineActions = skinCtx ? buildSkinEngineSteps(skinCtx) : [];
    const skinNoExfoliation = skinCtx ? skinExfoliationBlocked(skinCtx) : false;
    const skinFallbackData = skinCtx ? buildSkinFallback(skinCtx, skinPriorities) : null;
    const advisoryCtx = isHair ? buildHairAdvisoryCtx(answers as Record<string, unknown>) : null;
    const hairSegment = advisoryCtx ? getHairDiagnosticSegment(advisoryCtx.texture, advisoryCtx.style) : undefined;
    const hairFocusLabel = getSegmentFocusLabel(advisoryCtx?.focus);
    const hairDerived = advisoryCtx ? deriveHairObservations(advisoryCtx) : [];
    const hairRoutine = advisoryCtx ? buildHairAdvisoryRoutine(advisoryCtx) : undefined;
    const hairEngineActions = hairRoutine ? [...hairRoutine.morning, ...hairRoutine.evening, ...hairRoutine.weekly].map(step => step.action) : [];
    const segmentNote = isHair ? (() => {
      const parts: string[] = [];
      if (hairSegment) parts.push(`Le profil déclaré est : ${hairSegment.label} (texture ${String(answers.texture ?? 'inconnue')}, coiffage usuel ${String(answers.style ?? 'inconnu')}).`);
      if (hairFocusLabel) parts.push(`Préoccupation principale déclarée : « ${hairFocusLabel} ».`);
      if (hairDerived.length) parts.push(`Croisements déjà déduits des réponses (à reprendre fidèlement dans le summary, sans les contredire ni en inventer d'autres) : ${hairDerived.map(d => d.text).join(' ')}`);
      if (hairEngineActions.length) parts.push(`Référence moteur des étapes (l'IA reformule, n'invente pas un autre programme) : ${hairEngineActions.join(' | ')}`);
      if (parts.length) parts.push('Les étapes doivent suivre le cycle de ce profil précis (et servir cette préoccupation) — pas une routine générique : une tressée n’a pas le même cycle qu’une personne en locks, ni qu’une chevelure naturelle.');
      return parts.join(' ');
    })() : '';
    const skinNote = skinCtx ? buildSkinPromptNote(skinCtx, skinPriorities) : '';


    let parsed: any;
    let generatedWithAI = false;
    const aiClient = getGeminiClient();
    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: GEMINI_MODEL,
          contents: JSON.stringify({ diagnosticType, answers: answersForAi, locale, country }),
          config: {
            systemInstruction: `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\nRéponds en ${locale}. Tu reçois uniquement ce catalogue vérifié et disponible : ${JSON.stringify(catalog.map(entry => ({ slug: entry.slug, name: entry.name, needs: entry.needs, category: entry.category })))}\nNe crée aucun slug. productHandles doit être une sous-liste exacte des slugs reçus, ou []. Ne présente jamais un conseil cosmétique comme médical.${segmentNote || skinNote ? `\n${segmentNote}${skinNote}` : ''}`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: { summary: { type: Type.STRING }, recommendedRoutine: { type: Type.STRING }, reason: { type: Type.STRING }, steps: { type: Type.ARRAY, items: { type: Type.STRING } }, warnings: { type: Type.ARRAY, items: { type: Type.STRING } }, productHandles: { type: Type.ARRAY, items: { type: Type.STRING } }, requiresHumanReview: { type: Type.BOOLEAN } },
              required: ['summary', 'recommendedRoutine', 'reason', 'steps', 'warnings', 'productHandles', 'requiresHumanReview']
            }
          }
        });
        parsed = JSON.parse(response.text || '{}');
        generatedWithAI = true;
      } catch (error) {
        console.error('[AI Routine] constrained model failed, using deterministic catalog routine:', error);
      }
    }

    const validSlugs = new Set(catalog.map(entry => entry.slug));
    const relevantSlugs = new Set(candidateSlugs);
    const requestedHandles = Array.isArray(parsed?.productHandles) ? parsed.productHandles : candidateSlugs;
    const filteredRequestedHandles = requestedHandles.filter((slug: unknown): slug is string => typeof slug === 'string' && validSlugs.has(slug) && relevantSlugs.has(slug));
    const productHandles = Array.from(new Set(filteredRequestedHandles.length > 0 ? filteredRequestedHandles : candidateSlugs));
    // D3 — GARDE-FOU : la sortie IA d'un diagnostic cheveux est validée par
    // les invariants du fallback. Rejet = bascule automatique sur le
    // déterministe (le client ne voit ni la porte ni les raisons).
    if (isHair && generatedWithAI && parsed) {
      const verdict = validateHairAiOutput(parsed, {
        segmentId: hairSegment?.id ?? null,
        focusLabel: hairFocusLabel ?? null,
        derived: hairDerived,
        engineActions: hairEngineActions,
      });
      if (!verdict.ok) {
        console.warn('[AI Routine] garde-fou D3 — sortie rejetée, bascule déterministe :', verdict.reasons.join(' ; '));
        parsed = null;
        generatedWithAI = false;
      }
    }
    // D6 — même porte pour la peau : ce que le moteur refuse (exfoliation sur
    // barrière fragile), l'IA ne peut pas le servir ; hors-programme = rejet.
    if (!isHair && generatedWithAI && parsed && skinCtx) {
      const skinVerdict = validateSkinAiOutput(parsed, {
        engineActions: skinEngineActions,
        exfoliationBlocked: skinNoExfoliation,
        anchors: [String(answers.skinType ?? ''), ...skinPriorities.slice(0, 3)]
      });
      if (!skinVerdict.ok) {
        console.warn('[AI Routine] garde-fou D6 — sortie peau rejetée, bascule déterministe :', skinVerdict.reasons.join(' ; '));
        parsed = null;
        generatedWithAI = false;
      }
    }
    // Fallback sans IA (ou sortie IA rejetée) : la réponse suit le profil
    // déclaré (même moteur que la page résultat) — jamais un générique.
    let hairFallback: { summary: string; recommendedRoutine: string; reason: string; steps: string[] } | null = null;
    if (isHair && advisoryCtx) {
      hairFallback = {
        summary: buildHairAdvisorySummary(advisoryCtx),
        recommendedRoutine: `Routine KURLA — ${hairSegment ? hairSegment.label : 'profil déclaré'}`,
        reason: 'Les étapes suivent le cycle du profil déclaré : texture, coiffage usuel, préoccupation, porosité et cuir chevelu — sans diagnostic médical.',
        steps: hairEngineActions.slice(0, 8),
      };
    }
    const safeResult = {
      summary: typeof parsed?.summary === 'string' ? parsed.summary : (hairFallback ? hairFallback.summary : (skinFallbackData ? skinFallbackData.summary : 'Routine de soin de la peau structurée à ajuster progressivement.')),
      recommendedRoutine: typeof parsed?.recommendedRoutine === 'string' ? parsed.recommendedRoutine : (hairFallback ? hairFallback.recommendedRoutine : (skinFallbackData ? skinFallbackData.recommendedRoutine : 'Routine peau KURLA')),
      reason: typeof parsed?.reason === 'string' ? parsed.reason : (hairFallback ? hairFallback.reason : (skinFallbackData ? skinFallbackData.reason : 'Les étapes sont proposées à partir des réponses et des produits disponibles, sans diagnostic médical.')),
      steps: Array.isArray(parsed?.steps) ? parsed.steps.filter((step: unknown): step is string => typeof step === 'string').slice(0, 8) : (hairFallback ? hairFallback.steps : (skinFallbackData ? skinFallbackData.steps : ['Commencer doucement et introduire un changement à la fois.', 'Observer la tolérance et ajuster la fréquence.', 'Demander un avis professionnel en cas de symptôme persistant.'])),
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.filter((warning: unknown): warning is string => typeof warning === 'string').slice(0, 8) : [AI_DISCLAIMER],
      productHandles,
      requiresHumanReview: parsed?.requiresHumanReview === true,
      generatedWithAI,
      source: generatedWithAI ? 'gemini' : 'fallback',
      sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })),
      uncertainty: profile ? 'La routine tient compte des champs complétés du profil KURLA ID.' : 'La routine est basée uniquement sur les réponses du diagnostic ; le profil KURLA ID n’a pas été partagé.'
    };
    res.json(safeResult);
  }));


  // ============================================================
}
