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
import { ensureDatabaseSuccess, isUuid, mapOrderVatFields } from './db/internal';
import { bindDomain, Curried } from './db/bind';
import * as beautyProfileStore from './db/beautyProfileStore';
import * as familyStore from './db/familyStore';
import * as notificationsStore from './db/notificationsStore';
import * as supportStore from './db/supportStore';
import * as adaptiveRoutineStore from './db/adaptiveRoutineStore';
import * as aiSessionStore from './db/aiSessionStore';
import * as professionalApplicationStore from './db/professionalApplicationStore';
import * as shippingStore from './db/shippingStore';
import * as returnsStore from './db/returnsStore';
import * as adminStore from './db/adminStore';
import { mapRefundRow } from './db/refundSupport';

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
  /** CHANTIER 7.6 — devise d'encaissement. EUR uniquement, jamais converti. */
  currency?: string;
  /** Pays de taxation : le taux dû est celui de ce pays (principe de destination). */
  vatCountry?: string;
  /** Total hors taxe. */
  netAmount?: number;
  /** TVA totale due. */
  vatAmount?: number;
  /** Ventilation par taux : `[{ ratePercent, netCents, vatCents }]`. */
  vatBreakdown?: unknown;
  /** Numéro de TVA intracommunautaire du client (exonération seulement s'il est vérifié). */
  customerVatNumber?: string;
}

/**
 * Champs devise/TVA d'une ligne `orders`.
 *
 * Lecture tolérante : ces colonnes n'existent qu'à partir de la migration
 * `20260860000000_vat_and_currency.sql`. Avant son application, les champs sont
 * simplement absents — la TVA reste alors lisible dans l'instantané
 * `shipping_address.vat`, que le checkout écrit dans tous les cas.
 */

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

/**
 * Ce qui est publiable d'un professionnel. Ni email, ni téléphone, ni note
 * inventée : un annuaire n'affiche que ce qui a été vérifié.
 */
