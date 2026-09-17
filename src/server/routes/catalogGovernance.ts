import type { Express } from 'express';

import { Type } from '@google/genai';

import { AI_TRANSPARENCY } from '../../lib/ai/guardrails';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from '../../lib/ai/systemPrompt';
import { formatKnowledgeContext } from '../../lib/ai/knowledgeBase';
import { calculateKurlaFit } from '../../lib/kurlaFit';
import { serverDb } from '../../lib/serverDb';
import { readPublicationPolicy, setPublicationPolicy, setAutoPublishStage, setAutoPublishPaused, recordAutoPublishBatch } from '../../lib/db/publicationPolicyStore';
import { resetStrictModeCache } from '../../lib/db/catalogStore';
import { SALES_CRITERIA, SALES_CRITERIA_VERSION, criteriaByFamily } from '../../lib/salesCriteria';
import { planAutoPublication, planAutoPublishRollback, evaluateAutoPublishGate } from '../../lib/autoPublication';
import { SupplierAmbiguityError } from '../../lib/db/supplierStore';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { authenticateRequest, bearerToken, requireAdmin } from '../auth';
import { getAvailableCatalog } from '../ai/catalog';
import { catalogCsvRowToInput, parseCatalogCsv } from '../../lib/catalogManagement';
import { scanCatalogClaims, describeClaimScan } from '../../lib/catalogClaims';
import { evaluateGateProposals, findProposal, type GateAction } from '../../lib/catalogGate';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { buildDerogationAlertText, classifyDerogation, summarizeDerogations, type DerogationRow } from '../../lib/derogations';
import { emailService } from '../../lib/emailService';

/** C5 — charge les dérogations datées depuis la base (table `catalog_derogations`). */
async function loadDerogations(): Promise<DerogationRow[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('catalog_derogations').select('*');
  if (error) {
    console.error('[Catalog] lecture des dérogations échouée — la porte scanne SANS protection de dérogation par prudence ? Non : on propage.', error.message);
    throw error;
  }
  return (data || []).map((row: any) => ({
    productId: String(row.product_id),
    reason: String(row.reason || ''),
    decidedBy: row.decided_by ? String(row.decided_by) : null,
    expiresAt: String(row.expires_at),
  }));
}
import type { AuthenticatedRequest } from '../types';
import type { Request, Response } from 'express';
import { isProductInWorkspace, readWorkspaceScope } from '../workspaceScope';

/**
 * CHANTIER 8.1 — gouvernance du catalogue (réservée aux administrateurs
 * vérifiés), extraite de `server.ts`. Chemins inchangés.
 */

async function productMatchesScope(productId: string, scope: ReturnType<typeof readWorkspaceScope>): Promise<boolean> {
  if (!scope) return true;
  const product = (await serverDb.getAdminCatalogProducts()).find(item => String(item.id) === productId);
  return Boolean(product && isProductInWorkspace(product, scope));
}

async function scopedProductIds(scope: ReturnType<typeof readWorkspaceScope>): Promise<Set<string> | undefined> {
  if (!scope) return undefined;
  const products = await serverDb.getAdminCatalogProducts();
  return new Set(products.filter(product => isProductInWorkspace(product, scope)).map(product => String(product.id)));
}

async function scopePublicationReport(report: any, scope: ReturnType<typeof readWorkspaceScope>): Promise<any> {
  const allowed = await scopedProductIds(scope);
  if (!allowed) return report;
  const perProduct = (report.perProduct || []).filter((entry: any) => allowed.has(String(entry.productId)));
  const blocked = (report.publishedButNotListableProducts || []).filter((entry: any) => allowed.has(String(entry.productId)));
  return {
    ...report,
    products: perProduct.length,
    readyToPublish: perProduct.filter((entry: any) => entry.ready).length,
    publishedStatus: perProduct.filter((entry: any) => entry.catalogStatus === 'published').length,
    publishedButNotListable: blocked.length,
    perProduct,
    publishedButNotListableProducts: blocked,
    scope
  };
}

