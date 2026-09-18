import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter , listFilter } from '../lib/columnFilters';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck, XCircle, Beaker, Undo2 } from 'lucide-react';

type Gate = { id: string; label: string; ok: boolean; detail: string };
type Row = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  catalogStatus: string;
  isActive: boolean;
  isTestListing: boolean;
  price: number | null;
  image: string | null;
  testListingNote?: string;
  gates: { gates: Gate[]; ready: boolean; missingGates: string[] };
};

const GATE_ICONS: Record<string, string> = {
  supplier_authorization: '①',
  inci: '②',
  cpnp: '③',
  visual: '④',
};

/**
 * Phase de test (14/09/2026) — administration des fiches de test.
 *
 * Pour chaque fiche de test (`src-*` + `peau-test-*`) : les 4 gardes-fous
 * nommés demandés par l'exploitant — ① autorisation fournisseur écrite,
 * ② INCI complète vérifiée, ③ CPNP + personne responsable UE, ④ visuel
 * autorisé — et le bouton « Dépublier » (→ `draft` via la route de statut
 * existante : la fiche sort immédiatement du mode test et réapparaît en
 * « Bientôt disponible »). Ce panneau ne publie rien : la publication réelle
 * reste derrière la porte complète (`PeauCatalogPublishPanel`).
 */
