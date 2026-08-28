import { randomUUID } from 'node:crypto';

import {
  CURRENT_FAMILY_CONSENT_VERSION,
  FamilyAgeBand,
  FamilyConsentStatus,
  FamilyPlanStatus,
  FamilyPlanType,
  isMinorAgeBand,
  isProductSuitableForAgeBand,
  normalizeFamilyMemberInput,
  normalizeFamilyPlanInput,
} from '../familyProfiles';
import { getSupabaseServerClient } from '../supabaseClient';
// Import cyclique assumé et sûr : `toPublicProduct` n'est appelée qu'à
// l'exécution, jamais à l'initialisation du module.
import { toPublicProduct } from '../serverDb';
import { ensureDatabaseSuccess, isUuid } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.2 — espace famille (membres, plans, consentements), sorti de
 * `serverDb.ts`.
 */
export function mapFamilySpaceRow(store: SupabaseServerStore, row: any): any {
    return { id: row.id, ownerUserId: row.owner_user_id || row.ownerUserId, name: row.name || 'Ma famille', createdAt: row.created_at || row.createdAt, updatedAt: row.updated_at || row.updatedAt };
  }

export function mapFamilyMemberRow(store: SupabaseServerStore, row: any): any {
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

export function mapFamilyPlanRow(store: SupabaseServerStore, row: any): any {
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

export async function getFamilyDashboard(store: SupabaseServerStore, userId: string): Promise<{ spaces: any[]; members: any[]; plans: any[] }> {
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
        spaces: (spaceRows || []).map(row => mapFamilySpaceRow(store, row)),
        members: (memberRows || []).map(row => mapFamilyMemberRow(store, row)),
        plans: (planRows || []).map(row => mapFamilyPlanRow(store, row))
      };
    }
    const spaces = [...store.inMemoryFamilySpaces.values()].filter(space => space.ownerUserId === userId);
    const familyIds = new Set(spaces.map(space => space.id));
    return {
      spaces: spaces.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
      members: [...store.inMemoryFamilyMembers.values()].filter(member => familyIds.has(member.familyId)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
      plans: [...store.inMemoryFamilyPlans.values()].filter(plan => familyIds.has(plan.familyId)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    };
  }

export async function createFamilySpace(store: SupabaseServerStore, userId: string, input: any = {}): Promise<any> {
    const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 120) : '';
    if (!name) throw new Error('Le nom de l’espace famille est obligatoire.');
    const space = { id: randomUUID(), ownerUserId: userId, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('family_spaces').insert({ id: space.id, owner_user_id: userId, name }).select('*').single();
      ensureDatabaseSuccess('création de l’espace famille', error);
      return mapFamilySpaceRow(store, data);
    }
    store.inMemoryFamilySpaces.set(space.id, space);
    return space;
  }

export async function getOwnedFamilySpace(store: SupabaseServerStore, userId: string, familyId: string): Promise<any | undefined> {
    if (!isUuid(familyId)) return undefined;
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('family_spaces').select('*').eq('id', familyId).eq('owner_user_id', userId).maybeSingle();
      ensureDatabaseSuccess('vérification de l’espace famille', error);
      return data ? mapFamilySpaceRow(store, data) : undefined;
    }
    const space = store.inMemoryFamilySpaces.get(familyId);
    return space?.ownerUserId === userId ? space : undefined;
  }

export async function saveFamilyMember(store: SupabaseServerStore, userId: string, input: any): Promise<any> {
    const familyId = typeof input?.familyId === 'string' ? input.familyId.trim() : '';
    if (!(await getOwnedFamilySpace(store, userId, familyId))) throw new Error('Espace famille introuvable.');
    const dashboard = await getFamilyDashboard(store, userId);
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
      return mapFamilyMemberRow(store, data);
    }
    store.inMemoryFamilyMembers.set(id, row);
    return row;
  }

export async function deleteFamilyMember(store: SupabaseServerStore, userId: string, memberId: string): Promise<void> {
    const dashboard = await getFamilyDashboard(store, userId);
    const member = dashboard.members.find(item => item.id === memberId);
    if (!member) throw new Error('Profil familial introuvable.');
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('family_members').delete().eq('id', memberId);
      ensureDatabaseSuccess('suppression du profil familial', error);
    }
    store.inMemoryFamilyMembers.delete(memberId);
  }

export async function saveFamilyPlan(store: SupabaseServerStore, userId: string, input: any): Promise<any> {
    const familyId = typeof input?.familyId === 'string' ? input.familyId.trim() : '';
    if (!(await getOwnedFamilySpace(store, userId, familyId))) throw new Error('Espace famille introuvable.');
    const dashboard = await getFamilyDashboard(store, userId);
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
      const products = await store.getProducts({ publishedOnly: true });
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
      return mapFamilyPlanRow(store, data);
    }
    store.inMemoryFamilyPlans.set(id, row);
    return row;
  }

export async function deleteFamilyPlan(store: SupabaseServerStore, userId: string, planId: string): Promise<void> {
    const dashboard = await getFamilyDashboard(store, userId);
    const plan = dashboard.plans.find(item => item.id === planId);
    if (!plan) throw new Error('Plan familial introuvable.');
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from('family_plans').delete().eq('id', planId);
      ensureDatabaseSuccess('suppression du plan familial', error);
    }
    store.inMemoryFamilyPlans.delete(planId);
  }

export async function getFamilyProducts(store: SupabaseServerStore, ageBand?: string, audience?: string): Promise<any[]> {
    const products = await store.getProducts({ publishedOnly: true });
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
