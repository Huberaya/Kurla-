import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HERO_IMAGE, MELANIN_SKIN_IMAGE } from '../data/images';
import { BrandImage } from './BrandImage';
import { Reveal } from './motion/Reveal';

export const BeautyHouseSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFF7EF] text-[#111111] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <div className="mb-14 max-w-[560px]">
          <Reveal>
            <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
              Le journal KURLA
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight mb-3">
              Comprendre ses cheveux et sa peau, enfin expliqués simplement.
            </h2>
            <p className="text-sm sm:text-base text-[#111111]/70 font-light leading-relaxed">
              Des guides clairs et fondés, loin des idées reçues et de la surconsommation : apprenez à lire votre texture, à choisir les bons gestes et les bons produits.
            </p>
          </Reveal>
        </div>

        {/* Grille éditoriale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Dossier cheveux */}
          <Reveal delay={0.05}>
            <a href="/journal" className="group rounded-3xl bg-white border border-[#E8E1DA] overflow-hidden shadow-lg hover:shadow-xl hover:border-[#C8753D] transition-all p-8 flex flex-col justify-between h-full">
              <div className="space-y-4 mb-8">
                <span className="inline-block px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
                  Guide cheveux
                </span>
                <h3 className="text-2xl font-serif-title font-bold text-[#111111] group-hover:text-[#C8753D] transition-colors">
                  Pourquoi vos cheveux crépus restent secs — et comment y remédier.
                </h3>
                <p className="text-sm text-[#111111]/75 font-light leading-relaxed max-w-[520px]">
                  La porosité, la différence entre hydrater et nourrir, et pourquoi beurrer des cheveux secs ne suffit pas. Les gestes qui changent vraiment la donne sur 4C.
                </p>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
                <BrandImage
                  image={HERO_IMAGE}
                  fill
                  ratio={16 / 11}
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="group-hover:scale-105 transition-transform duration-500"
                  wrapperClassName="absolute inset-0"
                />
              </div>

              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#C8753D] group-hover:translate-x-1 transition-all">
                Lire les guides cheveux <ArrowUpRight className="w-4 h-4" />
              </span>
            </a>
          </Reveal>

          {/* Dossier peau */}
          <Reveal delay={0.12}>
            <a href="/journal" className="group rounded-3xl bg-white border border-[#E8E1DA] overflow-hidden shadow-lg hover:shadow-xl hover:border-[#C8753D] transition-all p-8 flex flex-col justify-between h-full">
              <div className="space-y-4 mb-8">
                <span className="inline-block px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
                  Guide peau
                </span>
                <h3 className="text-2xl font-serif-title font-bold text-[#111111] group-hover:text-[#C8753D] transition-colors">
                  Solaire invisible et taches : les réflexes qui marchent sur peau noire.
                </h3>
                <p className="text-sm text-[#111111]/75 font-light leading-relaxed max-w-[520px]">
                  Pourquoi les taches reviennent sans protection solaire, comment choisir un écran qui ne laisse pas de trace blanche, et les bons réflexes au quotidien.
                </p>
              </div>

              <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
                <BrandImage
                  image={MELANIN_SKIN_IMAGE}
                  fill
                  ratio={16 / 11}
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="group-hover:scale-105 transition-transform duration-500"
                  wrapperClassName="absolute inset-0"
                />
              </div>

              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#C8753D] group-hover:translate-x-1 transition-all">
                Lire les guides peau <ArrowUpRight className="w-4 h-4" />
              </span>
            </a>
          </Reveal>

        </div>

      </div>
    </section>
  );
};
