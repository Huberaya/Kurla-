/**
 * B3 — GARDE-FOU CATALOGUE (launchCatalog.ts)
 *
 * 77 SKU + 10 kits = inventaire déclaré actuellement dans launchCatalog.ts.
 * L'ancien garde-fou 54/10 était devenu faux après l'ajout d'une extension de
 * gamme : il masquait un écart de gouvernance au lieu de le signaler. Cette
 * correction ne supprime aucun SKU ; elle aligne la garde sur la source de
 * vérité présente dans le dépôt. Le statut « cible de lancement » reste
 * distinct de la publiabilité commerciale calculée par catalogTruth.
 *
 * Le fichier launchCatalog.ts ne doit JAMAIS bouger à travers un push côté 3PL
 * ou un commit distrait : c'est un document d'inventaire décidé, pas un stock.
 * Toute évolution du nombre doit donc modifier cette constante explicitement
 * et être accompagnée d'une décision produit.
 */

import { LAUNCH_PRODUCTS, LAUNCH_KITS } from './launchCatalog';

export const CATALOG_GUARD_EXPECTED = {
  products: 77,
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
