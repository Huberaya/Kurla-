-- Provenance du pays d'origine.
--
-- Constat mesuré le 13/09/2026 sur la base qzwgsarfdegqtfdnqiql :
-- `origin_country` est NULL sur les 63 produits publiés, et aucun code ne le
-- garde. Le champ est pourtant affiché au public (ProductDetailPage, bloc
-- « Origine, certifications & livraison »).
--
-- Ce que cette migration NE fait PAS, volontairement :
--   elle n'ajoute PAS `origin_country_status` aux VERIFIED_FIELDS de
--   catalogTruth.ts. Ce tableau alimente hasPendingEvidence ->
--   hasMinimalCatalogProof -> isCatalogPubliclyListable. Un pays d'origine
--   inconnu sur 100 % du catalogue dépublierait donc les 63 fiches d'un coup,
--   pour un champ qui n'est pas une obligation légale d'un distributeur
--   revendant des produits déjà mis sur le marché UE (règl. 1223/2009 art. 2e).
--   La provenance est tracée et exposée, elle ne barre pas la publication.
--
-- Ce qu'elle fait : rendre l'inconnu explicite, et interdire au niveau base
-- qu'un fait soit marqué vérifié sans provenance.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS origin_country_status TEXT NOT NULL DEFAULT 'not_provided';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS origin_country_source TEXT;

COMMENT ON COLUMN public.products.origin_country_status IS
  'not_provided = jamais demande ; pending = demande au fournisseur, sans reponse ; declared = affirme par le fournisseur, non recoupe ; verified = recoupe sur une piece (etiquette, PIF, contrat).';

COMMENT ON COLUMN public.products.origin_country_source IS
  'Provenance du fait : etiquette produit, dossier PIF, contrat fournisseur, fiche CPNP. Obligatoire quand le statut est verified.';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_origin_country_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_origin_country_status_check
  CHECK (origin_country_status IN ('verified', 'declared', 'pending', 'not_provided'));

-- Regle de tracabilite : pas de pays sans statut qui dit d'ou il vient.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_origin_country_requires_status;
ALTER TABLE public.products
  ADD CONSTRAINT products_origin_country_requires_status
  CHECK (origin_country IS NULL OR origin_country_status IN ('verified', 'declared', 'pending'));

-- Regle de tracabilite : pas de fait « verifie » sans piece qui le source.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_origin_verified_requires_source;
ALTER TABLE public.products
  ADD CONSTRAINT products_origin_verified_requires_source
  CHECK (origin_country_status <> 'verified' OR origin_country_source IS NOT NULL);
