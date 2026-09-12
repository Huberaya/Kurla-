export type PushResult =
  | { ok: true; endpoint: string }
  | { ok: false; code: 'UNSUPPORTED' | 'DENIED' | 'NOT_CONFIGURED' | 'FAILED'; message: string };

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function subscribeToPush(accessToken: string): Promise<PushResult> {
  if (!isPushSupported()) return { ok: false, code: 'UNSUPPORTED', message: 'Les notifications push ne sont pas supportées par ce navigateur.' };
  if (Notification.permission === 'denied') return { ok: false, code: 'DENIED', message: 'Les notifications sont bloquées dans les réglages du navigateur.' };

  try {
    const keyResponse = await fetch('/api/notifications/push/public-key', { headers: { Authorization: `Bearer ${accessToken}` } });
    const keyData = await keyResponse.json().catch(() => ({}));
    if (keyResponse.status === 503 || keyData?.code === 'PUSH_NOT_CONFIGURED') return { ok: false, code: 'NOT_CONFIGURED', message: 'Les notifications push ne sont pas encore configurées sur le serveur.' };
    if (!keyResponse.ok || typeof keyData.publicKey !== 'string') throw new Error('Clé push indisponible.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, code: 'DENIED', message: 'Vous n’avez pas autorisé les notifications.' };

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(keyData.publicKey) as BufferSource
    });
    const response = await fetch('/api/notifications/push-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(subscription.toJSON())
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'L’abonnement push n’a pas pu être enregistré.');
    return { ok: true, endpoint: subscription.endpoint };
  } catch (error: any) {
    return { ok: false, code: 'FAILED', message: error?.message || 'Les notifications push n’ont pas pu être activées.' };
  }
}

export async function unsubscribeFromPush(accessToken: string): Promise<PushResult> {
  if (!isPushSupported()) return { ok: false, code: 'UNSUPPORTED', message: 'Les notifications push ne sont pas supportées par ce navigateur.' };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true, endpoint: '' };
    const response = await fetch('/api/notifications/push-subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    if (!response.ok) throw new Error('La suppression de l’abonnement push a échoué.');
    await subscription.unsubscribe();
    return { ok: true, endpoint: subscription.endpoint };
  } catch (error: any) {
    return { ok: false, code: 'FAILED', message: error?.message || 'La désactivation push a échoué.' };
  }
}
