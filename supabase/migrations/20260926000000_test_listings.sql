-- ────────────────────────────────────────────────────────────────────────────
-- Migration 20260926000000 — Fiches test « vague images fournisseur ».
--
-- CONSTAT (14/09/2026) : la mise en boutique de test demandée par
-- l'exploitant exige des fiches visibles AVANT contractualisation fournisseur
-- (visuels repris de la page publique du distributeur, INCI publiée, prix pro
-- masqué derrière connexion revendeur). Ces fiches ne doivent JAMAIS passer
-- la porte de publication réelle (`isCatalogPubliclyListable`) : elles ne
-- portent ni preuve validée, ni droits visuels établis, ni prix.
--
-- DÉCISION : un drapeau explicite `is_test_listing`. La vérité catalogue
-- (`catalogTruth.ts`) l'utilise pour une porte SÉPARÉE, `isTestListable`,
-- servie uniquement quand l'API est appelée en mode test (`?test=1`). Sans ce
-- drapeau, rien ne change : la porte réelle ignore ces fiches et les fiches
-- test ne satisfont volontairement pas la porte réelle (statuts de preuve
-- non vérifiés, visuel `unverified`).
--
-- Le prix reste NOT NULL (protège le catalogue réel d'une fiche sans prix) :
-- les fiches test portent 0, valeur placeholder technique que la projection
-- publique (`toPublicProduct`) transforme en `price: null` + libellé
-- « prix fournisseur à contractualiser ». Jamais affichée comme un prix.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_test_listing boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS test_listing_note text;
