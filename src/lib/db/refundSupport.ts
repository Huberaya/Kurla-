import Stripe from 'stripe';

import type { CustomerRefund } from '../serverDb';

/**
 * CHANTIER 8.2b — aides du domaine retours/remboursements.
 *
 * Isolées de `returnsStore.ts` à dessein : `bindDomain` recolle **toutes** les
 * fonctions exportées d'un module de domaine sur le store. Une aide qui n'est
 * pas une méthode du store n'a donc pas sa place dans ce module — sinon elle
 * apparaît dans l'API publique, ce que l'inventaire de référence signale.
 */
export function getStripeServerClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
    timeout: 15_000,
    maxNetworkRetries: 2
  }) : null;
}

export function mapRefundRow(row: any): CustomerRefund {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentId: row.payment_id || undefined,
    returnId: row.return_id || undefined,
    userId: row.user_id || undefined,
    amount: Number(row.amount),
    currency: row.currency,
    reason: row.reason || undefined,
    stripeRefundId: row.stripe_refund_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    stockRestored: row.stock_restored === true,
    items: Array.isArray(row.items) ? row.items.map((item: any) => ({
      productId: item.productId || item.product_id,
      variantId: item.variantId || item.variant_id || undefined,
      quantity: Number(item.quantity)
    })) : [],
    status: row.status,
    createdAt: row.created_at
  };
}
