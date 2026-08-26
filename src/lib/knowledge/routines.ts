export interface RoutinePreset {
  id: string;
  title: string;
  category: 'debutante' | 'cheveux-secs' | 'protective-style' | 'kids' | 'hommes' | 'peau-melaninee' | 'europe-hiver' | 'climat-chaud';
  description: string;
  steps: {
    stepNumber: number;
    title: string;
    action: string;
    frequency: string;
    productRecommended: string;
    toolRecommended: string;
  }[];
  durationMinutes: number;
  difficulty: 'Débutante' | 'Intermédiaire' | 'Avancée';
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'routine-debutante-4c',
    title: 'Routine 3 Étapes "Débutante 4C / Afro"',
    category: 'debutante',
    description: 'Une routine ultra-simple et efficace pour les personnes qui veulent prendre soin de leurs cheveux crépus sans y passer des heures.',
    durationMinutes: 20,
    difficulty: 'Débutante',
    steps: [
      {
        stepNumber: 1,
        title: 'Nettoyage Doux (Wash Day)',
        action: 'Laver avec un shampooing doux hydratant sans sulfates, masser uniquement le cuir chevelu.',
        frequency: '1x par semaine ou tous les 10 jours',
        productRecommended: 'Shampooing Doux Hydratant Cacao',
        toolRecommended: 'Brosse nettoyante massage cuir chevelu'
      },
      {
        stepNumber: 2,
        title: 'Hydratation & Démêlage',
        action: 'Appliquer le leave-in sur cheveux très mouillés, démêler doucement des pointes vers les racines.',
        frequency: 'Après chaque lavage + ré-hydratation légère en milieu de semaine',
        productRecommended: 'Leave-In Aloe Vera & Hibiscus',
        toolRecommended: 'Brosse Démêlante Souple Flex'
      },
      {
        stepNumber: 3,
        title: 'Scellage de l’Eau',
        action: 'Chauffer une noisette de beurre ou huile entre les mains et appliquer sur les longueurs et pointes.',
        frequency: 'Immédiatement après l’hydratation',
        productRecommended: 'Beurre de Cacao & Karité Grand Cru',
        toolRecommended: 'Mains & Bonnet en Satin pour la nuit'
      }
    ]
  },
  {
    id: 'routine-protective-braids',
    title: 'Routine Entretien Braids, Locks & Protective Styles',
    category: 'protective-style',
    description: 'Maintenir un cuir chevelu sain et frais pendant toute la durée des tresses ou locks sans accumulation de résidus.',
    durationMinutes: 10,
    difficulty: 'Débutante',
    steps: [
      {
        stepNumber: 1,
        title: 'Purifier & Apaiser le Cuir Chevelu',
        action: 'Vaporiser la lotion à la menthe douce directement sur les raies du cuir chevelu.',
        frequency: '2 à 3 fois par semaine',
        productRecommended: 'Lotion Apaisante Menthe & Arbre à Thé',
        toolRecommended: 'Flacon Embout Applicateur'
      },
      {
        stepNumber: 2,
        title: 'Nourrir les Racines',
        action: 'Masser délicatement 3 gouttes d’huile légère au bout des doigts pour stimuler la pousse.',
        frequency: '2 fois par semaine',
        productRecommended: 'Huile Légère Pousse & Vitalité',
        toolRecommended: 'Bout des doigts (massage doux)'
      },
      {
        stepNumber: 3,
        title: 'Protection Nocturne',
        action: 'Mettre un bonnet satin grand format avant de se coucher.',
        frequency: 'Toutes les nuits',
        productRecommended: 'Aucun produit direct',
        toolRecommended: 'Bonnet Satin XL pour Braids'
      }
    ]
  },
  {
    id: 'routine-kids-douceur',
    title: 'Routine Enfants "Démêlage Sans Larmes" (20 min)',
    category: 'kids',
    description: 'Conçue spécialement pour les parents : rendre le moment du soin agréable et rapide sans douleur.',
    durationMinutes: 20,
    difficulty: 'Débutante',
    steps: [
      {
        stepNumber: 1,
        title: 'Humidification & Sectionnement',
        action: 'Séparer les cheveux en 4 grosses nattes ou torsades et vaporiser d’eau tiède.',
        frequency: 'Avant le shampoing ou le démêlage',
        productRecommended: 'Soin Démêlant Magique Enfant',
        toolRecommended: 'Vaporisateur à brume continue'
      },
      {
        stepNumber: 2,
        title: 'Démêlage Glissant',
        action: 'Appliquer le baume démêlant et passer la brosse flex doucement des pointes vers le haut.',
        frequency: '1x par semaine',
        productRecommended: 'Baume Démêlant Doux Mangue & Coton',
        toolRecommended: 'Brosse Démêlante Flex Enfant'
      },
      {
        stepNumber: 3,
        title: 'Coiffure Protectrice Douce',
        action: 'Faire des matons ou vanilles lâches (jamais serrées) pour garder l’hydratation.',
        frequency: 'Toute la semaine',
        productRecommended: 'Beurre Fondant Léger Enfant',
        toolRecommended: 'Elastiques en satin doux'
      }
    ]
  },
  {
    id: 'routine-peau-melaninee-spf',
    title: 'Routine Peau Mélaninée "Anti-Taches & Éclat"',
    category: 'peau-melaninee',
    description: 'Uniformiser le teint, atténuer les marques post-boutons et protéger des UV sans traces blanches.',
    durationMinutes: 5,
    difficulty: 'Débutante',
    steps: [
      {
        stepNumber: 1,
        title: 'Nettoyage Doux Non Décapant',
        action: 'Nettoyer le visage matin et soir avec un gel doux sans sulfates.',
        frequency: 'Matin & Soir',
        productRecommended: 'Nettoyant Doux Hydratant Hibiscus',
        toolRecommended: 'Mains propres'
      },
      {
        stepNumber: 2,
        title: 'Cible Taches & Hydratation',
        action: 'Appliquer 3 gouttes de sérum à la niacinamide sur peau propre.',
        frequency: 'Matin ou Soir',
        productRecommended: 'Sérum Éclat Niacinamide 5%',
        toolRecommended: 'Tapoter délicatement'
      },
      {
        stepNumber: 3,
        title: 'Protection UV Invisible (Matin)',
        action: 'Appliquer généreusement le fluide solaire SPF 50 incolore en dernière étape.',
        frequency: 'Tous les matins (365 jours par an)',
        productRecommended: 'Fluide Solaire Incolore SPF 50 Peaux Mélaninées',
        toolRecommended: 'Appliquer 2 doigts de produit'
      }
    ]
  }
];
