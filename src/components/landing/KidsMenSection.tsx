import React from 'react';
import { ArrowRight, UserCheck, Baby, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { MEN_GROOMING_IMAGE, KIDS_CARE_IMAGE } from '../../data/mockData';
import { Reveal } from '../motion/Reveal';

export const KidsMenSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFFDF9] text-[#111111] relative overflow-hidden border-t border-[#E8E1DA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal>
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
              Des univers dédiés à chaque membre de la famille
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight mb-4">
              Des routines pensées spécifiquement pour les hommes et les enfants.
            </h2>
            <p className="text-base text-[#111111]/75 font-light leading-relaxed max-w-[580px] mx-auto">
              Parce que les besoins masculins et la sensibilité des cuirs chevelus des enfants requièrent des soins adaptés, sans compromis sur la sécurité.
            </p>
          </Reveal>
        </div>

        {/* 2 Big Focus Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Men Column */}
          <Reveal delay={0.1}>
            <div className="group rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] hover:border-[#C8753D] overflow-hidden p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full">
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <UserCheck className="w-4 h-4 text-[#D49A63]" /> Espace KURLA Homme
                  </span>
                  <span className="text-xs font-bold text-[#C8753D] uppercase tracking-wider">Grooming & Care</span>
                </div>

                <h3 className="text-2xl font-serif-title font-bold text-[#111111] mb-3">
                  Barbe, rasage précis, cuirs chevelus courts & waves.
                </h3>
                <p className="text-sm text-[#111111]/75 font-light leading-relaxed mb-6">
                  Finis les boutons de rasage et la peau qui tire. Une gamme d'huiles de barbe non grasses, de soins anti-poils incarnés et de protections solaires mates.
                </p>

                {/* Feature Bullet Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    "Baumes apaisants rasage",
                    "Huiles de pousse barbe",
                    "Anti-poils incarnés mâchoire",
                    "Soins waves & cuirs chevelus",
                    "Shampooings barbe purifiants",
                    "SPF30+ invisible effet mat"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-[#111111]">
                      <span className="w-4 h-4 rounded-full bg-[#C8753D]/20 text-[#C8753D] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Visual Image Banner */}
                <div className="relative h-48 rounded-2xl overflow-hidden mb-6 bg-[#1A0F0A]">
                  <img
                    src={MEN_GROOMING_IMAGE}
                    alt="Soins hommes grooming"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
              </div>

              <a
                href="/hommes"
                className="w-full py-4 rounded-full bg-[#111111] hover:bg-[#C8753D] text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Découvrir l'espace Hommes Grooming</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Reveal>

          {/* Kids Column */}
          <Reveal delay={0.2}>
            <div className="group rounded-3xl bg-[#FFF7EF] border border-[#E8E1DA] hover:border-[#C8753D] overflow-hidden p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full">
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-6">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#C8753D] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <Baby className="w-4 h-4 text-white" /> Espace KURLA Kids (Dès 3 ans)
                  </span>
                  <span className="text-xs font-bold text-[#C8753D] uppercase tracking-wider">Douceur Sans Larmes</span>
                </div>

                <h3 className="text-2xl font-serif-title font-bold text-[#111111] mb-3">
                  Coiffage doux, démêlants magiques & bonnets satin.
                </h3>
                <p className="text-sm text-[#111111]/75 font-light leading-relaxed mb-6">
                  Transformez la séance coiffage en un moment de complicité sans larmes ni cris. Des formules douces à la guimauve et au karité bio.
                </p>

                {/* Feature Bullet Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    "Shampooings doux sans sulfates",
                    "Sprays démêlants instantanés",
                    "Bonnets satin taille enfant",
                    "Laits hydratants guimauve",
                    "Brosses démêlantes souples",
                    "Protection solaire pédiatrique"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-medium text-[#111111]">
                      <span className="w-4 h-4 rounded-full bg-[#C8753D]/20 text-[#C8753D] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Visual Image Banner */}
                <div className="relative h-48 rounded-2xl overflow-hidden mb-6 bg-[#1A0F0A]">
                  <img
                    src={KIDS_CARE_IMAGE}
                    alt="Soins enfants kids haircare"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
              </div>

              {/* Safety Disclaimer */}
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tous les produits Kids mentionnent l'âge minimum recommandé (dès 3 ans) et les précautions d'emploi.</span>
              </div>

              <a
                href="/kids"
                className="w-full py-4 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <span>Découvrir l'espace KURLA Kids</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Reveal>

        </div>

      </div>
    </section>
  );
};
