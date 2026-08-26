export interface StructuredAiAnswer {
  shortAnswer: string;
  simpleExplanation: string;
  immediateActions: string[];
  recommendedRoutine: string;
  usefulProducts: { name: string; link: string }[];
  usefulTools: { name: string; description: string }[];
  errorsToAvoid: string[];
  whenToConsultPro: string;
  ctas: { label: string; href: string; type: 'diagnostic' | 'routine' | 'shop' | 'pro' }[];
}

export const MOCK_AI_ANSWERS: Record<string, StructuredAiAnswer> = {
  'cheveux-secs': {
    shortAnswer: 'Les cheveux crépus et frisés retiennent difficilement l’eau si la fibre n’est pas scellée après l’hydratation ou si l’eau d’infiltre mal (eau calcaire/porosité).',
    simpleExplanation: 'L’huile seule ne contient pas d’eau. Si tu penses hydrater tes cheveux uniquement avec des huiles ou des beurres sur cheveux secs, tu crées une barrière imperméable qui empêche l’eau de pénétrer. L’hydratation vient toujours de l’eau ou des soins à base d’eau (leave-in, lait), l’huile sert ensuite à sceller.',
    immediateActions: [
      'Vaporiser de l’eau tiède ou un leave-in fluide à base d’aloe vera sur tes cheveux.',
      'Démêler délicatement de bas en haut.',
      'Appliquer une petite quantité de beurre de karité ou d’huile de baobab pour sceller l’eau.',
      'Dormir avec un bonnet en satin.'
    ],
    recommendedRoutine: 'Routine 3 Étapes "Hydratation & Scellage 4C"',
    usefulProducts: [
      { name: 'Leave-In Conditioner Aloe Vera & Hibiscus', link: '/produit/leave-in-conditioner' },
      { name: 'Beurre de Cacao & Karité Grand Cru', link: '/produit/beurre-de-cacao-karite' },
      { name: 'Shampooing Doux Hydratant Cacao', link: '/produit/shampooing-doux-hydratant' }
    ],
    usefulTools: [
      { name: 'Vaporisateur à Brume Continue 360°', description: 'Permet d’humidifier sans tremper.' },
      { name: 'Bonnet en Satin Ajustable', description: 'Préserve l’eau dans le cheveu toute la nuit.' }
    ],
    errorsToAvoid: [
      'Appliquer de l’huile pure sur cheveux complètement secs.',
      'Laver avec un shampooing décapant tous les jours.',
      'Utiliser l’eau trop chaude lors du rincage.'
    ],
    whenToConsultPro: 'Si le cuir chevelu démange intensément avec des plaques sèches rouges ou si tes cheveux tombent par poignées.',
    ctas: [
      { label: 'Faire mon Diagnostic Cheveux', href: '/diagnostic/cheveux', type: 'diagnostic' },
      { label: 'Voir la Routine Hydratation', href: '/routines/routine-hydratation-4c', type: 'routine' },
      { label: 'Trouver un coiffeur expert 4C', href: '/professionnels', type: 'pro' }
    ]
  },

  'braids-tresses-serrees': {
    shortAnswer: 'Si tes tresses ou knotless font mal ou tirent le cuir chevelu, c’est le signe d’une traction excessive sur les follicules.',
    simpleExplanation: 'La traction prolongée fragilise la racine et peut mener à l’alopécie de traction (perte définitive sur les tempes). Les tresses ne doivent JAMAIS faire mal ni provoquer de petits boutons blancs.',
    immediateActions: [
      'Appliquer immédiatement un spray ou une lotion apaisante à la menthe et aloe vera.',
      'S’il y a des boutons blancs ou une douleur intense : demander à la coiffeuse de desserrer ou défaire doucement la bordure.',
      'Ne pas attacher tes braids en chignon haut pour ne pas rajouter du poids.',
      'Masser le cuir chevelu du bout des doigts sans frotter.'
    ],
    recommendedRoutine: 'Routine Entretien Protective Styles',
    usefulProducts: [
      { name: 'Lotion Apaisante Menthe & Arbre à Thé', link: '/produit/lotion-apaisante-menthe' },
      { name: 'Huile Légère Pousse & Vitalité', link: '/produit/huile-pousse-vitalite' }
    ],
    usefulTools: [
      { name: 'Flacon Embout Applicateur', description: 'Application directe sur les raies.' },
      { name: 'Bonnet Satin XL pour Braids', description: 'Protège les tresses sans frottement.' }
    ],
    errorsToAvoid: [
      'Prendre un antidouleur et supporter la douleur pendant des semaines.',
      'Mettre de la colle ou du gel fort sur des edges déjà douloureux.'
    ],
    whenToConsultPro: 'En cas d’inflammation importante, de saignement, ou si les cheveux s’arrachent avec la racine.',
    ctas: [
      { label: 'Diagnostic Protective Style', href: '/diagnostic/protective-style', type: 'diagnostic' },
      { label: 'Guide "Tresses trop serrées : que faire ?"', href: '/protective-styles', type: 'routine' },
      { label: 'Trouver un Loctician / Braider certifié', href: '/professionnels', type: 'pro' }
    ]
  },

  'enfant-demelage': {
    shortAnswer: 'Le démêlage des enfants doit se faire exclusivement sur cheveux mouillés et gorgés de baume démêlant glissant.',
    simpleExplanation: 'Les cheveux des enfants sont fins et délicats. Le peigne à sec provoque de la douleur et casse la fibre. En séparant en 4 sections et en utilisant une brosse souple avec du produit glissant, le démêlage devient un jeu.',
    immediateActions: [
      'Séparer les cheveux en 4 grosses vanilles.',
      'Vaporiser abondamment d’eau tiède.',
      'Appliquer généreusement le baume démêlant doux.',
      'Démêler doucement avec la brosse flex en partant des pointes vers les racines.'
    ],
    recommendedRoutine: 'Routine Enfant Démêlage Sans Larmes (20 min)',
    usefulProducts: [
      { name: 'Soin Démêlant Magique Enfant', link: '/produit/soin-demelant-enfant' },
      { name: 'Baume Démêlant Doux Mangue & Coton', link: '/produit/baume-demelant-enfant' }
    ],
    usefulTools: [
      { name: 'Brosse Démêlante Souple Flex Enfant', description: 'Ergonomique et sans douleur.' },
      { name: 'Vaporisateur Brume Continue', description: 'Ludique et doux.' }
    ],
    errorsToAvoid: [
      'Tirer fort avec un peigne fin depuis la racine.',
      'Gonder l’enfant s’il bouge : transformer le moment en rituel de jeu ou lecture.'
    ],
    whenToConsultPro: 'Si l’enfant présente des plaques de séparation rouges ou des pellicules épaisses sur le cuir chevelu.',
    ctas: [
      { label: 'Diagnostic Cheveux Enfant', href: '/diagnostic/enfant', type: 'diagnostic' },
      { label: 'Découvrir l’Espace KURLA Kids', href: '/kids', type: 'routine' }
    ]
  },

  'spf-peau-melaninee': {
    shortAnswer: 'Les peaux foncées nécessitent un filtre UV incolore 100% invisible pour protéger contre les taches et le vieillissement.',
    simpleExplanation: 'Contrairement au mythe, la mélanine ne protège qu’à hauteur d’un SPF 13 naturel. Les UV aggravent directement les taches d’acné et l’hyperpigmentation. Il faut privilégier les solaires organiques à la texture fluide.',
    immediateActions: [
      'Appliquer l’équivalent de deux doigts de crème solaire tous les matins.',
      'Choisir un produit mentionnant "incolore / zéro trace blanche".',
      'Réappliquer si exposition prolongée en extérieur.'
    ],
    recommendedRoutine: 'Routine Peau Mélaninée Anti-Taches & Éclat',
    usefulProducts: [
      { name: 'Fluide Solaire Incolore SPF 50 Peaux Mélaninées', link: '/produit/fluide-solaire-spf50' },
      { name: 'Sérum Éclat Niacinamide 5%', link: '/produit/serum-niacinamide' }
    ],
    usefulTools: [
      { name: 'Taie d’Oreiller en Satin', description: 'Garde l’hydratation du visage la nuit.' }
    ],
    errorsToAvoid: [
      'Utiliser des solaires minéraux au zinc trop épais qui laissent un voile violet/gris.',
      'Pensée que le soleil "sèche et guérit" les boutons.'
    ],
    whenToConsultPro: 'Si des taches changent de forme ou d’aspect de manière asymétrique.',
    ctas: [
      { label: 'Diagnostic Peau Mélaninée', href: '/diagnostic/peau', type: 'diagnostic' },
      { label: 'Espace Peaux Mélaninées', href: '/melanin-skin', type: 'routine' }
    ]
  }
};

export function getStructuredAnswer(query: string): StructuredAiAnswer {
  const q = query.toLowerCase();

  if (q.includes('braid') || q.includes('tresse') || q.includes('serré') || q.includes('mal') || q.includes('knotless')) {
    return MOCK_AI_ANSWERS['braids-tresses-serrees'];
  }
  if (q.includes('enfant') || q.includes('bébé') || q.includes('pleur') || q.includes('fille') || q.includes('garçon')) {
    return MOCK_AI_ANSWERS['enfant-demelage'];
  }
  if (q.includes('spf') || q.includes('soleil') || q.includes('peau') || q.includes('tache') || q.includes('trace blanche')) {
    return MOCK_AI_ANSWERS['spf-peau-melaninee'];
  }

  // Default to dry hair/porosity
  return MOCK_AI_ANSWERS['cheveux-secs'];
}
