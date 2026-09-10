-- ============================================================================
-- Nature de la composition affichée — chantier B-08
-- ============================================================================
-- Le champ inci ne contient pas toujours une liste d'ingrédients. Deux cas
-- s'en écartent volontairement, et la page produit les affichait tous sous le
-- titre « INCI », c'est-à-dire comme un fait établi.
--
--   1. 16 produits de la gamme peau, en précommande et non encore
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
SET inci = '[Formulation cible] ' || inci,
    inci_source = 'Formulation cible KURLA — produit en précommande, non encore fabriqué ; composition définitive à confirmer sur l’étiquette',
    inci_sourced_at = now()
WHERE id IN ('peau-ess-001', 'peau-ess-002', 'peau-ess-003', 'peau-ess-004', 'peau-ess-005', 'peau-ess-006', 'peau-ess-007', 'peau-ess-008', 'peau-ess-009', 'peau-ess-010', 'peau-ess-011', 'peau-ess-012', 'peau-ess-013', 'peau-ess-014', 'peau-ess-015', 'peau-ess-016')
  AND inci IS NOT NULL
  AND inci <> ''
  AND inci NOT LIKE '[%';

-- 2. Accessoires : le champ porte une mention, jamais une liste.
UPDATE public.products
SET inci = '[Accessoire] ' || inci,
    inci_source = 'Accessoire — sans composition cosmétique',
    inci_sourced_at = now()
WHERE inci IS NOT NULL
  AND inci <> ''
  AND inci NOT LIKE '[%'
  AND (category = 'accessoires' OR category = 'accessoire' OR inci LIKE 'Accessoire %');
