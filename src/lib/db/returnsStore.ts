import { randomUUID } from 'node:crypto';

import { EmailMessage, emailService } from '../emailService';
import { getStripeServerClient, mapRefundRow } from './refundSupport';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
// Appels inter-domaines : un remboursement notifie et écrit à l'utilisateur.
import { notifyUser, sendTransactionalEmail } from './notificationsStore';

import type {
  CustomerRefund,
  CustomerReturn,
  CustomerReturnEvent,
  OrderStatus,
  ServerOrder,
  ServerOrderItem,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2b — retours clients et remboursements (Stripe, idempotence,
 * restauration de stock), sortis de `serverDb.ts`.
 */


  // ============================================================
  // PHASE 5: RETURNS & REFUNDS
  // ============================================================
export async function recordReturnEvent(store: SupabaseServerStore, input: Omit<CustomerReturnEvent, 'id' | 'createdAt'>): Promise<CustomerReturnEvent> {
    const event: CustomerReturnEvent = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('return_events').insert({
        id: event.id,
        return_id: event.returnId,
        actor_id: event.actorId || null,
        actor_role: event.actorRole,
        old_status: event.oldStatus || null,
        new_status: event.newStatus,
        comment: event.comment || null,
        created_at: event.createdAt
      });
      ensureDatabaseSuccess('journalisation de l’événement de retour', error);
    }
    store.inMemoryReturnEvents.push(event);
    return event;
  }

export async function getReturnHistory(store: SupabaseServerStore, returnId: string): Promise<CustomerReturnEvent[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('return_events').select('*').eq('return_id', returnId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture de l’historique du retour', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        returnId: row.return_id,
        actorId: row.actor_id || undefined,
        actorRole: row.actor_role,
        oldStatus: row.old_status || undefined,
        newStatus: row.new_status,
        comment: row.comment || undefined,
        createdAt: row.created_at
      }));
    }
    return store.inMemoryReturnEvents.filter(event => event.returnId === returnId);
  }

