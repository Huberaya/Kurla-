/**
 * CHANTIER 12 — KPI honnêtes du tableau de bord (Skin / Hair).
 *
 * L’espace Skin classe les kits capillaires (`category === 'kits'`) dans
 * `isProductInWorkspace('skin')` — volontaire, pour ne pas vider la vitrine
 * (10 kits encore servis). Conséquence : le CA / stock / précommandes Hair
 * fuyaient dans l’onglet Skin.
 *
 * Ce module sépare :
 *   - soin cosmétique peau (`peau` / `teint` / `soins_visage`) = ventes Skin
 *   - kits = CA Hair, même s’ils sont listés dans l’espace Skin
 *
 * Un 0 Skin est un zéro mesuré (aucun soin, aucune ligne cosmétique).
 * Un indicateur non lu reste `null` (« non mesurable »), jamais un 0 inventé.
 */

import { isSkinCosmeticCategory } from './dropshipProcedure';

export type PulseProduct = {
  id?: string;
  category?: string | null;
  department?: string | null;
  catalogStatus?: string | null;
  catalog_status?: string | null;
  isActive?: boolean;
  is_active?: boolean;
};

export type PulseMetrics = {
  revenueTest?: number | null;
  avgOrderValue?: number | null;
  totalOrders?: number | null;
  paidOrdersCount?: number | null;
  uniqueCustomers?: number | null;
  estimatedMargin?: number | null;
  estimatedMarginRate?: number | null;
  ltvProxy?: number | null;
  repeatRate?: number | null;
  popularProducts?: Array<{ productId: string; name: string; quantity: number }>;
  lowStockProducts?: unknown[];
  outOfStockProducts?: unknown[];
};

/** Ligne de commande : pas d’index signature — `ServerOrderItem` n’en a pas. */
export type PulseOrderItem = {
  productId?: unknown;
  product_id?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  price?: unknown;
  lineTotal?: unknown;
};

export type PulseOrder = { items?: ReadonlyArray<PulseOrderItem> };

export type WorkspacePulseInput = {
  workspace: 'skin' | 'hair';
  products: PulseProduct[];
  metrics: PulseMetrics | null;
  /** CA lignes soins peau, mesuré. `null` = pas encore attribué. */
  cosmeticRevenueEur?: number | null;
  /** CA lignes kits, mesuré. `null` = pas encore attribué. */
  kitRevenueEur?: number | null;
  identifiedCount?: number | null;
  rfqOpen?: number | null;
  docsMissing?: number | null;
};

export type WorkspaceCatalogCounts = {
  cosmeticSkuInCatalog: number;
  publishedCosmeticSku: number;
  publishedSkuInScope: number;
  kitSkuInScope: number;
  pipelineDraftCount: number;
  catalogCount: number;
};

