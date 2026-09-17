import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { SupplierName } from './EditableRecordName';
import { ColumnFilterPresence, ColumnFilterSelect, ColumnFilterText, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { AlertTriangle, ClipboardList, Mail, Package, RefreshCw, Save, Truck } from 'lucide-react';
import { AssortmentPlanPanel } from './AssortmentPlanPanel';
import { PurchasingDeskPanel } from './PurchasingDeskPanel';

type PanelProps = { headers: HeadersInit; onSuccess?: (message: string) => void };

type SupplierJoint = {
  id: string;
  legalName: string;
  tradeName?: string;
  supplierType?: string;
  country?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  moqUnits?: number | null;
  leadTimeDays?: number | null;
  certifications?: string[];
  verificationStatus?: string;
};

type Prospect = {
  id: string;
  name: string;
  route: 'A' | 'B';
  contactType: string;
  specialty?: string;
  sourceUrl?: string;
  contactEmail?: string;
  status: string;
  followUpOn?: string;
  wholesalePricing?: string;
  inciProvided?: string;
  euCompliance?: string;
  samplesReceived?: string;
  decision?: string;
  notes?: string;
  /** Fiche fournisseur validée (migration 20261004) — rejointe, jamais recopiée. */
  supplierId?: string | null;
  supplier?: SupplierJoint | null;
  /** Le contact affiché vient de la fiche fournisseur, pas de la piste. */
  contactFromSupplier?: boolean;
};

type Candidate = {
  id: string;
  prospectId: string;
  brand: string;
  product: string;
  routineStep?: string;
  category?: string;
  inciReceived: boolean;
  ingredientsMapped: number;
  purchasePriceCents: number | null;
  publicPriceCents: number | null;
  marginPct: number | null;
  firstOrderQty: number | null;
  sampleValidated: boolean;
  visualsReceived: boolean;
  governanceStatus: string;
  notes?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  to_contact: { label: 'À contacter', color: 'text-kurla-cream/70 border-kurla-cream/20 bg-kurla-cream/5' },
  emailed: { label: 'Email envoyé', color: 'text-sky-300 border-sky-300/30 bg-sky-300/10' },
  followed_up: { label: 'Relancé', color: 'text-indigo-300 border-indigo-300/30 bg-indigo-300/10' },
  replied: { label: 'Réponse reçue', color: 'text-cyan-300 border-cyan-300/30 bg-cyan-300/10' },
  in_negotiation: { label: 'En négociation', color: 'text-amber-300 border-amber-300/30 bg-amber-300/10' },
  samples_sent: { label: 'Échantillons', color: 'text-purple-300 border-purple-300/30 bg-purple-300/10' },
  agreed: { label: 'Accord', color: 'text-emerald-300 border-emerald-300/30 bg-emerald-300/10' },
  declined: { label: 'Refus', color: 'text-rose-300 border-rose-300/30 bg-rose-300/10' },
  no_response: { label: 'Sans réponse', color: 'text-rose-400 border-rose-400/30 bg-rose-400/10' },
};

const TYPE_LABELS: Record<string, string> = {
  brand_fr: 'Marque FR',
  brand_eu: 'Marque UE',
  skin_solar: 'Peau / Solaire',
  distributor: 'Distributeur',
  contract_manufacturer: 'Façonnier',
};

const GOV_LABELS: Record<string, { label: string; color: string }> = {
  blocked: { label: 'Bloqué', color: 'text-rose-300 border-rose-300/30 bg-rose-300/10' },
  waiting_inci: { label: 'Attend INCI', color: 'text-amber-300 border-amber-300/30 bg-amber-300/10' },
  in_progress: { label: 'En cours', color: 'text-sky-300 border-sky-300/30 bg-sky-300/10' },
  ready: { label: 'Prêt', color: 'text-cyan-300 border-cyan-300/30 bg-cyan-300/10' },
  published: { label: 'Publié', color: 'text-emerald-300 border-emerald-300/30 bg-emerald-300/10' },
};

const STATUS_ORDER = ['to_contact', 'emailed', 'followed_up', 'replied', 'in_negotiation', 'samples_sent', 'agreed', 'declined', 'no_response'];
const TRI = ['pending', 'yes', 'no', 'na'];
const TRI_LABEL: Record<string, string> = { pending: 'Attente', yes: 'Oui', no: 'Non', na: 'N/A' };
const GOV_ORDER = ['blocked', 'waiting_inci', 'in_progress', 'ready', 'published'];
const DECISIONS = ['pending', 'accepted', 'waiting', 'rejected'];
const DECISION_LABEL: Record<string, string> = { pending: 'À décider', accepted: 'Retenu', waiting: 'En attente', rejected: 'Écarté' };

function euros(cents: number | null): string {
  if (cents === null || cents === undefined) return '—';
  return `${(cents / 100).toFixed(2)} €`;
}

function inputClass(): string {
  return 'w-full px-2.5 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-kurla-cream text-[11px] focus:outline-none focus:border-kurla-copper';
}
function badge(cls: { label: string; color: string }): string {
  return `px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${cls.color}`;
}

export const SourcingProspectsPanel: React.FC<PanelProps> = ({ headers, onSuccess }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [directory, setDirectory] = useState<Array<{ id: string; legalName: string }>>([]);
  const [convertNotice, setConvertNotice] = useState('');
  const [ambiguous, setAmbiguous] = useState<Array<{ prospectId: string; candidates: Array<{ id: string; legalName: string }> }>>([]);

  // Filtres par colonne (17/09) : 121 candidats en base — « lesquels sont
  // bloqués », « quelle marque », « quelle marge » doivent se répondre sans
  // faire défiler. Calcul partagé avec le reste du dashboard (columnFilters) :
  // un booléen faux est une information, il passe par un choix oui/non et non
  // par « rempli/vide ».
  const CANDIDATE_FILTER_KEYS = ['product', 'brand', 'step', 'purchase', 'public', 'margin', 'qty', 'inci', 'visuals', 'gov'] as const;
  const candidateFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'product', kind: 'text', get: (c: Candidate) => c.product, extra: (c: Candidate) => [c.category, c.notes] },
    { key: 'brand', kind: 'text', get: (c: Candidate) => c.brand },
    { key: 'step', kind: 'enum', get: (c: Candidate) => c.routineStep || '', options: Array.from(new Set(candidates.map(c => c.routineStep || '').filter(Boolean))).map(step => ({ value: step, label: step })) },
    { key: 'purchase', kind: 'numeric', get: (c: Candidate) => (c.purchasePriceCents == null ? NaN : c.purchasePriceCents / 100), unit: ' €' },
    { key: 'public', kind: 'numeric', get: (c: Candidate) => (c.publicPriceCents == null ? NaN : c.publicPriceCents / 100), unit: ' €' },
    { key: 'margin', kind: 'numeric', get: (c: Candidate) => (c.marginPct == null ? NaN : c.marginPct), unit: ' %' },
    { key: 'qty', kind: 'numeric', get: (c: Candidate) => (c.firstOrderQty == null ? NaN : c.firstOrderQty), unit: ' u' },
    { key: 'inci', kind: 'enum', get: (c: Candidate) => (c.inciReceived ? 'oui' : 'non'), options: [{ value: 'oui', label: 'INCI reçue' }, { value: 'non', label: 'INCI manquante' }] },
    { key: 'visuals', kind: 'enum', get: (c: Candidate) => (c.visualsReceived ? 'oui' : 'non'), options: [{ value: 'oui', label: 'Visuels reçus' }, { value: 'non', label: 'Visuels manquants' }] },
    { key: 'gov', kind: 'enum', get: (c: Candidate) => c.governanceStatus, options: Object.entries(GOV_LABELS).map(([value, meta]) => ({ value, label: meta.label })) },
  ], [candidates]);
  const [candidateFilterState, setCandidateFilterState] = useState(() => emptyFilterState(CANDIDATE_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]));
  const setCandidateFilter = (key: string, value: string) => setCandidateFilterState(prev => ({ ...prev, [key]: value }));
  const visibleCandidates = useMemo(
    () => applyColumnFilters(candidates, candidateFilters, candidateFilterState),
    [candidates, candidateFilters, candidateFilterState]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'desk' | 'plan' | 'prospects' | 'candidates'>('desk');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/sourcing/prospects', { headers }),
        fetch('/api/admin/sourcing/candidates', { headers }),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      setProspects(pData.prospects || []);
      setCandidates(cData.candidates || []);
    } catch (e) {
      setError('Impossible de charger le suivi de sourcing.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const convertProspect = async (id: string, body: { create?: boolean; supplierId?: string }) => {
    setSavingId(id);
    setConvertNotice('');
    setAmbiguous(prev => prev.filter(row => row.prospectId !== id));
    try {
      const res = await fetch(`/api/admin/sourcing/prospects/${encodeURIComponent(id)}/supplier`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409 && Array.isArray(data.candidates)) {
        setAmbiguous(prev => [...prev.filter(row => row.prospectId !== id), { prospectId: id, candidates: data.candidates }]);
        setError(data.error || 'Plusieurs fiches correspondent — tranchez.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Conversion refusée.');
      setProspects(prev => prev.map(p => (p.id === id ? data.prospect : p)));
      if (data.supplier && !directory.some(s => s.id === data.supplier.id)) {
        setDirectory(prev => [...prev, { id: String(data.supplier.id), legalName: data.supplier.legalName }]);
      }
      setConvertNotice(data.created
        ? `Fiche créée : ${data.supplier?.legalName} (${data.supplier?.id}). Hors boutique, non vérifiée.`
        : `Piste liée à ${data.supplier?.legalName}.`);
      onSuccess?.(data.created ? 'Fiche fournisseur créée depuis la piste.' : 'Piste liée à une fiche fournisseur.');
    } catch (e: any) {
      setError(e.message || 'Conversion échouée.');
    } finally {
      setSavingId(null);
    }
  };

  const patchProspect = async (id: string, patch: Partial<Prospect>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/sourcing/prospects/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setProspects((prev) => prev.map((p) => (p.id === id ? data.prospect : p)));
      onSuccess?.('Prospect mis à jour.');
    } catch (e: any) {
      setError(e.message || 'Mise à jour échouée.');
    } finally {
      setSavingId(null);
    }
  };

  const patchCandidate = async (id: string, patch: Partial<Candidate>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/sourcing/candidates/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setCandidates((prev) => prev.map((c) => (c.id === id ? data.candidate : c)));
      onSuccess?.('Référence mise à jour.');
    } catch (e: any) {
      setError(e.message || 'Mise à jour échouée.');
    } finally {
      setSavingId(null);
    }
  };

  const counts = {
    toContact: prospects.filter((p) => p.status === 'to_contact').length,
    active: prospects.filter((p) => ['emailed', 'followed_up', 'replied', 'in_negotiation', 'samples_sent'].includes(p.status)).length,
    agreed: prospects.filter((p) => p.status === 'agreed' || p.decision === 'accepted').length,
    inciReady: candidates.filter((c) => c.inciReceived).length,
    ready: candidates.filter((c) => c.governanceStatus === 'ready' || c.governanceStatus === 'published').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Truck className="w-5 h-5 text-kurla-copper" /> Approvisionnement
          </h3>
          <p className="text-[11px] text-kurla-cream/60 mt-1">
            Du besoin produit au fournisseur à contacter. Route hybride : A = revente de marques existantes · B = façonnage KURLA. Les tarifs, MOQ et contacts restent vides tant qu'aucune réponse réelle ne les donne.
          </p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-kurla-espresso border border-kurla-copper/30 text-kurla-cream text-[11px] flex items-center gap-2 hover:bg-kurla-copper/10">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['À contacter', counts.toContact],
          ['En cours', counts.active],
          ['Accords', counts.agreed],
          ['INCI reçus', counts.inciReady],
          ['Réf. prêtes', counts.ready],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl bg-kurla-espresso border border-kurla-cream/8 p-3 text-center">
            <div className="text-xl font-bold text-kurla-copper">{value as number}</div>
            <div className="text-[10px] text-kurla-cream/60 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('desk')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'desk' ? 'bg-kurla-copper text-white' : 'bg-kurla-espresso text-kurla-cream/70 border border-kurla-cream/10'}`}>
          <ClipboardList className="w-4 h-4" /> Bureau des achats
        </button>
        <button onClick={() => setTab('plan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'plan' ? 'bg-kurla-copper text-white' : 'bg-kurla-espresso text-kurla-cream/70 border border-kurla-cream/10'}`}>
          <Package className="w-4 h-4" /> Plan d'assortiment
        </button>
        <button onClick={() => setTab('prospects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'prospects' ? 'bg-kurla-copper text-white' : 'bg-kurla-espresso text-kurla-cream/70 border border-kurla-cream/10'}`}>
          <Mail className="w-4 h-4" /> Contacts ({prospects.length})
        </button>
        <button onClick={() => setTab('candidates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'candidates' ? 'bg-kurla-copper text-white' : 'bg-kurla-espresso text-kurla-cream/70 border border-kurla-cream/10'}`}>
          <Package className="w-4 h-4" /> Références à intégrer ({candidates.length})
        </button>
      </div>

      {loading && <p className="text-xs text-kurla-cream/60">Chargement…</p>}

      {/* ---------------- BUREAU DES ACHATS ---------------- */}
      {!loading && tab === 'desk' && (
        <PurchasingDeskPanel prospects={prospects} />
      )}

      {/* ---------------- PLAN D'ASSORTIMENT ---------------- */}
      {!loading && tab === 'plan' && (
        <AssortmentPlanPanel prospects={prospects} candidates={candidates} />
      )}

      {/* ---------------- PROSPECTS ---------------- */}
      {!loading && tab === 'prospects' && (
        <div className="space-y-3">
          {prospects.map((p) => {
            const st = STATUS_LABELS[p.status] || STATUS_LABELS.to_contact;
            return (
              <details key={p.id} className="rounded-2xl bg-kurla-espresso border border-kurla-cream/10 overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 flex-wrap hover:bg-kurla-cream/[0.03]">
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${p.route === 'A' ? 'bg-sky-500/15 text-sky-300' : 'bg-purple-500/15 text-purple-300'}`}>{p.route}</span>
                  <span className="text-xs font-semibold text-kurla-cream flex-1 min-w-[160px] text-left">{p.name}</span>
                  <span className="text-[10px] text-kurla-cream/50">{TYPE_LABELS[p.contactType] || p.contactType}</span>
                  <span className={badge(st)}>{st.label}</span>
                  {savingId === p.id && <RefreshCw className="w-3.5 h-3.5 animate-spin text-kurla-copper" />}
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-3">
                  <p className="text-[11px] text-kurla-cream/60">{p.specialty} {p.sourceUrl && <span className="text-kurla-copper/80">· {p.sourceUrl}</span>}</p>
                  {p.supplier && (
                    <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-400/20 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Fiche fournisseur — source unique</p>
                      <p className="text-[11px] text-kurla-cream/75 mt-1">
                        <SupplierName id={p.supplierId || null} label={p.supplier.legalName} headers={headers} className="text-[11px]" onSaved={() => void load()} />
                        {p.supplier.country ? ` · ${p.supplier.country}` : ''}
                        {p.supplier.website ? ` · ${p.supplier.website}` : ''}
                        {p.supplier.supplierType ? ` · ${p.supplier.supplierType}` : ''}
                        {p.supplier.verificationStatus ? ` · ${p.supplier.verificationStatus}` : ''}
                      </p>
                      <p className="text-[10px] text-kurla-cream/45 mt-0.5">
                        Lu depuis la fiche fournisseur, jamais recopié. Modifier un champ ci-dessous ne le change que pour cette piste.
                      </p>
                    </div>
                  )}
                  {!p.supplier && (
                    <div className="rounded-xl border border-kurla-cream/15 bg-kurla-ink px-3 py-2 space-y-2">
                      <p className="text-[10px] text-kurla-cream/55">
                        Cette piste n’est pas une fiche fournisseur. La conversion est un acte explicite — jamais un matching silencieux.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" disabled={savingId === p.id} onClick={() => void convertProspect(p.id, { create: true })}
                          className="px-3 py-1.5 rounded-lg bg-kurla-copper text-white text-[10px] font-bold disabled:opacity-50">
                          Créer la fiche fournisseur
                        </button>
                        <select defaultValue="" disabled={savingId === p.id}
                          onChange={e => { const value = e.target.value; if (value) void convertProspect(p.id, { supplierId: value }); e.target.value = ''; }}
                          className={inputClass() + ' max-w-[240px]'}>
                          <option value="">Lier à une fiche existante…</option>
                          {directory.map(s => <option key={s.id} value={s.id}>{s.legalName}</option>)}
                        </select>
                      </div>
                      {ambiguous.find(row => row.prospectId === p.id)?.candidates.map(c => (
                        <button key={c.id} type="button" onClick={() => void convertProspect(p.id, { supplierId: c.id })}
                          className="block text-[10px] text-kurla-copper font-bold hover:underline">
                          Trancher : {c.legalName} ({c.id})
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="text-[10px] text-kurla-cream/50">Statut
                      <select value={p.status} onChange={(e) => patchProspect(p.id, { status: e.target.value })} className={inputClass() + ' mt-1'}>
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                      </select>
                    </label>
                    <label className="text-[10px] text-kurla-cream/50">Relance prévue le
                      <input type="date" value={p.followUpOn?.slice(0, 10) || ''} onChange={(e) => patchProspect(p.id, { followUpOn: e.target.value })} className={inputClass() + ' mt-1'} />
                    </label>
                    <label className="text-[10px] text-kurla-cream/50">Email contact
                      {p.contactFromSupplier && <span className="text-emerald-300"> · fiche fournisseur</span>}
                      <input type="email" placeholder="contact@marque.com" value={p.contactEmail || ''} onChange={(e) => patchProspect(p.id, { contactEmail: e.target.value })} className={inputClass() + ' mt-1'} />
                    </label>
                    <label className="text-[10px] text-kurla-cream/50">Décision
                      <select value={p.decision || 'pending'} onChange={(e) => patchProspect(p.id, { decision: e.target.value })} className={inputClass() + ' mt-1'}>
                        {DECISIONS.map((d) => <option key={d} value={d}>{DECISION_LABEL[d]}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ['wholesalePricing', 'Tarif gros'],
                      ['inciProvided', 'INCI fournis'],
                      ['euCompliance', 'Conformité UE'],
                      ['samplesReceived', 'Échantillons'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="text-[10px] text-kurla-cream/50">{label}
                        <select value={(p as any)[field] || 'pending'} onChange={(e) => patchProspect(p.id, { [field]: e.target.value } as any)} className={inputClass() + ' mt-1'}>
                          {TRI.map((t) => <option key={t} value={t}>{TRI_LABEL[t]}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label className="block text-[10px] text-kurla-cream/50">Notes
                    <textarea rows={2} value={p.notes || ''} onChange={(e) => patchProspect(p.id, { notes: e.target.value })}
                      placeholder="Tarif annoncé, MOQ, délai, interlocuteur…" className={inputClass() + ' mt-1 resize-y'} />
                  </label>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {/* ---------------- CANDIDATES ---------------- */}
      {!loading && tab === 'candidates' && (
        <div className="overflow-x-auto rounded-2xl border border-kurla-cream/10">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-kurla-espresso text-kurla-cream/60">
              <tr>
                {['Produit', 'Marque', 'Étape', 'Achat', 'Public', 'Marge %', 'Qté', 'INCI', 'Visuels', 'Gouvernance'].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
              <tr className="bg-kurla-ink/40">
                <th className="px-3 py-2"><ColumnFilterText placeholder="Produit…" value={candidateFilterState.product} onChange={value => setCandidateFilter('product', value)} ariaLabel="Filtrer par produit" /></th>
                <th className="px-3 py-2"><ColumnFilterText placeholder="Marque…" value={candidateFilterState.brand} onChange={value => setCandidateFilter('brand', value)} ariaLabel="Filtrer par marque" /></th>
                <th className="px-3 py-2"><ColumnFilterSelect value={candidateFilterState.step} onChange={value => setCandidateFilter('step', value)} ariaLabel="Filtrer par étape" options={Array.from(new Set(candidates.map(c => c.routineStep || '').filter(Boolean))).map(step => ({ value: step, label: step }))} /></th>
                <th className="px-3 py-2"><ColumnFilterText placeholder="2-9 €" value={candidateFilterState.purchase} onChange={value => setCandidateFilter('purchase', value)} ariaLabel="Filtrer par prix d’achat" /></th>
                <th className="px-3 py-2"><ColumnFilterText placeholder="10-30 €" value={candidateFilterState.public} onChange={value => setCandidateFilter('public', value)} ariaLabel="Filtrer par prix public" /></th>
                <th className="px-3 py-2"><ColumnFilterText placeholder="50-" value={candidateFilterState.margin} onChange={value => setCandidateFilter('margin', value)} ariaLabel="Filtrer par marge" /></th>
                <th className="px-3 py-2"><ColumnFilterText placeholder="30-" value={candidateFilterState.qty} onChange={value => setCandidateFilter('qty', value)} ariaLabel="Filtrer par quantité" /></th>
                <th className="px-3 py-2"><ColumnFilterSelect value={candidateFilterState.inci} onChange={value => setCandidateFilter('inci', value)} ariaLabel="Filtrer par INCI" options={[{ value: 'oui', label: 'Reçue' }, { value: 'non', label: 'Manquante' }]} /></th>
                <th className="px-3 py-2"><ColumnFilterSelect value={candidateFilterState.visuals} onChange={value => setCandidateFilter('visuals', value)} ariaLabel="Filtrer par visuels" options={[{ value: 'oui', label: 'Reçus' }, { value: 'non', label: 'Manquants' }]} /></th>
                <th className="px-3 py-2"><ColumnFilterSelect value={candidateFilterState.gov} onChange={value => setCandidateFilter('gov', value)} ariaLabel="Filtrer par gouvernance" options={Object.entries(GOV_LABELS).map(([value, meta]) => ({ value, label: meta.label }))} /></th>
              </tr>
            </thead>
            <tbody>
              {visibleCandidates.map((c) => {
                const gov = GOV_LABELS[c.governanceStatus] || GOV_LABELS.blocked;
                return (
                  <tr key={c.id} className="border-t border-kurla-cream/5 align-top">
                    <td className="px-3 py-2 text-kurla-cream min-w-[180px]">{c.product}</td>
                    <td className="px-3 py-2 text-kurla-cream/70 whitespace-nowrap">{c.brand}</td>
                    <td className="px-3 py-2 text-kurla-cream/60 whitespace-nowrap">{c.routineStep || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input type="number" min="0" step="0.01" value={c.purchasePriceCents === null ? '' : c.purchasePriceCents / 100}
                        onChange={(e) => patchCandidate(c.id, { purchasePriceCents: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })}
                        placeholder="—" className={inputClass() + ' w-20'} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input type="number" min="0" step="0.01" value={c.publicPriceCents === null ? '' : c.publicPriceCents / 100}
                        onChange={(e) => patchCandidate(c.id, { publicPriceCents: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })}
                        placeholder="—" className={inputClass() + ' w-20'} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input type="number" min="0" max="100" step="0.5" value={c.marginPct ?? ''}
                        onChange={(e) => patchCandidate(c.id, { marginPct: e.target.value === '' ? null : Number(e.target.value) })}
                        placeholder="—" className={inputClass() + ' w-16'} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input type="number" min="0" value={c.firstOrderQty ?? ''}
                        onChange={(e) => patchCandidate(c.id, { firstOrderQty: e.target.value === '' ? null : Number(e.target.value) })}
                        placeholder="—" className={inputClass() + ' w-16'} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={c.inciReceived} onChange={(e) => patchCandidate(c.id, { inciReceived: e.target.checked })} className="accent-kurla-copper" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={c.visualsReceived} onChange={(e) => patchCandidate(c.id, { visualsReceived: e.target.checked })} className="accent-kurla-copper" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <select value={c.governanceStatus} onChange={(e) => patchCandidate(c.id, { governanceStatus: e.target.value })} className={inputClass() + ' min-w-[120px]'}>
                        {GOV_ORDER.map((g) => <option key={g} value={g}>{GOV_LABELS[g].label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-kurla-cream/50 border-t border-kurla-cream/10">
            <span><span className="font-bold text-kurla-cream">{visibleCandidates.length}</span>/{candidates.length} candidat{candidates.length > 1 ? 's' : ''}</span>
            {visibleCandidates.length !== candidates.length && (
              <button type="button" onClick={() => setCandidateFilterState(emptyFilterState(CANDIDATE_FILTER_KEYS.map(key => ({ key })) as ColumnFilter[]))} className="underline hover:text-kurla-cream">Réinitialiser les filtres</button>
            )}
            {visibleCandidates.length === 0 && candidates.length > 0 && <span className="text-kurla-cream/45">Aucun candidat ne correspond à ces filtres.</span>}
          </div>
        </div>
      )}

      {!loading && tab === 'candidates' && (
        <p className="text-[10px] text-kurla-cream/50 flex items-center gap-1.5">
          <Save className="w-3 h-3" /> Les modifications s'enregistrent automatiquement. Une référence ne passe « Publié » qu'avec INCI reçu, visuels et les 7 validations de gouvernance catalogue.
        </p>
      )}
    </div>
  );
};
