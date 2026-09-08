import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Circle, Loader2, RefreshCw, Target, Rocket, Crown,
  Building2, ShieldAlert, Sparkles, ShoppingBag, Users, Megaphone, TrendingUp,
  Wallet, CalendarDays, ListChecks, ArrowRight, Euro, Gauge, BarChart3, Trophy, Boxes, Globe, Lock, Filter,
} from 'lucide-react';
import {
  OFFERS, PERSONAS, POSITIONING, CHANNELS, FUNNEL, PLAN_90,
  FINANCE_PROJECTION, FINANCE_ASSUMPTIONS, BREAKEVEN, STRATEGY_GUARDRAILS,
  CONQUEST_TIERS, EXPANSION_GATES, CONQUEST_WAVES,
  CONQUEST_ROADMAP,
  STRATEGY_KPIS,
} from '../lib/businessStrategy';
import { LaunchPlanSection } from './LaunchPlanSection';
import { PenetrationCommandCenter } from './PenetrationCommandCenter';

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
type PerfRow = { id: string; name: string; qty: number; revenue: number; estimatedMargin: number | null; isKit: boolean };
type Cockpit = {
  generatedAt: string;
  summary: {
    productRevenueEur: number; mrrEur: number; ordersPaid: number; ordersPending: number;
    productsPublished: number; productsTotal: number; demoRemaining: number;
    ingredients: number; ingredientsWithFunctions: number; members: number; appointments: number;
    roadmapDone: number; roadmapTotal: number; paymentsReady: boolean;
  };
  performance?: {
    itemsAvailable: boolean; totalSoldQty: number; totalItemRevenue: number;
    kitRevenue: number; kitSharePct: number; topProducts: PerfRow[]; topKits: PerfRow[];
    channels: { channel: string; orders: number; revenue: number }[];
    campaigns?: { campaign: string; channel: string; orders: number; revenue: number }[];
    ordersWithAttribution: number;
    targets: { aovEur: number; kitSharePct: number }; channelNote: string;
    funnel?: {
      stages: { key: string; label: string; value: number; note?: string }[];
      conversions: {
        cartToOrderPct: number | null; leadToOrderPct: number | null;
        kitSharePct: number | null; repeatRatePct: number | null;
        referralOrders: number; rewardCoupons: number;
      };
      targets: { cartToOrderPct: number; kitSharePct: number; repeatRatePct: number };
      pendingOrders: number; note?: string;
    };
  };
  phases: Phase[]; kpis: Kpi[]; actions: Action[];
};

const eur = (v: number | null | undefined) => v === null || v === undefined ? '—' : `${Math.round(v).toLocaleString('fr-FR')} €`;
const num = (v: number | null | undefined) => v === null || v === undefined ? '—' : v.toLocaleString('fr-FR');

