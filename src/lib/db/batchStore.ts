import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { listSupplierDocuments } from './supplierStore';
import { getSourcingItem } from './sourcingStore';
import { getProductForAdministration } from './catalogStore';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 16D — LOT, COÛT SERVI, DOUBLE SOURCING.
 *
 * Critère du chantier : « quelles commandes contiennent le lot X » doit avoir
 * une réponse **en une requête**. C'est la vue `public.batch_order_trace` qui la
 * donne ; `getOrdersContainingBatch` ne fait que l'interroger.
 *
 * Trois règles, dans la continuité du chantier 16 :
 *
 *  1. **Le coût servi n'est jamais estimé.** Il se calcule à partir de coûts
 *     saisis — prix unitaire, fret, droits, autres. En base c'est une colonne
 *     générée, donc il ne peut pas diverger ; ici le calcul reproduit exactement
 *     la même division entière pour que le mode mémoire dise la même chose.
 *  2. **On n'alloue pas n'importe quoi à n'importe quoi.** Un lot d'un autre
 *     produit, une quantité supérieure à la ligne, un lot vidé au-delà de sa
 *     quantité : refusé. En base c'est un déclencheur qui fait autorité ; le
 *     code applique les mêmes règles pour que l'erreur soit lisible.
 *  3. **Le double sourcing ne se décrète pas.** « Second fournisseur qualifié »
 *     suppose une définition de « qualifié » : ici, détenir tous les documents
 *     exigés par le besoin de sourcing rattaché. Sans besoin rattaché, la
 *     réponse est **indéterminée**, pas « oui ».
 */

export const BATCH_STATUS = ['received', 'in_stock', 'depleted', 'rejected'] as const;
export type BatchStatus = (typeof BATCH_STATUS)[number];

export interface ProductBatch {
  id: string;
  lotReference: string;
  productId: string;
  supplierId?: string;
  sourcingItemId?: string;
  quantityReceived: number;
  unitCostCents: number;
  freightCents: number;
  dutyCents: number;
  otherCostsCents: number;
  currency: string;
  /** Coût servi par unité, en centimes. Jamais null : il découle des coûts saisis. */
  servedCostCents: number;
  receivedOn: string;
  expiresOn?: string;
  status: BatchStatus;
  notes?: string;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BatchAllocation {
  id: string;
  orderItemId: string;
  batchId: string;
  quantity: number;
  allocatedBy: string | null;
  allocatedAt: string;
}

export interface BatchOrderTraceRow {
  batchId: string;
  lotReference: string;
  productId: string;
  supplierId?: string;
  servedCostCents: number;
  currency: string;
  orderItemId: string;
  allocatedQuantity: number;
  allocatedAt: string;
  orderId: string;
  orderedQuantity: number;
  orderStatus: string;
  customerEmail?: string;
  orderedAt: string;
}

function text(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function requiredPositiveInt(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} doit être un nombre strictement positif.`);
  return Math.trunc(parsed);
}

function costInt(value: unknown, label: string): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} doit être un nombre positif ou nul.`);
  return Math.trunc(parsed);
}

function dateOnly(value: unknown): string {
  const raw = text(value, 40);
  if (!raw) throw new Error('Une date est obligatoire.');
  if (Number.isNaN(Date.parse(raw))) throw new Error(`Date illisible : « ${raw} ».`);
  return raw.slice(0, 10);
}

/**
 * Coût servi par unité, en centimes.
 *
 * Division entière, exactement comme la colonne générée en base : arrondi au
 * centime inférieur. Reproduire la même règle ici est ce qui permet au mode
 * mémoire et à la base de ne jamais se contredire.
 */
export function computeServedCostCents(quantity: number, unitCostCents: number, freightCents: number, dutyCents: number, otherCostsCents: number): number {
  return Math.trunc((quantity * unitCostCents + freightCents + dutyCents + otherCostsCents) / quantity);
}

/** Clé de ligne de commande en mode mémoire : les lignes y sont embarquées. */
export function memoryOrderItemKey(orderId: string, productId: string): string {
  return `${orderId}:${productId}`;
}

/** Retrouve commande et ligne à partir de cette clé. */
function resolveMemoryOrderItem(store: SupabaseServerStore, key: string): { order: any; item: any } | undefined {
  const separator = key.lastIndexOf(':');
  if (separator <= 0) return undefined;
  const orderId = key.slice(0, separator);
  const productId = key.slice(separator + 1);
  const order = store.inMemoryOrders.find(entry => entry.id === orderId);
  if (!order) return undefined;
  const item = (order.items || []).find((entry: any) => entry.productId === productId);
  return item ? { order, item } : undefined;
}

