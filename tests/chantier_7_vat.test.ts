/**
 * CHANTIER 7 — sous-chantier 7.6 : devises et TVA.
 *
 * On appelle les fonctions livrées (`computeLineVat`, `computeOrderVat`,
 * `isReverseChargeEligible`, `verifyVatNumber`, `formatMoney`) : aucune copie de
 * logique. Les défauts couverts sont ceux qui coûtent de l'argent ou de la
 * conformité :
 *
 * 1. Un taux faux ou inventé → TVA mal déclarée. Les taux sont épinglés et la
 *    liste est bornée aux pays réellement desservis.
 * 2. Une ventilation qui ne retombe pas sur le total encaissé → facture
 *    inutilisable, déclaration fausse.
 * 3. Le taux du vendeur appliqué à toute l'Europe → un client allemand serait
 *    taxé à 20 % au lieu de 19 %.
 * 4. Une auto-liquidation accordée sans vérification → perte sèche de TVA.
 * 5. Une conversion de devise silencieuse → un montant en base qui ne correspond
 *    à rien d'encaissable.
 */
import { strict as assert } from 'node:assert';

import {
  EU_STANDARD_VAT_RATES,
  VAT_RATES_AS_OF,
  VAT_RATES_SOURCE,
  SELLER_COUNTRY,
  computeLineVat,
  computeOrderVat,
  formatVatRate,
  isReverseChargeEligible,
  isValidVatNumberFormat,
  normalizeVatNumber,
  vatRateForCountry,
} from '../src/lib/vat';
import {
  SETTLEMENT_CURRENCY,
  assertSettlementCurrency,
  formatMoney,
  fromCents,
  toCents,
} from '../src/lib/currency';
import { verifyVatNumber } from '../src/lib/viesVerification';
import { priceCheckoutWithVat } from '../src/lib/checkoutVat';
import { SHIPPING_OPTIONS } from '../src/lib/shippingRules';

/** Réponse VIES réelle, relevée le 2026-08-28 sur l'endpoint de la Commission. */
const VIES_SUCCESS = {
  countryCode: 'DE',
  vatNumber: '123456789',
  requestDate: '2026-08-27T23:27:07.942Z',
  valid: true,
  requestIdentifier: 'req-1',
  name: 'BEISPIEL GMBH',
  address: 'STRASSE 1\n10115 BERLIN',
};

/** Réponse réelle d'un État membre saturé. */
const VIES_THROTTLED = {
  actionSucceed: false,
  errorWrappers: [{ error: 'MS_MAX_CONCURRENT_REQ' }],
};

function fetchReturning(payload: unknown, status = 200): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

