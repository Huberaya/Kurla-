/**
 * FICHE PRODUIT FLOTTANTE — ouvrable de partout (17/09/2026).
 *
 * Même raison d'être que la fiche fournisseur : on constate un manque quelque
 * part (au catalogue, dans un lot, dans une proposition d'achat) et on doit
 * pouvoir le corriger LÀ, sans chercher dans quel onglet se trouve le seul
 * écran qui écrit.
 *
 * Ce qu'elle fait :
 *
 *   · nomme les manques (grille KURLA Ready reprise telle quelle + rattachement
 *     fournisseur, SKU fournisseur, catégorie, prix) ;
 *   · laisse corriger les champs que la route produit accepte vraiment ;
 *   · rattache ou détache un fournisseur par la **route dédiée**
 *     (`PATCH /api/admin/products/:id/supplier`) — c'est celle qu'utilise déjà
 *     l'écran d'affectation, passer par le PATCH produit n'aurait rien écrit ;
 *   · ouvre la fiche du fournisseur rattaché d'un clic : c'est le lien demandé
 *     entre le produit et son fournisseur.
 *
 * La liste des fournisseurs n'est PAS rechargée ici : le panneau appelant la
 * transmet. Un panneau qui ne l'a pas n'affiche simplement pas le sélecteur —
 * il ne va pas chercher une liste en douce.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Link2, Loader2, Save, Unlink, X } from 'lucide-react';
import {
  isWritingAdminRecords,
  loadProduct,
  loadSupplier,
  readProduct,
  readSupplier,
  supplierDisplayName,
  writeProduct,
  writeProductSupplierLink,
} from '../lib/adminRecordsStore';
import { SEVERITY_LABELS, missingProductFields } from '../lib/recordCompleteness';
import { evaluateKurlaReady } from '../lib/kurlaReadyScore';
import { useAdminRecords } from './SupplierSheet';

const FIELD_CLASS = 'w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder:text-kurla-cream/30 focus:outline-none focus:border-kurla-copper';

export const ProductSheet: React.FC<{
  productId: string;
  headers: HeadersInit;
  onClose: () => void;
  /** Fournisseurs déjà chargés par le panneau appelant (pas de requête en douce). */
  suppliers?: Array<{ id: string; legalName?: string; tradeName?: string }>;
  /** Renvoie vers la base fournisseurs de l'Approvisionnement (17/09). Le
   *  fournisseur ne se modifie pas ici : cette fiche produit nomme le
   *  rattachement, la saisie se fait dans l'unique base. */
  onOpenSupplier?: (supplierId: string) => void;
}> = ({ productId, headers, onClose, suppliers, onOpenSupplier }) => {
  useAdminRecords();
  const product = readProduct(productId);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [linkSupplierId, setLinkSupplierId] = useState('');
  const [linkSku, setLinkSku] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loadProduct(productId, headers)
      .then(record => {
        if (cancelled) return;
        setDraft(record ? { ...record } : {});
        setLinkSupplierId(record?.supplierId || '');
        setLinkSku(record?.supplierSku || '');
      })
      .catch((e: any) => { if (!cancelled) setError(String(e?.message || 'Fiche indisponible.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toujours évalué sur la fiche lue : la grille attend un objet, et un objet
  // vide renvoie « vérité catalogue non chargée » plutôt qu'un score inventé.
  const readiness = useMemo(() => evaluateKurlaReady(draft), [draft]);
  const completeness = useMemo(() => missingProductFields(draft, readiness), [draft, readiness]);
  const missingByKey = useMemo(() => new Map(completeness.missing.map(field => [field.key, field])), [completeness]);
  const busy = isWritingAdminRecords();

  const setField = (key: string, value: any) => { setDraft(prev => ({ ...prev, [key]: value })); setSaved(''); };

  /** N'envoie que ce qui a changé, sur les champs que la route accepte. */
  const changedPatch = useMemo(() => {
    const original = product || {};
    const editable = ['name', 'slug', 'brand', 'category', 'subCategory', 'price', 'stockQuantity', 'inci', 'description', 'ean', 'image', 'sourceSupplier'];
    const patch: Record<string, any> = {};
    for (const key of editable) {
      const next = draft[key];
      const before = original[key];
      if (next === undefined) continue;
      const normalize = (value: any) => (typeof value === 'string' ? value.trim() : value ?? null);
      if (JSON.stringify(normalize(next)) !== JSON.stringify(normalize(before))) patch[key] = next === '' ? null : next;
    }
    return patch;
  }, [draft, product]);

  const linkChanged = linkSupplierId !== (product?.supplierId || '') || linkSku !== (product?.supplierSku || '');

  const save = async () => {
    setError('');
    setSaved('');
    if (Object.keys(changedPatch).length > 0) {
      const result = await writeProduct(productId, changedPatch, headers);
      if (!result.ok) { setError(result.error || 'Enregistrement refusé.'); return; }
    }
    if (linkChanged) {
      const result = await writeProductSupplierLink(productId, { supplierId: linkSupplierId || null, supplierSku: linkSku }, headers);
      if (!result.ok) { setError(result.error || 'Rattachement refusé.'); return; }
    }
    setSaved('Fiche enregistrée — les autres écrans affichent la nouvelle valeur.');
  };

  const linkedSupplier = readSupplier(product?.supplierId || '');
  useEffect(() => {
    if (product?.supplierId && !linkedSupplier) void loadSupplier(String(product.supplierId), headers).catch(() => {});
  }, [product?.supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-label="Fiche produit">
      <div className="w-full max-w-3xl rounded-3xl border border-kurla-cream/15 bg-kurla-espresso shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-kurla-cream/10">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Fiche produit</p>
            <h2 className="font-bold text-kurla-cream truncate">{draft.name || productId}</h2>
            <p className="text-[11px] text-kurla-cream/45 mt-0.5 font-mono">{draft.slug || productId}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la fiche" className="p-2 rounded-xl border border-kurla-cream/15 text-kurla-cream/60 hover:text-kurla-cream shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && <p className="p-5 text-xs text-kurla-cream/50 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Lecture de la fiche…</p>}

        {!loading && (
          <div className="p-5 space-y-5">
            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[11px] text-rose-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
              </p>
            )}
            {saved && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-200">{saved}</p>}

            <section className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-2">
              <h3 className="text-[11px] uppercase tracking-wider font-bold text-kurla-amber">
                Ce qui manque ({completeness.missing.length}) — KURLA Ready {readiness.score ?? '—'}/100
              </h3>
              {completeness.missing.length === 0
                ? <p className="text-[11px] text-emerald-300">Aucun manque signalé par la grille.</p>
                : (
                  <ul className="space-y-1.5">
                    {completeness.missing.map((field, index) => (
                      <li key={`${field.key}-${index}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${field.severity === 'bloquant' ? 'border-rose-300/30 bg-rose-500/10 text-rose-300' : 'border-amber-300/30 bg-amber-500/10 text-amber-300'}`}>
                          {SEVERITY_LABELS[field.severity]}
                        </span>
                        <span className="font-semibold text-kurla-cream">{field.label}</span>
                        <span className="text-kurla-cream/50">— {field.why}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            {/* Lien produit ↔ fournisseur : le cœur de la demande */}
            <section className="rounded-2xl border border-kurla-copper/25 bg-kurla-copper/[0.06] p-4 space-y-3">
              <h3 className="text-[11px] uppercase tracking-wider font-bold text-kurla-amber flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5" /> Fournisseur de cette fiche
              </h3>
              {product?.supplierId ? (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-kurla-cream">{supplierDisplayName(linkedSupplier) || product.supplierId}</span>
                  {linkedSupplier?.country && <span className="text-kurla-cream/55">({linkedSupplier.country})</span>}
                  {linkedSupplier?.contactEmail
                    ? <a href={`mailto:${linkedSupplier.contactEmail}`} className="text-kurla-amber underline">{linkedSupplier.contactEmail}</a>
                    : <span className="text-amber-300">e-mail à compléter</span>}
                  {onOpenSupplier && product.supplierId && (
                    <button type="button" onClick={() => onOpenSupplier(String(product.supplierId))} className="px-2 py-1 rounded-lg border border-kurla-copper/40 text-kurla-copper font-bold hover:bg-kurla-copper/10">
                      Ouvrir dans la base fournisseurs
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-amber-300/85">Aucun fournisseur rattaché — aucune commande ni aucun lot ne peut être suivi pour cette fiche.</p>
              )}
              {suppliers && suppliers.length > 0 && (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="space-y-1 min-w-[220px] flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Rattacher à</span>
                    <select className={FIELD_CLASS} value={linkSupplierId} onChange={e => { setLinkSupplierId(e.target.value); setSaved(''); }}>
                      <option value="">— Aucun fournisseur (détacher) —</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplierDisplayName(supplier) || supplier.id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 min-w-[140px]">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Référence fournisseur</span>
                    <input className={FIELD_CLASS} value={linkSku} onChange={e => { setLinkSku(e.target.value); setSaved(''); }} placeholder="SKU du fournisseur" />
                  </label>
                </div>
              )}
              {product?.sourceSupplier && (
                <p className="text-[11px] text-kurla-cream/45">
                  Note de sourcing enregistrée sur la fiche : <span className="text-kurla-cream/65">{String(product.sourceSupplier)}</span>
                  <span className="text-kurla-cream/35"> — texte libre, distinct du rattachement ci-dessus.</span>
                </p>
              )}
            </section>

            <section className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Nom</span>
                <input className={FIELD_CLASS} value={draft.name || ''} onChange={e => setField('name', e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Marque {missingByKey.has('brand') && <span className="text-amber-300 normal-case">· à compléter</span>}</span>
                <input className={FIELD_CLASS} value={draft.brand || ''} onChange={e => setField('brand', e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Catégorie {missingByKey.has('category') && <span className="text-amber-300 normal-case">· à compléter</span>}</span>
                <input className={FIELD_CLASS} value={draft.category || ''} onChange={e => setField('category', e.target.value)} placeholder="peau, cheveux, kits…" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Prix de vente (€) {missingByKey.has('price') && <span className="text-rose-300 normal-case">· bloquant</span>}</span>
                <input className={FIELD_CLASS} type="number" step="0.01" min={0} value={draft.price ?? ''} onChange={e => setField('price', e.target.value === '' ? null : Number(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Stock</span>
                <input className={FIELD_CLASS} type="number" min={0} value={draft.stockQuantity ?? ''} onChange={e => setField('stockQuantity', e.target.value === '' ? null : Number(e.target.value))} />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">EAN / code-barres {missingByKey.has('ean') && <span className="text-amber-300 normal-case">· à compléter</span>}</span>
                <input className={FIELD_CLASS} value={draft.ean ?? draft.barcode ?? ''} onChange={e => setField('ean', e.target.value)} />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">INCI {missingByKey.has('inci') && <span className="text-amber-300 normal-case">· à compléter</span>}</span>
                <textarea className={FIELD_CLASS} rows={3} value={draft.inci || ''} onChange={e => setField('inci', e.target.value)} placeholder="Liste INCI telle que déclarée par le fournisseur" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Description {missingByKey.has('description') && <span className="text-amber-300 normal-case">· à compléter</span>}</span>
                <textarea className={FIELD_CLASS} rows={3} value={draft.description || ''} onChange={e => setField('description', e.target.value)} />
              </label>
            </section>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || (Object.keys(changedPatch).length === 0 && !linkChanged)}
                className="px-4 py-2 rounded-xl bg-kurla-copper text-white text-xs font-bold flex items-center gap-2 hover:bg-kurla-cocoa disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : linkChanged && Object.keys(changedPatch).length === 0 ? <Unlink className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {Object.keys(changedPatch).length === 0 && !linkChanged ? 'Aucune modification' : 'Enregistrer'}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-kurla-cream/15 text-xs text-kurla-cream/60 hover:text-kurla-cream">Fermer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
