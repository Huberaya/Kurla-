import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { getBeautyProfile } from './beautyProfileStore';
import {
  BRAND_TEST_K_THRESHOLD,
  buildBrandTestReport,
  canDeclareBrandTestOutcome,
  canJoinBrandTest,
  canTransitionBrandTest,
  profileMatchesNeed
} from '../brandTest';
import { SIGNAL_VALENCE, isOutcomeSignal } from '../outcomeEvidence';

import type { BrandTestAggregateRow, BrandTestCohort, BrandTestReport, BrandTestStatus } from '../brandTest';
import type { BeautyProfile } from '../beautyProfile';
import type { BrandTestObservation, BrandTestParticipation, BrandTestRequest, SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.6c2 — persistance des tests produits ciblés.
 *
 * Trois règles d'écriture :
 *
 *  1. **Le consentement précède la déclaration.** `declareBrandTestOutcome`
 *     refuse un membre sans participation consentie, et refuse un membre retiré.
 *  2. **Le retrait retire.** Un membre retiré n'est plus compté dans les
 *     effectifs ; son retrait reste compté, parce que c'est une information sur
 *     le test, pas sur la personne.
 *  3. **L'agrégation a lieu ici, et nulle part ailleurs.** `buildBrandTestReport`
 *     ne reçoit que des effectifs : ce module est le seul endroit où des lignes
 *     individuelles existent encore.
 */

function mapRequestRow(row: any): BrandTestRequest {
  return {
    id: row.id,
    brandUserId: row.brand_user_id,
    brandName: row.brand_name,
    contactEmail: row.contact_email,
    productName: row.product_name,
    productId: row.product_id || null,
    hypothesis: row.hypothesis,
    cohort: typeof row.cohort === 'string' ? JSON.parse(row.cohort) : row.cohort,
    targetParticipants: row.target_participants,
    durationDays: row.duration_days,
    status: row.status,
    submittedAt: row.submitted_at,
    adminComment: row.admin_comment || null
  };
}

export interface CreateBrandTestRequestInput {
  brandUserId: string;
  brandName: string;
  contactEmail: string;
  productName: string;
  productId?: string | null;
  hypothesis: string;
  cohort: BrandTestCohort;
  targetParticipants: number;
  durationDays: number;
}

export async function createBrandTestRequest(
  store: SupabaseServerStore,
  input: CreateBrandTestRequestInput
): Promise<BrandTestRequest> {
  const now = new Date().toISOString();
  const request: BrandTestRequest = {
    id: randomUUID(),
    brandUserId: input.brandUserId,
    brandName: input.brandName,
    contactEmail: input.contactEmail,
    productName: input.productName,
    productId: input.productId ?? null,
    hypothesis: input.hypothesis,
    cohort: input.cohort,
    targetParticipants: input.targetParticipants,
    durationDays: input.durationDays,
    status: 'submitted',
    submittedAt: now,
    adminComment: null
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_test_requests').insert({
      id: request.id,
      brand_user_id: request.brandUserId,
      brand_name: request.brandName,
      contact_email: request.contactEmail,
      product_name: request.productName,
      product_id: request.productId,
      hypothesis: request.hypothesis,
      cohort: request.cohort,
      target_participants: request.targetParticipants,
      duration_days: request.durationDays,
      status: request.status,
      submitted_at: request.submittedAt,
      admin_comment: request.adminComment
    });
    ensureDatabaseSuccess('dépôt de la demande de test marque', error);
  }

  store.inMemoryBrandTestRequests.unshift(request);
  return request;
}

export async function getBrandTestRequests(store: SupabaseServerStore): Promise<BrandTestRequest[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('brand_test_requests')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(500);
    ensureDatabaseSuccess('lecture des demandes de test marque', error);
    return (data || []).map(mapRequestRow);
  }
  return [...store.inMemoryBrandTestRequests];
}

export async function getBrandTestRequest(
  store: SupabaseServerStore,
  id: string
): Promise<BrandTestRequest | undefined> {
  const requests = await getBrandTestRequests(store);
  return requests.find(request => request.id === id);
}

/** Tests ouverts aux membres : recrutement en cours ou test en cours. */
export async function getOpenBrandTests(store: SupabaseServerStore): Promise<BrandTestRequest[]> {
  const requests = await getBrandTestRequests(store);
  return requests.filter(request => request.status === 'recruiting' || request.status === 'running');
}

export async function reviewBrandTestRequest(
  store: SupabaseServerStore,
  id: string,
  status: BrandTestStatus,
  adminComment?: string
): Promise<BrandTestRequest> {
  const current = await getBrandTestRequest(store, id);
  if (!current) throw new Error('Demande de test introuvable.');
  if (!canTransitionBrandTest(current.status, status)) {
    throw new Error(`Transition refusée : ${current.status} → ${status}.`);
  }

  const updated: BrandTestRequest = {
    ...current,
    status,
    adminComment: adminComment?.trim() ? adminComment.trim() : current.adminComment
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('brand_test_requests')
      .update({ status: updated.status, admin_comment: updated.adminComment })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    ensureDatabaseSuccess('revue de la demande de test marque', error);
    if (!data) throw new Error('Demande de test introuvable.');
    return mapRequestRow(data);
  }

  const index = store.inMemoryBrandTestRequests.findIndex(request => request.id === id);
  if (index >= 0) store.inMemoryBrandTestRequests[index] = updated;
  return updated;
}

