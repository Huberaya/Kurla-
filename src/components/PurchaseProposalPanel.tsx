/**
 * PROPOSITION D'ACHAT — l'objet « que commander, à qui, combien » (17/09, phase 3).
 *
 * La demande (précommandes fermes + en attente, kits déroulés), le stock et les
 * lots reçus sont assemblés en un tableau d'achat : pour chaque référence, la
 * quantité à commander (= demande − stock, jamais négative), le fournisseur
 * rattaché (MOQ, délai), le coût unitaire réel si un lot a été reçu, et les
 * pièces manquantes (lues sur l'état de publication).
 *
 * Aucune donnée inventée : le coût unitaire est celui du **lot reçu le plus
 * récent** (centimes → euros), sinon « à obtenir » ; le total estimé n'est
 * complet que si TOUTES les références à commander ont un coût connu — sinon il
 * est affiché comme estimation partielle. L'export CSV est une fonction pure
 * testée par le banc `kurla_purchase_proposal`. L'envoi des e-mails reste un
 * acte humain (vue consolidée, mailto/copier).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ProductName, SupplierName } from './EditableRecordName';
import { ColumnFilterPresence, ColumnFilterText, applyColumnFilters, emptyFilterState, type ColumnFilter, listFilter } from '../lib/columnFilters';
import { Download, FileText } from 'lucide-react';

export interface PurchaseProposalRow {
  productId: string;
  name: string;
  slug?: string;
  isKit: boolean;
  isPreorder: boolean;
  /** Demande totale à couvrir (fermes + attente + déroulage des kits). */
  qtyDemand: number;
  stockOnHand: number;
  qtyToOrder: number;
  supplierName: string | null;
  /** Identifiant de la fiche fournisseur — permet d'ouvrir et de modifier la
   *  fiche depuis cette ligne (17/09, 2e demande : tout est modifiable ici). */
  supplierId: string | null;
  moqUnits: number | null;
  leadTimeDays: number | null;
  unitCostEur: number | null;
  /** Provenance du coût : « lot reçu le JJ/MM/AAAA » ou « à obtenir ». */
  unitCostLabel: string;
  /** Pièces manquantes lues sur l'état de publication (nommées, jamais inventées). */
  missing: string[];
  totalEstEur: number | null;
}

export interface PurchaseProposalInput {
  /** /api/admin/preorder-demand → products (qtyToSource = fermes + attente + kits) */
  demand?: Array<{ productId: string; name: string; slug?: string; isKit?: boolean; isPreorder?: boolean; qtyToSource: number }> | null;
  /** /api/admin/catalog/products → stock + fournisseur rattaché */
  products?: Array<{ id: string; stockQuantity?: number; supplierId?: string | null }> | null;
  /** /api/admin/suppliers → MOQ, délai */
  suppliers?: Array<{ id: string; legalName?: string; tradeName?: string; moqUnits?: number | null; leadTimeDays?: number | null }> | null;
  /** /api/admin/batches → coût réel du lot reçu */
  batches?: Array<{ productId?: string | null; receivedOn?: string; unitCost?: number | null }> | null;
  /** /api/admin/catalog/publication-readiness → perProduct (missing) */
  readiness?: Array<{ productId: string; missing: string[] }> | null;
}

export interface PurchaseProposalResult {
  rows: PurchaseProposal[];
  totals: { refs: number; units: number; estEur: number | null; estComplete: boolean };
}

type PurchaseProposal = PurchaseProposalRow;

