import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { isProductInWorkspace, readWorkspaceScope } from '../workspaceScope';

/**
 * CHANTIER 16D — LOTS, COÛT SERVI, DOUBLE SOURCING.
 *
 * Garde de rôle avant tout effet, comme les 43 routes déjà inventoriées.
 *
 * `GET /api/admin/batches/:batchId/trace` est la route qui porte le critère du
 * chantier : « quelles commandes contiennent le lot X ». Elle interroge la vue
 * `public.batch_order_trace`, donc la jointure est faite par PostgreSQL en une
 * requête — et la vue étant `security_invoker`, les adresses courriel des
 * clients ne sont visibles que d'un administrateur.
 */
async function scopedProductIds(scope: import('../workspaceScope').WorkspaceScope): Promise<Set<string>> {
  const products = await serverDb.getAdminCatalogProducts();
  return new Set(products.filter(product => isProductInWorkspace(product, scope)).map(product => String(product.id)));
}

export function registerBatchRoutes(app: Express): void {
  app.get('/api/admin/batches', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : undefined;
      const scope = readWorkspaceScope(req);
      const allowed = scope ? await scopedProductIds(scope) : undefined;
      if (productId && allowed && !allowed.has(productId)) return res.json({ batches: [], count: 0, scope });
      const allBatches = await serverDb.listBatches(productId || undefined);
      const batches = allowed ? allBatches.filter(batch => allowed.has(String(batch.productId))) : allBatches;
      res.json({ batches, count: batches.length, scope: scope || 'all' });
    } catch (error) {
      console.error('[Batches] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Lots indisponibles.') });
    }
  }));

  app.post('/api/admin/batches', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
      if (scope && (!productId || !(await scopedProductIds(scope)).has(productId))) {
        return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
      }
      const batch = await serverDb.createBatch(admin.id, req.body || {});
      res.status(201).json({ batch });
    } catch (error) {
      console.error('[Batches] create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Lot non enregistré.') });
    }
  }));

  app.get('/api/admin/batches/:batchId/trace', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const batch = await serverDb.getBatch(req.params.batchId);
      if (!batch) return res.status(404).json({ error: 'Lot introuvable.' });
      const scope = readWorkspaceScope(req);
      if (scope && !(await scopedProductIds(scope)).has(String(batch.productId))) {
        return res.status(404).json({ error: 'Lot introuvable dans cet espace.' });
      }
      const rows = await serverDb.getOrdersContainingBatch(req.params.batchId);
      res.json({
        batch,
        rows,
        orders: [...new Set(rows.map(row => row.orderId))],
        orderCount: new Set(rows.map(row => row.orderId)).size,
        allocatedUnits: rows.reduce((sum, row) => sum + row.allocatedQuantity, 0),
        unallocatedUnits: batch.quantityReceived - rows.reduce((sum, row) => sum + row.allocatedQuantity, 0)
      });
    } catch (error) {
      console.error('[Batches] trace error:', error);
      res.status(500).json({ error: safeApiError(error, 'Traçabilité indisponible.') });
    }
  }));

  app.post('/api/admin/batches/:batchId/allocations', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope) {
        const batch = await serverDb.getBatch(req.params.batchId);
        if (!batch || !(await scopedProductIds(scope)).has(String(batch.productId))) {
          return res.status(404).json({ error: 'Lot introuvable dans cet espace.' });
        }
      }
      const allocation = await serverDb.allocateBatchToOrderItem(admin.id, { ...(req.body || {}), batchId: req.params.batchId });
      res.status(201).json({ allocation });
    } catch (error) {
      console.error('[Batches] allocation error:', error);
      res.status(400).json({ error: safeApiError(error, 'Allocation refusée.') });
    }
  }));

  /**
   * Les lignes de commande allouables pour un produit, avec ce qui reste à
   * allouer. Sans cette route, allouer un lot exigerait d'aller chercher un
   * uuid de ligne en base — exactement ce que le chantier 15B voulait éviter.
   */
  app.get('/api/admin/order-items', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
    if (!productId) return res.status(400).json({ error: 'Le paramètre productId est obligatoire.' });
    try {
      const scope = readWorkspaceScope(req);
      if (scope && !(await scopedProductIds(scope)).has(productId)) return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
      const items = await serverDb.listAllocatableOrderItems(productId);
      res.json({ items, count: items.length, scope: scope || 'all' });
    } catch (error) {
      console.error('[Batches] allocatable items error:', error);
      res.status(500).json({ error: safeApiError(error, 'Lignes de commande indisponibles.') });
    }
  }));

  app.get('/api/admin/double-sourcing', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const report = await serverDb.getDoubleSourcingReport();
      const scope = readWorkspaceScope(req);
      if (scope) {
        const allowed = await scopedProductIds(scope);
        const rows = report.rows.filter(row => allowed.has(String(row.productId)));
        const withSecondSource = rows.filter(row => row.hasSecondSource === true).length;
        const withoutSecondSource = rows.filter(row => row.hasSecondSource === false).length;
        const undetermined = rows.filter(row => row.hasSecondSource === null).length;
        return res.json({ report: { products: rows.length, withSecondSource, withoutSecondSource, undetermined, rows }, scope });
      }
      res.json({ report, scope: 'all' });
    } catch (error) {
      console.error('[Batches] double sourcing error:', error);
      res.status(500).json({ error: safeApiError(error, 'Rapport de double sourcing indisponible.') });
    }
  }));
}
