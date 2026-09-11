import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Moon, Shield, Sparkles, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStreak, getTodayState, toggleToday } from '../lib/skinObservance';
import { createEmptyBeautyProfile, normalizeBeautyProfile } from '../lib/beautyProfile';
import { buildSkinRoutine, type BuiltSkinRoutine, type RoutineMoment, type RoutineTier } from '../lib/skinRoutine';
import type { BeautyProfile } from '../lib/beautyProfile';
import type { Product } from '../types';

type Props = {
  products: Product[];
  guided?: Record<string, any> | null;
};

const TIERS: Array<{ value: RoutineTier; label: string; hint: string }> = [
  { value: 'Essentielle', label: 'Essentielle', hint: 'Base courte, sans ajout inutile' },
  { value: 'Équilibrée', label: 'Équilibrée', hint: 'Hydratation + traitement ciblé' },
  { value: 'Experte', label: 'Experte', hint: 'Routine complète avec hebdo' },
];

const MOMENT_META: Record<RoutineMoment, { label: string; icon: React.ReactNode; tone: string }> = {
  matin: { label: 'Matin · protéger', icon: <Sun className="w-5 h-5 text-kurla-copper" />, tone: 'bg-kurla-cream' },
  soir: { label: 'Soir · réparer', icon: <Moon className="w-5 h-5 text-[#66708A]" />, tone: 'bg-[#F4F5FA]' },
  hebdo: { label: 'Hebdo · espacer', icon: <Sparkles className="w-5 h-5 text-[#8A6B42]" />, tone: 'bg-[#F7F3EA]' },
};

function profileFromGuided(guided: Record<string, any> | null | undefined): BeautyProfile {
  if (!guided || typeof guided !== 'object') return createEmptyBeautyProfile();
  return normalizeBeautyProfile({ skin: guided });
}