function mapBatch(row: any): ProductBatch {
  const quantityReceived = Number(row.quantity_received ?? row.quantityReceived);
  const unitCostCents = Number(row.unit_cost_cents ?? row.unitCostCents);
  const freightCents = Number(row.freight_cents ?? row.freightCents ?? 0);
  const dutyCents = Number(row.duty_cents ?? row.dutyCents ?? 0);
  const otherCostsCents = Number(row.other_costs_cents ?? row.otherCostsCents ?? 0);
  const generated = row.served_cost_cents ?? row.servedCostCents;
  return {
    id: String(row.id),
    lotReference: String(row.lot_reference ?? row.lotReference),
    productId: String(row.product_id ?? row.productId),
    supplierId: row.supplier_id ?? row.supplierId ?? undefined,
    sourcingItemId: row.sourcing_item_id ?? row.sourcingItemId ?? undefined,
    quantityReceived,
    unitCostCents,
    freightCents,
    dutyCents,
    otherCostsCents,
    currency: String(row.currency ?? 'EUR'),
    // En base la colonne est générée : on la lit. En mémoire on la recalcule
    // avec la même règle.
    servedCostCents: generated === null || generated === undefined
      ? computeServedCostCents(quantityReceived, unitCostCents, freightCents, dutyCents, otherCostsCents)
      : Number(generated),
    receivedOn: String(row.received_on ?? row.receivedOn),
    expiresOn: row.expires_on ?? row.expiresOn ?? undefined,
    status: (BATCH_STATUS as readonly string[]).includes(row.status) ? row.status : 'received',
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by ?? row.recordedBy ?? null,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString())
  };
}

function mapAllocation(row: any): BatchAllocation {
  return {
    id: String(row.id),
    orderItemId: String(row.order_item_id ?? row.orderItemId),
    batchId: String(row.batch_id ?? row.batchId),
    quantity: Number(row.quantity),
    allocatedBy: row.allocated_by ?? row.allocatedBy ?? null,
    allocatedAt: String(row.allocated_at ?? row.allocatedAt ?? new Date().toISOString())
  };
}

// ------------------------------------------------------------------
// Les lots
// ------------------------------------------------------------------

export async function createBatch(store: SupabaseServerStore, adminId: string | null, input: any): Promise<ProductBatch> {
  const lotReference = text(input?.lotReference ?? input?.lot_reference, 120);
  if (!lotReference) throw new Error('La référence de lot est obligatoire : c’est elle qu’on retrouvera sur un rappel.');

  const productId = text(input?.productId ?? input?.product_id, 80);
  if (!productId) throw new Error('Le produit est obligatoire.');
  const product = await getProductForAdministration(store, productId);
  if (!product) throw new Error(`Produit introuvable : « ${productId} ».`);

  const supplierId = text(input?.supplierId ?? input?.supplier_id, 80);
  if (supplierId && !await store.getSupplierById(supplierId)) {
    throw new Error(`Fournisseur introuvable : « ${supplierId} ». Déclarez-le avant d’enregistrer un lot.`);
  }

  const quantityReceived = requiredPositiveInt(input?.quantityReceived ?? input?.quantity_received, 'La quantité reçue');
  const unitCostCents = requiredPositiveInt(input?.unitCostCents ?? input?.unit_cost_cents, 'Le coût unitaire');
  const freightCents = costInt(input?.freightCents ?? input?.freight_cents, 'Le fret');
  const dutyCents = costInt(input?.dutyCents ?? input?.duty_cents, 'Les droits de douane');
  const otherCostsCents = costInt(input?.otherCostsCents ?? input?.other_costs_cents, 'Les autres coûts');

  const receivedOn = dateOnly(input?.receivedOn ?? input?.received_on);
  const expiresOn = input?.expiresOn ?? input?.expires_on ? dateOnly(input?.expiresOn ?? input?.expires_on) : undefined;
  if (expiresOn && expiresOn < receivedOn) throw new Error('La date d’expiration précède la date de réception.');

  const now = new Date().toISOString();
  const batch: ProductBatch = {
    id: text(input?.id, 120) || `lot-${randomUUID().slice(0, 8)}`,
    lotReference,
    productId,
    supplierId,
    sourcingItemId: text(input?.sourcingItemId ?? input?.sourcing_item_id, 120),
    quantityReceived,
    unitCostCents,
    freightCents,
    dutyCents,
    otherCostsCents,
    currency: text(input?.currency, 8) || 'EUR',
    servedCostCents: computeServedCostCents(quantityReceived, unitCostCents, freightCents, dutyCents, otherCostsCents),
    receivedOn,
    expiresOn,
    status: (BATCH_STATUS as readonly string[]).includes(input?.status) ? input.status : 'received',
    notes: text(input?.notes, 4000),
    recordedBy: adminId,
    createdAt: now,
    updatedAt: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('product_batches').insert({
      id: batch.id,
      lot_reference: batch.lotReference,
      product_id: batch.productId,
      supplier_id: batch.supplierId ?? null,
      sourcing_item_id: batch.sourcingItemId ?? null,
      quantity_received: batch.quantityReceived,
      unit_cost_cents: batch.unitCostCents,
      freight_cents: batch.freightCents,
      duty_cents: batch.dutyCents,
      other_costs_cents: batch.otherCostsCents,
      currency: batch.currency,
      received_on: batch.receivedOn,
      expires_on: batch.expiresOn ?? null,
      status: batch.status,
      notes: batch.notes ?? null,
      recorded_by: adminId
    });
    ensureDatabaseSuccess('enregistrement du lot', error);
    // Relu, pas supposé : served_cost_cents est généré par la base.
    const created = await getBatch(store, batch.id);
    if (!created) throw new Error('Lot enregistré mais illisible.');
    return created;
  }

  store.inMemoryProductBatches.push(batch as never);
  return batch;
}

