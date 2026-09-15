-- JONCTION COMMANDE → ROUTEUR (16/09/2026).
-- La route de fulfillment est FIGÉE au paiement : qui expédie, par quel
-- modèle, depuis où. Un snapshot, pas une vue : si la source du produit
-- change ensuite, l'histoire de la commande ne change pas.
CREATE TABLE IF NOT EXISTS public.order_item_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  order_item_id text,
  product_id text NOT NULL,
  product_name text,
  quantity integer NOT NULL DEFAULT 1,
  source_id text,
  model text,
  responsible text,
  responsible_kind text,
  lead_time_days integer,
  ships_from text,
  blockers text,
  routed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_item_routes ENABLE ROW LEVEL SECURITY;
