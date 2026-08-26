export interface ToolItem {
  id: string;
  name: string;
  category: 'sommeil' | 'demelage' | 'coiffage' | 'soin';
  forWho: string;
  whenToUse: string;
  benefits: string[];
  errorsToAvoid: string;
  image: string;
}

export const KURLA_TOOLS: ToolItem[] = [
  {
    id: 'bonnet-satin',
    name: 'Bonnet en Satin Ajustable',
    category: 'sommeil',
    forWho: 'Cheveux crépus, bouclés, braids, locks, tissages',
    whenToUse: 'Toutes les nuits avant de dormir',
    benefits: [
      'Empêche la déshydratation causée par le coton',
      'Réduit la casse et les frisottis au réveil',
      'Préserve la ligne de pousse et les edges'
    ],
    errorsToAvoid: 'Serrer le lien élastique trop fort sur le front.',
    image: 'https://images.unsplash.com/photo-1584297091622-af8964893796?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'taie-satin',
    name: 'Taie d’Oreiller en Satin de Soie',
    category: 'sommeil',
    forWho: 'Cheveux & peaux sensibles',
    whenToUse: 'Toutes les nuits',
    benefits: [
      'Alternative ou complément au bonnet satin',
      'Limite les frottements sur le visage et prévient la déshydratation cutanée'
    ],
    errorsToAvoid: 'La laver avec des produits agressifs.',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'brosse-flex',
    name: 'Brosse Démêlante Souple Flex',
    category: 'demelage',
    forWho: 'Cheveux 3A à 4C & cheveux d’enfants',
    whenToUse: 'Sur cheveux mouillés/imbibés de leave-in ou après-shampooing',
    benefits: [
      'Rangées flexibles qui glissent sans arracher la fibre',
      'Réduit la douleur du démêlage de 80%'
    ],
    errorsToAvoid: 'Utiliser sur cheveux 4C totalement secs.',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'peigne-dents-larges',
    name: 'Peigne à Dents Larges Anti-Casse',
    category: 'demelage',
    forWho: 'Toutes textures texturées',
    whenToUse: 'Pendant le soin sous la douche ou pré-démêlage aux doigts',
    benefits: ['Sépare les sections sans casser les boucles'],
    errorsToAvoid: 'Commencer par les racines au lieu des pointes.',
    image: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'vaporisateur-continu',
    name: 'Vaporisateur à Brume Continue 360°',
    category: 'coiffage',
    forWho: 'Hydratation quotidienne cheveux & cuir chevelu',
    whenToUse: 'Chaque matin avant d’appliquer un lait ou un gel',
    benefits: ['Répartit une brume ultra-fine d’eau sans tremper les vêtements'],
    errorsToAvoid: 'Laisser stagnante l’eau non filtrée pendant des semaines.',
    image: 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'applicateur-cuir-chevelu',
    name: 'Flacon Embout Applicateur Cuir Chevelu',
    category: 'soin',
    forWho: 'Porteurs de braids, locks, vanilles ou cuir chevelu sec',
    whenToUse: 'Application d’huiles ou lotions directement en racines',
    benefits: ['Atteint le cuir chevelu sans salir les tresses ou extensions'],
    errorsToAvoid: 'Appliquer des quantités excessives qui coulent.',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'serviette-microfibre',
    name: 'Serviette Microfibre Capillaire',
    category: 'soin',
    forWho: 'Séchage doux des boucles et afro',
    whenToUse: 'Après le rinçage du masque',
    benefits: ['Absorbe l’excès d’eau sans créer de frisottis ni abîmer les cuticules'],
    errorsToAvoid: 'Frotter énergiquement les cheveux.',
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80'
  }
];