export const TestPhaseGatesPanel: React.FC<{ headers: HeadersInit; onSuccess?: (message: string) => void }> = ({ headers, onSuccess }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');

  // Filtres par champ (17/09) : les fiches de test se comptent en dizaines ;
  // « lesquelles sont prêtes », « quelle marque », « quel statut » doivent se
  // répondre en deux clics, pas en faisant défiler.
  const TEST_FILTER_KEYS = ['name', 'brand', 'category', 'status', 'test', 'ready', 'price'] as const;
  const testFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', ...listFilter({ key: 'name', rows, get: (row: Row) => row.name, extra: (row: Row) => [row.slug] }) },
    { key: 'brand', ...listFilter({ key: 'brand', rows, get: (row: Row) => row.brand, emptyLabel: 'Marque non renseignée' }) },
    { key: 'category', ...listFilter({ key: 'category', rows, get: (row: Row) => row.category, emptyLabel: 'Catégorie non renseignée' }) },
    { key: 'status', kind: 'enum', get: (row: Row) => row.catalogStatus, options: [
      { value: 'published', label: 'Publié' },
      { value: 'draft', label: 'Brouillon' },
    ] },
    { key: 'test', kind: 'enum', get: (row: Row) => (row.isTestListing ? 'oui' : 'non'), options: [
      { value: 'oui', label: 'Fiche test' },
      { value: 'non', label: 'Hors test' },
    ] },
    { key: 'ready', kind: 'enum', get: (row: Row) => (row.gates.ready ? 'oui' : 'non'), options: [
      { value: 'oui', label: 'Gardes-fous complets' },
      { value: 'non', label: 'Gardes-fous manquants' },
    ] },
    { key: 'price', kind: 'numeric', get: (row: Row) => (row.price == null ? NaN : row.price), unit: ' €' },
  ], [rows]);
  const [testFilterState, setTestFilterState] = useState(() => emptyFilterState(TEST_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const visibleRows = useMemo(() => applyColumnFilters(rows, testFilters, testFilterState), [rows, testFilters, testFilterState]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/catalog/test-phase', { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Rapport de la phase de test indisponible.');
      setRows(data.products || []);
      setGeneratedAt(data.generatedAt || '');
    } catch (e: any) {
      setError(e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const unpublish = async (row: Row) => {
    if (!window.confirm(`Dépublier « ${row.name} » ?\n\nLa fiche sort du mode test de la boutique et réapparaît en « Bientôt disponible » (non vendable).`)) return;
    setBusyId(row.productId);
    try {
      const res = await fetch(`/api/admin/catalog/${encodeURIComponent(row.productId)}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'draft' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Dépublication refusée.');
      onSuccess?.(`« ${row.name} » dépublié → brouillon (mode test désactivé)`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Dépublication impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const publishedCount = rows.filter(row => row.catalogStatus === 'published').length;
  const readyCount = rows.filter(row => row.gates.ready).length;
  const testActiveCount = rows.filter(row => row.isTestListing && row.catalogStatus === 'published').length;

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-kurla-copper" /> Phase de test — gardes-fous des fiches sourcing
            <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-sky-500/15 text-sky-300 border-sky-500/30">
              <Beaker className="w-3 h-3 inline mr-1" />visible boutique en mode test (?test=1)
            </span>
          </h3>
          <p className="text-xs text-kurla-cream/60 mt-1 max-w-3xl leading-relaxed">
            Les 4 gardes-fous de la publication réelle, fiche par fiche : un garde au rouge = la référence
            <strong className="text-kurla-cream"> ne devient jamais publiable</strong>, quel que soit le statut affiché.
            Bouton <strong className="text-rose-300">Dépublier</strong> : retire la fiche du mode test immédiatement (→ brouillon,
            « Bientôt disponible »). <span className="text-kurla-cream/40">{generatedAt ? `Vérifié le ${new Date(generatedAt).toLocaleString('fr-FR')}` : ''}</span>
          </p>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/70 flex items-center gap-1.5 hover:border-kurla-copper">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10 text-center">
          <p className="text-xl font-bold text-kurla-cream">{rows.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-kurla-amber">Fiches de test</p>
        </div>
        <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
          <p className="text-xl font-bold text-sky-300">{testActiveCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-sky-200/70">Actives en boutique (mode test)</p>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-xl font-bold text-emerald-300">{readyCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">4/4 gardes au vert</p>
        </div>
        <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-copper/30 text-center">
          <p className="text-xl font-bold text-kurla-copper">{publishedCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-kurla-amber">Statut « publié »</p>
        </div>
      </div>

      {loading ? <p className="text-xs text-kurla-cream/50 italic">Chargement des gardes-fous…</p> : rows.length === 0 ? (
        <p className="text-xs text-kurla-cream/50">Aucune fiche de test — les fiches `src-*` / `peau-test-*` apparaîtront ici dès leur création.</p>
      ) : (
        <div className="space-y-3">
          <ColumnFilterStrip
            filters={testFilters}
            state={testFilterState}
            onChange={(key, value) => setTestFilterState(prev => ({ ...prev, [key]: value }))}
            onReset={() => setTestFilterState(emptyFilterState(TEST_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))}
            total={rows.length}
            shown={visibleRows.length}
          />
          {visibleRows.map(row => {
            const isPublished = row.catalogStatus === 'published';
            const gateBy = (id: string) => row.gates.gates.find(gate => gate.id === id);
            return (
              <div key={row.productId} className={`p-4 rounded-2xl border ${row.gates.ready ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-kurla-ink border-kurla-cream/10'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-kurla-cream">{row.name}</span>
                      <span className="font-mono text-[10px] text-kurla-cream/40">{row.slug}</span>
                      {row.isTestListing && <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">fiche test</span>}
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${isPublished ? 'bg-kurla-copper/20 text-kurla-amber border-kurla-copper/30' : 'bg-kurla-cream/5 text-kurla-cream/50 border-kurla-cream/10'}`}>{row.catalogStatus}</span>
                      {row.price !== null && <span className="text-[11px] text-kurla-cream/50">prix public constaté {row.price.toFixed(2).replace('.', ',')} €</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {row.gates.gates.map(gate => (
                        <span key={gate.id} title={gate.detail}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${gate.ok ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' : 'bg-rose-500/10 text-rose-300 border-rose-500/25'}`}>
                          {gate.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {GATE_ICONS[gate.id]} {gate.label}
                        </span>
                      ))}
                    </div>
                    {!row.gates.ready && (
                      <p className="text-[11px] text-rose-300/90 mt-1.5 leading-relaxed">
                        {row.gates.gates.filter(gate => !gate.ok).map(gate => `${GATE_ICONS[gate.id]} ${gate.label} : ${gate.detail}`).join(' · ')}
                      </p>
                    )}
                    {row.testListingNote && <p className="text-[10px] text-kurla-cream/40 mt-1 italic">{row.testListingNote}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`?test=1`} target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 rounded-full bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream/70 hover:border-kurla-sky">
                      Ouvrir en mode test
                    </a>
                    {isPublished && (
                      <button onClick={() => void unpublish(row)} disabled={busyId === row.productId}
                        className="px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-200 text-[11px] font-bold flex items-center gap-1.5 hover:bg-rose-500/25 disabled:opacity-50">
                        {busyId === row.productId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />} Dépublier
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 flex gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span><strong>Règle tenue :</strong> le mode test n'autorise aucune vente — panier fermé, prix « à contractualiser »,
        et la publication réelle exige les 4 gardes-fous <strong>et</strong> la porte complète (statuts vérifiés, stock, pays, TVA) :
        voir le panneau « Catalogue peau : publication TEST contrôlée ».</span>
      </div>

      <p className="text-[10px] text-kurla-cream/35 text-center leading-relaxed">
        Sources : <span className="text-kurla-amber">GET /api/admin/catalog/test-phase</span> (4 gardes-fous par fiche) ·
        Dépublier = <code className="px-1 py-0.5 rounded bg-kurla-ink border border-kurla-cream/10">PATCH /api/admin/catalog/:id/status {"{status:'draft'}"}</code>
      </p>
    </div>
  );
};
