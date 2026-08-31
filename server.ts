import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { Type } from '@google/genai';
import Stripe from 'stripe';
import { professionalStore } from './src/lib/professionalStore';
import { mountSpaFallback } from './src/server/spaFallback';
import { renderSpaDocument } from './src/server/seoResolver';
import { jurisdictionForCountry } from './src/lib/jurisdiction';
import { serverDb, ServerOrder } from './src/lib/serverDb';
import { isSupabaseServerConfigured } from './src/lib/supabaseClient';
import {
  calculateShippingCents,
  normalizeShippingAddress,
  ShippingMethod,
} from './src/lib/shippingRules';
import { isReverseChargeEligible, vatRateForCountry } from './src/lib/vat';
import { priceCheckoutWithVat } from './src/lib/checkoutVat';
import { verifyVatNumber } from './src/lib/viesVerification';
import { fromCents, toCents } from './src/lib/currency';
import {
  asyncRoute,
  getAnonymousId,
  getAppUrl,
  isUuid,
  rateLimit,
  safeApiError,
  securityHeaders,
} from './src/server/http';
import {
  ADMIN_ROLES,
  SUPPORT_ROLES,
  authenticateRequest,
  bearerToken,
  getOwnedOrder,
  requireAdmin,
  requireSupport,
  requireUser,
} from './src/server/auth';
import type { AuthenticatedRequest, AuthenticatedUser } from './src/server/types';
import { getGeminiClient } from './src/server/ai/client';
import { getStripeClient } from './src/server/payments/stripeClient';
import {
  JurisdictionGraph,
  assessProductComplianceForCountry,
  loadJurisdictionGraph,
} from './src/server/compliance';
import { getAvailableCatalog } from './src/server/ai/catalog';
import { AI_DISCLAIMER, medicalTriage } from './src/server/ai/assistant';
import { registerFamilyRoutes } from './src/server/routes/family';
import { registerIntelligenceRoutes } from './src/server/routes/intelligence';
import { registerChantierARoutes } from './src/server/routes/chantierA';
import { registerAdaptiveRoutineRoutes } from './src/server/routes/adaptiveRoutines';
import { registerProfessionalRoutes } from './src/server/routes/professionals';
import { registerRecommendationRoutes } from './src/server/routes/recommendations';
import { registerCatalogGovernanceRoutes } from './src/server/routes/catalogGovernance';
import { registerSupplierRoutes } from './src/server/routes/suppliers';
import { registerSourcingRoutes } from './src/server/routes/sourcing';
import { registerProspectRoutes } from './src/server/routes/prospects';
import { registerRetentionNudgeRoutes } from './src/server/routes/retentionNudges';
import { registerOperationsCockpitRoutes } from './src/server/routes/operationsCockpit';
import { registerBatchRoutes } from './src/server/routes/batches';
import { registerAiAssistantRoutes } from './src/server/routes/aiAssistant';
import { registerBeautyProfileRoutes } from './src/server/routes/beautyProfile';
import { registerLoyaltyRoutes } from './src/server/routes/loyalty';
import { registerBeautyJourneyRoutes } from './src/server/routes/beautyJourney';
import { registerMembershipRoutes } from './src/server/routes/membership';
import { registerPublicApiRoutes } from './src/server/routes/publicApi';
import { registerCreatorRoutes } from './src/server/routes/creators';
import { registerBrandTestRoutes } from './src/server/routes/brandTests';
import { registerMobileRoutes } from './src/server/routes/mobile';
import { registerPrivacyRoutes } from './src/server/routes/privacy';
import { registerEditorialComplianceRoutes } from './src/server/routes/editorialCompliance';
import { registerIngredientGraphRoutes } from './src/server/routes/ingredientGraphAdmin';
import { registerIngredientNavRoutes } from './src/server/routes/ingredients';
import { registerStrategyRoutes } from './src/server/routes/strategy';
import { registerCommunityRoutes } from './src/server/routes/community';
import { registerBrandContractRoutes } from './src/server/routes/brandContracts';
import {
  activateMembershipFromCheckoutSession,
  cancelMembershipFromSubscription,
  renewMembershipFromInvoice
} from './src/server/payments/membershipActivation';

// Initialize persistent product database via Supabase. The startup path awaits
// this promise so a schema/connection error cannot be hidden behind a healthy
// HTTP listener.
const serverInitialization = process.env.NODE_ENV === 'production' && !isSupabaseServerConfigured()
  ? Promise.resolve()
  : serverDb.initialize([]).then(() => {
      console.log('[ServerDB] Supabase store initialized successfully.');
    });

// Cette promesse est creee au chargement du module, donc avant que quiconque
// l'attende. Un rejet non observe a cet instant est un `unhandledRejection`,
// qui sur une plateforme serverless fait tomber l'invocation entiere
// (FUNCTION_INVOCATION_FAILED) sans laisser de message exploitable. Le rejet
// reste observable par `await serverInitialization` dans les deux chemins de
// demarrage ; ce gestionnaire empeche seulement le crash au niveau processus.
serverInitialization.catch(() => undefined);

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Production baseline: do not disclose Express, accept unbounded request
// bodies, or allow an abusive client to consume all API workers.
app.disable('x-powered-by');
// Trust forwarded client IPs only when the deployment explicitly sits behind
// a known reverse proxy. This prevents spoofed X-Forwarded-For values from
// bypassing the limiter on a directly exposed process.
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

app.use(securityHeaders);

