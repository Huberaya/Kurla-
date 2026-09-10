/**
 * DOSE D'USAGE ET COÛT RÉEL — G-03 / D-04
 * =======================================
 *
 * Le prix en rayon n'est pas un coût : un shampoing à 9 € qui dure trois
 * semaines coûte plus cher à l'année qu'un flacon à 24 € qui dure six mois.
 * Aucune fiche ne le dit, parce que le rendement n'est presque jamais déclaré
 * — mesuré sur le catalogue : 0 produit sur 79.
 *
 * Plutôt que d'attendre une donnée fournisseur qui n'existe pas, ce module
 * calcule une estimation à partir de deux grandeurs documentées :
 *
 *   1. la contenance, lue sur la fiche ;
 *   2. la dose appliquée à chaque utilisation, prise dans les valeurs
 *      quotidiennes de référence du SCCS (Notes of Guidance, 12e révision).
 *
 * Deux disciplines, qui font que ce n'est pas une invention :
 *
 *   · une catégorie non couverte par la table ne reçoit AUCUNE estimation.
 *     Un masque cheveux ou un nettoyant visage n'y figure pas : on renvoie
 *     `null` avec la raison, au lieu de choisir un chiffre qui arrange ;
 *   · la fréquence d'usage est un choix d'affichage, jamais un fait produit.
 *     Elle est portée par l'estimation, affichée, et modifiable.
 *
 * Aucune valeur n'est écrite en base : le champ `estimated_yield` reste
 * réservé à une déclaration du fournisseur, qui prime dès qu'elle existe.
 */

/** Référence de dose pour une catégorie de produit. */
export interface DosageReference {
  /** Quantité appliquée à chaque utilisation, en grammes (1 ml ≈ 1 g). */
  dosePerUse: number;
  /** Fréquence d'usage proposée, en fois par semaine. Ce n'est pas un fait. */
  usesPerWeek: number;
  /** D'où vient la dose. */
  source: string;
  /** Ce que la valeur couvre exactement, et ce qu'elle ne couvre pas. */
  note: string;
}

const SCCS_TABLE3 =
  'SCCS/1647/22 — Notes of Guidance for the Testing of Cosmetic Ingredients, 12e révision, tableau 3 (quantités appliquées par jour)';
const SPF_DENSITE =
  'Densité d’application solaire de référence : 2 mg/cm² (norme COLIPA / FDA), visage et cou ≈ 600 cm²';

const NON_COUVERT = 'Catégorie non couverte par les valeurs de référence : aucune estimation.';

/**
 * Clé : `catégorie/sous-catégorie`, en minuscules et sans accent.
 *
 * Les valeurs quotidiennes du SCCS sont des quantités appliquées par jour pour
 * un produit à usage quotidien : elles valent donc dose par utilisation.
 */
export const DOSE_PAR_CATEGORIE: Record<string, DosageReference> = {
  // ── Cheveux ───────────────────────────────────────────────────────────────
  'cheveux/lavage': {
    dosePerUse: 10.46,
    usesPerWeek: 2,
    source: SCCS_TABLE3,
    note: 'Shampoing, produit rincé — 10 460 mg/jour. Deux lavages par semaine pour cheveux texturés.',
  },
  'cheveux/demelage': {
    dosePerUse: 14,
    usesPerWeek: 2,
    source: SCCS_TABLE3,
    note: 'Après-shampoing, produit rincé — 14 000 mg/jour.',
  },
  'cheveux/hydratation': {
    dosePerUse: 3.92,
    usesPerWeek: 3,
    source: SCCS_TABLE3,
    note: 'Soin sans rinçage (leave-in) — valeur « hair styling », 3 920 mg/jour.',
  },
  'cheveux/nutrition': {
    dosePerUse: 3.92,
    usesPerWeek: 3,
    source: SCCS_TABLE3,
    note: 'Huile ou beurre capillaire, sans rinçage — valeur « hair styling », 3 920 mg/jour.',
  },
  'cheveux/coiffant': {
    dosePerUse: 3.92,
    usesPerWeek: 3,
    source: SCCS_TABLE3,
    note: 'Gel, mousse ou crème coiffante, sans rinçage — valeur « hair styling », 3 920 mg/jour.',
  },
  // ── Peau ──────────────────────────────────────────────────────────────────
  'peau/hydratation': {
    dosePerUse: 0.8,
    usesPerWeek: 7,
    source: SCCS_TABLE3,
    note: 'Soin visage sans rinçage — 800 mg/jour.',
  },
  'peau/traitement': {
    dosePerUse: 0.8,
    usesPerWeek: 7,
    source: SCCS_TABLE3,
    note: 'Sérum visage, sans rinçage — valeur « face cream », 800 mg/jour.',
  },
  'peau/eclat & uniformite': {
    dosePerUse: 0.8,
    usesPerWeek: 7,
    source: SCCS_TABLE3,
    note: 'Sérum visage, sans rinçage — valeur « face cream », 800 mg/jour.',
  },
  'peau/protection solaire': {
    dosePerUse: 1.2,
    usesPerWeek: 7,
    source: SPF_DENSITE,
    note:
      'La valeur SCCS (18 000 mg/jour) vaut pour une application sur tout le corps : elle viderait '
      + 'un tube de 40 ml en deux utilisations. Retenue ici : 2 mg/cm² sur visage et cou.',
  },
  'peau/exfoliation': {
    dosePerUse: 0.8,
    usesPerWeek: 1,
    source: SCCS_TABLE3,
    note:
      'Exfoliant visage : la table SCCS ne couvre pas cette catégorie. Valeur retenue par proximité '
      + '« face cream » (800 mg), fréquence d’une fois par semaine.',
  },
};

