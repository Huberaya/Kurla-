-- ============================================================
-- KURLA BEAUTY - CHANTIER 7 : GESTION ATOMIQUE DU STOCK
--
-- Toutes les transitions qui touchent quantity/reserved_quantity sont
-- exécutées dans une transaction PostgreSQL. Les RPC ci-dessous prennent les
-- verrous de lignes nécessaires et lèvent une erreur : aucune vente en
-- surnombre ne peut être confirmée silencieusement.
-- ============================================================

-- available_quantity is derived by PostgreSQL and can never drift from the
-- two source quantities.
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS available_quantity INTEGER
  GENERATED ALWAYS AS (quantity - reserved_quantity) STORED;

ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_reserved_not_exceed_quantity;
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_reserved_not_exceed_quantity
  CHECK (quantity >= 0 AND reserved_quantity >= 0 AND reserved_quantity <= quantity);

-- Repair duplicate inventory rows before making every SKU unique. Product-only
-- uniqueness existed already; this also covers variant inventory rows.
WITH duplicate_inventory AS (
  SELECT
    (array_agg(id ORDER BY id))[1] AS keep_id,
    product_id,
    variant_id,
    SUM(quantity)::INTEGER AS quantity,
    SUM(reserved_quantity)::INTEGER AS reserved_quantity
  FROM public.inventory
  GROUP BY product_id, variant_id
  HAVING COUNT(*) > 1
), updated_rows AS (
  UPDATE public.inventory inventory_row
  SET quantity = duplicate_inventory.quantity,
      reserved_quantity = duplicate_inventory.reserved_quantity,
      updated_at = NOW()
  FROM duplicate_inventory
  WHERE inventory_row.id = duplicate_inventory.keep_id
  RETURNING inventory_row.id
)
DELETE FROM public.inventory inventory_row
USING duplicate_inventory
WHERE inventory_row.product_id = duplicate_inventory.product_id
  AND inventory_row.variant_id IS NOT DISTINCT FROM duplicate_inventory.variant_id
  AND inventory_row.id <> duplicate_inventory.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product_variant_unique
  ON public.inventory(product_id, variant_id)
  WHERE variant_id IS NOT NULL;

-- The initial schema predates the complete order state machine.
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

