-- ============================================================
-- TOCOPHÉROL — entité vérifiée (niveau 1)
--
-- Ajoutée pour résoudre la mention « Vitamine E » déclarée sur p5 et p6.
-- PubChem CID 14986 : l'INCI « Tocopherol » figure littéralement dans la
-- liste de synonymes et le numéro CAS 1406-66-2 est publié → niveau 1,
-- `verification_status = 'verified'`. Consulté le 2026-08-29.
--
-- Deux entités candidates ont été ÉCARTÉES, conformément à la règle du
-- lot 1 (« aucune source n'a confirmé l'identité → pas d'insertion ») :
--   · Sodium Hyaluronate  → PubChem 404 (y compris « Hyaluronic acid »
--     et « Sodium hyaluronan »). CosIng n'a aucun endpoint exploitable.
--   · Hydrolyzed Vegetable Protein → PubChem 404 (mélange, pas une
--     entité chimique unique).
-- Les produits qui les déclarent (p1, p3) restent donc bloqués : créer
-- ces lignes sans source serait une affirmation sans preuve.
--
-- Le nom usuel « vitamine E » n'est PAS rattaché à cette entité : il
-- désigne aussi bien Tocopherol que Tocopheryl Acetate, et lever cette
-- ambiguïté par un alias serait exactement ce que la règle interdit.
-- Les fiches sont réécrites en « Tocophérol ».
-- ============================================================

INSERT INTO public.ingredients (id, inci_name, inci_name_normalized, common_names, functions, family, origin, verification_status, updated_at)
VALUES ('tocopherol', 'Tocopherol', 'tocopherol', ARRAY['tocophérol'], '{}', 'vitamines', 'végétal ou synthèse', 'verified', NOW())
ON CONFLICT (id) DO UPDATE SET
  inci_name = EXCLUDED.inci_name,
  inci_name_normalized = EXCLUDED.inci_name_normalized,
  common_names = EXCLUDED.common_names,
  family = EXCLUDED.family,
  origin = EXCLUDED.origin,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();

INSERT INTO public.ingredient_provenance (ingredient_id, source_label, source_url, retrieved_at, cas_number, evidence_tier, note)
VALUES ('tocopherol', 'PubChem (NIH/NLM) — INCI présent dans la liste de synonymes, numéro CAS publié', 'https://pubchem.ncbi.nlm.nih.gov/compound/14986', '2026-08-29', '1406-66-2', 1, 'INCI vérifié : Tocopherol')
ON CONFLICT (ingredient_id, source_url) DO UPDATE SET retrieved_at = EXCLUDED.retrieved_at, cas_number = EXCLUDED.cas_number, note = EXCLUDED.note;
