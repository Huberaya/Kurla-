-- ============================================================
-- CHANTIER 16D — LOT, COÛT SERVI, DOUBLE SOURCING
-- ============================================================
-- Critère du chantier : « quelles commandes contiennent le lot X » doit avoir
-- une réponse **en une requête**.
--
-- Trois choix de conception, chacun pour une raison précise :
--
--  1. Le coût servi est une **colonne générée**, pas un champ calculé par
--     l'application. Un coût stocké et recalculé ailleurs finit par diverger ;
--     ici il ne peut pas.
--  2. L'allocation lot → ligne de commande est gardée par un **déclencheur**,
--     pas seulement par le code. On ne peut allouer ni plus que la commande, ni
--     plus que le lot, ni un lot d'un autre produit.
--  3. La traçabilité est une **vue `security_invoker`**. Une vue classique
--     s'exécute avec les droits de son propriétaire et contournerait la RLS :
--     la traçabilité d'un lot ne doit pas devenir une fuite de données clients.
-- ============================================================

-- ------------------------------------------------------------
-- Les lots reçus.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_batches (
  id text PRIMARY KEY,
  lot_reference text NOT NULL,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  supplier_id text REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  sourcing_item_id text REFERENCES public.sourcing_items(id) ON DELETE SET NULL,
  quantity_received integer NOT NULL CHECK (quantity_received > 0),
  -- Les coûts sont saisis, jamais déduits. Trois postes distincts parce que le
  -- coût servi se discute poste par poste avec un fournisseur.
  unit_cost_cents integer NOT NULL CHECK (unit_cost_cents > 0),
  freight_cents integer NOT NULL DEFAULT 0 CHECK (freight_cents >= 0),
  duty_cents integer NOT NULL DEFAULT 0 CHECK (duty_cents >= 0),
  other_costs_cents integer NOT NULL DEFAULT 0 CHECK (other_costs_cents >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  -- Colonne générée : le coût servi ne peut pas diverger de ses entrées.
  -- Division entière, donc arrondie au centime inférieur ; le détail des postes
  -- reste lisible à côté, rien n'est masqué par l'arrondi.
  served_cost_cents integer GENERATED ALWAYS AS (
    (quantity_received * unit_cost_cents + freight_cents + duty_cents + other_costs_cents) / quantity_received
  ) STORED,
  received_on date NOT NULL,
  expires_on date,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'in_stock', 'depleted', 'rejected')),
  notes text,
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_batch_dates_coherent CHECK (expires_on IS NULL OR expires_on >= received_on),
  CONSTRAINT product_batch_costs_coherent CHECK (
    unit_cost_cents + freight_cents + duty_cents + other_costs_cents > 0
  )
);

COMMENT ON COLUMN public.product_batches.served_cost_cents IS
  'Coût servi par unité, en centimes : (quantité × coût unitaire + fret + droits + autres) / quantité. Colonne générée, donc jamais désynchronisée de ses entrées.';

-- ------------------------------------------------------------
-- L'allocation : quelle quantité de quel lot part dans quelle ligne.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_item_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  batch_id text NOT NULL REFERENCES public.product_batches(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  allocated_by text,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_item_batch_unique UNIQUE (order_item_id, batch_id)
);

-- ------------------------------------------------------------
-- Le déclencheur d'intégrité de l'allocation.
--
-- Sans lui, la réponse à « quelles commandes contiennent le lot X » pourrait
-- être fausse : une ligne sur-allouée, un lot vidé au-delà de sa quantité, ou
-- un lot de shampoing alloué à une ligne de masque produiraient une
-- traçabilité mentieuse — et une traçabilité mentieuse est pire qu'aucune.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_batch_allocation() RETURNS trigger AS $fn$
DECLARE
  item_quantity integer;
  item_product text;
  batch_quantity integer;
  batch_product text;
  already_item integer;
  already_batch integer;
