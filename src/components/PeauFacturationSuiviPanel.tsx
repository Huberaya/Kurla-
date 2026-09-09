import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, Check, CreditCard, Receipt, Truck, MapPin, RefreshCw, Globe, Euro, FileText, ExternalLink, ShieldCheck, Eye } from 'lucide-react';
import { COUNTRY_FULFILLMENT, getStripeModeForCountry } from '../lib/countryFulfillment';

type Metrics = { stripeMode?: 'test'|'live'|'unknown'; grossRevenue?: number; netRevenue?: number; avgOrderValue?: number; paidOrdersCount?: number } | null;

type OrderRow = {
  id: string;
  createdAt: string;
  customerEmail?: string;
  total: number;
  status: string;
  currency?: string;
  vatCountry?: string;
  netAmount?: number;
  vatAmount?: number;
  vatBreakdown?: any;
  shippingAddress?: any;
  customerVatNumber?: string | null;
};

type ShipmentMini = {
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status?: string;
  estimatedDelivery?: string;
  price?: number;
};

const STORAGE_KEY = 'kurla_c23_factu_livraison_v1';

function maskEmail(e?: string){
  if(!e) return '—';
  const [a,b]=e.split('@');
  if(!b) return e;
  return `${a.slice(0,2)}***@${b}`;
}

function countryLabel(code?: string){
  if(!code) return 'FR (défaut)';
  const cfg = (COUNTRY_FULFILLMENT as any)[code.toUpperCase()];
  return cfg ? `${cfg.flag} ${code.toUpperCase()} · ${cfg.name} ${cfg.score}/100` : code.toUpperCase();
}