app.use('/api', rateLimit('api', 300, 60_000));

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

        // CHANTIER 8.5 — une session d'abonnement ne porte aucune commande :
        // elle active KURLA+ puis sort du chemin commandes. L'activation exige
        // un paiement confirmé et un montant identique à celui annoncé.
        if (session.metadata?.kind === 'membership') {
          const activation = await activateMembershipFromCheckoutSession(session);
          if (activation.activated) {
            console.log(`[Stripe Webhook] Abonnement ${activation.planCode} activé pour ${activation.userId} jusqu'au ${activation.periodEnd}.`);
          } else {
            console.warn(`[Stripe Webhook] Abonnement non activé : ${activation.reason}`);
          }
          break;
        }

        // CHANTIER 12 (bloc D2) — facture de contrat marque. Même exigence que
        // pour l'abonnement : paiement confirmé et montant identique à celui
        // émis. Un écart ne marque rien et laisse une trace dans les journaux.
        if (session.metadata?.kind === 'brand_invoice') {
          try {
            const invoice = await serverDb.markBrandInvoicePaidFromSession({
              invoiceId: String(session.metadata.invoiceId || ''),
              amountTotalCents: typeof session.amount_total === 'number' ? session.amount_total : null,
              currency: session.currency,
              paymentStatus: session.payment_status,
              sessionId: session.id,
              paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null
            });
            console.log(`[Stripe Webhook] Facture ${invoice.invoiceNumber} réglée (${invoice.amountCents} centimes).`);
          } catch (error) {
            console.error('[Stripe Webhook] Facture marque non réglée :', error instanceof Error ? error.message : error);
          }
          break;
        }

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
      case 'invoice.paid': {
        // CHANTIER 8.5 — nouvelle période encaissée : l'abonnement est reconduit.
        // La première facture est ignorée, c'est le Checkout qui active.
        const invoice = event.data.object as Stripe.Invoice;
        const renewal = await renewMembershipFromInvoice({
          id: invoice.id,
          status: invoice.status,
          billing_reason: invoice.billing_reason,
          currency: invoice.currency,
          subscription: (invoice as any).subscription ?? null,
          lines: invoice.lines ? { data: invoice.lines.data?.map((line: any) => ({ period: line.period ?? null })) ?? [] } : null
        });
        if (renewal.renewed) {
          console.log(`[Stripe Webhook] Abonnement reconduit (${renewal.subscriptionId}) jusqu'au ${renewal.periodEnd}.`);
        } else {
          console.warn(`[Stripe Webhook] Renouvellement ignoré : ${renewal.reason}`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // CHANTIER 8.5 — résiliation notifiée par Stripe : l'accès s'arrête.
        const subscription = event.data.object as Stripe.Subscription;
        const result = await cancelMembershipFromSubscription({
          id: subscription.id,
          metadata: subscription.metadata as Record<string, string | undefined> | null
        });
        if (result.canceled) {
          console.log(`[Stripe Webhook] Abonnement résilié pour ${result.userId}.`);
        } else {
          console.warn(`[Stripe Webhook] Résiliation ignorée : ${result.reason}`);
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
    // CHANTIER 7.7 — un ingrédient interdit dans le pays de livraison rend la vente
    // illégale : ni le score de recommandation, ni le stock, ni le panier ne
    // peuvent l'autoriser. Sans graphe lisible, on refuse la vente plutôt que de
    // laisser passer un produit dont on ignore le statut.
    const destinationJurisdiction = jurisdictionForCountry(normalizedShippingAddress.country);
    let jurisdictionGraph: JurisdictionGraph | null = null;
    if (destinationJurisdiction) {
      let graphFailure: string | null = null;
      try {
        jurisdictionGraph = await loadJurisdictionGraph(destinationJurisdiction);
      } catch (error: any) {
        graphFailure = error?.message || 'erreur';
      }
      // Graphe illisible OU base inaccessible : dans les deux cas on refuse.
      // Laisser passer reviendrait à vendre un produit dont on ignore le statut.
      if (!jurisdictionGraph) {
        return res.status(503).json({
          error: `Contrôle réglementaire indisponible${graphFailure ? ` : ${graphFailure}` : ' : graphe d’ingrédients inaccessible'}. Le paiement n’a pas été lancé.`
        });
      }
    }

    const pricedItems: any[] = [];
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

      if (jurisdictionGraph) {
        const { compliance } = await assessProductComplianceForCountry(
          dbProduct,
          normalizedShippingAddress.country,
          jurisdictionGraph
        );
        if (!compliance.sellable) {
          const blocking = compliance.findings.filter(f => f.status === 'prohibited' || f.withinLimit === false);
          return res.status(400).json({
            error: `« ${dbProduct.name} » ne peut pas être vendu en ${normalizedShippingAddress.country} : ${blocking.map(f => f.ingredientId).join(', ') || 'formulation non conforme'}.`,
            code: 'COMPLIANCE_NOT_SELLABLE',
            jurisdiction: compliance.jurisdiction,
            findings: compliance.findings
          });
        }
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
      // Le sens du prix stocké (TTC ou hors taxe) décide de ce qui est facturable
      // à un particulier : un prix hors taxe ne peut pas être encaissé tel quel.
      const priceIncludesVat = variant && variant.price_includes_vat !== undefined
        ? variant.price_includes_vat !== false
        : dbProduct.priceIncludesVat !== false;
      const declaredVatRate = Number(
        (variant && variant.vat_rate != null ? variant.vat_rate : dbProduct.vatRate) ?? 20
      );

      pricedItems.push({
        productId: dbProduct.id,
        variantId: rawItem.variant_id || rawItem.variantId,
        quantity,
        unitAmountCents: toCents(dbPrice),
        unitPrice: dbPrice,
        name: dbProduct.name,
        image: dbProduct.image,
        slug: dbProduct.slug,
        priceIncludesVat,
        declaredVatRate
      });
    }

    const shippingCents = calculateShippingCents(
      pricedItems.reduce((sum, item) => sum + item.unitAmountCents * item.quantity, 0),
      normalizedShippingAddress.country,
      shippingMethod
    );

    // ── TVA (chantier 7.6) ──────────────────────────────────────────────────
    // Le taux dû est celui du pays de livraison, pas celui du vendeur : une
    // vente à un particulier allemand est taxée à 19 %, pas à 20 %.
    if (vatRateForCountry(normalizedShippingAddress.country) === null) {
      return res.status(400).json({
        error: `TVA indéterminée pour le pays « ${normalizedShippingAddress.country} ». Commande refusée.`
      });
    }

    // Auto-liquidation B2B : uniquement sur un numéro vérifié auprès de VIES.
    // Toute absence de vérification laisse la TVA normale s'appliquer.
    const submittedVatNumber = typeof req.body.vatNumber === 'string' ? req.body.vatNumber : undefined;
    const vatVerification = submittedVatNumber
      ? await verifyVatNumber({ country: normalizedShippingAddress.country, vatNumber: submittedVatNumber })
      : null;
    const reverseCharge = isReverseChargeEligible({
      country: normalizedShippingAddress.country,
      vatNumberVerified: vatVerification?.verified === true,
      customerVatNumber: vatVerification?.vatNumber ?? null
    });
    if (submittedVatNumber && !reverseCharge.eligible) {
      console.log(`[Stripe Checkout] Auto-liquidation écartée : ${reverseCharge.reason}`);
    }

    // Tarification et TVA : la même fonction est exercée par
    // `tests/chantier_7_vat.test.ts`, donc ce qui est facturé ici est du code
    // testé, pas une copie vérifiée à côté.
    const pricing = priceCheckoutWithVat({
      pricedItems,
      shippingCents,
      country: normalizedShippingAddress.country,
      reverseChargeEligible: reverseCharge.eligible,
      customerVatNumber: vatVerification?.vatNumber ?? null
    });
    const { vat, verifiedItems, itemsGrossCents, finalTotalCents, finalTotal } = pricing;

    console.log(
      `[Stripe Checkout] Pays ${vat.country} · taux ${vat.ratePercent}% · articles ${fromCents(itemsGrossCents).toFixed(2)} EUR · ` +
      `port ${fromCents(shippingCents).toFixed(2)} EUR · net ${fromCents(vat.totalNetCents).toFixed(2)} EUR · ` +
      `TVA ${fromCents(vat.totalVatCents).toFixed(2)} EUR · total ${finalTotal.toFixed(2)} EUR` +
      `${vat.reverseCharge ? ' · auto-liquidation' : ''}`
    );

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
      // Devise et TVA : la commande porte de quoi reconstituer la facture, sans
      // dépendre d'un recalcul ultérieur des taux (qui peuvent changer).
      currency: 'EUR',
      vatCountry: vat.country,
      netAmount: fromCents(vat.totalNetCents),
      vatAmount: fromCents(vat.totalVatCents),
      vatBreakdown: vat.breakdown,
      customerVatNumber: vat.customerVatNumber || undefined,
      shippingAddress: {
        ...normalizedShippingAddress,
        shippingMethod,
        shippingCost: fromCents(shippingCents),
        subtotal: fromCents(itemsGrossCents),
        // Instantané complet : taux, date de relevé, ventilation, port et, le cas
        // échéant, numéro de TVA vérifié. C'est la preuve de ce qui a été appliqué.
        vat: {
          ...vat,
          shippingAmountCents: shippingCents,
          reverseChargeReason: reverseCharge.reason,
          vatCheckedAt: vatVerification?.checkedAt ?? null,
          vatRequestIdentifier: vatVerification?.requestIdentifier ?? null,
          traderName: vatVerification?.traderName ?? null
        }
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
        // Montant réellement encaissé, en centimes : identique au prix catalogue
        // pour un prix TTC, réduit au net sous auto-liquidation vérifiée.
        unit_amount: item.unitCents,
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
    const persistedOrder = await serverDb.saveOrder(newOrder);
    persistedOrderId = orderId;
    await serverDb.notifyPaymentPending(persistedOrder);

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

/**
 * Vérification publique d'une fiche produit.
 *
 * Tension assumée et documentée : le code porte la règle « les décisions de
 * gouvernance ne sont jamais renvoyées comme métadonnées client ». Cette route
 * la respecte — elle ne publie ni statut brut, ni note interne, ni URL de
 * preuve, ni identifiant de validateur. Elle ne publie qu'un fait binaire par
 * contrôle : cette vérification a-t-elle abouti, oui ou non. C'est l'information
 * qui intéresse l'acheteur ; le reste reste côté admin.
 */
const PUBLIC_VERIFICATION_CHECKS: { id: string; label: string; decisive: boolean; column: string }[] = [
  { id: 'ingredients', label: 'Composition vérifiée', decisive: true, column: 'ingredient_verification_status' },
  { id: 'claims', label: 'Allégations contrôlées', decisive: true, column: 'claims_validation_status' },
  { id: 'certifications', label: 'Certifications vérifiées', decisive: false, column: 'certifications_validation_status' },
  { id: 'images', label: 'Visuels conformes', decisive: false, column: 'images_validation_status' },
  { id: 'brand', label: 'Marque vérifiée', decisive: false, column: 'brand_verification_status' },
  { id: 'translations', label: 'Traductions relues', decisive: false, column: 'translations_validation_status' },
  { id: 'stock', label: 'Disponibilité confirmée', decisive: false, column: 'stock_validation_status' }
];

/** Lit un statut de contrôle sur une fiche, quel que soit le format du store. */
function readCheckStatus(product: any, column: string): string {
  const camel = column.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
  return String(product?.[camel] ?? product?.[column] ?? '');
}

app.get('/api/products/:productId/verification', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const product = (await serverDb.getProducts({ publishedOnly: true }))
    .find(item => item.id === req.params.productId || item.slug === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Produit non disponible.' });

  // Source de vérité : les colonnes de statut de la fiche, celles-là mêmes que
  // `isPublishableProduct` exige. Les événements d'audit ne servent qu'à dater
  // la dernière vérification — sinon une fiche publiée avant l'existence de la
  // table d'audit afficherait « non vérifiée » alors qu'elle est publiée.
  const checks = PUBLIC_VERIFICATION_CHECKS.map(check => ({
    id: check.id,
    label: check.label,
    passed: readCheckStatus(product, check.column) === 'verified'
  }));

  const events = await serverDb.getCatalogValidationEvents(product.id);

  // « Vérifié » n'est jamais un compteur : il exige les deux contrôles
  // décisifs. Un produit sans contrôle n'est pas « 0/7 », il n'est pas vérifié.
  const verified = checks.filter(check => check.passed && PUBLIC_VERIFICATION_CHECKS.find(item => item.id === check.id)?.decisive).length
    === PUBLIC_VERIFICATION_CHECKS.filter(item => item.decisive).length;

  const verifiedAt = events.length
    ? events.reduce((latest: string, event: any) => {
        const at = String(event.created_at ?? event.createdAt ?? '');
        return at > latest ? at : latest;
      }, '')
    : null;

  res.json({
    productId: product.id,
    verified,
    verifiedAt: verifiedAt || null,
    checks,
    note: verified
      ? 'Contrôles décisifs aboutis. Les preuves détaillées restent internes.'
      : 'Cette fiche n’a pas encore passé tous les contrôles décisifs. L’absence de validation n’est pas un jugement sur le produit.'
  });
}));

/**
 * Partages de dossier reçus par le professionnel.
 * Sans cette liste, l'accès au dossier existe côté API mais le professionnel ne
 * peut pas savoir qui a consenti à partager quoi avec lui.
 */
app.get('/api/professional/dossier-shares', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const profiles = await professionalStore.getPublicProfessionals();
  const own = profiles.find(profile => profile.userId === user.id);
  if (!own) {
    res.status(403).json({ error: 'Aucun profil professionnel vérifié n’est associé à ce compte.' });
    return;
  }
  const shares = await professionalStore.getActiveShares(own.id);
  res.json({
    professionalId: own.id,
    shares,
    count: shares.length,
    note: 'Seuls les partages actifs apparaissent. Un partage révoqué ou expiré disparaît de cette liste sans effacer la trace du consentement.'
  });
}));

/**
 * Tableau de bord du professionnel connecté.
 *
 * Une seule route agrège le profil, le Trust Score, les prestations, les
 * rendez-vous et les partages de dossier. Rien n'est inventé : si un compte n'a
 * pas de profil professionnel vérifié, la route répond 403 et l'écran le dit,
 * au lieu d'afficher des statistiques de démonstration.
 */
app.get('/api/professional/me', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const profiles = await professionalStore.getPublicProfessionals();
  const own = profiles.find(profile => profile.userId === user.id);
  if (!own) {
    res.status(403).json({ error: 'Aucun profil professionnel vérifié n’est associé à ce compte.' });
    return;
  }
  const [trust, services, appointments, shares] = await Promise.all([
    professionalStore.assessTrust(own.id),
    professionalStore.getServices(own.id),
    professionalStore.getAppointments({ professionalId: own.id }),
    professionalStore.getActiveShares(own.id)
  ]);

  const upcoming = appointments.filter(appointment =>
    appointment.status !== 'cancelled_by_client'
    && appointment.status !== 'cancelled_by_pro'
    && new Date(appointment.scheduledAt).getTime() >= Date.now()
  );

  res.json({
    profile: own,
    trust,
    bookable: professionalStore.canBeBooked(trust),
    services,
    appointments,
    upcomingCount: upcoming.length,
    shares,
    activeShareCount: shares.length
  });
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
  try {
    await serverDb.updateCatalogStatus(req.params.productId, req.body?.status);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Changement de statut impossible.';
    // Un refus de publication n'est pas une erreur serveur : on rend les
    // exigences manquantes pour que l'administration sache quoi produire.
    if (message.startsWith('Publication refusée')) {
      const readiness = await serverDb.getCatalogPublicationReadiness(req.params.productId).catch(() => null);
      return res.status(422).json({ error: message, ready: false, missing: readiness?.missing ?? [] });
    }
    return res.status(400).json({ error: message });
  }
}));

