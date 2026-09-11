import React from 'react';
import { ArrowRight, ShieldCheck, HeartHandshake, Bot, Package, ShoppingBag, ScanSearch, MessageCircleHeart, BadgeCheck } from 'lucide-react';
import { HERO_IMAGE } from '../data/images';
import { BrandImage } from './BrandImage';

/**
 * Hero sans `motion` : 129 kB de JS économisés sur le premier paint.
 * Les halos, le dégradé et les entrées progressives sont en CSS pur
 * (voir `src/index.css` : kurla-halo / kurla-gradient / kurla-reveal).
 * `whileHover` devient `hover:-translate-y-1` + `transition`.
 */

const PILLARS = [
  { icon: ShoppingBag, title: 'La boutique', text: '60+ soins, outils & innovations — du peigne afro au steamer.', href: '/boutique' },
  { icon: ScanSearch, title: 'Diagnostic IA', text: 'Votre routine sur-mesure en 3 min, gratuit et sans abonnement.', href: '/diagnostic/cheveux' },
  { icon: MessageCircleHeart, title: 'Assistant beauté', text: 'Des réponses d’expert, profondes et honnêtes, 24 h/24.', href: '/assistant-beaute' },
  { icon: BadgeCheck, title: 'Pros certifiés', text: 'Des coiffeurs & spécialistes qui maîtrisent votre texture.', href: '/professionnels' },
];

// Léger wrapper CSS pour remplacer <Reveal> (qui tirait motion 42k gz)
const CssReveal: React.FC<{ delayMs?: number; children: React.ReactNode; className?: string }> = ({ delayMs = 0, children, className = '' }) => (
  <div
    className={`kurla-reveal ${className}`}
    style={{ animationDelay: `${delayMs}ms`, animationDuration: '0.6s', animationTimingFunction: 'cubic-bezier(0.21,0.47,0.32,0.98)', animationFillMode: 'both' } as React.CSSProperties}
  >
    {children}
  </div>
);

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen pt-28 pb-20 flex items-center bg-kurla-ink text-white overflow-hidden select-none">

      {/* Halos lumineux dorés — CSS only */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-kurla-copper/30 rounded-full blur-[100px] pointer-events-none z-10 kurla-halo" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-kurla-amber/20 rounded-full blur-[120px] pointer-events-none z-10 kurla-halo2" />

      {/* Photographie de marque en fond */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <BrandImage
          image={HERO_IMAGE}
          fill
          ratio={16 / 10}
          mobileRatio={4 / 5}
          priority
          grade="warm"
          sizes="100vw"
          className="kurla-kenburns"
          wrapperClassName="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-kurla-ink via-kurla-ink/75 to-kurla-ink/45 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-kurla-ink/90 via-kurla-ink/55 to-kurla-ink/10 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,117,61,0.22),transparent_65%)] pointer-events-none z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
        <div className="max-w-4xl text-left">

          <CssReveal delayMs={50}>
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-kurla-espresso/90 border border-kurla-copper/50 backdrop-blur-md text-kurla-amber text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase w-fit shadow-lg">
              <Sparkle />
              <span>La plateforme tout-en-un des beautés texturées</span>
            </div>
          </CssReveal>

          <CssReveal delayMs={100}>
            <h1 className="mt-6 text-4xl sm:text-6xl lg:text-[4.3rem] font-serif-title font-extrabold text-white tracking-tight leading-[1.05]">
              Vos cheveux bouclés,
              <br className="hidden sm:block" /> frisés &amp; crépus ont
              <br />
              <span className="bg-gradient-to-r from-kurla-cream via-kurla-amber to-kurla-copper bg-clip-text text-transparent italic font-normal inline-block kurla-gradient-anim">
                enfin leur maison.
              </span>
            </h1>
          </CssReveal>

          <CssReveal delayMs={150}>
            <p className="mt-6 text-base sm:text-lg text-kurla-cream/90 max-w-[660px] leading-relaxed font-light">
              <strong className="font-semibold text-white">Boutique, diagnostic IA, assistant expert et pros certifiés</strong> réunis au même endroit. Soins, outils et innovations pour les textures 3A à 4C et la peau mélanisée — pour les femmes, les hommes et les enfants.
            </p>
          </CssReveal>

          <CssReveal delayMs={200}>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <a
                    key={p.title}
                    href={p.href}
                    className="group flex flex-col gap-2 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md p-4 hover:border-kurla-copper/60 hover:bg-white/[0.1] hover:-translate-y-1 transition-all duration-200 text-left will-change-transform"
                  >
                    <span className="w-9 h-9 rounded-xl bg-kurla-copper/20 border border-kurla-copper/30 text-kurla-amber flex items-center justify-center group-hover:bg-kurla-copper group-hover:text-white transition-colors">
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-white">
                      {p.title}
                      <ArrowRight className="w-3.5 h-3.5 text-kurla-amber opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </span>
                    <span className="text-[11px] leading-snug text-kurla-cream/70 font-light">{p.text}</span>
                  </a>
                );
              })}
            </div>
          </CssReveal>

          <CssReveal delayMs={260}>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <a
                href="/diagnostic/cheveux"
                className="px-8 py-4 rounded-full bg-gradient-to-r from-kurla-copper to-kurla-cocoa hover:from-[#d48246] hover:to-kurla-copper text-white font-semibold text-base tracking-wide shadow-xl shadow-kurla-copper/30 transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Lancer mon diagnostic gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="/boutique"
                className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-semibold text-base tracking-wide transition-all duration-200 text-center flex items-center justify-center gap-2 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.97]"
              >
                <Package className="w-[18px] h-[18px]" />
                Découvrir la boutique
              </a>
            </div>
          </CssReveal>

          <CssReveal delayMs={300}>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-200/90">
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-kurla-ink px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Précommandes ouvertes
              </span>
              Réservez vos produits dès maintenant — annulation &amp; remboursement à tout moment avant l’envoi.
            </p>
          </CssReveal>

          <CssReveal delayMs={340}>
            <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-kurla-cream/65">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-kurla-amber" /> Outils IA &amp; diagnostic gratuits à jamais
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-kurla-amber" /> Formules végétales &amp; éthiques
              </span>
              <span className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-kurla-amber" /> Femmes, hommes &amp; enfants · 3A–4C
              </span>
            </div>
          </CssReveal>

        </div>
      </div>

    </section>
  );
};

const Sparkle: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kurla-amber">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
  </svg>
);
