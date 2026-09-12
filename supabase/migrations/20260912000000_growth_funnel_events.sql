-- KURLA Growth Funnel — événements first-party minimisés.
-- Aucun user_id, email ou donnée de profil n'est stocké ici. Les événements
-- servent uniquement à mesurer le funnel anonyme et à alimenter le cockpit.

CREATE TABLE IF NOT EXISTS public.growth_funnel_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL CHECK (event_name IN (
    'page_view', 'view_item', 'view_item_list', 'diagnostic_start',
    'diagnostic_complete', 'select_promotion', 'add_to_cart', 'begin_checkout',
    'purchase', 'generate_lead', 'sign_up', 'search', 'ai_assistant_message'
  )),
  session_id TEXT NOT NULL CHECK (char_length(session_id) BETWEEN 8 AND 128),
  path TEXT NOT NULL DEFAULT '/' CHECK (char_length(path) BETWEEN 1 AND 240),
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_funnel_events_name_time
  ON public.growth_funnel_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_funnel_events_session_time
  ON public.growth_funnel_events(session_id, occurred_at DESC);

ALTER TABLE public.growth_funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read growth funnel events" ON public.growth_funnel_events;
CREATE POLICY "Admins read growth funnel events"
  ON public.growth_funnel_events FOR SELECT USING (public.is_admin());

COMMENT ON TABLE public.growth_funnel_events IS
  'Événements anonymes minimisés du funnel KURLA ; aucune donnée personnelle.';
