/**
 * CHANTIER 10 — Affiliation année 1.
 * Saisie URL/commission/cookie sur product_sources. Affichage « Lien partenaire ».
 * Pas de pixel, pas de postback, pas de génération de lien, pas de panier.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_TRACKING_LIVE,
  affiliateBlocksCheckout,
  assertAffiliateUrl,
  attachCustomerAffiliateOffers,
  isHttpAffiliateUrl,
  offerFromProductSource,
  partnerHref,
  PARTNER_LINK_LABEL,
  publicAffiliateOffer,
  readAffiliateOffer,
  selectAffiliateSource,
} from '../src/lib/affiliateOffer';
import { calculateKurlaFit } from '../src/lib/kurlaFit';
import type { ProductSource } from '../src/lib/supplyModel';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

const affiliateSource = (over: Partial<ProductSource> = {}): ProductSource => ({
  id: 'src-aff-1',
  productId: 'peau-c10',
  supplierId: 'sup-1',
  partnerName: 'Partenaire C10',
  model: 'affiliation',
  isPrimary: true,
  costCents: null,
  feeCents: null,
  fulfillmentCostCents: null,
  commissionPct: 8,
  affiliateUrl: 'https://partenaire.example/ref=kurla',
  cookieDays: 30,
  leadTimeDays: null,
  shipsFrom: null,
  currency: 'EUR',
  available: true,
  notes: null,
  ...over,
});

function main(): void {
  assert.equal(PARTNER_LINK_LABEL, 'Lien partenaire');
  assert.equal(AFFILIATE_TRACKING_LIVE, false);
  assert.equal(isHttpAffiliateUrl('https://partenaire.example/ref=kurla'), true);
  assert.equal(isHttpAffiliateUrl('javascript:alert(1)'), false);
  assert.equal(isHttpAffiliateUrl('/local'), false);
  assert.equal(isHttpAffiliateUrl(''), false);

  assert.throws(() => assertAffiliateUrl('javascript:alert(1)'), /lien d’affiliation/);
  assert.throws(() => assertAffiliateUrl(''), /lien d’affiliation/);

  const url = 'https://partenaire.example/ref=kurla';
  assert.equal(partnerHref(url), url);
  assert.equal(partnerHref(`${url}?utm_source=brand`), `${url}?utm_source=brand`);

  const offer = publicAffiliateOffer({
    affiliateUrl: url,
    partnerName: 'Weleda',
    commissionPct: 8,
    cookieDays: 30,
  });
  assert.ok(offer);
  assert.equal(offer.checkoutEligible, false);
  assert.equal(offer.trackingLive, false);
  assert.equal(offer.ctaLabel, PARTNER_LINK_LABEL);
  assert.match(offer.disclosure, new RegExp(AFFILIATE_DISCLOSURE));
  assert.match(offer.commissionNote, /non mesurée/);
  assert.match(offer.cookieNote, /ne pose pas de pixel/);
  assert.equal(offer.url.includes('phototype'), false);
  assert.equal(offer.url.includes('kurla_id'), false);

  assert.equal(publicAffiliateOffer({ affiliateUrl: null }), null);
  const noCommission = publicAffiliateOffer({ affiliateUrl: url });
  assert.ok(noCommission);
  assert.equal(noCommission.commissionPct, null);
  assert.match(noCommission.commissionNote, /à obtenir/);

  const primaryDropship: ProductSource[] = [
    affiliateSource({ id: 'ds', model: 'dropshipping', isPrimary: true, affiliateUrl: null, commissionPct: null }),
    affiliateSource({ id: 'aff', isPrimary: false }),
  ];
  assert.equal(selectAffiliateSource(primaryDropship), null);

  const primaryAff = [affiliateSource()];
  assert.equal(selectAffiliateSource(primaryAff)?.id, 'src-aff-1');

  const fromSource = offerFromProductSource(affiliateSource());
  assert.ok(fromSource);
  assert.equal(fromSource.checkoutEligible, false);

  const attached = attachCustomerAffiliateOffers(
    [{ id: 'peau-c10', name: 'Sérum' }, { id: 'p35', name: 'Peigne' }],
    [affiliateSource(), affiliateSource({ id: 'other', productId: 'other', model: 'dropshipping', isPrimary: true, affiliateUrl: null })],
  );
  assert.ok(attached[0].affiliateOffer);
  assert.equal((attached[0].affiliateOffer as { url: string }).url, url);
  assert.equal('commissionPct' in (attached[0].affiliateOffer as object), false);
  assert.equal(attached[1].affiliateOffer, undefined);

  assert.equal(affiliateBlocksCheckout({ affiliateOffer: { url, disclosure: AFFILIATE_DISCLOSURE, ctaLabel: PARTNER_LINK_LABEL } }), true);
  assert.equal(affiliateBlocksCheckout({ id: 'p35' }), false);
  assert.equal(readAffiliateOffer({ id: 'p35' }), null);

  const kurlaFitSrc = read('src/lib/kurlaFit.ts');
  assert.doesNotMatch(kurlaFitSrc, /affiliateOffer/);

  const moduleSrc = read('src/lib/affiliateOffer.ts');
  assert.doesNotMatch(moduleSrc, /fetch\(/);
  assert.doesNotMatch(moduleSrc, /impact\.com|awin|postbackUrl|trackingPixel/i);
  assert.doesNotMatch(moduleSrc, /utm_source=kurla/);

  const store = read('src/lib/db/productSourceStore.ts');
  assert.match(store, /assertAffiliateUrl/);
  assert.equal(store.includes("from '../fulfillment'"), false);
  assert.doesNotMatch(store, /fulfillment_model/);

  const panel = read('src/components/ProductSourcesPanel.tsx');
  assert.match(panel, /cookieDays/);
  assert.match(panel, /PARTNER_LINK_LABEL/);
  assert.match(panel, /pas de pixel/i);
  assert.doesNotMatch(panel, /workspace === ['"]skin['"]/);

  const cta = read('src/components/AffiliatePartnerCta.tsx');
  assert.match(cta, /rel="sponsored noopener noreferrer"/);
  assert.match(cta, /n’est pas le vendeur/);

  const detail = read('src/pages/ProductDetailPage.tsx');
  assert.match(detail, /readAffiliateOffer/);
  assert.match(detail, /AffiliatePartnerCta/);

  const boutique = read('src/pages/BoutiquePage.tsx');
  assert.match(boutique, /readAffiliateOffer/);
  assert.match(boutique, /AffiliatePartnerCta/);

  const fulfillment = read('src/lib/fulfillment.ts');
  assert.doesNotMatch(fulfillment, /affiliateOffer/);
  const launch = read('src/lib/launchCatalog.ts');
  assert.doesNotMatch(launch, /affiliateOffer/);
  assert.doesNotMatch(launch, /productSourceStore/);

  const catalog = read('src/lib/db/catalogStore.ts');
  assert.doesNotMatch(catalog, /fulfillment_model/);
  assert.match(catalog, /attachCustomerAffiliateOffers/);

  console.log('[PASS] Affiliation C10 : URL réelle, Lien partenaire, 0 tracking, Hair intact.');
}

main();
