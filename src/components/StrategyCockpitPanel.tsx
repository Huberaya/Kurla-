import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Circle, Loader2, RefreshCw, Target,
  Rocket, Crown, Building2, ShieldAlert, Sparkles, ShoppingBag,
} from 'lucide-react';

type Props = { headers: HeadersInit };

type Kpi = {
  id: string; phase: number; theme: string; label: string;
  unit: 'count' | 'euro' | 'percent' | 'ratio'; target: number | null;
  higherIsBetter: boolean; description: string;
  measure: number | null; measureNote?: string;
};

type Milestone = { id: string; label: string; source?: string; done: boolean };
type Phase = {
  level: number; id: string; title: string; horizon: string; goal: string;
  exitCriteria: string; milestones: Milestone[];
};
type Cockpit = {
  generatedAt: string;
  summary: {
    monthlyRecurringRevenueEur: number; productRevenueEur: number;
    productsPublished: number; ingredients: number; ordersPaid: number; members: number;
  };
  phases: Phase[];
  kpis: Kpi[];
};

const fmt = (k: Kpi): string => {
  if (k.measure === null || k.measure === undefined) return '—';
  if (k.unit === 'euro') return `${k.measure.toLocaleString('fr-FR')} €`;
  if (k.unit === 'percent') return `${k.measure} %`;
  if (k.unit === 'ratio') return k.measure ? 'Oui' : 'Non';
  return k.measure.toLocaleString('fr-FR');
};
const fmtTarget = (k: Kpi): string => {
  if (k.target === null) return 'cible à fixer';
  if (k.unit === 'euro') return `objectif ${k.target.toLocaleString('fr-FR')} €`;
  if (k.unit === 'percent') return `objectif ${k.target} %`;
  return `objectif ${k.target.toLocaleString('fr-FR')}`;
};

const REVENUE_LINES = [
  { id: 'retail', icon: <ShoppingBag className="w-4 h-4" />, label: '1 · Retail / marketplace', mechanic: 'Achat-revente puis commission 15-30 %', margin: 'Marge moyenne', now: true },
  { id: 'services', icon: <Building2 className="w-4 h-4" />, label: '2 · Services professionnels', mechanic: 'Commission 15-25 % sur prestation', margin: 'Bonne', now: false },
  { id: 'plus', icon: <Crown className="w-4 h-4" />, label: '3 · Abonnement KURLA+', mechanic: '5-9 €/mois (confort, pas l’honnêteté)', margin: 'Très bonne', now: false },
  { id: 'pro', icon: <Rocket className="w-4 h-4" />, label: '4 · Abonnement KURLA Pro', mechanic: '29-99 €/mois (pros/salons)', margin: 'Très bonne', now: false },
  { id: 'b2b', icon: <Sparkles className="w-4 h-4" />, label: '5 · KURLA Intelligence B2B', mechanic: 'Agrégats k-anonymes, Texture Gap Report, API', margin: 'Excellente', now: false },
];

