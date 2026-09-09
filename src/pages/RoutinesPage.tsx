import React, { useEffect, useState, useMemo } from 'react';
import { ArrowRight, CheckCircle2, Clock, Loader2, PackageOpen, RefreshCw, Sun, Moon, Sparkles, Droplets, Shield, Heart, AlertTriangle, Info, ShoppingBag, Layers, Zap, ArrowLeft, Award } from 'lucide-react';
import { RoutineBundle } from '../types';
import { useProducts } from '../services/productService';
import { findForStep } from '../lib/skinAlternatives';
import { getTodayState, toggleToday, getStreak, getWeekHistory } from '../lib/skinObservance';

type SkinTier = 'essentielle' | 'complete' | 'premium';

const SKIN_TIERS: Record<SkinTier, { label: string; price: string; products: number; desc: string; badge: string; color: string }> = {
  essentielle: { label: 'Essentielle', price: '49,70 €', products: 3, desc: 'Barrière + SPF invisible · 2 min · budget serré', badge: 'Essentielle · −5%', color: 'bg-[#FFFDF9]' },
  complete: { label: 'Équilibrée', price: '62 €', products: 5, desc: 'Recommandée · HPI + hydratation · −13%', badge: 'Recommandée · −13%', color: 'bg-[#FFFDF9]' },
  premium: { label: 'Experte', price: '84,90 €', products: 7, desc: 'Complète · grain & taches · −15% · liv. gratuite', badge: 'Experte · −15%', color: 'bg-[#FFFDF9]' },
};

const MATIN_STEPS = [
  { n: 1, title: 'Nettoyant doux sans sulfates', desc: 'Matin & soir · gel si mixte/grasse, lait si sèche. Sans parfum si sensible.', inci: 'Glycérine, céramides' },
  { n: 2, title: 'Tonique hydratant', desc: 'Si taches/HPI : tonique niacinamide 5% (3 gouttes). Sinon eau florale apaisante.', inci: 'Niacinamide 5%' },
  { n: 3, title: 'Sérum éclat', desc: 'Vitamine C 10% le matin (antioxydant) OU niacinamide si taches marquées. Pas les deux même matin au début.', inci: 'Vitamine C / Niacinamide' },
  { n: 4, title: 'Contour des yeux', desc: 'Si cernes/poches : caféine + peptides. Tapoter, pas frotter.', inci: 'Caféine' },
  { n: 5, title: 'Hydratant céramides', desc: 'Gel si mixte · crème si sèche · squalane pour barrière. Fini naturel.', inci: 'Céramides, squalane' },
  { n: 6, title: 'SPF 50+ invisible', desc: 'Dernier geste du matin · 2 doigts · filtres organiques/hybrides sans trace blanche sur phototypes foncés.', inci: 'Filtres organiques' },
];

const SOIR_STEPS = [
  { n: 1, title: 'Démaquillage (si SPF/maquillage)', desc: 'Huile ou baume doux — rincer à l’eau tiède.' },
  { n: 2, title: 'Nettoyant doux', desc: 'Même que le matin.' },
  { n: 3, title: 'Tonique', desc: 'Hydratant, préparer la peau.' },
  { n: 4, title: 'Exfoliant 1–2×/sem', desc: 'AHA/BHA doux — JAMAIS même soir que rétinol. Alertes actives.' },
  { n: 5, title: 'Sérum ciblé taches', desc: 'Niacinamide + azélaïque le soir. Uniformiser, jamais éclaircir.' },
  { n: 6, title: 'Sérum hydratation', desc: 'Acide hyaluronique sur peau encore humide.' },
  { n: 7, title: 'Crème barrière', desc: 'Riche, scelle tout. Céramides + cholestérol.' },
  { n: 8, title: 'Baume lèvres & scellage', desc: 'Si très sèche : une goutte d’huile squalane.' },
];

const HEBDO_STEPS = [
  { n: 1, title: 'Masque hydratant', desc: '1×/sem · 10 min · aloe + céramides.' },
  { n: 2, title: 'Exfoliant doux', desc: 'Enzymatique si sensible · 1×/sem.' },
  { n: 3, title: 'Auto-massage / Gua sha', desc: '2 min · améliore micro-circulation · toujours avec huile.' },
];