export async function createReturnRequest(store: SupabaseServerStore, userId: string, orderId: string, reason: string, items: any[], comment?: string): Promise<CustomerReturn> {
    if (!reason.trim() || !Array.isArray(items) || items.length === 0) {
      throw new Error('Les informations de retour sont incomplètes.');
    }

    const order = await store.getOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new Error('Commande introuvable pour ce client.');
    }
    if (!['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested'].includes(order.status)) {
      throw new Error(`La commande #${orderId} n’est pas éligible à une demande de retour depuis le statut '${order.status}'.`);
    }

    const keyFor = (productId: string, variantId?: string) => `${productId}::${variantId || ''}`;
    const orderQuantities = new Map(order.items.map(item => [keyFor(item.productId, item.variantId), item.quantity]));
    const alreadyRequested = new Map<string, number>();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: previousReturns, error } = await supabase
        .from('returns')
        .select('items, quantity, status')
        .eq('order_id', orderId);
      ensureDatabaseSuccess('lecture des retours existants de la commande', error);
      for (const previous of previousReturns || []) {
        if (['rejected', 'cancelled'].includes(previous.status)) continue;
        if (!Array.isArray(previous.items) || previous.items.length === 0) {
          throw new Error('Les lignes d’un retour historique sont inconnues : réconciliation manuelle requise avant une nouvelle demande.');
        }
        for (const item of previous.items) {
          const productId = item?.productId || item?.product_id;
          const variantId = item?.variantId || item?.variant_id || undefined;
          const quantity = Number(item?.quantity);
          const key = typeof productId === 'string' ? keyFor(productId, variantId) : '';
          if (key && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(key, (alreadyRequested.get(key) || 0) + quantity);
          }
        }
      }
    } else {
      for (const previous of store.inMemoryReturns) {
        if (previous.orderId !== orderId || ['rejected', 'cancelled'].includes(previous.status)) continue;
        for (const item of previous.items || []) {
          const productId = item?.productId || item?.product_id;
          const variantId = item?.variantId || item?.variant_id || undefined;
          const quantity = Number(item?.quantity);
          const key = typeof productId === 'string' ? keyFor(productId, variantId) : '';
          if (key && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(key, (alreadyRequested.get(key) || 0) + quantity);
          }
        }
      }
    }

    const normalizedItems = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of items) {
      const productId = item?.productId || item?.product_id;
      const variantId = item?.variantId || item?.variant_id || undefined;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('Ligne de retour invalide.');
      }
      const key = keyFor(productId, variantId);
      const nextQuantity = (normalizedItems.get(key)?.quantity || 0) + quantity;
      const totalRequested = (alreadyRequested.get(key) || 0) + nextQuantity;
      if (!orderQuantities.has(key) || totalRequested > orderQuantities.get(key)!) {
        throw new Error(`Quantité retournée invalide pour le produit ${productId}.`);
      }
      normalizedItems.set(key, { productId, variantId, quantity: nextQuantity });
    }

    const normalizedReturnItems = Array.from(normalizedItems.values());
    const now = new Date().toISOString();
    const ret: CustomerReturn = {
      id: randomUUID(),
      orderId,
      userId,
      reason: reason.trim(),
      items: normalizedReturnItems,
      quantity: normalizedReturnItems.reduce((acc, item) => acc + item.quantity, 0),
      status: 'requested',
      comment: comment?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('returns').insert({
          id: ret.id,
          order_id: orderId,
          user_id: userId,
          reason: ret.reason,
          items: normalizedReturnItems,
          quantity: ret.quantity,
          status: 'requested',
          comment: ret.comment || null,
          created_at: ret.createdAt,
          updated_at: ret.updatedAt
        });
        ensureDatabaseSuccess('création de la demande de retour', error);
      } catch (err) {
        console.error('[serverDb] createReturnRequest error:', err);
        throw err;
      }
    }

    store.inMemoryReturns.unshift(ret);
    await recordReturnEvent(store, {
      returnId: ret.id,
      actorId: userId,
      actorRole: 'customer',
      newStatus: 'requested',
      comment: ret.comment || ret.reason
    });
    await store.logOrderStatusHistory(orderId, undefined, 'return_requested', userId, 'customer', ret.reason, 'customer_action');
    await notifyUser(store, 
      userId,
      'return_requested',
      'Demande de retour enregistrée',
      `Votre demande de retour pour la commande #${orderId} a été reçue.`,
      `/account?tab=returns`,
      orderId,
      {
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Demande de retour pour la commande #${orderId}`,
        template: 'return_requested',
        data: { orderId, returnId: ret.id }
      },
      `return-created:${ret.id}`
    );

    return ret;
  }

