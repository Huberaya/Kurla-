import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { runRetentionNudges } from '../../lib/db/retentionNudgesStore';
import { runAbandonedCartRecovery } from '../../lib/db/abandonedCartStore';

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
// Commande en attente de paiement, quel que soit l'état du webhook.
const PENDING_STATUSES = ['pending_payment', 'payment_pending_webhook'];

/**
 * Récupération des paniers/paiements abandonnés : sélectionne les commandes
 * jamais payées (fenêtre des 3 relances, ≤ ~10 jours) et envoie l'étape due.
 * Séparée des nudges in-app pour pouvoir être lancée seule (cron/admin).
 */
async function runAbandonedRecovery() {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const pending = await serverDb.listOrdersByStatus(PENDING_STATUSES as never, { limit: 200, olderThan: undefined } as never);
  const recent = pending.filter(o => {
    const created = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    return created >= tenDaysAgo.getTime();
  });
  return runAbandonedCartRecovery({ pendingOrders: recent });
}

export function registerRetentionNudgeRoutes(app: Express): void {
  // Récupération des paniers abandonnés (emails) — admin, déclenchement manuel.
  app.post('/api/admin/retention/recover-abandoned', rateLimit('retention-recover', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const result = await runAbandonedRecovery();
      res.json({ ok: true, abandoned: result });
    } catch (error) {
      console.error('[Retention] abandoned cart error:', error);
      res.status(500).json({ error: safeApiError(error, 'Relance des paniers indisponible.') });
    }
  }));

  app.post('/api/admin/retention/run', rateLimit('retention-run', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const limit = typeof req.body?.limitUsers === 'number' ? req.body.limitUsers : undefined;
      const result = await runRetentionNudges(serverDb, { limitUsers: limit });
      // On lance aussi la récupération des paniers abandonnés dans le même cycle.
      let abandoned = null;
      try { abandoned = await runAbandonedRecovery(); } catch (e) { console.error('[Retention] abandoned cart error:', e); }
      res.json({ ok: true, ...result, abandoned });
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
      let abandoned = null;
      try { abandoned = await runAbandonedRecovery(); } catch (e) { console.error('[Retention] abandoned cart cron error:', e); }
      res.json({ ok: true, ...result, abandoned });
    } catch (error) {
      console.error('[Retention] cron error:', error);
      res.status(500).json({ error: safeApiError(error, 'Relances indisponibles.') });
    }
  }));
}
