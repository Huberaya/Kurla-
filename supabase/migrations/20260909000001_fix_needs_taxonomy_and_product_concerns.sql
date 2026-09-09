-- CHANTIER 2 — Correction recommandations produits & matériels par besoin
-- Audit 09/09/2026 : 28 outils tagués identiquement proteger_nuit+reduire_casse → 0 résultat pour entretenir_locks/perruque
-- Ce patch ajoute les 2 termes manquants (demeler_cheveux, barbe) et corrige les 64+23 produits.

-- 1) Ajout des 2 termes manquants à la taxonomie `need`
INSERT INTO kurla_taxonomy_terms (id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order)
VALUES
  ('need_demeler_cheveux', 'need', 'demeler_cheveux', 'Démêler les cheveux', 'Detangle hair', '["démêler","demeler","démêlage","nœud","detangle"]'::jsonb, 12),
  ('need_barbe', 'need', 'barbe', 'Barbe & grooming homme', 'Beard & grooming', '["barbe","grooming","homme","beard","waves","durag"]'::jsonb, 13)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  synonyms = EXCLUDED.synonyms,
  sort_order = EXCLUDED.sort_order;

-- Réordonne les suivants (hydrater_peau passe de 12 → 14, etc.)
UPDATE kurla_taxonomy_terms SET sort_order = 14 WHERE id = 'need_hydrater_peau';
UPDATE kurla_taxonomy_terms SET sort_order = 15 WHERE id = 'need_peau_sensible';
UPDATE kurla_taxonomy_terms SET sort_order = 16 WHERE id = 'need_imperfections_acne';
UPDATE kurla_taxonomy_terms SET sort_order = 17 WHERE id = 'need_taches_hyperpigmentation';
UPDATE kurla_taxonomy_terms SET sort_order = 18 WHERE id = 'need_protection_solaire';

-- 2) Correction des concerns (source unique du moteur de reco boutique/diagnostic/IA)
-- Chaque ligne écrase les 2 anciens tags identiques par les vrais besoins du produit.

-- Soins
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-p01';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p02';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-p03';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-p04';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-p05';
UPDATE products SET concerns = ARRAY['reduire_casse','apaiser_cuir_chevelu'] WHERE id = 'launch-p06';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-p07';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-p08';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','proteger_nuit'] WHERE id = 'launch-p09';
UPDATE products SET concerns = ARRAY['cuir_chevelu','reduire_casse'] WHERE id = 'launch-p10';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-p11';
UPDATE products SET concerns = ARRAY['definir_boucles','entretenir_tresses'] WHERE id = 'launch-p12';
UPDATE products SET concerns = ARRAY['definir_boucles','reduire_frisottis'] WHERE id = 'launch-p13';
UPDATE products SET concerns = ARRAY['definir_boucles','entretenir_tresses'] WHERE id = 'launch-p14';
UPDATE products SET concerns = ARRAY['definir_boucles','reduire_frisottis'] WHERE id = 'launch-p15';

-- Accessoires cœur
UPDATE products SET concerns = ARRAY['reduire_casse','demeler_cheveux'] WHERE id = 'launch-p16';
UPDATE products SET concerns = ARRAY['proteger_nuit','hydrater_cheveux','entretenir_perruque'] WHERE id = 'launch-p17';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-p18';
UPDATE products SET concerns = ARRAY['definir_boucles','reduire_casse'] WHERE id = 'launch-p19';
UPDATE products SET concerns = ARRAY['reduire_casse','demeler_cheveux'] WHERE id = 'launch-p20';
UPDATE products SET concerns = ARRAY['definir_boucles','entretenir_tresses','barbe'] WHERE id = 'launch-p21';
UPDATE products SET concerns = ARRAY['definir_boucles','proteger_chaleur'] WHERE id = 'launch-p22';
UPDATE products SET concerns = ARRAY['entretenir_tresses','reduire_casse'] WHERE id = 'launch-p23';
UPDATE products SET concerns = ARRAY['proteger_nuit','entretenir_tresses','entretenir_perruque'] WHERE id = 'launch-p24';
UPDATE products SET concerns = ARRAY['proteger_nuit','entretenir_tresses','entretenir_perruque'] WHERE id = 'launch-p25';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p26';
UPDATE products SET concerns = ARRAY['proteger_nuit','entretenir_locks','entretenir_perruque'] WHERE id = 'launch-p27';

