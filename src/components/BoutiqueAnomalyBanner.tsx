/**
 * BANDEAU « ANOMALIES EN BOUTIQUE » (chantier 17/09 — C1).
 *
 * Signalé DANS LE CATALOGUE, comme demandé : les fiches PUBLIÉES et VISIBLES en
 * boutique mais NON CONFORMES aux critères de mise en vente (choix de test).
 * Compteur + les plus critiques nommés + un clic qui mène au Pipeline (où
 * Dépublier / Compléter le dossier). Lecture seule ici — aucune écriture, la
 * correction se fait au Pipeline. 100 % dérivé (catalogue + publication-
 * readiness), jamais inventé ; source indisponible → bandeau absent, pas faux.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { findBoutiqueAnomalies } from '../lib/catalogPipeline';

export const BoutiqueAnomalyBanner: React.FC<{
  headers: HeadersInit;
  onOpenPipeline: () => void;
}> = ({ headers, onOpenPipeline }) => {
  const [anomalies, setAnomalies] = useState<ReturnType<typeof findBoutiqueAnomalies> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [products, readiness] = await Promise.allSettled([
        fetch('/api/admin/catalog/products', { headers }).then(r => r.json()),
        fetch('/api/admin/catalog/publication-readiness', { headers }).then(r => r.json())
      ]);
      if (cancelled) return;
      if (products.status === 'rejected' || readiness.status === 'rejected') { setAnomalies(null); return; }
      const pv = (products.value as any); const rv = (readiness.value as any);
      if (!pv || !rv) { setAnomalies(null); return; }
      setAnomalies(findBoutiqueAnomalies(
        (pv.products || []).map((p: any) => ({
          id: String(p.id), name: p.name, slug: p.slug, catalogStatus: p.catalogStatus,
          isTestListing: p.isTestListing === true || p.is_test_listing === true || p.truth?.isTestListing === true,
          truth: p.truth || null
        })),
        (rv.perProduct || []).map((r: any) => ({
          productId: String(r.productId), ready: !!r.ready,
          missing: (r.missing || []).map((m: any) => (typeof m === 'string' ? m : m?.label || ''))
        }))
      ));
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!anomalies || anomalies.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-500/35 bg-rose-500/[0.07] p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-300" />
        <h3 className="text-sm font-bold text-rose-200">
          {anomalies.length} fiche{anomalies.length > 1 ? 's' : ''} visible{anomalies.length > 1 ? 's' : ''} en boutique mais non conforme{anomalies.length > 1 ? 's' : ''} aux critères
        </h3>
        <button type="button" onClick={onOpenPipeline} className="ml-auto px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold text-rose-200 hover:bg-rose-500/30">
          Gérer au Pipeline →
        </button>
      </div>
      <p className="text-[11px] text-rose-200/70 max-w-3xl">
        Choix de test à trancher : ces fiches sont en boutique sans l’ensemble des critères de mise en vente.
        Les plus critiques : {anomalies.slice(0, 3).map(a => a.name).join(', ')}{anomalies.length > 3 ? ` +${anomalies.length - 3}` : ''}.
        Au Pipeline : Dépublier ou Compléter le dossier.
      </p>
    </div>
  );
};