// ============================================================
// MODULES DE ROUTES PAR DOMAINE (chantier 8.1)
// ============================================================
// Chaque module reçoit la même application Express : aucun préfixe n'est ajouté,
// les chemins sont donc identiques à ceux d'avant le découpage. L'ordre de
// montage est conservé, et `tests/route_inventory.test.ts` vérifie que les 163
// routes sont toujours là, sans doublon.
registerFamilyRoutes(app);
registerIntelligenceRoutes(app);
registerChantierARoutes(app);
registerProfessionalRoutes(app);
registerRecommendationRoutes(app);
registerCatalogGovernanceRoutes(app);
registerSupplierRoutes(app);
registerSourcingRoutes(app);
registerProspectRoutes(app);
registerRetentionNudgeRoutes(app);
registerOperationsCockpitRoutes(app);
registerBatchRoutes(app);
registerAiAssistantRoutes(app);
registerAdaptiveRoutineRoutes(app);
registerBeautyProfileRoutes(app);
registerLoyaltyRoutes(app);
registerBeautyJourneyRoutes(app);
registerMembershipRoutes(app);
registerPublicApiRoutes(app);
registerCreatorRoutes(app);
registerBrandTestRoutes(app);
registerMobileRoutes(app);
registerPrivacyRoutes(app);
registerEditorialComplianceRoutes(app);
registerIngredientGraphRoutes(app);
registerIngredientNavRoutes(app);
registerStrategyRoutes(app);
registerCommunityRoutes(app);
registerBrandContractRoutes(app);

