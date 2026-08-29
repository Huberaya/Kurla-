import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 16A — RÉFÉRENTIEL FOURNISSEURS.
 *
 * Constat mesuré avant d'écrire : il n'existait aucune table `suppliers`, et
 * `products.source_supplier` — vide sur les 16 produits — était une chaîne
 * libre que la route d'import enregistrait telle quelle. Deux imports nommant
 * « Laboratoire X » et « laboratoire x » auraient fait deux provenances
 * distinctes, sans qu'aucun contrôle ne le signale.
 *
 * Deux règles gouvernent cette couche, et elles viennent du même endroit que le
 * lieur d'ingrédients :
 *
 *  1. **On ne devine jamais une correspondance.** Deux écritures du *même* nom
 *     retombent sur la même entité par normalisation (casse, diacritiques,
 *     ponctuation, forme juridique). Deux entités *différentes* qui pourraient
 *     toutes deux correspondre produisent une ambiguïté **remontée**, jamais
 *     tranchée en silence : rattacher un produit au mauvais fournisseur corromp
 *     toute la traçabilité en aval.
 *  2. **Un document de conformité n'existe pas sans preuve.** `file_url` et
 *     `issued_on` sont exigés par le code *et* par une contrainte en base. Une
 *     case cochée n'est pas un CPSR.
 */

export const SUPPLIER_TYPES = [
  'contract_manufacturer',
  'textile',
  'tool',
  'raw_material',
  'packaging',
  'laboratory',
  'unknown'
] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const SUPPLIER_DOCUMENT_TYPES = [
  'responsible_person',
  'pif',
  'cpsr',
  'cpnp_notification',
  'spf_iso_24444',
  'uva_iso_24443',
  'oeko_tex',
  'eudr_statement',
  'microplastic_free',
  'gmp_iso_22716',
  'certificate_of_analysis',
  'other'
] as const;

export type SupplierDocumentType = (typeof SUPPLIER_DOCUMENT_TYPES)[number];

export interface Supplier {
  id: string;
  legalName: string;
  legalNameNormalized: string;
  tradeName?: string;
  supplierType: SupplierType;
  country?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
  moqUnits: number | null;
  leadTimeDays: number | null;
  certifications: string[];
  verificationStatus: 'verified' | 'pending' | 'not_provided';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDocument {
  id: string;
  supplierId: string;
  productId?: string;
  documentType: SupplierDocumentType;
  reference?: string;
  issuedOn: string;
  expiresOn?: string;
  fileUrl: string;
  note?: string;
  recordedBy: string | null;
  createdAt: string;
}

/**
 * Formes juridiques retirées du nom normalisé.
 *
 * « LABORATOIRE X SAS » et « Laboratoire X » sont le même fournisseur : la
 * forme juridique est une information légale, pas un élément d'identité pour la
 * résolution. La retirer est ce qui permet à deux écritures de se rejoindre.
 */
const LEGAL_FORM_WORDS = new Set([
  'sas', 'sasu', 'sarl', 'eurl', 'sa', 'sca', 'sci', 'scop',
  'ltd', 'limited', 'llc', 'inc', 'incorporated', 'corp', 'corporation',
  'company', 'co', 'gmbh', 'bv', 'nv', 'srl', 'spa', 'plc', 'ag', 'oy'
]);

/** Pliage du nom : casse, diacritiques, ponctuation, forme juridique. */
export function normalizeSupplierName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0 && !LEGAL_FORM_WORDS.has(word))
    .join(' ');
}

/** Identifiant lisible et stable, dérivé du nom normalisé. */
export function supplierIdFromName(name: string): string {
  const base = normalizeSupplierName(name).replace(/ /g, '-').slice(0, 80);
  return base || `fournisseur-${randomUUID().slice(0, 8)}`;
}

