/**
 * CHANTIER 14 — CONTRÔLE DES ALLÉGATIONS DES FICHES PRODUIT.
 *
 * Constat avant d'écrire : la publication exigeait `claims_validation_status =
 * 'verified'`, mais **aucun outil ne produisait cette vérification**. Il
 * existait un audit de vocabulaire (`checkProductVocabulary`) — qui contrôle la
 * conformité aux taxonomies, pas les allégations — et une liste de mots
 * interdits pour les rapports d'étude de marque (`FORBIDDEN_PROOF_WORDS`).
 * Rien ne lisait le texte des fiches. Le statut était donc soit laissé
 * `not_provided` (blocage éternel), soit coché à la main sans trace : les deux
 * sont pires qu'un contrôle automatique imparfait mais tracé.
 *
 * Ce que ce module est, et ce qu'il n'est pas :
 *
 *  - C'est un **crible déterministe** : mêmes textes, mêmes règles, même
 *    résultat, et chaque trouvaille nomme le champ, le terme et la règle.
 *  - Ce n'est **pas** une validation juridique. Un texte qui passe le crible
 *    n'est pas « conforme » : il ne contient pas les formulations les plus
 *    risquées. La note enregistrée dans l'historique de validation le dit.
 *  - Il ne **devine** rien : une tournure absente de la liste n'est pas
 *    validée, elle n'est simplement pas détectée.
 *
 * Cadre de référence des règles :
 *  - Règlement (CE) n° 1223/2009, art. 2 : un produit cosmétique est destiné à
 *    être mis en contact avec les parties superficielles du corps humain « en
 *    vue, exclusivement ou principalement, de les nettoyer, de les parfumer,
 *    d'en modifier l'aspect, de les protéger, de les maintenir en bon état ou
 *    de corriger les odeurs corporelles ». Une allégation de traitement ou de
 *    prévention d'une maladie en fait un médicament par fonction
 *    (directive 2001/83/CE).
 *  - Règlement (UE) n° 655/2013, critères communs aux allégations : conformité
 *    à la législation, véracité, éléments justificatifs, sincérité, équité,
 *    décision en connaissance de cause.
 *  - Politique interne KURLA : pas de diagnostic médical, pas de résultat
 *    garanti (contrainte permanente du produit).
 */

export type CatalogClaimRuleId =
  /** Allégation thérapeutique : le produit prétend traiter ou guérir. */
  | 'therapeutic_claim'
  /** Résultat garanti : promesse de succès, ce que le produit s'interdit. */
  | 'guaranteed_result'
  /** Preuve clinique annoncée sans élément justificatif rattaché. */
  | 'unsupported_proof'
  /** Innocuité présentée comme absolue. */
  | 'absolute_safety'
  /** Pratique ou substance exclue de la politique KURLA. */
  | 'prohibited_practice'
  /** Supériorité ou antériorité annoncée sans élément comparatif étayé. */
  | 'unsubstantiated_superiority';

export interface CatalogClaimRule {
  id: CatalogClaimRuleId;
  /** Intitulé lisible, repris dans le rapport et dans la note de validation. */
  label: string;
  /** Pourquoi cette formulation pose problème, en une phrase. */
  reason: string;
  /** Expressions recherchées, déjà insensibles à la casse et aux accents. */
  patterns: RegExp[];
}

/**
 * Les règles. Chaque motif est écrit en minuscules et sans accent : les textes
 * sont pliés avant comparaison (`foldForClaimSearch`), donc « Guérit »,
 * « GUÉRIT » et « guerit » tombent tous sur le même motif.
 */
