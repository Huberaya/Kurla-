import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient, isSupabaseServerConfigured } from './supabaseClient';
import { CATALOG_AUDIENCES, CATALOG_CATEGORIES, catalogCsvRowToInput, parseBoolean, parseCatalogCsv, parseJsonCell } from './catalogManagement';
import { emailService } from './emailService';
import { shippingService, ShippingCarrier, ShipmentDetails } from './shippingService';
import {
  BeautyProfile,
  BeautyProfileHistoryEntry,
  BeautyProfilePhoto,
  BeautyProfileRecord,
  ProfileConfidence,
  calculateProfileConfidence,
  normalizeBeautyProfile
} from './beautyProfile';
import {
  AdaptiveRoutinePlan,
  RoutineFeedback,
  RoutineFeedbackSignal,
  RoutineJournalEntry,
  RoutinePreferences,
  RoutineTask,
  RoutineWeatherContext,
  buildAdaptiveRoutine,
  createRoutinePlan,
  normalizeRoutineFeedbackSignal,
  normalizeRoutinePreferences,
  normalizeWeatherContext
} from './adaptiveRoutine';

function ensureDatabaseSuccess(operation: string, error: { message?: string } | null | undefined): void {
  if (error) {
    throw new Error(`[Supabase] ${operation}: ${error.message || 'opération refusée'}`);
  }
}

function isPromotionActive(product: any, now = new Date()): boolean {
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

function effectiveCatalogPrice(product: any): number {
  return isPromotionActive(product) ? Number(product.promotionPrice ?? product.promotion_price) : Number(product.price);
}

function isPublishableProduct(product: any): boolean {
  const ingredients = product?.ingredients || product?.keyIngredients || [];
  const inci = typeof product?.inci === 'string' ? product.inci.trim() : '';
  const images = product?.galleryImages || [];
  const imageUrl = product?.image || product?.image_url;
  const countries = product?.countryAvailability || product?.country_availability || [];
  const hasPromotionFacts = !product?.isPromo && !product?.is_promo
    ? true
    : isPromotionActive(product);
  return product?.is_active === true
    && product?.catalog_status === 'published'
    && product?.ingredient_verification_status === 'verified'
    && product?.claims_validation_status === 'verified'
    && product?.images_validation_status === 'verified'
    && product?.stock_validation_status === 'verified'
    && product?.certifications_validation_status === 'verified'
    && product?.translations_validation_status === 'verified'
    && product?.brand_verification_status === 'verified'
    && ['brand_provided', 'licensed'].includes(product?.image_ownership_status)
    && typeof product?.brand === 'string' && product.brand.trim() !== ''
    && ((Array.isArray(ingredients) && ingredients.length > 0) || inci !== '')
    && ((Array.isArray(images) && images.length > 0) || typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl))
    && Array.isArray(countries) && countries.length > 0
    && hasPromotionFacts;
}

/** Strip catalog governance and operational fields before data reaches a
 * browser. Admin evidence remains available through admin-only endpoints. */
export function toPublicProduct(product: any): any {
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
    variants,
    verifiedReviewCount: 0,
    questionsCount: 0,
    inStock: product.inStock === true || variants.some((variant: any) => variant.inStock),
    needs: product.needs || product.concerns || [],
    countryAvailability: product.countryAvailability || [],
    catalogCategoryTags: product.catalogCategoryTags || [],
    targetAudiences: product.targetAudiences || [],
    warnings: product.warnings || [],
    promotionPrice: isPromotionActive(product) ? Number(product.promotionPrice ?? product.promotion_price) : undefined,
    communityBrand: product.communityBrand === true,
    isNew: product.isNew === true,
    isPromo: isPromotionActive(product)
  };
}

function getStripeServerClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
    timeout: 15_000,
    maxNetworkRetries: 2
  }) : null;
}

function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapRefundRow(row: any): CustomerRefund {
  return {
    id: row.id,
    orderId: row.order_id,
    paymentId: row.payment_id || undefined,
    returnId: row.return_id || undefined,
    userId: row.user_id || undefined,
    amount: Number(row.amount),
    currency: row.currency,
    reason: row.reason || undefined,
    stripeRefundId: row.stripe_refund_id || undefined,
    idempotencyKey: row.idempotency_key || undefined,
    stockRestored: row.stock_restored === true,
    items: Array.isArray(row.items) ? row.items.map((item: any) => ({
      productId: item.productId || item.product_id,
      quantity: Number(item.quantity)
    })) : [],
    status: row.status,
    createdAt: row.created_at
  };
}

export interface ServerOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface MarketplaceReview {
  id: string;
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  author: string;
  verifiedPurchase: boolean;
  createdAt: string;
  status: string;
}

export interface MarketplaceQuestion {
  id: string;
  productId: string;
  question: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
}

export interface ProductSubscription {
  id: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  frequency: '30_days' | '45_days' | '60_days' | '90_days';
  country: string;
  paymentMethod?: string;
  status: 'pending' | 'active' | 'paused' | 'cancelled';
  nextOrderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'payment_pending_webhook'
  | 'paid'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'payment_failed'
  | 'refunded'
  | 'partially_refunded'
  | 'return_requested'
  | 'returned';

export interface ServerOrder {
  id: string;
  userId?: string;
  items: ServerOrderItem[];
  total: number;
  status: OrderStatus;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  checkoutIdempotencyKey?: string;
  shippingAddress?: any;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  oldStatus?: string;
  newStatus: string;
  changedBy?: string;
  changedByRole?: string;
  reason?: string;
  source?: string;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

export interface NotificationPreference {
  userId: string;
  emailNotifications: boolean;
  transactionalEmails: boolean;
  marketingEmails: boolean;
  inAppNotifications: boolean;
  updatedAt: string;
}

export interface CustomerReturn {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  items: any[];
  quantity: number;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'cancelled';
  comment?: string;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRefund {
  id: string;
  orderId: string;
  paymentId?: string;
  returnId?: string;
  userId?: string;
  amount: number;
  currency: string;
  reason?: string;
  stripeRefundId?: string;
  idempotencyKey?: string;
  stockRestored?: boolean;
  items?: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>;
  status: 'pending' | 'succeeded' | 'failed' | 'completed';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  orderId?: string;
  subjectCategory: 'paiement' | 'commande' | 'livraison' | 'retour' | 'remboursement' | 'produit' | 'compte' | 'conseil_ia' | 'autre';
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  senderRole: 'customer' | 'admin' | 'agent';
  message: string;
  createdAt: string;
}

export type ProfessionalApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface ProfessionalApplication {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  profession: string;
  experience: string;
  portfolioUrl?: string;
  acceptsCharter: boolean;
  status: ProfessionalApplicationStatus;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiAssistantSession {
  id: string;
  userId: string;
  topic: string;
  locale: string;
  country: string;
  objective?: string;
  memoryConsent: boolean;
  lastUncertainty?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AiAssistantMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'assistant' | 'system';
  message: string;
  metadata?: Record<string, unknown>;
  sourceIds: string[];
  createdAt: string;
}

export type AiFeedbackRating = 'helpful' | 'incorrect' | 'unsafe';

export interface AiHumanReview {
  id: string;
  userId: string;
  sessionId?: string;
  messageId?: string;
  reason: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'in_review' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface StripeEventLog {
  eventId: string;
  type: string;
  timestamp: string;
  status: 'processed' | 'skipped' | 'error';
  orderId?: string;
  error?: string;
}

class SupabaseServerStore {
  private inMemoryProducts: any[] = [];
  private inMemoryOrders: ServerOrder[] = [];
  private inMemoryCarts: Map<string, any[]> = new Map();
  private inMemoryInventory: Map<string, { quantity: number; reserved_quantity: number }> = new Map();
  private inMemoryStripeEvents: StripeEventLog[] = [];
  private inMemoryStatusHistory: OrderStatusHistoryEntry[] = [];
  private inMemoryNotifications: UserNotification[] = [];
  private inMemoryPreferences: Map<string, NotificationPreference> = new Map();
  private inMemoryShipments: Map<string, ShipmentDetails> = new Map();
  private inMemoryReturns: CustomerReturn[] = [];
  private inMemoryRefunds: CustomerRefund[] = [];
  private inMemoryTickets: SupportTicket[] = [];
  private inMemoryMessages: SupportMessage[] = [];
  private inMemoryProfessionalApplications: ProfessionalApplication[] = [];
  private inMemoryProductReviews: MarketplaceReview[] = [];
  private inMemoryProductQuestions: MarketplaceQuestion[] = [];
  private inMemoryProductWaitlist: Array<{ id: string; productId: string; variantId?: string; userId?: string; email: string; country: string; status: 'waiting' | 'notified' | 'cancelled'; createdAt: string }> = [];
  private inMemoryProductSubscriptions: ProductSubscription[] = [];
  private inMemoryCatalogValidationEvents: Array<{ id: string; productId: string; checkType: string; status: string; evidenceUrl?: string; note?: string; createdAt: string }> = [];
  private inMemoryBeautyProfiles: Map<string, BeautyProfileRecord> = new Map();
  private inMemoryBeautyProfileHistory: Map<string, BeautyProfileHistoryEntry[]> = new Map();
  private inMemoryBeautyProfilePhotos: Map<string, BeautyProfilePhoto[]> = new Map();
  private inMemoryRoutinePlans: Map<string, AdaptiveRoutinePlan> = new Map();
  private inMemoryRoutineFeedback: Map<string, RoutineFeedback[]> = new Map();
  private inMemoryRoutineJournal: Map<string, RoutineJournalEntry[]> = new Map();
  private inMemoryAiSessions: Map<string, AiAssistantSession> = new Map();
  private inMemoryAiMessages: Map<string, AiAssistantMessage[]> = new Map();
  private inMemoryAiFeedback: Array<{ userId: string; sessionId?: string; messageId?: string; rating: AiFeedbackRating; comment?: string; createdAt: string }> = [];
  private inMemoryAiHumanReviews: AiHumanReview[] = [];
  private processedEventsSet: Set<string> = new Set();
  private isInitialized: boolean = false;

  public async initialize(defaultProducts: any[] = []): Promise<void> {
    this.inMemoryProducts = defaultProducts;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      console.log('[Supabase Server DB] Secret key missing or offline fallback active.');
      this.isInitialized = true;
      return;
    }

    try {
      // 1. Ensure products table is seeded in Supabase
      const { data: existingProducts, error: pError } = await supabase.from('products').select('*');
      ensureDatabaseSuccess('lecture du catalogue au démarrage', pError);
      if (existingProducts && existingProducts.length > 0) {
        this.inMemoryProducts = existingProducts.map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          price: Number(p.price),
          inStock: p.in_stock,
          stockQuantity: p.stock_quantity,
          category: p.category,
          description: p.description,
          image: p.image_url,
          ingredients: p.ingredients || [],
          keyIngredients: p.ingredients || [],
          hairTypes: p.hair_types || [],
          skinTypes: p.skin_types || [],
          concerns: p.concerns || [],
          needs: p.concerns || [],
          notIdealIf: p.not_ideal_if || '',
          countryAvailability: p.country_availability || []
        }));
      } else {
        // An empty production catalogue is valid. Demo data is never copied
        // into the real catalogue: products must be entered and validated by
        // an operator before they can become customer-visible.
        this.inMemoryProducts = [];
      }

      // 2. Hydrate processed events from Supabase
      const { data: eventsData, error: eventsError } = await supabase.from('stripe_events').select('event_id');
      ensureDatabaseSuccess('lecture des événements Stripe', eventsError);
      if (eventsData) {
        eventsData.forEach(e => this.processedEventsSet.add(e.event_id));
      }
    } catch (err) {
      console.error('[Supabase Server DB] Initialization exception:', err);
      throw err;
    } finally {
      this.isInitialized = true;
    }
  }

