import { getCatalogTruth } from '../catalogTruth';
import {
  SKIN_FIRST_MARKET,
  SKIN_HERO_SCOPE,
  evaluateSkinProductReadiness,
  skinHeroAcceptance,
  type SkinProductReadiness,
} from '../skinCommercialReadiness';
import { getAdminCatalogProducts, getCatalogSourcingReadinessReport } from './catalogStore';
import type { SupabaseServerStore } from '../serverDb';

/**
 * C1 — rapport d’acceptation peau. Les chiffres sont calculés à partir des
 * fiches et du rapport sourcing existants; aucune valeur n’est complétée par
 * défaut et aucune fiche n’est publiée par ce rapport.
 */
export async function getSkinCatalogReadinessReport(store: SupabaseServerStore): Promise<{
  generatedAt: string;
  firstMarket: string;
  targetHeroCount: number;
  products: number;
  metadataCoveragePercent: number;
  metadataFieldsCompletePercent: number;
  claimsReviewedPercent: number;
  imagesRightsCompletePercent: number;
  readyToBuy: number;
  preorderVerified: number;
  formulationTargets: number;
  blocked: number;
  heroAcceptance: ReturnType<typeof skinHeroAcceptance>;
  acceptance: {
    heroCountThreeToFive: boolean;
    metadataCoverageAtLeast95: boolean;
    claimsFullyReviewed: boolean;
    imagesRightsComplete: boolean;
    noInternalSourceReady: boolean;
    firstMarketStockAndCountryChecked: boolean;
  };
  perProduct: Array<SkinProductReadiness & {
    truthState: string;
    checkoutEligible: boolean;
    sourcingState: string;
    sourcingReady: boolean;
    claimsReviewed: boolean;
    firstMarketAllowed: boolean;
    missingSourcing: Array<{ field: string; label: string }>;
  }>;
}> {
  const [products, sourcingReport] = await Promise.all([
    getAdminCatalogProducts(store),
    getCatalogSourcingReadinessReport(store),
  ]);
  const sourcingByProduct = new Map(sourcingReport.perProduct.map(product => [product.productId, product]));
  const skinProducts = products.filter(product => String(product.category || '').toLowerCase() === 'peau');
  const perProduct = skinProducts.map(product => {
    const sourcing = sourcingByProduct.get(String(product.id));
    const truth = getCatalogTruth(product);
    const countries = Array.isArray(product.countryAvailability || product.country_availability)
      ? (product.countryAvailability || product.country_availability).map((country: unknown) => String(country).toUpperCase())
      : [];
    const firstMarketAllowed = countries.includes(SKIN_FIRST_MARKET) || countries.includes('INT');
    const extraBlockers: Array<{ field: string; label: string }> = [];
    if (!sourcing?.ready) {
      for (const missing of sourcing?.missing || []) extraBlockers.push({ field: `sourcing:${missing.field}`, label: missing.label });
    }
    // C1 rend le PIF et la preuve GMP obligatoires pour un héros peau, même
    // si la porte cosmétique historique les signalait seulement comme
    // recommandés pour la publication générale.
    for (const document of sourcing?.missingRecommendedDocuments || []) {
      extraBlockers.push({ field: `sourcing:document:${document}`, label: `document C1 manquant ou expiré : ${document}` });
    }
    if (product.claimsValidationStatus !== 'verified' && product.claims_validation_status !== 'verified') {
      extraBlockers.push({ field: 'claims_validation_status', label: 'claims non revus à 100 %' });
    }
    if (!firstMarketAllowed) {
      extraBlockers.push({ field: 'country_availability:FR', label: `France absente des pays autorisés (${SKIN_FIRST_MARKET})` });
    }
    if (!truth.isCheckoutEligible && truth.commercialState !== 'formulation_target') {
      extraBlockers.push({ field: 'checkout_eligibility', label: 'référence non éligible au checkout' });
    }
    const readiness = evaluateSkinProductReadiness(product, { extraBlockers });
    return {
      ...readiness,
      truthState: truth.commercialState,
      checkoutEligible: truth.isCheckoutEligible,
      sourcingState: sourcing?.state || 'no_source',
      sourcingReady: sourcing?.ready === true,
      claimsReviewed: product.claimsValidationStatus === 'verified' || product.claims_validation_status === 'verified',
      firstMarketAllowed,
      missingSourcing: sourcing?.missing || [],
    };
  });

  const allChecks = perProduct.flatMap(product => product.checks);
  const presentFields = allChecks.filter(check => check.present).length;
  const metadataCoveragePercent = allChecks.length === 0
    ? 0
    : Math.round((presentFields / allChecks.length) * 10000) / 100;
  const metadataFieldsCompletePercent = perProduct.length === 0
    ? 0
    : Math.round((perProduct.filter(product => product.complete).length / perProduct.length) * 10000) / 100;
  const claimsReviewedPercent = perProduct.length === 0
    ? 0
    : Math.round((perProduct.filter(product => product.claimsReviewed).length / perProduct.length) * 10000) / 100;
  const imagesRightsCompletePercent = perProduct.length === 0
    ? 0
    : Math.round((perProduct.filter(product => product.checks.find(check => check.field === 'image_rights')?.present).length / perProduct.length) * 10000) / 100;
  const heroAcceptance = skinHeroAcceptance(perProduct);
  const acceptedProducts = perProduct.filter(product => product.commercialState === 'ready_to_buy' || product.commercialState === 'preorder_verified');
  const acceptance = {
    heroCountThreeToFive: heroAcceptance.meetsThreeToFive,
    metadataCoverageAtLeast95: metadataCoveragePercent >= 95,
    claimsFullyReviewed: claimsReviewedPercent === 100,
    imagesRightsComplete: imagesRightsCompletePercent === 100,
    noInternalSourceReady: perProduct.every(product => product.commercialState !== 'ready_to_buy' || !product.internalSource),
    firstMarketStockAndCountryChecked: acceptedProducts.length > 0 && acceptedProducts.every(product => product.firstMarketAllowed && product.checks.find(check => check.field === 'stock')?.present === true),
  };

  return {
    generatedAt: new Date().toISOString(),
    firstMarket: SKIN_FIRST_MARKET,
    targetHeroCount: SKIN_HERO_SCOPE.length,
    products: perProduct.length,
    metadataCoveragePercent,
    metadataFieldsCompletePercent,
    claimsReviewedPercent,
    imagesRightsCompletePercent,
    readyToBuy: perProduct.filter(product => product.commercialState === 'ready_to_buy').length,
    preorderVerified: perProduct.filter(product => product.commercialState === 'preorder_verified').length,
    formulationTargets: perProduct.filter(product => product.commercialState === 'formulation_target').length,
    blocked: perProduct.filter(product => product.commercialState === 'blocked').length,
    heroAcceptance,
    acceptance,
    perProduct,
  };
}
