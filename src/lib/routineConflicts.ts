/**
 * D-03 — CONFLITS D'ACTIFS : ce que la personne utilise réellement.
 *
 * Le graphe d'incompatibilités existait déjà (`ingredientIncompatibilities.ts`,
 * `findConflicts()`), et il était déjà exploité à un endroit : le générateur de
 * routine, sur les produits que KURLA *propose*. Deux angles morts, mesurés
 * avant d'écrire ce module :
 *
 *   1. **L'étagère n'était jamais analysée.** `shelf.ts` sait dire ce qui
 *      manque, ce qui est en surplus, ce qui a été abandonné — mais jamais
 *      « ces deux produits que vous appliquez le même soir se neutralisent ».
 *      C'est pourtant là qu'est le risque : dans la routine réelle, pas dans
 *      celle qu'on propose d'acheter.
 *
 *   2. **Le générateur ignorait ce que la personne possède déjà.** Il calculait
 *      ses conflits sur les produits recommandés seuls. Une utilisatrice qui
 *      a un sérum rétinol dans son étagère et à qui l'on propose un exfoliant
 *      BHA ne voyait aucun conflit — exactement le cas où l'avertissement sert.
 *
 * Ce module est pur : pas d'accès base, pas de fetch. Les règles sont passées
 * en argument, ce qui le rend testable et réutilisable des deux côtés.
 *
 * Ce que ce module ne fait pas : il ne diagnostique rien, ne prescrit rien.
 * Les règles viennent d'un consensus de formulation, chaque conflit porte son
 * niveau de preuve, et un produit dont la composition n'est pas rattachée est
 * déclaré non évalué — jamais compté comme sain.
 */

import {
  ConflictFinding,
  EvidenceLevel,
  IncompatibilityRule,
  IncompatibilitySeverity,
  findConflicts
} from './ingredientGraph';
import { ShelfItem } from './shelf';

/** Un porteur d'actifs : un produit de l'étagère, ou un produit proposé. */
export interface ActifCarrier {
  id: string;
  label: string;
  ingredientIds: string[];
  routineStep?: string;
}

export interface ConflictProductRef {
  itemId: string;
  label: string;
  routineStep?: string;
}

export interface ShelfConflict extends ConflictFinding {
  /** Les deux produits concernés. Identiques si le conflit est interne à une formule. */
  products: [ConflictProductRef, ConflictProductRef];
  /** Vrai quand les deux actifs sont dans le même produit. */
  withinSameProduct: boolean;
  /** Ce qu'il faut faire, concret. Jamais « consultez un médecin » : ce n'est pas notre rôle. */
  advice: string;
}

export interface ShelfConflictAnalysis {
  conflicts: ShelfConflict[];
  /** Produits sans ingrédient rattaché : leur sort est inconnu, on le dit. */
  unanalysed: ConflictProductRef[];
  /** Produits partiellement rattachés : les conflits connus sont affichés, pas une absence de risque. */
  partiallyAnalysed: ConflictProductRef[];
  analysedCount: number;
  /** Phrase de synthèse, y compris quand il n'y a rien à signaler. */
  message: string;
}

const SEVERITY_ORDER: Record<IncompatibilitySeverity, number> = { avoid: 0, space_out: 1, caution: 2 };

/**
 * Statuts retenus pour l'analyse. Un produit terminé, abandonné ou mis en
 * pause n'est pas appliqué : le faire entrer dans l'analyse produirait un
 * avertissement pour une situation qui n'existe pas.
 */
const APPLIED_STATUSES = ['in_use', 'owned'];

export function isApplied(item: ShelfItem): boolean {
  return APPLIED_STATUSES.includes(item.status);
}

export function labelForCarrier(item: Pick<ShelfItem, 'id' | 'freeLabel' | 'productId' | 'routineStep'>, displayNames?: Record<string, string>): string {
  if (item.productId && displayNames?.[item.productId]) return displayNames[item.productId];
  if (item.freeLabel) return item.freeLabel;
  if (item.productId) return item.productId;
  return 'produit sans nom';
}

/**
 * Le conseil associé à une sévérité. On distingue le conflit entre deux
 * produits — que la personne peut séparer dans le temps — du conflit interne à
 * une formule, qu'elle ne peut pas séparer et où le fabricant a déjà fait un
 * choix de formulation.
 */
export function conflictAdvice(severity: IncompatibilitySeverity, withinSameProduct: boolean): string {
  if (withinSameProduct) {
    return "Ce produit associe deux actifs qu’on sépare d’habitude. Ce n’est pas interdit : une formule peut être stabilisée pour ça. Surveillez simplement la tolérance (rougeurs, picotements, desquamation).";
  }
  switch (severity) {
    case 'avoid':
      return "N’utilisez pas les deux le même jour. Alternez : l’un un soir, l’autre deux soirs plus tard, jamais superposés.";
    case 'space_out':
      return "Séparez-les dans la journée : l’un le matin, l’autre le soir.";
    case 'caution':
      return "L’association reste possible. Introduisez-les l’un après l’autre, à quelques jours d’intervalle, en surveillant rougeurs et picotements.";
    default:
      return "Espacez les applications et surveillez la tolérance.";
  }
}

/**
 * Un article d'étagère, vu comme porteur d'actifs. Exposé : l'analyse, les
 * routes et les bancs de test doivent construire ce porteur de la même façon,
 * sinon ils ne voient pas les mêmes ingrédients.
 */
