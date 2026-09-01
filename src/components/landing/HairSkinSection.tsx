import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Check, Heart, Sun, Feather, Scissors, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HERO_IMAGE, MELANIN_SKIN_IMAGE } from '../../data/images';
import { Reveal } from '../motion/Reveal';

export const HairSkinSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hair' | 'skin'>('hair');

  const hairFeatures = [
    { title: 'Cheveux Bouclés (3A-3C)', desc: 'Définition sans effet carton, hydratation légère et contrôle des frisottis.' },
    { title: 'Cheveux Frisés & Crépus (4A-4C)', desc: 'Routines LCO/LOC, beurre de karité, rétention de longueur et prévention de la casse.' },
    { title: 'Locks & Dreadlocks', desc: 'Soins lavants sans résidus, huiles apaisantes cuir chevelu et resserrage doux.' },
    { title: 'Tresses & Coiffures Protectrices', desc: 'Sprays rafraîchissants anti-démangeaisons et protection de la ligne de cheveux (edges).' },
    { title: 'Perruques & Tissages', desc: 'Nettoyage des bonnets lace, hydratation sous la perruque et colles hypoallergéniques.' },
    { title: 'Barbe & Cuir Chevelu', desc: 'Huiles de pousse, baumes adoucissants barbe et gommages purifiants.' },
  ];

  const skinFeatures = [
    { title: 'Peaux Sèches & Déshydratées', desc: 'Baumes riches en acides gras précieux, squalane et céramides apaisantes.' },
    { title: 'Taches & Hyperpigmentation', desc: 'Sérums anti-taches et unifiants ciblés (Niacinamide, Acide Kojique, Vitamine C sans irritation), associés à une protection solaire quotidienne.' },
    { title: 'Peaux Sensibles & Réactives', desc: 'Formules ultra-douces sans parfum synthétique, tolérance optimale mélaninée.' },
    { title: 'Rasage & Poils Incarnés', desc: 'Soin d’avant et d’après rasage, solutions exfoliatrices douces mâchoire & cou.' },
    { title: 'Photoprotection Solaire Invisible', desc: 'Écrans solaires SPF30/50 sans voile blanc ni fini gras sur carnactions sombres.' },
    { title: 'Soins du Corps & Nourrissants', desc: 'Lait hydratant karité-cacao et huiles satinées pour une peau éclatante.' },
  ];

  return (
    <section id="hair-skin-section" className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8753D]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F8F2EC] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal>
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
              Une plateforme pensée pour vous
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight mb-4">
              Deux univers de soin, une même exigence d'excellence.
            </h2>
            <p className="text-base text-[#111111]/75 font-light leading-relaxed max-w-[580px] mx-auto">
              Que vous cherchiez à sublimer vos boucles, protéger vos locks ou estomper des taches d'hyperpigmentation, KURLA réunit le meilleur de la science et de la nature.
            </p>
          </Reveal>

          {/* Interactive Switch Tabs */}
          <Reveal delay={0.2}>
            <div className="inline-flex p-1.5 rounded-full bg-[#F8F2EC] border border-[#E8E1DA] mt-8 shadow-inner">
              <button
                onClick={() => setActiveTab('hair')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'hair'
                    ? 'bg-[#C8753D] text-white shadow-md'
                    : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <Scissors className="w-4 h-4" /> Cheveux Texturés
              </button>
              <button
                onClick={() => setActiveTab('skin')}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'skin'
                    ? 'bg-[#C8753D] text-white shadow-md'
                    : 'text-[#111111]/70 hover:text-[#111111]'
                }`}
              >
                <Sun className="w-4 h-4" /> Peau & Carnations
              </button>
            </div>
          </Reveal>
        </div>

        {/* Dual Interactive Grid with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
          >

            {/* Visual Highlight Image Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shadow-2xl group bg-[#1A0F0A]">
                <img loading="lazy" decoding="async"
                  src={activeTab === 'hair' ? HERO_IMAGE : MELANIN_SKIN_IMAGE}
                  alt={activeTab === 'hair' ? 'Soin cheveux texturés' : 'Soin peau mélaninée'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050403]/80 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-[#050403]/85 backdrop-blur-md border border-white/10 text-white">
                  <span className="text-xs uppercase font-bold text-[#D49A63] tracking-widest block mb-1">
                    {activeTab === 'hair' ? 'Expertise Capillaire' : 'Expertise Dermato-Cosmétique'}
                  </span>
                  <h3 className="text-xl font-serif-title font-bold text-white mb-2">
                    {activeTab === 'hair' ? 'Soins 3A à 4C & Coiffures Protectrices' : 'Formules Testées sur Carnations Sombres'}
                  </h3>
                  <a
                    href={activeTab === 'hair' ? '/diagnostic/cheveux' : '/melanin-skin'}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D49A63] hover:text-white transition-colors"
                  >
                    Voir l'approche complète <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Detailed Features Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(activeTab === 'hair' ? hairFeatures : skinFeatures).map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] shadow-xs hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-6 h-6 rounded-full bg-[#C8753D]/10 text-[#C8753D] flex items-center justify-center text-xs font-bold group-hover:bg-[#C8753D] group-hover:text-white transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-serif-title font-bold text-sm text-[#111111] group-hover:text-[#C8753D] transition-colors">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[#111111]/75 leading-relaxed font-light pl-8">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex flex-wrap gap-4 items-center">
                {activeTab === 'hair' ? (
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    href="/diagnostic/cheveux"
                    className="px-8 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm tracking-wide shadow-md shadow-[#C8753D]/20 transition-all flex items-center gap-2"
                  >
                    Explorer les soins cheveux
                    <ArrowRight className="w-4 h-4" />
                  </motion.a>
                ) : (
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    href="/melanin-skin"
                    className="px-8 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-sm tracking-wide shadow-md shadow-[#C8753D]/20 transition-all flex items-center gap-2"
                  >
                    Explorer les soins peau
                    <ArrowRight className="w-4 h-4" />
                  </motion.a>
                )}

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