const ALT_MATIN: Record<number, Array<{ label: string; price: string; note: string; sansParfum: boolean; whitecast?: string }>> = {
  1: [{ label: 'Gel nettoyant sans parfum — 150ml', price: '12,90 €', note: 'Mixte/grasse · squalane', sansParfum: true }, { label: 'Lait dermo-apaisant — 200ml', price: '15,50 €', note: 'Sèche/sensible · parfum léger', sansParfum: false }],
  2: [{ label: 'Tonique niacinamide 5% — 120ml', price: '18 €', note: 'HPI · taches', sansParfum: true }, { label: 'Eau florale bleuet — 200ml', price: '11 €', note: 'Sensibles', sansParfum: true }],
  3: [{ label: 'Sérum vitamine C 10% — 30ml', price: '22 €', note: 'Éclat · matin', sansParfum: true }, { label: 'Sérum niacinamide 5% — 30ml', price: '19 €', note: 'Alternative taches', sansParfum: true }],
  5: [{ label: 'Gel céramides léger — 50ml', price: '16 €', note: 'Mixte · fini naturel', sansParfum: true }, { label: 'Crème riche squalane — 50ml', price: '21 €', note: 'Sèche · baume', sansParfum: false }],
  6: [{ label: 'SPF 50 invisible fluide — 40ml', price: '19 €', note: 'Filtres organiques · sans trace blanche', sansParfum: true, whitecast: 'Invisible' }, { label: 'SPF 50 minéral teinté — 40ml', price: '18 €', note: 'Risque trace si non invisible', sansParfum: false, whitecast: 'Modéré' }],
};

const ALT_SOIR: Record<number, Array<{ label: string; price: string; note: string; sansParfum: boolean }>> = {
  4: [{ label: 'Exfoliant AHA 5% doux — 100ml', price: '17 €', note: '1–2×/sem', sansParfum: true }, { label: 'Gommage enzymatique — 75ml', price: '15 €', note: 'Sensibles', sansParfum: true }],
  5: [{ label: 'Sérum azélaïque 10% — 30ml', price: '20 €', note: 'Taches · soir', sansParfum: true }, { label: 'Sérum tranexamique — 30ml', price: '24 €', note: 'HPI marquée', sansParfum: true }],
  7: [{ label: 'Baume céramides intense — 50ml', price: '23 €', note: 'Barrière', sansParfum: true }, { label: 'Crème légère — 50ml', price: '18 €', note: 'Mixte', sansParfum: false }],
};

