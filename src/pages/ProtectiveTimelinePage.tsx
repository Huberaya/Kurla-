function EpisodeCard({
  episode,
  assessment,
  busy,
  onSignal,
  onClose
}: {
  episode: ProtectiveStyleEpisode;
  assessment?: TractionRiskAssessment;
  busy: boolean;
  onSignal: (signal: string) => void;
  onClose: () => void;
}) {
  const risk = assessment ? RISK_STYLES[assessment.riskLevel] : undefined;
  const ratio = assessment ? Math.min(100, Math.round(assessment.wearRatio * 100)) : 0;
  const remainingDays = assessment ? Math.max(0, assessment.maxWearDays - assessment.wearDays) : null;

  return (
    <li className="rounded-2xl border border-[#E8E1DA] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{STYLE_LABELS[episode.style]}</p>
          <p className="text-[11px] text-[#111111]/55 mt-0.5">
            Posée le {formatDate(episode.installedAt)} · tension {TENSION_LABELS[episode.tension].toLowerCase()}
          </p>
        </div>
        {risk && (
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${risk.className}`}>
            {risk.label}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-[#111111]/60 mb-1.5">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
            Jour {assessment?.wearDays ?? 0} sur {episode.maxWearDays} recommandés
          </span>
          {remainingDays !== null && (
            <span className={remainingDays === 0 ? 'font-semibold text-rose-700' : ''}>
              {remainingDays === 0 ? 'Limite atteinte' : `${remainingDays} j restants`}
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-[#F0EAE2] overflow-hidden">
          <div
            className={`h-full rounded-full ${ratio >= 100 ? 'bg-rose-500' : ratio >= 75 ? 'bg-orange-400' : 'bg-emerald-500'}`}
            style={{ width: `${ratio}%` }}
          />
        </div>
      </div>

      {assessment?.recommendation && (
        <p className="mt-3 text-xs text-[#111111]/70 leading-relaxed">{assessment.recommendation}</p>
      )}

      {episode.signals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {episode.signals.map(signal => (
            <span
              key={signal}
              className={`rounded-full border px-2 py-0.5 text-[10px] ${
                ESCALATION_SIGNALS.includes(signal)
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-[#E8E1DA] bg-[#FFFDF9] text-[#111111]/65'
              }`}
            >
              {PROTECTIVE_SIGNAL_LABELS[signal] ?? signal}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[#F0EAE2]">
        <p className="text-[10px] uppercase tracking-wider text-[#111111]/45 mb-2">Signaler un symptôme</p>
        <div className="flex flex-wrap gap-1.5">
          {PROTECTIVE_SIGNALS.map(signal => (
            <button
              key={signal}
              type="button"
              disabled={busy || episode.signals.includes(signal)}
              onClick={() => onSignal(signal)}
              className="rounded-full border border-[#E8E1DA] px-2.5 py-1 text-[10px] text-[#111111]/70 hover:border-[#C8753D] hover:text-[#C8753D] disabled:opacity-40"
            >
              {PROTECTIVE_SIGNAL_LABELS[signal]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E1DA] px-3 py-2 text-[11px] font-semibold text-[#111111]/70 hover:border-[#111111]/30 disabled:opacity-40"
        >
          <Scissors className="w-3.5 h-3.5" /> Marquer comme retirée
        </button>
        {assessment && assessment.limitations.length > 0 && (
          <p className="text-[10px] text-[#111111]/40 max-w-[22rem] text-right">
            {assessment.limitations.join(' ')}
          </p>
        )}
      </div>
    </li>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Loader2, Plus, ShieldAlert, Scissors, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  addProtectiveStyleSignal,
  closeProtectiveStyle,
  getProtectiveStyles,
  ProtectiveStylesResponse,
  startProtectiveStyle
} from '../services/intelligenceService';
import {
  ESCALATION_SIGNALS,
  PROTECTIVE_SIGNAL_LABELS,
  PROTECTIVE_SIGNALS,
  ProtectiveStyle,
  ProtectiveStyleEpisode,
  TensionLevel,
  TractionRiskAssessment
} from '../lib/protectiveStyle';

const labelClass = 'block text-[10px] uppercase tracking-wider font-bold text-[#111111]/50 mb-1.5';
const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-4 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50';

const STYLE_LABELS: Record<ProtectiveStyle, string> = {
  braids: 'Tresses',
  knotless_braids: 'Tresses sans nœud',
  twists: 'Twists / vanilles',
  locs: 'Locks',
  wig: 'Perruque',
  weave: 'Tissage',
  cornrows: 'Nattes collées',
  buns: 'Chignons',
  other: 'Autre coiffure protectrice'
};

const TENSION_LABELS: Record<TensionLevel, string> = {
  loose: 'Lâche',
  normal: 'Normale',
  firm: 'Serrée',
  tight: 'Très serrée'
};

const RISK_STYLES: Record<string, { className: string; label: string }> = {
  low: { className: 'bg-emerald-50 border-emerald-200 text-emerald-900', label: 'Risque faible' },
  moderate: { className: 'bg-amber-50 border-amber-200 text-amber-900', label: 'Risque modéré' },
  elevated: { className: 'bg-orange-50 border-orange-300 text-orange-900', label: 'Risque élevé' },
  high: { className: 'bg-rose-50 border-rose-300 text-rose-900', label: 'Risque élevé — à retirer' }
};

function formatDate(value?: string): string {
  if (!value) return 'non renseignée';
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * TIMELINE DE COIFFURE PROTECTRICE.
 *
 * Une coiffure protectrice protège les longueurs mais expose les racines : le
 * risque de traction dépend de la durée de port et de la tension, pas du style
 * seul. Cette page rend ce risque lisible dans le temps, épisode par épisode.
 *
 * Trois garde-fous d'affichage :
 *  - une durée maximale est un ordre de grandeur prudent, jamais un seuil
 *    clinique, et l'écran le dit ;
 *  - un signal d'escalade (douleur, croûtes, casse à la racine, lisières qui
 *    s'éclaircissent) oriente vers un professionnel, il ne donne pas de conseil
 *    d'entretien à la place ;
 *  - KURLA n'établit aucun diagnostic : il suit des durées et des signaux
 *    déclarés par l'utilisateur.
 */
export function ProtectiveTimelinePage() {
  const { session } = useAuth();
  const token = session?.access_token || '';

  const [state, setState] = useState<ProtectiveStylesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [style, setStyle] = useState<ProtectiveStyle>('knotless_braids');
  const [tension, setTension] = useState<TensionLevel>('normal');
  const [installedAt, setInstalledAt] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setState(await getProtectiveStyles(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La timeline est indisponible pour le moment.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'L’action n’a pas pu aboutir.');
    } finally {
      setBusy(false);
    }
  };

  const assessmentFor = (episodeId: string): TractionRiskAssessment | undefined =>
    state?.assessments.find(item => item.episodeId === episodeId);

  const activeEpisodes = (state?.episodes || []).filter(episode => !episode.removedAt);
  const pastEpisodes = (state?.episodes || []).filter(episode => Boolean(episode.removedAt));

  if (!token) {
    return (
      <div className="pt-32 pb-24 bg-[#FFFDF9] min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-[#111111]/60">Connectez-vous pour suivre vos coiffures protectrices.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-32 pb-24 bg-[#FFFDF9] min-h-screen flex items-center justify-center">
        <p className="flex items-center gap-2 text-sm text-[#111111]/60">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement de la timeline…
        </p>
      </div>
    );
  }

  const escalationEpisodes = activeEpisodes.filter(episode =>
    episode.signals.some(signal => ESCALATION_SIGNALS.includes(signal))
  );

  return (
    <div className="pt-32 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-serif-title font-bold">Timeline coiffure protectrice</h1>
          <p className="text-sm text-[#111111]/60 mt-2 max-w-2xl">
            Une coiffure protectrice protège les longueurs et expose les racines. Le risque dépend de la
            durée de port et de la tension. KURLA suit ce que vous déclarez : il ne pose aucun diagnostic.
          </p>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {escalationEpisodes.length > 0 && (
          <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-rose-900">
              <ShieldAlert className="w-4 h-4" />
              Un signal à ne pas laisser passer
            </p>
            <p className="text-xs text-rose-900/80 mt-2 leading-relaxed">
              Douleur, croûtes, casse à la racine ou lisières qui s’éclaircissent sont des signes
              d’inflammation, pas de simples désagréments. Faites retirer la coiffure et consultez un
              professionnel — un coiffeur formé aux cheveux texturés ou un médecin si la zone est
              douloureuse. KURLA ne remplace pas cet avis.
            </p>
          </div>
        )}

        {notice && (
          <p className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <Check className="w-4 h-4" /> {notice}
          </p>
        )}

        {state && state.history.episodeCount > 0 && (
          <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-[#E8E1DA] bg-white p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#111111]/45">Épisodes</p>
              <p className="text-2xl font-bold mt-1">{state.history.episodeCount}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E1DA] bg-white p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#111111]/45">Jours de port</p>
              <p className="text-2xl font-bold mt-1">{state.history.totalWearDays}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E1DA] bg-white p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#111111]/45">Portés trop longtemps</p>
              <p className="text-2xl font-bold mt-1">{Math.round(state.history.shareWithElevatedRisk * 100)} %</p>
            </div>
            <div className="rounded-2xl border border-[#E8E1DA] bg-white p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#111111]/45">Signal récurrent</p>
              <p className="text-sm font-semibold mt-2 leading-tight">
                {state.history.recurringSignals[0]?.label || 'Aucun signal répété'}
              </p>
            </div>
          </section>
        )}

        <section className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-serif-title font-bold">Coiffures en cours</h2>
            <button className={primaryButton} onClick={() => setShowForm(value => !value)} type="button">
              <Plus className="w-3.5 h-3.5" /> {showForm ? 'Fermer' : 'Déclarer une coiffure'}
            </button>
          </div>

          {showForm && (
            <div className="mb-6 rounded-2xl border border-[#E8E1DA] bg-white p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Coiffure</label>
                  <select className={inputClass} value={style} onChange={event => setStyle(event.target.value as ProtectiveStyle)}>
                    {(Object.keys(STYLE_LABELS) as ProtectiveStyle[]).map(value => (
                      <option key={value} value={value}>{STYLE_LABELS[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tension à la pose</label>
                  <select className={inputClass} value={tension} onChange={event => setTension(event.target.value as TensionLevel)}>
                    {(Object.keys(TENSION_LABELS) as TensionLevel[]).map(value => (
                      <option key={value} value={value}>{TENSION_LABELS[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Posée le</label>
                  <input type="date" className={inputClass} value={installedAt} onChange={event => setInstalledAt(event.target.value)} />
                </div>
              </div>
              <p className="text-[11px] text-[#111111]/50">
                KURLA ne devine pas : sans date de pose, aucune durée de port ne peut être calculée.
              </p>
              <button
                type="button"
                className={primaryButton}
                disabled={busy || !installedAt}
                onClick={() => run(
                  () => startProtectiveStyle(token, { style, tension, installedAt }),
                  'Coiffure enregistrée. Le suivi de la durée de port est actif.'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" /> Démarrer le suivi
              </button>
            </div>
          )}

          {activeEpisodes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E8E1DA] p-6 text-sm text-[#111111]/55">
              Aucune coiffure protectrice en cours. Déclarez-en une pour suivre la durée de port et être
              prévenu avant la limite prudente.
            </p>
          ) : (
            <ul className="space-y-3">
              {activeEpisodes.map(episode => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  assessment={assessmentFor(episode.id)}
                  busy={busy}
                  onSignal={signal => run(
                    () => addProtectiveStyleSignal(token, episode.id, signal),
                    'Signal enregistré.'
                  )}
                  onClose={() => run(
                    () => closeProtectiveStyle(token, episode.id),
                    'Coiffure marquée comme retirée.'
                  )}
                />
              ))}
            </ul>
          )}
        </section>

        {state && state.history.pattern && (
          <section className="mb-8 rounded-2xl border border-[#E8E1DA] bg-white p-4">
            <h2 className="text-sm font-bold mb-2">Ce que montre votre historique</h2>
            <p className="text-xs leading-relaxed text-[#111111]/70">{state.history.pattern}</p>
          </section>
        )}

        {pastEpisodes.length > 0 && (
          <section>
            <h2 className="text-lg font-serif-title font-bold mb-4">Coiffures retirées</h2>
            <ul className="space-y-2">
              {pastEpisodes.map(episode => {
                const assessment = assessmentFor(episode.id);
                const risk = assessment ? RISK_STYLES[assessment.riskLevel] : undefined;
                return (
                  <li key={episode.id} className="rounded-2xl border border-[#E8E1DA] bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{STYLE_LABELS[episode.style]}</p>
                      <p className="text-[11px] text-[#111111]/55 mt-0.5">
                        {formatDate(episode.installedAt)} → {formatDate(episode.removedAt)}
                        {episode.removalReason ? ` · ${episode.removalReason}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#111111]/55">
                        {assessment ? `${assessment.wearDays} j / ${assessment.maxWearDays} j` : '—'}
                      </span>
                      {risk && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${risk.className}`}>
                          {risk.label}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="mt-8 text-[11px] leading-relaxed text-[#111111]/45">
          Les durées maximales affichées sont des ordres de grandeur prudents issus de l’usage courant des
          coiffures texturées, pas des seuils cliniques. Elles ne remplacent pas l’avis d’un professionnel.
        </p>
      </div>
    </div>
  );
}

