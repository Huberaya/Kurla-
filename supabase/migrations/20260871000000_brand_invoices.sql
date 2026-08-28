-- ============================================================
-- CHANTIER 12 (bloc D2) — FACTURATION DU CONTRAT MARQUE
--
-- Le contrat marque (migration 20260870) pouvait porter un prix : rien ne le
-- facturait. Cette table matérialise la facture et, surtout, la **preuve** du
-- règlement : une facture ne passe à `paid` qu'avec une date de règlement et
-- l'identifiant de la session Stripe qui l'a produite.
--
-- Le montant n'est pas un paramètre : il est copié du contrat signé au moment
-- de l'émission (voir `issueBrandInvoice`). Une contrainte SQL ne pourrait pas
-- le vérifier — PostgreSQL interdit les sous-requêtes dans un CHECK — c'est
-- donc l'absence de paramètre qui rend l'écart impossible.
--
-- Migration additive.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brand_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  contract_id UUID NOT NULL REFERENCES public.brand_contracts(id) ON DELETE CASCADE,
  brand_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'eur' CHECK (currency = 'eur'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'void')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,

  -- « Réglée » sans preuve de paiement serait une écriture comptable inventée.
  CONSTRAINT brand_invoice_paid_requires_proof CHECK (
    status <> 'paid'
    OR (paid_at IS NOT NULL AND stripe_session_id IS NOT NULL)
  ),
  -- Une annulation sans motif n'est pas auditable.
  CONSTRAINT brand_invoice_void_requires_reason CHECK (
    status <> 'void'
    OR (voided_at IS NOT NULL AND char_length(coalesce(void_reason, '')) >= 5)
  )
);

-- Une seule facture en attente par contrat : deux factures ouvertes pour la
-- même prestation, c'est une double facturation qui attend d'arriver.
CREATE UNIQUE INDEX IF NOT EXISTS brand_invoices_one_pending_per_contract
  ON public.brand_invoices(contract_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_brand_invoices_brand
  ON public.brand_invoices(brand_user_id, issued_at DESC);

-- ------------------------------------------------------------
-- RLS : la marque lit ses factures, l'administration lit et écrit.
-- L'écriture passe par le serveur (clé de service) : un client ne peut donc pas
-- marquer sa propre facture comme réglée en écrivant directement en base.
-- ------------------------------------------------------------
ALTER TABLE public.brand_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand reads own invoices" ON public.brand_invoices;
CREATE POLICY "Brand reads own invoices" ON public.brand_invoices
  FOR SELECT USING (brand_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admin issues brand invoices" ON public.brand_invoices;
CREATE POLICY "Admin issues brand invoices" ON public.brand_invoices
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages brand invoices" ON public.brand_invoices;
CREATE POLICY "Admin manages brand invoices" ON public.brand_invoices
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.brand_invoices IS
  'Factures des contrats marque B2B. Le règlement exige une preuve Stripe : date de paiement + identifiant de session.';
COMMENT ON COLUMN public.brand_invoices.amount_cents IS
  'Copié du contrat signé à l’émission. Aucun chemin ne permet de facturer un autre montant.';
