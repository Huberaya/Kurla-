import React, { useCallback, useEffect, useState } from 'react';
import { Info, Lock, ShieldCheck, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * CHANTIER 8.6c2 — espace marque : tests produits ciblés (feature 41).
 *
 * Page publique et indexable. Les règles affichées sont chargées depuis
 * `/api/brand-tests/program` : ce qu'une marque lit ici est ce que le serveur
 * applique, y compris la liste des clés de ciblage refusées.
 */

interface BrandProgram {
  statuses: Record<string, string>;
  cohort: {
    allowedKeys: string[];
    refusedKeys: string[];
    needCodes: string[];
    rule: string;
  };
  publication: { kThreshold: number; rule: string };
  neverProvided: string[];
  caveats: string[];
}

const initialForm = {
  brandName: '',
  contactEmail: '',
  productName: '',
  hypothesis: '',
  needs: [] as string[],
  targetParticipants: 60,
  durationDays: 45
};

const NEED_LABELS: Record<string, string> = {
  hydrater_cheveux: 'Hydrater les longueurs',
  reduire_casse: 'Réduire la casse',
  definir_boucles: 'Définir les boucles',
  cuir_chevelu: 'Cuir chevelu',
  entretenir_tresses: 'Entretenir les tresses',
  entretenir_locks: 'Entretenir les locks',
  entretenir_perruque: 'Entretenir une perruque',
  proteger_nuit: 'Protéger la nuit',
  protection_solaire: 'Protection solaire',
  taches_hyperpigmentation: 'Taches et hyperpigmentation',
  imperfections_acne: 'Imperfections',
  peau_sensible: 'Peau sensible',
  hydrater_peau: 'Hydrater la peau'
};

export const BrandSpacePage: React.FC = () => {
  const { session } = useAuth();
  const [program, setProgram] = useState<BrandProgram | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState<{ status: string; statusLabel: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/brand-tests/program');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Les règles de l’espace marque n’ont pas pu être chargées.');
      setProgram(data as BrandProgram);
    } catch (error: any) {
      setLoadError(error?.message || 'Les règles de l’espace marque n’ont pas pu être chargées.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleNeed = (need: string) => {
    setForm(current => ({
      ...current,
      needs: current.needs.includes(need) ? current.needs.filter(item => item !== need) : [...current.needs, need]
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch('/api/brand-tests/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ ...form, cohort: { needs: form.needs } })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'La demande n’a pas pu être enregistrée.');
      setSubmitted({ status: data?.request?.status ?? 'submitted', statusLabel: data?.request?.statusLabel ?? 'Demande déposée' });
    } catch (error: any) {
      setSubmitError(error?.message || 'La demande n’a pas pu être enregistrée.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center max-w-[560px] mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Espace marque
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-3">
            Testez sur les bons besoins. Jamais sur des personnes.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Une marque propose un produit, KURLA recrute les membres qui déclarent le besoin concerné, les membres
            déclarent ce qu’ils constatent. La marque reçoit des effectifs — jamais des profils.
          </p>
        </div>

        {loadError && (
          <div className="mb-8 rounded-xl border border-[#C8753D]/40 bg-[#C8753D]/10 p-4 text-sm text-[#FFF7EF]/80">
            {loadError}
          </div>
        )}

        {/* --- Ce qu'on peut cibler ---------------------------------------- */}
        <section className="mb-10 rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Target className="h-5 w-5 text-[#C8753D]" />
            Ce que vous pouvez cibler
          </h2>
          <p className="mb-4 text-sm text-[#FFF7EF]/70">{program?.cohort.rule ?? 'Chargement…'}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(program?.cohort.needCodes ?? Object.keys(NEED_LABELS)).map(need => (
              <span key={need} className="rounded-lg border border-[#FFF7EF]/10 px-3 py-2 text-xs text-[#FFF7EF]/70">
                {NEED_LABELS[need] ?? need}
              </span>
            ))}
          </div>
        </section>

        {/* --- Ce qu'on n'obtient jamais ----------------------------------- */}
        <section className="mb-10 rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Lock className="h-5 w-5 text-[#C8753D]" />
            Ce que vous n’obtiendrez jamais
          </h2>
          <ul className="space-y-2 text-sm text-[#FFF7EF]/75">
            {(program?.neverProvided ?? []).map(item => (
              <li key={item}>{`• ${item}`}</li>
            ))}
          </ul>
          {program && (
            <p className="mt-4 text-xs text-[#FFF7EF]/55">
              {program.publication.rule} Seuil k = {program.publication.kThreshold}. Clés de ciblage refusées :{' '}
              {program.cohort.refusedKeys.join(', ')}.
            </p>
          )}
        </section>

        {/* --- Demande ----------------------------------------------------- */}
        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#FFF7EF]/[0.03] p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
            <ShieldCheck className="h-5 w-5 text-[#C8753D]" />
            Déposer une demande de test
          </h2>
          <p className="mb-5 text-sm text-[#FFF7EF]/65">
            Le recrutement n’est ouvert qu’après acceptation par KURLA.
          </p>

          {submitted ? (
            <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              {submitted.statusLabel}. KURLA examine la demande ; aucun recrutement n’est ouvert avant acceptation.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-[#FFF7EF]/70">Marque</span>
                  <input
                    required
                    value={form.brandName}
                    onChange={event => setForm({ ...form, brandName: event.target.value })}
                    className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[#FFF7EF]/70">E-mail de contact</span>
                  <input
                    required
                    type="email"
                    value={form.contactEmail}
                    onChange={event => setForm({ ...form, contactEmail: event.target.value })}
                    className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-[#FFF7EF]/70">Produit testé</span>
                <input
                  required
                  value={form.productName}
                  onChange={event => setForm({ ...form, productName: event.target.value })}
                  className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[#FFF7EF]/70">Hypothèse — la question à laquelle le test répond</span>
                <textarea
                  required
                  minLength={20}
                  rows={3}
                  value={form.hypothesis}
                  onChange={event => setForm({ ...form, hypothesis: event.target.value })}
                  className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                />
              </label>

              <fieldset className="text-sm">
                <legend className="mb-2 text-[#FFF7EF]/70">Besoins ciblés (cohorte)</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(NEED_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 rounded-lg border border-[#FFF7EF]/10 px-3 py-2 text-xs">
                      <input
                        type="checkbox"
                        checked={form.needs.includes(value)}
                        onChange={() => toggleNeed(value)}
                        className="accent-[#C8753D]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-[#FFF7EF]/70">
                    Participants visés (minimum {program?.publication.kThreshold ?? 30})
                  </span>
                  <input
                    required
                    type="number"
                    min={program?.publication.kThreshold ?? 30}
                    value={form.targetParticipants}
                    onChange={event => setForm({ ...form, targetParticipants: Number(event.target.value) })}
                    className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[#FFF7EF]/70">Durée (jours)</span>
                  <input
                    required
                    type="number"
                    min={7}
                    max={180}
                    value={form.durationDays}
                    onChange={event => setForm({ ...form, durationDays: Number(event.target.value) })}
                    className="w-full rounded-lg border border-[#FFF7EF]/15 bg-[#050403] px-3 py-2 text-sm outline-none focus:border-[#C8753D]"
                  />
                </label>
              </div>

              {submitError && <p className="text-sm text-[#C8753D]">{submitError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#C8753D] px-4 py-3 text-sm font-semibold text-[#050403] transition hover:bg-[#D98A50] disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Déposer la demande'}
              </button>
              {!session && (
                <p className="text-xs text-[#FFF7EF]/50">
                  Un compte KURLA portant le rôle marque est nécessaire : c’est ce compte qui recevra le rapport.
                </p>
              )}
            </form>
          )}
        </section>

        {/* --- Réserves ---------------------------------------------------- */}
        {program && (
          <section className="mt-10 rounded-2xl border border-[#FFF7EF]/10 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#FFF7EF]/60 mb-3">
              <Info className="h-4 w-4" />
              À savoir
            </h2>
            <ul className="space-y-2 text-xs text-[#FFF7EF]/55">
              {program.caveats.map(caveat => (
                <li key={caveat.slice(0, 32)}>{`• ${caveat}`}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
