-- CHANTIER C4 (15/09/2026) — PORTE DE PUBLICATION : JOURNAL D'AUDIT.
-- Chaque décision de la porte (publier / retirer) est tracée : qui, quoi,
-- quand, pourquoi. Mode « proposition » au démarrage : rien n'est appliqué
-- sans acte admin, mais le scan lui-même n'écrit rien — seul l'apply journalise.
CREATE TABLE IF NOT EXISTS public.catalog_gate_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_name text,
  action text NOT NULL,
  mode text NOT NULL DEFAULT 'proposal',
  reason text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_gate_journal ENABLE ROW LEVEL SECURITY;
