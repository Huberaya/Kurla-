-- ============================================================
-- SOURCING DE FOND — 50 BESOINS × 5 PRODUITS (migré le 15/09/2026)
-- ============================================================
-- Le registre `docs/sourcing/SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.csv`
-- (250 lignes, 243 prix publics constatés les 14-15/09/2026, 7 « à vérifier »)
-- est migré dans le schéma sourcing EXISTANT, sans créer de structure à côté :
--
--   - les 50 besoins      → public.sourcing_items  (ids fond-50-n01..n50)
--   - les 7 fournisseurs  → public.suppliers (2 réutilisés d'ores et déjà :
--                           sup-blacketique-sas, sup-eolys-beaute)
--   - les 250 positions   → cette table (produit + prix constaté + canal)
--
-- Les RFQ déjà rédigées (docs/sourcing/RFQ_SOURCING_FOND_2026-09-15.md)
-- pourront brancher public.rfqs.sourcing_item_id sur les ids fond-50-nXX.
--
-- MÊME DISCIPLINE QUE LE CHANTIER 16C : la plateforme n'invente ni un prix,
-- ni un statut. prix_constate_cents est NULLABLE : une position sans prix
-- observé est « à vérifier » — un zéro par défaut serait une donnée inventée.
-- L'insertion des lignes (DML) est faite par le script de migration daté du
-- 15/09/2026 (service role), idempotente, dry-run par défaut.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sourcing_fond_positions (
  sourcing_item_id text NOT NULL REFERENCES public.sourcing_items(id) ON DELETE CASCADE,
  rang smallint NOT NULL CHECK (rang BETWEEN 1 AND 5),
  marque text NOT NULL,
  produit text NOT NULL,
  format text,
  -- Prix public constaté les 14-15/09/2026, en centimes d'euro. NULL =
  -- « à vérifier » (prix non observé cette session) — jamais de valeur supposée.
  prix_constate_cents integer CHECK (prix_constate_cents IS NULL OR prix_constate_cents > 0),
  -- Statut complet, daté et sourcé : « vérifié le 14/09/2026 — <revendeur> »,
  -- « constaté le 14/09/2026 (fiche) — <fiche> » ou « à vérifier (…) ».
  statut_prix text NOT NULL,
  -- Canal fournisseur identifié pour cette position (carte du document maître).
  fournisseur_canal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sourcing_item_id, rang)
);

COMMENT ON TABLE public.sourcing_fond_positions IS
  'Sourcing de fond 14-15/09/2026 : les 5 produits par besoin (250 positions), prix publics constatés avec source. Prix en centimes d''euro, NULL = à vérifier (jamais inventé). Réf : docs/sourcing/SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.csv.';
COMMENT ON COLUMN public.sourcing_fond_positions.prix_constate_cents IS
  'Prix public constaté (centimes EUR). NULL volontaire = position « à vérifier » : aucune valeur supposée, cohérence avec la discipline du chantier 16C.';

-- RLS au même niveau que les tables sourcing C1 : admin uniquement
-- (le service role bypass ; l'anon n'a aucun accès).
ALTER TABLE public.sourcing_fond_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads sourcing fond positions" ON public.sourcing_fond_positions;
CREATE POLICY "Admin reads sourcing fond positions" ON public.sourcing_fond_positions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin inserts sourcing fond positions" ON public.sourcing_fond_positions;
CREATE POLICY "Admin inserts sourcing fond positions" ON public.sourcing_fond_positions
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin updates sourcing fond positions" ON public.sourcing_fond_positions;
CREATE POLICY "Admin updates sourcing fond positions" ON public.sourcing_fond_positions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
