import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import Stripe from 'stripe';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from './src/lib/ai/systemPrompt';
import { serverDb, ServerOrder } from './src/lib/serverDb';
import { getSupabaseAuthVerifier, getSupabaseServerClient, isSupabaseServerConfigured } from './src/lib/supabaseClient';
import { UserRole } from './src/types';
import { MOCK_PRODUCTS } from './src/data/mockData';

// Initialize persistent product database via Supabase. The startup path awaits
// this promise so a schema/connection error cannot be hidden behind a healthy
// HTTP listener.
const serverInitialization = process.env.NODE_ENV === 'production' && !isSupabaseServerConfigured()
  ? Promise.resolve()
  : serverDb.initialize(MOCK_PRODUCTS).then(() => {
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

app.use(express.json({ limit: '100kb', strict: true }));

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

    // Verify product pricing & stock authoritatively against backend catalog (Database)
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

      const dbProduct = await serverDb.getProductById(pId);
      if (!dbProduct) {
        console.error(`[Stripe Checkout Error] Produit introuvable ID: ${pId}`);
        return res.status(400).json({ error: `Produit introuvable dans le catalogue serveur (ID: ${pId})` });
      }

      if (!dbProduct.inStock) {
        console.error(`[Stripe Checkout Error] Produit en rupture: ${dbProduct.name}`);
        return res.status(400).json({ error: `Le produit "${dbProduct.name}" est actuellement en rupture de stock.` });
      }

      const availableStock = await serverDb.getAvailableStock(dbProduct.id);
      const requestedQuantity = requestedByVariant.get(requestedKey) || quantity;
      if (requestedQuantity > availableStock) {
        console.error(`[Stripe Checkout Error] Stock insuffisant pour ${dbProduct.name} (${requestedQuantity}/${availableStock})`);
        return res.status(400).json({
          error: `Stock insuffisant pour "${dbProduct.name}". Quantité demandée : ${requestedQuantity}, Stock disponible : ${availableStock}.`
        });
      }

      // Ignore client price parameter — compute strictly using server DB price
      const dbPrice = dbProduct.price;
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

    console.log(`[Stripe Checkout] Total calculé côté serveur: ${calculatedTotal.toFixed(2)} EUR`);

    // Save order with user_id and status payment_pending_webhook
    const newOrder: ServerOrder = {
      id: orderId,
      userId: uid,
      items: verifiedItems,
      total: Number(calculatedTotal.toFixed(2)),
      status: 'payment_pending_webhook',
      customerEmail: email,
      checkoutIdempotencyKey,
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
  const products = await serverDb.getProducts();
  const source = serverDb.getStatusSummary().supabaseConfigured ? 'supabase' : 'fallback';
  res.json({ products, source });
}));

// Real Available Catalog helper for AI Assistant
async function getAvailableCatalog() {
  const products = await serverDb.getProducts();
  return products.filter(p => p.inStock).map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    price: p.price,
    link: `/produit/${p.slug}`,
    category: p.category,
    description: p.description
  }));
}