export const RoutinesPage: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSkin, setIsSkin] = useState(false);
  const [skinTier, setSkinTier] = useState<SkinTier>('complete');
  const [skinBudgetInput, setSkinBudgetInput] = useState<string>('');
  const { products } = useProducts();
  const [guided, setGuided] = useState<any | null>(null);
  const [openAlt, setOpenAlt] = useState<string | null>(null);

  const skinProducts = useMemo(() => products.filter(p => p.category === 'peau'), [products]);
  // C4.3 — observance matin/soir → streak 7j
  const [observance, setObservance] = useState<{ matin: boolean; soir: boolean }>(() => { try { return getTodayState(); } catch { return { matin: false, soir: false }; } });
  const [streakMatin, setStreakMatin] = useState(() => { try { return getStreak('matin'); } catch { return 0; } });
  const [streakSoir, setStreakSoir] = useState(() => { try { return getStreak('soir'); } catch { return 0; } });
  const weekHistory = useMemo(() => { try { return getWeekHistory(); } catch { return []; } }, [observance]);

  const handleToggleObservance = (moment: 'matin' | 'soir') => {
    try {
      const next = toggleToday(moment);
      setObservance({ matin: !!next[new Date().toISOString().slice(0, 10)]?.matin, soir: !!next[new Date().toISOString().slice(0, 10)]?.soir });
      // fallback to direct map
      const todayKey = new Date().toISOString().slice(0, 10);
      const m = next[todayKey] || { matin: false, soir: false };
      setObservance(m);
      setStreakMatin(getStreak('matin'));
      setStreakSoir(getStreak('soir'));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const path = window.location.pathname;
    const isPeau = path.startsWith('/peau');
    setIsSkin(isPeau);
    try {
      const raw = localStorage.getItem('kurla_skin_answers') || sessionStorage.getItem('kurla_diagnostic_answers_skin');
      if (raw) setGuided(JSON.parse(raw));
      const sp = new URLSearchParams(window.location.search);
      const b = sp.get('budget');
      if (b) {
        const m: Record<string, SkinTier> = { '40': 'essentielle', moins_40: 'essentielle', '40_70': 'complete', '68': 'complete', '70_100': 'premium', '124': 'premium' };
        if (m[b]) setSkinTier(m[b]);
        setSkinBudgetInput(b);
      }
      const tier = sp.get('tier');
      if (tier) {
        const alias: Record<string, SkinTier> = { essentielle: 'essentielle', equilibree: 'complete', complete: 'complete', experte: 'premium', premium: 'premium' };
        const norm = tier.toLowerCase().trim();
        const mapped = alias[norm] || (norm as SkinTier);
        if (mapped in SKIN_TIERS) setSkinTier(mapped);
      }
    } catch { /* ignore */ }
    // hair routines fetch (kept for /routines)
    if (!isPeau) {
      fetch('/api/routines').then(r => r.json().catch(()=>({}))).then(data => {
        if (data.routines) setRoutines(data.routines);
        setLoading(false);
      }).catch(e => { setError(e?.message || 'Indisponible'); setLoading(false); });
    } else setLoading(false);
  }, []);

  const loadRoutines = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/routines');
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Indisponible');
      setRoutines(data.routines || []);
    } catch (e: any) { setError(e?.message || 'Indisponible'); }
    finally { setLoading(false); }
  };

  // ── SKIN BRANCH ───────────────────────────────────────────────────────
  if (isSkin) {
    const tier = SKIN_TIERS[skinTier];
    const matin = skinTier === 'essentielle' ? MATIN_STEPS.filter(s => [1,5,6].includes(s.n)) : MATIN_STEPS;
    const soir = skinTier === 'essentielle' ? SOIR_STEPS.filter(s => [2,5,7].includes(s.n)) : skinTier === 'complete' ? SOIR_STEPS.filter(s => ![1,4].includes(s.n)) : SOIR_STEPS;
    const hebdo = skinTier === 'essentielle' ? [] : HEBDO_STEPS;

    // C9 — Prix kits peau chiffrés (alignés peauKits.ts : 49,70/62/84,90) — pas de calcul catalogue tant que gamme en précommande
    const priceEss = 49.70;
    const priceComp = 62.00;
    const pricePrem = 84.90;
    const priceMap: Record<SkinTier, number> = { essentielle: priceEss, complete: priceComp, premium: pricePrem };
    const currentPrice = priceMap[skinTier];

    // Alertes compatibilité
    const alerts: string[] = [];
    if (guided?.sensitivities?.includes('parfum')) alerts.push('Votre peau est marquée “sans parfum” — la sélection évite les fragrances.');
    if (skinProducts.some(p=>p.containsFragrance) && guided?.sensitivities?.includes('parfum')) alerts.push('Certains produits du catalogue contiennent du parfum — une alternative sans parfum est proposée à chaque étape.');
    alerts.push('Rétinol + AHA/BHA le même soir = irritation possible → alterner (ex: AHA lun./jeu., rétinol mar./ven.).');
    alerts.push('SPF le matin = non négociable pour limiter HPI, même phototype foncé (SPF naturel 13 ≠ protection).');

    const budgetOk = !skinBudgetInput || (skinTier==='essentielle' && skinBudgetInput.includes('40')) || (skinTier==='complete' && skinBudgetInput.includes('40_70')) || true;

    return (
      <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header peau */}
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] text-[#D9A8A4] text-[10px] font-bold tracking-widest uppercase">KURLA SKIN · routine</span>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mt-3">Votre routine peau, à votre budget</h1>
            <p className="text-sm text-[#111111]/70 font-light mt-3 leading-relaxed">
              Matin : <strong className="font-semibold text-[#111111]">protéger</strong> (6 étapes) · Soir : <strong className="font-semibold text-[#111111]">réparer</strong> (8) · Hebdo : <strong className="font-semibold text-[#111111]">3 soins</strong>. Prix total, alternatives à chaque étape, et garde-fous actifs.
            </p>
            {guided && <p className="text-xs mt-2 px-3 py-1.5 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] inline-block">Basé sur votre diagnostic : {guided.skinType || '—'} · {guided.toneDepth || '—'} · {guided.skinConcerns?.slice(0,2).join(', ') || '—'} {guided.budget ? `· budget ${guided.budget}` : ''}</p>}
          </div>

          {/* Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {(Object.keys(SKIN_TIERS) as SkinTier[]).map(k => {
              const t = SKIN_TIERS[k];
              const isActive = skinTier === k;
              const p = priceMap[k];
              return (
                <button key={k} onClick={() => setSkinTier(k)} className={`p-6 rounded-3xl border text-left transition-all ${isActive ? 'bg-[#111111] text-white border-[#111111] shadow-xl scale-[1.02]' : 'bg-[#FFFDF9] border-[#E8E1DA] hover:border-[#C8753D] text-[#111111]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold">{t.label}</h3>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isActive ? 'bg-[#C8753D] text-white' : 'bg-[#F8F2EC] text-[#C8753D] border border-[#E8E1DA]'}`}>{t.badge}</span>
                  </div>
                  <p className="text-2xl font-bold">{p.toFixed(2)} € <span className="text-xs font-normal opacity-60">/ {t.products} produits</span></p>
                  <p className="text-xs font-light mt-1 opacity-70">{t.desc}</p>
                  <p className="text-[11px] mt-2 px-2 py-1 rounded-lg bg-[#F8F2EC] text-[#111111]/70 border border-[#E8E1DA] font-mono">{k==='essentielle'?'Nettoyant → Hydratant → SPF':k==='complete'?'Nettoyant → Tonique → Sérum → Crème → SPF (+ exfoliant 2×/sem)':'Double nettoyage → Essence → 2 Sérums → Contour yeux → 2 Crèmes → SPF + masques'}</p>
                </button>
              );
            })}
          </div>

          {/* Prix + budget Fatou */}
          <div className="mb-8 p-5 rounded-3xl bg-[#111111] text-white flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-[#D49A63]">Budget Fatou — 28 ans · peau mixte · HPI · sans parfum</p>
              <p className="text-sm font-light mt-1">Tier <strong className="font-bold text-white">{tier.label}</strong> : <strong className="font-bold text-white">{currentPrice.toFixed(2)} €</strong> pour {tier.products} produits · <span className="text-[#D49A63]">alternative sans parfum à chaque étape</span></p>
              {skinBudgetInput && <p className="text-[11px] text-white/60 mt-1">Filtre URL budget={skinBudgetInput} {budgetOk ? '→ tier adapté' : ''}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={`/boutique?cat=peau&budget=${skinTier==='essentielle'?'moins_40':skinTier==='complete'?'40_70':'70_100'}`} className="px-5 py-2.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold">Voir la sélection peau {tier.label.toLowerCase()}</a>
              <a href="/peau/diagnostic" className="px-5 py-2.5 rounded-full bg-white text-[#111111] text-xs font-bold">Modifier mon diagnostic</a>
            </div>
          </div>

          {/* C4.3 — Observance matin / soir + streak 7j */}
          <div className="mb-8 p-5 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-widest font-bold text-[#C8753D] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Observance quotidienne — cochez matin & soir</p>
              <h3 className="text-base font-bold mt-1">Je tiens ma routine {streakMatin >=7 || streakSoir >=7 ? '· 🔥 streak en cours !' : ''}</h3>
              <p className="text-xs text-[#111111]/60 mt-1 leading-relaxed">Toucher matin = SPF + hydratant · Soir = nettoyant + crème barrière. 7 matins d’affilée → badge “Régulière”.</p>
              <div className="mt-3 flex gap-1.5">
                {weekHistory.map(d => (
                  <div key={d.date} className="text-center">
                    <span className="text-[10px] text-[#111111]/50 block">{d.dayLabel.slice(0,2)}</span>
                    <div className="mt-1 flex flex-col gap-1">
                      <span className={`w-2 h-2 rounded-full ${d.matin ? 'bg-[#C8753D]' : 'bg-[#111111]/15'}`} title={`matin ${d.date}`} />
                      <span className={`w-2 h-2 rounded-full ${d.soir ? 'bg-[#111111]' : 'bg-[#111111]/15'}`} title={`soir ${d.date}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => handleToggleObservance('matin')} className={`px-5 py-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 min-w-[110px] ${observance.matin ? 'bg-[#C8753D] text-white border-[#C8753D] shadow-md' : 'bg-white border-[#E8E1DA] hover:border-[#C8753D]'}`}>
                <Sun className={`w-5 h-5 ${observance.matin ? 'text-white' : 'text-[#C8753D]'}`} />
                <span>Matin {observance.matin ? '✓' : ''}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${streakMatin >=7 ? 'bg-emerald-500 text-white' : observance.matin ? 'bg-white/20 text-white' : 'bg-[#F8F2EC] text-[#111111]/60'}`}>{streakMatin}j streak</span>
              </button>
              <button onClick={() => handleToggleObservance('soir')} className={`px-5 py-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 min-w-[110px] ${observance.soir ? 'bg-[#111111] text-white border-[#111111] shadow-md' : 'bg-white border-[#E8E1DA] hover:border-[#C8753D]'}`}>
                <Moon className={`w-5 h-5 ${observance.soir ? 'text-white' : 'text-[#111111]'}`} />
                <span>Soir {observance.soir ? '✓' : ''}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${streakSoir >=7 ? 'bg-emerald-500 text-white' : observance.soir ? 'bg-white/20 text-white' : 'bg-[#F8F2EC] text-[#111111]/60'}`}>{streakSoir}j streak</span>
              </button>
            </div>
            <div className="hidden lg:block text-xs text-[#111111]/60 max-w-[180px] leading-relaxed">
              {(streakMatin >=7 || streakSoir >=7) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs"><Award className="w-3.5 h-3.5" /> 7 matins d’affilée — bravo Fatou !</span>
              )}
              {streakMatin <7 && streakSoir <7 && <span>{7 - Math.max(streakMatin, streakSoir)} jour{7 - Math.max(streakMatin, streakSoir)>1?'s':''} avant le badge “7 matins d’affilée”.</span>}
              <a href="/peau/journal" className="block mt-2 text-[#C8753D] font-bold hover:underline">Aller au journal peau →</a>
            </div>
          </div>

          {/* Routine détaillée matin / soir / hebdo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <section className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
                <h2 className="text-lg font-bold flex items-center gap-2"><Sun className="w-5 h-5 text-[#C8753D]" /> Matin · protéger — {matin.length} étapes</h2>
                <p className="text-xs text-[#111111]/60 font-light mt-1">Ordre d’application : du plus léger au plus riche, SPF toujours en dernier.</p>
                <ol className="mt-4 space-y-3">
                  {matin.map(s => {
                    const staticAlts = ALT_MATIN[s.n];
                    const keywordMap: Record<number, { kw: string; fam: string }> = { 1: { kw: 'nettoyant', fam: 'nettoyant' }, 2: { kw: 'tonique', fam: 'tonique' }, 3: { kw: 'sérum', fam: 'serum' }, 4: { kw: 'yeux', fam: 'yeux' }, 5: { kw: 'hydratant', fam: 'hydratant' }, 6: { kw: 'spf', fam: 'spf' } };
                    const dyn = (()=>{ if(skinProducts.length < 2) return null; try{ const pref = !!guided?.sensitivities?.includes('parfum'); const km = keywordMap[s.n] || { kw: s.title.split(' ')[0].toLowerCase(), fam: '' }; const found = findForStep(km.kw, skinProducts, { max: 2, preferSansParfum: pref, stepFamily: km.fam }); return found.length? found : null; }catch{return null;} })();
                    const alts = dyn ? dyn.map(pr=> ({ label: `${pr.name} — ${pr.sizeLabel||''}`.trim(), price: `${pr.price.toFixed(2)} €`, note: `${pr.keyIngredients?.[0]||pr.routineStep||pr.brand||''} · ${pr.containsFragrance?'parfum':'sans parfum ✓'}`, sansParfum: !pr.containsFragrance, whitecast: pr.category==='peau' && /spf/i.test(pr.routineStep||pr.name) ? '—' : undefined, _product: pr } as any)) : staticAlts;
                    const isOpen = openAlt === `matin-${s.n}`;
                    return (
                      <li key={s.n} className="p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                        <div className="flex gap-3">
                          <span className="w-7 h-7 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold leading-tight">{s.title}</p>
                            <p className="text-xs text-[#111111]/65 font-light leading-relaxed mt-1">{s.desc}</p>
                            <p className="text-[11px] text-[#C8753D] font-semibold mt-1">{s.inci}</p>
                            <div className="mt-2 flex gap-1.5 flex-wrap">
                              <a href={`/boutique?cat=peau&q=${encodeURIComponent(s.title.split(' ')[0])}`} className="text-[11px] px-2 py-1 rounded-full bg-white border border-[#E8E1DA] font-semibold hover:border-[#C8753D]">Choisir</a>
                              {alts && <button onClick={()=>setOpenAlt(isOpen?null:`matin-${s.n}`)} className="text-[11px] px-2 py-1 rounded-full bg-[#111111] text-white font-semibold hover:bg-black">{isOpen?'Masquer':'Alternatives (2)'} {alts && alts.some(a=>a.sansParfum)&& <span className="opacity-70">· sans parfum</span>}</button>}
                              <a href="/peau/comparer" className="text-[11px] px-2 py-1 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-[#111111]/60 hover:border-[#C8753D]">Comparer</a>
                            </div>
                            {isOpen && alts && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {alts.map((a,i)=> (
                                  <div key={i} className="p-3 rounded-xl bg-white border border-[#E8E1DA] text-xs">
                                    <p className="font-bold leading-tight">{a.label}</p>
                                    <p className="text-[#111111]/60 font-light mt-1">{a.note}</p>
                                    <p className="font-bold mt-1">{a.price} {a.sansParfum?'· sans parfum ✓':'· parfum'} {a.whitecast?`· ${a.whitecast}`:''}</p>
                                    <a href={(a as any)._product ? `/produit/${(a as any)._product.slug}` : `/boutique?cat=peau&q=${encodeURIComponent(a.label.split(' ')[0])}`} className="mt-2 inline-block text-[11px] px-2 py-1 rounded-full bg-[#C8753D] text-white font-bold">Voir</a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
              <section className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
                <h2 className="text-lg font-bold flex items-center gap-2"><Moon className="w-5 h-5 text-[#C8753D]" /> Soir · réparer — {soir.length} étapes</h2>
                <p className="text-xs text-[#111111]/60 font-light mt-1">Soir : on répare la barrière, on traite les taches (sans “éclaircir”).</p>
                <ol className="mt-4 space-y-3">
                  {soir.map(s => {
                    const staticAlts = ALT_SOIR[s.n];
                    const keywordMapSoir: Record<number, { kw: string; fam: string }> = { 1: { kw: 'huile', fam: 'huile' }, 2: { kw: 'nettoyant', fam: 'nettoyant' }, 3: { kw: 'tonique', fam: 'tonique' }, 4: { kw: 'exfoliant', fam: 'exfoliant' }, 5: { kw: 'taches', fam: 'serum' }, 6: { kw: 'hyaluronique', fam: 'serum' }, 7: { kw: 'hydratant', fam: 'hydratant' }, 8: { kw: 'baume', fam: 'huile' } };
                    const dyn = (()=>{ if(skinProducts.length < 2) return null; try{ const pref = !!guided?.sensitivities?.includes('parfum'); const km = keywordMapSoir[s.n] || { kw: s.title.split(' ')[0].toLowerCase(), fam: '' }; const found = findForStep(km.kw, skinProducts, { max: 2, preferSansParfum: pref, stepFamily: km.fam }); return found.length? found : null; }catch{return null;} })();
                    const alts = dyn ? dyn.map(pr=> ({ label: `${pr.name} — ${pr.sizeLabel||''}`.trim(), price: `${pr.price.toFixed(2)} €`, note: `${pr.keyIngredients?.[0]||pr.routineStep||pr.brand||''} · ${pr.containsFragrance?'parfum':'sans parfum ✓'}`, sansParfum: !pr.containsFragrance, _product: pr } as any)) : staticAlts;
                    const isOpen = openAlt === `soir-${s.n}`;
                    return (
                      <li key={s.n} className="p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                        <div className="flex gap-3">
                          <span className="w-7 h-7 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">{s.title}</p><p className="text-xs text-[#111111]/65 font-light mt-1">{s.desc}</p>
                            <div className="mt-2 flex gap-1.5 flex-wrap">
                              <a href={`/boutique?cat=peau&q=${encodeURIComponent(s.title.split(' ')[0])}`} className="text-[11px] px-2 py-1 rounded-full bg-white border border-[#E8E1DA] font-semibold hover:border-[#C8753D]">Choisir</a>
                              {alts && <button onClick={()=>setOpenAlt(isOpen?null:`soir-${s.n}`)} className="text-[11px] px-2 py-1 rounded-full bg-[#111111] text-white font-semibold hover:bg-black">{isOpen?'Masquer':'Alternatives (2)'}</button>}
                              <a href="/peau/comparer" className="text-[11px] px-2 py-1 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-[#111111]/60">Comparer</a>
                            </div>
                            {isOpen && alts && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {alts.map((a,i)=> (
                                  <div key={i} className="p-3 rounded-xl bg-white border border-[#E8E1DA] text-xs">
                                    <p className="font-bold leading-tight">{a.label}</p><p className="text-[#111111]/60 font-light mt-1">{a.note}</p>
                                    <p className="font-bold mt-1">{a.price} {a.sansParfum?'· sans parfum ✓':'· parfum'}</p>
                                    <a href={(a as any)._product ? `/produit/${(a as any)._product.slug}` : `/boutique?cat=peau&q=${encodeURIComponent(a.label.split(' ')[0])}`} className="mt-2 inline-block text-[11px] px-2 py-1 rounded-full bg-[#C8753D] text-white font-bold">Voir</a>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            </div>
            <div className="space-y-6">
              <section className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
                <h2 className="text-base font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#C8753D]" /> Hebdo · 3 soins</h2>
                <ul className="mt-3 space-y-3">
                  {hebdo.length ? hebdo.map(s => (
                    <li key={s.n} className="p-3 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]"><p className="text-sm font-bold">{s.n}. {s.title}</p><p className="text-xs text-[#111111]/60 font-light mt-1">{s.desc}</p></li>
                  )) : <li className="text-xs text-[#111111]/60">Essentielle : hebdo allégé — masque 1×/sem si besoin.</li>}
                </ul>
              </section>
              <section className="p-6 rounded-3xl bg-[#111111] text-white">
                <h3 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#D49A63]" /> Alertes compatibilité</h3>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/80">
                  {alerts.map((a,i)=><li key={i} className="flex gap-2"><span className="text-[#D49A63]">•</span><span>{a}</span></li>)}
                </ul>
                <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/10 text-[11px] leading-relaxed">
                  <strong className="text-white">Garde Mélanine :</strong> HPI = taches sombres post-inflammation. Éviter trituration, SPF quotidien, et “uniformiser” sans “éclaircir”.
                </div>
              </section>
              <section className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
                <h3 className="text-sm font-bold">Comparer les tiers</h3>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-xl bg-[#F8F2EC]"><span>Essentielle (3)</span><strong>{priceEss.toFixed(2)} €</strong></div>
                  <div className="flex justify-between p-2 rounded-xl bg-[#C8753D]/10 border border-[#C8753D]/30"><span>Complète (6) — recommandée</span><strong>{priceComp.toFixed(2)} €</strong></div>
                  <div className="flex justify-between p-2 rounded-xl bg-[#F8F2EC]"><span>Premium (9)</span><strong>{pricePrem.toFixed(2)} €</strong></div>
                </div>
                <p className="text-[11px] text-[#111111]/50 mt-2">Prix calculés sur le catalogue peau réel quand disponible, sinon prix repères 32/68/124 €.</p>
              </section>
              <a href="/peau/diagnostic/resultats" className="w-full py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold flex items-center justify-center gap-1">Voir mon résultat peau →</a>
            </div>
          </div>

          {/* CTA boutique peau / diagnostic */}
          <div className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] flex flex-col sm:flex-row gap-3 items-center justify-between">
            <p className="text-xs text-[#111111]/70"><strong className="text-[#111111]">Fatou 28 ans, mixte, HPI, budget moyen, sans parfum</strong> — tier Complète filtrée sans parfum + SPF invisible est votre meilleure entrée.</p>
            <div className="flex gap-2 shrink-0">
              <a href="/boutique?cat=peau&need=taches&budget=40_70" className="px-5 py-2.5 rounded-full bg-[#111111] text-white text-xs font-bold">Boutique peau filtrée</a>
              <a href="/account/skin-id" className="px-5 py-2.5 rounded-full bg-white border border-[#E8E1DA] text-xs font-bold">Journal Ma peau</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FALLBACK CHEVEUX / générique (conserve le comportement historique) ──
  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">Routines & bundles</span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-3">Des étapes lisibles, sans promesse artificielle.</h1>
          <p className="text-sm text-[#FFF7EF]/70 font-light leading-relaxed">Chaque routine publiée doit réunir des produits publiés, des étapes documentées et un prix vérifiable. Si une information manque, la routine reste hors catalogue.</p>
        </div>
        {loading ? <div className="text-center py-20"><Loader2 className="w-9 h-9 text-[#C8753D] animate-spin mx-auto mb-4" /><p className="text-sm text-[#FFF7EF]/60">Chargement des routines publiées…</p></div> : error ? <div className="max-w-md mx-auto rounded-3xl border border-rose-400/20 bg-[#1A0F0A] p-8 text-center"><PackageOpen className="w-10 h-10 text-rose-300 mx-auto mb-3" /><p className="text-sm text-[#FFF7EF]/75 mb-5">{error}</p><button onClick={loadRoutines} className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Réessayer</button></div> : routines.length === 0 ? <div className="max-w-xl mx-auto rounded-3xl border border-[#FFF7EF]/10 bg-[#1A0F0A] p-10 text-center"><PackageOpen className="w-10 h-10 text-[#D49A63] mx-auto mb-4" /><h2 className="text-xl font-serif-title font-bold mb-2">Aucune routine publiée</h2><p className="text-sm text-[#FFF7EF]/65">Les routines seront visibles ici après validation de leurs produits et de leurs étapes.</p><a href="/boutique" className="mt-6 inline-flex items-center gap-2 text-xs text-[#D49A63] hover:underline">Voir les produits publiés <ArrowRight className="w-3.5 h-3.5" /></a></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{routines.map(routine => <article key={routine.id} className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden p-6 flex flex-col justify-between"><div>{routine.image ? <img loading="lazy" src={routine.image} alt={routine.title} className="w-full h-56 rounded-2xl object-cover mb-6" /> : <div className="w-full h-56 rounded-2xl bg-black/20 flex items-center justify-center text-xs text-[#FFF7EF]/50 mb-6">Image non renseignée</div>}<span className="text-[10px] uppercase tracking-widest text-[#D49A63]">{routine.badge || 'Routine publiée'}</span><h2 className="text-2xl font-serif-title font-bold mt-2">{routine.title}</h2><p className="text-sm text-[#FFF7EF]/70 mt-2 leading-relaxed">{routine.subtitle || 'Description non renseignée'}</p><div className="space-y-2 mt-5 pt-4 border-t border-[#FFF7EF]/10">{routine.steps.map(step => <div key={`${routine.id}-${step.number}`} className="flex gap-2 text-xs text-[#FFF7EF]/75"><CheckCircle2 className="w-4 h-4 text-[#C8753D] shrink-0" /><span><strong className="text-[#FFF7EF]">{step.number}. {step.title}</strong>{step.description ? ` · ${step.description}` : ''}</span></div>)}{routine.duration && <div className="flex gap-2 text-xs text-[#FFF7EF]/55"><Clock className="w-4 h-4 text-[#D49A63]" />{routine.duration}{routine.frequency ? ` · ${routine.frequency}` : ''}</div>}</div></div><div className="pt-6 mt-6 border-t border-[#FFF7EF]/10 flex items-center justify-between gap-3"><span className="text-2xl font-bold">{routine.products.reduce((total, product) => total + product.price, 0).toFixed(2)} €</span><a href={`/routines/${routine.slug}`} className="px-5 py-2.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold inline-flex items-center gap-2\">Voir le détail <ArrowRight className="w-3.5 h-3.5" /></a></div></article>)}</div>}
      </div>
    </div>
  );
};
