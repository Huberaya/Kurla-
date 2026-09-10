/**
 * Résolution d'un produit recommandé vers une fiche réelle du catalogue.
 * ====================================================================
 *
 * Le problème que ce module règle : l'application recommande des produits par
 * leur nom (« Sérum niacinamide 5% », dans `PEAU_KITS` et les profils de
 * connaissance), et ces noms n'étaient jamais confrontés au catalogue. Une
 * recommandation s'affichait donc en texte brut, sans prix, sans lien, sans
 * panier — quand bien même le produit existait en boutique sous un nom voisin
 * (« Sérum Niacinamide 5% — 30ml »).
 *
 * La correspondance est volontairement tolérante sur la casse, les accents, la
 * ponctuation et les mentions de contenance, car les deux côtés de la
 * comparaison sont écrits à la main. Elle est en revanche exigeante sur la
 * couverture : un nom dont la moitié des mots significatifs est absente de la
 * fiche candidate ne correspond pas. Mieux vaut afficher un nom en texte
 * qu'une fiche qui n'est pas le produit conseillé.
 *
 * Renvoyer `null` n'est pas un échec : c'est le signal qu'il faut afficher le
 * nom tel quel plutôt que d'inventer un lien.
 */

/** Mots vides : ils ne portent aucun sens pour distinguer deux fiches. */
const STOP_WORDS = new Set([
  'de', 'des', 'du', 'la', 'le', 'les', 'et', 'a', 'au', 'aux', 'en', 'pour',
  'sans', 'avec', 'peau', 'visage', 'ml', 'g', 'flacon', 'tube', 'pot',
]);

/**
 * Normalise une chaîne : casse, accents, ponctuation et chiffres de contenance
 * disparaissent. « Sérum Niacinamide 5% — 30ml » devient {serum, niacinamide}.
 */
export function normalizeProductName(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Seul le signe « × » est un séparateur. La lettre x ne l'est pas :
    // la confondre transformait « doux » en « dou ».
    .replace(/[×*]/g, ' ')
    // Le tiret est un séparateur, pas un caractère de mot : « sérum-niacinamide »
    // doit se comparer à « sérum niacinamide ».
    .replace(/[^a-z0-9%\s]/g, ' ')
    .split(/\s+/)
    .map(token => token.replace(/^-+|-+$/g, ''))
    .filter(token => token.length > 1 && !STOP_WORDS.has(token) && !/^\d+(ml|g)$/.test(token));
}

export interface CatalogueMatch {
  /** Le produit retenu. */
  product: { id: string; slug: string; name: string };
  /** Score entre 0 et 1 : 1 = correspondance exacte après normalisation. */
  score: number;
}

/** Score minimal : en dessous, on considère qu'il n'y a pas correspondance. */
export const MATCH_THRESHOLD = 0.5;
/** Couverture minimale des mots du nom recommandé. */
const MIN_COVERAGE = 0.6;

/**
 * Retourne, parmi les produits proposés, celui qui correspond le mieux au nom
 * recommandé — ou `null` si aucun ne franchit le seuil.
 *
 * Le score combine :
 *   · la couverture : quelle part des mots du nom recommandé se retrouve dans
 *     la fiche (un nom recommandé souvent plus court qu'un nom de fiche) ;
 *   · la précision : quelle part des mots de la fiche est expliquée par le nom
 *     recommandé, ce qui départage deux fiches couvrant également le besoin.
 */
export function resolveCatalogueProduct<T extends { id: string; slug: string; name: string }>(
  recommendedName: string,
  products: readonly T[],
): CatalogueMatch | null {
  const query = normalizeProductName(recommendedName);
  if (query.length === 0) return null;

  let best: CatalogueMatch | null = null;

  for (const product of products) {
    const candidate = new Set(normalizeProductName(product.name));
    if (candidate.size === 0) continue;

    const matched = query.filter(token => candidate.has(token)).length;
    const coverage = matched / query.length;
    if (coverage < MIN_COVERAGE) continue;

    const precision = matched / candidate.size;
    const score = coverage * 0.75 + precision * 0.25;
    if (score < MATCH_THRESHOLD) continue;

    if (!best || score > best.score) {
      best = { product: { id: product.id, slug: product.slug, name: product.name }, score };
    }
  }

  return best;
}

/**
 * Résout une liste de noms recommandés. Chaque entrée porte soit la fiche
 * trouvée, soit le nom seul quand aucune fiche ne correspond — l'appelant peut
 * alors choisir de l'afficher en texte plutôt que de le taire.
 */
export function resolveRecommendedProducts<T extends { id: string; slug: string; name: string }>(
  recommendedNames: readonly string[],
  products: readonly T[],
): Array<{ name: string; product: T | null }> {
  const byId = new Map(products.map(p => [p.id, p]));
  const used = new Set<string>();

  return recommendedNames.map(name => {
    const match = resolveCatalogueProduct(name, products);
    if (match && !used.has(match.product.id)) {
      used.add(match.product.id);
      return { name, product: byId.get(match.product.id) ?? null };
    }
    return { name, product: null };
  });
}
