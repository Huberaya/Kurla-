-- CHANTIER 8.5 — ABONNEMENT KURLA+
--
-- PRINCIPE : KURLA+ n'enlève rien. Ce qui est payant, c'est la profondeur
-- d'analyse de données que le membre a déjà déclarées — jamais l'accès à une
-- fonction, jamais ses données, jamais une récompense de progression.
--
-- Trois propriétés sont garanties par ce schéma, pas par une promesse d'écran :
--
--   1. AUCUN ABONNEMENT PAYANT SANS RÉFÉRENCE DE PAIEMENT. `activate_membership`
--      refuse une référence vide (ERRCODE 22023). Un essai, lui, porte
--      `payment_ref = NULL` et ne donne que 14 jours.
--
--   2. UN SEUL ESSAI PAR COMPTE, À VIE. Contrôlé sur `membership_events`
--      (kind = 'trial_started'), qui est en insertion seule : ni le client, ni
--      un second appel serveur ne peut rejouer un essai.
--
--   3. AUCUNE ÉCRITURE DIRECTE. Aucune politique INSERT/UPDATE/DELETE sur
--      `memberships` ni `membership_events`. Le statut ne change que par les
--      quatre RPC ci-dessous, exécutables par `service_role` uniquement :
--      `REVOKE ... FROM PUBLIC` empêche un client d'activer son propre
--      abonnement en appelant la RPC depuis le navigateur.
--
-- L'échéance ne dépend d'aucun cron : `expire_memberships` reflète dans la base
-- ce que la lecture dérive déjà de l'heure (`resolveMembershipState`).

-- ---------------------------------------------------------------------------
-- 1. Référentiel des plans
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.membership_plans (
  code text PRIMARY KEY CHECK (code IN ('libre', 'kurla_plus')),
  label text NOT NULL,
  monthly_price_cents integer NOT NULL CHECK (monthly_price_cents >= 0),
  annual_price_cents integer NOT NULL CHECK (annual_price_cents >= 0),
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  is_paid boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT annual_not_more_than_twelve_months
    CHECK (annual_price_cents <= monthly_price_cents * 12)
);

COMMENT ON TABLE public.membership_plans IS
  'Plans d''abonnement. Les prix sont hors taxe, en centimes : la TVA du pays de destination s''ajoute au paiement. La contrainte annual_not_more_than_twelve_months interdit un annuel plus cher que douze mensualités.';

INSERT INTO public.membership_plans (code, label, monthly_price_cents, annual_price_cents, trial_days, is_paid, is_active)
VALUES
  ('libre', 'KURLA Libre', 0, 0, 0, false, true),
  ('kurla_plus', 'KURLA+', 700, 7000, 14, true, true)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  trial_days = EXCLUDED.trial_days,
  is_paid = EXCLUDED.is_paid,
  is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
-- 2. Adhésions et journal
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_code text NOT NULL REFERENCES public.membership_plans(code) ON UPDATE CASCADE,
  -- 'expired' est un statut stocké : expire_memberships() l'écrit pour que la
  -- base dise la même chose que la lecture.
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  stripe_subscription_id text,
  -- NULL pour un essai. Obligatoire pour tout abonnement payant : c'est la
  -- trace qui distingue un accès payé d'un accès accordé.
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memberships_user_idx ON public.memberships (user_id);
CREATE INDEX IF NOT EXISTS memberships_status_period_idx
  ON public.memberships (status, current_period_end);

CREATE TABLE IF NOT EXISTS public.membership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_events_user_time_idx
  ON public.membership_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS membership_events_kind_idx
  ON public.membership_events (user_id, kind);

COMMENT ON TABLE public.memberships IS
  'Une ligne par membre. Le statut effectif se dérive de l''heure (essai ou période échu = plus de droits payants), sans dépendre d''un traitement planifié.';
