/**
 * Recherche d'un produit cosmétique par code-barres via Open Beauty Facts.
 *
 * Pourquoi ce service
 * -------------------
 * Le KURLA Shelf se remplit aujourd'hui à la main. Le code-barres inverse la
 * charge : l'utilisateur scanne un produit de sa salle de bain, OBF nous donne
 * son nom, sa marque et sa liste INCI, et KURLA crée l'article d'inventaire.
 *
 * Choix importants
 * ----------------
 * - **Aucune donnée n'est inventée.** Si OBF ne connaît pas le code-barres ou
 *   renvoie une fiche vide, on renvoie `null` et l'interface propose la saisie
 *   manuelle. On ne fabrique pas de produit.
 * - Appel fait **côté navigateur** directement sur l'API publique OBF (CORS
 *   ouvert, aucune clé, `1 appel = 1 scan réel` selon les conditions d'usage).
 * - La liste INCI renvoyée est la liste *déclarée* du produit ; elle sert de
 *   brouillon à rattacher au graphe KURLA, pas de vérité vérifiée.
 */

export interface BarcodeProduct {
  /** Code-barres normalisé (EAN/UPC), chiffres uniquement. */
  barcode: string;
  /** Marque principale, si connue. */
  brand?: string;
  /** Nom du produit, si connu. */
  name?: string;
  /** Libellé proposé pour le Shelf (marque + nom), jamais vide une fois défini. */
  label: string;
  /** Liste INCI brute, séparée en ingrédients, nettoyée mais non normalisée. */
  ingredients: string[];
  /** Catégorie OBF brute (indicative). */
  categories?: string;
  /** Pays de vente déclarés. */
  countries?: string;
  /** URL de l'image produit si disponible. */
  imageUrl?: string;
  /** Source pour traçabilité. */
  source: 'open_beauty_facts';
}

const OBF_BASE = 'https://world.openbeautyfacts.org/api/v2';

/** Garde-fou anti-scan : un code-barres EAN-8/12/13/14 ou UPC-A numérique. */
export function normalizeBarcode(raw: string): string | null {
  const digits = String(raw ?? '').replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function cleanIngredientList(ingredientsText: unknown, ingredientsTags: unknown): string[] {
  const names = new Set<string>();

  if (typeof ingredientsText === 'string') {
    ingredientsText
      .split(/[,;]/)
      .map((part) => part.replace(/[\d.]+%/g, '').replace(/[*_]/g, '').trim())
      .filter((part) => part.length > 1 && part.length < 120)
      .forEach((part) => names.add(part));
  }

  // tags de la forme "en:shea-butter" → "shea butter"
  if (Array.isArray(ingredientsTags)) {
    for (const tag of ingredientsTags) {
      if (typeof tag !== 'string') continue;
      const withoutLang = tag.replace(/^[a-z]{2,3}:/, '');
      const readable = withoutLang.replace(/-/g, ' ').trim();
      if (readable.length > 1) names.add(readable);
    }
  }

  return Array.from(names).slice(0, 60);
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/**
 * Recherche un produit par code-barres. Renvoie `null` si introuvable ou fiche
 * inexploitable. Ne lève jamais : l'appelant gère l'absence par la saisie.
 */
export async function lookupProductByBarcode(rawBarcode: string): Promise<BarcodeProduct | null> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!barcode) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${OBF_BASE}/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,ingredients_text,ingredients_tags,categories_tags,countries_tags,image_front_url,status`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const data = await response.json();
    if (data?.status === 0 || !data?.product) return null;

    const product = data.product;
    const brand = firstNonEmpty(product.brands?.split?.(',')[0], product.brand_owner);
    const name = firstNonEmpty(product.product_name, product.generic_name);
    const ingredients = cleanIngredientList(product.ingredients_text, product.ingredients_tags);

    // Sans nom ni marque, la fiche ne permet pas de créer un article lisible.
    if (!brand && !name) return null;

    const label = [brand, name].filter(Boolean).join(' — ');
    const categories = Array.isArray(product.categories_tags)
      ? product.categories_tags.map((t: string) => String(t).replace(/^[a-z]{2,3}:/, '').replace(/-/g, ' ')).slice(0, 8).join(', ')
      : undefined;
    const countries = Array.isArray(product.countries_tags)
      ? product.countries_tags.map((t: string) => String(t).replace(/^[a-z]{2,3}:/, '')).join(', ')
      : undefined;

    return {
      barcode,
      brand,
      name,
      label,
      ingredients,
      categories,
      countries,
      imageUrl: firstNonEmpty(product.image_front_url),
      source: 'open_beauty_facts',
    };
  } catch {
    // Réseau/abort/JSON : on retombe sur la saisie manuelle, sans erreur bloquante.
    return null;
  }
}

/** Saisie manuelle d'un code-barres : vérifie seulement sa forme. */
export function isLikelyBarcode(value: string): boolean {
  return normalizeBarcode(value) !== null;
}
