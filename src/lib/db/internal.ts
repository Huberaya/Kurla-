/**
 * CHANTIER 8.2 — aides internes au store, sorties de `serverDb.ts`.
 *
 * Isolées ici pour que les modules de domaine (`src/lib/db/*`) les importent sans
 * créer de cycle : `serverDb.ts` compose ces modules, ils ne peuvent donc pas le
 * réimporter pour une simple fonction utilitaire.
 */

/** Une erreur de base n'est jamais avalée : elle remonte avec l'opération en clair. */
export function ensureDatabaseSuccess(operation: string, error: { message?: string } | null | undefined): void {
  if (error) {
    throw new Error(`[Supabase] ${operation}: ${error.message || 'opération refusée'}`);
  }
}

export function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
