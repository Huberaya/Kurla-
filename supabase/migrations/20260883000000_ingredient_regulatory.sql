-- ============================================================
-- CHANTIER 1 — LOT RÉGLEMENTAIRE (sources 100 % gratuites, tracées)
-- Généré par scripts/buildRegulatoryMigration.ts le 2026-08-31
--
-- Fonctions cosmétiques : vocabulaire déclaré **CosIng** (Commission UE)
--   https://ec.europa.eu/growth/tools-databases/cosing/
-- Restrictions : Règlement (CE) n°1223/2009, annexes II (interdits),
--   III (restreints), IV (colorants), V (conservateurs), VI (filtres UV).
-- Allergènes : annexe III modifiée par le Règlement (UE) 2023/1545
--   (26 historiques + allergènes supplémentaires ; seuils d'étiquetage
--   0,001 % leave-on / 0,01 % rinse-off, applicables au 31/07/2026).
-- Aucune fonction n'est déduite de la chimie : toutes sont les fonctions
-- déclarées CosIng des substances. Idempotent (UPDATE / ON CONFLICT).
-- ============================================================

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'methylparaben' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('methylparaben', 'EU', 'restricted', 0.4, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (esters de p-hydroxybenzoate) — 0,4 % par ester ; 0,8 % en mélange de parabènes.')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylparaben', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'sorbic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('sorbic-acid', 'EU', 'restricted', 0.6, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (acide sorbique et sorbates)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sorbic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'dmdm-hydantoin' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('dmdm-hydantoin', 'EU', 'restricted', 0.6, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (DMDM hydantoïne, libérateur de formaldéhyde)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dmdm-hydantoin', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'chlorphenesin' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('chlorphenesin', 'EU', 'restricted', 0.3, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (chlorphénésine)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('chlorphenesin', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antipelliculaire', 'conservateur'], updated_at = NOW()
WHERE id = 'zinc-pyrithione' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('zinc-pyrithione', 'EU', 'restricted', 1, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (pyrithione de zinc) — Autorisé dans les produits capillaires rincés ; interdit sous forme aérosol.')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('zinc-pyrithione', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antipelliculaire, conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'chlorhexidine-digluconate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('chlorhexidine-digluconate', 'EU', 'restricted', 0.3, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (digluconate de chlorhexidine)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('chlorhexidine-digluconate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antioxydant', 'conservateur'], updated_at = NOW()
WHERE id = 'hydroxyacetophenone' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroxyacetophenone', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antioxydant, conservateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'sodium-anisate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-anisate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'levulinic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('levulinic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'sodium-levulinate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-levulinate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'émulsifiant', 'conservateur'], updated_at = NOW()
WHERE id = 'glyceryl-caprylate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glyceryl-caprylate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, émulsifiant, conservateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'sodium-benzoate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('sodium-benzoate', 'EU', 'restricted', 0.5, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (benzoate de sodium) — 0,5 % calculé en acide benzoïque (usage conservateur).')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-benzoate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'benzoic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('benzoic-acid', 'EU', 'restricted', 0.5, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (acide benzoïque) — 0,5 % calculé en acide (usage conservateur).')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzoic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'potassium-sorbate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('potassium-sorbate', 'EU', 'restricted', 0.6, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (sorbate de potassium)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('potassium-sorbate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'phenoxyethanol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('phenoxyethanol', 'EU', 'restricted', 1, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (phénoxyéthanol)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('phenoxyethanol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'ethylhexyl-methoxycinnamate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ethylhexyl-methoxycinnamate', 'EU', 'allowed', 10, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (octinoxate)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ethylhexyl-methoxycinnamate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'butyl-methoxydibenzoylmethane' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('butyl-methoxydibenzoylmethane', 'EU', 'allowed', 5, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (avobenzone)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('butyl-methoxydibenzoylmethane', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'octocrylene' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('octocrylene', 'EU', 'allowed', 10, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (octocrylène)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('octocrylene', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'benzophenone-4' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('benzophenone-4', 'EU', 'allowed', 5, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (sulisobenzone)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzophenone-4', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'ethylhexyl-salicylate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ethylhexyl-salicylate', 'EU', 'allowed', 5, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (octisalate)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ethylhexyl-salicylate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'ethylhexyl-triazone' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ethylhexyl-triazone', 'EU', 'allowed', 5, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (éthylhexyl triazone)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ethylhexyl-triazone', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV'], updated_at = NOW()
WHERE id = 'diethylamino-hydroxybenzoyl-hexyl-benzoate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('diethylamino-hydroxybenzoyl-hexyl-benzoate', 'EU', 'allowed', 10, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (Uvinul A Plus)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('diethylamino-hydroxybenzoyl-hexyl-benzoate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV', 'colorant'], updated_at = NOW()
WHERE id = 'titanium-dioxide' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('titanium-dioxide', 'EU', 'allowed', 25, 'Annexe VI · Règlement (CE) n°1223/2009, annexes IV/VI (dioxyde de titane)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('titanium-dioxide', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV, colorant) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filtre UV', 'protecteur cutané'], updated_at = NOW()
WHERE id = 'zinc-oxide' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('zinc-oxide', 'EU', 'allowed', 25, 'Annexe VI · Règlement (CE) n°1223/2009, annexe VI (oxyde de zinc, filtre minéral)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('zinc-oxide', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filtre UV, protecteur cutané) ; statut annexe VI (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-14700' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-14700', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-14700', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-15985' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-15985', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-15985', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-16035' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-16035', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-16035', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-16255' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-16255', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-16255', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-47005' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-47005', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-47005', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-77491' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-77491', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-77491', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'ci-77492' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('ci-77492', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-77492', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'e110' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('e110', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e110', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'e133' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('e133', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e133', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'red-33' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('red-33', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('red-33', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'red-4' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('red-4', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('red-4', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'yellow-5' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('yellow-5', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('yellow-5', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'caramel' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('caramel', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caramel', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['colorant'], updated_at = NOW()
WHERE id = 'illite' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('illite', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (colorants autorisés)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('illite', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (colorant) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['absorbant', 'agent de remplissage', 'agent de contrôle de la viscosité', 'abrasif'], updated_at = NOW()
WHERE id = 'silica' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('silica', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (absorbant, agent de remplissage, agent de contrôle de la viscosité, abrasif).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['absorbant', 'agent de remplissage'], updated_at = NOW()
WHERE id = 'e551' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('e551', 'EU', 'allowed', NULL, 'Annexe IV · Règlement (CE) n°1223/2009, annexe IV (dioxyde de silicium, E551)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e551', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (absorbant, agent de remplissage) ; statut annexe IV (allowed).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['parfum', 'agent masquant', 'apaisant cutané'], updated_at = NOW()
WHERE id = 'eugenol' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = 'eugenol';
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('eugenol', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III — Règlement (UE) 2023/1545 (modifie l’annexe III) — Allergène à étiquetage au-delà des seuils (0,001 % leave-on / 0,01 % rinse-off).')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('eugenol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (parfum, agent masquant, apaisant cutané) ; statut annexe III (restricted) ; allergène à étiquetage (annexe III / Règlement UE 2023/1545).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['parfum'], updated_at = NOW()
WHERE id = 'amyl-cinnamal' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = 'amyl-cinnamal';
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('amyl-cinnamal', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III — Règlement (UE) 2023/1545 (modifie l’annexe III)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('amyl-cinnamal', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (parfum) ; statut annexe III (restricted) ; allergène à étiquetage (annexe III / Règlement UE 2023/1545).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'conservateur', 'parfum'], updated_at = NOW()
WHERE id = 'benzyl-alcohol' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = 'benzyl-alcohol';
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('benzyl-alcohol', 'EU', 'restricted', 1, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (conservateur, 1 %) ; allergène annexe III — Règlement (UE) 2023/1545 (modifie l’annexe III)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-alcohol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, conservateur, parfum) ; statut annexe V (restricted) ; allergène à étiquetage (annexe III / Règlement UE 2023/1545).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['parfum'], updated_at = NOW()
WHERE id = 'linalool' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = 'linalool';
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('linalool', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III — Règlement (UE) 2023/1545 (modifie l’annexe III)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('linalool', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (parfum) ; statut annexe III (restricted) ; allergène à étiquetage (annexe III / Règlement UE 2023/1545).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['parfum', 'solvant'], updated_at = NOW()
WHERE id = 'limonene' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = 'limonene';
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('limonene', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III — Règlement (UE) 2023/1545 (modifie l’annexe III)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('limonene', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (parfum, solvant) ; statut annexe III (restricted) ; allergène à étiquetage (annexe III / Règlement UE 2023/1545).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['parfum', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'terpineol' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = false, updated_at = NOW() WHERE id = 'terpineol';
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('terpineol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (parfum, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['parfum'], updated_at = NOW()
WHERE id = 'hexamethylindanopyran' AND (functions IS NULL OR cardinality(functions) = 0);
UPDATE public.ingredients SET is_allergen_regulated = true, updated_at = NOW() WHERE id = 'hexamethylindanopyran';
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('hexamethylindanopyran', 'EU', 'restricted', NULL, 'Annexe III · Règlement (UE) 2023/1545 (modifie l’annexe III) (Galaxolide, allergène supplémentaire)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hexamethylindanopyran', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (parfum) ; statut annexe III (restricted) ; allergène à étiquetage (annexe III / Règlement UE 2023/1545).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['apaisant cutané', 'agent d''entretien de la peau', 'parfum'], updated_at = NOW()
WHERE id = 'bisabolol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('bisabolol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (apaisant cutané, agent d''entretien de la peau, parfum).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'nettoyant'], updated_at = NOW()
WHERE id = 'ammonium-lauryl-sulfate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ammonium-lauryl-sulfate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, nettoyant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'nettoyant'], updated_at = NOW()
WHERE id = 'sodium-c14-16-olefin-sulfonate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-c14-16-olefin-sulfonate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, nettoyant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'nettoyant', 'conditionneur capillaire'], updated_at = NOW()
WHERE id = 'sodium-cocoyl-glutamate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-cocoyl-glutamate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, nettoyant, conditionneur capillaire).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'émulsifiant', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'sodium-stearoyl-glutamate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-stearoyl-glutamate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, émulsifiant, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'nettoyant', 'émulsifiant'], updated_at = NOW()
WHERE id = 'capryl-glucoside' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('capryl-glucoside', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, nettoyant, émulsifiant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émulsifiant', 'tensioactif', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'cetearyl-glucoside' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetearyl-glucoside', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émulsifiant, tensioactif, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émulsifiant', 'tensioactif'], updated_at = NOW()
WHERE id = 'sorbitan-oleate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sorbitan-oleate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émulsifiant, tensioactif).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émulsifiant', 'tensioactif'], updated_at = NOW()
WHERE id = 'potassium-cetyl-phosphate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('potassium-cetyl-phosphate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émulsifiant, tensioactif).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'nettoyant', 'émulsifiant'], updated_at = NOW()
WHERE id = 'sodium-laurate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-laurate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, nettoyant, émulsifiant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'émulsifiant', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'sodium-stearate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-stearate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, émulsifiant, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent de contrôle de la viscosité', 'agent de remplissage'], updated_at = NOW()
WHERE id = 'sodium-sulfate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-sulfate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent de contrôle de la viscosité, agent de remplissage).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent de contrôle de la viscosité', 'abrasif', 'agent de remplissage'], updated_at = NOW()
WHERE id = 'sea-salt' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sea-salt', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent de contrôle de la viscosité, abrasif, agent de remplissage).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH', 'tampon', 'émulsifiant', 'parfum'], updated_at = NOW()
WHERE id = 'triethanolamine' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('triethanolamine', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH, tampon, émulsifiant, parfum).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH', 'tampon'], updated_at = NOW()
WHERE id = 'potassium-hydroxide' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('potassium-hydroxide', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III (hydroxyde de potassium, réserve alcaline) — Concentration d’usage selon pH final ; réserves pour les produits destinés aux contacts cutanés.')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('potassium-hydroxide', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH, tampon) ; statut annexe III (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent de contrôle de la viscosité', 'stabilisateur d''émulsion', 'conditionneur capillaire'], updated_at = NOW()
WHERE id = 'behenyl-alcohol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('behenyl-alcohol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent de contrôle de la viscosité, stabilisateur d''émulsion, conditionneur capillaire).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent de contrôle de la viscosité', 'stabilisateur d''émulsion'], updated_at = NOW()
WHERE id = 'myristyl-alcohol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('myristyl-alcohol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent de contrôle de la viscosité, stabilisateur d''émulsion).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'cetyl-palmitate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetyl-palmitate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'myristyl-myristate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('myristyl-myristate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau', 'liant'], updated_at = NOW()
WHERE id = 'isopropyl-palmitate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('isopropyl-palmitate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau, liant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'octyldodecanol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('octyldodecanol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'dicaprylyl-carbonate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dicaprylyl-carbonate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'dicaprylyl-ether' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dicaprylyl-ether', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'propylene-glycol-dicaprylate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('propylene-glycol-dicaprylate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau', 'émulsifiant'], updated_at = NOW()
WHERE id = 'oleic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('oleic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau, émulsifiant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'émulsifiant', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'palmitic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('palmitic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, émulsifiant, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'émulsifiant', 'tensioactif'], updated_at = NOW()
WHERE id = 'lauric-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lauric-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, émulsifiant, tensioactif).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'émulsifiant'], updated_at = NOW()
WHERE id = 'caprylic' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caprylic', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, émulsifiant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'émulsifiant'], updated_at = NOW()
WHERE id = 'caprate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caprate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, émulsifiant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émulsifiant', 'tensioactif', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'laureth-2' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('laureth-2', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émulsifiant, tensioactif, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'solvant', 'liant'], updated_at = NOW()
WHERE id = 'peg' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('peg', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, solvant, liant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau', 'solvant'], updated_at = NOW()
WHERE id = 'sorbitol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sorbitol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau, solvant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau', 'tampon'], updated_at = NOW()
WHERE id = 'sodium-lactate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-lactate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau, tampon).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau', 'antistatique', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'betaine' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('betaine', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau, antistatique, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau', 'kératolytique'], updated_at = NOW()
WHERE id = 'urea' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('urea', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau, kératolytique).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'trehalose' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('trehalose', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'glucose' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glucose', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent d''entretien de la peau', 'conditionneur capillaire', 'antistatique'], updated_at = NOW()
WHERE id = 'glycine' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glycine', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent d''entretien de la peau, conditionneur capillaire, antistatique).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent d''entretien de la peau', 'conditionneur capillaire', 'antistatique'], updated_at = NOW()
WHERE id = 'serine' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('serine', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent d''entretien de la peau, conditionneur capillaire, antistatique).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'agent de contrôle de la viscosité', 'humectant'], updated_at = NOW()
WHERE id = 'hexylene-glycol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hexylene-glycol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, agent de contrôle de la viscosité, humectant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'agent de contrôle de la viscosité', 'parfum'], updated_at = NOW()
WHERE id = 'dipropylene-glycol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dipropylene-glycol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, agent de contrôle de la viscosité, parfum).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'humectant'], updated_at = NOW()
WHERE id = 'triethylene-glycol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('triethylene-glycol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, humectant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'humectant', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'methylpropanediol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylpropanediol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, humectant, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['humectant', 'agent d''entretien de la peau', 'solvant'], updated_at = NOW()
WHERE id = 'e420' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e420', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (humectant, agent d''entretien de la peau, solvant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'humectant'], updated_at = NOW()
WHERE id = 'e1519' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e1519', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, humectant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'denaturant'], updated_at = NOW()
WHERE id = 'e1510' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e1510', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, denaturant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['solvant', 'astringent', 'agent de contrôle de la viscosité', 'déodorant'], updated_at = NOW()
WHERE id = 'alcohol' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('alcohol', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III (alcool éthylique dénaturé) — Éthanol : teneur encadrée ; dénaturation obligatoire.')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('alcohol', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (solvant, astringent, agent de contrôle de la viscosité, déodorant) ; statut annexe III (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émollient', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'e490' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e490', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émollient, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conditionneur capillaire', 'agent d''entretien de la peau', 'humectant'], updated_at = NOW()
WHERE id = 'panthenyl-ethyl-ether' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('panthenyl-ethyl-ether', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conditionneur capillaire, agent d''entretien de la peau, humectant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conditionneur capillaire', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'biotin' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('biotin', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conditionneur capillaire, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent d''entretien de la peau', 'apaisant cutané'], updated_at = NOW()
WHERE id = 'caffeine' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caffeine', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent d''entretien de la peau, apaisant cutané).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antioxydant', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'ascorbyl-glucoside' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ascorbyl-glucoside', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antioxydant, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antioxydant'], updated_at = NOW()
WHERE id = 'ascorbyl-palmitate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ascorbyl-palmitate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antioxydant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antioxydant'], updated_at = NOW()
WHERE id = 'e321' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e321', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antioxydant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antioxydant', 'parfum'], updated_at = NOW()
WHERE id = 'bht' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('bht', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III (BHT) — 0,8 % en mélange.')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('bht', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antioxydant, parfum) ; statut annexe III (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent d''entretien de la peau', 'antioxydant'], updated_at = NOW()
WHERE id = 'retinyl-palmitate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('retinyl-palmitate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent d''entretien de la peau, antioxydant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH', 'tampon', 'kératolytique', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'glycolic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('glycolic-acid', 'EU', 'restricted', NULL, 'Annexe III · Règlement (CE) n°1223/2009, annexe III (acides alpha-hydroxylés) — Concentration et pH encadrés pour les usages kératolytiques.')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glycolic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH, tampon, kératolytique, agent d''entretien de la peau) ; statut annexe III (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH', 'tampon'], updated_at = NOW()
WHERE id = 'acetic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('acetic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH, tampon).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH', 'tampon', 'humectant'], updated_at = NOW()
WHERE id = 'e270' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e270', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH, tampon, humectant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH', 'tampon'], updated_at = NOW()
WHERE id = 'e265' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e265', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH, tampon).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['antioxydant', 'agent d''entretien de la peau'], updated_at = NOW()
WHERE id = 'e325' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e325', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (antioxydant, agent d''entretien de la peau).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur'], updated_at = NOW()
WHERE id = 'e210' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_jurisdiction_restrictions (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES ('e210', 'EU', 'restricted', NULL, 'Annexe V · Règlement (CE) n°1223/2009, annexe V (acide benzoïque E210)')
ON CONFLICT (ingredient_id, jurisdiction) DO UPDATE SET status = EXCLUDED.status, limit_percent = EXCLUDED.limit_percent, reference = EXCLUDED.reference;
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e210', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur) ; statut annexe V (restricted).', 'https://eur-lex.europa.eu/eli/reg/2009/1223/oj/fra', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tensioactif', 'émulsifiant'], updated_at = NOW()
WHERE id = 'e487' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e487', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tensioactif, émulsifiant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['chélateur', 'kératolytique', 'humectant'], updated_at = NOW()
WHERE id = 'gluconolactone' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('gluconolactone', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (chélateur, kératolytique, humectant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['chélateur'], updated_at = NOW()
WHERE id = 'sodium-gluconate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-gluconate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (chélateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['chélateur'], updated_at = NOW()
WHERE id = 'sodium-phytate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-phytate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (chélateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['chélateur', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'etidronic-acid' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('etidronic-acid', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (chélateur, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['chélateur', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'tetrasodium-etidronate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tetrasodium-etidronate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (chélateur, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['chélateur'], updated_at = NOW()
WHERE id = 'trisodium-ethylenediamine-disuccinate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('trisodium-ethylenediamine-disuccinate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (chélateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conservateur', 'agent de contrôle de la viscosité'], updated_at = NOW()
WHERE id = 'magnesium-nitrate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('magnesium-nitrate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conservateur, agent de contrôle de la viscosité).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['tampon', 'ajusteur de pH', 'chélateur'], updated_at = NOW()
WHERE id = 'sodium-phosphate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-phosphate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (tampon, ajusteur de pH, chélateur).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['filmogène', 'déodorant', 'solvant'], updated_at = NOW()
WHERE id = 'triethyl-citrate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('triethyl-citrate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (filmogène, déodorant, solvant).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['ajusteur de pH'], updated_at = NOW()
WHERE id = 'sodium' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (ajusteur de pH).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent de contrôle de la viscosité', 'stabilisateur d''émulsion', 'filmogène'], updated_at = NOW()
WHERE id = 'ammonium-acryloyldimethyltaurate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ammonium-acryloyldimethyltaurate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent de contrôle de la viscosité, stabilisateur d''émulsion, filmogène).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent de contrôle de la viscosité', 'filmogène', 'stabilisateur d''émulsion'], updated_at = NOW()
WHERE id = 'hydroxyethyl-acrylate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroxyethyl-acrylate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent de contrôle de la viscosité, filmogène, stabilisateur d''émulsion).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['conditionneur capillaire', 'antistatique', 'tensioactif'], updated_at = NOW()
WHERE id = 'behentrimonium-methosulfate' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('behentrimonium-methosulfate', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (conditionneur capillaire, antistatique, tensioactif).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['émulsifiant', 'agent d''entretien de la peau', 'tensioactif'], updated_at = NOW()
WHERE id = 'glyceryl-stearate-se' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glyceryl-stearate-se', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (émulsifiant, agent d''entretien de la peau, tensioactif).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

UPDATE public.ingredients SET functions = array['agent de contrôle de la viscosité', 'filmogène'], updated_at = NOW()
WHERE id = 'styrene' AND (functions IS NULL OR cardinality(functions) = 0);
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('styrene', 'CosIng (Commission UE) + Règlement (CE) n°1223/2009 : fonctions CosIng déclarées (agent de contrôle de la viscosité, filmogène).', 'https://ec.europa.eu/growth/tools-databases/cosing/', CURRENT_DATE, NULL, 2, 'Lot réglementaire/fonctions CosIng')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

-- Bilan du lot : 125 ingrédients avec fonctions CosIng, 6 allergènes marqués, 45 restrictions UE.