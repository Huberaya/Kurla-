import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

function env(...names: string[]): string | undefined {
  return names.map(name => process.env[name]).find(Boolean);
}

const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

if (!url || !serviceKey) {
  console.error('[SKIP] Phase 7 PostgreSQL concurrency test: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(0);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const orderIds: string[] = [];

async function rpc(name: string, args: Record<string, unknown>) {
  const result = await db.rpc(name, args);
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  return result.data;
}

async function main() {
  const { data: product, error: productError } = await db
    .from('products')
    .select('id, name, price, stock_quantity')
    .eq('is_active', true)
    .limit(1)
    .single();
  if (productError || !product) throw new Error(`Produit de test indisponible: ${productError?.message || 'absent'}`);

  const { data: before, error: inventoryError } = await db
    .from('inventory')
    .select('quantity, reserved_quantity')
    .eq('product_id', product.id)
    .is('variant_id', null)
    .single();
  if (inventoryError || !before) throw new Error(`Inventaire de test indisponible: ${inventoryError?.message || 'absent'}`);

  const originalQuantity = Number(before.quantity);
  const originalReserved = Number(before.reserved_quantity || 0);
  const testQuantity = originalReserved + 1;
  const item = { productId: product.id, quantity: 1, price: Number(product.price), name: product.name };

  const createArgs = (orderId: string, checkoutKey: string, value: unknown = item) => ({
    p_order_id: orderId,
    p_user_id: null,
    p_customer_email: `phase7-${suffix}@example.invalid`,
    p_items: [value],
    p_total: Number(product.price),
    p_status: 'payment_pending_webhook',
    p_stripe_session_id: null,
    p_stripe_payment_intent_id: null,
    p_checkout_idempotency_key: checkoutKey,
    p_shipping_address: null,
    p_created_at: new Date().toISOString()
  });

  try {
    await rpc('set_inventory_quantity_atomic', {
      p_product_id: product.id,
      p_variant_id: null,
      p_quantity: testQuantity
    });

    // Two independent checkout transactions compete for one available unit.
    // Exactly one can reserve it; the failed transaction must not create an
    // order or leave a reservation behind.
    const concurrentIds = [`ORD-PH7-A-${suffix}`, `ORD-PH7-B-${suffix}`];
    orderIds.push(...concurrentIds);
    const concurrent = await Promise.allSettled(concurrentIds.map(id =>
      rpc('create_order_with_stock_reservation', createArgs(id, `checkout-${id}`))
    ));
    const fulfilled = concurrent.filter(result => result.status === 'fulfilled');
    const rejected = concurrent.filter(result => result.status === 'rejected');
    if (fulfilled.length !== 1 || rejected.length !== 1) {
      throw new Error(`Course concurrente inattendue: ${fulfilled.length} succès, ${rejected.length} échec(s).`);
    }

    const { data: afterConcurrent } = await db
      .from('inventory')
      .select('quantity, reserved_quantity, available_quantity')
      .eq('product_id', product.id)
      .is('variant_id', null)
      .single();
    if (!afterConcurrent || Number(afterConcurrent.reserved_quantity) !== originalReserved + 1 || Number(afterConcurrent.available_quantity) !== 0) {
      throw new Error('La course concurrente a laissé un stock/réservation incohérent.');
    }

    const successfulOrderId = concurrentIds[concurrent.findIndex(result => result.status === 'fulfilled')];
    const transition = await rpc('transition_order_stock', {
      p_order_id: successfulOrderId,
      p_new_status: 'paid',
      p_stripe_payment_intent_id: `pi-${suffix}`,
      p_changed_by: null,
      p_changed_by_role: 'system',
      p_reason: 'phase7 concurrency',
      p_restock_items: []
    });
    if (!(transition as any)?.status || (transition as any).status !== 'paid') throw new Error('Confirmation atomique impossible.');

    const { data: afterPaid } = await db.from('inventory').select('quantity, reserved_quantity, available_quantity').eq('product_id', product.id).is('variant_id', null).single();
    if (!afterPaid || Number(afterPaid.quantity) !== originalReserved || Number(afterPaid.reserved_quantity) !== originalReserved || Number(afterPaid.available_quantity) !== 0) {
      throw new Error('La confirmation n’a pas consommé exactement la réservation.');
    }

    // A retry of the same transition is a no-op.
    await rpc('transition_order_stock', {
      p_order_id: successfulOrderId,
      p_new_status: 'paid',
      p_stripe_payment_intent_id: `pi-${suffix}`,
      p_changed_by: null,
      p_changed_by_role: 'system',
      p_reason: 'phase7 retry',
      p_restock_items: []
    });
    const { data: afterTransitionRetry } = await db.from('inventory').select('quantity, reserved_quantity').eq('product_id', product.id).is('variant_id', null).single();
    if (!afterTransitionRetry || Number(afterTransitionRetry.quantity) !== originalReserved || Number(afterTransitionRetry.reserved_quantity) !== originalReserved) {
      throw new Error('Le retry du webhook a modifié le stock.');
    }

    // A failure after reservation but before order_items insertion must roll
    // back the reservation as well as the partial order.
    const partialOrderId = `ORD-PH7-PARTIAL-${suffix}`;
    orderIds.push(partialOrderId);
    const partial = await Promise.allSettled([rpc('create_order_with_stock_reservation', createArgs(partialOrderId, `partial-${suffix}`, {
      productId: product.id,
      quantity: 1,
      name: product.name
      // Missing price intentionally violates order_items.unit_price.
    }))]);
    if (partial[0].status !== 'rejected') throw new Error('L’échec partiel volontaire n’a pas été rejeté.');
    const { data: afterPartial } = await db.from('inventory').select('quantity, reserved_quantity, available_quantity').eq('product_id', product.id).is('variant_id', null).single();
    if (!afterPartial || Number(afterPartial.quantity) !== originalReserved || Number(afterPartial.reserved_quantity) !== originalReserved) {
      throw new Error('L’échec partiel a laissé une réservation orpheline.');
    }

    // Refund ledger retries restore the physical unit exactly once.
    const refundKey = `refund-${suffix}`;
    const refundArgs = {
      p_order_id: successfulOrderId,
      p_return_id: null,
      p_user_id: null,
      p_amount: Number(product.price),
      p_currency: 'EUR',
      p_reason: 'phase7 idempotence',
      p_stripe_refund_id: `re-${suffix}`,
      p_idempotency_key: refundKey,
      p_status: 'succeeded',
      p_items: [{ product_id: product.id, quantity: 1 }],
      p_apply_stock: true
    };
    await rpc('finalize_refund', refundArgs);
    await rpc('finalize_refund', refundArgs);
    const { data: afterRefund } = await db.from('inventory').select('quantity, reserved_quantity, available_quantity').eq('product_id', product.id).is('variant_id', null).single();
    if (!afterRefund || Number(afterRefund.quantity) !== originalReserved + 1 || Number(afterRefund.reserved_quantity) !== originalReserved || Number(afterRefund.available_quantity) !== 1) {
      throw new Error('Le retry du remboursement a restauré le stock plus d’une fois.');
    }

    console.log('[PASS] Phase 7 PostgreSQL: course concurrente, rollback d’échec partiel, confirmation et remboursement idempotents validés.');
  } finally {
    // Restore the test SKU and remove any committed test orders. A pending
    // failed order is released before deletion so its reservation is not
    // carried into the next integration run.
    for (const orderId of orderIds) {
      const { data: order } = await db.from('orders').select('status').eq('id', orderId).maybeSingle();
      if (order && ['pending_payment', 'payment_pending_webhook'].includes(order.status)) {
        await db.rpc('transition_order_stock', {
          p_order_id: orderId,
          p_new_status: 'payment_failed',
          p_changed_by: null,
          p_changed_by_role: 'system',
          p_reason: 'phase7 cleanup',
          p_restock_items: []
        });
      }
    }
    await db.from('orders').delete().in('id', orderIds);
    await db.rpc('set_inventory_quantity_atomic', {
      p_product_id: product.id,
      p_variant_id: null,
      p_quantity: originalQuantity
    });
  }
}

main().catch(error => {
  console.error('[FAIL] Phase 7 PostgreSQL:', error);
  process.exitCode = 1;
});
