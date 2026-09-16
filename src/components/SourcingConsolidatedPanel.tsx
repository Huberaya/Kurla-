import React, { useEffect, useMemo, useState } from 'react';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { Copy, Mail, Search, Store } from 'lucide-react';

/**
 * VUE SOURCING CONSOLIDÉE — tous les produits (publiables) + tous les
 * candidats sourcing, avec prix, fournisseur, contact et e-mail prêt à
 * envoyer (RFQ existant ou généré depuis les données réelles). Rien n'est
 * envoyé depuis la plateforme : copier / mailto restent des actes humains.
 */
export const SourcingConsolidatedPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const response = await fetch('/api/admin/sourcing/consolidated', { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Vue consolidée indisponible.');
      setData(body);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement.');
    }
  };

  useEffect(() => {
    load();
  }, [headers]);

  const createFiche = async (row: any) => {
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

  const rows = useMemo(() => {
    let all = data?.rows || [];
    if (stateFilter !== 'all') all = all.filter((r: any) => r.state === stateFilter);
    const low = filter.toLowerCase();
    return low ? all.filter((r: any) => `${r.name} ${r.brand || ''} ${r.supplierName || ''}`.toLowerCase().includes(low)) : all;
  }, [data, filter, stateFilter]);

  // Filtres par champ (17/09), après l'état et la recherche existants :
  // type de ligne, marque, format, fournisseur, contact obtenu ou non, prix.
  const CONSOLIDATED_FILTER_KEYS = ['name', 'kind', 'brand', 'format', 'supplier', 'contact', 'price'] as const;
  const consolidatedFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', kind: 'text', get: (row: any) => row.name },
    { key: 'kind', kind: 'enum', get: (row: any) => row.kind, options: [
      { value: 'product', label: 'Produit' },
      { value: 'candidate', label: 'Candidat' },
      { value: 'position', label: 'Position' },
    ] },
    { key: 'brand', kind: 'text', get: (row: any) => row.brand },
    { key: 'format', kind: 'text', get: (row: any) => row.format },
    { key: 'supplier', kind: 'text', get: (row: any) => row.supplierName, presentLabels: { filled: 'Fournisseur nommé', empty: 'À qualifier' } },
    { key: 'contact', kind: 'enum', get: (row: any) => (row.supplierContact ? 'avec' : 'sans'), options: [
      { value: 'avec', label: 'Contact obtenu' },
      { value: 'sans', label: 'Contact à obtenir' },
    ] },
    { key: 'price', kind: 'numeric', get: (row: any) => (row.priceEur == null ? NaN : row.priceEur), unit: ' €' },
  ], []);
  const [consolidatedFilterState, setConsolidatedFilterState] = useState(() => emptyFilterState(CONSOLIDATED_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visibleRows = useMemo(
    () => applyColumnFilters(rows, consolidatedFilters, consolidatedFilterState),
    [rows, consolidatedFilters, consolidatedFilterState]
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

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;
  if (!data) return <div className="p-6 rounded-3xl bg-espresso border border-kurla-cream/10 text-xs text-kurla-cream/60">Chargement de la vue consolidée…</div>;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Store className="w-4 h-4 text-kurla-amber" /> Approvisionnement unifié — {data.total} références ({data.products} produits · {data.candidates} candidats · {data.positions} positions de fond)</h3>
        <div className="flex flex-wrap gap-1.5">
          {([['all', 'Tous', data.total], ['identifie', 'Identifié', data.pipeline?.identifie], ['contacte', 'Contacté', data.pipeline?.contacte], ['source', 'Sourcé', data.pipeline?.source], ['conforme', 'Conforme', data.pipeline?.conforme], ['publie', 'Publié', data.pipeline?.publie], ['en_vente', 'En vente', data.pipeline?.en_vente]] as Array<[string, string, number]>).map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setStateFilter(key)} className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${stateFilter === key ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60 hover:border-kurla-copper/30'}`}>{label} ({count ?? 0})</button>
          ))}
        </div>
        <p className="text-[11px] text-kurla-cream/60">Pipeline : Identifié → Contacté → Sourcé (prix réel obtenu) → Conforme → Publié → En vente. Prix = prix catalogue ou prix public constaté (jamais inventé ; « à obtenir » sinon). E-mail « prêt » = RFQ déjà rédigé ou généré depuis les données réelles du fournisseur. Aucun envoi automatique : copier puis envoyer reste un acte humain (mandat 16C).</p>
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
          <h3 className="font-bold">Toutes les lignes ({rows.length})</h3>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher produit, marque, fournisseur…" className="sm:w-80 px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs" />
        </div>
        <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
          <ColumnFilterStrip
            filters={consolidatedFilters}
            state={consolidatedFilterState}
            onChange={(key, value) => setConsolidatedFilterState(prev => ({ ...prev, [key]: value }))}
            onReset={() => setConsolidatedFilterState(emptyFilterState(CONSOLIDATED_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
            total={rows.length}
            shown={visibleRows.length}
          />
          {visibleRows.map((row: any) => (
            <div key={`${row.kind}-${row.id}`} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.kind === 'product' ? 'bg-sky-500/15 text-sky-300' : row.kind === 'candidate' ? 'bg-violet-500/15 text-violet-300' : 'bg-kurla-copper/15 text-kurla-copper'}`}>{row.kind === 'product' ? 'produit' : row.kind === 'candidate' ? 'candidat' : 'position'}</span>
              <span className="font-semibold flex-1 min-w-[180px]">{row.name}{row.brand ? <span className="text-kurla-cream/50 font-normal"> · {row.brand}</span> : null}{row.format ? <span className="text-kurla-cream/40 font-normal"> · {row.format}</span> : null}</span>
              <span className="w-28 text-right font-bold">{row.priceEur != null ? `${row.priceEur.toFixed(2).replace('.', ',')} €` : 'à obtenir'}{row.priceEur != null && <span className="block text-[9px] text-kurla-cream/40 font-normal">{row.priceLabel}</span>}</span>
              <span className="w-44 truncate text-kurla-cream/70">{row.supplierName || 'fournisseur à qualifier'}</span>
              <span className="w-40 truncate">{row.supplierContact ? <span className="text-kurla-amber">{row.supplierContact}</span> : <span className="text-amber-300/80">contact à obtenir</span>}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.emailState === 'pret' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{row.emailState === 'pret' ? 'e-mail prêt' : 'e-mail généré'}</span>
              {row.kind === 'candidate' && row.state !== 'publie' && (
                <button type="button" onClick={() => createFiche(row)} disabled={creating === row.id} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold hover:bg-kurla-copper/25 disabled:opacity-40">
                  {creating === row.id ? 'Création…' : '+ Créer la fiche'}
                </button>
              )}
            </div>
          ))}
        </div>
        {notice && <p className="text-[11px] text-kurla-cream/70 border-t border-kurla-cream/10 pt-2">{notice}</p>}
      </div>
    </div>
  );
};
