import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient, isSupabaseServerConfigured } from './supabaseClient';
import { CATALOG_AUDIENCES, CATALOG_CATEGORIES, catalogCsvRowToInput, parseBoolean, parseCatalogCsv, parseJsonCell } from './catalogManagement';
import { emailService, EmailDeliveryResult, EmailMessage } from './emailService';
import { shippingService, ShippingCarrier, ShipmentDetails, ShipmentEvent, ShipmentStatus } from './shippingService';
import { getShippingOption, normalizeShippingAddress, ShippingAddressInput, SHIPPING_OPTIONS } from './shippingRules';
import { EDUCATIONAL_CONTENT_TYPES, EDUCATIONAL_TOPICS, EVIDENCE_LEVELS, EducationalContentSource, normalizeContentSources, normalizeContentTranslations } from './educationalContent';
import { CURRENT_FAMILY_CONSENT_VERSION, FamilyAgeBand, FamilyConsentStatus, FamilyPlanStatus, FamilyPlanType, isMinorAgeBand, isProductSuitableForAgeBand, normalizeFamilyMemberInput, normalizeFamilyPlanInput } from './familyProfiles';
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
      variantId: item.variantId || item.variant_id || undefined,
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

function emailTemplateForOrderStatus(status: OrderStatus): EmailMessage['template'] {
  if (status === 'paid') return 'payment_confirmed';
  if (status === 'payment_failed') return 'payment_failed';
  if (status === 'return_requested') return 'return_requested';
  if (status === 'returned') return 'order_returned';
  if (status === 'refunded') return 'order_refunded';
  if (status === 'partially_refunded') return 'order_partially_refunded';
  if (status === 'cancelled') return 'order_cancelled';
  return `order_${status}` as EmailMessage['template'];
}

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
  dedupeKey?: string;
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

export interface NotificationDeliveryLog {
  id: string;
  userId?: string;
  notificationId?: string;
  channel: 'in_app' | 'email';
  status: 'sent' | 'logged' | 'failed' | 'skipped';
  provider?: string;
  messageId?: string;
  error?: string;
  createdAt: string;
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

export interface CustomerReturnEvent {
  id: string;
  returnId: string;
  actorId?: string;
  actorRole: 'customer' | 'admin' | 'support' | 'system';
  oldStatus?: string;
  newStatus: CustomerReturn['status'];
  comment?: string;
  createdAt: string;
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
  items?: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>;
  status: 'pending' | 'succeeded' | 'failed' | 'completed';
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  orderId?: string;
  subjectCategory: 'paiement' | 'commande' | 'livraison' | 'retour' | 'remboursement' | 'produit' | 'compte' | 'conseil_ia' | 'autre';
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
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

export interface SupportTicketEvent {
  id: string;
  ticketId: string;
  actorId?: string;
  eventType: 'created' | 'message_added' | 'status_changed' | 'priority_changed' | 'assignment_changed' | 'attachment_added';
  oldValue?: string;
  newValue?: string;
  description?: string;
  createdAt: string;
}

export interface SupportAttachment {
  id: string;
  ticketId: string;
  messageId?: string;
  uploadedBy: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export interface ShippingAddressRecord extends ShippingAddressInput {
  id: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ShippingRateRecord {
  id: string;
  country?: string;
  carrier: ShippingCarrier;
  method: string;
  name: string;
  price: number;
  freeFromCents?: number;
  estimatedDays?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  private inMemoryInventory: Map<string, { quantity: number; reserved_quantity: number; available_quantity?: number }> = new Map();
  private inMemoryStripeEvents: StripeEventLog[] = [];
  private inMemoryStatusHistory: OrderStatusHistoryEntry[] = [];
  private inMemoryNotifications: UserNotification[] = [];
  private inMemoryNotificationLogs: NotificationDeliveryLog[] = [];
  private inMemoryPreferences: Map<string, NotificationPreference> = new Map();
  private inMemoryShipments: Map<string, ShipmentDetails> = new Map();
  private inMemoryShippingAddresses: Map<string, ShippingAddressRecord[]> = new Map();
  private inMemoryShippingRates: ShippingRateRecord[] = [];
  private inMemoryShippingEvents: ShipmentEvent[] = [];
  private inMemoryReturns: CustomerReturn[] = [];
  private inMemoryReturnEvents: CustomerReturnEvent[] = [];
  private inMemoryRefunds: CustomerRefund[] = [];
  private inMemoryTickets: SupportTicket[] = [];
  private inMemoryMessages: SupportMessage[] = [];
  private inMemorySupportEvents: SupportTicketEvent[] = [];
  private inMemorySupportAttachments: SupportAttachment[] = [];
  private inMemorySupportAttachmentBytes: Map<string, Uint8Array> = new Map();
  private inMemoryProfessionalApplications: ProfessionalApplication[] = [];
  private inMemoryProductReviews: MarketplaceReview[] = [];
  private inMemoryProductQuestions: MarketplaceQuestion[] = [];
  private inMemoryProductWaitlist: Array<{ id: string; productId: string; variantId?: string; userId?: string; email: string; country: string; status: 'waiting' | 'notified' | 'cancelled'; createdAt: string }> = [];
  private inMemoryProductSubscriptions: ProductSubscription[] = [];
  private inMemoryCatalogValidationEvents: Array<{ id: string; productId: string; checkType: string; status: string; evidenceUrl?: string; note?: string; createdAt: string }> = [];
  private inMemoryBeautyProfiles: Map<string, BeautyProfileRecord> = new Map();
  private inMemoryBeautyProfileHistory: Map<string, BeautyProfileHistoryEntry[]> = new Map();
  private inMemoryBeautyProfilePhotos: Map<string, BeautyProfilePhoto[]> = new Map();
  private inMemoryFamilySpaces: Map<string, any> = new Map();
  private inMemoryFamilyMembers: Map<string, any> = new Map();
  private inMemoryFamilyPlans: Map<string, any> = new Map();
  private inMemoryRoutinePlans: Map<string, AdaptiveRoutinePlan> = new Map();
  private inMemoryRoutineFeedback: Map<string, RoutineFeedback[]> = new Map();
  private inMemoryRoutineJournal: Map<string, RoutineJournalEntry[]> = new Map();
  private inMemoryAiSessions: Map<string, AiAssistantSession> = new Map();
  private inMemoryAiMessages: Map<string, AiAssistantMessage[]> = new Map();
  private inMemoryAiFeedback: Array<{ userId: string; sessionId?: string; messageId?: string; rating: AiFeedbackRating; comment?: string; createdAt: string }> = [];
  private localStockOperation: Promise<void> = Promise.resolve();

  private async withLocalStockLock<T>(operation: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.localStockOperation;
    this.localStockOperation = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async reserveLocalStockUnlocked(items: ServerOrderItem[]): Promise<void> {
    const previousValues = new Map<string, { quantity: number; reserved_quantity: number; available_quantity?: number }>();
    try {
      for (const item of items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await this.getInventoryByVariantId(realId, item.variantId)
          : await this.getInventoryByProductId(realId);
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        if (!previousValues.has(key)) previousValues.set(key, {
          quantity: inventory.quantity,
          reserved_quantity: inventory.reserved_quantity,
          available_quantity: inventory.available_quantity
        });
        const available = inventory.available_quantity ?? (inventory.quantity - inventory.reserved_quantity);
        if (available < item.quantity) throw new Error(`Stock insuffisant pour le produit ${item.productId}.`);
        const reservedQuantity = inventory.reserved_quantity + item.quantity;
        this.inMemoryInventory.set(key, {
          quantity: inventory.quantity,
          reserved_quantity: reservedQuantity,
          available_quantity: inventory.quantity - reservedQuantity
        });
      }
    } catch (error) {
      for (const [key, value] of previousValues) this.inMemoryInventory.set(key, value);
      throw error;
    }
  }
  private inMemoryAiHumanReviews: AiHumanReview[] = [];
  private inMemoryAdminAuditLogs: Array<{ id: string; action: string; userId?: string; details: Record<string, unknown>; createdAt: string }> = [];
  private inMemoryAdminBrands: any[] = [];
  private inMemoryAdminCategories: any[] = [];
  private inMemoryAdminArticles: any[] = [];
  private inMemoryAdminSources: any[] = [];
  private inMemoryAdminCoupons: any[] = [];
  private inMemoryAdminSearchEvents: Array<{ id: string; query: string; resultCount: number; country?: string; userId?: string; createdAt: string }> = [];
  private inMemoryAdminAiUsageEvents: Array<{ id: string; requestType: string; succeeded: boolean; userId?: string; createdAt: string }> = [];
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
      const { data: inventoryRows, error: inventoryError } = await supabase.from('inventory').select('product_id, variant_id, quantity, reserved_quantity, available_quantity');
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
          return stock ? {
            ...variant,
            stock_quantity: stock.quantity,
            reserved_quantity: stock.reserved_quantity,
            available_quantity: stock.available_quantity ?? Number(stock.quantity) - Number(stock.reserved_quantity || 0)
          } : variant;
        });
        const baseStock = inventoryByKey.get(`${p.id}:`);
        const baseAvailable = baseStock
          ? Number(baseStock.available_quantity ?? Number(baseStock.quantity) - Number(baseStock.reserved_quantity || 0))
          : Number(p.stock_quantity || 0);
        const variantAvailable = productVariants.some((variant: any) => Number(variant.available_quantity ?? (Number(variant.stock_quantity || 0) - Number(variant.reserved_quantity || 0))) > 0);
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
        audienceTags: p.audience_tags || [],
        recommendedAgeBand: p.recommended_age_band || undefined,
        recommendedAgeMin: p.recommended_age_min == null ? undefined : Number(p.recommended_age_min),
        recommendedAgeMax: p.recommended_age_max == null ? undefined : Number(p.recommended_age_max),
        minorSafetyStatus: p.minor_safety_status || 'not_provided',
        adultOnlyActives: p.adult_only_actives || [],
        parentalSupervisionRequired: p.parental_supervision_required === true,
        imageSupervisionStatus: p.image_supervision_status || 'not_provided',
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
    const audienceTags = array(source.audienceTags ?? source.audience_tags);
    const ageBand = text(source.recommendedAgeBand ?? source.recommended_age_band, 40);
    const validAgeBands = new Set(['baby', 'child', 'teen', 'adult', 'all_ages', 'not_provided']);
    if (ageBand && !validAgeBands.has(ageBand)) throw new Error(`Tranche d’âge recommandée invalide pour « ${name} ».`);
    const ageMin = number(source.recommendedAgeMin ?? source.recommended_age_min);
    const ageMax = number(source.recommendedAgeMax ?? source.recommended_age_max);
    if ((ageMin !== undefined && (!Number.isInteger(ageMin) || ageMin < 0)) || (ageMax !== undefined && (!Number.isInteger(ageMax) || ageMax < 0)) || (ageMin !== undefined && ageMax !== undefined && ageMax < ageMin)) throw new Error(`Âge recommandé incohérent pour « ${name} ».`);
    const minorSafetyStatus = ['verified', 'pending', 'not_provided'].includes(source.minorSafetyStatus ?? source.minor_safety_status) ? (source.minorSafetyStatus ?? source.minor_safety_status) : existing?.minorSafetyStatus || existing?.minor_safety_status || 'not_provided';
    const imageSupervisionStatus = ['verified', 'pending', 'not_provided'].includes(source.imageSupervisionStatus ?? source.image_supervision_status) ? (source.imageSupervisionStatus ?? source.image_supervision_status) : existing?.imageSupervisionStatus || existing?.image_supervision_status || 'not_provided';
    const adultOnlyActives = array(source.adultOnlyActives ?? source.adult_only_actives);
    const parentalSupervisionRequired = source.parentalSupervisionRequired === undefined && source.parental_supervision_required === undefined
      ? existing?.parentalSupervisionRequired === true || existing?.parental_supervision_required === true
      : parseBoolean(source.parentalSupervisionRequired ?? source.parental_supervision_required, false);
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
      audienceTags,
      recommendedAgeBand: ageBand || undefined,
      recommendedAgeMin: ageMin,
      recommendedAgeMax: ageMax,
      minorSafetyStatus,
      adultOnlyActives,
      parentalSupervisionRequired,
      imageSupervisionStatus,
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
        audience_tags: normalized.audienceTags,
        recommended_age_band: normalized.recommendedAgeBand || null,
        recommended_age_min: normalized.recommendedAgeMin ?? null,
        recommended_age_max: normalized.recommendedAgeMax ?? null,
        minor_safety_status: normalized.minorSafetyStatus,
        adult_only_actives: normalized.adultOnlyActives,
        parental_supervision_required: normalized.parentalSupervisionRequired,
        image_supervision_status: normalized.imageSupervisionStatus,
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
      await this.notifyLowStock(normalized.id, { quantity: normalized.stockQuantity, productName: normalized.name });
      for (const variant of normalized.variants || []) {
        await this.notifyLowStock(normalized.id, {
          variantId: variant.id,
          quantity: variant.stockQuantity,
          productName: `${normalized.name} (${variant.name})`
        });
      }

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

  private async syncInventoryToSupabase(realId: string, quantity: number, _reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc('set_inventory_quantity_atomic', {
        p_product_id: realId,
        p_variant_id: null,
        p_quantity: quantity
      });
      ensureDatabaseSuccess('mise à jour atomique de l’inventaire', error);
    } catch (err) {
      console.error('[serverDb] syncInventoryToSupabase error:', err);
      throw err;
    }
  }

  public async getInventoryByProductId(productId: string): Promise<{ quantity: number; reserved_quantity: number; available_quantity: number }> {
    const product = await this.getProductById(productId);
    const realId = product ? product.id : productId;

    let memInv = this.inMemoryInventory.get(realId);
    if (!memInv && realId !== productId) {
      memInv = this.inMemoryInventory.get(productId);
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity, available_quantity').eq('product_id', realId).is('variant_id', null).maybeSingle();
        ensureDatabaseSuccess('lecture de l’inventaire', error);
        if (data) {
          const q = Number(data.quantity);
          const resQ = Number(data.reserved_quantity || 0);
          const val = { quantity: q, reserved_quantity: resQ, available_quantity: Number(data.available_quantity ?? q - resQ) };
          this.inMemoryInventory.set(realId, val);
          if (realId !== productId) this.inMemoryInventory.set(productId, val);
          return val;
        }
      } catch (err) {
        console.error('[serverDb] getInventoryByProductId error:', err);
        throw err;
      }
    }

    if (memInv) return {
      quantity: memInv.quantity,
      reserved_quantity: memInv.reserved_quantity,
      available_quantity: memInv.available_quantity ?? memInv.quantity - memInv.reserved_quantity
    };

    const defaultQty = product && typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
    const defaultInv = { quantity: defaultQty, reserved_quantity: 0, available_quantity: defaultQty };
    this.inMemoryInventory.set(realId, defaultInv);
    if (realId !== productId) this.inMemoryInventory.set(productId, defaultInv);
    return defaultInv;
  }

