-- Notifications push Web : abonnement par utilisateur et appareil.
-- Les payloads restent hors de cette table : elle ne conserve que les clés
-- nécessaires au fournisseur push, jamais le contenu d'une notification.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL CHECK (char_length(endpoint) BETWEEN 20 AND 2048),
  p256dh TEXT NOT NULL CHECK (char_length(p256dh) BETWEEN 20 AND 512),
  auth TEXT NOT NULL CHECK (char_length(auth) BETWEEN 10 AND 256),
  expiration_time BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

COMMENT ON TABLE public.push_subscriptions IS
  'Abonnements Web Push. Les messages et données personnelles ne sont pas stockés ici.';
