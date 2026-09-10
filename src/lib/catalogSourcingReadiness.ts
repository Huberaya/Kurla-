/**
 * Chantier 2 — contrat de réalité fournisseur/catalogue.
 *
 * Cette couche ne crée ni fournisseur, ni prix, ni document. Elle répond à une
 * question plus stricte que « la fiche contient-elle du texte ? » :
 * peut-on identifier l'origine de cette référence et démontrer qu'elle est
 * achetable avec les preuves minimales attendues ?
 */

import { COSMETIC_RECOMMENDED_DOCS, COSMETIC_REQUIRED_DOCS, requiresCpnp } from './cosmeticCompliance';

export type CatalogSourcingState =
  | 'no_source'
  | 'supplier_unresolved'
  | 'supplier_pending'
  | 'documents_pending'
  | 'ready';

export type SourcingReadinessMissing = {
  field: string;
  label: string;
};

export type CatalogSourcingReadiness = {
  productId: string;
  state: CatalogSourcingState;
  ready: boolean;
  supplierId?: string;
  supplierName?: string;
  requiredDocuments: string[];
  recommendedDocuments: string[];
  missingRecommendedDocuments: string[];
  heldDocuments: string[];
  expiredDocuments: string[];
  missing: SourcingReadinessMissing[];
};

