-- ============================================================
-- SEED DU GRAPHE DE CONNAISSANCES — INGREDIENTS
--
-- Pourquoi ce seed existe : le graphe (chantier 2) était créé mais vide, donc
-- la fiche ingrédient publique (`/ingredient/:id`, route publique et indexable)
-- ne servait rien et le sitemap ne pouvait lister aucune entité. Sans données,
-- l'action 37 et le critère de sortie « page ingrédient indexable » restaient
-- lettre morte.
--
-- Principe de prudence : uniquement des faits cosmétiques établis, des niveaux
-- de preuve honnêtes (A/B), source_kind 'consensus' ou 'regulatory', AUCUNE
-- URL ni référence inventée, AUCUNE statistique fabriquée. Les lignes
-- `ingredient_archetype_outcomes` (résultats mesurés) ne sont PAS seedées :
-- elles doivent provenir de retours réels, jamais d'une invention.
--
-- Idempotence : ingredients en ON CONFLICT DO NOTHING ; evidence et
-- jurisdictions remplacées pour les ids seedés (ce sont des lignes de seed).
-- ============================================================

BEGIN;

INSERT INTO public.ingredients
  (id, inci_name, inci_name_normalized, common_names, functions, family, origin,
   is_fragrance, is_allergen_regulated, comedogenicity_index,
   max_concentration_eu_percent, description, verification_status)
VALUES
  ('glycerin','Glycerin','glycerin', ARRAY['glycérine'], ARRAY['humectant'],
   'polyols','végétal ou synthèse', false, false, NULL, NULL,
   'Humectant de référence : attire et retient l’eau dans la couche cornée.', 'verified'),
  ('shea-butter','Butyrospermum Parkii (Shea) Butter','butyrospermum parkii shea butter',
   ARRAY['beurre de karité'], ARRAY['émollient','occlusif'], 'beurres végétaux','végétal',
   false, false, 0, NULL,
   'Beurre végétal émollient et occlusif, adapté aux cheveux et peaux très secs.', 'verified'),
  ('coconut-oil','Cocos Nucifera (Coconut) Oil','cocos nucifera coconut oil',
   ARRAY['huile de coco'], ARRAY['émollient','occlusif'], 'huiles végétales','végétal',
   false, false, 4, NULL,
   'Huile émolliente à indice comédogène élevé : à éviter sur peau à tendance acnéique.', 'verified'),
  ('niacinamide','Niacinamide','niacinamide', ARRAY['vitamine B3'], ARRAY['humectant','apaisant','barrière'],
   'vitamines','synthèse', false, false, NULL, NULL,
   'Forme de vitamine B3 soutenant la fonction barrière et l’uniformité du teint.', 'verified'),
  ('panthenol','Panthenol','panthenol', ARRAY['provitamine B5'], ARRAY['humectant','apaisant'],
   'vitamines','synthèse', false, false, NULL, NULL,
   'ProvITamine B5 humectante et apaisante, améliore le confort cutané.', 'verified'),
  ('squalane','Squalane','squalane', ARRAY['squalane'], ARRAY['émollient'],
   'lipides','végétal ou synthèse', false, false, 1, NULL,
   'Emollient léger proche des lipides cutanés, peu comédogène.', 'verified'),
  ('ceramide-np','Ceramide NP','ceramide np', ARRAY['céramide NP'], ARRAY['barrière','émollient'],
   'lipides','synthèse', false, false, NULL, NULL,
   'Céramide identique à la peau, complète les lipides de la barrière.', 'verified'),
  ('salicylic-acid','Salicylic Acid','salicylic acid', ARRAY['BHA'], ARRAY['kératolytique','exfoliant'],
   'acides','synthèse', false, false, NULL, 2.0,
   'Bêta-hydroxyacide kératolytique : désobstrue et lisse le grain de peau.', 'verified'),
  ('retinol','Retinol','retinol', ARRAY['vitamine A'], ARRAY['rénovateur cellulaire'],
   'rétinoïdes','synthèse', false, false, NULL, 0.3,
   'Rétinoïde à concentration encadrée dans l’UE ; introduction progressive conseillée.', 'verified'),
  ('ascorbic-acid','Ascorbic Acid','ascorbic acid', ARRAY['vitamine C'], ARRAY['antioxydant'],
   'vitamines','synthèse', false, false, NULL, NULL,
   'Vitamine C antioxydante, sensible à l’oxydation : la formulation fait la différence.', 'verified'),
  ('zinc-oxide','Zinc Oxide','zinc oxide', ARRAY['oxyde de zinc'], ARRAY['filtre UV minéral','apaisant'],
   'minéraux','minéral', false, false, NULL, NULL,
   'Filtre UV minéral à large spectre, bien toléré par les peaux sensibles.', 'verified'),
  ('hydroquinone','Hydroquinone','hydroquinone', ARRAY['hydroquinone'], ARRAY['dépigmentant'],
   'dépigmentants','synthèse', false, false, NULL, NULL,
   'Agent dépigmentant interdit en cosmétique dans l’UE ; réservé au cadre médical.', 'verified'),
  ('parfum','Parfum (Fragrance)','parfum fragrance', ARRAY['parfum','fragrance'], ARRAY['parfum'],
   'parfums','divers', true, true, NULL, NULL,
   'Aucun bénéfice soin ; première cause d’allergie de contact déclarée. Les 26 allergènes à déclaration obligatoire s’appliquent.', 'verified')
