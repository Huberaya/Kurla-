/**
 * KURLA INTELLIGENCE — Graphe d'ingrédients.
 *
 * Avant cette couche, `products.ingredients` était un `TEXT[]` libre : on ne
 * pouvait ni agréger, ni raisonner, ni détecter d'incompatibilité. Ce module
 * définit l'entité ingrédient et les raisonnements qui en découlent.
 *
 * Principe : KURLA ne devine pas. Un fait absent reste `null`, et une absence
 * n'est jamais présentée comme une preuve d'innocuité.
 */

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'not_established';

export type EvidenceSourceKind =
  | 'regulatory'
  | 'peer_reviewed'
  | 'consensus'
  | 'expert'
  | 'commercial'
  | 'not_provided';

export type IncompatibilitySeverity = 'avoid' | 'caution' | 'space_out';

export type JurisdictionStatus = 'allowed' | 'restricted' | 'prohibited' | 'unknown';

export const EVIDENCE_LEVELS: EvidenceLevel[] = ['A', 'B', 'C', 'D', 'not_established'];

/** Ordre de confiance : A est le plus fort, `not_established` ne prouve rien. */
export const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  not_established: 0
};

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  A: 'Preuve forte (recommandation officielle, essai clinique validé, texte réglementaire)',
  B: 'Preuve modérée (études observationnelles solides, consensus de praticiens spécialisés)',
  C: 'Preuve limitée (faible échantillon, mécanisme plausible, avis d’expert)',
  D: 'Non établi (tendance, affirmation commerciale sans étude)',
  not_established: 'Aucune donnée disponible'
};

export interface IngredientEvidence {
  id: string;
  ingredientId: string;
  claim: string;
  evidenceLevel: EvidenceLevel;
  /**
   * Champ critique : une efficacité démontrée sur peau claire ou cheveu lisse
   * ne vaut pas pour une peau riche en mélanine ou un cheveu 4C. Une preuve
   * sans population étudiée est explicitement marquée comme non transposable.
   */
  populationsStudied: string[];
  textureScope: string[];
  toneScope: string[];
  climateScope: string[];
  sourceKind: EvidenceSourceKind;
  sourceReference?: string;
  sourceUrl?: string;
  reviewedBy?: string;
}

export interface Ingredient {
  id: string;
  inciName: string;
  inciNameNormalized: string;
  commonNames: string[];
  functions: string[];
  family?: string;
  origin?: string;
  isFragrance?: boolean;
  isAllergenRegulated: boolean;
  comedogenicityIndex?: number | null;
  maxConcentrationEuPercent?: number | null;
  description?: string;
  verificationStatus: 'verified' | 'pending' | 'not_provided';
}

export interface ProductIngredientLink {
  productId: string;
  ingredientId: string;
  inciRank?: number | null;
  declaredRole?: string;
  declaredConcentrationPercent?: number | null;
  isKeyIngredient: boolean;
  source: 'declared' | 'inci_label' | 'brand_confirmed' | 'lab_analysed';
}

export interface IncompatibilityRule {
  ingredientA: string;
  ingredientB: string;
  severity: IncompatibilitySeverity;
  explanation: string;
  evidenceLevel: EvidenceLevel;
}

export interface JurisdictionRestriction {
  ingredientId: string;
  jurisdiction: string;
  status: JurisdictionStatus;
  limitPercent?: number | null;
  reference?: string;
}

/**
 * Normalisation INCI. Les listes déclarées arrivent avec des casse, accents et
 * espaces variables ; sans normalisation, « Shea Butter » et « butyrospermum
 * parkii » sont deux ingrédients différents et toute agrégation est fausse.
 */
export function normalizeInciName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(var\.|subsp\.|spp\.)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function isKnownInciName(value: unknown): boolean {
  return normalizeInciName(value).length >= 3;
}

/**
 * Résolution d'une mention déclarée vers une entité ingrédient.
 * Retourne `null` plutôt que de deviner : une correspondance approximative
 * fausse silently toutes les statistiques en aval.
 */