export function shelfItemCarrier(item: ShelfItem, displayNames?: Record<string, string>): ActifCarrier {
  return {
    id: item.id,
    label: labelForCarrier(item, displayNames),
    ingredientIds: item.ingredientIds || [],
    routineStep: item.routineStep
  };
}

/**
 * Conflits entre deux porteurs d'actifs.
 *
 * Un conflit n'est retenu que s'il est réellement à cheval sur les deux
 * produits : passer l'union des ingrédients à `findConflicts` rapporterait
 * aussi les conflits internes à un seul des deux, qui seraient alors attribués
 * à tort à l'association — et comptés deux fois.
 */
export function conflictsBetween(a: ActifCarrier, b: ActifCarrier, rules: Iterable<IncompatibilityRule>): ShelfConflict[] {
  const idsA = new Set(a.ingredientIds.filter(Boolean));
  const idsB = new Set(b.ingredientIds.filter(Boolean));
  if (!idsA.size || !idsB.size) return [];

  const union = Array.from(new Set([...idsA, ...idsB]));
  const refA: ConflictProductRef = { itemId: a.id, label: a.label, routineStep: a.routineStep };
  const refB: ConflictProductRef = { itemId: b.id, label: b.label, routineStep: b.routineStep };
  const same = a.id === b.id;

  const out: ShelfConflict[] = [];
  for (const finding of findConflicts(union, rules) as ConflictFinding[]) {
    const hasA = idsA.has(finding.ingredientA) || idsA.has(finding.ingredientB);
    const hasB = idsB.has(finding.ingredientA) || idsB.has(finding.ingredientB);
    if (same) {
      // Conflit interne : les deux actifs sont dans la même formule.
      if (!(idsA.has(finding.ingredientA) && idsA.has(finding.ingredientB))) continue;
    } else if (!(hasA && hasB)) {
      continue;
    }
    out.push({
      ...finding,
      products: [refA, refB],
      withinSameProduct: same,
      advice: conflictAdvice(finding.severity, same)
    });
  }
  return out;
}

/**
 * Analyse l'étagère : les produits que la personne applique, deux à deux, plus
 * les conflits internes à chaque formule.
 */
export function analyseShelfConflicts(
  items: Iterable<ShelfItem>,
  rules: Iterable<IncompatibilityRule>,
  options: { displayNames?: Record<string, string> } = {}
): ShelfConflictAnalysis {
  const all = Array.from(items);
  const applied = all.filter(isApplied);

  const carriers: ActifCarrier[] = applied.map(item => shelfItemCarrier(item, options.displayNames));

  const analysable = carriers.filter(carrier => carrier.ingredientIds.length > 0);
  const unanalysed = carriers
    .filter(carrier => carrier.ingredientIds.length === 0)
    .map(carrier => ({ itemId: carrier.id, label: carrier.label, routineStep: carrier.routineStep }));
  const partiallyAnalysed = all
    .filter(item => isApplied(item) && item.ingredientIds.length > 0 && item.inciUnresolvedCount > 0)
    .map(item => ({ itemId: item.id, label: labelForCarrier(item, options.displayNames), routineStep: item.routineStep }));

  const conflicts: ShelfConflict[] = [];

  // Conflits internes à une formule.
  for (const carrier of analysable) {
    conflicts.push(...conflictsBetween(carrier, carrier, rules));
  }
  // Conflits entre deux produits différents.
  for (let i = 0; i < analysable.length; i += 1) {
    for (let j = i + 1; j < analysable.length; j += 1) {
      conflicts.push(...conflictsBetween(analysable[i], analysable[j], rules));
    }
  }

  conflicts.sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    || rankEvidence(b.evidenceLevel) - rankEvidence(a.evidenceLevel)
    || a.products[0].label.localeCompare(b.products[0].label, 'fr')
  );

  return {
    conflicts,
    unanalysed,
    partiallyAnalysed,
    analysedCount: analysable.length,
    message: summaryMessage(conflicts, analysable.length, unanalysed.length + partiallyAnalysed.length)
  };
}

function rankEvidence(level: EvidenceLevel): number {
  const order: Record<EvidenceLevel, number> = { A: 5, B: 4, C: 3, D: 2, not_established: 0 };
  return order[level] ?? 0;
}

/**
 * La synthèse ne jamais se contenter de « rien à signaler » quand une partie
 * de l'étagère n'a pas pu être évaluée : une absence de conflit sur trois
 * produits analysés sur huit n'est pas une étagère saine.
 */
function summaryMessage(conflicts: ShelfConflict[], analysed: number, unanalysed: number): string {
  if (analysed === 0) {
    return unanalysed > 0
      ? `Aucun produit de votre étagère n’a de composition rattachée : les conflits d'actifs ne peuvent pas être évalués (${unanalysed} produit(s) concerné(s)).`
      : "Votre étagère est vide : aucun conflit à évaluer.";
  }
  const head = conflicts.length === 0
    ? `Aucun conflit détecté entre les ${analysed} produit(s) dont la composition est connue.`
    : `${conflicts.length} conflit(s) d'actifs détecté(s) entre les produits que vous appliquez.`;
  const tail = unanalysed > 0
    ? ` ${unanalysed} produit(s) — composition non rattachée ou incomplète — n’ont pas pu être évalués ni déclarés sans risque.`
    : '';
  return head + tail;
}
