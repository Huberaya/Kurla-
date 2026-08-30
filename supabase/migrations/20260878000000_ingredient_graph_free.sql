-- ============================================================
-- CHANTIER 1 — GRAPHE D'INGRÉDIENTS (sources 100 % gratuites)
-- Généré le 2026-08-30 par scripts/buildIngredientGraph.ts
--
-- Sources : Open Beauty Facts (ODbL, fréquence des INCI sur étiquettes),
-- PubChem (NIH/NLM, domaine public : CID/formule/CAS), Wikidata (CC0).
-- Aucune fonction cosmétique ni allégation n'est inventée : le graphe
-- porte l'identité (INCI, CAS, CID) et la provenance. Les fonctions
-- viendront d'un vocabulaire réglementaire (CosIng) dans un second lot.
--
-- verified = entité chimique confirmée par PubChem (tier 1) avec CAS.
-- pending  = entité reconnue (Wikidata) sans CAS tier 1, à confirmer.
-- Les INCI non résolus (mélanges botaniques) ne sont pas insérés.
-- ============================================================

-- 88 ingrédients vérifiés (CAS PubChem)
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('aqua', 'Aqua', 'aqua', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('aqua', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 1102 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/962', CURRENT_DATE, '7732-18-5', 1, 'CID 962, H2O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('glycerin', 'Glycerin', 'glycerin', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glycerin', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 642 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/753', CURRENT_DATE, '56-81-5', 1, 'CID 753, C3H8O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-chloride', 'Sodium Chloride', 'sodium-chloride', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-chloride', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 472 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/5234', CURRENT_DATE, '7647-14-5', 1, 'CID 5234, ClNa')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('linalool', 'Linalool', 'linalool', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('linalool', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 459 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/6549', CURRENT_DATE, '78-70-6', 1, 'CID 6549, C10H18O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('citric-acid', 'Citric Acid', 'citric-acid', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('citric-acid', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 427 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/311', CURRENT_DATE, '77-92-9', 1, 'CID 311, C6H8O7')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-benzoate', 'Sodium Benzoate', 'sodium-benzoate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-benzoate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 412 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/517055', CURRENT_DATE, '532-32-1', 1, 'CID 517055, C7H5NaO2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('limonene', 'Limonene', 'limonene', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('limonene', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 367 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/22311', CURRENT_DATE, '138-86-3', 1, 'CID 22311, C10H16')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('phenoxyethanol', 'Phenoxyethanol', 'phenoxyethanol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('phenoxyethanol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 311 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/31236', CURRENT_DATE, '122-99-6', 1, 'CID 31236, C8H10O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('cetearyl-alcohol', 'Cetearyl Alcohol', 'cetearyl-alcohol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetearyl-alcohol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 300 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/62238', CURRENT_DATE, '8005-44-5', 1, 'CID 62238, C34H72O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('disodium-edta', 'Disodium Edta', 'disodium-edta', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('disodium-edta', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 291 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/13020083', CURRENT_DATE, '139-33-3', 1, 'CID 13020083, C10H14N2Na2O8')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-hydroxide', 'Sodium Hydroxide', 'sodium-hydroxide', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-hydroxide', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 272 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/14798', CURRENT_DATE, '1310-73-2', 1, 'CID 14798, HNaO')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('tetrasodium-edta', 'Edta', 'tetrasodium-edta', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tetrasodium-edta', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 262 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/6049', CURRENT_DATE, '60-00-4', 1, 'CID 6049, C10H16N2O8')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('hexyl-cinnamal', 'Hexyl Cinnamal', 'hexyl-cinnamal', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hexyl-cinnamal', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 258 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/1715135', CURRENT_DATE, '364364-06-7', 1, 'CID 1715135, C15H20O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-laureth-sulfate', 'Sodium Laureth Sulfate', 'sodium-laureth-sulfate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-laureth-sulfate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 258 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/23665884', CURRENT_DATE, '9004-82-4', 1, 'CID 23665884, C14H29NaO5S')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('panthenol', 'Panthenol', 'panthenol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('panthenol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 226 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/4678', CURRENT_DATE, '16485-10-2', 1, 'CID 4678, C9H19NO4')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('benzyl-alcohol', 'Benzyl Alcohol', 'benzyl-alcohol', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-alcohol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 213 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/244', CURRENT_DATE, '100-51-6', 1, 'CID 244, C7H8O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('potassium-sorbate', 'Potassium Sorbate', 'potassium-sorbate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('potassium-sorbate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 200 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/23676745', CURRENT_DATE, '24634-61-5', 1, 'CID 23676745, C6H7KO2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('citronellol', 'Citronellol', 'citronellol', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('citronellol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 194 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/8842', CURRENT_DATE, '106-22-9', 1, 'CID 8842, C10H20O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('cetyl-alcohol', 'Cetyl Alcohol', 'cetyl-alcohol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetyl-alcohol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 183 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/2682', CURRENT_DATE, '36653-82-4', 1, 'CID 2682, C16H34O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('tocopherol', 'Tocopherol', 'tocopherol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tocopherol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 173 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/14986', CURRENT_DATE, '1406-66-2', 1, 'CID 14986, C28H48O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('benzyl-salicylate', 'Benzyl Salicylate', 'benzyl-salicylate', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-salicylate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 165 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/8363', CURRENT_DATE, '118-58-1', 1, 'CID 8363, C14H12O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('e330', 'e330', 'e330', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e330', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 161 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/311', CURRENT_DATE, '77-92-9', 1, 'CID 311, C6H8O7')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('propylene-glycol', 'Propylene Glycol', 'propylene-glycol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('propylene-glycol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 149 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/1030', CURRENT_DATE, '57-55-6', 1, 'CID 1030, C3H8O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('tocopheryl-acetate', 'Tocopheryl Acetate', 'tocopheryl-acetate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tocopheryl-acetate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 144 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/2117', CURRENT_DATE, '52225-20-4', 1, 'CID 2117, C31H52O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('geraniol', 'Geraniol', 'geraniol', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('geraniol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 136 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/637566', CURRENT_DATE, '106-24-1', 1, 'CID 637566, C10H18O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('glycol-distearate', 'Glycol Distearate', 'glycol-distearate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glycol-distearate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 132 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/61174', CURRENT_DATE, '627-83-8', 1, 'CID 61174, C38H74O4')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('glyceryl-stearate', 'Glyceryl Stearate', 'glyceryl-stearate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('glyceryl-stearate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 131 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/93066', CURRENT_DATE, '11099-07-3', 1, 'CID 93066, C21H44O5')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('e422', 'e422', 'e422', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e422', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 126 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/753', CURRENT_DATE, '56-81-5', 1, 'CID 753, C3H8O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('methylisothiazolinone', 'Methylisothiazolinone', 'methylisothiazolinone', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylisothiazolinone', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 124 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/39800', CURRENT_DATE, '2682-20-4', 1, 'CID 39800, C4H5NOS')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('ethylhexylglycerin', 'Ethylhexylglycerin', 'ethylhexylglycerin', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ethylhexylglycerin', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 124 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/9859093', CURRENT_DATE, '70445-33-9', 1, 'CID 9859093, C11H24O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('caprylyl-glycol', 'Caprylyl Glycol', 'caprylyl-glycol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caprylyl-glycol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 123 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/14231', CURRENT_DATE, '1117-86-8', 1, 'CID 14231, C8H18O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('cetrimonium-chloride', 'Cetrimonium Chloride', 'cetrimonium-chloride', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cetrimonium-chloride', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 117 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/8154', CURRENT_DATE, '112-02-7', 1, 'CID 8154, C19H42ClN')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('methylchloroisothiazolinone', 'Methylchloroisothiazolinone', 'methylchloroisothiazolinone', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('methylchloroisothiazolinone', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 111 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/33344', CURRENT_DATE, '26172-55-4', 1, 'CID 33344, C4H4ClNOS')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('butylene-glycol', 'Butylene Glycol', 'butylene-glycol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('butylene-glycol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 109 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/7896', CURRENT_DATE, '107-88-0', 1, 'CID 7896, C4H10O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('lactic-acid', 'Lactic Acid', 'lactic-acid', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lactic-acid', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 107 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/612', CURRENT_DATE, '50-21-5', 1, 'CID 612, C3H6O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('caprylic', 'Caprylic', 'caprylic', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('caprylic', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 104 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/2969', CURRENT_DATE, '334-48-5', 1, 'CID 2969, C10H20O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('capric-triglyceride', 'Capric Triglyceride', 'capric-triglyceride', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('capric-triglyceride', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 100 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/69310', CURRENT_DATE, '621-71-6', 1, 'CID 69310, C33H62O6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('alpha-isomethyl-ionone', 'Alpha Isomethyl Ionone', 'alpha-isomethyl-ionone', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('alpha-isomethyl-ionone', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 99 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/61073', CURRENT_DATE, '127-51-5', 1, 'CID 61073, C14H22O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('coumarin', 'Coumarin', 'coumarin', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('coumarin', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 97 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/323', CURRENT_DATE, '91-64-5', 1, 'CID 323, C9H6O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('behentrimonium-chloride', 'Behentrimonium Chloride', 'behentrimonium-chloride', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('behentrimonium-chloride', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 96 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/3014969', CURRENT_DATE, '17301-53-0', 1, 'CID 3014969, C25H54ClN')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('ci-19140', 'Ci 19140', 'ci-19140', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-19140', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 94 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/164825', CURRENT_DATE, '1934-21-0', 1, 'CID 164825, C16H9N4Na3O9S2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('dimethiconol', 'Dimethiconol', 'dimethiconol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dimethiconol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 87 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/14014', CURRENT_DATE, '1066-42-8', 1, 'CID 14014, C2H8O2Si')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-citrate', 'Sodium Citrate', 'sodium-citrate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-citrate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 87 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/6224', CURRENT_DATE, '68-04-2', 1, 'CID 6224, C6H5Na3O7')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('stearyl-alcohol', 'Stearyl Alcohol', 'stearyl-alcohol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('stearyl-alcohol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 87 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/8221', CURRENT_DATE, '112-92-5', 1, 'CID 8221, C18H38O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('coco-glucoside', 'Coco Glucoside', 'coco-glucoside', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('coco-glucoside', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 86 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/369373', CURRENT_DATE, '85618-22-0', 1, 'CID 369373, C18H36O6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('salicylic-acid', 'Salicylic Acid', 'salicylic-acid', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('salicylic-acid', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 83 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/338', CURRENT_DATE, '69-72-7', 1, 'CID 338, C7H6O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('niacinamide', 'Niacinamide', 'niacinamide', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('niacinamide', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 77 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/936', CURRENT_DATE, '98-92-0', 1, 'CID 936, C6H6N2O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('stearamidopropyl-dimethylamine', 'Stearamidopropyl Dimethylamine', 'stearamidopropyl-dimethylamine', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('stearamidopropyl-dimethylamine', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 73 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/62109', CURRENT_DATE, '7651-02-7', 1, 'CID 62109, C23H48N2O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('magnesium-nitrate', 'Magnesium Nitrate', 'magnesium-nitrate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('magnesium-nitrate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 71 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/25212', CURRENT_DATE, '10377-60-3', 1, 'CID 25212, MgN2O6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('citral', 'Citral', 'citral', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('citral', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 70 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/638011', CURRENT_DATE, '5392-40-5', 1, 'CID 638011, C10H16O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('ci-42090', 'Ci 42090', 'ci-42090', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-42090', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 69 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/17559', CURRENT_DATE, '2650-18-2', 1, 'CID 17559, C37H42N4O9S3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('propanediol', 'Propanediol', 'propanediol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('propanediol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 68 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/134919', CURRENT_DATE, '26264-14-2', 1, 'CID 134919, C3H8O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('stearic-acid', 'Stearic Acid', 'stearic-acid', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('stearic-acid', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 68 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/5281', CURRENT_DATE, '57-11-4', 1, 'CID 5281, C18H36O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('benzoic-acid', 'Benzoic Acid', 'benzoic-acid', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzoic-acid', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 66 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/243', CURRENT_DATE, '65-85-0', 1, 'CID 243, C7H6O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('isopropyl-alcohol', 'Isopropyl Alcohol', 'isopropyl-alcohol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('isopropyl-alcohol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 62 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/3776', CURRENT_DATE, '67-63-0', 1, 'CID 3776, C3H8O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('e490', 'e490', 'e490', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e490', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 62 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/1030', CURRENT_DATE, '57-55-6', 1, 'CID 1030, C3H8O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('ci-77891', 'Ci 77891', 'ci-77891', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-77891', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 60 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/26042', CURRENT_DATE, '13463-67-7', 1, 'CID 26042, O2Ti')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('shea', 'Shea', 'shea', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('shea', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 58 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/23053647', CURRENT_DATE, '173763-15-0', 1, 'CID 23053647, AlClH3O2+')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('e1519', 'e1519', 'e1519', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e1519', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 55 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/244', CURRENT_DATE, '100-51-6', 1, 'CID 244, C7H8O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('butylphenyl-methylpropional', 'Butylphenyl Methylpropional', 'butylphenyl-methylpropional', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('butylphenyl-methylpropional', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 54 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/228987', CURRENT_DATE, '80-54-6', 1, 'CID 228987, C14H20O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('tetrasodium-glutamate-diacetate', 'Tetrasodium Glutamate Diacetate', 'tetrasodium-glutamate-diacetate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tetrasodium-glutamate-diacetate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 52 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/44630158', CURRENT_DATE, '51981-21-6', 1, 'CID 44630158, C9H9NNa4O8')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('magnesium-chloride', 'Magnesium Chloride', 'magnesium-chloride', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('magnesium-chloride', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 51 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/5360315', CURRENT_DATE, '7786-30-3', 1, 'CID 5360315, Cl2Mg')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('isopropyl-myristate', 'Isopropyl Myristate', 'isopropyl-myristate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('isopropyl-myristate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 51 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/8042', CURRENT_DATE, '110-27-0', 1, 'CID 8042, C17H34O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('piroctone-olamine', 'Piroctone Olamine', 'piroctone-olamine', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('piroctone-olamine', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 49 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/50258', CURRENT_DATE, '68890-66-4', 1, 'CID 50258, C16H30N2O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('benzyl-benzoate', 'Benzyl Benzoate', 'benzyl-benzoate', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('benzyl-benzoate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 47 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/2345', CURRENT_DATE, '120-51-4', 1, 'CID 2345, C14H12O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('hydroxycitronellal', 'Hydroxycitronellal', 'hydroxycitronellal', '{}', '{}', NULL, NULL, true, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroxycitronellal', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 46 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/7888', CURRENT_DATE, '107-75-5', 1, 'CID 7888, C10H20O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('titanium-dioxide', 'Titanium Dioxide', 'titanium-dioxide', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('titanium-dioxide', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 45 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/26042', CURRENT_DATE, '13463-67-7', 1, 'CID 26042, O2Ti')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('menthol', 'Menthol', 'menthol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('menthol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/1254', CURRENT_DATE, '1490-04-6', 1, 'CID 1254, C10H20O')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-salicylate', 'Sodium Salicylate', 'sodium-salicylate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-salicylate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/16760658', CURRENT_DATE, '54-21-7', 1, 'CID 16760658, C7H5NaO3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('allantoin', 'Allantoin', 'allantoin', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('allantoin', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/204', CURRENT_DATE, '97-59-6', 1, 'CID 204, C4H6N4O3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-pca', 'Sodium Pca', 'sodium-pca', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-pca', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/23666346', CURRENT_DATE, '54571-67-4', 1, 'CID 23666346, C5H6NNaO3')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('mica', 'Mica', 'mica', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('mica', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/131842327', CURRENT_DATE, '12001-26-2', 1, 'CID 131842327, Al6F2H2K2O22Si6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('pentylene-glycol', 'Pentylene Glycol', 'pentylene-glycol', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('pentylene-glycol', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/93000', CURRENT_DATE, '5343-92-0', 1, 'CID 93000, C5H12O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('e211', 'e211', 'e211', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e211', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 44 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/517055', CURRENT_DATE, '532-32-1', 1, 'CID 517055, C7H5NaO2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-xylenesulfonate', 'Sodium Xylenesulfonate', 'sodium-xylenesulfonate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-xylenesulfonate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 43 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/23668192', CURRENT_DATE, '1300-72-7', 1, 'CID 23668192, C8H9NaO3S')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('histidine', 'Histidine', 'histidine', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('histidine', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 43 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/6274', CURRENT_DATE, '71-00-1', 1, 'CID 6274, C6H9N3O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('arginine', 'Arginine', 'arginine', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('arginine', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 43 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/6322', CURRENT_DATE, '74-79-3', 1, 'CID 6322, C6H14N4O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('lecithin', 'Lecithin', 'lecithin', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lecithin', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 43 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/16213884', CURRENT_DATE, '97281-47-5', 1, 'CID 16213884, C42H80NO8P')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('cyclopentasiloxane', 'Cyclopentasiloxane', 'cyclopentasiloxane', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('cyclopentasiloxane', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 42 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/10913', CURRENT_DATE, '541-02-6', 1, 'CID 10913, C10H30O5Si5')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('lauryl-glucoside', 'Lauryl Glucoside', 'lauryl-glucoside', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('lauryl-glucoside', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 41 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/10893439', CURRENT_DATE, '27836-64-2', 1, 'CID 10893439, C18H36O6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('ci-17200', 'Ci 17200', 'ci-17200', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('ci-17200', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 41 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/19116', CURRENT_DATE, '3567-66-6', 1, 'CID 19116, C16H11N3Na2O7S2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('hydroxyethylcellulose', 'Hydroxyethylcellulose', 'hydroxyethylcellulose', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('hydroxyethylcellulose', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 41 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/4327536', CURRENT_DATE, '9004-62-0', 1, 'CID 4327536, C36H70O19')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('decyl-glucoside', 'Decyl Glucoside', 'decyl-glucoside', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('decyl-glucoside', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 41 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/62142', CURRENT_DATE, '58846-77-8', 1, 'CID 62142, C16H32O6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('linalyl-acetate', 'Linalyl Acetate', 'linalyl-acetate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('linalyl-acetate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 39 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/8294', CURRENT_DATE, '115-95-7', 1, 'CID 8294, C12H20O2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium-lauryl-sulfate', 'Sodium Lauryl Sulfate', 'sodium-lauryl-sulfate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium-lauryl-sulfate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 39 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/3423265', CURRENT_DATE, '151-21-3', 1, 'CID 3423265, C12H25NaO4S')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('sodium', 'Sodium', 'sodium', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('sodium', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 39 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/5360545', CURRENT_DATE, '7440-23-5', 1, 'CID 5360545, Na')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('dehydroacetic-acid', 'Dehydroacetic Acid', 'dehydroacetic-acid', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('dehydroacetic-acid', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 38 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/122903', CURRENT_DATE, '520-45-6', 1, 'CID 122903, C8H8O4')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('disodium-etidronate', 'Disodium Etidronate', 'disodium-etidronate', '{}', '{}', NULL, NULL, false, 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('disodium-etidronate', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 38 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/23894', CURRENT_DATE, '7414-83-7', 1, 'CID 23894, C2H6Na2O7P2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('e415', 'e415', 'e415', '{}', '{}', NULL, NULL, false, 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('e415', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 48 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/131750926', CURRENT_DATE, NULL, 1, 'CID 131750926, C36H58O29P2')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;
INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_allergen_regulated, verification_status, updated_at)
VALUES ('vitamin-e', 'Vitamin E', 'vitamin-e', '{}', '{}', NULL, NULL, false, 'pending', NOW())
ON CONFLICT (id) DO UPDATE SET inci_name = EXCLUDED.inci_name, inci_name_normalized = EXCLUDED.inci_name_normalized, verification_status = EXCLUDED.verification_status, updated_at = NOW();
INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('vitamin-e', 'PubChem (NIH/NLM) — entité chimique résolue (CID, formule, CAS dans les synonymes). Présent sur 39 produit(s) cosmétique(s) échantillonnés (Open Beauty Facts).', 'https://pubchem.ncbi.nlm.nih.gov/compound/69540411', CURRENT_DATE, NULL, 1, 'CID 69540411, C33H54CaO6')
ON CONFLICT (ingredient_id, source_url) DO NOTHING;

-- 60 INCI non résolus en entité chimique (mélanges/extraits) :
-- Cocamidopropyl Betaine, Dimethicone, Guar Hydroxypropyltrimonium Chloride, Colorants, Polyquaternium, Butyrospermum Parkii Butter, Carbomer, Oil, Natural Extracts, Xanthan Gum, Sodium Hyaluronate, Helianthus Annuus Seed Oil, Polyquaternium 10, Cocos Nucifera Oil, e900, Cocamide Mea, Argania Spinosa Kernel Oil, Prunus Amygdalus Dulcis Oil, Glyceryl Oleate, Vegetal Oils, Laureth, Amodimethicone, Olea Europaea Fruit Oil, Sodium Palmate, Seed Oils, Leaf Extracts, Polyquaternium 7, Butyrospermum Parkii, Butter, Sodium Palm Kernelate, Paraffinum Liquidum, Coconut, Alcohol Denat, Simmondsia Chinensis Seed Oil, Acrylates, Cocos Nucifera, Sunflower, Sodium Cocoate, Tea Dodecylbenzenesulfonate, Polysorbate…