COMMENT ON TABLE public.membership_events IS
  'Journal en insertion seule des changements d''adhésion. Sert de preuve, notamment pour l''unicité de l''essai : un essai consommé ne peut pas être rejoué.';

-- ---------------------------------------------------------------------------
-- 3. RPC — essai
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.start_membership_trial(
  p_user_id uuid,
  p_plan_code text DEFAULT 'kurla_plus'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.membership_plans;
  v_current public.memberships;
  v_trial_taken boolean;
  v_now timestamptz := now();
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'utilisateur manquant' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_plan FROM public.membership_plans WHERE code = p_plan_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan inconnu : %', p_plan_code USING ERRCODE = '22023';
  END IF;
  IF NOT v_plan.is_paid OR v_plan.trial_days <= 0 THEN
    RAISE EXCEPTION 'le plan % ne propose pas d''essai', p_plan_code USING ERRCODE = '22023';
  END IF;

  -- Un seul essai par compte, à vie. La preuve est le journal, pas la ligne
  -- courante : une ligne réinitialisée ne rend pas l'essai disponible.
  SELECT EXISTS (
    SELECT 1 FROM public.membership_events
    WHERE user_id = p_user_id AND kind = 'trial_started'
  ) INTO v_trial_taken;
  IF v_trial_taken THEN
    RAISE EXCEPTION 'essai déjà utilisé sur ce compte' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_current FROM public.memberships WHERE user_id = p_user_id;
  IF v_current.id IS NOT NULL AND v_current.status IN ('trialing', 'active')
     AND (v_current.current_period_end IS NULL OR v_current.current_period_end > v_now) THEN
    RAISE EXCEPTION 'un abonnement est déjà en cours' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.memberships (
    user_id, plan_code, status, started_at, current_period_end, trial_ends_at,
    cancel_at_period_end, canceled_at, stripe_subscription_id, payment_ref, updated_at
  ) VALUES (
    p_user_id, v_plan.code, 'trialing', v_now,
    v_now + make_interval(days => v_plan.trial_days),
    v_now + make_interval(days => v_plan.trial_days),
    false, NULL, NULL, NULL, v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = 'trialing',
    started_at = v_now,
    current_period_end = EXCLUDED.current_period_end,
    trial_ends_at = EXCLUDED.trial_ends_at,
    cancel_at_period_end = false,
    canceled_at = NULL,
    payment_ref = NULL,
    updated_at = v_now
  RETURNING * INTO v_current;

  INSERT INTO public.membership_events (user_id, kind, payload)
  VALUES (p_user_id, 'trial_started', jsonb_build_object(
    'plan', v_plan.code,
    'trialDays', v_plan.trial_days,
    'trialEndsAt', v_current.trial_ends_at
  ));

  RETURN jsonb_build_object(
    'status', v_current.status,
    'planCode', v_current.plan_code,
    'trialEndsAt', v_current.trial_ends_at,
    'currentPeriodEnd', v_current.current_period_end,
    'paymentRef', v_current.payment_ref
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC — activation payante
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_membership(
  p_user_id uuid,
  p_plan_code text,
  p_payment_ref text,
  p_period_end timestamptz,
  p_stripe_subscription_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.membership_plans;
  v_row public.memberships;
  v_now timestamptz := now();
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'utilisateur manquant' USING ERRCODE = '22023';
  END IF;
  -- La propriété centrale : pas d'abonnement payant sans trace de paiement.
  IF p_payment_ref IS NULL OR length(trim(p_payment_ref)) = 0 THEN
    RAISE EXCEPTION 'aucun abonnement payant sans référence de paiement' USING ERRCODE = '22023';
  END IF;
  IF p_period_end IS NULL OR p_period_end <= v_now THEN
    RAISE EXCEPTION 'fin de période invalide : elle doit être dans le futur' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_plan FROM public.membership_plans WHERE code = p_plan_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan inconnu : %', p_plan_code USING ERRCODE = '22023';
  END IF;
  IF NOT v_plan.is_paid THEN
    RAISE EXCEPTION 'le plan % n''est pas un plan payant', p_plan_code USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.memberships (
    user_id, plan_code, status, started_at, current_period_end, trial_ends_at,
    cancel_at_period_end, canceled_at, stripe_subscription_id, payment_ref, updated_at
  ) VALUES (
    p_user_id, v_plan.code, 'active', v_now, p_period_end, NULL,
    false, NULL, p_stripe_subscription_id, trim(p_payment_ref), v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    status = 'active',
    current_period_end = p_period_end,
    cancel_at_period_end = false,
    canceled_at = NULL,
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, public.memberships.stripe_subscription_id),
    payment_ref = trim(p_payment_ref),
    updated_at = v_now
  RETURNING * INTO v_row;

  INSERT INTO public.membership_events (user_id, kind, payload)
  VALUES (p_user_id, 'activated', jsonb_build_object(
    'plan', v_plan.code,
    'periodEnd', p_period_end,
    'stripeSubscriptionId', p_stripe_subscription_id
  ));

  RETURN jsonb_build_object(
    'status', v_row.status,
    'planCode', v_row.plan_code,
    'currentPeriodEnd', v_row.current_period_end,
    'paymentRef', v_row.payment_ref
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC — résiliation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_membership(
  p_user_id uuid,
  p_at_period_end boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.memberships;
  v_now timestamptz := now();
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'utilisateur manquant' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.memberships WHERE user_id = p_user_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'aucun abonnement à résilier' USING ERRCODE = '22023';
  END IF;
  IF v_row.status NOT IN ('trialing', 'active') THEN
    RAISE EXCEPTION 'abonnement déjà clos (statut %)', v_row.status USING ERRCODE = '22023';
  END IF;

  IF p_at_period_end THEN
    -- L'accès reste dû jusqu'à la fin de la période payée.
    UPDATE public.memberships
      SET cancel_at_period_end = true, updated_at = v_now
      WHERE user_id = p_user_id
      RETURNING * INTO v_row;
  ELSE
    UPDATE public.memberships
      SET status = 'canceled', canceled_at = v_now, cancel_at_period_end = false, updated_at = v_now
      WHERE user_id = p_user_id
      RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.membership_events (user_id, kind, payload)
  VALUES (p_user_id, 'canceled', jsonb_build_object(
    'atPeriodEnd', p_at_period_end,
    'status', v_row.status,
    'accessUntil', v_row.current_period_end
  ));

  RETURN jsonb_build_object(
    'status', v_row.status,
    'cancelAtPeriodEnd', v_row.cancel_at_period_end,
    'accessUntil', v_row.current_period_end
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC — échéance (idempotente)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_memberships() RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_trials integer;
  v_actives integer;
BEGIN
  UPDATE public.memberships
    SET status = 'expired', updated_at = v_now
    WHERE status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at <= v_now;
  GET DIAGNOSTICS v_trials = ROW_COUNT;

  UPDATE public.memberships
    SET status = 'expired', updated_at = v_now
    WHERE status = 'active' AND current_period_end IS NOT NULL AND current_period_end <= v_now;
  GET DIAGNOSTICS v_actives = ROW_COUNT;

  RETURN jsonb_build_object(
    'expiredTrials', v_trials,
    'expiredSubscriptions', v_actives,
    'checkedAt', v_now
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6 bis. RPC — renouvellement
-- ---------------------------------------------------------------------------
-- Une souscription qui ne se renouvelle pas n'est pas un abonnement. La
-- reconduction est retrouvée par `stripe_subscription_id`, pas par les
-- métadonnées de la facture : Stripe ne les recopie pas de façon fiable.

CREATE OR REPLACE FUNCTION public.renew_membership(
  p_stripe_subscription_id text,
  p_period_end timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.memberships;
  v_now timestamptz := now();
BEGIN
  IF p_stripe_subscription_id IS NULL OR length(trim(p_stripe_subscription_id)) = 0 THEN
    RAISE EXCEPTION 'souscription manquante' USING ERRCODE = '22023';
  END IF;
  IF p_period_end IS NULL OR p_period_end <= v_now THEN
    RAISE EXCEPTION 'fin de période invalide : elle doit être dans le futur' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.memberships
    WHERE stripe_subscription_id = trim(p_stripe_subscription_id)
    FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'aucun abonnement pour la souscription %', p_stripe_subscription_id USING ERRCODE = '22023';
  END IF;

  UPDATE public.memberships
    SET status = 'active',
        current_period_end = p_period_end,
        cancel_at_period_end = false,
        canceled_at = NULL,
        updated_at = v_now
    WHERE id = v_row.id
    RETURNING * INTO v_row;

  INSERT INTO public.membership_events (user_id, kind, payload)
  VALUES (v_row.user_id, 'renewed', jsonb_build_object(
    'plan', v_row.plan_code,
    'periodEnd', p_period_end,
    'stripeSubscriptionId', trim(p_stripe_subscription_id)
  ));

  RETURN jsonb_build_object(
    'status', v_row.status,
    'planCode', v_row.plan_code,
    'currentPeriodEnd', v_row.current_period_end
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Droits d'exécution : serveur uniquement
-- ---------------------------------------------------------------------------
-- Sans ce REVOKE, n'importe quel client pourrait appeler `activate_membership`
-- depuis le navigateur avec une référence de paiement inventée.

REVOKE EXECUTE ON FUNCTION public.start_membership_trial(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_membership(uuid, text, text, timestamptz, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_membership(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_memberships() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.renew_membership(text, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_membership_trial(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_membership(uuid, text, text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_membership(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_memberships() TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_membership(text, timestamptz) TO service_role;

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_events ENABLE ROW LEVEL SECURITY;

-- Les prix sont publics : on doit pouvoir comparer avant d'avoir un compte.
DROP POLICY IF EXISTS "Membership plans readable" ON public.membership_plans;
CREATE POLICY "Membership plans readable" ON public.membership_plans
  FOR SELECT USING (is_active);

DROP POLICY IF EXISTS "Admins manage membership plans" ON public.membership_plans;
CREATE POLICY "Admins manage membership plans" ON public.membership_plans
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Membership owner read" ON public.memberships;
CREATE POLICY "Membership owner read" ON public.memberships
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Membership events owner read" ON public.membership_events;
CREATE POLICY "Membership events owner read" ON public.membership_events
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- (Absence volontaire de politique INSERT/UPDATE/DELETE sur memberships et
-- membership_events : le statut d'un abonnement ne s'écrit que par RPC, et ces
-- RPC ne sont exécutables que par service_role.)

COMMENT ON FUNCTION public.start_membership_trial(uuid, text) IS
  'Ouvre un essai de 14 jours sans moyen de paiement. Un seul essai par compte, à vie : la preuve est le journal, pas la ligne courante.';
COMMENT ON FUNCTION public.activate_membership(uuid, text, text, timestamptz, text) IS
  'Active un abonnement payant. Refuse une référence de paiement vide : aucun accès payant ne peut être accordé sans trace de paiement.';
COMMENT ON FUNCTION public.cancel_membership(uuid, boolean) IS
  'Résilie. À échéance par défaut : l''accès payé reste dû jusqu''à la fin de la période.';
COMMENT ON FUNCTION public.expire_memberships() IS
  'Bascule en expired les essais et abonnements échus. Idempotente, et non nécessaire aux droits : la lecture les dérive déjà de l''heure.';
COMMENT ON FUNCTION public.renew_membership(text, timestamptz) IS
  'Reconduit un abonnement après encaissement d''une nouvelle période. Retrouvé par stripe_subscription_id : les métadonnées de facture ne sont pas une source fiable.';
