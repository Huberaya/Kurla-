/**
 * CHANTIER 2 — Vue admin des identifiés (~500), hors boutique.
 *
 * Montée dans les DEUX espaces. Lecture du consolidé déjà là ; l'import
 * est une prévisualisation (cible fond/candidat, jamais `published`).
 * L'écriture de masse = chantier 13.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, FilePlus2, RefreshCw, Upload } from 'lucide-react';

import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { SupplierName } from './EditableRecordName';
import {
  DOCUMENTED_NEED_OPTIONS,
  IDENTIFIED_IMPORT_LIMIT,
  IDENTIFIED_WRITE_TABLES,
  countIdentified,
  duplicateGroups,
  filterIdentified,
  identifiedFromConsolidated,
  importNeverPublishes,
  parseIdentifiedImportText,
  planIdentifiedImport,
  type IdentifiedFilters,
  type IdentifiedImportPlan,
} from '../lib/identifiedProducts';
import { BUSINESS_STAGE_LABELS, WRITE_TARGET_BY_INTENT } from '../lib/productLifecycle';
import { evaluateIdentifiedSkinCriteria } from '../lib/skinCriteria';
import { catalogEntryEligibility, candidateIdFromIdentified } from '../lib/skinCatalog';
import { SKIN_NEEDS, skinNeedLabel } from '../lib/skinTaxonomy';
import { SkinCriteriaChecklist } from './SkinCriteriaChecklist';

type IdentifiedProductsPanelProps = {
  headers: HeadersInit;
  onOpenSupplier?: (supplierId: string) => void;
  onOpenCatalog?: (productId: string) => void;
};

const FILTER_KEYS = ['title', 'kind', 'need', 'skin', 'supplier'] as const;

export const IdentifiedProductsPanel: React.FC<IdentifiedProductsPanelProps> = ({
  headers,
  onOpenCatalog,
}) => {
  const [records, setRecords] = useState<ReturnType<typeof identifiedFromConsolidated> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<IdentifiedFilters['kind']>('all');
  const [need, setNeed] = useState<number | 'all'>('all');
  const [skin, setSkin] = useState<IdentifiedFilters['skinNeed']>('all');
  const [importText, setImportText] = useState('');
  const [plan, setPlan] = useState<IdentifiedImportPlan | null>(null);
  const [importError, setImportError] = useState('');
  const [addBrand, setAddBrand] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addNotice, setAddNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [ficheNotice, setFicheNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/sourcing/consolidated', { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Registre identifiés indisponible.');
      setRecords(identifiedFromConsolidated(body.rows || []));
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement.');
      setRecords(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = records ? countIdentified(records) : null;
  const dups = records ? duplicateGroups(records) : [];
  const prefiltered = useMemo(() => {
    if (!records) return [];
    return filterIdentified(records, {
      search,
      kind,
      documentedNeed: need === 'all' ? undefined : need,
      skinNeed: skin,
    });
  }, [records, search, kind, need, skin]);

  const columnFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'title', kind: 'text', get: (row) => row.title, extra: (row) => [row.brand] },
    { key: 'kind', kind: 'enum', get: (row) => row.kind, options: [
      { value: 'fond_position', label: 'Position de fond' },
      { value: 'candidate', label: 'Candidat' },
    ] },
    { key: 'need', kind: 'enum', get: (row) => (row.documentedNeed != null ? String(row.documentedNeed) : ''), options: DOCUMENTED_NEED_OPTIONS.map(n => ({ value: String(n.number), label: `#${n.number} ${n.title}` })) },
    { key: 'skin', kind: 'enum', get: (row) => row.skinNeed || '', options: SKIN_NEEDS.map(n => ({ value: n.value, label: n.label })) },
    { key: 'supplier', kind: 'present', get: (row) => row.supplierId, presentLabels: { filled: 'Fournisseur structuré', empty: 'Piste / canal (pas un fournisseur)' } },
  ], []);
  const [columnState, setColumnState] = useState(() => emptyFilterState(FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visible = useMemo(
    () => applyColumnFilters(prefiltered, columnFilters, columnState),
    [prefiltered, columnFilters, columnState]
  );

  const createFiche = async (record: NonNullable<typeof records>[number]) => {
    const candidateId = candidateIdFromIdentified(record);
    const eligibility = catalogEntryEligibility(record);
    if (!candidateId || !eligibility.ok) {
      setFicheNotice(eligibility.reason);
      return;
    }
    setCreating(record.uid);
    setFicheNotice('');
    try {
      const response = await fetch(`/api/admin/sourcing/candidates/${candidateId}/create-fiche`, { method: 'POST', headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Création impossible.');
      setFicheNotice(body.alreadyLinked
        ? `Fiche déjà liée : ${body.product.id} — draft, hors boutique.`
        : `Fiche catalogue créée : ${body.product.name} (${body.product.id}) — draft, inactive, hors boutique. La porte C4 décidera de la publication.`);
      await load();
    } catch (err: any) {
      setFicheNotice(`Échec : ${err.message || 'erreur'}`);
    } finally {
      setCreating(null);
    }
  };

  const runPreview = () => {
    setImportError('');
    try {
      const drafts = parseIdentifiedImportText(importText);
      const next = planIdentifiedImport(drafts, records || []);
      setPlan(next);
    } catch (e: any) {
      setPlan(null);
      setImportError(e.message || 'Fichier illisible.');
    }
  };

  const addIdentified = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddNotice('');
    try {
      const response = await fetch('/api/admin/sourcing/candidates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ brand: addBrand, product: addTitle, category: 'peau' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Création refusée.');
      setAddNotice(`Identifié enregistré : ${body.candidate?.brand} — ${body.candidate?.product} (${body.candidate?.id}). Hors boutique.`);
      setAddBrand('');
      setAddTitle('');
      await load();
    } catch (err: any) {
      setAddNotice(`Échec : ${err.message || 'erreur'}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-kurla-copper" /> Identifiés — hors boutique
            </h2>
            <p className="text-xs text-kurla-cream/55 mt-1 max-w-3xl">
              Fond 50 besoins × 5 et candidats sourcing, unifiés. Aucun n’est un SKU vendable.
              Import 500 → {WRITE_TARGET_BY_INTENT.import_identified}. Jamais {IDENTIFIED_WRITE_TABLES.coverage === 'sourcing_fond_positions' ? 'la boutique' : 'products.published'}.
              Entrée catalogue (C8) = fiche <code className="font-mono">draft</code> inactive — 0 publication accidentelle.
            </p>
          </div>
          <button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-amber flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Recharger
          </button>
        </div>

        {loading && <p className="text-xs text-kurla-cream/45">Lecture du consolidé…</p>}
        {error && <p className="text-xs text-rose-300">{error}</p>}

        {counts && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-2xl border border-kurla-cream/10 bg-kurla-ink">
              <p className="text-2xl font-bold text-kurla-cream">{counts.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Identifiés</p>
            </div>
            <button type="button" onClick={() => setKind(kind === 'fond_position' ? 'all' : 'fond_position')} className={`p-3 rounded-2xl border text-left ${kind === 'fond_position' ? 'border-kurla-copper/50 bg-kurla-copper/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
              <p className="text-2xl font-bold text-kurla-cream">{counts.fond}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Fond</p>
            </button>
            <button type="button" onClick={() => setKind(kind === 'candidate' ? 'all' : 'candidate')} className={`p-3 rounded-2xl border text-left ${kind === 'candidate' ? 'border-kurla-copper/50 bg-kurla-copper/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
              <p className="text-2xl font-bold text-kurla-cream">{counts.candidate}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Candidats</p>
            </button>
            <div className="p-3 rounded-2xl border border-kurla-cream/10 bg-kurla-ink">
              <p className="text-2xl font-bold text-kurla-cream">{counts.withDocumentedNeed}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Besoin 1–50</p>
            </div>
            <div className="p-3 rounded-2xl border border-kurla-cream/10 bg-kurla-ink">
              <p className="text-2xl font-bold text-kurla-cream">{counts.unresolvedSupplier}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Sans fournisseur</p>
            </div>
            <div className="p-3 rounded-2xl border border-kurla-cream/10 bg-kurla-ink">
              <p className="text-2xl font-bold text-kurla-cream">{counts.duplicateGroups}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Doublons (clé)</p>
            </div>
          </div>
        )}

        {records && !loading && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher nom, marque, canal…"
              className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream w-64 focus:outline-none focus:border-kurla-copper"
            />
            <select value={need === 'all' ? '' : String(need)} onChange={e => setNeed(e.target.value ? Number(e.target.value) : 'all')}
              className="px-2 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream max-w-[220px]">
              <option value="">Tous les 50 besoins</option>
              {DOCUMENTED_NEED_OPTIONS.map(n => <option key={n.number} value={n.number}>#{n.number} {n.title}</option>)}
            </select>
            <select value={skin === 'all' ? '' : String(skin)} onChange={e => setSkin((e.target.value || 'all') as IdentifiedFilters['skinNeed'])}
              className="px-2 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream max-w-[200px]">
              <option value="">Tous les 15 besoins boutique</option>
              <option value="none">Sans filtre boutique (éducation / maquillage / cheveu)</option>
              {SKIN_NEEDS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            <p className="text-[11px] text-kurla-cream/45">{visible.length} ligne{visible.length > 1 ? 's' : ''} — stade {BUSINESS_STAGE_LABELS.identified}, 0 publique.</p>
          </div>
        )}
      </div>

      {records && !loading && (
        <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
          <h3 className="font-bold text-kurla-cream">Liste cliquable</h3>
          <ColumnFilterStrip
            filters={columnFilters}
            state={columnState}
            onChange={(key, value) => setColumnState(prev => ({ ...prev, [key]: value }))}
            onReset={() => setColumnState(emptyFilterState(FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
            total={prefiltered.length}
            shown={visible.length}
          />
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-kurla-cream/10 text-kurla-amber uppercase tracking-wider text-[10px]">
                  <th className="py-2 pr-3">Origine</th>
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Besoin</th>
                  <th className="py-2 pr-3">Boutique</th>
                  <th className="py-2 pr-3">Fournisseur</th>
                  <th className="py-2 pr-3">Public</th>
                  <th className="py-2 pr-3">Catalogue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kurla-cream/5">
                {visible.slice(0, 120).map(record => (
                  <tr
                    key={record.uid}
                    className={`hover:bg-kurla-ink/40 cursor-pointer ${record.uid === selectedUid ? 'bg-kurla-copper/[0.08]' : ''}`}
                    onClick={() => setSelectedUid(record.uid === selectedUid ? null : record.uid)}
                  >
                    <td className="py-2 pr-3 text-kurla-cream/55">{record.kind === 'fond_position' ? 'fond' : 'candidat'}</td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold text-kurla-cream">{record.title}</span>
                      {record.brand && <span className="block text-[10px] text-kurla-cream/45">{record.brand}</span>}
                    </td>
                    <td className="py-2 pr-3 text-kurla-cream/70">{record.documentedNeed != null ? `#${record.documentedNeed}` : '—'}</td>
                    <td className="py-2 pr-3 text-kurla-cream/70">{record.skinNeed ? skinNeedLabel(record.skinNeed) : 'aucun (volontaire)'}</td>
                    <td className="py-2 pr-3">
                      {record.supplierId ? (
                        <SupplierName id={record.supplierId} headers={headers} className="text-xs" />
                      ) : (
                        <span className="text-kurla-cream/40">{record.unresolvedSupplierLabel || 'à qualifier — pas un fournisseur'}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3"><span className="text-kurla-cream/35">non</span></td>
                    <td className="py-2 pr-3" onClick={e => e.stopPropagation()}>
                      {(() => {
                        const eligibility = catalogEntryEligibility(record);
                        if (record.linkedProductId && onOpenCatalog) {
                          return (
                            <button type="button" onClick={() => onOpenCatalog(record.linkedProductId!)}
                              className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[9px] font-bold">
                              Voir le draft →
                            </button>
                          );
                        }
                        if (eligibility.ok) {
                          return (
                            <button type="button" onClick={() => createFiche(record)} disabled={creating === record.uid}
                              className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold hover:bg-kurla-copper/25 disabled:opacity-40 inline-flex items-center gap-1">
                              <FilePlus2 className="w-3 h-3" /> {creating === record.uid ? 'Création…' : 'Créer la fiche (draft)'}
                            </button>
                          );
                        }
                        return <span className="text-[9px] text-kurla-cream/40" title={eligibility.reason}>{eligibility.reason}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-kurla-cream/40 italic">Aucun identifié pour ces filtres — rien n’est inventé.</td></tr>
                )}
              </tbody>
            </table>
            {visible.length > 120 && <p className="text-[10px] text-kurla-cream/40 mt-2">+ {visible.length - 120} lignes — affiner le besoin.</p>}
          </div>
          {selectedUid && records && (() => {
            const selected = records.find(row => row.uid === selectedUid);
            if (!selected) return null;
            return (
              <SkinCriteriaChecklist
                checklist={evaluateIdentifiedSkinCriteria(selected)}
                heading={`Critères Skin — ${selected.title}`}
              />
            );
          })()}
          {ficheNotice && <p className="text-[11px] text-kurla-cream/70 border-t border-kurla-cream/10 pt-2">{ficheNotice}</p>}
          {dups.length > 0 && (
            <p className="text-[11px] text-amber-200/80">{dups.length} groupe(s) de doublons (marque+nom normalisés). L’import 500 s’appuiera sur cette clé — chantier 13.</p>
          )}
        </div>
      )}

      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
        <h3 className="font-bold text-kurla-cream flex items-center gap-2"><Upload className="w-4 h-4 text-kurla-amber" /> Import identifié — prévisualisation</h3>
        <p className="text-[11px] text-kurla-cream/55 max-w-3xl">
          CSV (`marque,nom,besoin,canal,ean`) ou JSON. Plafond {IDENTIFIED_IMPORT_LIMIT}.
          Une ligne avec `published` / `products` est **refusée**. Rien n’est écrit ici : le chantier 13 branchera l’écriture sur les mêmes cibles.
        </p>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          rows={6}
          placeholder={'marque,nom,besoin,canal,ean\nCeraVe,Crème lavante,24,pharmacie,\n'}
          className="w-full p-3 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-mono text-kurla-cream focus:outline-none focus:border-kurla-copper"
        />
        <button type="button" onClick={runPreview} className="px-4 py-2 rounded-xl bg-kurla-copper text-white text-xs font-bold">Prévisualiser (n’écrit pas)</button>
        {importError && <p className="text-xs text-rose-300">{importError}</p>}
        {plan && (
          <div className="text-[11px] text-kurla-cream/70 space-y-1">
            <p>
              Acceptées : {plan.accepted.length} · refusées : {plan.rejected.length} ·
              tentatives boutique : <strong className={plan.wouldPublish ? 'text-rose-300' : 'text-emerald-300'}>{plan.wouldPublish}</strong>.
              {importNeverPublishes(plan) ? ' Aucune n’irait en published.' : ' Des lignes visaient la boutique — bloquées.'}
            </p>
            {plan.accepted.slice(0, 8).map((row, i) => (
              <p key={`${row.dedupKey}-${i}`} className="font-mono text-[10px] text-kurla-cream/50">
                → {row.writeTarget} · {row.draft.brand} {row.draft.title}
                {row.duplicateOf ? ' · doublon' : ''}
              </p>
            ))}
            {plan.rejected.slice(0, 5).map((row, i) => (
              <p key={`r-${i}`} className="text-rose-300/80">{row.reason}{row.draft.title ? ` (${row.draft.title})` : ''}</p>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={addIdentified} className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
        <h3 className="font-bold text-kurla-cream">Ajouter un identifié (candidat)</h3>
        <p className="text-[11px] text-kurla-cream/55">Écrit `sourcing_product_candidates`, jamais le catalogue. Marque + nom obligatoires.</p>
        <div className="flex flex-wrap gap-2">
          <input value={addBrand} onChange={e => setAddBrand(e.target.value)} placeholder="Marque" required
            className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream w-40" />
          <input value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Nom du produit" required
            className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream w-64" />
          <button type="submit" disabled={adding} className="px-4 py-2 rounded-xl bg-kurla-copper text-white text-xs font-bold disabled:opacity-50">
            {adding ? 'Enregistrement…' : 'Enregistrer hors boutique'}
          </button>
        </div>
        {addNotice && <p className="text-[11px] text-kurla-cream/70">{addNotice}</p>}
      </form>
    </div>
  );
};
