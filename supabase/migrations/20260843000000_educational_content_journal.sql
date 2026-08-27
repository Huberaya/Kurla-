-- CHANTIER — Contenus éducatifs et journal
-- The existing content_articles table becomes the editorial content library.
-- Legacy rows keep their data but are not newly marked as evidence-backed.
-- The IF NOT EXISTS guard also lets an operator repair a deployment where the
-- historical CMS migration was recorded but the table was never created.

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

ALTER TABLE public.content_articles
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_level TEXT NOT NULL DEFAULT 'not_provided',
  ADD COLUMN IF NOT EXISTS medical_warning TEXT,
  ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS duration TEXT;

ALTER TABLE public.content_articles DROP CONSTRAINT IF EXISTS content_articles_content_type_check;
ALTER TABLE public.content_articles
  ADD CONSTRAINT content_articles_content_type_check
  CHECK (content_type IN ('article', 'video', 'guide', 'ingredient_sheet', 'routine'));

ALTER TABLE public.content_articles DROP CONSTRAINT IF EXISTS content_articles_evidence_level_check;
ALTER TABLE public.content_articles
  ADD CONSTRAINT content_articles_evidence_level_check
  CHECK (evidence_level IN ('not_provided', 'low', 'moderate', 'high', 'expert_consensus'));

CREATE INDEX IF NOT EXISTS idx_content_articles_editorial_filters
  ON public.content_articles(status, content_type, topic, updated_at DESC);

ALTER TABLE public.content_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage articles" ON public.content_articles;
CREATE POLICY "Admins manage articles" ON public.content_articles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- A published item must expose enough provenance for a reader to understand
-- what is known and what remains unprovided. Existing incomplete rows are kept
-- but become unavailable publicly until an editor completes their metadata.
DROP POLICY IF EXISTS "Public read published articles" ON public.content_articles;
DROP POLICY IF EXISTS "Public read published educational content" ON public.content_articles;
CREATE POLICY "Public read published educational content" ON public.content_articles
  FOR SELECT USING (
    status = 'published'
    AND NULLIF(BTRIM(author), '') IS NOT NULL
    AND NULLIF(BTRIM(language), '') IS NOT NULL
    AND NULLIF(BTRIM(topic), '') IS NOT NULL
    AND NULLIF(BTRIM(content), '') IS NOT NULL
    AND (content_type <> 'video' OR NULLIF(BTRIM(media_url), '') IS NOT NULL)
    AND jsonb_typeof(translations) = 'object'
    AND translations <> '{}'::jsonb
    AND jsonb_typeof(sources) = 'array'
    AND jsonb_array_length(sources) > 0
    AND evidence_level <> 'not_provided'
  );

COMMENT ON TABLE public.content_articles IS 'Editorial CMS for articles, videos, guides, ingredient sheets and educational routines.';
COMMENT ON COLUMN public.content_articles.sources IS 'Editorial provenance records: label, optional URL, publisher, access date and note.';
COMMENT ON COLUMN public.content_articles.evidence_level IS 'Declared evidence level; not_provided is never presented as proof.';
COMMENT ON COLUMN public.content_articles.translations IS 'Explicit translated versions indexed by BCP-47-like locale.';
