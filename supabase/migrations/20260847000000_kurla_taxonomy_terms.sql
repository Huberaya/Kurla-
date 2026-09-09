-- ============================================================
-- CHANTIER A — Vocabulaires contrôlés (action 6 / fonctionnalité 2)
--
-- Les tables `kurla_taxonomies` et `kurla_taxonomy_terms` existaient depuis la
-- migration 20260845, mais avec ZÉRO ligne : la structure était là, le
-- vocabulaire non. Sans données de référence, `concerns`, `hair_types` et
-- `needs` restent des chaînes libres non agrégeables — donc aucune statistique
-- par besoin, aucune recherche sémantique fiable, aucun rapport B2B possible.
--
-- Cette migration ne crée aucune table : elle remplit celles qui existent,
-- avec les valeurs RÉELLEMENT utilisées dans le code (`kurlaFit.ts`,
-- `semanticSearch.ts`, `shelf.ts`) et dans le seed produits. Aucun terme
-- n'est inventé.
-- ============================================================

-- ------------------------------------------------------------
-- 1. TAXONOMIES
-- ------------------------------------------------------------

INSERT INTO public.kurla_taxonomies (id, label, description) VALUES
  ('need',           'Besoins',        'Le besoin que le produit doit couvrir. Clé du moteur de recommandation.'),
  ('texture',        'Textures',       'Classification de la fibre capillaire.'),
  ('routine_step',   'Étapes',         'Position dans la routine. Détermine les doublons et les trous.'),
  ('market',         'Marchés',        'Juridictions de commercialisation, base du filtrage réglementaire.'),
  ('tone_depth',     'Profondeurs de ton', 'Profondeur de mélanine, sans jugement de valeur.'),
  ('skin_type',      'Types de peau',      'Typologie de peau pour le diagnostic et les filtres peau.'),
  ('skin_concern',   'Préoccupations peau', 'Préoccupations cutanées pour le moteur de reco peau.'),
  ('skin_objective', 'Objectifs peau',     'Objectifs utilisateur pour la routine peau.')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- ------------------------------------------------------------
-- 2. BESOINS — union exacte de kurlaFit.ts et semanticSearch.ts
-- ------------------------------------------------------------
-- Note de gouvernance : `cuir_chevelu` et `apaiser_cuir_chevelu` désignent le
-- même besoin sous deux codes. Les deux sont conservés pour ne casser ni le
-- moteur ni la recherche, mais `apaiser_cuir_chevelu` est marqué synonyme du
-- premier. C'est exactement le genre de dérive que le vocabulaire contrôlé
-- doit rendre visible plutôt que masquer.

INSERT INTO public.kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order) VALUES
  ('need_hydrater_cheveux',        'need', 'hydrater_cheveux',        'Hydrater les cheveux',            'Moisturise hair',           ARRAY['sec','sèche','déshydraté','moisture','dry'], 1),
  ('need_reduire_casse',           'need', 'reduire_casse',           'Réduire la casse',                'Reduce breakage',           ARRAY['casse','fragile','breakage'], 2),
  ('need_definir_boucles',         'need', 'definir_boucles',         'Définir les boucles',             'Define curls',              ARRAY['boucles','définition','curl'], 3),
  ('need_reduire_frisottis',       'need', 'reduire_frisottis',       'Réduire les frisottis',           'Reduce frizz',              ARRAY['frisottis','frizz'], 4),
  ('need_cuir_chevelu',            'need', 'cuir_chevelu',            'Soin du cuir chevelu',            'Scalp care',                ARRAY['cuir chevelu','démangeaison','pellicule','scalp'], 5),
  ('need_apaiser_cuir_chevelu',    'need', 'apaiser_cuir_chevelu',    'Apaiser le cuir chevelu',         'Soothe scalp',              ARRAY['apaiser','irritation','sensitive scalp'], 6),
  ('need_proteger_chaleur',        'need', 'proteger_chaleur',        'Protéger de la chaleur',          'Heat protection',           ARRAY['thermoprotecteur','heat'], 7),
  ('need_proteger_nuit',           'need', 'proteger_nuit',           'Protéger la nuit',                'Night protection',          ARRAY['bonnet','satin','night'], 8),
  ('need_entretenir_tresses',      'need', 'entretenir_tresses',      'Entretenir les tresses',          'Maintain braids',           ARRAY['tresses','braids','knotless'], 9),
  ('need_entretenir_locks',        'need', 'entretenir_locks',        'Entretenir les locks',            'Maintain locs',             ARRAY['locks','dreadlocks','locs'], 10),
  ('need_entretenir_perruque',     'need', 'entretenir_perruque',     'Entretenir la perruque',          'Maintain wig',              ARRAY['perruque','wig','lace'], 11),
  ('need_hydrater_peau',           'need', 'hydrater_peau',           'Hydrater la peau',                'Moisturise skin',           ARRAY['hydratation','peau sèche'], 12),
  ('need_peau_sensible',           'need', 'peau_sensible',           'Peau sensible',                   'Sensitive skin',            ARRAY['sensible','réactive','sensitive'], 13),
  ('need_imperfections_acne',      'need', 'imperfections_acne',      'Imperfections et acné',           'Blemishes and acne',        ARRAY['acné','bouton','imperfection'], 14),
  ('need_taches_hyperpigmentation','need', 'taches_hyperpigmentation','Taches et hyperpigmentation',     'Dark spots',                ARRAY['taches','hyperpigmentation','mélasma'], 15),
  ('need_protection_solaire',      'need', 'protection_solaire',      'Protection solaire',              'Sun protection',            ARRAY['spf','soleil','uv'], 16)
