import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import {
  ATTRIBUTION_VALUES,
  CONTRADICTION_PENALTY_PER_UNIT,
  attributionRequiresSignal,
  CREATOR_KIND_LABELS,
  CREATOR_PROGRAM_DISCLAIMERS,
  CREATOR_STATUS_LABELS,
  CREATOR_TRANSITIONS,
  MIN_CONTRIBUTIONS_TO_RANK,
  MIN_OUTCOMES_FOR_PAYOUT,
  NEGATIVE_SHARE_REVIEW_THRESHOLD,
  PAYOUT_RATE_CENTS_PER_OUTCOME,
  STANDING_CAPS,
  VISIBILITY_WEIGHTS,
  isAttributionEvent,
  isCreatorKind,
  isCreatorStatus
} from '../../lib/creatorProgram';
import { isOutcomeSignal } from '../../lib/outcomeEvidence';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin, requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.6c1 — PROGRAMME EXPERTS / CRÉATEURS (features 39 et 40).
 *
 * Trois choses sont assumées dans ce fichier :
 *
 *  1. **Les règles sont publiées.** `GET /api/creators/program` renvoie les
 *     poids de visibilité, le taux de versement et la valeur de chaque
 *     événement. Un créateur peut vérifier comment il est classé et payé sans
 *     avoir à croire un écran.
 *
 *  2. **Un événement payant exige un signal déclaré.** `POST /api/creators/attributions`
 *     refuse un `outcome_declared` sans signal reconnu : ce qui déclenche un
 *     versement doit être un fait qualifié, pas un compteur incrémenté.
 *
 *  3. **Personne ne peut se publier.** Une candidature naît `applied` ; passer à
 *     `published` exige `verified`, contrôlé par `canTransitionCreator` puis
 *     rejoué par la base.
 */
