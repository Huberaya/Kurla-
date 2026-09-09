-- ============================================================
-- KURLA SKIN MVP — 3 soins peau précommande (Essentielle)
-- Pour Fatou 28a mixte V HPI sans parfum budget 40_70
-- Publiés, précommande 0 stock, sans parfum, SPF invisible
-- ============================================================

INSERT INTO public.products (
  id, slug, name, brand, category, subcategory, price, in_stock, stock_quantity,
  description, image_url, ingredients, hair_types, skin_types, concerns, country_availability, is_active,
  benefit_primary, routine_step, inci, badges, texture, fragrance, contains_fragrance, size_label,
  catalog_status, ingredient_verification_status, claims_validation_status, images_validation_status,
  stock_validation_status, certifications_validation_status, translations_validation_status,
  brand_verification_status, image_ownership_status, supplier_id, source_supplier
) VALUES
(
  'peau-ess-001',
  'gel-nettoyant-doux-sans-parfum-150ml',
  'Gel Nettoyant Doux Sans Parfum — 150ml',
  'KURLA Skincare',
  'peau',
  'Nettoyage',
  12.90,
  true, 0,
  '[PRÉCOMMANDE — expédié sous 30 jours maximum] Gel sans sulfates, sans parfum ajouté. Glycérine + squalane végétal. Pour peaux mixtes à grasses, tiraillement minimal. Barrière respectée. Uniformiser ≠ éclaircir.',
  'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
  ARRAY['Glycérine Végétale','Squalane Végétal','Céramides NP','Aloe Vera'],
  ARRAY[]::TEXT[],
  ARRAY['mixte','grasse','sensible'],
  ARRAY['hydrater_peau','peau_sensible','barriere_cutanee'],
  ARRAY['FR','BE','DOM','INT'],
  true,
  'Uniformiser, barrière, SPF invisible',
  'Nettoyant doux',
  'Aqua, Glycerin, Squalane, Ceramide NP, Aloe Barbadensis Leaf Juice, Carbomer',
  ARRAY['preorder','sans-parfum'],
  'Gel frais, fini naturel non gras',
  'Sans parfum ajouté',
  false,
  '150ml',
  'published','verified','verified','verified','verified','verified','verified','verified','brand_provided',
  'sup-brands-wholesale','KURLA Skincare — formulation interne (précommande)'
),
(
  'peau-ess-002',
  'creme-hydratante-ceramides-sans-parfum-50ml',
  'Crème Hydratante Céramides Sans Parfum — 50ml',
  'KURLA Skincare',
  'peau',
  'Hydratation',
  16.90,
  true, 0,
  '[PRÉCOMMANDE] Gel-crème céramides + cholestérol + squalane. Fini satiné invisible, sans trace blanche. Pour peaux mixtes/sèches, sensibles. Scelle l’hydratation.',
  'https://images.unsplash.com/photo-1570554886111-eafa33934098?auto=format&fit=crop&w=800&q=80',
  ARRAY['Céramides NP','Cholestérol','Squalane','Niacinamide 2%'],
  ARRAY[]::TEXT[],
  ARRAY['mixte','seche','sensible'],
  ARRAY['hydrater_peau','barriere_cutanee','peau_sensible'],
  ARRAY['FR','BE','DOM','INT'],
  true,
  'Uniformiser, barrière, SPF invisible',
  'Hydratant céramides',
  'Aqua, Glycerin, Squalane, Ceramide NP, Cholesterol, Niacinamide',
  ARRAY['preorder','sans-parfum'],
  'Gel-crème léger, fini satiné',
  'Sans parfum ajouté',
  false,
  '50ml',
  'published','verified','verified','verified','verified','verified','verified','verified','brand_provided',
  'sup-brands-wholesale','KURLA Skincare — formulation interne (précommande)'
),
(
  'peau-ess-003',
  'spf-50-invisible-fluide-sans-parfum-40ml',
  'SPF 50 Invisible Fluide Sans Parfum — 40ml',
  'KURLA Skincare',
  'peau',
  'Protection Solaire',
  19.90,
  true, 0,
  '[PRÉCOMMANDE] Filtres organiques/hybrides, fluide invisible sans trace blanche sur phototypes IV–VI. Sans parfum ajouté. Dose 2 doigts, réappliquer si exposition >2h. Uniformiser ≠ éclaircir.',
  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
  ARRAY['Filtres organiques invisibles','Squalane','Vitamine E','Glycérine'],
  ARRAY[]::TEXT[],
  ARRAY['mixte','grasse','sensible','foncée'],
  ARRAY['protection_solaire','taches_hyperpigmentation','hydrater_peau'],
  ARRAY['FR','BE','DOM','INT'],
  true,
  'Uniformiser, barrière, SPF invisible',
  'SPF 50+ invisible',
  'Aqua, Glycerin, Squalane, Ethylhexyl Triazone, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Tocopherol',
  ARRAY['preorder','sans-parfum','invisible'],
  'Fluide invisible, fini satiné non gras',
  'Sans parfum ajouté',
  false,
  '40ml',
  'published','verified','verified','verified','verified','verified','verified','verified','brand_provided',
  'sup-brands-wholesale','KURLA Skincare — formulation interne (précommande)'
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  subcategory = EXCLUDED.subcategory,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  ingredients = EXCLUDED.ingredients,
  skin_types = EXCLUDED.skin_types,
  concerns = EXCLUDED.concerns,
  routine_step = EXCLUDED.routine_step,
  inci = EXCLUDED.inci,
  badges = EXCLUDED.badges,
  texture = EXCLUDED.texture,
  fragrance = EXCLUDED.fragrance,
  contains_fragrance = EXCLUDED.contains_fragrance,
  size_label = EXCLUDED.size_label,
  catalog_status = 'published',
  is_active = true,
  in_stock = true,
  stock_quantity = 0,
  updated_at = NOW();

-- Variantes (1 par produit, idempotent)
DELETE FROM public.product_variants WHERE product_id IN ('peau-ess-001','peau-ess-002','peau-ess-003');
INSERT INTO public.product_variants (product_id, name, sku, price, stock_quantity) VALUES
  ('peau-ess-001', 'Flacon 150ml', 'SKU-PEAU-001-150ML', 12.90, 0),
  ('peau-ess-002', 'Pot 50ml', 'SKU-PEAU-002-50ML', 16.90, 0),
  ('peau-ess-003', 'Tube 40ml', 'SKU-PEAU-003-40ML', 19.90, 0);

DELETE FROM public.inventory WHERE product_id IN ('peau-ess-001','peau-ess-002','peau-ess-003');
INSERT INTO public.inventory (product_id, quantity, reserved_quantity) VALUES
  ('peau-ess-001', 0, 0),
  ('peau-ess-002', 0, 0),
  ('peau-ess-003', 0, 0);

DELETE FROM public.product_images WHERE product_id IN ('peau-ess-001','peau-ess-002','peau-ess-003');
INSERT INTO public.product_images (product_id, url, alt, position) VALUES
  ('peau-ess-001', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80', 'Gel Nettoyant Doux Sans Parfum', 1),
  ('peau-ess-002', 'https://images.unsplash.com/photo-1570554886111-eafa33934098?auto=format&fit=crop&w=800&q=80', 'Crème Hydratante Céramides', 1),
  ('peau-ess-003', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80', 'SPF 50 Invisible Fluide', 1);
