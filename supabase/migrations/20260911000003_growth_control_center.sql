-- KURLA Growth Control Center — plan de conquête exécutable.
-- Les colonnes `planned_*` et `hypothesis` sont des plans de test, jamais des
-- résultats réels. Les colonnes `actual_*` ne sont remplies que par l'admin.

CREATE TABLE IF NOT EXISTS public.growth_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  owner TEXT NOT NULL CHECK (owner IN ('CEO', 'Growth', 'Content', 'Partnerships', 'Revenue', 'Ops', 'Product')),
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2')),
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  deadline DATE NOT NULL,
  week INTEGER NOT NULL DEFAULT 0,
  market TEXT NOT NULL DEFAULT '',
  kpi TEXT NOT NULL DEFAULT '',
  expected TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('week_plan', 'campaign', 'manual')),
  campaign_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.growth_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  segment TEXT NOT NULL,
  channel TEXT NOT NULL,
  offer TEXT NOT NULL,
  tracking_campaign TEXT NOT NULL DEFAULT '',
  budget_eur NUMERIC NOT NULL DEFAULT 0 CHECK (budget_eur >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  planned_clients INTEGER NOT NULL DEFAULT 0 CHECK (planned_clients >= 0),
  planned_revenue_eur NUMERIC NOT NULL DEFAULT 0 CHECK (planned_revenue_eur >= 0),
  target_cac_eur NUMERIC CHECK (target_cac_eur IS NULL OR target_cac_eur >= 0),
  kpi TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'paused', 'done')),
  actual_clients INTEGER CHECK (actual_clients IS NULL OR actual_clients >= 0),
  actual_revenue_eur NUMERIC CHECK (actual_revenue_eur IS NULL OR actual_revenue_eur >= 0),
  actual_spend_eur NUMERIC CHECK (actual_spend_eur IS NULL OR actual_spend_eur >= 0),
  hypothesis BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.growth_markets (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL CHECK (region IN ('France', 'Europe', 'Afrique', 'Monde')),
  wave INTEGER NOT NULL,
  country TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('research', 'test', 'validation', 'scale', 'leadership', 'expansion', 'blocked')),
  entry_segment TEXT NOT NULL,
  entry_offer TEXT NOT NULL,
  price TEXT NOT NULL,
  language TEXT NOT NULL,
  acquisition TEXT NOT NULL,
  influence TEXT NOT NULL,
  partners TEXT NOT NULL,
  logistics TEXT NOT NULL,
  regulation TEXT NOT NULL,
  budget_eur NUMERIC NOT NULL DEFAULT 0 CHECK (budget_eur >= 0),
  planned_clients INTEGER NOT NULL DEFAULT 0 CHECK (planned_clients >= 0),
  validation_window TEXT NOT NULL,
  success_gate TEXT NOT NULL,
  fail_gate TEXT NOT NULL,
  trigger TEXT NOT NULL,
  actual_clients INTEGER CHECK (actual_clients IS NULL OR actual_clients >= 0),
  actual_revenue_eur NUMERIC CHECK (actual_revenue_eur IS NULL OR actual_revenue_eur >= 0),
  actual_spend_eur NUMERIC CHECK (actual_spend_eur IS NULL OR actual_spend_eur >= 0),
  opened_at DATE,
  hypothesis BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_deadline ON public.growth_tasks(deadline, priority);
CREATE INDEX IF NOT EXISTS idx_growth_campaigns_status ON public.growth_campaigns(status, start_date);
CREATE INDEX IF NOT EXISTS idx_growth_markets_wave_status ON public.growth_markets(wave, status);

ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read growth tasks" ON public.growth_tasks;
CREATE POLICY "Admins read growth tasks" ON public.growth_tasks FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins read growth campaigns" ON public.growth_campaigns;
CREATE POLICY "Admins read growth campaigns" ON public.growth_campaigns FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admins read growth markets" ON public.growth_markets;
CREATE POLICY "Admins read growth markets" ON public.growth_markets FOR SELECT USING (public.is_admin());

COMMENT ON TABLE public.growth_tasks IS 'Actions exécutables du Growth Control Center ; les KPI restent à mesurer.';
COMMENT ON TABLE public.growth_campaigns IS 'Campagnes planifiées vs réelles ; planned_* sont des hypothèses explicites.';
COMMENT ON TABLE public.growth_markets IS 'Carte de conquête séquencée ; un statut ne passe pas à scale sans gate mesuré.';
