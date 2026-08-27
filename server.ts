import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import Stripe from 'stripe';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from './src/lib/ai/systemPrompt';
import { AI_GUARDRAILS } from './src/lib/ai/guardrails';
import { formatKnowledgeContext, selectKnowledgeCards } from './src/lib/ai/knowledgeBase';
import { serverDb, ServerOrder } from './src/lib/serverDb';
import { getSupabaseAuthVerifier, getSupabaseServerClient, isSupabaseServerConfigured } from './src/lib/supabaseClient';
import { UserRole } from './src/types';
import { calculateShippingCents, normalizeShippingAddress, ShippingMethod } from './src/lib/shippingRules';
import { calculateKurlaFit } from './src/lib/kurlaFit';
import { createEmptyBeautyProfile, normalizeBeautyProfile, calculateProfileConfidence, BeautyProfilePhoto } from './src/lib/beautyProfile';
import { normalizeWeatherContext } from './src/lib/adaptiveRoutine';

// Initialize persistent product database via Supabase. The startup path awaits
// this promise so a schema/connection error cannot be hidden behind a healthy
// HTTP listener.
const serverInitialization = process.env.NODE_ENV === 'production' && !isSupabaseServerConfigured()
  ? Promise.resolve()
  : serverDb.initialize([]).then(() => {
      console.log('[ServerDB] Supabase store initialized successfully.');
    });

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Production baseline: do not disclose Express, accept unbounded request
// bodies, or allow an abusive client to consume all API workers.
app.disable('x-powered-by');
// Trust forwarded client IPs only when the deployment explicitly sits behind
// a known reverse proxy. This prevents spoofed X-Forwarded-For values from
// bypassing the limiter on a directly exposed process.
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function requestAddress(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function rateLimit(name: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${name}:${requestAddress(req)}`;
    const current = rateLimitBuckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    // Keep this process-local fallback bounded. A multi-instance deployment
    // should place a shared limiter at the edge as well.
    if (rateLimitBuckets.size > 10000) {
      for (const [bucketKey, value] of rateLimitBuckets) {
        if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
      }
    }

    if (bucket.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
    }
    next();
  };
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = typeof req.headers['x-request-id'] === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(req.headers['x-request-id'])
    ? req.headers['x-request-id']
    : randomUUID();
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.on('finish', () => {
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({
        event: 'http_server_error',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode
      }));
    }
  });
  next();
});

const corsOrigins = new Set(
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (!origin || corsOrigins.size === 0) return next();
  if (!corsOrigins.has(origin)) {
    if (req.method === 'OPTIONS') return res.status(403).json({ error: 'Origine non autorisée.' });
    return next();
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key, X-Anonymous-Id, X-Request-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use('/api', rateLimit('api', 300, 60_000));

type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

type AsyncRouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => unknown;

function asyncRoute(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as AuthenticatedRequest, res, next)).catch(next);
  };
}

const ADMIN_ROLES: UserRole[] = ['admin', 'superadmin'];

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/**
 * Resolve identity exclusively from a Supabase access token.
 * x-user-id/x-user-email are deliberately ignored: they are client supplied
 * and cannot be used for authorization.
 */
async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const token = bearerToken(req);
  const verifier = getSupabaseAuthVerifier();
  if (!token || !verifier) return null;

  try {
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data.user || !data.user.id) return null;

    let role: UserRole = 'customer';
    const serverSupabase = getSupabaseServerClient();
    if (serverSupabase) {
      const { data: profile, error: profileError } = await serverSupabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profileError && profile?.role && ADMIN_ROLES.includes(profile.role as UserRole)) {
        role = profile.role as UserRole;
      } else if (!profileError && profile?.role && ['professional', 'support', 'editor'].includes(profile.role)) {
        role = profile.role as UserRole;
      }
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      role,
    };
  } catch (error) {
    console.error('[Auth] Supabase token verification failed:', error);
    return null;
  }
}

async function requireUser(req: AuthenticatedRequest, res: Response): Promise<AuthenticatedUser | null> {
  const user = await authenticateRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentification Supabase requise.' });
    return null;
  }
  req.authUser = user;
  return user;
}

async function requireAdmin(req: AuthenticatedRequest, res: Response): Promise<AuthenticatedUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!ADMIN_ROLES.includes(user.role)) {
    res.status(403).json({ error: 'Accès administrateur requis.' });
    return null;
  }
  return user;
}

async function getOwnedOrder(orderId: string, user: AuthenticatedUser): Promise<ServerOrder | undefined> {
  const order = await serverDb.getOrderById(orderId);
  if (!order) return undefined;
  if (ADMIN_ROLES.includes(user.role)) return order;
  return order.userId === user.id ? order : undefined;
}

function safeApiError(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function effectiveVariantPrice(variant: any): number {
  const promotionPrice = Number(variant?.promotion_price ?? variant?.promotionPrice);
  const basePrice = Number(variant?.price);
  const startsAt = variant?.promotion_starts_at ?? variant?.promotionStartsAt;
  const endsAt = variant?.promotion_ends_at ?? variant?.promotionEndsAt;
  const now = new Date();
  const active = Number.isFinite(promotionPrice) && promotionPrice >= 0 && promotionPrice <= basePrice
    && (!startsAt || !Number.isNaN(new Date(startsAt).getTime()) && new Date(startsAt) <= now)
    && (!endsAt || !Number.isNaN(new Date(endsAt).getTime()) && new Date(endsAt) >= now);
  return active ? promotionPrice : basePrice;
}

// Lazy Stripe Initialization
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
    timeout: 15_000,
    maxNetworkRetries: 2
  });
}

// Stripe Webhook Endpoint (Raw Body Handling Before express.json)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '256kb' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const webhookEnabled = process.env.STRIPE_WEBHOOK_ENABLED === 'true';

  const stripe = getStripeClient();

  // 1. If webhook is explicitly disabled, respond 200 without error so test orders function cleanly
  if (!webhookEnabled) {
    console.log('[Stripe Webhook] Webhook désactivé (STRIPE_WEBHOOK_ENABLED=false). Statut des commandes conservé.');
    return res.status(200).json({
      received: true,
      status: 'webhook_disabled',
      message: 'Le webhook Stripe est désactivé (STRIPE_WEBHOOK_ENABLED=false).'
    });
  }

  // 2. If webhook is enabled but webhook secret is missing, return a clear explicit error
  if (!webhookSecret) {
    console.error('[Stripe Webhook Error] STRIPE_WEBHOOK_ENABLED=true mais la variable STRIPE_WEBHOOK_SECRET est manquante.');
    return res.status(400).json({
      error: 'Erreur de configuration Webhook : STRIPE_WEBHOOK_ENABLED=true exige de renseigner la clé STRIPE_WEBHOOK_SECRET.'
    });
  }

  // 3. If signature or Stripe SDK client is missing
  if (!sig || !stripe) {
    console.error('[Stripe Webhook Error] Signature Stripe ou client SDK manquant.');
    return res.status(400).json({
      error: 'En-tête stripe-signature ou configuration Stripe manquante.'
    });
  }

  let parsedEvent: Stripe.Event | undefined;
  try {
    parsedEvent = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    const event = parsedEvent;

    // Atomically claim the event before changing orders or stock. A read
    // followed by a later insert would allow two concurrent deliveries to
    // process the same payment twice.
    if (!(await serverDb.claimEventForProcessing(event.id, event.type))) {
      console.log(`[Stripe Webhook] Événement déjà traité ou en cours (Idempotent): ${event.id}`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    let processedOrderId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const order = await serverDb.findOrder({ stripeSessionId: session.id, orderId });
        if (order) {
          if (['refunded', 'partially_refunded'].includes(order.status)) {
            console.warn(`[Stripe Webhook] Confirmation reçue après remboursement pour la commande ${order.id}; statut conservé.`);
            break;
          }
          const expectedCents = Math.round(order.total * 100);
          if (session.amount_total !== expectedCents) {
            throw new Error(`Montant Checkout incohérent pour ${order.id}: attendu ${expectedCents}, reçu ${session.amount_total ?? 'null'}.`);
          }
          if (session.currency && session.currency.toLowerCase() !== 'eur') {
            throw new Error(`Devise Checkout incohérente pour ${order.id}: ${session.currency}.`);
          }
          if (session.payment_status !== 'paid') {
            throw new Error(`Checkout ${session.id} non payé (${session.payment_status || 'statut absent'}).`);
          }
          const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
          await serverDb.updateOrderStatus(order.id, 'paid', { stripePaymentIntentId: pi });
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Commande ${order.id} payée via checkout.session.completed.`);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const order = await serverDb.findOrder({ stripeSessionId: session.id, orderId });
        if (order) {
          if (['refunded', 'partially_refunded'].includes(order.status)) {
            console.warn(`[Stripe Webhook] Confirmation asynchrone reçue après remboursement pour la commande ${order.id}; statut conservé.`);
            break;
          }
          const expectedCents = Math.round(order.total * 100);
          if (session.amount_total !== expectedCents) {
            throw new Error(`Montant Checkout asynchrone incohérent pour ${order.id}.`);
          }
          if (session.currency && session.currency.toLowerCase() !== 'eur') {
            throw new Error(`Devise Checkout asynchrone incohérente pour ${order.id}.`);
          }
          if (session.payment_status !== 'paid') {
            throw new Error(`Checkout asynchrone ${session.id} non payé.`);
          }
          const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
          await serverDb.updateOrderStatus(order.id, 'paid', { stripePaymentIntentId: pi });
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Commande ${order.id} payée via checkout.session.async_payment_succeeded.`);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        const order = await serverDb.findOrder({ paymentIntentId: paymentIntent.id, orderId });
        if (order) {
          if (['refunded', 'partially_refunded'].includes(order.status)) {
            console.warn(`[Stripe Webhook] PaymentIntent confirmé après remboursement pour la commande ${order.id}; statut conservé.`);
            break;
          }
          const expectedCents = Math.round(order.total * 100);
          if (paymentIntent.amount !== expectedCents) {
            throw new Error(`Montant PaymentIntent incohérent pour ${order.id}: attendu ${expectedCents}, reçu ${paymentIntent.amount}.`);
          }
          if (paymentIntent.currency && paymentIntent.currency.toLowerCase() !== 'eur') {
            throw new Error(`Devise PaymentIntent incohérente pour ${order.id}: ${paymentIntent.currency}.`);
          }
          await serverDb.updateOrderStatus(order.id, 'paid', { stripePaymentIntentId: paymentIntent.id });
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Commande ${order.id} confirmée via payment_intent.succeeded.`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        const order = await serverDb.findOrder({ paymentIntentId: paymentIntent.id, orderId });
        if (order) {
          if (['paid', 'processing', 'packed', 'shipped', 'delivered', 'partially_refunded', 'refunded'].includes(order.status)) {
            console.warn(`[Stripe Webhook] Échec d’un ancien PaymentIntent pour ${order.id}; statut déjà finalisé conservé.`);
            break;
          }
          await serverDb.updateOrderStatus(order.id, 'payment_failed', { stripePaymentIntentId: paymentIntent.id });
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Commande ${order.id} marquée en échec via payment_intent.payment_failed.`);
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const order = await serverDb.findOrder({ stripeSessionId: session.id, orderId });
        if (order) {
          if (['paid', 'processing', 'packed', 'shipped', 'delivered', 'partially_refunded', 'refunded'].includes(order.status)) {
            console.warn(`[Stripe Webhook] Expiration ignorée pour la commande ${order.id}; un paiement a déjà été confirmé.`);
            break;
          }
          await serverDb.updateOrderStatus(order.id, 'payment_failed');
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Session ${session.id} expirée. Commande ${order.id} annulée.`);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
        const orderId = charge.metadata?.orderId;
        const order = await serverDb.findOrder({ paymentIntentId: piId, orderId });
        if (order) {
          const latestRefund = charge.refunds?.data?.[0];
          await serverDb.recordStripeRefundFromWebhook(order.id, {
            eventId: event.id,
            stripeRefundId: latestRefund?.id || `charge_refund:${charge.id}:${charge.amount_refunded}`,
            amount: Number(charge.amount_refunded || latestRefund?.amount || 0) / 100,
            currency: charge.currency,
            reason: latestRefund?.reason || 'Remboursement Stripe confirmé'
          });
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Remboursement Stripe enregistré pour la commande ${order.id}.`);
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Événement ignoré: ${event.type}`);
    }

    await serverDb.markEventProcessed(event.id, event.type, { processedOrderId });

    res.status(200).json({ received: true, processed: true });
  } catch (err: any) {
    const errorMessage = err?.message || 'Erreur inconnue';
    console.error('[Stripe Webhook Error]', errorMessage);
    if (parsedEvent) {
      try {
        await serverDb.markEventError(parsedEvent.id, parsedEvent.type, errorMessage);
      } catch (markError: any) {
        console.error('[Stripe Webhook Error] Impossible d’enregistrer l’échec de traitement:', markError?.message || markError);
      }
    }
    const publicMessage = process.env.NODE_ENV === 'production'
      ? 'Webhook Stripe refusé.'
      : errorMessage;
    res.status(400).send(`Webhook Error: ${publicMessage}`);
  }
});

