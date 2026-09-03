import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Calendar, Check, ChevronRight, Clock, CloudRain, Droplets, Heart,
  MessageCircle, RefreshCw, Scissors, ShoppingBag, Sparkles, Target, Wallet, Wind,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getOutcomes, getShelf, getWashDay } from '../../services/intelligenceService';
import { FEATURE_VALUE } from '../../data/personalSpace';
import { WhyItMatters } from './WhyItMatters';

/**
 * Hub beauté de l'espace personnel.
 *
 * Principe : on n'obtient pas des données en ajoutant des champs, on en obtient
 * en montrant ce que la personne gagne à les remplir. Le hub fait donc trois
 * choses, dans cet ordre :
 *   1. dire où elle en est (progression réelle, calculée depuis ses données) ;
 *   2. dire quelle est LA prochaine action utile — une seule, pas dix ;
 *   3. expliquer pourquoi chaque outil existe.
 *
 * Tout ce qui est affiché est calculé depuis l'état réel du compte. Aucun
 * compteur, aucun « streak », aucune preuve sociale n'est inventé : si la donnée
 * n'existe pas, on affiche l'invitation à la créer, pas un chiffre décoratif.
 */

type Props = {
  headers: HeadersInit;
  ordersCount: number;
  onNavigateTab: (tab: 'commandes' | 'profil') => void;
};

const UNKNOWN = 'inconnue';

