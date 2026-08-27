import React, { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ArchetypeRatingsResponse, getArchetypeRatings } from '../../services/intelligenceService';

/**
 * Notes par archétype sur la fiche produit.
 *
 * Règle métier respectée ici : KURLA n'affiche pas de note globale. Une moyenne
 * sur tous les cheveux mélangerait des textures qui ne réagissent pas de la même
 * façon, et une cohorte trop petite est supprimée plutôt que publiée.
 */
interface ArchetypeRatingsPanelProps {
  productId: string;
}

export function ArchetypeRatingsPanel({ productId }: ArchetypeRatingsPanelProps) {
  const { session } = useAuth();
  const [state, setState] = useState<ArchetypeRatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getArchetypeRatings(productId, session?.access_token)
      .then(data => { if (!cancelled) setState(data); })
      .catch(() => { if (!cancelled) setState(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, session?.access_token]);

  const publishable = state?.ratings.filter(rating => rating.publishable) ?? [];

  return (
    <section className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6">
      <h2 className="text-xl font-serif-title font-bold flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-[#D49A63]" />
        <span>Ce que disent les cheveux comme les vôtres</span>
      </h2>
      <p className="text-xs text-[#FFF7EF]/60 mb-4">
        KURLA n’affiche pas de note globale : une moyenne mélange des cheveux qui ne se ressemblent pas.
        Chaque note est calculée sur une seule cohorte, et supprimée si la cohorte est trop petite.
      </p>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-[#FFF7EF]/60">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des cohortes…
        </p>
      ) : !state ? (
        <p className="text-xs text-[#FFF7EF]/60">
          Les notes par archétype sont indisponibles pour le moment.
        </p>
      ) : publishable.length === 0 ? (
        <p className="text-xs text-[#FFF7EF]/60">
          Pas encore assez de retours vérifiés pour publier une note par archétype sur ce produit.
          KURLA préfère ne rien afficher plutôt qu’afficher une tendance non fiable.
        </p>
      ) : (
        <ul className="space-y-2">
          {publishable.map(rating => {
            const isViewer = rating.archetypeId === state.viewerArchetypeId;
            return (
              <li
                key={rating.archetypeId}
                className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                  isViewer ? 'border-[#C8753D] bg-[#C8753D]/10' : 'border-[#FFF7EF]/10'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#FFF7EF]">
                    {rating.archetypeLabel}
                    {isViewer && <span className="ml-2 text-[10px] uppercase tracking-wider text-[#D49A63]">votre archétype</span>}
                  </p>
                  <p className="text-[11px] text-[#FFF7EF]/55 mt-0.5">
                    {rating.reviewCount} retour(s) vérifié(s)
                  </p>
                </div>
                {rating.rating === null ? (
                  <span className="text-[11px] text-[#FFF7EF]/50 shrink-0">non publié</span>
                ) : (
                  <span className="text-lg font-bold text-[#D49A63] shrink-0">
                    {rating.rating.toFixed(1)}
                    <span className="text-[11px] text-[#FFF7EF]/50">/5</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {state?.ratings.some(rating => !rating.publishable) && (
        <p className="mt-4 flex items-start gap-2 text-[11px] text-[#FFF7EF]/50">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {state.ratings.filter(rating => !rating.publishable).length} cohorte(s) masquée(s) : effectif
            inférieur au seuil de k-anonymat. Une note calculée sur trop peu de personnes identifierait
            des retours individuels.
          </span>
        </p>
      )}
    </section>
  );
}
