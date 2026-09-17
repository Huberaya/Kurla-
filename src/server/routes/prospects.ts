import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';
import { candidateInWorkspace, prospectInWorkspace, readWorkspaceScope, type WorkspaceScope } from '../workspaceScope';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { buildConsolidatedSourcing, type SupplierEmailBlock } from '../../lib/sourcingConsolidated';
import { buildSupplierDossier, summarizeSupplierDossier } from '../../lib/supplierDossier';
import type { ProductCandidate } from '../../lib/db/prospectStore';
import { SupplierAmbiguityError } from '../../lib/db/supplierStore';

async function candidateMatchesScope(candidate: any, scope: WorkspaceScope): Promise<boolean> {
  if (candidate?.prospectId || candidate?.prospect_id) {
    const prospectId = String(candidate.prospectId || candidate.prospect_id);
    const prospect = (await serverDb.listProspects()).find(item => item.id === prospectId);
    return Boolean(prospect && prospectInWorkspace(prospect, scope));
  }
  return candidateInWorkspace(candidate, scope);
}

/**
 * PROSPECTS DE SOURCING & RÉFÉRENCES À INTÉGRER — routes d'administration.
 *
 * Données internes : garde `requireAdmin` sur toutes les routes (rôle
 * vérifié côté serveur depuis le jeton Supabase, jamais depuis des en-têtes).
 * Ces routes n'envoient aucun email : elles enregistrent l'état d'un suivi de
 * prospection tenu par un humain, comme le reste du chantier d'approvisionnement.
 */
