// ─────────────────────────────────────────────────────────────────────────────
// RÉCOMPENSE PARRAIN — appelée par le webhook Stripe quand un filleul paie.
// Crée (idempotemment) le coupon MERCI-<parrain>-<filleul> de 10 € puis envoie
// un email au parrain. Ne fait jamais échouer la confirmation de commande.
// ─────────────────────────────────────────────────────────────────────────────
import { ensureCoupon } from './db/couponStore';
import { emailService } from './emailService';
import {
  REFERRAL_REWARD_EUR,
  parseReferralCode,
  rewardCouponCode,
} from './referral';
import { getSupabaseServerClient } from './supabaseClient';

/**
 * @param couponUsed  le code utilisé par le filleul (ex. KURLA-AB12CD34)
 * @param friendRef   identifiant court de la commande/filleul (pour rendre le coupon unique)
 * @param friendEmail email du filleul (information, optionnel)
 */
export async function grantReferralReward(params: {
  couponUsed: string;
  friendRef: string;
  friendEmail?: string | null;
}): Promise<{ granted: boolean; reason?: string; rewardCode?: string; referrerEmail?: string | null }> {
  const segment = parseReferralCode(params.couponUsed);
  if (!segment) return { granted: false, reason: 'not_a_referral_code' };

  const rewardCode = rewardCouponCode(segment, params.friendRef);

  const created = await ensureCoupon({
    code: rewardCode,
    description: `Merci d'avoir parrainé chez KURLA — ${REFERRAL_REWARD_EUR} € de réduction sur votre prochaine commande`,
    discountType: 'fixed',
    discountValue: REFERRAL_REWARD_EUR,
    currency: 'EUR',
    minimumOrderAmount: null, // récompense : aucun minimum
    maxUses: 1,               // mono-usage
    active: true,
  });
  if (!created.ok) return { granted: false, reason: 'coupon_creation_failed' };
  if (created.existed) return { granted: false, reason: 'already_granted' }; // idempotent

  // Retrouver l'email du parrain : le segment correspond au début de son userId.
  let referrerEmail: string | null = null;
  try {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      // Les UUID ne sont pas préfixables en ilike de façon fiable sur l'id ;
      // on cherche le profil dont l'id matche le segment via une lecture large
      // bornée, puis filtrage en JS (les ids sont des UUID publics).
      const { data } = await supabase
        .from('profiles')
        .select('id,email')
        .limit(1000);
      const hit = (data || []).find((p: { id: string; email: string }) =>
        p.id.replace(/[^a-f0-9]/gi, '').toLowerCase().startsWith(segment)
      );
      if (hit?.email) referrerEmail = hit.email;
    }
  } catch {
    /* l'email n'est pas bloquant */
  }

  if (referrerEmail) {
    try {
      await emailService.sendEmail({
        to: referrerEmail,
        subject: `Vos ${REFERRAL_REWARD_EUR} € de parrainage KURLA sont prêts 🎁`,
        template: 'referral_reward',
        data: { rewardEur: REFERRAL_REWARD_EUR, rewardCode, name: '' },
      });
    } catch {
      /* l'email échoué ne doit pas casser la récompense (le coupon existe déjà) */
    }
  }

  return { granted: true, reason: 'granted', rewardCode, referrerEmail };
}