export function StrategyCockpitPanel({ headers }: Props) {
  const [data, setData] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/strategy/cockpit', { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Chargement impossible');
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [headers]);
  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#FFF7EF]/60"><Loader2 className="w-6 h-6 animate-spin text-[#C8753D] mr-2" /> Calcul du cockpit stratégique…</div>;
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div><p className="font-bold mb-1">Cockpit indisponible</p><p className="text-rose-200/80">{error}</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C8753D] text-white text-xs font-bold"><RefreshCw className="w-3.5 h-3.5" /> Réessayer</button>
        </div>
      </div>
    );
  }

  const s = data.summary;
  const doneCount = data.phases.reduce((n, p) => n + p.milestones.filter(m => m.done).length, 0);
  const totalCount = data.phases.reduce((n, p) => n + p.milestones.length, 0);

  const stat = (label: string, value: string, hint?: string) => (
    <div className="rounded-2xl bg-[#050403] border border-[#FFF7EF]/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">{label}</p>
      <p className="text-2xl font-bold text-[#FFF7EF] mt-1">{value}</p>
      {hint && <p className="text-[10px] text-[#C8753D] mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2"><Target className="w-5 h-5 text-[#C8753D]" /> Stratégie & mise en œuvre du modèle économique</h2>
          <p className="text-xs text-[#FFF7EF]/55 mt-1">Feuille de route exécutable, KPI mesurés sur la base réelle. Les cibles sont des objectifs ; les valeurs affichées sont les chiffres constatés.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A0F0A] border border-[#FFF7EF]/15 text-[#FFF7EF]/80 text-xs hover:border-[#C8753D]/50"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
      </div>

      {/* Synthèse revenu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stat('Revenu produits (encaissé)', `${s.productRevenueEur.toLocaleString('fr-FR')} €`, s.ordersPaid === 0 ? 'aucune commande payée pour l’instant' : `${s.ordersPaid} commande(s)`)}
        {stat('Revenu récurrent (MRR)', `${s.monthlyRecurringRevenueEur.toLocaleString('fr-FR')} € /mois`, 'KURLA+ / Pro actifs')}
        {stat('Avancement feuille de route', `${doneCount}/${totalCount} jalons`, 'voir phases ci-dessous')}
        {stat('Catalogue & graphe', `${s.productsPublished} produits · ${s.ingredients} ingr.`, `${s.members} membre(s) inscrit(s)`)}
      </div>

      {/* Lignes de revenu */}
      <div className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5">
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-4">Cinq lignes de revenu, dans l’ordre de l’audit</h3>
        <div className="space-y-2">
          {REVENUE_LINES.map(l => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl bg-[#050403] border border-[#FFF7EF]/8 px-4 py-3">
              <span className="text-[#C8753D] shrink-0">{l.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#FFF7EF]">{l.label}</p>
                <p className="text-[11px] text-[#FFF7EF]/55">{l.mechanic}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-[#D49A63] font-bold">{l.margin}</p>
                {l.now
                  ? <p className="text-[10px] text-emerald-300 font-bold mt-0.5">Phase active</p>
                  : <p className="text-[10px] text-[#FFF7EF]/40 mt-0.5">Plus tard</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-[#C8753D]/8 border border-[#C8753D]/20 p-3 flex gap-2">
          <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FFF7EF]/75 leading-relaxed">
            <strong className="text-[#FFF7EF]">Ligne rouge :</strong> diagnostic, profil, explication des conseils et transparence ingrédient restent <strong>gratuits</strong>. L’abonnement vend du confort, jamais l’accès à l’honnêteté. La donnée B2B (agrégats k-anonymes) n’est monétisée qu’une fois la confiance acquise.
          </p>
        </div>
      </div>

      {/* Roadmap */}
      <div className="space-y-4">
        {data.phases.map(phase => {
          const done = phase.milestones.filter(m => m.done).length;
          const pct = Math.round((done / phase.milestones.length) * 100);
          return (
            <div key={phase.id} className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#C8753D] font-bold">Niveau {phase.level} · {phase.horizon}</p>
                  <h3 className="text-base font-bold text-[#FFF7EF] mt-0.5">{phase.title}</h3>
                  <p className="text-[11px] text-[#FFF7EF]/60 mt-1 max-w-2xl">{phase.goal}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-[#FFF7EF]">{done}/{phase.milestones.length}</p>
                  <div className="w-28 h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden mt-1">
                    <div className="h-full bg-[#C8753D]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {phase.milestones.map(m => (
                  <div key={m.id} className="flex items-start gap-2 text-[11px] text-[#FFF7EF]/75">
                    {m.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <Circle className="w-3.5 h-3.5 text-[#FFF7EF]/30 shrink-0 mt-0.5" />}
                    <span className={m.done ? '' : 'text-[#FFF7EF]/60'}>{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-[#050403] border border-[#FFF7EF]/8 px-3 py-2">
                <p className="text-[10px] text-[#D49A63] font-bold">Critère de sortie</p>
                <p className="text-[11px] text-[#FFF7EF]/65 mt-0.5">{phase.exitCriteria}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI par thème */}
      <div className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5">
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-4">Indicateurs clés (valeur réelle vs objectif)</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.kpis.map(k => {
            const missing = k.measure === null;
            return (
              <div key={k.id} className={`rounded-xl border p-3 ${missing ? 'bg-[#050403] border-[#FFF7EF]/8' : 'bg-[#050403] border-[#C8753D]/25'}`}>
                <p className="text-[10px] text-[#FFF7EF]/45">{k.theme}</p>
                <p className="text-[11px] font-bold text-[#FFF7EF] mt-0.5 leading-tight">{k.label}</p>
                <p className={`text-lg font-bold mt-1 ${missing ? 'text-[#FFF7EF]/35' : 'text-[#FFF7EF]'}`}>{fmt(k)}</p>
                <p className="text-[10px] text-[#C8753D]/80 mt-0.5">{fmtTarget(k)}</p>
                {k.measureNote && <p className="text-[10px] text-amber-300/70 mt-1 italic">{k.measureNote}</p>}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[#FFF7EF]/40 mt-4 italic">Les indicateurs « — » ne sont pas encore mesurables (analytics, B2B, activité mensuelle) : ils s’activeront avec les phases correspondantes. Aucun chiffre de revenu n’est estimé à la place du réel.</p>
      </div>
    </div>
  );
}
