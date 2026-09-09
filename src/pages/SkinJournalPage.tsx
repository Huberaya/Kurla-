import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Camera, CheckCircle2, AlertCircle, Image as ImageIcon, Trash2, Sparkles, ArrowLeft, Heart, ShieldCheck, Info, Award } from 'lucide-react';
import { UNKNOWN, SKIN_CONCERN_OPTIONS } from '../lib/beautyProfile';
import type { BeautyProfile } from '../lib/beautyProfile';
import { createEmptyBeautyProfile } from '../lib/beautyProfile';
import { useAuth } from '../context/AuthContext';
import { loadObservance, toggleToday, getStreak, getWeekHistory } from '../lib/skinObservance';
import { queryBeautyAssistant } from '../lib/ai/assistant';

type JournalEntry = {
  date: string; // YYYY-MM-DD
  feeling: string; // confortable/mitige/inconfort + mapping to 1-5
  feelingScore: number; // 1-5
  concerns: string[];
  notes?: string;
  photoDataUrl?: string; // base64 <2Mo
  milestone?: string; // J+0 / J+7 / J+30 / hebdo
  createdAt: string;
};

const CONCERNS = SKIN_CONCERN_OPTIONS.filter(o => o.value !== UNKNOWN).slice(0, 12);
const MILESTONES = [
  { id: 'J+0', label: 'J+0 — démarrage' },
  { id: 'J+7', label: 'J+7 — 1 semaine' },
  { id: 'J+30', label: 'J+30 — 1 mois' },
  { id: 'hebdo', label: 'Hebdo' },
];

const FEELINGS = [
  { score: 1, label: 'Très inconfortable', emoji: '😣', desc: 'Tiraille / rougeurs' },
  { score: 2, label: 'Inconfortable', emoji: '😕', desc: 'Sensations' },
  { score: 3, label: 'Mitigé', emoji: '😐', desc: 'Moyen' },
  { score: 4, label: 'Confortable', emoji: '🙂', desc: 'Bien' },
  { score: 5, label: 'Très confortable', emoji: '😊', desc: 'Peau à l’aise' },
];

const STORAGE_KEY = 'kurla_skin_journal';
const CONSENT_KEY = 'kurla_photo_consent';

function loadJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, 50) as JournalEntry[] : [];
  } catch { return []; }
}
function saveJournal(entries: JournalEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50))); } catch { /* quota */ }
}
function suggestMilestone(entries: JournalEntry[]): string {
  if (entries.length === 0) return 'J+0';
  if (entries.length === 1) return 'J+7';
  if (entries.length < 5) return 'J+7';
  return 'J+30';
}

