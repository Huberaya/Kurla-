-- ============================================================
-- CHANTIER ACHATS — Fournisseurs accessoires (satin & outils)
-- Recherche responsable achats du 30/08/2026.
--
-- Les besoins « protéger la nuit (satin) » et « outils de démêlage »
-- n'avaient aucun fournisseur identifié. Quatre cibles RÉELLES sont ajoutées
-- (contacts publics vérifiés sur les sites officiels — aucun email inventé) :
--   c22 AfricanFabs B.V. (NL, grossiste, wholesale explicite, info@africanfabs.com)
--   c23 Afro Wholesale / B&F Company (NL, B2B, support@afrowholesale.eu)
--   c24 Curly Nights (FR/Lyon, bonnets satin faits main, contact site/Instagram)
--   c25 Studio Boucle Paris (FR, bonnet satin premium)
-- Aucun tarif/MOQ/délai : ils restent NULL jusqu'à réponse réelle.
-- Idempotent (ON CONFLICT DO NOTHING : une édition admin n'est pas écrasée).
-- ============================================================

INSERT INTO public.sourcing_prospects
  (id, name, route, contact_type, specialty, source_url, contact_email, channel, status)
VALUES
  ('c22', 'AfricanFabs B.V.', 'A', 'distributor',
   'Grossiste PB : bonnets satin & doublure satin, taies, scrunchies, accessoires wax. Wholesale explicite. Edam (NL), livraison UE.',
   'https://africanfabs.com/pages/contact-us', 'info@africanfabs.com',
   'email + WhatsApp +31 617227322', 'to_contact'),
  ('c23', 'Afro Wholesale (B&F Company)', 'A', 'distributor',
   'Grossiste B2B afro/cheveux texturés (produits ET accessoires : bonnets, peignes, mèches). Heinenoord (NL), livraison UE.',
   'https://afrowholesale.eu/', 'support@afrowholesale.eu',
   'email + téléphone +31 685 198 455', 'to_contact'),
  ('c24', 'Curly Nights', 'A', 'brand_fr',
   'Bonnets satin et taies faits main à Lyon (FR), réglables/enfants, wax. Protection nocturne cheveux bouclés/crépus.',
   'https://www.curlynights.com/fr/contact/', NULL,
   'formulaire site + Instagram @curly.nights', 'to_contact'),
  ('c25', 'Studio Boucle Paris', 'A', 'brand_fr',
   'Bonnet satin adulte 100% satin intérieur/extérieur, marque française (Paris). Accessoires de protection nocturne.',
   'https://studioboucleparis.com/en/products/bonnet-en-satin', NULL,
   'formulaire site', 'to_contact')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sourcing_product_candidates
  (id, prospect_id, brand, product, routine_step, category, sourced_via)
VALUES
  ('r16', 'c22', 'AfricanFabs', 'Bonnet satin extra-large (tresses/locks) en gros', 'Accessoire', 'tools', 'distributor'),
  ('r17', 'c22', 'AfricanFabs', 'Set satin : bonnet + taie + scrunchie (gros)', 'Accessoire', 'tools', 'distributor'),
  ('r18', 'c23', 'Afro Wholesale', 'Peigne afro dents larges & brosses démêlantes (gros B2B)', 'Accessoire', 'tools', 'distributor'),
  ('r19', 'c23', 'Afro Wholesale', 'Bonnet de nuit wax/satin (multimarque, gros)', 'Accessoire', 'tools', 'distributor'),
  ('r20', 'c24', 'Curly Nights', 'Bonnet satin réglable fait main (Lyon) — revente/co-branding', 'Accessoire', 'tools', 'brand'),
  ('r21', 'c25', 'Studio Boucle Paris', 'Bonnet satin 100% adulte (marque française)', 'Accessoire', 'tools', 'brand')
ON CONFLICT (id) DO NOTHING;
