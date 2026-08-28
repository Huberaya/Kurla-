import type { ShippingCarrier } from '../shippingService';
import type { ShippingAddressInput } from '../shippingRules';

/**
 * CHANTIER 8.2c — les types du store, sortis de `serverDb.ts`.
 *
 * `serverDb.ts` les réexporte tels quels : les centaines d'imports
 * `from '../serverDb'` disséminés dans le backend continuent de fonctionner.
 */

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
  /** CHANTIER 11 (bloc C) — auteur réel, jamais exposé publiquement. */
  userId?: string;
  verifiedPurchase: boolean;
  createdAt: string;
  status: string;
}

export interface MarketplaceQuestion {
  id: string;
  productId: string;
  question: string;
  answer?: string;
  /**
   * CHANTIER 11 (bloc C) — auteur de la question.
   *
   * Jusqu'ici la question était anonyme côté store : impossible de savoir qui
   * a demandé, donc impossible de réserver au demandeur le droit de marquer
   * une réponse comme utile. Le champ n'est jamais exposé publiquement.
   */
  userId?: string;
  createdAt: string;
  answeredAt?: string;
}

/**
 * CHANTIER 11 (bloc C) — réponse d'un membre à une question produit.
 *
 * Le rôle de l'auteur est déduit côté serveur de son statut réel, jamais
 * déclaré par lui : c'est ce qui permet d'afficher « professionnel vérifié »
 * sans que ce soit un titre auto-attribué.
 */
export interface ProductQuestionAnswer {
  id: string;
  questionId: string;
  productId: string;
  userId: string;
  authorRole: 'member' | 'professional' | 'kurla';
  body: string;
  createdAt: string;
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

import type { CreatorKind, CreatorStatus } from '../creatorProgram';

/**
 * CHANTIER 8.6c1 — candidature au programme experts/créateurs.
 * `professionalProfileId` relie le créateur à un profil professionnel déjà
 * vérifié du même compte : c'est par ce lien que ses appuis et ses
 * contradictions sont comptés. Sans lien, ils restent à zéro.
 */
export interface CreatorApplication {
  id: string;
  userId: string;
  displayName: string;
  kind: CreatorKind;
  specialty: string;
  biography: string;
  portfolioUrl: string | null;
  professionalProfileId: string | null;
  status: CreatorStatus;
  appliedAt: string;
  verifiedAt: string | null;
  publishedAt: string | null;
  adminComment: string | null;
}

import type { BrandTestCohort, BrandTestStatus } from '../brandTest';

/**
 * CHANTIER 8.6c2 — demande de test produit par une marque.
 *
 * `brandUserId` rattache la demande à un compte portant le rôle `brand` : c'est
 * ce rattachement, et lui seul, qui autorise la lecture du rapport.
 */
export interface BrandTestRequest {
  id: string;
  brandUserId: string;
  brandName: string;
  contactEmail: string;
  productName: string;
  productId: string | null;
  hypothesis: string;
  cohort: BrandTestCohort;
  targetParticipants: number;
  durationDays: number;
  status: BrandTestStatus;
  submittedAt: string;
  adminComment: string | null;
}

/**
 * Participation d'un membre. Le consentement est daté ; un retrait est daté
 * aussi, et il retire les déclarations du membre des agrégats.
 */
export interface BrandTestParticipation {
  id: string;
  testId: string;
  userId: string;
  consentAt: string;
  withdrawnAt: string | null;
}

/** Une déclaration de résultat. Aucune donnée de profil n'est copiée ici. */
export interface BrandTestObservation {
  id: string;
  testId: string;
  userId: string;
  signal: string;
  declaredAt: string;
}

import type { OfflineActionKind } from '../mobileShell';

/**
 * CHANTIER 8.7 — action appliquée après synchronisation depuis un mobile.
 *
 * `(userId, clientActionId)` est unique : c'est cette unicité, et non une
 * vérification applicative, qui garantit qu'une action hors ligne ne s'applique
 * qu'une fois.
 */
export interface MobileSyncAction {
  id: string;
  userId: string;
  clientActionId: string;
  kind: OfflineActionKind;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  appliedAt: string;
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

// ---------------------------------------------------------------------------
// CHANTIER 8.3 — KURLA PROGRESSION (loyalty par progression)
// ---------------------------------------------------------------------------

export interface LoyaltyAccountRecord {
  userId: string;
  level: number;
  progressionScore: number;
  axisScores: Record<string, number>;
  badges: string[];
  firstActivityAt: string;
  lastActivityAt: string | null;
}

export interface LoyaltyEventRecord {
  id: string;
  userId: string;
  kind: string;
  axis: string;
  points: number;
  sourceRef?: string;
  dedupeKey: string;
  occurredAt: string;
}

export interface LoyaltyRedemptionRecord {
  id: string;
  userId: string;
  rewardCode: string;
  status: 'requested' | 'granted' | 'cancelled';
  note?: string;
  createdAt: string;
  handledAt?: string | null;
  handledBy?: string | null;
}

export interface LoyaltyRetentionCohort {
  cohortWeek: string;
  cohortSize: number;
  activeD30: number;
  activeD60: number;
  activeD90: number;
  rateD30: number | null;
  rateD60: number | null;
  rateD90: number | null;
}
