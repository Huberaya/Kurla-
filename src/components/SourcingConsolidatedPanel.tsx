import React, { useEffect, useMemo, useState } from 'react';
import { SupplierName } from './EditableRecordName';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter, listFilter } from '../lib/columnFilters';
import {
  applyRegistryFilter, buildRowEmail, emptyRegistryFilter, registryFilterOptions, registryToCsv,
  REGISTRY_STAGE_LABELS, type ConsolidatedRow, type RegistryFilter, type RegistryStage
} from '../lib/sourcingConsolidated';
import { Copy, Download, FilePlus2, Mail, Search, Store } from 'lucide-react';

/**
 * CHANTIER D — LE REGISTRE APPROVISIONNÉ.
 *
 * La vue consolidée devient le registre unique : chaque ligne porte son stade
 * de registre (Identifié / Fiche créée / Conforme / Publié), dérivé des données
 * réelles — jamais supposé (fail-closed : sans publication-readiness mesurée,
 * aucune fiche n'est « Conforme »). Filtres fournisseur / statut / vague,
 * export CSV du registre entier, et par ligne : Créer la fiche (route d'import
 * gardée), Voir dans le catalogue (deep link), Copier l'e-mail.
 *
 * La réconciliation catalogue ⇄ approvisionnement est par id : une fiche créée
 * depuis un candidat porte le même id des deux côtés (source_candidate_id ↔
 * draft_product_id).
 */
const STAGE_BADGE: Record<RegistryStage, string> = {
  identifie: 'bg-kurla-cream/10 text-kurla-cream/50',
  fiche_creee: 'bg-sky-500/15 text-sky-300',
  conforme: 'bg-emerald-500/15 text-emerald-300',
  publie: 'bg-kurla-copper/20 text-kurla-copper',
};

