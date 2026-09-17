-- ============================================================
-- AUTO-PUBLICATION — extension de publication_policy (chantier E, lot 3)
-- ============================================================
-- Chantier : « Pipeline de mise en vente » — Lot 3, chantier E
-- (la machine qui publie les fiches prêtes, après le chantier A qui
-- a figé la carte des critères, et C3 qui a armé le mode strict).
--
-- Rôle : porter l'état de la machine d'auto-publication dans la MÊME
-- ligne unique de publication_policy que le mode strict (C3) : la
-- politique de publication est un état global, pas une table parallèle.
--
--   auto_publish_stage            'off' (défaut) | 'watch' | 'active'
--       off    = machine éteinte : aucune évaluation n'écrit ;
--       watch  = à chaque évaluation, la machine JOURNALISE ce qui
--                deviendrait publié (rien n'est écrit) ;
--       active = la machine publie les fiches draft au vert (auditée,
--                rollback d'une vague en un clic).
--   auto_publish_paused_at/by     pause en un clic, datée et nommée :
--       tant que posée, la machine refuse de tourner (stage inchangé
--       en mémoire — la pause est un interrupteur, pas un réarmement).
--   auto_publish_last_batch_*     la dernière vague EXÉCUTÉE (mode
--       active) : id, date, fiches — c'est elle que le bouton
--       « Annuler la dernière auto-publication » rejoue à l'envers.
--
-- Chaque changement de stage / pause / vague est journalisé dans
-- audit_logs (auto_publish_stage_change, auto_publish_pause,
-- auto_publish, auto_publish_rollback, auto_publish_watch) :
-- un interrupteur sans journal n'est pas un interrupteur.
--
-- Application : MANUELLE — l'éditeur SQL du dashboard Supabase suffit
-- (aucun jeton requis). Idempotent : ADD COLUMN IF NOT EXISTS.
-- Tant que ces colonnes sont absentes, la machine est 'off' et le
-- panneau le dit explicitement (état nommé, pas une erreur).
-- ============================================================

ALTER TABLE public.publication_policy
  ADD COLUMN IF NOT EXISTS auto_publish_stage text NOT NULL DEFAULT 'off'
  CHECK (auto_publish_stage IN ('off','watch','active'));

ALTER TABLE public.publication_policy
  ADD COLUMN IF NOT EXISTS auto_publish_paused_at timestamptz;

ALTER TABLE public.publication_policy
  ADD COLUMN IF NOT EXISTS auto_publish_paused_by text;

ALTER TABLE public.publication_policy
  ADD COLUMN IF NOT EXISTS auto_publish_last_batch_id text;

ALTER TABLE public.publication_policy
  ADD COLUMN IF NOT EXISTS auto_publish_last_batch_at timestamptz;

ALTER TABLE public.publication_policy
  ADD COLUMN IF NOT EXISTS auto_publish_last_batch_product_ids text[];

COMMENT ON COLUMN public.publication_policy.auto_publish_stage IS
  'État de la machine d''auto-publication : off (défaut) / watch (journalise ce qui serait publié, rien n''est écrit) / active (publie les fiches draft au vert, auditée, rollbackable). Chantier E « Pipeline de mise en vente » (lot 3).';
COMMENT ON COLUMN public.publication_policy.auto_publish_paused_at IS
  'Date de la pause en cours. NULL = pas de pause. La pause est un interrupteur daté et nommé, sans journal elle n''existerait pas.';
COMMENT ON COLUMN public.publication_policy.auto_publish_last_batch_product_ids IS
  'Fiches de la dernière vague auto-publiée (mode active) : c''est cette liste que le rollback rejoue à l''envers.';
