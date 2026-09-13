/**
 * Paliers de prix du catalogue.
 *
 * Pourquoi ce module existe
 * -------------------------
 * Le tri « € Prix croissant » existait déjà dans la boutique. Ce qui manquait,
 * c'est la réponse à la question d'un client : **« je n'ai que 10 € »**.
 *
 * Un filtre budget existait (`skinBudget`), mais il était enfermé dans
 * `if (skinContextActive)` de `BoutiquePage` : un client qui regardait les
 * accessoires ou les cheveux n'avait **aucun** filtre de prix. C'était le seul
 * endroit du site où l'on pouvait dire « pas plus de X € », et il ne
 * fonctionnait que sur une catégorie.
 *
 * Deux décisions de conception
 * ---------------------------
 * 1. **Le palier est un PLAFOND, pas une tranche.** `≤ 10 €` répond à
 *    « je n'ai que 10 € » ; `10–20 €` exclurait le produit à 6 € qui
 *    convient encore mieux. C'est aussi le modèle déjà utilisé par
 *    `SKIN_BUDGET_CAPS`, donc on ne change pas la logique en place.
 *
 * 2. **Le palier est DÉRIVÉ du prix, jamais stocké.** Une colonne
 *    `price_tier` deviendrait fausse dès la première modification de prix.
 *    `priceBandOf(price)` ne peut pas diverger de `price`.
 *
 * ⚠️ Ne pas confondre avec le budget mensuel du profil beauté
 * (`beautyProfile.ts` : `moins_40` / `40_70` / `70_100`). Ce sont des
 * **budgets mensuels de routine**, réutilisés comme clés ailleurs. Les
 * identifiants de ce module sont volontairement différents (`prix_…`) pour
 * qu'aucune collision ne soit possible.
 */

export type PriceBandId = 'prix_10' | 'prix_20' | 'prix_35' | 'prix_60' | 'tous';

export type PriceBand = {
  id: PriceBandId;
  /** Libellé affiché au client. */
  label: string;
  /** Plafond en euros, `null` pour « tous ». */
  cap: number | null;
};

/**
 * Paliers proposés au client.
 *
 * Les seuils ne sont pas arbitraires : ils suivent la distribution mesurée du
 * catalogue publié le 13/09/2026 (SQL direct, projet `qzwgsarfdegqtfdnqiql`) :
 *
 *   < 8 €      10 produits (16 %)
 *   8-12 €     13 produits (21 %)
 *   12-20 €    27 produits (43 %)
 *   20-35 €     2 produits ( 3 %)  ← le trou
 *   35-60 €     5 produits ( 8 %)
 *   ≥ 60 €      6 produits (10 %)
 *
 * 80 % du catalogue est sous 20 € : les deux premiers paliers portent donc
 * l'essentiel de l'offre, ce qui est précisément la promesse « moins cher ».
 */
export const PRICE_BANDS: readonly PriceBand[] = [
  { id: 'prix_10', label: 'Moins de 10 €', cap: 10 },
  { id: 'prix_20', label: 'Moins de 20 €', cap: 20 },
  { id: 'prix_35', label: 'Moins de 35 €', cap: 35 },
  { id: 'prix_60', label: 'Moins de 60 €', cap: 60 },
  { id: 'tous', label: 'Tous les prix', cap: null },
];

/** « Tous les prix » — l'état par défaut, qui n'exclut rien. */
export const PRICE_BAND_ALL: PriceBandId = 'tous';

export function isPriceBandId(value: unknown): value is PriceBandId {
  return typeof value === 'string' && PRICE_BANDS.some(band => band.id === value);
}

/**
 * Le produit passe-t-il le palier ?
 *
 * Trois règles, et la deuxième est un garde-fou :
 *  - `tous` ne filtre rien ;
 *  - **un prix absent ou invalide est EXCLU** dès qu'un plafond est actif.
 *    Le garder reviendrait à afficher sous « Moins de 10 € » un produit dont
 *    on ignore le prix — c'est-à-dire à mentir sur le palier ;
 *  - la comparaison est inclusive : un produit à 10 € pile est dans
 *    « Moins de 10 € ».
 */
export function matchesPriceBand(price: unknown, bandId: unknown): boolean {
  if (bandId === PRICE_BAND_ALL || bandId === undefined || bandId === null || bandId === '') return true;
  const band = PRICE_BANDS.find(item => item.id === bandId);
  if (!band || band.cap === null) return true;
  // `null` et `''` doivent être rejetés AVANT Number() : Number(null) vaut 0 et
  // Number('') vaut 0, ce qui ferait passer un produit sans prix pour un
  // produit à 0 € — donc dans tous les paliers.
  if (price === null || price === undefined || (typeof price === 'string' && price.trim() === '')) return false;
  const value = Number(price);
  if (!Number.isFinite(value)) return false;
  return value <= band.cap;
}

/**
 * Palier le plus serré dans lequel tombe un prix. Sert à afficher une
 * étiquette (« entrée de gamme ») et à vérifier que chaque palier correspond
 * réellement à une partie du catalogue.
 */
export function priceBandOf(price: unknown): PriceBandId {
  const value = Number(price);
  if (!Number.isFinite(value)) return PRICE_BAND_ALL;
  for (const band of PRICE_BANDS) {
    if (band.cap !== null && value <= band.cap) return band.id;
  }
  return PRICE_BAND_ALL;
}

/** Libellé d'un palier, ou `null` si l'identifiant est inconnu. */
export function priceBandLabel(bandId: unknown): string | null {
  return PRICE_BANDS.find(band => band.id === bandId)?.label ?? null;
}
