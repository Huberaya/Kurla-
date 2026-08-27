/**
 * CHANTIER 7.6 — TVA : taux, calcul et ventilation.
 *
 * Trois règles, toutes publiques et vérifiables :
 *
 * 1. **Principe de destination.** Pour une vente de biens à un particulier dans
 *    un autre État membre, la TVA est due au taux du pays du client, pas à celui
 *    du vendeur (directive 2006/112/CE art. 33 ; paquet « TVA e-commerce » 2021,
 *    déclaré via le guichet unique OSS). Un vendeur français qui livre
 *    l'Allemagne doit donc appliquer 19 %, pas 20 %.
 * 2. **Prix TTC.** Les prix du catalogue sont TTC (`products.price_includes_vat`
 *    vaut TRUE par défaut). La TVA due se déduit alors du prix réellement
 *    encaissé : `TVA = TTC × taux / (100 + taux)`. Le montant facturé au client
 *    ne change pas ; c'est la ventilation comptable qui devient exacte.
 * 3. **Auto-liquidation B2B.** Une livraison intracommunautaire à un assujetti
 *    identifié est exonérée (art. 138) et le client autoliquide (art. 196). Mais
 *    seulement si le numéro de TVA est **vérifié** : un numéro qui a la bonne
 *    forme ne prouve rien. La vérification passe par VIES, et tout échec est
 *    traité comme « non vérifié » — on applique alors la TVA normale.
 *
 * Aucune valeur ici n'est estimée : les taux sont des faits sourcés, datés, et
 * un banc de test refuse qu'ils dérivent silencieusement.
 */

import { assertSettlementCurrency, roundHalfUp } from './currency';

/** Pays du vendeur (établissement qui déclare et encaisse). */
export const SELLER_COUNTRY = 'FR';

/**
 * Date à laquelle les taux ci-dessous ont été relevés. Un taux de TVA change par
 * la loi : cette date rend visible la nécessité de re-vérifier.
 */
export const VAT_RATES_AS_OF = '2026-08-28';

/**
 * Provenance des taux. Croisés sur plusieurs sources concordantes, dont le
 * briefing du service de recherche du Parlement européen (EPRS, janvier 2026).
 */
export const VAT_RATES_SOURCE =
  'Taux normaux de TVA des États membres, relevés le 2026-08-28. ' +
  'Sources concordantes : briefing EPRS 782613 (Parlement européen, janv. 2026), ' +
  'vatdb.com/vat-rates, numeral.com/blog/eu-vat-rates, fiscalead.com (juil. 2026).';

/**
 * Taux normaux de TVA, en pourcentage, pour les pays réellement desservis.
 *
 * La liste est volontairement bornée à `SHIPPING_OPTIONS` : publier un taux pour
 * un pays où nous ne livrons pas laisserait croire que la vente y est possible.
 */
export const EU_STANDARD_VAT_RATES: Record<string, number> = {
  FR: 20,
  BE: 21,
  LU: 17,
  DE: 19,
  ES: 21,
  IT: 22,
  NL: 21,
  PT: 23,
};

/** Taux normal du pays de destination, ou `null` si le pays n'est pas desservi. */
export function vatRateForCountry(country: unknown): number | null {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  const rate = EU_STANDARD_VAT_RATES[code];
  return typeof rate === 'number' ? rate : null;
}

export interface VatLineInput {
  /** Montant de la ligne. TTC si `includesVat`, hors taxe sinon. */
  amountCents: number;
  includesVat: boolean;
  /** Taux appliqué, en pourcentage. 0 en auto-liquidation. */
  ratePercent: number;
}

export interface VatLineResult {
  ratePercent: number;
  netCents: number;
  vatCents: number;
  /** Ce que le client paie : toujours `netCents + vatCents`. */
  grossCents: number;
}

/**
 * TVA d'une ligne, en centimes entiers.
 *
 * Le sens de l'arrondi est fixé une fois pour toutes : la TVA est arrondie au
 * demi supérieur, puis le net est obtenu **par soustraction**. Ainsi
 * `net + TVA === TTC` tient exactement, ligne par ligne, sans centime perdu —
 * une ventilation qui ne retombe pas sur le total encaissé est inutilisable en
 * comptabilité.
 */
export function computeLineVat(line: VatLineInput): VatLineResult {
  const amount = Math.round(line.amountCents);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error('Montant de ligne invalide pour le calcul de TVA.');
  }
  const rate = line.ratePercent;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error(`Taux de TVA invalide : ${rate}.`);
  }

  if (line.includesVat) {
    const vatCents = rate === 0 ? 0 : roundHalfUp((amount * rate) / (100 + rate));
    return { ratePercent: rate, netCents: amount - vatCents, vatCents, grossCents: amount };
  }

  const vatCents = rate === 0 ? 0 : roundHalfUp((amount * rate) / 100);
  return { ratePercent: rate, netCents: amount, vatCents, grossCents: amount + vatCents };
}

