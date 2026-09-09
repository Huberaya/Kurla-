-- C5 P1 — 7 ingrédients peau manquants pour atteindre 15 fiches peau (A/B/C)
-- Remplit le graphe CosIng : chaque fiche peau a sa ligne ingredients + evidence + toneScope V-VI.
-- Idempotent : ON CONFLICT (id) DO NOTHING pour ingredients, DELETE+INSERT pour evidence.

BEGIN;

INSERT INTO public.ingredients
  (id, inci_name, inci_name_normalized, common_names, functions, family, origin, is_fragrance, is_allergen_regulated, comedogenicity_index, max_concentration_eu_percent, description, verification_status)
VALUES
  ('azelaic-acid','Azelaic Acid','azelaic acid', ARRAY['acide azélaïque'], ARRAY['kératolytique','apaisant','antibactérien'], 'acides dicarboxyliques','synthèse (orge)', false, false, 0, NULL,
   'Acide dicarboxylique : taches + imperfections, bien toléré sur phototypes foncés, sans phototoxicité.', 'verified'),
  ('glycolic-acid','Glycolic Acid','glycolic acid', ARRAY['acide glycolique','AHA'], ARRAY['exfoliant','kératolytique'], 'AHA','synthèse', false, false, NULL, NULL,
   'Plus petit AHA : exfoliation de surface, affine le grain. 1–2×/sem max, SPF le lendemain.', 'verified'),
  ('lactic-acid','Lactic Acid','lactic acid', ARRAY['acide lactique','AHA doux'], ARRAY['exfoliant doux','humectant'], 'AHA','fermentation', false, false, NULL, NULL,
   'AHA doux : meilleure tolérance que glycolique, option sensible, humectant en plus.', 'verified'),
  ('hyaluronic-acid','Hyaluronic Acid','hyaluronic acid', ARRAY['acide hyaluronique','sodium hyaluronate'], ARRAY['humectant','repulpant'], 'glycosaminoglycanes','fermentation', false, false, 0, NULL,
   'Humectant repulpant : retient l’eau en surface, à appliquer sur peau encore humide puis sceller.', 'verified'),
  ('allantoin','Allantoin','allantoin', ARRAY['allantoïne'], ARRAY['apaisant','kératolytique doux'], 'purines','consoude / synthèse', false, false, 0, NULL,
   'Apaisant légèrement kératolytique : lisse sans décaper, idéale sensible.', 'verified'),
  ('centella-asiatica','Centella Asiatica Extract','centella asiatica extract', ARRAY['centella','cica','madécassoside'], ARRAY['apaisant','réparateur'], 'extraits végétaux','centella asiatica', false, false, 0, NULL,
   'Plante réparatrice (madécassoside) : apaise et soutient la barrière des peaux réactives.', 'verified'),
  ('tocopherol','Tocopherol','tocopherol', ARRAY['vitamine E'], ARRAY['antioxydant','émollient'], 'vitamines','végétal', false, false, 0, NULL,
   'Vitamine E antioxydante lipophile : stabilise les huiles, synergie vitamine C.', 'verified')
ON CONFLICT (id) DO NOTHING;

-- Preuves peau — tone_scope V-VI explicite pour HPI, texture_scope sensible quand pertinent
DELETE FROM public.ingredient_evidence WHERE ingredient_id IN ('azelaic-acid','glycolic-acid','lactic-acid','hyaluronic-acid','allantoin','centella-asiatica','tocopherol');

INSERT INTO public.ingredient_evidence
  (ingredient_id, claim, evidence_level, populations_studied, texture_scope, tone_scope, climate_scope, source_kind)
VALUES
  ('azelaic-acid','Aide à atténuer l’aspect des taches et des rougeurs sur peaux sujettes aux imperfections.','B', ARRAY['peaux IV–VI, HPI'], ARRAY['mixte','grasse'], ARRAY['IV','V','VI'], ARRAY[]::TEXT[], 'consensus'),
  ('glycolic-acid','Kératolytique : lisse le grain de peau par desquamation maîtrisée (petit AHA).','A', ARRAY[]::TEXT[], ARRAY['mixte','grasse'], ARRAY['III','IV','V','VI'], ARRAY[]::TEXT[], 'consensus'),
  ('lactic-acid','Exfoliant doux : améliore la sensation de grain régulier avec meilleure tolérance.','B', ARRAY['peaux sensibles'], ARRAY['sensible','sèche'], ARRAY['IV','V','VI'], ARRAY[]::TEXT[], 'consensus'),
  ('hyaluronic-acid','Humectant : améliore la sensation immédiate d’hydratation et de repulpé.','B', ARRAY[]::TEXT[], ARRAY['deshydratee','mixte','sèche'], ARRAY['I','II','III','IV','V','VI'], ARRAY[]::TEXT[], 'consensus'),
  ('allantoin','Apaisante : réduit la sensation d’inconfort et favorise l’aspect lisse.','B', ARRAY['peaux sensibles V–VI'], ARRAY['sensible'], ARRAY['IV','V','VI'], ARRAY[]::TEXT[], 'consensus'),
  ('centella-asiatica','Apaisante et réparatrice : soutient le confort des peaux réactives.','B', ARRAY['peaux réactives V–VI'], ARRAY['sensible','mixte'], ARRAY['IV','V','VI'], ARRAY[]::TEXT[], 'consensus'),
  ('tocopherol','Antioxydant lipophile complémentaire de la vitamine C (synergie).','B', ARRAY[]::TEXT[], ARRAY['sèche','mixte'], ARRAY['I','II','III','IV','V','VI'], ARRAY[]::TEXT[], 'consensus');

-- Restrictions UE (glycolic/lactic = AHA sans limite cosmétique fixe, mais on documente bonne pratique ; salicylic/retinol déjà seedés)
-- Aucune restriction UE spécifique pour ces 7, mais on rappelle que la conformité reste fabricant.

COMMIT;
