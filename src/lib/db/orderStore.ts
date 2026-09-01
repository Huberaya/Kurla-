import { randomUUID } from 'node:crypto';

import type { EmailMessage } from '../emailService';
import { getSupabaseServerClient } from '../supabaseClient';
import {
  emailTemplateForOrderStatus,
  orderEmailData,
  ensureDatabaseSuccess,
  mapOrderVatFields,
  recordLoyaltySafely,
  toPublicProduct,
} from './internal';

import type {
  OrderStatus,
  OrderStatusHistoryEntry,
  ServerOrder,
  ServerOrderItem,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2c — commandes et panier : création, session Stripe, lecture,
 * transition de statut, historique et TVA. Sorti de `serverDb.ts`.
 *
 * Le verrou de stock (`withLocalStockLock`) et la réservation locale
 * (`reserveLocalStockUnlocked`) restent dans le noyau : ils protègent l'état
 * partagé du singleton.
 */
/**
 * Commande de PRÉCOMMANDE : contrairement à `saveOrder`, on ne réserve AUCUN
 * stock (le premier lot n'est pas encore réceptionné). On crée néanmoins la
 * commande, ses lignes, son entrée de paiement et son historique dans le même
 * ordre que la RPC atomique, pour que le webhook Stripe puisse ensuite la
 * confirmer (`paid`) comme n'importe quelle commande. Idempotent : une relance
 * de checkout avec le même idempotency key / id renvoie la commande existante.
 */
export async function savePreorderOrder(store: SupabaseServerStore, order: ServerOrder): Promise<ServerOrder> {
    const supabase = getSupabaseServerClient();

    // Mémoire (mode hors-ligne) : pas de réserve de stock, on stocke tel quel.
    if (!supabase) {
        const idx = store.inMemoryOrders.findIndex(o => o.id === order.id);
        if (idx >= 0) return store.inMemoryOrders[idx];
        store.inMemoryOrders.unshift(order);
        return order;
    }

    // Idempotence : ne pas recréer la commande si elle existe déjà.
    const { data: existing, error: findError } = await supabase.from('orders').select('*').eq('id', order.id).maybeSingle();
    ensureDatabaseSuccess('vérification commande précommande', findError);
    if (existing) {
      const persisted: ServerOrder = { ...order, status: existing.status, stripeSessionId: existing.stripe_session_id ?? order.stripeSessionId, stripePaymentIntentId: existing.stripe_payment_intent_id ?? order.stripePaymentIntentId };
      return persisted;
    }

    const now = order.createdAt || new Date().toISOString();
    const orderPayload: Record<string, unknown> = {
        id: order.id,
        user_id: order.userId || null,
        customer_email: order.customerEmail,
        items: order.items,
        total: order.total,
        status: order.status,
        stripe_session_id: order.stripeSessionId || null,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        checkout_idempotency_key: order.checkoutIdempotencyKey || null,
        shipping_address: order.shippingAddress || null,
        currency: order.currency || 'EUR',
        vat_country: order.vatCountry || null,
        net_amount: order.netAmount ?? null,
        vat_amount: order.vatAmount ?? null,
        vat_breakdown: (order.vatBreakdown as any) ?? null,
        customer_vat_number: order.customerVatNumber || null,
        created_at: now,
        updated_at: now
    };
    const { data: orderRow, error: orderError } = await supabase.from('orders').insert(orderPayload).select('*').single();
    ensureDatabaseSuccess('création de la commande précommande', orderError);

    const lines = (Array.isArray(order.items) ? order.items : []).map((item: any) => ({
        order_id: order.id,
        product_id: item.productId || item.product_id,
        variant_id: item.variantId || item.variant_id || null,
        quantity: Number(item.quantity),
        unit_price: Number(item.price ?? (item.unitCents ? item.unitCents / 100 : 0))
    })).filter((l: any) => l.product_id && l.quantity > 0);
    if (lines.length > 0) {
        const { error: linesError } = await supabase.from('order_items').insert(lines);
        ensureDatabaseSuccess('création des lignes précommande', linesError);
    }

    const { error: payError } = await supabase.from('payments').insert({
        order_id: order.id,
        amount: order.total,
        currency: order.currency || 'EUR',
        status: order.status,
        stripe_payment_intent_id: order.stripePaymentIntentId || null
    });
    ensureDatabaseSuccess('création du ledger de paiement précommande', payError);

    const { error: histError } = await supabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: null,
        new_status: order.status,
        changed_by_role: 'system',
        reason: 'Précommande créée (aucune réservation de stock : lot non réceptionné)',
        source: 'checkout'
    });
    if (histError) console.error('[preorder] historique:', histError.message);

    const persisted: ServerOrder = {
        ...order,
        status: orderRow?.status ?? order.status,
        stripeSessionId: orderRow?.stripe_session_id ?? order.stripeSessionId,
        stripePaymentIntentId: orderRow?.stripe_payment_intent_id ?? order.stripePaymentIntentId
    };
    store.inMemoryOrders.unshift(persisted);
    return persisted;
}

