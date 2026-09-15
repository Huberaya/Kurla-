/**
 * CHANTIER C1 — SCORE « KURLA READY » (15/09/2026).
 *
 * Agrège les blocages déjà calculés par `catalogTruth` en un score 0-100
 * avec la liste explicite de ce qui bloque — modèle Amazon Listing Quality
 * Dashboard (« le dashboard dit exactement quels champs bloquent ») et
 * porte de publication Akeneo (complétude avant canal).
 *
 * Rien n'est inventé : les blocages durs viennent de `truth.blockers`
 * (preuve produit, CPNP, visuel/droits, allégations, contrat C1, stock…),
 * les manques de qualité sont des champs objectivement vides de la fiche.
 */

export type KurlaReadyState = 'ready' | 'partial' | 'blocked';

export type KurlaReadyScore = {
  score: number;
  state: KurlaReadyState;
  /** Blocages durs issus de catalogTruth : chacun empêche la vente. */
  hardBlockers: string[];
  /** Manques non bloquants mais pénalisants (qualité de fiche). */
  qualityGaps: string[];
  /** Fiche en mode test : le score est affiché mais la fiche n'est pas achetable. */
  isTestListing: boolean;
};

const HARD_BLOCKER_PENALTY = 25;
const QUALITY_GAP_PENALTY = 5;

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function hasUsableImage(product: any): boolean {
  const images = Array.isArray(product?.images) ? product.images : [];
  if (images.some((image: any) => typeof image === 'string' && /^https?:\/\//.test(image))) return true;
  return typeof product?.image === 'string' && /^https?:\/\//.test(product.image);
}

export function evaluateKurlaReady(product: any): KurlaReadyScore {
  const truth = product?.truth || null;
  const hardBlockers: string[] = Array.isArray(truth?.blockers)
    ? truth.blockers.map((blocker: unknown) => String(blocker))
    : ['vérité catalogue non chargée'];

  const qualityGaps: string[] = [];
  if (!hasText(product?.inci)) qualityGaps.push('INCI absente');
  if (!hasUsableImage(product)) qualityGaps.push('aucun visuel http(s)');
  if (!hasText(product?.description)) qualityGaps.push('description absente');
  if (!hasText(product?.brand)) qualityGaps.push('marque absente');
  const ean = product?.ean ?? product?.barcode;
  // Attention : Number(undefined) = NaN, et NaN <= 0 est FAUX — on exige
  // donc explicitement un EAN texte OU un nombre strictement positif.
  if (!hasText(ean) && !(Number(ean) > 0)) qualityGaps.push('EAN/code-barres absent');

  const score = Math.max(0, Math.min(100,
    100 - hardBlockers.length * HARD_BLOCKER_PENALTY - qualityGaps.length * QUALITY_GAP_PENALTY));

  // Seuil « ready » à 95 = au plus UN manque mineur — aligné sur la grille
  // Amazon LQD (note A : « tous les éléments ou un seul manquant »).
  const state: KurlaReadyState = hardBlockers.length > 0 ? 'blocked' : score >= 95 ? 'ready' : 'partial';

  return {
    score,
    state,
    hardBlockers,
    qualityGaps,
    isTestListing: truth?.isTestListing === true || product?.isTestListing === true || product?.is_test_listing === true,
  };
}
