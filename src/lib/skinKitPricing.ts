/**
 * C3.3 — réconciliation serveur des kits peau.
 *
 * Les montants présents dans `peauKits.ts` sont des cibles de gamme. Cette
 * fonction ne les transforme jamais en prix encaissables : elle les remplace
 * par le total des composants du catalogue serveur dès que ces composants sont
 * tous publiés, éligibles et donc réellement réconciliables.
 *
 * Même après réconciliation, l'achat d'un kit reste explicitement désactivé
 * tant que C1 est suspendu. Le checkout ne reçoit donc jamais un SKU de kit.
 */
import { calculateShippingCents, type ShippingMethod } from './shippingRules';
import { isCheckoutEligibleProduct } from './catalogTruth';
import { PEAU_KITS, type PeauKit, type PeauKitId } from './peauKits';
import { toCents } from './currency';

export type SkinKitPriceSource = 'server_reconciled' | 'indicative_target';

export type SkinKitComponentQuote = {
  id: string;
  name: string;
  role: string;
  targetUnitPrice: number;
  serverUnitPrice: number | null;
  foundInPublicCatalog: boolean;
  checkoutEligible: boolean;
};

export type SkinKitQuote = {
  id: PeauKitId;
  sku: string;
  name: string;
  tier: PeauKit['tier'];
  economyPct: number;
  targetBundlePrice: number;
  targetSeparatePrice: number;
  targetEconomy: number;
  priceBundle: number;
  priceSeparate: number;
  economy: number;
  priceSource: SkinKitPriceSource;
  reconciled: boolean;
  checkoutEligible: false;
  purchaseState: 'formulation_target' | 'c1_suspended';
  shippingCents: number | null;
  shippingMethod: ShippingMethod;
  components: SkinKitComponentQuote[];
  reason: string;
};

function roundedEuros(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function safeServerPrice(product: any): number | null {
  const value = Number(product?.price);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Produit les devis d'affichage à partir d'une projection serveur du catalogue.
 * `catalogProducts` doit être issu de `serverDb.getProducts`, jamais d'un prix
 * envoyé par le navigateur.
 */
export function buildSkinKitQuotes(
  catalogProducts: any[],
  country = 'FR',
  shippingMethod: ShippingMethod = 'standard'
): SkinKitQuote[] {
  const byId = new Map((Array.isArray(catalogProducts) ? catalogProducts : []).map(product => [String(product.id), product]));

  return PEAU_KITS.map((kit): SkinKitQuote => {
    const components = kit.products.map(target => {
      const serverProduct = byId.get(target.id);
      const serverUnitPrice = safeServerPrice(serverProduct);
      return {
        id: target.id,
        name: target.name,
        role: target.role,
        targetUnitPrice: target.price,
        serverUnitPrice,
        foundInPublicCatalog: Boolean(serverProduct),
        checkoutEligible: Boolean(serverProduct && isCheckoutEligibleProduct(serverProduct)),
      };
    });

    const allComponentsFound = components.every(component => component.serverUnitPrice !== null);
    const allComponentsEligible = components.every(component => component.checkoutEligible);
    const reconciled = allComponentsFound;
    const targetBundleCents = toCents(kit.priceBundle);
    const targetSeparateCents = toCents(kit.priceSeparate);
    const serverSeparateCents = reconciled
      ? components.reduce((sum, component) => sum + toCents(component.serverUnitPrice || 0), 0)
      : null;
    const bundleCents = serverSeparateCents === null
      ? targetBundleCents
      : Math.max(0, Math.round(serverSeparateCents * (100 - kit.economyPct) / 100));
    const separateCents = serverSeparateCents ?? targetSeparateCents;
    const economyCents = Math.max(0, separateCents - bundleCents);

    let shippingCents: number | null = null;
    try {
      shippingCents = calculateShippingCents(bundleCents, country, shippingMethod);
    } catch {
      // Le pays est affiché comme non desservi plutôt que de fabriquer un port.
      shippingCents = null;
    }

    const reason = !allComponentsFound
      ? 'Prix indicatif : un ou plusieurs composants réels ne sont pas encore publiés dans le catalogue serveur.'
      : !allComponentsEligible
        ? 'Prix réconcilié depuis le catalogue serveur, mais kit non achetable : au moins un composant reste indisponible ou non éligible.'
        : 'Prix réconcilié depuis les prix serveur des composants ; achat du kit suspendu pendant C1.';

    return {
      id: kit.id,
      sku: kit.sku,
      name: kit.name,
      tier: kit.tier,
      economyPct: kit.economyPct,
      targetBundlePrice: kit.priceBundle,
      targetSeparatePrice: kit.priceSeparate,
      targetEconomy: kit.economy,
      priceBundle: roundedEuros(bundleCents),
      priceSeparate: roundedEuros(separateCents),
      economy: roundedEuros(economyCents),
      priceSource: reconciled ? 'server_reconciled' : 'indicative_target',
      reconciled,
      checkoutEligible: false,
      purchaseState: allComponentsFound && allComponentsEligible ? 'c1_suspended' : 'formulation_target',
      shippingCents,
      shippingMethod,
      components,
      reason,
    };
  });
}