export async function saveOrder(store: SupabaseServerStore, order: ServerOrder): Promise<ServerOrder> {
    const existingIdx = store.inMemoryOrders.findIndex(o => o.id === order.id);
    const supabase = getSupabaseServerClient();
    let isNewOrder = existingIdx < 0;
    if (supabase && isNewOrder) {
      const { data, error } = await supabase.from('orders').select('id').eq('id', order.id).maybeSingle();
      ensureDatabaseSuccess('vérification de la commande existante', error);
      isNewOrder = !data;
    }
    const isInitialPayment = isNewOrder && (order.status === 'payment_pending_webhook' || order.status === 'pending_payment');

    // The checkout RPC owns the complete transaction: it locks and reserves
    // inventory, then creates the order, its lines, payment ledger row and
    // initial history row. A retry returns the already-created order without
    // reserving its stock a second time.
    if (supabase && isInitialPayment) {
      const baseArgs = {
        p_order_id: order.id,
        p_user_id: order.userId || null,
        p_customer_email: order.customerEmail,
        p_items: order.items,
        p_total: order.total,
        p_status: order.status,
        p_stripe_session_id: order.stripeSessionId || null,
        p_stripe_payment_intent_id: order.stripePaymentIntentId || null,
        p_checkout_idempotency_key: order.checkoutIdempotencyKey || null,
        p_shipping_address: order.shippingAddress || null,
        p_created_at: order.createdAt
      };
      // Signature étendue (migration 20260860) : devise + ventilation de TVA
      // écrites dans la même transaction que la réservation de stock.
      const vatArgs = {
        p_currency: order.currency || 'EUR',
        p_vat_country: order.vatCountry || null,
        p_net_amount: order.netAmount ?? null,
        p_vat_amount: order.vatAmount ?? null,
        p_vat_breakdown: (order.vatBreakdown as any) ?? null,
        p_customer_vat_number: order.customerVatNumber || null
      };

      let data: any = null;
      let error: any = null;
      ({ data, error } = await supabase.rpc('create_order_with_stock_reservation', { ...baseArgs, ...vatArgs }));

      // 42883 / PGRST202 : la fonction étendue n'existe pas encore en base. On
      // retombe sur la signature historique au lieu de bloquer un paiement, mais
      // bruyamment : les colonnes de TVA ne seront pas remplies tant que la
      // migration n'est pas appliquée. La TVA reste dans l'instantané JSONB.
      const missingSignature = !!error && (error.code === '42883' || error.code === 'PGRST202');
      if (missingSignature) {
        console.error(
          '[serverDb] create_order_with_stock_reservation sans paramètres TVA : ' +
          'appliquez la migration 20260860000000_vat_and_currency.sql. ' +
          'La TVA de cette commande n’est stockée que dans shipping_address.vat.'
        );
        ({ data, error } = await supabase.rpc('create_order_with_stock_reservation', baseArgs));
      }
      ensureDatabaseSuccess('création atomique de la commande et réservation du stock', error);
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('[Supabase] création atomique de la commande: réponse vide');
      const persistedOrder: ServerOrder = {
        id: row.id || order.id,
        userId: row.user_id ?? order.userId,
        customerEmail: row.customer_email || order.customerEmail,
        items: Array.isArray(row.items) ? row.items : order.items,
        total: Number(row.total ?? order.total),
        status: row.status || order.status,
        stripeSessionId: row.stripe_session_id ?? order.stripeSessionId,
        stripePaymentIntentId: row.stripe_payment_intent_id ?? order.stripePaymentIntentId,
        checkoutIdempotencyKey: row.checkout_idempotency_key ?? order.checkoutIdempotencyKey,
        shippingAddress: row.shipping_address ?? order.shippingAddress,
        createdAt: row.created_at || order.createdAt,
        updatedAt: row.updated_at || order.updatedAt,
        currency: row.currency ?? order.currency ?? 'EUR',
        vatCountry: row.vat_country ?? order.vatCountry,
        netAmount: row.net_amount != null ? Number(row.net_amount) : order.netAmount,
        vatAmount: row.vat_amount != null ? Number(row.vat_amount) : order.vatAmount,
        vatBreakdown: row.vat_breakdown ?? order.vatBreakdown,
        customerVatNumber: row.customer_vat_number ?? order.customerVatNumber
      };
      const persistedIndex = store.inMemoryOrders.findIndex(existing => existing.id === persistedOrder.id);
      if (persistedIndex >= 0) store.inMemoryOrders[persistedIndex] = persistedOrder;
      else store.inMemoryOrders.unshift(persistedOrder);
      return persistedOrder;
    }

    // Local-only fallback. Supabase never reaches this multi-step branch.
    if (isInitialPayment && !supabase) {
      await store.withLocalStockLock(() => store.reserveLocalStockUnlocked(order.items));
    }

    if (supabase) {
      // 1. Save main order in public.orders
      const { error: orderError } = await supabase.from('orders').upsert({
        id: order.id,
        user_id: order.userId || null,
        customer_email: order.customerEmail,
        items: order.items,
        total: order.total,
        status: order.status,
        stripe_session_id: order.stripeSessionId || null,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        checkout_idempotency_key: order.checkoutIdempotencyKey || null,
        shipping_address: order.shippingAddress || null,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      }, { onConflict: 'id' });
      ensureDatabaseSuccess('création de la commande', orderError);

      // 2. Save detailed line items in public.order_items
      if (order.items && order.items.length > 0) {
        const orderItemsPayload = order.items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity,
          unit_price: item.price
        }));
        const { error: deleteItemsError } = await supabase.from('order_items').delete().eq('order_id', order.id);
        ensureDatabaseSuccess('suppression des lignes de commande', deleteItemsError);
        const { error: insertItemsError } = await supabase.from('order_items').insert(orderItemsPayload);
        ensureDatabaseSuccess('création des lignes de commande', insertItemsError);
      }

      // 3. Save the initial payment state once. Later order/session updates
      // must not create duplicate payment rows.
      if (isNewOrder) {
        const { error: paymentError } = await supabase.from('payments').insert({
          order_id: order.id,
          amount: order.total,
          currency: 'EUR',
          status: order.status,
          stripe_payment_intent_id: order.stripePaymentIntentId || order.stripeSessionId || null,
          created_at: order.createdAt,
          updated_at: order.updatedAt
        });
        ensureDatabaseSuccess('création du paiement', paymentError);
      }
    }

    // Cache only data that has been accepted by the configured persistence
    // layer. This prevents failed Supabase writes from creating phantom state.
    if (isNewOrder || existingIdx < 0) store.inMemoryOrders.unshift(order);
    else store.inMemoryOrders[existingIdx] = order;

    // The order must exist before its history row is inserted (FK safety).
    if (isInitialPayment) {
      await logOrderStatusHistory(store, 
        order.id,
        undefined,
        order.status,
        order.userId,
        order.userId ? 'customer' : 'system',
        'Création de la commande',
        'checkout'
      );
    }

    return order;
  }

