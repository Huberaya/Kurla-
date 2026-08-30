/**
 * Client API de la couche d'intelligence (Shelf, Wash Day OS, archétype,
 * résultats). Même contrat que `routineService.ts` : le token est passé par
 * l'appelant, jamais lu depuis un storage global.
 */

import { ArchetypeDerivation } from '../lib/archetype';
import { apiErrorMessage } from '../lib/apiDiagnostics';
import { OutcomeObservation } from '../lib/outcomeEvidence';
import { ProtectiveStyleEpisode } from '../lib/protectiveStyle';
import { TractionRiskAssessment } from '../lib/protectiveStyle';
import { ShelfItem } from '../lib/shelf';
import { DailyTask, WashDayPlan, WashDayTask } from '../lib/washDay';

// Types IMPORTÉS des modules purs plutôt que redéclarés à la main : une
// interface copiée diverge silencieusement du serveur, et `request<T>()` fait
// confiance à l'annotation — tsc ne peut alors rien voir. `import type` est
// effacé à la compilation : aucun runtime Node n'entre dans le bundle.
import type {
  ProfessionalTrustAssessment,
  ReviewSummary,
  TrustComponent
} from '../lib/professionalTrust';
import type {
  AnnualCostSimulation,
  CostLine,
  CostLineItem,
  RoutineComparison,
  RoutineComparisonItem,
  RoutineProfile
} from '../lib/routineEconomics';
import type {
  Appointment,
  DossierShare,
  ProfessionalProfile,
  ProfessionalService,
  ServicePayment
} from '../lib/professionalStore';
import type { ContradictionAction, ProfessionalEndorsement } from '../lib/proEndorsement';
import type { IngredientEvidence } from '../lib/ingredientGraph';

export type {
  ProfessionalTrustAssessment,
  ReviewSummary,
  TrustComponent,
  AnnualCostSimulation,
  CostLine,
  CostLineItem,
  RoutineComparison,
  RoutineComparisonItem,
  RoutineProfile,
  Appointment,
  DossierShare,
  ProfessionalProfile,
  ProfessionalService,
  IngredientEvidence,
  ServicePayment,
  ContradictionAction,
  ProfessionalEndorsement
};

export interface ShelfVerdictResponse {
  needsPurchase: boolean;
  gaps: { routineStep: string; label: string; message: string; critical: boolean }[];
  surplus: { routineStep: string; label: string; count: number; message: string }[];
  message: string;
  avoidedIngredients: { ingredientId: string; occurrences: number; reasons: string[] }[];
  abandonmentPatterns: { reason: string; label: string; count: number; share: number }[];
}

export interface CohortResponse {
  archetypeId: string;
  labelFr: string;
  memberCount: number;
  kAnonymityThreshold: number;
  publishable: boolean;
  suppressionReason?: string;
}

export interface ProtectiveStylesResponse {
  episodes: ProtectiveStyleEpisode[];
  assessments: TractionRiskAssessment[];
  history: {
    episodeCount: number;
    totalWearDays: number;
    shareWithElevatedRisk: number;
    recurringSignals: { signal: string; label: string; count: number }[];
    pattern: string;
  };
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La demande n’a pas pu aboutir.'));
  return data as T;
}

// ---------------------------------------------------------------------------
// KURLA Shelf
// ---------------------------------------------------------------------------

export async function getShelf(token: string): Promise<ShelfItem[]> {
  const data = await request<{ items: ShelfItem[] }>('/api/shelf', token);
  return data.items;
}

export interface ShelfItemInput {
  productId?: string;
  freeLabel?: string;
  status?: ShelfItem['status'];
  category?: string;
  routineStep?: string;
  barcode?: string;
  estimatedRemainingPercent?: number;
  abandonmentReason?: string;
  abandonmentNote?: string;
}

