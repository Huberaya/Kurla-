import React from 'react';
import { BookOpen, FlaskConical, Sparkles } from 'lucide-react';
import { SKIN_SCIENCE_CARDS, SKIN_SCIENCE_THEMES } from '../lib/knowledge/skinScience';
import { SCIENCE_CONFIDENCE_LABELS } from '../lib/knowledge/hairScience';
import { localizedPath } from '../lib/i18n';
import { useI18n } from '../lib/I18nProvider';

/**
 * Page publique « La science des peaux riches en mélanine » — base de
 * savoirs. Miroir exact de HairSciencePage (13/09/2026).
 *
 * Chaque carte est un fait sourcé, groupé par thème. Règle de la maison :
 * sourcée ou absente, jamais inventée — et aucun vocabulaire médical
 * (les taches, la sécheresse et la sensibilité sont traitées en
 * langage d’entretien de la peau, pas en nosologie).
 *
 * Les mêmes faits, choisis pour le profil, apparaissent dans le
 * résultat du diagnostic (section « Ce que la science dit de votre peau »).
 */
export const SkinSciencePage: React.FC = () => {
  const { locale } = useI18n();

  return (
    <div className="pt-28 pb-24 bg-kurla-ivory text-kurla-carbon min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="rounded-3xl bg-kurla-sand border border-kurla-stone p-8 sm:p-12 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-kurla-copper/10 text-kurla-copper text-xs font-semibold mb-6">
            <FlaskConical className="w-4 h-4" /> La base de savoirs KURLA — sourcée ou absente
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold text-kurla-carbon">
            Ce que la science dit de votre peau
          </h1>
          <p className="mt-5 text-sm sm:text-base text-kurla-carbon/75 font-light leading-relaxed max-w-2xl">
            Les peaux riches en mélanine ont une protection naturelle réelle — et des problèmes
            spécifiques que les référentiels classiques ne voient pas toujours : les taches qui
            restent des années, la lumière qui assombrit, le frottement qui marque, la barrière
            qui tire. Ces faits sont mesurés dans la littérature dermatologique ; cette page les
            traduit en français, sans jargon.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={localizedPath('/diagnostic/peau', locale)}
              className="px-6 py-3.5 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-semibold shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Mon diagnostic peau — ces faits, appliqués à mon profil
            </a>
            <a
              href={localizedPath('/cheveux/science', locale)}
              className="px-6 py-3.5 rounded-full border border-kurla-copper/40 text-kurla-copper hover:bg-kurla-copper/10 text-xs font-semibold flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Et pour les cheveux ?
            </a>
          </div>
        </div>

        {/* Cartes groupées par thème */}
        {SKIN_SCIENCE_THEMES.map(theme => (
          <section key={theme.theme} className="mb-14">
            <h2 className="text-2xl font-serif-title font-bold text-kurla-carbon">{theme.label}</h2>
            <p className="mt-1 text-sm text-kurla-carbon/60">{theme.intro}</p>
            <div className="mt-5 space-y-5">
              {SKIN_SCIENCE_CARDS.filter(card => card.theme === theme.theme).map(card => (
                <article key={card.key} className="rounded-3xl bg-kurla-sand border border-kurla-stone p-6 sm:p-7">
                  <h3 className="text-lg font-serif-title font-semibold text-kurla-carbon">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-kurla-carbon/80">{card.fact}</p>
                  <p className="mt-4 text-xs leading-relaxed text-kurla-carbon/55">
                    <span className="font-semibold text-kurla-carbon/70">Le mécanisme — </span>{card.mechanism}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-kurla-stone pt-4">
                    <span className="rounded-full bg-kurla-copper/10 px-3 py-1 text-[11px] font-semibold text-kurla-copper">
                      {SCIENCE_CONFIDENCE_LABELS[card.confidence]}
                    </span>
                    <span className="text-[11px] text-kurla-carbon/50">{card.source}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* Note de méthode */}
        <div className="rounded-3xl border border-kurla-stone bg-kurla-ivory p-6 sm:p-8">
          <h2 className="text-lg font-serif-title font-semibold">Comment nous travaillons</h2>
          <ul className="mt-4 space-y-3 text-sm text-kurla-carbon/75 leading-relaxed">
            <li>— <span className="font-semibold">Sourcée ou absente, jamais inventée.</span> Chaque fait porte sa source ; si la littérature ne le documente pas, il n’est pas ici.</li>
            <li>— <span className="font-semibold">Des niveaux de confiance affichés.</span> Recherche publiée, recommandation professionnelle, données communautaires documentées, expertise formulateurs : vous savez ce sur quoi vous vous appuyez.</li>
            <li>— <span className="font-semibold">Des gestes, pas des prescriptions.</span> Ce que la science décrit est traduit en gestes concrets dans le diagnostic KURLA — pas en protocole médical. Si une situation vous inquiète (taches persistantes, démangeaisons continues, éruption), un professionnel de santé est la bonne porte.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};
