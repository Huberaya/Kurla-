import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import {
  BRAND_TEST_CAVEATS,
  BRAND_TEST_K_THRESHOLD,
  BRAND_TEST_STATUS_LABELS,
  BRAND_TEST_TRANSITIONS,
  COHORT_ALLOWED_KEYS,
  FORBIDDEN_COHORT_KEYS,
  brandTestReportBreaches,
  isBrandTestStatus,
  validateCohortDefinition
} from '../../lib/brandTest';
import { RECOGNIZED_NEED_CODES } from '../../lib/kurlaFit';
import { isOutcomeSignal } from '../../lib/outcomeEvidence';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin, requireBrand, requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.6c2 — ESPACE MARQUE : TESTS PRODUITS CIBLÉS (feature 41).
 *
 * Ce fichier tient trois engagements :
 *
 *  1. **Le refus est explicite.** Une demande qui tente de cibler des personnes
 *     reçoit un 400 qui nomme les clés refusées. Un refus silencieux laisserait
 *     croire que le ciblage a fonctionné.
 *  2. **Une marque ne lit que son rapport.** `GET /api/brand-tests/:id/report`
 *     exige le rôle marque, vérifie la propriété du test, et renvoie un rapport
 *     k-anonyme — jamais une liste de participants.
 *  3. **Le consentement est daté par le serveur.** Ni la date de consentement ni
 *     le statut ne viennent du corps d'une requête.
 */