export interface OrderVatLineInput {
  /** Identifiant de traçabilité (produit, variante) : remonte dans le journal. */
  key?: string;
  amountCents: number;
  includesVat: boolean;
  /**
   * Taux déclaré sur la fiche produit (taux français de construction du prix).
   * Conservé pour la traçabilité ; le taux **appliqué** est celui de destination.
   */
  declaredRatePercent?: number;
  /** Surchage explicite (catégorie à taux réduit). Défaut : taux normal de destination. */
  ratePercent?: number;
}

export interface OrderVatInput {
  lines: OrderVatLineInput[];
  /** Livraison, TTC : c'est ce que le client paie en plus des articles. */
  shippingAmountCents: number;
  /** Pays de livraison. */
  country: string;
  /**
   * Auto-liquidation. Ne doit être mis à `true` que sur un numéro de TVA
   * **vérifié** (voir `isReverseChargeEligible`) : sans vérification, on
   * appliquerait une exonération à un particulier.
   */
  reverseCharge?: boolean;
  /** Numéro de TVA client vérifié, pour la facture. */
  customerVatNumber?: string;
}

export interface OrderVatLineResult extends VatLineResult {
  key?: string;
  declaredRatePercent?: number;
}

export interface OrderVatResult {
  currency: 'EUR';
  country: string;
  ratePercent: number | null;
  reverseCharge: boolean;
  customerVatNumber: string | null;
  lines: OrderVatLineResult[];
  shipping: VatLineResult;
  /** Ventilation par taux : ce qui figure sur une facture. */
  breakdown: { ratePercent: number; netCents: number; vatCents: number }[];
  totalNetCents: number;
  totalVatCents: number;
  totalGrossCents: number;
  /** Total des articles seuls, hors livraison, tel qu'encaissé. */
  itemsGrossCents: number;
  ratesAsOf: string;
}

/**
 * TVA d'une commande complète.
 *
 * La livraison suit le traitement des biens : elle est répartie **au prorata du
 * montant encaissé de chaque ligne**, le reliquat d'arrondi étant affecté à la
 * dernière ligne. La somme des parts est donc exactement égale au port facturé,
 * et chaque part porte le taux de sa ligne.
 */
export function computeOrderVat(input: OrderVatInput): OrderVatResult {
  assertSettlementCurrency('EUR');

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error('Une commande doit comporter au moins une ligne pour calculer la TVA.');
  }
  const country = typeof input.country === 'string' ? input.country.trim().toUpperCase() : '';
  const destinationRate = vatRateForCountry(country);
  if (destinationRate === null) {
    throw new Error(`TVA inconnue pour le pays « ${input.country} » : pays non desservi.`);
  }

  const reverseCharge = input.reverseCharge === true;
  const appliedRate = reverseCharge ? 0 : destinationRate;

  const lines: OrderVatLineResult[] = input.lines.map(line => {
    const computed = computeLineVat({
      amountCents: line.amountCents,
      includesVat: line.includesVat,
      ratePercent: reverseCharge ? 0 : (line.ratePercent ?? destinationRate),
    });
    return {
      ...computed,
      ...(line.key ? { key: line.key } : {}),
      ...(line.declaredRatePercent === undefined ? {} : { declaredRatePercent: line.declaredRatePercent }),
    };
  });

  const itemsGrossCents = lines.reduce((sum, line) => sum + line.grossCents, 0);

  // Répartition du port au prorata des montants encaissés.
  const shippingCents = Math.round(input.shippingAmountCents);
  if (!Number.isSafeInteger(shippingCents) || shippingCents < 0) {
    throw new Error('Frais de livraison invalides pour le calcul de TVA.');
  }
  const shippingLines: VatLineResult[] = [];
  let allocatedShippingCents = 0;
  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    // La dernière ligne absorbe le reliquat d'arrondi : la somme des parts est
    // alors exactement le port facturé, au centime près.
    const share = isLast || itemsGrossCents === 0
      ? shippingCents - allocatedShippingCents
      : roundHalfUp((shippingCents * line.grossCents) / itemsGrossCents);
    allocatedShippingCents += share;
    shippingLines.push(computeLineVat({
      amountCents: Math.max(0, share),
      includesVat: true,
      ratePercent: reverseCharge ? 0 : line.ratePercent,
    }));
  });
  const shipping: VatLineResult = {
    ratePercent: appliedRate,
    netCents: shippingLines.reduce((sum, line) => sum + line.netCents, 0),
    vatCents: shippingLines.reduce((sum, line) => sum + line.vatCents, 0),
    grossCents: shippingLines.reduce((sum, line) => sum + line.grossCents, 0),
  };

  // Ventilation par taux, triée du taux le plus élevé au plus bas.
  const byRate = new Map<number, { netCents: number; vatCents: number }>();
  for (const line of [...lines, ...shippingLines]) {
    const bucket = byRate.get(line.ratePercent) || { netCents: 0, vatCents: 0 };
    bucket.netCents += line.netCents;
    bucket.vatCents += line.vatCents;
    byRate.set(line.ratePercent, bucket);
  }
  const breakdown = [...byRate.entries()]
    .map(([ratePercent, amounts]) => ({ ratePercent, ...amounts }))
    .sort((a, b) => b.ratePercent - a.ratePercent);

  const totalNetCents = lines.reduce((sum, line) => sum + line.netCents, 0) + shipping.netCents;
  const totalVatCents = lines.reduce((sum, line) => sum + line.vatCents, 0) + shipping.vatCents;

  return {
    currency: 'EUR',
    country,
    ratePercent: appliedRate,
    reverseCharge,
    customerVatNumber: input.customerVatNumber?.trim() || null,
    lines,
    shipping,
    breakdown,
    totalNetCents,
    totalVatCents,
    totalGrossCents: totalNetCents + totalVatCents,
    itemsGrossCents,
    ratesAsOf: VAT_RATES_AS_OF,
  };
}