export function registerProspectRoutes(app: Express): void {
  // ---- Prospects (marques / distributeurs / façonniers à contacter) ----
  app.get('/api/admin/sourcing/prospects', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      const allProspects = await serverDb.listProspects();
      const prospects = scope ? allProspects.filter(prospect => prospectInWorkspace(prospect, scope)) : allProspects;
      res.json({ prospects, count: prospects.length, scope: scope || 'all' });
    } catch (error) {
      console.error('[Prospects] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Prospects indisponibles.') });
    }
  }));

  app.put('/api/admin/sourcing/prospects/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope && !prospectInWorkspace(req.body || {}, scope)) return res.status(400).json({ error: 'Prospect hors de cet espace.' });
      const prospect = await serverDb.upsertProspect(admin.id, { ...(req.body || {}), id: req.params.id });
      res.json({ prospect });
    } catch (error) {
      console.error('[Prospects] update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Prospect non enregistré.') });
    }
  }));

  app.post('/api/admin/sourcing/prospects', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope && !prospectInWorkspace(req.body || {}, scope)) return res.status(400).json({ error: 'Prospect hors de cet espace.' });
      const prospect = await serverDb.upsertProspect(admin.id, req.body || {});
      res.status(201).json({ prospect });
    } catch (error) {
      console.error('[Prospects] create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Prospect non créé.') });
    }
  }));

  /**
   * CHANTIER 3 — conversion piste → fournisseur.
   * `upsertProspect` n'écrit pas `supplier_id`. Cette route est l'unique
   * écriture du lien : créer une fiche (create:true) ou lier un id existant.
   * Une ambiguïté de nom = 409, rien n'est choisi en silence.
   */
  app.post('/api/admin/sourcing/prospects/:id/supplier', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const existing = await serverDb.getProspect(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Piste introuvable.' });
      const scope = readWorkspaceScope(req);
      if (scope && !prospectInWorkspace(existing, scope)) return res.status(404).json({ error: 'Piste introuvable dans cet espace.' });
      const result = await serverDb.linkProspectSupplier(admin.id, req.params.id, {
        supplierId: typeof req.body?.supplierId === 'string' ? req.body.supplierId : undefined,
        create: req.body?.create === true,
      });
      res.json({
        prospect: result.prospect,
        supplier: result.supplier,
        created: result.created,
      });
    } catch (error) {
      if (error instanceof SupplierAmbiguityError) {
        return res.status(409).json({
          error: error.message,
          ambiguousSupplier: error.requestedName,
          candidates: error.candidates.map(candidate => ({ id: candidate.id, legalName: candidate.legalName })),
        });
      }
      console.error('[Prospects] convert supplier error:', error);
      res.status(400).json({ error: safeApiError(error, 'Conversion piste → fournisseur refusée.') });
    }
  }));

  // ---- Références candidates à intégrer au catalogue ----
  app.get('/api/admin/sourcing/candidates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const prospectId = typeof req.query.prospectId === 'string' ? req.query.prospectId.trim() : undefined;
      const scope = readWorkspaceScope(req);
      if (scope && prospectId) {
        const prospect = (await serverDb.listProspects()).find(item => item.id === prospectId);
        if (!prospect || !prospectInWorkspace(prospect, scope)) return res.json({ candidates: [], count: 0, scope });
      }
      const allCandidates = await serverDb.listCandidates(prospectId || undefined);
      const candidates = scope
        ? (await Promise.all(allCandidates.map(async candidate => (await candidateMatchesScope(candidate, scope)) ? candidate : null))).filter(Boolean)
        : allCandidates;
      res.json({ candidates, count: candidates.length, scope: scope || 'all' });
    } catch (error) {
      console.error('[Candidates] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Références indisponibles.') });
    }
  }));

  app.put('/api/admin/sourcing/candidates/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope) {
        const existing = (await serverDb.listCandidates()).find(item => item.id === req.params.id);
        const candidateInput = { ...(existing || {}), ...(req.body || {}), id: req.params.id };
        if (!existing || !(await candidateMatchesScope(candidateInput, scope))) return res.status(404).json({ error: 'Référence introuvable dans cet espace.' });
      }
      const candidate = await serverDb.upsertCandidate(admin.id, { ...(req.body || {}), id: req.params.id });
      res.json({ candidate });
    } catch (error) {
      console.error('[Candidates] update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Référence non enregistrée.') });
    }
  }));

  app.post('/api/admin/sourcing/candidates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      if (scope && !(await candidateMatchesScope(req.body || {}, scope))) return res.status(400).json({ error: 'Référence hors de cet espace.' });
      const candidate = await serverDb.upsertCandidate(admin.id, req.body || {});
      res.status(201).json({ candidate, scope: scope || 'all' });
    } catch (error) {
      console.error('[Candidates] create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Référence non créée.') });
    }
  }));

  /**
   * CHANTIER 13 — import identifié (CSV / Excel / JSON).
   * Écrit fond ou candidats. Jamais `products`, jamais `published`.
   * `dryRun: true` = prévisualisation serveur (Excel compris).
   */
  app.post('/api/admin/sourcing/identified-import', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const result = await serverDb.applyIdentifiedImport(admin.id, req.body || {});
      res.json({
        ...result,
        published: 0,
        writeTarget: 'sourcing_fond_positions | sourcing_product_candidates',
      });
    } catch (error) {
      console.error('[IdentifiedImport] error:', error);
      res.status(400).json({ error: safeApiError(error, 'Import identifié refusé.') });
    }
  }));

  /**
   * DOSSIER FOURNISSEUR (chantier B, 16/09/2026) — voir un fournisseur en un
   * seul endroit : son identité, son contact réel (ou l'endroit du système qui
   * en propose un, jamais écrit à sa place), les huit pièces d'achat avec leur
   * état, **ce qui manque nommément**, ses candidats rattachés et l'état de la
   * relance.
   *
   * Mesuré en écrivant cette route : 28 prospects, 3 avec un e-mail, aucune
   * date de relance, aucun MOQ ni délai. Le dossier n'invente donc rien — il
   * nomme les manques, seule façon honnête de les combler.
   */
  app.get('/api/admin/sourcing/supplier-dossier', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const scope = readWorkspaceScope(req);
      const prospectsAll = await serverDb.listProspects();
      const prospects = scope ? prospectsAll.filter(p => prospectInWorkspace(p, scope)) : prospectsAll;

      const candidatesAll = await serverDb.listCandidates();
      const candidates = scope
        ? (await Promise.all(candidatesAll.map(async c => ((await candidateMatchesScope(c, scope)) ? c : null))))
          .filter((c): c is ProductCandidate => Boolean(c))
        : candidatesAll;

      // Les blocs fournisseurs de la vue consolidée servent à deux choses :
      // proposer un contact déjà connu du système (sans jamais l'écrire), et
      // dire si un e-mail est prêt à partir.
      let blocks: SupplierEmailBlock[] = [];
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const [products, cand, positions, prospectsRaw, suppliers, rfqs] = await Promise.all([
          serverDb.getAdminCatalogProducts(),
          supabase.from('sourcing_product_candidates').select('*'),
          supabase.from('sourcing_fond_positions').select('*'),
          supabase.from('sourcing_prospects').select('*'),
          supabase.from('suppliers').select('*'),
          supabase.from('rfqs').select('*'),
        ]);
        blocks = buildConsolidatedSourcing({
          products,
          candidates: cand.data || [],
          positions: positions.data || [],
          prospects: prospectsRaw.data || [],
          suppliers: suppliers.data || [],
          rfqs: rfqs.data || [],
        }).supplierBlocks || [];
      }

      const rows = buildSupplierDossier({ prospects, candidates, supplierBlocks: blocks });
      res.json({
        rows,
        summary: summarizeSupplierDossier(rows),
        scope: scope || 'all',
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SupplierDossier] error:', error);
      res.status(500).json({ error: safeApiError(error, 'Dossier fournisseur indisponible.') });
    }
  }));
}
