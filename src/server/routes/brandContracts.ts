import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { BRAND_CONTRACT_TERMS_TEXT, BRAND_CONTRACT_TERMS_VERSION, brandContractTermsHash } from '../../lib/brandContractTerms';
import { asyncRoute, rateLimit } from '../http';
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