-- Administrative catalog edits also go through this lock. A stock edit cannot
-- overwrite a reservation that was committed by a checkout in the meantime.
CREATE OR REPLACE FUNCTION public.set_inventory_quantity_atomic(
  p_product_id TEXT,
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory public.inventory%ROWTYPE;
BEGIN
  IF p_product_id IS NULL OR p_quantity IS NULL OR p_quantity < 0 THEN
    RAISE EXCEPTION 'Invalid inventory quantity';
  END IF;

  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;
  IF p_variant_id IS NOT NULL THEN
    PERFORM 1 FROM public.product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % not found', p_variant_id;
    END IF;
  END IF;

  SELECT * INTO v_inventory
  FROM public.inventory
  WHERE product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id
  FOR UPDATE;

  IF v_inventory.id IS NULL THEN
    INSERT INTO public.inventory(product_id, variant_id, quantity, reserved_quantity, updated_at)
    VALUES (p_product_id, p_variant_id, p_quantity, 0, NOW())
    RETURNING * INTO v_inventory;
  ELSE
    IF p_quantity < v_inventory.reserved_quantity THEN
      RAISE EXCEPTION 'Inventory quantity % is below reserved quantity %', p_quantity, v_inventory.reserved_quantity;
    END IF;
    UPDATE public.inventory
    SET quantity = p_quantity, updated_at = NOW()
    WHERE id = v_inventory.id
    RETURNING * INTO v_inventory;
  END IF;

  IF p_variant_id IS NULL THEN
    UPDATE public.products
    SET stock_quantity = p_quantity, in_stock = p_quantity > 0, updated_at = NOW()
    WHERE id = p_product_id;
  ELSE
    UPDATE public.product_variants
    SET stock_quantity = p_quantity, updated_at = NOW()
    WHERE id = p_variant_id;
  END IF;
  RETURN to_jsonb(v_inventory);
END;
$$;

-- Read both camelCase snapshots produced by the application and snake_case
-- payloads used by older internal callers. The aggregate prevents duplicate
-- cart lines from bypassing the available quantity check.
CREATE OR REPLACE FUNCTION public.reserve_stock_for_order(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_product_stock INTEGER;
  v_variant_stock INTEGER;
  v_inventory_id UUID;
  v_quantity INTEGER;
  v_reserved INTEGER;
BEGIN
  FOR v_item IN
    SELECT
      COALESCE(NULLIF(value->>'product_id', ''), NULLIF(value->>'productId', '')) AS product_id,
      NULLIF(COALESCE(value->>'variant_id', value->>'variantId'), '')::UUID AS variant_id,
      SUM((value->>'quantity')::INTEGER)::INTEGER AS quantity
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) AS line(value)
    GROUP BY 1, 2
    ORDER BY 1, 2
  LOOP
    v_product_stock := NULL;
    v_variant_stock := NULL;
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid order stock line';
    END IF;

    SELECT stock_quantity INTO v_product_stock
    FROM public.products
    WHERE id = v_item.product_id AND is_active = TRUE
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is not available', v_item.product_id;
    END IF;

    IF v_item.variant_id IS NOT NULL THEN
      SELECT stock_quantity INTO v_variant_stock
      FROM public.product_variants
      WHERE id = v_item.variant_id
        AND product_id = v_item.product_id
        AND is_active = TRUE
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant % is not available', v_item.variant_id;
      END IF;
    END IF;

    SELECT id, quantity, reserved_quantity
    INTO v_inventory_id, v_quantity, v_reserved
    FROM public.inventory
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
      v_quantity := COALESCE(v_variant_stock, v_product_stock, 0);
      v_reserved := 0;
      INSERT INTO public.inventory(product_id, variant_id, quantity, reserved_quantity, updated_at)
      VALUES (v_item.product_id, v_item.variant_id, v_quantity, 0, NOW())
      RETURNING id INTO v_inventory_id;
    END IF;

    IF v_quantity - v_reserved < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient available stock for product %', v_item.product_id;
    END IF;

    UPDATE public.inventory
    SET reserved_quantity = v_reserved + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_inventory_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_stock_for_order(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_inventory_id UUID;
  v_reserved INTEGER;
BEGIN
  FOR v_item IN
    SELECT
      COALESCE(NULLIF(value->>'product_id', ''), NULLIF(value->>'productId', '')) AS product_id,
      NULLIF(COALESCE(value->>'variant_id', value->>'variantId'), '')::UUID AS variant_id,
      SUM((value->>'quantity')::INTEGER)::INTEGER AS quantity
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::JSONB)) AS line(value)
    GROUP BY 1, 2
    ORDER BY 1, 2
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid order stock line';
    END IF;

    SELECT reserved_quantity, id
    INTO v_reserved, v_inventory_id
    FROM public.inventory
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
      RAISE EXCEPTION 'Inventory row missing for product %', v_item.product_id;
    END IF;
    IF v_reserved < v_item.quantity THEN
      RAISE EXCEPTION 'Stock reservation underflow for product %', v_item.product_id;
    END IF;

    UPDATE public.inventory
    SET reserved_quantity = v_reserved - v_item.quantity,
        updated_at = NOW()
    WHERE id = v_inventory_id;
  END LOOP;
END;
$$;

