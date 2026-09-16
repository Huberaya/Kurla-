-- ============================================================
-- LIEN DE FILIATION — sourcing_prospects.supplier_id
-- ============================================================
-- Chantier : « une seule fiche fournisseur, visible partout ».
--
-- Constat mesuré le 16/09/2026, avant d'écrire une ligne :
--
--   · 30 fiches dans `suppliers`, lues par 12 écrans ;
--   · 28 fiches dans `sourcing_prospects`, lues par 7 écrans ;
--   · **0 piste sur 28 ne porte de référence à un fournisseur** — la colonne
--     de liaison n'existe tout simplement pas ;
--   · 3 noms seulement apparaissent dans les deux tables.
--
-- Conséquence vécue par l'exploitant : remplir la fiche d'un fournisseur
-- (raison sociale, pays, site, e-mail, certifications, statut de vérification)
-- ne change rien dans les écrans de sourcing, qui lisent l'autre table.
-- L'information existe, mais elle n'est rattachée à rien.
--
-- Ce que cette migration fait, et rien de plus :
--
--   1. une colonne `supplier_id` sur `sourcing_prospects`,TEXT (la clé de
--      `suppliers` est un identifiant lisible — `sup-blacketique-sas` — pas
--      un UUID) ;
--   2. un index pour les jointures ;
--   3. le rechargement du cache PostgREST, sinon l'API continue d'ignorer la
--      colonne pendant un temps et on croit la migration sans effet.
--
-- Elle NE recopie AUCUNE donnée d'une table dans l'autre. Recopier reviendrait
-- à créer une deuxième source de vérité : le lendemain, les deux divergeraient
-- et le problème serait pire. Le rapprochement des 3 pistes identifiables est
-- fait par un script à part, rejouable, qui utilise exactement la même fonction
-- de pliage de nom que le code — pas une approximation en SQL.
--
-- Les 25 pistes restantes n'ont pas de correspondance, et c'est normal : une
-- piste est une démarche en cours (marque ou façonnier démarché), un
-- fournisseur est une fiche validée. La colonne reste donc NULL pour elles.
-- C'est le lien qui manquait pour faire passer l'une à l'autre, pas un doublon
-- à supprimer.
--
-- Application : MANUELLE — éditeur SQL du dashboard Supabase (aucun jeton
-- requis). Idempotent : ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- Rejouer ce fichier ne casse rien.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. La colonne de filiation.
-- ---------------------------------------------------------------------------
ALTER TABLE public.sourcing_prospects
  ADD COLUMN IF NOT EXISTS supplier_id text
  REFERENCES public.suppliers(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sourcing_prospects.supplier_id IS
  'Fiche fournisseur validée à laquelle cette piste a abouti. NULL tant que la '
  'piste est en cours de démarchage. Une piste validée ne recopie pas les '
  'informations du fournisseur : elle pointe vers elles.';

-- ---------------------------------------------------------------------------
-- 2. Index : les écrans joignent les deux tables à chaque ouverture.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS sourcing_prospects_supplier_id_idx
  ON public.sourcing_prospects(supplier_id);

-- ---------------------------------------------------------------------------
-- 3. Sans ce rechargement, PostgREST garde en cache l'ancien schéma : la
--    colonne existe en base et reste invisible depuis l'API. C'est exactement
--    le genre de panne qui fait croire qu'une migration n'a rien changé.
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- CONTRÔLE — à exécuter après application
-- ============================================================
-- La colonne existe-t-elle ?
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'sourcing_prospects' AND column_name = 'supplier_id';
--   -- attendu : supplier_id | text | YES
--
-- Combien de pistes sont reliées (avant rapprochement : 0) ?
--
--   SELECT count(*) FILTER (WHERE supplier_id IS NOT NULL) AS reliees,
--          count(*) AS total
--   FROM public.sourcing_prospects;
--
-- L'API la voit-elle ? Ouvrir :
--   /rest/v1/sourcing_prospects?select=id,name,supplier_id&limit=3
-- Si « supplier_id » n'apparaît pas dans la réponse, rejouer le NOTIFY.
-- ============================================================

-- ============================================================
-- RETOUR ARRIÈRE — à n'exécuter que en cas de besoin
-- ============================================================
--   ALTER TABLE public.sourcing_prospects DROP COLUMN IF EXISTS supplier_id;
--   NOTIFY pgrst, 'reload schema';
-- ============================================================
