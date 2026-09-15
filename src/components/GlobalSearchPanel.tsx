import React, { useState } from 'react';
import { Search } from 'lucide-react';

/**
 * RECHERCHE GLOBALE UNIFIÉE (§24) — une seule boîte traverse catalogue,
 * approvisionnement (positions + candidats) et fournisseurs. Le « pourquoi »
 * de chaque résultat est affiché (nom, marque, besoins, canal…).
 */

const KIND_LABELS: Record<string, { label: string; className: string }> = {
  product: { label: 'catalogue', className: 'bg-sky-500/15 text-sky-300' },
  position: { label: 'position fond', className: 'bg-kurla-copper/15 text-kurla-copper' },
  candidate: { label: 'candidat', className: 'bg-violet-500/15 text-violet-300' },
  supplier: { label: 'fournisseur', className: 'bg-emerald-500/15 text-emerald-300' },
};

export const GlobalSearchPanel: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResult(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/global-search?q=${encodeURIComponent(value.trim())}`, { headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Recherche impossible.');
      setResult(body);
    } catch (e: any) {
      setError(e.message || 'Erreur de recherche.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3">
      <h3 className="font-bold flex items-center gap-2"><Search className="w-4 h-4 text-kurla-amber" /> Recherche globale — catalogue + approvisionnement + fournisseurs</h3>
      <input
        value={query}
        onChange={e => run(e.target.value)}
        placeholder="Ex. « hyperpigmentation », « COSRX », « Ankorstore », un SKU…"
        className="w-full px-3 py-2.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs"
      />
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
      {result && (
        <>
          <p className="text-[11px] text-kurla-cream/60">
            {result.hits.length} résultat(s) : <span className="text-sky-300">{result.counts.product} catalogue</span> · <span className="text-kurla-copper">{result.counts.position} positions</span> · <span className="text-violet-300">{result.counts.candidate} candidats</span> · <span className="text-emerald-300">{result.counts.supplier} fournisseurs</span>
            {busy && ' · recherche…'}
          </p>
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {result.hits.map((hit: any) => {
              const kind = KIND_LABELS[hit.kind] || { label: hit.kind, className: 'bg-kurla-ink text-kurla-cream/60' };
              return (
                <div key={`${hit.kind}-${hit.id}`} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${kind.className}`}>{kind.label}</span>
                  <span className="font-semibold flex-1 min-w-[180px]">{hit.name}</span>
                  {hit.detail && <span className="text-kurla-cream/55">{hit.detail}</span>}
                  <span className="text-kurla-amber/80">via {hit.matchedOn.join(', ')}</span>
                </div>
              );
            })}
            {result.hits.length === 0 && !busy && <p className="text-[11px] text-kurla-cream/45">Aucun résultat — rien n'est inventé pour combler.</p>}
          </div>
        </>
      )}
    </div>
  );
};
