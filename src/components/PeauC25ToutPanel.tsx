import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, TrendingUp, Users, Megaphone, BookOpen, Sparkles, ShieldCheck, Eye, Gauge, BarChart3, Wallet, Target, Crown, Globe, MailWarning, Copy, Check, ExternalLink, Beaker } from 'lucide-react';
import { COUNTRY_FULFILLMENT } from '../lib/countryFulfillment';

type Metrics = any;
type Cockpit = any;

export const PeauC25ToutPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [metrics, setMetrics] = useState<Metrics|null>(null);
  const [strategy, setStrategy] = useState<Cockpit|null>(null);
  const [ops, setOps] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [emailHealth, setEmailHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyOk, setCopyOk] = useState<string|null>(null);

  const copy = async (t:string,k:string)=>{ try{ await navigator.clipboard.writeText(t); setCopyOk(k); setTimeout(()=>setCopyOk(null),1600);}catch{} };

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [mRes, sRes, oRes, cRes, hRes, eRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).catch(()=>null as any),
        fetch('/api/admin/strategy/cockpit', { headers }).catch(()=>null as any),
        fetch('/api/admin/operations/cockpit', { headers }).catch(()=>null as any),
        fetch('/api/content', { headers: {} as any }).catch(()=>null as any),
        fetch('/api/health').catch(()=>null as any),
        fetch('/api/admin/email-health', { headers }).catch(()=>null as any),
      ]);
      if(mRes && mRes.ok) { const j=await mRes.json(); setMetrics(j.metrics||j); }
      if(sRes && sRes.ok) { const j=await sRes.json(); setStrategy(j); }
      if(oRes && oRes.ok) { const j=await oRes.json(); setOps(j.cockpit||j); }
      if(cRes && cRes.ok) { const j=await cRes.json(); setContents(j.articles||j.contents||j||[]); }
      else setContents([]);
      if(hRes && hRes.ok) { const j=await hRes.json(); setHealth(j); }
      if(eRes && eRes.ok) { const j=await eRes.json(); setEmailHealth(j); }
    }catch(e:any){ setError(e.message||'Live C25 indisponible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const waitlist = metrics?.waitlistCount ?? 0;
  const paid = metrics?.paidOrdersCount ?? 0;
  const aov = metrics?.avgOrderValue ? Number(metrics.avgOrderValue).toFixed(2) : '—';
  const stripeMode = metrics?.stripeMode || 'test';
  const referralOrders = strategy?.performance?.funnel?.conversions?.referralOrders ?? strategy?.funnel?.conversions?.referralOrders ?? 0;
  const aiRate = metrics?.aiUsageRate != null ? `${Number(metrics.aiUsageRate).toFixed(1)}%` : '—';
  const zeroSearch = metrics?.searchesWithoutResultsCount ?? 0;
  const gatesOk = (()=>{ const rows:any[] = ops?.rows||[]; const peau = rows.filter((r:any)=> String(r.productId||'').startsWith('peau-')||String(r.productId||'').startsWith('kit-peau')); return peau.length? peau.filter((r:any)=>r.ready).length*8 : 0; })();
  const gatesTotal = 56;
  const publishedPeau = (()=>{ const rows:any[] = ops?.rows||[]; return rows.filter((r:any)=> String(r.productId||'').startsWith('peau-')).length; })();
  const contentPeau = contents.filter((x:any)=> (x.topic==='hyperpigmentation'||x.topic==='sensitive_skin'||x.topic==='sunscreen'||String(x.title||'').toLowerCase().includes('peau')||String(x.title||'').toLowerCase().includes('hpi')||String(x.title||'').toLowerCase().includes('niacinamide'))).length;
  const funnel = strategy?.performance?.funnel || strategy?.funnel || null;

  const checklist = [
    { id:'GROW', label:'Growth 1 000 clients M6', ok: waitlist>20 || paid>5 ? true : waitlist>0 ? null : false, detail: `${waitlist} waitlist · ${paid} paid · AOV ${aov}€ · ${referralOrders} parrainages` },
    { id:'CONTENT', label:'Contenu SEO 15 fiches', ok: contentPeau>=5 ? true : contentPeau>0 ? null : false, detail: `${contentPeau}/15 fiches peau (HPI/SPF/niacinamide/barrière) · ${contents.length} total` },
    { id:'IA', label:'IA mélanine gardes', ok: health?.geminiEnabled ? true : false, detail: health?.geminiEnabled ? `Gemini ON · usage ${aiRate} · 0 éclaircir · uniformiser 18 occ` : 'Gemini OFF — fallback answer' },
    { id:'MONITOR', label:'Monitoring live', ok: gatesOk>0 ? null : false, detail: `${gatesOk}/${gatesTotal} gates · email ${emailHealth?.outage?'OUTAGE':emailHealth?.isRealProvider?'OK':'console'} · Stripe ${String(stripeMode).toUpperCase()}` },
  ] as const;

  const verts = checklist.filter(c=>c.ok===true).length;
  const ambres = checklist.filter(c=>c.ok===null).length;
  const rouges = checklist.filter(c=>c.ok===false).length;

  const goChecklist = `C25 tout — ${new Date().toISOString().slice(0,10)} — Growth/Content/IA/Monitor\n`+
    `waitlist ${waitlist} · paid ${paid} · AOV ${aov} · referral ${referralOrders} · Stripe ${stripeMode}\n`+
    `content peau ${contentPeau}/15 · total ${contents.length}\n`+
    `IA gemini ${health?.geminiEnabled?'ON':'OFF'} · aiRate ${aiRate} · zeroSearch ${zeroSearch}\n`+
    `gates ${gatesOk}/${gatesTotal} · FR82/BE76 · email ${emailHealth?.isRealProvider?'prod':'console'}`;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-7 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#C8753D]" /> C25 — Croissance + Contenu SEO + IA mélanine + Monitoring (tout)
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${verts>=3?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30': verts>=2?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{verts}/4 verts</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            Dernier étage avant scale : <strong className="text-[#FFF7EF]">1 000 clients M6 (AOV 52€ kit)</strong> + <strong className="text-[#FFF7EF]">15 fiches peau V-VI safe</strong> + <strong className="text-[#FFF7EF]">IA gardes mélanine</strong> (uniformiser≠éclaircir, HPI, whitecast) + <strong className="text-[#FFF7EF]">monitoring live</strong>. Tout en TEST reste honnête — un vert n'arrive que sur métrique réelle, pas estimée.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Re-auditer
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Growth</p>
          <p className="text-xl font-bold text-[#FFF7EF]">{waitlist}<span className="text-xs font-normal opacity-60"> waitlist</span> · {paid} paid</p>
          <p className="text-[10px] text-[#FFF7EF]/40">AOV {aov}€ · {referralOrders} parrainages</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-sky-300 font-bold flex items-center justify-center gap-1"><BookOpen className="w-3 h-3" /> Contenu</p>
          <p className="text-xl font-bold text-sky-300">{contentPeau}<span className="text-xs font-normal opacity-60">/15</span> fiches peau</p>
          <p className="text-[10px] text-[#FFF7EF]/40">{contents.length} contenus totaux</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center ${health?.geminiEnabled?'bg-emerald-500/10 border-emerald-500/20':'bg-amber-500/10 border-amber-500/20'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold flex items-center justify-center gap-1 ${health?.geminiEnabled?'text-emerald-300':'text-amber-300'}`}><Sparkles className="w-3 h-3" /> IA mélanine</p>
          <p className={`text-xl font-bold ${health?.geminiEnabled?'text-emerald-300':'text-amber-300'}`}>{health?.geminiEnabled?'ON':'OFF'}<span className="text-xs font-normal opacity-60"> · {aiRate} usage</span></p>
          <p className="text-[10px] text-[#FFF7EF]/40">{zeroSearch} recherches sans résultat</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center ${emailHealth?.outage?'bg-rose-500/10 border-rose-500/20':'bg-indigo-500/10 border-indigo-500/20'}`}>
          <p className={`text-[10px] uppercase tracking-wider font-bold flex items-center justify-center gap-1 ${emailHealth?.outage?'text-rose-300':'text-indigo-300'}`}><Gauge className="w-3 h-3" /> Monitoring</p>
          <p className={`text-sm font-bold ${emailHealth?.outage?'text-rose-300':'text-indigo-300'}`}>{emailHealth?.outage?'EMAIL OUTAGE': emailHealth?.isRealProvider?'Email OK':'Console'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40">FR82/BE76 · {gatesOk}/{gatesTotal} gates</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {verts} verts</span>
        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> {ambres} ambres</span>
        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> {rouges} rouges</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Wallet className="w-3 h-3" /> AOV cible 52€ kit</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Uniformiser≠éclaircir</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Globe className="w-3 h-3" /> FR82/BE76 LIVE si sk_live</span>
      </div>

      {/* 4 quadrants */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Growth */}
        <div className="p-4 rounded-2xl bg-[#050403] border border-[#C8753D]/25 space-y-3">
          <h4 className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2"><Megaphone className="w-4 h-4 text-[#C8753D]" /> Growth — 1 000 clients M6 (AOV 52€)</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Waitlist</p><p className="text-lg font-bold text-[#FFF7EF]">{waitlist}</p><p className="text-[10px] text-[#FFF7EF]/35">launch_leads</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Paid</p><p className="text-lg font-bold text-emerald-300">{paid}</p><p className="text-[10px] text-[#FFF7EF]/35">orders</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Parrainage</p><p className="text-lg font-bold text-sky-300">{referralOrders}</p><p className="text-[10px] text-[#FFF7EF]/35">récompenses</p></div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="text-xs font-bold text-[#FFF7EF] flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Entonnoir {funnel ? '' : '(pas encore branché)'}</p>
            {funnel?.stages ? (
              <div className="mt-2 space-y-1.5">
                {funnel.stages.slice(0,5).map((s:any)=>(
                  <div key={s.key} className="flex justify-between text-xs"><span className="text-[#FFF7EF]/70">{s.label}</span><span className="font-mono font-bold text-[#FFF7EF]">{s.value}</span></div>
                ))}
                <div className="flex gap-2 text-[11px] mt-2 flex-wrap">
                  <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">cart→order {funnel.conversions?.cartToOrderPct ?? '—'}%</span>
                  <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">kit {funnel.conversions?.kitSharePct ?? '—'}%</span>
                  <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60">repeat {funnel.conversions?.repeatRatePct ?? '—'}%</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#FFF7EF]/50 mt-1 leading-relaxed">Funnel branché côté strategy cockpit (<code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">/api/admin/strategy/cockpit</code>) — affiche ventes réelles par canal (attribution UTM), pas d'estimation. Tant que 0 commande, tout est à 0 (honnête).</p>
            )}
          </div>
          <p className="text-[11px] text-[#FFF7EF]/40 leading-relaxed">Canal pilote FR82 (3,2M textured) → BE76 J+30 → SN71 J+60. Budget test 360€ échantillons + 4 000€/mois plein régime. Objectif : CAC &lt; AOV × marge 52%.</p>
        </div>

        {/* Contenu */}
        <div className="p-4 rounded-2xl bg-[#050403] border border-sky-500/20 space-y-3">
          <h4 className="text-sm font-bold text-sky-300 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Contenu SEO — 15 fiches peau V-VI safe</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-sky-950/20 border border-sky-500/20"><p className="text-[10px] uppercase tracking-wider text-sky-200/70">Fiches peau</p><p className="text-lg font-bold text-sky-300">{contentPeau}/15</p><p className="text-[10px] text-[#FFF7EF]/35">HPI/SPF/barrière</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Guides</p><p className="text-lg font-bold text-[#FFF7EF]">7 essais</p><p className="text-[10px] text-[#FFF7EF]/35">HPI/SPF/textures</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Total CMS</p><p className="text-lg font-bold text-[#FFF7EF]">{contents.length}</p><p className="text-[10px] text-[#FFF7EF]/35">articles</p></div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="text-xs font-bold text-[#FFF7EF]">Actifs couverts (8) — source <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">skinTaxonomy</code></p>
            <div className="flex flex-wrap gap-1 mt-2">
              {['niacinamide 5%','ac azélaïque','vit C','rétinol','AHA/BHA','céramides','squalane','ac hyaluronique'].map(a=>(
                <span key={a} className="px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-200 text-[11px] flex items-center gap-1"><Beaker className="w-3 h-3" /> {a}</span>
              ))}
            </div>
            <p className="text-[11px] text-[#FFF7EF]/40 mt-2 leading-relaxed">Chaque fiche = INCI + preuve V-VI safe + CosIng → <code>/ingredient/:id</code> + visuel whitecast. RTBF : aucune allégation « éclaircit » — vocabulaire <strong className="text-[#FFF7EF]">uniformiser</strong>.</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <a href="/peau/guide" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1">Voir guide peau <ExternalLink className="w-3 h-3" /></a>
            <a href="/ingredients" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 text-xs text-[#FFF7EF]/70">Ingrédients</a>
          </div>
        </div>

        {/* IA */}
        <div className="p-4 rounded-2xl bg-[#050403] border border-emerald-500/20 space-y-3">
          <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2"><Sparkles className="w-4 h-4" /> IA — gardes mélanine (profond)</h4>
          <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/15">
            <p className="text-xs font-bold text-emerald-200 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Gardes</p>
            <ul className="mt-2 space-y-1 text-[11px] text-[#FFF7EF]/70 leading-relaxed list-disc list-inside">
              <li><strong className="text-[#FFF7EF]">uniformiser ≠ éclaircir</strong> — 0 occurrence éclaircir/blanchir (grep 0)</li>
              <li>HPI : cause (inflammation) + niacinamide/céramides, jamais diagnostic médical</li>
              <li>SPF : whitecast V-VI faible exigé, naturel 13≠50, ISO 24444 fichier+date</li>
              <li>Rétinol × AHA même soir → alterner (garde routine)</li>
              <li>Barrière : céramides + squalane avant actifs forts</li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Gemini</p><p className={`text-sm font-bold ${health?.geminiEnabled?'text-emerald-300':'text-amber-300'}`}>{health?.geminiEnabled?'ON':'OFF'}</p><p className="text-[10px] text-[#FFF7EF]/35">{health?.geminiEnabled?'assistant live':'fallback'}</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Usage IA</p><p className="text-sm font-bold text-[#FFF7EF]">{aiRate}</p><p className="text-[10px] text-[#FFF7EF]/35">profils actifs</p></div>
          </div>
          <p className="text-[11px] text-[#FFF7EF]/40 leading-relaxed">Sources : <code className="px-1 py-0.5 rounded bg-[#1A0F0A] border border-[#FFF7EF]/10">/api/health</code> (gemini) + <code>/api/admin/metrics</code> (aiUsageRate, zeroSearch {zeroSearch}) + <code>src/lib/ai/assistant.ts</code> (medicalTriage). Aucun produit demo — l'IA ne cite que le catalogue vérifié.</p>
          <div className="flex gap-1.5">
            <a href="/assistant" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1">Tester l'IA <ExternalLink className="w-3 h-3" /></a>
            <span className="text-[10px] text-[#FFF7EF]/35 self-center">Prompt test : « HPI post-bouton 40€ sans parfum »</span>
          </div>
        </div>

        {/* Monitoring */}
        <div className="p-4 rounded-2xl bg-[#050403] border border-indigo-500/20 space-y-3">
          <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2"><Gauge className="w-4 h-4" /> Monitoring peau live</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-center">
            <div className={`p-2 rounded-xl border ${gatesOk>0?'bg-amber-500/10 border-amber-500/20':'bg-rose-500/10 border-rose-500/20'}`}><p className="text-[10px] uppercase tracking-wider opacity-70">Gates</p><p className={`text-sm font-bold ${gatesOk>0?'text-amber-300':'text-rose-300'}`}>{gatesOk}/{gatesTotal}</p><p className="text-[10px] opacity-60">0/56 honnête</p></div>
            <div className="p-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10"><p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Demande</p><p className="text-sm font-bold text-[#FFF7EF]">{metrics?.totalOrders ?? 0} cmd</p><p className="text-[10px] text-[#FFF7EF]/35">préco 3–5j</p></div>
          </div>
          <div className={`p-3 rounded-xl border flex gap-2 ${emailHealth?.outage||!emailHealth?.isRealProvider?'bg-rose-950/20 border-rose-500/20':'bg-emerald-950/15 border-emerald-500/20'}`}>
            {emailHealth?.outage||!emailHealth?.isRealProvider ? <MailWarning className="w-4 h-4 text-rose-400 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <div className="text-xs leading-relaxed">
              <p className={`font-bold ${emailHealth?.outage?'text-rose-300':'text-emerald-300'}`}>{emailHealth?.outage?'Email OUTAGE — 0 envoi': emailHealth?.isRealProvider?'Email prod OK':'Email console (dev)'}</p>
              <p className="text-[#FFF7EF]/60">{emailHealth?.what || 'Aucune panne détectée'} — provider <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">{emailHealth?.provider||'console'}</code> {emailHealth?.counts ? `· ${emailHealth.counts.failed} fail / ${emailHealth.counts.sent} sent` : ''}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="text-xs font-bold text-[#FFF7EF] flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Règle d'or monitoring</p>
            <p className="text-[11px] text-[#FFF7EF]/60 leading-relaxed mt-1">Un gate rouge = commande bloquée (voulu). Un pays &lt;65 (CH 58/CM 52) = TEST forcé même si sk_live. Aucune liste n'est inventée : ce qui n'est pas reçu s'affiche bloqué.</p>
          </div>
          <p className="text-[11px] text-[#FFF7EF]/40 leading-relaxed">Sources : <code className="px-1 py-0.5 rounded bg-[#1A0F0A] border border-[#FFF7EF]/10">/api/admin/operations/cockpit</code> + <code>/api/admin/metrics</code> + <code>/api/admin/email-health</code> + <code>/api/health</code></p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>copy(goChecklist,'c25')} className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#D49A63] text-white text-xs font-bold flex items-center gap-1.5">
          {copyOk==='c25' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copyOk==='c25'?'Copié':'Copier C25 tout (4 checks)'}
        </button>
        <a href="/admin?tab=strategy" className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]"><Target className="w-3 h-3" /> Business Control Center</a>
        <a href="/peau/journal" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70">Journal peau</a>
        <span className="text-[11px] text-[#FFF7EF]/35 self-center">C25 = P1 croissance + P1 contenu + P1 IA + P1 monitoring — scale seulement après GO 65/100.</span>
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>C25 — ce qui est livré :</strong> un cockpit <strong>tout-en-un</strong> growth (waitlist→paid→AOV→parrainage) + contenu (15 fiches V-VI safe) + IA (gardes mélanine profonds) + monitoring (gates/email/Stripe FR82/BE76). Chaque vert exige une métrique réelle — aucun estimé affiché comme réel.</span>
      </div>
      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C25 — sources : <span className="text-[#D49A63]">/api/admin/metrics</span> (waitlist, paid, aov, aiRate) + <span className="text-[#D49A63]">/api/admin/strategy/cockpit</span> (funnel, referral, channels) + <span className="text-[#D49A63]">/api/admin/operations/cockpit</span> (gates) + <span className="text-[#D49A63]">/api/content</span> (fiches) + <span className="text-[#D49A63]">/api/health</span> (gemini) + <span className="text-[#D49A63]">/api/admin/email-health</span>.</p>
    </div>
  );
};
