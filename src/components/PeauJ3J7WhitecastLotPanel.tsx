import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, Eye, Package, RefreshCw, Send, CheckCircle2, XCircle, Copy, Check, Truck, Beaker } from 'lucide-react';

type Prospect = { id: string; name: string; status: string; followUpOn?: string; updatedAt?: string };

const J0_IDS = ['Laboratoire Naturcos','Cosmetic Factory','BioSphère Lab','Atelier des Sens','Dakar Lab Cosmetique'];

type RowExtra = { relanceSent?: boolean; whitecast?: 'faible'|'modere'|'eleve'|''; sampleValidated?: boolean; lotQty?: string; notes?: string };

const STORAGE_KEY = 'kurla_c22p2_whitecast_lot';

function loadExtras(): Record<string,RowExtra>{
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); }catch{ return {}; }
}
function saveExtras(v: Record<string,RowExtra>){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); }catch{}
}

const RELANCE_TEMPLATE = (name:string)=> `Objet: Re: KURLA — kits peau V-VI safe (relance J+3) — ${name}

Bonjour l'équipe ${name},

Petite relance suite à mon mail J0 (kits peau V-VI safe 49,70/62/84,90€, MOQ 50, test whitecast V-VI). Avez-vous eu le temps de regarder le cahier 15 actifs + 3 kits ?

Besoin rapide pour caler J+7 :
- disponibilité MOQ 50 et prix HT 50/100 ?
- délai échantillon 1 kit complet ?
- whitecast V-VI testé lumière du jour ?

Même si un point bloque, un retour court suffit — on cale.

Merci,
KURLA — pôle peau — préco 3–5j lun/jeu 18h`;