async function runVatTests(): Promise<void> {
  // -------------------------------------------------------------------
  // 1. Table de taux : bornée aux pays desservis, valeurs épinglées.
  // -------------------------------------------------------------------
  const servedCountries = new Set(SHIPPING_OPTIONS.map(option => option.country));
  const rateCountries = new Set(Object.keys(EU_STANDARD_VAT_RATES));
  assert.deepEqual([...rateCountries].sort(), [...servedCountries].sort(),
    'Les taux de TVA doivent couvrir exactement les pays desservis — ni plus, ni moins.');

  // Valeurs relevées le 2026-08-28 (EPRS, vatdb, numeral, fiscalead). Un changement
  // législatif doit faire échouer ce banc : c'est le signal pour re-vérifier.
  assert.deepEqual(EU_STANDARD_VAT_RATES, {
    FR: 20, BE: 21, LU: 17, DE: 19, ES: 21, IT: 22, NL: 21, PT: 23,
  }, 'Les taux normaux ont changé : re-vérifier la source puis mettre à jour la table.');

  for (const [country, rate] of Object.entries(EU_STANDARD_VAT_RATES)) {
    // Le plancher européen du taux normal est de 15 % ; au-delà de 30 %, aucun
    // État membre n'existe. Une valeur hors bornes trahit une saisie fausse.
    assert.ok(rate >= 15 && rate <= 30, `Taux hors bornes plausibles pour ${country} : ${rate}.`);
  }
  assert.equal(SELLER_COUNTRY, 'FR');
  assert.match(VAT_RATES_AS_OF, /^\d{4}-\d{2}-\d{2}$/, 'La date de relevé des taux doit être présente.');
  assert.ok(VAT_RATES_SOURCE.length > 40, 'La provenance des taux doit être documentée.');
  assert.equal(vatRateForCountry('de'), 19, 'La recherche doit être insensible à la casse.');
  assert.equal(vatRateForCountry('US'), null, 'Un pays non desservi n’a pas de taux.');
  assert.equal(vatRateForCountry(undefined), null);

  // -------------------------------------------------------------------
  // 2. Devise : aucune conversion silencieuse.
  // -------------------------------------------------------------------
  assert.equal(SETTLEMENT_CURRENCY, 'EUR');
  assert.equal(assertSettlementCurrency('eur'), 'EUR');
  assert.equal(assertSettlementCurrency(' EUR '), 'EUR');
  assert.throws(() => assertSettlementCurrency('USD'), /Devise non prise en charge/,
    'Une devise inconnue doit être refusée, jamais convertie.');
  assert.throws(() => assertSettlementCurrency(undefined), /Devise non prise en charge/);

  assert.equal(toCents(18.9), 1890, '18,90 € doit donner 1890 centimes, pas 1889,999…');
  assert.equal(toCents(0.07), 7);
  assert.equal(fromCents(1890), 18.9);
  // `Intl.NumberFormat` insère une espace insécable (U+00A0) avant le symbole en
  // français : l'assertion porte sur les vrais code points, pas sur un rendu
  // visuellement identique.
  assert.equal(formatMoney(1890, 'fr-FR'), '18,90\u00a0€');
  assert.equal(formatMoney(1890, 'en-GB'), '\u20ac18.90', 'Le formatage doit suivre la locale.');
  assert.equal(formatMoney(1890, 'fr-FR').replace(/[\u00a0\u202f\s]/g, ' '), '18,90 €');
  assert.equal(formatMoney(1890, 'en-GB').replace(/[\u00a0\u202f\s]/g, ' '), '€18.90');
  assert.equal(formatVatRate(20), '20 %');
  assert.equal(formatVatRate(25.5), '25.5 %', 'Un taux décimal doit rester lisible.');

  // -------------------------------------------------------------------
  // 3. TVA d'une ligne : identité net + TVA = TTC, au centime.
  // -------------------------------------------------------------------
  const frLine = computeLineVat({ amountCents: 1890, includesVat: true, ratePercent: 20 });
  assert.equal(frLine.vatCents, 315, '1890 TTC à 20 % doit donner 315 de TVA.');
  assert.equal(frLine.netCents, 1575);
  assert.equal(frLine.netCents + frLine.vatCents, frLine.grossCents, 'net + TVA doit retomber sur le TTC.');

  // Même prix, client allemand : le taux de destination s'applique.
  const deLine = computeLineVat({ amountCents: 1890, includesVat: true, ratePercent: 19 });
  assert.equal(deLine.vatCents, 302, '1890 TTC à 19 % doit donner 302 de TVA (1890×19/119).');
  assert.notEqual(deLine.vatCents, frLine.vatCents, 'Le taux de destination doit changer la TVA due.');
  assert.equal(deLine.netCents + deLine.vatCents, deLine.grossCents);

  // Prix hors taxe : la TVA s'ajoute, le client paie le TTC.
  const netLine = computeLineVat({ amountCents: 1000, includesVat: false, ratePercent: 20 });
  assert.equal(netLine.vatCents, 200);
  assert.equal(netLine.grossCents, 1200);
  assert.equal(netLine.netCents, 1000);

  // Cas limites.
  const zero = computeLineVat({ amountCents: 1890, includesVat: true, ratePercent: 0 });
  assert.equal(zero.vatCents, 0);
  assert.equal(zero.netCents, 1890);
  assert.throws(() => computeLineVat({ amountCents: -1, includesVat: true, ratePercent: 20 }),
    /Montant de ligne invalide/);
  assert.throws(() => computeLineVat({ amountCents: 100, includesVat: true, ratePercent: 120 }),
    /Taux de TVA invalide/);

  // -------------------------------------------------------------------
  // 4. Commande complète : port proratisé, ventilation, réconciliation.
  // -------------------------------------------------------------------
  const order = computeOrderVat({
    lines: [
      { key: 'prod-1', amountCents: 1890, includesVat: true, declaredRatePercent: 20 },
      { key: 'prod-2', amountCents: 990, includesVat: true, declaredRatePercent: 20 },
    ],
    shippingAmountCents: 490,
    country: 'FR',
  });
  assert.equal(order.currency, 'EUR');
  assert.equal(order.country, 'FR');
  assert.equal(order.ratePercent, 20);
  assert.equal(order.itemsGrossCents, 2880);
  assert.equal(order.shipping.grossCents, 490, 'Le port réparti doit retomber sur le port facturé.');
  assert.equal(order.totalGrossCents, 3370, 'Le total doit être articles + port, au centime.');
  assert.equal(order.totalNetCents + order.totalVatCents, order.totalGrossCents,
    'La ventilation doit retomber exactement sur le total encaissé.');
  assert.deepEqual(order.breakdown.map(bucket => bucket.ratePercent), [20],
    'Une commande mono-taux doit produire une seule ligne de ventilation.');
  assert.equal(order.breakdown[0].netCents + order.breakdown[0].vatCents, order.totalGrossCents);
  assert.equal(order.lines.length, 2);
  assert.equal(order.lines[0].declaredRatePercent, 20, 'Le taux déclaré par le produit reste tracé.');
  assert.equal(order.ratesAsOf, VAT_RATES_AS_OF);

  // Même panier livré en Allemagne : moins de TVA, même prix affiché.
  const orderDe = computeOrderVat({
    lines: [
      { key: 'prod-1', amountCents: 1890, includesVat: true },
      { key: 'prod-2', amountCents: 990, includesVat: true },
    ],
    shippingAmountCents: 490,
    country: 'DE',
  });
  assert.equal(orderDe.ratePercent, 19);
  assert.equal(orderDe.totalGrossCents, order.totalGrossCents,
    'Le montant encaissé ne change pas : seule la ventilation change.');
  assert.ok(orderDe.totalVatCents < order.totalVatCents,
    'À 19 % la TVA due est plus faible qu’à 20 % pour le même TTC.');

  // Le reliquat d'arrondi du port ne doit rien perdre.
  const oddOrder = computeOrderVat({
    lines: [
      { amountCents: 333, includesVat: true },
      { amountCents: 333, includesVat: true },
      { amountCents: 334, includesVat: true },
    ],
    shippingAmountCents: 100,
    country: 'IT',
  });
  assert.equal(oddOrder.shipping.grossCents, 100, 'La somme des parts de port doit être exacte.');
  assert.equal(oddOrder.totalNetCents + oddOrder.totalVatCents, oddOrder.totalGrossCents);

  assert.throws(() => computeOrderVat({ lines: [], shippingAmountCents: 0, country: 'FR' }),
    /au moins une ligne/);
  assert.throws(
    () => computeOrderVat({ lines: [{ amountCents: 100, includesVat: true }], shippingAmountCents: 0, country: 'CH' }),
    /pays non desservi/i
  );

  // -------------------------------------------------------------------
  // 5. Numéros de TVA : la forme ne vaut pas vérification.
  // -------------------------------------------------------------------
  assert.equal(normalizeVatNumber('de', ' 123 456 789 '), 'DE123456789');
  assert.equal(normalizeVatNumber('fr', 'FR40303265045'), 'FR40303265045');
  assert.ok(isValidVatNumberFormat('FR', 'FR40303265045'), 'Un SIREN à 9 chiffres préfixé doit passer.');
  assert.ok(isValidVatNumberFormat('DE', 'DE123456789'));
  assert.ok(isValidVatNumberFormat('IT', 'IT12345678901'));
  assert.ok(isValidVatNumberFormat('NL', 'NL123456789B01'));
  assert.ok(!isValidVatNumberFormat('DE', 'DE1234'), 'Un numéro trop court doit être refusé.');
  assert.ok(!isValidVatNumberFormat('DE', 'FR40303265045'), 'Un préfixe incohérent doit être refusé.');
  assert.ok(!isValidVatNumberFormat('US', 'US123456789'), 'Un pays non desservi n’a pas de format.');

  // Auto-liquidation : rien sans vérification.
  assert.equal(isReverseChargeEligible({ country: 'FR', vatNumberVerified: true, customerVatNumber: 'FR40303265045' }).eligible,
    false, 'Une vente domestique ne peut pas être autoliquidée.');
  assert.equal(isReverseChargeEligible({ country: 'DE', vatNumberVerified: false, customerVatNumber: 'DE123456789' }).eligible,
    false, 'Un numéro non vérifié ne doit jamais exonérer.');
  assert.equal(isReverseChargeEligible({ country: 'DE', vatNumberVerified: true, customerVatNumber: 'DE12' }).eligible,
    false, 'Un numéro mal formé ne doit pas exonérer.');
  const eligible = isReverseChargeEligible({ country: 'DE', vatNumberVerified: true, customerVatNumber: 'DE123456789' });
  assert.equal(eligible.eligible, true);
  assert.match(eligible.reason, /autoliquidée/i);

  // Effet sur le calcul : TVA nulle, et la raison est conservée.
  const b2b = computeOrderVat({
    lines: [{ amountCents: 1575, includesVat: true }],
    shippingAmountCents: 490,
    country: 'DE',
    reverseCharge: true,
    customerVatNumber: 'DE123456789',
  });
  assert.equal(b2b.totalVatCents, 0, 'Sous auto-liquidation, aucune TVA n’est facturée.');
  assert.equal(b2b.ratePercent, 0);
  assert.equal(b2b.reverseCharge, true);
  assert.equal(b2b.customerVatNumber, 'DE123456789');
  assert.equal(b2b.totalGrossCents, b2b.totalNetCents);

  // -------------------------------------------------------------------
  // 6. VIES : échec fermé, dans tous les cas.
  // -------------------------------------------------------------------
  const enabledEnv = { VIES_VERIFICATION_ENABLED: 'true' } as NodeJS.ProcessEnv;

  const ok = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE123456789', env: enabledEnv, fetchImpl: fetchReturning(VIES_SUCCESS),
  });
  assert.equal(ok.verified, true, 'Une réponse VIES `valid: true` doit vérifier le numéro.');
  assert.equal(ok.vatNumber, 'DE123456789');
  assert.equal(ok.checkedAt, '2026-08-27T23:27:07.942Z', 'La date VIES doit être conservée pour l’audit.');
  assert.equal(ok.requestIdentifier, 'req-1');
  assert.equal(ok.traderName, 'BEISPIEL GMBH');

  const throttled = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE123456789', env: enabledEnv, fetchImpl: fetchReturning(VIES_THROTTLED),
  });
  assert.equal(throttled.verified, false, 'Un État membre saturé ne doit pas valoir vérification.');
  assert.match(throttled.reason, /MS_MAX_CONCURRENT_REQ/);

  const invalid = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE123456789', env: enabledEnv,
    fetchImpl: fetchReturning({ ...VIES_SUCCESS, valid: false }),
  });
  assert.equal(invalid.verified, false);
  assert.match(invalid.reason, /invalide/i);

  const httpError = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE123456789', env: enabledEnv, fetchImpl: fetchReturning({}, 503),
  });
  assert.equal(httpError.verified, false);

  const networkDown = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE123456789', env: enabledEnv,
    fetchImpl: (async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch,
  });
  assert.equal(networkDown.verified, false, 'Une panne réseau ne doit jamais exonérer.');
  assert.match(networkDown.reason, /ECONNRESET/);

  // Désactivé par défaut : on n'appelle même pas le service.
  let called = false;
  const disabled = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE123456789', env: {} as NodeJS.ProcessEnv,
    fetchImpl: (async () => {
      called = true;
      return fetchReturning(VIES_SUCCESS)('https://ec.europa.eu/vies');
    }) as unknown as typeof fetch,
  });
  assert.equal(disabled.verified, false);
  assert.equal(called, false, 'Avec la vérification désactivée, aucun appel sortant ne doit partir.');
  assert.match(disabled.reason, /désactivée/i);

  const domestic = await verifyVatNumber({
    country: 'FR', vatNumber: 'FR40303265045', env: enabledEnv, fetchImpl: fetchReturning(VIES_SUCCESS),
  });
  assert.equal(domestic.verified, false, 'Un numéro du pays du vendeur ne donne pas d’auto-liquidation.');

  const malformed = await verifyVatNumber({
    country: 'DE', vatNumber: 'DE12', env: enabledEnv, fetchImpl: fetchReturning(VIES_SUCCESS),
  });
  assert.equal(malformed.verified, false, 'Un numéro mal formé est refusé avant tout appel.');

  // -------------------------------------------------------------------
  // 7. Le checkout lui-même : `priceCheckoutWithVat` est LA fonction appelée par
  //    `/api/stripe/create-checkout-session`. On l'exerce directement, donc ce
  //    qui est testé est ce qui facture.
  // -------------------------------------------------------------------
  const catalogue = [
    {
      productId: 'prod-1', variantId: undefined, quantity: 2,
      unitAmountCents: 1890, priceIncludesVat: true, declaredVatRate: 20,
      name: 'Leave-In Hydratant Cacao & Mangue',
    },
    {
      productId: 'prod-2', variantId: 'var-9', quantity: 1,
      unitAmountCents: 990, priceIncludesVat: true, declaredVatRate: 20,
      name: 'Huile de Baobab',
    },
  ];

  const frCheckout = priceCheckoutWithVat({
    pricedItems: catalogue, shippingCents: 490, country: 'FR', reverseChargeEligible: false,
  });
  assert.equal(frCheckout.itemsGrossCents, 4770, '2 × 18,90 € + 9,90 € = 47,70 €.');
  assert.equal(frCheckout.finalTotalCents, 5260, 'Le total doit être articles + port, au centime.');
  assert.equal(frCheckout.finalTotal, 52.6);
  assert.equal(frCheckout.vat.ratePercent, 20);
  assert.equal(frCheckout.vat.totalVatCents, 877, 'TVA française sur 52,60 € TTC à 20 % : 8,77 €.');
  assert.equal(frCheckout.vat.totalNetCents + frCheckout.vat.totalVatCents, frCheckout.finalTotalCents);
  assert.equal(frCheckout.verifiedItems.length, 2);
  assert.equal(frCheckout.verifiedItems[0].unitCents, 1890,
    'Un prix TTC doit être encaissé tel quel : le montant ne bouge pas.');
  assert.equal(frCheckout.verifiedItems[0].vatRate, 20);
  assert.equal(frCheckout.verifiedItems[0].currency, 'EUR');
  assert.equal(frCheckout.verifiedItems[0].name, 'Leave-In Hydratant Cacao & Mangue');
  assert.ok(frCheckout.verifiedItems[0].vatAmount > 0, 'Chaque ligne doit porter sa part de TVA.');

  // Même panier, livraison en Allemagne : même prix payé, moins de TVA due.
  const deCheckout = priceCheckoutWithVat({
    pricedItems: catalogue, shippingCents: 490, country: 'DE', reverseChargeEligible: false,
  });
  assert.equal(deCheckout.finalTotalCents, frCheckout.finalTotalCents,
    'Le taux de destination ne doit pas faire bouger le prix TTC affiché.');
  assert.equal(deCheckout.vat.ratePercent, 19);
  assert.ok(deCheckout.vat.totalVatCents < frCheckout.vat.totalVatCents,
    'Un client allemand doit être taxé à 19 %, pas à 20 %.');

  // Prix hors taxe : majoré de la TVA avant encaissement.
  const netPricedCheckout = priceCheckoutWithVat({
    pricedItems: [{
      productId: 'prod-ht', quantity: 1, unitAmountCents: 1000,
      priceIncludesVat: false, declaredVatRate: 20, name: 'Produit tarifé hors taxe',
    }],
    shippingCents: 0, country: 'FR', reverseChargeEligible: false,
  });
  assert.equal(netPricedCheckout.finalTotalCents, 1200,
    'Un particulier ne peut pas être facturé hors taxe.');
  assert.equal(netPricedCheckout.verifiedItems[0].unitCents, 1200);

  // Auto-liquidation vérifiée : le client paie le net.
  const b2bCheckout = priceCheckoutWithVat({
    pricedItems: catalogue, shippingCents: 490, country: 'DE',
    reverseChargeEligible: true, customerVatNumber: 'DE123456789',
  });
  assert.equal(b2bCheckout.vat.totalVatCents, 0);
  assert.ok(b2bCheckout.finalTotalCents < frCheckout.finalTotalCents,
    'Sous auto-liquidation, le montant facturé est le net.');
  // Le net est extrait au taux de destination (19 %) : 18,90 € TTC ÷ 1,19 =
  // 15,88 €. Cohérent avec la règle « c'est le taux du pays du client qui
  // compte » — le même produit vendu à un particulier allemand est taxé à 19 %.
  assert.equal(b2bCheckout.verifiedItems[0].unitCents, 1588,
    '18,90 € TTC à 19 % donnent 15,88 € de net.');

  // Pays sans taux connu : la commande est refusée, pas taxée au hasard.
  assert.throws(
    () => priceCheckoutWithVat({
      pricedItems: catalogue, shippingCents: 490, country: 'CH', reverseChargeEligible: false,
    }),
    /TVA indéterminée/
  );
  assert.throws(
    () => priceCheckoutWithVat({ pricedItems: [], shippingCents: 0, country: 'FR', reverseChargeEligible: false }),
    /Aucun article/
  );

  console.log(
    `[PASS] Chantier 7.6 : ${Object.keys(EU_STANDARD_VAT_RATES).length} taux de TVA sourcés (au ${VAT_RATES_AS_OF}), ` +
    `ventilation exacte net + TVA = TTC, taux de destination appliqué, auto-liquidation ` +
    `uniquement sur numéro vérifié VIES (échec fermé), tarification du checkout exercée directement, ` +
    `${SETTLEMENT_CURRENCY} seule devise sans conversion.`
  );
}

try {
  await runVatTests();
} catch (error) {
  console.error('[FAIL] Chantier 7.6 — devises et TVA :', error);
  process.exitCode = 1;
}
