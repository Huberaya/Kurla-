import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { getSupplierById } from './supplierStore';
import { assertAffiliateUrl } from '../affiliateOffer';
import {
  isSupplyModel,
  mapProductSource,
  selectPrimarySource,
  SUPPLY_MODELS,
  type ProductSource,
} from '../supplyModel';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 4 — offres produit × fournisseur (`product_sources`).
 *
 * L'offre n'est PAS `products.supplier_id` (1:1, projection) ni un nom libre.
 * Un produit a N sources ; la source ★ primaire se projette sur
 * `products.supplier_id` sans toucher `source_supplier` (marqueur formulation)
 * ni `fulfillment.ts` / `launchCatalog.ts`.
 *
 * `partner_name` reste lisible pour les lignes héritées. Une écriture nouvelle
 * exige un `supplier_id` du référentiel.
 */

function text(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function intOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function productExists(store: SupabaseServerStore, productId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('products').select('id').eq('id', productId).maybeSingle();
    if (error) return false;
    return Boolean(data);
  }
  return store.inMemoryProducts.some(row => String(row.id) === productId);
}

function memoryRowFromSource(source: ProductSource, extra: { createdBy: string | null; createdAt: string; updatedAt: string }): Record<string, unknown> {
  return {
    id: source.id,
    product_id: source.productId,
    supplier_id: source.supplierId,
    partner_name: source.partnerName,
    model: source.model,
    is_primary: source.isPrimary,
    cost_cents: source.costCents,
    fee_cents: source.feeCents,
    fulfillment_cost_cents: source.fulfillmentCostCents,
    commission_pct: source.commissionPct,
    affiliate_url: source.affiliateUrl,
    cookie_days: source.cookieDays,
    lead_time_days: source.leadTimeDays,
    ships_from: source.shipsFrom,
    currency: source.currency,
    available: source.available,
    notes: source.notes,
    created_by: extra.createdBy,
    created_at: extra.createdAt,
    updated_at: extra.updatedAt,
  };
}

export async function listProductSources(store: SupabaseServerStore, productId?: string): Promise<ProductSource[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('product_sources').select('*');
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    ensureDatabaseSuccess('lecture des sources d’approvisionnement', error);
    return (data || []).map(mapProductSource);
  }
  const rows = store.inMemoryProductSources || [];
  const filtered = productId ? rows.filter(row => String(row.product_id ?? row.productId) === productId) : rows;
  return filtered.map(mapProductSource);
}

export async function getProductSource(store: SupabaseServerStore, id: string): Promise<ProductSource | undefined> {
  const key = text(id, 80);
  if (!key) return undefined;
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('product_sources').select('*').eq('id', key).maybeSingle();
    ensureDatabaseSuccess('lecture d’une source d’approvisionnement', error);
    return data ? mapProductSource(data) : undefined;
  }
  const row = (store.inMemoryProductSources || []).find(item => String(item.id) === key);
  return row ? mapProductSource(row) : undefined;
}

/**
 * Projette la source primaire sur `products.supplier_id`.
 *
 * Sans `supplier_id` sur la primaire (ligne héritée à nom libre), on ne
 * touche pas la colonne : un Hair déjà rattaché ne se vide pas tout seul.
 */
export async function projectPrimarySupplier(store: SupabaseServerStore, productId: string): Promise<string | null> {
  const sources = await listProductSources(store, productId);
  const supplierId = selectPrimarySource(sources)?.supplierId || null;
  if (!supplierId) return null;

  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase
      .from('products')
      .update({ supplier_id: supplierId, last_catalog_updated_at: now })
      .eq('id', productId);
    ensureDatabaseSuccess('projection fournisseur principal', error);
  }
  const product = store.inMemoryProducts.find(row => String(row.id) === productId);
  if (product) {
    product.supplierId = supplierId;
    product.supplier_id = supplierId;
  }
  return supplierId;
}

