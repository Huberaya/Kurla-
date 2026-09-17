import React from 'react';
import { ListChecks } from 'lucide-react';
import type { SkinCriteriaChecklist as Checklist, SkinCriteriaItem } from '../lib/skinCriteria';

const TONE: Record<SkinCriteriaItem['status'], string> = {
  ok: 'text-emerald-300',
  missing: 'text-rose-300',
  not_applicable: 'text-kurla-cream/40',
  voluntary_none: 'text-amber-200/80',
};

const MARK: Record<SkinCriteriaItem['status'], string> = {
  ok: '✓',
  missing: '○',
  not_applicable: '—',
  voluntary_none: '·',
};

/**
 * CHANTIER 5 — checklist lecture. Aucun champ saisi ici : les 15 besoins
 * s’écrivent dans ProductNeedsEditor ; les métadonnées dans la fiche catalogue.
 */
export const SkinCriteriaChecklist: React.FC<{ checklist: Checklist; heading?: string }> = ({
  checklist,
  heading = 'Critères Skin',
}) => {
  const besoins = checklist.items.filter(item => item.source !== 'skin_required_metadata');
  const meta = checklist.items.filter(item => item.source === 'skin_required_metadata');

  return (
    <div className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-3 space-y-2">
      <p className="text-[11px] font-bold text-kurla-cream flex items-center gap-1.5">
        <ListChecks className="w-3.5 h-3.5 text-kurla-amber" /> {heading}
        <span className={`ml-auto text-[10px] font-bold ${checklist.complete ? 'text-emerald-300' : 'text-rose-300'}`}>
          {checklist.applicable
            ? (checklist.complete ? 'complet' : `${checklist.missingCount} manquant(s)`)
            : 'non applicables'}
        </span>
      </p>
      {!checklist.applicable && (
        <p className="text-[10px] text-kurla-cream/50">Pas un soin peau — la grille Skin n’est pas empruntée. Aucun critère inventé.</p>
      )}
      {checklist.applicable && (
        <p className="text-[10px] text-kurla-cream/45">
          50 besoins documentés + 15 `SKIN_NEEDS` + `SKIN_REQUIRED_METADATA`. Pas de 16ᵉ besoin, pas de 3ᵉ grille.
        </p>
      )}
      <ul className="space-y-0.5">
        {besoins.map(item => (
          <li key={item.id} className={`text-[10px] ${TONE[item.status]}`}>
            <span className="font-mono mr-1">{MARK[item.status]}</span>
            {item.label}
            {item.status === 'voluntary_none' && <span className="text-kurla-cream/35"> — volontaire</span>}
            {item.status === 'not_applicable' && <span className="text-kurla-cream/30"> — n/a</span>}
          </li>
        ))}
      </ul>
      {checklist.applicable && meta.length > 0 && (
        <details className="text-[10px]">
          <summary className="cursor-pointer text-kurla-amber/80 font-bold">
            Métadonnées Skin ({meta.filter(i => i.status === 'ok').length}/{meta.filter(i => i.required).length || meta.length})
          </summary>
          <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
            {meta.map(item => (
              <li key={item.id} className={TONE[item.status]}>
                <span className="font-mono mr-1">{MARK[item.status]}</span>
                {item.label}
                {item.status === 'not_applicable' && <span className="text-kurla-cream/30"> — fiche catalogue</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