export async function listBatches(store: SupabaseServerStore, productId?: string): Promise<ProductBatch[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('product_batches').select('*').order('received_on', { ascending: false });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    ensureDatabaseSuccess('lecture des lots', error);
    return (data || []).map(mapBatch);
  }
  return store.inMemoryProductBatches
    .filter(batch => !productId || batch.productId === productId)
    .map(mapBatch);
}

export async function getBatch(store: SupabaseServerStore, id: string): Promise<ProductBatch | undefined> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('product_batches').select('*').eq('id', id).maybeSingle();
    ensureDatabaseSuccess('lecture du lot', error);
    return data ? mapBatch(data) : undefined;
  }
  return store.inMemoryProductBatches.find(batch => batch.id === id);
}

// ------------------------------------------------------------------
// L'allocation lot → ligne de commande
// ------------------------------------------------------------------

/**
 * Alloue une quantité d'un lot à une ligne de commande.
 *
 * Les trois refus ci-dessous sont les façons dont une traçabilité devient
 * menteuse. En base, le déclencheur `enforce_batch_allocation` fait autorité ;
 * les contrôles ici servent à ce que le refus soit lisible plutôt qu'une erreur
 * PostgreSQL brute.
 */
export async function allocateBatchToOrderItem(store: SupabaseServerStore, adminId: string | null, input: any): Promise<BatchAllocation> {
  const batchId = text(input?.batchId ?? input?.batch_id, 120);
  const orderItemId = text(input?.orderItemId ?? input?.order_item_id, 80);
  if (!batchId) throw new Error('Le lot est obligatoire.');
  if (!orderItemId) throw new Error('La ligne de commande est obligatoire.');
  const quantity = requiredPositiveInt(input?.quantity, 'La quantité allouée');

  const batch = await getBatch(store, batchId);
  if (!batch) throw new Error(`Lot introuvable : « ${batchId} ».`);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data: itemData, error: itemError } = await supabase.from('order_items').select('id, quantity, product_id').eq('id', orderItemId).maybeSingle();
    ensureDatabaseSuccess('lecture de la ligne de commande', itemError);
    if (!itemData) throw new Error(`Ligne de commande introuvable : « ${orderItemId} ».`);
    if (itemData.product_id !== batch.productId) {
      throw new Error(`Allocation refusée : le lot ${batchId} porte le produit ${batch.productId}, la ligne de commande porte ${itemData.product_id}.`);
    }
    const { data: allocatedData, error: allocatedError } = await supabase.from('order_item_batches').select('quantity').eq('order_item_id', orderItemId);
    ensureDatabaseSuccess('lecture des allocations de la ligne', allocatedError);
    const alreadyItem = (allocatedData || []).reduce((sum: number, row: any) => sum + Number(row.quantity), 0);
    if (alreadyItem + quantity > Number(itemData.quantity)) {
      throw new Error(`Allocation refusée : la ligne porte ${itemData.quantity} unité(s), ${alreadyItem} déjà allouée(s), ${quantity} demandée(s).`);
    }
    const { data: batchAllocated, error: batchError } = await supabase.from('order_item_batches').select('quantity').eq('batch_id', batchId);
    ensureDatabaseSuccess('lecture des allocations du lot', batchError);
    const alreadyBatch = (batchAllocated || []).reduce((sum: number, row: any) => sum + Number(row.quantity), 0);
    if (alreadyBatch + quantity > batch.quantityReceived) {
      throw new Error(`Allocation refusée : le lot contient ${batch.quantityReceived} unité(s), ${alreadyBatch} déjà allouée(s), ${quantity} demandée(s).`);
    }

    const id = randomUUID();
    const { error } = await supabase.from('order_item_batches').insert({
      id, order_item_id: orderItemId, batch_id: batchId, quantity, allocated_by: adminId
    });
    ensureDatabaseSuccess('allocation du lot à la ligne de commande', error);
    return { id, orderItemId, batchId, quantity, allocatedBy: adminId, allocatedAt: new Date().toISOString() };
  }

  // Mode mémoire : mêmes règles, appliquées ici.
  //
  // Différence assumée et documentée : en base, une ligne de commande est une
  // ligne de `order_items` avec un uuid. En mémoire, les lignes sont embarquées
  // dans la commande (`ServerOrderItem` n'a pas d'identifiant). La clé utilisée
  // ici est donc dérivée : `« identifiant commande:identifiant produit »`.
  const resolved = resolveMemoryOrderItem(store, orderItemId);
  if (!resolved) throw new Error(`Ligne de commande introuvable : « ${orderItemId} ». En mémoire, la clé attendue est « identifiantCommande:identifiantProduit ».`);
  const { order: memoryOrder, item: orderItem } = resolved;
  if (orderItem.productId !== batch.productId) {
    throw new Error(`Allocation refusée : le lot ${batchId} porte le produit ${batch.productId}, la ligne de commande porte ${orderItem.productId}.`);
  }
  const alreadyItem = store.inMemoryBatchAllocations
    .filter((row: any) => row.orderItemId === orderItemId)
    .reduce((sum: number, row: any) => sum + Number(row.quantity), 0);
  if (alreadyItem + quantity > Number(orderItem.quantity)) {
    throw new Error(`Allocation refusée : la ligne porte ${orderItem.quantity} unité(s), ${alreadyItem} déjà allouée(s), ${quantity} demandée(s).`);
  }
  const alreadyBatch = store.inMemoryBatchAllocations
    .filter((row: any) => row.batchId === batchId)
    .reduce((sum: number, row: any) => sum + Number(row.quantity), 0);
  if (alreadyBatch + quantity > batch.quantityReceived) {
    throw new Error(`Allocation refusée : le lot contient ${batch.quantityReceived} unité(s), ${alreadyBatch} déjà allouée(s), ${quantity} demandée(s).`);
  }

  const allocation: BatchAllocation = {
    id: randomUUID(), orderItemId: memoryOrderItemKey(memoryOrder.id, orderItem.productId), batchId, quantity,
    allocatedBy: adminId, allocatedAt: new Date().toISOString()
  };
  store.inMemoryBatchAllocations.push(allocation as never);
  return allocation;
}