// Keep the general API body limit strict while allowing authenticated catalog
// feeds to carry a bounded CSV/JSON document. The cart hardening limit remains
// 100kb and is still covered by the production checks.
app.use((req: Request, res: Response, next: NextFunction) => {
  const isCatalogFeed = req.path.startsWith('/api/admin/catalog/import/');
  return express.json({ limit: isCatalogFeed ? '2mb' : '100kb', strict: true })(req, res, next);
});

// Cart API Endpoints (public.carts & public.cart_items)
// Guest carts use an anonymous browser id; authenticated carts always use the
// verified Supabase user id and never a user id supplied in JSON/headers.
function getAnonymousId(req: Request): string | null {
  const candidate = req.body?.anonymousId || req.headers['x-anonymous-id'];
  if (typeof candidate !== 'string') return null;
  const value = candidate.trim();
  return /^[a-zA-Z0-9_-]{8,128}$/.test(value) ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

app.get('/api/cart', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const userId = user?.id || null;
    const anonymousId = user ? null : getAnonymousId(req);
    if (!userId && !anonymousId) return res.json({ items: [] });

    const items = await serverDb.getCart(userId, anonymousId);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: safeApiError(err, 'Erreur lors de la récupération du panier') });
  }
});

app.post('/api/cart', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authenticateRequest(req);
    const userId = user?.id || null;
    const anonymousId = user ? null : getAnonymousId(req);
    if (!userId && !anonymousId) {
      return res.status(400).json({ error: 'Identifiant de panier invité invalide.' });
    }

    if (!Array.isArray(req.body?.items)) {
      return res.status(400).json({ error: 'Le panier doit être un tableau d’articles.' });
    }
    const safeItems: { productId: string; variantId?: string; quantity: number }[] = [];
    for (const item of req.body.items) {
      if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
        return res.status(400).json({ error: 'Article de panier invalide.' });
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        return res.status(400).json({ error: 'Quantité de panier invalide.' });
      }
      if (item.variantId !== undefined && (typeof item.variantId !== 'string' || !isUuid(item.variantId))) {
        return res.status(400).json({ error: 'Identifiant de variante invalide.' });
      }
      safeItems.push({
        productId: item.productId.trim(),
        variantId: item.variantId,
        quantity: item.quantity
      });
    }

    const cartId = await serverDb.saveCart(userId, anonymousId, safeItems);
    res.json({ success: true, cartId });
  } catch (err: any) {
    res.status(500).json({ error: safeApiError(err, 'Erreur lors de la sauvegarde du panier') });
  }
});

function getAppUrl(req: Request): string {
  const envUrl = process.env.VITE_APP_URL;
  if (envUrl && envUrl.trim() !== '' && envUrl !== 'http://localhost:3000') {
    return envUrl.replace(/\/$/, '');
  }
  const origin = req.headers['origin'] || req.headers['referer'];
  if (origin && typeof origin === 'string') {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch (e) {}
  }
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

// Stripe Create Checkout Session Endpoint (Server Authoritative Pricing & Inventory Check)
app.post('/api/stripe/create-checkout-session', rateLimit('checkout', 20, 60_000), async (req: Request, res: Response) => {
  let persistedOrderId: string | undefined;
  let stripeSessionCreated = false;
  try {
    let items = req.body.items;
    if ((!items || !Array.isArray(items) || items.length === 0) && (req.body.product_id || req.body.productId)) {
      items = [{
        product_id: req.body.product_id || req.body.productId,
        product_variant_id: req.body.product_variant_id || req.body.variantId,
        quantity: req.body.quantity || 1
      }];
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Le panier est vide ou invalide.' });
    }

    console.log(`[Stripe Checkout] Demandée pour ${items.length} produit(s)`);

    const token = bearerToken(req);
    const authenticatedUser = await authenticateRequest(req);
    if (token && !authenticatedUser) {
      return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
    }

    // A guest may provide an email for Stripe receipts, but an authenticated
    // order always uses the email and id returned by Supabase Auth.
    const submittedEmail = typeof req.body.customerEmail === 'string' ? req.body.customerEmail.trim() : '';
    const email = authenticatedUser?.email || submittedEmail;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Une adresse email valide est requise pour le paiement.' });
    }
    const uid = authenticatedUser?.id;
    const rawIdempotencyKey = req.headers['idempotency-key'] || req.body.checkoutIdempotencyKey;
    const checkoutIdempotencyKey = typeof rawIdempotencyKey === 'string' ? rawIdempotencyKey.trim() : undefined;
    if (checkoutIdempotencyKey && (checkoutIdempotencyKey.length < 8 || checkoutIdempotencyKey.length > 255)) {
      return res.status(400).json({ error: 'Clé d’idempotence du checkout invalide.' });
    }

    const shippingMethod: ShippingMethod | null = req.body.shippingMethod === 'express' ? 'express' : req.body.shippingMethod === 'standard' ? 'standard' : null;
    if (!shippingMethod) {
      return res.status(400).json({ error: 'Mode de livraison invalide.' });
    }

    let normalizedShippingAddress;
    try {
      normalizedShippingAddress = normalizeShippingAddress(req.body.shippingAddress);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Adresse de livraison invalide.' });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      console.error('[Stripe Checkout Error] Stripe client non configuré (STRIPE_SECRET_KEY manquant)');
      return res.status(400).json({
        error: 'Paiement Stripe non configuré sur le serveur. La clé STRIPE_SECRET_KEY est manquante.'
      });
    }

    if (checkoutIdempotencyKey) {
      const existingOrder = await serverDb.findOrder({ checkoutIdempotencyKey });
      if (existingOrder) {
        if (!existingOrder.stripeSessionId) {
          return res.status(409).json({ error: 'Un checkout avec cette clé est déjà en cours de création.' });
        }
        const existingSession = await stripe.checkout.sessions.retrieve(existingOrder.stripeSessionId);
        return res.json({ sessionId: existingSession.id, url: existingSession.url });
      }
    }

    const appUrl = getAppUrl(req);
    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    // Verify product publication, variant pricing and stock against the
    // customer catalogue. Client-provided prices and availability are ignored.
    const customerCatalog = await serverDb.getProducts({ publishedOnly: true });
    const verifiedItems: any[] = [];
    let calculatedTotal = 0;
    const requestedByVariant = new Map<string, number>();

    for (const rawItem of items) {
      const pId = rawItem?.product_id || rawItem?.productId || rawItem?.product?.id || rawItem?.id;
      const variantId = rawItem?.variant_id || rawItem?.variantId || '';
      if (typeof pId !== 'string' || !pId.trim()) {
        return res.status(400).json({ error: 'Article invalide dans le panier.' });
      }

      const parsedQuantity = Number(rawItem?.quantity);
      if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 99) {
        return res.status(400).json({ error: 'Quantité invalide dans le panier.' });
      }
      const quantity = parsedQuantity;
      const requestedKey = `${pId}:${variantId}`;
      requestedByVariant.set(requestedKey, (requestedByVariant.get(requestedKey) || 0) + quantity);
      if ((requestedByVariant.get(requestedKey) || 0) > 99) {
        return res.status(400).json({ error: 'La quantité totale demandée pour un article est trop élevée.' });
      }

      const dbProduct = customerCatalog.find(product => product.id === pId || product.slug === pId);
      if (!dbProduct) {
        console.error(`[Stripe Checkout Error] Produit introuvable ou non publié ID: ${pId}`);
        return res.status(400).json({ error: 'Ce produit n’est pas disponible à la vente.' });
      }
      const deliveredCountries = Array.isArray(dbProduct.countryAvailability) ? dbProduct.countryAvailability : [];
      if (!deliveredCountries.includes(normalizedShippingAddress.country) && !deliveredCountries.includes('INT')) {
        return res.status(400).json({ error: 'Ce produit n’est pas livré dans le pays indiqué.' });
      }

      const variant = variantId
        ? (dbProduct.variants || []).find((candidate: any) => candidate.id === variantId && candidate.is_active !== false)
        : undefined;
      if (variantId && !variant) return res.status(400).json({ error: 'La variante demandée n’est pas disponible.' });
      if (!variant && dbProduct.inStock === false) return res.status(400).json({ error: `Le produit "${dbProduct.name}" est actuellement en rupture de stock.` });

      const availableStock = variant
        ? Math.max(0, Number(variant.available_quantity ?? (Number(variant.stock_quantity) - Number(variant.reserved_quantity || 0))))
        : await serverDb.getAvailableStock(dbProduct.id);
      const requestedQuantity = requestedByVariant.get(requestedKey) || quantity;
      if (requestedQuantity > availableStock) {
        console.error(`[Stripe Checkout Error] Stock insuffisant pour ${dbProduct.name} (${requestedQuantity}/${availableStock})`);
        return res.status(400).json({
          error: `Stock insuffisant pour "${dbProduct.name}". Quantité demandée : ${requestedQuantity}, Stock disponible : ${availableStock}.`
        });
      }

      // Ignore client price parameter — compute strictly using server DB price
      const dbPrice = variant ? effectiveVariantPrice(variant) : Number(dbProduct.price);
      const itemTotal = dbPrice * quantity;
      calculatedTotal += itemTotal;

      verifiedItems.push({
        productId: dbProduct.id,
        variantId: rawItem.variant_id || rawItem.variantId,
        quantity,
        price: dbPrice,
        name: dbProduct.name,
        image: dbProduct.image,
        slug: dbProduct.slug
      });
    }

    const subtotalCents = Math.round(calculatedTotal * 100);
    const shippingCents = calculateShippingCents(subtotalCents, normalizedShippingAddress.country, shippingMethod);
    const finalTotalCents = subtotalCents + shippingCents;
    const finalTotal = Number((finalTotalCents / 100).toFixed(2));
    console.log(`[Stripe Checkout] Sous-total: ${calculatedTotal.toFixed(2)} EUR, livraison: ${(shippingCents / 100).toFixed(2)} EUR, total: ${finalTotal.toFixed(2)} EUR`);

    // Save order with user_id, shipping details and status payment_pending_webhook.
    // The shipping cost is stored in the order snapshot so the customer and
    // operations team can reconstruct exactly what was paid.
    const newOrder: ServerOrder = {
      id: orderId,
      userId: uid,
      items: verifiedItems,
      total: finalTotal,
      status: 'payment_pending_webhook',
      customerEmail: email,
      checkoutIdempotencyKey,
      shippingAddress: {
        ...normalizedShippingAddress,
        shippingMethod,
        shippingCost: Number((shippingCents / 100).toFixed(2)),
        subtotal: Number(calculatedTotal.toFixed(2))
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const lineItems = verifiedItems.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));
    if (shippingCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `Livraison ${shippingMethod}`, images: [] },
          unit_amount: shippingCents
        },
        quantity: 1
      });
    }

    // Persist and reserve stock before creating an external Stripe session.
    // A failed Stripe call can then release the reservation through the order
    // state machine instead of leaving an untracked checkout.
    await serverDb.saveOrder(newOrder);
    persistedOrderId = orderId;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      metadata: { orderId, userId: uid || '' },
      payment_intent_data: {
        metadata: { orderId, userId: uid || '' }
      },
      success_url: `${appUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${appUrl}/boutique?canceled=true`,
    }, checkoutIdempotencyKey ? { idempotencyKey: checkoutIdempotencyKey } : undefined);
    stripeSessionCreated = true;

    console.log(`[Stripe Checkout] Session créée avec succès ID: ${session.id}, URL présente: ${!!session.url}`);

    newOrder.stripeSessionId = session.id;
    await serverDb.updateOrderStripeSession(orderId, session.id);

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout Error]', error?.message || error);
    if (persistedOrderId && !stripeSessionCreated) {
      try {
        await serverDb.updateOrderStatus(persistedOrderId, 'payment_failed', {
          changedByRole: 'system',
          reason: 'Échec de création de la session Stripe'
        });
      } catch (releaseError: any) {
        console.error('[Stripe Checkout Error] Impossible de libérer la réservation:', releaseError?.message || releaseError);
      }
    }
    res.status(500).json({ error: safeApiError(error, 'Erreur lors de la création de la session de paiement') });
  }
});

