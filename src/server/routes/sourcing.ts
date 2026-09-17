import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { readWorkspaceScope, sourcingItemInWorkspace, type WorkspaceScope } from '../workspaceScope';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { buildConsolidatedSourcing } from '../../lib/sourcingConsolidated';
import { enterCatalogFromCandidate } from '../../lib/skinCatalog';
import { searchAcrossCatalog } from '../../lib/globalSearch';
import { freezeOrderRouting } from '../payments/orderRoutingHook';
import {
  canTransitionSupplyWorkflow,
  evaluateMargin,
  evaluateSupplyAlerts,
  routeFulfillment,
  transitionRequiresReason,
  SUPPLY_MODELS,
  type ProductSource,
  type SupplyWorkflowState,
} from '../../lib/supplyModel';
import { workflowPublishesToBoutique } from '../../lib/sourcingWorkflow';

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
      const [products, candidates, positions, prospects, suppliers, rfqs, items] = await Promise.all([
        serverDb.getAdminCatalogProducts(),
        supabase.from('sourcing_product_candidates').select('*'),
        supabase.from('sourcing_fond_positions').select('*'),
        supabase.from('sourcing_prospects').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('rfqs').select('*'),
        supabase.from('sourcing_items').select('id, wave, title'),
      ]);
      // CHANTIER D — publication-readiness : si elle n'est pas mesurable, le
      // registre reste lisible mais AUCUNE fiche n'est déclarée « conforme »
      // (fail-closed) ; l'écran nomme l'état via `readinessAvailable`.
      let readiness: Array<{ productId: string; ready: boolean; missing?: string[]; catalogStatus?: string }> = [];
      try {
        const report = await serverDb.getCatalogPublicationReadinessReport();
        readiness = (report.perProduct || []).map(p => ({
          productId: p.productId, ready: p.ready, missing: p.missing, catalogStatus: p.catalogStatus
        }));
      } catch (readinessError) {
        console.error('[Sourcing] publication-readiness indisponible (registre en fail-closed) :', readinessError);
      }
      const body = buildConsolidatedSourcing({
        products,
        candidates: candidates.data || [],
        positions: positions.data || [],
        prospects: prospects.data || [],
        suppliers: suppliers.data || [],
        rfqs: rfqs.data || [],
        readiness,
        items: items.data || [],
      });
      res.json({ ...body, itemsCount: (items.data || []).length });
    } catch (error) {
      console.error('[Sourcing] consolidated error:', error);
      res.status(500).json({ error: safeApiError(error, 'Impossible de charger la vue sourcing consolidée.') });
    }
  }));

  /**
   * CHANTIER C3 + C8 — créer une fiche catalogue depuis un candidat sourcing.
   * Données réelles (C3), scellée draft inactive hors boutique (C8).
   * Liaison : products.source_candidate_id ↔ candidates.draft_product_id.
   * Idempotent : un candidat déjà lié renvoie sa fiche existante.
   * 0 publication accidentelle : catalog_status n’est jamais `published`.
   */
  app.post('/api/admin/sourcing/candidates/:id/create-fiche', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const candidateId = String(req.params.id || '');
      const { data: candidate, error: candidateError } = await supabase
        .from('sourcing_product_candidates')
        .select('*')
        .eq('id', candidateId)
        .maybeSingle();
      if (candidateError) throw candidateError;
      if (!candidate) return res.status(404).json({ error: 'Candidat sourcing introuvable.' });
      if (candidate.draft_product_id) {
        return res.json({
          product: { id: candidate.draft_product_id },
          alreadyLinked: true,
          isPublic: false,
          publishesToBoutique: false,
        });
      }
      const prospect = candidate.prospect_id
        ? (await supabase.from('sourcing_prospects').select('*').eq('id', String(candidate.prospect_id)).maybeSingle()).data
        : null;
      const payload = enterCatalogFromCandidate(candidate, prospect);
      const result = await serverDb.importCatalogRecords(admin.id, [payload], 'manual');
      if (result.rejected > 0) return res.status(400).json({ error: result.errors[0]?.message || 'Fiche refusée par le catalogue.' });
      const product = result.products[0];
      const { error: linkError } = await supabase
        .from('sourcing_product_candidates')
        .update({ draft_product_id: product.id })
        .eq('id', candidateId);
      if (linkError) console.error('[Sourcing] liaison candidat→fiche échouée (fiche créée quand même) :', linkError.message);
      res.status(201).json({
        product: { id: product.id, slug: product.slug, name: product.name, catalogStatus: 'draft', isActive: false },
        isPublic: false,
        publishesToBoutique: false,
      });
    } catch (error) {
      console.error('[Sourcing] create-fiche error:', error);
      res.status(400).json({ error: safeApiError(error, 'Impossible de créer la fiche depuis ce candidat.') });
    }
  }));

  /**
   * MISSION SYSTÈME D'ACHAT — SOURCES / OFFRES FOURNISSEUR.
   * Un produit × plusieurs fournisseurs × modèles (dropshipping, affiliation,
   * 3PL, stock KURLA). Les coûts inconnus restent NULL : jamais 0 inventé.
   */
  app.get('/api/admin/sourcing/sources', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
      const sources = await serverDb.listProductSources(productId);
      res.json({ sources });
    } catch (error) {
      console.error('[Sourcing] sources list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Lecture des sources impossible.') });
    }
  }));

  /**
   * CHANTIER 4 — une offre est un fournisseur enregistré × un modèle.
   * `partnerName` n'est plus une identité. La source ★ se projette sur
   * `products.supplier_id`.
   */
  app.post('/api/admin/sourcing/sources', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const source = await serverDb.createProductSource(admin.id, req.body || {});
      res.status(201).json({ source });
    } catch (error) {
      console.error('[Sourcing] source create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Création de la source impossible.') });
    }
  }));

  app.patch('/api/admin/sourcing/sources/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const source = await serverDb.updateProductSource(admin.id, String(req.params.id || ''), req.body || {});
      res.json({ source });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('introuvable')) return res.status(404).json({ error: safeApiError(error, 'Source introuvable.') });
      console.error('[Sourcing] source update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Mise à jour de la source impossible.') });
    }
  }));

  /**
   * WORKFLOW 8 ÉTAPES — transition tracée (§4, §8, §28).
   * Transitions illégales refusées ; un refus exige une raison ; chaque
   * action est horodatée et attribuée dans `sourcing_workflow_events`.
   */
  app.post('/api/admin/sourcing/workflow/transition', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const { entityType, entityId, from, to, reason, comment } = req.body || {};
      if (!entityType || !entityId || !to) return res.status(400).json({ error: 'entityType, entityId et to requis.' });
      if (!canTransitionSupplyWorkflow(String(from) as SupplyWorkflowState, String(to) as SupplyWorkflowState)) {
        return res.status(400).json({ error: `Transition ${from} → ${to} non autorisée par le workflow.` });
      }
      if (transitionRequiresReason(String(to) as SupplyWorkflowState) && !String(reason || '').trim()) {
        return res.status(400).json({ error: 'Un refus exige une raison.' });
      }
      const { data, error } = await supabase.from('sourcing_workflow_events').insert({
        entity_type: String(entityType),
        entity_id: String(entityId),
        from_state: from ? String(from) : null,
        to_state: String(to),
        reason: reason ? String(reason).trim() : null,
        comment: comment ? String(comment).trim() : null,
        created_by: admin.id,
      }).select();
      if (error) throw error;
      // Chantier 6 : la transition est la porte ACHAT. Elle n'écrit pas
      // catalog_status. Clé additive — les clients existants ignorent le champ.
      res.status(201).json({
        event: data?.[0] || null,
        publishesToBoutique: workflowPublishesToBoutique(String(to) as SupplyWorkflowState),
      });
    } catch (error) {
      console.error('[Sourcing] workflow transition error:', error);
      res.status(400).json({ error: safeApiError(error, 'Transition impossible.') });
    }
  }));

  app.get('/api/admin/sourcing/workflow/events', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      let query = supabase.from('sourcing_workflow_events').select('*').order('created_at', { ascending: false }).limit(200);
      if (typeof req.query.entityId === 'string') query = query.eq('entity_id', req.query.entityId);
      const { data, error } = await query;
      if (error) throw error;
      res.json({ events: data || [] });
    } catch (error) {
      console.error('[Sourcing] workflow events error:', error);
      res.status(500).json({ error: safeApiError(error, 'Lecture de l’historique impossible.') });
    }
  }));

  /**
   * CHANTIER B — SYNTHÈSE DU WORKFLOW (l'entonnoir de négociation).
   * Où en est CHAQUE candidat sur les 8 étapes, en un seul appel : état
   * courant = dernier événement tracé, défaut « identifié » quand aucune
   * transition n'a encore eu lieu (jamais d'étape devinée). Compte aussi
   * les prospects restés sans candidat. Aucun chiffre inventé : ce sont
   * les mêmes règles que le panneau de pilotage, agrégées côté serveur.
   */
  app.get('/api/admin/sourcing/workflow/summary', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const [candidatesRes, eventsRes, prospectsRes] = await Promise.all([
        supabase.from('sourcing_product_candidates').select('id'),
        supabase.from('sourcing_workflow_events').select('entity_id, entity_type, to_state, created_at').order('created_at', { ascending: false }).limit(2000),
        supabase.from('sourcing_prospects').select('id'),
      ]);
      if (candidatesRes.error) throw candidatesRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (prospectsRes.error) throw prospectsRes.error;
      // Dernier événement par entité (la liste arrive déjà triée desc).
      const latestByEntity = new Map<string, string>();
      for (const event of eventsRes.data || []) {
        const key = `${event.entity_type}:${event.entity_id}`;
        if (!latestByEntity.has(key) && event.to_state) latestByEntity.set(key, String(event.to_state));
      }
      const stages: Record<string, number> = {};
      const currentByCandidate: Record<string, string> = {};
      for (const candidate of candidatesRes.data || []) {
        const state = latestByEntity.get(`candidate:${candidate.id}`) || 'identified';
        currentByCandidate[String(candidate.id)] = state;
        stages[state] = (stages[state] || 0) + 1;
      }
      res.json({
        candidateTotal: (candidatesRes.data || []).length,
        prospectTotal: (prospectsRes.data || []).length,
        stages,
        currentByCandidate,
        publishesToBoutique: workflowPublishesToBoutique(),
      });
    } catch (error) {
      console.error('[Sourcing] workflow summary error:', error);
      res.status(500).json({ error: safeApiError(error, 'Synthèse du workflow impossible.') });
    }
  }));

  /**
   * VUE OPS (§23) — KPI + alertes + marge/routage par produit.
   * Toute valeur absente est affichée « à obtenir », jamais inventée.
   */
  app.get('/api/admin/sourcing/ops', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const [products, sources, supplierRows] = await Promise.all([
        serverDb.getAdminCatalogProducts(),
        serverDb.listProductSources(),
        serverDb.listSuppliers(),
      ]);
      const sourcesByProduct: Record<string, ProductSource[]> = {};
      for (const source of sources) {
        (sourcesByProduct[source.productId] = sourcesByProduct[source.productId] || []).push(source);
      }
      const suppliers = supplierRows.map(s => ({ id: String(s.id), legalName: s.legalName || s.tradeName || null, contactEmail: s.contactEmail || null }));
      const supplierNameById: Record<string, string> = {};
      for (const s of suppliers) if (s.legalName) supplierNameById[s.id] = s.legalName;

      const catalogRows = products
        .filter((p: any) => String(p.catalogStatus || p.catalog_status) !== 'unavailable')
        .map((p: any) => {
          const productSources = sourcesByProduct[String(p.id)] || [];
          const price = Number(p.basePrice ?? p.price);
          const priceCents = Number.isFinite(price) && price > 0 ? Math.round(price * 100) : null;
          const primary = productSources.find(s => s.isPrimary) || productSources.find(s => s.available) || null;
          const margin = primary
            ? evaluateMargin({ model: primary.model, salePriceCents: priceCents, costCents: primary.costCents, feeCents: primary.feeCents, fulfillmentCostCents: primary.fulfillmentCostCents, commissionPct: primary.commissionPct })
            : null;
          const route = routeFulfillment({ sources: productSources, supplierNameById });
          return {
            id: String(p.id),
            name: String(p.name || p.id),
            catalogStatus: String(p.catalogStatus || p.catalog_status || 'draft'),
            priceCents,
            proofCompliant: p.truth?.proofState === 'compliant',
            sourcesCount: productSources.length,
            primaryModel: primary?.model || null,
            primarySupplierId: primary?.supplierId || null,
            margin,
            route,
          };
        });

      const alerts = evaluateSupplyAlerts({
        products: catalogRows,
        sourcesByProduct,
        suppliers,
      });

      const kpi = {
        products: catalogRows.length,
        withSource: catalogRows.filter(r => r.sourcesCount > 0).length,
        byModel: Object.fromEntries(SUPPLY_MODELS.map(m => [m, catalogRows.filter(r => r.primaryModel === m).length])),
        suppliers: suppliers.length,
        suppliersWithoutContact: suppliers.filter(s => !s.contactEmail).length,
        alerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      };

      res.json({ kpi, alerts, products: catalogRows });
    } catch (error) {
      console.error('[Sourcing] ops error:', error);
      res.status(500).json({ error: safeApiError(error, 'Vue ops impossible.') });
    }
  }));

  /**
   * JONCTION COMMANDE → ROUTEUR — lecture : routes figées au paiement,
   * groupées par commande, + commandes payées non encore routées (historique
   * d'avant la jonction). Répond à « qui est responsable de l'expédition ? ».
   */
  app.get('/api/admin/order-routes', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const { data: routeRows, error } = await supabase
        .from('order_item_routes')
        .select('*')
        .order('routed_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const paidOrders = await serverDb.listOrdersByStatus(['paid'], { limit: 100 });
      const routedOrderIds = new Set((routeRows || []).map((r: any) => String(r.order_id)));
      const pending = paidOrders
        .filter((order: any) => !routedOrderIds.has(String(order.id)))
        .map((order: any) => ({ orderId: String(order.id), total: order.total, status: order.status }));
      res.json({ routes: routeRows || [], pendingRouting: pending });
    } catch (error) {
      console.error('[Routing] order-routes list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Lecture des routes impossible.') });
    }
  }));

  /** Figement manuel (commandes historiques ou échec du hook). Idempotent. */
  app.post('/api/admin/order-routes/:orderId/freeze', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const result = await freezeOrderRouting(String(req.params.orderId || ''), { force: req.body?.force === true });
      res.json(result);
    } catch (error) {
      console.error('[Routing] freeze error:', error);
      res.status(400).json({ error: safeApiError(error, 'Figeage de la route impossible.') });
    }
  }));

  /**
   * RECHERCHE GLOBALE UNIFIÉE (§24) — une requête traverse catalogue,
   * positions de fond, candidats et fournisseurs. Lecture seule.
   */
  app.get('/api/admin/global-search', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (query.length < 2) return res.json({ query, hits: [], counts: { product: 0, position: 0, candidate: 0, supplier: 0 } });
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base indisponible.' });
      const [products, positions, candidates, prospects, suppliers] = await Promise.all([
        serverDb.getAdminCatalogProducts(),
        supabase.from('sourcing_fond_positions').select('*'),
        supabase.from('sourcing_product_candidates').select('*'),
        supabase.from('sourcing_prospects').select('*'),
        supabase.from('suppliers').select('*'),
      ]);
      res.json(searchAcrossCatalog(query, {
        products,
        positions: positions.data || [],
        candidates: candidates.data || [],
        prospects: prospects.data || [],
        suppliers: suppliers.data || [],
      }));
    } catch (error) {
      console.error('[Sourcing] global search error:', error);
      res.status(500).json({ error: safeApiError(error, 'Recherche globale impossible.') });
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