export async function updateOrderStripeSession(store: SupabaseServerStore, orderId: string, stripeSessionId: string): Promise<ServerOrder | undefined> {
    const order = await getOrderById(store, orderId);
    if (!order) return undefined;
    const updatedAt = new Date().toISOString();
    const updatedOrder = { ...order, stripeSessionId: stripeSessionId, updatedAt };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('orders').update({
        stripe_session_id: stripeSessionId,
        updated_at: updatedAt
      }).eq('id', orderId);
      ensureDatabaseSuccess('mise à jour de la session Stripe de la commande', error);
    }

    const index = store.inMemoryOrders.findIndex(existing => existing.id === orderId);
    if (index >= 0) store.inMemoryOrders[index] = updatedOrder;
    else if (supabase) store.inMemoryOrders.unshift(updatedOrder);

    return updatedOrder;
  }

export async function getOrderById(store: SupabaseServerStore, id: string): Promise<ServerOrder | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') {
        ensureDatabaseSuccess('lecture de la commande', error);
      }
      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          customerEmail: data.customer_email,
          items: data.items,
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          ...mapOrderVatFields(data)
        };
      }
    }
    return supabase ? undefined : store.inMemoryOrders.find(o => o.id === id);
  }

export async function getOrdersByCustomer(store: SupabaseServerStore, email: string, userId?: string): Promise<ServerOrder[]> {
    const memOrders = store.inMemoryOrders.filter(o => {
      if (userId && o.userId) return o.userId === userId;
      if (email) return o.customerEmail.toLowerCase() === email.toLowerCase();
      return true;
    });

    const supabase = getSupabaseServerClient();
    if (supabase) {
      let req = supabase.from('orders').select('*');
      if (userId) {
        req = req.eq('user_id', userId);
      } else if (email) {
        req = req.eq('customer_email', email.toLowerCase());
      }
      const { data, error } = await req;
      ensureDatabaseSuccess('lecture des commandes', error);
      if (data && data.length > 0) {
        const supaOrders: ServerOrder[] = data.map(d => ({
          id: d.id,
          userId: d.user_id,
          customerEmail: d.customer_email,
          items: d.items,
          total: Number(d.total),
          status: d.status,
          stripeSessionId: d.stripe_session_id,
          stripePaymentIntentId: d.stripe_payment_intent_id,
          checkoutIdempotencyKey: d.checkout_idempotency_key,
          shippingAddress: d.shipping_address,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          ...mapOrderVatFields(d)
        }));
        return supaOrders;
      }
    }
    return supabase ? [] : memOrders;
  }

  // Persistent Carts (public.carts & public.cart_items)