function text(value: unknown, max = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function positiveInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function mapSupplierRow(row: any): Supplier {
  return {
    id: String(row.id),
    legalName: String(row.legal_name ?? row.legalName ?? ''),
    legalNameNormalized: String(row.legal_name_normalized ?? row.legalNameNormalized ?? normalizeSupplierName(row.legal_name ?? row.legalName)),
    tradeName: row.trade_name ?? row.tradeName ?? undefined,
    supplierType: (SUPPLIER_TYPES as readonly string[]).includes(row.supplier_type ?? row.supplierType)
      ? (row.supplier_type ?? row.supplierType)
      : 'unknown',
    country: row.country ?? undefined,
    website: row.website ?? undefined,
    contactName: row.contact_name ?? row.contactName ?? undefined,
    contactEmail: row.contact_email ?? row.contactEmail ?? undefined,
    moqUnits: row.moq_units ?? row.moqUnits ?? null,
    leadTimeDays: row.lead_time_days ?? row.leadTimeDays ?? null,
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    verificationStatus: ['verified', 'pending', 'not_provided'].includes(row.verification_status ?? row.verificationStatus)
      ? (row.verification_status ?? row.verificationStatus)
      : 'not_provided',
    notes: row.notes ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString())
  };
}

function mapDocumentRow(row: any): SupplierDocument {
  return {
    id: String(row.id),
    supplierId: String(row.supplier_id ?? row.supplierId),
    productId: row.product_id ?? row.productId ?? undefined,
    documentType: row.document_type ?? row.documentType,
    reference: row.reference ?? undefined,
    issuedOn: String(row.issued_on ?? row.issuedOn),
    expiresOn: row.expires_on ?? row.expiresOn ?? undefined,
    fileUrl: String(row.file_url ?? row.fileUrl),
    note: row.note ?? undefined,
    recordedBy: row.recorded_by ?? row.recordedBy ?? null,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString())
  };
}

export async function listSuppliers(store: SupabaseServerStore): Promise<Supplier[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').select('*').order('legal_name', { ascending: true });
    ensureDatabaseSuccess('lecture du référentiel fournisseurs', error);
    return (data || []).map(mapSupplierRow);
  }
  return store.inMemorySuppliers.map(mapSupplierRow);
}

export async function getSupplierById(store: SupabaseServerStore, id: string): Promise<Supplier | undefined> {
  const suppliers = await listSuppliers(store);
  return suppliers.find(supplier => supplier.id === id);
}

/**
 * Erreur d'ambiguïté de fournisseur.
 *
 * Type dédié pour que l'API puisse répondre 409 et **nommer les entités en
 * concurrence** au lieu d'un 400 générique : celui qui importe doit pouvoir
 * trancher tout de suite.
 */
export class SupplierAmbiguityError extends Error {
  public readonly candidates: Supplier[];
  public readonly requestedName: string;
  constructor(requestedName: string, candidates: Supplier[]) {
    const names = candidates.map(candidate => `« ${candidate.legalName} » (${candidate.id})`).join(' ou ');
    super(`Fournisseur ambigu : « ${requestedName} » pourrait être ${names}. Tranchez explicitement, la plateforme ne devine pas.`);
    this.name = 'SupplierAmbiguityError';
    this.candidates = candidates;
    this.requestedName = requestedName;
  }
}

export interface SupplierResolution {
  /** Entité retenue, ou `null` si aucune correspondance certaine. */
  supplier: Supplier | null;
  /** Entités qui pourraient correspondre sans certitude. */
  candidates: Supplier[];
  /** Vrai quand plusieurs entités pourraient correspondre : à trancher par un humain. */
  ambiguous: boolean;
  normalized: string;
}

/**
 * Résolution d'un nom de fournisseur.
 *
 * - correspondance exacte sur le nom normalisé : l'entité est retournée ;
 * - plusieurs entités plausibles : **ambiguïté remontée**, rien n'est choisi ;
 * - aucune : `supplier` vaut `null`, et l'appelant décide (création explicite).
 */
