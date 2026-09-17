/**
 * FICHE FOURNISSEUR FLOTTANTE — ouvrable de partout (17/09/2026).
 *
 * Constat qui ouvre le chantier : toutes les écritures fournisseur passaient
 * par un seul panneau (`SupplierAdminPanel`). Depuis le catalogue, on lisait
 * « Fournisseur non rattaché » sans aucun moyen d'aller compléter la fiche ;
 * depuis les lots ou une proposition d'achat, le nom du fournisseur n'était
 * qu'un texte.
 *
 * Cette fiche s'ouvre donc LÀ OÙ LE MANQUE APPARAÎT : depuis n'importe quel
 * panneau, sur n'importe quel nom de fournisseur. Elle lit et écrit par le
 * magasin partagé (`adminRecordsStore`) — après un enregistrement, tous les
 * panneaux abonnés rechargent, la modification apparaît partout sans
 * recharger la page.
 *
 * Trois règles :
 *
 *   · **rien n'est inventé** : un champ vide reste vide, les manques sont
 *     nommés avec leur raison (`recordCompleteness`), aucune valeur n'est
 *     proposée à la place de l'humain ;
 *   · **la raison sociale est en lecture seule** : le serveur refuse de la
 *     modifier parce que l'identifiant en dérive — l'afficher éditable aurait
 *     été une promesse que l'enregistrement ne peut pas tenir ;
 *   · **un échec s'affiche** : le serveur peut refuser (par exemple passer en
 *     « vérifié » sans document). Le message réel remonte, la valeur précédente
 *     revient.
 *
 * Aucune route inventée : lecture et écriture passent par des routes admin
 * existantes, via le magasin.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2, Save, X } from 'lucide-react';
import {
  isWritingAdminRecords,
  loadSupplier,
  readSupplier,
  subscribeAdminRecords,
  writeSupplier,
  getAdminRecordsSnapshot,
} from '../lib/adminRecordsStore';
import {
  SEVERITY_LABELS,
  SUPPLIER_TYPE_LABELS_FULL,
  VERIFICATION_STATUS_LABELS,
  missingSupplierFields,
} from '../lib/recordCompleteness';

/** Abonnement au magasin : la fiche se rafraîchit dès qu'une écriture passe. */
export function useAdminRecords() {
  return React.useSyncExternalStore(subscribeAdminRecords, getAdminRecordsSnapshot, getAdminRecordsSnapshot);
}

const FIELD_CLASS = 'w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream placeholder:text-kurla-cream/30 focus:outline-none focus:border-kurla-copper';

