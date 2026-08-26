import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Clock3, CloudSun, Loader2, Moon, Save, ShieldCheck, Sparkles, Sun, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoutinePreferences, normalizeRoutinePreferences } from '../lib/adaptiveRoutine';
import { saveAdaptiveRoutine } from '../services/routineService';

const fieldClass = 'w-full px-3.5 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111] focus:outline-none focus:border-[#C8753D]';
const sectionClass = 'p-6 sm:p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-xs space-y-6';

function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`p-3 rounded-xl text-xs font-semibold border text-left transition-colors ${selected ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] text-[#111111] border-[#E8E1DA] hover:border-[#C8753D]'}`}>{label}</button>;
}

export const RoutineIdPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [preferences, setPreferences] = useState<RoutinePreferences>(normalizeRoutinePreferences({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ownedProductsText, setOwnedProductsText] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Une session KURLA ID est nécessaire pour enregistrer une routine.');
      return;
    }
    let cancelled = false;
    fetch('/api/routine', { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Impossible de charger la routine.');
        if (!cancelled && data.plan?.preferences) {
          const next = normalizeRoutinePreferences(data.plan.preferences);
          setPreferences(next);
          setOwnedProductsText(next.ownedProducts.join('\n'));
        }
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la routine.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const update = <K extends keyof RoutinePreferences>(key: K, value: RoutinePreferences[K]) => {
    setPreferences(current => ({ ...current, [key]: value }));
    setMessage('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const ownedProducts = ownedProductsText.split(/[\n,]/).map(item => item.trim()).filter(Boolean).slice(0, 20);
      const data = await saveAdaptiveRoutine(token, { ...preferences, ownedProducts });
      if (data.plan) setPreferences(normalizeRoutinePreferences(data.plan.preferences));
      setMessage('Routine enregistrée. Le calendrier et les ajustements ont été recalculés à partir de ton KURLA ID.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la routine.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pt-32 min-h-screen text-center text-sm text-[#111111]/60"><Loader2 className="w-7 h-7 animate-spin text-[#C8753D] mx-auto mb-3" />Chargement de ta routine persistante…</div>;

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold hover:underline"><ArrowLeft className="w-4 h-4" /> Retour à mon KURLA ID</a>

        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <span className="text-xs font-semibold text-[#C8753D] uppercase tracking-widest">KURLA Routine ID · paramètres vivants</span>
            <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mt-2">Une routine qui suit ta vraie vie</h1>
            <p className="text-sm text-[#111111]/70 font-light mt-2 max-w-2xl">Matin, soir, wash day, saison, météo, temps disponible et résultats observés sont enregistrés avec ton KURLA ID. Rien n’est conservé uniquement dans ce navigateur.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-2"><ShieldCheck className="w-4 h-4" /> Synchronisation compte</div>
        </header>

        {(message || error) && <div role="status" className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}><CheckCircle2 className="w-5 h-5 shrink-0" />{error || message}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <section className={sectionClass}>
            <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">01 · Rythme réel</p><h2 className="text-xl font-serif-title font-bold mt-1">Les moments qui existent dans ton quotidien</h2><p className="text-xs text-[#111111]/65 mt-2">Désactive un moment plutôt que de recevoir des rappels inutiles.</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Choice label="☀️ Je veux un geste le matin" selected={preferences.morningEnabled} onClick={() => update('morningEnabled', !preferences.morningEnabled)} />
              <Choice label="🌙 Je veux un geste le soir" selected={preferences.eveningEnabled} onClick={() => update('eveningEnabled', !preferences.eveningEnabled)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold mb-1.5">Intervalle entre les wash days</label><select className={fieldClass} value={preferences.washDayIntervalDays} onChange={event => update('washDayIntervalDays', Number(event.target.value))}><option value={7}>Tous les 7 jours</option><option value={10}>Tous les 10 jours</option><option value={14}>Tous les 14 jours</option><option value={21}>Tous les 21 jours</option><option value={28}>Tous les 28 jours</option></select></div>
              <div><label className="block text-xs font-bold mb-1.5">Fréquence des masques</label><select className={fieldClass} value={preferences.maskFrequency} onChange={event => update('maskFrequency', event.target.value as RoutinePreferences['maskFrequency'])}><option value="weekly">Chaque semaine</option><option value="biweekly">Toutes les 2 semaines</option><option value="monthly">Une fois par mois</option><option value="none">Pas de masque planifié</option></select></div>
            </div>
          </section>

          <section className={sectionClass}>
            <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">02 · Protection et coiffures</p><h2 className="text-xl font-serif-title font-bold mt-1">Prévenir les oublis importants</h2><p className="text-xs text-[#111111]/65 mt-2">La date d’une dépose reste celle que tu déclares : KURLA ne l’invente pas.</p></div>
            <div><label className="block text-xs font-bold mb-1.5">Protection nocturne</label><select className={fieldClass} value={preferences.nightProtection} onChange={event => update('nightProtection', event.target.value as RoutinePreferences['nightProtection'])}><option value="bonnet">Bonnet satin</option><option value="satin_pillowcase">Taie satin</option><option value="protective_style">Protection du style porté</option><option value="none">Aucune protection planifiée</option></select></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold mb-1.5">Style actuellement porté</label><select className={fieldClass} value={preferences.protectiveStyle} onChange={event => update('protectiveStyle', event.target.value as RoutinePreferences['protectiveStyle'])}><option value="none">Aucun style protecteur</option><option value="braids">Tresses / braids</option><option value="twists">Twists</option><option value="locks">Locks / microlocks</option><option value="wig">Perruque / lace</option><option value="other">Autre style protecteur</option></select></div>
              <div><label className="block text-xs font-bold mb-1.5">Date de pose ou de début</label><input type="date" className={fieldClass} value={preferences.protectiveStyleStartedAt?.slice(0, 10) || ''} onChange={event => update('protectiveStyleStartedAt', event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : undefined)} /></div>
              <div><label className="block text-xs font-bold mb-1.5">Rappel de dépose après</label><select className={fieldClass} value={preferences.protectiveStyleRemovalAfterDays} onChange={event => update('protectiveStyleRemovalAfterDays', Number(event.target.value))}><option value={21}>3 semaines</option><option value={28}>4 semaines</option><option value={42}>6 semaines</option><option value={56}>8 semaines</option><option value={84}>12 semaines</option></select></div>
              {preferences.protectiveStyle === 'locks' && <div><label className="block text-xs font-bold mb-1.5">Entretien des locks</label><select className={fieldClass} value={preferences.locksMaintenanceEveryDays} onChange={event => update('locksMaintenanceEveryDays', Number(event.target.value))}><option value={14}>Toutes les 2 semaines</option><option value={28}>Toutes les 4 semaines</option><option value={42}>Toutes les 6 semaines</option><option value={56}>Toutes les 8 semaines</option></select></div>}
            </div>
          </section>

          <section className={sectionClass}>
            <div><p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D]">03 · Contexte d’adaptation</p><h2 className="text-xl font-serif-title font-bold mt-1">Ce que la routine doit respecter</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><label className="block text-xs font-bold mb-1.5"><Clock3 className="inline w-4 h-4 mr-1 text-[#C8753D]" />Temps disponible par jour</label><select className={fieldClass} value={preferences.availableMinutesPerDay} onChange={event => update('availableMinutesPerDay', Number(event.target.value))}><option value={5}>5 minutes maximum</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>Une heure</option><option value={120}>Plus d’une heure</option></select></div>
              <div><label className="block text-xs font-bold mb-1.5"><Calendar className="inline w-4 h-4 mr-1 text-[#C8753D]" />Temps disponible le wash day</label><select className={fieldClass} value={preferences.availableMinutesWashDay} onChange={event => update('availableMinutesWashDay', Number(event.target.value))}><option value={20}>20 minutes maximum</option><option value={45}>45 minutes</option><option value={60}>1 heure</option><option value={90}>1 h 30</option><option value={120}>2 heures</option></select></div>
              <div><label className="block text-xs font-bold mb-1.5"><CloudSun className="inline w-4 h-4 mr-1 text-[#C8753D]" />Saison</label><select className={fieldClass} value={preferences.seasonMode} onChange={event => update('seasonMode', event.target.value as RoutinePreferences['seasonMode'])}><option value="auto">Adapter selon mon profil et la météo renseignée</option><option value="fixed">Je garde une saison repère</option></select></div>
              {preferences.seasonMode === 'fixed' && <div><label className="block text-xs font-bold mb-1.5">Saison repère</label><select className={fieldClass} value={preferences.fixedSeason || ''} onChange={event => update('fixedSeason', event.target.value)}><option value="">Choisir</option><option value="printemps">Printemps</option><option value="ete">Été</option><option value="automne">Automne</option><option value="hiver">Hiver</option></select></div>}
            </div>
            <div><label className="block text-xs font-bold mb-1.5"><Wallet className="inline w-4 h-4 mr-1 text-[#C8753D]" />Budget mensuel indicatif</label><select className={fieldClass} value={preferences.monthlyBudgetCents ?? ''} onChange={event => update('monthlyBudgetCents', event.target.value ? Number(event.target.value) : undefined)}><option value="">Je ne souhaite pas le préciser</option><option value={3000}>30 €</option><option value={5000}>50 €</option><option value={7000}>70 €</option><option value={10000}>100 €</option><option value={15000}>150 €</option></select><p className="text-[11px] text-[#111111]/55 mt-1">Ce budget sert à éviter de proposer des achats inutiles. Il ne change pas la qualité supposée d’un produit.</p></div>
            <div><label className="block text-xs font-bold mb-1.5"><Sparkles className="inline w-4 h-4 mr-1 text-[#C8753D]" />Produits déjà possédés</label><textarea className={`${fieldClass} min-h-[90px] resize-y`} value={ownedProductsText} onChange={event => setOwnedProductsText(event.target.value)} placeholder="Un produit par ligne ou séparé par des virgules. Les noms servent uniquement à construire des gestes avec ce que tu as déjà." /><p className="text-[11px] text-[#111111]/55 mt-1">Aucun produit n’est inventé ni ajouté au catalogue. Tu peux laisser ce champ vide.</p></div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3"><button type="submit" disabled={saving || !token} className="flex-1 py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Recalcul en cours…' : 'Enregistrer et recalculer ma routine'}</button><a href="/account/routine-tracker" className="px-5 py-4 rounded-full bg-[#111111] text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#C8753D]"><Sun className="w-4 h-4" /> Voir mon calendrier</a></div>
        </form>

        <div className="p-5 rounded-2xl bg-[#111111] text-white text-xs leading-relaxed flex items-start gap-3"><Moon className="w-5 h-5 text-[#D49A63] shrink-0" /><span>Les ajustements KURLA sont explicables : ils utilisent tes paramètres, ton profil KURLA ID, tes observations et, uniquement si tu l’autorises, une météo récupérée à partir de ta position. Ce ne sont pas des conseils médicaux.</span></div>
      </div>
    </div>
  );
};