export const SourcingConsolidatedPanel: React.FC<{
  headers: Record<string, string>;
  /** Deep link vers le catalogue (fiche focalisée) — « Voir dans le catalogue ». */
  onOpenCatalog?: (productId: string) => void;
}> = ({ headers, onOpenCatalog }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [regFilter, setRegFilter] = useState<RegistryFilter>(emptyRegistryFilter());
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const response = await fetch('/api/admin/sourcing/consolidated', { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Registre approvisionné indisponible.');
      setData(body);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement.');
    }
  };

  useEffect(() => {
    load();
  }, [headers]); // eslint-disable-line react-hooks/exhaustive-deps

  const createFiche = async (row: ConsolidatedRow) => {
    setCreating(row.id);
    setNotice('');
    try {
      const response = await fetch(`/api/admin/sourcing/candidates/${row.id}/create-fiche`, { method: 'POST', headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Création impossible.');
      setNotice(body.alreadyLinked
        ? `Fiche déjà liée à ce candidat : ${body.product.id}`
        : `Fiche draft créée : ${body.product.name} (${body.product.id}) — à compléter dans Catalogue, la porte de publication décidera.`);
      await load();
    } catch (e: any) {
      setNotice(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setCreating(null);
    }
  };

  const allRows: ConsolidatedRow[] = useMemo(() => data?.rows || [], [data]);

  // CHANTIER D — options de filtre : ce que les données proposent, comptes réels.
  const options = useMemo(() => registryFilterOptions(allRows), [allRows]);

  // Filtres du registre (cumulables) : fournisseur, stade, vague, recherche.
  const filteredRows = useMemo(
    () => applyRegistryFilter(allRows, regFilter),
    [allRows, regFilter]
  );

  const hasRegFilter = regFilter.stage !== 'all' || !!regFilter.supplier || !!regFilter.wave || regFilter.search.trim() !== '';

  // Filtres par champ (motif partagé du catalogue) — précisent APRÈS le filtre
  // du registre, ne le remplacent pas.
  const CONSOLIDATED_FILTER_KEYS = ['name', 'kind', 'brand', 'format', 'supplier', 'contact', 'price'] as const;
  const consolidatedFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', ...listFilter({ key: 'name', rows: allRows, get: (row: ConsolidatedRow) => row.name }) },
    { key: 'kind', kind: 'enum', get: (row: ConsolidatedRow) => row.kind, options: [
      { value: 'product', label: 'Fiche produit' },
      { value: 'candidate', label: 'Candidat' },
      { value: 'position', label: 'Position de fond' },
    ] },
    { key: 'brand', ...listFilter({ key: 'brand', rows: allRows, get: (row: ConsolidatedRow) => row.brand, emptyLabel: 'Marque inconnue' }) },
    { key: 'format', ...listFilter({ key: 'format', rows: allRows, get: (row: ConsolidatedRow) => row.format, emptyLabel: 'Format inconnu' }) },
    { key: 'supplier', ...listFilter({ key: 'supplier', rows: allRows, get: (row: ConsolidatedRow) => row.supplierName || '', emptyLabel: 'Fournisseur à qualifier' }) },
    { key: 'contact', kind: 'enum', get: (row: ConsolidatedRow) => (row.supplierContact ? 'avec' : 'sans'), options: [
      { value: 'avec', label: 'Contact obtenu' },
      { value: 'sans', label: 'Contact à obtenir' },
    ] },
    { key: 'price', kind: 'numeric', get: (row: ConsolidatedRow) => (row.priceEur == null ? NaN : row.priceEur), unit: ' €' },
  ], [allRows]);
  const [consolidatedFilterState, setConsolidatedFilterState] = useState(() => emptyFilterState(CONSOLIDATED_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visibleRows = useMemo(
    () => applyColumnFilters(filteredRows, consolidatedFilters, consolidatedFilterState),
    [filteredRows, consolidatedFilters, consolidatedFilterState]
  );

  const copyEmail = async (block: any) => {
    const text = `${block.emailSubject}\n\n${block.emailBody}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(block.key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('Copie impossible dans ce navigateur — ouvrez le détail et copiez manuellement.');
    }
  };

  // CHANTIER D — e-mail d'une référence seule : le RFQ réel quand il existe
  // (l'état de la ligne est « prêt »), sinon un texte généré depuis la ligne.
  const copyRowEmail = async (row: ConsolidatedRow) => {
    const block = (data?.supplierBlocks || []).find((b: any) => b.name === row.supplierName);
    const text = row.emailState === 'pret' && block
      ? `${block.emailSubject}\n\n${block.emailBody}`
      : (() => { const e = buildRowEmail(row); return `${e.subject}\n\n${e.body}`; })();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`row-${row.kind}-${row.id}`);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError('Copie impossible dans ce navigateur — copiez manuellement depuis le bloc fournisseur.');
    }
  };

  // CHANTIER D — export CSV du registre ENTIER (non filtré) : CRLF + BOM,
  // compatible Excel FR. La génération est pure (bancée côté lib).
  const exportCsv = () => {
    if (!data) return;
    const csv = registryToCsv(allRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registre-approvisionnement-kurla-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotice(`Export CSV : ${allRows.length} lignes (registre complet, non filtré).`);
  };

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;
  if (!data) return <div className="p-6 rounded-3xl bg-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement du registre approvisionné…</div>;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Store className="w-4 h-4 text-kurla-amber" /> Registre approvisionné — {data.total} références ({data.products} fiches · {data.candidates} candidats · {data.positions} positions de fond)</h3>

        {data.readinessAvailable === false && (
          <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
            État de publication non mesurable (rapport indisponible) — aucune fiche n'est déclarée « Conforme » (fail-closed). Les stades « Publié » restent des faits de catalogue.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {options.stages.map(stage => (
            <button key={stage.value} type="button" onClick={() => setRegFilter(f => ({ ...f, stage: stage.value as RegistryStage | 'all' }))}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${regFilter.stage === stage.value ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60 hover:border-kurla-copper/30'}`}>
              {stage.label} ({stage.count})
            </button>
          ))}
          <select value={regFilter.supplier || ''} onChange={e => setRegFilter(f => ({ ...f, supplier: e.target.value || null }))}
            className="ml-1 px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[10px] font-bold text-kurla-cream/70 max-w-[190px]">
            <option value="">Tous les fournisseurs</option>
            {options.suppliers.map(s => <option key={s.value} value={s.value}>{s.label} ({s.count})</option>)}
          </select>
          <select value={regFilter.wave || ''} onChange={e => setRegFilter(f => ({ ...f, wave: e.target.value || null }))}
            className="px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[10px] font-bold text-kurla-cream/70 max-w-[150px]">
            <option value="">Toutes les vagues</option>
            {options.waves.map(w => <option key={w.value} value={w.value}>{w.label} ({w.count})</option>)}
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-kurla-cream/35" />
            <input value={regFilter.search} onChange={e => setRegFilter(f => ({ ...f, search: e.target.value }))}
              placeholder="Rechercher produit, marque, id…" className="pl-8 pr-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs w-60" />
          </div>
          <button type="button" onClick={exportCsv} className="ml-auto px-3 py-1.5 rounded-xl bg-kurla-copper/15 border border-kurla-copper/40 text-kurla-copper text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-kurla-copper/25">
            <Download className="w-3.5 h-3.5" /> Export CSV ({data.total})
          </button>
          {hasRegFilter && (
            <button type="button" onClick={() => setRegFilter(emptyRegistryFilter())} className="px-2.5 py-1.5 rounded-xl border border-kurla-cream/20 text-[10px] font-bold text-kurla-cream/50 hover:text-kurla-cream/80 hover:border-kurla-cream/40">
              ✕ Réinitialiser
            </button>
          )}
        </div>

        <p className="text-[11px] text-kurla-cream/60">
          Registre : {visibleRows.length} affichée{visibleRows.length > 1 ? 's' : ''} / {data.total}. Stades dérivés, jamais supposés —
          Identifié (référence connue, pas de fiche) → Fiche créée (fiche draft au catalogue) → Conforme (publication-readiness au vert) → Publié (fiche visible en boutique).
          Prix = prix catalogue ou prix public constaté (jamais inventé ; « à obtenir » sinon).
          E-mail « prêt » = RFQ déjà rédigé ; « généré » = texte depuis les données réelles. Aucun envoi automatique : copier puis envoyer reste un acte humain (mandat 16C).
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
        <h3 className="font-bold">Fournisseurs & e-mails prêts ({data.supplierBlocks.length})</h3>
        <div className="space-y-3">
          {data.supplierBlocks.map((block: any) => (
            <div key={block.key} className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-sm">{block.name} <span className="text-[10px] text-kurla-cream/50 font-normal">· {block.rowCount} ligne{block.rowCount > 1 ? 's' : ''}</span></span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${block.emailState === 'pret' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{block.emailState === 'pret' ? 'e-mail prêt (RFQ rédigé)' : 'e-mail généré — à relire'}</span>
              </div>
              <p className="text-[11px] text-kurla-cream/70">
                Contact : {block.contact ? <a className="text-kurla-amber underline" href={`mailto:${block.contact}`}>{block.contact}</a> : <span className="text-amber-300">e-mail à obtenir</span>}
                {block.website ? <> · <a className="text-kurla-amber underline" href={block.website.startsWith('http') ? block.website : `https://${block.website}`} target="_blank" rel="noreferrer">{block.website}</a></> : null}
              </p>
              {block.knownTerms?.length > 0 && <p className="text-[10px] text-kurla-cream/50">Conditions publiques constatées : {block.knownTerms.join(' · ')}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyEmail(block)} className="px-3 py-1.5 rounded-lg bg-kurla-copper text-white text-[11px] font-bold flex items-center gap-1"><Copy className="w-3 h-3" /> {copied === block.key ? 'Copié !' : 'Copier l’e-mail'}</button>
                {block.contact && <a className="px-3 py-1.5 rounded-lg border border-kurla-cream/15 text-[11px] font-bold flex items-center gap-1" href={`mailto:${block.contact}?subject=${encodeURIComponent(block.emailSubject)}`}><Mail className="w-3 h-3" /> Ouvrir dans la messagerie</a>}
              </div>
              <details className="text-[11px] text-kurla-cream/70 whitespace-pre-wrap border-t border-kurla-cream/5 pt-2">{block.emailBody}</details>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">Toutes les lignes ({visibleRows.length} affichées)</h3>
        </div>
        <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
          <ColumnFilterStrip
            filters={consolidatedFilters}
            state={consolidatedFilterState}
            onChange={(key, value) => setConsolidatedFilterState(prev => ({ ...prev, [key]: value }))}
            onReset={() => setConsolidatedFilterState(emptyFilterState(CONSOLIDATED_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
            total={filteredRows.length}
            shown={visibleRows.length}
          />
          {visibleRows.map((row) => (
            <div key={`${row.kind}-${row.id}`} className={`px-3 py-2 rounded-xl border flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${row.registryStage === 'publie' && row.ready === false ? 'bg-rose-500/[0.06] border-rose-500/30' : 'bg-kurla-ink border-kurla-cream/5'}`}>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.kind === 'product' ? 'bg-sky-500/15 text-sky-300' : row.kind === 'candidate' ? 'bg-violet-500/15 text-violet-300' : 'bg-kurla-copper/15 text-kurla-copper'}`}>
                {row.kind === 'product' ? 'fiche' : row.kind === 'candidate' ? 'candidat' : 'position'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STAGE_BADGE[row.registryStage]}`}>{REGISTRY_STAGE_LABELS[row.registryStage]}</span>
              {row.registryStage === 'publie' && row.ready === false && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300" title={row.missing.join(' · ')}>non conforme{row.missing.length > 0 ? ` — ${row.missing.length} manquant${row.missing.length > 1 ? 's' : ''}` : ''}</span>
              )}
              {row.wave && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-kurla-cream/10 text-kurla-cream/50">vague {row.wave}</span>}
              <span className="font-semibold flex-1 min-w-[160px]">
                {row.name}
                {row.brand ? <span className="text-kurla-cream/50 font-normal"> · {row.brand}</span> : null}
                {row.format ? <span className="text-kurla-cream/40 font-normal"> · {row.format}</span> : null}
                {row.linkedProductId && row.kind === 'candidate' && <span className="text-[9px] text-kurla-cream/40 font-normal block">fiche liée : {row.linkedProductId}</span>}
              </span>
              <span className="w-28 text-right font-bold">
                {row.priceEur != null ? `${row.priceEur.toFixed(2).replace('.', ',')} €` : 'à obtenir'}
                {row.priceEur != null && <span className="block text-[9px] text-kurla-cream/40 font-normal">{row.priceLabel}</span>}
              </span>
              <span className="w-44 truncate text-kurla-cream/70">{row.supplierId
                ? <SupplierName id={row.supplierId} label={row.supplierName || undefined} headers={headers} className="text-[10px]" />
                : (row.supplierName || 'fournisseur à qualifier')}</span>
              <span className="w-40 truncate">{row.supplierContact ? <span className="text-kurla-amber">{row.supplierContact}</span> : <span className="text-amber-300/80">contact à obtenir</span>}</span>
              {row.supplierName && (
                <button type="button" onClick={() => copyRowEmail(row)} title={row.emailState === 'pret' ? 'Copier le RFQ du fournisseur' : 'Copier l’e-mail généré pour cette référence'}
                  className="px-2 py-0.5 rounded-lg border border-kurla-cream/15 text-[9px] font-bold text-kurla-cream/60 hover:border-kurla-copper/40 hover:text-kurla-copper inline-flex items-center gap-1">
                  <Copy className="w-3 h-3" /> {copied === `row-${row.kind}-${row.id}` ? 'Copié' : 'E-mail'}
                </button>
              )}
              {row.kind === 'candidate' && !row.linkedProductId && (
                <button type="button" onClick={() => createFiche(row)} disabled={creating === row.id} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold hover:bg-kurla-copper/25 disabled:opacity-40 inline-flex items-center gap-1">
                  <FilePlus2 className="w-3 h-3" /> {creating === row.id ? 'Création…' : 'Créer la fiche'}
                </button>
              )}
              {row.linkedProductId && onOpenCatalog && (
                <button type="button" onClick={() => onOpenCatalog(row.linkedProductId!)} title={`Ouvrir la fiche ${row.linkedProductId} dans le catalogue`}
                  className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[9px] font-bold hover:bg-sky-500/20">
                  Voir dans le catalogue →
                </button>
              )}
            </div>
          ))}
          {visibleRows.length === 0 && (
            <p className="text-[11px] text-kurla-cream/40 px-2 py-3">Aucune ligne avec ces filtres — <button type="button" className="text-kurla-copper font-bold hover:underline" onClick={() => setRegFilter(emptyRegistryFilter())}>réinitialiser</button>.</p>
          )}
        </div>
        {notice && <p className="text-[11px] text-kurla-cream/70 border-t border-kurla-cream/10 pt-2">{notice}</p>}
      </div>
    </div>
  );
};
