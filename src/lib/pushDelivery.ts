import webpush from 'web-push';
import { deletePushSubscription, getPushSubscriptions, type PushSubscriptionRecord } from './db/pushSubscriptionStore';
import type { SupabaseServerStore } from './serverDb';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let vapidConfigured = false;

function configureVapid(): boolean {
  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

function asWebPushSubscription(subscription: PushSubscriptionRecord) {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: subscription.keys
  };
}

/**
 * Sends an encrypted Web Push message only when VAPID is explicitly configured.
 * Delivery is best-effort: an expired browser subscription is removed, while a
 * transient provider error does not turn a successful in-app notification into
 * a failed request.
 */
export async function sendPushNotification(store: SupabaseServerStore, userId: string, payload: PushPayload): Promise<number> {
  if (!configureVapid()) return 0;
  const subscriptions = await getPushSubscriptions(store, userId);
  if (!subscriptions.length) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    tag: payload.tag || 'kurla-notification'
  });
  let delivered = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(asWebPushSubscription(subscription), body, { TTL: 86_400 });
      delivered += 1;
    } catch (error: any) {
      const statusCode = Number(error?.statusCode);
      if (statusCode === 404 || statusCode === 410) {
        try { await deletePushSubscription(store, userId, subscription.endpoint); } catch { /* best effort cleanup */ }
      } else {
        console.error('[push] delivery failed', { userId, statusCode: Number.isFinite(statusCode) ? statusCode : undefined });
      }
    }
  }));
  return delivered;
}