// ============================================================
// PHASE 5 REST API ENDPOINTS
// ============================================================

// Phase 5 private APIs: every identity comes from a verified Supabase token.
// Never use x-user-id, x-user-email or x-admin-key here: all three are client
// controlled and therefore unsuitable for authorization.
async function getOwnedTicket(ticketId: string, user: AuthenticatedUser): Promise<any | undefined> {
  const tickets = SUPPORT_ROLES.includes(user.role)
    ? await serverDb.getAllSupportTickets()
    : await serverDb.getSupportTicketsByUser(user.id);
  return tickets.find(ticket => ticket.id === ticketId);
}

// KURLA Pro applications may be submitted by guests. If a valid Supabase
// session is present, it is attached for follow-up; the form fields remain
// authoritative for the application contact details.
/**
 * Annuaire public des professionnels vérifiés.
 *
 * Remplace `MOCK_PROS`, qui affichait en production de faux noms, de faux
 * avatars, de fausses notes et de fausses adresses réelles marqués
 * `verified: true`. Un annuaire vide est un état légitime : la page l'affiche
 * comme tel au lieu d'inventer des personnes.
 */
app.get('/api/professionals', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
  const directory = await serverDb.getPublicProfessionalDirectory();
  res.json({
    professionals: directory,
    total: directory.length,
    note: directory.length === 0
      ? 'Aucun professionnel vérifié n’a encore été approuvé. KURLA n’affiche que des profils contrôlés.'
      : undefined
  });
}));

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

