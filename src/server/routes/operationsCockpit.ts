import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';

/**
 * CHANTIER 15B — COCKPIT CATALOGUE ET APPROVISIONNEMENT.
 *
 * Une seule route, une seule lecture : le critère du chantier est qu'une
 * personne ouvre l'écran et réponde à « ce produit peut-il être vendu, et sinon
 * qu'est-ce qui manque ». Faire fan-out côté client vers cinq routes séparées
 * rendrait la réponse dépendante de l'ordre d'arrivée des appels.
 *
 * Le cockpit agrège beaucoup de tables : il est limité en débit, comme le
 * rapport de préparation dont il hérite.
 */
export function registerOperationsCockpitRoutes(app: Express): void {
  app.get('/api/admin/operations/cockpit', rateLimit('admin-operations-cockpit', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const cockpit = await serverDb.getOperationsCockpit();
      res.json({ cockpit });
    } catch (error) {
      console.error('[Cockpit] error:', error);
      res.status(500).json({ error: safeApiError(error, 'Cockpit indisponible.') });
    }
  }));
}
