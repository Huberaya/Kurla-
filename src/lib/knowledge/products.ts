export interface IngredientInfo {
  name: string;
  category: 'hydratation' | 'nutrition' | 'apaisement' | 'skincare' | 'proteine';
  origin: string;
  benefits: string[];
  recommendedFor: string;
}

export const KURLA_INGREDIENTS: IngredientInfo[] = [
  {
    name: 'Beurre de Karité Grand Cru',
    category: 'nutrition',
    origin: 'Afrique de l’Ouest (Chantiers Équitables)',
    benefits: ['Gaine la fibre 4C', 'Scelle l’hydratation', 'Protège des agressions extérieures (froid, calcaire)'],
    recommendedFor: 'Cheveux crépus, porosité forte, zones sèches du corps'
  },
  {
    name: 'Gel d’Aloe Vera Bio',
    category: 'hydratation',
    origin: 'Agriculture Biologique',
    benefits: ['Restaure l’eau au cœur de la fibre', 'Apaise les démangeaisons du cuir chevelu', 'Définit les boucles'],
    recommendedFor: 'Toutes porosités, cuir chevelu sensible'
  },
  {
    name: 'Niacinamide (Vitamine B3)',
    category: 'skincare',
    origin: 'Actif Dermatologique Cosmétique',
    benefits: ['Uniformise le teint sur peaux foncées', 'Atténue l’apparence des marques post-imperfections', 'Renforce la barrière cutanée'],
    recommendedFor: 'Peaux mélaninées sujettes aux taches'
  },
  {
    name: 'Protéines de Soie & Riz Hydrolysées',
    category: 'proteine',
    origin: 'Extraits Végétaux',
    benefits: ['Restructure les zones fragilisées par la casse', 'Redonne de l’élasticité'],
    recommendedFor: 'Cheveux cassants, forte porosité, défrisés ou décolorés'
  },
  {
    name: 'Huile de Baobab & Hibiscus',
    category: 'nutrition',
    origin: 'Pressée à Froid',
    benefits: ['Assouplit la tige capillaire', 'Apporte de la brillance sans alourdir'],
    recommendedFor: 'Bain d’huile pré-shampooing, scellage léger'
  }
];

export function calculateProductFit(productCategory: string, porosity: string, hairType: string): number {
  let score = 85;
  if (porosity === 'forte' && (productCategory.includes('Beurre') || productCategory.includes('Masque'))) score += 10;
  if (porosity === 'faible' && (productCategory.includes('Lait') || productCategory.includes('Aloe'))) score += 9;
  if (hairType.includes('4C') || hairType.includes('Crépus')) score += 4;
  return Math.min(score, 98);
}
