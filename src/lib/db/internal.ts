/**
 * CHANTIER 8.2 — aides internes au store, sorties de `serverDb.ts`.
 *
 * Isolées ici pour que les modules de domaine (`src/lib/db/*`) les importent sans
 * créer de cycle : `serverDb.ts` compose ces modules, ils ne peuvent donc pas le
 * réimporter pour une simple fonction utilitaire.
 */

/** Une erreur de base n'est jamais avalée : elle remonte avec l'opération en clair. */
export function ensureDatabaseSuccess(operation: string, error: { message?: string } | null | undefined): void {
  if (error) {
    throw new Error(`[Supabase] ${operation}: ${error.message || 'opération refusée'}`);
  }
}

import type { EmailMessage } from '../emailService';
import { getSupabaseServerClient } from '../supabaseClient';

import type { OrderStatus, ServerOrder } from './types';
import { getCatalogTruth, isCatalogPubliclyListable } from '../catalogTruth';

/** Colonnes TVA d'une commande, absentes des lignes antérieures à la migration 7.6. */
export function mapOrderVatFields(row: any): Partial<ServerOrder> {
  if (!row || typeof row !== 'object') return {};
  const fields: Partial<ServerOrder> = {};
  if (row.currency != null) fields.currency = String(row.currency);
  if (row.vat_country != null) fields.vatCountry = String(row.vat_country);
  if (row.net_amount != null) fields.netAmount = Number(row.net_amount);
  if (row.vat_amount != null) fields.vatAmount = Number(row.vat_amount);
  if (row.vat_breakdown != null) fields.vatBreakdown = row.vat_breakdown;
  if (row.customer_vat_number != null) fields.customerVatNumber = String(row.customer_vat_number);
  return fields;
}

/**
 * Le code promo est tracé dans le snapshot JSONB `shipping_address` (aucune
 * colonne dédiée dans `orders`). On le ré-expose au niveau de la commande pour
 * que le webhook puisse incrémenter le compteur d'usage après paiement.
 */
export function mapOrderCouponFields(row: any): Partial<ServerOrder> {
  const snap = row?.shipping_address;
  const fields: Partial<ServerOrder> = {};
  if (snap && typeof snap === 'object') {
    if (typeof snap.couponCode === 'string' && snap.couponCode) fields.couponCode = snap.couponCode;
    if (snap.discountAmount != null && Number.isFinite(Number(snap.discountAmount))) {
      fields.discountAmount = Number(snap.discountAmount);
    }
  }
  return fields;
}

export function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}


// ---------------------------------------------------------------------------
// Aides pures du catalogue et des commandes (chantier 8.2c)
// ---------------------------------------------------------------------------

export function isPromotionActive(product: any, now = new Date()): boolean {
  if (product?.isPromo !== true && product?.is_promo !== true) return false;
  const promotionPrice = Number(product?.promotionPrice ?? product?.promotion_price);
  if (!Number.isFinite(promotionPrice) || promotionPrice < 0) return false;
  const startsAt = product?.promotionStartsAt ?? product?.promotion_starts_at;
  const endsAt = product?.promotionEndsAt ?? product?.promotion_ends_at;
  if (startsAt && Number.isNaN(new Date(startsAt).getTime())) return false;
  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) return false;
  if (startsAt && new Date(startsAt) > now) return false;
  if (endsAt && new Date(endsAt) < now) return false;
  return true;
}

export function effectiveCatalogPrice(product: any): number {
  return isPromotionActive(product) ? Number(product.promotionPrice ?? product.promotion_price) : Number(product.price);
}

export function isPublishableProduct(product: any): boolean {
  // The truth layer owns the shared publication gate. Keeping this adapter here
  // preserves the existing import surface for stores and tests.
  return isCatalogPubliclyListable(product);
}

/** Strip catalog governance and operational fields before data reaches a
 * browser. Admin evidence remains available through admin-only endpoints. */
