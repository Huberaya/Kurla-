import { randomUUID } from 'node:crypto';

import {
  BeautyProfileHistoryEntry,
  BeautyProfilePhoto,
  BeautyProfileRecord,
  ProfileConfidence,
  calculateProfileConfidence,
  normalizeBeautyProfile,
} from '../beautyProfile';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess, recordLoyaltySafely } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.2 — profil beauté KURLA ID, sorti de `serverDb.ts`.
 */
export function mapBeautyProfileRow(store: SupabaseServerStore, row: any): BeautyProfileRecord {
    const profile = normalizeBeautyProfile(row.profile);
    const confidence: ProfileConfidence = calculateProfileConfidence(profile);
    return {
      userId: row.user_id,
      profile,
      confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

export async function getBeautyProfile(store: SupabaseServerStore, userId: string): Promise<BeautyProfileRecord | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profiles').select('*').eq('user_id', userId).maybeSingle();
      ensureDatabaseSuccess('lecture du profil beauté KURLA ID', error);
      return data ? mapBeautyProfileRow(store, data) : undefined;
    }
    return store.inMemoryBeautyProfiles.get(userId);
  }

async function saveBeautyProfileInner(store: SupabaseServerStore, userId: string, input: unknown, source = 'user'): Promise<BeautyProfileRecord> {
    const profile = normalizeBeautyProfile(input);
    const confidence = calculateProfileConfidence(profile);
    const now = new Date().toISOString();
    const existing = await getBeautyProfile(store, userId);
    const createdAt = existing?.createdAt || now;
    const record: BeautyProfileRecord = { userId, profile, confidence, createdAt, updatedAt: now };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.from('beauty_profiles').upsert({
        user_id: userId,
        profile,
        confidence: confidence.overall,
        photo_consent: profile.photoConsent,
        created_at: createdAt,
        updated_at: now
      }, { onConflict: 'user_id' });
      ensureDatabaseSuccess('enregistrement du profil beauté KURLA ID', error);

      const { error: historyError } = await supabase.from('beauty_profile_history').insert({
        user_id: userId,
        profile,
        confidence: confidence.overall,
        source,
        created_at: now
      });
      ensureDatabaseSuccess('historisation du profil beauté KURLA ID', historyError);
    }

    store.inMemoryBeautyProfiles.set(userId, record);
    const history = store.inMemoryBeautyProfileHistory.get(userId) || [];
    history.unshift({ id: randomUUID(), profile, confidence, source, createdAt: now });
    store.inMemoryBeautyProfileHistory.set(userId, history.slice(0, 50));
    return record;
  }

export async function getBeautyProfileHistory(store: SupabaseServerStore, userId: string): Promise<BeautyProfileHistoryEntry[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profile_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      ensureDatabaseSuccess('lecture de l’historique du profil beauté', error);
      return (data || []).map((row: any) => {
        const profile = normalizeBeautyProfile(row.profile);
        return {
          id: row.id,
          profile,
          confidence: calculateProfileConfidence(profile),
          source: row.source,
          createdAt: row.created_at
        };
      });
    }
    return [...(store.inMemoryBeautyProfileHistory.get(userId) || [])];
  }

export async function getBeautyProfilePhotos(store: SupabaseServerStore, userId: string): Promise<BeautyProfilePhoto[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profile_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des photos du profil beauté', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        consentAt: row.consent_at,
        createdAt: row.created_at
      }));
    }
    return [...(store.inMemoryBeautyProfilePhotos.get(userId) || [])];
  }

export async function uploadBeautyProfilePhoto(store: SupabaseServerStore, userId: string, buffer: Uint8Array, mimeType: BeautyProfilePhoto['mimeType'], consentAt: string): Promise<BeautyProfilePhoto> {
    const id = randomUUID();
    const storagePath = `${userId}/${id}`;
    const now = new Date().toISOString();
    const photo: BeautyProfilePhoto = {
      id,
      storagePath,
      mimeType,
      sizeBytes: buffer.byteLength,
      consentAt,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error: uploadError } = await supabase.storage.from('beauty-profile-photos').upload(storagePath, buffer as any, {
        contentType: mimeType,
        upsert: false
      });
      ensureDatabaseSuccess('stockage de la photo du profil beauté', uploadError);
      const { error } = await supabase.from('beauty_profile_photos').insert({
        id,
        user_id: userId,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: buffer.byteLength,
        consent_at: consentAt,
        created_at: now
      });
      ensureDatabaseSuccess('enregistrement de la photo du profil beauté', error);
    }

    const photos = store.inMemoryBeautyProfilePhotos.get(userId) || [];
    photos.unshift(photo);
    store.inMemoryBeautyProfilePhotos.set(userId, photos.slice(0, 10));
    return photo;
  }

export async function deleteBeautyProfilePhotos(store: SupabaseServerStore, userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error: selectError } = await supabase.from('beauty_profile_photos').select('storage_path').eq('user_id', userId);
      ensureDatabaseSuccess('lecture des photos à supprimer', selectError);
      const paths = (data || []).map((row: any) => row.storage_path).filter(Boolean);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('beauty-profile-photos').remove(paths);
        ensureDatabaseSuccess('suppression des fichiers photo du profil', storageError);
      }
      const { error } = await supabase.from('beauty_profile_photos').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des métadonnées photo du profil', error);
    }
    store.inMemoryBeautyProfilePhotos.delete(userId);
  }

export async function deleteBeautyProfile(store: SupabaseServerStore, userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await deleteBeautyProfilePhotos(store, userId);
      const { error: historyError } = await supabase.from('beauty_profile_history').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’historique du profil beauté', historyError);
      const { error } = await supabase.from('beauty_profiles').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression du profil beauté KURLA ID', error);
    }
    store.inMemoryBeautyProfiles.delete(userId);
    store.inMemoryBeautyProfileHistory.delete(userId);
    store.inMemoryBeautyProfilePhotos.delete(userId);
  }

  // ============================================================
  // FAMILY PROFILES, CHILD SAFETY & SHARED PLANS
  // ============================================================

/** Profil suffisamment renseigné (60 % des champs connus) : la personnalisation devient fiable. */
export async function saveBeautyProfile(store: SupabaseServerStore, userId: string, input: unknown, source = 'user'): Promise<BeautyProfileRecord> {
  const record = await saveBeautyProfileInner(store, userId, input, source);
  if (record.confidence?.overall >= 60) {
    await recordLoyaltySafely(store, userId, 'profile_completed', record.userId);
  }
  return record;
}
