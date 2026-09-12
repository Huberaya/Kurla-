import type { Express } from 'express';

import { createHash } from 'node:crypto';
import express from 'express';

import { calculateKurlaFit } from '../../lib/kurlaFit';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '../../lib/supabaseClient';
import {
  BeautyProfilePhoto,
  calculateProfileConfidence,
  createEmptyBeautyProfile,
  mergeBeautyProfile,
  normalizeBeautyProfile,
} from '../../lib/beautyProfile';
import { serverDb } from '../../lib/serverDb';
import { intelligenceStore } from '../../lib/intelligenceStore';
import {
  MINIMUM_OBSERVATIONS_FOR_ADJUSTMENT,
  learnIngredientWeights,
  learnedOutcomeAdjustmentsForProduct,
  type LearnedWeight,
} from '../../lib/recommendationEngine';
import { asyncRoute, isUuid, rateLimit, safeApiError } from '../http';
import { PHOTO_AIPD, PHOTO_RETENTION_DAYS } from '../../lib/photoAipd';
import {
  PHOTO_PILOT_MAX_PER_MEMBER_30_DAYS,
  PHOTO_PILOT_MAX_PER_PHOTO,
  PHOTO_PILOT_PHOTOTYPE_TO_FITZPATRICK,
  PHOTO_PILOT_PROMPT_VERSION,
  PHOTO_PILOT_REQUIRED_STRATA,
  PHOTO_PILOT_SCHEMA_VERSION,
  PHOTO_PILOT_QUALITY_VERSION,
  PHOTO_PILOT_RULES_VERSION,
  PHOTO_PILOT_SCOPE,
  assessPhotoQuality,
  photoPilotProvenance,
  runPhotoPilot,
  validatePhotoPilotMetadata
} from '../../lib/photoPilot';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';
import type { Response } from 'express';

/**
 * CHANTIER 8.1 — profil beauté KURLA ID, extrait de `server.ts`. Chemins
 * inchangés.
 */

