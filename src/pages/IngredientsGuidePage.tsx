import React, { useMemo, useState } from 'react';
import { BookOpen, Sparkles, CheckCircle2, FlaskConical, Heart, Droplets, Layers, Sun, Shield, AlertCircle, ArrowRight, Search } from 'lucide-react';
import { KURLA_INGREDIENTS } from '../lib/knowledge/products';
import { SKIN_INGREDIENTS_15 } from '../lib/skinIngredients15';

const EVIDENCE_BADGE: Record<string, { label: string; cls: string }> = {
  A: { label: 'Niveau A · preuve forte', cls: 'bg-emerald-600 text-white' },
  B: { label: 'Niveau B · preuve correcte', cls: 'bg-sky-600 text-white' },
  C: { label: 'Niveau C · limitée', cls: 'bg-amber-500 text-white' },
};

export const IngredientsGuidePage: React.FC = () => {
  const [tab, setTab] = useState<'peau' | 'cheveux'>('peau');
  const [search, setSearch] = useState('');

  const cheveux = useMemo(() => KURLA_INGREDIENTS.filter(i => i.category !== 'skincare'), [KURLA_INGREDIENTS]);
  const peauStatic = useMemo(() => KURLA_INGREDIENTS.filter(i => i.category === 'skincare'), [KURLA_INGREDIENTS]);

  const filteredSkin15 = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SKIN_INGREDIENTS_15;
    return SKIN_INGREDIENTS_15.filter(f =>
      f.inci.toLowerCase().includes(q) ||
      f.commonNames.join(' ').toLowerCase().includes(q) ||
      f.functions.join(' ').toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredCheveux = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cheveux;
    return cheveux.filter(i => `${i.name} ${i.benefits.join(' ')} ${i.recommendedFor}`.toLowerCase().includes(q));
  }, [search, cheveux]);

  return (
    <div className="pt-28 pb-24 bg-kurla-ivory text-kurla-carbon min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kurla-copper/10 text-kurla-copper text-xs font-semibold mb-3">
            <BookOpen className="w-4 h-4" /> Encyclopédie Ingrédients KURLA · 15 fiches peau
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-kurla-carbon mb-4">
            Comprendre les Actifs,<br /><span className="text-kurla-copper">sans promesse.</span>
          </h1>
          <p className="text-sm sm:text-base text-kurla-carbon/75 font-light leading-relaxed">
            Transparence totale : INCI CosIng, fonctions, preuve <strong className="font-semibold text-kurla-carbon">A/B/C</strong> et transposabilité <strong className="font-semibold text-kurla-carbon">phototypes V–VI</strong>. Uniformiser, jamais éclaircir. 15 fiches peau + 5 cheveux.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
            <span className="px-3 py-1.5 rounded-full bg-kurla-carbon text-white font-bold">15 fiches peau vérifiées</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-kurla-stone">Graphe CosIng → INCI normalisé</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-kurla-stone">Boutique filtrée par actif → 1 clic</span>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6 p-4 rounded-3xl bg-kurla-sand border border-kurla-stone">
          <div className="flex p-1 rounded-full bg-white border border-kurla-stone">
            <button onClick={() => setTab('peau')} className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${tab === 'peau' ? 'bg-kurla-carbon text-white' : 'text-kurla-carbon/70 hover:text-kurla-carbon'}`}>
              <Sun className="w-3.5 h-3.5" /> Peau · 15 actifs ({filteredSkin15.length})
            </button>
            <button onClick={() => setTab('cheveux')} className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${tab === 'cheveux' ? 'bg-kurla-carbon text-white' : 'text-kurla-carbon/70 hover:text-kurla-carbon'}`}>
              <Droplets className="w-3.5 h-3.5" /> Cheveux · 5 soins ({filteredCheveux.length})
            </button>
          </div>
          <div className="relative w-full sm:max-w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-kurla-carbon/40" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'peau' ? 'Rechercher niacinamide, céramides, rétinol…' : 'Rechercher karité, aloe…'} className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-kurla-stone text-xs focus:outline-none focus:border-kurla-copper" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-kurla-carbon/50">Effacer</button>}
          </div>
        </div>

        {/* Peau — 15 fiches */}
        {tab === 'peau' && (
          <>
            <div className="mb-4 p-4 rounded-2xl bg-kurla-carbon text-white flex flex-col sm:flex-row gap-3 items-center justify-between">
              <p className="text-xs font-light"><strong className="font-bold text-kurla-amber">Phototypes V–VI ?</strong> 9 actifs sur 15 sont “V–VI safe” (sans trace blanche, sans dépigmentant). Filtre boutique <a href="/boutique?cat=peau&phototype=VI&fini=naturel" className="underline text-kurla-amber">Peau · phototype VI</a></p>
              <a href="/boutique?cat=peau" className="px-4 py-2 rounded-full bg-kurla-copper text-white text-xs font-bold shrink-0">Boutique peau filtrée par actif →</a>
            </div>

            <div className="space-y-4">
              {filteredSkin15.map(fiche => {
                const evidence = EVIDENCE_BADGE[fiche.evidenceLevel] || EVIDENCE_BADGE.B;
                const vviSafe = fiche.toneScope.includes('V') || fiche.toneScope.includes('VI');
                return (
                  <div key={fiche.id} className="p-6 rounded-3xl bg-white border border-kurla-stone shadow-sm hover:border-kurla-copper/30 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex flex-wrap gap-1.5 items-center mb-1">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${evidence.cls}`}>{evidence.label}</span>
                          {vviSafe && <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">V–VI safe · {fiche.toneScope.join('/')}</span>}
                          <span className="px-2 py-1 rounded-full bg-kurla-sand border border-kurla-stone text-[10px] font-bold">{fiche.family}</span>
                          {fiche.maxEuPercent != null && <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">UE max {fiche.maxEuPercent}%</span>}
                        </div>
                        <h3 className="text-lg font-bold leading-tight">
                          {fiche.inci} <span className="text-sm font-normal text-kurla-carbon/60">· {fiche.commonNames.join(' · ')}</span>
                        </h3>
                        <p className="text-xs text-kurla-carbon/50 mt-0.5">INCI normalisé : <code className="px-1 py-0.5 rounded bg-kurla-sand border border-kurla-stone text-[11px]">{fiche.inciNormalized}</code> · {fiche.origin} · comédogénicité {fiche.comedogenicity ?? '—'}/5</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <a href={`/ingredient/${fiche.id}`} className="px-3 py-1.5 rounded-full bg-kurla-sand border border-kurla-stone text-[11px] font-bold hover:border-kurla-copper">Fiche CosIng →</a>
                        <a href={`/boutique?cat=peau&actif=${fiche.boutiqueActif}`} className="px-3 py-1.5 rounded-full bg-kurla-carbon text-white text-[11px] font-bold hover:bg-black">Boutique {fiche.boutiqueActif} →</a>
                      </div>
                    </div>

                    <p className="text-sm text-kurla-carbon/75 leading-relaxed">{fiche.description}</p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone">
                        <p className="text-[10px] uppercase font-bold text-kurla-copper">Fonctions CosIng</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fiche.functions.map(fn => <span key={fn} className="px-2 py-1 rounded-full bg-white border border-kurla-stone text-[11px] font-semibold">{fn}</span>)}
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-kurla-sand border border-kurla-stone">
                        <p className="text-[10px] uppercase font-bold text-kurla-copper">Preuve</p>
                        <p className="font-semibold mt-1 text-kurla-carbon leading-snug">{fiche.evidenceClaim}</p>
                        <p className="text-[11px] text-kurla-carbon/50 mt-1">Niveau {fiche.evidenceLevel} · tone {fiche.toneScope.join('/')} · {fiche.origin}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white border border-kurla-stone">
                        <p className="text-[10px] uppercase font-bold text-kurla-copper">Routine & garde</p>
                        <p className="font-semibold mt-1">{fiche.routineStep} · {fiche.boutiqueActif}</p>
                        <p className="text-[11px] text-kurla-carbon/65 mt-1 leading-relaxed">{fiche.garde}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {fiche.peauConcern.map(c => <span key={c} className="px-2 py-1 rounded-full bg-kurla-ivory border border-kurla-stone text-[11px] font-semibold text-kurla-carbon/70">{c}</span>)}
                      <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Uniformiser, jamais éclaircir</span>
                    </div>

                    <div className="mt-3 flex gap-2 text-[11px]">
                      <a href={`/ingredient/${fiche.id}`} className="text-kurla-copper font-bold hover:underline inline-flex items-center gap-1">CosIng & restrictions UE <ArrowRight className="w-3 h-3" /></a>
                      <span className="text-kurla-carbon/20">·</span>
                      <a href={`/boutique?cat=peau&q=${encodeURIComponent(fiche.inci.split(' ')[0])}`} className="text-kurla-carbon/60 hover:underline">Produits avec {fiche.inci.split(' ')[0]}</a>
                    </div>
                  </div>
                );
              })}
              {filteredSkin15.length === 0 && (
                <div className="p-8 rounded-3xl bg-kurla-sand border border-kurla-stone text-center text-sm text-kurla-carbon/60">Aucun actif peau ne correspond à “{search}”.</div>
              )}
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs leading-relaxed text-amber-900 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span><strong>Garde mélanine :</strong> Aucun actif ci-dessus n’“éclaircit” la peau. Ils visent la barrière, l’HPI post-inflammatoire et la protection solaire — avec SPF le matin comme pilier. En cas de lésion, douleur ou aggravation → avis dermatologique.</span>
            </div>
          </>
        )}

        {/* Cheveux — 5 soins */}
        {tab === 'cheveux' && (
          <div className="space-y-4">
            {filteredCheveux.map((ing, idx) => (
              <div key={idx} className="p-6 sm:p-8 rounded-3xl bg-kurla-sand border border-kurla-stone shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-kurla-copper text-white text-[10px] font-bold uppercase tracking-wider">{ing.category}</span>
                    <span className="text-xs text-kurla-carbon/50 font-medium">Origine : {ing.origin}</span>
                  </div>
                  <h3 className="text-xl font-serif-title font-bold text-kurla-carbon">{ing.name}</h3>
                  <p className="text-xs text-kurla-carbon/70 font-light"><strong className="text-kurla-carbon font-semibold">Recommandé pour : </strong>{ing.recommendedFor}</p>
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-kurla-copper block mb-1">Bénéfices :</span>
                    <div className="flex flex-wrap gap-2">
                      {ing.benefits.map((b, bIdx) => (
                        <span key={bIdx} className="px-3 py-1 rounded-xl bg-kurla-ivory border border-kurla-stone text-xs font-medium text-kurla-carbon flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredCheveux.length === 0 && <div className="p-8 rounded-3xl bg-kurla-sand border border-kurla-stone text-center text-sm text-kurla-carbon/60">Aucun soin cheveux ne correspond à “{search}”.</div>}
            <div className="mt-2 text-center">
              <a href="/guides/ingredients" className="text-xs text-kurla-copper font-bold hover:underline">→ Voir aussi le graphe CosIng (INCI normalisé, niveaux A–D)</a>
            </div>
          </div>
        )}

        {/* Cross-links peau */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <a href="/peau" className="p-4 rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper"><p className="font-bold flex items-center gap-1.5"><Layers className="w-4 h-4 text-kurla-copper" /> Pôle Peau</p><p className="text-kurla-carbon/60 mt-1">Diagnostic + 15 besoins + routine matin/soir.</p></a>
          <a href="/boutique?cat=peau" className="p-4 rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper"><p className="font-bold flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-kurla-copper" /> Boutique filtrée par actif</p><p className="text-kurla-carbon/60 mt-1">Niacinamide, céramides, rétinol…</p></a>
          <a href="/peau/journal" className="p-4 rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper"><p className="font-bold flex items-center gap-1.5"><Heart className="w-4 h-4 text-kurla-copper" /> Journal peau</p><p className="text-kurla-carbon/60 mt-1">J+0 / J+7 / J+30 + photo &lt;2Mo.</p></a>
        </div>
      </div>
    </div>
  );
};
