/**
 * CHANTIER 1 — Cycle de vie produit (lecture, pas d'écriture).
 *
 * Le langage demandé (identifié → sourcing → offre → validé → catalogue →
 * publié) existe déjà, éclaté dans plusieurs vocabulaires. Ce module le
 * **nomme** à partir des tables existantes. Il n'ajoute pas de 5ᵉ enum en
 * base, pas de second PIM, pas de table Product/Supplier parallèle.
 *
 * Tables canoniques (réutiliser, ne pas recréer) :
 *
 *   identifié     → sourcing_fond_positions + sourcing_product_candidates
 *   en sourcing   → sourcing_items + rfqs + sourcing_workflow_events
 *   offre         → product_sources  (N fournisseurs × modèle)
 *   validé        → portes déjà là (publication-readiness, workflow, CPNP)
 *   catalogue     → products (draft / pending_review)
 *   publié        → products.catalog_status = published + isPublishableProduct
 *   fournisseur   → suppliers (+ supplier_documents). Une piste n'en est pas un.
 *
 * `products.supplier_id` n'est PAS l'offre : c'est la projection de la source
 * primaire. `products.source_supplier` n'est PAS un nom de fournisseur : c'est
 * un marqueur formulation/placeholder.
 *
 * Hair et Skin partagent ce graphe. Skin = `products.category === 'peau'`.
 */

import { selectPrimarySource, type ProductSource, type SupplyModel } from './supplyModel';
import type { PipelineStage } from './catalogPipeline';
import { documentedNeedFromSourcingItemId, skinNeedForDocumentedNeed } from './skinNeedMapping';
import type { SkinNeed } from './skinTaxonomy';

/** Catégorie catalogue Skin déjà utilisée par l'admin (ne pas inventer soins_visage). */
export const SKIN_CATALOG_CATEGORY = 'peau';

export const CANONICAL_TABLES = {
  catalogSku: 'products',
  identifiedCoverage: 'sourcing_fond_positions',
  identifiedCandidate: 'sourcing_product_candidates',
  sourcingNeed: 'sourcing_items',
  offer: 'product_sources',
  supplier: 'suppliers',
  prospect: 'sourcing_prospects',
} as const;

/**
 * Où écrire selon le stade. L'import ~500 atterrit en identifié, jamais en
 * `published`. Le chantier 13 branchera l'import sur cette règle.
 */
export const WRITE_TARGET_BY_INTENT = {
  import_identified: 'sourcing_fond_positions | sourcing_product_candidates',
  start_sourcing: 'sourcing_items',
  record_offer: 'product_sources',
  enter_catalog: 'products.catalog_status = draft',
  publish: 'catalogGate + isPublishableProduct — acte humain',
} as const;

/** Année 1 : pas de stock appartement comme modèle principal. */
export const YEAR1_FULFILLMENT_MODELS: readonly SupplyModel[] = ['dropshipping', 'affiliation', '3pl'];

export type RecordKind = 'fond_position' | 'candidate' | 'sourcing_item' | 'product';

/**
 * Stades métier mutuellement exclusifs. L'offre et la validation sont des
 * *faits* (flags), pas des cases du funnel : un produit publié a souvent
 * déjà une offre, un draft peut être validé sans être public.
 */
export const BUSINESS_STAGES = ['identified', 'sourcing', 'catalog', 'published', 'refused'] as const;
export type BusinessStage = typeof BUSINESS_STAGES[number];

export const BUSINESS_STAGE_LABELS: Record<BusinessStage, string> = {
  identified: 'Identifié',
  sourcing: 'En sourcing',
  catalog: 'En catalogue',
  published: 'Publié',
  refused: 'Refusé',
};

export type LifecycleFacts = {
  kind: RecordKind;
  catalogStatus?: string | null;
  isTestListing?: boolean;
  isPubliclyListable?: boolean;
  isCheckoutEligible?: boolean;
  workflowState?: string | null;
  sourcingItemStatus?: string | null;
  rfqOpen?: boolean;
  hasPricedQuote?: boolean;
  sourcesCount?: number;
  publicationReady?: boolean;
  linkedProductId?: string | null;
  candidatePublishedOn?: string | null;
};

export type LifecycleResolution = {
  stage: BusinessStage;
  hasOffer: boolean;
  validated: boolean;
  publishable: boolean;
  isTestListing: boolean;
  /** Jamais vrai pour un identifié, un test listing, ou un coming-soon. */
  isPublic: boolean;
  reasons: string[];
};

const SOURCING_WORKFLOW = new Set([
  'supplier_identified',
  'evaluation',
  'validated',
  'approved',
  'ready_to_publish',
]);

