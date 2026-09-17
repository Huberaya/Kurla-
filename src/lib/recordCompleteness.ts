/**
 * MANQUES NOMMÉS — fiche fournisseur et fiche produit (17/09/2026).
 *
 * Demande de l'exploitant : « des fournisseurs avec des informations
 * incomplètes et des produits avec des informations manquantes ». Un compteur
 * de complétude dit « 60 % » et laisse deviner ; ici chaque manque est NOMMÉ,
 * avec la raison pour laquelle il compte, et le champ à remplir en face.
 *
 * Deux règles :
 *
 *   · **rien n'est inventé** : un manque est l'absence d'une valeur, jamais une
 *     valeur proposée. Le champ reste vide tant que l'humain ne l'a pas rempli ;
 *   · **un 0 n'est pas un manque** : un MOQ de 0 ou un délai de 0 est une
 *     information (même inhabituelle), pas un trou. Seul `null` / chaîne vide
 *     compte comme absent — c'est le contrat déjà posé dans `columnFilters`.
 *
 * Les champs listés côté fournisseur sont EXACTEMENT ceux que la route PATCH
 * accepte (`updateSupplier`, src/lib/db/supplierStore.ts) : nommer un manque
 * qu'on ne peut pas corriger ici serait une promesse vide. `legalName` n'y est
 * donc pas — le serveur la refuse explicitement.
 */

export type MissingSeverity = 'bloquant' | 'important' | 'utile';

export interface MissingField {
  /** Clé du champ, telle que la route PATCH l'accepte. */
  key: string;
  /** Libellé affiché. */
  label: string;
  /** Pourquoi ce champ compte — une phrase, pas un slogan. */
  why: string;
  severity: MissingSeverity;
}

export interface Completeness {
  missing: MissingField[];
  blocking: MissingField[];
  /** Nombre de champs attendus réellement renseignés. */
  filled: number;
  total: number;
}

/** Libellés des types fournisseur. Le panneau existant n'en couvrait que 7 sur
 *  les 8 valeurs acceptées par le serveur : `brand` et `distributor`
 *  s'affichaient en brut. Complété ici, valeurs lues dans `SUPPLIER_TYPES`. */
export const SUPPLIER_TYPE_LABELS_FULL: Record<string, string> = {
  contract_manufacturer: 'Façonnier cosmétique',
  textile: 'Textile',
  tool: 'Outil / accessoire',
  raw_material: 'Matière première',
  packaging: 'Packaging',
  laboratory: 'Laboratoire / test',
  brand: 'Marque',
  distributor: 'Distributeur / grossiste',
  unknown: 'Non qualifié',
};

