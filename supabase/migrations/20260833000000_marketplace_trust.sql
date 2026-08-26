-- ============================================================
-- KURLA MARKETPLACE - TRUSTED CATALOG & CUSTOMER COMMERCE
-- Product facts are nullable on purpose: an unpublished product must not
-- display invented information. Publication is blocked until the quality
-- checks are complete.
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS benefit_primary TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS for_who TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS not_ideal_if TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS how_to_use TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS routine_step TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inci TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS community_brand BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_promo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category_tag TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS benefit_primary TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS texture TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fragrance TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usage_frequency TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_label TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS estimated_yield TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredient_roles JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allergens TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS contains_fragrance BOOLEAN;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin_country TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS certifications JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS returns_policy TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_policy JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalog_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredient_verification_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS claims_validation_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images_validation_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_validation_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS certifications_validation_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS translations_validation_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand_verification_status TEXT NOT NULL DEFAULT 'not_provided';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_ownership_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_catalog_reviewed_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_catalog_updated_at TIMESTAMPTZ;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_catalog_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_catalog_status_check
  CHECK (catalog_status IN ('draft', 'pending_review', 'published', 'unavailable'));
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_image_ownership_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_image_ownership_status_check
  CHECK (image_ownership_status IN ('brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified'));
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_quality_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_quality_status_check
  CHECK (
    ingredient_verification_status IN ('verified', 'pending', 'not_provided') AND
    claims_validation_status IN ('verified', 'pending', 'not_provided') AND
    images_validation_status IN ('verified', 'pending', 'not_provided') AND
    stock_validation_status IN ('verified', 'pending', 'not_provided') AND
    certifications_validation_status IN ('verified', 'pending', 'not_provided') AND
    translations_validation_status IN ('verified', 'pending', 'not_provided') AND
    brand_verification_status IN ('verified', 'pending', 'not_provided')
  );

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS option_type TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS option_value TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS weight_grams INTEGER;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS format_label TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS shade TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS scent TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_option_type_check;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_option_type_check
  CHECK (option_type IS NULL OR option_type IN ('weight', 'format', 'shade', 'scent', 'size'));
CREATE INDEX IF NOT EXISTS idx_product_variants_product_active
  ON public.product_variants(product_id, is_active);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved
  ON public.reviews(product_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  asker_email TEXT,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 1000),
  answer TEXT,
  answered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_product_questions_product_status
  ON public.product_questions(product_id, status, created_at DESC);
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view answered product questions" ON public.product_questions;
CREATE POLICY "Public view answered product questions" ON public.product_questions
  FOR SELECT USING (status = 'answered' OR user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Users ask product questions" ON public.product_questions;
CREATE POLICY "Users ask product questions" ON public.product_questions
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage product questions" ON public.product_questions;
CREATE POLICY "Admins manage product questions" ON public.product_questions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.catalog_validation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  validator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('ingredients', 'claims', 'images', 'stock', 'brand', 'certifications', 'translations')),
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'pending')),
  evidence_url TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalog_validation_product_created
  ON public.catalog_validation_events(product_id, created_at DESC);
ALTER TABLE public.catalog_validation_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage catalog validation" ON public.catalog_validation_events;
CREATE POLICY "Admins manage catalog validation" ON public.catalog_validation_events
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.product_waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'FR',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, variant_id, email, country)
);
CREATE INDEX IF NOT EXISTS idx_product_waitlist_product_status
  ON public.product_waitlist(product_id, status);
ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own product waitlist" ON public.product_waitlist;
CREATE POLICY "Users manage own product waitlist" ON public.product_waitlist
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage product waitlist" ON public.product_waitlist;
CREATE POLICY "Admins manage product waitlist" ON public.product_waitlist
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.product_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  frequency TEXT NOT NULL CHECK (frequency IN ('30_days', '45_days', '60_days', '90_days')),
  country TEXT NOT NULL DEFAULT 'FR',
  payment_method TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'cancelled')),
  next_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_subscriptions_user_status
  ON public.product_subscriptions(user_id, status, next_order_at);
ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own product subscriptions" ON public.product_subscriptions;
CREATE POLICY "Users manage own product subscriptions" ON public.product_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage product subscriptions" ON public.product_subscriptions;
CREATE POLICY "Admins manage product subscriptions" ON public.product_subscriptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Reviews are public only after moderation. Verified purchase is set by the
-- server after checking a paid order line; clients cannot self-assert it.
DROP POLICY IF EXISTS "Users insert reviews" ON public.reviews;
CREATE POLICY "Users insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id AND verified_purchase = FALSE);
DROP POLICY IF EXISTS "Users view own reviews" ON public.reviews;
CREATE POLICY "Users view own reviews" ON public.reviews
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.is_admin());

-- Only fully reviewed products are published to the customer catalogue.
CREATE OR REPLACE FUNCTION public.product_is_publishable(p public.products)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT p.catalog_status = 'published'
    AND p.ingredient_verification_status = 'verified'
    AND p.claims_validation_status = 'verified'
    AND p.images_validation_status = 'verified'
    AND p.stock_validation_status = 'verified'
    AND p.certifications_validation_status = 'verified'
    AND p.translations_validation_status = 'verified'
    AND p.brand_verification_status = 'verified'
    AND p.image_ownership_status IN ('brand_provided', 'licensed');
$$;

DROP POLICY IF EXISTS "Public products viewable by everyone" ON public.products;
CREATE POLICY "Public products viewable by everyone" ON public.products
  FOR SELECT USING (is_active = TRUE AND public.product_is_publishable(products));

COMMENT ON FUNCTION public.product_is_publishable(public.products) IS
  'Quality gate used by merchandising and catalog APIs before customer publication.';
