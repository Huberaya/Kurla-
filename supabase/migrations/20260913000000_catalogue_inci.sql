-- ============================================================================
-- Compositions INCI du catalogue — chantier B-02
-- ============================================================================
-- Règlement (CE) n° 1223/2009, art. 19 : un produit cosmétique ne peut être
-- mis sur le marché sans sa liste des ingrédients. Les compositions ci-dessous
-- proviennent d'une fiche publique du fabricant, d'INCIdecoder (l'adresse est
-- conservée dans inci_source), de la définition d'un produit monocomposant,
-- ou renvoient vers les fiches des produits d'un kit. Aucune n'a été
-- reconstituée au jugé.
--
-- Idempotent : rejouable sans effacer une correction manuelle ultérieure,
-- hormis sur les champs que la migration revendique (inci, inci_source).
-- ============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inci_source TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inci_sourced_at TIMESTAMPTZ;

-- launch-k01
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Cantu Sulfate-Free Cleansing Cream Shampoo → launch-p01 · Cantu Hydrating Cream Conditioner → launch-p04 · Kinky-Curly Knot Today Leave-In → launch-p07 · Aunt Jackie''s Don''t Shrink Flaxseed Gel → launch-p29.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k01';

-- launch-k02
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Cantu Sulfate-Free Cleansing Cream Shampoo → launch-p01 · Cantu Hydrating Cream Conditioner → launch-p04 · Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Aunt Jackie''s Don''t Shrink Flaxseed Gel → launch-p29 · Mielle Rosemary Mint Strengthening Oil → launch-p11.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k02';

-- launch-k03
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : As I Am Classic Coconut CoWash → launch-p03 · SheaMoisture Raw Shea Butter Deep Treatment Masque → launch-p05 · Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Beurre de karité brut 100 % → launch-p09 · Camille Rose Almond Jai Twisting Butter → launch-p12.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k03';

-- launch-k04
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : ApHogee Two-Step Protein Treatment → launch-p52 · SheaMoisture Raw Shea Butter Deep Treatment Masque → launch-p05 · Sunny Isle Jamaican Black Castor Oil → launch-p10 · Mielle Rosemary Mint Strengthening Oil → launch-p11 · Kinky-Curly Knot Today Leave-In → launch-p07.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k04';

-- launch-k05
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Camille Rose Almond Jai Twisting Butter → launch-p12 · Eco Style Olive Oil Gel Max Hold → launch-p14 · Bonnet satin nuit + taie d''oreiller → launch-p17.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k05';

-- launch-k06
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : As I Am Classic Coconut CoWash → launch-p03 · SheaMoisture Raw Shea Butter Deep Treatment Masque → launch-p05 · Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Beurre de karité brut 100 % → launch-p09 · Camille Rose Almond Jai Twisting Butter → launch-p12 · Eco Style Olive Oil Gel Max Hold → launch-p14 · Bonnet satin nuit + taie d''oreiller → launch-p17.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k06';

-- launch-k08
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Outil interlocking / aiguille d’entretien des locs → launch-p42 · Éponge twist / curl sponge → launch-p41 · Peigne à queue de rat métal → launch-p38 · Durag satin → launch-p46 · Filet de protection tresses & vanilles → launch-p27.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k08';

-- launch-k10
UPDATE public.products SET
  inci = '[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Bonnet chauffant soin profond → launch-p44 · Steamer portable cheveux → launch-p47 · Brosse massage cuir chevelu silicone → launch-p36 · Serviette microfibre boucles → launch-p37.',
  inci_source = 'Kit — composition des produits inclus, détaillée sur chaque fiche',
  inci_sourced_at = now()
WHERE id = 'launch-k10';

