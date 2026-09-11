import React, { useState } from 'react';
import { ChevronDown, Clock, Info } from 'lucide-react';
import { FEATURE_VALUE_BY_ID } from '../../data/personalSpace';

interface WhyItMattersProps {
  /** Identifiant de l'outil dans src/data/personalSpace.ts. */
  featureId: string;
  /** Variante « bandeau » en haut de page, ou « encart » compact. */
  variant?: 'banner' | 'card';
  /** Ouvert par défaut (bandeau) ou replié (encart). */
  defaultOpen?: boolean;
}

/**
 * Explique pourquoi un outil existe, avant de demander de s'en servir.
 *
 * Ce composant existe pour une raison simple : un espace personnel rempli de
 * formulaires vides ne donne envie à personne. On n'obtient pas de données en
 * ajoutant des champs, on en obtient en expliquant ce que la personne gagne à
 * les remplir.
 */
export const WhyItMatters: React.FC<WhyItMattersProps> = ({
  featureId,
  variant = 'banner',
  defaultOpen,
}) => {
  const feature = FEATURE_VALUE_BY_ID[featureId];
  const [open, setOpen] = useState(defaultOpen ?? variant === 'banner');

  if (!feature) return null;

  const shell =
    variant === 'banner'
      ? 'rounded-3xl border border-kurla-copper/35 bg-gradient-to-br from-kurla-espresso to-kurla-ink p-6 sm:p-7'
      : 'rounded-2xl border border-kurla-stone bg-kurla-ivory p-5';
  const onDark = variant === 'banner';

  return (
    <section className={shell}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 text-left"
      >
        <span className={onDark ? 'text-kurla-copper mt-0.5' : 'text-kurla-copper mt-0.5'}>
          <Info className="w-4 h-4" />
        </span>
        <span className="flex-1">
          <span
            className={`block text-[10px] uppercase tracking-[0.18em] font-bold ${
              onDark ? 'text-kurla-amber' : 'text-kurla-copper'
            }`}
          >
            Pourquoi c’est important
          </span>
          <span
            className={`block text-base font-semibold mt-1 leading-snug ${
              onDark ? 'text-kurla-cream' : 'text-kurla-carbon'
            }`}
          >
            {feature.promesse}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
            open ? 'rotate-180' : ''
          } ${onDark ? 'text-kurla-amber' : 'text-kurla-copper'}`}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p
            className={`text-sm leading-relaxed ${
              onDark ? 'text-kurla-cream/75' : 'text-kurla-carbon/75'
            }`}
          >
            {feature.pourquoi}
          </p>

          <div>
            <p
              className={`text-[10px] uppercase tracking-[0.16em] font-bold mb-2 ${
                onDark ? 'text-kurla-amber' : 'text-kurla-copper'
              }`}
            >
              Ce que tu gagnes
            </p>
            <ul className="space-y-1.5">
              {feature.gains.map((gain) => (
                <li
                  key={gain}
                  className={`text-[13px] leading-relaxed flex gap-2 ${
                    onDark ? 'text-kurla-cream/85' : 'text-kurla-carbon/85'
                  }`}
                >
                  <span
                    className={`shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full ${
                      onDark ? 'bg-kurla-copper' : 'bg-kurla-copper'
                    }`}
                  />
                  {gain}
                </li>
              ))}
            </ul>
          </div>

          <p
            className={`text-[11.5px] leading-relaxed border-t pt-3 ${
              onDark
                ? 'text-kurla-cream/55 border-kurla-cream/10'
                : 'text-kurla-carbon/55 border-kurla-stone'
            }`}
          >
            <span className="font-semibold">Comment ça marche : </span>
            {feature.mecanisme}
          </p>

          <p
            className={`text-[11px] flex items-center gap-1.5 ${
              onDark ? 'text-kurla-amber' : 'text-[#8b4b24]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {feature.effort} pour en voir le premier effet
          </p>
        </div>
      )}
    </section>
  );
};

export default WhyItMatters;
