import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { SupplierAmbiguityError, SUPPLIER_DOCUMENT_TYPES, SUPPLIER_TYPES } from '../../lib/db/supplierStore';
import { asyncRoute, safeApiError } from '../http';
import { requireAdmin, type AuthenticatedRequest } from '../auth';

/**
 * CHANTIER 16B — SURFACE D'ADMINISTRATION DES FOURNISSEURS.
 *
 * Le chantier 16A a créé le référentiel sans écran : il n'était atteignable que
 * par l'API et la base. Constat mesuré en 15A — 24 routes d'administration sur
 * 30 n'avaient **aucun appelant**. Cette surface existe pour ne pas en ajouter
 * cinq de plus.
 *
 * Trois règles héritées de 16A, appliquées ici :
 *
 *  1. **la garde de rôle précède tout effet.** `requireAdmin` est appelé avant
 *     la moindre lecture, exactement comme les 30 routes inventoriées en 15A ;
 *  2. **une ambiguïté repart en 409 en nommant les entités en concurrence**,
 *     jamais en 400 générique — celui qui crée doit pouvoir trancher ;
 *  3. **rien n'est deviné.** Les listes de types (fournisseur, document) sont
 *     renvoyées par l'API pour que l'écran propose des valeurs réelles plutôt
 *     qu'un champ libre.
 */
export function registerSupplierRoutes(app: Express): void {
  app.get('/api/admin/suppliers', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const suppliers = await serverDb.listSuppliers();
      // Le nombre de preuves est calculé par entité : « vérifié » sans document
      // serait un affichage mensonger, donc l'écran reçoit de quoi le voir.
      const detailed = await Promise.all(suppliers.map(async supplier => {
        const documents = await serverDb.listSupplierDocuments(supplier.id);
        const today = new Date().toISOString().slice(0, 10);
        return {
          ...supplier,
          documentCount: documents.length,
          expiredDocumentCount: documents.filter(document => document.expiresOn && document.expiresOn < today).length
        };
      }));
      res.json({
        suppliers: detailed,
        count: detailed.length,
        supplierTypes: SUPPLIER_TYPES,
        documentTypes: SUPPLIER_DOCUMENT_TYPES
      });
    } catch (error) {
      console.error('[Suppliers] list error:', error);
      res.status(500).json({ error: safeApiError(error, 'Référentiel fournisseurs indisponible.') });
    }
  }));

  app.get('/api/admin/suppliers/:supplierId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const detail = await serverDb.getSupplierDetail(req.params.supplierId);
      res.json(detail);
    } catch (error) {
      console.error('[Suppliers] detail error:', error);
      res.status(404).json({ error: safeApiError(error, 'Fournisseur introuvable.') });
    }
  }));

  app.post('/api/admin/suppliers', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supplier = await serverDb.createSupplier(admin.id, req.body || {});
      res.status(201).json({ supplier });
    } catch (error) {
      // Ambiguïté = décision à prendre, pas erreur technique. Rien n'est écrit.
      if (error instanceof SupplierAmbiguityError) {
        return res.status(409).json({
          error: error.message,
          ambiguousSupplier: error.requestedName,
          candidates: error.candidates.map(candidate => ({ id: candidate.id, legalName: candidate.legalName }))
        });
      }
      console.error('[Suppliers] create error:', error);
      res.status(400).json({ error: safeApiError(error, 'Fournisseur non créé.') });
    }
  }));

  app.patch('/api/admin/suppliers/:supplierId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const supplier = await serverDb.updateSupplier(admin.id, req.params.supplierId, req.body || {});
      res.json({ supplier });
    } catch (error) {
      console.error('[Suppliers] update error:', error);
      res.status(400).json({ error: safeApiError(error, 'Fournisseur non mis à jour.') });
    }
  }));

  app.post('/api/admin/suppliers/:supplierId/documents', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const document = await serverDb.addSupplierDocument(admin.id, { ...(req.body || {}), supplierId: req.params.supplierId });
      res.status(201).json({ document });
    } catch (error) {
      console.error('[Suppliers] document error:', error);
      res.status(400).json({ error: safeApiError(error, 'Document de conformité non enregistré.') });
    }
  }));

  // Affectation d'un fournisseur (et SKU/coût fournisseur) à un produit.
  // Écrit sur les colonnes supplier_id / supplier_sku / source_supplier de la
  // table products ; renvoie le produit mis à jour. Une valeur de fournisseur
  // vide réinitialise l'affectation.
  app.patch('/api/admin/products/:productId/supplier', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const { supplierId, supplierSku, sourceSupplier } = req.body || {};
      const supabase = getSupabaseServerClient();
      if (!supabase) return res.status(503).json({ error: 'Base de données indisponible.' });

      const update: Record<string, unknown> = {};
      if (typeof supplierId === 'string') {
        const sid = supplierId.trim();
        if (sid) {
          const { data: sup } = await supabase.from('suppliers').select('id').eq('id', sid).maybeSingle();
          if (!sup) return res.status(400).json({ error: 'Fournisseur introuvable.' });
          update.supplier_id = sid;
        } else {
          update.supplier_id = null;
        }
      }
      if (typeof supplierSku === 'string') update.supplier_sku = supplierSku.trim().slice(0, 120) || null;
      if (typeof sourceSupplier === 'string') update.source_supplier = sourceSupplier.trim().slice(0, 200) || null;
      if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Rien à mettre à jour.' });

      const { data, error } = await supabase
        .from('products')
        .update({ ...update, last_catalog_updated_at: new Date().toISOString(), catalog_updated_by: admin.id })
        .eq('id', req.params.productId)
        .select('id, name, slug, supplier_id, supplier_sku, source_supplier')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Produit introuvable.' });
      res.json({ product: data });
    } catch (error) {
      console.error('[Suppliers] assign error:', error);
      res.status(400).json({ error: safeApiError(error, 'Affectation fournisseur non enregistrée.') });
    }
  }));
}