export async function getReturnsByUser(store: SupabaseServerStore, userId: string): Promise<CustomerReturn[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture des retours utilisateur', error);
        if (data) {
          return data.map(r => ({
            id: r.id,
            orderId: r.order_id,
            userId: r.user_id,
            reason: r.reason,
            items: r.items || [],
            quantity: r.quantity,
            status: r.status,
            comment: r.comment,
            adminComment: r.admin_comment,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getReturnsByUser error:', err);
        throw err;
      }
    }
    return store.inMemoryReturns.filter(r => r.userId === userId);
  }

export async function getAllReturns(store: SupabaseServerStore): Promise<CustomerReturn[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').select('*').order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture de tous les retours', error);
        if (data) {
          return data.map(r => ({
            id: r.id,
            orderId: r.order_id,
            userId: r.user_id,
            reason: r.reason,
            items: r.items || [],
            quantity: r.quantity,
            status: r.status,
            comment: r.comment,
            adminComment: r.admin_comment,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getAllReturns error:', err);
        throw err;
      }
    }
    return store.inMemoryReturns;
  }

export async function updateReturnStatus(store: SupabaseServerStore, returnId: string, status: CustomerReturn['status'], adminComment?: string, actorId?: string, actorRole: CustomerReturnEvent['actorRole'] = 'admin'): Promise<CustomerReturn | undefined> {
    const supabase = getSupabaseServerClient();
    const memoryReturn = store.inMemoryReturns.find(r => r.id === returnId);
    const currentReturn = supabase ? await getReturnById(store, returnId) : memoryReturn;
    if (!currentReturn) return undefined;

    const allowedTransitions: Record<CustomerReturn['status'], CustomerReturn['status'][]> = {
      requested: ['requested', 'approved', 'rejected', 'cancelled'],
      approved: ['approved', 'received', 'rejected', 'cancelled'],
      received: ['received', 'refunded', 'rejected'],
      rejected: ['rejected'],
      refunded: ['refunded'],
      cancelled: ['cancelled']
    };
    if (!allowedTransitions[currentReturn.status].includes(status)) {
      throw new Error(`Transition de retour invalide : ${currentReturn.status} -> ${status}.`);
    }

    const updatedAt = new Date().toISOString();
    const nextAdminComment = adminComment !== undefined ? adminComment : currentReturn.adminComment;
    let updatedReturn: CustomerReturn = {
      ...currentReturn,
      status,
      adminComment: nextAdminComment,
      updatedAt
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').update({
          status,
          admin_comment: nextAdminComment || null,
          updated_at: updatedAt
        }).eq('id', returnId).select('*').maybeSingle();
        ensureDatabaseSuccess('mise à jour de la demande de retour', error);
        if (!data) return undefined;
        updatedReturn = {
          id: data.id,
          orderId: data.order_id,
          userId: data.user_id,
          reason: data.reason,
          items: data.items || [],
          quantity: Number(data.quantity || 0),
          status: data.status,
          comment: data.comment || undefined,
          adminComment: data.admin_comment || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (err) {
        console.error('[serverDb] updateReturnStatus error:', err);
        throw err;
      }
    }

    const index = store.inMemoryReturns.findIndex(r => r.id === returnId);
    if (index >= 0) store.inMemoryReturns[index] = updatedReturn;
    else if (!supabase) store.inMemoryReturns.unshift(updatedReturn);

    if (currentReturn.status !== status || adminComment !== undefined) {
      await recordReturnEvent(store, {
        returnId: updatedReturn.id,
        actorId,
        actorRole,
        oldStatus: currentReturn.status,
        newStatus: status,
        comment: adminComment || undefined
      });
    }

    const returnMessage = `Le statut de votre retour pour la commande #${updatedReturn.orderId} est désormais : ${status.toUpperCase()}. ${adminComment ? 'Note admin : ' + adminComment : ''}`;
    const returnOrder = await store.getOrderById(updatedReturn.orderId);
    await notifyUser(store, 
      updatedReturn.userId,
      'return_requested',
      `Mise à jour de votre retour #${updatedReturn.id}`,
      returnMessage,
      `/account?tab=returns`,
      updatedReturn.orderId,
      returnOrder?.customerEmail ? {
        to: returnOrder.customerEmail,
        subject: `[KURLA BEAUTY] Mise à jour de votre retour #${updatedReturn.id}`,
        template: 'return_requested',
        data: { orderId: updatedReturn.orderId, status, returnId: updatedReturn.id }
      } : undefined,
      `return-status:${updatedReturn.id}:${status}`
    );

    return updatedReturn;
  }

export async function getRefundsByOrder(store: SupabaseServerStore, orderId: string): Promise<CustomerRefund[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('refunds').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
        ensureDatabaseSuccess('lecture des remboursements de la commande', error);
        return (data || []).map(mapRefundRow);
      } catch (err) {
        console.error('[serverDb] getRefundsByOrder error:', err);
        throw err;
      }
    }
    return store.inMemoryRefunds.filter(refund => refund.orderId === orderId);
  }

