import React, { useMemo, useState } from 'react';
import { ProductName } from './EditableRecordName';
import { ShieldCheck, Play, Check, X } from 'lucide-react';

import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter , listFilter } from '../lib/columnFilters';

/**
 * CHANTIER C4 — PORTE DE PUBLICATION (mode proposition).
 *
 * Le scan ne modifie rien : il liste ce que la porte ferait. Chaque
 * décision est appliquée une par une, sur clic admin, et journalisée.
 * Passer en mode automatique sera un arbitrage explicite, pas un défaut.
 */
export const CatalogGatePanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [proposals, setProposals] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Filtres par champ (17/09) : même motif que le reste du catalogue. Le
  // scan peut remonter des dizaines de propositions ; sans filtre, retrouver
  // « les retraits proposés sur la gamme peau » oblige à tout relire.
  const lignes = useMemo(() => proposals ?? [], [proposals]);
  const columnFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', ...listFilter({ key: 'name', rows: lignes, get: (p: any) => p.name, extra: (p: any) => [p.productId] }) },
    { key: 'action', kind: 'enum', get: (p: any) => String(p.action || ''), options: [
      { value: 'publish', label: 'Publier' },
      { value: 'withdraw', label: 'Retirer' },
    ] },
    { key: 'reason', ...listFilter({ key: 'reason', rows: lignes, get: (p: any) => String(p.reason || ''), emptyLabel: 'Motif non précisé' }) },
    { key: 'score', kind: 'numeric', get: (p: any) => (Number.isFinite(Number(p.score)) ? Number(p.score) : NaN) },
  ], [lignes]);
  const [columnFilterState, setColumnFilterState] = useState(() => emptyFilterState(columnFilters));
  const setColumnFilter = (key: string, value: string) => setColumnFilterState(prev => ({ ...prev, [key]: value }));
  const shown = useMemo(
    () => applyColumnFilters(lignes, columnFilters, columnFilterState),
    [lignes, columnFilters, columnFilterState]
  );

  const scan = async () => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/catalog/gate/scan', { method: 'POST', headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Scan impossible.');
      setProposals(body.proposals || []);
      setMessage((body.proposals || []).length === 0 ? 'Aucune décision proposée : le catalogue est aligné avec les critères.' : '');
    } catch (e: any) {
      setMessage(`Échec du scan : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (proposal: any) => {
    setApplying(proposal.productId);
    setMessage('');
    try {
      const response = await fetch('/api/admin/catalog/gate/apply', {
        method: 'POST',
        headers,
        body: JSON.stringify({ productId: proposal.productId, action: proposal.action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Application impossible.');
      setMessage(proposal.action === 'publish'
        ? `« ${proposal.name} » publiée (journalisée).`
        : `« ${proposal.name} » retirée de la boutique → draft (journalisée).`);
      setProposals(current => (current || []).filter(p => p.productId !== proposal.productId));
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-kurla-amber" /> Porte de publication — mode proposition</h3>
        <button type="button" onClick={scan} disabled={busy} className="px-3 py-1.5 rounded-xl bg-kurla-copper text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"><Play className="w-3 h-3" /> {busy ? 'Scan…' : 'Lancer le scan'}</button>
      </div>
      <p className="text-[11px] text-kurla-cream/60">La porte compare chaque fiche aux critères (score KURLA Ready) : elle <span className="text-emerald-300">propose de publier</span> les fiches prêtes encore en brouillon, et <span className="text-rose-300">propose de retirer</span> les fiches publiées devenues non conformes. Rien n'est appliqué sans votre clic ; chaque décision est journalisée. Les fiches test (dérogations) ne sont jamais proposées au retrait.</p>
      {message && <p className="text-[11px] text-kurla-cream/75">{message}</p>}
      {proposals && proposals.length > 0 && (
        <>
          <ColumnFilterStrip
            filters={columnFilters}
            state={columnFilterState}
            onChange={setColumnFilter}
            onReset={() => setColumnFilterState(emptyFilterState(columnFilters))}
            total={lignes.length}
            shown={shown.length}
          />
          <div className="space-y-1.5">
            {shown.map(proposal => (
            <div key={`${proposal.productId}-${proposal.action}`} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${proposal.action === 'publish' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{proposal.action === 'publish' ? 'publier' : 'retirer'}</span>
              <ProductName id={proposal.productId} label={proposal.name} headers={headers} className="text-xs font-semibold" />
              <span className="text-kurla-cream/55 flex-1 min-w-[160px]">{proposal.reason}</span>
              <span className="text-kurla-cream/40">score {proposal.score}/100</span>
              <button type="button" onClick={() => apply(proposal)} disabled={applying === proposal.productId} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold hover:bg-kurla-copper/25 disabled:opacity-40 flex items-center gap-1">
                {applying === proposal.productId ? '…' : <><Check className="w-2.5 h-2.5" /> Appliquer</>}
              </button>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="text-[11px] text-kurla-cream/45">Aucune proposition ne correspond à ces filtres.</p>
          )}
          </div>
        </>
      )}
      {proposals && proposals.length === 0 && !message && <p className="text-[11px] text-emerald-300">Aucune décision en attente.</p>}
    </div>
  );
};