async function scopeSourcingReport(report: any, scope: ReturnType<typeof readWorkspaceScope>): Promise<any> {
  const allowed = await scopedProductIds(scope);
  if (!allowed) return report;
  const perProduct = (report.perProduct || []).filter((entry: any) => allowed.has(String(entry.productId)));
  const byState = perProduct.reduce((counts: Record<string, number>, entry: any) => {
    counts[entry.state] = (counts[entry.state] || 0) + 1;
    return counts;
  }, {});
  return { ...report, products: perProduct.length, readyToBuy: perProduct.filter((entry: any) => entry.ready).length, byState, perProduct, scope };
}

async function recordsFitScope(records: any[], scope: ReturnType<typeof readWorkspaceScope>): Promise<boolean> {
  if (!scope) return true;
  const products = await serverDb.getAdminCatalogProducts();
  return records.every(record => {
    const id = typeof record?.id === 'string' ? record.id : undefined;
    const existing = id ? products.find(product => String(product.id) === id) : undefined;
    if (id && (!existing || !isProductInWorkspace(existing, scope))) return false;
    return isProductInWorkspace(existing ? { ...existing, ...record } : record, scope);
  });
}

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
      const scope = readWorkspaceScope(req);
      const allProducts = await serverDb.getAdminCatalogProducts();
      const products = scope ? allProducts.filter(product => isProductInWorkspace(product, scope)) : allProducts;
      res.json({ products, count: products.length, scope: scope || 'all' });
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
      const scope = readWorkspaceScope(req);
      if (scope && !isProductInWorkspace(req.body || {}, scope)) return res.status(400).json({ error: 'Produit hors de cet espace.' });
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
      const scope = readWorkspaceScope(req);
      if (scope && !(await productMatchesScope(req.params.productId, scope))) return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
      if (scope && req.body?.category !== undefined && !isProductInWorkspace(req.body, scope)) return res.status(400).json({ error: 'Le produit ne peut pas changer d’espace.' });
      const product = await serverDb.saveCatalogProduct(admin.id, { ...(req.body || {}), id: req.params.productId });
      res.json({ product });
    } catch (error) {
      console.error('[Catalog] product update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Impossible de modifier ce produit catalogue.') });
    }
  }));

  /**
   * CHANTIER C4 (15/09/2026) — PORTE DE PUBLICATION, mode proposition.
   * `scan` est en LECTURE SEULE : il calcule les décisions que la porte
   * prendrait (publier une fiche prête / retirer une fiche non conforme)
   * sans rien écrire. Les fiches test (dérogations assumées) ne sont jamais
   * proposées au retrait — voir `catalogGate.ts`.
   */
  app.post('/api/admin/catalog/gate/scan', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const products = await serverDb.getAdminCatalogProducts();
      const derogations = await loadDerogations();
      res.json({ mode: 'proposal', proposals: evaluateGateProposals(products, derogations) });
    } catch (error) {
      console.error('[Catalog] gate scan error:', error);
      res.status(500).json({ error: safeApiError(error, 'Scan de la porte impossible.') });
    }
  }));

  /** CHANTIER C5 — dérogations datées : liste avec état calculé. */
  app.get('/api/admin/catalog/derogations', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const derogations = await loadDerogations();
      const products = await serverDb.getAdminCatalogProducts();
      const nameById = new Map(products.map((p: any) => [String(p.id), String(p.name || p.id)]));
      const rows = derogations.map(d => ({
        ...d,
        name: nameById.get(d.productId) || d.productId,
        state: classifyDerogation(d.expiresAt),
      }));
      res.json({ rows, summary: summarizeDerogations(derogations) });
    } catch (error) {
      console.error('[Catalog] derogations list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Liste des dérogations impossible.') });
    }
  }));

  /** C5 — renouveler (ou créer) une dérogation : acte admin explicite, +30 jours. */
  app.post('/api/admin/catalog/derogations/:productId/renew', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const productId = String(req.params.productId || '');
      const reason = typeof req.body?.reason === 'string' && req.body.reason.trim() !== ''
        ? req.body.reason.trim()
        : 'Fiche test / sourcing maintenue en vitrine — choix exploitant (non achetable)';
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from('catalog_derogations').upsert(
        { product_id: productId, reason, decided_by: admin.id, expires_at: expiresAt },
        { onConflict: 'product_id' },
      ).select();
      if (error) throw error;
      res.json({ derogation: data?.[0] || null });
    } catch (error) {
      console.error('[Catalog] derogation renew error:', error);
      res.status(400).json({ error: safeApiError(error, 'Renouvellement de la dérogation impossible.') });
    }
  }));

  /** C5 — récapitulatif des dérogations par e-mail (texte = données réelles). */
  app.post('/api/admin/catalog/derogations/alert-email', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const derogations = await loadDerogations();
      const products = await serverDb.getAdminCatalogProducts();
      const nameById = new Map(products.map((p: any) => [String(p.id), String(p.name || p.id)]));
      const rows = derogations.map(d => ({ ...d, name: nameById.get(d.productId) }));
      const text = buildDerogationAlertText(rows);
      const to = typeof req.body?.to === 'string' && req.body.to.includes('@') ? req.body.to : (admin as any).email;
      if (!to) return res.status(400).json({ error: 'Adresse de destination manquante (body.to ou e-mail admin).' });
      const delivery = await emailService.sendEmail({
        to,
        subject: 'KURLA — récapitulatif des dérogations catalogue',
        template: 'derogation_summary',
        data: { summaryText: text },
      });
      res.json({ status: delivery.status });
    } catch (error) {
      console.error('[Catalog] derogation alert error:', error);
      res.status(500).json({ error: safeApiError(error, 'Envoi du récapitulatif impossible.') });
    }
  }));

  /**
   * Application d'UNE décision de la porte, sur acte admin explicite.
   * La proposition est RECALCULÉE côté serveur : un client ne peut pas faire
   * appliquer une décision que la porte ne propose plus (données changées
   * entre-temps → 409). Chaque application est journalisée
   * (`catalog_gate_journal`, migration 20260929000000).
   */
  app.post('/api/admin/catalog/gate/apply', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const productId = String(req.body?.productId || '');
      const action = String(req.body?.action || '') as GateAction;
      if (!productId || (action !== 'publish' && action !== 'withdraw')) {
        return res.status(400).json({ error: 'productId et action (publish|withdraw) requis.' });
      }
      const products = await serverDb.getAdminCatalogProducts();
      const derogations = await loadDerogations();
      const proposal = findProposal(evaluateGateProposals(products, derogations), productId, action);
      if (!proposal) return res.status(409).json({ error: 'La porte ne propose plus cette décision — relancez un scan.' });
      const patch = action === 'publish'
        ? { catalog_status: 'published', catalogStatus: 'published', is_active: true, isActive: true }
        : { catalog_status: 'draft', catalogStatus: 'draft', is_active: false, isActive: false };
      const product = await serverDb.saveCatalogProduct(admin.id, { id: productId, ...patch });
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { error } = await supabase.from('catalog_gate_journal').insert({
          product_id: productId,
          product_name: proposal.name,
          action,
          mode: 'proposal',
          reason: proposal.reason,
          created_by: admin.id,
        });
        if (error) console.error('[Catalog] journal porte échoué (décision appliquée quand même) :', error.message);
      }
      res.json({ product: { id: product.id, catalogStatus: product.catalogStatus }, action, reason: proposal.reason });
    } catch (error) {
      console.error('[Catalog] gate apply error:', error);
      res.status(400).json({ error: safeApiError(error, 'Application de la décision impossible.') });
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
      const scope = readWorkspaceScope(req);
      if (scope) {
        const records = parseCatalogCsv(csv).map(row => catalogCsvRowToInput(row));
        if (!(await recordsFitScope(records, scope))) return res.status(400).json({ error: 'Le fichier contient un produit hors de cet espace.' });
      }
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
      const scope = readWorkspaceScope(req);
      if (scope && !(await recordsFitScope(req.body.records, scope))) {
        return res.status(400).json({ error: 'Le flux fournisseur contient un produit hors de cet espace.' });
      }
      const result = await serverDb.importCatalogRecords(admin.id, req.body.records, 'supplier', supplier);
      res.status(result.rejected > 0 && result.imported === 0 ? 400 : 201).json({ import: result });
    } catch (error) {
      // CHANTIER 16A — une ambiguïté de fournisseur n'est pas une erreur
      // technique : c'est une décision à prendre. Elle repart en 409 avec les
      // entités en concurrence, et rien n'a été écrit.
      if (error instanceof SupplierAmbiguityError) {
        return res.status(409).json({
          error: error.message,
          ambiguousSupplier: error.requestedName,
          candidates: error.candidates.map(candidate => ({ id: candidate.id, legalName: candidate.legalName }))
        });
      }
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

  /**
   * CHANTIER 10 (bloc B2) — état de préparation à la publication.
   *
   * Répond à la question « pourquoi ma boutique est vide » autrement qu'en
   * comptant des statuts : produit par produit, ce qui manque nommément.
   */
  app.get('/api/admin/catalog/publication-readiness', rateLimit('admin-publication-readiness', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    const report = await serverDb.getCatalogPublicationReadinessReport();
    res.json(await scopePublicationReport(report, scope));
  }));

  /**
   * CHANTIER A — CARTE DES CRITÈRES DE MISE EN VENTE.
   * Source unique versionnée (src/lib/salesCriteria.ts) : elle DECRIE le
   * comportement du moteur de readiness, elle ne le change pas. L'écran admin
   * « Critères » et l'automate d'auto-publication (chantier E) la consomment —
   * jamais une copie. Version inscrite dans chaque décision d'audit.
   */
  app.get('/api/admin/catalog/criteria', rateLimit('admin-criteria', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({
      version: SALES_CRITERIA_VERSION,
      families: criteriaByFamily(),
      criteria: SALES_CRITERIA,
    });
  }));

  // ---- CHANTIER E — AUTO-PUBLICATION (watch → active) ----------------------
  // La machine publie les fiches draft TOUS CRITÈRES AU VERT (carte du
  // chantier A, version inscrite dans chaque décision) — et rien d'autre.
  //   off    = éteinte (défaut),
  //   watch  = journalise ce qui deviendrait publié, RIEN n'est écrit,
  //   active = publie, auditée, rollback de la dernière vague en un clic.
  // La pause est un interrupteur daté et nommé. L'état de la machine vit
  // dans la même ligne publication_policy que le mode strict (C3) : un
  // interrupteur sans journal n'est pas un interrupteur.

  /** Consignation locale (audit_logs) — ne lève jamais, retourne l'échec. */
  async function writeAutoPublishAudit(action: string, details: any): Promise<{ ecrit: boolean; raison?: string }> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return { ecrit: false, raison: 'base_non_configuree' };
    try {
      const { error } = await supabase.from('audit_logs').insert({ action, user_id: details.parId || null, details });
      return error ? { ecrit: false, raison: error.message } : { ecrit: true };
    } catch {
      return { ecrit: false, raison: 'consignation en échec' };
    }
  }

  app.get('/api/admin/auto-publication/state', rateLimit('admin-auto-publication-state', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ policy: await readPublicationPolicy(serverDb) });
  }));

  app.post('/api/admin/auto-publication/stage', rateLimit('admin-auto-publication-stage', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = (req.body || {}) as { stage?: unknown; note?: unknown };
    if (typeof body.stage !== 'string') return res.status(400).json({ error: 'stage (off|watch|active) requis.' });
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;
    const result = await setAutoPublishStage(serverDb, { stage: body.stage as any, note }, { id: admin.id, email: admin.email });
    if (!result.ok) {
      return res.status(409).json({ error: 'Réarmement de la machine impossible — état inchangé.', detail: result.reason });
    }
    res.json({ policy: result.state, audit: result.audit });
  }));

  app.post('/api/admin/auto-publication/pause', rateLimit('admin-auto-publication-pause', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = (req.body || {}) as { paused?: unknown; note?: unknown };
    if (typeof body.paused !== 'boolean') return res.status(400).json({ error: 'paused (boolean) requis.' });
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;
    const result = await setAutoPublishPaused(serverDb, { paused: body.paused, note }, { id: admin.id, email: admin.email });
    if (!result.ok) {
      return res.status(409).json({ error: 'Pause/reprise impossible — état inchangé.', detail: result.reason });
    }
    res.json({ policy: result.state, audit: result.audit });
  }));

  /**
   * ÉVALUATION (le déclencheur de la machine). `trigger` nomme ce qui a
   * déclenché l'évaluation ('manuel' aujourd'hui ; les événements — import,
   * document, rattachement fournisseur, expiration — appelleront la même
   * route). watch : rien n'est écrit, le plan est journalisé. active : les
   * fiches éligibles (draft, au vert, non exclues) sont publiées, chaque
   * décision est journalisée avec la version des critères, et la vague est
   * consignée pour le rollback.
   */
  app.post('/api/admin/auto-publication/run', rateLimit('admin-auto-publication-run', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const trigger = typeof req.body?.trigger === 'string' && req.body.trigger.trim()
      ? req.body.trigger.trim().slice(0, 80)
      : 'manuel';
    const policy = await readPublicationPolicy(serverDb);
    const gate = evaluateAutoPublishGate({
      available: policy.available,
      autoPublishAvailable: policy.autoPublishAvailable,
      stage: policy.autoPublishStage,
      pausedAt: policy.autoPublishPausedAt,
      reason: policy.reason
    });
    if (!gate.allowed) {
      return res.status(gate.httpStatus).json({ error: gate.error, detail: gate.detail || (policy.autoPublishPausedBy ? `par ${policy.autoPublishPausedBy}` : undefined) });
    }

    const [products, report] = await Promise.all([
      serverDb.getAdminCatalogProducts(),
      serverDb.getCatalogPublicationReadinessReport()
    ]);
    const plan = planAutoPublication(products, report.perProduct, { trigger });
    const actor = { id: admin.id, email: admin.email };
    const actorLabel = admin.email || admin.id || 'admin inconnu';

    if (policy.autoPublishStage === 'watch') {
      // E1 — rien n'est écrit : le plan EST le journal.
      const audit = await writeAutoPublishAudit('auto_publish_watch', {
        batchId: plan.batchId, criteriaVersion: plan.criteriaVersion, trigger, parId: admin.id, par: actorLabel,
        deviendraientPublies: plan.eligible.length,
        fiches: plan.eligible.map(e => e.productId),
        exclusions: plan.excluded.length,
        survenuLe: plan.evaluatedAt
      });
      return res.json({ mode: 'watch', plan, audit, note: 'Rien n’a été écrit — ce plan décrit ce qui deviendrait publié.' });
    }

    // E2 — active : publie les fiches éligibles, une à une, chacune auditée.
    const published: Array<{ productId: string; title: string }> = [];
    let firstError: string | null = null;
    for (const eligible of plan.eligible) {
      try {
        await serverDb.saveCatalogProduct(admin.id, {
          id: eligible.productId,
          catalog_status: 'published',
          catalogStatus: 'published',
          is_active: true,
          isActive: true
        });
        await writeAutoPublishAudit('auto_publish', {
          batchId: plan.batchId, criteriaVersion: plan.criteriaVersion, trigger,
          parId: admin.id, par: actorLabel,
          productId: eligible.productId, productName: eligible.title,
          avant: { catalogStatus: 'draft' }, apres: { catalogStatus: 'published' },
          survenuLe: plan.evaluatedAt
        });
        published.push(eligible);
      } catch (error) {
        // On s'arrête net : la vague partielle reste rollbackable (c'est le filet).
        firstError = error instanceof Error ? error.message : String(error);
        break;
      }
    }
    let batchRecorded = false;
    if (published.length > 0) {
      const recorded = await recordAutoPublishBatch(serverDb, { batchId: plan.batchId, at: plan.evaluatedAt, productIds: published.map(p => p.productId) });
      batchRecorded = recorded.ok;
      if (!recorded.ok) console.error('[AutoPublication] consigne de la vague impossible :', recorded.reason);
    }
    if (firstError) {
      return res.status(207).json({
        mode: 'active', plan, published, batchRecorded,
        error: `Auto-publication partielle — ${published.length} publiée(s), puis arrêtée : ${firstError}. La vague est rollbackable (bouton « Annuler »).`
      });
    }
    res.json({ mode: 'active', plan, published, batchRecorded });
  }));

  /**
   * ROLLBACK de la dernière vague (ou d'une vague nommée) : les fiches de la
   * vague TOUJOURS publiées repartent en draft, une à une, chacune auditée.
   * Ce qu'un admin a touché depuis n'est pas écrasé (plan du moteur pur).
   */
  app.post('/api/admin/auto-publication/rollback', rateLimit('admin-auto-publication-rollback', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const policy = await readPublicationPolicy(serverDb);
    if (!policy.available || !policy.autoPublishAvailable) {
      return res.status(409).json({ error: 'Politique de publication non lisible — rien à annuler.', detail: policy.reason });
    }
    const batchId = typeof req.body?.batchId === 'string' && req.body.batchId.trim()
      ? req.body.batchId.trim().slice(0, 120)
      : policy.autoPublishLastBatch?.batchId;
    if (!batchId) return res.status(409).json({ error: 'Aucune vague auto-publiée à annuler.' });
    if (batchId !== policy.autoPublishLastBatch?.batchId) {
      return res.status(409).json({ error: `Seule la dernière vague est annulable en un clic (dernière : ${policy.autoPublishLastBatch?.batchId || 'aucune'}).` });
    }
    const batch = policy.autoPublishLastBatch;
    const products = await serverDb.getAdminCatalogProducts();
    const actions = planAutoPublishRollback(products, batch ? batch.productIds : []);
    const actorLabel = admin.email || admin.id || 'admin inconnu';
    const now = new Date().toISOString();
    const rolledBack: Array<{ productId: string; title: string }> = [];
    for (const action of actions) {
      try {
        await serverDb.saveCatalogProduct(admin.id, {
          id: action.productId,
          catalog_status: 'draft',
          catalogStatus: 'draft',
          is_active: false,
          isActive: false
        });
        await writeAutoPublishAudit('auto_publish_rollback', {
          batchId, criteriaVersion: SALES_CRITERIA_VERSION,
          parId: admin.id, par: actorLabel,
          productId: action.productId, productName: action.title,
          avant: { catalogStatus: 'published' }, apres: { catalogStatus: 'draft' },
          survenuLe: now
        });
        rolledBack.push({ productId: action.productId, title: action.title });
      } catch (error) {
        return res.status(207).json({
          rolledBack, batchId,
          error: `Rollback partiel — ${rolledBack.length} dépubliée(s), puis arrêtée : ${error instanceof Error ? error.message : String(error)}.`
        });
      }
    }
    // La vague annulée n'est plus « la dernière » : le bouton devient inopérant.
    const cleared = await recordAutoPublishBatch(serverDb, { batchId: '', at: now, productIds: [] });
    if (cleared.ok) {
      await writeAutoPublishAudit('auto_publish_rollback', {
        batchId, parId: admin.id, par: actorLabel,
        note: 'vague annulée et désarmée du bouton rollback',
        count: rolledBack.length, survenuLe: now
      });
    }
    res.json({ batchId, rolledBack, count: rolledBack.length });
  }));

  /**
   * C3 — POLITIQUE DE PUBLICATION (mode strict de la boutique).
   * Une ligne : l'état du mode strict, OFF par défaut, armé par un acte
   * explicite — daté, nommé, journalisé dans audit_logs. Quand la table est
   * absente (DDL non appliqué), l'état est rapporté `available: false` avec sa
   * raison : l'écran admin l'affiche tel quel, jamais de mode strict au vert
   * par défaut (fail-closed).
   */
  app.get('/api/admin/publication-policy', rateLimit('admin-publication-policy', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.json({ policy: await readPublicationPolicy(serverDb) });
  }));

  app.patch('/api/admin/publication-policy', rateLimit('admin-publication-policy-write', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const body = (req.body || {}) as { strictMode?: unknown; note?: unknown };
    if (typeof body.strictMode !== 'boolean') {
      return res.status(400).json({ error: 'strictMode (boolean) requis.' });
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;
    const result = await setPublicationPolicy(serverDb, { strictMode: body.strictMode, note }, { id: admin.id, email: admin.email });
    if (!result.ok) {
      return res.status(500).json({ error: 'Écriture de la politique impossible — état inchangé.', detail: result.reason });
    }
    // Ce processus reflète immédiatement le nouvel état (les autres suivent
    // au TTL de 60 s, comme le cache CDN de /api/products).
    resetStrictModeCache();
    res.json({ policy: result.state, audit: result.audit });
  }));

  /**
   * Phase de test (14/09/2026) — vue d'administration des fiches de test
   * (fiches sourcing `src-*` + fiches test `peau-test-*`) : les 4 gardes-fous
   * nommés par l'exploitant par fiche (① autorisation fournisseur écrite,
   * ② INCI complète vérifiée, ③ CPNP + personne responsable UE, ④ visuel
   * autorisé) + l'état de la fiche. Ce rapport ne publie rien : il dit ce qui
   * manque ; le « Dépublier » de l'écran passe par la route de statut
   * existante (→ `draft`), qui retire la fiche du mode test immédiatement.
   */
  app.get('/api/admin/catalog/test-phase', rateLimit('admin-catalog-test-phase', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    const report = await serverDb.getTestPhaseGatesReport();
    const allowed = await scopedProductIds(scope);
    const products = allowed ? report.products.filter((row) => allowed.has(row.productId)) : report.products;
    res.json({ ...report, products });
  }));

  /**
   * CHANTIER 2 — sourcing réel → catalogue.
   * Nommé par produit : aucun fournisseur, SKU ou document n'est déduit.
   */
  app.get('/api/admin/catalog/sourcing-readiness', rateLimit('admin-catalog-sourcing-readiness', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    const report = await serverDb.getCatalogSourcingReadinessReport();
    res.json(await scopeSourcingReport(report, scope));
  }));

  /**
   * C1 — catalogue peau réellement commercialisable.
   * Le rapport est une porte de décision, pas un mécanisme de publication.
   */
  app.get('/api/admin/catalog/skin-readiness', rateLimit('admin-catalog-skin-readiness', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    if (scope === 'hair') return res.json({ generatedAt: new Date().toISOString(), products: 0, ready: 0, perProduct: [], scope });
    const report = await serverDb.getSkinCatalogReadinessReport();
    res.json({ ...report, scope: scope || 'all' });
  }));

  /**
   * C5 — pièces photoprotection rattachées au SKU. Les preuves sont
   * administratives et ne sont jamais exposées au catalogue public.
   */
  app.get('/api/admin/catalog/skin-evidence', rateLimit('admin-catalog-skin-evidence', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : undefined;
    const scope = readWorkspaceScope(req);
    if (scope && productId && !(await productMatchesScope(productId, scope))) return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
    if (scope === 'hair') return res.json({ evidence: [], count: 0, scope });
    const evidence = await serverDb.listSkinPhotoprotectionEvidence(productId);
    res.json({ evidence, count: evidence.length, scope: scope || 'all' });
  }));

  app.post('/api/admin/catalog/skin-evidence', rateLimit('admin-catalog-skin-evidence-write', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
      if (scope && (scope === 'hair' || !productId || !(await productMatchesScope(productId, scope)))) {
        return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
      }
      const evidence = await serverDb.addSkinPhotoprotectionEvidence(admin.id, req.body || {});
      res.status(201).json({ evidence });
    } catch (error) {
      res.status(400).json({ error: safeApiError(error, 'Preuve photoprotection invalide ou non traçable.') });
    }
  }));

  /**
   * P1-6 — crible lexical des allégations branché sur l'administration.
   *
   * Ce rapport ne coche jamais `claims_validation_status` et ne publie rien :
   * il rend visibles les formulations à revoir, avec le champ, le terme et un
   * extrait. Le crible est une aide déterministe, pas une validation juridique.
   * La liste est filtrée avant le scan pour éviter qu'un workspace voie les
   * textes d'une autre gamme.
   */
  app.get('/api/admin/catalog/claims-audit', rateLimit('admin-catalog-claims-audit', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    const requestedProductId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
    const allProducts = await serverDb.getAdminCatalogProducts();
    const requestedProduct = requestedProductId
      ? allProducts.find(product => String(product.id) === requestedProductId || String(product.slug) === requestedProductId)
      : undefined;
    if (requestedProductId && (!requestedProduct || (scope && !isProductInWorkspace(requestedProduct, scope)))) {
      return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
    }
    const products = (requestedProduct ? [requestedProduct] : allProducts)
      .filter(product => !scope || isProductInWorkspace(product, scope));
    const perProduct = products.map(product => {
      const scan = scanCatalogClaims(product as Record<string, unknown>);
      return {
        productId: String(product.id),
        slug: product.slug || null,
        title: product.name || product.title || product.slug || String(product.id),
        category: product.category || product.department || null,
        catalogStatus: product.catalogStatus || product.catalog_status || 'draft',
        isActive: product.isActive ?? product.is_active ?? false,
        clean: scan.clean,
        hitCount: scan.hits.length,
        scannedFields: scan.scannedFields,
        scannedCharacters: scan.scannedCharacters,
        note: describeClaimScan(scan),
        hits: scan.hits
      };
    });
    const flagged = perProduct.filter(product => !product.clean);
    res.json({
      generatedAt: new Date().toISOString(),
      scope: scope || 'all',
      products: perProduct.length,
      clean: perProduct.filter(product => product.clean).length,
      flagged: flagged.length,
      hits: flagged.reduce((total, product) => total + product.hitCount, 0),
      perProduct: [...perProduct].sort((a, b) => Number(b.hitCount > 0) - Number(a.hitCount > 0) || a.title.localeCompare(b.title, 'fr'))
    });
  }));

  /**
   * CHANTIER 10 (bloc B3) — vocabulaires contrôlés, publics.
   *
   * Une liste fermée que le client ne peut pas lire est une liste que personne
   * ne respecte : l'admin comme le front doivent pouvoir proposer les codes
   * valides plutôt que de les saisir à la main.
   */
  app.get('/api/taxonomies', rateLimit('taxonomies', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const taxonomyId = typeof req.query?.taxonomy === 'string' ? req.query.taxonomy : undefined;
    const [taxonomies, terms] = await Promise.all([
      serverDb.getTaxonomies(),
      serverDb.getTaxonomyTerms(taxonomyId)
    ]);
    res.json({ taxonomies, terms, count: terms.length });
  }));

  app.get('/api/admin/catalog/vocabulary-audit', rateLimit('admin-vocabulary-audit', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const audit = await serverDb.getVocabularyAudit();
    res.json(audit);
  }));

  app.get('/api/admin/catalog/:productId/readiness', rateLimit('admin-product-readiness', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope && !(await productMatchesScope(req.params.productId, scope))) return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
      const readiness = await serverDb.getCatalogPublicationReadiness(req.params.productId);
      res.json(readiness);
    } catch (error) {
      return res.status(404).json({ error: error instanceof Error ? error.message : 'Produit introuvable.' });
    }
  }));

}
