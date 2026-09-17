/**
 * PIPELINE DE MISE EN VENTE (chantier 17/09 — lot 1 : B + C).
 *
 * La vue d'ensemble demandée par l'exploitant : TOUS les produits (les 250+
 * identifiés dans l'approvisionnement ET le catalogue) avancent dans les
 * mêmes 6 stades — IDENTIFIÉ → FICHE CRÉÉE → DOSSIER EN COURS → CONFORME →
 * PUBLIÉ → VENDABLE — et l'on voit, en un coup d'œil :
 *   - où en est chaque produit (kanban + KPIs),
 *   - les fiches visibles en boutique mais NON CONFORMES (anomalies, C1 :
 *     signalées avec « Dépublier » ou « Compléter le dossier »),
 *   - la veille d'expiration réglementaire (CPNP / pers. responsable / CPSR /
 *     PIF expirés ou expirant sous 60 j, C2).
 *
 * 100 % dérivé des endpoints existants (consolidated, catalogue,
 * publication-readiness, fournisseurs) — aucun produit, aucun critère, aucune
 * date n'est inventé. La logique est dans `src/lib/catalogPipeline.ts`
 * (fonctions pures, banc `kurla_catalog_pipeline`).
 */
import React, { useEffect, useMemo, useState } from 'react';

import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, hasActiveFilter, type ColumnFilter } from '../lib/columnFilters';
import { AlertTriangle, Boxes, Clock, FileCheck2, GitBranch, PackageSearch, Search, ShieldAlert, Store } from 'lucide-react';
import {
  applyPipelineFilters, buildCatalogPipeline, buildExpiryWatch, documentTypeLabel, EXPIRY_WATCH_DAYS,
  groupRowsByCategory, pipelineFilterCounts, sortPipelineRows,
  PIPELINE_STAGES, PIPELINE_UNCATAGORIZED,
  type PipelineResult, type PipelineRow, type PipelineSortKey, type PipelineSpecialFilter, type PipelineStage
} from '../lib/catalogPipeline';
import type { PublicationPolicyState } from '../lib/db/publicationPolicyStore';

type ConsolidatedRow = { kind: 'product' | 'candidate'; id: string; name: string; supplierName: string | null; priceEur: number | null };

/**
 * Filtres persistés (sessionStorage) : changer d'onglet du dashboard ne fait
 * plus perdre l'organisation choisie (catégorie, fournisseur, classements).
 */
const PIPELINE_FILTERS_KEY = 'kurla_pipeline_filters_v1';
type PersistedPipelineFilters = {
  category: string | null;
  supplier: string | null;
  special: PipelineSpecialFilter | null;
  sortBy: PipelineSortKey;
  conformOnly: boolean;
};
function readPersistedPipelineFilters(): PersistedPipelineFilters {
  try {
    const raw = sessionStorage.getItem(PIPELINE_FILTERS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<PersistedPipelineFilters>;
      const sortBy: PipelineSortKey = p.sortBy === 'nom' || p.sortBy === 'prix' || p.sortBy === 'fournisseur' || p.sortBy === 'categorie' ? p.sortBy : 'categorie';
      const special: PipelineSpecialFilter | null = p.special === 'test' || p.special === 'sans-prix' || p.special === 'sans-fournisseur' ? p.special : null;
      return { category: typeof p.category === 'string' ? p.category : null, supplier: typeof p.supplier === 'string' ? p.supplier : null, special, sortBy, conformOnly: p.conformOnly === true };
    }
  } catch { /* stockage corrompu → filtres par défaut, jamais un plantage */ }
  return { category: null, supplier: null, special: null, sortBy: 'categorie', conformOnly: false };
}

