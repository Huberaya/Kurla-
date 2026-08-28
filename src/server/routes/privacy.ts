import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { deleteUserData, exportUserData } from '../../lib/db/privacyStore';
import { PHOTO_AIPD, PHOTO_MAX_PER_MEMBER, PHOTO_RETENTION_DAYS, purgeExpiredBeautyProfilePhotos } from '../../lib/photoAipd';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin, requireUser } from '../auth';
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

  /**
   * CHANTIER 9 (bloc A3) — l'analyse d'impact photo, lisible avant l'envoi.
   * Publique : on ne demande pas de compte pour savoir ce qu'on fait d'une
   * image. La même référence est portée par le code (`PHOTO_AIPD`).
   */
  app.get('/api/privacy/photo-aipd', rateLimit('photo-aipd', 30, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      aipd: PHOTO_AIPD,
      retentionDays: PHOTO_RETENTION_DAYS,
      maxPhotosPerMember: PHOTO_MAX_PER_MEMBER
    });
  }));

  /**
   * Purge réelle de la rétention annoncée. Réservée à l'administration : un
   * membre n'a pas à déclencher une opération qui parcourt tous les comptes —
   * il supprime les siennes avec `DELETE /api/beauty-profile/photos`.
   */
  app.post('/api/admin/maintenance/photo-purge', rateLimit('photo-purge', 5, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const result = await purgeExpiredBeautyProfilePhotos(serverDb);
    res.json(result);
  }));
}