ON CONFLICT (id) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  synonyms = EXCLUDED.synonyms,
  sort_order = EXCLUDED.sort_order;

-- Synonymie explicite entre les deux codes concurrents.
UPDATE public.kurla_taxonomy_terms
   SET parent_term_id = 'need_cuir_chevelu'
 WHERE id = 'need_apaiser_cuir_chevelu';

-- ------------------------------------------------------------
-- 3. TEXTURES — valeurs réelles du seed produits
-- ------------------------------------------------------------

INSERT INTO public.kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, sort_order) VALUES
  ('texture_3a', 'texture', '3A', 'Boucles larges 3A',  'Type 3A loose curls',    1),
  ('texture_3b', 'texture', '3B', 'Boucles 3B',         'Type 3B curls',          2),
  ('texture_3c', 'texture', '3C', 'Boucles serrées 3C', 'Type 3C tight curls',    3),
  ('texture_4a', 'texture', '4A', 'Crépus 4A',          'Type 4A coily',          4),
  ('texture_4b', 'texture', '4B', 'Crépus 4B',          'Type 4B coily',          5),
  ('texture_4c', 'texture', '4C', 'Crépus 4C',          'Type 4C coily',          6)
ON CONFLICT (id) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 4. ÉTAPES DE ROUTINE — ROUTINE_STEPS de shelf.ts, sans 'other'
-- ------------------------------------------------------------
-- 'other' est volontairement exclu : un vocabulaire contrôlé qui contient une
-- case « autre » non contrainte redevient une chaîne libre.

INSERT INTO public.kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, sort_order) VALUES
  ('step_cleanse',           'routine_step', 'cleanse',           'Shampooing',                 'Cleanse',           1),
  ('step_condition',         'routine_step', 'condition',         'Après-shampooing',           'Condition',         2),
  ('step_deep_condition',    'routine_step', 'deep_condition',    'Masque / soin profond',      'Deep condition',    3),
  ('step_protein_treatment', 'routine_step', 'protein_treatment', 'Soin protéiné',              'Protein treatment', 4),
  ('step_leave_in',          'routine_step', 'leave_in',          'Leave-in',                   'Leave-in',          5),
  ('step_seal_oil',          'routine_step', 'seal_oil',          'Scellement à l’huile',       'Seal with oil',     6),
  ('step_styling_definer',   'routine_step', 'styling_definer',   'Définissant / coiffage',     'Styling definer',   7),
  ('step_scalp_treatment',   'routine_step', 'scalp_treatment',   'Soin du cuir chevelu',       'Scalp treatment',   8),
  ('step_skin_cleanser',     'routine_step', 'skin_cleanser',     'Nettoyant visage',           'Skin cleanser',     9),
  ('step_skin_treatment',    'routine_step', 'skin_treatment',    'Soin visage',                'Skin treatment',   10),
  ('step_skin_moisturizer',  'routine_step', 'skin_moisturizer',  'Hydratant visage',           'Skin moisturizer', 11),
  ('step_skin_spf',          'routine_step', 'skin_spf',          'Protection solaire visage',  'Skin SPF',         12)
ON CONFLICT (id) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 5. MARCHÉS — union de country_availability (schema + seed)
-- ------------------------------------------------------------

