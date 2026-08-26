-- ============================================================
-- KURLA BEAUTY - CART & ORDER PERSISTENCE INTEGRITY
-- Canonical carts, strict RLS, checkout idempotency and atomic stock holds.
-- ============================================================

-- 1. Repair duplicate carts before enforcing one cart per owner.
DO $$
DECLARE
  dup RECORD;
  keeper_id UUID;
  old_cart_id UUID;
  cart_item RECORD;
  keeper_item_id UUID;
  duplicate_quantity INTEGER;
BEGIN
  FOR dup IN
    SELECT user_id, array_agg(id ORDER BY created_at, id) AS cart_ids
    FROM public.carts
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  LOOP
    keeper_id := dup.cart_ids[1];
    FOREACH old_cart_id IN ARRAY dup.cart_ids[2:array_length(dup.cart_ids, 1)]
    LOOP
      FOR cart_item IN
        SELECT id, product_id, variant_id, quantity
        FROM public.cart_items
        WHERE cart_id = old_cart_id
      LOOP
        SELECT id INTO keeper_item_id
        FROM public.cart_items
        WHERE cart_id = keeper_id
          AND product_id = cart_item.product_id
          AND variant_id IS NOT DISTINCT FROM cart_item.variant_id
        LIMIT 1;

        IF keeper_item_id IS NULL THEN
          UPDATE public.cart_items SET cart_id = keeper_id WHERE id = cart_item.id;
        ELSE
          UPDATE public.cart_items
          SET quantity = quantity + cart_item.quantity,
              updated_at = NOW()
          WHERE id = keeper_item_id;
          DELETE FROM public.cart_items WHERE id = cart_item.id;
        END IF;
        keeper_item_id := NULL;
      END LOOP;
      DELETE FROM public.carts WHERE id = old_cart_id;
    END LOOP;
  END LOOP;

  FOR dup IN
    SELECT anonymous_id, array_agg(id ORDER BY created_at, id) AS cart_ids
    FROM public.carts
    WHERE user_id IS NULL AND anonymous_id IS NOT NULL
    GROUP BY anonymous_id
    HAVING COUNT(*) > 1
  LOOP
    keeper_id := dup.cart_ids[1];
    FOREACH old_cart_id IN ARRAY dup.cart_ids[2:array_length(dup.cart_ids, 1)]
    LOOP
      FOR cart_item IN
        SELECT id, product_id, variant_id, quantity
        FROM public.cart_items
        WHERE cart_id = old_cart_id
      LOOP
        SELECT id INTO keeper_item_id
        FROM public.cart_items
        WHERE cart_id = keeper_id
          AND product_id = cart_item.product_id
          AND variant_id IS NOT DISTINCT FROM cart_item.variant_id
        LIMIT 1;

        IF keeper_item_id IS NULL THEN
          UPDATE public.cart_items SET cart_id = keeper_id WHERE id = cart_item.id;
        ELSE
          UPDATE public.cart_items
          SET quantity = quantity + cart_item.quantity,
              updated_at = NOW()
          WHERE id = keeper_item_id;
          DELETE FROM public.cart_items WHERE id = cart_item.id;
        END IF;
        keeper_item_id := NULL;
      END LOOP;
      DELETE FROM public.carts WHERE id = old_cart_id;
    END LOOP;
  END LOOP;

  -- Remove duplicate lines that may already exist inside one cart.
  FOR dup IN
    SELECT cart_id, product_id, variant_id, array_agg(id ORDER BY created_at, id) AS item_ids
    FROM public.cart_items
    GROUP BY cart_id, product_id, variant_id
    HAVING COUNT(*) > 1
  LOOP
    keeper_item_id := dup.item_ids[1];
    FOREACH old_cart_id IN ARRAY dup.item_ids[2:array_length(dup.item_ids, 1)]
    LOOP
      SELECT quantity INTO duplicate_quantity FROM public.cart_items WHERE id = old_cart_id;
      UPDATE public.cart_items
      SET quantity = quantity + COALESCE(duplicate_quantity, 0), updated_at = NOW()
      WHERE id = keeper_item_id;
      DELETE FROM public.cart_items WHERE id = old_cart_id;
    END LOOP;
  END LOOP;
END $$;

-- Normalize owner identity: authenticated carts are never anonymous carts.
UPDATE public.carts SET anonymous_id = NULL WHERE user_id IS NOT NULL;
DELETE FROM public.carts WHERE user_id IS NULL AND anonymous_id IS NULL;

