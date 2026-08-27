-- CHANTIER — Livraison, retours et support
-- Durable after-purchase data: delivery snapshots/events, support priority,
-- assignments, attachments and a complete ticket history.

-- 1. Preserve the exact delivery information shown at checkout.
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS delivery_address JSONB,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS tariff NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tariff >= 0);

ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS free_from_cents INTEGER,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_shipping_rates_country_method
  ON public.shipping_rates(country, method, active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_order_id_unique
  ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_events_shipment_created
  ON public.shipping_events(shipment_id, created_at);

-- Return decisions and physical reception are separate operational events;
-- the actor is retained even when the return row is later updated.
CREATE TABLE IF NOT EXISTS public.return_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('customer', 'admin', 'support', 'system')),
  old_status TEXT,
  new_status TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_return_events_return_created
  ON public.return_events(return_id, created_at);
ALTER TABLE public.return_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own return history" ON public.return_events;
CREATE POLICY "Users view own return history" ON public.return_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.returns r
      WHERE r.id = return_events.return_id
        AND (r.user_id = auth.uid() OR public.is_admin())
    )
  );
DROP POLICY IF EXISTS "Admins manage return history" ON public.return_events;
CREATE POLICY "Admins manage return history" ON public.return_events
  FOR ALL USING (public.is_admin());

-- 2. Support priority and operational history.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'message_added', 'status_changed', 'priority_changed',
    'assignment_changed', 'attachment_added'
  )),
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket_created
  ON public.support_ticket_events(ticket_id, created_at);

-- Attachments are private metadata. The binary is stored in the private
-- Supabase Storage bucket support-attachments; no public URL is persisted.
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_attachments_ticket_created
  ON public.support_attachments(ticket_id, created_at);

-- Storage bucket creation is idempotent. Files remain private and are served
-- through a server-generated short-lived signed URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- 3. Explicit RLS for newly introduced support data.
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own support ticket history" ON public.support_ticket_events;
CREATE POLICY "Users view own support ticket history" ON public.support_ticket_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_events.ticket_id
        AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins manage support ticket history" ON public.support_ticket_events;
CREATE POLICY "Admins manage support ticket history" ON public.support_ticket_events
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own support attachments" ON public.support_attachments;
CREATE POLICY "Users view own support attachments" ON public.support_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_attachments.ticket_id
        AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users create own support attachments" ON public.support_attachments;
CREATE POLICY "Users create own support attachments" ON public.support_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_attachments.ticket_id
        AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins manage support attachments" ON public.support_attachments;
CREATE POLICY "Admins manage support attachments" ON public.support_attachments
  FOR ALL USING (public.is_admin());

-- Storage access is intentionally not granted to browser users. The server
-- service key performs uploads and creates signed URLs after ticket ownership
-- has been checked.
DROP POLICY IF EXISTS "Support attachment storage server only" ON storage.objects;
CREATE POLICY "Support attachment storage server only" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'support-attachments')
  WITH CHECK (bucket_id = 'support-attachments');

-- Existing ticket rows get an explicit normal priority without inventing any
-- business severity.
UPDATE public.support_tickets SET priority = 'normal' WHERE priority IS NULL;
