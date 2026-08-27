-- ============================================================
-- KURLA CATALOG MANAGEMENT
-- Commercial catalog fields are explicit and nullable where source data may
-- be missing. A record remains private until the existing trust gate passes.
-- ============================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalog_category_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS target_audiences TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (vat_rate >= 0 AND vat_rate <= 100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_includes_vat BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_price NUMERIC(10,2) CHECK (promotion_price IS NULL OR promotion_price >= 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_starts_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_ends_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warnings TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_supplier TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalog_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) CHECK (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100));
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS promotion_price NUMERIC(10,2) CHECK (promotion_price IS NULL OR promotion_price >= 0);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS promotion_starts_at TIMESTAMPTZ;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS promotion_ends_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON public.product_variants(barcode) WHERE barcode IS NOT NULL;

ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS image_type TEXT NOT NULL DEFAULT 'gallery';
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS ownership_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS source_note TEXT;
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_ownership_status_check;
ALTER TABLE public.product_images ADD CONSTRAINT product_images_ownership_status_check
  CHECK (ownership_status IN ('brand_provided', 'licensed', 'editorial', 'illustrative', 'unverified'));
ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_validation_status_check;
ALTER TABLE public.product_images ADD CONSTRAINT product_images_validation_status_check
  CHECK (validation_status IN ('verified', 'pending', 'rejected', 'not_provided'));
CREATE INDEX IF NOT EXISTS idx_product_images_product_position ON public.product_images(product_id, position);

-- Controlled merchandising vocabulary. Product rows keep tag slugs so one
-- product can be assigned to several precise needs without inventing labels.
CREATE TABLE IF NOT EXISTS public.catalog_categories (
  slug TEXT PRIMARY KEY,
  department TEXT NOT NULL CHECK (department IN ('cheveux', 'peau')),
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.catalog_categories (slug, department, label, sort_order) VALUES
  ('cheveux_ondules', 'cheveux', 'Cheveux ondulés', 10),
  ('cheveux_boucles', 'cheveux', 'Cheveux bouclés', 20),
  ('cheveux_frises', 'cheveux', 'Cheveux frisés', 30),
  ('cheveux_crepus', 'cheveux', 'Cheveux crépus', 40),
  ('locks', 'cheveux', 'Locks', 50),
  ('tresses', 'cheveux', 'Tresses', 60),
  ('extensions', 'cheveux', 'Extensions', 70),
  ('perruques', 'cheveux', 'Perruques', 80),
  ('cheveux_colores', 'cheveux', 'Cheveux colorés', 90),
  ('cheveux_defrises', 'cheveux', 'Cheveux défrisés', 100),
  ('barbe', 'cheveux', 'Barbe', 110),
  ('cuir_chevelu', 'cheveux', 'Cuir chevelu', 120),
  ('peau_seche', 'peau', 'Peau sèche', 210),
  ('peau_grasse', 'peau', 'Peau grasse', 220),
  ('peau_mixte', 'peau', 'Peau mixte', 230),
  ('peau_sensible', 'peau', 'Peau sensible', 240),
  ('imperfections', 'peau', 'Imperfections', 250),
  ('acne', 'peau', 'Acné', 260),
  ('taches', 'peau', 'Taches', 270),
  ('hyperpigmentation', 'peau', 'Hyperpigmentation', 280),
  ('cicatrices', 'peau', 'Cicatrices', 290),
  ('rasage', 'peau', 'Rasage', 300),
  ('poils_incarnes', 'peau', 'Poils incarnés', 310),
  ('protection_solaire', 'peau', 'Protection solaire', 320),
  ('corps', 'peau', 'Corps', 330),
  ('levres', 'peau', 'Lèvres', 340),
  ('mains', 'peau', 'Mains', 350),
  ('pieds', 'peau', 'Pieds', 360)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, department = EXCLUDED.department, sort_order = EXCLUDED.sort_order, updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.catalog_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'csv', 'supplier')),
  supplier TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'completed_with_errors', 'failed')),
  rows_received INTEGER NOT NULL DEFAULT 0 CHECK (rows_received >= 0),
  rows_imported INTEGER NOT NULL DEFAULT 0 CHECK (rows_imported >= 0),
  rows_rejected INTEGER NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
  error_report JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_catalog_imports_created ON public.catalog_imports(created_at DESC);

