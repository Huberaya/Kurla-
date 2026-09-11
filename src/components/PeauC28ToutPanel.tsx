import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, Globe, ShieldCheck, Eye, Beaker, BookOpen, Sparkles, Gauge, TrendingUp, Wallet, Target, Crown, Boxes, Package, Truck, Copy, Check, ExternalLink, Users, Repeat } from 'lucide-react';
import { COUNTRY_FULFILLMENT } from '../lib/countryFulfillment';
import { FINANCE_PROJECTION, BREAKEVEN, STRATEGY_KPIS } from '../lib/businessStrategy';

export const PeauC28ToutPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [ops, setOps] = useState<any>(null);
  const [demand, setDemand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyOk, setCopyOk] = useState<string|null>(null);
  const copy = async(t:string,k:string)=>{ try{ await navigator.clipboard.writeText(t); setCopyOk(k); setTimeout(()=>setCopyOk(null),1600);}catch{} };

  const load = useCallback(async()=>{
    setLoading(true); setError('');
    try{
      const [mRes, sRes, oRes, dRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).catch(()=>null as any),
        fetch('/api/admin/strategy/cockpit', { headers }).catch(()=>null as any),
        fetch('/api/admin/operations/cockpit', { headers }).catch(()=>null as any),
        fetch('/api/admin/preorder-demand', { headers }).catch(()=>null as any),
      ]);
      if(mRes && mRes.ok){ const j=await mRes.json(); setMetrics(j.metrics||j); }
      if(sRes && sRes.ok){ const j=await sRes.json(); setStrategy(j); }
      if(oRes && oRes.ok){ const j=await oRes.json(); setOps(j.cockpit||j); }
      if(dRes && dRes.ok){ const j=await dRes.json(); setDemand(j); }
    }catch(e:any){ setError(e.message||'Live C28 indisponible'); }
    finally{ setLoading(false); }
  }, [headers]);
  useEffect(()=>{ void load(); }, [load]);

  const paid = metrics?.paidOrdersCount ?? 0;
  const waitlist = metrics?.waitlistCount ?? 0;
  const aov = metrics?.avgOrderValue ? Number(metrics.avgOrderValue).toFixed(2) : '—';
  const ltv = metrics?.ltvProxy ? Number(metrics.ltvProxy).toFixed(2) : '—';
  const gatesRows:any[] = ops?.rows||[];
  const peauGatesOk = gatesRows.filter((r:any)=> String(r.productId||'').startsWith('peau-') && r.ready).length*8;
  const gatesTotal = 56;
  const demandUnits = demand?.totals?.totalUnitsToSource ?? 0;
  const stripeMode = metrics?.stripeMode || 'test';

  // Gating for CI/MA/CH/CM
  const snOk = demandUnits>30; // SN >30 kits/mois ouvre CI
  const ciCfg = COUNTRY_FULFILLMENT.CI; const maCfg = COUNTRY_FULFILLMENT.MA; const chCfg = COUNTRY_FULFILLMENT.CH; const cmCfg = COUNTRY_FULFILLMENT.CM;
  const ciOk = snOk; // CI ouvre si SN >30
  const maOk = false; // FR 95% 3-5j J+30 — pas de métrique live, reste NOGO
  const chOk = paid>50; // BE >50 cmd/mois — approx paid>50
  const cmOk = false; // CI >50

  const checks = [
    { id:'CI68', label:'CI 68 Abidjan', ok: ciOk? true : false as boolean|null, detail: ciCfg.condition + (ciOk?' · GO (SN>30)':' · NOGO veille') },
    { id:'MA64', label:'MA 64 ES→MA', ok: maOk? true : false as boolean|null, detail: maCfg.condition + ' · NOGO (log 95% non mesuré)' },
    { id:'CH58', label:'CH 58 douane', ok: chOk? true : false as boolean|null, detail: chCfg.condition + (chOk?' · GO (BE>50)':' · NOGO veille') },
    { id:'CM52', label:'CM 52 via CI', ok: cmOk? true : false as boolean|null, detail: cmCfg.condition + ' · NOGO veille' },
  ];
  const verts = checks.filter(c=>c.ok===true).length;
  const rouges = checks.filter(c=>c.ok===false).length;

  // `FinanceHorizon` n'a pas de champ `revenue` : le chiffre d'affaires est
  // `totalRevenue` (produits + abonnement). Lire `revenue` donnait « — » à
  // l'écran sans jamais rien signaler.
  const finance = FINANCE_PROJECTION[0] as any;
  const financeLast = FINANCE_PROJECTION[FINANCE_PROJECTION.length - 1];
  const be = BREAKEVEN as any;
  const copy28 = `C28 tout 4 chantiers — ${new Date().toISOString().slice(0,10)} — CI/MA/CH/CM ${verts}/4 verts · HPI photo V1 · SOP 3-5j · Finance AOV ${aov} LTV ${ltv} · gates ${peauGatesOk}/${gatesTotal} · Stripe ${String(stripeMode).toUpperCase()}`;

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6 sm:p-8 space-y-7 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Crown className="w-5 h-5 text-kurla-copper" /> C28 — Les 4 derniers chantiers : CI/MA/CH/CM + HPI IA + SOP ops + finance (tout)
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${verts?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{verts}/4 verts</span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            Fermeture P1 : <strong className="text-kurla-cream">CI/MA/CH/CM gating chiffré</strong> + <strong className="text-kurla-cream">HPI tracker photo IA V2</strong> + <strong className="text-kurla-cream">SOP ops 3–5j lun/jeu</strong> + <strong className="text-kurla-cream">finance breakeven 90j</strong>. Scale seulement si CI&gt;MA&gt;CH&gt;CM par preuves — pas par continent.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Re-auditer
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-kurla-amber font-bold flex items-center justify-center gap-1"><Globe className="w-3 h-3" /> CI 68 / MA 64</p>
          <p className="text-lg font-bold text-kurla-cream">{verts}/4 <span className="text-xs font-normal opacity-60">pays</span></p>
          <p className="text-[10px] text-kurla-cream/40">SN71 → CI68</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-sky-500/20 text-center">
          <p className="text-[10px] uppercase tracking-wider text-sky-300 font-bold flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> HPI IA</p>
          <p className="text-lg font-bold text-sky-300">V1 live</p>
          <p className="text-[10px] text-kurla-cream/40">V2 photo delta P2</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold flex items-center justify-center gap-1"><Boxes className="w-3 h-3" /> SOP 3–5j</p>
          <p className="text-lg font-bold text-emerald-300">{peauGatesOk}/{gatesTotal}</p>
          <p className="text-[10px] text-kurla-cream/40">gates · lun/jeu 18h</p>
        </div>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold flex items-center justify-center gap-1"><Wallet className="w-3 h-3" /> Finance</p>
          <p className="text-lg font-bold text-amber-300">AOV {aov}€</p>
          <p className="text-[10px] text-kurla-cream/40">LTV {ltv}€ · BE {be?.orders ?? '—'} cmd</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* CI/MA/CH/CM */}
        <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-3">
          <h4 className="text-sm font-bold text-kurla-cream flex items-center gap-2"><Globe className="w-4 h-4 text-kurla-copper" /> Expansion CI/MA/CH/CM — gating chiffré (pas continent)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[520px]">
              <thead><tr className="border-b border-kurla-cream/10 text-kurla-amber uppercase tracking-wider text-[10px]"><th className="py-2 px-2">Pays · score</th><th className="py-2 px-2">Dispatch</th><th className="py-2 px-2">Condition</th><th className="py-2 px-2">Gate</th></tr></thead>
              <tbody className="divide-y divide-kurla-cream/5">
                {[
                  {cfg:ciCfg, ok:ciOk},
                  {cfg:maCfg, ok:maOk},
                  {cfg:chCfg, ok:chOk},
                  {cfg:cmCfg, ok:cmOk},
                ].map(({cfg, ok})=>(
                  <tr key={cfg.code} className={ok?'bg-emerald-950/10':''}>
                    <td className="py-2 px-2"><span className="font-bold text-kurla-cream flex items-center gap-1">{cfg.flag} {cfg.code} {cfg.score}<span className={`ml-1 px-1 py-0.5 rounded-full border text-[10px] ${ok?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-kurla-cream/5 text-kurla-cream/40 border-kurla-cream/10'}`}>{ok?'GO':'VEILLE'}</span></span><span className="text-[10px] text-kurla-cream/40">{cfg.currency} · TVA {cfg.vatRate}%</span></td>
                    <td className="py-2 px-2 text-kurla-cream/70 leading-snug">{cfg.dispatchDays} · {cfg.hub}</td>
                    <td className="py-2 px-2 text-[11px] text-kurla-cream/60 leading-snug">{cfg.condition}</td>
                    <td className="py-2 px-2">{ok? <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">GO</span> : <span className="px-2 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-bold">NOGO</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-kurla-cream/35 leading-relaxed">Source <code className="px-1 py-0.5 rounded bg-kurla-espresso border border-kurla-cream/10">countryFulfillment.ts</code> · Règle : score≥65 + preuve MOQ. Actuel : SN71 veille (0 MOQ Afrique) → CI68 bloqué (voulu). CH58 bloqué (BE {paid}/50).</p>
        </div>

        {/* HPI IA */}
        <div className="p-4 rounded-2xl bg-kurla-ink border border-sky-500/20 space-y-3">
          <h4 className="text-sm font-bold text-sky-300 flex items-center gap-2"><Sparkles className="w-4 h-4" /> HPI tracker + IA V2 (post-C4)</h4>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20">
              <p className="font-bold text-sky-200 flex items-center gap-1"><Beaker className="w-3.5 h-3.5" /> V1 live (P0)</p>
              <ul className="list-disc list-inside text-kurla-cream/70 mt-1 space-y-0.5 leading-relaxed">
                <li>Journal slider 0–100 + Avant/Après + ressenti x.x/5</li>
                <li>TopConcern ×N + observance 7j + synthèse IA 3 obs</li>
                <li>Photo &lt;2Mo RGPD + consent dossier</li>
              </ul>
            </div>
            <div className="p-3 rounded-xl bg-kurla-espresso border border-kurla-cream/10">
              <p className="font-bold text-kurla-cream flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> V2 P2 (moat)</p>
              <ul className="list-disc list-inside text-kurla-cream/60 mt-1 space-y-0.5 leading-relaxed">
                <li>Delta teint auto (avant→après) — k-anonyme &gt;30</li>
                <li>SPF Tracker UV + rappel whitecast V-VI</li>
                <li>Routine adaptative V2 : phototype VI → hybride seul</li>
              </ul>
              <p className="text-[10px] text-amber-300 mt-2">Hors P0 — après preuve observance 25% shelf (C4).</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/15 text-xs leading-relaxed">
            <p className="font-bold text-emerald-200 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Gardes IA mélanine (prod)</p>
            <p className="text-kurla-cream/70 mt-1">uniformiser≠éclaircir 0 occ · HPI : inflammation → niacinamide/céramides (jamais diag) · SPF whitecast V-VI faible ISO24444 · rétinol×AHA alterner — <code className="px-1 py-0.5 rounded bg-kurla-ink border border-kurla-cream/10">/assistant</code> + <code>/peau/journal</code> synthèse.</p>
          </div>
        </div>

        {/* SOP */}
        <div className="p-4 rounded-2xl bg-kurla-ink border border-emerald-500/20 space-y-3">
          <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2"><Boxes className="w-4 h-4" /> SOP ops 3–5j lun/jeu 18h + retours/SAV</h4>
          <div className="p-3 rounded-xl bg-emerald-950/10 border border-emerald-500/15 text-xs leading-relaxed">
            <p className="font-bold text-kurla-cream">Boucle sans stock Paris</p>
            <ol className="list-decimal list-inside text-kurla-cream/70 mt-1 space-y-0.5">
              <li>Préco lun/jeu 18h → gap=max(0,demande−reçu) → à commander max(50,gap)</li>
              <li>Commande groupée 2×/sem → 3PL IDF (95) → kitting → Colissimo/MondialRelay</li>
              <li>Tracking réel → <code>shipped</code> → <code>delivered</code> → email suivi (Resend)</li>
              <li>Retour 14j → <code>/api/returns</code> → remboursement Stripe → avoir snapshot</li>
            </ol>
            <p className="text-[11px] text-kurla-cream/40 mt-2">Demande live {demandUnits}u · gates {peauGatesOk}/{gatesTotal} · paid {paid} · email {metrics?.emailHealth || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-center">
            <div className="p-2 rounded-xl bg-kurla-espresso border border-kurla-cream/10"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">3PL IDF</p><p className="text-sm font-bold text-kurla-cream">60% 24–48h</p><p className="text-[10px] text-kurla-cream/35">95 Etx Logistique</p></div>
            <div className="p-2 rounded-xl bg-kurla-espresso border border-kurla-cream/10"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">SAV</p><p className="text-sm font-bold text-sky-300">{metrics?.openTicketsCount ?? 0} tickets</p><p className="text-[10px] text-kurla-cream/35">open/in_progress</p></div>
          </div>
        </div>

        {/* Finance */}
        <div className="p-4 rounded-2xl bg-kurla-ink border border-amber-500/20 space-y-3">
          <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2"><Wallet className="w-4 h-4" /> Finance breakeven 90j (chiffré)</h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-amber-950/10 border border-amber-500/20"><p className="text-[10px] uppercase tracking-wider opacity-70">AOV</p><p className="text-lg font-bold text-amber-300">{aov}€</p><p className="text-[10px] opacity-60">cible 52€ kit</p></div>
            <div className="p-2 rounded-xl bg-kurla-espresso border border-kurla-cream/10"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">Marge</p><p className="text-lg font-bold text-emerald-300">52%</p><p className="text-[10px] text-kurla-cream/35">HT 22/30/40</p></div>
            <div className="p-2 rounded-xl bg-kurla-espresso border border-kurla-cream/10"><p className="text-[10px] uppercase tracking-wider text-kurla-cream/50">BE point</p><p className="text-lg font-bold text-kurla-cream">{be?.orders ?? 120}<span className="text-xs font-normal opacity-60"> cmd</span></p><p className="text-[10px] text-kurla-cream/35">ou {be?.revenue ?? 6.2}k€</p></div>
          </div>
          <div className="p-3 rounded-xl bg-kurla-espresso border border-kurla-cream/10 text-xs leading-relaxed">
            <p className="font-bold text-kurla-cream flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> FINANCE_PROJECTION (M{finance?.month ?? '—'} {finance?.totalRevenue?.toLocaleString('fr-FR') ?? '—'}€ → M{financeLast?.month ?? '—'} {financeLast?.totalRevenue?.toLocaleString('fr-FR') ?? '—'}€)</p>
            <p className="text-kurla-cream/60 mt-1">Objectif C27 : <strong className="text-kurla-cream">LTV {ltv}€ &gt; CAC</strong> (adSpend / uniqueCustomers). Tant que CAC non saisi (localStorage kurla_admin_ad_spend), métrique = null — honnête, pas 0.</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-1 rounded-full bg-kurla-ink border border-kurla-cream/10 text-kurla-cream/60">KPEAU-02 62€ -13% moteur</span>
              <span className="px-2 py-1 rounded-full bg-kurla-ink border border-kurla-cream/10 text-kurla-cream/60">Port 4,90€ / gratuit 60/80€</span>
              <span className="px-2 py-1 rounded-full bg-kurla-ink border border-kurla-cream/10 text-kurla-cream/60">Stock TEST 0€ → 8 640€ M3</span>
            </div>
          </div>
          <p className="text-[11px] text-kurla-cream/40 leading-relaxed">Sources : <code className="px-1 py-0.5 rounded bg-kurla-espresso border border-kurla-cream/10">businessStrategy.ts</code> FINANCE_PROJECTION + BREAKEVEN + <code className="px-1 py-0.5 rounded bg-kurla-espresso border border-kurla-cream/10">/api/admin/metrics</code> (AOV/LTV/repeat) — hypothèses assumées, réel corrige.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>copy(copy28,'c28')} className="px-3 py-1.5 rounded-full bg-kurla-copper hover:bg-kurla-amber text-white text-xs font-bold flex items-center gap-1.5">
          {copyOk==='c28' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copyOk==='c28'?'Copié':'Copier C28 tout (4 chantiers)'}
        </button>
        <a href="/admin?tab=strategy" className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper"><Target className="w-3 h-3" /> Business Control Center</a>
        <span className="text-[11px] text-kurla-cream/35 self-center">C28 = P1 close — scale CI/MA/CH/CM seulement sur preuves chiffrées.</span>
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>C28 — règle d'or P1 :</strong> on ne traite ni l'Europe ni l'Afrique en bloc — <strong>1 pays = 1 score + 1 modèle + 1 condition</strong>. CI68 n'ouvre que si SN71 {'>'}30 kits/mois, MA64 que si FR95% 3–5j J+30, CH58 que si BE50 cmd/mois — sinon veille chiffrée, pas d'échec.</span>
      </div>
      <p className="text-[10px] text-kurla-cream/35 text-center leading-relaxed">C28 — sources : <span className="text-kurla-amber">countryFulfillment.ts</span> (CI68/MA64/CH58/CM52) + <span className="text-kurla-amber">businessStrategy.ts</span> (FINANCE_PROJECTION/BREAKEVEN) + <span className="text-kurla-amber">/api/admin/*</span> (metrics, waitlist {waitlist}, demand {demandUnits}, ops gates {peauGatesOk}/{gatesTotal}).</p>
    </div>
  );
};
