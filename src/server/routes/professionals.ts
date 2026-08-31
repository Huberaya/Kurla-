import type { Express } from 'express';

import { intelligenceStore } from '../../lib/intelligenceStore';
import {
  MINIMUM_ENDORSEMENTS_FOR_RATE,
  MINIMUM_REVIEWS_FOR_RATING,
  professionalStore,
} from '../../lib/professionalStore';
import { serverDb } from '../../lib/serverDb';
import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { bestEvidenceFor, resolveIngredient } from '../../lib/ingredientGraph';
import type { JurisdictionRestriction } from '../../lib/ingredientGraph';
import {
  assessProductCompliance,
  jurisdictionForCountry,
  type DeclaredProductIngredient,
  type ProductCompliance,
} from '../../lib/jurisdiction';
import { compareRoutines, simulateAnnualCost } from '../../lib/routineEconomics';
import { SELLER_COUNTRY } from '../../lib/vat';
import { asyncRoute, getAppUrl, rateLimit, safeApiError } from '../http';
import { requireAdmin, requireUser } from '../auth';
import {
  assessProductComplianceForCountry,
  loadJurisdictionGraph,
  resolveDeclaredIngredients,
  type JurisdictionGraph,
} from '../compliance';
import { getStripeClient } from '../payments/stripeClient';
import type { AuthenticatedRequest } from '../types';
import type { Response } from 'express';

/**
 * CHANTIER 8.1 — confiance, professionnels & écosystème, extraits de
 * `server.ts`. Ce bloc porte aussi la conformité réglementaire (7.7) : la fiche
 * ingrédient, la route publique de conformité et la porte du checkout.
 * Chemins inchangés.
 */

