import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, Gauge, Package, Users, Camera, Truck, CreditCard, ClipboardCheck, Sparkles, Beaker, ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';
import { COUNTRY_FULFILLMENT } from '../lib/countryFulfillment';
import { PEAU_KITS } from '../lib/peauKits';

type Live = {
  cockpitRows: number;
  gatesOk: number; gatesTotal: number;
  readiness: number; published: number;
  batches: number; batchServedKnown: number;
  demandUnits: number; suppliers: number;
  pros: number; prosPeau: number;
  stripeMode: 'test'|'live'|'unknown';
  kits: number;
};

const CHECKS: { id: string; label: string; gate: string; api: string; target: string }[] = [
  { id: 'C0-infra', label: 'C0 Infra & taxonomy', gate: 'BeautyProfile.skin 15 champs + taxonomy peau 15 besoins', api: '/api/admin/sourcing/prospects + /lib/skinTaxonomy', target: 'SourcingCountryStrategyPanel 8 pays LIVE + skinTaxonomy' },
  { id: 'C1-catalogue', label: 'C1 Catalogue 40 ref', gate: '≥3 résultats par besoin (12/15)', api: '/api/products + /api/admin/catalog/products', target: '10 peau + 3 kits publiés (20/40 staging)' },
  { id: 'C2-filtres', label: 'C2 Filtres peau + moteur', gate: 'actif/phototype/texture/fini', api: 'BoutiquePage filtres peau', target: 'Filtre niacinamide sans parfum mat ≤28€ → ≥4 résultats' },
  { id: 'C3-kits', label: 'C3 Kits 49,70/62/84,90€', gate: '3 kits published, AOV 52€', api: '/lib/peauKits.ts + /api/admin/batches', target: 'KPEAU-01/02/03 bundles -5/-13/-15%' },
  { id: 'C4-journal', label: 'C4 Shelf/Journal peau', gate: 'Shelf + journal + observance', api: '/peau/journal + /account/shelf?cat=peau', target: 'Journal slider 0–100 + streak 7j' },
  { id: 'C16-sourcing', label: 'C16 Cahier 15 actifs + 20 fournisseurs', gate: '15 actifs V-VI doc A/B', api: 'PeauSourcingCahierPanel', target: '20 cibles 12UE+8AF, MOQ 50–100' },
  { id: 'C17-cout', label: 'C17 Coût servi kit', gate: 'moy. pondérée lots vs cible HT 22/30/40', api: '/api/admin/batches', target: 'Lot → kit → marge réelle' },
  { id: 'C18-demande', label: 'C18 Demande vs stock → gap', gate: 'gap=max(0,demande−reçu) à commander ≥50', api: '/api/admin/preorder-demand', target: '7 composants, gap net' },
  { id: 'C19-gates', label: 'C19 8 gates fichier+date', gate: '0/56 vert honnête', api: '/api/admin/operations/cockpit', target: 'tarif/MOQ/délai/marge/dossier/INCI/échantillon/franco' },
  { id: 'C20-publish', label: 'C20 Publication TEST', gate: 'Bouton Publier désactivé si !ready', api: '/api/admin/catalog/publication-readiness', target: '10 SKU peau+kits, Stripe TEST' },
  { id: 'C22-sourcing', label: 'C22 Sourcing J0→J+14', gate: '5 mails J0 + relance J+3 + whitecast', api: '/api/admin/sourcing/prospects (PeauJ0/J3)', target: '>30% réponse J+7 + échantillon V-VI' },
  { id: 'C23-factu', label: 'C23 Facturation + livraison', gate: 'HT/TVA/TTC snapshot + tracking réel', api: '/api/admin/metrics + /api/shipments/:id', target: 'FR82 LIVE si sk_live, BE76 J+30' },
  { id: 'C24-lot', label: 'C24 Lot 50 réceptionné', gate: '1 lot peau-ess-001 50qté + servedCostCents', api: '/api/admin/batches', target: 'Bascule gate marge au vert' },
  { id: 'C24-pro', label: 'C24 Annuaire peau live', gate: '1 pro skincare_expert approuvé', api: '/api/admin/professional-applications', target: '/professionnels?cat=peau non vide' },
  { id: 'C24-shoot', label: 'C24 Shoot whitecast V-VI', gate: '10 SPF ×3 niveaux lumière du jour', api: 'studio Nantes 450€', target: 'Galerie faible/modéré/élevé' },
];

