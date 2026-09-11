-- C1 — contrat de commercialisation peau réellement achetable.
--
-- Ces colonnes ne constituent pas des preuves à elles seules. Elles rendent
-- explicites les faits à collecter et permettent au rapport C1 de distinguer
-- une fiche complète d'une simple formulation cible. Aucune fiche existante
-- n'est promue par cette migration.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS skin_objectives text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS active_ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_concentrations_status text NOT NULL DEFAULT 'not_provided'
    CHECK (active_concentrations_status IN ('verified', 'pending', 'not_provided')),
  ADD COLUMN IF NOT EXISTS skin_finish text,
  ADD COLUMN IF NOT EXISTS whitecast_risk text
    CHECK (whitecast_risk IS NULL OR whitecast_risk IN ('none', 'low', 'medium', 'high', 'not_tested')),
  ADD COLUMN IF NOT EXISTS whitecast_test_status text NOT NULL DEFAULT 'not_provided'
    CHECK (whitecast_test_status IN ('verified', 'pending', 'not_provided')),
  ADD COLUMN IF NOT EXISTS tested_phototypes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tested_undertones text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inci_visibility_status text NOT NULL DEFAULT 'not_provided'
    CHECK (inci_visibility_status IN ('verified', 'pending', 'not_provided')),
  ADD COLUMN IF NOT EXISTS manufacturing_status text NOT NULL DEFAULT 'not_provided'
    CHECK (manufacturing_status IN ('verified', 'pending', 'not_provided')),
  ADD COLUMN IF NOT EXISTS lot_reference text,
  ADD COLUMN IF NOT EXISTS best_before_or_pao text,
  ADD COLUMN IF NOT EXISTS is_tinted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.products.skin_objectives IS
  'C1 peau: objectifs utilisateur contrôlés, distincts des préoccupations.';
COMMENT ON COLUMN public.products.active_ingredients IS
  'C1 peau: actifs et concentrations provenant d’une source vérifiée; jamais déduits du nom.';
COMMENT ON COLUMN public.products.whitecast_risk IS
  'C1 SPF: notation whitecast explicite, notamment sur phototypes IV–VI.';
COMMENT ON COLUMN public.products.tested_phototypes IS
  'C1 SPF: phototypes effectivement inclus dans les essais, sans inférence.';
COMMENT ON COLUMN public.products.tested_undertones IS
  'C1 SPF teinté: sous-tons effectivement évalués.';
COMMENT ON COLUMN public.products.lot_reference IS
  'C1: lot ou mécanisme de traçabilité du lot reçu.';
COMMENT ON COLUMN public.products.best_before_or_pao IS
  'C1: DDM ou PAO telle que fournie par le fabricant.';

CREATE INDEX IF NOT EXISTS idx_products_skin_c1_scope
  ON public.products(category, is_active, catalog_status)
  WHERE category = 'peau';