  public async getAvailableStock(productId: string): Promise<number> {
    const inv = await this.getInventoryByProductId(productId);
    return Math.max(0, inv.available_quantity ?? (inv.quantity - inv.reserved_quantity));
  }

  public async getInventoryByVariantId(productId: string, variantId: string): Promise<{ quantity: number; reserved_quantity: number; available_quantity: number }> {
    const product = await this.getProductById(productId);
    const realId = product ? product.id : productId;
    const cacheKey = `${realId}:${variantId}`;
    const cached = this.inMemoryInventory.get(cacheKey);
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity, available_quantity').eq('product_id', realId).eq('variant_id', variantId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’inventaire de la variante', error);
      if (data) {
        const quantity = Number(data.quantity);
        const reservedQuantity = Number(data.reserved_quantity || 0);
        const value = { quantity, reserved_quantity: reservedQuantity, available_quantity: Number(data.available_quantity ?? quantity - reservedQuantity) };
        this.inMemoryInventory.set(cacheKey, value);
        return value;
      }
    }
    if (cached) return {
      quantity: cached.quantity,
      reserved_quantity: cached.reserved_quantity,
      available_quantity: cached.available_quantity ?? cached.quantity - cached.reserved_quantity
    };
    const variant = product?.variants?.find((item: any) => item.id === variantId);
    const quantity = Number(variant?.stock_quantity || variant?.stockQuantity || 0);
    const reservedQuantity = Number(variant?.reserved_quantity || variant?.reservedQuantity || 0);
    const value = { quantity, reserved_quantity: reservedQuantity, available_quantity: quantity - reservedQuantity };
    this.inMemoryInventory.set(cacheKey, value);
    return value;
  }

  private async syncVariantInventoryToSupabase(productId: string, variantId: string, quantity: number, _reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('set_inventory_quantity_atomic', {
      p_product_id: productId,
      p_variant_id: variantId,
      p_quantity: quantity
    });
    ensureDatabaseSuccess('mise à jour atomique de l’inventaire de la variante', error);
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

    // The checkout RPC owns the complete transaction: it locks and reserves
    // inventory, then creates the order, its lines, payment ledger row and
    // initial history row. A retry returns the already-created order without
    // reserving its stock a second time.
    if (supabase && isInitialPayment) {
      const { data, error } = await supabase.rpc('create_order_with_stock_reservation', {
        p_order_id: order.id,
        p_user_id: order.userId || null,
        p_customer_email: order.customerEmail,
        p_items: order.items,
        p_total: order.total,
        p_status: order.status,
        p_stripe_session_id: order.stripeSessionId || null,
        p_stripe_payment_intent_id: order.stripePaymentIntentId || null,
        p_checkout_idempotency_key: order.checkoutIdempotencyKey || null,
        p_shipping_address: order.shippingAddress || null,
        p_created_at: order.createdAt
      });
      ensureDatabaseSuccess('création atomique de la commande et réservation du stock', error);
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('[Supabase] création atomique de la commande: réponse vide');
      const persistedOrder: ServerOrder = {
        id: row.id || order.id,
        userId: row.user_id ?? order.userId,
        customerEmail: row.customer_email || order.customerEmail,
        items: Array.isArray(row.items) ? row.items : order.items,
        total: Number(row.total ?? order.total),
        status: row.status || order.status,
        stripeSessionId: row.stripe_session_id ?? order.stripeSessionId,
        stripePaymentIntentId: row.stripe_payment_intent_id ?? order.stripePaymentIntentId,
        checkoutIdempotencyKey: row.checkout_idempotency_key ?? order.checkoutIdempotencyKey,
        shippingAddress: row.shipping_address ?? order.shippingAddress,
        createdAt: row.created_at || order.createdAt,
        updatedAt: row.updated_at || order.updatedAt
      };
      const persistedIndex = this.inMemoryOrders.findIndex(existing => existing.id === persistedOrder.id);
      if (persistedIndex >= 0) this.inMemoryOrders[persistedIndex] = persistedOrder;
      else this.inMemoryOrders.unshift(persistedOrder);
      return persistedOrder;
    }

    // Local-only fallback. Supabase never reaches this multi-step branch.
    if (isInitialPayment && !supabase) {
      await this.withLocalStockLock(() => this.reserveLocalStockUnlocked(order.items));
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
    emailData?: Record<string, unknown>;
  }): Promise<ServerOrder | undefined> {
    const order = await this.getOrderById(orderId);
    if (!order) return undefined;

    const supabase = getSupabaseServerClient();
    if (supabase) {
      // PostgreSQL locks the order first, then mutates the corresponding
      // inventory rows, payment ledger and history in one transaction. This
      // is deliberately the only Supabase path for payment/expiration
      // transitions; webhook retries are no-ops once the status is committed.
      const { data, error } = await supabase.rpc('transition_order_stock', {
        p_order_id: order.id,
        p_new_status: newStatus,
        p_stripe_payment_intent_id: extra?.stripePaymentIntentId || null,
        p_changed_by: extra?.changedBy || null,
        p_changed_by_role: extra?.changedByRole || 'system',
        p_reason: extra?.reason || `Transition atomique vers ${newStatus}`,
        p_restock_items: extra?.restockItems || []
      });
      ensureDatabaseSuccess('transition atomique de commande et de stock', error);
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('[Supabase] transition atomique de commande: réponse vide');
      const updated: ServerOrder = {
        id: row.id || order.id,
        userId: row.user_id ?? order.userId,
        customerEmail: row.customer_email || order.customerEmail,
        items: Array.isArray(row.items) ? row.items : order.items,
        total: Number(row.total ?? order.total),
        status: row.status || newStatus,
        stripeSessionId: row.stripe_session_id ?? order.stripeSessionId,
        stripePaymentIntentId: row.stripe_payment_intent_id ?? order.stripePaymentIntentId,
        checkoutIdempotencyKey: row.checkout_idempotency_key ?? order.checkoutIdempotencyKey,
        shippingAddress: row.shipping_address ?? order.shippingAddress,
        createdAt: row.created_at || order.createdAt,
        updatedAt: row.updated_at || order.updatedAt
      };
      const index = this.inMemoryOrders.findIndex(existing => existing.id === updated.id);
      if (index >= 0) this.inMemoryOrders[index] = updated;
      else this.inMemoryOrders.unshift(updated);

      if (order.status !== updated.status) {
        const type = updated.status === 'paid' ? 'payment_confirmed' : `order_${updated.status}`;
        const title = `Mise à jour commande #${updated.id}`;
        const email: EmailMessage = {
          to: updated.customerEmail,
          subject: `[KURLA BEAUTY] ${title}`,
          template: emailTemplateForOrderStatus(updated.status),
          data: { orderId: updated.id, total: updated.total, status: updated.status, ...(extra?.emailData || {}) }
        };
        if (updated.userId) {
          await this.notifyUser(
            updated.userId,
            type,
            title,
            `Le statut de votre commande est désormais : ${updated.status.toUpperCase()}`,
            `/account?tab=orders`,
            updated.id,
            email,
            `order-status:${updated.id}:${updated.status}`
          );
        } else {
          await this.sendTransactionalEmail(email);
        }
        if (updated.status === 'paid') await this.notifyLowStockForOrder(updated);
      }
      return updated;
    }

    // Explicit local-only fallback used by the test/development store. The
    // configured Supabase store never executes these independent writes.
    if (order.status === newStatus) {
      if (extra?.stripePaymentIntentId && order.stripePaymentIntentId !== extra.stripePaymentIntentId) {
        order.stripePaymentIntentId = extra.stripePaymentIntentId;
        order.updatedAt = new Date().toISOString();
        const index = this.inMemoryOrders.findIndex(existing => existing.id === order.id);
        if (index >= 0) this.inMemoryOrders[index] = order;
      }
      return order;
    }

    const oldStatus = order.status;
    if (!this.isTransitionAllowed(oldStatus, newStatus)) {
      throw new Error(`Transition de statut invalide : impossible de passer de '${oldStatus}' à '${newStatus}'.`);
    }

    const nextUpdatedAt = new Date().toISOString();
    const nextPaymentIntent = extra?.stripePaymentIntentId || order.stripePaymentIntentId;

    await this.withLocalStockLock(async () => {
      if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment' || oldStatus === 'payment_failed') && newStatus === 'paid') {
      if (oldStatus === 'payment_failed') await this.reserveLocalStockUnlocked(order.items);
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await this.getInventoryByVariantId(realId, item.variantId)
          : await this.getInventoryByProductId(realId);
        if (inventory.quantity < item.quantity || inventory.reserved_quantity < item.quantity) {
          throw new Error(`Stock réservé incohérent pour le produit ${item.productId}.`);
        }
        const quantity = inventory.quantity - item.quantity;
        const reservedQuantity = inventory.reserved_quantity - item.quantity;
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        this.inMemoryInventory.set(key, { quantity, reserved_quantity: reservedQuantity, available_quantity: quantity - reservedQuantity });
        const productIndex = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
        const inMemoryProduct = productIndex >= 0 ? this.inMemoryProducts[productIndex] : undefined;
        const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === item.variantId);
        if (item.variantId && inMemoryVariant) {
          inMemoryVariant.stock_quantity = quantity;
          inMemoryVariant.reserved_quantity = reservedQuantity;
        } else if (inMemoryProduct) {
          inMemoryProduct.stockQuantity = quantity;
          inMemoryProduct.inStock = quantity > 0;
        }
      }
    } else if ((oldStatus === 'payment_pending_webhook' || oldStatus === 'pending_payment') && (newStatus === 'payment_failed' || newStatus === 'cancelled')) {
      for (const item of order.items) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await this.getInventoryByVariantId(realId, item.variantId)
          : await this.getInventoryByProductId(realId);
        if (inventory.reserved_quantity < item.quantity) {
          throw new Error(`Réservation de stock incohérente pour le produit ${item.productId}.`);
        }
        const reservedQuantity = inventory.reserved_quantity - item.quantity;
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        this.inMemoryInventory.set(key, {
          quantity: inventory.quantity,
          reserved_quantity: reservedQuantity,
          available_quantity: inventory.quantity - reservedQuantity
        });
      }
    } else if (
      ['paid', 'processing', 'packed', 'shipped', 'delivered', 'return_requested', 'partially_refunded'].includes(oldStatus)
      && (newStatus === 'refunded' || newStatus === 'partially_refunded')
    ) {
      const itemsToRestore = extra?.restockItems || (newStatus === 'refunded' ? order.items : []);
      for (const item of itemsToRestore) {
        const product = await this.getProductById(item.productId);
        const realId = product ? product.id : item.productId;
        const inventory = item.variantId
          ? await this.getInventoryByVariantId(realId, item.variantId)
          : await this.getInventoryByProductId(realId);
        const quantity = inventory.quantity + item.quantity;
        const key = item.variantId ? `${realId}:${item.variantId}` : realId;
        this.inMemoryInventory.set(key, {
          quantity,
          reserved_quantity: inventory.reserved_quantity,
          available_quantity: quantity - inventory.reserved_quantity
        });
        const productIndex = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
        const inMemoryProduct = productIndex >= 0 ? this.inMemoryProducts[productIndex] : undefined;
        const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === item.variantId);
        if (item.variantId && inMemoryVariant) inMemoryVariant.stock_quantity = quantity;
        else if (inMemoryProduct) {
          inMemoryProduct.stockQuantity = quantity;
          inMemoryProduct.inStock = true;
        }
      }
      }
    });

    order.status = newStatus;
    order.updatedAt = nextUpdatedAt;
    order.stripePaymentIntentId = nextPaymentIntent;
    await this.logOrderStatusHistory(
      orderId,
      oldStatus,
      newStatus,
      extra?.changedBy,
      extra?.changedByRole || 'admin',
      extra?.reason || `Changement de statut de ${oldStatus} vers ${newStatus}`,
      'admin_dashboard'
    );

    const index = this.inMemoryOrders.findIndex(existing => existing.id === order.id);
    if (index >= 0) this.inMemoryOrders[index] = order;
    else this.inMemoryOrders.unshift(order);

    {
      const type = newStatus === 'paid' ? 'payment_confirmed' : `order_${newStatus}`;
      const title = `Mise à jour commande #${order.id}`;
      const email: EmailMessage = {
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] ${title}`,
        template: emailTemplateForOrderStatus(newStatus),
        data: { orderId: order.id, total: order.total, status: newStatus, ...(extra?.emailData || {}) }
      };
      if (order.userId) {
        await this.notifyUser(
          order.userId,
          type,
          title,
          `Le statut de votre commande est désormais : ${newStatus.toUpperCase()}`,
          `/account?tab=orders`,
          order.id,
          email,
          `order-status:${order.id}:${newStatus}`
        );
      } else {
        await this.sendTransactionalEmail(email);
      }
      if (newStatus === 'paid') await this.notifyLowStockForOrder(order);
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
  public async sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string,
    orderId?: string,
    dedupeKey?: string
  ): Promise<UserNotification> {
    const existingLocal = dedupeKey && this.inMemoryNotifications.find(notification => notification.dedupeKey === dedupeKey);
    if (existingLocal) return existingLocal;

    const createdAt = new Date().toISOString();
    const notif: UserNotification = {
      id: randomUUID(),
      userId,
      type,
      title,
      message,
      link,
      orderId,
      dedupeKey,
      read: false,
      createdAt,
      deliveredAt: createdAt
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const payload = {
          id: notif.id,
          user_id: userId,
          type,
          title,
          message,
          link: link || null,
          order_id: orderId || null,
          dedupe_key: dedupeKey || null,
          read: false,
          created_at: createdAt,
          delivered_at: createdAt
        };
        const request = dedupeKey
          ? supabase.from('notifications').upsert(payload, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('*').maybeSingle()
          : supabase.from('notifications').insert(payload).select('*').single();
        const { data, error } = await request;
        ensureDatabaseSuccess('création de la notification', error);
        let row = data;
        if (!row && dedupeKey) {
          const existingResult = await supabase.from('notifications').select('*').eq('dedupe_key', dedupeKey).maybeSingle();
          ensureDatabaseSuccess('lecture de la notification dédupliquée', existingResult.error);
          row = existingResult.data;
        }
        const persisted = row ? {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          title: row.title,
          message: row.message,
          link: row.link || undefined,
          orderId: row.order_id || undefined,
          dedupeKey: row.dedupe_key || undefined,
          read: row.read === true,
          createdAt: row.created_at,
          deliveredAt: row.delivered_at || undefined,
          errorMessage: row.error_message || undefined
        } : notif;
        const existingIndex = this.inMemoryNotifications.findIndex(notification => notification.id === persisted.id);
        if (existingIndex >= 0) this.inMemoryNotifications[existingIndex] = persisted;
        else this.inMemoryNotifications.unshift(persisted);
        if (data?.id === notif.id || !dedupeKey) {
          await this.logNotificationDelivery({
            id: randomUUID(),
            userId,
            notificationId: persisted.id,
            channel: 'in_app',
            status: 'sent',
            provider: 'supabase',
            createdAt
          });
        }
        return persisted;
      } catch (err) {
        console.error('[serverDb] sendNotification error:', err);
        throw err;
      }
    }

    this.inMemoryNotifications.unshift(notif);
    await this.logNotificationDelivery({
      id: randomUUID(),
      userId,
      notificationId: notif.id,
      channel: 'in_app',
      status: 'sent',
      provider: 'memory',
      createdAt
    });
    return notif;
  }

  private async logNotificationDelivery(log: NotificationDeliveryLog): Promise<void> {
    this.inMemoryNotificationLogs.unshift(log);
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.from('notification_logs').insert({
        id: log.id,
        user_id: log.userId || null,
        notification_id: log.notificationId || null,
        channel: log.channel,
        status: log.status === 'skipped' ? 'logged' : log.status,
        provider: log.provider || null,
        provider_message_id: log.messageId || null,
        error: log.error || (log.status === 'skipped' ? 'Notification email désactivée par les préférences.' : null),
        created_at: log.createdAt
      });
      ensureDatabaseSuccess('journalisation de la livraison de notification', error);
    } catch (err) {
      // A delivery-log outage must never be reported as a successful delivery
      // or roll back an already committed order/status transition.
      console.error('[serverDb] notification delivery log error:', err);
    }
  }

  private async getEmailForUser(userId: string): Promise<string | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’adresse email utilisateur', error);
      return typeof data?.email === 'string' && data.email.includes('@') ? data.email : undefined;
    }
    const localOrder = this.inMemoryOrders.find(order => order.userId === userId);
    return localOrder?.customerEmail;
  }

  private async recordEmailDelivery(
    message: EmailMessage,
    result: EmailDeliveryResult,
    userId?: string,
    notificationId?: string
  ): Promise<void> {
    const logStatus: NotificationDeliveryLog['status'] = result.delivered
      ? 'sent'
      : result.status === 'failed' ? 'failed' : 'logged';
    const error = result.error || (!result.delivered ? 'Mode console : email journalisé localement, non envoyé.' : undefined);
    await this.logNotificationDelivery({
      id: randomUUID(),
      userId,
      notificationId,
      channel: 'email',
      status: logStatus,
      provider: result.provider,
      messageId: result.messageId,
      error,
      createdAt: new Date().toISOString()
    });

    if (notificationId && result.status === 'failed') {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { error: notificationError } = await supabase.from('notifications')
          .update({ error_message: result.error || 'Échec du fournisseur email.' })
          .eq('id', notificationId);
        if (notificationError) console.error('[serverDb] notification error update failed:', notificationError);
      }
    }
  }

  public async notifyPaymentPending(order: ServerOrder): Promise<void> {
    const email: EmailMessage = {
      to: order.customerEmail,
      subject: `[KURLA BEAUTY] Paiement en attente pour la commande #${order.id}`,
      template: 'payment_pending',
      data: { orderId: order.id, total: order.total }
    };
    if (order.userId) {
      await this.notifyUser(
        order.userId,
        'payment_pending',
        'Paiement en attente',
        `Votre commande #${order.id} est enregistrée et attend la confirmation du paiement.`,
        `/account?tab=orders`,
        order.id,
        email,
        `payment-pending:${order.id}`
      );
    } else {
      await this.sendTransactionalEmail(email);
    }
  }

  public async notifyDueRoutineReminders(userId: string, tasks: RoutineTask[]): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const recipientEmail = await this.getEmailForUser(userId);
    const dueTasks = tasks.filter(task => task.status === 'pending' && task.scheduledFor <= today);
    for (const task of dueTasks) {
      await this.notifyUser(
        userId,
        'routine_reminder',
        'Rappel de votre routine',
        `Votre tâche « ${task.title} » est prévue aujourd’hui.${task.description ? ` ${task.description}` : ''}`,
        `/account?tab=routine`,
        undefined,
        recipientEmail ? {
          to: recipientEmail,
          subject: '[KURLA BEAUTY] Rappel de votre routine',
          template: 'routine_reminder',
          data: { taskId: task.id, taskTitle: task.title, scheduledFor: task.scheduledFor }
        } : undefined,
        `routine-reminder:${userId}:${task.id}:${task.scheduledFor}`
      );
    }
  }

  public async notifyLowStock(
    productId: string,
    options: { variantId?: string; quantity?: number; productName?: string } = {}
  ): Promise<void> {
    const threshold = Math.max(0, Number(process.env.LOW_STOCK_THRESHOLD || 5));
    const supabase = getSupabaseServerClient();
    let quantity = options.quantity;
    let productName = options.productName || productId;

    if (supabase && quantity === undefined) {
      const inventoryQuery = supabase.from('inventory').select('quantity, reserved_quantity').eq('product_id', productId);
      const scopedQuery = options.variantId ? inventoryQuery.eq('variant_id', options.variantId) : inventoryQuery.is('variant_id', null);
      const { data: inventory, error: inventoryError } = await scopedQuery.maybeSingle();
      ensureDatabaseSuccess('lecture du stock pour alerte', inventoryError);
      if (inventory) quantity = Math.max(0, Number(inventory.quantity || 0) - Number(inventory.reserved_quantity || 0));
      const { data: product, error: productError } = await supabase.from('products').select('name').eq('id', productId).maybeSingle();
      ensureDatabaseSuccess('lecture du nom du produit pour alerte stock', productError);
      if (product?.name) productName = product.name;
      if (options.variantId) {
        const { data: variant, error: variantError } = await supabase.from('product_variants').select('name').eq('id', options.variantId).maybeSingle();
        ensureDatabaseSuccess('lecture du nom de la variante pour alerte stock', variantError);
        if (variant?.name) productName = `${productName} (${variant.name})`;
      }
    }

    if (quantity === undefined) {
      const product = this.inMemoryProducts.find(item => item.id === productId);
      const variant = options.variantId && Array.isArray(product?.variants)
        ? product.variants.find((item: any) => item.id === options.variantId)
        : undefined;
      quantity = Number(variant?.stockQuantity ?? variant?.stock_quantity ?? product?.stockQuantity ?? product?.stock_quantity ?? 0);
      productName = options.productName || variant?.name || product?.name || productName;
    }
    if (!Number.isFinite(quantity) || quantity > threshold) return;

    if (!supabase) return;
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('role', ['admin', 'superadmin']);
    ensureDatabaseSuccess('lecture des destinataires des alertes stock', adminError);

    for (const admin of admins || []) {
      if (!admin.id || typeof admin.email !== 'string' || !admin.email.includes('@')) continue;
      const title = `Stock faible : ${productName}`;
      await this.notifyUser(
        admin.id,
        'low_stock',
        title,
        `${productName} est bientôt en rupture : ${quantity} unité(s) disponible(s).`,
        '/admin?tab=inventory',
        undefined,
        {
          to: admin.email,
          subject: `[KURLA BEAUTY] ${title}`,
          template: 'low_stock',
          data: { productName, quantity, threshold, productId, variantId: options.variantId }
        },
        `low-stock:${productId}:${options.variantId || 'product'}:${quantity}`
      );
    }
  }

  public async notifyLowStockForOrder(order: ServerOrder): Promise<void> {
    for (const item of order.items || []) {
      await this.notifyLowStock(item.productId, { variantId: item.variantId });
    }
  }

  public async sendTransactionalEmail(
    message: EmailMessage,
    userId?: string,
    notificationId?: string
  ): Promise<EmailDeliveryResult> {
    let result: EmailDeliveryResult;
    try {
      result = await emailService.sendEmail(message);
    } catch (err: any) {
      result = {
        success: false,
        delivered: false,
        status: 'failed',
        provider: emailService.getProviderName(),
        error: err?.message || 'Erreur inattendue du service email.'
      };
    }
    await this.recordEmailDelivery(message, result, userId, notificationId);
    return result;
  }

  public async notifyUser(
    userId: string,
    type: string,
    title: string,
    message: string,
    link: string | undefined,
    orderId: string | undefined,
    email: EmailMessage | undefined,
    dedupeKey?: string
  ): Promise<{ notification: UserNotification; email?: EmailDeliveryResult }> {
    let preferences: NotificationPreference;
    try {
      preferences = await this.getNotificationPreferences(userId);
    } catch (err: any) {
      const error = err?.message || 'Préférences de notification indisponibles.';
      console.error('[serverDb] notification preferences unavailable:', error);
      const notification: UserNotification = {
        id: randomUUID(), userId, type, title, message, link, orderId,
        dedupeKey, read: false, createdAt: new Date().toISOString(), errorMessage: error
      };
      if (!email) return { notification };
      const failed: EmailDeliveryResult = {
        success: false,
        delivered: false,
        status: 'failed',
        provider: emailService.getProviderName(),
        error: `Préférences de notification indisponibles : ${error}`
      };
      await this.recordEmailDelivery(email, failed, userId);
      return { notification, email: failed };
    }

    let notification: UserNotification;
    if (preferences.inAppNotifications) {
      try {
        notification = await this.sendNotification(userId, type, title, message, link, orderId, dedupeKey);
      } catch (err: any) {
        const error = err?.message || 'Échec de création de la notification in-app.';
        console.error('[serverDb] in-app notification unavailable:', error);
        notification = {
          id: randomUUID(), userId, type, title, message, link, orderId,
          dedupeKey, read: false, createdAt: new Date().toISOString(), errorMessage: error
        };
        await this.logNotificationDelivery({
          id: randomUUID(), userId, channel: 'in_app', status: 'failed', error,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      notification = {
        id: randomUUID(), userId, type, title, message, link, orderId,
        dedupeKey, read: false, createdAt: new Date().toISOString()
      };
    }
    const notificationId = preferences.inAppNotifications && !notification.errorMessage ? notification.id : undefined;
    if (!email) return { notification };

    if (!preferences.emailNotifications || !preferences.transactionalEmails) {
      const skipped: EmailDeliveryResult = {
        success: false,
        delivered: false,
        status: 'logged',
        provider: emailService.getProviderName(),
        error: 'Email transactionnel désactivé par les préférences utilisateur.'
      };
      await this.recordEmailDelivery(email, skipped, userId, notificationId);
      return { notification, email: skipped };
    }

    const result = await this.sendTransactionalEmail(email, userId, notificationId);
    return { notification, email: result };
  }

  public async getNotificationDeliveryLogs(userId?: string, limit = 100): Promise<NotificationDeliveryLog[]> {
    const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase.from('notification_logs').select('*').order('created_at', { ascending: false }).limit(safeLimit);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      ensureDatabaseSuccess('lecture du journal de livraison des notifications', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id || undefined,
        notificationId: row.notification_id || undefined,
        channel: row.channel,
        status: row.status,
        provider: row.provider || undefined,
        messageId: row.provider_message_id || undefined,
        error: row.error || undefined,
        createdAt: row.created_at
      }));
    }
    return this.inMemoryNotificationLogs
      .filter(log => !userId || log.userId === userId)
      .slice(0, safeLimit);
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
            dedupeKey: n.dedupe_key || undefined,
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
  // DELIVERY ADDRESSES & RATES
  // ============================================================
  public async getShippingAddresses(userId: string): Promise<ShippingAddressRecord[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('shipping_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false }).order('created_at', { ascending: false });
      ensureDatabaseSuccess('lecture des adresses de livraison', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        street: row.street,
        city: row.city,
        postalCode: row.postal_code,
        country: row.country,
        phone: row.phone || undefined,
        isDefault: row.is_default === true,
        createdAt: row.created_at
      }));
    }
    return [...(this.inMemoryShippingAddresses.get(userId) || [])];
  }

  public async saveShippingAddress(userId: string, input: unknown, addressId?: string, isDefault = false): Promise<ShippingAddressRecord> {
    const normalized = normalizeShippingAddress(input);
    const now = new Date().toISOString();
    const addresses = await this.getShippingAddresses(userId);
    const existingAddress = addressId ? addresses.find(address => address.id === addressId) : undefined;
    if (addressId && isUuid(addressId) && !existingAddress) throw new Error('Adresse de livraison introuvable pour ce client.');
    const id = existingAddress ? existingAddress.id : randomUUID();
    const record: ShippingAddressRecord = {
      ...normalized,
      id,
      userId,
      isDefault: isDefault || addresses.length === 0,
      createdAt: addresses.find(address => address.id === id)?.createdAt || now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (record.isDefault) {
        const { error: clearError } = await supabase.from('shipping_addresses').update({ is_default: false }).eq('user_id', userId);
        ensureDatabaseSuccess('réinitialisation de l’adresse par défaut', clearError);
      }
      const { data, error } = await supabase.from('shipping_addresses').upsert({
        id,
        user_id: userId,
        full_name: record.fullName,
        street: record.street,
        city: record.city,
        postal_code: record.postalCode,
        country: record.country,
        phone: record.phone || null,
        is_default: record.isDefault,
        created_at: record.createdAt
      }, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement de l’adresse de livraison', error);
      if (data) {
        record.isDefault = data.is_default === true;
        record.createdAt = data.created_at;
      }
    }
    const next = addresses.filter(address => address.id !== id).map(address => record.isDefault ? { ...address, isDefault: false } : address);
    next.unshift(record);
    this.inMemoryShippingAddresses.set(userId, next);
    return record;
  }

  public async deleteShippingAddress(userId: string, addressId: string): Promise<boolean> {
    const addresses = await this.getShippingAddresses(userId);
    const target = addresses.find(address => address.id === addressId);
    if (!target) return false;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('shipping_addresses').delete().eq('id', addressId).eq('user_id', userId);
      ensureDatabaseSuccess('suppression de l’adresse de livraison', error);
    }
    const remaining = addresses.filter(address => address.id !== addressId);
    if (target.isDefault && remaining.length > 0) {
      remaining[0] = { ...remaining[0], isDefault: true };
      if (supabase) {
        const { error } = await supabase.from('shipping_addresses').update({ is_default: true }).eq('id', remaining[0].id).eq('user_id', userId);
        ensureDatabaseSuccess('sélection de la nouvelle adresse par défaut', error);
      }
    }
    this.inMemoryShippingAddresses.set(userId, remaining);
    return true;
  }

  public async getShippingRates(country?: string, includeInactive = false): Promise<ShippingRateRecord[]> {
    const normalizedCountry = country?.trim().toUpperCase();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      let query = supabase.from('shipping_rates').select('*').order('country').order('price');
      if (!includeInactive) query = query.eq('active', true);
      if (normalizedCountry) query = query.or(`country.eq.${normalizedCountry},country.is.null`);
      const { data, error } = await query;
      ensureDatabaseSuccess('lecture des tarifs de livraison', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        country: row.country || undefined,
        carrier: row.carrier as ShippingCarrier,
        method: row.method || 'standard',
        name: row.name,
        price: Number(row.price || 0),
        freeFromCents: row.free_from_cents == null ? undefined : Number(row.free_from_cents),
        estimatedDays: row.estimated_days == null ? undefined : Number(row.estimated_days),
        active: row.active === true,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at
      }));
    }

    const defaults = SHIPPING_OPTIONS
      .filter(option => !normalizedCountry || option.country === normalizedCountry)
      .flatMap(option => [
        { id: `default-${option.country}-standard`, country: option.country, carrier: 'manual' as ShippingCarrier, method: 'standard', name: `Livraison standard — ${option.label}`, price: option.standardCents / 100, freeFromCents: option.freeFromCents, estimatedDays: Number(option.estimatedStandardDays.match(/\d+/)?.[0] || 0), active: true, createdAt: '', updatedAt: '' },
        { id: `default-${option.country}-express`, country: option.country, carrier: 'manual' as ShippingCarrier, method: 'express', name: `Livraison express — ${option.label}`, price: option.expressCents / 100, estimatedDays: Number(option.estimatedExpressDays.match(/\d+/)?.[0] || 0), active: true, createdAt: '', updatedAt: '' }
      ]);
    const custom = this.inMemoryShippingRates.filter(rate => (!normalizedCountry || rate.country === normalizedCountry) && (includeInactive || rate.active));
    return [...custom, ...defaults];
  }

  public async saveShippingRate(adminId: string, input: Partial<ShippingRateRecord>): Promise<ShippingRateRecord> {
    const country = input.country?.trim().toUpperCase() || undefined;
    if (country && !getShippingOption(country)) throw new Error('Pays de livraison non pris en charge.');
    if (!input.name?.trim() || !input.method?.trim() || !input.carrier) throw new Error('Transporteur, méthode et nom du tarif sont obligatoires.');
    if (!['manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre'].includes(input.carrier)) throw new Error('Transporteur de livraison invalide.');
    if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) throw new Error('Tarif de livraison invalide.');
    if (input.freeFromCents !== undefined && input.freeFromCents !== null && (!Number.isSafeInteger(Number(input.freeFromCents)) || Number(input.freeFromCents) < 0)) throw new Error('Seuil de gratuité invalide.');
    if (input.estimatedDays !== undefined && input.estimatedDays !== null && (!Number.isSafeInteger(Number(input.estimatedDays)) || Number(input.estimatedDays) < 0)) throw new Error('Délai de livraison invalide.');
    const now = new Date().toISOString();
    const record: ShippingRateRecord = {
      id: input.id && isUuid(input.id) ? input.id : randomUUID(),
      country,
      carrier: input.carrier,
      method: input.method.trim().toLowerCase(),
      name: input.name.trim().slice(0, 160),
      price: Number(input.price),
      freeFromCents: input.freeFromCents == null ? undefined : Number(input.freeFromCents),
      estimatedDays: input.estimatedDays == null ? undefined : Number(input.estimatedDays),
      active: input.active !== false,
      createdAt: input.createdAt || now,
      updatedAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('shipping_rates').upsert({
        id: record.id,
        country: record.country || null,
        carrier: record.carrier,
        method: record.method,
        name: record.name,
        price: record.price,
        free_from_cents: record.freeFromCents ?? null,
        estimated_days: record.estimatedDays ?? null,
        active: record.active,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        updated_by: adminId
      }, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement du tarif de livraison', error);
      if (data) {
        record.country = data.country || undefined;
        record.price = Number(data.price);
        record.updatedAt = data.updated_at;
      }
    }
    this.inMemoryShippingRates = [record, ...this.inMemoryShippingRates.filter(rate => rate.id !== record.id)];
    return record;
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
          const shipment: ShipmentDetails = {
            id: data.id,
            orderId: data.order_id,
            userId: data.user_id,
            carrier: data.carrier as ShippingCarrier,
            method: data.method,
            price: Number(data.price || 0),
            tariff: data.tariff == null ? Number(data.price || 0) : Number(data.tariff),
            address: data.delivery_address || undefined,
            country: data.country || data.delivery_address?.country || undefined,
            trackingNumber: data.tracking_number || undefined,
            trackingUrl: data.tracking_url || undefined,
            status: data.status,
            shippedAt: data.shipped_at || undefined,
            estimatedDelivery: data.estimated_delivery || undefined,
            deliveredAt: data.delivered_at || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            history: await this.getShipmentHistoryById(data.id)
          };
          return shipment;
        }
      } catch (err) {
        console.error('[serverDb] getShipmentByOrderId error:', err);
        throw err;
      }
    }
    const shipment = supabase ? undefined : this.inMemoryShipments.get(orderId);
    if (shipment?.id) shipment.history = this.inMemoryShippingEvents.filter(event => event.shipmentId === shipment.id);
    return shipment;
  }

  private async getShipmentHistoryById(shipmentId: string): Promise<ShipmentEvent[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('shipping_events').select('*').eq('shipment_id', shipmentId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture de l’historique de livraison', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        shipmentId: row.shipment_id,
        status: row.status as ShipmentStatus,
        location: row.location || undefined,
        description: row.description || undefined,
        createdAt: row.created_at
      }));
    }
    return this.inMemoryShippingEvents.filter(event => event.shipmentId === shipmentId);
  }

  public async getShipmentHistory(orderId: string): Promise<ShipmentEvent[]> {
    const shipment = await this.getShipmentByOrderId(orderId);
    return shipment?.history || [];
  }

  public async upsertShipment(details: ShipmentDetails): Promise<ShipmentDetails> {
    const allowedCarriers: ShippingCarrier[] = ['manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre'];
    const allowedStatuses: ShipmentStatus[] = ['preparing', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];
    if (!details.orderId.trim()) throw new Error('Commande de livraison manquante.');
    if (!allowedCarriers.includes(details.carrier)) throw new Error('Transporteur de livraison invalide.');
    if (!allowedStatuses.includes(details.status)) throw new Error('Statut de livraison invalide.');
    if (!details.method?.trim()) throw new Error('Méthode de livraison obligatoire.');
    if (!Number.isFinite(details.price) || details.price < 0) throw new Error('Tarif de livraison invalide.');
    if (details.country && !getShippingOption(details.country)) throw new Error('Pays de livraison non pris en charge.');
    const validatedAddress = details.address ? normalizeShippingAddress(details.address) : undefined;
    const trackingNumber = details.trackingNumber?.trim() || undefined;
    const trackingUrl = details.trackingUrl?.trim() || undefined;
    const outboundStatuses: ShipmentStatus[] = ['shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    if (outboundStatuses.includes(details.status) && !trackingNumber) {
      throw new Error('Un vrai numéro de suivi saisi par le transporteur est obligatoire avant l’expédition.');
    }
    if (trackingNumber && /^(test|fake|dummy|placeholder|todo|n[\/.-]?a|none|null|example)/i.test(trackingNumber)) {
      throw new Error('Le numéro de suivi fourni ressemble à une valeur de test ou de remplacement. Saisissez le numéro réel du transporteur.');
    }
    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      throw new Error('Le lien de suivi doit être une URL HTTP(S) réelle.');
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    let existing: ShipmentDetails | undefined;
    let shipmentId = isUuid(details.id) ? details.id : randomUUID();
    if (supabase) {
      const { data, error } = await supabase.from('shipments').select('*').eq('order_id', details.orderId).maybeSingle();
      ensureDatabaseSuccess('vérification de l’expédition existante', error);
      if (data) {
        shipmentId = data.id;
        existing = {
          id: data.id,
          orderId: data.order_id,
          userId: data.user_id || undefined,
          carrier: data.carrier as ShippingCarrier,
          method: data.method,
          price: Number(data.price || 0),
          tariff: data.tariff == null ? Number(data.price || 0) : Number(data.tariff),
          address: data.delivery_address || undefined,
          country: data.country || undefined,
          trackingNumber: data.tracking_number || undefined,
          trackingUrl: data.tracking_url || undefined,
          status: data.status as ShipmentStatus,
          shippedAt: data.shipped_at || undefined,
          estimatedDelivery: data.estimated_delivery || undefined,
          deliveredAt: data.delivered_at || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    } else {
      existing = this.inMemoryShipments.get(details.orderId);
      if (existing?.id) shipmentId = existing.id;
    }

    const effectiveTrackingNumber = trackingNumber || existing?.trackingNumber;
    if (effectiveTrackingNumber && /^(test|fake|dummy|placeholder|todo|n[\\/.-]?a|none|null|example)/i.test(effectiveTrackingNumber)) {
      throw new Error('Le numéro de suivi historique ressemble à une valeur de test ou de remplacement. Réconciliation manuelle requise.');
    }
    if (outboundStatuses.includes(details.status) && !effectiveTrackingNumber) {
      throw new Error('Un vrai numéro de suivi est obligatoire pour ce statut de livraison.');
    }
    const effectiveTrackingUrl = trackingUrl || (effectiveTrackingNumber ? shippingService.generateTrackingUrl(details.carrier, effectiveTrackingNumber) : existing?.trackingUrl);
    const tariff = details.tariff == null ? details.price : details.tariff;
    if (!Number.isFinite(tariff) || tariff < 0) throw new Error('Tarif de livraison invalide.');
    const finalDetails: ShipmentDetails = {
      ...details,
      id: shipmentId,
      price: tariff,
      tariff,
      address: validatedAddress || existing?.address,
      country: details.country?.toUpperCase() || validatedAddress?.country || existing?.country || existing?.address?.country,
      trackingNumber: effectiveTrackingNumber,
      trackingUrl: effectiveTrackingUrl,
      createdAt: existing?.createdAt || details.createdAt || now,
      updatedAt: now
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('shipments').upsert({
          id: finalDetails.id,
          order_id: details.orderId,
          user_id: details.userId || existing?.userId || null,
          carrier: details.carrier,
          method: details.method.trim(),
          price: tariff,
          tariff,
          delivery_address: finalDetails.address || null,
          country: finalDetails.country || null,
          tracking_number: finalDetails.trackingNumber || null,
          tracking_url: finalDetails.trackingUrl || null,
          status: details.status,
          shipped_at: details.shippedAt || existing?.shippedAt || null,
          estimated_delivery: details.estimatedDelivery || existing?.estimatedDelivery || null,
          delivered_at: details.deliveredAt || existing?.deliveredAt || null,
          created_at: finalDetails.createdAt,
          updated_at: now
        }, { onConflict: 'order_id' });
        ensureDatabaseSuccess('sauvegarde de l’expédition', error);
      } catch (err) {
        console.error('[serverDb] upsertShipment error:', err);
        throw err;
      }
    }

    const event: ShipmentEvent = {
      id: randomUUID(),
      shipmentId,
      status: details.status,
      location: details.eventLocation?.trim() || undefined,
      description: details.eventDescription?.trim() || (existing && existing.status === details.status ? 'Informations de livraison mises à jour.' : `Statut de livraison : ${details.status}`),
      createdAt: now
    };
    if (supabase) {
      const { error } = await supabase.from('shipping_events').insert({
        id: event.id,
        shipment_id: shipmentId,
        status: event.status,
        location: event.location || null,
        description: event.description || null,
        created_at: event.createdAt
      });
      ensureDatabaseSuccess('journalisation de l’événement de livraison', error);
      finalDetails.history = await this.getShipmentHistoryById(shipmentId);
    } else {
      this.inMemoryShippingEvents.push(event);
      finalDetails.history = [...(existing?.history || []), event];
    }

    this.inMemoryShipments.set(details.orderId, finalDetails);
    return finalDetails;
  }

  // ============================================================
  // PHASE 5: RETURNS & REFUNDS
  // ============================================================
  private async recordReturnEvent(input: Omit<CustomerReturnEvent, 'id' | 'createdAt'>): Promise<CustomerReturnEvent> {
    const event: CustomerReturnEvent = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('return_events').insert({
        id: event.id,
        return_id: event.returnId,
        actor_id: event.actorId || null,
        actor_role: event.actorRole,
        old_status: event.oldStatus || null,
        new_status: event.newStatus,
        comment: event.comment || null,
        created_at: event.createdAt
      });
      ensureDatabaseSuccess('journalisation de l’événement de retour', error);
    }
    this.inMemoryReturnEvents.push(event);
    return event;
  }

  public async getReturnHistory(returnId: string): Promise<CustomerReturnEvent[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('return_events').select('*').eq('return_id', returnId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture de l’historique du retour', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        returnId: row.return_id,
        actorId: row.actor_id || undefined,
        actorRole: row.actor_role,
        oldStatus: row.old_status || undefined,
        newStatus: row.new_status,
        comment: row.comment || undefined,
        createdAt: row.created_at
      }));
    }
    return this.inMemoryReturnEvents.filter(event => event.returnId === returnId);
  }

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

    const keyFor = (productId: string, variantId?: string) => `${productId}::${variantId || ''}`;
    const orderQuantities = new Map(order.items.map(item => [keyFor(item.productId, item.variantId), item.quantity]));
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
          const variantId = item?.variantId || item?.variant_id || undefined;
          const quantity = Number(item?.quantity);
          const key = typeof productId === 'string' ? keyFor(productId, variantId) : '';
          if (key && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(key, (alreadyRequested.get(key) || 0) + quantity);
          }
        }
      }
    } else {
      for (const previous of this.inMemoryReturns) {
        if (previous.orderId !== orderId || ['rejected', 'cancelled'].includes(previous.status)) continue;
        for (const item of previous.items || []) {
          const productId = item?.productId || item?.product_id;
          const variantId = item?.variantId || item?.variant_id || undefined;
          const quantity = Number(item?.quantity);
          const key = typeof productId === 'string' ? keyFor(productId, variantId) : '';
          if (key && Number.isSafeInteger(quantity) && quantity > 0) {
            alreadyRequested.set(key, (alreadyRequested.get(key) || 0) + quantity);
          }
        }
      }
    }

    const normalizedItems = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of items) {
      const productId = item?.productId || item?.product_id;
      const variantId = item?.variantId || item?.variant_id || undefined;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('Ligne de retour invalide.');
      }
      const key = keyFor(productId, variantId);
      const nextQuantity = (normalizedItems.get(key)?.quantity || 0) + quantity;
      const totalRequested = (alreadyRequested.get(key) || 0) + nextQuantity;
      if (!orderQuantities.has(key) || totalRequested > orderQuantities.get(key)!) {
        throw new Error(`Quantité retournée invalide pour le produit ${productId}.`);
      }
      normalizedItems.set(key, { productId, variantId, quantity: nextQuantity });
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
    await this.recordReturnEvent({
      returnId: ret.id,
      actorId: userId,
      actorRole: 'customer',
      newStatus: 'requested',
      comment: ret.comment || ret.reason
    });
    await this.logOrderStatusHistory(orderId, undefined, 'return_requested', userId, 'customer', ret.reason, 'customer_action');
    await this.notifyUser(
      userId,
      'return_requested',
      'Demande de retour enregistrée',
      `Votre demande de retour pour la commande #${orderId} a été reçue.`,
      `/account?tab=returns`,
      orderId,
      {
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Demande de retour pour la commande #${orderId}`,
        template: 'return_requested',
        data: { orderId, returnId: ret.id }
      },
      `return-created:${ret.id}`
    );

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

  public async updateReturnStatus(returnId: string, status: CustomerReturn['status'], adminComment?: string, actorId?: string, actorRole: CustomerReturnEvent['actorRole'] = 'admin'): Promise<CustomerReturn | undefined> {
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

    if (currentReturn.status !== status || adminComment !== undefined) {
      await this.recordReturnEvent({
        returnId: updatedReturn.id,
        actorId,
        actorRole,
        oldStatus: currentReturn.status,
        newStatus: status,
        comment: adminComment || undefined
      });
    }

    const returnMessage = `Le statut de votre retour pour la commande #${updatedReturn.orderId} est désormais : ${status.toUpperCase()}. ${adminComment ? 'Note admin : ' + adminComment : ''}`;
    const returnOrder = await this.getOrderById(updatedReturn.orderId);
    await this.notifyUser(
      updatedReturn.userId,
      'return_requested',
      `Mise à jour de votre retour #${updatedReturn.id}`,
      returnMessage,
      `/account?tab=returns`,
      updatedReturn.orderId,
      returnOrder?.customerEmail ? {
        to: returnOrder.customerEmail,
        subject: `[KURLA BEAUTY] Mise à jour de votre retour #${updatedReturn.id}`,
        template: 'return_requested',
        data: { orderId: updatedReturn.orderId, status, returnId: updatedReturn.id }
      } : undefined,
      `return-status:${updatedReturn.id}:${status}`
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
  ): Promise<Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>> {
    const keyFor = (productId: string, variantId?: string) => `${productId}::${variantId || ''}`;
    const orderItems = new Map(order.items.map(item => [keyFor(item.productId, item.variantId), item]));
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
          const key = keyFor(item.productId, item.variantId);
          previouslyRestored.set(key, (previouslyRestored.get(key) || 0) + item.quantity);
        }
      }
    }

    let requestedItems: any[] = order.items;
    if (returnId) {
      const ret = await this.getReturnById(returnId);
      if (!ret || ret.orderId !== order.id) {
        throw new Error(`Demande de retour #${returnId} introuvable pour la commande #${order.id}.`);
      }
      if (ret.status !== 'received') {
        throw new Error(`La réception physique de la demande de retour #${returnId} doit être enregistrée avant remboursement.`);
      }
      requestedItems = ret.items;
    } else {
      if (amountCents !== remainingCents) {
        throw new Error('Un remboursement partiel doit être rattaché à une demande de retour.');
      }
      requestedItems = order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity - (previouslyRestored.get(keyFor(item.productId, item.variantId)) || 0)
      })).filter(item => item.quantity > 0);
    }

    const requestedQuantities = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of requestedItems) {
      const productId = item?.productId || item?.product_id;
      const variantId = item?.variantId || item?.variant_id || undefined;
      const quantity = Number(item?.quantity);
      if (typeof productId !== 'string' || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error(`Quantité remboursée invalide pour le produit ${productId || 'inconnu'}.`);
      }
      const key = keyFor(productId, variantId);
      const existing = requestedQuantities.get(key);
      requestedQuantities.set(key, {
        productId,
        variantId,
        quantity: (existing?.quantity || 0) + quantity
      });
    }

    const refundItems = Array.from(requestedQuantities.values()).map(item => {
      const orderItem = orderItems.get(keyFor(item.productId, item.variantId));
      const alreadyRestored = previouslyRestored.get(keyFor(item.productId, item.variantId)) || 0;
      const availableQuantity = (orderItem?.quantity || 0) - alreadyRestored;
      if (!orderItem || item.quantity > availableQuantity) {
        throw new Error(`Quantité remboursée invalide pour le produit ${item.productId}.`);
      }
      return item;
    });

    if (refundItems.length === 0) {
      throw new Error('Aucun article valide à rembourser.');
    }

    const maximumItemAmountCents = refundItems.reduce((sum, item) => {
      const orderItem = orderItems.get(keyFor(item.productId, item.variantId))!;
      return sum + Math.round(orderItem.price * 100) * item.quantity;
    }, 0);
    if (amountCents > maximumItemAmountCents) {
      throw new Error('Le montant du remboursement dépasse la valeur des articles retournés.');
    }

    return refundItems;
  }

  private async restoreLocalRefundStock(order: ServerOrder, items: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>): Promise<void> {
    for (const item of items) {
      const product = await this.getProductById(item.productId);
      const realId = product ? product.id : item.productId;
      const inventory = item.variantId
        ? await this.getInventoryByVariantId(realId, item.variantId)
        : await this.getInventoryByProductId(realId);
      const quantity = inventory.quantity + item.quantity;
      const updatedInventory = {
        quantity,
        reserved_quantity: inventory.reserved_quantity,
        available_quantity: quantity - inventory.reserved_quantity
      };
      const key = item.variantId ? `${realId}:${item.variantId}` : realId;
      this.inMemoryInventory.set(key, updatedInventory);
      if (!item.variantId && realId !== item.productId) this.inMemoryInventory.set(item.productId, updatedInventory);

      const productIndex = this.inMemoryProducts.findIndex(p => p.id === realId || p.slug === item.productId);
      const inMemoryProduct = productIndex >= 0 ? this.inMemoryProducts[productIndex] : undefined;
      const inMemoryVariant = inMemoryProduct?.variants?.find((candidate: any) => candidate.id === item.variantId);
      if (item.variantId && inMemoryVariant) {
        inMemoryVariant.stock_quantity = quantity;
      } else if (inMemoryProduct) {
        inMemoryProduct.stockQuantity = quantity;
        inMemoryProduct.inStock = true;
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
    items: Array<Pick<ServerOrderItem, 'productId' | 'variantId' | 'quantity'>>;
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
        p_items: input.items.map(item => ({
          product_id: item.productId,
          variant_id: item.variantId || null,
          quantity: item.quantity
        })),
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
      || `refund:${orderId}:${returnId || 'manual'}:${amount === undefined ? 'full' : Math.round(amount * 100)}`;
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

    if (refundStatus === 'succeeded' && returnId) {
      const relatedReturn = await this.getReturnById(returnId);
      if (relatedReturn?.status === 'received') {
        await this.updateReturnStatus(returnId, 'refunded', 'Remboursement finalisé.', undefined, 'system');
      }
    }

    if (refundStatus === 'succeeded') {
      const title = 'Remboursement effectué';
      const refundEmail: EmailMessage = {
        to: order.customerEmail,
        subject: `[KURLA BEAUTY] Remboursement effectué pour votre commande #${orderId}`,
        template: 'refund_created',
        data: { orderId, amount: refundCents / 100, reason }
      };
      if (order.userId) {
        await this.notifyUser(
          order.userId,
          'refund_created',
          title,
          `Un remboursement de ${(refundCents / 100).toFixed(2)} EUR a été émis pour votre commande #${orderId}.`,
          `/account?tab=refunds`,
          orderId,
          refundEmail,
          `refund:${idempotencyKey}`
        );
      } else {
        await this.sendTransactionalEmail(refundEmail);
      }
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

    const refund = await this.finalizeRefund({
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
    if (details.returnId) {
      const relatedReturn = await this.getReturnById(details.returnId);
      if (relatedReturn?.status === 'received') {
        await this.updateReturnStatus(details.returnId, 'refunded', 'Remboursement Stripe confirmé.', undefined, 'system');
      }
    }
    return refund;
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
  // FAMILY PROFILES, CHILD SAFETY & SHARED PLANS
  // ============================================================
  private mapFamilySpaceRow(row: any): any {
    return { id: row.id, ownerUserId: row.owner_user_id || row.ownerUserId, name: row.name || 'Ma famille', createdAt: row.created_at || row.createdAt, updatedAt: row.updated_at || row.updatedAt };
  }

  private mapFamilyMemberRow(row: any): any {
    return {
      id: row.id,
      familyId: row.family_id || row.familyId,
      displayName: row.display_name || row.displayName,
      profileKind: row.profile_kind || row.profileKind,
      ageBand: row.age_band || row.ageBand,
      consentStatus: row.consent_status || row.consentStatus || 'not_required',
      consentVersion: row.consent_version || row.consentVersion || undefined,
      consentAt: row.consent_at || row.consentAt || undefined,
      carePreferences: row.care_preferences && typeof row.care_preferences === 'object' ? row.care_preferences : (row.carePreferences || {}),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }

  private mapFamilyPlanRow(row: any): any {
    return {
      id: row.id,
      familyId: row.family_id || row.familyId,
      createdBy: row.created_by || row.createdBy,
      title: row.title,
      planType: row.plan_type || row.planType,
      audience: row.audience || 'shared',
      memberIds: Array.isArray(row.member_ids) ? row.member_ids : (Array.isArray(row.memberIds) ? row.memberIds : []),
      productIds: Array.isArray(row.product_ids) ? row.product_ids : (Array.isArray(row.productIds) ? row.productIds : []),
      schedule: Array.isArray(row.schedule) ? row.schedule : [],
      notes: row.notes || undefined,
      status: row.status,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt
    };
  }

  public async getFamilyDashboard(userId: string): Promise<{ spaces: any[]; members: any[]; plans: any[] }> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data: spaceRows, error: spacesError } = await supabase.from('family_spaces').select('*').eq('owner_user_id', userId).order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture des espaces famille', spacesError);
      const familyIds = (spaceRows || []).map((row: any) => row.id);
      if (!familyIds.length) return { spaces: [], members: [], plans: [] };
      const [{ data: memberRows, error: membersError }, { data: planRows, error: plansError }] = await Promise.all([
        supabase.from('family_members').select('*').in('family_id', familyIds).order('updated_at', { ascending: false }),
        supabase.from('family_plans').select('*').in('family_id', familyIds).order('updated_at', { ascending: false })
      ]);
      ensureDatabaseSuccess('lecture des profils famille', membersError);
      ensureDatabaseSuccess('lecture des plans famille', plansError);
      return {
        spaces: (spaceRows || []).map(row => this.mapFamilySpaceRow(row)),
        members: (memberRows || []).map(row => this.mapFamilyMemberRow(row)),
        plans: (planRows || []).map(row => this.mapFamilyPlanRow(row))
      };
    }
    const spaces = [...this.inMemoryFamilySpaces.values()].filter(space => space.ownerUserId === userId);
    const familyIds = new Set(spaces.map(space => space.id));
    return {
      spaces: spaces.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
      members: [...this.inMemoryFamilyMembers.values()].filter(member => familyIds.has(member.familyId)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
      plans: [...this.inMemoryFamilyPlans.values()].filter(plan => familyIds.has(plan.familyId)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    };
  }

  public async createFamilySpace(userId: string, input: any = {}): Promise<any> {
    const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 120) : '';
    if (!name) throw new Error('Le nom de l’espace famille est obligatoire.');
    const space = { id: randomUUID(), ownerUserId: userId, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('family_spaces').insert({ id: space.id, owner_user_id: userId, name }).select('*').single();
      ensureDatabaseSuccess('création de l’espace famille', error);
      return this.mapFamilySpaceRow(data);
    }
    this.inMemoryFamilySpaces.set(space.id, space);
    return space;
  }

  private async getOwnedFamilySpace(userId: string, familyId: string): Promise<any | undefined> {
    if (!isUuid(familyId)) return undefined;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('family_spaces').select('*').eq('id', familyId).eq('owner_user_id', userId).maybeSingle();
      ensureDatabaseSuccess('vérification de l’espace famille', error);
      return data ? this.mapFamilySpaceRow(data) : undefined;
    }
    const space = this.inMemoryFamilySpaces.get(familyId);
    return space?.ownerUserId === userId ? space : undefined;
  }

  public async saveFamilyMember(userId: string, input: any): Promise<any> {
    const familyId = typeof input?.familyId === 'string' ? input.familyId.trim() : '';
    if (!(await this.getOwnedFamilySpace(userId, familyId))) throw new Error('Espace famille introuvable.');
    const dashboard = await this.getFamilyDashboard(userId);
    const existing = input?.id ? dashboard.members.find(member => member.id === input.id) : undefined;
    if (input?.id && !existing) throw new Error('Profil familial introuvable.');
    const consentProvided = typeof input?.parentalConsent === 'boolean';
    const normalized = normalizeFamilyMemberInput({
      ...input,
      parentalConsent: consentProvided ? input.parentalConsent : existing?.consentStatus === 'granted'
    });
    const now = new Date().toISOString();
    let consentStatus = normalized.consentStatus;
    let consentVersion = normalized.consentVersion;
    let consentAt = normalized.parentalConsent ? now : undefined;
    if (existing && !consentProvided && isMinorAgeBand(normalized.ageBand)) {
      consentStatus = existing.consentStatus;
      consentVersion = existing.consentVersion;
      consentAt = existing.consentAt;
    } else if (existing && isMinorAgeBand(normalized.ageBand) && !normalized.parentalConsent && existing.consentStatus === 'granted') {
      consentStatus = 'revoked';
      consentVersion = undefined;
      consentAt = undefined;
    }
    const id = existing?.id || (isUuid(input?.id) ? input.id : randomUUID());
    const row = {
      id,
      familyId,
      displayName: normalized.displayName,
      profileKind: normalized.profileKind,
      ageBand: normalized.ageBand,
      consentStatus,
      consentVersion,
      consentAt,
      carePreferences: normalized.carePreferences,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('family_members').upsert({
        id,
        family_id: familyId,
        display_name: row.displayName,
        profile_kind: row.profileKind,
        age_band: row.ageBand,
        consent_status: row.consentStatus,
        consent_version: row.consentVersion || null,
        consent_at: row.consentAt || null,
        care_preferences: row.carePreferences,
        created_at: row.createdAt,
        updated_at: now
      }, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement du profil familial', error);
      return this.mapFamilyMemberRow(data);
    }
    this.inMemoryFamilyMembers.set(id, row);
    return row;
  }

  public async deleteFamilyMember(userId: string, memberId: string): Promise<void> {
    const dashboard = await this.getFamilyDashboard(userId);
    const member = dashboard.members.find(item => item.id === memberId);
    if (!member) throw new Error('Profil familial introuvable.');
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId);
      ensureDatabaseSuccess('suppression du profil familial', error);
    }
    this.inMemoryFamilyMembers.delete(memberId);
  }

  public async saveFamilyPlan(userId: string, input: any): Promise<any> {
    const familyId = typeof input?.familyId === 'string' ? input.familyId.trim() : '';
    if (!(await this.getOwnedFamilySpace(userId, familyId))) throw new Error('Espace famille introuvable.');
    const dashboard = await this.getFamilyDashboard(userId);
    const familyMembers = dashboard.members.filter(member => member.familyId === familyId);
    const normalized = normalizeFamilyPlanInput({
      ...input,
      planType: input.planType || input.plan_type,
      memberIds: input.memberIds || input.member_ids,
      productIds: input.productIds || input.product_ids
    });
    const memberMap = new Map(familyMembers.map(member => [member.id, member]));
    if (normalized.memberIds.some(memberId => !isUuid(memberId) || !memberMap.has(memberId))) throw new Error('Un profil ciblé n’appartient pas à cet espace famille.');
    if (normalized.audience === 'selected' && normalized.memberIds.length === 0) throw new Error('Sélectionnez au moins un profil familial.');
    const targetMembers = normalized.audience === 'selected' ? normalized.memberIds.map(memberId => memberMap.get(memberId)!).filter(Boolean) : familyMembers;
    const minorMembers = targetMembers.filter(member => isMinorAgeBand(member.ageBand));
    if (normalized.status === 'active' && minorMembers.some(member => member.consentStatus !== 'granted')) throw new Error('Le consentement parental est requis avant d’activer un plan impliquant un mineur.');

    if (normalized.productIds.length > 0) {
      const products = await this.getProducts({ publishedOnly: true });
      for (const productId of normalized.productIds) {
        const product = products.find(item => item.id === productId || item.slug === productId);
        if (!product) throw new Error(`Produit non publié ou indisponible : ${productId}.`);
        if (minorMembers.some(member => !isProductSuitableForAgeBand(product, member.ageBand))) {
          throw new Error(`Le produit « ${product.name} » n’est pas documenté comme adapté à tous les profils mineurs ciblés.`);
        }
      }
    }
    const existing = input?.id ? dashboard.plans.find(plan => plan.id === input.id && plan.familyId === familyId) : undefined;
    if (input?.id && !existing) throw new Error('Plan familial introuvable.');
    const now = new Date().toISOString();
    const id = existing?.id || (isUuid(input?.id) ? input.id : randomUUID());
    const row = {
      id, familyId, createdBy: userId, title: normalized.title, planType: normalized.planType,
      audience: normalized.audience, memberIds: normalized.memberIds, productIds: normalized.productIds,
      schedule: normalized.schedule, notes: normalized.notes, status: normalized.status,
      createdAt: existing?.createdAt || now, updatedAt: now
    };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('family_plans').upsert({
        id, family_id: familyId, created_by: userId, title: row.title, plan_type: row.planType,
        audience: row.audience, member_ids: row.memberIds, product_ids: row.productIds,
        schedule: row.schedule, notes: row.notes || null, status: row.status,
        created_at: row.createdAt, updated_at: now
      }, { onConflict: 'id' }).select('*').single();
      ensureDatabaseSuccess('enregistrement du plan familial', error);
      return this.mapFamilyPlanRow(data);
    }
    this.inMemoryFamilyPlans.set(id, row);
    return row;
  }

  public async deleteFamilyPlan(userId: string, planId: string): Promise<void> {
    const dashboard = await this.getFamilyDashboard(userId);
    const plan = dashboard.plans.find(item => item.id === planId);
    if (!plan) throw new Error('Plan familial introuvable.');
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('family_plans').delete().eq('id', planId);
      ensureDatabaseSuccess('suppression du plan familial', error);
    }
    this.inMemoryFamilyPlans.delete(planId);
  }

  public async getFamilyProducts(ageBand?: string, audience?: string): Promise<any[]> {
    const products = await this.getProducts({ publishedOnly: true });
    return products.filter(product => {
      if (ageBand && isMinorAgeBand(ageBand) && !isProductSuitableForAgeBand(product, ageBand)) return false;
      if (audience === 'men') {
        const audiences = [...(product.targetAudiences || []), ...(product.audienceTags || [])];
        return audiences.includes('hommes') || product.category === 'hommes' || product.subCategoryTag === 'barbe';
      }
      return true;
    }).map(toPublicProduct);
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
  private mapSupportTicketRow(row: any): SupportTicket {
    return {
      id: row.id,
      userId: row.user_id,
      orderId: row.order_id || undefined,
      subjectCategory: row.subject_category,
      subject: row.subject,
      priority: row.priority || 'normal',
      status: row.status,
      assignedAgentId: row.assigned_agent_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapSupportMessageRow(row: any): SupportMessage {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      senderId: row.sender_id || undefined,
      senderRole: row.sender_role,
      message: row.message,
      createdAt: row.created_at
    };
  }

  private async recordSupportEvent(input: Omit<SupportTicketEvent, 'id' | 'createdAt'>): Promise<SupportTicketEvent> {
    const event: SupportTicketEvent = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('support_ticket_events').insert({
        id: event.id,
        ticket_id: event.ticketId,
        actor_id: event.actorId || null,
        event_type: event.eventType,
        old_value: event.oldValue || null,
        new_value: event.newValue || null,
        description: event.description || null,
        created_at: event.createdAt
      });
      ensureDatabaseSuccess('journalisation de l’événement support', error);
    }
    this.inMemorySupportEvents.push(event);
    return event;
  }

  public async getSupportTicketEvents(ticketId: string): Promise<SupportTicketEvent[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_ticket_events').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture de l’historique du ticket support', error);
      return (data || []).map((row: any) => ({
        id: row.id,
        ticketId: row.ticket_id,
        actorId: row.actor_id || undefined,
        eventType: row.event_type,
        oldValue: row.old_value || undefined,
        newValue: row.new_value || undefined,
        description: row.description || undefined,
        createdAt: row.created_at
      }));
    }
    return this.inMemorySupportEvents.filter(event => event.ticketId === ticketId);
  }

  public async createSupportTicket(
    userId: string,
    orderId: string | undefined,
    category: SupportTicket['subjectCategory'],
    subject: string,
    message: string,
    priority: SupportTicket['priority'] = 'normal'
  ): Promise<SupportTicket> {
    const allowedCategories: SupportTicket['subjectCategory'][] = ['paiement', 'commande', 'livraison', 'retour', 'remboursement', 'produit', 'compte', 'conseil_ia', 'autre'];
    if (!allowedCategories.includes(category)) throw new Error('Catégorie de ticket invalide.');
    if (!subject.trim() || !message.trim()) throw new Error('Sujet et message obligatoires.');
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) throw new Error('Priorité de ticket invalide.');
    if (orderId) {
      const linkedOrder = await this.getOrderById(orderId);
      if (!linkedOrder || linkedOrder.userId !== userId) throw new Error('Commande liée introuvable pour ce client.');
    }
    const ticketId = randomUUID();
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId,
      orderId,
      subjectCategory: category,
      subject: subject.trim(),
      priority,
      status: 'open',
      createdAt: now,
      updatedAt: now
    };

    const firstMsg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId: userId,
      senderRole: 'customer',
      message: message.trim(),
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
          subject: ticket.subject,
          priority,
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
          message: firstMsg.message,
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
    await this.recordSupportEvent({
      ticketId,
      actorId: userId,
      eventType: 'created',
      newValue: 'open',
      description: `Ticket créé avec la priorité ${priority}.`
    });
    await this.recordSupportEvent({
      ticketId,
      actorId: userId,
      eventType: 'message_added',
      description: 'Premier message du ticket ajouté.'
    });
    return ticket;
  }

  private async getSupportTicketById(ticketId: string): Promise<SupportTicket | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).maybeSingle();
      ensureDatabaseSuccess('lecture du ticket support', error);
      return data ? this.mapSupportTicketRow(data) : undefined;
    }
    return this.inMemoryTickets.find(ticket => ticket.id === ticketId);
  }

  public async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture des tickets utilisateur', error);
      return (data || []).map((row: any) => this.mapSupportTicketRow(row));
    }
    return this.inMemoryTickets.filter(ticket => ticket.userId === userId);
  }

  public async getAllSupportTickets(): Promise<SupportTicket[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture de tous les tickets support', error);
      return (data || []).map((row: any) => this.mapSupportTicketRow(row));
    }
    return [...this.inMemoryTickets];
  }

  public async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture des messages support', error);
      return (data || []).map((row: any) => this.mapSupportMessageRow(row));
    }
    return this.inMemoryMessages.filter(message => message.ticketId === ticketId);
  }

  public async addSupportMessage(ticketId: string, senderId: string, senderRole: 'customer' | 'admin' | 'agent', message: string): Promise<SupportMessage> {
    const cleanMessage = message.trim();
    if (!cleanMessage) throw new Error('Message vide.');
    const now = new Date().toISOString();
    const ticket = await this.getSupportTicketById(ticketId);
    if (!ticket) throw new Error('Ticket support introuvable.');
    const msg: SupportMessage = {
      id: randomUUID(),
      ticketId,
      senderId,
      senderRole,
      message: cleanMessage,
      createdAt: now
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error: messageError } = await supabase.from('support_messages').insert({
        id: msg.id,
        ticket_id: ticketId,
        sender_id: senderId,
        sender_role: senderRole,
        message: cleanMessage,
        created_at: now
      });
      ensureDatabaseSuccess('création du message support', messageError);

      const updatePayload: Record<string, unknown> = { updated_at: now };
      if (senderRole === 'admin' || senderRole === 'agent') updatePayload.status = 'in_progress';
      const { error: ticketError } = await supabase.from('support_tickets').update(updatePayload).eq('id', ticketId);
      ensureDatabaseSuccess('mise à jour du ticket support', ticketError);
    }

    this.inMemoryMessages.push(msg);
    const memoryTicket = this.inMemoryTickets.find(item => item.id === ticketId);
    if (memoryTicket) {
      memoryTicket.updatedAt = now;
      if (senderRole === 'admin' || senderRole === 'agent') memoryTicket.status = 'in_progress';
    }
    await this.recordSupportEvent({
      ticketId,
      actorId: senderId,
      eventType: 'message_added',
      description: `Message ajouté par le rôle ${senderRole}.`
    });
    if ((senderRole === 'admin' || senderRole === 'agent')) {
      const supportOrder = ticket.orderId ? await this.getOrderById(ticket.orderId) : undefined;
      const recipientEmail = supportOrder?.customerEmail || await this.getEmailForUser(ticket.userId);
      await this.notifyUser(
        ticket.userId,
        'support_reply',
        `Réponse à votre ticket support #${ticket.id}`,
        `Un conseiller a répondu à votre sujet « ${ticket.subject} » : ${cleanMessage.substring(0, 80)}${cleanMessage.length > 80 ? '…' : ''}`,
        `/account?tab=support`,
        ticket.orderId,
        recipientEmail ? {
          to: recipientEmail,
          subject: `[KURLA BEAUTY] Réponse à votre ticket #${ticket.id}`,
          template: 'support_reply',
          data: { ticketId: ticket.id, subject: ticket.subject, message: cleanMessage }
        } : undefined,
        `support-reply:${msg.id}`
      );
    }
    return msg;
  }

  private sanitizeSupportFileName(fileName: string): string {
    return fileName.normalize('NFKC').replace(/[\\/\0\r\n]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'piece-jointe';
  }

  public async addSupportAttachment(
    ticketId: string,
    uploadedBy: string,
    buffer: Uint8Array,
    mimeType: SupportAttachment['mimeType'],
    fileName: string,
    messageId?: string
  ): Promise<SupportAttachment> {
    const ticket = await this.getSupportTicketById(ticketId);
    if (!ticket) throw new Error('Ticket support introuvable.');
    if (messageId && !(await this.getSupportMessages(ticketId)).some(message => message.id === messageId)) {
      throw new Error('Message support lié introuvable.');
    }
    const allowedMimeTypes: SupportAttachment['mimeType'][] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType)) throw new Error('Format de pièce jointe non pris en charge.');
    if (!buffer.byteLength || buffer.byteLength > 5 * 1024 * 1024) throw new Error('Pièce jointe vide ou trop volumineuse (5 Mo maximum).');
    const id = randomUUID();
    const storagePath = `${ticketId}/${id}-${this.sanitizeSupportFileName(fileName)}`;
    const now = new Date().toISOString();
    const attachment: SupportAttachment = {
      id,
      ticketId,
      messageId,
      uploadedBy,
      fileName: this.sanitizeSupportFileName(fileName),
      mimeType,
      sizeBytes: buffer.byteLength,
      storagePath,
      createdAt: now
    };
    const supabase = getSupabaseServerClient();
    try {
      if (supabase) {
        const { error: uploadError } = await supabase.storage.from('support-attachments').upload(storagePath, buffer as any, { contentType: mimeType, upsert: false });
        ensureDatabaseSuccess('stockage de la pièce jointe support', uploadError);
        const { error } = await supabase.from('support_attachments').insert({
          id,
          ticket_id: ticketId,
          message_id: messageId || null,
          uploaded_by: uploadedBy,
          file_name: attachment.fileName,
          mime_type: mimeType,
          size_bytes: attachment.sizeBytes,
          storage_path: storagePath,
          created_at: now
        });
        ensureDatabaseSuccess('enregistrement de la pièce jointe support', error);
      }
    } catch (error) {
      if (supabase) await supabase.storage.from('support-attachments').remove([storagePath]);
      throw error;
    }
    this.inMemorySupportAttachments.unshift(attachment);
    this.inMemorySupportAttachmentBytes.set(storagePath, new Uint8Array(buffer));
    await this.recordSupportEvent({
      ticketId,
      actorId: uploadedBy,
      eventType: 'attachment_added',
      description: `Pièce jointe ajoutée : ${attachment.fileName}.`
    });
    return attachment;
  }

  public async getSupportAttachments(ticketId: string): Promise<Array<SupportAttachment & { signedUrl?: string }>> {
    const supabase = getSupabaseServerClient();
    let attachments: SupportAttachment[];
    if (supabase) {
      const { data, error } = await supabase.from('support_attachments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      ensureDatabaseSuccess('lecture des pièces jointes support', error);
      attachments = (data || []).map((row: any) => ({
        id: row.id,
        ticketId: row.ticket_id,
        messageId: row.message_id || undefined,
        uploadedBy: row.uploaded_by,
        fileName: row.file_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        storagePath: row.storage_path,
        createdAt: row.created_at
      }));
    } else {
      attachments = this.inMemorySupportAttachments.filter(attachment => attachment.ticketId === ticketId);
    }
    return Promise.all(attachments.map(async attachment => {
      if (!supabase) return attachment;
      const { data, error } = await supabase.storage.from('support-attachments').createSignedUrl(attachment.storagePath, 600);
      ensureDatabaseSuccess('génération de l’URL sécurisée de la pièce jointe', error);
      return { ...attachment, signedUrl: data?.signedUrl };
    }));
  }

  public async isSupportAgent(userId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      ensureDatabaseSuccess('vérification de l’agent support', error);
      return !!data && ['support', 'admin', 'superadmin'].includes(data.role);
    }
    return true;
  }

  public async updateSupportTicketStatus(ticketId: string, status: SupportTicket['status'], actorId?: string): Promise<void> {
    const updatedAt = new Date().toISOString();
    const current = await this.getSupportTicketById(ticketId);
    if (!current) throw new Error('Ticket support introuvable.');
    if (current.status === status) return;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').update({ status, updated_at: updatedAt }).eq('id', ticketId).select('id').maybeSingle();
      ensureDatabaseSuccess('mise à jour du statut du ticket support', error);
      if (!data) throw new Error('Ticket support introuvable.');
    }
    const ticket = this.inMemoryTickets.find(item => item.id === ticketId);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = updatedAt;
    }
    await this.recordSupportEvent({ ticketId, actorId, eventType: 'status_changed', oldValue: current.status, newValue: status, description: `Statut support : ${status}.` });
  }

  public async updateSupportTicketPriority(ticketId: string, priority: SupportTicket['priority'], actorId?: string): Promise<SupportTicket | undefined> {
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) throw new Error('Priorité de ticket invalide.');
    const current = await this.getSupportTicketById(ticketId);
    if (!current) return undefined;
    if (current.priority === priority) return current;
    const updatedAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').update({ priority, updated_at: updatedAt }).eq('id', ticketId).select('*').maybeSingle();
      ensureDatabaseSuccess('mise à jour de la priorité du ticket support', error);
      if (!data) return undefined;
    }
    const updated: SupportTicket = { ...current, priority, updatedAt };
    const index = this.inMemoryTickets.findIndex(item => item.id === ticketId);
    if (index >= 0) this.inMemoryTickets[index] = updated;
    await this.recordSupportEvent({ ticketId, actorId, eventType: 'priority_changed', oldValue: current.priority, newValue: priority, description: `Priorité support : ${priority}.` });
    return updated;
  }

  public async assignSupportTicket(ticketId: string, assignedAgentId: string | undefined, actorId?: string): Promise<SupportTicket | undefined> {
    const current = await this.getSupportTicketById(ticketId);
    if (!current) return undefined;
    const nextAgentId = assignedAgentId?.trim() || undefined;
    if (current.assignedAgentId === nextAgentId) return current;
    const updatedAt = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('support_tickets').update({ assigned_agent_id: nextAgentId || null, updated_at: updatedAt }).eq('id', ticketId).select('*').maybeSingle();
      ensureDatabaseSuccess('affectation du ticket support', error);
      if (!data) return undefined;
    }
    const updated: SupportTicket = { ...current, assignedAgentId: nextAgentId, updatedAt };
    const index = this.inMemoryTickets.findIndex(item => item.id === ticketId);
    if (index >= 0) this.inMemoryTickets[index] = updated;
    await this.recordSupportEvent({ ticketId, actorId, eventType: 'assignment_changed', oldValue: current.assignedAgentId, newValue: nextAgentId, description: nextAgentId ? `Ticket affecté à ${nextAgentId}.` : 'Affectation retirée.' });
    return updated;
  }

  // ============================================================
  // ADMIN DASHBOARD: DAILY OPERATIONS, CONTENT AND AUDIT
  // ============================================================
  private async writeAdminAudit(adminId: string, action: string, details: Record<string, unknown>): Promise<void> {
    const entry = { id: randomUUID(), action, userId: adminId, details, createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('audit_logs').insert({
        id: entry.id,
        action,
        user_id: adminId,
        details,
        created_at: entry.createdAt
      });
      ensureDatabaseSuccess(`journalisation de l’action admin « ${action} »`, error);
    }
    this.inMemoryAdminAuditLogs.unshift(entry);
  }

  public async recordAdminAudit(adminId: string, action: string, details: Record<string, unknown>): Promise<void> {
    await this.writeAdminAudit(adminId, action, details);
  }

  public async getActiveAiKnowledgeSources(): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('ai_knowledge_sources').select('*').eq('active', true).eq('validation_status', 'validated').order('updated_at', { ascending: false });
      ensureDatabaseSuccess('lecture des sources IA actives', error);
      return (data || []).map(row => this.mapAiSource(row));
    }
    return this.inMemoryAdminSources.filter(source => source.active && source.validationStatus === 'validated');
  }

  private mapPublicArticle(row: any): any {
    const contentType = row.content_type || row.contentType || 'article';
    const topic = row.topic;
    const language = row.language;
    const sources = row.sources;
    const translations = row.translations;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      contentType,
      topic: topic || undefined,
      language: language || undefined,
      excerpt: row.excerpt || '',
      readTime: row.read_time || row.readTime || '',
      author: row.author || '',
      imageUrl: row.image_url || row.imageUrl || '',
      content: row.content || '',
      mediaUrl: row.media_url || row.mediaUrl || undefined,
      duration: row.duration || undefined,
      sources: Array.isArray(sources) ? sources : [],
      evidenceLevel: row.evidence_level || row.evidenceLevel || 'not_provided',
      medicalWarning: row.medical_warning || row.medicalWarning || undefined,
      translations: translations && typeof translations === 'object' && !Array.isArray(translations) ? translations : {},
      faq: Array.isArray(row.faq) ? row.faq : [],
      relatedProductIds: Array.isArray(row.related_product_ids) ? row.related_product_ids : (Array.isArray(row.relatedProductIds) ? row.relatedProductIds : []),
      publishedAt: row.published_at || row.publishedAt || row.created_at || row.createdAt,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt
    };
  }

  private isPublicEducationalContent(content: any): boolean {
    const evidenceLevel = content.evidence_level || content.evidenceLevel;
    const contentType = content.content_type || content.contentType || 'article';
    const translations = content.translations;
    const mediaUrl = content.media_url || content.mediaUrl;
    return content.status === 'published'
      && typeof content.author === 'string' && content.author.trim() !== ''
      && typeof content.language === 'string' && content.language.trim() !== ''
      && typeof content.topic === 'string' && content.topic.trim() !== ''
      && typeof content.content === 'string' && content.content.trim() !== ''
      && Array.isArray(content.sources) && content.sources.length > 0
      && evidenceLevel !== 'not_provided'
      && (contentType !== 'video' || (typeof mediaUrl === 'string' && mediaUrl.trim() !== ''))
      && translations && typeof translations === 'object' && !Array.isArray(translations)
      && Object.keys(translations).length > 0;
  }

  public async getPublishedArticles(): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return this.inMemoryAdminArticles
      .filter(content => this.isPublicEducationalContent(content))
      .sort((a, b) => String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || '')))
      .map(content => this.mapPublicArticle(content));
    const { data, error } = await supabase.from('content_articles').select('id, slug, title, category, content_type, topic, language, excerpt, read_time, author, image_url, content, media_url, duration, sources, evidence_level, medical_warning, translations, faq, related_product_ids, published_at, created_at, updated_at').eq('status', 'published').order('published_at', { ascending: false }).order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des contenus éducatifs publiés', error);
    return (data || []).filter(row => this.isPublicEducationalContent(row)).map(row => this.mapPublicArticle(row));
  }

  public async getPublishedArticle(slug: string): Promise<any | undefined> {
    const articles = await this.getPublishedArticles();
    return articles.find(article => article.slug === slug);
  }

  private mapAdminArticle(row: any): any {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      contentType: row.content_type || 'article',
      topic: row.topic || undefined,
      language: row.language || undefined,
      excerpt: row.excerpt || '',
      readTime: row.read_time || '',
      author: row.author || '',
      imageUrl: row.image_url || '',
      content: row.content || '',
      mediaUrl: row.media_url || undefined,
      duration: row.duration || undefined,
      sources: Array.isArray(row.sources) ? row.sources : [],
      evidenceLevel: row.evidence_level || 'not_provided',
      medicalWarning: row.medical_warning || undefined,
      translations: row.translations && typeof row.translations === 'object' && !Array.isArray(row.translations) ? row.translations : {},
      faq: Array.isArray(row.faq) ? row.faq : [],
      relatedProductIds: Array.isArray(row.related_product_ids) ? row.related_product_ids : [],
      status: row.status,
      publishedAt: row.published_at || undefined,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapAiSource(row: any): any {
    return {
      id: row.id,
      title: row.title,
      domains: Array.isArray(row.domains) ? row.domains : [],
      content: row.content || '',
      sourceLabel: row.source_label,
      validationStatus: row.validation_status,
      active: row.active === true,
      evidenceUrl: row.evidence_url || '',
      lastReviewedAt: row.last_reviewed_at || undefined,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapCoupon(row: any): any {
    return {
      code: row.code,
      description: row.description || '',
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      currency: row.currency,
      minimumOrderAmount: Number(row.minimum_order_amount || 0),
      startsAt: row.starts_at || undefined,
      endsAt: row.ends_at || undefined,
      maxUses: row.max_uses == null ? undefined : Number(row.max_uses),
      usedCount: Number(row.used_count || 0),
      active: row.active === true,
      createdBy: row.created_by || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /** Admin-only read model. It intentionally lives behind the server auth
   * boundary: raw operational rows are never included in public catalog APIs. */
  public async getAdminDashboardData(): Promise<any> {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return {
        brands: [...this.inMemoryAdminBrands],
        categories: [...this.inMemoryAdminCategories],
        products: await this.getAdminCatalogProducts(),
        variants: [],
        images: [],
        inventory: [],
        orders: [...this.inMemoryOrders],
        payments: [],
        refunds: [...this.inMemoryRefunds],
        shipments: Array.from(this.inMemoryShipments.values()),
        returns: [...this.inMemoryReturns],
        users: [],
        professionals: [...this.inMemoryProfessionalApplications],
        articles: [...this.inMemoryAdminArticles],
        aiSources: [...this.inMemoryAdminSources],
        reviews: [...this.inMemoryProductReviews],
        notifications: [...this.inMemoryNotifications],
        coupons: [...this.inMemoryAdminCoupons],
        roles: [],
        logs: [...this.inMemoryAdminAuditLogs]
      };
    }

    const [brands, categories, variants, images, inventory, orders, payments, refunds, shipments, returns, users, professionals, articles, aiSources, reviews, notifications, coupons, logs] = await Promise.all([
      supabase.from('brands').select('*').order('name').limit(500),
      supabase.from('categories').select('*').order('name').limit(500),
      supabase.from('product_variants').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('product_images').select('*').order('position').limit(1000),
      supabase.from('inventory').select('*').order('updated_at', { ascending: false }).limit(1000),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('refunds').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('shipments').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('returns').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('id, email, full_name, phone, role, avatar_url, created_at, updated_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('professional_applications').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('content_articles').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('ai_knowledge_sources').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('coupons').select('*').order('updated_at', { ascending: false }).limit(500),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)
    ]);

    const reads: Array<[string, { error?: { message?: string } | null }]> = [
      ['brands', brands], ['categories', categories], ['variantes', variants], ['images', images], ['inventaire', inventory],
      ['commandes', orders], ['paiements', payments], ['remboursements', refunds], ['expéditions', shipments], ['retours', returns],
      ['utilisateurs', users], ['professionnels', professionals], ['articles', articles], ['sources IA', aiSources], ['avis', reviews],
      ['notifications', notifications], ['coupons', coupons], ['logs d’audit', logs]
    ];
    reads.forEach(([label, result]) => ensureDatabaseSuccess(`lecture admin ${label}`, result.error));

    const mapOrder = (row: any): ServerOrder => ({
      id: row.id,
      userId: row.user_id || undefined,
      customerEmail: row.customer_email,
      items: Array.isArray(row.items) ? row.items : [],
      total: Number(row.total || 0),
      status: row.status,
      stripeSessionId: row.stripe_session_id || undefined,
      stripePaymentIntentId: row.stripe_payment_intent_id || undefined,
      checkoutIdempotencyKey: row.checkout_idempotency_key || undefined,
      shippingAddress: row.shipping_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
    const mapRefund = (row: any) => mapRefundRow(row);
    const mapShipment = (row: any) => ({
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id || undefined,
      carrier: row.carrier,
      method: row.method,
      price: Number(row.price || 0),
      tariff: row.tariff == null ? Number(row.price || 0) : Number(row.tariff),
      address: row.delivery_address || undefined,
      country: row.country || row.delivery_address?.country || undefined,
      trackingNumber: row.tracking_number || undefined,
      trackingUrl: row.tracking_url || undefined,
      status: row.status,
      shippedAt: row.shipped_at || undefined,
      estimatedDelivery: row.estimated_delivery || undefined,
      deliveredAt: row.delivered_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
    const mapReturn = (row: any) => ({
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      reason: row.reason,
      items: Array.isArray(row.items) ? row.items : [],
      quantity: Number(row.quantity || 0),
      status: row.status,
      comment: row.comment || undefined,
      adminComment: row.admin_comment || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
    const mapNotification = (row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link || undefined,
      orderId: row.order_id || undefined,
      dedupeKey: row.dedupe_key || undefined,
      read: row.read === true,
      createdAt: row.created_at,
      deliveredAt: row.delivered_at || undefined,
      errorMessage: row.error_message || undefined
    });

    return {
      brands: brands.data || [],
      categories: categories.data || [],
      products: await this.getAdminCatalogProducts(),
      variants: variants.data || [],
      images: images.data || [],
      inventory: inventory.data || [],
      orders: (orders.data || []).map(mapOrder),
      payments: payments.data || [],
      refunds: (refunds.data || []).map(mapRefund),
      shipments: (shipments.data || []).map(mapShipment),
      returns: (returns.data || []).map(mapReturn),
      users: users.data || [],
      professionals: professionals.data || [],
      articles: (articles.data || []).map(row => this.mapAdminArticle(row)),
      aiSources: (aiSources.data || []).map(row => this.mapAiSource(row)),
      reviews: reviews.data || [],
      notifications: (notifications.data || []).map(mapNotification),
      coupons: (coupons.data || []).map(row => this.mapCoupon(row)),
      roles: ['customer', 'professional', 'support', 'editor', 'admin', 'superadmin'].map(role => ({ role })),
      logs: logs.data || []
    };
  }

  public async saveAdminEntity(adminId: string, entity: 'brand' | 'category' | 'article' | 'content' | 'ai_source' | 'coupon', input: any): Promise<any> {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    let saved: any;
    if (entity === 'brand') {
      const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 180) : '';
      if (!name) throw new Error('Le nom de la marque est obligatoire.');
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const payload = { id, name, logo_url: typeof input.logoUrl === 'string' ? input.logoUrl.trim().slice(0, 2000) || null : null, description: typeof input.description === 'string' ? input.description.trim().slice(0, 4000) || null : null, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('brands').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement de la marque', error); saved = data; }
      else { saved = { ...payload, created_at: now }; this.inMemoryAdminBrands = [saved, ...this.inMemoryAdminBrands.filter(brand => brand.id !== id)]; }
    } else if (entity === 'category') {
      const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 180) : '';
      const slug = typeof input?.slug === 'string' ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 160) : '';
      if (!name || !slug) throw new Error('Le nom et le slug de la catégorie sont obligatoires.');
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const payload = { id, slug, name, description: typeof input.description === 'string' ? input.description.trim().slice(0, 4000) || null : null, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement de la catégorie', error); saved = data; }
      else { saved = { ...payload, created_at: now }; this.inMemoryAdminCategories = [saved, ...this.inMemoryAdminCategories.filter(category => category.id !== id)]; }
    } else if (entity === 'article' || entity === 'content') {
      const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 240) : '';
      const slug = typeof input?.slug === 'string' ? input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 180) : '';
      const content = typeof input?.content === 'string' ? input.content.trim().slice(0, 100000) : '';
      const author = typeof input?.author === 'string' ? input.author.trim().slice(0, 160) : '';
      const language = typeof input?.language === 'string' ? input.language.trim().toLowerCase().slice(0, 20) : '';
      const contentType = typeof input?.contentType === 'string' ? input.contentType.trim() : 'article';
      const topic = typeof input?.topic === 'string' ? input.topic.trim() : '';
      const evidenceLevel = typeof input?.evidenceLevel === 'string' ? input.evidenceLevel.trim() : 'not_provided';
      if (!title || !slug || !content) throw new Error('Le titre, le slug et le contenu sont obligatoires.');
      if (language && !/^[a-z]{2}(?:-[a-z]{2})?$/.test(language)) throw new Error('La langue principale doit être au format ISO simple (ex. fr ou en).');
      if (!(EDUCATIONAL_CONTENT_TYPES as readonly string[]).includes(contentType)) throw new Error('Type de contenu éducatif invalide.');
      if (topic && !(EDUCATIONAL_TOPICS as readonly string[]).includes(topic)) throw new Error('Thématique éducative invalide.');
      if (!(EVIDENCE_LEVELS as readonly string[]).includes(evidenceLevel)) throw new Error('Niveau de preuve invalide.');
      const sources: EducationalContentSource[] = normalizeContentSources(input?.sources);
      const translations = normalizeContentTranslations(input?.translations);
      const mediaUrl = typeof input?.mediaUrl === 'string' ? input.mediaUrl.trim().slice(0, 2000) : '';
      if (mediaUrl && !/^https?:\/\/[^\s]+$/i.test(mediaUrl)) throw new Error('L’URL du média est invalide.');
      const status = ['draft', 'published', 'archived'].includes(input.status) ? input.status : 'draft';
      if (status === 'published') {
        if (!author) throw new Error('L’auteur est obligatoire avant publication.');
        if (!language) throw new Error('La langue principale est obligatoire avant publication.');
        if (!topic) throw new Error('La thématique est obligatoire avant publication.');
        if (!sources.length) throw new Error('Une publication doit comporter au moins une source.');
        if (evidenceLevel === 'not_provided') throw new Error('Un niveau de preuve doit être renseigné avant publication.');
        if (!Object.keys(translations).length) throw new Error('Ajoutez au moins une traduction avant publication.');
        if (contentType === 'video' && !mediaUrl) throw new Error('Une vidéo publiée doit comporter une URL média.');
      }
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const payload = {
        id,
        slug,
        title,
        category: typeof input.category === 'string' ? input.category.trim().slice(0, 100) || topic || 'non-classe' : topic || 'non-classe',
        content_type: contentType,
        topic: topic || null,
        language: language || null,
        excerpt: typeof input.excerpt === 'string' ? input.excerpt.trim().slice(0, 1000) || null : null,
        read_time: typeof input.readTime === 'string' ? input.readTime.trim().slice(0, 80) || null : null,
        author: author || null,
        image_url: typeof input.imageUrl === 'string' ? input.imageUrl.trim().slice(0, 2000) || null : null,
        content,
        media_url: mediaUrl || null,
        duration: typeof input.duration === 'string' ? input.duration.trim().slice(0, 80) || null : null,
        sources,
        evidence_level: evidenceLevel,
        medical_warning: typeof input.medicalWarning === 'string' ? input.medicalWarning.trim().slice(0, 2000) || null : null,
        translations,
        faq: Array.isArray(input.faq) ? input.faq.slice(0, 30) : [],
        related_product_ids: Array.isArray(input.relatedProductIds) ? input.relatedProductIds.filter((productId: unknown) => typeof productId === 'string').slice(0, 50) : [],
        status,
        published_at: status === 'published' ? (input.publishedAt || now) : null,
        created_by: adminId,
        updated_by: adminId,
        updated_at: now
      };
      if (supabase) { const { data, error } = await supabase.from('content_articles').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement du contenu éducatif', error); saved = this.mapAdminArticle(data); }
      else { saved = this.mapAdminArticle({ ...payload, created_at: now }); this.inMemoryAdminArticles = [saved, ...this.inMemoryAdminArticles.filter(article => article.id !== id)]; }
    } else if (entity === 'ai_source') {
      const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 240) : '';
      const content = typeof input?.content === 'string' ? input.content.trim().slice(0, 50000) : '';
      const sourceLabel = typeof input?.sourceLabel === 'string' ? input.sourceLabel.trim().slice(0, 240) : '';
      if (!title || !content || !sourceLabel) throw new Error('Le titre, le contenu et la source de la fiche IA sont obligatoires.');
      const id = isUuid(input?.id) ? input.id : randomUUID();
      const validationStatus = ['pending', 'validated', 'rejected'].includes(input.validationStatus) ? input.validationStatus : 'pending';
      const active = validationStatus === 'validated' && input.active === true;
      const payload = { id, title, domains: Array.isArray(input.domains) ? input.domains.filter((item: unknown) => typeof item === 'string').map((item: string) => item.trim().toLowerCase()).filter(Boolean).slice(0, 40) : [], content, source_label: sourceLabel, validation_status: validationStatus, active, evidence_url: typeof input.evidenceUrl === 'string' ? input.evidenceUrl.trim().slice(0, 2000) || null : null, last_reviewed_at: validationStatus === 'validated' ? now : null, created_by: adminId, updated_by: adminId, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('ai_knowledge_sources').upsert(payload, { onConflict: 'id' }).select('*').single(); ensureDatabaseSuccess('enregistrement de la source IA', error); saved = this.mapAiSource(data); }
      else { saved = this.mapAiSource({ ...payload, created_at: now }); this.inMemoryAdminSources = [saved, ...this.inMemoryAdminSources.filter(source => source.id !== id)]; }
    } else {
      const code = typeof input?.code === 'string' ? input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40) : '';
      const discountType = input.discountType === 'fixed_amount' ? 'fixed_amount' : 'percentage';
      const discountValue = Number(input.discountValue);
      if (!code || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100)) throw new Error('Code ou remise coupon invalide.');
      const payload = { code, description: typeof input.description === 'string' ? input.description.trim().slice(0, 500) || null : null, discount_type: discountType, discount_value: discountValue, currency: typeof input.currency === 'string' ? input.currency.toUpperCase().slice(0, 3) : 'EUR', minimum_order_amount: Math.max(0, Number(input.minimumOrderAmount || 0)), starts_at: input.startsAt || null, ends_at: input.endsAt || null, max_uses: input.maxUses == null || input.maxUses === '' ? null : Math.max(1, Math.floor(Number(input.maxUses))), active: input.active === true, updated_by: adminId, updated_at: now };
      if (supabase) { const { data, error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' }).select('*').single(); ensureDatabaseSuccess('enregistrement du coupon', error); saved = this.mapCoupon(data); }
      else { saved = this.mapCoupon({ ...payload, used_count: 0, created_at: now }); this.inMemoryAdminCoupons = [saved, ...this.inMemoryAdminCoupons.filter(coupon => coupon.code !== code)]; }
    }
    await this.writeAdminAudit(adminId, `admin_${entity}_save`, { entity, id: saved?.id || saved?.code, status: saved?.status, active: saved?.active });
    return saved;
  }

  public async updateAdminUserRole(adminId: string, targetUserId: string, role: string, adminRole: string): Promise<any | undefined> {
    if (!['customer', 'professional', 'support', 'editor', 'admin', 'superadmin'].includes(role)) throw new Error('Rôle invalide.');
    if (targetUserId === adminId) throw new Error('Un administrateur ne peut pas modifier son propre rôle.');
    if (role === 'superadmin' && adminRole !== 'superadmin') throw new Error('Seul un superadmin peut attribuer ce rôle.');
    const supabase = getSupabaseServerClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', targetUserId).select('id, email, full_name, phone, role, avatar_url, created_at, updated_at').maybeSingle();
    ensureDatabaseSuccess('mise à jour du rôle utilisateur', error);
    if (!data) return undefined;
    await this.writeAdminAudit(adminId, 'admin_user_role_update', { targetUserId, role });
    return data;
  }

  public async updateAdminReviewStatus(adminId: string, reviewId: string, status: string): Promise<any | undefined> {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new Error('Statut d’avis invalide.');
    const supabase = getSupabaseServerClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', reviewId).select('*').maybeSingle();
    ensureDatabaseSuccess('mise à jour du statut de l’avis', error);
    if (!data) return undefined;
    await this.writeAdminAudit(adminId, 'admin_review_status_update', { reviewId, status });
    return data;
  }

  public async updateAdminPaymentStatus(adminId: string, paymentId: string, status: string): Promise<any | undefined> {
    if (!['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'].includes(status)) throw new Error('Statut de paiement invalide.');
    const supabase = getSupabaseServerClient();
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('payments').update({ status, updated_at: new Date().toISOString() }).eq('id', paymentId).select('*').maybeSingle();
    ensureDatabaseSuccess('mise à jour du statut du paiement', error);
    if (!data) return undefined;
    await this.writeAdminAudit(adminId, 'admin_payment_status_update', { paymentId, status });
    return data;
  }

  public async recordCatalogSearch(query: string, resultCount: number, country?: string, userId?: string): Promise<void> {
    const normalizedQuery = query.trim().slice(0, 200);
    if (normalizedQuery.length < 2 || !Number.isSafeInteger(resultCount) || resultCount < 0) return;
    const event = { id: randomUUID(), query: normalizedQuery, resultCount, country, userId, createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('catalog_search_events').insert({ id: event.id, query: event.query, result_count: event.resultCount, country: event.country || null, user_id: event.userId || null, created_at: event.createdAt });
      ensureDatabaseSuccess('enregistrement de la recherche catalogue', error);
    } else this.inMemoryAdminSearchEvents.unshift(event);
  }

  public async recordAiUsage(requestType: string, succeeded: boolean, userId?: string): Promise<void> {
    const event = { id: randomUUID(), requestType: requestType.slice(0, 80), succeeded, userId, createdAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('ai_usage_events').insert({ id: event.id, request_type: event.requestType, succeeded, user_id: userId || null, created_at: event.createdAt });
      ensureDatabaseSuccess('enregistrement de l’utilisation IA', error);
    } else this.inMemoryAdminAiUsageEvents.unshift(event);
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
    let supaSearchEvents: Array<{ query: string; result_count: number }> = [];
    let supaAiUsageEvents: Array<{ user_id?: string | null; succeeded: boolean }> = [];
    let supaRefundCount = 0;

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

        const { count: tCount, error: ticketsError } = await supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']);
        ensureDatabaseSuccess('comptage des tickets ouverts pour les métriques', ticketsError);
        supaTicketsCount = tCount || 0;

        const { count: eCount, error: eventsError } = await supabase.from('stripe_events').select('*', { count: 'exact', head: true });
        ensureDatabaseSuccess('comptage des événements Stripe pour les métriques', eventsError);
        supaEventsCount = eCount || 0;

        const { data: searchData, error: searchError } = await supabase.from('catalog_search_events').select('query, result_count');
        ensureDatabaseSuccess('lecture des recherches catalogue pour les métriques', searchError);
        supaSearchEvents = searchData || [];

        const { data: aiUsageData, error: aiUsageError } = await supabase.from('ai_usage_events').select('user_id, succeeded');
        ensureDatabaseSuccess('lecture de l’utilisation IA pour les métriques', aiUsageError);
        supaAiUsageEvents = aiUsageData || [];

        const { count: refundCount, error: refundCountError } = await supabase.from('refunds').select('*', { count: 'exact', head: true }).in('status', ['succeeded', 'completed', 'pending']);
        ensureDatabaseSuccess('comptage des remboursements pour les métriques', refundCountError);
        supaRefundCount = refundCount || 0;
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

    // AOV is deliberately calculated from persisted paid orders, not from a
    // fixture. Refunds are shown separately and do not rewrite order history.
    const avgOrderValue = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;
    const searchEvents: any[] = supabase ? supaSearchEvents : this.inMemoryAdminSearchEvents;
    const zeroResultSearches = searchEvents.filter(event => Number(event.result_count ?? event.resultCount) === 0);
    const zeroResultByQuery = new Map<string, number>();
    zeroResultSearches.forEach(event => {
      const query = String(event.query).trim();
      zeroResultByQuery.set(query, (zeroResultByQuery.get(query) || 0) + 1);
    });
    const topZeroResultSearches = Array.from(zeroResultByQuery.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query))
      .slice(0, 10);
    const aiUsageEvents: any[] = supabase ? supaAiUsageEvents : this.inMemoryAdminAiUsageEvents;
    const activeAiUsers = new Set(aiUsageEvents.filter(event => event.succeeded && (event.user_id || event.userId)).map(event => event.user_id || event.userId));
    const aiUsageRate = supaProfilesCount > 0 ? (activeAiUsers.size / supaProfilesCount) * 100 : null;
    const popularProductCounts = new Map<string, number>();
    paidOrders.forEach(order => (order.items || []).forEach((item: any) => {
      const productId = item.productId || item.product_id;
      const quantity = Number(item.quantity || 0);
      if (productId && quantity > 0) popularProductCounts.set(productId, (popularProductCounts.get(productId) || 0) + quantity);
    }));
    const productById = new Map(products.map(product => [product.id, product]));
    const popularProducts = Array.from(popularProductCounts.entries())
      .map(([productId, quantity]) => ({ productId, name: productById.get(productId)?.name || 'Produit non renseigné', quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    const inMemoryRefundCount = this.inMemoryRefunds.filter(refund => ['succeeded', 'completed', 'pending'].includes(refund.status)).length;

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
      refundsCount: supabase ? supaRefundCount : inMemoryRefundCount,
      avgOrderValue,
      lowStockProducts,
      outOfStockProducts,
      popularProducts,
      searchesWithoutResultsCount: zeroResultSearches.length,
      topZeroResultSearches,
      aiUsageRate,
      aiUsageEventsCount: aiUsageEvents.length,
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