export const PeauFacturationSuiviPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [metrics, setMetrics] = useState<Metrics>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [shipments, setShipments] = useState<Record<string,ShipmentMini>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyOk, setCopyOk] = useState<string | null>(null);
  const [ibanDraft, setIbanDraft] = useState(()=>{
    try{
      if (typeof window === 'undefined' || !window.localStorage) return { fr: '', be: '', titulaire: 'KURLA Beauty SASU' };
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') || { fr: '', be: '', titulaire: 'KURLA Beauty SASU' };
    }catch{ return { fr: '', be: '', titulaire: 'KURLA Beauty SASU' }; }
  });

  const persistIban = (v:any)=>{
    setIbanDraft(v);
    try{ if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }catch{}
  };

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [mRes, oRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }).catch(()=>null as any),
        fetch('/api/orders', { headers }).catch(()=>null as any),
      ]);
      if(mRes && mRes.ok){
        const m = await mRes.json();
        setMetrics((m.metrics || m) as Metrics);
      } else {
        setMetrics({ stripeMode: 'test' });
      }
      let ords: OrderRow[] = [];
      if(oRes && oRes.ok){
        const o = await oRes.json();
        const raw: any[] = o.orders || o || [];
        ords = raw.map((x:any)=>({
          id: x.id,
          createdAt: x.createdAt || x.created_at || new Date().toISOString(),
          customerEmail: x.customerEmail || x.customer_email,
          total: Number(x.total || 0),
          status: x.status || 'unknown',
          currency: x.currency || 'EUR',
          vatCountry: x.vatCountry || x.vat_country || x.shippingAddress?.country || x.shipping_address?.country,
          netAmount: x.netAmount ?? x.net_amount ?? x.shippingAddress?.vat?.totalNetCents ? (x.shippingAddress?.vat?.totalNetCents/100) : undefined,
          vatAmount: x.vatAmount ?? x.vat_amount ?? x.shippingAddress?.vat?.totalVatCents ? (x.shippingAddress?.vat?.totalVatCents/100) : undefined,
          vatBreakdown: x.vatBreakdown || x.vat_breakdown || x.shippingAddress?.vat?.breakdown,
          shippingAddress: x.shippingAddress || x.shipping_address,
          customerVatNumber: x.customerVatNumber || x.customer_vat_number || x.shippingAddress?.vat?.customerVatNumber || null,
        }));
        setOrders(ords.slice(0, 80));
        // fetch shipments for first 8 paid/processing orders
        const toFetch = ords.filter(o=> ['paid','processing','packed','shipped','delivered','partially_refunded','refunded'].includes(o.status)).slice(0, 8);
        if(toFetch.length){
          const results = await Promise.all(toFetch.map(async o=>{
            try{
              const sRes = await fetch(`/api/shipments/${encodeURIComponent(o.id)}`, { headers });
              if(!sRes.ok) return null;
              const sj = await sRes.json();
              const sh = sj.shipment;
              if(!sh) return null;
              return { orderId: o.id, carrier: sh.carrier, trackingNumber: sh.trackingNumber || sh.tracking_number, trackingUrl: sh.trackingUrl || sh.tracking_url, status: sh.status, estimatedDelivery: sh.estimatedDelivery || sh.estimated_delivery, price: sh.price } as ShipmentMini;
            }catch{ return null; }
          }));
          const map: Record<string,ShipmentMini> = {};
          results.forEach(r=>{ if(r) map[r.orderId]=r; });
          setShipments(map);
        }
      } else {
        setOrders([]);
      }
    }catch(e:any){ setError(e.message||'Chargement impossible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const stripeMode = (metrics?.stripeMode || 'test') as 'test'|'live'|'unknown';
  const envKeyPrefix = stripeMode === 'live' ? 'sk_live_' : stripeMode === 'test' ? 'sk_test_' : '';
  const effective = (code: string) => getStripeModeForCountry(code, envKeyPrefix + 'dummy');

  const paidOrders = orders.filter(o=> ['paid','processing','packed','shipped','delivered','partially_refunded','refunded'].includes(o.status));
  const pendingOrders = orders.filter(o=> ['payment_pending_webhook','pending_payment','payment_failed'].includes(o.status));
  const shippedCount = Object.values(shipments).filter(s=> ['shipped','in_transit','out_for_delivery','delivered'].includes(s.status||'')).length;
  const last5Paid = paidOrders.slice(0,5);

  const copy = async (text:string, key:string)=>{
    try{ await navigator.clipboard.writeText(text); setCopyOk(key); setTimeout(()=>setCopyOk(null), 1600); }catch{ /* noop */ }
  };

  const factureMentions = `KURLA Beauty — Facture reconstituable (snapshot commande, TVA destination)\n`+
`Mentions : SIREN/SIRET + TVA intra. FR à renseigner au passage LIVE · Facturation en EUR uniquement (Directive 2006/112/CE art.33, OSS). Prix catalogue TTC (price_includes_vat = TRUE) → TVA extraite au taux du pays de livraison. Sous auto-liquidation VIES vérifiée, client paie le net (art.138/196).\n`+
`Champs stockés par commande : currency, vatCountry, netAmount, vatAmount, vatBreakdown[{ratePercent, netCents, vatCents}], shippingAmountCents, customerVatNumber, vatCheckedAt. Aucun calcul n'est refait côté client.\n`+
`Pays LIVE : FR 82/100 (pilote, sk_live) → BE 76/100 (J+30 si FR >30% réponse J+7) → SN 71/100 (J+60 si MOQ<100 Afrique). Autres TEST jusqu'à preuve (gate 8 + lot 50 + whitecast V-VI).\n`+
`Livraison : numéro de suivi RÉEL obligatoire (regex rejette test/fake/dummy) · URL auto-générée Colissimo/Mondial Relay/Chronopost/DHL · statut preparing→label_created→shipped→delivered synchronisé avec commande.`;

  const ibanMentions = `Titulaire : ${ibanDraft.titulaire}\nIBAN FR (82) : ${ibanDraft.fr || "FR76 XXXX XXXX XXXX XXXX XXXX XXX - a saisir dans Stripe Payouts Bank account (hors app)"}\nIBAN BE (76) : ${ibanDraft.be || "BE71 XXXX XXXX XXXX XXXX - meme compte Stripe, devise EUR (payout SEPA)"}\nRegle : un seul IBAN de payout Stripe (FR suffit pour encaisser FR+BE en EUR). Le second IBAN n est utile que si entite BE separee. Ne jamais stocker l IBAN complet cote client - Stripe le chiffre.`;

  const frCfg = COUNTRY_FULFILLMENT.FR;
  const beCfg = COUNTRY_FULFILLMENT.BE;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-7 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#C8753D]" /> C23 — Facturation Stripe TEST→LIVE FR82/BE76 + suivi livraison
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${stripeMode==='live'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>Stripe {stripeMode.toUpperCase()} · précommande 3–5j</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            Passage LIVE <strong className="text-[#FFF7EF]">pays par pays (FR 82/BE 76)</strong> — pas un switch global. LIVE exige <strong className="text-emerald-300">sk_live + 8 gates verts fichier+date + 1 lot 50 reçu</strong>. Tant que TEST, tout encaissement = simulation (aucun euro réel), mais <strong className="text-[#FFF7EF]">la facture reste reconstituable</strong> (snapshot TVA stocké). Livraison : seul un <strong className="text-[#FFF7EF]">numéro réel transporteur</strong> fait passer <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">shipped</code>.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3 rounded-2xl border text-center ${stripeMode==='live'?'bg-emerald-500/10 border-emerald-500/20':'bg-amber-500/10 border-amber-500/20'}`}>
          <p className={`text-lg font-bold flex items-center justify-center gap-1.5 ${stripeMode==='live'?'text-emerald-300':'text-amber-300'}`}><CreditCard className="w-4 h-4" /> {stripeMode.toUpperCase()}</p>
          <p className="text-[10px] uppercase tracking-wider opacity-70">{stripeMode==='live'?'encaissements réels':'aucun euro réel · simulation'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40 mt-1">{stripeMode==='live'?'sk_live détectée':'sk_test / absente'}</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-lg font-bold text-[#FFF7EF] flex items-center justify-center gap-1.5"><Euro className="w-4 h-4" /> {paidOrders.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#D49A63]">Commandes facturables (paid+)</p>
          <p className="text-[10px] text-[#FFF7EF]/40">{pendingOrders.length} en attente webhook</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-lg font-bold text-[#FFF7EF]">{metrics?.avgOrderValue ? `${Number(metrics.avgOrderValue).toFixed(2)}€` : '—'}</p>
          <p className="text-[10px] uppercase tracking-wider text-[#D49A63]">AOV (paid)</p>
          <p className="text-[10px] text-[#FFF7EF]/40">net+ TVA = TTC encaissé</p>
        </div>
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <p className="text-lg font-bold text-indigo-300 flex items-center justify-center gap-1.5"><Truck className="w-4 h-4" /> {shippedCount}/{Object.keys(shipments).length || '0'}</p>
          <p className="text-[10px] uppercase tracking-wider text-indigo-200/70">Expédiées avec suivi</p>
          <p className="text-[10px] text-[#FFF7EF]/40">préparing→delivered</p>
        </div>
      </div>

      {/* Bornes FR82/BE76 */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className={`px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${effective('FR')==='live'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/60'}`}><Globe className="w-3 h-3" /> FR 82 {effective('FR')==='live'?'LIVE':'TEST'} · {frCfg.dispatchDays}</span>
        <span className={`px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 ${effective('BE')==='live'?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}><Globe className="w-3 h-3" /> BE 76 {effective('BE')==='live'?'LIVE':'TEST'} · {beCfg.dispatchDays}</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 8 gates fichier+date requis pour LIVE</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Clock className="w-3 h-3" /> Préco lun/jeu 18h · 0 stock Paris</span>
        <span className="px-2.5 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1"><Receipt className="w-3 h-3" /> EUR seule · OSS · TVA destination</span>
      </div>

      {/* Country matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-[#FFF7EF]/10 text-[#D49A63] uppercase tracking-wider text-[10px]">
              <th className="py-2 px-3">Pays · score</th>
              <th className="py-2 px-3">Stripe effectif</th>
              <th className="py-2 px-3">Dispatch</th>
              <th className="py-2 px-3">TVA</th>
              <th className="py-2 px-3">Modèle</th>
              <th className="py-2 px-3">Condition d'ouverture</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FFF7EF]/5">
            { (Object.values(COUNTRY_FULFILLMENT) as any[]).filter(c=>c.code!=='INT').sort((a,b)=>b.score-a.score).map(c=>{
              const eff = effective(c.code) as string;
              const isLive = eff==='live';
              return (
                <tr key={c.code} className={isLive ? 'bg-emerald-950/10' : c.code==='FR' ? 'bg-amber-950/10' : ''}>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-[#FFF7EF] flex items-center gap-1.5">{c.flag} {c.code} · {c.name} <span className={`ml-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${c.score>=70?'bg-[#C8753D]/15 text-[#D49A63] border-[#C8753D]/30':'bg-[#FFF7EF]/5 text-[#FFF7EF]/50 border-[#FFF7EF]/10'}`}>{c.score}/100</span></span>
                    <span className="text-[10px] text-[#FFF7EF]/40">{c.hub} · {c.currency}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${isLive?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-[#FFF7EF]/5 text-[#FFF7EF]/50 border-[#FFF7EF]/10'}`}>{eff.toUpperCase()}</span>
                    {c.code==='FR' && <span className="block text-[10px] text-[#FFF7EF]/40 mt-1">{stripeMode==='live'?'sk_live → LIVE si gates verts':'TEST (sk_test/aucune)'} </span>}
                    {c.code==='BE' && <span className="block text-[10px] text-[#FFF7EF]/40 mt-1">J+30 si FR {'>'}30% J+7</span>}
                  </td>
                  <td className="py-2.5 px-3 text-[#FFF7EF]/80 leading-snug">{c.dispatch}<span className="block text-[10px] text-[#FFF7EF]/40">{c.dispatchDays}</span></td>
                  <td className="py-2.5 px-3 font-mono text-[#FFF7EF]/80">{c.vatRate}%</td>
                  <td className="py-2.5 px-3 text-[#FFF7EF]/70 leading-snug">{c.model}</td>
                  <td className="py-2.5 px-3 text-[#FFF7EF]/60 leading-snug text-[11px]">{c.condition}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[#FFF7EF]/35 leading-relaxed">Source scoring : <span className="text-[#D49A63]">docs/sourcing/pays_scoring.md (FR 82/BE 76/SN 71/CI 68/MA 64/CH 58/CM 52)</span> + <span className="text-[#D49A63]">src/lib/countryFulfillment.ts</span>. Règle : <strong className="text-[#FFF7EF]">score ≥65 + fournisseur MOQ &lt;100 + whitecast V-VI faible</strong> pour envisager l'ouverture ; sinon TEST bloqué — voulu.</p>

      {/* Facturation */}
      <div className="p-4 rounded-2xl bg-[#050403] border border-[#C8753D]/30 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h4 className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2"><FileText className="w-4 h-4 text-[#C8753D]" /> Facturation : TTC encaissé = snapshot reconstituable</h4>
          <span className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[10px] text-[#FFF7EF]/60">EUR seule · price_includes_vat · TVA destination (art.33)</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="font-bold text-[#FFF7EF] flex items-center gap-1.5"><Euro className="w-3.5 h-3.5" /> TTC encaissé</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1">Prix catalogue TTC (ou HT → TTC si HT). La TVA est <em>extraite</em> au taux du pays de livraison, pas ajoutée après. <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10 text-[10px]">vatBreakdown[]</code> stocké ligne par ligne.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="font-bold text-[#FFF7EF] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Auto-liquidation</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1">Assujetti UE avec <strong className="text-[#FFF7EF]">VIES vérifié</strong> → net facturé, TVA 0 (art.138/196). Sinon TVA normale. Vérif via <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">verifyVatNumber</code> (log <code>vatCheckedAt</code>).</p>
          </div>
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="font-bold text-[#FFF7EF] flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Preuve comptable</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1">Chaque commande porte <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">currency/vatCountry/netAmount/vatAmount/breakdown</code> + <code>shippingAmountCents</code>. Reconstituable sans Stripe — coffre OSS.</p>
          </div>
        </div>

        {/* Orders facturation table */}
        {loading ? <p className="text-xs text-[#FFF7EF]/50 italic">Chargement commandes facturables…</p> :
          last5Paid.length===0 ? (
            <div className="p-4 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center space-y-1">
              <p className="text-xs text-[#FFF7EF]/60">Aucune commande <code>paid+</code> — facturation à vide honnête.</p>
              <p className="text-[11px] text-[#FFF7EF]/40">Passez une précommande TEST (<code>4242 4242 4242 4242</code>) → <code>/api/orders</code> créera une ligne <code>paid</code> avec snapshot TVA complet, puis le tableau s'affichera ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#FFF7EF]/10 text-[#D49A63] uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-3">Commande</th>
                    <th className="py-2 px-3">Date · statut</th>
                    <th className="py-2 px-3">Pays TVA · devise</th>
                    <th className="py-2 px-3">Net HT</th>
                    <th className="py-2 px-3">TVA</th>
                    <th className="py-2 px-3">TTC</th>
                    <th className="py-2 px-3">Facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFF7EF]/5">
                  {last5Paid.map(o=>{
                    const net = o.netAmount != null ? Number(o.netAmount).toFixed(2) : '—';
                    const vat = o.vatAmount != null ? Number(o.vatAmount).toFixed(2) : '—';
                    const vatRate = (o.vatBreakdown && Array.isArray(o.vatBreakdown) && o.vatBreakdown[0]?.ratePercent != null) ? `${o.vatBreakdown[0].ratePercent}%` : (o.shippingAddress?.vat?.ratePercent ? `${o.shippingAddress.vat.ratePercent}%` : (COUNTRY_FULFILLMENT as any)[(o.vatCountry||'FR').toUpperCase()]?.vatRate ? `${(COUNTRY_FULFILLMENT as any)[(o.vatCountry||'FR').toUpperCase()].vatRate}%` : '—');
                    const country = (o.vatCountry || o.shippingAddress?.country || 'FR').toUpperCase();
                    return (
                      <tr key={o.id} className="hover:bg-[#1A0F0A]/60">
                        <td className="py-2.5 px-3"><span className="font-mono font-bold text-[#FFF7EF]">{o.id}</span><span className="block text-[10px] text-[#FFF7EF]/40">{maskEmail(o.customerEmail)}</span></td>
                        <td className="py-2.5 px-3"><span className="text-[#FFF7EF]/80">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</span><span className={`ml-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${['paid','delivered'].includes(o.status)?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':['processing','packed','shipped'].includes(o.status)?'bg-sky-500/15 text-sky-300 border-sky-500/30':'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{o.status}</span></td>
                        <td className="py-2.5 px-3"><span className="text-[#FFF7EF]/80">{countryLabel(country)}</span><span className="block text-[10px] text-[#FFF7EF]/40">{o.currency || 'EUR'} · {o.customerVatNumber ? `VIES ${o.customerVatNumber}` : 'particulier'}</span></td>
                        <td className="py-2.5 px-3 font-mono text-[#FFF7EF]/80">{net !== '—' ? `${net}€` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-[#FFF7EF]/80">{vat !== '—' ? `${vat}€` : '—'}<span className="block text-[10px] text-[#FFF7EF]/40">{vatRate}</span></td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#FFF7EF]">{Number(o.total).toFixed(2)}€</td>
                        <td className="py-2.5 px-3"><span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${o.status==='refunded'?'bg-rose-500/15 text-rose-300 border-rose-500/30':o.status==='partially_refunded'?'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'}`}>{['refunded','partially_refunded'].includes(o.status)?'avoir':'émise (snapshot)'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }

        <div className="flex flex-wrap gap-2">
          <button onClick={()=>copy(factureMentions,'facture')} className="px-3 py-1.5 rounded-full bg-[#C8753D] hover:bg-[#D49A63] text-white text-xs font-bold flex items-center gap-1.5">
            {copyOk==='facture' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copyOk==='facture'?'Copié':'Copier mentions facture (OSS)'}
          </button>
          <a href={stripeMode==='live'? 'https://dashboard.stripe.com/payments' : 'https://dashboard.stripe.com/test/payments'} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
            <ExternalLink className="w-3.5 h-3.5" /> Ouvrir Stripe {stripeMode==='live'?'LIVE':'TEST'} <span className="text-[10px] text-[#FFF7EF]/40">dashboard</span>
          </a>
          <span className="text-[11px] text-[#FFF7EF]/35 self-center">En TEST, « émise (snapshot) » = preuves TVA sans flux bancaire — la compta voit déjà la ventilation exacte.</span>
        </div>
      </div>

      {/* IBAN / payout */}
      <div className="p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 space-y-3">
        <h4 className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#D49A63]" /> Encaissement SEPA — FR82 / BE76 (bornes payout)</h4>
        <p className="text-xs text-[#FFF7EF]/60 leading-relaxed">
          Un seul compte Stripe suffit pour encaisser FR + BE en EUR (SEPA). Le « FR82 » et « BE76 » sont les <strong className="text-[#FFF7EF]">scores pays</strong> (82/100 FR, 76/100 BE), pas deux IBAN obligatoires. L'IBAN de payout se configure <strong className="text-[#FFF7EF]">dans Stripe Dashboard → Settings → Payouts</strong>, jamais dans l'app — l'app ne stocke pas d'IBAN complet.
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-xs text-[#FFF7EF]/70 space-y-1 block">Titulaire (affiché facture)
            <input value={ibanDraft.titulaire} onChange={e=>persistIban({ ...ibanDraft, titulaire: e.target.value })} placeholder="KURLA Beauty SASU" className="w-full mt-1 px-3 py-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]" />
          </label>
          <label className="text-xs text-[#FFF7EF]/70 space-y-1 block">IBAN FR — repère (masqué après saisie)
            <input value={ibanDraft.fr} onChange={e=>persistIban({ ...ibanDraft, fr: e.target.value })} placeholder="FR76 3000 4000 0500 0012 3456 789" className="w-full mt-1 px-3 py-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] font-mono focus:outline-none focus:border-[#C8753D]" />
            <span className="text-[10px] text-[#FFF7EF]/35">27 caractères FR14 + clé — vérifié côté Stripe</span>
          </label>
          <label className="text-xs text-[#FFF7EF]/70 space-y-1 block">IBAN BE — si entité BE séparée
            <input value={ibanDraft.be} onChange={e=>persistIban({ ...ibanDraft, be: e.target.value })} placeholder="BE71 0961 2345 6789" className="w-full mt-1 px-3 py-2 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF] font-mono focus:outline-none focus:border-[#C8753D]" />
            <span className="text-[10px] text-[#FFF7EF]/35">16 caractères BE71 — optionnel</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>copy(ibanMentions,'iban')} className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
            {copyOk==='iban' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copyOk==='iban'?'Copié':'Copier bloc IBAN (note interne)'}
          </button>
          <span className="text-[11px] text-amber-300 self-center flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Ne collez jamais un vrai IBAN complet dans ce champ en prod — note locale seulement.</span>
        </div>
      </div>

      {/* Suivi livraison */}
      <div className="p-4 rounded-2xl bg-[#050403] border border-indigo-500/25 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2"><Truck className="w-4 h-4" /> Suivi livraison — du carton au tracking réel</h4>
          <span className="px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> Colissimo · Mondial Relay · Chronopost · DHL</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
            <p className="font-bold text-[#FFF7EF]">1. Étiquette créée</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1"><code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">label_created</code> → commande <code>packed</code>. Numéro non exigé ici.</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
            <p className="font-bold text-indigo-200">2. Expédiée — <strong>tracking réel obligatoire</strong></p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1"><code>shipped/in_transit/out_for_delivery</code> exigent <code>trackingNumber</code> non-fake (rejet <code>test/fake/dummy</code>). URL auto : La Poste / Mondial Relay / Chronopost / DHL.</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
            <p className="font-bold text-emerald-200">3. Livrée</p>
            <p className="text-[#FFF7EF]/60 leading-relaxed mt-1"><code>delivered</code> → commande <code>delivered</code> + event <code>deliveredAt</code>. Historique <code>/api/shipments/:id/history</code> visible cliente.</p>
          </div>
        </div>

        {/* Shipments table */}
        {Object.keys(shipments).length===0 ? (
          <div className="p-4 rounded-xl bg-[#1A0F0A] border border-[#FFF7EF]/10 text-center space-y-1">
            <p className="text-xs text-[#FFF7EF]/60">Aucune expédition avec tracking enregistré — état honnête.</p>
            <p className="text-[11px] text-[#FFF7EF]/40">Créez-en une via <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">Commandes → Expédier</code> (choisir transporteur + coller n° réel) → elle apparaîtra ici avec son lien de suivi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-[#FFF7EF]/10 text-indigo-300 uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-3">Commande</th>
                  <th className="py-2 px-3">Transporteur</th>
                  <th className="py-2 px-3">N° suivi</th>
                  <th className="py-2 px-3">Statut expédition</th>
                  <th className="py-2 px-3">Livraison estimée</th>
                  <th className="py-2 px-3">Lien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFF7EF]/5">
                {Object.entries(shipments).map(([orderId, s])=>{
                  const statusTone =
                    s.status==='delivered' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                    ['shipped','in_transit','out_for_delivery'].includes(s.status||'') ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' :
                    s.status==='label_created' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' :
                    s.status==='failed' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                  return (
                    <tr key={orderId} className="hover:bg-[#1A0F0A]/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#FFF7EF]">{orderId}</td>
                      <td className="py-2.5 px-3"><span className="px-2 py-1 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[#FFF7EF]/70 text-[11px]">{s.carrier || 'manual'}</span></td>
                      <td className="py-2.5 px-3 font-mono text-[#FFF7EF]/80">{s.trackingNumber ? `${s.trackingNumber.slice(0,4)}****${s.trackingNumber.slice(-4)}` : <span className="text-amber-300">à saisir</span>}<span className="block text-[10px] text-[#FFF7EF]/30 font-sans">{s.trackingNumber || ''}</span></td>
                      <td className="py-2.5 px-3"><span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${statusTone}`}>{s.status || 'preparing'}</span></td>
                      <td className="py-2.5 px-3 text-[#FFF7EF]/70">{s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString('fr-FR') : <span className="text-[#FFF7EF]/30">—</span>}</td>
                      <td className="py-2.5 px-3">
                        {s.trackingUrl ? <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/25">Suivi <ExternalLink className="w-3 h-3" /></a> : <span className="text-[#FFF7EF]/30 text-[11px]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Garde transporteur :</strong> un numéro commençant par <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">test / fake / dummy / placeholder</code> est <strong>refusé par le serveur</strong> (<code>upsertShipment</code> lève <em>« valeur de test »</em>). Seul le numéro réel du bordereau fait passer la commande en <code>shipped</code> — pas d'invention possible.</span>
        </div>

        <p className="text-[11px] text-[#FFF7EF]/35 leading-relaxed">
          Sources : <span className="text-[#D49A63]">/api/admin/metrics</span> (stripeMode, paidOrders) + <span className="text-[#D49A63]">/api/orders</span> (snapshot TVA : net/vat/total/vatCountry) + <span className="text-[#D49A63]">/api/shipments/:orderId</span> (carrier/tracking/status/estimatedDelivery) · Logistique : <span className="text-[#D49A63]">src/lib/countryFulfillment.ts</span> (FR 82/BE 76) + <span className="text-[#D49A63]">src/lib/shippingRules.ts</span> (tarifs 4,90€/6,90€, gratuit dès 60/80€) + <span className="text-[#D49A63]">src/lib/shippingService.ts</span> (URL tracking).
        </p>
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <Eye className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>C23 — ce qui est livré :</strong> une vue <strong>TEST→LIVE par pays</strong> (FR pilote 82, BE 76 en attente de preuve, SN 71 veille) avec garde <code>sk_live + 8 gates</code>, une <strong>facturation reconstituable</strong> même en TEST (HT/TVA/TTC + breakdown par taux + VIES), et un <strong>suivi livraison borné</strong> (tracking réel obligatoire, historique horodaté, synchronisation statut commande). Aucune estimation n'est affichée comme encaissement réel.</span>
      </div>

      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C23 — bornes : <span className="text-[#D49A63]">FR82/BE76</span> = scores <code>docs/sourcing/pays_scoring.md</code> · LIVE = <code>getStripeModeForCountry(FR|BE, sk_live)</code> · Facture = <code>server.ts /api/stripe/create-checkout-session</code> snapshot + <code>src/lib/checkoutVat.ts</code> · Suivi = <code>PATCH /api/admin/shipments/:orderId</code> → <code>upsertShipment</code> (garde anti-fake) → <code>updateOrderStatus</code>.</p>
    </div>
  );
};