export function resolveIngredient(
  declared: unknown,
  catalog: Iterable<Ingredient>
): Ingredient | null {
  const needle = normalizeInciName(declared);
  if (needle.length < 3) return null;
  let best: Ingredient | null = null;
  for (const candidate of catalog) {
    if (candidate.inciNameNormalized === needle) return candidate;
    if (candidate.commonNames.some(name => normalizeInciName(name) === needle)) best = best || candidate;
  }
  return best;
}

export function sortByInciRank(links: Iterable<ProductIngredientLink>): ProductIngredientLink[] {
  return Array.from(links).sort((a, b) => {
    const rankA = a.inciRank === null || a.inciRank === undefined ? Number.MAX_SAFE_INTEGER : a.inciRank;
    const rankB = b.inciRank === null || b.inciRank === undefined ? Number.MAX_SAFE_INTEGER : b.inciRank;
    return rankA - rankB;
  });
}

/**
 * Position dans la liste INCI : plus le rang est élevé, plus la concentration
 * est faible. Les ingrédients sous 1 % peuvent apparaître dans n'importe quel
 * ordre, donc un rang élevé ne permet aucune conclusion ferme.
 */
export function inciPositionNote(link: ProductIngredientLink, totalIngredients: number): string {
  if (link.inciRank === null || link.inciRank === undefined) {
    return 'Position dans la liste INCI non renseignée : aucune conclusion de concentration n’est possible.';
  }
  if (totalIngredients <= 0) return 'Liste INCI incomplète : position non interprétable.';
  if (link.inciRank <= 5) return `En ${link.inciRank}ᵉ position sur ${totalIngredients} : concentration probablement élevée.`;
  if (link.inciRank > totalIngredients - 3) {
    return `En ${link.inciRank}ᵉ position sur ${totalIngredients} : concentration probablement faible, sous le seuil de 1 % où l’ordre n’est plus imposé.`;
  }
  return `En ${link.inciRank}ᵉ position sur ${totalIngredients} : concentration intermédiaire.`;
}

/**
 * Meilleure preuve disponible pour une allégation, en tenant compte du champ
 * d'application. Une preuve obtenue hors du périmètre de l'utilisateur est
 * rétrogradée, jamais présentée comme équivalente.
 */
export function bestEvidenceFor(
  evidences: Iterable<IngredientEvidence>,
  context: { textureBand?: string; toneBand?: string; climate?: string } = {}
): { evidence: IngredientEvidence | null; transposable: boolean; caveat?: string } {
  let best: IngredientEvidence | null = null;
  let bestTransposable = false;
  for (const evidence of evidences) {
    const inTexture = !context.textureBand
      || evidence.textureScope.length === 0
      || evidence.textureScope.includes(context.textureBand);
    const inTone = !context.toneBand
      || evidence.toneScope.length === 0
      || evidence.toneScope.includes(context.toneBand);
    const inClimate = !context.climate
      || evidence.climateScope.length === 0
      || evidence.climateScope.includes(context.climate);
    const transposable = inTexture && inTone && inClimate;
    const rank = EVIDENCE_RANK[evidence.evidenceLevel] + (transposable ? 10 : 0);
    const bestRank = best === null ? -1 : EVIDENCE_RANK[best.evidenceLevel] + (bestTransposable ? 10 : 0);
    if (rank > bestRank) {
      best = evidence;
      bestTransposable = transposable;
    }
  }
  if (!best) return { evidence: null, transposable: false };
  if (best.evidenceLevel === 'not_established' || best.evidenceLevel === 'D') {
    return {
      evidence: best,
      transposable: bestTransposable,
      caveat: 'Aucune donnée solide : cette affirmation ne doit pas être présentée comme un bénéfice démontré.'
    };
  }
  if (!bestTransposable) {
    return {
      evidence: best,
      transposable: false,
      caveat: `Preuve obtenue hors de votre périmètre${best.populationsStudied.length ? ` (populations étudiées : ${best.populationsStudied.join(', ')})` : ''} : elle n’est pas transposable telle quelle.`
    };
  }
  if (best.populationsStudied.length === 0) {
    return {
      evidence: best,
      transposable: true,
      caveat: 'Population étudiée non précisée dans la source.'
    };
  }
  return { evidence: best, transposable: true };
}

