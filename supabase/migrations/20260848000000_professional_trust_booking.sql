-- ============================================================
-- CHANTIER B — Confiance professionnelle, réservation, dossiers partagés
--
-- Trois constats ont dicté ce schéma :
--
-- 1. `professional_applications` existe mais ne contient ni identité vérifiée,
--    ni diplôme, ni date de contrôle. On ne peut pas construire un Trust Score
--    sur des champs qui n'existent pas. Une table `professional_profiles` est
--    ajoutée PLUTÔT QUE de modifier `professional_applications` : une candidature
--    est un historique, un profil vérifié est un état courant. Les mélanger
--    ferait perdre la trace de ce qui a été refusé et pourquoi.
--
-- 2. `payments.order_id` est NOT NULL et référence `orders`. Un paiement de
--    prestation n'a pas de commande produit : réutiliser la table exigerait de
--    rendre la colonne nullable, ce qui affaiblirait l'intégrité de tous les
--    paiements produits existants. D'où `service_payments`, séparée.
--
-- 3. Un dossier client partagé est une donnée de santé de fait (texture, cuir
--    chevelu, traitements). Le partage exige un consentement explicite, daté,
--    révocable, et limité à un professionnel nommé. Jamais un consentement
--    global « partager avec les pros ».
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILS PROFESSIONNELS VÉRIFIÉS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.professional_applications(id) ON DELETE SET NULL,

  display_name TEXT NOT NULL,
  city TEXT NOT NULL,
  profession TEXT NOT NULL,
  specialty TEXT,

  -- Identité : la condition d'entrée, pas une composante comme les autres.
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  identity_verified_at TIMESTAMPTZ,
  identity_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  identity_document_ref TEXT,

  -- Qualification : distinguée de l'identité, car un autodidacte compétent
  -- peut être vérifié sans diplôme. Le score le dit, il ne le punit pas.
  qualification_on_file BOOLEAN NOT NULL DEFAULT FALSE,
  qualification_label TEXT,
  qualification_verified_at TIMESTAMPTZ,

  charter_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  charter_accepted_at TIMESTAMPTZ,

  verified_experience_years INTEGER CHECK (verified_experience_years IS NULL OR verified_experience_years >= 0),

  -- Un profil non vérifié ne doit pas pouvoir être rendu public. Contrainte
  -- dans le schéma, pas seulement dans le code applicatif.
  is_public BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT professional_profiles_public_requires_verified
    CHECK (is_public = FALSE OR identity_verified = TRUE),
  CONSTRAINT professional_profiles_verification_is_dated
    CHECK (identity_verified = FALSE OR identity_verified_at IS NOT NULL),
  CONSTRAINT professional_profiles_verification_has_author
    CHECK (identity_verified = FALSE OR identity_verified_by IS NOT NULL),
  CONSTRAINT professional_profiles_qualification_is_dated
    CHECK (qualification_on_file = FALSE OR qualification_verified_at IS NOT NULL),
  CONSTRAINT professional_profiles_not_self_verifier
    CHECK (identity_verified_by IS NULL OR identity_verified_by <> user_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_public ON public.professional_profiles(is_public, city);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user ON public.professional_profiles(user_id);

COMMENT ON TABLE public.professional_profiles IS
  'Professionnels vérifiés. Séparé de professional_applications : une candidature est un historique, un profil est un état courant.';
COMMENT ON COLUMN public.professional_profiles.identity_verified IS
  'Contrôle manuel par un administrateur. Jamais automatique : une vérification automatique d identité n en est pas une.';
COMMENT ON COLUMN public.professional_profiles.qualification_on_file IS
  'Diplôme au dossier. Un autodidacte compétent peut être identity_verified sans qualification : le Trust Score le déclare, il ne le pénalise pas comme une faute.';

-- ------------------------------------------------------------
-- 2. AVIS VÉRIFIÉS — la seule source de la moyenne
-- ------------------------------------------------------------
-- Un avis n'est compté que s'il est rattaché à une prestation réellement
-- effectuée. Sans cette contrainte, la moyenne est achetable.

CREATE TABLE IF NOT EXISTS public.professional_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  appointment_id UUID,
  client_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  -- Vrai uniquement si la prestation a eu lieu. Un avis sans prestation
  -- effectuée ne compte pas dans le Trust Score.
  service_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT professional_reviews_one_per_appointment UNIQUE (appointment_id),
  CONSTRAINT professional_reviews_not_self
    CHECK (professional_id <> client_user_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_reviews_pro ON public.professional_reviews(professional_id, service_delivered);

COMMENT ON TABLE public.professional_reviews IS
  'Avis de prestations. Seuls ceux avec service_delivered = TRUE comptent dans le Trust Score.';

-- ------------------------------------------------------------
-- 3. PRESTATIONS PROPOSÉES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_remote BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_services_pro ON public.professional_services(professional_id, is_active);

-- ------------------------------------------------------------
-- 4. RÉSERVATIONS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE RESTRICT,
  service_id UUID REFERENCES public.professional_services(id) ON DELETE SET NULL,
  client_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  is_remote BOOLEAN NOT NULL DEFAULT FALSE,

  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'confirmed', 'completed', 'cancelled_by_client', 'cancelled_by_pro', 'no_show')
  ),

  client_notes TEXT,
  -- Le consentement au partage de dossier est lié à LA réservation, pas global.
  dossier_share_consent_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT appointments_not_self_booking CHECK (professional_id <> client_user_id),
  CONSTRAINT appointments_cancellation_is_explained
    CHECK (
      status NOT IN ('cancelled_by_client', 'cancelled_by_pro')
      OR (cancelled_reason IS NOT NULL AND cancelled_at IS NOT NULL)
    ),
  -- Une prestation passée ne peut pas revenir à l'état demandé.
  CONSTRAINT appointments_completed_is_final CHECK (
    status <> 'completed' OR scheduled_at <= NOW()
  )
);

