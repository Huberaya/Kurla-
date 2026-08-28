import type { Express } from 'express';

import express from 'express';

import { calculateKurlaFit } from '../../lib/kurlaFit';
import { isSupabaseServerConfigured } from '../../lib/supabaseClient';
import {
  BeautyProfilePhoto,
  calculateProfileConfidence,
  createEmptyBeautyProfile,
  normalizeBeautyProfile,
} from '../../lib/beautyProfile';
import { serverDb } from '../../lib/serverDb';
import { asyncRoute, isUuid, rateLimit, safeApiError } from '../http';
import { PHOTO_AIPD, PHOTO_RETENTION_DAYS } from '../../lib/photoAipd';
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
      const profile = normalizeBeautyProfile(req.body.profile);
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
      const products = await serverDb.getProducts();
      const routineState = await serverDb.getAdaptiveRoutineState(user.id);
      const recentFeedback = routineState.feedback.slice(0, 30);
      const hasSafetySignal = recentFeedback.some(item => item.signal === 'reaction' || item.signal === 'scalp_itchy');
      const affectedLabels = recentFeedback
        .filter(item => item.signal === 'reaction' || item.signal === 'product_heavy')
        .map(item => item.productLabel?.toLowerCase())
        .filter((label): label is string => !!label);
      const recommendations = hasSafetySignal ? [] : products
        .filter((product: any) => !affectedLabels.some(label => `${product.name} ${product.brand || ''}`.toLowerCase().includes(label)))
        .map((product: any) => ({
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
          fit: calculateKurlaFit(product, record.profile)
        }))
        .filter(item => item.fit.score !== null)
        .sort((a, b) => (b.fit.score || 0) - (a.fit.score || 0))
        .slice(0, 8);
      res.json({
        recommendations,
        confidence: record.confidence,
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
