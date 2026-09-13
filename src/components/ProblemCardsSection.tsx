import React from 'react';
import { CheckCircle2, Clock3, Sparkles, XCircle } from 'lucide-react';
import type { ProblemCard } from '../lib/knowledge/problemCards';
import { SCIENCE_CONFIDENCE_LABELS } from '../lib/knowledge/hairScience';
import { localizedPath } from '../lib/i18n';
import { useI18n } from '../lib/I18nProvider';

/**
 * Section « Les moyens » — un protocole (faire / éviter / s'attendre) par
 * problème, sourcé, thème clair (pages publiques de savoirs).
 *
 * Sur les pages publiques, les 4 protocoles du pôle sont affichés pour tout
 * le monde ; dans le résultat du diagnostic, seuls ceux du profil déclaré
 * (inconnu = inconnu). Mêmes cartes, deux surfaces — pas de contenu dupliqué.
 */
export const ProblemCardsSection: React.FC<{
  cards: ProblemCard[];
  diagnosticHref: string;
  poleLabel: string;
}> = ({ cards, diagnosticHref, poleLabel }) => {
  const { locale } = useI18n();

  return (
    <section className="mb-14" aria-labelledby="moyens-public">
      <h2 id="moyens-public" className="text-2xl font-serif-title font-bold text-kurla-carbon">
        Les moyens : un protocole par problème
      </h2>
      <p className="mt-1 text-sm text-kurla-carbon/60">
        Ce que faire, ce qu’éviter — et le délai honnête. Les gestes sont sourcés (source en bas de
        chaque carte) : ce qui est mesuré, on le dit ; ce qui ne l’est pas, on ne le promet pas.
      </p>
      <div className="mt-5 space-y-5">
        {cards.map(card => (
          <article key={card.key} className="rounded-3xl bg-white border border-kurla-stone p-6 sm:p-7 shadow-sm">
            <h3 className="text-lg font-serif-title font-semibold text-kurla-carbon">{card.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-kurla-carbon/80">{card.fact}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/60 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Faire</p>
                <ul className="space-y-2 text-xs leading-relaxed text-kurla-carbon/80">
                  {card.faire.map(item => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200/60 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-rose-700">Éviter</p>
                <ul className="space-y-2 text-xs leading-relaxed text-kurla-carbon/80">
                  {card.eviter.map(item => (
                    <li key={item} className="flex gap-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">S’attendre</p>
                <p className="flex gap-2 text-xs leading-relaxed text-kurla-carbon/80">
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  {card.attendre}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-kurla-stone pt-4">
              <span className="rounded-full bg-kurla-copper/10 px-3 py-1 text-[11px] font-semibold text-kurla-copper">
                {SCIENCE_CONFIDENCE_LABELS[card.confidence]}
              </span>
              <span className="text-[11px] text-kurla-carbon/50">{card.source}</span>
            </div>
          </article>
        ))}
      </div>
      <a
        href={localizedPath(diagnosticHref, locale)}
        className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-semibold shadow-md"
      >
        <Sparkles className="w-4 h-4" /> Ces protocoles, appliqués à mon profil — diagnostic {poleLabel}
      </a>
    </section>
  );
};