export async function resolveSupplier(store: SupabaseServerStore, name: unknown): Promise<SupplierResolution> {
  const normalized = normalizeSupplierName(name);
  const suppliers = await listSuppliers(store);
  if (!normalized) return { supplier: null, candidates: [], ambiguous: false, normalized };

  const exact = suppliers.find(supplier => supplier.legalNameNormalized === normalized);
  if (exact) return { supplier: exact, candidates: [], ambiguous: false, normalized };

  // Plausibilité : l'un des deux noms contient tous les mots de l'autre.
  // Ce n'est volontairement **pas** une décision : c'est la liste de ce qu'un
  // humain doit départager.
  const tokens = normalized.split(' ');
  const candidates = suppliers.filter(supplier => {
    const other = supplier.legalNameNormalized.split(' ');
    const insideOther = tokens.every(token => other.includes(token));
    const otherInside = other.every(token => tokens.includes(token));
    return (insideOther || otherInside) && supplier.legalNameNormalized !== normalized;
  });

  return {
    supplier: null,
    candidates,
    ambiguous: candidates.length > 0,
    normalized
  };
}

export interface SupplierRegistration {
  supplier: Supplier;
  created: boolean;
}

/**
 * Rattachement d'un fournisseur nommé par un import.
 *
 * - déjà connu (même nom normalisé) : l'entité existante est réutilisée, c'est
 *   ce qui garantit qu'un fournisseur n'est jamais dupliqué par une variante
 *   d'écriture ;
 * - ambigu : **échec nominatif**. L'import s'arrête et nomme les entités en
 *   concurrence, plutôt que d'en choisir une au hasard ;
 * - inconnu : l'entité est créée en `not_provided`. Elle naît non vérifiée :
 *   un nom écrit dans un fichier CSV n'est pas une vérification.
 */
export async function registerSupplierByName(store: SupabaseServerStore, adminId: string | null, name: unknown): Promise<SupplierRegistration> {
  const rawName = text(name, 240);
  if (!rawName) throw new Error('Nom de fournisseur obligatoire.');

  const resolution = await resolveSupplier(store, rawName);
  if (resolution.supplier) return { supplier: resolution.supplier, created: false };
  if (resolution.ambiguous) throw new SupplierAmbiguityError(rawName, resolution.candidates);
  const supplier = await createSupplier(store, adminId, { legalName: rawName });
  return { supplier, created: true };
}

export async function createSupplier(store: SupabaseServerStore, adminId: string | null, input: any): Promise<Supplier> {
  const legalName = text(input?.legalName ?? input?.legal_name, 240);
  if (!legalName) throw new Error('La raison sociale du fournisseur est obligatoire.');

  const existing = await resolveSupplier(store, legalName);
  if (existing.supplier) return existing.supplier;
  if (existing.ambiguous) throw new SupplierAmbiguityError(legalName, existing.candidates);

  const supplierType = (SUPPLIER_TYPES as readonly string[]).includes(input?.supplierType ?? input?.supplier_type)
    ? (input?.supplierType ?? input?.supplier_type)
    : 'unknown';
  const now = new Date().toISOString();
  const supplier: Supplier = {
    id: supplierIdFromName(legalName),
    legalName,
    legalNameNormalized: existing.normalized,
    tradeName: text(input?.tradeName ?? input?.trade_name, 240),
    supplierType,
    country: text(input?.country, 80),
    website: text(input?.website, 300),
    contactName: text(input?.contactName ?? input?.contact_name, 160),
    contactEmail: text(input?.contactEmail ?? input?.contact_email, 200),
    moqUnits: positiveInt(input?.moqUnits ?? input?.moq_units),
    leadTimeDays: positiveInt(input?.leadTimeDays ?? input?.lead_time_days),
    certifications: Array.isArray(input?.certifications) ? input.certifications.filter((item: unknown) => typeof item === 'string') : [],
    // Un fournisseur créé par la plateforme n'est jamais « vérifié » : la
    // vérification est un acte humain, documenté, qui vient après.
    verificationStatus: 'not_provided',
    notes: text(input?.notes, 4000),
    createdAt: now,
    updatedAt: now
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('suppliers').insert({
      id: supplier.id,
      legal_name: supplier.legalName,
      legal_name_normalized: supplier.legalNameNormalized,
      trade_name: supplier.tradeName ?? null,
      supplier_type: supplier.supplierType,
      country: supplier.country ?? null,
      website: supplier.website ?? null,
      contact_name: supplier.contactName ?? null,
      contact_email: supplier.contactEmail ?? null,
      moq_units: supplier.moqUnits,
      lead_time_days: supplier.leadTimeDays,
      certifications: supplier.certifications,
      verification_status: supplier.verificationStatus,
      notes: supplier.notes ?? null
    });
    ensureDatabaseSuccess('création du fournisseur', error);
    return supplier;
  }

  store.inMemorySuppliers.push(supplier as never);
  return supplier;
}