INSERT INTO public.kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, sort_order) VALUES
  ('market_fr',  'market', 'FR',  'France',                'France',        1),
  ('market_be',  'market', 'BE',  'Belgique',              'Belgium',       2),
  ('market_ch',  'market', 'CH',  'Suisse',                'Switzerland',   3),
  ('market_ca',  'market', 'CA',  'Canada',                'Canada',        4),
  ('market_ci',  'market', 'CI',  'Côte d’Ivoire',         'Ivory Coast',   5),
  ('market_sn',  'market', 'SN',  'Sénégal',               'Senegal',       6),
  ('market_dom', 'market', 'DOM', 'Outre-mer français',    'French overseas territories', 7),
  ('market_afr', 'market', 'AFR', 'Afrique subsaharienne', 'Sub-Saharan Africa', 8),
  ('market_int', 'market', 'INT', 'International',         'International', 9),
  ('need_demeler_cheveux', 'need', 'demeler_cheveux', 'Démêler les cheveux', 'Detangle hair', ARRAY['démêler', 'demeler', 'démêlage', 'nœud', 'detangle'], 12),
  ('need_barbe', 'need', 'barbe', 'Barbe & grooming homme', 'Beard & grooming', ARRAY['barbe', 'grooming', 'homme', 'beard', 'waves', 'durag'], 13),
  ('skin_type_normale', 'skin_type', 'normale', 'Normale', 'Normal', ARRAY['normale', 'equilibree'], 1),
  ('skin_type_seche', 'skin_type', 'seche', 'Sèche', 'Dry', ARRAY['seche', 'tire', 'rugueuse'], 2),
  ('skin_type_tres_seche', 'skin_type', 'tres_seche', 'Très sèche', 'Very dry', ARRAY['tres seche', 'very dry', 'squameuse'], 3),
  ('skin_type_grasse', 'skin_type', 'grasse', 'Grasse', 'Oily', ARRAY['grasse', 'brillance', 'sebum', 'oily'], 4),
  ('skin_type_mixte', 'skin_type', 'mixte', 'Mixte', 'Combination', ARRAY['mixte', 'zone T', 'combination'], 5),
  ('skin_type_sensible', 'skin_type', 'sensible', 'Sensible', 'Sensitive', ARRAY['sensible', 'reactive', 'rougeur'], 6),
  ('skin_type_deshydratee', 'skin_type', 'deshydratee', 'Déshydratée', 'Dehydrated', ARRAY['deshydratee', 'manque eau', 'dehydrated'], 7),
  ('skin_type_mature', 'skin_type', 'mature', 'Mature', 'Mature', ARRAY['mature', 'rides', 'agee'], 8),
  ('skin_concern_secheresse', 'skin_concern', 'secheresse', 'Sécheresse / tiraillements', 'Dryness', ARRAY['secheresse', 'tiraillement', 'sec'], 1),
  ('skin_concern_deshydratation', 'skin_concern', 'deshydratation', 'Déshydratation', 'Dehydration', ARRAY['deshydratation', 'manque eau'], 2),
  ('skin_concern_teint_terne', 'skin_concern', 'teint_terne', 'Teint terne / manque d''éclat', 'Dullness', ARRAY['terne', 'eclat', 'lumineux'], 3),
  ('skin_concern_taches', 'skin_concern', 'taches', 'Taches / hyperpigmentation', 'Dark spots', ARRAY['tache', 'hyperpigmentation', 'HPI', 'melasma'], 4),
  ('skin_concern_rougeurs', 'skin_concern', 'rougeurs', 'Rougeurs / irritations', 'Redness', ARRAY['rougeur', 'irritation', 'sensible'], 5),
  ('skin_concern_imperfections', 'skin_concern', 'imperfections', 'Imperfections / boutons', 'Blemishes', ARRAY['imperfection', 'bouton', 'acne', 'comedo'], 6),
  ('skin_concern_points_noirs', 'skin_concern', 'points_noirs', 'Points noirs / pores dilatés', 'Blackheads', ARRAY['point noir', 'pore', 'comedo'], 7),
  ('skin_concern_grain_irregulier', 'skin_concern', 'grain_irregulier', 'Grain de peau irrégulier', 'Uneven texture', ARRAY['grain', 'texture', 'rugueux'], 8),
  ('skin_concern_cicatrices', 'skin_concern', 'cicatrices', 'Cicatrices post-acné', 'Scars', ARRAY['cicatrice', 'marque', 'acne scar'], 9),
  ('skin_concern_rides', 'skin_concern', 'rides', 'Rides / ridules', 'Wrinkles', ARRAY['ride', 'ridule', 'age'], 10),
  ('skin_concern_fermete', 'skin_concern', 'fermete', 'Perte de fermeté', 'Loss of firmness', ARRAY['fermete', 'relachement', 'firmness'], 11),
  ('skin_concern_cernes', 'skin_concern', 'cernes', 'Cernes / poches', 'Dark circles', ARRAY['cerne', 'poche', 'eye'], 12),
  ('skin_concern_levres', 'skin_concern', 'levres_seches', 'Lèvres sèches', 'Dry lips', ARRAY['levre', 'gercee', 'lips'], 13),
  ('skin_concern_corps', 'skin_concern', 'peau_corps', 'Peau du corps', 'Body skin', ARRAY['corps', 'keratose', 'body'], 14),
  ('skin_concern_spf', 'skin_concern', 'protection_solaire', 'Protection solaire', 'Sun protection', ARRAY['spf', 'solaire', 'uv'], 15),
  ('skin_concern_sensibilite', 'skin_concern', 'sensibilite', 'Sensibilité / réactivité', 'Sensitivity', ARRAY['sensible', 'reactive'], 16),
  ('skin_concern_teint_non_uniforme', 'skin_concern', 'teint_non_uniforme', 'Teint non uniforme', 'Uneven tone', ARRAY['uniforme', 'heterogene', 'teint'], 17),
  ('skin_objective_hydrater', 'skin_objective', 'hydrater', 'Hydrater en profondeur', 'Deep hydration', ARRAY['hydrater', 'nourrir'], 1),
  ('skin_objective_eclat', 'skin_objective', 'eclat', 'Retrouver de l''éclat', 'Glow', ARRAY['eclat', 'lumineux', 'radiance'], 2),
  ('skin_objective_uniformiser', 'skin_objective', 'uniformiser', 'Uniformiser le teint', 'Even tone', ARRAY['uniformiser', 'tache', 'hyperpigmentation'], 3),
  ('skin_objective_attenuer_taches', 'skin_objective', 'attenuer_taches', 'Atténuer les taches', 'Fade spots', ARRAY['tache', 'hyperpigmentation'], 4),
  ('skin_objective_apaiser', 'skin_objective', 'apaiser', 'Apaiser la peau', 'Soothe', ARRAY['apaiser', 'calmer', 'rougeur'], 5),
  ('skin_objective_imperfections', 'skin_objective', 'reduire_imperfections', 'Réduire les imperfections', 'Clear blemishes', ARRAY['imperfection', 'bouton'], 6),
  ('skin_objective_grain', 'skin_objective', 'affiner_grain', 'Affiner le grain de peau', 'Refine texture', ARRAY['grain', 'texture', 'pore'], 7),
  ('skin_objective_barriere', 'skin_objective', 'renforcer_barriere', 'Renforcer la barrière', 'Strengthen barrier', ARRAY['barriere', 'ceramide'], 8),
  ('skin_objective_spf', 'skin_objective', 'proteger_spf', 'Protéger du soleil/pollution', 'Protect', ARRAY['spf', 'pollution', 'uv'], 9),
  ('skin_objective_anti_age', 'skin_objective', 'prevenir_age', 'Prévenir les signes de l''âge', 'Anti-aging', ARRAY['age', 'ride', 'anti-age'], 10),
  ('skin_objective_simplifier', 'skin_objective', 'simplifier', 'Simplifier la routine', 'Simplify', ARRAY['simple', 'minimaliste'], 11),
  ('skin_objective_carnation', 'skin_objective', 'carnation', 'Produits adaptés à ma carnation', 'Shade match', ARRAY['carnation', 'teinte', 'melanine'], 12)
