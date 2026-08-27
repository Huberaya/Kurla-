-- Correctif du cycle de vie atomique du stock.
--
-- La migration 20260839000000 ordonnait les lignes de commande avec
-- `ORDER BY product_id, variant_id::TEXT` sous un `GROUP BY 1, 2`. Sous GROUP BY,
-- une expression d'ORDER BY ne peut pas reference un alias de sortie : PostgreSQL
-- resout alors `variant_id` parmi les colonnes d'entree, qui se limitent a `value`
-- issue de jsonb_array_elements. Le resultat est l'erreur
-- `42703 column "variant_id" does not exist`, levee des la premiere reservation.
--
-- Les quatre fonctions ci-dessous sont donc redeployees avec `ORDER BY 1, 2`,
-- c'est-a-dire les ordinaux de sortie, qui sont valides et donnent le meme ordre
-- deterministe (l'ordre d'acquisition des verrous FOR UPDATE reste stable, ce qui
-- evite les interblocages entre commandes concurrentes).
--
-- Definitions strictement identiques a celles de 20260839000000 apres correction.

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
