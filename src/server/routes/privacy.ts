import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { deleteUserData, exportUserData } from '../../lib/db/privacyStore';
import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 9 (bloc A2) — export / suppression en 1 clic (feature 43).
 *
 * Deux routes, un seul compte : le membre agit sur SES données avec SON jeton.
 * Personne d'autre — pas même un administrateur via ces routes — ne peut
 * exporter ou supprimer le compte d'un tiers.
 */
export function registerPrivacyRoutes(app: Express): void {
  /** Tout ce que KURLA détient sur le membre, structuré et lisible. */
  app.get('/api/account/export', rateLimit('account-export', 5, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const data = await exportUserData(serverDb, user.id);
    res.setHeader('Content-Disposition', `attachment; filename="kurla-donnees-${new Date().toISOString().slice(0, 10)}.json`);
    res.json(data);
  }));

  /**
   * Suppression en 1 clic. La confirmation est exigée côté client ; ici on
   * vérifie seulement l'identité. La réponse dit honnêtement ce qui est
   * conservé pour obligation légale.
   */
  app.post('/api/account/delete', rateLimit('account-delete', 3, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const result = await deleteUserData(serverDb, user.id);
    res.json(result);
  }));
}
