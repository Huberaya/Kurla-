-- CHANTIER 8.3 — KURLA PROGRESSION
-- Loyalty par progression et récompense des comportements non-marchands.
--
-- PRINCIPE (critère de sortie du chantier E : « un utilisateur qui ne commande
-- pas progresse et est récompensé ») :
--   la progression est la somme de CINQ axes plafonnés. L'achat est un axe parmi
--   cinq, plafonné à 80 points sur 460 : acheter beaucoup ne peut pas, à soi
--   seul, faire passer un niveau. Inversement, scanner, donner un avis, tenir sa
--   routine et observer ses résultats mènent au dernier niveau sans aucune
--   commande.
--
-- Les récompenses sont débloquées par NIVEAU, jamais achetées avec des points :
-- aucune fonction essentielle ne devient payante, et aucune pression à l'achat
-- n'est créée.
--
-- Idempotence : chaque événement porte une `dedupe_key` unique. Un webhook
-- rejoué, un double clic, un retry réseau ne comptent qu'une fois.

-- ---------------------------------------------------------------------------
-- 1. Référentiels
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_levels (
  level integer PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  min_score integer NOT NULL CHECK (min_score >= 0),
  benefit text
);

CREATE TABLE IF NOT EXISTS public.loyalty_axes (
  axis text PRIMARY KEY,
  label text NOT NULL,
  max_points integer NOT NULL CHECK (max_points > 0),
  rationale text
);

