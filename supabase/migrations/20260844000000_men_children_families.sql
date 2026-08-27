-- CHANTIER — Hommes, enfants et familles
-- Family accounts use age bands instead of birth dates, and never store child
-- photos or unnecessary identifying information.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS audience_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_age_band TEXT,
  ADD COLUMN IF NOT EXISTS recommended_age_min INTEGER,
  ADD COLUMN IF NOT EXISTS recommended_age_max INTEGER,
  ADD COLUMN IF NOT EXISTS minor_safety_status TEXT NOT NULL DEFAULT 'not_provided',
  ADD COLUMN IF NOT EXISTS adult_only_actives TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parental_supervision_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_supervision_status TEXT NOT NULL DEFAULT 'not_provided';

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_recommended_age_band_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_recommended_age_band_check
  CHECK (recommended_age_band IS NULL OR recommended_age_band IN ('baby', 'child', 'teen', 'adult', 'all_ages', 'not_provided'));
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_minor_safety_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_minor_safety_status_check
  CHECK (minor_safety_status IN ('verified', 'pending', 'not_provided'));
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_image_supervision_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_image_supervision_status_check
  CHECK (image_supervision_status IN ('verified', 'pending', 'not_provided'));
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_recommended_age_range_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_recommended_age_range_check
  CHECK (
    (recommended_age_min IS NULL OR recommended_age_min >= 0)
    AND (recommended_age_max IS NULL OR recommended_age_max >= 0)
    AND (recommended_age_min IS NULL OR recommended_age_max IS NULL OR recommended_age_max >= recommended_age_min)
  );
CREATE INDEX IF NOT EXISTS idx_products_family_audience ON public.products USING GIN(audience_tags);

CREATE TABLE IF NOT EXISTS public.family_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Ma famille' CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_spaces_owner ON public.family_spaces(owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family_spaces(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  profile_kind TEXT NOT NULL CHECK (profile_kind IN ('adult', 'child')),
  age_band TEXT NOT NULL CHECK (age_band IN ('baby', 'child', 'teen', 'adult')),
  consent_status TEXT NOT NULL DEFAULT 'not_required' CHECK (consent_status IN ('not_required', 'pending', 'granted', 'revoked')),
  consent_version TEXT,
  consent_at TIMESTAMPTZ,
  care_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((profile_kind = 'child' AND age_band IN ('baby', 'child', 'teen')) OR (profile_kind = 'adult' AND age_band = 'adult')),
  CHECK ((consent_status = 'granted' AND consent_at IS NOT NULL AND consent_version IS NOT NULL) OR consent_status <> 'granted')
);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.family_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.family_spaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('routine', 'calendar', 'gift')),
  audience TEXT NOT NULL DEFAULT 'shared' CHECK (audience IN ('shared', 'selected')),
  member_ids UUID[] NOT NULL DEFAULT '{}',
  product_ids TEXT[] NOT NULL DEFAULT '{}',
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_plans_family_status ON public.family_plans(family_id, status, updated_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family spaces owner access" ON public.family_spaces;
CREATE POLICY "Family spaces owner access" ON public.family_spaces
  FOR ALL USING (owner_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Family members owner access" ON public.family_members;
CREATE POLICY "Family members owner access" ON public.family_members
  FOR ALL USING (
    public.is_admin() OR EXISTS (SELECT 1 FROM public.family_spaces f WHERE f.id = family_id AND f.owner_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (SELECT 1 FROM public.family_spaces f WHERE f.id = family_id AND f.owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Family plans owner access" ON public.family_plans;
CREATE POLICY "Family plans owner access" ON public.family_plans
  FOR ALL USING (
    public.is_admin() OR EXISTS (SELECT 1 FROM public.family_spaces f WHERE f.id = family_id AND f.owner_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (SELECT 1 FROM public.family_spaces f WHERE f.id = family_id AND f.owner_user_id = auth.uid())
  );

COMMENT ON TABLE public.family_members IS 'Privacy-minimized household profiles; age bands only, no child birth dates or photos.';
COMMENT ON COLUMN public.family_members.consent_status IS 'Parental consent state for a minor profile; recommendations remain restricted while pending or revoked.';
COMMENT ON COLUMN public.family_plans.plan_type IS 'Shared family routine, care calendar, or gift/coffret plan.';
COMMENT ON COLUMN public.products.minor_safety_status IS 'Explicit editorial status before a product can be recommended for a minor.';
