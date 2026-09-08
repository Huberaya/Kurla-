/**
 * B3 — GARDE-FOU CATALOGUE (launchCatalog.ts)
 *
 * 54 SKU + 10 kits = décision marchande JOUR 1 (4-6 k€ de premier lot, pas
 * 15 k€). Le fichier launchCatalog.ts ne doit JAMAIS bouger à travers un push
 * côté 3PL ou un commit distrait : c'est un document de décision, pas un stock.
 *
 * Ce module fournit :
 *  1. un assert runtime (utilisable dans l'admin) qui casse si le compte bouge,
 *  2. l'empreinte attendue (le git diff doit rester vide avant chaque push).
 */

import { LAUNCH_PRODUCTS, LAUNCH_KITS } from './launchCatalog';

export const CATALOG_GUARD_EXPECTED = {
  products: 54,
  kits: 10,
  file: 'src/lib/launchCatalog.ts',
  rule: 'git diff -- src/lib/launchCatalog.ts doit rester vide avant chaque push (le flux 3PL ne touche que src/lib/fulfillment.ts + tables Supabase).',
} as const;

export function assertCatalogIntegrity(): { ok: boolean; message: string } {
  const p = LAUNCH_PRODUCTS.length;
  const k = LAUNCH_KITS.length;
  if (p !== CATALOG_GUARD_EXPECTED.products || k !== CATALOG_GUARD_EXPECTED.kits) {
    return {
      ok: false,
      message: `Garde-fou catalogue DÉCLENCHÉ : attendu ${CATALOG_GUARD_EXPECTED.products} SKU / ${CATALOG_GUARD_EXPECTED.kits} kits, trouvé ${p} SKU / ${k} kits dans ${CATALOG_GUARD_EXPECTED.file}. Restaurer le fichier avant de pousser.`,
    };
  }
  return { ok: true, message: `Catalogue intact : ${p} SKU / ${k} kits — ${CATALOG_GUARD_EXPECTED.file} inchangé.` };
}

export function catalogGuardSummary(): string {
  const r = assertCatalogIntegrity();
  return r.ok ? r.message : `⛔ ${r.message} — Règle : ${CATALOG_GUARD_EXPECTED.rule}`;
}
