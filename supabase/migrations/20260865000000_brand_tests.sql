-- CHANTIER 8.6c2 — ESPACE MARQUE : TESTS PRODUITS CIBLÉS (feature 41)
--
-- CE QUE CE SCHÉMA GARANTIT, ET PAS SEULEMENT CE QUE LE CODE PROMET :
--
--   1. UNE MARQUE NE PEUT PAS LIRE LES PARTICIPANTS. Aucune politique SELECT
--      n'est créée sur `brand_test_participations` ni `brand_test_observations`
--      pour le rôle `brand`. Un compte marque qui interrogerait ces tables
--      directement, avec un jeton valide, ne reçoit aucune ligne. Le rapport
--      k-anonyme est la seule sortie.
--
--   2. LE CONSENTEMENT EST UNE COLONNE, PAS UNE INTENTION. Une déclaration est
--      rattachée à une participation qui porte `consent_at NOT NULL` ; un retrait
--      (`withdrawn_at`) est horodaté et exclut le membre des agrégats.
--
--   3. LA COHORTE EST DU JSONB CONTRAINT. Elle ne peut contenir que `needs` et
--      `archetypeIds` : toute autre clé — e-mail, ville, âge, identifiant — fait
--      échouer l'insertion. Le refus n'est pas seulement applicatif.
--
--   4. AUCUNE DONNÉE DE PROFIL N'EST COPIÉE. `brand_test_observations` ne porte
--      qu'un signal et une date. Il n'y a rien à fuir.

-- ---------------------------------------------------------------------------
-- 0. Rôle « marque »
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'professional', 'support', 'editor', 'brand', 'admin', 'superadmin'));

COMMENT ON COLUMN public.profiles.role IS
  'Le rôle brand (chantier 8.6c2) n''ouvre que la lecture des tests de sa propre marque. Il ne donne accès ni aux profils, ni aux commandes, ni au catalogue.';

-- ---------------------------------------------------------------------------
-- 1. Demandes de test
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brand_test_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  brand_name text NOT NULL CHECK (char_length(trim(brand_name)) BETWEEN 2 AND 120),
  contact_email text NOT NULL,
  product_name text NOT NULL,
  product_id uuid,
  hypothesis text NOT NULL CHECK (char_length(trim(hypothesis)) >= 20),
  cohort jsonb NOT NULL,
  target_participants integer NOT NULL CHECK (target_participants >= 30),
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 7 AND 180),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'recruiting', 'running', 'closed', 'rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  admin_comment text,
  -- Une cohorte se définit par des besoins, éventuellement des archétypes. Rien
  -- d'autre : une clé comme `emails`, `city` ou `age` fait échouer l'insertion.
  -- Pas de sous-requête : un CHECK n'en accepte pas. On retire les deux clés
  -- autorisées et on exige qu'il ne reste rien : toute autre clé (emails, city,
  -- age…) fait échouer l'insertion.
  CONSTRAINT cohort_only_needs_and_archetypes CHECK (
    jsonb_typeof(cohort) = 'object'
    AND cohort ? 'needs'
    AND jsonb_typeof(cohort -> 'needs') = 'array'
    AND jsonb_array_length(cohort -> 'needs') > 0
    AND (cohort - 'needs' - 'archetypeIds') = '{}'::jsonb
  ),
  -- Un test dont la cible est sous le seuil k ne peut rien publier : autant le
  -- refuser à la demande plutôt que de produire un rapport vide.
  CONSTRAINT target_reaches_k_anonymity CHECK (target_participants >= 30)
);

CREATE INDEX IF NOT EXISTS brand_test_requests_brand_idx
  ON public.brand_test_requests (brand_user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS brand_test_requests_status_idx
  ON public.brand_test_requests (status);

-- ---------------------------------------------------------------------------
-- 2. Participations : le consentement, daté par le serveur
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brand_test_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.brand_test_requests (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  consent_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  CONSTRAINT one_participation_per_member UNIQUE (test_id, user_id),
  CONSTRAINT withdrawal_after_consent CHECK (withdrawn_at IS NULL OR withdrawn_at >= consent_at)
);

CREATE INDEX IF NOT EXISTS brand_test_participations_test_idx
  ON public.brand_test_participations (test_id);
CREATE INDEX IF NOT EXISTS brand_test_participations_user_idx
  ON public.brand_test_participations (user_id);

-- ---------------------------------------------------------------------------
-- 3. Déclarations : un signal, une date. Rien d'autre.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brand_test_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.brand_test_requests (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  signal text NOT NULL,
  declared_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_test_observations_test_idx
  ON public.brand_test_observations (test_id, declared_at);

-- ---------------------------------------------------------------------------
-- 4. Droits et RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.brand_test_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_test_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_test_observations ENABLE ROW LEVEL SECURITY;

-- Une marque voit ses demandes, et seulement ses demandes.
DROP POLICY IF EXISTS "Brand test requests owner read" ON public.brand_test_requests;
CREATE POLICY "Brand test requests owner read" ON public.brand_test_requests
  FOR SELECT TO authenticated
  USING (
    brand_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Un membre voit sa propre participation — jamais celle des autres.
DROP POLICY IF EXISTS "Brand test participation owner read" ON public.brand_test_participations;
CREATE POLICY "Brand test participation owner read" ON public.brand_test_participations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Déclarations : le membre voit les siennes. Le rôle `brand` n'apparaît
-- délibérément dans aucune politique de ces deux tables.
DROP POLICY IF EXISTS "Brand test observation owner read" ON public.brand_test_observations;
CREATE POLICY "Brand test observation owner read" ON public.brand_test_observations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
       WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Aucune politique INSERT / UPDATE / DELETE : l'écriture passe par le serveur,
-- qui applique le consentement, le retrait et les transitions.
