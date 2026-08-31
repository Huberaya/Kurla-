import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Circle, Loader2, RefreshCw, Target, Rocket, Crown,
  Building2, ShieldAlert, Sparkles, ShoppingBag, Users, Megaphone, TrendingUp,
  Wallet, CalendarDays, ListChecks, ArrowRight, Euro, Gauge,
} from 'lucide-react';
import {
  OFFERS, PERSONAS, POSITIONING, CHANNELS, FUNNEL, PLAN_90,
  FINANCE_PROJECTION, FINANCE_ASSUMPTIONS, BREAKEVEN, STRATEGY_GUARDRAILS,
} from '../lib/businessStrategy';
import { LaunchPlanSection } from './LaunchPlanSection';

type Props = { headers: HeadersInit };

type Kpi = {
  id: string; category: string; label: string; unit: string;
  target3m: number | null; target12m: number | null; deadline: string;
  alertBelow?: number; alertAbove?: number; description: string;
  measure: number | null; measureNote?: string; status: 'unknown' | 'on' | 'behind' | 'alert';
};
type Milestone = { id: string; label: string; auto: boolean; done: boolean };
type Phase = { level: number; id: string; title: string; window: string; goal: string; kpi: string; deadline: string; expected: string; milestones: Milestone[] };
type Action = { priority: 'critical' | 'haute' | 'moyenne'; title: string; detail: string; expected: string; kpi: string; done: boolean };
type Cockpit = {
  generatedAt: string;
  summary: {
    productRevenueEur: number; mrrEur: number; ordersPaid: number; ordersPending: number;
    productsPublished: number; productsTotal: number; demoRemaining: number;
    ingredients: number; ingredientsWithFunctions: number; members: number; appointments: number;
    roadmapDone: number; roadmapTotal: number; paymentsReady: boolean;
  };
  phases: Phase[]; kpis: Kpi[]; actions: Action[];
};

const eur = (v: number | null | undefined) => v === null || v === undefined ? '—' : `${Math.round(v).toLocaleString('fr-FR')} €`;
const num = (v: number | null | undefined) => v === null || v === undefined ? '—' : v.toLocaleString('fr-FR');

const SECTIONS = [
  { id: 'actions', label: 'À faire maintenant', icon: ListChecks },
  { id: 'positioning', label: 'Positionnement', icon: Target },
  { id: 'launch', label: 'Plan de lancement', icon: Rocket },
  { id: 'offers', label: 'Offres & prix', icon: ShoppingBag },
  { id: 'personas', label: 'Cibles', icon: Users },
  { id: 'channels', label: 'Acquisition', icon: Megaphone },
  { id: 'funnel', label: 'Funnel', icon: ArrowRight },
  { id: 'plan90', label: '90 jours', icon: CalendarDays },
  { id: 'roadmap', label: 'Roadmap', icon: Rocket },
  { id: 'kpis', label: 'KPI', icon: Gauge },
  { id: 'finance', label: 'Finance', icon: Wallet },
];

