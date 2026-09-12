/**
 * C1 — contrat de commercialisation réel de la gamme peau.
 *
 * Cette couche ne fabrique aucune preuve. Elle mesure la couverture des
 * métadonnées attendues et sépare explicitement une cible de formulation, une
 * précommande documentée et un SKU réellement achetable.
 */

import { hasDocumentedExternalPreorder, isInternalFormulationSource } from './preorderEvidence';

export const SKIN_FIRST_MARKET = 'FR';

/**
 * Périmètre héros proposé pour le premier marché. Ce sont des identifiants de
 * catalogue existants, pas une déclaration de disponibilité : la readiness
 * doit encore les prouver.
 */
export const SKIN_HERO_SCOPE = [
  'peau-ess-001', // nettoyant
  'peau-ess-002', // hydratant/barrière
  'peau-ess-003', // SPF
] as const;

export type SkinCommercialState =
  | 'ready_to_buy'
  | 'preorder_verified'
  | 'formulation_target'
  | 'blocked';

export type SkinMetadataField = {
  field: string;
  label: string;
  requiredFor: 'all' | 'spf';
};

export type SkinMetadataCheck = {
  field: string;
  label: string;
  required: boolean;
  present: boolean;
};

export type SkinMetadataReadiness = {
  coveragePercent: number;
  complete: boolean;
  requiredFields: number;
  presentFields: number;
  missing: Array<{ field: string; label: string }>;
  checks: SkinMetadataCheck[];
  isSpf: boolean;
};

export type SkinProductReadiness = SkinMetadataReadiness & {
  productId: string;
  title: string;
  catalogStatus?: string;
  commercialState: SkinCommercialState;
  inHeroScope: boolean;
  internalSource: boolean;
  blockers: Array<{ field: string; label: string }>;
};

export const SKIN_REQUIRED_METADATA: readonly SkinMetadataField[] = [
  { field: 'skin_types', label: 'types de peau', requiredFor: 'all' },
  { field: 'concerns', label: 'préoccupations', requiredFor: 'all' },
  { field: 'skin_objectives', label: 'objectifs peau', requiredFor: 'all' },
  { field: 'active_ingredients', label: 'actifs et concentrations', requiredFor: 'all' },
  { field: 'inci', label: 'INCI final visible', requiredFor: 'all' },
  { field: 'inci_visibility_status', label: 'visibilité INCI vérifiée', requiredFor: 'all' },
  { field: 'texture', label: 'texture', requiredFor: 'all' },
  { field: 'finish', label: 'fini', requiredFor: 'all' },
  { field: 'fragrance', label: 'parfum / sans parfum', requiredFor: 'all' },
  { field: 'allergens', label: 'allergènes', requiredFor: 'all' },
  { field: 'routine_step', label: 'étape de routine', requiredFor: 'all' },
  { field: 'warnings', label: 'avertissements', requiredFor: 'all' },
  { field: 'manufacturing_status', label: 'fabrication / GMP documentée', requiredFor: 'all' },
  { field: 'lot_reference', label: 'lot ou traçabilité de lot', requiredFor: 'all' },
  { field: 'best_before_or_pao', label: 'DDM ou PAO', requiredFor: 'all' },
  { field: 'country_availability', label: 'pays autorisés', requiredFor: 'all' },
  { field: 'image_rights', label: 'packshot sous droits', requiredFor: 'all' },
  { field: 'stock', label: 'stock positif vérifié', requiredFor: 'all' },
  { field: 'spf_uva_evidence_status', label: 'preuve SPF/UVA traçable et relue', requiredFor: 'spf' },
  { field: 'photoprotection_evidence_status', label: 'dossier photoprotection rattaché au SKU', requiredFor: 'spf' },
  { field: 'whitecast_risk', label: 'risque whitecast noté', requiredFor: 'spf' },
  { field: 'whitecast_test_status', label: 'notation whitecast vérifiée', requiredFor: 'spf' },
  { field: 'tested_phototypes', label: 'phototypes IV–VI testés', requiredFor: 'spf' },
  { field: 'tested_lights', label: 'lumières de test renseignées', requiredFor: 'spf' },
  { field: 'visible_light_test_status', label: 'lumière visible : test ou non-applicable explicite', requiredFor: 'spf' },
  { field: 'tested_undertones', label: 'sous-tons testés si teinté', requiredFor: 'spf' },
  { field: 'undertone_evidence_status', label: 'preuve sous-tons rattachée si teinté', requiredFor: 'spf' },
] as const;