export async function findRefundByIdempotencyKey(store: SupabaseServerStore, idempotencyKey: string): Promise<CustomerRefund | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('refunds').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
      ensureDatabaseSuccess('recherche du remboursement idempotent', error);
      return data ? mapRefundRow(data) : undefined;
    }
    return store.inMemoryRefunds.find(refund => refund.idempotencyKey === idempotencyKey);
  }

export async function findRefundByStripeId(store: SupabaseServerStore, stripeRefundId: string): Promise<CustomerRefund | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('refunds').select('*').eq('stripe_refund_id', stripeRefundId).maybeSingle();
      ensureDatabaseSuccess('recherche du remboursement Stripe', error);
      return data ? mapRefundRow(data) : undefined;
    }
    return store.inMemoryRefunds.find(refund => refund.stripeRefundId === stripeRefundId);
  }

export async function getReturnById(store: SupabaseServerStore, returnId: string): Promise<CustomerReturn | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('returns').select('*').eq('id', returnId).maybeSingle();
      ensureDatabaseSuccess('lecture de la demande de retour', error);
      if (!data) return undefined;
      return {
        id: data.id,
        orderId: data.order_id,
        userId: data.user_id,
        reason: data.reason,
        items: data.items || [],
        quantity: Number(data.quantity || 0),
        status: data.status,
        comment: data.comment || undefined,
        adminComment: data.admin_comment || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    return store.inMemoryReturns.find(ret => ret.id === returnId);
  }

export async function getRefundItems(
    store: SupabaseServerStore,
    order: ServerOrder,
    returnId: string | undefined,
    amountCents: number,
    remainingCents: number,
    previousRefunds: CustomerRefund[] = []
  ): Promise<Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>> {
    const keyFor = (productId: string, variantId?: string) => `${productId}::${variantId || ''}`;
    const orderItems = new Map(order.items.map(item => [keyFor(item.productId, item.variantId), item]));
    const previouslyRestored = new Map<string, number>();
    const unknownPreviousStock = previousRefunds.some(refund =>
      ['succeeded', 'completed'].includes(refund.status)
      && refund.stockRestored === true
      && (!refund.items || refund.items.length === 0)
    );

    if (unknownPreviousStock) {
      throw new Error('Les lignes d’un remboursement historique sont inconnues : réconciliation manuelle requise avant un nouveau remboursement.');
    }

    for (const refund of previousRefunds) {
      if (['succeeded', 'completed'].includes(refund.status) && refund.stockRestored) {
        for (const item of refund.items || []) {
          const key = keyFor(item.productId, item.variantId);
          previouslyRestored.set(key, (previouslyRestored.get(key) || 0) + item.quantity);
        }
      }
    }

    let requestedItems: any[] = order.items;
    if (returnId) {
      const ret = await getReturnById(store, returnId);
      if (!ret || ret.orderId !== order.id) {
        throw new Error(`Demande de retour #${returnId} introuvable pour la commande #${order.id}.`);
      }
      if (ret.status !== 'received') {
        throw new Error(`La réception physique de la demande de retour #${returnId} doit être enregistrée avant remboursement.`);
      }
      requestedItems = ret.items;
    } else {
      if (amountCents !== remainingCents) {
        throw new Error('Un remboursement partiel doit être rattaché à une demande de retour.');
      }
      requestedItems = order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity - (previouslyRestored.get(keyFor(item.productId, item.variantId)) || 0)
      })).filter(item => item.quantity > 0);
    }

    const requestedQuantities = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of requestedItems) {
      const productId = item?.productId || item?.product_id;
      const variantId = item?.variantId || item?.variant_id || undefined;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error(`Quantité remboursée invalide pour le produit ${productId || 'inconnu'}.`);
      }
      const key = keyFor(productId, variantId);
      const existing = requestedQuantities.get(key);
      requestedQuantities.set(key, {
        productId,
        variantId,
        quantity: (existing?.quantity || 0) + quantity
      });
    }

    const refundItems = Array.from(requestedQuantities.values()).map(item => {
      const orderItem = orderItems.get(keyFor(item.productId, item.variantId));
      const alreadyRestored = previouslyRestored.get(keyFor(item.productId, item.variantId)) || 0;
      const availableQuantity = (orderItem?.quantity || 0) - alreadyRestored;
      if (!orderItem || item.quantity > availableQuantity) {
        throw new Error(`Quantité remboursée invalide pour le produit ${item.productId}.`);
      }
      return item;
    });

    if (refundItems.length === 0) {
      throw new Error('Aucun article valide à rembourser.');
    }

    const maximumItemAmountCents = refundItems.reduce((sum, item) => {
      const orderItem = orderItems.get(keyFor(item.productId, item.variantId))!;
      return sum + Math.round(orderItem.price * 100) * item.quantity;
    }, 0);
    if (amountCents > maximumItemAmountCents) {
      throw new Error('Le montant du remboursement dépasse la valeur des articles retournés.');
    }

    return refundItems;
  }

