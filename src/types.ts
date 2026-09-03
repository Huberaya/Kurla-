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
  imageTrust?: 'brand_provided' | 'licensed' | 'editorial' | 'illustrative' | 'unverified';
  isOfficial?: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  label: string;
  optionType?: 'weight' | 'format' | 'shade' | 'scent' | 'size';
  optionValue?: string;
  sku?: string;
  price: number;
  stockQuantity: number;
  reservedQuantity?: number;
  inStock: boolean;
}

export interface IngredientRole {
  name: string;
  role: string;
}

export interface ProductCertification {
  name: string;
  issuer?: string;
  verificationUrl?: string;
  status: 'verified' | 'pending' | 'not_provided';
  verifiedAt?: string;
}

export interface ProductReview {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  author: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ProductQuestion {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
}

export interface ProductShippingInfo {
  countries: string[];
  deliveryEstimate?: string;
  deliveryFee?: number;
  freeFromAmount?: number;
  returnsPolicy?: string;
}

export interface CatalogQuality {
  status: 'draft' | 'pending_review' | 'published' | 'unavailable';
  ingredientVerification: 'verified' | 'pending' | 'not_provided';
  claimsValidation: 'verified' | 'pending' | 'not_provided';
  imagesValidation: 'verified' | 'pending' | 'not_provided';
  stockValidation: 'verified' | 'pending' | 'not_provided';
  certificationsValidation: 'verified' | 'pending' | 'not_provided';
  translationsValidation: 'verified' | 'pending' | 'not_provided';
  brandVerification: 'verified' | 'pending' | 'not_provided';
  lastReviewedAt?: string;
  lastUpdatedAt?: string;
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
  benefitPrimary?: string;
  targetHairTypes?: string[];
  targetSkinTypes?: string[];
  texture?: string;
  fragrance?: string;
  usageFrequency?: string;
  sizeLabel?: string;
  estimatedYield?: string;
  ingredientRoles?: IngredientRole[];
  allergens?: string[];
  containsFragrance?: boolean;
  originCountry?: string;
  certifications?: ProductCertification[];
  quality?: CatalogQuality;
  shippingInfo?: ProductShippingInfo;
  returnsPolicy?: string;
  variants?: ProductVariant[];
  verifiedReviewCount?: number;
  questionsCount?: number;
  inStock: boolean;
  disclaimer?: string;
  needs?: string[]; // E.g., ['hydrater_cheveux', 'reduire_casse', 'taches_hyperpigmentation']
  countryAvailability?: string[]; // E.g., ['FR', 'BE', 'DOM', 'AFR', 'INT']
  audienceTags?: string[];
  recommendedAgeBand?: 'baby' | 'child' | 'teen' | 'adult' | 'all_ages' | 'not_provided';
  recommendedAgeMin?: number;
  recommendedAgeMax?: number;
  minorSafetyStatus?: 'verified' | 'pending' | 'not_provided';
  adultOnlyActives?: string[];
  parentalSupervisionRequired?: boolean;
  imageSupervisionStatus?: 'verified' | 'pending' | 'not_provided';
  communityBrand?: boolean; // Marque de la communauté afro-descendante
  isNew?: boolean;
  isPromo?: boolean;
  isPreorder?: boolean; // Article en précommande (lot non encore réceptionné)
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
  /**
   * Fréquence déclarée de la routine ('' si absente). Renvoyée par
   * `serverDb.getRoutines()` : le type client doit refléter la réponse réelle,
   * sinon les écrans lisent un champ que le compilateur croit inexistant.
   */
  frequency: string;
  products: Product[];
  steps: {
    number: number;
    title: string;
    description: string;
    productName: string;
    productId: string;
    variantId?: string;
    quantity: number;
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
  createdAt?: string;
  author: string;
  image: string;
  content: string;
  contentType?: 'article' | 'video' | 'guide' | 'ingredient_sheet' | 'routine';
  topic?: string;
  language?: string;
  updatedAt?: string;
  sources?: Array<{ label: string; url?: string; publisher?: string; accessedAt?: string; note?: string }>;
  evidenceLevel?: 'not_provided' | 'low' | 'moderate' | 'high' | 'expert_consensus';
  medicalWarning?: string;
  translations?: Record<string, { title: string; excerpt?: string; content: string; medicalWarning?: string }>;
  mediaUrl?: string;
  duration?: string;
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
  variantId?: string;
  variantLabel?: string;
  unitPrice?: number;
}

export type UserRole = 'customer' | 'professional' | 'support' | 'editor' | 'brand' | 'admin' | 'superadmin';

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

// ——— Visuels de marque ———
// Un visuel de marque est une photographie décorative sélectionnée et vérifiée :
// elle montre des personnes afro-descendantes / métisses, des cheveux texturés ou
// des peaux riches en mélanine, sous licence Unsplash (usage commercial autorisé).
export interface BrandImageCredit {
  author: string;
  url: string;
}

export interface BrandImage {
  id: string;
  photoId: string;
  /** Texte alternatif en français — obligatoire, décrit ce que montre réellement la photo. */
  alt: string;
  /** Texte alternatif en anglais. */
  altEn: string;
  credit: BrandImageCredit;
  /** Tonalité de peau dominante mesurée : deep | dark | texture. */
  tone: string;
  /** Couleur dominante, utilisée comme fond pendant le chargement. */
  color: string;
  /** Largeur / hauteur de la source. */
  ratio: number;
  /** Placeholder flouté en base64 (LQIP) — évite tout décalage de mise en page. */
  lqip: string;
}