export function toPublicProduct(product: any): any {
  const truth = getCatalogTruth(product);
  const productIsPreorder = product.isPreorder === true
    || product.is_preorder === true
    || (Array.isArray(product.badges) && product.badges.includes('preorder'));
  const verifiedGalleryImages = Array.isArray(product.galleryImages)
    ? product.galleryImages.filter((image: any) =>
      (!image.validationStatus || image.validationStatus === 'verified')
      && (!image.imageTrust || ['brand_provided', 'licensed'].includes(image.imageTrust))
    )
    : [];
  const variants = (product.variants || []).map((variant: any) => {
    const stockQuantity = Number(variant.stock_quantity ?? variant.stockQuantity ?? 0);
    const reservedQuantity = Number(variant.reserved_quantity ?? variant.reservedQuantity ?? 0);
    return {
      id: variant.id,
      productId: product.id,
      label: variant.name || variant.label || variant.option_value || 'Option',
      optionType: variant.option_type || variant.optionType,
      optionValue: variant.option_value || variant.optionValue,
      price: isPromotionActive({ ...variant, isPromo: true }) ? Number(variant.promotion_price) : Number(variant.price),
      stockQuantity: Math.max(0, stockQuantity - reservedQuantity),
      inStock: variant.is_active !== false && stockQuantity > reservedQuantity
    };
  });
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    subCategory: product.subCategory,
    price: effectiveCatalogPrice(product),
    originalPrice: isPromotionActive(product) ? (product.originalPrice ?? Number(product.price)) : product.originalPrice,
    rating: 0,
    reviewsCount: 0,
    image: product.image || '',
    galleryImages: verifiedGalleryImages.length > 0
      ? verifiedGalleryImages.map(({ validationStatus: _validationStatus, ...image }: any) => image)
      : product.image ? [{ url: product.image, label: 'Image du catalogue', type: 'hero', imageTrust: product.imageOwnershipStatus }] : [],
    badges: Array.isArray(product.badges) ? product.badges : [],
    forWho: product.forWho || '',
    notIdealIf: product.notIdealIf || '',
    howToUse: product.howToUse || '',
    routineStep: product.routineStep || '',
    keyIngredients: product.keyIngredients || product.ingredients || [],
    ingredients: product.ingredients || [],
    inci: product.inci || '',
    description: product.description || '',
    benefitPrimary: product.benefitPrimary,
    targetHairTypes: product.targetHairTypes || product.hairTypes || [],
    targetSkinTypes: product.targetSkinTypes || product.skinTypes || [],
    texture: product.texture,
    fragrance: product.fragrance,
    usageFrequency: product.usageFrequency,
    sizeLabel: product.sizeLabel,
    estimatedYield: product.estimatedYield,
    ingredientRoles: product.ingredientRoles || [],
    allergens: product.allergens || [],
    containsFragrance: product.containsFragrance,
    originCountry: product.originCountry,
    certifications: product.certifications || [],
    returnsPolicy: product.returnsPolicy,
    shippingInfo: { ...(product.shippingInfo || product.shippingPolicy || {}), countries: product.countryAvailability || [] },
    audienceTags: Array.isArray(product.targetAudiences) ? product.targetAudiences : (Array.isArray(product.audienceTags) ? product.audienceTags : []),
    recommendedAgeBand: product.recommendedAgeBand || product.recommended_age_band,
    recommendedAgeMin: product.recommendedAgeMin == null ? (product.recommended_age_min == null ? undefined : Number(product.recommended_age_min)) : Number(product.recommendedAgeMin),
    recommendedAgeMax: product.recommendedAgeMax == null ? (product.recommended_age_max == null ? undefined : Number(product.recommended_age_max)) : Number(product.recommendedAgeMax),
    minorSafetyStatus: product.minorSafetyStatus || product.minor_safety_status || 'not_provided',
    adultOnlyActives: Array.isArray(product.adultOnlyActives) ? product.adultOnlyActives : (Array.isArray(product.adult_only_actives) ? product.adult_only_actives : []),
    parentalSupervisionRequired: product.parentalSupervisionRequired === true || product.parental_supervision_required === true,
    imageSupervisionStatus: product.imageSupervisionStatus || product.image_supervision_status || 'not_provided',
    variants,
    verifiedReviewCount: 0,
    questionsCount: 0,
    // Une précommande est publiable seulement comme précommande, jamais comme
    // stock disponible. Les formulations cibles ne franchissent pas la porte
    // publique ; cette branche protège aussi les données historiques.
    inStock: truth.commercialState === 'available'
      && (product.inStock === true || variants.some((variant: any) => variant.inStock)),
    availabilityState: truth.commercialState,
    availabilityLabel: truth.availabilityLabel,
    availabilityMessage: truth.availabilityMessage,
    needs: product.needs || product.concerns || [],
    countryAvailability: product.countryAvailability || [],
    catalogCategoryTags: product.catalogCategoryTags || [],
    targetAudiences: product.targetAudiences || [],
    warnings: product.warnings || [],
    promotionPrice: isPromotionActive(product) ? Number(product.promotionPrice ?? product.promotion_price) : undefined,
    communityBrand: product.communityBrand === true,
    isNew: product.isNew === true,
    isPromo: isPromotionActive(product),
    isPreorder: productIsPreorder,
    // Référencement fournisseur : non sensible, utile à l'admin et au suivi
    // de sourcing (le prix d'achat reste côté serveur, jamais exposé).
    supplierId: (product as any).supplier_id ?? (product as any).supplierId ?? null,
    supplierSku: (product as any).supplier_sku ?? (product as any).supplierSku ?? null,
    sourceSupplier: (product as any).source_supplier ?? (product as any).sourceSupplier ?? null
  };
}

