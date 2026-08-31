import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { searchIngredients, type IngredientSearchHit } from '../services/ingredientNavService';

/**
 * RECHERCHE PAR INGRÉDIENT (Chantier 1 — boucle publique).
 *
 * Permet de chercher un ingrédient par son nom INCI ou un nom commun français
 * (« glycérine », « karité », « parabène »…), puis de voir sa fiche et les
 * produits publiés qui le contiennent. Aucune donnée n'est inventée : seuls les
 * ingrédients du graphe et les produits publiés sont renvoyés par le serveur.
 */

const SUGGESTIONS = ['Glycérine', 'Karité', 'Niacinamide', 'Parfum', 'Filtre solaire', 'Parabène'];

export const IngredientSearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<IngredientSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (timer.current) clearTimeout(timer.current);
    if (term.length < 2) {
      setHits([]);
      setSearched(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    timer.current = setTimeout(() => {
      searchIngredients(term)
        .then(data => {
          setHits(data.ingredients || []);
          setSearched(true);
        })
        .catch(e => setError(e instanceof Error ? e.message : 'Recherche indisponible.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-[#FFFDF9] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <p className="text-[11px] font-semibold text-[#C8753D] uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Transparence ingrédients
          </p>
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Rechercher un ingrédient</h1>
          <p className="text-sm text-[#666666] mt-2 leading-relaxed">
            Tapez un nom INCI ou un nom courant (« glycérine », « karité »). Chaque fiche indique les
            fonctions cosmétiques (CosIng), les restrictions UE et les allergènes, ainsi que les
            produits publiés qui le contiennent.
          </p>
        </header>

        <div className="relative mb-4">
          <Search className="w-5 h-5 text-[#C8753D] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ex : niacinamide, beurre de karité, phenoxyethanol…"
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-[#E8E1DA] text-[#111111] placeholder-[#999999] focus:outline-none focus:border-[#C8753D]/60 focus:ring-2 focus:ring-[#C8753D]/15"
            aria-label="Rechercher un ingrédient"
          />
          {loading && <Loader2 className="w-5 h-5 animate-spin text-[#C8753D] absolute right-4 top-1/2 -translate-y-1/2" />}
        </div>

        {query.trim().length < 2 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="px-3.5 py-1.5 rounded-full bg-white border border-[#E8E1DA] text-xs text-[#666666] hover:border-[#C8753D]/50 hover:text-[#C8753D] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-[#B91C1C] mt-4">{error}</p>}

        {searched && !loading && !error && hits.length === 0 && (
          <div className="mt-8 rounded-2xl bg-white border border-[#E8E1DA] p-6 text-sm text-[#666666]">
            Aucun ingrédient du référentiel KURLA ne correspond à « {query.trim()} ». KURLA ne documente que
            les ingrédients réellement rattachés au graphe — rien n'est inventé.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {hits.map(hit => (
            <a
              key={hit.id}
              href={`/ingredient/${hit.id}`}
              className="block rounded-2xl bg-white border border-[#E8E1DA] p-5 hover:border-[#C8753D]/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#111111]">{hit.inciName}</h2>
                  {hit.commonNames.length > 0 && (
                    <p className="text-xs text-[#999999] mt-0.5">{hit.commonNames.slice(0, 4).join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hit.isAllergenRegulated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
                      <AlertTriangle className="w-3 h-3" /> Allergène
                    </span>
                  )}
                  {hit.productCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBF7F0] border border-[#C8753D]/30 text-[10px] font-semibold text-[#C8753D]">
                      <ShoppingBag className="w-3 h-3" /> {hit.productCount} produit{hit.productCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {hit.functions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {hit.functions.slice(0, 5).map(fn => (
                    <span key={fn} className="px-2.5 py-0.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-[11px] text-[#666666]">
                      {fn}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
        </div>

        <p className="text-xs text-[#999999] leading-relaxed mt-8">
          Les fonctions proviennent du vocabulaire déclaré CosIng (Commission européenne) ; les restrictions
          reflètent les annexes du Règlement (CE) n°1223/2009. Cette information n'est pas un avis médical.
        </p>
      </div>
    </div>
  );
};