const VALIDATED_WORKFLOW = new Set([
  'validated',
  'approved',
  'ready_to_publish',
  'published',
  'active',
]);

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveLifecycle(facts: LifecycleFacts): LifecycleResolution {
  const reasons: string[] = [];
  const isTestListing = facts.isTestListing === true;
  const sourcesCount = typeof facts.sourcesCount === 'number' && facts.sourcesCount > 0 ? facts.sourcesCount : 0;
  const hasOffer = sourcesCount > 0 || facts.hasPricedQuote === true;
  const catalogStatus = text(facts.catalogStatus).toLowerCase();
  const workflow = text(facts.workflowState).toLowerCase();
  const itemStatus = text(facts.sourcingItemStatus).toLowerCase();
  const hasCatalogRow = facts.kind === 'product' || Boolean(text(facts.linkedProductId));
  const publicationReady = facts.publicationReady === true;
  const listable = facts.isPubliclyListable === true;
  const validated = publicationReady || VALIDATED_WORKFLOW.has(workflow);

  if (catalogStatus === 'unavailable' || workflow === 'refused' || itemStatus === 'abandoned') {
    reasons.push(itemStatus === 'abandoned' ? 'besoin abandonné' : workflow === 'refused' ? 'workflow refusé' : 'fiche indisponible');
    return {
      stage: 'refused',
      hasOffer,
      validated: false,
      publishable: false,
      isTestListing,
      isPublic: false,
      reasons,
    };
  }

  const publishable = hasCatalogRow && publicationReady && !isTestListing && catalogStatus !== 'unavailable';

  if (hasCatalogRow && catalogStatus === 'published' && listable && !isTestListing) {
    reasons.push('catalog_status = published et listable');
    return {
      stage: 'published',
      hasOffer,
      validated,
      publishable,
      isTestListing,
      isPublic: true,
      reasons,
    };
  }

  if (hasCatalogRow) {
    if (isTestListing) reasons.push('listing test : hors boutique réelle');
    else if (catalogStatus === 'published' && !listable) reasons.push('publié mais non listable (porte boutique)');
    else reasons.push(catalogStatus ? `fiche catalogue (${catalogStatus || 'draft'})` : 'fiche catalogue');
    return {
      stage: 'catalog',
      hasOffer,
      validated,
      publishable,
      isTestListing,
      isPublic: false,
      reasons,
    };
  }

  // `published_on` sur un candidat SANS fiche = une date, pas une mise en boutique.
  if (text(facts.candidatePublishedOn)) {
    reasons.push('candidat marqué publié sans fiche catalogue — reste hors boutique');
  }

  const inSourcing = itemStatus === 'in_rfq'
    || itemStatus === 'awarded'
    || facts.rfqOpen === true
    || SOURCING_WORKFLOW.has(workflow);

  if (inSourcing) {
    reasons.push(itemStatus === 'awarded' ? 'besoin attribué' : facts.rfqOpen ? 'RFQ ouverte' : 'workflow sourcing');
    return {
      stage: 'sourcing',
      hasOffer,
      validated,
      publishable: false,
      isTestListing: false,
      isPublic: false,
      reasons,
    };
  }

  reasons.push(facts.kind === 'fond_position' ? 'position de fond (hors catalogue)' : facts.kind === 'candidate' ? 'candidat sourcing' : 'identifié, pas de fiche');
  return {
    stage: 'identified',
    hasOffer,
    validated: false,
    publishable: false,
    isTestListing: false,
    isPublic: false,
    reasons,
  };
}

export function businessStageFromPipelineStage(stage: PipelineStage): BusinessStage {
  if (stage === 'identified') return 'identified';
  if (stage === 'publie' || stage === 'vendable') return 'published';
  return 'catalog';
}

export function primarySupplierIdFromSources(sources: ProductSource[]): string | null {
  return selectPrimarySource(sources)?.supplierId ?? null;
}

/**
 * Identité fournisseur : un id structuré, ou un libellé non résolu.
 * Un texte libre n'est jamais promu en fournisseur.
 */
export function resolveSupplierIdentity(input: {
  productSupplierId?: string | null;
  primarySourceSupplierId?: string | null;
  prospectSupplierId?: string | null;
  /** Canal / nom de piste — PAS un fournisseur. */
  unresolvedLabel?: string | null;
  /** Marqueur formulation (`source_supplier`) — à ignorer comme nom. */
  sourceSupplierMarker?: string | null;
}): {
  supplierId: string | null;
  unresolvedLabel: string | null;
  primaryDivergesFromProduct: boolean;
} {
  const fromSource = text(input.primarySourceSupplierId) || null;
  const fromProduct = text(input.productSupplierId) || null;
  const fromProspect = text(input.prospectSupplierId) || null;
  const supplierId = fromSource || fromProduct || fromProspect;
  const label = text(input.unresolvedLabel) || null;
  return {
    supplierId,
    unresolvedLabel: supplierId ? null : label,
    primaryDivergesFromProduct: Boolean(fromSource && fromProduct && fromSource !== fromProduct),
  };
}