// ------------------------------------------------------------------
// Le critère : quelles commandes contiennent le lot X
// ------------------------------------------------------------------

/**
 * Répond au critère du chantier.
 *
 * En base, c'est **une requête** sur la vue `public.batch_order_trace` — la
 * jointure lot → allocation → ligne → commande est faite par PostgreSQL, pas
 * recomposée ici. La vue est `security_invoker`, donc la RLS s'applique : la
 * traçabilité d'un lot ne devient pas une exposition des données clients.
 */
export async function getOrdersContainingBatch(store: SupabaseServerStore, batchId: string): Promise<BatchOrderTraceRow[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('batch_order_trace').select('*').eq('batch_id', batchId).order('ordered_at', { ascending: false });
    ensureDatabaseSuccess('traçabilité du lot', error);
    return (data || []).map(row => ({
      batchId: String(row.batch_id),
      lotReference: String(row.lot_reference),
      productId: String(row.product_id),
      supplierId: row.supplier_id ?? undefined,
      servedCostCents: Number(row.served_cost_cents),
      currency: String(row.currency),
      orderItemId: String(row.order_item_id),
      allocatedQuantity: Number(row.allocated_quantity),
      allocatedAt: String(row.allocated_at),
      orderId: String(row.order_id),
      orderedQuantity: Number(row.ordered_quantity),
      orderStatus: String(row.order_status),
      customerEmail: row.customer_email ?? undefined,
      orderedAt: String(row.ordered_at)
    }));
  }

  // Mode mémoire : la même jointure, faite ici.
  const batch = await getBatch(store, batchId);
  if (!batch) return [];
  return store.inMemoryBatchAllocations
    .filter((allocation: any) => allocation.batchId === batchId)
    .map((allocation: any) => {
      const resolved = resolveMemoryOrderItem(store, allocation.orderItemId);
      const order = resolved?.order;
      const orderItem = resolved?.item;
      return {
        batchId: batch.id,
        lotReference: batch.lotReference,
        productId: batch.productId,
        supplierId: batch.supplierId,
        servedCostCents: batch.servedCostCents,
        currency: batch.currency,
        orderItemId: String(allocation.orderItemId),
        allocatedQuantity: Number(allocation.quantity),
        allocatedAt: String(allocation.allocatedAt),
        orderId: order?.id ?? 'inconnue',
        orderedQuantity: Number(orderItem?.quantity ?? 0),
        orderStatus: order?.status ?? 'inconnu',
        customerEmail: order?.customerEmail,
        orderedAt: order?.createdAt ?? ''
      };
    });
}

