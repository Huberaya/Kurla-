import React, { useState } from 'react';
import { Sparkles, Sun, Droplets, Heart, Layers, Search, ArrowRight, Star, Shield, Zap, Eye, Smile, Wind, Package, Clock, AlertCircle, BookOpen, FlaskConical } from 'lucide-react';

/**
 * PAGE 1 — KURLA SKIN LANDING /peau
 * 5 sections : hero diagnostic + 15 besoins + recherche + routines + guide
 * Design premium, inclusif (phototypes), même langage que pôle cheveux.
 */

const SKIN_NEEDS = [
  { id: 'hydrater', label: 'Hydrater', desc: 'Repulper, confort', icon: Droplets, color: 'bg-sky-500' },
  { id: 'eclat', label: 'Éclat', desc: 'Teint lumineux', icon: Sparkles, color: 'bg-amber-400' },
  { id: 'taches', label: 'Taches & teint', desc: 'Uniformiser', icon: Sun, color: 'bg-orange-500' },
  { id: 'seche', label: 'Peau sèche', desc: 'Nourrir, apaiser', icon: Heart, color: 'bg-rose-400' },
  { id: 'grasse', label: 'Peau grasse', desc: 'Matifier, réguler', icon: Wind, color: 'bg-emerald-500' },
  { id: 'imperfections', label: 'Imperfections', desc: 'Boutons, pores', icon: Smile, color: 'bg-red-400' },
  { id: 'sensible', label: 'Peau sensible', desc: 'Apaiser, protéger', icon: Shield, color: 'bg-violet-400' },
  { id: 'spf', label: 'Protection solaire', desc: 'SPF sans trace', icon: Sun, color: 'bg-yellow-500' },
  { id: 'anti_age', label: 'Anti-âge', desc: 'Prévenir, raffermir', icon: Clock, color: 'bg-stone-500' },
  { id: 'contour_yeux', label: 'Contour des yeux', desc: 'Cernes, poches', icon: Eye, color: 'bg-indigo-400' },
  { id: 'levres', label: 'Lèvres', desc: 'Hydrater, réparer', icon: Heart, color: 'bg-pink-400' },
  { id: 'corps', label: 'Corps', desc: 'Hydratation, texture', icon: Package, color: 'bg-teal-500' },
  { id: 'cicatrices', label: 'Cicatrices', desc: 'Atténuer, lisser', icon: Layers, color: 'bg-amber-600' },
  { id: 'barriere', label: 'Barrière cutanée', desc: 'Réparer, renforcer', icon: Shield, color: 'bg-green-600' },
  { id: 'ingredient', label: 'Par ingrédient', desc: 'Explorer actifs', icon: FlaskConical, color: 'bg-cyan-500' },
];

const ROUTINE_TIERS = [
  { name: 'Essentielle', price: '32 €', products: 3, steps: 'Nettoyant → Hydratant → SPF', desc: 'Débutants, petits budgets, 2 min', badge: 'Dès 32 €' },
  { name: 'Complète', price: '68 €', products: 6, steps: 'Nettoyant → Tonique → Sérum → Crème → SPF (+ exfoliant 2x/sem)', desc: 'Équilibrée, 5 min', badge: 'Recommandée' },
  { name: 'Premium', price: '124 €', products: 9, steps: 'Double nettoyage → Essence → 2 Sérums → Contour yeux → 2 Crèmes → SPF + masques', desc: 'Passionnés, résultats optimaux', badge: 'Premium' },
];

const GUIDE_ARTICLES = [
  { title: 'Comprendre l’hyperpigmentation post-inflammatoire', read: '6 min', tag: 'Taches', desc: 'Pourquoi les peaux riches en mélanine marquent plus, et comment atténuer sans éclaircir.' },
  { title: 'SPF et peaux foncées : pourquoi c’est essentiel', read: '4 min', tag: 'SPF', desc: 'SPF naturel 13 ≠ protection. Comment choisir sans trace blanche (white cast).' },
  { title: 'Niacinamide : pour qui, pourquoi, comment', read: '5 min', tag: 'Actif', desc: '5% pour uniformiser, 2% pour pores. Tolérance, incompatibilités, routine.' },
];