export type DropshipEligibility = 'allowed' | 'forbidden' | 'unknown';

/**
 * Cosmétique Skin/Hair : pas de dropship 24–48h (CPNP / douane).
 * Accessoires : autorisé. Catégorie inconnue : on ne devine pas.
 */
export function dropshipEligibility(category?: string | null): DropshipEligibility {
  const value = text(category).toLowerCase();
  if (!value) return 'unknown';
  if (value === 'accessoires') return 'allowed';
  if (value === 'peau' || value === 'cheveux' || value === 'teint' || value === 'soins_visage' || value === 'kits' || value.startsWith('kit-')) {
    return 'forbidden';
  }
  return 'unknown';
}

export type UnifiedRecord = {
  uid: string;
  kind: RecordKind;
  title: string;
  brand: string | null;
  category: string | null;
  documentedNeed: number | null;
  skinNeed: SkinNeed | null;
  supplierId: string | null;
  unresolvedSupplierLabel: string | null;
  /** null = à obtenir. Jamais 0 inventé. */
  priceEur: number | null;
  lifecycle: LifecycleResolution;
  linkedProductId: string | null;
  sourcingItemId: string | null;
};

function nullPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function centsToEur(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n / 100 : null;
}

/** Id consolidé `pos-{sourcing_item_id}-{rang}` — ne jamais inventer l'item. */
export function parseConsolidatedPositionId(id: string): { sourcingItemId: string; rang: number | null } {
  const raw = String(id || '').trim();
  const match = /^pos-(.+)-(\d+)$/.exec(raw);
  if (match) return { sourcingItemId: match[1], rang: Number(match[2]) };
  return { sourcingItemId: raw.replace(/^pos-/, ''), rang: null };
}

