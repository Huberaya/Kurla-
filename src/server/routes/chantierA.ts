import type { Express } from 'express';

import { Type } from '@google/genai';

import { intelligenceStore } from '../../lib/intelligenceStore';
import { professionalStore } from '../../lib/professionalStore';
import { serverDb } from '../../lib/serverDb';
import { returnInsightPrompt } from '../../lib/returnInsight';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin, requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';
import type { Response } from 'express';

/**
 * CHANTIER 8.1 — routes du chantier A (« fermer les trous »), extraites de
 * `server.ts`. Chemins inchangés.
 */

export function registerChantierARoutes(app: Express): void {
  // CHANTIER A — Fermer les trous
  // Chaque route ici existe pour sortir une fonction pure de l'état
  // « logique seule » : testée mais jamais appelée par rien.
  // ============================================================

  /**
   * RGPD art. 15 — export en 1 clic. Tout ce que KURLA détient sur l'utilisateur,
   * dans un seul fichier, sans qu'il ait à nous écrire.
   *
   * Les commandes ne sont PAS supprimées par la route de suppression : les
   * obligations comptables et fiscales imposent leur conservation. C'est dit
   * explicitement dans la réponse plutôt que laissé à deviner.
   */
  app.get('/api/me/data', rateLimit('me-data', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const [
      orders,
      returns,
      addresses,
      notifications,
      notificationPreferences,
      beautyProfile,
      beautyProfileHistory,
      aiSessions,
      supportTickets,
      adaptiveRoutine,
      shelf,
      outcomes,
      protectiveStyles,
      washDayCycle
    ] = await Promise.all([
      serverDb.getOrdersByCustomer(user.email, user.id),
      serverDb.getReturnsByUser(user.id),
      serverDb.getShippingAddresses(user.id),
      serverDb.getNotifications(user.id),
      serverDb.getNotificationPreferences(user.id),
      serverDb.getBeautyProfile(user.id),
      serverDb.getBeautyProfileHistory(user.id),
      serverDb.getAiSessions(user.id),
      serverDb.getSupportTicketsByUser(user.id),
      serverDb.getAdaptiveRoutineState(user.id),
      intelligenceStore.getShelf(user.id),
      intelligenceStore.getOutcomes(user.id),
      intelligenceStore.getProtectiveStyles(user.id),
      intelligenceStore.getWashDayCycle(user.id)
    ]);

    const archetype = intelligenceStore.getUserArchetype(user.id);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kurla-export-${user.id}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email, role: user.role },
      data: {
        beautyProfile: beautyProfile ?? null,
        beautyProfileHistory,
        archetype: archetype
          ? { id: archetype.id, labelFr: archetype.labelFr, confidence: archetype.confidence, knownDimensions: archetype.knownDimensions }
          : null,
        shelf,
        outcomeObservations: outcomes,
        protectiveStyles,
        washDayCycle,
        adaptiveRoutine,
        orders,
        returns,
        shippingAddresses: addresses,
        notifications,
        notificationPreferences,
        aiSessions,
        supportTickets
      },
      retention: {
        orders: 'Les commandes et factures sont conservées pour les obligations comptables et fiscales, même après suppression du compte.',
        anonymised: 'Les observations de résultat partagées sont conservées de façon agrégée et k-anonyme : elles ne permettent plus de vous identifier.'
      }
    });
  }));

  /**
   * RGPD art. 17 — suppression en 1 clic. Supprime le profil, les photos, les
   * sessions d'IA, les données d'intelligence et les routines adaptatives.
   * Conserve les commandes (obligation légale) et le déclare.
   */
  app.delete('/api/account', rateLimit('account-delete', 5, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    // Confirmation explicite : une suppression ne doit pas partir sur un clic accidentel.
    const confirm = typeof req.body?.confirm === 'string' ? req.body.confirm.trim().toUpperCase() : '';
    if (confirm !== 'SUPPRIMER') {
      res.status(400).json({
        error: 'Confirmation requise : envoyez { "confirm": "SUPPRIMER" }.',
        retained: ['orders', 'invoices']
      });
      return;
    }

    await serverDb.deleteBeautyProfilePhotos(user.id);
    await serverDb.deleteBeautyProfile(user.id);
    await serverDb.deleteAiSessions(user.id);
    await serverDb.deleteAdaptiveRoutineData(user.id);
    await intelligenceStore.deleteIntelligenceData(user.id);

    res.json({
      deleted: true,
      deletedAt: new Date().toISOString(),
      purged: ['beautyProfile', 'beautyProfilePhotos', 'aiSessions', 'adaptiveRoutine', 'intelligenceData'],
      retained: [
        { what: 'orders', why: 'Obligation comptable et fiscale.' },
        { what: 'invoices', why: 'Obligation comptable et fiscale.' }
      ],
      note: 'La fermeture du compte d’authentification Supabase doit être faite côté admin : un token utilisateur ne peut pas révoquer sa propre session de façon fiable.'
    });
  }));

  /**
   * Note par archétype — la fin de la note globale. Sous le seuil k, la note
   * n'est pas publiée : `computeArchetypeRating` renvoie `publishable: false`
   * avec la raison, et on la transmet telle quelle au lieu de masquer.
   */
  app.get('/api/products/:productId/archetype-ratings', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      res.status(400).json({ error: 'Identifiant produit manquant.' });
      return;
    }
    const ratings = await intelligenceStore.getArchetypeRatingsForProduct(productId);
    const viewerArchetype = req.authUser ? intelligenceStore.getUserArchetype(req.authUser.id) : undefined;
    res.json({
      productId,
      ratings,
      viewerArchetypeId: viewerArchetype?.id ?? null,
      viewerRating: viewerArchetype ? ratings.find(item => item.archetypeId === viewerArchetype.id) ?? null : null,
      note: 'KURLA n’affiche plus de note globale : une note moyenne mélange des cheveux qui ne se ressemblent pas.'
    });
  }));

  /**
   * Réassort prédictif. Sans consommation déclarée, la réponse dit qu'elle ne
   * peut pas estimer — elle ne devine pas.
   */
  app.get('/api/shelf/replenishment', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const weeklyUsagePercent = Number(req.query.weeklyUsagePercent ?? 10);
    const { signals, due } = await intelligenceStore.evaluateShelfReplenishment(user.id, weeklyUsagePercent);

    // Branche le réassort sur les notifications existantes. La clé de déduplication
    // empêche de renvoyer la même alerte à chaque appel.
    for (const signal of due) {
      await serverDb.sendNotification(
        user.id,
        'replenishment',
        'Bientôt à court',
        signal.message,
        '/account/shelf',
        undefined,
        `replenishment:${signal.itemId}`
      );
    }

    res.json({
      weeklyUsagePercent: Number.isFinite(weeklyUsagePercent) ? weeklyUsagePercent : null,
      signals,
      due,
      limitations: signals.filter(signal => signal.daysUntilEmpty === null).length > 0
        ? ['Certains articles n’ont pas de consommation déclarée : aucune date de fin n’est estimée pour eux.']
        : []
    });
  }));

  /**
   * Intelligence des retours — collecte. Un retour est plus informatif qu'un
   * avis : les avis viennent des acheteurs satisfaits.
   */
  app.post('/api/returns/:returnId/insight', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const returnId = String(req.params.returnId || '').trim();
    if (!returnId) {
      res.status(400).json({ error: 'Identifiant de retour manquant.' });
      return;
    }
    const record = await intelligenceStore.recordReturnInsight(user.id, returnId, {
      orderId: req.body?.orderId,
      productId: req.body?.productId,
      reason: req.body?.reason,
      textureMismatch: req.body?.textureMismatch,
      ingredientSuspected: req.body?.ingredientSuspected,
      // Consentement explicite, jamais pré-coché.
      shared: req.body?.shared
    });
    res.status(201).json({ record });
  }));

  /** Le formulaire de retour motivé : la question et ses options, servies par l'API. */
  app.get('/api/returns/insight-prompt', asyncRoute(async (_req: AuthenticatedRequest, res: Response) => {
    res.json(returnInsightPrompt());
  }));

  /** Intelligence des retours — surface admin. Jamais exposée à l'utilisateur. */
  app.get('/api/admin/return-insights/:productId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      res.status(400).json({ error: 'Identifiant produit manquant.' });
      return;
    }
    const soldQuantity = req.query.soldQuantity !== undefined ? Number(req.query.soldQuantity) : undefined;
    const summary = await intelligenceStore.summarizeProductReturns(
      productId,
      Number.isFinite(soldQuantity as number) ? (soldQuantity as number) : undefined
    );
    res.json({ summary });
  }));

  /**
   * Filtrage réglementaire par juridiction. Une même formule peut être légale
   * dans l'UE et interdite ailleurs — c'est un différenciateur d'internationalisation.
   */
  app.post('/api/jurisdiction/assess', rateLimit('jurisdiction', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const jurisdiction = String(req.body?.jurisdiction || '').trim().toUpperCase();
    if (!jurisdiction) {
      res.status(400).json({ error: 'Jurisdiction requise (ex. FR, US, JP).' });
      return;
    }
    const ingredientIds = Array.isArray(req.body?.ingredientIds)
      ? (req.body.ingredientIds as unknown[]).filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];
    const findings = await intelligenceStore.assessJurisdiction(ingredientIds, jurisdiction);
    res.json({
      jurisdiction,
      findings,
      blocked: findings.filter(finding => finding.status === 'prohibited').length,
      limitations: findings.length === 0
        ? ['Aucune restriction connue pour ces ingrédients dans cette juridiction : cela ne vaut pas garantie de conformité.']
        : []
    });
  }));

  /**
   * Co-signature professionnelle. Un professionnel non vérifié ne peut pas
   * co-signer publiquement : sinon l'espace devient publicitaire.
   */
  app.post('/api/endorsements', rateLimit('endorsement', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    // L'identité du professionnel ne vient JAMAIS du corps de la requête. Avant ce
    // correctif, `professionalId`, `professionalName` et surtout
    // `professionalVerified` étaient lus dans le body : n'importe quel compte
    // pouvait forger la co-signature d'un professionnel vérifié.
    const profiles = await professionalStore.getPublicProfessionals();
    const own = profiles.find(profile => profile.userId === user.id);
    if (!own) {
      res.status(403).json({ error: 'Seul un professionnel vérifié peut co-signer une routine.' });
      return;
    }
    if (!own.identityVerified) {
      res.status(403).json({ error: 'Votre identité n’a pas encore été contrôlée par KURLA.' });
      return;
    }

    // La cliente doit avoir un lien réel avec ce professionnel : partage de dossier
    // actif ou rendez-vous. Sinon la co-signature porterait sur une inconnue.
    const clientUserId = typeof req.body?.clientUserId === 'string' ? req.body.clientUserId.trim() : '';
    if (!clientUserId) {
      res.status(400).json({ error: 'La cliente concernée est obligatoire.' });
      return;
    }
    const [activeShares, appointments] = await Promise.all([
      professionalStore.getActiveShares(own.id),
      professionalStore.getAppointments({ professionalId: own.id })
    ]);
    const hasLink = activeShares.some(share => share.clientUserId === clientUserId)
      || appointments.some(appointment => appointment.clientUserId === clientUserId);
    if (!hasLink) {
      res.status(403).json({ error: 'Aucun rendez-vous ni partage de dossier actif avec cette cliente.' });
      return;
    }

    // Une co-signature affichée publiquement exige un consentement daté.
    const clientConsentAt = typeof req.body?.clientConsentAt === 'string' ? req.body.clientConsentAt : undefined;
    const wantsDisplay = req.body?.isDisplayable === true;
    if (wantsDisplay && !clientConsentAt) {
      res.status(400).json({ error: 'Une co-signature affichée publiquement exige le consentement daté de la cliente.' });
      return;
    }

    const endorsement = await intelligenceStore.createEndorsement({
      professionalId: own.id,
      professionalName: own.displayName,
      professionalSpecialty: own.specialty,
      professionalVerified: own.identityVerified,
      clientUserId,
      routinePlanId: typeof req.body?.routinePlanId === 'string' ? req.body.routinePlanId : undefined,
      productId: typeof req.body?.productId === 'string' ? req.body.productId : undefined,
      stance: req.body?.stance,
      rationale: typeof req.body?.rationale === 'string' ? req.body.rationale : '',
      amendments: Array.isArray(req.body?.amendments) ? req.body.amendments : [],
      isDisplayable: wantsDisplay,
      clientConsentAt
    });
    res.status(201).json({ endorsement });
  }));

  /** Ce que le client voit : seulement ce qui est affichable, avec le disclaimer. */
  app.get('/api/products/:productId/endorsements', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      res.status(400).json({ error: 'Identifiant produit manquant.' });
      return;
    }
    const all = await intelligenceStore.getEndorsements({ productId });
    const endorsements = all
      .map(endorsement => ({ endorsement, gate: intelligenceStore.resolveEndorsementDisplay(endorsement) }))
      .filter(entry => entry.gate.allowed)
      .map(entry => ({ ...entry.endorsement, disclaimer: entry.gate.disclaimer }));
    res.json({
      productId,
      endorsements,
      hidden: all.length - endorsements.length,
      note: 'Les co-signatures non vérifiées ou sans consentement client ne sont pas affichées.'
    });
  }));

  /**
   * Ce que l'IA doit faire face à une contradiction professionnelle : s'aligner
   * pour cet utilisateur et signaler le désaccord à l'équipe. Jamais ignorer.
   */
  app.post('/api/endorsements/:endorsementId/apply', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const endorsementId = String(req.params.endorsementId || '').trim();
    const found = (await intelligenceStore.getEndorsements({ clientUserId: user.id }))
      .find(endorsement => endorsement.id === endorsementId);
    if (!found) {
      res.status(404).json({ error: 'Co-signature introuvable pour ce compte.' });
      return;
    }
    res.json({ endorsement: found, action: intelligenceStore.applyProfessionalJudgement(found) });
  }));

  /** Taux d'accord d'un professionnel avec l'IA : la métrique d'honnêteté de KURLA. */
  app.get('/api/professionals/:professionalId/endorsement-impact', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const professionalId = String(req.params.professionalId || '').trim();
    if (!professionalId) {
      res.status(400).json({ error: 'Identifiant professionnel manquant.' });
      return;
    }
    const endorsements = await intelligenceStore.getEndorsements({ professionalId });
    res.json({ professionalId, impact: intelligenceStore.getProfessionalImpact(professionalId, endorsements) });
  }));

  // ============================================================
}
