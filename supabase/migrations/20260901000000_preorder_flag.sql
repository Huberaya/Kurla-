-- ============================================================
-- KURLA BEAUTY — Précommandes catalogue
-- ============================================================
-- Les 18 SKU du plan de lancement sont publiés en PRÉCOMMANDE tant que le
-- premier lot n'est pas réceptionné (sourcing hybride non encore signé).
-- Ce flag distingue un produit réellement disponible d'une précommande,
-- sans toucher à la gouvernance de publication (catalog_status etc.).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN NOT NULL DEFAULT FALSE;

-- Le front/tunnel peut filtrer ou étiqueter les précommandes.
CREATE INDEX IF NOT EXISTS idx_products_preorder ON public.products (is_preorder) WHERE is_preorder = TRUE;