BEGIN
  SELECT oi.quantity, oi.product_id INTO item_quantity, item_product
    FROM public.order_items oi WHERE oi.id = NEW.order_item_id;
  IF item_quantity IS NULL THEN
    RAISE EXCEPTION 'Ligne de commande introuvable : %', NEW.order_item_id;
  END IF;

  SELECT b.quantity_received, b.product_id INTO batch_quantity, batch_product
    FROM public.product_batches b WHERE b.id = NEW.batch_id;
  IF batch_quantity IS NULL THEN
    RAISE EXCEPTION 'Lot introuvable : %', NEW.batch_id;
  END IF;

  -- Un lot d'un autre produit que la ligne n'a aucun sens physique.
  IF batch_product IS DISTINCT FROM item_product THEN
    RAISE EXCEPTION 'Allocation refusée : le lot % porte le produit %, la ligne de commande porte %.',
      NEW.batch_id, batch_product, item_product;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO already_item
    FROM public.order_item_batches WHERE order_item_id = NEW.order_item_id;
  IF TG_OP = 'UPDATE' THEN
    already_item := already_item - OLD.quantity;
  END IF;
  IF already_item + NEW.quantity > item_quantity THEN
    RAISE EXCEPTION 'Allocation refusée : la ligne % porte % unité(s), % déjà allouée(s), % demandée(s).',
      NEW.order_item_id, item_quantity, already_item, NEW.quantity;
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO already_batch
    FROM public.order_item_batches WHERE batch_id = NEW.batch_id;
  IF TG_OP = 'UPDATE' THEN
    already_batch := already_batch - OLD.quantity;
  END IF;
  IF already_batch + NEW.quantity > batch_quantity THEN
    RAISE EXCEPTION 'Allocation refusée : le lot % contient % unité(s), % déjà allouée(s), % demandée(s).',
      NEW.batch_id, batch_quantity, already_batch, NEW.quantity;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_batch_allocation ON public.order_item_batches;
CREATE TRIGGER enforce_batch_allocation
  BEFORE INSERT OR UPDATE ON public.order_item_batches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_batch_allocation();

-- ------------------------------------------------------------
-- La traçabilité : la réponse au critère, en une requête.
--
--   select * from public.batch_order_trace where batch_id = '<lot>';
--
-- security_invoker = true : la vue s'exécute avec les droits de l'appelant,
-- donc la RLS des tables sous-jacentes s'applique. Sans cette option, la vue
-- tournerait avec les droits du propriétaire et exposerait les adresses
-- courriel des clients à n'importe quel rôle.
-- ------------------------------------------------------------
DROP VIEW IF EXISTS public.batch_order_trace;
CREATE VIEW public.batch_order_trace WITH (security_invoker = true) AS
SELECT
  b.id                        AS batch_id,
  b.lot_reference             AS lot_reference,
  b.product_id                AS product_id,
  b.supplier_id               AS supplier_id,
  b.served_cost_cents         AS served_cost_cents,
  b.currency                  AS currency,
  a.order_item_id             AS order_item_id,
  a.quantity                  AS allocated_quantity,
  a.allocated_at              AS allocated_at,
  oi.order_id                 AS order_id,
  oi.quantity                 AS ordered_quantity,
  o.status                    AS order_status,
  o.customer_email            AS customer_email,
  o.created_at                AS ordered_at
FROM public.order_item_batches a
  JOIN public.product_batches b  ON b.id  = a.batch_id
  JOIN public.order_items oi     ON oi.id = a.order_item_id
  JOIN public.orders o           ON o.id  = oi.order_id;

CREATE INDEX IF NOT EXISTS idx_product_batches_product ON public.product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_supplier ON public.product_batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_item_batches_batch ON public.order_item_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_order_item_batches_item ON public.order_item_batches(order_item_id);

-- ------------------------------------------------------------
-- RLS : administration seulement.
-- ------------------------------------------------------------
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads product batches" ON public.product_batches;
CREATE POLICY "Admin reads product batches" ON public.product_batches
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes product batches" ON public.product_batches;
CREATE POLICY "Admin writes product batches" ON public.product_batches
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates product batches" ON public.product_batches;
CREATE POLICY "Admin updates product batches" ON public.product_batches
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin reads batch allocations" ON public.order_item_batches;
CREATE POLICY "Admin reads batch allocations" ON public.order_item_batches
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin writes batch allocations" ON public.order_item_batches;
CREATE POLICY "Admin writes batch allocations" ON public.order_item_batches
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates batch allocations" ON public.order_item_batches;
CREATE POLICY "Admin updates batch allocations" ON public.order_item_batches
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
