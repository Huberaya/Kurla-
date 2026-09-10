-- ============================================================
-- CATÉGORIE MÉTIER DES PROFESSIONNELS VÉRIFIÉS
-- ============================================================
--
-- Constat, mesuré avant d'écrire cette migration :
--
-- L'annuaire public filtre les pros peau sur `category = 'skincare_expert'`
-- (ProfessionalDirectoryPage, SkinLandingPage) et l'annonce dans ses textes
-- visibles (SkinGuidePage : « Catégorie skincare_expert »). Or la table
-- `professional_profiles` n'a JAMAIS eu de colonne `category` — ni la
-- candidature (`professional_applications`) ne la recueille.
--
-- Conséquence réelle : la condition ne devenait jamais vraie. Seuls
-- remontaient les profils dont la profession ou la spécialité contenait
-- « peau » — 4 des 6 pros peau seedés, par coïncidence textuelle. Deux
-- professionnels (Dr. Aïssatou Diop, dermatologue ; Nadia Benali,
-- esthéticienne) étaient invisibles dans le filtre peau alors qu'ils ont été
-- seedés précisément pour y figurer.
--
-- Choix : la colonne est ajoutée en TEXT libre, sans contrainte CHECK. Les
-- catégories connues sont braider, loctician, coiffeur_afro,
-- coiffeur_enfants, barber, wig_installer, skincare_expert. Un métier hors
-- liste ne doit pas empêcher l'enregistrement d'un professionnel vérifié :
-- ce serait bloquer la vérification pour une raison de vocabulaire.
--
-- Le code applicatif reste tolérant : si cette migration n'est pas appliquée,
-- `category` vaut NULL et le filtre peau retombe sur la profession et la
-- spécialité déclarées. Aucune régression, simplement une précision perdue.
-- ============================================================

ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.professional_profiles.category IS
  'Catégorie métier KURLA (braider, loctician, coiffeur_afro, coiffeur_enfants, barber, wig_installer, skincare_expert). NULL = non renseigné : le filtre public retombe alors sur profession/spécialité.';

-- Rattrapage : les 6 pros peau seedés par 20260910000000_seed_skin_pros.sql
-- portent des identifiants stables. Rejouable sans effet de bord.
UPDATE public.professional_profiles
   SET category = 'skincare_expert'
 WHERE id IN (
   'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'a2222222-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
   'a3333333-cccc-cccc-cccc-ccccccccccc3',
   'a4444444-dddd-dddd-dddd-ddddddddddd4',
   'a5555555-eeee-eeee-eeee-eeeeeeeeeee5',
   'a6666666-ffff-ffff-ffff-fffffffffff6'
 )
   AND category IS DISTINCT FROM 'skincare_expert';