CREATE TABLE IF NOT EXISTS public.catalog_import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID NOT NULL REFERENCES public.catalog_imports(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  external_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('imported', 'rejected')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_import ON public.catalog_import_rows(import_id, row_number);

ALTER TABLE public.catalog_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage catalog imports" ON public.catalog_imports;
CREATE POLICY "Admins manage catalog imports" ON public.catalog_imports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage catalog import rows" ON public.catalog_import_rows;
CREATE POLICY "Admins manage catalog import rows" ON public.catalog_import_rows FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public read active catalog categories" ON public.catalog_categories;
CREATE POLICY "Public read active catalog categories" ON public.catalog_categories FOR SELECT USING (active = TRUE);
DROP POLICY IF EXISTS "Admins manage catalog categories" ON public.catalog_categories;
CREATE POLICY "Admins manage catalog categories" ON public.catalog_categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Supplier SKU is only unique inside a supplier feed. Empty values remain
-- allowed because no supplier identifier may be fabricated.
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_supplier_sku
  ON public.products(source_supplier, supplier_sku)
  WHERE source_supplier IS NOT NULL AND supplier_sku IS NOT NULL AND supplier_sku <> '';

-- The browser consumes /api/products, not Supabase tables. Revoke raw catalog
-- reads from public roles so stock, supplier provenance and validation columns
-- cannot leak through a direct anon/authenticated PostgREST request.
REVOKE SELECT ON public.products, public.product_variants, public.product_images, public.inventory FROM anon, authenticated;

COMMENT ON TABLE public.catalog_imports IS 'Audit trail for manual, CSV and supplier catalog ingestion.';
COMMENT ON COLUMN public.products.target_audiences IS 'Declared audiences only; empty means not renseigné.';
COMMENT ON COLUMN public.products.warnings IS 'Warnings supplied by the brand/supplier; never generated as product facts.';
COMMENT ON COLUMN public.products.vat_rate IS 'VAT rate applied to the displayed price; source must be confirmed by the operator.';

-- The historical seed remains available in source control for development and
-- tests, but must not be the commercial catalog. Quarantine those demo rows in
-- a real deployment; an operator can create a sourced product through /admin.
UPDATE public.products
SET is_active = FALSE,
    catalog_status = 'unavailable',
    last_catalog_updated_at = NOW(),
    updated_at = NOW()
WHERE id IN ('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16');

-- Keep the database policy at least as strict as the server projection:
-- facts and availability must exist in addition to the validation statuses.
CREATE OR REPLACE FUNCTION public.product_is_publishable(p public.products)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT p.is_active = TRUE
    AND p.catalog_status = 'published'
    AND p.ingredient_verification_status = 'verified'
    AND p.claims_validation_status = 'verified'
    AND p.images_validation_status = 'verified'
    AND p.stock_validation_status = 'verified'
    AND p.certifications_validation_status = 'verified'
    AND p.translations_validation_status = 'verified'
    AND p.brand_verification_status = 'verified'
    AND p.image_ownership_status IN ('brand_provided', 'licensed')
    AND NULLIF(BTRIM(COALESCE(p.brand, '')), '') IS NOT NULL
    AND (COALESCE(array_length(p.ingredients, 1), 0) > 0 OR NULLIF(BTRIM(COALESCE(p.inci, '')), '') IS NOT NULL)
    AND (NULLIF(BTRIM(COALESCE(p.image_url, '')), '') IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.product_images image WHERE image.product_id = p.id
    ))
    AND COALESCE(array_length(p.country_availability, 1), 0) > 0
    AND (p.is_promo = FALSE OR (p.promotion_price IS NOT NULL AND p.promotion_price <= p.price));
$$;