export function registerCreatorRoutes(app: Express): void {
  /** Les règles du programme, lisibles sans compte. */
  app.get('/api/creators/program', rateLimit('creator-program', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      kinds: CREATOR_KIND_LABELS,
      statuses: CREATOR_STATUS_LABELS,
      transitions: CREATOR_TRANSITIONS,
      visibility: {
        weights: VISIBILITY_WEIGHTS,
        caps: STANDING_CAPS,
        contradictionPenaltyPerUnit: CONTRADICTION_PENALTY_PER_UNIT,
        minContributionsToRank: MIN_CONTRIBUTIONS_TO_RANK,
        // Aucune de ces clés n'existe : c'est le point.
        purchasableInputs: [] as string[]
      },
      payout: {
        rateCentsPerOutcome: PAYOUT_RATE_CENTS_PER_OUTCOME,
        minOutcomesForPayout: MIN_OUTCOMES_FOR_PAYOUT,
        negativeShareReviewThreshold: NEGATIVE_SHARE_REVIEW_THRESHOLD,
        attributionValues: ATTRIBUTION_VALUES
      },
      disclaimers: CREATOR_PROGRAM_DISCLAIMERS
    });
  }));

  /**
   * Annuaire public. Classé par score de visibilité, c'est-à-dire par
   * contributions vérifiées. Aucun paramètre de tri, de mise en avant ou de
   * placement n'est accepté : il n'y a rien à acheter.
   */
  app.get('/api/creators', rateLimit('creator-directory', 60, 60_000), asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    const directory = await serverDb.getPublicCreatorDirectory();
    res.json({
      creators: directory,
      total: directory.length,
      orderedBy: 'contributions_verifiees',
      // Un annuaire vide est un état honnête : on le dit plutôt que de le remplir.
      note: directory.length === 0
        ? 'Aucun créateur n’a encore été vérifié et publié. Aucun profil n’est ajouté pour remplir la liste.'
        : undefined
    });
  }));

  /** Candidature. Le statut initial est imposé côté serveur. */
  app.post('/api/creators/apply', rateLimit('creator-apply', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
    const kind = req.body?.kind;
    const specialty = typeof req.body?.specialty === 'string' ? req.body.specialty.trim() : '';
    const biography = typeof req.body?.biography === 'string' ? req.body.biography.trim() : '';
    const portfolioUrl = typeof req.body?.portfolioUrl === 'string' ? req.body.portfolioUrl.trim() : '';

    if (displayName.length < 2 || displayName.length > 80) {
      res.status(400).json({ error: 'Le nom affiché doit faire entre 2 et 80 caractères.' });
      return;
    }
    if (!isCreatorKind(kind)) {
      res.status(400).json({ error: 'Le type de profil doit être « expert » ou « creator ».' });
      return;
    }
    if (!specialty) {
      res.status(400).json({ error: 'Le domaine d’expertise est obligatoire.' });
      return;
    }
    if (biography.length < 40) {
      res.status(400).json({ error: 'Présentez votre pratique en 40 caractères au minimum : c’est ce qui sera vérifié.' });
      return;
    }
    if (portfolioUrl && !/^https?:\/\//i.test(portfolioUrl)) {
      res.status(400).json({ error: 'Le lien de portfolio doit être une adresse http ou https.' });
      return;
    }

    const existing = await serverDb.getCreatorApplicationByUser(user.id);
    if (existing) {
      res.status(409).json({
        error: 'Une candidature existe déjà pour ce compte.',
        application: { id: existing.id, status: existing.status, statusLabel: CREATOR_STATUS_LABELS[existing.status] }
      });
      return;
    }

    const application = await serverDb.createCreatorApplication({
      userId: user.id,
      displayName,
      kind,
      specialty,
      biography,
      portfolioUrl: portfolioUrl || null
    });

    res.status(201).json({
      application: {
        id: application.id,
        status: application.status,
        statusLabel: CREATOR_STATUS_LABELS[application.status],
        professionalProfileLinked: application.professionalProfileId !== null
      },
      nextSteps: [
        'KURLA vérifie l’identité et la compétence déclarée.',
        'Rien n’est publié avant cette vérification.',
        'Aucune visibilité ne peut être achetée : elle dérive des contributions vérifiées.'
      ]
    });
  }));

  /** Ma candidature, mon classement et mon versement — avec les compteurs réels. */
  app.get('/api/creators/me', rateLimit('creator-me', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const application = await serverDb.getCreatorApplicationByUser(user.id);
    if (!application) {
      res.status(404).json({ error: 'Aucune candidature créateur pour ce compte.', code: 'CREATOR_NOT_FOUND' });
      return;
    }

    const [standingResult, payoutResult] = await Promise.all([
      serverDb.getCreatorStanding(application.id),
      serverDb.getCreatorPayout(application.id)
    ]);

    res.json({
      application: {
        id: application.id,
        displayName: application.displayName,
        kind: application.kind,
        status: application.status,
        statusLabel: CREATOR_STATUS_LABELS[application.status],
        appliedAt: application.appliedAt,
        verifiedAt: application.verifiedAt,
        publishedAt: application.publishedAt,
        adminComment: application.adminComment
      },
      standing: standingResult.standing,
      payout: {
        payoutCents: payoutResult.payout.payoutCents,
        status: payoutResult.payout.status,
        counts: payoutResult.payout.counts,
        negativeShare: payoutResult.payout.negativeShare,
        explanation: payoutResult.payout.explanation
      }
    });
  }));

  /**
   * Enregistre une attribution. Seuls les résultats déclarés ont une valeur
   * monétaire ; les clics et les achats sont enregistrés pour zéro, et la
   * réponse le dit explicitement plutôt que de laisser croire à un dû.
   */
  app.post('/api/creators/attributions', rateLimit('creator-attribution', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const creatorId = typeof req.body?.creatorId === 'string' ? req.body.creatorId.trim() : '';
    const event = req.body?.event;
    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
    const outcomeSignal = typeof req.body?.outcomeSignal === 'string' ? req.body.outcomeSignal.trim() : '';

    if (!creatorId) {
      res.status(400).json({ error: 'Le créateur concerné est obligatoire.' });
      return;
    }
    if (!isAttributionEvent(event)) {
      res.status(400).json({ error: 'Événement d’attribution inconnu.' });
      return;
    }
    if (attributionRequiresSignal(event) && !isOutcomeSignal(outcomeSignal)) {
      res.status(400).json({
        error: 'Un résultat déclaré exige un signal reconnu : c’est ce signal, et non le clic, qui ouvre un versement.'
      });
      return;
    }

    const creator = await serverDb.getCreatorApplication(creatorId);
    if (!creator) {
      res.status(404).json({ error: 'Créateur introuvable.', code: 'CREATOR_NOT_FOUND' });
      return;
    }

    const attribution = await serverDb.recordCreatorAttribution({
      creatorId,
      event,
      productId: productId || null,
      outcomeSignal: attributionRequiresSignal(event) ? outcomeSignal : null
    });

    res.status(201).json({
      attribution,
      payoutValue: ATTRIBUTION_VALUES[event] ?? 0,
      // Affiché sans détour : trois événements sur quatre ne déclenchent rien.
      note: attributionRequiresSignal(event)
        ? 'Ce résultat déclaré compte pour le versement.'
        : 'Cet événement est enregistré. Il ne déclenche aucun versement : seul un résultat déclaré par un membre en ouvre un.'
    });
  }));

  /** Administration : toutes les candidatures, avec leur classement réel. */
  app.get('/api/admin/creators', rateLimit('admin-creators', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const applications = await serverDb.getCreatorApplications();
    const withStanding = await Promise.all(
      applications.map(async application => {
        const [standingResult, payoutResult] = await Promise.all([
          serverDb.getCreatorStanding(application.id),
          serverDb.getCreatorPayout(application.id)
        ]);
        return {
          application,
          standing: standingResult.standing,
          payoutCents: payoutResult.payout.payoutCents,
          payoutStatus: payoutResult.payout.status
        };
      })
    );

    res.json({ creators: withStanding, total: withStanding.length });
  }));

  /**
   * Administration : revue d'une candidature. Les transitions illégales sont
   * refusées ici puis par la base — publier sans vérifier est impossible des
   * deux côtés.
   */
  app.post('/api/admin/creators/:id/review', rateLimit('admin-creator-review', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = req.body?.status;
    if (!isCreatorStatus(status)) {
      res.status(400).json({ error: 'Statut inconnu.' });
      return;
    }

    try {
      const updated = await serverDb.reviewCreatorApplication(
        req.params.id,
        status,
        typeof req.body?.adminComment === 'string' ? req.body.adminComment : undefined
      );
      res.json({
        application: updated,
        statusLabel: CREATOR_STATUS_LABELS[updated.status],
        transitions: CREATOR_TRANSITIONS[updated.status]
      });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : 'Revue refusée.' });
    }
  }));
}
