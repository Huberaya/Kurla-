import React, { useState } from 'react';
import { ArrowRight, Sun, Scissors, Droplets, Wind, Sparkles, ShieldCheck, Heart, Users, Baby } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HERO_IMAGE, MELANIN_SKIN_IMAGE } from '../../data/images';
import { Reveal } from '../motion/Reveal';

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const HAIR_FEATURES: Feature[] = [
  { icon: Droplets, title: 'Boucles définies (3A–3C)', desc: 'Hydratation légère et boucles rebondies, sans effet carton ni frisottis.' },
  { icon: Sparkles, title: 'Cheveux frisés & crépus (4A–4C)', desc: 'Nutrition riche, rétention de longueur et moins de casse au quotidien.' },
  { icon: Wind, title: 'Locks & vanilles', desc: 'Des lavages sans résidu, un cuir chevelu apaisé et un resserrage doux.' },
  { icon: ShieldCheck, title: 'Tresses & coiffures protectrices', desc: 'Rafraîchissement anti-démangeaisons et protection de la ligne de cheveux.' },
  { icon: Heart, title: 'Perruques & tissages', desc: 'Bonnet lace net, cheveux hydratés dessous, colles douces pour le cuir chevelu.' },
  { icon: Users, title: 'Barbe & cuir chevelu', desc: 'Huiles et baumes qui assouplissent la barbe et purifient le cuir chevelu.' },
];

const SKIN_FEATURES: Feature[] = [
  { icon: Droplets, title: 'Peaux sèches & déshydratées', desc: 'Baumes nourrissants qui réparent la barrière cutanée sans fini gras.' },
  { icon: Sparkles, title: 'Taches & teint irrégulier', desc: 'Des soins unifiants doux, associés à une protection solaire chaque jour.' },
  { icon: Heart, title: 'Peaux sensibles & réactives', desc: 'Des formules apaisantes, sans parfum agressif, bien tolérées sur peau noire.' },
  { icon: Scissors, title: 'Rasage & poils incarnés', desc: 'Confort avant/après rasage et exfoliation douce du visage et du cou.' },
  { icon: Sun, title: 'Solaire invisible', desc: 'Une protection SPF 30/50 qui ne laisse aucune trace blanche sur carnations sombres.' },
  { icon: Baby, title: 'Corps & éclat', desc: 'Lait et huiles au karité-cacao pour une peau souple et lumineuse.' },
];

export const HairSkinSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hair' | 'skin'>('hair');
  const features = activeTab === 'hair' ? HAIR_FEATURES : SKIN_FEATURES;

  return (
    <section id="hair-skin-section" className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8753D]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F8F2EC] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* En-tête */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Reveal>
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
              Cheveux &amp; peau
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight mb-4">
              Deux expertises, une même exigence.
            </h2>
            <p className="text-base text-[#111111]/75 font-light leading-relaxed max-w-[580px] mx-auto">
              Des soins pensés pour les textures bouclées à crépues <em>et</em> pour les peaux riches en mélanine. Explorez l’univers qui vous concerne.
            </p>
          </Reveal>

          {/* Onglets */}
          <Reveal delay={0.2}>
            <div className="inline-flex p-1.5 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] mt-8 shadow-inner">
              <button
                onClick={() => setActiveTab('hair')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'hair' ? 'bg-[#C8753D] text-white shadow-md' : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <Scissors className="w-4 h-4" /> Cheveux texturés
              </button>
              <button
                onClick={() => setActiveTab('skin')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'skin' ? 'bg-[#C8753D] text-white shadow-md' : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <Sun className="w-4 h-4" /> Peau &amp; carnations
              </button>
            </div>
          </Reveal>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
          >
            {/* Visuel */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shadow-2xl group bg-[#1A0F0A]">
                <img loading="lazy" decoding="async"
                  src={activeTab === 'hair' ? HERO_IMAGE : MELANIN_SKIN_IMAGE}
                  alt={activeTab === 'hair' ? 'Soin des cheveux texturés' : 'Soin de la peau mélaninée'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-[#050403]/85 backdrop-blur-md border border-white/10 text-white">
                  <span className="text-xs uppercase font-bold text-[#D49A63] tracking-widest block mb-1">
                    {activeTab === 'hair' ? 'Expertise capillaire' : 'Expertise peau'}
                  </span>
                  <h3 className="text-xl font-serif-title font-bold text-white mb-2">
                    {activeTab === 'hair' ? '3A à 4C & coiffures protectrices' : 'Des formules testées sur carnations sombres'}
                  </h3>
                  <a
                    href={activeTab === 'hair' ? '/diagnostic/cheveux' : '/melanin-skin'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D49A63] hover:text-white transition-colors"
                  >
                    Voir l’approche complète <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bénéfices */}
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.title}
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] shadow-xs hover:shadow-xl transition-all group"
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-full bg-[#C8753D]/10 text-[#C8753D] border border-[#C8753D]/20 flex items-center justify-center group-hover:bg-[#C8753D] group-hover:text-white transition-colors shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="font-serif-title font-bold text-sm text-[#111111] group-hover:text-[#C8753D] transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-[#111111]/75 leading-relaxed font-light pl-[46px]">
                        {item.desc}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-wrap gap-4 items-center">
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href={activeTab === 'hair' ? '/diagnostic/cheveux' : '/melanin-skin'}
                  className="px-8 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm tracking-wide shadow-md shadow-[#C8753D]/20 transition-all flex items-center gap-2"
                >
                  {activeTab === 'hair' ? 'Trouver ma routine cheveux' : 'Découvrir les soins peau'}
                  <ArrowRight className="w-4 h-4" />
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href="/boutique"
                  className="px-6 py-3.5 rounded-full bg-[#F8F2EC] hover:bg-[#E8E1DA] text-[#111111] border border-[#E8E1DA] font-semibold text-sm transition-all"
                >
                  Voir toute la boutique
                </motion.a>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
