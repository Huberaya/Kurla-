import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import {
  CANDIDATE_GOVERNANCE,
  DEFAULT_CANDIDATES,
  DEFAULT_PROSPECTS,
  PROSPECT_CONTACT_TYPES,
  PROSPECT_STATUSES,
  TRI_STATES,
} from '../prospectSeed';

import type { SupabaseServerStore } from '../serverDb';

/**
 * PROSPECTS DE SOURCING & RÉFÉRENCES À INTÉGRER.
 *
 * Équivalent structuré du classeur de suivi, dans l'admin. Un prospect n'est
 * PAS un fournisseur vérifié (`suppliers`) : c'est une cible à contacter. Il
 * ne devient fournisseur qu'une fois les documents de conformité reçus.
 *
 * Mêmes règles que le reste du chantier d'approvisionnement :
 *  - aucun tarif, MOQ, date ou email n'est inventé : tout champ commercial est
 *    nul tant qu'aucune réponse réelle ne l'a rempli ;
 *  - le repli mémoire est amorcé avec le plan de prospection (21 cibles) pour
 *    que l'écran soit utilisable hors base, comme le reste des magasins.
 */

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export type ProspectContactType = (typeof PROSPECT_CONTACT_TYPES)[number];
export type TriState = (typeof TRI_STATES)[number];
export type CandidateGovernance = (typeof CANDIDATE_GOVERNANCE)[number];

export interface SourcingProspect {
  id: string;
  name: string;
  route: 'A' | 'B';
  contactType: ProspectContactType;
  specialty?: string;
  sourceUrl?: string;
  contactEmail?: string;
  contactName?: string;
  channel?: string;
  status: ProspectStatus;
  firstContactedOn?: string;
  followUpOn?: string;
  followUpStatus?: string;
  wholesalePricing?: TriState;
  moq?: string;
  leadTimeFr?: string;
  dropshipping?: TriState;
  inciProvided?: TriState;
  euCompliance?: TriState;
  visualsGranted?: TriState;
  samplesReceived?: TriState;
  decision?: string;
  decidedOn?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCandidate {
  id: string;
  prospectId: string;
  brand: string;
  product: string;
  routineStep?: string;
  category?: string;
  sourcedVia?: string;
  inciReceived: boolean;
  ingredientsMapped: number;
  purchasePriceCents: number | null;
  publicPriceCents: number | null;
  marginPct: number | null;
  firstOrderQty: number | null;
  sampleValidated: boolean;
  visualsReceived: boolean;
  governanceStatus: CandidateGovernance;
  publishedOn?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function text(value: unknown, max = 4000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}
function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
function tri(value: unknown): TriState | undefined {
  return oneOf(TRI_STATES, value);
}
function dateOnly(value: unknown): string | undefined {
  const raw = text(value, 40);
  if (!raw) return undefined;
  if (Number.isNaN(Date.parse(raw))) throw new Error(`Date illisible : « ${raw} ».`);
  return raw.slice(0, 10);
}
function nonNegInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}
function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function mapProspect(row: any): SourcingProspect {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    route: row.route === 'B' ? 'B' : 'A',
    contactType: (oneOf(PROSPECT_CONTACT_TYPES, row.contact_type ?? row.contactType) ?? 'brand_fr') as ProspectContactType,
    specialty: row.specialty ?? undefined,
    sourceUrl: row.source_url ?? row.sourceUrl ?? undefined,
    contactEmail: row.contact_email ?? row.contactEmail ?? undefined,
    contactName: row.contact_name ?? row.contactName ?? undefined,
    channel: row.channel ?? undefined,
    status: (oneOf(PROSPECT_STATUSES, row.status) ?? 'to_contact') as ProspectStatus,
    firstContactedOn: row.first_contacted_on ?? row.firstContactedOn ?? undefined,
    followUpOn: row.follow_up_on ?? row.followUpOn ?? undefined,
    followUpStatus: row.follow_up_status ?? row.followUpStatus ?? undefined,
    wholesalePricing: tri(row.wholesale_pricing ?? row.wholesalePricing),
    moq: row.moq ?? undefined,
    leadTimeFr: row.lead_time_fr ?? row.leadTimeFr ?? undefined,
    dropshipping: tri(row.dropshipping),
    inciProvided: tri(row.inci_provided ?? row.inciProvided),
    euCompliance: tri(row.eu_compliance ?? row.euCompliance),
    visualsGranted: tri(row.visuals_granted ?? row.visualsGranted),
    samplesReceived: tri(row.samples_received ?? row.samplesReceived),
    decision: row.decision ?? undefined,
    decidedOn: row.decided_on ?? row.decidedOn ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  };
}

