import { deletePushSubscription, getPushSubscriptions, type PushSubscriptionRecord } from './db/pushSubscriptionStore';
import type { SupabaseServerStore } from './serverDb';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let vapidConfigured = false;

/**
 * `web-push` est chargé à la demande, jamais au démarrage du serveur.
 *
 * Le 11/09/2026, l'import en tête de fichier a mis **toute** l'API en 500 :
 * le paquet n'était déclaré dans aucune section de `package.json`, il était
 * donc absent de l'installation de production, donc introuvable au
 * chargement du bundle. `/api/health`, `/api/products`, le panier, tout
 * tombait — alors que la page d'accueil continuait de répondre 200, ce qui
 * rendait la panne invisible au premier coup d'œil.
 *
 * Une notification push est un service annexe. Son absence ou son
 * indisponibilité doit désactiver les push, pas empêcher le serveur de
 * démarrer : c'est ce que garantit ce chargement paresseux, y compris si
 * le paquet redevenait indisponible.
 */
let moduleWebPush: typeof import('web-push') | null | undefined;

async function chargerWebPush() {
  if (moduleWebPush === undefined) {
    try {
      const charge = await import('web-push');
      moduleWebPush = charge.default ?? charge;
    } catch (error) {
      moduleWebPush = null;
      console.error(
        '[push] module « web-push » indisponible — notifications push désactivées, ' +
        'le reste du serveur continue normalement.'
      );
    }
  }
  return moduleWebPush;
}

function configureVapid(webpush: NonNullable<typeof moduleWebPush>): boolean {
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
  const webpush = await chargerWebPush();
  if (!webpush) return 0;
  if (!configureVapid(webpush)) return 0;
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
