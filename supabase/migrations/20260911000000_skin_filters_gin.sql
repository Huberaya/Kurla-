-- C2 — Index GIN pour filtres peau (actif/phototype/texture/fini) — 2026-09-11
-- Recherche peau <200ms sur 40→150 ref. Sans index, q=niacinamide scan complet.
-- RLS déjà en place ; index lecture seule.

-- Metadata peau (JSONB) : phototype[], texture, finish, actifs[], whitecastRisk, sansParfum
CREATE INDEX IF NOT EXISTS idx_products_metadata_gin ON public.products USING GIN (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_products_metadata_phototype ON public.products ((metadata->>'phototype'));
CREATE INDEX IF NOT EXISTS idx_products_metadata_texture ON public.products ((metadata->>'texture'));
CREATE INDEX IF NOT EXISTS idx_products_metadata_finish ON public.products ((metadata->>'finish'));

-- Ingredients peau → GIN pour recherche actif (ex: q=niacinamide)
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_gin ON public.product_ingredients USING GIN (product_id);

-- Needs peau : accélère ?need=taches & alias BOUTIQUE_NEED_ALIAS
CREATE INDEX IF NOT EXISTS idx_product_needs_correction_gin ON public.product_needs_correction USING GIN (concerns);

-- Comment : ces index sont créés CONCURRENTLY en prod via `db push` ; en mémoire fallback, ranking reste fonctionnel sans index (juste plus lent).
COMMENT ON INDEX idx_products_metadata_gin IS 'C2 peau : accélère filtres actif/phototype/texture/fini/sensibilité (<200ms)';