export async function restoreLocalRefundStock(store: SupabaseServerStore, order: ServerOrder, items: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>): Promise<void> {
    for (const item of items) {
      const product = await store.getProductById(item.productId);
      const realId = product ? product.id : item.productId;
      const inventory = item.variantId
        ? await store.getInventoryByVariantId(realId, item.variantId)
        : await store.getInventoryByProductId(realId);
      const quantity = inventory.quantity + item.quantity;
      const updatedInventory = {
        quantity,
        reserved_quantity: inventory.reserved_quantity,
        available_quantity: quantity - inventory.reserved_quantity
      };
      const key = item.variantId ? `${realId}:${item.variantId}` : realId;
      store.inMemoryInventory.set(key, updatedInventory);
      if (!item.variantId && realId !== item.productId) store.inMemoryInventory.set(item.productId, updatedInventory);

      const productIndex = store.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
      const inMemoryProduct = productIndex >= 0 ? store.inMemoryProducts[productIndex] : undefined;
      const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === item.variantId);
      if (item.variantId && inMemoryVariant) {
        inMemoryVariant.stock_quantity = quantity;
      } else if (inMemoryProduct) {
        inMemoryProduct.stockQuantity = quantity;
        inMemoryProduct.inStock = true;
      }
    }
  }

export async function finalizeRefund(store: SupabaseServerStore, input: {
    order: ServerOrder;
    returnId?: string;
    amount: number;
    currency: string;
    reason: string;
    stripeRefundId?: string;
    idempotencyKey: string;
    status: 'pending' | 'succeeded';
    items: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>;
    applyStock: boolean;
  }): Promise<CustomerRefund> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('finalize_refund', {
        p_order_id: input.order.id,
        p_return_id: input.returnId || null,
        p_user_id: input.order.userId || null,
        p_amount: input.amount,
        p_currency: input.currency,
        p_reason: input.reason,
        p_stripe_refund_id: input.stripeRefundId || null,
        p_idempotency_key: input.idempotencyKey,
        p_status: input.status,
        p_items: input.items.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity
        })),
        p_apply_stock: input.applyStock
      });
      ensureDatabaseSuccess('finalisation atomique du remboursement', error);
      if (!data) throw new Error('[Supabase] finalisation atomique du remboursement: réponse vide');
      return mapRefundRow(Array.isArray(data) ? data[0] : data);
    }

    const existing = store.inMemoryRefunds.find(refund =>
      refund.idempotencyKey === input.idempotencyKey
      || (!!input.stripeRefundId && refund.stripeRefundId === input.stripeRefundId)
    );
    if (existing) {
      if (input.applyStock && input.status === 'succeeded' && !existing.stockRestored) {
        await restoreLocalRefundStock(store, input.order, input.items);
        existing.stockRestored = true;
        existing.status = 'succeeded';
        const previousRefunds = store.inMemoryRefunds
          .filter(refund => refund.orderId === input.order.id && refund.status === 'succeeded')
          .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
        const status: OrderStatus = previousRefunds >= Math.round(input.order.total * 100) ? 'refunded' : 'partially_refunded';
        await store.updateOrderStatus(input.order.id, status, { reason: input.reason, restockItems: [] });
      }
      return existing;
    }

    const ref: CustomerRefund = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderId: input.order.id,
      returnId: input.returnId,
      userId: input.order.userId,
      amount: input.amount,
      currency: input.currency,
      reason: input.reason,
      stripeRefundId: input.stripeRefundId,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      stockRestored: false,
      items: input.items,
      createdAt: new Date().toISOString()
    };

    store.inMemoryRefunds.unshift(ref);

    if (input.applyStock && input.status === 'succeeded') {
      await restoreLocalRefundStock(store, input.order, input.items);
      ref.stockRestored = true;
      const totalRefunded = store.inMemoryRefunds
        .filter(refund => refund.orderId === input.order.id && ['succeeded', 'completed'].includes(refund.status))
        .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
      const status: OrderStatus = totalRefunded >= Math.round(input.order.total * 100) ? 'refunded' : 'partially_refunded';
      await store.updateOrderStatus(input.order.id, status, { reason: input.reason, restockItems: [] });
    }

    return ref;
  }