CREATE INDEX IF NOT EXISTS idx_appointments_pro_time ON public.appointments(professional_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_user_id, scheduled_at);

COMMENT ON TABLE public.appointments IS
  'Réservations de prestation. Le consentement au partage de dossier est porté ici, par réservation, jamais globalement.';

-- ------------------------------------------------------------
-- 5. PAIEMENTS DE PRESTATION
-- ------------------------------------------------------------
-- Séparé de `payments` : cette table a order_id NOT NULL REFERENCES orders.
-- Rendre la colonne nullable pour y loger des prestations affaiblirait
-- l'intégrité de tous les paiements produits existants.

CREATE TABLE IF NOT EXISTS public.service_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'authorized', 'paid', 'refunded', 'failed')
  ),
  stripe_payment_intent_id TEXT,
  -- Idempotence : un webhook Stripe rejoué ne doit pas créer un second paiement.
  idempotency_key TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_payments_appointment ON public.service_payments(appointment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_payments_stripe_intent
  ON public.service_payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.service_payments IS
  'Paiements de prestation. Séparé de payments (order_id NOT NULL) pour ne pas affaiblir l intégrité des paiements produits.';

-- ------------------------------------------------------------
-- 6. PARTAGE DE DOSSIER CLIENT
-- ------------------------------------------------------------
-- Consentement explicite, daté, limité à un professionnel nommé, révocable.
-- Un dossier contient texture, cuir chevelu, traitements : ce sont des données
-- de santé de fait.

CREATE TABLE IF NOT EXISTS public.client_dossier_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,

  -- Ce qui est partagé est énuméré. Pas de « tout le dossier ».
  scope_beauty_profile BOOLEAN NOT NULL DEFAULT FALSE,
  scope_shelf BOOLEAN NOT NULL DEFAULT FALSE,
  scope_outcomes BOOLEAN NOT NULL DEFAULT FALSE,
  scope_protective_styles BOOLEAN NOT NULL DEFAULT FALSE,

  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  CONSTRAINT dossier_shares_scope_required CHECK (
    scope_beauty_profile OR scope_shelf OR scope_outcomes OR scope_protective_styles
  ),
  CONSTRAINT dossier_shares_not_self CHECK (client_user_id <> professional_id),
  CONSTRAINT dossier_shares_expiry_after_consent
    CHECK (expires_at IS NULL OR expires_at > consent_at)
);

