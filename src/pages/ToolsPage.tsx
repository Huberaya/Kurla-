import React from 'react';
import { BookOpen, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { KURLA_TOOLS } from '../lib/knowledge/tools';

export const ToolsPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold mb-3">
            <BookOpen className="w-4 h-4" /> Matériel & Accessoires Indispensables
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111] mb-4">
            Guide Complet des Outils Capillaires
          </h1>
          <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
            Un bon produit ne fonctionne pas sans le bon geste et le bon outil. Découvrez à quoi sert chaque accessoire, comment et quand l’utiliser.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {KURLA_TOOLS.map((tool) => (
            <div key={tool.id} className="rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] overflow-hidden shadow-xs hover:border-[#C8753D] transition-all flex flex-col justify-between group">
              <div>
                <div className="h-48 overflow-hidden relative">
                  <img src={tool.image} alt={tool.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#111111]/80 backdrop-blur-md text-white text-[10px] uppercase font-bold tracking-wider">
                    {tool.category}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-serif-title font-bold text-[#111111]">
                    {tool.name}
                  </h3>

                  <div className="text-xs space-y-1.5">
                    <div>
                      <span className="font-bold text-[#C8753D]">Pour qui : </span>
                      <span className="text-[#111111]/80 font-light">{tool.forWho}</span>
                    </div>
                    <div>
                      <span className="font-bold text-[#111111]">Quand l'utiliser : </span>
                      <span className="text-[#111111]/80 font-light">{tool.whenToUse}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8E1DA]/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/60 block mb-1">
                      Bénéfices principaux :
                    </span>
                    <ul className="list-disc list-inside text-xs text-[#111111]/75 space-y-0.5">
                      {tool.benefits.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <span className="font-bold block mb-0.5">⚠️ Erreur à éviter :</span>
                    <span>{tool.errorsToAvoid}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <a
                  href="/boutique?category=accessoires"
                  className="w-full py-2.5 rounded-xl bg-[#F8F2EC] hover:bg-[#C8753D] text-[#111111] hover:text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Voir les modèles en boutique
                </a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
