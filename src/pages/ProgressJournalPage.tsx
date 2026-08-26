import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, ClipboardPenLine, Loader2, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoutineFeedbackSignal, RoutineJournalEntry } from '../lib/adaptiveRoutine';
import { addProgressJournalEntry, getProgressJournal, getAdaptiveRoutine } from '../services/routineService';

const signalOptions: Array<{ value: RoutineFeedbackSignal; label: string }> = [
  { value: 'more_flexible', label: 'Cheveux plus souples' },
  { value: 'more_breakage', label: 'Davantage de casse' },
  { value: 'product_heavy', label: 'Produit alourdissant' },
  { value: 'reaction', label: 'Réaction' },
  { value: 'spots_improving', label: 'Taches en diminution' },
  { value: 'spots_not_improving', label: 'Taches sans amélioration' },
  { value: 'skin_tight', label: 'Peau qui tiraille' },
  { value: 'scalp_itchy', label: 'Cuir chevelu qui démange' },
  { value: 'routine_too_long', label: 'Routine trop longue' }
];

const metricOptions = [{ value: '', label: 'Non renseigné' }, { value: '1', label: '1 · très faible / inconfortable' }, { value: '2', label: '2' }, { value: '3', label: '3 · moyen' }, { value: '4', label: '4' }, { value: '5', label: '5 · très bon / confortable' }];
const fieldClass = 'w-full px-3.5 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111] focus:outline-none focus:border-[#C8753D]';

function metricValue(entry: RoutineJournalEntry, key: 'hydrationScore' | 'breakageScore' | 'comfortScore' | 'detanglingScore'): string {
  const value = entry[key];
  return value === undefined ? 'Non renseigné' : `${value}/5`;
}

