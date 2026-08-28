import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Images, Info, Milestone, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import type { BeautyJourney } from '../lib/beautyJourney';

/**
 * CHANTIER 8.4 — Beauty Journey : l'évolution rendue lisible.
 *
 * L'écran ne promet rien : il montre ce que la personne a déclaré, avec la
 * réserve d'usage visible en permanence. Une tendance non calculable est affichée
 * comme telle plutôt que remplacée par une flèche rassurante.
 */
export const BeautyJourneyPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [journey, setJourney] = useState<BeautyJourney | null>(null);
  const [persistence, setPersistence] = useState<'supabase' | 'server_fallback'>('server_fallback');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/beauty-journey', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Le parcours n’a pas pu être chargé.');
      setJourney(data.journey);
      setPersistence(data.persistence);
    } catch (err: any) {
      setError(err?.message || 'Le parcours n’a pas pu être chargé.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const trendIcon = (trend: string) => {
    if (trend === 'hausse') return <TrendingUp className="w-4 h-4 text-[#C8753D]" />;
    if (trend === 'baisse') return <TrendingDown className="w-4 h-4 text-[#C8753D]" />;
    return <Info className="w-4 h-4 text-[#FFF7EF]/40" />;
  };

  const trendLabel = (trend: string) =>
    trend === 'hausse' ? 'déclaré en hausse' : trend === 'baisse' ? 'déclaré en baisse' : trend === 'stable' ? 'stable' : 'non déterminé';

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[#050403] text-[#FFF7EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="text-center max-w-[640px] mx-auto">
          <span className="text-xs uppercase tracking-widest text-[#C8753D] font-semibold block mb-2">
            Beauty Journey
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif-title font-bold mb-3">Ce que vous avez déclaré, remis dans l’ordre du temps.</h1>
          <p className="text-sm sm:text-base text-[#FFF7EF]/70 font-light leading-relaxed">
            Chronologie, jalons, comparaison de photos et évolution de vos scores. Rien n’est mesuré à
            votre place : tout vient de ce que vous avez renseigné.
          </p>
        </header>

        {error && <div className="p-4 rounded-2xl bg-[#C0392B]/15 border border-[#C0392B]/40 text-sm">{error}</div>}

        {!token && !loading && (
          <div className="p-8 rounded-3xl bg-[#100C09] border border-[#241C16] text-sm text-[#FFF7EF]/70">
            Connectez-vous pour voir votre parcours.
          </div>
        )}

        {loading && <div className="p-8 rounded-3xl bg-[#100C09] border border-[#241C16] text-sm text-[#FFF7EF]/60">Chargement du parcours…</div>}

        {journey && (
          <>
            <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
              <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C8753D]" /> Votre parcours, raconté
              </h2>
              <ul className="mt-4 space-y-3">
                {journey.narrative.map((sentence, index) => (
                  <li key={index} className="text-sm text-[#FFF7EF]/80 leading-relaxed">
                    {sentence}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-[#FFF7EF]/45 mt-5">
                {persistence === 'supabase' ? 'Synchronisé avec votre compte.' : 'Données du serveur de développement : non synchronisées.'}
              </p>
            </section>

            <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
              <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
                <Milestone className="w-5 h-5 text-[#C8753D]" /> Jalons
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 mt-5">
                {journey.milestones.map(milestone => (
                  <div
                    key={milestone.code}
                    className={`p-4 rounded-2xl border ${
                      milestone.reached ? 'bg-[#C8753D]/10 border-[#C8753D]/40' : 'bg-[#171109] border-[#241C16]'
                    }`}
                  >
                    <h3 className={`text-sm font-bold ${milestone.reached ? 'text-[#C8753D]' : 'text-[#FFF7EF]/45'}`}>{milestone.label}</h3>
                    <p className="text-xs text-[#FFF7EF]/60 mt-1 leading-relaxed">{milestone.description}</p>
                    {milestone.reachedAt && (
                      <p className="text-[11px] text-[#FFF7EF]/45 mt-2">
                        {new Date(milestone.reachedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
              <h2 className="text-xl font-serif-title font-bold">Évolution déclarée</h2>
              <div className="grid gap-4 sm:grid-cols-2 mt-5">
                {journey.evolution.map(metric => (
                  <div key={metric.metric} className="p-4 rounded-2xl bg-[#171109] border border-[#241C16]">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">{metric.label}</h3>
                      <span className="flex items-center gap-1.5 text-xs text-[#FFF7EF]/60">
                        {trendIcon(metric.trend)} {trendLabel(metric.trend)}
                      </span>
                    </div>
                    <p className="text-xs text-[#FFF7EF]/55 mt-2">
                      {metric.readable && metric.first && metric.last
                        ? `${metric.first.value}/10 → ${metric.last.value}/10 sur ${metric.points.length} mesures`
                        : metric.points.length
                          ? `${metric.points.length} mesure${metric.points.length > 1 ? 's' : ''} : trop peu pour une tendance`
                          : 'aucune mesure renseignée'}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
              <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
                <Images className="w-5 h-5 text-[#C8753D]" /> Comparaison visuelle
              </h2>
              {journey.comparison ? (
                <p className="text-sm text-[#FFF7EF]/70 mt-3 leading-relaxed">
                  Deux photos à {journey.comparison.daysApart} jours d’écart :{' '}
                  {new Date(journey.comparison.before.date).toLocaleDateString('fr-FR', { dateStyle: 'long' })} et{' '}
                  {new Date(journey.comparison.after.date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}. Elles
                  restent visibles par vous seul·e.
                </p>
              ) : (
                <p className="text-sm text-[#FFF7EF]/60 mt-3">
                  Pas encore de comparaison possible : il faut deux photos à au moins 14 jours d’écart.
                </p>
              )}
            </section>

            <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
              <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#C8753D]" /> Chronologie
              </h2>
              {journey.timeline.length === 0 ? (
                <p className="text-sm text-[#FFF7EF]/60 mt-3">Aucun fait enregistré.</p>
              ) : (
                <ul className="mt-4 divide-y divide-[#241C16]">
                  {journey.timeline.slice(0, 30).map((event, index) => (
                    <li key={`${event.date}-${index}`} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm">
                      <span className="text-[#FFF7EF]/80">{event.label}</span>
                      <span className="text-xs text-[#FFF7EF]/45">
                        {new Date(event.date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                        {event.detail ? ` · ${event.detail}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {journey.gaps.length > 0 && (
              <section className="p-6 sm:p-8 rounded-3xl bg-[#100C09] border border-[#241C16]">
                <h2 className="text-lg font-serif-title font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#C8753D]" /> Ce qui manque pour lire l’évolution
                </h2>
                <ul className="mt-3 space-y-2">
                  {journey.gaps.map((gap, index) => (
                    <li key={index} className="text-sm text-[#FFF7EF]/65">{gap}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className="p-5 rounded-3xl bg-[#171109] border border-[#241C16]">
              <ul className="space-y-2">
                {journey.disclaimers.map((line, index) => (
                  <li key={index} className="text-xs text-[#FFF7EF]/55 leading-relaxed">{line}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