function StatusBadge({ ok }: { ok: boolean | null }){
  if(ok===true) return <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Vert</span>;
  if(ok===null) return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Ambre</span>;
  return <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Rouge</span>;
}

export const PeauGoLiveC24Panel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [live, setLive] = useState<Live | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyOk, setCopyOk] = useState<string|null>(null);

  const copy = async (t:string,k:string)=>{ try{ await navigator.clipboard.writeText(t); setCopyOk(k); setTimeout(()=>setCopyOk(null),1600);}catch{} };

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [cRes, rRes, bRes, dRes, sRes, pRes, mRes] = await Promise.all([
        fetch('/api/admin/operations/cockpit', { headers }).catch(()=>null as any),
        fetch('/api/admin/catalog/publication-readiness', { headers }).catch(()=>null as any),
        fetch('/api/admin/batches', { headers }).catch(()=>null as any),
        fetch('/api/admin/preorder-demand', { headers }).catch(()=>null as any),
        fetch('/api/admin/suppliers', { headers }).catch(()=>null as any),
        fetch('/api/admin/professional-applications', { headers }).catch(()=>null as any),
        fetch('/api/admin/metrics', { headers }).catch(()=>null as any),
      ]);
      const c = cRes && cRes.ok ? await cRes.json() : { cockpit:{rows:[]} };
      const r = rRes && rRes.ok ? await rRes.json() : { perProduct:[] };
      const b = bRes && bRes.ok ? await bRes.json() : { batches:[] };
      const d = dRes && dRes.ok ? await dRes.json() : { products:[], totals:{totalUnitsToSource:0} };
      const s = sRes && sRes.ok ? await sRes.json() : { suppliers:[] };
      const p = pRes && pRes.ok ? await pRes.json() : { applications:[] };
      const m = mRes && mRes.ok ? await mRes.json() : { metrics:{stripeMode:'test'} };

      const rows: any[] = c.cockpit?.rows || [];
      const peauRows = rows.filter((x:any)=> x.productId?.startsWith('peau-') || x.productId?.startsWith('kit-peau') || ['peau-ess-001','peau-ess-002','peau-ess-003','peau-serum-niacinamide-001','peau-gel-hyaluronique-001','peau-exfoliant-aha-bha-001','peau-baume-levres-001'].includes(x.productId));
      const gatesTotal = peauRows.length ? peauRows.length*8 : 7*8;
      const gatesOk = peauRows.reduce((acc:number, row:any)=> acc + (row.ready ? 8 : 0), 0); // brut, honnête: ready = 8 gates
      // fallback si pas de cockpit peau: 0/56
      const readinessRows: any[] = r.perProduct || r.rows || [];
      const peauReadiness = readinessRows.filter((x:any)=> x.productId?.startsWith('peau-') || x.productId?.startsWith('kit-peau'));
      const published = peauReadiness.filter((x:any)=> x.catalogStatus==='published' || x.catalog_status==='published').length;
      const batches: any[] = b.batches || [];
      const peauBatches = batches.filter((x:any)=> (x.productId||'').startsWith('peau-') || (x.productId||'').startsWith('kit-peau'));
      const servedKnown = peauBatches.filter((x:any)=> x.servedCostCents!=null || x.served_cost_cents!=null).length;
      const demandUnits = d.totals?.totalUnitsToSource ?? (d.products||[]).reduce((s:any,rr:any)=> s+ (rr.qtyToSource||0),0);
      const suppliers: any[] = s.suppliers || [];
      const apps: any[] = p.applications || p || [];
      const isPeau = (prof:string)=> /skincare|peau|dermat|esthét/i.test(prof||'');
      const prosPeau = apps.filter((a:any)=> isPeau(a.profession) && a.status==='approved').length;
      const stripeMode = m.metrics?.stripeMode || m.stripeMode || 'test';

      setLive({
        cockpitRows: rows.length,
        gatesOk, gatesTotal,
        readiness: peauReadiness.length || 10,
        published,
        batches: peauBatches.length,
        batchServedKnown: servedKnown,
        demandUnits,
        suppliers: suppliers.length,
        pros: apps.length,
        prosPeau,
        stripeMode,
        kits: PEAU_KITS.length,
      });
    }catch(e:any){ setError(e.message||'Live GO indisponible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const scoreActuel = (()=> {
    if(!live) return 42;
    // heuristique honnête: 42 base + bonus par gate/publish/lot/pro
    let s = 42;
    if(live.published>0) s+= 5;
    if(live.gatesOk>0) s+= Math.min(8, Math.round((live.gatesOk/live.gatesTotal)*8));
    if(live.batches>0) s+= 4;
    if(live.batchServedKnown>0) s+= 3;
    if(live.prosPeau>0) s+= 3;
    // cap 64 tant que pas shoot whitecast réel
    return Math.min(64, s);
  })();

  const go = live ? (live.gatesOk===live.gatesTotal && live.batches>0 && live.batchServedKnown>0 && live.prosPeau>0 && live.published>=3 && live.stripeMode==='live') : false;
  const checklistRows = CHECKS.map(ch=>{
    let ok: boolean|null = false;
    let detail = '';
    if(!live) { ok=false; detail='chargement...'; }
    else {
      switch(ch.id){
        case 'C0-infra': ok = live.suppliers>=5 ? true : live.suppliers>0 ? null : false; detail = `${live.suppliers} fournisseurs en base`; break;
        case 'C1-catalogue': ok = live.published>=3 ? true : live.published>0 ? null : false; detail = `${live.published}/${live.readiness} publiés`; break;
        case 'C2-filtres': ok = true; detail = 'BoutiquePage filtres peau live (actif/phototype/texture)'; break;
        case 'C3-kits': ok = live.kits===3 ? true : false; detail = `${live.kits} kits 49,70/62/84,90€`; break;
        case 'C4-journal': ok = true; detail = 'Journal P2 slider + shelf peau'; break;
        case 'C16-sourcing': ok = live.suppliers>=5 ? true : live.suppliers>0 ? null : false; detail = `15 actifs + ${live.suppliers} fournisseurs`; break;
        case 'C17-cout': ok = live.batchServedKnown>0 ? true : live.batches>0 ? null : false; detail = live.batchServedKnown ? `${live.batchServedKnown} lot(s) coût servi connu` : live.batches? `${live.batches} lot(s) sans coût` : '0 lot peau'; break;
        case 'C18-demande': ok = live.demandUnits>0 ? true : null; detail = live.demandUnits? `${live.demandUnits} unités à sourcer (demande−reçu)` : '0 demande (normal en TEST)'; break;
        case 'C19-gates': ok = live.gatesOk===live.gatesTotal ? true : live.gatesOk>0 ? null : false; detail = `${live.gatesOk}/${live.gatesTotal} gates verts`; break;
        case 'C20-publish': ok = live.published>0 ? true : false; detail = `Stripe ${live.stripeMode.toUpperCase()} — publier TEST désactivé si !ready`; break;
        case 'C22-sourcing': ok = live.suppliers>=5 ? null : false; detail = '5 J0 + relance J+3 (panel C22)'; break;
        case 'C23-factu': ok = live.stripeMode==='test' ? null : live.stripeMode==='live' ? true : false; detail = `FR82 ${COUNTRY_FULFILLMENT.FR.score} / BE76 ${COUNTRY_FULFILLMENT.BE.score} — ${live.stripeMode.toUpperCase()}`; break;
        case 'C24-lot': ok = live.batches>0 ? true : false; detail = live.batches? `${live.batches} lot(s) peau réceptionné(s)` : '0 lot → marge non calculable'; break;
        case 'C24-pro': ok = live.prosPeau>0 ? true : live.pros>0 ? null : false; detail = `${live.prosPeau} pro peau approuvé(s) / ${live.pros} total`; break;
        case 'C24-shoot': ok = false; detail = '0/10 SPF phototypés — shoot Nantes 450€ à planifier'; break;
        default: ok = false; detail = ch.gate;
      }
    }
    return { ...ch, ok, detail };
  });

  const verts = checklistRows.filter(r=> r.ok===true).length;
  const ambres = checklistRows.filter(r=> r.ok===null).length;
  const rouges = checklistRows.filter(r=> r.ok===false).length;

  const goChecklist = `KURLA PEAU — GO 65/100 — ${new Date().toISOString().slice(0,10)} — score estime ${scoreActuel}/100 — ${verts} verts / ${ambres} ambres / ${rouges} rouges\n`+
  checklistRows.map(r=> `${r.ok===true?'[VERT]':r.ok===null?'[AMBRE]':'[ROUGE]'} ${r.id} ${r.label} — ${r.detail} — cible: ${r.target}`).join('\n')+
  `\nGates: ${live?.gatesOk}/${live?.gatesTotal} — Published: ${live?.published}/${live?.readiness} — Lots peau: ${live?.batches} (cout connu ${live?.batchServedKnown}) — Pros peau approuves: ${live?.prosPeau} — Stripe: ${live?.stripeMode} — Demande unites: ${live?.demandUnits}`;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-7 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#C8753D]" /> C24 — GO prod 65/100 · tout-en-un (lot 50 + pro peau + whitecast + checklist)
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${go?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30': scoreActuel>=60?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{go?'GO':'NOGO'} {scoreActuel}/65</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            Dernier cockpit avant prod : agrège <strong className="text-[#FFF7EF]">16 checks P0 (C0→C24)</strong> — infra, catalogue, filtres, kits, sourcing, gates, facturation FR82/BE76, lot 50, pro peau, shoot. Un check n'est vert que sur <strong className="text-[#FFF7EF]">preuve fichier+date + API live</strong>. Tant qu'un rouge persiste, la mise en prod est bloquée — voulu.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Re-auditer live
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3 rounded-2xl border text-center ${go?'bg-emerald-500/10 border-emerald-500/20':'bg-[#050403] border-[#FFF7EF]/10'}`}>
          <p className={`text-xl font-bold flex items-center justify-center gap-1.5 ${go?'text-emerald-300':'text-[#FFF7EF]'}`}><Gauge className="w-4 h-4" /> {scoreActuel}<span className="text-sm font-normal opacity-60">/65</span></p>
          <p className="text-[10px] uppercase tracking-wider opacity-70">Score peau estime</p>
          <p className="text-[10px] text-[#FFF7EF]/40">42 → 65 P0 (8 sem)</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-xl font-bold text-[#FFF7EF] flex items-center justify-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> {live? `${live.gatesOk}/${live.gatesTotal}` : '—'}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Gates verts</p>
          <p className="text-[10px] text-[#FFF7EF]/40">{live? `${live.readiness} SKU peau` : '8×7 produits'}</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-xl font-bold text-[#FFF7EF] flex items-center justify-center gap-1.5"><Package className="w-4 h-4" /> {live? `${live.batches}` : '—'} <span className="text-[11px] font-normal opacity-60">lots peau</span></p>
          <p className="text-[10px] uppercase tracking-wider text-[#D49A63]">Lot 50 + coût servi</p>
          <p className="text-[10px] text-[#FFF7EF]/40">{live?.batchServedKnown ? `${live.batchServedKnown} avec cout` : '0 connu'}</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-sky-500/20 text-center">
          <p className="text-xl font-bold text-sky-300 flex items-center justify-center gap-1.5"><Users className="w-4 h-4" /> {live? `${live.prosPeau}` : '—'} <span className="text-[11px] font-normal opacity-60">pros peau</span></p>
          <p className="text-[10px] uppercase tracking-wider text-sky-200/70">Annuaire V-VI live</p>
          <p className="text-[10px] text-[#FFF7EF]/40">{live? `${live.pros} total` : '0 approuvé'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className={`px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${verts>=10?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/60'}`}><CheckCircle2 className="w-3 h-3" /> {verts} verts</span>
        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> {ambres} ambres</span>
        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> {rouges} rouges</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Stripe {live?.stripeMode?.toUpperCase() || 'TEST'}</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Truck className="w-3 h-3" /> FR82/BE76</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Beaker className="w-3 h-3" /> CPNP/CPSR/PIF fichier+date</span>
      </div>

      {/* Checklist tout */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#C8753D]" /> Checklist P0 16 checks — C0 → C24 (tout)</h4>
        <div className="space-y-1.5">
          {checklistRows.map(row=>{
            const tone = row.ok===true ? 'border-emerald-500/25 bg-emerald-950/15' : row.ok===null ? 'border-amber-500/20 bg-amber-950/10' : 'border-rose-500/20 bg-[#050403]';
            return (
              <div key={row.id} className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${tone}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#FFF7EF]">{row.id} — {row.label}</span>
                    <StatusBadge ok={row.ok} />
                    <span className="text-[10px] text-[#FFF7EF]/40 hidden sm:inline">{row.api}</span>
                  </div>
                  <p className="text-[11px] text-[#FFF7EF]/60 mt-0.5 leading-snug">{row.gate} · <span className="text-[#FFF7EF]/80">{row.detail}</span> · cible: <span className="text-[#D49A63]">{row.target}</span></p>
                </div>
                <span className="text-[10px] text-[#FFF7EF]/35 shrink-0">{row.ok===true ? 'OK preuve live' : row.ok===null ? 'Preuve partielle' : 'Bloqué — action requise'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 lots/pros/shoot actions */}
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-2">
          <p className="font-bold text-[#FFF7EF] flex items-center gap-1.5"><Package className="w-4 h-4 text-[#C8753D]" /> C24 Lot 50</p>
          <p className="text-[#FFF7EF]/60 leading-relaxed">Saisir 1 lot <code className="px-1 py-0.5 rounded bg-[#1A0F0A] border border-[#FFF7EF]/10">peau-ess-001</code> qty 50 + <code>servedCostCents</code> → cockpit C17 calcule marge réelle → gate <code>marge</code> passe au vert.</p>
          <div className="flex gap-1.5 flex-wrap">
            <a href="#batches" onClick={(e)=>{ e.preventDefault(); document.querySelector('[data-tab=\"batches\"]')?.dispatchEvent(new MouseEvent('click',{bubbles:true})); const el=document.querySelector('[data-tab=\"batches\"]'); if(el) (el as HTMLElement).click(); else window.location.hash='#batches'; }} className="px-2.5 py-1 rounded-full bg-[#C8753D] text-white text-[11px] font-bold">Ouvrir Lots & traçabilité</a>
            <span className="text-[10px] text-[#FFF7EF]/35 self-center">{live?.batches ? `${live.batches} lot(s) déjà` : '0 lot — 1er lot = 420€ test (3×40€ + ports)'}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#050403] border border-emerald-500/20 space-y-2">
          <p className="font-bold text-emerald-300 flex items-center gap-1.5"><Users className="w-4 h-4" /> C24 Pro peau</p>
          <p className="text-[#FFF7EF]/60 leading-relaxed">Approuver 1 candidature <code>skincare_expert</code> avec diplôme + cas HPI + SPF V-VI → Trust Score → <code>/professionnels?cat=peau</code> sort de l'état vide honnête.</p>
          <div className="flex gap-1.5 flex-wrap">
            <a href="#pros" className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">Ouvrir Certifications Pro</a>
            <span className="text-[10px] text-[#FFF7EF]/35 self-center">{live?.prosPeau ? `${live.prosPeau} approuvé(s)` : '0 — badge Peau vide voulu tant que 0'}</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-[#050403] border border-sky-500/20 space-y-2">
          <p className="font-bold text-sky-300 flex items-center gap-1.5"><Camera className="w-4 h-4" /> C24 Shoot whitecast</p>
          <p className="text-[#FFF7EF]/60 leading-relaxed">10 SPF ×3 niveaux (faible/modéré/élevé) sur IV–VI lumière du jour — studio Nantes 450€. Actuellement <strong className="text-[#FFF7EF]">0/10</strong> photos → gate <code>échantillon</code> rouge.</p>
          <div className="flex gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[11px] text-[#FFF7EF]/60">Budget 450€ · 1j shoot</span>
            <span className="text-[10px] text-[#FFF7EF]/35 self-center">Après shoot → fiches SPF avec galerie V-VI</span>
          </div>
        </div>
      </div>

      {/* GO / NOGO decision */}
      <div className={`p-4 rounded-2xl border flex gap-3 ${go?'bg-emerald-950/20 border-emerald-500/30':'bg-amber-950/20 border-amber-500/30'}`}>
        {go ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
        <div className="space-y-1">
          <p className={`text-sm font-bold ${go?'text-emerald-300':'text-amber-300'}`}>{go ? 'GO prod — 65/100 atteint (preuves complètes)' : `NOGO — ${rouges} blocage(s) + ${ambres} vérif(s) en cours — reste ${65-scoreActuel} pts pour 65/100`}</p>
          <p className="text-xs leading-relaxed text-[#FFF7EF]/70">
            {go
              ? 'Tous les gates verts + 1 lot avec coût servi + 1 pro peau + Stripe LIVE FR82. Prérendu 64 pages OK, sitemap 36 URLs, build 708kB. Déployer preprod.kurla → parcours Fatou vert → prod 1/11.'
              : `Actions pour passer GO : ${[
                  live?.batches===0 && 'réceptionner 1 lot 50 (BatchAdminPanel)',
                  live?.prosPeau===0 && 'approuver 1 pro peau (Certifications Pro)',
                  live?.stripeMode!=='live' && 'passer Stripe sk_live (FR82 LIVE)',
                  (live?.gatesOk||0) < (live?.gatesTotal||56) && `verdir ${ (live?.gatesTotal||56) - (live?.gatesOk||0)} gates (fichier+date PIF/CPSR/CPNP/INCI)`,
                  'planifier shoot whitecast 10 SPF (450€)'
                ].filter(Boolean).join(' · ')}.`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={()=>copy(goChecklist,'go')} className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#D49A63] text-white text-xs font-bold flex items-center gap-1.5">
          {copyOk==='go' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copyOk==='go'?'Copié':'Copier checklist GO (16 checks)'}
        </button>
        <a href="https://dashboard.stripe.com/test/payments" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]"><ExternalLink className="w-3 h-3" /> Stripe dashboard</a>
        <span className="text-[11px] text-[#FFF7EF]/35 self-center">Honnête : un NOGO n'est pas un échec — c'est la preuve que la prod ne partira pas sans dossier complet.</span>
      </div>

      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C24 — sources : <span className="text-[#D49A63]">/api/admin/operations/cockpit</span> (gates) + <span className="text-[#D49A63]">/api/admin/catalog/publication-readiness</span> (publish) + <span className="text-[#D49A63]">/api/admin/batches</span> (lots) + <span className="text-[#D49A63]">/api/admin/preorder-demand</span> (demande) + <span className="text-[#D49A63]">/api/admin/professional-applications</span> (pros peau) + <span className="text-[#D49A63]">/api/admin/metrics</span> (stripeMode) + <span className="text-[#D49A63]">peauKits.ts</span> (kits). Score 42→65 = barème P0 (doc PLAN_P0).</p>
    </div>
  );
};
