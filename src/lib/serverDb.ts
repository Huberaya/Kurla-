import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient, isSupabaseServerConfigured } from './supabaseClient';
import { MOCK_PRODUCTS } from '../data/mockData';
import { emailService } from './emailService';
import { shippingService, ShippingCarrier, ShipmentDetails } from './shippingService';
import {
  BeautyProfile,
  BeautyProfileHistoryEntry,
  BeautyProfilePhoto,
  BeautyProfileRecord,
  ProfileConfidence,
  calculateProfileConfidence,
  normalizeBeautyProfile
} from './beautyProfile';

function ensureDatabaseSuccess(operation: string, error: { message?: string } | null | undefined): void {
  if (error) {
    throw new Error(`[Supabase] ${operation}: ${error.message || 'opération refusée'}`);
  }
}

function getStripeServerClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
    timeout: 15_000,
    maxNetworkRetries: 2
  }) : null;
}

function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapRefundRow(row: any): CustomerRefund {
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
      quantity: Number(item.quantity)
    })) : [],
    status: row.status,
    createdAt: row.created_at
  };
}

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
  checkoutIdempotencyKey?: string;
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
  idempotencyKey?: string;
  stockRestored?: boolean;
  items?: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>;
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

export type ProfessionalApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface ProfessionalApplication {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  profession: string;
  experience: string;
  portfolioUrl?: string;
  acceptsCharter: boolean;
  status: ProfessionalApplicationStatus;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
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
  private inMemoryProfessionalApplications: ProfessionalApplication[] = [];
  private inMemoryBeautyProfiles: Map<string, BeautyProfileRecord> = new Map();
  private inMemoryBeautyProfileHistory: Map<string, BeautyProfileHistoryEntry[]> = new Map();
  private inMemoryBeautyProfilePhotos: Map<string, BeautyProfilePhoto[]> = new Map();
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
      ensureDatabaseSuccess('lecture du catalogue au démarrage', pError);
      if (existingProducts && existingProducts.length > 0) {
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
        const { error: seedError } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
        ensureDatabaseSuccess('initialisation du catalogue', seedError);
      }

      // 2. Hydrate processed events from Supabase
      const { data: eventsData, error: eventsError } = await supabase.from('stripe_events').select('event_id');
      ensureDatabaseSuccess('lecture des événements Stripe', eventsError);
      if (eventsData) {
        eventsData.forEach(e => this.processedEventsSet.add(e.event_id));
      }
    } catch (err) {
      console.error('[Supabase Server DB] Initialization exception:', err);
      throw err;
    } finally {
      this.isInitialized = true;
    }
  }

  public async getProducts(): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
      ensureDatabaseSuccess('lecture du catalogue', error);
      return (data || []).map(p => ({
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
      const { data, error: selectError } = await supabase.from('inventory').select('id').eq('product_id', realId).is('variant_id', null).maybeSingle();
      ensureDatabaseSuccess('lecture inventory', selectError);
      if (data?.id) {
        const { error } = await supabase.from('inventory').update({
          quantity,
          reserved_quantity,
          updated_at: new Date().toISOString()
        }).eq('id', data.id);
        ensureDatabaseSuccess('mise à jour inventory', error);
      } else {
        const { error } = await supabase.from('inventory').insert({
          product_id: realId,
          quantity,
          reserved_quantity,
          updated_at: new Date().toISOString()
        });
        ensureDatabaseSuccess('création inventory', error);
      }
    } catch (err) {
      console.error('[serverDb] syncInventoryToSupabase error:', err);
      throw err;
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
        const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity').eq('product_id', realId).is('variant_id', null).maybeSingle();
        ensureDatabaseSuccess('lecture de l’inventaire', error);
        if (data) {
          const q = Number(data.quantity);
          const resQ = Number(data.reserved_quantity || 0);
          const val = { quantity: q, reserved_quantity: resQ };
          this.inMemoryInventory.set(realId, val);
          if (realId !== productId) this.inMemoryInventory.set(productId, val);
          return val;
        }
      } catch (err) {
        console.error('[serverDb] getInventoryByProductId error:', err);
        throw err;
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
    const supabase = getSupabaseServerClient();
    let isNewOrder = existingIdx < 0;
    if (supabase && isNewOrder) {
      const { data, error } = await supabase.from('orders').select('id').eq('id', order.id).maybeSingle();
      ensureDatabaseSuccess('vérification de la commande existante', error);
      isNewOrder = !data;
    }
    const isInitialPayment = isNewOrder && (order.status === 'payment_pending_webhook' || order.status === 'pending_payment');

    // Reserve stock on initial order creation. The Supabase path uses row
    // locks inside PostgreSQL so concurrent checkouts cannot oversell. No
    // in-memory order is exposed until all required persistent writes pass.
    if (isInitialPayment) {
      if (supabase) {
        const { error: reserveError } = await supabase.rpc('reserve_stock_for_order', {
          p_items: order.items.map(item => ({ product_id: item.productId, quantity: item.quantity }))
        });
        ensureDatabaseSuccess('réservation atomique du stock', reserveError);
      } else {
        for (const item of order.items) {
          const product = await this.getProductById(item.productId);
          const realId = product ? product.id : item.productId;
          const inv = await this.getInventoryByProductId(realId);
          const newResQ = inv.reserved_quantity + item.quantity;
          const val = { quantity: inv.quantity, reserved_quantity: newResQ };
          this.inMemoryInventory.set(realId, val);
          if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);
        }
      }
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
    if (isNewOrder || existingIdx < 0) this.inMemoryOrders.unshift(order);
    else this.inMemoryOrders[existingIdx] = order;

    // The order must exist before its history row is inserted (FK safety).
    if (isInitialPayment) {
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

    return order;
  }

  public async updateOrderStripeSession(orderId: string, stripeSessionId: string): Promise<ServerOrder | undefined> {
    const order = await this.getOrderById(orderId);
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

    const index = this.inMemoryOrders.findIndex(existing => existing.id === orderId);
    if (index >= 0) this.inMemoryOrders[index] = updatedOrder;
    else if (supabase) this.inMemoryOrders.unshift(updatedOrder);

    return updatedOrder;
  }

  public async getOrderById(id: string): Promise<ServerOrder | undefined> {
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
          updatedAt: data.updated_at
        };
      }
    }
    return supabase ? undefined : this.inMemoryOrders.find(o => o.id === id);
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
          updatedAt: d.updated_at
        }));
        return supaOrders;
      }
    }
    return supabase ? [] : memOrders;
  }

  // Persistent Carts (public.carts & public.cart_items)
  private async normalizeCartItems(items: { productId: string; quantity: number; variantId?: string }[]): Promise<{ productId: string; quantity: number; variantId?: string }[]> {
    if (!Array.isArray(items)) throw new Error('Panier invalide.');

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

      const product = await this.getProductById(item.productId);
      if (!product) throw new Error(`Produit de panier introuvable : ${item.productId}.`);
      const key = `${product.id}:${item.variantId || ''}`;
      const quantity = (normalized.get(key)?.quantity || 0) + item.quantity;
      if (quantity > 99) throw new Error('La quantité totale d’un article de panier ne peut pas dépasser 99.');
      normalized.set(key, { productId: product.id, quantity, variantId: item.variantId });
    }
    return Array.from(normalized.values());
  }

  public async saveCart(userId: string | null, anonymousId: string | null, items: { productId: string; quantity: number; variantId?: string }[]): Promise<string | null> {
    if ((!userId && !anonymousId) || (userId && anonymousId)) {
      throw new Error('Un seul propriétaire de panier est requis.');
    }

    const normalizedItems = await this.normalizeCartItems(items);
    const key = userId || anonymousId!;
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      this.inMemoryCarts.set(key, normalizedItems);
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
      this.inMemoryCarts.set(key, normalizedItems);
      return data as string;
    } catch (err) {
      console.error('[Supabase Server DB] saveCart error:', err);
      throw err;
    }
  }

  public async getCart(userId: string | null, anonymousId: string | null): Promise<any[]> {
    const key = userId || anonymousId || 'default';
    const supabase = getSupabaseServerClient();

    if (supabase) {
      try {
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
              const product = await this.getProductById(item.product_id);
              if (product) {
                result.push({
                  product,
                  quantity: item.quantity,
                  variantId: item.variant_id || undefined
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
    const memCart = this.inMemoryCarts.get(key) || [];
    const result = [];
    for (const item of memCart) {
      const product = await this.getProductById(item.productId);
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

  public async findOrder(query: { stripeSessionId?: string; paymentIntentId?: string; orderId?: string; checkoutIdempotencyKey?: string }): Promise<ServerOrder | undefined> {
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
          updatedAt: data.updated_at
        };
      }
    }

    return supabase ? undefined : this.inMemoryOrders.find(o =>
      (query.orderId && o.id === query.orderId) ||
      (query.stripeSessionId && o.stripeSessionId === query.stripeSessionId) ||
      (query.paymentIntentId && (o.stripePaymentIntentId === query.paymentIntentId || o.stripeSessionId === query.paymentIntentId)) ||
      (query.checkoutIdempotencyKey && o.checkoutIdempotencyKey === query.checkoutIdempotencyKey)
    );
  }

  public async updateOrderStatus(orderId: string, newStatus: OrderStatus, extra?: {
    stripePaymentIntentId?: string;
    changedBy?: string;
    changedByRole?: string;
    reason?: string;
    restockItems?: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>;
  }): Promise<ServerOrder | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    if (order.status === newStatus) {
      // Multiple Stripe event types can confirm the same payment. Updating a
      // newly learned PaymentIntent is allowed, but it must not restock,
      // append a second payment row, or create another status transition.
      if (extra?.stripePaymentIntentId && order.stripePaymentIntentId !== extra.stripePaymentIntentId) {
        order.stripePaymentIntentId = extra.stripePaymentIntentId;
        order.updatedAt = new Date().toISOString();
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const { error } = await supabase.from('orders').update({
            stripe_payment_intent_id: order.stripePaymentIntentId,
            updated_at: order.updatedAt
          }).eq('id', order.id);
          ensureDatabaseSuccess('mise à jour du PaymentIntent de la commande', error);
        }
        const index = this.inMemoryOrders.findIndex(existing => existing.id === order.id);
        if (index >= 0) this.inMemoryOrders[index] = order;
        else if (supabase) this.inMemoryOrders.unshift(order);
      }
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
        if (!supabase) {
          this.inMemoryInventory.set(realId, val);
          if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);

          const pIdx = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
          if (pIdx >= 0) {
            this.inMemoryProducts[pIdx].stockQuantity = newQ;
            this.inMemoryProducts[pIdx].inStock = newQ > 0;
          }
        }

        if (supabase) {
          const { error } = await supabase.from('products').update({
            stock_quantity: newQ,
            in_stock: newQ > 0,
            updated_at: new Date().toISOString()
          }).eq('id', realId);
          ensureDatabaseSuccess('mise à jour du stock produit', error);
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
        if (!supabase) {
          this.inMemoryInventory.set(realId, val);
          if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);
        }

        await this.syncInventoryToSupabase(realId, inv.quantity, newResQ);
      }
    }
    // Case 3: Refunds restore only the returned quantities. A direct full
    // refund transition keeps the legacy behavior and restores all items;
    // processStripeRefund passes an explicit item list for partial returns.
    else if (
      ['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'partially_refunded'].includes(oldStatus)
      && (newStatus === 'refunded' || newStatus === 'partially_refunded')
    ) {
      const itemsToRestore = extra?.restockItems || (newStatus === 'refunded' ? order.items : []);
      for (const item of itemsToRestore) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inv = await this.getInventoryByProductId(realId);
        const newQ = inv.quantity + item.quantity;
        const val = { quantity: newQ, reserved_quantity: inv.reserved_quantity };
        if (!supabase) {
          this.inMemoryInventory.set(realId, val);
          if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);

          const pIdx = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
          if (pIdx >= 0) {
            this.inMemoryProducts[pIdx].stockQuantity = newQ;
            this.inMemoryProducts[pIdx].inStock = true;
          }
        }

        if (supabase) {
          const { error } = await supabase.from('products').update({
            stock_quantity: newQ,
            in_stock: true,
            updated_at: new Date().toISOString()
          }).eq('id', realId);
          ensureDatabaseSuccess('restauration du stock produit', error);
        }

        await this.syncInventoryToSupabase(realId, newQ, inv.reserved_quantity);
      }
    }

    // Save order changes in the local cache only after the persistent path,
    // when one is configured, has accepted the operation.
    const idx = this.inMemoryOrders.findIndex(o => o.id === order.id);
    if (!supabase && idx >= 0) this.inMemoryOrders[idx] = order;

    if (supabase) {
      const { error: orderError } = await supabase.from('orders').update({
        status: newStatus,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        updated_at: order.updatedAt
      }).eq('id', order.id);
      ensureDatabaseSuccess('mise à jour du statut de commande', orderError);

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: order.id,
        amount: order.total,
        currency: 'EUR',
        status: newStatus,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      ensureDatabaseSuccess('création du paiement de statut', paymentError);
      if (idx >= 0) this.inMemoryOrders[idx] = order;
      else this.inMemoryOrders.unshift(order);
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

  public async logOrderStatusHistory(orderId: string, oldStatus: string | undefined, newStatus: string, changedBy?: string, changedByRole: string = 'system', reason?: string, source: string = 'system'): Promise<void> {
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

    this.inMemoryStatusHistory.unshift(entry);
  }

  public async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
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
    return this.inMemoryStatusHistory.filter(h => h.orderId === orderId);
  }

  // ============================================================
  // PHASE 5: USER NOTIFICATIONS & PREFERENCES
  // ============================================================
  public async sendNotification(userId: string, type: string, title: string, message: string, link?: string, orderId?: string): Promise<UserNotification> {
    const notif: UserNotification = {
      id: randomUUID(),
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

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: notificationError } = await supabase.from('notifications').insert({
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
        ensureDatabaseSuccess('création de la notification', notificationError);

        const { error: logError } = await supabase.from('notification_logs').insert({
          user_id: userId,
          notification_id: notif.id,
          channel: 'in_app',
          status: 'sent',
          created_at: notif.createdAt
        });
        ensureDatabaseSuccess('création du journal de notification', logError);
      } catch (err) {
        console.error('[serverDb] sendNotification error:', err);
        throw err;
      }
    }

    this.inMemoryNotifications.unshift(notif);
    return notif;
  }

  public async getNotifications(userId: string): Promise<UserNotification[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture des notifications', error);
        if (data) {
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
        throw err;
      }
    }
    return this.inMemoryNotifications.filter(n => n.userId === userId);
  }

  public async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId).select('id').maybeSingle();
        ensureDatabaseSuccess('marquage de notification comme lue', error);
        if (!data) return false;
      } catch (err) {
        console.error('[serverDb] markNotificationRead error:', err);
        throw err;
      }
    }

    const idx = this.inMemoryNotifications.findIndex(n => n.id === notificationId && n.userId === userId);
    if (idx >= 0) this.inMemoryNotifications[idx].read = true;
    return idx >= 0 || !!supabase;
  }

  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);
        ensureDatabaseSuccess('suppression de notification', error);
      } catch (err) {
        console.error('[serverDb] deleteNotification error:', err);
        throw err;
      }
    }

    const before = this.inMemoryNotifications.length;
    this.inMemoryNotifications = this.inMemoryNotifications.filter(n => !(n.id === notificationId && n.userId === userId));
    return before !== this.inMemoryNotifications.length || !!supabase;
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
        const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
        ensureDatabaseSuccess('lecture des préférences de notification', error);
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
        throw err;
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

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('notification_preferences').upsert({
          user_id: userId,
          email_notifications: updated.emailNotifications,
          transactional_emails: true,
          marketing_emails: updated.marketingEmails,
          in_app_notifications: updated.inAppNotifications,
          updated_at: updated.updatedAt
        }, { onConflict: 'user_id' });
        ensureDatabaseSuccess('mise à jour des préférences de notification', error);
      } catch (err) {
        console.error('[serverDb] updateNotificationPreferences error:', err);
        throw err;
      }
    }

    this.inMemoryPreferences.set(userId, updated);
    return updated;
  }

  // ============================================================
  // PHASE 5: SHIPMENTS & CARRIER TRACKING
  // ============================================================
  public async getShipmentByOrderId(orderId: string): Promise<ShipmentDetails | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('shipments').select('*').eq('order_id', orderId).maybeSingle();
        ensureDatabaseSuccess('lecture de l’expédition', error);
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
        throw err;
      }
    }

    return supabase ? undefined : this.inMemoryShipments.get(orderId);
  }

  public async upsertShipment(details: ShipmentDetails): Promise<ShipmentDetails> {
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    let shipmentId = isUuid(details.id) ? details.id : randomUUID();

    if (supabase) {
      const { data: existingShipment, error: lookupError } = await supabase
        .from('shipments')
        .select('id')
        .eq('order_id', details.orderId)
        .maybeSingle();
      ensureDatabaseSuccess('vérification de l’expédition existante', lookupError);
      // Keep the existing primary key so shipping_events remain attached when
      // the current shipment is updated through the order-level upsert.
      if (existingShipment?.id) shipmentId = existingShipment.id;
    }

    const finalDetails: ShipmentDetails = {
      ...details,
      id: shipmentId,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('shipments').upsert({
          id: finalDetails.id,
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
        ensureDatabaseSuccess('sauvegarde de l’expédition', error);
      } catch (err) {
        console.error('[serverDb] upsertShipment error:', err);
        throw err;
      }
    }

    this.inMemoryShipments.set(details.orderId, finalDetails);
    return finalDetails;
  }

  // ============================================================
  // PHASE 5: RETURNS & REFUNDS
  // ============================================================
  public async createReturnRequest(userId: string, orderId: string, reason: string, items: any[], comment?: string): Promise<CustomerReturn> {
    if (!reason.trim() || !Array.isArray(items) || items.length === 0) {
      throw new Error('Les informations de retour sont incomplètes.');
    }

    const order = await this.getOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new Error('Commande introuvable pour ce client.');
    }
    if (!['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested'].includes(order.status)) {
      throw new Error(`La commande #${orderId} n’est pas éligible à une demande de retour depuis le statut '${order.status}'.`);
    }

    const orderQuantities = new Map(order.items.map(item => [item.productId, item.quantity]));
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
          const quantity = Number(item?.quantity);
          if (typeof productId === 'string' && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(productId, (alreadyRequested.get(productId) || 0) + quantity);
          }
        }
      }
    } else {
      for (const previous of this.inMemoryReturns) {
        if (previous.orderId !== orderId || ['rejected', 'cancelled'].includes(previous.status)) continue;
        for (const item of previous.items || []) {
          const productId = item?.productId || item?.product_id;
          const quantity = Number(item?.quantity);
          if (typeof productId === 'string' && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(productId, (alreadyRequested.get(productId) || 0) + quantity);
          }
        }
      }
    }

    const normalizedItems = new Map<string, { productId: string; quantity: number }>();
    for (const item of items) {
      const productId = item?.productId || item?.product_id;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('Ligne de retour invalide.');
      }
      const nextQuantity = (normalizedItems.get(productId)?.quantity || 0) + quantity;
      const totalRequested = (alreadyRequested.get(productId) || 0) + nextQuantity;
      if (!orderQuantities.has(productId) || totalRequested > orderQuantities.get(productId)!) {
        throw new Error(`Quantité retournée invalide pour le produit ${productId}.`);
      }
      normalizedItems.set(productId, { productId, quantity: nextQuantity });
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

    this.inMemoryReturns.unshift(ret);
    await this.logOrderStatusHistory(orderId, undefined, 'return_requested', userId, 'customer', ret.reason, 'customer_action');
    await this.sendNotification(userId, 'return_requested', 'Demande de retour enregistrée', `Votre demande de retour pour la commande #${orderId} a été reçue.`, `/account?tab=returns`, orderId);

    return ret;
  }

  public async getReturnsByUser(userId: string): Promise<CustomerReturn[]> {
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
    return this.inMemoryReturns.filter(r => r.userId === userId);
  }

  public async getAllReturns(): Promise<CustomerReturn[]> {
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
    return this.inMemoryReturns;
  }

  public async updateReturnStatus(returnId: string, status: CustomerReturn['status'], adminComment?: string): Promise<CustomerReturn | undefined> {
    const supabase = getSupabaseServerClient();
    const memoryReturn = this.inMemoryReturns.find(r => r.id === returnId);
    const currentReturn = supabase ? await this.getReturnById(returnId) : memoryReturn;
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

    const index = this.inMemoryReturns.findIndex(r => r.id === returnId);
    if (index >= 0) this.inMemoryReturns[index] = updatedReturn;
    else if (!supabase) this.inMemoryReturns.unshift(updatedReturn);

    await this.sendNotification(
      updatedReturn.userId,
      status === 'approved' ? 'refund_created' : 'return_requested',
      `Mise à jour de votre retour #${updatedReturn.id}`,
      `Le statut de votre retour pour la commande #${updatedReturn.orderId} est désormais : ${status.toUpperCase()}. ${adminComment ? 'Note admin : ' + adminComment : ''}`,
      `/account?tab=returns`,
      updatedReturn.orderId
    );

    return updatedReturn;
  }

  private async getRefundsByOrder(orderId: string): Promise<CustomerRefund[]> {
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
    return this.inMemoryRefunds.filter(refund => refund.orderId === orderId);
  }

  private async findRefundByIdempotencyKey(idempotencyKey: string): Promise<CustomerRefund | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('refunds').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
      ensureDatabaseSuccess('recherche du remboursement idempotent', error);
      return data ? mapRefundRow(data) : undefined;
    }
    return this.inMemoryRefunds.find(refund => refund.idempotencyKey === idempotencyKey);
  }

  private async findRefundByStripeId(stripeRefundId: string): Promise<CustomerRefund | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('refunds').select('*').eq('stripe_refund_id', stripeRefundId).maybeSingle();
      ensureDatabaseSuccess('recherche du remboursement Stripe', error);
      return data ? mapRefundRow(data) : undefined;
    }
    return this.inMemoryRefunds.find(refund => refund.stripeRefundId === stripeRefundId);
  }

  private async getReturnById(returnId: string): Promise<CustomerReturn | undefined> {
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
    return this.inMemoryReturns.find(ret => ret.id === returnId);
  }

  private async getRefundItems(
    order: ServerOrder,
    returnId: string | undefined,
    amountCents: number,
    remainingCents: number,
    previousRefunds: CustomerRefund[] = []
  ): Promise<Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>> {
    const orderItems = new Map(order.items.map(item => [item.productId, item]));
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
          previouslyRestored.set(item.productId, (previouslyRestored.get(item.productId) || 0) + item.quantity);
        }
      }
    }

    let requestedItems: any[] = order.items;
    if (returnId) {
      const ret = await this.getReturnById(returnId);
      if (!ret || ret.orderId !== order.id) {
        throw new Error(`Demande de retour #${returnId} introuvable pour la commande #${order.id}.`);
      }
      if (!['approved', 'received'].includes(ret.status)) {
        throw new Error(`La demande de retour #${returnId} doit être approuvée avant remboursement.`);
      }
      requestedItems = ret.items;
    } else {
      if (amountCents !== remainingCents) {
        throw new Error('Un remboursement partiel doit être rattaché à une demande de retour.');
      }
      requestedItems = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity - (previouslyRestored.get(item.productId) || 0)
      })).filter(item => item.quantity > 0);
    }

    const requestedQuantities = new Map<string, number>();
    for (const item of requestedItems) {
      const productId = item?.productId || item?.product_id;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error(`Quantité remboursée invalide pour le produit ${productId || 'inconnu'}.`);
      }
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    }

    const refundItems = Array.from(requestedQuantities, ([productId, requestedQuantity]) => {
      const orderItem = orderItems.get(productId);
      const alreadyRestored = previouslyRestored.get(productId) || 0;
      const availableQuantity = (orderItem?.quantity || 0) - alreadyRestored;
      if (!orderItem || requestedQuantity > availableQuantity) {
        throw new Error(`Quantité remboursée invalide pour le produit ${productId}.`);
      }
      return { productId, quantity: requestedQuantity };
    });

    if (refundItems.length === 0) {
      throw new Error('Aucun article valide à rembourser.');
    }

    const maximumItemAmountCents = refundItems.reduce((sum, item) => {
      const orderItem = orderItems.get(item.productId)!;
      return sum + Math.round(orderItem.price * 100) * item.quantity;
    }, 0);
    if (amountCents > maximumItemAmountCents) {
      throw new Error('Le montant du remboursement dépasse la valeur des articles retournés.');
    }

    return refundItems;
  }

  private async restoreLocalRefundStock(order: ServerOrder, items: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>): Promise<void> {
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      const realId = product ? product.id : item.productId;
      const inventory = await this.getInventoryByProductId(realId);
      const quantity = inventory.quantity + item.quantity;
      const updatedInventory = { quantity, reserved_quantity: inventory.reserved_quantity };
      this.inMemoryInventory.set(realId, updatedInventory);
      if (realId !== item.productId) this.inMemoryInventory.set(item.productId, updatedInventory);

      const productIndex = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
      if (productIndex >= 0) {
        this.inMemoryProducts[productIndex].stockQuantity = quantity;
        this.inMemoryProducts[productIndex].inStock = true;
      }
    }
  }

  private async finalizeRefund(input: {
    order: ServerOrder;
    returnId?: string;
    amount: number;
    currency: string;
    reason: string;
    stripeRefundId?: string;
    idempotencyKey: string;
    status: 'pending' | 'succeeded';
    items: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>;
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
        p_items: input.items,
        p_apply_stock: input.applyStock
      });
      ensureDatabaseSuccess('finalisation atomique du remboursement', error);
      if (!data) throw new Error('[Supabase] finalisation atomique du remboursement: réponse vide');
      return mapRefundRow(Array.isArray(data) ? data[0] : data);
    }

    const existing = this.inMemoryRefunds.find(refund =>
      refund.idempotencyKey === input.idempotencyKey
      || (!!input.stripeRefundId && refund.stripeRefundId === input.stripeRefundId)
    );
    if (existing) {
      if (input.applyStock && input.status === 'succeeded' && !existing.stockRestored) {
        await this.restoreLocalRefundStock(input.order, input.items);
        existing.stockRestored = true;
        existing.status = 'succeeded';
        const previousRefunds = this.inMemoryRefunds
          .filter(refund => refund.orderId === input.order.id && refund.status === 'succeeded')
          .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
        const status: OrderStatus = previousRefunds >= Math.round(input.order.total * 100) ? 'refunded' : 'partially_refunded';
        await this.updateOrderStatus(input.order.id, status, { reason: input.reason, restockItems: [] });
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

    this.inMemoryRefunds.unshift(ref);

    if (input.applyStock && input.status === 'succeeded') {
      await this.restoreLocalRefundStock(input.order, input.items);
      ref.stockRestored = true;
      const totalRefunded = this.inMemoryRefunds
        .filter(refund => refund.orderId === input.order.id && ['succeeded', 'completed'].includes(refund.status))
        .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
      const status: OrderStatus = totalRefunded >= Math.round(input.order.total * 100) ? 'refunded' : 'partially_refunded';
      await this.updateOrderStatus(input.order.id, status, { reason: input.reason, restockItems: [] });
    }

    return ref;
  }

  public async processStripeRefund(
    orderId: string,
    returnId?: string,
    amount?: number,
    reason: string = 'Remboursement client',
    requestedIdempotencyKey?: string
  ): Promise<CustomerRefund> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement.`);

    const preliminaryKey = requestedIdempotencyKey?.trim()
      || `refund:${orderId}:${returnId || 'manual'}:${amount === undefined ? 'full' : amount}`;
    const existing = await this.findRefundByIdempotencyKey(preliminaryKey);
    if (existing) return existing;

    const previousRefunds = await this.getRefundsByOrder(orderId);
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

    const items = await this.getRefundItems(order, returnId, refundCents, remainingCents, previousRefunds);
    const idempotencyKey = requestedIdempotencyKey?.trim()
      || `refund:${orderId}:${returnId || 'manual'}:${refundCents}`;
    const secondExisting = await this.findRefundByIdempotencyKey(idempotencyKey);
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

    const refund = await this.finalizeRefund({
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

    if (refundStatus === 'succeeded' && order.userId) {
      await this.sendNotification(
        order.userId,
        'refund_created',
        'Remboursement effectué',
        `Un remboursement de ${(refundCents / 100).toFixed(2)} EUR a été émis pour votre commande #${orderId}.`,
        `/account?tab=refunds`,
        orderId
      );

      await emailService.sendEmail({
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Remboursement effectué pour votre commande #${orderId}`,
        template: 'refund_created',
        data: { orderId, amount: refundCents / 100, reason }
      });
    }

    return refund;
  }

  public async recordStripeRefundFromWebhook(
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
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement Stripe.`);

    const eventKey = `stripe-event:${details.eventId}`;
    const existingByEvent = await this.findRefundByIdempotencyKey(eventKey);
    if (existingByEvent && existingByEvent.status !== 'pending') return existingByEvent;
    if (details.stripeRefundId) {
      const existingByStripe = await this.findRefundByStripeId(details.stripeRefundId);
      if (existingByStripe && existingByStripe.status !== 'pending') return existingByStripe;
    }

    const previousRefunds = await this.getRefundsByOrder(orderId);
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
      ? await this.getRefundItems(order, undefined, refundCents, remainingCents, previousRefunds)
      : [];

    return this.finalizeRefund({
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
  }

  // ============================================================
  // KURLA ID BEAUTY PROFILES
  // ============================================================
  private mapBeautyProfileRow(row: any): BeautyProfileRecord {
    const profile = normalizeBeautyProfile(row.profile);
    const confidence: ProfileConfidence = calculateProfileConfidence(profile);
    return {
      userId: row.user_id,
      profile,
      confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async getBeautyProfile(userId: string): Promise<BeautyProfileRecord | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profiles').select('*').eq('user_id', userId).maybeSingle();
      ensureDatabaseSuccess('lecture du profil beauté KURLA ID', error);
      return data ? this.mapBeautyProfileRow(data) : undefined;
    }
    return this.inMemoryBeautyProfiles.get(userId);
  }

  public async saveBeautyProfile(userId: string, input: unknown, source = 'user'): Promise<BeautyProfileRecord> {
    const profile = normalizeBeautyProfile(input);
    const confidence = calculateProfileConfidence(profile);
    const now = new Date().toISOString();
    const existing = await this.getBeautyProfile(userId);
    const createdAt = existing?.createdAt || now;
    const record: BeautyProfileRecord = { userId, profile, confidence, createdAt, updatedAt: now };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.from('beauty_profiles').upsert({
        user_id: userId,
        profile,
        confidence: confidence.overall,
        photo_consent: profile.photoConsent,
        created_at: createdAt,
        updated_at: now
      }, { onConflict: 'user_id' });
      ensureDatabaseSuccess('enregistrement du profil beauté KURLA ID', error);

      const { error: historyError } = await supabase.from('beauty_profile_history').insert({
        user_id: userId,
        profile,
        confidence: confidence.overall,
        source,
        created_at: now
      });
      ensureDatabaseSuccess('historisation du profil beauté KURLA ID', historyError);
    }

    this.inMemoryBeautyProfiles.set(userId, record);
    const history = this.inMemoryBeautyProfileHistory.get(userId) || [];
    history.unshift({ id: randomUUID(), profile, confidence, source, createdAt: now });
    this.inMemoryBeautyProfileHistory.set(userId, history.slice(0, 50));
    return record;
  }

  public async getBeautyProfileHistory(userId: string): Promise<BeautyProfileHistoryEntry[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profile_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      ensureDatabaseSuccess('lecture de l’historique du profil beauté', error);
      return (data || []).map((row: any) => {
        const profile = normalizeBeautyProfile(row.profile);
        return {
          id: row.id,
          profile,
          confidence: calculateProfileConfidence(profile),
          source: row.source,
          createdAt: row.created_at
        };
      });
    }
    return [...(this.inMemoryBeautyProfileHistory.get(userId) || [])];
  }

  public async getBeautyProfilePhotos(userId: string): Promise<BeautyProfilePhoto[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profile_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des photos du profil beauté', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        consentAt: row.consent_at,
        createdAt: row.created_at
      }));
    }
    return [...(this.inMemoryBeautyProfilePhotos.get(userId) || [])];
  }

  public async uploadBeautyProfilePhoto(userId: string, buffer: Uint8Array, mimeType: BeautyProfilePhoto['mimeType'], consentAt: string): Promise<BeautyProfilePhoto> {
    const id = randomUUID();
    const storagePath = `${userId}/${id}`;
    const now = new Date().toISOString();
    const photo: BeautyProfilePhoto = {
      id,
      storagePath,
      mimeType,
      sizeBytes: buffer.byteLength,
      consentAt,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error: uploadError } = await supabase.storage.from('beauty-profile-photos').upload(storagePath, buffer as any, {
        contentType: mimeType,
        upsert: false
      });
      ensureDatabaseSuccess('stockage de la photo du profil beauté', uploadError);
      const { error } = await supabase.from('beauty_profile_photos').insert({
        id,
        user_id: userId,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: buffer.byteLength,
        consent_at: consentAt,
        created_at: now
      });
      ensureDatabaseSuccess('enregistrement de la photo du profil beauté', error);
    }

    const photos = this.inMemoryBeautyProfilePhotos.get(userId) || [];
    photos.unshift(photo);
    this.inMemoryBeautyProfilePhotos.set(userId, photos.slice(0, 10));
    return photo;
  }

  public async deleteBeautyProfilePhotos(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error: selectError } = await supabase.from('beauty_profile_photos').select('storage_path').eq('user_id', userId);
      ensureDatabaseSuccess('lecture des photos à supprimer', selectError);
      const paths = (data || []).map((row: any) => row.storage_path).filter(Boolean);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('beauty-profile-photos').remove(paths);
        ensureDatabaseSuccess('suppression des fichiers photo du profil', storageError);
      }
      const { error } = await supabase.from('beauty_profile_photos').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des métadonnées photo du profil', error);
    }
    this.inMemoryBeautyProfilePhotos.delete(userId);
  }

  public async deleteBeautyProfile(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await this.deleteBeautyProfilePhotos(userId);
      const { error: historyError } = await supabase.from('beauty_profile_history').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’historique du profil beauté', historyError);
      const { error } = await supabase.from('beauty_profiles').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression du profil beauté KURLA ID', error);
    }
    this.inMemoryBeautyProfiles.delete(userId);
    this.inMemoryBeautyProfileHistory.delete(userId);
    this.inMemoryBeautyProfilePhotos.delete(userId);
  }

  // ============================================================
  // PROFESSIONAL APPLICATIONS
  // ============================================================
  public async createProfessionalApplication(input: Omit<ProfessionalApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProfessionalApplication> {
    const now = new Date().toISOString();
    const application: ProfessionalApplication = {
      ...input,
      id: randomUUID(),
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('professional_applications').insert({
        id: application.id,
        user_id: application.userId || null,
        name: application.name,
        email: application.email,
        phone: application.phone,
        city: application.city,
        profession: application.profession,
        experience: application.experience,
        portfolio_url: application.portfolioUrl || null,
        accepts_charter: application.acceptsCharter,
        status: application.status,
        created_at: now,
        updated_at: now
      });
      ensureDatabaseSuccess('création de la candidature Pro', error);
    }

    this.inMemoryProfessionalApplications.unshift(application);
    return application;
  }

  public async getProfessionalApplications(): Promise<ProfessionalApplication[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('professional_applications').select('*').order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des candidatures Pro', error);
      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id || undefined,
        name: row.name,
        email: row.email,
        phone: row.phone,
        city: row.city,
        profession: row.profession,
        experience: row.experience,
        portfolioUrl: row.portfolio_url || undefined,
        acceptsCharter: row.accepts_charter === true,
        status: row.status,
        adminComment: row.admin_comment || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
    return [...this.inMemoryProfessionalApplications];
  }

  public async updateProfessionalApplication(id: string, status: ProfessionalApplicationStatus, adminComment?: string): Promise<ProfessionalApplication | undefined> {
    const current = (await this.getProfessionalApplications()).find(application => application.id === id);
    if (!current) return undefined;
    const updated: ProfessionalApplication = {
      ...current,
      status,
      adminComment: adminComment || undefined,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('professional_applications').update({
        status: updated.status,
        admin_comment: updated.adminComment || null,
        updated_at: updated.updatedAt
      }).eq('id', id).select('*').maybeSingle();
      ensureDatabaseSuccess('mise à jour de la candidature Pro', error);
      if (!data) return undefined;
    }

    const index = this.inMemoryProfessionalApplications.findIndex(application => application.id === id);
    if (index >= 0) this.inMemoryProfessionalApplications[index] = updated;
    else if (!supabase) this.inMemoryProfessionalApplications.unshift(updated);
    return updated;
  }

  // ============================================================
  // PHASE 5: CUSTOMER SUPPORT TICKETS
  // ============================================================
  public async createSupportTicket(userId: string, orderId: string | undefined, category: SupportTicket['subjectCategory'], subject: string, message: string): Promise<SupportTicket> {
    const ticketId = randomUUID();
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
      id: randomUUID(),
      ticketId,
      senderId: userId,
      senderRole: 'customer',
      message,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: ticketError } = await supabase.from('support_tickets').insert({
          id: ticketId,
          user_id: userId,
          order_id: orderId || null,
          subject_category: category,
          subject,
          status: 'open',
          created_at: now,
          updated_at: now
        });
        ensureDatabaseSuccess('création du ticket support', ticketError);

        const { error: messageError } = await supabase.from('support_messages').insert({
          id: firstMsg.id,
          ticket_id: ticketId,
          sender_id: userId,
          sender_role: 'customer',
          message,
          created_at: now
        });
        ensureDatabaseSuccess('création du premier message support', messageError);
      } catch (err) {
        console.error('[serverDb] createSupportTicket error:', err);
        throw err;
      }
    }

    this.inMemoryTickets.unshift(ticket);
    this.inMemoryMessages.push(firstMsg);
    return ticket;
  }

  private async getSupportTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle();
      ensureDatabaseSuccess('lecture du ticket support', error);
      if (!data) return undefined;
      return {
        id: data.id,
        userId: data.user_id,
        orderId: data.order_id,
        subjectCategory: data.subject_category,
        subject: data.subject,
        status: data.status,
        assignedAgentId: data.assigned_agent_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    return this.inMemoryTickets.find(t => t.id === ticketId);
  }

  public async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
        ensureDatabaseSuccess('lecture des tickets utilisateur', error);
        if (data) {
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
        throw err;
      }
    }

    return this.inMemoryTickets.filter(t => t.userId === userId);
  }

  public async getAllSupportTickets(): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
        ensureDatabaseSuccess('lecture de tous les tickets support', error);
        if (data) {
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
        throw err;
      }
    }

    return this.inMemoryTickets;
  }

  public async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        ensureDatabaseSuccess('lecture des messages support', error);
        if (data) {
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
        throw err;
      }
    }

    return this.inMemoryMessages.filter(m => m.ticketId === ticketId);
  }

  public async addSupportMessage(ticketId: string, senderId: string, senderRole: 'customer' | 'admin' | 'agent', message: string): Promise<SupportMessage> {
    const now = new Date().toISOString();
    const msg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId,
      senderRole,
      message,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    const ticket = this.inMemoryTickets.find(t => t.id === ticketId)
      || (supabase ? await this.getSupportTicketById(ticketId) : undefined);

    if (supabase) {
      try {
        const { error: messageError } = await supabase.from('support_messages').insert({
          id: msg.id,
          ticket_id: ticketId,
          sender_id: senderId,
          sender_role: senderRole,
          message,
          created_at: now
        });
        ensureDatabaseSuccess('création du message support', messageError);

        const { error: ticketError } = await supabase.from('support_tickets').update({
          status: senderRole === 'admin' || senderRole === 'agent' ? 'in_progress' : undefined,
          updated_at: now
        }).eq('id', ticketId);
        ensureDatabaseSuccess('mise à jour du ticket support', ticketError);
      } catch (err) {
        console.error('[serverDb] addSupportMessage error:', err);
        throw err;
      }
    }

    this.inMemoryMessages.push(msg);
    const memoryTicket = this.inMemoryTickets.find(t => t.id === ticketId);
    if (memoryTicket) {
      memoryTicket.updatedAt = now;
      if (senderRole === 'admin' || senderRole === 'agent') {
        memoryTicket.status = 'in_progress';
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
    const updatedAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').update({
          status,
          updated_at: updatedAt
        }).eq('id', ticketId).select('id').maybeSingle();
        ensureDatabaseSuccess('mise à jour du statut du ticket support', error);
        if (!data) throw new Error('Ticket support introuvable.');
      } catch (err) {
        console.error('[serverDb] updateSupportTicketStatus error:', err);
        throw err;
      }
    }

    const ticket = this.inMemoryTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = updatedAt;
    }
  }

  // ============================================================
  // PHASE 5: REAL ADMIN ANALYTICS METRICS
  // ============================================================
  public async getAdminAnalyticsMetrics(): Promise<any> {
    const products = await this.getProducts();
    const supabase = getSupabaseServerClient();
    let supaOrders: ServerOrder[] = [];
    let supaRefunds: CustomerRefund[] = [];
    let supaProfilesCount = 0;
    let supaTicketsCount = 0;
    let supaEventsCount = 0;

    if (supabase) {
      try {
        const { data: oData, error: ordersError } = await supabase.from('orders').select('*');
        ensureDatabaseSuccess('lecture des commandes pour les métriques', ordersError);
        supaOrders = (oData || []).map(data => ({
          id: data.id,
          userId: data.user_id,
          customerEmail: data.customer_email,
          items: data.items || [],
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }));

        const { data: refundData, error: refundsError } = await supabase.from('refunds').select('*');
        ensureDatabaseSuccess('lecture des remboursements pour les métriques', refundsError);
        supaRefunds = (refundData || []).map(mapRefundRow);

        const { count: pCount, error: profilesError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des profils pour les métriques', profilesError);
        supaProfilesCount = pCount || 0;

        const { count: tCount, error: ticketsError } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des tickets pour les métriques', ticketsError);
        supaTicketsCount = tCount || 0;

        const { count: eCount, error: eventsError } = await supabase.from('stripe_events').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des événements Stripe pour les métriques', eventsError);
        supaEventsCount = eCount || 0;
      } catch (err) {
        console.error('[serverDb] getAdminAnalyticsMetrics error:', err);
        throw err;
      }
    }

    // Never merge the local cache with Supabase: once persistence is
    // configured, the dashboard must describe the persistent source only.
    const sourceOrders: ServerOrder[] = supabase ? supaOrders : this.inMemoryOrders;
    const sourceRefunds: CustomerRefund[] = supabase ? supaRefunds : this.inMemoryRefunds;
    const revenueStatuses: OrderStatus[] = [
      'paid', 'processing', 'packed', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_refunded', 'refunded'
    ];
    const paidOrders = sourceOrders.filter(order => revenueStatuses.includes(order.status));
    const grossRevenueCents = paidOrders.reduce((sum, order) => sum + Math.round(Number(order.total || 0) * 100), 0);
    const refundedRevenueCents = sourceRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status) && (refund.currency || '').toUpperCase() === 'EUR')
      .reduce((sum, refund) => sum + Math.round(Number(refund.amount || 0) * 100), 0);
    const grossRevenue = grossRevenueCents / 100;
    const revenueTest = Math.max(0, grossRevenueCents - refundedRevenueCents) / 100;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = sourceOrders.filter(order => order.createdAt.startsWith(todayStr));

    const pendingOrders = sourceOrders.filter(order => order.status === 'payment_pending_webhook' || order.status === 'pending_payment');
    const processingOrders = sourceOrders.filter(order => order.status === 'processing' || order.status === 'packed');
    const shippedOrders = sourceOrders.filter(order => order.status === 'shipped' || order.status === 'delivered');
    const refundedOrders = sourceOrders.filter(order => order.status === 'refunded' || order.status === 'partially_refunded');

    const avgOrderValue = paidOrders.length > 0 ? revenueTest / paidOrders.length : 0;

    const lowStockProducts = products.filter(p => p.stockQuantity < 5 && p.stockQuantity > 0);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0 || !p.inStock);

    return {
      revenueTest,
      grossRevenue,
      netRevenue: revenueTest,
      totalOrders: sourceOrders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      paidOrdersCount: paidOrders.length,
      processingOrdersCount: processingOrders.length,
      shippedOrdersCount: shippedOrders.length,
      refundedOrdersCount: refundedOrders.length,
      avgOrderValue,
      lowStockProducts,
      outOfStockProducts,
      openTicketsCount: supabase
        ? supaTicketsCount
        : this.inMemoryTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      stripeEventsCount: supabase ? supaEventsCount : this.processedEventsSet.size,
      registeredUsersCount: supabase ? supaProfilesCount : 0
    };
  }

  public async claimEventForProcessing(eventId: string, eventType: string): Promise<boolean> {
    if (this.processedEventsSet.has(eventId)) return false;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('claim_stripe_event', {
        p_event_id: eventId,
        p_event_type: eventType
      });
      ensureDatabaseSuccess('réservation idempotente de l’événement Stripe', error);
      if (data === true) return true;
      this.processedEventsSet.add(eventId);
      return false;
    }

    this.processedEventsSet.add(eventId);
    return true;
  }

  public async markEventError(eventId: string, eventType: string, errorMessage: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.rpc('mark_stripe_event_error', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_error: errorMessage
      });
      ensureDatabaseSuccess('enregistrement de l’erreur Stripe', error);
    }
    this.processedEventsSet.delete(eventId);
  }

  public async isEventProcessed(eventId: string): Promise<boolean> {
    if (this.processedEventsSet.has(eventId)) return true;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('stripe_events').select('event_id').eq('event_id', eventId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’idempotence Stripe', error);
      if (data) {
        this.processedEventsSet.add(eventId);
        return true;
      }
    }
    return false;
  }

  public async markEventProcessed(eventId: string, eventType: string = 'stripe_webhook', details?: any): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('stripe_events').upsert({
        event_id: eventId,
        event_type: eventType,
        status: 'processed',
        details: details || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'event_id' });
      ensureDatabaseSuccess('enregistrement de l’événement Stripe', error);
    }
    this.processedEventsSet.add(eventId);
  }

  public getStatusSummary(): { supabaseConfigured: boolean; productCount: number; orderCount: number } {
    return {
      // This is the backend status: a public VITE key is not enough for the
      // privileged store or server-side token verification.
      supabaseConfigured: isSupabaseServerConfigured(),
      productCount: this.inMemoryProducts.length,
      orderCount: this.inMemoryOrders.length
    };
  }
}

export const serverDb = new SupabaseServerStore();