export function registerProfessionalRoutes(app: Express): void {
  // CHANTIER B — Confiance, pros & écosystème
  // ============================================================

  /**
   * Annuaire des professionnels vérifiés, avec Trust Score.
   *
   * Public : c'est la vitrine. Mais seul un professionnel dont l'identité a été
   * contrôlée manuellement apparaît — la contrainte est dans le schéma
   * (`is_public = FALSE OR identity_verified = TRUE`), pas seulement ici.
   */
  app.get('/api/professionals/verified', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    const profiles = await professionalStore.getPublicProfessionals();
    const withTrust = await Promise.all(profiles.map(async profile => ({
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        city: profile.city,
        profession: profile.profession,
        specialty: profile.specialty,
        qualificationLabel: profile.qualificationLabel,
        verifiedExperienceYears: profile.verifiedExperienceYears
      },
      trust: await professionalStore.assessTrust(profile.id)
    })));
    res.json({
      professionals: withTrust,
      total: withTrust.length,
      thresholds: { reviews: MINIMUM_REVIEWS_FOR_RATING, endorsements: MINIMUM_ENDORSEMENTS_FOR_RATE },
      note: withTrust.length === 0
        ? 'Aucun professionnel n’a encore fait vérifier son identité. KURLA n’affiche que des profils contrôlés manuellement.'
        : undefined
    });
  }));

  /** Trust Score détaillé : chaque composante, y compris celles non satisfaites. */
  app.get('/api/professionals/:professionalId/trust', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const professionalId = String(req.params.professionalId || '').trim();
    if (!professionalId) {
      res.status(400).json({ error: 'Identifiant professionnel manquant.' });
      return;
    }
    // `assessTrust` lève si le profil est absent : un identifiant inconnu est une
    // absence, pas une panne. Sans ce contrôle, l'appel remonte en 500.
    const profile = await professionalStore.getProfessional(professionalId);
    if (!profile) {
      res.status(404).json({ error: 'Professionnel introuvable.' });
      return;
    }
    const assessment = await professionalStore.assessTrust(professionalId);
    res.json({ assessment });
  }));

  /** Prestations proposées par un professionnel vérifié. */
  app.get('/api/professionals/:professionalId/services', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const professionalId = String(req.params.professionalId || '').trim();
    if (!professionalId) {
      res.status(400).json({ error: 'Identifiant professionnel manquant.' });
      return;
    }
    const profile = await professionalStore.getProfessional(professionalId);
    if (!profile || !profile.identityVerified) {
      res.status(404).json({ error: 'Professionnel introuvable ou identité non vérifiée.' });
      return;
    }
    res.json({ professionalId, services: await professionalStore.getServices(professionalId) });
  }));

  /**
   * Réservation. La vérification d'identité est recontrôlée ici : une UI peut
   * être contournée, un schéma non.
   */
  app.post('/api/appointments', rateLimit('appointment', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const appointment = await professionalStore.requestAppointment({
      professionalId: String(req.body?.professionalId || ''),
      clientUserId: user.id,
      serviceId: typeof req.body?.serviceId === 'string' ? req.body.serviceId : undefined,
      scheduledAt: String(req.body?.scheduledAt || ''),
      clientNotes: typeof req.body?.clientNotes === 'string' ? req.body.clientNotes : undefined,
      // Consentement au partage de dossier : explicite, jamais présumé.
      dossierShareConsent: req.body?.dossierShareConsent === true
    });

    await serverDb.sendNotification(
      user.id,
      'appointment_requested',
      'Demande de réservation envoyée',
      'Votre demande est transmise au professionnel. Elle n’est pas encore confirmée.',
      '/mes-reservations',
      undefined,
      `appointment:${appointment.id}`
    );

    res.status(201).json({
      appointment,
      note: 'Une demande n’est pas une confirmation : le professionnel doit l’accepter.'
    });
  }));

  app.get('/api/appointments', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ appointments: await professionalStore.getAppointments({ clientUserId: user.id }) });
  }));

  app.post('/api/appointments/:appointmentId/status', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const appointmentId = String(req.params.appointmentId || '').trim();
    const mine = (await professionalStore.getAppointments({ clientUserId: user.id }))
      .find(appointment => appointment.id === appointmentId);
    if (!mine) {
      res.status(404).json({ error: 'Réservation introuvable pour ce compte.' });
      return;
    }
    const updated = await professionalStore.setAppointmentStatus(
      appointmentId,
      req.body?.status,
      typeof req.body?.cancelledReason === 'string' ? req.body.cancelledReason : undefined
    );
    res.json({ appointment: updated });
  }));

  /** Avis de prestation. Sans prestation effectuée, l'avis ne compte pas. */
  app.post('/api/professionals/:professionalId/reviews', rateLimit('pro-review', 5, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const professionalId = String(req.params.professionalId || '').trim();
    const appointmentId = typeof req.body?.appointmentId === 'string' ? req.body.appointmentId : undefined;

    // L'avis ne compte dans le Trust Score que si la prestation a eu lieu.
    let serviceDelivered = false;
    if (appointmentId) {
      const appointment = (await professionalStore.getAppointments({ clientUserId: user.id }))
        .find(item => item.id === appointmentId);
      serviceDelivered = appointment?.status === 'completed';
    }

    await professionalStore.recordReview({
      professionalId,
      clientUserId: user.id,
      appointmentId,
      rating: Number(req.body?.rating),
      comment: typeof req.body?.comment === 'string' ? req.body.comment : undefined,
      serviceDelivered
    });

    res.status(201).json({
      recorded: true,
      countsInTrustScore: serviceDelivered,
      note: serviceDelivered
        ? 'Merci. Cet avis compte dans le Trust Score car la prestation a été effectuée.'
        : 'Avis enregistré, mais il ne comptera pas dans le Trust Score : aucune prestation effectuée n’y est rattachée.'
    });
  }));

  // --- Partage de dossier client ----------------------------------------------

  app.post('/api/dossier-shares', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const share = await professionalStore.grantDossierShare({
      clientUserId: user.id,
      professionalId: String(req.body?.professionalId || ''),
      appointmentId: typeof req.body?.appointmentId === 'string' ? req.body.appointmentId : undefined,
      scope: {
        beautyProfile: req.body?.scope?.beautyProfile === true,
        shelf: req.body?.scope?.shelf === true,
        outcomes: req.body?.scope?.outcomes === true,
        protectiveStyles: req.body?.scope?.protectiveStyles === true
      },
      expiresAt: typeof req.body?.expiresAt === 'string' ? req.body.expiresAt : undefined
    });
    res.status(201).json({ share });
  }));

  app.get('/api/dossier-shares', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    res.json({ shares: await professionalStore.getClientShares(user.id) });
  }));

  app.delete('/api/dossier-shares/:shareId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const revoked = await professionalStore.revokeDossierShare(user.id, String(req.params.shareId || '').trim());
    if (!revoked) {
      res.status(404).json({ error: 'Partage introuvable pour ce compte.' });
      return;
    }
    res.json({ revoked: true, note: 'L’accès cesse immédiatement. La trace du consentement est conservée.' });
  }));

  /**
   * Espace pro : ce que le professionnel peut voir, à l'instant présent, sur un
   * client. Un partage révoqué ou expiré ne remonte pas.
   */
  app.get('/api/professional/dossier-access/:clientUserId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const clientUserId = String(req.params.clientUserId || '').trim();
    const profiles = await professionalStore.getPublicProfessionals();
    const own = profiles.find(profile => profile.userId === user.id);
    if (!own) {
      res.status(403).json({ error: 'Aucun profil professionnel vérifié n’est associé à ce compte.' });
      return;
    }
    const shares = (await professionalStore.getActiveShares(own.id))
      .filter(share => share.clientUserId === clientUserId);
    const share = shares[0];
    if (!share) {
      res.json({ access: false, reason: 'Ce client ne partage rien avec vous, ou a révoqué le partage.' });
      return;
    }

    // Le périmètre est respecté champ par champ : « tout le dossier » n'existe pas.
    const data: Record<string, unknown> = {};
    if (share.scopeBeautyProfile) {
      const profileRecord = await serverDb.getBeautyProfile(clientUserId);
      data.beautyProfile = profileRecord?.profile ?? null;
    }
    if (share.scopeShelf) data.shelf = await intelligenceStore.getShelf(clientUserId);
    if (share.scopeOutcomes) data.outcomes = await intelligenceStore.getOutcomes(clientUserId);
    if (share.scopeProtectiveStyles) data.protectiveStyles = await intelligenceStore.getProtectiveStyles(clientUserId);

    res.json({
      access: true,
      scope: {
        beautyProfile: share.scopeBeautyProfile,
        shelf: share.scopeShelf,
        outcomes: share.scopeOutcomes,
        protectiveStyles: share.scopeProtectiveStyles
      },
      consentAt: share.consentAt,
      expiresAt: share.expiresAt ?? null,
      data,
      note: 'Accès borné au périmètre consenti. Le client peut le révoquer à tout moment.'
    });
  }));

  // --- Vérification d'identité (administration) --------------------------------

  app.post('/api/admin/professionals/:professionalId/verify', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const profile = await professionalStore.verifyIdentity({
      professionalId: String(req.params.professionalId || '').trim(),
      verifiedBy: admin.id,
      documentRef: typeof req.body?.documentRef === 'string' ? req.body.documentRef : undefined
    });
    res.json({ profile });
  }));

  // --- Fiche ingrédient publique ----------------------------------------------

  /**
   * Fiche ingrédient publique : fonction, niveau de preuve, sources.
   *
   * Publique et sans authentification, contrairement à `/evidence` qui est
   * personnelle : c'est la condition pour qu'elle soit indexable et utile à
   * quelqu'un qui ne connaît pas encore KURLA.
   */
  /**
   * Conformité réglementaire d'un produit pour un pays de livraison.
   *
   * Publique et sans compte : un visiteur doit pouvoir savoir avant d'acheter, pas
   * après. Le pays par défaut est celui du vendeur — c'est une hypothèse affichée
   * dans la réponse, jamais une devinette silencieuse.
   */
  app.get('/api/products/:productId/compliance', rateLimit('compliance', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      res.status(400).json({ error: 'Identifiant produit manquant.' });
      return;
    }
    const requestedCountry = String(req.query.country || '').trim().toUpperCase();
    const country = requestedCountry || SELLER_COUNTRY;
    const jurisdiction = jurisdictionForCountry(country);
    if (!jurisdiction) {
      res.status(400).json({
        error: `Pays non desservi : « ${country} ».`,
        note: 'KURLA ne livre que dans l’Union européenne ; le statut réglementaire d’un autre pays n’est pas évalué.'
      });
      return;
    }

    const product = await serverDb.getProductById(productId);
    if (!product) {
      res.status(404).json({ error: 'Produit introuvable.' });
      return;
    }

    let graph: JurisdictionGraph | null = null;
    try {
      graph = await loadJurisdictionGraph(jurisdiction);
    } catch (error: any) {
      res.status(502).json({ error: error?.message || 'Graphe réglementaire indisponible.' });
      return;
    }
    if (!graph) {
      res.status(503).json({
        error: 'Graphe d’ingrédients indisponible.',
        note: 'Sans base configurée, KURLA ne fabrique pas de verdict de conformité approximatif.'
      });
      return;
    }

    const { compliance, declaredCount, resolvedCount } = await assessProductComplianceForCountry(product as any, country, graph);
    res.json({
      productId,
      country,
      countryWasDefaulted: !requestedCountry,
      jurisdiction,
      ...compliance,
      declaredIngredientCount: declaredCount,
      resolvedIngredientCount: resolvedCount,
      note: 'Le verdict porte sur les ingrédients résolus dans le graphe KURLA. Un ingrédient non résolu n’est ni conforme ni non conforme : il est inconnu.'
    });
  }));

  app.get('/api/ingredients/:ingredientId/card', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const ingredientId = String(req.params.ingredientId || '').trim();
    if (!ingredientId) {
      res.status(400).json({ error: 'Identifiant ingrédient manquant.' });
      return;
    }
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      res.status(503).json({
        error: 'Graphe d’ingrédients indisponible.',
        note: 'La fiche ingrédient lit la table `ingredients`. Sans base configurée, KURLA ne fabrique pas de fiche approximative.'
      });
      return;
    }

    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', ingredientId)
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: `Lecture de l’ingrédient impossible : ${error.message}` });
      return;
    }
    if (!ingredient) {
      res.status(404).json({ error: 'Ingrédient inconnu du graphe KURLA.' });
      return;
    }

    const { data: evidenceRows } = await supabase
      .from('ingredient_evidence')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('evidence_level');

    const { data: restrictions } = await supabase
      .from('ingredient_jurisdiction_restrictions')
      .select('*')
      .eq('ingredient_id', ingredientId);

    /**
     * CHANTIER 10 (bloc B4) — la provenance accompagne la fiche.
     *
     * Dire « vérifié » sans dire d'où vient la vérification ne permet à
     * personne de contrôler. La source, son URL et sa date de retrait sont
     * donc rendues publiques avec l'ingrédient.
     */
    const { data: provenanceRows } = await supabase
      .from('ingredient_provenance')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('retrieved_at', { ascending: false });
    const provenance = (provenanceRows || []).map((row: any) => ({
      sourceLabel: row.source_label,
      sourceUrl: row.source_url,
      retrievedAt: row.retrieved_at,
      casNumber: row.cas_number || null,
      evidenceTier: Number(row.evidence_tier) === 2 ? 2 : 1,
      note: row.note || undefined
    }));

    // Les lignes SQL sont en snake_case ; `bestEvidenceFor` attend le type TS.
    // Sans ce mapping, la fonction lirait des champs `undefined` et renverrait
    // une preuve « non transposable » pour de mauvaises raisons.
    const evidence = (evidenceRows || []).map((row: any) => ({
      id: row.id,
      ingredientId: row.ingredient_id,
      claim: row.claim,
      evidenceLevel: row.evidence_level,
      populationsStudied: row.populations_studied || [],
      textureScope: row.texture_scope || [],
      toneScope: row.tone_scope || [],
      climateScope: row.climate_scope || [],
      sourceKind: row.source_kind,
      sourceReference: row.source_reference || undefined,
      sourceUrl: row.source_url || undefined,
      reviewedBy: row.reviewed_by || undefined
    }));

    // CHANTIER 1 — boucle publique : les produits publiés qui contiennent cet
    // ingrédient, pour naviguer fiche ingrédient → produits. On ne lit que des
    // produits publiés (serverDb.getPublicProducts applique la gouvernance).
    let containingProducts: any[] = [];
    {
      const { data: containingLinks, error: linkErr } = await supabase
        .from('product_ingredients')
        .select('product_id')
        .eq('ingredient_id', ingredientId);
      if (!linkErr && containingLinks && containingLinks.length) {
        const publicProducts = await serverDb.getPublicProducts();
        const publicById = new Map(publicProducts.map((p: any) => [String(p.id), p]));
        const seen = new Set<string>();
        containingProducts = containingLinks
          .map((l: any) => publicById.get(String(l.product_id)))
          .filter((p: any) => p && !seen.has(p.id) && seen.add(p.id))
          .map((p: any) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand ?? null,
            price: p.price ?? null,
            category: p.category ?? null,
            subcategory: p.subcategory ?? p.subCategoryTag ?? null,
            image: p.imageUrl ?? p.image_url ?? p.image ?? null,
          }));
      }
    }

    res.json({
      ingredient,
      evidence,
      restrictions: restrictions || [],
      provenance,
      products: containingProducts,
      verificationStatus: ingredient.verification_status ?? 'not_provided',
      bestEvidence: bestEvidenceFor(evidence),
      note: 'Le niveau de preuve indique la solidité des données publiées, pas une garantie d’effet sur votre peau ou vos cheveux.'
    });
  }));

  // --- Économie de routine ----------------------------------------------------

  /**
   * Simulateur de coût annuel. Le prix affiché est un prix d'entrée, pas un coût :
   * un produit à 9 € qui dure trois semaines coûte plus cher à l'année qu'un
   * produit à 24 € qui dure six mois.
   *
   * Rendement non déclaré -> coût `null` avec limitation. Jamais d'estimation.
   */
  app.post('/api/routines/cost-simulation', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const items = Array.isArray(req.body?.items)
      ? (req.body.items as any[]).map((item, index) => ({
          id: typeof item?.id === 'string' ? item.id : `item-${index}`,
          label: typeof item?.label === 'string' ? item.label : 'Article',
          price: Number(item?.price) || 0,
          estimatedYield: typeof item?.estimatedYield === 'string' ? item.estimatedYield : undefined
        }))
      : [];
    res.json({ simulation: simulateAnnualCost(items) });
  }));

  /**
   * Comparateur de routines. Porte sur le coût et le temps — les deux seules
   * dimensions comparables sans juger de l'efficacité, que KURLA ne peut pas
   * mesurer sans données longitudinales sur ces produits.
   */
  app.post('/api/routines/compare', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const normalize = (raw: any, fallbackId: string) => ({
      id: typeof raw?.id === 'string' ? raw.id : fallbackId,
      label: typeof raw?.label === 'string' ? raw.label : fallbackId,
      minutesPerDay: Number.isFinite(Number(raw?.minutesPerDay)) ? Number(raw.minutesPerDay) : undefined,
      items: Array.isArray(raw?.items)
        ? (raw.items as any[]).map((item, index) => ({
            id: typeof item?.id === 'string' ? item.id : `${fallbackId}-${index}`,
            label: typeof item?.label === 'string' ? item.label : 'Article',
            price: Number(item?.price) || 0,
            estimatedYield: typeof item?.estimatedYield === 'string' ? item.estimatedYield : undefined
          }))
        : []
    });
    res.json({
      comparison: compareRoutines(normalize(req.body?.a, 'Routine A'), normalize(req.body?.b, 'Routine B'))
    });
  }));

  // --- Paiement de prestation -------------------------------------------------

  /**
   * Session de paiement pour une prestation.
   *
   * Checkout Session et non PaymentIntent : le projet n'embarque ni
   * `@stripe/stripe-js` ni `@stripe/react-stripe-js`, donc un `client_secret`
   * serait inutilisable côté client. On suit le pattern du checkout produit —
   * redirection hébergée par Stripe — plutôt que d'inventer une intégration
   * Elements impossible à terminer ici.
   *
   * Réservé aux réservations déjà confirmées par le professionnel : faire payer
   * une demande que personne n'a acceptée serait encaisser pour une prestation
   * qui n'aura peut-être jamais lieu.
   *
   * Sans `STRIPE_SECRET_KEY`, la route répond 503 explicitement. Elle ne simule
   * pas un paiement réussi : un faux succès de paiement est le pire état possible
   * pour la confiance.
   */
  app.post('/api/appointments/:appointmentId/checkout', rateLimit('service-payment', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const appointmentId = String(req.params.appointmentId || '').trim();

    const mine = (await professionalStore.getAppointments({ clientUserId: user.id }))
      .find(appointment => appointment.id === appointmentId);
    if (!mine) {
      res.status(404).json({ error: 'Réservation introuvable pour ce compte.' });
      return;
    }
    if (mine.status !== 'confirmed') {
      res.status(409).json({
        error: 'Cette réservation n’est pas encore confirmée par le professionnel.',
        status: mine.status,
        note: 'Le paiement n’est proposé qu’après confirmation : KURLA n’encaisse pas pour une prestation qui n’est pas acceptée.'
      });
      return;
    }

    if (!mine.serviceId) {
      res.status(409).json({ error: 'Aucune prestation tarifée n’est rattachée à cette réservation.' });
      return;
    }
    const services = await professionalStore.getServices(mine.professionalId);
    const service = services.find(item => item.id === mine.serviceId);
    if (!service) {
      res.status(404).json({ error: 'Prestation introuvable.' });
      return;
    }
    if (service.priceCents <= 0) {
      res.status(409).json({ error: 'Cette prestation n’est pas facturée : aucun paiement n’est nécessaire.' });
      return;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({
        error: 'Paiement indisponible.',
        note: 'Aucune clé Stripe n’est configurée sur cet environnement. KURLA ne simule pas un paiement réussi.'
      });
      return;
    }

    // Clé d'idempotence déterministe : rejouer la même réservation ne crée pas
    // une seconde session ni un second paiement.
    const idempotencyKey = `service:${appointmentId}:${service.id}`;
    const appUrl = getAppUrl(req);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email || undefined,
        line_items: [{
          price_data: {
            currency: service.currency.toLowerCase(),
            product_data: { name: `Prestation — ${service.name}` },
            unit_amount: service.priceCents
          },
          quantity: 1
        }],
        metadata: { appointmentId, serviceId: service.id, userId: user.id, kind: 'service' },
        payment_intent_data: {
          metadata: { appointmentId, serviceId: service.id, userId: user.id, kind: 'service' }
        },
        success_url: `${appUrl}/mes-reservations?paid=1&appointment_id=${appointmentId}`,
        cancel_url: `${appUrl}/mes-reservations?canceled=1&appointment_id=${appointmentId}`
      }, { idempotencyKey });

      // En mode `payment`, Stripe crée le PaymentIntent immédiatement : on peut
      // le stocker tout de suite et l'utiliser pour la confirmation.
      const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

      const payment = await professionalStore.createServicePayment({
        appointmentId,
        amountCents: service.priceCents,
        currency: service.currency,
        stripePaymentIntentId: intentId,
        idempotencyKey
      });

      res.status(201).json({
        payment,
        sessionId: session.id,
        url: session.url,
        amountCents: service.priceCents,
        currency: service.currency,
        serviceName: service.name
      });
    } catch (error: any) {
      console.error('[Stripe Service Payment]', error?.message || error);
      res.status(502).json({ error: safeApiError(error, 'Création du paiement impossible') });
    }
  }));

  /**
   * Confirmation de paiement.
   *
   * Le statut est relu chez Stripe avant d'être accepté : le client ne peut pas
   * décréter qu'il a payé. Sans cette relecture, n'importe quel appel à cette
   * route marquerait une prestation comme réglée.
   */
  app.post('/api/service-payments/:paymentId/confirm', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const paymentId = String(req.params.paymentId || '').trim();

    const appointmentId = String(req.body?.appointmentId || '').trim();
    const mine = appointmentId
      ? (await professionalStore.getAppointments({ clientUserId: user.id })).find(a => a.id === appointmentId)
      : undefined;
    if (!mine) {
      res.status(404).json({ error: 'Réservation introuvable pour ce compte.' });
      return;
    }
    const payments = await professionalStore.getServicePaymentsForAppointment(appointmentId);
    const payment = payments.find(item => item.id === paymentId);
    if (!payment) {
      res.status(404).json({ error: 'Paiement introuvable pour cette réservation.' });
      return;
    }
    if (payment.status === 'paid') {
      res.json({ payment, note: 'Paiement déjà confirmé.' });
      return;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({ error: 'Vérification du paiement indisponible : aucune clé Stripe configurée.' });
      return;
    }
    if (!payment.stripePaymentIntentId) {
      res.status(409).json({ error: 'Ce paiement n’est rattaché à aucun intent Stripe.' });
      return;
    }

    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    if (intent.status !== 'succeeded') {
      res.status(409).json({
        error: 'Le paiement n’est pas abouti.',
        stripeStatus: intent.status,
        note: 'KURLA ne confirme un paiement que sur la foi de l’état retourné par Stripe.'
      });
      return;
    }

    const confirmed = await professionalStore.markServicePaymentPaid(paymentId);
    res.json({ payment: confirmed, note: 'Paiement confirmé.' });
  }));

  /** Historique des paiements d'une réservation. */
  app.get('/api/appointments/:appointmentId/payments', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const appointmentId = String(req.params.appointmentId || '').trim();
    const mine = (await professionalStore.getAppointments({ clientUserId: user.id }))
      .find(appointment => appointment.id === appointmentId);
    if (!mine) {
      res.status(404).json({ error: 'Réservation introuvable pour ce compte.' });
      return;
    }
    res.json({ payments: await professionalStore.getServicePaymentsForAppointment(appointmentId) });
  }));

  // --- Co-signature : ce qui me concerne --------------------------------------

  /**
   * Mes co-signatures — celles qu'un professionnel a portées sur mes routines ou
   * mes produits. Jusqu'ici les 4 routes de co-signature existaient sans aucun
   * moyen, pour le client, de voir ce qu'un professionnel avait dit de SA routine.
   */
  app.get('/api/me/endorsements', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const all = await intelligenceStore.getEndorsements({ clientUserId: user.id });
    const withGate = all.map(endorsement => ({
      endorsement,
      gate: intelligenceStore.resolveEndorsementDisplay(endorsement),
      action: intelligenceStore.applyProfessionalJudgement(endorsement)
    }));
    res.json({
      endorsements: withGate,
      total: withGate.length,
      contradicted: withGate.filter(entry => entry.endorsement.stance === 'contradicted').length,
      note: withGate.length === 0
        ? 'Aucun professionnel n’a encore revu votre routine.'
        : undefined
    });
  }));

  // ============================================================
}
