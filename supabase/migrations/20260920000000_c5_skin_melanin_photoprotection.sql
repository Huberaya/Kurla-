-- C5 — mélanine, HPI et photoprotection.
-- Les colonnes sont des états de collecte/relecture, pas des preuves en elles-mêmes.
-- Les preuves détaillées sont rattachées au SKU dans skin_photoprotection_evidence.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS skin_hpi_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skin_hpi_ontology_version text NOT NULL DEFAULT '2026-09-19.c5',
  ADD COLUMN IF NOT EXISTS spf_uva_evidence_status text NOT NULL DEFAULT 'not_provided'
    CHECK (spf_uva_evidence_status IN ('verified', 'pending', 'not_provided')),
  ADD COLUMN IF NOT EXISTS photoprotection_evidence_status text NOT NULL DEFAULT 'not_provided'
    CHECK (photoprotection_evidence_status IN ('verified', 'pending', 'not_provided')),
  ADD COLUMN IF NOT EXISTS tested_lights text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visible_light_test_status text NOT NULL DEFAULT 'not_provided'
    CHECK (visible_light_test_status IN ('verified', 'pending', 'not_provided', 'not_applicable')),
  ADD COLUMN IF NOT EXISTS visible_light_claim boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS undertone_evidence_status text NOT NULL DEFAULT 'not_provided'
    CHECK (undertone_evidence_status IN ('verified', 'pending', 'not_provided'));

COMMENT ON COLUMN public.products.skin_hpi_codes IS
  'C5: observations HPI codées, sans diagnostic et sans déduction depuis la couleur.';
COMMENT ON COLUMN public.products.skin_hpi_ontology_version IS
  'Version de l''ontologie HPI appliquée à la fiche.';
COMMENT ON COLUMN public.products.spf_uva_evidence_status IS
  'C5: statut de la preuve SPF/UVA rattachée au SKU.';
COMMENT ON COLUMN public.products.photoprotection_evidence_status IS
  'C5: dossier photoprotection relu et traçable pour ce SKU.';
COMMENT ON COLUMN public.products.tested_lights IS
  'C5: conditions de lumière utilisées pour le rendu et le white cast.';
COMMENT ON COLUMN public.products.visible_light_test_status IS
  'C5: test lumière visible ; not_applicable est explicite quand aucune revendication ne le nécessite.';
COMMENT ON COLUMN public.products.undertone_evidence_status IS
  'C5: preuve des tests de sous-ton pour un SPF teinté.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_skin_hpi_codes_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_skin_hpi_codes_check
      CHECK (skin_hpi_codes <@ ARRAY['post_inflammatory_marks', 'post_acne_marks', 'post_friction_marks', 'sun_related_darkening', 'uneven_tone_observed', 'unknown']::text[]);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.skin_photoprotection_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('spf_uva', 'white_cast', 'visible_light', 'undertone')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'rejected', 'not_provided')),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('supplier_document', 'laboratory_report', 'controlled_test', 'scientific_literature', 'brand_claim', 'user_observation')),
  source_label TEXT NOT NULL CHECK (char_length(trim(source_label)) > 0),
  source_id TEXT,
  source_url TEXT,
  storage_path TEXT,
  captured_at DATE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  method TEXT,
  tested_phototypes TEXT[] NOT NULL DEFAULT '{}',
  tested_lights TEXT[] NOT NULL DEFAULT '{}',
  tested_undertones TEXT[] NOT NULL DEFAULT '{}',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skin_photo_evidence_locator_check CHECK (source_id IS NOT NULL OR source_url IS NOT NULL OR storage_path IS NOT NULL),
  CONSTRAINT skin_photo_evidence_verified_review_check CHECK (status <> 'verified' OR (captured_at IS NOT NULL AND reviewed_at IS NOT NULL AND method IS NOT NULL AND char_length(trim(method)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_skin_photo_evidence_product_type
  ON public.skin_photoprotection_evidence(product_id, evidence_type, status);
CREATE INDEX IF NOT EXISTS idx_skin_photo_evidence_phototypes
  ON public.skin_photoprotection_evidence USING gin(tested_phototypes);

ALTER TABLE public.skin_photoprotection_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage skin photoprotection evidence" ON public.skin_photoprotection_evidence;
CREATE POLICY "Admins manage skin photoprotection evidence"
  ON public.skin_photoprotection_evidence
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.skin_photoprotection_evidence IS
  'C5: pièces et tests rattachés à un SKU ; aucune simple URL marketing ne vaut preuve vérifiée.';
