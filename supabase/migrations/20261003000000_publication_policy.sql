-- ============================================================
-- MODE STRICT DE LA BOUTIQUE — table publication_policy (chantier C3, lot 1)
-- ============================================================
-- Chantier : « Pipeline de mise en vente » — Lot 1 (B + C), décision C3.
--
-- Rôle : porter l'interrupteur PERSISTÉ du mode strict de la liste publique.
-- OFF par défaut (le choix de test de l'exploitant est respecté). Quand il
-- passe à true, la liste publique ne sert plus que les fiches conformes
-- (critères de mise en vente au vert) ; chaque armement est journalisé
-- (qui, quand) — un interrupteur sans journal n'est pas un interrupteur.
--
-- Une SEULE ligne (id = 1) : la politique de publication est un état global
-- de la plateforme, pas une donnée par produit.
--
-- Application : MANUELLE — l'éditeur SQL du dashboard Supabase suffit
-- (aucun jeton requis), ou Management API (jeton sbp_, scope Database).
-- Idempotent : CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS +
-- INSERT ... ON CONFLICT DO NOTHING. Rejouer ce fichier ne casse rien.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.publication_policy (
  -- Une seule ligne, jamais plus : la politique est globale.
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- OFF par défaut : le mode strict ne s'arme que par acte explicite,
  -- journalisé. Aucune dérive par défaut, aucune dérive par migration.
  strict_mode boolean NOT NULL DEFAULT false,
  -- NULL tant que le mode strict n'a jamais été armé : on n'invente pas
  -- une date d'armement qui n'a pas eu lieu.
  activated_at timestamptz,
  activated_by text,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.publication_policy IS
  'Politique de publication de la boutique (une ligne) : mode strict ON/OFF, armement daté et nommé. OFF par défaut ; chaque armement est un acte explicite et journalisé. Chantier C3 « Pipeline de mise en vente » (lot 1).';
COMMENT ON COLUMN public.publication_policy.strict_mode IS
  'true = la liste publique ne sert que les fiches conformes aux critères de mise en vente. false (défaut) = comportement actuel, choix de test respecté.';
COMMENT ON COLUMN public.publication_policy.activated_at IS
  'Date du dernier passage à true. NULL = le mode strict n''a jamais été armé.';

-- RLS au même niveau que les tables sourcing (chantier 16 / 16C) :
-- admin uniquement. Le service role (le serveur) bypass ; l'anon
-- n'a aucun accès (fail-closed).
ALTER TABLE public.publication_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads publication policy" ON public.publication_policy;
CREATE POLICY "Admin reads publication policy" ON public.publication_policy
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin updates publication policy" ON public.publication_policy;
CREATE POLICY "Admin updates publication policy" ON public.publication_policy
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin inserts publication policy" ON public.publication_policy;
CREATE POLICY "Admin inserts publication policy" ON public.publication_policy
  FOR INSERT WITH CHECK (public.is_admin());

-- La ligne unique, à l'état OFF.
INSERT INTO public.publication_policy (id, strict_mode)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
