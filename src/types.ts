export type HairTexture = 'bouclee' | 'frisee' | 'crepue' | 'locksee' | 'defrisee' | 'protective' | 'inconnue';
export type HairStyle = 'naturel' | 'braids' | 'twists' | 'locks' | 'wig' | 'defrise' | 'enfant';
export type HairPriority = 'hydratation' | 'casse' | 'definition' | 'pousse' | 'cuir_chevelu' | 'entretien_protective' | 'demelage_enfant';
export type Porosity = 'faible' | 'moyenne' | 'forte' | 'inconnue';
export type ScalpCondition = 'normal' | 'sec' | 'sensible' | 'demangeaisons' | 'pellicules' | 'irritation';

export type SkinType = 'seche' | 'mixte' | 'grasse' | 'sensible' | 'inconnue';
export type SkinPriority = 'taches' | 'teint_irregulier' | 'hydratation' | 'spf' | 'acne_legere' | 'sensibilite';

export interface HairDiagnosticAnswers {
  texture: HairTexture;
  style: HairStyle;
  priority: HairPriority;
  porosity: Porosity;
  scalp: ScalpCondition;
  frequency: 'debutante' | '1x_semaine' | '2x_semaine' | 'irreguliere';
  budget: 'moins_40' | '40_70' | '70_100' | 'premium';
  email: string;
}

export interface SkinDiagnosticAnswers {
  skinType: SkinType;
  priority: SkinPriority;
  spfUsage: 'quotidien' | 'parfois' | 'jamais' | 'recherche';
  sensitivity: 'faible' | 'moyenne' | 'elevee';
  routine: 'aucune' | 'simple' | 'complete' | 'inconnue';
  budget: 'moins_40' | '40_70' | '70_100' | 'premium';
  email: string;
}

export interface ProductGalleryImage {
  url: string;
  label: string;
  type: 'hero' | 'detail' | 'lifestyle' | 'use' | 'size' | 'kit';
  isOfficial?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: 'cheveux' | 'peau' | 'enfants' | 'hommes' | 'accessoires' | 'kits';
  subCategory?: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  badges: string[];
  forWho: string;
  notIdealIf: string;
  howToUse: string;
  routineStep: string;
  keyIngredients: string[];
  inci: string;
  description: string;
  inStock: boolean;
  disclaimer?: string;
  needs?: string[]; // E.g., ['hydrater_cheveux', 'reduire_casse', 'taches_hyperpigmentation']
  countryAvailability?: string[]; // E.g., ['FR', 'BE', 'DOM', 'AFR', 'INT']
  communityBrand?: boolean; // Marque de la communauté afro-descendante
  isNew?: boolean;
  isPromo?: boolean;
  subCategoryTag?: string; // Fine-grained subcategory tag
  galleryImages?: ProductGalleryImage[];
  isIllustrativeVisual?: boolean;
  illustrativeNotice?: string;
}

export interface RoutineBundle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: 'cheveux' | 'peau' | 'enfants' | 'protective';
  badge: string;
  benefit: string;
  duration: string;
  price: number;
  originalPrice?: number;
  image: string;
  products: Product[];
  steps: {
    number: number;
    title: string;
    description: string;
    productName: string;
  }[];
}

export interface ProfessionalPro {
  id: string;
  slug: string;
  name: string;
  title: string;
  city: 'Paris' | 'Lyon' | 'Nantes' | 'Marseille' | 'Bordeaux' | 'Bruxelles';
  address: string;
  category: 'braider' | 'loctician' | 'coiffeur_afro' | 'coiffeur_enfants' | 'barber' | 'wig_installer' | 'skincare_expert';
  verified: boolean;
  certified: boolean;
  rating: number;
  reviewCount: number;
  avatar: string;
  portfolio: string[];
  bio: string;
  specialties: string[];
  services: {
    id: string;
    name: string;
    duration: string;
    price: number;
    description: string;
  }[];
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  date: string;
  author: string;
  image: string;
  content: string;
  faq?: { question: string; answer: string }[];
  relatedProducts?: string[];
}

export interface AIRecommendationResult {
  summary: string;
  recommendedRoutine: string;
  reason: string;
  steps: string[];
  warnings: string[];
  productHandles: string[];
  requiresHumanReview: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type UserRole = 'customer' | 'professional' | 'support' | 'editor' | 'admin' | 'superadmin';

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country?: string;
  age_range?: string;
  hair_type?: string;
  texture?: string;
  density?: string;
  scalp_condition?: string;
  skin_type?: string;
  sensitivity?: string;
  concerns?: string[];
  product_preferences?: Record<string, any>;
  budget?: string;
  language?: string;
  role: UserRole;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}
