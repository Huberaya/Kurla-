// GÉNÉRÉ AUTOMATIQUEMENT — ne pas éditer à la main.
// Relancer : python3 scripts/buildCatalogueInci.py
//
// Listes INCI du catalogue KURLA. Une composition cosmétique est une donnée
// réglementaire (règlement (CE) n° 1223/2009, art. 19) : elle est recopiée d’une
// source citée, déduite de la définition d’un produit monocomposant, ou renvoyée
// vers les fiches des produits inclus pour un kit. Jamais inventée.
//
// `provenance: 'introuvable'` signifie qu’aucune source publique ne donne la
// composition : le produit doit être retiré de la vente, pas complété au jugé.

export type InciProvenance = 'source' | 'definition' | 'kit' | 'introuvable';

export interface CatalogueInciEntry {
  productId: string;
  /** Liste INCI complète, telle que publiée par la source. */
  inci: string;
  provenance: InciProvenance;
  /** Page exacte consultée — permet de revérifier la composition. */
  sourceUrl?: string;
  /** Titre de la fiche source, pour contrôler la correspondance. */
  sourceTitle?: string;
  /** Ingrédients clés en français, dérivés de la composition réelle. */
  keyIngredients?: string[];
  /** Produits inclus, pour un kit. */
  components?: string[];
  note?: string;
}

