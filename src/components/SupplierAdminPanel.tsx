import React, { useCallback, useEffect, useState } from 'react';
import { SupplierSheet } from './SupplierSheet';
import { AlertTriangle, Building2, FileCheck2, Package, Plus, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { SUPPLIER_DOCUMENT_LABELS } from '../lib/sourcingDocuments';
import { COSMETIC_REQUIRED_DOCS, COSMETIC_DOC_LABELS, COSMETIC_DOC_REASONS } from '../lib/cosmeticCompliance';

type SupplierAdminPanelProps = {
  headers: HeadersInit;
  onSuccess?: (message: string) => void;
  // Chantier B : `showAll` affiche le référentiel COMPLET (les 16 fournisseurs
  // identifiés, y compris ceux encore sans produit lié) avec leur usage réel
  // par workspace. Sans ce mode, le panel garde le comportement historique
  // filtré par workspace — l'ancien onglet n'est pas touché.
  showAll?: boolean;
  /** Fiche à ouvrir à l'arrivée (17/09) : un autre écran renvoie vers la base
   *  fournisseurs au lieu de proposer une deuxième surface d'édition. */
  focusSupplierId?: string;
};

type SupplierRow = {
  id: string;
  legalName: string;
  tradeName?: string;
  supplierType: string;
  country?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
  verificationStatus: 'verified' | 'pending' | 'not_provided';
  moqUnits: number | null;
  leadTimeDays: number | null;
  documentCount: number;
  expiredDocumentCount: number;
  // Additif, présent uniquement en mode référentiel complet (?all=1).
  linkedHairCount?: number;
  linkedSkinCount?: number;
};

type SupplierDetail = {
  supplier: SupplierRow;
  documents: Array<{
    id: string;
    documentType: string;
    reference?: string;
    issuedOn: string;
    expiresOn?: string;
    fileUrl: string;
    note?: string;
  }>;
  products: Array<{ id: string; slug: string; name: string; catalogStatus?: string }>;
  heldTypes?: string[];
  expiredTypes?: string[];
};

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  contract_manufacturer: 'Façonnier cosmétique',
  textile: 'Textile',
  tool: 'Outil / accessoire',
  raw_material: 'Matière première',
  packaging: 'Packaging',
  laboratory: 'Laboratoire / test',
  unknown: 'Non qualifié'
};

// Les libellés viennent de src/lib/sourcingDocuments : un même document doit
// porter le même nom dans l'écran, dans une demande de prix et dans une fiche.
const DOCUMENT_TYPE_LABELS = SUPPLIER_DOCUMENT_LABELS;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  verified: { label: 'Vérifié', color: 'text-emerald-300 border-emerald-300/30 bg-emerald-300/10' },
  pending: { label: 'En attente', color: 'text-amber-300 border-amber-300/30 bg-amber-300/10' },
  not_provided: { label: 'Non fourni', color: 'text-kurla-amber border-kurla-amber/30 bg-kurla-amber/10' }
};

function inputClass(): string {
  return 'w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-kurla-cream text-xs focus:outline-none focus:border-kurla-copper';
}
function labelClass(): string {
  return 'text-[10px] uppercase tracking-wider font-bold text-kurla-amber';
}
// Contrôles de filtre glissés sous chaque en-tête de colonne (17/09).
function headerFilterClass(): string {
  return 'w-full min-w-[88px] px-2 py-1 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-kurla-cream text-[11px] font-normal normal-case tracking-normal focus:outline-none focus:border-kurla-copper';
}