-- Creation, reservation, order lines, initial payment ledger and history are
-- one transaction. The advisory lock closes the race between two retries that
-- use the same checkout key before the unique index is reached.
CREATE OR REPLACE FUNCTION public.create_order_with_stock_reservation(
  p_order_id TEXT,
  p_user_id UUID,
  p_customer_email TEXT,
  p_items JSONB,
  p_total NUMERIC,
  p_status TEXT,
  p_stripe_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_checkout_idempotency_key TEXT,
  p_shipping_address JSONB,
  p_created_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_line RECORD;
  v_existing BOOLEAN := FALSE;
  v_checkout_key TEXT := NULLIF(BTRIM(p_checkout_idempotency_key), '');
BEGIN
  IF p_order_id IS NULL OR BTRIM(p_order_id) = '' OR p_customer_email IS NULL OR p_total IS NULL OR p_total < 0 THEN
    RAISE EXCEPTION 'Invalid order header';
  END IF;
  IF p_status NOT IN ('pending_payment', 'payment_pending_webhook') THEN
    RAISE EXCEPTION 'New orders must start in a pending payment status';
  END IF;
  IF jsonb_typeof(COALESCE(p_items, '[]'::JSONB)) <> 'array' OR jsonb_array_length(COALESCE(p_items, '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'An order requires at least one item';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(v_checkout_key, p_order_id), 0));

  IF v_checkout_key IS NOT NULL THEN
    SELECT * INTO v_order
    FROM public.orders
    WHERE checkout_idempotency_key = v_checkout_key
    LIMIT 1
    FOR UPDATE;
    v_existing := FOUND;
  END IF;
  IF NOT v_existing THEN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;
    v_existing := FOUND;
  END IF;
  IF v_existing THEN
    RETURN to_jsonb(v_order);
  END IF;

  PERFORM public.reserve_stock_for_order(p_items);

  INSERT INTO public.orders(
    id, user_id, customer_email, items, total, status,
    stripe_session_id, stripe_payment_intent_id, checkout_idempotency_key,
    shipping_address, created_at, updated_at
  ) VALUES (
    p_order_id, p_user_id, p_customer_email, p_items, p_total, p_status,
    p_stripe_session_id, p_stripe_payment_intent_id, v_checkout_key,
    p_shipping_address, COALESCE(p_created_at, NOW()), NOW()
  )
  RETURNING * INTO v_order;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) AS item(value)
  LOOP
    INSERT INTO public.order_items(order_id, product_id, variant_id, quantity, unit_price)
    VALUES (
      v_order.id,
      COALESCE(NULLIF(v_line.value->>'product_id', ''), NULLIF(v_line.value->>'productId', '')),
      NULLIF(COALESCE(v_line.value->>'variant_id', v_line.value->>'variantId'), '')::UUID,
      (v_line.value->>'quantity')::INTEGER,
      COALESCE(NULLIF(v_line.value->>'unit_price', ''), NULLIF(v_line.value->>'price', ''))::NUMERIC
    );
  END LOOP;

  INSERT INTO public.payments(order_id, amount, currency, status, stripe_payment_intent_id, created_at, updated_at)
  VALUES (v_order.id, v_order.total, 'EUR', v_order.status, v_order.stripe_payment_intent_id, NOW(), NOW());

  INSERT INTO public.order_status_history(order_id, old_status, new_status, changed_by_role, reason, source)
  VALUES (v_order.id, NULL, v_order.status, 'system', 'Création de la commande et réservation atomique du stock', 'checkout');

  RETURN to_jsonb(v_order);
END;
$$;

-- Stock restoration used by the atomic refund ledger. It handles products and
-- variants, and it locks each physical inventory row before changing it.
CREATE OR REPLACE FUNCTION public.restore_stock_atomic(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_inventory_id UUID;
  v_inventory_quantity INTEGER;
BEGIN
  IF jsonb_array_length(COALESCE(p_items, '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'No stock lines supplied for restoration';
  END IF;

  FOR v_item IN
    SELECT
      COALESCE(NULLIF(value->>'product_id', ''), NULLIF(value->>'productId', '')) AS product_id,
      NULLIF(COALESCE(value->>'variant_id', value->>'variantId'), '')::UUID AS variant_id,
      SUM((value->>'quantity')::INTEGER)::INTEGER AS quantity
    FROM jsonb_array_elements(p_items) AS line(value)
    GROUP BY 1, 2
    ORDER BY 1, 2
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid stock restoration line';
    END IF;

    IF v_item.variant_id IS NULL THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity + v_item.quantity,
          in_stock = TRUE,
          updated_at = NOW()
      WHERE id = v_item.product_id;
    ELSE
      UPDATE public.product_variants
      SET stock_quantity = stock_quantity + v_item.quantity,
          updated_at = NOW()
      WHERE id = v_item.variant_id AND product_id = v_item.product_id;
    END IF;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found during stock restoration', v_item.product_id;
    END IF;

    SELECT id, quantity INTO v_inventory_id, v_inventory_quantity
    FROM public.inventory
    WHERE product_id = v_item.product_id
      AND variant_id IS NOT DISTINCT FROM v_item.variant_id
    FOR UPDATE;
    IF v_inventory_id IS NULL THEN
      RAISE EXCEPTION 'Inventory row missing during stock restoration for product %', v_item.product_id;
    END IF;
    UPDATE public.inventory
    SET quantity = v_inventory_quantity + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_inventory_id;
  END LOOP;
END;
$$;


-- Payment confirmation, failure/cancellation release and any explicit stock
-- restoration are serialized with the order row. The status transition, stock
-- mutation, payment event and audit history commit or roll back together.
CREATE OR REPLACE FUNCTION public.transition_order_stock(
  p_order_id TEXT,
  p_new_status TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_changed_by UUID DEFAULT NULL,
  p_changed_by_role TEXT DEFAULT 'system',
  p_reason TEXT DEFAULT NULL,
  p_restock_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_old_status TEXT;
  v_inventory_quantity INTEGER;
  v_inventory_reserved INTEGER;
  v_inventory_id UUID;
BEGIN
  IF p_order_id IS NULL OR p_new_status NOT IN (
    'pending_payment', 'payment_pending_webhook', 'paid', 'processing', 'packed',
    'shipped', 'delivered', 'cancelled', 'payment_failed', 'refunded',
    'partially_refunded', 'return_requested', 'returned'
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition request';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;
  v_old_status := v_order.status;

  -- A stale Stripe failure/expiration must lose harmlessly to a committed
  -- payment, and a late success must lose harmlessly to a committed refund.
  -- Returning the locked order keeps webhook retries from becoming permanent
  -- errors while preserving the first terminal stock decision.
  IF p_new_status = 'payment_failed'
    AND v_old_status IN ('paid', 'processing', 'packed', 'shipped', 'delivered', 'refunded', 'partially_refunded') THEN
    RETURN to_jsonb(v_order);
  END IF;
  IF p_new_status = 'paid' AND v_old_status IN ('refunded', 'partially_refunded') THEN
    RETURN to_jsonb(v_order);
  END IF;

  IF v_old_status = p_new_status THEN
    IF p_stripe_payment_intent_id IS NOT NULL AND v_order.stripe_payment_intent_id IS DISTINCT FROM p_stripe_payment_intent_id THEN
      UPDATE public.orders
      SET stripe_payment_intent_id = p_stripe_payment_intent_id, updated_at = NOW()
      WHERE id = p_order_id
      RETURNING * INTO v_order;
    END IF;
    RETURN to_jsonb(v_order);
  END IF;

  IF p_new_status IN ('refunded', 'partially_refunded') THEN
    RAISE EXCEPTION 'Use finalize_refund for an idempotent stock restoration';
  END IF;

  IF NOT (
    (v_old_status = 'pending_payment' AND p_new_status IN ('payment_pending_webhook', 'paid', 'cancelled', 'payment_failed')) OR
    (v_old_status = 'payment_pending_webhook' AND p_new_status IN ('paid', 'payment_failed', 'cancelled')) OR
    (v_old_status = 'paid' AND p_new_status IN ('processing', 'packed', 'shipped', 'delivered', 'return_requested')) OR
    (v_old_status = 'processing' AND p_new_status IN ('packed', 'shipped', 'cancelled')) OR
    (v_old_status = 'packed' AND p_new_status IN ('shipped', 'cancelled')) OR
    (v_old_status = 'shipped' AND p_new_status IN ('delivered', 'returned')) OR
    (v_old_status = 'delivered' AND p_new_status IN ('return_requested', 'returned')) OR
    (v_old_status = 'return_requested' AND p_new_status IN ('returned', 'cancelled')) OR
    (v_old_status = 'partially_refunded' AND p_new_status = 'return_requested') OR
    (v_old_status = 'payment_failed' AND p_new_status = 'paid')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', v_old_status, p_new_status;
  END IF;

  IF p_new_status IN ('refunded', 'partially_refunded') AND jsonb_array_length(COALESCE(p_restock_items, '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'Use the refund ledger RPC to restore stock exactly once';
  END IF;

  IF p_new_status = 'paid' THEN
    -- A late successful payment after payment_failed must obtain a fresh
    -- reservation before consumption; the failed transition already released
    -- the original one.
    IF v_old_status = 'payment_failed' THEN
      PERFORM public.reserve_stock_for_order(v_order.items);
    END IF;

    FOR v_item IN
      SELECT
        COALESCE(NULLIF(value->>'product_id', ''), NULLIF(value->>'productId', '')) AS product_id,
        NULLIF(COALESCE(value->>'variant_id', value->>'variantId'), '')::UUID AS variant_id,
        SUM((value->>'quantity')::INTEGER)::INTEGER AS quantity
      FROM jsonb_array_elements(v_order.items) AS line(value)
      GROUP BY 1, 2
      ORDER BY 1, 2
    LOOP
      IF v_item.variant_id IS NULL THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item.quantity,
            in_stock = (stock_quantity - v_item.quantity) > 0,
            updated_at = NOW()
        WHERE id = v_item.product_id
          AND stock_quantity >= v_item.quantity;
      ELSE
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.variant_id
          AND product_id = v_item.product_id
          AND stock_quantity >= v_item.quantity;
      END IF;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Physical stock is insufficient for product %', v_item.product_id;
      END IF;

      SELECT id, quantity, reserved_quantity
      INTO v_inventory_id, v_inventory_quantity, v_inventory_reserved
      FROM public.inventory
      WHERE product_id = v_item.product_id
        AND variant_id IS NOT DISTINCT FROM v_item.variant_id
      FOR UPDATE;
      IF v_inventory_id IS NULL OR v_inventory_reserved < v_item.quantity OR v_inventory_quantity < v_item.quantity THEN
        RAISE EXCEPTION 'Reserved stock is inconsistent for product %', v_item.product_id;
      END IF;
      UPDATE public.inventory
      SET quantity = v_inventory_quantity - v_item.quantity,
          reserved_quantity = v_inventory_reserved - v_item.quantity,
          updated_at = NOW()
      WHERE id = v_inventory_id;
    END LOOP;
  ELSIF p_new_status IN ('payment_failed', 'cancelled')
    AND v_old_status IN ('pending_payment', 'payment_pending_webhook') THEN
    PERFORM public.release_stock_for_order(v_order.items);
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  INSERT INTO public.payments(order_id, amount, currency, status, stripe_payment_intent_id, created_at, updated_at)
  VALUES (v_order.id, v_order.total, 'EUR', p_new_status, v_order.stripe_payment_intent_id, NOW(), NOW());

  INSERT INTO public.order_status_history(order_id, old_status, new_status, changed_by, changed_by_role, reason, source)
  VALUES (v_order.id, v_old_status, p_new_status, p_changed_by, COALESCE(p_changed_by_role, 'system'), COALESCE(p_reason, 'Transition atomique du stock'), 'stock_lifecycle');

  RETURN to_jsonb(v_order);
END;
$$;

-- Replace the historical refund procedure so the server can pass the same
-- canonical product/variant lines and the stock restoration remains exactly
-- once under the refund row lock.
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
  IF p_status IN ('succeeded', 'completed') AND NOT p_apply_stock THEN
    RAISE EXCEPTION 'A successful refund requires explicit stock lines for restoration';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(p_idempotency_key, p_stripe_refund_id, p_order_id), 0));
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  SELECT * INTO v_existing
  FROM public.refunds
  WHERE (p_idempotency_key IS NOT NULL AND idempotency_key = p_idempotency_key)
     OR (p_stripe_refund_id IS NOT NULL AND stripe_refund_id = p_stripe_refund_id)
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF p_apply_stock AND NOT v_existing.stock_restored AND p_status IN ('succeeded', 'completed') THEN
      PERFORM public.restore_stock_atomic(COALESCE(p_items, '[]'::JSONB));
      UPDATE public.refunds
      SET stock_restored = TRUE,
          status = p_status,
          items = CASE WHEN jsonb_array_length(COALESCE(p_items, '[]'::JSONB)) > 0 THEN p_items ELSE items END,
          updated_at = NOW()
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    ELSIF p_status IN ('succeeded', 'completed') AND v_existing.status = 'pending' THEN
      UPDATE public.refunds
      SET status = p_status,
          items = CASE WHEN jsonb_array_length(COALESCE(p_items, '[]'::JSONB)) > 0 THEN p_items ELSE items END,
          updated_at = NOW()
      WHERE id = v_existing.id
      RETURNING * INTO v_existing;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
    FROM public.refunds
    WHERE order_id = p_order_id AND status IN ('succeeded', 'completed');
    IF p_status IN ('succeeded', 'completed') THEN
      v_new_order_status := CASE WHEN v_total_refunded >= v_order.total THEN 'refunded' ELSE 'partially_refunded' END;
      IF v_order.status <> v_new_order_status THEN
        UPDATE public.orders SET status = v_new_order_status, updated_at = NOW() WHERE id = p_order_id;
        INSERT INTO public.order_status_history(order_id, old_status, new_status, changed_by_role, reason, source)
        VALUES (p_order_id, v_order.status, v_new_order_status, 'system', COALESCE(p_reason, 'Stripe refund finalized'), 'stripe_refund');
      END IF;
    END IF;
    RETURN to_jsonb(v_existing);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
  FROM public.refunds
  WHERE order_id = p_order_id AND status IN ('succeeded', 'completed');
  IF v_total_refunded + p_amount > v_order.total THEN
    RAISE EXCEPTION 'Refund exceeds the remaining refundable amount';
  END IF;

  INSERT INTO public.refunds(
    order_id, return_id, user_id, amount, currency, reason,
    stripe_refund_id, idempotency_key, status, stock_restored, items, created_at, updated_at
  ) VALUES (
    p_order_id, p_return_id, COALESCE(p_user_id, v_order.user_id), p_amount, upper(p_currency), p_reason,
    p_stripe_refund_id, p_idempotency_key, p_status, FALSE, COALESCE(p_items, '[]'::JSONB), NOW(), NOW()
  )
  RETURNING * INTO v_refund;

  IF p_apply_stock AND p_status IN ('succeeded', 'completed') THEN
    PERFORM public.restore_stock_atomic(COALESCE(p_items, '[]'::JSONB));
    UPDATE public.refunds SET stock_restored = TRUE, updated_at = NOW() WHERE id = v_refund.id RETURNING * INTO v_refund;
  END IF;

  IF p_status IN ('succeeded', 'completed') THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
    FROM public.refunds
    WHERE order_id = p_order_id AND status IN ('succeeded', 'completed');
    v_new_order_status := CASE WHEN v_total_refunded >= v_order.total THEN 'refunded' ELSE 'partially_refunded' END;
    IF v_order.status <> v_new_order_status THEN
      UPDATE public.orders SET status = v_new_order_status, updated_at = NOW() WHERE id = p_order_id;
      INSERT INTO public.order_status_history(order_id, old_status, new_status, changed_by_role, reason, source)
      VALUES (p_order_id, v_order.status, v_new_order_status, 'system', COALESCE(p_reason, 'Stripe refund finalized'), 'stripe_refund');
    END IF;
    IF p_return_id IS NOT NULL THEN
      UPDATE public.returns SET status = 'refunded', updated_at = NOW() WHERE id = p_return_id;
    END IF;
  END IF;

  RETURN to_jsonb(v_refund);
END;
$$;

REVOKE ALL ON FUNCTION public.set_inventory_quantity_atomic(TEXT, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_inventory_quantity_atomic(TEXT, UUID, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_stock_for_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.release_stock_for_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.create_order_with_stock_reservation(TEXT, UUID, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_reservation(TEXT, UUID, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION public.transition_order_stock(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_order_stock(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.restore_stock_atomic(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_stock_atomic(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_refund(TEXT, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_refund(TEXT, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN) TO service_role;
