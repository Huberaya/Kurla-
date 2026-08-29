import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Boxes, GitBranch, Link2, RefreshCw, Save, Search } from 'lucide-react';

type BatchAdminPanelProps = {
  headers: HeadersInit;
  onSuccess?: (message: string) => void;
};

type Batch = {
  id: string;
  lotReference: string;
  productId: string;
  supplierId?: string;
  sourcingItemId?: string;
  quantityReceived: number;
  unitCostCents: number;
  freightCents: number;
  dutyCents: number;
  otherCostsCents: number;
  currency: string;
  servedCostCents: number;
  receivedOn: string;
  expiresOn?: string;
  status: string;
};

type Trace = {
  batch: Batch;
  rows: Array<{ orderId: string; orderStatus: string; allocatedQuantity: number; orderedQuantity: number; customerEmail?: string; orderedAt: string }>;
  orders: string[];
  orderCount: number;
  allocatedUnits: number;
  unallocatedUnits: number;
};

type AllocatableLine = {
  orderItemId: string;
  orderId: string;
  productId: string;
  productName?: string;
  orderStatus: string;
  orderedQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  customerEmail?: string;
};

type DoubleSourcingRow = {
  productId: string;
  productName: string;
  incumbentSupplierIds: string[];
  qualificationBasis: string | null;
  requiredDocuments: string[];
  qualifiedAlternatives: Array<{ supplierId: string; legalName: string }>;
  hasSecondSource: boolean | null;
  batches: number;
};

const BATCH_STATUS_LABELS: Record<string, string> = {
  received: 'Reçu',
  in_stock: 'En stock',
  depleted: 'Épuisé',
  rejected: 'Rejeté'
};

