-- ============================================================
-- KURLA BEAUTY — trois besoins cutanés présents dans le code, absents du vocabulaire
--
-- Constat : `barriere_cutanee`, `eclat_teint_terne` et `maturite_rides`
-- avaient une branche dans `calculateKurlaFit` et figuraient dans
-- `RECOGNIZED_NEED_CODES`, mais aucun terme correspondant n'existait dans
-- `kurla_taxonomy_terms`. Le vocabulaire contrôlé et le moteur divergeaient.
--
-- Cette migration réaligne la base sur le code. Elle est IDEMPOTENTE.
-- ============================================================

INSERT INTO public.kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order) VALUES
  ('need_barriere_cutanee',   'need', 'barriere_cutanee',   'Barrière cutanée',  'Skin barrier',        ARRAY['barrière','barriere','tiraillement','réactivité','reactivite'], 19),
  ('need_eclat_teint_terne',  'need', 'eclat_teint_terne',  'Éclat du teint',    'Radiance',            ARRAY['éclat','eclat','teint terne','terne','glow'], 20),
  ('need_maturite_rides',     'need', 'maturite_rides',     'Maturité et rides', 'Maturity and wrinkles', ARRAY['rides','maturité','maturite','fermeté','fermete'], 21)
ON CONFLICT (id) DO UPDATE SET
  code       = EXCLUDED.code,
  label_fr   = EXCLUDED.label_fr,
  label_en   = EXCLUDED.label_en,
  synonyms   = EXCLUDED.synonyms,
  sort_order = EXCLUDED.sort_order;
