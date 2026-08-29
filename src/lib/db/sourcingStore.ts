import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { listSupplierDocuments } from './supplierStore';
import { buildRfqContent } from '../sourcingRfq';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 16C — LE SOURCING RÉEL, PAR VAGUE.
 *
 * Ce que cette couche fait, et ce qu'elle ne fait pas.
 *
 * Elle **ne** contacte personne. Elle n'a ni boîte mail, ni mandat pour engager
 * KURLA, et aucune réponse de fournisseur n'existe tant qu'un humain ne l'a pas
 * saisie. Ce qu'elle fait, c'est rendre le sourcing **traçable** : une demande
 * de prix, son contenu réellement envoyé, sa date d'envoi, les réponses reçues
 * avec leur date, et la comparaison — tout cela au même endroit plutôt que
 * dispersé dans une boîte mail où « on a choisi ce façonnier » devient une
 * phrase sans preuve.
 *
 * Trois règles, toutes du même côté que le reste du chantier 16 :
 *
 *  1. **Aucun chiffre n'est déduit.** Prix, MOQ et délai sont NULLables : une
 *     réponse peut ne pas chiffrer. Un zéro par défaut serait une donnée
 *     inventée, et un devis inventé est pire qu'un devis manquant.
 *  2. **Une demande « envoyée » exige un fournisseur identifié et une date.**
 *     Contrôlé par le code et par deux contraintes en base.
 *  3. **Retenir un fournisseur exige les documents demandés.** La sélection est
 *     bloquée tant que les preuves exigées ne sont pas enregistrées — sinon la
 *     liste `required_documents` ne serait qu'une intention.
 */

export const SOURCING_ITEM_STATUS = ['to_source', 'in_rfq', 'awarded', 'abandoned'] as const;
export type SourcingItemStatus = (typeof SOURCING_ITEM_STATUS)[number];

export const RFQ_STATUS = ['draft', 'sent', 'answered', 'closed', 'declined'] as const;
export type RfqStatus = (typeof RFQ_STATUS)[number];

export interface SourcingItem {
  id: string;
  wave: string;
  title: string;
  category: string;
  rationale: string;
  specification?: string;
  requiredDocuments: string[];
  status: SourcingItemStatus;
  awardedSupplierId?: string;
  awardedResponseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rfq {
  id: string;
  sourcingItemId: string;
  supplierId?: string;
  content: string;
  status: RfqStatus;
  channel?: string;
  sentOn?: string;
  closedOn?: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RfqResponse {
  id: string;
  rfqId: string;
  receivedOn: string;
  unitPriceCents: number | null;
  currency?: string;
  moqUnits: number | null;
  leadTimeDays: number | null;
  documentsOffered: string[];
  quoteReference?: string;
  notes?: string;
  recordedBy: string | null;
  createdAt: string;
}

function text(value: unknown, max = 4000): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function positiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
}

function dateOnly(value: unknown): string | undefined {
  const raw = text(value, 40);
  if (!raw) return undefined;
  if (Number.isNaN(Date.parse(raw))) throw new Error(`Date illisible : « ${raw} ».`);
  return raw.slice(0, 10);
}

/**
 * Identifiant lisible dérivé du texte.
 *
 * Les diacritiques sont retirés **avant** le filtrage des caractères : sans
 * cela, un « é » n'est pas dans [a-z0-9] et devient un séparateur — « Après »
 * donnait « apr-s ». Le banc l'a attrapé, d'où ce correctif.
 */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapItem(row: any): SourcingItem {
  return {
    id: String(row.id),
    wave: String(row.wave),
    title: String(row.title),
    category: String(row.category),
    rationale: String(row.rationale),
    specification: row.specification ?? undefined,
    requiredDocuments: Array.isArray(row.required_documents ?? row.requiredDocuments) ? (row.required_documents ?? row.requiredDocuments) : [],
    status: (SOURCING_ITEM_STATUS as readonly string[]).includes(row.status) ? row.status : 'to_source',
    awardedSupplierId: row.awarded_supplier_id ?? row.awardedSupplierId ?? undefined,
    awardedResponseId: row.awarded_response_id ?? row.awardedResponseId ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString())
  };
}

