import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileWarning, RefreshCw, ShieldCheck } from 'lucide-react';

type ClaimHit = {
  field: string;
  fieldLabel: string;
  ruleId: string;
  ruleLabel: string;
  term: string;
  excerpt: string;
};

type ClaimProduct = {
  productId: string;
  slug: string | null;
  title: string;
  category: string | null;
  catalogStatus: string;
  isActive: boolean;
  clean: boolean;
  hitCount: number;
  scannedFields: string[];
  scannedCharacters: number;
  note: string;
  hits: ClaimHit[];
};

type ClaimsAudit = {
  generatedAt: string;
  scope: 'all' | 'skin' | 'hair';
  products: number;
  clean: number;
  flagged: number;
  hits: number;
  perProduct: ClaimProduct[];
};

type Props = { headers: HeadersInit };

export const CatalogClaimsAuditPanel: React.FC<Props> = ({ headers }) => {
  const [audit, setAudit] = useState<ClaimsAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/catalog/claims-audit', { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Le scan des allégations est indisponible.');
      setAudit(data as ClaimsAudit);
    } catch (loadError: any) {
      setAudit(null);
      setError(loadError.message || 'Impossible de charger le scan des allégations.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="rounded-3xl bg-kurla-espresso border border-kurla-cream/10 p-6 sm:p-8 space-y-5 shadow-xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-kurla-amber" /> P1-6 — Scan des allégations
          </h2>
          <p className="text-xs text-kurla-cream/55 mt-1 max-w-3xl leading-relaxed">
            Crible lexical déterministe des textes de fiches. Il signale les formulations à revoir, mais ne coche jamais une validation et ne remplace pas une revue juridique.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs text-kurla-cream/75 flex items-center gap-1.5 hover:border-kurla-copper disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs">{error}</div>}

      {loading && !audit ? (
        <p className="text-xs text-kurla-cream/45 italic">Lecture des fiches et exécution du crible…</p>
      ) : audit ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-kurla-ink border border-kurla-cream/10">
              <p className="text-xl font-bold text-kurla-cream">{audit.products}</p>
              <p className="text-[10px] uppercase tracking-wider text-kurla-cream/45">Fiches lues</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xl font-bold text-emerald-300">{audit.clean}</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-200/70">Sans signal lexical</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xl font-bold text-amber-300">{audit.flagged}</p>
              <p className="text-[10px] uppercase tracking-wider text-amber-200/70">À revoir</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-xl font-bold text-rose-300">{audit.hits}</p>
              <p className="text-[10px] uppercase tracking-wider text-rose-200/70">Correspondances</p>
            </div>
          </div>

          {audit.perProduct.length === 0 ? (
            <p className="text-xs text-kurla-cream/45 italic">Aucune fiche dans cet espace.</p>
          ) : (
            <div className="space-y-3">
              {audit.perProduct.map(product => (
                <article key={product.productId} className={`rounded-2xl border p-4 ${product.clean ? 'border-emerald-500/20 bg-emerald-950/10' : 'border-amber-500/30 bg-amber-950/10'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-kurla-cream">
                        {product.title} <span className="font-mono text-[10px] text-kurla-cream/35">{product.productId}</span>
                      </p>
                      <p className="text-[10px] text-kurla-cream/45 mt-1">
                        {product.category || 'catégorie inconnue'} · {product.catalogStatus} · {product.isActive ? 'active' : 'inactive'} · {product.scannedFields.length} champ(s), {product.scannedCharacters} caractère(s) lus
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 ${product.clean ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
                      {product.clean ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {product.clean ? 'Aucun signal' : `${product.hitCount} signal${product.hitCount > 1 ? 's' : ''} à revoir`}
                    </span>
                  </div>

                  {product.clean ? (
                    <p className="text-[10px] text-emerald-200/60 mt-3">{product.note}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {product.hits.map((hit, index) => (
                        <div key={`${product.productId}-${hit.ruleId}-${hit.field}-${index}`} className="rounded-xl bg-kurla-ink/70 border border-kurla-cream/10 p-3">
                          <div className="flex flex-wrap gap-x-2 gap-y-1 items-center text-[10px]">
                            <strong className="text-amber-300">{hit.ruleLabel}</strong>
                            <span className="text-kurla-cream/45">{hit.fieldLabel}</span>
                            <code className="text-rose-200">« {hit.term} »</code>
                          </div>
                          <p className="text-[11px] text-kurla-cream/60 mt-1 leading-relaxed">{hit.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 text-xs text-sky-200 flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Un résultat propre signifie seulement qu’aucun des motifs connus n’a été trouvé. La publication reste soumise à la Truth Layer, aux preuves C1 et aux validations serveur.</span>
          </div>
        </>
      ) : null}
    </section>
  );
};