// ------------------------------------------------------------------
// Le double sourcing
// ------------------------------------------------------------------

export interface DoubleSourcingRow {
  productId: string;
  productName: string;
  /** Fournisseurs ayant réellement livré un lot de ce produit. */
  incumbentSupplierIds: string[];
  /** Base de la qualification : le besoin de sourcing rattaché, s'il existe. */
  qualificationBasis: string | null;
  requiredDocuments: string[];
  /** Autres fournisseurs détenant tous les documents exigés. */
  qualifiedAlternatives: Array<{ supplierId: string; legalName: string }>;
  /**
   * `true` si un second fournisseur qualifié existe, `false` s'il n'y en a pas,
   * `null` si la qualification ne peut pas être établie — c'est-à-dire si aucun
   * besoin de sourcing n'est rattaché. Répondre `true` dans ce cas serait
   * décréter une sécurité d'approvisionnement qui n'existe pas.
   */
  hasSecondSource: boolean | null;
  batches: number;
}

export async function getDoubleSourcingReport(store: SupabaseServerStore): Promise<{
  products: number;
  withSecondSource: number;
  withoutSecondSource: number;
  undetermined: number;
  rows: DoubleSourcingRow[];
}> {
  const batches = await listBatches(store);
  const byProduct = new Map<string, ProductBatch[]>();
  for (const batch of batches) {
    const current = byProduct.get(batch.productId) || [];
    current.push(batch);
    byProduct.set(batch.productId, current);
  }

  const rows: DoubleSourcingRow[] = [];
  let withSecond = 0;
  let withoutSecond = 0;
  let undetermined = 0;

  for (const [productId, productBatches] of byProduct) {
    const product = await getProductForAdministration(store, productId);
    const incumbents = [...new Set(productBatches.map(batch => batch.supplierId).filter(Boolean))] as string[];

    // La qualification se définit par les documents exigés du besoin de
    // sourcing rattaché. Sans besoin rattaché, il n'y a pas de critère.
    const sourcingItemIds = [...new Set(productBatches.map(batch => batch.sourcingItemId).filter(Boolean))] as string[];
    const requiredDocuments = new Set<string>();
    for (const itemId of sourcingItemIds) {
      const item = await getSourcingItem(store, itemId);
      for (const required of item?.requiredDocuments || []) requiredDocuments.add(required);
    }
    const qualificationBasis = sourcingItemIds.length ? sourcingItemIds.join(', ') : null;

    let alternatives: Array<{ supplierId: string; legalName: string }> = [];
    if (qualificationBasis) {
      const suppliers = await store.listSuppliers();
      for (const supplier of suppliers) {
        if (incumbents.includes(supplier.id)) continue;
        // Set<string> explicite : les exigences viennent d'une saisie libre, et
        // les comparer à l'union fermée des types de document ne compilerait pas.
        const held = new Set<string>((await listSupplierDocuments(store, supplier.id)).map(document => document.documentType));
        const qualified = [...requiredDocuments].every(required => held.has(required));
        if (qualified) alternatives.push({ supplierId: supplier.id, legalName: supplier.legalName });
      }
    }

    const hasSecondSource = qualificationBasis ? alternatives.length > 0 : null;
    if (hasSecondSource === true) withSecond += 1;
    else if (hasSecondSource === false) withoutSecond += 1;
    else undetermined += 1;

    rows.push({
      productId,
      productName: product?.name ?? productId,
      incumbentSupplierIds: incumbents,
      qualificationBasis,
      requiredDocuments: [...requiredDocuments],
      qualifiedAlternatives: alternatives,
      hasSecondSource,
      batches: productBatches.length
    });
  }

  return {
    products: rows.length,
    withSecondSource: withSecond,
    withoutSecondSource: withoutSecond,
    undetermined,
    rows: rows.sort((a, b) => a.productName.localeCompare(b.productName))
  };
}

