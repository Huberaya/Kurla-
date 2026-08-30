import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { runRetentionNudges } from '../../lib/db/retentionNudgesStore';

/**
 * BOUCLE DE DONNÉES — déclenchement des relances de rétention.
 *
 * Route admin protégée, destinée à être appelée une fois par jour par une
 * tâche planifiée (cron / Vercel Cron). Elle calcule les nudges de tous les
 * utilisateurs actifs et crée les notifications dédoublonnées. Idempotente :
 * la relancer le même jour ne crée pas de doublon (dedupe_key stable).
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
}