async function unsetPrimary(store: SupabaseServerStore, productId: string, exceptId?: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('product_sources').update({ is_primary: false }).eq('product_id', productId);
    if (exceptId) query = query.neq('id', exceptId);
    const { error } = await query;
    ensureDatabaseSuccess('désignation de la source primaire', error);
    return;
  }
  for (const row of store.inMemoryProductSources || []) {
    if (String(row.product_id ?? row.productId) !== productId) continue;
    if (exceptId && String(row.id) === exceptId) continue;
    row.is_primary = false;
  }
}

export async function createProductSource(
  store: SupabaseServerStore,
  adminId: string | null,
  input: any,
): Promise<ProductSource> {
  const productId = text(input?.productId ?? input?.product_id, 80);
  if (!productId) throw new Error('Produit obligatoire.');
  if (!await productExists(store, productId)) throw new Error('Produit introuvable.');

  const supplierId = text(input?.supplierId ?? input?.supplier_id, 80);
  const partnerName = text(input?.partnerName ?? input?.partner_name, 240);
  if (!supplierId) {
    throw new Error(
      partnerName
        ? 'Un nom libre n’est pas une offre. Choisissez un fournisseur enregistré.'
        : 'Un fournisseur enregistré est obligatoire.',
    );
  }
  if (!await getSupplierById(store, supplierId)) throw new Error('Fournisseur introuvable.');

  const model = isSupplyModel(input?.model) ? input.model : null;
  if (!model) throw new Error(`Modèle invalide — attendu : ${SUPPLY_MODELS.join(', ')}.`);
  const affiliateUrlRaw = text(input?.affiliateUrl ?? input?.affiliate_url, 2000) || null;
  const affiliateUrl = model === 'affiliation' ? assertAffiliateUrl(affiliateUrlRaw) : affiliateUrlRaw;

  const existing = await listProductSources(store, productId);
  const isPrimary = input?.isPrimary === true || input?.is_primary === true || existing.length === 0;

  const now = new Date().toISOString();
  const source: ProductSource = {
    id: randomUUID(),
    productId,
    supplierId,
    partnerName: null,
    model,
    isPrimary,
    costCents: intOrNull(input?.costCents ?? input?.cost_cents),
    feeCents: intOrNull(input?.feeCents ?? input?.fee_cents),
    fulfillmentCostCents: intOrNull(input?.fulfillmentCostCents ?? input?.fulfillment_cost_cents),
    commissionPct: numberOrNull(input?.commissionPct ?? input?.commission_pct),
    affiliateUrl,
    cookieDays: intOrNull(input?.cookieDays ?? input?.cookie_days),
    leadTimeDays: intOrNull(input?.leadTimeDays ?? input?.lead_time_days),
    shipsFrom: text(input?.shipsFrom ?? input?.ships_from, 80) || null,
    currency: text(input?.currency, 8) || 'EUR',
    available: input?.available !== false,
    notes: text(input?.notes, 4000) || null,
  };

  if (isPrimary) await unsetPrimary(store, productId);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('product_sources').insert({
      id: source.id,
      product_id: source.productId,
      supplier_id: source.supplierId,
      partner_name: null,
      model: source.model,
      is_primary: source.isPrimary,
      cost_cents: source.costCents,
      fee_cents: source.feeCents,
      fulfillment_cost_cents: source.fulfillmentCostCents,
      commission_pct: source.commissionPct,
      affiliate_url: source.affiliateUrl,
      cookie_days: source.cookieDays,
      lead_time_days: source.leadTimeDays,
      ships_from: source.shipsFrom,
      currency: source.currency,
      available: source.available,
      notes: source.notes,
      created_by: adminId,
      updated_at: now,
    }).select('*').maybeSingle();
    ensureDatabaseSuccess('création de la source d’approvisionnement', error);
    if (isPrimary) await projectPrimarySupplier(store, productId);
    return data ? mapProductSource(data) : source;
  }

  if (!store.inMemoryProductSources) store.inMemoryProductSources = [];
  store.inMemoryProductSources.push(memoryRowFromSource(source, { createdBy: adminId, createdAt: now, updatedAt: now }));
  if (isPrimary) await projectPrimarySupplier(store, productId);
  return source;
}

