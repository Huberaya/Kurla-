// Côté navigateur : capture du code de parrainage à l'arrivée (?ref=KURLA-XXXX),
// stockage 90 jours, et pré-remplissage du panier.
import { isReferralCode } from './referral';

const KEY = 'kurla_referral_code';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours

/** À appeler au chargement de l'app : capte ?ref= s'il est valide. */
export function captureReferralCode(): string | null {
  try {
    const url = new URL(window.location.href);
    const ref = (url.searchParams.get('ref') || url.searchParams.get('parrain') || '').trim().toUpperCase();
    if (ref && isReferralCode(ref)) {
      localStorage.setItem(KEY, JSON.stringify({ code: ref, ts: Date.now() }));
      // Nettoie l'URL sans recharger la page.
      url.searchParams.delete('ref');
      url.searchParams.delete('parrain');
      window.history.replaceState({}, '', url.pathname + url.search);
      return ref;
    }
  } catch {
    /* SSR / localStorage indisponible */
  }
  return null;
}

/** Renvoie le code parrain stocké et non expiré, ou null. */
export function getStoredReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code?: string; ts?: number };
    if (!parsed.code || !parsed.ts) return null;
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return isReferralCode(parsed.code) ? parsed.code : null;
  } catch {
    return null;
  }
}

/** Consomme le code (appelé après application réussie sur une commande). */
export function clearStoredReferralCode(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
