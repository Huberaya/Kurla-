-- ============================================================
-- KURLA BEAUTY - EXISTING SCHEMA HARDENING
-- Explicitly evolve Phase 1 tables before using Phase 5 server fields.
-- This migration is intentionally not CREATE TABLE IF NOT EXISTS only:
-- it must also repair databases that already ran the initial migration.
-- ============================================================

-- 1. ORDERS: align the persisted status constraint with ServerOrder.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
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
  );

-- 2. SHIPMENTS: add every field used by serverDb and backfill ownership.
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

UPDATE public.shipments
SET user_id = orders.user_id
FROM public.orders
WHERE shipments.order_id = orders.id
  AND shipments.user_id IS NULL;

UPDATE public.shipments SET method = 'standard' WHERE method IS NULL;
UPDATE public.shipments SET price = 0 WHERE price IS NULL;
UPDATE public.shipments SET status = 'preparing' WHERE status IS NULL;
UPDATE public.shipments SET carrier = 'manual' WHERE carrier IS NULL;

ALTER TABLE public.shipments ALTER COLUMN method SET DEFAULT 'standard';
ALTER TABLE public.shipments ALTER COLUMN price SET DEFAULT 0;
ALTER TABLE public.shipments ALTER COLUMN price SET NOT NULL;
ALTER TABLE public.shipments ALTER COLUMN status SET DEFAULT 'preparing';
ALTER TABLE public.shipments ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_status_check CHECK (
    status IN ('preparing', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed')
  );

-- 3. RETURNS: make the existing table compatible with the server contract.
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS admin_comment TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.returns SET items = '[]'::jsonb WHERE items IS NULL;
UPDATE public.returns SET quantity = 1 WHERE quantity IS NULL OR quantity < 1;
UPDATE public.returns SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

ALTER TABLE public.returns ALTER COLUMN items SET DEFAULT '[]'::jsonb;
ALTER TABLE public.returns ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE public.returns ALTER COLUMN quantity SET NOT NULL;
ALTER TABLE public.returns ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.returns ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_status_check;
ALTER TABLE public.returns
  ADD CONSTRAINT returns_status_check CHECK (
    status IN ('requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled')
  );

-- 4. REFUNDS: add ownership, currency, return linkage and provider id.
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

UPDATE public.refunds
SET user_id = orders.user_id
FROM public.orders
WHERE refunds.order_id = orders.id
  AND refunds.user_id IS NULL;

UPDATE public.refunds SET currency = 'EUR' WHERE currency IS NULL OR btrim(currency) = '';
ALTER TABLE public.refunds ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE public.refunds ALTER COLUMN currency SET NOT NULL;

ALTER TABLE public.refunds DROP CONSTRAINT IF EXISTS refunds_amount_check;
ALTER TABLE public.refunds ADD CONSTRAINT refunds_amount_check CHECK (amount >= 0);
ALTER TABLE public.refunds DROP CONSTRAINT IF EXISTS refunds_status_check;
ALTER TABLE public.refunds
  ADD CONSTRAINT refunds_status_check CHECK (status IN ('pending', 'succeeded', 'failed', 'completed'));

CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_return_id ON public.refunds(return_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id
  ON public.refunds(stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

-- 5. Reassert RLS on the evolved private tables.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- 6. Fail migration rather than silently leaving an incomplete schema.
DO $$
BEGIN
  IF to_regclass('public.orders') IS NULL
     OR to_regclass('public.shipments') IS NULL
     OR to_regclass('public.returns') IS NULL
     OR to_regclass('public.refunds') IS NULL THEN
    RAISE EXCEPTION 'KURLA schema hardening failed: required commerce tables are missing';
  END IF;
END $$;