export const PeauJ3J7WhitecastLotPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [extras, setExtras] = useState<Record<string,RowExtra>>(()=> loadExtras());
  const [copiedId, setCopiedId] = useState<string|null>(null);

  const load = useCallback(async()=>{
    setLoading(true); setError('');
    try{
      const res = await fetch('/api/admin/sourcing/prospects', { headers });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||'Prospects indisponibles');
      setProspects((data.prospects||[]) as Prospect[]);
    }catch(e:any){ setError(e.message||'Chargement impossible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);
  useEffect(()=>{ saveExtras(extras); }, [extras]);

  const byName = new Map(prospects.map(p=>[p.name.toLowerCase(), p]));
  const j0Prospects = J0_IDS.map(name=> byName.get(name.toLowerCase()) || { id:name, name, status:'to_contact' } as Prospect);

  const counts = {
    emailed: j0Prospects.filter(p=> ['emailed','followed_up','replied','in_negotiation','samples_sent','agreed'].includes(p.status)).length,
    replied: j0Prospects.filter(p=> ['replied','in_negotiation','samples_sent','agreed'].includes(p.status)).length,
    whitecastOk: J0_IDS.filter(id=> extras[id]?.whitecast==='faible' && extras[id]?.sampleValidated).length,
    lotReady: J0_IDS.filter(id=> extras[id]?.lotQty && Number(extras[id].lotQty)>=50 && extras[id]?.whitecast==='faible').length,
  };
  const needRelance = j0Prospects.filter(p=> p.status==='emailed' && !extras[p.name]?.relanceSent).length;

  const updateExtra = (id:string, patch: Partial<RowExtra>)=>{
    setExtras(prev=> ({ ...prev, [id]: { ...(prev[id]||{}), ...patch } }));
  };

  const copy = async (id:string, text:string)=>{
    try{ await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(()=>setCopiedId(null),2200); }catch{}
  };

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-sky-500/20 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-400" /> C22 P2 — J+3/J+7 + whitecast V–VI + lot 50
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold">relance → échantillon → lot</span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            <strong className="text-kurla-cream">J+3 relance</strong> si silence (emailed sans réponse) → <strong className="text-sky-300">J+7 bilan &gt;30% (2/5) + 1 whitecast faible</strong> → <strong className="text-emerald-300">J+10 échantillon</strong> photo V–VI lumière du jour → <strong className="text-kurla-amber">J+14 lot 50</strong> si whitecast faible + PIF/CPSR/CPNP fichier+date. Une case cochée sans preuve fichier+date ne passe pas le gate.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-kurla-ink border border-amber-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">À relancer J+3</p><p className="text-xl font-bold text-amber-300">{needRelance}</p><p className="text-[10px] text-kurla-cream/40">emailed sans relance</p></div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-sky-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-sky-300">Réponses J+7</p><p className="text-xl font-bold text-sky-300">{counts.replied}/5</p><p className="text-[10px] text-kurla-cream/40">cible ≥2</p></div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-emerald-500/20 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Whitecast faible</p><p className="text-xl font-bold text-emerald-300">{counts.whitecastOk}/5</p><p className="text-[10px] text-kurla-cream/40">échantillon validé</p></div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-copper/30 text-center"><p className="text-[10px] uppercase tracking-wider font-bold text-kurla-copper">Lots 50 prêts</p><p className="text-xl font-bold text-kurla-copper">{counts.lotReady}/5</p><p className="text-[10px] text-kurla-cream/40">whitecast faible + qty≥50</p></div>
      </div>

      <div className="space-y-3">
        {J0_IDS.map(id=>{
          const prospect = byName.get(id.toLowerCase());
          const status = prospect?.status || 'to_contact';
          const ex = extras[id] || {};
          const isEmailed = ['emailed','followed_up','replied','in_negotiation','samples_sent','agreed'].includes(status);
          const needsRelance = status==='emailed' && !ex.relanceSent;
          return (
            <div key={id} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-kurla-cream">{id}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${status==='to_contact' ? 'bg-kurla-cream/5 text-kurla-cream/50 border-kurla-cream/10' : status==='emailed' ? 'bg-sky-500/10 text-sky-300 border-sky-500/30' : status==='replied' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>{status}</span>
                    {prospect?.updatedAt && <span className="text-[10px] text-kurla-cream/40">maj {new Date(prospect.updatedAt).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <p className="text-[11px] text-kurla-cream/55 mt-1">Relance J+3 si emailed sans réponse → whitecast J+10 → lot 50 J+14 si PIF/CPSR/CPNP fichier+date</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={()=>copy(id+'-relance', RELANCE_TEMPLATE(id))} disabled={!needsRelance}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${needsRelance ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-kurla-cream/10 text-kurla-cream/30 cursor-not-allowed'}`}>
                    {copiedId===id+'-relance' ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />} {copiedId===id+'-relance'?'Copié':'Copier relance J+3'}
                  </button>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-kurla-espresso border border-kurla-cream/15 text-xs cursor-pointer">
                    <input type="checkbox" checked={!!ex.relanceSent} onChange={e=>updateExtra(id,{ relanceSent:e.target.checked })} /> Relance envoyée
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber flex items-center gap-1"><Eye className="w-3 h-3" /> Whitecast V–VI (lumière du jour)</span>
                  <select value={ex.whitecast||''} onChange={e=>updateExtra(id,{ whitecast:e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/15 text-xs text-kurla-cream focus:outline-none focus:border-kurla-copper">
                    <option value="">— à tester —</option>
                    <option value="faible">faible (invisible) — OK</option>
                    <option value="modere">modéré — à optimiser</option>
                    <option value="eleve">élevé (trace blanche) — NOK</option>
                  </select>
                  <span className={`text-[11px] ${ex.whitecast==='faible'?'text-emerald-300':ex.whitecast==='eleve'?'text-rose-300':'text-kurla-cream/50'}`}>
                    {ex.whitecast==='faible' ? '✓ Gate échantillon au vert si PIF/CPSR/CPNP fournis' : ex.whitecast==='eleve' ? '✗ Écarter ce SPF — repasser en hybride/organique' : 'Photo V–VI requise avant lot'}
                  </span>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber flex items-center gap-1"><Beaker className="w-3 h-3" /> Échantillon validé</span>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!ex.sampleValidated} onChange={e=>updateExtra(id,{ sampleValidated:e.target.checked })} className="accent-emerald-500" />
                    <span className="text-xs text-kurla-cream/70">{ex.sampleValidated ? 'Kit reçu + test OK' : 'En attente kit'}</span>
                  </div>
                  <p className="text-[10px] text-kurla-cream/40">1 kit complet avant lot — pas de lot sans échantillon</p>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber flex items-center gap-1"><Package className="w-3 h-3" /> Lot à commander</span>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} step={10} value={ex.lotQty||''} onChange={e=>updateExtra(id,{ lotQty:e.target.value })}
                      placeholder="50" className="w-20 px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-cream/15 text-xs text-kurla-cream font-mono focus:outline-none focus:border-kurla-copper" />
                    <span className="text-xs text-kurla-cream/50">unités</span>
                    {ex.lotQty && Number(ex.lotQty)>=50 && ex.whitecast==='faible' && ex.sampleValidated && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">Prêt J+14</span>}
                    {ex.lotQty && Number(ex.lotQty)>=50 && (!ex.sampleValidated || ex.whitecast!=='faible') && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">Bloqué</span>}
                  </div>
                  <p className="text-[10px] text-kurla-cream/40">MOQ 50–100 — lot créé dans <code className="px-1 py-0.5 rounded bg-kurla-espresso border border-kurla-cream/10">Lots & traçabilité</code></p>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${isEmailed?'bg-sky-500/10 text-sky-300 border-sky-500/20':'bg-kurla-cream/5 text-kurla-cream/40 border-kurla-cream/10'}`}>J0 mailed {isEmailed?'✓':''}</span>
                <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${ex.relanceSent?'bg-emerald-500/10 text-emerald-300 border-emerald-500/20':'bg-kurla-cream/5 text-kurla-cream/40 border-kurla-cream/10'}`}>J+3 relance {ex.relanceSent?'✓':''}</span>
                <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${ex.whitecast==='faible'&&ex.sampleValidated?'bg-emerald-500/10 text-emerald-300 border-emerald-500/20':'bg-kurla-cream/5 text-kurla-cream/40 border-kurla-cream/10'}`}>J+10 échantillon {ex.whitecast==='faible'&&ex.sampleValidated?'✓ whitecast faible':''}</span>
                <span className={`px-2 py-1 rounded-full border text-[10px] font-bold ${ex.lotQty&&Number(ex.lotQty)>=50&&ex.whitecast==='faible'&&ex.sampleValidated?'bg-emerald-500/10 text-emerald-300 border-emerald-500/20':'bg-kurla-cream/5 text-kurla-cream/40 border-kurla-cream/10'}`}>J+14 lot 50 {ex.lotQty&&Number(ex.lotQty)>=50?'✓':''}</span>
                <a href="#batches" className="ml-auto px-3 py-1 rounded-full bg-kurla-copper/20 border border-kurla-copper/30 text-kurla-amber text-xs font-bold flex items-center gap-1"><Truck className="w-3 h-3" /> Créer lot →</a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <Send className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>Règle P2 :</strong> Pas de lot sans <strong>échantillon + whitecast faible V–VI + PIF/CPSR/CPNP fichier+date</strong>. Un lot créé avant bloque le gate « dossier » et fausse la marge — le coût servi se calcule sur du réel. Le suivi <code>relanceSent/whitecast/sampleValidated/lotQty</code> est stocké en <code>localStorage</code> (poste admin) — à terme, remontera vers <code>prospects.followUpOn</code> + <code>supplier_documents</code> + <code>batches</code>.</span>
      </div>

      <p className="text-[10px] text-kurla-cream/35 text-center leading-relaxed">C22 P2 — suivi <span className="text-kurla-amber">localStorage {`kurla_c22p2_whitecast_lot`}</span> + live <span className="text-kurla-amber">/api/admin/sourcing/prospects</span> (5 J0). Relance J+3, bilan J+7, échantillon J+10 lumière du jour, lot 50 J+14 uniquement si whitecast faible + PIF/CPSR/CPNP. Aucune commande avant gate vert.</p>
    </div>
  );
};
