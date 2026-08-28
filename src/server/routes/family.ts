import type { Express, Response } from 'express';

import { FAMILY_AGE_BANDS } from '../../lib/familyProfiles';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.1 — espace famille, extrait de `server.ts`.
 *
 * Les chemins sont inchangés, caractère pour caractère : le module reçoit la
 * même application Express et n'ajoute aucun préfixe. L'inventaire des routes
 * (`tests/route_inventory.test.ts`) vérifie qu'aucune n'a bougé.
 */
export function registerFamilyRoutes(app: Express): void {
    app.get('/api/family', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.json(await serverDb.getFamilyDashboard(user.id));
    } catch (error) {
      res.status(500).json({ error: safeApiError(error, 'Impossible de charger l’espace famille.') });
    }
  }));

  app.post('/api/family/spaces', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.status(201).json({ space: await serverDb.createFamilySpace(user.id, req.body || {}) });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible de créer l’espace famille.') });
    }
  }));

  app.post('/api/family/members', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.status(201).json({ member: await serverDb.saveFamilyMember(user.id, req.body || {}) });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible d’enregistrer ce profil familial.') });
    }
  }));

  app.patch('/api/family/members/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.json({ member: await serverDb.saveFamilyMember(user.id, { ...(req.body || {}), id: req.params.id }) });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible de modifier ce profil familial.') });
    }
  }));

  app.delete('/api/family/members/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      await serverDb.deleteFamilyMember(user.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible de supprimer ce profil familial.') });
    }
  }));

  app.get('/api/family/products', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const ageBand = typeof req.query.ageBand === 'string' ? req.query.ageBand.trim() : undefined;
    const audience = typeof req.query.audience === 'string' ? req.query.audience.trim() : undefined;
    if (ageBand && !FAMILY_AGE_BANDS.includes(ageBand as any)) return res.status(400).json({ error: 'Tranche d’âge invalide.' });
    try {
      const products = await serverDb.getFamilyProducts(ageBand, audience);
      res.json({ products, count: products.length });
    } catch (error) {
      res.status(500).json({ error: safeApiError(error, 'Les produits famille ne sont pas disponibles.') });
    }
  }));

  app.post('/api/family/plans', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.status(201).json({ plan: await serverDb.saveFamilyPlan(user.id, req.body || {}) });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible d’enregistrer ce plan familial.') });
    }
  }));

  app.patch('/api/family/plans/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.json({ plan: await serverDb.saveFamilyPlan(user.id, { ...(req.body || {}), id: req.params.id }) });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible de modifier ce plan familial.') });
    }
  }));

  app.delete('/api/family/plans/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      await serverDb.deleteFamilyPlan(user.id, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Impossible de supprimer ce plan familial.') });
    }
  }));

  app.get('/api/routines/:slug', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const routine = await serverDb.getRoutineBySlug(req.params.slug);
    if (!routine) return res.status(404).json({ error: 'Routine non disponible.' });
    res.json({ routine });
  }));
}