/** Catégories volontairement sans estimation, avec la raison. */
export const CATEGORIES_SANS_DOSE: Record<string, string> = {
  'cheveux/soin profond': NON_COUVERT + ' La table couvre l’après-shampoing, pas le masque.',
  'peau/masques': NON_COUVERT + ' La table ne couvre pas les masques visage.',
  'peau/nettoyage':
    NON_COUVERT
    + ' La valeur « makeup remover » (5 000 mg) correspond à un démaquillant, pas à un nettoyant aqueux.',
};

/**
 * Une dose de catégorie appliquée sans discernement produit des chiffres
 * absurdes, toujours dans le même sens : elle sous-estime la durée du
 * contenant. Deux cas mesurés sur le catalogue, corrigés ici.
 */
const DOSE_LEVRES: DosageReference = {
  dosePerUse: 0.057,
  usesPerWeek: 14,
  source: SCCS_TABLE3,
  note:
    'Baume ou rouge à lèvres — valeur « lipstick », 57 mg/jour. La dose d’un soin visage (800 mg) '
    + 'viderait un stick de 10 ml en treize utilisations.',
};

/** Produits dont la dose de leur sous-catégorie ne s'applique pas. */
const EXCLUSIONS_PAR_NOM: Array<{ motif: RegExp; raison: string }> = [
  {
    motif: /soin local|localis[ée]e?s?|application cibl[ée]e/i,
    raison:
      NON_COUVERT + ' Une application ciblée ne correspond à aucune dose de la table, qui raisonne '
      + 'en application sur l’ensemble du visage.',
  },
];

export interface UsageEstimate {
  /** Nombre d'utilisations estimé pour le contenant. */
  uses: number | null;
  /** Coût d'une utilisation, en euros. */
  costPerUse: number | null;
  /** Durée d'usage estimée, en mois, à la fréquence retenue. */
  monthsOfUse: number | null;
  /** Coût mensuel estimé, en euros. */
  monthlyCost: number | null;
  dosePerUse: number | null;
  usesPerWeek: number | null;
  /** Phrase affichable : ce qu'on a supposé pour arriver au chiffre. */
  assumption: string;
  source?: string;
  /** Pourquoi aucune estimation n'est possible. */
  limitation?: string;
}

import { parseYieldMonths } from './recommendationEngine';

const normaliser = (v: unknown): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Contenance lisible sur la fiche : champ dédié d'abord, nom du produit ensuite. */
export function parsePackSize(product: any): { value: number; unit: 'ml' | 'g' } | null {
  const sources = [product?.sizeLabel, product?.size_label, product?.name, product?.title];
  for (const brut of sources) {
    const texte = String(brut ?? '');
    const m = texte.match(/(\d+(?:[.,]\d+)?)\s?(ml|g|oz)\b/i);
    if (!m) continue;
    let valeur = Number(m[1].replace(',', '.'));
    const unite = m[2].toLowerCase();
    if (unite === 'oz') valeur = valeur * 29.5735;
    if (Number.isFinite(valeur) && valeur > 0) {
      return { value: valeur, unit: unite === 'g' ? 'g' : 'ml' };
    }
  }
  return null;
}

