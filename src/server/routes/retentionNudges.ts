import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { runRetentionNudges } from '../../lib/db/retentionNudgesStore';

/**
 * BOUCLE DE DONNÉES — déclenchement des relances de rétention.
 *
 * Deux points d'entrée, même calcul idempotent (dedupe_key stable : relancer
 * le même jour ne crée jamais de doublon) :
 *
 *  - `POST /api/admin/retention/run` : déclenchement manuel par un admin
 *    (bouton dans le cockpit opérations).
 *  - `GET  /api/cron/retention`     : appel quotidien par Vercel Cron. Protégé
 *    par `CRON_SECRET` (header `Authorization: Bearer <secret>`), posé comme
 *    variable d'environnement. Vercel envoie aussi `x-vercel-cron`, mais on
 *    exige le secret pour ne pas dépendre d'un header non signé.
 */
export function registerRetentionNudgeRoutes(app: Express): void {
  app.post('/api/admin/retention/run', rateLimit('retention-run', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const limit = typeof req.body?.limitUsers === 'number' ? req.body.limitUsers : undefined;
      const result = await runRetentionNudges(serverDb, { limitUsers: limit });
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error('[Retention] run error:', error);
      res.status(500).json({ error: safeApiError(error, 'Calcul des relances indisponible.') });
    }
  }));

  app.get('/api/cron/retention', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      // Tant que le secret n'est pas configuré, l'endpoint refuse de s'exécuter
      // publiquement : pas de relance déclenchable par un visiteur anonyme.
      return res.status(503).json({ error: 'Cron non configuré (CRON_SECRET absent).' });
    }
    const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (provided !== secret) {
      return res.status(401).json({ error: 'Accès cron refusé.' });
    }
    try {
      const result = await runRetentionNudges(serverDb);
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error('[Retention] cron error:', error);
      res.status(500).json({ error: safeApiError(error, 'Relances indisponibles.') });
    }
  }));
}
