-- ============================================================================
-- Normalisation du taux de TVA — chantier B-05
-- ============================================================================
-- La colonne `vat_rate` est un POURCENTAGE :
--   NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (vat_rate >= 0 AND vat_rate <= 100)
--
-- 64 lignes y stockaient pourtant une fraction (0,2 pour 20 %), soit un taux
-- déclaré de 0,2 %. Le montant encaissé restait juste — la TVA est calculée
-- sur le pays de destination, pas sur le produit — mais la donnée était fausse,
-- et tout calcul futur « TVA incluse » à partir du produit aurait été faux
-- d'un facteur 100.
--
-- Seules les valeurs strictement comprises entre 0 et 1 sont converties :
-- 0 % (exonération) est un taux légitime et reste intact. Aucun pays
-- n'applique un taux inférieur à 1 %.
--
-- Idempotent : rejouer ne modifie plus rien, la condition ne trouve plus de
-- ligne. La reprise est aussi faite dans le code
-- (`normalizeCatalogProductInput`) pour qu'une fraction ne puisse plus entrer.
-- ============================================================================

UPDATE public.products
SET vat_rate = vat_rate * 100
WHERE vat_rate > 0 AND vat_rate < 1;

UPDATE public.product_variants
SET vat_rate = vat_rate * 100
WHERE vat_rate > 0 AND vat_rate < 1;
