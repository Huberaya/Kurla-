import React from 'react';
import { Sparkles, HeartHandshake, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const ManifestePage: React.FC = () => {
  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        <div className="text-center max-w-[600px] mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block">
            Le Manifeste KURLA Beauty
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#FFF7EF]">
            La beauté texturée, enfin comprise.
          </h1>
          <p className="text-base text-[#D49A63] font-serif-title italic">
            Pour une beauté afro & multiculturelle valorisée, sans compromis ni stéréotypes.
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 space-y-8 shadow-2xl">
          <div className="space-y-4">
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C8753D]" /> 01. Fin de l'improvisation
            </h2>
            <p className="text-sm sm:text-base text-[#FFF7EF]/80 font-light leading-relaxed">
              Pendant des décennies, les cheveux crépus, bouclés, locksés et les peaux riches en mélanine ont été cantonnés à des rayons "exotiques" au fond des supermarchés. KURLA redéfinit les standards en associant la science de la porosité à la chaleur du soin transmis.
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-[#FFF7EF]/10">
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#C8753D]" /> 02. Transparence et Charte Qualité Pro
            </h2>
            <p className="text-sm sm:text-base text-[#FFF7EF]/80 font-light leading-relaxed">
              Nos partenaires coiffeurs, braiders et locticians signent une charte stricte : pas de tiraillement excessif de la racine, aucun jugement sur la texture au naturel et hygiène rigoureuse du matériel.
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-[#FFF7EF]/10">
            <h2 className="text-2xl font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-[#C8753D]" /> 03. Ethique et Transparence Non Médicale
            </h2>
            <p className="text-sm sm:text-base text-[#FFF7EF]/80 font-light leading-relaxed">
              KURLA propose des recommandations beauté cosmétiques. Nous ne dispensons pas de diagnostics médicaux. Si une problématique cutanée ou un problème d'alopécie nécessite une prise en charge médicale, nous orientons la communauté vers des médecins ou dermatologues qualifiés.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
