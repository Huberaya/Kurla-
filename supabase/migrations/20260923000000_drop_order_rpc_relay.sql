-- =============================================================================
-- GO-LIVE G1 — Suppression du relais 11 paramètres de
-- create_order_with_stock_reservation
--
-- Contexte (trouvé par le banc G1 phase7_atomic_stock en base prod) :
-- la migration 20260860000000 (TVA) a conservé l'ancienne signature à
-- 11 paramètres comme « relais de compatibilité » déléguant à la version
-- étendue à 17 paramètres.
--
-- Ce relais est une mine pour PostgREST : dès que les deux surcharges
-- coexistent, PostgREST refuse de résoudre un appel nommé à 11 paramètres
-- (PGRST203 « Could not choose the best candidate function »). Le banc
-- G1 — et tout appelant REST à 11 paramètres — échoue alors.
--
-- Le relais ne protège personne :
--   - sur une base SANS la migration 20260860, le relais n'existe pas encore
--     (il est créé dans la même migration que la version étendue) : c'est
--     précisément la situation visée par le repli applicatif (orderStore.ts :
--     en cas de 42883/PGRST202, on re-tente avec la signature 11 paramètres),
--     où la fonction d'origine est unique et l'appel se résout sans problème ;
--   - sur une base AVEC la migration, l'application appelle toujours la
--     signature étendue (17 paramètres) : le chemin principal ne passe jamais
--     par le relais.
--
-- Conséquence de le supprimer : l'appel à 11 paramètres renvoie PGRST202
-- (« fonction inexistante »), exactement le code que le repli applicatif
-- surveille déjà. Conséquence de le garder : tout appelant REST à 11
-- paramètres (banc G1, déploiement antérieur, outillage) casse en PGRST203.
--
-- Aucun appelant SQL interne n'est touché : le seul qui appelait le relais
-- était… le relais lui-même (délégation interne), supprimé avec lui.
-- =============================================================================

DROP FUNCTION IF EXISTS public.create_order_with_stock_reservation(
  TEXT, UUID, TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ
);
