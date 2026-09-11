-- C8 — pilote d’analyse photo cosmétique.
-- Cette table est une provenance/audit technique, pas un profil dérivé.
-- Aucun phototype ou éclairage n'est déduit : les valeurs sont déclarées par le membre.

CREATE TABLE IF NOT EXISTS public.photo_ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.beauty_profile_photos(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('completed', 'quality_rejected', 'metadata_rejected', 'provider_unconfigured', 'provider_failed')),
  scope TEXT NOT NULL CHECK (scope = 'skin_cosmetic_observation'),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  response_schema_version TEXT NOT NULL DEFAULT 'C8-photo-pilot-response-schema-v1',
  quality_gate_version TEXT NOT NULL,
  input_sha256 TEXT NOT NULL CHECK (input_sha256 ~ '^[0-9a-f]{64}$'),
  declared_phototype TEXT CHECK (declared_phototype IS NULL OR declared_phototype IN ('I', 'II', 'III', 'IV', 'V', 'VI')),
  declared_lighting TEXT CHECK (declared_lighting IS NULL OR declared_lighting IN ('daylight_even', 'indoor_even')),
  phototype_source TEXT NOT NULL DEFAULT 'member_declared' CHECK (phototype_source = 'member_declared'),
  lighting_source TEXT NOT NULL DEFAULT 'member_declared' CHECK (lighting_source = 'member_declared'),
  validation_protocol TEXT NOT NULL DEFAULT 'C8-photo-pilot-validation-v1',
  validation_status TEXT NOT NULL DEFAULT 'pilot_stratified_not_validated' CHECK (validation_status = 'pilot_stratified_not_validated'),
  quality JSONB,
  output JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CHECK (status = 'completed' OR error_code IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_photo_ai_analyses_user_created
  ON public.photo_ai_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_ai_analyses_photo
  ON public.photo_ai_analyses(photo_id);

ALTER TABLE public.photo_ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own photo AI provenance" ON public.photo_ai_analyses;
CREATE POLICY "Members read own photo AI provenance" ON public.photo_ai_analyses
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

COMMENT ON TABLE public.photo_ai_analyses IS
  'Provenance complète du pilote photo C8. Les sorties sont cosmétiques et expérimentales, jamais un diagnostic.';
COMMENT ON COLUMN public.photo_ai_analyses.declared_phototype IS
  'Phototype déclaré par le membre pour stratification indépendante ; jamais inféré par le modèle.';
COMMENT ON COLUMN public.photo_ai_analyses.declared_lighting IS
  'Éclairage déclaré par le membre ; le pilote accepte uniquement une lumière régulière.';
