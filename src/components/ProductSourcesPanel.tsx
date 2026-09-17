import React, { useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Star, Power, FileText, Copy, Mail } from 'lucide-react';
import { evaluateMargin, SUPPLY_MODEL_LABELS, type SupplyModel } from '../lib/supplyModel';
import { buildDropshipPurchaseOrder, dropshipYear1Checklist, isSkinCosmeticCategory } from '../lib/dropshipProcedure';
import { isHttpAffiliateUrl, offerFromProductSource, PARTNER_LINK_LABEL } from '../lib/affiliateOffer';
import { apiConnectorsAdminNote } from '../lib/apiConnectors';
import { buildThreePlInboundNotice, buildThreePlInboundPo, tamponQtyForProduct, threePlYear1Checklist } from '../lib/threePlProcedure';
import { fetchAdminCatalogProducts } from '../lib/adminCatalogProducts';
import { applyColumnFilters, type ColumnFilter } from '../lib/columnFilters';
import { SupplierName } from './EditableRecordName';

/**
 * SAISIE DES SOURCES PAR PRODUIT — l'écran qui alimente le routeur.
 *
 * Un produit × plusieurs fournisseurs × modèles (dropshipping, affiliation,
 * 3PL, stock KURLA). Coût inconnu = champ vide (NULL en base), jamais 0.
 * L'affiliation exige le lien partenaire http(s) réel — le serveur refuse
 * sans lui. Commission et cookie sont saisis, jamais mesurés : pas de pixel.
 */

const eurInput = (cents: number | null | undefined) => (cents == null ? '' : String(cents / 100));
const centsOrUndef = (value: string) => {
  if (value.trim() === '') return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
};

const EMPTY_FORM = {
  supplierId: '',
  model: 'dropshipping' as SupplyModel,
  cost: '',
  fee: '',
  fulfillmentCost: '',
  commissionPct: '',
  affiliateUrl: '',
  cookieDays: '',
  leadTimeDays: '',
  shipsFrom: '',
  isPrimary: false,
};

