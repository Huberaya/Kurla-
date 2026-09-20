/**
 * D13 (20/09) — concision d'abord : les réponses du diagnostic sont justes
 * mais longues. Règle : la première phrase (l'action concrète) reste visible,
 * la suite se déplie par « Plus ». Rien n'est coupé ni réécrit — rien n'est
 * perdu : le texte intégral est derrière le bouton, à un clic.
 *
 * `splitLead` est une fonction pure (banc dédié) ; les composants ne font que
 * la présenter. Peau et cheveux partagent le même rendu (DiagnosticResultPage).
 */
import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface LeadSplit {
  lead: string;
  rest: string;
}

/**
 * Première phrase = lead. En dessous de `minVisible` caractères, tout tient
 * dans la ligne : pas d'expansion. Si la première phrase déborde trop
 * (plus de 1,7× `softMax`), on cède à la dernière incise (« ; » ou « — »)
 * avant softMax — une incise se lit seule, une demi-phrase non ; sinon la
 * phrase entière reste lead. Jamais de coupure en milieu de mot.
 */
export function splitLead(text: string, softMax = 175, minVisible = 140): LeadSplit {
  const t = String(text ?? '').trim();
  if (t.length <= minVisible) return { lead: t, rest: '' };
  // Fin de première phrase : [.!?…] suivi d'espace puis d'une majuscule, d'un
  // guillemet ouvrant ou d'une apostrophe typographique (« Je…'Ainsi' » rare).
  const boundary = /[.!?…]\s+(?=[A-ZÀ-ÖØ-Þ«"‘'])/;
  const m = boundary.exec(t);
  const sentenceCut = m ? m.index + 1 : -1;
  let cut = -1;
  if (sentenceCut !== -1 && sentenceCut <= 215) cut = sentenceCut;
  if (cut === -1) {
    // phrase (trop) longue : couper à la dernière incise (« ; » ou « — ») qui
    // tient dans softMax — une incise se lit seule, une demi-phrase non.
    let best = -1;
    for (const delim of [' ; ', ' — ']) {
      let from = 0;
      for (;;) {
        const i = t.indexOf(delim, from);
        if (i === -1 || i > softMax || i < 45) break;
        best = Math.max(best, i);
        from = i + 1;
      }
      if (best !== -1) break;
    }
    if (best !== -1) cut = best;
    else if (sentenceCut !== -1) cut = sentenceCut; // pas d'incise : la phrase entière, jamais un tronçon
  }
  if (cut === -1 || cut >= t.length - 55) return { lead: t, rest: '' };
  const lead = t.slice(0, cut).trimEnd();
  let rest = t.slice(lead.length).trimStart();
  // une coupe sur incise laisse traîner le séparateur côté suite : on le retire
  rest = rest.replace(/^[;—–]\s*/, '');
  return { lead, rest };
}

/** Un paragraphe long : première phrase visible, le reste derrière « Plus ». */
export const LeadBlock: React.FC<{ text: string; className?: string; softMax?: number }> = ({ text, className = '', softMax }) => {
  const { lead, rest } = splitLead(text, softMax);
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!rest || rest.trim().length < 55) return <p className={className}>{text.trim()}</p>;
  return (
    <div className={className}>
      <p>{lead}</p>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-kurla-copper hover:text-kurla-amber"
      >
        {open ? 'Moins' : 'Plus'}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <p id={id} className="mt-1 opacity-90">{rest}</p>}
    </div>
  );
};