function readLocalGuided(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem('kurla_skin_answers') || sessionStorage.getItem('kurla_diagnostic_answers_skin');
    if (!raw) return null;
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function loadableProfile(profile: BeautyProfile): BeautyProfile {
  return normalizeBeautyProfile(profile);
}

function stepsForMoment(routine: BuiltSkinRoutine, moment: RoutineMoment) {
  return routine.steps.filter(step => step.moment === moment);
}

export const SkinRoutineV1Panel: React.FC<Props> = ({ products, guided }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<BeautyProfile>(() => profileFromGuided(guided || readLocalGuided()));
  const [tier, setTier] = useState<RoutineTier>('Équilibrée');
  const [profileLoading, setProfileLoading] = useState(false);
  const [observance, setObservance] = useState<{ matin: boolean; soir: boolean }>(() => {
    try {
      const today = getTodayState();
      return { matin: !!today.matin, soir: !!today.soir };
    } catch {
      return { matin: false, soir: false };
    }
  });
  const [streaks, setStreaks] = useState({ matin: 0, soir: 0 });

  useEffect(() => {
    try { setStreaks({ matin: getStreak('matin'), soir: getStreak('soir') }); } catch { /* local observance indisponible */ }
  }, [observance]);

  const markDone = (moment: 'matin' | 'soir') => {
    try {
      toggleToday(moment);
      const today = getTodayState();
      setObservance({ matin: !!today.matin, soir: !!today.soir });
    } catch { /* la routine reste consultable sans observance */ }
  };

  useEffect(() => {
    let cancelled = false;
    const token = session?.access_token;
    if (!token) {
      const local = guided || readLocalGuided();
      if (local && !cancelled) setProfile(profileFromGuided(local));
      return () => { cancelled = true; };
    }

    setProfileLoading(true);
    fetch('/api/beauty-profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.json().catch(() => ({})).then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (!cancelled && response.ok && data?.profile) setProfile(loadableProfile(data.profile));
      })
      .catch(() => { /* Le profil local reste une base explicite, jamais une invention. */ })
      .finally(() => { if (!cancelled) setProfileLoading(false); });

    return () => { cancelled = true; };
  }, [guided, session?.access_token]);

  useEffect(() => {
    const queryTier = new URLSearchParams(window.location.search).get('tier')?.toLowerCase();
    const mapped: Record<string, RoutineTier> = {
      essentielle: 'Essentielle',
      equilibree: 'Équilibrée',
      équilibrée: 'Équilibrée',
      experte: 'Experte',
      premium: 'Experte',
      complete: 'Équilibrée',
    };
    if (queryTier && mapped[queryTier]) setTier(mapped[queryTier]);
  }, []);

  const routine = useMemo(() => buildSkinRoutine(profile, products, { tier }), [profile, products, tier]);
  const skin = profile.skin;
  const phototypeKnown = skin.phototype !== undefined && skin.phototypeConsent === true;
  const sensitivityKnown = skin.sensitivity !== 'inconnu' || (skin.sensitivities || []).some(value => value !== 'inconnu');
  const knownProducts = routine.steps.filter(step => step.product);
  const unknownSteps = routine.steps.filter(step => !step.product);

  return (
    <div className="min-h-screen pt-28 pb-24 bg-kurla-ivory text-kurla-carbon">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kurla-carbon text-[#D9A8A4] text-[10px] font-bold tracking-widest uppercase">KURLA SKIN · routine adaptative V1</span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mt-3">Une routine construite à partir de votre profil</h1>
          <p className="text-sm text-kurla-carbon/65 font-light leading-relaxed mt-3">
            Les produits affichés viennent du catalogue public serveur. Une donnée inconnue reste inconnue : KURLA ne complète ni le phototype, ni la carnation, ni la preuve produit.
          </p>
        </header>

        <section className="p-5 rounded-3xl bg-kurla-sand border border-kurla-stone">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-kurla-copper">Niveau de routine</p>
              <p className="text-xs text-kurla-carbon/60 mt-1">Le niveau change le nombre d’étapes, pas les règles de sécurité.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIERS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTier(option.value)}
                  className={`px-4 py-2.5 rounded-full border text-xs font-bold ${tier === option.value ? 'bg-kurla-carbon text-white border-kurla-carbon' : 'bg-white border-kurla-stone hover:border-kurla-copper'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-kurla-carbon/60 mt-3">{TIERS.find(option => option.value === tier)?.hint}</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-kurla-stone"><p className="text-[10px] uppercase tracking-wider text-kurla-copper font-bold">Profil</p><p className="text-sm font-bold mt-1">{skin.skinType === 'inconnu' ? 'Partiel' : skin.skinType}</p><p className="text-[11px] text-kurla-carbon/55 mt-1">Type de peau déclaré</p></div>
          <div className="p-4 rounded-2xl bg-white border border-kurla-stone"><p className="text-[10px] uppercase tracking-wider text-kurla-copper font-bold">Phototype</p><p className="text-sm font-bold mt-1">{phototypeKnown ? `Type ${skin.phototype}` : 'Non renseigné'}</p><p className="text-[11px] text-kurla-carbon/55 mt-1">Aucune déduction depuis toneDepth</p></div>
          <div className="p-4 rounded-2xl bg-white border border-kurla-stone"><p className="text-[10px] uppercase tracking-wider text-kurla-copper font-bold">Catalogue</p><p className="text-sm font-bold mt-1">{knownProducts.length} produit{knownProducts.length > 1 ? 's' : ''} sélectionné{knownProducts.length > 1 ? 's' : ''}</p><p className="text-[11px] text-kurla-carbon/55 mt-1">{products.length} produit{products.length > 1 ? 's' : ''} reçu{products.length > 1 ? 's' : ''} du serveur</p></div>
        </section>

        <section className="p-4 rounded-2xl bg-[#EEF7F4] border border-emerald-200 text-emerald-950 text-xs leading-relaxed">
          <div className="flex gap-2"><Shield className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" /><p><strong>Garde-fou actif :</strong> {phototypeKnown ? `la règle phototype ${skin.phototype} est appliquée avec consentement explicite.` : 'le phototype n’est pas connu ; aucune règle IV–VI ni déduction de whitecast n’est appliquée.'} {sensitivityKnown ? 'La sensibilité déclarée est prise en compte.' : 'La sensibilité est inconnue : la routine ne prétend pas être personnalisée sur ce point.'}</p></div>
        </section>

        {routine.incompatibilities.length > 0 && (
          <section className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed">
            <div className="flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><div><strong>Alternance requise :</strong><ul className="mt-1 list-disc list-inside">{routine.incompatibilities.map(item => <li key={item}>{item}</li>)}</ul></div></div>
          </section>
        )}

        {profileLoading && <p className="text-xs text-kurla-carbon/50 text-center">Synchronisation du profil enregistré…</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {(['matin', 'soir', 'hebdo'] as RoutineMoment[]).map(moment => {
            const steps = stepsForMoment(routine, moment);
            const meta = MOMENT_META[moment];
            return (
              <section key={moment} className={`p-5 rounded-3xl border border-kurla-stone ${meta.tone}`}>
                <h2 className="text-base font-bold flex items-center gap-2">{meta.icon}{meta.label}</h2>
                <ol className="mt-4 space-y-3">
                  {steps.map(step => (
                    <li key={`${step.moment}-${step.order}`} className="p-3 rounded-2xl bg-white/80 border border-kurla-stone">
                      <p className="text-[10px] uppercase tracking-wider text-kurla-copper font-bold">{step.order}. {step.label}</p>
                      {step.product ? (
                        <>
                          <p className="text-sm font-bold mt-1">{step.product.name}</p>
                          <p className="text-[11px] text-kurla-carbon/55 mt-1">{step.why}</p>
                          <div className="flex items-center justify-between gap-2 mt-2"><span className="text-xs font-bold">{Number(step.product.price).toFixed(2)} €</span><a href={`/produit/${step.product.slug}`} className="text-[11px] px-2.5 py-1 rounded-full bg-kurla-copper text-white font-bold">Voir la fiche</a></div>
                        </>
                      ) : (
                        <p className="text-xs text-kurla-carbon/55 mt-1">Aucune fiche publiée et sélectionnable pour cette étape. KURLA n’invente pas de produit.</p>
                      )}
                      {step.alert && <p className="mt-2 text-[11px] text-amber-800 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{step.alert}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>

        <section className="p-5 rounded-3xl bg-kurla-sand border border-kurla-stone">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div><p className="text-[10px] uppercase tracking-widest text-kurla-copper font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Observance</p><p className="text-sm font-bold mt-1">Cochez les étapes réalisées, sans suivi automatique.</p><p className="text-[11px] text-kurla-carbon/55 mt-1">Streak matin : {streaks.matin}j · soir : {streaks.soir}j</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => markDone('matin')} className={`px-4 py-2 rounded-full border text-xs font-bold ${observance.matin ? 'bg-kurla-copper text-white border-kurla-copper' : 'bg-white border-kurla-stone'}`}>Matin {observance.matin ? '✓' : ''}</button>
              <button type="button" onClick={() => markDone('soir')} className={`px-4 py-2 rounded-full border text-xs font-bold ${observance.soir ? 'bg-kurla-carbon text-white border-kurla-carbon' : 'bg-white border-kurla-stone'}`}>Soir {observance.soir ? '✓' : ''}</button>
            </div>
          </div>
        </section>

        <section className="p-5 rounded-3xl bg-kurla-carbon text-white flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div><p className="text-[10px] uppercase tracking-widest text-kurla-amber font-bold">Prix réel de la sélection</p><p className="text-xl font-bold mt-1">{routine.totalPrice.toFixed(2)} €</p><p className="text-[11px] text-white/55 mt-1">Somme des prix reçus du catalogue serveur ; aucun prix inventé.</p></div>
          <div className="text-xs text-white/70 flex gap-2 items-start max-w-md"><Info className="w-4 h-4 shrink-0 text-kurla-amber" /><span>{unknownSteps.length ? `${unknownSteps.length} étape${unknownSteps.length > 1 ? 's' : ''} reste${unknownSteps.length > 1 ? 'nt' : ''} sans fiche sélectionnable. Les kits et références de formulation cible ne sont pas rendus achetables.` : 'Toutes les étapes disposent d’une fiche sélectionnable.'}</span></div>
        </section>

        <div className="flex flex-wrap gap-2 justify-center text-xs">
          <a href="/peau/diagnostic" className="px-4 py-2 rounded-full bg-white border border-kurla-stone font-bold hover:border-kurla-copper">Modifier mon profil</a>
          <a href="/boutique?cat=peau" className="px-4 py-2 rounded-full bg-kurla-copper text-white font-bold">Explorer le catalogue peau</a>
        </div>
      </div>
    </div>
  );
};