// AI Endpoint: General Beauty Assistant Query
app.post('/api/ai/assistant', rateLimit('ai-assistant', 30, 60_000), async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const aiClient = getGeminiClient();

    // Guardrail Check for Medical/Emergency Claims
    const emergencyTerms = [
      'difficulte a respirer', 'difficulté à respirer', 'gonflement gorge', 'gonflement langue',
      'allergie grave', 'brulure chimique', 'brûlure chimique', 'cloques', 'sang', 'saignement',
      'fievre', 'fièvre', 'plaies', 'alopecie cicatricielle'
    ];
    const qLower = query.toLowerCase();
    const isMedicalEmergency = emergencyTerms.some(term => qLower.includes(term));

    if (isMedicalEmergency) {
      return res.json({
        isMedicalRedirect: true,
        medicalMessage: "Attention : Votre description comporte des signes nécessitant une attention médicale prioritaire (brûlure, saignement, réaction allergique ou infection). En France, contactez le SAMU (15) ou le 112, ou consultez d'urgence un médecin ou dermatologue.",
        disclaimer: "Les conseils KURLA Beauty sont à titre informatif et ne remplacent en aucun cas un avis ou diagnostic médical."
      });
    }

    const availableCatalog = await getAvailableCatalog();
    const defaultAvailableProduct = availableCatalog[0] || { name: 'Leave-In Hydratant Cacao & Mangue', link: '/produit/leave-in-hydratant', fitScore: 96 };

    if (!aiClient) {
      return res.json({
        isMedicalRedirect: false,
        fallback: true,
        answer: {
          shortAnswer: `Voici nos conseils personnalisés KURLA concernant : "${query}".`,
          simpleExplanation: "Pour les cheveux texturés (3A à 4C) et les peaux mélaninées, le secret réside dans l'apport régulier d'eau tiède ou de soins à base d'eau, scellés ensuite par un corps gras adapté sans surcharger le cuir chevelu.",
          immediateActions: [
            "Humidifier légèrement avec un spray d'eau tiède ou une eau florale d'aloe vera.",
            "Appliquer un soin nourrissant doux en séparant en sections.",
            "Éviter toute traction forte ou frottement agressif."
          ],
          recommendedRoutine: "Routine Hydratation & Protection KURLA",
          usefulProducts: [
            { name: defaultAvailableProduct.name, link: defaultAvailableProduct.link, fitScore: 96 },
            { name: "Sérum SPF 50+ Invisible Peau Mélaninée", link: "/produit/spf-invisible", fitScore: 94 }
          ],
          usefulTools: [
            { name: "Vaporisateur Brume Continue 360°", description: "Humidifie uniformément sans détremper." },
            { name: "Bonnet Satin Ajustable", description: "Garde l'hydratation capillaire pendant le sommeil." }
          ],
          errorsToAvoid: [
            "Mettre de l'huile pure sur des cheveux ou une peau totalement secs.",
            "Frotter vigoureusement avec une serviette en coton classique."
          ],
          whenToConsultPro: "En cas d'irritation persistante, rougeur douloureuse ou perte soudaine de densité.",
          ctas: [
            { label: "Voir la Boutique", href: "/boutique", type: "boutique" },
            { label: "Consulter un Spécialiste Certifié", href: "/professionnels", type: "pro" }
          ]
        },
        disclaimer: "Les conseils KURLA Beauty sont des conseils cosmétiques non médicaux."
      });
    }

    const systemPromptWithCatalog = `${SYSTEM_PROMPT_ASSISTANT_BEAUTE}
Catalogue de produits KURLA REELS et DISPONIBLES uniquement :
${JSON.stringify(availableCatalog)}

Règle absolue : Tu ne dois recommander QUE des produits figurant dans ce catalogue réel. Le champ "link" de chaque produit doit TOUJOURS suivre le format "/produit/{slug}" ou "/boutique". Ne fais AUCUN lien vers /produits.`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Question de l'utilisateur : "${query}"`,
      config: {
        systemInstruction: systemPromptWithCatalog,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortAnswer: { type: Type.STRING },
            simpleExplanation: { type: Type.STRING },
            immediateActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            usefulProducts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  link: { type: Type.STRING },
                  fitScore: { type: Type.NUMBER }
                },
                required: ['name', 'link', 'fitScore']
              }
            },
            usefulTools: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ['name', 'description']
              }
            },
            errorsToAvoid: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            whenToConsultPro: { type: Type.STRING },
            ctas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  href: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['label', 'href', 'type']
              }
            }
          },
          required: [
            'shortAnswer', 'simpleExplanation', 'immediateActions', 'usefulProducts',
            'usefulTools', 'errorsToAvoid', 'whenToConsultPro', 'ctas'
          ]
        }
      }
    });

    const jsonText = response.text || '';
    const parsedAnswer = JSON.parse(jsonText);

    // Filter usefulProducts to ensure strictly real catalog products and correct route links
    if (parsedAnswer.usefulProducts && Array.isArray(parsedAnswer.usefulProducts)) {
      parsedAnswer.usefulProducts = parsedAnswer.usefulProducts.map((p: any) => {
        const proposedName = typeof p?.name === 'string' ? p.name.toLowerCase() : '';
        const matched = availableCatalog.find(product =>
          product.name.toLowerCase().includes(proposedName) || proposedName.includes(product.name.toLowerCase())
        );
        if (matched) {
          return { name: matched.name, link: `/produit/${matched.slug}`, fitScore: p.fitScore || 90 };
        }
        return { name: defaultAvailableProduct.name, link: defaultAvailableProduct.link, fitScore: 90 };
      });
    }

    // Sanitize links
    if (parsedAnswer.ctas && Array.isArray(parsedAnswer.ctas)) {
      parsedAnswer.ctas = parsedAnswer.ctas.map((c: any) => ({
        ...c,
        href: c.href === '/produits' ? '/boutique' : c.href
      }));
    }

    return res.json({
      isMedicalRedirect: false,
      answer: parsedAnswer,
      disclaimer: "Les réponses de l'assistant KURLA sont fournies à titre d'information et d'accompagnement cosmétique et ne remplacent pas une consultation médicale."
    });
  } catch (err: any) {
    console.error('Error in AI Assistant API endpoint:', err);
    return res.status(500).json({
      isMedicalRedirect: false,
      error: true,
      answer: {
        shortAnswer: "Notre assistant IA a rencontré un bref imprévu réseau, voici la recommandation essentielle KURLA.",
        simpleExplanation: "Pour toute préoccupation liée aux cheveux ou à la peau, la base est de protéger la barrière cutanée et la fibre capillaire avec douceur.",
        immediateActions: [
          "Privilégier un nettoyage doux pH neutre.",
          "Appliquer des soins riches en actifs apaisants (aloe vera, karité, niacinamide).",
          "Eviter les frictions mécaniques trop intenses."
        ],
        usefulProducts: [
          { name: "Shampoing Doux Sans Sulfates", link: "/produit/shampoing-doux", fitScore: 95 }
        ],
        usefulTools: [
          { name: "Bonnet Satin XL", description: "Soin nocturne" }
        ],
        errorsToAvoid: [
          "Produits trop décapants ou abrasifs"
        ],
        whenToConsultPro: "Si la gêne persists plusieurs jours.",
        ctas: [
          { label: "Explorer la boutique", href: "/boutique", type: "boutique" }
        ]
      },
      disclaimer: "Les conseils KURLA Beauty sont informatifs."
    });
  }
});