export const SkinLandingPage: React.FC = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <div className="rounded-3xl bg-gradient-to-br from-[#F8F2EC] via-[#FFFDF9] to-[#FCEFE8] border border-[#E8E1DA] p-8 sm:p-10 lg:p-12 mb-10 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D9A8A4]/15 text-[#C8753D] text-xs font-bold tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5" /> KURLA SKIN — le pôle peau
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif-title font-bold leading-tight mt-4">
                Votre peau, <span className="text-[#C8753D]">comprise</span>.
                <br />Pas diagnostiquée.
              </h1>
              <p className="text-sm sm:text-base text-[#111111]/70 font-light leading-relaxed mt-4 max-w-xl">
                Peau mixte qui brille et tiraille ? Taches post-acné qui restent ? SPF qui laisse des traces blanches ?<br />
                <strong className="font-semibold text-[#111111]">Pas de panique. On va comprendre votre peau ensemble.</strong> 2 minutes, 5 questions, et votre routine adaptée — sans promesse médicale, sans “éclaircir”.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <a href="/peau/diagnostic?mode=express" className="px-6 py-3.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold shadow-md inline-flex items-center gap-2">
                  Diagnostic express (2 min) <ArrowRight className="w-4 h-4" />
                </a>
                <a href="/peau/diagnostic" className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-bold inline-flex items-center gap-2">
                  Diagnostic complet (5 min) <Zap className="w-4 h-4 text-[#C8753D]" />
                </a>
                <a href="/boutique?cat=peau" className="px-6 py-3.5 rounded-full bg-transparent text-[#111111]/70 text-xs font-semibold hover:text-[#C8753D] inline-flex items-center gap-1.5">
                  Explorer le catalogue peau <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-[11px] text-[#111111]/50 mt-3 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> KURLA est un guide beauté, pas un diagnostic médical. En cas de symptôme persistant, consultez un dermatologue.
              </p>
            </div>
            <div className="w-full lg:w-[420px] shrink-0">
              <div className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-[#C8753D] mb-3">Aperçu diagnostic</p>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                    <span className="font-semibold">Type de peau</span><span className="text-[#111111]/60">5 visuels + “je ne sais pas”</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                    <span className="font-semibold">Phototype</span><span className="text-[#111111]/60">palette non stigmatisante</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
                    <span className="font-semibold">Préoccupations (max 3)</span><span className="text-[#111111]/60">cards + icônes</span>
                  </div>
                </div>
                <a href="/peau/diagnostic" className="mt-4 w-full py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> Découvrir mon profil peau
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* QU'EST-CE QUE VOUS VOULEZ AMÉLIORER ? */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif-title font-bold">Qu’est-ce que vous voulez améliorer ?</h2>
              <p className="text-sm text-[#111111]/60 font-light mt-1">Sélectionnez un ou plusieurs besoins — produits, routine et guide adaptés s’affichent.</p>
            </div>
            <a href="/boutique?cat=peau" className="text-xs font-bold text-[#C8753D] hover:underline inline-flex items-center gap-1">Tout le catalogue peau <ArrowRight className="w-3.5 h-3.5" /></a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SKIN_NEEDS.map(n => {
              const Icon = n.icon;
              return (
                <a key={n.id} href={`/boutique?cat=peau&need=${n.id}`} className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] hover:shadow-sm transition-all group text-left">
                  <div className={`w-10 h-10 rounded-xl ${n.color} text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold leading-tight">{n.label}</p>
                  <p className="text-xs text-[#111111]/60 font-light">{n.desc}</p>
                </a>
              );
            })}
          </div>
        </div>

        {/* BARRE DE RECHERCHE PEAU */}
        <div className="mb-10 rounded-3xl bg-[#111111] text-white p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Search className="w-5 h-5 text-[#D9A8A4]" /> Recherche par problème ou actif</h3>
            <p className="text-xs text-white/70 font-light mt-1">Tapez “taches”, “niacinamide”, “peau grasse”, “sans trace blanche”…</p>
          </div>
          <div className="w-full lg:w-[520px] flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111111]/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && search.trim()) window.location.href = `/boutique?cat=peau&q=${encodeURIComponent(search.trim())}`; }}
                placeholder="Ex: taches, niacinamide, SPF sans trace blanche..."
                className="w-full pl-10 pr-4 py-3.5 rounded-full bg-white text-[#111111] text-sm placeholder:text-[#111111]/40 focus:outline-none focus:ring-2 focus:ring-[#C8753D]"
              />
            </div>
            <a href={search.trim() ? `/boutique?cat=peau&q=${encodeURIComponent(search.trim())}` : `/boutique?cat=peau`} className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-bold shrink-0">Rechercher</a>
          </div>
        </div>

        {/* ROUTINES TYPES */}
        <div className="mb-10">
          <h2 className="text-2xl font-serif-title font-bold mb-2">Votre routine, à votre budget</h2>
          <p className="text-sm text-[#111111]/60 font-light mb-6">Matin : protéger. Soir : réparer. KURLA calcule le prix total et propose une alternative à chaque étape.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROUTINE_TIERS.map(t => (
              <div key={t.name} className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold">{t.name}</h3>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-[#C8753D] text-white font-bold">{t.badge}</span>
                </div>
                <p className="text-2xl font-bold">{t.price} <span className="text-xs font-normal text-[#111111]/60">/ {t.products} produits</span></p>
                <p className="text-xs text-[#111111]/70 font-light mt-2 flex-1">{t.desc}</p>
                <p className="text-[11px] text-[#111111]/60 mt-3 p-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] font-mono leading-relaxed">{t.steps}</p>
                <a href="/peau/routine" className="mt-4 w-full py-3 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold text-center">Construire ma routine {t.name.toLowerCase()}</a>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <p className="text-xs text-[#111111]/70"><strong className="text-[#111111]">Budget ?</strong> Dites “routine à 40 €” — KURLA sélectionne le meilleur rapport qualité/avis dans l’enveloppe.</p>
            <a href="/peau/routine?budget=40" className="px-5 py-2.5 rounded-full bg-white border border-[#E8E1DA] hover:border-[#C8753D] text-xs font-bold shrink-0">Routine à 40 € →</a>
          </div>
        </div>

        {/* GUIDE DE LA PEAU */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif-title font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#C8753D]" /> Le guide de la peau</h2>
            <a href="/guides/ingredients" className="text-xs font-bold text-[#C8753D] hover:underline">Tout le guide →</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GUIDE_ARTICLES.map(a => (
              <a key={a.title} href="/guides/ingredients" className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] p-6 hover:border-[#C8753D] hover:shadow-sm transition-all">
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] font-bold text-[#C8753D]">{a.tag} · {a.read}</span>
                <h3 className="text-sm font-bold leading-tight mt-3">{a.title}</h3>
                <p className="text-xs text-[#111111]/60 font-light mt-2 leading-relaxed">{a.desc}</p>
                <span className="text-xs font-bold text-[#C8753D] mt-3 inline-flex items-center gap-1">Lire <ArrowRight className="w-3 h-3" /></span>
              </a>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <p className="font-bold flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#C8753D]" /> Peaux riches en mélanine</p>
              <p className="text-[#111111]/60 font-light mt-1">HPI, SPF sans trace blanche, teint uniforme — sans “éclaircir”.</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <p className="font-bold flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-[#C8753D]" /> Par actif</p>
              <p className="text-[#111111]/60 font-light mt-1">Niacinamide, rétinol, AHA/BHA, vitamine C — pour qui, comment.</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
              <p className="font-bold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#C8753D]" /> Barrière cutanée</p>
              <p className="text-[#111111]/60 font-light mt-1">Céramides, squalane — réparer, renforcer, protéger.</p>
            </div>
          </div>
        </div>

        {/* CTA FIN */}
        <div className="rounded-3xl bg-gradient-to-br from-[#111111] to-[#2a1a1a] text-white p-8 sm:p-10 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Prête à comprendre votre peau ?</h3>
            <p className="text-sm text-white/70 font-light mt-1">Diagnostic express 2 min ou complet 5 min. Sauvegardé dans “Ma peau”, modifiable à tout moment.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <a href="/peau/diagnostic?mode=express" className="px-6 py-3.5 rounded-full bg-white text-[#111111] text-xs font-bold">Express →</a>
            <a href="/peau/diagnostic" className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-bold">Complet →</a>
          </div>
        </div>

      </div>
    </div>
  );
};
