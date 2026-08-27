-- CHANTIER 13 — notifications, email delivery and operational triggers.
-- The application remains authoritative for provider calls; SQL only stores the
-- durable notification state and creates the first in-app account notices.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

-- Keep notification creation idempotent across webhook retries, cron retries
-- and multiple application instances. NULL values remain allowed for legacy
-- and manually-created notifications.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON public.notifications(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
  ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id
  ON public.notification_logs(user_id);

-- The original Phase 5 constraint omitted several valid order lifecycle
-- notifications. Replace it with the complete business vocabulary.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'account_created',
      'email_confirmation_pending',
      'payment_pending',
      'payment_confirmed',
      'payment_failed',
      'order_pending_payment',
      'order_payment_pending_webhook',
      'order_paid',
      'order_created',
      'order_received',
      'order_payment_failed',
      'order_processing',
      'order_packed',
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'order_return_requested',
      'order_returned',
      'refund_created',
      'order_refunded',
      'order_partially_refunded',
      'return_requested',
      'support_reply',
      'low_stock',
      'routine_reminder'
    )
  );

-- Supabase Auth owns the actual confirmation URL and delivery mechanics. This
-- trigger creates an honest in-app trail as soon as the profile is available;
-- no SQL code claims that an email provider delivered a message.
CREATE OR REPLACE FUNCTION public.create_account_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_confirmed_at TIMESTAMPTZ;
BEGIN
  SELECT email_confirmed_at INTO v_email_confirmed_at
  FROM auth.users
  WHERE id = NEW.id;

  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notifications (
    user_id, type, title, message, link, dedupe_key, read, delivered_at
  ) VALUES (
    NEW.id,
    'account_created',
    'Bienvenue chez KURLA BEAUTY',
    'Votre compte a été créé. Vous pouvez maintenant compléter votre profil.',
    '/account',
    'account-created:' || NEW.id::text,
    FALSE,
    NOW()
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  -- Supabase may be configured with email confirmation disabled. In that
  -- case email_confirmed_at is already populated and no pending claim is
  -- displayed to the user.
  IF v_email_confirmed_at IS NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, link, dedupe_key, read, delivered_at
    ) VALUES (
      NEW.id,
      'email_confirmation_pending',
      'Confirmez votre adresse email',
      'Un email de confirmation est en attente. Consultez votre boîte de réception pour activer votre compte.',
      '/account',
      'email-confirmation-pending:' || NEW.id::text,
      FALSE,
      NOW()
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_notifications ON public.profiles;
CREATE TRIGGER on_profile_created_notifications
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_account_notifications();

-- These are operational tables. Keep RLS explicit: users can read their own
-- notices, while delivery logs are server/admin concerns.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Delivery provider IDs and error diagnostics are internal operational data;
-- do not expose them through the client-side Supabase session.
DROP POLICY IF EXISTS "Users view own notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS notifications_select_own ON public.notification_logs;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notification_logs_select_admin ON public.notification_logs;
CREATE POLICY notification_logs_select_admin ON public.notification_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );
