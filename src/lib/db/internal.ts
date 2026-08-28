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

import type { ServerOrder } from '../serverDb';

/** Colonnes TVA d'une commande, absentes des lignes antérieures à la migration 7.6. */
export function mapOrderVatFields(row: any): Partial<ServerOrder> {
  if (!row || typeof row !== 'object') return {};
  const fields: Partial<ServerOrder> = {};
  if (row.currency != null) fields.currency = String(row.currency);
  if (row.vat_country != null) fields.vatCountry = String(row.vat_country);
  if (row.net_amount != null) fields.netAmount = Number(row.net_amount);
  if (row.vat_amount != null) fields.vatAmount = Number(row.vat_amount);
  if (row.vat_breakdown != null) fields.vatBreakdown = row.vat_breakdown;
  if (row.customer_vat_number != null) fields.customerVatNumber = String(row.customer_vat_number);
  return fields;
}

export function isUuid(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
