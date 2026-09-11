import React, { useCallback, useEffect, useState } from 'react';
import { Boxes, Calculator, PackageCheck, AlertTriangle, RefreshCw, TrendingUp, ShieldCheck, Truck } from 'lucide-react';
import { PEAU_KITS } from '../lib/peauKits';

type Batch = { id: string; lotReference: string; productId: string; servedCostCents: number | null; quantityReceived: number; supplierId?: string };
type Product = { id: string; name: string; category: string; price: number };
type DoubleRow = { productId: string; hasSecondSource: boolean | null };

const CIBLES_HT: Record<string, { cibleHT: number; marge: string }> = {
  'KPEAU-01': { cibleHT: 22, marge: '55%' },
  'KPEAU-02': { cibleHT: 30, marge: '52%' },
  'KPEAU-03': { cibleHT: 40, marge: '53%' },
};

export const PeauKitsCoutServiPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [doubleRows, setDoubleRows] = useState<DoubleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [bRes, pRes, dRes] = await Promise.all([
        fetch('/api/admin/batches', { headers }),
        fetch('/api/admin/catalog/products', { headers }),
        fetch('/api/admin/double-sourcing', { headers }),
      ]);
      const b = await bRes.json(); const p = await pRes.json(); const d = await dRes.json();
      if (!bRes.ok) throw new Error(b.error || 'Lots indisponibles');
      // catalog & double sourcing are best-effort — panel remains useful without them
      setBatches((b.batches || []) as Batch[]);
      if (pRes.ok) setProducts((p.products || []).map((x:any)=>({ id:x.id, name:x.name, category:x.category, price:Number(x.price||0) })));
      if (dRes.ok && d.report?.rows) setDoubleRows((d.report.rows as any[]).map(r=>({ productId:r.productId, hasSecondSource:r.hasSecondSource })));
    } catch (e:any) { setError(e.message || 'Chargement impossible'); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const batchFor = (pid: string) => batches.filter(b=>b.productId===pid);
  const servedFor = (pid: string) => {
    const lbs = batchFor(pid);
    if (!lbs.length) return null;
    // moyenne pondérée si plusieurs lots
    const totalCost = lbs.reduce((s,b)=> s + (b.servedCostCents||0) * b.quantityReceived, 0);
    const totalQty = lbs.reduce((s,b)=> s + b.quantityReceived, 0);
    return totalQty ? Math.round(totalCost/totalQty) : lbs[0]?.servedCostCents ?? null;
  };

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Calculator className="w-5 h-5 text-kurla-copper" /> C17 — Kits peau : coût servi vs prix public
            <span className="px-2 py-0.5 rounded-full bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-amber text-[10px] font-bold">lot → kit → commande</span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            Chaque kit est un <strong className="text-kurla-cream">assemblage</strong> : son coût servi = somme des coûts servis de ses composants (lots reçus). Tant qu’aucun lot peau n’est réceptionné, seules les <strong className="text-kurla-amber">cibles HT 22 / 30 / 40€</strong> s’affichent — la marge réelle se calcule sur du réel, jamais sur une estimation.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        {PEAU_KITS.map(kit=>{
          const cible = CIBLES_HT[kit.id];
          const components = kit.products;
          // coûts servis par composant
          const compCosts = components.map(c=> servedFor(c.id));
          const allKnown = compCosts.every(v=>v!==null);
          const sumCost = allKnown ? (compCosts as number[]).reduce((s,v)=>s+v,0) : null;
          const prixTTC = kit.priceBundle;
          const marge = sumCost!==null ? ((prixTTC*100 - sumCost)/ (prixTTC*100))*100 : null;
          const doubleRisk = components.map(c=> doubleRows.find(r=>r.productId===c.id)?.hasSecondSource).some(v=>v===false);
          const anyNoLot = components.some(c=> batchFor(c.id).length===0);

          return (
            <div key={kit.id} className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 p-4 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-kurla-amber">{kit.id} · {kit.tier}</p>
                  <h4 className="text-sm font-bold text-kurla-cream leading-tight">{kit.name}</h4>
                  <p className="text-[11px] text-kurla-cream/55">{kit.tagline} · {kit.products.length} soins</p>
                </div>
                <span className={`px-2 py-1 rounded-full border text-xs font-bold ${kit.id==='KPEAU-02'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-kurla-cream/5 text-kurla-cream/70 border-kurla-cream/10'}`}>{kit.priceBundle.toFixed(2)}€</span>
              </div>

              <div className="space-y-1.5">
                {components.map(c=>{
                  const cost = servedFor(c.id);
                  const lots = batchFor(c.id);
                  return (
                    <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                      <span className="text-kurla-cream/80 leading-tight flex-1">{c.name}<span className="text-kurla-cream/40"> · {c.role}</span></span>
                      <span className="text-[10px] font-mono shrink-0">
                        {cost!==null ? <span className="text-emerald-300">{(cost/100).toFixed(2)}€ {lots.length>1&&`· ${lots.length} lots`}</span>
                        : <span className="text-kurla-cream/40">aucun lot</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto space-y-2 pt-3 border-t border-kurla-cream/10">
                <div className="flex justify-between text-xs">
                  <span className="text-kurla-cream/60">Prix public</span><span className="font-bold text-kurla-cream">{prixTTC.toFixed(2)}€ <span className="font-normal text-kurla-cream/40">éco {kit.economy.toFixed(2)}€ −{kit.economyPct}%</span></span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-kurla-cream/60 flex items-center gap-1"><Boxes className="w-3 h-3" /> Coût servi kit</span>
                  {sumCost!==null
                    ? <span className="font-mono font-bold text-emerald-300">{(sumCost/100).toFixed(2)}€</span>
                    : <span className="text-amber-300 text-[11px]">— cibles HT &lt;{cible.cibleHT}€ ({cible.marge})</span>}
                </div>
                {marge!==null && <div className="flex justify-between text-xs"><span className="text-kurla-cream/60 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Marge réelle</span><span className={`font-bold ${marge>=52?'text-emerald-300':marge>=40?'text-amber-300':'text-rose-300'}`}>{marge.toFixed(0)}%</span></div>}
                {anyNoLot && <p className="text-[10px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded-xl p-2 leading-relaxed"><strong>Aucun lot peau</strong> : le coût servi ne s’affiche pas — c’est voulu. Saisissez un lot par composant (quantité + coût unitaire + fret + douane) pour voir la marge réelle. Cible à tenir : <strong>&lt;{cible.cibleHT}€ HT</strong>.</p>}
                {doubleRisk && <p className="text-[10px] text-amber-300 flex items-center gap-1"><Truck className="w-3 h-3" /> Risque mono-source : au moins 1 composant sans second fournisseur qualifié.</p>}
                {!anyNoLot && !doubleRisk && sumCost!==null && <p className="text-[10px] text-emerald-300/80 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Double sourcing OK · coût servi calculé sur lots réels.</p>}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-1 rounded-full bg-kurla-espresso border border-kurla-cream/10 text-[10px] text-kurla-cream/50">{kit.routine}</span>
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">Livraison {kit.id==='KPEAU-01'?'4,90€':'gratuite'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <PackageCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>Traçabilité :</strong> un <code className="px-1 py-0.5 rounded bg-kurla-ink border border-kurla-cream/10 font-mono text-[11px]">lot X</code> alloué à une ligne de commande = réponse à « quelles commandes contiennent le lot X » en 1 requête (<code>batch_order_trace</code>). Les kits ne sont jamais alloués tels quels : ce sont leurs composants qui portent les lots — la traçabilité reste unitaire.</span>
      </div>

      <p className="text-[10px] text-kurla-cream/35 text-center leading-relaxed">C17 — source prix : <span className="text-kurla-amber">peauKits.ts</span> (49,70/62/84,90€, économies 2,90/9,40/14,90€) + <span className="text-kurla-amber">cahier_des_charges_peau.md</span> (cibles &lt;22/30/40€ HT) + lots réels <span className="text-kurla-amber">/api/admin/batches</span> + double sourcing. Aucune valeur estimée affichée comme réelle.</p>
    </div>
  );
};