// Public, capability-based checkout confirmation. The Stripe Checkout Session
// id is unguessable and is used only to return the minimum information needed
// after a guest payment. This endpoint never trusts a client-provided amount
// or status and never exposes the customer's email or line items.
app.get('/api/stripe/checkout-session', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';
  const requestedOrderId = typeof req.query.order_id === 'string' ? req.query.order_id.trim() : '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Session de paiement invalide.' });
  }
  if (requestedOrderId && !/^ORD-[A-Z0-9-]+$/.test(requestedOrderId)) {
    return res.status(400).json({ error: 'Commande invalide.' });
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({ error: 'La vérification du paiement est momentanément indisponible.' });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const order = await serverDb.findOrder({ stripeSessionId: sessionId });
    if (!order || (requestedOrderId && order.id !== requestedOrderId)) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }
    if (checkoutSession.metadata?.orderId && checkoutSession.metadata.orderId !== order.id) {
      return res.status(409).json({ error: 'La session de paiement ne correspond pas à cette commande.' });
    }

    const expectedCents = Math.round(order.total * 100);
    if (checkoutSession.amount_total !== expectedCents || (checkoutSession.currency && checkoutSession.currency.toLowerCase() !== 'eur')) {
      return res.status(409).json({ error: 'Les informations de paiement ne correspondent pas à la commande.' });
    }

    return res.json({
      order: {
        id: order.id,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      },
      checkout: {
        paymentStatus: checkoutSession.payment_status || null,
        status: checkoutSession.status || null
      }
    });
  } catch (error: any) {
    console.error('[Stripe Checkout Confirmation Error]', error?.message || error);
    return res.status(502).json({ error: 'Impossible de vérifier la session de paiement pour le moment.' });
  }
}));

// Authenticated Orders API Endpoint
app.get('/api/orders', async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const orders = ADMIN_ROLES.includes(user.role)
    ? await serverDb.getOrdersByCustomer('', '')
    : await serverDb.getOrdersByCustomer(user.email, user.id);
  return res.json({ orders });
});

// Supabase Connection Status Endpoint
app.get('/api/supabase/status', (req: Request, res: Response) => {
  const status = serverDb.getStatusSummary();
  res.json({
    status: status.supabaseConfigured ? 'connected' : 'fallback_mode',
    details: status,
    timestamp: new Date().toISOString()
  });
});

// Stripe Status Diagnostic Endpoint
app.get('/api/stripe/status', (req: Request, res: Response) => {
  const appUrl = process.env.VITE_APP_URL;
  res.json({
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    webhookEnabled: process.env.STRIPE_WEBHOOK_ENABLED === 'true' && !!process.env.STRIPE_WEBHOOK_SECRET,
    appUrlConfigured: !!appUrl && appUrl !== 'http://localhost:3000' && appUrl.trim() !== ''
  });
});

// Initialize Gemini Client Lazily/Safely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const products = await serverDb.getProducts();
  res.json({
    status: 'ok',
    brand: 'KURLA Beauty',
    geminiEnabled: !!process.env.GEMINI_API_KEY,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    productsCount: products.length,
    supabaseStatus: serverDb.getStatusSummary(),
    time: new Date().toISOString(),
  });
}));

// Products API endpoint
app.get('/api/products', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const products = await serverDb.getPublicProducts();
  res.json({ products, count: products.length });
}));

// Customer-facing trust data is deliberately separated from the catalogue
// record. Only moderated, verified reviews and answered questions are public.
app.get('/api/products/:productId/trust', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const product = (await serverDb.getProducts({ publishedOnly: true })).find(item => item.id === req.params.productId || item.slug === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit non disponible.' });
  const [reviews, questions] = await Promise.all([
    serverDb.getProductReviews(product.id),
    serverDb.getProductQuestions(product.id)
  ]);
  res.json({ reviews, questions, verifiedReviewCount: reviews.length, questionsCount: questions.length });
}));

app.post('/api/products/:productId/questions', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const product = (await serverDb.getProducts({ publishedOnly: true })).find(item => item.id === req.params.productId || item.slug === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit non disponible.' });
  const question = await serverDb.createProductQuestion(user.id, product.id, String(req.body?.question || ''), user.email);
  res.status(201).json({ question, message: 'Question reçue. Elle sera publiée après réponse de notre équipe.' });
}));

app.post('/api/products/:productId/reviews', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const product = (await serverDb.getProducts({ publishedOnly: true })).find(item => item.id === req.params.productId || item.slug === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit non disponible.' });
  const review = await serverDb.createProductReview(user.id, product.id, Number(req.body?.rating), String(req.body?.comment || ''), typeof req.body?.title === 'string' ? req.body.title : undefined, typeof req.body?.variantId === 'string' ? req.body.variantId : undefined);
  res.status(201).json({ review, message: 'Avis reçu. Il sera visible après modération.' });
}));

app.post('/api/products/:productId/waitlist', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const token = bearerToken(req);
  const user = await authenticateRequest(req);
  if (token && !user) return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
  const product = (await serverDb.getProducts({ publishedOnly: true })).find(item => item.id === req.params.productId || item.slug === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit non disponible.' });
  const entry = await serverDb.joinProductWaitlist(product.id, String(req.body?.email || user?.email || ''), String(req.body?.country || 'FR'), typeof req.body?.variantId === 'string' ? req.body.variantId : undefined, user?.id);
  res.status(201).json({ waitlist: entry, message: 'Vous serez prévenu lorsque cette option sera à nouveau disponible dans votre pays.' });
}));

app.post('/api/products/:productId/subscriptions', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const product = (await serverDb.getProducts({ publishedOnly: true })).find(item => item.id === req.params.productId || item.slug === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit non disponible.' });
  const subscription = await serverDb.createProductSubscription(
    user.id,
    product.id,
    req.body?.frequency,
    Number(req.body?.quantity || 1),
    String(req.body?.country || 'FR'),
    typeof req.body?.variantId === 'string' ? req.body.variantId : undefined,
    typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod : undefined
  );
  res.status(201).json({ subscription, message: 'Demande de réassort enregistrée. Le paiement récurrent sera activé après confirmation.' });
}));

// Admin-only catalog governance endpoints. Evidence and decisions stay on
// the server; they are never returned as customer-facing product metadata.
app.get('/api/admin/catalog/:productId/validation', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const product = await serverDb.getProductById(req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit introuvable.' });
  res.json({ events: await serverDb.getCatalogValidationEvents(product.id) });
}));

app.post('/api/admin/catalog/validation', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const productId = typeof req.body?.productId === 'string' ? req.body.productId : '';
  if (!productId) return res.status(400).json({ error: 'Produit obligatoire.' });
  await serverDb.recordCatalogValidation(admin.id, productId, String(req.body?.checkType || ''), req.body?.status, typeof req.body?.evidenceUrl === 'string' ? req.body.evidenceUrl : undefined, typeof req.body?.note === 'string' ? req.body.note : undefined);
  res.status(201).json({ ok: true });
}));

app.patch('/api/admin/catalog/:productId/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  await serverDb.updateCatalogStatus(req.params.productId, req.body?.status);
  res.json({ ok: true });
}));

// ============================================================
// PRODUCT CATALOG MANAGEMENT
// ============================================================
// These endpoints expose governance fields only to verified admins. The
// browser never writes products directly to Supabase and cannot publish a
// record by sending a status flag: publication still requires every trust
// check to be recorded through the validation endpoint above.
app.get('/api/admin/catalog/products', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const products = await serverDb.getAdminCatalogProducts();
    res.json({ products, count: products.length });
  } catch (error) {
    console.error('[Catalog] admin list error:', error);
    res.status(500).json({ error: safeApiError(error, 'Impossible de charger le catalogue administrable.') });
  }
}));

app.get('/api/admin/catalog/taxonomy', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.json(await serverDb.getCatalogTaxonomy());
}));

app.get('/api/admin/catalog/imports', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.json({ imports: await serverDb.getCatalogImports() });
}));

app.post('/api/admin/catalog/products', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const result = await serverDb.importCatalogRecords(admin.id, [req.body || {}], 'manual');
    if (result.rejected > 0) return res.status(400).json({ error: result.errors[0]?.message || 'Produit catalogue invalide.', result });
    res.status(201).json({ product: result.products[0], import: result });
  } catch (error) {
    console.error('[Catalog] manual product error:', error);
    res.status(400).json({ error: safeApiError(error, 'Impossible d’enregistrer ce produit catalogue.') });
  }
}));

app.patch('/api/admin/catalog/products/:productId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const product = await serverDb.saveCatalogProduct(admin.id, { ...(req.body || {}), id: req.params.productId });
    res.json({ product });
  } catch (error) {
    console.error('[Catalog] product update error:', error);
    res.status(400).json({ error: safeApiError(error, 'Impossible de modifier ce produit catalogue.') });
  }
}));

app.post('/api/admin/catalog/import/csv', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const csv = req.body?.csv;
  if (typeof csv !== 'string' || !csv.trim() || csv.length > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'CSV vide ou supérieur à 2 Mo.' });
  }
  try {
    const result = await serverDb.importCatalogCsv(admin.id, csv, typeof req.body?.fileName === 'string' ? req.body.fileName.slice(0, 255) : undefined);
    res.status(result.rejected > 0 && result.imported === 0 ? 400 : 201).json({ import: result });
  } catch (error) {
    console.error('[Catalog] CSV import error:', error);
    res.status(400).json({ error: safeApiError(error, 'Impossible de lire ce fichier CSV.') });
  }
}));

app.post('/api/admin/catalog/import/supplier', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const supplier = typeof req.body?.supplier === 'string' ? req.body.supplier.trim().slice(0, 240) : '';
  if (!supplier || !Array.isArray(req.body?.records)) return res.status(400).json({ error: 'Fournisseur et tableau de produits obligatoires.' });
  try {
    const result = await serverDb.importCatalogRecords(admin.id, req.body.records, 'supplier', supplier);
    res.status(result.rejected > 0 && result.imported === 0 ? 400 : 201).json({ import: result });
  } catch (error) {
    console.error('[Catalog] supplier import error:', error);
    res.status(400).json({ error: safeApiError(error, 'Impossible d’importer le flux fournisseur.') });
  }
}));

app.get('/api/articles', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
  const articles = await serverDb.getPublishedArticles();
  res.json({ articles });
}));

app.get('/api/articles/:slug', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const article = await serverDb.getPublishedArticle(req.params.slug);
  if (!article) return res.status(404).json({ error: 'Article non disponible.' });
  res.json({ article });
}));

app.get('/api/routines', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
  const routines = await serverDb.getRoutines();
  res.json({ routines, count: routines.length });
}));

app.get('/api/routines/:slug', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const routine = await serverDb.getRoutineBySlug(req.params.slug);
  if (!routine) return res.status(404).json({ error: 'Routine non disponible.' });
  res.json({ routine });
}));

// Real Available Catalog helper for AI Assistant.
// The model receives only entries that are in stock and allowed in the user's
// country. It never receives a product name without its exact catalog slug.
type AvailableCatalogEntry = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  link: string;
  category: string;
  description: string;
  needs: string[];
  keyIngredients: string[];
  notIdealIf: string;
  product: any;
};

const SUPPORTED_AI_LOCALES = new Set(['fr', 'en', 'es', 'pt']);

async function getAvailableCatalog(country = 'FR'): Promise<AvailableCatalogEntry[]> {
  const normalizedCountry = country.trim().toUpperCase();
  const products = await serverDb.getProducts({ publishedOnly: true });
  return products
    .filter(product => product.inStock)
    .filter(product => !product.countryAvailability?.length || product.countryAvailability.includes(normalizedCountry) || product.countryAvailability.includes('INT'))
    .map(product => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.price,
      link: `/produit/${product.slug}`,
      category: product.category,
      description: product.description,
      needs: product.needs || [],
      keyIngredients: product.keyIngredients || [],
      notIdealIf: product.notIdealIf,
      product
    }));
}