-- Soins complémentaires
UPDATE products SET concerns = ARRAY['cuir_chevelu','hydrater_cheveux'] WHERE id = 'launch-p28';
UPDATE products SET concerns = ARRAY['definir_boucles','reduire_frisottis'] WHERE id = 'launch-p29';
UPDATE products SET concerns = ARRAY['definir_boucles','entretenir_locks'] WHERE id = 'launch-p30';
UPDATE products SET concerns = ARRAY['cuir_chevelu','reduire_casse'] WHERE id = 'launch-p31';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-p32';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p33';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-p34';

-- Outils iconiques
UPDATE products SET concerns = ARRAY['definir_boucles','entretenir_tresses','barbe'] WHERE id = 'launch-p35';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p36';
UPDATE products SET concerns = ARRAY['definir_boucles','reduire_frisottis'] WHERE id = 'launch-p37';
UPDATE products SET concerns = ARRAY['entretenir_tresses','definir_boucles'] WHERE id = 'launch-p38';
UPDATE products SET concerns = ARRAY['definir_boucles','proteger_chaleur'] WHERE id = 'launch-p39';
UPDATE products SET concerns = ARRAY['definir_boucles','proteger_chaleur'] WHERE id = 'launch-p40';
UPDATE products SET concerns = ARRAY['entretenir_locks','definir_boucles','barbe'] WHERE id = 'launch-p41';
UPDATE products SET concerns = ARRAY['entretenir_locks','reduire_casse'] WHERE id = 'launch-p42';
UPDATE products SET concerns = ARRAY['definir_boucles','proteger_chaleur'] WHERE id = 'launch-p43';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','cuir_chevelu'] WHERE id = 'launch-p44';
UPDATE products SET concerns = ARRAY['proteger_nuit','entretenir_tresses'] WHERE id = 'launch-p45';
UPDATE products SET concerns = ARRAY['proteger_nuit','entretenir_locks','barbe'] WHERE id = 'launch-p46';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','cuir_chevelu'] WHERE id = 'launch-p47';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_frisottis'] WHERE id = 'launch-p48';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p49';
UPDATE products SET concerns = ARRAY['entretenir_tresses','proteger_chaleur'] WHERE id = 'launch-p50';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p51';
UPDATE products SET concerns = ARRAY['reduire_casse','hydrater_cheveux'] WHERE id = 'launch-p52';
UPDATE products SET concerns = ARRAY['cuir_chevelu','hydrater_cheveux'] WHERE id = 'launch-p53';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p54';

-- 23 innovations GAP
UPDATE products SET concerns = ARRAY['entretenir_tresses','reduire_casse'] WHERE id = 'launch-p55';
UPDATE products SET concerns = ARRAY['entretenir_locks','reduire_casse'] WHERE id = 'launch-p56';
UPDATE products SET concerns = ARRAY['definir_boucles','proteger_chaleur'] WHERE id = 'launch-p57';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_frisottis'] WHERE id = 'launch-p58';
UPDATE products SET concerns = ARRAY['definir_boucles','reduire_casse'] WHERE id = 'launch-p59';
UPDATE products SET concerns = ARRAY['proteger_nuit','entretenir_tresses'] WHERE id = 'launch-p60';
UPDATE products SET concerns = ARRAY['reduire_casse','demeler_cheveux'] WHERE id = 'launch-p61';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p62';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p63';
UPDATE products SET concerns = ARRAY['cuir_chevelu','apaiser_cuir_chevelu'] WHERE id = 'launch-p64';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p65';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p66';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p67';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p68';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p69';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p70';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p71';
UPDATE products SET concerns = ARRAY['cuir_chevelu','proteger_chaleur'] WHERE id = 'launch-p72';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p73';
UPDATE products SET concerns = ARRAY['reduire_casse','demeler_cheveux'] WHERE id = 'launch-p74';
UPDATE products SET concerns = ARRAY['proteger_chaleur','definir_boucles'] WHERE id = 'launch-p75';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','cuir_chevelu'] WHERE id = 'launch-p76';
UPDATE products SET concerns = ARRAY['entretenir_locks','reduire_casse'] WHERE id = 'launch-p77';