export async function addShelfItem(token: string, input: ShelfItemInput): Promise<ShelfItem> {
  const data = await request<{ item: ShelfItem }>('/api/shelf', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data.item;
}

export async function updateShelfItem(token: string, itemId: string, input: ShelfItemInput): Promise<ShelfItem> {
  const data = await request<{ item: ShelfItem }>(`/api/shelf/${encodeURIComponent(itemId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
  return data.item;
}

export async function deleteShelfItem(token: string, itemId: string): Promise<void> {
  await request<{ success: boolean }>(`/api/shelf/${encodeURIComponent(itemId)}`, token, { method: 'DELETE' });
}

export async function getShelfVerdict(token: string, requiredSteps?: string[]): Promise<ShelfVerdictResponse> {
  return request<ShelfVerdictResponse>('/api/shelf/verdict', token, {
    method: 'POST',
    body: JSON.stringify({ requiredSteps })
  });
}

// ---------------------------------------------------------------------------
// Archétype
// ---------------------------------------------------------------------------

export async function getMyArchetype(token: string): Promise<{ archetype: ArchetypeDerivation; cohort: CohortResponse }> {
  return request<{ archetype: ArchetypeDerivation; cohort: CohortResponse }>('/api/me/archetype', token);
}

// ---------------------------------------------------------------------------
// Observations de résultat — la boucle d'apprentissage
// ---------------------------------------------------------------------------

export async function recordOutcome(
  token: string,
  input: {
    signal: string;
    productId?: string;
    ingredientId?: string;
    shelfItemId?: string;
    observedAfterDays?: number;
    climateContext?: string;
    note?: string;
    isConsentShared?: boolean;
  }
): Promise<OutcomeObservation> {
  const data = await request<{ observation: OutcomeObservation }>('/api/outcomes', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data.observation;
}

export async function getOutcomes(token: string): Promise<OutcomeObservation[]> {
  const data = await request<{ observations: OutcomeObservation[] }>('/api/outcomes', token);
  return data.observations;
}

export interface IngredientEvidenceResponse {
  ingredientId: string;
  archetypeId: string;
  reading: {
    publishable: boolean;
    observationCount: number;
    positiveShare: number;
    medianDaysToResult: number | null;
    statement: string;
    limitations: string[];
  };
}

export async function getIngredientEvidence(token: string, ingredientId: string, climate?: string): Promise<IngredientEvidenceResponse> {
  const query = climate ? `?climate=${encodeURIComponent(climate)}` : '';
  return request<IngredientEvidenceResponse>(`/api/ingredients/${encodeURIComponent(ingredientId)}/evidence${query}`, token);
}

// ---------------------------------------------------------------------------
// Timeline de coiffure protectrice
// ---------------------------------------------------------------------------

export async function getProtectiveStyles(token: string): Promise<ProtectiveStylesResponse> {
  return request<ProtectiveStylesResponse>('/api/protective-styles', token);
}

export async function startProtectiveStyle(
  token: string,
  input: { style: string; tension?: string; installedAt?: string; plannedRemovalAt?: string }
): Promise<{ episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment }> {
  return request<{ episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment }>('/api/protective-styles', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function addProtectiveStyleSignal(
  token: string,
  episodeId: string,
  signal: string
): Promise<{ episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment; recoveryProtocol: { label: string; reason: string }[] }> {
  return request<{ episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment; recoveryProtocol: { label: string; reason: string }[] }>(
    `/api/protective-styles/${encodeURIComponent(episodeId)}/signals`,
    token,
    { method: 'POST', body: JSON.stringify({ signal }) }
  );
}

export async function closeProtectiveStyle(
  token: string,
  episodeId: string,
  reason?: string
): Promise<{ episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment }> {
  return request<{ episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment }>(
    `/api/protective-styles/${encodeURIComponent(episodeId)}/close`,
    token,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

// ---------------------------------------------------------------------------
// Wash Day OS
// ---------------------------------------------------------------------------

export interface WashDayCyclePrefs {
  intervalDays: number;
  lastWashDayAt?: string;
  deepConditionEveryNWashDays: number;
  proteinEveryNWashDays: number | null;
  nightProtection: 'none' | 'bonnet' | 'satin_pillowcase' | 'scarf';
  availableMinutesPerDay: number;
  hardWater: boolean;
}

export interface WashDayState {
  cycle: WashDayCyclePrefs;
  plan: WashDayPlan;
  dailyTasks: DailyTask[];
  activeProtectiveStyle: { episode: ProtectiveStyleEpisode; assessment: TractionRiskAssessment } | null;
}

export async function getWashDay(token: string): Promise<WashDayState> {
  return request<WashDayState>('/api/wash-day', token);
}

export async function saveWashDayCycle(token: string, input: Partial<WashDayCyclePrefs>): Promise<WashDayCyclePrefs> {
  const data = await request<{ cycle: WashDayCyclePrefs }>('/api/wash-day', token, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
  return data.cycle;
}

export async function markWashDayDone(token: string, at?: string): Promise<WashDayCyclePrefs> {
  const data = await request<{ cycle: WashDayCyclePrefs }>('/api/wash-day/mark-done', token, {
    method: 'POST',
    body: JSON.stringify({ at })
  });
  return data.cycle;
}

// ---------------------------------------------------------------------------
// CHANTIER A — branchements (RGPD, note par archétype, réassort, retours,
// juridiction, co-signature, recherche sémantique, routine builder)
// ---------------------------------------------------------------------------

export interface ArchetypeRatingResponse {
  productId: string;
  archetypeId: string;
  archetypeLabel: string;
  rating: number | null;
  reviewCount: number;
  publishable: boolean;
  suppressionReason?: string;
}

export interface ArchetypeRatingsResponse {
  productId: string;
  ratings: ArchetypeRatingResponse[];
  viewerArchetypeId: string | null;
  viewerRating: ArchetypeRatingResponse | null;
  note: string;
}

/**
 * Notes par archétype d'un produit. Le jeton est optionnel : la route est
 * publique, et un visiteur non connecté voit les cohortes publiées sans la
 * sienne.
 */
export async function getArchetypeRatings(productId: string, token?: string): Promise<ArchetypeRatingsResponse> {
  return request<ArchetypeRatingsResponse>(`/api/products/${encodeURIComponent(productId)}/archetype-ratings`, token || '');
}

export interface ReplenishmentSignalResponse {
  itemId: string;
  label: string;
  remainingPercent: number;
  daysUntilEmpty: number | null;
  shouldNotify: boolean;
  message: string;
}

export async function getReplenishment(
  token: string,
  weeklyUsagePercent = 10
): Promise<{ weeklyUsagePercent: number | null; signals: ReplenishmentSignalResponse[]; due: ReplenishmentSignalResponse[]; limitations: string[] }> {
  return request(`/api/shelf/replenishment?weeklyUsagePercent=${encodeURIComponent(weeklyUsagePercent)}`, token);
}

export interface ReturnInsightPrompt {
  question: string;
  options: { value: string; label: string }[];
}

export async function getReturnInsightPrompt(token: string): Promise<ReturnInsightPrompt> {
  return request<ReturnInsightPrompt>('/api/returns/insight-prompt', token);
}

export async function recordReturnInsight(
  token: string,
  returnId: string,
  input: { orderId?: string; productId?: string; reason: string; textureMismatch?: boolean; ingredientSuspected?: string; shared?: boolean }
): Promise<{ record: unknown }> {
  return request(`/api/returns/${encodeURIComponent(returnId)}/insight`, token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export interface JurisdictionFindingResponse {
  ingredientId: string;
  status: 'allowed' | 'restricted' | 'prohibited' | 'unknown';
  limitPercent?: number | null;
  reference?: string;
  message: string;
}

export async function assessJurisdiction(
  token: string,
  jurisdiction: string,
  ingredientIds: string[]
): Promise<{ jurisdiction: string; findings: JurisdictionFindingResponse[]; blocked: number; limitations: string[] }> {
  return request('/api/jurisdiction/assess', token, {
    method: 'POST',
    body: JSON.stringify({ jurisdiction, ingredientIds })
  });
}

export async function getProductEndorsements(
  token: string,
  productId: string
): Promise<{ productId: string; endorsements: unknown[]; hidden: number; note: string }> {
  return request(`/api/products/${encodeURIComponent(productId)}/endorsements`, token);
}

export interface ProfessionalImpactResponse {
  professionalId: string;
  impact: {
    total: number;
    approved: number;
    amended: number;
    contradicted: number;
    agreementRate: number | null;
    statement: string;
    limitations: string[];
  };
}

export async function getProfessionalImpact(token: string, professionalId: string): Promise<ProfessionalImpactResponse> {
  return request<ProfessionalImpactResponse>(`/api/professionals/${encodeURIComponent(professionalId)}/endorsement-impact`, token);
}

// --- RGPD : export et suppression en 1 clic --------------------------------

export interface MyDataExport {
  exportedAt: string;
  account: { id: string; email: string; role: string };
  data: Record<string, unknown>;
  retention: Record<string, string>;
}

export async function exportMyData(token: string): Promise<MyDataExport> {
  return request<MyDataExport>('/api/me/data', token);
}

export interface AccountDeletionResult {
  deleted: boolean;
  deletedAt: string;
  purged: string[];
  retained: { what: string; why: string }[];
  note: string;
}

export async function deleteMyAccount(token: string): Promise<AccountDeletionResult> {
  return request<AccountDeletionResult>('/api/account', token, {
    method: 'DELETE',
    body: JSON.stringify({ confirm: 'SUPPRIMER' })
  });
}

// ---------------------------------------------------------------------------
// Recherche sémantique et Routine Builder
// ---------------------------------------------------------------------------

export interface SearchIntentResponse {
  rawQuery: string;
  needs: string[];
  textures: string[];
  toneDepths: string[];
  steps: string[];
  categories: string[];
  budget: { maxPerItem?: number; maxTotal?: number; currency: string } | null;
  wantsRoutine: boolean;
  excludesFragrance: boolean;
  /** Ce que le parseur n'a pas su interpréter. Jamais ignoré silencieusement. */
  unresolved: string[];
}

export interface SearchResultItem {
  product: {
    id: string;
    slug?: string;
    name: string;
    brand?: string;
    price: number;
    category?: string;
    routineStep?: string;
    inStock?: boolean;
  };
  /** Nombre de contraintes satisfaites. Le tri suit ce compte, pas un score opaque. */
  satisfied: number;
  matchedOn: string[];
  missedOn: string[];
}

export interface SearchResponse {
  intent: SearchIntentResponse;
  interpretation: string;
  results: SearchResultItem[];
  total: number;
}

export async function searchByQuery(token: string, query: string, country?: string): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (country) params.set('country', country);
  return request<SearchResponse>(`/api/search?${params.toString()}`, token);
}

export interface RoutineConflict {
  ingredientA: string;
  ingredientB: string;
  severity: 'avoid' | 'caution' | 'space_out';
  explanation: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D' | 'not_established';
}

export interface RoutineSlotResponse {
  routineStep: string;
  label: string;
  recommendation: {
    product: { id: string; slug?: string; name: string; brand?: string; price: number };
    finalScore: number | null;
    rank: number | null;
    baseReasons: string[];
    unmetNeeds: string[];
    usageCost: { monthlyCost: number | null; monthsOfUse: number | null; limitation?: string } | null;
  } | null;
  alreadyOwned?: { id: string; freeLabel?: string; productId?: string };
  reason: string;
  alternatives: unknown[];
  optional: boolean;
  durationMinutes: number;
}

export interface BuiltRoutineResponse {
  request: Record<string, unknown>;
  slots: RoutineSlotResponse[];
  totalPrice: number;
  totalItems: number;
  alreadyCovered: string[];
  conflicts: RoutineConflict[];
  unfulfilled: { routineStep: string; label: string; reason: string }[];
  cartItems: { productId: string; slug: string; name: string; price: number; quantity: number }[];
  overBudget: boolean;
  overTime: boolean;
  notes: string[];
}

export async function buildRoutinePlan(
  token: string,
  input: { goal?: string; budgetLimit?: number; availableMinutesPerDay?: number; experienceLevel?: string; requestedSteps?: string[]; country?: string }
): Promise<{ routine: BuiltRoutineResponse; summary: unknown }> {
  return request('/api/routine-builder', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

// ---------------------------------------------------------------------------
// CHANTIER B — Confiance, pros & écosystème
// ---------------------------------------------------------------------------

/**
 * Sous-ensemble publié par `GET /api/professionals/verified`.
 * Dérivé de `ProfessionalProfile` par `Pick` : si le schéma change, cette
 * projection cesse de compiler au lieu de renvoyer `undefined` à l'écran.
 */
export type PublicProfessionalSummary = Pick<
  ProfessionalProfile,
  'id' | 'displayName' | 'city' | 'profession' | 'specialty' | 'qualificationLabel' | 'verifiedExperienceYears'
>;

export type AppointmentStatusValue = Appointment['status'];

/** Annuaire public des professionnels vérifiés, avec Trust Score. */
export async function fetchVerifiedProfessionals(): Promise<{
  professionals: { profile: PublicProfessionalSummary; trust: ProfessionalTrustAssessment }[];
  total: number;
  note?: string;
}> {
  return request('/api/professionals/verified', '');
}

export async function fetchProfessionalTrust(token: string, professionalId: string): Promise<{ assessment: ProfessionalTrustAssessment }> {
  return request(`/api/professionals/${encodeURIComponent(professionalId)}/trust`, token);
}

export async function fetchProfessionalServices(token: string, professionalId: string): Promise<{ professionalId: string; services: ProfessionalService[] }> {
  return request(`/api/professionals/${encodeURIComponent(professionalId)}/services`, token);
}

export async function requestAppointment(
  token: string,
  input: {
    professionalId: string;
    serviceId?: string;
    scheduledAt?: string;
    clientNotes?: string;
    dossierShareConsent?: boolean;
  }
): Promise<{ appointment: Appointment; note: string }> {
  return request('/api/appointments', token, { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchMyAppointments(token: string): Promise<{ appointments: Appointment[] }> {
  return request('/api/appointments', token);
}

export async function setAppointmentStatus(
  token: string,
  appointmentId: string,
  status: AppointmentStatusValue,
  cancelledReason?: string
): Promise<{ appointment?: Appointment }> {
  return request(`/api/appointments/${encodeURIComponent(appointmentId)}/status`, token, {
    method: 'POST',
    body: JSON.stringify({ status, cancelledReason })
  });
}

export async function grantDossierShare(
  token: string,
  input: {
    professionalId: string;
    appointmentId?: string;
    scope: { beautyProfile?: boolean; shelf?: boolean; outcomes?: boolean; protectiveStyles?: boolean };
    expiresAt?: string;
  }
): Promise<{ share: DossierShare }> {
  return request('/api/dossier-shares', token, { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchMyDossierShares(token: string): Promise<{ shares: DossierShare[] }> {
  return request('/api/dossier-shares', token);
}

export async function revokeDossierShare(token: string, shareId: string): Promise<{ revoked: boolean; note: string }> {
  return request(`/api/dossier-shares/${encodeURIComponent(shareId)}`, token, { method: 'DELETE' });
}

/** Fiche ingrédient publique — appelable sans authentification. */
export async function fetchIngredientCard(ingredientId: string): Promise<{
  ingredient: Record<string, unknown> | null;
  evidence: IngredientEvidence[];
  restrictions: Record<string, unknown>[];
  bestEvidence: { evidence: IngredientEvidence | null; transposable: boolean; caveat?: string };
  note?: string;
  error?: string;
}> {
  return request(`/api/ingredients/${encodeURIComponent(ingredientId)}/card`, '');
}

// ---------------------------------------------------------------------------
// CHANTIER B — Économie de routine
// ---------------------------------------------------------------------------

/** Le serveur complète l'`id` s'il manque : l'appelant n'a pas à l'inventer. */
export type CostLineItemInput = Omit<CostLineItem, 'id'> & { id?: string };
export type RoutineProfileInput = Omit<RoutineProfile, 'items'> & { items: CostLineItemInput[] };

export async function simulateRoutineCost(token: string, items: CostLineItemInput[]): Promise<{ simulation: AnnualCostSimulation }> {
  return request('/api/routines/cost-simulation', token, {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function compareRoutineProfiles(
  token: string,
  a: RoutineProfileInput,
  b: RoutineProfileInput
): Promise<{ comparison: RoutineComparison }> {
  return request('/api/routines/compare', token, {
    method: 'POST',
    body: JSON.stringify({ a, b })
  });
}

// ---------------------------------------------------------------------------
// CHANTIER B — Paiement de prestation
// ---------------------------------------------------------------------------

/**
 * Ouvre une session de paiement Stripe pour une prestation.
 *
 * Renvoie une URL de redirection, pas un `client_secret` : le projet n'embarque
 * pas `@stripe/stripe-js`, le paiement est donc hébergé par Stripe comme pour
 * le checkout produit.
 */
export async function createServiceCheckout(token: string, appointmentId: string): Promise<{
  payment: ServicePayment;
  sessionId: string;
  url: string | null;
  amountCents: number;
  currency: string;
  serviceName: string;
}> {
  return request(`/api/appointments/${encodeURIComponent(appointmentId)}/checkout`, token, {
    method: 'POST'
  });
}

export async function confirmServicePayment(
  token: string,
  paymentId: string,
  appointmentId: string
): Promise<{ payment: ServicePayment; note: string }> {
  return request(`/api/service-payments/${encodeURIComponent(paymentId)}/confirm`, token, {
    method: 'POST',
    body: JSON.stringify({ appointmentId })
  });
}

export async function fetchAppointmentPayments(token: string, appointmentId: string): Promise<{ payments: ServicePayment[] }> {
  return request(`/api/appointments/${encodeURIComponent(appointmentId)}/payments`, token);
}

// ---------------------------------------------------------------------------
// CHANTIER B — Co-signature professionnelle côté client
// ---------------------------------------------------------------------------

export interface EndorsementGate {
  allowed: boolean;
  reason?: string;
  disclaimer?: string;
}

export interface MyEndorsementEntry {
  endorsement: ProfessionalEndorsement;
  gate: EndorsementGate;
  action: ContradictionAction;
}

/** Mes co-signatures : ce qu'un professionnel a dit de ma routine. */
export async function fetchMyEndorsements(token: string): Promise<{
  endorsements: MyEndorsementEntry[];
  total: number;
  contradicted: number;
  note?: string;
}> {
  return request('/api/me/endorsements', token);
}

// ---------------------------------------------------------------------------
// Dossier client vu par le professionnel
// ---------------------------------------------------------------------------

export interface ProfessionalDossierSharesResponse {
  professionalId: string;
  shares: DossierShare[];
  count: number;
  note: string;
}

export interface ProfessionalDossierAccessResponse {
  access: boolean;
  reason?: string;
  scope?: {
    beautyProfile: boolean;
    shelf: boolean;
    outcomes: boolean;
    protectiveStyles: boolean;
  };
  consentAt?: string;
  expiresAt?: string | null;
  data?: Record<string, unknown>;
  note?: string;
}

/** Liste les partages de dossier actifs reçus par le professionnel connecté. */
export async function listProfessionalDossierShares(token: string): Promise<ProfessionalDossierSharesResponse> {
  return request<ProfessionalDossierSharesResponse>('/api/professional/dossier-shares', token);
}

/** Lit un dossier client, strictement dans le périmètre consenti. */
export async function fetchProfessionalDossierAccess(
  token: string,
  clientUserId: string
): Promise<ProfessionalDossierAccessResponse> {
  return request<ProfessionalDossierAccessResponse>(
    `/api/professional/dossier-access/${encodeURIComponent(clientUserId)}`,
    token
  );
}

// ---------------------------------------------------------------------------
// Tableau de bord professionnel
// ---------------------------------------------------------------------------

export interface ProfessionalDashboardResponse {
  profile: ProfessionalProfile;
  trust: ProfessionalTrustAssessment;
  bookable: boolean;
  services: ProfessionalService[];
  appointments: Appointment[];
  upcomingCount: number;
  shares: DossierShare[];
  activeShareCount: number;
}

/**
 * Données réelles du professionnel connecté. Aucun repli fictif : si le compte
 * n'a pas de profil vérifié, l'appel échoue en 403 et l'écran l'affiche.
 */
export async function getMyProfessionalDashboard(token: string): Promise<ProfessionalDashboardResponse> {
  return request<ProfessionalDashboardResponse>('/api/professional/me', token);
}

/**
 * Création d'une co-signature professionnelle.
 *
 * L'identité du professionnel n'est PAS envoyée : le serveur la résout depuis le
 * compte authentifié et refuse un corps qui la déclarerait. Seuls le périmètre
 * métier (cliente, produit, position, justification, consentement) sont transmis.
 */
export async function createProfessionalEndorsement(
  token: string,
  input: {
    clientUserId: string;
    productId?: string;
    routinePlanId?: string;
    stance: 'approved' | 'amended' | 'contradicted';
    rationale: string;
    isDisplayable?: boolean;
    clientConsentAt?: string;
  }
): Promise<{ endorsement: unknown }> {
  return request<{ endorsement: unknown }>('/api/endorsements', token, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}