  public async getProducts(options: { publishedOnly?: boolean; includeInactive?: boolean } = {}): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let productsQuery = supabase.from('products').select('*');
      if (!options.includeInactive) productsQuery = productsQuery.eq('is_active', true);
      const { data, error } = await productsQuery;
      ensureDatabaseSuccess('lecture du catalogue', error);
      const { data: variants, error: variantsError } = await supabase.from('product_variants').select('*');
      ensureDatabaseSuccess('lecture des variantes produit', variantsError);
      const { data: inventoryRows, error: inventoryError } = await supabase.from('inventory').select('product_id, variant_id, quantity, reserved_quantity');
      ensureDatabaseSuccess('lecture du stock catalogue', inventoryError);
      const { data: imageRows, error: imagesError } = await supabase.from('product_images').select('*').order('position', { ascending: true });
      ensureDatabaseSuccess('lecture des images catalogue', imagesError);
      const imagesByProduct = new Map<string, any[]>();
      (imageRows || []).forEach((image: any) => {
        const lines = imagesByProduct.get(image.product_id) || [];
        lines.push({
          id: image.id,
          url: image.url,
          label: image.alt || 'Image du catalogue',
          type: image.image_type || 'gallery',
          imageTrust: image.ownership_status || 'unverified',
          validationStatus: image.validation_status || 'pending'
        });
        imagesByProduct.set(image.product_id, lines);
      });
      const inventoryByKey = new Map<string, any>();
      (inventoryRows || []).forEach((row: any) => inventoryByKey.set(`${row.product_id}:${row.variant_id || ''}`, row));
      const variantsByProduct = new Map<string, any[]>();
      (variants || []).forEach((variant: any) => {
        if (variant.is_active === false) return;
        const lines = variantsByProduct.get(variant.product_id) || [];
        lines.push(variant);
        variantsByProduct.set(variant.product_id, lines);
      });
      const mapped = (data || []).map((p: any) => {
        const productVariants = (variantsByProduct.get(p.id) || []).map((variant: any) => {
          const stock = inventoryByKey.get(`${p.id}:${variant.id}`);
          return stock ? { ...variant, stock_quantity: stock.quantity, reserved_quantity: stock.reserved_quantity } : variant;
        });
        const baseStock = inventoryByKey.get(`${p.id}:`);
        const baseAvailable = baseStock ? Number(baseStock.quantity) - Number(baseStock.reserved_quantity || 0) : Number(p.stock_quantity || 0);
        const variantAvailable = productVariants.some((variant: any) => Number(variant.stock_quantity || 0) - Number(variant.reserved_quantity || 0) > 0);
        return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        price: effectiveCatalogPrice(p),
        basePrice: Number(p.price),
        originalPrice: p.original_price == null ? (isPromotionActive(p) ? Number(p.price) : undefined) : Number(p.original_price),
        rating: p.rating == null ? 0 : Number(p.rating),
        reviewsCount: Number(p.reviews_count || 0),
        inStock: p.in_stock === true && (productVariants.length > 0 ? variantAvailable : baseAvailable > 0),
        stockQuantity: baseStock ? Number(baseStock.quantity) : Number(p.stock_quantity || 0),
        category: p.category,
        subCategory: p.subcategory,
        description: p.description || '',
        image: p.image_url || imagesByProduct.get(p.id)?.[0]?.url || '',
        galleryImages: imagesByProduct.get(p.id) || [],
        ingredients: p.ingredients || [],
        inci: p.inci || '',
        forWho: p.for_who || '',
        notIdealIf: p.not_ideal_if || '',
        howToUse: p.how_to_use || '',
        routineStep: p.routine_step || '',
        badges: p.badges || [],
        keyIngredients: p.ingredients || [],
        hairTypes: p.hair_types || [],
        targetHairTypes: p.hair_types || [],
        skinTypes: p.skin_types || [],
        targetSkinTypes: p.skin_types || [],
        concerns: p.concerns || [],
        needs: p.concerns || [],
        countryAvailability: p.country_availability || [],
        isActive: p.is_active === true,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        benefitPrimary: p.benefit_primary,
        texture: p.texture,
        fragrance: p.fragrance,
        usageFrequency: p.usage_frequency,
        sizeLabel: p.size_label,
        estimatedYield: p.estimated_yield,
        ingredientRoles: p.ingredient_roles || [],
        allergens: p.allergens || [],
        containsFragrance: p.contains_fragrance,
        originCountry: p.origin_country,
        certifications: p.certifications || [],
        returnsPolicy: p.returns_policy,
        shippingPolicy: p.shipping_policy || {},
        shippingInfo: { ...(p.shipping_policy || {}), countries: p.country_availability || [] },
        communityBrand: p.community_brand === true,
        isNew: p.is_new === true,
        isPromo: isPromotionActive(p),
        catalogCategoryTags: p.catalog_category_tags || [],
        targetAudiences: p.target_audiences || [],
        vatRate: p.vat_rate == null ? undefined : Number(p.vat_rate),
        priceIncludesVat: p.price_includes_vat !== false,
        promotionPrice: p.promotion_price == null ? undefined : Number(p.promotion_price),
        promotionStartsAt: p.promotion_starts_at,
        promotionEndsAt: p.promotion_ends_at,
        warnings: p.warnings || [],
        sourceSupplier: p.source_supplier || undefined,
        supplierSku: p.supplier_sku || undefined,
        lastImportedAt: p.last_imported_at,
        catalogUpdatedBy: p.catalog_updated_by,
        catalogStatus: p.catalog_status,
        ingredientVerificationStatus: p.ingredient_verification_status,
        claimsValidationStatus: p.claims_validation_status,
        imagesValidationStatus: p.images_validation_status,
        stockValidationStatus: p.stock_validation_status,
        certificationsValidationStatus: p.certifications_validation_status,
        translationsValidationStatus: p.translations_validation_status,
        brandVerificationStatus: p.brand_verification_status,
        imageOwnershipStatus: p.image_ownership_status,
        lastCatalogReviewedAt: p.last_catalog_reviewed_at,
        lastCatalogUpdatedAt: p.last_catalog_updated_at,
        variants: productVariants
      };
      });
      return options.publishedOnly ? mapped.filter(product => isPublishableProduct({
        ...product,
        is_active: true,
        catalog_status: product.catalogStatus,
        ingredient_verification_status: product.ingredientVerificationStatus,
        claims_validation_status: product.claimsValidationStatus,
        images_validation_status: product.imagesValidationStatus,
        stock_validation_status: product.stockValidationStatus,
        certifications_validation_status: product.certificationsValidationStatus,
        translations_validation_status: product.translationsValidationStatus,
        brand_verification_status: product.brandVerificationStatus,
        image_ownership_status: product.imageOwnershipStatus
      })) : mapped;
    }
    // The local development catalogue remains available to internal tests and
    // non-public server routines. Customer-facing API calls always pass
    // publishedOnly, so unvalidated development records cannot be published.
    return options.publishedOnly
      ? this.inMemoryProducts.filter(product => isPublishableProduct(product))
      : [...this.inMemoryProducts];
  }

  public async getProductById(idOrSlug: string): Promise<any | undefined> {
    const products = await this.getProducts();
    return products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
  }

  public async getPublicProducts(): Promise<any[]> {
    return (await this.getProducts({ publishedOnly: true })).map(toPublicProduct);
  }

  public async getProductReviews(productId: string): Promise<MarketplaceReview[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, product_id, rating, title, comment, verified_purchase, status, created_at')
        .eq('product_id', productId)
        .eq('status', 'approved')
        .eq('verified_purchase', true)
        .order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des avis vérifiés', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        rating: Number(row.rating),
        title: row.title || undefined,
        comment: row.comment || '',
        author: 'Client vérifié',
        verifiedPurchase: true,
        createdAt: row.created_at,
        status: row.status
      }));
    }
    return this.inMemoryProductReviews.filter(review => review.productId === productId && review.status === 'approved' && review.verifiedPurchase);
  }

  public async createProductReview(userId: string, productId: string, rating: number, comment: string, title?: string, variantId?: string): Promise<MarketplaceReview> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment.trim() || comment.trim().length > 4000) {
      throw new Error('Un avis doit contenir une note de 1 à 5 et un commentaire valide.');
    }
    const orders = await this.getOrdersByCustomer('', userId);
    const eligible = orders.some(order =>
      ['paid', 'processing', 'packed', 'shipped', 'delivered'].includes(order.status) &&
      order.items.some(item => item.productId === productId && (!variantId || item.variantId === variantId))
    );
    if (!eligible) throw new Error('Un achat réglé de ce produit est nécessaire pour déposer un avis vérifié.');

    const now = new Date().toISOString();
    const review: MarketplaceReview = {
      id: randomUUID(), productId, rating, title: title?.trim() || undefined,
      comment: comment.trim(), author: 'Client vérifié', verifiedPurchase: true,
      createdAt: now, status: 'pending'
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('reviews').insert({
        id: review.id, product_id: productId, user_id: userId, rating,
        title: review.title || null, comment: review.comment,
        verified_purchase: true, verified_at: now, status: 'pending'
      }).select('id, product_id, rating, title, comment, verified_purchase, status, created_at').single();
      ensureDatabaseSuccess('enregistrement de l’avis', error);
      return { ...review, id: data.id, createdAt: data.created_at, status: data.status };
    }
    this.inMemoryProductReviews.unshift(review);
    return review;
  }

  public async getProductQuestions(productId: string, userId?: string): Promise<MarketplaceQuestion[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let request = supabase.from('product_questions')
        .select('id, product_id, question, answer, status, created_at, answered_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      const { data, error } = await request;
      ensureDatabaseSuccess('lecture des questions produit', error);
      return (data || []).filter((row: any) => row.status === 'answered').map((row: any) => ({
        id: row.id, productId: row.product_id, question: row.question,
        answer: row.answer || undefined, createdAt: row.created_at, answeredAt: row.answered_at || undefined
      }));
    }
    return this.inMemoryProductQuestions.filter(question => question.productId === productId && question.answer);
  }

  public async createProductQuestion(userId: string, productId: string, question: string, email?: string): Promise<MarketplaceQuestion> {
    const value = question.trim();
    if (value.length < 5 || value.length > 1000) throw new Error('La question doit contenir entre 5 et 1 000 caractères.');
    const published = (await this.getProducts({ publishedOnly: true })).some(product => product.id === productId);
    if (!published) throw new Error('Produit non disponible.');
    const now = new Date().toISOString();
    const draft: MarketplaceQuestion = { id: randomUUID(), productId, question: value, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('product_questions').insert({
        id: draft.id, product_id: productId, user_id: userId,
        asker_email: email || null, question: value, status: 'pending'
      }).select('id, product_id, question, answer, created_at, answered_at').single();
      ensureDatabaseSuccess('enregistrement de la question produit', error);
      return { id: data.id, productId: data.product_id, question: data.question, answer: data.answer || undefined, createdAt: data.created_at, answeredAt: data.answered_at || undefined };
    }
    this.inMemoryProductQuestions.unshift(draft);
    return draft;
  }

  public async joinProductWaitlist(productId: string, email: string, country: string, variantId?: string, userId?: string): Promise<{ id: string; status: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCountry = country.trim().toUpperCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail) || !/^[A-Z]{2}$/.test(normalizedCountry)) {
      throw new Error('Adresse e-mail ou pays invalide.');
    }
    const products = await this.getProducts({ publishedOnly: true });
    const product = products.find(item => item.id === productId);
    if (!product) throw new Error('Produit non disponible.');
    if (variantId && !(product.variants || []).some((variant: any) => variant.id === variantId)) throw new Error('Variante inconnue.');
    const now = new Date().toISOString();
    const entry = { id: randomUUID(), productId, variantId, userId, email: normalizedEmail, country: normalizedCountry, status: 'waiting' as const, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('product_waitlist').upsert({
        id: entry.id, product_id: productId, variant_id: variantId || null,
        user_id: userId || null, email: normalizedEmail, country: normalizedCountry, status: 'waiting'
      }, { onConflict: 'product_id,variant_id,email,country' }).select('id, status').single();
      ensureDatabaseSuccess('inscription à la liste d’attente', error);
      return { id: data.id, status: data.status };
    }
    const existing = this.inMemoryProductWaitlist.find(item => item.productId === productId && item.variantId === variantId && item.email === normalizedEmail && item.country === normalizedCountry);
    if (existing) return { id: existing.id, status: existing.status };
    this.inMemoryProductWaitlist.push(entry);
    return { id: entry.id, status: entry.status };
  }

  public async createProductSubscription(userId: string, productId: string, frequency: ProductSubscription['frequency'], quantity: number, country: string, variantId?: string, paymentMethod?: string): Promise<ProductSubscription> {
    if (!['30_days', '45_days', '60_days', '90_days'].includes(frequency) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('Fréquence ou quantité de réassort invalide.');
    }
    const product = (await this.getProducts({ publishedOnly: true })).find(item => item.id === productId);
    if (!product) throw new Error('Produit non disponible.');
    if (variantId && !(product.variants || []).some((variant: any) => variant.id === variantId && variant.inStock)) throw new Error('Variante indisponible.');
    const normalizedCountry = country.trim().toUpperCase();
    if (!product.countryAvailability?.includes(normalizedCountry) && !product.countryAvailability?.includes('INT')) throw new Error('Ce produit n’est pas livré dans ce pays.');
    const now = new Date().toISOString();
    const subscription: ProductSubscription = { id: randomUUID(), userId, productId, variantId, quantity, frequency, country: normalizedCountry, paymentMethod, status: 'pending', createdAt: now, updatedAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('product_subscriptions').insert({
        id: subscription.id, user_id: userId, product_id: productId, variant_id: variantId || null,
        quantity, frequency, country: normalizedCountry, payment_method: paymentMethod || null, status: 'pending'
      }).select('*').single();
      ensureDatabaseSuccess('création du réassort', error);
      return { ...subscription, id: data.id, createdAt: data.created_at, updatedAt: data.updated_at };
    }
    this.inMemoryProductSubscriptions.push(subscription);
    return subscription;
  }

  private normalizeCatalogProductInput(input: any, existing?: any): any {
    const source = { ...(existing || {}), ...(input || {}) };
    const text = (value: unknown, max = 5000): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed ? trimmed.slice(0, max) : undefined;
    };
    const array = (value: unknown): string[] => Array.isArray(value)
      ? value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 100)
      : typeof value === 'string' ? value.split(/[|;]/).map(item => item.trim()).filter(Boolean).slice(0, 100) : [];
    const number = (value: unknown, fallback?: number): number | undefined => {
      if (value === undefined || value === null || value === '') return fallback;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const slugify = (value: string): string => value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180);
    const name = text(source.name || source.nom, 240);
    if (!name) throw new Error('Le nom du produit est obligatoire.');
    const slug = slugify(text(source.slug || source.handle, 180) || name);
    if (!slug) throw new Error('Le slug produit est obligatoire.');
    const price = number(source.price ?? source.prix);
    if (price === undefined || price < 0) throw new Error(`Prix invalide pour « ${name} » : renseignez un montant positif ou nul.`);

    const categoryRaw = text(source.category || source.department || source.departement, 80);
    const categoryKey = categoryRaw?.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    const category = categoryKey?.includes('peau') ? 'peau' : categoryKey?.includes('cheveu') ? 'cheveux' : categoryRaw ? categoryRaw : undefined;
    if (category && !['cheveux', 'peau'].includes(category)) throw new Error(`Département inconnu pour « ${name} ». Utilisez cheveux ou peau.`);

    const validCategories = new Set<string>(CATALOG_CATEGORIES.map(item => item.slug));
    const catalogCategoryTags = array(source.catalogCategoryTags ?? source.catalog_category_tags ?? source.categoryTags);
    const unknownCategory = catalogCategoryTags.find(tag => !validCategories.has(tag));
    if (unknownCategory) throw new Error(`Catégorie catalogue inconnue : ${unknownCategory}.`);
    const validAudiences = new Set<string>(CATALOG_AUDIENCES.map(item => item.slug));
    const targetAudiences = array(source.targetAudiences ?? source.target_audiences);
    const unknownAudience = targetAudiences.find(audience => !validAudiences.has(audience));
    if (unknownAudience) throw new Error(`Public inconnu : ${unknownAudience}.`);
    const countries = array(source.countryAvailability ?? source.country_availability).map(country => country.toUpperCase());
    if (countries.some(country => country !== 'INT' && !/^[A-Z]{2}$/.test(country))) throw new Error(`Pays de disponibilité invalide pour « ${name} ».`);

    const rawImages = typeof source.images === 'string' ? parseJsonCell(source.images, []) : source.images;
    const imagesProvided = rawImages !== undefined;
    const images = imagesProvided
      ? (Array.isArray(rawImages) ? rawImages : [])
        .map((image: any) => typeof image === 'string' ? { url: image } : image)
        .filter((image: any) => image && typeof image.url === 'string' && image.url.trim())
        .map((image: any, index: number) => ({
          url: image.url.trim().slice(0, 2000),
          alt: text(image.alt || image.label, 300),
          position: Number.isInteger(image.position) ? image.position : index,
          imageType: ['hero', 'gallery', 'detail'].includes(image.imageType || image.type) ? (image.imageType || image.type) : index === 0 ? 'hero' : 'gallery',
          ownershipStatus: ['brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified'].includes(image.ownershipStatus || image.imageTrust) ? (image.ownershipStatus || image.imageTrust) : 'unverified',
          validationStatus: ['verified', 'pending', 'rejected', 'not_provided'].includes(image.validationStatus) ? image.validationStatus : 'pending',
          sourceNote: text(image.sourceNote, 1000)
        }))
        .filter((image: any) => /^https?:\/\//i.test(image.url)).slice(0, 30)
      : undefined;
    if (imagesProvided && Array.isArray(rawImages) && rawImages.length > 0 && images.length === 0) throw new Error(`Aucune URL d’image exploitable pour « ${name} ».`);

    const rawVariants = typeof source.variants === 'string' ? parseJsonCell(source.variants, []) : source.variants;
    const variantsProvided = rawVariants !== undefined;
    const variants = variantsProvided
      ? (Array.isArray(rawVariants) ? rawVariants : []).map((variant: any, index: number) => {
        const variantName = text(variant?.name || variant?.label || variant?.optionValue || variant?.option_value, 240);
        if (!variantName) throw new Error(`La variante ${index + 1} de « ${name} » doit avoir un nom.`);
        const variantPrice = number(variant.price, price);
        const stockQuantity = number(variant.stockQuantity ?? variant.stock_quantity, 0);
        if (variantPrice === undefined || variantPrice < 0 || stockQuantity === undefined || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0) {
          throw new Error(`Prix ou stock invalide pour la variante « ${variantName} ».`);
        }
        return {
          id: isUuid(variant.id) ? variant.id : randomUUID(),
          name: variantName,
          sku: text(variant.sku, 120),
          barcode: text(variant.barcode, 120),
          price: variantPrice,
          stockQuantity,
          isActive: variant.isActive === undefined && variant.is_active === undefined ? true : parseBoolean(variant.isActive ?? variant.is_active, true),
          optionType: text(variant.optionType || variant.option_type, 40),
          optionValue: text(variant.optionValue || variant.option_value, 240),
          weightGrams: number(variant.weightGrams ?? variant.weight_grams),
          formatLabel: text(variant.formatLabel || variant.format_label, 120),
          shade: text(variant.shade, 120),
          color: text(variant.color, 120),
          scent: text(variant.scent, 120),
          vatRate: number(variant.vatRate ?? variant.vat_rate),
          promotionPrice: number(variant.promotionPrice ?? variant.promotion_price),
          promotionStartsAt: text(variant.promotionStartsAt || variant.promotion_starts_at, 80),
          promotionEndsAt: text(variant.promotionEndsAt || variant.promotion_ends_at, 80)
        };
      })
      : undefined;

    const stockQuantity = number(source.stockQuantity ?? source.stock_quantity ?? source.stock, 0);
    if (stockQuantity === undefined || !Number.isSafeInteger(stockQuantity) || stockQuantity < 0) throw new Error(`Stock invalide pour « ${name} ».`);
    const vatRate = number(source.vatRate ?? source.vat_rate ?? source.tva, 20);
    if (vatRate === undefined || vatRate < 0 || vatRate > 100) throw new Error(`TVA invalide pour « ${name} ».`);
    const promotionPrice = number(source.promotionPrice ?? source.promotion_price);
    if (promotionPrice !== undefined && (promotionPrice < 0 || promotionPrice > price)) throw new Error(`Prix promotionnel invalide pour « ${name} ».`);
    const isPromo = source.isPromo === undefined && source.is_promo === undefined ? promotionPrice !== undefined : parseBoolean(source.isPromo ?? source.is_promo, false);
    if (isPromo && promotionPrice === undefined) throw new Error(`La promotion de « ${name} » est signalée mais son prix est absent.`);
    const toIso = (value: unknown): string | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) throw new Error(`Date catalogue invalide pour « ${name} ».`);
      return date.toISOString();
    };
    const promotionStartsAt = toIso(source.promotionStartsAt ?? source.promotion_starts_at);
    const promotionEndsAt = toIso(source.promotionEndsAt ?? source.promotion_ends_at);
    if (promotionStartsAt && promotionEndsAt && new Date(promotionEndsAt) < new Date(promotionStartsAt)) throw new Error(`Période promotionnelle incohérente pour « ${name} ».`);
    const image = text(source.image || source.image_url, 2000) || images?.[0]?.url;
    if (image && !/^https?:\/\//i.test(image)) throw new Error(`URL d’image invalide pour « ${name} ».`);
    const imageOwnershipStatus = ['brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified'].includes(source.imageOwnershipStatus)
      ? source.imageOwnershipStatus
      : images?.[0]?.ownershipStatus || existing?.imageOwnershipStatus || existing?.image_ownership_status || 'unverified';
    const id = text(source.id, 240) || existing?.id || `product-${randomUUID()}`;
    const active = source.isActive === undefined && source.is_active === undefined
      ? existing?.isActive ?? existing?.is_active ?? false
      : parseBoolean(source.isActive ?? source.is_active, false);
    const effectiveInStock = variantsProvided ? variants.some((variant: any) => variant.isActive && variant.stockQuantity > 0) : stockQuantity > 0;
    return {
      id,
      slug,
      name,
      brand: text(source.brand, 240),
      price,
      originalPrice: number(source.originalPrice ?? source.original_price),
      promotionPrice,
      promotionStartsAt,
      promotionEndsAt,
      vatRate,
      priceIncludesVat: source.priceIncludesVat === undefined && source.price_includes_vat === undefined ? true : parseBoolean(source.priceIncludesVat ?? source.price_includes_vat, true),
      isPromo,
      stockQuantity,
      inStock: source.inStock === undefined && source.in_stock === undefined ? effectiveInStock : parseBoolean(source.inStock ?? source.in_stock, effectiveInStock),
      isActive: active,
      category,
      subCategory: text(source.subCategory || source.subcategory || source.sub_category_tag, 160),
      catalogCategoryTags,
      targetAudiences,
      countryAvailability: countries,
      description: text(source.description, 10000),
      image,
      images,
      imageOwnershipStatus,
      imagesProvided,
      variants,
      variantsProvided,
      ingredients: array(source.ingredients || source.keyIngredients),
      inci: text(source.inci, 12000),
      warnings: array(source.warnings),
      certifications: Array.isArray(typeof source.certifications === 'string' ? parseJsonCell(source.certifications, []) : source.certifications)
        ? (typeof source.certifications === 'string' ? parseJsonCell(source.certifications, []) : source.certifications).slice(0, 50)
        : [],
      hairTypes: array(source.hairTypes || source.hair_types || source.targetHairTypes),
      skinTypes: array(source.skinTypes || source.skin_types || source.targetSkinTypes),
      concerns: array(source.concerns || source.needs),
      sourceSupplier: text(source.sourceSupplier || source.source_supplier || source.supplier, 240),
      supplierSku: text(source.supplierSku || source.supplier_sku, 240),
      benefitPrimary: text(source.benefitPrimary, 500),
      forWho: text(source.forWho, 1000),
      notIdealIf: text(source.notIdealIf, 1000),
      howToUse: text(source.howToUse, 3000),
      routineStep: text(source.routineStep, 300),
      texture: text(source.texture, 240),
      fragrance: text(source.fragrance, 240),
      usageFrequency: text(source.usageFrequency, 240),
      sizeLabel: text(source.sizeLabel, 120),
      estimatedYield: text(source.estimatedYield, 240),
      ingredientRoles: Array.isArray(source.ingredientRoles) ? source.ingredientRoles.slice(0, 50) : [],
      allergens: array(source.allergens),
      containsFragrance: typeof source.containsFragrance === 'boolean' ? source.containsFragrance : undefined,
      originCountry: text(source.originCountry, 80),
      returnsPolicy: text(source.returnsPolicy, 3000),
      shippingPolicy: source.shippingPolicy && typeof source.shippingPolicy === 'object' ? source.shippingPolicy : {},
      lastImportedAt: new Date().toISOString()
    };
  }

  private catalogAdminView(product: any): any {
    return {
      ...product,
      price: product.basePrice ?? product.price,
      isActive: product.isActive ?? product.is_active ?? false,
      catalogStatus: product.catalogStatus ?? product.catalog_status ?? 'draft',
      validation: {
        ingredients: product.ingredientVerificationStatus ?? product.ingredient_verification_status ?? 'not_provided',
        claims: product.claimsValidationStatus ?? product.claims_validation_status ?? 'not_provided',
        images: product.imagesValidationStatus ?? product.images_validation_status ?? 'not_provided',
        stock: product.stockValidationStatus ?? product.stock_validation_status ?? 'not_provided',
        certifications: product.certificationsValidationStatus ?? product.certifications_validation_status ?? 'not_provided',
        translations: product.translationsValidationStatus ?? product.translations_validation_status ?? 'not_provided',
        brand: product.brandVerificationStatus ?? product.brand_verification_status ?? 'not_provided'
      },
      lastCatalogUpdatedAt: product.lastCatalogUpdatedAt ?? product.last_catalog_updated_at,
      lastCatalogReviewedAt: product.lastCatalogReviewedAt ?? product.last_catalog_reviewed_at
    };
  }

  public async getAdminCatalogProducts(): Promise<any[]> {
    return (await this.getProducts({ includeInactive: true })).map(product => this.catalogAdminView(product));
  }

  public async getCatalogTaxonomy(): Promise<{ categories: any[]; audiences: any[] }> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: categories, error: categoryError } = await supabase.from('catalog_categories').select('slug, department, label, sort_order, active').eq('active', true).order('sort_order');
      ensureDatabaseSuccess('lecture des catégories catalogue', categoryError);
      return { categories: categories || [], audiences: [...CATALOG_AUDIENCES] };
    }
    return { categories: [...CATALOG_CATEGORIES], audiences: [...CATALOG_AUDIENCES] };
  }

  public async saveCatalogProduct(adminId: string, input: any): Promise<any> {
    const allProducts = await this.getProducts({ includeInactive: true });
    const requestedId = typeof input?.id === 'string' ? input.id.trim() : undefined;
    const requestedSlug = typeof input?.slug === 'string' ? input.slug.trim() : undefined;
    const requestedSupplier = typeof input?.sourceSupplier === 'string' ? input.sourceSupplier.trim() : typeof input?.supplier === 'string' ? input.supplier.trim() : undefined;
    const requestedSupplierSku = typeof input?.supplierSku === 'string' ? input.supplierSku.trim() : typeof input?.supplier_sku === 'string' ? input.supplier_sku.trim() : undefined;
    const existing = allProducts.find(product =>
      (requestedId && product.id === requestedId)
      || (requestedSlug && product.slug === requestedSlug)
      || (requestedSupplier && requestedSupplierSku && product.sourceSupplier === requestedSupplier && product.supplierSku === requestedSupplierSku)
    );
    const normalized = this.normalizeCatalogProductInput(input, existing);
    if (existing && normalized.id !== existing.id) normalized.id = existing.id;
    const now = new Date().toISOString();
    const imagesChanged = normalized.imagesProvided === true;
    const supabase = getSupabaseServerClient();
    let savedProduct: any = { ...existing, ...normalized, id: normalized.id };

    if (supabase) {
      const quality = {
        catalog_status: existing?.catalogStatus || existing?.catalog_status || 'draft',
        ingredient_verification_status: existing?.ingredientVerificationStatus || existing?.ingredient_verification_status || 'not_provided',
        claims_validation_status: existing?.claimsValidationStatus || existing?.claims_validation_status || 'not_provided',
        images_validation_status: imagesChanged ? 'pending' : (existing?.imagesValidationStatus || existing?.images_validation_status || 'not_provided'),
        stock_validation_status: existing?.stockValidationStatus || existing?.stock_validation_status || 'not_provided',
        certifications_validation_status: existing?.certificationsValidationStatus || existing?.certifications_validation_status || 'not_provided',
        translations_validation_status: existing?.translationsValidationStatus || existing?.translations_validation_status || 'not_provided',
        brand_verification_status: existing?.brandVerificationStatus || existing?.brand_verification_status || 'not_provided',
        image_ownership_status: imagesChanged ? normalized.imageOwnershipStatus : (existing?.imageOwnershipStatus || existing?.image_ownership_status || 'unverified')
      };
      const payload: Record<string, unknown> = {
        id: normalized.id,
        slug: normalized.slug,
        name: normalized.name,
        brand: normalized.brand || null,
        price: normalized.price,
        original_price: normalized.originalPrice ?? null,
        promotion_price: normalized.promotionPrice ?? null,
        promotion_starts_at: normalized.promotionStartsAt || null,
        promotion_ends_at: normalized.promotionEndsAt || null,
        vat_rate: normalized.vatRate,
        price_includes_vat: normalized.priceIncludesVat,
        is_promo: normalized.isPromo,
        in_stock: normalized.inStock,
        stock_quantity: normalized.stockQuantity,
        is_active: normalized.isActive,
        category: normalized.category || null,
        subcategory: normalized.subCategory || null,
        sub_category_tag: normalized.subCategory || null,
        catalog_category_tags: normalized.catalogCategoryTags,
        target_audiences: normalized.targetAudiences,
        country_availability: normalized.countryAvailability,
        description: normalized.description || null,
        image_url: normalized.image || null,
        ingredients: normalized.ingredients,
        inci: normalized.inci || null,
        warnings: normalized.warnings,
        certifications: normalized.certifications,
        hair_types: normalized.hairTypes,
        skin_types: normalized.skinTypes,
        concerns: normalized.concerns,
        source_supplier: normalized.sourceSupplier || null,
        supplier_sku: normalized.supplierSku || null,
        benefit_primary: normalized.benefitPrimary || null,
        for_who: normalized.forWho || null,
        not_ideal_if: normalized.notIdealIf || null,
        how_to_use: normalized.howToUse || null,
        routine_step: normalized.routineStep || null,
        texture: normalized.texture || null,
        fragrance: normalized.fragrance || null,
        usage_frequency: normalized.usageFrequency || null,
        size_label: normalized.sizeLabel || null,
        estimated_yield: normalized.estimatedYield || null,
        ingredient_roles: normalized.ingredientRoles,
        allergens: normalized.allergens,
        contains_fragrance: normalized.containsFragrance ?? null,
        origin_country: normalized.originCountry || null,
        returns_policy: normalized.returnsPolicy || null,
        shipping_policy: normalized.shippingPolicy,
        last_imported_at: normalized.lastImportedAt,
        catalog_updated_by: adminId,
        last_catalog_updated_at: now,
        updated_at: now,
        ...quality
      };
      const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement du produit catalogue', error);
      savedProduct = { ...savedProduct, ...data };

      if (normalized.variantsProvided) {
        const { data: currentVariants, error: variantLookupError } = await supabase.from('product_variants').select('id').eq('product_id', normalized.id);
        ensureDatabaseSuccess('lecture des variantes existantes', variantLookupError);
        const retained = new Set<string>();
        for (const variant of normalized.variants || []) {
          retained.add(variant.id);
          const { error: variantError } = await supabase.from('product_variants').upsert({
            id: variant.id,
            product_id: normalized.id,
            name: variant.name,
            sku: variant.sku || null,
            price: variant.price,
            stock_quantity: variant.stockQuantity,
            is_active: variant.isActive,
            option_type: variant.optionType || null,
            option_value: variant.optionValue || null,
            weight_grams: variant.weightGrams || null,
            format_label: variant.formatLabel || null,
            shade: variant.shade || null,
            color: variant.color || null,
            scent: variant.scent || null,
            barcode: variant.barcode || null,
            vat_rate: variant.vatRate ?? null,
            promotion_price: variant.promotionPrice ?? null,
            promotion_starts_at: variant.promotionStartsAt || null,
            promotion_ends_at: variant.promotionEndsAt || null,
            updated_at: now
          }, { onConflict: 'id' });
          ensureDatabaseSuccess('enregistrement d’une variante catalogue', variantError);
          await this.syncVariantInventoryToSupabase(normalized.id, variant.id, variant.stockQuantity, 0);
        }
        for (const current of currentVariants || []) {
          if (!retained.has(current.id)) {
            const { error: deactivateError } = await supabase.from('product_variants').update({ is_active: false, updated_at: now }).eq('id', current.id);
            ensureDatabaseSuccess('désactivation d’une variante catalogue', deactivateError);
          }
        }
      }
      await this.syncInventoryToSupabase(normalized.id, normalized.stockQuantity, 0);

      if (normalized.imagesProvided) {
        const { error: deleteImagesError } = await supabase.from('product_images').delete().eq('product_id', normalized.id);
        ensureDatabaseSuccess('remplacement des images catalogue', deleteImagesError);
        if (normalized.images.length > 0) {
          const { error: imageError } = await supabase.from('product_images').insert(normalized.images.map((image: any) => ({
            product_id: normalized.id,
            url: image.url,
            alt: image.alt || null,
            position: image.position,
            image_type: image.imageType,
            ownership_status: image.ownershipStatus,
            validation_status: image.validationStatus,
            source_note: image.sourceNote || null,
            updated_at: now
          })));
          ensureDatabaseSuccess('enregistrement des images catalogue', imageError);
        }
      }
      return this.catalogAdminView({
        ...savedProduct,
        ...normalized,
        id: normalized.id,
        catalogStatus: quality.catalog_status,
        ingredientVerificationStatus: quality.ingredient_verification_status,
        claimsValidationStatus: quality.claims_validation_status,
        imagesValidationStatus: quality.images_validation_status,
        stockValidationStatus: quality.stock_validation_status,
        certificationsValidationStatus: quality.certifications_validation_status,
        translationsValidationStatus: quality.translations_validation_status,
        brandVerificationStatus: quality.brand_verification_status,
        imageOwnershipStatus: quality.image_ownership_status,
        lastCatalogUpdatedAt: now
      });
    }

    const memoryRecord = {
      ...savedProduct,
      ...normalized,
      id: normalized.id,
      catalog_status: existing?.catalog_status || existing?.catalogStatus || 'draft',
      ingredient_verification_status: existing?.ingredient_verification_status || existing?.ingredientVerificationStatus || 'not_provided',
      claims_validation_status: existing?.claims_validation_status || existing?.claimsValidationStatus || 'not_provided',
      images_validation_status: imagesChanged ? 'pending' : (existing?.images_validation_status || existing?.imagesValidationStatus || 'not_provided'),
      stock_validation_status: existing?.stock_validation_status || existing?.stockValidationStatus || 'not_provided',
      certifications_validation_status: existing?.certifications_validation_status || existing?.certificationsValidationStatus || 'not_provided',
      translations_validation_status: existing?.translations_validation_status || existing?.translationsValidationStatus || 'not_provided',
      brand_verification_status: existing?.brand_verification_status || existing?.brandVerificationStatus || 'not_provided',
      image_ownership_status: imagesChanged ? normalized.imageOwnershipStatus : (existing?.image_ownership_status || existing?.imageOwnershipStatus || 'unverified'),
      last_catalog_updated_at: now,
      last_imported_at: normalized.lastImportedAt,
      variants: normalized.variantsProvided ? normalized.variants.map((variant: any) => ({ ...variant, stock_quantity: variant.stockQuantity, reserved_quantity: 0 })) : (existing?.variants || []),
      galleryImages: normalized.imagesProvided ? normalized.images : (existing?.galleryImages || [])
    };
    const index = this.inMemoryProducts.findIndex(product => product.id === normalized.id);
    if (index >= 0) this.inMemoryProducts[index] = memoryRecord;
    else this.inMemoryProducts.unshift(memoryRecord);
    return this.catalogAdminView(memoryRecord);
  }

  private async createCatalogImportAudit(adminId: string, sourceType: 'manual' | 'csv' | 'supplier', rowsReceived: number, supplier?: string, fileName?: string): Promise<string> {
    const id = randomUUID();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('catalog_imports').insert({ id, initiated_by: adminId, source_type: sourceType, supplier: supplier || null, file_name: fileName || null, rows_received: rowsReceived, status: 'processing' });
      ensureDatabaseSuccess('création du journal d’import catalogue', error);
    }
    return id;
  }

  private async finishCatalogImportAudit(importId: string, result: { imported: number; rejected: number; errors: any[] }): Promise<void> {
    const status = result.rejected > 0 ? (result.imported > 0 ? 'completed_with_errors' : 'failed') : 'completed';
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('catalog_imports').update({ status, rows_imported: result.imported, rows_rejected: result.rejected, error_report: result.errors, completed_at: new Date().toISOString() }).eq('id', importId);
      ensureDatabaseSuccess('clôture du journal d’import catalogue', error);
    }
  }

  public async importCatalogRecords(adminId: string, records: any[], sourceType: 'manual' | 'supplier' | 'csv', supplier?: string, fileName?: string): Promise<any> {
    if (!Array.isArray(records) || records.length === 0) throw new Error('Aucune ligne catalogue à importer.');
    if (records.length > 1000) throw new Error('Un import est limité à 1 000 lignes par opération.');
    const importId = await this.createCatalogImportAudit(adminId, sourceType, records.length, supplier, fileName);
    const result = { importId, imported: 0, rejected: 0, errors: [] as any[], products: [] as any[] };
    for (let index = 0; index < records.length; index += 1) {
      const raw = { ...(records[index] || {}) };
      if (sourceType === 'supplier' && supplier && !raw.sourceSupplier && !raw.source_supplier) raw.sourceSupplier = supplier;
      try {
        const product = await this.saveCatalogProduct(adminId, raw);
        result.imported += 1;
        result.products.push(product);
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const { error } = await supabase.from('catalog_import_rows').insert({ import_id: importId, row_number: index + 1, external_key: String(raw.supplierSku || raw.supplier_sku || raw.id || raw.slug || ''), status: 'imported' });
          ensureDatabaseSuccess('journalisation d’une ligne d’import catalogue', error);
        }
      } catch (error: any) {
        result.rejected += 1;
        const message = error?.message || 'Ligne catalogue rejetée.';
        result.errors.push({ row: index + 1, message });
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const { error: rowError } = await supabase.from('catalog_import_rows').insert({ import_id: importId, row_number: index + 1, external_key: String(raw.supplierSku || raw.supplier_sku || raw.id || raw.slug || ''), status: 'rejected', error_message: message });
          ensureDatabaseSuccess('journalisation d’une erreur d’import catalogue', rowError);
        }
      }
    }
    await this.finishCatalogImportAudit(importId, result);
    return result;
  }

  public async importCatalogCsv(adminId: string, csv: string, fileName?: string): Promise<any> {
    const rows = parseCatalogCsv(csv).map(catalogCsvRowToInput);
    return this.importCatalogRecords(adminId, rows, 'csv', undefined, fileName);
  }

  public async getCatalogImports(limit = 30): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from('catalog_imports').select('*').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
    ensureDatabaseSuccess('lecture du journal des imports catalogue', error);
    return data || [];
  }

  public async recordCatalogValidation(adminId: string, productId: string, checkType: string, status: 'passed' | 'failed' | 'pending', evidenceUrl?: string, note?: string): Promise<void> {
    if (!await this.getProductById(productId)) throw new Error('Produit introuvable.');
    const checkColumns: Record<string, string> = {
      ingredients: 'ingredient_verification_status', claims: 'claims_validation_status', images: 'images_validation_status',
      stock: 'stock_validation_status', brand: 'brand_verification_status', certifications: 'certifications_validation_status', translations: 'translations_validation_status'
    };
    const column = checkColumns[checkType];
    if (!column) throw new Error('Type de validation inconnu.');
    const value = status === 'passed' ? 'verified' : status === 'failed' ? 'not_provided' : 'pending';
    const now = new Date().toISOString();
    const event = { id: randomUUID(), productId, checkType, status, evidenceUrl, note, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: eventError } = await supabase.from('catalog_validation_events').insert({
        id: event.id, product_id: productId, validator_id: adminId, check_type: checkType, status, evidence_url: evidenceUrl || null, note: note || null
      });
      ensureDatabaseSuccess('enregistrement de la validation catalogue', eventError);
      const { error: updateError } = await supabase.from('products').update({ [column]: value, last_catalog_reviewed_at: now }).eq('id', productId);
      ensureDatabaseSuccess('mise à jour de la validation catalogue', updateError);
      return;
    }
    this.inMemoryCatalogValidationEvents.unshift(event);
    const product = this.inMemoryProducts.find(item => item.id === productId);
    if (product) product[column] = value;
  }

  public async getCatalogValidationEvents(productId: string): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('catalog_validation_events').select('id, product_id, validator_id, check_type, status, evidence_url, note, created_at').eq('product_id', productId).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture de l’historique de validation', error);
      return data || [];
    }
    return this.inMemoryCatalogValidationEvents.filter(event => event.productId === productId);
  }

  public async updateCatalogStatus(productId: string, status: 'draft' | 'pending_review' | 'published' | 'unavailable'): Promise<void> {
    if (!['draft', 'pending_review', 'published', 'unavailable'].includes(status)) throw new Error('Statut catalogue invalide.');
    if (!await this.getProductById(productId)) throw new Error('Produit introuvable.');
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('products').update({ catalog_status: status, last_catalog_updated_at: new Date().toISOString() }).eq('id', productId);
      ensureDatabaseSuccess('mise à jour du statut catalogue', error);
      return;
    }
    const product = this.inMemoryProducts.find(item => item.id === productId);
    if (product) product.catalog_status = status;
  }

  public async getRoutines(): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];
    const { data: routineRows, error: routineError } = await supabase.from('routines').select('*').eq('status', 'published').order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des routines publiées', routineError);
    const { data: itemRows, error: itemError } = await supabase.from('routine_items').select('*').order('step_number', { ascending: true });
    ensureDatabaseSuccess('lecture des produits de routine', itemError);
    const products = await this.getProducts({ publishedOnly: true });
    const productsById = new Map(products.map(product => [product.id, product]));
    return (routineRows || []).map((routine: any) => {
      if (routine.image_url && (routine.images_validation_status !== 'verified' || !['brand_provided', 'licensed'].includes(routine.image_ownership_status))) return null;
      const rawItems = (itemRows || []).filter((item: any) => item.routine_id === routine.id);
      const items = rawItems.map((item: any) => ({ ...item, product: productsById.get(item.product_id) }));
      if (!items.length || items.some((item: any) => !item.product)) return null;
      const steps = items.map((item: any) => ({
        number: item.step_number,
        title: item.title || item.product.name,
        description: item.description || '',
        productName: item.product.name,
        productId: item.product.id,
        variantId: item.variant_id || undefined,
        quantity: item.quantity
      }));
      return {
        id: routine.id,
        slug: routine.slug,
        title: routine.title,
        subtitle: routine.subtitle || '',
        category: routine.category || 'cheveux',
        badge: routine.badge || '',
        benefit: routine.benefit || '',
        duration: routine.duration || '',
        frequency: routine.frequency || '',
        price: Number(routine.price),
        originalPrice: routine.original_price == null ? undefined : Number(routine.original_price),
        image: routine.image_url || '',
        products: items.map((item: any) => toPublicProduct(item.product)),
        steps
      };
    }).filter(Boolean);
  }

  public async getRoutineBySlug(slug: string): Promise<any | undefined> {
    return (await this.getRoutines()).find(routine => routine.slug === slug);
  }

  private async syncInventoryToSupabase(realId: string, quantity: number, reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    try {
      const { data, error: selectError } = await supabase.from('inventory').select('id').eq('product_id', realId).is('variant_id', null).maybeSingle();
      ensureDatabaseSuccess('lecture inventory', selectError);
      if (data?.id) {
        const { error } = await supabase.from('inventory').update({
          quantity,
          reserved_quantity,
          updated_at: new Date().toISOString()
        }).eq('id', data.id);
        ensureDatabaseSuccess('mise à jour inventory', error);
      } else {
        const { error } = await supabase.from('inventory').insert({
          product_id: realId,
          quantity,
          reserved_quantity,
          updated_at: new Date().toISOString()
        });
        ensureDatabaseSuccess('création inventory', error);
      }
    } catch (err) {
      console.error('[serverDb] syncInventoryToSupabase error:', err);
      throw err;
    }
  }

  public async getInventoryByProductId(productId: string): Promise<{ quantity: number; reserved_quantity: number }> {
    const product = await this.getProductById(productId);
    const realId = product ? product.id : productId;

    let memInv = this.inMemoryInventory.get(realId);
    if (!memInv && realId !== productId) {
      memInv = this.inMemoryInventory.get(productId);
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity').eq('product_id', realId).is('variant_id', null).maybeSingle();
        ensureDatabaseSuccess('lecture de l’inventaire', error);
        if (data) {
          const q = Number(data.quantity);
          const resQ = Number(data.reserved_quantity || 0);
          const val = { quantity: q, reserved_quantity: resQ };
          this.inMemoryInventory.set(realId, val);
          if (realId !== productId) this.inMemoryInventory.set(productId, val);
          return val;
        }
      } catch (err) {
        console.error('[serverDb] getInventoryByProductId error:', err);
        throw err;
      }
    }

    if (memInv) return memInv;

    const defaultQty = product && typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
    const defaultInv = { quantity: defaultQty, reserved_quantity: 0 };
    this.inMemoryInventory.set(realId, defaultInv);
    if (realId !== productId) this.inMemoryInventory.set(productId, defaultInv);
    return defaultInv;
  }

  public async getAvailableStock(productId: string): Promise<number> {
    const inv = await this.getInventoryByProductId(productId);
    return Math.max(0, inv.quantity - inv.reserved_quantity);
  }

  public async getInventoryByVariantId(productId: string, variantId: string): Promise<{ quantity: number; reserved_quantity: number }> {
    const product = await this.getProductById(productId);
    const realId = product ? product.id : productId;
    const cacheKey = `${realId}:${variantId}`;
    const cached = this.inMemoryInventory.get(cacheKey);
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity').eq('product_id', realId).eq('variant_id', variantId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’inventaire de la variante', error);
      if (data) {
        const value = { quantity: Number(data.quantity), reserved_quantity: Number(data.reserved_quantity || 0) };
        this.inMemoryInventory.set(cacheKey, value);
        return value;
      }
    }
    if (cached) return cached;
    const variant = product?.variants?.find((item: any) => item.id === variantId);
    const value = { quantity: Number(variant?.stock_quantity || variant?.stockQuantity || 0), reserved_quantity: Number(variant?.reserved_quantity || variant?.reservedQuantity || 0) };
    this.inMemoryInventory.set(cacheKey, value);
    return value;
  }

  private async syncVariantInventoryToSupabase(productId: string, variantId: string, quantity: number, reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    const { data: existing, error: lookupError } = await supabase.from('inventory').select('id').eq('product_id', productId).eq('variant_id', variantId).maybeSingle();
    ensureDatabaseSuccess('lecture de l’inventaire de la variante', lookupError);
    if (existing?.id) {
      const { error } = await supabase.from('inventory').update({ quantity, reserved_quantity, updated_at: new Date().toISOString() }).eq('id', existing.id);
      ensureDatabaseSuccess('mise à jour de l’inventaire de la variante', error);
    } else {
      const { error } = await supabase.from('inventory').insert({ product_id: productId, variant_id: variantId, quantity, reserved_quantity, updated_at: new Date().toISOString() });
      ensureDatabaseSuccess('création de l’inventaire de la variante', error);
    }
  }

  public async saveOrder(order: ServerOrder): Promise<ServerOrder> {
    const existingIdx = this.inMemoryOrders.findIndex(o => o.id === order.id);
    const supabase = getSupabaseServerClient();
    let isNewOrder = existingIdx < 0;
    if (supabase && isNewOrder) {
      const { data, error } = await supabase.from('orders').select('id').eq('id', order.id).maybeSingle();
      ensureDatabaseSuccess('vérification de la commande existante', error);
      isNewOrder = !data;
    }
    const isInitialPayment = isNewOrder && (order.status === 'payment_pending_webhook' || order.status === 'pending_payment');

    // Reserve stock on initial order creation. The Supabase path uses row
    // locks inside PostgreSQL so concurrent checkouts cannot oversell. No
    // in-memory order is exposed until all required persistent writes pass.
    if (isInitialPayment) {
      if (supabase) {
        const { error: reserveError } = await supabase.rpc('reserve_stock_for_order', {
          p_items: order.items.map(item => ({ product_id: item.productId, variant_id: item.variantId || null, quantity: item.quantity }))
        });
        ensureDatabaseSuccess('réservation atomique du stock', reserveError);
      } else {
        for (const item of order.items) {
          const product = await this.getProductById(item.productId);
          const realId = product ? product.id : item.productId;
          const inv = await this.getInventoryByProductId(realId);
          const newResQ = inv.reserved_quantity + item.quantity;
          const val = { quantity: inv.quantity, reserved_quantity: newResQ };
          this.inMemoryInventory.set(realId, val);
          if (realId !== item.productId) this.inMemoryInventory.set(item.productId, val);
        }
      }
    }

    if (supabase) {
      // 1. Save main order in public.orders
      const { error: orderError } = await supabase.from('orders').upsert({
        id: order.id,
        user_id: order.userId || null,
        customer_email: order.customerEmail,
        items: order.items,
        total: order.total,
        status: order.status,
        stripe_session_id: order.stripeSessionId || null,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        checkout_idempotency_key: order.checkoutIdempotencyKey || null,
        shipping_address: order.shippingAddress || null,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      }, { onConflict: 'id' });
      ensureDatabaseSuccess('création de la commande', orderError);

      // 2. Save detailed line items in public.order_items
      if (order.items && order.items.length > 0) {
        const orderItemsPayload = order.items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity,
          unit_price: item.price
        }));
        const { error: deleteItemsError } = await supabase.from('order_items').delete().eq('order_id', order.id);
        ensureDatabaseSuccess('suppression des lignes de commande', deleteItemsError);
        const { error: insertItemsError } = await supabase.from('order_items').insert(orderItemsPayload);
        ensureDatabaseSuccess('création des lignes de commande', insertItemsError);
      }

      // 3. Save the initial payment state once. Later order/session updates
      // must not create duplicate payment rows.
      if (isNewOrder) {
        const { error: paymentError } = await supabase.from('payments').insert({
          order_id: order.id,
          amount: order.total,
          currency: 'EUR',
          status: order.status,
          stripe_payment_intent_id: order.stripePaymentIntentId || order.stripeSessionId || null,
          created_at: order.createdAt,
          updated_at: order.updatedAt
        });
        ensureDatabaseSuccess('création du paiement', paymentError);
      }
    }

    // Cache only data that has been accepted by the configured persistence
    // layer. This prevents failed Supabase writes from creating phantom state.
    if (isNewOrder || existingIdx < 0) this.inMemoryOrders.unshift(order);
    else this.inMemoryOrders[existingIdx] = order;

    // The order must exist before its history row is inserted (FK safety).
    if (isInitialPayment) {
      await this.logOrderStatusHistory(
        order.id,
        undefined,
        order.status,
        order.userId,
        order.userId ? 'customer' : 'system',
        'Création de la commande',
        'checkout'
      );
    }

    return order;
  }

  public async updateOrderStripeSession(orderId: string, stripeSessionId: string): Promise<ServerOrder | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;
    const updatedAt = new Date().toISOString();
    const updatedOrder = { ...order, stripeSessionId: stripeSessionId, updatedAt };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('orders').update({
        stripe_session_id: stripeSessionId,
        updated_at: updatedAt
      }).eq('id', orderId);
      ensureDatabaseSuccess('mise à jour de la session Stripe de la commande', error);
    }

    const index = this.inMemoryOrders.findIndex(existing => existing.id === orderId);
    if (index >= 0) this.inMemoryOrders[index] = updatedOrder;
    else if (supabase) this.inMemoryOrders.unshift(updatedOrder);

    return updatedOrder;
  }

  public async getOrderById(id: string): Promise<ServerOrder | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
      if (error && error.code !== 'PGRST116') {
        ensureDatabaseSuccess('lecture de la commande', error);
      }
      if (!error && data) {
        return {
          id: data.id,
          userId: data.user_id,
          customerEmail: data.customer_email,
          items: data.items,
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    }
    return supabase ? undefined : this.inMemoryOrders.find(o => o.id === id);
  }

  public async getOrdersByCustomer(email: string, userId?: string): Promise<ServerOrder[]> {
    const memOrders = this.inMemoryOrders.filter(o => {
      if (userId && o.userId) return o.userId === userId;
      if (email) return o.customerEmail.toLowerCase() === email.toLowerCase();
      return true;
    });

    const supabase = getSupabaseServerClient();
    if (supabase) {
      let req = supabase.from('orders').select('*');
      if (userId) {
        req = req.eq('user_id', userId);
      } else if (email) {
        req = req.eq('customer_email', email.toLowerCase());
      }
      const { data, error } = await req;
      ensureDatabaseSuccess('lecture des commandes', error);
      if (data && data.length > 0) {
        const supaOrders: ServerOrder[] = data.map(d => ({
          id: d.id,
          userId: d.user_id,
          customerEmail: d.customer_email,
          items: d.items,
          total: Number(d.total),
          status: d.status,
          stripeSessionId: d.stripe_session_id,
          stripePaymentIntentId: d.stripe_payment_intent_id,
          checkoutIdempotencyKey: d.checkout_idempotency_key,
          shippingAddress: d.shipping_address,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
        return supaOrders;
      }
    }
    return supabase ? [] : memOrders;
  }

  // Persistent Carts (public.carts & public.cart_items)
  private async normalizeCartItems(items: { productId: string; quantity: number; variantId?: string }[]): Promise<{ productId: string; quantity: number; variantId?: string }[]> {
    if (!Array.isArray(items)) throw new Error('Panier invalide.');

    const supabase = getSupabaseServerClient();
    const publishedProducts = supabase ? await this.getProducts({ publishedOnly: true }) : null;
    const normalized = new Map<string, { productId: string; quantity: number; variantId?: string }>();
    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !item.productId.trim()) {
        throw new Error('Article de panier invalide.');
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error('Quantité de panier invalide.');
      }
      if (item.variantId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.variantId)) {
        throw new Error('Identifiant de variante invalide.');
      }

      const product = publishedProducts
        ? publishedProducts.find(itemProduct => itemProduct.id === item.productId)
        : await this.getProductById(item.productId);
      if (!product) throw new Error(`Produit de panier introuvable ou non publié : ${item.productId}.`);
      if (item.variantId) {
        const variant = (product.variants || []).find((candidate: any) => candidate.id === item.variantId);
        if (!variant || variant.is_active === false || Number(variant.stock_quantity) <= Number(variant.reserved_quantity || 0)) {
          throw new Error('Variante indisponible.');
        }
      } else if (product.inStock === false) {
        throw new Error('Produit indisponible.');
      }
      const key = `${product.id}:${item.variantId || ''}`;
      const quantity = (normalized.get(key)?.quantity || 0) + item.quantity;
      if (quantity > 99) throw new Error('La quantité totale d’un article de panier ne peut pas dépasser 99.');
      normalized.set(key, { productId: product.id, quantity, variantId: item.variantId });
    }
    return Array.from(normalized.values());
  }

  public async saveCart(userId: string | null, anonymousId: string | null, items: { productId: string; quantity: number; variantId?: string }[]): Promise<string | null> {
    if ((!userId && !anonymousId) || (userId && anonymousId)) {
      throw new Error('Un seul propriétaire de panier est requis.');
    }

    const normalizedItems = await this.normalizeCartItems(items);
    const key = userId || anonymousId!;
    const supabase = getSupabaseServerClient();

    if (!supabase) {
      this.inMemoryCarts.set(key, normalizedItems);
      return 'in_memory_cart';
    }

    try {
      const { data, error } = await supabase.rpc('replace_cart', {
        p_user_id: userId,
        p_anonymous_id: anonymousId,
        p_items: normalizedItems.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity
        }))
      });
      ensureDatabaseSuccess('remplacement atomique du panier', error);
      if (!data) throw new Error('[Supabase] remplacement atomique du panier: identifiant absent');
      this.inMemoryCarts.set(key, normalizedItems);
      return data as string;
    } catch (err) {
      console.error('[Supabase Server DB] saveCart error:', err);
      throw err;
    }
  }

  public async getCart(userId: string | null, anonymousId: string | null): Promise<any[]> {
    const key = userId || anonymousId || 'default';
    const supabase = getSupabaseServerClient();

    if (supabase) {
      try {
        const publishedProducts = await this.getProducts({ publishedOnly: true });
        let cartId: string | null = null;
        if (userId) {
          const { data, error } = await supabase.from('carts').select('id').eq('user_id', userId).maybeSingle();
          ensureDatabaseSuccess('lecture du panier utilisateur', error);
          cartId = data?.id || null;
        } else if (anonymousId) {
          const { data, error } = await supabase.from('carts').select('id').eq('anonymous_id', anonymousId).maybeSingle();
          ensureDatabaseSuccess('lecture du panier invité', error);
          cartId = data?.id || null;
        }

        if (cartId) {
          const { data: items, error } = await supabase.from('cart_items').select('*').eq('cart_id', cartId);
          ensureDatabaseSuccess('lecture des lignes du panier', error);
          if (items && items.length > 0) {
            const result = [];
            for (const item of items) {
              const product = publishedProducts.find(itemProduct => itemProduct.id === item.product_id);
              if (product) {
                const variantId = item.variant_id || undefined;
                const variant = variantId && (product.variants || []).find((candidate: any) => candidate.id === variantId);
                if (variantId && !variant) continue;
                result.push({
                  product: toPublicProduct(product),
                  quantity: item.quantity,
                  variantId,
                  variantLabel: variant?.name,
                  unitPrice: variant ? Number(variant.price) : Number(product.price)
                });
              }
            }
            return result;
          }
        }
        return [];
      } catch (err) {
        console.error('[Supabase Server DB] getCart error:', err);
        throw err;
      }
    }

    // Fallback to in-memory cart
    const memCart = this.inMemoryCarts.get(key) || [];
    const result = [];
    for (const item of memCart) {
      const product = await this.getProductById(item.productId);
      if (product) {
        result.push({
          product,
          quantity: item.quantity,
          variantId: item.variantId || undefined
        });
      }
    }
    return result;
  }

  public async findOrder(query: { stripeSessionId?: string; paymentIntentId?: string; orderId?: string; checkoutIdempotencyKey?: string }): Promise<ServerOrder | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let req = supabase.from('orders').select('*');
      if (query.orderId) req = req.eq('id', query.orderId);
      else if (query.stripeSessionId) req = req.eq('stripe_session_id', query.stripeSessionId);
      else if (query.paymentIntentId) req = req.eq('stripe_payment_intent_id', query.paymentIntentId);
      else if (query.checkoutIdempotencyKey) req = req.eq('checkout_idempotency_key', query.checkoutIdempotencyKey);

      const { data, error } = await req.maybeSingle();
      ensureDatabaseSuccess('recherche de commande', error);
      if (data) {
        return {
          id: data.id,
          customerEmail: data.customer_email,
          items: data.items,
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    }

    return supabase ? undefined : this.inMemoryOrders.find(o =>
      (query.orderId && o.id === query.orderId) ||
      (query.stripeSessionId && o.stripeSessionId === query.stripeSessionId) ||
      (query.paymentIntentId && (o.stripePaymentIntentId === query.paymentIntentId || o.stripeSessionId === query.paymentIntentId)) ||
      (query.checkoutIdempotencyKey && o.checkoutIdempotencyKey === query.checkoutIdempotencyKey)
    );
  }

  public async updateOrderStatus(orderId: string, newStatus: OrderStatus, extra?: {
    stripePaymentIntentId?: string;
    changedBy?: string;
    changedByRole?: string;
    reason?: string;
    restockItems?: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>;
  }): Promise<ServerOrder | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    if (order.status === newStatus) {
      // Multiple Stripe event types can confirm the same payment. Updating a
      // newly learned PaymentIntent is allowed, but it must not restock,
      // append a second payment row, or create another status transition.
      if (extra?.stripePaymentIntentId && order.stripePaymentIntentId !== extra.stripePaymentIntentId) {
        order.stripePaymentIntentId = extra.stripePaymentIntentId;
        order.updatedAt = new Date().toISOString();
        const supabase = getSupabaseServerClient();
        if (supabase) {
          const { error } = await supabase.from('orders').update({
            stripe_payment_intent_id: order.stripePaymentIntentId,
            updated_at: order.updatedAt
          }).eq('id', order.id);
          ensureDatabaseSuccess('mise à jour du PaymentIntent de la commande', error);
        }
        const index = this.inMemoryOrders.findIndex(existing => existing.id === order.id);
        if (index >= 0) this.inMemoryOrders[index] = order;
        else if (supabase) this.inMemoryOrders.unshift(order);
      }
      return order;
    }

    const oldStatus = order.status;

    // Validate transition
    if (!this.isTransitionAllowed(oldStatus, newStatus)) {
      throw new Error(`Transition de statut invalide : impossible de passer de '${oldStatus}' à '${newStatus}'.`);
    }

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (extra?.stripePaymentIntentId) order.stripePaymentIntentId = extra.stripePaymentIntentId;

    const supabase = getSupabaseServerClient();

    // Log status transition into audit trail
    await this.logOrderStatusHistory(
      orderId,
      oldStatus,
      newStatus,
      extra?.changedBy,
      extra?.changedByRole || 'admin',
      extra?.reason || `Changement de statut de ${oldStatus} vers ${newStatus}`,
      'admin_dashboard'
    );

    // Handle stock transitions
    // Case 1: Payment Confirmed (payment_pending_webhook / pending_payment / payment_failed -> paid)
    if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment' || oldStatus === 'payment_failed') && newStatus === 'paid') {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const variantId = item.variantId;
        const inv = variantId
          ? await this.getInventoryByVariantId(realId, variantId)
          : await this.getInventoryByProductId(realId);
        const newQ = Math.max(0, inv.quantity - item.quantity);
        const newResQ = Math.max(0, inv.reserved_quantity - item.quantity);
        const val = { quantity: newQ, reserved_quantity: newResQ };
        if (!supabase) {
          this.inMemoryInventory.set(variantId ? `${realId}:${variantId}` : realId, val);
          const pIdx = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
          const inMemoryProduct = pIdx >= 0 ? this.inMemoryProducts[pIdx] : undefined;
          const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === variantId);
          if (inMemoryVariant && variantId) {
            inMemoryVariant.stock_quantity = newQ;
            inMemoryVariant.reserved_quantity = newResQ;
          } else if (inMemoryProduct) {
            inMemoryProduct.stockQuantity = newQ;
            inMemoryProduct.inStock = newQ > 0;
          }
        }

        if (supabase && !variantId) {
          const { error } = await supabase.from('products').update({
            stock_quantity: newQ,
            in_stock: newQ > 0,
            updated_at: new Date().toISOString()
          }).eq('id', realId);
          ensureDatabaseSuccess('mise à jour du stock produit', error);
          await this.syncInventoryToSupabase(realId, newQ, newResQ);
        } else if (variantId) {
          await this.syncVariantInventoryToSupabase(realId, variantId, newQ, newResQ);
        }
      }
    }
    // Case 2: Payment Failed / Cancelled (payment_pending_webhook / pending_payment -> payment_failed / cancelled)
    else if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment') && (newStatus === 'payment_failed' || newStatus === 'cancelled')) {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const variantId = item.variantId;
        const inv = variantId
          ? await this.getInventoryByVariantId(realId, variantId)
          : await this.getInventoryByProductId(realId);
        const newResQ = Math.max(0, inv.reserved_quantity - item.quantity);
        if (!supabase) this.inMemoryInventory.set(variantId ? `${realId}:${variantId}` : realId, { quantity: inv.quantity, reserved_quantity: newResQ });
        if (variantId) await this.syncVariantInventoryToSupabase(realId, variantId, inv.quantity, newResQ);
        else await this.syncInventoryToSupabase(realId, inv.quantity, newResQ);
      }
    }
    // Case 3: Refunds restore only the returned quantities. A direct full
    // refund transition keeps the legacy behavior and restores all items;
    // processStripeRefund passes an explicit item list for partial returns.
    else if (
      ['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'partially_refunded'].includes(oldStatus)
      && (newStatus === 'refunded' || newStatus === 'partially_refunded')
    ) {
      const itemsToRestore = extra?.restockItems || (newStatus === 'refunded' ? order.items : []);
      for (const item of itemsToRestore) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const variantId = item.variantId;
        const inv = variantId
          ? await this.getInventoryByVariantId(realId, variantId)
          : await this.getInventoryByProductId(realId);
        const newQ = inv.quantity + item.quantity;
        const val = { quantity: newQ, reserved_quantity: inv.reserved_quantity };
        if (!supabase) {
          this.inMemoryInventory.set(variantId ? `${realId}:${variantId}` : realId, val);
          const pIdx = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
          const inMemoryProduct = pIdx >= 0 ? this.inMemoryProducts[pIdx] : undefined;
          const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === variantId);
          if (inMemoryVariant && variantId) {
            inMemoryVariant.stock_quantity = newQ;
          } else if (inMemoryProduct) {
            inMemoryProduct.stockQuantity = newQ;
            inMemoryProduct.inStock = true;
          }
        }

        if (supabase && !variantId) {
          const { error } = await supabase.from('products').update({
            stock_quantity: newQ,
            in_stock: true,
            updated_at: new Date().toISOString()
          }).eq('id', realId);
          ensureDatabaseSuccess('restauration du stock produit', error);
          await this.syncInventoryToSupabase(realId, newQ, inv.reserved_quantity);
        } else if (variantId) {
          await this.syncVariantInventoryToSupabase(realId, variantId, newQ, inv.reserved_quantity);
        }
      }
    }

    // Save order changes in the local cache only after the persistent path,
    // when one is configured, has accepted the operation.
    const idx = this.inMemoryOrders.findIndex(o => o.id === order.id);
    if (!supabase && idx >= 0) this.inMemoryOrders[idx] = order;

    if (supabase) {
      const { error: orderError } = await supabase.from('orders').update({
        status: newStatus,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        updated_at: order.updatedAt
      }).eq('id', order.id);
      ensureDatabaseSuccess('mise à jour du statut de commande', orderError);

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: order.id,
        amount: order.total,
        currency: 'EUR',
        status: newStatus,
        stripe_payment_intent_id: order.stripePaymentIntentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      ensureDatabaseSuccess('création du paiement de statut', paymentError);
      if (idx >= 0) this.inMemoryOrders[idx] = order;
      else this.inMemoryOrders.unshift(order);
    }

    // Trigger Notification & Email for customer
    if (order.userId) {
      const type = newStatus === 'paid' ? 'payment_confirmed' : `order_${newStatus}`;
      const title = `Mise à jour commande #${order.id}`;
      const msgText = `Le statut de votre commande est désormais : ${newStatus.toUpperCase()}`;

      await this.sendNotification(order.userId, type, title, msgText, `/account?tab=orders`, order.id);

      await emailService.sendEmail({
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] ${title}`,
        template: type as any,
        data: { orderId: order.id, total: order.total, status: newStatus }
      });
    }

    return order;
  }

  // ============================================================
  // PHASE 5: ORDER STATUS HISTORY & TRANSITION VALIDATION
  // ============================================================
  public isTransitionAllowed(oldStatus: OrderStatus, newStatus: OrderStatus): boolean {
    if (oldStatus === newStatus) return true;

    const allowedTransitions: Record<string, string[]> = {
      pending_payment: ['payment_pending_webhook', 'paid', 'cancelled', 'payment_failed'],
      payment_pending_webhook: ['paid', 'payment_failed', 'cancelled'],
      paid: ['processing', 'packed', 'shipped', 'refunded', 'partially_refunded', 'return_requested'],
      processing: ['packed', 'shipped', 'cancelled', 'refunded', 'partially_refunded'],
      packed: ['shipped', 'cancelled', 'refunded', 'partially_refunded'],
      shipped: ['delivered', 'returned', 'refunded', 'partially_refunded'],
      delivered: ['return_requested', 'returned', 'refunded', 'partially_refunded'],
      return_requested: ['returned', 'rejected', 'refunded', 'partially_refunded', 'cancelled'],
      returned: ['refunded', 'partially_refunded'],
      partially_refunded: ['refunded', 'return_requested'],
      payment_failed: ['paid']
    };

    const allowed = allowedTransitions[oldStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }

  public async logOrderStatusHistory(orderId: string, oldStatus: string | undefined, newStatus: string, changedBy?: string, changedByRole: string = 'system', reason?: string, source: string = 'system'): Promise<void> {
    const entry: OrderStatusHistoryEntry = {
      id: randomUUID(),
      orderId,
      oldStatus,
      newStatus,
      changedBy,
      changedByRole,
      reason,
      source,
      createdAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('order_status_history').insert({
          id: entry.id,
          order_id: orderId,
          old_status: oldStatus || null,
          new_status: newStatus,
          changed_by: changedBy || null,
          changed_by_role: changedByRole,
          reason: reason || null,
          source: source,
          created_at: entry.createdAt
        });
        ensureDatabaseSuccess('création de l’historique de commande', error);
      } catch (err) {
        console.error('[serverDb] logOrderStatusHistory error:', err);
        throw err;
      }
    }

    this.inMemoryStatusHistory.unshift(entry);
  }

  public async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture de l’historique de commande', error);
        if (data) {
          return data.map(d => ({
            id: d.id,
            orderId: d.order_id,
            oldStatus: d.old_status,
            newStatus: d.new_status,
            changedBy: d.changed_by,
            changedByRole: d.changed_by_role,
            reason: d.reason,
            source: d.source,
            createdAt: d.created_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getOrderStatusHistory error:', err);
        throw err;
      }
    }
    return this.inMemoryStatusHistory.filter(h => h.orderId === orderId);
  }

  // ============================================================
  // PHASE 5: USER NOTIFICATIONS & PREFERENCES
  // ============================================================
  public async sendNotification(userId: string, type: string, title: string, message: string, link?: string, orderId?: string): Promise<UserNotification> {
    const notif: UserNotification = {
      id: randomUUID(),
      userId,
      type,
      title,
      message,
      link,
      orderId,
      read: false,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: notificationError } = await supabase.from('notifications').insert({
          id: notif.id,
          user_id: userId,
          type,
          title,
          message,
          link: link || null,
          order_id: orderId || null,
          read: false,
          created_at: notif.createdAt,
          delivered_at: notif.deliveredAt
        });
        ensureDatabaseSuccess('création de la notification', notificationError);

        const { error: logError } = await supabase.from('notification_logs').insert({
          user_id: userId,
          notification_id: notif.id,
          channel: 'in_app',
          status: 'sent',
          created_at: notif.createdAt
        });
        ensureDatabaseSuccess('création du journal de notification', logError);
      } catch (err) {
        console.error('[serverDb] sendNotification error:', err);
        throw err;
      }
    }

    this.inMemoryNotifications.unshift(notif);
    return notif;
  }

  public async getNotifications(userId: string): Promise<UserNotification[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture des notifications', error);
        if (data) {
          return data.map(n => ({
            id: n.id,
            userId: n.user_id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            orderId: n.order_id,
            read: n.read,
            createdAt: n.created_at,
            deliveredAt: n.delivered_at,
            errorMessage: n.error_message
          }));
        }
      } catch (err) {
        console.error('[serverDb] getNotifications error:', err);
        throw err;
      }
    }
    return this.inMemoryNotifications.filter(n => n.userId === userId);
  }

  public async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId).select('id').maybeSingle();
        ensureDatabaseSuccess('marquage de notification comme lue', error);
        if (!data) return false;
      } catch (err) {
        console.error('[serverDb] markNotificationRead error:', err);
        throw err;
      }
    }

    const idx = this.inMemoryNotifications.findIndex(n => n.id === notificationId && n.userId === userId);
    if (idx >= 0) this.inMemoryNotifications[idx].read = true;
    return idx >= 0 || !!supabase;
  }

  public async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);
        ensureDatabaseSuccess('suppression de notification', error);
      } catch (err) {
        console.error('[serverDb] deleteNotification error:', err);
        throw err;
      }
    }

    const before = this.inMemoryNotifications.length;
    this.inMemoryNotifications = this.inMemoryNotifications.filter(n => !(n.id === notificationId && n.userId === userId));
    return before !== this.inMemoryNotifications.length || !!supabase;
  }

  public async getNotificationPreferences(userId: string): Promise<NotificationPreference> {
    const defaultPref: NotificationPreference = {
      userId,
      emailNotifications: true,
      transactionalEmails: true,
      marketingEmails: false,
      inAppNotifications: true,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
        ensureDatabaseSuccess('lecture des préférences de notification', error);
        if (data) {
          return {
            userId: data.user_id,
            emailNotifications: data.email_notifications,
            transactionalEmails: data.transactional_emails,
            marketingEmails: data.marketing_emails,
            inAppNotifications: data.in_app_notifications,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.error('[serverDb] getNotificationPreferences error:', err);
        throw err;
      }
    }

    return this.inMemoryPreferences.get(userId) || defaultPref;
  }

  public async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const current = await this.getNotificationPreferences(userId);
    const updated: NotificationPreference = {
      ...current,
      ...prefs,
      userId,
      transactionalEmails: true, // Transactional stays mandatory
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('notification_preferences').upsert({
          user_id: userId,
          email_notifications: updated.emailNotifications,
          transactional_emails: true,
          marketing_emails: updated.marketingEmails,
          in_app_notifications: updated.inAppNotifications,
          updated_at: updated.updatedAt
        }, { onConflict: 'user_id' });
        ensureDatabaseSuccess('mise à jour des préférences de notification', error);
      } catch (err) {
        console.error('[serverDb] updateNotificationPreferences error:', err);
        throw err;
      }
    }

    this.inMemoryPreferences.set(userId, updated);
    return updated;
  }

  // ============================================================
  // PHASE 5: SHIPMENTS & CARRIER TRACKING
  // ============================================================
  public async getShipmentByOrderId(orderId: string): Promise<ShipmentDetails | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('shipments').select('*').eq('order_id', orderId).maybeSingle();
        ensureDatabaseSuccess('lecture de l’expédition', error);
        if (data) {
          return {
            id: data.id,
            orderId: data.order_id,
            userId: data.user_id,
            carrier: data.carrier as ShippingCarrier,
            method: data.method,
            price: Number(data.price || 0),
            trackingNumber: data.tracking_number,
            trackingUrl: data.tracking_url,
            status: data.status,
            shippedAt: data.shipped_at,
            estimatedDelivery: data.estimated_delivery,
            deliveredAt: data.delivered_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch (err) {
        console.error('[serverDb] getShipmentByOrderId error:', err);
        throw err;
      }
    }

    return supabase ? undefined : this.inMemoryShipments.get(orderId);
  }

  public async upsertShipment(details: ShipmentDetails): Promise<ShipmentDetails> {
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    let shipmentId = isUuid(details.id) ? details.id : randomUUID();

    if (supabase) {
      const { data: existingShipment, error: lookupError } = await supabase
        .from('shipments')
        .select('id')
        .eq('order_id', details.orderId)
        .maybeSingle();
      ensureDatabaseSuccess('vérification de l’expédition existante', lookupError);
      // Keep the existing primary key so shipping_events remain attached when
      // the current shipment is updated through the order-level upsert.
      if (existingShipment?.id) shipmentId = existingShipment.id;
    }

    const finalDetails: ShipmentDetails = {
      ...details,
      id: shipmentId,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('shipments').upsert({
          id: finalDetails.id,
          order_id: details.orderId,
          user_id: details.userId || null,
          carrier: details.carrier,
          method: details.method || 'standard',
          price: details.price || 0,
          tracking_number: details.trackingNumber || null,
          tracking_url: details.trackingUrl || null,
          status: details.status,
          shipped_at: details.shippedAt || null,
          estimated_delivery: details.estimatedDelivery || null,
          delivered_at: details.deliveredAt || null,
          updated_at: now
        }, { onConflict: 'order_id' });
        ensureDatabaseSuccess('sauvegarde de l’expédition', error);
      } catch (err) {
        console.error('[serverDb] upsertShipment error:', err);
        throw err;
      }
    }

    this.inMemoryShipments.set(details.orderId, finalDetails);
    return finalDetails;
  }

  // ============================================================
  // PHASE 5: RETURNS & REFUNDS
  // ============================================================
  public async createReturnRequest(userId: string, orderId: string, reason: string, items: any[], comment?: string): Promise<CustomerReturn> {
    if (!reason.trim() || !Array.isArray(items) || items.length === 0) {
      throw new Error('Les informations de retour sont incomplètes.');
    }

    const order = await this.getOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new Error('Commande introuvable pour ce client.');
    }
    if (!['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested'].includes(order.status)) {
      throw new Error(`La commande #${orderId} n’est pas éligible à une demande de retour depuis le statut '${order.status}'.`);
    }

    const orderQuantities = new Map(order.items.map(item => [item.productId, item.quantity]));
    const alreadyRequested = new Map<string, number>();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: previousReturns, error } = await supabase
        .from('returns')
        .select('items, quantity, status')
        .eq('order_id', orderId);
      ensureDatabaseSuccess('lecture des retours existants de la commande', error);
      for (const previous of previousReturns || []) {
        if (['rejected', 'cancelled'].includes(previous.status)) continue;
        if (!Array.isArray(previous.items) || previous.items.length === 0) {
          throw new Error('Les lignes d’un retour historique sont inconnues : réconciliation manuelle requise avant une nouvelle demande.');
        }
        for (const item of previous.items) {
          const productId = item?.productId || item?.product_id;
          const quantity = Number(item?.quantity);
          if (typeof productId === 'string' && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(productId, (alreadyRequested.get(productId) || 0) + quantity);
          }
        }
      }
    } else {
      for (const previous of this.inMemoryReturns) {
        if (previous.orderId !== orderId || ['rejected', 'cancelled'].includes(previous.status)) continue;
        for (const item of previous.items || []) {
          const productId = item?.productId || item?.product_id;
          const quantity = Number(item?.quantity);
          if (typeof productId === 'string' && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(productId, (alreadyRequested.get(productId) || 0) + quantity);
          }
        }
      }
    }

    const normalizedItems = new Map<string, { productId: string; quantity: number }>();
    for (const item of items) {
      const productId = item?.productId || item?.product_id;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('Ligne de retour invalide.');
      }
      const nextQuantity = (normalizedItems.get(productId)?.quantity || 0) + quantity;
      const totalRequested = (alreadyRequested.get(productId) || 0) + nextQuantity;
      if (!orderQuantities.has(productId) || totalRequested > orderQuantities.get(productId)!) {
        throw new Error(`Quantité retournée invalide pour le produit ${productId}.`);
      }
      normalizedItems.set(productId, { productId, quantity: nextQuantity });
    }

    const normalizedReturnItems = Array.from(normalizedItems.values());
    const now = new Date().toISOString();
    const ret: CustomerReturn = {
      id: randomUUID(),
      orderId,
      userId,
      reason: reason.trim(),
      items: normalizedReturnItems,
      quantity: normalizedReturnItems.reduce((acc, item) => acc + item.quantity, 0),
      status: 'requested',
      comment: comment?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('returns').insert({
          id: ret.id,
          order_id: orderId,
          user_id: userId,
          reason: ret.reason,
          items: normalizedReturnItems,
          quantity: ret.quantity,
          status: 'requested',
          comment: ret.comment || null,
          created_at: ret.createdAt,
          updated_at: ret.updatedAt
        });
        ensureDatabaseSuccess('création de la demande de retour', error);
      } catch (err) {
        console.error('[serverDb] createReturnRequest error:', err);
        throw err;
      }
    }

    this.inMemoryReturns.unshift(ret);
    await this.logOrderStatusHistory(orderId, undefined, 'return_requested', userId, 'customer', ret.reason, 'customer_action');
    await this.sendNotification(userId, 'return_requested', 'Demande de retour enregistrée', `Votre demande de retour pour la commande #${orderId} a été reçue.`, `/account?tab=returns`, orderId);

    return ret;
  }

  public async getReturnsByUser(userId: string): Promise<CustomerReturn[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture des retours utilisateur', error);
        if (data) {
          return data.map(r => ({
            id: r.id,
            orderId: r.order_id,
            userId: r.user_id,
            reason: r.reason,
            items: r.items || [],
            quantity: r.quantity,
            status: r.status,
            comment: r.comment,
            adminComment: r.admin_comment,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getReturnsByUser error:', err);
        throw err;
      }
    }
    return this.inMemoryReturns.filter(r => r.userId === userId);
  }

  public async getAllReturns(): Promise<CustomerReturn[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').select('*').order('created_at', { ascending: false });
        ensureDatabaseSuccess('lecture de tous les retours', error);
        if (data) {
          return data.map(r => ({
            id: r.id,
            orderId: r.order_id,
            userId: r.user_id,
            reason: r.reason,
            items: r.items || [],
            quantity: r.quantity,
            status: r.status,
            comment: r.comment,
            adminComment: r.admin_comment,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getAllReturns error:', err);
        throw err;
      }
    }
    return this.inMemoryReturns;
  }

  public async updateReturnStatus(returnId: string, status: CustomerReturn['status'], adminComment?: string): Promise<CustomerReturn | undefined> {
    const supabase = getSupabaseServerClient();
    const memoryReturn = this.inMemoryReturns.find(r => r.id === returnId);
    const currentReturn = supabase ? await this.getReturnById(returnId) : memoryReturn;
    if (!currentReturn) return undefined;

    const allowedTransitions: Record<CustomerReturn['status'], CustomerReturn['status'][]> = {
      requested: ['requested', 'approved', 'rejected', 'cancelled'],
      approved: ['approved', 'received', 'rejected', 'cancelled'],
      received: ['received', 'refunded', 'rejected'],
      rejected: ['rejected'],
      refunded: ['refunded'],
      cancelled: ['cancelled']
    };
    if (!allowedTransitions[currentReturn.status].includes(status)) {
      throw new Error(`Transition de retour invalide : ${currentReturn.status} -> ${status}.`);
    }

    const updatedAt = new Date().toISOString();
    const nextAdminComment = adminComment !== undefined ? adminComment : currentReturn.adminComment;
    let updatedReturn: CustomerReturn = {
      ...currentReturn,
      status,
      adminComment: nextAdminComment,
      updatedAt
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('returns').update({
          status,
          admin_comment: nextAdminComment || null,
          updated_at: updatedAt
        }).eq('id', returnId).select('*').maybeSingle();
        ensureDatabaseSuccess('mise à jour de la demande de retour', error);
        if (!data) return undefined;
        updatedReturn = {
          id: data.id,
          orderId: data.order_id,
          userId: data.user_id,
          reason: data.reason,
          items: data.items || [],
          quantity: Number(data.quantity || 0),
          status: data.status,
          comment: data.comment || undefined,
          adminComment: data.admin_comment || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (err) {
        console.error('[serverDb] updateReturnStatus error:', err);
        throw err;
      }
    }

    const index = this.inMemoryReturns.findIndex(r => r.id === returnId);
    if (index >= 0) this.inMemoryReturns[index] = updatedReturn;
    else if (!supabase) this.inMemoryReturns.unshift(updatedReturn);

    await this.sendNotification(
      updatedReturn.userId,
      status === 'approved' ? 'refund_created' : 'return_requested',
      `Mise à jour de votre retour #${updatedReturn.id}`,
      `Le statut de votre retour pour la commande #${updatedReturn.orderId} est désormais : ${status.toUpperCase()}. ${adminComment ? 'Note admin : ' + adminComment : ''}`,
      `/account?tab=returns`,
      updatedReturn.orderId
    );

    return updatedReturn;
  }

  private async getRefundsByOrder(orderId: string): Promise<CustomerRefund[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('refunds').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
        ensureDatabaseSuccess('lecture des remboursements de la commande', error);
        return (data || []).map(mapRefundRow);
      } catch (err) {
        console.error('[serverDb] getRefundsByOrder error:', err);
        throw err;
      }
    }
    return this.inMemoryRefunds.filter(refund => refund.orderId === orderId);
  }

  private async findRefundByIdempotencyKey(idempotencyKey: string): Promise<CustomerRefund | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('refunds').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
      ensureDatabaseSuccess('recherche du remboursement idempotent', error);
      return data ? mapRefundRow(data) : undefined;
    }
    return this.inMemoryRefunds.find(refund => refund.idempotencyKey === idempotencyKey);
  }

  private async findRefundByStripeId(stripeRefundId: string): Promise<CustomerRefund | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('refunds').select('*').eq('stripe_refund_id', stripeRefundId).maybeSingle();
      ensureDatabaseSuccess('recherche du remboursement Stripe', error);
      return data ? mapRefundRow(data) : undefined;
    }
    return this.inMemoryRefunds.find(refund => refund.stripeRefundId === stripeRefundId);
  }

  private async getReturnById(returnId: string): Promise<CustomerReturn | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('returns').select('*').eq('id', returnId).maybeSingle();
      ensureDatabaseSuccess('lecture de la demande de retour', error);
      if (!data) return undefined;
      return {
        id: data.id,
        orderId: data.order_id,
        userId: data.user_id,
        reason: data.reason,
        items: data.items || [],
        quantity: Number(data.quantity || 0),
        status: data.status,
        comment: data.comment || undefined,
        adminComment: data.admin_comment || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    return this.inMemoryReturns.find(ret => ret.id === returnId);
  }

  private async getRefundItems(
    order: ServerOrder,
    returnId: string | undefined,
    amountCents: number,
    remainingCents: number,
    previousRefunds: CustomerRefund[] = []
  ): Promise<Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>> {
    const orderItems = new Map(order.items.map(item => [item.productId, item]));
    const previouslyRestored = new Map<string, number>();
    const unknownPreviousStock = previousRefunds.some(refund =>
      ['succeeded', 'completed'].includes(refund.status)
      && refund.stockRestored === true
      && (!refund.items || refund.items.length === 0)
    );

    if (unknownPreviousStock) {
      throw new Error('Les lignes d’un remboursement historique sont inconnues : réconciliation manuelle requise avant un nouveau remboursement.');
    }

    for (const refund of previousRefunds) {
      if (['succeeded', 'completed'].includes(refund.status) && refund.stockRestored) {
        for (const item of refund.items || []) {
          previouslyRestored.set(item.productId, (previouslyRestored.get(item.productId) || 0) + item.quantity);
        }
      }
    }

    let requestedItems: any[] = order.items;
    if (returnId) {
      const ret = await this.getReturnById(returnId);
      if (!ret || ret.orderId !== order.id) {
        throw new Error(`Demande de retour #${returnId} introuvable pour la commande #${order.id}.`);
      }
      if (!['approved', 'received'].includes(ret.status)) {
        throw new Error(`La demande de retour #${returnId} doit être approuvée avant remboursement.`);
      }
      requestedItems = ret.items;
    } else {
      if (amountCents !== remainingCents) {
        throw new Error('Un remboursement partiel doit être rattaché à une demande de retour.');
      }
      requestedItems = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity - (previouslyRestored.get(item.productId) || 0)
      })).filter(item => item.quantity > 0);
    }

    const requestedQuantities = new Map<string, number>();
    for (const item of requestedItems) {
      const productId = item?.productId || item?.product_id;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error(`Quantité remboursée invalide pour le produit ${productId || 'inconnu'}.`);
      }
      requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
    }

    const refundItems = Array.from(requestedQuantities, ([productId, requestedQuantity]) => {
      const orderItem = orderItems.get(productId);
      const alreadyRestored = previouslyRestored.get(productId) || 0;
      const availableQuantity = (orderItem?.quantity || 0) - alreadyRestored;
      if (!orderItem || requestedQuantity > availableQuantity) {
        throw new Error(`Quantité remboursée invalide pour le produit ${productId}.`);
      }
      return { productId, quantity: requestedQuantity };
    });

    if (refundItems.length === 0) {
      throw new Error('Aucun article valide à rembourser.');
    }

    const maximumItemAmountCents = refundItems.reduce((sum, item) => {
      const orderItem = orderItems.get(item.productId)!;
      return sum + Math.round(orderItem.price * 100) * item.quantity;
    }, 0);
    if (amountCents > maximumItemAmountCents) {
      throw new Error('Le montant du remboursement dépasse la valeur des articles retournés.');
    }

    return refundItems;
  }

  private async restoreLocalRefundStock(order: ServerOrder, items: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>): Promise<void> {
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      const realId = product ? product.id : item.productId;
      const inventory = await this.getInventoryByProductId(realId);
      const quantity = inventory.quantity + item.quantity;
      const updatedInventory = { quantity, reserved_quantity: inventory.reserved_quantity };
      this.inMemoryInventory.set(realId, updatedInventory);
      if (realId !== item.productId) this.inMemoryInventory.set(item.productId, updatedInventory);

      const productIndex = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
      if (productIndex >= 0) {
        this.inMemoryProducts[productIndex].stockQuantity = quantity;
        this.inMemoryProducts[productIndex].inStock = true;
      }
    }
  }

  private async finalizeRefund(input: {
    order: ServerOrder;
    returnId?: string;
    amount: number;
    currency: string;
    reason: string;
    stripeRefundId?: string;
    idempotencyKey: string;
    status: 'pending' | 'succeeded';
    items: Array<Pick<ServerOrderItem, 'productId' | 'quantity'>>;
    applyStock: boolean;
  }): Promise<CustomerRefund> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('finalize_refund', {
        p_order_id: input.order.id,
        p_return_id: input.returnId || null,
        p_user_id: input.order.userId || null,
        p_amount: input.amount,
        p_currency: input.currency,
        p_reason: input.reason,
        p_stripe_refund_id: input.stripeRefundId || null,
        p_idempotency_key: input.idempotencyKey,
        p_status: input.status,
        p_items: input.items,
        p_apply_stock: input.applyStock
      });
      ensureDatabaseSuccess('finalisation atomique du remboursement', error);
      if (!data) throw new Error('[Supabase] finalisation atomique du remboursement: réponse vide');
      return mapRefundRow(Array.isArray(data) ? data[0] : data);
    }

    const existing = this.inMemoryRefunds.find(refund =>
      refund.idempotencyKey === input.idempotencyKey
      || (!!input.stripeRefundId && refund.stripeRefundId === input.stripeRefundId)
    );
    if (existing) {
      if (input.applyStock && input.status === 'succeeded' && !existing.stockRestored) {
        await this.restoreLocalRefundStock(input.order, input.items);
        existing.stockRestored = true;
        existing.status = 'succeeded';
        const previousRefunds = this.inMemoryRefunds
          .filter(refund => refund.orderId === input.order.id && refund.status === 'succeeded')
          .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
        const status: OrderStatus = previousRefunds >= Math.round(input.order.total * 100) ? 'refunded' : 'partially_refunded';
        await this.updateOrderStatus(input.order.id, status, { reason: input.reason, restockItems: [] });
      }
      return existing;
    }

    const ref: CustomerRefund = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderId: input.order.id,
      returnId: input.returnId,
      userId: input.order.userId,
      amount: input.amount,
      currency: input.currency,
      reason: input.reason,
      stripeRefundId: input.stripeRefundId,
      idempotencyKey: input.idempotencyKey,
      status: input.status,
      stockRestored: false,
      items: input.items,
      createdAt: new Date().toISOString()
    };

    this.inMemoryRefunds.unshift(ref);

    if (input.applyStock && input.status === 'succeeded') {
      await this.restoreLocalRefundStock(input.order, input.items);
      ref.stockRestored = true;
      const totalRefunded = this.inMemoryRefunds
        .filter(refund => refund.orderId === input.order.id && ['succeeded', 'completed'].includes(refund.status))
        .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
      const status: OrderStatus = totalRefunded >= Math.round(input.order.total * 100) ? 'refunded' : 'partially_refunded';
      await this.updateOrderStatus(input.order.id, status, { reason: input.reason, restockItems: [] });
    }

    return ref;
  }

  public async processStripeRefund(
    orderId: string,
    returnId?: string,
    amount?: number,
    reason: string = 'Remboursement client',
    requestedIdempotencyKey?: string
  ): Promise<CustomerRefund> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement.`);

    const preliminaryKey = requestedIdempotencyKey?.trim()
      || `refund:${orderId}:${returnId || 'manual'}:${amount === undefined ? 'full' : amount}`;
    const existing = await this.findRefundByIdempotencyKey(preliminaryKey);
    if (existing) return existing;

    const previousRefunds = await this.getRefundsByOrder(orderId);
    const previousRefundedCents = previousRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status))
      .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
    const orderTotalCents = Math.round(order.total * 100);
    const remainingCents = orderTotalCents - previousRefundedCents;
    const refundCents = amount === undefined ? remainingCents : Math.round(amount * 100);

    if (!Number.isSafeInteger(refundCents) || refundCents <= 0) {
      throw new Error('Le montant du remboursement doit être strictement positif.');
    }
    if (refundCents > remainingCents) {
      throw new Error('Le montant du remboursement dépasse le montant encore remboursable.');
    }
    if (!['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'returned', 'partially_refunded'].includes(order.status)) {
      throw new Error(`La commande #${orderId} ne peut pas être remboursée depuis le statut '${order.status}'.`);
    }

    const items = await this.getRefundItems(order, returnId, refundCents, remainingCents, previousRefunds);
    const idempotencyKey = requestedIdempotencyKey?.trim()
      || `refund:${orderId}:${returnId || 'manual'}:${refundCents}`;
    const secondExisting = await this.findRefundByIdempotencyKey(idempotencyKey);
    if (secondExisting) return secondExisting;

    const stripe = getStripeServerClient();
    let stripeRefundId: string | undefined;
    let refundStatus: 'pending' | 'succeeded' = 'succeeded';

    if (stripe) {
      let paymentIntentId = order.stripePaymentIntentId;
      if (!paymentIntentId && order.stripeSessionId) {
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      }
      if (!paymentIntentId) {
        throw new Error(`Aucun PaymentIntent Stripe associé à la commande #${orderId}.`);
      }

      const stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundCents,
        metadata: {
          orderId,
          returnId: returnId || ''
        }
      }, { idempotencyKey });

      if (stripeRefund.status === 'failed' || stripeRefund.status === 'canceled') {
        throw new Error(`Stripe a refusé le remboursement : ${stripeRefund.failure_reason || stripeRefund.status}.`);
      }
      stripeRefundId = stripeRefund.id;
      refundStatus = stripeRefund.status === 'pending' ? 'pending' : 'succeeded';
    } else if (isSupabaseServerConfigured() || process.env.NODE_ENV === 'production') {
      throw new Error('Remboursement impossible : STRIPE_SECRET_KEY est requis lorsque Supabase ou la production est activé.');
    } else {
      // Explicit local-only simulation. It is never allowed with a configured
      // Supabase store or in production.
      stripeRefundId = `re_test_${Date.now()}`;
    }

    const refund = await this.finalizeRefund({
      order,
      returnId,
      amount: refundCents / 100,
      currency: 'EUR',
      reason,
      stripeRefundId,
      idempotencyKey,
      status: refundStatus,
      items,
      applyStock: refundStatus === 'succeeded'
    });

    if (refundStatus === 'succeeded' && order.userId) {
      await this.sendNotification(
        order.userId,
        'refund_created',
        'Remboursement effectué',
        `Un remboursement de ${(refundCents / 100).toFixed(2)} EUR a été émis pour votre commande #${orderId}.`,
        `/account?tab=refunds`,
        orderId
      );

      await emailService.sendEmail({
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Remboursement effectué pour votre commande #${orderId}`,
        template: 'refund_created',
        data: { orderId, amount: refundCents / 100, reason }
      });
    }

    return refund;
  }

  public async recordStripeRefundFromWebhook(
    orderId: string,
    details: {
      eventId: string;
      stripeRefundId?: string;
      amount: number;
      currency?: string;
      reason?: string;
      returnId?: string;
    }
  ): Promise<CustomerRefund> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error(`Commande #${orderId} introuvable pour le remboursement Stripe.`);

    const eventKey = `stripe-event:${details.eventId}`;
    const existingByEvent = await this.findRefundByIdempotencyKey(eventKey);
    if (existingByEvent && existingByEvent.status !== 'pending') return existingByEvent;
    if (details.stripeRefundId) {
      const existingByStripe = await this.findRefundByStripeId(details.stripeRefundId);
      if (existingByStripe && existingByStripe.status !== 'pending') return existingByStripe;
    }

    const previousRefunds = await this.getRefundsByOrder(orderId);
    const previousRefundedCents = previousRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status))
      .reduce((sum, refund) => sum + Math.round(refund.amount * 100), 0);
    const reportedCents = Math.round(details.amount * 100);
    const refundCents = Math.min(reportedCents - previousRefundedCents, Math.round(order.total * 100) - previousRefundedCents);
    if (!Number.isSafeInteger(refundCents) || refundCents <= 0) {
      throw new Error(`Montant de remboursement Stripe invalide pour la commande #${orderId}.`);
    }

    const remainingCents = Math.round(order.total * 100) - previousRefundedCents;
    const isFullRefund = refundCents >= remainingCents;
    const items = isFullRefund
      ? await this.getRefundItems(order, undefined, refundCents, remainingCents, previousRefunds)
      : [];

    return this.finalizeRefund({
      order,
      returnId: details.returnId,
      amount: refundCents / 100,
      currency: (details.currency || 'EUR').toUpperCase(),
      reason: details.reason || 'Remboursement Stripe confirmé',
      stripeRefundId: details.stripeRefundId,
      idempotencyKey: eventKey,
      status: 'succeeded',
      items,
      applyStock: isFullRefund
    });
  }

  // ============================================================
  // KURLA ID BEAUTY PROFILES
  // ============================================================
  private mapBeautyProfileRow(row: any): BeautyProfileRecord {
    const profile = normalizeBeautyProfile(row.profile);
    const confidence: ProfileConfidence = calculateProfileConfidence(profile);
    return {
      userId: row.user_id,
      profile,
      confidence,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async getBeautyProfile(userId: string): Promise<BeautyProfileRecord | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profiles').select('*').eq('user_id', userId).maybeSingle();
      ensureDatabaseSuccess('lecture du profil beauté KURLA ID', error);
      return data ? this.mapBeautyProfileRow(data) : undefined;
    }
    return this.inMemoryBeautyProfiles.get(userId);
  }

  public async saveBeautyProfile(userId: string, input: unknown, source = 'user'): Promise<BeautyProfileRecord> {
    const profile = normalizeBeautyProfile(input);
    const confidence = calculateProfileConfidence(profile);
    const now = new Date().toISOString();
    const existing = await this.getBeautyProfile(userId);
    const createdAt = existing?.createdAt || now;
    const record: BeautyProfileRecord = { userId, profile, confidence, createdAt, updatedAt: now };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error } = await supabase.from('beauty_profiles').upsert({
        user_id: userId,
        profile,
        confidence: confidence.overall,
        photo_consent: profile.photoConsent,
        created_at: createdAt,
        updated_at: now
      }, { onConflict: 'user_id' });
      ensureDatabaseSuccess('enregistrement du profil beauté KURLA ID', error);

      const { error: historyError } = await supabase.from('beauty_profile_history').insert({
        user_id: userId,
        profile,
        confidence: confidence.overall,
        source,
        created_at: now
      });
      ensureDatabaseSuccess('historisation du profil beauté KURLA ID', historyError);
    }

    this.inMemoryBeautyProfiles.set(userId, record);
    const history = this.inMemoryBeautyProfileHistory.get(userId) || [];
    history.unshift({ id: randomUUID(), profile, confidence, source, createdAt: now });
    this.inMemoryBeautyProfileHistory.set(userId, history.slice(0, 50));
    return record;
  }

  public async getBeautyProfileHistory(userId: string): Promise<BeautyProfileHistoryEntry[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profile_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      ensureDatabaseSuccess('lecture de l’historique du profil beauté', error);
      return (data || []).map((row: any) => {
        const profile = normalizeBeautyProfile(row.profile);
        return {
          id: row.id,
          profile,
          confidence: calculateProfileConfidence(profile),
          source: row.source,
          createdAt: row.created_at
        };
      });
    }
    return [...(this.inMemoryBeautyProfileHistory.get(userId) || [])];
  }

  public async getBeautyProfilePhotos(userId: string): Promise<BeautyProfilePhoto[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('beauty_profile_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des photos du profil beauté', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        consentAt: row.consent_at,
        createdAt: row.created_at
      }));
    }
    return [...(this.inMemoryBeautyProfilePhotos.get(userId) || [])];
  }

  public async uploadBeautyProfilePhoto(userId: string, buffer: Uint8Array, mimeType: BeautyProfilePhoto['mimeType'], consentAt: string): Promise<BeautyProfilePhoto> {
    const id = randomUUID();
    const storagePath = `${userId}/${id}`;
    const now = new Date().toISOString();
    const photo: BeautyProfilePhoto = {
      id,
      storagePath,
      mimeType,
      sizeBytes: buffer.byteLength,
      consentAt,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error: uploadError } = await supabase.storage.from('beauty-profile-photos').upload(storagePath, buffer as any, {
        contentType: mimeType,
        upsert: false
      });
      ensureDatabaseSuccess('stockage de la photo du profil beauté', uploadError);
      const { error } = await supabase.from('beauty_profile_photos').insert({
        id,
        user_id: userId,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: buffer.byteLength,
        consent_at: consentAt,
        created_at: now
      });
      ensureDatabaseSuccess('enregistrement de la photo du profil beauté', error);
    }

    const photos = this.inMemoryBeautyProfilePhotos.get(userId) || [];
    photos.unshift(photo);
    this.inMemoryBeautyProfilePhotos.set(userId, photos.slice(0, 10));
    return photo;
  }

  public async deleteBeautyProfilePhotos(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error: selectError } = await supabase.from('beauty_profile_photos').select('storage_path').eq('user_id', userId);
      ensureDatabaseSuccess('lecture des photos à supprimer', selectError);
      const paths = (data || []).map((row: any) => row.storage_path).filter(Boolean);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('beauty-profile-photos').remove(paths);
        ensureDatabaseSuccess('suppression des fichiers photo du profil', storageError);
      }
      const { error } = await supabase.from('beauty_profile_photos').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des métadonnées photo du profil', error);
    }
    this.inMemoryBeautyProfilePhotos.delete(userId);
  }

  public async deleteBeautyProfile(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      await this.deleteBeautyProfilePhotos(userId);
      const { error: historyError } = await supabase.from('beauty_profile_history').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’historique du profil beauté', historyError);
      const { error } = await supabase.from('beauty_profiles').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression du profil beauté KURLA ID', error);
    }
    this.inMemoryBeautyProfiles.delete(userId);
    this.inMemoryBeautyProfileHistory.delete(userId);
    this.inMemoryBeautyProfilePhotos.delete(userId);
  }

  // ============================================================
  // ADAPTIVE ROUTINES, TASKS & PROGRESS JOURNAL
  // ============================================================
  private mapRoutineTaskRow(row: any): RoutineTask {
    return {
      id: row.id,
      planId: row.plan_id,
      title: row.title,
      description: row.description || '',
      kind: row.kind,
      scheduledFor: row.scheduled_for,
      timeOfDay: row.time_of_day || undefined,
      durationMinutes: Number(row.duration_minutes || 0),
      completedAt: row.completed_at || undefined,
      status: row.status,
      productLabels: Array.isArray(row.product_labels) ? row.product_labels : []
    };
  }

  private mapRoutineFeedbackRow(row: any): RoutineFeedback | undefined {
    const signal = normalizeRoutineFeedbackSignal(row.signal);
    if (!signal) return undefined;
    return {
      id: row.id,
      signal,
      note: row.note || undefined,
      productLabel: row.product_label || undefined,
      observedAt: row.observed_at || row.created_at,
      createdAt: row.created_at
    };
  }

  private mapRoutineJournalRow(row: any): RoutineJournalEntry {
    const metrics = row.metrics && typeof row.metrics === 'object' ? row.metrics : {};
    return {
      id: row.id,
      entryDate: row.entry_date,
      note: row.note || undefined,
      signals: Array.isArray(row.signals)
        ? row.signals.map(normalizeRoutineFeedbackSignal).filter((signal: RoutineFeedbackSignal | undefined): signal is RoutineFeedbackSignal => !!signal)
        : [],
      hydrationScore: Number.isInteger(metrics.hydrationScore) ? metrics.hydrationScore : undefined,
      breakageScore: Number.isInteger(metrics.breakageScore) ? metrics.breakageScore : undefined,
      comfortScore: Number.isInteger(metrics.comfortScore) ? metrics.comfortScore : undefined,
      detanglingScore: Number.isInteger(metrics.detanglingScore) ? metrics.detanglingScore : undefined,
      productsUsed: Array.isArray(row.products_used) ? row.products_used : [],
      createdAt: row.created_at
    };
  }

  public async getAdaptiveRoutineState(userId: string): Promise<{
    plan?: AdaptiveRoutinePlan;
    tasks: RoutineTask[];
    feedback: RoutineFeedback[];
    journal: RoutineJournalEntry[];
    persistence: 'supabase' | 'server_fallback';
  }> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: planRow, error: planError } = await supabase
        .from('routine_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      ensureDatabaseSuccess('lecture de la routine adaptative', planError);

      const plan = planRow ? {
        id: planRow.id,
        userId: planRow.user_id,
        preferences: normalizeRoutinePreferences(planRow.preferences),
        weather: normalizeWeatherContext(planRow.weather_context),
        adaptationNotes: Array.isArray(planRow.adaptation_notes) ? planRow.adaptation_notes : [],
        createdAt: planRow.created_at,
        updatedAt: planRow.updated_at,
        generatedThrough: planRow.generated_through || 'KURLA routine planner',
        tasks: []
      } satisfies AdaptiveRoutinePlan : undefined;

      const [tasksResult, feedbackResult, journalResult] = await Promise.all([
        plan
          ? supabase.from('routine_tasks').select('*').eq('user_id', userId).eq('plan_id', plan.id).order('scheduled_for', { ascending: true }).order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from('routine_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('progress_journal_entries').select('*').eq('user_id', userId).order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(100)
      ]);
      ensureDatabaseSuccess('lecture des tâches de routine', tasksResult.error);
      ensureDatabaseSuccess('lecture des observations de routine', feedbackResult.error);
      ensureDatabaseSuccess('lecture du journal de progression', journalResult.error);

      const tasks = (tasksResult.data || []).map((row: any) => this.mapRoutineTaskRow(row));
      const feedback = (feedbackResult.data || []).map((row: any) => this.mapRoutineFeedbackRow(row)).filter((item: RoutineFeedback | undefined): item is RoutineFeedback => !!item);
      const journal = (journalResult.data || []).map((row: any) => this.mapRoutineJournalRow(row));
      if (plan) plan.tasks = tasks;
      return { plan, tasks, feedback, journal, persistence: 'supabase' };
    }

    const plan = this.inMemoryRoutinePlans.get(userId);
    return {
      plan,
      tasks: plan?.tasks || [],
      feedback: [...(this.inMemoryRoutineFeedback.get(userId) || [])],
      journal: [...(this.inMemoryRoutineJournal.get(userId) || [])],
      persistence: 'server_fallback'
    };
  }

  private async persistAdaptiveRoutine(plan: AdaptiveRoutinePlan, previousTasks: RoutineTask[]): Promise<AdaptiveRoutinePlan> {
    const completionById = new Map(previousTasks.map(task => [task.id, { status: task.status, completedAt: task.completedAt }]));
    const tasks = plan.tasks.map(task => ({
      ...task,
      status: completionById.get(task.id)?.status || task.status,
      completedAt: completionById.get(task.id)?.completedAt
    }));
    const nextPlan = { ...plan, tasks };
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { error: planError } = await supabase.from('routine_plans').upsert({
        id: nextPlan.id,
        user_id: nextPlan.userId,
        status: 'active',
        preferences: nextPlan.preferences,
        weather_context: nextPlan.weather || null,
        adaptation_notes: nextPlan.adaptationNotes,
        generated_through: nextPlan.generatedThrough,
        created_at: nextPlan.createdAt,
        updated_at: nextPlan.updatedAt
      }, { onConflict: 'id' });
      ensureDatabaseSuccess('enregistrement de la routine adaptative', planError);

      const { error: deleteError } = await supabase.from('routine_tasks').delete().eq('user_id', nextPlan.userId).eq('plan_id', nextPlan.id);
      ensureDatabaseSuccess('remplacement des tâches de routine', deleteError);
      if (tasks.length > 0) {
        const { error: taskError } = await supabase.from('routine_tasks').insert(tasks.map(task => ({
          id: task.id,
          plan_id: nextPlan.id,
          user_id: nextPlan.userId,
          title: task.title,
          description: task.description,
          kind: task.kind,
          scheduled_for: task.scheduledFor,
          time_of_day: task.timeOfDay || null,
          duration_minutes: task.durationMinutes,
          completed_at: task.completedAt || null,
          status: task.status,
          product_labels: task.productLabels,
          created_at: nextPlan.createdAt,
          updated_at: nextPlan.updatedAt
        })));
        ensureDatabaseSuccess('création des tâches de routine', taskError);
      }
    }

    this.inMemoryRoutinePlans.set(nextPlan.userId, nextPlan);
    return nextPlan;
  }

  public async saveAdaptiveRoutine(userId: string, input: unknown, weatherInput?: unknown): Promise<AdaptiveRoutinePlan> {
    const preferences = normalizeRoutinePreferences(input);
    const current = await this.getAdaptiveRoutineState(userId);
    const planId = current.plan?.id || randomUUID();
    const beautyProfile = (await this.getBeautyProfile(userId))?.profile;
    const weather = normalizeWeatherContext(weatherInput) || current.plan?.weather;
    const now = new Date();
    const plan = createRoutinePlan(userId, planId, preferences, {
      beautyProfile,
      feedback: current.feedback,
      journal: current.journal,
      weather,
      now
    });
    return this.persistAdaptiveRoutine(plan, current.tasks);
  }

  public async updateAdaptiveRoutineTask(userId: string, taskId: string, status: 'pending' | 'completed' | 'skipped'): Promise<RoutineTask | undefined> {
    const state = await this.getAdaptiveRoutineState(userId);
    const task = state.tasks.find(item => item.id === taskId);
    if (!task) return undefined;
    const completedAt = status === 'completed' ? new Date().toISOString() : undefined;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('routine_tasks').update({
        status,
        completed_at: completedAt || null,
        updated_at: new Date().toISOString()
      }).eq('id', taskId).eq('user_id', userId).select('*').maybeSingle();
      ensureDatabaseSuccess('mise à jour de la tâche de routine', error);
      if (!data) return undefined;
      const updated = this.mapRoutineTaskRow(data);
      if (state.plan) {
        state.plan.tasks = state.tasks.map(item => item.id === taskId ? updated : item);
        this.inMemoryRoutinePlans.set(userId, state.plan);
      }
      return updated;
    }
    const updated = { ...task, status, completedAt };
    const plan = this.inMemoryRoutinePlans.get(userId);
    if (plan) {
      plan.tasks = plan.tasks.map(item => item.id === taskId ? updated : item);
      this.inMemoryRoutinePlans.set(userId, plan);
    }
    return updated;
  }

  public async recordRoutineFeedback(userId: string, input: { signal: unknown; note?: unknown; productLabel?: unknown; observedAt?: unknown }): Promise<{ feedback: RoutineFeedback; plan: AdaptiveRoutinePlan }> {
    const signal = normalizeRoutineFeedbackSignal(input.signal);
    if (!signal) throw new Error('Observation de routine inconnue.');
    const current = await this.getAdaptiveRoutineState(userId);
    const plan = current.plan || await this.saveAdaptiveRoutine(userId, {});
    const now = new Date().toISOString();
    const feedback: RoutineFeedback = {
      id: randomUUID(),
      signal,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, 1000) || undefined : undefined,
      productLabel: typeof input.productLabel === 'string' ? input.productLabel.trim().slice(0, 160) || undefined : undefined,
      observedAt: typeof input.observedAt === 'string' && !Number.isNaN(new Date(input.observedAt).getTime()) ? new Date(input.observedAt).toISOString() : now,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('routine_feedback').insert({
        id: feedback.id,
        user_id: userId,
        routine_plan_id: plan.id,
        signal: feedback.signal,
        note: feedback.note || null,
        product_label: feedback.productLabel || null,
        observed_at: feedback.observedAt,
        created_at: feedback.createdAt
      });
      ensureDatabaseSuccess('enregistrement de l’observation de routine', error);
    }
    const feedbackList = [feedback, ...current.feedback];
    this.inMemoryRoutineFeedback.set(userId, feedbackList.slice(0, 100));
    const nextPlan = await this.saveAdaptiveRoutine(userId, plan.preferences, plan.weather);
    return { feedback, plan: nextPlan };
  }

  private validateRoutineMetrics(metrics: unknown): Record<string, number> {
    if (!metrics || typeof metrics !== 'object') return {};
    const source = metrics as Record<string, unknown>;
    const output: Record<string, number> = {};
    for (const key of ['hydrationScore', 'breakageScore', 'comfortScore', 'detanglingScore']) {
      if (source[key] === undefined) continue;
      const value = Number(source[key]);
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('Chaque indicateur du journal doit être compris entre 1 et 5.');
      output[key] = value;
    }
    return output;
  }

  public async createProgressJournalEntry(userId: string, input: { entryDate?: unknown; note?: unknown; signals?: unknown; metrics?: unknown; productsUsed?: unknown }): Promise<{ entry: RoutineJournalEntry; plan: AdaptiveRoutinePlan }> {
    const current = await this.getAdaptiveRoutineState(userId);
    const plan = current.plan || await this.saveAdaptiveRoutine(userId, {});
    const entryDate = typeof input.entryDate === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(input.entryDate) ? input.entryDate : new Date().toISOString().slice(0, 10);
    const signals = Array.isArray(input.signals)
      ? input.signals.map(normalizeRoutineFeedbackSignal).filter((signal: RoutineFeedbackSignal | undefined): signal is RoutineFeedbackSignal => !!signal).slice(0, 9)
      : [];
    const metrics = this.validateRoutineMetrics(input.metrics);
    const now = new Date().toISOString();
    const entry: RoutineJournalEntry = {
      id: randomUUID(),
      entryDate,
      note: typeof input.note === 'string' ? input.note.trim().slice(0, 3000) || undefined : undefined,
      signals,
      hydrationScore: metrics.hydrationScore,
      breakageScore: metrics.breakageScore,
      comfortScore: metrics.comfortScore,
      detanglingScore: metrics.detanglingScore,
      productsUsed: Array.isArray(input.productsUsed) ? input.productsUsed.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 160)).filter(Boolean).slice(0, 20) : [],
      createdAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('progress_journal_entries').insert({
        id: entry.id,
        user_id: userId,
        routine_plan_id: plan.id,
        entry_date: entry.entryDate,
        note: entry.note || null,
        signals: entry.signals,
        metrics,
        products_used: entry.productsUsed,
        created_at: now,
        updated_at: now
      });
      ensureDatabaseSuccess('enregistrement du journal de progression', error);
    }
    const journal = [entry, ...current.journal];
    this.inMemoryRoutineJournal.set(userId, journal.slice(0, 100));
    const nextPlan = await this.saveAdaptiveRoutine(userId, plan.preferences, plan.weather);
    return { entry, plan: nextPlan };
  }

  public async deleteAdaptiveRoutineData(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: journalError } = await supabase.from('progress_journal_entries').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression du journal de progression', journalError);
      const { error: feedbackError } = await supabase.from('routine_feedback').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des observations de routine', feedbackError);
      const { error: taskError } = await supabase.from('routine_tasks').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression des tâches de routine', taskError);
      const { error: planError } = await supabase.from('routine_plans').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de la routine adaptative', planError);
    }
    this.inMemoryRoutinePlans.delete(userId);
    this.inMemoryRoutineFeedback.delete(userId);
    this.inMemoryRoutineJournal.delete(userId);
  }

  // ============================================================
  // AI ASSISTANT SESSIONS, FEEDBACK & HUMAN REVIEW
  // ============================================================
  private mapAiSessionRow(row: any, messageCount = 0): AiAssistantSession {
    return {
      id: row.id,
      userId: row.user_id,
      topic: row.topic,
      locale: row.locale || 'fr',
      country: row.country || 'FR',
      objective: row.objective || undefined,
      memoryConsent: row.memory_consent === true,
      lastUncertainty: row.last_uncertainty || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount
    };
  }

  public async createAiSession(userId: string, topic: string, locale: string, country: string, memoryConsent: boolean, objective?: string): Promise<AiAssistantSession> {
    if (!memoryConsent) throw new Error('La mémorisation de la conversation nécessite un consentement explicite.');
    const now = new Date().toISOString();
    const session: AiAssistantSession = {
      id: randomUUID(),
      userId,
      topic,
      locale,
      country,
      objective,
      memoryConsent: true,
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('advice_sessions').insert({
        id: session.id,
        user_id: userId,
        topic,
        locale,
        country,
        memory_consent: true,
        objective: objective || null,
        created_at: now,
        updated_at: now
      });
      ensureDatabaseSuccess('création de la session IA', error);
    }
    this.inMemoryAiSessions.set(session.id, session);
    this.inMemoryAiMessages.set(session.id, []);
    return session;
  }

  public async addAiMessage(sessionId: string, sender: AiAssistantMessage['sender'], message: string, metadata: Record<string, unknown> = {}, sourceIds: string[] = [], uncertainty?: string): Promise<AiAssistantMessage> {
    const now = new Date().toISOString();
    const aiMessage: AiAssistantMessage = { id: randomUUID(), sessionId, sender, message, metadata, sourceIds, createdAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('advice_messages').insert({
        id: aiMessage.id,
        session_id: sessionId,
        sender,
        message,
        metadata,
        source_ids: sourceIds,
        created_at: now
      });
      ensureDatabaseSuccess('enregistrement du message IA', error);
      const updatePayload: Record<string, unknown> = { updated_at: now };
      if (uncertainty) updatePayload.last_uncertainty = uncertainty;
      const { error: updateError } = await supabase.from('advice_sessions').update(updatePayload).eq('id', sessionId);
      ensureDatabaseSuccess('mise à jour de la session IA', updateError);
    }
    const messages = this.inMemoryAiMessages.get(sessionId) || [];
    messages.push(aiMessage);
    this.inMemoryAiMessages.set(sessionId, messages);
    const session = this.inMemoryAiSessions.get(sessionId);
    if (session) this.inMemoryAiSessions.set(sessionId, { ...session, updatedAt: now, lastUncertainty: uncertainty || session.lastUncertainty, messageCount: messages.length });
    return aiMessage;
  }

  public async getAiSessions(userId: string): Promise<AiAssistantSession[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('advice_sessions').select('*').eq('user_id', userId).eq('memory_consent', true).order('updated_at', { ascending: false }).limit(50);
      ensureDatabaseSuccess('lecture des sessions IA', error);
      return Promise.all((data || []).map(async (row: any) => {
        const { count, error: countError } = await supabase.from('advice_messages').select('id', { count: 'exact', head: true }).eq('session_id', row.id);
        ensureDatabaseSuccess('comptage des messages IA', countError);
        return this.mapAiSessionRow(row, count || 0);
      }));
    }
    return [...this.inMemoryAiSessions.values()].filter(session => session.userId === userId && session.memoryConsent).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public async getAiSession(userId: string, sessionId: string): Promise<{ session: AiAssistantSession; messages: AiAssistantMessage[] } | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: row, error } = await supabase.from('advice_sessions').select('*').eq('id', sessionId).eq('user_id', userId).eq('memory_consent', true).maybeSingle();
      ensureDatabaseSuccess('lecture de la session IA', error);
      if (!row) return undefined;
      const { data: messageRows, error: messagesError } = await supabase.from('advice_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture des messages IA', messagesError);
      const messages = (messageRows || []).map((message: any) => ({ id: message.id, sessionId: message.session_id, sender: message.sender, message: message.message, metadata: message.metadata || {}, sourceIds: message.source_ids || [], createdAt: message.created_at }));
      return { session: this.mapAiSessionRow(row, messages.length), messages };
    }
    const session = this.inMemoryAiSessions.get(sessionId);
    if (!session || session.userId !== userId || !session.memoryConsent) return undefined;
    return { session, messages: [...(this.inMemoryAiMessages.get(sessionId) || [])] };
  }

  public async deleteAiSessions(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('advice_sessions').delete().eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’historique IA', error);
    }
    for (const [id, session] of this.inMemoryAiSessions) {
      if (session.userId === userId) {
        this.inMemoryAiSessions.delete(id);
        this.inMemoryAiMessages.delete(id);
      }
    }
  }

  public async recordAiFeedback(userId: string, rating: AiFeedbackRating, comment?: string, sessionId?: string, messageId?: string): Promise<void> {
    const createdAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('ai_feedback').insert({ user_id: userId, session_id: sessionId || null, message_id: messageId || null, rating, comment: comment || null, created_at: createdAt });
      ensureDatabaseSuccess('enregistrement du feedback IA', error);
    }
    this.inMemoryAiFeedback.unshift({ userId, sessionId, messageId, rating, comment, createdAt });
  }

  public async requestAiHumanReview(userId: string, reason: string, payload: Record<string, unknown>, sessionId?: string, messageId?: string): Promise<AiHumanReview> {
    const now = new Date().toISOString();
    const review: AiHumanReview = { id: randomUUID(), userId, sessionId, messageId, reason, payload, status: 'pending', createdAt: now, updatedAt: now };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('ai_human_reviews').insert({ id: review.id, user_id: userId, session_id: sessionId || null, message_id: messageId || null, reason, payload, status: 'pending', created_at: now, updated_at: now });
      ensureDatabaseSuccess('création de la revue humaine IA', error);
    }
    this.inMemoryAiHumanReviews.unshift(review);
    return review;
  }

  // ============================================================
  // PROFESSIONAL APPLICATIONS
  // ============================================================
  public async createProfessionalApplication(input: Omit<ProfessionalApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProfessionalApplication> {
    const now = new Date().toISOString();
    const application: ProfessionalApplication = {
      ...input,
      id: randomUUID(),
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('professional_applications').insert({
        id: application.id,
        user_id: application.userId || null,
        name: application.name,
        email: application.email,
        phone: application.phone,
        city: application.city,
        profession: application.profession,
        experience: application.experience,
        portfolio_url: application.portfolioUrl || null,
        accepts_charter: application.acceptsCharter,
        status: application.status,
        created_at: now,
        updated_at: now
      });
      ensureDatabaseSuccess('création de la candidature Pro', error);
    }

    this.inMemoryProfessionalApplications.unshift(application);
    return application;
  }

  public async getProfessionalApplications(): Promise<ProfessionalApplication[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('professional_applications').select('*').order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des candidatures Pro', error);
      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id || undefined,
        name: row.name,
        email: row.email,
        phone: row.phone,
        city: row.city,
        profession: row.profession,
        experience: row.experience,
        portfolioUrl: row.portfolio_url || undefined,
        acceptsCharter: row.accepts_charter === true,
        status: row.status,
        adminComment: row.admin_comment || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    }
    return [...this.inMemoryProfessionalApplications];
  }

  public async updateProfessionalApplication(id: string, status: ProfessionalApplicationStatus, adminComment?: string): Promise<ProfessionalApplication | undefined> {
    const current = (await this.getProfessionalApplications()).find(application => application.id === id);
    if (!current) return undefined;
    const updated: ProfessionalApplication = {
      ...current,
      status,
      adminComment: adminComment || undefined,
      updatedAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('professional_applications').update({
        status: updated.status,
        admin_comment: updated.adminComment || null,
        updated_at: updated.updatedAt
      }).eq('id', id).select('*').maybeSingle();
      ensureDatabaseSuccess('mise à jour de la candidature Pro', error);
      if (!data) return undefined;
    }

    const index = this.inMemoryProfessionalApplications.findIndex(application => application.id === id);
    if (index >= 0) this.inMemoryProfessionalApplications[index] = updated;
    else if (!supabase) this.inMemoryProfessionalApplications.unshift(updated);
    return updated;
  }

  // ============================================================
  // PHASE 5: CUSTOMER SUPPORT TICKETS
  // ============================================================
  public async createSupportTicket(userId: string, orderId: string | undefined, category: SupportTicket['subjectCategory'], subject: string, message: string): Promise<SupportTicket> {
    const ticketId = randomUUID();
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId,
      orderId,
      subjectCategory: category,
      subject,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    const firstMsg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId: userId,
      senderRole: 'customer',
      message,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: ticketError } = await supabase.from('support_tickets').insert({
          id: ticketId,
          user_id: userId,
          order_id: orderId || null,
          subject_category: category,
          subject,
          status: 'open',
          created_at: now,
          updated_at: now
        });
        ensureDatabaseSuccess('création du ticket support', ticketError);

        const { error: messageError } = await supabase.from('support_messages').insert({
          id: firstMsg.id,
          ticket_id: ticketId,
          sender_id: userId,
          sender_role: 'customer',
          message,
          created_at: now
        });
        ensureDatabaseSuccess('création du premier message support', messageError);
      } catch (err) {
        console.error('[serverDb] createSupportTicket error:', err);
        throw err;
      }
    }

    this.inMemoryTickets.unshift(ticket);
    this.inMemoryMessages.push(firstMsg);
    return ticket;
  }

  private async getSupportTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle();
      ensureDatabaseSuccess('lecture du ticket support', error);
      if (!data) return undefined;
      return {
        id: data.id,
        userId: data.user_id,
        orderId: data.order_id,
        subjectCategory: data.subject_category,
        subject: data.subject,
        status: data.status,
        assignedAgentId: data.assigned_agent_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    return this.inMemoryTickets.find(t => t.id === ticketId);
  }

  public async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
        ensureDatabaseSuccess('lecture des tickets utilisateur', error);
        if (data) {
          return data.map(t => ({
            id: t.id,
            userId: t.user_id,
            orderId: t.order_id,
            subjectCategory: t.subject_category,
            subject: t.subject,
            status: t.status,
            assignedAgentId: t.assigned_agent_id,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getSupportTicketsByUser error:', err);
        throw err;
      }
    }

    return this.inMemoryTickets.filter(t => t.userId === userId);
  }

  public async getAllSupportTickets(): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
        ensureDatabaseSuccess('lecture de tous les tickets support', error);
        if (data) {
          return data.map(t => ({
            id: t.id,
            userId: t.user_id,
            orderId: t.order_id,
            subjectCategory: t.subject_category,
            subject: t.subject,
            status: t.status,
            assignedAgentId: t.assigned_agent_id,
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getAllSupportTickets error:', err);
        throw err;
      }
    }

    return this.inMemoryTickets;
  }

  public async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        ensureDatabaseSuccess('lecture des messages support', error);
        if (data) {
          return data.map(m => ({
            id: m.id,
            ticketId: m.ticket_id,
            senderId: m.sender_id,
            senderRole: m.sender_role,
            message: m.message,
            createdAt: m.created_at
          }));
        }
      } catch (err) {
        console.error('[serverDb] getSupportMessages error:', err);
        throw err;
      }
    }

    return this.inMemoryMessages.filter(m => m.ticketId === ticketId);
  }

  public async addSupportMessage(ticketId: string, senderId: string, senderRole: 'customer' | 'admin' | 'agent', message: string): Promise<SupportMessage> {
    const now = new Date().toISOString();
    const msg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId,
      senderRole,
      message,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    const ticket = this.inMemoryTickets.find(t => t.id === ticketId)
      || (supabase ? await this.getSupportTicketById(ticketId) : undefined);

    if (supabase) {
      try {
        const { error: messageError } = await supabase.from('support_messages').insert({
          id: msg.id,
          ticket_id: ticketId,
          sender_id: senderId,
          sender_role: senderRole,
          message,
          created_at: now
        });
        ensureDatabaseSuccess('création du message support', messageError);

        const { error: ticketError } = await supabase.from('support_tickets').update({
          status: senderRole === 'admin' || senderRole === 'agent' ? 'in_progress' : undefined,
          updated_at: now
        }).eq('id', ticketId);
        ensureDatabaseSuccess('mise à jour du ticket support', ticketError);
      } catch (err) {
        console.error('[serverDb] addSupportMessage error:', err);
        throw err;
      }
    }

    this.inMemoryMessages.push(msg);
    const memoryTicket = this.inMemoryTickets.find(t => t.id === ticketId);
    if (memoryTicket) {
      memoryTicket.updatedAt = now;
      if (senderRole === 'admin' || senderRole === 'agent') {
        memoryTicket.status = 'in_progress';
      }
    }

    if ((senderRole === 'admin' || senderRole === 'agent') && ticket) {
      await this.sendNotification(
        ticket.userId,
        'support_reply',
        `Réponse à votre ticket support #${ticket.id}`,
        `Un conseiller a répondu à votre sujet "${ticket.subject}": ${message.substring(0, 80)}...`,
        `/account?tab=support`,
        ticket.orderId
      );
    }

    return msg;
  }

  public async updateSupportTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
    const updatedAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('support_tickets').update({
          status,
          updated_at: updatedAt
        }).eq('id', ticketId).select('id').maybeSingle();
        ensureDatabaseSuccess('mise à jour du statut du ticket support', error);
        if (!data) throw new Error('Ticket support introuvable.');
      } catch (err) {
        console.error('[serverDb] updateSupportTicketStatus error:', err);
        throw err;
      }
    }

    const ticket = this.inMemoryTickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = updatedAt;
    }
  }

  // ============================================================
  // PHASE 5: REAL ADMIN ANALYTICS METRICS
  // ============================================================
  public async getAdminAnalyticsMetrics(): Promise<any> {
    const products = await this.getProducts();
    const supabase = getSupabaseServerClient();
    let supaOrders: ServerOrder[] = [];
    let supaRefunds: CustomerRefund[] = [];
    let supaProfilesCount = 0;
    let supaTicketsCount = 0;
    let supaEventsCount = 0;

    if (supabase) {
      try {
        const { data: oData, error: ordersError } = await supabase.from('orders').select('*');
        ensureDatabaseSuccess('lecture des commandes pour les métriques', ordersError);
        supaOrders = (oData || []).map(data => ({
          id: data.id,
          userId: data.user_id,
          customerEmail: data.customer_email,
          items: data.items || [],
          total: Number(data.total),
          status: data.status,
          stripeSessionId: data.stripe_session_id,
          stripePaymentIntentId: data.stripe_payment_intent_id,
          checkoutIdempotencyKey: data.checkout_idempotency_key,
          shippingAddress: data.shipping_address,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }));

        const { data: refundData, error: refundsError } = await supabase.from('refunds').select('*');
        ensureDatabaseSuccess('lecture des remboursements pour les métriques', refundsError);
        supaRefunds = (refundData || []).map(mapRefundRow);

        const { count: pCount, error: profilesError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des profils pour les métriques', profilesError);
        supaProfilesCount = pCount || 0;

        const { count: tCount, error: ticketsError } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des tickets pour les métriques', ticketsError);
        supaTicketsCount = tCount || 0;

        const { count: eCount, error: eventsError } = await supabase.from('stripe_events').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des événements Stripe pour les métriques', eventsError);
        supaEventsCount = eCount || 0;
      } catch (err) {
        console.error('[serverDb] getAdminAnalyticsMetrics error:', err);
        throw err;
      }
    }

    // Never merge the local cache with Supabase: once persistence is
    // configured, the dashboard must describe the persistent source only.
    const sourceOrders: ServerOrder[] = supabase ? supaOrders : this.inMemoryOrders;
    const sourceRefunds: CustomerRefund[] = supabase ? supaRefunds : this.inMemoryRefunds;
    const revenueStatuses: OrderStatus[] = [
      'paid', 'processing', 'packed', 'shipped', 'delivered',
      'return_requested', 'returned', 'partially_refunded', 'refunded'
    ];
    const paidOrders = sourceOrders.filter(order => revenueStatuses.includes(order.status));
    const grossRevenueCents = paidOrders.reduce((sum, order) => sum + Math.round(Number(order.total || 0) * 100), 0);
    const refundedRevenueCents = sourceRefunds
      .filter(refund => ['succeeded', 'completed'].includes(refund.status) && (refund.currency || '').toUpperCase() === 'EUR')
      .reduce((sum, refund) => sum + Math.round(Number(refund.amount || 0) * 100), 0);
    const grossRevenue = grossRevenueCents / 100;
    const revenueTest = Math.max(0, grossRevenueCents - refundedRevenueCents) / 100;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = sourceOrders.filter(order => order.createdAt.startsWith(todayStr));

    const pendingOrders = sourceOrders.filter(order => order.status === 'payment_pending_webhook' || order.status === 'pending_payment');
    const processingOrders = sourceOrders.filter(order => order.status === 'processing' || order.status === 'packed');
    const shippedOrders = sourceOrders.filter(order => order.status === 'shipped' || order.status === 'delivered');
    const refundedOrders = sourceOrders.filter(order => order.status === 'refunded' || order.status === 'partially_refunded');

    const avgOrderValue = paidOrders.length > 0 ? revenueTest / paidOrders.length : 0;

    const lowStockProducts = products.filter(p => p.stockQuantity < 5 && p.stockQuantity > 0);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0 || !p.inStock);

    return {
      revenueTest,
      grossRevenue,
      netRevenue: revenueTest,
      totalOrders: sourceOrders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrdersCount: pendingOrders.length,
      paidOrdersCount: paidOrders.length,
      processingOrdersCount: processingOrders.length,
      shippedOrdersCount: shippedOrders.length,
      refundedOrdersCount: refundedOrders.length,
      avgOrderValue,
      lowStockProducts,
      outOfStockProducts,
      openTicketsCount: supabase
        ? supaTicketsCount
        : this.inMemoryTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
      stripeEventsCount: supabase ? supaEventsCount : this.processedEventsSet.size,
      registeredUsersCount: supabase ? supaProfilesCount : 0
    };
  }

  public async claimEventForProcessing(eventId: string, eventType: string): Promise<boolean> {
    if (this.processedEventsSet.has(eventId)) return false;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('claim_stripe_event', {
        p_event_id: eventId,
        p_event_type: eventType
      });
      ensureDatabaseSuccess('réservation idempotente de l’événement Stripe', error);
      if (data === true) return true;
      this.processedEventsSet.add(eventId);
      return false;
    }

    this.processedEventsSet.add(eventId);
    return true;
  }

  public async markEventError(eventId: string, eventType: string, errorMessage: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.rpc('mark_stripe_event_error', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_error: errorMessage
      });
      ensureDatabaseSuccess('enregistrement de l’erreur Stripe', error);
    }
    this.processedEventsSet.delete(eventId);
  }

  public async isEventProcessed(eventId: string): Promise<boolean> {
    if (this.processedEventsSet.has(eventId)) return true;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('stripe_events').select('event_id').eq('event_id', eventId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’idempotence Stripe', error);
      if (data) {
        this.processedEventsSet.add(eventId);
        return true;
      }
    }
    return false;
  }

  public async markEventProcessed(eventId: string, eventType: string = 'stripe_webhook', details?: any): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('stripe_events').upsert({
        event_id: eventId,
        event_type: eventType,
        status: 'processed',
        details: details || null,
        created_at: new Date().toISOString()
      }, { onConflict: 'event_id' });
      ensureDatabaseSuccess('enregistrement de l’événement Stripe', error);
    }
    this.processedEventsSet.add(eventId);
  }

  public getStatusSummary(): { supabaseConfigured: boolean; productCount: number; orderCount: number } {
    return {
      // This is the backend status: a public VITE key is not enough for the
      // privileged store or server-side token verification.
      supabaseConfigured: isSupabaseServerConfigured(),
      productCount: this.inMemoryProducts.length,
      orderCount: this.inMemoryOrders.length
    };
  }
}

export const serverDb = new SupabaseServerStore();
