import type { Express, Response } from 'express';

import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';
import { serverDb } from '../../lib/serverDb';

/** C6 — journal peau, observance et photos privées déjà encadrées par l’AIPD. */
export function registerSkinJournalRoutes(app: Express): void {
  app.get('/api/skin/journal', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ entries: await serverDb.getSkinJournalEntries(user.id), persistence: 'server' });
  }));

  app.post('/api/skin/journal', rateLimit('skin-journal-write', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const entry = await serverDb.createSkinJournalEntry(user.id, {
        date: req.body?.date,
        feelingScore: req.body?.feelingScore,
        concerns: req.body?.concerns,
        notes: req.body?.notes,
        milestone: req.body?.milestone,
        photoId: req.body?.photoId
      });
      res.status(201).json({ entry });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Entrée du journal peau invalide.') });
    }
  }));

  app.delete('/api/skin/journal/:entryId', rateLimit('skin-journal-delete', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const entry = await serverDb.deleteSkinJournalEntry(user.id, String(req.params.entryId));
    if (!entry) return res.status(404).json({ error: 'Entrée du journal introuvable.' });
    if (entry.photoId) await serverDb.deleteBeautyProfilePhoto(user.id, entry.photoId);
    res.json({ success: true });
  }));

  app.get('/api/skin/observance', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ days: await serverDb.getSkinObservance(user.id, typeof req.query.from === 'string' ? req.query.from : undefined, typeof req.query.to === 'string' ? req.query.to : undefined) });
  }));

  app.put('/api/skin/observance/:day', rateLimit('skin-observance-write', 120, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const day = await serverDb.setSkinObservance(user.id, String(req.params.day), {
        matin: req.body?.matin,
        soir: req.body?.soir
      });
      res.json({ day });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Observance invalide.') });
    }
  }));
}