export function SupplierAdminPanel({ headers, onSuccess, showAll = false, focusSupplierId }: SupplierAdminPanelProps) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [supplierTypes, setSupplierTypes] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [sheetSupplierId, setSheetSupplierId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  // Filtres par colonne (17/09) : chaque colonne du tableau a son filtre,
  // combinables entre eux. Aucun filtre = liste complète.
  const [filters, setFilters] = useState({
    search: '', name: '', type: '', country: '', contact: '', moq: '', lead: '', docs: '', usage: '', status: ''
  });
  const setFilter = (key: keyof typeof filters, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const hasFilters = Object.values(filters).some(Boolean);
  // Édition en ligne du contact (17/09) : ajouter ou compléter un contact
  // directement dans la liste, sans ouvrir la fiche complète.
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactEdit, setContactEdit] = useState({ contactName: '', contactEmail: '' });

  const [draft, setDraft] = useState({
    legalName: '', tradeName: '', supplierType: 'unknown', country: '', website: '',
    contactName: '', contactEmail: '', moqUnits: '', leadTimeDays: '', certifications: ''
  });
  const [documentDraft, setDocumentDraft] = useState({
    documentType: 'cpsr', reference: '', issuedOn: '', expiresOn: '', fileUrl: '', note: ''
  });
  // Coordonnées éditables d'un fournisseur EXISTANT : jusqu'ici seul le
  // formulaire de création portait le contact — impossible de le compléter après coup.
  const [contactDraft, setContactDraft] = useState({ contactName: '', contactEmail: '', website: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(showAll ? '/api/admin/suppliers?all=1' : '/api/admin/suppliers', { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Référentiel fournisseurs indisponible.');
      setSuppliers(data.suppliers || []);
      setSupplierTypes(data.supplierTypes || []);
      setDocumentTypes(data.documentTypes || []);
    } catch (loadError: any) {
      setError(loadError.message || 'Référentiel fournisseurs indisponible.');
    } finally {
      setLoading(false);
    }
  }, [headers, showAll]);

  useEffect(() => { void load(); }, [load]);

  // Ouverture demandée depuis un autre écran : la modification se fait ICI,
  // dans la base fournisseurs de l'Approvisionnement — pas dans une fiche
  // flottante dupliquée ailleurs dans le dashboard.
  useEffect(() => {
    if (focusSupplierId) void openDetail(focusSupplierId);
  }, [focusSupplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (supplierId: string) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(supplierId)}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fiche fournisseur indisponible.');
      setDetail(data);
      setContactDraft({
        contactName: data.supplier?.contactName || '',
        contactEmail: data.supplier?.contactEmail || '',
        website: data.supplier?.website || '',
        notes: data.supplier?.notes || ''
      });
    } catch (detailError: any) {
      setError(detailError.message || 'Fiche fournisseur indisponible.');
    }
  };

  const createSupplier = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/suppliers', {
        method: 'POST', headers,
        body: JSON.stringify({
          ...draft,
          moqUnits: draft.moqUnits || null,
          leadTimeDays: draft.leadTimeDays || null,
          certifications: draft.certifications.split(/[|;\n]/).map(item => item.trim()).filter(Boolean)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        // Un 409 n’est pas un échec technique : deux entités pourraient convenir
        // et c’est à l’administrateur de trancher. On nomme les candidates.
        if (response.status === 409 && Array.isArray(data.candidates)) {
          throw new Error(`${data.error} Candidates : ${data.candidates.map((c: any) => c.legalName).join(' / ')}.`);
        }
        throw new Error(data.error || 'Fournisseur non créé.');
      }
      onSuccess?.(`Fournisseur « ${data.supplier.legalName} » créé en « non fourni » : il reste à joindre ses preuves.`);
      setDraft({ legalName: '', tradeName: '', supplierType: 'unknown', country: '', website: '', contactName: '', contactEmail: '', moqUnits: '', leadTimeDays: '', certifications: '' });
      await load();
    } catch (createError: any) {
      setError(createError.message || 'Fournisseur non créé.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (supplierId: string, verificationStatus: string) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(supplierId)}`, {
        method: 'PATCH', headers, body: JSON.stringify({ verificationStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Statut non mis à jour.');
      onSuccess?.(verificationStatus === 'verified'
        ? 'Fournisseur passé en vérifié : au moins une preuve est enregistrée.'
        : `Statut fournisseur mis à jour (${STATUS_LABELS[verificationStatus]?.label || verificationStatus}).`);
      await load();
      await openDetail(supplierId);
    } catch (statusError: any) {
      setError(statusError.message || 'Statut non mis à jour.');
    } finally {
      setBusy(false);
    }
  };

  // Enregistrement du contact édité en ligne dans le tableau (17/09) :
  // même route PATCH que la fiche détaillée, rechargement de la liste ensuite.
  const saveRowContact = async (supplier: SupplierRow) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(supplier.id)}`, {
        method: 'PATCH', headers, body: JSON.stringify(contactEdit)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Contact non enregistré.');
      onSuccess?.(`Contact de « ${supplier.legalName} » enregistré.`);
      setEditingContactId(null);
      await load();
    } catch (contactError: any) {
      setError(contactError.message || 'Contact non enregistré.');
    } finally {
      setBusy(false);
    }
  };

  const saveContact = async () => {
    if (!detail) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(detail.supplier.id)}`, {
        method: 'PATCH', headers, body: JSON.stringify(contactDraft)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Coordonnées non enregistrées.');
      onSuccess?.(`Coordonnées de « ${detail.supplier.legalName} » mises à jour.`);
      await load();
      await openDetail(detail.supplier.id);
    } catch (contactError: any) {
      setError(contactError.message || 'Coordonnées non enregistrées.');
    } finally {
      setBusy(false);
    }
  };

  const addDocument = async () => {
    if (!detail) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(detail.supplier.id)}/documents`, {
        method: 'POST', headers, body: JSON.stringify({
          ...documentDraft,
          issuedOn: documentDraft.issuedOn || null,
          expiresOn: documentDraft.expiresOn || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Document non enregistré.');
      onSuccess?.('Document de conformité enregistré avec sa preuve.');
      setDocumentDraft({ documentType: 'cpsr', reference: '', issuedOn: '', expiresOn: '', fileUrl: '', note: '' });
      await openDetail(detail.supplier.id);
      await load();
    } catch (documentError: any) {
      setError(documentError.message || 'Document non enregistré.');
    } finally {
      setBusy(false);
    }
  };

  // Liste filtrée : recherche globale + un filtre par colonne, combinables
  // entre eux. Aucun filtre = liste complète.
  const searchQuery = filters.search.trim().toLowerCase();
  const nameQuery = filters.name.trim().toLowerCase();
  const countryQuery = filters.country.trim().toLowerCase();
  const visibleSuppliers = suppliers.filter(supplier => {
    if (searchQuery) {
      const haystack = [
        supplier.legalName, supplier.tradeName, supplier.country,
        SUPPLIER_TYPE_LABELS[supplier.supplierType] || supplier.supplierType,
        supplier.contactEmail, supplier.contactName
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    if (nameQuery && !`${supplier.legalName} ${supplier.tradeName || ''}`.toLowerCase().includes(nameQuery)) return false;
    if (filters.type && supplier.supplierType !== filters.type) return false;
    if (countryQuery && !String(supplier.country || '').toLowerCase().includes(countryQuery)) return false;
    if (filters.contact === 'avec' && !supplier.contactEmail) return false;
    if (filters.contact === 'sans' && supplier.contactEmail) return false;
    if (filters.moq === 'oui' && !supplier.moqUnits) return false;
    if (filters.moq === 'non' && supplier.moqUnits) return false;
    if (filters.lead === 'oui' && !supplier.leadTimeDays) return false;
    if (filters.lead === 'non' && supplier.leadTimeDays) return false;
    if (filters.docs === 'avec' && supplier.documentCount === 0) return false;
    if (filters.docs === 'sans' && supplier.documentCount > 0) return false;
    if (filters.docs === 'perimees' && supplier.expiredDocumentCount === 0) return false;
    if (filters.usage === 'hair' && !(supplier.linkedHairCount || 0)) return false;
    if (filters.usage === 'skin' && !(supplier.linkedSkinCount || 0)) return false;
    if (filters.usage === 'non' && ((supplier.linkedHairCount || 0) + (supplier.linkedSkinCount || 0)) > 0) return false;
    if (filters.status && supplier.verificationStatus !== filters.status) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-kurla-cream flex items-center gap-2"><Building2 size={18} /> Approvisionnement</h2>
          <p className="text-[11px] text-kurla-cream/60 mt-1 max-w-2xl">
            Qui fabrique quoi, et sur quelle preuve. Un fournisseur créé ici naît « non fourni » :
            la vérification ne se déclare pas, elle se justifie par un document daté.
          </p>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-xl border border-kurla-cream/15 text-kurla-cream/80 text-xs flex items-center gap-2 hover:border-kurla-copper">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Recharger
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs text-red-200 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <section className="rounded-2xl border border-kurla-cream/10 bg-kurla-cream/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-kurla-amber mb-3">Fournisseurs ({suppliers.length})</h3>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-kurla-cream text-xs focus:outline-none focus:border-kurla-copper w-64"
            placeholder="Recherche globale : nom, métier, pays, contact…"
            value={filters.search}
            onChange={event => setFilter('search', event.target.value)}
          />
          {hasFilters && (
            <>
              <span className="text-[11px] text-kurla-cream/50">{visibleSuppliers.length} affiché(s) sur {suppliers.length}</span>
              <button
                onClick={() => setFilters({ search: '', name: '', type: '', country: '', contact: '', moq: '', lead: '', docs: '', usage: '', status: '' })}
                className="px-3 py-2 rounded-xl border border-kurla-cream/15 text-xs text-kurla-cream/70 hover:border-kurla-copper"
              >
                Réinitialiser les filtres
              </button>
            </>
          )}
        </div>
        {suppliers.length === 0 ? (
          <p className="text-xs text-kurla-cream/50">
            Aucun fournisseur enregistré. Les 16 produits du catalogue n’ont pas de provenance
            renseignée : leur fournisseur réel n’est pas connu et n’a pas été inventé.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-kurla-amber">
                  <th className="py-2 pr-3">Raison sociale</th>
                  <th className="py-2 pr-3">Métier</th>
                  <th className="py-2 pr-3">Pays</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">MOQ</th>
                  <th className="py-2 pr-3">Délai</th>
                  <th className="py-2 pr-3">Preuves</th>
                  {showAll && <th className="py-2 pr-3">Usage réel</th>}
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2" />
                </tr>
                {/* Un filtre sous chaque colonne (17/09) : texte libre pour
                    raison sociale et pays, listes déroulantes pour les
                    colonnes à valeurs connues. Filtres combinables. */}
                <tr>
                  <th className="pb-2 pr-3">
                    {/* 17/09, 2e passe (« listes déroulantes sur tous les tableaux ») :
                        30 fournisseurs — le nom se choisit, il ne se tape plus. La
                        recherche globale au-dessus reste en saisie libre. */}
                    <select className={headerFilterClass()} aria-label="Filtrer par nom de fournisseur" value={filters.name} onChange={event => setFilter('name', event.target.value)}>
                      <option value="">Tous</option>
                      {[...new Set(suppliers.map(supplier => String(supplier.tradeName || supplier.legalName || supplier.id)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </th>
                  <th className="pb-2 pr-3">
                    <select className={headerFilterClass()} value={filters.type} onChange={event => setFilter('type', event.target.value)}>
                      <option value="">Tous</option>
                      {(supplierTypes.length ? supplierTypes : Object.keys(SUPPLIER_TYPE_LABELS)).map(type => (
                        <option key={type} value={type}>{SUPPLIER_TYPE_LABELS[type] || type}</option>
                      ))}
                    </select>
                  </th>
                  <th className="pb-2 pr-3">
                    <input className={headerFilterClass()} placeholder="Pays…" value={filters.country} onChange={event => setFilter('country', event.target.value)} />
                  </th>
                  <th className="pb-2 pr-3">
                    <select className={headerFilterClass()} value={filters.contact} onChange={event => setFilter('contact', event.target.value)}>
                      <option value="">Tous</option>
                      <option value="avec">Avec e-mail</option>
                      <option value="sans">Sans e-mail</option>
                    </select>
                  </th>
                  <th className="pb-2 pr-3">
                    <select className={headerFilterClass()} value={filters.moq} onChange={event => setFilter('moq', event.target.value)}>
                      <option value="">Tous</option>
                      <option value="oui">Renseigné</option>
                      <option value="non">Vide</option>
                    </select>
                  </th>
                  <th className="pb-2 pr-3">
                    <select className={headerFilterClass()} value={filters.lead} onChange={event => setFilter('lead', event.target.value)}>
                      <option value="">Tous</option>
                      <option value="oui">Renseigné</option>
                      <option value="non">Vide</option>
                    </select>
                  </th>
                  <th className="pb-2 pr-3">
                    <select className={headerFilterClass()} value={filters.docs} onChange={event => setFilter('docs', event.target.value)}>
                      <option value="">Toutes</option>
                      <option value="avec">Avec preuve</option>
                      <option value="sans">Sans preuve</option>
                      <option value="perimees">Périmée(s)</option>
                    </select>
                  </th>
                  {showAll && (
                    <th className="pb-2 pr-3">
                      <select className={headerFilterClass()} value={filters.usage} onChange={event => setFilter('usage', event.target.value)}>
                        <option value="">Tous</option>
                        <option value="hair">Utilisé Hair</option>
                        <option value="skin">Utilisé Skin</option>
                        <option value="non">Non utilisé</option>
                      </select>
                    </th>
                  )}
                  <th className="pb-2 pr-3">
                    <select className={headerFilterClass()} value={filters.status} onChange={event => setFilter('status', event.target.value)}>
                      <option value="">Tous</option>
                      <option value="verified">Vérifié</option>
                      <option value="pending">En attente</option>
                      <option value="not_provided">Non fourni</option>
                    </select>
                  </th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {visibleSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={showAll ? 10 : 9} className="py-4 text-center text-kurla-cream/50">
                      Aucun fournisseur ne correspond à ce filtre.
                    </td>
                  </tr>
                )}
                {visibleSuppliers.map(supplier => {
                  const status = STATUS_LABELS[supplier.verificationStatus] || STATUS_LABELS.not_provided;
                  return (
                    <tr key={supplier.id} className="border-t border-kurla-cream/10">
                      {/* 18/09 — « cliquer sur le fournisseur » : le nom lui-même
                          ouvre la fiche, pas seulement le bouton « Compléter ». */}
                      <td className="py-2 pr-3 text-kurla-cream"><button type="button" onClick={() => setSheetSupplierId(supplier.id)} title="Ouvrir la fiche fournisseur et la modifier" className="text-left font-semibold hover:text-kurla-amber underline decoration-kurla-copper/40 underline-offset-2">{supplier.legalName}{supplier.tradeName ? <span className="text-kurla-cream/40 font-normal"> · {supplier.tradeName}</span> : null}</button></td>
                      <td className="py-2 pr-3 text-kurla-cream/70">{SUPPLIER_TYPE_LABELS[supplier.supplierType] || supplier.supplierType}</td>
                      <td className="py-2 pr-3 text-kurla-cream/70">{supplier.country || '—'}</td>
                      <td className="py-2 pr-3 text-kurla-cream/70">
                        {editingContactId === supplier.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              className={headerFilterClass()}
                              placeholder="Nom du contact"
                              value={contactEdit.contactName}
                              onChange={event => setContactEdit({ ...contactEdit, contactName: event.target.value })}
                            />
                            <input
                              type="email"
                              className={headerFilterClass()}
                              placeholder="E-mail"
                              value={contactEdit.contactEmail}
                              onChange={event => setContactEdit({ ...contactEdit, contactEmail: event.target.value })}
                            />
                            <button onClick={() => void saveRowContact(supplier)} disabled={busy}
                              className="px-2 py-1 rounded-lg bg-kurla-copper text-kurla-ink text-[10px] font-bold disabled:opacity-40">OK</button>
                            <button onClick={() => setEditingContactId(null)}
                              className="px-2 py-1 rounded-lg border border-kurla-cream/15 text-[10px] text-kurla-cream/70">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {supplier.contactEmail
                              ? <a href={`mailto:${supplier.contactEmail}`} className="text-kurla-copper hover:underline">{supplier.contactEmail}</a>
                              : supplier.contactName
                                ? <span title="E-mail à compléter">{supplier.contactName}</span>
                                : <span className="text-amber-300/80">à compléter</span>}
                            <button
                              onClick={() => { setEditingContactId(supplier.id); setContactEdit({ contactName: supplier.contactName || '', contactEmail: supplier.contactEmail || '' }); }}
                              className="text-[10px] text-kurla-cream/45 hover:text-kurla-copper whitespace-nowrap"
                              title="Ajouter ou modifier le contact"
                            >
                              {supplier.contactEmail || supplier.contactName ? 'modifier' : '+ ajouter'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-kurla-cream/70">{supplier.moqUnits ? `${supplier.moqUnits} u.` : '—'}</td>
                      <td className="py-2 pr-3 text-kurla-cream/70">{supplier.leadTimeDays ? `${supplier.leadTimeDays} j` : '—'}</td>
                      <td className="py-2 pr-3 text-kurla-cream/70">
                        {supplier.documentCount}
                        {supplier.expiredDocumentCount > 0 && (
                          <span className="ml-2 text-amber-300">dont {supplier.expiredDocumentCount} périmée(s)</span>
                        )}
                      </td>
                      {showAll && (
                        <td className="py-2 pr-3 text-kurla-cream/70">
                          {(supplier.linkedHairCount || 0) + (supplier.linkedSkinCount || 0) > 0 ? (
                            <span className="whitespace-nowrap">
                              {supplier.linkedHairCount ? <span className="text-kurla-copper">{supplier.linkedHairCount} Hair</span> : null}
                              {supplier.linkedHairCount && supplier.linkedSkinCount ? ' · ' : ''}
                              {supplier.linkedSkinCount ? <span className="text-emerald-300">{supplier.linkedSkinCount} Skin</span> : null}
                            </span>
                          ) : (
                            <span className="text-amber-300/80" title="Fournisseur identifié mais aucun produit du catalogue ne lui est rattaché — il reste dans le référentiel, il n'est pas perdu.">non utilisé</span>
                          )}
                        </td>
                      )}
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] ${status.color}`}>{status.label}</span>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {/* 17/09, 2e demande : dans cet espace, tout fournisseur affiché
                            est modifiable — la fiche s'ouvre aussi depuis la liste, pas
                            seulement depuis la vue détaillée. */}
                        <button type="button" onClick={() => setSheetSupplierId(supplier.id)} className="mr-3 text-kurla-cream/70 hover:text-kurla-amber hover:underline">Compléter</button>
                        <button onClick={() => void openDetail(supplier.id)} className="text-kurla-copper hover:underline">Ouvrir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-kurla-cream/10 bg-kurla-cream/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-kurla-amber mb-3">Déclarer un fournisseur</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1"><span className={labelClass()}>Raison sociale *</span>
            <input className={inputClass()} value={draft.legalName} onChange={event => setDraft({ ...draft, legalName: event.target.value })} placeholder="Ex. Laboratoire Alvend" /></label>
          <label className="space-y-1"><span className={labelClass()}>Nom commercial</span>
            <input className={inputClass()} value={draft.tradeName} onChange={event => setDraft({ ...draft, tradeName: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>Métier</span>
            <select className={inputClass()} value={draft.supplierType} onChange={event => setDraft({ ...draft, supplierType: event.target.value })}>
              {(supplierTypes.length ? supplierTypes : Object.keys(SUPPLIER_TYPE_LABELS)).map(type => (
                <option key={type} value={type}>{SUPPLIER_TYPE_LABELS[type] || type}</option>
              ))}
            </select></label>
          <label className="space-y-1"><span className={labelClass()}>Pays</span>
            <input className={inputClass()} value={draft.country} onChange={event => setDraft({ ...draft, country: event.target.value })} placeholder="FR" /></label>
          <label className="space-y-1"><span className={labelClass()}>MOQ (unités)</span>
            <input className={inputClass()} value={draft.moqUnits} onChange={event => setDraft({ ...draft, moqUnits: event.target.value })} placeholder="500" /></label>
          <label className="space-y-1"><span className={labelClass()}>Délai (jours)</span>
            <input className={inputClass()} value={draft.leadTimeDays} onChange={event => setDraft({ ...draft, leadTimeDays: event.target.value })} placeholder="45" /></label>
          <label className="space-y-1"><span className={labelClass()}>Contact</span>
            <input className={inputClass()} value={draft.contactName} onChange={event => setDraft({ ...draft, contactName: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>E-mail</span>
            <input className={inputClass()} value={draft.contactEmail} onChange={event => setDraft({ ...draft, contactEmail: event.target.value })} /></label>
          <label className="space-y-1"><span className={labelClass()}>Certifications</span>
            <input className={inputClass()} value={draft.certifications} onChange={event => setDraft({ ...draft, certifications: event.target.value })} placeholder="ISO 22716 | Ecocert" /></label>
        </div>
        <p className="text-[10px] text-kurla-cream/40 mt-3">
          Le MOQ et le délai annoncés par un fournisseur sont des informations commerciales :
          ils restent à confirmer par demande de prix avant tout engagement.
        </p>
        <button onClick={() => void createSupplier()} disabled={busy || !draft.legalName.trim()}
          className="mt-4 px-4 py-2 rounded-xl bg-kurla-copper text-kurla-ink text-xs font-bold flex items-center gap-2 disabled:opacity-40">
          <Plus size={13} /> Créer le fournisseur
        </button>
      </section>

      {/* Fiche flottante (17/09) : elle vit ICI, dans la base fournisseurs de
          l'Approvisionnement. Ailleurs dans le dashboard, un nom de fournisseur
          renvoie vers cette base — il n'y a qu'une surface d'édition. */}
      {sheetSupplierId && (
        <SupplierSheet
          supplierId={sheetSupplierId}
          headers={headers}
          linkedProducts={detail && detail.supplier.id === sheetSupplierId ? detail.products.length : undefined}
          documentCount={detail && detail.supplier.id === sheetSupplierId ? detail.documents.length : undefined}
          onSaved={() => { void load(); if (detail) void openDetail(detail.supplier.id); }}
          onClose={() => setSheetSupplierId(null)}
        />
      )}
      {detail && (
        <section className="rounded-2xl border border-kurla-copper/40 bg-kurla-copper/[0.06] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-kurla-cream"><button type="button" onClick={() => setSheetSupplierId(detail.supplier.id)} title="Ouvrir la fiche fournisseur et la modifier" className="text-left hover:text-kurla-amber underline decoration-kurla-copper/40 underline-offset-2">{detail.supplier.legalName}</button></h3>
              <button type="button" onClick={() => setSheetSupplierId(detail.supplier.id)} className="px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 hover:border-kurla-copper/40 hover:text-kurla-cream">Compléter la fiche</button>
              <p className="text-[11px] text-kurla-cream/60">
                {SUPPLIER_TYPE_LABELS[detail.supplier.supplierType] || detail.supplier.supplierType}
                {detail.supplier.country ? ` · ${detail.supplier.country}` : ''} · identifiant <code>{detail.supplier.id}</code>
              </p>
            </div>
            <label className="flex items-center gap-2">
              <span className={labelClass()}>Statut</span>
              <select className={inputClass()} value={detail.supplier.verificationStatus}
                onChange={event => void setStatus(detail.supplier.id, event.target.value)} disabled={busy}>
                <option value="not_provided">Non fourni</option>
                <option value="pending">En attente</option>
                <option value="verified">Vérifié</option>
              </select>
            </label>
          </div>

          <p className="text-[10px] text-kurla-cream/50 mb-2">
            « Vérifié » exige au moins un document enregistré ci-dessous : sans preuve, la
            plateforme refuse le changement de statut.
          </p>

          {(() => {
            const held = new Set<string>((detail.heldTypes || detail.documents.map(d => d.documentType)));
            const expired = new Set<string>(detail.expiredTypes || detail.documents.filter(d => d.expiresOn && d.expiresOn < new Date().toISOString().slice(0,10)).map(d => d.documentType));
            const today = new Date().toISOString().slice(0,10);
            const allExpired = (t: string) => detail.documents.filter(d => d.documentType === t).every(d => d.expiresOn && d.expiresOn < today) && held.has(t);
            return (
              <div className="rounded-xl border border-kurla-copper/30 bg-kurla-espresso p-4 mb-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber flex items-center gap-2"><ShieldCheck size={13} /> Dossier cosmétique UE — 5 héros (CPNP / RP / CPSR)</h4>
                <p className="text-[10px] text-kurla-cream/50 leading-relaxed">
                  Un cosmétique (tout soin p01–p15, p28–p34, p51–p54) n'est vendable qu'avec le trio vérifié <strong className="text-kurla-cream">CPSR + notification CPNP + Personne Responsable UE</strong> (Règl. 1223/2009). Sans ce trio chez le fournisseur, le catalogue bloque la publication — rattachez uniquement une source UE dont le dossier est effectivement fourni et vérifié.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {COSMETIC_REQUIRED_DOCS.map(doc => {
                    const has = held.has(doc);
                    const exp = expired.has(doc) || allExpired(doc);
                    return (
                      <div key={doc} className={`p-2.5 rounded-xl border text-[11px] ${!has ? 'bg-rose-950/30 border-rose-500/30 text-rose-200' : exp ? 'bg-amber-950/30 border-amber-500/30 text-amber-200' : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'}`}>
                        <p className="font-bold">{COSMETIC_DOC_LABELS[doc] || doc}</p>
                        <p className="text-[10px] opacity-70 mt-1">{COSMETIC_DOC_REASONS[doc]}</p>
                        <p className="mt-1.5 font-semibold">{!has ? '— manquant' : exp ? '— expiré (à renouveler)' : '✓ versé + vérifiable'}</p>
                        {has && !exp && detail.documents.filter(d => d.documentType === doc).slice(0,1).map(d => (
                          <a key={d.id} href={d.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] underline break-all opacity-80">{d.fileUrl}</a>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const ok = COSMETIC_REQUIRED_DOCS.every(d => held.has(d) && !expired.has(d));
                  const needs = detail.products.length > 0 ? ` — ${detail.products.length} produit(s) rattaché(s)` : '';
                  return (
                    <p className={`text-xs font-bold flex items-center gap-1.5 ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {ok ? '✓ Dossier cosmétique complet — produits rattachés publiables (si 7 vérifications au vert).' : `⛔ Dossier incomplet — aucun cosmétique rattaché ne peut passer en « publié »${needs}.`}
                    </p>
                  );
                })()}
                <p className="text-[10px] text-kurla-cream/35">Astuce : si le façonnier ne peut pas fournir le CPSR/CPNP, ne bloquez pas la vente — importez le même SKU via un grossiste UE vérifié (il porte déjà le trio). L'écran « Fournisseur & sourcing » du catalogue permet de basculer le rattachement en 1 clic.</p>
              </div>
            );
          })()}

          <div className="rounded-xl border border-kurla-cream/10 bg-kurla-ink/60 p-4 mb-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber mb-3">Coordonnées & contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="space-y-1"><span className={labelClass()}>Nom du contact</span>
                <input className={inputClass()} value={contactDraft.contactName}
                  onChange={event => setContactDraft({ ...contactDraft, contactName: event.target.value })}
                  placeholder="Ex. Service commercial" /></label>
              <label className="space-y-1"><span className={labelClass()}>E-mail</span>
                <input type="email" className={inputClass()} value={contactDraft.contactEmail}
                  onChange={event => setContactDraft({ ...contactDraft, contactEmail: event.target.value })}
                  placeholder="contact@fournisseur.com" /></label>
              <label className="space-y-1"><span className={labelClass()}>Site web</span>
                <input className={inputClass()} value={contactDraft.website}
                  onChange={event => setContactDraft({ ...contactDraft, website: event.target.value })}
                  placeholder="https://…" /></label>
              <label className="space-y-1 md:col-span-3"><span className={labelClass()}>Notes (téléphone, adresse, alternatives qualifiées)</span>
                <textarea rows={3} className={inputClass()} value={contactDraft.notes}
                  onChange={event => setContactDraft({ ...contactDraft, notes: event.target.value })} /></label>
            </div>
            <div className="flex items-center justify-between gap-3 mt-3">
              <p className="text-[10px] text-kurla-cream/40">
                Uniquement des coordonnées publiques réelles et vérifiées (page contact officielle,
                registre) — jamais une adresse devinée. Si le contact est inconnu, laissez vide.
              </p>
              <button onClick={() => void saveContact()} disabled={busy}
                className="px-3 py-2 rounded-xl bg-kurla-copper text-kurla-ink text-xs font-bold flex items-center gap-2 disabled:opacity-40 shrink-0">
                <Save size={13} /> Enregistrer le contact
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber mb-2 flex items-center gap-2">
                <FileCheck2 size={13} /> Preuves ({detail.documents.length})
              </h4>
              {detail.documents.length === 0 ? (
                <p className="text-xs text-kurla-cream/50">Aucune preuve enregistrée.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.documents.map(document => (
                    <li key={document.id} className="rounded-xl border border-kurla-cream/10 px-3 py-2">
                      <div className="text-xs text-kurla-cream">{DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType}</div>
                      <div className="text-[10px] text-kurla-cream/50">
                        Émis le {document.issuedOn}
                        {document.expiresOn ? ` · expire le ${document.expiresOn}` : ''}
                        {document.reference ? ` · réf. ${document.reference}` : ''}
                      </div>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-kurla-copper hover:underline break-all">{document.fileUrl}</a>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 space-y-2">
                <label className="space-y-1"><span className={labelClass()}>Type de document</span>
                  <select className={inputClass()} value={documentDraft.documentType}
                    onChange={event => setDocumentDraft({ ...documentDraft, documentType: event.target.value })}>
                    {(documentTypes.length ? documentTypes : Object.keys(DOCUMENT_TYPE_LABELS)).map(type => (
                      <option key={type} value={type}>{DOCUMENT_TYPE_LABELS[type] || type}</option>
                    ))}
                  </select></label>
                <label className="space-y-1"><span className={labelClass()}>URL du fichier hébergé *</span>
                  <input className={inputClass()} value={documentDraft.fileUrl}
                    onChange={event => setDocumentDraft({ ...documentDraft, fileUrl: event.target.value })}
                    placeholder="https://…/cpsr-2026.pdf" /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1"><span className={labelClass()}>Émis le *</span>
                    <input type="date" className={inputClass()} value={documentDraft.issuedOn}
                      onChange={event => setDocumentDraft({ ...documentDraft, issuedOn: event.target.value })} /></label>
                  <label className="space-y-1"><span className={labelClass()}>Expire le</span>
                    <input type="date" className={inputClass()} value={documentDraft.expiresOn}
                      onChange={event => setDocumentDraft({ ...documentDraft, expiresOn: event.target.value })} /></label>
                </div>
                <label className="space-y-1"><span className={labelClass()}>Référence</span>
                  <input className={inputClass()} value={documentDraft.reference}
                    onChange={event => setDocumentDraft({ ...documentDraft, reference: event.target.value })} /></label>
                <button onClick={() => void addDocument()} disabled={busy || !documentDraft.fileUrl.trim() || !documentDraft.issuedOn}
                  className="px-3 py-2 rounded-xl bg-kurla-copper text-kurla-ink text-xs font-bold flex items-center gap-2 disabled:opacity-40">
                  <Save size={13} /> Enregistrer la preuve
                </button>
                <p className="text-[10px] text-kurla-cream/40">
                  Le fichier doit déjà être hébergé : cet écran enregistre l’adresse et la date,
                  il ne téléverse pas. Sans les deux, l’enregistrement est refusé.
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-kurla-amber mb-2 flex items-center gap-2">
                <Package size={13} /> Produits rattachés ({detail.products.length})
              </h4>
              {detail.products.length === 0 ? (
                <p className="text-xs text-kurla-cream/50">
                  Aucun produit rattaché. Le rattachement se fait par l’import fournisseur, qui
                  résout le nom avant d’écrire — il ne devine jamais.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.products.map(product => (
                    <li key={product.id} className="rounded-xl border border-kurla-cream/10 px-3 py-2">
                      <div className="text-xs text-kurla-cream">{product.name}</div>
                      <div className="text-[10px] text-kurla-cream/50">{product.slug} · {product.catalogStatus || '—'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