export async function updateProductSource(
  store: SupabaseServerStore,
  adminId: string | null,
  id: string,
  patch: any,
): Promise<ProductSource> {
  void adminId;
  const current = await getProductSource(store, id);
  if (!current || !current.id) throw new Error('Source introuvable.');

  const next: ProductSource = { ...current };
  if ('available' in (patch || {})) next.available = patch.available !== false;
  if ('costCents' in (patch || {}) || 'cost_cents' in (patch || {})) {
    next.costCents = intOrNull(patch.costCents ?? patch.cost_cents);
  }
  if ('feeCents' in (patch || {}) || 'fee_cents' in (patch || {})) {
    next.feeCents = intOrNull(patch.feeCents ?? patch.fee_cents);
  }
  if ('fulfillmentCostCents' in (patch || {}) || 'fulfillment_cost_cents' in (patch || {})) {
    next.fulfillmentCostCents = intOrNull(patch.fulfillmentCostCents ?? patch.fulfillment_cost_cents);
  }
  if ('commissionPct' in (patch || {}) || 'commission_pct' in (patch || {})) {
    next.commissionPct = numberOrNull(patch.commissionPct ?? patch.commission_pct);
  }
  if ('cookieDays' in (patch || {}) || 'cookie_days' in (patch || {})) {
    next.cookieDays = intOrNull(patch.cookieDays ?? patch.cookie_days);
  }
  if ('affiliateUrl' in (patch || {}) || 'affiliate_url' in (patch || {})) {
    const url = text(patch.affiliateUrl ?? patch.affiliate_url, 2000) || null;
    next.affiliateUrl = next.model === 'affiliation' ? assertAffiliateUrl(url) : url;
  }
  const makePrimary = patch?.isPrimary === true || patch?.is_primary === true;
  if (makePrimary) next.isPrimary = true;

  // Un supplierId ne se pose pas par PATCH « nom » : la conversion d'une
  // ligne héritée se fait en créant une vraie source, pas en tapant un texte.
  if (patch?.supplierId !== undefined || patch?.supplier_id !== undefined || patch?.partnerName !== undefined || patch?.partner_name !== undefined) {
    throw new Error('Le fournisseur d’une offre ne se renomme pas. Créez une source rattachée à une fiche.');
  }

  const now = new Date().toISOString();
  if (makePrimary) await unsetPrimary(store, current.productId, current.id);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const payload: Record<string, unknown> = {
      available: next.available,
      cost_cents: next.costCents,
      fee_cents: next.feeCents,
      fulfillment_cost_cents: next.fulfillmentCostCents,
      is_primary: next.isPrimary,
      updated_at: now,
    };
    const { data, error } = await supabase.from('product_sources').update(payload).eq('id', current.id).select('*').maybeSingle();
    ensureDatabaseSuccess('mise à jour de la source d’approvisionnement', error);
    if (!data) throw new Error('Source introuvable.');
    if (makePrimary) await projectPrimarySupplier(store, current.productId);
    return mapProductSource(data);
  }

  const index = (store.inMemoryProductSources || []).findIndex(row => String(row.id) === current.id);
  if (index < 0) throw new Error('Source introuvable.');
  const row = store.inMemoryProductSources[index];
  row.available = next.available;
  row.cost_cents = next.costCents;
  row.fee_cents = next.feeCents;
  row.fulfillment_cost_cents = next.fulfillmentCostCents;
  row.is_primary = next.isPrimary;
  row.commission_pct = next.commissionPct;
  row.cookie_days = next.cookieDays;
  row.affiliate_url = next.affiliateUrl;
  row.updated_at = now;
  if (makePrimary) await projectPrimarySupplier(store, current.productId);
  return mapProductSource(row);
}
