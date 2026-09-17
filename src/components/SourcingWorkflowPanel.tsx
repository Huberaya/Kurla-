import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, History } from 'lucide-react';
import {
  canTransitionSupplyWorkflow,
  SUPPLY_WORKFLOW_LABELS,
  SUPPLY_WORKFLOW_STATES,
  type SupplyWorkflowState,
} from '../lib/supplyModel';

/**
 * WORKFLOW 8 ÉTAPES — l'écran qui manquait (§4, §8 : le moteur et la trace
 * existaient en base, aucune UI ne permettait de s'en servir).
 *
 * Règles du moteur, appliquées ici sans les réinventer :
 *  - seules les transitions légales sont proposées (`canTransitionSupplyWorkflow`) ;
 *  - un refus EXIGE une raison (le bouton est désactivé tant qu'elle est vide) ;
 *  - chaque action est horodatée et attribuée côté serveur
 *    (`sourcing_workflow_events`) — l'historique affiché est cette trace,
 *    jamais une reconstitution.
 */
export const SourcingWorkflowPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/admin/sourcing/candidates', { headers });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Candidats indisponibles.');
        setCandidates(body.candidates || []);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      }
    })();
  }, [headers]);

  const selected = useMemo(() => candidates.find(c => String(c.id) === selectedId) || null, [candidates, selectedId]);

  const loadEvents = async (entityId: string) => {
    try {
      const response = await fetch(`/api/admin/sourcing/workflow/events?entityId=${encodeURIComponent(entityId)}`, { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Historique indisponible.');
      setEvents(body.events || []);
    } catch (e: any) {
      setMessage(`Historique : ${e.message || 'erreur'}`);
    }
  };

  const select = (id: string) => {
    setSelectedId(id);
    setReason('');
    setMessage('');
    if (id) loadEvents(id);
    else setEvents([]);
  };

  // État courant = dernier événement tracé ; sans trace, le candidat n'a
  // encore franchi aucune étape : il est « identifié », pas plus.
  const currentState: SupplyWorkflowState = events.length > 0 && events[0]?.to_state
    ? String(events[0].to_state) as SupplyWorkflowState
    : 'identified';

  const legalTargets = useMemo(
    () => SUPPLY_WORKFLOW_STATES.filter(state => canTransitionSupplyWorkflow(currentState, state)),
    [currentState],
  );

  const filtered = useMemo(() => {
    const low = search.toLowerCase();
    const list = low ? candidates.filter(c => `${c.product || ''} ${c.brand || ''}`.toLowerCase().includes(low)) : candidates;
    return list.slice(0, 60);
  }, [candidates, search]);

  const transition = async (to: SupplyWorkflowState) => {
    if (!selectedId) return;
    if (to === 'refused' && !reason.trim()) {
      setMessage('Un refus exige une raison — c’est une décision tracée.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/sourcing/workflow/transition', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entityType: 'candidate',
          entityId: selectedId,
          from: currentState,
          to,
          reason: to === 'refused' ? reason.trim() : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Transition refusée.');
      const boutiqueNote = body.publishesToBoutique === false || to === 'published' || to === 'active'
        ? ' Enregistré côté porte achat. La boutique ne change pas (catalog_status / isPublishableProduct).'
        : '';
      setMessage(`Transition enregistrée : ${SUPPLY_WORKFLOW_LABELS[currentState]} → ${SUPPLY_WORKFLOW_LABELS[to]}.${boutiqueNote}`);
      setReason('');
      await loadEvents(selectedId);
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><GitBranch className="w-4 h-4 text-kurla-amber" /> Workflow candidat — porte achat (8 étapes)</h3>
      <p className="text-[11px] text-kurla-cream/60">Identifié → En sourcing (fournisseur / évaluation) → Validé (porte achat) → Approuvé → Prêt à publier → Publié / Actif (porte achat ≠ boutique). Une transition n’ouvre pas la boutique. Seules les transitions légales sont proposées ; un refus exige une raison ; chaque action est horodatée et attribuée.</p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un candidat (produit, marque)…" className="w-full px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px]" />
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {filtered.map(candidate => (
              <button key={candidate.id} type="button" onClick={() => select(String(candidate.id))} className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] ${String(candidate.id) === selectedId ? 'bg-kurla-copper/15 border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/5 hover:border-kurla-copper/25'}`}>
                <span className="font-semibold">{candidate.product || candidate.id}</span>
                {candidate.brand && <span className="text-kurla-cream/50"> · {candidate.brand}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[11px] text-kurla-cream/45">Aucun candidat ne correspond.</p>}
          </div>
        </div>

        <div className="space-y-3">
          {selected ? (
            <>
              <p className="text-[12px] font-bold">{selected.product || selected.id} {selected.brand && <span className="text-kurla-cream/50 font-normal">· {selected.brand}</span>}</p>
              <p className="text-[11px]">État actuel : <span className="px-2 py-0.5 rounded-full bg-kurla-copper/15 text-kurla-copper font-bold">{SUPPLY_WORKFLOW_LABELS[currentState]}</span></p>

              <div className="flex flex-wrap gap-1.5">
                {legalTargets.map(target => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => transition(target)}
                    disabled={busy || (target === 'refused' && !reason.trim())}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold disabled:opacity-40 ${target === 'refused' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/75 hover:border-kurla-copper/40'}`}
                  >
                    → {SUPPLY_WORKFLOW_LABELS[target]}
                  </button>
                ))}
                {legalTargets.length === 0 && <p className="text-[11px] text-kurla-cream/45">Aucune transition possible depuis cet état.</p>}
              </div>

              {legalTargets.includes('refused') && (
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Raison du refus (obligatoire)…" className="w-full px-2 py-1.5 rounded-lg bg-kurla-ink border border-rose-400/30 text-[11px]" />
              )}

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-kurla-cream/70 flex items-center gap-1"><History className="w-3 h-3" /> Historique tracé ({events.length})</p>
                {events.slice(0, 10).map(event => (
                  <p key={event.id} className="text-[10px] text-kurla-cream/55">
                    {new Date(event.created_at).toLocaleString('fr-FR')} · {event.from_state ? `${SUPPLY_WORKFLOW_LABELS[event.from_state as SupplyWorkflowState] || event.from_state} → ` : ''}<span className="text-kurla-cream/80 font-semibold">{SUPPLY_WORKFLOW_LABELS[event.to_state as SupplyWorkflowState] || event.to_state}</span>
                    {event.reason && <span className="text-rose-300/80"> — raison : {event.reason}</span>}
                    {event.created_by && <span className="text-kurla-cream/40"> · par {event.created_by}</span>}
                  </p>
                ))}
                {events.length === 0 && <p className="text-[10px] text-kurla-cream/40">Aucune transition tracée — le candidat est à l'étape 1.</p>}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-kurla-cream/45">Sélectionne un candidat pour piloter son workflow.</p>
          )}
          {message && <p className="text-[11px] text-kurla-cream/75">{message}</p>}
        </div>
      </div>
    </div>
  );
};
