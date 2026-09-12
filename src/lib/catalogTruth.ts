/**
 * Truth layer catalogue — source unique de la réalité commerciale.
 *
 * Ce module ne crée aucune preuve produit. Il normalise les formes snake_case /
 * camelCase et applique les mêmes marqueurs à la boutique, à l'IA, au SEO et
 * au tunnel de paiement.
 *
 * Séparation volontaire :
 * - `administrativeStatus` décrit le workflow interne (draft/published/etc.) ;
 * - `commercialState` décrit ce que le produit est réellement (cible,
 *   placeholder, précommande, disponible ou indisponible) ;
 * - `isPubliclyListable` et `isCheckoutEligible` sont des portes dérivées.
 */

import { scanCatalogClaims, type CatalogClaimScan } from './catalogClaims';
import { evaluateSkinProductReadiness, type SkinProductReadiness } from './skinCommercialReadiness';
import { hasDocumentedExternalPreorder, isInternalFormulationSource } from './preorderEvidence';

export const CATALOG_TRUTH_VERSION = '2026-09-12.skin-catalog.v1';

export type CatalogAdministrativeStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'unavailable'
  | string;

export type CatalogCommercialState =
  | 'draft'
  | 'formulation_target'
  | 'pending_validation'
  | 'placeholder'
  | 'preorder'
  | 'available'
  | 'unavailable';

export type CatalogTruth = {
  administrativeStatus: CatalogAdministrativeStatus;
  /** Les preuves minimales sont conformes, indépendamment du stock et du workflow. */
  proofState: 'incomplete' | 'compliant';
  commercialState: CatalogCommercialState;
  isPubliclyListable: boolean;
  isCheckoutEligible: boolean;
  /** Libellé stable destiné aux écrans publics et admin. */
  availabilityLabel: string;
  /** Explication lisible, sans exposer les détails internes de gouvernance. */
  availabilityMessage: string;
  blockers: string[];
  /** Version du contrat de décision, utile pour auditer une release. */
  truthVersion: string;
  /** Résultat du crible déterministe des textes visibles. */
  claimsClean: boolean;
  claimHits: number;
  /** Le contrat C1 peau est activé uniquement pour une fiche explicitement peau. */
  skinGoverned: boolean;
  skinReadiness?: SkinProductReadiness;
  /** Null signifie qu'aucune précommande n'est déclarée. */
  preorderDocumented: boolean | null;
};

/** Nom métier de la projection serveur consommée par toutes les surfaces. */
export type ProductTruth = CatalogTruth;

const VERIFIED_FIELDS = [
  'ingredient_verification_status',
  'claims_validation_status',
  'images_validation_status',
  'stock_validation_status',
  'certifications_validation_status',
  'translations_validation_status',
  'brand_verification_status',
] as const;

function camelize(snakeKey: string): string {
  return snakeKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** Lit la clé canonique en privilégiant le mapping public camelCase. */
export function readCatalogField(product: any, snakeKey: string): unknown {
  if (!product || typeof product !== 'object') return undefined;
  const camelKey = camelize(snakeKey);
  return product[camelKey] !== undefined ? product[camelKey] : product[snakeKey];
}

function asBoolean(product: any, snakeKey: string): boolean {
  return readCatalogField(product, snakeKey) === true;
}

function hasPendingEvidence(product: any): boolean {
  return VERIFIED_FIELDS.some(field => readCatalogField(product, field) !== 'verified');
}

function hasTrustedImageOwnership(product: any): boolean {
  return ['brand_provided', 'licensed'].includes(String(readCatalogField(product, 'image_ownership_status')));
}

function hasPlaceholderMarker(product: any): boolean {
  const ownership = String(readCatalogField(product, 'image_ownership_status') || '').toLowerCase();
  const source = String(readCatalogField(product, 'source_supplier') || '').toLowerCase();
  const image = String(product?.image || readCatalogField(product, 'image_url') || '').toLowerCase();
  const badges = Array.isArray(product?.badges) ? product.badges.map((v: unknown) => String(v).toLowerCase()) : [];
  return ownership === 'illustrative'
    || ownership === 'unverified'
    || badges.includes('placeholder')
    || image.includes('placeholder')
    || image.includes('illustration')
    || image.includes('unsplash.com')
    || source.includes('illustration');
}

function hasFormulationTargetMarker(product: any): boolean {
  const source = String(readCatalogField(product, 'source_supplier') || '').toLowerCase();
  const stage = String(
    readCatalogField(product, 'catalog_stage')
      ?? readCatalogField(product, 'product_stage')
      ?? readCatalogField(product, 'commercial_state')
      ?? ''
  ).toLowerCase();
  const badges = Array.isArray(product?.badges) ? product.badges.map((v: unknown) => String(v).toLowerCase()) : [];
  return source.includes('formulation interne')
    || source.includes('formulation cible')
    || ['target', 'formulation', 'formulation_target'].includes(stage)
    || badges.includes('formulation-target');
}

function hasNonEmptyIngredients(product: any): boolean {
  const ingredients = product?.ingredients || product?.keyIngredients;
  const inci = readCatalogField(product, 'inci');
  return (Array.isArray(ingredients) && ingredients.length > 0)
    || (typeof inci === 'string' && inci.trim() !== '');
}

function hasUsableImage(product: any): boolean {
  const images = Array.isArray(product?.galleryImages) ? product.galleryImages : [];
  const imageUrl = product?.image || readCatalogField(product, 'image_url');
  return images.length > 0 || (typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl));
}