export async function processStripeRefund(
    store: SupabaseServerStore,
    orderId: string,
    returnId?: string,
    amount?: number,
    reason: string = 'Remboursement client',
    requestedIdempotencyKey?: string
  ): Promise<CustomerRefund> {
    const order = await store.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement.`);

    const preliminaryKey = requestedIdempotencyKey?.trim()
      || `refund:${orderId}:${returnId || 'manual'}:${amount === undefined ? 'full' : Math.round(amount * 100)}`;
    const existing = await findRefundByIdempotencyKey(store, preliminaryKey);
    if (existing) return existing;

    const previousRefunds = await getRefundsByOrder(store, orderId);
    const previousRefundedCents = previousRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status))
      .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
    const orderTotalCents = Math.round(order.total * 100);
    const remainingCents = orderTotalCents - previousRefundedCents;
    const refundCents = amount === undefined ? remainingCents : Math.round(amount * 100);

    if (!Number.isSafeInteger(refundCents) || refundCents <= 0) {
      throw new Error('Le montant du remboursement doit être strictement positif.');
    }
    if (refundCents > remainingCents) {
      throw new Error('Le montant du remboursement dépasse le montant encore remboursable.');
    }
    if (!['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'returned', 'partially_refunded'].includes(order.status)) {
      throw new Error(`La commande #${orderId} ne peut pas être remboursée depuis le statut '${order.status}'.`);
    }

    const items = await getRefundItems(store, order, returnId, refundCents, remainingCents, previousRefunds);
    const idempotencyKey = requestedIdempotencyKey?.trim()
      || `refund:${orderId}:${returnId || 'manual'}:${refundCents}`;
    const secondExisting = await findRefundByIdempotencyKey(store, idempotencyKey);
    if (secondExisting) return secondExisting;

    const stripe = getStripeServerClient();
    let stripeRefundId: string | undefined;
    let refundStatus: 'pending' | 'succeeded' = 'succeeded';

    if (stripe) {
      let paymentIntentId = order.stripePaymentIntentId;
      if (!paymentIntentId && order.stripeSessionId) {
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      }
      if (!paymentIntentId) {
        throw new Error(`Aucun PaymentIntent Stripe associé à la commande #${orderId}.`);
      }

      const stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundCents,
        metadata: {
          orderId,
          returnId: returnId || ''
        }
      }, { idempotencyKey });

      if (stripeRefund.status === 'failed' || stripeRefund.status === 'canceled') {
        throw new Error(`Stripe a refusé le remboursement : ${stripeRefund.failure_reason || stripeRefund.status}.`);
      }
      stripeRefundId = stripeRefund.id;
      refundStatus = stripeRefund.status === 'pending' ? 'pending' : 'succeeded';
    } else if (isSupabaseServerConfigured() || process.env.NODE_ENV === 'production') {
      throw new Error('Remboursement impossible : STRIPE_SECRET_KEY est requis lorsque Supabase ou la production est activé.');
    } else {
      // Explicit local-only simulation. It is never allowed with a configured
      // Supabase store or in production.
      stripeRefundId = `re_test_${Date.now()}`;
    }

    const refund = await finalizeRefund(store, {
      order,
      returnId,
      amount: refundCents / 100,
      currency: 'EUR',
      reason,
      stripeRefundId,
      idempotencyKey,
      status: refundStatus,
      items,
      applyStock: refundStatus === 'succeeded'
    });

    if (refundStatus === 'succeeded' && returnId) {
      const relatedReturn = await getReturnById(store, returnId);
      if (relatedReturn?.status === 'received') {
        await updateReturnStatus(store, returnId, 'refunded', 'Remboursement finalisé.', undefined, 'system');
      }
    }

    if (refundStatus === 'succeeded') {
      const title = 'Remboursement effectué';
      const refundEmail: EmailMessage = {
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Remboursement effectué pour votre commande #${orderId}`,
        template: 'refund_created',
        data: { orderId, amount: refundCents / 100, reason }
      };
      if (order.userId) {
        await notifyUser(store, 
          order.userId,
          'refund_created',
          title,
          `Un remboursement de ${(refundCents / 100).toFixed(2)} EUR a été émis pour votre commande #${orderId}.`,
          `/account?tab=refunds`,
          orderId,
          refundEmail,
          `refund:${idempotencyKey}`
        );
      } else {
        await sendTransactionalEmail(store, refundEmail);
      }
    }

    return refund;
  }