CREATE TABLE IF NOT EXISTS public.loyalty_event_rules (
  kind text PRIMARY KEY,
  axis text NOT NULL REFERENCES public.loyalty_axes(axis) ON UPDATE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  daily_cap integer,
  once_only boolean NOT NULL DEFAULT false,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  level_required integer NOT NULL REFERENCES public.loyalty_levels(level),
  kind text NOT NULL DEFAULT 'service',
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.loyalty_badges (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  criterion jsonb NOT NULL
);

-- ---------------------------------------------------------------------------
-- 2. Données utilisateur
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  level integer NOT NULL DEFAULT 1 REFERENCES public.loyalty_levels(level),
  progression_score integer NOT NULL DEFAULT 0 CHECK (progression_score >= 0),
  axis_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_activity_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL REFERENCES public.loyalty_event_rules(kind) ON UPDATE CASCADE,
  axis text NOT NULL,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  source_ref text,
  dedupe_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_code text NOT NULL REFERENCES public.loyalty_rewards(code) ON UPDATE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'granted', 'cancelled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz,
  handled_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_events_user_time
  ON public.loyalty_events (user_id, occurred_at DESC);
-- Le jour est pris en UTC, comme le repli mémoire (`occurredAt.slice(0, 10)`) :
-- `date_trunc('day', timestamptz)` dépend du fuseau de session et n'est donc pas
-- IMMUTABLE — inutilisable dans une expression d'index.
CREATE INDEX IF NOT EXISTS idx_loyalty_events_user_kind_day
  ON public.loyalty_events (user_id, kind, ((occurred_at AT TIME ZONE 'UTC')::date));
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_last_activity
  ON public.loyalty_accounts (last_activity_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user
  ON public.loyalty_redemptions (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Référentiels semés
-- ---------------------------------------------------------------------------
-- Les nombres ci-dessous sont la seule source de vérité. `src/lib/loyaltyRules.ts`
-- les recopie pour le repli mémoire et le premier rendu ; le banc
-- `tests/loyalty_progression.test.ts` vérifie que les deux ne dérivent pas.

INSERT INTO public.loyalty_levels (level, code, label, min_score, benefit) VALUES
  (1, 'decouverte',  'Découverte',   0,   'Accès au diagnostic et au suivi de routine'),
  (2, 'routine',     'Routine',      60,  'Accès anticipé aux nouveautés du catalogue'),
  (3, 'regularite',  'Régularité',   140, 'Diagnostic approfondi offert avec un professionnel'),
  (4, 'maitrise',    'Maîtrise',     240, 'Atelier en ligne réservé aux membres'),
  (5, 'expertise',   'Expertise',    340, 'Séance de conseil individuelle avec un professionnel vérifié')
ON CONFLICT (level) DO UPDATE SET
  code = EXCLUDED.code, label = EXCLUDED.label,
  min_score = EXCLUDED.min_score, benefit = EXCLUDED.benefit;

INSERT INTO public.loyalty_axes (axis, label, max_points, rationale) VALUES
  ('connaissance',  'Connaissance de soi',   100, 'Profil, archétype et préférences : sans eux, rien n’est personnalisé'),
  ('pratique',      'Pratique',              120, 'Routine tenue, cycles, journal, résultats observés'),
  ('contribution',  'Contribution',          100, 'Avis, questions et retours qui servent aux autres membres'),
  ('exploration',   'Exploration',            60, 'Scans et découvertes d’ingrédients'),
  ('achat',         'Achat',                  80, 'Plafonné : acheter ne peut pas, seul, faire progresser d’un niveau')
ON CONFLICT (axis) DO UPDATE SET
  label = EXCLUDED.label, max_points = EXCLUDED.max_points, rationale = EXCLUDED.rationale;

INSERT INTO public.loyalty_event_rules (kind, axis, points, daily_cap, once_only, label) VALUES
  ('profile_completed',    'connaissance',  40, NULL, true,  'Profil beauté complété'),
  ('archetype_known',      'connaissance',  20, NULL, true,  'Archétype capillaire identifié'),
  ('routine_preferences',  'connaissance',  20, NULL, true,  'Préférences de routine enregistrées'),
  ('routine_task_done',    'pratique',       4,   12, false, 'Tâche de routine accomplie'),
  ('journal_entry',        'pratique',       6,   12, false, 'Entrée de journal de progression'),
  ('wash_day_completed',   'pratique',      15,   15, false, 'Cycle wash day terminé'),
  ('outcome_observed',     'pratique',      12,   24, false, 'Résultat observé et renseigné'),
  ('review_verified',      'contribution',  20,   20, false, 'Avis vérifié publié (achat réglé)'),
  ('review_unverified',    'contribution',   5,   10, false, 'Avis publié'),
  ('question_asked',       'contribution',   5,   10, false, 'Question posée sur un produit'),
  ('routine_feedback',     'contribution',  10,   20, false, 'Retour d’expérience sur une routine'),
  ('ai_feedback',          'contribution',   5,   10, false, 'Retour sur une réponse de l’assistant'),
  ('scan_performed',       'exploration',    5,   15, false, 'Scan d’un produit ou d’un ingrédient'),
  ('order_paid',           'achat',         20, NULL, false, 'Commande réglée')
ON CONFLICT (kind) DO UPDATE SET
  axis = EXCLUDED.axis, points = EXCLUDED.points, daily_cap = EXCLUDED.daily_cap,
  once_only = EXCLUDED.once_only, label = EXCLUDED.label;

INSERT INTO public.loyalty_rewards (code, label, description, level_required, kind) VALUES
  ('early_access',          'Accès anticipé',        'Voir et réserver les nouveautés avant leur ouverture publique.', 2, 'acces'),
  ('diagnostic_approfondi', 'Diagnostic approfondi', 'Analyse complète du profil et de la routine avec un professionnel partenaire.', 3, 'service'),
  ('atelier_membre',        'Atelier en ligne',      'Atelier réservé aux membres : routine, cuir chevelu, coiffures protectrices.', 4, 'atelier'),
  ('conseil_pro_offert',    'Conseil individuel',    'Séance de conseil individuelle avec un professionnel vérifié.', 5, 'service')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  level_required = EXCLUDED.level_required, kind = EXCLUDED.kind;

INSERT INTO public.loyalty_badges (code, label, description, criterion) VALUES
  ('premier_scan',        'Premier scan',        'Un produit ou un ingrédient scanné.',                       '{"kind":"scan_performed","count":1}'),
  ('explorateur',         'Explorateur',         'Douze scans : la curiosité paie.',                          '{"kind":"scan_performed","count":12}'),
  ('critique_verifiee',   'Critique vérifiée',   'Un avis publié après un achat réglé.',                      '{"kind":"review_verified","count":1}'),
  ('contributeur',        'Contributeur',        'Cinq retours qui servent aux autres membres.',              '{"axis":"contribution","count":5}'),
  ('trente_jours',        'Trente jours',        'Trente jours d’activité : la régularité est le vrai levier.', '{"distinct_days":30}'),
  ('sans_achat',          'Progression libre',   'Niveau 3 atteint sans aucune commande.',                    '{"level":3,"without_kind":"order_paid"}')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description, criterion = EXCLUDED.criterion;

-- ---------------------------------------------------------------------------
-- 4. RPC : application d'un événement (atomique, idempotente)
-- ---------------------------------------------------------------------------
-- Tout le calcul de progression vit ici, dans la transaction : plafonds par axe,
-- plafond journalier, événements uniques, niveau, badges. Le backend n'envoie
-- qu'un `kind` et une clé d'idempotence ; il ne calcule jamais de points.

CREATE OR REPLACE FUNCTION public.apply_loyalty_event(
  p_user_id uuid,
  p_kind text,
  p_source_ref text DEFAULT NULL,
  p_dedupe_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.loyalty_event_rules;
  v_dedupe text;
  v_points integer := 0;
  v_axis_sum integer;
  v_today_count integer;
  v_exists boolean;
  v_axis_scores jsonb;
  v_total integer;
  v_level integer;
  v_badges jsonb;
  v_distinct_days integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'utilisateur manquant' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_rule FROM public.loyalty_event_rules WHERE kind = p_kind;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'événement de progression inconnu : %', p_kind USING ERRCODE = '22023';
  END IF;

  v_dedupe := COALESCE(p_dedupe_key, p_kind || ':' || p_user_id || ':' || COALESCE(p_source_ref, ''));

  SELECT true INTO v_exists FROM public.loyalty_events WHERE dedupe_key = v_dedupe;
  IF v_exists THEN
    -- Rejeu : on ne recompte pas, on renvoie l'état courant.
    SELECT jsonb_build_object(
             'level', a.level, 'progressionScore', a.progression_score,
             'axisScores', a.axis_scores, 'badges', a.badges, 'duplicated', true)
      INTO v_axis_scores
      FROM public.loyalty_accounts a WHERE a.user_id = p_user_id;
    RETURN COALESCE(v_axis_scores, jsonb_build_object('duplicated', true));
  END IF;

  -- Événement unique déjà présent ?
  IF v_rule.once_only THEN
    SELECT true INTO v_exists FROM public.loyalty_events
      WHERE user_id = p_user_id AND kind = p_kind;
    IF v_exists THEN
      RETURN jsonb_build_object('duplicated', true, 'reason', 'once_only');
    END IF;
  END IF;

  v_points := v_rule.points;

  -- Plafond journalier
  IF v_rule.daily_cap IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_count FROM public.loyalty_events
      WHERE user_id = p_user_id AND kind = p_kind
        AND (occurred_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date;
    IF v_today_count * v_rule.points >= v_rule.daily_cap THEN
      v_points := 0;
    END IF;
  END IF;

  -- Plafond de l'axe : on ne dépasse jamais max_points
  SELECT COALESCE(SUM(points), 0) INTO v_axis_sum FROM public.loyalty_events
    WHERE user_id = p_user_id AND axis = v_rule.axis;
  IF v_axis_sum + v_points > (SELECT max_points FROM public.loyalty_axes WHERE axis = v_rule.axis) THEN
    v_points := GREATEST(0, (SELECT max_points FROM public.loyalty_axes WHERE axis = v_rule.axis) - v_axis_sum);
  END IF;

  INSERT INTO public.loyalty_events (user_id, kind, axis, points, source_ref, dedupe_key)
  VALUES (p_user_id, p_kind, v_rule.axis, v_points, p_source_ref, v_dedupe);

  -- Recomposition du compte
  SELECT COALESCE(jsonb_object_agg(axis, capped), '{}'::jsonb), COALESCE(SUM(capped), 0)
    INTO v_axis_scores, v_total
    FROM (
      SELECT e.axis, LEAST(SUM(e.points), a.max_points) AS capped
        FROM public.loyalty_events e
        JOIN public.loyalty_axes a ON a.axis = e.axis
       WHERE e.user_id = p_user_id
       GROUP BY e.axis, a.max_points
    ) capped_axes;

  SELECT COALESCE(MAX(level), 1) INTO v_level
    FROM public.loyalty_levels WHERE min_score <= v_total;

  SELECT COUNT(DISTINCT (occurred_at AT TIME ZONE 'UTC')::date) INTO v_distinct_days
    FROM public.loyalty_events WHERE user_id = p_user_id;

  -- Badges dérivés des faits, jamais déclarés à la main
  SELECT COALESCE(jsonb_agg(b.code ORDER BY b.code), '[]'::jsonb) INTO v_badges
    FROM public.loyalty_badges b
    WHERE
      (b.criterion ? 'kind' AND (
        SELECT COUNT(*) FROM public.loyalty_events e
          WHERE e.user_id = p_user_id AND e.kind = b.criterion ->> 'kind'
      ) >= (b.criterion ->> 'count')::int)
      OR (b.criterion ? 'axis' AND (
        SELECT COUNT(*) FROM public.loyalty_events e
          WHERE e.user_id = p_user_id AND e.axis = b.criterion ->> 'axis'
      ) >= (b.criterion ->> 'count')::int)
      OR (b.criterion ? 'distinct_days' AND v_distinct_days >= (b.criterion ->> 'distinct_days')::int)
      OR (b.criterion ? 'level' AND v_level >= (b.criterion ->> 'level')::int
          AND (b.criterion ->> 'without_kind') IS NULL)
      OR (b.criterion ? 'without_kind' AND v_level >= (b.criterion ->> 'level')::int
          AND NOT EXISTS (
            SELECT 1 FROM public.loyalty_events e
              WHERE e.user_id = p_user_id AND e.kind = b.criterion ->> 'without_kind'));

  INSERT INTO public.loyalty_accounts
    (user_id, level, progression_score, axis_scores, badges, first_activity_at, last_activity_at, updated_at)
  VALUES
    (p_user_id, v_level, v_total, v_axis_scores, v_badges, now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    level = EXCLUDED.level,
    progression_score = EXCLUDED.progression_score,
    axis_scores = EXCLUDED.axis_scores,
    badges = EXCLUDED.badges,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = now();

  RETURN jsonb_build_object(
    'level', v_level,
    'progressionScore', v_total,
    'axisScores', v_axis_scores,
    'badges', v_badges,
    'awardedPoints', v_points,
    'duplicated', false
  );
END;
$$;

-- Rattrapage : un compte peut exister sans événement (profil créé, rien fait).
CREATE OR REPLACE FUNCTION public.ensure_loyalty_account(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC : rétention mesurée (critère de sortie du chantier E)
-- ---------------------------------------------------------------------------
-- Cohortes hebdomadaires depuis la première activité, avec activité observée à
-- 30, 60 et 90 jours. Les cohortes trop récentes renvoient NULL : on ne publie
-- jamais un taux calculé sur une fenêtre pas encore écoulée.

CREATE OR REPLACE FUNCTION public.get_loyalty_retention()
RETURNS TABLE (
  cohort_week date,
  cohort_size bigint,
  active_d30 bigint,
  active_d60 bigint,
  active_d90 bigint,
  rate_d30 numeric,
  rate_d60 numeric,
  rate_d90 numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH accounts AS (
    SELECT a.user_id, date_trunc('week', a.first_activity_at AT TIME ZONE 'UTC')::date AS cohort_week
      FROM public.loyalty_accounts a
  ),
  activity AS (
    SELECT DISTINCT e.user_id, (e.occurred_at AT TIME ZONE 'UTC')::date AS day
      FROM public.loyalty_events e
  ),
  joined AS (
    SELECT c.cohort_week, c.user_id,
           bool_or(act.day > c.cohort_week + 29 AND act.day <= c.cohort_week + 35) AS a30,
           bool_or(act.day > c.cohort_week + 59 AND act.day <= c.cohort_week + 65) AS a60,
           bool_or(act.day > c.cohort_week + 89 AND act.day <= c.cohort_week + 95) AS a90
      FROM accounts c
      LEFT JOIN activity act ON act.user_id = c.user_id
     GROUP BY c.cohort_week, c.user_id
  )
  SELECT cohort_week,
         COUNT(*) AS cohort_size,
         COUNT(*) FILTER (WHERE a30) AS active_d30,
         COUNT(*) FILTER (WHERE a60) AS active_d60,
         COUNT(*) FILTER (WHERE a90) AS active_d90,
         CASE WHEN current_date >= cohort_week + 35
              THEN ROUND(100.0 * COUNT(*) FILTER (WHERE a30) / NULLIF(COUNT(*), 0), 1) END AS rate_d30,
         CASE WHEN current_date >= cohort_week + 65
              THEN ROUND(100.0 * COUNT(*) FILTER (WHERE a60) / NULLIF(COUNT(*), 0), 1) END AS rate_d60,
         CASE WHEN current_date >= cohort_week + 95
              THEN ROUND(100.0 * COUNT(*) FILTER (WHERE a90) / NULLIF(COUNT(*), 0), 1) END AS rate_d90
    FROM joined
   GROUP BY cohort_week
   ORDER BY cohort_week;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.loyalty_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_axes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_event_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Référentiels lisibles par tous (authentifier n'est pas exigé pour comprendre
-- comment fonctionne la progression), modifiables par l'administration seule.
DROP POLICY IF EXISTS "Loyalty reference readable" ON public.loyalty_levels;
CREATE POLICY "Loyalty reference readable" ON public.loyalty_levels FOR SELECT USING (true);
DROP POLICY IF EXISTS "Loyalty axes readable" ON public.loyalty_axes;
CREATE POLICY "Loyalty axes readable" ON public.loyalty_axes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Loyalty rules readable" ON public.loyalty_event_rules;
CREATE POLICY "Loyalty rules readable" ON public.loyalty_event_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Loyalty rewards readable" ON public.loyalty_rewards;
CREATE POLICY "Loyalty rewards readable" ON public.loyalty_rewards FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "Loyalty badges readable" ON public.loyalty_badges;
CREATE POLICY "Loyalty badges readable" ON public.loyalty_badges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage loyalty levels" ON public.loyalty_levels;
CREATE POLICY "Admins manage loyalty levels" ON public.loyalty_levels FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage loyalty axes" ON public.loyalty_axes;
CREATE POLICY "Admins manage loyalty axes" ON public.loyalty_axes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage loyalty rules" ON public.loyalty_event_rules;
CREATE POLICY "Admins manage loyalty rules" ON public.loyalty_event_rules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage loyalty rewards" ON public.loyalty_rewards;
CREATE POLICY "Admins manage loyalty rewards" ON public.loyalty_rewards FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage loyalty badges" ON public.loyalty_badges;
CREATE POLICY "Admins manage loyalty badges" ON public.loyalty_badges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Chacun ne lit que son propre compte et ses propres événements.
DROP POLICY IF EXISTS "Loyalty account owner read" ON public.loyalty_accounts;
CREATE POLICY "Loyalty account owner read" ON public.loyalty_accounts
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Loyalty events owner read" ON public.loyalty_events;
CREATE POLICY "Loyalty events owner read" ON public.loyalty_events
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Aucune écriture directe : les points passent exclusivement par la RPC.
-- (Absence volontaire de politique INSERT/UPDATE/DELETE sur loyalty_accounts et
-- loyalty_events — c'est ce qui rend le barème infalsifiable côté client.)

DROP POLICY IF EXISTS "Loyalty redemption owner" ON public.loyalty_redemptions;
CREATE POLICY "Loyalty redemption owner" ON public.loyalty_redemptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Loyalty redemption request" ON public.loyalty_redemptions;
CREATE POLICY "Loyalty redemption request" ON public.loyalty_redemptions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'requested');
DROP POLICY IF EXISTS "Admins handle loyalty redemptions" ON public.loyalty_redemptions;
CREATE POLICY "Admins handle loyalty redemptions" ON public.loyalty_redemptions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Traçabilité
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.loyalty_events IS
  'Journal des faits de progression. Immuable : aucune politique d''écriture directe, uniquement la RPC apply_loyalty_event. La dedupe_key UNIQUE rend tout rejeu inoffensif.';
COMMENT ON FUNCTION public.apply_loyalty_event(uuid, text, text, text) IS
  'Applique un fait de progression : plafonds journalier et par axe, événements uniques, niveau et badges recalculés dans la même transaction. Renvoie l''état du compte.';
COMMENT ON FUNCTION public.get_loyalty_retention() IS
  'Rétention par cohorte hebdomadaire (D30/D60/D90). Une cohorte dont la fenêtre n''est pas écoulée renvoie NULL plutôt qu''un taux inventé.';
COMMENT ON TABLE public.loyalty_axes IS
  'Plafonds par axe. L''axe achat est plafonné à 80 sur 460 : c''est ce plafond, et non une règle affichée, qui garantit qu''un utilisateur qui n''achète pas peut atteindre le dernier niveau.';
