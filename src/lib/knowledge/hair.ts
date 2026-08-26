export interface HairTypeInfo {
  type: string;
  name: string;
  description: string;
  porosityAdvice: {
    low: string;
    medium: string;
    high: string;
  };
  keyProducts: string[];
  keyTools: string[];
  keyErrorsToAvoid: string[];
}

export const HAIR_KNOWLEDGE: Record<string, HairTypeInfo> = {
  '4c': {
    type: '4C',
    name: 'Cheveux Crépus Très Serrés (4C)',
    description: 'Fibre capillaire en Z très resserrée, rétrécissement (shrinkage) jusqu’à 75%. Sensible à la déshydratation mais possède une grande mémoire de forme et une beauté incomparable.',
    porosityAdvice: {
      low: 'Utiliser la chaleur douce (bonnet chauffant, serviette tiède) lors du soin. Préférer les laits légers et les humectants comme l’aloe vera.',
      medium: 'Routine équilibrée hydratation/protéines. Méthode LOC ou LCO une à deux fois par semaine.',
      high: 'Beurres riches (karité, cacao) et huiles scellantes (ricin, baobab). Rincer à l’eau tiède, terminer par un soin protéiné régulier.',
    },
    keyProducts: ['Sérum Cuir Chevelu Apaisant', 'Beurre de Cacao & Karité', 'Leave-In Hydratant Aloe Vera', 'Masque Soin Profond Protéiné'],
    keyTools: ['Bonnet en satin', 'Brosse démêlante souple (Flex)', 'Vaporisateur d’eau filtrée', 'Peigne à dents larges'],
    keyErrorsToAvoid: [
      'Démêler à sec sans produit ou eau',
      'Coiffer trop serré au niveau des tempes (alopécie de traction)',
      'Multiplier les huiles lourdes sans nettoyer le cuir chevelu',
      'Dormir sans bonnet ni taie en satin'
    ]
  },
  '4a-4b': {
    type: '4A/4B',
    name: 'Cheveux Crépus & Frisés (4A/4B)',
    description: 'Boucles en S très définies ou spires resserrées. Maintient bien l’hydratation si scellée correctement.',
    porosityAdvice: {
      low: 'Soin à chaud léger, eau tiède, éviter l’excès de beurre lourd qui étouffe le cheveu.',
      medium: 'Méthode LCO (Liquid, Cream, Oil) très efficace 2x/semaine.',
      high: 'Protéines de soie ou riz 1x par mois, sérum scellant au baobab.',
    },
    keyProducts: ['Crème Définition Boucles', 'Lait Capillaire Hydratant', 'Huile de Baobab & Hibiscus'],
    keyTools: ['Bonnet satin', 'Vaporisateur d’eau tiède', 'Brosse à picots souples'],
    keyErrorsToAvoid: [
      'Négliger le cuir chevelu en appliquant la crème directement aux racines',
      'Utiliser des peignes à dents trop fines'
    ]
  },
  '3b-3c': {
    type: '3B/3C',
    name: 'Cheveux Bouclés & Frisés (3B/3C)',
    description: 'Boucles en tire-bouchon volumineuses, sujettes aux frisottis en cas d’humidité ou d’eau calcaire.',
    porosityAdvice: {
      low: 'Gelée d’aloe vera légère pour définir sans alourdir.',
      medium: 'Combinaison leave-in + gelée définissante.',
      high: 'Crème nourrissante riche en céramides.',
    },
    keyProducts: ['Gelée Coiffante Hibiscus & Aloe', 'Leave-In Conditioner Léger'],
    keyTools: ['Brosse démêlante à rangées amovibles', 'Serviette microfibre'],
    keyErrorsToAvoid: [
      'Frotter les cheveux avec une serviette en éponge classique',
      'Sécher au séchoir chaud sans embout diffuseur'
    ]
  }
};

export const PROTECTIVE_STYLE_KNOWLEDGE = {
  signsOfExcessiveTension: [
    'Douleur vive ou tiraillement persistant après la pose',
    'Petits boutons blancs ou rouges le long de la ligne de pousse (tempes, nuque)',
    'Impossibilité de poser sa tête à plat pour dormir',
    'Maux de tête ou sensation de tension crânienne'
  ],
  maintenanceTips: [
    'Hydrater le cuir chevelu avec un spray apaisant à la menthe douce 2 à 3 fois par semaine',
    'Utiliser une huile légère pour stimuler les racines sans accumuler de résidus',
    'Dormir impérativement avec un bonnet satin grand format spécial braids/locks',
    'Ne pas garder le protective style plus de 6 à 8 semaines'
  ]
};