function inputClass(): string {
  return 'w-full px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]';
}
function labelClass(): string {
  return 'text-[10px] uppercase tracking-wider font-bold text-[#D49A63]';
}
/** Les coûts sont stockés en centimes ; la saisie se fait en euros. */
function toCents(euros: string): number | null {
  if (!euros) return null;
  const parsed = Number(euros.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
function euros(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents === null || cents === undefined) return '—';
  return `${(cents / 100).toFixed(2).replace('.', ',')} ${currency === 'EUR' ? '€' : currency}`;
}

export function BatchAdminPanel({ headers, onSuccess }: BatchAdminPanelProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sourcingItems, setSourcingItems] = useState<any[]>([]);
  const [doubleSourcing, setDoubleSourcing] = useState<{ products: number; withSecondSource: number; withoutSecondSource: number; undetermined: number; rows: DoubleSourcingRow[] } | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [lines, setLines] = useState<AllocatableLine[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState({
    lotReference: '', productId: '', supplierId: '', sourcingItemId: '',
    quantityReceived: '', unitCost: '', freight: '', duty: '', otherCosts: '',
    currency: 'EUR', receivedOn: '', expiresOn: '', status: 'received'
  });
  const [allocationDraft, setAllocationDraft] = useState({ orderItemId: '', quantity: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [batchResponse, productResponse, supplierResponse, itemResponse, reportResponse] = await Promise.all([
        fetch('/api/admin/batches', { headers }),
        fetch('/api/admin/catalog/products', { headers }),
        fetch('/api/admin/suppliers', { headers }),
        fetch('/api/admin/sourcing/items', { headers }),
        fetch('/api/admin/double-sourcing', { headers })
      ]);
      const batchData = await batchResponse.json();
      const productData = await productResponse.json();
      const supplierData = await supplierResponse.json();
      const itemData = await itemResponse.json();
      const reportData = await reportResponse.json();
      if (!batchResponse.ok) throw new Error(batchData.error || 'Lots indisponibles.');
      if (!productResponse.ok) throw new Error(productData.error || 'Catalogue indisponible.');
      if (!supplierResponse.ok) throw new Error(supplierData.error || 'Fournisseurs indisponibles.');
      if (!itemResponse.ok) throw new Error(itemData.error || 'Besoins de sourcing indisponibles.');
      if (!reportResponse.ok) throw new Error(reportData.error || 'Rapport de double sourcing indisponible.');
      setBatches(batchData.batches || []);
      setProducts(productData.products || []);
      setSuppliers(supplierData.suppliers || []);
      setSourcingItems(itemData.items || []);
      setDoubleSourcing(reportData.report || null);
    } catch (loadError: any) {
      setError(loadError.message || 'Lots indisponibles.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const openTrace = async (batchId: string) => {
    setError('');
    setLines([]);
    setAllocationDraft({ orderItemId: '', quantity: '' });
    try {
      const response = await fetch(`/api/admin/batches/${encodeURIComponent(batchId)}/trace`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Traçabilité indisponible.');
      setTrace(data);
      const linesResponse = await fetch(`/api/admin/order-items?productId=${encodeURIComponent(data.batch.productId)}`, { headers });
      const linesData = await linesResponse.json();
      if (linesResponse.ok) setLines((linesData.items || []).filter((line: AllocatableLine) => line.remainingQuantity > 0));
    } catch (traceError: any) {
      setError(traceError.message || 'Traçabilité indisponible.');
    }
  };

  const createBatch = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/batches', {
        method: 'POST', headers,
        body: JSON.stringify({
          lotReference: draft.lotReference,
          productId: draft.productId,
          supplierId: draft.supplierId || undefined,
          sourcingItemId: draft.sourcingItemId || undefined,
          quantityReceived: draft.quantityReceived ? Number(draft.quantityReceived) : null,
          unitCostCents: toCents(draft.unitCost),
          freightCents: toCents(draft.freight) ?? 0,
          dutyCents: toCents(draft.duty) ?? 0,
          otherCostsCents: toCents(draft.otherCosts) ?? 0,
          currency: draft.currency,
          receivedOn: draft.receivedOn || undefined,
          expiresOn: draft.expiresOn || undefined,
          status: draft.status
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lot non enregistré.');
      onSuccess?.(`Lot « ${data.batch.lotReference} » enregistré. Coût servi calculé : ${euros(data.batch.servedCostCents, data.batch.currency)} par unité.`);
      setDraft({ lotReference: '', productId: '', supplierId: '', sourcingItemId: '', quantityReceived: '', unitCost: '', freight: '', duty: '', otherCosts: '', currency: 'EUR', receivedOn: '', expiresOn: '', status: 'received' });
      await load();
    } catch (createError: any) {
      setError(createError.message || 'Lot non enregistré.');
    } finally {
      setBusy(false);
    }
  };

  const allocate = async () => {
    if (!trace) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/batches/${encodeURIComponent(trace.batch.id)}/allocations`, {
        method: 'POST', headers,
        body: JSON.stringify({ orderItemId: allocationDraft.orderItemId, quantity: Number(allocationDraft.quantity) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Allocation refusée.');
      onSuccess?.(`${data.allocation.quantity} unité(s) du lot ${trace.batch.lotReference} allouée(s) à la commande.`);
      setAllocationDraft({ orderItemId: '', quantity: '' });
      await openTrace(trace.batch.id);
      await load();
    } catch (allocationError: any) {
      setError(allocationError.message || 'Allocation refusée.');
    } finally {
      setBusy(false);
    }
  };

  const productName = (productId: string): string => products.find(product => product.id === productId)?.name || productId;
  const supplierName = (supplierId?: string): string => supplierId ? (suppliers.find(supplier => supplier.id === supplierId)?.legalName || supplierId) : '—';

  const totalUnits = batches.reduce((sum, batch) => sum + batch.quantityReceived, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2"><Boxes size={18} /> Lots et traçabilité</h2>
          <p className="text-[11px] text-[#FFF7EF]/60 mt-1 max-w-3xl">
            Ce qui est entré en stock, à quel coût réel, et dans quelles commandes c'est parti.
            Le coût servi se calcule à partir des coûts saisis — il ne s'estime pas.
          </p>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-xl border border-[#FFF7EF]/15 text-[#FFF7EF]/80 text-xs flex items-center gap-2 hover:border-[#C8753D]">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Recharger
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-200 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Lots enregistrés', value: batches.length },
          { label: 'Unités reçues', value: totalUnits },
          { label: 'Unités allouées', value: trace ? trace.allocatedUnits : '—' },
          { label: 'Réponses de traçabilité', value: trace ? trace.orderCount : '—' }
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] px-4 py-3">
            <div className="text-2xl font-bold text-[#FFF7EF]">{kpi.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#D49A63] mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3">Enregistrer un lot reçu</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1"><span className={labelClass()}>Référence de lot *</span>
            <input className={inputClass()} value={draft.lotReference} onChange={event => setDraft({ ...draft, lotReference: event.target.value })} placeholder="LOT-2026-001" /></label>
          <label className="space-y-1"><span className={labelClass()}>Produit *</span>
            <select className={inputClass()} value={draft.productId} onChange={event => setDraft({ ...draft, productId: event.target.value })}>
              <option value="">— choisir —</option>
              {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select></label>
          <label className="space-y-1"><span className={labelClass()}>Fournisseur</span>
            <select className={inputClass()} value={draft.supplierId} onChange={event => setDraft({ ...draft, supplierId: event.target.value })}>
              <option value="">— aucun —</option>
              {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.legalName}</option>)}
            </select></label>
          <label className="space-y-1"><span className={labelClass()}>Besoin de sourcing</span>
            <select className={inputClass()} value={draft.sourcingItemId} onChange={event => setDraft({ ...draft, sourcingItemId: event.target.value })}>
              <option value="">— aucun —</option>
              {sourcingItems.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select></label>
          <label className="space-y-1"><span className={labelClass()}>Quantité reçue *</span>
            <input className={inputClass()} value={draft.quantityReceived} onChange={event => setDraft({ ...draft, quantityReceived: event.target.value })} placeholder="1000" /></label>
          <label className="space-y-1"><span className={labelClass()}>Coût unitaire (€) *</span>
            <input className={inputClass()} value={draft.unitCost} onChange={event => setDraft({ ...draft, unitCost: event.target.value })} placeholder="3,50" /></label>
          <label className="space-y-1"><span className={labelClass()}>Fret (€)</span>
            <input className={inputClass()} value={draft.freight} onChange={event => setDraft({ ...draft, freight: event.target.value })} placeholder="250" /></label>
          <label className="space-y-1"><span className={labelClass()}>Droits de douane (€)</span>
            <input className={inputClass()} value={draft.duty} onChange={event => setDraft({ ...draft, duty: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>Autres coûts (€)</span>
            <input className={inputClass()} value={draft.otherCosts} onChange={event => setDraft({ ...draft, otherCosts: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>Reçu le *</span>
            <input type="date" className={inputClass()} value={draft.receivedOn} onChange={event => setDraft({ ...draft, receivedOn: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>Expire le</span>
            <input type="date" className={inputClass()} value={draft.expiresOn} onChange={event => setDraft({ ...draft, expiresOn: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>Statut</span>
            <select className={inputClass()} value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>
              {Object.entries(BATCH_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
        </div>
        <p className="text-[10px] text-[#FFF7EF]/40 mt-3">
          Le coût servi par unité est calculé par la base : (quantité × coût unitaire + fret + droits + autres) ÷ quantité.
          Saisissez ce que vous avez réellement payé — un coût saisi au hasard fausse toute la marge affichée ensuite.
        </p>
        <button onClick={() => void createBatch()} disabled={busy || !draft.lotReference.trim() || !draft.productId || !draft.quantityReceived || !draft.unitCost || !draft.receivedOn}
          className="mt-4 px-4 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
          <Save size={13} /> Enregistrer le lot
        </button>
      </section>

      <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3">Lots ({batches.length})</h3>
        {batches.length === 0 ? (
          <p className="text-xs text-[#FFF7EF]/50">
            Aucun lot enregistré. Tant qu'aucun achat réel n'a eu lieu, il n'y a ni coût servi ni traçabilité —
            et rien n'est affiché à la place.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#D49A63]">
                  <th className="py-2 pr-3">Lot</th>
                  <th className="py-2 pr-3">Produit</th>
                  <th className="py-2 pr-3">Fournisseur</th>
                  <th className="py-2 pr-3">Quantité</th>
                  <th className="py-2 pr-3">Coût servi / unité</th>
                  <th className="py-2 pr-3">Reçu le</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {batches.map(batch => (
                  <tr key={batch.id} className="border-t border-[#FFF7EF]/10">
                    <td className="py-2 pr-3 text-[#FFF7EF] font-mono">{batch.lotReference}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{productName(batch.productId)}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{supplierName(batch.supplierId)}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{batch.quantityReceived}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]">{euros(batch.servedCostCents, batch.currency)}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{batch.receivedOn}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{BATCH_STATUS_LABELS[batch.status] || batch.status}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => void openTrace(batch.id)} className="text-[#C8753D] hover:underline flex items-center gap-1 ml-auto">
                        <Search size={11} /> Tracer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {trace && (
        <section className="rounded-2xl border border-[#C8753D]/40 bg-[#C8753D]/[0.06] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#FFF7EF] flex items-center gap-2"><Link2 size={14} /> Lot {trace.batch.lotReference}</h3>
            <p className="text-[11px] text-[#FFF7EF]/60">
              {productName(trace.batch.productId)} · {trace.batch.quantityReceived} unité(s) reçues ·
              {trace.allocatedUnits} allouée(s) · <strong>{trace.unallocatedUnits} restante(s)</strong> ·
              {trace.orderCount} commande(s) concernée(s)
            </p>
          </div>

          <div>
            <h4 className={labelClass()}>Commandes contenant ce lot ({trace.rows.length})</h4>
            {trace.rows.length === 0 ? (
              <p className="text-[11px] text-[#FFF7EF]/50 mt-1">
                Ce lot n'est encore dans aucune commande. La réponse à « quelles commandes contiennent ce lot » est : aucune.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {trace.rows.map((row, index) => (
                  <li key={`${row.orderId}-${index}`} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                    <div className="text-xs text-[#FFF7EF] font-mono">{row.orderId} <span className="text-[#FFF7EF]/50">· {row.orderStatus}</span></div>
                    <div className="text-[10px] text-[#FFF7EF]/60">
                      {row.allocatedQuantity} unité(s) allouée(s) sur {row.orderedQuantity} commandée(s) · le {String(row.orderedAt).slice(0, 10)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {trace.unallocatedUnits > 0 && (
            <div className="rounded-xl border border-[#FFF7EF]/10 p-3 space-y-2">
              <h4 className={labelClass()}>Allouer à une ligne de commande</h4>
              {lines.length === 0 ? (
                <p className="text-[11px] text-[#FFF7EF]/50">Aucune ligne de commande en attente pour ce produit.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <label className="space-y-1 md:col-span-2"><span className={labelClass()}>Ligne de commande</span>
                      <select className={inputClass()} value={allocationDraft.orderItemId}
                        onChange={event => {
                          const selected = lines.find(line => line.orderItemId === event.target.value);
                          setAllocationDraft({ orderItemId: event.target.value, quantity: selected ? String(Math.min(selected.remainingQuantity, trace.unallocatedUnits)) : '' });
                        }}>
                        <option value="">— choisir —</option>
                        {lines.map(line => (
                          <option key={line.orderItemId} value={line.orderItemId}>
                            {line.orderId} · {line.remainingQuantity} restant(s) sur {line.orderedQuantity} · {line.orderStatus}
                          </option>
                        ))}
                      </select></label>
                    <label className="space-y-1"><span className={labelClass()}>Quantité</span>
                      <input className={inputClass()} value={allocationDraft.quantity}
                        onChange={event => setAllocationDraft({ ...allocationDraft, quantity: event.target.value })} /></label>
                  </div>
                  <button onClick={() => void allocate()} disabled={busy || !allocationDraft.orderItemId || !allocationDraft.quantity}
                    className="px-3 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold disabled:opacity-40">
                    Allouer
                  </button>
                  <p className="text-[10px] text-[#FFF7EF]/40">
                    Refusé si la quantité dépasse la ligne, dépasse le lot, ou si le lot ne porte pas ce produit.
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {doubleSourcing && (
        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3 flex items-center gap-2">
            <GitBranch size={13} /> Double sourcing — {doubleSourcing.withSecondSource} couvert(s), {doubleSourcing.withoutSecondSource} à risque, {doubleSourcing.undetermined} indéterminé(s)
          </h3>
          {doubleSourcing.rows.length === 0 ? (
            <p className="text-xs text-[#FFF7EF]/50">
              Aucun produit n'a reçu de lot : il n'y a rien à qualifier. Le double sourcing se mesure sur des
              approvisionnements réels, pas sur des intentions.
            </p>
          ) : (
            <ul className="space-y-2">
              {doubleSourcing.rows.map(row => (
                <li key={row.productId} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                  <div className="text-xs text-[#FFF7EF]">
                    {row.productName}
                    {row.hasSecondSource === null && <span className="ml-2 text-[#FFF7EF]/50">indéterminé — aucun besoin de sourcing rattaché</span>}
                    {row.hasSecondSource === true && <span className="ml-2 text-emerald-300">second fournisseur qualifié disponible</span>}
                    {row.hasSecondSource === false && <span className="ml-2 text-amber-300">aucun second fournisseur qualifié</span>}
                  </div>
                  <div className="text-[10px] text-[#FFF7EF]/50 mt-1">
                    {row.batches} lot(s) · fournisseur(s) actuel(s) : {row.incumbentSupplierIds.map(supplierName).join(', ') || '—'}
                    {row.requiredDocuments.length > 0 && ` · exigés : ${row.requiredDocuments.join(', ')}`}
                  </div>
                  {row.qualifiedAlternatives.length > 0 && (
                    <div className="text-[10px] text-emerald-300/80 mt-1">
                      Alternative(s) qualifiée(s) : {row.qualifiedAlternatives.map(entry => entry.legalName).join(', ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-[#FFF7EF]/40 mt-3">
            « Qualifié » signifie : détenir tous les documents exigés par le besoin de sourcing rattaché.
            Un fournisseur qui n'en a qu'une partie n'est pas une alternative.
          </p>
        </section>
      )}
    </div>
  );
}