export function identifiedDedupKey(brand: string | null, title: string): string {
  const norm = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${norm(brand || '')}|${norm(title || '')}`;
}

export function unifyFondPosition(position: {
  sourcing_item_id?: string;
  sourcingItemId?: string;
  rang?: number;
  id?: string;
  marque?: string;
  brand?: string;
  produit?: string;
  name?: string;
  prix_constate_cents?: number | null;
  priceEur?: number | null;
  fournisseur_canal?: string;
  supplierName?: string;
  sourcingItemStatus?: string | null;
  rfqOpen?: boolean;
  hasPricedQuote?: boolean;
}): UnifiedRecord {
  const sourcingItemId = text(position.sourcing_item_id || position.sourcingItemId);
  const rang = position.rang != null ? String(position.rang) : 'x';
  const documentedNeed = documentedNeedFromSourcingItemId(sourcingItemId);
  const title = text(position.produit || position.name) || sourcingItemId || 'position';
  const brand = text(position.marque || position.brand) || null;
  const identity = resolveSupplierIdentity({
    unresolvedLabel: text(position.fournisseur_canal || position.supplierName) || null,
  });
  const priceEur = position.priceEur != null ? nullPrice(position.priceEur) : centsToEur(position.prix_constate_cents);
  const lifecycle = resolveLifecycle({
    kind: 'fond_position',
    sourcingItemStatus: position.sourcingItemStatus,
    rfqOpen: position.rfqOpen,
    // Un prix public constaté n'est PAS une offre fournisseur.
    hasPricedQuote: position.hasPricedQuote === true,
  });
  return {
    uid: `fond:${sourcingItemId || 'x'}:${rang}`,
    kind: 'fond_position',
    title,
    brand,
    category: SKIN_CATALOG_CATEGORY,
    documentedNeed,
    skinNeed: documentedNeed != null ? skinNeedForDocumentedNeed(documentedNeed) : null,
    supplierId: identity.supplierId,
    unresolvedSupplierLabel: identity.unresolvedLabel,
    priceEur,
    lifecycle,
    linkedProductId: null,
    sourcingItemId: sourcingItemId || null,
  };
}

export function unifyCandidate(candidate: {
  id?: string;
  product?: string;
  name?: string;
  brand?: string;
  category?: string;
  prospect_supplier_id?: string | null;
  prospectSupplierId?: string | null;
  supplierName?: string | null;
  public_price_cents?: number | null;
  priceEur?: number | null;
  draft_product_id?: string | null;
  draftProductId?: string | null;
  published_on?: string | null;
  sample_validated?: boolean;
  purchase_price_cents?: number | null;
  catalogStatus?: string | null;
  isTestListing?: boolean;
  isPubliclyListable?: boolean;
  publicationReady?: boolean;
  sourcesCount?: number;
  workflowState?: string | null;
}): UnifiedRecord {
  const id = text(candidate.id) || 'candidate';
  const linkedProductId = text(candidate.draft_product_id || candidate.draftProductId) || null;
  const identity = resolveSupplierIdentity({
    prospectSupplierId: candidate.prospect_supplier_id || candidate.prospectSupplierId,
    unresolvedLabel: candidate.supplierName,
  });
  const priceEur = candidate.priceEur != null ? nullPrice(candidate.priceEur) : centsToEur(candidate.public_price_cents);
  const hasPricedQuote = centsToEur(candidate.purchase_price_cents) != null || candidate.sample_validated === true;
  const lifecycle = resolveLifecycle({
    kind: linkedProductId ? 'product' : 'candidate',
    linkedProductId,
    catalogStatus: candidate.catalogStatus,
    isTestListing: candidate.isTestListing,
    isPubliclyListable: candidate.isPubliclyListable,
    publicationReady: candidate.publicationReady,
    sourcesCount: candidate.sourcesCount,
    workflowState: candidate.workflowState,
    hasPricedQuote,
    candidatePublishedOn: candidate.published_on,
  });
  return {
    uid: `candidate:${id}`,
    kind: 'candidate',
    title: text(candidate.product || candidate.name) || id,
    brand: text(candidate.brand) || null,
    category: text(candidate.category) || null,
    documentedNeed: null,
    skinNeed: null,
    supplierId: identity.supplierId,
    unresolvedSupplierLabel: identity.unresolvedLabel,
    priceEur,
    lifecycle,
    linkedProductId,
    sourcingItemId: null,
  };
}

export function unifyProduct(product: {
  id?: string;
  name?: string;
  brand?: string;
  category?: string;
  catalogStatus?: string | null;
  catalog_status?: string | null;
  isTestListing?: boolean;
  is_test_listing?: boolean;
  supplierId?: string | null;
  supplier_id?: string | null;
  source_supplier?: string | null;
  sourceSupplier?: string | null;
  price?: number | null;
  basePrice?: number | null;
  truth?: { isPubliclyListable?: boolean; isCheckoutEligible?: boolean; isTestListing?: boolean } | null;
  sourcesCount?: number;
  primarySourceSupplierId?: string | null;
  publicationReady?: boolean;
  workflowState?: string | null;
  source_candidate_id?: string | null;
}): UnifiedRecord {
  const id = text(product.id) || 'product';
  const catalogStatus = product.catalogStatus ?? product.catalog_status;
  const isTestListing = product.isTestListing === true
    || product.is_test_listing === true
    || product.truth?.isTestListing === true;
  const identity = resolveSupplierIdentity({
    productSupplierId: product.supplierId ?? product.supplier_id,
    primarySourceSupplierId: product.primarySourceSupplierId,
    sourceSupplierMarker: product.source_supplier ?? product.sourceSupplier,
  });
  const price = Number(product.basePrice ?? product.price);
  const lifecycle = resolveLifecycle({
    kind: 'product',
    catalogStatus,
    isTestListing,
    isPubliclyListable: product.truth?.isPubliclyListable === true,
    isCheckoutEligible: product.truth?.isCheckoutEligible === true,
    sourcesCount: product.sourcesCount,
    publicationReady: product.publicationReady,
    workflowState: product.workflowState,
  });
  return {
    uid: `product:${id}`,
    kind: 'product',
    title: text(product.name) || id,
    brand: text(product.brand) || null,
    category: text(product.category) || null,
    documentedNeed: null,
    skinNeed: null,
    supplierId: identity.supplierId,
    unresolvedSupplierLabel: identity.unresolvedLabel,
    priceEur: Number.isFinite(price) && price > 0 ? price : null,
    lifecycle,
    linkedProductId: id,
    sourcingItemId: null,
  };
}

export function countByStage(records: UnifiedRecord[]): Record<BusinessStage, number> {
  const counts: Record<BusinessStage, number> = {
    identified: 0, sourcing: 0, catalog: 0, published: 0, refused: 0,
  };
  for (const record of records) counts[record.lifecycle.stage] += 1;
  return counts;
}

export function publiclyListableCount(records: UnifiedRecord[]): number {
  return records.filter(record => record.lifecycle.isPublic).length;
}
