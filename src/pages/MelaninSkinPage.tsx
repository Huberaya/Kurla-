import React from 'react';
import { Sun, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { MELANIN_SKIN_IMAGE } from '../data/mockData';

export const MelaninSkinPage: React.FC = () => {
  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
              <Sun className="w-4 h-4" /> Peaux Riches en Mélanine
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              Éclat Naturel, Anti-Taches & Protection Solaire Invisible
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              Des soins formulés spécifiquement pour la biologie des peaux métissées et foncées : respect de la barrière cutanée, prévention de l'hyperpigmentation et solaires zéro trace.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/diagnostic/peau"
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Faire le Diagnostic Peau (2 min)
              </a>
              <a
                href="/boutique?category=skincare"
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                Voir les produits Skincare Mélanine
              </a>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <img src={MELANIN_SKIN_IMAGE} alt="Melanin skin glow" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* 3 Skincare Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">Pilier 1</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">SPF 50 Incolore Obligatoire</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Les rayons UV stimulent la mélanogenèse et assombrissent les marques d'acné. Appliquer un fluide invisible tous les matins.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">Pilier 2</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Douceur Anti-Inflammatoire</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              Toute agression physique (gommage à gros grains, piercing de bouton) crée une tache. Privilégier la Niacinamide 5% et l'Acide Hyaluronique.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">Pilier 3</span>
            <h3 className="text-base font-bold text-[#111111] mb-2">Hydratation Profonde</h3>
            <p className="text-xs text-[#111111]/70 font-light leading-relaxed">
              La peau foncée déshydratée perd sa réfraction naturelle et devient grisée ou terne. Restaurer les céramides pour révéler l'éclat.
            </p>
          </div>

        </div>

        {/* Dermatologist Guardrail Disclaimer */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111]/70 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#111111] mb-0.5">Disclaimer Cosmétique Prudent :</p>
            <p className="font-light leading-relaxed">
              KURLA Beauty ne promet pas la disparition miracle des taches ou cicatrices profondes. Nos soins accompagnent l'apparence, l'uniformité du teint et le confort cutané. En cas de mélasma sévère ou d'hyperpigmentation étendue, consultez un dermatologue.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
