import React, { useMemo, useState } from 'react';
import { BookOpen, ShoppingBag, ArrowRight, Clock, Package, Sparkles, MessageSquare, Lightbulb } from 'lucide-react';
import { KURLA_TOOLS, GESTURES, HAIR_TYPE_KITS, TOOL_BY_ID } from '../lib/knowledge/tools';

import { useProducts } from '../services/productService';

/**
 * LE GUIDE DES OUTILS — décision produit : la boutique est l'unique lieu
 * d'achat ; cette page enseigne le geste (démêler, laver, sécher, protéger…)
 * et renvoie chaque outil vers SA fiche boutique. Elle ajoute deux couches
 * différenciantes :
 *   1. « Votre panoplie » : les meilleurs outils par type de cheveux (3A→4C,
 *      locs, courts), synthèse des usages de la communauté afro.
 *   2. L'assistante IA ouvrable depuis chaque geste avec une question
 *      pré-remplie (évènement `kurla:ask-assistant`).
 */

const askAssistant = (question: string) => {
  try {
    window.dispatchEvent(new CustomEvent('kurla:ask-assistant', { detail: { question } }));
  } catch { /* noop */ }
};

export const ToolsPage: React.FC = () => {
  const { products } = useProducts();
  const [activeKit, setActiveKit] = useState(HAIR_TYPE_KITS[0].id);

  const productBySlug = useMemo(() => {
    const map = new Map<string, any>();
    for (const product of products || []) {
      if (product?.slug) map.set(product.slug, product);
    }
    return map;
  }, [products]);

  const kitOutils = productBySlug.get('preco-kit-outils-wash-day-essentiels');
  const currentKit = HAIR_TYPE_KITS.find(k => k.id === activeKit) || HAIR_TYPE_KITS[0];

  const toolCardMini = (toolId: string, badge?: 'essentiel' | 'upgrade') => {
    const tool = TOOL_BY_ID.get(toolId);
    if (!tool) return null;
    const product = tool.productSlug ? productBySlug.get(tool.productSlug) : undefined;
    const image = product?.image || tool.image;
    return (
      <a
        key={toolId}
        href={`#${tool.id}`}
        className="group flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#E8E1DA] hover:border-[#C8753D] transition-all"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F8F2EC] shrink-0">
          <img loading="lazy" decoding="async" src={image} alt={tool.name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {badge === 'essentiel' && (
              <span className="px-1.5 py-0.5 rounded bg-[#2E7D5B]/10 text-[#2E7D5B] text-[9px] font-bold uppercase tracking-wide shrink-0">Essentiel</span>
            )}
            {badge === 'upgrade' && (
              <span className="px-1.5 py-0.5 rounded bg-[#C8753D]/10 text-[#C8753D] text-[9px] font-bold uppercase tracking-wide shrink-0">Upgrade</span>
            )}
          </div>
          <p className="text-xs font-semibold text-[#111111] truncate group-hover:text-[#C8753D] transition-colors">{tool.name}</p>
          {product && (
            <p className="text-[11px] text-[#111111]/60">{Number(product.price).toFixed(2)} €</p>
          )}
        </div>
      </a>
    );
  };

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-3">
            <BookOpen className="w-4 h-4" /> Le Guide des Gestes & Outils
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-4">
            Le bon outil, le bon geste,<br className="hidden sm:block" /> pour votre texture
          </h1>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            Un bon produit ne fonctionne pas sans le bon geste. Ce guide rassemble les pratiques éprouvées de la
            communauté des cheveux texturés — du démêlage à la protection de nuit — et relie chaque outil à sa fiche
            boutique. Une seule vérité, zéro doublon.
          </p>
        </div>

        {/* ── Nav ancres gestes ──────────────────────────────────── */}
        <nav className="flex gap-2 overflow-x-auto pb-2 mb-12 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center" aria-label="Sections du guide">
          {GESTURES.map(g => (
            <a
              key={g.id}
              href={`#geste-${g.id}`}
              className="px-4 py-2 rounded-full bg-white border border-[#E8E1DA] hover:border-[#C8753D] hover:text-[#C8753D] text-xs font-semibold whitespace-nowrap transition-all"
            >
              {g.title}
            </a>
          ))}
        </nav>

        {/* ── Votre panoplie par type de cheveux ─────────────────── */}
        <section className="mb-16 rounded-3xl bg-[#111111] text-[#FFF7EF] p-6 sm:p-10 scroll-mt-28" id="panoplie" aria-labelledby="panoplie-title">
          <div className="flex items-center gap-2 text-[#D49A63] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" /> Recommandations par texture
          </div>
          <h2 id="panoplie-title" className="text-2xl sm:text-3xl font-serif-title font-bold mb-6">
            Votre panoplie idéale, selon votre type de cheveux
          </h2>

          {/* Tabs types de cheveux */}
          <div className="flex gap-2 flex-wrap mb-6" role="tablist" aria-label="Types de cheveux">
            {HAIR_TYPE_KITS.map(kit => (
              <button
                key={kit.id}
                role="tab"
                aria-selected={kit.id === activeKit}
                onClick={() => setActiveKit(kit.id)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                  kit.id === activeKit
                    ? 'bg-[#C8753D] text-white shadow-md'
                    : 'bg-white/10 text-[#FFF7EF]/80 hover:bg-white/20'
                }`}
              >
                <span className="mr-1.5" aria-hidden="true">{kit.emoji}</span>{kit.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <h3 className="text-lg font-serif-title font-bold text-[#D49A63] mb-2">{currentKit.headline}</h3>
              <p className="text-xs text-[#FFF7EF]/75 font-light leading-relaxed mb-4">{currentKit.advice}</p>
              <button
                onClick={() => askAssistant(`J'ai des cheveux ${currentKit.label}. Quels outils et quelle routine me recommandes-tu ?`)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#D49A63]" /> Affiner avec l’assistante IA
              </button>
            </div>
            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-2.5 content-start">
              {currentKit.essentials.map(id => toolCardMini(id, 'essentiel'))}
              {currentKit.upgrades.map(id => toolCardMini(id, 'upgrade'))}
            </div>
          </div>
        </section>

        {/* ── Sections par geste ─────────────────────────────────── */}
        {GESTURES.map(gesture => {
          const tools = KURLA_TOOLS.filter(t => t.gesture === gesture.id);
          if (tools.length === 0) return null;
          return (
            <section key={gesture.id} id={`geste-${gesture.id}`} className="mb-16 scroll-mt-28" aria-labelledby={`title-${gesture.id}`}>
              <div className="max-w-3xl mb-8">
                <h2 id={`title-${gesture.id}`} className="text-2xl sm:text-3xl font-serif-title font-bold text-[#111111] mb-3">
                  {gesture.title}
                </h2>
                <p className="text-sm text-[#111111]/75 font-light leading-relaxed mb-3">{gesture.intro}</p>
                <button
                  onClick={() => askAssistant(gesture.aiQuestion)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8753D] hover:underline"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> {gesture.aiQuestion}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => {
                  const product = tool.productSlug ? productBySlug.get(tool.productSlug) : undefined;
                  const image = product?.image || tool.image;
                  return (
                    <div key={tool.id} id={tool.id} className="rounded-3xl bg-white border border-[#E8E1DA] overflow-hidden shadow-xs hover:border-[#C8753D] transition-all flex flex-col justify-between group scroll-mt-28">
                      <div>
                        <div className="h-44 overflow-hidden relative bg-[#F8F2EC]">
                          <img loading="lazy" decoding="async" src={image} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {product?.isPreorder && (
                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#2E7D5B] backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                              <Clock className="w-3 h-3" /> Précommande
                            </span>
                          )}
                        </div>

                        <div className="p-5 space-y-3">
                          <h3 className="text-base font-serif-title font-bold text-[#111111]">{tool.name}</h3>

                          <div className="text-xs space-y-1.5">
                            <div>
                              <span className="font-bold text-[#C8753D]">Pour qui : </span>
                              <span className="text-[#111111]/80 font-light">{tool.forWho}</span>
                            </div>
                            <div>
                              <span className="font-bold text-[#111111]">Quand : </span>
                              <span className="text-[#111111]/80 font-light">{tool.whenToUse}</span>
                            </div>
                          </div>

                          <ul className="list-disc list-inside text-xs text-[#111111]/75 space-y-0.5 pt-2 border-t border-[#E8E1DA]/80">
                            {tool.benefits.map((b, idx) => (
                              <li key={idx}>{b}</li>
                            ))}
                          </ul>

                          {tool.communityTip && (
                            <div className="p-3 rounded-xl bg-[#2E7D5B]/5 border border-[#2E7D5B]/20 text-[#1d5c41] text-[11px] flex gap-2">
                              <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span><span className="font-bold">Astuce de la communauté : </span>{tool.communityTip}</span>
                            </div>
                          )}

                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                            <span className="font-bold">⚠️ Erreur à éviter : </span>
                            <span>{tool.errorsToAvoid}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 pt-0">
                        {product ? (
                          <a
                            href={`/produit/${product.slug}`}
                            className="w-full py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Voir ce modèle — {Number(product.price).toFixed(2)} €
                          </a>
                        ) : (
                          <a
                            href="/boutique?cat=accessoires"
                            className="w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> Voir les modèles en boutique
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Kit outils : tout le matériel en une fois ──────────── */}
        <div className="mt-4 rounded-3xl bg-[#111111] text-[#FFF7EF] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C8753D]/20 text-[#D49A63] flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-serif-title font-bold mb-1">Tout le matériel du wash day, en un kit</h2>
              <p className="text-xs text-[#FFF7EF]/70 font-light leading-relaxed max-w-xl">
                Peigne démêloir, brosses, pinces, vaporisateur, bonnet satin… les essentiels de ce guide réunis
                {kitOutils ? ` à ${Number(kitOutils.price).toFixed(2)} € au lieu de ${Number(kitOutils.originalPrice || kitOutils.price).toFixed(2)} € à l'unité.` : ' dans le kit Outils wash day.'}
              </p>
            </div>
          </div>
          <a
            href={kitOutils ? `/produit/${kitOutils.slug}` : '/boutique?cat=kits'}
            className="px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            Découvrir le kit <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* ── Lien retour boutique ───────────────────────────────── */}
        <div className="text-center mt-10">
          <a href="/boutique?cat=accessoires" className="text-xs font-semibold text-[#C8753D] hover:underline inline-flex items-center gap-1.5">
            Voir tous les accessoires en boutique <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
