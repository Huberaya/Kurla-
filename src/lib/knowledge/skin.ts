export interface SkinTypeInfo {
  type: string;
  name: string;
  description: string;
  melaninKeyPoints: string[];
  recommendedIngredients: string[];
  ingredientsToAvoid: string[];
  keyProducts: string[];
}

export const SKIN_KNOWLEDGE: Record<string, SkinTypeInfo> = {
  'melanin-pigmentation': {
    type: 'Peau Mélaninée - Taches & Teint Irrégulier',
    name: 'Peau Riche en Mélanine avec Taches Post-Imperfections',
    description: 'La peau riche en mélanine réagit à l’inflammation (boutons, frottements, soleil) par une surproduction de pigment. Une routine douce sans agression est primordiale.',
    melaninKeyPoints: [
      'Toujours porter un écran solaire SPF 30 ou 50 à fini 100% invisible (sans traces blanches ou grisâtres)',
      'Éviter de percer les boutons pour prévenir l’hyperpigmentation post-inflammatoire',
      'Privilégier la niacinamide, la vitamine C stabilisée et l’acide azélaïque à faible dose',
      'Hydrater en profondeur car une peau déshydratée sécrète plus de sébum et marque plus vite'
    ],
    recommendedIngredients: ['Niacinamide (5%)', 'Vitamine C', 'Acide Hyaluronique', 'Céramides', 'Filtres SPF invisibles'],
    ingredientsToAvoid: ['Alcool dénaturé en haut de liste', 'Gommages physiques à gros grains abrasifs', 'Parfums synthétiques forts'],
    keyProducts: ['Fluide Solaire SPF 50 Incolore', 'Sérum Éclat Niacinamide & Hibiscus', 'Nettoyant Doux Hydratant']
  },
  'melanin-dry': {
    type: 'Peau Mélaninée Sèche / Déshydratée',
    name: 'Peau Sèche à Teint Terne',
    description: 'Sensible aux variations de climat (eau calcaire européenne, vent froid d’hiver). La peau peut paraître cendrée si elle manque de lipides ou d’eau.',
    melaninKeyPoints: [
      'Appliquer la crème sur peau encore légèrement humide après le nettoyage',
      'Utiliser une eau thermale ou une brume apaisante avant le sérum',
      'Ne pas sauter le SPF même en hiver'
    ],
    recommendedIngredients: ['Beurre de karité pur', 'Glycérine', 'Squalane végétal', 'Céramides NP'],
    ingredientsToAvoid: ['Nettoyants sulfatés asséchants', 'Savons décapants'],
    keyProducts: ['Baume Hydratant Intense Céramides', 'Huile Éclat Visage au Jojoba & Marula']
  }
};
