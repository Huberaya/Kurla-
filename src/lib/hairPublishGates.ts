/**
 * CHANTIER 15 — Recettes Hair + portes publish / docs.
 *
 * Lecture. Ne réécrit **pas** `launchCatalog.ts` ni `fulfillment.ts`.
 * Un merge Skin qui touche un ID `p*` Hair, relâche la porte boutique, ou
 * fait atterrir l’import identifié dans `products` doit faire tomber le banc.
 */
import { isCatalogPubliclyListable, isCheckoutEligibleProduct, isTestListingProduct } from './catalogTruth';
import { evaluateGateProposals } from './catalogGate';
import { promisesDropship24h } from './dropshipProcedure';
import { DROPSHIP_TOOLS_IMMEDIATE, TAMPON_3PL, TAMPON_META, CATALOG_GUARD, isDropshipToolId } from './fulfillment';
import { IDENTIFIED_WRITE_TABLES, importNeverPublishes, planIdentifiedImport } from './identifiedProducts';
import { LAUNCH_PRODUCTS } from './launchCatalog';
import { CANONICAL_TABLES, WRITE_TARGET_BY_INTENT } from './productLifecycle';
import { canShowAddToCart } from './skinCommerce';
import { enterCatalogFromCandidate } from './skinCatalog';

/** 18 SKU cœur du lancement Hair (commentaire `launchCatalog.ts`). */
export const HAIR_LAUNCH_CORE_IDS = [
  'p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09',
  'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18',
] as const;

/** Tampon 3PL année 1 — 5 héros × 15 = 75. Ne pas inventer un 6ᵉ SKU Skin. */
export const HAIR_TAMPON_IDS = ['p01', 'p04', 'p08', 'p09', 'p12'] as const;

export const HAIR_TAMPON_UNITS = 75;

export const HAIR_DROPSHIP_TOOL_IDS = [
  'p35', 'p36', 'p41', 'p16', 'p21', 'p23', 'p17', 'p18', 'p19', 'p37', 'p45', 'p38',
] as const;

export const IDENTIFIED_IMPORT_TABLES = [
  CANONICAL_TABLES.identifiedCoverage,
  CANONICAL_TABLES.identifiedCandidate,
] as const;

export function hairLaunchIds(): string[] {
  return LAUNCH_PRODUCTS.map(product => product.id);
}

export function hairTamponIds(): string[] {
  return TAMPON_3PL.map(row => row.productId);
}

export function hairDropshipToolIds(): string[] {
  return [...DROPSHIP_TOOLS_IMMEDIATE];
}

export function tamponIsHairLaunchSubset(): boolean {
  const launch = new Set(hairLaunchIds());
  return TAMPON_3PL.every(row => launch.has(row.productId) && row.qty === 15);
}

export function tamponUnitCount(): number {
  return TAMPON_META.totalUnits;
}

export function identifiedTableIsSafe(table: string): boolean {
  if (table === CANONICAL_TABLES.catalogSku || table === 'products') return false;
  return (IDENTIFIED_IMPORT_TABLES as readonly string[]).includes(table);
}

export function identifiedImportTargetsAreSafe(): boolean {
  return identifiedTableIsSafe(IDENTIFIED_WRITE_TABLES.coverage)
    && identifiedTableIsSafe(IDENTIFIED_WRITE_TABLES.candidate)
    && !/products|published/i.test(WRITE_TARGET_BY_INTENT.import_identified)
    && /humain/i.test(WRITE_TARGET_BY_INTENT.publish);
}

export function hairCatalogGuardForbidsLaunchEdits(): boolean {
  return CATALOG_GUARD.forbidden.includes('LAUNCH_PRODUCTS')
    && /launchCatalog\.ts/.test(CATALOG_GUARD.rule);
}

/** Porte boutique : draft / test / formulation ne passent jamais. */
export function publicListBlocked(product: unknown): boolean {
  return isCatalogPubliclyListable(product) === false
    && isCheckoutEligibleProduct(product) === false;
}

export function gateNeverPublishesTestListing(): boolean {
  const ready = {
    truth: { blockers: [] },
    brand: 'K',
    description: 'd',
    inci: 'Aqua',
    image: 'https://x/y.jpg',
    ean: '123',
  };
  const proposals = evaluateGateProposals([
    {
      id: 'peau-test-c15',
      name: 'Fiche test',
      catalogStatus: 'draft',
      isTestListing: true,
      is_test_listing: true,
      ...ready,
      truth: { blockers: [], isTestListing: true },
    },
  ]);
  return proposals.every(row => row.action !== 'publish');
}

export function identifiedPlanNeverWritesProducts(): boolean {
  const plan = planIdentifiedImport(
    [{ brand: 'X', title: 'Soin', documentedNeed: 1, channelLabel: null, ean: null, forbiddenTarget: 'published' }],
    [],
  );
  return plan.wouldPublish === 1 && plan.accepted.length === 0 && importNeverPublishes(plan) === false;
}

export function skinDraftFromCandidateStaysPrivate(): boolean {
  const payload = enterCatalogFromCandidate(
    { id: 'cand-c15', product: 'Sérum HPI', brand: 'Marque', public_price_cents: 1990, category: 'peau' },
    null,
  );
  return payload.catalog_status === 'draft'
    && payload.is_active === false
    && publicListBlocked(payload)
    && !/^p\d/.test(String(payload.id || ''));
}

export function hairAccessoryStillDropship24h(): boolean {
  return isDropshipToolId('p35')
    && promisesDropship24h({ id: 'p35', category: 'accessoires' }) === true
    && promisesDropship24h({ id: 'peau-ess-001', category: 'peau', badges: ['dropship_24_48h'] }) === false;
}

export function hairCartStillWorks(): boolean {
  return canShowAddToCart({ category: 'accessoires', inStock: true, price: 6.9 }) === true
    && canShowAddToCart({ category: 'peau', testListing: true, inStock: true, price: 19.9, availabilityState: 'available' }) === false;
}

export function isTestListingNeverCheckout(product: unknown): boolean {
  if (!isTestListingProduct(product)) return true;
  return isCheckoutEligibleProduct(product) === false && isCatalogPubliclyListable(product) === false;
}