app.get('/api/shipments/:orderId/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const order = await getOwnedOrder(req.params.orderId, user);
  if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
  res.json({ history: await serverDb.getShipmentHistory(order.id) });
}));

// Delivery address book. An address is always owned by the authenticated
// customer; checkout snapshots remain independent from later edits here.
app.get('/api/shipping/addresses', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  res.json({ addresses: await serverDb.getShippingAddresses(user.id) });
}));

app.post('/api/shipping/addresses', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    const address = await serverDb.saveShippingAddress(
      user.id,
      req.body?.address || req.body,
      typeof req.body?.id === 'string' ? req.body.id : undefined,
      req.body?.isDefault === true
    );
    res.status(201).json({ address });
  } catch (error) {
    res.status(400).json({ error: safeApiError(error, 'Adresse de livraison invalide.') });
  }
}));

app.delete('/api/shipping/addresses/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const deleted = await serverDb.deleteShippingAddress(user.id, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Adresse de livraison introuvable.' });
  res.json({ success: true });
}));

app.get('/api/shipping/rates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const country = typeof req.query.country === 'string' ? req.query.country.trim().toUpperCase() : undefined;
  if (country && !/^[A-Z]{2}$/.test(country)) return res.status(400).json({ error: 'Pays de livraison invalide.' });
  res.json({ rates: await serverDb.getShippingRates(country) });
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

app.get('/api/returns/:id/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const returns = ADMIN_ROLES.includes(user.role) ? await serverDb.getAllReturns() : await serverDb.getReturnsByUser(user.id);
  const returnRequest = returns.find(item => item.id === req.params.id);
  if (!returnRequest) return res.status(404).json({ error: 'Demande de retour introuvable.' });
  res.json({ history: await serverDb.getReturnHistory(returnRequest.id) });
}));

app.post('/api/admin/returns/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { status, adminComment } = req.body || {};
  const allowedStatuses = ['requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled'];
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut de retour invalide.' });
  }
  if (status === 'refunded') {
    return res.status(400).json({ error: 'Utilisez le flux de remboursement idempotent pour finaliser un retour.' });
  }

  try {
    const ret = await serverDb.updateReturnStatus(req.params.id, status as any, typeof adminComment === 'string' ? adminComment.trim() : undefined, admin.id, admin.role === 'support' ? 'support' : 'admin');
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

  const tickets = SUPPORT_ROLES.includes(user.role)
    ? await serverDb.getAllSupportTickets()
    : await serverDb.getSupportTicketsByUser(user.id);
  res.json({ tickets });
}));

app.post('/api/support/tickets', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const { orderId, category, subject, message, priority } = req.body || {};
  if (typeof category !== 'string' || typeof subject !== 'string' || typeof message !== 'string' || !category.trim() || !subject.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Paramètres manquants.' });
  }

  if (orderId !== undefined) {
    if (typeof orderId !== 'string') return res.status(400).json({ error: 'Commande invalide.' });
    const order = await getOwnedOrder(orderId, user);
    if (!order || order.userId !== user.id) return res.status(404).json({ error: 'Commande introuvable.' });
  }

  const allowedPriorities = ['low', 'normal', 'high', 'urgent'];
  if (priority !== undefined && (typeof priority !== 'string' || !allowedPriorities.includes(priority))) {
    return res.status(400).json({ error: 'Priorité de ticket invalide.' });
  }
  const ticket = await serverDb.createSupportTicket(
    user.id,
    typeof orderId === 'string' ? orderId : undefined,
    category as any,
    subject.trim(),
    message.trim(),
    (priority || 'normal') as any
  );
  res.json({ ticket });
}));

app.get('/api/support/tickets/:id/messages', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const ticket = await getOwnedTicket(req.params.id, user);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });

  const [messages, events, attachments] = await Promise.all([
    serverDb.getSupportMessages(ticket.id),
    serverDb.getSupportTicketEvents(ticket.id),
    serverDb.getSupportAttachments(ticket.id)
  ]);
  res.json({ messages, events, attachments });
}));

