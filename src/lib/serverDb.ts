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
import {
  effectiveCatalogPrice,
  emailTemplateForOrderStatus,
  ensureDatabaseSuccess,
  isPromotionActive,
  isPublishableProduct,
  isUuid,
  mapOrderVatFields,
  toPublicProduct,
} from './db/internal';

import type {
  AiAssistantMessage,
  AiAssistantSession,
  AiFeedbackRating,
  AiHumanReview,
  CustomerRefund,
  CustomerReturn,
  CustomerReturnEvent,
  LoyaltyAccountRecord,
  LoyaltyEventRecord,
  LoyaltyRedemptionRecord,  MarketplaceQuestion,
  MarketplaceReview,
  NotificationDeliveryLog,
  NotificationPreference,
  OrderStatus,
  OrderStatusHistoryEntry,
  ProductSubscription,
  BrandTestObservation,
  BrandTestParticipation,
  BrandTestRequest,
  CreatorApplication,
  MobileSyncAction,
  ProfessionalApplication,
  ProfessionalApplicationStatus,
  PublicProfessionalEntry,
  ServerOrder,
  ServerOrderItem,
  ShippingAddressRecord,
  ShippingRateRecord,
  StripeEventLog,
  SupportAttachment,
  SupportMessage,
  SupportTicket,
  SupportTicketEvent,
  UserNotification,
} from './db/types';