export async function recordStripeRefundFromWebhook(
    store: SupabaseServerStore,
    orderId: string,
    details: {
      eventId: string;
      stripeRefundId?: string;
      amount: number;
      currency?: string;
      reason?: string;
      returnId?: string;
    }
  ): Promise<CustomerRefund> {
    const order = await store.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement Stripe.`);

    const eventKey = `stripe-event:${details.eventId}`;
    const existingByEvent = await findRefundByIdempotencyKey(store, eventKey);
    if (existingByEvent && existingByEvent.status !== 'pending') return existingByEvent;
    if (details.stripeRefundId) {
      const existingByStripe = await findRefundByStripeId(store, details.stripeRefundId);
      if (existingByStripe && existingByStripe.status !== 'pending') return existingByStripe;
    }

    const previousRefunds = await getRefundsByOrder(store, orderId);
    const previousRefundedCents = previousRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status))
      .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
    const reportedCents = Math.round(details.amount * 100);
    const refundCents = Math.min(reportedCents - previousRefundedCents, Math.round(order.total * 100) - previousRefundedCents);
    if (!Number.isSafeInteger(refundCents) || refundCents <= 0) {
      throw new Error(`Montant de remboursement Stripe invalide pour la commande #${orderId}.`);
    }

    const remainingCents = Math.round(order.total * 100) - previousRefundedCents;
    const isFullRefund = refundCents >= remainingCents;
    const items = isFullRefund
      ? await getRefundItems(store, order, undefined, refundCents, remainingCents, previousRefunds)
      : [];

    const refund = await finalizeRefund(store, {
      order,
      returnId: details.returnId,
      amount: refundCents / 100,
      currency: (details.currency || 'EUR').toUpperCase(),
      reason: details.reason || 'Remboursement Stripe confirmé',
      stripeRefundId: details.stripeRefundId,
      idempotencyKey: eventKey,
      status: 'succeeded',
      items,
      applyStock: isFullRefund
    });
    if (details.returnId) {
      const relatedReturn = await getReturnById(store, details.returnId);
      if (relatedReturn?.status === 'received') {
        await updateReturnStatus(store, details.returnId, 'refunded', 'Remboursement Stripe confirmé.', undefined, 'system');
      }
    }
    return refund;
  }
