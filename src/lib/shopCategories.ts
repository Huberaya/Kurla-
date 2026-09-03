/**
 * Catégories de la boutique — source unique.
 *
 * Pourquoi ce fichier existe : le rayon demandé se perdait en route.
 *
 * Le 2026-09-03, quatre liens internes pointaient vers `/boutique?category=…`
 * alors que la page lit `?cat=`. Le paramètre était ignoré sans bruit, et la
 * visiteuse qui avait cliqué « voir les accessoires » depuis /outils — ou
 * « découvrir les soins peau » depuis /melanin-skin — atterrissait sur les
 * 64 produits, non filtrés. Aucune erreur, aucun test rouge : juste une
 * intention qui s'évapore. Pire, `?category=skincare` employait une valeur
 * qui n'a jamais existé dans le catalogue.
 *
 * D'où cette règle : une catégorie se déclare ici, une seule fois. Les liens
 * se construisent avec `shopCategoryHref`, jamais à la main. Le banc
 * `kurla_shop_categories.test.ts` interdit de réécrire `?category=` et
 * vérifie que tout rayon annoncé possède soit des produits, soit un hub.
 */

export const SHOP_CATEGORIES = [
  'tous',
  'besoins',
  'cheveux',
  'peau',
  'accessoires',
  'kits',
  'hommes',
  'enfants',
  'nouveautes',
  'promotions'
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

/** Paramètre canonique de l'URL. `category` reste accepté en lecture (liens déjà partagés). */
export const SHOP_CATEGORY_PARAM = 'cat';

/** Alias toléré en lecture, pour ne pas casser les liens déjà diffusés. */
export const SHOP_CATEGORY_PARAM_ALIAS = 'category';

export const DEFAULT_SHOP_CATEGORY: ShopCategory = 'tous';

export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  tous: 'Tout le catalogue',
  besoins: 'Trouver par besoin',
  cheveux: 'Cheveux & boucles',
  peau: 'Visage & peau',
  accessoires: 'Outils & accessoires',
  kits: 'Kits & routines',
  hommes: 'Hommes',
  enfants: 'Enfants',
  nouveautes: 'Nouveautés',
  promotions: 'Promotions'
};

export function isShopCategory(value: unknown): value is ShopCategory {
  return typeof value === 'string' && (SHOP_CATEGORIES as readonly string[]).includes(value);
}

/** Construit l'URL d'un rayon. `tous` renvoie /boutique, sans paramètre inutile. */
export function shopCategoryHref(category: ShopCategory): string {
  return category === DEFAULT_SHOP_CATEGORY ? '/boutique' : `/boutique?${SHOP_CATEGORY_PARAM}=${category}`;
}

/**
 * Lit la catégorie depuis une query string.
 *
 * Une valeur inconnue est ramenée à `tous` — jamais à un rayon vide sans hub,
 * et jamais à une exception. `cat` prime sur l'alias `category`.
 */
export function readShopCategory(search: URLSearchParams | string): ShopCategory {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const raw =
    params.get(SHOP_CATEGORY_PARAM) ?? params.get(SHOP_CATEGORY_PARAM_ALIAS) ?? DEFAULT_SHOP_CATEGORY;
  return isShopCategory(raw) ? raw : DEFAULT_SHOP_CATEGORY;
}

/**
 * Rayons qui n'ont aujourd'hui aucun produit publié.
 *
 * Ce n'est pas une constante décorative : ces trois audiences sont mises en
 * avant sur la home et disposent chacune d'une page marketing complète. Tant
 * que le rayon est vide, l'endroit honnête où envoyer la visiteuse n'est pas
 * une boutique filtrée qui ne renvoie rien, mais une capture d'intention.
 * Le banc vérifie que cette liste reste exacte.
 */
export const EMPTY_SHOP_CATEGORIES: readonly ShopCategory[] = ['peau', 'hommes', 'enfants'];

/** Réexporté pour que les appelants n'aient qu'un seul module à connaître. */
export { WAITLIST_SOURCES, DEFAULT_WAITLIST_SOURCE, normalizeWaitlistSource } from './waitlistSources';

/**
 * Source d'inscription transmise à `/api/waitlist` pour chaque rayon vide.
 * `null` quand le rayon a des produits : rien à capturer.
 *
 * La signature accepte `string` parce que l'état de filtre de la page est
 * historiquement une chaîne libre ; restreindre le type obligerait à retyper
 * tout le sélecteur pour un gain nul, alors que le test d'appartenance suffit.
 */
export function waitlistSourceForCategory(category: string): string | null {
  return (EMPTY_SHOP_CATEGORIES as readonly string[]).includes(category)
    ? `categorie_${category}`
    : null;
}
