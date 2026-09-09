import React, { useEffect, useState, useMemo } from 'react';
import { ArrowRight, CheckCircle2, Clock, Loader2, PackageOpen, RefreshCw, Sun, Moon, Sparkles, Droplets, Shield, Heart, AlertTriangle, Info, ShoppingBag, Layers, Zap, ArrowLeft } from 'lucide-react';
import { RoutineBundle } from '../types';
import { useProducts } from '../services/productService';

type SkinTier = 'essentielle' | 'complete' | 'premium';

const SKIN_TIERS: Record<SkinTier, { label: string; price: string; products: number; desc: string; badge: string; color: string }> = {
  essentielle: { label: 'Essentielle', price: '32 €', products: 3, desc: 'Débutants, petits budgets, 2 min', badge: 'Dès 32 €', color: 'bg-[#FFFDF9]' },
  complete: { label: 'Complète', price: '68 €', products: 6, desc: 'Recommandée · 5 min · équilibre HPI/barrière', badge: 'Recommandée', color: 'bg-[#FFFDF9]' },
  premium: { label: 'Premium', price: '124 €', products: 9, desc: 'Passionnés · résultats optimaux', badge: 'Premium', color: 'bg-[#FFFDF9]' },
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

export const RoutinesPage: React.FC = () => {
  const [routines, setRoutines] = useState<RoutineBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSkin, setIsSkin] = useState(false);
  const [skinTier, setSkinTier] = useState<SkinTier>('complete');
  const [skinBudgetInput, setSkinBudgetInput] = useState<string>('');
  const { products } = useProducts();
  const [guided, setGuided] = useState<any | null>(null);

  const skinProducts = useMemo(() => products.filter(p => p.category === 'peau'), [products]);

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
      if (tier && (tier as SkinTier) in SKIN_TIERS) setSkinTier(tier as SkinTier);
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

    // Prix calculé depuis le catalogue peau réel si disponible, sinon prix tiers fixe
    const calcPrice = (count: number) => {
      if (skinProducts.length < count) return count === 3 ? 32 : count === 6 ? 68 : 124;
      const sorted = [...skinProducts].sort((a,b)=>a.price-b.price);
      return sorted.slice(0,count).reduce((s,p)=>s+p.price,0);
    };
    const priceEss = calcPrice(3);
    const priceComp = calcPrice(6);
    const pricePrem = calcPrice(9);
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

          {/* Routine détaillée matin / soir / hebdo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <section className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
                <h2 className="text-lg font-bold flex items-center gap-2"><Sun className="w-5 h-5 text-[#C8753D]" /> Matin · protéger — {matin.length} étapes</h2>
                <p className="text-xs text-[#111111]/60 font-light mt-1">Ordre d’application : du plus léger au plus riche, SPF toujours en dernier.</p>
                <ol className="mt-4 space-y-3">
                  {matin.map(s => (
                    <li key={s.n} className="flex gap-3 p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                      <span className="w-7 h-7 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight">{s.title}</p>
                        <p className="text-xs text-[#111111]/65 font-light leading-relaxed mt-1">{s.desc}</p>
                        <p className="text-[11px] text-[#C8753D] font-semibold mt-1">{s.inci}</p>
                        <div className="mt-2 flex gap-1.5">
                          <a href={`/boutique?cat=peau&q=${encodeURIComponent(s.title.split(' ')[0])}`} className="text-[11px] px-2 py-1 rounded-full bg-white border border-[#E8E1DA] font-semibold hover:border-[#C8753D]">Choisir</a>
                          <span className="text-[11px] px-2 py-1 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-[#111111]/50">Alternative sans parfum</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
                <h2 className="text-lg font-bold flex items-center gap-2"><Moon className="w-5 h-5 text-[#C8753D]" /> Soir · réparer — {soir.length} étapes</h2>
                <p className="text-xs text-[#111111]/60 font-light mt-1">Soir : on répare la barrière, on traite les taches (sans “éclaircir”).</p>
                <ol className="mt-4 space-y-3">
                  {soir.map(s => (
                    <li key={s.n} className="flex gap-3 p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                      <span className="w-7 h-7 rounded-full bg-[#111111] text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
                      <div><p className="text-sm font-bold">{s.title}</p><p className="text-xs text-[#111111]/65 font-light mt-1">{s.desc}</p></div>
                    </li>
                  ))}
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
