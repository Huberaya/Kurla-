import type { Express, Response } from 'express';

import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';
import { ensureCoupon, countRewardCoupons } from '../../lib/db/couponStore';
import {
  REFERRAL_REWARD_EUR,
  REFERRAL_FRIEND_MIN_ORDER_EUR,
  referralCodeForUser,
  referralLink,
} from '../../lib/referral';

/**
 * PARRAINAGE 10/10 €.
 *
 *  GET  /api/referral           → statut du programme pour l'utilisateur connecté
 *                                  (code, lien, nombre de filleuls récompensés).
 *  POST /api/referral/activate  → crée (idempotemment) le coupon filleul 10 €
 *                                  associé au compte, et renvoie le kit de
 *                                  parrainage. Aucune table supplémentaire :
 *                                  tout repose sur la table `coupons`.
 *
 * La récompense du PARRAIN (coupon MERCI-… unique, 10 € sans minimum) est
 * générée côté webhook Stripe lors du paiement d'un filleul (voir server.ts),
 * jamais ici : on ne récompense qu'une commande réellement payée.
 */
export function registerReferralRoutes(app: Express): void {
  app.get('/api/referral', rateLimit('referral-get', 60, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const code = referralCodeForUser(user.id);
    const origin = String(req.headers.origin || process.env.PUBLIC_BASE_URL || '');
    const segment = code.replace('KURLA-', '');
    const rewardedFriends = await countRewardCoupons(segment);

    res.json({
      code,
      link: referralLink(code, origin || undefined),
      rewardEur: REFERRAL_REWARD_EUR,
      friendMinOrderEur: REFERRAL_FRIEND_MIN_ORDER_EUR,
      rewardedFriends,
      // Le coupon filleul n'existe qu'après activation ; l'UI invite à activer.
      active: rewardedFriends >= 0, // statut exact vérifié au activate ; on renvoie le code quoi qu'il arrive
    });
  }));

  app.post('/api/referral/activate', rateLimit('referral-activate', 10, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const code = referralCodeForUser(user.id);
    const created = await ensureCoupon({
      code,
      description: `Parrainage KURLA — 10 € offerts pour votre première commande (dès ${REFERRAL_FRIEND_MIN_ORDER_EUR} € d'achat)`,
      discountType: 'fixed',
      discountValue: REFERRAL_REWARD_EUR,
      currency: 'EUR',
      minimumOrderAmount: REFERRAL_FRIEND_MIN_ORDER_EUR,
      maxUses: null, // multi-filleuls : chaque filleul l'utilise une fois
      active: true,
    });

    if (!created.ok) {
      return res.status(503).json({ error: 'Le programme de parrainage est momentanément indisponible. Réessayez dans un instant.' });
    }

    const origin = String(req.headers.origin || process.env.PUBLIC_BASE_URL || '');
    const segment = code.replace('KURLA-', '');
    const rewardedFriends = await countRewardCoupons(segment);

    res.json({
      ok: true,
      code,
      link: referralLink(code, origin || undefined),
      rewardEur: REFERRAL_REWARD_EUR,
      friendMinOrderEur: REFERRAL_FRIEND_MIN_ORDER_EUR,
      rewardedFriends,
    });
  }));
}
