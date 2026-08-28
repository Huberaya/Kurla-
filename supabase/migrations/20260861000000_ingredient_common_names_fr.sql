-- =============================================================================
-- CHANTIER 7.7 — Alias français des ingrédients du graphe
--
-- Constat sur la base réelle (16 produits, 13 ingrédients) : le catalogue est
-- rédigé en français — « Acide Salicylique 1.5 % », « Glycérine Végétale »,
-- « Squalane Végétal », « Niacinamide 4 % » — alors que le graphe ne connaît que
-- le nom INCI anglais et un ou deux alias. Résolution exacte normalisée aidant,
-- ces mentions ne rencontraient aucune entité : le filtrage réglementaire
-- tournait à vide sur le catalogue réel, et la fiche produit répondait
-- « statut non évalué » là où elle aurait pu répondre « réglementé, sous la
-- limite ».
--
-- Cette migration n'ajoute QUE des alias à des entités existantes. Elle ne crée
-- aucune entité et n'invente aucune équivalence approximative : chaque alias
-- ajouté est le nom courant, non ambigu, de la même substance. Ce qui reste non
-- résolu (la vitamine E, le zinc PCA, l'acide tranexamique…) le reste
-- volontairement — il faudrait créer les entités, pas les deviner.
--
-- Idempotent : l'union distincte ne duplique jamais un alias.
-- =============================================================================

UPDATE public.ingredients AS i
SET common_names = (
      SELECT array_agg(DISTINCT alias ORDER BY alias)
      FROM unnest(i.common_names || ARRAY['acide salicylique']) AS alias
    ),
    updated_at = NOW()
WHERE i.id = 'salicylic-acid';

UPDATE public.ingredients AS i
SET common_names = (
      SELECT array_agg(DISTINCT alias ORDER BY alias)
      FROM unnest(i.common_names || ARRAY['glycérine végétale', 'glycérol', 'glycerol']) AS alias
    ),
    updated_at = NOW()
WHERE i.id = 'glycerin';

UPDATE public.ingredients AS i
SET common_names = (
      SELECT array_agg(DISTINCT alias ORDER BY alias)
      FROM unnest(i.common_names || ARRAY['squalane végétal']) AS alias
    ),
    updated_at = NOW()
WHERE i.id = 'squalane';

UPDATE public.ingredients AS i
SET common_names = (
      SELECT array_agg(DISTINCT alias ORDER BY alias)
      FROM unnest(i.common_names || ARRAY['nicotinamide']) AS alias
    ),
    updated_at = NOW()
WHERE i.id = 'niacinamide';

UPDATE public.ingredients AS i
SET common_names = (
      SELECT array_agg(DISTINCT alias ORDER BY alias)
      FROM unnest(i.common_names || ARRAY['panthénol', 'd-panthénol']) AS alias
    ),
    updated_at = NOW()
WHERE i.id = 'panthenol';

UPDATE public.ingredients AS i
SET common_names = (
      SELECT array_agg(DISTINCT alias ORDER BY alias)
      FROM unnest(i.common_names || ARRAY['acide ascorbique']) AS alias
    ),
    updated_at = NOW()
WHERE i.id = 'ascorbic-acid';

COMMENT ON COLUMN public.ingredients.common_names IS
  'Noms courants non ambigus de la même substance (français, INCI usuel, abréviations). Sert à la résolution exacte normalisée des libellés déclarés ; aucun rapprochement approximatif n''est autorisé ici.';
