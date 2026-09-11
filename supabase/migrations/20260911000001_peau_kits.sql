-- C3 — 3 KITS PEAU (Essentielle 49.70 / Équilibrée 62 / Experte 84.90) — 2026-09-11
-- AOV peau 14€ → 52€. Livraison 4,90€, gratuite >59€ (K02/K03 gratuits). Bundle −5/−13/−15%.
-- Chaque kit = plan d'assemblage de SKU peau. Tant que C1 n'a pas accepté les composants, les kits restent des formulations cibles : draft, inactifs, non listables et non éligibles au checkout.

INSERT INTO public.products (
  id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity,
  description, image_url, ingredients, hair_types, skin_types, concerns, country_availability, is_active,
  benefit_primary, routine_step, inci, badges, texture, fragrance, contains_fragrance, size_label,
  catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status,
  stock_validation_status, certifications_validation_status, translations_validation_status,
  brand_verification_status, image_ownership_status, supplier_id, source_supplier
) VALUES
(
  'kit-peau-ess-001',
  'kit-peau-essentielle-3-soins',
  'Kit Peau Essentielle — 3 soins',
  'KURLA',
  'kits',
  'Peau',
  49.70,
  false, 0,
  '[KIT PRÉCOMMANDE] Nettoyant doux sans parfum 150ml + Crème céramides 50ml + SPF 50 invisible 40ml. La base barrière + SPF sans trace blanche (phototype V–VI safe). Matin 3 → Soir 2. Économie 2,90€ (−5% vs 52,60€ à l’unité). Livraison 4,90€, gratuite si +1 produit (59€).',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
  ARRAY['Glycérine','Squalane','Céramides NP','Filtres organiques invisibles'],
  ARRAY[]::TEXT[],
  ARRAY['mixte','grasse','sensible','foncée'],
  ARRAY['hydrater_peau','barriere_cutanee','protection_solaire'],
  ARRAY['FR','BE','DOM','INT'],
  false,
  'Uniformiser, barrière',
  'Kit 3 soins — Essentielle',
  'Voir fiche de chaque soin (INCI publiés)',
  ARRAY['kit','essentielle','3-soins','preorder','sans-parfum','invisible','formulation-target'],
  'Kit 3 soins · Matin 3 → Soir 2',
  'Sans parfum ajouté',
  false,
  '3 soins · 49,70€ (−5%)',
  'draft','pending','pending','pending','pending','pending','pending','pending','illustrative',
  'sup-brands-wholesale','KURLA — assemblage kit (formulation cible)'
),
(
  'kit-peau-eq-001',
  'kit-peau-equilibree-5-soins',
  'Kit Peau Équilibrée — 5 soins',
  'KURLA',
  'kits',
  'Peau',
  62.00,
  false, 0,
  '[KIT PRÉCOMMANDE] Essentielle + Sérum niacinamide 5% + Gel acide hyaluronique. Le cœur HPI : uniformiser sans dessécher. Matin 4 → Soir 4. Économie 9,40€ (−13% vs 71,40€). Livraison gratuite (>59€).',
  'https://images.unsplash.com/photo-1570554886111-eafa33934098?auto=format&fit=crop&w=800&q=80',
  ARRAY['Niacinamide 5%','Acide Hyaluronique','Céramides NP','Glycérine','Filtres organiques invisibles'],
  ARRAY[]::TEXT[],
  ARRAY['mixte','grasse','sensible','foncée'],
  ARRAY['hydrater_peau','taches_hyperpigmentation','barriere_cutanee','protection_solaire'],
  ARRAY['FR','BE','DOM','INT'],
  false,
  'Uniformiser, HPI, barrière',
  'Kit 5 soins — Équilibrée',
  'Voir fiche de chaque soin',
  ARRAY['kit','equilibree','5-soins','preorder','sans-parfum','invisible','HPI','formulation-target'],
  'Kit 5 soins · Matin 4 → Soir 4',
  'Sans parfum ajouté',
  false,
  '5 soins · 62€ (−13%) · livraison gratuite',
  'draft','pending','pending','pending','pending','pending','pending','pending','illustrative',
  'sup-brands-wholesale','KURLA — assemblage kit (formulation cible)'
),
(
  'kit-peau-exp-001',
  'kit-peau-experte-7-soins',
  'Kit Peau Experte — 7 soins',
  'KURLA',
  'kits',
  'Peau',
  84.90,
  false, 0,
  '[KIT PRÉCOMMANDE] Équilibrée + Exfoliant AHA/BHA 1×/sem + Baume lèvres céramides. La routine hebdo : grain affiné, taches atténuées. Matin 4 → Soir 5 → Hebdo 1. Économie 14,90€ (−15% vs 99,80€). Livraison gratuite. Rétinol × AHA même soir = alternance soir A/B.',
  'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
  ARRAY['Niacinamide 5%','AHA/BHA','Céramides NP','Acide Hyaluronique','Squalane','Filtres organiques'],
  ARRAY[]::TEXT[],
  ARRAY['mixte','sensible','mature','foncée'],
  ARRAY['taches_hyperpigmentation','hydrater_peau','barriere_cutanee','protection_solaire','grain_irregulier'],
  ARRAY['FR','BE','DOM','INT'],
  false,
  'Uniformiser, grain, HPI',
  'Kit 7 soins — Experte',
  'Voir fiche de chaque soin',
  ARRAY['kit','experte','7-soins','preorder','sans-parfum','invisible','hebdo','formulation-target'],
  'Kit 7 soins · Matin 4 → Soir 5 → Hebdo 1',
  'Sans parfum ajouté',
  false,
  '7 soins · 84,90€ (−15%) · livraison gratuite',
  'draft','pending','pending','pending','pending','pending','pending','pending','illustrative',
  'sup-brands-wholesale','KURLA — assemblage kit (formulation cible)'
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  ingredients = EXCLUDED.ingredients,
  skin_types = EXCLUDED.skin_types,
  concerns = EXCLUDED.concerns,
  badges = EXCLUDED.badges,
  texture = EXCLUDED.texture,
  size_label = EXCLUDED.size_label,
  catalog_status = 'draft', is_active = false, in_stock = false, stock_quantity = 0, updated_at = NOW();

DELETE FROM public.product_variants WHERE product_id IN ('kit-peau-ess-001','kit-peau-eq-001','kit-peau-exp-001');
INSERT INTO public.product_variants (product_id, name, sku, price, stock_quantity) VALUES
  ('kit-peau-ess-001', 'Kit Essentielle 3 soins', 'SKU-KIT-PEAU-ESS-3', 49.70, 0),
  ('kit-peau-eq-001', 'Kit Équilibrée 5 soins', 'SKU-KIT-PEAU-EQ-5', 62.00, 0),
  ('kit-peau-exp-001', 'Kit Experte 7 soins', 'SKU-KIT-PEAU-EXP-7', 84.90, 0);

DELETE FROM public.inventory WHERE product_id IN ('kit-peau-ess-001','kit-peau-eq-001','kit-peau-exp-001');
INSERT INTO public.inventory (product_id, quantity, reserved_quantity) VALUES
  ('kit-peau-ess-001', 0, 0),
  ('kit-peau-eq-001', 0, 0),
  ('kit-peau-exp-001', 0, 0);

DELETE FROM public.product_images WHERE product_id IN ('kit-peau-ess-001','kit-peau-eq-001','kit-peau-exp-001');
INSERT INTO public.product_images (product_id, url, alt, position) VALUES
  ('kit-peau-ess-001', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80', 'Kit Peau Essentielle 3 soins', 1),
  ('kit-peau-eq-001', 'https://images.unsplash.com/photo-1570554886111-eafa33934098?auto=format&fit=crop&w=800&q=80', 'Kit Peau Équilibrée 5 soins', 1),
  ('kit-peau-exp-001', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80', 'Kit Peau Experte 7 soins', 1);

-- Kit composition (si table kit_items existe — idempotent, sinon no-op via DO)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_items') THEN
    DELETE FROM public.kit_items WHERE kit_id IN ('kit-peau-ess-001','kit-peau-eq-001','kit-peau-exp-001');
    INSERT INTO public.kit_items (kit_id, product_id, quantity, position) VALUES
      ('kit-peau-ess-001','peau-ess-001',1,1),
      ('kit-peau-ess-001','peau-ess-002',1,2),
      ('kit-peau-ess-001','peau-ess-003',1,3),
      ('kit-peau-eq-001','peau-ess-001',1,1),
      ('kit-peau-eq-001','peau-ess-002',1,2),
      ('kit-peau-eq-001','peau-ess-003',1,3),
      ('kit-peau-eq-001','peau-ess-006',1,4),
      ('kit-peau-eq-001','peau-ess-011',1,5),
      ('kit-peau-exp-001','peau-ess-001',1,1),
      ('kit-peau-exp-001','peau-ess-002',1,2),
      ('kit-peau-exp-001','peau-ess-003',1,3),
      ('kit-peau-exp-001','peau-ess-006',1,4),
      ('kit-peau-exp-001','peau-ess-011',1,5),
      ('kit-peau-exp-001','peau-ess-005',1,6),
      ('kit-peau-exp-001','peau-ess-013',1,7);
  END IF;
END $$;
