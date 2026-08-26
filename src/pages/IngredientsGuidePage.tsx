import React from 'react';
import { BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { KURLA_INGREDIENTS } from '../lib/knowledge/products';

export const IngredientsGuidePage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-3">
            <BookOpen className="w-4 h-4" /> Encyclopédie Ingrédients KURLA
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-4">
            Comprendre les Actifs Botaniques & Cosmétiques
          </h1>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            Transparence totale sur nos formulations. Découvrez pourquoi chaque ingrédient est sélectionné et ce qu'il apporte exactement à votre fibre capillaire ou votre peau.
          </p>
        </div>

        {/* Ingredients Grid */}
        <div className="space-y-6">
          {KURLA_INGREDIENTS.map((ing, idx) => (
            <div key={idx} className="p-6 sm:p-8 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#C8753D] text-white text-[10px] font-bold uppercase tracking-wider">
                    {ing.category}
                  </span>
                  <span className="text-xs text-[#111111]/50 font-medium">Origine : {ing.origin}</span>
                </div>

                <h3 className="text-xl font-serif-title font-bold text-[#111111]">
                  {ing.name}
                </h3>

                <p className="text-xs text-[#111111]/70 font-light">
                  <strong className="text-[#111111] font-semibold">Recommandé pour : </strong>
                  {ing.recommendedFor}
                </p>

                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">
                    Bénéfices Scientifiques & Botaniques :
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ing.benefits.map((b, bIdx) => (
                      <span key={bIdx} className="px-3 py-1 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs font-medium text-[#111111] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
