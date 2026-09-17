/**
 * CHANTIER 12 — bandeau KPI honnête, monté dans les DEUX espaces
 * (parité Hair / Skin). Aucun montage conditionnel propre à un espace.
 *
 * SKU publiables · ventes · pipeline (brouillons) · RFQ · docs.
 * Un 0 est mesuré. Un indicateur non lu reste « — », jamais un 0 inventé.
 * Skin : les kits capillaires ne comptent pas comme des ventes Skin.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileWarning, Package, Send, ShoppingBag, Workflow } from 'lucide-react';
import { fetchAdminCatalogProducts } from '../lib/adminCatalogProducts';
import {
  buildWorkspacePulse,
  formatPulseNumber,
  summarizeRfq,
  withOpsFacts,
  type PulseMetrics,
  type WorkspacePulse,
} from '../lib/workspacePulse';

function PulseCell({
  label,
  value,
  hint,
  tone = 'text-kurla-cream',
  badge,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
  badge?: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-kurla-cream/50">{label}</span>
        {badge && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-bold border border-kurla-cream/15 text-kurla-cream/55">
            {badge}
          </span>
        )}
      </div>
      <strong className={`text-xl font-bold block ${tone}`}>{value}</strong>
      <span className="text-[10px] text-kurla-cream/40 block leading-snug">{hint}</span>
    </div>
  );
}

function measuredBadge(value: number | null | undefined): string {
  return value == null ? 'non mesurable' : 'mesuré';
}

export const WorkspacePulsePanel: React.FC<{
  workspace: 'skin' | 'hair';
  headers: HeadersInit;
  pulse: WorkspacePulse | null;
  metrics: PulseMetrics | null;
}> = ({ workspace, headers, pulse, metrics }) => {
  const [live, setLive] = useState<WorkspacePulse | null>(pulse);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [catalog, itemsRes, opsRes] = await Promise.allSettled([
        fetchAdminCatalogProducts(headers),
        fetch('/api/admin/sourcing/items', { headers }).then(async response => {
          const body = await response.json();
          if (!response.ok) throw new Error(body?.error || 'RFQ indisponible');
          return body;
        }),
        fetch('/api/admin/sourcing/ops', { headers }).then(async response => {
          const body = await response.json();
          if (!response.ok) throw new Error(body?.error || 'Ops indisponible');
          return body;
        }),
      ]);
      if (cancelled) return;
      const products = catalog.status === 'fulfilled' ? (catalog.value.products || []) : [];
      const rfq = itemsRes.status === 'fulfilled' && Array.isArray(itemsRes.value?.items)
        ? summarizeRfq(itemsRes.value.items)
        : null;
      const docs = opsRes.status === 'fulfilled' && opsRes.value?.kpi
        ? Number(opsRes.value.kpi.suppliersWithoutContact)
        : null;
      const built = buildWorkspacePulse({
        workspace,
        products,
        metrics,
        cosmeticRevenueEur: pulse?.workspace === 'skin' ? pulse.displayRevenueEur : undefined,
        kitRevenueEur: pulse?.leakedRevenueEur,
        rfqOpen: rfq ? rfq.rfqOpen : null,
        docsMissing: Number.isFinite(docs as number) ? docs : null,
      });
      setLive(withOpsFacts(built, {
        rfqOpen: rfq ? rfq.rfqOpen : null,
        docsMissing: Number.isFinite(docs as number) ? docs : null,
        identifiedCount: pulse?.identifiedCount ?? null,
      }));
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setLive(pulse);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
    // headers recréés à chaque rendu — même convention que AdminActionQueue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, pulse?.displayRevenueEur, pulse?.leakedRevenueEur, metrics?.revenueTest]);

  const shown = live || pulse;
  const sku = shown
    ? (shown.workspace === 'skin' ? shown.publishedCosmeticSku : shown.publishedSkuInScope)
    : null;
  const skuHint = shown?.workspace === 'skin'
    ? 'Soins peau / teint / visage publiés — les kits capillaires ne sont pas des SKU Skin'
    : 'Fiches publiées dans le catalogue cheveux';

  return (
    <section className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Package className="w-5 h-5 text-kurla-copper" />
            {shown?.headline || 'Pouls du catalogue'}
          </h2>
          <p className="text-xs text-kurla-cream/55 mt-1 max-w-2xl">
            {shown?.hint || 'SKU, pipeline, RFQ et documents lus — un 0 est mesuré, un tiret signifie non lu.'}
          </p>
        </div>
        {loading && (
          <span className="text-[10px] uppercase tracking-wider text-kurla-cream/40">Lecture…</span>
        )}
      </div>

      {shown?.hairRevenueLeak && (
        <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {shown.leakedRevenueEur.toFixed(2)} € mesurés sur des kits capillaires : c’est du CA Hair.
            Il n’est pas présenté comme des ventes Skin.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <PulseCell
          label={shown?.workspace === 'skin' ? 'SKU peau publiables' : 'SKU publiables'}
          value={formatPulseNumber(sku, 'count')}
          hint={skuHint}
          tone={sku === 0 ? 'text-amber-300' : 'text-emerald-300'}
          badge={shown ? 'mesuré' : measuredBadge(sku)}
        />
        <PulseCell
          label={shown?.revenueLabel || 'Ventes'}
          value={shown ? formatPulseNumber(shown.displayRevenueEur, 'eur') : '—'}
          hint={shown?.revenueHint || 'Commandes réglées'}
          tone={shown?.honestZeroSales ? 'text-amber-300' : 'text-kurla-cream'}
          badge={shown ? 'mesuré' : '—'}
        />
        <PulseCell
          label="Pipeline (brouillons)"
          value={formatPulseNumber(shown?.pipelineDraftCount, 'count')}
          hint="Fiches draft / pending_review dans cet espace"
          badge={shown ? 'mesuré' : '—'}
        />
        <PulseCell
          label="RFQ ouvertes"
          value={formatPulseNumber(shown?.rfqOpen, 'count')}
          hint={shown?.rfqOpen == null ? 'Besoins sourcing non lus' : 'Besoins in_rfq ou en attente de réponse'}
          badge={measuredBadge(shown?.rfqOpen)}
          tone={shown?.rfqOpen == null ? 'text-kurla-cream/40' : 'text-kurla-cream'}
        />
        <PulseCell
          label="Docs manquants"
          value={formatPulseNumber(shown?.docsMissing, 'count')}
          hint={shown?.docsMissing == null ? 'Contacts fournisseurs non lus' : 'Fournisseurs sans e-mail de contact'}
          badge={measuredBadge(shown?.docsMissing)}
          tone={shown?.docsMissing == null ? 'text-kurla-cream/40' : 'text-kurla-cream'}
        />
      </div>

      <p className="text-[11px] text-kurla-cream/35 flex items-center gap-2">
        <Workflow className="w-3.5 h-3.5" />
        <ShoppingBag className="w-3.5 h-3.5" />
        <Send className="w-3.5 h-3.5" />
        <FileWarning className="w-3.5 h-3.5" />
        Même bandeau Hair et Skin. Les kits restent listés dans l’espace Skin (vitrine) ; leur CA n’y est pas attribué.
      </p>
    </section>
  );
};
