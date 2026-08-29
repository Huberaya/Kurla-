import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, FileCheck2, Package, Plus, RefreshCw, Save } from 'lucide-react';
import { SUPPLIER_DOCUMENT_LABELS } from '../lib/sourcingDocuments';

type SupplierAdminPanelProps = {
  headers: HeadersInit;
  onSuccess?: (message: string) => void;
};

type SupplierRow = {
  id: string;
  legalName: string;
  tradeName?: string;
  supplierType: string;
  country?: string;
  verificationStatus: 'verified' | 'pending' | 'not_provided';
  moqUnits: number | null;
  leadTimeDays: number | null;
  documentCount: number;
  expiredDocumentCount: number;
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
  not_provided: { label: 'Non fourni', color: 'text-[#D49A63] border-[#D49A63]/30 bg-[#D49A63]/10' }
};

function inputClass(): string {
  return 'w-full px-3 py-2 rounded-xl bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-xs focus:outline-none focus:border-[#C8753D]';
}
function labelClass(): string {
  return 'text-[10px] uppercase tracking-wider font-bold text-[#D49A63]';
}

export function SupplierAdminPanel({ headers, onSuccess }: SupplierAdminPanelProps) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [supplierTypes, setSupplierTypes] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState({
    legalName: '', tradeName: '', supplierType: 'unknown', country: '', website: '',
    contactName: '', contactEmail: '', moqUnits: '', leadTimeDays: '', certifications: ''
  });
  const [documentDraft, setDocumentDraft] = useState({
    documentType: 'cpsr', reference: '', issuedOn: '', expiresOn: '', fileUrl: '', note: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/suppliers', { headers });
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
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (supplierId: string) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/suppliers/${encodeURIComponent(supplierId)}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Fiche fournisseur indisponible.');
      setDetail(data);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#FFF7EF] flex items-center gap-2"><Building2 size={18} /> Approvisionnement</h2>
          <p className="text-[11px] text-[#FFF7EF]/60 mt-1 max-w-2xl">
            Qui fabrique quoi, et sur quelle preuve. Un fournisseur créé ici naît « non fourni » :
            la vérification ne se déclare pas, elle se justifie par un document daté.
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

      <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3">Référentiel ({suppliers.length})</h3>
        {suppliers.length === 0 ? (
          <p className="text-xs text-[#FFF7EF]/50">
            Aucun fournisseur enregistré. Les 16 produits du catalogue n’ont pas de provenance
            renseignée : leur fournisseur réel n’est pas connu et n’a pas été inventé.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#D49A63]">
                  <th className="py-2 pr-3">Raison sociale</th>
                  <th className="py-2 pr-3">Métier</th>
                  <th className="py-2 pr-3">Pays</th>
                  <th className="py-2 pr-3">MOQ</th>
                  <th className="py-2 pr-3">Délai</th>
                  <th className="py-2 pr-3">Preuves</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {suppliers.map(supplier => {
                  const status = STATUS_LABELS[supplier.verificationStatus] || STATUS_LABELS.not_provided;
                  return (
                    <tr key={supplier.id} className="border-t border-[#FFF7EF]/10">
                      <td className="py-2 pr-3 text-[#FFF7EF]">{supplier.legalName}{supplier.tradeName ? <span className="text-[#FFF7EF]/40"> · {supplier.tradeName}</span> : null}</td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">{SUPPLIER_TYPE_LABELS[supplier.supplierType] || supplier.supplierType}</td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">{supplier.country || '—'}</td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">{supplier.moqUnits ? `${supplier.moqUnits} u.` : '—'}</td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">{supplier.leadTimeDays ? `${supplier.leadTimeDays} j` : '—'}</td>
                      <td className="py-2 pr-3 text-[#FFF7EF]/70">
                        {supplier.documentCount}
                        {supplier.expiredDocumentCount > 0 && (
                          <span className="ml-2 text-amber-300">dont {supplier.expiredDocumentCount} périmée(s)</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] ${status.color}`}>{status.label}</span>
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => void openDetail(supplier.id)} className="text-[#C8753D] hover:underline">Ouvrir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-3">Déclarer un fournisseur</h3>
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
        <p className="text-[10px] text-[#FFF7EF]/40 mt-3">
          Le MOQ et le délai annoncés par un fournisseur sont des informations commerciales :
          ils restent à confirmer par demande de prix avant tout engagement.
        </p>
        <button onClick={() => void createSupplier()} disabled={busy || !draft.legalName.trim()}
          className="mt-4 px-4 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
          <Plus size={13} /> Créer le fournisseur
        </button>
      </section>

      {detail && (
        <section className="rounded-2xl border border-[#C8753D]/40 bg-[#C8753D]/[0.06] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#FFF7EF]">{detail.supplier.legalName}</h3>
              <p className="text-[11px] text-[#FFF7EF]/60">
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

          <p className="text-[10px] text-[#FFF7EF]/50 mb-4">
            « Vérifié » exige au moins un document enregistré ci-dessous : sans preuve, la
            plateforme refuse le changement de statut.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-2 flex items-center gap-2">
                <FileCheck2 size={13} /> Preuves ({detail.documents.length})
              </h4>
              {detail.documents.length === 0 ? (
                <p className="text-xs text-[#FFF7EF]/50">Aucune preuve enregistrée.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.documents.map(document => (
                    <li key={document.id} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                      <div className="text-xs text-[#FFF7EF]">{DOCUMENT_TYPE_LABELS[document.documentType] || document.documentType}</div>
                      <div className="text-[10px] text-[#FFF7EF]/50">
                        Émis le {document.issuedOn}
                        {document.expiresOn ? ` · expire le ${document.expiresOn}` : ''}
                        {document.reference ? ` · réf. ${document.reference}` : ''}
                      </div>
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#C8753D] hover:underline break-all">{document.fileUrl}</a>
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
                  className="px-3 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold flex items-center gap-2 disabled:opacity-40">
                  <Save size={13} /> Enregistrer la preuve
                </button>
                <p className="text-[10px] text-[#FFF7EF]/40">
                  Le fichier doit déjà être hébergé : cet écran enregistre l’adresse et la date,
                  il ne téléverse pas. Sans les deux, l’enregistrement est refusé.
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#D49A63] mb-2 flex items-center gap-2">
                <Package size={13} /> Produits rattachés ({detail.products.length})
              </h4>
              {detail.products.length === 0 ? (
                <p className="text-xs text-[#FFF7EF]/50">
                  Aucun produit rattaché. Le rattachement se fait par l’import fournisseur, qui
                  résout le nom avant d’écrire — il ne devine jamais.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.products.map(product => (
                    <li key={product.id} className="rounded-xl border border-[#FFF7EF]/10 px-3 py-2">
                      <div className="text-xs text-[#FFF7EF]">{product.name}</div>
                      <div className="text-[10px] text-[#FFF7EF]/50">{product.slug} · {product.catalogStatus || '—'}</div>
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