-- launch-p01
UPDATE public.products SET
  inci = 'Aqua (Water), Sodium C14-16 Olefin Sulfonate, Cocamidopropyl Betaine, Acrylates Copolymer, Cocamide Dipa, Glycerin, Glycol Distearate, Steareth-4, Phenoxyethanol, Parfum (Fragrance), PEG-150 Distearate, Butyrospermum Parkii (Shea) Butter, Polyquaternium-39, Polyester-11, Sodium Hydroxide, Guar Hydroxypropyltrimonium Chloride, Disodium EDTA, Panthenol, Ethylhexylglycerin, Polysorbate 20, Sodium Chloride, Citric Acid, Benzyl Benzoate',
  inci_source = 'https://incidecoder.com/products/cantu-shea-butter-for-natural-hair-sulfate-free-cleansing-cream-shampoo',
  inci_sourced_at = now()
WHERE id = 'launch-p01';

-- launch-p02
UPDATE public.products SET
  inci = 'Aqua/Water/Eau, Sodium Lauroyl Sarcosinate, Cocamidopropyl Betaine, Hydroxypropyl Methylcellulose, Cocos Nucifera (Coconut) Fruit Powder, Phyllanthus Emblica Fruit Powder, Citrus Reticulata (Tangerine) Fruit Extract, Fragrance/Parfum, Citric Acid, Phenoxyethanol, Caprylyl Glycol, Sodium Benzoate, Limonene',
  inci_source = 'https://incidecoder.com/products/as-i-am-curl-clarity-shampoo',
  inci_sourced_at = now()
WHERE id = 'launch-p02';

-- launch-p03
UPDATE public.products SET
  inci = 'Aqua/Water/Eau, Cetyl Alcohol, Cetrimonium Chloride, Cocos Nucifera (Coconut) Oil, Ricinus Communis (Castor) Seed Oil, Cocos Nucifera (Coconut) Fruit Powder, Citrus Reticulata (Tangerine) Fruit Extract, Phytosterols, PEG-40 Castor Oil, Cetearyl Alcohol, Stearalkonium Chloride, Serenoa Serrulata Fruit Extract, Quaternium-18, Propylene Glycol, C12-15 Alkyl Lactate, Fragrance/Parfum (Limonene), Potassium Sorbate, Caprylyl Glycol, Phenoxyethanol, Caprylic/Capric Triglyceride, Abies Balsamea (Balsam Canada) Resin, Potassium Chloride',
  inci_source = 'https://incidecoder.com/products/as-i-am-coconut-cowash',
  inci_sourced_at = now()
WHERE id = 'launch-p03';

-- launch-p04
UPDATE public.products SET
  inci = 'Water (Aqua), Stearyl Alcohol, Cetyl Alcohol, Butyrospermum Parkii (Shea) Butter, Stearamidopropyl Dimethylamine, Glyceryl Stearate, Thiamine (Vitamin B1), Riboflavin (Vitamin B2), Niacin (Vitamin B3), Pantothenic Acid (Vitamin B5), Pyridoxine Hcl (Vitamin B6), Biotin (Vitamin B7), Folic Acid (Vitamin B9), Cyanocobalamin (Vitamin B12), Leuconostoc/Radish Root Ferment Filtrate, Polyquaternium-7, Sodium Benzoate, Neopentyl Glycol Diheptanoate, Fragrance (Parfum), Isododecane, Panthenol, Polyester-11, Lactic Acid, Disodium EDTA, Phenoxyethanol, Ethylhexylglycerin, Benzyl Benzoate',
  inci_source = 'https://incidecoder.com/products/cantu-shea-butter-sulfate-free-hydrating-cream-conditioner',
  inci_sourced_at = now()
WHERE id = 'launch-p04';

