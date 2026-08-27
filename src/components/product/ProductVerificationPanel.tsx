import React, { useEffect, useState } from 'react';
import { BadgeCheck, Check, Loader2, Minus } from 'lucide-react';
import { fetchProductVerification, ProductVerificationResponse } from '../../services/marketplaceService';

/**
 * Vérification publique de la fiche.
 *
 * Ce panneau n'expose que des booléens par contrôle. Les statuts bruts, les
 * notes internes, les URL de preuve et l'identité du validateur restent côté
 * administration : une décision de gouvernance n'est pas une métadonnée produit.
 *
 * Un contrôle non abouti est affiché comme « non vérifié », jamais comme un
 * défaut du produit : l'absence de preuve n'est pas une preuve d'absence.
 */
interface ProductVerificationPanelProps {
  productIdOrSlug: string;
}

export function ProductVerificationPanel({ productIdOrSlug }: ProductVerificationPanelProps) {
  const [verification, setVerification] = useState<ProductVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductVerification(productIdOrSlug)
      .then(data => { if (!cancelled) setVerification(data); })
      .catch(() => { if (!cancelled) setVerification(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productIdOrSlug]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-[#FFF7EF]/60">
        <Loader2 className="w-4 h-4 animate-spin" /> Vérification de la fiche…
      </p>
    );
  }

  if (!verification) return null;

  const passedCount = verification.checks.filter(check => check.passed).length;

  return (
    <section className="rounded-3xl bg-[#1A0F0A] border border-[#FFF7EF]/10 p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="text-xl font-serif-title font-bold flex items-center gap-2">
          <BadgeCheck className={`w-5 h-5 ${verification.verified ? 'text-emerald-300' : 'text-[#FFF7EF]/40'}`} />
          <span>Fiche vérifiée par KURLA</span>
        </h2>
        <span className="text-[11px] text-[#FFF7EF]/50 shrink-0">
          {passedCount}/{verification.checks.length} contrôles
        </span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {verification.checks.map(check => (
          <li
            key={check.id}
            className="flex items-center gap-2 rounded-xl border border-[#FFF7EF]/10 px-3 py-2 text-xs"
          >
            {check.passed ? (
              <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-[#FFF7EF]/35 shrink-0" aria-hidden="true" />
            )}
            <span className={check.passed ? 'text-[#FFF7EF]' : 'text-[#FFF7EF]/50'}>{check.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-[#FFF7EF]/55">{verification.note}</p>
      {verification.verifiedAt && (
        <p className="mt-1 text-[11px] text-[#FFF7EF]/40">
          Dernière vérification enregistrée le {new Date(verification.verifiedAt).toLocaleDateString('fr-FR')}.
        </p>
      )}
    </section>
  );
}
