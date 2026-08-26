-- Variant-aware reservations. The first stock migration reserved only the
-- product-level inventory row; this replacement keeps weight, format, shade
-- and scent variants isolated during checkout.
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
  v_variant_id UUID;
BEGIN
  FOR v_item IN
    SELECT product_id, NULLIF(variant_id, '')::UUID AS variant_id, quantity
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::JSONB)) AS x(product_id TEXT, variant_id TEXT, quantity INTEGER)
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

    IF v_item.variant_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE id = v_item.variant_id AND product_id = v_item.product_id AND is_active = TRUE
      ) THEN
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
      IF v_item.variant_id IS NOT NULL THEN
        SELECT stock_quantity INTO v_quantity
        FROM public.product_variants
        WHERE id = v_item.variant_id;
      ELSE
        v_quantity := v_product_stock;
      END IF;
      v_reserved := 0;
      INSERT INTO public.inventory(product_id, variant_id, quantity, reserved_quantity, updated_at)
      VALUES (v_item.product_id, v_item.variant_id, COALESCE(v_quantity, 0), v_reserved, NOW())
      RETURNING id INTO v_inventory_id;
    END IF;

    IF v_quantity - v_reserved < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient available stock for product %', v_item.product_id;
    END IF;

    UPDATE public.inventory
    SET reserved_quantity = v_reserved + v_item.quantity, updated_at = NOW()
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
    SELECT product_id, NULLIF(variant_id, '')::UUID AS variant_id, quantity
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::JSONB)) AS x(product_id TEXT, variant_id TEXT, quantity INTEGER)
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid order stock line';
    END IF;
    SELECT id, reserved_quantity INTO v_inventory_id, v_reserved
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
    SET reserved_quantity = v_reserved - v_item.quantity, updated_at = NOW()
    WHERE id = v_inventory_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_stock_for_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.release_stock_for_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order(JSONB) TO service_role;