export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  verified: 'Vérifié',
  pending: 'Vérification en cours',
  not_provided: 'Aucune preuve fournie',
};

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Manques d'une fiche fournisseur. `options.linkedProducts` et
 * `options.documentCount` viennent des données réellement lues (pas d'estimation) :
 * ils servent à expliquer pourquoi un manque compte, jamais à en inventer.
 */
export function missingSupplierFields(
  supplier: Record<string, any> | null | undefined,
  options: { linkedProducts?: number; documentCount?: number } = {}
): Completeness {
  const expected: MissingField[] = [
    { key: 'contactEmail', label: 'E-mail de contact', why: 'Sans adresse, aucune demande de prix ni de preuve ne peut partir.', severity: 'bloquant' },
    { key: 'contactName', label: 'Nom du contact', why: 'Un e-mail sans interlocuteur nommé ne se relance pas.', severity: 'important' },
    { key: 'moqUnits', label: 'MOQ (quantité minimale)', why: 'Sans MOQ, impossible de savoir si la commande est finançable.', severity: 'bloquant' },
    { key: 'leadTimeDays', label: 'Délai de livraison (jours)', why: 'Sans délai, aucune promesse de réassort n’est tenable.', severity: 'important' },
    { key: 'country', label: 'Pays', why: 'Le pays décide du rôle juridique : distributeur ou importateur (Règl. 1223/2009).', severity: 'important' },
    { key: 'website', label: 'Site web', why: 'Le site est la preuve publique de l’existence du fournisseur.', severity: 'utile' },
    { key: 'certifications', label: 'Certifications', why: 'CPSR, ISO 22716, OEKO-TEX… : sans elles, le statut ne peut pas passer en « vérifié ».', severity: 'important' },
  ];

  const missing: MissingField[] = [];
  for (const field of expected) {
    if (isFilled(supplier?.[field.key])) continue;
    missing.push(field);
  }

  // Le statut de vérification est un cas à part : ce n'est pas un champ vide,
  // c'est un état. « not_provided » est nommé comme un manque parce que le
  // serveur refuse le passage en « verified » sans document enregistré.
  const status = String(supplier?.verificationStatus || 'not_provided');
  if (status === 'not_provided') {
    missing.push({
      key: 'verificationStatus',
      label: 'Statut de vérification',
      why: (options.documentCount ?? 0) > 0
        ? 'Aucune vérification tranchée alors qu’au moins un document est enregistré.'
        : 'Aucune preuve de conformité enregistrée : le statut ne peut pas passer en « vérifié ».',
      severity: 'bloquant',
    });
  }

  return {
    missing,
    blocking: missing.filter(field => field.severity === 'bloquant'),
    filled: expected.filter(field => isFilled(supplier?.[field.key])).length + (status !== 'not_provided' ? 1 : 0),
    total: expected.length + 1,
  };
}

/**
 * Manques d'une fiche produit. Reprend les critères déjà calculés par
 * `evaluateKurlaReady` (src/lib/kurlaReadyScore.ts) pour ne pas avoir deux
 * grilles différentes, et y ajoute ce que cette fonction ne regarde pas :
 * le rattachement fournisseur, le SKU fournisseur et la catégorie.
 */
export function missingProductFields(
  product: Record<string, any> | null | undefined,
  readiness?: { hardBlockers?: string[]; qualityGaps?: string[] }
): Completeness {
  const missing: MissingField[] = [];

  // 1. Ce que la grille KURLA Ready a déjà nommé — recopié tel quel, pas réinventé.
  for (const blocker of readiness?.hardBlockers || []) {
    missing.push({ key: 'truth', label: String(blocker), why: 'Bloque la mise en vente.', severity: 'bloquant' });
  }
  const QUALITY_LABELS: Record<string, { key: string; why: string }> = {
    'INCI absente': { key: 'inci', why: 'Sans INCI, la fiche ne peut pas être publiée (Règl. 1223/2009).' },
    'aucun visuel http(s)': { key: 'image', why: 'Sans visuel hébergé, la fiche n’est pas montrable en boutique.' },
    'description absente': { key: 'description', why: 'Sans description, la fiche ne répond à aucune question client.' },
    'marque absente': { key: 'brand', why: 'Sans marque, impossible de vérifier l’autorisation de revente.' },
    'EAN/code-barres absent': { key: 'ean', why: 'Sans EAN, pas d’expédition ni d’inventaire fiable.' },
  };
  for (const gap of readiness?.qualityGaps || []) {
    const known = QUALITY_LABELS[String(gap)];
    missing.push(known
      ? { key: known.key, label: String(gap), why: known.why, severity: 'important' }
      : { key: 'quality', label: String(gap), why: 'Manque signalé par la grille KURLA Ready.', severity: 'important' });
  }

  // 2. Ce que la grille ne regarde pas, mais qui bloque le travail d'appro.
  if (!isFilled(product?.supplierId)) {
    missing.push({
      key: 'supplierId',
      label: 'Fournisseur non rattaché',
      why: 'Sans fournisseur rattaché, aucune commande ni aucun lot ne peut être suivi pour cette fiche.',
      severity: 'bloquant',
    });
  }
  if (isFilled(product?.supplierId) && !isFilled(product?.supplierSku)) {
    missing.push({
      key: 'supplierSku',
      label: 'Référence fournisseur (SKU)',
      why: 'Sans la référence du fournisseur, la commande se fait à l’aveugle.',
      severity: 'important',
    });
  }
  if (!isFilled(product?.category)) {
    missing.push({ key: 'category', label: 'Catégorie', why: 'La catégorie décide de l’espace (Skin ou Hair) où la fiche apparaît.', severity: 'important' });
  }
  if (!(Number(product?.price) > 0)) {
    missing.push({ key: 'price', label: 'Prix de vente', why: 'Sans prix, la fiche ne peut pas être commandée.', severity: 'bloquant' });
  }

  return {
    missing,
    blocking: missing.filter(field => field.severity === 'bloquant'),
    filled: 0,
    total: 0,
  };
}

/** Libellé court d'un niveau de manque, pour les pastilles. */
export const SEVERITY_LABELS: Record<MissingSeverity, string> = {
  bloquant: 'Bloque',
  important: 'À compléter',
  utile: 'Utile',
};
