import React from 'react';
import { BookOpen, FlaskConical, Sparkles } from 'lucide-react';
import { HAIR_SCIENCE_CARDS, HAIR_SCIENCE_THEMES, SCIENCE_CONFIDENCE_LABELS } from '../lib/knowledge/hairScience';
import { HAIR_PROBLEM_CARDS } from '../lib/knowledge/problemCards';
import { ProblemCardsSection } from '../components/ProblemCardsSection';
import { localizedPath } from '../lib/i18n';
import { useI18n } from '../lib/I18nProvider';

/**
 * Page publique « La science de votre cheveu texturé » — base de savoirs.
 *
 * Chaque carte est un fait sourcé (publication, recommandation
 * professionnelle, donnée communautaire documentée ou expertise
 * formulateurs), groupé par thème. Règle de la maison : sourcée ou
 * absente, jamais inventée — et aucun vocabulaire médical.
 *
 * Les mêmes faits, choisis pour le profil, apparaissent dans le résultat
 * du diagnostic (section « Ce que la science dit de votre cheveu »).
 */
export const HairSciencePage: React.FC = () => {
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
            Ce que la science dit de votre cheveu
          </h1>
          <p className="mt-5 text-sm sm:text-base text-kurla-carbon/75 font-light leading-relaxed max-w-2xl">
            Depuis des décennies, la microscopie, la trichoscopie et la biophysique mesurent ce que
            le cheveu texturé est vraiment : sa section plate, son sébum qui ne voyage pas, ses
            liaisons qui s’écrivent à l’eau. Ces faits sont documentés — mais rarement traduits en
            français pour le grand public. C’est le rôle de cette page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={localizedPath('/diagnostic/cheveux', locale)}
              className="px-6 py-3.5 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-semibold shadow-md flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Mon diagnostic cheveu — ces faits, appliqués à mon profil
            </a>
            <a
              href={localizedPath('/peau/science', locale)}
              className="px-6 py-3.5 rounded-full border border-kurla-copper/40 text-kurla-copper hover:bg-kurla-copper/10 text-xs font-semibold flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Et pour la peau ?
            </a>
          </div>
        </div>

        {/* Cartes groupées par thème */}
        {HAIR_SCIENCE_THEMES.map(theme => (
          <section key={theme.theme} className="mb-14">
            <h2 className="text-2xl font-serif-title font-bold text-kurla-carbon">{theme.label}</h2>
            <p className="mt-1 text-sm text-kurla-carbon/60">{theme.intro}</p>
            <div className="mt-5 space-y-5">
              {HAIR_SCIENCE_CARDS.filter(card => card.theme === theme.theme).map(card => (
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

        {/* Les moyens : protocoles par problème (publics, sourcés) */}
        <ProblemCardsSection cards={HAIR_PROBLEM_CARDS} diagnosticHref="/diagnostic/cheveux" poleLabel="cheveux" />

        {/* Note de méthode */}
        <div className="rounded-3xl border border-kurla-stone bg-kurla-ivory p-6 sm:p-8">
          <h2 className="text-lg font-serif-title font-semibold">Comment nous travaillons</h2>
          <ul className="mt-4 space-y-3 text-sm text-kurla-carbon/75 leading-relaxed">
            <li>— <span className="font-semibold">Sourcée ou absente, jamais inventée.</span> Chaque fait porte sa source ; si la littérature ne le documente pas, il n’est pas ici.</li>
            <li>— <span className="font-semibold">Des niveaux de confiance affichés.</span> Recherche publiée, recommandation professionnelle, données communautaires documentées, expertise formulateurs : vous savez ce sur quoi vous vous appuyez.</li>
            <li>— <span className="font-semibold">Des gestes, pas des prescriptions.</span> Ce que la science décrit est traduit en gestes concrets dans le diagnostic KURLA — pas en protocole médical. Si une situation vous inquiète, un professionnel de santé est la bonne porte.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};
