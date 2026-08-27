-- =============================================================================
-- CHANTIER 7.6 — Devise d'encaissement et TVA
--
-- Avant cette migration, la commande ne stockait qu'un `total` TTC : le taux
-- appliqué, la part de TVA et le pays de taxation n'étaient nulle part. Une
-- facture ne peut pas être reconstituée à partir de ça, et le taux français de
-- 20 % était implicitement appliqué à toute l'Europe alors qu'une vente à un
-- particulier allemand est taxée à 19 % (principe de destination, directive
-- 2006/112/CE art. 33, déclaré via l'OSS).
--
-- Ce que cette migration ajoute :
--   1. `orders.currency`, verrouillé sur EUR par une contrainte CHECK — la règle
--      déjà appliquée aux paiements et aux remboursements devient visible sur la
--      commande elle-même.
--   2. Les champs de TVA de la commande : pays de taxation, net, TVA, ventilation
--      par taux, numéro de TVA du client.
--   3. Les mêmes champs par ligne, pour qu'une ligne puisse être auditée seule.
--   4. Le RPC de création de commande les écrit dans la **même transaction** que
--      la réservation de stock : pas de commande dont la TVA serait écrite dans
--      un second temps, donc jamais incohérente si le processus s'arrête entre
--      les deux.
--
-- Aucun montant n'est recalculé ici : les prix TTC encaissés ne changent pas.
-- C'est la ventilation comptable qui devient exacte et stockée.
-- =============================================================================

-- 1. COMMANDES : devise et TVA ------------------------------------------------

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_country TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10, 2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vat_breakdown JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_vat_number TEXT;

-- KURLA encaisse en euros. La contrainte rend la règle inratable : ajouter une
-- devise demande un acte délibéré (et un encaissement Stripe correspondant).
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_currency_settlement;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_currency_settlement CHECK (upper(currency) = 'EUR');

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vat_amounts_positive;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_vat_amounts_positive CHECK (
    (net_amount IS NULL OR net_amount >= 0)
    AND (vat_amount IS NULL OR vat_amount >= 0)
  );

-- Le net et la TVA déclarés ne peuvent pas dépasser ce qui a été encaissé.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vat_within_total;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_vat_within_total CHECK (
    net_amount IS NULL OR vat_amount IS NULL OR (net_amount + vat_amount) <= total + 0.01
  );

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vat_country_shape;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_vat_country_shape CHECK (vat_country IS NULL OR vat_country ~ '^[A-Z]{2}$');

COMMENT ON COLUMN public.orders.currency IS
  'Devise d’encaissement. EUR uniquement : aucune conversion n’est appliquée, un taux non sourcé serait un fait inventé.';
COMMENT ON COLUMN public.orders.vat_country IS
  'Pays de taxation (destination). Pour une vente B2C intracommunautaire, le taux dû est celui de ce pays.';
COMMENT ON COLUMN public.orders.net_amount IS 'Total hors taxe, somme du net des lignes et du port.';
COMMENT ON COLUMN public.orders.vat_amount IS 'TVA totale due, ventilée dans vat_breakdown.';
COMMENT ON COLUMN public.orders.vat_breakdown IS
  'Ventilation par taux : [{ratePercent, netCents, vatCents}]. Ce qui figure sur la facture.';
COMMENT ON COLUMN public.orders.customer_vat_number IS
  'Numéro de TVA intracommunautaire du client. Ne vaut exonération que s’il a été vérifié auprès de VIES.';

-- 2. LIGNES DE COMMANDE ------------------------------------------------------

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(10, 2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_vat_shape;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_vat_shape CHECK (
    (vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100))
    AND (vat_amount IS NULL OR vat_amount >= 0)
    AND (line_total IS NULL OR line_total >= 0)
    AND upper(currency) = 'EUR'
  );

COMMENT ON COLUMN public.order_items.vat_rate IS 'Taux de TVA appliqué à la ligne, en pourcentage.';
COMMENT ON COLUMN public.order_items.vat_amount IS 'Part de TVA de la ligne, incluant sa quote-part de port.';
COMMENT ON COLUMN public.order_items.line_total IS 'Montant TTC encaissé pour la ligne (quantité × prix unitaire).';

-- 3. CRÉATION ATOMIQUE DE LA COMMANDE ----------------------------------------
--
-- La signature s'allonge de six paramètres. L'ancienne signature à 11 paramètres
-- **n'est pas supprimée** : elle devient un relais qui délègue à la nouvelle.
--
-- Pourquoi garder les deux : supprimer l'ancienne casserait immédiatement le
-- code déjà déployé, qui appelle onze paramètres. Avec le relais, l'ordre
-- d'application n'a plus d'importance — la migration peut passer avant ou après
-- le déploiement sans jamais interrompre un paiement. Le relais sera supprimé
-- quand plus aucun appelant n'ignorera la TVA.

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
BEGIN
  -- Relais de compatibilité : aucune TVA n'est déclarée par cet appelant.
  RETURN public.create_order_with_stock_reservation(
    p_order_id, p_user_id, p_customer_email, p_items, p_total, p_status,
    p_stripe_session_id, p_stripe_payment_intent_id, p_checkout_idempotency_key,
    p_shipping_address, p_created_at,
    'EUR', NULL, NULL, NULL, NULL, NULL
  );
END;
$$;

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
  p_created_at TIMESTAMPTZ,
  p_currency TEXT DEFAULT 'EUR',
  p_vat_country TEXT DEFAULT NULL,
  p_net_amount NUMERIC DEFAULT NULL,
  p_vat_amount NUMERIC DEFAULT NULL,
  p_vat_breakdown JSONB DEFAULT NULL,
  p_customer_vat_number TEXT DEFAULT NULL
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

  -- Devise d'encaissement. Même garde que pour les paiements et remboursements :
  -- une commande en devise inconnue serait impossible à rembourser.
  IF upper(COALESCE(p_currency, 'EUR')) <> 'EUR' THEN
    RAISE EXCEPTION 'Orders are settled in EUR only, got %', p_currency;
  END IF;

  -- La ventilation doit retomber sur le total encaissé. Sans ce contrôle, une
  -- TVA incohérente entrerait en base et fausserait la déclaration.
  IF p_net_amount IS NOT NULL AND p_vat_amount IS NOT NULL
     AND abs((p_net_amount + p_vat_amount) - p_total) > 0.01 THEN
    RAISE EXCEPTION 'VAT breakdown does not reconcile with the order total (net % + vat % vs total %)',
      p_net_amount, p_vat_amount, p_total;
  END IF;
  IF p_vat_breakdown IS NOT NULL AND jsonb_typeof(p_vat_breakdown) <> 'array' THEN
    RAISE EXCEPTION 'VAT breakdown must be an array of rate buckets';
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
    shipping_address, created_at, updated_at,
    currency, vat_country, net_amount, vat_amount, vat_breakdown, customer_vat_number
  ) VALUES (
    p_order_id, p_user_id, p_customer_email, p_items, p_total, p_status,
    p_stripe_session_id, p_stripe_payment_intent_id, v_checkout_key,
    p_shipping_address, COALESCE(p_created_at, NOW()), NOW(),
    upper(COALESCE(p_currency, 'EUR')),
    NULLIF(upper(BTRIM(COALESCE(p_vat_country, ''))), ''),
    p_net_amount,
    p_vat_amount,
    p_vat_breakdown,
    NULLIF(upper(BTRIM(COALESCE(p_customer_vat_number, ''))), '')
  )
  RETURNING * INTO v_order;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) AS item(value)
  LOOP
    INSERT INTO public.order_items(
      order_id, product_id, variant_id, quantity, unit_price,
      vat_rate, vat_amount, line_total, currency
    )
    VALUES (
      v_order.id,
      COALESCE(NULLIF(v_line.value->>'product_id', ''), NULLIF(v_line.value->>'productId', '')),
      NULLIF(COALESCE(v_line.value->>'variant_id', v_line.value->>'variantId'), '')::UUID,
      (v_line.value->>'quantity')::INTEGER,
      COALESCE(NULLIF(v_line.value->>'unit_price', ''), NULLIF(v_line.value->>'price', ''))::NUMERIC,
      NULLIF(COALESCE(v_line.value->>'vat_rate', v_line.value->>'vatRate'), '')::NUMERIC,
      NULLIF(COALESCE(v_line.value->>'vat_amount', v_line.value->>'vatAmount'), '')::NUMERIC,
      NULLIF(COALESCE(v_line.value->>'line_total', v_line.value->>'lineTotal'), '')::NUMERIC,
      upper(COALESCE(p_currency, 'EUR'))
    );
  END LOOP;

  INSERT INTO public.payments(order_id, amount, currency, status, stripe_payment_intent_id, created_at, updated_at)
  VALUES (v_order.id, v_order.total, upper(COALESCE(p_currency, 'EUR')), v_order.status, v_order.stripe_payment_intent_id, NOW(), NOW());

  INSERT INTO public.order_status_history(order_id, old_status, new_status, changed_by_role, reason, source)
  VALUES (v_order.id, NULL, v_order.status, 'system', 'Création de la commande et réservation atomique du stock', 'checkout');

  RETURN to_jsonb(v_order);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_stock_reservation(
  TEXT, UUID, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ,
  TEXT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_order_with_stock_reservation(
  TEXT, UUID, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ,
  TEXT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT
) TO service_role;

COMMENT ON FUNCTION public.create_order_with_stock_reservation IS
  'Crée la commande, ses lignes, sa ligne de paiement et son historique, et réserve le stock, dans une seule transaction. Écrit aussi la devise et la ventilation de TVA. Idempotent sur la clé de checkout.';
