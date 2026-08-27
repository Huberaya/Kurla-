-- ============================================================================
-- CONTRAINTE UNIQUE MANQUANTE SUR public.notifications.dedupe_key
--
-- Bug vérifié sur l'instance réelle (projet Kurla, eu-west-1) :
--
--   ERROR: 42P10: there is no unique or exclusion constraint matching the
--   ON CONFLICT specification
--   CONTEXT: INSERT INTO public.notifications (...) ON CONFLICT (dedupe_key)
--   PL/pgSQL function create_account_notifications() line 13
--
-- `create_account_notifications()` (20260840) s'appuie sur
-- `ON CONFLICT (dedupe_key) DO NOTHING` pour ne pas renvoyer deux fois la même
-- notification. Mais `notifications` a été créée par 20260805200000 SANS
-- contrainte unique sur cette colonne — `grep dedupe_key` n'y renvoie rien.
--
-- Conséquence en cascade : le trigger `on_profile_created_notifications`
-- échoue, donc `handle_new_user()` échoue, donc TOUTE création de compte
-- échoue avec « Database error creating new user ». C'est ce qui bloquait les
-- 17 vérifications RLS Phase 2 : aucune paire de comptes de test ne pouvait
-- être créée.
--
-- La colonne est nullable, ce qui est voulu : UNIQUE autorise plusieurs NULL
-- en PostgreSQL, donc les notifications sans clé de déduplication restent
-- possibles.
--
-- Vérifié avant application : 0 ligne dans la table, 0 doublon non nul.
-- ============================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_dedupe_key_key;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);

COMMENT ON COLUMN public.notifications.dedupe_key IS
  'Clé de déduplication. UNIQUE : les fonctions de notification utilisent ON CONFLICT (dedupe_key) DO NOTHING pour ne jamais renvoyer deux fois la même notification. Plusieurs NULL sont autorisés.';
