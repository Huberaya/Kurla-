import { DEFAULT_K_ANONYMITY_THRESHOLD, evaluateCohort } from './archetype';
import {
  BREAKAGE_OPTIONS,
  DRYNESS_OPTIONS,
  SCALP_CONCERN_OPTIONS,
  SKIN_ZONE_OPTIONS,
  UNKNOWN,
  type BeautyProfile
} from './beautyProfile';

/**
 * CHANTIER 8.6a — TEXTURE GAP REPORT (B2B).
 *
 * La question à laquelle ce rapport répond : **où sont les angles morts des
 * marques ?** Autrement dit, pour quels couples (archétype × préoccupation) des
 * membres déclarent un besoin que le catalogue publié ne couvre pas.
 *
 * ---------------------------------------------------------------------------
 * CE QUI EST NON NÉGOCIABLE
 * ---------------------------------------------------------------------------
 * 1. **Agrégats uniquement.** Aucune donnée individuelle n'entre ici ni n'en
 *    sort. Le rapport se construit à partir de comptes déjà agrégés.
 * 2. **k-anonymité appliquée, pas promise.** Une cellule dont la cohorte est
 *    sous le seuil n'est **pas présente** dans le rapport : elle est comptée
 *    dans `totals.suppressed`, sans son contenu. Un client B2B ne reçoit jamais
 *    une cellule sous k — et le rapport dit qu'un angle mort peut donc exister
 *    sans apparaître.
 * 3. **Un trou de donnée n'est pas un angle mort.** Si le graphe
 *    ingrédient × archétype ne permet pas de savoir quels produits répondent à
 *    un besoin, le verdict est `donnees_insuffisantes`. Affirmer un angle mort
 *    qu'on ne peut pas mesurer serait vendre une conclusion.
 * 4. **Un angle mort est une absence de produit publié**, pas une preuve
 *    d'inefficacité, ni un jugement sur une marque.
 */

export interface TextureGapDemand {
  archetypeId: string;
  /** Préoccupation ou besoin normalisé (vocabulaire contrôlé côté base). */
  concern: string;
  /** Membres l'ayant déclarée. Un agrégat : jamais une liste de personnes. */
  memberCount: number;
}

export interface TextureGapSupply {
  archetypeId: string;
  concern: string;
  /** Produits censés répondre à ce besoin pour cet archétype. */
  productCount: number;
  /** Parmi eux, ceux réellement publiés et actifs. */
  publishedProductCount: number;
}

export interface TextureGapInput {
  demand: TextureGapDemand[];
  supply: TextureGapSupply[];
  /** Libellés lisibles des archétypes. */
  labels?: Record<string, string>;
  /**
   * Le graphe ingrédient × archétype couvre-t-il tout le catalogue ? Sans cela,
   * l'absence de produit ne distingue pas « rien n'existe » de « on ne sait
   * pas » : le verdict bascule sur `donnees_insuffisantes`.
   */
  supplyGraphComplete?: boolean;
  generatedAt?: string;
  kThreshold?: number;
}

export type TextureGapVerdict =
  | 'couvert'
  | 'partiel'
  | 'angle_mort'
  | 'donnees_insuffisantes';

export interface TextureGapCell {
  archetypeId: string;
  archetypeLabel: string;
  concern: string;
  memberCount: number;
  kThreshold: number;
  productCount: number;
  publishedProductCount: number;
  /** `null` quand le dénominateur est inconnu : aucun ratio inventé. */
  coverage: number | null;
  verdict: TextureGapVerdict;
  explanation: string;
}

export interface TextureGapReport {
  generatedAt: string;
  kThreshold: number;
  supplyGraphComplete: boolean;
  /** Cellules publiables uniquement. Les cellules sous k sont absentes. */
  cells: TextureGapCell[];
  /** Angles morts, du plus peuplé au moins peuplé. */
  blindSpots: TextureGapCell[];
  totals: {
    demandRows: number;
    publishedCells: number;
    suppressedCells: number;
    /** Membres dont la déclaration tombe dans une cellule supprimée. */
    suppressedMembers: number;
    blindSpots: number;
    partial: number;
    covered: number;
    insufficient: number;
    /** Membres couverts par au moins une cellule publiée. */
    membersInPublishedCells: number;
  };
  caveats: string[];
}

export const TEXTURE_GAP_CAVEATS: string[] = [
  'Ces chiffres agrègent des déclarations de membres. Ce ne sont ni des mesures, ni des diagnostics.',
  'Aucune cellule dont la cohorte est sous le seuil de k-anonymité n’est publiée : un angle mort peut donc exister sans apparaître dans ce rapport.',
  'Un angle mort signale l’absence de produit publié pour un besoin déclaré. Ce n’est ni une preuve d’inefficacité, ni un jugement sur une marque.',
  'Un verdict « données insuffisantes » signifie que la couverture du catalogue pour ce besoin n’est pas connue — il ne conclut rien.',
  'Ce rapport ne contient aucune donnée individuelle et ne peut pas être croisé pour réidentifier une personne.'
];

