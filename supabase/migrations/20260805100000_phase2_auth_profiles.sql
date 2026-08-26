-- ============================================================
-- KURLA BEAUTY - SUPABASE DATABASE SCHEMA MIGRATION (PHASE 2)
-- AUTHENTICATION, USER PROFILES & RLS HARDENING
-- ============================================================

-- 1. EXTEND PUBLIC.PROFILES WITH COMPLETE USER ATTRIBUTES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_range TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'FR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS texture TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS density TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scalp_condition TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sensitivity TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS concerns TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS product_preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';

-- 2. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'nom', ''),
    'customer',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. SAVED FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  routine_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USER ROUTINES TABLE
CREATE TABLE IF NOT EXISTS public.user_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  frequency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SECURE ROLE CHECKING FUNCTIONS (PREVENT RLS RECURSION & TAMPERING)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
  ) OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  r TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(r, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PERMISSIONS FOR SECURITY FUNCTIONS
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advice_sessions ENABLE ROW LEVEL SECURITY;

-- 7. STRICT RLS POLICIES - PUBLIC.PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = id AND role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE id = auth.uid()))
    OR public.is_admin()
  );

-- 8. STRICT RLS POLICIES - PUBLIC.ORDERS (PROTECTED BY USER_ID)
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
CREATE POLICY "Orders select policy" ON public.orders
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
CREATE POLICY "Orders insert policy" ON public.orders
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_admin() OR user_id IS NULL
  );

-- 9. RLS POLICIES - SAVED ITEMS & ROUTINES
DROP POLICY IF EXISTS "Users manage own saved items" ON public.saved_items;
CREATE POLICY "Users manage own saved items" ON public.saved_items
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own routines" ON public.user_routines;
CREATE POLICY "Users manage own routines" ON public.user_routines
  FOR ALL USING (auth.uid() = user_id);

-- 10. INDEXES FOR PERFORMANCE & SECURITY
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON public.saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routines_user_id ON public.user_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

