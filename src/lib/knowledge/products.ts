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
    name: 'Niacinamide (Vitamine B3) — 5% sweet spot',
    category: 'skincare',
    origin: 'Actif Dermatologique Cosmétique',
    benefits: ['Uniformise le teint sur peaux foncées', 'Atténue l’apparence des marques post-imperfections (HPI)', 'Renforce la barrière cutanée'],
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
  },
  // ── C5 P1 — 10 fiches peau supplémentaires (15 total peau+cheveux) ────────
  {
    name: 'Acide Azélaïque 10%',
    category: 'skincare',
    origin: 'Céréales (orge) — synthèse',
    benefits: ['Alternative niacinamide pour taches tenaces', 'Apaisant + antibactérien doux', 'Sans phototoxicité'],
    recommendedFor: 'Mixte/grasse · taches + imperfections · phototypes IV–VI'
  },
  {
    name: 'Vitamine C (Sodium Ascorbyl Phosphate) 10%',
    category: 'skincare',
    origin: 'Synthèse stabilisée',
    benefits: ['Antioxydant éclat', 'Synergie vitamine E', 'Forme stable la plus tolérée'],
    recommendedFor: 'Teint terne · éclat · peaux normales à mixtes'
  },
  {
    name: 'Rétinol — introduction progressive',
    category: 'skincare',
    origin: 'Synthèse — UE max 0,3%',
    benefits: ['Rénovateur cellulaire', 'Affine grain & ridules', 'JAMAIS même soir que AHA/BHA'],
    recommendedFor: 'Peaux matures · grain irrégulier · SPF le matin obligatoire'
  },
  {
    name: 'Acide Glycolique (AHA) 5%',
    category: 'skincare',
    origin: 'Synthèse — plus petit AHA',
    benefits: ['Exfolie en surface', 'Lisse le grain', '1–2×/sem max'],
    recommendedFor: 'Mixte/grasse · grain irrégulier · prévoir SPF lendemain'
  },
  {
    name: 'Acide Salicylique (BHA) 2% — UE max',
    category: 'skincare',
    origin: 'Synthèse — lipophile',
    benefits: ['Désobstrue les pores', 'Lisse les points noirs', 'Sérum ou nettoyant'],
    recommendedFor: 'Peaux grasses · points noirs · pores dilatés'
  },
  {
    name: 'Céramides NP + Squalane — barrière',
    category: 'skincare',
    origin: 'Biomimétique / olive',
    benefits: ['Restaure lipides barrière', 'Scelle l’hydratation', 'Peu comédogène'],
    recommendedFor: 'Sèche/sensible · deshydratée · toute carnation V–VI safe'
  },
  {
    name: 'Acide Hyaluronique — repulpant',
    category: 'skincare',
    origin: 'Fermentation',
    benefits: ['Humectant 1000× son poids', 'Repulpe immédiat', 'À appliquer sur peau humide'],
    recommendedFor: 'Déshydratée · mixte & sèche · sceller avec crème'
  },
  {
    name: 'Glycérine — humectant de référence',
    category: 'skincare',
    origin: 'Végétal',
    benefits: ['Retient l’eau en surface', 'Assouplit', 'Présente dans 90% des formules'],
    recommendedFor: 'Toutes peaux · 5–10% idéal'
  },
  {
    name: 'Allantoïne + Panthénol (B5) — cica doux',
    category: 'apaisement',
    origin: 'Consoude / synthèse',
    benefits: ['Apaise & lisse sans décaper', 'Favorise l’aspect lisse', 'Très bien toléré'],
    recommendedFor: 'Réactive · sensible · phototypes foncés'
  },
  {
    name: 'Centella Asiatica (Cica) — réparatrice',
    category: 'apaisement',
    origin: 'Plante — madécassoside',
    benefits: ['Apaise rougeurs', 'Soutient barrière réactive', 'Vocabulaire “réconforter”, pas médical'],
    recommendedFor: 'Sensible · rougeurs · cicatrices (aspect)'
  },
];

export function calculateProductFit(productCategory: string, porosity: string, hairType: string): number {
  let score = 85;
  if (porosity === 'forte' && (productCategory.includes('Beurre') || productCategory.includes('Masque'))) score += 10;
  if (porosity === 'faible' && (productCategory.includes('Lait') || productCategory.includes('Aloe'))) score += 9;
  if (hairType.includes('4C') || hairType.includes('Crépus')) score += 4;
  return Math.min(score, 98);
}
