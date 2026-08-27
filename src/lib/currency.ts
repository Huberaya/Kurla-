/**
 * CHANTIER 7.6 — modèle de devise.
 *
 * KURLA encaisse en **euros**. Ce n'est pas une approximation : la base refuse
 * déjà un remboursement ou un paiement dans une autre devise
 * (`20260827000000_refund_integrity.sql` et `20260839000000_atomic_stock_lifecycle.sql`
 * lèvent une exception si `lower(currency) <> 'eur'`), et Stripe est appelé avec
 * `currency: 'eur'` sur chaque ligne. Ce module rend cette règle explicite côté
 * application au lieu de la laisser répartie en constantes.
 *
 * Pourquoi il n'y a **pas** de table de conversion : afficher un prix en GBP ou
 * en USD exigerait un taux de change. Un taux que nous n'aurions pas sourcé
 * serait un fait inventé, et un prix affiché que nous ne pouvons pas encaisser
 * serait une promesse fausse. Tant que l'encaissement multidevise n'est pas
 * branché (Stripe), la seule conversion honnête est aucune conversion :
 * `assertSettlementCurrency` refuse au lieu d'arrondir.
 *
 * Tout l'argent circule en **centimes entiers**. Les montants flottants en euros
 * (`order.total`) existent pour l'API et Stripe ; les calculs de TVA, eux, ne
 * quittent jamais les entiers, pour qu'aucune somme ne dérive de quelques
 * centimes au fil des lignes.
 */

/** Devise d'encaissement. La seule acceptée, côté base comme côté Stripe. */
export const SETTLEMENT_CURRENCY = 'EUR';

/**
 * Vérifie qu'une devise est bien celle d'encaissement. Lève une erreur sinon :
 * convertir silencieusement produirait un montant faux en base.
 */
export function assertSettlementCurrency(code: unknown): 'EUR' {
  const value = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (value !== SETTLEMENT_CURRENCY) {
    throw new Error(
      `Devise non prise en charge : « ${String(code ?? '')} ». ` +
      `KURLA encaisse uniquement en ${SETTLEMENT_CURRENCY} ; aucune conversion n'est appliquée.`
    );
  }
  return SETTLEMENT_CURRENCY;
}

/** Arrondi bancaire « au demi supérieur », sur des centimes. */
export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

/** Euros → centimes entiers. `18.9` donne `1890`, pas `1889.9999…`. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error('Montant invalide.');
  return roundHalfUp(amount * 100);
}

/** Centimes → euros, à deux décimales. */
export function fromCents(cents: number): number {
  if (!Number.isSafeInteger(cents)) throw new Error('Montant en centimes invalide.');
  return cents / 100;
}

/**
 * Formate des centimes dans la devise d'encaissement, selon la locale.
 *
 * `fr-FR` → « 18,90 € » ; `en-GB` → « €18.90 ». `Intl.NumberFormat` gère le
 * séparateur décimal, l'espace insécable et la position du symbole : le
 * réécrire à la main produirait un affichage faux dès la deuxième langue.
 */
export function formatMoney(cents: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: SETTLEMENT_CURRENCY,
  }).format(fromCents(cents));
}

/** Formate un montant exprimé en euros (API, prix produits). */
export function formatAmount(amount: number, locale = 'fr-FR'): string {
  return formatMoney(toCents(amount), locale);
}
