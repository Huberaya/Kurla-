-- CHANTIER 8.6c1 — PROGRAMME EXPERTS / CRÉATEURS (features 39 et 40)
--
-- DEUX RÈGLES STRUCTURANTES, ÉCRITES DANS LE SCHÉMA ET PAS SEULEMENT DANS LE CODE :
--
--   1. LA VISIBILITÉ NE S'ACHÈTE PAS. `creator_attributions` n'a aucune colonne
--      de montant, de budget, de placement ou de priorité. Il n'existe aucune
--      table où l'on pourrait enregistrer un achat de visibilité, et donc aucun
--      chemin pour le faire.
--
--   2. UN CLIC NE VAUT RIEN. `creator_attribution_values` fige la valeur
--      monétaire de chaque événement : clic, ajout à l'étagère et achat valent
--      0, seul un résultat déclaré par le membre vaut 1. Les deux contraintes
--      CHECK rendent toute autre répartition impossible à écrire — y compris par
--      une requête d'administration.
--
-- Le statut d'une candidature ne change que par `review_creator_application`,
-- qui refuse en SQL les transitions illégales : `published` n'est atteignable
-- que depuis `verified`. Aucune politique INSERT/UPDATE/DELETE n'est créée sur
-- les deux tables ; les RPC sont réservées à `service_role`.
--
-- Les entrées de visibilité ne sont pas stockées : elles sont comptées à la
-- lecture sur des faits existants (contenus publiés, co-signatures de
-- professionnels, résultats déclarés). Il n'y a donc aucun compteur à gonfler.

