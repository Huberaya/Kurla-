import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, FileCheck2, Gauge, Package, RefreshCw, Send, Trophy } from 'lucide-react';

type OperationsCockpitPanelProps = {
  headers: HeadersInit;
  onSuccess?: (message: string) => void;
};

type ProductRow = {
  productId: string;
  title: string;
  slug?: string;
  catalogStatus: string;
  ready: boolean;
  missing: string[];
  supplierId?: string;
  supplierName?: string;
  documentsHeld: string[];
  expiredDocuments: string[];
  servedCostCents: number | null;
  servedCostReason: string;
  batchCount: number;
};

type Cockpit = {
  generatedAt: string;
  products: number;
  readyToPublish: number;
  publishedStatus: number;
  publishedButNotListable: number;
  rows: ProductRow[];
  blockers: Array<{ label: string; count: number; productIds: string[] }>;
  productsWithoutSupplier: number;
  sourcing: {
    waves: Array<{ wave: string; items: number; toSource: number; inRfq: number; awarded: number; abandoned: number; rfqCount: number; responseCount: number }>;
    itemCount: number;
    rfqCount: number;
    responseCount: number;
    awardedCount: number;
  };
  servedCostAvailable: boolean;
  productsWithServedCost: number;
};

type SourcingItemRow = {
  id: string;
  wave: string;
  title: string;
  category: string;
  status: string;
  requiredDocuments: string[];
  rfqCount: number;
  sentCount: number;
  responseCount: number;
  selectableResponses: number;
};

type SourcingDetail = {
  item: SourcingItemRow;
  rfqs: Array<{ id: string; status: string; supplierId?: string; sentOn?: string; content: string; createdAt: string }>;
  comparison: {
    rows: Array<{
      response: { id: string; receivedOn: string; unitPriceCents: number | null; currency?: string; moqUnits: number | null; leadTimeDays: number | null; quoteReference?: string; notes?: string };
      supplierId?: string;
      supplierName?: string;
      documentsHeld: string[];
      documentsMissing: string[];
      pricePerUnitEuros: number | null;
      selectable: boolean;
    }>;
  };
};

const STATUS_LABELS: Record<string, string> = {
  to_source: 'À sourcer',
  in_rfq: 'En consultation',
  awarded: 'Attribué',
  abandoned: 'Abandonné'
};

function inputClass(): string {
  return 'w-full px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]';
}
function labelClass(): string {
  return 'text-[10px] uppercase tracking-wider font-bold text-[#D49A63]';
}

/** Un montant absent s'affiche absent. Jamais 0,00 : ce serait un prix inventé. */
function money(cents: number | null, currency?: string): string {
  if (cents === null) return 'non communiqué';
  return `${(cents / 100).toFixed(2).replace('.', ',')} ${currency || '€'}`;
}