/**
 * Estime le nombre d'utilisations, le coût par utilisation et le coût
 * mensuel. Renvoie `null` sur les montants dès que la catégorie n'est pas
 * couverte par une valeur de référence.
 */
export function estimerUsage(
  product: any,
  options: { usesPerWeek?: number } = {},
): UsageEstimate {
  const cle = `${normaliser(product?.category)}/${normaliser(product?.subcategory ?? product?.subCategory)}`;
  const contenance = parsePackSize(product);
  const prix = Number(product?.price);

  if (!contenance) {
    return {
      uses: null, costPerUse: null, monthsOfUse: null, monthlyCost: null,
      dosePerUse: null, usesPerWeek: null,
      assumption: '',
      limitation: 'Contenance absente de la fiche : le nombre d’utilisations ne peut pas être estimé.',
    };
  }
  if (!Number.isFinite(prix) || prix <= 0) {
    return {
      uses: null, costPerUse: null, monthsOfUse: null, monthlyCost: null,
      dosePerUse: null, usesPerWeek: null,
      assumption: '',
      limitation: 'Prix absent : le coût par utilisation ne peut pas être estimé.',
    };
  }

  // Un nom peut disqualifier la dose de sa sous-catégorie avant même qu'on
  // la cherche : c'est le cas d'un soin localisé, jamais appliqué sur
  // l'ensemble du visage.
  const nom = String(product?.name ?? '');
  const exclusion = EXCLUSIONS_PAR_NOM.find(e => e.motif.test(nom));
  if (exclusion) {
    return {
      uses: null, costPerUse: null, monthsOfUse: null, monthlyCost: null,
      dosePerUse: null, usesPerWeek: null,
      assumption: '',
      limitation: exclusion.raison,
    };
  }

  // Les lèvres ont leur propre valeur : la dose d'un soin visage y est
  // quatorze fois trop forte.
  // Un rendement déclaré par le fournisseur prime toujours sur le modèle :
  // une mesure vaut mieux qu'une valeur de référence appliquée à une catégorie.
  const rendementDeclare = parseYieldMonths(product?.estimatedYield ?? product?.estimated_yield);
  if (rendementDeclare !== null) {
    const arrondiDeclare = (n: number): number => Math.round(n * 100) / 100;
    return {
      uses: null,
      costPerUse: null,
      monthsOfUse: rendementDeclare,
      monthlyCost: arrondiDeclare(prix / rendementDeclare),
      dosePerUse: null,
      usesPerWeek: null,
      source: 'Rendement déclaré par le fournisseur',
      assumption:
        `Rendement déclaré : ${rendementDeclare} mois pour ${Math.round(contenance.value)} ${contenance.unit}. `
        + 'Déclaration de la source, pas une estimation KURLA.',
    };
  }

  const ref = /l[èe]vre|lip\b/i.test(nom) ? DOSE_LEVRES : DOSE_PAR_CATEGORIE[cle];
  if (!ref) {
    return {
      uses: null, costPerUse: null, monthsOfUse: null, monthlyCost: null,
      dosePerUse: null, usesPerWeek: null,
      assumption: '',
      limitation: CATEGORIES_SANS_DOSE[cle] || NON_COUVERT,
    };
  }

  const uses = contenance.value / ref.dosePerUse;
  const usesParSemaine = options.usesPerWeek && options.usesPerWeek > 0 ? options.usesPerWeek : ref.usesPerWeek;
  const semaines = uses / usesParSemaine;
  const months = semaines / 4.345;

  const arrondi = (n: number): number => Math.round(n * 100) / 100;
  return {
    uses: Math.round(uses),
    costPerUse: arrondi(prix / uses),
    monthsOfUse: arrondi(months),
    monthlyCost: arrondi((prix / uses) * usesParSemaine * 4.345),
    dosePerUse: ref.dosePerUse,
    usesPerWeek: usesParSemaine,
    source: ref.source,
    assumption:
      `Estimation : ${ref.dosePerUse} g par utilisation sur ${Math.round(contenance.value)} ${contenance.unit}`
      + ` — soit environ ${Math.round(uses)} utilisations, à raison de ${usesParSemaine} par semaine.`,
  };
}
