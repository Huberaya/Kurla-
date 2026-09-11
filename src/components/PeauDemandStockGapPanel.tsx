import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Boxes, Calculator, Gauge, Package, RefreshCw, TrendingUp } from 'lucide-react';
import { PEAU_KITS } from '../lib/peauKits';

type DemandRow = { productId: string; name: string; isKit: boolean; qtyFirm: number; qtyPending: number; qtyFromKits: number; qtyToSource: number };
type Batch = { productId: string; quantityReceived: number };

const PEAU_COMPONENTS = PEAU_KITS.flatMap(k=>k.products).reduce((acc:Record<string,{name:string;role:string}>,p)=>{
  if(!acc[p.id]) acc[p.id]= {name:p.name, role:p.role};
  return acc;
},{});

const KIT_SKUS = PEAU_KITS.map(k=>k.sku);
const PEAU_IDS = Object.keys(PEAU_COMPONENTS);

export const PeauDemandStockGapPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [demand, setDemand] = useState<DemandRow[]|null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [dRes, bRes] = await Promise.all([
        fetch('/api/admin/preorder-demand', { headers }),
        fetch('/api/admin/batches', { headers }),
      ]);
      const d = await dRes.json(); const b = await bRes.json();
      if(!dRes.ok) throw new Error(d.error || 'Demande indisponible');
      setDemand((d.products||[]) as DemandRow[]);
      if(bRes.ok) setBatches((b.batches||[]).map((x:any)=>({ productId:x.productId, quantityReceived:Number(x.quantityReceived||0) })));
    }catch(e:any){ setError(e.message||'Chargement impossible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const demandById = new Map((demand||[]).map(r=>[r.productId, r]));
  const batchesById = batches.reduce((m,b)=>{ m.set(b.productId,(m.get(b.productId)||0)+b.quantityReceived); return m; }, new Map<string,number>());

  // Kits demand
  const kitsDemand = KIT_SKUS.map(sku=> ({ sku, row: demandById.get(sku) }));
  const comps = PEAU_IDS.map(id=>{
    const row = demandById.get(id);
    const qtyToSource = row?.qtyToSource ?? 0;
    const qtyFirm = row?.qtyFirm ?? 0;
    const qtyPending = row?.qtyPending ?? 0;
    const qtyFromKits = row?.qtyFromKits ?? 0;
    const received = batchesById.get(id) ?? 0;
    const gap = Math.max(0, qtyToSource - received);
    const moq = 50;
    const toOrder = gap>0 ? Math.max(moq, gap) : 0;
    return { id, ...PEAU_COMPONENTS[id], qtyFirm, qtyPending, qtyFromKits, qtyToSource, received, gap, toOrder, row };
  });

  const totals = {
    qtyToSource: comps.reduce((s,c)=>s+c.qtyToSource,0),
    received: comps.reduce((s,c)=>s+c.received,0),
    gap: comps.reduce((s,c)=>s+c.gap,0),
    toOrder: comps.reduce((s,c)=>s+c.toOrder,0),
    kitsFirm: kitsDemand.reduce((s,k)=>s+(k.row?.qtyFirm||0),0),
    kitsPending: kitsDemand.reduce((s,k)=>s+(k.row?.qtyPending||0),0),
  };
  const coverage = totals.qtyToSource ? Math.round((totals.received / totals.qtyToSource)*100) : (totals.received?100:0);

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Gauge className="w-5 h-5 text-kurla-copper" /> C18 — Cockpit peau : demande vs stock → reste à sourcer
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">préco 3–5j lun/jeu 18h</span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            <strong className="text-kurla-cream">Demande peau</strong> = commandes réglées + en attente + unités induites par kits (1 kit = 1× chaque composant) — <strong className="text-kurla-cream">Stock</strong> = lots reçus · <strong className="text-emerald-300">Reste à sourcer</strong> = demande − stock (jamais négatif) · commande fournisseur = max(MOQ 50, gap). Rien n’est estimé : sans lot, le stock vaut 0.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-kurla-ink border border-emerald-500/25 text-center">
          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Kits fermes</p>
          <p className="text-xl font-bold text-kurla-cream">{totals.kitsFirm}</p>
          <p className="text-[10px] text-kurla-cream/40">KPEAU-01/02/03</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-amber-500/25 text-center">
          <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">Kits en attente</p>
          <p className="text-xl font-bold text-kurla-cream">{totals.kitsPending}</p>
          <p className="text-[10px] text-kurla-cream/40">Stripe TEST</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-sky-500/25 text-center">
          <p className="text-[10px] uppercase tracking-wider font-bold text-sky-300">Unités peau à sourcer</p>
          <p className="text-xl font-bold text-kurla-cream">{totals.qtyToSource}</p>
          <p className="text-[10px] text-kurla-cream/40">7 SKU peau (hors kits)</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10 text-center">
          <p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Reçues (lots)</p>
          <p className="text-xl font-bold text-kurla-cream">{totals.received}</p>
          <p className="text-[10px] text-kurla-cream/40">{coverage}% couverture</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-rose-500/25 text-center">
          <p className="text-[10px] uppercase tracking-wider font-bold text-rose-300">Gap net</p>
          <p className="text-xl font-bold text-rose-300">{totals.gap}</p>
          <p className="text-[10px] text-kurla-cream/40">sans MOQ</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-copper/30 text-center">
          <p className="text-[10px] uppercase tracking-wider font-bold text-kurla-copper">À commander (MOQ 50)</p>
          <p className="text-xl font-bold text-kurla-copper">{totals.toOrder}</p>
          <p className="text-[10px] text-kurla-cream/40">par SKU ≥50</p>
        </div>
      </div>

      {/* Couverture */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-kurla-ink border border-kurla-cream/10 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100,coverage)}%` }} />
        </div>
        <span className="text-xs font-bold text-emerald-300">{coverage}% couvert</span>
        <span className="text-[11px] text-kurla-cream/45 hidden sm:inline">7 composants peau — kit = 1× chaque composant</span>
      </div>

      {/* Kits demand detail */}
      <div className="overflow-x-auto rounded-2xl border border-kurla-cream/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-kurla-ink text-kurla-amber uppercase tracking-wider text-[10px]">
            <tr><th className="px-3 py-2">Kit</th><th className="px-3 py-2 text-center">Fermes</th><th className="px-3 py-2 text-center">En attente</th><th className="px-3 py-2 text-center">Via compos.</th><th className="px-3 py-2 text-right">Prix</th></tr>
          </thead>
          <tbody className="divide-y divide-kurla-cream/5">
            {PEAU_KITS.map(k=>{
              const row = demandById.get(k.sku);
              return (
                <tr key={k.sku}>
                  <td className="px-3 py-2"><span className="font-bold text-kurla-cream">{k.id} {k.tier}</span><span className="text-kurla-cream/40"> · {k.sku}</span></td>
                  <td className="px-3 py-2 text-center font-bold text-emerald-300">{row?.qtyFirm ?? 0}</td>
                  <td className="px-3 py-2 text-center text-amber-300">{row?.qtyPending ?? 0}</td>
                  <td className="px-3 py-2 text-center text-indigo-300">{row?.qtyFromKits ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-kurla-amber">{k.priceBundle.toFixed(2)}€</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Composants gap */}
      <div className="overflow-x-auto rounded-2xl border border-kurla-cream/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-kurla-ink text-kurla-amber uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3 py-2">Composant peau</th>
              <th className="px-2 py-2 text-center">Demande</th>
              <th className="px-2 py-2 text-center">Reçu</th>
              <th className="px-2 py-2 text-center">Gap</th>
              <th className="px-2 py-2 text-center">À cmder</th>
              <th className="px-3 py-2">Détail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kurla-cream/5">
            {comps.map(c=> (
              <tr key={c.id} className={c.gap>0?'bg-rose-950/10':''}>
                <td className="px-3 py-2">
                  <span className="font-semibold text-kurla-cream">{c.name}</span>
                  <span className="text-[10px] text-kurla-cream/40 ml-1.5 font-mono">{c.id}</span>
                  <span className="text-[10px] text-kurla-cream/50 block">{c.role}</span>
                </td>
                <td className="px-2 py-2 text-center">
                  <span className="font-bold text-kurla-cream">{c.qtyToSource}</span>
                  <span className="text-[10px] text-kurla-cream/40 block">F{c.qtyFirm} + P{c.qtyPending} + K{c.qtyFromKits}</span>
                </td>
                <td className="px-2 py-2 text-center"><span className={c.received? 'text-emerald-300 font-bold':'text-kurla-cream/40'}>{c.received}</span></td>
                <td className="px-2 py-2 text-center">
                  {c.gap>0 ? <span className="px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">{c.gap}</span>
                  : <span className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">OK</span>}
                </td>
                <td className="px-2 py-2 text-center">
                  {c.toOrder>0 ? <span className="px-2 py-1 rounded-full bg-kurla-copper/20 border border-kurla-copper/40 text-[#F3C9A4] font-bold">{c.toOrder}</span>
                  : <span className="text-kurla-cream/30">—</span>}
                </td>
                <td className="px-3 py-2 text-[11px] leading-snug">
                  {c.gap===0 ? <span className="text-emerald-300/80">Couvert.</span>
                  : c.qtyToSource < 50 ? <span className="text-amber-300">Demande {c.qtyToSource} → MOQ 50 s’applique.</span>
                  : <span className="text-kurla-cream/60">{c.qtyFromKits>0?`Dont ${c.qtyFromKits} via kits. `:''} Commander {c.toOrder}.</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> 7 SKU peau — pas de stock Paris, préco lun/jeu 18h</span>
        <span className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/10 text-kurla-cream/60 flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5" /> Lots reçus = réel, pas cible</span>
        <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">MOQ 50 → 1er run 50–100 / réf</span>
        <a href="#batches" onClick={e=>{e.preventDefault(); document.querySelector('[data-tab=batches]')?.scrollIntoView();}} className="px-3 py-1.5 rounded-full bg-kurla-copper text-white font-bold flex items-center gap-1">Voir Lots → <ArrowRight className="w-3 h-3" /></a>
      </div>

      <p className="text-[10px] text-kurla-cream/35 text-center leading-relaxed">
        C18 — sources : <span className="text-kurla-amber">/api/admin/preorder-demand</span> (qtyFirm/qtyPending/qtyFromKits/qtyToSource) + <span className="text-kurla-amber">/api/admin/batches</span> (quantityReceived) + <span className="text-kurla-amber">peauKits.ts</span> (7 composants, 3 kits). Gap = max(0, demande − reçu) · À commander = max(50, gap). Aucune estimation affichée comme stock.
      </p>
    </div>
  );
};
