-- CHANTIER 6 — lancement France & traction
-- Données opérationnelles minimisées : aucun carnet d'adresses ni compte-rendu
-- libre n'est nécessaire pour piloter le lancement.

CREATE TABLE IF NOT EXISTS public.launch_interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ref TEXT NOT NULL CHECK (char_length(btrim(participant_ref)) BETWEEN 1 AND 120),
  segment TEXT NOT NULL DEFAULT 'client' CHECK (segment IN ('client', 'pro', 'other')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'no_show', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT launch_interviews_completed_date_check
    CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_launch_interviews_completed_at
  ON public.launch_interviews(status, completed_at DESC);

CREATE TABLE IF NOT EXISTS public.launch_partner_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'active', 'paused', 'declined')),
  cohort TEXT NOT NULL DEFAULT 'france-2026',
  salon_os_status TEXT NOT NULL DEFAULT 'not_offered' CHECK (salon_os_status IN ('not_offered', 'offered', 'activated', 'declined')),
  routine_cosigned BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (professional_id, cohort)
);
CREATE INDEX IF NOT EXISTS idx_launch_partner_links_status
  ON public.launch_partner_links(cohort, status, updated_at DESC);

-- Idempotence si la table a été créée par une première version de la migration.
ALTER TABLE public.launch_partner_links
  ADD COLUMN IF NOT EXISTS salon_os_status TEXT NOT NULL DEFAULT 'not_offered';
ALTER TABLE public.launch_partner_links
  ADD COLUMN IF NOT EXISTS routine_cosigned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.launch_partner_links DROP CONSTRAINT IF EXISTS launch_partner_links_salon_os_status_check;
ALTER TABLE public.launch_partner_links
  ADD CONSTRAINT launch_partner_links_salon_os_status_check
  CHECK (salon_os_status IN ('not_offered', 'offered', 'activated', 'declined'));

CREATE TABLE IF NOT EXISTS public.launch_nps_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campaign_key TEXT NOT NULL DEFAULT 'france-2026',
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  source TEXT NOT NULL DEFAULT 'launch' CHECK (source IN ('launch', 'post_purchase', 'interview', 'in_app')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, campaign_key)
);
CREATE INDEX IF NOT EXISTS idx_launch_nps_campaign_created
  ON public.launch_nps_responses(campaign_key, created_at DESC);

ALTER TABLE public.launch_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_partner_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_nps_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage launch interviews" ON public.launch_interviews;
CREATE POLICY "Admins manage launch interviews" ON public.launch_interviews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage launch partner links" ON public.launch_partner_links;
CREATE POLICY "Admins manage launch partner links" ON public.launch_partner_links
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage launch NPS" ON public.launch_nps_responses;
CREATE POLICY "Admins manage launch NPS" ON public.launch_nps_responses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.launch_interviews IS 'Suivi minimalisé des entretiens hebdomadaires : référence interne, segment et statut, sans notes personnelles.';
COMMENT ON TABLE public.launch_partner_links IS 'Suivi des partenariats locticiennes/coiffeuses du lancement France.';
COMMENT ON TABLE public.launch_nps_responses IS 'Score NPS du lancement, sans commentaire libre ni donnée personnelle supplémentaire.';
