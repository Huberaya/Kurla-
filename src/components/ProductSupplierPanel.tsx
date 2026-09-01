import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Package, Truck, CheckCircle2 } from 'lucide-react';

type Props = { headers: HeadersInit; onSuccess?: (message: string) => void };

type Supplier = { id: string; legalName: string; tradeName?: string; supplierType: string; country?: string };
type Product = {
  id: string; name: string; slug: string; category: string;
  supplierId?: string | null; supplierSku?: string | null; sourceSupplier?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  contract_manufacturer: 'Façonnier',
  laboratory: 'Laboratoire UE',
  raw_material: 'Matière première',
  distributor: 'Grossiste UE',
  textile: 'Accessoire/OEM',
  brand: 'Marque (revente)',
  tool: 'Outil',
  unknown: 'Non qualifié'
};

/**
 * Affectation d'un fournisseur à chaque produit du catalogue (champs
 * supplier_id / supplier_sku / source_supplier). Permet de savoir, référence
 * par référence, d'où vient le produit et à quel coût approximatif — base du
 * pilotage de la marge et du sourcing « bas coût ».
 */
export const ProductSupplierPanel: React.FC<Props> = ({ headers, onSuccess }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unassigned'>('all');
  const [drafts, setDrafts] = useState<Record<string, { supplierId: string; supplierSku: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supRes, prodRes] = await Promise.all([
        fetch('/api/admin/suppliers', { headers }),
        fetch('/api/products', { headers })
      ]);
      const supJson = await supRes.json();
      const prodJson = await prodRes.json();
      const supList: Supplier[] = (supJson.suppliers || []).map((s: any) => ({
        id: s.id, legalName: s.legalName, tradeName: s.tradeName,
        supplierType: s.supplierType || s.supplier_type, country: s.country
      }));
      setSuppliers(supList);
      const prodList: Product[] = (prodJson.products || [])
        .filter((p: any) => String(p.id).startsWith('launch-'))
        .map((p: any) => ({
          id: p.id, name: p.name, slug: p.slug, category: p.category,
          supplierId: (p as any).supplierId ?? (p as any).supplier_id ?? null,
          supplierSku: (p as any).supplierSku ?? (p as any).supplier_sku ?? null,
          sourceSupplier: (p as any).sourceSupplier ?? (p as any).source_supplier ?? null
        }));
      setProducts(prodList);
      const init: Record<string, { supplierId: string; supplierSku: string }> = {};
      for (const p of prodList) init[p.id] = { supplierId: p.supplierId || '', supplierSku: p.supplierSku || '' };
      setDrafts(init);
    } catch (e) {
      console.error('Erreur chargement affectation fournisseurs', e);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const supplierName = useCallback((id?: string | null) => suppliers.find(s => s.id === id), [suppliers]);

  const save = async (product: Product) => {
    const draft = drafts[product.id] || { supplierId: '', supplierSku: '' };
    setSavingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/supplier`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ supplierId: draft.supplierId, supplierSku: draft.supplierSku })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec');
      setProducts(prev => prev.map(p => p.id === product.id
        ? { ...p, supplierId: draft.supplierId || null, supplierSku: draft.supplierSku || null,
            sourceSupplier: draft.supplierId ? (supplierName(draft.supplierId)?.tradeName || supplierName(draft.supplierId)?.legalName || null) : null }
        : p));
      onSuccess?.(`Fournisseur enregistré pour ${product.name}.`);
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally { setSavingId(null); }
  };

  const visible = useMemo(() => {
    const list = products.filter(p => p.category !== 'kits');
    return filter === 'unassigned' ? list.filter(p => !p.supplierId) : list;
  }, [products, filter]);

  const assignedCount = products.filter(p => p.category !== 'kits' && p.supplierId).length;
  const totalCount = products.filter(p => p.category !== 'kits').length;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-5 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#C8753D]" /> Fournisseur par produit
          </h3>
          <p className="text-xs text-[#FFF7EF]/55 mt-1 max-w-2xl">
            Affectez la source d'approvisionnement de chaque référence. Les produits finis passent par un façonnier private label (bas coût), le karité/huiles par les matières premières, les accessoires en OEM. Les kits sont des assemblages (pas de fournisseur unique).
          </p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-full bg-[#050403] hover:bg-[#3A2218] border border-[#FFF7EF]/15 text-[11px] font-semibold text-[#D49A63] flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold">
          {assignedCount}/{totalCount} produits affectés
        </span>
        <div className="flex gap-1.5">
          {([['all', 'Tous'], ['unassigned', 'Sans fournisseur']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${filter === id ? 'bg-[#C8753D] border-[#C8753D] text-white' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/60'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[#FFF7EF]/50 italic">Chargement…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4">
          Aucun fournisseur enregistré. Créez d'abord des fournisseurs dans le panneau ci-dessous (ou lancez le script de seed sourcing).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#FFF7EF]/10 text-[#D49A63] uppercase tracking-wider">
                <th className="py-2.5 px-2">Produit</th>
                <th className="py-2.5 px-2">Fournisseur</th>
                <th className="py-2.5 px-2">SKU fourn.</th>
                <th className="py-2.5 px-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFF7EF]/5">
              {visible.map(p => {
                const draft = drafts[p.id] || { supplierId: '', supplierSku: '' };
                const dirty = draft.supplierId !== (p.supplierId || '') || draft.supplierSku !== (p.supplierSku || '');
                return (
                  <tr key={p.id} className="align-middle">
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-[#FFF7EF]">{p.name}</span>
                      <p className="text-[10px] text-[#FFF7EF]/40 font-mono">{p.id} · {p.category}</p>
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={draft.supplierId}
                        onChange={e => setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], supplierId: e.target.value } }))}
                        className="w-56 px-2.5 py-1.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]"
                      >
                        <option value="">— Non affecté —</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.tradeName || s.legalName} ({TYPE_LABEL[s.supplierType] || s.supplierType})</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        value={draft.supplierSku}
                        onChange={e => setDrafts(d => ({ ...d, [p.id]: { ...d[p.id], supplierSku: e.target.value } }))}
                        placeholder="réf. fournisseur"
                        className="w-32 px-2.5 py-1.5 rounded-xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] text-xs font-mono focus:outline-none focus:border-[#C8753D]"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <button
                        onClick={() => save(p)}
                        disabled={!dirty || savingId === p.id}
                        className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#B3632F] disabled:opacity-30 text-white text-[11px] font-bold flex items-center gap-1.5"
                      >
                        {savingId === p.id ? '…' : dirty ? <Save className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {dirty ? 'Enregistrer' : 'OK'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-[#FFF7EF]/45 italic">Tous les produits ont un fournisseur. 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-[#FFF7EF]/40 flex items-start gap-1.5">
        <Truck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Levier « prix type Action » : les façonniers private label (Chine, MOQ 100–500) descendent le coût des produits finis à ~1–4 $/pièce ; les grossistes karité en UE évitent les droits de douane pour le premier lot. Vérifier conformité UE (CPNP, allergènes) et demander des échantillons avant toute commande.
      </p>
    </div>
  );
};