// Les types du store vivent dans ./db/types ; on les réexporte pour que tous les
// imports `from '../serverDb'` existants continuent de fonctionner.
export * from './db/types';
export { toPublicProduct };
import type { CreatorAttribution } from './creatorProgram';
import { bindDomain, Curried } from './db/bind';
import * as ingredientLinkStore from './db/ingredientLinkStore';
import * as beautyProfileStore from './db/beautyProfileStore';
import * as familyStore from './db/familyStore';
import * as notificationsStore from './db/notificationsStore';
import * as supportStore from './db/supportStore';
import * as adaptiveRoutineStore from './db/adaptiveRoutineStore';
import * as aiSessionStore from './db/aiSessionStore';
import * as professionalApplicationStore from './db/professionalApplicationStore';
import * as creatorStore from './db/creatorStore';
import * as brandTestStore from './db/brandTestStore';
import * as mobileStore from './db/mobileStore';
import * as shippingStore from './db/shippingStore';
import * as returnsStore from './db/returnsStore';
import * as adminStore from './db/adminStore';
import * as catalogStore from './db/catalogStore';
import * as contentStore from './db/contentStore';
import * as inventoryStore from './db/inventoryStore';
import * as orderStore from './db/orderStore';
import * as loyaltyStore from './db/loyaltyStore';
import * as journeyStore from './db/journeyStore';
import * as membershipStore from './db/membershipStore';
import * as textureGapStore from './db/textureGapStore';
import { mapRefundRow } from './db/refundSupport';
import type { MembershipEventRecord } from './db/membershipStore';
import type { MembershipRecord } from './membership';


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
  /** CHANTIER 10 (bloc B1) — référentiel d'ingrédients et liaisons produit × ingrédient. */
  public inMemoryIngredients: any[] = [];
  public inMemoryProductIngredients: import('./ingredientGraph').ProductIngredientLink[] = [];
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
  public inMemoryCreatorApplications: CreatorApplication[] = [];
  public inMemoryCreatorAttributions: Map<string, CreatorAttribution[]> = new Map();
  public inMemoryBrandTestRequests: BrandTestRequest[] = [];
  public inMemoryBrandTestParticipations: BrandTestParticipation[] = [];
  public inMemoryBrandTestObservations: BrandTestObservation[] = [];
  public inMemoryMobileSyncActions: MobileSyncAction[] = [];
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
  // CHANTIER 8.5 — adhésions KURLA+. Le repli mémoire applique les mêmes refus
  // que les RPC : un seul essai par compte, aucun abonnement payant sans
  // référence de paiement.
  public inMemoryMemberships: Map<string, MembershipRecord> = new Map();
  public inMemoryMembershipEvents: MembershipEventRecord[] = [];
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
  public getProducts!: Curried<typeof catalogStore>['getProducts'];
  public getProductById!: Curried<typeof catalogStore>['getProductById'];
  public getOrdersByCustomer!: Curried<typeof orderStore>['getOrdersByCustomer'];
  public getInventoryByProductId!: Curried<typeof inventoryStore>['getInventoryByProductId'];
  public getInventoryByVariantId!: Curried<typeof inventoryStore>['getInventoryByVariantId'];
  public syncInventoryToSupabase!: Curried<typeof inventoryStore>['syncInventoryToSupabase'];
  public syncVariantInventoryToSupabase!: Curried<typeof inventoryStore>['syncVariantInventoryToSupabase'];
  public getAdminCatalogProducts!: Curried<typeof catalogStore>['getAdminCatalogProducts'];
  public getOrderById!: Curried<typeof orderStore>['getOrderById'];
  public updateOrderStatus!: Curried<typeof orderStore>['updateOrderStatus'];
  public logOrderStatusHistory!: Curried<typeof orderStore>['logOrderStatusHistory'];
  public recordAdminAudit!: Curried<typeof adminStore>['recordAdminAudit'];
  public applyLoyaltyEvent!: Curried<typeof loyaltyStore>['applyLoyaltyEvent'];
  public getAdaptiveRoutineState!: Curried<typeof adaptiveRoutineStore>['getAdaptiveRoutineState'];
  public getBeautyProfilePhotos!: Curried<typeof beautyProfileStore>['getBeautyProfilePhotos'];
  public getBeautyProfileHistory!: Curried<typeof beautyProfileStore>['getBeautyProfileHistory'];
  public getLoyaltyEvents!: Curried<typeof loyaltyStore>['getLoyaltyEvents'];
  public getLoyaltyAccount!: Curried<typeof loyaltyStore>['getLoyaltyAccount'];

  public localStockOperation: Promise<void> = Promise.resolve();

  public async withLocalStockLock<T>(operation: () => Promise<T>): Promise<T> {
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

  public async reserveLocalStockUnlocked(items: ServerOrderItem[]): Promise<void> {
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
  // CHANTIER 8.3 — KURLA PROGRESSION (repli mémoire ; avec Supabase, la RPC
  // apply_loyalty_event est la seule source de vérité)
  public inMemoryLoyaltyAccounts: Map<string, LoyaltyAccountRecord> = new Map();
  public inMemoryLoyaltyEvents: LoyaltyEventRecord[] = [];
  public inMemoryLoyaltyRedemptions: LoyaltyRedemptionRecord[] = [];

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
bindDomain(storeInstance, creatorStore);
bindDomain(storeInstance, brandTestStore);
bindDomain(storeInstance, mobileStore);
bindDomain(storeInstance, shippingStore);
bindDomain(storeInstance, returnsStore);
bindDomain(storeInstance, adminStore);
bindDomain(storeInstance, catalogStore);
bindDomain(storeInstance, contentStore);
bindDomain(storeInstance, inventoryStore);
bindDomain(storeInstance, orderStore);
bindDomain(storeInstance, loyaltyStore);
bindDomain(storeInstance, journeyStore);
bindDomain(storeInstance, membershipStore);
bindDomain(storeInstance, textureGapStore);
bindDomain(storeInstance, ingredientLinkStore);

export const serverDb = storeInstance as SupabaseServerStore
  & Curried<typeof notificationsStore>
  & Curried<typeof beautyProfileStore>
  & Curried<typeof familyStore>
  & Curried<typeof supportStore>
  & Curried<typeof adaptiveRoutineStore>
  & Curried<typeof aiSessionStore>
  & Curried<typeof professionalApplicationStore>
  & Curried<typeof creatorStore>
  & Curried<typeof brandTestStore>
  & Curried<typeof mobileStore>
  & Curried<typeof shippingStore>
  & Curried<typeof returnsStore>
  & Curried<typeof adminStore>
  & Curried<typeof catalogStore>
  & Curried<typeof contentStore>
  & Curried<typeof inventoryStore>
  & Curried<typeof orderStore>
  & Curried<typeof loyaltyStore>
  & Curried<typeof journeyStore>
  & Curried<typeof membershipStore>
  & Curried<typeof textureGapStore>
  & Curried<typeof ingredientLinkStore>;
