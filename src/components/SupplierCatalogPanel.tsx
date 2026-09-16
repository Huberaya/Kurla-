import React, { useEffect, useMemo, useState } from 'react';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { ChevronRight, Factory } from 'lucide-react';

/**
 * CE QUE CHAQUE FOURNISSEUR FOURNIT — la vue inverse de « Fournisseur par
 * produit » : chaque fournisseur identifié, avec les produits du catalogue
 * qui lui sont réellement rattachés (products.supplier_id).
 *
 * Honnêteté : un fournisseur sans produit rattaché est affiché « aucun
 * produit rattaché » — ce qu'il « peut » fournir ne s'invente pas ; c'est le
 * travail de qualification (pistes, RFQ, échantillons) qui le dira.
 */

const CATEGORY_LABELS: Record<string, string> = {
  cheveux: 'Cheveux', peau: 'Peau', kits: 'Kit', accessoires: 'Accessoire',
  hommes: 'Hommes', enfants: 'Enfants', maquillage: 'Maquillage',
};

export const SupplierCatalogPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Vue complète : pas de filtre par espace de travail ici — un fournisseur
  // peut servir les deux pôles, l'écran doit le montrer en entier.
  const allHeaders = useMemo(() => {
    const normalized: Record<string, string> = {};
    new Headers(headers as HeadersInit).forEach((value, key) => { normalized[key] = value; });
    delete normalized['x-kurla-workspace'];
    return normalized;
  }, [headers]);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch('/api/admin/suppliers?all=1', { headers: allHeaders }),
          fetch('/api/admin/catalog/products', { headers: allHeaders }),
        ]);
        const sBody = await sRes.json();
        if (!sRes.ok) throw new Error(sBody.error || 'Référentiel indisponible.');
        setSuppliers(sBody.suppliers || []);
        if (pRes.ok) {
          const pBody = await pRes.json();
          setProducts(pBody.products || []);
        }
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      } finally {
        setLoading(false);
      }
    })();
  }, [allHeaders]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of products) {
      const sid = String(p.supplierId || p.supplier_id || '');
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push(p);
    }
    return map;
  }, [products]);

  const rows = useMemo(() => {
    return suppliers
      .map(s => ({ supplier: s, items: bySupplier.get(String(s.id)) || [] }))
      .sort((a, b) => b.items.length - a.items.length || String(a.supplier.legalName || '').localeCompare(String(b.supplier.legalName || '')));
  }, [suppliers, bySupplier]);

  // Filtres par champ (17/09) : « quel fournisseur italien », « lesquels n'ont
  // encore aucun produit rattaché » — sans filtre, la réponse demande de
  // dérouler les 29 blocs. Même calcul partagé que partout ailleurs.
  const SUPPLIER_CATALOG_FILTER_KEYS = ['supplier', 'country', 'items', 'products'] as const;
  const supplierCatalogFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'supplier', kind: 'text', get: (row: any) => row.supplier.tradeName, extra: (row: any) => [row.supplier.legalName, row.supplier.id] },
    { key: 'country', kind: 'text', get: (row: any) => row.supplier.country },
    { key: 'items', kind: 'numeric', get: (row: any) => row.items.length, unit: ' produit(s)' },
    { key: 'products', kind: 'enum', get: (row: any) => (row.items.length > 0 ? 'avec' : 'sans'), options: [
      { value: 'avec', label: 'Avec produits rattachés' },
      { value: 'sans', label: 'Sans produit rattaché' },
    ] },
  ], []);
  const [supplierCatalogFilterState, setSupplierCatalogFilterState] = useState(() => emptyFilterState(SUPPLIER_CATALOG_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visibleRows = useMemo(
    () => applyColumnFilters(rows, supplierCatalogFilters, supplierCatalogFilterState),
    [rows, supplierCatalogFilters, supplierCatalogFilterState]
  );

  const assignedProducts = rows.reduce((n, r) => n + r.items.length, 0);

  if (loading) return <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 text-xs text-kurla-cream/50">Chargement du catalogue par fournisseur…</div>;
  if (error) return <div className="p-5 rounded-3xl bg-kurla-espresso border border-rose-400/30 text-rose-300 text-xs">Catalogue par fournisseur : {error}</div>;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
      <div>
        <h3 className="font-bold flex items-center gap-2 text-kurla-cream"><Factory className="w-4 h-4 text-kurla-amber" /> Ce que chaque fournisseur fournit</h3>
        <p className="text-[11px] text-kurla-cream/55 mt-1 max-2xl">
          Les {suppliers.length} fournisseurs identifiés et les {assignedProducts} produits du catalogue réellement rattachés. Un fournisseur sans produit rattaché est nommé tel quel — ce qu'il peut fournir se prouve (tarif, échantillon, RFQ), ça ne se déclare pas.
        </p>
      </div>

      <div className="space-y-2">
        <ColumnFilterStrip
          filters={supplierCatalogFilters}
          state={supplierCatalogFilterState}
          onChange={(key, value) => setSupplierCatalogFilterState(prev => ({ ...prev, [key]: value }))}
          onReset={() => setSupplierCatalogFilterState(emptyFilterState(SUPPLIER_CATALOG_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
          total={rows.length}
          shown={visibleRows.length}
        />
        {visibleRows.map(({ supplier, items }) => (
          <details key={supplier.id} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink overflow-hidden" open={items.length > 0 && items.length <= 12}>
            <summary className="cursor-pointer px-4 py-3 flex flex-wrap items-center gap-2 text-sm hover:bg-kurla-cream/[0.03]">
              <ChevronRight className="w-4 h-4 text-kurla-copper transition-transform [[open]>&]:rotate-90" />
              <span className="font-bold text-kurla-cream">{supplier.tradeName || supplier.legalName || supplier.id}</span>
              {supplier.tradeName && supplier.legalName && supplier.tradeName !== supplier.legalName && <span className="text-[10px] text-kurla-cream/40">{supplier.legalName}</span>}
              {supplier.country && <span className="px-1.5 py-0.5 rounded bg-kurla-espresso border border-kurla-cream/10 text-[9px] text-kurla-cream/60 font-bold">{supplier.country}</span>}
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${items.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/25 text-amber-300'}`}>
                {items.length > 0 ? `${items.length} produit(s)` : 'aucun produit rattaché'}
              </span>
            </summary>
            <div className="px-4 pb-4">
              {items.length === 0 ? (
                <p className="text-[11px] text-kurla-cream/45 italic">Fournisseur identifié, aucun produit du catalogue ne lui est rattaché pour l'instant. Qualification à faire : tarif écrit, MOQ, échantillon — puis affectation dans « Fournisseur par produit ».</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {items.map(p => (
                    <span key={String(p.id)} className="px-2 py-1 rounded-lg border border-kurla-cream/10 bg-kurla-espresso text-[10px] text-kurla-cream/75" title={String(p.id)}>
                      {String(p.name || p.id)}
                      <span className="text-kurla-cream/40"> · {CATEGORY_LABELS[String(p.category || '')] || p.category || '—'}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};
