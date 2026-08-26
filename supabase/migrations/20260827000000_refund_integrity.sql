-- ============================================================
-- KURLA BEAUTY - REFUND INTEGRITY & STOCK RESTORATION
-- Real Stripe refund ledger, idempotency, and atomic restocking.
-- ============================================================

ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN DEFAULT FALSE;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

UPDATE public.refunds SET items = '[]'::jsonb WHERE items IS NULL;
ALTER TABLE public.refunds ALTER COLUMN items SET DEFAULT '[]'::jsonb;
ALTER TABLE public.refunds ALTER COLUMN items SET NOT NULL;

-- Refunds created by the previous development implementation already restored
-- stock in application memory. Do not restore them a second time after deploy.
UPDATE public.refunds
SET stock_restored = TRUE
WHERE stock_restored IS NULL
  AND status IN ('succeeded', 'completed');

UPDATE public.refunds
SET stock_restored = FALSE
WHERE stock_restored IS NULL;

ALTER TABLE public.refunds ALTER COLUMN stock_restored SET DEFAULT FALSE;
ALTER TABLE public.refunds ALTER COLUMN stock_restored SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_idempotency_key
  ON public.refunds(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refunds_order_status
  ON public.refunds(order_id, status);

-- The inventory table was historically not unique by product. Collapse
-- duplicate product-only rows before the unique index is added, preserving the
-- total physical and reserved quantities.
WITH duplicate_inventory AS (
  SELECT
    (array_agg(id ORDER BY id))[1] AS keep_id,
    product_id,
    SUM(quantity)::INTEGER AS quantity,
    SUM(reserved_quantity)::INTEGER AS reserved_quantity
  FROM public.inventory
  WHERE variant_id IS NULL
  GROUP BY product_id
  HAVING COUNT(*) > 1
), updated_rows AS (
  UPDATE public.inventory i
  SET quantity = d.quantity,
      reserved_quantity = d.reserved_quantity,
      updated_at = NOW()
  FROM duplicate_inventory d
  WHERE i.id = d.keep_id
  RETURNING i.id
)
DELETE FROM public.inventory i
USING duplicate_inventory d
WHERE i.product_id = d.product_id
  AND i.variant_id IS NULL
  AND i.id <> d.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product_without_variant
  ON public.inventory(product_id)
  WHERE variant_id IS NULL;

-- The service-role server calls this function after Stripe confirms a refund.
-- Stripe is an external side effect, while this function makes the local
-- ledger, order status, products and inventory changes atomic in PostgreSQL.
CREATE OR REPLACE FUNCTION public.finalize_refund(
  p_order_id TEXT,
  p_return_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_reason TEXT,
  p_stripe_refund_id TEXT,
  p_idempotency_key TEXT,
  p_status TEXT,
  p_items JSONB,
  p_apply_stock BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_existing public.refunds%ROWTYPE;
  v_refund public.refunds%ROWTYPE;
  v_total_refunded NUMERIC;
  v_new_order_status TEXT;
  v_item RECORD;
  v_inventory_id UUID;
  v_inventory_quantity INTEGER;
  v_inventory_reserved INTEGER;
  v_stock_restored BOOLEAN := FALSE;
BEGIN
  IF p_order_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Refund amount must be greater than zero';
  END IF;

  IF p_currency IS NULL OR lower(p_currency) <> 'eur' THEN
    RAISE EXCEPTION 'Only EUR refunds are supported';
  END IF;

  IF p_status NOT IN ('pending', 'succeeded', 'completed') THEN
    RAISE EXCEPTION 'Unsupported refund status: %', p_status;
  END IF;

  -- Serialize retries for the same logical refund.
  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(p_idempotency_key, p_stripe_refund_id, p_order_id), 0));

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- A Stripe retry can arrive with either the same idempotency key or the same
  -- provider refund id. Return the existing ledger row without side effects.
  SELECT * INTO v_existing
  FROM public.refunds
  WHERE (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
     OR (p_stripe_refund_id IS NOT NULL AND stripe_refund_id = p_stripe_refund_id)
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF p_apply_stock AND NOT v_existing.stock_restored AND p_status IN ('succeeded', 'completed') THEN
      FOR v_item IN
        SELECT product_id, quantity
        FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(product_id TEXT, quantity INTEGER)
      LOOP
        IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
          RAISE EXCEPTION 'Invalid refund stock item';
        END IF;

        UPDATE public.products
        SET stock_quantity = stock_quantity + v_item.quantity,
            in_stock = TRUE,
            updated_at = NOW()
        WHERE id = v_item.product_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Product % not found during refund stock restoration', v_item.product_id;
        END IF;

        SELECT id, quantity, reserved_quantity
        INTO v_inventory_id, v_inventory_quantity, v_inventory_reserved
        FROM public.inventory
        WHERE product_id = v_item.product_id
          AND variant_id IS NULL
        FOR UPDATE;

        IF v_inventory_id IS NULL THEN
          INSERT INTO public.inventory(product_id, quantity, reserved_quantity, updated_at)
          VALUES (v_item.product_id, v_item.quantity, 0, NOW());
        ELSE
          UPDATE public.inventory
          SET quantity = v_inventory_quantity + v_item.quantity,
              updated_at = NOW()
          WHERE id = v_inventory_id;
        END IF;
      END LOOP;

      UPDATE public.refunds
      SET stock_restored = TRUE,
          status = p_status,
          items = CASE WHEN jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 0 THEN p_items ELSE items END,
          updated_at = NOW()
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    END IF;

    IF p_status IN ('succeeded', 'completed') AND v_existing.status = 'pending' THEN
      UPDATE public.refunds
      SET status = p_status,
          items = CASE WHEN jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 0 THEN p_items ELSE items END,
          updated_at = NOW()
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_refunded
    FROM public.refunds
    WHERE order_id = p_order_id
      AND status IN ('succeeded', 'completed');

    v_new_order_status := CASE
      WHEN v_total_refunded >= v_order.total THEN 'refunded'
      ELSE 'partially_refunded'
    END;

    IF p_status IN ('succeeded', 'completed') AND v_order.status <> v_new_order_status THEN
      UPDATE public.orders
      SET status = v_new_order_status,
          updated_at = NOW()
      WHERE id = p_order_id;
    END IF;

    RETURN to_jsonb(v_existing);
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_refunded
  FROM public.refunds
  WHERE order_id = p_order_id
    AND status IN ('succeeded', 'completed');

  IF v_total_refunded + p_amount > v_order.total THEN
    RAISE EXCEPTION 'Refund exceeds the remaining refundable amount';
  END IF;

  INSERT INTO public.refunds(
    order_id,
    return_id,
    user_id,
    amount,
    currency,
    reason,
    stripe_refund_id,
    idempotency_key,
    status,
    stock_restored,
    items,
    created_at,
    updated_at
  ) VALUES (
    p_order_id,
    p_return_id,
    COALESCE(p_user_id, v_order.user_id),
    p_amount,
    upper(p_currency),
    p_reason,
    p_stripe_refund_id,
    p_idempotency_key,
    p_status,
    FALSE,
    COALESCE(p_items, '[]'::jsonb),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_refund;

  IF p_apply_stock AND p_status IN ('succeeded', 'completed') THEN
    FOR v_item IN
      SELECT product_id, quantity
      FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS x(product_id TEXT, quantity INTEGER)
    LOOP
      IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
        RAISE EXCEPTION 'Invalid refund stock item';
      END IF;

      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity,
          in_stock = TRUE,
          updated_at = NOW()
      WHERE id = v_item.product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % not found during refund stock restoration', v_item.product_id;
      END IF;

      SELECT id, quantity, reserved_quantity
      INTO v_inventory_id, v_inventory_quantity, v_inventory_reserved
      FROM public.inventory
      WHERE product_id = v_item.product_id
        AND variant_id IS NULL
      FOR UPDATE;

      IF v_inventory_id IS NULL THEN
        INSERT INTO public.inventory(product_id, quantity, reserved_quantity, updated_at)
        VALUES (v_item.product_id, v_item.quantity, 0, NOW());
      ELSE
        UPDATE public.inventory
        SET quantity = v_inventory_quantity + v_item.quantity,
            updated_at = NOW()
        WHERE id = v_inventory_id;
      END IF;
    END LOOP;

    v_stock_restored := TRUE;
    UPDATE public.refunds
    SET stock_restored = TRUE,
        updated_at = NOW()
    WHERE id = v_refund.id
    RETURNING * INTO v_refund;
  END IF;

  IF p_status IN ('succeeded', 'completed') THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_refunded
    FROM public.refunds
    WHERE order_id = p_order_id
      AND status IN ('succeeded', 'completed');

    v_new_order_status := CASE
      WHEN v_total_refunded >= v_order.total THEN 'refunded'
      ELSE 'partially_refunded'
    END;

    IF v_order.status <> v_new_order_status THEN
      UPDATE public.orders
      SET status = v_new_order_status,
          updated_at = NOW()
      WHERE id = p_order_id;

      INSERT INTO public.order_status_history(
        order_id, old_status, new_status, changed_by_role, reason, source
      ) VALUES (
        p_order_id, v_order.status, v_new_order_status, 'system',
        COALESCE(p_reason, 'Stripe refund finalized'), 'stripe_refund'
      );
    END IF;

    IF p_return_id IS NOT NULL THEN
      UPDATE public.returns
      SET status = 'refunded', updated_at = NOW()
      WHERE id = p_return_id;
    END IF;
  END IF;

  RETURN to_jsonb(v_refund);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_refund(TEXT, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_refund(TEXT, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN) TO service_role;

-- Atomically claim a webhook event before its business side effects. Failed
-- events are retryable; a stale processing claim can be recovered after ten
-- minutes if the process crashed before writing its final status.
CREATE OR REPLACE FUNCTION public.claim_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  INSERT INTO public.stripe_events(event_id, event_type, status, created_at)
  VALUES (p_event_id, p_event_type, 'processing', NOW())
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 1 THEN
    RETURN TRUE;
  END IF;

  SELECT status, created_at
  INTO v_status, v_created_at
  FROM public.stripe_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF v_status = 'error'
     OR (v_status = 'processing' AND v_created_at < NOW() - INTERVAL '10 minutes') THEN
    UPDATE public.stripe_events
    SET event_type = p_event_type,
        status = 'processing',
        details = NULL,
        created_at = NOW()
    WHERE event_id = p_event_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_stripe_event_error(
  p_event_id TEXT,
  p_event_type TEXT,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.stripe_events(event_id, event_type, status, details, created_at)
  VALUES (p_event_id, p_event_type, 'error', jsonb_build_object('error', p_error), NOW())
  ON CONFLICT (event_id) DO UPDATE SET
    event_type = EXCLUDED.event_type,
    status = 'error',
    details = EXCLUDED.details;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.mark_stripe_event_error(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_stripe_event_error(TEXT, TEXT, TEXT) TO service_role;
