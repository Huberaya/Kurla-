/**
 * Onglet « Dropshipping » du groupe Catalogue (20/09).
 *
 * Ce que l'utilisatrice a demandé : voir le dropshipping DANS le catalogue,
 * pas seulement un guide. Le panneau n'invente rien : il croisse les fiches
 * produit avec les offres `product_sources` et le registre fournisseurs, et
 * affiche l'état réel — offres disponibles, promesses tenables, anomalies à
 * corriger. Les gestes (bon de commande, édition d'offre) restent là où ils
 * vivent déjà : ce tableau y mène, il ne les duplique pas.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Package, Send } from 'lucide-react';
import type { ProductSource } from '../lib/supplyModel';
import { computeDropshipOps, formatCost, formatLeadTime, type DropshipRow } from '../lib/dropshipOps';
import { fetchAdminCatalogProducts } from '../lib/adminCatalogProducts';

export const DropshipOpsPanel: React.FC<{
  headers: Record<string, string>;
  onOpenGuide: () => void;
  onOpenSourcing: () => void;
  onOpenCatalog: () => void;
}> = ({ headers, onOpenGuide, onOpenSourcing, onOpenCatalog }) => {
  const [rows, setRows] = useState<DropshipRow[]>([]);
  const [totals, setTotals] = useState({ products: 0, withOffer: 0, availableNow: 0, promised24h: 0, anomalies: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [onlyIssues, setOnlyIssues] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [productsBody, sourcesBody, suppliersBody] = await Promise.all([
        fetchAdminCatalogProducts(headers),
        fetch('/api/admin/sourcing/sources', { headers }).then(r => r.json()),
        fetch('/api/admin/suppliers?all=1', { headers }).then(r => r.json()),
      ]);
      const ops = computeDropshipOps(
        productsBody.products || [],
        (sourcesBody.sources || []) as ProductSource[],
        suppliersBody.suppliers || []
      );
      setRows(ops.rows);
      setTotals(ops.totals);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [headers]);

  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (onlyIssues ? rows.filter(r => r.anomalies.length > 0) : rows), [rows, onlyIssues]);

  return (
    <div className="space-y-4 min-w-0" style={{ overflowWrap: "anywhere" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kurla-cream/10 bg-kurla-ink/60 px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-kurla-cream flex items-center gap-2">
            <Send className="w-4 h-4 text-kurla-amber" /> Dropshipping — état des offres
          </h2>
          <p className="text-xs text-kurla-cream/60 mt-0.5 max-w-xl">
            L'état réel, produit par produit : ce qui est tenable aujourd'hui, ce qui ne repose sur rien.
            Les coûts et délais inconnus s'affichent « à obtenir » — jamais 0, jamais une date de complaisance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-kurla-cream/70 hover:text-kurla-cream hover:bg-kurla-cream/10">
            Recharger
          </button>
          <button type="button" onClick={onOpenGuide} className="px-3 py-1.5 rounded-lg bg-kurla-copper text-white text-[11px] font-semibold flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Guide 0 carton
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          Lecture du catalogue ou des offres impossible. Réessayez — rien n'est modifié.
        </div>
      )}

      {status === 'ready' && rows.length === 0 && (
        <div className="rounded-xl border border-kurla-cream/10 bg-kurla-ink/40 px-4 py-6 text-center">
          <Package className="w-8 h-8 text-kurla-cream/30 mx-auto mb-2" />
          <p className="text-sm text-kurla-cream/80 font-semibold">Aucune offre dropshipping déclarée.</p>
          <p className="text-xs text-kurla-cream/50 mt-1">Le dropshipping se construit au sourcing : une offre = un fournisseur enregistré × un modèle.</p>
          <button type="button" onClick={onOpenSourcing} className="mt-3 px-3 py-1.5 rounded-lg bg-kurla-copper text-white text-[11px] font-semibold">
            Déclarer une offre (Fournisseurs & sourcing)
          </button>
        </div>
      )}

      {status === 'ready' && rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: 'Produits concernés', value: totals.products },
              { label: 'Avec offre', value: totals.withOffer },
              { label: 'Disponible maintenant', value: totals.availableNow },
              { label: 'Promesse 24–48h tenable', value: totals.promised24h },
              { label: 'Anomalies', value: totals.anomalies, warn: totals.anomalies > 0 },
            ].map(t => (
              <div key={t.label} className={`rounded-xl border px-3 py-2 ${t.warn ? 'border-amber-500/40 bg-amber-950/20' : 'border-kurla-cream/10 bg-kurla-ink/40'}`}>
                <div className={`text-lg font-bold ${t.warn ? 'text-amber-300' : 'text-kurla-cream'}`}>{t.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-kurla-cream/50">{t.label}</div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-kurla-cream/70 select-none">
            <input type="checkbox" checked={onlyIssues} onChange={e => setOnlyIssues(e.target.checked)} className="accent-kurla-copper" />
            Voir seulement ce qui cloche
          </label>

          <div
              className="overflow-x-auto rounded-xl border border-kurla-cream/10"
              style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" }}
            >
            <table className="w-full text-left text-[11px]" style={{ minWidth: 620 }}>

              <thead>
                <tr className="bg-kurla-ink/70 text-kurla-cream/50 uppercase tracking-wider text-[9.5px]">
                  <th className="px-3 py-2">Produit</th>
                  <th className="px-3 py-2">Fournisseur</th>
                  <th className="px-3 py-2">Délai</th>
                  <th className="px-3 py-2">Coût</th>
                  <th className="px-3 py-2">24–48h</th>
                  <th className="px-3 py-2">État</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.productId} className="border-t border-kurla-cream/10 align-top hover:bg-kurla-cream/5">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-kurla-cream">{r.name}</div>
                      {r.category && <div className="text-kurla-cream/40">{r.category}</div>}
                    </td>
                    <td className="px-3 py-2 text-kurla-cream/80">{r.supplierName || <span className="text-amber-300">aucun</span>}</td>
                    <td className="px-3 py-2 text-kurla-cream/80 whitespace-nowrap">{formatLeadTime(r.leadTimeDays)}</td>
                    <td className="px-3 py-2 text-kurla-cream/80 whitespace-nowrap">{formatCost(r.costCents)}</td>
                    <td className="px-3 py-2">
                      {r.promises24h
                        ? <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-semibold">tenable</span>
                        : r.badge24h
                          ? <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-200 font-semibold">badge non tenu</span>
                          : <span className="text-kurla-cream/40">—</span>}
                    </td>
                    <td className="px-3 py-2 min-w-[220px]">
                      {r.anomalies.length === 0 ? (
                        <span className="text-emerald-300/80">conforme</span>
                      ) : (
                        <ul className="space-y-1">
                          {r.anomalies.map(a => (
                            <li key={a} className="flex gap-1.5 text-amber-200/90">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {a}
                            </li>
                          ))}
                        </ul>
                      )}
                      <button type="button" onClick={onOpenCatalog} className="mt-1 text-kurla-copper hover:underline">
                        Ouvrir la fiche produit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-kurla-cream/40">
            Le bon de commande mailto et la saisie des offres vivent dans « Fournisseurs & sourcing » — cet onglet lit l'état, il ne duplique pas la saisie.
          </p>
        </>
      )}
    </div>
  );
};