function mapRfq(row: any): Rfq {
  return {
    id: String(row.id),
    sourcingItemId: String(row.sourcing_item_id ?? row.sourcingItemId),
    supplierId: row.supplier_id ?? row.supplierId ?? undefined,
    content: String(row.content),
    status: (RFQ_STATUS as readonly string[]).includes(row.status) ? row.status : 'draft',
    channel: row.channel ?? undefined,
    sentOn: row.sent_on ?? row.sentOn ?? undefined,
    closedOn: row.closed_on ?? row.closedOn ?? undefined,
    createdBy: row.created_by ?? row.createdBy ?? null,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString())
  };
}

function mapResponse(row: any): RfqResponse {
  return {
    id: String(row.id),
    rfqId: String(row.rfq_id ?? row.rfqId),
    receivedOn: String(row.received_on ?? row.receivedOn),
    unitPriceCents: row.unit_price_cents ?? row.unitPriceCents ?? null,
    currency: row.currency ?? undefined,
    moqUnits: row.moq_units ?? row.moqUnits ?? null,
    leadTimeDays: row.lead_time_days ?? row.leadTimeDays ?? null,
    documentsOffered: Array.isArray(row.documents_offered ?? row.documentsOffered) ? (row.documents_offered ?? row.documentsOffered) : [],
    quoteReference: row.quote_reference ?? row.quoteReference ?? undefined,
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by ?? row.recordedBy ?? null,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString())
  };
}

// ------------------------------------------------------------------
// Ce que nous cherchons à sourcer
// ------------------------------------------------------------------

export async function listSourcingItems(store: SupabaseServerStore, wave?: string): Promise<SourcingItem[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('sourcing_items').select('*').order('wave', { ascending: true }).order('created_at', { ascending: true });
    if (wave) query = query.eq('wave', wave);
    const { data, error } = await query;
    ensureDatabaseSuccess('lecture des besoins de sourcing', error);
    return (data || []).map(mapItem);
  }
  return store.inMemorySourcingItems
    .filter(item => !wave || item.wave === wave)
    .map(mapItem);
}

export async function getSourcingItem(store: SupabaseServerStore, id: string): Promise<SourcingItem | undefined> {
  const items = await listSourcingItems(store);
  return items.find(item => item.id === id);
}

export async function createSourcingItem(store: SupabaseServerStore, adminId: string | null, input: any): Promise<SourcingItem> {
  const wave = text(input?.wave, 80);
  const title = text(input?.title, 240);
  const category = text(input?.category, 80);
  const rationale = text(input?.rationale, 4000);
  if (!wave) throw new Error('La vague de sourcing est obligatoire.');
  if (!title) throw new Error('Le titre du besoin est obligatoire.');
  if (!category) throw new Error('La catégorie est obligatoire.');
  if (!rationale) throw new Error('Le motif est obligatoire : un besoin sans raison devient une envie.');

  const now = new Date().toISOString();
  const item: SourcingItem = {
    // Troncature **après** retrait des tirets de bordure : couper avant
    // laissait un identifiant se terminant par « - ».
    id: text(input?.id, 80) || `${slugify(wave)}-${slugify(title).slice(0, 60).replace(/-+$/g, '')}`,
    wave,
    title,
    category,
    rationale,
    specification: text(input?.specification, 8000),
    requiredDocuments: textArray(input?.requiredDocuments ?? input?.required_documents),
    status: 'to_source',
    createdAt: now,
    updatedAt: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('sourcing_items').insert({
      id: item.id,
      wave: item.wave,
      title: item.title,
      category: item.category,
      rationale: item.rationale,
      specification: item.specification ?? null,
      required_documents: item.requiredDocuments,
      status: item.status
    });
    ensureDatabaseSuccess('création du besoin de sourcing', error);
    return item;
  }
  store.inMemorySourcingItems.push(item as never);
  return item;
}

// ------------------------------------------------------------------
// La demande de prix
// ------------------------------------------------------------------