function read(product: any, camel: string, snake = camel): unknown {
  return product?.[camel] !== undefined ? product[camel] : product?.[snake];
}

function text(product: any, camel: string, snake = camel): string {
  const value = read(product, camel, snake);
  return typeof value === 'string' ? value.trim() : '';
}

function array(product: any, camel: string, snake = camel): unknown[] {
  const value = read(product, camel, snake);
  return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined && String(item).trim() !== '') : [];
}

function boolean(product: any, camel: string, snake = camel): boolean {
  return read(product, camel, snake) === true;
}

function hasText(product: any, camel: string, snake = camel): boolean {
  return text(product, camel, snake) !== '';
}

function hasVerifiedValue(product: any, camel: string, snake = camel): boolean {
  const value = read(product, camel, snake);
  if (typeof value === 'string') return value.trim().toLowerCase() === 'verified';
  return value === true;
}

function hasPositiveStock(product: any): boolean {
  if (boolean(product, 'inStock', 'in_stock')) return true;
  const quantity = Number(read(product, 'stockQuantity', 'stock_quantity'));
  if (Number.isFinite(quantity) && quantity > 0) return true;
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.some((variant: any) => {
    const available = Number(variant?.availableQuantity ?? variant?.available_quantity);
    if (Number.isFinite(available)) return available > 0;
    const stock = Number(variant?.stockQuantity ?? variant?.stock_quantity);
    const reserved = Number(variant?.reservedQuantity ?? variant?.reserved_quantity) || 0;
    return Number.isFinite(stock) && stock - reserved > 0;
  });
}

function hasTrustedImage(product: any): boolean {
  const primaryOwnership = text(product, 'imageOwnershipStatus', 'image_ownership_status');
  const primaryUrl = text(product, 'image', 'image_url');
  const gallery = Array.isArray(product?.galleryImages || product?.images)
    ? (product.galleryImages || product.images)
    : [];
  const trustedPrimary = /^https?:\/\//i.test(primaryUrl) && ['brand_provided', 'licensed'].includes(primaryOwnership);
  const trustedGallery = gallery.some((entry: any) =>
    /^https?:\/\//i.test(String(entry?.url || '').trim())
      && ['brand_provided', 'licensed'].includes(String(entry?.imageTrust || entry?.ownershipStatus || '').trim())
  );
  const validation = text(product, 'imagesValidationStatus', 'images_validation_status');
  return (trustedPrimary || trustedGallery) && validation === 'verified';
}

function isSpfProduct(product: any): boolean {
  const step = text(product, 'routineStep', 'routine_step').toLowerCase();
  const subcategory = text(product, 'subCategory', 'subcategory').toLowerCase();
  const concerns = array(product, 'concerns').map(value => String(value).toLowerCase());
  const name = text(product, 'name').toLowerCase();
  return step.includes('spf')
    || step.includes('solaire')
    || subcategory.includes('solaire')
    || concerns.includes('protection_solaire')
    || /\bspf\b|solaire|écran solaire/.test(name);
}

function isTintedProduct(product: any): boolean {
  const name = text(product, 'name').toLowerCase();
  const subcategory = text(product, 'subCategory', 'subcategory').toLowerCase();
  return boolean(product, 'isTinted', 'is_tinted')
    || subcategory.includes('teint')
    || /teinté|teinte|tinted/.test(name);
}

function isInternalSource(product: any): boolean {
  // Une précommande peut être réelle et documentée. Elle ne devient une cible
  // que si la provenance dit explicitement formulation interne/cible.
  return isInternalFormulationSource(product);
}

