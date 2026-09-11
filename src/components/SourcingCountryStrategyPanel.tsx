import React, { useCallback, useEffect, useState } from 'react';
import { Globe, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Clock, Package, Factory } from 'lucide-react';

type StrategyRow = {
  country_code: string;
  label: string;
  track: 'A_resale' | 'B_make';
  score: number;
  wave: 1 | 2 | 3;
  model: string;
  moq_target?: string | null;
  lead_time_fr?: string | null;
  margin_target?: string | null;
  prospects: string[];
  requires_rp: boolean;
};

type Props = { headers: HeadersInit };

const WAVE_LABEL: Record<number, string> = {
  1: 'Vague 1 — nous allons commencer par ce pays',
  2: 'Vague 2 — après 30 commandes FR à marge positive',
  3: 'Vague 3 — seulement sur preuves RP + marge après douane',
};

const TRACK_LABEL: Record<string, string> = {
  A_resale: 'Revente',
  B_make: 'Façonnage',
};

export const SourcingCountryStrategyPanel: React.FC<Props> = ({ headers }) => {
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch('/api/admin/sourcing/strategy', { headers }),
        fetch('/api/admin/sourcing/prospects', { headers }),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      if (!sRes.ok) throw new Error(sData.error || 'Stratégie indisponible');
      setRows(sData.strategy || []);
      setProspects(pData.prospects || []);
    } catch (e: any) {
      setError(e.message || 'Chargement échoué');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const prospectById = new Map(prospects.map(p => [p.id, p]));

  const scoreTone = (score: number) => score >= 30 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : score >= 24 ? 'text-amber-300 border-amber-500/30 bg-amber-500/10' : 'text-rose-300 border-rose-500/30 bg-rose-500/10';
  const waveTone = (w: number) => w === 1 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : w === 2 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

  if (loading) return <div className="p-6 rounded-2xl bg-kurla-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement matrice pays…</div>;
  if (error) return <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>;

  const resale = rows.filter(r => r.track === 'A_resale');
  const make = rows.filter(r => r.track === 'B_make');

  const GateBar = () => (
    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200">
      <span className="font-bold">8 gates fichier+date avant commande :</span> tarif HT écrit · MOQ ≤12 · délai FR ≤5j (NL 72h) · marge HT ≥34% · CPNP+RP UE · INCI+visuels · échantillon 4C/SPF 0 trace · franco chiffré. <span className="text-amber-300/80">Un gate rouge = pays bloqué.</span>
    </div>
  );

  const RowCard = ({ r }: { r: StrategyRow }) => {
    const linked = (r.prospects || []).map(id => prospectById.get(id)).filter(Boolean);
    const agreed = linked.filter(p => p.status === 'agreed' || p.decision === 'accepted').length;
    const inTouch = linked.filter(p => ['emailed','followed_up','replied','in_negotiation','samples_sent'].includes(p.status)).length;
    return (
      <div className="rounded-2xl bg-kurla-ink border border-kurla-cream/10 overflow-hidden">
        <div className="p-4 flex items-start gap-3 flex-wrap">
          <div className={`px-2.5 py-1 rounded-xl border text-xs font-bold ${scoreTone(r.score)}`}>{r.score}/40</div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-kurla-cream">{r.label}</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${waveTone(r.wave)}`}>Vague {r.wave}</span>
              <span className="px-2 py-0.5 rounded-full bg-kurla-espresso border border-kurla-cream/15 text-[10px] text-kurla-cream/60 flex items-center gap-1">{r.track === 'B_make' ? <Factory className="w-3 h-3"/> : <Package className="w-3 h-3"/>}{TRACK_LABEL[r.track]}</span>
            </div>
            <p className="text-[11px] text-kurla-amber mt-1 font-semibold">{r.model}</p>
            <p className="text-[10px] text-kurla-cream/55 mt-1">MOQ {r.moq_target || '—'} · Délai {r.lead_time_fr || '—'} · Marge {r.margin_target || '—'} {r.requires_rp ? '· RP UE requis' : '· RP non requis (matière)'}</p>
            <p className="text-[10px] text-kurla-cream/45 mt-1 italic">{WAVE_LABEL[r.wave]}</p>
          </div>
          <div className="text-right text-[10px] space-y-1">
            <div className="flex items-center gap-1 justify-end text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5"/>{agreed} accord(s)</div>
            <div className="flex items-center gap-1 justify-end text-sky-300"><Clock className="w-3.5 h-3.5"/>{inTouch} en cours</div>
            <div className="text-kurla-cream/40">{linked.length} prospect(s)</div>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {(r.prospects || []).map(pid => {
              const p = prospectById.get(pid);
              if (!p) return <span key={pid} className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px]">{pid} · inconnu</span>;
              const tone = p.status === 'agreed' || p.decision === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : ['emailed','followed_up','replied','in_negotiation','samples_sent'].includes(p.status) ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : p.status === 'to_contact' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-kurla-cream/10 bg-kurla-espresso text-kurla-cream/60';
              return <span key={pid} className={`px-2 py-1 rounded-lg border text-[10px] flex items-center gap-1 ${tone}`} title={`${p.name} — ${p.status}`}>{p.name} <span className="opacity-60">· {p.status}</span></span>;
            })}
            {(r.prospects || []).length === 0 && <span className="text-[10px] text-kurla-cream/40 italic">Aucun prospect rattaché — à qualifier</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2"><Globe className="w-5 h-5 text-kurla-copper"/> Matrice sourcing par pays — segmentée</h3>
          <p className="text-[11px] text-kurla-cream/60 mt-1">L’Europe et l’Afrique ne sont pas des blocs. Score /40 sur 10 critères pondérés · vague décidée · modèle d’entrée nommé · ouverture uniquement sur 8 gates fichier+date. Source : <span className="text-kurla-amber">sourcing_country_strategy</span> + <span className="text-kurla-amber">sourcingCountryScore.ts</span></p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-copper/30 text-kurla-cream text-[11px] flex items-center gap-2 hover:bg-kurla-copper/10"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}/> Actualiser</button>
      </div>

      <GateBar />

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center"><div className="text-xl font-bold text-emerald-300">{rows.filter(r=>r.wave===1).length}</div><div className="text-[10px] text-emerald-200/70">Vague 1 — nous allons commencer</div></div>
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center"><div className="text-xl font-bold text-amber-300">{rows.filter(r=>r.wave===2).length}</div><div className="text-[10px] text-amber-200/70">Vague 2 — après 30 cmd FR</div></div>
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center"><div className="text-xl font-bold text-rose-300">{rows.filter(r=>r.wave===3).length}</div><div className="text-[10px] text-rose-200/70">Vague 3 — preuves douane/RP</div></div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-kurla-amber uppercase tracking-wider flex items-center gap-1.5"><Package className="w-3.5 h-3.5"/> Piste A — Revente (acheter pour revendre)</h4>
        {resale.sort((a,b)=>b.score-a.score).map(r => <RowCard key={r.country_code} r={r} />)}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-kurla-amber uppercase tracking-wider flex items-center gap-1.5"><Factory className="w-3.5 h-3.5"/> Piste B — Façonnage (fabriquer KURLA)</h4>
        {make.sort((a,b)=>b.score-a.score).map(r => <RowCard key={r.country_code} r={r} />)}
      </div>

      <p className="text-[10px] text-kurla-cream/40 text-center">Scores détaillés : voir <span className="text-kurla-amber">docs/sourcing/STRATEGIE_SOURCING_SEGMENTEE_PAYS_2026-09-10.md</span>. Aucun pays n’ouvre sans ses 8 gates au vert. Le suivi prospect (emailed → replied → agreed) alimente automatiquement les compteurs ci-dessus.</p>
    </div>
  );
};