-- Kits
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-k01';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','definir_boucles'] WHERE id = 'launch-k02';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-k03';
UPDATE products SET concerns = ARRAY['reduire_casse','cuir_chevelu'] WHERE id = 'launch-k04';
UPDATE products SET concerns = ARRAY['entretenir_tresses','definir_boucles'] WHERE id = 'launch-k05';
UPDATE products SET concerns = ARRAY['hydrater_cheveux','reduire_casse'] WHERE id = 'launch-k06';
UPDATE products SET concerns = ARRAY['reduire_casse','demeler_cheveux'] WHERE id = 'launch-k07';
UPDATE products SET concerns = ARRAY['entretenir_locks','proteger_nuit'] WHERE id = 'launch-k08';
UPDATE products SET concerns = ARRAY['definir_boucles','proteger_chaleur'] WHERE id = 'launch-k09';
UPDATE products SET concerns = ARRAY['cuir_chevelu','hydrater_cheveux'] WHERE id = 'launch-k10';
INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p55', 'preco-machine-a-tresser-electrique-automatique-usb-360', 'Machine à tresser électrique automatique USB 360° (EXLEAF 2026)', 'KURLA Essentials', 'accessoires', 'Outils', 19.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Machine à tresser électrique automatique USB 360° (EXLEAF 2026)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-device.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['entretenir_tresses','reduire_casse'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p56', 'preco-machine-a-locs-automatique-2-aiguilles-7-vitesses', 'Machine à locs automatique 2 aiguilles 7 vitesses (dreadlock maker)', 'KURLA Essentials', 'accessoires', 'Outils', 49.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Machine à locs automatique 2 aiguilles 7 vitesses (dreadlock maker)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-device.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['entretenir_locks','reduire_casse'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p57', 'preco-bandeau-heatless-satin-lazy-curler', 'Bandeau heatless satin lazy curler (Slik Satin)', 'KURLA Essentials', 'accessoires', 'Outils', 14.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Bandeau heatless satin lazy curler (Slik Satin)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-satin.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['definir_boucles','proteger_chaleur'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p58', 'preco-brosse-vapeur-2026-air-cushion-rechargeable-usb-c', 'Brosse vapeur 2026 air cushion rechargeable USB-C', 'KURLA Essentials', 'accessoires', 'Outils', 19.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Brosse vapeur 2026 air cushion rechargeable USB-C', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-device.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['hydrater_cheveux','reduire_frisottis'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p59', 'preco-clips-volume-racines-root-lift-10pcs-pinces', 'Clips volume racines root lift 10pcs + pinces', 'KURLA Essentials', 'accessoires', 'Outils', 6.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Clips volume racines root lift 10pcs + pinces', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['definir_boucles','reduire_casse'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p60', 'preco-chouchous-soie-skinny-lot-6-edition-soyeuse', 'Chouchous soie skinny (Slip) lot 6 — édition soyeuse', 'KURLA Essentials', 'accessoires', 'Outils', 9.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Chouchous soie skinny (Slip) lot 6 — édition soyeuse', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-satin.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_nuit','entretenir_tresses'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p61', 'preco-peigne-seashore-pik-recycle-eco', 'Peigne Seashore Pik recyclé (Re-comb) — eco', 'KURLA Essentials', 'accessoires', 'Outils', 8.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Peigne Seashore Pik recyclé (Re-comb) — eco', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['reduire_casse','demeler_cheveux'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p62', 'preco-analyseur-cuir-chevelu-portable-wifi-50x-200x-4-spectres', 'Analyseur cuir chevelu portable WiFi 50x/200x 4-spectres (5G)', 'KURLA Essentials', 'accessoires', 'Outils', 59.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Analyseur cuir chevelu portable WiFi 50x/200x 4-spectres (5G)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['cuir_chevelu','apaiser_cuir_chevelu'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p63', 'preco-microscope-cuir-chevelu-1600x-wifi-led', 'Microscope cuir chevelu 1600X WiFi LED (poche)', 'KURLA Essentials', 'accessoires', 'Outils', 29.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Microscope cuir chevelu 1600X WiFi LED (poche)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['cuir_chevelu','apaiser_cuir_chevelu'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p64', 'preco-analyseur-pro-api-202-portable-x60', 'Analyseur pro API 202 portable x60 (rental pro)', 'KURLA Essentials', 'accessoires', 'Outils', 199.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Analyseur pro API 202 portable x60 (rental pro)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['cuir_chevelu','apaiser_cuir_chevelu'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p65', 'preco-seche-cheveux-infrarouge-airlight-pro', 'Sèche-cheveux infrarouge AirLight Pro (L’Oréal x Zuvi)', 'KURLA Essentials', 'accessoires', 'Outils', 199.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Sèche-cheveux infrarouge AirLight Pro (L’Oréal x Zuvi)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p66', 'preco-seche-cheveux-dyson-supersonic-r-rfid', 'Sèche-cheveux Dyson Supersonic r RFID (30% smaller)', 'KURLA Essentials', 'accessoires', 'Outils', 449.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Sèche-cheveux Dyson Supersonic r RFID (30% smaller)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p67', 'preco-seche-cheveux-t3-aire-iq-heatid', 'Sèche-cheveux T3 Aire iQ HeatID (SoftAire)', 'KURLA Essentials', 'accessoires', 'Outils', 399.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Sèche-cheveux T3 Aire iQ HeatID (SoftAire)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p68', 'preco-multi-styler-shark-flexfusion-glam', 'Multi-styler Shark FlexFusion / Glam (wet-to-dry)', 'KURLA Essentials', 'accessoires', 'Outils', 379.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Multi-styler Shark FlexFusion / Glam (wet-to-dry)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p69', 'preco-lisseur-sans-fil-dyson-corrale', 'Lisseur sans fil Dyson Corrale (flexing plates)', 'KURLA Essentials', 'accessoires', 'Outils', 349.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Lisseur sans fil Dyson Corrale (flexing plates)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-rollers.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p70', 'preco-lisseur-2-en-1-ghd-duet-wet-to-dry', 'Lisseur 2-en-1 ghd Duet wet-to-dry (Airfusion)', 'KURLA Essentials', 'accessoires', 'Outils', 329.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Lisseur 2-en-1 ghd Duet wet-to-dry (Airfusion)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p71', 'preco-seche-cheveux-laifen-mini-0-5lb-swift-4-smart-temp', 'Sèche-cheveux Laifen Mini 0.5lb + Swift 4 smart temp', 'KURLA Essentials', 'accessoires', 'Outils', 79.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Sèche-cheveux Laifen Mini 0.5lb + Swift 4 smart temp', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p72', 'preco-seche-cheveux-dreame-pilot-20-ai-robot', 'Sèche-cheveux Dreame Pilot 20 AI robot (bras + red light + mist)', 'KURLA Essentials', 'accessoires', 'Outils', 149.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Sèche-cheveux Dreame Pilot 20 AI robot (bras + red light + mist)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['cuir_chevelu','proteger_chaleur'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p73', 'preco-lisseur-infrarouge-verre-l-oreal-light-straight', 'Lisseur infrarouge verre L’Oréal Light Straight (2027 teaser)', 'KURLA Essentials', 'accessoires', 'Outils', 299.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Lisseur infrarouge verre L’Oréal Light Straight (2027 teaser)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p74', 'preco-brosse-ultrasonic-demelage-par-vibration', 'Brosse ultrasonic démêlage par vibration (AI-Heat)', 'KURLA Essentials', 'accessoires', 'Outils', 24.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Brosse ultrasonic démêlage par vibration (AI-Heat)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['reduire_casse','demeler_cheveux'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p75', 'preco-brosse-soufflante-6-en-1-1000w-multi-styler', 'Brosse soufflante 6-en-1 1000W multi-styler', 'KURLA Essentials', 'accessoires', 'Outils', 29.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Brosse soufflante 6-en-1 1000W multi-styler', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-accessory.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['proteger_chaleur','definir_boucles'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p76', 'preco-steamer-salon-sur-pied-nano-micro-mist-4-wheels', 'Steamer salon sur pied nano micro mist 4 wheels (pro)', 'KURLA Essentials', 'accessoires', 'Outils', 249.0, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Steamer salon sur pied nano micro mist 4 wheels (pro)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-device.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['hydrater_cheveux','cuir_chevelu'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();

INSERT INTO products (id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity, description, image_url, hair_types, concerns, country_availability, is_active, catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status, stock_validation_status, certifications_validation_status, translations_validation_status, brand_verification_status, image_ownership_status, price_includes_vat, vat_rate)
VALUES ('launch-p77', 'preco-machine-dreadlock-3-aiguilles-handheld-204', 'Machine dreadlock 3 aiguilles handheld $204 (pro locs)', 'KURLA Essentials', 'accessoires', 'Outils', 59.9, true, 0, '[PRÉCOMMANDE — expédié sous 3–5 jours — petite production hebdomadaire] Machine dreadlock 3 aiguilles handheld $204 (pro locs)', 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images/kurla-device.jpg', ARRAY['3A','3B','3C','4A','4B','4C'], ARRAY['entretenir_locks','reduire_casse'], ARRAY['FR','BE','DOM','INT'], true, 'published', 'verified','verified','verified','verified','verified','verified','verified','brand_provided', true, 20)
ON CONFLICT (id) DO UPDATE SET concerns = EXCLUDED.concerns, catalog_status='published', image_url=EXCLUDED.image_url, price=EXCLUDED.price, updated_at=now();


-- Fin migration CHANTIER 2 --
