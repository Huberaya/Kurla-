import { Product, RoutineBundle, ProfessionalPro, Article } from '../types';
// Authentic real-life photography of Black men, women & children
export const HERO_IMAGE = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=85'; // Real African woman combing her natural textured hair
export const HERO_VIDEO_FRAME = HERO_IMAGE;
export const AFRICAN_WOMAN_COMBING_IMAGE = HERO_IMAGE;
export const STYLIST_IMAGE = 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1200&q=85'; // Real Afro hairstylist
export const MELANIN_SKIN_IMAGE = 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=1200&q=85'; // Real melanin skin glow
export const KIDS_CARE_IMAGE = 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=85'; // Real mother & child afro care
export const PROTECTIVE_IMAGE = 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=1200&q=85'; // Real knotless braids & locs
export const MEN_GROOMING_IMAGE = 'https://images.unsplash.com/photo-1507152832244-10d45c7eda57?auto=format&fit=crop&w=1200&q=85'; // Real Black man grooming beard

export const TEXTURE_GALLERY = [
  { id: '1', title: 'Cheveux crépus 4C', tag: 'Volume & Nutriments', image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85' },
  { id: '2', title: 'Boucles 3B/3C', tag: 'Définition & Équilibre', image: 'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?auto=format&fit=crop&w=1000&q=85' },
  { id: '3', title: 'Knotless Braids', tag: 'Protective Style', image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=1000&q=85' },
  { id: '4', title: 'Sisterlocks & Microlocks', tag: 'Soin Cuir Chevelu', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85' },
  { id: '5', title: 'Eclat Peau Mélaninée', tag: 'Skincare SPF 50', image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=1000&q=85' },
  { id: '6', title: 'Démêlage Enfant', tag: 'Douceur Anti-Larmes', image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1000&q=85' },
  { id: '7', title: 'Hommes Grooming', tag: 'Waves & Barbe Hydratée', image: 'https://images.unsplash.com/photo-1507152832244-10d45c7eda57?auto=format&fit=crop&w=1000&q=85' },
  { id: '8', title: 'Coiffeuse Afro Certifiée', tag: 'Geste Professionnel', image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1000&q=85' },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    slug: 'leave-in-hydratant',
    name: 'Leave-In Hydratant Cacao & Mangue',
    brand: 'KURLA Botanicals',
    category: 'cheveux',
    subCategory: 'Hydratation',
    subCategoryTag: 'hydratation',
    price: 18.90,
    originalPrice: 22.00,
    rating: 4.9,
    reviewsCount: 48,
    image: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80',
    badges: ['KURLA Pick', '4C Approved', 'Bêta'],
    forWho: 'Cheveux crépus (4A-4C) et bouclés ayant tendance à la sécheresse intense.',
    notIdealIf: 'Tu as les cheveux ultra fins recherchant une texture eau légère.',
    howToUse: 'Appliquer section par section sur cheveux humides après le lavage ou en rafraîchissement.',
    routineStep: 'Étape 2 — Hydratation sans rincage',
    keyIngredients: ['Beurre de Mangue', 'Extrait de Cacao', 'Protéine de Soie végétale', 'Huile de Tournesol'],
    inci: 'Aqua, Mangifera Indica Seed Butter, Cetearyl Alcohol, Glycerin, Theobroma Cacao Seed Butter, Behentrimonium Methosulfate, Tocopherol, Benzyl Alcohol, Parfum.',
    description: 'Une crème riche et fondante qui scelle l’hydratation dans la fibre sans peser. Protège de la casse au démêlage.',
    inStock: true,
    needs: ['hydrater_cheveux', 'reduire_casse', 'definir_boucles'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: true,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', label: '2. Texture & Onctuosité Cacao/Mangue', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '3. Décor Routine Salle de Bain', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80', label: '4. Application sur longueurs crépues', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Format Flacon Pompe 250ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p2',
    slug: 'shampoing-doux',
    name: 'Shampoing Doux Sans Sulfates',
    brand: 'KURLA Botanicals',
    category: 'cheveux',
    subCategory: 'Lavage',
    subCategoryTag: 'cuir_chevelu',
    price: 14.90,
    rating: 4.8,
    reviewsCount: 32,
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80',
    badges: ['Routine Essential', 'Sans Sulfates'],
    forWho: 'Cuir chevelu sensible, cheveux texturés secs nécessitant un nettoyage doux sans décaper.',
    notIdealIf: 'Tu cherches un shampoing clarifiant très décapant aux sulfates.',
    howToUse: 'Appliquer sur cuir chevelu mouillé, masser avec la pulpe des doigts et rincer abondamment.',
    routineStep: 'Étape 1 — Nettoyage Doux',
    keyIngredients: ['Extrait de Guimauve', 'Aloe Vera Pur', 'Cocamidopropyl Betaine'],
    inci: 'Aqua, Aloe Barbadensis Leaf Juice, Cocamidopropyl Betaine, Sodium Lauroyl Methyl Isethionate, Althaea Officinalis Root Extract, Glycerin, Phenoxyethanol.',
    description: 'Nettoie en douceur le cuir chevelu sans éliminer les huiles naturelles indispensables à la souplesse des boucles.',
    inStock: true,
    needs: ['cuir_chevelu', 'hydrater_cheveux', 'demeler_cheveux'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1556228722-d1191e1e483f?auto=format&fit=crop&w=800&q=80', label: '2. Onctuosité de Mousse Guimauve', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80', label: '3. Ambiance Douche & Clean Beauty', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80', label: '4. Massage Cuir Chevelu sous l’eau', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80', label: '5. Format Flacon Pompe 300ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p3',
    slug: 'masque-hydratant',
    name: 'Masque Hydratant Profond Porosité Forte',
    brand: 'KURLA Botanicals',
    category: 'cheveux',
    subCategory: 'Soin Réparateur',
    subCategoryTag: 'casse',
    price: 24.90,
    originalPrice: 29.90,
    rating: 4.8,
    reviewsCount: 36,
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80',
    badges: ['Porosité Forte', 'Anti-Casse'],
    forWho: 'Cheveux fragilisés par le soleil, la manipulation ou ayant une porosité élevée.',
    notIdealIf: 'Tes cheveux ont une porosité très faible et saturent vite.',
    howToUse: 'Laisser poser 20 à 30 minutes sous bonnet chauffant ou charlotte après le shampoing.',
    routineStep: 'Étape 1b — Soin profond hebdomadaire',
    keyIngredients: ['Huile de Carapate (Black Castor)', 'Acide Hyaluronique capillaire', 'Kératine végétale'],
    inci: 'Aqua, Ricinus Communis Seed Oil, Cetearyl Alcohol, Hydrolyzed Wheat Protein, Hyaluronic Acid, Cetrimonium Chloride, Citric Acid, Fragrance.',
    description: 'Renforce les ponts de la fibre capillaire texturée pour stopper la casse lors du brossage.',
    inStock: true,
    needs: ['reduire_casse', 'hydrater_cheveux'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: true,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80', label: '2. Texture Beurre Onctueux Réparateur', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80', label: '3. Décor Rituel Wash Day', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', label: '4. Pose sous bonnet chauffant', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80', label: '5. Pot Poids Brut 250g', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p4',
    slug: 'spray-protective-style',
    name: 'Spray Apaisant Braids & Locks Menthe',
    brand: 'KURLA Care',
    category: 'cheveux',
    subCategory: 'Protective Styles',
    subCategoryTag: 'tresses',
    price: 16.90,
    rating: 4.9,
    reviewsCount: 62,
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
    badges: ['Incontournable Braids', 'Anti-Tensions', 'Bêta'],
    forWho: 'Personnes portant des tresses, knotless, twists ou locks sujettes aux démangeaisons.',
    notIdealIf: 'Tu n’as aucun style protecteur et recherches un masque lourd.',
    howToUse: 'Vaporiser quotidiennement sur le cuir chevelu et les tresses. Masser doucement.',
    routineStep: 'Étape Quotidienne — Apaisement & Fraîcheur',
    keyIngredients: ['Hydrolat de Menthe Poivrée', 'Aloe Vera Pur', 'Extrait d’Arbre à Thé', 'Glycérine Végétale'],
    inci: 'Aqua, Mentha Piperita Leaf Water, Aloe Barbadensis Leaf Juice, Glycerin, Melaleuca Alternifolia Leaf Oil, Polysorbate 20, Sodium Benzoate.',
    description: 'Calme instantanément les tiraillements après la pose de tresses et prévient les pellicules de sécheresse.',
    disclaimer: 'En cas de douleur intense suite à des tresses trop serrées, retirer immédiatement le style.',
    inStock: true,
    needs: ['entretenir_tresses', 'entretenir_locks', 'cuir_chevelu'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: true,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80', label: '2. Brumisation Fine Fraîcheur Menthe', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=800&q=80', label: '3. Décor Braiding Studio & Knotless', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80', label: '4. Application Ciblée sur Raies', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Flacon Spray Ergonomique 150ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p5',
    slug: 'huile-cuir-chevelu',
    name: 'Huile Cuir Chevelu Légère & Pousse',
    brand: 'KURLA Botanicals',
    category: 'cheveux',
    subCategory: 'Pousse & Densité',
    subCategoryTag: 'cuir_chevelu',
    price: 15.90,
    rating: 4.7,
    reviewsCount: 39,
    image: 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80',
    badges: ['Pousse Saine', 'Formule Légère'],
    forWho: 'Personnes souhaitant stimuler la microcirculation et densifier la pousse.',
    notIdealIf: 'Cuir chevelu hyper séborrhéique.',
    howToUse: 'En massage avec la pulpe des doigts 2 fois par semaine ou en bain d’huile avant shampoing.',
    routineStep: 'Soin Cuir Chevelu',
    keyIngredients: ['Huile de Carapate', 'Huile de Romarin à Cinéole', 'Huile de Jojoba', 'Vitamine E'],
    inci: 'Ricinus Communis Seed Oil, Simmondsia Chinensis Seed Oil, Rosmarinus Officinalis Leaf Oil, Tocopherol, Limonene, Linalool.',
    description: 'Formule concentrée en huiles pures pressées à froid pour fortifier la racine et nourrir les longueurs sans alourdir.',
    inStock: true,
    needs: ['cuir_chevelu', 'reduire_casse', 'entretenir_locks'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1608248540480-17637841852d?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80', label: '2. Goutte d’Huile Ambrée sur Pipette', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80', label: '3. Décor Botanique Romarin & Carapate', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80', label: '4. Massage Cuir Chevelu au Quotidien', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Flacon Pipette Verre 50ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p6',
    slug: 'spf-invisible',
    name: 'Sérum SPF 50+ Invisible Peau Mélaninée',
    brand: 'KURLA Skincare',
    category: 'peau',
    subCategory: 'Protection Solaire',
    subCategoryTag: 'protection_solaire',
    price: 22.90,
    originalPrice: 28.00,
    rating: 5.0,
    reviewsCount: 89,
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
    badges: ['Zéro Trace Blanche', 'Anti-Taches', 'Testé Peau Noire'],
    forWho: 'Toutes les peaux mates, foncées et très foncées cherchant un fini mat sans reflet gris.',
    notIdealIf: 'Tu préfères les crèmes minérales épaisses teintées de blanc.',
    howToUse: 'Appliquer deux doigts de sérum chaque matin en dernière étape de ta routine visage.',
    routineStep: 'Étape Matinale — Protection Ultime SPF 50+',
    keyIngredients: ['Niacinamide 4%', 'Filtres Solaires Organiques invisibles', 'Vitamine E', 'Squalane Végétal'],
    inci: 'Aqua, Diisopropyl Adipate, Niacinamide, Ethylhexyl Triazone, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Glycerin, Squalane, Tocopherol.',
    description: 'Le premier soin protecteur solaire spécialement formulé pour les carnations riches en mélanine. Protège du photo-vieillissement et évite l’assombrissement des taches.',
    inStock: true,
    needs: ['protection_solaire', 'taches_hyperpigmentation', 'hydrater_peau'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: true,
    isPromo: true,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80', label: '2. Fini 100% Invisible sans Traces Blanches', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', label: '3. Décor Ensoleillé Plage & Ville', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80', label: '4. Application 2 doigts sur visage', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Tube Airless Ergonomique 50ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p7',
    slug: 'bonnet-satin',
    name: 'Bonnet Satin Microfibre Premium XL',
    brand: 'KURLA Essentials',
    category: 'accessoires',
    subCategory: 'Nuit & Protection',
    subCategoryTag: 'bonnets_foulards',
    price: 12.90,
    originalPrice: 16.90,
    rating: 5.0,
    reviewsCount: 112,
    image: 'https://images.unsplash.com/photo-1584297091622-af8964893796?auto=format&fit=crop&w=800&q=80',
    badges: ['Zéro Frisottis', 'Ajustable', 'Taille XL Braids'],
    forWho: 'Idéal pour préserver les hydratations, tresses et boucles pendant le sommeil.',
    notIdealIf: 'Tu dors sans aucun produit et préfères une taie d’oreiller simple.',
    howToUse: 'Glisser la chevelure à l’intérieur avant de dormir. Ajuster le cordon doux sans serrer le front.',
    routineStep: 'Protection Nocturne',
    keyIngredients: ['Satin de Soie Synthétique Haute Densité Non Absorbant'],
    inci: '100% Polyester Satin Grade A Premium.',
    description: 'Empêche le coton des oreillers d’absorber l’hydratation naturelle de tes cheveux texturés.',
    inStock: true,
    needs: ['proteger_nuit', 'entretenir_tresses', 'entretenir_locks', 'reduire_casse'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: true,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1584297091622-af8964893796?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', label: '2. Coutures Doublées & Elasticité Cordon', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', label: '3. Décor Chambre & Nuit Cocooning', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', label: '4. Port du Bonnet XL sur Braids', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80', label: '5. Format Pliable & Housse de Voyage', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p8',
    slug: 'brosse-demelante',
    name: 'Brosse Démêlante Douce Flex-Bristle',
    brand: 'KURLA Essentials',
    category: 'accessoires',
    subCategory: 'Outils Démêlage',
    subCategoryTag: 'peignes_brosses',
    price: 9.90,
    rating: 4.9,
    reviewsCount: 74,
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    badges: ['Flex Dents', 'Anti-Traction'],
    forWho: 'Cheveux très crépus 4B/4C et bouclés pour un démêlage sans douleur.',
    notIdealIf: 'Brushing thermique à haute température.',
    howToUse: 'Démêler toujours sur cheveux mouillés et enduits de leave-in, des pointes vers les racines.',
    routineStep: 'Outil de Démêlage',
    keyIngredients: ['Matériau Ergonomique Souple'],
    inci: 'ABS Végétal et Picots Souples Nylon.',
    description: 'Ses picots flexibles épousent les spires des cheveux crépus sans arracher les nœuds.',
    inStock: true,
    needs: ['demeler_cheveux', 'reduire_casse'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1590159763121-7c9ff3121ef0?auto=format&fit=crop&w=800&q=80', label: '2. Rangées de Picots Indépendants Flex', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80', label: '3. Décor Wash Day avec Produits', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', label: '4. Glisse Douce sur Cheveux Humides', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '5. Prise en Main Ergonomique Antidérapante', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p9',
    slug: 'creme-definition-boucles',
    name: 'Crème Définition Boucles & Twists',
    brand: 'KURLA Botanicals',
    category: 'cheveux',
    subCategory: 'Coiffage',
    subCategoryTag: 'definition',
    price: 17.90,
    rating: 4.8,
    reviewsCount: 45,
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
    badges: ['Définition 72H', 'Sans Effet Carton'],
    forWho: 'Boucles 3B à 4A pour des twist-outs et wash-and-go définis.',
    notIdealIf: 'Tu recherches un gel fixant ultra rigide.',
    howToUse: 'Appliquer sur cheveux humides par section, sculpter les boucles aux doigts.',
    routineStep: 'Étape Coiffage',
    keyIngredients: ['Beurre de Karité', 'Protéine de Riz', 'Huile d’Argan'],
    inci: 'Aqua, Butyrospermum Parkii Butter, Argania Spinosa Kernel Oil, Hydrolyzed Rice Protein, Xanthan Gum.',
    description: 'Définit et rebondit les boucles en leur apportant de la brillance sans aucun effet cartonné.',
    inStock: true,
    needs: ['definir_boucles', 'hydrater_cheveux'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', label: '2. Texture Crème Fouettée Karité & Argan', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '3. Décor Miroir de Coiffage', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80', label: '4. Sculptage des Twists aux Doigts', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Pot Poids Brut 200g', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p10',
    slug: 'serum-marques-post-imperfections',
    name: 'Sérum Marques Post-Imperfections Niacinamide',
    brand: 'KURLA Skincare',
    category: 'peau',
    subCategory: 'Éclat & Uniformité',
    subCategoryTag: 'taches',
    price: 29.90,
    rating: 4.8,
    reviewsCount: 51,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    badges: ['Haute Tolérance', 'Accompagnement Doux'],
    forWho: 'Peaux mates à foncées sujettes aux marques sombres post-boutons.',
    notIdealIf: 'Plaies ouvertes ou dermatite aiguë.',
    howToUse: '3 gouttes le soir sur peau propre avant la crème hydratante.',
    routineStep: 'Soin Ciblé Soir',
    keyIngredients: ['Niacinamide 5%', 'Acide Tranexamique 3%', 'Zinc PCA'],
    inci: 'Aqua, Niacinamide, Tranexamic Acid, Glycerin, Zinc PCA, Xanthan Gum, Phenoxyethanol.',
    description: 'Accompagne l’atténuation des marques sombres en douceur sans agresser le film cutané.',
    inStock: true,
    needs: ['taches_hyperpigmentation', 'imperfections_acne', 'peau_sensible'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: true,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80', label: '2. Fluide Sérum Goutte Pipette Niacinamide', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80', label: '3. Routine Skincare Soirée', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80', label: '4. Application 3 Gouttes Ciblées', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Flacon Pipette Ambré 30ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p11',
    slug: 'kit-kids-douceur',
    name: 'Kit Complet Kids Douceur & Démêlage',
    brand: 'KURLA Kids',
    category: 'enfants',
    subCategory: 'Kit Complet',
    subCategoryTag: 'demelage',
    price: 49.00,
    originalPrice: 58.00,
    rating: 4.9,
    reviewsCount: 67,
    image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
    badges: ['Routine Enfant', 'Économie 15%'],
    forWho: 'Enfants de 3 à 12 ans aux cheveux bouclés, frisés et crépus.',
    notIdealIf: 'Cheveux adultes défrisés.',
    howToUse: 'Utiliser la routine complète lors du shampoing hebdomadaire.',
    routineStep: 'Routine Complète Kids',
    keyIngredients: ['Aloe Vera Bio', 'Avoine Douce', 'Huile de Caméline'],
    inci: 'Voir fiches produits individuelles.',
    description: 'Contient le Spray Démêlant, le Leave-in Douceur et la Brosse Flex pour des routines sans larmes.',
    inStock: true,
    needs: ['demeler_cheveux', 'hydrater_cheveux', 'reduire_casse'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: true,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Kit Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80', label: '2. Formule Douce Avoine & Aloe Bio', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80', label: '3. Moment Complice Parent-Enfant', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '4. Démêlage Doux Sans Larmes', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80', label: '5. Ensemble du Coffret Cadeau Kids', type: 'kit', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p12',
    slug: 'kit-protective-style',
    name: 'Kit Protective Style (Braids, Twists & Locks)',
    brand: 'KURLA Care',
    category: 'cheveux',
    subCategory: 'Kit Complete Protective',
    subCategoryTag: 'tresses',
    price: 52.00,
    originalPrice: 63.80,
    rating: 4.95,
    reviewsCount: 88,
    image: PROTECTIVE_IMAGE,
    badges: ['Best-Seller', 'Anti-Démangeaisons', 'Économie 18%'],
    forWho: 'Porteurs de knotless braids, twists, faux locs ou locks.',
    notIdealIf: 'Sans coiffure protectrice.',
    howToUse: 'Vaporiser le spray au quotidien, masser l’huile sur le cuir chevelu et dormir sous bonnet satin.',
    routineStep: 'Kit Protecteur 3 Étapes',
    keyIngredients: ['Menthe Poivrée', 'Carapate', 'Satin Grade A'],
    inci: 'Voir fiches produits individuelles.',
    description: 'Le trio indispensable : Spray Apaisant Menthe + Huile Cuir Chevelu + Bonnet Satin XL.',
    inStock: true,
    needs: ['entretenir_tresses', 'entretenir_locks', 'cuir_chevelu', 'proteger_nuit'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: true,
    galleryImages: [
      { url: PROTECTIVE_IMAGE, label: '1. Vue principale (Hero Kit Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80', label: '2. Vue Détaillée Trio Soins & Bonnet Satin', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=800&q=80', label: '3. Routine Protective Style au Salon', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80', label: '4. Application Spray + Massages Cuir Chevelu', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80', label: '5. Trio de Produits Complémentaires', type: 'kit', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  // Enriched curated products for complete subcategory and community brand coverage
  {
    id: 'p13',
    slug: 'baume-apaisant-apres-rasage-barbe',
    name: 'Baume Apaisant Anti-Poils Incarnés Barbe & Grooming',
    brand: 'KURLA Men',
    category: 'hommes',
    subCategory: 'Rasage & Barbe',
    subCategoryTag: 'rasage',
    price: 19.90,
    rating: 4.85,
    reviewsCount: 42,
    image: MEN_GROOMING_IMAGE,
    badges: ['Spécial Hommes', 'Anti-Boutons Rasage', 'Nouveauté'],
    forWho: 'Hommes souffrant d’irritations, boutons et poils incarnés suite au rasage ou à la taille de barbe.',
    notIdealIf: 'Peau sans aucune pilosité ni rasage.',
    howToUse: 'Appliquer sur peau propre immédiatement après le rasage ou le tracé des contours.',
    routineStep: 'Soin Post-Rasage',
    keyIngredients: ['Acide Salicylique 1.5%', 'Huile d’Arbre à Thé', 'Aloe Vera', 'Allantoïne'],
    inci: 'Aqua, Aloe Barbadensis Leaf Extract, Salicylic Acid, Glycerin, Allantoin, Melaleuca Alternifolia Leaf Oil, Carbomer, Phenoxyethanol.',
    description: 'Formule dermatologique prévenant la pseudofolliculite de la barbe (boutons de rasage) et adoucissant les poils drus.',
    inStock: true,
    needs: ['poils_incarnes', 'prendre_soin_barbe', 'peau_sensible'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: true,
    isPromo: false,
    galleryImages: [
      { url: MEN_GROOMING_IMAGE, label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80', label: '2. Baume Apaisant Acide Salicylique', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80', label: '3. Ambiance Espace Grooming & Barber', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=80', label: '4. Application Apaisante Mâchoire & Cou', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Pot 75ml Ergonomique', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p14',
    slug: 'eadem-milk-marvel-serum',
    name: 'Milk Marvel Dark Spot Serum',
    brand: 'Eadem',
    category: 'peau',
    subCategory: 'Éclat & Uniformité',
    subCategoryTag: 'taches',
    price: 62.00,
    rating: 4.92,
    reviewsCount: 124,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    badges: ['Marque Communauté', 'Formule Brevetée Smart Melanin™'],
    forWho: 'Targeted hyperpigmentation treatment clinically tested on melanin-rich skin.',
    notIdealIf: 'Skin with active open eczema.',
    howToUse: 'Apply 1-2 pumps daily morning and night after cleansing.',
    routineStep: 'Soin Ciblé Anti-Taches Premium',
    keyIngredients: ['Amber Algae', 'Niacinamide', 'Vitamin C Ester', 'Encapsulated Kojic Acid'],
    inci: 'Aqua, Niacinamide, Glycerin, Tetrahexyldecyl Ascorbate, Kojic Acid, Amber Extract.',
    description: 'Formulé spécifiquement par des chimistes afro-descendantes pour estomper les taches d’hyperpigmentation sans décolorer la peau saine.',
    inStock: true,
    needs: ['taches_hyperpigmentation', 'hydrater_peau'],
    countryAvailability: ['FR', 'BE', 'DOM', 'INT'],
    communityBrand: true,
    isNew: true,
    isPromo: false,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel Eadem)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80', label: '2. Onctuosité Lait-Sérum Smart Melanin™', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80', label: '3. Décor Skincare Minimaliste Premium', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80', label: '4. Application 2 Pressions Matin/Soir', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Flacon Pompe Airless 30ml', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p15',
    slug: 'black-girl-sunscreen-spf30',
    name: 'Black Girl Sunscreen Broad Spectrum SPF 30',
    brand: 'Black Girl Sunscreen',
    category: 'peau',
    subCategory: 'Protection Solaire',
    subCategoryTag: 'protection_solaire',
    price: 24.90,
    rating: 4.96,
    reviewsCount: 215,
    image: MELANIN_SKIN_IMAGE,
    badges: ['Cult Classic', 'Marque Fondatrice Afro', 'Sans Résidu'],
    forWho: 'Peaux noires et métissées cherchant une hydratation solaire ultra fondeuse sans masque blanc.',
    notIdealIf: 'Tu cherches un écran solaire en poudre.',
    howToUse: 'Appliquer généreusement 15 minutes avant toute exposition au soleil.',
    routineStep: 'Protection Solaire Quotidienne',
    keyIngredients: ['Huile d’Avocat', 'Huile de Jojoba', 'Jus de Cacao', 'Tournesol'],
    inci: 'Avobenzone, Homosalate, Octisalate, Octocrylene, Persea Gratissima Oil, Simmondsia Chinensis Seed Oil.',
    description: 'La référence internationale culte d’écran solaire transparent conçu par et pour les femmes aux peaux riches en mélanine.',
    inStock: true,
    needs: ['protection_solaire', 'hydrater_peau', 'taches_hyperpigmentation'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: false,
    galleryImages: [
      { url: MELANIN_SKIN_IMAGE, label: '1. Vue principale (Hero Officiel BGS)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80', label: '2. Absence Totale de Résidu ou Voile Gris', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', label: '3. Décor Ensoleillé Plage / Extérieur', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1512290900678-ebaa85d56b00?auto=format&fit=crop&w=800&q=80', label: '4. Application Visage & Décolleté', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80', label: '5. Tube Souple 89ml Nomade', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  },
  {
    id: 'p16',
    slug: 'taie-oreiller-soie-naturelle',
    name: 'Taie d’Oreiller 100% Soie de Mûrier 22 Momme',
    brand: 'KURLA Essentials',
    category: 'accessoires',
    subCategory: 'Nuit & Protection',
    subCategoryTag: 'taies_oreiller',
    price: 34.90,
    originalPrice: 42.00,
    rating: 4.98,
    reviewsCount: 95,
    image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80',
    badges: ['Pure Soie', 'Soin Cheveux & Peau'],
    forWho: 'Protection ultime des boucles, des longueurs et prévention des plis de sommeil sur la peau du visage.',
    notIdealIf: 'Lavage en machine à 90°C.',
    howToUse: 'Enfiler sur oreiller standard 65x65cm ou 50x70cm.',
    routineStep: 'Rituel Nocturne',
    keyIngredients: ['100% Soie de Mûrier Grade 6A'],
    inci: '100% Mulberry Silk 22 Momme.',
    description: 'Réduit les frictions capillaires à zéro pendant le sommeil et conserve le niveau d’hydratation naturel de la peau et des cheveux.',
    inStock: true,
    needs: ['proteger_nuit', 'reduire_casse', 'hydrater_peau', 'entretenir_locks', 'entretenir_perruque'],
    countryAvailability: ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: true,
    isNew: false,
    isPromo: true,
    galleryImages: [
      { url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80', label: '1. Vue principale (Hero Officiel)', type: 'hero', isOfficial: true },
      { url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', label: '2. Tissage Soie Pure 22 Momme Grade 6A', type: 'detail', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', label: '3. Ambiance Suite & Literie Premium', type: 'lifestyle', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', label: '4. Sommeil Réparateur Anti-Friction', type: 'use', isOfficial: false },
      { url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80', label: '5. Format Standard 65x65cm / 50x70cm', type: 'size', isOfficial: false }
    ],
    isIllustrativeVisual: false
  }
];


export const MOCK_ROUTINES: RoutineBundle[] = [
  {
    id: 'r1',
    slug: 'starter-hydratation',
    title: 'Starter Hydratation 4C & Boucles',
    subtitle: 'Routine fondamentale pour stopper la sécheresse et la casse répétitive.',
    category: 'cheveux',
    badge: 'Best-Seller Bêta',
    benefit: 'Garde l’hydratation jusqu’à 5 jours sans alourdir.',
    duration: '15 minutes / 1 à 2 fois par semaine',
    price: 64.90,
    originalPrice: 79.00,
    image: HERO_IMAGE,
    products: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[2], MOCK_PRODUCTS[4]],
    steps: [
      { number: 1, title: 'Lavage Doux & Masque', description: 'Nettoie et applique le masque hydratant 20 min.', productName: 'Masque Hydratant Porosité Forte' },
      { number: 2, title: 'Hydratation LCO', description: 'Applique le leave-in sur cheveux très humides.', productName: 'Leave-In Hydratant Cacao & Mangue' },
      { number: 3, title: 'Scellage Cuir Chevelu', description: 'Masse 3 gouttes d’huile pour stimuler la racine.', productName: 'Huile Cuir Chevelu Légère' }
    ]
  },
  {
    id: 'r2',
    slug: 'protective-style',
    title: 'Protective Style (Braids, Twists & Locks)',
    subtitle: 'Prendre soin de son cuir chevelu sous tresses sans créer de résidus.',
    category: 'protective',
    badge: 'Spécial Tresses',
    benefit: 'Évite les tiraillements, les démangeaisons et la casse des tempes.',
    duration: '3 minutes par jour',
    price: 52.00,
    originalPrice: 63.80,
    image: PROTECTIVE_IMAGE,
    products: [MOCK_PRODUCTS[3], MOCK_PRODUCTS[4], MOCK_PRODUCTS[6]],
    steps: [
      { number: 1, title: 'Spray Apaisant Quotidien', description: 'Vaporise à la racine des tresses pour calmer les tiraillements.', productName: 'Spray Apaisant Braids Menthe' },
      { number: 2, title: 'Nourrir les Temples', description: 'Applique une goutte d’huile sur la ligne de pousse.', productName: 'Huile Cuir Chevelu Légère' },
      { number: 3, title: 'Protection Nuit', description: 'Enfile ton bonnet satin ajusté XL.', productName: 'Bonnet Satin Microfibre XL' }
    ]
  },
  {
    id: 'r3',
    slug: 'kids-douceur',
    title: 'Kids Douceur & Anti-Larmes',
    subtitle: 'Routine simplifiée spéciale enfants aux cheveux bouclés, frisés ou crépus.',
    category: 'enfants',
    badge: 'Douceur Enfants',
    benefit: 'Démêlage facile, zéro larmes et cheveux doux.',
    duration: '10 minutes',
    price: 49.00,
    originalPrice: 58.00,
    image: KIDS_CARE_IMAGE,
    products: [MOCK_PRODUCTS[0], MOCK_PRODUCTS[7], MOCK_PRODUCTS[10]],
    steps: [
      { number: 1, title: 'Vaporisation Démêlante', description: 'Humidifie les mèches avec le spray kids.', productName: 'Kit Kids Douceur' },
      { number: 2, title: 'Crème Coiffante Douce', description: 'Applique une noisette de leave-in avant de faire des vanilles.', productName: 'Leave-In Hydratant Cacao' }
    ]
  },
  {
    id: 'r4',
    slug: 'melanin-skin',
    title: 'Melanin Skin Glow & Anti-Taches',
    subtitle: 'Routine quotidienne visage pour peaux mates à très foncées.',
    category: 'peau',
    badge: 'Innovation Skin',
    benefit: 'Teint plus harmonieux sans altérer la carnation naturelle.',
    duration: '4 minutes matin et soir',
    price: 58.00,
    originalPrice: 72.00,
    image: MELANIN_SKIN_IMAGE,
    products: [MOCK_PRODUCTS[5], MOCK_PRODUCTS[9]],
    steps: [
      { number: 1, title: 'Sérum Anti-Marques (Soir)', description: 'Uniformise en douceur les zones tachées post-boutons.', productName: 'Sérum Marques Post-Imperfections' },
      { number: 2, title: 'Sérum SPF 50+ (Matin)', description: 'Protege chaque matin avec zéro voile blanc.', productName: 'Sérum SPF 50+ Invisible' }
    ]
  }
];

export const MOCK_PROS: ProfessionalPro[] = [
  {
    id: 'pro1',
    slug: 'aminata-diallo-braids-paris',
    name: 'Aminata Diallo',
    title: 'Master Braider & Spécialiste Protective Styles',
    city: 'Paris',
    address: '14 Rue de la Goutte d’Or, 75018 Paris',
    category: 'braider',
    verified: true,
    certified: true,
    rating: 4.95,
    reviewCount: 38,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    portfolio: [
      PROTECTIVE_IMAGE,
      HERO_IMAGE,
      MELANIN_SKIN_IMAGE
    ],
    bio: 'Pionnière des Knotless Braids sans tension à Paris. Diplômée en soin de la fibre capillaire texturée. Engagement zéro casse et respect absolu de la ligne de pousse.',
    specialties: ['Knotless Braids', 'Fulani Braids', 'Passion Twists', 'Soin Cuir Chevelu Pré-Pose'],
    services: [
      { id: 's1', name: 'Knotless Braids Medium', duration: '3h30', price: 120, description: 'Prestation complète avec préparation hydratante du cuir chevelu inclus.' },
      { id: 's2', name: 'Passion Twists Bohème', duration: '4h00', price: 140, description: 'Twists légères et naturelles sans lourdeur.' }
    ]
  },
  {
    id: 'pro2',
    slug: 'koffi-loctician-lyon',
    name: 'Koffi Mensah',
    title: 'Master Loctician & Expert Microlocks',
    city: 'Lyon',
    address: '28 Rue Garibaldi, 69006 Lyon',
    category: 'loctician',
    verified: true,
    certified: true,
    rating: 4.98,
    reviewCount: 42,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    portfolio: [
      MEN_GROOMING_IMAGE,
      PROTECTIVE_IMAGE
    ],
    bio: 'Passionné par la culture et le développement des locks saines depuis plus de 10 ans. Spécialisé en retwisting naturel à l’aloe vera et soin des jeunes locks.',
    specialties: ['Départ de Locks', 'Retwisting & Interlocking', 'Soin clarifiant doux sans résidus', 'Microlocks'],
    services: [
      { id: 's3', name: 'Retwisting & Hydratation', duration: '2h00', price: 75, description: 'Tour de tête complet avec massage aux huiles végétales.' },
      { id: 's4', name: 'Bain Detox Locks Profond', duration: '1h15', price: 50, description: 'Nettoyage en profondeur pour éliminer tout résidu de produit.' }
    ]
  },
  {
    id: 'pro3',
    slug: 'sophie-skincare-nantes',
    name: 'Sophie N’Diaye',
    title: 'Experte Skincare Peaux Mélaninées',
    city: 'Nantes',
    address: '5 Rue Crébillon, 44000 Nantes',
    category: 'skincare_expert',
    verified: true,
    certified: true,
    rating: 4.90,
    reviewCount: 29,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    portfolio: [
      MELANIN_SKIN_IMAGE,
      HERO_IMAGE
    ],
    bio: 'Esthéticienne spécialisée dans l’accompagnement des hyperpigmentations et de la déshydratation des peaux mélaninées. Protocoles doux et respectueux.',
    specialties: ['Diagnostic Visage Mélanine', 'Soin Éclat Anti-Taches', 'Hydratation Profonde'],
    services: [
      { id: 's5', name: 'Grand Soin Éclat KURLA', duration: '1h15', price: 85, description: 'Soin complet unifiant sans gommage agressif.' }
    ]
  },
  {
    id: 'pro4',
    slug: 'marcus-barber-marseille',
    name: 'Marcus Kanza',
    title: 'Master Barber & Specialist Hair Cut',
    city: 'Marseille',
    address: '12 Rue Saint-Ferréol, 13001 Marseille',
    category: 'barber',
    verified: true,
    certified: true,
    rating: 4.92,
    reviewCount: 31,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    portfolio: [
      MEN_GROOMING_IMAGE
    ],
    bio: 'Spécialiste des dégradés à blanc sur cheveux texturés, contours ultra nets et entretien des barbes denses.',
    specialties: ['Dégradé Afro', 'Taille de Barbe & Serviette Chaude', 'Design Contours'],
    services: [
      { id: 's6', name: 'Coupe & Barbe Premium', duration: '1h00', price: 45, description: 'Coupe sur-mesure avec soin de barbe apaisant.' }
    ]
  }
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    slug: 'comment-hydrater-cheveux-crepus-secs',
    title: 'Comment hydrater efficacement des cheveux crépus secs ?',
    category: 'Cheveux & Porosité',
    excerpt: 'Découvre la méthode LOC/LCO adaptée à ta porosité pour sceller l’eau dans tes boucles 4C sans créer d’effet poisseux.',
    readTime: '5 min',
    date: '28 Juillet 2026',
    author: 'KURLA Lab',
    image: HERO_IMAGE,
    content: `
      Les cheveux crépus et très frisés possèdent une structure hélicoïdale unique. En raison de leurs spires serrées, le sébum produit par le cuir chevelu peine à s’écouler le long de la tige capillaire. C’est pourquoi les longueurs et les pointes ont une tendance naturelle à la sécheresse.

      ### 1. Comprendre la différence entre hydratation et nutrition
      - **Hydrater**, c’est apporter de l’EAU à la fibre.
      - **Nourrir & Sceller**, c’est utiliser des corps gras (beurres et huiles) pour retenir cette eau.

      ### 2. La Méthode LCO (Liquid - Cream - Oil)
      1. **L (Liquid)** : Humidifier la chevelure avec de l’eau minérale ou un spray hydratant à l'aloe vera.
      2. **C (Cream)** : Appliquer un Leave-In riche formulé avec du beurre de cacao ou de mangue.
      3. **O (Oil)** : Appliquer quelques gouttes d'huile légère pour fixer l'hydratation.

      ### 3. Les erreurs courantes à éviter
      Mettre de l’huile sur des cheveux complètement secs ne fait que bloquer l'humidité à l'extérieur. Pense toujours à humidifier tes cheveux avant tout corps gras !
    `,
    faq: [
      { question: 'À quelle fréquence faut-il hydrater des cheveux 4C ?', answer: 'Toutes les 48h à 72h selon ta porosité et ton climat.' },
      { question: 'Le beurre de karité alourdit-il les cheveux ?', answer: 'Oui si tes cheveux ont une porosité faible. Privilégie le beurre de mangue ou les lotions plus fluides.' }
    ],
    relatedProducts: ['p1', 'p3', 'p5']
  },
  {
    id: 'a2',
    slug: 'spf-peau-noire',
    title: 'SPF peau noire : comment éviter définitivement les traces blanches ?',
    category: 'Skincare Peau Mélaninée',
    excerpt: 'Pourquoi la protection solaire est essentielle sur peau mate et foncée, et comment choisir un filtre 100% invisible.',
    readTime: '4 min',
    date: '24 Juillet 2026',
    author: 'Sophie N’Diaye',
    image: MELANIN_SKIN_IMAGE,
    content: `
      C’est un mythe répandu : la mélanine protègerait intégralement la peau noire des effets néfastes du soleil. S'il est vrai que la mélanine offre une protection naturelle équivalente à un SPF 3 à 4, elle ne protège ni du vieillissement cutané ni de l'apparition de taches sombres post-inflammatoires !

      ### Pourquoi les solaires classiques laissent un reflet gris ?
      La plupart des écrans solaires minéraux utilisent du Dioxyde de Titane ou de l'Oxyde de Zinc en grandes particules. Sur une peau riche en mélanine, ces poudres blanches reflètent la lumière et créent cet effet "masque de plâtre".

      ### La solution KURLA
      Privilégie les sérums solaires dotés de filtres organiques de dernière génération mélangés à de la Niacinamide et du Squalane. Ils fondent instantanément et s'absorbent sans résidu blanc.
    `,
    faq: [
      { question: 'Faut-il mettre de la crème solaire même en hiver ?', answer: 'Oui, les rayons UVA responsables des taches et du vieillissement traversent les nuages et les vitres.' }
    ],
    relatedProducts: ['p6', 'p10']
  },
  {
    id: 'a3',
    slug: 'entretenir-braids',
    title: 'Entretenir ses braids sans casse ni démangeaisons',
    category: 'Protective Styles',
    excerpt: 'Les gestes simples pour conserver des tresses propres pendant 4 semaines sans fragiliser ta ligne de pousse.',
    readTime: '6 min',
    date: '15 Juillet 2026',
    author: 'Aminata Diallo',
    image: PROTECTIVE_IMAGE,
    content: `
      Les tresses protectrices (knotless braids, box braids, passion twists) sont idéales pour accorder du repos à tes longueurs. Cependant, si elles sont mal entretenues ou gardées trop longtemps, elles peuvent causer de l'alopécie de traction.

      ### 1. Ne jamais serrer les tempes
      Les petits cheveux situés sur le contour du visage (baby hairs) sont très fragiles. Exige de ton braider de ne pas inclure ces zones fines dans les tresses principales.

      ### 2. Hydrater le cuir chevelu sous les tresses
      Utilise un spray apaisant formulé à la menthe poivrée et à l'aloe vera 1 fois par jour pour éviter que le cuir chevelu ne s'assèche.

      ### 3. La nuit : bonnet satin obligatoire
      Le satin empêche les tresses d'accrocher le tissu du lit et limite l'apparition des petits frisottis.
    `,
    faq: [
      { question: 'Combien de temps garder ses knotless braids ?', answer: '4 à 6 semaines maximum pour préserver la santé des racines.' }
    ],
    relatedProducts: ['p4', 'p5', 'p7']
  }
];
