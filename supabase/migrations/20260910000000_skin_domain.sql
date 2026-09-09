-- Phase 2 Infra — KURLA SKIN domaine peau
-- Ajoute 3 taxonomies : skin_type, skin_concern, skin_objective + 46 termes
-- Idempotent (ON CONFLICT)

-- 1. Taxonomies
INSERT INTO kurla_taxonomies (id, label, description) VALUES
  ('skin_type', 'Types de peau', 'Typologie de peau pour le diagnostic et les filtres peau'),
  ('skin_concern', 'Préoccupations peau', 'Préoccupations cutanées pour le moteur de reco peau'),
  ('skin_objective', 'Objectifs peau', 'Objectifs utilisateur pour la routine peau')
ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label, description=EXCLUDED.description;

-- 2. Types de peau (8)
INSERT INTO kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order) VALUES
  ('skin_type_normale', 'skin_type', 'normale', 'Normale', 'Normal', '["normale","equilibree"]'::jsonb, 1),
  ('skin_type_seche', 'skin_type', 'seche', 'Sèche', 'Dry', '["seche","tire","rugueuse"]'::jsonb, 2),
  ('skin_type_tres_seche', 'skin_type', 'tres_seche', 'Très sèche', 'Very dry', '["tres seche","very dry","squameuse"]'::jsonb, 3),
  ('skin_type_grasse', 'skin_type', 'grasse', 'Grasse', 'Oily', '["grasse","brillance","sebum","oily"]'::jsonb, 4),
  ('skin_type_mixte', 'skin_type', 'mixte', 'Mixte', 'Combination', '["mixte","zone T","combination"]'::jsonb, 5),
  ('skin_type_sensible', 'skin_type', 'sensible', 'Sensible', 'Sensitive', '["sensible","reactive","rougeur"]'::jsonb, 6),
  ('skin_type_deshydratee', 'skin_type', 'deshydratee', 'Déshydratée', 'Dehydrated', '["deshydratee","manque eau","dehydrated"]'::jsonb, 7),
  ('skin_type_mature', 'skin_type', 'mature', 'Mature', 'Mature', '["mature","rides","agee"]'::jsonb, 8)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, label_fr=EXCLUDED.label_fr, label_en=EXCLUDED.label_en, synonyms=EXCLUDED.synonyms, sort_order=EXCLUDED.sort_order;

-- 3. Préoccupations peau (17 — étape 5 diagnostic)
INSERT INTO kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order) VALUES
  ('skin_concern_secheresse', 'skin_concern', 'secheresse', 'Sécheresse / tiraillements', 'Dryness', '["secheresse","tiraillement","sec"]'::jsonb, 1),
  ('skin_concern_deshydratation', 'skin_concern', 'deshydratation', 'Déshydratation', 'Dehydration', '["deshydratation","manque eau"]'::jsonb, 2),
  ('skin_concern_teint_terne', 'skin_concern', 'teint_terne', 'Teint terne / manque d''éclat', 'Dullness', '["terne","eclat","lumineux"]'::jsonb, 3),
  ('skin_concern_taches', 'skin_concern', 'taches', 'Taches / hyperpigmentation', 'Dark spots', '["tache","hyperpigmentation","HPI","melasma"]'::jsonb, 4),
  ('skin_concern_rougeurs', 'skin_concern', 'rougeurs', 'Rougeurs / irritations', 'Redness', '["rougeur","irritation","sensible"]'::jsonb, 5),
  ('skin_concern_imperfections', 'skin_concern', 'imperfections', 'Imperfections / boutons', 'Blemishes', '["imperfection","bouton","acne","comedo"]'::jsonb, 6),
  ('skin_concern_points_noirs', 'skin_concern', 'points_noirs', 'Points noirs / pores dilatés', 'Blackheads', '["point noir","pore","comedo"]'::jsonb, 7),
  ('skin_concern_grain_irregulier', 'skin_concern', 'grain_irregulier', 'Grain de peau irrégulier', 'Uneven texture', '["grain","texture","rugueux"]'::jsonb, 8),
  ('skin_concern_cicatrices', 'skin_concern', 'cicatrices', 'Cicatrices post-acné', 'Scars', '["cicatrice","marque","acne scar"]'::jsonb, 9),
  ('skin_concern_rides', 'skin_concern', 'rides', 'Rides / ridules', 'Wrinkles', '["ride","ridule","age"]'::jsonb, 10),
  ('skin_concern_fermete', 'skin_concern', 'fermete', 'Perte de fermeté', 'Loss of firmness', '["fermete","relachement","firmness"]'::jsonb, 11),
  ('skin_concern_cernes', 'skin_concern', 'cernes', 'Cernes / poches', 'Dark circles', '["cerne","poche","eye"]'::jsonb, 12),
  ('skin_concern_levres', 'skin_concern', 'levres_seches', 'Lèvres sèches', 'Dry lips', '["levre","gercee","lips"]'::jsonb, 13),
  ('skin_concern_corps', 'skin_concern', 'peau_corps', 'Peau du corps', 'Body skin', '["corps","keratose","body"]'::jsonb, 14),
  ('skin_concern_spf', 'skin_concern', 'protection_solaire', 'Protection solaire', 'Sun protection', '["spf","solaire","uv"]'::jsonb, 15),
  ('skin_concern_sensibilite', 'skin_concern', 'sensibilite', 'Sensibilité / réactivité', 'Sensitivity', '["sensible","reactive"]'::jsonb, 16),
  ('skin_concern_teint_non_uniforme', 'skin_concern', 'teint_non_uniforme', 'Teint non uniforme', 'Uneven tone', '["uniforme","heterogene","teint"]'::jsonb, 17)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, label_fr=EXCLUDED.label_fr, label_en=EXCLUDED.label_en, synonyms=EXCLUDED.synonyms, sort_order=EXCLUDED.sort_order;

