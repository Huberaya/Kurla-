-- ============================================================
-- KURLA BEAUTY - ADAPTIVE ROUTINES & PERSISTENT PROGRESS JOURNAL
-- The user id is always the Supabase Auth identity. No browser-local
-- journal or client-supplied owner is used for these records.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.routine_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  weather_context JSONB,
  adaptation_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_through TEXT NOT NULL DEFAULT 'KURLA routine planner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_plans_id_user_key UNIQUE (id, user_id)
);

CREATE TABLE IF NOT EXISTS public.routine_tasks (
  id TEXT PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.routine_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('morning', 'evening', 'wash_day', 'weekly', 'mask', 'protective', 'locks', 'weather', 'check_in')),
  scheduled_for DATE NOT NULL,
  time_of_day TEXT CHECK (time_of_day IN ('morning', 'evening', 'anytime')),
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0 AND duration_minutes <= 240),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  product_labels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT routine_tasks_plan_owner_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES public.routine_plans(id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- PostgreSQL requires the referenced columns to be unique for the composite
-- ownership constraint above. This index is also useful for account queries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_plans_id_user ON public.routine_plans(id, user_id);

CREATE TABLE IF NOT EXISTS public.routine_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_plan_id UUID REFERENCES public.routine_plans(id) ON DELETE SET NULL,
  signal TEXT NOT NULL CHECK (signal IN (
    'more_flexible', 'more_breakage', 'product_heavy', 'reaction',
    'spots_improving', 'spots_not_improving', 'skin_tight', 'scalp_itchy',
    'routine_too_long'
  )),
  note TEXT,
  product_label TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.progress_journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  routine_plan_id UUID REFERENCES public.routine_plans(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  products_used TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routine_plans_user_status_updated
  ON public.routine_plans(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_routine_tasks_user_date
  ON public.routine_tasks(user_id, scheduled_for, created_at);
CREATE INDEX IF NOT EXISTS idx_routine_feedback_user_created
  ON public.routine_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_journal_user_date
  ON public.progress_journal_entries(user_id, entry_date DESC, created_at DESC);

ALTER TABLE public.routine_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_journal_entries ENABLE ROW LEVEL SECURITY;

-- The application server uses the verified Supabase identity and the service
-- role for its writes. Direct client access is restricted to the owner only;
-- no role helper is required for these tables.
DROP POLICY IF EXISTS "Users access own routine plans" ON public.routine_plans;
CREATE POLICY "Users access own routine plans"
  ON public.routine_plans FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users access own routine tasks" ON public.routine_tasks;
CREATE POLICY "Users access own routine tasks"
  ON public.routine_tasks FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users access own routine feedback" ON public.routine_feedback;
CREATE POLICY "Users access own routine feedback"
  ON public.routine_feedback FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users access own progress journal" ON public.progress_journal_entries;
CREATE POLICY "Users access own progress journal"
  ON public.progress_journal_entries FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
