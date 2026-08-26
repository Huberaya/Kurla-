-- ============================================================
-- KURLA BEAUTY - SUPABASE DATABASE SCHEMA MIGRATION (PHASE 5)
-- ORDER HISTORY, NOTIFICATIONS, SHIPPING, RETURNS, REFUNDS & SUPPORT
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORDER STATUS HISTORY (AUDIT TRAIL & STATUS TIMELINE)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL CHECK (
    new_status IN (
      'pending_payment',
      'payment_pending_webhook',
      'paid',
      'processing',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
      'payment_failed',
      'refunded',
      'partially_refunded',
      'return_requested',
      'returned'
    )
  ),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_role TEXT DEFAULT 'system',
  reason TEXT,
  source TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USER NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'account_created',
      'email_confirmation_pending',
      'payment_pending',
      'payment_confirmed',
      'payment_failed',
      'order_processing',
      'order_packed',
      'order_shipped',
      'order_delivered',
      'refund_created',
      'return_requested',
      'support_reply',
      'low_stock',
      'routine_reminder'
    )
  ),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);

-- 3. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  transactional_emails BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('sent', 'failed', 'logged')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SHIPPING RATES & ADDRESSES
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrier TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  estimated_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'FR',
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EXTEND OR CREATE SHIPMENTS
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  carrier TEXT DEFAULT 'manual' CHECK (carrier IN ('manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre')),
  method TEXT DEFAULT 'standard',
  price NUMERIC(10, 2) DEFAULT 0.00,
  tracking_number TEXT,
  tracking_url TEXT,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'failed')),
  shipped_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipping_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. RETURNS & REFUNDS
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled')),
  comment TEXT,
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SUPPORT TICKETS & MESSAGES
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  subject_category TEXT NOT NULL DEFAULT 'autre' CHECK (
    subject_category IN ('paiement', 'commande', 'livraison', 'retour', 'remboursement', 'produit', 'compte', 'conseil_ia', 'autre')
  ),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL DEFAULT 'customer' CHECK (sender_role IN ('customer', 'admin', 'agent')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR PHASE 5 TABLES
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_user_id ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PHASE 5
-- ============================================================

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- ORDER STATUS HISTORY: User views history of their own orders, admin manages all
DROP POLICY IF EXISTS "Users view own order history" ON public.order_status_history;
CREATE POLICY "Users view own order history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Admins manage order history" ON public.order_status_history
  FOR ALL USING (public.is_admin());

-- NOTIFICATIONS: User views/updates/deletes ONLY their own
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- NOTIFICATION PREFERENCES: User views/updates ONLY their own
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- NOTIFICATION LOGS: User views ONLY their own, admin views all
DROP POLICY IF EXISTS "Users view own notification logs" ON public.notification_logs;
CREATE POLICY "Users view own notification logs" ON public.notification_logs
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- SHIPMENTS & ADDRESSES: User views ONLY their own, admin manages all
DROP POLICY IF EXISTS "Users view own shipments" ON public.shipments;
CREATE POLICY "Users view own shipments" ON public.shipments
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage shipments" ON public.shipments;
CREATE POLICY "Admins manage shipments" ON public.shipments
  FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users manage own shipping addresses" ON public.shipping_addresses;
CREATE POLICY "Users manage own shipping addresses" ON public.shipping_addresses
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- RETURNS: User creates/views ONLY their own return requests, admin manages
DROP POLICY IF EXISTS "Users view own returns" ON public.returns;
CREATE POLICY "Users view own returns" ON public.returns
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users create own returns" ON public.returns;
CREATE POLICY "Users create own returns" ON public.returns
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage returns" ON public.returns;
CREATE POLICY "Admins manage returns" ON public.returns
  FOR ALL USING (public.is_admin());

-- REFUNDS: User views ONLY their own, admin manages
DROP POLICY IF EXISTS "Users view own refunds" ON public.refunds;
CREATE POLICY "Users view own refunds" ON public.refunds
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage refunds" ON public.refunds;
CREATE POLICY "Admins manage refunds" ON public.refunds
  FOR ALL USING (public.is_admin());

-- SUPPORT TICKETS: User views/creates ONLY their own, admin manages all
DROP POLICY IF EXISTS "Users view own support tickets" ON public.support_tickets;
CREATE POLICY "Users view own support tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users create support tickets" ON public.support_tickets;
CREATE POLICY "Users create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own support tickets" ON public.support_tickets;
CREATE POLICY "Users update own support tickets" ON public.support_tickets
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage support tickets" ON public.support_tickets;
CREATE POLICY "Admins manage support tickets" ON public.support_tickets
  FOR ALL USING (public.is_admin());

-- SUPPORT MESSAGES: User views/creates messages for their own tickets, admin manages all
DROP POLICY IF EXISTS "Users view support messages" ON public.support_messages;
CREATE POLICY "Users view support messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users create support messages" ON public.support_messages;
CREATE POLICY "Users create support messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    )
  );