function isPreorder(product: any): boolean {
  return boolean(product, 'isPreorder', 'is_preorder')
    || array(product, 'badges').some(value => String(value).toLowerCase() === 'preorder');
}

function isFormulationTarget(product: any): boolean {
  const status = text(product, 'catalogStatus', 'catalog_status').toLowerCase();
  const commercialState = text(product, 'availabilityState', 'availability_state').toLowerCase();
  const stage = text(product, 'catalogStage', 'catalog_stage').toLowerCase();
  return status === 'formulation_target'
    || commercialState === 'formulation_target'
    || stage === 'formulation_target'
    || isInternalSource(product)
    || array(product, 'badges').some(value => String(value).toLowerCase().includes('formulation-target'));
}

function metadataPresence(product: any, field: string, isSpf: boolean): boolean {
  switch (field) {
    case 'skin_types': return array(product, 'skinTypes', 'skin_types').length > 0;
    case 'concerns': return array(product, 'concerns').length > 0;
    case 'skin_objectives': return array(product, 'skinObjectives', 'skin_objectives').length > 0;
    case 'active_ingredients': {
      const actives = read(product, 'activeIngredients', 'active_ingredients');
      const structured = Array.isArray(actives) && actives.length > 0 && actives.every((active: any) => {
        const name = typeof active === 'string' ? active.trim() : String(active?.name || '').trim();
        const concentration = typeof active === 'object' ? String(active?.concentration || '').trim() : '';
        return name !== '' && concentration !== '';
      });
      return structured && hasVerifiedValue(product, 'activeConcentrationsStatus', 'active_concentrations_status');
    }
    case 'inci': return text(product, 'inci').length >= 20;
    case 'inci_visibility_status': return hasVerifiedValue(product, 'inciVisibilityStatus', 'inci_visibility_status');
    case 'texture': return hasText(product, 'texture');
    case 'finish': return hasText(product, 'finish', 'skin_finish');
    case 'fragrance': return hasText(product, 'fragrance');
    case 'allergens': return read(product, 'allergens') !== undefined;
    case 'routine_step': return hasText(product, 'routineStep', 'routine_step');
    case 'warnings': return read(product, 'warnings') !== undefined;
    case 'manufacturing_status': return hasVerifiedValue(product, 'manufacturingStatus', 'manufacturing_status');
    case 'lot_reference': return hasText(product, 'lotReference', 'lot_reference');
    case 'best_before_or_pao': return hasText(product, 'bestBeforeOrPao', 'best_before_or_pao');
    case 'country_availability': return array(product, 'countryAvailability', 'country_availability').length > 0;
    case 'image_rights': return hasTrustedImage(product);
    case 'stock': return hasPositiveStock(product);
    case 'spf_uva_evidence_status': return !isSpf || hasVerifiedValue(product, 'spfUvaEvidenceStatus', 'spf_uva_evidence_status');
    case 'photoprotection_evidence_status': return !isSpf || hasVerifiedValue(product, 'photoprotectionEvidenceStatus', 'photoprotection_evidence_status');
    case 'whitecast_risk': return isSpf && ['none', 'low', 'medium', 'high'].includes(text(product, 'whitecastRisk', 'whitecast_risk'));
    case 'whitecast_test_status': return !isSpf || hasVerifiedValue(product, 'whitecastTestStatus', 'whitecast_test_status');
    case 'tested_phototypes': {
      if (!isSpf) return true;
      const phototypes = new Set(array(product, 'testedPhototypes', 'tested_phototypes').map(value => String(value).toUpperCase().replace('FITZPATRICK ', '')));
      return ['IV', 'V', 'VI'].every(value => phototypes.has(value));
    }
    case 'tested_lights': {
      if (!isSpf) return true;
      const lights = array(product, 'testedLights', 'tested_lights').map(value => String(value).toLowerCase());
      return lights.includes('daylight_indirect') || lights.includes('daylight_direct') || lights.includes('daylight');
    }
    case 'visible_light_test_status': {
      if (!isSpf) return true;
      const status = text(product, 'visibleLightTestStatus', 'visible_light_test_status');
      return isTintedProduct(product) || boolean(product, 'visibleLightClaim', 'visible_light_claim')
        ? status === 'verified'
        : status === 'verified' || status === 'not_applicable';
    }
    case 'tested_undertones': return !isSpf || !isTintedProduct(product) || array(product, 'testedUndertones', 'tested_undertones').length > 0;
    case 'undertone_evidence_status': return !isSpf || !isTintedProduct(product) || hasVerifiedValue(product, 'undertoneEvidenceStatus', 'undertone_evidence_status');
    default: return false;
  }
}

