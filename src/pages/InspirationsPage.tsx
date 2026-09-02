import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock, MessageSquare, ShoppingBag, Sparkles, X, CalendarDays, HeartHandshake } from 'lucide-react';
import {
  INSPIRATIONS,
  INSPIRATION_PUBLIC_LABELS,
  INSPIRATION_STYLE_LABELS,
  type Inspiration,
  type InspirationPublic,
  type InspirationStyle,
} from '../data/inspirations';
import { useProducts } from '../services/productService';

/**
 * GALERIE D'INSPIRATIONS COIFFURES.
 *
 * Une page VISUELLE d'abord : coiffures, coupes, tresses, locs — pour les
 * femmes, les hommes et les enfants. Chaque style s'ouvre sur sa réalité :
 * temps de pose, durée de vie, gestes d'entretien, produits utiles, et la
 * question à poser à l'assistante IA (évènement `kurla:ask-assistant`).
 *
 * Décision produit : cette galerie ne vend pas la coiffure (nous ne sommes
 * pas un salon) — elle relie l'envie au bon entretien et aux bons produits,
 * et renvoie vers l'annuaire des professionnels pour la réalisation.
 */

const askAssistant = (question: string) => {
  try {
    window.dispatchEvent(new CustomEvent('kurla:ask-assistant', { detail: { question } }));
  } catch { /* noop */ }
};

const PUBLICS: Array<InspirationPublic | 'tous'> = ['tous', 'femme', 'homme', 'enfant'];
const STYLES: Array<InspirationStyle | 'tous'> = ['tous', 'tresses', 'twists', 'locs', 'coupes', 'afro', 'protectif'];