export const ProductSourcesPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // `?scope=all` retiré le 17/09, comme dans ProductNeedsEditor : le
        // serveur donne la priorité à l'en-tête x-kurla-workspace (toujours
        // présent) sur le paramètre d'URL, et `all` n'est ni 'skin' ni 'hair'.
        // Le paramètre était mort ; la liste servie a toujours été celle de
        // l'espace courant. Passé par le chargement partagé : cet écran est
        // monté deux fois (Appro et Appro par étapes) et demandait la même
        // liste que le catalogue.
        const [productsBody, suppliersResponse] = await Promise.all([
          fetchAdminCatalogProducts(headers),
          fetch('/api/admin/suppliers?all=1', { headers }),
        ]);
        const suppliersBody = await suppliersResponse.json();
        setProducts(productsBody.products || []);
        setSuppliers(suppliersBody.suppliers || []);
      } catch (e: any) {
        setError(e.message || 'Erreur de chargement.');
      }
    })();
  }, [headers]);

  const selected = useMemo(() => products.find(p => String(p.id) === selectedId) || null, [products, selectedId]);

  const loadSources = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/sourcing/sources?productId=${encodeURIComponent(productId)}`, { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Sources indisponibles.');
      setSources(body.sources || []);
    } catch (e: any) {
      setMessage(`Sources : ${e.message || 'erreur'}`);
    }
  };

  const selectProduct = (productId: string) => {
    setSelectedId(productId);
    setForm({ ...EMPTY_FORM });
    setMessage('');
    if (productId) loadSources(productId);
    else setSources([]);
  };

  // Filtre « rattachement » (17/09) : cet écran sert à qualifier les sources —
  // ce qu'il faut y voir en premier, ce sont les fiches qui n'ont encore
  // personne. Posé après la recherche existante, avant le plafond de 60.
  const sourceAttachFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'attached', kind: 'enum', get: (product: any) => (product.supplierId ? 'avec' : 'sans'), options: [
      { value: 'sans', label: 'Sans fournisseur' },
      { value: 'avec', label: 'Déjà rattaché' },
    ] },
  ], []);
  const [sourceAttach, setSourceAttach] = useState('');
  const filtered = useMemo(() => {
    const low = search.toLowerCase();
    const list = low ? products.filter(p => `${p.name} ${p.brand || ''}`.toLowerCase().includes(low)) : products;
    return applyColumnFilters(list, sourceAttachFilters, { attached: sourceAttach }).slice(0, 60);
  }, [products, search, sourceAttach, sourceAttachFilters]);

  const submit = async () => {
    if (!selectedId) return;
    if (form.model === 'affiliation' && !isHttpAffiliateUrl(form.affiliateUrl)) {
      setMessage('Une source en affiliation exige le lien d’affiliation réel.');
      return;
    }
    if (!form.supplierId) {
      setMessage('Choisis un fournisseur enregistré. Un nom libre n’est pas une offre.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/sourcing/sources', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: selectedId,
          supplierId: form.supplierId,
          model: form.model,
          isPrimary: form.isPrimary,
          costCents: centsOrUndef(form.cost) ?? null,
          feeCents: centsOrUndef(form.fee) ?? null,
          fulfillmentCostCents: centsOrUndef(form.fulfillmentCost) ?? null,
          commissionPct: form.commissionPct.trim() === '' ? null : Number(form.commissionPct.replace(',', '.')),
          affiliateUrl: form.affiliateUrl.trim() || null,
          cookieDays: form.cookieDays.trim() === '' ? null : Number(form.cookieDays),
          leadTimeDays: form.leadTimeDays.trim() === '' ? null : Number(form.leadTimeDays),
          shipsFrom: form.shipsFrom.trim() || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Création impossible.');
      setMessage('Source ajoutée. Le fournisseur principal du produit est la source ★.');
      setForm({ ...EMPTY_FORM });
      await loadSources(selectedId);
      try {
        const refreshed = await fetchAdminCatalogProducts(headers);
        setProducts(refreshed.products || []);
      } catch { /* la source est enregistrée ; le filtre « sans fournisseur » se mettra à jour au prochain chargement */ }
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(false);
    }
  };

  const patchSource = async (sourceId: string, patch: Record<string, unknown>, label: string) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/sourcing/sources/${sourceId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mise à jour impossible.');
      setMessage(label);
      if (selectedId) await loadSources(selectedId);
      if (patch.isPrimary === true) {
        try {
          const refreshed = await fetchAdminCatalogProducts(headers);
          setProducts(refreshed.products || []);
        } catch { /* la ★ est posée ; le filtre « sans fournisseur » se mettra à jour au prochain chargement */ }
      }
    } catch (e: any) {
      setMessage(`Échec : ${e.message || 'erreur inconnue'}`);
    } finally {
      setBusy(false);
    }
  };

  const priceCents = selected ? (() => {
    const price = Number(selected.basePrice ?? selected.price);
    return Number.isFinite(price) && price > 0 ? Math.round(price * 100) : null;
  })() : null;

  const supplierName = (source: any) => {
    if (source.supplierId) {
      const supplier = suppliers.find(s => String(s.id) === String(source.supplierId));
      if (supplier) return supplier.legalName || supplier.tradeName || source.supplierId;
    }
    return source.partnerName || 'partenaire à nommer';
  };

  if (error) return <div className="p-6 rounded-3xl bg-espresso border border-rose-400/30 text-rose-300 text-xs">{error}</div>;

  const field = 'px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px]';

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><Link2 className="w-4 h-4 text-kurla-amber" /> Sources d'approvisionnement par produit</h3>
      <p className="text-[11px] text-kurla-cream/60">Un produit peut avoir plusieurs sources (dropshipping, affiliation, 3PL, stock KURLA). La source ★ principale se projette sur le fournisseur du produit. Coût inconnu = laisser vide — jamais 0. Affiliation : {PARTNER_LINK_LABEL} http(s) obligatoire. 3PL : logisticien nommé, tampon / consignation, pas de WMS. Un nom libre n’est pas une offre : choisissez une fiche du référentiel. {apiConnectorsAdminNote()}</p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit (nom, marque)…" className={`w-full ${field}`} />
            <select value={sourceAttach} onChange={e => setSourceAttach(e.target.value)} aria-label="Filtrer par rattachement fournisseur" className="px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px] text-kurla-cream focus:outline-none focus:border-kurla-copper">
              <option value="">Tous les produits</option>
              <option value="sans">Sans fournisseur</option>
              <option value="avec">Déjà rattaché</option>
            </select>
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {filtered.map(product => (
              <button key={product.id} type="button" onClick={() => selectProduct(String(product.id))} className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] ${String(product.id) === selectedId ? 'bg-kurla-copper/15 border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/5 hover:border-kurla-copper/25'}`}>
                <span className="font-semibold">{product.name}</span>
                {product.brand && <span className="text-kurla-cream/50"> · {product.brand}</span>}
                <span className="float-right text-kurla-cream/45">{Number(product.basePrice ?? product.price ?? 0).toFixed(2).replace('.', ',')} €</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[11px] text-kurla-cream/45">Aucun produit ne correspond.</p>}
          </div>
        </div>

        <div className="space-y-3">
          {selected ? (
            <>
              <p className="text-[12px] font-bold">{selected.name} <span className="text-kurla-cream/50 font-normal">· prix vente {priceCents != null ? `${(priceCents / 100).toFixed(2).replace('.', ',')} €` : 'à obtenir'}</span></p>

              <div className="space-y-1.5">
                {sources.map(source => {
                  const margin = evaluateMargin({
                    model: source.model,
                    salePriceCents: priceCents,
                    costCents: source.costCents,
                    feeCents: source.feeCents,
                    fulfillmentCostCents: source.fulfillmentCostCents,
                    commissionPct: source.commissionPct,
                  });
                  return (
                    <div key={source.id} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/5 text-[11px] space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" title="Définir comme source principale" onClick={() => patchSource(source.id, { isPrimary: true }, 'Source principale mise à jour.')} disabled={busy || source.isPrimary} className={`px-1.5 py-0.5 rounded text-[10px] ${source.isPrimary ? 'text-kurla-amber' : 'text-kurla-cream/30 hover:text-kurla-amber'}`}><Star className="w-3 h-3" fill={source.isPrimary ? 'currentColor' : 'none'} /></button>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-kurla-copper/15 text-kurla-copper">{SUPPLY_MODEL_LABELS[source.model as SupplyModel] || source.model}</span>
                        {source.supplierId
                          ? <SupplierName id={source.supplierId} label={supplierName(source)} headers={headers} className="text-[11px]" />
                          : <span className="font-semibold text-kurla-cream/55">{source.partnerName ? `${source.partnerName} — nom libre, pas une fiche` : 'partenaire à nommer'}</span>}
                        <button type="button" onClick={() => patchSource(source.id, { available: !source.available }, source.available ? 'Source marquée indisponible.' : 'Source de nouveau disponible.')} disabled={busy} className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold border ${source.available ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300' : 'bg-rose-500/10 border-rose-500/25 text-rose-300'}`}><Power className="w-2.5 h-2.5 inline mr-1" />{source.available ? 'disponible' : 'indisponible'}</button>
                      </div>
                      <p className="text-kurla-cream/60">
                        coût : <span className="text-kurla-cream/85 font-semibold">{source.costCents != null ? `${(source.costCents / 100).toFixed(2).replace('.', ',')} €` : 'à obtenir'}</span>
                        {' · '}
                        {source.model === 'affiliation'
                          ? <>{(() => { const offer = offerFromProductSource(source, supplierName(source)); return offer ? offer.commissionNote : 'commission à obtenir — pas de chiffre inventé'; })()}</>
                          : <>marge : <span className={`font-semibold ${margin.marginCents != null && margin.marginCents <= 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{margin.marginCents != null ? `${(margin.marginCents / 100).toFixed(2).replace('.', ',')} €${margin.marginPct != null ? ` (${margin.marginPct} %)` : ''}` : 'à obtenir'}</span></>}
                        {source.leadTimeDays != null && <span className="text-kurla-cream/45"> · délai {source.leadTimeDays} j</span>}
                        {source.shipsFrom && <span className="text-kurla-cream/45"> · depuis {source.shipsFrom}</span>}
                      </p>
                      {margin.missing.length > 0 && <p className="text-[10px] text-amber-300/75">à obtenir pour calculer : {margin.missing.join(', ')}</p>}
                      {source.model === 'affiliation' && (() => {
                        const offer = offerFromProductSource(source, supplierName(source));
                        return (
                          <div className="mt-1 p-2 rounded-lg bg-kurla-espresso/80 border border-kurla-cream/10 space-y-1">
                            <p className="text-[10px] font-bold text-kurla-amber">{PARTNER_LINK_LABEL} — KURLA n’est pas le vendeur</p>
                            <p className="text-[10px] text-kurla-cream/70">{offer?.disclosure || 'Publicité — lien affilié'}</p>
                            {source.affiliateUrl
                              ? <p className="text-[10px] text-kurla-cream/45 truncate">{PARTNER_LINK_LABEL} : {source.affiliateUrl}</p>
                              : <p className="text-[10px] text-amber-200/80">lien partenaire à obtenir</p>}
                            <p className="text-[10px] text-kurla-cream/45">{offer?.cookieNote || 'durée cookie à obtenir'}</p>
                            <p className="text-[10px] text-kurla-cream/40">Pas de pixel, pas de postback, pas de suivi KURLA.</p>
                          </div>
                        );
                      })()}
                      {source.model === '3pl' && (() => {
                        const supplier = source.supplierId ? suppliers.find(s => String(s.id) === String(source.supplierId)) : null;
                        const email = typeof supplier?.contactEmail === 'string' ? supplier.contactEmail : null;
                        const inbound = {
                          poNumber: `KURLA-3PL-${String(selected.id).slice(-6)}`,
                          productName: String(selected.name || selected.id),
                          productId: String(selected.id),
                          quantity: tamponQtyForProduct(String(selected.id)),
                          unitCostEur: source.costCents != null ? source.costCents / 100 : null,
                          logisticianName: supplierName(source),
                          logisticianEmail: email,
                          supplierName: supplierName(source),
                          shipsFrom: source.shipsFrom,
                          category: selected.category,
                        };
                        const po = buildThreePlInboundPo(inbound);
                        const notice = buildThreePlInboundNotice(inbound);
                        const checklist = threePlYear1Checklist({ product: selected, source, logisticianEmail: email });
                        return (
                          <div className="mt-1 p-2 rounded-lg bg-kurla-espresso/80 border border-kurla-cream/10 space-y-1.5">
                            <p className="text-[10px] font-bold text-kurla-amber">Procédure 3PL an 1 — tampon, mailto · pas de WMS</p>
                            {isSkinCosmeticCategory(selected.category) && (
                              <p className="text-[10px] text-rose-200/85">Cosmétique Skin : 3PL tampon OK. Pas de badge 24–48h. Quantité à obtenir — pas le tampon Hair 75.</p>
                            )}
                            <ul className="text-[10px] text-kurla-cream/55 space-y-0.5">
                              {checklist.items.map(item => (
                                <li key={item.id}>{item.ok ? '✓' : '·'} {item.label}</li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => { try { void navigator.clipboard.writeText(po.body); setMessage('Bon 3PL copié — rien n’est envoyé.'); } catch { setMessage('Copie impossible — utilisez mailto.'); } }} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold inline-flex items-center gap-1">
                                <Copy className="w-3 h-3" /> Copier le PO 3PL
                              </button>
                              <button type="button" onClick={() => { try { void navigator.clipboard.writeText(notice.body); setMessage('Annonce réception copiée — pas un ASN WMS.'); } catch { setMessage('Copie impossible — utilisez mailto.'); } }} className="px-2 py-0.5 rounded-lg bg-kurla-copper/10 border border-kurla-cream/20 text-kurla-cream/80 text-[9px] font-bold inline-flex items-center gap-1">
                                <Copy className="w-3 h-3" /> Copier l’annonce
                              </button>
                              {po.mailtoHref
                                ? <a href={po.mailtoHref} className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[9px] font-bold inline-flex items-center gap-1"><Mail className="w-3 h-3" /> mailto 3PL</a>
                                : <span className="text-[9px] text-amber-200/80"><FileText className="w-3 h-3 inline" /> e-mail logisticien à obtenir</span>}
                            </div>
                          </div>
                        );
                      })()}
                      {source.model === 'dropshipping' && (() => {
                        const supplier = source.supplierId ? suppliers.find(s => String(s.id) === String(source.supplierId)) : null;
                        const email = typeof supplier?.contactEmail === 'string' ? supplier.contactEmail : null;
                        const po = buildDropshipPurchaseOrder({
                          poNumber: `KURLA-DS-${String(selected.id).slice(-6)}`,
                          productName: String(selected.name || selected.id),
                          productId: String(selected.id),
                          quantity: 1,
                          unitCostEur: source.costCents != null ? source.costCents / 100 : null,
                          supplierName: supplierName(source),
                          supplierEmail: email,
                          shipsFrom: source.shipsFrom,
                          leadTimeDays: source.leadTimeDays,
                          category: selected.category,
                        });
                        const checklist = dropshipYear1Checklist({ product: selected, source, supplierEmail: email });
                        return (
                          <div className="mt-1 p-2 rounded-lg bg-kurla-espresso/80 border border-kurla-cream/10 space-y-1.5">
                            <p className="text-[10px] font-bold text-kurla-amber">Procédure dropship an 1 — badge, PO, mailto · pas d’API</p>
                            {isSkinCosmeticCategory(selected.category) && (
                              <p className="text-[10px] text-rose-200/85">Cosmétique Skin ≠ promesse 24–48h. Le mailto pose la commande ; le badge boutique reste éteint.</p>
                            )}
                            <ul className="text-[10px] text-kurla-cream/55 space-y-0.5">
                              {checklist.items.map(item => (
                                <li key={item.id}>{item.ok ? '✓' : '·'} {item.label}</li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => { try { void navigator.clipboard.writeText(po.body); setMessage('Bon de commande copié — rien n’est envoyé.'); } catch { setMessage('Copie impossible — utilisez mailto.'); } }} className="px-2 py-0.5 rounded-lg bg-kurla-copper/15 border border-kurla-copper/30 text-kurla-copper text-[9px] font-bold inline-flex items-center gap-1">
                                <Copy className="w-3 h-3" /> Copier le PO
                              </button>
                              {po.mailtoHref
                                ? <a href={po.mailtoHref} className="px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[9px] font-bold inline-flex items-center gap-1"><Mail className="w-3 h-3" /> mailto fournisseur</a>
                                : <span className="text-[9px] text-amber-200/80"><FileText className="w-3 h-3 inline" /> e-mail fournisseur à obtenir</span>}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
                {sources.length === 0 && <p className="text-[11px] text-amber-300/80">Aucune source — les commandes de ce produit seront bloquées au routage (« aucune source d'approvisionnement »).</p>}
              </div>

              <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-2">
                <p className="text-[11px] font-bold text-kurla-amber">Ajouter une source</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className={`${field} col-span-2`}>
                    <option value="">Fournisseur enregistré (obligatoire)…</option>
                    {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.legalName || supplier.tradeName}</option>)}
                  </select>
                  <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value as SupplyModel }))} className={field}>
                    {Object.entries(SUPPLY_MODEL_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                  {form.model === 'dropshipping' && isSkinCosmeticCategory(selected.category) && (
                    <p className="col-span-2 text-[10px] text-rose-200/80">Cosmétique Skin : le modèle dropshipping n’ouvre pas le badge 24–48h. Préférer affiliation ou 3PL tampon.</p>
                  )}
                  {form.model === '3pl' && (
                    <p className="col-span-2 text-[10px] text-kurla-cream/55">3PL tampon : le logisticien est une fiche du référentiel. Livraison chez le 3PL, 0 carton Paris. Pas de WMS Huboo/Cubyn.</p>
                  )}
                  <input value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="Coût € (vide = inconnu)" className={field} />
                  <input value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} placeholder="Frais € (vide = inconnu)" className={field} />
                  <input value={form.fulfillmentCost} onChange={e => setForm(f => ({ ...f, fulfillmentCost: e.target.value }))} placeholder="Fulfillment € (vide = inconnu)" className={field} />
                  <input value={form.commissionPct} onChange={e => setForm(f => ({ ...f, commissionPct: e.target.value }))} placeholder="Commission % attendue (non mesurée)" className={field} />
                  <input value={form.affiliateUrl} onChange={e => setForm(f => ({ ...f, affiliateUrl: e.target.value }))} placeholder={`${PARTNER_LINK_LABEL} http(s) — obligatoire en affiliation`} className={field} />
                  <input value={form.cookieDays} onChange={e => setForm(f => ({ ...f, cookieDays: e.target.value }))} placeholder="Cookie j annoncé (pas de pixel KURLA)" className={field} />
                  <input value={form.leadTimeDays} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))} placeholder="Délai (jours)" className={field} />
                  <input value={form.shipsFrom} onChange={e => setForm(f => ({ ...f, shipsFrom: e.target.value }))} placeholder="Expédié depuis (pays)" className={field} />
                  <label className="flex items-center gap-1.5 text-[11px] text-kurla-cream/70 col-span-2">
                    <input type="checkbox" checked={form.isPrimary} onChange={e => setForm(f => ({ ...f, isPrimary: e.target.checked }))} className="accent-[#B4642C]" /> Source principale (décide du routage)
                  </label>
                </div>
                <button type="button" onClick={submit} disabled={busy} className="px-3 py-1.5 rounded-xl bg-kurla-copper text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"><Plus className="w-3 h-3" /> {busy ? 'Enregistrement…' : 'Ajouter la source'}</button>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-kurla-cream/45">Sélectionne un produit pour voir et saisir ses sources.</p>
          )}
          {message && <p className="text-[11px] text-kurla-cream/75">{message}</p>}
        </div>
      </div>
    </div>
  );
};
