-- MISSION SYSTÈME D'ACHAT/APPRO/CATALOGUE/FULFILLMENT (16/09/2026).
--
-- 1) product_sources — OFFRES FOURNISSEUR (§3, §16) : un produit peut avoir
--    plusieurs sources (dropshipping, affiliation, 3PL, stock KURLA), une
--    seule principale. Coûts réels uniquement : un coût inconnu reste NULL,
--    jamais 0 inventé.
CREATE TABLE IF NOT EXISTS public.product_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  supplier_id text,
  partner_name text,
  model text NOT NULL DEFAULT 'dropshipping',
  is_primary boolean NOT NULL DEFAULT false,
  cost_cents integer,
  fee_cents integer,
  fulfillment_cost_cents integer,
  commission_pct numeric,
  affiliate_url text,
  cookie_days integer,
  lead_time_days integer,
  ships_from text,
  currency text NOT NULL DEFAULT 'EUR',
  available boolean NOT NULL DEFAULT true,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) sourcing_workflow_events — TRAÇABILITÉ DU WORKFLOW 8 ÉTAPES (§4, §8, §28) :
--    chaque transition (y compris refus motivé) est horodatée et attribuée.
CREATE TABLE IF NOT EXISTS public.sourcing_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  from_state text,
  to_state text NOT NULL,
  reason text,
  comment text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
