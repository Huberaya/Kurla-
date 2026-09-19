import type { Express } from 'express';

import { normalizeWeatherContext } from '../../lib/adaptiveRoutine';
import { buildHairEvolutionReport, buildSkinEvolutionReport, type JournalEntryInput, type SkinJournalEntryInput } from '../../lib/knowledge/profileEvolution';
import type { HairAdvisoryContext } from '../../lib/knowledge/hairAdvisory';
import type { SkinAdvisoryContext } from '../../lib/knowledge/skinAdvisory';
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

  // D2 — L'ÉVOLUTION DU PROFIL : le journal (signaux + jauges) est converti
  // en réponses du diagnostic, le moteur segmenté est RE-EXÉCUTÉ, et la page
  // « Votre profil a évolué » montre l'avant/après avec la cause de chaque
  // changement. Lecture seule ici ; l'application est un choix explicite.
  const snapshotToContext = (snap: any): HairAdvisoryContext | null => {
    if (!snap || typeof snap !== 'object') return null;
    const one = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
    return {
      texture: one(snap.texture), style: one(snap.style), focus: one(snap.focus),
      priority: one(snap.priority), porosity: one(snap.porosity), scalp: one(snap.scalp),
      frequency: one(snap.frequency), length: one(snap.length), experience: one(snap.experience),
      shorten: snap.shorten === 'true',
    };
  };

  const snapshotToSkinContext = (snap: any): SkinAdvisoryContext | null => {
    if (!snap || typeof snap !== 'object' || !snap.atSkin) return null;
    const one = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
    const list = (v: unknown): string[] | undefined => (typeof v === 'string' && v ? v.split(',').filter(Boolean) : undefined);
    return {
      skinType: one(snap.skinType), hydrationLevel: one(snap.skinHydration), sensitivity: one(snap.skinSensitivity),
      skinConcerns: list(snap.skinConcerns), skinObjectives: list(snap.skinObjectives),
      spfUsage: one(snap.skinSpf), acne: one(snap.skinAcne), hyperpigmentationTendency: one(snap.skinMarks)
    };
  };

  // Signaux peau consignés dans le JOURNAL CHEVEUX (les trois que D2 renvoyait
  // explicitement au parcours peau) : ils entrent ici, dans la fenêtre du
  // diagnostic peau — plus aucun signal sans réponse, des deux côtés.
  const SKIN_ALIASES = new Set(['spots_improving', 'spots_not_improving', 'skin_tight']);
  const hairJournalSkinSignals = (journal: any[], skinAt?: string): string[] => {
    const floor = skinAt ? new Date(skinAt).getTime() : 0;
    const out = new Set<string>();
    for (const entry of journal ?? []) {
      const ms = new Date(`${entry.entryDate}T12:00:00`).getTime();
      if (floor && Number.isFinite(ms) && ms < floor) continue;
      for (const signal of entry.signals ?? []) if (SKIN_ALIASES.has(signal)) out.add(signal);
    }
    return [...out];
  };

  async function evolutionPayload(userId: string) {
    const [profileRecord, state, skinJournal] = await Promise.all([
      serverDb.getBeautyProfile(userId),
      serverDb.getAdaptiveRoutineState(userId),
      serverDb.getSkinJournalEntries(userId).catch(() => [] as any[])
    ]);
    const snapshot = (profileRecord?.profile as any)?.diagnostic ?? null;
    const entries: JournalEntryInput[] = (state.journal ?? []).map((e: any) => ({
      entryDate: e.entryDate,
      signals: e.signals ?? [],
      hydrationScore: e.hydrationScore,
      breakageScore: e.breakageScore,
      comfortScore: e.comfortScore,
      detanglingScore: e.detanglingScore
    }));
    const report = buildHairEvolutionReport(snapshotToContext(snapshot), entries, snapshot?.at);
    const skinEntries: SkinJournalEntryInput[] = (skinJournal ?? []).map((e: any) => ({
      date: e.date ?? e.entryDate,
      feelingScore: typeof e.feelingScore === 'number' ? e.feelingScore : undefined,
      concerns: e.concerns ?? []
    }));
    const skinReport = buildSkinEvolutionReport(
      snapshotToSkinContext(snapshot),
      skinEntries,
      snapshot?.atSkin,
      hairJournalSkinSignals(state.journal ?? [], snapshot?.atSkin)
    );
    return { report, skinReport, profileRecord, snapshot };
  }

  app.get('/api/routine/evolution', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const { report, skinReport, snapshot } = await evolutionPayload(user.id);
    res.json({
      report,
      skinReport,
      applied: (snapshot as any)?.source === 'journal',
      skinApplied: (snapshot as any)?.skinApplied === 'journal',
      diagnosticAt: (snapshot as any)?.at ?? null,
      skinAt: (snapshot as any)?.atSkin ?? null
    });
  }));

  app.post('/api/routine/evolution/apply', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const { report, skinReport, profileRecord, snapshot } = await evolutionPayload(user.id);
    const domain = req.body?.domain === 'skin' ? 'skin' : 'hair';
    const active = domain === 'skin' ? skinReport : report;
    if (!active.available) return res.status(409).json({ error: domain === 'skin' ? 'Impossible de recaler la routine peau sans diagnostic peau enregistré.' : 'Impossible de recaler la routine sans diagnostic enregistré.' });
    if (active.changes.length === 0) return res.status(409).json({ error: 'Rien à appliquer : le journal ne demande aucun ajustement pour le moment.' });
    if (domain === 'skin') {
      try {
        const next = active.nextContext as any;
        await serverDb.saveBeautyProfile(user.id, {
          ...(profileRecord?.profile ?? {}),
          diagnostic: {
            ...(((profileRecord?.profile as any)?.diagnostic ?? {}) as Record<string, unknown>),
            atSkin: (snapshot as any)?.atSkin ?? new Date().toISOString(),
            skinConcerns: (next.skinConcerns ?? []).join(','),
            skinObjectives: (next.skinObjectives ?? []).join(','),
            skinApplied: 'journal'
          }
        } as any, 'journal');
        const refreshed = await evolutionPayload(user.id);
        res.json({ applied: true, domain, report: refreshed.skinReport, entries: (await serverDb.getSkinJournalEntries(user.id).catch(() => []))?.length ?? 0 });
      } catch (err) {
        console.error('[Evolution] application peau impossible :', err);
        res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette évolution peau.') });
      }
      return;
    }
    try {
      const next = report.nextContext as Record<string, unknown>;
      await serverDb.saveBeautyProfile(user.id, {
        ...(profileRecord?.profile ?? {}),
        diagnostic: {
          // Le point de départ du diagnostic EST conservé (sinon le journal
          // deviendrait « antérieur au diagnostic » et la boucle s'effacerait).
          at: (snapshot as any)?.at ?? new Date().toISOString(),
          source: 'journal',
          texture: String(next.texture ?? ''), style: String(next.style ?? ''), focus: String(next.focus ?? ''),
          priority: String(next.priority ?? ''), porosity: String(next.porosity ?? ''), scalp: String(next.scalp ?? ''),
          frequency: String(next.frequency ?? ''), length: String(next.length ?? ''), experience: String(next.experience ?? ''),
          shorten: next.shorten === true ? 'true' : ''
        }
      } as any, 'journal');
      const refreshed = await evolutionPayload(user.id);
      res.json({ applied: true, report: refreshed.report, journalCount: (await serverDb.getAdaptiveRoutineState(user.id)).journal?.length ?? 0 });
    } catch (err) {
      console.error('[Evolution] application impossible :', err);
      res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette évolution.') });
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