export const CATALOGUE_INCI: CatalogueInciEntry[] = [
  {
    productId: "launch-k01",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Cantu Sulfate-Free Cleansing Cream Shampoo → launch-p01 · Cantu Hydrating Cream Conditioner → launch-p04 · Kinky-Curly Knot Today Leave-In → launch-p07 · Aunt Jackie's Don't Shrink Flaxseed Gel → launch-p29.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p01", "launch-p04", "launch-p07", "launch-p29"],
  },
  {
    productId: "launch-k02",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Cantu Sulfate-Free Cleansing Cream Shampoo → launch-p01 · Cantu Hydrating Cream Conditioner → launch-p04 · Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Aunt Jackie's Don't Shrink Flaxseed Gel → launch-p29 · Mielle Rosemary Mint Strengthening Oil → launch-p11.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p01", "launch-p04", "launch-p34", "launch-p29", "launch-p11"],
  },
  {
    productId: "launch-k03",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : As I Am Classic Coconut CoWash → launch-p03 · SheaMoisture Raw Shea Butter Deep Treatment Masque → launch-p05 · Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Beurre de karité brut 100 % → launch-p09 · Camille Rose Almond Jai Twisting Butter → launch-p12.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p03", "launch-p05", "launch-p34", "launch-p09", "launch-p12"],
  },
  {
    productId: "launch-k04",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : ApHogee Two-Step Protein Treatment → launch-p52 · SheaMoisture Raw Shea Butter Deep Treatment Masque → launch-p05 · Sunny Isle Jamaican Black Castor Oil → launch-p10 · Mielle Rosemary Mint Strengthening Oil → launch-p11 · Kinky-Curly Knot Today Leave-In → launch-p07.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p52", "launch-p05", "launch-p10", "launch-p11", "launch-p07"],
  },
  {
    productId: "launch-k05",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Camille Rose Almond Jai Twisting Butter → launch-p12 · Eco Style Olive Oil Gel Max Hold → launch-p14 · Bonnet satin nuit + taie d'oreiller → launch-p17.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p34", "launch-p12", "launch-p14", "launch-p17"],
  },
  {
    productId: "launch-k06",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : As I Am Classic Coconut CoWash → launch-p03 · SheaMoisture Raw Shea Butter Deep Treatment Masque → launch-p05 · Mielle Pomegranate & Honey Curl Smoothie → launch-p34 · Beurre de karité brut 100 % → launch-p09 · Camille Rose Almond Jai Twisting Butter → launch-p12 · Eco Style Olive Oil Gel Max Hold → launch-p14 · Bonnet satin nuit + taie d'oreiller → launch-p17.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p03", "launch-p05", "launch-p34", "launch-p09", "launch-p12", "launch-p14", "launch-p17"],
  },
  {
    productId: "launch-k08",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Outil interlocking / aiguille d’entretien des locs → launch-p42 · Éponge twist / curl sponge → launch-p41 · Peigne à queue de rat métal → launch-p38 · Durag satin → launch-p46 · Filet de protection tresses & vanilles → launch-p27.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p42", "launch-p41", "launch-p38", "launch-p46", "launch-p27"],
  },
  {
    productId: "launch-k10",
    inci: "[Kit] La composition est celle des produits inclus, détaillée sur chaque fiche : Bonnet chauffant soin profond → launch-p44 · Steamer portable cheveux → launch-p47 · Brosse massage cuir chevelu silicone → launch-p36 · Serviette microfibre boucles → launch-p37.",
    provenance: "kit",
    note: "Un kit n’a pas de composition propre : la réglementation impose la liste des ingrédients de chaque produit qui le compose, consultable sur la fiche correspondante.",
    components: ["launch-p44", "launch-p47", "launch-p36", "launch-p37"],
  },
  {
    productId: "launch-p01",
    inci: "Aqua (Water), Sodium C14-16 Olefin Sulfonate, Cocamidopropyl Betaine, Acrylates Copolymer, Cocamide Dipa, Glycerin, Glycol Distearate, Steareth-4, Phenoxyethanol, Parfum (Fragrance), PEG-150 Distearate, Butyrospermum Parkii (Shea) Butter, Polyquaternium-39, Polyester-11, Sodium Hydroxide, Guar Hydroxypropyltrimonium Chloride, Disodium EDTA, Panthenol, Ethylhexylglycerin, Polysorbate 20, Sodium Chloride, Citric Acid, Benzyl Benzoate",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/cantu-shea-butter-for-natural-hair-sulfate-free-cleansing-cream-shampoo",
    sourceTitle: "Cantu Shea Butter For Natural Hair Sulfate-Free Cleansing Cream Shampoo",
    keyIngredients: ["Beurre de Karité", "Glycérine Végétale", "Panthénol"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p02",
    inci: "Aqua/Water/Eau, Sodium Lauroyl Sarcosinate, Cocamidopropyl Betaine, Hydroxypropyl Methylcellulose, Cocos Nucifera (Coconut) Fruit Powder, Phyllanthus Emblica Fruit Powder, Citrus Reticulata (Tangerine) Fruit Extract, Fragrance/Parfum, Citric Acid, Phenoxyethanol, Caprylyl Glycol, Sodium Benzoate, Limonene",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/as-i-am-curl-clarity-shampoo",
    sourceTitle: "As I Am Curl Clarity Shampoo",
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p03",
    inci: "Aqua/Water/Eau, Cetyl Alcohol, Cetrimonium Chloride, Cocos Nucifera (Coconut) Oil, Ricinus Communis (Castor) Seed Oil, Cocos Nucifera (Coconut) Fruit Powder, Citrus Reticulata (Tangerine) Fruit Extract, Phytosterols, PEG-40 Castor Oil, Cetearyl Alcohol, Stearalkonium Chloride, Serenoa Serrulata Fruit Extract, Quaternium-18, Propylene Glycol, C12-15 Alkyl Lactate, Fragrance/Parfum (Limonene), Potassium Sorbate, Caprylyl Glycol, Phenoxyethanol, Caprylic/Capric Triglyceride, Abies Balsamea (Balsam Canada) Resin, Potassium Chloride",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/as-i-am-coconut-cowash",
    sourceTitle: "As I Am Coconut Cowash",
    keyIngredients: ["Huile de Ricin", "Huile de Coco"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p04",
    inci: "Water (Aqua), Stearyl Alcohol, Cetyl Alcohol, Butyrospermum Parkii (Shea) Butter, Stearamidopropyl Dimethylamine, Glyceryl Stearate, Thiamine (Vitamin B1), Riboflavin (Vitamin B2), Niacin (Vitamin B3), Pantothenic Acid (Vitamin B5), Pyridoxine Hcl (Vitamin B6), Biotin (Vitamin B7), Folic Acid (Vitamin B9), Cyanocobalamin (Vitamin B12), Leuconostoc/Radish Root Ferment Filtrate, Polyquaternium-7, Sodium Benzoate, Neopentyl Glycol Diheptanoate, Fragrance (Parfum), Isododecane, Panthenol, Polyester-11, Lactic Acid, Disodium EDTA, Phenoxyethanol, Ethylhexylglycerin, Benzyl Benzoate",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/cantu-shea-butter-sulfate-free-hydrating-cream-conditioner",
    sourceTitle: "Cantu Shea Butter Sulfate-free Hydrating Cream Conditioner",
    keyIngredients: ["Beurre de Karité", "Panthénol"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p05",
    inci: "Water, Glycerin (Vegetable), Butyrospermum Parkii (Shea) Butter*^, Ricinus Communis (Castor) Seed Oil, Cetyl Alcohol, Stearyl Alcohol, Glyceryl Stearate Citrate, Cetearyl Alcohol, Olea Europaea (Olive) Fruit Oil, Fragrance, Cocos Nucifera (Coconut) Oil, Persea Gratissima (Avocado) Oil, Panthenol, Glycine Soja (Soybean) Oil, Argania Spinosa (Argan) Kernel Oil, Cetrimonium Chloride, Equisetum Arvense (Horsetail) Extract, Tocopherol, Boswellia Serrata (Frankincense) Extract, Commiphora Myrrha (Myrrh) Resin Extract, Daucus Carota Sativa (Carrot) Root Extract, Beta-Carotene, Hydrolyzed Vegetable Protein Pg-Propyl Silanetriol, Macrocystis Pyrifera (Kelp) Extract, Sodium Benzoate, Glyceryl Caprylate, Potassium Sorbate, Triethyl Citrate, Caprylyl Glycol, Benzoic Acid",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/sheamoisture-raw-shea-butter-deep-treatment-masque-with-sea-kelp-and-argan-oil",
    sourceTitle: "SheaMoisture Raw Shea Butter Deep Treatment Masque With Sea Kelp And Argan Oil",
    keyIngredients: ["Beurre de Karité", "Huile de Ricin", "Huile de Coco", "Glycérine Végétale", "Huile d’Olive"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p06",
    inci: "Water, Cetearyl Alcohol, Cocos Nucifera (Coconut) Oil, Glycerin (Vegetable), Butyrospermum Parkii Shea) Butter, Stearyl Alcohol, Cetyl Alcohol, Behentrimonium Methosulfate, Fragrance (Essential Oil Blend), Behentrimonium Chloride, Panthenol, Hydrolyzed Vegetable Protein Pg-Propyl Silanetriol, Cetrimonium Chloride, Persea Gratissima (Avocado) Oil, Mangifera Indica (Mango) Seed Butter, Olea Europaea (Olive) Fruit Oil, Mentha Piperita (Peppermint) Leaf Extract, Ricinus Communis (Castor) Seed Oil, Mauritia Flexuosa Fruit Oil, Yeast Extract, Hydrolyzed Keratin, Macadamia Ternifolia Seed Oil, Tocopherol, Hydrogenated Vegetable Oil, Niacin, Aloe Barbadensis Leaf Juice, Vinegar, Caprylhydroxamic Acid, Caprylyl Glycol, Trifolium Pratense (Clover) Flower Extract, Caramel",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/sheamoisture-jamaican-black-castor-oil-strengthen-and-restore-masque",
    sourceTitle: "SheaMoisture Jamaican Black Castor Oil Strengthen And Restore Masque",
    keyIngredients: ["Beurre de Karité", "Huile de Ricin", "Huile de Coco", "Menthe Poivrée", "Aloe Vera"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p07",
    inci: "Organic Mango Fruit Extract, Organic Slippery Elm, Organic Marshmallow Root, Organic Lemongrass, Cetyl Alcohol, *Behentrimonium Methosulfate, Citric Acid, Phenoxyethanol, Natural Fragrance",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/kinky-curly-knot-today-odzywka-bez-splukiwania",
    sourceTitle: "Kinky Curly Knot Today Leave In Conditioner",
    keyIngredients: ["Beurre de Mangue"],
    // correspondance avec le titre source : 0.88
  },
  {
    productId: "launch-p08",
    inci: "Deionized Water, Behentrimonium Methosulfate (Btms), Cetearyl Alcohol, Persea Gratissima (Avocado) Oil, Oryza Sativa (Rice) Bran Oil, Aloe Barbadensis Leaf Juice, Ricinus Communis (Castor) Seed Oil, Macadamia Ternifolia Seed Oil, Sorbitol, Camellia Sinensis (Green Tea) Leaf Extract, Oryza Sativa (Rice) Milk, Rosa Canina (Rosehip) Fruit Oil, Ceteareth-20, Ulmus Fulva (Slippery Elm) Bark Extract, Phenoxyethanol (Optiphen Nd), Caprylyl Glycol, Phthalate Free Fragrance",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/camille-rose-curl-love-moisture-milk",
    sourceTitle: "Camille Rose Curl Love Moisture Milk",
    keyIngredients: ["Huile de Ricin", "Aloe Vera", "Avocat", "Thé Vert"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p09",
    inci: "Butyrospermum Parkii (Shea) Butter",
    provenance: "definition",
    note: "Beurre de karité brut non raffiné, un seul ingrédient : la composition est celle du produit lui-même.",
    keyIngredients: ["Beurre de Karité"],
  },
  {
    productId: "launch-p10",
    inci: "Ricinus Communis (Castor) Seed Oil",
    provenance: "definition",
    note: "Huile de ricin noire jamaïcaine, un seul ingrédient. La torréfaction des graines ne modifie pas la nomenclature INCI.",
    keyIngredients: ["Huile de Ricin"],
  },
  {
    productId: "launch-p11",
    inci: "Vitis Vinifera (Grape) Seed Oil, Glycine Soja (Soybean) Oil, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Ricinus Communis (Castor) Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Mentha Piperita (Peppermint) Oil, Rosmarinus Officinalis (Rosemary) Leaf Oil, Eucalyptus Globulus Leaf Oil, Menthol, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Rosmarinus Officinalis Leaf Extract, Helianthus Annuus (Sunflower) Seed Oil, Lavandula Angustifolia (Lavender) Oil, Triticum Vulgare (Wheat) Germ Oil, Cocos Nucifera (Coconut) Oil, Carthamus Tinctorius (Safflower) Seed Oil, Aloe Barbadensis Leaf Extract, Oenothera Biennis (Evening Primrose) Oil, Oryza Sativa (Rice) Bran Oil, Tocopheryl Acetate, Benzyl Nicotinate, Biotin, Pogostemon Cablin (Patchouli) Leaf Oil, Ocimum Sanctum, Ho Leaf Oil, Salvia Officinalis (Sage) Oil, Apium Graveolens (Celery Seed) Extract, Equisetum Arvense (Horsetail) Extract, Arctium Lappa (Burdock Root) Extract, Urtica Dioica (Nettle) Extract, Silica, Glycerin, Ascorbic Acid, Cholecalciferol (Vitamin D)",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/mielle-organics-rosemary-mint-scalp-hair-strengthening-oil-light",
    sourceTitle: "Mielle Organics Rosemary Mint Scalp & Hair Strengthening Oil Light",
    keyIngredients: ["Huile de Ricin", "Huile de Coco", "Romarin", "Menthe Poivrée", "Aloe Vera"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p12",
    inci: "Deionized Water, Behentrimonium Methosulfate, Cetearyl Alcohol, Prunus Amygdalus Dulcis Fruit Extract, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Cucurbita Pepo (Pumpkin) Seed Oil, Sesamum Indicum (Sesame) Seed Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Oryza Sativa (Rice) Bran Oil, Macadamia Ternifolia Seed Oil, Olea Europaea (Olive) Fruit Oil, Cannabis Sativa Seed Oil, Ulmus Fulva Bark (Slippery Elm) Extract, Ricinus Communis (Castor) Seed Oil, Aloe Barbadensis Leaf Juice, Cera Alba, Camellia Sinensis Leaf Extract, Phenoxyethanol (Optiphen Nd), Caprylyl Glycol, Phthalate Free Fragrance",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/camille-rose-almond-jai-twisting-butter-2",
    sourceTitle: "Camille Rose Almond Jai Twisting Butter",
    keyIngredients: ["Huile de Ricin", "Aloe Vera", "Huile d’Olive", "Amande Douce", "Thé Vert"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p13",
    inci: "Botanical Infusion Of Water/Aqua, Equisetum Arvense/Horsetail, Chamomile, Urtica Dioica/Nettle, Althea Officinalis, Marshmallow, Organic Aloe Vera Juice, Agave Tequilana, Agave Nectar Extract, Tocopheryl Acetate / Vitamin E, Pectin, Citric Acid, Potassium Sorbate, Fragrance",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/kinky-curly-original-curling-custard-natural-hair-styling-gel",
    sourceTitle: "Kinky Curly Original Curling Custard Natural Hair Styling Gel",
    keyIngredients: ["Ortie", "Prêle"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p14",
    inci: "Agua, Carbomer, Triethanolamine, Olea Europaea (Olive) Fruit Oil, Hydrolyzed Wheat Protein, Glycerine, Polysorbate 20, Tetrasodium EDTA, Sodium Hydroxymethylglycinate, PVP, Fragrance, Yellow 5 (Ci19140)",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/eco-styler-olive-oil-styling-gel",
    sourceTitle: "Eco Styler Olive Oil Styling Gel",
    keyIngredients: ["Huile d’Olive", "Protéines"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p15",
    inci: "Deionized Water, Polyquaternium-11, Decyl Glucoside, Cetrimonium Chloride, PEG-12 Dimethicone, Methyl Gluceth-10, Polysorbate 20, Fragrance, PEG-75 Lanolin, Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate, Citric Acid, Hydrolyzed Wheat Protein, Sweet Almond Fruit Extract, Avocado Fruit Extract, Shea Leaf Extract, Olive Fruit Extract, Jojoba Seed Extract, Coconut Fruit Extract, Kukui Seed Fruit Extract, Panthenol, FD&C Yellow No. 5, FD&C Blue No. 5, Benzyl Benzoate, Linalool",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/design-essentials-almond-avocado-curl-enhancing-mousse",
    sourceTitle: "Design Essentials Almond & Avocado Curl Enhancing Mousse",
    keyIngredients: ["Avocat", "Amande Douce", "Panthénol", "Protéines", "Jojoba"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p28",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "launch-p29",
    inci: "Aqua, Glycerin, Carbomer, Aminomethyl Propanol, Hydrolyzed Wheat Protein, Linum Usitatissimum Seed Oil, Potassium Sorbate, Polyvinylpyrrolidone, Polysorbate 20, Parfum, Edta, Magnesium Nitrate, Phenoxyethanol, Polyaminopropyl Biguanide, Methylchloroisothiazolinone, Magnesium Chloride, Methylisothiazolinone, Limonene, Hexyl Cinnamal, Linalool, Amyl Cinnamal, Butylphenyl Methylpropional",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/aunt-jackies-dont-shrink-flaxseed-elongating-curling-gel",
    sourceTitle: "Aunt Jackie's Don'T Shrink Flaxseed Elongating Curling Gel",
    keyIngredients: ["Glycérine Végétale", "Graines de Lin", "Protéines"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p30",
    inci: "Aqua (Water), PEG-25 Hydrogenated Castor Oil, PEG-7 Glyceryl Cocoate, Cocamidopropyl Betaine, Phenoxyethanol, Benzyl Alcohol, Parfum (Fragrance), Cetrimonium Chloride, Polyquaternium-11, Polyquaternium-55, Sodium Chloride, Panthenol (Vitamin B5), Citric Acid, Butyrospermum Parkii (Shea) Butter, Coumarin, Benzyl Benzoate, Hexyl Cinnamal",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/cantu-wave-whip-curling-mousse",
    sourceTitle: "Cantu Wave Whip Curling Mousse",
    keyIngredients: ["Beurre de Karité", "Panthénol"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p31",
    inci: "Ricinus Communis (Castor) Seed Oil",
    provenance: "definition",
    note: "Huile de ricin noire jamaïcaine, un seul ingrédient. La torréfaction des graines ne modifie pas la nomenclature INCI.",
    keyIngredients: ["Huile de Ricin"],
  },
  {
    productId: "launch-p32",
    inci: "Water (Aqua), Glycerin, Polysorbate 20, Fragrance, PEG-40 Hydrogenated Castor Oil, Butyrospermum Parkii Butter (Shea), Magnesium Sulfate, Guar Hydroxypropyltrimonium Chloride, Citric Acid, Methylisothiazolinone, Phenoxyethanol",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/cantu-shea-butter-comeback-curl",
    sourceTitle: "Cantu Shea Butter Comeback Curl Next Day Curl Revitalizer",
    keyIngredients: ["Beurre de Karité", "Glycérine Végétale"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p33",
    inci: "Distilled Water, Decyl Glucoside, Coco-Glucoside, Glyceryl Oleate, Glycerin, Hydroxypropyltrimonium Honey, Sesamum Indicum | Sesame Seed Oil, Olea Europaea (Olive) Fruit Oil, Mentha Piperita (Peppermint Oil), Xanthan Gum, Natural Fragrance, Phenoxyethanol, Guar Hydroxypropyltrimonium Chloride, Cassia Gum, Stearyl Alcohol, Phytic Acid",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/camille-rose-naturals-clean-rinse-moisturising-and-clarifying-shampoo",
    sourceTitle: "Camille Rose Naturals Clean Rinse Moisturising And Clarifying Shampoo",
    keyIngredients: ["Menthe Poivrée", "Glycérine Végétale", "Huile d’Olive", "Miel"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p34",
    inci: "Water (Aqua, Eau), Glycerin, Pectin, Hydrolyzed Corn Starch, Polysorbate 20, Xanthan Gum, Hydroxyethylcellulose, Carrageenan, Fragrance (Parfum), Orbignya Oleifera (Babassu) Oil, Mauritia Flexuosa (Buriti) Fruit Oil, Copaifera Officinalis (Balsam Copaiba) Resin, Astrocaryum Murumuru Seed Butter, Cocos Nucifera (Coconut) Oil, Punica Granatum (Pomegranate) Extract, Prunus Amygdalus Dulcis (Sweet Almond) Oil, Honey (Mel, Miel), Persea Gratissima (Avocado) Oil, Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/mielle-organics-pomegranate-honey-curl-smoothie",
    sourceTitle: "Mielle Organics Pomegranate & Honey Curl Smoothie",
    keyIngredients: ["Huile de Coco", "Glycérine Végétale", "Avocat", "Amande Douce", "Miel"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p51",
    inci: "Water (Aqua, Eau), Cetearyl Alcohol, Polysorbate 60, Amodimethicone, Cetrimonium Chloride, Trideceth-12, Glycerin, Propylene Glycol, PEG-12 Dimethicone, Polysorbate 20, PVP, Organic -Prunus Amygdalus Dulcis (Sweet Almond) Oil, Organic -Plukenetia Volubilis (Sacha Inchi) Seed Oil, Organic -Argania Kernel Spinosa (Argan) Oil, Organic-Schinziophyton Rautanenii (Mongongo) Kernel Oil, Organic -Vitis Vinifera (Grape) Seed Oil, Disodium EDTA, Tocopheryl Acetate, Cyclopentasiloxane, Dimethiconol, Hydrolyzed Wheat Protein, Fragrance (Parfum), Phenoxyethanol, Benzoic Acid, Ethylhexylglycerin, Glycereth-2 Cocoate",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/mielle-mongongo-oil-thermal-heat-protectant-spray",
    sourceTitle: "Mielle Mongongo Oil Thermal & Heat Protectant Spray",
    keyIngredients: ["Glycérine Végétale", "Amande Douce", "Protéines"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p52",
    inci: "Water (Aqua, Eau), Hydrolyzed Collagen, Citric Acid, Magnesium Sulfate, Imidazolidinone, Panthenol, Tocopheryl Acetate, Mauritia Flexuosa Fruit Oil, Hydrolyzed Vegetable Protein Pg-Propyl Silanetriol, Phytantriol, Magnesium Carbonate, Cocamidopropyl Betaine, Dimethylol Urea, Trimethylsiloxyamodimethicone, C11-15 Pareth-7, C12-16 Pareth-9, Glycerin, Trideceth-12, DMDM Hydantoin, Fragrance (Parfum), Linalool",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/aphogee-two-step-protein-treatment",
    sourceTitle: "Aphogee Two-Step Protein Treatment",
    keyIngredients: ["Glycérine Végétale", "Panthénol", "Protéines"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p53",
    inci: "Aqua (Water), Hydrolyzed Pea Protein Pg-Propyl Silanetriol, Polysorbate 20, Cetearyl Alcohol, Dimethicone, Persea Gratissima (Avocado) Oil, Bis-PEG/PPG-20/20 Dimethicone, Phenoxyethanol, Behentrimonium Methosulfate, Rosmarinus Officinalis (Rosemary) Leaf Water, Helianthus Annuus (Sunflower) Seed Oil, Cocos Nucifera (Coconut) Oil, Parfum (Fragrance), Astrocaryum Murumuru (Murumuru) Seed Butter, Sodium Hyaluronate Crosspolymer, Withania Somnifera (Ashwagandha) Root Oil, Eclipta Alba (Bhringraj) Oil, Bacopa Monnieri (Brahni) Oil, Emblica Officinalis (Amla) Oil, Ocimum Basilicum Hairy Root Culture Extract, Aloe Barbadensis (Aloe Vera) Leaf Juice, Panthenol, Triethylene Glycol, Pentylene Glycol, Linalool, Citronellol, Linalyl Acetate, Alpha-Isomethyl Ionone, Tetramethyl Acetyloctahydronaphthalenes, Limonene, Hexyl Cinnamal, Geraniol, Cinnamyl Alcohol, Pinene, Mentha Viridis Leaf Oil, Menthol, Citrus Limon Peel Oil, Carvone, Geranyl Acetate, Hexamethylindanopyran, Citral, Camphor",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/nature-spell-growth-conplex-rosemary-water-leave-in-conditioner",
    sourceTitle: "NATURE SPELL Growth Conplex Rosemary Water Leave In Conditioner",
    keyIngredients: ["Huile de Coco", "Romarin", "Aloe Vera", "Avocat", "Panthénol"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "launch-p54",
    inci: "Aqua/Water/Eau, PEG-40 Castor Oil, Glycerin, Parfum (Fragrance), Acetum (Vinegar), Cetrimonium Chloride, Panthenol, Menthyl Lactate, Menthol, Isopulegol, Argania Spinosa Kernel Oil, Propylene Glycol, Cocodimonium Hydroxypropyl Hydrolyzed Keratin, Rosmarinus Officinalis (Rosemary) Leaf Extract, Hydrolyzed Rice Protein, Tocopheryl Acetate, Camellia Sinensis Leaf Extract, Citric Acid, Tetrasodium EDTA, Polyquaternium-4, Phenoxyethanol, Sodium Benzoate, Yellow 5 (Ci 19140), Red 40 (Ci 16035), Blue 1 (Ci 42090)",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/creme-of-nature-apple-cider-vinegar-clarifying-rinse",
    sourceTitle: "Creme of Nature Apple Cider Vinegar Clarifying Rinse",
    keyIngredients: ["Romarin", "Glycérine Végétale", "Huile d’Argan", "Panthénol", "Protéines"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "p1",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p10",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p11",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p12",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p13",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p14",
    inci: "Water/Aqua, Caprylic/Capric Triglyceride, Glycerin, Crambe Abyssinica Seed Oil Phytosterol Esters, Niacinamide, Glyceryl Stearate SE, Methylpropanediol, Polyglyceryl-6 Laurate, Polyglyceryl-10 Oleate, Ceteareth-20, Cetearyl Alcohol, Phenoxyethanol, Caprylyl Glycol, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Sorbitan Palmitate, Sodium Phytate, Glycyrrhiza Glabra (Licorice) Root Extract, Cellulose Gum, 3-O-Ethyl Ascorbic Acid, Honokiol, Magnolol, Plankton Extract, Bromelain, Papain, Lecithin, Sodium Hydroxide, Algin, Sodium Ascorbate, Tocopherol",
    provenance: "source",
    sourceUrl: "https://incidecoder.com/products/eadem-milk-marvel-dark-spot-serum",
    sourceTitle: "EADEM Milk Marvel Dark Spot Serum",
    keyIngredients: ["Glycérine Végétale", "Vitamine E", "Niacinamide"],
    // correspondance avec le titre source : 1.0
  },
  {
    productId: "p15",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p16",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p2",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p3",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p4",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p5",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p6",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p7",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p8",
    inci: "",
    provenance: "introuvable",
  },
  {
    productId: "p9",
    inci: "",
    provenance: "introuvable",
  },
];

export const CATALOGUE_INCI_PAR_ID: Record<string, CatalogueInciEntry> =
  Object.fromEntries(CATALOGUE_INCI.map((e) => [e.productId, e]));
