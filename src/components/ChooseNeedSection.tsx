import React, { useState } from 'react';
import { ArrowUpRight, Sparkles, Droplet, Shield, Heart, Sun, Feather, Scissors, UserCheck, Baby } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HERO_IMAGE, PROTECTIVE_IMAGE, MELANIN_SKIN_IMAGE, KIDS_CARE_IMAGE, MEN_GROOMING_IMAGE } from '../data/images';
import { Reveal } from './motion/Reveal';

interface NeedCard {
  id: string;
  category: 'cheveux' | 'peau' | 'special';
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

const ALL_NEEDS: NeedCard[] = [
  {
    id: 'hydrater-cheveux',
    category: 'cheveux',
    badge: 'Cheveux 3A-4C',
    title: 'Hydrater mes cheveux',
    subtitle: 'Assouplir la fibre, rétablir l’élasticité et fixer l’eau sans alourdir.',
    image: HERO_IMAGE,
    link: '/diagnostic/cheveux?need=hydrater',
  },
  {
    id: 'reduire-casse',
    category: 'cheveux',
    badge: 'Soin Fortifiant',
    title: 'Réduire la casse',
    subtitle: 'Nourrir la protéine capillaire et sceller les pointes endommagées.',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    link: '/diagnostic/cheveux?need=casse',
  },
  {
    id: 'cuir-chevelu',
    category: 'cheveux',
    badge: 'Santé du Follicule',
    title: 'Prendre soin du cuir chevelu',
    subtitle: 'Apaiser les démangeaisons, réduire les pellicules et stimuler la repousse.',
    image: 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80',
    link: '/diagnostic/cheveux?need=cuir-chevelu',
  },
  {
    id: 'protective-styles',
    category: 'special',
    badge: 'Braids & Coiffures',
    title: 'Entretenir mes tresses',
    subtitle: 'Hydrater le cuir chevelu sous les tresses et préserver la ligne de cheveux (edges).',
    image: PROTECTIVE_IMAGE,
    link: '/protective-styles',
  },
  {
    id: 'locks-care',
    category: 'special',
    badge: 'Locks & Dreadlocks',
    title: 'Entretenir mes locks',
    subtitle: 'Shampoings clarifiants sans résidu et huiles végétales pures.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    link: '/diagnostic/cheveux?need=locks',
  },
  {
    id: 'homme-barbe',
    category: 'special',
    badge: 'Grooming Masculin',
    title: 'Prendre soin de ma barbe',
    subtitle: 'Soins adoucissants barbe, prévention des poils incarnés et confort du rasage.',
    image: MEN_GROOMING_IMAGE,
    link: '/hommes',
  },
  {
    id: 'hydrater-peau',
    category: 'peau',
    badge: 'Carnations Sombres',
    title: 'Hydrater ma peau',
    subtitle: 'Baumes riches et émulsions légères pour réguler le sébum sans film gras.',
    image: MELANIN_SKIN_IMAGE,
    link: '/melanin-skin',
  },
  {
    id: 'taches-hyperpigmentation',
    category: 'peau',
    badge: 'Anti-Taches',
    title: 'Prendre soin des taches',
    subtitle: 'Estomper l’hyperpigmentation d’acné avec des actifs doux (niacinamide, kojique).',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    link: '/melanin-skin?need=taches',
  },
  {
    id: 'peau-sensible',
    category: 'peau',
    badge: 'Tolérance Haute',
    title: 'Apaiser une peau sensible',
    subtitle: 'Formules apaisantes sans parfum synthétique pour peaux réactives.',
    image: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80',
    link: '/melanin-skin?need=sensible',
  },
  {
    id: 'spf-melanin',
    category: 'peau',
    badge: 'Protection Solaire',
    title: 'Trouver un SPF invisible',
    subtitle: 'Filtres solaires transparents garantis 100% sans voile blanc ni fini gris.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    link: '/melanin-skin?need=spf',
  },
  {
    id: 'routine-enfant',
    category: 'special',
    badge: 'KURLA Kids 3+',
    title: 'Routine pour enfant',
    subtitle: 'Démêlant magique et formules hypoallergéniques pour des coiffages sans larmes.',
    image: KIDS_CARE_IMAGE,
    link: '/kids',
  },
  {
    id: 'routine-homme',
    category: 'special',
    badge: 'KURLA Homme',
    title: 'Routine pour homme',
    subtitle: 'Du cuir chevelu court aux waves et à la barbe, un rituel quotidien efficace.',
    image: MEN_GROOMING_IMAGE,
    link: '/hommes',
  },
];

export const ChooseNeedSection: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'cheveux' | 'peau' | 'special'>('all');

  const filteredNeeds = ALL_NEEDS.filter(need => filter === 'all' || need.category === filter);

  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <Reveal>
            <div className="max-w-[560px]">
              <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
                Recherche par Besoins & Rituels
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] mb-3">
                Trouver mon besoin.
              </h2>
              <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
                Découvrez des routines recommandées scientifiquement pour cibler exactement vos attentes capillaires et cutanées.
              </p>
            </div>
          </Reveal>

          {/* Filter Pills */}
          <Reveal delay={0.2}>
            <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'all' ? 'bg-[#C8753D] text-white shadow-sm' : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                Tous les besoins ({ALL_NEEDS.length})
              </button>
              <button
                onClick={() => setFilter('cheveux')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'cheveux' ? 'bg-[#C8753D] text-white shadow-sm' : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                Cheveux
              </button>
              <button
                onClick={() => setFilter('peau')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'peau' ? 'bg-[#C8753D] text-white shadow-sm' : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                Peau
              </button>
              <button
                onClick={() => setFilter('special')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === 'special' ? 'bg-[#C8753D] text-white shadow-sm' : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                Hommes, Kids & Style
              </button>
            </div>
          </Reveal>
        </div>

        {/* Dynamic Need Cards Grid with Motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredNeeds.map((need) => (
              <motion.div
                key={need.id}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25 }}
              >
                <a
                  href={need.link}
                  className="group relative rounded-3xl overflow-hidden bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] transition-all duration-500 shadow-sm hover:shadow-2xl flex flex-col justify-between h-[380px] block"
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={need.image}
                      alt={need.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/90 via-[#050403]/40 to-transparent" />
                  </div>

                  {/* Card Top Badge */}
                  <div className="relative z-10 p-5">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#FFFDF9]/90 backdrop-blur-md text-[11px] font-semibold text-[#111111] border border-[#E8E1DA] shadow-xs">
                      {need.badge}
                    </span>
                  </div>

                  {/* Card Footer Content */}
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
            ))}
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