export const ProgressJournalPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [journal, setJournal] = useState<RoutineJournalEntry[]>([]);
  const [persistence, setPersistence] = useState<'supabase' | 'server_fallback'>('server_fallback');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [selectedSignals, setSelectedSignals] = useState<RoutineFeedbackSignal[]>([]);
  const [productsUsed, setProductsUsed] = useState('');
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Une session KURLA ID est nécessaire pour charger ton journal.');
      return;
    }
    let cancelled = false;
    Promise.all([getProgressJournal(token), getAdaptiveRoutine(token)])
      .then(([journalData, routineData]) => {
        if (cancelled) return;
        setJournal(journalData.journal || []);
        setPersistence(journalData.persistence);
        if (routineData.persistence) setPersistence(routineData.persistence);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger ton journal.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const toggleSignal = (value: RoutineFeedbackSignal) => setSelectedSignals(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);

  const saveEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const numericMetrics = Object.fromEntries(Object.entries(metrics).filter(([, value]) => value).map(([key, value]) => [key, Number(value)]));
      const data = await addProgressJournalEntry(token, {
        entryDate,
        note,
        signals: selectedSignals,
        metrics: numericMetrics,
        productsUsed: productsUsed.split(/[\n,]/).map(item => item.trim()).filter(Boolean).slice(0, 20)
      });
      setJournal(data.journal);
      setPersistence(data.persistence);
      setNote('');
      setSelectedSignals([]);
      setProductsUsed('');
      setMetrics({});
      setMessage('Note enregistrée dans ton KURLA ID. Les observations ont aussi servi à recalculer ta routine.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer cette note.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pt-32 min-h-screen text-center text-sm text-[#111111]/60"><Loader2 className="w-7 h-7 animate-spin text-[#C8753D] mx-auto mb-3" />Chargement de ton journal persistant…</div>;

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold hover:underline"><ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID</a>
        <header><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold"><ClipboardPenLine className="w-3.5 h-3.5" /> Journal de progression</div><h1 className="text-3xl sm:text-4xl font-serif-title font-bold mt-3">Ce que j’observe, ce que KURLA ajuste</h1><p className="text-sm text-[#111111]/70 mt-2 max-w-2xl">Tes notes et indicateurs sont liés à ton KURLA ID, pas à un appareil. Ils peuvent faire évoluer les tâches proposées, sans inventer de résultat ni poser de diagnostic.</p></header>

        {(message || error) && <div role="status" className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>{error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}{error || message}</div>}

        <div className="p-6 sm:p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] space-y-6"><div className="flex items-start gap-3"><Calendar className="w-5 h-5 text-[#C8753D] shrink-0" /><div><h2 className="text-xl font-serif-title font-bold">Ajouter une observation</h2><p className="text-xs text-[#111111]/65 mt-1">Tu peux ne remplir que ce que tu as réellement observé.</p></div></div><form onSubmit={saveEntry} className="space-y-5"><div><label className="block text-xs font-bold mb-1.5">Date de l’observation</label><input type="date" value={entryDate} onChange={event => setEntryDate(event.target.value)} className={fieldClass} required /></div><div><span className="block text-xs font-bold mb-2">Résultat ou signal observé</span><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{signalOptions.map(item => <button type="button" key={item.value} onClick={() => toggleSignal(item.value)} className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors ${selectedSignals.includes(item.value) ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D]'}`}>{item.label}</button>)}</div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{([['hydrationScore', 'Hydratation / souplesse'], ['breakageScore', 'Casse observée'], ['comfortScore', 'Confort peau / cuir chevelu'], ['detanglingScore', 'Facilité de démêlage']] as const).map(([key, label]) => <div key={key}><label className="block text-xs font-bold mb-1.5">{label}</label><select value={metrics[key] || ''} onChange={event => setMetrics(current => ({ ...current, [key]: event.target.value }))} className={fieldClass}>{metricOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>)}</div><div><label className="block text-xs font-bold mb-1.5">Ce que tu as remarqué</label><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={3000} className={`${fieldClass} min-h-[110px] resize-y`} placeholder="Ex. après le wash day, mes longueurs restent souples mais le cuir chevelu tiraille…" /></div><div><label className="block text-xs font-bold mb-1.5">Produits utilisés (facultatif)</label><textarea value={productsUsed} onChange={event => setProductsUsed(event.target.value)} className={`${fieldClass} min-h-[70px] resize-y`} placeholder="Un produit par ligne ou séparé par des virgules" /></div><button type="submit" disabled={saving} className="w-full py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Enregistrement et recalcul…' : 'Enregistrer dans mon journal'}</button></form></div>

        <section className="space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-serif-title font-bold">Historique</h2><p className="text-xs text-[#111111]/60 mt-1">{journal.length} observation{journal.length > 1 ? 's' : ''} · {persistence === 'supabase' ? 'synchronisé avec ton compte' : 'stockage serveur de développement'}</p></div><ShieldCheck className="w-5 h-5 text-[#C8753D]" /></div>{journal.length === 0 ? <div className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm text-[#111111]/55">Aucune observation enregistrée pour le moment.</div> : journal.map(entry => <article key={entry.id} className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#C8753D]" /><time className="text-sm font-bold">{new Date(`${entry.entryDate}T12:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</time></div><span className="text-[10px] text-[#111111]/50">Enregistré le {new Date(entry.createdAt).toLocaleString('fr-FR')}</span></div>{entry.signals.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{entry.signals.map(signal => <span key={signal} className="px-2.5 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-[10px] font-semibold">{signalOptions.find(item => item.value === signal)?.label || signal}</span>)}</div>}<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">{[['Hydratation', 'hydrationScore'], ['Casse', 'breakageScore'], ['Confort', 'comfortScore'], ['Démêlage', 'detanglingScore']].map(([label, key]) => <div key={key} className="p-3 rounded-xl bg-[#F8F2EC] text-xs"><span className="block text-[10px] text-[#111111]/55">{label}</span><strong>{metricValue(entry, key as 'hydrationScore' | 'breakageScore' | 'comfortScore' | 'detanglingScore')}</strong></div>)}</div>{entry.note && <p className="text-sm text-[#111111]/75 leading-relaxed mt-4 whitespace-pre-wrap">{entry.note}</p>}{entry.productsUsed.length > 0 && <p className="text-xs text-[#111111]/55 mt-3">Produits utilisés : {entry.productsUsed.join(', ')}</p>}</article>)}</section>

        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed">Une réaction persistante, des démangeaisons persistantes, une douleur ou une aggravation nécessitent un avis médical ou pharmaceutique. Le journal aide à décrire ce qui se passe ; il ne remplace pas un professionnel.</div>
      </div>
    </div>
  );
};
