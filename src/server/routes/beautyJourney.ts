import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.4 — Beauty Journey : la narration de l'évolution.
 *
 * Une seule route, en lecture seule : le parcours ne collecte rien, il relit ce
 * que la personne a déjà déclaré et le lui rend lisible. Les valeurs renvoyées
 * sont accompagnées de leur origine (`persistence`) et des réserves d'usage —
 * déclarations et non mesures, absence d'avis médical.
 */
export function registerBeautyJourneyRoutes(app: Express): void {
  app.get('/api/beauty-journey', rateLimit('beauty-journey', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const [journey, persistence] = await Promise.all([
      serverDb.getBeautyJourney(user.id),
      serverDb.getBeautyJourneyPersistence()
    ]);
    res.json({ journey, persistence });
  }));
}