export interface PublicProfessionalEntry {
  id: string;
  name: string;
  city: string;
  profession: string;
  experience: string;
  portfolioUrl?: string;
  verified: boolean;
  approvedAt: string;
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

/**
 * Noyau du store : état de repli en mémoire, initialisation, verrou de stock.
 * Les méthodes métier vivent dans `src/lib/db/*` et sont composées sur
 * l'instance en bas de ce fichier.
 *
 * Les champs `inMemory*` sont publics parce que les modules de domaine les
 * lisent : ce sont des détails internes au singleton, pas une API — rien, hors
 * de `src/lib/db/`, ne doit y toucher.
 */
export class SupabaseServerStore {
  public inMemoryProducts: any[] = [];
  public inMemoryOrders: ServerOrder[] = [];
  public inMemoryCarts: Map<string, any[]> = new Map();
  public inMemoryInventory: Map<string, { quantity: number; reserved_quantity: number; available_quantity?: number }> = new Map();
  public inMemoryStripeEvents: StripeEventLog[] = [];
  public inMemoryStatusHistory: OrderStatusHistoryEntry[] = [];
  public inMemoryNotifications: UserNotification[] = [];
  public inMemoryNotificationLogs: NotificationDeliveryLog[] = [];
  public inMemoryPreferences: Map<string, NotificationPreference> = new Map();
  public inMemoryShipments: Map<string, ShipmentDetails> = new Map();
  public inMemoryShippingAddresses: Map<string, ShippingAddressRecord[]> = new Map();
  public inMemoryShippingRates: ShippingRateRecord[] = [];
  public inMemoryShippingEvents: ShipmentEvent[] = [];
  public inMemoryReturns: CustomerReturn[] = [];
  public inMemoryReturnEvents: CustomerReturnEvent[] = [];
  public inMemoryRefunds: CustomerRefund[] = [];
  public inMemoryTickets: SupportTicket[] = [];
  public inMemoryMessages: SupportMessage[] = [];
  public inMemorySupportEvents: SupportTicketEvent[] = [];
  public inMemorySupportAttachments: SupportAttachment[] = [];
  public inMemorySupportAttachmentBytes: Map<string, Uint8Array> = new Map();
  public inMemoryProfessionalApplications: ProfessionalApplication[] = [];
  public inMemoryProductReviews: MarketplaceReview[] = [];
  public inMemoryProductQuestions: MarketplaceQuestion[] = [];
  public inMemoryProductWaitlist: Array<{ id: string; productId: string; variantId?: string; userId?: string; email: string; country: string; status: 'waiting' | 'notified' | 'cancelled'; createdAt: string }> = [];
  public inMemoryProductSubscriptions: ProductSubscription[] = [];
  public inMemoryCatalogValidationEvents: Array<{ id: string; productId: string; checkType: string; status: string; evidenceUrl?: string; note?: string; createdAt: string }> = [];
  public inMemoryBeautyProfiles: Map<string, BeautyProfileRecord> = new Map();
  public inMemoryBeautyProfileHistory: Map<string, BeautyProfileHistoryEntry[]> = new Map();
  public inMemoryBeautyProfilePhotos: Map<string, BeautyProfilePhoto[]> = new Map();
  public inMemoryFamilySpaces: Map<string, any> = new Map();
  public inMemoryFamilyMembers: Map<string, any> = new Map();
  public inMemoryFamilyPlans: Map<string, any> = new Map();
  public inMemoryRoutinePlans: Map<string, AdaptiveRoutinePlan> = new Map();
  public inMemoryRoutineFeedback: Map<string, RoutineFeedback[]> = new Map();
  public inMemoryRoutineJournal: Map<string, RoutineJournalEntry[]> = new Map();
  public inMemoryAiSessions: Map<string, AiAssistantSession> = new Map();
  public inMemoryAiMessages: Map<string, AiAssistantMessage[]> = new Map();
  public inMemoryAiFeedback: Array<{ userId: string; sessionId?: string; messageId?: string; rating: AiFeedbackRating; comment?: string; createdAt: string }> = [];
  // ---------------------------------------------------------------------
  // Surface composée : ces méthodes vivent dans `src/lib/db/notificationsStore`
  // et sont recollées sur l'instance en bas de fichier. Déclarées ici (sans
  // corps) pour que le noyau — commandes, stock — puisse les appeler avec un
  // type juste. `tests/store_api_inventory.test.ts` vérifie qu'elles existent
  // vraiment à l'exécution.
  // ---------------------------------------------------------------------
  public notifyUser!: Curried<typeof notificationsStore>['notifyUser'];
  public notifyLowStock!: Curried<typeof notificationsStore>['notifyLowStock'];
  public notifyLowStockForOrder!: Curried<typeof notificationsStore>['notifyLowStockForOrder'];
  public sendTransactionalEmail!: Curried<typeof notificationsStore>['sendTransactionalEmail'];
  public getBeautyProfile!: Curried<typeof beautyProfileStore>['getBeautyProfile'];

  public localStockOperation: Promise<void> = Promise.resolve();

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
  public inMemoryAiHumanReviews: AiHumanReview[] = [];
  public inMemoryAdminAuditLogs: Array<{ id: string; action: string; userId?: string; details: Record<string, unknown>; createdAt: string }> = [];
  public inMemoryAdminBrands: any[] = [];
  public inMemoryAdminCategories: any[] = [];
  public inMemoryAdminArticles: any[] = [];
  public inMemoryAdminSources: any[] = [];
  public inMemoryAdminCoupons: any[] = [];
  public inMemoryAdminSearchEvents: Array<{ id: string; query: string; resultCount: number; country?: string; userId?: string; createdAt: string }> = [];
  public inMemoryAdminAiUsageEvents: Array<{ id: string; requestType: string; succeeded: boolean; userId?: string; createdAt: string }> = [];
  public processedEventsSet: Set<string> = new Set();
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
      const baseArgs = {
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
      };
      // Signature étendue (migration 20260860) : devise + ventilation de TVA
      // écrites dans la même transaction que la réservation de stock.
      const vatArgs = {
        p_currency: order.currency || 'EUR',
        p_vat_country: order.vatCountry || null,
        p_net_amount: order.netAmount ?? null,
        p_vat_amount: order.vatAmount ?? null,
        p_vat_breakdown: (order.vatBreakdown as any) ?? null,
        p_customer_vat_number: order.customerVatNumber || null
      };

      let data: any = null;
      let error: any = null;
      ({ data, error } = await supabase.rpc('create_order_with_stock_reservation', { ...baseArgs, ...vatArgs }));