export async function normalizeCartItems(store: SupabaseServerStore, items: { productId: string; quantity: number; variantId?: string }[]): Promise<{ productId: string; quantity: number; variantId?: string }[]> {
    if (!Array.isArray(items)) throw new Error('Panier invalide.');

    const supabase = getSupabaseServerClient();
    const publishedProducts = supabase ? await store.getProducts({ publishedOnly: true }) : null;
    const normalized = new Map<string, { productId: string; quantity: number; variantId?: string }>();
    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
        throw new Error('Article de panier invalide.');
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error('Quantité de panier invalide.');
      }
      if (item.variantId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.variantId)) {
        throw new Error('Identifiant de variante invalide.');
      }

      const product = publishedProducts
        ? publishedProducts.find(itemProduct => itemProduct.id === item.productId)
        : await store.getProductById(item.productId);
      if (!product) throw new Error(`Produit de panier introuvable ou non publié : ${item.productId}.`);
      if (item.variantId) {
        const variant = (product.variants || []).find((candidate: any) => candidate.id === item.variantId);
        if (!variant || variant.is_active === false || Number(variant.stock_quantity) <= Number(variant.reserved_quantity || 0)) {
          throw new Error('Variante indisponible.');
        }
      } else if (product.inStock === false) {
        throw new Error('Produit indisponible.');
      }
      const key = `${product.id}:${item.variantId || ''}`;
      const quantity = (normalized.get(key)?.quantity || 0) + item.quantity;
      if (quantity > 99) throw new Error('La quantité totale d’un article de panier ne peut pas dépasser 99.');
      normalized.set(key, { productId: product.id, quantity, variantId: item.variantId });
    }
    return Array.from(normalized.values());
  }

export async function saveCart(store: SupabaseServerStore, userId: string | null, anonymousId: string | null, items: { productId: string; quantity: number; variantId?: string }[]): Promise<string | null> {
    if ((!userId && !anonymousId) || (userId && anonymousId)) {
      throw new Error('Un seul propriétaire de panier est requis.');
    }

    const normalizedItems = await normalizeCartItems(store, items);
    const key = userId || anonymousId!;
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      store.inMemoryCarts.set(key, normalizedItems);
      return 'in_memory_cart';
    }

    try {
      const { data, error } = await supabase.rpc('replace_cart', {
        p_user_id: userId,
        p_anonymous_id: anonymousId,
        p_items: normalizedItems.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity
        }))
      });
      ensureDatabaseSuccess('remplacement atomique du panier', error);
      if (!data) throw new Error('[Supabase] remplacement atomique du panier: identifiant absent');
      store.inMemoryCarts.set(key, normalizedItems);
      return data as string;
    } catch (err) {
      console.error('[Supabase Server DB] saveCart error:', err);
      throw err;
    }
  }

