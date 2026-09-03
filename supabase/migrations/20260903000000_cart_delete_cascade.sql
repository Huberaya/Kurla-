-- Le panier ne survit pas à son propriétaire.
--
-- Constat, reproduit le 2026-09-03 : `POST /api/account/delete` effaçait les
-- données puis appelait `auth.admin.deleteUser()`. Côté base, la suppression du
-- compte emporte la ligne `profiles` (CASCADE), et `carts.user_id` était en
-- `ON DELETE SET NULL` : la ligne de panier passait alors à
-- (user_id NULL, anonymous_id NULL), ce qui viole `carts_owner_check`.
--
-- Conséquence : la transaction entière était annulée, `deleteUser()` renvoyait
-- une erreur HTTP 500, `accountDeleted` restait à `false` — et le compte
-- d'authentification n'était PAS supprimé. Le droit à l'effacement (RGPD
-- art. 17) échouait pour tout membre ayant déjà un panier, sans que personne
-- ne le voie, puisque la route répondait 200 dans le même temps.
--
-- Un panier n'a aucune raison de survivre à son propriétaire : ce n'est pas une
-- pièce comptable (contrairement aux commandes, qu'on conserve). On le supprime.

ALTER TABLE public.carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;

ALTER TABLE public.carts
  ADD CONSTRAINT carts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Filet : les éventuelles lignes déjà orphelines d'un compte supprimé avant ce
-- correctif. Elles violent la contrainte et bloqueraient la prochaine
-- suppression ; autant les retirer maintenant.
DELETE FROM public.carts WHERE user_id IS NULL AND anonymous_id IS NULL;