-- launch-p05
UPDATE public.products SET
  inci = 'Water, Glycerin (Vegetable), Butyrospermum Parkii (Shea) Butter*^, Ricinus Communis (Castor) Seed Oil, Cetyl Alcohol, Stearyl Alcohol, Glyceryl Stearate Citrate, Cetearyl Alcohol, Olea Europaea (Olive) Fruit Oil, Fragrance, Cocos Nucifera (Coconut) Oil, Persea Gratissima (Avocado) Oil, Panthenol, Glycine Soja (Soybean) Oil, Argania Spinosa (Argan) Kernel Oil, Cetrimonium Chloride, Equisetum Arvense (Horsetail) Extract, Tocopherol, Boswellia Serrata (Frankincense) Extract, Commiphora Myrrha (Myrrh) Resin Extract, Daucus Carota Sativa (Carrot) Root Extract, Beta-Carotene, Hydrolyzed Vegetable Protein Pg-Propyl Silanetriol, Macrocystis Pyrifera (Kelp) Extract, Sodium Benzoate, Glyceryl Caprylate, Potassium Sorbate, Triethyl Citrate, Caprylyl Glycol, Benzoic Acid',
  inci_source = 'https://incidecoder.com/products/sheamoisture-raw-shea-butter-deep-treatment-masque-with-sea-kelp-and-argan-oil',
  inci_sourced_at = now()
WHERE id = 'launch-p05';

-- launch-p06
UPDATE public.products SET
  inci = 'Water, Cetearyl Alcohol, Cocos Nucifera (Coconut) Oil, Glycerin (Vegetable), Butyrospermum Parkii Shea) Butter, Stearyl Alcohol, Cetyl Alcohol, Behentrimonium Methosulfate, Fragrance (Essential Oil Blend), Behentrimonium Chloride, Panthenol, Hydrolyzed Vegetable Protein Pg-Propyl Silanetriol, Cetrimonium Chloride, Persea Gratissima (Avocado) Oil, Mangifera Indica (Mango) Seed Butter, Olea Europaea (Olive) Fruit Oil, Mentha Piperita (Peppermint) Leaf Extract, Ricinus Communis (Castor) Seed Oil, Mauritia Flexuosa Fruit Oil, Yeast Extract, Hydrolyzed Keratin, Macadamia Ternifolia Seed Oil, Tocopherol, Hydrogenated Vegetable Oil, Niacin, Aloe Barbadensis Leaf Juice, Vinegar, Caprylhydroxamic Acid, Caprylyl Glycol, Trifolium Pratense (Clover) Flower Extract, Caramel',
  inci_source = 'https://incidecoder.com/products/sheamoisture-jamaican-black-castor-oil-strengthen-and-restore-masque',
  inci_sourced_at = now()
WHERE id = 'launch-p06';

-- launch-p07
UPDATE public.products SET
  inci = 'Organic Mango Fruit Extract, Organic Slippery Elm, Organic Marshmallow Root, Organic Lemongrass, Cetyl Alcohol, *Behentrimonium Methosulfate, Citric Acid, Phenoxyethanol, Natural Fragrance',
  inci_source = 'https://incidecoder.com/products/kinky-curly-knot-today-odzywka-bez-splukiwania',
  inci_sourced_at = now()
WHERE id = 'launch-p07';

-- launch-p08
UPDATE public.products SET
  inci = 'Deionized Water, Behentrimonium Methosulfate (Btms), Cetearyl Alcohol, Persea Gratissima (Avocado) Oil, Oryza Sativa (Rice) Bran Oil, Aloe Barbadensis Leaf Juice, Ricinus Communis (Castor) Seed Oil, Macadamia Ternifolia Seed Oil, Sorbitol, Camellia Sinensis (Green Tea) Leaf Extract, Oryza Sativa (Rice) Milk, Rosa Canina (Rosehip) Fruit Oil, Ceteareth-20, Ulmus Fulva (Slippery Elm) Bark Extract, Phenoxyethanol (Optiphen Nd), Caprylyl Glycol, Phthalate Free Fragrance',
  inci_source = 'https://incidecoder.com/products/camille-rose-curl-love-moisture-milk',
  inci_sourced_at = now()
WHERE id = 'launch-p08';

-- launch-p09
UPDATE public.products SET
  ingredients = ARRAY['Beurre de Karité']::TEXT[],
  inci = 'Butyrospermum Parkii (Shea) Butter',
  inci_source = 'Définition du produit — Beurre de karité brut non raffiné, un seul ingrédient : la composition est celle du produit lui-même.',
  inci_sourced_at = now()
WHERE id = 'launch-p09';

