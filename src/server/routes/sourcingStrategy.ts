import type { Express, Response } from 'express';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';

export function registerSourcingStrategyRoutes(app: Express): void {
  app.get('/api/admin/sourcing/strategy', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const strategy = await (serverDb as any).listSourcingStrategy();
      res.json({ strategy, count: strategy.length });
    } catch (error) {
      console.error('[SourcingStrategy] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Stratégie sourcing indisponible.') });
    }
  }));
}