export const SkinJournalPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [profile, setProfile] = useState<BeautyProfile>(createEmptyBeautyProfile());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [feelingScore, setFeelingScore] = useState(4);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [milestone, setMilestone] = useState(() => suggestMilestone([]));
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [photoError, setPhotoError] = useState('');
  // C11 — Synthèse IA journal (sans diagnostic médical, cosmétique chiffrée)
  const [aiSynthesis, setAiSynthesis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // C7 — Observance peau (C4.3) intégrée au journal
  const [observance, setObservance] = useState(() => { try { return loadObservance(); } catch { return {}; } });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayObs = observance[todayStr] || { matin: false, soir: false };
  const streakMatin = (() => { try { return getStreak('matin'); } catch { return 0; } })();
  const streakSoir = (() => { try { return getStreak('soir'); } catch { return 0; } })();
  const weekHist = (() => { try { return getWeekHistory(7); } catch { return []; } })();

  const handleToggleObs = (moment: 'matin' | 'soir') => {
    try {
      const next = toggleToday(moment);
      setObservance(next);
      const done = next[todayStr]?.[moment];
      setObservanceMsg(done ? `${moment === 'matin' ? 'Matin' : 'Soir'} coché — streak ${moment === 'matin' ? getStreak('matin') : getStreak('soir')}j` : `${moment === 'matin' ? 'Matin' : 'Soir'} décoché`);
      setTimeout(() => setObservanceMsg(''), 2500);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const loaded = loadJournal();
    setEntries(loaded);
    setMilestone(suggestMilestone(loaded));
    // Try to hydrate from beauty profile if logged
    if (token) {
      fetch('/api/beauty-profile', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json().catch(() => ({})))
        .then(data => { if (data.profile) setProfile(data.profile as BeautyProfile); })
        .catch(() => {});
    } else {
      try {
        const raw = localStorage.getItem('kurla_skin_answers');
        if (raw) {
          const a = JSON.parse(raw);
          const empty = createEmptyBeautyProfile();
          setProfile({
            ...empty,
            skin: { ...empty.skin, skinType: a.skinType || UNKNOWN, toneDepth: a.toneDepth || UNKNOWN, journal: loaded as any },
          } as any);
        }
      } catch { /* ignore */ }
    }
    // consent
    try { if (localStorage.getItem(CONSENT_KEY) === 'true') setPhotoConsent(true); } catch {}
    setLoading(false);
  }, [token]);

  const toggleConcern = (id: string) => {
    setConcerns(c => c.includes(id) ? c.filter(v => v !== id) : c.length >= 3 ? c : [...c, id]);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Photo trop lourde : max 2 Mo. Compressez ou recadrez.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Format accepté : JPG, PNG, WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      // double check size after base64 (approx)
      if (url.length > 2.7 * 1024 * 1024) {
        setPhotoError('Image trop lourde après encodage — choisissez une plus petite (<2 Mo).');
        return;
      }
      setPhotoDataUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const canSave = useMemo(() => {
    if (!date) return false;
    if (feelingScore < 1 || feelingScore > 5) return false;
    if (photoDataUrl && !photoConsent) return false;
    return true;
  }, [date, feelingScore, photoDataUrl, photoConsent]);

  const addEntry = async () => {
    setError(''); setMessage(''); setPhotoError('');
    if (photoDataUrl && !photoConsent) {
      setError('Photo ajoutée : cochez le consentement RGPD pour enregistrer une image.');
      return;
    }
    if (!canSave) { setError('Vérifiez la date et le ressenti (1–5).'); return; }
    const feelingLabel = FEELINGS.find(f => f.score === feelingScore)?.label || 'mitige';
    const entry: JournalEntry = {
      date,
      feeling: feelingLabel.toLowerCase(),
      feelingScore,
      concerns: concerns.length ? concerns : [UNKNOWN],
      notes: notes.slice(0, 400).trim() || undefined,
      photoDataUrl,
      milestone,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...entries].slice(0, 50);
    setSaving(true);
    try {
      saveJournal(next);
      // consent persist
      try { localStorage.setItem(CONSENT_KEY, photoConsent ? 'true' : 'false'); } catch {}
      // Sync to beautyProfile.skin.journal if possible
      if (token) {
        const nextProfile: BeautyProfile = { ...profile, skin: { ...profile.skin, journal: next as any }, photoConsent: photoConsent || profile.photoConsent } as any;
        const res = await fetch('/api/beauty-profile', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: nextProfile }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Enregistrement distant impossible — sauvegardé en local.');
        setProfile(data.profile || nextProfile);
        setMessage('Entrée enregistrée et synchronisée avec votre compte.');
      } else {
        setProfile(p => ({ ...p, skin: { ...p.skin, journal: next as any } } as any));
        setMessage('Entrée enregistrée localement. Connectez-vous pour la synchroniser.');
      }
      setEntries(next);
      // reset form (keep date, reset photo)
      setConcerns([]); setNotes(''); setPhotoDataUrl(undefined);
      // suggest next milestone
      setMilestone(suggestMilestone(next));
      // clear file input
      const el = document.getElementById('skin-journal-photo') as HTMLInputElement | null;
      if (el) el.value = '';
    } catch (e: any) {
      setError(e instanceof Error ? e.message : String(e));
      // keep local save even if remote failed — already saved
      setEntries(next);
    } finally { setSaving(false); }
  };

  const deleteEntry = async (idx: number) => {
    if (!window.confirm('Supprimer cette entrée du journal peau ?')) return;
    const next = entries.filter((_, i) => i !== idx);
    saveJournal(next);
    setEntries(next);
    if (token) {
      try {
        const nextProfile: BeautyProfile = { ...profile, skin: { ...profile.skin, journal: next as any } } as any;
        await fetch('/api/beauty-profile', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: nextProfile }),
        }).then(r => r.json().catch(() => ({}))).then(d => { if (d.profile) setProfile(d.profile); });
      } catch { /* ignore */ }
    }
    setMessage('Entrée supprimée.');
  };

  const handleAiSynthesis = async () => {
    if (entries.length < 2) { setAiError('Ajoutez au moins 2 entrées (ex: J+0 + J+7) pour une synthèse.'); return; }
    setAiLoading(true); setAiError(null); setAiSynthesis(null);
    try {
      const summary = entries.slice(0, 5).map(e => `${e.date} ${e.milestone||''} ${e.feelingScore}/5 ${e.concerns.join(',')} ${e.notes||''}`.slice(0,120)).join(' | ');
      const prompt = `Synthèse journal peau cosmétique (pas de diagnostic médical) : profil ${profile.skin?.skinType||'—'} tone ${profile.skin?.toneDepth||'—'} HPI ${profile.skin?.hyperpigmentationTendency||'—'} budget ${profile.skin?.budget||'—'}. Entrées: ${summary}. Donne 3 observations cosmétiques chiffrées (ressenti moyen, préoccupation récurrente, observance matin/soir) + 1 conseil routine sans parfum + garde uniformiser≠éclaircir + invite pro peau si taches persistent. Format court, français, décision concrète.`;
      const res = await queryBeautyAssistant(prompt, { locale: 'fr', country: 'FR', objective: 'journal peau synthèse', memoryConsent: false });
      const text = (res as any).answer?.answer || (res as any).answer?.content || (res as any).medicalMessage || JSON.stringify((res as any).answer).slice(0, 900);
      setAiSynthesis(typeof text === 'string' ? text : JSON.stringify(text).slice(0, 900));
    } catch (e: any) {
      setAiError(e instanceof Error ? e.message : 'Synthèse IA indisponible.');
    } finally { setAiLoading(false); }
  };

  if (loading) return <div className="pt-32 pb-24 bg-[#FFFDF9] min-h-screen flex items-center justify-center text-sm text-[#111111]/60">Chargement du journal peau…</div>;

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <a href="/peau" className="inline-flex items-center gap-1.5 text-xs text-[#C8753D] font-semibold hover:underline"><ArrowLeft className="w-4 h-4" /> Retour pôle peau</a>

        {/* Header */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#F8F2EC] via-[#FFFDF9] to-[#FCEFE8] border border-[#E8E1DA] shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6 justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> KURLA SKIN · Journal peau V1</p>
              <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mt-1">Votre peau, jour après jour.</h1>
              <p className="text-sm text-[#111111]/70 font-light mt-2 max-w-2xl leading-relaxed">
                Notez votre <strong className="font-semibold text-[#111111]">ressenti (1–5)</strong>, vos préoccupations du jour et, si vous le souhaitez, une photo (1 max, &lt;2 Mo). KURLA repère les motifs sans poser de diagnostic médical.
              </p>
              <p className="text-xs mt-3 flex items-start gap-1.5 text-[#111111]/60"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Uniformiser ≠ éclaircir. Si rougeurs, douleurs ou lésions persistent, consultez un dermatologue/pharmacien. Export ou suppression : <a href="/account/donnees" className="underline">Vos données</a>.</p>
            </div>
            <div className="min-w-[200px] p-4 rounded-2xl bg-white border border-[#E8E1DA] text-center h-fit">
              <span className="text-[10px] uppercase tracking-wider text-[#111111]/55 block">Entrées</span>
              <span className="text-3xl font-bold text-[#C8753D]">{entries.length}</span><span className="text-sm text-[#111111]/50"> / 50</span>
              <p className="text-[11px] text-[#111111]/50 mt-1">J+0 · J+7 · J+30</p>
              <div className="mt-3 flex gap-2 justify-center">
                <a href="/peau/routine" className="px-3 py-1.5 rounded-full bg-[#111111] text-white text-[11px] font-bold">Ma routine</a>
                <a href="/account/shelf?cat=peau" className="px-3 py-1.5 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] text-[11px] font-bold">Mon étagère peau</a>
              </div>
            </div>
          </div>
        </div>

        {/* C7 — Observance peau + phototype (intégré au journal, pas séparé) */}
        <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E8E1DA] shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <h2 className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#C8753D]" /> Observance aujourd’hui — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
              <p className="text-xs text-[#111111]/60 mt-1">Cochez matin / soir. KURLA compte le streak sans juger. Journal ≠ diagnostic médical.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => handleToggleObs('matin')} className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${todayObs.matin ? 'bg-[#111111] text-white border-[#111111]' : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D]'}`}>
                  <span className="text-lg">☀️</span>
                  <span className="text-xs font-bold">Matin : protéger</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${todayObs.matin ? 'bg-white text-[#111111]' : 'bg-[#F8F2EC] border border-[#E8E1DA]'}`}>{todayObs.matin ? 'Fait ✓' : 'À faire'}</span>
                  <span className="text-[11px] opacity-70">Streak {streakMatin}j</span>
                </button>
                <button onClick={() => handleToggleObs('soir')} className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${todayObs.soir ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D]'}`}>
                  <span className="text-lg">🌙</span>
                  <span className="text-xs font-bold">Soir : réparer</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${todayObs.soir ? 'bg-white text-[#C8753D]' : 'bg-[#F8F2EC] border border-[#E8E1DA]'}`}>{todayObs.soir ? 'Fait ✓' : 'À faire'}</span>
                  <span className="text-[11px] opacity-80">Streak {streakSoir}j</span>
                </button>
              </div>
              {observanceMsg && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-3">{observanceMsg}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-bold text-[#111111]/60 mr-1">7 derniers jours :</span>
                {weekHist.map(d => (
                  <span key={d.date} title={`${d.date} · matin ${d.matin ? '✓' : '—'} · soir ${d.soir ? '✓' : '—'}`} className={`w-8 h-8 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold leading-none ${d.matin && d.soir ? 'bg-[#111111] text-white border-[#111111]' : d.matin || d.soir ? 'bg-[#F8F2EC] border-[#E8E1DA] text-[#111111]' : 'bg-white border-dashed border-[#E8E1DA] text-[#111111]/40'}`}>
                    <span>{new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase()}</span>
                    <span className="text-[11px]">{d.matin ? '☀' : '·'}{d.soir ? '☾' : '·'}</span>
                  </span>
                ))}
                <a href="/peau/routine" className="ml-2 text-[11px] font-bold text-[#C8753D] hover:underline">Ma routine →</a>
              </div>
            </div>
            <div className="lg:w-[300px] shrink-0 p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
              <p className="text-xs font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#C8753D]" /> Votre profil peau</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[#111111]/60">Type</span><span className="font-semibold">{profile.skin?.skinType && profile.skin.skinType !== UNKNOWN ? profile.skin.skinType : 'non renseigné'}</span></div>
                <div className="flex justify-between"><span className="text-[#111111]/60">Carnation</span><span className="font-semibold">{profile.skin?.toneDepth && profile.skin.toneDepth !== UNKNOWN ? profile.skin.toneDepth : '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#111111]/60">Sensibilité</span><span className="font-semibold">{profile.skin?.sensitivity && profile.skin.sensitivity !== UNKNOWN ? profile.skin.sensitivity : '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#111111]/60">HPI</span><span className="font-semibold">{profile.skin?.hyperpigmentationTendency && profile.skin.hyperpigmentationTendency !== UNKNOWN ? profile.skin.hyperpigmentationTendency : '—'}</span></div>
                <div className="flex justify-between"><span className="text-[#111111]/60">Budget</span><span className="font-semibold">{profile.skin?.budget || '—'}</span></div>
              </div>
              <div className="mt-3 flex gap-2">
                <a href="/peau/diagnostic" className="flex-1 py-2 rounded-full bg-[#111111] text-white text-xs font-bold text-center">Diagnostic</a>
                <a href="/account/beauty-profile" className="flex-1 py-2 rounded-full bg-white border border-[#E8E1DA] text-xs font-bold text-center">Éditer profil</a>
              </div>
              <p className="text-[11px] text-[#111111]/50 mt-2">Le journal lit votre profil peau pour pré-remplir les suggestions. Modifiable à tout moment.</p>
            </div>
          </div>
        </section>

        {(message || error) && (
          <div className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>
            {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span>{error || message}</span>
          </div>
        )}

        {/* Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E1DA] space-y-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#C8753D]" />
            <h2 className="text-lg font-bold">Nouvelle entrée</h2>
            <span className="text-xs text-[#111111]/50 ml-auto">{milestone} · {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]/60">Date d’observation</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]/60">Jalon</span>
              <select value={milestone} onChange={e => setMilestone(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]">
                {MILESTONES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#111111]/60">Votre profil peau</span>
              <span className="px-3 py-2.5 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] text-xs text-[#111111]/70">
                {profile.skin?.skinType && profile.skin.skinType !== UNKNOWN ? profile.skin.skinType : '—'} · {profile.skin?.toneDepth && profile.skin.toneDepth !== UNKNOWN ? profile.skin.toneDepth : '—'} · {profile.skin?.budget || '—'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold block mb-2">Ressenti du jour (1–5)</span>
            <div className="grid grid-cols-5 gap-2">
              {FEELINGS.map(f => (
                <button
                  key={f.score}
                  type="button"
                  onClick={() => setFeelingScore(f.score)}
                  className={`p-3 rounded-2xl border text-center transition-all ${feelingScore === f.score ? 'bg-[#111111] text-white border-[#111111] shadow-md' : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D] hover:bg-[#F8F2EC]'}`}
                >
                  <span className="text-xl block">{f.emoji}</span>
                  <span className={`text-xs font-bold block mt-1 ${feelingScore === f.score ? 'text-white' : 'text-[#111111]'}`}>{f.score}/5</span>
                  <span className={`text-[10px] block ${feelingScore === f.score ? 'text-white/80' : 'text-[#111111]/60'}`}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold block mb-2">Préoccupations du jour (max 3)</span>
            <div className="flex flex-wrap gap-1.5">
              {CONCERNS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleConcern(c.value)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${concerns.includes(c.value) ? 'bg-[#C8753D] text-white border-[#C8753D]' : 'bg-white border-[#E8E1DA] hover:border-[#C8753D]'}`}
                >
                  {c.label.split(' ·')[0].split(' /')[0]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#111111]/50 mt-1">{concerns.length}/3 sélectionnées</p>
          </div>

          <div>
            <label className="text-xs font-bold">Notes (facultatif, 400 max)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={400} rows={3} placeholder="Ex : SPF réappliqué à midi, picotement léger après sérum, peau plus confortable le soir..." className="mt-1.5 w-full p-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D] resize-none" />
            <p className="text-[11px] text-[#111111]/40 text-right">{notes.length}/400</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#C8753D]" />
              <span className="text-xs font-bold">Photo optionnelle (1 max, &lt;2 Mo)</span>
              <span className="text-[11px] text-[#111111]/50 ml-auto">JPG / PNG / WebP</span>
            </div>
            <input id="skin-journal-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="block w-full text-xs file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-[#111111] file:text-white file:text-xs file:font-bold hover:file:bg-black" />
            {photoError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{photoError}</p>}
            {photoDataUrl && (
              <div className="flex gap-3 items-start">
                <img src={photoDataUrl} alt="Aperçu" className="w-24 h-24 rounded-xl object-cover border border-[#E8E1DA]" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">Aperçu — cette photo restera sur votre appareil et, si vous êtes connectée, dans votre profil chiffré.</p>
                  <button onClick={() => setPhotoDataUrl(undefined)} className="mt-1 text-xs text-rose-700 hover:underline">Retirer la photo</button>
                </div>
              </div>
            )}
            <label className="flex items-start gap-2 text-xs leading-relaxed cursor-pointer">
              <input type="checkbox" checked={photoConsent} onChange={e => setPhotoConsent(e.target.checked)} className="mt-0.5 rounded text-[#C8753D] w-4 h-4" />
              <span className={`${photoDataUrl && !photoConsent ? 'text-rose-700 font-semibold' : 'text-[#111111]/70'}`}>
                J’autorise KURLA à stocker cette photo dans mon journal peau. Je peux la supprimer à tout moment dans <em>Vos données</em> ou depuis cet écran. <ShieldCheck className="w-3.5 h-3.5 inline text-[#C8753D]" /> RGPD · aucune revente, aucun partage sans consentement.
              </span>
            </label>
            {photoDataUrl && !photoConsent && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Cochez le consentement pour enregistrer une entrée avec photo.</p>}
          </div>

          <button onClick={addEntry} disabled={saving || !canSave} className="w-full py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer cette entrée'}
            {!saving && <CheckCircle2 className="w-4 h-4" />}
          </button>
          <p className="text-[11px] text-[#111111]/45 flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Journal déclaratif, non médical. Les photos ne sont jamais utilisées pour entraîner une IA sans consentement explicite.</p>
        </div>

        {/* Timeline */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E1DA] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-[#C8753D]" /> Historique ({entries.length})</h2>
            {entries.length > 0 && <span className="text-[11px] px-2 py-1 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] text-[#111111]/60">{entries.filter(e => e.milestone === 'J+0').length} J+0 · {entries.filter(e => e.milestone === 'J+7').length} J+7 · {entries.filter(e => e.milestone === 'J+30').length} J+30</span>}
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-[#111111]/50 text-center py-8">Aucune entrée — votre première note apparaîtra ici, avec J+0 / J+7 / J+30 pour suivre l’évolution.</p>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 30).map((entry, idx) => {
                const feelingMeta = FEELINGS.find(f => f.score === entry.feelingScore) || FEELINGS[2];
                return (
                  <article key={entry.createdAt + idx} className="p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] flex gap-4">
                    <div className="shrink-0 text-center min-w-[72px]">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${entry.milestone === 'J+0' ? 'bg-[#111111] text-white' : entry.milestone === 'J+7' ? 'bg-[#C8753D] text-white' : 'bg-white border border-[#E8E1DA]'}`}>{entry.milestone || '—'}</span>
                      <span className="text-xs font-bold block mt-1">{new Date(entry.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                      <span className="text-lg block">{feelingMeta.emoji}</span>
                      <span className="text-[11px] font-bold">{entry.feelingScore}/5</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {(entry.concerns || []).filter(v => v !== UNKNOWN).slice(0, 4).map(v => {
                          const lab = CONCERNS.find(o => o.value === v)?.label?.split(' ·')[0] || v.replaceAll('_', ' ');
                          return <span key={v} className="px-2 py-0.5 rounded-full bg-white border border-[#E8E1DA] text-[11px] font-semibold">{lab}</span>;
                        })}
                        {(!entry.concerns || entry.concerns.length === 0 || entry.concerns[0] === UNKNOWN) && <span className="text-[11px] text-[#111111]/50">—</span>}
                      </div>
                      {entry.notes && <p className="text-sm text-[#111111]/75 leading-relaxed break-words">{entry.notes}</p>}
                      <p className="text-[11px] text-[#111111]/40 mt-1">Saisi le {new Date(entry.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-2 items-center">
                      {entry.photoDataUrl ? (
                        <a href={entry.photoDataUrl} target="_blank" rel="noreferrer">
                          <img src={entry.photoDataUrl} alt="Photo journal" className="w-16 h-16 rounded-xl object-cover border border-[#E8E1DA] hover:opacity-90" />
                        </a>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white border border-dashed border-[#E8E1DA] flex items-center justify-center"><ImageIcon className="w-5 h-5 text-[#111111]/30" /></div>
                      )}
                      <button onClick={() => deleteEntry(idx)} className="text-[11px] text-rose-700 hover:underline flex items-center gap-1"><Trash2 className="w-3 h-3" /> Suppr.</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {entries.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs leading-relaxed text-amber-900">
              <strong>Astuce :</strong> Revenez à J+7 et J+30 avec la même lumière (fenêtre, visage neutre) pour comparer. V1 affiche la photo brute — slider avant/après et analyse teint arriveront en P2.
            </div>
          )}
        </section>

        {/* C11 — Synthèse IA journal (cosmétique, chiffrée, sans diag médical) */}
        <section className="p-6 rounded-3xl bg-[#111111] text-white border border-[#FFF7EF]/10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#D49A63]" /> Synthèse IA de votre journal</h3>
              <p className="text-xs text-white/70 mt-1 leading-relaxed max-w-2xl">À partir de J+0/J+7/J+30, ressenti 1–5, préoccupations et observance. L’IA donne 3 observations chiffrées + 1 conseil routine <strong className="text-white">sans parfum</strong> + garde <em>uniformiser≠éclaircir</em>. <strong className="text-[#D49A63]">Aucun diagnostic médical</strong> — si lésion qui persiste → pro peau.</p>
            </div>
            <button onClick={handleAiSynthesis} disabled={aiLoading || entries.length < 2} className="px-5 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold disabled:opacity-40 shrink-0">{aiLoading ? 'Analyse…' : 'Générer synthèse IA →'}</button>
          </div>
          {aiError && <p className="mt-3 p-3 rounded-xl bg-rose-900/30 border border-rose-400/30 text-xs text-rose-200">{aiError}</p>}
          {aiSynthesis && <div className="mt-4 p-4 rounded-2xl bg-white text-[#111111] text-sm leading-relaxed whitespace-pre-wrap">{aiSynthesis}<p className="text-[11px] text-[#111111]/50 mt-3">Synthèse cosmétique générée par KURLA AI — ne remplace pas un avis dermatologique. <a href="/assistant" className="text-[#C8753D] underline">Poser une question à l’IA →</a> · <a href="/professionnels?cat=peau" className="text-[#C8753D] underline">Voir pros peau →</a></p></div>}
          {entries.length < 2 && !aiSynthesis && <p className="mt-3 text-xs text-white/50">Ajoutez 2 entrées minimum pour activer la synthèse (ex: J+0 + J+7).</p>}
        </section>

        {/* Cross links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <a href="/peau/routine" className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D]"><p className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#C8753D]" /> Ma routine peau</p><p className="text-[#111111]/60 font-light mt-1">Matin 6 · Soir 8 · Hebdo 3 · kits 49,70/62/84,90.</p></a>
          <a href="/account/shelf?cat=peau" className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D]"><p className="font-bold flex items-center gap-1.5"><Award className="w-4 h-4 text-[#C8753D]" /> Mon étagère peau</p><p className="text-[#111111]/60 font-light mt-1">% restant, jauge, alerte J-7 réassort.</p></a>
          <a href="/boutique?cat=peau" className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D]"><p className="font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#C8753D]" /> Boutique peau filtrée</p><p className="text-[#111111]/60 font-light mt-1">15 besoins · actif · phototype V–VI safe.</p></a>
        </div>
      </div>
    </div>
  );
};
