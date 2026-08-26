import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Bell, Calendar as CalendarIcon, Check, CheckCircle2, CloudSun, Loader2, MapPin, MessageCircle, RefreshCw, Sparkles, Sun, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoutineFeedbackSignal, RoutineTask } from '../lib/adaptiveRoutine';
import { getAdaptiveRoutine, getRoutineWeather, recordRoutineFeedback, saveAdaptiveRoutine, updateRoutineTask, AdaptiveRoutineState } from '../services/routineService';

const signalOptions: Array<{ value: RoutineFeedbackSignal; label: string }> = [
  { value: 'more_flexible', label: 'Mes cheveux sont plus souples' },
  { value: 'more_breakage', label: 'J’ai davantage de casse' },
  { value: 'product_heavy', label: 'Le produit alourdit' },
  { value: 'reaction', label: 'J’ai eu une réaction' },
  { value: 'spots_improving', label: 'Mes taches diminuent' },
  { value: 'spots_not_improving', label: 'Mes taches ne diminuent pas' },
  { value: 'skin_tight', label: 'Ma peau tiraille' },
  { value: 'scalp_itchy', label: 'Mon cuir chevelu démange' },
  { value: 'routine_too_long', label: 'Cette routine est trop longue' }
];

const kindLabels: Record<RoutineTask['kind'], string> = {
  morning: 'Matin', evening: 'Soir', wash_day: 'Wash day', weekly: 'Hebdomadaire', mask: 'Masque', protective: 'Protection', locks: 'Locks', weather: 'Météo', check_in: 'Observation'
};

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const RoutineTrackerPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<AdaptiveRoutineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState('');
  const [signal, setSignal] = useState<RoutineFeedbackSignal>('more_flexible');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [productLabel, setProductLabel] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) {
      setLoading(false);
      setError('Une session KURLA ID est nécessaire pour charger ton calendrier.');
      return;
    }
    try {
      const next = await getAdaptiveRoutine(token);
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger ta routine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const taskGroups = useMemo(() => {
    const groups = new Map<string, RoutineTask[]>();
    (state?.tasks || []).forEach(task => {
      const key = task.scheduledFor;
      groups.set(key, [...(groups.get(key) || []), task]);
    });
    return Array.from(groups.entries()).slice(0, 15);
  }, [state?.tasks]);

  const toggleTask = async (task: RoutineTask) => {
    if (!token || busyTask) return;
    setBusyTask(task.id);
    setError('');
    try {
      const updated = await updateRoutineTask(token, task.id, task.status === 'completed' ? 'pending' : 'completed');
      setState(current => current ? { ...current, tasks: current.tasks.map(item => item.id === updated.id ? updated : item) } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour cette tâche.');
    } finally {
      setBusyTask('');
    }
  };

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSavingFeedback(true);
    setError('');
    setMessage('');
    try {
      const next = await recordRoutineFeedback(token, { signal, note: feedbackNote, productLabel });
      setState(next);
      setFeedbackNote('');
      setProductLabel('');
      setMessage('Observation enregistrée. Les ajustements de ta routine ont été recalculés.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer cette observation.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const loadWeather = () => {
    if (!token || !navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible. La routine reste basée sur ton KURLA ID.');
      return;
    }
    setWeatherLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const weather = await getRoutineWeather(token, position.coords.latitude, position.coords.longitude);
        const preferences = state?.plan?.preferences || {};
        const next = await saveAdaptiveRoutine(token, preferences, weather);
        setState(next);
        setMessage('Météo récupérée après ton autorisation et prise en compte pour le prochain recalcul.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'La météo actuelle n’est pas disponible.');
      } finally {
        setWeatherLoading(false);
      }
    }, () => {
      setWeatherLoading(false);
      setError('Position non partagée. La routine reste basée sur ton KURLA ID et tes observations.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 });
  };

  if (loading) return <div className="pt-32 min-h-screen text-center text-sm text-[#111111]/60"><Loader2 className="w-7 h-7 animate-spin text-[#C8753D] mx-auto mb-3" />Chargement de ton calendrier synchronisé…</div>;

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold hover:underline"><ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID</a>

        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div><div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-2"><CalendarIcon className="w-3.5 h-3.5" /> Routine adaptative</div><h1 className="text-3xl sm:text-4xl font-serif-title font-bold">Mon calendrier qui apprend</h1><p className="text-sm text-[#111111]/70 font-light mt-2 max-w-2xl">Chaque tâche, observation et adaptation est liée à ton compte KURLA ID. Un autre appareil retrouvera le même historique après connexion.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={loadWeather} disabled={weatherLoading || !state?.plan} className="px-4 py-2.5 rounded-full bg-[#111111] text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"><MapPin className="w-4 h-4" />{weatherLoading ? 'Lecture météo…' : 'Adapter à ma météo'}</button><a href="/account/routine-id" className="px-4 py-2.5 rounded-full border border-[#E8E1DA] text-xs font-semibold hover:border-[#C8753D]">Paramètres</a></div>
        </header>

        {(message || error) && <div role="status" className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>{error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}{error || message}</div>}

        {!state?.plan ? <section className="p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] text-center"><Sparkles className="w-8 h-8 text-[#C8753D] mx-auto mb-3" /><h2 className="text-xl font-serif-title font-bold">Ta routine n’est pas encore configurée</h2><p className="text-sm text-[#111111]/65 mt-2">Décris tes moments, ton wash day, tes protections et ton temps disponible pour générer un calendrier persistant.</p><a href="/account/routine-id" className="inline-flex mt-5 px-5 py-3 rounded-full bg-[#C8753D] text-white text-xs font-semibold">Configurer ma routine</a></section> : <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-6 rounded-3xl bg-[#111111] text-white"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-[#D49A63] font-bold">Ajustements actifs</p><h2 className="text-xl font-serif-title font-bold mt-1">Pourquoi ce calendrier ?</h2></div><RefreshCw className="w-6 h-6 text-[#D49A63]" /></div><div className="mt-4 space-y-2">{state.plan.adaptationNotes.length > 0 ? state.plan.adaptationNotes.map(note => <p key={note} className="text-xs text-white/80 leading-relaxed">• {note}</p>) : <p className="text-xs text-white/70">Aucune observation récente : la routine suit les paramètres de ton KURLA ID.</p>}</div></div>
            <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]"><div className="flex items-center gap-2"><CloudSun className="w-5 h-5 text-[#C8753D]" /><h2 className="text-sm font-bold">Contexte météo</h2></div>{state.plan.weather ? <><p className="text-2xl font-bold mt-4">{state.plan.weather.temperatureC !== undefined ? `${Math.round(state.plan.weather.temperatureC)} °C` : 'Température non renseignée'}</p><p className="text-xs text-[#111111]/65 mt-1">{state.plan.weather.humidityPercent !== undefined ? `Humidité ${Math.round(state.plan.weather.humidityPercent)} %` : 'Humidité non renseignée'}{state.plan.weather.precipitationMm !== undefined ? ` · pluie ${Math.round(state.plan.weather.precipitationMm * 10) / 10} mm` : ''}</p><p className="text-[10px] text-[#111111]/50 mt-3">Source : {state.plan.weather.source || 'non renseignée'} · {state.plan.weather.observedAt ? new Date(state.plan.weather.observedAt).toLocaleString('fr-FR') : 'date non renseignée'}</p></> : <p className="text-xs text-[#111111]/60 mt-4">Aucune météo partagée. Utilise le bouton uniquement si tu veux autoriser l’accès à ta position.</p>}</div>
          </section>

          <section className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5"><div><h2 className="text-base font-serif-title font-bold">Calendrier des gestes</h2><p className="text-xs text-[#111111]/60 mt-1">Les rappels sont générés pour les prochaines semaines et restent modifiables par ton retour.</p></div><span className="text-xs text-[#C8753D] font-semibold">{state.tasks.filter(task => task.status === 'completed').length} / {state.tasks.length} réalisés</span></div><div className="space-y-4">{taskGroups.map(([date, tasks]) => <div key={date}><h3 className="text-xs uppercase tracking-wider font-bold text-[#C8753D] mb-2">{formatDate(date)}</h3><div className="space-y-2">{tasks.map(task => <div key={task.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${task.status === 'completed' ? 'bg-emerald-50/60 border-emerald-200' : 'bg-[#FFFDF9] border-[#E8E1DA]'}`}><button type="button" onClick={() => toggleTask(task)} disabled={busyTask === task.id} className="flex items-center gap-3 text-left min-w-0"><span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-emerald-500 text-white' : 'border-2 border-[#E8E1DA]'}`}>{busyTask === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className={`w-3.5 h-3.5 ${task.status === 'completed' ? '' : 'text-transparent'}`} />}</span><span className="min-w-0"><span className={`block text-xs font-semibold ${task.status === 'completed' ? 'line-through text-[#111111]/50' : ''}`}>{task.title}</span><span className="block text-[10px] text-[#111111]/55 mt-1">{kindLabels[task.kind]} · {task.durationMinutes} min{task.productLabels.length > 0 ? ` · déjà possédé : ${task.productLabels.join(', ')}` : ''}</span><span className="block text-[11px] text-[#111111]/65 mt-1">{task.description}</span></span></button><Bell className="w-4 h-4 text-[#111111]/25 shrink-0" /></div>)}</div></div>)}</div>{taskGroups.length === 0 && <p className="text-sm text-[#111111]/55">Aucun geste planifié avec ces paramètres.</p>}</section>

          <section className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]"><div className="flex items-start gap-3 mb-5"><MessageCircle className="w-5 h-5 text-[#C8753D] shrink-0" /><div><h2 className="text-base font-serif-title font-bold">Boucle d’apprentissage</h2><p className="text-xs text-[#111111]/65 mt-1">Dis ce qui s’est réellement passé. La prochaine version de la routine sera ajustée et l’observation restera dans ton historique.</p></div></div><form onSubmit={submitFeedback} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{signalOptions.map(option => <button key={option.value} type="button" onClick={() => setSignal(option.value)} className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${signal === option.value ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#F8F2EC] border-[#E8E1DA] hover:border-[#C8753D]'}`}>{option.label}</button>)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={productLabel} onChange={event => setProductLabel(event.target.value)} maxLength={160} className="px-3.5 py-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs focus:outline-none focus:border-[#C8753D]" placeholder="Produit concerné (facultatif)" /><textarea value={feedbackNote} onChange={event => setFeedbackNote(event.target.value)} maxLength={1000} className="px-3.5 py-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs min-h-[80px] resize-y focus:outline-none focus:border-[#C8753D]" placeholder="Ce que tu as observé, quand et après quel geste…" /></div><button type="submit" disabled={savingFeedback} className="px-5 py-3 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-60">{savingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Enregistrer et adapter</button></form></section>

          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3"><Sun className="w-5 h-5 shrink-0" /><span>Une réaction importante ou persistante, des démangeaisons persistantes ou une aggravation nécessitent un avis médical ou pharmaceutique. KURLA ne pose pas de diagnostic.</span></div>
        </>}
      </div>
    </div>
  );
};