-- launch-p10
UPDATE public.products SET
  ingredients = ARRAY['Huile de Ricin']::TEXT[],
  inci = 'Ricinus Communis (Castor) Seed Oil',
  inci_source = 'Définition du produit — Huile de ricin noire jamaïcaine, un seul ingrédient. La torréfaction des graines ne modifie pas la nomenclature INCI.',
  inci_sourced_at = now()
WHERE id = 'launch-p10';

-- launch-p11
UPDATE public.products SET
  ingredients = ARRAY['Huile de Ricin', 'Huile de Coco', 'Romarin', 'Menthe Poivrée', 'Aloe Vera']::TEXT[],
  inci = 'Vitis Vinifera (Grape) Seed Oil, Glycine Soja (Soybean) Oil, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Ricinus Communis (Castor) Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Mentha Piperita (Peppermint) Oil, Rosmarinus Officinalis (Rosemary) Leaf Oil, Eucalyptus Globulus Leaf Oil, Menthol, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Rosmarinus Officinalis Leaf Extract, Helianthus Annuus (Sunflower) Seed Oil, Lavandula Angustifolia (Lavender) Oil, Triticum Vulgare (Wheat) Germ Oil, Cocos Nucifera (Coconut) Oil, Carthamus Tinctorius (Safflower) Seed Oil, Aloe Barbadensis Leaf Extract, Oenothera Biennis (Evening Primrose) Oil, Oryza Sativa (Rice) Bran Oil, Tocopheryl Acetate, Benzyl Nicotinate, Biotin, Pogostemon Cablin (Patchouli) Leaf Oil, Ocimum Sanctum, Ho Leaf Oil, Salvia Officinalis (Sage) Oil, Apium Graveolens (Celery Seed) Extract, Equisetum Arvense (Horsetail) Extract, Arctium Lappa (Burdock Root) Extract, Urtica Dioica (Nettle) Extract, Silica, Glycerin, Ascorbic Acid, Cholecalciferol (Vitamin D)',
  inci_source = 'https://incidecoder.com/products/mielle-organics-rosemary-mint-scalp-hair-strengthening-oil-light',
  inci_sourced_at = now()
WHERE id = 'launch-p11';

-- launch-p12
UPDATE public.products SET
  inci = 'Deionized Water, Behentrimonium Methosulfate, Cetearyl Alcohol, Prunus Amygdalus Dulcis Fruit Extract, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Cucurbita Pepo (Pumpkin) Seed Oil, Sesamum Indicum (Sesame) Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Oryza Sativa (Rice) Bran Oil, Macadamia Ternifolia Seed Oil, Olea Europaea (Olive) Fruit Oil, Cannabis Sativa Seed Oil, Ulmus Fulva Bark (Slippery Elm) Extract, Ricinus Communis (Castor) Seed Oil, Aloe Barbadensis Leaf Juice, Cera Alba, Camellia Sinensis Leaf Extract, Phenoxyethanol (Optiphen Nd), Caprylyl Glycol, Phthalate Free Fragrance',
  inci_source = 'https://incidecoder.com/products/camille-rose-almond-jai-twisting-butter-2',
  inci_sourced_at = now()
WHERE id = 'launch-p12';

-- launch-p13
UPDATE public.products SET
  inci = 'Botanical Infusion Of Water/Aqua, Equisetum Arvense/Horsetail, Chamomile, Urtica Dioica/Nettle, Althea Officinalis, Marshmallow, Organic Aloe Vera Juice, Agave Tequilana, Agave Nectar Extract, Tocopheryl Acetate / Vitamin E, Pectin, Citric Acid, Potassium Sorbate, Fragrance',
  inci_source = 'https://incidecoder.com/products/kinky-curly-original-curling-custard-natural-hair-styling-gel',
  inci_sourced_at = now()
WHERE id = 'launch-p13';