function hasActivePromotion(product: any, now = new Date()): boolean {
  const isPromo = product?.isPromo === true || product?.is_promo === true;
  if (!isPromo) return true;
  const price = Number(product?.promotionPrice ?? product?.promotion_price);
  if (!Number.isFinite(price) || price < 0) return false;
  const startsAt = product?.promotionStartsAt ?? product?.promotion_starts_at;
  const endsAt = product?.promotionEndsAt ?? product?.promotion_ends_at;
  if (startsAt && Number.isNaN(new Date(startsAt).getTime())) return false;
  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) return false;
  if (startsAt && new Date(startsAt) > now) return false;
  if (endsAt && new Date(endsAt) < now) return false;
  return true;
}

function requiresCosmeticCompliance(product: any): boolean {
  const category = String(product?.category || product?.department || '').toLowerCase();
  const subcategory = String(product?.subCategory || product?.subcategory || product?.sub_category_tag || '').toLowerCase();
  const isAccessory = category.includes('accessoir') || category.includes('outil') || category.includes('device')
    || ['accessoire', 'accessoires', 'kits', 'kit'].includes(category);
  if (isAccessory || (!category && !subcategory)) return false;
  if (['cheveux', 'peau'].includes(category)) return true;
  if (['shampoing', 'apres-shampoing', 'masque', 'leave-in', 'huile/beurre', 'gel/coiffant', 'co-wash'].includes(category)) return true;
  if (['shampoing', 'masque', 'leave-in', 'huile', 'gel', 'co-wash'].some(k => category.includes(k) || subcategory.includes(k))) return true;
  return hasNonEmptyIngredients(product) && Boolean(category || subcategory);
}

/**
 * Porte commune de publication. Les champs métier restent vérifiés ici, avant
 * toute projection public/IA/SEO. Les preuves CPNP/RP/CPSR sont traitées par
 * le workflow admin existant ; `cpnp_ready=false` reste bloquant ici.
 */
