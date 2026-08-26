-- ============================================================
-- KURLA BEAUTY - PROFESSIONAL APPLICATIONS
-- Persisted KURLA Pro applications and admin review workflow.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.professional_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  profession TEXT NOT NULL,
  experience TEXT NOT NULL,
  portfolio_url TEXT,
  accepts_charter BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'under_review', 'approved', 'rejected')
  ),
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_applications_status
  ON public.professional_applications(status);
CREATE INDEX IF NOT EXISTS idx_professional_applications_created_at
  ON public.professional_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_professional_applications_user_id
  ON public.professional_applications(user_id);

ALTER TABLE public.professional_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own professional applications" ON public.professional_applications;
CREATE POLICY "Users view own professional applications"
  ON public.professional_applications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users create professional applications" ON public.professional_applications;
CREATE POLICY "Users create professional applications"
  ON public.professional_applications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Admins manage professional applications" ON public.professional_applications;
CREATE POLICY "Admins manage professional applications"
  ON public.professional_applications
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());
