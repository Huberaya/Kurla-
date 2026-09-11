-- C6/C7 — journal peau persistant, observance et INCI du Shelf.
-- Les données restent personnelles et ne servent à un agrégat partagé qu'avec
-- le consentement explicite déjà porté par outcome_observations.

ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS ingredient_ids TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS inci_names TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS inci_source TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS inci_unresolved_count SMALLINT NOT NULL DEFAULT 0;

-- Une observation peut porter sur un article libre du Shelf même si aucun
-- produit du catalogue n’est encore rattaché ; elle reste alors privée et ne
-- contribue à aucun agrégat ingrédient.
ALTER TABLE public.outcome_observations DROP CONSTRAINT IF EXISTS outcome_observations_scope_check;
ALTER TABLE public.outcome_observations
  ADD CONSTRAINT outcome_observations_scope_check
  CHECK (product_id IS NOT NULL OR ingredient_id IS NOT NULL OR shelf_item_id IS NOT NULL);

ALTER TABLE public.user_products DROP CONSTRAINT IF EXISTS user_products_inci_source_check;
ALTER TABLE public.user_products
  ADD CONSTRAINT user_products_inci_source_check
  CHECK (inci_source IN ('none', 'open_beauty_facts', 'catalog', 'manual'));
ALTER TABLE public.user_products DROP CONSTRAINT IF EXISTS user_products_inci_unresolved_count_check;
ALTER TABLE public.user_products
  ADD CONSTRAINT user_products_inci_unresolved_count_check
  CHECK (inci_unresolved_count >= 0);

CREATE INDEX IF NOT EXISTS idx_user_products_ingredient_ids
  ON public.user_products USING GIN (ingredient_ids);

CREATE TABLE IF NOT EXISTS public.skin_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  feeling_score SMALLINT NOT NULL CHECK (feeling_score BETWEEN 1 AND 5),
  concerns TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  milestone TEXT CHECK (milestone IS NULL OR milestone IN ('J+0', 'J+7', 'J+30', 'hebdo')),
  photo_id UUID REFERENCES public.beauty_profile_photos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skin_journal_entries_user_date
  ON public.skin_journal_entries(user_id, entry_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.skin_observance_days (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  morning_done BOOLEAN NOT NULL DEFAULT FALSE,
  evening_done BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_skin_observance_days_user_day
  ON public.skin_observance_days(user_id, day DESC);

ALTER TABLE public.skin_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skin_observance_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own skin journal" ON public.skin_journal_entries;
CREATE POLICY "Users access own skin journal" ON public.skin_journal_entries
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Users access own skin observance" ON public.skin_observance_days;
CREATE POLICY "Users access own skin observance" ON public.skin_observance_days
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

COMMENT ON COLUMN public.user_products.ingredient_ids IS 'Ingrédients rattachés au graphe KURLA ; une liste INCI externe non résolue ne devient jamais une preuve de compatibilité.';
COMMENT ON COLUMN public.user_products.inci_names IS 'Libellés INCI déclarés par une source, conservés pour traçabilité privée et non comme preuve réglementaire.';
COMMENT ON COLUMN public.user_products.inci_source IS 'Source de la composition : none, Open Beauty Facts, catalogue KURLA ou saisie manuelle.';
COMMENT ON COLUMN public.user_products.inci_unresolved_count IS 'Nombre de libellés INCI non rattachés au graphe ; supérieur à zéro signifie analyse incomplète.';
COMMENT ON TABLE public.skin_journal_entries IS 'Journal peau privé : ressenti et préoccupations déclarés par le membre, sans diagnostic médical.';
COMMENT ON TABLE public.skin_observance_days IS 'Observance peau déclarée par le membre, matin et soir, par jour civil.';