function hasMinimalCatalogProof(product: any): boolean {
  const imageUrl = product?.image || product?.image_url;
  const images = product?.galleryImages || [];
  const countries = product?.countryAvailability || product?.country_availability || [];
  const hasCpnpBlock = requiresCosmeticCompliance(product) && readCatalogField(product, 'cpnp_ready') === false;
  const preorderDeclared = isPreorder(product);
  const preorderDocumented = !preorderDeclared || hasDocumentedExternalPreorder(product);

  return !hasPendingEvidence(product)
    && preorderDocumented
    && !hasFormulationTargetMarker(product)
    && !hasPlaceholderMarker(product)
    && hasTrustedImageOwnership(product)
    && !hasCpnpBlock
    && typeof product?.brand === 'string' && product.brand.trim() !== ''
    && hasNonEmptyIngredients(product)
    && ((Array.isArray(images) && images.length > 0) || typeof imageUrl === 'string' && /^https?:\/\//i.test(imageUrl))
    && Array.isArray(countries) && countries.length > 0
    && hasActivePromotion(product);
}

/**
 * Vrai si la fiche porte un marqueur de FORMULATION CIBLE (source, statut ou
 * badge), indépendamment de l'état de ses preuves.
 *
 * Distinction utile, et pas seulement théorique : `commercialState` vaut
 * `'formulation_target'` dès qu'il manque une preuve (composition non
 * vérifiée, stock en attente…). Quatre fiches de démonstration du catalogue
 * (« aucun sourcing réel ») tombent donc dans cet état alors qu'elles ne
 * décrivent aucune formulation. Les confondre reviendrait à présenter un
 * soin d'une marque tierce comme une cible de formulation KURLA.
 *
 * Seul le marqueur compte ici : c'est lui qui dit « ce produit n'est pas
 * fabriqué », pas l'avancement du dossier de preuves.
 */
export function isFormulationTarget(product: any): boolean {
  return hasFormulationTargetMarker(product);
}

/**
 * C1 n'est pas activé par le seul mot « peau » dans une fixture historique.
 * Une fiche réelle porte au moins un identifiant peau, une taxonomie peau ou
 * un objectif peau explicite. Cette règle évite de mélanger les anciens
 * produits génériques avec le contrat Skin & Catalog.
 */
export function isSkinCatalogGoverned(product: any): boolean {
  const category = String(product?.category || product?.department || '').trim().toLowerCase();
  if (category !== 'peau') return false;
  const id = String(product?.id || '').toLowerCase();
  const skinTypes = product?.skinTypes ?? product?.skin_types;
  const skinObjectives = product?.skinObjectives ?? product?.skin_objectives;
  return id.startsWith('peau-')
    || (Array.isArray(skinTypes) && skinTypes.length > 0)
    || (Array.isArray(skinObjectives) && skinObjectives.length > 0)
    || Boolean(product?.skinTaxonomyVersion ?? product?.skin_taxonomy_version)
    || Boolean(product?.skinTextureCode ?? product?.skin_texture_code);
}

function skinReadiness(product: any): SkinProductReadiness | undefined {
  return isSkinCatalogGoverned(product) ? evaluateSkinProductReadiness(product) : undefined;
}

function claimsFor(product: any): CatalogClaimScan {
  return scanCatalogClaims(product as Record<string, unknown>);
}

function hasCatalogTextClaims(product: any): boolean {
  const claims = claimsFor(product);
  // Le crible est un détecteur déterministe, pas une validation juridique.
  // Une fiche déjà approuvée par le workflow claims conserve cette preuve
  // explicite : un hit est alors signalé dans la vérité/audit, mais ne doit
  // pas révoquer rétroactivement 63 SKU historiques au seul changement du
  // détecteur. Les fiches sans statut vérifié restent bloquées.
  return claims.clean || readCatalogField(product, 'claims_validation_status') === 'verified';
}

function claimsAccepted(product: any, claims: CatalogClaimScan): boolean {
  return claims.clean || readCatalogField(product, 'claims_validation_status') === 'verified';
}

function hasSkinProof(product: any): boolean {
  const readiness = skinReadiness(product);
  if (!readiness) return true;
  return readiness.commercialState === 'ready_to_buy' || readiness.commercialState === 'preorder_verified';
}

export function isCatalogPubliclyListable(product: any): boolean {
  return readCatalogField(product, 'is_active') === true
    && readCatalogField(product, 'catalog_status') === 'published'
    && hasMinimalCatalogProof(product)
    && hasCatalogTextClaims(product)
    && hasSkinProof(product);
}

function hasPositiveStock(product: any): boolean {
  if (asBoolean(product, 'in_stock')) return true;
  const stockQuantity = Number(product?.stockQuantity ?? readCatalogField(product, 'stock_quantity'));
  if (Number.isFinite(stockQuantity) && stockQuantity > 0) return true;
  return Array.isArray(product?.variants) && product.variants.some((variant: any) => {
    const available = Number(variant?.available_quantity ?? variant?.availableQuantity);
    if (Number.isFinite(available)) return available > 0;
    const quantity = Number(variant?.stock_quantity ?? variant?.stockQuantity ?? 0);
    const reserved = Number(variant?.reserved_quantity ?? variant?.reservedQuantity ?? 0);
    return quantity - reserved > 0;
  });
}

function isPreorder(product: any): boolean {
  return asBoolean(product, 'is_preorder')
    || (Array.isArray(product?.badges) && product.badges.some((value: unknown) => String(value).toLowerCase() === 'preorder'));
}

/**
 * Déduit l'état commercial sans transformer un brouillon en disponibilité.
 * Les marqueurs de cible / placeholder sont évalués avant la précommande :
 * une fiche interne portant le badge « preorder » reste une cible, jamais une
 * précommande vendable.
 */
export function getCatalogTruth(product: any): CatalogTruth {
  const administrativeStatus = String(readCatalogField(product, 'catalog_status') || 'draft') as CatalogAdministrativeStatus;
  const active = asBoolean(product, 'is_active');
  const published = administrativeStatus === 'published';
  const formulationTarget = hasFormulationTargetMarker(product);
  const placeholder = hasPlaceholderMarker(product);
  const pendingValidation = hasPendingEvidence(product);
  const preorderDeclared = isPreorder(product);
  const preorderIsDocumented = preorderDeclared ? hasDocumentedExternalPreorder(product) : null;
  const claims = claimsFor(product);
  const governedBySkinContract = isSkinCatalogGoverned(product);
  const skin = skinReadiness(product);
  const proofState: CatalogTruth['proofState'] = hasMinimalCatalogProof(product) && claimsAccepted(product, claims) && hasSkinProof(product) ? 'compliant' : 'incomplete';
  const listable = isCatalogPubliclyListable(product);
  const blockers: string[] = [];

  if (!active) blockers.push('produit inactif');
  if (!published) blockers.push(`statut administratif « ${administrativeStatus} »`);
  if (formulationTarget) blockers.push('formulation cible : aucun produit fabriqué/achetable démontré');
  if (!formulationTarget && placeholder) blockers.push('visuel placeholder ou droits non établis');
  if (!formulationTarget && !placeholder && pendingValidation) blockers.push('preuves produit en attente de validation');
  if (preorderDeclared && !preorderIsDocumented && !isInternalFormulationSource(product)) {
    blockers.push('précommande externe non documentée : fournisseur, SKU fournisseur et source explicite requis');
  }
  if (!claimsAccepted(product, claims)) blockers.push(`allégations à revoir : ${claims.hits.map(hit => hit.ruleId).join(', ')}`);
  if (skin && skin.commercialState === 'blocked') {
    blockers.push(`contrat C1 peau incomplet : ${skin.blockers.map(blocker => blocker.field).join(', ')}`);
  }
  if (published && !listable) blockers.push('ne satisfait pas la porte de publiabilité');

  let commercialState: CatalogCommercialState;
  if (formulationTarget) commercialState = 'formulation_target';
  else if (placeholder) commercialState = 'placeholder';
  else if (pendingValidation) commercialState = 'pending_validation';
  else if (!claimsAccepted(product, claims)) commercialState = 'pending_validation';
  else if (skin?.commercialState === 'blocked') commercialState = 'pending_validation';
  else if (!active || administrativeStatus === 'unavailable') commercialState = 'unavailable';
  else if (!published) commercialState = 'draft';
  else if (preorderDeclared && preorderIsDocumented === true) commercialState = 'preorder';
  else if (preorderDeclared) commercialState = 'pending_validation';
  else if (hasPositiveStock(product)) commercialState = 'available';
  else commercialState = 'unavailable';

  const isCheckoutEligible = listable && (commercialState === 'available' || commercialState === 'preorder');
  const availabilityLabel = commercialState === 'available'
    ? 'Disponible'
    : commercialState === 'preorder'
      ? 'Précommande'
      : commercialState === 'formulation_target'
        ? 'Formulation cible'
        : commercialState === 'pending_validation'
          ? 'Validation en attente'
          : commercialState === 'placeholder'
            ? 'Visuel à remplacer'
            : commercialState === 'draft'
              ? 'En préparation'
              : 'Indisponible';
  const availabilityMessage = commercialState === 'available'
    ? 'Référence vérifiée et achetable.'
    : commercialState === 'preorder'
      ? 'Référence vérifiée, expédition après réception du prochain lot.'
      : commercialState === 'formulation_target'
        ? 'Cette fiche décrit une cible de formulation ; elle n’est ni un produit fabriqué ni éligible au checkout.'
        : commercialState === 'pending_validation'
          ? 'Cette référence reste masquée tant que ses preuves produit ne sont pas validées.'
          : commercialState === 'placeholder'
            ? 'Cette fiche reste masquée tant que le visuel et les droits associés ne sont pas établis.'
            : commercialState === 'draft'
              ? 'Cette fiche est en préparation et n’est pas publiée.'
              : 'Cette référence n’est pas achetable actuellement.';
  return {
    administrativeStatus,
    proofState,
    commercialState,
    isPubliclyListable: listable,
    isCheckoutEligible,
    availabilityLabel,
    availabilityMessage,
    blockers: Array.from(new Set(blockers)),
    truthVersion: CATALOG_TRUTH_VERSION,
    claimsClean: claims.clean,
    claimHits: claims.hits.length,
    skinGoverned: governedBySkinContract,
    skinReadiness: skin,
    preorderDocumented: preorderIsDocumented,
  };
}

/** Alias explicite : le nom ProductTruth est le contrat serveur de référence. */
export const getProductTruth = getCatalogTruth;

/** Checkout is deliberately stricter than a public product page. */
export function isCheckoutEligibleProduct(product: any): boolean {
  return getCatalogTruth(product).isCheckoutEligible;
}

/** Used by the admin report to keep the public wording stable. */
export function isCatalogTarget(product: any): boolean {
  return hasFormulationTargetMarker(product) || hasPendingEvidence(product);
}
