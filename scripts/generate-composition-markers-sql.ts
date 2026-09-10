/**
 * Génère la migration qui marque la nature des compositions affichées.
 *
 * Deux cas où le champ `inci` ne contient pas une composition :
 *
 *   1. les 16 produits de la gamme peau — précommandes, non fabriqués. La
 *      liste affichée est la formulation demandée au laboratoire, pas la
 *      composition d'un produit existant ;
 *   2. les accessoires — le champ porte une mention « aucun ingrédient
 *      cosmétique », pas une liste.
 *
 * Sans marqueur, la page produit affichait les deux sous le titre « INCI »,
 * c'est-à-dire comme un fait établi.
 *
 * Exécution : npx tsx scripts/generate-composition-markers-sql.ts > <fichier>.sql
 */

import { FULL_SKIN_RANGE } from '../src/lib/kurlaSkinRange';

const s = (v: string): string => `'${v.replace(/'/g, "''")}'`;

const CIBLE = '[Formulation cible]';
const ACCESSOIRE = '[Accessoire]';

// Les 13 fiches créées en B-01 ET les 3 qui préexistaient : une
// composition d'un produit non fabriqué est une cible dans les deux cas.
const ids = FULL_SKIN_RANGE.map(p => p.id);

process.stdout.write(`-- ============================================================================
-- Nature de la composition affichée — chantier B-08
-- ============================================================================
-- Le champ inci ne contient pas toujours une liste d'ingrédients. Deux cas
-- s'en écartent volontairement, et la page produit les affichait tous sous le
-- titre « INCI », c'est-à-dire comme un fait établi.
--
--   1. ${ids.length} produits de la gamme peau, en précommande et non encore
--      fabriqués : la liste est la formulation spécifiée au laboratoire, une
--      cible, pas la composition d'un produit existant.
--   2. les accessoires : le champ porte une mention, pas une liste.
--
-- Le marqueur est en tête de chaîne pour qu'aucun affichage, y compris un
-- export CSV ou une reprise manuelle, ne puisse montrer la liste seule sans
-- son cadre. Les gardes « NOT LIKE '[%' » rendent la migration idempotente.
-- ============================================================================

-- 1. Formulations cibles : produits en précommande, non fabriqués.
UPDATE public.products
SET inci = '${CIBLE} ' || inci,
    inci_source = ${s('Formulation cible KURLA — produit en précommande, non encore fabriqué ; composition définitive à confirmer sur l’étiquette')},
    inci_sourced_at = now()
WHERE id IN (${ids.map(s).join(', ')})
  AND inci IS NOT NULL
  AND inci <> ''
  AND inci NOT LIKE '[%';

-- 2. Accessoires : le champ porte une mention, jamais une liste.
UPDATE public.products
SET inci = '${ACCESSOIRE} ' || inci,
    inci_source = ${s('Accessoire — sans composition cosmétique')},
    inci_sourced_at = now()
WHERE inci IS NOT NULL
  AND inci <> ''
  AND inci NOT LIKE '[%'
  AND (category = 'accessoires' OR category = 'accessoire' OR inci LIKE 'Accessoire %');
`);
