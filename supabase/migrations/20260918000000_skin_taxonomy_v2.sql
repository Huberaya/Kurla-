-- C2 — taxonomie peau v2 : séparer les dimensions au lieu de surcharger
-- `products.concerns` (besoins historiques cheveux/catalogue).
-- Les valeurs restent contrôlées par kurla_taxonomies / kurla_taxonomy_terms.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS skin_objectives text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skin_concerns text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skin_texture_code text
    CHECK (skin_texture_code IS NULL OR skin_texture_code IN ('gel', 'lotion', 'creme', 'baume', 'huile')),
  ADD COLUMN IF NOT EXISTS skin_finish_code text
    CHECK (skin_finish_code IS NULL OR skin_finish_code IN ('mat', 'naturel', 'glowy')),
  ADD COLUMN IF NOT EXISTS skin_supported_phototypes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skin_taxonomy_version text NOT NULL DEFAULT '2026-09-18.c2';

COMMENT ON COLUMN public.products.skin_objectives IS
  'C2: objectifs peau contrôlés, distincts des préoccupations et des besoins génériques.';
COMMENT ON COLUMN public.products.skin_concerns IS
  'C2: préoccupations peau contrôlées, distinctes des besoins génériques de concerns/needs.';
COMMENT ON COLUMN public.products.skin_texture_code IS
  'C2: code texture contrôlé, distinct de la description sensorielle libre.';
COMMENT ON COLUMN public.products.skin_finish_code IS
  'C2: code fini contrôlé, distinct de la description sensorielle libre.';
COMMENT ON COLUMN public.products.skin_supported_phototypes IS
  'C2: phototypes auxquels la fiche est documentée comme adaptée; ne pas déduire de toneDepth.';
COMMENT ON COLUMN public.products.skin_taxonomy_version IS
  'Version du contrat de taxonomie peau appliqué à la fiche.';

CREATE INDEX IF NOT EXISTS idx_products_skin_concerns_gin
  ON public.products USING gin (skin_concerns);
CREATE INDEX IF NOT EXISTS idx_products_skin_types_gin
  ON public.products USING gin (skin_types);
CREATE INDEX IF NOT EXISTS idx_products_skin_objectives_gin
  ON public.products USING gin (skin_objectives);
