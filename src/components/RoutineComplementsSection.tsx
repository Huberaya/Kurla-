import React, { useEffect, useState } from 'react';
import { Sparkles, Plus, Check } from 'lucide-react';

import { Product } from '../types';
import { analytics } from '../lib/analytics';

/**
 * L1 — Section « Complète votre routine » (fiche produit + panier).
 *
 * Une seule source de vérité : `GET /api/routine/complements`. La section
 * s'auto-supprime quand il n'y a rien à proposer — un cross-sell vide n'a
 * pas d'intérêt, et un bandeau « aucune suggestion » n'en a pas davantage.
 */
interface Suggestion {
  product: Product;
  missingStep: string;
  reason: string;
}

interface RoutineComplementsSectionProps {
  /** Ids (ou slugs) du contexte : panier ou produit de la fiche. */
  contextIds: string[];
  /** Ajout panier (fourni par la page hôte). Sans onAdd, pas de bouton. */
  onAdd?: (product: Product) => void;
}

export const RoutineComplementsSection: React.FC<RoutineComplementsSectionProps> = ({ contextIds, onAdd }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const idsKey = contextIds.join(',');

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setAddedIds([]);
    if (!idsKey) {
      setSuggestions([]);
      setLoaded(true);
      return;
    }
    fetch(`/api/routine/complements?products=${encodeURIComponent(idsKey)}`)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setLoaded(true);
      })
      .catch(() => {
        // Best effort : la section disparaît, la page mère reste utilisable.
        if (!cancelled) {
          setSuggestions([]);
          setLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, [idsKey]);

  if (!loaded || suggestions.length === 0) return null;

  return (
    <div className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6">
      <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-kurla-amber font-bold mb-4">
        <Sparkles className="w-4 h-4" /> Complète votre routine
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {suggestions.map(({ product, reason }) => {
          const alreadyAdded = addedIds.includes(product.id);
          return (
            <div key={product.id} className="rounded-2xl border border-kurla-cream/10 bg-kurla-ink/60 p-4 flex flex-col">
              <a href={`/produit/${product.slug || product.id}`} className="block">
                <div className="h-28 rounded-xl overflow-hidden bg-kurla-espresso mb-3">
                  {product.image ? (
                    <img loading="lazy" decoding="async" src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-kurla-cream/40">Image en attente de validation</div>
                  )}
                </div>
                <h3 className="text-sm font-serif-title font-bold text-kurla-cream leading-snug line-clamp-2">{product.name}</h3>
              </a>
              <p className="text-[11px] text-kurla-amber/90 mt-1.5 mb-2 leading-snug">{reason}</p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-kurla-cream">{product.price.toFixed(2)} €</span>
                {onAdd && (
                  <button
                    type="button"
                    disabled={!product.inStock}
                    onClick={() => {
                      onAdd(product);
                      setAddedIds(current => (current.includes(product.id) ? current : [...current, product.id]));
                      try {
                        // Même événement que les autres ajouts panier (mesurable dans L3).
                        analytics.addToCart(product.id, product.name, product.price, 1, 'routine_complement');
                      } catch { /* jamais bloquant */ }
                    }}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      alreadyAdded
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-kurla-copper text-white hover:bg-kurla-cocoa disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {alreadyAdded ? (<><Check className="w-3.5 h-3.5" /> Ajouté</>) : (<><Plus className="w-3.5 h-3.5" /> Ajouter</>)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-kurla-cream/40 mt-4">
        Suggestions calculées depuis votre étagère et votre panier : une étape déjà couverte n’est jamais re-proposée.
      </p>
    </div>
  );
};
