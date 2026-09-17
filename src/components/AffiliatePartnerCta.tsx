import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PARTNER_LINK_LABEL, type CustomerAffiliateOffer } from '../lib/affiliateOffer';

/**
 * CHANTIER 10 — CTA honnête. `rel="sponsored"` (loi 2023-451 / L.121-3).
 * Le href est le lien saisi, sans paramètre profil ni tracking KURLA.
 */
export const AffiliatePartnerCta: React.FC<{
  offer: CustomerAffiliateOffer;
  tone?: 'dark' | 'light';
}> = ({ offer, tone = 'dark' }) => {
  const dark = tone === 'dark';
  return (
    <div className="space-y-2">
      <p className={`text-[11px] leading-relaxed ${dark ? 'text-kurla-cream/70' : 'text-kurla-carbon/70'}`}>
        {offer.disclosure}. KURLA n’est pas le vendeur — achat et livraison chez le partenaire. Pas de suivi de cookie KURLA.
      </p>
      <a
        href={offer.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={dark
          ? 'px-7 py-3 rounded-full bg-gradient-to-r from-kurla-copper to-kurla-amber text-white text-sm font-semibold inline-flex items-center gap-2'
          : 'px-4 py-2.5 rounded-full bg-kurla-copper hover:bg-kurla-cocoa text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm'}
      >
        <ExternalLink className={dark ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {offer.ctaLabel || PARTNER_LINK_LABEL}
      </a>
    </div>
  );
};