-- launch-p14
UPDATE public.products SET
  inci = 'Agua, Carbomer, Triethanolamine, Olea Europaea (Olive) Fruit Oil, Hydrolyzed Wheat Protein, Glycerine, Polysorbate 20, Tetrasodium EDTA, Sodium Hydroxymethylglycinate, PVP, Fragrance, Yellow 5 (Ci19140)',
  inci_source = 'https://incidecoder.com/products/eco-styler-olive-oil-styling-gel',
  inci_sourced_at = now()
WHERE id = 'launch-p14';

-- launch-p15
UPDATE public.products SET
  inci = 'Deionized Water, Polyquaternium-11, Decyl Glucoside, Cetrimonium Chloride, PEG-12 Dimethicone, Methyl Gluceth-10, Polysorbate 20, Fragrance, PEG-75 Lanolin, Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate, Citric Acid, Hydrolyzed Wheat Protein, Sweet Almond Fruit Extract, Avocado Fruit Extract, Shea Leaf Extract, Olive Fruit Extract, Jojoba Seed Extract, Coconut Fruit Extract, Kukui Seed Fruit Extract, Panthenol, FD&C Yellow No. 5, FD&C Blue No. 5, Benzyl Benzoate, Linalool',
  inci_source = 'https://incidecoder.com/products/design-essentials-almond-avocado-curl-enhancing-mousse',
  inci_sourced_at = now()
WHERE id = 'launch-p15';

-- launch-p29
UPDATE public.products SET
  inci = 'Aqua, Glycerin, Carbomer, Aminomethyl Propanol, Hydrolyzed Wheat Protein, Linum Usitatissimum Seed Oil, Potassium Sorbate, Polyvinylpyrrolidone, Polysorbate 20, Parfum, Edta, Magnesium Nitrate, Phenoxyethanol, Polyaminopropyl Biguanide, Methylchloroisothiazolinone, Magnesium Chloride, Methylisothiazolinone, Limonene, Hexyl Cinnamal, Linalool, Amyl Cinnamal, Butylphenyl Methylpropional',
  inci_source = 'https://incidecoder.com/products/aunt-jackies-dont-shrink-flaxseed-elongating-curling-gel',
  inci_sourced_at = now()
WHERE id = 'launch-p29';

-- launch-p30
UPDATE public.products SET
  inci = 'Aqua (Water), PEG-25 Hydrogenated Castor Oil, PEG-7 Glyceryl Cocoate, Cocamidopropyl Betaine, Phenoxyethanol, Benzyl Alcohol, Parfum (Fragrance), Cetrimonium Chloride, Polyquaternium-11, Polyquaternium-55, Sodium Chloride, Panthenol (Vitamin B5), Citric Acid, Butyrospermum Parkii (Shea) Butter, Coumarin, Benzyl Benzoate, Hexyl Cinnamal',
  inci_source = 'https://incidecoder.com/products/cantu-wave-whip-curling-mousse',
  inci_sourced_at = now()
WHERE id = 'launch-p30';

-- launch-p31
UPDATE public.products SET
  ingredients = ARRAY['Huile de Ricin']::TEXT[],
  inci = 'Ricinus Communis (Castor) Seed Oil',
  inci_source = 'Définition du produit — Huile de ricin noire jamaïcaine, un seul ingrédient. La torréfaction des graines ne modifie pas la nomenclature INCI.',
  inci_sourced_at = now()
WHERE id = 'launch-p31';

-- launch-p32
UPDATE public.products SET
  inci = 'Water (Aqua), Glycerin, Polysorbate 20, Fragrance, PEG-40 Hydrogenated Castor Oil, Butyrospermum Parkii Butter (Shea), Magnesium Sulfate, Guar Hydroxypropyltrimonium Chloride, Citric Acid, Methylisothiazolinone, Phenoxyethanol',
  inci_source = 'https://incidecoder.com/products/cantu-shea-butter-comeback-curl',
  inci_sourced_at = now()
WHERE id = 'launch-p32';

