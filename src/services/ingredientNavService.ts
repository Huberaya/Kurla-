/**
 * NAVIGATION PAR INGRÉDIENT — service client (Chantier 1, boucle publique).
 * Lit uniquement les routes publiques du serveur ; le navigateur ne touche
 * jamais aux tables internes (RLS ferme products/product_ingredients).
 */

export interface IngredientSearchHit {
  id: string;
  inciName: string;
  commonNames: string[];
  functions: string[];
  isAllergenRegulated: boolean;
  verificationStatus: string;
  productCount: number;
}

export interface IngredientProductCard {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number | null;
  category: string | null;
  subcategory: string | null;
  image: string | null;
}

export interface ProductIngredientEntry {
  rank: number | null;
  ingredientId: string;
  inciName: string | null;
  commonNames: string[];
  functions: string[];
  isAllergenRegulated: boolean;
  isFragrance: boolean;
  isKeyIngredient: boolean;
  declaredRole: string | null;
  source: string;
  resolved: boolean;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && data.error) || 'Recherche ingrédient indisponible.');
  }
  return data as T;
}

/** Recherche d'ingrédients par terme (INCI ou nom commun français). */
export function searchIngredients(q: string): Promise<{ query: string; ingredients: IngredientSearchHit[] }> {
  return getJson(`/api/ingredients/search?q=${encodeURIComponent(q)}`);
}

/** Produits publiés qui contiennent un ingrédient. */
export function fetchProductsWithIngredient(
  ingredientId: string
): Promise<{ ingredient: { id: string; inciName: string; functions: string[]; isAllergenRegulated: boolean }; products: IngredientProductCard[]; count: number }> {
  return getJson(`/api/ingredients/${encodeURIComponent(ingredientId)}/products`);
}

/** Composition reliée d'une fiche produit (ingrédients triés par rang INCI). */
export function fetchProductIngredients(
  idOrSlug: string
): Promise<{ product: { id: string; slug: string; name: string }; composition: ProductIngredientEntry[]; resolvedCount: number; declaredCount: number }> {
  return getJson(`/api/products/${encodeURIComponent(idOrSlug)}/ingredients`);
}