// ------------------------------------------------------------------
// Les lignes allouables
// ------------------------------------------------------------------

export interface AllocatableOrderItem {
  orderItemId: string;
  orderId: string;
  productId: string;
  productName?: string;
  orderStatus: string;
  orderedQuantity: number;
  allocatedQuantity: number;
  /** Ce qu'il reste à allouer. Jamais négatif. */
  remainingQuantity: number;
  customerEmail?: string;
  orderedAt: string;
}

/**
 * Liste les lignes de commande allouables pour un produit, avec ce qui reste à
 * allouer.
 *
 * Cette fonction existe parce que l'écran de saisie des lots en a besoin : pour
 * allouer un lot à une ligne, il faut l'identifiant réel de cette ligne, et
 * aucune route ne l'exposait. Sans elle, l'administrateur devrait aller chercher
 * un uuid en base — exactement ce que le chantier 15B voulait supprimer.
 *
 * En mémoire, les lignes sont embarquées dans la commande et n'ont pas
 * d'identifiant : la clé dérivée `« commande:produit »` est utilisée, comme
 * partout ailleurs dans ce module.
 */
export async function listAllocatableOrderItems(store: SupabaseServerStore, productId: string): Promise<AllocatableOrderItem[]> {
  if (!productId) throw new Error('Le produit est obligatoire.');

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('order_items')
      .select('id, quantity, product_id, order_id, orders(id, status, customer_email, created_at)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des lignes de commande', error);

    const rows = data || [];
    const itemIds = rows.map((row: any) => row.id);
    const { data: allocations, error: allocationError } = itemIds.length
      ? await supabase.from('order_item_batches').select('order_item_id, quantity').in('order_item_id', itemIds)
      : { data: [] as any[], error: null };
    ensureDatabaseSuccess('lecture des allocations', allocationError);

    const allocatedByItem = new Map<string, number>();
    for (const allocation of allocations || []) {
      const current = allocatedByItem.get(String(allocation.order_item_id)) || 0;
      allocatedByItem.set(String(allocation.order_item_id), current + Number(allocation.quantity));
    }

    return rows.map((row: any) => {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      const orderedQuantity = Number(row.quantity);
      const allocatedQuantity = allocatedByItem.get(String(row.id)) || 0;
      return {
        orderItemId: String(row.id),
        orderId: String(row.order_id),
        productId: String(row.product_id),
        orderStatus: order?.status ?? 'inconnu',
        orderedQuantity,
        allocatedQuantity,
        remainingQuantity: Math.max(0, orderedQuantity - allocatedQuantity),
        customerEmail: order?.customer_email ?? undefined,
        orderedAt: String(order?.created_at ?? '')
      };
    });
  }

  // Mode mémoire : les lignes sont embarquées, la clé est dérivée.
  const allocatedByKey = new Map<string, number>();
  for (const allocation of store.inMemoryBatchAllocations as any[]) {
    const current = allocatedByKey.get(allocation.orderItemId) || 0;
    allocatedByKey.set(allocation.orderItemId, current + Number(allocation.quantity));
  }

  const result: AllocatableOrderItem[] = [];
  for (const order of store.inMemoryOrders as any[]) {
    for (const item of order.items || []) {
      if (item.productId !== productId) continue;
      const key = memoryOrderItemKey(order.id, item.productId);
      const orderedQuantity = Number(item.quantity);
      const allocatedQuantity = allocatedByKey.get(key) || 0;
      result.push({
        orderItemId: key,
        orderId: String(order.id),
        productId: String(item.productId),
        productName: item.name,
        orderStatus: String(order.status ?? 'inconnu'),
        orderedQuantity,
        allocatedQuantity,
        remainingQuantity: Math.max(0, orderedQuantity - allocatedQuantity),
        customerEmail: order.customerEmail,
        orderedAt: String(order.createdAt ?? '')
      });
    }
  }
  return result;
}
