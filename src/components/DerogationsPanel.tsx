import React, { useEffect, useMemo, useState } from 'react';
import { ProductName } from './EditableRecordName';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter , listFilter } from '../lib/columnFilters';
import { ShieldAlert, Mail, RotateCcw } from 'lucide-react';

/**
 * CHANTIER C5 — DÉROGATIONS DATÉES.
 *
 * Les fiches hors critères maintenues en vitrine sont des choix explicites :
 * motif, décideur, expiration. Le panneau rouge signale ce qui expire ;
 * renouveler est un acte admin ; le récapitulatif part par e-mail sur clic.
 */
export const DerogationsPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Filtres par champ (17/09) : avec des dizaines de dérogations datées,
  // trouver « celles qui expirent » en faisant défiler n'est pas tenable.
  // Même calcul partagé que partout ailleurs (src/lib/columnFilters).
  const DEROGATION_FILTER_KEYS = ['name', 'reason', 'state', 'expires'] as const;
  const derogationFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', ...listFilter({ key: 'name', rows, get: (row: any) => row.name }) },
    { key: 'reason', ...listFilter({ key: 'reason', rows, get: (row: any) => row.reason, emptyLabel: 'Motif non précisé' }) },
    { key: 'state', kind: 'enum', get: (row: any) => row.state, options: [
      { value: 'active', label: 'Active' },
      { value: 'expiring_soon', label: 'Expire bientôt' },
      { value: 'expired', label: 'Expirée' },
    ] },
    { key: 'expires', kind: 'text', get: (row: any) => (row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('fr-FR') : ''), everyWord: false },
  ], [rows]);
  const [derogationFilterState, setDerogationFilterState] = useState(() => emptyFilterState(DEROGATION_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visibleRows = useMemo(() => applyColumnFilters(rows, derogationFilters, derogationFilterState), [rows, derogationFilters, derogationFilterState]);

  const load = async () => {
    try {
      const response = await fetch('/api/admin/catalog/derogations', { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Dérogations indisponibles.');
      setRows(body.rows || []);
      setSummary(body.summary || null);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement.');
    }
  };

  useEffect(() => {
    load();
  }, [headers]);

  const renew = async (row: any) => {
    setBusy(row.productId);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/catalog/derogations/${row.productId}/renew`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: row.reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Renouvellement impossible.');
      setMessage(`« ${row.name} » renouvelée 30 jours (nouvelle échéance : ${new Date(body.derogation.expires_at).toLocaleDateString('fr-FR')}).`);
      await load();
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(null);
    }
  };

  const sendAlert = async () => {
    setBusy('alert');
    setMessage('');
    try {
      const response = await fetch('/api/admin/catalog/derogations/alert-email', { method: 'POST', headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Envoi impossible.');
      setMessage(`Récapitulatif envoyé (statut : ${body.status}).`);
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(null);
    }
  };

  /**
   * Renouvellement EN MASSE des dérogations expirées ou bientôt expirées :
   * le 15/10/2026, 42 dérogations tombent d'un coup — sans ce bouton, la
   * porte proposerait 42 retraits le même jour. Chaque renouvellement reste
   * un appel tracé ; les dérogations encore actives ne sont pas touchées.
   */
  const renewUrgent = async () => {
    const urgent = rows.filter(row => row.state === 'expired' || row.state === 'expiring_soon');
    if (urgent.length === 0) {
      setMessage('Aucune dérogation expirée ou bientôt expirée.');
      return;
    }
    setBusy('bulk');
    setMessage('');
    let done = 0;
    let failed = 0;
    for (const row of urgent) {
      try {
        const response = await fetch(`/api/admin/catalog/derogations/${row.productId}/renew`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: row.reason }),
        });
        if (response.ok) done += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    setMessage(`Renouvellement en masse : ${done} dérogation(s) prolongée(s) de 30 jours${failed > 0 ? `, ${failed} échec(s)` : ''}.`);
    await load();
    setBusy(null);
  };

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;

  const urgent = summary ? summary.expiringSoon + summary.expired : 0;

  return (
    <div className={`p-6 rounded-3xl border space-y-3 ${urgent > 0 ? 'bg-rose-950/30 border-rose-400/30' : 'bg-kurla-espresso border-kurla-cream/10'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold flex items-center gap-2"><ShieldAlert className={`w-4 h-4 ${urgent > 0 ? 'text-rose-300' : 'text-kurla-amber'}`} /> Dérogations — fiches hors critères en vitrine</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={renewUrgent} disabled={busy === 'bulk' || urgent === 0} className="px-3 py-1.5 rounded-xl bg-kurla-copper text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"><RotateCcw className="w-3 h-3" /> {busy === 'bulk' ? 'Renouvellement…' : `Renouveler les ${urgent} urgente(s)`}</button>
          <button type="button" onClick={sendAlert} disabled={busy === 'alert'} className="px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"><Mail className="w-3 h-3" /> {busy === 'alert' ? 'Envoi…' : 'Envoyer le récapitulatif'}</button>
        </div>
      </div>
      {summary && (
        <p className="text-[11px] text-kurla-cream/70">
          <span className="font-bold">{summary.total}</span> dérogations · <span className="text-emerald-300">{summary.active} actives</span> · <span className="text-amber-300">{summary.expiringSoon} expirent sous 7 jours</span> · <span className="text-rose-300">{summary.expired} expirées</span>
          {summary.expired > 0 && ' — la porte de publication peut proposer leur retrait.'}
        </p>
      )}
      <p className="text-[11px] text-kurla-cream/55">Chaque dérogation est un choix daté : tant qu'elle est active, la porte ne propose aucun retrait ; à expiration, la protection tombe. Renouveler = 30 jours de plus.</p>
      {message && <p className="text-[11px] text-kurla-cream/75">{message}</p>}
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        <ColumnFilterStrip
          filters={derogationFilters}
          state={derogationFilterState}
          onChange={(key, value) => setDerogationFilterState(prev => ({ ...prev, [key]: value }))}
          onReset={() => setDerogationFilterState(emptyFilterState(DEROGATION_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
          total={rows.length}
          shown={visibleRows.length}
        />
        {visibleRows.map(row => (
          <div key={row.productId} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.state === 'active' ? 'bg-emerald-500/15 text-emerald-300' : row.state === 'expiring_soon' ? 'bg-amber-500/15 text-amber-300' : 'bg-rose-500/15 text-rose-300'}`}>{row.state === 'active' ? 'active' : row.state === 'expiring_soon' ? 'expire bientôt' : 'EXPIRÉE'}</span>
            <span className="flex-1 min-w-[160px]"><ProductName id={row.productId} label={row.name} headers={headers} className="text-[11px] font-semibold" onSaved={() => void load()} /></span>
            <span className="text-kurla-cream/55 flex-1 min-w-[200px]">{row.reason}</span>
            <span className="text-kurla-cream/45">échéance {new Date(row.expiresAt).toLocaleDateString('fr-FR')}</span>
            <button type="button" onClick={() => renew(row)} disabled={busy === row.productId} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold hover:bg-kurla-copper/25 disabled:opacity-40 flex items-center gap-1">
              <RotateCcw className="w-2.5 h-2.5" /> {busy === row.productId ? '…' : 'Renouveler 30 j'}
            </button>
          </div>
        ))}
        {visibleRows.length === 0 && <p className="text-[11px] text-kurla-cream/45">{rows.length === 0 ? 'Aucune dérogation enregistrée.' : 'Aucune dérogation ne correspond à ces filtres.'}</p>}
      </div>
    </div>
  );
};