export async function createRfq(store: SupabaseServerStore, adminId: string | null, sourcingItemId: string): Promise<Rfq> {
  const item = await getSourcingItem(store, sourcingItemId);
  if (!item) throw new Error('Besoin de sourcing introuvable.');

  // Le contenu est généré à partir du besoin et des exigences réelles. Il est
  // stocké tel quel : si les exigences changent, l'historique ne change pas.
  const content = buildRfqContent(item);
  const now = new Date().toISOString();
  const rfq: Rfq = {
    id: randomUUID(),
    sourcingItemId: item.id,
    content,
    status: 'draft',
    createdBy: adminId,
    createdAt: now,
    updatedAt: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('rfqs').insert({
      id: rfq.id,
      sourcing_item_id: rfq.sourcingItemId,
      supplier_id: null,
      content: rfq.content,
      status: 'draft',
      created_by: adminId
    });
    ensureDatabaseSuccess('création de la demande de prix', error);
    // Le besoin passe en consultation : c'est un fait, pas une intention.
    await supabase.from('sourcing_items').update({ status: 'in_rfq', updated_at: now }).eq('id', item.id);
    return rfq;
  }

  store.inMemoryRfqs.push(rfq as never);
  const index = store.inMemorySourcingItems.findIndex(entry => entry.id === item.id);
  if (index >= 0) serverPatchItem(store, index, { status: 'in_rfq', updatedAt: now });
  return rfq;
}

function serverPatchItem(store: SupabaseServerStore, index: number, patch: Partial<SourcingItem>): void {
  const current = store.inMemorySourcingItems[index] as SourcingItem;
  store.inMemorySourcingItems[index] = { ...current, ...patch } as never;
}

export async function listRfqs(store: SupabaseServerStore, sourcingItemId: string): Promise<Rfq[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('rfqs').select('*').eq('sourcing_item_id', sourcingItemId).order('created_at', { ascending: true });
    ensureDatabaseSuccess('lecture des demandes de prix', error);
    return (data || []).map(mapRfq);
  }
  return store.inMemoryRfqs.filter(rfq => rfq.sourcingItemId === sourcingItemId).map(mapRfq);
}

export async function getRfq(store: SupabaseServerStore, rfqId: string): Promise<Rfq | undefined> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('rfqs').select('*').eq('id', rfqId).maybeSingle();
    ensureDatabaseSuccess('lecture de la demande de prix', error);
    return data ? mapRfq(data) : undefined;
  }
  return store.inMemoryRfqs.find(rfq => rfq.id === rfqId);
}

/**
 * Marque une demande comme envoyée.
 *
 * Exige un fournisseur **existant** et une date. Ce n'est pas de la rigueur
 * gratuite : « demande envoyée » sans destinataire identifié ni date est une
 * affirmation invérifiable, et c'est exactement ce qui rend un sourcing
 * intraçable. Les contraintes `rfq_sent_needs_supplier` et
 * `rfq_sent_needs_date` en base refusent la ligne de toute façon.
 */
export async function markRfqSent(store: SupabaseServerStore, adminId: string | null, rfqId: string, input: any): Promise<Rfq> {
  const rfq = await getRfq(store, rfqId);
  if (!rfq) throw new Error('Demande de prix introuvable.');
  if (rfq.status === 'sent') return rfq;

  const supplierId = text(input?.supplierId ?? input?.supplier_id, 80);
  if (!supplierId) throw new Error('Une demande envoyée exige un destinataire identifié.');
  const supplier = await store.getSupplierById(supplierId);
  if (!supplier) throw new Error(`Fournisseur introuvable : « ${supplierId} ». Déclarez-le avant de lui écrire.`);

  const sentOn = dateOnly(input?.sentOn ?? input?.sent_on) || new Date().toISOString().slice(0, 10);
  const channel = text(input?.channel, 80);
  const now = new Date().toISOString();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('rfqs').update({
      supplier_id: supplierId, status: 'sent', sent_on: sentOn, channel: channel ?? null, updated_at: now
    }).eq('id', rfqId);
    ensureDatabaseSuccess('enregistrement de l’envoi de la demande de prix', error);
    return { ...rfq, supplierId, status: 'sent', sentOn, channel, updatedAt: now };
  }

  const index = store.inMemoryRfqs.findIndex(entry => entry.id === rfqId);
  const updated: Rfq = { ...rfq, supplierId, status: 'sent', sentOn, channel, updatedAt: now };
  if (index >= 0) store.inMemoryRfqs[index] = updated as never;
  return updated;
}

