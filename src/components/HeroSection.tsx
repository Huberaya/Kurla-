import React from 'react';
import { ArrowRight, ShieldCheck, HeartHandshake, Bot, Package, ShoppingBag, ScanSearch, MessageCircleHeart, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { HERO_IMAGE } from '../data/images';
import { BrandImage } from './BrandImage';
import { Reveal } from './motion/Reveal';

const PILLARS = [
  {
    icon: ShoppingBag,
    title: 'La boutique',
    text: '60+ soins, outils & innovations — du peigne afro au steamer.',
    href: '/boutique',
  },
  {
    icon: ScanSearch,
    title: 'Diagnostic IA',
    text: 'Votre routine sur-mesure en 3 min, gratuit et sans abonnement.',
    href: '/diagnostic/cheveux',
  },
  {
    icon: MessageCircleHeart,
    title: 'Assistant beauté',
    text: 'Des réponses d’expert, profondes et honnêtes, 24 h/24.',
    href: '/assistant-beaute',
  },
  {
    icon: BadgeCheck,
    title: 'Pros certifiés',
    text: 'Des coiffeurs & spécialistes qui maîtrisent votre texture.',
    href: '/professionnels',
  },
];

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen pt-28 pb-20 flex items-center bg-[#050403] text-white overflow-hidden select-none">

      {/* Halots lumineux dorés */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        className="absolute top-1/4 left-10 w-96 h-96 bg-[#C8753D]/30 rounded-full blur-[100px] pointer-events-none z-10"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#D49A63]/20 rounded-full blur-[120px] pointer-events-none z-10"
      />

      {/* Photographie de marque en fond.
          Le cadrage est fait côté CDN (crop=faces) : le visage reste dans le cadre
          quelle que soit la largeur d'écran. Mouvement lent type Ken Burns. */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <BrandImage
          image={HERO_IMAGE}
          fill
          ratio={16 / 10}
          priority
          grade="warm"
          sizes="100vw"
          className="kurla-kenburns"
          wrapperClassName="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050403] via-[#050403]/75 to-[#050403]/45 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050403]/90 via-[#050403]/55 to-[#050403]/10 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,117,61,0.22),transparent_65%)] pointer-events-none z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
        <div className="max-w-4xl text-left">

          {/* Étiquette de positionnement */}
          <Reveal delay={0.05}>
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1A0F0A]/90 border border-[#C8753D]/50 backdrop-blur-md text-[#D49A63] text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase w-fit shadow-lg">
              <Sparkle />
              <span>La plateforme tout-en-un des beautés texturées</span>
            </div>
          </Reveal>

          {/* Titre */}
          <Reveal delay={0.1}>
            <h1 className="mt-6 text-4xl sm:text-6xl lg:text-[4.3rem] font-serif-title font-extrabold text-white tracking-tight leading-[1.05]">
              Vos cheveux bouclés,
              <br className="hidden sm:block" /> frisés &amp; crépus ont
              <br />
              <motion.span
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                className="bg-gradient-to-r from-[#FFF7EF] via-[#D49A63] to-[#C8753D] bg-[length:200%_auto] bg-clip-text text-transparent italic font-normal inline-block"
              >
                enfin leur maison.
              </motion.span>
            </h1>
          </Reveal>

          {/* Accroche plateforme */}
          <Reveal delay={0.15}>
            <p className="mt-6 text-base sm:text-lg text-[#FFF7EF]/90 max-w-[660px] leading-relaxed font-light">
              <strong className="font-semibold text-white">Boutique, diagnostic IA, assistant expert et pros certifiés</strong> réunis au même endroit. Soins, outils et innovations pour les textures 3A à 4C et la peau mélanisée — pour les femmes, les hommes et les enfants.
            </p>
          </Reveal>

          {/* Les 4 piliers de la plateforme */}
          <Reveal delay={0.2}>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <motion.a
                    key={p.title}
                    href={p.href}
                    whileHover={{ y: -4 }}
                    className="group flex flex-col gap-2 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md p-4 hover:border-[#C8753D]/60 hover:bg-white/[0.1] transition-colors text-left"
                  >
                    <span className="w-9 h-9 rounded-xl bg-[#C8753D]/20 border border-[#C8753D]/30 text-[#D49A63] flex items-center justify-center group-hover:bg-[#C8753D] group-hover:text-white transition-colors">
                      <Icon className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-white">
                      {p.title}
                      <ArrowRight className="w-3.5 h-3.5 text-[#D49A63] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </span>
                    <span className="text-[11px] leading-snug text-[#FFF7EF]/70 font-light">{p.text}</span>
                  </motion.a>
                );
              })}
            </div>
          </Reveal>

          {/* Boutons d'action */}
          <Reveal delay={0.26}>
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <motion.a
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                href="/diagnostic/cheveux"
                className="px-8 py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#b06330] hover:from-[#d48246] hover:to-[#c8753d] text-white font-semibold text-base tracking-wide shadow-xl shadow-[#C8753D]/30 transition-all flex items-center justify-center gap-3 group"
              >
                Lancer mon diagnostic gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                href="/boutique"
                className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-semibold text-base tracking-wide transition-all text-center flex items-center justify-center gap-2"
              >
                <Package className="w-[18px] h-[18px]" />
                Découvrir la boutique
              </motion.a>
            </div>
          </Reveal>

          {/* Ligne précommande rassurante */}
          <Reveal delay={0.3}>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-emerald-200/90">
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-[#050403] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Précommandes ouvertes
              </span>
              Réservez vos produits dès maintenant — annulation &amp; remboursement à tout moment avant l’envoi.
            </p>
          </Reveal>

          {/* Valeurs */}
          <Reveal delay={0.34}>
            <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#FFF7EF]/65">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#D49A63]" /> Outils IA &amp; diagnostic gratuits à jamais
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#D49A63]" /> Formules végétales &amp; éthiques
              </span>
              <span className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#D49A63]" /> Femmes, hommes &amp; enfants · 3A–4C
              </span>
            </div>
          </Reveal>

        </div>
      </div>

    </section>
  );
};

const Sparkle: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D49A63]">
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
  </svg>
);
