import React from 'react';
import { ArrowRight, ShoppingBag, Layers, Package, Sun, UserCheck, Baby, Scissors, Sparkles, Cpu } from 'lucide-react';
import { Reveal } from '../motion/Reveal';
import { BRAND_IMAGES } from '../../data/brandImages';
import { BrandImage } from '../BrandImage';
import type { BrandImage as BrandImageType } from '../../types';

interface CategoryCard {
  title: string;
  tag: string;
  count: string;
  image: BrandImageType;
  icon: React.ElementType;
  href: string;
  status: 'preco' | 'soon';
}

const CATEGORIES: CategoryCard[] = [
  {
    title: 'Soins cheveux 3A–4C',
    tag: 'Shampoings, masques, leave-in, huiles',
    count: '26 soins en précommande',
    image: BRAND_IMAGES.skincareTowel,
    icon: Scissors,
    href: '/boutique?cat=cheveux',
    status: 'preco',
  },
  {
    title: 'Outils & accessoires',
    tag: 'Peigne afro, diffuseur, satin, rods…',
    count: '28 outils en précommande',
    image: BRAND_IMAGES.braidsProfile,
    icon: Package,
    href: '/boutique?cat=accessoires',
    status: 'preco',
  },
  {
    title: 'Appareils & innovations',
    tag: 'Steamer vapeur, brosse brume, masseur',
    count: 'Les innovations « waouh »',
    image: BRAND_IMAGES.afroRed,
    icon: Cpu,
    href: '/boutique?cat=accessoires',
    status: 'preco',
  },
  {
    title: 'Kits & routines complètes',
    tag: 'Coffrets clé en main, jusqu’à -20 %',
    count: '10 coffrets en précommande',
    image: BRAND_IMAGES.afroStudio,
    icon: Layers,
    href: '/boutique?cat=kits',
    status: 'preco',
  },
  {
    title: 'Grooming homme',
    tag: 'Curl sponge, durag, soin barbe & cuir chevelu',
    count: 'Disponible en précommande',
    image: BRAND_IMAGES.manStudio,
    icon: UserCheck,
    href: '/hommes',
    status: 'preco',
  },
  {
    title: 'Peau & carnations',
    tag: 'Visage, taches & SPF invisible',
    count: 'Bientôt — diagnostic disponible',
    image: BRAND_IMAGES.skincareLotion,
    icon: Sun,
    href: '/melanin-skin',
    status: 'soon',
  },
  {
    title: 'KURLA Kids',
    tag: 'Routines douces sans larmes, dès 3 ans',
    count: 'Bientôt — espace kids ouvert',
    image: BRAND_IMAGES.childNature,
    icon: Baby,
    href: '/kids',
    status: 'soon',
  },
  {
    title: 'Marques de la communauté',
    tag: 'Créateurs & marques afro indépendantes',
    count: 'Bientôt : revente de marques',
    image: BRAND_IMAGES.salonClient,
    icon: Sparkles,
    href: '/community',
    status: 'soon',
  },
];

export const BoutiquePreviewSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#050403] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <Reveal>
            <div className="max-w-[600px]">
              <span className="text-xs uppercase tracking-widest text-[#D49A63] font-bold block mb-2">
                La boutique — précommandes ouvertes
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-white mb-3">
                Tout ce que vous cherchiez, au même endroit.
              </h2>
              <p className="text-sm sm:text-base text-[#FFF7EF]/75 font-light leading-relaxed">
                Plus de 60 références : soins capillaires 3A à 4C, les outils introuvables ailleurs — peigne afro, steamer, diffuseur, satin — 10 coffrets et les dernières innovations. Réservez dès maintenant, expédition à la réception du premier lot, annulation et remboursement à tout moment.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <a
              href="/boutique"
              className="px-8 py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm tracking-wide shadow-xl shadow-[#C8753D]/30 transition-all flex items-center gap-2 shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explorer toute la boutique</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>

        {/* Grille catégories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            const isPreco = cat.status === 'preco';
            return (
              <Reveal key={idx} delay={0.05 * idx}>
                <a
                  href={cat.href}
                  className="group relative rounded-3xl overflow-hidden bg-[#1A0F0A] border border-white/10 hover:border-[#C8753D] transition-all duration-500 shadow-xl flex flex-col justify-between h-[320px]"
                >
                  {/* Image */}
                  <div className="absolute inset-0 z-0">
                    <BrandImage
                      image={cat.image}
                      fill
                      ratio={4 / 5}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="group-hover:scale-105 transition-transform duration-700 ease-out"
                      wrapperClassName="absolute inset-0 z-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/90 via-[#050403]/45 to-transparent" />
                  </div>

                  {/* Badge haut */}
                  <div className="relative z-10 p-5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#050403]/80 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider border">
                      <span className={`w-1.5 h-1.5 rounded-full ${isPreco ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className={isPreco ? 'text-emerald-300 border-emerald-400/30' : 'text-amber-300 border-amber-400/30'}>
                        {isPreco ? 'En précommande' : 'Bientôt'}
                      </span>
                    </span>
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#D49A63]" />
                    </div>
                  </div>

                  {/* Texte bas */}
                  <div className="relative z-10 p-6 flex flex-col justify-end text-white">
                    <span className="text-[11px] text-[#FFF7EF]/70 font-medium block mb-1">{cat.count}</span>
                    <h3 className="text-lg font-serif-title font-bold text-white group-hover:text-[#D49A63] transition-colors flex items-center justify-between gap-2">
                      {cat.title}
                      <ArrowRight className="w-4 h-4 text-[#C8753D] group-hover:translate-x-1 transition-transform shrink-0" />
                    </h3>
                    <p className="text-[11px] text-white/60 font-light mt-1">{cat.tag}</p>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>

      </div>
    </section>
  );
};