// ------------------------------------------------------------------
// Les réponses
// ------------------------------------------------------------------

/**
 * Enregistre une réponse reçue.
 *
 * Aucun champ commercial n'est déduit. Prix, MOQ et délai restent `null` si la
 * réponse ne les donne pas : un devis partiel est une information, un devis
 * complété par la plateforme serait une invention.
 */
export async function recordRfqResponse(store: SupabaseServerStore, adminId: string | null, rfqId: string, input: any): Promise<RfqResponse> {
  const rfq = await getRfq(store, rfqId);
  if (!rfq) throw new Error('Demande de prix introuvable.');
  if (rfq.status === 'draft') throw new Error('La demande est encore en brouillon : elle n’a pas été envoyée, donc personne n’a pu y répondre.');

  const receivedOn = dateOnly(input?.receivedOn ?? input?.received_on);
  if (!receivedOn) throw new Error('La date de réception est obligatoire : un devis non daté ne se compare pas.');

  const unitPriceCents = positiveInt(input?.unitPriceCents ?? input?.unit_price_cents);
  const moqUnits = positiveInt(input?.moqUnits ?? input?.moq_units);
  const leadTimeDays = positiveInt(input?.leadTimeDays ?? input?.lead_time_days);
  const notes = text(input?.notes, 8000);
  if (unitPriceCents === null && !notes) {
    throw new Error('Une réponse sans prix et sans note n’apporte rien à la comparaison. Saisissez au moins l’un des deux.');
  }

  const response: RfqResponse = {
    id: randomUUID(),
    rfqId,
    receivedOn,
    unitPriceCents,
    currency: text(input?.currency, 8),
    moqUnits,
    leadTimeDays,
    documentsOffered: textArray(input?.documentsOffered ?? input?.documents_offered),
    quoteReference: text(input?.quoteReference ?? input?.quote_reference, 200),
    notes,
    recordedBy: adminId,
    createdAt: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('rfq_responses').insert({
      id: response.id,
      rfq_id: rfqId,
      received_on: response.receivedOn,
      unit_price_cents: response.unitPriceCents,
      currency: response.currency ?? null,
      moq_units: response.moqUnits,
      lead_time_days: response.leadTimeDays,
      documents_offered: response.documentsOffered,
      quote_reference: response.quoteReference ?? null,
      notes: response.notes ?? null,
      recorded_by: adminId
    });
    ensureDatabaseSuccess('enregistrement de la réponse fournisseur', error);
    if (rfq.status === 'sent') {
      await supabase.from('rfqs').update({ status: 'answered', updated_at: new Date().toISOString() }).eq('id', rfqId);
    }
    return response;
  }

  store.inMemoryRfqResponses.push(response as never);
  const index = store.inMemoryRfqs.findIndex(entry => entry.id === rfqId);
  if (index >= 0 && rfq.status === 'sent') {
    store.inMemoryRfqs[index] = { ...rfq, status: 'answered', updatedAt: new Date().toISOString() } as never;
  }
  return response;
}

export interface ResponseComparisonRow {
  response: RfqResponse;
  rfq: Rfq;
  supplierId?: string;
  supplierName?: string;
  /** Documents exigés par le besoin et réellement enregistrés chez ce fournisseur. */
  documentsHeld: string[];
  /** Documents exigés mais absents : c'est ce qui bloque la sélection. */
  documentsMissing: string[];
  pricePerUnitEuros: number | null;
  selectable: boolean;
}

/**
 * Comparaison des réponses reçues pour un besoin.
 *
 * Cette fonction **ne classe pas et ne choisit pas**. Elle met les faits côte à
 * côte, y compris les trous (« prix non communiqué »), et signale ce qui manque
 * pour pouvoir retenir. Décider reste un acte humain : un algorithme qui
 * désigne le moins cher transformerait un arbitrage commercial en résultat de
 * calcul, et cacherait qu'un devis sans CPSR ne vaut rien quel que soit son prix.
 */
