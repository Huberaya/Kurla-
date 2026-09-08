import React, { useMemo, useState } from 'react';
import {
  Rocket, AlertTriangle, CheckCircle2, Circle, Calculator, Map as MapIcon,
  Layers, Users, Target, ChevronRight, Zap, TrendingUp, Crosshair, Gauge,
  Megaphone, Handshake, HeartHandshake, CalendarDays, ClipboardList, Tag, Copy,
} from 'lucide-react';
import {
  PEN_LADDER, PEN_SEGMENTS_FR, PEN_MARKETS, PEN_FIRST100, PEN_WEEKLY, PEN_MONTHLY,
  PEN_PHASE_META, penetrationCalc, penetrationAlerts, penetrationChannelBoard,
  PEN_CAMPAIGNS, penetrationCampaignBoard, PEN_INFLUENCE, INFLUENCE_PIPELINE, PEN_PARTNERS, PEN_DEPTH, PEN_DEPTH_KPIS,
  type PenMarket,
} from '../lib/penetration';

// Métriques réelles extraites du cockpit (jamais inventées par ce composant).
export type PenReal = {
  ordersPaid: number;
  aovEur: number | null;
  kitSharePct: number | null;
  repeatRatePct: number | null;
  cartToOrderPct: number | null;
  paymentsReady: boolean;
  channels?: { channel: string; orders: number; revenue: number }[];
  campaigns?: { campaign: string; orders: number; revenue: number }[];
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-5 ${className}`}>{children}</div>;
}
function Title({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) {
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

const eur = (v: number | null | undefined) => v === null || v === undefined ? '—' : `${Math.round(v).toLocaleString('fr-FR')} €`;
const num = (v: number) => v.toLocaleString('fr-FR');

const phaseColor: Record<string, string> = {
  slate: 'bg-[#FFF7EF]/10 text-[#FFF7EF]/60',
  amber: 'bg-amber-400/20 text-amber-200',
  blue: 'bg-sky-400/20 text-sky-200',
  orange: 'bg-[#C8753D]/25 text-[#D49A63]',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  purple: 'bg-purple-400/20 text-purple-200',
};

export const PenetrationCommandCenter: React.FC<{ real: PenReal }> = ({ real }) => {
  const alerts = useMemo(() => penetrationAlerts(real), [real]);
  const channelBoard = useMemo(() => penetrationChannelBoard(real.channels || []), [real.channels]);
  const campaignBoard = useMemo(() => penetrationCampaignBoard(real.campaigns || [], real.channels || []), [real.campaigns, real.channels]);
  const [campaignFilter, setCampaignFilter] = useState<'all'|'m1m2'|'m3m6'>('all');
  const redAlerts = alerts.filter(a => a.level === 'red');
  const greenAlerts = alerts.filter(a => a.level === 'green');
  const grayAlerts = alerts.filter(a => a.level === 'gray');

  // Semaine de pénétration courante : on se cale sur la progression réelle.
  // 0 commande payante → S1 ; la semaine réelle est guidée par les paliers.
  const currentWeekIdx = useMemo(() => {
    if (real.ordersPaid >= 100) return 11;
    // Tant qu'on n'a pas 100, on évolue dans les 8 premières semaines (palier 100).
    return Math.min(7, Math.floor(real.ordersPaid / 12)); // ~12-13 cmd/sem. visées
  }, [real.ordersPaid]);
  const currentWeek = PEN_WEEKLY[currentWeekIdx];

  // Palier d'escalier courant
  const currentRungIdx = useMemo(() => {
    const idx = PEN_LADDER.findIndex(r => real.ordersPaid < r.clients);
    return idx === -1 ? PEN_LADDER.length : idx;
  }, [real.ordersPaid]);

  // Calculatrice interactive
  const [calcTarget, setCalcTarget] = useState(1000);
  const [calcConv, setCalcConv] = useState(1.2);
  const [calcCac, setCalcCac] = useState(15);
  const [calcAov, setCalcAov] = useState(46);
  const calc = penetrationCalc({
    targetClients: calcTarget, convVisitToOrderPct: calcConv,
    diagCompletionPct: 35, cacEur: calcCac, aovEur: calcAov,
  });

  const marketsByRegion = (region: PenMarket['region']) => PEN_MARKETS.filter(m => m.region === region);

  return (
    <div className="space-y-6">
      {/* Bandeau d'en-tête du Command Center */}
      <div className="rounded-2xl border border-[#C8753D]/40 bg-gradient-to-br from-[#2A1710] to-[#050403] p-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Rocket className="w-5 h-5 text-[#D49A63]" />
          <h2 className="text-base font-bold text-[#FFF7EF]">KURLA Market Penetration &amp; Expansion Command Center</h2>
        </div>
        <p className="text-[11px] text-[#FFF7EF]/60 mt-1.5 leading-relaxed">
          Machine de pénétration : chaque palier est chiffré, daté, assigné et conditionné par un critère de validation.
          On ne passe au marché/segment suivant que lorsque le critère est atteint. Les chiffres réels (
          <b className="text-[#FFF7EF]">{real.ordersPaid} commande(s) payante(s)</b>, AOV {eur(real.aovEur)}) pilotent les alertes ;
          tout le reste est un objectif ou une <i>hypothèse à tester</i>.
        </p>
      </div>

      {/* ① ALERTES DE PÉNÉTRATION (planifié vs réel) */}
      <div>
        <Title icon={AlertTriangle} title="Alertes de pénétration — réel vs objectif" sub="Détection automatique des écarts, avec action concrète et délai." />
        <div className="grid md:grid-cols-2 gap-3">
          {[...redAlerts, ...greenAlerts, ...grayAlerts].map((a, i) => (
            <div key={i} className={`rounded-xl border p-3.5 ${
              a.level === 'red' ? 'border-rose-500/40 bg-rose-500/5'
              : a.level === 'green' ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-[#FFF7EF]/10 bg-[#050403]'}`}>
              <div className="flex items-start gap-2">
                {a.level === 'red' ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  : a.level === 'green' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  : <Circle className="w-4 h-4 text-[#FFF7EF]/40 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-xs font-bold text-[#FFF7EF]">{a.title}</p>
                  <p className="text-[11px] text-[#FFF7EF]/65 mt-0.5">{a.detail}</p>
                  {a.action && <p className="text-[11px] text-[#D49A63] mt-1.5 flex items-center gap-1"><Zap className="w-3 h-3" /> Action : {a.action}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ② QUELLE ACTION CETTE SEMAINE ? */}
      <div>
        <Title icon={Crosshair} title="« Quelle action de pénétration cette semaine ? »" sub="Le lundi matin : ce que KURLA exécute pour approfondir le segment cible." />
        <Card className="border-[#C8753D]/40">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#C8753D]/20 text-[#D49A63]">SEMAINE {currentWeek.week} · {currentWeek.phase}</span>
            <span className="text-[11px] text-[#FFF7EF]/60">Objectif : {currentWeek.goal}</span>
          </div>
          <ul className="space-y-2">
            {currentWeek.actions.map((act, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#FFF7EF]/80">
                <ChevronRight className="w-3.5 h-3.5 text-[#C8753D] shrink-0 mt-0.5" /> {act}
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-[#FFF7EF]/10 grid sm:grid-cols-2 gap-2 text-[11px]">
            <p className="text-[#FFF7EF]/70"><b className="text-[#D49A63]">KPI de la semaine :</b> {currentWeek.kpi}</p>
            <p className="text-[#FFF7EF]/70"><b className="text-[#D49A63]">Décision :</b> {currentWeek.decision}</p>
          </div>
          <p className="text-[10px] text-[#FFF7EF]/40 mt-2">Progression réelle : {real.ordersPaid}/100 commandes du palier initial — la semaine affichée suit cette avancée.</p>
        </Card>
      </div>

      {/* ②b ROADMAP MENSUELLE M1–M12 */}
      <div>
        <Title icon={CalendarDays} title="Roadmap mensuelle de pénétration — M1 à M12 (France → Belgique)" sub="Chaque mois : objectifs chiffrés, budget, CAC, contenu, canaux, partenaires, recrutement et décision GO/PIVOT. Le mois courant est mis en évidence." />
        <div className="grid gap-2.5">
          {PEN_MONTHLY.map(m => {
            const reached = real.ordersPaid >= m.cumClients;
            const active = !reached && (m.month === 1 || real.ordersPaid >= (PEN_MONTHLY[m.month - 2]?.cumClients ?? 0));
            return (
              <Card key={m.month} className={`!p-4 ${active ? 'border-[#C8753D]/50' : ''} ${!reached && !active ? 'opacity-75' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center border shrink-0 text-[10px] font-bold ${
                    reached ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : active ? 'bg-[#C8753D]/25 border-[#C8753D] text-[#D49A63]'
                    : 'bg-[#FFF7EF]/5 border-[#FFF7EF]/15 text-[#FFF7EF]/40'}`}>{m.month}</span>
                  <p className="text-xs font-bold text-[#FFF7EF] flex-1">{m.label}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/70">{m.phase}</span>
                  <span className="text-[9px] text-[#FFF7EF]/50">{m.market}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-1.5 text-[10px] mb-2">
                  <MStat label="Clients cumulés" value={num(m.cumClients)} />
                  <MStat label="Nouveaux / mois" value={`+${num(m.newClients)}`} />
                  <MStat label="Commandes / mois" value={num(m.ordersMo)} />
                  <MStat label="CA mensuel" value={eur(m.revenueMoEur)} />
                  <MStat label="Budget pénétration" value={eur(m.budgetEur)} />
                  <MStat label="CAC max" value={eur(m.maxCacEur)} />
                  <MStat label="Contenus / sem." value={num(m.contentsPerWeek)} />
                </div>
                <div className="text-[10px] space-y-1 text-[#FFF7EF]/70">
                  <p><b className="text-[#D49A63]">Canaux :</b> {m.channels}</p>
                  <p><b className="text-[#D49A63]">Partenaires :</b> {m.partners} · <b className="text-[#D49A63]">Produits :</b> {m.products}</p>
                  <p><b className="text-[#D49A63]">Équipe :</b> {m.team}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-[#FFF7EF]/10 grid sm:grid-cols-2 gap-2 text-[10px]">
                  <p className="text-[#FFF7EF]/75"><b className="text-[#D49A63]">KPI :</b> {m.kpi}</p>
                  <p className={m.month % 6 === 0 ? 'text-emerald-300' : 'text-amber-200/90'}><b>Porte :</b> {m.gate}</p>
                  <p className="sm:col-span-2 text-[#FFF7EF]/65"><b className="text-[#C8753D]">Décision :</b> {m.decision}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ③ ESCALIER DE PÉNÉTRATION */}
      <div>
        <Title icon={Layers} title="Escalier de pénétration — 100 → 1 000 → 10 000 → 100 000 → 1 M" sub="Chaque palier : part de marché visée, CA, AOV, CAC max, budget, canaux, équipe et critère de passage." />
        <div className="space-y-2.5">
          {PEN_LADDER.map((rung, i) => {
            const done = i < currentRungIdx;
            const active = i === currentRungIdx;
            const pct = rung.clients ? Math.min(100, Math.round((real.ordersPaid / rung.clients) * 100)) : 0;
            return (
              <Card key={rung.id} className={`${active ? 'border-[#C8753D]/50' : ''} ${!done && !active ? 'opacity-75' : ''}`}>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center border shrink-0 ${
                    done ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : active ? 'bg-[#C8753D]/25 border-[#C8753D] text-[#D49A63]'
                    : 'bg-[#FFF7EF]/5 border-[#FFF7EF]/15 text-[#FFF7EF]/40'}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                  </span>
                  <p className="text-sm font-bold text-[#FFF7EF] flex-1">{rung.rungLabel}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/70">{rung.window}</span>
                  {done ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Atteint</span>
                    : active ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63]">En cours</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/50">Verrouillé</span>}
                </div>

                {active && (
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#C8753D] to-[#D49A63]" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                    <p className="text-[10px] text-[#D49A63] mt-1">{real.ordersPaid}/{num(rung.clients)} commandes réelles ({pct}%)</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-[11px] mb-3">
                  <Metric label="Objectif clients" value={num(rung.clients)} />
                  <Metric label="Part de marché" value={`${rung.segmentSharePct} %`} hint={rung.segmentBasis} />
                  <Metric label="CA mensuel visé" value={eur(rung.monthlyRevenueEur)} />
                  <Metric label="Panier moyen" value={eur(rung.aovEur)} />
                  <Metric label="Conversion visée" value={`${rung.convVisitToOrderPct} %`} />
                  <Metric label="Réachat 90 j" value={`${rung.repeatRate90dPct} %`} />
                  <Metric label="CAC maximum" value={eur(rung.maxCacEur)} />
                  <Metric label="Budget pénétration" value={eur(rung.penetrationBudgetEur)} />
                  <Metric label="Nouveaux/mois" value={num(rung.newClientsPerMonth)} />
                  <Metric label="Contenus/sem." value={num(rung.contentsPerWeek)} />
                  <Metric label="Créateurs actifs" value={num(rung.creatorsActive)} />
                  <Metric label="Partenaires locaux" value={num(rung.localPartners)} />
                </div>

                <div className="text-[11px] space-y-1.5">
                  <p className="text-[#FFF7EF]/70"><b className="text-[#D49A63]">Marché :</b> {rung.markets}</p>
                  <p className="text-[#FFF7EF]/70"><b className="text-[#D49A63]">Canaux :</b> {rung.channels.join(' · ')}</p>
                  <p className="text-[#FFF7EF]/70"><b className="text-[#D49A63]">Équipe :</b> {rung.team}</p>
                  <p className="text-[#FFF7EF]/70"><b className="text-[#D49A63]">Fonctionnalités :</b> {rung.features.join(' · ')}</p>
                  <div className="pt-2 border-t border-[#FFF7EF]/10 grid sm:grid-cols-2 gap-2">
                    <p className="text-emerald-300/90 flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span><b>Porte de passage :</b> {rung.validationGate}</span></p>
                    <p className="text-rose-300/90 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span><b>Critère d'échec → pivot :</b> {rung.failGate}</span></p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ④ LES 100 PREMIERS CLIENTS — 5 CANAUX */}
      <div>
        <Title icon={Users} title="Les 100 premiers clients — 5 canaux de pénétration" sub="100 = 25 + 20 + 20 + 20 + 15. Chaque canal a ses actions quantifiées, son script, son CTA et sa mesure." />
        <div className="grid md:grid-cols-2 gap-3">
          {PEN_FIRST100.filter(c => c.id !== 99).map(c => (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-bold text-[#FFF7EF]">{c.id}. {c.name}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C8753D]/20 text-[#D49A63] whitespace-nowrap">{c.targetClients} clients · {eur(c.budgetEur)}</span>
              </div>
              <p className="text-[10px] text-[#FFF7EF]/50 mb-2 italic">Hypothèse : {c.convAssumption}</p>
              <ul className="space-y-1 mb-2">
                {c.actions.map((a, i) => (
                  <li key={i} className="text-[11px] text-[#FFF7EF]/75 flex gap-1.5"><span className="text-[#C8753D] font-bold shrink-0">{a.qty}</span> {a.action}</li>
                ))}
              </ul>
              <div className="pt-2 border-t border-[#FFF7EF]/10 space-y-1 text-[10px]">
                <p className="text-[#FFF7EF]/65"><b className="text-[#D49A63]">Script :</b> {c.script}</p>
                <p className="text-[#FFF7EF]/65"><b className="text-[#D49A63]">CTA :</b> {c.cta}</p>
                <p className="text-[#FFF7EF]/65"><b className="text-[#D49A63]">Mesure :</b> {c.measure}</p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="mt-3 border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> TOTAL : 100 clients pour {eur(PEN_FIRST100.find(c => c.id === 99)?.budgetEur)} de budget</p>
          <p className="text-[11px] text-[#FFF7EF]/70 mt-1">{PEN_FIRST100.find(c => c.id === 99)?.measure}</p>
        </Card>

        {/* Tableau de bord des canaux : planifié vs ventes réelles (UTM) */}
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#D49A63] mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Performance réelle par canal de pénétration (attribution UTM)
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {channelBoard.channels.map(ch => {
              const tone = ch.status === 'win'
                ? { border: 'border-emerald-500/40', chip: 'bg-emerald-500/20 text-emerald-300', label: 'GAGNANT — renforcer' }
                : ch.status === 'active'
                  ? { border: 'border-amber-400/40', chip: 'bg-amber-400/20 text-amber-200', label: 'ACTIF — accélérer' }
                  : { border: 'border-[#FFF7EF]/15', chip: 'bg-[#FFF7EF]/10 text-[#FFF7EF]/60', label: 'À LANCER' };
              return (
                <div key={ch.id} className={`rounded-xl border ${tone.border} bg-[#050403] p-3 flex flex-col`}>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start mb-1.5 ${tone.chip}`}>{tone.label}</span>
                  <p className="text-[10px] font-semibold text-[#FFF7EF] leading-tight mb-2">{ch.name}</p>
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-lg font-bold text-[#D49A63]">{ch.realOrders}</span>
                    <span className="text-[10px] text-[#FFF7EF]/50">/ {ch.targetClients} visés</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden mb-1.5">
                    <div className={`h-full ${ch.status === 'win' ? 'bg-emerald-400' : ch.status === 'active' ? 'bg-amber-400' : 'bg-[#FFF7EF]/30'}`}
                      style={{ width: `${Math.min(100, ch.attainmentPct)}%` }} />
                  </div>
                  <p className="text-[10px] text-[#FFF7EF]/50">{ch.attainmentPct}% de l'objectif · {eur(ch.realRevenue)}</p>
                  <p className="text-[10px] text-[#FFF7EF]/60 mt-1.5 pt-1.5 border-t border-[#FFF7EF]/8 leading-snug">{ch.decision}</p>
                </div>
              );
            })}
          </div>
          {channelBoard.otherChannels.length > 0 && (
            <p className="text-[10px] text-[#FFF7EF]/50 mt-2">
              Autres canaux réels hors palier 100 (leviers d'échelle) : {channelBoard.otherChannels.map(o => `${o.channel} (${o.orders})`).join(' · ')}.
            </p>
          )}
          {(real.channels?.length ?? 0) === 0 && (
            <p className="text-[10px] text-amber-300/90 mt-2">
              Aucune vente attribuée à un canal : pose des paramètres UTM sur TOUS les liens (TikTok, créateurs, communautés, salons, parrainage) et applique la migration
              <code className="mx-1">orders.attribution</code> pour que la répartition par canal remonte.
            </p>
          )}
        </div>
      </div>

      {/* ④b CAMPAIGN PLANNER — planifié vs réel par campagne UTM */}
      <div>
        <Title icon={ClipboardList} title="Campaign Planner — planifié vs réel par campagne (UTM utm_campaign)" sub="11 campagnes chiffrées qui portent les 1 000 premiers clients (100 en M1-M2 + 900 en M3-M6). Chaque campagne a son UTM campagne à poser — le réel ne remonte que si l'UTM est posée. Le tableau de bord des canaux reste la vue par canal ; le planner est la vue par campagne exécutable." />
        {/* Résumé */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <Card className="!p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">Clients planifiés (campa.)</p>
            <p className="text-xl font-bold text-[#FFF7EF]">{num(campaignBoard.totals.plannedClients)}</p>
            <p className="text-[10px] text-[#FFF7EF]/50">100 (M1-M2) + 900 (M3-M6)</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">Commandes réelles (campagnes)</p>
            <p className="text-xl font-bold text-[#D49A63]">{num(campaignBoard.totals.realOrders)}</p>
            <p className="text-[10px] text-[#FFF7EF]/50">{campaignBoard.totals.attainmentPct}% de l'objectif · {num(campaignBoard.totals.plannedClients - campaignBoard.totals.realOrders)} restantes</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">CA planifié (campagnes)</p>
            <p className="text-xl font-bold text-[#FFF7EF]">{eur(campaignBoard.totals.plannedRevenue)}</p>
            <p className="text-[10px] text-[#FFF7EF]/50">réel {eur(campaignBoard.totals.realRevenue)}</p>
          </Card>
          <Card className="!p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">Budget planifié (campagnes)</p>
            <p className="text-xl font-bold text-[#FFF7EF]">{eur(campaignBoard.totals.plannedBudget)}</p>
            <p className="text-[10px] text-[#FFF7EF]/50">M1-M6 : 1 800 € + 10 100 €</p>
          </Card>
        </div>
        <div className="h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-[#C8753D] to-[#D49A63]" style={{ width: `${Math.min(100, campaignBoard.totals.attainmentPct)}%` }} />
        </div>
        {/* Filtres */}
        <div className="flex gap-1.5 mb-3">
          {([
            { id: 'all', label: 'Toutes (11)' },
            { id: 'm1m2', label: 'M1-M2 — palier 100 (5)' },
            { id: 'm3m6', label: 'M3-M6 — échelle 1 000 (6)' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setCampaignFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${campaignFilter === f.id ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#1A0F0A] text-[#FFF7EF]/60 border-[#FFF7EF]/10 hover:border-[#C8753D]/30'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {/* Grille campagnes */}
        <div className="grid md:grid-cols-2 gap-3">
          {campaignBoard.campaigns
            .filter(c => campaignFilter === 'all' ? true : campaignFilter === 'm1m2' ? c.window.includes('M1') : c.window.includes('M3') || c.window.includes('M4') || c.window.includes('M5') || c.window.includes('M6'))
            .map(c => {
              const tone = c.status === 'win'
                ? { border: 'border-emerald-500/40', chip: 'bg-emerald-500/20 text-emerald-300', label: 'GAGNANTE — industrialiser' }
                : c.status === 'active'
                  ? { border: 'border-amber-400/40', chip: 'bg-amber-400/20 text-amber-200', label: 'EN COURS' }
                  : { border: 'border-[#FFF7EF]/15', chip: 'bg-[#FFF7EF]/10 text-[#FFF7EF]/60', label: 'À LANCER' };
              const cacDisplay = c.targetCacEur === null ? 'organique' : eur(c.targetCacEur);
              return (
                <div key={c.id} className={`rounded-xl border ${tone.border} bg-[#050403] p-4 flex flex-col`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#FFF7EF] leading-tight">{c.name}</p>
                      <p className="text-[10px] text-[#FFF7EF]/50 mt-0.5">{c.channel} · {c.window} · {c.segment}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${tone.chip}`}>{tone.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FFF7EF]/10 text-[#D49A63] border border-[#FFF7EF]/10">utm_campaign={c.utmCampaign}</span>
                    <span className="text-[9px] text-[#FFF7EF]/40">utm_source={c.utmSource} · utm_medium={c.utmMedium}</span>
                  </div>
                  <p className="text-[10px] text-[#FFF7EF]/60 mb-2"><b className="text-[#D49A63]">Offre :</b> {c.offer} · <b className="text-[#D49A63]">Budget :</b> {eur(c.budgetEur)} · CAC cible {cacDisplay}</p>
                  <div className="flex items-end justify-between mb-1">
                    <span className="text-lg font-bold text-[#D49A63]">{c.realOrders}</span>
                    <span className="text-[10px] text-[#FFF7EF]/50">/ {c.targetClients} clients visés</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#FFF7EF]/10 overflow-hidden mb-1.5">
                    <div className={`h-full ${c.status === 'win' ? 'bg-emerald-400' : c.status === 'active' ? 'bg-amber-400' : 'bg-[#FFF7EF]/30'}`} style={{ width: `${Math.min(100, c.attainmentPct)}%` }} />
                  </div>
                  <p className="text-[10px] text-[#FFF7EF]/50">{c.attainmentPct}% · {eur(c.realRevenue)} / {eur(c.targetRevenueEur)} prévus</p>
                  <p className="text-[10px] text-[#FFF7EF]/60 mt-2 pt-2 border-t border-[#FFF7EF]/8 leading-snug">{c.decision}</p>
                  {c.matchedFrom.length > 0 && <p className="text-[9px] text-[#FFF7EF]/40 mt-1">Matché via : {c.matchedFrom.join(', ')}</p>}
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-bold text-[#D49A63]">Actions :</p>
                    <ul className="space-y-0.5">
                      {c.actions.map((a, i) => (
                        <li key={i} className="text-[10px] text-[#FFF7EF]/75 flex gap-1.5"><span className="text-[#C8753D]">▸</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#FFF7EF]/10 grid grid-cols-2 gap-2 text-[10px]">
                    <p className="text-[#FFF7EF]/60"><b className="text-[#D49A63]">KPI :</b> {c.kpi}</p>
                    <p className="text-emerald-300/80"><b>Porte :</b> {c.gate}</p>
                  </div>
                </div>
              );
            })}
        </div>
        {campaignBoard.otherCampaigns.length > 0 && (
          <p className="text-[10px] text-[#FFF7EF]/50 mt-3">
            Autres campagnes réelles hors plan (leviers non planifiés ou UTM libres) : {campaignBoard.otherCampaigns.map(o => `${o.campaign} (${o.orders})`).join(' · ')}.
          </p>
        )}
        {(real.campaigns?.length ?? 0) === 0 && (
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <p className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Aucune campagne tracée — comment tracer ?</p>
            <p className="text-[11px] text-[#FFF7EF]/70 mt-1">Ajoute <code className="px-1 py-0.5 rounded bg-[#050403] border border-[#FFF7EF]/10">?utm_source=...&utm_medium=...&utm_campaign=kurla-...</code> à TOUS les liens (bio TikTok, DM, messages créatrices, QR salon, emails, parrainage). Les 11 UTM campagnes à poser sont listées ci-dessus. Sans utm_campaign, le planner reste à 0 et le tableau de bord des canaux est la seule vue disponible.</p>
            <p className="text-[10px] text-[#FFF7EF]/50 mt-1.5">Exemples : <code className="text-[10px]">kurla.app/diagnostic?utm_source=tiktok&amp;utm_medium=organic&amp;utm_campaign=kurla-tiktok-organic</code> · <code className="text-[10px]">kurla.app/boutique?utm_source=creator&amp;utm_medium=affiliate&amp;utm_campaign=kurla-crea-barter</code></p>
          </div>
        )}
      </div>

      {/* ⑤ SEGMENTS FRANCE */}
      <div>
        <Title icon={Target} title="Pénétration France — segment par segment" sub="Ordre d'attaque : on ne passe au segment adjacent que lorsque le précédent est validé." />
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="text-[#D49A63] border-b border-[#FFF7EF]/10">
              <th className="py-2 pr-3 text-left">#</th><th className="py-2 pr-3 text-left">Segment</th>
              <th className="py-2 pr-3 text-left">Problème / zone</th><th className="py-2 pr-3 text-left">Offre d'entrée</th>
              <th className="py-2 pr-3 text-right">Clients</th><th className="py-2 pr-3 text-left">Quand</th>
              <th className="py-2 text-left">Critère de validation</th>
            </tr></thead>
            <tbody className="divide-y divide-[#FFF7EF]/5">
              {PEN_SEGMENTS_FR.map(seg => (
                <tr key={seg.id} className={seg.micro ? 'bg-[#C8753D]/5' : ''}>
                  <td className="py-2.5 pr-3 font-bold text-[#C8753D]">{seg.rank}{seg.micro && <span className="ml-1 text-[9px] text-amber-300">★ micro</span>}</td>
                  <td className="py-2.5 pr-3 font-semibold text-[#FFF7EF] whitespace-nowrap">{seg.name}</td>
                  <td className="py-2.5 pr-3 text-[#FFF7EF]/65 max-w-[200px]">{seg.problem}<br /><span className="text-[#FFF7EF]/40">{seg.geography}</span></td>
                  <td className="py-2.5 pr-3 text-[#FFF7EF]/75 max-w-[180px]">{seg.entryOffer}<br /><span className="text-[#D49A63]">{seg.entryPrice} · {seg.channel}</span></td>
                  <td className="py-2.5 pr-3 text-right font-bold text-[#FFF7EF] whitespace-nowrap">{num(seg.targetClients)}</td>
                  <td className="py-2.5 pr-3 text-[#FFF7EF]/60 whitespace-nowrap">{seg.when}</td>
                  <td className="py-2 text-emerald-300/80 max-w-[220px]">{seg.validation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⑥ CARTE DE PÉNÉTRATION GÉOGRAPHIQUE */}
      <div>
        <Title icon={MapIcon} title="Carte de pénétration & expansion — un marché à la fois" sub="Chaque marché n'est attaqué que sur déclenchement du critère de validation du précédent." />
        {(['France', 'Europe', 'Afrique', 'Monde'] as const).map(region => (
          <div key={region} className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#D49A63] mb-2">{region}</p>
            <div className="space-y-2">
              {marketsByRegion(region).map(m => {
                const meta = PEN_PHASE_META[m.phase];
                return (
                  <Card key={m.id} className="!p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${phaseColor[meta.color]}`}>{meta.label}</span>
                      <p className="text-xs font-bold text-[#FFF7EF] flex-1">{m.country}</p>
                      <span className="text-[10px] text-[#FFF7EF]/50">Vague {m.wave} · {m.language} · test {m.validationWindow}</span>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px] text-[#FFF7EF]/70">
                      <p><b className="text-[#D49A63]">Segment d'entrée :</b> {m.entrySegment}</p>
                      <p><b className="text-[#D49A63]">Offre :</b> {m.entryOffer} ({m.price})</p>
                      <p><b className="text-[#D49A63]">Canal principal :</b> {m.primaryChannel}</p>
                      <p><b className="text-[#D49A63]">Influence :</b> {m.influence}</p>
                      <p><b className="text-[#D49A63]">Partenaires :</b> {m.localPartners}</p>
                      <p><b className="text-[#D49A63]">Logistique :</b> {m.logistics}</p>
                      <p><b className="text-[#D49A63]">Réglementation :</b> {m.regulation}</p>
                      <p><b className="text-[#D49A63]">Budget test :</b> {eur(m.budgetEur)} · objectif {num(m.targetClients)} clients</p>
                      <p><b className="text-[#D49A63]">Déclenchement :</b> {m.trigger}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#FFF7EF]/10 grid sm:grid-cols-2 gap-2 text-[10px]">
                      <p className="text-emerald-300/90"><b>✓ Succès → scale :</b> {m.successGate}</p>
                      <p className="text-rose-300/90"><b>✗ Échec → pivot/retrait :</b> {m.failGate}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ⑥b PLAN D'INFLUENCE */}
      <div>
        <Title icon={Megaphone} title="Plan d'influence pour pénétrer le segment" sub="Recrutement continu dans chaque nouveau segment/marché : nano (crédibilité) → micro (portée) → macro/experts (amplification/autorité) → UGC clientes." />
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="text-[#D49A63] border-b border-[#FFF7EF]/10">
              <th className="py-2 pr-3 text-left">Palier créateurs</th>
              <th className="py-2 pr-3 text-center">100</th><th className="py-2 pr-3 text-center">1k</th><th className="py-2 pr-3 text-center">10k</th>
              <th className="py-2 pr-3 text-left">Rémunération</th><th className="py-2 pr-3 text-left">Campagne / KPI</th>
              <th className="py-2 text-left">Renouveler / arrêter</th>
            </tr></thead>
            <tbody className="divide-y divide-[#FFF7EF]/5">
              {PEN_INFLUENCE.map((t, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-3 font-semibold text-[#FFF7EF] whitespace-nowrap">{t.tier}<br /><span className="text-[#FFF7EF]/40 font-normal">{t.followers}</span></td>
                  <td className="py-2.5 pr-3 text-center font-bold text-[#FFF7EF]">{t.count100}</td>
                  <td className="py-2.5 pr-3 text-center font-bold text-[#FFF7EF]">{t.count1k}</td>
                  <td className="py-2.5 pr-3 text-center font-bold text-[#D49A63]">{t.count10k}</td>
                  <td className="py-2.5 pr-3 text-[#FFF7EF]/70 whitespace-nowrap">{t.compensation}<br /><span className="text-[#D49A63]">{t.budgetEach} · {t.clientsEach}</span></td>
                  <td className="py-2.5 pr-3 text-[#FFF7EF]/65 max-w-[220px]">{t.campaign}<br /><span className="text-emerald-300/80">KPI : {t.kpi}</span></td>
                  <td className="py-2 text-[#FFF7EF]/60 max-w-[200px]"><span className="text-emerald-300/80">✓ {t.renew}</span><br /><span className="text-rose-300/80">✗ {t.stop}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card className="mt-3 !p-4">
          <p className="text-[11px] font-bold text-[#D49A63] mb-2">Pipeline de recrutement continu (relancé dans CHAQUE segment/marché)</p>
          <ol className="space-y-1.5">
            {INFLUENCE_PIPELINE.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-[#FFF7EF]/75">
                <span className="w-4 h-4 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* ⑥c PARTENARIATS DE PÉNÉTRATION */}
      <div>
        <Title icon={Handshake} title="Partenaires de pénétration — accélérateurs par segment & marché" sub="Chaque partenaire a une offre conjointe, un intérêt clair, une acquisition attendue et un critère de renouvellement." />
        <div className="grid md:grid-cols-2 gap-3">
          {PEN_PARTNERS.map((p, i) => (
            <Card key={i} className="!p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-xs font-bold text-[#FFF7EF]">{p.type}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7EF]/10 text-[#FFF7EF]/60 whitespace-nowrap">{p.where}</span>
              </div>
              <p className="text-[10px] text-[#D49A63] mb-2">Segment : {p.segment}</p>
              <div className="space-y-1 text-[10px] text-[#FFF7EF]/70">
                <p><b className="text-[#FFF7EF]/90">Offre conjointe :</b> {p.jointOffer}</p>
                <p><b className="text-[#FFF7EF]/90">Intérêt du partenaire :</b> {p.partnerInterest}</p>
                <p className="text-[#D49A63]"><b>Acquisition attendue :</b> {p.expectedAcq}</p>
                <p><b className="text-[#FFF7EF]/90">KPI :</b> {p.kpi}</p>
                <p className="text-emerald-300/80"><b>Renouvellement :</b> {p.renew}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ⑥d PROFONDEUR DE PÉNÉTRATION */}
      <div>
        <Title icon={HeartHandshake} title="Profondeur de pénétration — du 1er achat à l'ambassadrice" sub="Un segment est « possédé » quand les clientes reviennent, s'abonnent, recommandent et pénètrent le segment pour KURLA." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          {PEN_DEPTH.map((d, i) => (
            <Card key={i} className="!p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#C8753D]/20 text-[#D49A63] text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <p className="text-xs font-bold text-[#FFF7EF]">{d.step}</p>
              </div>
              <p className="text-[10px] text-[#FFF7EF]/60 mb-2">{d.meaning}</p>
              <p className="text-[10px] text-[#FFF7EF]/75 mb-1.5"><b className="text-[#D49A63]">Mécanisme :</b> {d.mechanism}</p>
              <p className="text-[10px] text-[#FFF7EF]/55 mb-2"><b className="text-[#FFF7EF]/80">Outil :</b> {d.tool}</p>
              <div className="pt-2 border-t border-[#FFF7EF]/10 flex items-center justify-between text-[10px]">
                <span className="text-[#FFF7EF]/60">{d.kpi}</span>
                <span className="text-emerald-300 font-bold whitespace-nowrap">{d.target}</span>
              </div>
            </Card>
          ))}
        </div>
        <Card className="!p-4">
          <p className="text-[11px] font-bold text-[#D49A63] mb-2">On mesure la PROFONDEUR (pas seulement le volume) par segment</p>
          <ul className="grid sm:grid-cols-2 gap-1.5">
            {PEN_DEPTH_KPIS.map((k, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-[#FFF7EF]/75"><Gauge className="w-3.5 h-3.5 text-[#C8753D] shrink-0 mt-0.5" />{k}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ⑦ CALCULATRICE DE PÉNÉTRATION */}
      <div>
        <Title icon={Calculator} title="Calculatrice de pénétration — les équations" sub="Hypothèses explicites : trafic ciblé, budget et CA nécessaires pour atteindre un objectif clients." />
        <Card>
          <div className="grid sm:grid-cols-4 gap-3 mb-4">
            <CalcField label="Objectif clients" value={calcTarget} onChange={setCalcTarget} step={50} />
            <CalcField label="Conversion visite→commande (%)" value={calcConv} onChange={setCalcConv} step={0.1} />
            <CalcField label="CAC visé (€)" value={calcCac} onChange={setCalcCac} step={1} />
            <CalcField label="Panier moyen (€)" value={calcAov} onChange={setCalcAov} step={1} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Result label="Trafic ciblé nécessaire" value={num(calc.targetedVisitors)} />
            <Result label="Diagnostics à compléter" value={num(calc.diagnosticsCompleted)} />
            <Result label="Budget de pénétration" value={eur(calc.penetrationBudgetEur)} accent />
            <Result label="CA généré (1ère cmd)" value={eur(calc.revenueEur)} accent />
            <Result label="Coût acquisition réel" value={eur(calc.cacEur)} />
          </div>
          <p className="text-[10px] text-[#FFF7EF]/45 mt-3">
            Équations : visiteurs = clients ÷ taux de conversion · diagnostics = visiteurs × 35 % (l'aimant) · budget = clients × CAC · CA = clients × AOV.
            Les taux de conversion et CAC sont des <b>hypothèses</b> tant que le funnel réel (UTM + analytics) ne les a pas confirmés.
          </p>
        </Card>
      </div>

      {/* ⑧ BOUCLE DE DÉCISION */}
      <div>
        <Title icon={Gauge} title="La boucle de pilotage — approfondir / pivoter / étendre" sub="Hiérarchie vision → exécution → résultat → décision." />
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            {['Vision : leader mondial beauté personnalisée', 'Pénétrer méthodiquement chaque segment/marché', 'Objectifs de part de marché', 'Marchés séquencés', 'Segments séquencés', 'Offres de pénétration', 'Canaux par segment', 'Campagnes', 'Actions de la semaine', 'KPI de pénétration', 'Résultats réels'].map((step, i, arr) => (
              <React.Fragment key={step}>
                <span className={`px-2.5 py-1.5 rounded-lg ${i >= 9 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/75'}`}>{step}</span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-[#C8753D] shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span className="px-2.5 py-1.5 rounded-lg bg-[#C8753D]/20 text-[#D49A63]">DÉCISION</span>
            {['APPROFONDIR (critère atteint, on renforce)', 'PIVOTER (critère d’échec déclenché)', 'ÉTENDRE (segment saturé → adjacent)', 'ABANDONNER (marché non validé, budget test épuisé)'].map(d => (
              <span key={d} className="px-2.5 py-1.5 rounded-lg bg-[#050403] border border-[#FFF7EF]/10 text-[#FFF7EF]/75">{d}</span>
            ))}
          </div>
          <p className="text-[10px] text-[#FFF7EF]/50 mt-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#D49A63]" />
            Expansion sans faille : aucun nouveau marché n’est ouvert tant que le précédent n’a pas atteint son critère de validation mesuré ci-dessus.
          </p>
        </Card>
      </div>
    </div>
  );
};

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">{label}</p>
      <p className="text-[13px] font-bold text-[#FFF7EF]">{value}</p>
      {hint && <p className="text-[9px] text-[#FFF7EF]/35 leading-tight">{hint}</p>}
    </div>
  );
}
function MStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/45">{label}</p>
      <p className="text-[12px] font-bold text-[#FFF7EF]">{value}</p>
    </div>
  );
}
function CalcField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50 font-semibold">{label}</span>
      <input type="number" value={value} step={step} min={0}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-[#050403] border border-[#FFF7EF]/15 text-sm text-[#FFF7EF] focus:outline-none focus:border-[#C8753D]" />
    </label>
  );
}
function Result({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${accent ? 'border-[#C8753D]/40 bg-[#C8753D]/10' : 'border-[#FFF7EF]/10 bg-[#050403]'}`}>
      <p className="text-[9px] uppercase tracking-wider text-[#FFF7EF]/50">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accent ? 'text-[#D49A63]' : 'text-[#FFF7EF]'}`}>{value}</p>
    </div>
  );
}
