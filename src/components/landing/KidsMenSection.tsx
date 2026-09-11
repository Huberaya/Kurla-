import React from 'react';
import { ArrowRight, UserCheck, Baby, ShieldAlert, Check, Users, Sparkles } from 'lucide-react';
import { MEN_GROOMING_IMAGE, KIDS_CARE_IMAGE } from '../../data/images';
import { BrandImage } from '../BrandImage';
import { Reveal } from '../motion/Reveal';

export const KidsMenSection: React.FC = () => {
  const menNow = [
    'Éponge twist / curl sponge',
    'Durag satin & bonnets',
    'Mousse twist & lock',
    'Entretien locks & vanilles',
  ];
  const menSoon = ['Soins barbe & rasage', 'Solaire visage invisible'];

  const kidsNow = [
    'Diagnostic cheveux enfant gratuit',
    'Conseils de coiffage sans larmes',
    'Espace famille pour plusieurs profils',
  ];
  const kidsSoon = ['Shampoing & démêlant kids', 'Accessoires adaptés dès 3 ans'];

  return (
    <section className="py-24 bg-kurla-ivory text-kurla-carbon relative overflow-hidden border-t border-kurla-stone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Reveal>
            <span className="text-xs uppercase tracking-widest text-kurla-copper font-bold block mb-2">
              Toute la famille
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif-title font-bold text-kurla-carbon leading-tight mb-4">
              Des espaces dédiés aux hommes et aux enfants.
            </h2>
            <p className="text-base text-kurla-carbon/75 font-light leading-relaxed max-w-[580px] mx-auto">
              Cheveux courts, waves, locks ou barbe pour lui ; routines douces et coiffage sans larmes pour les plus petits. On vous dit ce qui est disponible dès maintenant et ce qui arrive.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Hommes */}
          <Reveal delay={0.1}>
            <div className="group rounded-3xl bg-kurla-sand border border-kurla-stone hover:border-kurla-copper overflow-hidden p-8 shadow-sm hover:shadow-xl transition-all flex flex-col h-full">
              <div className="flex items-center justify-between mb-5">
                <span className="px-3.5 py-1.5 rounded-full bg-kurla-carbon text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <UserCheck className="w-4 h-4 text-kurla-amber" /> Espace Hommes
                </span>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Disponible</span>
              </div>

              <h3 className="text-2xl font-serif-title font-bold text-kurla-carbon mb-2">
                Cheveux courts, twists, waves &amp; locks.
              </h3>
              <p className="text-sm text-kurla-carbon/75 font-light leading-relaxed mb-5">
                Les outils et coiffants les plus recherchés sont déjà là pour des coils nets en quelques minutes. Les soins barbe et visage arrivent bientôt.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">En précommande maintenant</p>
                  <div className="grid grid-cols-2 gap-2">
                    {menNow.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs font-medium text-kurla-carbon">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Bientôt
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {menSoon.map((item) => (
                      <span key={item} className="px-2.5 py-1 rounded-full bg-white border border-kurla-stone text-[11px] text-kurla-carbon/70">{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative h-44 rounded-2xl overflow-hidden mb-6 bg-kurla-espresso">
                <BrandImage image={MEN_GROOMING_IMAGE} fill ratio={16 / 9} sizes="(max-width: 1024px) 100vw, 33vw" className="group-hover:scale-105 transition-transform duration-500" wrapperClassName="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <a href="/hommes" className="w-full py-4 rounded-full bg-kurla-carbon hover:bg-kurla-copper text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-md mt-auto">
                <span>Découvrir l’espace Hommes</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Reveal>

          {/* Enfants */}
          <Reveal delay={0.2}>
            <div className="group rounded-3xl bg-kurla-cream border border-kurla-stone hover:border-kurla-copper overflow-hidden p-8 shadow-sm hover:shadow-xl transition-all flex flex-col h-full">
              <div className="flex items-center justify-between mb-5">
                <span className="px-3.5 py-1.5 rounded-full bg-kurla-copper text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <Baby className="w-4 h-4 text-white" /> Espace Kids
                </span>
                <span className="text-xs font-bold text-kurla-copper uppercase tracking-wider">Conseils ouverts</span>
              </div>

              <h3 className="text-2xl font-serif-title font-bold text-kurla-carbon mb-2">
                Coiffer son enfant sans larmes.
              </h3>
              <p className="text-sm text-kurla-carbon/75 font-light leading-relaxed mb-5">
                Le diagnostic et les conseils pour les cheveux des enfants sont déjà là et gratuits. Une gamme de soins très douce, dès 3 ans, arrive en boutique.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">Disponible maintenant</p>
                  <div className="space-y-2">
                    {kidsNow.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs font-medium text-kurla-carbon">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Bientôt en boutique
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {kidsSoon.map((item) => (
                      <span key={item} className="px-2.5 py-1 rounded-full bg-white border border-kurla-stone text-[11px] text-kurla-carbon/70">{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative h-44 rounded-2xl overflow-hidden mb-4 bg-kurla-espresso">
                <BrandImage image={KIDS_CARE_IMAGE} fill ratio={16 / 9} sizes="(max-width: 1024px) 100vw, 33vw" className="group-hover:scale-105 transition-transform duration-500" wrapperClassName="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Les produits kids indiqueront l’âge minimum (dès 3 ans) et les précautions d’emploi.</span>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <a href="/kids" className="w-full py-4 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-md">
                  <span>Découvrir l’espace Kids</span><ArrowRight className="w-4 h-4" />
                </a>
                <a href="/famille" className="w-full py-3.5 rounded-full border border-kurla-copper/40 text-kurla-copper hover:bg-kurla-copper/10 font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" /> Créer un espace Famille
                </a>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
};