export async function compareRfqResponses(store: SupabaseServerStore, sourcingItemId: string): Promise<{
  item: SourcingItem;
  rows: ResponseComparisonRow[];
  rfqCount: number;
  responseCount: number;
}> {
  const item = await getSourcingItem(store, sourcingItemId);
  if (!item) throw new Error('Besoin de sourcing introuvable.');
  const rfqs = await listRfqs(store, sourcingItemId);

  const rows: ResponseComparisonRow[] = [];
  for (const rfq of rfqs) {
    const responses = getSupabaseServerClient()
      ? await listResponsesFromDatabase(rfq.id)
      : store.inMemoryRfqResponses.filter(response => response.rfqId === rfq.id).map(mapResponse);
    for (const response of responses) {
      const supplierId = rfq.supplierId;
      const supplier = supplierId ? await store.getSupplierById(supplierId) : undefined;
      // Typé string[] volontairement : la liste exigée par le besoin est du
      // texte libre côté saisie, et la comparer à une union fermée casserait.
      const held: string[] = supplierId ? [...new Set<string>((await listSupplierDocuments(store, supplierId)).map(document => document.documentType))] : [];
      const missing = item.requiredDocuments.filter(required => !held.includes(required));
      rows.push({
        response,
        rfq,
        supplierId,
        supplierName: supplier?.legalName,
        documentsHeld: item.requiredDocuments.filter(required => held.includes(required)),
        documentsMissing: missing,
        pricePerUnitEuros: response.unitPriceCents === null ? null : response.unitPriceCents / 100,
        selectable: missing.length === 0
      });
    }
  }

  return { item, rows, rfqCount: rfqs.length, responseCount: rows.length };
}

async function listResponsesFromDatabase(rfqId: string): Promise<RfqResponse[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('rfq_responses').select('*').eq('rfq_id', rfqId).order('received_on', { ascending: true });
  ensureDatabaseSuccess('lecture des réponses fournisseur', error);
  return (data || []).map(mapResponse);
}

/**
 * Retient un fournisseur pour un besoin.
 *
 * Bloqué tant que les documents exigés ne sont pas **enregistrés** chez ce
 * fournisseur — pas « promis dans le devis ». Un fournisseur peut annoncer un
 * CPSR dans sa réponse ; tant que le fichier et sa date ne sont pas au
 * référentiel, la sélection est refusée. C'est la même règle qu'au chantier 14
 * pour les contrôles de fiche produit.
 */
export async function awardSourcingItem(store: SupabaseServerStore, adminId: string | null, sourcingItemId: string, responseId: string): Promise<SourcingItem> {
  const item = await getSourcingItem(store, sourcingItemId);
  if (!item) throw new Error('Besoin de sourcing introuvable.');
  if (item.status === 'awarded') throw new Error(`Ce besoin est déjà attribué au fournisseur « ${item.awardedSupplierId} ».`);

  const comparison = await compareRfqResponses(store, sourcingItemId);
  const row = comparison.rows.find(entry => entry.response.id === responseId);
  if (!row) throw new Error('Réponse introuvable pour ce besoin.');
  if (!row.supplierId) throw new Error('Cette réponse n’est rattachée à aucun fournisseur identifié.');
  if (row.documentsMissing.length > 0) {
    throw new Error(`Sélection refusée : il manque ${row.documentsMissing.join(', ')} chez ce fournisseur. Enregistrez les documents avant de retenir.`);
  }

  const now = new Date().toISOString();
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('sourcing_items').update({
      status: 'awarded', awarded_supplier_id: row.supplierId, awarded_response_id: responseId, updated_at: now
    }).eq('id', sourcingItemId);
    ensureDatabaseSuccess('attribution du besoin de sourcing', error);
    return { ...item, status: 'awarded', awardedSupplierId: row.supplierId, awardedResponseId: responseId, updatedAt: now };
  }

  const index = store.inMemorySourcingItems.findIndex(entry => entry.id === sourcingItemId);
  const awarded: SourcingItem = { ...item, status: 'awarded', awardedSupplierId: row.supplierId, awardedResponseId: responseId, updatedAt: now };
  if (index >= 0) store.inMemorySourcingItems[index] = awarded as never;
  return awarded;
}
