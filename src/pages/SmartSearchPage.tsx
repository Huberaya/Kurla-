import React, { useCallback, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, Search, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  searchByQuery,
  SearchResponse,
  SearchResultItem
} from '../services/intelligenceService';

const cardClass = 'bg-white border border-[#E8E1DA] rounded-2xl p-5';
const inputClass = 'w-full px-4 py-3.5 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]';
const primaryButton = 'px-5 py-3.5 rounded-xl bg-[#C8753D] hover:bg-[#b06330] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50';

const EXAMPLES = [
  'routine cheveux crépus secs moins de 30 €',
  'leave-in sans parfum pour cheveux fins',
  'masque protéine cheveux poreux',
  'shampooing clarifiant eau dure'
];

/**
 * RECHERCHE SÉMANTIQUE — « routine crépus secs < 50 € ».
 *
 * Le parti pris d'interface : ce que le parseur n'a pas compris est affiché.
 * Une recherche qui prétend tout comprendre ment — et sur un sujet où l'erreur
 * de produit coûte la fibre, le silence est le pire des comportements.
 */
export const SmartSearchPage: React.FC = () => {
  const { session } = useAuth();
  const token = session?.access_token;

  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('FR');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (value: string) => {
    if (!token) {
      setError('Connexion requise pour rechercher.');
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await searchByQuery(token, trimmed, country));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La recherche n’a pas abouti.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [token, country]);

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#111111]">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-5 h-5 text-[#C8753D]" />
            <h1 className="text-2xl font-bold">Recherche par intention</h1>
          </div>
          <p className="text-sm text-[#111111]/60 max-w-2xl">
            Décrivez ce que vous cherchez en une phrase. KURLA décompose la demande,
            dit ce qu&apos;elle a compris, et signale ce qu&apos;elle n&apos;a pas su interpréter.
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                className={inputClass}
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') void runSearch(query); }}
                placeholder="routine cheveux crépus secs moins de 30 €"
                aria-label="Recherche par intention"
              />
            </div>
            <select
              className="px-3 py-3 rounded-xl bg-[#FFFDF9] border border-[#E8E1DA] text-sm focus:outline-none focus:border-[#C8753D]"
              value={country}
              onChange={event => setCountry(event.target.value)}
              aria-label="Pays de livraison"
            >
              {['FR', 'BE', 'CH', 'CA', 'CI', 'SN'].map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <button className={primaryButton} onClick={() => void runSearch(query)} disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Rechercher
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {EXAMPLES.map(example => (
              <button
                key={example}
                onClick={() => { setQuery(example); void runSearch(example); }}
                className="px-3 py-1.5 rounded-full bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111]/70 hover:border-[#C8753D] cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-5">
            {/* Ce que KURLA a compris — et ce qu'elle n'a pas compris. */}
            <div className={cardClass}>
              <h2 className="text-xs uppercase tracking-wider font-bold text-[#111111]/50 mb-2">Interprétation</h2>
              <p className="text-sm font-medium">{result.interpretation}</p>

              {result.intent.unresolved.length > 0 && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Non interprété
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.intent.unresolved.map((token, index) => (
                      <span key={`${token}-${index}`} className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-xs text-amber-900">
                        {token}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-amber-800">
                    Ces termes n&apos;ont pas été reconnus. Ils n&apos;ont pas été ignorés en silence —
                    ils n&apos;ont simplement pas filtré les résultats.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mt-3">
                {result.intent.needs.map(need => <Chip key={need} label={need} />)}
                {result.intent.textures.map(texture => <Chip key={texture} label={texture} />)}
                {result.intent.steps.map(step => <Chip key={step} label={step} />)}
                {result.intent.excludesFragrance && <Chip label="sans parfum" />}
                {result.intent.wantsRoutine && <Chip label="routine complète" />}
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-bold">{result.total} résultat{result.total > 1 ? 's' : ''}</h2>
              <span className="text-xs text-[#111111]/50">Triés par contraintes satisfaites</span>
            </div>

            {result.results.length === 0 && (
              <div className={cardClass}>
                <div className="flex items-start gap-2 text-sm text-[#111111]/70">
                  <X className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Aucun produit ne satisfait ces contraintes. KURLA n&apos;élargit pas la recherche
                    pour remplir l&apos;écran : mieux vaut aucun résultat qu&apos;un résultat qui ne correspond pas.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {result.results.map(item => <ResultCard key={item.product.id} item={item} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Chip: React.FC<{ label: string }> = ({ label }) => (
  <span className="px-2 py-1 rounded-lg bg-[#FFFDF9] border border-[#E8E1DA] text-xs text-[#111111]/70">{label}</span>
);

const ResultCard: React.FC<{ item: SearchResultItem }> = ({ item }) => (
  <div className={cardClass}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="font-semibold text-sm truncate">{item.product.name}</h3>
        {item.product.brand && <p className="text-xs text-[#111111]/50">{item.product.brand}</p>}
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold">{Number(item.product.price).toFixed(2)} €</div>
        <div className="text-[10px] text-[#111111]/50">{item.satisfied} contrainte{item.satisfied > 1 ? 's' : ''} OK</div>
      </div>
    </div>

    {item.matchedOn.length > 0 && (
      <div className="mt-3 space-y-1">
        {item.matchedOn.map((reason, index) => (
          <div key={index} className="flex items-start gap-1.5 text-xs text-emerald-800">
            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{reason}</span>
          </div>
        ))}
      </div>
    )}

    {item.missedOn.length > 0 && (
      <div className="mt-3 space-y-1">
        {item.missedOn.map((reason, index) => (
          <div key={index} className="flex items-start gap-1.5 text-xs text-[#111111]/55">
            <X className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{reason}</span>
          </div>
        ))}
      </div>
    )}

    <a
      href={`/produit/${item.product.slug || item.product.id}`}
      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8753D] hover:underline"
    >
      <ShoppingBag className="w-3.5 h-3.5" />
      Voir la fiche
    </a>
  </div>
);

export default SmartSearchPage;