export function registerBrandTestRoutes(app: Express): void {
  /** Ce qu'une marque peut demander, obtenir — et n'obtiendra jamais. */
  app.get('/api/brand-tests/program', rateLimit('brand-test-program', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      statuses: BRAND_TEST_STATUS_LABELS,
      transitions: BRAND_TEST_TRANSITIONS,
      cohort: {
        allowedKeys: COHORT_ALLOWED_KEYS,
        refusedKeys: FORBIDDEN_COHORT_KEYS,
        needCodes: RECOGNIZED_NEED_CODES,
        rule: 'Une cohorte se définit par des besoins. KURLA ne cible pas des personnes.'
      },
      publication: {
        kThreshold: BRAND_TEST_K_THRESHOLD,
        rule: 'Une cellule sous le seuil k est absente du rapport. Sous k au total, aucune distribution n’est publiée.'
      },
      neverProvided: [
        'Aucune liste de participants',
        'Aucune adresse e-mail, aucun identifiant, aucune coordonnée',
        'Aucun profil individuel, aucun historique de commande',
        'Aucune revente de données personnelles'
      ],
      caveats: BRAND_TEST_CAVEATS
    });
  }));

  /** Dépôt d'une demande. La cohorte est validée avant tout le reste. */
  app.post('/api/brand-tests/apply', rateLimit('brand-test-apply', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const brandName = typeof req.body?.brandName === 'string' ? req.body.brandName.trim() : '';
    const contactEmail = typeof req.body?.contactEmail === 'string' ? req.body.contactEmail.trim() : '';
    const productName = typeof req.body?.productName === 'string' ? req.body.productName.trim() : '';
    const hypothesis = typeof req.body?.hypothesis === 'string' ? req.body.hypothesis.trim() : '';
    const targetParticipants = Number(req.body?.targetParticipants);
    const durationDays = Number(req.body?.durationDays);

    if (brandName.length < 2 || brandName.length > 120) {
      res.status(400).json({ error: 'Le nom de la marque doit faire entre 2 et 120 caractères.' });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
      res.status(400).json({ error: 'Une adresse e-mail de contact valide est obligatoire.' });
      return;
    }
    if (!productName) {
      res.status(400).json({ error: 'Le produit testé est obligatoire.' });
      return;
    }
    if (hypothesis.length < 20) {
      res.status(400).json({ error: 'Formulez l’hypothèse en 20 caractères au minimum : c’est la question à laquelle le test doit répondre.' });
      return;
    }
    if (!Number.isInteger(targetParticipants) || targetParticipants < BRAND_TEST_K_THRESHOLD) {
      res.status(400).json({
        error: `La cible doit atteindre au moins ${BRAND_TEST_K_THRESHOLD} participants : sous ce seuil, aucun résultat n’est publiable.`
      });
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 7 || durationDays > 180) {
      res.status(400).json({ error: 'La durée doit être comprise entre 7 et 180 jours.' });
      return;
    }

    const validation = validateCohortDefinition(req.body?.cohort, [...RECOGNIZED_NEED_CODES]);
    if (validation.ok === false) {
      // Le refus nomme les clés : la marque sait exactement ce qui est interdit.
      res.status(400).json({ error: validation.reason, refusedKeys: validation.refusedKeys });
      return;
    }

    const breaches = brandTestReportBreaches({ caveats: [], productName, hypothesis });
    if (breaches.length > 0) {
      res.status(400).json({
        error: `Le vocabulaire de la preuve est refusé (${breaches.join(', ')}). Un test de résultats déclarés ne prouve rien.`,
        refusedWords: breaches
      });
      return;
    }

    /**
     * CHANTIER 12 (bloc D) — refus nommé avant d'aller plus loin : la marque
     * doit savoir ce qui lui manque (contrat non émis, non signé, ou signé pour
     * une version de texte périmée), pas recevoir une erreur générique.
     */
    const contractGate = await serverDb.resolveBrandContractEligibility(user.id);
    if (!contractGate.eligible) {
      res.status(422).json({
        error: 'Un contrat marque signé est requis avant toute demande de test.',
        reason: contractGate.reason,
        contractId: contractGate.contractId ?? null
      });
      return;
    }

    const request = await serverDb.createBrandTestRequest({
      brandUserId: user.id,
      brandName,
      contactEmail,
      productName,
      productId: typeof req.body?.productId === 'string' ? req.body.productId.trim() || null : null,
      hypothesis,
      cohort: validation.cohort,
      targetParticipants,
      durationDays
    });

    res.status(201).json({
      request: {
        id: request.id,
        status: request.status,
        statusLabel: BRAND_TEST_STATUS_LABELS[request.status],
        cohort: request.cohort,
        targetParticipants: request.targetParticipants
      },
      nextSteps: [
        'KURLA examine la demande : pertinence du besoin, absence de conflit d’intérêt.',
        'Le recrutement n’est ouvert qu’après acceptation.',
        'Le rapport final est k-anonyme : aucune donnée personnelle ne vous sera transmise.'
      ]
    });
  }));

  /** Tests ouverts, avec l'éligibilité du membre — sans révéler son profil. */
  app.get('/api/brand-tests/available', rateLimit('brand-test-available', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const eligibility = await serverDb.getBrandTestEligibility(user.id);
    res.json({
      tests: eligibility,
      // Un membre non éligible voit le test et la raison : « vos déclarations ne
      // correspondent pas au besoin ciblé », jamais le détail de son profil.
      note: 'Un test n’est proposé que si vos déclarations correspondent au besoin ciblé.'
    });
  }));

  /** Participation : le consentement est daté ici. */
  app.post('/api/brand-tests/:id/join', rateLimit('brand-test-join', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const participation = await serverDb.joinBrandTest(req.params.id, user.id);
      res.status(201).json({ participation: { testId: participation.testId, consentAt: participation.consentAt } });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'Participation refusée.' });
    }
  }));

  /** Retrait : il retire aussi les déclarations du membre des agrégats. */
  app.post('/api/brand-tests/:id/withdraw', rateLimit('brand-test-withdraw', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const participation = await serverDb.withdrawFromBrandTest(req.params.id, user.id);
      res.json({
        withdrawnAt: participation.withdrawnAt,
        note: 'Vos déclarations ne sont plus comptées dans le rapport. Votre retrait reste compté, sans vous identifier.'
      });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'Retrait refusé.' });
    }
  }));

  /** Déclaration d'un résultat. */
  app.post('/api/brand-tests/:id/observations', rateLimit('brand-test-observation', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const signal = typeof req.body?.signal === 'string' ? req.body.signal.trim() : '';
    if (!isOutcomeSignal(signal)) {
      res.status(400).json({ error: 'Signal de résultat inconnu.' });
      return;
    }

    try {
      const observation = await serverDb.declareBrandTestOutcome(req.params.id, user.id, signal);
      res.status(201).json({
        observation: { signal: observation.signal, declaredAt: observation.declaredAt },
        note: 'Un résultat négatif a exactement la même valeur qu’un résultat positif.'
      });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'Déclaration refusée.' });
    }
  }));

  /** Mes demandes. Une marque ne voit que les siennes. */
  app.get('/api/brand-tests/mine', rateLimit('brand-test-mine', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const brand = await requireBrand(req, res);
    if (!brand) return;
    const all = await serverDb.getBrandTestRequests();
    const mine = ['admin', 'superadmin'].includes(brand.role) ? all : all.filter(request => request.brandUserId === brand.id);
    res.json({
      requests: mine.map(request => ({
        id: request.id,
        brandName: request.brandName,
        productName: request.productName,
        status: request.status,
        statusLabel: BRAND_TEST_STATUS_LABELS[request.status],
        cohort: request.cohort,
        targetParticipants: request.targetParticipants,
        durationDays: request.durationDays,
        submittedAt: request.submittedAt,
        adminComment: request.adminComment
      })),
      total: mine.length
    });
  }));

  /** Rapport k-anonyme. Rôle marque, propriété vérifiée. */
  app.get('/api/brand-tests/:id/report', rateLimit('brand-test-report', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const brand = await requireBrand(req, res);
    if (!brand) return;

    const request = await serverDb.getBrandTestRequest(req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Test introuvable.', code: 'BRAND_TEST_NOT_FOUND' });
      return;
    }
    // Une marque ne lit pas le test d'une autre marque. Un test inexistant et un
    // test appartenant à autrui renvoient la même réponse.
    if (request.brandUserId !== brand.id && !['admin', 'superadmin'].includes(brand.role)) {
      res.status(404).json({ error: 'Test introuvable.', code: 'BRAND_TEST_NOT_FOUND' });
      return;
    }

    const report = await serverDb.buildBrandTestReportForRequest(req.params.id);
    res.json({
      report,
      // Le rapport dit lui-même ce qu'il n'est pas.
      publishable: report.totals.publishable,
      suppressedCells: report.totals.suppressedCells
    });
  }));

  /** Administration : toutes les demandes. */
  app.get('/api/admin/brand-tests', rateLimit('admin-brand-tests', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const requests = await serverDb.getBrandTestRequests();
    res.json({ requests, total: requests.length });
  }));

  /** Administration : transition d'une demande. */
  app.post('/api/admin/brand-tests/:id/review', rateLimit('admin-brand-test-review', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = req.body?.status;
    if (!isBrandTestStatus(status)) {
      res.status(400).json({ error: 'Statut inconnu.' });
      return;
    }

    try {
      const updated = await serverDb.reviewBrandTestRequest(
        req.params.id,
        status,
        typeof req.body?.adminComment === 'string' ? req.body.adminComment : undefined
      );
      res.json({
        request: updated,
        statusLabel: BRAND_TEST_STATUS_LABELS[updated.status],
        transitions: BRAND_TEST_TRANSITIONS[updated.status]
      });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'Revue refusée.' });
    }
  }));
}
