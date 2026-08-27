-- ============================================================
-- KURLA INTELLIGENCE FOUNDATION
-- Levée des trois impossibilités architecturales identifiées dans
-- docs/KURLA_STRATEGIE_REFERENCE_MONDIALE.md :
--   1. les ingrédients n'étaient pas des entités (TEXT[] libre) ;
--   2. le feedback de routine n'était jamais consommé ;
--   3. aucune agrégation par archétype n'était possible.
--
-- Principe directeur : KURLA ne devine pas. Un fait absent reste NULL,
-- et aucune agrégation n'est publiée sous le seuil de k-anonymité.
-- ============================================================

-- ------------------------------------------------------------
-- 1. GRAPHE DE CONNAISSANCES — INGRÉDIENTS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ingredients (
  id TEXT PRIMARY KEY,
  inci_name TEXT NOT NULL UNIQUE,
  inci_name_normalized TEXT NOT NULL UNIQUE,
  common_names TEXT[] NOT NULL DEFAULT '{}',
  functions TEXT[] NOT NULL DEFAULT '{}',
  family TEXT,
  origin TEXT,
  is_fragrance BOOLEAN,
  is_allergen_regulated BOOLEAN NOT NULL DEFAULT FALSE,
  comedogenicity_index SMALLINT CHECK (comedogenicity_index IS NULL OR comedogenicity_index BETWEEN 0 AND 5),
  max_concentration_eu_percent NUMERIC(6, 3),
  description TEXT,
  verification_status TEXT NOT NULL DEFAULT 'not_provided',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredients_verification_status_check
    CHECK (verification_status IN ('verified', 'pending', 'not_provided'))
);
CREATE INDEX IF NOT EXISTS idx_ingredients_functions ON public.ingredients USING GIN(functions);
CREATE INDEX IF NOT EXISTS idx_ingredients_family ON public.ingredients(family);

COMMENT ON TABLE public.ingredients IS 'Entité ingrédient. Remplace le tableau TEXT[] libre : sans entité, aucune agrégation ni raisonnement par ingrédient n''est possible.';

CREATE TABLE IF NOT EXISTS public.ingredient_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  claim TEXT NOT NULL,
  evidence_level TEXT NOT NULL,
  populations_studied TEXT[] NOT NULL DEFAULT '{}',
  texture_scope TEXT[] NOT NULL DEFAULT '{}',
  tone_scope TEXT[] NOT NULL DEFAULT '{}',
  climate_scope TEXT[] NOT NULL DEFAULT '{}',
  source_kind TEXT NOT NULL DEFAULT 'not_provided',
  source_reference TEXT,
  source_url TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredient_evidence_level_check
    CHECK (evidence_level IN ('A', 'B', 'C', 'D', 'not_established')),
  CONSTRAINT ingredient_evidence_source_kind_check
    CHECK (source_kind IN ('regulatory', 'peer_reviewed', 'consensus', 'expert', 'commercial', 'not_provided'))
);
CREATE INDEX IF NOT EXISTS idx_ingredient_evidence_ingredient ON public.ingredient_evidence(ingredient_id, evidence_level);
CREATE INDEX IF NOT EXISTS idx_ingredient_evidence_texture ON public.ingredient_evidence USING GIN(texture_scope);

COMMENT ON TABLE public.ingredient_evidence IS 'Matérialise en base le gradateur de preuve A-D qui n''existait que dans le prompt IA. populations_studied est le champ critique : une preuve obtenue sur peau claire ne vaut pas pour une peau riche en mélanine.';

CREATE TABLE IF NOT EXISTS public.ingredient_incompatibilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_a TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  ingredient_b TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'caution',
  explanation TEXT NOT NULL,
  evidence_level TEXT NOT NULL DEFAULT 'C',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredient_incompatibility_distinct CHECK (ingredient_a <> ingredient_b),
  CONSTRAINT ingredient_incompatibility_unique UNIQUE (ingredient_a, ingredient_b),
  CONSTRAINT ingredient_incompatibility_severity_check
    CHECK (severity IN ('avoid', 'caution', 'space_out')),
  CONSTRAINT ingredient_incompatibility_evidence_check
    CHECK (evidence_level IN ('A', 'B', 'C', 'D', 'not_established'))
);

