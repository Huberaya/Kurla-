import type { Express } from 'express';

import { intelligenceStore } from '../../lib/intelligenceStore';
import { serverDb } from '../../lib/serverDb';
import { readAggregate } from '../../lib/outcomeEvidence';
import { evaluateCohort } from '../../lib/archetype';
import {
  buildShelfVerdict,
  deriveAvoidedIngredients,
  isRoutineStep,
  summarizeAbandonments,
  RoutineStep,
} from '../../lib/shelf';
import {
  assessTractionRisk,
  buildRecoveryProtocol,
  summarizeTractionHistory,
} from '../../lib/protectiveStyle';
import { buildDailyTasks, buildWashDayPlan, WashDayEvent } from '../../lib/washDay';
import { normalizeWeatherContext } from '../../lib/adaptiveRoutine';
import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';
import type { Response } from 'express';

/**
 * CHANTIER 8.1 — KURLA Intelligence (étagère, archétype, résultats, coiffures
 * protectrices), extrait de `server.ts`. Chemins inchangés.
 */

export function registerIntelligenceRoutes(app: Express): void {
  // KURLA INTELLIGENCE — Shelf, archétype, résultats, coiffures
  // ============================================================

  /**
   * KURLA Shelf : l'inventaire réel de l'utilisateur.
   * C'est ce qui permet de passer de « que veux-tu acheter ? » à
   * « que te manque-t-il vraiment ? ».
   */
  app.get('/api/shelf', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ items: await intelligenceStore.getShelf(user.id) });
  }));

  app.post('/api/shelf', rateLimit('shelf-write', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const item = await intelligenceStore.addShelfItem(user.id, req.body || {});
      res.status(201).json({ item });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Article invalide.' });
    }
  }));

  app.patch('/api/shelf/:itemId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const item = await intelligenceStore.updateShelfItem(user.id, String(req.params.itemId), req.body || {});
      if (!item) return res.status(404).json({ error: 'Article introuvable ou non autorisé.' });
      res.json({ item });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Mise à jour invalide.' });
    }
  }));

  app.delete('/api/shelf/:itemId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const removed = await intelligenceStore.deleteShelfItem(user.id, String(req.params.itemId));
    if (!removed) return res.status(404).json({ error: 'Article introuvable ou non autorisé.' });
    res.json({ success: true });
  }));

  /**
   * Verdict d'achat. Peut répondre « vous n'avez rien à acheter » : c'est
   * volontaire. Une plateforme qui sait dire non gagne une confiance qu'aucune
   * promotion n'achète.
   */
  app.post('/api/shelf/verdict', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const items = await intelligenceStore.getShelf(user.id);
    const requested = Array.isArray(req.body?.requiredSteps) ? req.body.requiredSteps : undefined;
    const requiredSteps = (requested && requested.length > 0
      ? requested.filter((step: unknown): step is RoutineStep => isRoutineStep(step))
      : ['cleanse', 'condition', 'leave_in', 'seal_oil']) as RoutineStep[];
    res.json({
      ...buildShelfVerdict(items, requiredSteps),
      avoidedIngredients: deriveAvoidedIngredients(items),
      abandonmentPatterns: summarizeAbandonments(items)
    });
  }));

  /**
   * Archétype courant. Les dimensions non renseignées restent non renseignées :
   * KURLA ne complète jamais un champ inconnu.
   */
  app.get('/api/me/archetype', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const profileRecord = await serverDb.getBeautyProfile(user.id);
    const derivation = await intelligenceStore.syncUserArchetype(user.id, profileRecord?.profile);
    const cohort = evaluateCohort(derivation.id, derivation.labelFr, intelligenceStore.getArchetypeMemberCount(derivation.id));
    res.json({ archetype: derivation, cohort });
  }));

  /**
   * Boucle d'apprentissage. C'est ici que `routine_feedback` cessait d'être un
   * cimetière de données : chaque observation est rattachée à un archétype et
   * alimente l'agrégat publié.
   */
  app.post('/api/outcomes', rateLimit('outcome-write', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const profileRecord = await serverDb.getBeautyProfile(user.id);
    try {
      const observation = await intelligenceStore.recordOutcome(user.id, req.body || {}, profileRecord?.profile);
      res.status(201).json({ observation });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Observation invalide.' });
    }
  }));

  app.get('/api/outcomes', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ observations: await intelligenceStore.getOutcomes(user.id) });
  }));

  /**
   * Efficacité d'un ingrédient pour l'archétype de l'utilisateur.
   * Sous le seuil de k-anonymité, la réponse dit explicitement que KURLA ne sait
   * pas encore — jamais de conclusion tirée de trois observations.
   */
  app.get('/api/ingredients/:ingredientId/evidence', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const ingredientId = String(req.params.ingredientId);
    const climateContext = typeof req.query.climate === 'string' ? req.query.climate : undefined;
    const { aggregate } = await intelligenceStore.getIngredientOutcomeEvidence(user.id, ingredientId, { climateContext });
    const profileRecord = await serverDb.getBeautyProfile(user.id);
    const derivation = await intelligenceStore.syncUserArchetype(user.id, profileRecord?.profile);
    const reading = readAggregate(aggregate, {
      ingredientLabel: ingredientId,
      archetypeLabel: derivation.labelFr,
      climateLabel: climateContext
    });
    res.json({ ingredientId, archetypeId: derivation.id, reading });
  }));

  // --- Timeline de coiffure protectrice --------------------------------------

  app.get('/api/protective-styles', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const episodes = await intelligenceStore.getProtectiveStyles(user.id);
    res.json({
      episodes,
      assessments: episodes.map(episode => assessTractionRisk(episode)),
      history: summarizeTractionHistory(episodes)
    });
  }));

  app.post('/api/protective-styles', rateLimit('protective-style-write', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const created = await intelligenceStore.startProtectiveStyle(user.id, req.body || {});
      res.status(201).json({ episode: created, assessment: assessTractionRisk(created) });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Coiffure invalide.' });
    }
  }));

  app.post('/api/protective-styles/:episodeId/signals', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const updated = await intelligenceStore.addProtectiveStyleSignal(user.id, String(req.params.episodeId), req.body?.signal);
      if (!updated) return res.status(404).json({ error: 'Coiffure introuvable ou non autorisée.' });
      const assessment = assessTractionRisk(updated);
      res.json({
        episode: updated,
        assessment,
        recoveryProtocol: buildRecoveryProtocol(assessment)
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Signal invalide.' });
    }
  }));

  app.post('/api/protective-styles/:episodeId/close', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const updated = await intelligenceStore.closeProtectiveStyle(user.id, String(req.params.episodeId), typeof req.body?.reason === 'string' ? req.body.reason : undefined);
    if (!updated) return res.status(404).json({ error: 'Coiffure introuvable ou non autorisée.' });
    res.json({ episode: updated, assessment: assessTractionRisk(updated) });
  }));

  // --- Wash Day OS -----------------------------------------------------------

  /**
   * Plan du wash day courant. Le plan est reconstruit à chaque appel à partir du
   * cycle réel et du contexte : une routine par cycle n'est pas une liste figée.
   */
  app.get('/api/wash-day', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const cycle = await intelligenceStore.getWashDayCycle(user.id);
    const episodes = await intelligenceStore.getProtectiveStyles(user.id);
    const activeStyle = episodes.find(episode => !episode.removedAt);

    // Climat : le serveur récupère déjà l'humidité ailleurs pour la routine
    // adaptative. Sans elle, `buildWashDayPlan` ne peut pas justifier un pré-poo
    // ni adapter le coiffage — la logique existe mais reste muette.
    const weather = normalizeWeatherContext(req.query);
    const humidityPercent = weather?.humidityPercent ?? null;

    // Événements : une coiffure protectrice active est un événement du cycle.
    // Le déclarer ici ferme le trou entre la timeline protectrice et le wash day.
    const events: WashDayEvent[] = activeStyle
      ? [{ kind: 'protective_style', occurredAt: activeStyle.installedAt, note: activeStyle.style }]
      : [];

    const plan = buildWashDayPlan({
      cycle: {
        intervalDays: cycle.intervalDays,
        lastWashDayAt: cycle.lastWashDayAt,
        deepConditionEveryNWashDays: cycle.deepConditionEveryNWashDays,
        proteinEveryNWashDays: cycle.proteinEveryNWashDays
      },
      events,
      humidityPercent,
      hardWater: cycle.hardWater,
      ownedProductLabels: (await intelligenceStore.getShelf(user.id))
        .filter(item => item.status === 'in_use' || item.status === 'owned')
        .map(item => item.freeLabel || item.productId || '')
        .filter(Boolean)
    });
    res.json({
      cycle,
      plan,
      dailyTasks: buildDailyTasks({
        nightProtection: cycle.nightProtection,
        protectiveStyleActive: Boolean(activeStyle)
      }),
      activeProtectiveStyle: activeStyle
        ? { episode: activeStyle, assessment: assessTractionRisk(activeStyle) }
        : null
    });
  }));

  app.put('/api/wash-day', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const cycle = await intelligenceStore.saveWashDayCycle(user.id, req.body || {});
    res.json({ cycle });
  }));

  app.post('/api/wash-day/mark-done', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const cycle = await intelligenceStore.markWashDayDone(user.id, typeof req.body?.at === 'string' ? req.body.at : undefined);
    res.json({ cycle });
  }));

  // ============================================================
}
