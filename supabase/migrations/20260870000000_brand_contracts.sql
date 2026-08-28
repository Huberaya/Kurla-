-- ============================================================
-- CHANTIER 12 (bloc D) — CONTRAT MARQUE SIGNÉ
--
-- Critère de sortie du chantier F : « un contrat marque signé sur agrégats,
-- sans aucune donnée personnelle cédée ». L'espace marque existait depuis le
-- chantier 8.6c2 (rôle `brand`, 10 routes, 4 tables, rapport k-anonyme) mais
-- aucune table ne matérialisait le contrat : une marque pouvait déposer une
-- demande de test sans avoir rien signé.
--
-- Parti pris : on signe un **texte versionné**, identifié par son empreinte.
-- Modifier le texte change `terms_hash` et rend les signatures existantes
-- inopérantes — la clause « aucune donnée personnelle cédée » ne peut donc pas
-- être modifiée après coup sans nouvelle signature des deux parties.
--
-- Migration additive : aucune table ni colonne existante n'est modifiée.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brand_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL CHECK (char_length(brand_name) BETWEEN 2 AND 120),
  contact_email TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  terms_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'active', 'terminated', 'expired')),
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  signed_by_brand_at TIMESTAMPTZ,
  signed_by_kurla_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,

  -- Un contrat « actif » sans les deux signatures serait une fiction : la
  -- contrainte rend cet état impossible en base, pas seulement improbable.
  CONSTRAINT brand_contract_active_requires_both_signatures CHECK (
    status <> 'active'
    OR (signed_by_brand_at IS NOT NULL AND signed_by_kurla_at IS NOT NULL)
  ),
  -- La marque signe avant KURLA : on ne contresigne pas un texte que l'autre
  -- partie n'a pas accepté.
  CONSTRAINT brand_contract_kurla_signs_last CHECK (
    signed_by_kurla_at IS NULL OR signed_by_brand_at IS NOT NULL
  ),
  -- Une résiliation sans motif n'est pas traçable.
  CONSTRAINT brand_contract_termination_has_reason CHECK (
    status <> 'terminated'
    OR (terminated_at IS NOT NULL AND char_length(coalesce(termination_reason, '')) >= 5)
  )
);

-- Un seul contrat actif par marque : deux contrats actifs laisseraient croire
-- que deux textes différents engagent la même marque.
CREATE UNIQUE INDEX IF NOT EXISTS brand_contracts_one_active_per_brand
  ON public.brand_contracts(brand_user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_brand_contracts_brand
  ON public.brand_contracts(brand_user_id, issued_at DESC);

-- ------------------------------------------------------------
-- RLS : la marque lit ses contrats, l'administration lit et écrit.
-- L'écriture par la marque passe par le serveur (clé de service) : un client
-- ne peut donc pas se contresigner lui-même en écrivant directement en base.
-- ------------------------------------------------------------
ALTER TABLE public.brand_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand reads own contracts" ON public.brand_contracts;
CREATE POLICY "Brand reads own contracts" ON public.brand_contracts
  FOR SELECT USING (brand_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admin issues brand contracts" ON public.brand_contracts;
CREATE POLICY "Admin issues brand contracts" ON public.brand_contracts
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages brand contracts" ON public.brand_contracts;
CREATE POLICY "Admin manages brand contracts" ON public.brand_contracts
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.brand_contracts IS
  'Contrat marque : texte versionné signé par la marque puis contresigné par KURLA. Sans contrat actif, aucune demande de test.';
COMMENT ON COLUMN public.brand_contracts.terms_hash IS
  'Empreinte SHA-256 du texte signé. Changer le texte exige une nouvelle signature.';
COMMENT ON COLUMN public.brand_contracts.status IS
  'issued (émis, non signé) | active (les deux signatures) | terminated (résilié, motif obligatoire) | expired.';