CREATE TABLE IF NOT EXISTS public.ingredient_jurisdiction_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  status TEXT NOT NULL,
  limit_percent NUMERIC(6, 3),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredient_jurisdiction_unique UNIQUE (ingredient_id, jurisdiction),
  CONSTRAINT ingredient_jurisdiction_status_check
    CHECK (status IN ('allowed', 'restricted', 'prohibited', 'unknown'))
);
CREATE INDEX IF NOT EXISTS idx_ingredient_jurisdiction ON public.ingredient_jurisdiction_restrictions(jurisdiction, status);

COMMENT ON TABLE public.ingredient_jurisdiction_restrictions IS 'Une même formule peut être légale dans l''UE et interdite ailleurs. C''est un différenciateur d''internationalisation gratuit une fois le graphe construit.';

-- ------------------------------------------------------------
-- 2. LIEN PRODUIT <-> INGRÉDIENT (remplace ingredients TEXT[])
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.product_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  inci_rank SMALLINT,
  declared_role TEXT,
  declared_concentration_percent NUMERIC(6, 3),
  is_key_ingredient BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'declared',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_ingredients_unique UNIQUE (product_id, ingredient_id),
  CONSTRAINT product_ingredients_source_check
    CHECK (source IN ('declared', 'inci_label', 'brand_confirmed', 'lab_analysed'))
);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON public.product_ingredients(product_id, inci_rank);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON public.product_ingredients(ingredient_id);

COMMENT ON TABLE public.product_ingredients IS 'Jonction normalisée. inci_rank permet de raisonner sur la position dans la liste INCI, donc sur la concentration réelle.';