function read(product: any, camel: string, snake: string): unknown {
  return product?.[camel] !== undefined ? product[camel] : product?.[snake];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numeric(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isCosmetic(product: any): boolean {
  return requiresCpnp(product);
}

function hasUsableImage(product: any): boolean {
  const image = text(product?.image || product?.image_url);
  const gallery = Array.isArray(product?.galleryImages || product?.images)
    ? (product.galleryImages || product.images)
    : [];
  return /^https?:\/\//i.test(image) || gallery.some((entry: any) => /^https?:\/\//i.test(text(entry?.url)));
}

function hasTrustedImage(product: any): boolean {
  const status = read(product, 'imageOwnershipStatus', 'image_ownership_status');
  return ['brand_provided', 'licensed'].includes(String(status));
}

function hasComposition(product: any): boolean {
  return text(read(product, 'inci', 'inci')) !== ''
    || (Array.isArray(product?.ingredients) && product.ingredients.length > 0)
    || (Array.isArray(product?.keyIngredients) && product.keyIngredients.length > 0);
}

function hasPositiveStock(product: any): boolean {
  if (product?.inStock === true || product?.in_stock === true) return true;
  const quantity = numeric(read(product, 'stockQuantity', 'stock_quantity'));
  if (quantity !== null && quantity > 0) return true;
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.some((variant: any) => {
    const available = numeric(variant?.availableQuantity ?? variant?.available_quantity);
    if (available !== null) return available > 0;
    const variantQuantity = numeric(variant?.stockQuantity ?? variant?.stock_quantity);
    const reserved = numeric(variant?.reservedQuantity ?? variant?.reserved_quantity) || 0;
    return variantQuantity !== null && variantQuantity - reserved > 0;
  });
}

/**
 * Contrat minimal du sourcing pour une référence réelle. Les valeurs absentes
 * sont des blocages nommés : elles ne sont jamais remplacées par une valeur
 * plausible ou une estimation fournisseur.
 */
export function evaluateCatalogSourcingReadiness(
  product: any,
  context: {
    supplier?: { id?: string; legalName?: string; verificationStatus?: string; leadTimeDays?: number | null } | null;
    documents?: Array<{ documentType?: string; expiresOn?: string; productId?: string }>;
    today?: string;
  } = {}
): CatalogSourcingReadiness {
  const productId = String(product?.id || '');
  const sourceSupplier = text(read(product, 'sourceSupplier', 'source_supplier'));
  const supplierId = text(read(product, 'supplierId', 'supplier_id')) || undefined;
  const supplierSku = text(read(product, 'supplierSku', 'supplier_sku'));
  const category = text(product?.category || product?.department).toLowerCase();
  const cosmetic = isCosmetic(product);
  const documents = Array.isArray(context.documents) ? context.documents : [];
  const today = context.today || new Date().toISOString().slice(0, 10);
  const heldDocuments = [...new Set(documents.map(document => String(document.documentType || '')).filter(Boolean))];
  const expiredDocuments = [...new Set(documents
    .filter(document => document.expiresOn && document.expiresOn < today)
    .map(document => String(document.documentType || ''))
    .filter(Boolean))];
  const requiredDocuments = cosmetic ? [...COSMETIC_REQUIRED_DOCS] : [];
  const recommendedDocuments = cosmetic ? [...COSMETIC_RECOMMENDED_DOCS] : [];
  const missingRecommendedDocuments = recommendedDocuments.filter(document =>
    !heldDocuments.includes(document) || expiredDocuments.includes(document)
  );
  const missing: SourcingReadinessMissing[] = [];

  if (!sourceSupplier) missing.push({ field: 'source_supplier', label: 'provenance fournisseur déclarée absente' });
  if (!supplierId) missing.push({ field: 'supplier_id', label: 'fournisseur non résolu dans le référentiel' });
  if (supplierId && context.supplier === null) {
    missing.push({ field: 'supplier_id', label: 'fournisseur déclaré mais introuvable dans le référentiel' });
  } else if (supplierId && context.supplier?.verificationStatus !== 'verified') {
    missing.push({ field: 'supplier_verification_status', label: 'fournisseur non vérifié' });
  }
  if (!supplierSku) missing.push({ field: 'supplier_sku', label: 'SKU fournisseur absent' });
  if (!text(product?.sizeLabel || product?.size_label)) {
    missing.push({ field: 'size_label', label: 'format/contenance absent' });
  }
  if (numeric(product?.price) === null || Number(product.price) <= 0) {
    missing.push({ field: 'price', label: 'prix TTC absent ou invalide' });
  }
  const priceIncludesVat = product?.priceIncludesVat ?? product?.price_includes_vat;
  if (priceIncludesVat !== true) {
    missing.push({ field: 'price_includes_vat', label: 'prix TTC non confirmé' });
  }
  const vatRate = numeric(read(product, 'vatRate', 'vat_rate'));
  if (vatRate === null || vatRate < 0) {
    missing.push({ field: 'vat_rate', label: 'taux de TVA absent ou invalide' });
  }
  const countries = product?.countryAvailability || product?.country_availability;
  if (!Array.isArray(countries) || countries.length === 0) {
    missing.push({ field: 'country_availability', label: 'pays de vente absents' });
  }
  const variants = product?.variants;
  const variantsRequired = product?.variantsRequired ?? product?.variants_required;
  if (variantsRequired === true && (!Array.isArray(variants) || variants.length === 0)) {
    missing.push({ field: 'variants', label: 'variantes annoncées mais non renseignées' });
  }
  const leadTime = numeric(read(product, 'leadTimeDays', 'lead_time_days')) ?? numeric(context.supplier?.leadTimeDays);
  if (leadTime === null || leadTime < 0) {
    missing.push({ field: 'lead_time_days', label: 'délai fournisseur absent' });
  }
  const returnsPolicy = product?.returnsPolicy ?? product?.returns_policy;
  const hasReturnsPolicy = (typeof returnsPolicy === 'string' && returnsPolicy.trim() !== '')
    || (returnsPolicy && typeof returnsPolicy === 'object' && Object.keys(returnsPolicy).length > 0);
  if (!hasReturnsPolicy) {
    missing.push({ field: 'returns_policy', label: 'politique de retours absente' });
  }
  if (!hasUsableImage(product)) missing.push({ field: 'image', label: 'photo produit exploitable absente' });
  if (!hasTrustedImage(product)) missing.push({ field: 'image_ownership_status', label: 'droits sur la photo fournisseur non établis' });
  if (cosmetic && !hasComposition(product)) {
    missing.push({ field: 'inci', label: 'INCI/formule validée absente' });
  }
  const stockStatus = read(product, 'stockValidationStatus', 'stock_validation_status');
  if (stockStatus !== 'verified') {
    missing.push({ field: 'stock_validation_status', label: 'stock réel non vérifié' });
  }
  if (!hasPositiveStock(product)) {
    missing.push({ field: 'stock_quantity', label: 'stock disponible nul ou absent — produit non achetable maintenant' });
  }
  const isPreorder = product?.isPreorder === true || product?.is_preorder === true
    || (Array.isArray(product?.badges) && product.badges.some((badge: unknown) => String(badge).toLowerCase() === 'preorder'));
  if (isPreorder) {
    missing.push({ field: 'commercial_state', label: 'précommande — à séparer du catalogue réellement achetable' });
  }

  for (const required of requiredDocuments) {
    if (!heldDocuments.includes(required)) {
      missing.push({ field: `supplier_document:${required}`, label: `document fournisseur manquant : ${required}` });
    } else if (expiredDocuments.includes(required)) {
      missing.push({ field: `supplier_document:${required}`, label: `document fournisseur expiré : ${required}` });
    }
  }

  const uniqueMissing = missing.filter((entry, index, values) =>
    values.findIndex(candidate => candidate.field === entry.field) === index
  );
  let state: CatalogSourcingState;
  if (!sourceSupplier && !supplierId) state = 'no_source';
  else if (supplierId && context.supplier === null) state = 'supplier_unresolved';
  else if (sourceSupplier && !supplierId) state = 'supplier_unresolved';
  else if (supplierId && context.supplier?.verificationStatus !== 'verified') state = 'supplier_pending';
  else if (uniqueMissing.length > 0) state = 'documents_pending';
  else state = 'ready';

  return {
    productId,
    state,
    ready: uniqueMissing.length === 0,
    supplierId,
    supplierName: context.supplier?.legalName,
    requiredDocuments,
    recommendedDocuments,
    missingRecommendedDocuments,
    heldDocuments,
    expiredDocuments,
    missing: uniqueMissing,
  };
}
