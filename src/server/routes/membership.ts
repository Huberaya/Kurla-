import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import {
  MEMBERSHIP_DISCLAIMERS,
  MEMBERSHIP_PLANS,
  annualSavingCents,
  isMembershipPaymentConfigured,
  isMembershipPlanCode,
  membershipPrice
} from '../../lib/membership';
import { getStripeClient } from '../payments/stripeClient';
import { asyncRoute, getAppUrl, rateLimit, safeApiError } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.5 — ABONNEMENT KURLA+.
 *
 * Ce qui est payant, c'est la profondeur d'analyse de données que le membre a
 * déjà déclarées. Aucune fonction essentielle ne passe derrière l'abonnement :
 * le registre des capacités marque ces fonctions `essential`, et le banc vérifie
 * qu'elles restent gratuites.
 *
 * Deux refus sont assumés et visibles :
 *   - sans configuration de paiement, `POST /api/membership/checkout` répond 503
 *     et ne simule jamais un encaissement ;
 *   - un abonnement payant exige une référence de paiement : la RPC comme le
 *     repli mémoire refusent sans elle.
 */
export function registerMembershipRoutes(app: Express): void {
  // Plans et prix, lisibles sans compte : on doit pouvoir comparer avant.
  app.get('/api/membership/plans', rateLimit('membership-plans', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const requested = typeof req.query.country === 'string' ? req.query.country : undefined;
    res.json({
      plans: MEMBERSHIP_PLANS.map(plan => ({
        code: plan.code,
        label: plan.label,
        tagline: plan.tagline,
        trialDays: plan.trialDays,
        isPaid: plan.isPaid,
        monthly: membershipPrice(plan.code, 'monthly', requested),
        annual: membershipPrice(plan.code, 'annual', requested),
        annualSavingCents: annualSavingCents(plan.code)
      })),
      // Un taux inconnu n'est jamais remplacé par un taux inventé : les prix TTC
      // reviennent alors à `null` et l'écran le dit.
      countryResolved: requested ? membershipPrice('kurla_plus', 'monthly', requested).vatRatePercent !== null : false,
      paymentConfigured: isMembershipPaymentConfigured(),
      disclaimers: MEMBERSHIP_DISCLAIMERS
    });
  }));

  app.get('/api/membership/me', rateLimit('membership-me', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const country = typeof req.query.country === 'string' ? req.query.country : undefined;
    const overview = await serverDb.getMembershipOverview(user.id, country);
    res.json(overview);
  }));

  /**
   * Essai de 14 jours, sans moyen de paiement. Un seul par compte, à vie : la
   * preuve est le journal d'adhésion, pas la ligne courante.
   */
  app.post('/api/membership/trial', rateLimit('membership-trial', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const planCode = typeof req.body?.planCode === 'string' ? req.body.planCode : 'kurla_plus';
    try {
      const state = await serverDb.startMembershipTrial(user.id, planCode);
      res.status(201).json({ state, note: 'Essai ouvert sans moyen de paiement. Il se termine seul à échéance.' });
    } catch (error) {
      res.status(409).json({ error: safeApiError(error, 'Impossible d’ouvrir l’essai.') });
    }
  }));

  app.post('/api/membership/cancel', rateLimit('membership-cancel', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const atPeriodEnd = req.body?.atPeriodEnd !== false;
    try {
      const state = await serverDb.cancelMembership(user.id, atPeriodEnd);
      res.json({
        state,
        note: atPeriodEnd
          ? 'Résiliation enregistrée : l’accès reste dû jusqu’à la fin de la période payée.'
          : 'Abonnement clos immédiatement.'
      });
    } catch (error) {
      res.status(409).json({ error: safeApiError(error, 'Impossible de résilier.') });
    }
  }));

  /**
   * Ouvre un Checkout d'abonnement. Sans configuration de paiement, la route
   * répond 503 : un faux succès de paiement est le pire état possible pour la
   * confiance, et la configuration Stripe est volontairement différée.
   */
  app.post('/api/membership/checkout', rateLimit('membership-checkout', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const planCode = typeof req.body?.planCode === 'string' ? req.body.planCode : 'kurla_plus';
    if (!isMembershipPlanCode(planCode) || planCode === 'libre') {
      res.status(400).json({ error: 'Plan payant invalide.' });
      return;
    }
    const billing = req.body?.billing === 'annual' ? 'annual' : 'monthly';
    const country = typeof req.body?.country === 'string' ? req.body.country.toUpperCase() : 'FR';

    const price = membershipPrice(planCode, billing, country);
    if (price.grossCents === null) {
      res.status(400).json({
        error: `TVA inconnue pour le pays « ${country} ».`,
        note: 'Aucun taux n’est inventé : indiquez un pays desservi pour obtenir un prix TTC.'
      });
      return;
    }

    const stripe = getStripeClient();
    if (!stripe || !isMembershipPaymentConfigured()) {
      res.status(503).json({
        error: 'Paiement indisponible.',
        code: 'PAYMENT_NOT_CONFIGURED',
        note: 'Aucune configuration de paiement n’est active sur cet environnement. KURLA ne simule pas un encaissement : l’essai de 14 jours, lui, reste ouvert sans moyen de paiement.',
        trialAvailable: true
      });
      return;
    }

    const plan = MEMBERSHIP_PLANS.find(entry => entry.code === planCode)!;
    const appUrl = getAppUrl(req);
    const expectedAmountCents = price.grossCents;
    const membershipMetadata = {
      kind: 'membership',
      membershipPlan: planCode,
      membershipBilling: billing,
      userId: user.id,
      vatRatePercent: String(price.vatRatePercent),
      expectedAmountCents: String(expectedAmountCents)
    };

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email || undefined,
        line_items: [{
          price_data: {
            currency: price.currency.toLowerCase(),
            product_data: { name: `${plan.label} — ${billing === 'annual' ? 'annuel' : 'mensuel'}` },
            unit_amount: expectedAmountCents,
            recurring: { interval: billing === 'annual' ? 'year' : 'month' }
          },
          quantity: 1
        }],
        metadata: membershipMetadata,
        // L'objet `subscription` doit porter les mêmes métadonnées que la
        // session : c'est lui que reçoit l'événement de résiliation.
        subscription_data: { metadata: membershipMetadata },
        success_url: `${appUrl}/account/kurla-plus?paid=1`,
        cancel_url: `${appUrl}/account/kurla-plus?canceled=1`
      });
      res.status(201).json({ checkoutUrl: session.url, sessionId: session.id, expectedAmountCents });
    } catch (error) {
      res.status(502).json({ error: safeApiError(error, 'La session de paiement n’a pas pu être créée.') });
    }
  }));
}