-- launch-p33
UPDATE public.products SET
  inci = 'Distilled Water, Decyl Glucoside, Coco-Glucoside, Glyceryl Oleate, Glycerin, Hydroxypropyltrimonium Honey, Sesamum Indicum | Sesame Seed Oil, Olea Europaea (Olive) Fruit Oil, Mentha Piperita (Peppermint Oil), Xanthan Gum, Natural Fragrance, Phenoxyethanol, Guar Hydroxypropyltrimonium Chloride, Cassia Gum, Stearyl Alcohol, Phytic Acid',
  inci_source = 'https://incidecoder.com/products/camille-rose-naturals-clean-rinse-moisturising-and-clarifying-shampoo',
  inci_sourced_at = now()
WHERE id = 'launch-p33';

-- launch-p34
UPDATE public.products SET
  inci = 'Water (Aqua, Eau), Glycerin, Pectin, Hydrolyzed Corn Starch, Polysorbate 20, Xanthan Gum, Hydroxyethylcellulose, Carrageenan, Fragrance (Parfum), Orbignya Oleifera (Babassu) Oil, Mauritia Flexuosa (Buriti) Fruit Oil, Copaifera Officinalis (Balsam Copaiba) Resin, Astrocaryum Murumuru Seed Butter, Cocos Nucifera (Coconut) Oil, Punica Granatum (Pomegranate) Extract, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Honey (Mel, Miel), Persea Gratissima (Avocado) Oil, Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate',
  inci_source = 'https://incidecoder.com/products/mielle-organics-pomegranate-honey-curl-smoothie',
  inci_sourced_at = now()
WHERE id = 'launch-p34';

-- launch-p51
UPDATE public.products SET
  inci = 'Water (Aqua, Eau), Cetearyl Alcohol, Polysorbate 60, Amodimethicone, Cetrimonium Chloride, Trideceth-12, Glycerin, Propylene Glycol, PEG-12 Dimethicone, Polysorbate 20, PVP, Organic -Prunus Amygdalus Dulcis (Sweet Almond) Oil, Organic -Plukenetia Volubilis (Sacha Inchi) Seed Oil, Organic -Argania Kernel Spinosa (Argan) Oil, Organic-Schinziophyton Rautanenii (Mongongo) Kernel Oil, Organic -Vitis Vinifera (Grape) Seed Oil, Disodium EDTA, Tocopheryl Acetate, Cyclopentasiloxane, Dimethiconol, Hydrolyzed Wheat Protein, Fragrance (Parfum), Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate',
  inci_source = 'https://incidecoder.com/products/mielle-mongongo-oil-thermal-heat-protectant-spray',
  inci_sourced_at = now()
WHERE id = 'launch-p51';

-- launch-p52
UPDATE public.products SET
  inci = 'Water (Aqua, Eau), Hydrolyzed Collagen, Citric Acid, Magnesium Sulfate, Imidazolidinone, Panthenol, Tocopheryl Acetate, Mauritia Flexuosa Fruit Oil, Hydrolyzed Vegetable Protein Pg-Propyl Silanetriol, Phytantriol, Magnesium Carbonate, Cocamidopropyl Betaine, Dimethylol Urea, Trimethylsiloxyamodimethicone, C11-15 Pareth-7, C12-16 Pareth-9, Glycerin, Trideceth-12, DMDM Hydantoin, Fragrance (Parfum), Linalool',
  inci_source = 'https://incidecoder.com/products/aphogee-two-step-protein-treatment',
  inci_sourced_at = now()
WHERE id = 'launch-p52';