export const CatalogPipelinePanel: React.FC<{
  headers: HeadersInit;
  /** Deep link vers le catalogue (fiche focalisée) pour « Compléter le dossier ». */
  onOpenCatalog: (productId: string) => void;
}> = ({ headers, onOpenCatalog }) => {
  const persisted = useMemo(readPersistedPipelineFilters, []);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ReturnType<typeof buildExpiryWatch>>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');
  const [conformOnly, setConformOnly] = useState(persisted.conformOnly); // aperçu « mode strict » (lecture seule)
  const [search, setSearch] = useState('');
  const [criterionFilter, setCriterionFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(persisted.category);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(persisted.supplier);
  const [specialFilter, setSpecialFilter] = useState<PipelineSpecialFilter | null>(persisted.special);
  const [sortBy, setSortBy] = useState<PipelineSortKey>(persisted.sortBy);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  // C3 — politique de publication (mode strict) : lue à part, un échec de
  // lecture ne bloque jamais le reste du panneau (état « non mesurable »).
  const [policy, setPolicyState] = useState<PublicationPolicyState | null>(null);
  const [arming, setArming] = useState(false);

  const load = async () => {
    setLoading(true);
    setUnavailable([]);
    const [consolidated, products, readiness, suppliers] = await Promise.allSettled([
      fetch('/api/admin/sourcing/consolidated', { headers }).then(r => r.json()),
      fetch('/api/admin/catalog/products', { headers }).then(r => r.json()),
      fetch('/api/admin/catalog/publication-readiness', { headers }).then(r => r.json()),
      fetch('/api/admin/suppliers', { headers }).then(r => r.json())
    ]);
    const failed: string[] = [];
    const names = ['la vue consolidée', 'le catalogue', 'l’état de publication', 'les fournisseurs'];
    [consolidated, products, readiness, suppliers].forEach((r, i) => {
      if (r.status === 'rejected' || !r.value || r.value.error) failed.push(names[i]);
    });
    setUnavailable(failed);

    // C3 — politique de publication : lecture indépendante (ne bloque pas le
    // panneau). Table absente → available:false + raison, affichée telle quelle.
    fetch('/api/admin/publication-policy', { headers })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: any) => { if (data?.policy) setPolicyState(data.policy); })
      .catch(() => setPolicyState({
        available: false, strictMode: false, activatedAt: null, activatedBy: null, note: null, updatedAt: null,
        reason: 'lecture de la politique impossible (vérifier la session admin)',
        autoPublishAvailable: false, autoPublishStage: 'off', autoPublishPausedAt: null, autoPublishPausedBy: null, autoPublishLastBatch: null
      }));

    const consolidatedValue = consolidated.status === 'fulfilled' ? (consolidated.value as any) : null;
    const consolidatedRows: ConsolidatedRow[] = (consolidatedValue?.rows || [])
      .map((row: any) => ({
        kind: row.kind === 'candidate' ? 'candidate' : 'product',
        id: String(row.id),
        name: String(row.name || row.id),
        supplierName: row.supplierName || null,
        priceEur: typeof row.priceEur === 'number' ? row.priceEur : null
      }));

    const productsValue = products.status === 'fulfilled' ? (products.value as any) : null;
    const productsList = (productsValue?.products || []).map((p: any) => ({
      id: String(p.id),
      name: p.name,
      slug: p.slug,
      catalogStatus: p.catalogStatus,
      isTestListing: p.isTestListing === true || p.is_test_listing === true || p.truth?.isTestListing === true,
      supplierId: p.supplierId || p.supplier_id || null,
      category: p.category || p.department || null,
      truth: p.truth || null
    }));

    const readinessValue = readiness.status === 'fulfilled' ? (readiness.value as any) : null;
    const readinessList = (readinessValue?.perProduct || []).map((r: any) => ({
      productId: String(r.productId),
      ready: !!r.ready,
      missing: (r.missing || []).map((m: any) => (typeof m === 'string' ? m : m?.label || ''))
    }));

    setResult(buildCatalogPipeline({
      rows: consolidatedRows,
      products: productsList,
      readiness: readinessList
    }));

    const suppliersValue = suppliers.status === 'fulfilled' ? (suppliers.value as any) : null;
    const suppliersList = (suppliersValue?.suppliers || []).map((s: any) => ({
      id: String(s.id),
      legalName: s.legalName,
      tradeName: s.tradeName,
      complianceDocs: s.complianceDocs || null
    }));
    setExpiryAlerts(buildExpiryWatch(suppliersList, productsList));
    setLoading(false);
  };

  // Lecture au montage ; `headers` est volontairement hors deps (identité
  // récréée à chaque rendu du dashboard, sinon boucle de re-chargements).
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const republish = () => { setFlash(''); load(); };

  const unpublish = async (productId: string) => {
    setUnpublishingId(productId);
    setFlash('');
    try {
      const response = await fetch(`/api/admin/catalog/${encodeURIComponent(productId)}/status`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'draft' })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Dépublication refusée.');
      setFlash(`Fiche dépubliée (retournée en brouillon) — elle sort immédiatement de la boutique.`);
      load();
    } catch (error: any) {
      setFlash(`Dépublication impossible : ${error?.message || 'erreur inconnue'}.`);
    } finally {
      setUnpublishingId(null);
    }
  };

  // C3 — armement / désarmement du mode strict. Un acte explicite, confirmé
  // (window.confirm), écrit via la route admin (guardée + journalisée).
  const applyPolicy = (strictMode: boolean) => {
    const message = strictMode
      ? 'Armer le MODE STRICT ? La boutique (liste, fiches, devis de kits) ne servira plus que les fiches dont les critères de vente sont tous au vert, jusqu’au désarmement. Les fiches actuellement visibles mais non conformes seront masquées le temps de compléter leur dossier. L’armement est daté, nommé et journalisé.'
      : 'Désarmer le MODE STRICT ? La boutique redevient l’état actuel : les fiches publiées sont servies telles quelles, les non conformes restant signalées par l’alarme anomalies. Le désarmement est journalisé.';
    if (!window.confirm(message)) return;
    setArming(true);
    setFlash('');
    fetch('/api/admin/publication-policy', {
      method: 'PATCH', headers, body: JSON.stringify({ strictMode, note: strictMode ? 'armé depuis le dashboard admin' : 'désarmé depuis le dashboard admin' })
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.policy) {
          setPolicyState(data.policy);
          setFlash(strictMode
            ? 'Mode strict ARMÉ — la boutique ne sert désormais que les fiches conformes (reflet immédiat côté serveur, CDN : quelques minutes au plus).'
            : 'Mode strict DÉSARMÉ — la boutique est retournée à l’état actuel.');
        } else {
          setFlash(`Échec de l’écriture : ${data?.error || 'erreur inconnue'}${data?.detail ? ` — ${data.detail}` : ''}.`);
        }
      })
      .catch(() => setFlash('Erreur réseau lors de l’écriture de la politique — état inchangé.'))
      .finally(() => setArming(false));
  };

  // Filtres cumulables — logique pure (banc `kurla_catalog_pipeline`).
  const visibleRows = useMemo(() => {
    if (!result) return [];
    return applyPipelineFilters(result.rows, {
      search, stage: stageFilter, conformOnly, category: categoryFilter,
      supplier: supplierFilter, special: specialFilter, criterion: criterionFilter
    });
  }, [result, search, stageFilter, conformOnly, categoryFilter, supplierFilter, specialFilter, criterionFilter]);

  // Comptes des chips : sur les données réelles du pipeline, jamais supposés.
  const filterCounts = useMemo(() => (result ? pipelineFilterCounts(result.rows) : null), [result]);

  // Persistance de l'organisation (onglet → autre onglet → retour).
  useEffect(() => {
    try {
      sessionStorage.setItem(PIPELINE_FILTERS_KEY, JSON.stringify({
        category: categoryFilter, supplier: supplierFilter, special: specialFilter, sortBy, conformOnly
      }));
    } catch { /* stockage indisponible : pas de persistance, pas de plantage */ }
  }, [categoryFilter, supplierFilter, specialFilter, sortBy, conformOnly]);

  // Filtres par champ (17/09) : même motif que le reste du catalogue. Ils
  // s'appliquent APRÈS la recherche et les filtres rapides — ils précisent,
  // ils ne remplacent pas.
  const columnFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', kind: 'text', get: (r: PipelineRow) => r.name, extra: (r: PipelineRow) => [r.slug] },
    { key: 'supplier', kind: 'text', get: (r: PipelineRow) => r.supplierName || '', presentLabels: { filled: 'Fournisseur rattaché', empty: 'Fournisseur à qualifier' } },
    { key: 'kind', kind: 'enum', get: (r: PipelineRow) => r.kind, options: [
      { value: 'product', label: 'Fiche produit' },
      { value: 'candidate', label: 'Candidate sourcing' },
    ] },
    { key: 'missing', kind: 'text', get: (r: PipelineRow) => r.missing.join(' ') },
    { key: 'anomaly', kind: 'enum', get: (r: PipelineRow) => (r.anomaly ? 'yes' : 'no'), options: [
      { value: 'yes', label: 'Anomalie' },
      { value: 'no', label: 'Sans anomalie' },
    ] },
    { key: 'price', kind: 'numeric', get: (r: PipelineRow) => (r.priceEur == null ? NaN : Number(r.priceEur)), unit: ' €' },
  ], []);
  const [columnFilterState, setColumnFilterState] = useState(() => emptyFilterState(columnFilters));
  const setColumnFilter = (key: string, value: string) => setColumnFilterState(prev => ({ ...prev, [key]: value }));
  const filteredRows = useMemo(
    () => applyColumnFilters(visibleRows, columnFilters, columnFilterState),
    [visibleRows, columnFilters, columnFilterState]
  );

  // « Tout » / « Réinitialiser » : la barre d'organisation ET les filtres par colonne.
  const hasActiveFilters =
    stageFilter !== 'all' || conformOnly || !!search.trim() || !!criterionFilter ||
    !!categoryFilter || !!supplierFilter || !!specialFilter || hasActiveFilter(columnFilterState);
  const resetAllFilters = () => {
    setStageFilter('all'); setConformOnly(false); setSearch(''); setCriterionFilter(null);
    setCategoryFilter(null); setSupplierFilter(null); setSpecialFilter(null);
    setColumnFilterState(emptyFilterState(columnFilters));
  };

  const fmtPrice = (n: number | null) => (n == null ? null : `${n.toFixed(2).replace('.', ',')} €`);

  /** Carte d'une ligne du kanban (partagée entre rendu plat et regroupé par catégorie). */
  const renderRowCard = (row: PipelineRow) => (
    <div className={`rounded-xl border px-2.5 py-2 ${row.anomaly ? 'border-rose-500/40 bg-rose-500/[0.07]' : 'border-kurla-cream/10 bg-kurla-espresso'}`}>
      <div className="flex items-center gap-1.5">
        {row.anomaly && <AlertTriangle className="w-3 h-3 text-rose-300 shrink-0" />}
        <p className="text-[11px] font-semibold text-kurla-cream truncate flex-1" title={row.name}>{row.name}</p>
        {row.isTest && <span className="px-1 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[8px] font-bold shrink-0">test</span>}
      </div>
      <p className="text-[10px] text-kurla-cream/45 truncate mt-0.5">
        {row.supplierName || (row.kind === 'candidate' ? 'fournisseur à qualifier' : 'fournisseur non rattaché')}
      </p>
      {row.missing.length > 0 && (
        <p className="text-[9px] text-amber-300/80 truncate mt-0.5" title={row.missing.join(' · ')}>
          ⛔ {row.missing[0]}{row.missing.length > 1 ? ` +${row.missing.length - 1}` : ''}
        </p>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-kurla-cream/40">{row.priceEur != null ? fmtPrice(row.priceEur) : '—'}</span>
        {row.kind === 'candidate'
          ? <span className="text-[9px] text-sky-300/70 font-bold">candidat appro</span>
          : (
            <button type="button" onClick={() => onOpenCatalog(row.focusProductId!)} className="text-[9px] text-kurla-copper font-bold hover:underline">Ouvrir →</button>
          )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-kurla-copper" /> Pipeline de mise en vente
        </h2>
        <p className="text-xs text-kurla-cream/55 mt-1 max-w-3xl">
          Tous les produits — approvisionnement ET catalogue — dans les mêmes 6 stades. Une fiche devient
          « Conforme » quand tous les critères de vente sont au vert, « Publiée » quand elle est visible en
          boutique, « Vendable » quand le checkout est ouvert. Les fiches visibles mais non conformes sont
          signalées en rouge, jamais masquées.
        </p>
      </div>

      {loading && <div className="rounded-xl border border-kurla-cream/10 p-4 text-xs text-kurla-cream/45">Lecture du consolidé, du catalogue, de l’état de publication et des fournisseurs…</div>}

      {result && !loading && (
        <>
          {/* SECTION 1 — Vue d'ensemble : mode strict + les 6 stades */}
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-kurla-copper/70 scroll-mt-28">Vue d’ensemble — les 6 stades</h2>
          {/* C3 — MODE STRICT : la politique de publication, armée ou non */}
          <section className={`rounded-2xl border p-4 space-y-2 ${policy?.available && policy.strictMode ? 'border-amber-500/40 bg-amber-500/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink/40'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Store className={`w-4 h-4 ${policy?.available && policy.strictMode ? 'text-amber-300' : 'text-kurla-cream/40'}`} />
              <h3 className="text-sm font-bold text-kurla-cream">Mode strict — politique de publication</h3>
              {policy?.available && (
                policy.strictMode
                  ? <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/40 text-[10px] font-bold text-amber-200">ARMÉ — boutique restreinte aux fiches conformes</span>
                  : <span className="px-2 py-0.5 rounded-full bg-kurla-cream/10 border border-kurla-cream/20 text-[10px] font-bold text-kurla-cream/60">Désarmé (état par défaut)</span>
              )}
            </div>
            {policy?.available ? (
              <>
                <p className="text-[11px] text-kurla-cream/60 max-w-4xl">
                  {policy.strictMode
                    ? <>Armé le {policy.activatedAt ? `${new Date(policy.activatedAt).toLocaleDateString('fr-FR')} à ${new Date(policy.activatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '—'} par {policy.activatedBy || '—'}{policy.note ? <> — {policy.note}</> : null}. Jusqu’au désarmement, la boutique ne sert que les fiches conformes ; une fiche redevient visible dès que ses critères passent au vert.</>
                    : <>État par défaut : la boutique sert les fiches publiées telles quelles, les non conformes restant signalées par l’alarme anomalies. Armé, le mode strict ne laisse en boutique que les fiches dont tous les critères de vente sont au vert — l’aperçu lecture seule « Conformes uniquement » ci-dessous montre déjà ce résultat.</>}
                </p>
                <button type="button" onClick={() => applyPolicy(!policy.strictMode)} disabled={arming}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold disabled:opacity-50 ${policy.strictMode ? 'bg-kurla-ink border-kurla-cream/25 text-kurla-cream/80 hover:border-kurla-cream/40' : 'bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/30'}`}>
                  {arming ? 'Écriture en cours…' : policy.strictMode ? 'Désarmer le mode strict' : 'Armer le mode strict'}
                </button>
              </>
            ) : (
              <p className="text-[11px] text-kurla-cream/60 max-w-4xl">
                État <span className="font-bold text-amber-200/90">non mesurable</span> — {policy?.reason || 'erreur de lecture inconnue'}.
                Le bouton « Conformes uniquement » ci-dessous reste un aperçu lecture seule ; l’interrupteur ci-dessus devient réel dès que la politique est lisible.
              </p>
            )}
          </section>

          {/* KPIs / compteurs de stades */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <button type="button" onClick={() => { setStageFilter('all'); setConformOnly(false); }}
              className={`rounded-2xl border p-3 text-left transition-colors ${stageFilter === 'all' && !conformOnly ? 'border-kurla-copper/50 bg-kurla-copper/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
              <p className="text-2xl font-bold text-kurla-cream">{result.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">Produits identifiés</p>
            </button>
            {PIPELINE_STAGES.map(stage => {
              const active = stageFilter === stage.id && !conformOnly;
              return (
                <button key={stage.id} type="button" onClick={() => { setStageFilter(stage.id); setConformOnly(false); }}
                  className={`rounded-2xl border p-3 text-left transition-colors ${active ? 'border-kurla-copper/50 bg-kurla-copper/[0.08]' : 'border-kurla-cream/10 bg-kurla-ink'}`}>
                  <p className="text-2xl font-bold text-kurla-cream">{result.counts[stage.id]}</p>
                  <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45 mt-0.5">{stage.label}</p>
                </button>
              );
            })}
          </div>

          {/* SECTION 2 — Anomalies boutique : signalées, jamais masquées */}
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-kurla-copper/70 scroll-mt-28 mt-2">Anomalies boutique</h2>
          {/* C1 — signalées, jamais masquées */}
          {result.anomalies > 0 ? (
            <section className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-300" />
                <h3 className="text-sm font-bold text-rose-200">
                  {result.anomalies} fiche{result.anomalies > 1 ? 's' : ''} visible{result.anomalies > 1 ? 's' : ''} en boutique mais non conforme{result.anomalies > 1 ? 's' : ''} aux critères
                </h3>
              </div>
              <p className="text-[11px] text-rose-200/70 max-w-3xl">
                Ces fiches sont affichées en boutique sans respecter l’ensemble des critères de mise en vente
                (choix de test). À trancher pour chacune : <span className="font-bold">Dépublier</span> (sort de la
                boutique immédiatement) ou <span className="font-bold">Compléter le dossier</span> (atteindre la fiche).
              </p>
              <ul className="space-y-1.5">
                {result.rows.filter(r => r.anomaly).slice(0, 30).map(row => (
                  <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/20 bg-kurla-ink px-3 py-2">
                    <span className="text-xs font-semibold text-kurla-cream min-w-0 truncate flex-1">{row.name}</span>
                    {row.isTest && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[9px] font-bold">test</span>}
                    <span className="text-[10px] text-rose-300/90">{row.missing.length} manque{row.missing.length > 1 ? 's' : ''}</span>
                    <span className="hidden xl:block text-[10px] text-kurla-cream/40 max-w-[360px] truncate" title={row.missing.join(' · ')}>
                      {row.missing.slice(0, 2).join(' · ')}{row.missing.length > 2 ? ' …' : ''}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button type="button" onClick={() => onOpenCatalog(row.focusProductId!)} className="px-2.5 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 hover:border-kurla-copper/40">Compléter</button>
                      <button type="button" onClick={() => unpublish(row.id)} disabled={unpublishingId === row.id} className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50">{unpublishingId === row.id ? '…' : 'Dépublier'}</button>
                    </div>
                  </li>
                ))}
                {result.anomalies > 30 && <li className="text-[11px] text-rose-200/70">+ {result.anomalies - 30} autres — affiner avec la recherche.</li>}
              </ul>
            </section>
          ) : (
            !loading && <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 flex items-center gap-2 text-xs text-emerald-200/90">
              <FileCheck2 className="w-4 h-4" /> Aucune fiche visible en boutique hors critères — la boutique n’expose que des fiches conformes (ou masquées).
            </section>
          )}

          {flash && <div className="rounded-xl border border-kurla-copper/30 bg-kurla-copper/[0.07] px-3 py-2 text-[11px] text-kurla-cream/80">{flash}</div>}

          {/* SECTION 3 — Pipeline par stades : filtres cumulables + kanban */}
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-kurla-copper/70 scroll-mt-28 mt-2">Pipeline par stades</h2>

          {/* Barre de filtres sticky — toujours accessible en défilant les colonnes */}
          <div className="sticky top-[104px] z-20 rounded-2xl border border-kurla-cream/10 bg-kurla-espresso/95 backdrop-blur p-3 space-y-2.5 shadow-lg shadow-black/20">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setStageFilter('all'); setConformOnly(false); setCriterionFilter(null); setCategoryFilter(null); setSupplierFilter(null); setSpecialFilter(null); setSearch(''); }}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold ${!hasActiveFilters ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60'}`}>
                Tout ({result.rows.length})
              </button>
              <button type="button" onClick={() => { setConformOnly(v => !v); setStageFilter('all'); }}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 ${conformOnly ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60'}`}>
                <Store className="w-3.5 h-3.5" /> Conformes <span className="text-[9px] opacity-70">(aperçu strict)</span>
              </button>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-kurla-cream/35" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, fournisseur)…" className="pl-8 pr-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs w-56" />
              </div>
              {filterCounts && filterCounts.suppliers.length > 0 && (
                <select value={supplierFilter || ''} onChange={e => setSupplierFilter(e.target.value || null)}
                  className="px-2.5 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 max-w-[180px]">
                  <option value="">Tous les fournisseurs ({filterCounts.suppliers.length})</option>
                  {filterCounts.suppliers.map(([name, count]) => (
                    <option key={name} value={name}>{name.length > 28 ? name.slice(0, 27) + '…' : name} ({count})</option>
                  ))}
                </select>
              )}
              <select value={sortBy} onChange={e => setSortBy(e.target.value as PipelineSortKey)}
                className="px-2.5 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70">
                <option value="categorie">Classement : catégorie → nom</option>
                <option value="nom">Classement : nom A→Z</option>
                <option value="prix">Classement : prix croissant</option>
                <option value="fournisseur">Classement : fournisseur A→Z</option>
              </select>
              {hasActiveFilters && (
                <button type="button" onClick={resetAllFilters} className="px-2.5 py-1.5 rounded-xl border border-kurla-cream/20 text-[10px] font-bold text-kurla-cream/50 hover:text-kurla-cream/80 hover:border-kurla-cream/40">
                  ✕ Réinitialiser
                </button>
              )}
              <span className="ml-auto text-[10px] font-bold text-kurla-cream/45 tabular-nums" title="Lignes affichées dans les colonnes / total du pipeline">
                {filteredRows.length} / {result.rows.length} fiches
              </span>
            </div>

            {filterCounts && filterCounts.categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-kurla-cream/35">Catégorie :</span>
                {filterCounts.categories.map(([cat, count]) => (
                  <button key={cat} type="button" onClick={() => setCategoryFilter(cur => cur === cat ? null : cat)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${categoryFilter === cat ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/50' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/55 hover:border-kurla-copper/40'}`}>
                    {cat} ({count})
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-kurla-cream/35">Spécifique :</span>
              {filterCounts && (
                <>
                  <button type="button" onClick={() => setSpecialFilter(cur => cur === 'test' ? null : 'test')}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${specialFilter === 'test' ? 'bg-amber-500/20 text-amber-200 border-amber-400/50' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/55 hover:border-amber-400/40'}`}>
                    Fiches test ({filterCounts.test})
                  </button>
                  <button type="button" onClick={() => setSpecialFilter(cur => cur === 'sans-prix' ? null : 'sans-prix')}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${specialFilter === 'sans-prix' ? 'bg-amber-500/20 text-amber-200 border-amber-400/50' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/55 hover:border-amber-400/40'}`}>
                    Sans prix ({filterCounts.sansPrix})
                  </button>
                  <button type="button" onClick={() => setSpecialFilter(cur => cur === 'sans-fournisseur' ? null : 'sans-fournisseur')}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${specialFilter === 'sans-fournisseur' ? 'bg-amber-500/20 text-amber-200 border-amber-400/50' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/55 hover:border-amber-400/40'}`}>
                    Sans fournisseur ({filterCounts.sansFournisseur})
                  </button>
                </>
              )}
              {result.topCriteria.length > 0 && (
                <>
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-kurla-cream/35">Critères manquants :</span>
                  {result.topCriteria.map(c => (
                    <button key={c.label} type="button" onClick={() => setCriterionFilter(cur => cur === c.label ? null : c.label)}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${criterionFilter === c.label ? 'bg-amber-500/20 text-amber-200 border-amber-400/50' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/55 hover:border-amber-400/40'}`}>
                      {c.label.length > 34 ? c.label.slice(0, 33) + '…' : c.label} ({c.count})
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Filtres par colonne (motif partagé du catalogue) — précisent APRES
              la barre d'organisation ci-dessus, ne la remplacent pas */}
          <ColumnFilterStrip
            filters={columnFilters}
            state={columnFilterState}
            onChange={setColumnFilter}
            onReset={() => setColumnFilterState(emptyFilterState(columnFilters))}
            total={visibleRows.length}
            shown={filteredRows.length}
          />

          {/* Kanban 6 stades — trié selon le classement choisi, sous-groupes par
              catégorie quand le classement est « catégorie → nom » */}
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {PIPELINE_STAGES.map(stage => {
              const colRows = sortPipelineRows(filteredRows.filter(r => r.stage === stage.id), sortBy);
              const groups = sortBy === 'categorie' ? groupRowsByCategory(colRows) : null;
              // Plafond de lisibilité : 60 cartes par colonne, au total
              // (dans l'ordre des groupes quand le classement est par catégorie).
              const flatIds: string[] = [];
              if (groups) {
                outer: for (const g of groups) for (const r of g.rows) {
                  if (flatIds.length >= 60) break outer;
                  flatIds.push(r.id);
                }
              } else {
                for (const r of colRows.slice(0, 60)) flatIds.push(r.id);
              }
              const renderedSet = new Set(flatIds);
              const hiddenCount = colRows.length - flatIds.length;
              return (
                <div key={stage.id} className="w-72 shrink-0 rounded-2xl border border-kurla-cream/10 bg-kurla-ink/60 p-2.5">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-kurla-amber">{stage.label}</p>
                    <span className="text-[11px] font-bold text-kurla-cream/60 tabular-nums">{colRows.length}</span>
                  </div>
                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
                    {colRows.length === 0 && <p className="text-[10px] text-kurla-cream/30 px-1 py-2">{hasActiveFilters ? 'Aucun produit avec ces filtres.' : 'Aucun produit.'}</p>}
                    {groups
                      ? groups.map(group => {
                          const groupRows = group.rows.filter(r => renderedSet.has(r.id));
                          if (groupRows.length === 0) return null;
                          return (
                            <div key={group.category}>
                              <p className="px-1 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-kurla-copper/60 border-b border-kurla-cream/10 mb-1.5 flex items-center justify-between">
                                {group.category}
                                <span className="text-kurla-cream/35 font-normal tabular-nums">{group.rows.length}</span>
                              </p>
                              <div className="space-y-1.5">
                                {groupRows.map(row => <div key={row.id}>{renderRowCard(row)}</div>)}
                              </div>
                            </div>
                          );
                        })
                      : colRows.filter(r => renderedSet.has(r.id)).map(row => renderRowCard(row))}
                    {hiddenCount > 0 && <p className="text-[10px] text-kurla-cream/35 px-1 py-1">+ {hiddenCount} — affiner avec un filtre.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* C2 — Veille d'expiration réglementaire */}
      {!loading && expiryAlerts.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-300" />
            <h3 className="text-sm font-bold text-amber-200">Veille d’expiration réglementaire — {expiryAlerts.length} document{expiryAlerts.length > 1 ? 's' : ''} concerné{expiryAlerts.length > 1 ? 's' : ''}</h3>
          </div>
          <p className="text-[11px] text-amber-200/70 max-w-3xl">
            Documents CPNP / personne responsable / CPSR / PIF expirés ou expirant sous {EXPIRY_WATCH_DAYS} jours.
            Un document expiré rend le produit non conforme : prévoir la mise à jour auprès du fournisseur
            avant la date, sinon la fiche passera en anomalie.
          </p>
          <ul className="space-y-1.5">
            {expiryAlerts.slice(0, 25).map((alert, index) => (
              <li key={`${alert.supplierId}-${alert.documentType}-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-kurla-ink px-3 py-2">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${alert.state === 'expired' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {alert.state === 'expired' ? 'Expiré' : `J-${alert.daysLeft}`}
                </span>
                <span className="text-xs font-semibold text-kurla-cream">{documentTypeLabel(alert.documentType)}</span>
                <span className="text-[11px] text-kurla-cream/55">{alert.supplierName}</span>
                <span className="text-[10px] text-kurla-cream/40 font-mono">au {alert.expiresOn}</span>
                {alert.affectedProducts.length > 0 && (
                  <span className="text-[10px] text-amber-200/80 ml-auto" title={alert.affectedProducts.map(p => p.name).join(', ')}>
                    {alert.affectedProducts.length} produit{alert.affectedProducts.length > 1 ? 's' : ''} concerné{alert.affectedProducts.length > 1 ? 's' : ''}
                  </span>
                )}
              </li>
            ))}
            {expiryAlerts.length > 25 && <li className="text-[11px] text-amber-200/70">+ {expiryAlerts.length - 25} autres.</li>}
          </ul>
        </section>
      )}
      {!loading && expiryAlerts.length === 0 && (
        <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 flex items-center gap-2 text-xs text-emerald-200/90">
          <Boxes className="w-4 h-4" /> Aucune expiration réglementaire sous {EXPIRY_WATCH_DAYS} jours sur les documents suivis (CPNP / RP / CPSR / PIF).
        </section>
      )}

      {unavailable.length > 0 && (
        <p className="text-[11px] text-amber-200/80">
          Source{unavailable.length > 1 ? 's' : ''} indisponible{unavailable.length > 1 ? 's' : ''} : {unavailable.join(', ')} —
          la vue est partielle, rien n’est masqué ni inventé.
        </p>
      )}
      <button type="button" onClick={republish} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 hover:border-kurla-copper/30">
        <PackageSearch className="w-4 h-4" /> Recharger le pipeline
      </button>
    </div>
  );
};
