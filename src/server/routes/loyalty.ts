import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { LOYALTY_AXES, LOYALTY_BADGES, LOYALTY_EVENT_RULES, LOYALTY_LEVELS, LOYALTY_REWARDS } from '../../lib/loyaltyRules';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin, requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.3 — KURLA PROGRESSION.
 *
 * Loyalty par progression, pas par points seuls : cinq axes plafonnés, dont
 * l'achat (80 points sur 460). Les récompenses se débloquent par niveau, jamais
 * contre des points — aucune fonction essentielle ne devient payante.
 *
 * Le barème est public (`GET /api/loyalty/rules`) : un membre doit pouvoir
 * comprendre comment il progresse sans avoir de compte, et vérifier que l'achat
 * n'est pas le seul chemin.
 */

export function registerLoyaltyRoutes(app: Express): void {
  // Barème complet, lisible sans authentification.
  app.get('/api/loyalty/rules', rateLimit('loyalty-rules', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      levels: LOYALTY_LEVELS,
      axes: LOYALTY_AXES,
      eventRules: LOYALTY_EVENT_RULES,
      rewards: LOYALTY_REWARDS.filter(reward => reward.isActive),
      badges: LOYALTY_BADGES,
      // La propriété structurante, exposée telle quelle plutôt que promise.
      purchaseCapPoints: LOYALTY_AXES.find(axis => axis.axis === 'achat')?.maxPoints ?? 0,
      totalPoints: LOYALTY_AXES.reduce((total, axis) => total + axis.maxPoints, 0)
    });
  }));

  app.get('/api/loyalty', rateLimit('loyalty-overview', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const overview = await serverDb.getLoyaltyOverview(user.id);
    res.json(overview);
  }));

  app.get('/api/loyalty/events', rateLimit('loyalty-events', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const limit = Number(req.query.limit) || 50;
    const events = await serverDb.getLoyaltyEvents(user.id, limit);
    res.json({ events, count: events.length });
  }));

  // Scan d'un produit ou d'un ingrédient : comportement non marchand, exploratoire.
  // L'écran de scan (action 33) n'existe pas encore ; l'ingestion, si.
  app.post('/api/loyalty/scan', rateLimit('loyalty-scan', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const barcode = typeof req.body?.barcode === 'string' ? req.body.barcode.trim().slice(0, 40) : '';
    const ingredient = typeof req.body?.ingredient === 'string' ? req.body.ingredient.trim().slice(0, 120) : '';
    const product = typeof req.body?.product === 'string' ? req.body.product.trim().slice(0, 160) : '';
    if (!barcode && !ingredient && !product) {
      res.status(400).json({ error: 'Un code-barres, un ingrédient ou un produit est requis.' });
      return;
    }
    const reference = barcode || ingredient || product;
    // Un même objet scanné deux fois le même jour ne rapporte qu'une fois :
    // la clé d'idempotence porte la date.
    const dedupeKey = `scan_performed:${user.id}:${reference.toLowerCase()}:${new Date().toISOString().slice(0, 10)}`;
    const result = await serverDb.applyLoyaltyEvent(user.id, 'scan_performed', reference, dedupeKey);
    res.status(201).json({ scanned: reference, ...result });
  }));

  app.get('/api/loyalty/rewards', rateLimit('loyalty-rewards', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const redemptions = await serverDb.getLoyaltyRedemptions(user.id);
    res.json({ redemptions, count: redemptions.length });
  }));

  app.post('/api/loyalty/rewards/:code/request', rateLimit('loyalty-reward-request', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const redemption = await serverDb.requestLoyaltyReward(user.id, String(req.params.code));
      res.status(201).json(redemption);
    } catch (error: any) {
      res.status(400).json({ error: error?.message || 'Demande de récompense refusée.' });
    }
  }));

  // --- administration --------------------------------------------------------

  app.get('/api/admin/loyalty/redemptions', rateLimit('admin-loyalty', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const redemptions = await serverDb.getAdminLoyaltyRedemptions();
    res.json({ redemptions, count: redemptions.length });
  }));

  app.post('/api/admin/loyalty/redemptions/:id', rateLimit('admin-loyalty-handle', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const status = req.body?.status;
    if (status !== 'granted' && status !== 'cancelled') {
      res.status(400).json({ error: 'Statut attendu : granted ou cancelled.' });
      return;
    }
    try {
      const redemption = await serverDb.handleLoyaltyRedemption(
        admin.id,
        String(req.params.id),
        status,
        typeof req.body?.note === 'string' ? req.body.note.slice(0, 500) : undefined
      );
      res.json(redemption);
    } catch (error) {
      res.status(404).json({ error: safeApiError(error, 'Traitement de la récompense impossible.') });
    }
  }));

  // Rétention mesurée : le critère de sortie du chantier E.
  app.get('/api/admin/loyalty/retention', rateLimit('admin-loyalty-retention', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const cohorts = await serverDb.getLoyaltyRetention();
    res.json({
      cohorts,
      count: cohorts.length,
      // Une cohorte dont la fenêtre n'est pas écoulée renvoie des taux nuls :
      // on ne publie jamais un pourcentage calculé sur du temps pas encore passé.
      note: cohorts.length === 0
        ? 'Aucune cohorte : la rétention se mesure sur du trafic réel, pas sur des données simulées.'
        : 'Taux nuls tant que la fenêtre (D30/D60/D90) n’est pas écoulée.'
    });
  }));
}