ON CONFLICT (id) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 6. PROFONDEURS DE TON — bands utilisées par archetype.ts
-- ------------------------------------------------------------
-- Aucune dénomination commerciale ni jugement : uniquement des bandes de
-- profondeur, comme le fait déjà `deriveArchetype`.

INSERT INTO public.kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, sort_order) VALUES
  ('tone_fair',     'tone_depth', 'fair',     'Ton clair',      'Fair tone',     1),
  ('tone_light',    'tone_depth', 'light',    'Ton intermédiaire clair', 'Light tone', 2),
  ('tone_medium',   'tone_depth', 'medium',   'Ton intermédiaire',       'Medium tone', 3),
  ('tone_tan',      'tone_depth', 'tan',      'Ton mat',        'Tan tone',      4),
  ('tone_deep',     'tone_depth', 'deep',     'Ton profond',    'Deep tone',     5),
  ('tone_rich',     'tone_depth', 'rich',     'Ton très profond', 'Rich tone',   6),
  ('tone_unknown',  'tone_depth', 'unknown',  'Non déclaré',    'Not declared',  99)
ON CONFLICT (id) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- 7. COHÉRENCE — aucun terme orphelin, aucune taxonomie vide
-- ------------------------------------------------------------
-- Une taxonomie déclarée mais vide est pire qu'une taxonomie absente : elle
-- donne l'illusion d'un vocabulaire contrôlé.

DO $$
DECLARE
  empty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_count
    FROM public.kurla_taxonomies t
   WHERE NOT EXISTS (
     SELECT 1 FROM public.kurla_taxonomy_terms term
      WHERE term.taxonomy_id = t.id AND term.is_active
   );
  IF empty_count > 0 THEN
    RAISE EXCEPTION 'Vocabulaire contrôlé incomplet : % taxonomie(s) sans terme actif.', empty_count;
  END IF;
END $$;

COMMENT ON TABLE public.kurla_taxonomy_terms IS
  'Vocabulaire contrôlé, alimenté depuis la migration 20260847. Les termes proviennent du code réel (kurlaFit, semanticSearch, shelf) et du seed produits — aucun terme inventé.';
