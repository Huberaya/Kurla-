import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CalendarCheck, Check, Droplets, Loader2, Moon, RefreshCw, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getWashDay,
  markWashDayDone,
  saveWashDayCycle,
  WashDayCyclePrefs,
  WashDayState
} from '../services/intelligenceService';
import {
  PROTECTIVE_SIGNAL_LABELS,
  PROTECTIVE_SIGNALS,
  ProtectiveSignal
} from '../lib/protectiveStyle';
import { addProtectiveStyleSignal } from '../services/intelligenceService';

const labelClass = 'block text-[10px] uppercase tracking-wider font-bold text-[#111111]/50 mb-1.5';
const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-4 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50';

const RISK_STYLES: Record<string, { className: string; label: string }> = {
  low: { className: 'bg-emerald-50 border-emerald-200 text-emerald-900', label: 'Risque faible' },
  moderate: { className: 'bg-amber-50 border-amber-200 text-amber-900', label: 'Risque modéré' },
  elevated: { className: 'bg-orange-50 border-orange-300 text-orange-900', label: 'Risque élevé' },
  high: { className: 'bg-rose-50 border-rose-300 text-rose-900', label: 'Risque élevé — à retirer' }
};

function formatDate(value?: string): string {
  if (!value) return 'non renseignée';
  return new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * WASH DAY OS — la routine comme cycle, pas comme matin/soir.
 *
 * Trois partis pris d'interface :
 *  - chaque tâche affiche sa raison, sinon la routine ne sera pas suivie ;
 *  - un wash day « en retard » n'est pas présenté comme un échec : un intervalle
 *    plus long réduit la casse mécanique ;
 *  - le soin protéiné est désactivable, car un excès de protéines rigidifie la
 *    fibre et un soin non désiré ne doit jamais être planifié par défaut.
 */
export const WashDayPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [state, setState] = useState<WashDayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Brouillon de cycle
  const [intervalDays, setIntervalDays] = useState('7');
  const [lastWashDayAt, setLastWashDayAt] = useState('');
  const [deepConditionEvery, setDeepConditionEvery] = useState('1');
  const [proteinEnabled, setProteinEnabled] = useState(false);
  const [proteinEvery, setProteinEvery] = useState('4');
  const [nightProtection, setNightProtection] = useState<WashDayCyclePrefs['nightProtection']>('none');
  const [availableMinutes, setAvailableMinutes] = useState('15');
  const [hardWater, setHardWater] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Une session KURLA ID est nécessaire pour charger ton cycle.');
      return;
    }
    try {
      const next = await getWashDay(token);
      setState(next);
      setIntervalDays(String(next.cycle.intervalDays));
      setLastWashDayAt(next.cycle.lastWashDayAt ? next.cycle.lastWashDayAt.slice(0, 10) : '');
      setDeepConditionEvery(String(next.cycle.deepConditionEveryNWashDays));
      setProteinEnabled(next.cycle.proteinEveryNWashDays !== null);
      setProteinEvery(String(next.cycle.proteinEveryNWashDays ?? 4));
      setNightProtection(next.cycle.nightProtection);
      setAvailableMinutes(String(next.cycle.availableMinutesPerDay));
      setHardWater(next.cycle.hardWater);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger ton cycle.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await saveWashDayCycle(token, {
        intervalDays: Number(intervalDays),
        lastWashDayAt: lastWashDayAt ? new Date(`${lastWashDayAt}T12:00:00`).toISOString() : undefined,
        deepConditionEveryNWashDays: Number(deepConditionEvery),
        proteinEveryNWashDays: proteinEnabled ? Number(proteinEvery) : null,
        nightProtection,
        availableMinutesPerDay: Number(availableMinutes),
        hardWater
      });
      setNotice('Cycle enregistré.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkDone = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await markWashDayDone(token);
      setNotice('Wash day enregistré. Le prochain cycle repart de maintenant.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignal = async (signal: ProtectiveSignal) => {
    if (!token || !state?.activeProtectiveStyle) return;
    setBusy(true);
    try {
      await addProtectiveStyleSignal(token, state.activeProtectiveStyle.episode.id, signal);
      setNotice('Signal enregistré.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-24 bg-[#FFFDF9] min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8753D]" />
      </div>
    );
  }

  const plan = state?.plan;
  const risk = state?.activeProtectiveStyle?.assessment;
  const riskStyle = risk ? RISK_STYLES[risk.riskLevel] : null;

  return (
    <div className="pt-32 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D] mb-2">Wash Day OS</p>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-3">Ton cycle, pas une routine quotidienne.</h1>
          <p className="text-sm text-[#111111]/70 max-w-2xl leading-relaxed">
            Un cheveu texturé se lave tous les 7 à 21 jours, pas tous les matins. KURLA planifie autour de ton cycle
            réel et garde le quotidien volontairement minimal : moins de manipulation, moins de casse.
          </p>
        </header>

        {error && <div className="mb-6 flex items-start gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {notice && <div className="mb-6 flex items-start gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"><Check className="w-4 h-4 shrink-0 mt-0.5" />{notice}</div>}

        {/* Compte à rebours */}
        {plan && (
          <section className="mb-8 p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] flex flex-col sm:flex-row sm:items-center gap-4">
            <CalendarCheck className="w-8 h-8 text-[#C8753D] shrink-0" />
            <div className="flex-1">
              <h2 className="font-bold text-sm mb-1">
                {plan.nextWashDayAt ? `Prochain wash day : ${formatDate(plan.nextWashDayAt)}` : 'Date du dernier lavage non renseignée'}
              </h2>
              <p className="text-xs text-[#111111]/65">
                {plan.daysSinceLastWashDay !== null
                  ? `Dernier lavage il y a ${plan.daysSinceLastWashDay} jour(s), intervalle de ${plan.cycle.intervalDays} jour(s).`
                  : 'Renseigne la date de ton dernier lavage pour démarrer le cycle.'}
              </p>
              {plan.isOverdue && (
                <p className="mt-2 text-[11px] text-[#111111]/60 italic">
                  Ce n’est pas un retard à rattraper : un intervalle plus long réduit la casse mécanique, à condition
                  que le cuir chevelu reste sain.
                </p>
              )}
            </div>
            <button type="button" onClick={handleMarkDone} disabled={busy} className={primaryButton}>
              <RefreshCw className="w-3.5 h-3.5" /> J’ai fait mon wash day
            </button>
          </section>
        )}

        {/* Plan du wash day */}
        {plan && plan.tasks.length > 0 && (
          <section className="mb-8">
            <h2 className="font-bold text-sm mb-4">Les étapes de ton wash day</h2>
            <ol className="space-y-3">
              {plan.tasks.map((task, index) => (
                <li key={task.id} className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] flex gap-4">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-bold flex items-center justify-center">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{task.label}</p>
                      {task.optional && <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#111111]/5 text-[#111111]/50">optionnel</span>}
                      {task.productLabel && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8753D]/10 text-[#8b4b24]">{task.productLabel}</span>}
                    </div>
                    {/* Chaque tâche explique pourquoi elle est là. */}
                    <p className="text-[11px] text-[#111111]/65 mt-1 leading-relaxed">{task.reason}</p>
                    <p className="text-[10px] text-[#111111]/45 mt-1">~{task.durationMinutes} min</p>
                  </div>
                </li>
              ))}
            </ol>

            {plan.adaptationNotes.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-[#C8753D]/5 border border-[#C8753D]/20">
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#8b4b24] mb-2 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Adaptations</p>
                <ul className="space-y-1.5">
                  {plan.adaptationNotes.map((note, index) => (
                    <li key={index} className="text-[11px] text-[#111111]/70 leading-relaxed">{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Quotidien minimal */}
        {state && state.dailyTasks.length > 0 && (
          <section className="mb-8">
            <h2 className="font-bold text-sm mb-2">Entre deux wash days</h2>
            <p className="text-[11px] text-[#111111]/60 mb-4">Volontairement court : manipuler moins, c'est casser moins.</p>
            <div className="space-y-2">
              {state.dailyTasks.map(task => (
                <div key={task.id} className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] flex items-start gap-3">
                  <Moon className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">{task.label}</p>
                    <p className="text-[11px] text-[#111111]/65 mt-1 leading-relaxed">{task.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Coiffure protectrice active */}
        {state?.activeProtectiveStyle && risk && riskStyle && (
          <section className={`mb-8 p-6 rounded-3xl border ${riskStyle.className}`}>
            <div className="flex items-start gap-3 mb-4">
              {risk.escalationRequired ? <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <h2 className="font-bold text-sm mb-1">{riskStyle.label} — {state.activeProtectiveStyle.episode.style.replace(/_/g, ' ')}</h2>
                <p className="text-xs leading-relaxed opacity-90">{risk.recommendation}</p>
                <p className="text-[11px] mt-2 opacity-75">
                  Portée {risk.wearDays} jour(s) sur {risk.maxWearDays} indicatifs, tension {state.activeProtectiveStyle.episode.tension}.
                </p>
              </div>
            </div>

            {risk.limitations.length > 0 && (
              <ul className="mb-4 space-y-1">
                {risk.limitations.map((limitation, index) => (
                  <li key={index} className="text-[11px] italic opacity-75">{limitation}</li>
                ))}
              </ul>
            )}

            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold opacity-70 mb-2">Ce que tu ressens</p>
              <div className="flex flex-wrap gap-2">
                {PROTECTIVE_SIGNALS.map(signal => {
                  const active = state.activeProtectiveStyle!.episode.signals.includes(signal);
                  return (
                    <button
                      key={signal}
                      type="button"
                      onClick={() => !active && handleSignal(signal)}
                      disabled={busy || active}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${active ? 'bg-current/15 border-current opacity-70' : 'bg-white/60 border-current/25 hover:bg-white'}`}
                    >
                      {active ? '✓ ' : ''}{PROTECTIVE_SIGNAL_LABELS[signal]}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Configuration du cycle */}
        <section className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
          <h2 className="font-bold text-sm mb-4">Ton cycle</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className={labelClass}>Intervalle entre deux wash days (jours)</span>
                <input type="number" min={1} max={42} value={intervalDays} onChange={event => setIntervalDays(event.target.value)} className={inputClass} />
              </div>
              <div>
                <span className={labelClass}>Date du dernier wash day</span>
                <input type="date" value={lastWashDayAt} onChange={event => setLastWashDayAt(event.target.value)} className={inputClass} />
              </div>
              <div>
                <span className={labelClass}>Masque tous les N wash days</span>
                <input type="number" min={1} max={12} value={deepConditionEvery} onChange={event => setDeepConditionEvery(event.target.value)} className={inputClass} />
              </div>
              <div>
                <span className={labelClass}>Minutes disponibles par jour</span>
                <input type="number" min={0} max={240} value={availableMinutes} onChange={event => setAvailableMinutes(event.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Soin protéiné : désactivable, car un excès rigidifie la fibre. */}
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={proteinEnabled} onChange={event => setProteinEnabled(event.target.checked)} className="mt-0.5" />
                <span className="text-xs text-[#111111]/75 leading-relaxed">
                  <strong className="block text-[#111111]">Soin protéiné</strong>
                  À activer seulement si ta fibre est fragilisée (chaleur, chimie, casse). Un excès de protéines
                  rigidifie le cheveu : dans le doute, laisse désactivé.
                </span>
              </label>
              {proteinEnabled && (
                <div className="mt-3">
                  <span className={labelClass}>Tous les N wash days</span>
                  <input type="number" min={1} max={12} value={proteinEvery} onChange={event => setProteinEvery(event.target.value)} className={inputClass} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className={labelClass}>Protection nocturne</span>
                <select value={nightProtection} onChange={event => setNightProtection(event.target.value as WashDayCyclePrefs['nightProtection'])} className={inputClass}>
                  <option value="none">Aucune</option>
                  <option value="bonnet">Bonnet satin</option>
                  <option value="satin_pillowcase">Taie satinée</option>
                  <option value="scarf">Foulard</option>
                </select>
              </div>
              <label className="flex items-center gap-2.5 self-end pb-2.5 cursor-pointer">
                <input type="checkbox" checked={hardWater} onChange={event => setHardWater(event.target.checked)} />
                <span className="text-xs text-[#111111]/75 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-[#C8753D]" /> Eau dure chez moi</span>
              </label>
            </div>

            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer le cycle
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
