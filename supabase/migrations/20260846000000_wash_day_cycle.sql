-- ============================================================
-- WASH DAY OS — cycle de lavage et coiffure protectrice active
--
-- Le modèle AM/PM quotidien est structurellement faux pour le cheveu texturé,
-- qui fonctionne par cycles. Cette table persiste le cycle réel de
-- l'utilisateur, distinct du plan de routine adaptatif existant.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wash_day_cycles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  interval_days SMALLINT NOT NULL DEFAULT 7 CHECK (interval_days BETWEEN 1 AND 42),
  last_wash_day_at TIMESTAMPTZ,
  deep_condition_every_n_wash_days SMALLINT NOT NULL DEFAULT 1 CHECK (deep_condition_every_n_wash_days BETWEEN 1 AND 12),
  -- NULL signifie « soin protéiné désactivé », et non « fréquence inconnue ».
  -- Un soin protéiné non désiré ne doit pas être planifié par défaut : un
  -- excès de protéines rigidifie la fibre.
  protein_every_n_wash_days SMALLINT CHECK (protein_every_n_wash_days IS NULL OR protein_every_n_wash_days BETWEEN 1 AND 12),
  night_protection TEXT NOT NULL DEFAULT 'none',
  available_minutes_per_day SMALLINT NOT NULL DEFAULT 15 CHECK (available_minutes_per_day BETWEEN 0 AND 240),
  hard_water BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wash_day_cycles_night_protection_check
    CHECK (night_protection IN ('none', 'bonnet', 'satin_pillowcase', 'scarf'))
);

ALTER TABLE public.wash_day_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wash day cycle owner access" ON public.wash_day_cycles;
CREATE POLICY "Wash day cycle owner access" ON public.wash_day_cycles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.wash_day_cycles IS 'Cycle de lavage réel. Distinct de routine_plans : le wash day est un cycle événementiel, pas une liste de tâches quotidiennes.';