export async function getCart(store: SupabaseServerStore, userId: string | null, anonymousId: string | null): Promise<any[]> {
    const key = userId || anonymousId || 'default';
    const supabase = getSupabaseServerClient();

    if (supabase) {
      try {
        const publishedProducts = await store.getProducts({ publishedOnly: true });
        let cartId: string | null = null;
        if (userId) {
          const { data, error } = await supabase.from('carts').select('id').eq('user_id', userId).maybeSingle();
          ensureDatabaseSuccess('lecture du panier utilisateur', error);
          cartId = data?.id || null;
        } else if (anonymousId) {
          const { data, error } = await supabase.from('carts').select('id').eq('anonymous_id', anonymousId).maybeSingle();
          ensureDatabaseSuccess('lecture du panier invité', error);
          cartId = data?.id || null;
        }

        if (cartId) {
          const { data: items, error } = await supabase.from('cart_items').select('*').eq('cart_id', cartId);
          ensureDatabaseSuccess('lecture des lignes du panier', error);
          if (items && items.length > 0) {
            const result = [];
            for (const item of items) {
              const product = publishedProducts.find(itemProduct => itemProduct.id === item.product_id);
              if (product) {
                const variantId = item.variant_id || undefined;
                const variant = variantId && (product.variants || []).find((candidate: any) => candidate.id === variantId);
                if (variantId && !variant) continue;
                result.push({
                  product: toPublicProduct(product),
                  quantity: item.quantity,
                  variantId,
                  variantLabel: variant?.name,
                  unitPrice: variant ? Number(variant.price) : Number(product.price)
                });
              }
            }
            return result;
          }
        }
        return [];
      } catch (err) {
        console.error('[Supabase Server DB] getCart error:', err);
        throw err;
      }
    }

    // Fallback to in-memory cart
    const memCart = store.inMemoryCarts.get(key) || [];
    const result = [];
    for (const item of memCart) {
      const product = await store.getProductById(item.productId);
      if (product) {
        result.push({
          product,
          quantity: item.quantity,
          variantId: item.variantId || undefined
        });
      }
    }
    return result;
  }

export async function findOrder(store: SupabaseServerStore, query: { stripeSessionId?: string; paymentIntentId?: string; orderId?: string; checkoutIdempotencyKey?: string }): Promise<ServerOrder | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let req = supabase.from('orders').select('*');
      if (query.orderId) req = req.eq('id', query.orderId);
      else if (query.stripeSessionId) req = req.eq('stripe_session_id', query.stripeSessionId);
      else if (query.paymentIntentId) req = req.eq('stripe_payment_intent_id', query.paymentIntentId);
      else if (query.checkoutIdempotencyKey) req = req.eq('checkout_idempotency_key', query.checkoutIdempotencyKey);

      const { data, error } = await req.maybeSingle();
      ensureDatabaseSuccess('recherche de commande', error);
      if (data) {
        return {
          id: data.id,
          customerEmail: data.customer_email,
          items: data.items,
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          ...mapOrderVatFields(data)
        };
      }
    }

    return supabase ? undefined : store.inMemoryOrders.find(o =>
      (query.orderId && o.id === query.orderId) ||
      (query.stripeSessionId && o.stripeSessionId === query.stripeSessionId) ||
      (query.paymentIntentId && (o.stripePaymentIntentId === query.paymentIntentId || o.stripeSessionId === query.paymentIntentId)) ||
      (query.checkoutIdempotencyKey && o.checkoutIdempotencyKey === query.checkoutIdempotencyKey)
    );
  }

