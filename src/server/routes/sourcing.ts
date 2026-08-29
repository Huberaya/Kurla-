import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';

/**
 * CHANTIER 16C — ROUTES DE SOURCING.
 *
 * Garde de rôle avant tout effet, comme les 35 routes inventoriées : c'est la
 * règle vérifiée en 15A, elle s'applique sans exception aux nouvelles.
 *
 * Une précision qui compte, parce que ces routes manipulent de l'argent et des
 * engagements : **aucune d'elles n'envoie quoi que ce soit.** `send` enregistre
 * le fait qu'un humain a envoyé la demande, avec le destinataire et la date. La
 * plateforme n'a ni boîte mail ni mandat pour engager la marque.
 */
export function registerSourcingRoutes(app: Express): void {
  app.get('/api/admin/sourcing/items', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const wave = typeof req.query.wave === 'string' ? req.query.wave.trim() : undefined;
      const items = await serverDb.listSourcingItems(wave || undefined);
      // Le nombre de demandes et de réponses est calculé, pas supposé : un
      // besoin « en consultation » sans aucune demande envoyée doit se voir.
      const detailed = await Promise.all(items.map(async item => {
        const rfqs = await serverDb.listRfqs(item.id);
        const comparison = await serverDb.compareRfqResponses(item.id);
        return {
          ...item,
          rfqCount: rfqs.length,
          sentCount: rfqs.filter(rfq => rfq.status !== 'draft').length,
          responseCount: comparison.responseCount,
          selectableResponses: comparison.rows.filter(row => row.selectable).length
        };
      }));
      res.json({ items: detailed, count: detailed.length });
    } catch (error) {
      console.error('[Sourcing] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Besoins de sourcing indisponibles.') });
    }
  }));

  app.post('/api/admin/sourcing/items', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const item = await serverDb.createSourcingItem(admin.id, req.body || {});
      res.status(201).json({ item });
    } catch (error) {
      console.error('[Sourcing] create item error:', error);
      res.status(400).json({ error: safeApiError(error, 'Besoin de sourcing non créé.') });
    }
  }));

  app.get('/api/admin/sourcing/items/:itemId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const item = await serverDb.getSourcingItem(req.params.itemId);
      if (!item) return res.status(404).json({ error: 'Besoin de sourcing introuvable.' });
      const rfqs = await serverDb.listRfqs(item.id);
      const comparison = await serverDb.compareRfqResponses(item.id);
      res.json({ item, rfqs, comparison });
    } catch (error) {
      console.error('[Sourcing] item detail error:', error);
      res.status(500).json({ error: safeApiError(error, 'Fiche de sourcing indisponible.') });
    }
  }));

  app.post('/api/admin/sourcing/items/:itemId/rfqs', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const rfq = await serverDb.createRfq(admin.id, req.params.itemId);
      res.status(201).json({ rfq });
    } catch (error) {
      console.error('[Sourcing] create rfq error:', error);
      res.status(400).json({ error: safeApiError(error, 'Demande de prix non générée.') });
    }
  }));

  app.post('/api/admin/sourcing/rfqs/:rfqId/send', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const rfq = await serverDb.markRfqSent(admin.id, req.params.rfqId, req.body || {});
      res.json({ rfq });
    } catch (error) {
      console.error('[Sourcing] send rfq error:', error);
      res.status(400).json({ error: safeApiError(error, 'Envoi non enregistré.') });
    }
  }));

  app.post('/api/admin/sourcing/rfqs/:rfqId/responses', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const response = await serverDb.recordRfqResponse(admin.id, req.params.rfqId, req.body || {});
      res.status(201).json({ response });
    } catch (error) {
      console.error('[Sourcing] record response error:', error);
      res.status(400).json({ error: safeApiError(error, 'Réponse non enregistrée.') });
    }
  }));

  app.post('/api/admin/sourcing/items/:itemId/award', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const responseId = typeof req.body?.responseId === 'string' ? req.body.responseId.trim() : '';
    if (!responseId) return res.status(400).json({ error: 'La réponse retenue est obligatoire.' });
    try {
      const item = await serverDb.awardSourcingItem(admin.id, req.params.itemId, responseId);
      res.json({ item });
    } catch (error) {
      console.error('[Sourcing] award error:', error);
      res.status(400).json({ error: safeApiError(error, 'Sélection refusée.') });
    }
  }));
}
