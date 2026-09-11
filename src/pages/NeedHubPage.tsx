import React, { useMemo } from 'react';
import {
  Droplets, Feather, Sparkles, Scissors, Shield, User, Sun, Heart,
  Award, Baby, Lock, ArrowRight, ArrowLeft, CheckCircle2,
  AlertTriangle, Lightbulb, Stethoscope, ShoppingBag, Clock, Package, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useProducts } from '../services/productService';
import { isDropshipProduct } from '../lib/preorderPromise';
import { PEAU_KITS } from '../lib/peauKits';
import { NEEDS_HUB } from '../lib/needsHub';
import { getHairTextureTerm, isTextureAwareNeed, productMatchesHairTexture } from '../lib/needTexturePages';

const ICONS: Record<string, React.ElementType> = {
  droplet: Droplets, feather: Feather, sparkles: Sparkles, scissors: Scissors,
  shield: Shield, user: User, sun: Sun, heart: Heart, badge: Award,
  baby: Baby, lock: Lock,
};

interface NeedHubPageProps {
  need: string;
  texture?: string;
  onAddToCart: (product: Product) => void;
}

export const NeedHubPage: React.FC<NeedHubPageProps> = ({ need, texture, onAddToCart }) => {
  const { products, loading } = useProducts();
  const textureTerm = useMemo(() => getHairTextureTerm(texture), [texture]);
  const content = useMemo(
    () => {
      const candidate = NEEDS_HUB.find((n) => n.homeSlug === need || n.id === need);
      // Une URL texture n'est valide que pour une texture de la taxonomie et un
      // besoin explicitement capillaire. Cela évite de fabriquer, par exemple,
      // une page « SPF × 4C » à partir d'un simple slug.
      return texture && (!textureTerm || !candidate || !isTextureAwareNeed(candidate))
        ? undefined
        : candidate;
    },
    [need, texture, textureTerm]
  );

  // Produits recommandés : on résout les ids `launch-pXX` du catalogue réel.
  const recommended = useMemo(() => {
    if (!content) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    const candidates = content.productIds
      .map((pid) => byId.get(`launch-${pid}`))
      .filter((p): p is Product => Boolean(p));
    return textureTerm
      ? candidates.filter(product => productMatchesHairTexture(product, textureTerm.code))
      : candidates;
  }, [content, products, textureTerm]);

  if (!content) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-kurla-ivory text-kurla-carbon">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-serif-title font-bold mb-3">Besoin introuvable</h1>
          <p className="text-sm text-kurla-carbon/70 mb-6">Ce besoin n’existe pas ou a été déplacé.</p>
          <a href="/boutique" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kurla-copper text-white text-sm font-semibold">
            Retour à la boutique <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const Icon = ICONS[content.icon] || Sparkles;
  const relatedNeeds = NEEDS_HUB.filter((n) => n.domain === content.domain && n.id !== content.id).slice(0, 3);

  return (
    <div className="min-h-screen pt-28 pb-24 bg-kurla-ivory text-kurla-carbon">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Fil d'Ariane */}
        <a href="/" className="inline-flex items-center gap-2 text-xs text-kurla-carbon/60 hover:text-kurla-copper mb-6">
          <ArrowLeft className="w-4 h-4" /> Accueil
        </a>

        {/* En-tête */}
        <header className="rounded-3xl bg-gradient-to-br from-kurla-espresso to-kurla-bark text-white p-8 sm:p-12 mb-10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-kurla-copper/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-kurla-amber text-[11px] font-semibold uppercase tracking-wider mb-5">
              <Icon className="w-4 h-4" /> {content.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold mb-4 leading-tight">
              {content.title}{textureTerm ? ` — ${textureTerm.code}` : ''}
            </h1>
            <p className="text-base sm:text-lg text-kurla-cream/90 font-light max-w-2xl leading-relaxed">{content.headline}</p>
            {textureTerm && (
              <p className="mt-3 text-xs text-kurla-cream/65">
                Page croisée avec la taxonomie texture « {textureTerm.labelFr} ». Les produits affichés sont ceux dont la fiche catalogue porte explicitement ce code ou une plage qui l’inclut.
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              {content.comingSoon ? (
                <a href={content.primaryCta?.href || '/diagnostic/peau'} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-sm font-semibold shadow-lg">
                  {content.primaryCta?.label || 'Faire le diagnostic gratuit'} <ArrowRight className="w-4 h-4" />
                </a>
              ) : (
                <a href="#produits" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-sm font-semibold shadow-lg">
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
            <section className="rounded-3xl bg-white border border-kurla-stone p-7 shadow-sm">
              <h2 className="text-xl font-serif-title font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-kurla-copper" /> Pourquoi et comment ça marche
              </h2>
              <p className="text-sm text-kurla-carbon/80 font-light leading-relaxed">{content.mechanism}</p>
            </section>

            {/* Routine pas à pas */}
            {content.routine.length > 0 && (
              <section className="rounded-3xl bg-white border border-kurla-stone p-7 shadow-sm">
                <h2 className="text-xl font-serif-title font-bold mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-kurla-copper" /> La routine, étape par étape
                </h2>
                <ol className="space-y-4">
                  {content.routine.map((r, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-kurla-copper/10 text-kurla-copper border border-kurla-copper/20 flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-kurla-carbon">{r.step}</p>
                        <p className="text-xs text-kurla-carbon/70 font-light leading-relaxed mt-0.5">{r.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Astuces / erreurs */}
            <section className="rounded-3xl bg-kurla-sand border border-kurla-stone p-7">
              <h2 className="text-xl font-serif-title font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-kurla-copper" /> Les bons gestes (et les erreurs à éviter)
              </h2>
              <ul className="space-y-3">
                {content.tips.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm text-kurla-carbon/80 font-light leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-kurla-copper shrink-0 mt-0.5" /> {t}
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
                <Package className="w-5 h-5 text-kurla-copper" />
                <h2 className="text-lg font-serif-title font-bold">
                  {content.comingSoon ? 'Bientôt en boutique' : 'Produits recommandés'}
                </h2>
              </div>

              {content.comingSoon && (
                <div className="rounded-2xl border border-kurla-stone bg-kurla-sand p-5 text-xs text-kurla-carbon/75 font-light leading-relaxed">
                  Les soins visage (solaire invisible, anti-taches, sensibilité) arrivent au prochain lot.
                  En attendant, le diagnostic peau vous donne gratuitement votre routine adaptée.
                </div>
              )}

              {/* C6 — NeedHub peau : plans de kits tant que la gamme n'est pas prouvée */}
              {content.domain === 'peau' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-kurla-copper">Kits peau — formulation cible, non disponibles</p>
                  {PEAU_KITS.map(kit => (
                    <a key={kit.id} href={`/boutique?cat=kits`} className="block p-4 rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper transition-colors">
                      <p className="text-sm font-bold">{kit.name} · indicatif {kit.priceBundle.toFixed(2)}€ <span className="text-xs font-normal text-kurla-carbon/40 line-through ml-1">{kit.priceSeparate.toFixed(2)}€ indicatif</span></p>
                      <p className="text-xs text-kurla-carbon/60">{kit.tagline} · {kit.routine}</p>
                      <p className="text-[11px] text-emerald-700 font-bold mt-1">−{kit.economyPct}% · {kit.products.length} soins</p>
                    </a>
                  ))}
                  <a href={`/boutique?cat=peau&need=${content.homeSlug}`} className="block text-center text-xs font-bold text-kurla-copper hover:underline">Boutique peau filtrée “{content.title}” →</a>
                  <a href={`/guides/ingredients`} className="block text-center text-[11px] text-kurla-carbon/60 hover:underline">→ 15 fiches ingrédient peau (niacinamide, céramides…)</a>
                </div>
              )}

              {loading ? (
                <div className="py-10 text-center"><Loader2 className="w-6 h-6 text-kurla-copper animate-spin mx-auto" /></div>
              ) : recommended.length === 0 && !content.comingSoon ? (
                <div className="rounded-2xl border border-kurla-stone bg-white p-5 text-xs text-kurla-carbon/60">
                  {textureTerm
                    ? 'Aucune référence publiée ne porte actuellement cette texture dans sa fiche catalogue. Nous n’élargissons pas la recommandation sans donnée correspondante.'
                    : 'Les références arrivent dans la boutique.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {recommended.map((p, i) => {
                    const isPreorderProduct = p.isPreorder === true || (p as any).availabilityState === 'preorder';
                    const canOrderProduct = p.inStock === true || isPreorderProduct;
                    return (
                    <motion.article
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      className="rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper overflow-hidden shadow-sm hover:shadow-lg transition-all"
                    >
                      <a href={`/produit/${p.slug}`} className="block">
                        <div className="relative h-40 bg-kurla-sand overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-kurla-carbon/40">Image bientôt</div>
                          )}
                          {isDropshipProduct(p as any) ? (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                              <Clock className="w-2.5 h-2.5" /> 24–48h
                            </span>
                          ) : isPreorderProduct ? (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-700/95 text-white text-[9px] font-bold">
                              <Clock className="w-2.5 h-2.5" /> Précommande
                            </span>
                          ) : (
                            <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-kurla-carbon/80 text-white text-[9px] font-bold">
                              Stock disponible
                            </span>
                          )}
                        </div>
                      </a>
                      <div className="p-4">
                        <a href={`/produit/${p.slug}`}>
                          <h3 className="text-sm font-serif-title font-bold leading-snug hover:text-kurla-copper transition-colors line-clamp-2">{p.name}</h3>
                        </a>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-base font-bold">{p.price.toFixed(2)} €</span>
                          <button
                            onClick={() => onAddToCart(p)}
                            disabled={!canOrderProduct}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-kurla-copper hover:bg-kurla-cocoa disabled:opacity-40 text-white text-[11px] font-semibold"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" /> {!canOrderProduct ? 'Indisponible' : isPreorderProduct ? 'Précommander' : 'Ajouter'}
                          </button>
                        </div>
                      </div>
                    </motion.article>
                    );
                  })}
                </div>
              )}

              <a href="/boutique" className="block text-center text-xs font-bold text-kurla-copper hover:text-kurla-cocoa inline-flex items-center justify-center gap-1 w-full">
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
                  <a key={n.id} href={`/besoin/${n.homeSlug}`} className="group rounded-2xl bg-white border border-kurla-stone hover:border-kurla-copper p-5 transition-all flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-kurla-copper/10 text-kurla-copper flex items-center justify-center shrink-0">
                      <RIcons className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold group-hover:text-kurla-copper transition-colors">{n.title}</p>
                      <p className="text-[11px] text-kurla-carbon/60 font-light line-clamp-1">{n.headline}</p>
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
