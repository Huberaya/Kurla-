import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, ShieldCheck, Info } from 'lucide-react';
import { fetchProductCompliance, ProductComplianceResponse } from '../../services/marketplaceService';

/** Pays servis par KURLA — les seuls dont le statut réglementaire est évalué. */
const SERVED_COUNTRIES = ['FR', 'BE', 'LU', 'DE', 'ES', 'IT', 'NL', 'PT'];

interface ProductComplianceBannerProps {
  productId: string;
  /** Pays affiché par défaut ; le visiteur peut en choisir un autre. */
  country: string;
  /**
   * Remonte le verdict au parent. Un produit non commercialisable dans le pays
   * affiché ne doit pas pouvoir être ajouté au panier depuis cette fiche.
   */
  onVerdictChange?: (sellable: boolean, verdict: string) => void;
}

/**
 * CHANTIER 7.7 — statut réglementaire affiché AVANT l'achat.
 *
 * Deux règles d'affichage, héritées du module `jurisdiction.ts` :
 *  - l'absence de donnée n'est jamais présentée comme une conformité ;
 *  - seule une interdiction (ou une limite dépassée) bloque la vente.
 */
export function ProductComplianceBanner({ productId, country, onVerdictChange }: ProductComplianceBannerProps) {
  const [selectedCountry, setSelectedCountry] = useState(
    SERVED_COUNTRIES.includes(country) ? country : 'FR'
  );
  const [compliance, setCompliance] = useState<ProductComplianceResponse | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    fetchProductCompliance(productId, selectedCountry)
      .then(data => { if (!cancelled) setCompliance(data); })
      .catch((error: any) => {
        if (cancelled) return;
        setCompliance(null);
        setFailure(error?.message || 'Statut réglementaire indisponible.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, selectedCountry]);

  useEffect(() => {
    if (!onVerdictChange) return;
    if (failure) { onVerdictChange(true, 'unknown'); return; }
    if (!compliance) return;
    onVerdictChange(compliance.sellable, compliance.verdict);
  }, [compliance, failure]);

  const countryLabel = `${selectedCountry} · ${compliance?.jurisdiction || 'UE'}`;

  if (failure) {
    return (
      <div className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A]/70 p-4 text-xs text-[#FFF7EF]/60 flex gap-2 items-start">
        <Info className="w-4 h-4 text-[#D49A63] shrink-0" />
        <span>
          Statut réglementaire non vérifié pour {countryLabel} : {failure} KURLA n’affiche pas de
          verdict qu’elle ne peut pas justifier.
        </span>
      </div>
    );
  }

  if (loading || !compliance) {
    return (
      <div className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A]/40 p-4 text-xs text-[#FFF7EF]/40">
        Vérification du statut réglementaire pour {selectedCountry}…
      </div>
    );
  }

  const blocking = compliance.sellable === false;
  const verdict = compliance.verdict;
  const tone = blocking
    ? { border: 'border-rose-400/30', bg: 'bg-rose-900/20', text: 'text-rose-200', Icon: Ban }
    : verdict === 'restricted' || verdict === 'unverified'
      ? { border: 'border-amber-400/30', bg: 'bg-amber-900/20', text: 'text-amber-200', Icon: AlertTriangle }
      : { border: 'border-emerald-400/25', bg: 'bg-emerald-900/15', text: 'text-emerald-200', Icon: ShieldCheck };
  const { Icon } = tone;

  // Aucune donnée exploitable : on le dit, on ne fabrique pas un feu vert.
  if (verdict === 'no_data' && compliance.resolvedIngredientCount === 0) {
    return (
      <div className="rounded-2xl border border-[#FFF7EF]/10 bg-[#1A0F0A]/70 p-4 text-xs text-[#FFF7EF]/55">
        <div className="flex items-center gap-2 text-[#FFF7EF]/80 font-semibold mb-1">
          <Info className="w-4 h-4 text-[#D49A63]" /> Statut réglementaire non évalué pour {countryLabel}
        </div>
        Aucun ingrédient de cette fiche n’est encore relié au graphe d’ingrédients KURLA
        ({compliance.declaredIngredientCount} déclaré(s), 0 résolu(s)). Cela ne signifie pas que le
        produit est conforme : cela signifie que KURLA ne peut pas encore le vérifier.
        <ComplianceCountrySelect value={selectedCountry} onChange={setSelectedCountry} />
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-4 text-xs ${tone.text}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-[13px]">
            {blocking
              ? `Non commercialisable en ${compliance.country}`
              : verdict === 'restricted'
                ? `Ingrédient(s) réglementé(s) pour ${countryLabel}`
                : verdict === 'unverified'
                  ? `Statut incertain pour ${countryLabel}`
                  : `Statut réglementaire vérifié pour ${countryLabel}`}
          </p>
          {blocking && (
            <p className="mt-1 text-[#FFF7EF]/85">
              Ce produit ne peut pas être vendu dans ce pays. Le panier le refusera également.
            </p>
          )}
          <ul className="mt-2 space-y-1 text-[#FFF7EF]/85">
            {compliance.findings.slice(0, 6).map(finding => (
              <li key={`${finding.ingredientId}-${finding.jurisdiction}`}>
                <span className="font-medium">{finding.ingredientId}</span> — {finding.message}
                {finding.reference ? <span className="text-[#FFF7EF]/55"> ({finding.reference})</span> : null}
              </li>
            ))}
          </ul>
          {compliance.limitations.length > 0 && (
            <p className="mt-2 text-[#FFF7EF]/60">{compliance.limitations.join(' ')}</p>
          )}
          <p className="mt-2 text-[#FFF7EF]/45">
            {compliance.resolvedIngredientCount} ingrédient(s) résolu(s) sur{' '}
            {compliance.declaredIngredientCount} déclaré(s).
          </p>
        </div>
      </div>
      <ComplianceCountrySelect value={selectedCountry} onChange={setSelectedCountry} />
    </div>
  );
}

function ComplianceCountrySelect({ value, onChange }: { value: string; onChange: (country: string) => void }) {
  return (
    <label className="mt-3 flex items-center gap-2 text-[11px] text-[#FFF7EF]/55">
      Vérifier pour
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-lg border border-[#FFF7EF]/15 bg-black/25 px-2 py-1 text-[11px] text-[#FFF7EF] focus:border-[#C8753D] focus:outline-none"
      >
        {SERVED_COUNTRIES.map(code => <option key={code} value={code}>{code}</option>)}
      </select>
    </label>
  );
}
