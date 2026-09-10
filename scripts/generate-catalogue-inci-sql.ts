/**
 * Génère la migration des compositions INCI à partir de `src/data/catalogueInci.ts`.
 *
 * Pourquoi un générateur : la composition est sourcée par
 * `scripts/buildCatalogueInci.py` puis relue par un banc de tests. Écrire le
 * SQL à la main produirait une seconde source de vérité, qui dériverait à la
 * première correction. La donnée vit en TypeScript, le SQL en découle.
 *
 * Exécution : npx tsx scripts/generate-catalogue-inci-sql.ts > <fichier>.sql
 *
 * Deux effets, volontairement séparés :
 *   1. renseigner la composition et sa provenance ;
 *   2. retirer de la vente les produits publiés dont la composition n'a pu être
 *      sourcée — un produit de moins vaut mieux qu'une composition inventée.
 */

import { CATALOGUE_INCI } from '../src/data/catalogueInci';

/** Échappement SQL : une apostrophe s'écrit deux fois, jamais d'anti-slash. */
const s = (v: string | null | undefined): string =>
  v === null || v === undefined || v === '' ? 'NULL' : `'${v.replace(/'/g, "''")}'`;

/** Littéral de tableau PostgreSQL : ARRAY['a','b']::TEXT[]. */
const arr = (values: string[]): string =>
  values.length === 0 ? 'ARRAY[]::TEXT[]' : `ARRAY[${values.map(v => s(v)).join(', ')}]::TEXT[]`;

/**
 * Fiches dont le tableau `ingredients` déclaré est faux : un même trio
 * générique (Karité / Ricin / Coco) y était appliqué sans rapport avec la
 * composition réelle — faux pour une huile de ricin pure comme pour un beurre
 * de karité brut. Ces fiches sont réécrites à partir de la composition réelle ;
 * les autres gardent les ingrédients déjà déclarés.
 */
const INGREDIENTS_FAUX = new Set([
  'launch-p09', 'launch-p10', 'launch-p11', 'launch-p28', 'launch-p31', 'launch-p53',
]);

/** D'où vient la composition, pour pouvoir la revérifier. */
function provenance(entry: (typeof CATALOGUE_INCI)[number]): string {
  switch (entry.provenance) {
    case 'source':
      return entry.sourceUrl || 'source non précisée';
    case 'definition':
      return `Définition du produit — ${entry.note || 'composition déduite du produit lui-même'}`;
    case 'kit':
      return 'Kit — composition des produits inclus, détaillée sur chaque fiche';
    default:
      return '';
  }
}

const blocs: string[] = [];

blocs.push(`-- ============================================================================
-- Compositions INCI du catalogue — chantier B-02
-- ============================================================================
-- Règlement (CE) n° 1223/2009, art. 19 : un produit cosmétique ne peut être
-- mis sur le marché sans sa liste des ingrédients. Les compositions ci-dessous
-- proviennent d'une fiche publique du fabricant, d'INCIdecoder (l'adresse est
-- conservée dans inci_source), de la définition d'un produit monocomposant,
-- ou renvoient vers les fiches des produits d'un kit. Aucune n'a été
-- reconstituée au jugé.
--
-- Idempotent : rejouable sans effacer une correction manuelle ultérieure,
-- hormis sur les champs que la migration revendique (inci, inci_source).
-- ============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inci_source TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inci_sourced_at TIMESTAMPTZ;
`);

for (const entry of CATALOGUE_INCI) {
  if (entry.provenance === 'introuvable') continue;
  const champs = [
    `inci = ${s(entry.inci)}`,
    `inci_source = ${s(provenance(entry))}`,
    `inci_sourced_at = now()`,
  ];
  if (INGREDIENTS_FAUX.has(entry.productId)) {
    champs.unshift(`ingredients = ${arr(entry.keyIngredients ?? [])}`);
  }
  blocs.push(
    `-- ${entry.productId}\nUPDATE public.products SET\n  ${champs.join(',\n  ')}\nWHERE id = ${s(entry.productId)};\n`,
  );
}

// ── Produits retirés de la vente ──────────────────────────────────────────────
const introuvables = CATALOGUE_INCI.filter(e => e.provenance === 'introuvable');
if (introuvables.length > 0) {
  const liste = introuvables.map(e => `--   ${e.productId}`).join('\n');
  blocs.push(`-- Composition introuvable : ni la marque ni INCIdecoder ne la publient.
-- Le produit reste en base mais quitte la vente : afficher une composition
-- reconstituée serait une fausse déclaration réglementaire.
--   Produits concernés :
${liste}
UPDATE public.products
SET catalog_status = 'unavailable',
    inci_source = 'Composition non sourçable — retiré de la vente en attendant la fiche fabricant',
    inci_sourced_at = now()
WHERE id IN (${introuvables.map(e => s(e.productId)).join(', ')})
  AND catalog_status = 'published';
`);
}

process.stdout.write(blocs.join('\n'));
