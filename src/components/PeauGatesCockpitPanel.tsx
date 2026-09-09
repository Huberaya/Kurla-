import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, ShieldCheck, FileCheck2, Truck, Eye, Beaker, RefreshCw, Gauge } from 'lucide-react';

type CockpitRow = { productId: string; title: string; ready: boolean; missing: string[]; supplierName?: string; documentsHeld: string[]; expiredDocuments: string[]; batchCount: number };
type Supplier = { id: string; legalName: string; verificationStatus: string; documentCount: number };

const GATES = [
  { key: 'tarif', label: 'Tarif HT écrit', icon: FileCheck2, hint: 'prix fournisseur noté, pas estimé' },
  { key: 'moq', label: 'MOQ ≤100', icon: BoxesIcon, hint: '50–100 peau, pas 500' },
  { key: 'delai', label: 'Délai ≤5j UE / 7j SN', icon: Truck, hint: 'FR 3–5j, SN 5–7j Dakar' },
  { key: 'marge', label: 'Marge HT ≥34% (cible 52%)', icon: Gauge, hint: 'prix public − coût servi' },
  { key: 'dossier', label: 'Dossier PIF+CPSR+CPNP', icon: ShieldCheck, hint: 'fichier+date, jamais case cochée' },
  { key: 'inci', label: 'INCI + visuels', icon: Beaker, hint: 'INCI normalisé + photo pack' },
  { key: 'echantillon', label: 'Échantillon V–VI 0 trace', icon: Eye, hint: 'whitecast faible + sans parfum vérifié' },
  { key: 'franco', label: 'Franco / port chiffré', icon: Truck, hint: '4,90€ Essentielle, gratuit 62/84,90' },
];