/**
 * Rattachement d'un document de conformité.
 *
 * Le fichier et la date d'émission sont obligatoires. Ce n'est pas une
 * préférence : un CPSR sans fichier et sans date est une affirmation, et la
 * contrainte `supplier_document_needs_proof` en base refuse la ligne de toute
 * façon. Le contrôle est ici pour que l'erreur soit lisible.
 */
export async function addSupplierDocument(store: SupabaseServerStore, adminId: string | null, input: any): Promise<SupplierDocument> {
  const supplierId = text(input?.supplierId ?? input?.supplier_id, 80);
  if (!supplierId) throw new Error('Fournisseur obligatoire.');
  if (!await getSupplierById(store, supplierId)) throw new Error('Fournisseur introuvable.');

  const documentType = input?.documentType ?? input?.document_type;
  if (!(SUPPLIER_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
    throw new Error(`Type de document inconnu : ${String(documentType)}. Attendu : ${SUPPLIER_DOCUMENT_TYPES.join(', ')}.`);
  }
  const fileUrl = text(input?.fileUrl ?? input?.file_url, 2000);
  const issuedOn = text(input?.issuedOn ?? input?.issued_on, 40);
  if (!fileUrl) throw new Error('Un document de conformité exige un fichier. Sans fichier, ce n’est pas un document.');
  if (!issuedOn || Number.isNaN(Date.parse(issuedOn))) throw new Error('Un document de conformité exige une date d’émission.');

  const expiresOn = text(input?.expiresOn ?? input?.expires_on, 40);
  if (expiresOn && Date.parse(expiresOn) < Date.parse(issuedOn)) throw new Error('La date d’expiration précède la date d’émission.');

  const document: SupplierDocument = {
    id: randomUUID(),
    supplierId,
    productId: text(input?.productId ?? input?.product_id, 80),
    documentType: documentType as SupplierDocumentType,
    reference: text(input?.reference, 200),
    issuedOn,
    expiresOn,
    fileUrl,
    note: text(input?.note, 2000),
    recordedBy: adminId,
    createdAt: new Date().toISOString()
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from('supplier_documents').insert({
      id: document.id,
      supplier_id: document.supplierId,
      product_id: document.productId ?? null,
      document_type: document.documentType,
      reference: document.reference ?? null,
      issued_on: document.issuedOn,
      expires_on: document.expiresOn ?? null,
      file_url: document.fileUrl,
      note: document.note ?? null,
      recorded_by: document.recordedBy
    });
    ensureDatabaseSuccess('enregistrement du document fournisseur', error);
    return document;
  }

  store.inMemorySupplierDocuments.push(document as never);
  return document;
}

export async function listSupplierDocuments(store: SupabaseServerStore, supplierId: string): Promise<SupplierDocument[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('supplier_documents').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des documents fournisseur', error);
    return (data || []).map(mapDocumentRow);
  }
  return store.inMemorySupplierDocuments.filter(item => item.supplierId === supplierId).map(mapDocumentRow);
}

/**
 * État de conformité d'un fournisseur : quels documents nous avons, lesquels
 * manquent. C'est la réponse à « peut-on vendre ce qui vient de chez lui ».
 */
export async function getSupplierCompliance(store: SupabaseServerStore, supplierId: string): Promise<{
  supplierId: string;
  documents: SupplierDocument[];
  heldTypes: string[];
  expiredTypes: string[];
}> {
  const documents = await listSupplierDocuments(store, supplierId);
  const today = new Date().toISOString().slice(0, 10);
  const expired = documents.filter(document => document.expiresOn && document.expiresOn < today);
  return {
    supplierId,
    documents,
    heldTypes: [...new Set(documents.map(document => document.documentType))],
    expiredTypes: [...new Set(expired.map(document => document.documentType))]
  };
}
