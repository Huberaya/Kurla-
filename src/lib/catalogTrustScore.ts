/**
 * Trust Score public d'une fiche catalogue.
 *
 * La liste des contrôles est volontairement limitée aux sept validations déjà
 * persistées sur `products`. Ce module ne lit ni note interne, ni événement
 * d'audit, et ne fabrique jamais une validation absente.
 */

export type CatalogTrustStatus = 'verified' | 'partial' | 'insufficient_data';

export interface CatalogTrustCheckDefinition {
  id: string;
  label: string;
  decisive: boolean;
  column: string;
}

export interface CatalogTrustScore {
  /** Nombre de validations réellement au statut `verified`. */
  verifiedCount: number;
  /** Nombre fixe de contrôles attendus dans le référentiel public. */
  max: number;
  /** Nombre de colonnes de validation renseignées, quel que soit leur verdict. */
  availableCount: number;
  /** Null quand aucune validation exploitable n'est présente. */
  value: number | null;
  /** Null quand aucune validation exploitable n'est présente. */
  percentage: number | null;
  status: CatalogTrustStatus;
}

export const CATALOG_TRUST_CHECKS: ReadonlyArray<CatalogTrustCheckDefinition> = [
  { id: 'ingredients', label: 'Composition vérifiée', decisive: true, column: 'ingredient_verification_status' },
  { id: 'claims', label: 'Allégations contrôlées', decisive: true, column: 'claims_validation_status' },
  { id: 'certifications', label: 'Certifications vérifiées', decisive: false, column: 'certifications_validation_status' },
  { id: 'images', label: 'Visuels conformes', decisive: false, column: 'images_validation_status' },
  { id: 'brand', label: 'Marque vérifiée', decisive: false, column: 'brand_verification_status' },
  { id: 'translations', label: 'Traductions relues', decisive: false, column: 'translations_validation_status' },
  { id: 'stock', label: 'Disponibilité confirmée', decisive: false, column: 'stock_validation_status' }
] as const;

function camelCase(column: string): string {
  return column.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

/** Lit une colonne dans les deux formats renvoyés par les stores. */
export function readCatalogTrustStatus(product: unknown, column: string): string {
  if (!product || typeof product !== 'object') return '';
  const record = product as Record<string, unknown>;
  return String(record[camelCase(column)] ?? record[column] ?? '').trim().toLowerCase();
}

/**
 * Calcule le score à partir des sept colonnes de validation, sans arrondi
 * trompeur ni valeur de remplacement.
 *
 * - `verified` : les sept validations sont présentes et vérifiées ;
 * - `partial` : au moins une validation est vérifiée, mais le jeu n'est pas
 *   complet ; le ratio affiché reste explicitement un ratio de validations,
 *   jamais une probabilité de qualité ou d'efficacité ;
 * - `insufficient_data` : aucune validation vérifiée ; `value` et `percentage`
 *   restent `null`, notamment pour éviter d'afficher un faux « 0/7 » comme un
 *   score produit.
 */
export function computeCatalogTrustScore(
  product: unknown,
  checks: ReadonlyArray<CatalogTrustCheckDefinition> = CATALOG_TRUST_CHECKS
): CatalogTrustScore {
  const verifiedCount = checks.filter(check => readCatalogTrustStatus(product, check.column) === 'verified').length;
  const availableCount = checks.filter(check => readCatalogTrustStatus(product, check.column) !== '').length;
  const max = checks.length;
  const status: CatalogTrustStatus = verifiedCount === max && max > 0
    ? 'verified'
    : verifiedCount > 0
      ? 'partial'
      : 'insufficient_data';
  const value = verifiedCount > 0 ? verifiedCount : null;
  const percentage = verifiedCount > 0 && max > 0 ? Math.round((verifiedCount / max) * 100) : null;

  return { verifiedCount, max, availableCount, value, percentage, status };
}
