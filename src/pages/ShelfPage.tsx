import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, Package, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ABANDONMENT_LABELS,
  ABANDONMENT_REASONS,
  AbandonmentReason,
  ROUTINE_STEP_LABELS,
  ROUTINE_STEPS,
  RoutineStep,
  ShelfItem
} from '../lib/shelf';
import { OUTCOME_SIGNAL_LABELS, OUTCOME_SIGNALS, OutcomeSignal } from '../lib/outcomeEvidence';
import {
  addShelfItem,
  deleteShelfItem,
  getShelf,
  getShelfVerdict,
  recordOutcome,
  ShelfVerdictResponse,
  updateShelfItem
} from '../services/intelligenceService';

const STATUS_LABELS: Record<ShelfItem['status'], string> = {
  owned: 'Non ouvert',
  in_use: 'En cours',
  paused: 'En pause',
  finished: 'Terminé',
  abandoned: 'Abandonné'
};

const HAIR_STEPS: RoutineStep[] = ['cleanse', 'condition', 'deep_condition', 'leave_in', 'seal_oil', 'styling_definer', 'scalp_treatment', 'protein_treatment'];
const SKIN_STEPS: RoutineStep[] = ['skin_cleanser', 'skin_treatment', 'skin_moisturizer', 'skin_spf'];

const labelClass = 'block text-[10px] uppercase tracking-wider font-bold text-[#111111]/50 mb-1.5';
const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-4 py-2.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50';

/**
 * KURLA SHELF — l'écran de l'inventaire réel.
 *
 * Ce n'est pas une liste de courses. C'est l'outil qui permet à KURLA de dire
 * « tu n'as rien à acheter ». Trois règles d'interface en découlent :
 *  - l'abandon exige un motif, car le motif est la seule donnée exploitable ;
 *  - le surplus est affiché, pas masqué : voir qu'on a trois leave-in ouverts
 *    est une information utile ;
 *  - le verdict d'achat est mis en avant même quand il dit « non ».
 */
