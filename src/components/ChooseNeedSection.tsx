import React, { useState } from 'react';
import { ArrowUpRight, Droplet, Shield, Heart, Sun, Feather, Scissors, UserCheck, Baby, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BRAND_IMAGES } from '../data/brandImages';
import type { BrandImage as BrandImageData } from '../types';
import { BrandImage } from './BrandImage';
import { Reveal } from './motion/Reveal';

interface NeedCard {
  id: string;
  category: 'cheveux' | 'peau' | 'special';
  badge: string;
  title: string;
  subtitle: string;
  image: BrandImageData;
  link: string;
  icon: React.ElementType;
}

const ALL_NEEDS: NeedCard[] = [
  {
    id: 'hydrater-cheveux',
    category: 'cheveux',
    badge: 'Cheveux 3A–4C',
    title: 'Hydrater mes cheveux',
    subtitle: 'Retrouver souplesse et élasticité, et garder l’hydratation plus longtemps.',
    image: BRAND_IMAGES.afroSquare,
    link: '/besoin/hydrater',
    icon: Droplet,
  },
  {
    id: 'reduire-casse',
    category: 'cheveux',
    badge: 'Cheveux fragiles',
    title: 'Réduire la casse',
    subtitle: 'Renforcer la fibre et protéger les pointes pour garder ses longueurs.',
    image: BRAND_IMAGES.afroPortrait,
    link: '/besoin/casse',
    icon: Feather,
  },
  {
    id: 'cuir-chevelu',
    category: 'cheveux',
    badge: 'Cuir chevelu',
    title: 'Apaiser mon cuir chevelu',
    subtitle: 'Réduire les tiraillements et les pellicules, assainir en douceur.',
    image: BRAND_IMAGES.washDay,
    link: '/besoin/cuir-chevelu',
    icon: Sparkles,
  },
  {
    id: 'protective-styles',
    category: 'special',
    badge: 'Tresses & coiffures',
    title: 'Entretenir mes tresses',
    subtitle: 'Garder le cuir chevelu hydraté et protéger ses edges sous les coiffures.',
    image: BRAND_IMAGES.braidsProfile,
    link: '/besoin/protective',
    icon: Scissors,
  },
  {
    id: 'locks-care',
    category: 'special',
    badge: 'Locks & vanilles',
    title: 'Entretenir mes locks',
    subtitle: 'Des lavages sans résidu et des huiles pures pour un cuir chevelu sain.',
    image: BRAND_IMAGES.locsGlasses,
    link: '/besoin/locks',
    icon: Shield,
  },
  {
    id: 'homme-barbe',
    category: 'special',
    badge: 'Grooming homme',
    title: 'Prendre soin de ma barbe',
    subtitle: 'Assouplir la barbe, éviter les poils incarnés et rendre le rasage confortable.',
    image: BRAND_IMAGES.manCrewNeck,
    link: '/besoin/barbe',
    icon: UserCheck,
  },
  {
    id: 'hydrater-peau',
    category: 'peau',
    badge: 'Peaux sèches',
    title: 'Hydrater ma peau',
    subtitle: 'Une peau souple et confortable, sans fini gras ni brillances.',
    image: BRAND_IMAGES.skincareTowel,
    link: '/besoin/hydrater-peau',
    icon: Droplet,
  },
  {
    id: 'taches-hyperpigmentation',
    category: 'peau',
    badge: 'Teint unifié',
    title: 'Estomper les taches',
    subtitle: 'Atténuer les marques et les zones d’ombre avec des soins unifiants doux.',
    image: BRAND_IMAGES.skincareLotion,
    link: '/besoin/taches',
    icon: Sun,
  },
  {
    id: 'peau-sensible',
    category: 'peau',
    badge: 'Peaux sensibles',
    title: 'Apaiser ma peau',
    subtitle: 'Des formules douces sans parfum agressif, adaptées aux peaux réactives.',
    image: BRAND_IMAGES.beautyLips,
    link: '/besoin/sensible',
    icon: Heart,
  },
  {
    id: 'spf-melanin',
    category: 'peau',
    badge: 'Protection solaire',
    title: 'Trouver un SPF invisible',
    subtitle: 'Une protection solaire qui ne laisse aucune trace blanche sur peau noire.',
    image: BRAND_IMAGES.afroSunglasses,
    link: '/besoin/spf',
    icon: Shield,
  },
  {
    id: 'routine-enfant',
    category: 'special',
    badge: 'KURLA Kids',
    title: 'Une routine pour mon enfant',
    subtitle: 'Des gestes tout doux et des formules adaptées pour coiffer sans larmes.',
    image: BRAND_IMAGES.childNature,
    link: '/besoin/enfant',
    icon: Baby,
  },
  {
    id: 'routine-homme',
    category: 'special',
    badge: 'KURLA Homme',
    title: 'Une routine pour homme',
    subtitle: 'Du cheveu court aux waves et à la barbe : un rituel simple au quotidien.',
    image: BRAND_IMAGES.manCrewNeck,
    link: '/besoin/homme',
    icon: UserCheck,
  },
];

