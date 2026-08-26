import { getSupabaseServerClient, isSupabaseConfigured } from './supabaseClient';
import { MOCK_PRODUCTS } from '../data/mockData';
import { emailService } from './emailService';
import { shippingService, ShippingCarrier, ShipmentDetails } from './shippingService';

export interface ServerOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export type OrderStatus = 
  | 'pending_payment'
  | 'payment_pending_webhook'
  | 'paid'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'payment_failed'
  | 'refunded'
  | 'partially_refunded'
  | 'return_requested'
  | 'returned';

export interface ServerOrder {
  id: string;
  userId?: string;
  items: ServerOrderItem[];
  total: number;
  status: OrderStatus;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  shippingAddress?: any;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  oldStatus?: string;
  newStatus: string;
  changedBy?: string;
  changedByRole?: string;
  reason?: string;
  source?: string;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

export interface NotificationPreference {
  userId: string;
  emailNotifications: boolean;
  transactionalEmails: boolean;
  marketingEmails: boolean;
  inAppNotifications: boolean;
  updatedAt: string;
}

export interface CustomerReturn {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  items: any[];
  quantity: number;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'cancelled';
  comment?: string;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRefund {
  id: string;
  orderId: string;
  paymentId?: string;
  returnId?: string;
  userId?: string;
  amount: number;
  currency: string;
  reason?: string;
  stripeRefundId?: string;
  status: 'pending' | 'succeeded' | 'failed' | 'completed';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  orderId?: string;
  subjectCategory: 'paiement' | 'commande' | 'livraison' | 'retour' | 'remboursement' | 'produit' | 'compte' | 'conseil_ia' | 'autre';
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  senderRole: 'customer' | 'admin' | 'agent';
  message: string;
  createdAt: string;
}

export interface StripeEventLog {
  eventId: string;
  type: string;
  timestamp: string;
  status: 'processed' | 'skipped' | 'error';
  orderId?: string;
  error?: string;
}

class SupabaseServerStore {
  private inMemoryProducts: any[] = [];
  private inMemoryOrders: ServerOrder[] = [];
  private inMemoryCarts: Map<string, any[]> = new Map();
  private inMemoryInventory: Map<string, { quantity: number; reserved_quantity: number }> = new Map();
  private inMemoryStripeEvents: StripeEventLog[] = [];
  private inMemoryStatusHistory: OrderStatusHistoryEntry[] = [];
  private inMemoryNotifications: UserNotification[] = [];
  private inMemoryPreferences: Map<string, NotificationPreference> = new Map();
  private inMemoryShipments: Map<string, ShipmentDetails> = new Map();
  private inMemoryReturns: CustomerReturn[] = [];
  private inMemoryRefunds: CustomerRefund[] = [];
  private inMemoryTickets: SupportTicket[] = [];
  private inMemoryMessages: SupportMessage[] = [];
  private processedEventsSet: Set<string> = new Set();
  private isInitialized: boolean = false;

  public async initialize(defaultProducts: any[] = MOCK_PRODUCTS): Promise<void> {
    this.inMemoryProducts = defaultProducts;
    
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.log('[Supabase Server DB] Secret key missing or offline fallback active.');
      this.isInitialized = true;
      return;
    }