-- ------------------------------------------------------------
-- 3. VOCABULAIRES CONTRÔLÉS (remplace les TEXT[] libres)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kurla_taxonomies (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kurla_taxonomy_terms (
  id TEXT PRIMARY KEY,
  taxonomy_id TEXT NOT NULL REFERENCES public.kurla_taxonomies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_en TEXT,
  parent_term_id TEXT REFERENCES public.kurla_taxonomy_terms(id) ON DELETE SET NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kurla_taxonomy_terms_unique UNIQUE (taxonomy_id, code)
);
CREATE INDEX IF NOT EXISTS idx_taxonomy_terms_taxonomy ON public.kurla_taxonomy_terms(taxonomy_id, sort_order);

COMMENT ON TABLE public.kurla_taxonomy_terms IS 'Vocabulaire contrôlé. Sans lui, concerns/hair_types/skin_types restent des chaînes libres non agrégeables.';

-- ------------------------------------------------------------
-- 4. ARCHÉTYPES — condition de toute statistique communautaire
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.archetypes (
  id TEXT PRIMARY KEY,
  hair_texture_band TEXT,
  porosity_band TEXT,
  density_band TEXT,
  tone_depth_band TEXT,
  sensitivity_band TEXT,
  climate_band TEXT,
  label_fr TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  k_anonymity_threshold INTEGER NOT NULL DEFAULT 30,
  is_publishable BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT archetypes_k_threshold_positive CHECK (k_anonymity_threshold > 0),
  CONSTRAINT archetypes_unique_combination UNIQUE (
    hair_texture_band, porosity_band, density_band, tone_depth_band, sensitivity_band, climate_band
  )
);

COMMENT ON TABLE public.archetypes IS 'is_publishable ne peut passer à vrai que si member_count >= k_anonymity_threshold. C''est ce qui rend la donnée communautaire légalement exploitable.';

CREATE TABLE IF NOT EXISTS public.user_archetypes (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  archetype_id TEXT NOT NULL REFERENCES public.archetypes(id) ON DELETE RESTRICT,
  confidence NUMERIC(5, 2) NOT NULL DEFAULT 0,
  known_fields INTEGER NOT NULL DEFAULT 0,
  derived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_archetypes_archetype ON public.user_archetypes(archetype_id);

-- ------------------------------------------------------------
-- 5. KURLA SHELF — l'inventaire réel de l'utilisateur
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  free_label TEXT,
  status TEXT NOT NULL DEFAULT 'owned',
  category TEXT,
  routine_step TEXT,
  opened_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  estimated_remaining_percent SMALLINT CHECK (estimated_remaining_percent IS NULL OR estimated_remaining_percent BETWEEN 0 AND 100),
  purchase_price NUMERIC(10, 2),
  abandonment_reason TEXT,
  abandonment_note TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_products_status_check
    CHECK (status IN ('owned', 'in_use', 'paused', 'finished', 'abandoned')),
  CONSTRAINT user_products_identity_check
    CHECK (product_id IS NOT NULL OR NULLIF(BTRIM(COALESCE(free_label, '')), '') IS NOT NULL),
  CONSTRAINT user_products_abandoned_reason_check
    CHECK (status <> 'abandoned' OR NULLIF(BTRIM(COALESCE(abandonment_reason, '')), '') IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_user_products_user ON public.user_products(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_products_product ON public.user_products(product_id);

COMMENT ON TABLE public.user_products IS 'KURLA Shelf. Posséder n''est pas acheter : sans inventaire réel, toute recommandation pousse au surachat. abandonment_reason est obligatoire, car l''échec est plus informatif que le succès.';

-- ------------------------------------------------------------
-- 6. OBSERVATIONS DE RÉSULTAT — la donnée du MOAT
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.outcome_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  ingredient_id TEXT REFERENCES public.ingredients(id) ON DELETE SET NULL,
  archetype_id TEXT REFERENCES public.archetypes(id) ON DELETE SET NULL,
  shelf_item_id UUID REFERENCES public.user_products(id) ON DELETE SET NULL,
  signal TEXT NOT NULL,
  valence SMALLINT NOT NULL CHECK (valence BETWEEN -1 AND 1),
  observed_after_days INTEGER CHECK (observed_after_days IS NULL OR observed_after_days >= 0),
  climate_context TEXT,
  note TEXT,
  is_consent_shared BOOLEAN NOT NULL DEFAULT FALSE,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT outcome_observations_scope_check
    CHECK (product_id IS NOT NULL OR ingredient_id IS NOT NULL),
  CONSTRAINT outcome_observations_consent_note_check
    CHECK (is_consent_shared = FALSE OR note IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_outcome_observations_ingredient ON public.outcome_observations(ingredient_id, archetype_id)
  WHERE is_consent_shared = TRUE;
CREATE INDEX IF NOT EXISTS idx_outcome_observations_product ON public.outcome_observations(product_id, archetype_id);
CREATE INDEX IF NOT EXISTS idx_outcome_observations_user ON public.outcome_observations(user_id, observed_at DESC);

COMMENT ON TABLE public.outcome_observations IS 'Remplace l''usage mort de routine_feedback. is_consent_shared distingue « améliorer MES recommandations » de « contribuer à la recherche KURLA » : sans ce consentement granulaire, aucune agrégation n''est licite.';

-- Agrégat publié : la seule surface exposée aux autres utilisateurs et au B2B.
CREATE TABLE IF NOT EXISTS public.ingredient_archetype_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id TEXT NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  archetype_id TEXT NOT NULL REFERENCES public.archetypes(id) ON DELETE CASCADE,
  climate_context TEXT NOT NULL DEFAULT 'any',
  observation_count INTEGER NOT NULL DEFAULT 0,
  positive_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  median_days_to_result INTEGER,
  k_anonymity_threshold INTEGER NOT NULL DEFAULT 30,
  is_publishable BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingredient_archetype_outcomes_unique UNIQUE (ingredient_id, archetype_id, climate_context),
  CONSTRAINT ingredient_archetype_outcomes_counts_check
    CHECK (positive_count >= 0 AND neutral_count >= 0 AND negative_count >= 0),
  CONSTRAINT ingredient_archetype_outcomes_total_check
    CHECK (observation_count = positive_count + neutral_count + negative_count)
);

COMMENT ON TABLE public.ingredient_archetype_outcomes IS 'Le MOAT : efficacité par ingrédient x archétype x climat. Aucune observation individuelle n''y est stockée, uniquement des comptes.';

-- ------------------------------------------------------------
-- 7. TIMELINE DE COIFFURE PROTECTRICE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.protective_style_episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  style TEXT NOT NULL,
  tension TEXT NOT NULL DEFAULT 'normal',
  installed_at TIMESTAMPTZ NOT NULL,
  planned_removal_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  removal_reason TEXT,
  max_wear_days INTEGER NOT NULL DEFAULT 56,
  signals TEXT[] NOT NULL DEFAULT '{}',
  last_signal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT protective_style_tension_check
    CHECK (tension IN ('loose', 'normal', 'firm', 'tight')),
  CONSTRAINT protective_style_open_check
    CHECK (removed_at IS NULL OR removed_at >= installed_at)
);
CREATE INDEX IF NOT EXISTS idx_protective_style_user ON public.protective_style_episodes(user_id, installed_at DESC);

COMMENT ON TABLE public.protective_style_episodes IS 'Aucune plateforme ne suit l''âge d''une coiffure. L''alopécie de traction est cumulative, prévisible et largement évitable.';

-- ------------------------------------------------------------
-- 8. INTELLIGENCE DES RETOURS
-- ------------------------------------------------------------

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS insight_reason TEXT,
  ADD COLUMN IF NOT EXISTS insight_texture_mismatch BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insight_ingredient_suspected TEXT,
  ADD COLUMN IF NOT EXISTS insight_shared BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_insight_reason_check;
ALTER TABLE public.returns
  ADD CONSTRAINT returns_insight_reason_check
  CHECK (insight_reason IS NULL OR insight_reason IN (
    'texture_mismatch', 'too_heavy', 'too_light', 'fragrance', 'reaction',
    'ineffective', 'too_expensive', 'changed_mind', 'damaged', 'other'
  ));
CREATE INDEX IF NOT EXISTS idx_returns_insight ON public.returns(insight_reason, insight_shared);

COMMENT ON COLUMN public.returns.insight_reason IS 'Un retour est une donnée négative, donc plus informative qu''un avis : les avis viennent des acheteurs satisfaits.';

-- ------------------------------------------------------------
-- 9. CO-SIGNATURE PROFESSIONNELLE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_plan_id UUID,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  stance TEXT NOT NULL,
  rationale TEXT NOT NULL,
  amendments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_displayable BOOLEAN NOT NULL DEFAULT FALSE,
  client_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT professional_endorsements_stance_check
    CHECK (stance IN ('approved', 'amended', 'contradicted')),
  CONSTRAINT professional_endorsements_distinct_parties
    CHECK (professional_id <> client_user_id),
  CONSTRAINT professional_endorsements_display_consent_check
    CHECK (is_displayable = FALSE OR client_consent_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_endorsements_professional ON public.professional_endorsements(professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_endorsements_client ON public.professional_endorsements(client_user_id, created_at DESC);

COMMENT ON TABLE public.professional_endorsements IS 'Le pont IA vers humain dans le bon sens : ce n''est pas l''IA qui oriente vers un pro, c''est le pro qui valide ou contredit l''IA. is_displayable exige le consentement du client.';

-- ------------------------------------------------------------
-- 10. SÉCURITÉ
-- ------------------------------------------------------------

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_incompatibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_jurisdiction_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kurla_taxonomies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kurla_taxonomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_archetype_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protective_style_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Knowledge graph is readable" ON public.ingredients;
CREATE POLICY "Knowledge graph is readable" ON public.ingredients
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Ingredient evidence is readable" ON public.ingredient_evidence;
CREATE POLICY "Ingredient evidence is readable" ON public.ingredient_evidence
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Ingredient incompatibilities are readable" ON public.ingredient_incompatibilities;
CREATE POLICY "Ingredient incompatibilities are readable" ON public.ingredient_incompatibilities
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Ingredient restrictions are readable" ON public.ingredient_jurisdiction_restrictions;
CREATE POLICY "Ingredient restrictions are readable" ON public.ingredient_jurisdiction_restrictions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Product ingredients are readable when published" ON public.product_ingredients;
CREATE POLICY "Product ingredients are readable when published" ON public.product_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_ingredients.product_id AND p.catalog_status = 'published'
    )
  );

DROP POLICY IF EXISTS "Taxonomies are readable" ON public.kurla_taxonomies;
CREATE POLICY "Taxonomies are readable" ON public.kurla_taxonomies FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Taxonomy terms are readable" ON public.kurla_taxonomy_terms;
CREATE POLICY "Taxonomy terms are readable" ON public.kurla_taxonomy_terms FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Publishable archetypes are readable" ON public.archetypes;
CREATE POLICY "Publishable archetypes are readable" ON public.archetypes
  FOR SELECT USING (is_publishable = TRUE AND member_count >= k_anonymity_threshold);

DROP POLICY IF EXISTS "Archetype membership owner access" ON public.user_archetypes;
CREATE POLICY "Archetype membership owner access" ON public.user_archetypes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Shelf owner access" ON public.user_products;
CREATE POLICY "Shelf owner access" ON public.user_products
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Les observations individuelles ne sont jamais lisibles par un autre utilisateur,
-- pas même via l'agrégat : seule la table de comptes est exposée.
DROP POLICY IF EXISTS "Outcome observations owner access" ON public.outcome_observations;
CREATE POLICY "Outcome observations owner access" ON public.outcome_observations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Published outcome aggregates are readable" ON public.ingredient_archetype_outcomes;
CREATE POLICY "Published outcome aggregates are readable" ON public.ingredient_archetype_outcomes
  FOR SELECT USING (is_publishable = TRUE AND observation_count >= k_anonymity_threshold);

DROP POLICY IF EXISTS "Protective style episodes owner access" ON public.protective_style_episodes;
CREATE POLICY "Protective style episodes owner access" ON public.protective_style_episodes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Endorsements visible to client and professional" ON public.professional_endorsements;
CREATE POLICY "Endorsements visible to client and professional" ON public.professional_endorsements
  FOR SELECT USING (
    client_user_id = auth.uid()
    OR professional_id = auth.uid()
    OR (is_displayable = TRUE AND client_consent_at IS NOT NULL)
  );

-- Les tables de connaissance sont administrables uniquement.
DROP POLICY IF EXISTS "Knowledge graph admin write" ON public.ingredients;
CREATE POLICY "Knowledge graph admin write" ON public.ingredients
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Ingredient evidence admin write" ON public.ingredient_evidence;
CREATE POLICY "Ingredient evidence admin write" ON public.ingredient_evidence
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Ingredient incompatibilities admin write" ON public.ingredient_incompatibilities;
CREATE POLICY "Ingredient incompatibilities admin write" ON public.ingredient_incompatibilities
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Ingredient restrictions admin write" ON public.ingredient_jurisdiction_restrictions;
CREATE POLICY "Ingredient restrictions admin write" ON public.ingredient_jurisdiction_restrictions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Product ingredients admin write" ON public.product_ingredients;
CREATE POLICY "Product ingredients admin write" ON public.product_ingredients
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Taxonomy admin write" ON public.kurla_taxonomy_terms;
CREATE POLICY "Taxonomy admin write" ON public.kurla_taxonomy_terms
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Archetype admin write" ON public.archetypes;
CREATE POLICY "Archetype admin write" ON public.archetypes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Outcome aggregate admin write" ON public.ingredient_archetype_outcomes;
CREATE POLICY "Outcome aggregate admin write" ON public.ingredient_archetype_outcomes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