CREATE INDEX IF NOT EXISTS idx_dossier_shares_client ON public.client_dossier_shares(client_user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_dossier_shares_pro ON public.client_dossier_shares(professional_id, revoked_at);

COMMENT ON TABLE public.client_dossier_shares IS
  'Partage de dossier à un professionnel nommé. Consentement explicite, daté, borné dans le temps, révocable. Le périmètre est énuméré : jamais « tout le dossier ».';

-- ------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_dossier_shares ENABLE ROW LEVEL SECURITY;

-- Profils : seuls les profils publics et vérifiés sont lisibles par tous.
DROP POLICY IF EXISTS "Verified public professional profiles are readable" ON public.professional_profiles;
CREATE POLICY "Verified public professional profiles are readable" ON public.professional_profiles
  FOR SELECT USING (
    (is_public = TRUE AND identity_verified = TRUE)
    OR user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Professionals manage their own profile" ON public.professional_profiles;
CREATE POLICY "Professionals manage their own profile" ON public.professional_profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- La vérification d'identité est un acte d'administration, jamais un acte du pro.
DROP POLICY IF EXISTS "Only admins verify professional identity" ON public.professional_profiles;
CREATE POLICY "Only admins verify professional identity" ON public.professional_profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins insert professional profiles" ON public.professional_profiles;
CREATE POLICY "Admins insert professional profiles" ON public.professional_profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- Avis : publics une fois la prestation effectuée, sinon visibles par le client seul.
DROP POLICY IF EXISTS "Delivered professional reviews are readable" ON public.professional_reviews;
CREATE POLICY "Delivered professional reviews are readable" ON public.professional_reviews
  FOR SELECT USING (
    service_delivered = TRUE
    OR client_user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients write their own professional review" ON public.professional_reviews;
CREATE POLICY "Clients write their own professional review" ON public.professional_reviews
  FOR INSERT WITH CHECK (client_user_id = auth.uid());

-- Prestations : visibles si le pro est public.
DROP POLICY IF EXISTS "Active services of public professionals are readable" ON public.professional_services;
CREATE POLICY "Active services of public professionals are readable" ON public.professional_services
  FOR SELECT USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles pp
      WHERE pp.id = professional_id AND pp.is_public = TRUE AND pp.identity_verified = TRUE
    )
    OR professional_id IN (SELECT id FROM public.professional_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Professionals manage their own services" ON public.professional_services;
CREATE POLICY "Professionals manage their own services" ON public.professional_services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid())
    OR public.is_admin()
  );

-- Réservations : visibles par le client, par le pro concerné, et par un admin.
DROP POLICY IF EXISTS "Appointment parties can read" ON public.appointments;
CREATE POLICY "Appointment parties can read" ON public.appointments
  FOR SELECT USING (
    client_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Clients request their own appointment" ON public.appointments;
CREATE POLICY "Clients request their own appointment" ON public.appointments
  FOR INSERT WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS "Appointment parties can update" ON public.appointments;
CREATE POLICY "Appointment parties can update" ON public.appointments
  FOR UPDATE USING (
    client_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid())
    OR public.is_admin()
  );

-- Paiements de prestation : jamais lisibles par un tiers.
DROP POLICY IF EXISTS "Service payment visible to client and admin" ON public.service_payments;
CREATE POLICY "Service payment visible to client and admin" ON public.service_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.client_user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage service payments" ON public.service_payments;
CREATE POLICY "Admins manage service payments" ON public.service_payments
  FOR ALL USING (public.is_admin());

-- Dossiers partagés : le client voit les siens ; le pro voit ce qui lui est
-- partagé ET non révoqué ET non expiré.
DROP POLICY IF EXISTS "Clients read their own dossier shares" ON public.client_dossier_shares;
CREATE POLICY "Clients read their own dossier shares" ON public.client_dossier_shares
  FOR SELECT USING (client_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Clients grant their own dossier share" ON public.client_dossier_shares;
CREATE POLICY "Clients grant their own dossier share" ON public.client_dossier_shares
  FOR INSERT WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS "Clients revoke their own dossier share" ON public.client_dossier_shares;
CREATE POLICY "Clients revoke their own dossier share" ON public.client_dossier_shares
  FOR UPDATE USING (client_user_id = auth.uid() OR public.is_admin());

-- Vue pour le professionnel : ce qui lui est accessible à l'instant présent.
--
-- `security_invoker = true` (PostgreSQL 15+) est indispensable ici : sans lui,
-- la vue s'exécuterait avec les droits de son propriétaire et contournerait la
-- RLS de `client_dossier_shares`. Une vue ne peut PAS porter de politique RLS
-- — PostgreSQL refuse avec 42809 « is not a table ». La sécurité doit donc
-- rester sur la table, la vue ne faisant que filtrer les partages éteints.
DROP VIEW IF EXISTS public.professional_dossier_access;
CREATE VIEW public.professional_dossier_access
WITH (security_invoker = true) AS
SELECT
  s.id AS share_id,
  s.client_user_id,
  s.professional_id,
  s.appointment_id,
  s.scope_beauty_profile,
  s.scope_shelf,
  s.scope_outcomes,
  s.scope_protective_styles,
  s.consent_at,
  s.expires_at
FROM public.client_dossier_shares s
WHERE s.revoked_at IS NULL
  AND (s.expires_at IS NULL OR s.expires_at > NOW());

COMMENT ON VIEW public.professional_dossier_access IS
  'Ce qu un professionnel peut voir à l instant présent. Un partage révoqué ou expiré disparaît de la vue, sans suppression de la trace du consentement.';

-- La politique qui restreint le professionnel à SES partages porte sur la table,
-- pas sur la vue. Combinée à `security_invoker`, c'est elle qui s'applique.
DROP POLICY IF EXISTS "Professionals see only currently shared dossiers" ON public.client_dossier_shares;
CREATE POLICY "Professionals see only currently shared dossiers" ON public.client_dossier_shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid())
    OR public.is_admin()
  );
