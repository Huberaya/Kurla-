import type { Express } from 'express';

import { normalizeWeatherContext } from '../../lib/adaptiveRoutine';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';
import type { Response } from 'express';

/**
 * CHANTIER 8.1 — routines adaptatives et journal de progression, extraits de
 * `server.ts`. `routinePayload` ne servait qu'ici : il suit ses routes.
 */

export function registerAdaptiveRoutineRoutes(app: Express): void {
  // ADAPTIVE ROUTINES & PERSISTENT PROGRESS JOURNAL API
  // ============================================================
  async function routinePayload(userId: string) {
    const state = await serverDb.getAdaptiveRoutineState(userId);
    await serverDb.notifyDueRoutineReminders(userId, state.tasks);
    return {
      plan: state.plan || null,
      tasks: state.tasks,
      feedback: state.feedback,
      journal: state.journal,
      persistence: state.persistence
    };
  }

  app.get('/api/routine', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json(await routinePayload(user.id));
  }));

  app.put('/api/routine', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    if (req.body?.preferences !== undefined && (typeof req.body.preferences !== 'object' || req.body.preferences === null)) {
      return res.status(400).json({ error: 'Préférences de routine invalides.' });
    }
    try {
      await serverDb.saveAdaptiveRoutine(user.id, req.body?.preferences || {}, req.body?.weather);
      res.json(await routinePayload(user.id));
    } catch (err) {
      console.error('[AdaptiveRoutine] save error:', err);
      res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer votre routine.') });
    }
  }));

  app.patch('/api/routine/tasks/:taskId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const status = req.body?.status;
    if (!['pending', 'completed', 'skipped'].includes(status)) return res.status(400).json({ error: 'Statut de tâche invalide.' });
    const task = await serverDb.updateAdaptiveRoutineTask(user.id, req.params.taskId, status);
    if (!task) return res.status(404).json({ error: 'Tâche de routine introuvable.' });
    res.json({ task });
  }));

  app.post('/api/routine/feedback', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const result = await serverDb.recordRoutineFeedback(user.id, {
        signal: req.body?.signal,
        note: req.body?.note,
        productLabel: req.body?.productLabel,
        observedAt: req.body?.observedAt
      });
      res.status(201).json({ feedback: result.feedback, ...(await routinePayload(user.id)) });
    } catch (err) {
      console.error('[AdaptiveRoutine] feedback error:', err);
      res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette observation.') });
    }
  }));

  app.get('/api/routine/journal', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const state = await serverDb.getAdaptiveRoutineState(user.id);
    res.json({ journal: state.journal, persistence: state.persistence });
  }));

  app.post('/api/routine/journal', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const result = await serverDb.createProgressJournalEntry(user.id, {
        entryDate: req.body?.entryDate,
        note: req.body?.note,
        signals: req.body?.signals,
        metrics: req.body?.metrics,
        productsUsed: req.body?.productsUsed
      });
      res.status(201).json({ entry: result.entry, ...(await routinePayload(user.id)) });
    } catch (err) {
      console.error('[AdaptiveRoutine] journal error:', err);
      res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette note de progression.') });
    }
  }));

  // Weather is fetched only after an explicit browser location permission. It
  // is not inferred from an IP address and remains a transparent context input.
  app.get('/api/routine/weather', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordonnées météo invalides.' });
    }
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(latitude));
      url.searchParams.set('longitude', String(longitude));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation');
      url.searchParams.set('timezone', 'auto');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`weather_provider_${response.status}`);
      const payload = await response.json() as any;
      const weather = normalizeWeatherContext({
        temperatureC: payload?.current?.temperature_2m,
        humidityPercent: payload?.current?.relative_humidity_2m,
        precipitationMm: payload?.current?.precipitation,
        source: 'Open-Meteo',
        observedAt: payload?.current?.time
      });
      if (!weather) throw new Error('weather_payload_incomplete');
      res.json({ weather });
    } catch (err) {
      console.error('[AdaptiveRoutine] weather provider error:', err);
      res.status(502).json({ error: 'La météo actuelle n’est pas disponible. La routine reste basée sur votre profil et vos observations.' });
    }
  }));

  // ============================================================
}
