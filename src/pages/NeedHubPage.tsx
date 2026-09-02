import React, { useMemo } from 'react';
import {
  Droplets, Feather, Sparkles, Scissors, Shield, User, Sun, Heart,
  Award, Baby, Lock, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, Lightbulb, Stethoscope, ShoppingBag, Clock, Package, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useProducts } from '../services/productService';
import { NeedContent, NEEDS_HUB } from '../lib/needsHub';

const ICONS: Record<string, React.ElementType> = {
  droplet: Droplets, feather: Feather, sparkles: Sparkles, scissors: Scissors,
  shield: Shield, user: User, sun: Sun, heart: Heart, badge: Award,
  baby: Baby, lock: Lock,
};

interface NeedHubPageProps {
  need: string;
  onAddToCart: (product: Product) => void;
}

export const NeedHubPage: React.FC<NeedHubPageProps> = ({ need, onAddToCart }) => {
  const { products, loading } = useProducts();
  const content = useMemo(
    () => NEEDS_HUB.find((n) => n.homeSlug === need || n.id === need),
    [need]
  );

  // Produits recommandés : on résout les ids `launch-pXX` du catalogue réel.
  const recommended = useMemo(() => {
    if (!content) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return content.productIds
      .map((pid) => byId.get(`launch-${pid}`))
      .filter((p): p is Product => Boolean(p));
  }, [content, products]);

  if (!content) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#FFFDF9] text-[#111111]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-serif-title font-bold mb-3">Besoin introuvable</h1>
          <p className="text-sm text-[#111111]/70 mb-6">Ce besoin n’existe pas ou a été déplacé.</p>
          <a href="/boutique" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8753D] text-white text-sm font-semibold">
            Retour à la boutique <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const Icon = ICONS[content.icon] || Sparkles;
  const relatedNeeds = NEEDS_HUB.filter((n) => n.domain === content.domain && n.id !== content.id).slice(0, 3);

  return (
    <div className="min-h-screen pt-28 pb-24 bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Fil d'Ariane */}
        <a href="/" className="inline-flex items-center gap-2 text-xs text-[#111111]/60 hover:text-[#C8753D] mb-6">
          <ArrowLeft className="w-4 h-4" /> Accueil
        </a>

        {/* En-tête */}
        <header className="rounded-3xl bg-gradient-to-br from-[#1A0F0A] to-[#3A2218] text-white p-8 sm:p-12 mb-10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#C8753D]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#D49A63] text-[11px] font-semibold uppercase tracking-wider mb-5">
              <Icon className="w-4 h-4" /> {content.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold mb-4 leading-tight">{content.title}</h1>
            <p className="text-base sm:text-lg text-[#FFF7EF]/90 font-light max-w-2xl leading-relaxed">{content.headline}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              {content.comingSoon ? (
                <a href={content.primaryCta?.href || '/diagnostic/peau'} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold shadow-lg">
                  {content.primaryCta?.label || 'Faire le diagnostic gratuit'} <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <a href="#produits" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold shadow-lg">
                  <ShoppingBag className="w-4 h-4" /> Voir les produits adaptés
                </a>
              )}
              <a href="/diagnostic/cheveux" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold">
                Faire le diagnostic gratuit
              </a>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne contenu */}
          <div className="lg:col-span-2 space-y-8">

            {/* Pourquoi / mécanisme */}
            <section className="rounded-3xl bg-white border border-[#E8E1DA] p-7 shadow-sm">
              <h2 className="text-xl font-serif-title font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C8753D]" /> Pourquoi et comment ça marche
              </h2>
              <p className="text-sm text-[#111111]/80 font-light leading-relaxed">{content.mechanism}</p>
            </section>

            {/* Routine pas à pas */}
            {content.routine.length > 0 && (
              <section className="rounded-3xl bg-white border border-[#E8E1DA] p-7 shadow-sm">
                <h2 className="text-xl font-serif-title font-bold mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#C8753D]" /> La routine, étape par étape
                </h2>
                <ol className="space-y-4">
                  {content.routine.map((r, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-[#C8753D]/10 text-[#C8753D] border border-[#C8753D]/20 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">{r.step}</p>
                        <p className="text-xs text-[#111111]/70 font-light leading-relaxed mt-0.5">{r.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Astuces / erreurs */}
            <section className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-7">
              <h2 className="text-xl font-serif-title font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-[#C8753D]" /> Les bons gestes (et les erreurs à éviter)
              </h2>
              <ul className="space-y-3">
                {content.tips.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm text-[#111111]/80 font-light leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </section>

            {/* Quand consulter */}
            <section className="rounded-3xl bg-amber-50 border border-amber-200 p-6 flex gap-3">
              <Stethoscope className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 mb-1">Quand consulter un professionnel</h3>
                <p className="text-xs text-amber-800/90 font-light leading-relaxed">{content.seeDoctor}</p>
              </div>
            </section>
          </div>

          {/* Colonne produits */}
          <aside id="produits" className="space-y-5">
            <div className="lg:sticky lg:top-28 space-y-5">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#C8753D]" />
                <h2 className="text-lg font-serif-title font-bold">
                  {content.comingSoon ? 'Bientôt en boutique' : 'Produits recommandés'}
                </h2>
              </div>

              {content.comingSoon && (
                <div className="rounded-2xl border border-[#E8E1DA] bg-[#F8F2EC] p-5 text-xs text-[#111111]/75 font-light leading-relaxed">
                  Les soins visage (solaire invisible, anti-taches, sensibilité) arrivent au prochain lot.
                  En attendant, le diagnostic peau vous donne gratuitement votre routine adaptée.
                </div>
              )}

              {loading ? (
                <div className="py-10 text-center"><Loader2 className="w-6 h-6 text-[#C8753D] animate-spin mx-auto" /></div>
              ) : recommended.length === 0 && !content.comingSoon ? (
                <div className="rounded-2xl border border-[#E8E1DA] bg-white p-5 text-xs text-[#111111]/60">
                  Les références arrivent dans la boutique.
                </div>
              ) : (
                <div className="space-y-4">
                  {recommended.map((p, i) => (
                    <motion.article
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className="rounded-2xl bg-white border border-[#E8E1DA] hover:border-[#C8753D] overflow-hidden shadow-sm hover:shadow-lg transition-all"
                    >
                      <a href={`/produit/${p.slug}`} className="block">
                        <div className="relative h-40 bg-[#F8F2EC] overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#111111]/40">Image bientôt</div>
                          )}
                          {p.isPreorder && (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700/95 text-white text-[9px] font-bold">
                              <Clock className="w-2.5 h-2.5" /> Précommande
                            </span>
                          )}
                        </div>
                      </a>
                      <div className="p-4">
                        <a href={`/produit/${p.slug}`}>
                          <h3 className="text-sm font-serif-title font-bold leading-snug hover:text-[#C8753D] transition-colors line-clamp-2">{p.name}</h3>
                        </a>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-base font-bold">{p.price.toFixed(2)} €</span>
                          <button
                            onClick={() => onAddToCart(p)}
                            disabled={!p.inStock}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#C8753D] hover:bg-[#b06330] disabled:opacity-40 text-white text-[11px] font-semibold"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> {p.isPreorder ? 'Précommander' : 'Ajouter'}
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}

              <a href="/boutique" className="block text-center text-xs font-bold text-[#C8753D] hover:text-[#b06330] inline-flex items-center justify-center gap-1 w-full">
                Voir toute la boutique <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </aside>
        </div>

        {/* Besoins liés */}
        {relatedNeeds.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-serif-title font-bold mb-5">Dans le même univers</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedNeeds.map((n) => {
                const RIcons = ICONS[n.icon] || Sparkles;
                return (
                  <a key={n.id} href={`/besoin/${n.homeSlug}`} className="group rounded-2xl bg-white border border-[#E8E1DA] hover:border-[#C8753D] p-5 transition-all flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center shrink-0">
                      <RIcons className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold group-hover:text-[#C8753D] transition-colors">{n.title}</p>
                      <p className="text-[11px] text-[#111111]/60 font-light line-clamp-1">{n.headline}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default NeedHubPage;