-- ---------------------------------------------------------------------------
-- 1. Candidatures
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 80),
  kind text NOT NULL DEFAULT 'creator' CHECK (kind IN ('expert', 'creator')),
  specialty text NOT NULL DEFAULT '',
  biography text NOT NULL DEFAULT '',
  portfolio_url text,
  -- Lien vers un profil professionnel déjà vérifié du même compte. C'est par ce
  -- lien que les appuis et les contradictions du créateur sont comptés ; sans
  -- lien, ils restent à zéro plutôt que d'être devinés.
  professional_profile_id uuid,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'verified', 'published', 'rejected', 'suspended')),
  applied_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  published_at timestamptz,
  admin_comment text,
  -- Un profil publié sans date de vérification serait une incohérence.
  CONSTRAINT published_requires_verification
    CHECK (status <> 'published' OR verified_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS creator_applications_user_idx
  ON public.creator_applications (user_id);
CREATE INDEX IF NOT EXISTS creator_applications_status_idx
  ON public.creator_applications (status, applied_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Attributions : ce qui s'est passé, et ce que cela vaut
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.creator_attributions (
  id uuid PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.creator_applications (id) ON DELETE CASCADE,
  product_id uuid,
  event text NOT NULL CHECK (event IN ('click', 'add_to_shelf', 'purchase', 'outcome_declared')),
  outcome_signal text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creator_attributions_creator_time_idx
  ON public.creator_attributions (creator_id, occurred_at);
CREATE INDEX IF NOT EXISTS creator_attributions_event_idx
  ON public.creator_attributions (event);

-- Valeur monétaire de chaque événement. Les deux CHECK ci-dessous rendent
-- impossible toute répartition où un clic, un ajout à l'étagère ou un achat
-- vaudrait autre chose que zéro.
CREATE TABLE IF NOT EXISTS public.creator_attribution_values (
  event text PRIMARY KEY CHECK (event IN ('click', 'add_to_shelf', 'purchase', 'outcome_declared')),
  payout_weight integer NOT NULL CHECK (payout_weight >= 0),
  CONSTRAINT only_outcomes_are_paid CHECK (event = 'outcome_declared' OR payout_weight = 0),
  CONSTRAINT outcomes_pay_exactly_one CHECK (event <> 'outcome_declared' OR payout_weight = 1)
);

INSERT INTO public.creator_attribution_values (event, payout_weight) VALUES
  ('click', 0),
  ('add_to_shelf', 0),
  ('purchase', 0),
  ('outcome_declared', 1)
ON CONFLICT (event) DO NOTHING;

-- Paramètres de versement, inspectables. Le taux est le même quel que soit le
-- signe du résultat déclaré : payer moins un résultat négatif inciterait à ne
-- rapporter que du positif. Une part élevée de négatifs déclenche une revue,
-- elle ne réduit pas le taux.
CREATE TABLE IF NOT EXISTS public.creator_payout_rules (
  code text PRIMARY KEY CHECK (code IN ('rate_cents_per_outcome', 'min_outcomes_for_payout', 'negative_share_review_threshold')),
  value_cents integer,
  value_ratio numeric(4, 3),
  CONSTRAINT rate_is_positive CHECK (code <> 'rate_cents_per_outcome' OR value_cents > 0),
  CONSTRAINT threshold_is_a_share CHECK (code <> 'negative_share_review_threshold' OR (value_ratio > 0 AND value_ratio <= 1))
);

INSERT INTO public.creator_payout_rules (code, value_cents, value_ratio) VALUES
  ('rate_cents_per_outcome', 150, NULL),
  ('min_outcomes_for_payout', 3, NULL),
  ('negative_share_review_threshold', NULL, 0.6)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Revue : les transitions sont une règle de base, pas une règle d'écran
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.review_creator_application(
  p_id uuid,
  p_status text,
  p_admin_comment text DEFAULT NULL
)
RETURNS public.creator_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row public.creator_applications;
  now_ts timestamptz := now();
BEGIN
  SELECT * INTO current_row
    FROM public.creator_applications
   WHERE id = p_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidature créateur introuvable.' USING ERRCODE = 'P0002';
  END IF;

  IF p_status NOT IN ('applied', 'verified', 'published', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Statut de créateur inconnu : %', p_status USING ERRCODE = '22023';
  END IF;

  -- `rejected` n'a aucune transition sortante : un refus est définitif.
  IF NOT (
       (current_row.status = 'applied'   AND p_status IN ('verified', 'rejected'))
    OR (current_row.status = 'verified'  AND p_status IN ('published', 'rejected', 'suspended'))
    OR (current_row.status = 'published' AND p_status = 'suspended')
    OR (current_row.status = 'suspended' AND p_status = 'verified')
  ) THEN
    RAISE EXCEPTION 'Transition refusée : % → %', current_row.status, p_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.creator_applications
     SET status = p_status,
         verified_at = CASE WHEN p_status = 'verified' THEN COALESCE(verified_at, now_ts) ELSE verified_at END,
         published_at = CASE WHEN p_status = 'published' THEN now_ts ELSE published_at END,
         admin_comment = COALESCE(NULLIF(trim(p_admin_comment), ''), admin_comment)
   WHERE id = p_id
  RETURNING * INTO current_row;

  RETURN current_row;
END;
$$;

COMMENT ON FUNCTION public.review_creator_application(uuid, text, text) IS
  'Fait passer une candidature créateur d''un statut à un autre. Refuse toute transition hors CREATOR_TRANSITIONS : published n''est atteignable que depuis verified.';

-- ---------------------------------------------------------------------------
-- 4. Droits et RLS
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.review_creator_application(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_creator_application(uuid, text, text) TO service_role;

ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_attribution_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payout_rules ENABLE ROW LEVEL SECURITY;

-- Le membre voit sa propre candidature, et rien d'autre. L'annuaire public est
-- servi par le serveur (service_role), jamais par une lecture directe : aucun
-- client ne peut énumérer les candidatures en attente.
DROP POLICY IF EXISTS "Creator application owner read" ON public.creator_applications;
CREATE POLICY "Creator application owner read" ON public.creator_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Creator attributions owner read" ON public.creator_attributions;
CREATE POLICY "Creator attributions owner read" ON public.creator_attributions
  FOR SELECT TO authenticated
  USING (creator_id IN (SELECT id FROM public.creator_applications WHERE user_id = auth.uid()));

-- Tables de règles : lecture seule, y compris pour le client, afin que la
-- valeur d'un événement soit vérifiable publiquement.
DROP POLICY IF EXISTS "Attribution values readable" ON public.creator_attribution_values;
CREATE POLICY "Attribution values readable" ON public.creator_attribution_values
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Payout rules readable" ON public.creator_payout_rules;
CREATE POLICY "Payout rules readable" ON public.creator_payout_rules
  FOR SELECT TO anon, authenticated
  USING (true);

-- Aucune politique INSERT / UPDATE / DELETE : l'écriture passe par le serveur.
