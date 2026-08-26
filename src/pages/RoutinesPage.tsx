import React from 'react';
import { Sparkles, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { MOCK_ROUTINES } from '../data/mockData';
import { Routine3DProductStage } from '../components/3d/Routine3DProductStage';

export const RoutinesPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-[520px] mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Packs & Synergies de Soin
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF] mb-3">
            Routines Complètes Certifiées.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Élimine l'improvisation : des kits complets formulés en étapes logiques pour des résultats visibles dès les premiers wash days.
          </p>
        </div>

        {/* 3D Visual Accent Banner */}
        <div className="mb-16 rounded-3xl bg-gradient-to-r from-[#1A0F0A] via-[#3A2218]/40 to-[#1A0F0A] border border-[#C8753D]/30 p-8 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs uppercase tracking-widest text-[#D49A63] font-semibold">Méthode LCO / LOC Validée</span>
            <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-[#FFF7EF]">
              L'ordre d'application fait 80% du résultat.
            </h2>
            <p className="text-sm text-[#FFF7EF]/80 font-light leading-relaxed">
              Un bon produit appliqué au mauvais moment sur cheveu sec n'a aucun effet. Nos bundles intègrent le calendrier d'application précis et les fiches d'instructions.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <Routine3DProductStage />
          </div>
        </div>

        {/* Routines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MOCK_ROUTINES.map(routine => (
            <div
              key={routine.id}
              className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 hover:border-[#C8753D]/40 transition-all overflow-hidden p-6 flex flex-col justify-between shadow-xl group"
            >
              <div>
                <div className="relative h-64 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={routine.image}
                    alt={routine.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#050403]/80 backdrop-blur-md text-xs font-semibold text-[#D49A63] border border-[#C8753D]/30">
                    {routine.badge}
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-serif-title font-bold text-[#FFF7EF]">
                    {routine.title}
                  </h3>
                  <p className="text-sm text-[#FFF7EF]/70 font-light leading-relaxed">
                    {routine.subtitle}
                  </p>

                  <div className="space-y-2 pt-4 border-t border-[#FFF7EF]/10">
                    <div className="flex items-center gap-2 text-xs text-[#FFF7EF]/90">
                      <CheckCircle2 className="w-4 h-4 text-[#C8753D]" />
                      <span>{routine.benefit}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#FFF7EF]/60">
                      <Clock className="w-4 h-4 text-[#D49A63]" />
                      <span>{routine.duration}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#FFF7EF]/10 flex items-center justify-between mt-6">
                <div>
                  <span className="text-2xl font-bold text-[#FFF7EF]">{routine.price.toFixed(2)} €</span>
                  {routine.originalPrice && (
                    <span className="text-xs text-[#FFF7EF]/40 line-through ml-2">{routine.originalPrice.toFixed(2)} €</span>
                  )}
                  <span className="text-[10px] text-[#D49A63] block">Économie bundle incluse</span>
                </div>

                <a
                  href={`/routines/${routine.slug}`}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#C8753D] to-[#D49A63] text-white text-xs font-semibold flex items-center gap-2 shadow-lg"
                >
                  Voir la routine complète <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
