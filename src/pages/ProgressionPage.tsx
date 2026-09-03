import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { WhyItMatters } from '../components/account/WhyItMatters';
import { Award, BadgeCheck, Gift, ScanLine, Sparkles, TrendingUp } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  LoyaltyOverview,
  LoyaltyRulesPayload,
  getLoyaltyOverview,
  getLoyaltyRules,
  recordScan,
  requestReward
} from '../services/loyaltyService';

/**
 * CHANTIER 8.3 — KURLA PROGRESSION.
 *
 * L'écran assume son parti pris : il montre les cinq axes avec leurs plafonds,
 * y compris le plafond de l'axe achat. Un membre doit voir d'un coup d'œil que
 * scanner, tenir sa routine et donner un avis font progresser autant qu'acheter
 * — et que les récompenses se débloquent par niveau, jamais contre des points.
 */
export const ProgressionPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [rules, setRules] = useState<LoyaltyRulesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rulesPayload, overviewPayload] = await Promise.all([
        getLoyaltyRules(),
        token ? getLoyaltyOverview(token) : Promise.resolve(null)
      ]);
      setRules(rulesPayload);
      setOverview(overviewPayload);
    } catch (err: any) {
      setError(err?.message || 'La progression n’a pas pu être chargée.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const purchaseAxis = useMemo(
    () => (overview?.axes ?? []).find(axis => axis.axis === 'achat'),
    [overview]
  );

  async function onScan(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !barcode.trim()) return;
    setPending('scan');
    setNotice(null);
    try {
      const result = await recordScan(token, { barcode: barcode.trim() });
      setNotice(
        result.duplicated
          ? 'Ce produit a déjà été scanné aujourd’hui : il ne rapporte qu’une fois.'
          : `Scan enregistré : +${result.awardedPoints} point${result.awardedPoints > 1 ? 's' : ''}.`
      );
      setBarcode('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Le scan n’a pas pu être enregistré.');
    } finally {
      setPending(null);
    }
  }

  async function onRequestReward(code: string, label: string) {
    if (!token) return;
    setPending(code);
    setNotice(null);
    try {
      await requestReward(token, code);
      setNotice(`« ${label} » demandée : l’équipe revient vers vous pour la mettre en place.`);
      await load();
    } catch (err: any) {
      setError(err?.message || 'La demande n’a pas pu être enregistrée.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="text-center max-w-[640px] mx-auto">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            KURLA Progression
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-3">
            Vous progressez en apprenant, pas seulement en achetant.
          </h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Cinq axes, chacun plafonné. L’achat est l’un d’eux — et il est borné, pour qu’un membre
            qui ne commande jamais puisse atteindre le dernier niveau.
          </p>
        </header>

        <WhyItMatters featureId="progression" variant="banner" />

        {error && (
          <div className="p-4 rounded-2xl bg-[#C0392B]/15 border border-[#C0392B]/40 text-sm">{error}</div>
        )}
        {notice && (
          <div className="p-4 rounded-2xl bg-[#C8753D]/15 border border-[#C8753D]/40 text-sm">{notice}</div>
        )}

        {loading && !overview && (
          <div className="p-8 rounded-3xl bg-[#100C09] border border-[#241C16] text-sm text-[#FFF7EF]/60">
            Chargement de la progression…
          </div>
        )}

        {!token && !loading && (
          <div className="p-8 rounded-3xl bg-[#100C09] border border-[#241C16] text-sm text-[#FFF7EF]/70">
            Le barème ci-dessous est public. Connectez-vous pour voir votre niveau, vos axes et vos
            récompenses.
          </div>
        )}

        {overview && (
          <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#FFF7EF]/50">Niveau atteint</span>
                <h2 className="text-3xl font-serif-title font-bold mt-1">
                  {overview.currentLevel.label}
                </h2>
                <p className="text-sm text-[#FFF7EF]/60 mt-1">{overview.currentLevel.benefit}</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold text-[#C8753D]">{overview.account.progressionScore}</span>
                <span className="text-sm text-[#FFF7EF]/50"> / {overview.maxScore} points</span>
              </div>
            </div>

            {overview.nextLevel ? (
              <p className="text-sm text-[#FFF7EF]/70 mt-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#C8753D]" />
                Encore {overview.nextLevel.pointsMissing} point
                {overview.nextLevel.pointsMissing > 1 ? 's' : ''} pour « {overview.nextLevel.label} » —
                aucun achat n’est nécessaire.
              </p>
            ) : (
              <p className="text-sm text-[#FFF7EF]/70 mt-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#C8753D]" />
                Dernier niveau atteint.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {overview.axes.map(axis => (
                <div key={axis.axis} className="p-4 rounded-2xl bg-[#171109] border border-[#241C16]">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{axis.label}</h3>
                    <span className="text-xs text-[#FFF7EF]/50">
                      {axis.score}/{axis.maxPoints}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#241C16] mt-3 overflow-hidden">
                    <div
                      className="h-full bg-[#C8753D]"
                      style={{ width: `${Math.min(100, (axis.score / axis.maxPoints) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#FFF7EF]/50 mt-3 leading-relaxed">{axis.rationale}</p>
                </div>
              ))}
            </div>

            {purchaseAxis && (
              <p className="text-xs text-[#FFF7EF]/55 mt-5 leading-relaxed">
                L’axe achat est plafonné à {purchaseAxis.maxPoints} points sur {overview.maxScore} :
                au-delà de quatre commandes réglées, acheter ne rapporte plus rien. Sans aucun achat,
                {overview.maxScoreWithoutPurchase} points restent atteignables.
              </p>
            )}
          </section>
        )}

        {overview && (
          <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
            <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-[#C8753D]" /> Scanner fait progresser
            </h2>
            <p className="text-sm text-[#FFF7EF]/60 mt-2 leading-relaxed">
              Un code-barres, un ingrédient ou un produit : la curiosité est un comportement
              récompensé, plafonné à 15 points par jour pour rester honnête.
            </p>
            <form onSubmit={onScan} className="flex flex-col sm:flex-row gap-3 mt-4">
              <input
                value={barcode}
                onChange={event => setBarcode(event.target.value)}
                placeholder="Code-barres, ingrédient ou produit"
                className="flex-1 px-4 py-3 rounded-2xl bg-[#171109] border border-[#241C16] text-sm outline-none focus:border-[#C8753D]"
              />
              <button
                type="submit"
                disabled={pending === 'scan' || !barcode.trim()}
                className="px-5 py-3 rounded-2xl bg-[#C8753D] text-[#050403] text-sm font-bold disabled:opacity-50"
              >
                {pending === 'scan' ? 'Enregistrement…' : 'Enregistrer le scan'}
              </button>
            </form>
          </section>
        )}

        {(overview?.rewards ?? rules?.rewards ?? []).length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
            <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#C8753D]" /> Récompenses
            </h2>
            <p className="text-sm text-[#FFF7EF]/60 mt-2">
              Elles se débloquent par niveau. Aucune ne s’achète avec des points.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 mt-5">
              {(overview?.rewards ?? []).map(reward => (
                <article key={reward.code} className="p-5 rounded-2xl bg-[#171109] border border-[#241C16]">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{reward.label}</h3>
                    <span className="text-[10px] uppercase tracking-widest text-[#FFF7EF]/45">
                      Niveau {reward.levelRequired}
                    </span>
                  </div>
                  <p className="text-xs text-[#FFF7EF]/60 mt-2 leading-relaxed">{reward.description}</p>
                  {reward.unlocked ? (
                    <button
                      onClick={() => void onRequestReward(reward.code, reward.label)}
                      disabled={pending === reward.code}
                      className="mt-4 px-4 py-2 rounded-xl bg-[#C8753D] text-[#050403] text-xs font-bold disabled:opacity-50"
                    >
                      {pending === reward.code ? 'Envoi…' : 'Demander cette récompense'}
                    </button>
                  ) : (
                    <p className="mt-4 text-xs text-[#FFF7EF]/45">
                      Encore {reward.levelRequired - (overview?.account.level ?? 1)} niveau
                      {(reward.levelRequired - (overview?.account.level ?? 1)) > 1 ? 'x' : ''} à atteindre.
                    </p>
                  )}
                </article>
              ))}
              {!overview &&
                (rules?.rewards ?? []).map(reward => (
                  <article key={reward.code} className="p-5 rounded-2xl bg-[#171109] border border-[#241C16]">
                    <h3 className="text-sm font-bold">{reward.label}</h3>
                    <p className="text-xs text-[#FFF7EF]/60 mt-2 leading-relaxed">{reward.description}</p>
                    <span className="text-[10px] uppercase tracking-widest text-[#FFF7EF]/45">
                      Niveau {reward.levelRequired}
                    </span>
                  </article>
                ))}
            </div>
          </section>
        )}

        {overview && overview.badges.some(badge => badge.earned || true) && (
          <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
            <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-[#C8753D]" /> Badges
            </h2>
            <div className="flex flex-wrap gap-3 mt-5">
              {overview.badges.map(badge => (
                <span
                  key={badge.code}
                  title={badge.description}
                  className={`px-3 py-2 rounded-full text-xs font-semibold border ${
                    badge.earned
                      ? 'bg-[#C8753D]/15 border-[#C8753D]/50 text-[#C8753D]'
                      : 'bg-[#171109] border-[#241C16] text-[#FFF7EF]/35'
                  }`}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {overview && overview.recentEvents.length > 0 && (
          <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
            <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C8753D]" /> Faits récents
            </h2>
            <ul className="mt-4 divide-y divide-[#241C16]">
              {overview.recentEvents.slice(0, 12).map(event => (
                <li key={event.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#FFF7EF]/80">{event.label}</span>
                  <span className="text-xs text-[#FFF7EF]/50">
                    {event.points > 0 ? `+${event.points}` : 'plafond atteint'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