async function selectOperationalKnowledgeCards(query: string, domains: string[] = []): Promise<any[]> {
  const staticCards = selectKnowledgeCards(query, domains);
  const terms = `${query} ${domains.join(' ')}`.toLocaleLowerCase('fr-FR');
  const persistedSources = await serverDb.getActiveAiKnowledgeSources();
  const persistedCards = persistedSources
    .filter(source => Array.isArray(source.domains) && source.domains.some((domain: string) => terms.includes(domain.toLocaleLowerCase('fr-FR'))))
    .map(source => ({
      id: source.id,
      title: source.title,
      domains: source.domains,
      content: source.content,
      sourceLabel: source.sourceLabel,
      status: 'validated',
      evidenceUrl: source.evidenceUrl
    }));
  return [...persistedCards, ...staticCards.filter(card => !persistedCards.some(source => source.id === card.id))].slice(0, 5);
}

function normalizeAiLocale(value: unknown): string {
  const locale = typeof value === 'string' ? value.trim().toLowerCase().split('-')[0] : 'fr';
  return SUPPORTED_AI_LOCALES.has(locale) ? locale : 'fr';
}

function normalizeAiCountry(value: unknown): string {
  const country = typeof value === 'string' ? value.trim().toUpperCase() : 'FR';
  return /^[A-Z]{2}$/.test(country) ? country : 'FR';
}

function queryNeeds(query: string, diagnosticType?: string): string[] {
  const value = `${diagnosticType || ''} ${query}`.toLowerCase();
  const needs: string[] = [];
  const add = (need: string, terms: string[]) => { if (terms.some(term => value.includes(term))) needs.push(need); };
  add('hydrater_cheveux', ['cheveu', 'boucle', 'frisé', 'frise', 'crépu', 'crepu', 'dry hair', 'hair']);
  add('reduire_casse', ['casse', 'breakage', 'fragile', 'fragility']);
  add('definir_boucles', ['boucle', 'definition', 'définition', 'curl']);
  add('cuir_chevelu', ['cuir chevelu', 'scalp', 'pellicule', 'démange', 'demange', 'itch']);
  add('entretenir_tresses', ['tresse', 'braid', 'twist']);
  add('entretenir_locks', ['lock', 'microlock']);
  add('entretenir_perruque', ['perruque', 'wig', 'lace']);
  add('protection_solaire', ['spf', 'solaire', 'soleil', 'sun', 'sunscreen']);
  add('taches_hyperpigmentation', ['tache', 'hyperpigment', 'marque', 'pigment', 'dark spot']);
  add('imperfections_acne', ['acné', 'acne', 'imperfection', 'pimple']);
  add('peau_sensible', ['sensible', 'sensibilité', 'sensitivity', 'irrit']);
  add('hydrater_peau', ['peau sèche', 'peau deshydrate', 'peau déshydrat', 'dry skin', 'hydration']);
  return Array.from(new Set(needs));
}

function catalogForPrompt(catalog: AvailableCatalogEntry[], fits: Map<string, any>) {
  return catalog.map(entry => ({
    slug: entry.slug,
    name: entry.name,
    brand: entry.brand,
    price: entry.price,
    category: entry.category,
    description: entry.description,
    needs: entry.needs,
    keyIngredients: entry.keyIngredients,
    notIdealIf: entry.notIdealIf,
    fitEvidence: fits.get(entry.slug)?.evidence || [],
    fitReasons: fits.get(entry.slug)?.reasons || []
  }));
}

function recommendationsForSlugs(slugs: unknown, catalog: AvailableCatalogEntry[], fits: Map<string, any>, locale = 'fr', modelDetails?: Map<string, any>) {
  const requested = Array.isArray(slugs) ? slugs : [];
  const uniqueSlugs = Array.from(new Set(requested.filter((slug): slug is string => typeof slug === 'string')));
  return uniqueSlugs
    .map(slug => catalog.find(entry => entry.slug === slug))
    .filter((entry): entry is AvailableCatalogEntry => !!entry)
    .slice(0, 5)
    .map(entry => {
      const fit = fits.get(entry.slug);
      const details = modelDetails?.get(entry.slug);
      const fitEvidence = (fit?.evidence || []).slice(0, 4).map((item: any) => `${item.label}: ${item.value}`);
      const modelEvidence = Array.isArray(details?.evidence) ? details.evidence.filter((value: unknown): value is string => typeof value === 'string').slice(0, 4) : [];
      const evidence = fitEvidence.length > 0 ? fitEvidence : modelEvidence;
      const modelReason = typeof details?.reason === 'string' && details.reason.trim() ? details.reason.trim().slice(0, 500) : undefined;
      const reason = fit?.reasons?.[0] || modelReason || (locale === 'en' ? 'Selected from the verified in-stock catalog for this request.' : 'Sélectionné dans le catalogue vérifié et disponible pour cette demande.');
      return {
        productSlug: entry.slug,
        name: entry.name,
        link: entry.link,
        reason,
        evidence
      };
    });
}

function budgetLimit(profile: any): number | undefined {
  const value = profile?.hair?.budget || profile?.skin?.budget;
  if (typeof value !== 'string' || value === 'inconnu') return undefined;
  const limits: Record<string, number> = { moins_40: 40, '40_70': 70, '70_100': 100, premium: Number.POSITIVE_INFINITY };
  return limits[value];
}

function fallbackAnswer(query: string, locale: string, cards: any[], catalog: AvailableCatalogEntry[], fits: Map<string, any>, needs: string[], profile: any): any {
  const isEnglish = locale === 'en';
  const isSpanish = locale === 'es';
  const isPortuguese = locale === 'pt';
  const maxPrice = budgetLimit(profile);
  const products = catalog
    .map(entry => ({ entry, fit: fits.get(entry.slug) }))
    .filter(({ entry, fit }) => {
      if (maxPrice !== undefined && entry.price > maxPrice) return false;
      if (profile && fit?.score !== null && fit?.score !== undefined) return fit.score > 0;
      return needs.length === 0 || entry.needs.some(need => needs.includes(need));
    })
    .sort((a, b) => (b.fit?.score || 0) - (a.fit?.score || 0))
    .slice(0, 3)
    .map(({ entry }) => entry.slug);
  const productRecommendations = recommendationsForSlugs(products, catalog, fits, locale);
  const sourceRefs = cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status }));

  if (isEnglish) return {
    shortAnswer: `For “${query}”, start with a gentle, consistent routine rather than adding many products at once.`,
    simpleExplanation: 'Your profile, environment and stated goal help set priorities. This is cosmetic guidance, not a diagnosis.',
    routineSteps: ['Clarify the priority and work in sections if needed.', 'Introduce one change at a time and observe tolerance.', 'Adjust frequency according to comfort, climate and results.'],
    immediateActions: ['Keep the next step simple and gentle.', 'Stop a product that causes a persistent reaction.', 'Ask a professional if symptoms are intense, sudden or persistent.'],
    usefulProducts: productRecommendations,
    avoidCombinations: ['Avoid layering several new or potentially irritating actives at once.'],
    usefulTools: [],
    errorsToAvoid: ['Do not use a product simply because it is marketed for a texture or skin tone.', 'Do not apply a cosmetic product to damaged skin.'],
    whenToConsultPro: 'Ask a dermatologist or doctor for pain, lesions, bleeding, pus, sudden hair loss or a persistent reaction.',
    uncertainty: profile ? 'Personalization is limited to the fields currently completed in your KURLA ID profile.' : 'No KURLA ID profile was shared, so this remains general cosmetic guidance.',
    sources: sourceRefs,
    ctas: [{ label: 'Browse the catalog', href: '/boutique', type: 'boutique' }, { label: 'Track my routine', href: '/account/routine-tracker', type: 'routine' }]
  };
  if (isSpanish || isPortuguese) return {
    shortAnswer: isSpanish ? `Para “${query}”, empieza con una rutina suave y constante, sin añadir muchos productos a la vez.` : `Para “${query}”, comece com uma rotina suave e consistente, sem adicionar muitos produtos de uma vez.`,
    simpleExplanation: isSpanish ? 'Tu perfil, tu entorno y tu objetivo ayudan a establecer prioridades. Esto es un consejo cosmético, no un diagnóstico.' : 'O seu perfil, ambiente e objetivo ajudam a definir prioridades. Isto é orientação cosmética, não um diagnóstico.',
    routineSteps: isSpanish ? ['Define la prioridad y trabaja por secciones si es necesario.', 'Introduce un cambio cada vez y observa la tolerancia.', 'Ajusta la frecuencia según tu comodidad, clima y resultados.'] : ['Defina a prioridade e trabalhe por secções se necessário.', 'Introduza uma mudança de cada vez e observe a tolerância.', 'Ajuste a frequência segundo o conforto, o clima e os resultados.'],
    immediateActions: isSpanish ? ['Mantén el siguiente paso simple y suave.', 'Suspende un producto que provoque una reacción persistente.', 'Consulta a un profesional si los síntomas son intensos o persistentes.'] : ['Mantenha o próximo passo simples e suave.', 'Pare um produto que cause uma reação persistente.', 'Procure um profissional se os sintomas forem intensos ou persistentes.'],
    usefulProducts: productRecommendations,
    avoidCombinations: [isSpanish ? 'Evita combinar varios activos nuevos o irritantes a la vez.' : 'Evite combinar vários ativos novos ou potencialmente irritantes de uma vez.'],
    usefulTools: [],
    errorsToAvoid: [isSpanish ? 'No uses un producto solo porque se anuncia para una textura o tono.' : 'Não use um produto apenas porque é anunciado para uma textura ou tom de pele.', isSpanish ? 'No apliques cosméticos sobre piel lesionada.' : 'Não aplique cosméticos sobre pele lesionada.'],
    whenToConsultPro: isSpanish ? 'Consulta a un dermatólogo o médico ante dolor, lesiones, sangrado, pus, caída súbita o reacción persistente.' : 'Procure um dermatologista ou médico em caso de dor, lesões, sangramento, pus, queda súbita ou reação persistente.',
    uncertainty: profile ? (isSpanish ? 'La personalización se limita a los campos completados de tu perfil KURLA ID.' : 'A personalização limita-se aos campos preenchidos do seu perfil KURLA ID.') : (isSpanish ? 'No se compartió un perfil KURLA ID: la orientación es general.' : 'Nenhum perfil KURLA ID foi partilhado: a orientação é geral.'),
    sources: sourceRefs,
    ctas: [{ label: isSpanish ? 'Ver el catálogo' : 'Ver o catálogo', href: '/boutique', type: 'boutique' }, { label: isSpanish ? 'Seguir mi rutina' : 'Acompanhar a minha rotina', href: '/account/routine-tracker', type: 'routine' }]
  };
  return {
    shortAnswer: `Pour « ${query} », commence par une routine douce et régulière, sans multiplier les produits.`,
    simpleExplanation: 'Le profil, l’environnement et l’objectif servent à définir les priorités. Il s’agit d’un conseil cosmétique, pas d’un diagnostic.',
    routineSteps: ['Clarifier la priorité et travailler par sections si besoin.', 'Introduire un seul changement à la fois et observer la tolérance.', 'Adapter la fréquence au confort, au climat et aux résultats observés.'],
    immediateActions: ['Garder la prochaine étape simple et douce.', 'Arrêter un produit qui provoque une réaction persistante.', 'Demander un avis professionnel si les signes sont intenses, soudains ou persistants.'],
    usefulProducts: productRecommendations,
    avoidCombinations: ['Éviter d’empiler plusieurs actifs nouveaux ou potentiellement irritants en même temps.'],
    usefulTools: [],
    errorsToAvoid: ['Ne pas choisir un produit uniquement parce qu’il est présenté pour une texture ou une carnation.', 'Ne pas appliquer de cosmétique sur une peau lésée.'],
    whenToConsultPro: 'Demander un avis médical en cas de douleur, lésion, saignement, pus, chute soudaine ou réaction persistante.',
    uncertainty: profile ? 'La personnalisation reste limitée aux champs actuellement renseignés dans votre profil KURLA ID.' : 'Aucun profil KURLA ID n’a été partagé : il s’agit donc de conseils cosmétiques généraux.',
    sources: sourceRefs,
    ctas: [{ label: 'Explorer le catalogue', href: '/boutique', type: 'boutique' }, { label: 'Suivre ma routine', href: '/account/routine-tracker', type: 'routine' }]
  };
}

