// ─────────────────────────────────────────────────────────────────────────────
// PARRAINAGE KURLA — 10 € pour le parrain, 10 € pour le filleul.
// Règles pures (client + serveur) : dérivation du code, format, anti-fraude.
//
// Choix d'implémentation (zéro migration bloquante) :
//  - Le code parrain est dérivé de l'userId public : `KURLA-<8 car.>` . C'est un
//    coupon `fixed` 10 €, min 49 €, multi-usages (chaque filleul s'en sert une
//    fois), créé dans la table `coupons` à l'activation du programme.
//  - La récompense du PARRAIN est un coupon unique `MERCI-<parrain>-<filleul>`,
//    10 € sans minimum, mono-usage, généré AU MOMENT DU PAIEMENT du filleul.
//  - Le parrain est retrouvé depuis le code utilisé (préfixe KURLA- + 8 car.
//    de son userId), sans table supplémentaire.
// ─────────────────────────────────────────────────────────────────────────────

export const REFERRAL_REWARD_EUR = 10;            // 10 € chacun
export const REFERRAL_FRIEND_MIN_ORDER_EUR = 49;  // le code filleul exige un panier ≥ 49 €
export const REFERRAL_PREFIX = 'KURLA-';
export const REFERRAL_REWARD_PREFIX = 'MERCI-';

/** Caractères "sûrs" d'un UUID pour un code (chiffres + a-f, pas de confusion 0/O). */
function safeSegment(input: string): string {
  return input.replace(/[^a-f0-9]/gi, '').toLowerCase();
}

/**
 * Code de parrainage d'un utilisateur : `KURLA-XXXXXXXX` (8 caractères de son id).
 * Déterministe : le même compte donne toujours le même code.
 */
export function referralCodeForUser(userId: string | undefined | null): string {
  const seg = safeSegment(String(userId || '')).slice(0, 8).padEnd(8, '0');
  return `${REFERRAL_PREFIX}${seg}`;
}

/** Extrait le segment (8 car.) d'un code de parrainage valide, ou null. */
export function parseReferralCode(code: string | undefined | null): string | null {
  const raw = String(code || '').trim().toUpperCase();
  const m = raw.match(new RegExp(`^${REFERRAL_PREFIX}([A-F0-9]{8})$`));
  return m ? m[1].toLowerCase() : null;
}

/** Lien de parrainage complet pointant vers l'accueil avec ?ref=CODE. */
export function referralLink(code: string, origin?: string): string {
  const base = (origin || (typeof window !== 'undefined' ? window.location.origin : 'https://kurla.app')).replace(/\/$/, '');
  return `${base}/?ref=${code}`;
}

/** Code de récompense unique du parrain pour un filleul donné. */
export function rewardCouponCode(referrerSegment: string, friendRef: string): string {
  // Le suffixe filleul peut être alphanumérique (un code promo est une chaîne
  // libre) : on conserve lettres+chiffres de l'identifiant de commande, qui
  // est déterministe (idempotence de la récompense en cas de réessai webhook).
  const f = String(friendRef).toLowerCase().replace(/[^a-z0-9]/g, '').slice(-6).padEnd(6, '0');
  return `${REFERRAL_REWARD_PREFIX}${referrerSegment}-${f}`.toUpperCase();
}

/**
 * Anti-fraude de base : on n'applique pas le code de parrainage si l'utilisateur
 * connecté EST le parrain (segment de son userId égal à celui du code).
 */
export function isSelfReferral(code: string | undefined | null, userId: string | undefined | null): boolean {
  const seg = parseReferralCode(code);
  if (!seg || !userId) return false;
  return safeSegment(userId).startsWith(seg);
}

/** Un code de parrainage est-il reconnaissable (préfixe + format) ? */
export function isReferralCode(code: string | undefined | null): boolean {
  return parseReferralCode(code) !== null;
}