// AI Endpoint: Generate Routine Recommendation
app.post('/api/ai/routine-result', rateLimit('ai-routine', 20, 60_000), async (req: Request, res: Response) => {
  try {
    const { diagnosticType, answers } = req.body;
    const aiClient = getGeminiClient();

    // Guardrail Check for Medical/Emergency Claims
    const sensitiveTerms = ['plaie', 'brulure', 'sang', 'infection', 'alopecie severe', 'chute massive'];
    const userString = JSON.stringify(answers || {}).toLowerCase();
    const isSensitive = sensitiveTerms.some(term => userString.includes(term));

    if (isSensitive) {
      return res.json({
        summary: "Votre situation présente des signes de sensibilité extrême ou d'irritation.",
        recommendedRoutine: "Consultation Spécialisée",
        reason: "Pour votre sécurité, nous vous recommandons de consulter un dermatologue ou un professionnel de santé.",
        steps: [
          "Suspendre immédiatement les traitements chimiques ou coiffures très serrées.",
          "Nettoyer à l'eau tiède douce avec un soin neutre sans parfum.",
          "Consulter un médecin si les symptômes persistent."
        ],
        warnings: [
          "AVIS IMPORTANT : Les conseils KURLA ne remplacent en aucun cas un avis médical."
        ],
        productHandles: [],
        requiresHumanReview: true
      });
    }

    const currentCatalog = await getAvailableCatalog();
    const validCatalogSlugs = new Set(currentCatalog.map(product => product.slug));
    const requestedFallbackHandles = diagnosticType === 'hair'
      ? ["leave-in-hydratant", "masque-hydratant", "bonnet-satin"]
      : ["spf-invisible", "serum-marques-post-imperfections"];
    const realProductHandles = requestedFallbackHandles.filter(slug => validCatalogSlugs.has(slug));

    if (!aiClient) {
      const isHair = diagnosticType === 'hair';
      return res.json({
        summary: isHair
          ? `Routine sur-mesure pour texture ${answers.texture || 'texturée'} axée sur ${answers.priority || 'l’hydratation'}.`
          : `Routine éclat visage pour type de peau ${answers.skinType || 'mélaninée'} axée sur ${answers.priority || 'l’uniformité'}.`,
        recommendedRoutine: isHair ? "Starter Hydratation 4C & Boucles" : "Melanin Skin Glow & Anti-Taches",
        reason: isHair
          ? "Vos réponses indiquent un besoin prioritaire de scellage d'hydratation pour stopper la casse sans alourdir les spires."
          : "Votre peau réagit mieux aux sérums doux enrichis en Niacinamide et protection solaire 100% invisible.",
        steps: isHair ? [
          "Étape 1 : Nettoyage doux au shampoing nourrissant 1x par semaine.",
          "Étape 2 : Application du Leave-In Crème Cacao sur cheveux très humides.",
          "Étape 3 : Sceller l'eau avec 3 gouttes d'Élixir d'huiles.",
          "Étape 4 : Protéger les longueurs la nuit avec le bonnet satin."
        ] : [
          "Étape 1 Matin : Nettoyage doux à l'eau tiède.",
          "Étape 2 Matin : Sérum SPF 50+ Invisible sans aucun trace blanche.",
          "Étape 3 Soir : Sérum Concentré Marques sur zones ciblées."
        ],
        warnings: [
          "Les recommandations KURLA sont des conseils beauté non médicaux."
        ],
        productHandles: realProductHandles,
        requiresHumanReview: false
      });
    }

    const systemInstruction = `Tu es l'architecte IA beauté certifié de KURLA Beauty.
Tu as accès aux produits réels avec leurs slugs exacts :
${JSON.stringify(currentCatalog.map(p => ({ slug: p.slug, name: p.name })))}

Règle impérative : productHandles doit contenir UNIQUEMENT une liste de slugs réels parmi la liste ci-dessus (par exemple ["leave-in-hydratant", "masque-hydratant", "bonnet-satin"]). Ne crée AUCUN slug fictif.`;

    const prompt = `Diagnostic : ${diagnosticType}. Réponses : ${JSON.stringify(answers)}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendedRoutine: { type: Type.STRING },
            reason: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            productHandles: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            requiresHumanReview: { type: Type.BOOLEAN }
          },
          required: ['summary', 'recommendedRoutine', 'reason', 'steps', 'warnings', 'productHandles', 'requiresHumanReview']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Ensure productHandles contains only valid slugs
    if (parsed.productHandles && Array.isArray(parsed.productHandles)) {
      const validSlugs = currentCatalog.map(p => p.slug);
      parsed.productHandles = parsed.productHandles.filter((h: string) => validSlugs.includes(h));
      if (parsed.productHandles.length === 0) {
        parsed.productHandles = realProductHandles;
      }
    } else {
      parsed.productHandles = realProductHandles;
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI routine:', error);
    res.status(500).json({
      summary: "Routine KURLA Recommandée",
      recommendedRoutine: "Starter Hydratation",
      reason: "Voici notre routine de départ certifiée basée sur votre profil.",
      steps: [
        "Hydrater sur cheveux humides avec le Leave-In Cacao",
        "Sceller avec l'huile capillaire douce",
        "Dormir avec le bonnet satin"
      ],
      warnings: ["Les conseils KURLA sont des conseils beauté non médicaux."],
      productHandles: ["leave-in-hydratant", "bonnet-satin"],
      requiresHumanReview: false
    });
  }
});

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
  res.json({ success: true });
}));

// 6. Admin Order Status & Audit Trail API
app.post('/api/admin/orders/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const orderId = req.params.id;
  const { status, reason } = req.body || {};
  if (typeof status !== 'string') return res.status(400).json({ error: 'Statut de commande invalide.' });

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

// 7. Admin Real Dashboard Analytics API
app.get('/api/admin/metrics', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const metrics = await serverDb.getAdminAnalyticsMetrics();
  res.json({ metrics });
}));

// AI Endpoint: Support Assistant Draft
app.post('/api/ai/support-draft', async (req: Request, res: Response) => {
  try {
    const { userMessage, topic } = req.body;
    const aiClient = getGeminiClient();

    if (!aiClient) {
      return res.json({
        answer: `Bonjour ! Merci pour votre message concernant ${topic || 'votre routine'}. Chez KURLA Beauty, nous recommandons de toujours privilégier l'hydratation à l'eau tiède suivie d'un leave-in adapté. N'hésitez pas à faire notre diagnostic gratuit.`
      });
    }

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Tu es le conseiller support beauté chaleureux de KURLA Beauty. Réponds de façon concise à : "${userMessage}". Ton bienveillant et expert.`,
    });

    res.json({ answer: response.text });
  } catch (err) {
    res.status(500).json({ answer: "Merci de contacter KURLA Beauty ! Notre équipe vous recommande de commencer par le diagnostic gratuit." });
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
