import React from 'react';
import { Bot } from 'lucide-react';
import { AI_TRANSPARENCY } from '../lib/ai/guardrails';

/**
 * Badge de transparence IA.
 *
 * Article 50(1) du règlement (UE) 2024/1689, applicable depuis le 2 août 2026 :
 * une personne qui interagit avec un système d'IA doit en être informée, sauf
 * si c'est évident pour une personne raisonnablement informée. Les lignes
 * directrices de la Commission précisent qu'un libellé ambigu ne suffit pas —
 * « Assistant virtuel » ou un simple pictogramme ne constituent pas une
 * information.
 *
 * Le badge est donc volontairement littéral : il dit « intelligence
 * artificielle », il dit que ce n'est pas un humain, et il dit que ce n'est pas
 * un professionnel de santé. Il est rendu à chaque point d'entrée d'une
 * interaction générative, pas seulement sur la page dédiée.
 */
interface AiDisclosureBadgeProps {
  /** Variante compacte pour les en-têtes et les pieds de panneau. */
  compact?: boolean;
  className?: string;
}

export function AiDisclosureBadge({ compact = false, className = '' }: AiDisclosureBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#C8753D]/40 bg-[#C8753D]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#D49A63] ${className}`}
      >
        <Bot className="w-3 h-3" aria-hidden="true" />
        Assistant IA
      </span>
    );
  }

  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-2xl border border-[#C8753D]/30 bg-[#C8753D]/10 p-3 ${className}`}
    >
      <Bot className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#D49A63] mb-1">
          Assistant IA
        </p>
        <p className="text-[11px] leading-relaxed text-[#FFF7EF]/75">{AI_TRANSPARENCY.disclosure}</p>
      </div>
    </div>
  );
}

/**
 * Marqueur apposé sous chaque réponse générée. Article 50(2) : le contenu
 * synthétique doit être signalé de façon lisible par machine ; côté interface,
 * la contrepartie lisible par humain est ce marqueur.
 */
export function AiResponseMarker({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[10px] italic text-[#FFF7EF]/45 ${className}`}>
      {AI_TRANSPARENCY.responseMarker}
    </p>
  );
}
