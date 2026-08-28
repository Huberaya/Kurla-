import Stripe from 'stripe';

/**
 * CHANTIER 8.1 — client Stripe, extrait de `server.ts`.
 *
 * `null` quand la clé manque : les routes de paiement répondent alors une erreur
 * explicite plutôt que de simuler un encaissement.
 */
// Lazy Stripe Initialization
export function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
    timeout: 15_000,
    maxNetworkRetries: 2
  });
}
