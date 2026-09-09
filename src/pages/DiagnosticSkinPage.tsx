import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, ShieldAlert, Droplets, Sun, Layers, Heart, Wind, Shield, Clock, Eye, Smile, Zap, Search, AlertCircle, Check, Info } from 'lucide-react';
import { SkinDiagnosticAnswers } from '../types';
import { navigate } from '../lib/router';
import { analytics } from '../lib/analytics';
import { useAuth } from '../context/AuthContext';

/**
 * DIAGNOSTIC PEAU — KURLA SKIN · 12 étapes (complet 5 min) / 5 étapes (express 2 min)
 * Double entrée : ?mode=express (5 questions) vs complet (12 questions).
 * Vocabulaire : uniformiser ≠ éclaircir · expertise peaux riches en mélanine (HPI, white cast, barrière).
 * Chaque étape propose "Je ne sais pas encore" → inconnu, jamais bloquant.
 */

const UNKNOWN = 'inconnu';

export const DiagnosticSkinPage: React.FC = () => {
  const { session } = useAuth();
  const [isExpress, setIsExpress] = useState(false);
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setIsExpress(sp.get('mode') === 'express');
    } catch { /* ignore */ }
    try { analytics.diagnosticStart('skin'); } catch { /* noop */ }
  }, []);

  const totalSteps = isExpress ? 5 : 12;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [answers, setAnswers] = useState<SkinDiagnosticAnswers>({
    skinType: 'mixte',
    priority: 'taches',
    spfUsage: 'recherche',
    sensitivity: 'moyenne',
    routine: 'simple',
    budget: '40_70',
    email: '',
    hydrationLevel: UNKNOWN,
    toneDepth: UNKNOWN,
    undertone: UNKNOWN,
    hyperpigmentationTendency: UNKNOWN,
    acne: UNKNOWN,
    skinConcerns: [UNKNOWN],
    skinObjectives: [UNKNOWN],
    sensitivities: [UNKNOWN],
    sunExposure: UNKNOWN,
    currentRoutine: UNKNOWN,
    texturePreference: UNKNOWN,
    finishPreference: UNKNOWN,
    ageRange: UNKNOWN,
    climate: UNKNOWN,
    reactionHistory: '',
    preferences: [UNKNOWN],
  });

  // sync step 1 when switching mode mid-flow (if user changed URL)
  useEffect(() => { if (step > totalSteps) setStep(totalSteps); }, [totalSteps, step]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else submitDiagnostic();
  };
  const handlePrev = () => { if (step > 1) setStep(step - 1); };

  const toggleMulti = (field: 'skinConcerns' | 'skinObjectives' | 'sensitivities', value: string, max = 3) => {
    const current = (answers[field] as string[]) || [UNKNOWN];
    const withoutUnknown = current.filter(v => v !== UNKNOWN);
    const has = withoutUnknown.includes(value);
    let next: string[];
    if (has) next = withoutUnknown.filter(v => v !== value);
    else if (withoutUnknown.length >= max) return; // max atteinte
    else next = [...withoutUnknown, value];
    if (next.length === 0) next = [UNKNOWN];
    // keep priority (legacy) sync with first concern for backward compat
    const patch: Partial<SkinDiagnosticAnswers> = { [field]: next } as any;
    if (field === 'skinConcerns' && next[0] && next[0] !== UNKNOWN) {
      // map first concern to priority legacy when possible
      const map: Record<string, string> = { taches: 'taches', teint_terne: 'teint_irregulier', imperfections: 'acne_legere', protection_solaire: 'spf', sensibilite: 'sensibilite', secheresse: 'hydratation' };
      if (map[next[0]]) patch.priority = map[next[0]] as any;
      patch.acne = next.includes('imperfections') ? 'occasionnelle' : answers.acne;
    }
    setAnswers({ ...answers, ...patch });
  };

  const toggleSensitivity = (value: string) => {
    const current = (answers.sensitivities as string[]) || [UNKNOWN];
    const withoutUnknown = current.filter(v => v !== UNKNOWN);
    const has = withoutUnknown.includes(value);
    let next: string[];
    if (has) next = withoutUnknown.filter(v => v !== value);
    else next = [...withoutUnknown, value];
    if (next.length === 0) next = [UNKNOWN];
    // si "aucune" cochée, on reset les autres
    if (value === 'aucune' && !has) next = ['aucune'];
    if (value !== 'aucune' && next.includes('aucune')) next = next.filter(v => v !== 'aucune');
    setAnswers({ ...answers, sensitivities: next });
  };

  const submitDiagnostic = async () => {
    try { analytics.diagnosticComplete('skin'); } catch { /* noop */ }
    setLoading(true);
    try {
      // enrichit routine legacy from currentRoutine
      const payload: SkinDiagnosticAnswers = {
        ...answers,
        routine: (answers.currentRoutine && answers.currentRoutine !== UNKNOWN ? answers.currentRoutine : answers.routine) as any,
        skinConcerns: answers.skinConcerns && answers.skinConcerns[0] !== UNKNOWN ? answers.skinConcerns : [answers.priority || 'taches'],
        skinObjectives: answers.skinObjectives && answers.skinObjectives[0] !== UNKNOWN ? answers.skinObjectives : [UNKNOWN],
      };
      // sauvegarde locale pour résultat + futur `Ma peau`
      try {
        sessionStorage.setItem('kurla_diagnostic_answers_skin', JSON.stringify(payload));
        localStorage.setItem('kurla_skin_answers', JSON.stringify(payload));
      } catch { /* storage indisponible */ }
      const res = await fetch('/api/ai/routine-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ diagnosticType: 'skin', answers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      try { sessionStorage.setItem('kurla_diagnostic_result', JSON.stringify(data)); } catch { /* noop */ }
      // tentative sauvegarde beauté-profile si connecté (non bloquant)
      if (session?.access_token) {
        try {
          const profilePayload = {
            skin: {
              skinType: payload.skinType,
              hydrationLevel: payload.hydrationLevel,
              toneDepth: payload.toneDepth,
              undertone: payload.undertone,
              hyperpigmentationTendency: payload.hyperpigmentationTendency,
              acne: payload.acne,
              skinConcerns: payload.skinConcerns,
              skinObjectives: payload.skinObjectives,
              sensitivity: payload.sensitivity,
              sensitivities: payload.sensitivities,
              sunExposure: payload.sunExposure,
              spfUsage: payload.spfUsage,
              currentRoutine: payload.currentRoutine,
              texturePreference: payload.texturePreference,
              finishPreference: payload.finishPreference,
              budget: payload.budget,
              ageRange: payload.ageRange,
              reactionHistory: payload.reactionHistory,
              preferences: payload.preferences,
            },
            environment: { climate: payload.climate },
          };
          await fetch('/api/beauty-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ profile: profilePayload, source: 'diagnostic_skin' }),
          }).catch(() => { });
        } catch { /* non bloquant */ }
      }
      navigate('/peau/diagnostic/resultats');
    } catch (e) {
      console.error(e);
      navigate('/peau/diagnostic/resultats');
    } finally { setLoading(false); }
  };

  // ── Options ───────────────────────────────────────────────────────────────
  const skinTypes = [
    { id: 'normale', label: 'Normale', desc: 'Confortable, peu de brillance.' },
    { id: 'seche', label: 'Sèche', desc: 'Tiraillements, rugosité.' },
    { id: 'tres_seche', label: 'Très sèche', desc: 'Inconfort, squames.' },
    { id: 'grasse', label: 'Grasse', desc: 'Brillance, pores visibles.' },
    { id: 'mixte', label: 'Mixte', desc: 'Zone T grasse, joues sèches.' },
    { id: 'sensible', label: 'Sensible', desc: 'Réactive, rougeurs.' },
    { id: 'deshydratee', label: 'Déshydratée', desc: 'Manque d’eau (même grasse).' },
    { id: 'mature', label: 'Mature', desc: 'Ridules, fermeté.' },
    { id: UNKNOWN, label: 'Je ne sais pas encore', desc: 'KURLA s’adapte.' },
  ];
  const hydrationLevels = [
    { id: 'confortable', label: 'Confortable', desc: 'Ni tiraillement ni brillance.' },
    { id: 'deshydratee', label: 'Déshydratée / tiraille', desc: 'Après nettoyage, peau qui tire.' },
    { id: 'seche', label: 'Sèche', desc: 'Sensation de sécheresse diffuse.' },
    { id: 'brillante', label: 'Brillante / excès de sébum', desc: 'Brillance en journée.' },
    { id: UNKNOWN, label: 'Je ne sais pas', desc: '' },
  ];
  const toneDepths = [
    { id: 'clair', label: 'Clair', color: '#F2D6C3' },
    { id: 'intermediaire', label: 'Intermédiaire', color: '#D9A88C' },
    { id: 'fonce', label: 'Foncé', color: '#8D5A3C' },
    { id: 'tres_fonce', label: 'Très foncé', color: '#3B2416' },
    { id: UNKNOWN, label: 'Je préfère ne pas classer', color: 'transparent' },
  ];
  const undertones = [
    { id: 'chaud', label: 'Chaud', desc: 'Doré / jaune' },
    { id: 'froid', label: 'Froid', desc: 'Rosé / rouge' },
    { id: 'neutre', label: 'Neutre', desc: '' },
    { id: 'olive', label: 'Olive', desc: '' },
    { id: UNKNOWN, label: 'Je ne sais pas encore', desc: '' },
  ];
  const hyperOptions = [
    { id: 'rare', label: 'Rarement', desc: 'Les marques apparaissent rarement.' },
    { id: 'occasionnelle', label: 'Parfois', desc: 'Après une inflammation.' },
    { id: 'frequente', label: 'Facilement', desc: 'Marquent à la moindre irritation.' },
    { id: UNKNOWN, label: 'Je ne sais pas', desc: '' },
  ];
  const acneOptions = [
    { id: 'aucune', label: 'Pas d’imperfections en ce moment' },
    { id: 'occasionnelle', label: 'Occasionnelles' },
    { id: 'reguliere', label: 'Régulières' },
    { id: UNKNOWN, label: 'Je ne sais pas' },
  ];
  const concernOptions: Array<{ id: string; label: string; desc: string }> = [
    { id: 'secheresse', label: 'Sécheresse / tiraillements', desc: '' },
    { id: 'deshydratation', label: 'Déshydratation', desc: '' },
    { id: 'teint_terne', label: 'Teint terne / éclat', desc: '' },
    { id: 'taches', label: 'Taches / hyperpigmentation', desc: 'Post-acné, HPI' },
    { id: 'rougeurs', label: 'Rougeurs / irritations', desc: '' },
    { id: 'imperfections', label: 'Imperfections / boutons', desc: '' },
    { id: 'points_noirs', label: 'Points noirs / pores', desc: '' },
    { id: 'grain_irregulier', label: 'Grain irrégulier', desc: '' },
    { id: 'cicatrices', label: 'Cicatrices post-acné', desc: '' },
    { id: 'rides', label: 'Rides / ridules', desc: '' },
    { id: 'fermete', label: 'Perte de fermeté', desc: '' },
    { id: 'cernes', label: 'Cernes / poches', desc: '' },
    { id: 'protection_solaire', label: 'Protection solaire', desc: 'Sans trace blanche' },
    { id: 'sensibilite', label: 'Sensibilité / réactivité', desc: '' },
    { id: 'teint_non_uniforme', label: 'Teint non uniforme', desc: 'Uniformiser' },
  ];
  const objectiveOptions = [
    { id: 'hydrater', label: 'Hydrater en profondeur' },
    { id: 'eclat', label: 'Retrouver de l’éclat' },
    { id: 'uniformiser', label: 'Uniformiser le teint' },
    { id: 'attenuer_taches', label: 'Atténuer les taches (HPI)' },
    { id: 'apaiser', label: 'Apaiser' },
    { id: 'reduire_imperfections', label: 'Réduire imperfections' },
    { id: 'affiner_grain', label: 'Affiner le grain' },
    { id: 'renforcer_barriere', label: 'Renforcer la barrière' },
    { id: 'proteger_spf', label: 'Protéger (soleil/pollution)' },
    { id: 'prevenir_age', label: 'Prévenir signes de l’âge' },
    { id: 'simplifier', label: 'Simplifier la routine' },
    { id: 'carnation', label: 'Adapté à ma carnation' },
  ];
  const sensitivityLevels = [
    { id: 'faible', label: 'Peu sensible', desc: 'Tolère la plupart des actifs' },
    { id: 'moyenne', label: 'Modérément sensible', desc: 'Textures douces' },
    { id: 'elevee', label: 'Très sensible', desc: 'Haute tolérance uniquement' },
    { id: UNKNOWN, label: 'Je ne sais pas', desc: '' },
  ];
  const sensitivityTriggers = [
    { id: 'aucune', label: 'Aucune sensibilité connue' },
    { id: 'parfum', label: 'Parfum / fragrance' },
    { id: 'alcool', label: 'Alcool dénaturé' },
    { id: 'huiles_essentielles', label: 'Huiles essentielles' },
    { id: 'retinol', label: 'Rétinol / AHA forts' },
    { id: 'sensible', label: 'Peau très réactive (tout)' },
  ];
  const sunOptions = [
    { id: 'faible', label: 'Faible', desc: 'Surtout en intérieur' },
    { id: 'moderee', label: 'Modérée', desc: '' },
    { id: 'forte', label: 'Forte', desc: 'Extérieur, sport' },
    { id: UNKNOWN, label: 'Je ne sais pas', desc: '' },
  ];
  const spfOptions = [
    { id: 'quotidien', label: 'Tous les jours' },
    { id: 'parfois', label: 'Parfois / été' },
    { id: 'jamais', label: 'Jamais pour le moment' },
    { id: 'recherche', label: 'Je cherche sans trace blanche' },
  ];
  const routineOptions = [
    { id: 'aucune', label: 'Aucune (eau uniquement)' },
    { id: 'basique', label: 'Basique (nettoyant + crème)' },
    { id: 'intermediaire', label: 'Quelques étapes (sérum + crème)' },
    { id: 'complete', label: 'Complète (nettoyant + tonique + sérum + crème + SPF)' },
    { id: UNKNOWN, label: 'Je ne sais pas' },
  ];
  const textureOptions = [
    { id: 'gel', label: 'Gel léger' },
    { id: 'lotion', label: 'Lotion fluide' },
    { id: 'creme', label: 'Crème' },
    { id: 'baume', label: 'Baume riche' },
    { id: UNKNOWN, label: 'Je ne sais pas' },
  ];
  const finishOptions = [
    { id: 'mat', label: 'Mat' },
    { id: 'naturel', label: 'Naturel' },
    { id: 'glowy', label: 'Glowy / lumineux' },
    { id: UNKNOWN, label: 'Je ne sais pas' },
  ];
  const budgets = [
    { id: 'moins_40', label: 'Moins de 40 € / mois' },
    { id: '40_70', label: '40 à 70 € / mois' },
    { id: '70_100', label: '70 à 100 € / mois' },
    { id: 'premium', label: 'Plus de 100 €' },
    { id: UNKNOWN, label: 'Je préfère ne pas préciser' },
  ];
  const ageRanges = [
    { id: '18_24', label: '18–24 ans' },
    { id: '25_34', label: '25–34 ans' },
    { id: '35_44', label: '35–44 ans' },
    { id: '45_54', label: '45–54 ans' },
    { id: '55_plus', label: '55 ans et +' },
    { id: UNKNOWN, label: 'Je préfère ne pas dire' },
  ];
  const climates = [
    { id: 'tempere', label: 'Tempéré' },
    { id: 'froid_sec', label: 'Froid et sec' },
    { id: 'chaud_sec', label: 'Chaud et sec' },
    { id: 'chaud_humide', label: 'Chaud et humide' },
    { id: 'variable', label: 'Variable selon saison' },
    { id: UNKNOWN, label: 'Je ne sais pas' },
  ];

  // ── Express mapping ── 5 étapes essentielles
  // E1 = type (étape C1), E2 = phototype (C3), E3 = préoccupations (C6), E4 = objectifs (C7), E5 = budget+email (C11+C12 combiné)
  // ──────────────────────────────────────────

  const renderSingleGrid = (options: Array<{ id: string; label: string; desc?: string }>, value: string, setter: (v: string) => void, cols = 2, autoNext = true) => (
    <div className={`grid gap-3 pt-2 ${cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => { setter(opt.id); if (autoNext && opt.id !== UNKNOWN) setTimeout(handleNext, 140); }}
          className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 ${value === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D] ring-1 ring-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'}`}
        >
          <div>
            <div className="font-bold text-sm text-[#FFF7EF]">{opt.label}</div>
            {!!opt.desc && <div className="text-xs text-[#FFF7EF]/60 mt-1 leading-relaxed">{opt.desc}</div>}
          </div>
          {value === opt.id && <Check className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" />}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-24 bg-gradient-to-b from-[#050403] via-[#1A0F0A] to-[#050403] text-[#FFF7EF]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C8753D]/15 border border-[#C8753D]/30 text-[#D49A63] text-xs font-semibold tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> KURLA SKIN · diagnostic peau · {isExpress ? 'express 2 min' : 'complet 5 min'} · gratuit
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-2">{isExpress ? 'Votre peau en 2 minutes' : 'Comprendre votre peau'}</h1>
          <p className="text-sm text-[#FFF7EF]/70 font-light max-w-lg mx-auto">
            {isExpress
              ? '5 questions essentielles — phototype, besoins, budget. Idéal pour explorer vite, puis affiner en complet.'
              : '12 questions visuelles, jamais anxiogènes. À chaque étape : “Je ne sais pas encore” est une vraie réponse. HPI, SPF sans trace blanche, vocabulaire uniformiser ≠ éclaircir.'}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px]">
            <a href="/peau/diagnostic" className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${!isExpress ? 'bg-[#FFF7EF] text-[#1A0F0A] border-[#FFF7EF]' : 'border-[#FFF7EF]/20 text-[#FFF7EF]/70 hover:bg-[#FFF7EF]/10'}`}>Complet</a>
            <a href="/peau/diagnostic?mode=express" className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${isExpress ? 'bg-[#FFF7EF] text-[#1A0F0A] border-[#FFF7EF]' : 'border-[#FFF7EF]/20 text-[#FFF7EF]/70 hover:bg-[#FFF7EF]/10'}`}>Express</a>
          </div>
        </div>

        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-xs text-[#D49A63] font-semibold uppercase tracking-wider">
            <span>{isExpress ? 'Express' : 'Diagnostic complet'} — question {step} / {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% complété</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
        </div>

        <div className="p-6 sm:p-10 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/15 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8753D]/10 rounded-full blur-3xl pointer-events-none" />

          {/* ════════════════════ MODE EXPRESS (5) ════════════════════ */}
          {isExpress && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">1 · Type de peau</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment qualifiez-vous votre peau ?</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Choisissez l’état dominant aujourd’hui. Vous pourrez affiner l’hydratation en mode complet.</p>
                  {renderSingleGrid(skinTypes, answers.skinType, v => setAnswers({ ...answers, skinType: v }))}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">2 · Phototype</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre carnation</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Pour recommander un SPF sans trace blanche. Palette non stigmatisante — “Je préfère ne pas classer” possible.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {toneDepths.map(opt => (
                      <button key={opt.id} onClick={() => { setAnswers({ ...answers, toneDepth: opt.id }); setTimeout(handleNext, 140); }} className={`p-4 rounded-2xl border text-center transition-all ${answers.toneDepth === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D] ring-1 ring-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'}`}>
                        {opt.id !== UNKNOWN ? <span className="w-10 h-10 rounded-full border border-[#FFF7EF]/15 mx-auto block" style={{ background: opt.color }} /> : <span className="w-10 h-10 rounded-full border border-dashed border-[#FFF7EF]/30 mx-auto flex items-center justify-center text-[10px] leading-none text-[#FFF7EF]/60">—</span>}
                        <span className="text-xs font-bold mt-2 block">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-[#050403] border border-[#D49A63]/30 p-3 flex gap-2 text-xs text-[#FFF7EF]/75">
                    <Info className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" /> Phototype ≠ valeur : un SPF 30+ reste utile quel que soit le phototype, surtout pour limiter les marques post-inflammatoires (HPI).
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">3 · Préoccupations (max 3)</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Qu’aimeriez-vous améliorer ?</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Sélectionnez jusqu’à 3. “Uniformiser” = atténuer les irrégularités, jamais “éclaircir”.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {concernOptions.map(opt => {
                      const active = (answers.skinConcerns || []).includes(opt.id);
                      const limit = (answers.skinConcerns || []).filter(v => v !== UNKNOWN).length >= 3 && !active;
                      return <button key={opt.id} onClick={() => toggleMulti('skinConcerns', opt.id)} disabled={limit} className={`px-3.5 py-2.5 rounded-full border text-xs font-semibold transition-all ${active ? 'bg-[#C8753D] border-[#C8753D] text-white' : limit ? 'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/30 cursor-not-allowed' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{opt.label}</button>;
                    })}
                  </div>
                  <p className="text-[11px] text-[#D49A63]">{(answers.skinConcerns || []).filter(v => v !== UNKNOWN).length}/3 sélectionnées</p>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">4 · Objectifs (max 3)</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel résultat attendez-vous ?</h2>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {objectiveOptions.map(opt => {
                      const active = (answers.skinObjectives || []).includes(opt.id);
                      const limit = (answers.skinObjectives || []).filter(v => v !== UNKNOWN).length >= 3 && !active;
                      return <button key={opt.id} onClick={() => toggleMulti('skinObjectives', opt.id)} disabled={limit} className={`px-3.5 py-2.5 rounded-full border text-xs font-semibold transition-all ${active ? 'bg-[#C8753D] border-[#C8753D] text-white' : limit ? 'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/30' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{opt.label}</button>;
                    })}
                  </div>
                  <p className="text-[11px] text-[#D49A63]">{(answers.skinObjectives || []).filter(v => v !== UNKNOWN).length}/3 · Astuce : choisissez “Uniformiser” + “Atténuer les taches” pour HPI.</p>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">5 · Budget & sauvegarde</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre budget & envoi du résultat</h2>
                  {renderSingleGrid(budgets.slice(0, 4), answers.budget, v => setAnswers({ ...answers, budget: v }), 2, false)}
                  <div className="pt-4">
                    <label className="text-xs font-semibold text-[#FFF7EF]/80">E-mail (facultatif, pour recevoir votre routine)</label>
                    <input type="email" value={answers.email} onChange={e => setAnswers({ ...answers, email: e.target.value })} placeholder="votre@email.fr (facultatif)" className="mt-1.5 w-full p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-sm focus:outline-none focus:border-[#C8753D]" />
                    <div className="mt-4 p-4 rounded-xl bg-[#050403]/80 border border-[#FFF7EF]/10 flex items-start gap-3 text-xs text-[#FFF7EF]/60">
                      <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
                      <span><strong>Bon à savoir :</strong> conseils beauté personnalisés — ne remplacent pas un avis dermatologique. En cas d’irritation persistante, consultez.</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════ MODE COMPLET (12) ════════════════════ */}
          {!isExpress && (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">1 · Type de peau</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Comment qualifier votre peau aujourd’hui ?</h2>
                  <p className="text-xs text-[#FFF7EF]/60">État dominant au quotidien. Vous préciserez l’hydratation à l’étape suivante.</p>
                  {renderSingleGrid(skinTypes, answers.skinType, v => setAnswers({ ...answers, skinType: v }))}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">2 · Hydratation / confort</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre peau tiraille-t-elle, brille-t-elle ?</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Même une peau grasse peut être déshydratée (manque d’eau).</p>
                  {renderSingleGrid(hydrationLevels, answers.hydrationLevel || UNKNOWN, v => setAnswers({ ...answers, hydrationLevel: v }))}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">3 · Phototype / carnation</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre carnation</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Pour conseiller un SPF sans trace blanche et des actifs adaptés à la mélanine.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {toneDepths.map(opt => (
                      <button key={opt.id} onClick={() => { setAnswers({ ...answers, toneDepth: opt.id }); setTimeout(handleNext, 140); }} className={`p-4 rounded-2xl border text-center transition-all ${answers.toneDepth === opt.id ? 'bg-[#C8753D]/20 border-[#C8753D] ring-1 ring-[#C8753D]' : 'bg-[#050403] border-[#FFF7EF]/10 hover:border-[#C8753D]/50'}`}>
                        {opt.id !== UNKNOWN ? <span className="w-10 h-10 rounded-full border border-[#FFF7EF]/15 mx-auto block" style={{ background: opt.color }} /> : <span className="w-10 h-10 rounded-full border border-dashed border-[#FFF7EF]/30 mx-auto flex items-center justify-center text-[10px] text-[#FFF7EF]/60">—</span>}
                        <span className="text-xs font-bold mt-2 block">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-[#050403] border border-[#D49A63]/30 p-3 flex gap-2 text-xs text-[#FFF7EF]/70"><Info className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" /> Peaux riches en mélanine (phototypes IV–VI) : HPI plus visible, SPF minéral peut laisser un voile blanc — on privilégie filtres invisibles.</div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">4 · Sous-ton</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre sous-ton</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Utile pour SPF teinté / correcteur, mais totalement facultatif.</p>
                  {renderSingleGrid(undertones, answers.undertone || UNKNOWN, v => setAnswers({ ...answers, undertone: v }))}
                </div>
              )}
              {step === 5 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">5 · Tendance aux marques</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Après un bouton ou une irritation…</h2>
                  <p className="text-xs text-[#FFF7EF]/60">HPI = taches sombres post-inflammatoires, fréquentes sur peaux mates/foncées.</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Les marques (HPI) apparaissent :</p>
                      {renderSingleGrid(hyperOptions, answers.hyperpigmentationTendency || UNKNOWN, v => setAnswers({ ...answers, hyperpigmentationTendency: v }), 1, false)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Imperfections actuelles :</p>
                      {renderSingleGrid(acneOptions, answers.acne || UNKNOWN, v => setAnswers({ ...answers, acne: v }), 1, false)}
                    </div>
                  </div>
                </div>
              )}
              {step === 6 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">6 · Préoccupations · max 3</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Qu’aimeriez-vous améliorer en priorité ?</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Jusqu’à 3. Exemple : “Taches / HPI” + “Teint non uniforme” + “Protection solaire”.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {concernOptions.map(opt => {
                      const active = (answers.skinConcerns || []).includes(opt.id);
                      const count = (answers.skinConcerns || []).filter(v => v !== UNKNOWN).length;
                      const limit = count >= 3 && !active;
                      return <button key={opt.id} onClick={() => toggleMulti('skinConcerns', opt.id)} disabled={limit} className={`px-3.5 py-2.5 rounded-full border text-xs font-semibold transition-all ${active ? 'bg-[#C8753D] border-[#C8753D] text-white' : limit ? 'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/30 cursor-not-allowed' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/85 hover:border-[#C8753D]/50'}`}>{opt.label}</button>;
                    })}
                  </div>
                  <p className="text-[11px] text-[#D49A63]">{(answers.skinConcerns || []).filter(v => v !== UNKNOWN).length}/3 sélectionnées</p>
                </div>
              )}
              {step === 7 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">7 · Objectifs · max 3</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Quel résultat attendez-vous ?</h2>
                  <p className="text-xs text-[#FFF7EF]/60">Vocabulaire KURLA : <strong className="text-[#FFF7EF]">uniformiser</strong> le teint, jamais “éclaircir”. On atténue l’irrégulier, on respecte la carnation.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {objectiveOptions.map(opt => {
                      const active = (answers.skinObjectives || []).includes(opt.id);
                      const count = (answers.skinObjectives || []).filter(v => v !== UNKNOWN).length;
                      const limit = count >= 3 && !active;
                      return <button key={opt.id} onClick={() => toggleMulti('skinObjectives', opt.id)} disabled={limit} className={`px-3.5 py-2.5 rounded-full border text-xs font-semibold ${active ? 'bg-[#C8753D] border-[#C8753D] text-white' : limit ? 'bg-[#050403] border-[#FFF7EF]/10 text-[#FFF7EF]/30' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/85 hover:border-[#C8753D]/50'}`}>{opt.label}</button>;
                    })}
                  </div>
                  <p className="text-[11px] text-[#D49A63]">{(answers.skinObjectives || []).filter(v => v !== UNKNOWN).length}/3</p>
                </div>
              )}
              {step === 8 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">8 · Sensibilité</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre peau est-elle sensible ?</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Niveau global</p>
                      {renderSingleGrid(sensitivityLevels, answers.sensitivity, v => setAnswers({ ...answers, sensitivity: v }), 1, false)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Déclencheurs connus (plusieurs possibles)</p>
                      <div className="flex flex-wrap gap-2">
                        {sensitivityTriggers.map(opt => {
                          const active = (answers.sensitivities || []).includes(opt.id);
                          return <button key={opt.id} onClick={() => toggleSensitivity(opt.id)} className={`px-3.5 py-2 rounded-full border text-xs font-semibold ${active ? 'bg-[#C8753D] border-[#C8753D] text-white' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{opt.label}</button>;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {step === 9 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">9 · Soleil & SPF</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Exposition et protection solaire</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Exposition au soleil</p>
                      {renderSingleGrid(sunOptions, answers.sunExposure || UNKNOWN, v => setAnswers({ ...answers, sunExposure: v }), 2, false)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Habitude SPF</p>
                      {renderSingleGrid(spfOptions, answers.spfUsage, v => setAnswers({ ...answers, spfUsage: v }), 2, false)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#050403] border border-[#D49A63]/30 p-3 text-xs text-[#FFF7EF]/70 flex gap-2"><Info className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" /> SPF 30→50+, filtres organiques ou hybrides souvent plus invisibles que 100% minéral sur peaux foncées. Toujours réappliquer si exposition prolongée.</div>
                </div>
              )}
              {step === 10 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">10 · Routine & textures</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre routine actuelle</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Routine aujourd’hui</p>
                      {renderSingleGrid(routineOptions, answers.currentRoutine || UNKNOWN, v => setAnswers({ ...answers, currentRoutine: v }), 1, false)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#D49A63] mb-2">Texture préférée</p>
                        <div className="flex flex-wrap gap-2">
                          {textureOptions.map(o => <button key={o.id} onClick={() => setAnswers({ ...answers, texturePreference: o.id })} className={`px-3 py-2 rounded-full border text-xs font-semibold ${answers.texturePreference === o.id ? 'bg-[#C8753D] border-[#C8753D] text-white' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{o.label}</button>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#D49A63] mb-2">Fini</p>
                        <div className="flex flex-wrap gap-2">
                          {finishOptions.map(o => <button key={o.id} onClick={() => setAnswers({ ...answers, finishPreference: o.id })} className={`px-3 py-2 rounded-full border text-xs font-semibold ${answers.finishPreference === o.id ? 'bg-[#C8753D] border-[#C8753D] text-white' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{o.label}</button>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {step === 11 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">11 · Budget, âge & environnement</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Votre cadre</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Budget mensuel peau</p>
                      {renderSingleGrid(budgets.slice(0, 4), answers.budget, v => setAnswers({ ...answers, budget: v }), 2, false)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Tranche d’âge</p>
                      <div className="flex flex-wrap gap-2">
                        {ageRanges.map(o => <button key={o.id} onClick={() => setAnswers({ ...answers, ageRange: o.id })} className={`px-3 py-2 rounded-full border text-xs font-semibold ${answers.ageRange === o.id ? 'bg-[#C8753D] border-[#C8753D] text-white' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{o.label}</button>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#D49A63] mb-2">Climat / saison</p>
                      <div className="flex flex-wrap gap-2">
                        {climates.map(o => <button key={o.id} onClick={() => setAnswers({ ...answers, climate: o.id })} className={`px-3 py-2 rounded-full border text-xs font-semibold ${answers.climate === o.id ? 'bg-[#C8753D] border-[#C8753D] text-white' : 'bg-[#050403] border-[#FFF7EF]/15 text-[#FFF7EF]/80 hover:border-[#C8753D]/50'}`}>{o.label}</button>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {step === 12 && (
                <div className="space-y-6">
                  <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">12 · Sauvegarde</span>
                  <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Recevez votre routine</h2>
                  <p className="text-sm text-[#FFF7EF]/70">Votre résultat s’affiche immédiatement. L’e-mail n’est utile que pour sauvegarder et retrouver “Ma peau”.</p>
                  <div>
                    <label className="text-xs font-semibold text-[#FFF7EF]/80">E-mail (facultatif)</label>
                    <input type="email" value={answers.email} onChange={e => setAnswers({ ...answers, email: e.target.value })} placeholder="votre@email.fr" className="mt-1.5 w-full p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-sm focus:outline-none focus:border-[#C8753D]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#FFF7EF]/80">Quelque chose à signaler ? (allergies, traitements en cours)</label>
                    <textarea value={answers.reactionHistory || ''} onChange={e => setAnswers({ ...answers, reactionHistory: e.target.value })} placeholder="Ex: peau réactive au parfum, traitement acné en cours..." rows={3} maxLength={300} className="mt-1.5 w-full p-4 rounded-2xl bg-[#050403] border border-[#FFF7EF]/20 text-[#FFF7EF] placeholder-[#FFF7EF]/40 text-sm focus:outline-none focus:border-[#C8753D] resize-none" />
                    <p className="text-[11px] text-[#FFF7EF]/40 text-right mt-1">{(answers.reactionHistory || '').length}/300</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#050403]/80 border border-[#FFF7EF]/10 flex items-start gap-3 text-xs text-[#FFF7EF]/60">
                    <ShieldAlert className="w-4 h-4 text-[#D49A63] shrink-0 mt-0.5" />
                    <span><strong>Bon à savoir :</strong> ces recommandations beauté ne constituent pas un avis médical ni un diagnostic. En cas de symptômes persistants, consultez un dermatologue. Données stockées dans “Ma peau”, modifiables à tout moment.</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between pt-8 border-t border-[#FFF7EF]/10 mt-8">
            <button onClick={handlePrev} disabled={step === 1} className={`px-5 py-2.5 rounded-full border border-[#FFF7EF]/20 text-xs font-semibold flex items-center gap-2 ${step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#FFF7EF]/10'}`}>
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>
            <button onClick={handleNext} disabled={loading} className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
              {loading ? 'Génération KURLA…' : step === totalSteps ? <>Voir ma routine <Sparkles className="w-4 h-4" /></> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[#FFF7EF]/40 text-center mt-6 leading-relaxed px-4">
          KURLA SKIN respecte votre carnation : “uniformiser” signifie réduire les irrégularités et atténuer les marques (HPI), jamais “éclaircir” la peau. SPF conseillé quotidiennement, filtres invisibles privilégiés sur peaux foncées.
        </p>
      </div>
    </div>
  );
};
