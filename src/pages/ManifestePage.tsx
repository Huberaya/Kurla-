import React from 'react';
import { Sparkles, HeartHandshake, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/I18nProvider';

/**
 * Manifeste KURLA.
 *
 * CHANTIER 7.5 : page intégralement traduite (français/anglais). C'est l'une des
 * rares routes dont le corps est disponible dans les deux langues, donc l'une
 * des seules à publier un `hreflang` — voir `routeTranslations.ts`.
 */
export const ManifestePage: React.FC = () => {
  const { t } = useI18n();

  const sections = [
    { title: t('pages.manifesto.p1Title'), body: t('pages.manifesto.p1Body'), Icon: Sparkles },
    { title: t('pages.manifesto.p2Title'), body: t('pages.manifesto.p2Body'), Icon: ShieldCheck },
    { title: t('pages.manifesto.p3Title'), body: t('pages.manifesto.p3Body'), Icon: HeartHandshake },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 bg-kurla-ink text-kurla-cream">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        <div className="text-center max-w-[600px] mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-kurla-copper font-semibold block">
            {t('pages.manifesto.eyebrow')}
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-kurla-cream">
            {t('pages.manifesto.title')}
          </h1>
          <p className="text-base text-kurla-amber font-serif-title italic">
            {t('pages.manifesto.subtitle')}
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-8 shadow-2xl">
          {sections.map(({ title, body, Icon }, index) => (
            <div
              key={title}
              className={`space-y-4 ${index > 0 ? 'pt-6 border-t border-kurla-cream/10' : ''}`}
            >
              <h2 className="text-2xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
                <Icon className="w-5 h-5 text-kurla-copper" /> {title}
              </h2>
              <p className="text-sm sm:text-base text-kurla-cream/80 font-light leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
