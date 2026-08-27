/**
 * CHANTIER 7.6 — tarification et TVA du checkout.
 *
 * Extrait de la route `/api/stripe/create-checkout-session` pour une raison
 * précise : ce calcul décide du montant encaissé et de la TVA déclarée. Tant
 * qu'il vivait au milieu du handler HTTP, aucun banc ne pouvait l'exercer sans
 * monter Stripe, Supabase et un catalogue publiable — donc il n'était testé
 * nulle part. Ici, la route et le banc appellent **la même fonction**.
 *
 * Trois décisions, toutes traçables :
 *
 * 1. **Le taux dû est celui du pays de livraison**, pas celui du vendeur
 *    (principe de destination, directive 2006/112/CE art. 33). Un client
 *    allemand est taxé à 19 %, pas à 20 %.
 * 2. **Un prix TTC ne change pas de montant.** La TVA est déduite du prix
 *    réellement encaissé : la ventilation devient exacte sans toucher au prix
 *    payé. Un prix hors taxe, en revanche, est majoré de la TVA avant
 *    encaissement — un particulier ne peut pas être facturé hors taxe.
 * 3. **Sous auto-liquidation vérifiée**, le client paie le net : la part de TVA
 *    est extraite au taux de destination puis retirée du montant facturé.
 */

import { computeLineVat, computeOrderVat, vatRateForCountry, type OrderVatResult } from './vat';
import { fromCents } from './currency';

export interface CheckoutPricedItem {
  productId: string;
  variantId?: string;
  quantity: number;
  /** Prix unitaire en centimes, tel qu'il figure au catalogue. */
  unitAmountCents: number;
  /** `false` si le prix stocké est hors taxe. */
  priceIncludesVat: boolean;
  /** Taux déclaré sur la fiche produit (taux de construction du prix). */
  declaredVatRate: number;
  /** Nom au moment de la commande : une commande est un instantané. */
  name: string;
  image?: string;
  slug?: string;
}

export interface CheckoutVatLine {
  key: string;
  amountCents: number;
  includesVat: boolean;
  declaredRatePercent: number;
}

export interface CheckoutPricingResult {
  vat: OrderVatResult;
  /** Lignes telles qu'elles seront stockées sur la commande. */
  verifiedItems: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price: number;
    unitCents: number;
    lineTotal: number;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    declaredVatRate: number;
    currency: 'EUR';
    name: string;
    image?: string;
    slug?: string;
  }>;
  itemsGrossCents: number;
  shippingCents: number;
  finalTotalCents: number;
  finalTotal: number;
}

/**
 * Calcule le montant encaissé et la TVA d'un checkout.
 *
 * Lève une erreur si le pays n'a pas de taux connu (commande refusée plutôt que
 * taxée au hasard) ou si la ventilation ne retombe pas sur le total.
 */
export function priceCheckoutWithVat(input: {
  pricedItems: CheckoutPricedItem[];
  shippingCents: number;
  country: string;
  reverseChargeEligible: boolean;
  customerVatNumber?: string | null;
}): CheckoutPricingResult {
  const { pricedItems, shippingCents, country, reverseChargeEligible } = input;

  if (!Array.isArray(pricedItems) || pricedItems.length === 0) {
    throw new Error('Aucun article à tarifier.');
  }
  const destinationRate = vatRateForCountry(country);
  if (destinationRate === null) {
    throw new Error(`TVA indéterminée pour le pays « ${country} ». Commande refusée.`);
  }

  const vatLines: CheckoutVatLine[] = pricedItems.map(item => {
    const lineCents = item.unitAmountCents * item.quantity;
    const chargedCents = reverseChargeEligible
      // Auto-liquidation : on extrait la part nette au taux de destination, puis
      // on facture ce net sans TVA.
      ? computeLineVat({
        amountCents: lineCents,
        includesVat: item.priceIncludesVat,
        ratePercent: destinationRate,
      }).netCents
      : item.priceIncludesVat
        ? lineCents
        // Prix hors taxe : un particulier paie le TTC.
        : computeLineVat({
          amountCents: lineCents,
          includesVat: false,
          ratePercent: destinationRate,
        }).grossCents;

    return {
      key: `${item.productId}${item.variantId ? `:${item.variantId}` : ''}`,
      amountCents: chargedCents,
      // Invariant : `chargedCents` est toujours le montant **facturé**, TVA
      // comprise (ou sans TVA sous auto-liquidation, où le taux vaut 0). Le
      // rappeler ici évite de taxer deux fois un prix hors taxe déjà majoré —
      // défaut réel trouvé par le banc avant livraison.
      includesVat: true,
      declaredRatePercent: item.declaredVatRate,
    };
  });

  const vat = computeOrderVat({
    lines: vatLines,
    shippingAmountCents: shippingCents,
    country,
    reverseCharge: reverseChargeEligible,
    customerVatNumber: input.customerVatNumber ?? null,
  });

  // Garde-fou : ce qui est encaissé doit être exactement la somme des lignes et du
  // port. Si la ventilation ne retombe pas juste, on refuse la commande plutôt
  // que de facturer un montant dont la TVA serait fausse.
  const itemsGrossCents = vat.itemsGrossCents;
  const finalTotalCents = vat.totalGrossCents;
  if (finalTotalCents !== itemsGrossCents + shippingCents) {
    throw new Error(
      `Incohérence de ventilation TVA : total ${finalTotalCents} ≠ articles ${itemsGrossCents} + port ${shippingCents}`
    );
  }

  const verifiedItems = pricedItems.map((item, index) => {
    const lineVat = vat.lines[index];
    const chargedCents = vatLines[index].amountCents;
    return {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: Number((chargedCents / item.quantity / 100).toFixed(2)),
      unitCents: Math.round(chargedCents / item.quantity),
      lineTotal: fromCents(chargedCents),
      netAmount: fromCents(lineVat.netCents),
      vatRate: lineVat.ratePercent,
      vatAmount: fromCents(lineVat.vatCents),
      declaredVatRate: item.declaredVatRate,
      currency: 'EUR' as const,
      name: item.name,
      image: item.image,
      slug: item.slug,
    };
  });

  return {
    vat,
    verifiedItems,
    itemsGrossCents,
    shippingCents,
    finalTotalCents,
    finalTotal: fromCents(finalTotalCents),
  };
}
