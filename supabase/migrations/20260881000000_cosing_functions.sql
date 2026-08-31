-- ============================================================
-- CHANTIER 1, lot 2 — FONCTIONS COSING + RESTRICTIONS UE
-- Généré le 2026-08-31 par scripts/buildCosingFunctions.ts
--
-- Fonctions = vocabulaire contrôlé CosIng (Commission européenne).
-- Restrictions = Règlement (CE) n°1223/2009, Annexes II/III/V/VI.
-- Aucune fonction n'est déduite de la chimie : chaque valeur provient
-- du thésaurus officiel CosIng. Provenance tracée par ingrédient.
-- ============================================================

BEGIN;

-- 1) FONCTIONS COSING (112 ingrédients) + allergènes réglementés (12)
UPDATE public.ingredients SET functions = ARRAY['solvant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'aqua';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('aqua', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : solvant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'agent d''entretien de la peau', 'solvant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'glycerin';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glycerin', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, agent d''entretien de la peau, solvant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'solvant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'e422';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e422', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, solvant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'solvant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'propylene-glycol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('propylene-glycol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, solvant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'solvant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'butylene-glycol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('butylene-glycol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, solvant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'solvant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'pentylene-glycol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('pentylene-glycol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, solvant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'solvant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'propanediol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('propanediol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, solvant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['solvant', 'antioxydant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'isopropyl-alcohol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('isopropyl-alcohol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : solvant, antioxydant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'stabilisateur d''émulsion', 'agent de contrôle de la viscosité', 'opacifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'cetyl-alcohol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetyl-alcohol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, stabilisateur d''émulsion, agent de contrôle de la viscosité, opacifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'stabilisateur d''émulsion', 'agent de contrôle de la viscosité', 'opacifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'stearyl-alcohol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('stearyl-alcohol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, stabilisateur d''émulsion, agent de contrôle de la viscosité, opacifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'stabilisateur d''émulsion', 'agent de contrôle de la viscosité', 'opacifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'cetearyl-alcohol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetearyl-alcohol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, stabilisateur d''émulsion, agent de contrôle de la viscosité, opacifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'liant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'isopropyl-myristate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('isopropyl-myristate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, liant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'solvant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'capric-triglyceride';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('capric-triglyceride', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, solvant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'squalane';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('squalane', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émulsifiant', 'stabilisateur d''émulsion', 'agent de contrôle de la viscosité', 'émollient'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'stearic-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('stearic-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émulsifiant, stabilisateur d''émulsion, agent de contrôle de la viscosité, émollient.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émulsifiant', 'stabilisateur d''émulsion'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'glyceryl-stearate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glyceryl-stearate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émulsifiant, stabilisateur d''émulsion.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['opacifiant', 'perlant', 'stabilisateur d''émulsion', 'agent de contrôle de la viscosité'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'glycol-distearate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glycol-distearate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : opacifiant, perlant, stabilisateur d''émulsion, agent de contrôle de la viscosité.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émulsifiant', 'stabilisateur d''émulsion', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'lecithin';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lecithin', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émulsifiant, stabilisateur d''émulsion, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'shea';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('shea', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'shea-butter';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('shea-butter', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'butyrospermum_parkii';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('butyrospermum_parkii', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'mangifera_indica';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('mangifera_indica', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'simmondsia_chinensis';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('simmondsia_chinensis', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'helianthus_annuus';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('helianthus_annuus', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'argania_spinosa';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('argania_spinosa', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'persea_gratissima';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('persea_gratissima', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'conditionneur capillaire', 'agent de contrôle de la viscosité', 'filmogène', 'parfum'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ricinus_communis';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ricinus_communis', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, conditionneur capillaire, agent de contrôle de la viscosité, filmogène, parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'coconut-oil';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('coconut-oil', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'camelina_sativa';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('camelina_sativa', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'apaisant cutané', 'humectant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'aloe_barbadensis';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('aloe_barbadensis', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, apaisant cutané, humectant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'apaisant cutané'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'althaea_officinalis';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('althaea_officinalis', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, apaisant cutané.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'apaisant cutané', 'absorbant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'avena_sativa';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('avena_sativa', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, apaisant cutané, absorbant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'agent d''entretien de la peau', 'parfum'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'theobroma_cacao';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('theobroma_cacao', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, agent d''entretien de la peau, parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'antistatique', 'conditionneur capillaire', 'filmogène'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'hydrolyzed_rice';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydrolyzed_rice', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, antistatique, conditionneur capillaire, filmogène.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'nettoyant', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-lauryl-sulfate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-lauryl-sulfate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, nettoyant, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'nettoyant', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-laureth-sulfate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-laureth-sulfate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, nettoyant, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'nettoyant', 'émulsifiant', 'stabilisateur d''émulsion'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'coco-glucoside';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('coco-glucoside', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, nettoyant, émulsifiant, stabilisateur d''émulsion.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'nettoyant', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'decyl-glucoside';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('decyl-glucoside', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, nettoyant, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'nettoyant', 'émulsifiant', 'stabilisateur d''émulsion'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'lauryl-glucoside';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lauryl-glucoside', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, nettoyant, émulsifiant, stabilisateur d''émulsion.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'nettoyant', 'antistatique', 'conditionneur capillaire', 'stabilisateur d''émulsion'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'cocamidopropyl_betaine';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cocamidopropyl_betaine', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, nettoyant, antistatique, conditionneur capillaire, stabilisateur d''émulsion.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tensioactif', 'hydrotrope', 'agent de contrôle de la viscosité'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-xylenesulfonate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-xylenesulfonate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tensioactif, hydrotrope, agent de contrôle de la viscosité.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antistatique', 'conditionneur capillaire', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'behentrimonium-chloride';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('behentrimonium-chloride', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antistatique, conditionneur capillaire, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antistatique', 'conditionneur capillaire', 'conservateur', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'cetrimonium-chloride';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetrimonium-chloride', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antistatique, conditionneur capillaire, conservateur, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antistatique', 'conditionneur capillaire', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'stearamidopropyl-dimethylamine';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('stearamidopropyl-dimethylamine', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antistatique, conditionneur capillaire, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'conditionneur capillaire', 'solvant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'cyclopentasiloxane';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cyclopentasiloxane', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, conditionneur capillaire, solvant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['émollient', 'conditionneur capillaire', 'filmogène', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'dimethiconol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dimethiconol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : émollient, conditionneur capillaire, filmogène, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'phenoxyethanol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('phenoxyethanol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur', 'solvant', 'parfum', 'agent masquant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'benzyl-alcohol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-alcohol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur, solvant, parfum, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'benzoic-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzoic-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-benzoate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-benzoate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'e211';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e211', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'potassium-sorbate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('potassium-sorbate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'dehydroacetic-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dehydroacetic-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur', 'agent d''entretien de la peau', 'kératolytique', 'agent masquant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'salicylic-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('salicylic-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur, agent d''entretien de la peau, kératolytique, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur', 'agent masquant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-salicylate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-salicylate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur, agent masquant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'methylisothiazolinone';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylisothiazolinone', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'methylchloroisothiazolinone';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylchloroisothiazolinone', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conservateur', 'antipelliculaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'piroctone-olamine';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('piroctone-olamine', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conservateur, antipelliculaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'agent d''entretien de la peau', 'émollient'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'caprylyl-glycol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caprylyl-glycol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, agent d''entretien de la peau, émollient.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['conditionneur capillaire', 'agent d''entretien de la peau', 'déodorant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ethylhexylglycerin';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ethylhexylglycerin', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : conditionneur capillaire, agent d''entretien de la peau, déodorant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['chélateur', 'séquestrant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'disodium-edta';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('disodium-edta', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : chélateur, séquestrant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['chélateur', 'séquestrant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'tetrasodium-edta';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tetrasodium-edta', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : chélateur, séquestrant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['chélateur', 'séquestrant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'disodium-etidronate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('disodium-etidronate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : chélateur, séquestrant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['chélateur', 'séquestrant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'tetrasodium-glutamate-diacetate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tetrasodium-glutamate-diacetate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : chélateur, séquestrant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['ajusteur de pH', 'chélateur', 'tampon', 'parfum'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'citric-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('citric-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : ajusteur de pH, chélateur, tampon, parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['ajusteur de pH', 'chélateur', 'tampon'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'e330';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e330', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : ajusteur de pH, chélateur, tampon.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['tampon', 'ajusteur de pH', 'chélateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-citrate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-citrate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : tampon, ajusteur de pH, chélateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'agent d''entretien de la peau', 'ajusteur de pH', 'kératolytique'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'lactic-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lactic-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, agent d''entretien de la peau, ajusteur de pH, kératolytique.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['ajusteur de pH', 'denaturant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-hydroxide';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-hydroxide', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : ajusteur de pH, denaturant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'antistatique', 'chélateur'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'histidine';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('histidine', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, antistatique, chélateur.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'ajusteur de pH', 'antistatique', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'arginine';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('arginine', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, ajusteur de pH, antistatique, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent de contrôle de la viscosité'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-chloride';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-chloride', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent de contrôle de la viscosité.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent de contrôle de la viscosité', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'magnesium-chloride';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('magnesium-chloride', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent de contrôle de la viscosité, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['opacifiant', 'abrasif', 'liant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'mica';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('mica', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : opacifiant, abrasif, liant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['colorant', 'opacifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ci-77891';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-77891', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : colorant, opacifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['colorant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ci-19140';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-19140', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : colorant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['colorant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ci-42090';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-42090', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : colorant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['colorant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ci-17200';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-17200', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : colorant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['filtre UV', 'colorant', 'opacifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'titanium-dioxide';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('titanium-dioxide', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : filtre UV, colorant, opacifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['filtre UV', 'protecteur cutané'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'zinc-oxide';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('zinc-oxide', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : filtre UV, protecteur cutané.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'agent d''entretien de la peau', 'astringent'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'zinc_pca';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('zinc_pca', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, agent d''entretien de la peau, astringent.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'niacinamide';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('niacinamide', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'antistatique', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'panthenol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('panthenol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, antistatique, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'apaisant cutané', 'protecteur cutané'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'allantoin';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('allantoin', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, apaisant cutané, protecteur cutané.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['humectant', 'agent d''entretien de la peau', 'antistatique', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'sodium-pca';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-pca', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : humectant, agent d''entretien de la peau, antistatique, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antioxydant', 'agent d''entretien de la peau', 'ajusteur de pH'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ascorbic-acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ascorbic-acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antioxydant, agent d''entretien de la peau, ajusteur de pH.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antioxydant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'tocopherol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tocopherol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antioxydant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antioxydant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'tocopheryl-acetate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tocopheryl-acetate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antioxydant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['antioxydant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'vitamin-e';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('vitamin-e', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : antioxydant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'conditionneur capillaire'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'ceramide-np';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ceramide-np', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, conditionneur capillaire.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau', 'astringent'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'tranexamic_acid';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tranexamic_acid', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau, astringent.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant', 'denaturant', 'refroidissant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'menthol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('menthol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant, denaturant, refroidissant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'mentha_piperita';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('mentha_piperita', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'melaleuca_alternifolia';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('melaleuca_alternifolia', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'antioxydant', 'tonique', 'agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'rosmarinus_officinalis';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('rosmarinus_officinalis', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, antioxydant, tonique, agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent de contrôle de la viscosité', 'stabilisateur d''émulsion', 'liant', 'filmogène', 'émulsifiant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'hydroxyethylcellulose';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroxyethylcellulose', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent de contrôle de la viscosité, stabilisateur d''émulsion, liant, filmogène, émulsifiant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent de contrôle de la viscosité', 'stabilisateur d''émulsion', 'liant', 'filmogène'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'e415';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e415', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent de contrôle de la viscosité, stabilisateur d''émulsion, liant, filmogène.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'parfum';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('parfum', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'linalool';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('linalool', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'solvant'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'limonene';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('limonene', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, solvant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'citronellol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('citronellol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'geraniol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('geraniol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'citral';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('citral', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'coumarin';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('coumarin', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['solvant', 'parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'benzyl-benzoate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-benzoate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : solvant, parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['filtre UV', 'parfum', 'agent masquant'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'benzyl-salicylate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-salicylate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : filtre UV, parfum, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'hexyl-cinnamal';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hexyl-cinnamal', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'alpha-isomethyl-ionone';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('alpha-isomethyl-ionone', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'butylphenyl-methylpropional';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('butylphenyl-methylpropional', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant'], is_allergen_regulated = true, updated_at = NOW() WHERE id = 'hydroxycitronellal';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroxycitronellal', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['parfum', 'agent masquant'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'linalyl-acetate';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('linalyl-acetate', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : parfum, agent masquant.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
UPDATE public.ingredients SET functions = ARRAY['agent d''entretien de la peau'], is_allergen_regulated = false, updated_at = NOW() WHERE id = 'retinol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('retinol', 'CosIng — Cosmetic Ingredient Database, Commission européenne (vocabulaire contrôlé des fonctions cosmétiques). Fonctions CosIng : agent d''entretien de la peau.', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 1, 'Fonctions cosmétiques issues du vocabulaire contrôlé CosIng.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

-- 3) RESTRICTIONS UE (15 ingrédients, Règlement 1223/2009)
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('phenoxyethanol', 'EU', 'restricted', 1, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/29)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('phenoxyethanol', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/29) — Conservateur listé à l''Annexe V. Concentration maximale 1,0 % dans les produits finis.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('benzyl-alcohol', 'EU', 'restricted', 1, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/34)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-alcohol', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/34) — Conservateur (Annexe V) : max 1,0 % comme conservateur ; aussi utilisé comme parfum/solvant.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('benzoic-acid', 'EU', 'restricted', 0.5, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/1)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzoic-acid', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/1) — Conservateur (Annexe V, entrée 1) : max 0,5 % (exprimé en acide) selon le type de produit.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('sodium-benzoate', 'EU', 'restricted', 0.5, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/1)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-benzoate', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/1) — Sel de l''acide benzoïque (Annexe V/1) : compté en acide, mêmes limites que l''acide benzoïque.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('potassium-sorbate', 'EU', 'restricted', 0.6, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/4)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('potassium-sorbate', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/4) — Conservateur (Annexe V/4, acide sorbique) : max 0,6 % exprimé en acide.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('dehydroacetic-acid', 'EU', 'restricted', 0.6, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/13)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dehydroacetic-acid', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/13) — Conservateur (Annexe V/13) : max 0,6 % exprimé en acide déhydroacétique.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('sodium-salicylate', 'EU', 'restricted', 0.5, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/3)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-salicylate', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/3) — Sel de l''acide salicylique (Annexe V/3) : mêmes limites en acide.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('methylisothiazolinone', 'EU', 'restricted', NULL, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/57)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylisothiazolinone', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/57) — Conservateur Annexe V/57 : max 0,0015 % (15 ppm) en produits rincés ; interdit dans les produits non rincés.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('methylchloroisothiazolinone', 'EU', 'restricted', NULL, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/39)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylchloroisothiazolinone', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/39) — Mélange CMIT/MIT (Annexe V/39) : max 0,0015 % (15 ppm) en produits rincés (rapport 3:1) ; interdit en non rincé.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('piroctone-olamine', 'EU', 'restricted', 1, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/41)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('piroctone-olamine', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/41) — Conservateur Annexe V/41 (max 1,0 % rincé / 0,5 % non rincé) ; aussi antipelliculaire (Annexe III).')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('magnesium-nitrate', 'EU', 'restricted', NULL, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe V (V/9)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('magnesium-nitrate', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe V (V/9) — Stabilisant du système conservateur chlorure de magnésium/nitrate de magnésium associé au MIT (Annexe V).')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('titanium-dioxide', 'EU', 'allowed', 25, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe VI (VI/27)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('titanium-dioxide', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe VI (VI/27) — Filtre UV listé (Annexe VI/27) et colorant (Annexe IV/142) ; la forme nanoparticulaire est soumise à conditions et étiquetage (nano).')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('zinc-oxide', 'EU', 'allowed', 25, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe VI (VI/26)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('zinc-oxide', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe VI (VI/26) — Filtre UV listé (Annexe VI/26) ; la forme nanoparticulaire est soumise à conditions et étiquetage (nano).')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('hydroquinone', 'EU', 'prohibited', NULL, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe II (II/1338)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroquinone', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe II (II/1338) — Interdit (Annexe II) dans les cosmétiques, à l''exception des systèmes de faux-ongles sous stricte condition (Annexe III).')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('retinol', 'EU', 'restricted', 0.3, 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques, Annexe III (III)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('retinol', 'Règlement (CE) n°1223/2009 relatif aux produits cosmétiques — Annexes II (interdits), III (restreints), V (conservateurs), VI (filtres UV)', 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:02009R1224-20240801', CURRENT_DATE, NULL, 1, 'Annexe III (III) — Substances à activité vitamine A restreintes (Règl. délégué (UE) 2022/2125) : max 0,3 % RE visage, 0,05 % RE corps.')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

COMMIT;
