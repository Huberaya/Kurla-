import React, { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * CHANTIER 8.6c1 — programme experts/créateurs (features 39 et 40).
 *
 * Page publique et indexable : les règles de visibilité et de rémunération sont
 * chargées depuis `/api/creators/program`, donc ce qui est affiché est ce qui
 * est appliqué. Aucun créateur ne doit avoir à croire une page pour savoir
 * comment il est classé ni comment il est payé.
 */

interface ProgramRules {
  kinds: Record<string, string>;
  statuses: Record<string, string>;
  visibility: {
    weights: { contributions: number; endorsements: number; outcomeReports: number };
    caps: { contributions: number; endorsements: number; outcomeReports: number };
    contradictionPenaltyPerUnit: number;
    minContributionsToRank: number;
    purchasableInputs: string[];
  };
  payout: {
    rateCentsPerOutcome: number;
    minOutcomesForPayout: number;
    negativeShareReviewThreshold: number;
    attributionValues: Record<string, number>;
  };
  disclaimers: string[];
}

interface CreatorEntry {
  id: string;
  displayName: string;
  kind: string;
  specialty: string;
  biography: string;
  visibilityScore: number;
  contributions: number;
  endorsements: number;
  outcomeReports: number;
}

const EVENT_LABELS: Record<string, string> = {
  click: 'Un clic',
  add_to_shelf: 'Un ajout à l’étagère',
  purchase: 'Un achat',
  outcome_declared: 'Un résultat déclaré par un membre'
};

const initialForm = {
  displayName: '',
  kind: 'creator',
  specialty: '',
  biography: '',
  portfolioUrl: ''
};

export const CreatorsPage: React.FC = () => {
  const { session } = useAuth();
  const [rules, setRules] = useState<ProgramRules | null>(null);
  const [creators, setCreators] = useState<CreatorEntry[]>([]);
  const [directoryNote, setDirectoryNote] = useState<string | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState<{ status: string; statusLabel: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [programResponse, directoryResponse] = await Promise.all([
        fetch('/api/creators/program'),
        fetch('/api/creators')
      ]);
      const program = await programResponse.json().catch(() => ({}));
      const directory = await directoryResponse.json().catch(() => ({}));
      if (!programResponse.ok) throw new Error(program?.error || 'Les règles du programme n’ont pas pu être chargées.');
      setRules(program as ProgramRules);
      setCreators(Array.isArray(directory?.creators) ? directory.creators : []);
      setDirectoryNote(typeof directory?.note === 'string' ? directory.note : undefined);
    } catch (error: any) {
      setLoadError(error?.message || 'Le programme n’a pas pu être chargé.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/creators/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'La candidature n’a pas pu être enregistrée.');
      setSubmitted({ status: data?.application?.status ?? 'applied', statusLabel: data?.application?.statusLabel ?? 'Candidature déposée' });
    } catch (error: any) {
      setSubmitError(error?.message || 'La candidature n’a pas pu être enregistrée.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center max-w-[560px] mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Programme experts et créateurs
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-3">
            La visibilité ne s’achète pas.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Les experts et les créateurs sont classés par contributions vérifiées, et payés sur les résultats
            réellement déclarés par les membres — jamais sur des clics, jamais sur un budget.
          </p>
        </div>

        {loadError && (
          <div className="mb-8 rounded-xl border border-[#C8753D]/40 bg-[#C8753D]/10 p-4 text-sm text-[#FFF7EF]/80">
            {loadError}
          </div>
        )}

        {/* --- Ce qui compte pour la visibilité ---------------------------- */}
        <section className="mb-10 rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <BadgeCheck className="h-5 w-5 text-[#C8753D]" />
            Ce qui fait la visibilité
          </h2>
          {rules ? (
            <>
              <ul className="space-y-3 text-sm text-[#FFF7EF]/75">
                <li className="flex items-baseline justify-between gap-4">
                  <span>Contributions vérifiées (contenus publiés, réponses d’expert)</span>
                  <span className="shrink-0 font-semibold">
                    {rules.visibility.weights.contributions} pts · plafond {rules.visibility.caps.contributions}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-4">
                  <span>Appuis de professionnels vérifiés</span>
                  <span className="shrink-0 font-semibold">
                    {rules.visibility.weights.endorsements} pts · plafond {rules.visibility.caps.endorsements}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-4">
                  <span>Résultats déclarés par les membres</span>
                  <span className="shrink-0 font-semibold">
                    {rules.visibility.weights.outcomeReports} pts · plafond {rules.visibility.caps.outcomeReports}
                  </span>
                </li>
                <li className="flex items-baseline justify-between gap-4">
                  <span>Contradictions argumentées reçues</span>
                  <span className="shrink-0 font-semibold text-[#C8753D]">
                    −{rules.visibility.contradictionPenaltyPerUnit} pts chacune
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-[#FFF7EF]/55">
                Moins de {rules.visibility.minContributionsToRank} contributions vérifiées : le profil n’est pas
                classé. Il n’y a aucun emplacement à acheter — la liste des entrées payantes est vide.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#FFF7EF]/60">Chargement des règles…</p>
          )}
        </section>

        {/* --- Ce qui est payé --------------------------------------------- */}
        <section className="mb-10 rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Sparkles className="h-5 w-5 text-[#C8753D]" />
            Ce qui est rémunéré
          </h2>
          {rules ? (
            <>
              <ul className="space-y-2 text-sm text-[#FFF7EF]/75">
                {Object.entries(rules.payout.attributionValues).map(([event, value]) => (
                  <li key={event} className="flex items-baseline justify-between gap-4">
                    <span>{EVENT_LABELS[event] ?? event}</span>
                    <span className={value > 0 ? 'shrink-0 font-semibold text-emerald-300' : 'shrink-0 font-semibold text-[#FFF7EF]/45'}>
                      {value > 0 ? `${(rules.payout.rateCentsPerOutcome / 100).toFixed(2).replace('.', ',')} €` : '0 €'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[#FFF7EF]/55">
                Le versement commence à {rules.payout.minOutcomesForPayout} résultats déclarés. Le taux est le même
                pour un résultat positif et pour un résultat négatif : rapporter une déception rapporte autant que
                rapporter une réussite. Au-delà de {Math.round(rules.payout.negativeShareReviewThreshold * 100)} % de
                résultats négatifs, le versement passe en revue — il n’est pas réduit.
              </p>
            </>
          ) : (
            <p className="text-sm text-[#FFF7EF]/60">Chargement des règles…</p>
          )}
        </section>

        {/* --- Annuaire ---------------------------------------------------- */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Créateurs publiés</h2>
          {creators.length === 0 ? (
            <p className="rounded-xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-4 text-sm text-[#FFF7EF]/65">
              {directoryNote || 'Aucun créateur vérifié et publié pour le moment.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {creators.map(creator => (
                <li key={creator.id} className="rounded-xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-semibold">{creator.displayName}</span>
                    <span className="text-xs text-[#FFF7EF]/50">
                      {creator.contributions} contributions · {creator.endorsements} appuis · {creator.outcomeReports} résultats
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[#C8753D]">{creator.specialty}</p>
                  <p className="mt-2 text-sm text-[#FFF7EF]/70">{creator.biography}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --- Candidature ------------------------------------------------- */}
        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <ShieldCheck className="h-5 w-5 text-[#C8753D]" />
            Déposer une candidature
          </h2>
          <p className="mb-5 text-sm text-[#FFF7EF]/65">
            Rien n’est publié avant vérification de l’identité et de la compétence déclarée.
          </p>

          {submitted ? (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              {submitted.statusLabel}. KURLA examine la candidature ; aucune visibilité n’est accordée avant
              vérification.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-[#FFF7EF]/70">Nom affiché</span>
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={form.displayName}
                    onChange={event => setForm({ ...form, displayName: event.target.value })}
                    className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[#FFF7EF]/70">Type de profil</span>
                  <select
                    value={form.kind}
                    onChange={event => setForm({ ...form, kind: event.target.value })}
                    className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                  >
                    {Object.entries(rules?.kinds ?? { creator: 'Créateur de contenu', expert: 'Expert' }).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-[#FFF7EF]/70">Domaine d’expertise</span>
                <input
                  required
                  value={form.specialty}
                  onChange={event => setForm({ ...form, specialty: event.target.value })}
                  placeholder="Cheveux texturés, cuir chevelu sensible, coloration sur peau mélaninée…"
                  className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[#FFF7EF]/70">Votre pratique (40 caractères minimum)</span>
                <textarea
                  required
                  minLength={40}
                  rows={4}
                  value={form.biography}
                  onChange={event => setForm({ ...form, biography: event.target.value })}
                  className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[#FFF7EF]/70">Lien de portfolio (facultatif)</span>
                <input
                  type="url"
                  value={form.portfolioUrl}
                  onChange={event => setForm({ ...form, portfolioUrl: event.target.value })}
                  placeholder="https://"
                  className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                />
              </label>

              {submitError && <p className="text-sm text-[#C8753D]">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#C8753D] px-4 py-3 text-sm font-semibold text-[#050403] transition hover:bg-[#D98A50] disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Déposer la candidature'}
              </button>
              {!session && (
                <p className="text-xs text-[#FFF7EF]/50">
                  Un compte KURLA est nécessaire : la candidature est rattachée à un compte vérifiable.
                </p>
              )}
            </form>
          )}
        </section>

        {/* --- Réserves ---------------------------------------------------- */}
        {rules && (
          <section className="mt-10 rounded-2xl border border-[#FFF7EF]/10 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#FFF7EF]/60 mb-3">
              <Info className="h-4 w-4" />
              À savoir
            </h2>
            <ul className="space-y-2 text-xs text-[#FFF7EF]/55">
              {rules.disclaimers.map(disclaimer => (
                <li key={dispatcherKey(disclaimer)}>{`• ${disclaimer}`}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

/** Les réserves sont des constantes : leur texte sert d’identifiant stable. */
function dispatcherKey(disclaimer: string): string {
  return disclaimer.slice(0, 32);
}
