import { getSupabaseServerClient } from '../supabaseClient';

export interface AppliedCoupon {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  /** Montant de remise calculé, en centimes (TTC). */
  discountCents: number;
}

interface CouponRow {
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  currency: string | null;
  minimum_order_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number | null;
  active: boolean | null;
}

/**
 * Valide un code promo pour un panier dont on fournit le sous-total articles
 * EN CENTIMES (TTC, hors livraison). Renvoie le coupon et la remise calculée,
 * ou lève une Error avec un message en français prêt à afficher.
 * La remise est plafonnée au sous-total articles (jamais rendre le total négatif
 * ni « rembourser » la livraison).
 */
export async function validateAndApplyCoupon(
  rawCode: string | undefined,
  itemsSubtotalCents: number
): Promise<{ coupon: AppliedCoupon } | { error: string }> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { error: 'Code promo manquant.' };

  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Codes promo momentanément indisponibles.' };

  const { data, error } = await supabase
    .from('coupons')
    .select('code,description,discount_type,discount_value,currency,minimum_order_amount,starts_at,ends_at,max_uses,used_count,active')
    .eq('code', code)
    .maybeSingle();

  if (error) return { error: 'Impossible de vérifier ce code pour le moment.' };
  if (!data) return { error: 'Ce code promo n’existe pas ou n’est plus valide.' };

  const row = data as CouponRow;
  const now = new Date();

  if (row.active !== true) return { error: 'Ce code promo est désactivé.' };
  if (row.starts_at && new Date(row.starts_at) > now) return { error: 'Ce code n’est pas encore actif.' };
  if (row.ends_at && new Date(row.ends_at) < now) return { error: 'Ce code promo a expiré.' };
  if (row.max_uses != null && (row.used_count || 0) >= row.max_uses) {
    return { error: 'Ce code promo a atteint son nombre maximum d’utilisations.' };
  }

  const minCents = Math.round(Number(row.minimum_order_amount || 0) * 100);
  if (itemsSubtotalCents < minCents) {
    return { error: `Ce code nécessite un minimum de ${(minCents / 100).toFixed(2)} € d’articles.` };
  }

  const type = row.discount_type === 'fixed' ? 'fixed' : 'percentage';
  let discountCents = type === 'fixed'
    ? Math.round(Number(row.discount_value) * 100)
    : Math.round(itemsSubtotalCents * (Number(row.discount_value) / 100));

  // Plafonnement : on ne remise jamais plus que le sous-total des articles.
  discountCents = Math.max(0, Math.min(discountCents, itemsSubtotalCents));
  if (discountCents <= 0) return { error: 'Ce code n’ouvre aucune remise sur ce panier.' };

  return {
    coupon: {
      code,
      description: row.description || code,
      discountType: type,
      discountValue: Number(row.discount_value),
      discountCents
    }
  };
}

/**
 * Incrémente de façon atomique le compteur d'utilisation d'un coupon après un
 * paiement confirmé (RPC `increment_coupon_usage`, fournie par la migration).
 * Sans effet si la RPC est absente : une métrique ne doit jamais faire échouer
 * la confirmation d'une commande.
 */
export async function incrementCouponUsage(code: string): Promise<void> {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return;
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  try {
    await supabase.rpc('increment_coupon_usage', { p_code: normalized });
  } catch {
    /* métrique non critique */
  }
}