/**
 * Forme attendue d'un numéro de TVA par pays desservi.
 *
 * **La forme ne prouve rien.** Un numéro bien formé peut être inexistant ou
 * radié : seule une vérification VIES fait foi. Ces motifs servent à refuser
 * une saisie manifestement fausse avant d'appeler le service, pas à exonérer.
 */
const VAT_NUMBER_PATTERNS: Record<string, RegExp> = {
  FR: /^FR[0-9A-HJ-NP-Z]{2}[0-9]{9}$/,
  BE: /^BE0?[0-9]{9}$/,
  LU: /^LU[0-9]{8}$/,
  DE: /^DE[0-9]{9}$/,
  ES: /^ES[0-9A-Z][0-9]{7}[0-9A-Z]$/,
  IT: /^IT[0-9]{11}$/,
  NL: /^NL[0-9]{9}B[0-9]{2}$/,
  PT: /^PT[0-9]{9}$/,
};

/** Normalise un numéro saisi : espaces et tirets retirés, préfixe en majuscules. */
export function normalizeVatNumber(country: string, raw: unknown): string | null {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  const value = typeof raw === 'string' ? raw.replace(/[\s.-]/g, '').toUpperCase() : '';
  if (!value) return null;
  const withPrefix = value.startsWith(code) ? value : `${code}${value}`;
  return withPrefix;
}

/** Le numéro a-t-il la forme attendue pour ce pays ? (≠ numéro valide) */
export function isValidVatNumberFormat(country: string, raw: unknown): boolean {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  const pattern = VAT_NUMBER_PATTERNS[code];
  const normalized = normalizeVatNumber(code, raw);
  if (!pattern || !normalized) return false;
  return pattern.test(normalized);
}

export interface ReverseChargeDecision {
  eligible: boolean;
  reason: string;
}

/**
 * Décide de l'auto-liquidation.
 *
 * `vatNumberVerified` doit provenir d'une vérification VIES **réussie**. Ni la
 * présence du numéro, ni sa forme, ni une déclaration du client ne suffisent :
 * exonérer sans vérification ferait perdre la TVA due.
 */
export function isReverseChargeEligible(input: {
  country: string;
  vatNumberVerified: boolean;
  customerVatNumber?: string | null;
}): ReverseChargeDecision {
  const country = typeof input.country === 'string' ? input.country.trim().toUpperCase() : '';
  if (country === SELLER_COUNTRY) {
    return { eligible: false, reason: 'Vente domestique : l’auto-liquidation intracommunautaire ne s’applique pas.' };
  }
  if (!vatRateForCountry(country)) {
    return { eligible: false, reason: 'Pays non desservi : aucune règle de TVA applicable.' };
  }
  if (!input.vatNumberVerified) {
    return {
      eligible: false,
      reason: 'Numéro de TVA non vérifié auprès de VIES : la TVA normale reste appliquée.',
    };
  }
  if (!input.customerVatNumber || !isValidVatNumberFormat(country, input.customerVatNumber)) {
    return { eligible: false, reason: 'Numéro de TVA absent ou de forme invalide.' };
  }
  return {
    eligible: true,
    reason: 'Livraison intracommunautaire à un assujetti vérifié : exonérée, TVA autoliquidée par le client.',
  };
}

/** Libellé lisible d'un taux, pour les factures et l'affichage. */
export function formatVatRate(ratePercent: number): string {
  return `${ratePercent % 1 === 0 ? ratePercent.toFixed(0) : ratePercent.toFixed(1)} %`;
}
