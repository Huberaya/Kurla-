-- ============================================================
-- KURLA BEAUTY - KURLA ID BEAUTY PROFILE
-- Explainable hair/skin profile, history and optional private photos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.beauty_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  photo_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.beauty_profile_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile JSONB NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  source TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.beauty_profile_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  consent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beauty_profile_history_user_created
  ON public.beauty_profile_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beauty_profile_photos_user_created
  ON public.beauty_profile_photos(user_id, created_at DESC);

ALTER TABLE public.beauty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beauty_profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beauty_profile_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own beauty profile" ON public.beauty_profiles;
CREATE POLICY "Users view own beauty profile"
  ON public.beauty_profiles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users view own beauty profile history" ON public.beauty_profile_history;
CREATE POLICY "Users view own beauty profile history"
  ON public.beauty_profile_history
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users view own beauty profile photos" ON public.beauty_profile_photos;
CREATE POLICY "Users view own beauty profile photos"
  ON public.beauty_profile_photos
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- Photos are private and are written/deleted by the authenticated server only.
-- No public bucket or public object policy is created.
INSERT INTO storage.buckets (id, name, public)
VALUES ('beauty-profile-photos', 'beauty-profile-photos', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;
