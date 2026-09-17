/**
 * CHANTIER 10 — Affiliation année 1.
 *
 * Offre = `product_sources` (modèle `affiliation`, C4). Colonnes déjà là :
 * `affiliate_url`, `commission_pct`, `cookie_days`.
 *
 * KURLA n’est pas le vendeur : pas de panier, pas de Stripe, pas de délai
 * promis. Affichage honnête « Lien partenaire » / « Publicité — lien affilié ».
 * Pas de réseau, pas de pixel, pas de postback, pas de génération de lien.
 * Le cookie déclaré n’est pas un tracking KURLA.
 */

import { selectPrimarySource, type ProductSource } from './supplyModel';

export const PARTNER_LINK_LABEL = 'Lien partenaire';
export const AFFILIATE_DISCLOSURE = 'Publicité — lien affilié';
export const AFFILIATE_TRACKING_LIVE = false;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isHttpAffiliateUrl(value: unknown): boolean {
  const url = text(value);
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Lien tel que saisi. N’ajoute aucun UTM, aucun id profil, aucun tracking. */
export function assertAffiliateUrl(value: unknown): string {
  const url = text(value);
  if (!isHttpAffiliateUrl(url)) {
    throw new Error('Une source en affiliation exige le lien d’affiliation réel.');
  }
  return url;
}

export function partnerHref(url: string): string {
  return assertAffiliateUrl(url);
}

export type AdminAffiliateOffer = {
  url: string;
  partnerName: string | null;
  disclosure: string;
  ctaLabel: string;
  checkoutEligible: false;
  trackingLive: false;
  commissionPct: number | null;
  commissionNote: string;
  cookieDays: number | null;
  cookieNote: string;
};

/** Payload boutique : pas de commission, pas de cookie « mesuré ». */
export type CustomerAffiliateOffer = {
  url: string;
  partnerName: string | null;
  disclosure: string;
  ctaLabel: string;
};

export function publicAffiliateOffer(input: {
  affiliateUrl?: string | null;
  partnerName?: string | null;
  commissionPct?: number | null;
  cookieDays?: number | null;
}): AdminAffiliateOffer | null {
  if (!isHttpAffiliateUrl(input.affiliateUrl)) return null;
  const partner = text(input.partnerName) || null;
  const commissionPct = typeof input.commissionPct === 'number' && Number.isFinite(input.commissionPct)
    ? input.commissionPct
    : null;
  const cookieDays = typeof input.cookieDays === 'number' && Number.isFinite(input.cookieDays) && input.cookieDays > 0
    ? Math.round(input.cookieDays)
    : null;
  return {
    url: text(input.affiliateUrl),
    partnerName: partner,
    disclosure: partner ? `${AFFILIATE_DISCLOSURE} ${partner}` : AFFILIATE_DISCLOSURE,
    ctaLabel: PARTNER_LINK_LABEL,
    checkoutEligible: false,
    trackingLive: false,
    commissionPct,
    commissionNote: commissionPct == null
      ? 'commission à obtenir — pas de chiffre inventé'
      : `commission attendue ${commissionPct} % — non mesurée (pas de pixel ni de postback)`,
    cookieDays,
    cookieNote: cookieDays == null
      ? 'durée cookie à obtenir'
      : `cookie ${cookieDays} j annoncé par le partenaire — KURLA ne pose pas de pixel`,
  };
}

export function customerAffiliateView(offer: AdminAffiliateOffer): CustomerAffiliateOffer {
  return {
    url: offer.url,
    partnerName: offer.partnerName,
    disclosure: offer.disclosure,
    ctaLabel: offer.ctaLabel,
  };
}

export function offerFromProductSource(
  source: ProductSource | null | undefined,
  supplierName?: string | null,
): AdminAffiliateOffer | null {
  if (!source || source.model !== 'affiliation') return null;
  return publicAffiliateOffer({
    affiliateUrl: source.affiliateUrl,
    partnerName: supplierName || source.partnerName,
    commissionPct: source.commissionPct,
    cookieDays: source.cookieDays,
  });
}

/**
 * L’offre ★ primaire gagne. Une affiliation secondaire n’ôte pas le panier
 * d’une source dropship / 3PL / stock.
 */
export function selectAffiliateSource(sources: ProductSource[]): ProductSource | null {
  const primary = selectPrimarySource(sources);
  if (primary?.model === 'affiliation' && primary.available) return primary;
  if (primary) return null;
  return sources.find(source => source.model === 'affiliation' && source.available) || null;
}

export function readAffiliateOffer(product: {
  affiliateOffer?: unknown;
  affiliateUrl?: unknown;
  brand?: unknown;
} | null | undefined): CustomerAffiliateOffer | null {
  if (!product) return null;
  if (product.affiliateOffer && typeof product.affiliateOffer === 'object') {
    const offer = product.affiliateOffer as Record<string, unknown>;
    const built = publicAffiliateOffer({
      affiliateUrl: typeof offer.url === 'string' ? offer.url : null,
      partnerName: typeof offer.partnerName === 'string' ? offer.partnerName : null,
    });
    return built ? customerAffiliateView(built) : null;
  }
  const built = publicAffiliateOffer({
    affiliateUrl: typeof product.affiliateUrl === 'string' ? product.affiliateUrl : null,
    partnerName: typeof product.brand === 'string' ? product.brand : null,
  });
  return built ? customerAffiliateView(built) : null;
}

export function affiliateBlocksCheckout(product: unknown): boolean {
  return readAffiliateOffer(product as { affiliateOffer?: unknown; affiliateUrl?: unknown }) != null;
}

export function attachCustomerAffiliateOffers<T extends { id?: unknown }>(
  products: T[],
  sources: ProductSource[],
): T[] {
  const byProduct = new Map<string, ProductSource[]>();
  for (const source of sources) {
    const list = byProduct.get(source.productId) || [];
    list.push(source);
    byProduct.set(source.productId, list);
  }
  return products.map(product => {
    const offer = offerFromProductSource(selectAffiliateSource(byProduct.get(String(product.id)) || []));
    if (!offer) return product;
    return { ...product, affiliateOffer: customerAffiliateView(offer) };
  });
}
