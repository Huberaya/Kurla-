import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Clock,
  Loader2,
  MessageSquareQuote,
  Package,
  ShoppingCart,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  buildRoutinePlan,
  BuiltRoutineResponse,
  fetchMyEndorsements,
  MyEndorsementEntry,
  RoutineConflict
} from '../services/intelligenceService';
import { ENDORSEMENT_STANCE_LABELS, EndorsementStance } from '../lib/proEndorsement';

const cardClass = 'bg-white border border-[#E8E1DA] rounded-2xl p-5';
const labelClass = 'block text-[10px] uppercase tracking-wider font-bold text-[#111111]/50 mb-1.5';
const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-5 py-3 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50';

const SEVERITY_STYLES: Record<RoutineConflict['severity'], { label: string; className: string }> = {
  avoid: { label: 'À éviter ensemble', className: 'bg-red-50 border-red-200 text-red-900' },
  caution: { label: 'Prudence', className: 'bg-amber-50 border-amber-200 text-amber-900' },
  space_out: { label: 'À espacer', className: 'bg-sky-50 border-sky-200 text-sky-900' }
};

/**
 * ROUTINE BUILDER — l'écran qui relie le conseil au panier.
 *
 * Trois partis pris :
 *  - une étape déjà couverte par l'étagère n'est pas proposée à l'achat ;
 *  - une étape non pourvue est déclarée, jamais remplie avec un produit approximatif ;
 *  - les conflits détectés dans le panier sont affichés avant la validation.
 */
