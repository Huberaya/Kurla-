import type { Express } from 'express';

import { Type } from '@google/genai';

import { AI_TRANSPARENCY } from '../../lib/ai/guardrails';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { formatKnowledgeContext } from '../../lib/ai/knowledgeBase';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { authenticateRequest, bearerToken, requireAdmin } from '../auth';
import { getAvailableCatalog } from '../ai/catalog';
import type { AuthenticatedRequest } from '../types';
import type { Request, Response } from 'express';

/**
 * CHANTIER 8.1 — gouvernance du catalogue (réservée aux administrateurs
 * vérifiés), extraite de `server.ts`. Chemins inchangés.
 */

export function registerCatalogGovernanceRoutes(app: Express): void {
  // PRODUCT CATALOG MANAGEMENT
  // ============================================================
  // These endpoints expose governance fields only to verified admins. The
  // browser never writes products directly to Supabase and cannot publish a
  // record by sending a status flag: publication still requires every trust
  // check to be recorded through the validation endpoint above.
  app.get('/api/admin/catalog/products', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const products = await serverDb.getAdminCatalogProducts();
      res.json({ products, count: products.length });
    } catch (error) {
      console.error('[Catalog] admin list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Impossible de charger le catalogue administrable.') });
    }
  }));

  app.get('/api/admin/catalog/taxonomy', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json(await serverDb.getCatalogTaxonomy());
  }));

  app.get('/api/admin/catalog/imports', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ imports: await serverDb.getCatalogImports() });
  }));

  app.post('/api/admin/catalog/products', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const result = await serverDb.importCatalogRecords(admin.id, [req.body || {}], 'manual');
      if (result.rejected > 0) return res.status(400).json({ error: result.errors[0]?.message || 'Produit catalogue invalide.', result });
      res.status(201).json({ product: result.products[0], import: result });
    } catch (error) {
      console.error('[Catalog] manual product error:', error);
      res.status(400).json({ error: safeApiError(error, 'Impossible d’enregistrer ce produit catalogue.') });
    }
  }));

  app.patch('/api/admin/catalog/products/:productId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const product = await serverDb.saveCatalogProduct(admin.id, { ...(req.body || {}), id: req.params.productId });
      res.json({ product });
    } catch (error) {
      console.error('[Catalog] product update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Impossible de modifier ce produit catalogue.') });
    }
  }));

  app.post('/api/admin/catalog/import/csv', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const csv = req.body?.csv;
    if (typeof csv !== 'string' || !csv.trim() || csv.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'CSV vide ou supérieur à 2 Mo.' });
    }
    try {
      const result = await serverDb.importCatalogCsv(admin.id, csv, typeof req.body?.fileName === 'string' ? req.body.fileName.slice(0, 255) : undefined);
      res.status(result.rejected > 0 && result.imported === 0 ? 400 : 201).json({ import: result });
    } catch (error) {
      console.error('[Catalog] CSV import error:', error);
      res.status(400).json({ error: safeApiError(error, 'Impossible de lire ce fichier CSV.') });
    }
  }));

  app.post('/api/admin/catalog/import/supplier', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const supplier = typeof req.body?.supplier === 'string' ? req.body.supplier.trim().slice(0, 240) : '';
    if (!supplier || !Array.isArray(req.body?.records)) return res.status(400).json({ error: 'Fournisseur et tableau de produits obligatoires.' });
    try {
      const result = await serverDb.importCatalogRecords(admin.id, req.body.records, 'supplier', supplier);
      res.status(result.rejected > 0 && result.imported === 0 ? 400 : 201).json({ import: result });
    } catch (error) {
      console.error('[Catalog] supplier import error:', error);
      res.status(400).json({ error: safeApiError(error, 'Impossible d’importer le flux fournisseur.') });
    }
  }));

  app.get('/api/content', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const contentType = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
    const contents = (await serverDb.getPublishedArticles()).filter(content =>
      (!contentType || content.contentType === contentType) && (!topic || content.topic === topic)
    );
    res.json({ contents, count: contents.length });
  }));

  app.get('/api/content/:slug', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const content = await serverDb.getPublishedArticle(req.params.slug);
    if (!content) return res.status(404).json({ error: 'Contenu non disponible.' });
    res.json({ content });
  }));

  app.get('/api/journal', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
    const contents = (await serverDb.getPublishedArticles()).filter(content =>
      (!topic || content.topic === topic) && (!type || content.contentType === type)
    );
    res.json({ contents, count: contents.length });
  }));

  app.get('/api/articles', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    const articles = await serverDb.getPublishedArticles();
    res.json({ articles });
  }));

  app.get('/api/articles/:slug', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const article = await serverDb.getPublishedArticle(req.params.slug);
    if (!article) return res.status(404).json({ error: 'Article non disponible.' });
    res.json({ article });
  }));

  app.get('/api/routines', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    const routines = await serverDb.getRoutines();
    res.json({ routines, count: routines.length });
  }));

}