-- 4. Objectifs peau (12 — étape 6 diagnostic)
INSERT INTO kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order) VALUES
  ('skin_objective_hydrater', 'skin_objective', 'hydrater', 'Hydrater en profondeur', 'Deep hydration', '["hydrater","nourrir"]'::jsonb, 1),
  ('skin_objective_eclat', 'skin_objective', 'eclat', 'Retrouver de l''éclat', 'Glow', '["eclat","lumineux","radiance"]'::jsonb, 2),
  ('skin_objective_uniformiser', 'skin_objective', 'uniformiser', 'Uniformiser le teint', 'Even tone', '["uniformiser","tache","hyperpigmentation"]'::jsonb, 3),
  ('skin_objective_attenuer_taches', 'skin_objective', 'attenuer_taches', 'Atténuer les taches', 'Fade spots', '["tache","hyperpigmentation"]'::jsonb, 4),
  ('skin_objective_apaiser', 'skin_objective', 'apaiser', 'Apaiser la peau', 'Soothe', '["apaiser","calmer","rougeur"]'::jsonb, 5),
  ('skin_objective_imperfections', 'skin_objective', 'reduire_imperfections', 'Réduire les imperfections', 'Clear blemishes', '["imperfection","bouton"]'::jsonb, 6),
  ('skin_objective_grain', 'skin_objective', 'affiner_grain', 'Affiner le grain de peau', 'Refine texture', '["grain","texture","pore"]'::jsonb, 7),
  ('skin_objective_barriere', 'skin_objective', 'renforcer_barriere', 'Renforcer la barrière', 'Strengthen barrier', '["barriere","ceramide"]'::jsonb, 8),
  ('skin_objective_spf', 'skin_objective', 'proteger_spf', 'Protéger du soleil/pollution', 'Protect', '["spf","pollution","uv"]'::jsonb, 9),
  ('skin_objective_anti_age', 'skin_objective', 'prevenir_age', 'Prévenir les signes de l''âge', 'Anti-aging', '["age","ride","anti-age"]'::jsonb, 10),
  ('skin_objective_simplifier', 'skin_objective', 'simplifier', 'Simplifier la routine', 'Simplify', '["simple","minimaliste"]'::jsonb, 11),
  ('skin_objective_carnation', 'skin_objective', 'carnation', 'Produits adaptés à ma carnation', 'Shade match', '["carnation","teinte","melanine"]'::jsonb, 12)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, label_fr=EXCLUDED.label_fr, label_en=EXCLUDED.label_en, synonyms=EXCLUDED.synonyms, sort_order=EXCLUDED.sort_order;