export function emailTemplateForOrderStatus(status: OrderStatus): EmailMessage['template'] {
  if (status === 'paid') return 'payment_confirmed';
  if (status === 'payment_failed') return 'payment_failed';
  if (status === 'return_requested') return 'return_requested';
  if (status === 'returned') return 'order_returned';
  if (status === 'refunded') return 'order_refunded';
  if (status === 'partially_refunded') return 'order_partially_refunded';
  if (status === 'cancelled') return 'order_cancelled';
  return `order_${status}` as EmailMessage['template'];
}

/**
 * Données de l'email transactionnel d'une commande : récapitulatif des lignes
 * (avec drapeau précommande), total et frais de port. Permet au template HTML
 * d'afficher le détail de la commande sans réinterroger le catalogue.
 */
export function orderEmailData(order: {
  id: string;
  total: number;
  currency?: string | null;
  items?: Array<{ name?: string; quantity?: number; price?: number; isPreorder?: boolean; slug?: string }>;
  shippingAddress?: any;
  status?: OrderStatus;
}): Record<string, any> {
  const items = Array.isArray(order.items)
    ? order.items.map(it => ({
        name: it.name || 'Soin KURLA',
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || undefined,
        isPreorder: it.isPreorder === true,
        slug: typeof it.slug === 'string' ? it.slug : undefined
      }))
    : [];
  const shippingCost = order.shippingAddress?.shippingCost;
  // Liens directs vers les fiches produits, pour la demande d'avis post-livraison.
  const reviewLinks = items
    .filter(it => it.slug)
    .map(it => `https://kurlabeauty.vercel.app/produit/${it.slug}#avis`)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 6);
  return {
    orderId: order.id,
    total: order.total,
    currency: order.currency || 'EUR',
    status: order.status,
    items,
    preorder: items.some(i => i.isPreorder),
    reviewLinks,
    ...(shippingCost != null && Number.isFinite(Number(shippingCost)) ? { shippingCost: Number(shippingCost) } : {})
  };
}


/**
 * CHANTIER 8.3 — applique un fait de progression sans jamais faire échouer
 * l'action qui l'a produit. Un avis publié doit rester publié même si le calcul
 * de progression échoue ; l'incident est journalisé, pas propagé.
 */
/**
 * Relie une activité authentifiée à la cohorte de lancement sans créer de
 * seconde identité. Le lien initial se fait par email uniquement si aucun
 * `tester_user_id` n'existe encore ; ensuite les activités utilisent l'UUID.
 *
 * Important : un inscrit `waitlisted` n'est pas activé implicitement. Seuls les
 * testeurs invités ou acceptés peuvent passer à `activated`, ce qui protège le
 * lancement fermé à 300 personnes.
 */
export async function recordLaunchTesterActivity(userId: string, kind: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !userId) return;
  const now = new Date().toISOString();
  const activityKind = String(kind || 'activity').slice(0, 80);

  try {
    const { data: linked, error: linkedError } = await supabase
      .from('launch_leads')
      .select('id,tester_status')
      .eq('tester_user_id', userId)
      .in('tester_status', ['invited', 'accepted', 'activated'])
      .limit(1)
      .maybeSingle();
    if (linkedError) return;

    let lead = linked;
    if (!lead) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (profileError || typeof profile?.email !== 'string' || !profile.email.trim()) return;

      const { data: matched, error: matchError } = await supabase
        .from('launch_leads')
        .update({
          tester_user_id: userId,
          tester_status: 'activated',
          activated_at: now,
          last_active_at: now,
          last_activity_kind: activityKind
        })
        .eq('email', profile.email.trim().toLowerCase())
        .eq('profile_type', 'client')
        .eq('country', 'FR')
        .in('tester_status', ['invited', 'accepted', 'activated'])
        .select('id,tester_status')
        .limit(1)
        .maybeSingle();
      if (matchError || !matched) return;
      lead = matched;
    }

    // Si le lien existait déjà, on ne réécrit pas l'instant d'activation.
    await supabase
      .from('launch_leads')
      .update({
        last_active_at: now,
        last_activity_kind: activityKind,
        ...(lead.tester_status === 'invited' || lead.tester_status === 'accepted'
          ? { tester_status: 'activated', activated_at: now }
          : {})
      })
      .eq('id', lead.id);
  } catch {
    // L'instrumentation ne doit jamais casser un diagnostic, une commande ou un
    // événement de progression si la migration n'est pas encore déployée.
  }
}

export async function recordLoyaltySafely(
  store: { applyLoyaltyEvent: (userId: string, kind: string, sourceRef?: string, dedupeKey?: string) => Promise<unknown> },
  userId: string,
  kind: string,
  sourceRef?: string,
  dedupeKey?: string
): Promise<void> {
  try {
    await store.applyLoyaltyEvent(userId, kind, sourceRef, dedupeKey);
    await recordLaunchTesterActivity(userId, kind);
  } catch (error: any) {
    console.warn(`[progression] fait « ${kind} » ignoré : ${error?.message || 'erreur inconnue'}`);
  }
}