app.post('/api/support/tickets/:id/messages', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const ticket = await getOwnedTicket(req.params.id, user);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });

  const message = req.body?.message;
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message vide.' });
  const senderRole: 'customer' | 'admin' | 'agent' = ADMIN_ROLES.includes(user.role)
    ? 'admin'
    : user.role === 'support' ? 'agent' : 'customer';
  const msg = await serverDb.addSupportMessage(ticket.id, user.id, senderRole, message.trim());
  res.json({ message: msg });
}));

app.post('/api/admin/support/tickets/:id/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireSupport(req, res);
  if (!admin) return;
  const { status } = req.body || {};
  const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Statut de ticket invalide.' });
  }

  const ticket = await getOwnedTicket(req.params.id, admin);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
  await serverDb.updateSupportTicketStatus(ticket.id, status as any, admin.id);
  await serverDb.recordAdminAudit(admin.id, 'support_ticket_status_update', { ticketId: ticket.id, status });
  res.json({ success: true });
}));

app.post('/api/admin/support/tickets/:id/priority', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const agent = await requireSupport(req, res);
  if (!agent) return;
  const priority = req.body?.priority;
  if (typeof priority !== 'string' || !['low', 'normal', 'high', 'urgent'].includes(priority)) {
    return res.status(400).json({ error: 'Priorité de ticket invalide.' });
  }
  const ticket = await getOwnedTicket(req.params.id, agent);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
  const updated = await serverDb.updateSupportTicketPriority(ticket.id, priority as any, agent.id);
  await serverDb.recordAdminAudit(agent.id, 'support_ticket_priority_update', { ticketId: ticket.id, priority });
  res.json({ ticket: updated });
}));

app.post('/api/admin/support/tickets/:id/assignment', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const agent = await requireSupport(req, res);
  if (!agent) return;
  const assignedAgentId = req.body?.assignedAgentId;
  if (assignedAgentId !== undefined && assignedAgentId !== null && typeof assignedAgentId !== 'string') {
    return res.status(400).json({ error: 'Agent support invalide.' });
  }
  if (typeof assignedAgentId === 'string' && assignedAgentId && !(await serverDb.isSupportAgent(assignedAgentId))) {
    return res.status(400).json({ error: 'Cet utilisateur ne peut pas recevoir de ticket support.' });
  }
  const ticket = await getOwnedTicket(req.params.id, agent);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
  const updated = await serverDb.assignSupportTicket(ticket.id, assignedAgentId || undefined, agent.id);
  await serverDb.recordAdminAudit(agent.id, 'support_ticket_assignment_update', { ticketId: ticket.id, assignedAgentId: assignedAgentId || null });
  res.json({ ticket: updated });
}));

app.post('/api/support/tickets/:id/attachments', express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  limit: '5mb'
}), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const ticket = await getOwnedTicket(req.params.id, user);
  if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
  const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(contentType)) return res.status(400).json({ error: 'Format de pièce jointe non pris en charge.' });
  const rawBody = req.body as Buffer | Uint8Array;
  if (!rawBody || typeof rawBody.byteLength !== 'number' || rawBody.byteLength === 0 || rawBody.byteLength > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'Pièce jointe vide ou trop volumineuse (5 Mo maximum).' });
  }
  const bytes = Buffer.from(rawBody);
  const isJpeg = contentType === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isPng = contentType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = contentType === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  const isPdf = contentType === 'application/pdf' && bytes.subarray(0, 5).toString() === '%PDF-';
  if (!isJpeg && !isPng && !isWebp && !isPdf) return res.status(400).json({ error: 'Le contenu ne correspond pas au format déclaré.' });
  const headerName = req.headers['x-file-name'];
  const queryName = typeof req.query.fileName === 'string' ? req.query.fileName : '';
  const fileName = typeof headerName === 'string' ? headerName : queryName || `piece-jointe.${contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1]}`;
  try {
    const attachment = await serverDb.addSupportAttachment(ticket.id, user.id, bytes, contentType as any, fileName, typeof req.query.messageId === 'string' ? req.query.messageId : undefined);
    res.status(201).json({ attachment });
  } catch (error) {
    res.status(400).json({ error: safeApiError(error, 'Impossible d’enregistrer la pièce jointe.') });
  }
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
  const allowedEntities = ['brand', 'category', 'article', 'content', 'ai_source', 'coupon'];
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
  const allowedEntities = ['brand', 'category', 'article', 'content', 'ai_source', 'coupon'];
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

app.get('/api/admin/shipments/:orderId/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const order = await serverDb.getOrderById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
  res.json({ history: await serverDb.getShipmentHistory(order.id) });
}));

app.get('/api/admin/shipping/rates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const country = typeof req.query.country === 'string' ? req.query.country.trim().toUpperCase() : undefined;
  if (country && !/^[A-Z]{2}$/.test(country)) return res.status(400).json({ error: 'Pays de livraison invalide.' });
  res.json({ rates: await serverDb.getShippingRates(country, true) });
}));

app.post('/api/admin/shipping/rates', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const rate = await serverDb.saveShippingRate(admin.id, req.body || {});
    await serverDb.recordAdminAudit(admin.id, 'admin_shipping_rate_upsert', { rateId: rate.id, country: rate.country, method: rate.method });
    res.status(201).json({ rate });
  } catch (error) {
    res.status(400).json({ error: safeApiError(error, 'Impossible d’enregistrer le tarif de livraison.') });
  }
}));

