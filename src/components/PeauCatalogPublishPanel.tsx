import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Eye, Beaker, Truck, Clock, XCircle } from 'lucide-react';

type Row = { productId: string; title: string; slug?: string; ready: boolean; missing: string[]; catalogStatus: string };
type Product = { id: string; name: string; category: string; brand?: string; price: number; catalogStatus: string; supplierId?: string };

const PEAU_IDS = new Set(['peau-ess-001','peau-ess-002','peau-ess-003','peau-serum-niacinamide-001','peau-gel-hyaluronique-001','peau-exfoliant-aha-bha-001','peau-baume-levres-001','kit-peau-ess-001','kit-peau-eq-001','kit-peau-exp-001']);

function isPeau(product: { id: string; category?: string; name?: string }){
  return product.category==='peau' || product.category==='kits' || PEAU_IDS.has(product.id) || product.id.startsWith('peau-') || product.id.startsWith('kit-peau');
}

export const PeauCatalogPublishPanel: React.FC<{ headers: HeadersInit; onSuccess?: (m:string)=>void }> = ({ headers, onSuccess }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string|null>(null);
  const [stripeMode, setStripeMode] = useState<'test'|'live'|'unknown'>('unknown');

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [rRes, pRes, mRes] = await Promise.all([
        fetch('/api/admin/catalog/publication-readiness', { headers }),
        fetch('/api/admin/catalog/products', { headers }),
        fetch('/api/admin/metrics', { headers }).catch(()=>null as any),
      ]);
      const r = await rRes.json(); const p = await pRes.json();
      if(!rRes.ok) throw new Error(r.error || 'Readiness indisponible');
      if(!pRes.ok) throw new Error(p.error || 'Catalogue indisponible');
      const allRows: Row[] = (r.perProduct || r.rows || []).map((x:any)=>({
        productId: x.productId || x.product_id,
        title: x.title || x.productId,
        ready: !!x.ready,
        missing: x.missing || [],
        catalogStatus: x.catalogStatus || x.catalog_status || 'draft',
      }));
      setRows(allRows);
      setProducts((p.products||[]).map((x:any)=>({ id:x.id, name:x.name, category:x.category, brand:x.brand, price:Number(x.price||0), catalogStatus:x.catalogStatus||x.catalog_status||'draft', supplierId:x.supplierId||x.supplier_id })));
      if(mRes && mRes.ok){
        const m = await mRes.json();
        setStripeMode(m.metrics?.stripeMode || 'test');
      } else {
        setStripeMode('test');
      }
    }catch(e:any){ setError(e.message||'Chargement impossible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const peauRows = rows.filter(r=> isPeau({ id:r.productId, name:r.title }));
  // fallback to products peau if no readiness yet
  const display = peauRows.length ? peauRows : products.filter(p=> isPeau(p)).map(p=>({
    productId:p.id, title:p.name, slug:p.id, ready:false, missing:['Aucune donnée readiness — catalogue vide ou migration non appliquée'], catalogStatus:p.catalogStatus
  } as Row));

  const setStatus = async (productId:string, status:string)=>{
    setBusyId(productId);
    try{
      const res = await fetch(`/api/admin/catalog/${encodeURIComponent(productId)}/status`, {
        method:'PATCH', headers, body: JSON.stringify({ status })
      });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error || 'Statut refusé');
      onSuccess?.(`${productId} → ${status}`);
      await load();
    }catch(e:any){ setError(e.message||'Statut refusé'); }
    finally{ setBusyId(null); }
  };

  const readyCount = display.filter(r=> r.ready).length;
  const blockedCount = display.length - readyCount;
  const publishedCount = display.filter(r=> r.catalogStatus==='published').length;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C8753D]" /> C20 — Catalogue peau : publication TEST contrôlée
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${stripeMode==='live'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>Stripe {stripeMode.toUpperCase()} — précommande 3–5j</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            <strong className="text-[#FFF7EF]">TEST = on publie, on encaisse en test, on ne livre qu’après 8 gates verts fichier+date.</strong> Un produit peau n’est « publié » que si <strong className="text-emerald-300">ready = oui</strong> (0 manque) — sinon le bouton Publier est désactivé et les manques sont nommés. Aucune liste n’est inventée : ce qui n’est pas reçu s’affiche bloqué.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center"><p className="text-xl font-bold text-[#FFF7EF]">{display.length}</p><p className="text-[10px] uppercase tracking-wider text-[#D49A63]">SKU peau + kits</p></div>
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center"><p className="text-xl font-bold text-emerald-300">{readyCount}</p><p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Prêts à publier</p></div>
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center"><p className="text-xl font-bold text-rose-300">{blockedCount}</p><p className="text-[10px] uppercase tracking-wider text-rose-200/70">Bloqués (manques)</p></div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#C8753D]/30 text-center"><p className="text-xl font-bold text-[#C8753D]">{publishedCount}</p><p className="text-[10px] uppercase tracking-wider text-[#D49A63]">Publiés (TEST)</p></div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Beaker className="w-3 h-3" /> PIF/CPSR/CPNP fichier+date</span>
        <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Eye className="w-3 h-3" /> Whitecast V-VI faible</span>
        <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Truck className="w-3 h-3" /> MOQ 50·Délai 3–5j·Franco</span>
        <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Clock className="w-3 h-3" /> Préco lun/jeu 18h·0 stock Paris</span>
      </div>

      {loading ? <p className="text-xs text-[#FFF7EF]/50 italic">Chargement readiness peau…</p> : display.length===0 ? (
        <p className="text-xs text-[#FFF7EF]/50">Aucun SKU peau dans readiness — vérifiez que les produits peau (peau-… / kit-peau-…) sont bien en catalogue.</p>
      ) : (
        <div className="space-y-3">
          {display.map(row=>{
            const product = products.find(p=>p.id===row.productId);
            const isPublished = row.catalogStatus==='published';
            const canPublish = row.ready && !isPublished;
            const blockReason = !row.ready ? row.missing.join(' · ') : '';
            return (
              <div key={row.productId} className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${row.ready ? 'bg-emerald-950/20 border-emerald-500/20':'bg-[#050403] border-rose-500/20'}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#FFF7EF]">{row.title}</span>
                    <span className="font-mono text-[11px] text-[#FFF7EF]/40">{row.productId}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${row.ready?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{row.ready?'✓ prêt':'⛔ bloqué'}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] ${isPublished?'bg-[#C8753D]/20 text-[#D49A63] border-[#C8753D]/30':'bg-[#FFF7EF]/5 text-[#FFF7EF]/50 border-[#FFF7EF]/10'}`}>{row.catalogStatus}</span>
                    {product?.category && <span className="px-2 py-0.5 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[10px] text-[#FFF7EF]/60">{product.category}</span>}
                  </div>
                  {!row.ready ? (
                    <p className="text-xs text-rose-300 mt-1 leading-relaxed">Manques : {blockReason || 'non détaillés'}</p>
                  ) : (
                    <p className="text-xs text-emerald-300 mt-1">Tous les contrôles au vert — publiable en TEST (l’encaissement reste Stripe TEST tant que Stripe LIVE non activé).</p>
                  )}
                  {row.missing.some(m=>/cpnp|cpsr|responsable|pif/i.test(m)) && !row.ready && (
                    <p className="text-[11px] text-amber-300 mt-1">→ Joignez CPSR + CPNP + attestation Personne Responsable chez le fournisseur, ou basculez vers grossiste UE vérifié (AfricanFabs / Afro Wholesale avec dossier).</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select value={row.catalogStatus} onChange={e=> setStatus(row.productId, e.target.value)} disabled={busyId===row.productId}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]">
                    <option value="draft">brouillon</option>
                    <option value="pending_review">à vérifier</option>
                    <option value="published" disabled={!row.ready}>publier</option>
                    <option value="unavailable">indisponible</option>
                  </select>
                  <button onClick={()=> canPublish ? setStatus(row.productId,'published') : null} disabled={!canPublish || busyId===row.productId}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${canPublish?'bg-[#C8753D] hover:bg-[#D49A63] text-white':'bg-[#FFF7EF]/10 text-[#FFF7EF]/30 cursor-not-allowed'}`}>
                    {busyId===row.productId ? <RefreshCw className="w-3 h-3 animate-spin" /> : canPublish ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {canPublish?'Publier TEST':'Bloqué'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>Garde TEST :</strong> tant que <strong>Stripe TEST</strong>, publier = visible boutique + panier + checkout test (aucun euro réel). Le passage LIVE se fait pays par pays (FR 82/BE 76) seulement quand 8 gates verts + 1 lot reçu + coût servi calculé. Tout « publié » sans lot reste à 0 stock → précommande 3–5j lun/jeu 18h expliquée au client.</span>
      </div>

      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C20 — sources : <span className="text-[#D49A63]">/api/admin/catalog/publication-readiness</span> (ready/missing/catalogStatus) + <span className="text-[#D49A63]">/api/admin/catalog/products</span> (7 peau + 3 kits) + Stripe mode. Bouton Publier = <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">PATCH /api/admin/catalog/:id/status {"{status:'published'}"}</code> — refusé si missing non vide.</p>
    </div>
  );
};