function sanitizeStructuredAnswer(raw: any, query: string, locale: string, cards: any[], catalog: AvailableCatalogEntry[], fits: Map<string, any>, needs: string[], profile: any): any {
  const fallback = fallbackAnswer(query, locale, cards, catalog, fits, needs, profile);
  if (!raw || typeof raw !== 'object') return fallback;
  const modelDetails = new Map<string, any>((Array.isArray(raw.usefulProducts) ? raw.usefulProducts : []).filter((product: any) => typeof product?.productSlug === 'string').map((product: any) => [product.productSlug, product]));
  const productRecommendations = recommendationsForSlugs(raw.usefulProducts?.map((p: any) => p?.productSlug), catalog, fits, locale, modelDetails);
  const answer = {
    ...fallback,
    shortAnswer: typeof raw.shortAnswer === 'string' ? raw.shortAnswer.slice(0, 1000) : fallback.shortAnswer,
    simpleExplanation: typeof raw.simpleExplanation === 'string' ? raw.simpleExplanation.slice(0, 2000) : fallback.simpleExplanation,
    whenToConsultPro: typeof raw.whenToConsultPro === 'string' ? raw.whenToConsultPro.slice(0, 1200) : fallback.whenToConsultPro,
    uncertainty: typeof raw.uncertainty === 'string' ? raw.uncertainty.slice(0, 1200) : fallback.uncertainty,
    routineSteps: Array.isArray(raw.routineSteps) && raw.routineSteps.length > 0 ? raw.routineSteps.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.routineSteps,
    immediateActions: Array.isArray(raw.immediateActions) && raw.immediateActions.length > 0 ? raw.immediateActions.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.immediateActions,
    usefulProducts: productRecommendations,
    avoidCombinations: Array.isArray(raw.avoidCombinations) ? raw.avoidCombinations.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.avoidCombinations,
    usefulTools: Array.isArray(raw.usefulTools) ? raw.usefulTools.filter((v: any) => typeof v?.name === 'string' && typeof v?.description === 'string').slice(0, 6) : fallback.usefulTools,
    errorsToAvoid: Array.isArray(raw.errorsToAvoid) ? raw.errorsToAvoid.filter((v: unknown): v is string => typeof v === 'string').slice(0, 8) : fallback.errorsToAvoid,
    sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })),
    ctas: [{ label: locale === 'en' ? 'Browse the catalog' : 'Explorer le catalogue', href: '/boutique', type: 'boutique' as const }, { label: locale === 'en' ? 'Track my routine' : 'Suivre ma routine', href: '/account/routine-tracker', type: 'routine' as const }]
  };
  return answer;
}

function medicalTriage(query: string): { emergency: boolean; review: boolean; message: string } {
  const value = query.toLowerCase();
  const emergencyTerms = ['difficulté à respirer', 'difficulte a respirer', 'difficulty breathing', 'gonflement de la gorge', 'swelling of the throat', 'gonflement langue', 'swollen tongue', 'brûlure chimique grave', 'brulure chimique grave', 'chemical burn', 'saignement abondant', 'heavy bleeding'];
  const reviewTerms = [...AI_GUARDRAILS.medicalFlagsKeywords, 'infection', 'fièvre', 'fever', 'douleur intense', 'severe pain', 'chute massive', 'massive hair loss', 'diagnostic', 'prescription'];
  const emergency = emergencyTerms.some(term => value.includes(term));
  const review = emergency || reviewTerms.some(term => value.includes(term));
  const message = emergency
    ? 'Des signes potentiellement urgents sont mentionnés. Appelez immédiatement le 15 ou le 112 en France, ou le numéro d’urgence local, et ne mettez pas de nouveau cosmétique sur la zone concernée.'
    : 'Votre description mérite un avis professionnel. KURLA ne pose pas de diagnostic et ne remplace pas un médecin, un dermatologue ou un pharmacien.';
  return { emergency, review, message };
}

const AI_DISCLAIMER = "Les réponses KURLA sont des informations et conseils cosmétiques. Elles ne constituent ni un diagnostic, ni une prescription, ni un avis médical.";

async function persistAiExchange(user: AuthenticatedUser | null, session: any, query: string, responseText: string, metadata: Record<string, unknown>, sourceIds: string[], uncertainty?: string) {
  if (!user || !session) return { sessionId: undefined, messageId: undefined, memorySaved: false };
  const userMessage = await serverDb.addAiMessage(session.id, 'user', query, { kind: 'user_query' }, []);
  const assistantMessage = await serverDb.addAiMessage(session.id, 'assistant', responseText, metadata, sourceIds, uncertainty);
  return { sessionId: session.id, messageId: assistantMessage.id, memorySaved: true, userMessageId: userMessage.id };
}

// AI Endpoint: General Beauty Assistant Query
app.post('/api/ai/assistant', rateLimit('ai-assistant', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!query || query.length > 2000) return res.status(400).json({ error: 'La question est obligatoire et doit rester sous 2 000 caractères.' });

  const token = bearerToken(req);
  const user = await authenticateRequest(req);
  if (token && !user) return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
  void serverDb.recordAiUsage('assistant', true, user?.id).catch(error => console.error('[AI] usage event error:', error));

  const locale = normalizeAiLocale(req.body?.locale);
  const country = normalizeAiCountry(req.body?.country);
  const memoryConsent = req.body?.memoryConsent === true;
  const requestedSessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
  if ((memoryConsent || requestedSessionId) && !user) return res.status(401).json({ error: 'Connectez-vous pour utiliser la mémoire de l’assistant.' });
  if (requestedSessionId && !memoryConsent) return res.status(400).json({ error: 'Le consentement mémoire doit rester actif pour reprendre une session.' });

  const objective = typeof req.body?.objective === 'string' ? req.body.objective.trim().slice(0, 160) : undefined;
  const profileRecord = user ? await serverDb.getBeautyProfile(user.id) : undefined;
  const profile = profileRecord?.profile;
  const needs = queryNeeds(`${objective || ''} ${query}`);
  const cards = await selectOperationalKnowledgeCards(query, needs);
  const fullCatalog = await getAvailableCatalog(country);
  const maxPrice = budgetLimit(profile);
  const catalog = maxPrice === undefined ? fullCatalog : fullCatalog.filter(entry => entry.price <= maxPrice);
  const fits = new Map<string, any>();
  for (const entry of catalog) {
    if (profile) fits.set(entry.slug, calculateKurlaFit(entry.product, profile));
  }
  const recommendationCatalog = needs.length > 0
    ? catalog.filter(entry => entry.needs.some(need => needs.includes(need)) || (fits.get(entry.slug)?.score || 0) > 0)
    : catalog;

  let session;
  if (memoryConsent && user) {
    if (requestedSessionId) {
      const existing = await serverDb.getAiSession(user.id, requestedSessionId);
      if (!existing) return res.status(404).json({ error: 'Session IA introuvable ou non autorisée.' });
      session = existing.session;
    } else {
      session = await serverDb.createAiSession(user.id, objective || 'assistant-beauté', locale, country, true, objective);
    }
  }

  const triage = medicalTriage(query);
  if (triage.review) {
    const persistence = await persistAiExchange(user, session, query, triage.message, { kind: 'medical_triage', emergency: triage.emergency }, cards.map(card => card.id), 'Avis professionnel recommandé ; aucun diagnostic n’est établi.');
    if (triage.emergency) {
      return res.json({ isMedicalRedirect: true, medicalMessage: triage.message, requiresHumanReview: true, disclaimer: AI_DISCLAIMER, ...persistence });
    }
    return res.json({ isMedicalRedirect: true, medicalMessage: triage.message, requiresHumanReview: true, disclaimer: AI_DISCLAIMER, ...persistence });
  }

  const aiClient = getGeminiClient();
  let answer: any;
  let modelUsed = false;
  if (aiClient) {
    try {
      const catalogContext = catalogForPrompt(recommendationCatalog, fits);
      const systemInstruction = `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\n\nLANGUE DE SORTIE : ${locale}. Réponds dans cette langue avec des phrases simples.\nPAYS : ${country}. OBJECTIF : ${objective || 'à préciser'}. BUDGET MAXIMUM INDICATIF : ${budgetLimit(profile) === undefined ? 'non renseigné' : `${budgetLimit(profile)} EUR par article`}.\n\nPROFIL KURLA ID (données déclarées, possiblement incomplètes) :\n${JSON.stringify(profile || { unavailable: true })}\n\nBASE DE CONNAISSANCES KURLA SÉLECTIONNÉE :\n${formatKnowledgeContext(cards)}\n\nCATALOGUE VÉRIFIÉ :\n${JSON.stringify(catalogContext)}\n\nContraintes absolues : n’utilise aucune connaissance comme preuve clinique si son statut n’est pas validé ; ne pose aucun diagnostic ; usefulProducts doit contenir uniquement des objets dont productSlug est un slug EXACT du catalogue ; n’invente ni produit, ni lien, ni disponibilité. Explique chaque recommandation avec evidence reliée au profil ou indique que la personnalisation est limitée. N’utilise pas de score dans la réponse.`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: JSON.stringify({ query, objective, locale, country }),
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shortAnswer: { type: Type.STRING },
              simpleExplanation: { type: Type.STRING },
              routineSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              usefulProducts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { productSlug: { type: Type.STRING }, reason: { type: Type.STRING }, evidence: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['productSlug', 'reason', 'evidence'] } },
              avoidCombinations: { type: Type.ARRAY, items: { type: Type.STRING } },
              usefulTools: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'description'] } },
              errorsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
              whenToConsultPro: { type: Type.STRING },
              uncertainty: { type: Type.STRING }
            },
            required: ['shortAnswer', 'simpleExplanation', 'routineSteps', 'immediateActions', 'usefulProducts', 'avoidCombinations', 'usefulTools', 'errorsToAvoid', 'whenToConsultPro', 'uncertainty']
          }
        }
      });
      answer = sanitizeStructuredAnswer(JSON.parse(response.text || '{}'), query, locale, cards, recommendationCatalog, fits, needs, profile);
      modelUsed = true;
    } catch (error) {
      console.error('[AI Assistant] constrained model failed, using deterministic safe answer:', error);
    }
  }
  if (!answer) answer = fallbackAnswer(query, locale, cards, recommendationCatalog, fits, needs, profile);

  const persistence = await persistAiExchange(user, session, query, JSON.stringify(answer), { kind: 'structured_answer', modelUsed, profileConfidence: profileRecord?.confidence || null, country, locale, objective }, cards.map(card => card.id), answer.uncertainty);
  res.json({ isMedicalRedirect: false, requiresHumanReview: false, answer, disclaimer: AI_DISCLAIMER, profileAvailable: !!profile, profileConfidence: profileRecord?.confidence, ...persistence });
}));

// Consent-aware AI history and feedback APIs.
app.get('/api/ai/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  res.json({ sessions: await serverDb.getAiSessions(user.id) });
}));

app.get('/api/ai/history/:sessionId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : '';
  const session = await serverDb.getAiSession(user.id, sessionId);
  if (!session) return res.status(404).json({ error: 'Session IA introuvable ou non autorisée.' });
  res.json(session);
}));

app.delete('/api/ai/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await serverDb.deleteAiSessions(user.id);
  res.json({ success: true });
}));

app.post('/api/ai/feedback', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const rating = req.body?.rating;
  if (!['helpful', 'incorrect', 'unsafe'].includes(rating)) return res.status(400).json({ error: 'Feedback IA invalide.' });
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
  const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : undefined;
  if (messageId && !sessionId) return res.status(400).json({ error: 'La session est requise pour référencer un message IA.' });
  if (sessionId) {
    const ownedSession = await serverDb.getAiSession(user.id, sessionId);
    if (!ownedSession || (messageId && !ownedSession.messages.some(message => message.id === messageId))) return res.status(404).json({ error: 'Référence de session ou de message IA non autorisée.' });
  }
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim().slice(0, 1000) : undefined;
  await serverDb.recordAiFeedback(user.id, rating, comment, sessionId, messageId);
  res.status(201).json({ success: true });
}));

app.post('/api/ai/human-review', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
  if (!reason) return res.status(400).json({ error: 'La raison de la revue est obligatoire.' });
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
  const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : undefined;
  if (messageId && !sessionId) return res.status(400).json({ error: 'La session est requise pour référencer un message IA.' });
  if (sessionId) {
    const ownedSession = await serverDb.getAiSession(user.id, sessionId);
    if (!ownedSession || (messageId && !ownedSession.messages.some(message => message.id === messageId))) return res.status(404).json({ error: 'Référence de session ou de message IA non autorisée.' });
  }
  const payload = typeof req.body?.payload === 'object' && req.body.payload ? req.body.payload : {};
  const review = await serverDb.requestAiHumanReview(user.id, reason, payload, sessionId, messageId);
  res.status(201).json({ review });
}));