ALTER TABLE public.carts DROP CONSTRAINT IF EXISTS carts_owner_check;
ALTER TABLE public.carts
  ADD CONSTRAINT carts_owner_check CHECK (
    (user_id IS NOT NULL AND anonymous_id IS NULL)
    OR (user_id IS NULL AND anonymous_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_id_unique
  ON public.carts(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_anonymous_id_unique
  ON public.carts(anonymous_id)
  WHERE anonymous_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_line
  ON public.cart_items(
    cart_id,
    product_id,
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );

-- 2. Checkout idempotency: retries reuse the same order/session.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_idempotency_key
  ON public.orders(checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

-- 3. Strict direct-client policies. The server uses service_role for guests and
-- checkout persistence; browser clients can only access their own user cart.
DROP POLICY IF EXISTS "Users view and manage own cart" ON public.carts;
DROP POLICY IF EXISTS "Users select own carts" ON public.carts;
DROP POLICY IF EXISTS "Users insert own carts" ON public.carts;
DROP POLICY IF EXISTS "Users update own carts" ON public.carts;
DROP POLICY IF EXISTS "Users delete own carts" ON public.carts;
CREATE POLICY "Users select own carts" ON public.carts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own carts" ON public.carts
  FOR INSERT WITH CHECK (auth.uid() = user_id AND anonymous_id IS NULL);
CREATE POLICY "Users update own carts" ON public.carts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND anonymous_id IS NULL);
CREATE POLICY "Users delete own carts" ON public.carts
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own cart items" ON public.cart_items;
CREATE POLICY "Users manage own cart items" ON public.cart_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.carts c
    WHERE c.id = cart_items.cart_id AND c.user_id = auth.uid()
  ));

-- Remove the legacy email-based order policy. Ownership is UUID-only.
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Orders select policy" ON public.orders;
DROP POLICY IF EXISTS "Orders insert policy" ON public.orders;
CREATE POLICY "Orders select policy" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Orders insert policy" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins manage all orders" ON public.orders
  FOR ALL USING (public.is_admin());

-- 4. Atomically replace one canonical cart and its lines.
CREATE OR REPLACE FUNCTION public.replace_cart(
  p_user_id UUID,
  p_anonymous_id TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_item RECORD;
BEGIN
  IF (p_user_id IS NULL AND (p_anonymous_id IS NULL OR btrim(p_anonymous_id) = ''))
     OR (p_user_id IS NOT NULL AND p_anonymous_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one cart owner is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(p_user_id::TEXT, p_anonymous_id), 0));

  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_cart_id FROM public.carts WHERE user_id = p_user_id FOR UPDATE;
  ELSE
    SELECT id INTO v_cart_id FROM public.carts WHERE anonymous_id = p_anonymous_id FOR UPDATE;
  END IF;

  IF v_cart_id IS NULL THEN
    INSERT INTO public.carts(user_id, anonymous_id, updated_at)
    VALUES (p_user_id, p_anonymous_id, NOW())
    RETURNING id INTO v_cart_id;
  END IF;

  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

  FOR v_item IN
    SELECT product_id, variant_id, quantity
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::JSONB)) AS x(
      product_id TEXT,
      variant_id UUID,
      quantity INTEGER
    )
  LOOP
    IF v_item.product_id IS NULL
       OR v_item.quantity IS NULL
       OR v_item.quantity < 1
       OR v_item.quantity > 99 THEN
      RAISE EXCEPTION 'Invalid cart line';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = v_item.product_id AND p.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Product % is not available', v_item.product_id;
    END IF;

    INSERT INTO public.cart_items(cart_id, product_id, variant_id, quantity, updated_at)
    VALUES (v_cart_id, v_item.product_id, v_item.variant_id, v_item.quantity, NOW());
  END LOOP;

  UPDATE public.carts SET updated_at = NOW() WHERE id = v_cart_id;
  RETURN v_cart_id;
END;
$$;

-- 5. Reserve inventory with row locks before creating a Stripe session.
CREATE OR REPLACE FUNCTION public.reserve_stock_for_order(p_items JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_product_stock INTEGER;
  v_inventory_id UUID;
  v_quantity INTEGER;
  v_reserved INTEGER;
BEGIN
  FOR v_item IN
    SELECT product_id, quantity
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::JSONB)) AS x(product_id TEXT, quantity INTEGER)
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid order stock line';
    END IF;

    SELECT stock_quantity INTO v_product_stock
    FROM public.products
    WHERE id = v_item.product_id AND is_active = TRUE
    FOR UPDATE;

    IF v_product_stock IS NULL THEN
      RAISE EXCEPTION 'Product % is not available', v_item.product_id;
    END IF;

    SELECT id, quantity, reserved_quantity
    INTO v_inventory_id, v_quantity, v_reserved
    FROM public.inventory
    WHERE product_id = v_item.product_id AND variant_id IS NULL
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
      v_quantity := v_product_stock;
      v_reserved := 0;
      INSERT INTO public.inventory(product_id, quantity, reserved_quantity, updated_at)
      VALUES (v_item.product_id, v_quantity, v_reserved, NOW())
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

-- Release a reservation when Stripe session creation or order persistence
-- fails before payment confirmation.
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
    SELECT product_id, quantity
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::JSONB)) AS x(product_id TEXT, quantity INTEGER)
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid order stock line';
    END IF;

    SELECT id, reserved_quantity
    INTO v_inventory_id, v_reserved
    FROM public.inventory
    WHERE product_id = v_item.product_id AND variant_id IS NULL
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

REVOKE ALL ON FUNCTION public.replace_cart(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_cart(UUID, TEXT, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.reserve_stock_for_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.release_stock_for_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order(JSONB) TO service_role;