export const SupplierSheet: React.FC<{
  supplierId: string;
  headers: HeadersInit;
  onClose: () => void;
  /** Appelé après un enregistrement accepté : l'appelant recharge sa liste. */
  onSaved?: () => void;
  /** Nombre de produits réellement rattachés, si le panneau appelant le sait. */
  linkedProducts?: number;
  /** Documents enregistrés, si le panneau appelant les a lus. */
  documentCount?: number;
}> = ({ supplierId, headers, onClose, onSaved, linkedProducts, documentCount }) => {
  useAdminRecords();
  const supplier = readSupplier(supplierId);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    loadSupplier(supplierId, headers)
      .then(record => { if (!cancelled) setDraft(record ? { ...record } : {}); })
      .catch((e: any) => { if (!cancelled) setError(String(e?.message || 'Fiche indisponible.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const completeness = useMemo(() => missingSupplierFields(draft, { linkedProducts, documentCount }), [draft, linkedProducts, documentCount]);
  const busy = isWritingAdminRecords();

  const setField = useCallback((key: string, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setSaved('');
  }, []);

  /** N'envoie que les champs réellement modifiés — un PATCH qui renvoie toute
   *  la fiche écraserait une modification faite ailleurs entre-temps. */
  const changedPatch = useMemo(() => {
    const original = supplier || {};
    const editable = ['tradeName', 'supplierType', 'country', 'website', 'contactName', 'contactEmail', 'moqUnits', 'leadTimeDays', 'certifications', 'verificationStatus', 'notes'];
    const patch: Record<string, any> = {};
    for (const key of editable) {
      const next = draft[key];
      const before = original[key];
      const normalize = (value: any) => (typeof value === 'string' ? value.trim() : value === '' || value === undefined ? null : value);
      if (JSON.stringify(normalize(next)) !== JSON.stringify(normalize(before))) patch[key] = next === '' ? null : next;
    }
    return patch;
  }, [draft, supplier]);

  const save = async () => {
    setError('');
    setSaved('');
    const result = await writeSupplier(supplierId, changedPatch, headers);
    if (!result.ok) { setError(result.error || 'Enregistrement refusé.'); return; }
    setSaved('Fiche enregistrée — les autres écrans affichent la nouvelle valeur.');
    onSaved?.();
  };

  const missingByKey = useMemo(() => new Map(completeness.missing.map(field => [field.key, field])), [completeness]);
  const hint = (key: string) => missingByKey.get(key);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-label="Fiche fournisseur">
      <div className="w-full max-w-3xl rounded-3xl border border-kurla-cream/15 bg-kurla-espresso shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-kurla-cream/10">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Fiche fournisseur</p>
            <h2 className="font-bold text-kurla-cream truncate">{draft.tradeName || draft.legalName || supplierId}</h2>
            <p className="text-[11px] text-kurla-cream/45 mt-0.5">
              Raison sociale : <span className="text-kurla-cream/70">{draft.legalName || '—'}</span>
              <span className="text-kurla-cream/35"> · non modifiable (l’identifiant en dérive)</span>
            </p>
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

            {/* Manques nommés — pas un score, la liste */}
            <section className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink p-4 space-y-2">
              <h3 className="text-[11px] uppercase tracking-wider font-bold text-kurla-amber">
                Ce qui manque ({completeness.missing.length}) — {completeness.filled}/{completeness.total} champs renseignés
              </h3>
              {completeness.missing.length === 0
                ? <p className="text-[11px] text-emerald-300">Aucun manque : la fiche est complète.</p>
                : (
                  <ul className="space-y-1.5">
                    {completeness.missing.map(field => (
                      <li key={`${field.key}-${field.label}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${field.severity === 'bloquant' ? 'border-rose-300/30 bg-rose-500/10 text-rose-300' : field.severity === 'important' ? 'border-amber-300/30 bg-amber-500/10 text-amber-300' : 'border-kurla-cream/15 text-kurla-cream/55'}`}>
                          {SEVERITY_LABELS[field.severity]}
                        </span>
                        <span className="font-semibold text-kurla-cream">{field.label}</span>
                        <span className="text-kurla-cream/50">— {field.why}</span>
                      </li>
                    ))}
                  </ul>
                )}
              {typeof linkedProducts === 'number' && (
                <p className="text-[11px] text-kurla-cream/45 pt-1">{linkedProducts} produit{linkedProducts > 1 ? 's' : ''} rattaché{linkedProducts > 1 ? 's' : ''} à cette fiche.</p>
              )}
            </section>

            {/* Champs modifiables — exactement ceux que la route accepte */}
            <section className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Enseigne</span>
                <input className={FIELD_CLASS} value={draft.tradeName || ''} onChange={e => setField('tradeName', e.target.value)} placeholder="Nom d’usage" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Métier</span>
                <select className={FIELD_CLASS} value={draft.supplierType || ''} onChange={e => setField('supplierType', e.target.value)}>
                  <option value="">Non qualifié</option>
                  {Object.entries(SUPPLIER_TYPE_LABELS_FULL).filter(([value]) => value !== 'unknown').map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Pays {hint('country') && <span className="text-amber-300 normal-case">· {SEVERITY_LABELS[hint('country')!.severity].toLowerCase()}</span>}</span>
                <input className={FIELD_CLASS} value={draft.country || ''} onChange={e => setField('country', e.target.value)} placeholder="France, Roumanie…" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Site web</span>
                <input className={FIELD_CLASS} value={draft.website || ''} onChange={e => setField('website', e.target.value)} placeholder="https://" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Nom du contact {hint('contactName') && <span className="text-amber-300 normal-case">· {SEVERITY_LABELS[hint('contactName')!.severity].toLowerCase()}</span>}</span>
                <input className={FIELD_CLASS} value={draft.contactName || ''} onChange={e => setField('contactName', e.target.value)} placeholder="Interlocuteur" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">E-mail {hint('contactEmail') && <span className="text-rose-300 normal-case">· bloquant</span>}</span>
                <input className={FIELD_CLASS} value={draft.contactEmail || ''} onChange={e => setField('contactEmail', e.target.value)} placeholder="contact@fournisseur.eu" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">MOQ (unités) {hint('moqUnits') && <span className="text-rose-300 normal-case">· bloquant</span>}</span>
                <input className={FIELD_CLASS} type="number" min={0} value={draft.moqUnits ?? ''} onChange={e => setField('moqUnits', e.target.value === '' ? null : Number(e.target.value))} placeholder="0 accepté" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Délai (jours)</span>
                <input className={FIELD_CLASS} type="number" min={0} value={draft.leadTimeDays ?? ''} onChange={e => setField('leadTimeDays', e.target.value === '' ? null : Number(e.target.value))} placeholder="0 accepté" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Statut de vérification</span>
                <select className={FIELD_CLASS} value={draft.verificationStatus || 'not_provided'} onChange={e => setField('verificationStatus', e.target.value)}>
                  {Object.entries(VERIFICATION_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Certifications (une par ligne)</span>
                <textarea
                  className={FIELD_CLASS}
                  rows={2}
                  value={(draft.certifications || []).join('\n')}
                  onChange={e => setField('certifications', e.target.value.split('\n').map((line: string) => line.trim()).filter(Boolean))}
                  placeholder={'CPSR\nISO 22716'}
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-kurla-cream/45">Notes</span>
                <textarea className={FIELD_CLASS} rows={3} value={draft.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Ce qui est prouvé, ce qui reste à obtenir…" />
              </label>
            </section>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || Object.keys(changedPatch).length === 0}
                className="px-4 py-2 rounded-xl bg-kurla-copper text-white text-xs font-bold flex items-center gap-2 hover:bg-kurla-cocoa disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {Object.keys(changedPatch).length === 0 ? 'Aucune modification' : `Enregistrer ${Object.keys(changedPatch).length} champ${Object.keys(changedPatch).length > 1 ? 's' : ''}`}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-kurla-cream/15 text-xs text-kurla-cream/60 hover:text-kurla-cream">Fermer</button>
              {draft.website && (
                <a href={String(draft.website)} target="_blank" rel="noreferrer" className="text-[11px] text-kurla-amber underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Ouvrir le site
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
