/**
 * CHANTIER 14 — UX Skin : empty state honnête, pas de panier fantôme.
 *
 * Boutique / diagnostic : tant qu’aucun soin peau n’est **publié et
 * achetable**, on le dit. Un test listing, une cible de formulation, un
 * draft C8 ou un produit Hair ne déclenchent jamais « Ajouter au panier »
 * dans un contexte peau.
 *
 * Hair accessoires / cheveux : inchangés (inStock ou précommande).
 */
import { isSkinCosmeticCategory } from './dropshipProcedure';

const BLOCKED_STATES = new Set([
  'formulation_target',
  'pending_validation',
  'placeholder',
  'draft',
  'unavailable',
]);

export type SkinCommerceProduct = {
  category?: string | null;
  testListing?: boolean;
  availabilityState?: string | null;
  inStock?: boolean;
  isPreorder?: boolean;
  price?: number | null;
};

export function isSkinCosmeticProduct(product: SkinCommerceProduct | null | undefined): boolean {
  return Boolean(product && isSkinCosmeticCategory(product.category));
}

export function isBlockedCommercialState(state?: string | null): boolean {
  return Boolean(state && BLOCKED_STATES.has(state));
}

/** SKU Skin réellement vendable — pas une cible, pas un test, pas un 0 €. */
export function isSellableSkinSku(product: SkinCommerceProduct | null | undefined): boolean {
  if (!product || !isSkinCosmeticCategory(product.category)) return false;
  if (product.testListing === true) return false;
  if (isBlockedCommercialState(product.availabilityState)) return false;
  if (product.price == null || !(Number(product.price) > 0)) return false;
  if (product.availabilityState === 'available') return product.inStock === true;
  if (product.availabilityState === 'preorder') return true;
  if (product.availabilityState == null || product.availabilityState === '') {
    return product.inStock === true || product.isPreorder === true;
  }
  return false;
}

export function countSellableSkinSkus(products: SkinCommerceProduct[] | null | undefined): number {
  return (products || []).filter(isSellableSkinSku).length;
}

/**
 * Fail-closed : catalogue non mesuré = étagère vide (on ne promet pas).
 * 0 SKU mesuré = vide honnête, pas un « bientôt » inventé.
 */
export function skinShelfEmpty(products: SkinCommerceProduct[] | null | undefined, measured: boolean): boolean {
  if (!measured) return true;
  return countSellableSkinSkus(products) === 0;
}

/**
 * Bouton panier. Cosmétique Skin : seulement un SKU vendable.
 * Test listing : jamais. Hair / accessoires : inStock ou précommande.
 */
export function canShowAddToCart(product: SkinCommerceProduct | null | undefined): boolean {
  if (!product) return false;
  if (product.testListing === true) return false;
  if (isBlockedCommercialState(product.availabilityState)) return false;
  if (isSkinCosmeticCategory(product.category)) return isSellableSkinSku(product);
  return product.inStock === true || product.isPreorder === true;
}

/** Grille boutique en contexte peau : uniquement des soins peau, jamais du Hair. */
export function productsForSkinShelf<T extends SkinCommerceProduct>(products: T[]): T[] {
  return products.filter(product => isSkinCosmeticCategory(product.category) && product.testListing !== true);
}

export const SKIN_EMPTY_COPY = {
  title: 'Aucun soin peau n’est encore publié',
  text: 'Le diagnostic et le guide restent disponibles. Une fiche n’apparaît à l’achat que lorsqu’elle passe la porte de publication — jamais un panier sur une cible de formulation.',
  ctaDiagnostic: 'Faire le diagnostic peau',
  ctaGamme: 'Voir la gamme en cours de formulation',
} as const;