function mapCandidate(row: any): ProductCandidate {
  return {
    id: String(row.id),
    prospectId: String(row.prospect_id ?? row.prospectId ?? ''),
    brand: String(row.brand ?? ''),
    product: String(row.product ?? ''),
    routineStep: row.routine_step ?? row.routineStep ?? undefined,
    category: row.category ?? undefined,
    sourcedVia: row.sourced_via ?? row.sourcedVia ?? undefined,
    inciReceived: bool(row.inci_received ?? row.inciReceived),
    ingredientsMapped: Number(row.ingredients_mapped ?? row.ingredientsMapped ?? 0) || 0,
    purchasePriceCents: nonNegInt(row.purchase_price_cents ?? row.purchasePriceCents),
    publicPriceCents: nonNegInt(row.public_price_cents ?? row.publicPriceCents),
    marginPct: (() => {
      const v = row.margin_pct ?? row.marginPct;
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
    })(),
    firstOrderQty: nonNegInt(row.first_order_qty ?? row.firstOrderQty),
    sampleValidated: bool(row.sample_validated ?? row.sampleValidated),
    visualsReceived: bool(row.visuals_received ?? row.visualsReceived),
    governanceStatus: (oneOf(CANDIDATE_GOVERNANCE, row.governance_status ?? row.governanceStatus) ?? 'blocked') as CandidateGovernance,
    publishedOn: row.published_on ?? row.publishedOn ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
  };
}