export function registerBeautyProfileRoutes(app: Express): void {
  // KURLA ID BEAUTY PROFILE API
  // ============================================================
  app.get('/api/beauty-profile', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const record = await serverDb.getBeautyProfile(user.id);
      const profile = record?.profile || createEmptyBeautyProfile();
      const confidence = record?.confidence || calculateProfileConfidence(profile);
      const [history, photos] = await Promise.all([
        serverDb.getBeautyProfileHistory(user.id),
        serverDb.getBeautyProfilePhotos(user.id)
      ]);
      res.json({
        profile,
        confidence,
        history,
        photos,
        source: isSupabaseServerConfigured() ? 'supabase' : 'server_fallback'
      });
    } catch (err) {
      console.error('[BeautyProfile] read error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de charger votre profil beauté.') });
    }
  }));

  app.put('/api/beauty-profile', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!req.body?.profile || typeof req.body.profile !== 'object') {
      return res.status(400).json({ error: 'Profil beauté invalide.' });
    }
    try {
      /**
       * Le `PUT` remplaçait le profil entier : un appelant partiel — le
       * diagnostic peau, qui n'écrit que la peau — effaçait le profil
       * cheveux et l'environnement de l'utilisatrice. On charge l'existant
       * et on fusionne, pour que tout appelant partiel soit sûr.
       */
      const currentRecord = await serverDb.getBeautyProfile(user.id);
      const current = currentRecord?.profile || createEmptyBeautyProfile();
      const profile = mergeBeautyProfile(current, req.body.profile);
      const record = await serverDb.saveBeautyProfile(user.id, profile, 'user');
      if (!profile.photoConsent) await serverDb.deleteBeautyProfilePhotos(user.id);
      const photos = await serverDb.getBeautyProfilePhotos(user.id);
      res.json({ profile: record.profile, confidence: record.confidence, photos });
    } catch (err) {
      console.error('[BeautyProfile] save error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible d’enregistrer votre profil beauté.') });
    }
  }));

  app.get('/api/beauty-profile/history', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      res.json({ history: await serverDb.getBeautyProfileHistory(user.id) });
    } catch (err) {
      console.error('[BeautyProfile] history error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de charger l’historique du profil.') });
    }
  }));

  app.post('/api/beauty-profile/photos', express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '5mb'
  }), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    if (req.headers['x-photo-consent'] !== 'true') {
      return res.status(400).json({ error: 'Le consentement photo est requis.' });
    }
    const record = await serverDb.getBeautyProfile(user.id);
    if (!record?.profile.photoConsent) {
      return res.status(400).json({ error: 'Enregistrez d’abord votre consentement dans le profil beauté.' });
    }
    const contentType = req.headers['content-type'];
    if (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') {
      return res.status(400).json({ error: 'Format photo non pris en charge.' });
    }
    const rawBody = req.body as Buffer | Uint8Array;
    if (!rawBody || typeof rawBody.byteLength !== 'number' || rawBody.byteLength === 0 || rawBody.byteLength > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Photo vide ou trop volumineuse (5 Mo maximum).' });
    }
    const bytes = Buffer.from(rawBody);
    const isJpeg = contentType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = contentType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp = contentType === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) return res.status(400).json({ error: 'Le contenu de la photo ne correspond pas à son format déclaré.' });

    try {
      const photo = await serverDb.uploadBeautyProfilePhoto(user.id, bytes, contentType as BeautyProfilePhoto['mimeType'], new Date().toISOString());
      // La réponse rappelle l'encadrement : durée réelle de conservation et
      // référence de l'analyse d'impact, pour que l'engagement soit visible au
      // moment où l'image est envoyée, pas seulement dans un texte juridique.
      res.status(201).json({
        photo,
        aipdReference: PHOTO_AIPD.reference,
        retentionDays: PHOTO_RETENTION_DAYS,
        limits: PHOTO_AIPD.limits
      });
    } catch (err) {
      console.error('[BeautyProfile] photo upload error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de stocker cette photo.') });
    }
  }));

  app.post('/api/beauty-profile/photos/:photoId/analyze', rateLimit('photo-ai-pilot', 12, 60 * 60 * 1000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const photoId = String(req.params.photoId);
    const [profileRecord, photo] = await Promise.all([
      serverDb.getBeautyProfile(user.id),
      serverDb.getBeautyProfilePhoto(user.id, photoId)
    ]);
    if (!photo) return res.status(404).json({ error: 'Photo introuvable ou non autorisée.' });
    // Le pilote ne crée pas un nouveau consentement : il réutilise le
    // consentement photo AIPD enregistré sur le profil, qui doit rester actif.
    if (!profileRecord?.profile.photoConsent) return res.status(400).json({ error: 'Le consentement photo AIPD doit être actif pour analyser cette photo.' });

    const raw = await serverDb.getBeautyProfilePhotoBytes(user.id, photoId);
    if (!raw) return res.status(503).json({ status: 'PHOTO_BYTES_UNAVAILABLE', error: 'Le contenu privé de la photo est indisponible ; aucune analyse n’a été simulée.' });
    const inputSha256 = createHash('sha256').update(Buffer.from(raw)).digest('hex');
    const existing = await serverDb.listPhotoAiAnalyses(user.id, photoId);
    if (existing.length >= PHOTO_PILOT_MAX_PER_PHOTO) {
      return res.status(409).json({ status: 'PHOTO_ANALYSIS_LIMIT', error: 'Cette photo a déjà fait l’objet du nombre maximal d’analyses du pilote.', provenance: existing[0] });
    }
    const recent = (await serverDb.listPhotoAiAnalyses(user.id)).filter(item => Date.parse(item.createdAt) >= Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (recent.length >= PHOTO_PILOT_MAX_PER_MEMBER_30_DAYS) {
      return res.status(429).json({ status: 'PHOTO_ANALYSIS_LIMIT', error: 'La limite du pilote est atteinte pour ce compte sur 30 jours.' });
    }

    const metadataResult = validatePhotoPilotMetadata(req.body);
    const requestedMetadata = metadataResult.ok ? metadataResult.metadata : undefined;
    const phototypeMatchesC5 = metadataResult.ok
      && profileRecord.profile.skin.phototypeConsent === true
      && typeof profileRecord.profile.skin.phototype === 'number'
      && PHOTO_PILOT_PHOTOTYPE_TO_FITZPATRICK[metadataResult.metadata.phototype] === profileRecord.profile.skin.phototype;
    const metadata = phototypeMatchesC5 && metadataResult.ok ? metadataResult.metadata : undefined;
    const metadataError = 'message' in metadataResult
      ? metadataResult.message
      : 'Le phototype du pilote doit correspondre au phototype C5 déclaré avec son consentement explicite.';
    const versionData = {
      scope: PHOTO_PILOT_SCOPE,
      promptVersion: PHOTO_PILOT_PROMPT_VERSION,
      rulesVersion: PHOTO_PILOT_RULES_VERSION,
      responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
      qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
      inputSha256,
      photoSourceId: photoId,
      userId: user.id,
      declaredPhototype: requestedMetadata?.phototype,
      declaredLighting: requestedMetadata?.lighting,
      phototypeSource: 'member_declared',
      lightingSource: 'member_declared',
      independentValidation: { status: 'pilot_stratified_not_validated', protocol: 'C8-photo-pilot-validation-v1', requiredStrata: PHOTO_PILOT_REQUIRED_STRATA }
    };
    if (!metadata) {
      const analysis = await serverDb.createPhotoAiAnalysis({
        userId: user.id,
        photoId,
        status: 'metadata_rejected',
        scope: PHOTO_PILOT_SCOPE,
        provider: 'none',
        model: 'none',
        promptVersion: PHOTO_PILOT_PROMPT_VERSION,
        rulesVersion: PHOTO_PILOT_RULES_VERSION,
        responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
        qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
        inputSha256,
        declaredPhototype: requestedMetadata?.phototype,
        declaredLighting: requestedMetadata?.lighting,
        errorCode: 'INVALID_PILOT_METADATA'
      });
      return res.status(422).json({ status: 'PHOTO_METADATA_REJECTED', error: metadataError, analysis, provenance: versionData });
    }

    const quality = assessPhotoQuality(raw, photo.mimeType);
    if (!quality.accepted) {
      const analysis = await serverDb.createPhotoAiAnalysis({
        userId: user.id,
        photoId,
        status: 'quality_rejected',
        scope: PHOTO_PILOT_SCOPE,
        provider: 'none',
        model: 'none',
        promptVersion: PHOTO_PILOT_PROMPT_VERSION,
        rulesVersion: PHOTO_PILOT_RULES_VERSION,
        responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
        qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
        inputSha256,
        declaredPhototype: metadata.phototype,
        declaredLighting: metadata.lighting,
        quality: quality as unknown as Record<string, unknown>,
        errorCode: quality.code
      });
      return res.status(422).json({ status: 'PHOTO_QUALITY_REJECTED', error: quality.message, quality, analysis, provenance: { ...versionData, declaredPhototype: metadata.phototype, declaredLighting: metadata.lighting } });
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      const analysis = await serverDb.createPhotoAiAnalysis({
        userId: user.id,
        photoId,
        status: 'provider_unconfigured',
        scope: PHOTO_PILOT_SCOPE,
        provider: 'none',
        model: 'none',
        promptVersion: PHOTO_PILOT_PROMPT_VERSION,
        rulesVersion: PHOTO_PILOT_RULES_VERSION,
        responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
        qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
        inputSha256,
        declaredPhototype: metadata.phototype,
        declaredLighting: metadata.lighting,
        quality: quality as unknown as Record<string, unknown>,
        errorCode: 'AI_NOT_CONFIGURED'
      });
      return res.status(503).json({ status: 'AI_NOT_CONFIGURED', error: 'Le provider d’analyse photo n’est pas configuré ; aucun résultat IA n’a été fabriqué.', analysis, provenance: { ...versionData, provider: 'none', model: 'none', declaredPhototype: metadata.phototype, declaredLighting: metadata.lighting } });
    }

    try {
      const result = await runPhotoPilot(raw, photo.mimeType as 'image/jpeg' | 'image/png', metadata);
      const provenance = { ...photoPilotProvenance(inputSha256, metadata, result.model), photoSourceId: photoId, userId: user.id };
      const analysis = await serverDb.createPhotoAiAnalysis({
        userId: user.id,
        photoId,
        status: 'completed',
        scope: PHOTO_PILOT_SCOPE,
        provider: result.provider,
        model: result.model,
        promptVersion: PHOTO_PILOT_PROMPT_VERSION,
        rulesVersion: PHOTO_PILOT_RULES_VERSION,
        responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
        qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
        inputSha256,
        declaredPhototype: metadata.phototype,
        declaredLighting: metadata.lighting,
        quality: quality as unknown as Record<string, unknown>,
        output: result.output as unknown as Record<string, unknown>,
        completedAt: new Date().toISOString()
      });
      return res.status(200).json({
        status: 'COMPLETED_COSMETIC_PILOT',
        analysis,
        provenance,
        output: result.output,
        disclosure: 'Cette aide cosmétique expérimentale n’est ni un diagnostic, ni une détection de pathologie, ni une évaluation médicale.'
      });
    } catch (error) {
      const errorCode = error instanceof Error && error.message === 'PHOTO_AI_INVALID_JSON' ? 'AI_INVALID_JSON' : 'AI_PROVIDER_ERROR';
      const analysis = await serverDb.createPhotoAiAnalysis({
        userId: user.id,
        photoId,
        status: 'provider_failed',
        scope: PHOTO_PILOT_SCOPE,
        provider: 'google_gemini',
        model: process.env.GEMINI_MODEL?.trim() || 'configured_model',
        promptVersion: PHOTO_PILOT_PROMPT_VERSION,
        rulesVersion: PHOTO_PILOT_RULES_VERSION,
        responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
        qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
        inputSha256,
        declaredPhototype: metadata.phototype,
        declaredLighting: metadata.lighting,
        quality: quality as unknown as Record<string, unknown>,
        errorCode
      });
      console.error('[PhotoAI] provider error:', error);
      return res.status(503).json({ status: 'AI_PROVIDER_ERROR', error: 'Le provider d’analyse photo n’a pas fourni de résultat exploitable ; aucune sortie IA n’est présentée.', analysis, provenance: { ...versionData, provider: 'google_gemini', model: process.env.GEMINI_MODEL?.trim() || 'configured_model', declaredPhototype: metadata.phototype, declaredLighting: metadata.lighting } });
    }
  }));

  app.get('/api/beauty-profile/photos/:photoId/url', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const photo = await serverDb.getBeautyProfilePhoto(user.id, String(req.params.photoId));
    if (!photo) return res.status(404).json({ error: 'Photo introuvable ou non autorisée.' });
    const supabase = getSupabaseServerClient();
    if (!supabase) return res.status(503).json({ error: 'Photo distante indisponible en mode mémoire.' });
    const { data, error } = await supabase.storage.from('beauty-profile-photos').createSignedUrl(photo.storagePath, 3600);
    if (error || !data?.signedUrl) return res.status(503).json({ error: 'URL temporaire de photo indisponible.' });
    res.json({ url: data.signedUrl, expiresInSeconds: 3600 });
  }));

  app.delete('/api/beauty-profile/photos/:photoId', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      await serverDb.deleteBeautyProfilePhoto(user.id, String(req.params.photoId));
      res.json({ success: true });
    } catch (err) {
      console.error('[BeautyProfile] single photo deletion error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de supprimer cette photo.') });
    }
  }));

  app.delete('/api/beauty-profile/photos', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      await serverDb.deleteBeautyProfilePhotos(user.id);
      const current = await serverDb.getBeautyProfile(user.id);
      if (current?.profile.photoConsent) {
        await serverDb.saveBeautyProfile(user.id, { ...current.profile, photoConsent: false }, 'photo_consent_withdrawn');
      }
      res.json({ success: true });
    } catch (err) {
      console.error('[BeautyProfile] photo deletion error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de supprimer les photos du profil.') });
    }
  }));

  app.delete('/api/beauty-profile', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      await serverDb.deleteBeautyProfile(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[BeautyProfile] deletion error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de supprimer votre profil beauté.') });
    }
  }));

  app.get('/api/beauty-recommendations', asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const record = await serverDb.getBeautyProfile(user.id);
      if (!record) return res.json({ recommendations: [], message: 'Complétez votre profil pour calculer KURLA Fit.' });
      const [products, routineState, observations] = await Promise.all([
        serverDb.getProducts(),
        serverDb.getAdaptiveRoutineState(user.id),
        intelligenceStore.getOutcomes(user.id)
      ]);
      // L4 — la boucle PROFILE → FEEDBACK → LEARN se referme sur la vue
      // cliente : les pondérations apprises depuis SES observations
      // réordonnent le KURLA Fit (même règle et même seuil que le moteur).
      const learnedWeights: Map<string, LearnedWeight> =
        observations.length > 0 ? learnIngredientWeights(observations) : new Map<string, LearnedWeight>();
      const recentFeedback = routineState.feedback.slice(0, 30);
      const hasSafetySignal = recentFeedback.some(item => item.signal === 'reaction' || item.signal === 'scalp_itchy');
      const affectedLabels = recentFeedback
        .filter(item => item.signal === 'reaction' || item.signal === 'product_heavy')
        .map(item => item.productLabel?.toLowerCase())
        .filter((label): label is string => !!label);
      let adjustedProducts = 0;
      const recommendations = hasSafetySignal ? [] : products
        .filter((product: any) => !affectedLabels.some(label => `${product.name} ${product.brand || ''}`.toLowerCase().includes(label)))
        .map((product: any) => {
          const fit = calculateKurlaFit(product, record.profile);
          const learned = learnedOutcomeAdjustmentsForProduct(product, learnedWeights);
          if (learned.length > 0) adjustedProducts += 1;
          const delta = learned.reduce((sum, adjustment) => sum + adjustment.delta, 0);
          return {
            product: {
              id: product.id,
              slug: product.slug,
              name: product.name,
              brand: product.brand,
              price: product.price,
              image: product.image,
              category: product.category,
              description: product.description
            },
            fit: {
              ...fit,
              score: fit.score === null ? null : Math.max(0, Math.min(100, Math.round(fit.score + delta))),
              // Les raisons apprises d'abord : c'est le signal le plus récent
              // de la boucle (le feedback de la cliente prime le profil statique).
              reasons: [...learned.map(adjustment => adjustment.reason), ...fit.reasons],
              learned: learned.length > 0
            }
          };
        })
        .filter(item => item.fit.score !== null)
        .sort((a, b) => (b.fit.score || 0) - (a.fit.score || 0))
        .slice(0, 8);
      res.json({
        recommendations,
        confidence: record.confidence,
        learning: {
          observationCount: observations.length,
          adjustedProducts,
          minimumObservationsPerIngredient: MINIMUM_OBSERVATIONS_FOR_ADJUSTMENT
        },
        routineAdaptation: hasSafetySignal
          ? 'Une réaction ou des démangeaisons ont été signalées : aucune nouvelle recommandation produit n’est proposée avant observation ou avis professionnel.'
          : affectedLabels.length > 0
            ? 'Les produits signalés comme alourdissants ou réactifs sont écartés lorsqu’ils sont identifiables.'
            : routineState.plan?.adaptationNotes || []
      });
    } catch (err) {
      console.error('[BeautyRecommendations] error:', err);
      res.status(500).json({ error: safeApiError(err, 'Impossible de calculer vos recommandations.') });
    }
  }));
}