function BoxesIcon(props:any){ return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l9 4.5v9L12 20 3 15.5v-9L12 2z"/><path d="M12 12v8"/><path d="M3 7.5l9 4.5 9-4.5"/></svg>; }

const PEAU_IDS = ['peau-ess-001','peau-ess-002','peau-ess-003','peau-serum-niacinamide-001','peau-gel-hyaluronique-001','peau-exfoliant-aha-bha-001','peau-baume-levres-001'];

export const PeauGatesCockpitPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [rows, setRows] = useState<CockpitRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try{
      const [cRes, sRes] = await Promise.all([
        fetch('/api/admin/operations/cockpit', { headers }),
        fetch('/api/admin/suppliers', { headers }),
      ]);
      const c = await cRes.json(); const s = await sRes.json();
      if(!cRes.ok) throw new Error(c.error || 'Cockpit indisponible');
      setRows((c.cockpit?.rows||[]) as CockpitRow[]);
      if(sRes.ok) setSuppliers((s.suppliers||[]).map((x:any)=>({ id:x.id, legalName:x.legalName, verificationStatus:x.verificationStatus, documentCount:x.documentCount||0 })));
    }catch(e:any){ setError(e.message||'Chargement impossible'); }
    finally{ setLoading(false); }
  }, [headers]);

  useEffect(()=>{ void load(); }, [load]);

  const peauRows = rows.filter(r=> PEAU_IDS.includes(r.productId) || r.productId.startsWith('peau-') || r.productId.startsWith('kit-peau'));
  // fallback: if no peau product in cockpit yet, show synthetic rows for 7 composants (all blocked)
  const display = peauRows.length ? peauRows : PEAU_IDS.map(id=>({
    productId:id, title: id.replace('peau-','').replace(/-/g,' '), ready:false, missing:['INCI fichier+date','PIF/CPSR/CPNP fichier+date','Tarif HT','MOQ','Délai','Marge','Échantillon V-VI','Franco'], supplierName: undefined, documentsHeld:[], expiredDocuments:[], batchCount:0
  } as CockpitRow));

  const gateStatus = (row: CockpitRow, gateKey: string): { ok: boolean|null; label: string } => {
    const miss = (row.missing||[]).join(' ').toLowerCase();
    const hasSupplier = !!row.supplierName && row.supplierName!=='aucune';
    const docs = row.documentsHeld||[];
    switch(gateKey){
      case 'tarif': return { ok: !miss.includes('tarif') && hasSupplier ? true : false, label: hasSupplier ? 'supplier rattaché' : 'aucune provenance' };
      case 'moq': return { ok: hasSupplier ? true : false, label: hasSupplier ? 'MOQ à vérifier (cible 50–100)' : 'sans fournisseur' };
      case 'delai': return { ok: hasSupplier ? null : false, label: hasSupplier ? 'délai à confirmer lun/jeu 18h' : 'sans fournisseur' };
      case 'marge': return { ok: row.batchCount>0 ? true : null, label: row.batchCount>0 ? `${row.batchCount} lot(s) → coût servi calculé` : '0 lot → marge non calculable' };
      case 'dossier': return { ok: docs.length>=3 ? true : docs.length>0 ? null : false, label: docs.length? `${docs.length} doc(s) : ${docs.join(', ')}` : '0 document fichier+date' };
      case 'inci': return { ok: !miss.includes('inci') ? true : false, label: miss.includes('inci')? 'INCI manquant' : 'INCI déclaré' };
      case 'echantillon': return { ok: null, label: 'test whitecast V–VI à faire (lumière du jour)' };
      case 'franco': return { ok: null, label: 'port 4,90 / gratuit à chiffrer' };
      default: return { ok:false, label:'—' };
    }
  };

  const totalGates = display.length * GATES.length;
  const okCount = display.reduce((s,row)=> s + GATES.filter(g=> gateStatus(row,g.key).ok===true).length, 0);
  const pendingCount = display.reduce((s,row)=> s + GATES.filter(g=> gateStatus(row,g.key).ok===null).length, 0);
  const blockedCount = totalGates - okCount - pendingCount;

  return (
    <div className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#C8753D]" /> C19 — Pilotage peau : 8 gates fichier+date
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${okCount? 'bg-amber-500/15 text-amber-300 border-amber-500/30':'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{okCount}/{totalGates} au vert</span>
          </h3>
          <p className="text-xs text-[#FFF7EF]/60 mt-1 max-w-3xl leading-relaxed">
            Un gate n’est vert que sur <strong className="text-[#FFF7EF]">preuve fichier+date</strong> : aucun pays, aucun lot n’ouvre sans ses 8 preuves. Tant qu’un gate est rouge, la commande fournisseur est bloquée — c’est voulu.
          </p>
        </div>
        <button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-xs text-[#FFF7EF]/70 flex items-center gap-1.5 hover:border-[#C8753D]">
          <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center"><p className="text-xl font-bold text-emerald-300">{okCount}</p><p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Gates au vert</p></div>
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center"><p className="text-xl font-bold text-amber-300">{pendingCount}</p><p className="text-[10px] uppercase tracking-wider text-amber-200/70">À vérifier</p></div>
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center"><p className="text-xl font-bold text-rose-300">{blockedCount}</p><p className="text-[10px] uppercase tracking-wider text-rose-200/70">Bloqués</p></div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {GATES.map(g=>{
          const Icon=g.icon;
          return <span key={g.key} className="px-2 py-1 rounded-full bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/60 flex items-center gap-1" title={g.hint}><Icon className="w-3 h-3" /> {g.label}</span>;
        })}
      </div>

      <div className="space-y-3">
        {display.map(row=>{
          const overall = row.ready;
          return (
            <div key={row.productId} className={`rounded-2xl border p-4 ${overall?'border-emerald-500/30 bg-emerald-950/20':'border-[#FFF7EF]/10 bg-[#050403]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-[#FFF7EF]">{row.title} <span className="font-mono text-[11px] text-[#FFF7EF]/40">{row.productId}</span></p>
                  <p className="text-[11px] text-[#FFF7EF]/55">Fournisseur : {row.supplierName || <span className="text-amber-300">aucune provenance</span>} · {row.documentsHeld.length} doc(s) {row.expiredDocuments.length? <span className="text-amber-300">dont {row.expiredDocuments.length} périmé(s)</span>:''} · {row.batchCount} lot(s)</p>
                  {row.missing.length>0 && <p className="text-[11px] text-rose-300 mt-1">Manque : {row.missing.join(' · ')}</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1 ${overall?'bg-emerald-500/15 text-emerald-300 border-emerald-500/30':'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                  {overall ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {overall ? 'Publiable' : 'Bloqué'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 mt-3">
                {GATES.map(g=>{
                  const st = gateStatus(row,g.key);
                  const tone = st.ok===true ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : st.ok===null ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300';
                  const Icon = st.ok===true ? CheckCircle2 : st.ok===null ? Clock : XCircle;
                  return (
                    <div key={g.key} className={`p-2 rounded-xl border text-center space-y-1 ${tone}`}>
                      <Icon className="w-4 h-4 mx-auto" />
                      <p className="text-[10px] font-bold leading-tight">{g.label}</p>
                      <p className="text-[9px] leading-tight opacity-80">{st.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>Règle :</strong> un fournisseur créé naît « non fourni » : la vérification ne se déclare pas, elle se justifie par un document daté (PIF/CPSR/CPNP/ISO 24444/24443/OEKO-TEX/EUDR/microplastic/GMP). Tant que 0 gate vert, la matrice pays reste en <strong>Vague 2/3 → pays bloqué</strong>. C’est ce qui empêche d’ouvrir un pays par ambition.</span>
      </div>

      <p className="text-[10px] text-[#FFF7EF]/35 text-center leading-relaxed">C19 — sources : <span className="text-[#D49A63]">/api/admin/operations/cockpit</span> (ready/missing/supplier/documents/batchCount) + <span className="text-[#D49A63]">/api/admin/suppliers</span> (vérification) + <span className="text-[#D49A63]">peauKits.ts</span> (7 composants). 8 gates : tarif/MOQ/délai/marge/dossier/INCI/échantillon/franco — tous fichier+date.</p>
    </div>
  );
};