export const CATALOG_CLAIM_RULES: readonly CatalogClaimRule[] = [
  {
    id: 'therapeutic_claim',
    label: 'allégation thérapeutique',
    reason: 'Traiter, soigner ou prévenir une maladie relève du médicament (règlement 1223/2009 art. 2), pas du cosmétique.',
    patterns: [
      /\bgu[ée]rit\b/, /\bgu[ée]rir\b/, /\bgu[ée]rison\b/,
      /\bsoigne\b/, /\bsoigner\b/, /\btraite\b/, /\btraitement\b/, /\bth[ée]rapeutique\b/,
      /\banti-?inflammatoire\b/, /\bantibiotique\b/, /\bantifongique\b/, /\bantimycosique\b/,
      /\bcicatris(?:e|ation|ante)\b/,
      /\becz[ée]ma\b/, /\bpsoriasis\b/, /\bdermatite\b/, /\bmycose\b/, /\bpelade\b/,
      /\bpseudofolliculite\b/, /\bfolliculite\b/, /\balop[ée]cie\b/,
      /**
       * Verbe de prévention devant une pathologie. Le verbe seul ne suffit pas :
       * « prévient les pellicules » est une allégation cosmétique ordinaire,
       * « prévenant la pseudofolliculite » est une allégation de prévention
       * d'une affection. La fiche p13 du catalogue réel l'écrivait, et la
       * première version de ce crible ne la voyait pas.
       */
      /\bpr[ée]v(?:ient|enant|ention|entive)\b[\s\S]{0,40}?\b(?:pseudofolliculite|folliculite|ecz[ée]ma|psoriasis|dermatite|mycose|alop[ée]cie|pelade)\b/,
      /\bfait repousser\b/, /\brepopulation capillaire\b/,
      /\bcellules souches\b/, /\br[ée]pare l'?adn\b/, /\bmodifie la structure (?:du|des) (?:cheveu|follicule)/,
    ],
  },
  {
    id: 'guaranteed_result',
    label: 'résultat garanti',
    reason: 'Une promesse de succès n\u2019est pas tenable et contredit la politique KURLA (aucun résultat garanti).',
    patterns: [
      /\bgaranti(?:e|s|es)?\b/, /\bgarantie de r[ée]sultat\b/,
      /\br[ée]sultat assur[ée]\b/, /\b[àa] coup s[ûu]r\b/, /\binfaillible\b/,
      /\b100\s*%\s*efficace\b/, /\befficacit[ée] (?:totale|absolue)\b/,
      /\bsucc[èe]s assur[ée]\b/, /\bimpossible (?:de|d')? ?[ée]chouer\b/,
    ],
  },
  {
    id: 'unsupported_proof',
    label: 'preuve annoncée sans justificatif',
    reason: 'Le critère « éléments justificatifs » du règlement 655/2013 exige une preuve rattachée, pas une formule.',
    patterns: [
      /\bcliniquement prouv[ée]\b/, /\bprouv[ée] cliniquement\b/,
      /\befficacit[ée] d[ée]montr[ée]e\b/, /\bprouv[ée] scientifiquement\b/,
      /\b[ée]tude clinique\b/, /\btest[ée] cliniquement\b/,
      /\bcertifi[ée] (?:efficace|r[ée]sultat)\b/,
    ],
  },
  {
    id: 'absolute_safety',
    label: 'innocuité présentée comme absolue',
    reason: 'Aucun produit n’est sans risque pour tout le monde ; ces formulations privent l’utilisateur d’une décision éclairée (655/2013).',
    patterns: [
      /\bsans (?:aucun )?risque\b/, /\baucun effet (?:secondaire|ind[ée]sirable)\b/,
      /\b0\s*%\s*(?:de )?danger\b/, /\bnon toxique\b/, /\bsans danger\b/,
      /\bhypoallerg[ée]nique\b/,
    ],
  },
  {
    id: 'unsubstantiated_superiority',
    label: 'supériorité ou antériorité non étayée',
    reason: 'Se dire le premier, la référence ou le meilleur engage une comparaison qui doit être étayée (655/2013, critères d’honnêteté et d’équité).',
    patterns: [
      /\ble premier (?:soin|produit|s[ée]rum|shampoing|geste)\b/,
      /\bla r[ée]f[ée]rence (?:internationale|mondiale|absolue)\b/,
      /\bn[°o]\s*1\b/, /\bnum[ée]ro un\b/,
      /\ble meilleur (?:produit|soin|choix)\b/,
      /\bincomparable\b/, /\bunique au monde\b/, /\bsans [ée]quivalent\b/
    ]
  },
  {
    id: 'prohibited_practice',
    label: 'pratique ou substance exclue par la politique KURLA',
    reason: 'Substances et pratiques exclues du catalogue (décapage, dépigmentants non encadrés, corticoïdes).',
    patterns: [
      /\bd[ée]capage\b/, /\bd[ée]cape\b/,
      /\bmercure\b/, /\bcortico[ïi]de\b/, /\bhydroquinone\b/,
      /\b[ée]claircissement (?:de la peau|cutan[ée])\b/, /\bblanchiment de la peau\b/,
      /\bhuile essentielle pure\b/,
    ],
  },
];

/**
 * Champ lu par le crible.
 *
 * `exemptRuleIds` couvre un cas précis : les champs de contre-indication.
 * « Déconseillé en cas d'eczéma » nomme une pathologie sans rien promettre de
 * soigner — c'est même l'inverse d'une allégation thérapeutique, c'est un
 * avertissement. Le signaler comme allégation thérapeutique pousserait les
 * marques à **retirer** leurs avertissements pour passer le contrôle : un
 * crible qui punit la prudence est un crible mal réglé.
 */
const CONTRAINDICATION_EXEMPTION: readonly CatalogClaimRuleId[] = ['therapeutic_claim'];

const SCANNED_FIELDS: ReadonlyArray<{ field: string; label: string; exemptRuleIds?: readonly CatalogClaimRuleId[] }> = [
  { field: 'name', label: 'nom' },
  { field: 'description', label: 'description' },
  { field: 'benefit_primary', label: 'bénéfice principal' },
  { field: 'for_who', label: 'à qui cela s’adresse' },
  { field: 'not_ideal_if', label: 'déconseillé si', exemptRuleIds: CONTRAINDICATION_EXEMPTION },
  { field: 'how_to_use', label: 'mode d’emploi' },
  { field: 'texture', label: 'texture' },
  { field: 'usage_frequency', label: 'fréquence d’utilisation' },
  { field: 'estimated_yield', label: 'rendement estimé' },
  { field: 'returns_policy', label: 'politique de retour' },
];

/** Champs tableaux : chaque élément est traité comme un texte distinct. */
const SCANNED_LIST_FIELDS: ReadonlyArray<{ field: string; label: string; exemptRuleIds?: readonly CatalogClaimRuleId[] }> = [
  { field: 'badges', label: 'badges' },
  { field: 'warnings', label: 'avertissements', exemptRuleIds: CONTRAINDICATION_EXEMPTION },
];

export interface CatalogClaimHit {
  /** Nom de colonne, pour retrouver le texte en base. */
  field: string;
  /** Intitulé lisible du champ. */
  fieldLabel: string;
  ruleId: CatalogClaimRuleId;
  ruleLabel: string;
  /** Le terme tel qu'il apparaît dans le texte. */
  term: string;
  /** Extrait court autour du terme, pour lire sans ouvrir la base. */
  excerpt: string;
}

export interface CatalogClaimScan {
  /** Champs réellement lus (ceux qui contenaient du texte). */
  scannedFields: string[];
  scannedCharacters: number;
  rulesApplied: number;
  /** Vrai seulement si aucune règle n'a trouvé de correspondance. */
  clean: boolean;
  hits: CatalogClaimHit[];
}

/** Pliage : casse et diacritiques neutralisés, espaces réduits. */
export function foldForClaimSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function excerptAround(text: string, index: number, termLength: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + termLength + 40);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function scanText(text: string, field: string, fieldLabel: string, exemptRuleIds: readonly CatalogClaimRuleId[] = []): CatalogClaimHit[] {
  const folded = foldForClaimSearch(text);
  if (folded.length === 0) return [];
  const hits: CatalogClaimHit[] = [];
  for (const rule of CATALOG_CLAIM_RULES) {
    if (exemptRuleIds.includes(rule.id)) continue;
    for (const pattern of rule.patterns) {
      const match = new RegExp(pattern.source, 'g').exec(folded);
      if (!match) continue;
      hits.push({
        field,
        fieldLabel,
        ruleId: rule.id,
        ruleLabel: rule.label,
        term: match[0],
        excerpt: excerptAround(text, match.index, match[0].length),
      });
    }
  }
  return hits;
}

/**
 * Crible d'allégations sur une fiche produit.
 *
 * Prend la ligne telle que la base la rend (noms de colonnes en `snake_case`)
 * ou un objet déjà mappé (`camelCase`) : les deux formes circulent dans le
 * code, et un contrôle de conformité qui dépend de la forme de l'objet est un
 * contrôle qu'on peut faire échouer par accident.
 */
export function scanCatalogClaims(product: Record<string, unknown>): CatalogClaimScan {
  const read = (field: string): unknown => {
    if (product[field] !== undefined) return product[field];
    const camel = field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return product[camel];
  };

  const hits: CatalogClaimHit[] = [];
  const scannedFields: string[] = [];
  let scannedCharacters = 0;

  for (const { field, label, exemptRuleIds } of SCANNED_FIELDS) {
    const raw = read(field);
    if (typeof raw !== 'string' || raw.trim() === '') continue;
    scannedFields.push(field);
    scannedCharacters += raw.length;
    hits.push(...scanText(raw, field, label, exemptRuleIds));
  }

  for (const { field, label, exemptRuleIds } of SCANNED_LIST_FIELDS) {
    const raw = read(field);
    if (!Array.isArray(raw)) continue;
    const values = raw.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
    if (values.length === 0) continue;
    scannedFields.push(field);
    for (const value of values) {
      scannedCharacters += value.length;
      hits.push(...scanText(value, field, label, exemptRuleIds));
    }
  }

  return {
    scannedFields,
    scannedCharacters,
    rulesApplied: CATALOG_CLAIM_RULES.reduce((total, rule) => total + rule.patterns.length, 0),
    clean: hits.length === 0,
    hits,
  };
}

/**
 * Phrase enregistrée comme note de validation.
 *
 * Une note de conformité doit dire **ce qui a été fait**, pas rassurer : un
 * « conforme » sans méthode ne vaut rien six mois plus tard, quand personne ne
 * sait plus ce que le mot couvrait.
 */
export function describeClaimScan(scan: CatalogClaimScan): string {
  if (!scan.clean) {
    const detail = scan.hits
      .slice(0, 6)
      .map(hit => `${hit.fieldLabel} : « ${hit.term} » (${hit.ruleLabel})`)
      .join(' ; ');
    return `Crible automatique des allégations : ${scan.hits.length} correspondance(s) à corriger — ${detail}.`;
  }
  return `Crible automatique des allégations (${scan.rulesApplied} motifs, ${scan.scannedFields.length} champs lus, ${scan.scannedCharacters} caractères) : aucune formulation interdite détectée. Contrôle lexical, non une validation juridique.`;
}