const SECTIONS = [
  { id: 'actions', label: 'À faire maintenant', icon: ListChecks },
  { id: 'penetration', label: 'Pénétration & expansion', icon: Rocket },
  { id: 'performance', label: 'Ventes réelles', icon: BarChart3 },
  { id: 'conquete', label: 'Conquête & expansion', icon: Globe },
  { id: 'positioning', label: 'Positionnement', icon: Target },
  { id: 'launch', label: 'Plan de lancement', icon: Rocket },
  { id: 'offers', label: 'Offres & prix', icon: ShoppingBag },
  { id: 'personas', label: 'Cibles', icon: Users },
  { id: 'channels', label: 'Acquisition', icon: Megaphone },
  { id: 'funnel', label: 'Entonnoir & conversion', icon: Filter },
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

      {/* PERFORMANCE COMMERCIALE RÉELLE — quel produit/kit se vend, marge réelle */}
      {/* KURLA MARKET PENETRATION & EXPANSION COMMAND CENTER */}
      <div id="penetration" className="scroll-mt-4">
        <PenetrationCommandCenter
          real={{
            ordersPaid: s.ordersPaid,
            aovEur: data.kpis.find(k => k.id === 'aov')?.measure ?? null,
            kitSharePct: data.performance?.funnel?.conversions?.kitSharePct ?? null,
            repeatRatePct: data.performance?.funnel?.conversions?.repeatRatePct ?? null,
            cartToOrderPct: data.performance?.funnel?.conversions?.cartToOrderPct ?? null,
            paymentsReady: s.paymentsReady,
            channels: data.performance?.channels?.map(c => ({ channel: c.channel, orders: c.orders, revenue: c.revenue })) ?? [],
            campaigns: data.performance?.campaigns?.map(c => ({ campaign: c.campaign, orders: c.orders, revenue: c.revenue })) ?? [],
          }}
        />
      </div>

      <div id="performance" className="scroll-mt-4">
        <SectionTitle icon={BarChart3} title="Performance commerciale — chiffres réels" sub="Agrégation des lignes de commande payées. La marge est réelle si un coût d’achat est saisi en base, sinon estimée sur la cible catalogue. Aucune donnée inventée." />
        {(() => {
          const perf = data.performance;
          if (!perf || !perf.itemsAvailable) {
            return <Card className="!p-5"><p className="text-xs text-[#FFF7EF]/60 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#C8753D]" /> Le suivi des ventes par produit s’active dès la première commande payée (table des lignes de commande en place).</p></Card>;
          }
          const hasSales = perf.totalSoldQty > 0;
          const realAov = data.summary.ordersPaid > 0 ? Math.round(perf.totalItemRevenue / data.summary.ordersPaid) : 0;
          const aovVsTarget = data.summary.ordersPaid > 0 ? Math.round((realAov / perf.targets.aovEur) * 100) : 0;
          const Row = ({ r, rank }: { r: PerfRow; rank: number }) => (
            <tr className="border-b border-[#FFF7EF]/5 last:border-0 align-top">
              <td className="px-3 py-2 text-[#C8753D] font-bold w-6">{rank}</td>
              <td className="px-3 py-2 text-[#FFF7EF] font-medium">{r.name}</td>
              <td className="px-3 py-2 text-right text-[#FFF7EF]/70 whitespace-nowrap">×{r.qty}</td>
              <td className="px-3 py-2 text-right font-bold text-[#FFF7EF] whitespace-nowrap">{eur(r.revenue)}</td>
              <td className="px-3 py-2 text-right text-emerald-300/90 whitespace-nowrap">{r.estimatedMargin == null ? '—' : eur(r.estimatedMargin)}</td>
            </tr>
          );
          return (
            <div className="space-y-4">
              {/* KPIs réels vs objectifs plan CENTRAL */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <Card className="!p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">Unités vendues</p>
                  <p className="text-xl font-bold text-[#FFF7EF]">{num(perf.totalSoldQty)}</p>
                  <p className="text-[10px] text-[#FFF7EF]/50 mt-0.5">{num(data.summary.ordersPaid)} commande(s) payée(s)</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">CA produits (lignes)</p>
                  <p className="text-xl font-bold text-[#FFF7EF]">{eur(perf.totalItemRevenue)}</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">Panier moyen (réel)</p>
                  <p className="text-xl font-bold text-[#FFF7EF]">{data.summary.ordersPaid ? `${realAov} €` : '—'}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: aovVsTarget >= 100 ? '#6ee7b7' : '#f0abfc' }}>{data.summary.ordersPaid ? `objectif ${perf.targets.aovEur} € · ${aovVsTarget}%` : `objectif ${perf.targets.aovEur} €`}</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">Part des kits</p>
                  <p className="text-xl font-bold text-[#FFF7EF]">{perf.kitSharePct} %</p>
                  <p className="text-[10px] text-[#FFF7EF]/50 mt-0.5">objectif {perf.targets.kitSharePct}% · {eur(perf.kitRevenue)}</p>
                </Card>
              </div>

              {!hasSales ? (
                <Card className="!p-6 text-center">
                  <Trophy className="w-6 h-6 text-[#C8753D] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#FFF7EF]">Aucune vente pour l’instant — c’est normal en pré-lancement.</p>
                  <p className="text-[11px] text-[#FFF7EF]/55 mt-1">Dès les premières commandes payées, cette section montrera automatiquement : le produit qui se vend le mieux, le kit le plus performant, le CA et la marge réels.</p>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-2 gap-3">
                  <Card className="!p-0 overflow-hidden">
                    <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold px-3 pt-3 pb-2 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Top produits</p>
                    <table className="w-full text-[11px]">
                      <thead><tr className="text-left text-[#FFF7EF]/40 border-b border-[#FFF7EF]/10">
                        <th className="px-3 py-1.5"></th><th className="px-3 py-1.5 font-medium">Produit</th>
                        <th className="px-3 py-1.5 font-medium text-right">Qté</th><th className="px-3 py-1.5 font-medium text-right">CA</th>
                        <th className="px-3 py-1.5 font-medium text-right">Marge</th>
                      </tr></thead>
                      <tbody>{perf.topProducts.map((r, i) => <Row key={r.id} r={r} rank={i + 1} />)}</tbody>
                    </table>
                  </Card>
                  <Card className="!p-0 overflow-hidden">
                    <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold px-3 pt-3 pb-2 flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5" /> Top kits</p>
                    {perf.topKits.length === 0 ? (
                      <p className="px-3 pb-4 pt-1 text-[11px] text-[#FFF7EF]/50">Aucun kit vendu pour l’instant. Les kits sont le levier de panier moyen (objectif {perf.targets.kitSharePct}% du CA).</p>
                    ) : (
                      <table className="w-full text-[11px]">
                        <thead><tr className="text-left text-[#FFF7EF]/40 border-b border-[#FFF7EF]/10">
                          <th className="px-3 py-1.5"></th><th className="px-3 py-1.5 font-medium">Kit</th>
                          <th className="px-3 py-1.5 font-medium text-right">Qté</th><th className="px-3 py-1.5 font-medium text-right">CA</th>
                          <th className="px-3 py-1.5 font-medium text-right">Marge</th>
                        </tr></thead>
                        <tbody>{perf.topKits.map((r, i) => <Row key={r.id} r={r} rank={i + 1} />)}</tbody>
                      </table>
                    )}
                  </Card>
                </div>
              )}

              {/* VENTES PAR CANAL */}
              <Card className="!p-0 overflow-hidden">
                <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold px-3 pt-3 pb-2 flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Ventes par canal d'acquisition</p>
                {perf.channels.length === 0 ? (
                  <p className="px-3 pb-4 pt-1 text-[11px] text-[#FFF7EF]/50">Aucune vente payée pour l’instant.</p>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead><tr className="text-left text-[#FFF7EF]/40 border-b border-[#FFF7EF]/10">
                      <th className="px-3 py-1.5 font-medium">Canal</th>
                      <th className="px-3 py-1.5 font-medium text-right">Commandes</th>
                      <th className="px-3 py-1.5 font-medium text-right">CA</th>
                      <th className="px-3 py-1.5 font-medium text-right">Part du CA</th>
                    </tr></thead>
                    <tbody>
                      {perf.channels.map((c) => {
                        const totalRev = perf.channels.reduce((s, x) => s + x.revenue, 0) || 1;
                        const share = Math.round((c.revenue / totalRev) * 100);
                        return (
                          <tr key={c.channel} className="border-b border-[#FFF7EF]/5 last:border-0">
                            <td className="px-3 py-2 text-[#FFF7EF] font-medium">{c.channel}</td>
                            <td className="px-3 py-2 text-right text-[#FFF7EF]/70">{c.orders}</td>
                            <td className="px-3 py-2 text-right font-bold text-[#FFF7EF] whitespace-nowrap">{eur(c.revenue)}</td>
                            <td className="px-3 py-2 text-right">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-16 h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden"><span className="block h-full bg-[#C8753D]" style={{ width: `${share}%` }} /></span>
                                <span className="text-[#FFF7EF]/60 w-9 text-right">{share}%</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card className="!p-3 !bg-amber-400/5 border-amber-400/20">
                <p className="text-[10px] text-amber-200/90 flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {perf.channelNote}</p>
              </Card>
            </div>
          );
        })()}
      </div>

      {/* CONQUÊTE — paliers clients, conditions d'expansion, vagues marchés */}
      <div id="conquete" className="scroll-mt-4">
        <SectionTitle icon={Globe} title="Plan de conquête — France → Europe → Afrique" sub="Beachhead : femmes 4C d'Île-de-France/Lyon via diagnostic + kits K02/K03. L'expansion se mérite : les conditions passent au vert sur données réelles." />

        {/* Paliers clients */}
        <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold mb-2">Paliers de conquête (réel vs objectif)</p>
        <div className="grid md:grid-cols-2 gap-2 mb-4">
          {CONQUEST_TIERS.map((tier) => {
            const current = data.summary.ordersPaid; // proxy commandes payées (clients)
            const pct = Math.min(100, Math.round((current / tier.clients) * 100));
            const reached = current >= tier.clients;
            return (
              <Card key={tier.id} className="!p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#FFF7EF]">{tier.label} <span className="text-[#FFF7EF]/45 font-normal">· {tier.window}</span></p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${reached ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#FFF7EF]/10 text-[#FFF7EF]/60'}`}>{reached ? 'Atteint' : `${current}/${tier.clients}`}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden">
                  <div className={`h-full ${reached ? 'bg-emerald-400' : 'bg-[#C8753D]'}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                </div>
                <p className="text-[10px] text-[#FFF7EF]/55 mt-2"><b className="text-[#FFF7EF]/75">Canaux :</b> {tier.channel}</p>
                <p className="text-[10px] text-[#D49A63]/90 mt-1"><b>Porte de passage :</b> {tier.gate}</p>
              </Card>
            );
          })}
        </div>

        {/* Conditions d'expansion */}
        <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold mb-2 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Conditions obligatoires avant d'ouvrir le marché suivant</p>
        <Card className="!p-3 mb-4">
          {(() => {
            // Valeur réelle par id de KPI (définition STRATEGY_KPIS ↔ mesure cockpit).
            const liveValue = new Map<string, number | null>(data.kpis.map(k => [k.id, k.measure]));
            const checks = EXPANSION_GATES.map(g => {
              let done: boolean | null = null;
              let value: string | null = null;
              if (g.auto) {
                // Résolution de la mesure : via le measureKey de la définition KPI,
                // avec repli sur la commande payée pour le seuil « clients ».
                let m: number | null | undefined;
                const def = STRATEGY_KPIS.find(k => k.id === g.id);
                if (g.id === 'clients') {
                  m = data.summary.ordersPaid;
                } else if (def?.measureKey) {
                  const liveKpi = data.kpis.find(k => k.id === def.id);
                  m = liveKpi?.measure ?? liveValue.get(def.measureKey) ?? null;
                }
                if (m !== null && m !== undefined) {
                  done = g.comparator === 'gte' ? m >= g.target : m === g.target;
                  value = `${m}`;
                }
              }
              return { g, done, value };
            });
            const autoCount = checks.filter(c => c.done !== null).length;
            const passed = checks.filter(c => c.done === true).length;
            const ready = checks.every(c => c.done === true);
            return (
              <>
                <div className={`rounded-lg p-2.5 mb-3 text-[11px] font-bold flex items-center gap-2 ${ready ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#C8753D]/10 text-[#D49A63]'}`}>
                  {ready ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {ready
                    ? '✅ Conditions remplies — prêt à ouvrir la Belgique (vague 3).'
                    : `Pas encore d'expansion : ${passed} condition(s) auto validées sur ${autoCount} mesurables ; les autres sont des prérequis opérationnels à tenir.`}
                </div>
                <ul className="space-y-1.5">
                  {checks.map(({ g, done, value }) => (
                    <li key={g.id} className="flex items-start gap-2 text-[11px]">
                      {done === true ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        : done === false ? <Circle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        : <Circle className="w-4 h-4 text-[#FFF7EF]/30 shrink-0 mt-0.5" />}
                      <span className={done === true ? 'text-[#FFF7EF]/80' : 'text-[#FFF7EF]/65'}>
                        {g.label}{value !== null && <span className="text-[#FFF7EF]/40"> (réel : {value})</span>}
                        {!g.auto && <span className="text-[#FFF7EF]/35 italic"> — suivi opérationnel</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </Card>

        {/* Vagues d'expansion */}
        <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold mb-2">Séquence des vagues</p>
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-[11px] min-w-[640px]">
            <thead><tr className="text-left text-[#FFF7EF]/45 border-b border-[#FFF7EF]/10">
              <th className="px-3 py-2 font-medium">Vague</th><th className="px-3 py-2 font-medium">Marché</th>
              <th className="px-3 py-2 font-medium">Fenêtre</th><th className="px-3 py-2 font-medium">Modèle d'entrée</th>
              <th className="px-3 py-2 font-medium">Statut</th>
            </tr></thead>
            <tbody>
              {CONQUEST_WAVES.map(w => (
                <tr key={w.wave} className="border-b border-[#FFF7EF]/5 last:border-0">
                  <td className="px-3 py-2 font-bold text-[#C8753D]">{w.wave}</td>
                  <td className="px-3 py-2 text-[#FFF7EF] font-medium">{w.market}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/60 whitespace-nowrap">{w.window}</td>
                  <td className="px-3 py-2 text-[#FFF7EF]/60">{w.model}</td>
                  <td className="px-3 py-2"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/70 whitespace-nowrap">{w.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ROADMAP DE CONQUÊTE — frise datée, jalons auto-vérifiés */}
        <p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold mb-2 mt-5">Roadmap de conquête (traduction du plan en étapes)</p>
        {(() => {
          const liveByKpi = new Map<string, number | null>(data.kpis.map(k => [k.id, k.measure]));
          const evalMs = (ms: { auto?: { kpiId: string; gte?: number; eq?: number } }) => {
            if (!ms.auto) return null; // jalon opérationnel (suivi manuel)
            const m = liveByKpi.get(ms.auto.kpiId);
            if (m === null || m === undefined) return null;
            if (ms.auto.eq !== undefined) return m === ms.auto.eq;
            if (ms.auto.gte !== undefined) return m >= ms.auto.gte;
            return null;
          };
          const stages = CONQUEST_ROADMAP.map(st => {
            const ms = st.milestones.map(m => ({ m, state: evalMs(m) }));
            const autoMs = ms.filter(x => x.m.auto);
            const autoDone = autoMs.filter(x => x.state === true).length;
            const allAutoPass = autoMs.length > 0 && autoMs.every(x => x.state === true);
            return { st, ms, autoDone, autoTotal: autoMs.length, allAutoPass };
          });
          const currentIndex = stages.findIndex(s => !s.allAutoPass);
          const activeIndex = currentIndex === -1 ? stages.length : currentIndex;
          return (
            <div className="relative pl-1">
              {stages.map(({ st, ms, autoDone, autoTotal, allAutoPass }, i) => {
                const done = i < activeIndex;
                const active = i === activeIndex;
                const liveClients = data.summary.ordersPaid;
                const clientPct = st.objectiveClients ? Math.min(100, Math.round((liveClients / st.objectiveClients) * 100)) : null;
                return (
                  <div key={st.id} className={`relative pl-7 pb-5 ${i === stages.length - 1 ? 'pb-0' : ''}`}>
                    {/* ligne verticale */}
                    {i < stages.length - 1 && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-[#FFF7EF]/15" />}
                    {/* pastille */}
                    <span className={`absolute left-0 top-1 w-[23px] h-[23px] rounded-full flex items-center justify-center border ${done ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : active ? 'bg-[#C8753D]/25 border-[#C8753D] text-[#D49A63]' : 'bg-[#FFF7EF]/5 border-[#FFF7EF]/15 text-[#FFF7EF]/40'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{st.index}</span>}
                    </span>
                    <Card className={`!p-3.5 ${active ? 'border-[#C8753D]/40' : ''} ${!done && !active ? 'opacity-70' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#FFF7EF]">{st.title}</p>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/70">{st.window}</span>
                        {done ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Atteinte</span>
                          : active ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63]">En cours</span>
                            : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/50">Verrouillée</span>}
                      </div>
                      <p className="text-[10px] text-[#FFF7EF]/55 mt-1">📍 {st.market}</p>
                      <p className="text-[10px] text-[#FFF7EF]/55">🎁 {st.offer}</p>

                      {/* objectifs chiffrés */}
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
                        {st.objectiveClients && (
                          <span className="text-[#FFF7EF]/70">Objectif <b className="text-[#FFF7EF]">{st.objectiveClients.toLocaleString('fr-FR')} clients</b>
                            {clientPct !== null && active && <span className="text-[#D49A63]"> · {liveClients}/{st.objectiveClients.toLocaleString('fr-FR')} ({clientPct}%)</span>}
                          </span>
                        )}
                        {st.objectiveRevenueEur && <span className="text-[#FFF7EF]/70">CA visé <b className="text-[#FFF7EF]">{st.objectiveRevenueEur.toLocaleString('fr-FR')} €/mois</b></span>}
                      </div>
                      {active && clientPct !== null && (
                        <div className="mt-1.5 h-1 rounded-full bg-[#FFF7EF]/10 overflow-hidden">
                          <div className="h-full bg-[#C8753D]" style={{ width: `${Math.max(clientPct, 2)}%` }} />
                        </div>
                      )}

                      {/* jalons */}
                      <ul className="mt-2.5 space-y-1">
                        {ms.map(({ m, state }, j) => (
                          <li key={j} className="flex items-start gap-2 text-[11px]">
                            {state === true ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              : state === false ? <Circle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                : <Circle className="w-3.5 h-3.5 text-[#FFF7EF]/30 shrink-0 mt-0.5" />}
                            <span className={state === true ? 'text-[#FFF7EF]/80' : 'text-[#FFF7EF]/60'}>
                              {m.label}
                              {m.auto && <span className="text-[#FFF7EF]/30 italic"> · auto</span>}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-2.5 pt-2 border-t border-[#FFF7EF]/10 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                        <span className="text-[#D49A63]"><b>Porte de passage :</b> {st.passGate}</span>
                        <span className="text-[#FFF7EF]/50"><b>Budget :</b> {st.budgetNote}</span>
                        {autoTotal > 0 && <span className="text-[#FFF7EF]/45"><b>Jalons auto :</b> {autoDone}/{autoTotal} validés</span>}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          );
        })()}
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
        <SectionTitle icon={Filter} title="Entonnoir de conversion — actes réels" sub="Comptes mesurés en base (leads → diagnostics → paniers → commandes payantes → kits → réachat). Le trafic pur (visites, GA4) n’est pas persisté ici ; les paliers sans donnée affichent 0, jamais d’invention." />
        {(() => {
          const fn = data.performance?.funnel;
          if (!fn) {
            return <Card className="!p-5"><p className="text-xs text-[#FFF7EF]/60 flex items-center gap-2"><Filter className="w-4 h-4 text-[#C8753D]" /> L’entonnoir chiffré s’active avec le suivi des ventes (commande + paniers persistés).</p></Card>;
          }
          const stages: { key: string; label: string; value: number; note?: string }[] = fn.stages || [];
          const maxVal = Math.max(1, ...stages.map(s => s.value || 0));
          const conv = (fn.conversions || {}) as {
            cartToOrderPct: number | null; leadToOrderPct: number | null;
            kitSharePct: number | null; repeatRatePct: number | null;
            referralOrders: number; rewardCoupons: number;
          };
          const tg = (fn.targets || {}) as { cartToOrderPct: number; kitSharePct: number; repeatRatePct: number };
          const rateChip = (val: number | null | undefined, target: number, invert = false) => {
            if (val === null || val === undefined) return <span className="text-[10px] text-[#FFF7EF]/40">non mesuré</span>;
            const ok = invert ? val <= target : val >= target;
            return (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {val}% {ok ? '✓' : `· cible ${target}%`}
              </span>
            );
          };
          return (
            <div className="space-y-4">
              {/* Barres d'entonnoir */}
              <Card className="!p-5">
                <div className="space-y-3">
                  {stages.map((s, i) => {
                    const widthPct = Math.round((s.value / maxVal) * 100);
                    const prevVal = i > 0 ? stages[i - 1].value : null;
                    const stepPct = prevVal !== null && prevVal > 0 ? Math.round((s.value / prevVal) * 100) : null;
                    const isSub = s.key === 'kitOrders' || s.key === 'repeat';
                    return (
                      <div key={s.key} className={isSub ? 'pl-6 opacity-95' : ''}>
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                          <p className="text-xs font-semibold text-[#FFF7EF] flex items-center gap-2">
                            {isSub && <span className="text-[#C8753D]">↳</span>}
                            {s.label}
                            {stepPct !== null && !isSub && <span className="text-[10px] text-[#D49A63] font-bold">{stepPct}% de l’étape précédente</span>}
                          </p>
                          <p className="text-sm font-bold text-[#D49A63]">{s.value.toLocaleString('fr-FR')}</p>
                        </div>
                        <div className="h-7 rounded-lg bg-[#050403] border border-[#FFF7EF]/8 overflow-hidden">
                          <div
                            className={`h-full rounded-lg flex items-center justify-end pr-2 transition-all ${isSub ? 'bg-gradient-to-r from-[#8a5326] to-[#C8753D]/70' : 'bg-gradient-to-r from-[#C8753D] to-[#D49A63]'}`}
                            style={{ width: `${Math.max(s.value > 0 ? 6 : 2, widthPct)}%` }}
                          >
                            {s.value > 0 && widthPct > 18 && <span className="text-[10px] font-bold text-white">{s.value}</span>}
                          </div>
                        </div>
                        {s.note && <p className="text-[10px] text-[#FFF7EF]/45 mt-0.5">{s.note}</p>}
                      </div>
                    );
                  })}
                </div>
                {typeof fn.pendingOrders === 'number' && fn.pendingOrders > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#FFF7EF]/10 flex items-center gap-2 text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                    <p className="text-[#FFF7EF]/70">
                      <b className="text-amber-300">{fn.pendingOrders} commande(s) en attente de paiement</b> — relancées automatiquement par la boucle de récupération (3 emails sur 72 h).
                    </p>
                  </div>
                )}
              </Card>

              {/* Taux de conversion vs cibles */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="!p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50 font-bold mb-1">Panier → commande</p>
                  <p className="text-xl font-bold text-[#FFF7EF] mb-1">{conv.cartToOrderPct ?? '—'}{conv.cartToOrderPct != null && '%'}</p>
                  {rateChip(conv.cartToOrderPct, tg.cartToOrderPct ?? 35)}
                  <p className="text-[10px] text-[#FFF7EF]/45 mt-1">Paniers non vides qui se concluent en achat.</p>
                </Card>
                <Card className="!p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50 font-bold mb-1">Commandes avec un kit</p>
                  <p className="text-xl font-bold text-[#FFF7EF] mb-1">{conv.kitSharePct ?? '—'}{conv.kitSharePct != null && '%'}</p>
                  {rateChip(conv.kitSharePct, tg.kitSharePct ?? 50)}
                  <p className="text-[10px] text-[#FFF7EF]/45 mt-1">Levier AOV : kits recommandés en tête du diagnostic.</p>
                </Card>
                <Card className="!p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50 font-bold mb-1">Taux de réachat</p>
                  <p className="text-xl font-bold text-[#FFF7EF] mb-1">{conv.repeatRatePct ?? '—'}{conv.repeatRatePct != null && '%'}</p>
                  {rateChip(conv.repeatRatePct, tg.repeatRatePct ?? 20)}
                  <p className="text-[10px] text-[#FFF7EF]/45 mt-1">Clients distincts avec ≥ 2 commandes. Cible plan : 20 % à 90 j.</p>
                </Card>
                <Card className="!p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50 font-bold mb-1">Parrainage</p>
                  <p className="text-xl font-bold text-[#FFF7EF] mb-1">{conv.referralOrders ?? 0} <span className="text-xs font-normal text-[#FFF7EF]/50">vente(s)</span></p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8753D]/15 text-[#D49A63]">{conv.rewardCoupons ?? 0} récompense(s) émise(s)</span>
                  <p className="text-[10px] text-[#FFF7EF]/45 mt-1">Ventes via code parrain KURLA-… + coupons MERCI générés.</p>
                </Card>
              </div>

              {/* Référentiel théorique du FUNNEL planifié (causes d'abandon + correctifs) */}
              <Card className="!p-5">
                <p className="text-[11px] uppercase tracking-widest text-[#D49A63] font-bold mb-3">Référentiel — où agir à chaque étape</p>
                <ol className="space-y-3">
                  {FUNNEL.map((f, i) => (
                    <li key={f.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="w-6 h-6 rounded-full bg-[#1A0F0A] border border-[#C8753D] text-[#C8753D] text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        {i < FUNNEL.length - 1 && <span className="w-px flex-1 bg-[#FFF7EF]/15 mt-1" />}
                      </div>
                      <div className="pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-[#FFF7EF]">{f.step}</p>
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
          );
        })()}
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
