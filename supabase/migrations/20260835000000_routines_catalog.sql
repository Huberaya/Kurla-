-- Routines and bundles are catalog data, not client-side fixtures.
CREATE TABLE IF NOT EXISTS public.routines (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  benefit TEXT,
  duration TEXT,
  frequency TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10, 2),
  image_url TEXT,
  image_ownership_status TEXT NOT NULL DEFAULT 'unverified' CHECK (image_ownership_status IN ('brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified')),
  images_validation_status TEXT NOT NULL DEFAULT 'not_provided' CHECK (images_validation_status IN ('verified', 'pending', 'not_provided')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'unavailable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routine_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id TEXT NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  step_number INTEGER NOT NULL CHECK (step_number > 0),
  title TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  UNIQUE(routine_id, step_number, product_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_routine_items_routine_step ON public.routine_items(routine_id, step_number);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public published routines" ON public.routines;
CREATE POLICY "Public published routines" ON public.routines FOR SELECT USING (
  status = 'published'
  AND (image_url IS NULL OR (images_validation_status = 'verified' AND image_ownership_status IN ('brand_provided', 'licensed')))
  AND EXISTS (
    SELECT 1 FROM public.routine_items ri
    JOIN public.products p ON p.id = ri.product_id
    WHERE ri.routine_id = routines.id AND public.product_is_publishable(p)
  )
);
DROP POLICY IF EXISTS "Public published routine items" ON public.routine_items;
CREATE POLICY "Public published routine items" ON public.routine_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_items.routine_id AND r.status = 'published')
  AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = routine_items.product_id AND public.product_is_publishable(p))
);
DROP POLICY IF EXISTS "Admins manage routines" ON public.routines;
CREATE POLICY "Admins manage routines" ON public.routines FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage routine items" ON public.routine_items;
CREATE POLICY "Admins manage routine items" ON public.routine_items FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