app.patch('/api/admin/shipping/rates/:id', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const rate = await serverDb.saveShippingRate(admin.id, { ...(req.body || {}), id: req.params.id });
    await serverDb.recordAdminAudit(admin.id, 'admin_shipping_rate_upsert', { rateId: rate.id, country: rate.country, method: rate.method });
    res.json({ rate });
  } catch (error) {
    res.status(400).json({ error: safeApiError(error, 'Impossible de modifier le tarif de livraison.') });
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
  const currentShipment = await serverDb.getShipmentByOrderId(order.id);
  const trackingNumber = typeof req.body?.trackingNumber === 'string' ? req.body.trackingNumber.trim().slice(0, 160) || undefined : currentShipment?.trackingNumber;
  const trackingUrl = typeof req.body?.trackingUrl === 'string' ? req.body.trackingUrl.trim().slice(0, 2000) || undefined : currentShipment?.trackingUrl;
  const rawAddress = req.body?.address || order.shippingAddress;
  let deliveryAddress: any = undefined;
  if (rawAddress && typeof rawAddress === 'object' && typeof rawAddress.fullName === 'string' && typeof rawAddress.street === 'string' && typeof rawAddress.city === 'string' && typeof rawAddress.postalCode === 'string' && typeof rawAddress.country === 'string') {
    deliveryAddress = {
      fullName: rawAddress.fullName.trim().slice(0, 160),
      street: rawAddress.street.trim().slice(0, 240),
      city: rawAddress.city.trim().slice(0, 120),
      postalCode: rawAddress.postalCode.trim().slice(0, 32),
      country: rawAddress.country.trim().toUpperCase().slice(0, 2),
      phone: typeof rawAddress.phone === 'string' ? rawAddress.phone.trim().slice(0, 40) || undefined : undefined
    };
  }
  const orderShippingCost = Number(order.shippingAddress?.shippingCost);
  const price = Number.isFinite(Number(req.body?.price)) ? Number(req.body.price) : currentShipment?.price ?? (Number.isFinite(orderShippingCost) ? orderShippingCost : 0);
  const shipment = await serverDb.upsertShipment({
    id: typeof req.body?.id === 'string' ? req.body.id : currentShipment?.id || randomUUID(),
    orderId: order.id,
    userId: order.userId,
    carrier: carrier as any,
    method: typeof req.body?.method === 'string' ? req.body.method.trim().slice(0, 80) : currentShipment?.method || order.shippingAddress?.shippingMethod || 'standard',
    price,
    tariff: Number.isFinite(Number(req.body?.tariff)) ? Number(req.body.tariff) : price,
    address: deliveryAddress || currentShipment?.address,
    country: typeof req.body?.country === 'string' ? req.body.country.trim().toUpperCase().slice(0, 2) : currentShipment?.country || deliveryAddress?.country,
    trackingNumber,
    trackingUrl,
    status: status as any,
    eventLocation: typeof req.body?.eventLocation === 'string' ? req.body.eventLocation.trim().slice(0, 160) : undefined,
    eventDescription: typeof req.body?.eventDescription === 'string' ? req.body.eventDescription.trim().slice(0, 1000) : undefined,
    shippedAt: typeof req.body?.shippedAt === 'string' ? req.body.shippedAt : undefined,
    estimatedDelivery: typeof req.body?.estimatedDelivery === 'string' ? req.body.estimatedDelivery : undefined,
    deliveredAt: typeof req.body?.deliveredAt === 'string' ? req.body.deliveredAt : undefined,
    createdAt: currentShipment?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const shipmentToOrderStatus: Record<string, 'processing' | 'packed' | 'shipped' | 'delivered'> = {
    preparing: 'processing',
    label_created: 'packed',
    shipped: 'shipped',
    in_transit: 'shipped',
    out_for_delivery: 'shipped',
    delivered: 'delivered'
  };
  const orderStatus = shipmentToOrderStatus[status];
  let resultingOrderStatus = order.status;
  if (orderStatus && order.status !== orderStatus && serverDb.isTransitionAllowed(order.status, orderStatus)) {
    const updatedOrder = await serverDb.updateOrderStatus(order.id, orderStatus, {
      changedBy: admin.id,
      changedByRole: admin.role,
      reason: `Mise à jour expédition : ${status}`,
      emailData: { carrier, trackingNumber, trackingUrl }
    });
    resultingOrderStatus = updatedOrder?.status || orderStatus;
  }
  await serverDb.recordAdminAudit(admin.id, 'admin_shipment_update', { orderId: order.id, status, carrier });
  res.json({ shipment, orderStatus: resultingOrderStatus });
}));

app.get('/api/admin/notification-logs', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const limit = Number(req.query.limit || 100);
  const logs = await serverDb.getNotificationDeliveryLogs(undefined, Number.isFinite(limit) ? limit : 100);
  res.json({ logs });
}));

