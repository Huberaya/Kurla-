import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { isTraceableVerifiedEvidence, type EvidenceSourceKind, type EvidenceStatus, type PhotoprotectionEvidenceType } from '../skinMelaninEvidence';

import type { SupabaseServerStore } from '../serverDb';

export type SkinPhotoprotectionEvidence = {
  id: string;
  productId: string;
  evidenceType: PhotoprotectionEvidenceType;
  status: EvidenceStatus;
  sourceKind: EvidenceSourceKind;
  sourceLabel: string;
  sourceId?: string;
  sourceUrl?: string;
  storagePath?: string;
  capturedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  method?: string;
  testedPhototypes: string[];
  testedLights: string[];
  testedUndertones: string[];
  result: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const EVIDENCE_TYPES = ['spf_uva', 'white_cast', 'visible_light', 'undertone'] as const;
const EVIDENCE_STATUSES = ['verified', 'pending', 'rejected', 'not_provided'] as const;
const SOURCE_KINDS = ['supplier_document', 'laboratory_report', 'controlled_test', 'scientific_literature', 'brand_claim', 'user_observation'] as const;

function text(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function list(value: unknown, max = 20): string[] {
  return Array.isArray(value) ? value.map(item => String(item).trim()).filter(Boolean).slice(0, max) : [];
}

function mapEvidence(row: any): SkinPhotoprotectionEvidence {
  return {
    id: String(row.id),
    productId: String(row.product_id ?? row.productId),
    evidenceType: row.evidence_type ?? row.evidenceType,
    status: row.status,
    sourceKind: row.source_kind ?? row.sourceKind,
    sourceLabel: String(row.source_label ?? row.sourceLabel ?? ''),
    sourceId: row.source_id ?? row.sourceId ?? undefined,
    sourceUrl: row.source_url ?? row.sourceUrl ?? undefined,
    storagePath: row.storage_path ?? row.storagePath ?? undefined,
    capturedAt: row.captured_at ?? row.capturedAt ?? undefined,
    reviewedAt: row.reviewed_at ?? row.reviewedAt ?? undefined,
    reviewedBy: row.reviewed_by ?? row.reviewedBy ?? undefined,
    method: row.method ?? undefined,
    testedPhototypes: list(row.tested_phototypes ?? row.testedPhototypes),
    testedLights: list(row.tested_lights ?? row.testedLights),
    testedUndertones: list(row.tested_undertones ?? row.testedUndertones),
    result: row.result && typeof row.result === 'object' ? row.result : {},
    notes: row.notes ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
  };
}

function validateInput(input: any): Omit<SkinPhotoprotectionEvidence, 'id' | 'createdAt' | 'updatedAt'> {
  const evidenceType = text(input?.evidenceType || input?.evidence_type, 40) as PhotoprotectionEvidenceType | undefined;
  const status = text(input?.status, 20) as EvidenceStatus | undefined;
  const sourceKind = text(input?.sourceKind || input?.source_kind, 40) as EvidenceSourceKind | undefined;
  const sourceLabel = text(input?.sourceLabel || input?.source_label, 500);
  if (!evidenceType || !(EVIDENCE_TYPES as readonly string[]).includes(evidenceType)) throw new Error('Type de preuve photoprotection invalide.');
  if (!status || !(EVIDENCE_STATUSES as readonly string[]).includes(status)) throw new Error('Statut de preuve photoprotection invalide.');
  if (!sourceKind || !(SOURCE_KINDS as readonly string[]).includes(sourceKind)) throw new Error('Source de preuve photoprotection invalide.');
  if (!sourceLabel) throw new Error('Libellé de source obligatoire.');

  const sourceId = text(input?.sourceId || input?.source_id, 240);
  const sourceUrl = text(input?.sourceUrl || input?.source_url, 2000);
  const storagePath = text(input?.storagePath || input?.storage_path, 500);
  const capturedAt = text(input?.capturedAt || input?.captured_at, 40);
  const reviewedAt = text(input?.reviewedAt || input?.reviewed_at, 80);
  const method = text(input?.method, 1000);
  if (!sourceId && !sourceUrl && !storagePath) throw new Error('Un identifiant, une URL ou un chemin de preuve est obligatoire.');
  if (status === 'verified' && !isTraceableVerifiedEvidence({
    type: evidenceType,
    status,
    sourceKind,
    sourceLabel,
    sourceId,
    sourceUrl,
    storagePath,
    capturedAt,
    reviewedAt,
    method,
  })) {
    throw new Error('Une preuve vérifiée exige une source localisable, une date, une méthode et une relecture.');
  }

  return {
    productId: String(input?.productId || input?.product_id || '').trim(),
    evidenceType,
    status,
    sourceKind,
    sourceLabel,
    sourceId,
    sourceUrl,
    storagePath,
    capturedAt,
    reviewedAt,
    reviewedBy: text(input?.reviewedBy || input?.reviewed_by, 80),
    method,
    testedPhototypes: list(input?.testedPhototypes || input?.tested_phototypes),
    testedLights: list(input?.testedLights || input?.tested_lights),
    testedUndertones: list(input?.testedUndertones || input?.tested_undertones),
    result: input?.result && typeof input.result === 'object' && !Array.isArray(input.result) ? input.result : {},
    notes: text(input?.notes, 2000),
  };
}

export async function listSkinPhotoprotectionEvidence(
  store: SupabaseServerStore,
  productId?: string,
): Promise<SkinPhotoprotectionEvidence[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('skin_photoprotection_evidence').select('*').order('created_at', { ascending: false });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    ensureDatabaseSuccess('lecture des preuves photoprotection', error);
    return (data || []).map(mapEvidence);
  }
  const rows = ((store as any).inMemorySkinPhotoprotectionEvidence || []) as any[];
  return rows.filter(row => !productId || row.productId === productId).map(mapEvidence);
}

export async function addSkinPhotoprotectionEvidence(
  store: SupabaseServerStore,
  adminId: string,
  input: any,
): Promise<SkinPhotoprotectionEvidence> {
  const normalized = validateInput(input);
  if (!normalized.productId) throw new Error('productId obligatoire pour rattacher une preuve.');
  const product = await store.getAdminCatalogProducts();
  if (!product.some(item => String(item.id) === normalized.productId)) throw new Error('SKU produit introuvable.');

  const now = new Date().toISOString();
  const id = randomUUID();
  const row = {
    id,
    ...normalized,
    reviewedBy: normalized.reviewedBy || adminId,
    createdAt: now,
    updatedAt: now,
  };
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('skin_photoprotection_evidence').insert({
      id,
      product_id: normalized.productId,
      evidence_type: normalized.evidenceType,
      status: normalized.status,
      source_kind: normalized.sourceKind,
      source_label: normalized.sourceLabel,
      source_id: normalized.sourceId || null,
      source_url: normalized.sourceUrl || null,
      storage_path: normalized.storagePath || null,
      captured_at: normalized.capturedAt || null,
      reviewed_at: normalized.reviewedAt || null,
      reviewed_by: normalized.reviewedBy || adminId,
      method: normalized.method || null,
      tested_phototypes: normalized.testedPhototypes,
      tested_lights: normalized.testedLights,
      tested_undertones: normalized.testedUndertones,
      result: normalized.result,
      notes: normalized.notes || null,
      created_at: now,
      updated_at: now,
    }).select('*').single();
    ensureDatabaseSuccess('enregistrement de la preuve photoprotection', error);
    return mapEvidence(data);
  }
  const rows = ((store as any).inMemorySkinPhotoprotectionEvidence ||= []) as any[];
  rows.push(row);
  return mapEvidence(row);
}