export const ShelfPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [items, setItems] = useState<ShelfItem[]>([]);
  const [verdict, setVerdict] = useState<ShelfVerdictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Formulaire d'ajout
  const [freeLabel, setFreeLabel] = useState('');
  const [routineStep, setRoutineStep] = useState<RoutineStep>('leave_in');
  const [status, setStatus] = useState<ShelfItem['status']>('in_use');
  const [remaining, setRemaining] = useState<string>('');
  const [abandonmentReason, setAbandonmentReason] = useState<AbandonmentReason | ''>('');
  const [abandonmentNote, setAbandonmentNote] = useState('');

  // Observation de résultat
  const [outcomeTarget, setOutcomeTarget] = useState<ShelfItem | null>(null);
  const [outcomeSignal, setOutcomeSignal] = useState<OutcomeSignal>('more_hydration');
  const [outcomeDays, setOutcomeDays] = useState<string>('');
  const [shareOutcome, setShareOutcome] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Une session KURLA ID est nécessaire pour charger ton étagère.');
      return;
    }
    try {
      const [loadedItems, loadedVerdict] = await Promise.all([
        getShelf(token),
        getShelfVerdict(token, [...HAIR_STEPS, ...SKIN_STEPS])
      ]);
      setItems(loadedItems);
      setVerdict(loadedVerdict);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger ton étagère.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<RoutineStep, ShelfItem[]>();
    for (const item of items) {
      const step = (ROUTINE_STEPS as string[]).includes(item.routineStep || '')
        ? item.routineStep as RoutineStep
        : 'other';
      const list = map.get(step) || [];
      list.push(item);
      map.set(step, list);
    }
    return map;
  }, [items]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await addShelfItem(token, {
        freeLabel: freeLabel.trim(),
        routineStep,
        status,
        estimatedRemainingPercent: remaining === '' ? undefined : Number(remaining),
        // Le motif est obligatoire pour un abandon : c'est la seule partie
        // exploitable. Le formulaire le bloque avant l'envoi.
        abandonmentReason: status === 'abandoned' ? abandonmentReason || undefined : undefined,
        abandonmentNote: status === 'abandoned' ? abandonmentNote.trim() || undefined : undefined
      });
      setFreeLabel('');
      setRemaining('');
      setAbandonmentReason('');
      setAbandonmentNote('');
      setNotice('Produit ajouté à ton étagère.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajout impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (item: ShelfItem, nextStatus: ShelfItem['status'], reason?: AbandonmentReason) => {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await updateShelfItem(token, item.id, {
        freeLabel: item.freeLabel,
        productId: item.productId,
        routineStep: item.routineStep,
        status: nextStatus,
        abandonmentReason: nextStatus === 'abandoned' ? reason : undefined
      });
      setNotice(nextStatus === 'abandoned' ? 'Abandon enregistré. Merci : ce motif améliore les prochaines recommandations.' : 'Statut mis à jour.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item: ShelfItem) => {
    if (!token) return;
    setBusy(true);
    try {
      await deleteShelfItem(token, item.id);
      setNotice('Article retiré de ton étagère.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  };

  const handleOutcome = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !outcomeTarget) return;
    setBusy(true);
    setError('');
    try {
      await recordOutcome(token, {
        signal: outcomeSignal,
        shelfItemId: outcomeTarget.id,
        productId: outcomeTarget.productId,
        // Sans ingrédient résolu, l'observation ne contribue à aucun agrégat :
        // c'est explicite, pas silencieux.
        observedAfterDays: outcomeDays === '' ? undefined : Number(outcomeDays),
        isConsentShared: shareOutcome
      });
      setNotice('Merci. Ce retour fait progresser tes recommandations.');
      setOutcomeTarget(null);
      setOutcomeDays('');
      setShareOutcome(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-24 bg-[#FFFDF9] min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C8753D]" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-[#FFFDF9] text-[#111111] min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[#C8753D] mb-2">KURLA Shelf</p>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-bold mb-3">Ton étagère réelle.</h1>
          <p className="text-sm text-[#111111]/70 max-w-2xl leading-relaxed">
            Ce que tu possèdes vraiment n'est pas ce que tu as acheté. En renseignant ton étagère, KURLA peut te dire
            ce qu'il te manque réellement — y compris quand la réponse est « rien ».
          </p>
        </header>

        {error && <div className="mb-6 flex items-start gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {notice && <div className="mb-6 flex items-start gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900"><Check className="w-4 h-4 shrink-0 mt-0.5" />{notice}</div>}

        {/* Verdict d'achat — affiché en premier, même quand il dit « non ». */}
        {verdict && (
          <section className={`mb-8 p-6 rounded-3xl border ${verdict.needsPurchase ? 'bg-[#C8753D]/5 border-[#C8753D]/25' : 'bg-emerald-50/60 border-emerald-200'}`}>
            <div className="flex items-start gap-3">
              <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${verdict.needsPurchase ? 'text-[#C8753D]' : 'text-emerald-600'}`} />
              <div>
                <h2 className="font-bold text-sm mb-1">{verdict.needsPurchase ? 'Ce qu’il te manque' : 'Tu n’as rien à acheter'}</h2>
                <p className="text-sm text-[#111111]/75 leading-relaxed">{verdict.message}</p>
              </div>
            </div>

            {verdict.gaps.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {verdict.gaps.map(gap => (
                  <li key={gap.routineStep} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${gap.critical ? 'bg-[#C8753D]' : 'bg-[#111111]/25'}`} />
                    <span className={gap.critical ? 'text-[#111111]/80' : 'text-[#111111]/50'}>
                      {gap.label}{gap.critical ? '' : ' — optionnel'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {verdict.surplus.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#111111]/10">
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#111111]/50 mb-2">En trop sur ton étagère</p>
                <ul className="space-y-1">
                  {verdict.surplus.map(item => (
                    <li key={item.routineStep} className="text-xs text-[#111111]/65">{item.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Ajout */}
        <section className="mb-8 p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
          <h2 className="font-bold text-sm mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#C8753D]" /> Ajouter un produit</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <span className={labelClass}>Nom du produit</span>
              <input value={freeLabel} onChange={event => setFreeLabel(event.target.value)} placeholder="Ex. Leave-in hydratant karité" className={inputClass} required maxLength={200} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className={labelClass}>Étape</span>
                <select value={routineStep} onChange={event => setRoutineStep(event.target.value as RoutineStep)} className={inputClass}>
                  <optgroup label="Cheveux">
                    {HAIR_STEPS.map(step => <option key={step} value={step}>{ROUTINE_STEP_LABELS[step]}</option>)}
                  </optgroup>
                  <optgroup label="Peau">
                    {SKIN_STEPS.map(step => <option key={step} value={step}>{ROUTINE_STEP_LABELS[step]}</option>)}
                  </optgroup>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <span className={labelClass}>État</span>
                <select value={status} onChange={event => setStatus(event.target.value as ShelfItem['status'])} className={inputClass}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <span className={labelClass}>Restant (%)</span>
                <input type="number" min={0} max={100} value={remaining} onChange={event => setRemaining(event.target.value)} placeholder="facultatif" className={inputClass} />
              </div>
            </div>

            {/* Le motif d'abandon est obligatoire : sans lui, l'information est perdue. */}
            {status === 'abandoned' && (
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA]">
                <span className={labelClass}>Pourquoi ce produit ne t’a pas convenu ?</span>
                <select value={abandonmentReason} onChange={event => setAbandonmentReason(event.target.value as AbandonmentReason)} className={inputClass} required>
                  <option value="">Choisir un motif (obligatoire)</option>
                  {ABANDONMENT_REASONS.map(reason => <option key={reason} value={reason}>{ABANDONMENT_LABELS[reason]}</option>)}
                </select>
                <textarea value={abandonmentNote} onChange={event => setAbandonmentNote(event.target.value)} placeholder="Précision facultative" rows={2} className={`${inputClass} mt-3`} maxLength={500} />
              </div>
            )}

            <button type="submit" disabled={busy || !freeLabel.trim() || (status === 'abandoned' && !abandonmentReason)} className={primaryButton}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Package className="w-3.5 h-3.5" />} Ajouter
            </button>
          </form>
        </section>

        {/* Inventaire groupé par étape */}
        <section>
          <h2 className="font-bold text-sm mb-4">Ton inventaire ({items.length})</h2>
          {items.length === 0 ? (
            <p className="text-sm text-[#111111]/55 p-6 rounded-2xl bg-[#F8F2EC] border border-[#E8E1DA]">
              Ton étagère est vide. Ajoute les produits que tu utilises actuellement : c'est ce qui permet à KURLA
              de ne pas te recommander ce que tu as déjà.
            </p>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([step, stepItems]) => (
                <div key={step}>
                  <h3 className="text-[10px] uppercase tracking-wider font-bold text-[#111111]/50 mb-2">{ROUTINE_STEP_LABELS[step]}</h3>
                  <div className="space-y-2">
                    {stepItems.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8E1DA] flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{item.freeLabel || item.productId}</p>
                          <p className="text-[11px] text-[#111111]/55">
                            {STATUS_LABELS[item.status]}
                            {item.estimatedRemainingPercent !== null && item.estimatedRemainingPercent !== undefined && ` · ${item.estimatedRemainingPercent} % restant`}
                            {item.abandonmentReason && ` · ${ABANDONMENT_LABELS[item.abandonmentReason]}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={item.status}
                            onChange={event => {
                              const next = event.target.value as ShelfItem['status'];
                              if (next === 'abandoned') {
                                setNotice('Pour enregistrer un abandon, sélectionne le motif dans la liste ci-dessous.');
                                return;
                              }
                              handleStatusChange(item, next);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#F8F2EC] border border-[#E8E1DA] text-[11px]"
                          >
                            {Object.entries(STATUS_LABELS).filter(([value]) => value !== 'abandoned').map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setOutcomeTarget(item)} className="px-2.5 py-1.5 rounded-lg bg-[#C8753D]/10 text-[#8b4b24] text-[11px] font-semibold">
                            Donner mon retour
                          </button>
                          <button type="button" onClick={() => handleDelete(item)} aria-label="Retirer" className="p-1.5 rounded-lg text-[#111111]/40 hover:text-rose-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Motifs d'abandon agrégés */}
        {verdict && verdict.abandonmentPatterns.length > 0 && (
          <section className="mt-8 p-6 rounded-3xl bg-[#F8F2EC] border border-[#E8E1DA]">
            <h2 className="font-bold text-sm mb-3">Ce qui ne te convient pas, en général</h2>
            <ul className="space-y-1.5">
              {verdict.abandonmentPatterns.map(pattern => (
                <li key={pattern.reason} className="flex items-center justify-between text-xs">
                  <span className="text-[#111111]/70">{pattern.label}</span>
                  <span className="font-semibold text-[#C8753D]">{pattern.count}× · {Math.round(pattern.share * 100)} %</span>
                </li>
              ))}
            </ul>
            {verdict.avoidedIngredients.length > 0 && (
              <p className="mt-4 pt-4 border-t border-[#111111]/10 text-[11px] text-[#111111]/60">
                {verdict.avoidedIngredients.length} ingrédient(s) seront écartés de tes prochaines recommandations,
                d'après au moins deux abandons motivés.
              </p>
            )}
          </section>
        )}
      </div>

      {/* Modale d'observation — la boucle d'apprentissage */}
      {outcomeTarget && (
        <div className="fixed inset-0 z-50 bg-[#111111]/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#FFFDF9] rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-sm">Ton retour sur {outcomeTarget.freeLabel || outcomeTarget.productId}</h2>
                <p className="text-[11px] text-[#111111]/55 mt-1">C'est ce retour qui modifie tes prochaines recommandations.</p>
              </div>
              <button type="button" onClick={() => setOutcomeTarget(null)} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-[#F8F2EC]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleOutcome} className="space-y-4">
              <div>
                <span className={labelClass}>Qu’as-tu constaté ?</span>
                <select value={outcomeSignal} onChange={event => setOutcomeSignal(event.target.value as OutcomeSignal)} className={inputClass}>
                  {OUTCOME_SIGNALS.map(signal => <option key={signal} value={signal}>{OUTCOME_SIGNAL_LABELS[signal]}</option>)}
                </select>
              </div>
              <div>
                <span className={labelClass}>Après combien de jours ?</span>
                <input type="number" min={0} value={outcomeDays} onChange={event => setOutcomeDays(event.target.value)} placeholder="facultatif" className={inputClass} />
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8F2EC] border border-[#E8E1DA] cursor-pointer">
                <input type="checkbox" checked={shareOutcome} onChange={event => setShareOutcome(event.target.checked)} className="mt-0.5" />
                <span className="text-[11px] text-[#111111]/70 leading-relaxed">
                  Contribuer à la recherche KURLA (agrégats anonymes uniquement).
                  Sans cette case, ton retour n'améliore que <strong>tes</strong> recommandations.
                  Une observation partagée ne conserve aucune note libre.
                </span>
              </label>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