export const InspirationsPage: React.FC = () => {
  const { products } = useProducts();
  const [publicFilter, setPublicFilter] = useState<InspirationPublic | 'tous'>('tous');
  const [styleFilter, setStyleFilter] = useState<InspirationStyle | 'tous'>('tous');
  const [selected, setSelected] = useState<Inspiration | null>(null);

  const productBySlug = useMemo(() => {
    const map = new Map<string, any>();
    for (const product of products || []) {
      if (product?.slug) map.set(product.slug, product);
    }
    return map;
  }, [products]);

  const filtered = useMemo(
    () => INSPIRATIONS.filter(item =>
      (publicFilter === 'tous' || item.publics.includes(publicFilter))
      && (styleFilter === 'tous' || item.styles.includes(styleFilter))),
    [publicFilter, styleFilter]
  );

  const chip = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
      active
        ? 'bg-[#C8753D] text-white border-[#C8753D]'
        : 'bg-white text-[#5A4638] border-[#E8E1DA] hover:border-[#C8753D]/50'
    }`;

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Galerie d’inspirations
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Trouvez votre prochaine coiffure</h1>
          <p className="text-[#5A4638] max-w-2xl text-sm sm:text-base">
            Tresses, locs, twists, coupes, afro libre — pour les femmes, les hommes et les enfants.
            Chaque style s’ouvre sur sa réalité : temps de pose, durée de vie, gestes d’entretien
            et produits vraiment utiles.
          </p>
        </div>

        {/* Filtres */}
        <div className="space-y-3 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8A7364] mr-1">Pour qui</span>
            {PUBLICS.map(p => (
              <button key={p} onClick={() => setPublicFilter(p)} className={chip(publicFilter === p)}>
                {p === 'tous' ? 'Tout le monde' : INSPIRATION_PUBLIC_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-[#8A7364] mr-1">Style</span>
            {STYLES.map(s => (
              <button key={s} onClick={() => setStyleFilter(s)} className={chip(styleFilter === s)}>
                {s === 'tous' ? 'Tous les styles' : INSPIRATION_STYLE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Grille */}
        {filtered.length === 0 ? (
          <p className="text-sm text-[#5A4638] py-12 text-center">
            Aucun style ne correspond à ce croisement de filtres — essayez un autre style ou « Tout le monde ».
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className="group relative rounded-2xl overflow-hidden bg-[#F8F2EC] border border-[#E8E1DA] text-left focus:outline-none focus:ring-2 focus:ring-[#C8753D]"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={item.image}
                    alt={`Coiffure : ${item.title}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 sm:p-4 pt-10">
                  <p className="text-white font-bold text-sm sm:text-base leading-tight">{item.title}</p>
                  <p className="text-white/75 text-[11px] mt-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 shrink-0" /> {item.wearTime}
                  </p>
                </div>
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  {item.publics.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-white/90 text-[#5A4638] text-[10px] font-bold">
                      {INSPIRATION_PUBLIC_LABELS[p]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Bandeau pro */}
        <div className="mt-12 rounded-3xl bg-[#1A0F0A] text-[#FFF7EF] p-8 sm:p-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#D49A63]" /> Prête à passer chez le coiffeur ?
            </h2>
            <p className="text-sm text-[#FFF7EF]/70 mt-2 max-w-xl">
              Nos coiffeuses, tresseuses et locticiennes partenaires signent une charte stricte :
              pas de traction excessive à la racine, pas de jugement de la texture naturelle.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/professionnels" className="px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#D49A63] text-white text-sm font-bold flex items-center gap-2">
              Trouver un salon <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => askAssistant('Aide-moi à choisir ma prochaine coiffure protectrice selon mes cheveux et mon budget.')}
              className="px-5 py-3 rounded-xl border border-[#FFF7EF]/25 hover:border-[#D49A63] text-sm font-bold flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Demander à l’assistante
            </button>
          </div>
        </div>

        {/* Note visuels */}
        <p className="mt-6 text-[11px] text-[#8A7364]">
          Visuels d’inspiration issus du web public (éditoriaux coiffure, banques d’images) — en attente
          de nos propres shootings et des photos de clientes avec accord.
        </p>
      </div>

      {/* Fiche détail */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#FFFDF9] w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="relative aspect-[4/5] sm:aspect-auto sm:min-h-full">
                <img src={selected.image} alt={`Coiffure : ${selected.title}`} className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="p-6 sm:p-7 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selected.publics.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-[10px] font-bold">{INSPIRATION_PUBLIC_LABELS[p]}</span>
                      ))}
                      {selected.styles.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-[#F8F2EC] text-[#5A4638] text-[10px] font-bold">{INSPIRATION_STYLE_LABELS[s]}</span>
                      ))}
                    </div>
                    <h2 className="text-xl font-bold leading-tight">{selected.title}</h2>
                  </div>
                  <button onClick={() => setSelected(null)} aria-label="Fermer" className="p-2 rounded-full hover:bg-[#F8F2EC] shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-[#5A4638]">{selected.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#F8F2EC] p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A7364] flex items-center gap-1"><Clock className="w-3 h-3" /> Pose</p>
                    <p className="text-xs font-semibold mt-1">{selected.poseTime}</p>
                  </div>
                  <div className="rounded-xl bg-[#F8F2EC] p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[#8A7364] flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Se porte</p>
                    <p className="text-xs font-semibold mt-1">{selected.wearTime}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-[#C8753D] mb-2">L’entretien qui compte</p>
                  <ul className="space-y-1.5">
                    {selected.care.map((tip, index) => (
                      <li key={index} className="text-xs text-[#5A4638] flex gap-2">
                        <span className="text-[#C8753D] font-bold shrink-0">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {selected.productSlugs.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-bold text-[#C8753D] mb-2 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Pour ce style, en boutique
                    </p>
                    <div className="space-y-2">
                      {selected.productSlugs.map(slug => {
                        const product = productBySlug.get(slug);
                        if (!product) return null;
                        return (
                          <a
                            key={slug}
                            href={`/produit/${product.slug}`}
                            className="flex items-center gap-3 p-2 rounded-xl border border-[#E8E1DA] hover:border-[#C8753D]/60 transition"
                          >
                            {product.image && (
                              <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            )}
                            <span className="text-xs font-semibold flex-1 leading-tight">{product.name}</span>
                            <span className="text-xs font-bold text-[#C8753D] shrink-0">
                              {Number(product.price || 0).toFixed(2)} €
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { askAssistant(selected.aiQuestion); setSelected(null); }}
                  className="w-full px-4 py-3 rounded-xl bg-[#C8753D] hover:bg-[#D49A63] text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Poser la question à l’assistante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
