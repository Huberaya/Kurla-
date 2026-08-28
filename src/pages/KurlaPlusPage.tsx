import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, Check, Clock, Info, Sparkles, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import type { MembershipOverview } from '../lib/db/membershipStore';

/**
 * CHANTIER 8.5 — ABONNEMENT KURLA+.
 *
 * L'écran de vente est écrit contre lui-même : il dit ce que l'abonnement ne
 * changerait pas, il refuse de proposer KURLA+ sur un dossier vide, il nomme les
 * droits annoncés mais pas encore branchés, et il annonce l'absence de paiement
 * plutôt que de simuler un encaissement.
 */

function formatCents(cents: number | null): string {
  if (cents === null) return '—';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

const STATUS_LABEL: Record<string, string> = {
  none: 'Aucun abonnement',
  trialing: 'Essai en cours',
  active: 'KURLA+ actif',
  expired: 'Abonnement échu',
  canceled: 'Abonnement résilié'
};

export const KurlaPlusPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [overview, setOverview] = useState<MembershipOverview | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/membership/me', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'L’état de l’abonnement n’a pas pu être chargé.');
      setOverview(data as MembershipOverview);
    } catch (err: any) {
      setError(err?.message || 'L’état de l’abonnement n’a pas pu être chargé.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const call = async (path: string, body: Record<string, unknown>, okMessage: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'L’opération n’a pas abouti.');
      setNotice(data?.note || okMessage);
      await load();
    } catch (err: any) {
      setError(err?.message || 'L’opération n’a pas abouti.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-[#FFF7EF]/70">Connectez-vous pour voir l’état de votre abonnement.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-[#FFF7EF]/60">Chargement…</p>
        </div>
      </div>
    );
  }

  const state = overview?.state;
  const plan = state?.effectivePlan ?? 'libre';
  const isPlus = plan === 'kurla_plus';
  const plus = overview?.pricing.find(entry => entry.planCode === 'kurla_plus');
  const price = plus ? (billing === 'annual' ? plus.annual : plus.monthly) : null;
  const canTrial = !isPlus && !state?.trialUsed;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C8753D]">Abonnement</p>
          <h1 className="text-3xl sm:text-4xl font-semibold">KURLA+</h1>
          <p className="text-[#FFF7EF]/70 max-w-2xl">
            KURLA+ n’enlève rien : c’est l’analyse approfondie de ce que vous avez déjà déclaré. Tout ce qui
            est essentiel reste gratuit.
          </p>
        </header>

        {error && (
          <p className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}
        {notice && (
          <p className="flex items-start gap-2 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 mt-0.5 shrink-0" /> {notice}
          </p>
        )}

        {/* État courant */}
        <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C8753D]" />
            <h2 className="text-lg font-medium">{STATUS_LABEL[state?.status ?? 'none']}</h2>
          </div>
          <p className="text-sm text-[#FFF7EF]/70">
            Droits appliqués : <strong className="text-[#FFF7EF]">{isPlus ? 'KURLA+' : 'KURLA Libre'}</strong>
            {state?.accessUntil ? ` — jusqu’au ${new Date(state.accessUntil).toLocaleDateString('fr-FR')}` : ''}
            {state?.cancelAtPeriodEnd ? ' (résiliation enregistrée, l’accès reste dû jusqu’à cette date)' : ''}
          </p>
          {overview?.persistence === 'server_fallback' && (
            <p className="text-xs text-[#FFF7EF]/50">
              Données du serveur de développement : non synchronisées avec votre compte.
            </p>
          )}
          {isPlus && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void call('/api/membership/cancel', { atPeriodEnd: true }, 'Résiliation enregistrée.')}
              className="text-sm underline text-[#FFF7EF]/60 hover:text-[#FFF7EF] disabled:opacity-50"
            >
              Résilier à la fin de la période
            </button>
          )}
        </section>

        {/* Ce que vaut le dossier */}
        {overview && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-4">
            <h2 className="text-lg font-medium">Ce que vaut votre dossier</h2>
            <p className="text-sm text-[#FFF7EF]/70">
              Score de dossier : <strong className="text-[#FFF7EF]">{overview.offer.dossierScore}/100</strong>.
              {overview.offer.shouldPropose
                ? ' Il y a assez de déclarations pour qu’une analyse approfondie ait du sens.'
                : ' KURLA+ ne vous est pas proposé : il n’y aurait rien à approfondir pour l’instant.'}
            </p>
            {overview.offer.reasons.length > 0 && (
              <ul className="text-sm text-[#FFF7EF]/70 space-y-1">
                {overview.offer.reasons.map(reason => (
                  <li key={reason} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />{reason}</li>
                ))}
              </ul>
            )}
            {overview.offer.blockers.length > 0 && (
              <ul className="text-sm text-[#FFF7EF]/60 space-y-1">
                {overview.offer.blockers.map(blocker => (
                  <li key={blocker} className="flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 shrink-0" />{blocker}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Offre */}
        {overview && (
          <section className="rounded-2xl border border-[#C8753D]/30 bg-[#0B0806] p-5 space-y-5">
            <div className="space-y-3">
              <h2 className="text-lg font-medium">Ce que KURLA+ changerait pour vous</h2>
              <ul className="text-sm text-[#FFF7EF]/80 space-y-1">
                {overview.offer.whatItWouldChange.map(item => (
                  <li key={item} className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 text-[#C8753D] shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3 border-t border-[#FFF7EF]/10 pt-4">
              <h3 className="text-base font-medium text-[#FFF7EF]/90">Ce qu’il ne changerait pas</h3>
              <ul className="text-sm text-[#FFF7EF]/60 space-y-1">
                {overview.offer.whatItWouldNotChange.map(item => (
                  <li key={item} className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Prix */}
        {plus && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium mr-auto">Formules</h2>
              {(['monthly', 'annual'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBilling(option)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${billing === option ? 'border-[#C8753D] text-[#C8753D]' : 'border-[#FFF7EF]/15 text-[#FFF7EF]/60'}`}
                >
                  {option === 'annual' ? 'Annuel' : 'Mensuel'}
                </button>
              ))}
            </div>

            <p className="text-sm text-[#FFF7EF]/80">
              <strong className="text-[#FFF7EF]">{formatCents(price?.netCents ?? null)}</strong>
              {billing === 'annual' ? ' par an' : ' par mois'} hors taxe
              {price?.vatRatePercent !== null && price?.vatRatePercent !== undefined
                ? ` — TVA ${price.vatRatePercent} % incluse : ${formatCents(price.grossCents ?? null)} TTC`
                : ' — TVA non calculée : pays non desservi'}
            </p>
            {billing === 'annual' && (
              <p className="text-xs text-[#FFF7EF]/50">
                Soit {formatCents(price?.monthlyEquivalentCents ?? null)} par mois — deux mois offerts par rapport au mensuel.
              </p>
            )}

            {!overview?.paymentConfigured && (
              <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                Le paiement n’est pas actif sur cet environnement. KURLA ne simule pas un encaissement : seul
                l’essai sans moyen de paiement est ouvert.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy || !canTrial}
                onClick={() => void call('/api/membership/trial', { planCode: 'kurla_plus' }, 'Essai de 14 jours ouvert.')}
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#C8753D] text-[#050403] disabled:opacity-40"
              >
                {state?.trialUsed ? 'Essai déjà utilisé' : 'Essayer 14 jours, sans carte'}
              </button>
              <button
                type="button"
                disabled={busy || isPlus || !overview?.paymentConfigured}
                onClick={() => void call('/api/membership/checkout', { planCode: 'kurla_plus', billing }, 'Redirection vers le paiement…')}
                className="px-4 py-2 rounded-full text-sm font-medium border border-[#FFF7EF]/20 text-[#FFF7EF]/80 disabled:opacity-40"
              >
                S’abonner
              </button>
            </div>
          </section>
        )}

        {/* Droits */}
        {overview && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-4">
            <h2 className="text-lg font-medium">Droits détaillés</h2>
            <ul className="space-y-3">
              {overview.entitlements.map(item => (
                <li key={item.code} className="flex items-start gap-3 text-sm">
                  {item.included
                    ? <BadgeCheck className="w-4 h-4 mt-0.5 text-emerald-300 shrink-0" />
                    : <X className="w-4 h-4 mt-0.5 text-[#FFF7EF]/30 shrink-0" />}
                  <div className="space-y-1">
                    <p className="text-[#FFF7EF]/90">
                      {item.label}
                      {item.essential && <span className="ml-2 text-xs text-[#FFF7EF]/50">essentiel — toujours gratuit</span>}
                      {item.included && !item.applied && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-200">
                          <Clock className="w-3 h-3" /> annoncé, pas encore branché
                        </span>
                      )}
                    </p>
                    <p className="text-[#FFF7EF]/60">{item.description}</p>
                    {item.included && !item.applied && item.pendingReason && (
                      <p className="text-xs text-[#FFF7EF]/40">{item.pendingReason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {overview && (
          <section className="rounded-2xl border border-[#FFF7EF]/10 bg-[#0B0806] p-5 space-y-2">
            <h2 className="text-base font-medium">À savoir</h2>
            <ul className="text-xs text-[#FFF7EF]/55 space-y-1">
              {overview.disclaimers.map(item => <li key={item}>• {item}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default KurlaPlusPage;
