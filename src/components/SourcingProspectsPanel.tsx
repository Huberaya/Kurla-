import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, Mail, Package, RefreshCw, Save, Truck } from 'lucide-react';
import { AssortmentPlanPanel } from './AssortmentPlanPanel';
import { PurchasingDeskPanel } from './PurchasingDeskPanel';

type PanelProps = { headers: HeadersInit; onSuccess?: (message: string) => void };

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
  to_contact: { label: 'À contacter', color: 'text-[#FFF7EF]/70 border-[#FFF7EF]/20 bg-[#FFF7EF]/5' },
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
  return 'w-full px-2.5 py-1.5 rounded-lg bg-[#050403] border border-[#FFF7EF]/15 text-[#FFF7EF] text-[11px] focus:outline-none focus:border-[#C8753D]';
}
function badge(cls: { label: string; color: string }): string {
  return `px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${cls.color}`;
}

export const SourcingProspectsPanel: React.FC<PanelProps> = ({ headers, onSuccess }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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
          <h3 className="text-lg font-serif-title font-bold text-[#FFF7EF] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#C8753D]" /> Approvisionnement
          </h3>
          <p className="text-[11px] text-[#FFF7EF]/60 mt-1">
            Du besoin produit au fournisseur à contacter. Route hybride : A = revente de marques existantes · B = façonnage KURLA. Les tarifs, MOQ et contacts restent vides tant qu'aucune réponse réelle ne les donne.
          </p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl bg-[#1A0F0A] border border-[#C8753D]/30 text-[#FFF7EF] text-[11px] flex items-center gap-2 hover:bg-[#C8753D]/10">
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
          <div key={label as string} className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/8 p-3 text-center">
            <div className="text-xl font-bold text-[#C8753D]">{value as number}</div>
            <div className="text-[10px] text-[#FFF7EF]/60 mt-0.5">{label}</div>
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
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'desk' ? 'bg-[#C8753D] text-white' : 'bg-[#1A0F0A] text-[#FFF7EF]/70 border border-[#FFF7EF]/10'}`}>
          <ClipboardList className="w-4 h-4" /> Bureau des achats
        </button>
        <button onClick={() => setTab('plan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'plan' ? 'bg-[#C8753D] text-white' : 'bg-[#1A0F0A] text-[#FFF7EF]/70 border border-[#FFF7EF]/10'}`}>
          <Package className="w-4 h-4" /> Plan d'assortiment
        </button>
        <button onClick={() => setTab('prospects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'prospects' ? 'bg-[#C8753D] text-white' : 'bg-[#1A0F0A] text-[#FFF7EF]/70 border border-[#FFF7EF]/10'}`}>
          <Mail className="w-4 h-4" /> Contacts ({prospects.length})
        </button>
        <button onClick={() => setTab('candidates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${tab === 'candidates' ? 'bg-[#C8753D] text-white' : 'bg-[#1A0F0A] text-[#FFF7EF]/70 border border-[#FFF7EF]/10'}`}>
          <Package className="w-4 h-4" /> Références à intégrer ({candidates.length})
        </button>
      </div>

      {loading && <p className="text-xs text-[#FFF7EF]/60">Chargement…</p>}

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
              <details key={p.id} className="rounded-2xl bg-[#1A0F0A] border border-[#FFF7EF]/10 overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 flex-wrap hover:bg-[#FFF7EF]/[0.03]">
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${p.route === 'A' ? 'bg-sky-500/15 text-sky-300' : 'bg-purple-500/15 text-purple-300'}`}>{p.route}</span>
                  <span className="text-xs font-semibold text-[#FFF7EF] flex-1 min-w-[160px] text-left">{p.name}</span>
                  <span className="text-[10px] text-[#FFF7EF]/50">{TYPE_LABELS[p.contactType] || p.contactType}</span>
                  <span className={badge(st)}>{st.label}</span>
                  {savingId === p.id && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C8753D]" />}
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-3">
                  <p className="text-[11px] text-[#FFF7EF]/60">{p.specialty} {p.sourceUrl && <span className="text-[#C8753D]/80">· {p.sourceUrl}</span>}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="text-[10px] text-[#FFF7EF]/50">Statut
                      <select value={p.status} onChange={(e) => patchProspect(p.id, { status: e.target.value })} className={inputClass() + ' mt-1'}>
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                      </select>
                    </label>
                    <label className="text-[10px] text-[#FFF7EF]/50">Relance prévue le
                      <input type="date" value={p.followUpOn?.slice(0, 10) || ''} onChange={(e) => patchProspect(p.id, { followUpOn: e.target.value })} className={inputClass() + ' mt-1'} />
                    </label>
                    <label className="text-[10px] text-[#FFF7EF]/50">Email contact
                      <input type="email" placeholder="contact@marque.com" value={p.contactEmail || ''} onChange={(e) => patchProspect(p.id, { contactEmail: e.target.value })} className={inputClass() + ' mt-1'} />
                    </label>
                    <label className="text-[10px] text-[#FFF7EF]/50">Décision
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
                      <label key={field} className="text-[10px] text-[#FFF7EF]/50">{label}
                        <select value={(p as any)[field] || 'pending'} onChange={(e) => patchProspect(p.id, { [field]: e.target.value } as any)} className={inputClass() + ' mt-1'}>
                          {TRI.map((t) => <option key={t} value={t}>{TRI_LABEL[t]}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label className="block text-[10px] text-[#FFF7EF]/50">Notes
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
        <div className="overflow-x-auto rounded-2xl border border-[#FFF7EF]/10">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#1A0F0A] text-[#FFF7EF]/60">
              <tr>
                {['Produit', 'Marque', 'Étape', 'Achat', 'Public', 'Marge %', 'Qté', 'INCI', 'Visuels', 'Gouvernance'].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const gov = GOV_LABELS[c.governanceStatus] || GOV_LABELS.blocked;
                return (
                  <tr key={c.id} className="border-t border-[#FFF7EF]/5 align-top">
                    <td className="px-3 py-2 text-[#FFF7EF] min-w-[180px]">{c.product}</td>
                    <td className="px-3 py-2 text-[#FFF7EF]/70 whitespace-nowrap">{c.brand}</td>
                    <td className="px-3 py-2 text-[#FFF7EF]/60 whitespace-nowrap">{c.routineStep || '—'}</td>
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
                      <input type="checkbox" checked={c.inciReceived} onChange={(e) => patchCandidate(c.id, { inciReceived: e.target.checked })} className="accent-[#C8753D]" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={c.visualsReceived} onChange={(e) => patchCandidate(c.id, { visualsReceived: e.target.checked })} className="accent-[#C8753D]" />
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
        </div>
      )}

      {!loading && tab === 'candidates' && (
        <p className="text-[10px] text-[#FFF7EF]/50 flex items-center gap-1.5">
          <Save className="w-3 h-3" /> Les modifications s'enregistrent automatiquement. Une référence ne passe « Publié » qu'avec INCI reçu, visuels et les 7 validations de gouvernance catalogue.
        </p>
      )}
    </div>
  );
};