/**
 * Un membre rejoint un test. Le consentement est daté ici, par le serveur — il
 * ne vient jamais du corps de la requête.
 */
export async function joinBrandTest(
  store: SupabaseServerStore,
  testId: string,
  userId: string
): Promise<BrandTestParticipation> {
  const request = await getBrandTestRequest(store, testId);
  if (!request) throw new Error('Test introuvable.');
  if (!canJoinBrandTest(request.status)) {
    throw new Error('Ce test n’accepte plus de participants.');
  }

  const existing = (await getBrandTestParticipations(store, testId)).find(item => item.userId === userId);
  if (existing) return existing;

  // Un membre hors cohorte est refusé, pas ignoré. Sans ce refus, ses
  // déclarations seraient enregistrées puis écartées en silence au moment de
  // l'agrégation : un consentement pris pour rien.
  const record = await getBeautyProfile(store, userId);
  const profile = record?.profile as BeautyProfile | undefined;
  if (!profile) throw new Error('Votre profil beauté est nécessaire pour vérifier que le test vous correspond.');
  if (!request.cohort.needs.some(need => profileMatchesNeed(profile, need))) {
    throw new Error('Vos déclarations ne correspondent pas au besoin ciblé par ce test.');
  }

  const participation: BrandTestParticipation = {
    id: randomUUID(),
    testId,
    userId,
    consentAt: new Date().toISOString(),
    withdrawnAt: null
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_test_participations').insert({
      id: participation.id,
      test_id: testId,
      user_id: userId,
      consent_at: participation.consentAt,
      withdrawn_at: null
    });
    ensureDatabaseSuccess('participation au test marque', error);
  }

  store.inMemoryBrandTestParticipations.push(participation);
  return participation;
}

export async function withdrawFromBrandTest(
  store: SupabaseServerStore,
  testId: string,
  userId: string
): Promise<BrandTestParticipation> {
  const participation = (await getBrandTestParticipations(store, testId)).find(item => item.userId === userId);
  if (!participation) throw new Error('Aucune participation à ce test.');
  if (participation.withdrawnAt) return participation;

  const updated: BrandTestParticipation = { ...participation, withdrawnAt: new Date().toISOString() };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase
      .from('brand_test_participations')
      .update({ withdrawn_at: updated.withdrawnAt })
      .eq('id', participation.id);
    ensureDatabaseSuccess('retrait du test marque', error);
  }

  const index = store.inMemoryBrandTestParticipations.findIndex(item => item.id === participation.id);
  if (index >= 0) store.inMemoryBrandTestParticipations[index] = updated;
  return updated;
}

export async function getBrandTestParticipations(
  store: SupabaseServerStore,
  testId: string
): Promise<BrandTestParticipation[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('brand_test_participations')
      .select('*')
      .eq('test_id', testId)
      .limit(5_000);
    ensureDatabaseSuccess('lecture des participations', error);
    return (data || []).map(row => ({
      id: row.id,
      testId: row.test_id,
      userId: row.user_id,
      consentAt: row.consent_at,
      withdrawnAt: row.withdrawn_at || null
    }));
  }
  return store.inMemoryBrandTestParticipations.filter(item => item.testId === testId);
}

/**
 * Enregistre une déclaration de résultat.
 *
 * Quatre refus : test introuvable, test hors course, membre sans consentement,
 * membre retiré. Un signal inconnu est refusé aussi — ce qui entre dans un
 * agrégat destiné à une marque doit être un fait qualifié.
 */
export async function declareBrandTestOutcome(
  store: SupabaseServerStore,
  testId: string,
  userId: string,
  signal: string
): Promise<BrandTestObservation> {
  const request = await getBrandTestRequest(store, testId);
  if (!request) throw new Error('Test introuvable.');
  if (!canDeclareBrandTestOutcome(request.status)) throw new Error('Ce test n’accepte pas de déclaration.');
  if (!isOutcomeSignal(signal)) throw new Error('Signal de résultat inconnu.');

  const participation = (await getBrandTestParticipations(store, testId)).find(item => item.userId === userId);
  if (!participation || !participation.consentAt) throw new Error('Aucun consentement enregistré pour ce test.');
  if (participation.withdrawnAt) throw new Error('Vous vous êtes retiré de ce test.');

  const observation: BrandTestObservation = {
    id: randomUUID(),
    testId,
    userId,
    signal,
    declaredAt: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('brand_test_observations').insert({
      id: observation.id,
      test_id: testId,
      user_id: userId,
      signal: observation.signal,
      declared_at: observation.declaredAt
    });
    ensureDatabaseSuccess('déclaration de résultat', error);
  }

  store.inMemoryBrandTestObservations.push(observation);
  return observation;
}

