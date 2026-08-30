import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';

/**
 * PROSPECTS DE SOURCING & RÉFÉRENCES À INTÉGRER — routes d'administration.
 *
 * Données internes : garde `requireAdmin` sur toutes les routes (rôle
 * vérifié côté serveur depuis le jeton Supabase, jamais depuis des en-têtes).
 * Ces routes n'envoient aucun email : elles enregistrent l'état d'un suivi de
 * prospection tenu par un humain, comme le reste du chantier d'approvisionnement.
 */
export function registerProspectRoutes(app: Express): void {
  // ---- Prospects (marques / distributeurs / façonniers à contacter) ----
  app.get('/api/admin/sourcing/prospects', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const prospects = await serverDb.listProspects();
      res.json({ prospects, count: prospects.length });
    } catch (error) {
      console.error('[Prospects] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Prospects indisponibles.') });
    }
  }));

  app.put('/api/admin/sourcing/prospects/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const prospect = await serverDb.upsertProspect(admin.id, { ...(req.body || {}), id: req.params.id });
      res.json({ prospect });
    } catch (error) {
      console.error('[Prospects] update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Prospect non enregistré.') });
    }
  }));

  app.post('/api/admin/sourcing/prospects', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const prospect = await serverDb.upsertProspect(admin.id, req.body || {});
      res.status(201).json({ prospect });
    } catch (error) {
      console.error('[Prospects] create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Prospect non créé.') });
    }
  }));

  // ---- Références candidates à intégrer au catalogue ----
  app.get('/api/admin/sourcing/candidates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const prospectId = typeof req.query.prospectId === 'string' ? req.query.prospectId.trim() : undefined;
      const candidates = await serverDb.listCandidates(prospectId || undefined);
      res.json({ candidates, count: candidates.length });
    } catch (error) {
      console.error('[Candidates] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Références indisponibles.') });
    }
  }));

  app.put('/api/admin/sourcing/candidates/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const candidate = await serverDb.upsertCandidate(admin.id, { ...(req.body || {}), id: req.params.id });
      res.json({ candidate });
    } catch (error) {
      console.error('[Candidates] update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Référence non enregistrée.') });
    }
  }));

  app.post('/api/admin/sourcing/candidates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const candidate = await serverDb.upsertCandidate(admin.id, req.body || {});
      res.status(201).json({ candidate });
    } catch (error) {
      console.error('[Candidates] create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Référence non créée.') });
    }
  }));
}