function supplyKey(archetypeId: string, concern: string): string {
  return `${archetypeId}::${concern}`;
}

/**
 * Construit le rapport. Fonction pure : aucune lecture de base, aucun réseau.
 */
export function buildTextureGapReport(input: TextureGapInput): TextureGapReport {
  const kThreshold = input.kThreshold ?? DEFAULT_K_ANONYMITY_THRESHOLD;
  const supplyGraphComplete = input.supplyGraphComplete === true;
  const labels = input.labels ?? {};
  const supplyByKey = new Map<string, TextureGapSupply>();
  for (const row of input.supply) supplyByKey.set(supplyKey(row.archetypeId, row.concern), row);

  const cells: TextureGapCell[] = [];
  let suppressedCells = 0;
  let suppressedMembers = 0;

  for (const row of input.demand) {
    const cohort = evaluateCohort(row.archetypeId, labels[row.archetypeId] ?? row.archetypeId, row.memberCount, kThreshold);

    if (!cohort.publishable) {
      // La cellule disparaît du rapport : on ne publie ni son contenu, ni son
      // libellé, ni même le fait qu'un couple précis existe.
      suppressedCells += 1;
      suppressedMembers += Math.max(0, row.memberCount);
      continue;
    }

    const supply = supplyByKey.get(supplyKey(row.archetypeId, row.concern));
    const productCount = supply?.productCount ?? 0;
    const publishedProductCount = supply?.publishedProductCount ?? 0;

    let verdict: TextureGapVerdict;
    let explanation: string;
    let coverage: number | null = null;

    if (!supply && !supplyGraphComplete) {
      verdict = 'donnees_insuffisantes';
      explanation =
        'Aucun produit n’est associé à ce besoin dans le graphe ingrédient × archétype, et ce graphe ne couvre pas tout le catalogue : la couverture réelle est inconnue.';
    } else if (productCount <= 0) {
      verdict = 'angle_mort';
      explanation = `Besoin déclaré par ${row.memberCount} membres, aucun produit du catalogue n’y est associé.`;
      coverage = 0;
    } else {
      coverage = Number((publishedProductCount / productCount).toFixed(4));
      if (publishedProductCount <= 0) {
        verdict = 'angle_mort';
        explanation = `${productCount} produit${productCount > 1 ? 's' : ''} associé${productCount > 1 ? 's' : ''} à ce besoin, aucun publié : le besoin est déclaré, l’offre n’est pas disponible.`;
      } else if (publishedProductCount < productCount) {
        verdict = 'partiel';
        explanation = `${publishedProductCount} produit publié sur ${productCount} associé${productCount > 1 ? 's' : ''} à ce besoin.`;
      } else {
        verdict = 'couvert';
        explanation = `Les ${publishedProductCount} produit${publishedProductCount > 1 ? 's' : ''} associé${publishedProductCount > 1 ? 's' : ''} à ce besoin sont publiés.`;
      }
    }

    cells.push({
      archetypeId: row.archetypeId,
      archetypeLabel: cohort.labelFr,
      concern: row.concern,
      memberCount: row.memberCount,
      kThreshold,
      productCount,
      publishedProductCount,
      coverage,
      verdict,
      explanation
    });
  }

  // Du plus peuplé au moins peuplé : un angle mort qui touche 400 membres passe
  // avant un angle mort qui en touche 30.
  const sorted = [...cells].sort((a, b) => b.memberCount - a.memberCount);
  const blindSpots = sorted.filter(cell => cell.verdict === 'angle_mort');

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    kThreshold,
    supplyGraphComplete,
    cells: sorted,
    blindSpots,
    totals: {
      demandRows: input.demand.length,
      publishedCells: sorted.length,
      suppressedCells,
      suppressedMembers,
      blindSpots: blindSpots.length,
      partial: sorted.filter(cell => cell.verdict === 'partiel').length,
      covered: sorted.filter(cell => cell.verdict === 'couvert').length,
      insufficient: sorted.filter(cell => cell.verdict === 'donnees_insuffisantes').length,
      membersInPublishedCells: sorted.reduce((total, cell) => total + cell.memberCount, 0)
    },
    caveats: [...TEXTURE_GAP_CAVEATS]
  };
}


// ---------------------------------------------------------------------------
// Extraction des préoccupations déclarées
// ---------------------------------------------------------------------------

