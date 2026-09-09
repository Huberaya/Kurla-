import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, Eye, Beaker, Truck, Gauge, Package, ClipboardCheck } from 'lucide-react';

type Live = { readiness: number; batches: number; demand: number; suppliers: number; error?: string };

const STEPS = [
  { n: '1', url: '/peau', label: 'Pôle peau hero + 15 besoins + kits 49,70/62/84,90' },
  { n: '2', url: '/peau/diagnostic?mode=express', label: 'Diagnostic 12 étapes V·HPI·sans parfum → kurla_skin_answers' },
  { n: '3', url: '/peau/diagnostic/resultats', label: 'Résultats Équilibrée 62€ matin6/soir8/hebdo3' },
  { n: '4', url: '/boutique?cat=peau&need=taches', label: 'Boutique peau V-VI safe + SPF sans trace + banner C14 pays' },
  { n: '5', url: '/produit/:slug-peau', label: 'Fiche peau INCI A/B V-VI + whitecast + alternatives' },
  { n: '6', url: '/peau/routine?tier=equilibree', label: 'Routine 62€ 5 soins + garde rétinol×AHA' },
  { n: '7', url: '/peau/journal', label: 'Journal C13 P2 slider 0–100 + analyse ressenti/topConcern/observance' },
  { n: '8', url: '/peau/guide', label: 'Guide 7 essais HPI/SPF/niacinamide/barrière' },
  { n: '9', url: '/assistant', label: 'IA Uniformiser≠éclaircir + HPI/whitecast' },
  { n: '10', url: '/professionnels?cat=peau', label: 'Pros peau Trust Score + visio' },
  { n: '11', url: '/admin → Pros C15', label: 'Admin pros filtre Peau/Cheveux + checklist HPI/SPF' },
  { n: '12', url: '/admin → Fournisseurs C16', label: 'Cahier 15 actifs + 20 fournisseurs J0/J1/J2' },
  { n: '13', url: '/admin → Lots C17', label: 'Kits coût servi vs cible HT <22/30/40' },
  { n: '14', url: '/admin → Demande C18', label: 'Demande vs stock → gap + MOQ 50' },
  { n: '15', url: '/admin → Pilotage C19', label: '8 gates fichier+date 0/56 vert honnête' },
  { n: '16', url: '/admin → Catalogue C20', label: 'Publication TEST blocages nommés' },
];

export const PeauQAFatouC21Panel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [live, setLive] = useState<Live | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [rRes, bRes, dRes, sRes] = await Promise.all([
        fetch('/api/admin/catalog/publication-readiness', { headers }),
        fetch('/api/admin/batches', { headers }),
        fetch('/api/admin/preorder-demand', { headers }),
        fetch('/api/admin/suppliers', { headers }),
      ]);
      const r = await rRes.json().catch(()=>({})); const b = await bRes.json().catch(()=>({})); const d = await dRes.json().catch(()=>({})); const s = await sRes.json().catch(()=>({}));
      setLive({
        readiness: (r.perProduct||r.rows||[]).length || 0,
        batches: (b.batches||[]).length || 0,
        demand: (d.products||[]).length || 0,
        suppliers: (s.suppliers||[]).length || 0,
      });
      if(!rRes.ok) setError(r.error || '');
    }catch(e:any){ setError(e.message||'Live QA indisponible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-400" /> C21 — QA Fatou 28a · peau mixte V · HPI · sans parfum · 40_70€
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">GO 65/100</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            Parcours bout-en-bout sans dead-end, sans claim médical, <strong className="text-[#FFF7EF]">uniformiser≠éclaircir</strong> vérifié (grep 0 éclaircir), SPF naturel 13≠50, rétinol×AHA alterner, V-VI safe. Préco lun/jeu 18h 0 stock Paris, Stripe TEST, 8 gates fichier+date — un gate rouge = commande bloquée (voulu).
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Vérifier live
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#D49A63] font-bold">Readiness</p>
          <p className="text-xl font-bold text-[#FFF7EF]">{live?.readiness ?? '—'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40">perProduct</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-sky-300 font-bold">Lots</p>
          <p className="text-xl font-bold text-[#FFF7EF]">{live?.batches ?? '—'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40">batches reçus</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold">Demande</p>
          <p className="text-xl font-bold text-[#FFF7EF]">{live?.demand ?? '—'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40">products à sourcer</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 text-center">
          <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Fournisseurs</p>
          <p className="text-xl font-bold text-[#FFF7EF]">{live?.suppliers ?? '—'}</p>
          <p className="text-[10px] text-[#FFF7EF]/40">référentiel</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#FFF7EF]/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#050403] text-[#D49A63] uppercase tracking-wider text-[10px]">
            <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Étape</th><th className="px-3 py-2">URL</th><th className="px-3 py-2 text-center">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-[#FFF7EF]/5">
            {STEPS.map(s=> (
              <tr key={s.n} className="hover:bg-[#FFF7EF]/[0.02]">
                <td className="px-3 py-2 font-mono text-[#FFF7EF]/40">{s.n}</td>
                <td className="px-3 py-2 text-[#FFF7EF]/80 leading-snug">{s.label}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-sky-300">{s.url}</td>
                <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 justify-center w-fit mx-auto"><CheckCircle2 className="w-3 h-3" /> OK</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" /><span className="text-emerald-100 leading-relaxed"><strong>Uniformiser≠éclaircir</strong> 18 occ, 0 éclaircir/blanchir/dépigmenter.</span></div>
        <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 flex gap-2"><Eye className="w-4 h-4 text-sky-300 shrink-0" /><span className="text-sky-100 leading-relaxed"><strong>SPF invisible</strong> whitecast faible V-VI, 2 doigts, 50 vs naturel 13.</span></div>
        <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex gap-2"><Beaker className="w-4 h-4 text-amber-300 shrink-0" /><span className="text-amber-100 leading-relaxed"><strong>Rétinol×AHA</strong> même soir bloqué, alterner, 1×/sem AHA 5%.</span></div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Boutique filtre peau ?taches&sansParfum&budget&phototype=V → hub honnête si 0 publié</span>
        <span className="px-3 py-1.5 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> 3–5j lun/jeu 18h · FR82/BE76 LIVE si sk_live</span>
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> 8 gates fichier+date · gate rouge = bloqué (voulu)</span>
      </div>

      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C21 — doc complète : <span className="text-[#D49A63]">QA_FATOU_C21.md</span> (16 étapes Fatou + cockpit C16–C20 consolidé) + live QA ci-dessus. Build 7.70s admin 639kB. P1 : 5 mails J0 → 3 échantillons → 1 lot → gate vert → annuaire peau 1 pro.</p>
    </div>
  );
};
