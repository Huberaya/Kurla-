import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT_ASSISTANT_BEAUTE } from './src/lib/ai/systemPrompt';
import { serverDb, ServerOrder } from './src/lib/serverDb';
import { MOCK_PRODUCTS } from './src/data/mockData';

dotenv.config();

// Initialize persistent product database via Supabase
serverDb.initialize(MOCK_PRODUCTS).then(() => {
  console.log('[ServerDB] Supabase store initialized successfully.');
});

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Lazy Stripe Initialization
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' as any });
}

// Stripe Webhook Endpoint (Raw Body Handling Before express.json)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
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

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);

    // Persistent Idempotency Check in Supabase
    if (await serverDb.isEventProcessed(event.id)) {
      console.log(`[Stripe Webhook] Événement déjà traité (Idempotent): ${event.id}`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    let processedOrderId: string | undefined;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const order = await serverDb.findOrder({ stripeSessionId: session.id, orderId });
        if (order) {
          const expectedCents = Math.round(order.total * 100);
          if (session.amount_total !== null && session.amount_total !== expectedCents) {
            console.warn(`[Stripe Webhook Warning] Montant incohérent pour commande ${order.id}: attendu ${expectedCents}, reçu ${session.amount_total}`);
          }
          if (session.currency && session.currency.toLowerCase() !== 'eur') {
            console.warn(`[Stripe Webhook Warning] Devise incohérente pour commande ${order.id}: attendue eur, reçue ${session.currency}`);
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
          const expectedCents = Math.round(order.total * 100);
          if (session.amount_total !== null && session.amount_total !== expectedCents) {
            console.warn(`[Stripe Webhook Warning] Montant incohérent pour commande ${order.id}`);
          }
          await serverDb.updateOrderStatus(order.id, 'paid');
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
          const expectedCents = Math.round(order.total * 100);
          if (paymentIntent.amount !== expectedCents) {
            console.warn(`[Stripe Webhook Warning] Montant incohérent pour PaymentIntent ${paymentIntent.id}: attendu ${expectedCents}, reçu ${paymentIntent.amount}`);
          }
          if (paymentIntent.currency && paymentIntent.currency.toLowerCase() !== 'eur') {
            console.warn(`[Stripe Webhook Warning] Devise incohérente pour PaymentIntent ${paymentIntent.id}: attendue eur, reçue ${paymentIntent.currency}`);
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
          await serverDb.updateOrderStatus(order.id, 'refunded');
          processedOrderId = order.id;
          console.log(`[Stripe Webhook] Commande ${order.id} marquée comme remboursée.`);
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Événement ignoré: ${event.type}`);
    }

    await serverDb.markEventProcessed(event.id, event.type, { processedOrderId });

    res.status(200).json({ received: true, processed: true });
  } catch (err: any) {
    console.error('[Stripe Webhook Error]', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json());

// Cart API Endpoints (public.carts & public.cart_items)
app.get('/api/cart', async (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || null;
    const anonymousId = (req.headers['x-anonymous-id'] as string) || null;
    const items = await serverDb.getCart(userId, anonymousId);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la récupération du panier' });
  }
});

app.post('/api/cart', async (req: Request, res: Response) => {
  try {
    const { items, userId, anonymousId } = req.body;
    const uid = userId || (req.headers['x-user-id'] as string) || null;
    const anonId = anonymousId || (req.headers['x-anonymous-id'] as string) || null;

    const cartId = await serverDb.saveCart(uid, anonId, items || []);
    res.json({ success: true, cartId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erreur lors de la sauvegarde du panier' });
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
app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
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

    const email = req.body.customerEmail || 'client@kurla-beauty.com';
    const uid = req.body.userId || (req.headers['x-user-id'] as string) || undefined;
    const stripe = getStripeClient();
    const appUrl = getAppUrl(req);
    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    // Verify product pricing & stock authoritatively against backend catalog (Database)
    const verifiedItems: any[] = [];
    let calculatedTotal = 0;

    for (const rawItem of items) {
      const pId = rawItem.product_id || rawItem.productId || rawItem.product?.id || rawItem.id;
      const quantity = Math.max(1, Number(rawItem.quantity) || 1);

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
      if (quantity > availableStock) {
        console.error(`[Stripe Checkout Error] Stock insuffisant pour ${dbProduct.name} (${quantity}/${availableStock})`);
        return res.status(400).json({
          error: `Stock insuffisant pour "${dbProduct.name}". Quantité demandée : ${quantity}, Stock disponible : ${availableStock}.`
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!stripe) {
      console.error('[Stripe Checkout Error] Stripe client non configuré (STRIPE_SECRET_KEY manquant)');
      return res.status(400).json({
        error: 'Paiement Stripe non configuré sur le serveur. La clé STRIPE_SECRET_KEY est manquante.'
      });
    }

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      metadata: { orderId, userId: uid || '' },
      payment_intent_data: {
        metadata: { orderId, userId: uid || '' }
      },
      success_url: `${appUrl}/account?order_success=true&session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${appUrl}/boutique?canceled=true`,
    });

    console.log(`[Stripe Checkout] Session créée avec succès ID: ${session.id}, URL présente: ${!!session.url}`);

    newOrder.stripeSessionId = session.id;
    await serverDb.saveOrder(newOrder);

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('[Stripe Checkout Error]', error?.message || error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la création de la session de paiement' });
  }
});

// Authenticated Orders API Endpoint
app.get('/api/orders', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const userEmail = req.headers['x-user-email'] as string;
  const userIdHeader = req.headers['x-user-id'] as string;
  const adminKey = req.headers['x-admin-key'] as string;

  // Admin access
  if (adminKey === 'kurla2026' || authHeader === 'Bearer kurla_admin_secret') {
    const orders = await serverDb.getOrdersByCustomer('', '');
    return res.json({ orders });
  }

  let email = userEmail || '';
  let userId = userIdHeader || '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token.includes('@')) email = token;
    else if (token.length > 5) userId = token;
  }

  if (!email && !userId) {
    return res.status(401).json({ error: 'Authentification requise pour consulter les commandes.' });
  }

  const orders = await serverDb.getOrdersByCustomer(email, userId);
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
app.get('/api/health', async (req: Request, res: Response) => {
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
});

// Products API endpoint
app.get('/api/products', async (req: Request, res: Response) => {
  const products = await serverDb.getProducts();
  res.json({ products });
});

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
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
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
        const matched = MOCK_PRODUCTS.find(mp => mp.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(mp.name.toLowerCase()));
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
app.post('/api/ai/routine-result', async (req: Request, res: Response) => {
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

    const realProductHandles = diagnosticType === 'hair'
      ? ["leave-in-hydratant", "masque-hydratant", "bonnet-satin"]
      : ["spf-invisible", "serum-marques-post-imperfections"];

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

    const currentCatalog = await getAvailableCatalog();
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
      const validSlugs = MOCK_PRODUCTS.map(p => p.slug);
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

// Helper to extract authenticated user details
function getAuthUser(req: Request): { userId: string; email: string; isAdmin: boolean } {
  const authHeader = req.headers['authorization'] as string;
  const userEmail = (req.headers['x-user-email'] as string) || '';
  const userIdHeader = (req.headers['x-user-id'] as string) || '';
  const adminKey = req.headers['x-admin-key'] as string;

  const isAdmin = adminKey === 'kurla2026' || authHeader === 'Bearer kurla_admin_secret';
  let userId = userIdHeader;
  let email = userEmail;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token.includes('@')) email = token;
    else if (token.length > 5 && !isAdmin) userId = token;
  }

  return { userId, email, isAdmin };
}

// 1. User Notifications API
app.get('/api/notifications', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const notifs = await serverDb.getNotifications(userId);
  res.json({ notifications: notifs });
});

app.post('/api/notifications/:id/read', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  const notifId = req.params.id;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  await serverDb.markNotificationRead(notifId, userId);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  const notifId = req.params.id;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  await serverDb.deleteNotification(notifId, userId);
  res.json({ success: true });
});

// 2. Notification Preferences API
app.get('/api/notification-preferences', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const prefs = await serverDb.getNotificationPreferences(userId);
  res.json({ preferences: prefs });
});

app.post('/api/notification-preferences', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const updated = await serverDb.updateNotificationPreferences(userId, req.body);
  res.json({ preferences: updated });
});

// 3. Shipments API
app.get('/api/shipments/:orderId', async (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const shipment = await serverDb.getShipmentByOrderId(orderId);
  res.json({ shipment: shipment || null });
});

// 4. Returns & Refunds API
app.post('/api/returns', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  const { orderId, reason, items, comment } = req.body;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  if (!orderId || !reason || !items) return res.status(400).json({ error: 'Données manquantes pour le retour' });

  try {
    const ret = await serverDb.createReturnRequest(userId, orderId, reason, items, comment);
    res.json({ returnRequest: ret });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/returns', async (req: Request, res: Response) => {
  const { userId, isAdmin } = getAuthUser(req);
  if (isAdmin) {
    const allReturns = await serverDb.getAllReturns();
    return res.json({ returns: allReturns });
  }
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const userReturns = await serverDb.getReturnsByUser(userId);
  res.json({ returns: userReturns });
});

app.post('/api/admin/returns/:id/status', async (req: Request, res: Response) => {
  const { isAdmin } = getAuthUser(req);
  if (!isAdmin) return res.status(403).json({ error: 'Accès administrateur requis' });
  const { status, adminComment } = req.body;
  const ret = await serverDb.updateReturnStatus(req.params.id, status, adminComment);
  res.json({ returnRequest: ret });
});

app.post('/api/admin/refunds', async (req: Request, res: Response) => {
  const { isAdmin } = getAuthUser(req);
  if (!isAdmin) return res.status(403).json({ error: 'Accès administrateur requis' });
  const { orderId, returnId, amount, reason } = req.body;
  try {
    const refund = await serverDb.processStripeRefund(orderId, returnId, amount, reason);
    res.json({ refund });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Customer Support Tickets API
app.get('/api/support/tickets', async (req: Request, res: Response) => {
  const { userId, isAdmin } = getAuthUser(req);
  if (isAdmin) {
    const allTickets = await serverDb.getAllSupportTickets();
    return res.json({ tickets: allTickets });
  }
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const tickets = await serverDb.getSupportTicketsByUser(userId);
  res.json({ tickets });
});

app.post('/api/support/tickets', async (req: Request, res: Response) => {
  const { userId } = getAuthUser(req);
  const { orderId, category, subject, message } = req.body;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  if (!category || !subject || !message) return res.status(400).json({ error: 'Paramètres manquants' });

  const ticket = await serverDb.createSupportTicket(userId, orderId, category, subject, message);
  res.json({ ticket });
});

app.get('/api/support/tickets/:id/messages', async (req: Request, res: Response) => {
  const { userId, isAdmin } = getAuthUser(req);
  const ticketId = req.params.id;
  const messages = await serverDb.getSupportMessages(ticketId);
  res.json({ messages });
});

app.post('/api/support/tickets/:id/messages', async (req: Request, res: Response) => {
  const { userId, isAdmin } = getAuthUser(req);
  const ticketId = req.params.id;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: 'Message vide' });
  const role = isAdmin ? 'admin' : 'customer';
  const msg = await serverDb.addSupportMessage(ticketId, userId || 'admin', role, message);
  res.json({ message: msg });
});

app.post('/api/admin/support/tickets/:id/status', async (req: Request, res: Response) => {
  const { isAdmin } = getAuthUser(req);
  if (!isAdmin) return res.status(403).json({ error: 'Accès administrateur requis' });
  const { status } = req.body;
  await serverDb.updateSupportTicketStatus(req.params.id, status);
  res.json({ success: true });
});

// 6. Admin Order Status & Audit Trail API
app.post('/api/admin/orders/:id/status', async (req: Request, res: Response) => {
  const { isAdmin, userId } = getAuthUser(req);
  if (!isAdmin) return res.status(403).json({ error: 'Accès administrateur requis' });
  const orderId = req.params.id;
  const { status, reason } = req.body;

  try {
    const updated = await serverDb.updateOrderStatus(orderId, status, {
      changedBy: userId || 'admin',
      changedByRole: 'admin',
      reason: reason || `Mise à jour statut admin vers ${status}`
    });
    res.json({ order: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/orders/:id/history', async (req: Request, res: Response) => {
  const { isAdmin } = getAuthUser(req);
  if (!isAdmin) return res.status(403).json({ error: 'Accès administrateur requis' });
  const history = await serverDb.getOrderStatusHistory(req.params.id);
  res.json({ history });
});

// 7. Admin Real Dashboard Analytics API
app.get('/api/admin/metrics', async (req: Request, res: Response) => {
  const { isAdmin } = getAuthUser(req);
  if (!isAdmin) return res.status(403).json({ error: 'Accès administrateur requis' });
  const metrics = await serverDb.getAdminAnalyticsMetrics();
  res.json({ metrics });
});

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

// Mount Vite middleware in dev or static files in production
async function startServer() {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KURLA Beauty Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
