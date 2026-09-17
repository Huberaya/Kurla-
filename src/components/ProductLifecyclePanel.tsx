/**
 * CHANTIER 1 — Vue lecture du cycle de vie.
 *
 * Montée dans les DEUX espaces (parité Hair/Skin). Aucune écriture : on
 * nomme le stade réel calculé depuis les tables existantes. Une ligne
 * identifiée n'est jamais présentée comme publiée.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { GitMerge, RefreshCw } from 'lucide-react';

import { fetchAdminCatalogProducts } from '../lib/adminCatalogProducts';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { SupplierName } from './EditableRecordName';
import {
  BUSINESS_STAGE_LABELS,
  BUSINESS_STAGES,
  CANONICAL_TABLES,
  WRITE_TARGET_BY_INTENT,
  countByStage,
  publiclyListableCount,
  parseConsolidatedPositionId,
  unifyCandidate,
  unifyFondPosition,
  unifyProduct,
  type BusinessStage,
  type UnifiedRecord,
} from '../lib/productLifecycle';

type ProductLifecyclePanelProps = {
  headers: HeadersInit;
  onOpenCatalog?: (productId: string) => void;
  onOpenSupplier?: (supplierId: string) => void;
};

const STAGE_TONE: Record<BusinessStage, string> = {
  identified: 'border-sky-500/25 text-sky-200',
  sourcing: 'border-amber-500/25 text-amber-200',
  catalog: 'border-kurla-copper/40 text-kurla-amber',
  published: 'border-emerald-500/30 text-emerald-300',
  refused: 'border-rose-500/30 text-rose-300',
};

export const ProductLifecyclePanel: React.FC<ProductLifecyclePanelProps> = ({
  headers,
  onOpenCatalog,
}) => {
  const [records, setRecords] = useState<UnifiedRecord[] | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<BusinessStage | 'all'>('all');

  const load = async () => {
    setLoading(true);
    const [consolidated, products, ops] = await Promise.allSettled([
      fetch('/api/admin/sourcing/consolidated', { headers }).then(r => r.json()),
      fetchAdminCatalogProducts(headers),
      fetch('/api/admin/sourcing/ops', { headers }).then(r => r.json()),
    ]);
    const failed: string[] = [];
    if (consolidated.status !== 'fulfilled' || consolidated.value?.error) failed.push('vue consolidée');
    if (products.status !== 'fulfilled') failed.push('catalogue');
    if (ops.status !== 'fulfilled' || (ops.status === 'fulfilled' && ops.value?.error)) failed.push('sources d’offre');
    setUnavailable(failed);

    const consolidatedValue = consolidated.status === 'fulfilled' ? consolidated.value : null;
    const productsValue = products.status === 'fulfilled' ? products.value : null;
    const opsValue = ops.status === 'fulfilled' ? ops.value : null;

    const sourcesByProduct = new Map<string, number>();
    const primarySupplierByProduct = new Map<string, string | null>();
    for (const row of opsValue?.products || []) {
      sourcesByProduct.set(String(row.id), Number(row.sourcesCount) || 0);
      primarySupplierByProduct.set(String(row.id), row.primarySupplierId ?? null);
    }

    const productById = new Map<string, any>();
    for (const product of productsValue?.products || []) {
      productById.set(String(product.id), product);
    }

    const unified: UnifiedRecord[] = [];
    const productIdsFromCandidates = new Set<string>();

    for (const row of consolidatedValue?.rows || []) {
      if (row.kind === 'position') {
        const parsed = parseConsolidatedPositionId(String(row.id || ''));
        unified.push(unifyFondPosition({
          sourcingItemId: parsed.sourcingItemId,
          rang: parsed.rang ?? undefined,
          produit: row.name,
          marque: row.brand,
          priceEur: row.priceEur,
          fournisseur_canal: row.supplierName,
        }));
        continue;
      }
      if (row.kind === 'candidate') {
        const linked = row.linkedProductId ? productById.get(String(row.linkedProductId)) : null;
        if (linked) productIdsFromCandidates.add(String(linked.id));
        unified.push(unifyCandidate({
          id: row.id,
          product: row.name,
          brand: row.brand,
          supplierName: row.supplierName,
          priceEur: row.priceEur,
          draft_product_id: row.linkedProductId,
          catalogStatus: linked?.catalogStatus ?? linked?.catalog_status,
          isTestListing: linked?.isTestListing === true || linked?.is_test_listing === true || linked?.truth?.isTestListing === true,
          isPubliclyListable: linked?.truth?.isPubliclyListable === true,
          publicationReady: undefined,
          sourcesCount: linked ? sourcesByProduct.get(String(linked.id)) : 0,
        }));
        continue;
      }
      const product = productById.get(String(row.id)) || { id: row.id, name: row.name, brand: row.brand };
      unified.push(unifyProduct({
        ...product,
        sourcesCount: sourcesByProduct.get(String(row.id)) || 0,
        primarySourceSupplierId: primarySupplierByProduct.get(String(row.id)) ?? null,
      }));
    }

    for (const product of productsValue?.products || []) {
      const id = String(product.id);
      if (unified.some(record => record.linkedProductId === id || record.uid === `product:${id}`)) continue;
      if (productIdsFromCandidates.has(id)) continue;
      unified.push(unifyProduct({
        ...product,
        sourcesCount: sourcesByProduct.get(id) || 0,
        primarySourceSupplierId: primarySupplierByProduct.get(id) ?? null,
      }));
    }

    setRecords(unified);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => (records ? countByStage(records) : null), [records]);
  const publicCount = records ? publiclyListableCount(records) : 0;
  const staged = useMemo(() => {
    if (!records) return [];
    return stageFilter === 'all' ? records : records.filter(record => record.lifecycle.stage === stageFilter);
  }, [records, stageFilter]);
  const LIFE_FILTER_KEYS = ['title', 'kind', 'supplier', 'offer'] as const;
  const lifeFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'title', kind: 'text', get: (row: UnifiedRecord) => row.title, extra: (row: UnifiedRecord) => [row.brand] },
    { key: 'kind', kind: 'enum', get: (row: UnifiedRecord) => row.kind, options: [
      { value: 'fond_position', label: 'Fond' },
      { value: 'candidate', label: 'Candidat' },
      { value: 'product', label: 'Fiche' },
    ] },
    { key: 'supplier', kind: 'present', get: (row: UnifiedRecord) => row.supplierId, presentLabels: { filled: 'Fournisseur structuré', empty: 'Canal / piste' } },
    { key: 'offer', kind: 'enum', get: (row: UnifiedRecord) => (row.lifecycle.hasOffer ? 'oui' : 'non'), options: [
      { value: 'oui', label: 'Avec offre' },
      { value: 'non', label: 'Sans offre' },
    ] },
  ], []);
  const [lifeFilterState, setLifeFilterState] = useState(() => emptyFilterState(LIFE_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visible = useMemo(
    () => applyColumnFilters(staged, lifeFilters, lifeFilterState),
    [staged, lifeFilters, lifeFilterState]
  );

  return (
    <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-kurla-copper" /> Cycle de vie — lecture
          </h2>
          <p className="text-xs text-kurla-cream/55 mt-1 max-w-3xl">
            Un seul graphe, les tables déjà là. Identifié n’est pas publié. L’offre vit dans
            <code className="mx-1 text-kurla-amber">{CANONICAL_TABLES.offer}</code>
            (N fournisseurs), pas dans un nom libre. Import 500 → {WRITE_TARGET_BY_INTENT.import_identified}, jamais la boutique.
          </p>
        </div>
        <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-amber flex items-center gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Recharger
        </button>
      </div>

      {loading && <p className="text-xs text-kurla-cream/45">Lecture du consolidé, du catalogue et des offres…</p>}

      {counts && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button type="button" onClick={() => setStageFilter('all')} className={`p-3 rounded-2xl border text-left ${stageFilter === 'all' ? 'border-kurla-copper/50 bg-kurla-copper/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
            <p className="text-2xl font-bold text-kurla-cream">{records?.length ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Lignes lues</p>
          </button>
          {BUSINESS_STAGES.map(stage => (
            <button key={stage} type="button" onClick={() => setStageFilter(stage)} className={`p-3 rounded-2xl border text-left ${stageFilter === stage ? 'border-kurla-copper/50 bg-kurla-copper/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
              <p className="text-2xl font-bold text-kurla-cream">{counts[stage]}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">{BUSINESS_STAGE_LABELS[stage]}</p>
            </button>
          ))}
        </div>
      )}

      {records && !loading && (
        <p className="text-[11px] text-kurla-cream/50">
          Publiques (listables, hors test) : <strong className="text-kurla-cream">{publicCount}</strong>.
          Une offre est un fait (colonne), pas un stade — un identifié peut avoir un devis sans être en boutique.
        </p>
      )}

      {records && !loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-kurla-cream/10 text-kurla-amber uppercase tracking-wider text-[10px]">
                <th className="py-2 pr-3">Stade</th>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Origine</th>
                <th className="py-2 pr-3">Fournisseur</th>
                <th className="py-2 pr-3">Offre</th>
                <th className="py-2 pr-3">Public</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kurla-cream/5">
              {visible.slice(0, 80).map(record => (
                <tr key={record.uid} className="hover:bg-kurla-ink/40">
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STAGE_TONE[record.lifecycle.stage]}`}>
                      {BUSINESS_STAGE_LABELS[record.lifecycle.stage]}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="font-semibold text-kurla-cream">{record.title}</span>
                    {record.brand && <span className="block text-[10px] text-kurla-cream/45">{record.brand}</span>}
                    {record.lifecycle.isTestListing && <span className="ml-1 text-[9px] text-amber-300 font-bold">test</span>}
                  </td>
                  <td className="py-2 pr-3 text-kurla-cream/55">{record.kind === 'fond_position' ? 'fond' : record.kind === 'candidate' ? 'candidat' : record.kind === 'product' ? 'fiche' : 'besoin'}</td>
                  <td className="py-2 pr-3">
                    {record.supplierId ? (
                      <SupplierName id={record.supplierId} headers={headers} className="text-xs" />
                    ) : (
                      <span className="text-kurla-cream/40">{record.unresolvedSupplierLabel || 'à qualifier — pas un fournisseur'}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{record.lifecycle.hasOffer ? <span className="text-emerald-300 font-bold">oui</span> : <span className="text-kurla-cream/35">non</span>}</td>
                  <td className="py-2 pr-3">
                    {record.lifecycle.isPublic ? (
                      record.linkedProductId && onOpenCatalog ? (
                        <button type="button" onClick={() => onOpenCatalog(record.linkedProductId!)} className="text-emerald-300 font-bold hover:underline">boutique</button>
                      ) : <span className="text-emerald-300">oui</span>
                    ) : (
                      <span className="text-kurla-cream/35">non</span>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-kurla-cream/40 italic">Aucune ligne pour ce stade — rien n’est inventé.</td></tr>
              )}
            </tbody>
          </table>
          {visible.length > 80 && <p className="text-[10px] text-kurla-cream/40 mt-2">+ {visible.length - 80} lignes — filtrer par stade.</p>}
        </div>
      )}

      {unavailable.length > 0 && (
        <p className="text-[11px] text-amber-200/80">
          Source{unavailable.length > 1 ? 's' : ''} indisponible{unavailable.length > 1 ? 's' : ''} : {unavailable.join(', ')} — vue partielle.
        </p>
      )}
    </div>
  );
};
