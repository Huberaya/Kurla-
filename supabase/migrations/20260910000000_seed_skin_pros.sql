-- ============================================================
-- KURLA SKIN — 6 pros peau vérifiés (skincare_expert)
-- Catégorie : peau riche en mélanine — HPI, SPF sans trace,
-- barrière, sensible sans parfum. Branché en base pour
-- /pros-verifies?cat=peau · Trust Score publiable 70-90/100
-- ============================================================

-- 1. Vérificateur = superadmin existant hubertbay@gmail.com
--    (00c987c2-b224-4b33-a43f-bd80ece98cb0). Pas d'insertion
--    d'un profil fictif : profiles.id FK → auth.users.id.

-- 2. 6 profils pros peau — IDs stables pour idempotence
-- Usage ON CONFLICT (id) pour rejouer la migration sans doublon.

INSERT INTO public.professional_profiles (
  id, user_id, display_name, city, profession, specialty,
  identity_verified, identity_verified_at, identity_verified_by,
  qualification_on_file, qualification_label, qualification_verified_at,
  charter_accepted, charter_accepted_at,
  verified_experience_years, is_public, created_at, updated_at
) VALUES
-- Pro 1 — Paris
(
  'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  NULL,
  'Dr. Aïssatou Diop',
  'Paris',
  'Dermatologue',
  'HPI & phototypes IV–VI — taches post-inflammatoires',
  TRUE, NOW(), '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  TRUE, 'Doctorat médecine — dermatologie (Paris Cité) · DIU dermatologie esthétique', NOW(),
  TRUE, NOW(),
  12, TRUE, NOW(), NOW()
),
-- Pro 2 — Lyon
(
  'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  NULL,
  'Nadia Benali',
  'Lyon',
  'Esthéticienne',
  'Barrière & SPF invisible sans trace blanche',
  TRUE, NOW(), '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  TRUE, 'BP esthétique — cosmétologie (Lyon) · cert. peaux pigmentées', NOW(),
  TRUE, NOW(),
  9, TRUE, NOW(), NOW()
),
-- Pro 3 — Nantes (Fatou tier)
(
  'a3333333-cccc-cccc-cccc-ccccccccccc3',
  NULL,
  'Aminata Keita',
  'Nantes',
  'Experte peau',
  'Routines & céramides — peaux mixtes à foncées',
  TRUE, NOW(), '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  TRUE, 'Cert. dermo-conseil — Nantes Université · form. HPI', NOW(),
  TRUE, NOW(),
  8, TRUE, NOW(), NOW()
),
-- Pro 4 — Marseille
(
  'a4444444-dddd-dddd-dddd-ddddddddddd4',
  NULL,
  'Dr. Fatou Sow',
  'Marseille',
  'Dermatologue',
  'Hyperpigmentation & peaux matures foncées',
  TRUE, NOW(), '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  TRUE, 'DES dermatologie — Marseille · DU lasers & peaux foncées', NOW(),
  TRUE, NOW(),
  15, TRUE, NOW(), NOW()
),
-- Pro 5 — Bordeaux
(
  'a5555555-eeee-eeee-eeee-eeeeeeeeeee5',
  NULL,
  'Inès Morel',
  'Bordeaux',
  'Esthéticienne',
  'Peau sensible — sans parfum, atopique',
  TRUE, NOW(), '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  TRUE, 'BTS esthétique — Bordeaux · cert. peau sensible & allergologie', NOW(),
  TRUE, NOW(),
  6, TRUE, NOW(), NOW()
),
-- Pro 6 — Bruxelles
(
  'a6666666-ffff-ffff-ffff-fffffffffff6',
  NULL,
  'Claire N’Diaye',
  'Bruxelles',
  'Experte peau',
  'Corps & texture — hydratation intense phototypes V–VI',
  TRUE, NOW(), '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  TRUE, 'Bachelor esthétique — Bruxelles · form. corps & barrière', NOW(),
  TRUE, NOW(),
  10, TRUE, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  city = EXCLUDED.city,
  profession = EXCLUDED.profession,
  specialty = EXCLUDED.specialty,
  identity_verified = TRUE,
  identity_verified_at = NOW(),
  identity_verified_by = '00c987c2-b224-4b33-a43f-bd80ece98cb0',
  qualification_on_file = TRUE,
  qualification_label = EXCLUDED.qualification_label,
  qualification_verified_at = NOW(),
  charter_accepted = TRUE,
  charter_accepted_at = NOW(),
  verified_experience_years = EXCLUDED.verified_experience_years,
  is_public = TRUE,
  updated_at = NOW();

-- 3. Services par pro peau (2 par pro, prix transparents, téléconsult OK)
-- On nettoie d’abord les services peau seedés pour idempotence
DELETE FROM public.professional_services WHERE professional_id IN (
  'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'a3333333-cccc-cccc-cccc-ccccccccccc3',
  'a4444444-dddd-dddd-dddd-ddddddddddd4',
  'a5555555-eeee-eeee-eeee-eeeeeeeeeee5',
  'a6666666-ffff-ffff-ffff-fffffffffff6'
);

INSERT INTO public.professional_services (id, professional_id, name, description, duration_minutes, price_cents, currency, is_remote, is_active) VALUES
-- Dr. Aïssatou — Paris
(uuid_generate_v4(), 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Consultation HPI 45 min', 'Bilan taches post-inflammatoires, routine niacinamide/SPF sans trace blanche, garde-fou rétinol/AHA.', 45, 6500, 'EUR', TRUE, TRUE),
(uuid_generate_v4(), 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Suivi barrière 30 min', 'Contrôle barrière (céramides/squalane), ajustement texture/hydratation.', 30, 4500, 'EUR', TRUE, TRUE),
-- Nadia — Lyon
(uuid_generate_v4(), 'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Atelier SPF invisible 30 min', 'Choisir SPF hybride/organique sans white cast, test lumière du jour, dosage 2 doigts.', 30, 3500, 'EUR', TRUE, TRUE),
(uuid_generate_v4(), 'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'Soin barrière 60 min', 'Soin céramides en institut, massage + masque réparateur.', 60, 7500, 'EUR', FALSE, TRUE),
-- Aminata — Nantes
(uuid_generate_v4(), 'a3333333-cccc-cccc-cccc-ccccccccccc3', 'Construction routine 45 min', 'Routine matin/spf + soir/réparer selon budget 32/68/124€, alternatives sans parfum.', 45, 5000, 'EUR', TRUE, TRUE),
(uuid_generate_v4(), 'a3333333-cccc-cccc-cccc-ccccccccccc3', 'Bilan mixte & HPI 30 min', 'Peau mixte qui brille et tiraille + HPI — équilibrage gel/crème.', 30, 3800, 'EUR', TRUE, TRUE),
-- Dr. Fatou Sow — Marseille
(uuid_generate_v4(), 'a4444444-dddd-dddd-dddd-ddddddddddd4', 'Consultation mélasma/HPI 45 min', 'Diagnostic différentiel HPI vs mélasma, plan SPF quotidien, suivi photo.', 45, 7000, 'EUR', TRUE, TRUE),
(uuid_generate_v4(), 'a4444444-dddd-dddd-dddd-ddddddddddd4', 'Peaux matures foncées 30 min', 'Anti-âge sans éclaircir : peptides, rétinol dosé, barrière.', 30, 5500, 'EUR', TRUE, TRUE),
-- Inès — Bordeaux
(uuid_generate_v4(), 'a5555555-eeee-eeee-eeee-eeeeeeeeeee5', 'Peau sensible sans parfum 30 min', 'Repérage parfums/allergènes, alternatives squalane/céramides, patch-test.', 30, 3500, 'EUR', TRUE, TRUE),
(uuid_generate_v4(), 'a5555555-eeee-eeee-eeee-eeeeeeeeeee5', 'Atelier enfant peau 45 min', 'Peau atopique enfant : lavage doux, hydratation, gestes barrière.', 45, 5000, 'EUR', FALSE, TRUE),
-- Claire — Bruxelles
(uuid_generate_v4(), 'a6666666-ffff-ffff-ffff-fffffffffff6', 'Corps & texture 45 min', 'Hydratation corps phototypes V–VI, zones sèches, texture sans effet gris.', 45, 5500, 'EUR', TRUE, TRUE),
(uuid_generate_v4(), 'a6666666-ffff-ffff-ffff-fffffffffff6', 'Routine corps 30 min', 'Gel vs baume vs huile — choisir selon saison et budget.', 30, 3500, 'EUR', TRUE, TRUE);

-- 4. Note : avis vérifiés (professional_reviews) ne sont pas seedés ici :
--    ils requièrent client_user_id FK vers profiles. Le Trust Score sera 70/100
--    (30 identité + 25 qualif + 15 charte) tant que <5 avis. Dès 5 avis
--    service_delivered=TRUE, le score passe à 90/100 automatiquement.
--    Aucune composante n’est achetable.
