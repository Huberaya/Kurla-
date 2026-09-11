import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Droplets, Sun, Heart, Shield, Clock, Edit3, Save, Trash2, Plus, Calendar, AlertCircle, CheckCircle2, BookOpen, FlaskConical, Zap, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createEmptyBeautyProfile, calculateProfileConfidence, UNKNOWN, SKIN_TYPE_OPTIONS, SKIN_CONCERN_OPTIONS } from '../lib/beautyProfile';
import type { BeautyProfile } from '../lib/beautyProfile';

const SKIN_CONCERNS_SHORT = SKIN_CONCERN_OPTIONS.filter(o => o.value !== UNKNOWN).map(o => ({ id: o.value, label: o.label.split(' /')[0].split(' ·')[0] }));

export const SkinIdPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;
  const [profile, setProfile] = useState<BeautyProfile>(createEmptyBeautyProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [localAnswers, setLocalAnswers] = useState<any | null>(null);

  // Journal form
  const [feeling, setFeeling] = useState('confortable');
  const [jConcerns, setJConcerns] = useState<string[]>([]);
  const [jNotes, setJNotes] = useState('');

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const load = async () => {
    setLoading(true);
    // Local fallback always read for Ma peau quick view
    try {
      const raw = localStorage.getItem('kurla_skin_answers') || sessionStorage.getItem('kurla_diagnostic_answers_skin');
      if (raw) setLocalAnswers(JSON.parse(raw));
    } catch { /* ignore */ }
    if (!token) {
      // mode déconnecté : on reconstruit un profil minimal depuis localStorage pour afficher Ma peau sans compte
      try {
        const raw = localStorage.getItem('kurla_skin_answers');
        if (raw) {
          const a = JSON.parse(raw);
          const empty = createEmptyBeautyProfile();
          const rebuilt: BeautyProfile = {
            ...empty,
            skin: {
              ...empty.skin,
              skinType: a.skinType || UNKNOWN,
              hydrationLevel: a.hydrationLevel || UNKNOWN,
              toneDepth: a.toneDepth || UNKNOWN,
              undertone: a.undertone || UNKNOWN,
              hyperpigmentationTendency: a.hyperpigmentationTendency || UNKNOWN,
              acne: a.acne || UNKNOWN,
              skinConcerns: a.skinConcerns || [UNKNOWN],
              skinObjectives: a.skinObjectives || [UNKNOWN],
              sensitivity: a.sensitivity || UNKNOWN,
              sensitivities: a.sensitivities || [UNKNOWN],
              sunExposure: a.sunExposure || UNKNOWN,
              spfUsage: a.spfUsage || UNKNOWN,
              currentRoutine: a.currentRoutine || UNKNOWN,
              texturePreference: a.texturePreference || UNKNOWN,
              finishPreference: a.finishPreference || UNKNOWN,
              budget: a.budget || UNKNOWN,
              ageRange: a.ageRange || UNKNOWN,
              journal: (() => { try { return JSON.parse(localStorage.getItem('kurla_skin_journal') || '[]'); } catch { return []; } })(),
            },
            environment: { ...empty.environment, climate: a.climate || UNKNOWN },
          };
          setProfile(rebuilt);
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/beauty-profile', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Impossible de charger Ma peau.');
      setProfile(data.profile || createEmptyBeautyProfile());
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const confidence = calculateProfileConfidence(profile);
  const skin = profile.skin;

  const hasLocalJournal = (() => { try { return JSON.parse(localStorage.getItem('kurla_skin_journal') || '[]'); } catch { return []; } })();
  const journal = (skin.journal && skin.journal.length ? skin.journal : hasLocalJournal) as Array<{ date: string; feeling: string; concerns: string[]; notes?: string }>;

  const insights = (() => {
    if (!journal || journal.length < 3) return null;
    const last7 = journal.slice(0, 7);
    const inconfortCount = last7.filter(j => j.feeling === 'inconfort').length;
    const mitigeCount = last7.filter(j => j.feeling === 'mitige').length;
    const counts: Record<string, number> = {};
    last7.forEach(j => (j.concerns||[]).forEach(c=> { if(c!=='inconnue') counts[c]=(counts[c]||0)+1; }));
    const topConcern = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    const spfLow = (skin.spfUsage==='jamais' || skin.spfUsage==='parfois') && (topConcern && /taches|hpi|teint/i.test(topConcern[0]));
    if (inconfortCount >= 3) return { type: 'alert', title: 'Inconfort récurrent (≥3 / 7 derniers jours)', body: `${inconfortCount} entrées “inconfort” récemment${topConcern? `, souvent avec ${label(topConcern[0])}`:''}. Vérifiez barrière (céramides/squalane) et pause exfoliant/rétinol. Si douleur ou lésion, consultez.`, cta: '/peau/guide#barriere' };
    if (mitigeCount >= 3 && topConcern) return { type: 'info', title: `Motif : ${label(topConcern[0])} revient`, body: `“${label(topConcern[0])}” présent ${topConcern[1]}× sur les 7 derniers jours. Votre routine actuelle (${label(skin.currentRoutine)}) est-elle adaptée ? Revoyez l’étape concernée.`, cta: '/peau/routine' };
    if (spfLow) return { type: 'spf', title: 'HPI + SPF faible = piste d’amélioration', body: `Vous notez ${topConcern? label(topConcern[0]):'des taches'} et votre SPF est “${label(skin.spfUsage)}”. Le guide SPF explique le choix sans trace blanche.`, cta: '/peau/guide#spf' };
    if (topConcern && topConcern[1] >=3) return { type: 'info', title: `Focus : ${label(topConcern[0])}`, body: `Cette préoccupation revient ${topConcern[1]}×. Explorez la fiche guide et l’alternative sans parfum si sensible.`, cta: `/boutique?cat=peau&q=${topConcern[0].split('_')[0]}` };
    return null;
  })();

  const saveProfile = async () => {
    if (!token) {
      // sauvegarde locale
      try {
        localStorage.setItem('kurla_skin_journal', JSON.stringify(journal));
        setMessage('Journal enregistré localement. Connectez-vous pour le synchroniser.');
      } catch { setError('Stockage local indisponible.'); }
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/beauty-profile', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setProfile(data.profile); setMessage('Ma peau enregistrée.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  const addJournalEntry = async () => {
    const entry = { date: new Date().toISOString().slice(0, 10), feeling, concerns: jConcerns.length ? jConcerns : [UNKNOWN], notes: jNotes.slice(0, 280) };
    const nextJournal = [entry, ...journal].slice(0, 50);
    const nextProfile = { ...profile, skin: { ...profile.skin, journal: nextJournal } };
    setProfile(nextProfile);
    setJNotes(''); setJConcerns([]);
    if (!token) {
      try { localStorage.setItem('kurla_skin_journal', JSON.stringify(nextJournal)); setMessage('Entrée ajoutée (local).'); } catch { setError('Stockage local indisponible.'); }
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/beauty-profile', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: nextProfile }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Impossible d’ajouter l’entrée.');
      setProfile(data.profile); setMessage('Entrée de journal ajoutée.');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  };

  const toggleJConcern = (id: string) => {
    setJConcerns(c => c.includes(id) ? c.filter(v => v !== id) : c.length >= 3 ? c : [...c, id]);
  };

  const deleteEntry = async (idx: number) => {
    if (!window.confirm('Supprimer cette entrée ?')) return;
    const next = journal.filter((_, i) => i !== idx);
    const nextProfile = { ...profile, skin: { ...profile.skin, journal: next } };
    setProfile(nextProfile);
    if (!token) { try { localStorage.setItem('kurla_skin_journal', JSON.stringify(next)); } catch { /* ignore */ } return; }
    try {
      const res = await fetch('/api/beauty-profile', { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: nextProfile }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setProfile(data.profile);
    } catch { /* ignore */ }
  };

  const label = (v: string) => {
    if (!v || v === UNKNOWN) return '—';
    const opt = SKIN_TYPE_OPTIONS.find(o => o.value === v) || SKIN_CONCERN_OPTIONS.find(o => o.value === v);
    if (opt) return opt.label.split(' ·')[0].split(' (')[0];
    return v.replaceAll('_', ' ');
  };

  if (loading) return <div className="pt-32 pb-24 bg-kurla-ivory min-h-screen flex items-center justify-center"><span className="text-sm text-kurla-carbon/60">Chargement de Ma peau…</span></div>;

  const hasData = skin.skinType !== UNKNOWN || (skin.skinConcerns && skin.skinConcerns[0] !== UNKNOWN) || localAnswers;

  return (
    <div className="pt-28 pb-24 bg-kurla-ivory text-kurla-carbon min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <a href="/account/kurla-id" className="inline-flex items-center gap-1.5 text-xs text-kurla-copper font-semibold hover:underline"><ArrowLeft className="w-4 h-4" /> Retour KURLA ID</a>

        {/* Header Ma peau */}
        <div className="p-6 sm:p-8 rounded-3xl bg-kurla-sand border border-kurla-stone flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-kurla-copper flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Ma peau · KURLA SKIN</p>
            <h1 className="text-2xl sm:text-3xl font-serif-title font-bold mt-1">Votre peau, suivie dans le temps</h1>
            <p className="text-sm text-kurla-carbon/65 font-light mt-2 max-w-2xl">Profil peau + journal. Tout est modifiable, tout peut rester “Je ne sais pas”. Aucune donnée n’est revendue — export ou suppression en un clic dans <a href="/account/donnees" className="underline">Vos données</a>.</p>
            {!hasData && <p className="mt-3 text-xs"><a href="/peau/diagnostic" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-kurla-carbon text-white font-bold">Passer le diagnostic peau (2 min) →</a></p>}
          </div>
          <div className="min-w-[180px] p-4 rounded-2xl bg-kurla-ivory border border-kurla-stone text-center">
            <span className="text-[10px] uppercase tracking-wider text-kurla-carbon/55 block">Complétude peau</span>
            <span className="text-3xl font-bold text-kurla-copper">{confidence.skin}%</span>
            <span className="text-[10px] text-kurla-carbon/55 block">{confidence.knownFields}/{confidence.totalFields} champs</span>
            <a href="/peau/diagnostic" className="mt-2 inline-block text-[11px] font-bold text-kurla-copper hover:underline">Modifier le diagnostic</a>
          </div>
        </div>

        {(message || error) && (
          <div className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${error ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>{error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}<span>{error || message}</span></div>
        )}

        {/* Recap peau */}
        <div className="p-6 sm:p-8 rounded-3xl bg-kurla-ivory border border-kurla-stone space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Droplets className="w-5 h-5 text-kurla-copper" /> Profil peau actuel</h2>
            <a href="/peau/diagnostic" className="text-xs font-bold text-kurla-copper hover:underline inline-flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Refaire le diagnostic</a>
          </div>
          {!hasData ? (
            <p className="text-sm text-kurla-carbon/60">Aucune donnée peau enregistrée. Lancez le diagnostic pour voir votre recap ici et obtenir une routine.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone"><p className="text-[10px] uppercase font-bold text-kurla-copper">Type</p><p className="font-semibold mt-1">{label(skin.skinType)}</p></div>
                <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone"><p className="text-[10px] uppercase font-bold text-kurla-copper">Carnation</p><p className="font-semibold mt-1">{label(skin.toneDepth)}</p><p className="text-[11px] text-kurla-carbon/50">{label(skin.undertone)}</p></div>
                <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone"><p className="text-[10px] uppercase font-bold text-kurla-copper">Hydratation</p><p className="font-semibold mt-1">{label(skin.hydrationLevel || skin.hydration)}</p><p className="text-[11px] text-kurla-carbon/50">HPI · {label(skin.hyperpigmentationTendency)}</p></div>
                <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone"><p className="text-[10px] uppercase font-bold text-kurla-copper">Budget</p><p className="font-semibold mt-1">{label(skin.budget)}</p><p className="text-[11px] text-kurla-carbon/50">{label(skin.ageRange)}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone">
                  <p className="font-bold text-kurla-copper mb-1">Préoccupations</p>
                  <div className="flex flex-wrap gap-1.5">{(skin.skinConcerns || []).filter(v => v !== UNKNOWN).slice(0, 5).map(v => <span key={v} className="px-2 py-1 rounded-full bg-white border border-kurla-stone text-[11px] font-semibold">{label(v)}</span>)}{(skin.skinConcerns || []).filter(v => v !== UNKNOWN).length === 0 && <span className="text-kurla-carbon/50">—</span>}</div>
                </div>
                <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone">
                  <p className="font-bold text-kurla-copper mb-1">Objectifs</p>
                  <div className="flex flex-wrap gap-1.5">{(skin.skinObjectives || []).filter(v => v !== UNKNOWN).slice(0, 5).map(v => <span key={v} className="px-2 py-1 rounded-full bg-white border border-kurla-stone text-[11px] font-semibold">{label(v)}</span>)}{(skin.skinObjectives || []).filter(v => v !== UNKNOWN).length === 0 && <span className="text-kurla-carbon/50">—</span>}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-full bg-kurla-ivory border border-kurla-stone">SPF · {label(skin.spfUsage)}</span>
                <span className="px-2 py-1 rounded-full bg-kurla-ivory border border-kurla-stone">Soleil · {label(skin.sunExposure)}</span>
                <span className="px-2 py-1 rounded-full bg-kurla-ivory border border-kurla-stone">Sensible · {label(skin.sensitivity)}</span>
                {(skin.sensitivities || []).filter(v => v !== UNKNOWN).length > 0 && <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200">À éviter · {(skin.sensitivities || []).filter(v => v !== UNKNOWN).map(label).join(', ')}</span>}
              </div>
              <div className="flex gap-2">
                <a href="/peau/routine" className="px-4 py-2 rounded-full bg-kurla-carbon text-white text-xs font-bold hover:bg-black">Voir ma routine</a>
                <a href="/boutique?cat=peau" className="px-4 py-2 rounded-full bg-white border border-kurla-stone text-xs font-bold hover:border-kurla-copper">Boutique peau</a>
              </div>
            </>
          )}
        </div>

        {/* Journal V1 */}
        <div className="p-6 sm:p-8 rounded-3xl bg-kurla-ivory border border-kurla-stone space-y-6">
          {insights && (
            <div className={`p-4 rounded-2xl border flex gap-3 text-xs leading-relaxed ${insights.type==='alert'?'bg-amber-50 border-amber-200 text-amber-900': insights.type==='spf'?'bg-sky-50 border-sky-200 text-sky-900':'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              <Info className={`w-4 h-4 shrink-0 mt-0.5 ${insights.type==='alert'?'text-amber-600': insights.type==='spf'?'text-sky-600':'text-emerald-600'}`} />
              <div className="flex-1">
                <p className="font-bold">{insights.title}</p>
                <p className="mt-1 opacity-80">{insights.body}</p>
              </div>
              <a href={insights.cta} className="shrink-0 px-3 py-1.5 rounded-full bg-kurla-carbon text-white text-[11px] font-bold hover:bg-black">Voir →</a>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-kurla-copper" /> Journal peau V2 — suivi + motifs</h2>
            <span className="text-xs text-kurla-carbon/50">{journal.length} entrée{journal.length > 1 ? 's' : ''}</span>
          </div>
          <p className="text-xs text-kurla-carbon/60 leading-relaxed">Notez votre ressenti du jour. KURLA repère les motifs (ex: HPI qui revient, sécheresse hivernale) sans poser de diagnostic médical. Max 50 entrées — les plus anciennes s’effacent.</p>

          <div className="p-4 rounded-2xl bg-kurla-sand border border-kurla-stone space-y-4">
            <p className="text-xs font-bold">Nouvelle entrée — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'confortable', label: '😊 Confortable', sub: 'Peau à l’aise' },
                { id: 'mitige', label: '😐 Mitigé', sub: 'Léger inconfort' },
                { id: 'inconfort', label: '😣 Inconfort', sub: 'Tiraille / rougeurs' },
              ].map(o => (
                <button key={o.id} onClick={() => setFeeling(o.id)} className={`p-3 rounded-2xl border text-xs font-semibold ${feeling === o.id ? 'bg-kurla-copper text-white border-kurla-copper' : 'bg-white border-kurla-stone hover:border-kurla-copper'}`}>
                  <span className="block">{o.label}</span><span className="text-[11px] opacity-70">{o.sub}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5">Préoccupations du jour (max 3)</p>
              <div className="flex flex-wrap gap-1.5">
                {SKIN_CONCERNS_SHORT.slice(0, 12).map(c => (
                  <button key={c.id} onClick={() => toggleJConcern(c.id)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${jConcerns.includes(c.id) ? 'bg-kurla-copper text-white border-kurla-copper' : 'bg-white border-kurla-stone hover:border-kurla-copper'}`}>{c.label}</button>
                ))}
              </div>
              <p className="text-[11px] text-kurla-carbon/50 mt-1">{jConcerns.length}/3</p>
            </div>
            <div>
              <label className="text-xs font-semibold">Note (facultatif, 280 max)</label>
              <textarea value={jNotes} onChange={e => setJNotes(e.target.value)} maxLength={280} rows={3} placeholder="Ex: SPF réappliqué à midi, masque hydratant ce soir..." className="mt-1 w-full p-3 rounded-xl bg-white border border-kurla-stone text-xs focus:outline-none focus:border-kurla-copper resize-none" />
              <p className="text-[11px] text-kurla-carbon/40 text-right">{jNotes.length}/280</p>
            </div>
            <button onClick={addJournalEntry} disabled={saving} className="w-full py-3 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
              <Plus className="w-4 h-4" /> Ajouter au journal
            </button>
          </div>

          <div className="space-y-3">
            {journal.length === 0 ? (
              <p className="text-xs text-kurla-carbon/50 text-center py-6">Aucune entrée pour l’instant — ajoutez votre première note ci-dessus.</p>
            ) : (
              journal.slice(0, 20).map((entry, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-kurla-sand border border-kurla-stone flex gap-4">
                  <div className="shrink-0 text-center">
                    <span className="text-xs font-bold block">{entry.date?.slice(5).replace('-', '/') || '—'}</span>
                    <span className="text-lg block mt-1">{entry.feeling === 'confortable' ? '😊' : entry.feeling === 'mitige' ? '😐' : '😣'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 mb-1">{(entry.concerns || []).filter(v => v !== UNKNOWN).slice(0, 4).map(v => <span key={v} className="px-2 py-0.5 rounded-full bg-white border border-kurla-stone text-[11px] font-semibold">{label(v)}</span>)}</div>
                    {entry.notes && <p className="text-xs text-kurla-carbon/70 leading-relaxed break-words">{entry.notes}</p>}
                  </div>
                  <button onClick={() => deleteEntry(idx)} className="shrink-0 text-rose-700 hover:underline text-[11px] self-start">Suppr.</button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={saveProfile} disabled={saving} className="flex-1 py-3 rounded-full bg-kurla-carbon hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? 'Enregistrement…' : <><Save className="w-4 h-4" /> Enregistrer Ma peau</>}
            </button>
            <a href="/peau/diagnostic/resultats" className="px-5 py-3 rounded-full border border-kurla-stone text-xs font-semibold text-center hover:border-kurla-copper">Voir le dernier résultat</a>
          </div>
          <p className="text-[11px] text-kurla-carbon/45 leading-relaxed flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Journal beauté : suivi déclaratif, non médical. Si rougeurs, douleurs ou marques persistent, consultez un dermatologue. Export/suppression dans “Vos données”.</p>
        </div>

        {/* Liens peau */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <a href="/peau" className="p-4 rounded-2xl bg-kurla-ivory border border-kurla-stone hover:border-kurla-copper"><p className="font-bold flex items-center gap-1.5"><Zap className="w-4 h-4 text-kurla-copper" /> Pôle Peau</p><p className="text-kurla-carbon/60 font-light mt-1">Explorer les 15 besoins & le guide HPI/SPF.</p></a>
          <a href="/peau/routine" className="p-4 rounded-2xl bg-kurla-ivory border border-kurla-stone hover:border-kurla-copper"><p className="font-bold flex items-center gap-1.5"><Clock className="w-4 h-4 text-kurla-copper" /> Ma routine</p><p className="text-kurla-carbon/60 font-light mt-1">Matin / soir / hebdo, budget total.</p></a>
          <a href="/boutique?cat=peau" className="p-4 rounded-2xl bg-kurla-ivory border border-kurla-stone hover:border-kurla-copper"><p className="font-bold flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-kurla-copper" /> Catalogue peau</p><p className="text-kurla-carbon/60 font-light mt-1">Filtrer par besoin, actif, budget.</p></a>
        </div>
      </div>
    </div>
  );
};
