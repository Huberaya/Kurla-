-- CHANTIER C5 (15/09/2026) — DÉROGATIONS DATÉES.
-- Une fiche hors critères maintenue en boutique est un choix d'exploitant :
-- il devient explicite (motif, décideur) et PÉRISSABLE (expiration).
-- À expiration, la porte de publication (C4) peut proposer le retrait —
-- la dérogation active, elle, protège la fiche de toute proposition.
CREATE TABLE IF NOT EXISTS public.catalog_derogations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  reason text NOT NULL,
  decided_by text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_derogations ENABLE ROW LEVEL SECURITY;
