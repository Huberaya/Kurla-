-- CHANTIER 6.3 — invitation et onboarding du pilote France
-- Aucun token d'invitation n'est stocké : le lien Supabase est généré à la volée
-- puis envoyé par le fournisseur transactionnel configuré.

ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invitation_last_attempt_at TIMESTAMPTZ;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invitation_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invitation_provider TEXT;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invitation_message_id TEXT;
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS invitation_last_error TEXT;

ALTER TABLE public.launch_leads DROP CONSTRAINT IF EXISTS launch_leads_invitation_attempts_check;
ALTER TABLE public.launch_leads
  ADD CONSTRAINT launch_leads_invitation_attempts_check
  CHECK (invitation_attempts >= 0);

CREATE INDEX IF NOT EXISTS idx_launch_leads_invitation_sent
  ON public.launch_leads(tester_status, invitation_sent_at DESC)
  WHERE invitation_sent_at IS NOT NULL;

COMMENT ON COLUMN public.launch_leads.invitation_last_attempt_at IS 'Dernière tentative d’envoi de l’invitation du pilote.';
COMMENT ON COLUMN public.launch_leads.invitation_sent_at IS 'Dernier envoi accepté par un fournisseur transactionnel réel ; NULL en mode console ou en cas d’échec.';
COMMENT ON COLUMN public.launch_leads.invitation_attempts IS 'Nombre de tentatives d’invitation, sans stocker le lien ou un token.';
COMMENT ON COLUMN public.launch_leads.invitation_provider IS 'Fournisseur ayant accepté le dernier envoi réel.';
COMMENT ON COLUMN public.launch_leads.invitation_message_id IS 'Identifiant technique du dernier message accepté par le fournisseur.';
COMMENT ON COLUMN public.launch_leads.invitation_last_error IS 'Dernière erreur technique d’envoi, tronquée et réservée à l’administration.';
