/**
 * KURLA PROFESSIONAL STORE — profils vérifiés, prestations, réservations,
 * paiements de prestation et partages de dossier.
 *
 * Séparé de `serverDb.ts` (6 163 lignes) pour la même raison que
 * `intelligenceStore.ts` : ajouter une couche métier dans le monolithe irait à
 * l'encontre de l'action de découpage.
 *
 * Même contrat : Supabase quand il est configuré, mémoire explicite sinon —
 * jamais un mode à moitié autorisé.
 */

import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient } from './supabaseClient';
import {
  assessProfessionalTrust,
  isBookable,
  MINIMUM_ENDORSEMENTS_FOR_RATE,
  MINIMUM_REVIEWS_FOR_RATING,
  ProfessionalTrustAssessment,
  ProfessionalTrustInput
} from './professionalTrust';

function ensureSuccess(operation: string, error: { message?: string } | null | undefined): void {
  if (error) throw new Error(`[Supabase] ${operation}: ${error.message || 'opération refusée'}`);
}

/**
 * Les identifiants de réservation, de paiement, de partage et de profil sont des
 * UUID en base. Une valeur hors format n'y est donc pas « introuvable » :
 * PostgREST répond 400 `invalid input syntax for type uuid`, et `ensureSuccess`
 * transformerait une simple absence en exception. Les chemins atteignables
 * depuis un webhook Stripe ou une route publique doivent répondre
 * « introuvable », pas échouer.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined | null): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function iso(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toISOString() : undefined;
}

export interface ProfessionalProfile {
  id: string;
  userId?: string;
  applicationId?: string;
  displayName: string;
  city: string;
  profession: string;
  specialty?: string;
  identityVerified: boolean;
  identityVerifiedAt?: string;
  identityVerifiedBy?: string;
  qualificationOnFile: boolean;
  qualificationLabel?: string;
  qualificationVerifiedAt?: string;
  charterAccepted: boolean;
  charterAcceptedAt?: string;
  verifiedExperienceYears?: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalService {
  id: string;
  professionalId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isRemote: boolean;
  isActive: boolean;
}

export type AppointmentStatus =
  | 'requested' | 'confirmed' | 'completed'
  | 'cancelled_by_client' | 'cancelled_by_pro' | 'no_show';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'requested', 'confirmed', 'completed', 'cancelled_by_client', 'cancelled_by_pro', 'no_show'
];

export interface Appointment {
  id: string;
  professionalId: string;
  serviceId?: string;
  clientUserId: string;
  scheduledAt: string;
  durationMinutes: number;
  isRemote: boolean;
  status: AppointmentStatus;
  clientNotes?: string;
  dossierShareConsentAt?: string;
  cancelledReason?: string;
  createdAt: string;
}

export interface DossierShare {
  id: string;
  clientUserId: string;
  professionalId: string;
  appointmentId?: string;
  scopeBeautyProfile: boolean;
  scopeShelf: boolean;
  scopeOutcomes: boolean;
  scopeProtectiveStyles: boolean;
  consentAt: string;
  revokedAt?: string;
  expiresAt?: string;
}

export type ServicePaymentStatus = 'pending' | 'authorized' | 'paid' | 'refunded' | 'failed';

export const SERVICE_PAYMENT_STATUSES: ServicePaymentStatus[] = [
  'pending', 'authorized', 'paid', 'refunded', 'failed'
];

export interface ServicePayment {
  id: string;
  appointmentId: string;
  amountCents: number;
  currency: string;
  status: ServicePaymentStatus;
  stripePaymentIntentId?: string;
  idempotencyKey?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function mapServicePaymentRow(row: any): ServicePayment {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    status: row.status as ServicePaymentStatus,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    paidAt: iso(row.paid_at),
    refundedAt: iso(row.refunded_at),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: iso(row.updated_at) ?? new Date(0).toISOString()
  };
}

function mapProfileRow(row: any): ProfessionalProfile {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    applicationId: row.application_id || undefined,
    displayName: row.display_name,
    city: row.city,
    profession: row.profession,
    specialty: row.specialty || undefined,
    identityVerified: row.identity_verified === true,
    identityVerifiedAt: row.identity_verified_at || undefined,
    identityVerifiedBy: row.identity_verified_by || undefined,
    qualificationOnFile: row.qualification_on_file === true,
    qualificationLabel: row.qualification_label || undefined,
    qualificationVerifiedAt: row.qualification_verified_at || undefined,
    charterAccepted: row.charter_accepted === true,
    charterAcceptedAt: row.charter_accepted_at || undefined,
    verifiedExperienceYears: row.verified_experience_years ?? undefined,
    isPublic: row.is_public === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapServiceRow(row: any): ProfessionalService {
  return {
    id: row.id,
    professionalId: row.professional_id,
    name: row.name,
    description: row.description || undefined,
    durationMinutes: Number(row.duration_minutes),
    priceCents: Number(row.price_cents),
    currency: row.currency || 'EUR',
    isRemote: row.is_remote === true,
    isActive: row.is_active !== false
  };
}

function mapAppointmentRow(row: any): Appointment {
  return {
    id: row.id,
    professionalId: row.professional_id,
    serviceId: row.service_id || undefined,
    clientUserId: row.client_user_id,
    scheduledAt: row.scheduled_at,
    durationMinutes: Number(row.duration_minutes),
    isRemote: row.is_remote === true,
    status: row.status,
    clientNotes: row.client_notes || undefined,
    dossierShareConsentAt: row.dossier_share_consent_at || undefined,
    cancelledReason: row.cancelled_reason || undefined,
    createdAt: row.created_at
  };
}

function mapShareRow(row: any): DossierShare {
  return {
    id: row.id,
    clientUserId: row.client_user_id,
    professionalId: row.professional_id,
    appointmentId: row.appointment_id || undefined,
    scopeBeautyProfile: row.scope_beauty_profile === true,
    scopeShelf: row.scope_shelf === true,
    scopeOutcomes: row.scope_outcomes === true,
    scopeProtectiveStyles: row.scope_protective_styles === true,
    consentAt: row.consent_at,
    revokedAt: row.revoked_at || undefined,
    expiresAt: row.expires_at || undefined
  };
}

class KurlaProfessionalStore {
  private profiles = new Map<string, ProfessionalProfile>();
  private services = new Map<string, ProfessionalService[]>();
  private appointments = new Map<string, Appointment>();
  private reviews = new Map<string, { rating: number; serviceDelivered: boolean }[]>();
  private shares = new Map<string, DossierShare>();
  private payments = new Map<string, ServicePayment>();

  // -------------------------------------------------------------------------
  // Profils vérifiés
  // -------------------------------------------------------------------------

  /**
   * Vérification d'identité. Acte d'administration : `verifiedBy` doit être un
   * administrateur différent du professionnel. La contrainte existe aussi dans
   * le schéma (`professional_profiles_not_self_verifier`).
   */
  public async verifyIdentity(input: {
    professionalId: string;
    verifiedBy: string;
    documentRef?: string;
  }): Promise<ProfessionalProfile> {
    if (input.verifiedBy === await this.ownerOf(input.professionalId)) {
      throw new Error('Un professionnel ne peut pas vérifier sa propre identité.');
    }
    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('professional_profiles')
        .update({
          identity_verified: true,
          identity_verified_at: now,
          identity_verified_by: input.verifiedBy,
          identity_document_ref: input.documentRef ?? null,
          is_public: true,
          updated_at: now
        })
        .eq('id', input.professionalId)
        .select('*')
        .maybeSingle();
      ensureSuccess("vérification d'identité", error);
      if (!data) throw new Error('Profil professionnel introuvable.');
      return mapProfileRow(data);
    }
    const profile = this.profiles.get(input.professionalId);
    if (!profile) throw new Error('Profil professionnel introuvable.');
    const updated: ProfessionalProfile = {
      ...profile,
      identityVerified: true,
      identityVerifiedAt: now,
      identityVerifiedBy: input.verifiedBy,
      isPublic: true,
      updatedAt: now
    };
    this.profiles.set(input.professionalId, updated);
    return updated;
  }

  private async ownerOf(professionalId: string): Promise<string | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(professionalId)) return undefined;
      const { data } = await supabase.from('professional_profiles')
        .select('user_id').eq('id', professionalId).maybeSingle();
      return data?.user_id || undefined;
    }
    return this.profiles.get(professionalId)?.userId;
  }

  public async getPublicProfessionals(): Promise<ProfessionalProfile[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('professional_profiles')
        .select('*').eq('is_public', true).eq('identity_verified', true).order('city');
      ensureSuccess('lecture des professionnels publics', error);
      return (data || []).map(mapProfileRow);
    }
    return Array.from(this.profiles.values())
      .filter(profile => profile.isPublic && profile.identityVerified);
  }

  public async getProfessional(professionalId: string): Promise<ProfessionalProfile | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(professionalId)) return undefined;
      const { data, error } = await supabase.from('professional_profiles')
        .select('*').eq('id', professionalId).maybeSingle();
      ensureSuccess('lecture du professionnel', error);
      return data ? mapProfileRow(data) : undefined;
    }
    return this.profiles.get(professionalId);
  }

  /** Alimente le repli mémoire en test local. */
  public seedProfileForTest(profile: Partial<ProfessionalProfile> & { id: string; displayName: string; city: string; profession: string }): ProfessionalProfile {
    const now = new Date().toISOString();
    const stored: ProfessionalProfile = {
      userId: undefined,
      specialty: undefined,
      identityVerified: false,
      qualificationOnFile: false,
      charterAccepted: false,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
      ...profile
    };
    this.profiles.set(stored.id, stored);
    return stored;
  }

  // -------------------------------------------------------------------------
  // Avis vérifiés
  // -------------------------------------------------------------------------

  public async recordReview(input: {
    professionalId: string;
    clientUserId: string;
    appointmentId?: string;
    rating: number;
    comment?: string;
    serviceDelivered: boolean;
  }): Promise<void> {
    const rating = Number(input.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error('Note invalide : elle doit être comprise entre 1 et 5.');
    }
    // Un avis sans prestation effectuée est accepté mais ne comptera pas :
    // c'est la seule façon d'empêcher une moyenne achetable.
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('professional_reviews').insert({
        professional_id: input.professionalId,
        appointment_id: input.appointmentId ?? null,
        client_user_id: input.clientUserId,
        rating,
        comment: input.comment ?? null,
        service_delivered: input.serviceDelivered === true
      });
      ensureSuccess("enregistrement de l'avis", error);
      return;
    }
    const list = this.reviews.get(input.professionalId) || [];
    list.push({ rating, serviceDelivered: input.serviceDelivered === true });
    this.reviews.set(input.professionalId, list);
  }

  /** Seuls les avis de prestations réellement effectuées comptent. */
  public async getDeliveredRatings(professionalId: string): Promise<number[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(professionalId)) return [];
      const { data, error } = await supabase.from('professional_reviews')
        .select('rating').eq('professional_id', professionalId).eq('service_delivered', true);
      ensureSuccess('lecture des avis vérifiés', error);
      return (data || []).map((row: any) => Number(row.rating));
    }
    return (this.reviews.get(professionalId) || [])
      .filter(review => review.serviceDelivered)
      .map(review => review.rating);
  }

  // -------------------------------------------------------------------------
  // Trust Score
  // -------------------------------------------------------------------------

  /**
   * Évaluation de confiance. Chaque composante est retournée, y compris celles
   * qui ne sont pas satisfaites : cacher une ligne manquante transformerait le
   * score en argument marketing.
   */
  public async assessTrust(professionalId: string, endorsementStats?: { total: number; approved: number }): Promise<ProfessionalTrustAssessment> {
    const profile = await this.getProfessional(professionalId);
    if (!profile) throw new Error('Profil professionnel introuvable.');
    const ratings = await this.getDeliveredRatings(professionalId);

    const input: ProfessionalTrustInput = {
      professionalId,
      identityVerified: profile.identityVerified,
      identityVerifiedAt: profile.identityVerifiedAt,
      qualificationOnFile: profile.qualificationOnFile,
      qualificationLabel: profile.qualificationLabel,
      charterAccepted: profile.charterAccepted,
      reviewRatings: ratings,
      endorsementStats,
      verifiedExperienceYears: profile.verifiedExperienceYears
    };
    const assessment = assessProfessionalTrust(input);
    // Preuve que le store délègue au module pur et n'en recopie pas la logique.
    return assessment;
  }

  public canBeBooked(assessment: ProfessionalTrustAssessment): boolean {
    return isBookable(assessment);
  }

  // -------------------------------------------------------------------------
  // Prestations
  // -------------------------------------------------------------------------

  public async getServices(professionalId: string): Promise<ProfessionalService[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(professionalId)) return [];
      const { data, error } = await supabase.from('professional_services')
        .select('*').eq('professional_id', professionalId).eq('is_active', true);
      ensureSuccess('lecture des prestations', error);
      return (data || []).map(mapServiceRow);
    }
    return (this.services.get(professionalId) || []).filter(service => service.isActive);
  }

  public seedServiceForTest(service: ProfessionalService): void {
    const list = this.services.get(service.professionalId) || [];
    list.push(service);
    this.services.set(service.professionalId, list);
  }

  // -------------------------------------------------------------------------
  // Réservations
  // -------------------------------------------------------------------------

  /**
   * Demande de réservation. Un professionnel dont l'identité n'est pas
   * vérifiée ne peut pas être réservé — vérifié ici, pas seulement dans l'UI.
   */
  public async requestAppointment(input: {
    professionalId: string;
    clientUserId: string;
    serviceId?: string;
    scheduledAt: string;
    clientNotes?: string;
    dossierShareConsent?: boolean;
  }): Promise<Appointment> {
    const profile = await this.getProfessional(input.professionalId);
    if (!profile) throw new Error('Professionnel introuvable.');
    if (!profile.identityVerified) {
      throw new Error('Ce professionnel n’a pas encore fait vérifier son identité : la réservation n’est pas possible.');
    }
    if (input.professionalId === input.clientUserId) {
      throw new Error('Un professionnel ne peut pas se réserver lui-même.');
    }
    const scheduledAt = iso(input.scheduledAt);
    if (!scheduledAt) throw new Error('Date de réservation invalide.');

    let durationMinutes = 60;
    let isRemote = false;
    if (input.serviceId) {
      const service = (await this.getServices(input.professionalId)).find(item => item.id === input.serviceId);
      if (service) {
        durationMinutes = service.durationMinutes;
        isRemote = service.isRemote;
      }
    }

    const appointment: Appointment = {
      id: randomUUID(),
      professionalId: input.professionalId,
      serviceId: input.serviceId,
      clientUserId: input.clientUserId,
      scheduledAt,
      durationMinutes,
      isRemote,
      status: 'requested',
      clientNotes: input.clientNotes,
      // Le consentement est daté s'il est donné, absent sinon. Jamais présumé.
      dossierShareConsentAt: input.dossierShareConsent === true ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('appointments').insert({
        id: appointment.id,
        professional_id: appointment.professionalId,
        service_id: appointment.serviceId ?? null,
        client_user_id: appointment.clientUserId,
        scheduled_at: appointment.scheduledAt,
        duration_minutes: appointment.durationMinutes,
        is_remote: appointment.isRemote,
        status: appointment.status,
        client_notes: appointment.clientNotes ?? null,
        dossier_share_consent_at: appointment.dossierShareConsentAt ?? null
      });
      ensureSuccess('enregistrement de la réservation', error);
    } else {
      this.appointments.set(appointment.id, appointment);
    }
    return appointment;
  }

  public async setAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    cancelledReason?: string
  ): Promise<Appointment | undefined> {
    if (!(APPOINTMENT_STATUSES as string[]).includes(status)) {
      throw new Error('Statut de réservation invalide.');
    }
    if ((status === 'cancelled_by_client' || status === 'cancelled_by_pro') && !cancelledReason?.trim()) {
      throw new Error('Une annulation doit être motivée.');
    }
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(appointmentId)) return undefined;
      const { data, error } = await supabase.from('appointments')
        .update({
          status,
          cancelled_reason: cancelledReason ?? null,
          cancelled_at: cancelledReason ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('*')
        .maybeSingle();
      ensureSuccess('mise à jour de la réservation', error);
      return data ? mapAppointmentRow(data) : undefined;
    }
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) return undefined;
    const updated: Appointment = { ...appointment, status, cancelledReason };
    this.appointments.set(appointmentId, updated);
    return updated;
  }

  public async getAppointments(filter: { clientUserId?: string; professionalId?: string } = {}): Promise<Appointment[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if ((filter.clientUserId && !isUuid(filter.clientUserId)) ||
          (filter.professionalId && !isUuid(filter.professionalId))) return [];
      let query = supabase.from('appointments').select('*').order('scheduled_at');
      if (filter.clientUserId) query = query.eq('client_user_id', filter.clientUserId);
      if (filter.professionalId) query = query.eq('professional_id', filter.professionalId);
      const { data, error } = await query;
      ensureSuccess('lecture des réservations', error);
      return (data || []).map(mapAppointmentRow);
    }
    return Array.from(this.appointments.values()).filter(appointment =>
      (!filter.clientUserId || appointment.clientUserId === filter.clientUserId) &&
      (!filter.professionalId || appointment.professionalId === filter.professionalId)
    );
  }

  // -------------------------------------------------------------------------
  // Partage de dossier
  // -------------------------------------------------------------------------

  /**
   * Consentement au partage. Le périmètre est énuméré : « tout le dossier »
   * n'existe pas. Un partage sans aucun périmètre est refusé.
   */
  public async grantDossierShare(input: {
    clientUserId: string;
    professionalId: string;
    appointmentId?: string;
    scope: {
      beautyProfile?: boolean;
      shelf?: boolean;
      outcomes?: boolean;
      protectiveStyles?: boolean;
    };
    expiresAt?: string;
  }): Promise<DossierShare> {
    const scope = {
      beautyProfile: input.scope.beautyProfile === true,
      shelf: input.scope.shelf === true,
      outcomes: input.scope.outcomes === true,
      protectiveStyles: input.scope.protectiveStyles === true
    };
    if (!scope.beautyProfile && !scope.shelf && !scope.outcomes && !scope.protectiveStyles) {
      throw new Error('Au moins un périmètre doit être choisi : un partage vide n’a pas de sens.');
    }
    if (input.clientUserId === input.professionalId) {
      throw new Error('Un professionnel ne peut pas recevoir son propre dossier.');
    }

    const share: DossierShare = {
      id: randomUUID(),
      clientUserId: input.clientUserId,
      professionalId: input.professionalId,
      appointmentId: input.appointmentId,
      scopeBeautyProfile: scope.beautyProfile,
      scopeShelf: scope.shelf,
      scopeOutcomes: scope.outcomes,
      scopeProtectiveStyles: scope.protectiveStyles,
      consentAt: new Date().toISOString(),
      expiresAt: iso(input.expiresAt)
    };

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('client_dossier_shares').insert({
        id: share.id,
        client_user_id: share.clientUserId,
        professional_id: share.professionalId,
        appointment_id: share.appointmentId ?? null,
        scope_beauty_profile: share.scopeBeautyProfile,
        scope_shelf: share.scopeShelf,
        scope_outcomes: share.scopeOutcomes,
        scope_protective_styles: share.scopeProtectiveStyles,
        consent_at: share.consentAt,
        expires_at: share.expiresAt ?? null
      });
      ensureSuccess('enregistrement du consentement', error);
    } else {
      this.shares.set(share.id, share);
    }
    return share;
  }

  /** Révocation : la trace du consentement est conservée, l'accès cesse. */
  public async revokeDossierShare(clientUserId: string, shareId: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(shareId) || !isUuid(clientUserId)) return false;
      const { data, error } = await supabase.from('client_dossier_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', shareId)
        .eq('client_user_id', clientUserId)
        .select('id')
        .maybeSingle();
      ensureSuccess('révocation du partage', error);
      return Boolean(data);
    }
    const share = this.shares.get(shareId);
    if (!share || share.clientUserId !== clientUserId) return false;
    this.shares.set(shareId, { ...share, revokedAt: new Date().toISOString() });
    return true;
  }

  /**
   * Ce qu'un professionnel peut voir à l'instant présent. Un partage révoqué
   * ou expiré disparaît — sans effacer la trace du consentement.
   */
  public async getActiveShares(professionalId: string, now: Date = new Date()): Promise<DossierShare[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(professionalId)) return [];
      const { data, error } = await supabase.from('professional_dossier_access')
        .select('*').eq('professional_id', professionalId);
      ensureSuccess('lecture des dossiers partagés', error);
      return (data || []).map((row: any) => mapShareRow(row));
    }
    return Array.from(this.shares.values()).filter(share =>
      share.professionalId === professionalId &&
      !share.revokedAt &&
      (!share.expiresAt || new Date(share.expiresAt) > now)
    );
  }

  public async getClientShares(clientUserId: string): Promise<DossierShare[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(clientUserId)) return [];
      const { data, error } = await supabase.from('client_dossier_shares')
        .select('*').eq('client_user_id', clientUserId);
      ensureSuccess('lecture des partages du client', error);
      return (data || []).map(mapShareRow);
    }
    return Array.from(this.shares.values()).filter(share => share.clientUserId === clientUserId);
  }

  /** Purge RGPD : les partages et réservations du client. */
  // -------------------------------------------------------------------------
  // Paiements de prestation
  // -------------------------------------------------------------------------

  /**
   * Crée un paiement de prestation.
   *
   * `payments` ne peut pas accueillir ce cas : son `order_id` est
   * `NOT NULL REFERENCES orders`, et une prestation n'est pas une commande
   * produit. Rendre cette colonne nullable aurait affaibli tous les paiements
   * produits existants pour un besoin marginal.
   *
   * Idempotence : si une `idempotencyKey` déjà connue est passée, le paiement
   * existant est retourné tel quel. Un webhook Stripe rejoué ne doit jamais
   * créer un second paiement.
   */
  public async createServicePayment(input: {
    appointmentId: string;
    amountCents: number;
    currency?: string;
    stripePaymentIntentId?: string;
    idempotencyKey?: string;
  }): Promise<ServicePayment> {
    const amountCents = Number(input.amountCents);
    if (!Number.isFinite(amountCents) || amountCents < 0) {
      throw new Error('Montant invalide.');
    }

    const supabase = getSupabaseServerClient();

    if (supabase && input.idempotencyKey) {
      const { data: existing, error } = await supabase.from('service_payments')
        .select('*').eq('idempotency_key', input.idempotencyKey).maybeSingle();
      ensureSuccess("contrôle d'idempotence du paiement", error);
      if (existing) return mapServicePaymentRow(existing);
    } else if (input.idempotencyKey) {
      for (const payment of this.payments.values()) {
        if (payment.idempotencyKey === input.idempotencyKey) return payment;
      }
    }

    const now = new Date().toISOString();
    const payment: ServicePayment = {
      id: randomUUID(),
      appointmentId: input.appointmentId,
      amountCents,
      currency: (input.currency || 'EUR').toUpperCase(),
      status: 'pending',
      stripePaymentIntentId: input.stripePaymentIntentId,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now
    };

    if (supabase) {
      const { error } = await supabase.from('service_payments').insert({
        id: payment.id,
        appointment_id: payment.appointmentId,
        amount_cents: payment.amountCents,
        currency: payment.currency,
        status: payment.status,
        stripe_payment_intent_id: payment.stripePaymentIntentId ?? null,
        idempotency_key: payment.idempotencyKey ?? null
      });
      ensureSuccess('création du paiement de prestation', error);
      return payment;
    }

    this.payments.set(payment.id, payment);
    return payment;
  }

  /**
   * Marque un paiement comme réglé.
   *
   * Idempotent : un paiement déjà `paid` est retourné inchangé plutôt que
   * re-daté. C'est ce qui rend un webhook rejoué sans effet de bord.
   */
  public async markServicePaymentPaid(
    paymentId: string,
    paidAt: Date = new Date()
  ): Promise<ServicePayment | undefined> {
    const supabase = getSupabaseServerClient();

    if (supabase) {
      if (!isUuid(paymentId)) return undefined;
      const { data: existing, error } = await supabase.from('service_payments')
        .select('*').eq('id', paymentId).maybeSingle();
      ensureSuccess('lecture du paiement de prestation', error);
      if (!existing) return undefined;
      const current = mapServicePaymentRow(existing);
      if (current.status === 'paid') return current;

      const { data: updated, error: updateError } = await supabase.from('service_payments')
        .update({ status: 'paid', paid_at: paidAt.toISOString(), updated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .select('*')
        .maybeSingle();
      ensureSuccess('confirmation du paiement de prestation', updateError);
      return updated ? mapServicePaymentRow(updated) : undefined;
    }

    const payment = this.payments.get(paymentId);
    if (!payment) return undefined;
    if (payment.status === 'paid') return payment;
    const confirmed: ServicePayment = {
      ...payment,
      status: 'paid',
      paidAt: paidAt.toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.payments.set(paymentId, confirmed);
    return confirmed;
  }

  /** Retrouve un paiement par son PaymentIntent Stripe — la clé du webhook. */
  public async getServicePaymentByIntent(stripePaymentIntentId: string): Promise<ServicePayment | undefined> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('service_payments')
        .select('*').eq('stripe_payment_intent_id', stripePaymentIntentId).maybeSingle();
      ensureSuccess('lecture du paiement par intent', error);
      return data ? mapServicePaymentRow(data) : undefined;
    }
    for (const payment of this.payments.values()) {
      if (payment.stripePaymentIntentId === stripePaymentIntentId) return payment;
    }
    return undefined;
  }

  public async getServicePaymentsForAppointment(appointmentId: string): Promise<ServicePayment[]> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      if (!isUuid(appointmentId)) return [];
      const { data, error } = await supabase.from('service_payments')
        .select('*').eq('appointment_id', appointmentId).order('created_at');
      ensureSuccess('lecture des paiements de la réservation', error);
      return (data || []).map(mapServicePaymentRow);
    }
    return Array.from(this.payments.values())
      .filter(payment => payment.appointmentId === appointmentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public async deleteClientData(userId: string): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      for (const table of ['client_dossier_shares', 'appointments']) {
        const { error } = await supabase.from(table).delete().eq('client_user_id', userId);
        ensureSuccess(`suppression des données professionnelles (${table})`, error);
      }
      return;
    }
    for (const [id, share] of this.shares) {
      if (share.clientUserId === userId) this.shares.delete(id);
    }
    for (const [id, appointment] of this.appointments) {
      if (appointment.clientUserId === userId) this.appointments.delete(id);
    }
  }
}

export const professionalStore = new KurlaProfessionalStore();
export { MINIMUM_REVIEWS_FOR_RATING, MINIMUM_ENDORSEMENTS_FOR_RATE };
