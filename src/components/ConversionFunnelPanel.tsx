import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Funnel, RefreshCw } from 'lucide-react';

/**
 * KURLA — L3 « Dashboard de conversion » : panneau admin du funnel.
 * =============================================================================
 * 4 étapes (diagnostic → routine → panier → payé) × 3 vues (tous / cheveux /
 * peau), variation vs période précédente (30 j), alerte visible dès −20 % —
 * sans requêter la base. Données issues de GET /api/admin/conversion-funnel
 * (tables réelles ; « Non mesuré » quand une source est indisponible).
 */

type Props = { headers: HeadersInit };

type FunnelStep = {
  key: 'diagnostic' | 'routine' | 'panier' | 'paye';
  label: string;
  count: number | null;
  rateFromTopPct: number | null;
  stepConversionPct: number | null;
  dropFromPreviousPct: number | null;
  previousCount: number | null;
  deltaPct: number | null;
  flagged: boolean;
  available: boolean;
};

type FunnelDomainResult = {
  available: boolean;
  reason: string | null;
  steps: FunnelStep[];
  topToBottomPct: number | null;
};

type FunnelData = {
  generatedAt: string;
  periodDays: number;
  periods: { current: { from: string; to: string }; previous: { from: string; to: string } };
  funnels: Record<'tous' | 'cheveux' | 'peau', FunnelDomainResult>;
  flags: string[];
  notes: string[];
};

const DOMAIN_CARDS: Array<{ key: 'tous' | 'cheveux' | 'peau'; title: string; accent: string }> = [
  { key: 'tous', title: 'Tous pôles', accent: 'bg-kurla-copper' },
  { key: 'cheveux', title: 'Pôle cheveux', accent: 'bg-kurla-copper/70' },
  { key: 'peau', title: 'Pôle peau', accent: 'bg-rose-400/70' }
];

const formatPct = (value: number | null): string =>
  value === null ? '—' : `${value.toLocaleString('fr-FR')} %`;

function DeltaBadge({ step }: { step: FunnelStep }) {
  if (!step.available || step.deltaPct === null) {
    return <span className="text-[10px] text-kurla-cream/35">vs 30 j préc. : —</span>;
  }
  const negative = step.deltaPct < 0;
  const positive = step.deltaPct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        step.flagged
          ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/50'
          : negative
            ? 'bg-rose-500/10 text-rose-300'
            : positive
              ? 'bg-emerald-500/10 text-emerald-300'
              : 'bg-kurla-cream/5 text-kurla-cream/60'
      }`}
    >
      {negative ? '▼' : positive ? '▲' : '•'} {Math.abs(step.deltaPct).toLocaleString('fr-FR')} % vs 30 j préc.
      {step.flagged && ' — alerte'}
    </span>
  );
}

function FunnelCard({ title, accent, funnel }: { title: string; accent: string; funnel: FunnelDomainResult }) {
  return (
    <div className={`rounded-2xl bg-kurla-ink border p-4 space-y-3 ${!funnel.available ? 'border-amber-500/25' : 'border-kurla-cream/10'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-kurla-cream/80">{title}</h3>
        </div>
        {funnel.available && funnel.topToBottomPct !== null && (
          <span className="text-[10px] font-semibold text-kurla-copper">
            diagnostic → payé : {formatPct(funnel.topToBottomPct)}
          </span>
        )}
      </div>

      {!funnel.available ? (
        <p className="text-[11px] text-kurla-cream/45 italic leading-relaxed">
          Non mesuré — {funnel.reason ?? 'données indisponibles.'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {funnel.steps.map(step => (
            <div
              key={step.key}
              className={`rounded-xl p-2.5 bg-kurla-espresso/60 ${step.flagged ? 'ring-1 ring-amber-500/60' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-kurla-cream/70">{step.label}</span>
                <span className={`text-base font-bold font-mono ${step.count === null ? 'text-kurla-cream/35' : 'text-kurla-cream'}`}>
                  {step.count === null ? 'Non mesuré' : step.count.toLocaleString('fr-FR')}
                </span>
              </div>
              {step.rateFromTopPct !== null && (
                <div className="h-1.5 rounded-full bg-kurla-cream/10 mt-2 overflow-hidden">
                  <div className={`h-full rounded-full ${accent}`} style={{ width: `${Math.min(100, step.rateFromTopPct)}%` }} />
                </div>
              )}
              <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                <DeltaBadge step={step} />
                <span className="text-[10px] text-kurla-cream/40">
                  {step.key === 'diagnostic'
                    ? `${step.rateFromTopPct ?? 100} % du sommet`
                    : step.dropFromPreviousPct !== null
                      ? `chute ${step.dropFromPreviousPct.toLocaleString('fr-FR')} pts vs étape préc.`
                      : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConversionFunnelPanel({ headers }: Props) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/conversion-funnel', { headers });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || `Erreur ${res.status} : le funnel est indisponible.`);
        setData(null);
        return;
      }
      setData(json as FunnelData);
    } catch {
      setError('Le funnel de conversion est momentanément inaccessible.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = data
    ? `${new Date(data.periods.current.from).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} – ${new Date(data.periods.current.to).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
    : null;

  return (
    <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-serif-title font-bold text-kurla-cream flex items-center gap-2">
            <Funnel className="w-5 h-5 text-kurla-copper" /> Funnel de conversion
          </h2>
          <p className="text-[11px] text-kurla-cream/45 mt-1">
            Diagnostic → routine → panier → payé · 30 jours glissants
            {periodLabel ? ` (${periodLabel})` : ''} · utilisateurs distincts
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 px-3 py-1.5 text-xs font-semibold text-kurla-cream hover:border-kurla-copper/50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {data && data.flags.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" /> Chutes à surveiller (≤ −20 % vs période précédente)
          </p>
          {data.flags.map(flag => (
            <p key={flag} className="text-xs text-amber-200/90 pl-6">{flag}</p>
          ))}
        </div>
      )}

      {loading && !data ? (
        <p className="text-xs text-kurla-cream/45 italic">Chargement du funnel…</p>
      ) : error ? (
        <p className="text-xs text-rose-300">{error}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {DOMAIN_CARDS.map(card => (
              <FunnelCard key={card.key} title={card.title} accent={card.accent} funnel={data.funnels[card.key]} />
            ))}
          </div>
          <div className="space-y-1">
            {data.notes.map(note => (
              <p key={note} className="text-[10px] text-kurla-cream/35 leading-relaxed">
                • {note}
              </p>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
