import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type {
  ProfessionalApplication,
  ProfessionalApplicationStatus,
  PublicProfessionalEntry,
  SupabaseServerStore,
} from '../serverDb';

/**
 * CHANTIER 8.2b — candidatures des professionnels (annuaire, statut, revue),
 * sorties de `serverDb.ts`.
 */
  // ============================================================
  // PROFESSIONAL APPLICATIONS
  // ============================================================
export async function createProfessionalApplication(store: SupabaseServerStore, input: Omit<ProfessionalApplication, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProfessionalApplication> {
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

    store.inMemoryProfessionalApplications.unshift(application);
    return application;
  }

export async function getProfessionalApplications(store: SupabaseServerStore): Promise<ProfessionalApplication[]> {
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
    return [...store.inMemoryProfessionalApplications];
  }

  /**
   * Annuaire public des professionnels.
   *
   * Deux règles strictes, opposées à ce que faisait `MOCK_PROS` :
   *  - seuls les profils approuvés par un administrateur apparaissent ;
   *  - aucune donnée de contact (email, téléphone) n'est exposée publiquement.
   *
   * Un annuaire vide est un état normal et honnête : on l'affiche comme tel,
   * plutôt que de le remplir de personnes qui n'existent pas.
   */
export async function getPublicProfessionalDirectory(store: SupabaseServerStore): Promise<PublicProfessionalEntry[]> {
    const approved = (await getProfessionalApplications(store)).filter(application => application.status === 'approved');
    return approved.map(application => ({
      id: application.id,
      name: application.name,
      city: application.city,
      profession: application.profession,
      experience: application.experience,
      portfolioUrl: application.portfolioUrl,
      verified: true,
      approvedAt: application.updatedAt
    }));
  }

export async function updateProfessionalApplication(store: SupabaseServerStore, id: string, status: ProfessionalApplicationStatus, adminComment?: string): Promise<ProfessionalApplication | undefined> {
    const current = (await getProfessionalApplications(store)).find(application => application.id === id);
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

    const index = store.inMemoryProfessionalApplications.findIndex(application => application.id === id);
    if (index >= 0) store.inMemoryProfessionalApplications[index] = updated;
    else if (!supabase) store.inMemoryProfessionalApplications.unshift(updated);
    return updated;
  }
