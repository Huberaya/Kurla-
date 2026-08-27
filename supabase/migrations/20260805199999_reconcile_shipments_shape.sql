-- ============================================================================
-- RÉCONCILIATION DE public.shipments
--
-- Constat vérifié sur l'instance réelle (projet Kurla, eu-west-1) :
--
--   - `public.shipments` existe avec 7 colonnes et 0 ligne ;
--   - la migration 20260805200000 en attend 14, dont `user_id` ;
--   - son `CREATE TABLE IF NOT EXISTS` saute donc silencieusement la création,
--     puis `CREATE INDEX ... ON public.shipments(user_id)` et les politiques RLS
--     échouent sur la colonne absente.
--
-- C'est la cause racine de la dérive constatée : 6 migrations figurent dans
-- `supabase_migrations.schema_migrations` alors que leurs tables n'existent pas.
-- Elles ont échoué à l'exécution mais ont été enregistrées comme appliquées.
--
-- Cette migration doit passer AVANT 20260805200000. Elle est additive et
-- idempotente : aucune colonne existante n'est modifiée ni supprimée.
-- ============================================================================

-- Colonnes manquantes
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'standard';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Valeurs par défaut attendues par la migration cible
ALTER TABLE public.shipments ALTER COLUMN carrier SET DEFAULT 'manual';
ALTER TABLE public.shipments ALTER COLUMN status SET DEFAULT 'preparing';

-- Contraintes de domaine attendues par la migration cible.
-- DROP IF EXISTS puis ADD : rejouable sans erreur de duplication.
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_carrier_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_carrier_check
  CHECK (carrier IN ('manual', 'colissimo', 'mondial_relay', 'chronopost', 'dhl', 'autre'));

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_status_check
  CHECK (status IN ('preparing', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'));

COMMENT ON TABLE public.shipments IS
  'Expéditions. Réconciliée avec la forme attendue par 20260805200000 : la table préexistait avec 7 colonnes et bloquait silencieusement cette migration.';
