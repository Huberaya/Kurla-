import React from 'react';
import { Sparkles, Scissors, ShieldCheck, ArrowRight } from 'lucide-react';
import { MEN_GROOMING_IMAGE } from '../data/mockData';

export const MenGroomingPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] text-white text-xs font-semibold">
              <Scissors className="w-4 h-4 text-[#C8753D]" /> Hommes Grooming & Barbershop
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              Waves, Barbe Hydratée, Locks & Soin Anti-Boutons de Rasage
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              La routine épurée en 3 étapes pour hommes : entretien du contour, barbe souple sans poil incarné et cuir chevelu assaini sous le durag.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/professionnels?category=barber"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Scissors className="w-4 h-4" /> Trouver un Barber KURLA Pro
              </a>
              <a
                href="/assistant-beaute"
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                Poser une question Barbe / Waves
              </a>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <img src={MEN_GROOMING_IMAGE} alt="Men grooming waves and beard" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* 3 Step Routine Men */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            <span className="text-xs font-bold text-[#C8753D] uppercase block mb-1">Étape 1</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Nettoyer & Apaiser le Rasage</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Utiliser la lotion florale apaisante pour refermer les pores et prévenir les boutons de rasage et poils incarnés sur le col.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            <span className="text-xs font-bold text-[#C8753D] uppercase block mb-1">Étape 2</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Hydrater la Barbe & Waves</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Quelques gouttes d'huile de jojoba & baobab massées du menton jusqu'aux racines pour assouplir le poil dur.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA]">
            <span className="text-xs font-bold text-[#C8753D] uppercase block mb-1">Étape 3</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Brosser & Compresser (Durag)</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Passer la brosse en poil de sanglier doux pour plaquer les waves et poser le durag en satin pour fixer la mémoire de forme.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
