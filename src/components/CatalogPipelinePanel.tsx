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
import { AlertTriangle, Boxes, Clock, FileCheck2, GitBranch, PackageSearch, Search, ShieldAlert, Store } from 'lucide-react';
import {
  buildCatalogPipeline, buildExpiryWatch, documentTypeLabel, EXPIRY_WATCH_DAYS,
  PIPELINE_STAGES, type PipelineResult, type PipelineStage
} from '../lib/catalogPipeline';
import type { PublicationPolicyState } from '../lib/db/publicationPolicyStore';

type ConsolidatedRow = { kind: 'product' | 'candidate'; id: string; name: string; supplierName: string | null; priceEur: number | null };

export const CatalogPipelinePanel: React.FC<{
  headers: HeadersInit;
  /** Deep link vers le catalogue (fiche focalisée) pour « Compléter le dossier ». */
  onOpenCatalog: (productId: string) => void;
}> = ({ headers, onOpenCatalog }) => {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [expiryAlerts, setExpiryAlerts] = useState<ReturnType<typeof buildExpiryWatch>>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');
  const [conformOnly, setConformOnly] = useState(false); // aperçu « mode strict » (lecture seule)
  const [search, setSearch] = useState('');
  const [criterionFilter, setCriterionFilter] = useState<string | null>(null);
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
        reason: 'lecture de la politique impossible (vérifier la session admin)'
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

  const visibleRows = useMemo(() => {
    if (!result) return [];
    const q = search.trim().toLowerCase();
    return result.rows.filter(row => {
      if (stageFilter !== 'all' && row.stage !== stageFilter) return false;
      if (conformOnly && !['conforme', 'publie', 'vendable'].includes(row.stage)) return false;
      if (criterionFilter && !row.missing.some(m => m === criterionFilter)) return false;
      if (q && !`${row.name} ${row.slug || ''} ${row.supplierName || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [result, stageFilter, conformOnly, criterionFilter, search]);

  const fmtPrice = (n: number | null) => (n == null ? null : `${n.toFixed(2).replace('.', ',')} €`);

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

          {/* C1 — Anomalies en boutique : signalées, jamais masquées */}
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

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setStageFilter('all'); setConformOnly(false); setCriterionFilter(null); }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold ${stageFilter === 'all' && !conformOnly && !criterionFilter ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60'}`}>
              Tous ({result.rows.length})
            </button>
            <button type="button" onClick={() => { setConformOnly(v => !v); setStageFilter('all'); }}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 ${conformOnly ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60'}`}>
              <Store className="w-3.5 h-3.5" /> Conformes uniquement <span className="text-[9px] opacity-70">(aperçu mode strict)</span>
            </button>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-kurla-cream/35" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, fournisseur)…" className="pl-8 pr-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs w-64" />
            </div>
            {result.topCriteria.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                <span className="text-[10px] uppercase tracking-wider text-kurla-cream/35">Critères manquants :</span>
                {result.topCriteria.map(c => (
                  <button key={c.label} type="button" onClick={() => setCriterionFilter(cur => cur === c.label ? null : c.label)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${criterionFilter === c.label ? 'bg-amber-500/20 text-amber-200 border-amber-400/50' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/55 hover:border-amber-400/40'}`}>
                    {c.label.length > 34 ? c.label.slice(0, 33) + '…' : c.label} ({c.count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kanban 6 stades */}
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {PIPELINE_STAGES.map(stage => {
              const colRows = visibleRows.filter(r => r.stage === stage.id);
              return (
                <div key={stage.id} className="w-72 shrink-0 rounded-2xl border border-kurla-cream/10 bg-kurla-ink/60 p-2.5">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-kurla-amber">{stage.label}</p>
                    <span className="text-[11px] font-bold text-kurla-cream/60">{colRows.length}</span>
                  </div>
                  <div className="space-y-1.5 max-h-[420px] overflow-y-auto [scrollbar-width:thin]">
                    {colRows.length === 0 && <p className="text-[10px] text-kurla-cream/30 px-1 py-2">Aucun produit.</p>}
                    {colRows.slice(0, 60).map(row => (
                      <div key={row.id} className={`rounded-xl border px-2.5 py-2 ${row.anomaly ? 'border-rose-500/40 bg-rose-500/[0.07]' : 'border-kurla-cream/10 bg-kurla-espresso'}`}>
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
                    ))}
                    {colRows.length > 60 && <p className="text-[10px] text-kurla-cream/35 px-1 py-1">+ {colRows.length - 60} — affiner avec un filtre.</p>}
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