const FILTERS: { id: 'all' | 'cheveux' | 'peau' | 'special'; label: string }[] = [
  { id: 'all', label: 'Tous les besoins' },
  { id: 'cheveux', label: 'Cheveux' },
  { id: 'peau', label: 'Peau' },
  { id: 'special', label: 'Hommes, kids & coiffures' },
];

export const ChooseNeedSection: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'cheveux' | 'peau' | 'special'>('all');
  const filteredNeeds = ALL_NEEDS.filter(need => filter === 'all' || need.category === filter);

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <Reveal>
            <div className="max-w-[560px]">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
                Par où commencer ?
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] mb-3">
                Quel est votre besoin aujourd’hui ?
              </h2>
              <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
                Choisissez ce qui vous correspond : on vous oriente vers la routine et les produits adaptés.
              </p>
            </div>
          </Reveal>

          {/* Filtres */}
          <Reveal delay={0.2}>
            <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filter === f.id ? 'bg-[#C8753D] text-white shadow-sm' : 'text-[#111111]/70 hover:text-[#111111]'
                  }`}
                >
                  {f.label}
                  {f.id === 'all' && ` (${ALL_NEEDS.length})`}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Grille de cartes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredNeeds.map((need) => {
              const Icon = need.icon;
              return (
                <motion.div
                  key={need.id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                >
                  <a
                    href={need.link}
                    className="group relative rounded-3xl overflow-hidden bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-all duration-500 shadow-sm hover:shadow-2xl flex flex-col justify-between h-[380px] block"
                  >
                    {/* Image */}
                    <div className="absolute inset-0 z-0">
                      <BrandImage
                        image={need.image}
                        fill
                        ratio={4 / 5}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="group-hover:scale-110 transition-transform duration-700 ease-out"
                        wrapperClassName="absolute inset-0 z-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/90 via-[#050403]/40 to-transparent" />
                    </div>

                    {/* Badge haut */}
                    <div className="relative z-10 p-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFDF9]/90 backdrop-blur-md text-[11px] font-semibold text-[#111111] border border-[#E8E1DA] shadow-xs">
                        <Icon className="w-3.5 h-3.5 text-[#C8753D]" />
                        {need.badge}
                      </span>
                    </div>

                    {/* Contenu bas */}
                    <div className="relative z-10 p-6 flex flex-col justify-end text-white">
                      <h3 className="text-lg font-serif-title font-bold text-white mb-2 group-hover:text-[#D49A63] transition-colors flex items-center justify-between">
                        {need.title}
                        <div className="w-8 h-8 rounded-full bg-[#C8753D] text-white flex items-center justify-center transition-all group-hover:scale-110 shrink-0">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </h3>
                      <p className="text-xs text-white/85 line-clamp-2 font-light leading-relaxed">
                        {need.subtitle}
                      </p>
                    </div>
                  </a>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