export async function getBrandTestObservations(
  store: SupabaseServerStore,
  testId: string
): Promise<BrandTestObservation[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('brand_test_observations')
      .select('*')
      .eq('test_id', testId)
      .limit(20_000);
    ensureDatabaseSuccess('lecture des déclarations', error);
    return (data || []).map(row => ({
      id: row.id,
      testId: row.test_id,
      userId: row.user_id,
      signal: row.signal,
      declaredAt: row.declared_at
    }));
  }
  return store.inMemoryBrandTestObservations.filter(item => item.testId === testId);
}

/**
 * Éligibilité d'un membre aux tests ouverts.
 *
 * La réponse ne contient que `eligible` : aucun champ du profil n'est renvoyé,
 * parce que cette route n'a pas à révéler à un écran ce que le membre a déclaré
 * ailleurs que chez lui.
 */
export async function getBrandTestEligibility(
  store: SupabaseServerStore,
  userId: string
): Promise<Array<{ testId: string; brandName: string; productName: string; status: BrandTestStatus; eligible: boolean; alreadyJoined: boolean; withdrawn: boolean }>> {
  const [tests, record] = await Promise.all([getOpenBrandTests(store), getBeautyProfile(store, userId)]);
  const profile: BeautyProfile | undefined = record?.profile as BeautyProfile | undefined;

  const out: Array<{ testId: string; brandName: string; productName: string; status: BrandTestStatus; eligible: boolean; alreadyJoined: boolean; withdrawn: boolean }> = [];
  for (const test of tests) {
    const participation = (await getBrandTestParticipations(store, test.id)).find(item => item.userId === userId);
    out.push({
      testId: test.id,
      brandName: test.brandName,
      productName: test.productName,
      status: test.status,
      eligible: profile ? test.cohort.needs.some(need => profileMatchesNeed(profile, need)) : false,
      alreadyJoined: Boolean(participation && !participation.withdrawnAt),
      withdrawn: Boolean(participation?.withdrawnAt)
    });
  }
  return out;
}

/**
 * Agrège les lignes individuelles en effectifs, puis construit le rapport.
 *
 * Un membre est rattaché à **un seul** besoin — le premier de la cohorte qu'il
 * déclare — pour que les cellules soient disjointes : sans cette règle, un
 * membre déclarant trois besoins serait compté trois fois et le total serait
 * faux. Les membres retirés sont exclus des effectifs et comptés à part.
 */
export async function buildBrandTestReportForRequest(
  store: SupabaseServerStore,
  testId: string
): Promise<BrandTestReport> {
  const request = await getBrandTestRequest(store, testId);
  if (!request) throw new Error('Test introuvable.');

  const [participations, observations] = await Promise.all([
    getBrandTestParticipations(store, testId),
    getBrandTestObservations(store, testId)
  ]);

  const withdrawnUserIds = new Set(participations.filter(item => item.withdrawnAt).map(item => item.userId));
  const consentedUserIds = new Set(
    participations.filter(item => item.consentAt && !item.withdrawnAt).map(item => item.userId)
  );

  // Rattachement d'un membre à un seul besoin de la cohorte.
  const needOfUser = new Map<string, string>();
  for (const userId of consentedUserIds) {
    const record = await getBeautyProfile(store, userId);
    const profile = record?.profile as BeautyProfile | undefined;
    if (!profile) continue;
    const matched = request.cohort.needs.find(need => profileMatchesNeed(profile, need));
    if (matched) needOfUser.set(userId, matched);
  }

  const rows: BrandTestAggregateRow[] = request.cohort.needs.map(need => ({
    need,
    participants: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    unknown: 0,
    withdrawals: 0
  }));
  const rowByNeed = new Map(rows.map(row => [row.need, row]));

  for (const userId of withdrawnUserIds) {
    const record = await getBeautyProfile(store, userId).catch(() => undefined);
    const profile = record?.profile as BeautyProfile | undefined;
    const matched = profile ? request.cohort.needs.find(need => profileMatchesNeed(profile, need)) : undefined;
    const row = matched ? rowByNeed.get(matched) : undefined;
    if (row) row.withdrawals += 1;
  }

  const countedUsers = new Set<string>();
  for (const observation of observations) {
    if (withdrawnUserIds.has(observation.userId)) continue;
    const need = needOfUser.get(observation.userId);
    if (!need) continue;
    const row = rowByNeed.get(need);
    if (!row) continue;

    if (!countedUsers.has(observation.userId)) {
      row.participants += 1;
      countedUsers.add(observation.userId);
    }
    if (!isOutcomeSignal(observation.signal)) {
      row.unknown += 1;
      continue;
    }
    const valence = SIGNAL_VALENCE[observation.signal];
    if (valence === 1) row.positive += 1;
    else if (valence === -1) row.negative += 1;
    else row.neutral += 1;
  }

  return buildBrandTestReport({
    testId: request.id,
    brandName: request.brandName,
    productName: request.productName,
    hypothesis: request.hypothesis,
    cohortNeeds: request.cohort.needs,
    rows,
    kThreshold: BRAND_TEST_K_THRESHOLD
  });
}