      // 42883 / PGRST202 : la fonction étendue n'existe pas encore en base. On
      // retombe sur la signature historique au lieu de bloquer un paiement, mais
      // bruyamment : les colonnes de TVA ne seront pas remplies tant que la
      // migration n'est pas appliquée. La TVA reste dans l'instantané JSONB.
      const missingSignature = !!error && (error.code === '42883' || error.code === 'PGRST202');
      if (missingSignature) {
        console.error(
          '[serverDb] create_order_with_stock_reservation sans paramètres TVA : ' +
          'appliquez la migration 20260860000000_vat_and_currency.sql. ' +
          'La TVA de cette commande n’est stockée que dans shipping_address.vat.'
        );
        ({ data, error } = await supabase.rpc('create_order_with_stock_reservation', baseArgs));
      }
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
        updatedAt: row.updated_at || order.updatedAt,
        currency: row.currency ?? order.currency ?? 'EUR',
        vatCountry: row.vat_country ?? order.vatCountry,
        netAmount: row.net_amount != null ? Number(row.net_amount) : order.netAmount,
        vatAmount: row.vat_amount != null ? Number(row.vat_amount) : order.vatAmount,
        vatBreakdown: row.vat_breakdown ?? order.vatBreakdown,
        customerVatNumber: row.customer_vat_number ?? order.customerVatNumber
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
          updatedAt: data.updated_at,
          ...mapOrderVatFields(data)
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
          updatedAt: d.updated_at,
          ...mapOrderVatFields(d)
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
          updatedAt: data.updated_at,
          ...mapOrderVatFields(data)
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
        updatedAt: row.updated_at || order.updatedAt,
        currency: row.currency ?? order.currency ?? 'EUR',
        vatCountry: row.vat_country ?? order.vatCountry,
        netAmount: row.net_amount != null ? Number(row.net_amount) : order.netAmount,
        vatAmount: row.vat_amount != null ? Number(row.vat_amount) : order.vatAmount,
        vatBreakdown: row.vat_breakdown ?? order.vatBreakdown,
        customerVatNumber: row.customer_vat_number ?? order.customerVatNumber
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
  // KURLA ID BEAUTY PROFILES
  // ============================================================
  // ============================================================
  // AI ASSISTANT SESSIONS, FEEDBACK & HUMAN REVIEW
  // ============================================================
  // ============================================================
  // PHASE 5: CUSTOMER SUPPORT TICKETS
  // ============================================================
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

// ---------------------------------------------------------------------------
// CHANTIER 8.2 — composition du store
// ---------------------------------------------------------------------------
// Les méthodes métier vivent dans `src/lib/db/*`, une fichier par domaine. Elles
// sont recollées ici sur l'instance : les centaines d'appels `serverDb.methode()`
// disséminés dans le backend ne changent pas, et `Curried` retire au niveau du
// type le paramètre `store` qu'elles prennent en premier argument.
//
// Ajouter un domaine = ajouter un module, une ligne `bindDomain`, une ligne dans
// le type. `tests/store_api_inventory.test.ts` vérifie qu'aucune méthode n'a
// disparu au passage.
const storeInstance = new SupabaseServerStore();

bindDomain(storeInstance, notificationsStore);
bindDomain(storeInstance, beautyProfileStore);
bindDomain(storeInstance, familyStore);
bindDomain(storeInstance, supportStore);
bindDomain(storeInstance, adaptiveRoutineStore);
bindDomain(storeInstance, aiSessionStore);
bindDomain(storeInstance, professionalApplicationStore);
bindDomain(storeInstance, shippingStore);
bindDomain(storeInstance, returnsStore);
bindDomain(storeInstance, adminStore);

export const serverDb = storeInstance as SupabaseServerStore
  & Curried<typeof notificationsStore>
  & Curried<typeof beautyProfileStore>
  & Curried<typeof familyStore>
  & Curried<typeof supportStore>
  & Curried<typeof adaptiveRoutineStore>
  & Curried<typeof aiSessionStore>
  & Curried<typeof professionalApplicationStore>
  & Curried<typeof shippingStore>
  & Curried<typeof returnsStore>
  & Curried<typeof adminStore>;