export function evaluateSkinMetadata(product: any): SkinMetadataReadiness {
  const isSpf = isSpfProduct(product);
  const fields = SKIN_REQUIRED_METADATA.filter(field => field.requiredFor === 'all' || isSpf);
  const checks = fields.map(field => ({
    field: field.field,
    label: field.label,
    required: true,
    present: metadataPresence(product, field.field, isSpf),
  }));
  const missing = checks.filter(check => !check.present).map(check => ({ field: check.field, label: check.label }));
  const presentFields = checks.length - missing.length;
  return {
    coveragePercent: checks.length === 0 ? 100 : Math.round((presentFields / checks.length) * 10000) / 100,
    complete: missing.length === 0,
    requiredFields: checks.length,
    presentFields,
    missing,
    checks,
    isSpf,
  };
}

export function classifySkinCommercialState(product: any, metadata: SkinMetadataReadiness, extraBlockers: Array<{ field: string; label: string }> = []): SkinCommercialState {
  if (isFormulationTarget(product)) return 'formulation_target';
  if (isPreorder(product)) return metadata.complete && extraBlockers.length === 0 ? 'preorder_verified' : 'blocked';
  return metadata.complete && extraBlockers.length === 0 ? 'ready_to_buy' : 'blocked';
}

export function evaluateSkinProductReadiness(
  product: any,
  options: { extraBlockers?: Array<{ field: string; label: string }> } = {},
): SkinProductReadiness {
  const metadata = evaluateSkinMetadata(product);
  const extraBlockers = [...(options.extraBlockers || [])];
  const internalSource = isInternalSource(product);
  const preorderDeclared = isPreorder(product);
  if (internalSource && !extraBlockers.some(blocker => blocker.field === 'source_supplier')) {
    extraBlockers.push({ field: 'source_supplier', label: 'source_supplier = formulation interne / formulation cible' });
  }
  if (preorderDeclared && !internalSource && !hasDocumentedExternalPreorder(product)) {
    extraBlockers.push({ field: 'preorder_evidence', label: 'précommande externe non documentée : fournisseur, SKU fournisseur et source explicite requis' });
  }
  const blockers = [...metadata.missing, ...extraBlockers].filter((blocker, index, all) =>
    all.findIndex(candidate => candidate.field === blocker.field) === index
  );
  const commercialState = classifySkinCommercialState(product, metadata, extraBlockers);
  return {
    ...metadata,
    productId: String(product?.id || ''),
    title: String(product?.name || product?.title || product?.id || ''),
    catalogStatus: text(product, 'catalogStatus', 'catalog_status') || undefined,
    commercialState,
    inHeroScope: SKIN_HERO_SCOPE.includes(String(product?.id) as (typeof SKIN_HERO_SCOPE)[number]),
    internalSource,
    blockers,
  };
}

export function skinHeroAcceptance(report: SkinProductReadiness[]): {
  targetCount: number;
  acceptedCount: number;
  acceptedIds: string[];
  missingHeroIds: string[];
  meetsThreeToFive: boolean;
} {
  const acceptedIds = report
    .filter(item => item.inHeroScope && item.commercialState === 'ready_to_buy')
    .map(item => item.productId);
  return {
    targetCount: SKIN_HERO_SCOPE.length,
    acceptedCount: acceptedIds.length,
    acceptedIds,
    missingHeroIds: SKIN_HERO_SCOPE.filter(id => !acceptedIds.includes(id)),
    meetsThreeToFive: acceptedIds.length >= 3 && acceptedIds.length <= 5,
  };
}
