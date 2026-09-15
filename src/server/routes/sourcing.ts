import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { readWorkspaceScope, sourcingItemInWorkspace, type WorkspaceScope } from '../workspaceScope';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { buildConsolidatedSourcing } from '../../lib/sourcingConsolidated';

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
async function assertSourcingItemScope(item: any, scope: WorkspaceScope | undefined): Promise<boolean> {
  return !scope || sourcingItemInWorkspace(item, scope);
}

async function rfqInWorkspace(rfqId: string, scope: WorkspaceScope): Promise<boolean> {
  const items = await serverDb.listSourcingItems();
  for (const item of items) {
    if (!sourcingItemInWorkspace(item, scope)) continue;
    if ((await serverDb.listRfqs(item.id)).some(rfq => rfq.id === rfqId)) return true;
  }
  return false;
}

export function registerSourcingRoutes(app: Express): void {
  /**
   * VUE CONSOLIDÉE (14/09/2026) : « je veux voir tous les 242 produits avec
   * les prix et le nom des fournisseurs et leurs contacts avec des emails
   * prêts à être envoyés ». Produits publiables + candidats sourcing,
   * regroupés par fournisseur ; l'e-mail « prêt » est un RFQ existant ou un
   * e-mail généré depuis les seules données réelles. Lecture seule : rien
   * n'est envoyé, conformément au mandat 16C.
   */
  app.get('/api/admin/sourcing/consolidated', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const [products, candidates, positions, prospects, suppliers, rfqs] = await Promise.all([
        serverDb.getAdminCatalogProducts(),
        supabase.from('sourcing_product_candidates').select('*'),
        supabase.from('sourcing_fond_positions').select('*'),
        supabase.from('sourcing_prospects').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('rfqs').select('*'),
      ]);
      res.json(buildConsolidatedSourcing({
        products,
        candidates: candidates.data || [],
        positions: positions.data || [],
        prospects: prospects.data || [],
        suppliers: suppliers.data || [],
        rfqs: rfqs.data || [],
      }));
    } catch (error) {
      console.error('[Sourcing] consolidated error:', error);
      res.status(500).json({ error: safeApiError(error, 'Impossible de charger la vue sourcing consolidée.') });
    }
  }));

  app.get('/api/admin/sourcing/items', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const wave = typeof req.query.wave === 'string' ? req.query.wave.trim() : undefined;
      const scope = readWorkspaceScope(req);
      const allItems = await serverDb.listSourcingItems(wave || undefined);
      const items = scope ? allItems.filter(item => sourcingItemInWorkspace(item, scope)) : allItems;
      // Le nombre de demandes et de réponses est calculé, pas supposé : un
      // besoin « en consultation » sans aucune demande envoyée doit se voir.
      const detailed = await Promise.all(items.map(async item => {
        const rfqs = await serverDb.listRfqs(item.id);
        const comparison = await serverDb.compareRfqResponses(item.id);
        // Relance J+3 (chantier 17/09) : les demandes ENVOYÉES sans réponse
        // sont comptées et datées — la file « À faire aujourd'hui » déclenche
        // la relance à partir de la plus ancienne. Mesuré, pas supposé :
        // une RFQ « sent » sans `sentOn` ne peut pas être datée, donc
        // n'entre pas dans le délai.
        const awaiting = rfqs.filter(rfq => rfq.status === 'sent' && rfq.sentOn);
        const oldestAwaitingSentOn = awaiting.length > 0
          ? awaiting.map(rfq => String(rfq.sentOn)).sort()[0]
          : null;
        return {
          ...item,
          rfqCount: rfqs.length,
          sentCount: rfqs.filter(rfq => rfq.status !== 'draft').length,
          sentAwaitingCount: awaiting.length,
          oldestAwaitingSentOn,
          responseCount: comparison.responseCount,
          selectableResponses: comparison.rows.filter(row => row.selectable).length
        };
      }));
      res.json({ items: detailed, count: detailed.length, scope: scope || 'all' });
    } catch (error) {
      console.error('[Sourcing] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Besoins de sourcing indisponibles.') });
    }
  }));

  app.post('/api/admin/sourcing/items', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope && !sourcingItemInWorkspace(req.body || {}, scope)) {
        return res.status(400).json({ error: 'Besoin de sourcing hors de cet espace.' });
      }
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
      const scope = readWorkspaceScope(req);
      if (!(await assertSourcingItemScope(item, scope))) return res.status(404).json({ error: 'Besoin de sourcing introuvable dans cet espace.' });
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
      const scope = readWorkspaceScope(req);
      const item = await serverDb.getSourcingItem(req.params.itemId);
      if (!item || !(await assertSourcingItemScope(item, scope))) return res.status(404).json({ error: 'Besoin de sourcing introuvable dans cet espace.' });
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
      const scope = readWorkspaceScope(req);
      if (scope && !(await rfqInWorkspace(req.params.rfqId, scope))) return res.status(404).json({ error: 'Demande de prix introuvable dans cet espace.' });
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
      const scope = readWorkspaceScope(req);
      if (scope && !(await rfqInWorkspace(req.params.rfqId, scope))) return res.status(404).json({ error: 'Demande de prix introuvable dans cet espace.' });
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
      const scope = readWorkspaceScope(req);
      const sourcingItem = await serverDb.getSourcingItem(req.params.itemId);
      if (!sourcingItem || !(await assertSourcingItemScope(sourcingItem, scope))) return res.status(404).json({ error: 'Besoin de sourcing introuvable dans cet espace.' });
      const item = await serverDb.awardSourcingItem(admin.id, req.params.itemId, responseId);
      res.json({ item });
    } catch (error) {
      console.error('[Sourcing] award error:', error);
      res.status(400).json({ error: safeApiError(error, 'Sélection refusée.') });
    }
  }));
}
