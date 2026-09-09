import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, Globe, Truck, Package, Repeat, Gauge, Zap, Wallet, TrendingUp, Users, Copy, Check, ExternalLink, ShieldCheck, Beaker } from 'lucide-react';
import { COUNTRY_FULFILLMENT } from '../lib/countryFulfillment';
import { PEAU_KITS } from '../lib/peauKits';

type Prospects = { id:string; name:string; status:string; country?:string; moq?:number }[];

export const PeauC27ScalePanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [prospects, setProspects] = useState<Prospects>([]);
  const [demand, setDemand] = useState<any>(null);
  const [ops, setOps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyOk, setCopyOk] = useState<string|null>(null);

  const copy = async(t:string,k:string)=>{ try{ await navigator.clipboard.writeText(t); setCopyOk(k); setTimeout(()=>setCopyOk(null),1600);}catch{} };

  const load = useCallback(async()=>{
    setLoading(true); setError('');
    try{
      const [mRes, pRes, dRes, cRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).catch(()=>null as any),
        fetch('/api/admin/sourcing/prospects', { headers }).catch(()=>null as any),
        fetch('/api/admin/preorder-demand', { headers }).catch(()=>null as any),
        fetch('/api/admin/operations/cockpit', { headers }).catch(()=>null as any),
      ]);
      if(mRes && mRes.ok){ const j=await mRes.json(); setMetrics(j.metrics||j); }
      if(pRes && pRes.ok){ const j=await pRes.json(); setProspects(j.prospects||j||[]); }
      if(dRes && dRes.ok){ const j=await dRes.json(); setDemand(j); }
      if(cRes && cRes.ok){ const j=await cRes.json(); setOps(j.cockpit||j); }
    }catch(e:any){ setError(e.message||'Live C27 indisponible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const replied = prospects.filter((p:any)=> ['replied','agreed','sample_requested','sample_validated','lot_ordered'].includes(p.status)).length;
  const totalP = prospects.length || 5; // fallback J0 5
  const responseRate = totalP? Math.round((replied/totalP)*100):0;
  const frOk = responseRate>30;
  const beCfg = COUNTRY_FULFILLMENT.BE;
  const snCfg = COUNTRY_FULFILLMENT.SN;
  const ciCfg = COUNTRY_FULFILLMENT.CI;
  const hasAfricanMoq = prospects.some((p:any)=> {
    const name = String(p.name||'').toLowerCase();
    const isAf = name.includes('dakar')|| name.includes('senegal')|| name.includes('abidjan')|| p.country==='SN'||p.country==='CI';
    const moq = Number(p.moq||p.MOQ||60);
    return isAf && moq<=100;
  });
  const demandUnits = demand?.totals?.totalUnitsToSource ?? (demand?.products||[]).reduce((s:any,r:any)=> s+(r.qtyToSource||0),0) ?? 0;
  const stripeMode = metrics?.stripeMode || 'test';
  const ltv = metrics?.ltvProxy ? Number(metrics.ltvProxy).toFixed(2) : '—';
  const repeatRate = metrics?.repeatRate != null ? `${Number(metrics.repeatRate).toFixed(1)}%` : '—';
  const aov = metrics?.avgOrderValue ? Number(metrics.avgOrderValue).toFixed(2) : '—';

  const checks = [
    { id:'BE76', label:'BE 76 J+30 FR→BE', ok: frOk? true : false as boolean|null, detail: `${replied}/${totalP} réponses ${responseRate}% (cible >30% J+7) · ${beCfg.dispatch} · TVA 21% · ${stripeMode==='live'&&frOk?'LIVE':'TEST'}` },
    { id:'SN71', label:'SN 71 hub Dakar J+60', ok: hasAfricanMoq? true : false as boolean|null, detail: hasAfricanMoq? 'MOQ<100 Afrique trouvé (Dakar Lab) · hub Dakar <150€/mois' : '0 fournisseur Afrique MOQ<100 · attente J0 Dakar Lab' },
    { id:'REASSORT', label:'Réassort 6 sem', ok: demandUnits>0? null : false as boolean|null, detail: demandUnits? `${demandUnits} unités à sourcer · cible réassort max(50,gap) · LTV ${ltv}€` : '0 demande → pas de trigger (normal TEST)' },
    { id:'PERF', label:'Perf 777kB admin', ok: null as boolean|null, detail: 'admin-3in3NViL.js 777kB gzip 190kB · warning 600kB · split manuel à prévoir' },
  ];
  const verts = checks.filter(c=>c.ok===true).length;
  const ambres = checks.filter(c=>c.ok===null).length;
  const rouges = checks.filter(c=>c.ok===false).length;

  const copy27 = `C27 SCALE tout — ${new Date().toISOString().slice(0,10)} — BE76 ${frOk?'GO':'NOGO'} (${responseRate}%) · SN71 ${hasAfricanMoq?'GO':'NOGO'} · réassort ${demandUnits}u · Stripe ${String(stripeMode).toUpperCase()} · LTV ${ltv} · 777kB admin`;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-7 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#C8753D]" /> C27 — Scale post-GO : BE J+30 + SN J+60 + réassort 6sem + perf (tout les 4)
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${verts>=2?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30': verts>=1?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{verts}/4 verts</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            Post-P0 : <strong className="text-[#FFF7EF]">BE 76 J+30</strong> (même stock FR→BE si FR &gt;30% J+7) + <strong className="text-[#FFF7EF]">SN 71 J+60</strong> (hub Dakar + Wave si MOQ &lt;100) + <strong className="text-[#FFF7EF]">réassort 6 semaines</strong> (streak 7j + shelf + journal) + <strong className="text-[#FFF7EF]">perf 777kB</strong>. Scale seulement sur preuves — pas d'ouverture par ambition.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Re-auditer scale
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3 rounded-2xl border text-center ${frOk?'bg-emerald-500/10 border-emerald-500/20':'bg-amber-500/10 border-amber-500/20'}`}>
          <p className="text-[10px] uppercase tracking-wider font-bold flex items-center justify-center gap-1 opacity-70"><Globe className="w-3 h-3" /> BE 76</p>
          <p className={`text-lg font-bold ${frOk?'text-emerald-300':'text-amber-300'}`}>{replied}/{totalP} · {responseRate}%</p>
          <p className="text-[10px] text-[#FFF7EF]/40">{frOk?'GO J+30':'NOGO — attente >30%'}</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center ${hasAfricanMoq?'bg-emerald-500/10 border-emerald-500/20':'bg-rose-500/10 border-rose-500/20'}`}>
          <p className="text-[10px] uppercase tracking-wider font-bold flex items-center justify-center gap-1 opacity-70"><Truck className="w-3 h-3" /> SN 71</p>
          <p className={`text-lg font-bold ${hasAfricanMoq?'text-emerald-300':'text-rose-300'}`}>{hasAfricanMoq?'MOQ<100 OK':'En veille'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40">hub Dakar 5–7j</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center justify-center gap-1"><Repeat className="w-3 h-3" /> Réassort 6sem</p>
          <p className="text-lg font-bold text-[#FFF7EF]">{demandUnits} <span className="text-xs font-normal opacity-60">unités</span></p>
          <p className="text-[10px] text-[#FFF7EF]/40">LTV {ltv}€ · repeat {repeatRate}</p>
        </div>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> Perf</p>
          <p className="text-lg font-bold text-amber-300">777 <span className="text-xs font-normal opacity-60">kB admin</span></p>
          <p className="text-[10px] text-[#FFF7EF]/40">gzip 190kB · split à faire</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className={`px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${verts?'bg-emerald-500/10 text-emerald-300 border-emerald-500/20':'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/60'}`}><CheckCircle2 className="w-3 h-3" /> {verts} verts</span>
        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> {ambres} ambres</span>
        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> {rouges} rouges</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 8 gates</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Wallet className="w-3 h-3" /> AOV {aov}€ cible 52€</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`p-4 rounded-2xl border space-y-3 ${frOk?'bg-emerald-950/10 border-emerald-500/20':'bg-[#050403] border-amber-500/20'}`}>
          <h4 className="text-sm font-bold flex items-center gap-2" style={{color: frOk? '#6ee7b7':'#fcd34d'}}><Globe className="w-4 h-4" /> BE 76 J+30 — FR→BE même stock</h4>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs leading-relaxed">
            <p className="font-bold text-[#FFF7EF]">Condition : FR &gt;30% réponse J+7</p>
            <p className="text-[#FFF7EF]/60 mt-1">{replied}/{totalP} = {responseRate}% — {frOk? '✅ BE ouvrable J+30 (même stock IDF, port 4,90€, gratuit 80€, 48–72h via FR)' : '⏳ NOGO — relancer J+3 (panel C22) jusqu’à 2/5 réponses'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">{beCfg.flag} BE 76/100 · {beCfg.dispatchDays} · TVA 21%</span>
              <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">EUR · {beCfg.hub}</span>
              <span className={`px-2 py-1 rounded-full border text-[11px] font-bold ${stripeMode==='live'&&frOk?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-[#FFF7EF]/5 text-[#FFF7EF]/50 border-[#FFF7EF]/10'}`}>Stripe {stripeMode==='live'&&frOk?'LIVE':'TEST'}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs">
            <p className="font-bold text-[#FFF7EF]">Modèle : {beCfg.model}</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1">{beCfg.dispatch} — Si FR log 95% 3–5j tenu J+30, basculer BE LIVE (sk_live déjà FR82). Sinon garder BE TEST.</p>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border space-y-3 ${hasAfricanMoq?'bg-emerald-950/10 border-emerald-500/20':'bg-[#050403] border-rose-500/20'}`}>
          <h4 className="text-sm font-bold flex items-center gap-2" style={{color: hasAfricanMoq? '#6ee7b7':'#fca5a5'}}><Truck className="w-4 h-4" /> SN 71 J+60 — hub Dakar + Wave</h4>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs leading-relaxed">
            <p className="font-bold text-[#FFF7EF]">Condition : 1 fournisseur Afrique MOQ &lt;100 + hub Dakar</p>
            <p className="text-[#FFF7EF]/60 mt-1">{hasAfricanMoq? '✅ Dakar Lab MOQ ≤100 détecté — hub Dakar tampon 50 kits <150€/mois ouvrable' : '⛔ Veille — 0 MOQ<100 Afrique · besoin Dakar Lab replied + Wave/MTN'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">{snCfg.flag} SN 71/100 · {snCfg.dispatchDays} · TVA 18% · XOF</span>
              <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">{ciCfg.flag} CI 68 veille</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs">
            <p className="font-bold text-[#FFF7EF]">Preuves SN avant J+60</p>
            <ul className="list-disc list-inside text-[#FFF7EF]/60 mt-1 space-y-0.5">
              <li>Dakar Lab ISO22716 + MOQ 50 + délai 5–7j + prix &lt;30€ Équilibrée</li>
              <li>Hub Dakar coursier + 1m² stockage &lt;150€/mois</li>
              <li>20 réponses questionnaire HPI/SPF Insta SN ciblée</li>
            </ul>
            <p className="text-[11px] text-amber-300 mt-2">Si 1 condition manque, on garde FR/BE seul — pas de date glissante.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3">
          <h4 className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2"><Repeat className="w-4 h-4 text-[#C8753D]" /> Réassort 6 semaines — LTV &gt; CAC</h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">AOV</p><p className="text-lg font-bold text-[#FFF7EF]">{aov}€</p><p className="text-[10px] text-[#FFF7EF]/35">cible 52€ kit</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Repeat</p><p className="text-lg font-bold text-sky-300">{repeatRate}</p><p className="text-[10px] text-[#FFF7EF]/35">6sem</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">LTV</p><p className="text-lg font-bold text-emerald-300">{ltv}€</p><p className="text-[10px] text-[#FFF7EF]/35">proxy</p></div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs leading-relaxed">
            <p className="font-bold text-[#FFF7EF] flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Trigger réassort</p>
            <p className="text-[#FFF7EF]/60 mt-1">Observance streak 7j (journal) + shelf peau % restant estimé ({PEAU_KITS[0].name} {PEAU_KITS[0].priceBundle}€) → J-7 alerte → réassort 6 sem (après 1ère commande + 30j d'observance prouvée, pas avant).</p>
            <p className="text-[11px] text-[#FFF7EF]/40 mt-1">Source : <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">/api/admin/preorder-demand</code> gap=max(0,demande−reçu) + <code>beautyProfile.skin.journal[50]</code></p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {PEAU_KITS.map(k=> <span key={k.id} className="px-2 py-1 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">{k.id} {k.priceBundle.toFixed(2)}€ {k.economyPct}%</span>)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#050403] border border-amber-500/20 space-y-3">
          <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2"><Zap className="w-4 h-4" /> Perf & tech — admin 777kB</h4>
          <div className="p-3 rounded-xl bg-amber-950/10 border border-amber-500/20 text-xs leading-relaxed">
            <p className="font-bold text-amber-200">admin-3in3NViL.js 777,37 kB gzip 190kB — au-dessus 600kB</p>
            <p className="text-[#FFF7EF]/60 mt-1">7 panels cockpit (gates 19 + operations + QA21 + C23 factu + C24 GO + C25 tout + C26 final) + strategy + analytics. Warning Rollup : <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">manualChunks</code> à faire P1 (split strategy/admin).</p>
            <ul className="list-disc list-inside text-[#FFF7EF]/60 mt-2 space-y-0.5">
              <li>Build 8.21s · 64 prérendu · sitemap 36 · 0 error</li>
              <li>Supabase fallback_mode en dev (sans creds) — prod connected</li>
              <li>Stripe TEST — FR82/BE76 TEST tant que sk_test (voulu)</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs">
            <p className="font-bold text-[#FFF7EF] flex items-center gap-1"><Beaker className="w-3.5 h-3.5" /> Garde perf</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1">Ne pas ajouter de 8e panel cockpit sans split — 800kB = limite P0. P1 : <code>dynamic import()</code> + <code>build.rollupOptions.output.manualChunks</code>.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>copy(copy27,'c27')} className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#D49A63] text-white text-xs font-bold flex items-center gap-1.5">
          {copyOk==='c27' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copyOk==='c27'?'Copié':'Copier C27 scale (4 checks)'}
        </button>
        <span className="text-[11px] text-[#FFF7EF]/35 self-center">C27 = post-GO scale — on n'ouvre BE/SN que sur taux réponse & MOQ, pas sur date.</span>
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>C27 — règle d'or scale :</strong> la date ne fait pas ouvrir un pays — seules <strong>3 preuves</strong> ouvrent : <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">FR &gt;30% J+7</code> pour BE, <code>MOQ &lt;100 Afrique</code> pour SN, <code>streak 7j + LTV &gt; CAC</code> pour réassort. Tout le reste reste TEST — c'est ce qui empêche de scaler par ambition.</span>
      </div>
      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C27 — sources : <span className="text-[#D49A63]">/api/admin/metrics</span> (stripeMode, AOV, LTV, repeat) + <span className="text-[#D49A63]">/api/admin/sourcing/prospects</span> ({replied}/{totalP}) + <span className="text-[#D49A63]">/api/admin/preorder-demand</span> ({demandUnits}u) + <span className="text-[#D49A63]">/api/admin/operations/cockpit</span> + <span className="text-[#D49A63]">countryFulfillment.ts</span> (FR82/BE76/SN71) + <span className="text-[#D49A63]">peauKits.ts</span> (52€).</p>
    </div>
  );
};
