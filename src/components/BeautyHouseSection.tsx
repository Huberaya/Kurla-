import React from 'react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { HERO_IMAGE, MELANIN_SKIN_IMAGE } from '../data/images';

export const BeautyHouseSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#FFF7EF] text-[#111111] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-16 max-w-[520px]">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-bold block mb-2">
            La Maison KURLA — Éditorial
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-[#111111] leading-tight mb-3">
            Comprendre la beauté afro & multiculturelle.
          </h2>
          <p className="text-sm sm:text-base text-[#111111]/70 font-light leading-relaxed">
            Nous remplaçons la surconsommation et la désinformation par des fondamentaux de soin rigoureux, chaleureux et accessibles.
          </p>
        </div>

        {/* Editorial 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Block 1: Cheveux Texturés */}
          <div className="group rounded-3xl bg-white border border-[#E8E1DA] overflow-hidden shadow-lg hover:shadow-xl transition-all p-8 flex flex-col justify-between">
            <div className="space-y-4 mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
                Dossier 01 — Cheveux Texturés
              </span>
              <h3 className="text-2xl font-serif-title font-bold text-[#111111]">
                Porosité, spirale & scellage d'hydratation.
              </h3>
              <p className="text-sm text-[#111111]/75 font-light leading-relaxed max-w-[520px]">
                Pourquoi les soins classiques échouent souvent sur les cheveux 4C et comment choisir la bonne viscosité de leave-in sans asphyxier le cuir chevelu.
              </p>
            </div>

            <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
              <img loading="lazy" decoding="async"
                src={HERO_IMAGE}
                alt="Cheveux texturés"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <a
              href="/journal/comment-hydrater-cheveux-crepus-secs"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#C8753D] hover:text-[#b06330] group-hover:translate-x-1 transition-all"
            >
              Lire le guide complet <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          {/* Block 2: Peaux Riches en Mélanine */}
          <div className="group rounded-3xl bg-white border border-[#E8E1DA] overflow-hidden shadow-lg hover:shadow-xl transition-all p-8 flex flex-col justify-between">
            <div className="space-y-4 mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
                Dossier 02 — Peaux Riches en Mélanine
              </span>
              <h3 className="text-2xl font-serif-title font-bold text-[#111111]">
                Photoprotection invisible & prévention des taches.
              </h3>
              <p className="text-sm text-[#111111]/75 font-light leading-relaxed max-w-[520px]">
                La mélanine nécessite une protection solaire quotidienne spécifique pour éviter l'assombrissement des marques d'acné et préserver la fermeté.
              </p>
            </div>

            <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
              <img loading="lazy" decoding="async"
                src={MELANIN_SKIN_IMAGE}
                alt="Peau mélaninée"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <a
              href="/journal/spf-peau-noire-eviter-traces-blanches"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#C8753D] hover:text-[#b06330] group-hover:translate-x-1 transition-all"
            >
              Lire le dossier Skincare <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};