export const RoutineBuilderPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [goal, setGoal] = useState('');
  const [budgetLimit, setBudgetLimit] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('15');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [routine, setRoutine] = useState<BuiltRoutineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const build = useCallback(async () => {
    if (!token) {
      setError('Connexion requise pour construire une routine.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsedBudget = Number(budgetLimit);
      const parsedMinutes = Number(minutes);
      const response = await buildRoutinePlan(token, {
        goal: goal.trim() || undefined,
        budgetLimit: Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : undefined,
        availableMinutesPerDay: Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : undefined,
        experienceLevel
      });
      setRoutine(response.routine);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La routine n’a pas pu être construite.');
      setRoutine(null);
    } finally {
      setLoading(false);
    }
  }, [token, goal, budgetLimit, minutes, experienceLevel]);

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#C8753D]" />
            <h1 className="text-2xl font-bold">Construire ma routine</h1>
          </div>
          <p className="text-sm text-[#111111]/60 max-w-2xl">
            KURLA tient compte de ce que vous possédez déjà. Une étape couverte par votre
            étagère ne vous sera pas revendue.
          </p>
        </div>

        <div className={cardClass}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Objectif</label>
              <input
                className={inputClass}
                value={goal}
                onChange={event => setGoal(event.target.value)}
                placeholder="Retrouver de la définition sans alourdir"
              />
            </div>
            <div>
              <label className={labelClass}>Budget total (€)</label>
              <input
                className={inputClass}
                type="number"
                min="0"
                value={budgetLimit}
                onChange={event => setBudgetLimit(event.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div>
              <label className={labelClass}>Minutes disponibles par jour</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                value={minutes}
                onChange={event => setMinutes(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Niveau</label>
              <select className={inputClass} value={experienceLevel} onChange={event => setExperienceLevel(event.target.value)}>
                <option value="beginner">Débutant — aller à l&apos;essentiel</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé — routine complète</option>
              </select>
            </div>
          </div>
          <button className={`${primaryButton} mt-5`} onClick={() => void build()} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Construire
          </button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {routine && (
          <div className="mt-8 space-y-5">
            {/* Conflits affichés AVANT le panier : c'est l'information qui doit
                faire renoncer, pas celle qu'on découvre après l'achat. */}
            {routine.conflicts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#111111]/50">
                  Conflits détectés dans cette routine
                </h2>
                {routine.conflicts.map((conflict, index) => <ConflictCard key={index} conflict={conflict} />)}
              </div>
            )}

            <div className={cardClass}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
                <h2 className="text-lg font-bold">{routine.slots.length} étapes</h2>
                <div className="text-sm">
                  <span className="font-bold">{routine.totalPrice.toFixed(2)} €</span>
                  <span className="text-[#111111]/50"> · {routine.totalItems} article{routine.totalItems > 1 ? 's' : ''} à acheter</span>
                </div>
              </div>

              {routine.overBudget && (
                <Notice tone="amber" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                  Le budget indiqué est dépassé. KURLA n&apos;a pas ajouté d&apos;article pour le respecter.
                </Notice>
              )}
              {routine.overTime && (
                <Notice tone="amber" icon={<Clock className="w-3.5 h-3.5" />}>
                  Cette routine dépasse le temps quotidien déclaré.
                </Notice>
              )}
              {routine.alreadyCovered.length > 0 && (
                <Notice tone="emerald" icon={<Check className="w-3.5 h-3.5" />}>
                  {routine.alreadyCovered.length} étape{routine.alreadyCovered.length > 1 ? 's' : ''} déjà couverte{routine.alreadyCovered.length > 1 ? 's' : ''} par votre étagère — aucun achat nécessaire.
                </Notice>
              )}

              <div className="space-y-3 mt-4">
                {routine.slots.map(slot => (
                  <div key={slot.routineStep} className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">{slot.label}</h3>
                        <p className="text-xs text-[#111111]/60 mt-1">{slot.reason}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-[#111111]/50">{slot.durationMinutes} min</div>
                        {slot.optional && <div className="text-[10px] text-[#111111]/40">Optionnel</div>}
                      </div>
                    </div>

                    {slot.alreadyOwned && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-800">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        Déjà possédé : {slot.alreadyOwned.freeLabel || slot.alreadyOwned.productId}
                      </div>
                    )}

                    {slot.recommendation && (
                      <div className="mt-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{slot.recommendation.product.name}</div>
                          {slot.recommendation.baseReasons.slice(0, 2).map((reason, index) => (
                            <div key={index} className="text-xs text-[#111111]/55">{reason}</div>
                          ))}
                          {slot.recommendation.usageCost?.monthlyCost !== null && slot.recommendation.usageCost?.monthlyCost !== undefined && (
                            <div className="text-[11px] text-[#C8753D] mt-0.5">
                              ≈ {slot.recommendation.usageCost.monthlyCost.toFixed(2)} €/mois
                              {slot.recommendation.usageCost.monthsOfUse ? ` · ${slot.recommendation.usageCost.monthsOfUse} mois d’usage` : ''}
                            </div>
                          )}
                        </div>
                        <div className="font-bold text-sm shrink-0">{slot.recommendation.product.price.toFixed(2)} €</div>
                      </div>
                    )}

                    {!slot.recommendation && !slot.alreadyOwned && (
                      <div className="mt-2.5 flex items-start gap-1.5 text-xs text-[#111111]/55">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Aucun produit assez vérifiable pour cette étape. KURLA ne remplit pas un trou avec un produit approximatif.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {routine.unfulfilled.length > 0 && (
              <div className={cardClass}>
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#111111]/50 mb-3">
                  Étapes non pourvues
                </h2>
                <div className="space-y-2">
                  {routine.unfulfilled.map(item => (
                    <div key={item.routineStep} className="flex items-start gap-2 text-sm">
                      <X className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#111111]/40" />
                      <span>
                        <span className="font-medium">{item.label}</span>
                        <span className="text-[#111111]/60"> — {item.reason}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {routine.notes.length > 0 && (
              <div className={cardClass}>
                <h2 className="text-xs uppercase tracking-wider font-bold text-[#111111]/50 mb-3">À savoir</h2>
                <ul className="space-y-1.5">
                  {routine.notes.map((note, index) => (
                    <li key={index} className="text-sm text-[#111111]/70">{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {routine.cartItems.length > 0 && (
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="w-4 h-4 text-[#C8753D]" />
                  <h2 className="text-lg font-bold">Panier proposé</h2>
                </div>
                <div className="space-y-2">
                  {routine.cartItems.map(item => (
                    <div key={item.productId} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.name} × {item.quantity}</span>
                      <span className="font-medium shrink-0 ml-3">{(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E8E1DA]">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{routine.totalPrice.toFixed(2)} €</span>
                </div>
                <a
                  href="/checkout"
                  className="mt-4 w-full px-5 py-3 rounded-xl bg-[#111111] hover:bg-black text-white text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Passer au paiement
                </a>
              </div>
            )}
          </div>
        )}

        <EndorsementPanel token={token} />
      </div>
    </div>
  );
};

const STANCE_STYLES: Record<EndorsementStance, string> = {
  approved: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  amended: 'bg-amber-50 border-amber-200 text-amber-900',
  contradicted: 'bg-red-50 border-red-200 text-red-900'
};

/**
 * CO-SIGNATURE PROFESSIONNELLE — ce qu'un humain a dit de ma routine.
 *
 * Le sens du pont compte : ce n'est pas l'IA qui oriente vers un professionnel,
 * c'est le professionnel qui valide, ajuste ou contredit ce que l'IA a proposé.
 *
 * Deux règles d'affichage qui ne sont pas cosmétiques :
 *  - une co-signature non affichable (pro non vérifié, ou consentement absent)
 *    n'est pas montrée, et la raison est dite ;
 *  - une contradiction est mise en avant, pas noyée. C'est le signal le plus
 *    utile de tout le système : il corrige le moteur.
 */
const EndorsementPanel: React.FC<{ token?: string }> = ({ token }) => {
  const [entries, setEntries] = useState<MyEndorsementEntry[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    fetchMyEndorsements(token)
      .then(response => {
        if (!active) return;
        setEntries(response.endorsements);
        setNote(response.note || null);
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Co-signatures indisponibles.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (!token) return null;
  if (loading) {
    return (
      <div className={`${cardClass} flex items-center gap-2 text-sm text-[#666666]`}>
        <Loader2 className="w-4 h-4 animate-spin text-[#C8753D]" /> Chargement des co-signatures…
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${cardClass} flex items-start gap-2 text-sm text-[#666666]`}>
        <AlertTriangle className="w-4 h-4 text-[#C8753D] shrink-0 mt-0.5" /> {error}
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareQuote className="w-4 h-4 text-[#C8753D]" />
        <h2 className="text-lg font-bold">Avis d’un professionnel sur ma routine</h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[#666666] leading-relaxed">
          {note || 'Aucun professionnel n’a encore revu votre routine.'}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(({ endorsement, gate, action }) => (
            <div
              key={endorsement.id}
              className={`rounded-xl border p-4 ${STANCE_STYLES[endorsement.stance]}`}
            >
              <div className="flex items-center gap-2 text-xs font-bold mb-2">
                <BadgeCheck className="w-3.5 h-3.5" />
                {ENDORSEMENT_STANCE_LABELS[endorsement.stance]} · {endorsement.professionalName}
                {endorsement.professionalSpecialty ? ` · ${endorsement.professionalSpecialty}` : ''}
              </div>

              <p className="text-sm leading-relaxed">{endorsement.rationale}</p>

              {endorsement.amendments.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {endorsement.amendments.map((amendment, index) => (
                    <li key={index} className="text-xs leading-relaxed">
                      <span className="font-semibold">{amendment.target}</span> : {amendment.original}
                      {' → '}
                      <span className="font-semibold">{amendment.replacement}</span>
                      {amendment.reason ? ` — ${amendment.reason}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              {gate.allowed ? (
                <>
                  {action.applyOverride && (
                    <p className="text-xs mt-3 pt-3 border-t border-current/20 leading-relaxed font-medium">
                      {action.message}
                    </p>
                  )}
                  {gate.disclaimer && (
                    <p className="text-[11px] mt-2 opacity-75 leading-relaxed">{gate.disclaimer}</p>
                  )}
                </>
              ) : (
                <p className="text-[11px] mt-3 pt-3 border-t border-current/20 opacity-80 leading-relaxed">
                  Non affichable publiquement : {gate.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ConflictCard: React.FC<{ conflict: RoutineConflict }> = ({ conflict }) => {
  const style = SEVERITY_STYLES[conflict.severity];
  return (
    <div className={`p-4 rounded-2xl border ${style.className}`}>
      <div className="flex items-center gap-2 text-xs font-bold mb-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        {style.label} · {conflict.ingredientA} × {conflict.ingredientB}
      </div>
      <p className="text-sm">{conflict.explanation}</p>
      <p className="text-xs opacity-70 mt-1.5">Niveau de preuve : {conflict.evidenceLevel}</p>
    </div>
  );
};

const Notice: React.FC<{ tone: 'amber' | 'emerald'; icon: React.ReactNode; children: React.ReactNode }> = ({ tone, icon, children }) => (
  <div className={`flex items-start gap-2 p-3 rounded-xl text-xs mb-2 ${tone === 'amber' ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'}`}>
    <span className="mt-0.5 shrink-0">{icon}</span>
    <span>{children}</span>
  </div>
);

export default RoutineBuilderPage;