export interface ConflictFinding {
  ingredientA: string;
  ingredientB: string;
  severity: IncompatibilitySeverity;
  explanation: string;
  evidenceLevel: EvidenceLevel;
}

/**
 * Détection de conflit dans une routine ou une formule. Sans ce contrôle,
 * KURLA peut recommander deux produits qui se neutralisent ou s'additionnent
 * en irritation.
 */
export function findConflicts(
  ingredientIds: Iterable<string>,
  rules: Iterable<IncompatibilityRule>
): ConflictFinding[] {
  const present = new Set(Array.from(ingredientIds).filter(Boolean));
  const findings: ConflictFinding[] = [];
  for (const rule of rules) {
    if (!present.has(rule.ingredientA) || !present.has(rule.ingredientB)) continue;
    findings.push({
      ingredientA: rule.ingredientA,
      ingredientB: rule.ingredientB,
      severity: rule.severity,
      explanation: rule.explanation,
      evidenceLevel: rule.evidenceLevel
    });
  }
  const order: Record<IncompatibilitySeverity, number> = { avoid: 0, space_out: 1, caution: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || EVIDENCE_RANK[b.evidenceLevel] - EVIDENCE_RANK[a.evidenceLevel]);
}

export interface JurisdictionFinding {
  ingredientId: string;
  status: JurisdictionStatus;
  limitPercent?: number | null;
  reference?: string;
  message: string;
}

/**
 * Filtrage réglementaire par juridiction. Une même formule peut être légale
 * dans l'UE et interdite ailleurs.
 */
export function checkJurisdiction(
  ingredientIds: Iterable<string>,
  restrictions: Iterable<JurisdictionRestriction>,
  jurisdiction: string
): JurisdictionFinding[] {
  const present = new Set(Array.from(ingredientIds).filter(Boolean));
  const findings: JurisdictionFinding[] = [];
  for (const restriction of restrictions) {
    if (restriction.jurisdiction.toUpperCase() !== jurisdiction.toUpperCase()) continue;
    if (!present.has(restriction.ingredientId)) continue;
    if (restriction.status === 'allowed') continue;
    findings.push({
      ingredientId: restriction.ingredientId,
      status: restriction.status,
      limitPercent: restriction.limitPercent ?? null,
      reference: restriction.reference,
      message: restriction.status === 'prohibited'
        ? 'Ingrédient interdit dans cette juridiction : le produit n’y est pas commercialisable en l’état.'
        : restriction.status === 'restricted'
          ? `Ingrédient réglementé dans cette juridiction${restriction.limitPercent !== null && restriction.limitPercent !== undefined ? ` (limite ${restriction.limitPercent} %)` : ''}.`
          : 'Statut réglementaire inconnu dans cette juridiction : aucune garantie de conformité.'
    });
  }
  const order: Record<JurisdictionStatus, number> = { prohibited: 0, restricted: 1, unknown: 2, allowed: 3 };
  return findings.sort((a, b) => order[a.status] - order[b.status]);
}

/**
 * Deux produits font-ils doublon dans une routine ? Un doublon n'est pas une
 * faute, mais l'utilisateur doit le savoir avant d'acheter.
 */
export function detectFunctionalDuplicates(
  productA: { id: string; ingredientIds: string[]; routineStep?: string },
  productB: { id: string; ingredientIds: string[]; routineStep?: string },
  minimumOverlapRatio = 0.5
): { duplicate: boolean; overlapRatio: number; shared: string[] } {
  if (productA.id === productB.id) return { duplicate: false, overlapRatio: 0, shared: [] };
  const setA = new Set(productA.ingredientIds);
  const setB = new Set(productB.ingredientIds);
  const shared = productA.ingredientIds.filter(id => setB.has(id));
  const union = new Set([...setA, ...setB]).size;
  const overlapRatio = union === 0 ? 0 : shared.length / union;
  return { duplicate: overlapRatio >= minimumOverlapRatio, overlapRatio, shared };
}