ON CONFLICT (id) DO NOTHING;

-- Preuves : remplacées pour les ids seedés (lignes de seed, pas de mesure réelle).
DELETE FROM public.ingredient_evidence WHERE ingredient_id IN
  ('glycerin','shea-butter','coconut-oil','niacinamide','panthenol','squalane','ceramide-np',
   'salicylic-acid','retinol','ascorbic-acid','zinc-oxide','hydroquinone','parfum');

INSERT INTO public.ingredient_evidence
  (ingredient_id, claim, evidence_level, populations_studied, texture_scope, tone_scope, climate_scope, source_kind)
VALUES
  ('glycerin','Attire et retient l’eau dans la couche cornée : humectant établi.','A','{}','{}','{}','{}','consensus'),
  ('shea-butter','Emollient et occlusif : réduit la perte insensible en eau.','B','{}','{}','{}','{}','consensus'),
  ('coconut-oil','Emollient occlusif à indice comédogène élevé.','B','{}','{}','{}','{}','consensus'),
  ('niacinamide','Soutient la fonction barrière et l’aspect uniforme du teint.','B','{}','{}','{}','{}','consensus'),
  ('panthenol','Humectant et apaisant, améliore la sensation de confort.','B','{}','{}','{}','{}','consensus'),
  ('squalane','Emollient léger proche des lipides cutanés.','B','{}','{}','{}','{}','consensus'),
  ('ceramide-np','Complète les lipides intercornéocytaires de la barrière.','B','{}','{}','{}','{}','consensus'),
  ('salicylic-acid','Kératolytique : désobstrue le pore et lisse le grain de peau.','A','{}','{}','{}','{}','consensus'),
  ('retinol','Rétinoïde : renouvellement cellulaire ; concentration encadrée dans l’UE.','A','{}','{}','{}','{}','consensus'),
  ('ascorbic-acid','Antioxydant ; efficacité dépendante de la stabilité de la formule.','B','{}','{}','{}','{}','consensus'),
  ('zinc-oxide','Filtre UV minéral à large spectre, bien toléré.','A','{}','{}','{}','{}','regulatory'),
  ('hydroquinone','Agent dépigmentant ; interdit en cosmétique dans l’UE.','A','{}','{}','{}','{}','regulatory'),
  ('parfum','Aucun bénéfice soin ; principale cause d’allergie de contact déclarée.','B','{}','{}','{}','{}','consensus');

-- Restrictions juridictionnelles réelles (références réglementaires publiques).
DELETE FROM public.ingredient_jurisdiction_restrictions WHERE ingredient_id IN
  ('salicylic-acid','retinol','hydroquinone');

INSERT INTO public.ingredient_jurisdiction_restrictions
  (ingredient_id, jurisdiction, status, limit_percent, reference)
VALUES
  ('salicylic-acid','EU','restricted',2.0,'Règlement (CE) n°1223/2009, annexe III'),
  ('retinol','EU','restricted',0.3,'Règlement (CE) n°1223/2009, annexe III'),
  ('hydroquinone','EU','prohibited',NULL,'Règlement (CE) n°1223/2009, annexe II');

COMMIT;