async function updateOrderStatusInner(store: SupabaseServerStore, orderId: string, newStatus: OrderStatus, extra?: {
    stripePaymentIntentId?: string;
    changedBy?: string;
    changedByRole?: string;
    reason?: string;
    restockItems?: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>;
    emailData?: Record<string, unknown>;
  }): Promise<ServerOrder | undefined> {
    const order = await getOrderById(store, orderId);
    if (!order) return undefined;

    const supabase = getSupabaseServerClient();

    // PRÉCOMMANDE : aucune réservation de stock n'a été faite (lot non
    // réceptionné). On fait donc une transition de statut SANS toucher au
    // stock : la RPC `transition_order_stock` lèverait « Reserved stock is
    // inconsistent ». On met à jour la commande, le ledger et l'historique.
    const isPreorderOrder = Array.isArray(order.items) && order.items.length > 0
      && order.items.every((it: any) => it.isPreorder === true);
    const isPaymentTransition = newStatus === 'paid' || newStatus === 'payment_failed' || newStatus === 'cancelled';
    if (supabase && isPreorderOrder && isPaymentTransition) {
      const now = new Date().toISOString();
      const { data: row, error: updError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          stripe_payment_intent_id: extra?.stripePaymentIntentId || order.stripePaymentIntentId || null,
          updated_at: now
        })
        .eq('id', order.id)
        .select('*')
        .single();
      ensureDatabaseSuccess('transition précommande (statut)', updError);

      if (newStatus === 'paid') {
        const { error: payErr } = await supabase
          .from('payments')
          .update({ status: 'paid', stripe_payment_intent_id: extra?.stripePaymentIntentId || null, updated_at: now })
          .eq('order_id', order.id);
        if (payErr) console.error('[preorder] ledger paiement:', payErr.message);
      }
      const { error: histErr } = await supabase.from('order_status_history').insert({
        order_id: order.id,
        old_status: order.status,
        new_status: newStatus,
        changed_by_role: extra?.changedByRole || 'system',
        reason: extra?.reason || `Précommande : transition vers ${newStatus} (sans mouvement de stock)`,
        source: 'stripe_webhook'
      });
      if (histErr) console.error('[preorder] historique:', histErr.message);

      const updated: ServerOrder = {
        ...order,
        status: (row?.status || newStatus) as ServerOrder['status'],
        stripePaymentIntentId: row?.stripe_payment_intent_id ?? order.stripePaymentIntentId,
        updatedAt: row?.updated_at ?? now
      };
      const index = store.inMemoryOrders.findIndex(existing => existing.id === updated.id);
      if (index >= 0) store.inMemoryOrders[index] = updated;
      else store.inMemoryOrders.unshift(updated);
      return updated;
    }

    if (supabase) {
      // PostgreSQL locks the order first, then mutates the corresponding
      // inventory rows, payment ledger and history in one transaction. This
      // is deliberately the only Supabase path for payment/expiration
      // transitions; webhook retries are no-ops once the status is committed.
      const { data, error } = await supabase.rpc('transition_order_stock', {
        p_order_id: order.id,
        p_new_status: newStatus,
        p_stripe_payment_intent_id: extra?.stripePaymentIntentId || null,
        p_changed_by: extra?.changedBy || null,
        p_changed_by_role: extra?.changedByRole || 'system',
        p_reason: extra?.reason || `Transition atomique vers ${newStatus}`,
        p_restock_items: extra?.restockItems || []
      });
      ensureDatabaseSuccess('transition atomique de commande et de stock', error);
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('[Supabase] transition atomique de commande: réponse vide');
      const updated: ServerOrder = {
        id: row.id || order.id,
        userId: row.user_id ?? order.userId,
        customerEmail: row.customer_email || order.customerEmail,
        items: Array.isArray(row.items) ? row.items : order.items,
        total: Number(row.total ?? order.total),
        status: row.status || newStatus,
        stripeSessionId: row.stripe_session_id ?? order.stripeSessionId,
        stripePaymentIntentId: row.stripe_payment_intent_id ?? order.stripePaymentIntentId,
        checkoutIdempotencyKey: row.checkout_idempotency_key ?? order.checkoutIdempotencyKey,
        shippingAddress: row.shipping_address ?? order.shippingAddress,
        createdAt: row.created_at || order.createdAt,
        updatedAt: row.updated_at || order.updatedAt,
        currency: row.currency ?? order.currency ?? 'EUR',
        vatCountry: row.vat_country ?? order.vatCountry,
        netAmount: row.net_amount != null ? Number(row.net_amount) : order.netAmount,
        vatAmount: row.vat_amount != null ? Number(row.vat_amount) : order.vatAmount,
        vatBreakdown: row.vat_breakdown ?? order.vatBreakdown,
        customerVatNumber: row.customer_vat_number ?? order.customerVatNumber
      };
      const index = store.inMemoryOrders.findIndex(existing => existing.id === updated.id);
      if (index >= 0) store.inMemoryOrders[index] = updated;
      else store.inMemoryOrders.unshift(updated);

      if (order.status !== updated.status) {
        const type = updated.status === 'paid' ? 'payment_confirmed' : `order_${updated.status}`;
        const title = `Mise à jour commande #${updated.id}`;
        const email: EmailMessage = {
          to: updated.customerEmail,
          subject: `[KURLA BEAUTY] ${title}`,
          template: emailTemplateForOrderStatus(updated.status),
          data: { ...orderEmailData(updated), status: updated.status, ...(extra?.emailData || {}) }
        };
        if (updated.userId) {
          await store.notifyUser(
            updated.userId,
            type,
            title,
            `Le statut de votre commande est désormais : ${updated.status.toUpperCase()}`,
            `/account?tab=orders`,
            updated.id,
            email,
            `order-status:${updated.id}:${updated.status}`
          );
        } else {
          await store.sendTransactionalEmail(email);
        }
        if (updated.status === 'paid') await store.notifyLowStockForOrder(updated);
      }
      return updated;
    }

    // Explicit local-only fallback used by the test/development store. The
    // configured Supabase store never executes these independent writes.
    if (order.status === newStatus) {
      if (extra?.stripePaymentIntentId && order.stripePaymentIntentId !== extra.stripePaymentIntentId) {
        order.stripePaymentIntentId = extra.stripePaymentIntentId;
        order.updatedAt = new Date().toISOString();
        const index = store.inMemoryOrders.findIndex(existing => existing.id === order.id);
        if (index >= 0) store.inMemoryOrders[index] = order;
      }
      return order;
    }

    const oldStatus = order.status;
    if (!isTransitionAllowed(store, oldStatus, newStatus)) {
      throw new Error(`Transition de statut invalide : impossible de passer de '${oldStatus}' à '${newStatus}'.`);
    }

    const nextUpdatedAt = new Date().toISOString();
    const nextPaymentIntent = extra?.stripePaymentIntentId || order.stripePaymentIntentId;

    await store.withLocalStockLock(async () => {
      if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment' || oldStatus === 'payment_failed') && newStatus === 'paid') {
      if (oldStatus === 'payment_failed') await store.reserveLocalStockUnlocked(order.items);
      for (const item of order.items) {
        const product = await store.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await store.getInventoryByVariantId(realId, item.variantId)
          : await store.getInventoryByProductId(realId);
        if (inventory.quantity < item.quantity || inventory.reserved_quantity < item.quantity) {
          throw new Error(`Stock réservé incohérent pour le produit ${item.productId}.`);
        }
        const quantity = inventory.quantity - item.quantity;
        const reservedQuantity = inventory.reserved_quantity - item.quantity;
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        store.inMemoryInventory.set(key, { quantity, reserved_quantity: reservedQuantity, available_quantity: quantity - reservedQuantity });
        const productIndex = store.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
        const inMemoryProduct = productIndex >= 0 ? store.inMemoryProducts[productIndex] : undefined;
        const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === item.variantId);
        if (item.variantId && inMemoryVariant) {
          inMemoryVariant.stock_quantity = quantity;
          inMemoryVariant.reserved_quantity = reservedQuantity;
        } else if (inMemoryProduct) {
          inMemoryProduct.stockQuantity = quantity;
          inMemoryProduct.inStock = quantity > 0;
        }
      }
    } else if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment') && (newStatus === 'payment_failed' || newStatus === 'cancelled')) {
      for (const item of order.items) {
        const product = await store.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await store.getInventoryByVariantId(realId, item.variantId)
          : await store.getInventoryByProductId(realId);
        if (inventory.reserved_quantity < item.quantity) {
          throw new Error(`Réservation de stock incohérente pour le produit ${item.productId}.`);
        }
        const reservedQuantity = inventory.reserved_quantity - item.quantity;
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        store.inMemoryInventory.set(key, {
          quantity: inventory.quantity,
          reserved_quantity: reservedQuantity,
          available_quantity: inventory.quantity - reservedQuantity
        });
      }
    } else if (
      ['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'partially_refunded'].includes(oldStatus)
      && (newStatus === 'refunded' || newStatus === 'partially_refunded')
    ) {
      const itemsToRestore = extra?.restockItems || (newStatus === 'refunded' ? order.items : []);
      for (const item of itemsToRestore) {
        const product = await store.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await store.getInventoryByVariantId(realId, item.variantId)
          : await store.getInventoryByProductId(realId);
        const quantity = inventory.quantity + item.quantity;
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        store.inMemoryInventory.set(key, {
          quantity,
          reserved_quantity: inventory.reserved_quantity,
          available_quantity: quantity - inventory.reserved_quantity
        });
        const productIndex = store.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
        const inMemoryProduct = productIndex >= 0 ? store.inMemoryProducts[productIndex] : undefined;
        const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === item.variantId);
        if (item.variantId && inMemoryVariant) inMemoryVariant.stock_quantity = quantity;
        else if (inMemoryProduct) {
          inMemoryProduct.stockQuantity = quantity;
          inMemoryProduct.inStock = true;
        }
      }
      }
    });

    order.status = newStatus;
    order.updatedAt = nextUpdatedAt;
    order.stripePaymentIntentId = nextPaymentIntent;
    await logOrderStatusHistory(store, 
      orderId,
      oldStatus,
      newStatus,
      extra?.changedBy,
      extra?.changedByRole || 'admin',
      extra?.reason || `Changement de statut de ${oldStatus} vers ${newStatus}`,
      'admin_dashboard'
    );

    const index = store.inMemoryOrders.findIndex(existing => existing.id === order.id);
    if (index >= 0) store.inMemoryOrders[index] = order;
    else store.inMemoryOrders.unshift(order);

    {
      const type = newStatus === 'paid' ? 'payment_confirmed' : `order_${newStatus}`;
      const title = `Mise à jour commande #${order.id}`;
      const email: EmailMessage = {
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] ${title}`,
        template: emailTemplateForOrderStatus(newStatus),
        data: { ...orderEmailData(order), status: newStatus, ...(extra?.emailData || {}) }
      };
      if (order.userId) {
        await store.notifyUser(
          order.userId,
          type,
          title,
          `Le statut de votre commande est désormais : ${newStatus.toUpperCase()}`,
          `/account?tab=orders`,
          order.id,
          email,
          `order-status:${order.id}:${newStatus}`
        );
      } else {
        await store.sendTransactionalEmail(email);
      }
      if (newStatus === 'paid') await store.notifyLowStockForOrder(order);
    }

    return order;
  }

  // ============================================================
  // PHASE 5: ORDER STATUS HISTORY & TRANSITION VALIDATION
  // ============================================================
export function isTransitionAllowed(store: SupabaseServerStore, oldStatus: OrderStatus, newStatus: OrderStatus): boolean {
    if (oldStatus === newStatus) return true;

    const allowedTransitions: Record<string, string[]> = {
      pending_payment: ['payment_pending_webhook', 'paid', 'cancelled', 'payment_failed'],
      payment_pending_webhook: ['paid', 'payment_failed', 'cancelled'],
      paid: ['processing', 'packed', 'shipped', 'refunded', 'partially_refunded', 'return_requested'],
      processing: ['packed', 'shipped', 'cancelled', 'refunded', 'partially_refunded'],
      packed: ['shipped', 'cancelled', 'refunded', 'partially_refunded'],
      shipped: ['delivered', 'returned', 'refunded', 'partially_refunded'],
      delivered: ['return_requested', 'returned', 'refunded', 'partially_refunded'],
      return_requested: ['returned', 'rejected', 'refunded', 'partially_refunded', 'cancelled'],
      returned: ['refunded', 'partially_refunded'],
      partially_refunded: ['refunded', 'return_requested'],
      payment_failed: ['paid']
    };

    const allowed = allowedTransitions[oldStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }

export async function logOrderStatusHistory(store: SupabaseServerStore, orderId: string, oldStatus: string | undefined, newStatus: string, changedBy?: string, changedByRole: string = 'system', reason?: string, source: string = 'system'): Promise<void> {
    const entry: OrderStatusHistoryEntry = {
      id: randomUUID(),
      orderId,
      oldStatus,
      newStatus,
      changedBy,
      changedByRole,
      reason,
      source,
      createdAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('order_status_history').insert({
          id: entry.id,
          order_id: orderId,
          old_status: oldStatus || null,
          new_status: newStatus,
          changed_by: changedBy || null,
          changed_by_role: changedByRole,
          reason: reason || null,
          source: source,
          created_at: entry.createdAt
        });
        ensureDatabaseSuccess('création de l’historique de commande', error);
      } catch (err) {
        console.error('[serverDb] logOrderStatusHistory error:', err);
        throw err;
      }
    }

    store.inMemoryStatusHistory.unshift(entry);
  }

export async function getOrderStatusHistory(store: SupabaseServerStore, orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture de l’historique de commande', error);
        if (data) {
          return data.map(d => ({
            id: d.id,
            orderId: d.order_id,
            oldStatus: d.old_status,
            newStatus: d.new_status,
            changedBy: d.changed_by,
            changedByRole: d.changed_by_role,
            reason: d.reason,
            source: d.source,
            createdAt: d.created_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getOrderStatusHistory error:', err);
        throw err;
      }
    }
    return store.inMemoryStatusHistory.filter(h => h.orderId === orderId);
  }

  // ============================================================
  // KURLA ID BEAUTY PROFILES
  // ============================================================
  // ============================================================
  // AI ASSISTANT SESSIONS, FEEDBACK & HUMAN REVIEW
  // ============================================================
  // ============================================================
  // PHASE 5: CUSTOMER SUPPORT TICKETS
  // ============================================================

/**
 * Une commande réglée fait progresser l'axe achat — plafonné à 80 points, soit
 * quatre commandes. Au-delà, acheter ne rapporte plus rien : c'est ce plafond qui
 * garantit qu'un membre qui ne commande pas peut atteindre le dernier niveau.
 */
export async function updateOrderStatus(store: SupabaseServerStore, orderId: string, newStatus: OrderStatus, extra?: {
    stripePaymentIntentId?: string;
    changedBy?: string;
    changedByRole?: string;
    reason?: string;
    restockItems?: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>;
    emailData?: Record<string, unknown>;
  }): Promise<ServerOrder | undefined> {
  const updated = await updateOrderStatusInner(store, orderId, newStatus, extra);
  if (updated?.status === 'paid' && updated.userId) {
    await recordLoyaltySafely(store, updated.userId, 'order_paid', updated.id, `order_paid:${updated.id}`);
  }
  return updated;
}