export type WorkspacePulse = WorkspaceCatalogCounts & {
  workspace: 'skin' | 'hair';
  displayRevenueEur: number;
  displayAovEur: number;
  displayOrders: number;
  displayPaidOrders: number;
  displayUniqueCustomers: number;
  displayMarginEur: number;
  displayMarginRate: number | null;
  displayLtv: number | null;
  displayRepeatRate: number | null;
  hairRevenueLeak: boolean;
  leakedRevenueEur: number;
  honestZeroSales: boolean;
  stockAlertsAreHairKits: boolean;
  displayLowStock: unknown[];
  displayOutOfStock: unknown[];
  popularProducts: Array<{ productId: string; name: string; quantity: number }>;
  identifiedCount: number | null;
  rfqOpen: number | null;
  docsMissing: number | null;
  headline: string;
  hint: string;
  revenueLabel: string;
  revenueHint: string;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function productCategoryOf(product: PulseProduct): string {
  return text(product.category || product.department);
}

/** Kits capillaires (vitrine Hair), pas des soins peau. */
export function isHairKitCategory(category?: string | null): boolean {
  const c = text(category).toLowerCase();
  return c === 'kits' || c === 'kit' || c.startsWith('kit-');
}

export function isPublishedActive(product: PulseProduct): boolean {
  const status = text(product.catalogStatus ?? product.catalog_status).toLowerCase();
  const active = product.isActive ?? product.is_active;
  return status === 'published' && active !== false;
}

export function countWorkspaceCatalog(products: PulseProduct[]): WorkspaceCatalogCounts {
  const list = Array.isArray(products) ? products : [];
  const cosmetic = list.filter(product => isSkinCosmeticCategory(productCategoryOf(product)));
  const kits = list.filter(product => isHairKitCategory(productCategoryOf(product)));
  const publishedCosmetic = cosmetic.filter(isPublishedActive);
  const published = list.filter(isPublishedActive);
  const pipelineDraft = list.filter(product => {
    const status = text(product.catalogStatus ?? product.catalog_status).toLowerCase();
    return status === 'draft' || status === 'pending_review';
  });
  return {
    cosmeticSkuInCatalog: cosmetic.length,
    publishedCosmeticSku: publishedCosmetic.length,
    publishedSkuInScope: published.length,
    kitSkuInScope: kits.length,
    pipelineDraftCount: pipelineDraft.length,
    catalogCount: list.length,
  };
}

export function productIdOfItem(item: PulseOrderItem | undefined): string {
  const value = item?.productId ?? item?.product_id;
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

/** Somme des lignes dont le produit est dans l’ensemble. 0 = mesuré vide, jamais inventé. */
export function sumLineRevenueForIds(orders: PulseOrder[], productIds: Set<string>): number {
  let cents = 0;
  for (const order of orders || []) {
    for (const item of order.items || []) {
      const id = productIdOfItem(item);
      if (!id || !productIds.has(id)) continue;
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice ?? item.price ?? 0);
      const line = Number(item.lineTotal);
      const amount = Number.isFinite(line) && line !== 0 ? line : unit * qty;
      if (Number.isFinite(amount) && amount > 0) cents += Math.round(amount * 100);
    }
  }
  return cents / 100;
}

export function cosmeticProductIds(products: PulseProduct[]): Set<string> {
  return new Set(
    (products || [])
      .filter(product => isSkinCosmeticCategory(productCategoryOf(product)) && product.id)
      .map(product => String(product.id)),
  );
}

export function kitProductIds(products: PulseProduct[]): Set<string> {
  return new Set(
    (products || [])
      .filter(product => isHairKitCategory(productCategoryOf(product)) && product.id)
      .map(product => String(product.id)),
  );
}

export type RfqItemLike = {
  status?: string | null;
  sentAwaitingCount?: number | null;
  rfqCount?: number | null;
};

/** Agrégat RFQ. Liste vide chargée = 0 réel. */
export function summarizeRfq(items: RfqItemLike[] | null | undefined): { needs: number; rfqOpen: number; awaitingReply: number } | null {
  if (!Array.isArray(items)) return null;
  return {
    needs: items.length,
    rfqOpen: items.filter(item => item.status === 'in_rfq' || Number(item.sentAwaitingCount) > 0).length,
    awaitingReply: items.reduce((sum, item) => sum + (Number(item.sentAwaitingCount) || 0), 0),
  };
}

function passThroughHair(counts: WorkspaceCatalogCounts, metrics: PulseMetrics | null, extra: Pick<WorkspacePulse, 'identifiedCount' | 'rfqOpen' | 'docsMissing'>): WorkspacePulse {
  return {
    workspace: 'hair',
    ...counts,
    displayRevenueEur: Number(metrics?.revenueTest) || 0,
    displayAovEur: Number(metrics?.avgOrderValue) || 0,
    displayOrders: Number(metrics?.totalOrders) || 0,
    displayPaidOrders: Number(metrics?.paidOrdersCount) || 0,
    displayUniqueCustomers: Number(metrics?.uniqueCustomers) || 0,
    displayMarginEur: Number(metrics?.estimatedMargin) || 0,
    displayMarginRate: metrics?.estimatedMarginRate ?? null,
    displayLtv: metrics?.ltvProxy ?? null,
    displayRepeatRate: metrics?.repeatRate ?? null,
    hairRevenueLeak: false,
    leakedRevenueEur: 0,
    honestZeroSales: false,
    stockAlertsAreHairKits: false,
    displayLowStock: metrics?.lowStockProducts || [],
    displayOutOfStock: metrics?.outOfStockProducts || [],
    popularProducts: metrics?.popularProducts || [],
    identifiedCount: extra.identifiedCount,
    rfqOpen: extra.rfqOpen,
    docsMissing: extra.docsMissing,
    headline: 'Tableau de bord Hair',
    hint: 'CA, stock et précommandes du catalogue cheveux.',
    revenueLabel: "Chiffre d'Affaires Test",
    revenueHint: 'Commandes réglées, moins les remboursements persistés',
  };
}

/**
 * Construit les chiffres à afficher.
 *
 * Skin : le CA affiché = lignes soins peau uniquement. Les kits restent du Hair.
 * Si le catalogue est chargé et ne contient aucun soin, tout le CA scopé est
 * une fuite Hair. Si le catalogue n’est pas chargé, on ne zéroise pas : un
 * échec de lecture ne doit pas se lire comme « 0 vente ».
 */
export function buildWorkspacePulse(input: WorkspacePulseInput): WorkspacePulse {
  const counts = countWorkspaceCatalog(input.products || []);
  const metrics = input.metrics;
  const extra = {
    identifiedCount: input.identifiedCount ?? null,
    rfqOpen: input.rfqOpen ?? null,
    docsMissing: input.docsMissing ?? null,
  };
  if (input.workspace === 'hair') return passThroughHair(counts, metrics, extra);

  const rawRevenue = Number(metrics?.revenueTest) || 0;
  const catalogLoaded = counts.catalogCount > 0;
  const noCosmeticInCatalog = catalogLoaded && counts.cosmeticSkuInCatalog === 0;
  const cosmeticRevenue = input.cosmeticRevenueEur;
  const kitRevenue = input.kitRevenueEur;

  let displayRevenueEur: number;
  let leakedRevenueEur = 0;
  let hairRevenueLeak = false;

  if (typeof cosmeticRevenue === 'number' && Number.isFinite(cosmeticRevenue)) {
    displayRevenueEur = Math.max(0, cosmeticRevenue);
    leakedRevenueEur = typeof kitRevenue === 'number' && Number.isFinite(kitRevenue) ? Math.max(0, kitRevenue) : Math.max(0, rawRevenue - displayRevenueEur);
    hairRevenueLeak = leakedRevenueEur > 0;
  } else if (noCosmeticInCatalog) {
    displayRevenueEur = 0;
    leakedRevenueEur = rawRevenue;
    hairRevenueLeak = rawRevenue > 0;
  } else {
    displayRevenueEur = rawRevenue;
    leakedRevenueEur = 0;
    hairRevenueLeak = false;
  }

  const honestZeroSales = displayRevenueEur === 0 && (noCosmeticInCatalog || (typeof cosmeticRevenue === 'number' && cosmeticRevenue === 0));
  const zeroCommerce = honestZeroSales;
  const skuLabel = counts.publishedCosmeticSku === 0 ? '0 SKU peau publiable' : `${counts.publishedCosmeticSku} SKU peau publiable(s)`;

  return {
    workspace: 'skin',
    ...counts,
    displayRevenueEur: zeroCommerce ? 0 : displayRevenueEur,
    displayAovEur: zeroCommerce ? 0 : (Number(metrics?.avgOrderValue) || 0),
    displayOrders: zeroCommerce ? 0 : (Number(metrics?.totalOrders) || 0),
    displayPaidOrders: zeroCommerce ? 0 : (Number(metrics?.paidOrdersCount) || 0),
    displayUniqueCustomers: zeroCommerce ? 0 : (Number(metrics?.uniqueCustomers) || 0),
    displayMarginEur: zeroCommerce ? 0 : (Number(metrics?.estimatedMargin) || 0),
    displayMarginRate: zeroCommerce ? null : (metrics?.estimatedMarginRate ?? null),
    displayLtv: zeroCommerce ? null : (metrics?.ltvProxy ?? null),
    displayRepeatRate: zeroCommerce ? null : (metrics?.repeatRate ?? null),
    hairRevenueLeak,
    leakedRevenueEur,
    honestZeroSales,
    stockAlertsAreHairKits: zeroCommerce && counts.kitSkuInScope > 0,
    displayLowStock: zeroCommerce ? [] : (metrics?.lowStockProducts || []),
    displayOutOfStock: zeroCommerce ? [] : (metrics?.outOfStockProducts || []),
    popularProducts: zeroCommerce ? [] : (metrics?.popularProducts || []),
    identifiedCount: extra.identifiedCount,
    rfqOpen: extra.rfqOpen,
    docsMissing: extra.docsMissing,
    headline: counts.publishedCosmeticSku === 0
      ? `${skuLabel} — ${honestZeroSales ? '0 vente Skin' : 'ventes hors boutique'}`
      : 'Tableau de bord Skin',
    hint: hairRevenueLeak
      ? `${leakedRevenueEur.toFixed(2)} € mesurés sur des kits capillaires : CA Hair, pas du Skin.`
      : honestZeroSales
        ? 'Aucun soin peau n’est en boutique. Pipeline, RFQ et docs sont les KPI utiles — pas le CA Hair.'
        : 'Ventes des soins peau uniquement — les kits capillaires restent du Hair.',
    revenueLabel: 'Ventes Skin',
    revenueHint: honestZeroSales
      ? (hairRevenueLeak
        ? `0 € Skin. ${leakedRevenueEur.toFixed(2)} € de kits = CA Hair, non affiché ici.`
        : '0 SKU peau publiable, 0 vente Skin')
      : 'Commandes réglées des soins peau, moins les remboursements',
  };
}

export function withOpsFacts(
  pulse: WorkspacePulse,
  facts: { identifiedCount?: number | null; rfqOpen?: number | null; docsMissing?: number | null },
): WorkspacePulse {
  return {
    ...pulse,
    identifiedCount: facts.identifiedCount !== undefined ? facts.identifiedCount : pulse.identifiedCount,
    rfqOpen: facts.rfqOpen !== undefined ? facts.rfqOpen : pulse.rfqOpen,
    docsMissing: facts.docsMissing !== undefined ? facts.docsMissing : pulse.docsMissing,
  };
}

export function formatPulseNumber(value: number | null | undefined, kind: 'eur' | 'count' | 'pct' = 'count'): string {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return '—';
  if (kind === 'eur') return `${Number(value).toFixed(2)} €`;
  if (kind === 'pct') return `${Number(value).toFixed(0)} %`;
  return String(value);
}