function eurFromCents(cents: number | null | undefined): number | null {
  const n = Number(cents);
  return Number.isFinite(n) && n > 0 ? Math.round(n) / 100 : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Dérive la proposition d'achat. Fonction pure, sans DOM ni réseau. */
export function buildPurchaseProposal(input: PurchaseProposalInput): PurchaseProposalResult {
  const demand = (input.demand || []).filter(row => (Number(row.qtyToSource) || 0) > 0);
  if (demand.length === 0) return { rows: [], totals: { refs: 0, units: 0, estEur: null, estComplete: true } };

  const productById = new Map<string, any>((input.products || []).map(p => [String(p.id), p]));
  const supplierById = new Map<string, any>((input.suppliers || []).map(s => [String(s.id), s]));
  const missingById = new Map<string, string[]>((input.readiness || []).map(r => [String(r.productId), r.missing || []]));

  // Coût réel : le lot reçu le plus récent par produit (jamais la moyenne,
  // jamais une estimation : le dernier prix payé est le seul fait connu).
  const latestLot = new Map<string, { receivedOn: string; unitCost: number | null }>();
  for (const batch of input.batches || []) {
    const pid = String(batch.productId ?? '');
    if (!pid) continue;
    const on = String(batch.receivedOn || '');
    const prev = latestLot.get(pid);
    if (!prev || on >= prev.receivedOn) {
      const cost = eurFromCents(batch.unitCost);
      if (cost != null) latestLot.set(pid, { receivedOn: on, unitCost: cost });
    }
  }

  const rows: PurchaseProposal[] = demand.map(row => {
    const productId = String(row.productId);
    const product = productById.get(productId) || {};
    const stockOnHand = Math.max(0, Number(product.stockQuantity) || 0);
    const qtyDemand = Math.max(0, Number(row.qtyToSource) || 0);
    const qtyToOrder = Math.max(0, qtyDemand - stockOnHand);

    const supplier = product.supplierId ? supplierById.get(String(product.supplierId)) : undefined;
    const supplierName = supplier ? String(supplier.legalName || supplier.tradeName || '') || null : null;
    const moqUnits = supplier && Number.isFinite(Number(supplier.moqUnits)) ? Number(supplier.moqUnits) : null;
    const leadTimeDays = supplier && Number.isFinite(Number(supplier.leadTimeDays)) ? Number(supplier.leadTimeDays) : null;

    const lot = latestLot.get(productId);
    const unitCostEur = lot?.unitCost ?? null;
    const unitCostLabel = lot && lot.receivedOn
      ? `lot reçu le ${lot.receivedOn.slice(0, 10)}`
      : 'à obtenir';

    const totalEstEur = qtyToOrder > 0 && unitCostEur != null ? round2(qtyToOrder * unitCostEur) : null;

    return {
      productId,
      name: String(row.name || productId),
      slug: row.slug,
      isKit: !!row.isKit,
      isPreorder: !!row.isPreorder,
      qtyDemand,
      stockOnHand,
      qtyToOrder,
      supplierName: supplierName || null,
      supplierId: supplier ? String(supplier.id) : null,
      moqUnits,
      leadTimeDays,
      unitCostEur,
      unitCostLabel,
      missing: missingById.get(productId) || [],
      totalEstEur
    };
  });

  rows.sort((a, b) => (b.qtyToOrder - a.qtyToOrder) || a.name.localeCompare(b.name));

  const toOrderRows = rows.filter(row => row.qtyToOrder > 0);
  const knownTotals = toOrderRows.filter(row => row.totalEstEur != null);
  const estEur = knownTotals.length > 0 ? round2(knownTotals.reduce((sum, row) => sum + (row.totalEstEur ?? 0), 0)) : null;
  return {
    rows,
    totals: {
      refs: rows.length,
      units: toOrderRows.reduce((sum, row) => sum + row.qtyToOrder, 0),
      estEur,
      estComplete: toOrderRows.length > 0 && knownTotals.length === toOrderRows.length
    }
  };
}

/** Export CSV RFC4180 (CRLF, guillemets échappés). Fonction pure, testée. */
export function purchaseProposalToCsv(result: PurchaseProposalResult): string {
  const header = ['Reference', 'Nom', 'Demande', 'Stock', 'A_commander', 'Fournisseur', 'MOQ', 'Delai_jours', 'Cout_unitaire_eur', 'Total_estime_eur', 'Pices_manquantes'];
  const escape = (value: string | number | null): string => {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [header.join(',')];
  for (const row of result.rows) {
    lines.push([
      row.productId,
      row.name,
      row.qtyDemand,
      row.stockOnHand,
      row.qtyToOrder,
      row.supplierName,
      row.moqUnits,
      row.leadTimeDays,
      row.unitCostEur,
      row.totalEstEur,
      row.missing.join(' | ')
    ].map(escape).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export const PurchaseProposalPanel: React.FC<{ headers: HeadersInit }> = ({ headers }) => {
  const [result, setResult] = useState<PurchaseProposalResult | null>(null);
  /** Incrémenté après une modification faite depuis une ligne : le tableau relit
   *  ses cinq sources et affiche la nouvelle valeur sans recharger la page. */
  const [reloadToken, setReloadToken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [exported, setExported] = useState(false);

  // Filtres par colonne (17/09) : la proposition d'achat est le tableau où
  // l'on décide quoi commander — « à commander » et « fournisseur » doivent se
  // croiser sans faire défiler 100 lignes. Calcul partagé (columnFilters).
  const PROPOSAL_FILTER_KEYS = ['reference', 'demand', 'stock', 'toOrder', 'supplier', 'moq', 'lead', 'unitCost', 'total', 'missing'] as const;
  const proposalFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'reference', ...listFilter({ key: 'reference', rows: result?.rows ?? [], get: (row: any) => row.name, extra: (row: any) => [row.slug, row.productId] }) },
    { key: 'demand', kind: 'numeric', get: (row: any) => row.qtyDemand, unit: ' u' },
    { key: 'stock', kind: 'numeric', get: (row: any) => row.stockOnHand, unit: ' u' },
    { key: 'toOrder', kind: 'numeric', get: (row: any) => row.qtyToOrder, unit: ' u' },
    { key: 'supplier', ...listFilter({ key: 'supplier', rows: result?.rows ?? [], get: (row: any) => row.supplierName, emptyLabel: 'À sourcer' }) },
    { key: 'moq', kind: 'numeric', get: (row: any) => (row.moqUnits == null ? NaN : row.moqUnits), unit: ' u' },
    { key: 'lead', kind: 'numeric', get: (row: any) => (row.leadTimeDays == null ? NaN : row.leadTimeDays), unit: ' j' },
    { key: 'unitCost', kind: 'numeric', get: (row: any) => (row.unitCostEur == null ? NaN : row.unitCostEur), unit: ' €' },
    { key: 'total', kind: 'numeric', get: (row: any) => (row.totalEstEur == null ? NaN : row.totalEstEur), unit: ' €' },
    { key: 'missing', kind: 'present', get: (row: any) => row.missing, presentLabels: { filled: 'Pièces manquantes', empty: 'Dossier complet' } },
  ], []);
  const [proposalFilterState, setProposalFilterState] = useState(() => emptyFilterState(PROPOSAL_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const setProposalFilter = (key: string, value: string) => setProposalFilterState(prev => ({ ...prev, [key]: value }));
  const visibleProposals = useMemo(
    () => applyColumnFilters(result?.rows || [], proposalFilters, proposalFilterState),
    [result, proposalFilters, proposalFilterState]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [demand, products, suppliers, batches, readiness] = await Promise.allSettled([
        fetch('/api/admin/preorder-demand', { headers }),
        fetch('/api/admin/catalog/products', { headers }),
        fetch('/api/admin/suppliers', { headers }),
        fetch('/api/admin/batches', { headers }),
        fetch('/api/admin/catalog/publication-readiness', { headers })
      ]);
      if (cancelled) return;
      const failed: string[] = [];
      const names = ['la demande précommandes', 'le catalogue', 'les fournisseurs', 'les lots reçus', 'l’état de publication'];
      [demand, products, suppliers, batches, readiness].forEach((r, i) => {
        if (r.status === 'rejected') failed.push(names[i]);
      });
      const json = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value.json() : Promise.resolve(null));
      const [demandJson, productsJson, suppliersJson, batchesJson, readinessJson] = await Promise.all([
        json(demand), json(products), json(suppliers), json(batches), json(readiness)
      ]);
      if (cancelled) return;
      setUnavailable(failed);
      setResult(buildPurchaseProposal({
        demand: demandJson?.products || null,
        products: productsJson?.products || null,
        suppliers: suppliersJson?.suppliers || null,
        batches: batchesJson?.batches || null,
        readiness: readinessJson?.perProduct || null
      }));
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // headers récréé à chaque rendu du dashboard : lecture une seule fois au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, reloadToken, result]);

  const downloadCsv = () => {
    if (!result || result.rows.length === 0) return;
    const blob = new Blob([purchaseProposalToCsv(result)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `proposition-achat-kurla-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 4000);
  };

  const fmt = (n: number | null): string => (n == null ? '—' : n.toFixed(2).replace('.', ','));

  return (
    <section className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-copper/30 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <FileText className="w-5 h-5 text-kurla-copper" /> Proposition d'achat — premier lot
          </h2>
          <p className="text-xs text-kurla-cream/55 mt-1 max-w-3xl">
            Ce qu'il faut commander, à qui, et combien : demande précommandes (fermes + attente, kits déroulés)
            moins le stock, fournisseur rattaché avec MOQ et délai, coût unitaire du dernier lot reçu.
            Tout est lu sur les données réelles — un coût inconnu reste « à obtenir », jamais estimé à la place.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={!result || result.rows.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-kurla-copper text-white text-xs font-bold hover:bg-kurla-cocoa transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> {exported ? 'Exporté ✓' : 'Exporter le CSV'}
        </button>
      </div>

      {loading && <div className="rounded-xl border border-kurla-cream/10 p-4 text-xs text-kurla-cream/45">Lecture de la demande, du stock, des lots et des fournisseurs…</div>}

      {result && !loading && result.rows.length === 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 text-xs text-emerald-200/90">
          Aucune référence à couvrir : il n'y a pas de demande à sourcer en quantité. La proposition se remplira
          au fil des précommandes.
        </div>
      )}

      {result && !loading && result.rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-3 text-center"><p className="text-xl font-bold text-kurla-cream">{result.totals.refs}</p><p className="text-[10px] uppercase tracking-wider text-kurla-cream/45">références concernées</p></div>
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-3 text-center"><p className="text-xl font-bold text-kurla-copper">{result.totals.units}</p><p className="text-[10px] uppercase tracking-wider text-kurla-cream/45">unités à commander</p></div>
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-3 text-center">
              <p className={`text-xl font-bold ${result.totals.estEur != null ? (result.totals.estComplete ? 'text-emerald-300' : 'text-amber-300') : 'text-kurla-cream/35'}`}>{result.totals.estEur != null ? `${result.totals.estEur.toFixed(2).replace('.', ',')} €` : '—'}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45">{result.totals.estEur == null ? 'coût à obtenir' : result.totals.estComplete ? 'coût estimé (coûts lots connus)' : 'estimation partielle (quelques coûts inconnus)'}</p>
            </div>
            <div className="rounded-xl bg-kurla-ink border border-kurla-cream/10 p-3 text-center">
              <p className="text-xl font-bold text-kurla-cream">{result.rows.filter(r => r.missing.length > 0).length}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45">références avec pièces manquantes</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-kurla-cream/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-kurla-ink text-kurla-amber uppercase tracking-wider text-[10px]">
                  <th className="text-left px-3 py-2.5">Référence</th>
                  <th className="text-right px-3 py-2.5">Demande</th>
                  <th className="text-right px-3 py-2.5">Stock</th>
                  <th className="text-right px-3 py-2.5">À commander</th>
                  <th className="text-left px-3 py-2.5">Fournisseur</th>
                  <th className="text-right px-3 py-2.5">MOQ</th>
                  <th className="text-right px-3 py-2.5">Délai</th>
                  <th className="text-right px-3 py-2.5">Coût unit.</th>
                  <th className="text-right px-3 py-2.5">Total estimé</th>
                  <th className="text-left px-3 py-2.5">Pièces</th>
                </tr>
                <tr className="bg-kurla-ink/40">
                  <th className="px-3 py-2"><ColumnFilterText placeholder="Nom, slug…" value={proposalFilterState.reference} onChange={value => setProposalFilter('reference', value)} ariaLabel="Filtrer par référence" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="10-" value={proposalFilterState.demand} onChange={value => setProposalFilter('demand', value)} ariaLabel="Filtrer par demande" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="-5" value={proposalFilterState.stock} onChange={value => setProposalFilter('stock', value)} ariaLabel="Filtrer par stock" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="1-" value={proposalFilterState.toOrder} onChange={value => setProposalFilter('toOrder', value)} ariaLabel="Filtrer par quantité à commander" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="Fournisseur…" value={proposalFilterState.supplier} onChange={value => setProposalFilter('supplier', value)} ariaLabel="Filtrer par fournisseur" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="MOQ…" value={proposalFilterState.moq} onChange={value => setProposalFilter('moq', value)} ariaLabel="Filtrer par MOQ" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="-30" value={proposalFilterState.lead} onChange={value => setProposalFilter('lead', value)} ariaLabel="Filtrer par délai" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="2-9 €" value={proposalFilterState.unitCost} onChange={value => setProposalFilter('unitCost', value)} ariaLabel="Filtrer par coût unitaire" /></th>
                  <th className="px-3 py-2"><ColumnFilterText placeholder="100-" value={proposalFilterState.total} onChange={value => setProposalFilter('total', value)} ariaLabel="Filtrer par total estimé" /></th>
                  <th className="px-3 py-2">
                    <ColumnFilterPresence value={proposalFilterState.missing} onChange={value => setProposalFilter('missing', value)} ariaLabel="Filtrer par pièces manquantes" labels={{ filled: 'Manquantes', empty: 'Complet' }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleProposals.map(row => (
                  <tr key={row.productId} className={`border-t border-kurla-cream/10 ${row.qtyToOrder === 0 ? 'opacity-55' : ''}`}>
                    <td className="px-3 py-2.5">
                      {/* 17/09, 2e demande : la référence est modifiable d'ici. */}
                      <ProductName id={row.productId} label={row.name} headers={headers} className="text-xs font-semibold" onSaved={() => setReloadToken(t => t + 1)} />
                      {row.isKit && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 text-[9px] font-bold">kit</span>}
                      {row.isPreorder && !row.isKit && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[9px] font-bold">préco</span>}
                      <span className="block text-[10px] text-kurla-cream/40 font-mono">{row.slug || row.productId}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-kurla-cream/80">{row.qtyDemand}</td>
                    <td className="px-3 py-2.5 text-right text-kurla-cream/60">{row.stockOnHand}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-kurla-copper">{row.qtyToOrder > 0 ? row.qtyToOrder : 'couvert'}</td>
                    <td className="px-3 py-2.5">
                      {row.supplierId
                        ? <SupplierName id={row.supplierId} label={row.supplierName} headers={headers} className="text-xs" onSaved={() => setReloadToken(t => t + 1)} />
                        : <span className="text-amber-300/80">à sourcer — aucun fournisseur rattaché à cette référence</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-kurla-cream/70">{row.moqUnits != null ? row.moqUnits : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-kurla-cream/70">{row.leadTimeDays != null ? `${row.leadTimeDays} j` : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {row.unitCostEur != null ? <span className="text-kurla-cream">{fmt(row.unitCostEur)} €</span> : <span className="text-kurla-cream/40">à obtenir</span>}
                      <span className="block text-[9px] text-kurla-cream/35">{row.unitCostLabel}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-kurla-cream">{row.totalEstEur != null ? `${fmt(row.totalEstEur)} €` : '—'}</td>
                    <td className="px-3 py-2.5">
                      {row.missing.length === 0
                        ? <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">OK</span>
                        : <span title={row.missing.join('\n')} className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[9px] font-bold cursor-help">{row.missing.length} manquant{row.missing.length > 1 ? 's' : ''}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[11px] text-kurla-cream/50 border-t border-kurla-cream/10">
              <span className="font-bold text-kurla-cream">{visibleProposals.length}</span>/{result.rows.length} ligne{(result.rows.length || 0) > 1 ? 's' : ''}
              {visibleProposals.length !== result.rows.length && <> · filtres actifs — <button type="button" onClick={() => setProposalFilterState(emptyFilterState(PROPOSAL_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))} className="underline hover:text-kurla-cream">réinitialiser</button></>}
            </p>
          </div>
          <p className="text-[11px] text-kurla-cream/40">
            Coût unitaire = coût réel du dernier lot reçu ; sans lot reçu, « à obtenir » — l'export CSV porte la
            même discipline. L'envoi des demandes de prix se fait depuis la vue consolidée (e-mails prêts à copier).
          </p>
        </>
      )}

      {!loading && unavailable.length > 0 && (
        <p className="text-[11px] text-amber-200/80">
          Source{unavailable.length > 1 ? 's' : ''} indisponible{unavailable.length > 1 ? 's' : ''} : {unavailable.join(', ')} —
          le tableau est partiel, rien n'est masqué ni inventé.
        </p>
      )}
    </section>
  );
};
