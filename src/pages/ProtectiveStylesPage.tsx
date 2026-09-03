import React from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, HeartHandshake } from 'lucide-react';
import { PROTECTIVE_IMAGE } from '../data/images';
import { BrandImage } from '../components/BrandImage';
import { useI18n } from '../lib/I18nProvider';
import { localizedPath } from '../lib/i18n';

/**
 * Module « Coiffures protectrices ».
 *
 * CHANTIER 7.5 : page intégralement traduite (français/anglais). Les listes
 * d'alarme et de gestes immédiats sont traduites telles quelles : ce sont des
 * consignes de sécurité, leur sens ne doit pas dériver d'une langue à l'autre.
 */
export const ProtectiveStylesPage: React.FC = () => {
  const { locale, t } = useI18n();

  const alarms = [
    t('pages.protectiveStyles.alarm1'),
    t('pages.protectiveStyles.alarm2'),
    t('pages.protectiveStyles.alarm3'),
  ];
  const actions = [
    t('pages.protectiveStyles.action1'),
    t('pages.protectiveStyles.action2'),
    t('pages.protectiveStyles.action3'),
  ];
  const phases = [
    { title: t('pages.protectiveStyles.phase1Title'), body: t('pages.protectiveStyles.phase1Body') },
    { title: t('pages.protectiveStyles.phase2Title'), body: t('pages.protectiveStyles.phase2Body') },
    { title: t('pages.protectiveStyles.phase3Title'), body: t('pages.protectiveStyles.phase3Body') },
  ];

  return (
    <div className="pt-28 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero Header */}
        <div className="rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA] p-8 sm:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8753D]/10 text-[#C8753D] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> {t('pages.protectiveStyles.eyebrow')}
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-[#111111]">
              {t('pages.protectiveStyles.title')}
            </h1>
            <p className="text-sm sm:text-base text-[#111111]/75 font-light leading-relaxed">
              {t('pages.protectiveStyles.intro')}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={localizedPath('/diagnostic/protective-style', locale)}
                className="px-6 py-3.5 rounded-full bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> {t('pages.protectiveStyles.ctaDiagnostic')}
              </a>
              <a
                href={localizedPath('/professionnels', locale)}
                className="px-6 py-3.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] hover:border-[#C8753D] text-[#111111] text-xs font-semibold flex items-center gap-2"
              >
                <HeartHandshake className="w-4 h-4 text-[#C8753D]" /> {t('pages.protectiveStyles.ctaFindPro')}
              </a>
            </div>
          </div>

          <div className="w-full md:w-80 aspect-[4/5] rounded-3xl overflow-hidden border border-[#E8E1DA] shrink-0 shadow-md">
            <BrandImage image={PROTECTIVE_IMAGE} ratio={4 / 5} sizes="(max-width: 768px) 100vw, 320px" />
          </div>
        </div>

        {/* Guide « Mes tresses sont-elles trop serrées ? » */}
        <div className="p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8E1DA] mb-12 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif-title font-bold text-[#111111]">
                {t('pages.protectiveStyles.alertTitle')}
              </h2>
              <p className="text-xs text-[#111111]/60 font-light">
                {t('pages.protectiveStyles.alertIntro')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-950">
              <span className="font-bold block mb-1">{t('pages.protectiveStyles.alarmTitle')}</span>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                {alarms.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
              <span className="font-bold block mb-1">{t('pages.protectiveStyles.actionTitle')}</span>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                {actions.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* 3 Phases Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {phases.map((phase, index) => (
            <div key={phase.title} className="p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
              <span className="text-[10px] uppercase font-bold text-[#C8753D] block mb-1">
                {t('pages.protectiveStyles.phase')} {index + 1}
              </span>
              <h3 className="text-base font-bold text-[#111111] mb-2">{phase.title}</h3>
              <p className="text-xs text-[#111111]/70 font-light leading-relaxed">{phase.body}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