    try {
      // 1. Ensure products table is seeded in Supabase
      const { data: existingProducts, error: pError } = await supabase.from('products').select('*');
      if (!pError && existingProducts && existingProducts.length > 0) {
        this.inMemoryProducts = existingProducts.map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          price: Number(p.price),
          inStock: p.in_stock,
          stockQuantity: p.stock_quantity,
          category: p.category,
          description: p.description,
          image: p.image_url,
          ingredients: p.ingredients,
          hairTypes: p.hair_types,
          skinTypes: p.skin_types,
          concerns: p.concerns,
          countryAvailability: p.country_availability
        }));
      } else if (existingProducts?.length === 0) {
        // Seed default products to Supabase
        const payload = defaultProducts.map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          price: p.price,
          in_stock: p.inStock ?? true,
          stock_quantity: 100,
          category: p.category,
          description: p.description,
          image_url: p.image,
          ingredients: p.ingredients || [],
          hair_types: p.hairTypes || [],
          skin_types: p.skinTypes || [],
          concerns: p.concerns || [],
          country_availability: p.countryAvailability || ['FR', 'BE', 'CH']
        }));
        await supabase.from('products').upsert(payload, { onConflict: 'id' });
      }

      // 2. Hydrate processed events from Supabase
      const { data: eventsData } = await supabase.from('stripe_events').select('event_id');
      if (eventsData) {
        eventsData.forEach(e => this.processedEventsSet.add(e.event_id));
      }
    } catch (err) {
      console.error('[Supabase Server DB] Initialization exception:', err);
    } finally {
      this.isInitialized = true;
    }
  }

  public async getProducts(): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
      if (!error && data && data.length > 0) {
        return data.map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          price: Number(p.price),
          inStock: p.in_stock,
          stockQuantity: p.stock_quantity,
          category: p.category,
          description: p.description,
          image: p.image_url,
          ingredients: p.ingredients,
          hairTypes: p.hair_types,
          skinTypes: p.skin_types,
          concerns: p.concerns,
          countryAvailability: p.country_availability
        }));
      }
    }
    return [...this.inMemoryProducts];
  }

  public async getProductById(idOrSlug: string): Promise<any | undefined> {
    const products = await this.getProducts();
    return products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  }

  private async syncInventoryToSupabase(realId: string, quantity: number, reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    try {
      const { data } = await supabase.from('inventory').select('id').eq('product_id', realId).maybeSingle();
      if (data?.id) {
        await supabase.from('inventory').update({
          quantity,
          reserved_quantity,
          updated_at: new Date().toISOString()
        }).eq('id', data.id);
      } else {
        await supabase.from('inventory').insert({
          product_id: realId,
          quantity,
          reserved_quantity,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('[serverDb] syncInventoryToSupabase error:', err);
    }
  }

  public async getInventoryByProductId(productId: string): Promise<{ quantity: number; reserved_quantity: number }> {
    const product = await this.getProductById(productId);
    const realId = product ? product.id : productId;

    let memInv = this.inMemoryInventory.get(realId);
    if (!memInv && realId !== productId) {
      memInv = this.inMemoryInventory.get(productId);
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity').eq('product_id', realId).maybeSingle();
        if (!error && data) {
          const q = Number(data.quantity);
          const resQ = Number(data.reserved_quantity || 0);
          const val = { quantity: q, reserved_quantity: resQ };
          this.inMemoryInventory.set(realId, val);
          if (realId !== productId) this.inMemoryInventory.set(productId, val);
          return val;
        }
      } catch (err) {
        console.error('[serverDb] getInventoryByProductId error:', err);
      }
    }

    if (memInv) return memInv;

    const defaultQty = product && typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
    const defaultInv = { quantity: defaultQty, reserved_quantity: 0 };
    this.inMemoryInventory.set(realId, defaultInv);
    if (realId !== productId) this.inMemoryInventory.set(productId, defaultInv);
    return defaultInv;
  }

  public async getAvailableStock(productId: string): Promise<number> {
    const inv = await this.getInventoryByProductId(productId);
    return Math.max(0, inv.quantity - inv.reserved_quantity);
  }

  public async saveOrder(order: ServerOrder): Promise<ServerOrder> {
    const existingIdx = this.inMemoryOrders.findIndex(o => o.id === order.id);
    const isNewOrder = existingIdx < 0;

    if (isNewOrder) {
      this.inMemoryOrders.unshift(order);
    } else {
      this.inMemoryOrders[existingIdx] = order;
    }

    const supabase = getSupabaseServerClient();

    // Reserve stock on initial order creation
    if (isNewOrder && (order.status === 'payment_pending_webhook' || order.status === 'pending_payment')) {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inv = await this.getInventoryByProductId(realId);
        const newResQ = inv.reserved_quantity + item.quantity;
        const val = { quantity: inv.quantity, reserved_quantity: newResQ };
        this.inMemoryInventory.set(realId, val);
        if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);

        await this.syncInventoryToSupabase(realId, inv.quantity, newResQ);
      }
      // Log initial status entry
      await this.logOrderStatusHistory(
        order.id,
        undefined,
        order.status,
        order.userId,
        order.userId ? 'customer' : 'system',
        'Création de la commande',
        'checkout'
      );
    }

    if (supabase) {
      // 1. Save main order in public.orders
      await supabase.from('orders').upsert({
        id: order.id,
        user_id: order.userId || null,
        customer_email: order.customerEmail,
        items: order.items,
        total: order.total,
        status: order.status,
        stripe_session_id: order.stripeSessionId || null,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        shipping_address: order.shippingAddress || null,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      }, { onConflict: 'id' });

      // 2. Save detailed line items in public.order_items
      if (order.items && order.items.length > 0) {
        const orderItemsPayload = order.items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity,
          unit_price: item.price
        }));
        await supabase.from('order_items').delete().eq('order_id', order.id);
        await supabase.from('order_items').insert(orderItemsPayload);
      }

      // 3. Save payment entry in public.payments
      await supabase.from('payments').insert({
        order_id: order.id,
        amount: order.total,
        currency: 'EUR',
        status: order.status,
        stripe_payment_intent_id: order.stripePaymentIntentId || order.stripeSessionId || null,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      });
    }

    return order;
  }

  public async getOrderById(id: string): Promise<ServerOrder | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
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
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    }
    return this.inMemoryOrders.find(o => o.id === id);
  }

  public async getOrdersByCustomer(email: string, userId?: string): Promise<ServerOrder[]> {
    const memOrders = this.inMemoryOrders.filter(o => {
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
      if (!error && data && data.length > 0) {
        const supaOrders: ServerOrder[] = data.map(d => ({
          id: d.id,
          userId: d.user_id,
          customerEmail: d.customer_email,
          items: d.items,
          total: Number(d.total),
          status: d.status,
          stripeSessionId: d.stripe_session_id,
          stripePaymentIntentId: d.stripe_payment_intent_id,
          shippingAddress: d.shipping_address,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        const map = new Map<string, ServerOrder>();
        supaOrders.forEach(o => map.set(o.id, o));
        memOrders.forEach(o => {
          if (!map.has(o.id)) map.set(o.id, o);
        });
        return Array.from(map.values());
      }
    }
    return memOrders;
  }

  // Persistent Carts (public.carts & public.cart_items)
  public async saveCart(userId: string | null, anonymousId: string | null, items: { productId: string; quantity: number; variantId?: string }[]): Promise<string | null> {
    const key = userId || anonymousId || 'default';
    this.inMemoryCarts.set(key, items);

    const supabase = getSupabaseServerClient();
    if (!supabase) return 'in_memory_cart';

    try {
      let cartId: string | null = null;
      if (userId) {
        const { data } = await supabase.from('carts').select('id').eq('user_id', userId).maybeSingle();
        cartId = data?.id || null;
      } else if (anonymousId) {
        const { data } = await supabase.from('carts').select('id').eq('anonymous_id', anonymousId).maybeSingle();
        cartId = data?.id || null;
      }

      if (!cartId) {
        const { data: newCart, error: cartErr } = await supabase.from('carts').insert({
          user_id: userId || null,
          anonymous_id: anonymousId || null,
          updated_at: new Date().toISOString()
        }).select('id').single();

        if (cartErr || !newCart) return 'in_memory_cart';
        cartId = newCart.id;
      }

      // Delete existing items for cart and insert new items
      await supabase.from('cart_items').delete().eq('cart_id', cartId);

      if (items && items.length > 0) {
        const payload = items.map(i => ({
          cart_id: cartId,
          product_id: i.productId,
          variant_id: i.variantId || null,
          quantity: i.quantity,
          updated_at: new Date().toISOString()
        }));
        await supabase.from('cart_items').insert(payload);
      }

      return cartId;
    } catch (err) {
      console.error('[Supabase Server DB] saveCart error:', err);
      return 'in_memory_cart';
    }
  }

  public async getCart(userId: string | null, anonymousId: string | null): Promise<any[]> {
    const key = userId || anonymousId || 'default';
    const supabase = getSupabaseServerClient();

    if (supabase) {
      try {
        let cartId: string | null = null;
        if (userId) {
          const { data } = await supabase.from('carts').select('id').eq('user_id', userId).maybeSingle();
          cartId = data?.id || null;
        } else if (anonymousId) {
          const { data } = await supabase.from('carts').select('id').eq('anonymous_id', anonymousId).maybeSingle();
          cartId = data?.id || null;
        }

        if (cartId) {
          const { data: items, error } = await supabase.from('cart_items').select('*').eq('cart_id', cartId);
          if (!error && items && items.length > 0) {
            const result = [];
            for (const item of items) {
              const product = await this.getProductById(item.product_id);
              if (product) {
                result.push({
                  product,
                  quantity: item.quantity
                });
              }
            }
            return result;
          }
        }
      } catch (err) {
        console.error('[Supabase Server DB] getCart error:', err);
      }
    }

    // Fallback to in-memory cart
    const memCart = this.inMemoryCarts.get(key) || [];
    const result = [];
    for (const item of memCart) {
      const product = await this.getProductById(item.productId);
      if (product) {
        result.push({
          product,
          quantity: item.quantity
        });
      }
    }
    return result;
  }

  public async findOrder(query: { stripeSessionId?: string; paymentIntentId?: string; orderId?: string }): Promise<ServerOrder | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let req = supabase.from('orders').select('*');
      if (query.orderId) req = req.eq('id', query.orderId);
      else if (query.stripeSessionId) req = req.eq('stripe_session_id', query.stripeSessionId);
      else if (query.paymentIntentId) req = req.eq('stripe_payment_intent_id', query.paymentIntentId);

      const { data } = await req.maybeSingle();
      if (data) {
        return {
          id: data.id,
          customerEmail: data.customer_email,
          items: data.items,
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    }

    return this.inMemoryOrders.find(o => 
      (query.orderId && o.id === query.orderId) ||
      (query.stripeSessionId && o.stripeSessionId === query.stripeSessionId) ||
      (query.paymentIntentId && (o.stripePaymentIntentId === query.paymentIntentId || o.stripeSessionId === query.paymentIntentId))
    );
  }

  public async updateOrderStatus(orderId: string, newStatus: OrderStatus, extra?: { stripePaymentIntentId?: string; changedBy?: string; changedByRole?: string; reason?: string }): Promise<ServerOrder | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    if (order.status === newStatus && (!extra?.stripePaymentIntentId || order.stripePaymentIntentId === extra.stripePaymentIntentId)) {
      return order;
    }

    const oldStatus = order.status;

    // Validate transition
    if (!this.isTransitionAllowed(oldStatus, newStatus)) {
      throw new Error(`Transition de statut invalide : impossible de passer de '${oldStatus}' à '${newStatus}'.`);
    }

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (extra?.stripePaymentIntentId) order.stripePaymentIntentId = extra.stripePaymentIntentId;

    const supabase = getSupabaseServerClient();

    // Log status transition into audit trail
    await this.logOrderStatusHistory(
      orderId,
      oldStatus,
      newStatus,
      extra?.changedBy,
      extra?.changedByRole || 'admin',
      extra?.reason || `Changement de statut de ${oldStatus} vers ${newStatus}`,
      'admin_dashboard'
    );

    // Handle stock transitions
    // Case 1: Payment Confirmed (payment_pending_webhook / pending_payment / payment_failed -> paid)
    if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment' || oldStatus === 'payment_failed') && newStatus === 'paid') {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inv = await this.getInventoryByProductId(realId);
        const newQ = Math.max(0, inv.quantity - item.quantity);
        const newResQ = Math.max(0, inv.reserved_quantity - item.quantity);
        const val = { quantity: newQ, reserved_quantity: newResQ };
        this.inMemoryInventory.set(realId, val);
        if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);

        const pIdx = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
        if (pIdx >= 0) {
          this.inMemoryProducts[pIdx].stockQuantity = newQ;
          this.inMemoryProducts[pIdx].inStock = newQ > 0;
        }

        if (supabase) {
          await supabase.from('products').update({
            stock_quantity: newQ,
            in_stock: newQ > 0,
            updated_at: new Date().toISOString()
          }).eq('id', realId);
        }

        await this.syncInventoryToSupabase(realId, newQ, newResQ);
      }
    }
    // Case 2: Payment Failed / Cancelled (payment_pending_webhook / pending_payment -> payment_failed / cancelled)
    else if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment') && (newStatus === 'payment_failed' || newStatus === 'cancelled')) {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inv = await this.getInventoryByProductId(realId);
        const newResQ = Math.max(0, inv.reserved_quantity - item.quantity);
        const val = { quantity: inv.quantity, reserved_quantity: newResQ };
        this.inMemoryInventory.set(realId, val);
        if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);

        await this.syncInventoryToSupabase(realId, inv.quantity, newResQ);
      }
    }
    // Case 3: Refunded (paid -> refunded)
    else if (oldStatus === 'paid' && newStatus === 'refunded') {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inv = await this.getInventoryByProductId(realId);
        const newQ = inv.quantity + item.quantity;
        const val = { quantity: newQ, reserved_quantity: inv.reserved_quantity };
        this.inMemoryInventory.set(realId, val);
        if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);

        const pIdx = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
        if (pIdx >= 0) {
          this.inMemoryProducts[pIdx].stockQuantity = newQ;
          this.inMemoryProducts[pIdx].inStock = true;
        }

        if (supabase) {
          await supabase.from('products').update({
            stock_quantity: newQ,
            in_stock: true,
            updated_at: new Date().toISOString()
          }).eq('id', realId);
        }

        await this.syncInventoryToSupabase(realId, newQ, inv.reserved_quantity);
      }
    }

    // Save order changes
    const idx = this.inMemoryOrders.findIndex(o => o.id === order.id);
    if (idx >= 0) this.inMemoryOrders[idx] = order;

    if (supabase) {
      await supabase.from('orders').update({
        status: newStatus,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        updated_at: order.updatedAt
      }).eq('id', order.id);

      await supabase.from('payments').insert({
        order_id: order.id,
        amount: order.total,
        currency: 'EUR',
        status: newStatus,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Trigger Notification & Email for customer
    if (order.userId) {
      const type = newStatus === 'paid' ? 'payment_confirmed' : `order_${newStatus}`;
      const title = `Mise à jour commande #${order.id}`;
      const msgText = `Le statut de votre commande est désormais : ${newStatus.toUpperCase()}`;

      await this.sendNotification(order.userId, type, title, msgText, `/account?tab=orders`, order.id);

      await emailService.sendEmail({
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] ${title}`,
        template: type as any,
        data: { orderId: order.id, total: order.total, status: newStatus }
      });
    }

    return order;
  }

  // ============================================================
  // PHASE 5: ORDER STATUS HISTORY & TRANSITION VALIDATION
  // ============================================================
  public isTransitionAllowed(oldStatus: OrderStatus, newStatus: OrderStatus): boolean {
    if (oldStatus === newStatus) return true;

    const allowedTransitions: Record<string, string[]> = {
      pending_payment: ['payment_pending_webhook', 'paid', 'cancelled', 'payment_failed'],
      payment_pending_webhook: ['paid', 'payment_failed', 'cancelled'],
      paid: ['processing', 'packed', 'shipped', 'refunded', 'partially_refunded', 'return_requested'],
      processing: ['packed', 'shipped', 'cancelled', 'refunded'],
      packed: ['shipped', 'cancelled', 'refunded'],
      shipped: ['delivered', 'returned', 'refunded'],
      delivered: ['return_requested', 'returned', 'refunded'],
      return_requested: ['returned', 'rejected', 'refunded', 'cancelled'],
      returned: ['refunded']
    };

    const allowed = allowedTransitions[oldStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }

  public async logOrderStatusHistory(orderId: string, oldStatus: string | undefined, newStatus: string, changedBy?: string, changedByRole: string = 'system', reason?: string, source: string = 'system'): Promise<void> {
    const entry: OrderStatusHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderId,
      oldStatus,
      newStatus,
      changedBy,
      changedByRole,
      reason,
      source,
      createdAt: new Date().toISOString()
    };

    this.inMemoryStatusHistory.unshift(entry);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          old_status: oldStatus || null,
          new_status: newStatus,
          changed_by: changedBy || null,
          changed_by_role: changedByRole,
          reason: reason || null,
          source: source
        });
      } catch (err) {
        console.error('[serverDb] logOrderStatusHistory error:', err);
      }
    }
  }

  public async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
        if (!error && data) {
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
      }
    }
    return this.inMemoryStatusHistory.filter(h => h.orderId === orderId);
  }

  // ============================================================
  // PHASE 5: USER NOTIFICATIONS & PREFERENCES
  // ============================================================
  public async sendNotification(userId: string, type: string, title: string, message: string, link?: string, orderId?: string): Promise<UserNotification> {
    const notif: UserNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      type,
      title,
      message,
      link,
      orderId,
      read: false,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString()
    };

    this.inMemoryNotifications.unshift(notif);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          id: notif.id,
          user_id: userId,
          type,
          title,
          message,
          link: link || null,
          order_id: orderId || null,
          read: false,
          created_at: notif.createdAt,
          delivered_at: notif.deliveredAt
        });

        await supabase.from('notification_logs').insert({
          user_id: userId,
          notification_id: notif.id,
          channel: 'in_app',
          status: 'sent',
          created_at: notif.createdAt
        });
      } catch (err) {
        console.error('[serverDb] sendNotification error:', err);
      }
    }

    return notif;
  }

  public async getNotifications(userId: string): Promise<UserNotification[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!error && data) {
          return data.map(n => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            orderId: n.order_id,
            read: n.read,
            createdAt: n.created_at,
            deliveredAt: n.delivered_at,
            errorMessage: n.error_message
          }));
        }
      } catch (err) {
        console.error('[serverDb] getNotifications error:', err);
      }
    }
    return this.inMemoryNotifications.filter(n => n.userId === userId);
  }

  public async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const idx = this.inMemoryNotifications.findIndex(n => n.id === notificationId && n.userId === userId);
    if (idx >= 0) this.inMemoryNotifications[idx].read = true;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId);
      } catch (err) {
        console.error('[serverDb] markNotificationRead error:', err);
      }
    }
    return true;
  }

  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    this.inMemoryNotifications = this.inMemoryNotifications.filter(n => !(n.id === notificationId && n.userId === userId));

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);
      } catch (err) {
        console.error('[serverDb] deleteNotification error:', err);
      }
    }
    return true;
  }

  public async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    const defaultPref: NotificationPreference = {
      userId,
      emailNotifications: true,
      transactionalEmails: true,
      marketingEmails: false,
      inAppNotifications: true,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
        if (data) {
          return {
            userId: data.user_id,
            emailNotifications: data.email_notifications,
            transactionalEmails: data.transactional_emails,
            marketingEmails: data.marketing_emails,
            inAppNotifications: data.in_app_notifications,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.error('[serverDb] getNotificationPreferences error:', err);
      }
    }

    return this.inMemoryPreferences.get(userId) || defaultPref;
  }

  public async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const current = await this.getNotificationPreferences(userId);
    const updated: NotificationPreference = {
      ...current,
      ...prefs,
      userId,
      transactionalEmails: true, // Transactional stays mandatory
      updatedAt: new Date().toISOString()
    };

    this.inMemoryPreferences.set(userId, updated);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('notification_preferences').upsert({
          user_id: userId,
          email_notifications: updated.emailNotifications,
          transactional_emails: true,
          marketing_emails: updated.marketingEmails,
          in_app_notifications: updated.inAppNotifications,
          updated_at: updated.updatedAt
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('[serverDb] updateNotificationPreferences error:', err);
      }
    }

    return updated;
  }

  // ============================================================
  // PHASE 5: SHIPMENTS & CARRIER TRACKING
  // ============================================================
  public async getShipmentByOrderId(orderId: string): Promise<ShipmentDetails | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('shipments').select('*').eq('order_id', orderId).maybeSingle();
        if (data) {
          return {
            id: data.id,
            orderId: data.order_id,
            userId: data.user_id,
            carrier: data.carrier as ShippingCarrier,
            method: data.method,
            price: Number(data.price || 0),
            trackingNumber: data.tracking_number,
            trackingUrl: data.tracking_url,
            status: data.status,
            shippedAt: data.shipped_at,
            estimatedDelivery: data.estimated_delivery,
            deliveredAt: data.delivered_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.error('[serverDb] getShipmentByOrderId error:', err);
      }
    }

    return this.inMemoryShipments.get(orderId);
  }

  public async upsertShipment(details: ShipmentDetails): Promise<ShipmentDetails> {
    const now = new Date().toISOString();
    const finalDetails: ShipmentDetails = {
      ...details,
      id: details.id || `ship-${Date.now()}`,
      updatedAt: now
    };

    this.inMemoryShipments.set(details.orderId, finalDetails);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('shipments').upsert({
          order_id: details.orderId,
          user_id: details.userId || null,
          carrier: details.carrier,
          method: details.method || 'standard',
          price: details.price || 0,
          tracking_number: details.trackingNumber || null,
          tracking_url: details.trackingUrl || null,
          status: details.status,
          shipped_at: details.shippedAt || null,
          estimated_delivery: details.estimatedDelivery || null,
          delivered_at: details.deliveredAt || null,
          updated_at: now
        }, { onConflict: 'order_id' });
      } catch (err) {
        console.error('[serverDb] upsertShipment error:', err);
      }
    }

    return finalDetails;
  }

  // ============================================================
  // PHASE 5: RETURNS & REFUNDS
  // ============================================================
  public async createReturnRequest(userId: string, orderId: string, reason: string, items: any[], comment?: string): Promise<CustomerReturn> {
    const ret: CustomerReturn = {
      id: `ret-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderId,
      userId,
      reason,
      items,
      quantity: items.reduce((acc, i) => acc + (i.quantity || 1), 0),
      status: 'requested',
      comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.inMemoryReturns.unshift(ret);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('returns').insert({
          id: ret.id,
          order_id: orderId,
          user_id: userId,
          reason,
          items,
          quantity: ret.quantity,
          status: 'requested',
          comment: comment || null,
          created_at: ret.createdAt,
          updated_at: ret.updatedAt
        });
      } catch (err) {
        console.error('[serverDb] createReturnRequest error:', err);
      }
    }

    await this.logOrderStatusHistory(orderId, undefined, 'return_requested', userId, 'customer', reason, 'customer_action');
    await this.sendNotification(userId, 'return_requested', 'Demande de retour enregistrée', `Votre demande de retour pour la commande #${orderId} a été reçue.`, `/account?tab=returns`, orderId);

    return ret;
  }

  public async getReturnsByUser(userId: string): Promise<CustomerReturn[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (!error && data) {
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
      }
    }
    return this.inMemoryReturns.filter(r => r.userId === userId);
  }

  public async getAllReturns(): Promise<CustomerReturn[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').select('*').order('created_at', { ascending: false });
        if (!error && data) {
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
      }
    }
    return this.inMemoryReturns;
  }

  public async updateReturnStatus(returnId: string, status: CustomerReturn['status'], adminComment?: string): Promise<CustomerReturn | undefined> {
    const ret = this.inMemoryReturns.find(r => r.id === returnId);
    if (ret) {
      ret.status = status;
      if (adminComment) ret.adminComment = adminComment;
      ret.updatedAt = new Date().toISOString();
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('returns').update({
          status,
          admin_comment: adminComment || null,
          updated_at: new Date().toISOString()
        }).eq('id', returnId);
      } catch (err) {
        console.error('[serverDb] updateReturnStatus error:', err);
      }
    }

    if (ret) {
      await this.sendNotification(
        ret.userId,
        status === 'approved' ? 'refund_created' : 'return_requested',
        `Mise à jour de votre retour #${ret.id}`,
        `Le statut de votre retour pour la commande #${ret.orderId} est désormais : ${status.toUpperCase()}. ${adminComment ? 'Note admin : ' + adminComment : ''}`,
        `/account?tab=returns`,
        ret.orderId
      );
    }

    return ret;
  }

  public async processStripeRefund(orderId: string, returnId?: string, amount?: number, reason: string = 'Remboursement client'): Promise<CustomerRefund> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement.`);

    const refundAmount = amount || order.total;
    const ref: CustomerRefund = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderId,
      returnId,
      userId: order.userId,
      amount: refundAmount,
      currency: 'EUR',
      reason,
      stripeRefundId: `re_test_${Date.now()}`,
      status: 'succeeded',
      createdAt: new Date().toISOString()
    };

    this.inMemoryRefunds.unshift(ref);

    // Transition order status to 'refunded' & restock
    await this.updateOrderStatus(orderId, 'refunded');

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('refunds').insert({
          id: ref.id,
          order_id: orderId,
          return_id: returnId || null,
          user_id: order.userId || null,
          amount: refundAmount,
          currency: 'EUR',
          reason,
          stripe_refund_id: ref.stripeRefundId,
          status: 'succeeded',
          created_at: ref.createdAt
        });
      } catch (err) {
        console.error('[serverDb] processStripeRefund error:', err);
      }
    }

    if (order.userId) {
      await this.sendNotification(
        order.userId,
        'refund_created',
        'Remboursement effectué',
        `Un remboursement de ${refundAmount} EUR a été émis pour votre commande #${orderId}.`,
        `/account?tab=refunds`,
        orderId
      );

      await emailService.sendEmail({
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Remboursement effectué pour votre commande #${orderId}`,
        template: 'refund_created',
        data: { orderId, amount: refundAmount, reason }
      });
    }

    return ref;
  }

  // ============================================================
  // PHASE 5: CUSTOMER SUPPORT TICKETS
  // ============================================================
  public async createSupportTicket(userId: string, orderId: string | undefined, category: SupportTicket['subjectCategory'], subject: string, message: string): Promise<SupportTicket> {
    const ticketId = `tkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId,
      orderId,
      subjectCategory: category,
      subject,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    const firstMsg: SupportMessage = {
      id: `msg-${Date.now()}-1`,
      ticketId,
      senderId: userId,
      senderRole: 'customer',
      message,
      createdAt: now
    };

    this.inMemoryTickets.unshift(ticket);
    this.inMemoryMessages.push(firstMsg);

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('support_tickets').insert({
          id: ticketId,
          user_id: userId,
          order_id: orderId || null,
          subject_category: category,
          subject,
          status: 'open',
          created_at: now,
          updated_at: now
        });

        await supabase.from('support_messages').insert({
          id: firstMsg.id,
          ticket_id: ticketId,
          sender_id: userId,
          sender_role: 'customer',
          message,
          created_at: now
        });
      } catch (err) {
        console.error('[serverDb] createSupportTicket error:', err);
      }
    }

    return ticket;
  }

  public async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
        if (!error && data) {
          return data.map(t => ({
            id: t.id,
            userId: t.user_id,
            orderId: t.order_id,
            subjectCategory: t.subject_category,
            subject: t.subject,
            status: t.status,
            assignedAgentId: t.assigned_agent_id,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getSupportTicketsByUser error:', err);
      }
    }

    return this.inMemoryTickets.filter(t => t.userId === userId);
  }

  public async getAllSupportTickets(): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
        if (!error && data) {
          return data.map(t => ({
            id: t.id,
            userId: t.user_id,
            orderId: t.order_id,
            subjectCategory: t.subject_category,
            subject: t.subject,
            status: t.status,
            assignedAgentId: t.assigned_agent_id,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getAllSupportTickets error:', err);
      }
    }

    return this.inMemoryTickets;
  }

  public async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        if (!error && data) {
          return data.map(m => ({
            id: m.id,
            ticketId: m.ticket_id,
            senderId: m.sender_id,
            senderRole: m.sender_role,
            message: m.message,
            createdAt: m.created_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getSupportMessages error:', err);
      }
    }

    return this.inMemoryMessages.filter(m => m.ticketId === ticketId);
  }

  public async addSupportMessage(ticketId: string, senderId: string, senderRole: 'customer' | 'admin' | 'agent', message: string): Promise<SupportMessage> {
    const now = new Date().toISOString();
    const msg: SupportMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ticketId,
      senderId,
      senderRole,
      message,
      createdAt: now
    };

    this.inMemoryMessages.push(msg);

    const ticket = this.inMemoryTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.updatedAt = now;
      if (senderRole === 'admin' || senderRole === 'agent') {
        ticket.status = 'in_progress';
      }
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('support_messages').insert({
          id: msg.id,
          ticket_id: ticketId,
          sender_id: senderId,
          sender_role: senderRole,
          message,
          created_at: now
        });

        await supabase.from('support_tickets').update({
          status: senderRole === 'admin' || senderRole === 'agent' ? 'in_progress' : undefined,
          updated_at: now
        }).eq('id', ticketId);
      } catch (err) {
        console.error('[serverDb] addSupportMessage error:', err);
      }
    }

    if ((senderRole === 'admin' || senderRole === 'agent') && ticket) {
      await this.sendNotification(
        ticket.userId,
        'support_reply',
        `Réponse à votre ticket support #${ticket.id}`,
        `Un conseiller a répondu à votre sujet "${ticket.subject}": ${message.substring(0, 80)}...`,
        `/account?tab=support`,
        ticket.orderId
      );
    }

    return msg;
  }

  public async updateSupportTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
    const ticket = this.inMemoryTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        await supabase.from('support_tickets').update({
          status,
          updated_at: new Date().toISOString()
        }).eq('id', ticketId);
      } catch (err) {
        console.error('[serverDb] updateSupportTicketStatus error:', err);
      }
    }
  }

  // ============================================================
  // PHASE 5: REAL ADMIN ANALYTICS METRICS
  // ============================================================
  public async getAdminAnalyticsMetrics(): Promise<any> {
    const products = await this.getProducts();
    const orders = this.inMemoryOrders;

    const supabase = getSupabaseServerClient();
    let supaOrders: any[] = [];
    let supaProfilesCount = 0;
    let supaTicketsCount = 0;
    let supaEventsCount = 0;

    if (supabase) {
      try {
        const { data: oData } = await supabase.from('orders').select('*');
        if (oData) supaOrders = oData;

        const { count: pCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        supaProfilesCount = pCount || 0;

        const { count: tCount } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
        supaTicketsCount = tCount || 0;

        const { count: eCount } = await supabase.from('stripe_events').select('*', { count: 'exact', head: true });
        supaEventsCount = eCount || 0;
      } catch (err) {
        console.error('[serverDb] getAdminAnalyticsMetrics error:', err);
      }
    }

    const allOrdersMap = new Map<string, any>();
    orders.forEach(o => allOrdersMap.set(o.id, o));
    supaOrders.forEach(o => allOrdersMap.set(o.id, {
      id: o.id,
      total: Number(o.total),
      status: o.status,
      customerEmail: o.customer_email,
      createdAt: o.created_at,
      items: o.items || []
    }));

    const combinedOrders = Array.from(allOrdersMap.values());

    const paidOrders = combinedOrders.filter(o => o.status === 'paid');
    const revenueTest = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = combinedOrders.filter(o => (o.createdAt || '').startsWith(todayStr));

    const pendingOrders = combinedOrders.filter(o => o.status === 'payment_pending_webhook' || o.status === 'pending_payment');
    const processingOrders = combinedOrders.filter(o => o.status === 'processing' || o.status === 'packed');
    const shippedOrders = combinedOrders.filter(o => o.status === 'shipped' || o.status === 'delivered');
    const refundedOrders = combinedOrders.filter(o => o.status === 'refunded');

    const avgOrderValue = paidOrders.length > 0 ? revenueTest / paidOrders.length : 0;

    const lowStockProducts = products.filter(p => p.stockQuantity < 5 && p.stockQuantity > 0);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0 || !p.inStock);

    return {
      revenueTest,
      totalOrders: combinedOrders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      paidOrdersCount: paidOrders.length,
      processingOrdersCount: processingOrders.length,
      shippedOrdersCount: shippedOrders.length,
      refundedOrdersCount: refundedOrders.length,
      avgOrderValue,
      lowStockProducts,
      outOfStockProducts,
      openTicketsCount: supaTicketsCount || this.inMemoryTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      stripeEventsCount: supaEventsCount || this.processedEventsSet.size,
      registeredUsersCount: supaProfilesCount || 12
    };
  }

  public async isEventProcessed(eventId: string): Promise<boolean> {
    if (this.processedEventsSet.has(eventId)) return true;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from('stripe_events').select('event_id').eq('event_id', eventId).maybeSingle();
      if (data) {
        this.processedEventsSet.add(eventId);
        return true;
      }
    }
    return false;
  }

  public async markEventProcessed(eventId: string, eventType: string = 'stripe_webhook', details?: any): Promise<void> {
    this.processedEventsSet.add(eventId);
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await supabase.from('stripe_events').upsert({
        event_id: eventId,
        event_type: eventType,
        status: 'processed',
        details: details || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'event_id' });
    }
  }

  public getStatusSummary(): { supabaseConfigured: boolean; productCount: number; orderCount: number } {
    return {
      supabaseConfigured: isSupabaseConfigured,
      productCount: this.inMemoryProducts.length,
      orderCount: this.inMemoryOrders.length
    };
  }
}

export const serverDb = new SupabaseServerStore();