-- launch-p53
UPDATE public.products SET
  ingredients = ARRAY['Huile de Coco', 'Romarin', 'Aloe Vera', 'Avocat', 'Panthénol']::TEXT[],
  inci = 'Aqua (Water), Hydrolyzed Pea Protein Pg-Propyl Silanetriol, Polysorbate 20, Cetearyl Alcohol, Dimethicone, Persea Gratissima (Avocado) Oil, Bis-PEG/PPG-20/20 Dimethicone, Phenoxyethanol, Behentrimonium Methosulfate, Rosmarinus Officinalis (Rosemary) Leaf Water, Helianthus Annuus (Sunflower) Seed Oil, Cocos Nucifera (Coconut) Oil, Parfum (Fragrance), Astrocaryum Murumuru (Murumuru) Seed Butter, Sodium Hyaluronate Crosspolymer, Withania Somnifera (Ashwagandha) Root Oil, Eclipta Alba (Bhringraj) Oil, Bacopa Monnieri (Brahni) Oil, Emblica Officinalis (Amla) Oil, Ocimum Basilicum Hairy Root Culture Extract, Aloe Barbadensis (Aloe Vera) Leaf Juice, Panthenol, Triethylene Glycol, Pentylene Glycol, Linalool, Citronellol, Linalyl Acetate, Alpha-Isomethyl Ionone, Tetramethyl Acetyloctahydronaphthalenes, Limonene, Hexyl Cinnamal, Geraniol, Cinnamyl Alcohol, Pinene, Mentha Viridis Leaf Oil, Menthol, Citrus Limon Peel Oil, Carvone, Geranyl Acetate, Hexamethylindanopyran, Citral, Camphor',
  inci_source = 'https://incidecoder.com/products/nature-spell-growth-conplex-rosemary-water-leave-in-conditioner',
  inci_sourced_at = now()
WHERE id = 'launch-p53';

-- launch-p54
UPDATE public.products SET
  inci = 'Aqua/Water/Eau, PEG-40 Castor Oil, Glycerin, Parfum (Fragrance), Acetum (Vinegar), Cetrimonium Chloride, Panthenol, Menthyl Lactate, Menthol, Isopulegol, Argania Spinosa Kernel Oil, Propylene Glycol, Cocodimonium Hydroxypropyl Hydrolyzed Keratin, Rosmarinus Officinalis (Rosemary) Leaf Extract, Hydrolyzed Rice Protein, Tocopheryl Acetate, Camellia Sinensis Leaf Extract, Citric Acid, Tetrasodium EDTA, Polyquaternium-4, Phenoxyethanol, Sodium Benzoate, Yellow 5 (Ci 19140), Red 40 (Ci 16035), Blue 1 (Ci 42090)',
  inci_source = 'https://incidecoder.com/products/creme-of-nature-apple-cider-vinegar-clarifying-rinse',
  inci_sourced_at = now()
WHERE id = 'launch-p54';

-- p14
UPDATE public.products SET
  inci = 'Water/Aqua, Caprylic/Capric Triglyceride, Glycerin, Crambe Abyssinica Seed Oil Phytosterol Esters, Niacinamide, Glyceryl Stearate SE, Methylpropanediol, Polyglyceryl-6 Laurate, Polyglyceryl-10 Oleate, Ceteareth-20, Cetearyl Alcohol, Phenoxyethanol, Caprylyl Glycol, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Sorbitan Palmitate, Sodium Phytate, Glycyrrhiza Glabra (Licorice) Root Extract, Cellulose Gum, 3-O-Ethyl Ascorbic Acid, Honokiol, Magnolol, Plankton Extract, Bromelain, Papain, Lecithin, Sodium Hydroxide, Algin, Sodium Ascorbate, Tocopherol',
  inci_source = 'https://incidecoder.com/products/eadem-milk-marvel-dark-spot-serum',
  inci_sourced_at = now()
WHERE id = 'p14';

-- Composition introuvable : ni la marque ni INCIdecoder ne la publient.
-- Le produit reste en base mais quitte la vente : afficher une composition
-- reconstituée serait une fausse déclaration réglementaire.
--   Produits concernés :
--   launch-p28
--   p1
--   p10
--   p11
--   p12
--   p13
--   p15
--   p16
--   p2
--   p3
--   p4
--   p5
--   p6
--   p7
--   p8
--   p9
UPDATE public.products
SET catalog_status = 'unavailable',
    inci_source = 'Composition non sourçable — retiré de la vente en attendant la fiche fabricant',
    inci_sourced_at = now()
WHERE id IN ('launch-p28', 'p1', 'p10', 'p11', 'p12', 'p13', 'p15', 'p16', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9')
  AND catalog_status = 'published';
