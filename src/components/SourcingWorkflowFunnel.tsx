import React, { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { SUPPLY_WORKFLOW_LABELS, SUPPLY_WORKFLOW_STATES, type SupplyWorkflowState } from '../lib/supplyModel';

/**
 * CHANTIER 6 — sous-piste ACHAT (8 étapes).
 *
 * Ce n'est PAS l'entonnoir unique : celui-là vit dans « Entonnoir unique —
 * cycle de vie » (Pilotage catalogue), en langage C1. Ici on chiffre la
 * porte achat (`sourcing_workflow_events`). `published` / `active` ici
 * n'ouvrent PAS la boutique.
 */
export const SourcingWorkflowFunnel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [summary, setSummary] = useState<{ candidateTotal: number; prospectTotal: number; stages: Record<string, number> } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/sourcing/workflow/summary', { headers });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Synthèse indisponible.');
        setSummary(body);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      }
    })();
  }, [headers]);

  if (error) return <div className="p-4 rounded-2xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">Entonnoir : {error}</div>;
  if (!summary) return <div className="p-4 rounded-2xl bg-kurla-espresso border border-kurla-cream/10 text-[11px] text-kurla-cream/45">Chargement de l'entonnoir…</div>;

  const maxCount = Math.max(1, ...SUPPLY_WORKFLOW_STATES.map(state => summary.stages[state] || 0));

  return (
    <div className="p-5 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold flex items-center gap-2 text-kurla-cream"><Filter className="w-4 h-4 text-kurla-amber" /> Porte achat — 8 étapes</h3>
        <p className="text-[11px] text-kurla-cream/55">
          {summary.candidateTotal} référence(s) en cours · {summary.prospectTotal} piste(s) pas encore transformées en référence
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        {SUPPLY_WORKFLOW_STATES.map((state: SupplyWorkflowState) => {
          const count = summary.stages[state] || 0;
          const isLast = state === 'active' || state === 'published';
          const isBlocked = state === 'refused';
          return (
            <div key={state} className={`rounded-xl border p-2 text-center ${isBlocked ? 'border-rose-400/25 bg-rose-500/5' : isLast ? 'border-emerald-400/25 bg-emerald-500/5' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
              <p className={`text-lg font-bold ${count > 0 ? 'text-kurla-cream' : 'text-kurla-cream/25'}`}>{count}</p>
              <p className="text-[9px] leading-tight text-kurla-cream/55 mt-0.5">{SUPPLY_WORKFLOW_LABELS[state]}</p>
              <div className="h-1 rounded-full bg-kurla-cream/10 mt-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${isBlocked ? 'bg-rose-400/60' : 'bg-kurla-copper'}`} style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-kurla-cream/40">
        Porte achat ≠ porte boutique. « Publié / Actif » ici n’écrit pas catalog_status.
        L’entonnoir unique (identifié / sourcing / catalogue / publié / refusé) est le Cycle de vie, onglet Pilotage catalogue.
        État courant = dernière transition tracée ; sans trace = Identifié, jamais une étape devinée.
      </p>
    </div>
  );
};
