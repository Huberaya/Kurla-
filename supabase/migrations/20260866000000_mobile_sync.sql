-- CHANTIER 8.7 — SYNCHRONISATION MOBILE (feature 42)
--
-- Une seule règle, et elle est structurelle : **une action envoyée deux fois ne
-- s'applique qu'une fois**. Elle est portée par une contrainte d'unicité, pas
-- par une vérification applicative — une vérification applicative se contourne,
-- une contrainte non.
--
-- Le reste du comportement mobile (file d'attente, expiration, eviction) vit
-- côté client dans `src/lib/mobileShell.ts` : ce sont des règles d'affichage et
-- de rejeu, pas des règles de données.

CREATE TABLE IF NOT EXISTS public.mobile_sync_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_action_id text NOT NULL CHECK (char_length(trim(client_action_id)) BETWEEN 8 AND 128),
  kind text NOT NULL CHECK (kind IN ('scan', 'outcome_declared')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  -- C'est cette contrainte qui rend le rejeu idempotent.
  CONSTRAINT one_application_per_client_action UNIQUE (user_id, client_action_id)
);

CREATE INDEX IF NOT EXISTS mobile_sync_actions_user_time_idx
  ON public.mobile_sync_actions (user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS mobile_sync_actions_kind_idx
  ON public.mobile_sync_actions (kind);

ALTER TABLE public.mobile_sync_actions ENABLE ROW LEVEL SECURITY;

-- Un membre voit ses propres actions — c'est ce qui permet à l'appareil de
-- savoir ce qui a déjà été appliqué.
DROP POLICY IF EXISTS "Mobile sync actions owner read" ON public.mobile_sync_actions;
CREATE POLICY "Mobile sync actions owner read" ON public.mobile_sync_actions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Aucune politique INSERT / UPDATE / DELETE : l'écriture passe par le serveur,
-- qui réserve l'identifiant client avant d'appliquer l'action.
