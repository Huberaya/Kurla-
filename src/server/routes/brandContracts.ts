import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { BRAND_CONTRACT_TERMS_TEXT, BRAND_CONTRACT_TERMS_VERSION, brandContractTermsHash } from '../../lib/brandContractTerms';
import { asyncRoute, getAppUrl, rateLimit, safeApiError } from '../http';
import { getStripeClient } from '../payments/stripeClient';
import { requireAdmin, requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 12 (bloc D) — CONTRAT MARQUE.
 *
 * Critère de sortie du chantier F : « un contrat marque signé sur agrégats,
 * sans aucune donnée personnelle cédée ». L'espace marque existait (8 routes,
 * 4 tables, rapport k-anonyme) sans qu'aucun contrat ne lie la marque à KURLA.
 *
 * Ce qui est signé est un **texte versionné** : la signature porte sur son
 * empreinte. Modifier le texte invalide les signatures, et il faut resigner —
 * sinon la clause « aucune donnée personnelle cédée » pourrait être modifiée
 * après coup sans que personne ne s'en aperçoive.
 */
export function registerBrandContractRoutes(app: Express): void {
  /** Le texte du contrat, lisible par tous avant toute signature. */
  app.get('/api/brand-contracts/terms', rateLimit('brand-contract-terms', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      version: BRAND_CONTRACT_TERMS_VERSION,
      termsHash: brandContractTermsHash(),
      text: BRAND_CONTRACT_TERMS_TEXT
    });
  }));

  /** Émission par l'administration. */
  app.post('/api/admin/brand-contracts', rateLimit('brand-contract-issue', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const contract = await serverDb.issueBrandContract(admin.id, {
        brandUserId: String(req.body?.brandUserId || ''),
        brandName: String(req.body?.brandName || ''),
        contactEmail: String(req.body?.contactEmail || ''),
        priceCents: typeof req.body?.priceCents === 'number' ? req.body.priceCents : null
      });
      res.status(201).json({ contract });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Émission impossible.' });
    }
  }));

  /** Mes contrats, et ce qui me manque pour pouvoir demander un test. */
  app.get('/api/brand-contracts/mine', rateLimit('brand-contract-mine', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const [contracts, gate] = await Promise.all([
      serverDb.getBrandContractsForUser(user.id),
      serverDb.resolveBrandContractEligibility(user.id)
    ]);
    res.json({ contracts, eligibility: gate });
  }));

  /** Lecture d'un contrat : les deux parties, et l'administration. */
  app.get('/api/brand-contracts/:contractId', rateLimit('brand-contract-read', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const contract = await serverDb.getBrandContract(req.params.contractId);
    if (!contract) {
      res.status(404).json({ error: 'Contrat introuvable.' });
      return;
    }
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (contract.brandUserId !== user.id && !isAdmin) {
      res.status(403).json({ error: 'Ce contrat ne vous concerne pas.' });
      return;
    }
    res.json({
      contract,
      terms: contract.termsVersion === BRAND_CONTRACT_TERMS_VERSION
        ? { version: contract.termsVersion, termsHash: contract.termsHash, text: BRAND_CONTRACT_TERMS_TEXT }
        : { version: contract.termsVersion, termsHash: contract.termsHash, outdated: true }
    });
  }));

  /** Signature par la marque : les trois clauses sont exigées une par une. */
  app.post('/api/brand-contracts/:contractId/sign', rateLimit('brand-contract-sign', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const contract = await serverDb.signBrandContract(user.id, req.params.contractId, {
        acceptsAggregateOnly: req.body?.acceptsAggregateOnly === true,
        acceptsNoPersonalDataTransfer: req.body?.acceptsNoPersonalDataTransfer === true,
        confirmsTermsVersionRead: req.body?.confirmsTermsVersionRead === true
      });
      res.json({
        contract,
        note: 'Contrat signé par la marque. Il devient actif après le contreseing de KURLA.'
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Signature impossible.' });
    }
  }));

  /** Contreseing KURLA : à cet instant le contrat engage les deux parties. */
  app.post('/api/admin/brand-contracts/:contractId/countersign', rateLimit('brand-contract-countersign', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const contract = await serverDb.countersignBrandContract(admin.id, req.params.contractId);
      res.json({ contract, note: 'Contrat actif : la marque peut déposer une demande de test.' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Contreseing impossible.' });
    }
  }));

  // ---------------------------------------------------------------------------
  // FACTURATION (bloc D2)
  // ---------------------------------------------------------------------------

  /** Émission d'une facture, au prix du contrat signé — jamais un autre. */
  app.post('/api/admin/brand-contracts/:contractId/invoices', rateLimit('brand-invoice-issue', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const invoice = await serverDb.issueBrandInvoice(admin.id, req.params.contractId);
      res.status(201).json({ invoice });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Émission de la facture impossible.' });
    }
  }));

  /** Mes factures. */
  app.get('/api/brand-invoices/mine', rateLimit('brand-invoice-mine', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const invoices = await serverDb.getBrandInvoicesForUser(user.id);
    res.json({ invoices, pending: invoices.filter(invoice => invoice.status === 'pending').length });
  }));

  /**
   * Session de paiement de la facture.
   *
   * Sans clé Stripe, la route répond 503 explicitement : KURLA ne simule pas un
   * encaissement. Un faux « payé » sur une facture B2B est pire qu'un bouton
   * indisponible.
   */
  app.post('/api/brand-invoices/:invoiceId/checkout', rateLimit('brand-invoice-checkout', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const invoice = await serverDb.getBrandInvoice(req.params.invoiceId);
    if (!invoice) {
      res.status(404).json({ error: 'Facture introuvable.' });
      return;
    }
    if (invoice.brandUserId !== user.id) {
      res.status(403).json({ error: 'Cette facture ne vous concerne pas.' });
      return;
    }
    if (invoice.status === 'paid') {
      res.status(409).json({ error: 'Cette facture est déjà réglée.' });
      return;
    }
    if (invoice.status === 'void') {
      res.status(409).json({ error: 'Cette facture a été annulée.' });
      return;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      res.status(503).json({
        error: 'Paiement indisponible.',
        code: 'PAYMENT_NOT_CONFIGURED',
        note: 'Aucune clé Stripe n’est configurée sur cet environnement. KURLA ne simule pas un encaissement : la facture reste en attente.'
      });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email || undefined,
        line_items: [{
          price_data: {
            currency: invoice.currency,
            product_data: { name: `Contrat de test produit KURLA — facture ${invoice.invoiceNumber}` },
            unit_amount: invoice.amountCents
          },
          quantity: 1
        }],
        metadata: {
          kind: 'brand_invoice',
          invoiceId: invoice.id,
          contractId: invoice.contractId,
          brandUserId: invoice.brandUserId,
          expectedAmountCents: String(invoice.amountCents)
        },
        success_url: `${getAppUrl(req)}/professionnels?invoice=paid`,
        cancel_url: `${getAppUrl(req)}/professionnels?invoice=canceled`
      });
      await serverDb.attachBrandInvoiceCheckoutSession(invoice.id, session.id);
      res.status(201).json({ checkoutUrl: session.url, sessionId: session.id, amountCents: invoice.amountCents });
    } catch (error) {
      res.status(502).json({ error: safeApiError(error, 'La session de paiement n’a pas pu être créée.') });
    }
  }));

  /** Annulation d'une facture en attente. Une facture réglée ne s'annule pas. */
  app.post('/api/admin/brand-invoices/:invoiceId/void', rateLimit('brand-invoice-void', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const invoice = await serverDb.voidBrandInvoice(req.params.invoiceId, String(req.body?.reason || ''));
      res.json({ invoice });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Annulation impossible.' });
    }
  }));

  /** Résiliation : plus de nouvelle demande, les rapports déjà remis restent acquis. */
  app.post('/api/admin/brand-contracts/:contractId/terminate', rateLimit('brand-contract-terminate', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    try {
      const contract = await serverDb.terminateBrandContract(req.params.contractId, String(req.body?.reason || ''));
      res.json({ contract });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Résiliation impossible.' });
    }
  }));
}
