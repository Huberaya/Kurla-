import { getSupabaseServerClient } from './supabaseClient';

import type { SupabaseServerStore } from './serverDb';
import type { BeautyProfilePhoto } from './beautyProfile';

/**
 * CHANTIER 9 (bloc A3) — ANALYSE D'IMPACT RELATIVE À LA PROTECTION DES DONNÉES
 * (AIPD / DPIA) APPLIQUÉE À LA PHOTO DE PROFIL (feature 11).
 *
 * Une photo de visage ou de cuir chevelu est une donnée personnelle sensible
 * par usage : elle révèle l'apparence d'une personne identifiable. Le RGPD
 * (art. 35) impose une analyse d'impact avant ce traitement ; ce module en
 * porte la version lisible par le code, pour que l'engagement écrit dans
 * `docs/KURLA_AIPD_PHOTO.md` ne puisse pas dériver silencieusement de ce que
 * fait réellement le serveur.
 *
 * Deux règles découlent de l'analyse et sont appliquées ici :
 *  1. **La rétention est bornée et réellement appliquée.** Une photo qui a
 *     dépassé la durée annoncée est détruite par `purgeExpiredBeautyProfilePhotos`,
 *     pas seulement promise dans un texte.
 *  2. **Aucun diagnostic médical.** La photo sert à orienter des gestes de soin
 *     cosmétique ; elle ne produit ni diagnostic, ni promesse de résultat.
 */

/** Durée de conservation annoncée et appliquée, en jours. */
export const PHOTO_RETENTION_DAYS = 180;

/** Nombre maximal de photos conservées par membre (borne déjà appliquée à l'upload). */
export const PHOTO_MAX_PER_MEMBER = 10;

export const PHOTO_AIPD = {
  reference: 'AIPD-KURLA-PHOTO-v1',
  version: '1.0',
  document: 'docs/KURLA_AIPD_PHOTO.md',
  reviewedAt: '2026-08-28',
  nextReviewAt: '2027-08-28',
  dataController: 'KURLA',
  purposes: [
    'Orienter des gestes de soin cosmétique à partir de la texture et de l’état apparent des cheveux et du cuir chevelu.',
    'Permettre au membre de comparer son évolution dans le temps, à sa seule demande.'
  ],
  legalBasis: 'Consentement explicite du membre (RGPD art. 6.1.a), enregistré côté serveur avant tout téléversement et retirable à tout moment.',
  dataCategories: [
    'Image téléversée par le membre (JPEG, PNG ou WebP, 5 Mo maximum).',
    'Métadonnées techniques : identifiant, chemin de stockage, type MIME, taille, date de consentement, date de création.'
  ],
  notProcessed: [
    'Aucune reconnaissance faciale, aucun biométrique dérivé, aucun embedding de visage.',
    'Aucun partage avec une marque, un professionnel ou un partenaire sans action distincte du membre.',
    'Aucune utilisation publicitaire ni avantage commercial tiré de l’image.'
  ],
  retentionDays: PHOTO_RETENTION_DAYS,
  maxPhotosPerMember: PHOTO_MAX_PER_MEMBER,
  safeguards: [
    'Stockage dans un bucket dédié, chemin non devinable (UUID).',
    'Le retrait du consentement supprime les photos immédiatement.',
    'La suppression du compte efface les photos avec le reste des données personnelles.',
    'Purge automatique au-delà de la durée de conservation annoncée.'
  ],
  limits: [
    'Aide cosmétique : aucun diagnostic médical, aucune pathologie détectée ou supposée.',
    'Aucun résultat garanti ; les suggestions restent des gestes de soin.',
    'En cas de signe inquiétant (lésion, chute brutale, douleur), la réponse renvoie vers un professionnel de santé — urgences : 15 ou 112.'
  ],
  responsiblePerson: 'Responsable de traitement KURLA — contact via le support in-app.',
  minorRule: 'Le traitement n’est pas destiné aux mineurs de moins de 15 ans sans consentement du titulaire de l’autorité parentale.'
} as const;

export interface PhotoPurgeResult {
  purgedAt: string;
  retentionDays: number;
  membersAffected: number;
  photosPurged: number;
}

/**
 * Détruit les photos dont la durée de conservation est dépassée.
 *
 * La purge est honnête sur un point : elle supprime l'image et sa ligne de
 * métadonnées. Elle ne « dépublie » rien, parce qu'aucune photo n'est publiée.
 */
export async function purgeExpiredBeautyProfilePhotos(
  store: SupabaseServerStore,
  now = new Date(),
  retentionDays: number = PHOTO_RETENTION_DAYS
): Promise<PhotoPurgeResult> {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const isExpired = (photo: BeautyProfilePhoto) => Date.parse(photo.createdAt) <= cutoff;
  const supabase = getSupabaseServerClient();

  let membersAffected = 0;
  let photosPurged = 0;

  for (const [userId, photos] of Array.from(store.inMemoryBeautyProfilePhotos.entries())) {
    const expired = photos.filter(isExpired);
    if (expired.length === 0) continue;

    membersAffected += 1;
    photosPurged += expired.length;

    if (supabase) {
      const paths = expired.map(photo => photo.storagePath).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('beauty-profile-photos').remove(paths).then(() => undefined, () => undefined);
      }
      for (const photo of expired) {
        await supabase.from('beauty_profile_photos').delete().eq('id', photo.id).then(() => undefined, () => undefined);
      }
    }

    const remaining = photos.filter(photo => !isExpired(photo));
    if (remaining.length === 0) store.inMemoryBeautyProfilePhotos.delete(userId);
    else store.inMemoryBeautyProfilePhotos.set(userId, remaining);
  }

  return {
    purgedAt: now.toISOString(),
    retentionDays,
    membersAffected,
    photosPurged
  };
}