function isKnown(v: unknown): boolean {
  return typeof v === 'string' && v.trim() !== '' && v !== UNKNOWN;
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

/** Anneau de progression. Une seule valeur, lisible d'un coup d'œil. */
export const ProgressionRing: React.FC<{ value: number; size?: number }> = ({ value, size = 96 }) => {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg width={size} height={size} role="img" aria-label={`Profil complété à ${clamped} %`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#FFF7EF" strokeOpacity="0.12" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#C8753D"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFF7EF"
        fontSize={size * 0.26}
        fontWeight={700}
        fontFamily="Inter, Helvetica, Arial, sans-serif"
      >
        {clamped}%
      </text>
    </svg>
  );
};

const HairChip: React.FC<{ icon: React.ReactNode; label: string; value?: string; missing?: boolean }> = ({ icon, label, value, missing }) => (
  <div className={`rounded-2xl border p-4 ${missing ? 'bg-[#050403] border-dashed border-[#FFF7EF]/15' : 'bg-[#050403] border-[#FFF7EF]/10'}`}>
    <div className="flex items-center gap-2 text-[#C8753D]">{icon}<span className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">{label}</span></div>
    {missing ? (
      <p className="text-[11px] text-[#FFF7EF]/40 mt-2 italic">À renseigner</p>
    ) : (
      <p className="text-sm font-bold text-[#FFF7EF] mt-2 capitalize">{value}</p>
    )}
  </div>
);

export const BeautyHub: React.FC<Props> = ({ headers, ordersCount, onNavigateTab }) => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [profile, setProfile] = useState<any>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestRoutine, setLatestRoutine] = useState<any>(null);

  const [shelfCount, setShelfCount] = useState<number | null>(null);
  const [outcomeCount, setOutcomeCount] = useState<number | null>(null);
  const [washCycle, setWashCycle] = useState<{ intervalDays: number; lastWashDayAt?: string } | null>(null);
  const [washTasks, setWashTasks] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/beauty-profile', { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!active || !data) return;
        setProfile(data.record?.profile ?? data.profile ?? null);
        // `confidence.overall` est déjà un pourcentage (0-100) côté serveur :
        // le multiplier par 100 ici affichait « 4500 % ».
        const overall = data.record?.confidence?.overall ?? data.confidence?.overall;
        setConfidence(typeof overall === 'number' ? Math.round(overall) : null);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    try {
      const raw = sessionStorage.getItem('kurla_diagnostic_result');
      if (raw) setLatestRoutine(JSON.parse(raw));
    } catch { /* ignore */ }
    return () => { active = false; };
  }, [headers]);

  useEffect(() => {
    if (!token) return;
    // Chaque appel est isolé : un service indisponible ne doit jamais vider le hub.
    getShelf(token).then(items => setShelfCount(items.length)).catch(() => setShelfCount(null));
    getOutcomes(token).then(items => setOutcomeCount(items.length)).catch(() => setOutcomeCount(null));
    getWashDay(token)
      .then(state => {
        setWashCycle(state.cycle ?? null);
        // Les tâches quotidiennes n'ont pas d'état de complétion côté serveur :
        // on affiche le nombre de gestes prévus, pas un compteur de retard inventé.
        setWashTasks(Array.isArray(state.dailyTasks) ? state.dailyTasks.length : 0);
      })
      .catch(() => { setWashCycle(null); setWashTasks(null); });
  }, [token]);

  const hair = profile?.hair ?? {};
  const texture = Array.isArray(hair.texturePatterns) ? hair.texturePatterns.find(isKnown) : undefined;
  const porosity = isKnown(hair.porosity) ? hair.porosity : undefined;
  const scalp = isKnown(hair.scalpCondition) ? hair.scalpCondition : undefined;
  const wash = isKnown(hair.washFrequency) ? hair.washFrequency : undefined;
  const budget = isKnown(hair.budget) ? hair.budget : undefined;
  const filledCount = [texture, porosity, scalp, wash, budget].filter(Boolean).length;
  const hasProfile = filledCount > 0;

  const score = confidence ?? 0;

  /** Les quatre étapes qui débloquent réellement tout le reste. */
  const steps = useMemo(() => {
    const profileStarted = hasProfile;
    const profileSolid = score >= 70;
    const shelfDone = (shelfCount ?? 0) > 0;
    const outcomeDone = (outcomeCount ?? 0) > 0;
    return [
      {
        id: 'diagnostic',
        done: profileStarted,
        title: 'Faire ton diagnostic',
        unlock: 'Ta première routine, ordonnée et adaptée à ta texture.',
        href: '/diagnostic/cheveux',
        cta: 'Lancer le diagnostic',
        icon: <Sparkles className="w-4 h-4" />,
      },
      {
        id: 'profil',
        done: profileSolid,
        title: 'Compléter ton KURLA ID à 70 %',
        unlock: 'Des réponses de KURLA AI réellement contextualisées, plus des généralités.',
        href: '/account/kurla-id',
        cta: 'Compléter mon profil',
        icon: <Target className="w-4 h-4" />,
      },
      {
        id: 'shelf',
        done: shelfDone,
        title: 'Renseigner ton étagère',
        unlock: 'Le verdict d’achat : savoir quoi finir avant de racheter.',
        href: '/account/shelf',
        cta: 'Ajouter mes produits',
        icon: <Droplets className="w-4 h-4" />,
      },
      {
        id: 'suivi',
        done: outcomeDone,
        title: 'Noter ta première observation',
        unlock: 'La preuve que ta routine marche — et des notes fiables pour les autres.',
        href: '/account/progression',
        cta: 'Noter un résultat',
        icon: <Calendar className="w-4 h-4" />,
      },
    ];
  }, [hasProfile, score, shelfCount, outcomeCount]);

  const completedSteps = steps.filter(s => s.done).length;
  const nextStep = steps.find(s => !s.done) ?? null;

  /** Statut du wash day, calculé — jamais inventé. */
  const washStatus = useMemo(() => {
    if (!washCycle) return null;
    const interval = washCycle.intervalDays || 7;
    const since = daysSince(washCycle.lastWashDayAt);
    if (since === null) {
      return { label: 'Aucun wash day enregistré', tone: 'todo' as const, detail: 'Indique ton dernier lavage pour recevoir tes échéances.' };
    }
    const late = since - interval;
    if (late > 2) return { label: `Retard de ${late} jours`, tone: 'late' as const, detail: `Ton rythme : tous les ${interval} jours. Dernier lavage il y a ${since} jours.` };
    if (late >= -1) return { label: 'C’est le moment', tone: 'due' as const, detail: `Ton rythme : tous les ${interval} jours. Dernier lavage il y a ${since} jours.` };
    return { label: 'Dans les temps', tone: 'ok' as const, detail: `Prochain lavage dans ${-late} jours. Dernier lavage il y a ${since} jours.` };
  }, [washCycle]);

  const quickLink = (href: string, icon: React.ReactNode, title: string, sub: string, primary?: boolean) => (
    <a
      href={href}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group ${
        primary ? 'bg-gradient-to-r from-[#C8753D] to-[#D49A63] border-transparent text-white' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
      }`}
    >
      <span className={primary ? 'text-white' : 'text-[#C8753D]'}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${primary ? 'text-white' : 'text-[#FFF7EF]'}`}>{title}</p>
        <p className={`text-[11px] ${primary ? 'text-white/80' : 'text-[#FFF7EF]/55'}`}>{sub}</p>
      </div>
      <ChevronRight className={`w-4 h-4 ${primary ? 'text-white' : 'text-[#FFF7EF]/30 group-hover:text-[#C8753D]'}`} />
    </a>
  );

  return (
    <div className="space-y-6">

      {/* ——— 1. Où tu en es ——— */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1A0F0A] to-[#3A2218]/60 border border-[#C8753D]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-[#C8753D]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row gap-6 sm:items-center">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-widest text-[#D49A63] font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Ton espace beauté
            </p>
            {loading ? (
              <p className="text-sm text-[#FFF7EF]/50 mt-2">Chargement de ton profil…</p>
            ) : hasProfile ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF] mt-2">
                  Voici ton portrait cheveux
                </h2>
                <p className="text-sm text-[#FFF7EF]/70 mt-2 max-w-xl">
                  Tout ce que KURLA te conseille part de ce profil. Chaque champ que tu complètes
                  remplace une approximation par une certitude.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF] mt-2">
                  On commence par ton diagnostic ?
                </h2>
                <p className="text-sm text-[#FFF7EF]/70 mt-2 max-w-xl">
                  Cinq questions guidées, avec des visuels, pour identifier ta texture, ta porosité
                  et repartir avec une routine ordonnée.
                </p>
                <a
                  href="/diagnostic/cheveux"
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#3A2218] text-sm font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Faire le diagnostic <ArrowRight className="w-4 h-4" />
                </a>
              </>
            )}
          </div>

          {hasProfile && (
            <div className="flex items-center gap-4 shrink-0">
              <ProgressionRing value={score} />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#FFF7EF]/50">Profil complété</p>
                <p className="text-sm font-bold text-[#FFF7EF]">{completedSteps}/4 étapes</p>
                <p className="text-[11px] text-[#D49A63] mt-1">
                  {score < 40 ? 'Encore trop creux' : score < 70 ? 'Bien parti' : score < 100 ? 'Presque complet' : 'Complet'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ——— 2. La prochaine action (une seule) ——— */}
      {!loading && nextStep && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#050403] border border-[#C8753D]/40 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-11 h-11 rounded-2xl bg-[#C8753D]/15 text-[#C8753D] flex items-center justify-center shrink-0">
            {nextStep.icon}
          </span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#D49A63]">
              La prochaine action qui change quelque chose
            </p>
            <p className="text-base font-semibold text-[#FFF7EF] mt-0.5">{nextStep.title}</p>
            <p className="text-xs text-[#FFF7EF]/60 mt-1">{nextStep.unlock}</p>
          </div>
          <a
            href={nextStep.href}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-bold transition-all"
          >
            {nextStep.cta} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* ——— 3. Les quatre étapes, avec l'état réel ——— */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3">
          Tes 4 étapes pour débloquer tout KURLA
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {steps.map((step) => (
            <a
              key={step.id}
              href={step.href}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                step.done
                  ? 'bg-[#0B1A0F] border-emerald-500/30 hover:border-emerald-400/50'
                  : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  step.done ? 'bg-emerald-500 text-[#050403]' : 'border border-[#FFF7EF]/25 text-[#FFF7EF]/30'
                }`}
              >
                {step.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step.icon}
              </span>
              <span className="flex-1">
                <span className={`block text-sm font-bold ${step.done ? 'text-emerald-200' : 'text-[#FFF7EF]'}`}>
                  {step.title}
                </span>
                <span className={`block text-[11px] mt-1 ${step.done ? 'text-emerald-200/60' : 'text-[#FFF7EF]/55'}`}>
                  {step.done ? 'Débloqué' : step.unlock}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#FFF7EF]/25 mt-1 shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* ——— 4. Ton rythme (wash day), calculé ——— */}
      {washStatus && (
        <div className="p-5 rounded-3xl bg-[#050403] border border-[#FFF7EF]/10 flex flex-col sm:flex-row sm:items-center gap-4">
          <span
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              washStatus.tone === 'late'
                ? 'bg-amber-500/15 text-amber-300'
                : washStatus.tone === 'due'
                  ? 'bg-[#C8753D]/15 text-[#C8753D]'
                  : washStatus.tone === 'ok'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-[#FFF7EF]/8 text-[#FFF7EF]/60'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#D49A63]">Ton Wash Day</p>
            <p className="text-sm font-bold text-[#FFF7EF] mt-0.5">{washStatus.label}</p>
            <p className="text-[11px] text-[#FFF7EF]/55 mt-0.5">
              {washStatus.detail}
              {washTasks !== null && washTasks > 0 ? ` · ${washTasks} geste(s) prévu(s) au quotidien` : ''}
            </p>
          </div>
          <a
            href="/account/wash-day"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs font-semibold text-[#FFF7EF] hover:border-[#C8753D]/50"
          >
            Ouvrir mon Wash Day <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ——— 5. Ton portrait cheveux ——— */}
      {hasProfile && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3 flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Ton profil capillaire
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <HairChip icon={<Wind className="w-4 h-4" />} label="Texture" value={texture} missing={!texture} />
            <HairChip icon={<Droplets className="w-4 h-4" />} label="Porosité" value={porosity} missing={!porosity} />
            <HairChip icon={<CloudRain className="w-4 h-4" />} label="Cuir chevelu" value={scalp} missing={!scalp} />
            <HairChip icon={<RefreshCw className="w-4 h-4" />} label="Fréquence de soin" value={wash} missing={!wash} />
            <HairChip icon={<Wallet className="w-4 h-4" />} label="Budget routine" value={budget} missing={!budget} />
            <a href="/account/kurla-id" className="rounded-2xl border border-dashed border-[#C8753D]/40 p-4 flex flex-col justify-center items-center text-center hover:bg-[#C8753D]/8 transition-all">
              <p className="text-xs font-bold text-[#D49A63]">Affiner mon profil</p>
              <p className="text-[10px] text-[#FFF7EF]/50 mt-1">Densité, longueur, préférences…</p>
            </a>
          </div>
        </div>
      )}

      {/* ——— 6. Dernière routine ——— */}
      {latestRoutine && (
        <div className="p-6 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10">
          <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Ta dernière routine
          </h3>
          {latestRoutine.recommendedRoutine && <p className="text-sm font-bold text-[#FFF7EF]">{latestRoutine.recommendedRoutine}</p>}
          {latestRoutine.summary && <p className="text-xs text-[#FFF7EF]/65 mt-1 leading-relaxed">{latestRoutine.summary}</p>}
          {Array.isArray(latestRoutine.steps) && latestRoutine.steps.length > 0 && (
            <ol className="mt-3 space-y-1.5">
              {latestRoutine.steps.slice(0, 6).map((step: string, i: number) => (
                <li key={i} className="text-[12px] text-[#FFF7EF]/75 flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#C8753D]/20 text-[#C8753D] text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/diagnostic/cheveux" className="px-4 py-2 rounded-full bg-[#050403] border border-[#FFF7EF]/15 text-xs font-semibold text-[#FFF7EF] hover:border-[#C8753D]/50 inline-flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Refaire le diagnostic
            </a>
            <a href="/boutique" className="px-4 py-2 rounded-full bg-[#C8753D] text-white text-xs font-bold inline-flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" /> Voir les produits de ma routine
            </a>
          </div>
        </div>
      )}

      {/* ——— 7. Pourquoi chaque outil existe ——— */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-1">
          Comprendre ton espace
        </h3>
        <p className="text-xs text-[#FFF7EF]/50 mb-3">
          Six outils, six raisons précises. Ouvre celui qui répond à ta question du moment.
        </p>
        <div className="grid lg:grid-cols-2 gap-3">
          {FEATURE_VALUE.map((feature) => (
            <WhyItMatters key={feature.id} featureId={feature.id} variant="banner" defaultOpen={false} />
          ))}
        </div>
      </div>

      {/* ——— 8. Accès rapide ——— */}
      <div>
        <h3 className="text-xs uppercase tracking-widest text-[#D49A63] font-bold mb-3">Accès rapide</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {quickLink('/assistant-beaute', <MessageCircle className="w-5 h-5" />, 'Demander à KURLA', 'Conseils cheveux & peau, routines, ingrédients', true)}
          {quickLink('/diagnostic/cheveux', <Sparkles className="w-5 h-5" />, hasProfile ? 'Refaire mon diagnostic' : 'Faire mon diagnostic', '5 questions guidées avec visuels')}
          {quickLink('/account/kurla-id', <Heart className="w-5 h-5" />, 'Mon KURLA ID', 'Profil beauté détaillé & confidentialité')}
          <button onClick={() => onNavigateTab('commandes')} className="text-left">
            <span className="flex items-center gap-3 p-4 rounded-2xl border bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50 transition-all w-full">
              <ShoppingBag className="w-5 h-5 text-[#C8753D]" />
              <span className="flex-1">
                <span className="text-sm font-bold text-[#FFF7EF] block">Mes commandes</span>
                <span className="text-[11px] text-[#FFF7EF]/55">{ordersCount} commande(s)</span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#FFF7EF]/30" />
            </span>
          </button>
          {quickLink('/account/shelf', <Droplets className="w-5 h-5" />, 'Mon étagère & routine', 'Tes produits et ton suivi')}
          {quickLink('/account/wash-day', <Clock className="w-5 h-5" />, 'Mon Wash Day', 'Ton rythme et tes échéances')}
        </div>
      </div>

      <p className="text-[11px] text-[#FFF7EF]/40 leading-relaxed border-t border-[#FFF7EF]/8 pt-4">
        KURLA ne te vend rien dont tu n’as pas besoin : l’étagère existe pour dire
        « termine d’abord celui-là ». Tes observations restent privées tant que tu ne choisis pas de
        les partager, et tu peux exporter ou supprimer l’intégralité de ton dossier à tout moment.
      </p>
    </div>
  );
};

export default BeautyHub;
