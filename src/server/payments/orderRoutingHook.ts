/**
 * JONCTION COMMANDE → ROUTEUR (16/09/2026).
 *
 * `freezeOrderRouting` est appelée une fois la commande confirmée payée.
 * Elle FIGE la route de fulfillment de chaque ligne dans `order_item_routes`.
 *
 * Garde-fou : un échec de routage ne doit JAMAIS faire échouer un paiement
 * confirmé — l'erreur est journalisée et la commande pourra être routée
 * manuellement depuis le dashboard (bouton « Router »).
 *
 * Idempotent : une commande déjà routée n'est pas re-routée (l'histoire ne
 * change pas). Le recalcul volontaire passe par `force`.
 */

import { serverDb } from '../../lib/serverDb';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { mapProductSource, type ProductSource } from '../../lib/supplyModel';
import { routeOrderItems } from '../../lib/orderRouting';

export async function freezeOrderRouting(
  orderId: string,
  options: { force?: boolean } = {},
): Promise<{ frozen: number; alreadyFrozen?: boolean; blocked: boolean }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { frozen: 0, blocked: false };

  if (!options.force) {
    const { data: existing } = await supabase.from('order_item_routes').select('id').eq('order_id', orderId).limit(1);
    if (existing && existing.length > 0) return { frozen: 0, alreadyFrozen: true, blocked: false };
  }

  const order = await serverDb.findOrder({ orderId });
  if (!order) return { frozen: 0, blocked: false };

  const items = (order.items || []).map((item: any) => ({
    id: item.id != null ? String(item.id) : undefined,
    productId: String(item.productId || item.product_id || ''),
    name: item.name != null ? String(item.name) : null,
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
  })).filter((item: any) => item.productId !== '');

  if (items.length === 0) return { frozen: 0, blocked: false };

  const productIds = Array.from(new Set(items.map((item: any) => item.productId)));
  const [sourcesRows, suppliersRows] = await Promise.all([
    supabase.from('product_sources').select('*').in('product_id', productIds),
    supabase.from('suppliers').select('id, legal_name, trade_name'),
  ]);

  const sourcesByProduct: Record<string, ProductSource[]> = {};
  for (const row of sourcesRows.data || []) {
    const source = mapProductSource(row);
    (sourcesByProduct[source.productId] = sourcesByProduct[source.productId] || []).push(source);
  }
  const supplierNameById: Record<string, string> = {};
  for (const supplier of suppliersRows.data || []) {
    const name = supplier.legal_name || supplier.trade_name;
    if (name) supplierNameById[String(supplier.id)] = String(name);
  }

  const plan = routeOrderItems(items, sourcesByProduct, supplierNameById);

  if (options.force) {
    await supabase.from('order_item_routes').delete().eq('order_id', orderId);
  }
  const rows = plan.routes.map(route => ({
    order_id: orderId,
    order_item_id: route.orderItemId,
    product_id: route.productId,
    product_name: route.productName,
    quantity: route.quantity,
    source_id: route.sourceId,
    model: route.model,
    responsible: route.responsible,
    responsible_kind: route.responsibleKind,
    lead_time_days: route.leadTimeDays,
    ships_from: route.shipsFrom,
    blockers: route.blockers.length > 0 ? route.blockers.join(' · ') : null,
  }));
  const { error } = await supabase.from('order_item_routes').insert(rows);
  if (error) throw error;

  return { frozen: plan.routes.length, blocked: plan.blocked };
}
