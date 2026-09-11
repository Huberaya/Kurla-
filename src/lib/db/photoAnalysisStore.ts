import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import type { PhotoAiAnalysisRecord, PhotoAiAnalysisStatus } from './types';
import type { SupabaseServerStore } from '../serverDb';

export interface CreatePhotoAiAnalysisInput {
  userId: string;
  photoId: string;
  status: PhotoAiAnalysisStatus;
  scope: string;
  provider: string;
  model: string;
  promptVersion: string;
  rulesVersion: string;
  responseSchemaVersion?: string;
  qualityGateVersion: string;
  inputSha256: string;
  declaredPhototype?: string;
  declaredLighting?: string;
  phototypeSource?: 'member_declared';
  lightingSource?: 'member_declared';
  validationProtocol?: string;
  validationStatus?: 'pilot_stratified_not_validated';
  quality?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorCode?: string;
  createdAt?: string;
  completedAt?: string | null;
}

function mapRow(row: any): PhotoAiAnalysisRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.userId),
    photoId: String(row.photo_id ?? row.photoId),
    status: row.status,
    scope: String(row.scope),
    provider: String(row.provider),
    model: String(row.model),
    promptVersion: String(row.prompt_version ?? row.promptVersion),
    rulesVersion: String(row.rules_version ?? row.rulesVersion),
    responseSchemaVersion: String(row.response_schema_version ?? row.responseSchemaVersion ?? 'C8-photo-pilot-response-schema-v1'),
    qualityGateVersion: String(row.quality_gate_version ?? row.qualityGateVersion),
    inputSha256: String(row.input_sha256 ?? row.inputSha256),
    declaredPhototype: row.declared_phototype ?? row.declaredPhototype ?? undefined,
    declaredLighting: row.declared_lighting ?? row.declaredLighting ?? undefined,
    phototypeSource: row.phototype_source ?? row.phototypeSource ?? 'member_declared',
    lightingSource: row.lighting_source ?? row.lightingSource ?? 'member_declared',
    validationProtocol: row.validation_protocol ?? row.validationProtocol ?? 'C8-photo-pilot-validation-v1',
    validationStatus: row.validation_status ?? row.validationStatus ?? 'pilot_stratified_not_validated',
    quality: row.quality && typeof row.quality === 'object' ? row.quality : undefined,
    output: row.output && typeof row.output === 'object' ? row.output : undefined,
    errorCode: row.error_code ?? row.errorCode ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt),
    completedAt: row.completed_at ?? row.completedAt ?? null
  };
}

export async function createPhotoAiAnalysis(store: SupabaseServerStore, input: CreatePhotoAiAnalysisInput): Promise<PhotoAiAnalysisRecord> {
  const createdAt = input.createdAt || new Date().toISOString();
  const record: PhotoAiAnalysisRecord = {
    id: randomUUID(),
    userId: input.userId,
    photoId: input.photoId,
    status: input.status,
    scope: input.scope,
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
    rulesVersion: input.rulesVersion,
    responseSchemaVersion: input.responseSchemaVersion || 'C8-photo-pilot-response-schema-v1',
    qualityGateVersion: input.qualityGateVersion,
    inputSha256: input.inputSha256,
    declaredPhototype: input.declaredPhototype,
    declaredLighting: input.declaredLighting,
    phototypeSource: input.phototypeSource || 'member_declared',
    lightingSource: input.lightingSource || 'member_declared',
    validationProtocol: input.validationProtocol || 'C8-photo-pilot-validation-v1',
    validationStatus: input.validationStatus || 'pilot_stratified_not_validated',
    quality: input.quality,
    output: input.output,
    errorCode: input.errorCode,
    createdAt,
    completedAt: input.completedAt ?? null
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('photo_ai_analyses').insert({
      id: record.id,
      user_id: record.userId,
      photo_id: record.photoId,
      status: record.status,
      scope: record.scope,
      provider: record.provider,
      model: record.model,
      prompt_version: record.promptVersion,
      rules_version: record.rulesVersion,
      response_schema_version: record.responseSchemaVersion,
      quality_gate_version: record.qualityGateVersion,
      input_sha256: record.inputSha256,
      declared_phototype: record.declaredPhototype || null,
      declared_lighting: record.declaredLighting || null,
      phototype_source: record.phototypeSource,
      lighting_source: record.lightingSource,
      validation_protocol: record.validationProtocol,
      validation_status: record.validationStatus,
      quality: record.quality || null,
      output: record.output || null,
      error_code: record.errorCode || null,
      created_at: record.createdAt,
      completed_at: record.completedAt || null
    }).select('*').single();
    ensureDatabaseSuccess('journalisation de l’analyse photo', error);
    return mapRow(data);
  }
  store.inMemoryPhotoAiAnalyses.unshift(record);
  return record;
}

export async function listPhotoAiAnalyses(store: SupabaseServerStore, userId: string, photoId?: string): Promise<PhotoAiAnalysisRecord[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('photo_ai_analyses').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (photoId) query = query.eq('photo_id', photoId);
    const { data, error } = await query;
    ensureDatabaseSuccess('lecture de la provenance des analyses photo', error);
    return (data || []).map(mapRow);
  }
  return store.inMemoryPhotoAiAnalyses.filter(item => item.userId === userId && (!photoId || item.photoId === photoId));
}

export async function getPhotoAiAnalysis(store: SupabaseServerStore, userId: string, analysisId: string): Promise<PhotoAiAnalysisRecord | undefined> {
  const rows = await listPhotoAiAnalyses(store, userId);
  return rows.find(row => row.id === analysisId);
}

export async function deletePhotoAiAnalysesForPhoto(store: SupabaseServerStore, userId: string, photoId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('photo_ai_analyses').delete().eq('user_id', userId).eq('photo_id', photoId);
    ensureDatabaseSuccess('suppression de la provenance des analyses photo', error);
  }
  store.inMemoryPhotoAiAnalyses = store.inMemoryPhotoAiAnalyses.filter(item => !(item.userId === userId && item.photoId === photoId));
}