// AI Endpoint: Generate a routine from the public diagnostic. Products are
// still selected only from the country-filtered, in-stock catalog.
app.post('/api/ai/routine-result', rateLimit('ai-routine', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const diagnosticType = req.body?.diagnosticType === 'skin' ? 'skin' : req.body?.diagnosticType === 'hair' ? 'hair' : null;
  if (!diagnosticType || !req.body?.answers || typeof req.body.answers !== 'object') return res.status(400).json({ error: 'Diagnostic invalide.' });
  const answers = req.body.answers;
  const { email: _diagnosticEmail, ...answersForAi } = answers as Record<string, unknown>;
  const answerText = JSON.stringify(answersForAi);
  const triage = medicalTriage(answerText);
  const locale = normalizeAiLocale(req.body?.locale);
  const country = normalizeAiCountry(req.body?.country);
  const fullCatalog = await getAvailableCatalog(country);
  const diagnosticPriorityMap: Record<string, string[]> = diagnosticType === 'hair'
    ? {
      hydratation: ['hydrater_cheveux'],
      casse: ['reduire_casse'],
      definition: ['definir_boucles'],
      cuir_chevelu: ['cuir_chevelu'],
      entretien_protective: ['entretenir_tresses', 'entretenir_locks'],
      demelage_enfant: ['demeler_cheveux']
    }
    : {
      taches: ['taches_hyperpigmentation'],
      teint_irregulier: ['taches_hyperpigmentation'],
      hydratation: ['hydrater_peau'],
      spf: ['protection_solaire'],
      acne_legere: ['imperfections_acne'],
      sensibilite: ['peau_sensible']
    };
  const needs = Array.from(new Set([...queryNeeds(`${diagnosticType} ${answerText}`, diagnosticType), ...(diagnosticPriorityMap[String(answers.priority)] || [])]));
  const cards = await selectOperationalKnowledgeCards(answerText, [diagnosticType, ...needs]);
  const authenticatedUser = await authenticateRequest(req);
  if (bearerToken(req) && !authenticatedUser) return res.status(401).json({ error: 'Jeton Supabase invalide ou expiré.' });
  void serverDb.recordAiUsage('routine_result', true, authenticatedUser?.id).catch(error => console.error('[AI] usage event error:', error));
  const profileRecord = authenticatedUser ? await serverDb.getBeautyProfile(authenticatedUser.id) : undefined;
  const profile = profileRecord?.profile;
  const diagnosticBudget = typeof answers.budget === 'string' ? ({ moins_40: 40, '40_70': 70, '70_100': 100, premium: Number.POSITIVE_INFINITY } as Record<string, number>)[answers.budget] : undefined;
  const catalog = diagnosticBudget === undefined ? fullCatalog : fullCatalog.filter(entry => entry.price <= diagnosticBudget);
  const fits = new Map<string, any>();
  catalog.forEach(entry => { if (profile) fits.set(entry.slug, calculateKurlaFit(entry.product, profile)); });
  const candidateSlugs = catalog.filter(entry => entry.needs.some(need => needs.includes(need))).slice(0, 5).map(entry => entry.slug);

  if (triage.review) {
    return res.json({ summary: triage.message, recommendedRoutine: 'Avis professionnel recommandé', reason: triage.message, steps: ['Suspendre les produits nouveaux ou irritants.', 'Ne pas appliquer de cosmétique sur une zone lésée.', 'Demander un avis médical ou dermatologique.'], warnings: [AI_DISCLAIMER], productHandles: [], requiresHumanReview: true, sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })) });
  }

  let parsed: any;
  const aiClient = getGeminiClient();
  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: JSON.stringify({ diagnosticType, answers: answersForAi, locale, country }),
        config: {
          systemInstruction: `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}\nRéponds en ${locale}. Tu reçois uniquement ce catalogue vérifié et disponible : ${JSON.stringify(catalog.map(entry => ({ slug: entry.slug, name: entry.name, needs: entry.needs, category: entry.category })))}\nNe crée aucun slug. productHandles doit être une sous-liste exacte des slugs reçus, ou []. Ne présente jamais un conseil cosmétique comme médical.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: { summary: { type: Type.STRING }, recommendedRoutine: { type: Type.STRING }, reason: { type: Type.STRING }, steps: { type: Type.ARRAY, items: { type: Type.STRING } }, warnings: { type: Type.ARRAY, items: { type: Type.STRING } }, productHandles: { type: Type.ARRAY, items: { type: Type.STRING } }, requiresHumanReview: { type: Type.BOOLEAN } },
            required: ['summary', 'recommendedRoutine', 'reason', 'steps', 'warnings', 'productHandles', 'requiresHumanReview']
          }
        }
      });
      parsed = JSON.parse(response.text || '{}');
    } catch (error) {
      console.error('[AI Routine] constrained model failed, using deterministic catalog routine:', error);
    }
  }

  const validSlugs = new Set(catalog.map(entry => entry.slug));
  const relevantSlugs = new Set(candidateSlugs);
  const requestedHandles = Array.isArray(parsed?.productHandles) ? parsed.productHandles : candidateSlugs;
  const filteredRequestedHandles = requestedHandles.filter((slug: unknown): slug is string => typeof slug === 'string' && validSlugs.has(slug) && relevantSlugs.has(slug));
  const productHandles = Array.from(new Set(filteredRequestedHandles.length > 0 ? filteredRequestedHandles : candidateSlugs));
  const isHair = diagnosticType === 'hair';
  const safeResult = {
    summary: typeof parsed?.summary === 'string' ? parsed.summary : (isHair ? 'Routine capillaire structurée à ajuster progressivement.' : 'Routine de soin de la peau structurée à ajuster progressivement.'),
    recommendedRoutine: typeof parsed?.recommendedRoutine === 'string' ? parsed.recommendedRoutine : (isHair ? 'Routine capillaire KURLA' : 'Routine peau KURLA'),
    reason: typeof parsed?.reason === 'string' ? parsed.reason : 'Les étapes sont proposées à partir des réponses et des produits disponibles, sans diagnostic médical.',
    steps: Array.isArray(parsed?.steps) ? parsed.steps.filter((step: unknown): step is string => typeof step === 'string').slice(0, 8) : ['Commencer doucement et introduire un changement à la fois.', 'Observer la tolérance et ajuster la fréquence.', 'Demander un avis professionnel en cas de symptôme persistant.'],
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.filter((warning: unknown): warning is string => typeof warning === 'string').slice(0, 8) : [AI_DISCLAIMER],
    productHandles,
    requiresHumanReview: parsed?.requiresHumanReview === true,
    sources: cards.map(card => ({ id: card.id, label: card.sourceLabel, status: card.status })),
    uncertainty: profile ? 'La routine tient compte des champs complétés du profil KURLA ID.' : 'La routine est basée uniquement sur les réponses du diagnostic ; le profil KURLA ID n’a pas été partagé.'
  };
  res.json(safeResult);
}));


// ============================================================
// PHASE 5 REST API ENDPOINTS
// ============================================================

// Phase 5 private APIs: every identity comes from a verified Supabase token.
// Never use x-user-id, x-user-email or x-admin-key here: all three are client
// controlled and therefore unsuitable for authorization.
async function getOwnedTicket(ticketId: string, user: AuthenticatedUser): Promise<any | undefined> {
  const tickets = ADMIN_ROLES.includes(user.role)
    ? await serverDb.getAllSupportTickets()
    : await serverDb.getSupportTicketsByUser(user.id);
  return tickets.find(ticket => ticket.id === ticketId);
}

// ============================================================
// ADAPTIVE ROUTINES & PERSISTENT PROGRESS JOURNAL API
// ============================================================
async function routinePayload(userId: string) {
  const state = await serverDb.getAdaptiveRoutineState(userId);
  return {
    plan: state.plan || null,
    tasks: state.tasks,
    feedback: state.feedback,
    journal: state.journal,
    persistence: state.persistence
  };
}

app.get('/api/routine', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  res.json(await routinePayload(user.id));
}));

app.put('/api/routine', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.body?.preferences !== undefined && (typeof req.body.preferences !== 'object' || req.body.preferences === null)) {
    return res.status(400).json({ error: 'Préférences de routine invalides.' });
  }
  try {
    await serverDb.saveAdaptiveRoutine(user.id, req.body?.preferences || {}, req.body?.weather);
    res.json(await routinePayload(user.id));
  } catch (err) {
    console.error('[AdaptiveRoutine] save error:', err);
    res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer votre routine.') });
  }
}));

app.patch('/api/routine/tasks/:taskId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const status = req.body?.status;
  if (!['pending', 'completed', 'skipped'].includes(status)) return res.status(400).json({ error: 'Statut de tâche invalide.' });
  const task = await serverDb.updateAdaptiveRoutineTask(user.id, req.params.taskId, status);
  if (!task) return res.status(404).json({ error: 'Tâche de routine introuvable.' });
  res.json({ task });
}));

app.post('/api/routine/feedback', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const result = await serverDb.recordRoutineFeedback(user.id, {
      signal: req.body?.signal,
      note: req.body?.note,
      productLabel: req.body?.productLabel,
      observedAt: req.body?.observedAt
    });
    res.status(201).json({ feedback: result.feedback, ...(await routinePayload(user.id)) });
  } catch (err) {
    console.error('[AdaptiveRoutine] feedback error:', err);
    res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette observation.') });
  }
}));

app.get('/api/routine/journal', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const state = await serverDb.getAdaptiveRoutineState(user.id);
  res.json({ journal: state.journal, persistence: state.persistence });
}));

app.post('/api/routine/journal', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const result = await serverDb.createProgressJournalEntry(user.id, {
      entryDate: req.body?.entryDate,
      note: req.body?.note,
      signals: req.body?.signals,
      metrics: req.body?.metrics,
      productsUsed: req.body?.productsUsed
    });
    res.status(201).json({ entry: result.entry, ...(await routinePayload(user.id)) });
  } catch (err) {
    console.error('[AdaptiveRoutine] journal error:', err);
    res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette note de progression.') });
  }
}));

// Weather is fetched only after an explicit browser location permission. It
// is not inferred from an IP address and remains a transparent context input.
app.get('/api/routine/weather', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Coordonnées météo invalides.' });
  }
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation');
    url.searchParams.set('timezone', 'auto');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`weather_provider_${response.status}`);
    const payload = await response.json() as any;
    const weather = normalizeWeatherContext({
      temperatureC: payload?.current?.temperature_2m,
      humidityPercent: payload?.current?.relative_humidity_2m,
      precipitationMm: payload?.current?.precipitation,
      source: 'Open-Meteo',
      observedAt: payload?.current?.time
    });
    if (!weather) throw new Error('weather_payload_incomplete');
    res.json({ weather });
  } catch (err) {
    console.error('[AdaptiveRoutine] weather provider error:', err);
    res.status(502).json({ error: 'La météo actuelle n’est pas disponible. La routine reste basée sur votre profil et vos observations.' });
  }
}));

// ============================================================
// KURLA ID BEAUTY PROFILE API
// ============================================================
app.get('/api/beauty-profile', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const record = await serverDb.getBeautyProfile(user.id);
    const profile = record?.profile || createEmptyBeautyProfile();
    const confidence = record?.confidence || calculateProfileConfidence(profile);
    const [history, photos] = await Promise.all([
      serverDb.getBeautyProfileHistory(user.id),
      serverDb.getBeautyProfilePhotos(user.id)
    ]);
    res.json({
      profile,
      confidence,
      history,
      photos,
      source: isSupabaseServerConfigured() ? 'supabase' : 'server_fallback'
    });
  } catch (err) {
    console.error('[BeautyProfile] read error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de charger votre profil beauté.') });
  }
}));

app.put('/api/beauty-profile', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!req.body?.profile || typeof req.body.profile !== 'object') {
    return res.status(400).json({ error: 'Profil beauté invalide.' });
  }
  try {
    const profile = normalizeBeautyProfile(req.body.profile);
    const record = await serverDb.saveBeautyProfile(user.id, profile, 'user');
    if (!profile.photoConsent) await serverDb.deleteBeautyProfilePhotos(user.id);
    const photos = await serverDb.getBeautyProfilePhotos(user.id);
    res.json({ profile: record.profile, confidence: record.confidence, photos });
  } catch (err) {
    console.error('[BeautyProfile] save error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible d’enregistrer votre profil beauté.') });
  }
}));

app.get('/api/beauty-profile/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    res.json({ history: await serverDb.getBeautyProfileHistory(user.id) });
  } catch (err) {
    console.error('[BeautyProfile] history error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de charger l’historique du profil.') });
  }
}));

app.post('/api/beauty-profile/photos', express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '5mb'
}), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.headers['x-photo-consent'] !== 'true') {
    return res.status(400).json({ error: 'Le consentement photo est requis.' });
  }
  const record = await serverDb.getBeautyProfile(user.id);
  if (!record?.profile.photoConsent) {
    return res.status(400).json({ error: 'Enregistrez d’abord votre consentement dans le profil beauté.' });
  }
  const contentType = req.headers['content-type'];
  if (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') {
    return res.status(400).json({ error: 'Format photo non pris en charge.' });
  }
  const rawBody = req.body as Buffer | Uint8Array;
  if (!rawBody || typeof rawBody.byteLength !== 'number' || rawBody.byteLength === 0 || rawBody.byteLength > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Photo vide ou trop volumineuse (5 Mo maximum).' });
  }
  const bytes = Buffer.from(rawBody);
  const isJpeg = contentType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = contentType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = contentType === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) return res.status(400).json({ error: 'Le contenu de la photo ne correspond pas à son format déclaré.' });

  try {
    const photo = await serverDb.uploadBeautyProfilePhoto(user.id, bytes, contentType as BeautyProfilePhoto['mimeType'], new Date().toISOString());
    res.status(201).json({ photo });
  } catch (err) {
    console.error('[BeautyProfile] photo upload error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de stocker cette photo.') });
  }
}));

app.delete('/api/beauty-profile/photos', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    await serverDb.deleteBeautyProfilePhotos(user.id);
    const current = await serverDb.getBeautyProfile(user.id);
    if (current?.profile.photoConsent) {
      await serverDb.saveBeautyProfile(user.id, { ...current.profile, photoConsent: false }, 'photo_consent_withdrawn');
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[BeautyProfile] photo deletion error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de supprimer les photos du profil.') });
  }
}));

app.delete('/api/beauty-profile', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    await serverDb.deleteBeautyProfile(user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[BeautyProfile] deletion error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de supprimer votre profil beauté.') });
  }
}));

app.get('/api/beauty-recommendations', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const record = await serverDb.getBeautyProfile(user.id);
    if (!record) return res.json({ recommendations: [], message: 'Complétez votre profil pour calculer KURLA Fit.' });
    const products = await serverDb.getProducts();
    const routineState = await serverDb.getAdaptiveRoutineState(user.id);
    const recentFeedback = routineState.feedback.slice(0, 30);
    const hasSafetySignal = recentFeedback.some(item => item.signal === 'reaction' || item.signal === 'scalp_itchy');
    const affectedLabels = recentFeedback
      .filter(item => item.signal === 'reaction' || item.signal === 'product_heavy')
      .map(item => item.productLabel?.toLowerCase())
      .filter((label): label is string => !!label);
    const recommendations = hasSafetySignal ? [] : products
      .filter((product: any) => !affectedLabels.some(label => `${product.name} ${product.brand || ''}`.toLowerCase().includes(label)))
      .map((product: any) => ({
        product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          price: product.price,
          image: product.image,
          category: product.category,
          description: product.description
        },
        fit: calculateKurlaFit(product, record.profile)
      }))
      .filter(item => item.fit.score !== null)
      .sort((a, b) => (b.fit.score || 0) - (a.fit.score || 0))
      .slice(0, 8);
    res.json({
      recommendations,
      confidence: record.confidence,
      routineAdaptation: hasSafetySignal
        ? 'Une réaction ou des démangeaisons ont été signalées : aucune nouvelle recommandation produit n’est proposée avant observation ou avis professionnel.'
        : affectedLabels.length > 0
          ? 'Les produits signalés comme alourdissants ou réactifs sont écartés lorsqu’ils sont identifiables.'
          : routineState.plan?.adaptationNotes || []
    });
  } catch (err) {
    console.error('[BeautyRecommendations] error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de calculer vos recommandations.') });
  }
}));

// KURLA Pro applications may be submitted by guests. If a valid Supabase
// session is present, it is attached for follow-up; the form fields remain
// authoritative for the application contact details.
app.post('/api/professional-applications', rateLimit('professional-application', 5, 60 * 60 * 1000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  const fields = ['name', 'email', 'phone', 'city', 'profession', 'experience'] as const;
  for (const field of fields) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
    }
    if (body[field].trim().length > 200) {
      return res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
    }
  }

  if (body.acceptsCharter !== true) {
    return res.status(400).json({ error: 'L’adhésion à la Charte Qualité KURLA Pro est obligatoire.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  let portfolioUrl: string | undefined;
  if (body.portfolioUrl !== undefined && body.portfolioUrl !== '') {
    if (typeof body.portfolioUrl !== 'string' || body.portfolioUrl.length > 500) {
      return res.status(400).json({ error: 'Lien portfolio invalide.' });
    }
    try {
      const parsedUrl = new URL(body.portfolioUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('unsupported protocol');
      portfolioUrl = parsedUrl.toString();
    } catch {
      return res.status(400).json({ error: 'Lien portfolio invalide.' });
    }
  }

  const authenticatedUser = await authenticateRequest(req);
  try {
    const application = await serverDb.createProfessionalApplication({
      userId: authenticatedUser?.id,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      city: body.city.trim(),
      profession: body.profession.trim(),
      experience: body.experience.trim(),
      portfolioUrl,
      acceptsCharter: true
    });
    res.status(201).json({ application });
  } catch (err) {
    console.error('[ProApplications] submission error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible d’enregistrer la candidature pour le moment.') });
  }
}));

app.get('/api/admin/professional-applications', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const applications = await serverDb.getProfessionalApplications();
    res.json({ applications });
  } catch (err) {
    console.error('[ProApplications] admin list error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de charger les candidatures Pro.') });
  }
}));

app.post('/api/admin/professional-applications/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { status, adminComment } = req.body || {};
  const allowedStatuses = ['submitted', 'under_review', 'approved', 'rejected'];
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut de candidature invalide.' });
  }
  if (adminComment !== undefined && (typeof adminComment !== 'string' || adminComment.trim().length > 1000)) {
    return res.status(400).json({ error: 'Commentaire administrateur invalide.' });
  }

  try {
    const application = await serverDb.updateProfessionalApplication(
      req.params.id,
      status as any,
      typeof adminComment === 'string' && adminComment.trim() ? adminComment.trim() : undefined
    );
    if (!application) return res.status(404).json({ error: 'Candidature Pro introuvable.' });
    await serverDb.recordAdminAudit(admin.id, 'admin_professional_application_status_update', { applicationId: application.id, status });
    res.json({ application });
  } catch (err) {
    console.error('[ProApplications] status update error:', err);
    res.status(500).json({ error: safeApiError(err, 'Impossible de modifier la candidature Pro.') });
  }
}));

// 1. User Notifications API
app.get('/api/notifications', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const notifs = await serverDb.getNotifications(user.id);
  res.json({ notifications: notifs });
}));

app.post('/api/notifications/:id/read', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await serverDb.markNotificationRead(req.params.id, user.id);
  res.json({ success: true });
}));

app.delete('/api/notifications/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  await serverDb.deleteNotification(req.params.id, user.id);
  res.json({ success: true });
}));

// 2. Notification Preferences API
app.get('/api/notification-preferences', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const prefs = await serverDb.getNotificationPreferences(user.id);
  res.json({ preferences: prefs });
}));

app.post('/api/notification-preferences', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const allowedFields = ['emailNotifications', 'marketingEmails', 'inAppNotifications'];
  const prefs: Record<string, boolean> = {};
  for (const field of allowedFields) {
    if (typeof req.body?.[field] === 'boolean') prefs[field] = req.body[field];
  }

  const updated = await serverDb.updateNotificationPreferences(user.id, prefs);
  res.json({ preferences: updated });
}));

// 3. Shipments API: an order id is not a capability. Check order ownership first.
app.get('/api/shipments/:orderId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const order = await getOwnedOrder(req.params.orderId, user);
  if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

  const shipment = await serverDb.getShipmentByOrderId(order.id);
  res.json({ shipment: shipment || null });
}));

// 4. Returns & Refunds API
app.post('/api/returns', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const { orderId, reason, items, comment } = req.body || {};
  if (typeof orderId !== 'string' || typeof reason !== 'string' || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Données manquantes pour le retour.' });
  }

  const order = await getOwnedOrder(orderId, user);
  if (!order || order.userId !== user.id) {
    return res.status(404).json({ error: 'Commande introuvable.' });
  }

  try {
    const ret = await serverDb.createReturnRequest(user.id, order.id, reason.trim(), items, typeof comment === 'string' ? comment.trim() : undefined);
    res.json({ returnRequest: ret });
  } catch (err: any) {
    res.status(500).json({ error: safeApiError(err, 'Impossible de créer la demande de retour.') });
  }
}));

app.get('/api/returns', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;

  if (ADMIN_ROLES.includes(user.role)) {
    const allReturns = await serverDb.getAllReturns();
    return res.json({ returns: allReturns });
  }
  const userReturns = await serverDb.getReturnsByUser(user.id);
  res.json({ returns: userReturns });
}));

app.post('/api/admin/returns/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { status, adminComment } = req.body || {};
  const allowedStatuses = ['requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled'];
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut de retour invalide.' });
  }

  try {
    const ret = await serverDb.updateReturnStatus(req.params.id, status as any, typeof adminComment === 'string' ? adminComment.trim() : undefined);
    if (!ret) return res.status(404).json({ error: 'Demande de retour introuvable.' });
    await serverDb.recordAdminAudit(admin.id, 'admin_return_status_update', { returnId: ret.id, status });
    res.json({ returnRequest: ret });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de modifier le statut du retour.') });
  }
}));

app.post('/api/admin/refunds', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { orderId, returnId, amount, reason, idempotencyKey: bodyIdempotencyKey } = req.body || {};
  if (typeof orderId !== 'string' || (amount !== undefined && (!Number.isFinite(amount) || amount <= 0))) {
    return res.status(400).json({ error: 'Paramètres de remboursement invalides.' });
  }

  const headerIdempotencyKey = req.headers['idempotency-key'];
  const idempotencyKey = typeof headerIdempotencyKey === 'string'
    ? headerIdempotencyKey
    : typeof bodyIdempotencyKey === 'string' ? bodyIdempotencyKey : undefined;
  if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 255)) {
    return res.status(400).json({ error: 'Clé d’idempotence invalide.' });
  }

  try {
    const refund = await serverDb.processStripeRefund(
      orderId,
      typeof returnId === 'string' ? returnId : undefined,
      amount,
      typeof reason === 'string' && reason.trim() ? reason.trim() : undefined,
      idempotencyKey
    );
    await serverDb.recordAdminAudit(admin.id, 'admin_refund_create', { orderId, returnId, amount: refund.amount, refundId: refund.id });
    res.json({ refund });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de traiter le remboursement.') });
  }
}));

// 5. Customer Support Tickets API
app.get('/api/support/tickets', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;

  const tickets = ADMIN_ROLES.includes(user.role)
    ? await serverDb.getAllSupportTickets()
    : await serverDb.getSupportTicketsByUser(user.id);
  res.json({ tickets });
}));

app.post('/api/support/tickets', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const { orderId, category, subject, message } = req.body || {};
  if (typeof category !== 'string' || typeof subject !== 'string' || typeof message !== 'string' || !category.trim() || !subject.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }

  if (orderId !== undefined) {
    if (typeof orderId !== 'string') return res.status(400).json({ error: 'Commande invalide.' });
    const order = await getOwnedOrder(orderId, user);
    if (!order || order.userId !== user.id) return res.status(404).json({ error: 'Commande introuvable.' });
  }

  const ticket = await serverDb.createSupportTicket(
    user.id,
    typeof orderId === 'string' ? orderId : undefined,
    category as any,
    subject.trim(),
    message.trim()
  );
  res.json({ ticket });
}));

app.get('/api/support/tickets/:id/messages', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const ticket = await getOwnedTicket(req.params.id, user);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });

  const messages = await serverDb.getSupportMessages(ticket.id);
  res.json({ messages });
}));

app.post('/api/support/tickets/:id/messages', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const ticket = await getOwnedTicket(req.params.id, user);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });

  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message vide.' });
  const isAdmin = ADMIN_ROLES.includes(user.role);
  const msg = await serverDb.addSupportMessage(ticket.id, user.id, isAdmin ? 'admin' : 'customer', message.trim());
  res.json({ message: msg });
}));

app.post('/api/admin/support/tickets/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { status } = req.body || {};
  const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut de ticket invalide.' });
  }

  const ticket = await getOwnedTicket(req.params.id, admin);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
  await serverDb.updateSupportTicketStatus(ticket.id, status as any);
  await serverDb.recordAdminAudit(admin.id, 'admin_support_ticket_status_update', { ticketId: ticket.id, status });
  res.json({ success: true });
}));

// 6. Admin Order Status & Audit Trail API
app.post('/api/admin/orders/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const orderId = req.params.id;
  const { status, reason } = req.body || {};
  if (typeof status !== 'string') return res.status(400).json({ error: 'Statut de commande invalide.' });
  if (status === 'refunded' || status === 'partially_refunded') {
    return res.status(400).json({ error: 'Utilisez le flux de remboursement pour restaurer le stock et garantir l’idempotence.' });
  }

  try {
    const updated = await serverDb.updateOrderStatus(orderId, status as any, {
      changedBy: admin.id,
      changedByRole: admin.role,
      reason: typeof reason === 'string' && reason.trim() ? reason.trim() : `Mise à jour statut admin vers ${status}`
    });
    if (!updated) return res.status(404).json({ error: 'Commande introuvable.' });
    res.json({ order: updated });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de modifier le statut.') });
  }
}));

app.get('/api/admin/orders/:id/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const history = await serverDb.getOrderStatusHistory(req.params.id);
  res.json({ history });
}));

// 7. Admin Real Dashboard Analytics and Operations API
app.get('/api/admin/metrics', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const metrics = await serverDb.getAdminAnalyticsMetrics();
  res.json({ metrics });
}));

app.get('/api/admin/dashboard', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const dashboard = await serverDb.getAdminDashboardData();
  res.json({ dashboard });
}));

app.post('/api/admin/entities/:entity', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const allowedEntities = ['brand', 'category', 'article', 'ai_source', 'coupon'];
  if (!allowedEntities.includes(req.params.entity)) return res.status(404).json({ error: 'Entité admin inconnue.' });
  try {
    const saved = await serverDb.saveAdminEntity(admin.id, req.params.entity as any, req.body || {});
    res.status(201).json({ entity: saved });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible d’enregistrer cette entité.') });
  }
}));

app.patch('/api/admin/entities/:entity/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const allowedEntities = ['brand', 'category', 'article', 'ai_source', 'coupon'];
  if (!allowedEntities.includes(req.params.entity)) return res.status(404).json({ error: 'Entité admin inconnue.' });
  try {
    const saved = await serverDb.saveAdminEntity(admin.id, req.params.entity as any, { ...(req.body || {}), id: req.params.id });
    res.json({ entity: saved });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de modifier cette entité.') });
  }
}));

app.post('/api/admin/users/:id/role', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (typeof req.body?.role !== 'string') return res.status(400).json({ error: 'Rôle manquant.' });
  try {
    const user = await serverDb.updateAdminUserRole(admin.id, req.params.id, req.body.role, admin.role);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ user });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de modifier le rôle.') });
  }
}));

app.post('/api/admin/reviews/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const review = await serverDb.updateAdminReviewStatus(admin.id, req.params.id, req.body?.status);
    if (!review) return res.status(404).json({ error: 'Avis introuvable.' });
    res.json({ review });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de modérer cet avis.') });
  }
}));

app.post('/api/admin/payments/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const payment = await serverDb.updateAdminPaymentStatus(admin.id, req.params.id, req.body?.status);
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });
    res.json({ payment });
  } catch (err: any) {
    res.status(400).json({ error: safeApiError(err, 'Impossible de modifier ce paiement.') });
  }
}));

app.patch('/api/admin/shipments/:orderId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const order = await serverDb.getOrderById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
  const allowedCarriers = ['manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre'];
  const allowedStatuses = ['preparing', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];
  const carrier = typeof req.body?.carrier === 'string' && allowedCarriers.includes(req.body.carrier) ? req.body.carrier : 'manual';
  const status = typeof req.body?.status === 'string' && allowedStatuses.includes(req.body.status) ? req.body.status : 'preparing';
  const shipment = await serverDb.upsertShipment({
    id: typeof req.body?.id === 'string' ? req.body.id : randomUUID(),
    orderId: order.id,
    userId: order.userId,
    carrier: carrier as any,
    method: typeof req.body?.method === 'string' ? req.body.method.trim().slice(0, 80) : 'standard',
    price: Number.isFinite(Number(req.body?.price)) ? Number(req.body.price) : 0,
    trackingNumber: typeof req.body?.trackingNumber === 'string' ? req.body.trackingNumber.trim().slice(0, 160) || undefined : undefined,
    trackingUrl: typeof req.body?.trackingUrl === 'string' ? req.body.trackingUrl.trim().slice(0, 2000) || undefined : undefined,
    status: status as any,
    shippedAt: req.body?.shippedAt,
    estimatedDelivery: req.body?.estimatedDelivery,
    deliveredAt: req.body?.deliveredAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await serverDb.recordAdminAudit(admin.id, 'admin_shipment_update', { orderId: order.id, status, carrier });
  res.json({ shipment });
}));

app.post('/api/admin/notifications', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, title, message, type, link, orderId } = req.body || {};
  const allowedTypes = ['account_created', 'email_confirmation_pending', 'payment_pending', 'payment_confirmed', 'payment_failed', 'order_processing', 'order_packed', 'order_shipped', 'order_delivered', 'refund_created', 'return_requested', 'support_reply', 'low_stock', 'routine_reminder'];
  if (typeof userId !== 'string' || typeof title !== 'string' || typeof message !== 'string' || !title.trim() || !message.trim() || !allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Destinataire, type, titre et message sont obligatoires.' });
  }
  const notification = await serverDb.sendNotification(userId, type, title.trim().slice(0, 240), message.trim().slice(0, 4000), typeof link === 'string' ? link.trim().slice(0, 1000) : undefined, typeof orderId === 'string' ? orderId : undefined);
  await serverDb.recordAdminAudit(admin.id, 'admin_notification_send', { userId, type, notificationId: notification.id });
  res.status(201).json({ notification });
}));

// Public search telemetry is reduced to an event (never raw customer data).
// The result count is recomputed from the published server catalogue so the
// admin KPI cannot trust a client-provided statistic.
app.post('/api/search-events', rateLimit('search-events', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim().slice(0, 200) : '';
  if (query.length < 2) return res.status(400).json({ error: 'Recherche trop courte.' });
  const country = typeof req.body?.country === 'string' ? req.body.country.trim().slice(0, 2).toUpperCase() : undefined;
  const products = await serverDb.getPublicProducts();
  const term = query.toLocaleLowerCase('fr-FR');
  const resultCount = products.filter(product => [product.name, product.brand, product.category, product.description, ...(product.keyIngredients || [])].filter(Boolean).some((value: unknown) => String(value).toLocaleLowerCase('fr-FR').includes(term))).length;
  const user = await authenticateRequest(req);
  await serverDb.recordCatalogSearch(query, resultCount, country, user?.id);
  res.status(202).json({ accepted: true });
}));

// AI Endpoint: Support Assistant Draft
app.post('/api/ai/support-draft', async (req: Request, res: Response) => {
  try {
    const userMessage = typeof req.body?.userMessage === 'string' ? req.body.userMessage.trim().slice(0, 2000) : '';
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim().slice(0, 120) : 'votre demande';
    if (!userMessage) return res.status(400).json({ error: 'Le message support est obligatoire.' });
    const triage = medicalTriage(userMessage);
    if (triage.review) return res.json({ answer: triage.message, requiresHumanReview: true, disclaimer: AI_DISCLAIMER });
    const catalog = await getAvailableCatalog('FR');
    const aiClient = getGeminiClient();

    if (!aiClient) {
      return res.json({
        answer: `Bonjour ! Merci pour votre message concernant ${topic}. Notre équipe peut vous aider à vérifier une routine ou un produit du catalogue KURLA. Pour un symptôme persistant, demandez un avis professionnel.`,
        disclaimer: AI_DISCLAIMER
      });
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: JSON.stringify({ userMessage, topic }),
      config: {
        systemInstruction: `Tu es le conseiller support beauté de KURLA. Réponds de façon concise, chaleureuse et simple. Tu ne poses pas de diagnostic. Tu ne cites un produit que s’il existe exactement dans ce catalogue vérifié et disponible : ${JSON.stringify(catalog.map(product => ({ name: product.name, slug: product.slug })))}. N’invente aucune disponibilité, promesse ou lien.`,
        responseMimeType: 'application/json',
        responseSchema: { type: Type.OBJECT, properties: { answer: { type: Type.STRING } }, required: ['answer'] }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ answer: typeof parsed.answer === 'string' ? parsed.answer.slice(0, 2000) : 'Notre équipe peut vous aider à vérifier cette demande.', disclaimer: AI_DISCLAIMER });
  } catch (err) {
    res.status(500).json({ error: 'Le brouillon support est temporairement indisponible.', disclaimer: AI_DISCLAIMER });
  }
});

// Last-resort error boundary for async routes. Critical database errors are
// logged and returned as 5xx instead of being converted into fake success.
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as Request & { requestId?: string }).requestId;
  console.error(JSON.stringify({
    event: 'http_unhandled_error',
    requestId,
    method: req.method,
    path: req.path,
    error: error?.message || String(error)
  }));
  if (res.headersSent) return next(error);

  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return res.status(413).json({ error: 'Requête trop volumineuse.' });
  }
  if (error?.type === 'entity.parse.failed' || error?.status === 400) {
    return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  }
  res.status(500).json({
    error: 'Erreur interne du serveur. Aucune opération critique n’a été confirmée.',
    requestId
  });
});

// Mount Vite middleware in dev or static files in production
function assertProductionConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = [];
  if (!isSupabaseServerConfigured()) {
    missing.push('SUPABASE_URL + SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (process.env.STRIPE_WEBHOOK_ENABLED !== 'true' || !process.env.STRIPE_WEBHOOK_SECRET) {
    missing.push('STRIPE_WEBHOOK_ENABLED=true + STRIPE_WEBHOOK_SECRET');
  }

  const appUrl = process.env.VITE_APP_URL;
  try {
    const parsedAppUrl = appUrl ? new URL(appUrl) : null;
    if (!parsedAppUrl || parsedAppUrl.protocol !== 'https:' || !parsedAppUrl.hostname) {
      missing.push('VITE_APP_URL HTTPS publique');
    }
  } catch {
    missing.push('VITE_APP_URL HTTPS publique');
  }

  const emailProvider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
  if (!['resend', 'sendgrid', 'postmark'].includes(emailProvider) || !process.env.EMAIL_PROVIDER_API_KEY) {
    missing.push('EMAIL_PROVIDER réel (resend/sendgrid/postmark) + EMAIL_PROVIDER_API_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `[KURLA Startup] Configuration production incomplète. Variables requises : ${missing.join(', ')}. ` +
      'Le serveur ne démarre pas en production avec un stockage, un paiement, un webhook ou un fournisseur email non configuré.'
    );
  }
}

async function startServer() {
  assertProductionConfiguration();
  await serverInitialization;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KURLA Beauty Server] Listening on http://0.0.0.0:${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[KURLA Beauty Server] ${signal} reçu, arrêt gracieux en cours.`);
    const forceExit = setTimeout(() => {
      console.error('[KURLA Beauty Server] Arrêt forcé après expiration du délai.');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    httpServer.close(error => {
      clearTimeout(forceExit);
      if (error) {
        console.error('[KURLA Beauty Server] Erreur pendant l’arrêt:', error);
        process.exit(1);
      }
      console.log('[KURLA Beauty Server] Arrêt terminé.');
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

// Export the Express app for HTTP authorization tests without starting a
// second listener. Production/dev execution still starts normally.
export { app };

if (process.env.KURLA_TEST_NO_SERVER !== 'true') {
  startServer().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
