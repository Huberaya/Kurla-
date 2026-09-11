-- CHANTIER 6 — passage waitlist → lancement fermé
-- Réutilise launch_leads pour éviter une seconde identité de contact.
-- Aucun commentaire d'entretien ni donnée sensible supplémentaire n'est stocké.

ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS tester_status TEXT NOT NULL DEFAULT 'waitlisted';
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS last_activity_kind TEXT;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS tester_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.launch_leads DROP CONSTRAINT IF EXISTS launch_leads_tester_status_check;
ALTER TABLE public.launch_leads
  ADD CONSTRAINT launch_leads_tester_status_check
  CHECK (tester_status IN ('waitlisted', 'invited', 'accepted', 'activated', 'inactive', 'declined'));

CREATE INDEX IF NOT EXISTS idx_launch_leads_tester_status
  ON public.launch_leads(country, profile_type, tester_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_launch_leads_tester_user
  ON public.launch_leads(tester_user_id)
  WHERE tester_user_id IS NOT NULL;

COMMENT ON COLUMN public.launch_leads.tester_status IS 'Étape de la cohorte fermée : waitlisted → invited → accepted → activated, sans créer une seconde fiche contact.';
COMMENT ON COLUMN public.launch_leads.last_active_at IS 'Dernière activité persistée connue du testeur ; NULL signifie non mesuré, pas inactif.';
COMMENT ON COLUMN public.launch_leads.last_activity_kind IS 'Dernier événement produit ayant confirmé une activité ; identifiant technique contrôlé, sans commentaire libre.';
COMMENT ON COLUMN public.launch_leads.tester_user_id IS 'Lien vers le compte KURLA créé après l’inscription waitlist, lorsqu’il est connu.';