/** Valeurs qui n'expriment aucune préoccupation : elles ne comptent pas. */
const NOT_A_CONCERN = new Set<string>([UNKNOWN, 'aucun', 'aucune', '']);

function labelOf(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find(option => option.value === value)?.label ?? value;
}

/**
 * Transforme un profil en liste de préoccupations déclarées.
 *
 * Seuls des champs au vocabulaire connu sont lus, et une valeur qui dit « rien »
 * ou « je ne sais pas » ne devient pas une préoccupation : compter un « je ne
 * sais pas » comme un besoin créerait de la demande fictive.
 */
export function concernsFromProfile(profile: BeautyProfile | undefined): string[] {
  if (!profile) return [];
  const concerns = new Set<string>();

  for (const value of profile.hair?.scalpConcerns ?? []) {
    if (NOT_A_CONCERN.has(String(value))) continue;
    concerns.add(`Cuir chevelu : ${labelOf(SCALP_CONCERN_OPTIONS, String(value))}`);
  }
  for (const value of profile.skin?.concernZones ?? []) {
    if (NOT_A_CONCERN.has(String(value))) continue;
    concerns.add(`Peau : ${labelOf(SKIN_ZONE_OPTIONS, String(value))}`);
  }

  const breakage = profile.hair?.breakage;
  if (breakage === 'occasionnelle' || breakage === 'frequente') {
    concerns.add(`Fibre : ${labelOf(BREAKAGE_OPTIONS, breakage)}`);
  }
  const dryness = profile.hair?.dryness;
  if (dryness === 'moyenne' || dryness === 'forte') {
    concerns.add(`Fibre : ${labelOf(DRYNESS_OPTIONS, dryness)}`);
  }

  return [...concerns];
}

// ---------------------------------------------------------------------------
// Agrégation : des lignes brutes au rapport
// ---------------------------------------------------------------------------

export interface TextureGapMemberRow {
  userId: string;
  archetypeId: string | null;
  archetypeLabel?: string;
  concerns: string[];
}

export interface TextureGapProductRow {
  id: string;
  concerns: string[];
  published: boolean;
  /** Archétypes auxquels le produit est rattaché (graphe ingrédient × archétype). */
  archetypeIds: string[];
}

export interface TextureGapAggregateInput {
  members: TextureGapMemberRow[];
  products: TextureGapProductRow[];
  /**
   * Chaque produit publié est-il rattaché à ses archétypes ? Tant que le graphe
   * ingrédient × archétype ne couvre pas le catalogue, la réponse est non — et
   * le rapport rend `donnees_insuffisantes` plutôt que des angles morts.
   */
  archetypeMappingComplete?: boolean;
  kThreshold?: number;
  generatedAt?: string;
}

/**
 * Agrège des lignes individuelles en rapport k-anonyme. Fonction pure : c'est
 * ici que les personnes disparaissent au profit des comptes.
 */
export function aggregateTextureGap(input: TextureGapAggregateInput): TextureGapReport {
  const labels: Record<string, string> = {};
  const demand = new Map<string, number>();

  for (const member of input.members) {
    if (!member.archetypeId) continue;
    if (member.archetypeLabel) labels[member.archetypeId] = member.archetypeLabel;
    for (const concern of member.concerns) {
      const key = `${member.archetypeId}::${concern}`;
      demand.set(key, (demand.get(key) ?? 0) + 1);
    }
  }

  // Un produit ne compte qu'une fois par cellule, même s'il est rattaché
  // plusieurs fois au même archétype.
  const supply = new Map<string, { productCount: number; publishedProductCount: number }>();
  for (const product of input.products) {
    const seen = new Set<string>();
    for (const archetypeId of product.archetypeIds) {
      for (const concern of product.concerns) {
        const key = `${archetypeId}::${concern}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const cell = supply.get(key) ?? { productCount: 0, publishedProductCount: 0 };
        cell.productCount += 1;
        if (product.published) cell.publishedProductCount += 1;
        supply.set(key, cell);
      }
    }
  }

  return buildTextureGapReport({
    demand: [...demand.entries()].map(([key, memberCount]) => {
      const separator = key.indexOf('::');
      return { archetypeId: key.slice(0, separator), concern: key.slice(separator + 2), memberCount };
    }),
    supply: [...supply.entries()].map(([key, counts]) => {
      const separator = key.indexOf('::');
      return {
        archetypeId: key.slice(0, separator),
        concern: key.slice(separator + 2),
        productCount: counts.productCount,
        publishedProductCount: counts.publishedProductCount
      };
    }),
    labels,
    supplyGraphComplete: input.archetypeMappingComplete === true,
    kThreshold: input.kThreshold,
    generatedAt: input.generatedAt
  });
}
