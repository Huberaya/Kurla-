import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import type { SupabaseServerStore } from '../serverDb';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

export interface PushSubscriptionRecord extends PushSubscriptionInput {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

function normalize(input: PushSubscriptionInput): PushSubscriptionInput {
  const endpoint = typeof input?.endpoint === 'string' ? input.endpoint.trim() : '';
  const p256dh = typeof input?.keys?.p256dh === 'string' ? input.keys.p256dh.trim() : '';
  const auth = typeof input?.keys?.auth === 'string' ? input.keys.auth.trim() : '';
  if (!/^https:\/\//i.test(endpoint) || endpoint.length < 20 || endpoint.length > 2048) throw new Error('Endpoint push invalide.');
  if (p256dh.length < 20 || p256dh.length > 512 || auth.length < 10 || auth.length > 256) throw new Error('Clés push invalides.');
  return {
    endpoint,
    keys: { p256dh, auth },
    expirationTime: input.expirationTime == null ? null : Number.isFinite(input.expirationTime) ? input.expirationTime : null
  };
}

function mapRow(row: any): PushSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.userId),
    endpoint: String(row.endpoint),
    keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
    expirationTime: row.expiration_time == null ? null : Number(row.expiration_time),
    createdAt: String(row.created_at ?? row.createdAt),
    updatedAt: String(row.updated_at ?? row.updatedAt)
  };
}

export async function savePushSubscription(store: SupabaseServerStore, userId: string, raw: PushSubscriptionInput): Promise<PushSubscriptionRecord> {
  const input = normalize(raw);
  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expiration_time: input.expirationTime ?? null,
      updated_at: now
    }, { onConflict: 'user_id,endpoint' }).select('*').single();
    ensureDatabaseSuccess('enregistrement de l’abonnement push', error);
    return mapRow(data);
  }

  const existing = store.inMemoryPushSubscriptions.find(item => item.userId === userId && item.endpoint === input.endpoint);
  if (existing) {
    Object.assign(existing, { ...input, updatedAt: now });
    return existing;
  }
  const record: PushSubscriptionRecord = {
    id: randomUUID(),
    userId,
    ...input,
    createdAt: now,
    updatedAt: now
  };
  store.inMemoryPushSubscriptions.push(record);
  return record;
}

export async function deletePushSubscription(store: SupabaseServerStore, userId: string, endpoint: string): Promise<void> {
  const normalizedEndpoint = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!normalizedEndpoint) throw new Error('Endpoint push manquant.');
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', normalizedEndpoint);
    ensureDatabaseSuccess('suppression de l’abonnement push', error);
    return;
  }
  store.inMemoryPushSubscriptions = store.inMemoryPushSubscriptions.filter(item => !(item.userId === userId && item.endpoint === normalizedEndpoint));
}

export async function getPushSubscriptions(store: SupabaseServerStore, userId: string): Promise<PushSubscriptionRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des abonnements push', error);
    return (data || []).map(mapRow);
  }
  return store.inMemoryPushSubscriptions.filter(item => item.userId === userId);
}
