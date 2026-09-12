/**
 * KURLA L1 — « Complète votre routine » (cross-sell)
 * ==================================================
 *
 * Promesse du plan de chantiers (L1) : sur la fiche et sur le panier,
 * proposer jusqu'à 3 produits qui COMPLETENT la routine déclarée — jamais un
 * carrousel générique — et jamais un produit que l'utilisatrice possède déjà
 * (Shelf) ou qu'elle a déjà mis au panier.
 *
 * Sources de vérité réutilisées (pas de duplication) :
 *  - `shelf.ts` : vocabulaire contrôlé des étapes (`RoutineStep`), ShelfItem,
 *    activeItems ;
 *  - le catalogue public : chaque produit porte `routineStep` (texte libre)
 *    et `category` — ce module fournit LA couche de mapping texte → étape.
 *
 * Règle d'honnêteté (partagée avec le moteur de routine) : une étape ne
 * compte comme couverte que si elle est DÉCLARÉE par un produit ou un article
 * de l'étagère. Un texte non reconnu ne couvre rien — KURLA ne remplit pas une
 * étape avec un produit approximatif.
 */

import { Product } from '../types';
import {
  RoutineStep,
  ROUTINE_STEPS,
  ROUTINE_STEP_LABELS,
  ShelfItem,
  activeItems,
} from './shelf';

/** Étapes cœur du domaine cheveux : les 4 que le verdict d'achat exige déjà. */
export const HAIR_ROUTINE_STEPS: RoutineStep[] = ['cleanse', 'condition', 'leave_in', 'seal_oil'];
/** Étapes cœur du domaine peau : nettoyer, hydrater, protéger. */
export const SKIN_ROUTINE_STEPS: RoutineStep[] = ['skin_cleanser', 'skin_moisturizer', 'skin_spf'];

type RoutineDomain = 'hair' | 'skin';

function categoryDomain(category?: string): RoutineDomain | null {
  const c = (category || '').toLowerCase();
  if (c === 'peau' || c === 'skin') return 'skin';
  if (['cheveux', 'hair', 'hommes', 'enfants', 'kids'].includes(c)) return 'hair';
  return null;
}

const HAIR_STEP_RULES: Array<[RegExp, RoutineStep]> = [
  [/cuir chevelu|scalp/, 'scalp_treatment'],
  [/prot[eé]in|protein/, 'protein_treatment'],
  [/masque|deep|soin profond/, 'deep_condition'],
  [/apr[eè]s-shampo|condition/, 'condition'],
  [/leave[- ]?in/, 'leave_in'],
  [/shampo|nettoyant|gel lavant/, 'cleanse'],
  [/huile|seal|occlusive|scell/, 'seal_oil'],
  [/coiff|fixat|d[eé]fini|curl|grooming/, 'styling_definer'],
];

const SKIN_STEP_RULES: Array<[RegExp, RoutineStep]> = [
  [/nettoyant|cleansing|gel lavant|d[eé]maquill|micellaire|huile lavante/, 'skin_cleanser'],
  [/solaire|\bspf\b|sunscreen/, 'skin_spf'],
  [/s[eé]rum|exfol|traitement|niacinamide|r[eé]tinol|az[eé]la|vitamine c|peeling|acide/, 'skin_treatment'],
  [/hydrat|cr[eè]me|baume|e[mé]ollient|lotion/, 'skin_moisturizer'],
];

function firstMatch(rules: Array<[RegExp, RoutineStep]>, v: string): RoutineStep | null {
  for (const [rx, step] of rules) if (rx.test(v)) return step;
  return null;
}

/**
 * Mappe le texte libre `routineStep` d'une fiche vers le vocabulaire contrôlé.
 * `category` lève les ambiguïtés (« Nettoyant doux » = visage si catégorie
 * peau, lavant sinon). Retourne `null` quand le texte ne déclare pas
 * d'étape reconnue : dans ce cas le produit ne couvre rien, point.
 */
export function mapRoutineStepText(value: string | undefined | null, category?: string): RoutineStep | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if ((ROUTINE_STEPS as string[]).includes(v)) return v as RoutineStep;
  const domain = categoryDomain(category);
  if (domain === 'skin') return firstMatch(SKIN_STEP_RULES, v);
  if (domain === 'hair') return firstMatch(HAIR_STEP_RULES, v);
  // Domaine indéterminé (kits, accessoires…) : on essaie les règles cheveux —
  // le domaine principal — puis les règles peau. Les mots distinctifs
  // (shampo / leave-in / solaire / sérum / hydratant) ne se chevauchent pas.
  return firstMatch(HAIR_STEP_RULES, v) ?? firstMatch(SKIN_STEP_RULES, v);
}