export function OperationsCockpitPanel({ headers, onSuccess }: OperationsCockpitPanelProps) {
  const [cockpit, setCockpit] = useState<Cockpit | null>(null);
  const [items, setItems] = useState<SourcingItemRow[]>([]);
  const [detail, setDetail] = useState<SourcingDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContentFor, setShowContentFor] = useState<string | null>(null);
  const [responseDraft, setResponseDraft] = useState({ receivedOn: '', unitPriceCents: '', currency: 'EUR', moqUnits: '', leadTimeDays: '', quoteReference: '', notes: '' });
  const [sendDraft, setSendDraft] = useState({ rfqId: '', supplierId: '', sentOn: '', channel: 'courriel' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cockpitResponse, itemsResponse] = await Promise.all([
        fetch('/api/admin/operations/cockpit', { headers }),
        fetch('/api/admin/sourcing/items', { headers })
      ]);
      const cockpitData = await cockpitResponse.json();
      const itemsData = await itemsResponse.json();
      if (!cockpitResponse.ok) throw new Error(cockpitData.error || 'Cockpit indisponible.');
      if (!itemsResponse.ok) throw new Error(itemsData.error || 'Besoins de sourcing indisponibles.');
      setCockpit(cockpitData.cockpit);
      setItems(itemsData.items || []);
    } catch (loadError: any) {
      setError(loadError.message || 'Cockpit indisponible.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const openItem = async (itemId: string) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/sourcing/items/${encodeURIComponent(itemId)}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fiche de sourcing indisponible.');
      setDetail(data);
    } catch (itemError: any) {
      setError(itemError.message || 'Fiche de sourcing indisponible.');
    }
  };

  const act = async (path: string, method: string, body: any, successMessage: string, after?: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Opération refusée.');
      onSuccess?.(successMessage);
      await load();
      if (after) await after();
    } catch (actionError: any) {
      setError(actionError.message || 'Opération refusée.');
    } finally {
      setBusy(false);
    }
  };

  const createRfq = async (itemId: string) => {
    await act(`/api/admin/sourcing/items/${encodeURIComponent(itemId)}/rfqs`, 'POST', {},
      'Demande de prix générée en brouillon. Complétez-la avant de l’envoyer.',
      () => openItem(itemId));
  };

  const sendRfq = async () => {
    if (!sendDraft.rfqId || !sendDraft.supplierId) {
      setError('Un envoi exige une demande et un fournisseur identifié.');
      return;
    }
    await act(`/api/admin/sourcing/rfqs/${encodeURIComponent(sendDraft.rfqId)}/send`, 'POST',
      { supplierId: sendDraft.supplierId, sentOn: sendDraft.sentOn || undefined, channel: sendDraft.channel },
      'Envoi enregistré. La plateforme n’envoie rien elle-même : c’est la trace de votre envoi.',
      async () => { if (detail) await openItem(detail.item.id); });
    setSendDraft({ rfqId: '', supplierId: '', sentOn: '', channel: 'courriel' });
  };

  const recordResponse = async () => {
    if (!detail) return;
    const rfqId = detail.rfqs.find(entry => entry.status !== 'draft')?.id;
    if (!rfqId) {
      setError('Aucune demande envoyée : personne n’a pu répondre.');
      return;
    }
    await act(`/api/admin/sourcing/rfqs/${encodeURIComponent(rfqId)}/responses`, 'POST', {
      receivedOn: responseDraft.receivedOn || undefined,
      unitPriceCents: responseDraft.unitPriceCents ? Number(responseDraft.unitPriceCents) : null,
      currency: responseDraft.currency || undefined,
      moqUnits: responseDraft.moqUnits ? Number(responseDraft.moqUnits) : null,
      leadTimeDays: responseDraft.leadTimeDays ? Number(responseDraft.leadTimeDays) : null,
      quoteReference: responseDraft.quoteReference || undefined,
      notes: responseDraft.notes || undefined
    }, 'Réponse enregistrée telle que reçue : aucun chiffre n’a été complété.',
      () => openItem(detail.item.id));
    setResponseDraft({ receivedOn: '', unitPriceCents: '', currency: 'EUR', moqUnits: '', leadTimeDays: '', quoteReference: '', notes: '' });
  };

  const award = async (responseId: string) => {
    if (!detail) return;
    await act(`/api/admin/sourcing/items/${encodeURIComponent(detail.item.id)}/award`, 'POST', { responseId },
      'Fournisseur retenu : les documents exigés étaient enregistrés.',
      () => openItem(detail.item.id));
  };

  const kpis = cockpit ? [
    { label: 'Produits au catalogue', value: cockpit.products, tone: 'text-[#FFF7EF]' },
    { label: 'Publiables maintenant', value: cockpit.readyToPublish, tone: cockpit.readyToPublish > 0 ? 'text-emerald-300' : 'text-amber-300' },
    { label: 'Statut « publié »', value: cockpit.publishedStatus, tone: 'text-[#FFF7EF]' },
    { label: 'Publiés mais non listables', value: cockpit.publishedButNotListable, tone: cockpit.publishedButNotListable > 0 ? 'text-red-300' : 'text-[#FFF7EF]' },
    { label: 'Sans fournisseur rattaché', value: cockpit.productsWithoutSupplier, tone: cockpit.productsWithoutSupplier > 0 ? 'text-amber-300' : 'text-emerald-300' },
    { label: 'Avec coût servi réel', value: cockpit.productsWithServedCost, tone: cockpit.productsWithServedCost > 0 ? 'text-emerald-300' : 'text-[#FFF7EF]/50' }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2"><Gauge size={18} /> Pilotage catalogue et approvisionnement</h2>
          <p className="text-[11px] text-[#FFF7EF]/60 mt-1 max-w-3xl">
            Une seule question à pouvoir trancher ici : <strong>ce produit peut-il être vendu, et sinon qu'est-ce qui manque</strong>.
            {cockpit ? ` Généré le ${new Date(cockpit.generatedAt).toLocaleString('fr-FR')}.` : ''}
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

      {cockpit && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(kpi => (
              <div key={kpi.label} className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] px-4 py-3">
                <div className={`text-2xl font-bold ${kpi.tone}`}>{kpi.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-[#D49A63] mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3 flex items-center gap-2">
              <AlertTriangle size={13} /> Ce qui bloque, nommé ({cockpit.blockers.length})
            </h3>
            {cockpit.blockers.length === 0 ? (
              <p className="text-xs text-[#FFF7EF]/60">Aucun blocage : tous les produits sont publiables.</p>
            ) : (
              <ul className="space-y-2">
                {cockpit.blockers.map(blocker => (
                  <li key={blocker.label} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                    <div className="text-xs text-[#FFF7EF]">{blocker.label} <span className="text-[#FFF7EF]/50">— {blocker.count} produit(s)</span></div>
                    <div className="text-[10px] text-[#FFF7EF]/40 font-mono break-all">{blocker.productIds.join(', ')}</div>
                  </li>
                ))}
              </ul>
            )}
            {cockpit.productsWithoutSupplier > 0 && (
              <p className="text-[11px] text-amber-200/80 mt-3">
                {cockpit.productsWithoutSupplier} produit(s) n'ont aucune provenance enregistrée. Ce n'est pas un blocage
                éditorial : c'est une absence d'approvisionnement, à traiter dans la section sourcing ci-dessous.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3 flex items-center gap-2">
              <Package size={13} /> Produit par produit
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#D49A63]">
                    <th className="py-2 pr-3">Produit</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2 pr-3">Vendable ?</th>
                    <th className="py-2 pr-3">Ce qui manque</th>
                    <th className="py-2 pr-3">Provenance</th>
                    <th className="py-2 pr-3">Documents</th>
                    <th className="py-2">Coût servi</th>
                  </tr>
                </thead>
                <tbody>
                  {cockpit.rows.map(row => (
                    <tr key={row.productId} className="border-t border-[#FFF7EF]/10 align-top">
                      <td className="py-2 pr-3 text-[#FFF7EF]">{row.title}<div className="text-[10px] text-[#FFF7EF]/40 font-mono">{row.productId}</div></td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">{row.catalogStatus}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] ${row.ready ? 'text-emerald-300 border-emerald-300/30 bg-emerald-300/10' : 'text-amber-300 border-amber-300/30 bg-amber-300/10'}`}>
                          {row.ready ? 'oui' : 'non'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">{row.missing.length ? row.missing.join(' · ') : '—'}</td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">
                        {row.supplierName || <span className="text-amber-300/90">aucune</span>}
                      </td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">
                        {row.documentsHeld.length ? (
                          <>
                            {row.documentsHeld.length} détenu(s)
                            {row.expiredDocuments.length > 0 && <span className="ml-1 text-amber-300">dont {row.expiredDocuments.length} périmé(s)</span>}
                          </>
                        ) : <span className="text-[#FFF7EF]/40">aucun</span>}
                      </td>
                      <td className="py-2 text-[#FFF7EF]/70" title={row.servedCostReason}>
                        {row.servedCostCents === null
                          ? <span className="text-[#FFF7EF]/40">aucun lot reçu</span>
                          : <>{(row.servedCostCents / 100).toFixed(2).replace('.', ',')} €<span className="text-[#FFF7EF]/40"> · {row.batchCount} lot(s)</span></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[#FFF7EF]/40 mt-3">
              Le coût servi est une moyenne pondérée des lots reçus, calculée à partir des coûts d'achat,
              du fret, des droits de douane et des autres coûts saisis. Un produit sans lot n'affiche
              aucune valeur : rien n'est estimé à la place.
              {cockpit.servedCostAvailable
                ? ` ${cockpit.productsWithServedCost} produit(s) sur ${cockpit.products} ont un coût servi réel.`
                : ' Aucun lot n’est encore enregistré.'}
            </p>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3 flex items-center gap-2">
          <ClipboardList size={13} /> Approvisionnement — {cockpit?.sourcing.itemCount ?? 0} besoin(s), {cockpit?.sourcing.rfqCount ?? 0} demande(s), {cockpit?.sourcing.responseCount ?? 0} réponse(s), {cockpit?.sourcing.awardedCount ?? 0} attribué(s)
        </h3>

        {cockpit && cockpit.sourcing.waves.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {cockpit.sourcing.waves.map(wave => (
              <span key={wave.wave} className="px-3 py-1.5 rounded-xl border border-[#FFF7EF]/15 text-[10px] text-[#FFF7EF]/70">
                {wave.wave} — {wave.items} besoin(s), {wave.toSource} à sourcer, {wave.inRfq} en consultation, {wave.awarded} attribué(s), {wave.responseCount} réponse(s)
              </span>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-xs text-[#FFF7EF]/50">Aucun besoin de sourcing enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#D49A63]">
                  <th className="py-2 pr-3">Besoin</th>
                  <th className="py-2 pr-3">Vague</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Docs exigés</th>
                  <th className="py-2 pr-3">Demandes</th>
                  <th className="py-2 pr-3">Réponses</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-[#FFF7EF]/10">
                    <td className="py-2 pr-3 text-[#FFF7EF]">{item.title}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{item.wave}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{STATUS_LABELS[item.status] || item.status}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{item.requiredDocuments.length}</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{item.rfqCount} ({item.sentCount} envoyée(s))</td>
                    <td className="py-2 pr-3 text-[#FFF7EF]/70">{item.responseCount} ({item.selectableResponses} sélectionnable(s))</td>
                    <td className="py-2 text-right">
                      <button onClick={() => void openItem(item.id)} className="text-[#C8753D] hover:underline">Ouvrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detail && (
          <div className="mt-5 rounded-2xl border border-[#C8753D]/40 bg-[#C8753D]/[0.06] p-4 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-[#FFF7EF]">{detail.item.title}</h4>
              <p className="text-[11px] text-[#FFF7EF]/60">
                {detail.item.wave} · {STATUS_LABELS[detail.item.status] || detail.item.status} · {detail.item.requiredDocuments.length} document(s) exigé(s)
              </p>
            </div>

            <div>
              <h5 className={labelClass()}>Demandes de prix ({detail.rfqs.length})</h5>
              {detail.rfqs.length === 0 ? (
                <button onClick={() => void createRfq(detail.item.id)} disabled={busy}
                  className="mt-2 px-3 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold disabled:opacity-40">
                  Générer une demande de prix
                </button>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.rfqs.map(rfq => (
                    <li key={rfq.id} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                      <div className="text-xs text-[#FFF7EF]">
                        {rfq.status === 'draft' ? 'Brouillon' : `Envoyée le ${rfq.sentOn || '?'} à ${rfq.supplierId || '?'}`}
                      </div>
                      <button onClick={() => setShowContentFor(showContentFor === rfq.id ? null : rfq.id)}
                        className="text-[10px] text-[#C8753D] hover:underline">
                        {showContentFor === rfq.id ? 'Masquer le contenu' : 'Voir le contenu'}
                      </button>
                      {showContentFor === rfq.id && (
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-[#050403] p-3 text-[10px] text-[#FFF7EF]/70">{rfq.content}</pre>
                      )}
                      {rfq.status === 'draft' && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2">
                          <label className="space-y-1"><span className={labelClass()}>Fournisseur *</span>
                            <input className={inputClass()} value={sendDraft.rfqId === rfq.id ? sendDraft.supplierId : ''}
                              onChange={event => setSendDraft({ rfqId: rfq.id, supplierId: event.target.value, sentOn: sendDraft.sentOn, channel: sendDraft.channel })}
                              placeholder="identifiant du fournisseur" /></label>
                          <label className="space-y-1"><span className={labelClass()}>Envoyée le</span>
                            <input type="date" className={inputClass()} value={sendDraft.rfqId === rfq.id ? sendDraft.sentOn : ''}
                              onChange={event => setSendDraft({ rfqId: rfq.id, supplierId: sendDraft.supplierId, sentOn: event.target.value, channel: sendDraft.channel })} /></label>
                          <label className="space-y-1"><span className={labelClass()}>Canal</span>
                            <input className={inputClass()} value={sendDraft.rfqId === rfq.id ? sendDraft.channel : 'courriel'}
                              onChange={event => setSendDraft({ rfqId: rfq.id, supplierId: sendDraft.supplierId, sentOn: sendDraft.sentOn, channel: event.target.value })} /></label>
                          <div className="flex items-end">
                            <button onClick={() => void sendRfq()} disabled={busy || sendDraft.rfqId !== rfq.id || !sendDraft.supplierId}
                              className="w-full px-3 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                              <Send size={12} /> Enregistrer l’envoi
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-[#FFF7EF]/40 mt-2">
                La plateforme n'envoie rien : elle enregistre le fait que vous avez envoyé, à qui et quand.
              </p>
            </div>

            <div>
              <h5 className={labelClass()}>Réponses reçues ({detail.comparison.rows.length})</h5>
              {detail.comparison.rows.length === 0 ? (
                <p className="text-[11px] text-[#FFF7EF]/50 mt-1">Aucune réponse enregistrée.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.comparison.rows.map(row => (
                    <li key={row.response.id} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                      <div className="text-xs text-[#FFF7EF]">
                        {row.supplierName || row.supplierId || 'fournisseur non identifié'} — reçu le {row.response.receivedOn}
                      </div>
                      <div className="text-[10px] text-[#FFF7EF]/60 mt-1">
                        Prix : {money(row.response.unitPriceCents, row.response.currency)} ·
                        MOQ : {row.response.moqUnits === null ? 'non communiqué' : `${row.response.moqUnits} u.`} ·
                        Délai : {row.response.leadTimeDays === null ? 'non communiqué' : `${row.response.leadTimeDays} j`}
                        {row.response.quoteReference ? ` · réf. ${row.response.quoteReference}` : ''}
                      </div>
                      {row.response.notes && <div className="text-[10px] text-[#FFF7EF]/50 mt-1">{row.response.notes}</div>}
                      <div className="text-[10px] mt-1">
                        {row.documentsMissing.length > 0
                          ? <span className="text-amber-300">Manque : {row.documentsMissing.join(', ')} — sélection impossible</span>
                          : <span className="text-emerald-300">Documents exigés : tous enregistrés</span>}
                      </div>
                      {row.selectable && detail.item.status !== 'awarded' && (
                        <button onClick={() => void award(row.response.id)} disabled={busy}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-[#C8753D] text-[#050403] text-[10px] font-bold flex items-center gap-1 disabled:opacity-40">
                          <Trophy size={11} /> Retenir ce fournisseur
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-[#FFF7EF]/40 mt-2">
                Aucun classement automatique : un devis moins cher mais incomplet sur les documents ne sera pas retenu.
              </p>
            </div>

            {detail.item.status !== 'awarded' && detail.rfqs.some(rfq => rfq.status !== 'draft') && (
              <div className="rounded-xl border border-[#FFF7EF]/10 p-3 space-y-2">
                <h5 className={labelClass()}>Saisir une réponse reçue</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <label className="space-y-1"><span className={labelClass()}>Reçue le *</span>
                    <input type="date" className={inputClass()} value={responseDraft.receivedOn}
                      onChange={event => setResponseDraft({ ...responseDraft, receivedOn: event.target.value })} /></label>
                  <label className="space-y-1"><span className={labelClass()}>Prix unitaire (centimes)</span>
                    <input className={inputClass()} value={responseDraft.unitPriceCents}
                      onChange={event => setResponseDraft({ ...responseDraft, unitPriceCents: event.target.value })} placeholder="420 = 4,20 €" /></label>
                  <label className="space-y-1"><span className={labelClass()}>Devise</span>
                    <input className={inputClass()} value={responseDraft.currency}
                      onChange={event => setResponseDraft({ ...responseDraft, currency: event.target.value })} /></label>
                  <label className="space-y-1"><span className={labelClass()}>MOQ</span>
                    <input className={inputClass()} value={responseDraft.moqUnits}
                      onChange={event => setResponseDraft({ ...responseDraft, moqUnits: event.target.value })} /></label>
                  <label className="space-y-1"><span className={labelClass()}>Délai (jours)</span>
                    <input className={inputClass()} value={responseDraft.leadTimeDays}
                      onChange={event => setResponseDraft({ ...responseDraft, leadTimeDays: event.target.value })} /></label>
                  <label className="space-y-1"><span className={labelClass()}>Référence du devis</span>
                    <input className={inputClass()} value={responseDraft.quoteReference}
                      onChange={event => setResponseDraft({ ...responseDraft, quoteReference: event.target.value })} /></label>
                </div>
                <label className="space-y-1 block"><span className={labelClass()}>Notes</span>
                  <textarea className={inputClass()} rows={2} value={responseDraft.notes}
                    onChange={event => setResponseDraft({ ...responseDraft, notes: event.target.value })} /></label>
                <button onClick={() => void recordResponse()} disabled={busy || !responseDraft.receivedOn}
                  className="px-3 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
                  <FileCheck2 size={13} /> Enregistrer la réponse
                </button>
                <p className="text-[10px] text-[#FFF7EF]/40">
                  Laissez vide ce que le fournisseur n'a pas chiffré : la plateforme ne complète rien.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
