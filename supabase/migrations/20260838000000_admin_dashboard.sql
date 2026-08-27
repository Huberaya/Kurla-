-- ============================================================
-- KURLA ADMIN DASHBOARD & DAILY OPERATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.content_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'non-classe',
  excerpt TEXT,
  read_time TEXT,
  author TEXT,
  image_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_product_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_articles_status_updated ON public.content_articles(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  domains TEXT[] NOT NULL DEFAULT '{}',
  content TEXT NOT NULL,
  source_label TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_url TEXT,
  last_reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_sources_active ON public.ai_knowledge_sources(active, validation_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.coupons (
  code TEXT PRIMARY KEY,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  minimum_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (minimum_order_amount >= 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (discount_type <> 'percentage' OR discount_value <= 100),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_coupons_active_dates ON public.coupons(active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.catalog_search_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL CHECK (char_length(query) BETWEEN 2 AND 200),
  result_count INTEGER NOT NULL CHECK (result_count >= 0),
  country TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalog_search_events_no_result ON public.catalog_search_events(result_count, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created ON public.ai_usage_events(user_id, created_at DESC);

ALTER TABLE public.content_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published articles" ON public.content_articles;
CREATE POLICY "Public read published articles" ON public.content_articles FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Admins manage articles" ON public.content_articles;
CREATE POLICY "Admins manage articles" ON public.content_articles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage AI knowledge sources" ON public.ai_knowledge_sources;
CREATE POLICY "Admins manage AI knowledge sources" ON public.ai_knowledge_sources FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins read catalog search events" ON public.catalog_search_events;
CREATE POLICY "Admins read catalog search events" ON public.catalog_search_events FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins read AI usage events" ON public.ai_usage_events;
CREATE POLICY "Admins read AI usage events" ON public.ai_usage_events FOR SELECT USING (public.is_admin());

COMMENT ON TABLE public.content_articles IS 'Editorial articles managed from the administrator dashboard.';
COMMENT ON TABLE public.ai_knowledge_sources IS 'Sources reviewed by the team before they can be used as active AI context.';
COMMENT ON TABLE public.coupons IS 'Coupon definitions; application at checkout remains server-authoritative.';
COMMENT ON TABLE public.catalog_search_events IS 'Anonymised catalog searches used to identify recurring zero-result queries.';
COMMENT ON TABLE public.ai_usage_events IS 'Operational AI usage events used for transparent dashboard rates.';
