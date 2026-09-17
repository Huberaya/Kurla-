import React, { useEffect, useMemo, useState } from 'react';
import { Tags, Save } from 'lucide-react';
import { SKIN_NEEDS } from '../lib/skinTaxonomy';
import { fetchAdminCatalogProducts } from '../lib/adminCatalogProducts';
import { evaluateCatalogSkinCriteria } from '../lib/skinCriteria';
import { SkinCriteriaChecklist } from './SkinCriteriaChecklist';

/**
 * ÉDITION DES BESOINS PAR FICHE (§12, mission 16/09/2026).
 *
 * Un produit appartient à PLUSIEURS besoins. Les 15 codes sont la taxonomie
 * canonique peau (`SKIN_NEEDS`) ; l'écriture passe par la route PATCH
 * existante qui applique le vocabulaire contrôlé — une valeur hors
 * référentiel est refusée côté serveur, jamais enregistrée en douce.
 *
 * Aucun besoin n'est inventé ici : on ne propose que les codes de la
 * taxonomie, et l'état initial est celui réellement lu sur la fiche.
 */
export const ProductNeedsEditor: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // `?scope=all` a été retiré le 17/09 : le serveur lit l'espace dans
        // readWorkspaceScope, qui donne la priorité à l'en-tête
        // x-kurla-workspace (toujours présent via adminHeaders) sur le
        // paramètre d'URL — et `all` n'est ni 'skin' ni 'hair'. Le paramètre
        // était donc mort : il laissait croire à une liste tous espaces alors
        // que la liste de l'espace courant était servie. Le comportement ne
        // change pas ; le libellé mentait, plus maintenant.
        const body = await fetchAdminCatalogProducts(headers);
        setProducts(body.products || []);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      }
    })();
  }, [headers]);

  const product = useMemo(() => products.find(p => String(p.id) === selectedId) || null, [products, selectedId]);

  const filtered = useMemo(() => {
    const low = search.toLowerCase();
    const list = low ? products.filter(p => `${p.name} ${p.brand || ''}`.toLowerCase().includes(low)) : products;
    return list.slice(0, 60);
  }, [products, search]);

  const readNeeds = (p: any): string[] => {
    const raw = Array.isArray(p?.concerns) && p.concerns.length > 0 ? p.concerns : (Array.isArray(p?.needs) ? p.needs : []);
    return raw.map((v: unknown) => String(v)).filter(v => v !== '');
  };

  const select = (productId: string) => {
    const p = products.find(item => String(item.id) === productId) || null;
    setSelectedId(productId);
    const current = p ? readNeeds(p) : [];
    setSelected(current);
    setSaved(current);
    setMessage('');
  };

  const toggle = (value: string) => {
    setSelected(current => current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const dirty = useMemo(() => {
    const a = [...selected].sort().join(',');
    const b = [...saved].sort().join(',');
    return a !== b;
  }, [selected, saved]);

  const save = async () => {
    if (!selectedId) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog/products/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ concerns: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Enregistrement refusé.');
      setSaved(selected);
      setProducts(current => current.map(p => String(p.id) === selectedId ? { ...p, concerns: selected, needs: selected } : p));
      setMessage(selected.length === 0 ? 'Besoins vidés.' : `Besoins enregistrés (${selected.length}).`);
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><Tags className="w-4 h-4 text-kurla-amber" /> Besoins par fiche — organisation du catalogue</h3>
      <p className="text-[11px] text-kurla-cream/60">Un produit peut couvrir plusieurs besoins. Seuls les 15 codes de la taxonomie peau sont proposés ; l'enregistrement passe par le vocabulaire contrôlé (une valeur hors référentiel est refusée, jamais stockée en douce).</p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit…" className="w-full px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px]" />
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {filtered.map(p => (
              <button key={p.id} type="button" onClick={() => select(String(p.id))} className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] ${String(p.id) === selectedId ? 'bg-kurla-copper/15 border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/5 hover:border-kurla-copper/25'}`}>
                <span className="font-semibold">{p.name}</span>
                {p.brand && <span className="text-kurla-cream/50"> · {p.brand}</span>}
                <span className="float-right text-kurla-cream/40">{readNeeds(p).length} besoin(s)</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[11px] text-kurla-cream/45">Aucun produit ne correspond.</p>}
          </div>
        </div>

        <div className="space-y-3">
          {product ? (
            <>
              <p className="text-[12px] font-bold">{product.name} {product.brand && <span className="text-kurla-cream/50 font-normal">· {product.brand}</span>}</p>
              <div className="flex flex-wrap gap-1.5">
                {SKIN_NEEDS.map(need => {
                  const active = selected.includes(need.value);
                  return (
                    <button key={need.value} type="button" onClick={() => toggle(need.value)} title={need.description} className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${active ? 'bg-kurla-copper/20 border-kurla-copper/50 text-kurla-copper' : 'bg-kurla-ink border-kurla-cream/12 text-kurla-cream/55 hover:border-kurla-copper/30'}`}>
                      {need.shortLabel}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={save} disabled={busy || !dirty} className="px-3 py-1.5 rounded-xl bg-kurla-copper text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40">
                  <Save className="w-3 h-3" /> {busy ? 'Enregistrement…' : dirty ? 'Enregistrer les besoins' : 'Aucun changement'}
                </button>
                {dirty && <button type="button" onClick={() => setSelected(saved)} className="px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/60">Annuler</button>}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-kurla-cream/45">Sélectionne un produit pour éditer ses besoins.</p>
          )}
          {message && <p className="text-[11px] text-kurla-cream/75">{message}</p>}
        </div>
      </div>
    </div>
  );
};