const priorityStyle: Record<Action['priority'], string> = {
  critical: 'border-rose-500/40 bg-rose-500/8',
  haute: 'border-amber-400/40 bg-amber-400/8',
  moyenne: 'border-sky-400/30 bg-sky-400/5',
};
const priorityBadge: Record<Action['priority'], string> = {
  critical: 'bg-rose-500/20 text-rose-200',
  haute: 'bg-amber-400/20 text-amber-200',
  moyenne: 'bg-sky-400/20 text-sky-200',
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 ${className}`}>{children}</div>;
}
function SectionTitle({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#C8753D]" />
      <div>
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold">{title}</h3>
        {sub && <p className="text-[11px] text-[#FFF7EF]/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

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
    } finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-20 text-[#FFF7EF]/60"><Loader2 className="w-6 h-6 animate-spin text-[#C8753D] mr-2" /> Calcul du Business Control Center…</div>;
  if (error || !data) return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-200 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div><p className="font-bold mb-1">Business Control Center indisponible</p><p className="text-rose-200/80">{error}</p>
        <button onClick={load} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#C8753D] text-white text-xs font-bold"><RefreshCw className="w-3.5 h-3.5" /> Réessayer</button></div>
    </div>
  );

  const s = data.summary;
  const stat = (label: string, value: string, hint?: string, alert?: boolean) => (
    <div className={`rounded-2xl bg-[#050403] border p-4 ${alert ? 'border-rose-500/40' : 'border-[#FFF7EF]/10'}`}>
      <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">{label}</p>
      <p className="text-2xl font-bold text-[#FFF7EF] mt-1">{value}</p>
      {hint && <p className={`text-[10px] mt-1 ${alert ? 'text-rose-300' : 'text-[#C8753D]'}`}>{hint}</p>}
    </div>
  );
  const statusDot = (st: Kpi['status']) =>
    st === 'on' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    : st === 'alert' ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
    : st === 'behind' ? <Circle className="w-4 h-4 text-amber-400 shrink-0" />
    : <Circle className="w-4 h-4 text-[#FFF7EF]/25 shrink-0" />;

  return (
    <div className="space-y-6">
      {/* En-tête + nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#C8753D]" /> KURLA Business Control Center</h2>
          <p className="text-xs text-[#FFF7EF]/55 mt-1">Stratégie décidée · valeurs réelles mesurées en base · actions prioritaires. Mis à jour le {new Date(data.generatedAt).toLocaleString('fr-FR')}.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A0F0A] border border-[#FFF7EF]/15 text-[#FFF7EF]/80 text-xs hover:border-[#C8753D]/50"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map(sec => (
          <a key={sec.id} href={`#${sec.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1A0F0A] border border-[#FFF7EF]/10 text-[11px] text-[#FFF7EF]/70 hover:border-[#C8753D]/50 hover:text-[#FFF7EF]">
            <sec.icon className="w-3.5 h-3.5 text-[#C8753D]" /> {sec.label}
          </a>
        ))}
      </div>

      {/* Synthèse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stat('CA produits encaissé', eur(s.productRevenueEur), s.ordersPaid === 0 ? 'aucune commande payée — débloquer le paiement' : `${s.ordersPaid} commande(s) payée(s)`, s.ordersPaid === 0)}
        {stat('Revenu récurrent (MRR)', `${eur(s.mrrEur)}/mois`, `${data.kpis.find(k => k.id === 'plusSubscribers')?.measure ?? 0} KURLA+ · ${data.kpis.find(k => k.id === 'proSubscribers')?.measure ?? 0} Pro`)}
        {stat('Commandes payées / en attente', `${s.ordersPaid} / ${s.ordersPending}`, s.ordersPending > 0 && !s.paymentsReady ? 'paiement en mode test' : undefined, s.ordersPending > 0 && !s.paymentsReady)}
        {stat('Catalogue', `${s.productsPublished} produits`, s.demoRemaining > 0 ? `${s.demoRemaining} produit(s) Démo à retirer` : `${s.ingredients} ingrédients au graphe`, s.demoRemaining > 0)}
      </div>

      {/* ACTIONS */}
      <div id="actions">
        <SectionTitle icon={ListChecks} title="CE QU’IL FAUT FAIRE MAINTENANT" sub="Le moteur transforme les données réelles en décisions, classées par priorité." />
        <div className="space-y-2">
          {data.actions.length === 0 && <Card className="!p-4"><p className="text-xs text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Aucune action bloquante — le moteur réévaluera après actualisation.</p></Card>}
          {data.actions.map((a, i) => (
            <div key={i} className={`rounded-xl border p-4 ${priorityStyle[a.priority]}`}>
              <div className="flex items-start gap-3">
                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${priorityBadge[a.priority]}`}>{a.priority}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#FFF7EF]">{a.title}</p>
                  <p className="text-[11px] text-[#FFF7EF]/65 mt-1 leading-relaxed">{a.detail}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px]">
                    <span className="text-[#D49A63]">→ Résultat attendu : {a.expected}</span>
                    <span className="text-[#FFF7EF]/50">KPI : {a.kpi}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PLAN DE LANCEMENT (catalogue, kits, routines, outils, scénarios, actions) */}
      <div id="launch" className="scroll-mt-4">
        <LaunchPlanSection />
      </div>

      {/* POSITIONNEMENT */}
      <div id="positioning">
        <SectionTitle icon={Target} title="Positionnement choisi" />
        <Card>
          <p className="text-base font-bold text-[#FFF7EF]">« {POSITIONING.oneLiner} »</p>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 mt-4 text-[12px]">
            {[
              ['Promesse', POSITIONING.promise],
              ['Proposition de valeur', POSITIONING.valueProp],
              ['Message principal', POSITIONING.coreMessage],
              ['Différenciation', POSITIONING.differentiation],
              ['Raison de croire', POSITIONING.reasonToBelieve],
              ['Pourquoi KURLA plutôt que Sephora/Amazon/IG', POSITIONING.whyKURLA],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-wider text-[#C8753D] font-bold">{label}</p>
                <p className="text-[#FFF7EF]/75 mt-1 leading-relaxed">{val}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#C8753D]/8 border border-[#C8753D]/20 p-3">
            <p className="text-[10px] text-[#D49A63] font-bold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Lignes rouges non négociables</p>
            <ul className="mt-2 space-y-1">
              {STRATEGY_GUARDRAILS.map((g, i) => <li key={i} className="text-[11px] text-[#FFF7EF]/75 flex gap-2"><span className="text-[#C8753D]">•</span>{g}</li>)}
            </ul>
          </div>
        </Card>
      </div>

      {/* OFFRES */}
      <div id="offers">
        <SectionTitle icon={ShoppingBag} title="Offres & grille tarifaire" sub="Prix concrets ; les coûts et marges sont des hypothèses jusqu’à réception des tarifs fournisseurs." />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {OFFERS.map(o => (
            <div key={o.id} className="rounded-xl bg-[#050403] border border-[#FFF7EF]/10 p-4 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-[#C8753D] font-bold">{o.category}</p>
                {o.category === 'subscription' && <Crown className="w-4 h-4 text-[#D49A63]" />}
                {o.category === 'pro' && <Building2 className="w-4 h-4 text-[#D49A63]" />}
                {o.category === 'b2b' && <Sparkles className="w-4 h-4 text-[#D49A63]" />}
                {o.category === 'free' && <ShieldAlert className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-sm font-bold text-[#FFF7EF] mt-1.5">{o.name}</p>
              <p className="text-[11px] text-[#FFF7EF]/60 mt-1 flex-1">{o.content}</p>
              <p className="text-2xl font-bold text-[#FFF7EF] mt-3">{o.priceEur === 0 ? 'GRATUIT' : eur(o.priceEur)}{o.recurrence === 'monthly' && <span className="text-xs text-[#FFF7EF]/50 font-normal">/mois</span>}</p>
              {o.priceNote && <p className="text-[10px] text-[#FFF7EF]/45">{o.priceNote}</p>}
              <div className="flex gap-3 mt-2 text-[10px] text-[#FFF7EF]/55">
                <span>Marge : {o.marginPct === null ? 'à confirmer' : `~${o.marginPct}%`}</span>
                <span>Récurrence : {o.recurrence === 'none' ? '—' : o.recurrence === 'subscribe' ? 'réachat' : o.recurrence}</span>
              </div>
              <p className="text-[10px] text-[#D49A63]/90 mt-2 pt-2 border-t border-[#FFF7EF]/8">Vente : {o.salesStrategy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PERSONAS */}
      <div id="personas">
        <SectionTitle icon={Users} title="Cibles prioritaires (personas)" />
        <div className="grid md:grid-cols-2 gap-3">
          {PERSONAS.map(p => (
            <Card key={p.id} className="!p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#FFF7EF]">{p.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63]">Priorité {p.priority}</span>
              </div>
              <p className="text-[10px] text-[#FFF7EF]/50 mt-1">{p.age} · {p.location} · cheveux {p.hair} · budget {p.budget}</p>
              <p className="text-[11px] text-[#FFF7EF]/60 mt-1">Plateformes : {p.platforms.join(', ')}</p>
              <div className="mt-3 space-y-2 text-[11px]">
                <p><span className="text-rose-300 font-bold">Problème : </span><span className="text-[#FFF7EF]/75">{p.pain}</span></p>
                <p><span className="text-[#C8753D] font-bold">Pourquoi utilise : </span><span className="text-[#FFF7EF]/75">{p.whyUse}</span></p>
                <p><span className="text-emerald-300 font-bold">Pourquoi paie : </span><span className="text-[#FFF7EF]/75">{p.whyPay}</span></p>
                <p className="text-[#FFF7EF]/55"><span className="font-bold">Déclencheur :</span> {p.triggers} · <span className="font-bold">Objection :</span> {p.objection}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CANAUX */}
      <div id="channels">
        <SectionTitle icon={Megaphone} title="Acquisition — canaux classés par priorité" />
        <div className="space-y-2">
          {CHANNELS.map(c => (
            <Card key={c.id} className="!p-4">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#C8753D] text-white text-sm font-bold flex items-center justify-center shrink-0">{c.rank}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-bold text-[#FFF7EF]">{c.name} <span className="text-[10px] text-[#FFF7EF]/45 font-normal">· rôle : {c.role}</span></p>
                    <span className="text-[11px] font-bold text-[#D49A63]">{eur(c.budgetEurMonth)}/mois</span>
                  </div>
                  <p className="text-[11px] text-[#FFF7EF]/65 mt-1">{c.why}</p>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-[10px] text-[#FFF7EF]/60">
                    <span><b className="text-[#FFF7EF]/80">Cible :</b> {c.target}</span>
                    <span><b className="text-[#FFF7EF]/80">Message :</b> « {c.message} »</span>
                    <span><b className="text-[#FFF7EF]/80">Contenu :</b> {c.contentType}</span>
                    <span><b className="text-[#FFF7EF]/80">Fréquence :</b> {c.frequency}</span>
                    <span><b className="text-[#FFF7EF]/80">KPI :</b> {c.kpi}</span>
                    <span><b className="text-[#FFF7EF]/80">Objectif :</b> {c.objective} — <span className="text-[#C8753D]">{c.expected}</span></span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* FUNNEL */}
      <div id="funnel">
        <SectionTitle icon={ArrowRight} title="Funnel de vente & taux cibles" />
        <Card>
          <ol className="space-y-3">
            {FUNNEL.map((f, i) => (
              <li key={f.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-6 h-6 rounded-full bg-[#1A0F0A] border border-[#C8753D] text-[#C8753D] text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                  {i < FUNNEL.length - 1 && <span className="w-px flex-1 bg-[#FFF7EF]/15 mt-1" />}
                </div>
                <div className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#FFF7EF]">{f.step}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">cible {f.targetRate}</span>
                  </div>
                  <p className="text-[10px] text-rose-300/80 mt-0.5">Abandon : {f.dropCauses}</p>
                  <p className="text-[11px] text-[#FFF7EF]/65">Correctif : {f.fix}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* PLAN 90 */}
      <div id="plan90">
        <SectionTitle icon={CalendarDays} title="Plan des 90 premiers jours — semaine par semaine" />
        {(['J1-30', 'J31-60', 'J61-90'] as const).map(phase => (
          <div key={phase} className="mb-4">
            <p className="text-[11px] font-bold text-[#D49A63] mb-2">{phase === 'J1-30' ? 'Jours 1–30 · Préparation + lancement' : phase === 'J31-60' ? 'Jours 31–60 · Acquisition + premières ventes' : 'Jours 61–90 · Optimisation + croissance'}</p>
            <div className="grid md:grid-cols-2 gap-2">
              {PLAN_90.filter(w => w.phase === phase).map(w => (
                <Card key={w.week} className="!p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#FFF7EF]">Semaine {w.week} · {w.focus}</p>
                    <span className="text-[10px] text-[#D49A63] font-bold">{eur(w.budget)}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {w.actions.map((a, i) => <li key={i} className="text-[11px] text-[#FFF7EF]/70 flex gap-2"><span className="text-[#C8753D]">▸</span>{a}</li>)}
                  </ul>
                  <p className="text-[10px] text-[#FFF7EF]/50 mt-2 pt-2 border-t border-[#FFF7EF]/8">KPI : {w.kpi} · <span className="text-[#C8753D]">{w.expected}</span></p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ROADMAP */}
      <div id="roadmap">
        <SectionTitle icon={Rocket} title="Roadmap vers la rentabilité" sub={`${s.roadmapDone}/${s.roadmapTotal} jalons automatiques validés sur données réelles.`} />
        <div className="space-y-3">
          {data.phases.map(phase => {
            const done = phase.milestones.filter(m => m.done).length;
            const pct = Math.round((done / phase.milestones.length) * 100);
            return (
              <Card key={phase.id}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#C8753D] font-bold">{phase.title} · {phase.window}</p>
                    <p className="text-[11px] text-[#FFF7EF]/60 mt-1 max-w-2xl">{phase.goal}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-[#FFF7EF]">{done}/{phase.milestones.length}</p>
                    <div className="w-28 h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden mt-1"><div className="h-full bg-[#C8753D]" style={{ width: `${pct}%` }} /></div>
                    <p className="text-[10px] text-[#FFF7EF]/40 mt-1">échéance {phase.deadline}</p>
                  </div>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {phase.milestones.map(m => (
                    <div key={m.id} className="flex items-start gap-2 text-[11px] text-[#FFF7EF]/75">
                      {m.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <Circle className="w-3.5 h-3.5 text-[#FFF7EF]/30 shrink-0 mt-0.5" />}
                      <span className={m.done ? '' : 'text-[#FFF7EF]/60'}>{m.label}{!m.auto && <span className="text-[#FFF7EF]/30"> (tâche suivie)</span>}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-[#050403] border border-[#FFF7EF]/8 px-3 py-2 text-[10px]">
                  <span><b className="text-[#D49A63]">KPI :</b> <span className="text-[#FFF7EF]/65">{phase.kpi}</span></span>
                  <span><b className="text-[#D49A63]">Résultat attendu :</b> <span className="text-[#FFF7EF]/65">{phase.expected}</span></span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPI */}
      <div id="kpis">
        <SectionTitle icon={Gauge} title="KPI business — réel vs objectif" sub="« — » = pas encore mesurable (analytics/événements à installer). Aucun chiffre de revenu n’est estimé à la place du réel." />
        {['Acquisition', 'Activation', 'Conversion', 'Rétention', 'Finance', 'Produit'].map(cat => {
          const rows = data.kpis.filter(k => k.category === cat);
          if (!rows.length) return null;
          return (
            <div key={cat} className="mb-3">
              <p className="text-[11px] font-bold text-[#D49A63] mb-1.5">{cat}</p>
              <Card className="!p-0 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-[#FFF7EF]/45 border-b border-[#FFF7EF]/10">
                      <th className="px-3 py-2 font-medium">Indicateur</th>
                      <th className="px-3 py-2 font-medium text-right">Réel</th>
                      <th className="px-3 py-2 font-medium text-right">Cible M3</th>
                      <th className="px-3 py-2 font-medium text-right">Cible M12</th>
                      <th className="px-3 py-2 font-medium">Échéance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(k => (
                      <tr key={k.id} className="border-b border-[#FFF7EF]/5 last:border-0">
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2 text-[#FFF7EF]">{statusDot(k.status)} {k.label}</span>
                          {k.measureNote && <span className="text-[9px] text-amber-300/70 italic ml-6">{k.measureNote}</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[#FFF7EF]">
                          {k.unit === 'euro' ? eur(k.measure) : k.unit === 'percent' ? (k.measure === null ? '—' : `${k.measure}%`) : num(k.measure)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#FFF7EF]/60">{k.target3m === null ? '—' : k.unit === 'euro' ? eur(k.target3m) : k.unit === 'percent' ? `${k.target3m}%` : num(k.target3m)}</td>
                        <td className="px-3 py-2 text-right text-[#FFF7EF]/60">{k.target12m === null ? '—' : k.unit === 'euro' ? eur(k.target12m) : k.unit === 'percent' ? `${k.target12m}%` : num(k.target12m)}</td>
                        <td className="px-3 py-2 text-[#FFF7EF]/45">{k.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          );
        })}
      </div>

      {/* FINANCE */}
      <div id="finance">
        <SectionTitle icon={Wallet} title="Projection financière & seuil de rentabilité" sub="Hypothèses explicites ci-dessous ; le réel s’affiche dans les KPI." />
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-[11px] min-w-[640px]">
            <thead>
              <tr className="text-left text-[#FFF7EF]/45 border-b border-[#FFF7EF]/10">
                <th className="px-3 py-2 font-medium">Horizon</th>
                <th className="px-3 py-2 font-medium text-right">Clients cumulés</th>
                <th className="px-3 py-2 font-medium text-right">Commandes/mois</th>
                <th className="px-3 py-2 font-medium text-right">CA produits</th>
                <th className="px-3 py-2 font-medium text-right">MRR</th>
                <th className="px-3 py-2 font-medium text-right">Revenu total</th>
                <th className="px-3 py-2 font-medium text-right">Marge brute</th>
                <th className="px-3 py-2 font-medium text-right">Marketing</th>
                <th className="px-3 py-2 font-medium text-right">Tech + fixe</th>
                <th className="px-3 py-2 font-medium text-right">Résultat net</th>
              </tr>
            </thead>
            <tbody>
              {FINANCE_PROJECTION.map(f => (
                <tr key={f.label} className="border-b border-[#FFF7EF]/5 last:border-0">
                  <td className="px-3 py-2 font-bold text-[#FFF7EF]">{f.label}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/75">{num(f.clientsCumul)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/75">{num(f.ordersPerMonth)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/75">{eur(f.productRevenue)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/75">{eur(f.mrr)}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#FFF7EF]">{eur(f.totalRevenue)}</td>
                  <td className="px-3 py-2 text-right text-emerald-300/90">{eur(f.grossMargin)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/60">{eur(f.marketing)}</td>
                  <td className="px-3 py-2 text-right text-[#FFF7EF]/60">{eur(f.tech + f.fixedAndTeam + f.launchInvest)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${f.netResult >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{eur(f.netResult)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Card className="!p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#C8753D] font-bold flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Seuils de rentabilité</p>
            <p className="text-[11px] text-[#FFF7EF]/75 mt-2">{BREAKEVEN.monthly}</p>
            <p className="text-[11px] text-[#FFF7EF]/75 mt-1">{BREAKEVEN.cumulative}</p>
            <p className="text-[10px] text-[#D49A63] mt-2">{BREAKEVEN.rule}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#C8753D] font-bold">Hypothèses du modèle</p>
            <ul className="mt-2 space-y-1">
              {FINANCE_ASSUMPTIONS.map((a, i) => <li key={i} className="text-[10px] text-[#FFF7EF]/65 flex gap-2"><span className="text-[#C8753D]">•</span>{a}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
