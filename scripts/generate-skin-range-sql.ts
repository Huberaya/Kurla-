/**
 * Génère la migration d'alimentation de la gamme peau à partir de
 * `src/lib/kurlaSkinRange.ts`.
 *
 * Pourquoi un générateur plutôt qu'un fichier SQL écrit à la main : les
 * fiches sont typées et testées (`tests/kurla_skin_range.test.ts`). Écrire le
 * SQL à la main produirait une seconde source de vérité, qui dériverait au
 * premier correctif. Ici, la donnée vit en TypeScript et le SQL en découle.
 *
 * Exécution : npx tsx scripts/generate-skin-range-sql.ts > <fichier>.sql
 *
 * Le SQL produit est idempotent (ON CONFLICT ... DO UPDATE) : rejouable sans
 * écraser un champ renseigné à la main par la suite, à l'exception des champs
 * que la gamme revendique explicitement.
 */

import { KURLA_SKIN_RANGE } from '../src/lib/kurlaSkinRange';
import { SKIN_RANGE_ILLUSTRATIONS, illustrationUrl } from './skinRangeImages';

/** Échappement SQL : une apostrophe s'écrit deux fois, jamais d'anti-slash. */
const s = (v: string | null | undefined): string =>
  v === null || v === undefined || v === '' ? 'NULL' : `'${v.replace(/'/g, "''")}'`;

/** Littéral de tableau PostgreSQL : ARRAY['a','b']::TEXT[]. */
const arr = (values: string[]): string =>
  values.length === 0 ? 'ARRAY[]::TEXT[]' : `ARRAY[${values.map(v => s(v)).join(', ')}]::TEXT[]`;

const num = (v: number): string => v.toFixed(2);

const COLUMNS = [
  'id', 'slug', 'name', 'brand', 'price', 'category', 'subcategory', 'description',
  'image_url', 'inci', 'ingredients', 'skin_types', 'concerns', 'country_availability',
  'is_active', 'catalog_status', 'is_preorder', 'badges', 'stock_quantity', 'in_stock',
  'source_supplier', 'supplier_id', 'routine_step', 'size_label', 'texture',
  'usage_frequency', 'benefit_primary', 'for_who', 'not_ideal_if', 'how_to_use',
  'fragrance', 'contains_fragrance', 'vat_rate', 'price_includes_vat', 'warnings',
  'brand_verification_status', 'image_ownership_status', 'ingredient_verification_status',
  'claims_validation_status', 'images_validation_status', 'stock_validation_status',
  'certifications_validation_status', 'translations_validation_status',
  'minor_safety_status', 'image_supervision_status',
] as const;

function values(p: (typeof KURLA_SKIN_RANGE)[number]): string {
  return [
    s(p.id),
    s(p.slug),
    s(p.name),
    s(p.brand),
    num(p.price),
    s('peau'),
    s(p.subcategory),
    // Le préfixe de précommande est porté par la description : le client doit
    // lire le délai avant l'achat, pas seulement au moment de payer.
    s(`[PRÉCOMMANDE — expédié sous 30 jours maximum] ${p.description}`),
    s(illustrationUrl(SKIN_RANGE_ILLUSTRATIONS[p.id])),
    s(p.inci),
    arr(p.keyIngredients),
    arr(p.skinTypes),
    arr(p.concerns),
    arr(['FR', 'BE', 'DOM', 'INT']),
    // Formulation cible : inactive et hors publication tant que les preuves
    // réelles (fabrication, INCI contrôlée, visuels et stock) n'existent pas.
    'FALSE',
    s('draft'),
    'TRUE',
    arr([...p.badges, 'formulation-target']),
    '0',
    'FALSE',
    s('KURLA Skincare — formulation interne (précommande)'),
    s('sup-brands-wholesale'),
    s(p.routineStep),
    s(p.sizeLabel),
    s(p.texture),
    s(p.usageFrequency),
    s(p.benefitPrimary),
    s(p.forWho),
    s(p.notIdealIf),
    s(p.howToUse),
    s('Sans parfum ajouté'),
    'FALSE',
    '20.00',
    'TRUE',
    // `warnings` est un TEXT[] NOT NULL DEFAULT '{}' : une chaîne y serait
    // rejetée (« malformed array literal »), NULL aussi (NOT NULL).
    arr(p.warnings ? [p.warnings] : []),
    s('verified'),
    // Illustration, pas packshot : le produit n'est pas encore fabriqué.
    s('illustrative'),
    s('pending'),
    s('pending'),
    s('pending'),
    s('pending'),
    s('pending'),
    s('pending'),
    s('not_provided'),
    s('not_provided'),
  ].join(',\n    ');
}

const updates = COLUMNS.filter(c => c !== 'id')
  .map(c => `    ${c} = EXCLUDED.${c}`)
  .join(',\n');

for (const p of KURLA_SKIN_RANGE) {
  if (!SKIN_RANGE_ILLUSTRATIONS[p.id]) {
    throw new Error(`${p.id} n'a aucune illustration déclarée dans scripts/skinRangeImages.ts`);
  }
}

const body = KURLA_SKIN_RANGE.map(
  p => `INSERT INTO public.products (\n    ${COLUMNS.join(', ')}\n  ) VALUES (\n    ${values(p)}\n  )\n  ON CONFLICT (id) DO UPDATE SET\n${updates};`,
).join('\n\n');

const out = `-- ============================================================
-- KURLA — GAMME PEAU : COMPLÉTION DU CATALOGUE (B-01)
-- Généré par scripts/generate-skin-range-sql.ts — ne pas éditer à la main.
-- ============================================================
--
-- Constat qui motive cette migration : le catalogue peau publié comptait
-- 3 références (nettoyant, crème, SPF) alors que l'application en recommande
-- 7 (PEAU_KITS) et que les profils de connaissance en citent 7 autres. Quatre
-- produits conseillés n'existaient dans aucune boutique : la recommandation
-- était non achetable par construction.
--
-- Cette migration ajoute ${KURLA_SKIN_RANGE.length} fiches « formulation interne » qui complètent
-- les étapes manquantes : exfoliation, niacinamide, acide azélaïque, acide
-- tranexamique, vitamine C stabilisée, rétinol doux, hydratation légère, soin
-- local, SPF teinté, masque apaisant. Chacune des six préoccupations (acné,
-- taches, sécheresse, sensibilité, maturité, éclat) dispose désormais d'une
-- routine complète nettoyant → traitement → SPF.
--
-- Points de vérité, volontairement non enjolivés :
--   · image_ownership_status = 'illustrative' : ces visuels sont des
--     illustrations, pas des packshots. Le produit n'est pas fabriqué, aucun
--     visuel officiel n'existe. 'brand_provided' aurait été un mensonge.
--   · *_validation_status = 'pending' : rien n'a été vérifié. Une formule
--     cible n'est pas une formule contrôlée.
--   · is_active = FALSE et catalog_status = 'draft' : ces fiches ne sont
--     ni publiées ni achetables. Le badge de précommande décrit une intention
--     commerciale, pas une disponibilité ; le lancement exige des preuves.
--
-- Idempotent : ON CONFLICT (id) DO UPDATE. Rejouable sans dommage.
-- ============================================================

${body}

-- Cohérence : les trois fiches déjà publiées portaient la précommande
-- uniquement dans badges[], faute de colonne. La colonne existe depuis
-- 20260901000000, on aligne.
UPDATE public.products
   SET is_preorder = TRUE
 WHERE id IN ('peau-ess-001', 'peau-ess-002', 'peau-ess-003')
   AND is_preorder IS DISTINCT FROM TRUE;
`;

process.stdout.write(out);