/** Réplique des prospects d'amorçage sous forme d'objets mémoire (camelCase). */
function seedProspects(): SourcingProspect[] {
  return DEFAULT_PROSPECTS.map((p) => ({
    id: p.id,
    name: p.name,
    route: p.route,
    contactType: p.contactType as ProspectContactType,
    specialty: p.specialty,
    sourceUrl: p.sourceUrl,
    status: 'to_contact' as ProspectStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
function seedCandidates(): ProductCandidate[] {
  return DEFAULT_CANDIDATES.map((c) => ({
    id: c.id,
    prospectId: c.prospectId,
    brand: c.brand,
    product: c.product,
    routineStep: c.routineStep,
    category: c.category,
    sourcedVia: c.brand,
    inciReceived: false,
    ingredientsMapped: 0,
    purchasePriceCents: null,
    publicPriceCents: null,
    marginPct: null,
    firstOrderQty: null,
    sampleValidated: false,
    visualsReceived: false,
    governanceStatus: 'blocked' as CandidateGovernance,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

// ------------------------------------------------------------------ Lecture

export async function listProspects(store: SupabaseServerStore): Promise<SourcingProspect[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('sourcing_prospects').select('*').order('route').order('id');
    ensureDatabaseSuccess('lecture des prospects', error);
    if (data && data.length > 0) return data.map(mapProspect);
    // Base connectée mais table vide : on renvoie l'amorçage mémoire pour que
    // l'écran soit utilisable avant que la migration soit appliquée.
  }
  return [...store.inMemoryProspects].sort((a, b) => a.id.localeCompare(b.id));
}

export async function getProspect(store: SupabaseServerStore, id: string): Promise<SourcingProspect | undefined> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('sourcing_prospects').select('*').eq('id', id).maybeSingle();
    ensureDatabaseSuccess('lecture d’un prospect', error);
    if (data) return mapProspect(data);
  }
  return store.inMemoryProspects.find((p) => p.id === id);
}

export async function listCandidates(store: SupabaseServerStore, prospectId?: string): Promise<ProductCandidate[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('sourcing_product_candidates').select('*');
    if (prospectId) query = query.eq('prospect_id', prospectId);
    const { data, error } = await query.order('id');
    ensureDatabaseSuccess('lecture des références candidates', error);
    if (data && data.length > 0) return data.map(mapCandidate);
  }
  const rows = prospectId
    ? store.inMemoryCandidates.filter((c) => c.prospectId === prospectId)
    : [...store.inMemoryCandidates];
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

// ------------------------------------------------------------------ Écriture

export async function upsertProspect(store: SupabaseServerStore, adminId: string | null, input: any): Promise<SourcingProspect> {
  const name = text(input?.name, 200);
  if (!name) throw new Error('Le nom du contact est obligatoire.');
  const route = input?.route === 'B' ? 'B' : 'A';
  const contactType = oneOf(PROSPECT_CONTACT_TYPES, input?.contactType ?? input?.contact_type) ?? 'brand_fr';
  const status = oneOf(PROSPECT_STATUSES, input?.status) ?? 'to_contact';

  const existingId = text(input?.id, 80);
  const existing = existingId ? await getProspect(store, existingId) : undefined;
  const id = existing?.id ?? existingId ?? `p-${randomUUID()}`;
  const now = new Date().toISOString();

  const record: SourcingProspect = {
    id,
    name,
    route,
    contactType,
    specialty: text(input?.specialty, 400) ?? existing?.specialty,
    sourceUrl: text(input?.sourceUrl ?? input?.source_url, 400) ?? existing?.sourceUrl,
    contactEmail: text(input?.contactEmail ?? input?.contact_email, 200) ?? existing?.contactEmail,
    contactName: text(input?.contactName ?? input?.contact_name, 200) ?? existing?.contactName,
    channel: text(input?.channel, 120) ?? existing?.channel,
    status,
    firstContactedOn: dateOnly(input?.firstContactedOn ?? input?.first_contacted_on) ?? existing?.firstContactedOn,
    followUpOn: dateOnly(input?.followUpOn ?? input?.follow_up_on) ?? existing?.followUpOn,
    followUpStatus: text(input?.followUpStatus ?? input?.follow_up_status, 60) ?? existing?.followUpStatus,
    wholesalePricing: tri(input?.wholesalePricing ?? input?.wholesale_pricing) ?? existing?.wholesalePricing,
    moq: text(input?.moq, 200) ?? existing?.moq,
    leadTimeFr: text(input?.leadTimeFr ?? input?.lead_time_fr, 200) ?? existing?.leadTimeFr,
    dropshipping: tri(input?.dropshipping) ?? existing?.dropshipping,
    inciProvided: tri(input?.inciProvided ?? input?.inci_provided) ?? existing?.inciProvided,
    euCompliance: tri(input?.euCompliance ?? input?.eu_compliance) ?? existing?.euCompliance,
    visualsGranted: tri(input?.visualsGranted ?? input?.visuals_granted) ?? existing?.visualsGranted,
    samplesReceived: tri(input?.samplesReceived ?? input?.samples_received) ?? existing?.samplesReceived,
    decision: text(input?.decision, 40) ?? existing?.decision,
    decidedOn: dateOnly(input?.decidedOn ?? input?.decided_on) ?? existing?.decidedOn,
    notes: text(input?.notes, 8000) ?? existing?.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('sourcing_prospects').upsert({
      id: record.id,
      name: record.name,
      route: record.route,
      contact_type: record.contactType,
      specialty: record.specialty ?? null,
      source_url: record.sourceUrl ?? null,
      contact_email: record.contactEmail ?? null,
      contact_name: record.contactName ?? null,
      channel: record.channel ?? null,
      status: record.status,
      first_contacted_on: record.firstContactedOn ?? null,
      follow_up_on: record.followUpOn ?? null,
      follow_up_status: record.followUpStatus ?? null,
      wholesale_pricing: record.wholesalePricing ?? null,
      moq: record.moq ?? null,
      lead_time_fr: record.leadTimeFr ?? null,
      dropshipping: record.dropshipping ?? null,
      inci_provided: record.inciProvided ?? null,
      eu_compliance: record.euCompliance ?? null,
      visuals_granted: record.visualsGranted ?? null,
      samples_received: record.samplesReceived ?? null,
      decision: record.decision ?? null,
      decided_on: record.decidedOn ?? null,
      notes: record.notes ?? null,
      created_by: adminId,
      updated_at: now,
    }, { onConflict: 'id' });
    ensureDatabaseSuccess('enregistrement du prospect', error);
    return record;
  }

  const index = store.inMemoryProspects.findIndex((p) => p.id === record.id);
  if (index >= 0) store.inMemoryProspects[index] = record;
  else store.inMemoryProspects.push(record);
  return record;
}

export async function upsertCandidate(store: SupabaseServerStore, adminId: string | null, input: any): Promise<ProductCandidate> {
  const brand = text(input?.brand, 200);
  const product = text(input?.product, 300);
  if (!brand || !product) throw new Error('La marque et le nom du produit sont obligatoires.');
  const governanceStatus = oneOf(CANDIDATE_GOVERNANCE, input?.governanceStatus ?? input?.governance_status) ?? 'blocked';

  const existingId = text(input?.id, 80);
  const existing = existingId ? store.inMemoryCandidates.find((c) => c.id === existingId) : undefined;
  const id = existing?.id ?? existingId ?? `pc-${randomUUID()}`;
  const now = new Date().toISOString();

  const record: ProductCandidate = {
    id,
    prospectId: text(input?.prospectId ?? input?.prospect_id, 80) ?? existing?.prospectId ?? '',
    brand,
    product,
    routineStep: text(input?.routineStep ?? input?.routine_step, 120) ?? existing?.routineStep,
    category: text(input?.category, 80) ?? existing?.category,
    sourcedVia: text(input?.sourcedVia ?? input?.sourced_via, 200) ?? existing?.sourcedVia,
    inciReceived: bool(input?.inciReceived ?? input?.inci_received) || existing?.inciReceived || false,
    ingredientsMapped: nonNegInt(input?.ingredientsMapped ?? input?.ingredients_mapped) ?? existing?.ingredientsMapped ?? 0,
    purchasePriceCents: nonNegInt(input?.purchasePriceCents ?? input?.purchase_price_cents) ?? existing?.purchasePriceCents ?? null,
    publicPriceCents: nonNegInt(input?.publicPriceCents ?? input?.public_price_cents) ?? existing?.publicPriceCents ?? null,
    marginPct: (() => {
      const raw = input?.marginPct ?? input?.margin_pct;
      if (raw === null || raw === undefined || raw === '') return existing?.marginPct ?? null;
      const n = Number(raw);
      return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 100) / 100)) : existing?.marginPct ?? null;
    })(),
    firstOrderQty: nonNegInt(input?.firstOrderQty ?? input?.first_order_qty) ?? existing?.firstOrderQty ?? null,
    sampleValidated: bool(input?.sampleValidated ?? input?.sample_validated) || existing?.sampleValidated || false,
    visualsReceived: bool(input?.visualsReceived ?? input?.visuals_received) || existing?.visualsReceived || false,
    governanceStatus,
    publishedOn: dateOnly(input?.publishedOn ?? input?.published_on) ?? existing?.publishedOn,
    notes: text(input?.notes, 8000) ?? existing?.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('sourcing_product_candidates').upsert({
      id: record.id,
      prospect_id: record.prospectId || null,
      brand: record.brand,
      product: record.product,
      routine_step: record.routineStep ?? null,
      category: record.category ?? null,
      sourced_via: record.sourcedVia ?? null,
      inci_received: record.inciReceived,
      ingredients_mapped: record.ingredientsMapped,
      purchase_price_cents: record.purchasePriceCents,
      public_price_cents: record.publicPriceCents,
      margin_pct: record.marginPct,
      first_order_qty: record.firstOrderQty,
      sample_validated: record.sampleValidated,
      visuals_received: record.visualsReceived,
      governance_status: record.governanceStatus,
      published_on: record.publishedOn ?? null,
      notes: record.notes ?? null,
      created_by: adminId,
      updated_at: now,
    }, { onConflict: 'id' });
    ensureDatabaseSuccess('enregistrement de la référence candidate', error);
    return record;
  }

  const index = store.inMemoryCandidates.findIndex((c) => c.id === record.id);
  if (index >= 0) store.inMemoryCandidates[index] = record;
  else store.inMemoryCandidates.push(record);
  return record;
}

/** Amorçage mémoire du plan de prospection (appelé une fois à l'initialisation). */
export function seedInMemoryProspects(store: SupabaseServerStore): void {
  if (store.inMemoryProspects.length === 0) store.inMemoryProspects = seedProspects();
  if (store.inMemoryCandidates.length === 0) store.inMemoryCandidates = seedCandidates();
}