/** Domaine de routine d'un produit : sa catégorie, sinon son texte d'étape. */
export function productRoutineDomain(product: Pick<Product, 'category' | 'routineStep'>): RoutineDomain | null {
  const fromCategory = categoryDomain(product.category);
  if (fromCategory) return fromCategory;
  const step = mapRoutineStepText(product.routineStep);
  if (!step || step === 'other') return null;
  return step.startsWith('skin_') ? 'skin' : 'hair';
}

/**
 * Même sémantique que `ownedMatch` du moteur de recommandation : l'article de
 * l'étagère pointe le produit (productId) OU son libellé libre recouvre le nom
 * du produit. On ne réinvente pas une autre idée de « posséder ».
 */
function isOwnedOnShelf(product: Product, shelf: ShelfItem[]): boolean {
  const name = product.name.toLowerCase();
  return activeItems(shelf).some(item => {
    if (item.productId && item.productId === product.id) return true;
    if (!item.freeLabel) return false;
    const label = item.freeLabel.toLowerCase();
    return label.includes(name) || name.includes(label);
  });
}

export interface RoutineComplementInput {
  /** Produits du contexte : panier (n items) ou fiche produit (1 item). */
  contextProducts: Product[];
  /** Étagère de l'utilisatrice — vide si invitée. */
  shelfItems: ShelfItem[];
}

export interface RoutineCoverage {
  covered: RoutineStep[];
  missing: RoutineStep[];
}

export interface ComplementSuggestion {
  product: Product;
  missingStep: RoutineStep;
  /** Raison lue, affichée telle quelle : aucune donnée inventée. */
  reason: string;
}

/**
 * Étapes couvertes (contexte + étagère active) et manquantes.
 *
 * Ordre des manquantes : le domaine du contexte d'abord — la fiche d'un
 * produit peau complète d'abord la routine peau ; un panier mixte suit la
 * majorité, à égalité le domaine cheveux (domaine principal).
 */
export function analyseRoutineCoverage(input: RoutineComplementInput): RoutineCoverage {
  const covered = new Set<RoutineStep>();
  for (const p of input.contextProducts) {
    const step = mapRoutineStepText(p.routineStep, p.category);
    if (step && step !== 'other') covered.add(step);
  }
  for (const item of activeItems(input.shelfItems)) {
    if (item.routineStep && item.routineStep !== 'other') covered.add(item.routineStep);
  }

  const domainCounts: Record<RoutineDomain, number> = { hair: 0, skin: 0 };
  for (const p of input.contextProducts) {
    const domain = productRoutineDomain(p);
    if (domain) domainCounts[domain] += 1;
  }
  const domains: RoutineDomain[] = (['hair', 'skin'] as RoutineDomain[])
    .sort((a, b) => domainCounts[b] - domainCounts[a] || (a === 'hair' ? -1 : 1));

  const missing: RoutineStep[] = [];
  for (const domain of domains) {
    const steps = domain === 'hair' ? HAIR_ROUTINE_STEPS : SKIN_ROUTINE_STEPS;
    for (const step of steps) if (!covered.has(step)) missing.push(step);
  }
  return { covered: [...covered], missing };
}

/**
 * Construit les compléments de routine : un produit par étape manquante,
 * dans l'ordre de la routine, plafonné à `limit` (3 par défaut).
 *
 * Exclusions strictes :
 *  - le produit est déjà dans le contexte (panier/fiche) ;
 *  - l'utilisatrice le possède déjà (Shelf actif) ;
 *  - sa catégorie/étape ne correspond pas au domaine de l'étape manquante ;
 *  - son `routineStep` ne déclare pas l'étape concernée.
 *
 * Classement des candidats : stock disponible d'abord, puis prix croissant.
 */
export function buildRoutineComplements(
  catalog: Product[],
  input: RoutineComplementInput,
  limit = 3
): ComplementSuggestion[] {
  const contextIds = new Set(input.contextProducts.map(p => p.id));
  const { missing } = analyseRoutineCoverage(input);

  const suggestions: ComplementSuggestion[] = [];
  for (const step of missing) {
    if (suggestions.length >= limit) break;
    const domain: RoutineDomain = step.startsWith('skin_') ? 'skin' : 'hair';
    const candidates = catalog
      .filter(candidate => {
        if (contextIds.has(candidate.id)) return false;
        if (isOwnedOnShelf(candidate, input.shelfItems)) return false;
        if (productRoutineDomain(candidate) !== domain) return false;
        return mapRoutineStepText(candidate.routineStep, candidate.category) === step;
      })
      .sort((a, b) => {
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        return a.price - b.price;
      });
    const best = candidates[0];
    if (!best) continue;
    suggestions.push({
      product: best,
      missingStep: step,
      reason: `Étape « ${ROUTINE_STEP_LABELS[step]} » manquante dans votre routine`,
    });
  }
  return suggestions;
}