app.post('/api/admin/notifications', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { userId, title, message, type, link, orderId } = req.body || {};
  const allowedTypes = [
    'account_created', 'email_confirmation_pending', 'payment_pending', 'payment_confirmed', 'payment_failed',
    'order_created', 'order_processing', 'order_packed', 'order_shipped', 'order_delivered', 'order_cancelled', 'order_returned',
    'refund_created', 'order_refunded', 'order_partially_refunded', 'return_requested', 'support_reply', 'low_stock', 'routine_reminder'
  ];
  if (typeof userId !== 'string' || typeof title !== 'string' || typeof message !== 'string' || !title.trim() || !message.trim() || !allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Destinataire, type, titre et message sont obligatoires.' });
  }
  const { notification } = await serverDb.notifyUser(
    userId,
    type,
    title.trim().slice(0, 240),
    message.trim().slice(0, 4000),
    typeof link === 'string' ? link.trim().slice(0, 1000) : undefined,
    typeof orderId === 'string' ? orderId : undefined,
    undefined,
    `admin-notification:${admin.id}:${Date.now()}`
  );
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

// Toute route /api non reconnue doit répondre en JSON. Sans ce garde, le repli
// SPA (`app.get('*')` monté par startServer) renvoie index.html avec un statut
// 200 : un client appelant une route supprimée croirait à un succès, et une API
// absente du domaine serait indiscernable d'une erreur métier.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  /**
   * CHANTIER 13 — une navigation ne reçoit pas du JSON.
   *
   * Sur Vercel, `vercel.json` réécrit tout chemin qui n'est pas un fichier vers
   * la fonction : la requête arrive donc sous `/api/<chemin>`. Sans cette
   * distinction, `/produit/inexistant` recevait le 404 JSON de l'API au lieu
   * d'une page 404 — vérifié en production après le premier déploiement.
   *
   * La règle est celle de l'en-tête `Accept` : un navigateur qui navigue annonce
   * `text/html`, un `fetch` de l'application non. Un chemin d'API inconnu appelé
   * en JSON garde sa réponse JSON ; le même chemin ouvert dans un navigateur
   * affiche la page 404, avec le même statut.
   */
  const acceptsHtml = String(req.headers.accept || '').includes('text/html');
  if (acceptsHtml) {
    renderSpaDocument(req.path === '/' ? '/' : req.path, path.join(process.cwd(), 'dist'))
      .then(rendered => {
        res.status(rendered.status).type('html').send(rendered.html);
      })
      .catch(next);
    return;
  }
  res.status(404).json({
    error: `Route API inconnue : ${req.method} /api${req.path === '/' ? '' : req.path}.`,
    code: 'API_ROUTE_NOT_FOUND'
  });
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
      'Le serveur ne démarre pas en production sans stockage ni fournisseur email configuré.'
    );
  }

  // Stripe n'est pas une exigence de démarrage : sans clé, le catalogue, les
  // comptes, les avis, l'archétype et les réservations restent fonctionnels, et
  // chaque route de paiement répond déjà 503 explicitement (elle ne simule
  // jamais un succès). Bloquer tout le serveur ici rendrait l'application
  // entière indisponible pour une capacité que l'on peut activer plus tard.
  warnIfPaymentUnavailable();
}

/** Capacité de paiement réellement utilisable : clé présente ET webhook
 *  cohérent. Exposé pour que l'état soit lisible sans deviner. */
export function isPaymentConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isPaymentWebhookConfigured(): boolean {
  return process.env.STRIPE_WEBHOOK_ENABLED === 'true' && Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

function warnIfPaymentUnavailable(): void {
  const pending: string[] = [];
  if (!isPaymentConfigured()) pending.push('STRIPE_SECRET_KEY');
  if (!isPaymentWebhookConfigured()) pending.push('STRIPE_WEBHOOK_ENABLED=true + STRIPE_WEBHOOK_SECRET');
  if (pending.length === 0) return;
  console.warn(
    `[KURLA Startup] Paiement indisponible : ${pending.join(', ')} non configuré. ` +
    'Le serveur démarre quand même ; les routes de paiement répondront 503 et aucun ' +
    'paiement ne sera simulé comme réussi.'
  );
}

async function startServer() {
  assertProductionConfiguration();
  await serverInitialization;

  if (process.env.NODE_ENV !== 'production') {
    // The specifier is kept in a variable on purpose: bundlers must not be able
    // to resolve it statically, otherwise a serverless build would trace and
    // embed the whole Vite toolchain even though this branch never runs there.
    const viteSpecifier = 'vite';
    const { createServer: createViteServer } = await import(viteSpecifier);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // CHANTIER 13 — la coquille n'est plus servie aveuglément : 404 franc sur un
    // chemin inconnu, canonique propre sur une fiche produit ou ingrédient.
    mountSpaFallback(app, distPath);
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

// ---------------------------------------------------------------------------
// Serverless runtime (Vercel and compatible platforms)
// ---------------------------------------------------------------------------
//
// A serverless function has no `listen()` and no place to await startup: the
// first request can arrive before the store is ready. `prepareServerlessRuntime`
// performs the exact same two steps as `startServer()` (production
// configuration assertion, then store initialization) and is awaited by the
// platform entry point in `api/index.ts` before the Express app is called.
//
// A startup failure is never swallowed here. It is returned as data so the
// entry point can answer 503 with the missing variables named explicitly,
// instead of letting every route fail with an opaque error.
let serverlessStartup: Promise<{ ready: boolean; error: string | null }> | null = null;

export function prepareServerlessRuntime(): Promise<{ ready: boolean; error: string | null }> {
  if (!serverlessStartup) {
    serverlessStartup = (async () => {
      try {
        assertProductionConfiguration();
        await serverInitialization;
        return { ready: true, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[KURLA Serverless] Démarrage impossible:', message);
        return { ready: false, error: message };
      }
    })();
  }
  return serverlessStartup;
}

// True when the module is loaded by a serverless platform: the platform owns
// the HTTP listener, TLS termination and static file serving, so this process
// must expose the app without binding a port.
export function isServerlessRuntime(): boolean {
  return process.env.VERCEL === '1' || process.env.KURLA_SERVERLESS === 'true';
}

/**
 * CHANTIER 13 — le repli SPA doit exister dans les deux modes d'exécution.
 *
 * Il était monté dans `startServer()`, que le mode serverless n'appelle jamais :
 * sur Vercel, aucune route HTML n'atteignait donc le serveur, et `vercel.json`
 * servait `index.html` avec un statut 200 pour n'importe quel chemin. Le montage
 * n'est pas fait au niveau module sans condition : en développement, il
 * précéderait les middlewares Vite et avalerait toutes les requêtes.
 */
if (isServerlessRuntime()) {
  mountSpaFallback(app);
}

// Export the Express app for HTTP authorization tests without starting a
// second listener. Production/dev execution still starts normally.
export { app };

if (!isServerlessRuntime() && process.env.KURLA_TEST_NO_SERVER !== 'true') {
  startServer().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

