import React from 'react';
import { Sun, Sparkles, AlertCircle } from 'lucide-react';
import { MELANIN_SKIN_IMAGE } from '../data/images';
import { BrandImage } from '../components/BrandImage';
import { useI18n } from '../lib/I18nProvider';
import { localizedPath } from '../lib/i18n';
import { CategoryWaitlist } from '../components/CategoryWaitlist';

/**
 * Module « Peaux riches en mélanine ».
 *
 * CHANTIER 7.5 : page intégralement traduite (français/anglais).
 */
export const MelaninSkinPage: React.FC = () => {
  const { locale, t } = useI18n();

  const pillars = [
    { title: t('pages.melaninSkin.p1Title'), body: t('pages.melaninSkin.p1Body') },
    { title: t('pages.melaninSkin.p2Title'), body: t('pages.melaninSkin.p2Body') },
    { title: t('pages.melaninSkin.p3Title'), body: t('pages.melaninSkin.p3Body') },
  ];

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
              <Sun className="w-4 h-4" /> {t('pages.melaninSkin.eyebrow')}
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              {t('pages.melaninSkin.title')}
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              {t('pages.melaninSkin.intro')}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={localizedPath('/diagnostic/peau', locale)}
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> {t('pages.melaninSkin.ctaDiagnostic')}
              </a>
              <a
                href={localizedPath('/boutique?cat=peau', locale)}
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                {t('pages.melaninSkin.ctaShop')}
              </a>
            {/* Le rayon « les soins peau » n'a encore aucun produit publié. Plutôt que
                d'envoyer la visiteuse vers une boutique filtrée qui n'affiche
                rien, on lui propose d'être prévenue. Une adresse capturée vaut
                mieux qu'une promesse creuse. */}
            <div className="pt-2">
              <CategoryWaitlist source="categorie_peau" label="les soins peau" />
            </div>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <BrandImage image={MELANIN_SKIN_IMAGE} ratio={4 / 5} sizes="(max-width: 768px) 100vw, 320px" />
          </div>
        </div>

        {/* 3 Skincare Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {pillars.map((pillar, index) => (
            <div key={pillar.title} className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">
                {t('pages.melaninSkin.pillar')} {index + 1}
              </span>
              <h3 className="text-base font-bold text-[#111111] mb-2">{pillar.title}</h3>
              <p className="text-xs text-[#111111]/70 font-light leading-relaxed">{pillar.body}</p>
            </div>
          ))}
        </div>

        {/* Dermatologist Guardrail Disclaimer */}
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111]/70 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-[#C8753D] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#111111] mb-0.5">{t('pages.melaninSkin.disclaimerTitle')}</p>
            <p className="font-light leading-relaxed">{t('pages.melaninSkin.disclaimerBody')}</p>
          </div>
        </div>

      </div>
    </div>
  );
};
