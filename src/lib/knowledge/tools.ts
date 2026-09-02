export interface ToolItem {
  id: string;
  name: string;
  category: 'sommeil' | 'demelage' | 'coiffage' | 'soin';
  forWho: string;
  whenToUse: string;
  benefits: string[];
  errorsToAvoid: string;
  image: string;
  /**
   * HARMONISATION BOUTIQUE ↔ GUIDE : slug du produit réellement vendu en
   * boutique. La fiche guide affiche alors l'image, le prix et le lien du
   * produit catalogue (source unique de vérité) au lieu d'un visuel générique
   * différent du même objet. `undefined` = outil documenté mais pas encore
   * commercialisé.
   */
  productSlug?: string;
}

/**
 * Visuels de repli (familles du catalogue, hébergés sur le storage KURLA).
 * Utilisés uniquement si le produit boutique lié n'est pas chargé : on ne
 * montre jamais deux photos différentes du même objet quand le catalogue
 * répond.
 */
const IMG = 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images';

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
    image: `${IMG}/kurla-satin.jpg`,
    productSlug: 'preco-bonnet-satin-nuit-taie-d-oreiller'
  },
  {
    id: 'taie-satin',
    name: 'Taie d’Oreiller en Satin',
    category: 'sommeil',
    forWho: 'Cheveux & peaux sensibles',
    whenToUse: 'Toutes les nuits',
    benefits: [
      'Alternative ou complément au bonnet satin',
      'Limite les frottements sur le visage et prévient la déshydratation cutanée'
    ],
    errorsToAvoid: 'La laver avec des produits agressifs.',
    image: `${IMG}/kurla-satin.jpg`,
    // Vendue en boutique dans le set bonnet + taie (même objet, même fiche).
    productSlug: 'preco-bonnet-satin-nuit-taie-d-oreiller'
  },
  {
    id: 'brosse-flex',
    name: 'Brosse Démêlante Souple Flex',
    category: 'demelage',
    forWho: 'Cheveux 3A à 4C & cheveux d’enfants',
    whenToUse: 'Sur cheveux mouillés/imbibés de leave-in ou après-shampooing',
    benefits: [
      'Rangées flexibles qui glissent sans arracher la fibre',
      'Rend le démêlage nettement moins douloureux'
    ],
    errorsToAvoid: 'Utiliser sur cheveux 4C totalement secs.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-brosse-demelante-flexible-dents-picots'
  },
  {
    id: 'peigne-dents-larges',
    name: 'Peigne à Dents Larges Anti-Casse',
    category: 'demelage',
    forWho: 'Toutes textures texturées',
    whenToUse: 'Pendant le soin sous la douche ou pré-démêlage aux doigts',
    benefits: ['Sépare les sections sans casser les boucles'],
    errorsToAvoid: 'Commencer par les racines au lieu des pointes.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-peigne-demeloir-a-dents-larges'
  },
  {
    id: 'vaporisateur-continu',
    name: 'Vaporisateur à Brume Continue 360°',
    category: 'coiffage',
    forWho: 'Hydratation quotidienne cheveux & cuir chevelu',
    whenToUse: 'Chaque matin avant d’appliquer un lait ou un gel',
    benefits: ['Répartit une brume ultra-fine d’eau sans tremper les vêtements'],
    errorsToAvoid: 'Laisser stagnante l’eau non filtrée pendant des semaines.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-flacon-vaporisateur-brume-continue'
  },
  {
    id: 'applicateur-cuir-chevelu',
    name: 'Flacon Embout Applicateur Cuir Chevelu',
    category: 'soin',
    forWho: 'Porteurs de braids, locks, vanilles ou cuir chevelu sec',
    whenToUse: 'Application d’huiles ou lotions directement en racines',
    benefits: ['Atteint le cuir chevelu sans salir les tresses ou extensions'],
    errorsToAvoid: 'Appliquer des quantités excessives qui coulent.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-flacon-applicateur-embout-precis'
  },
  {
    id: 'serviette-microfibre',
    name: 'Serviette Microfibre Capillaire',
    category: 'soin',
    forWho: 'Séchage doux des boucles et afro',
    whenToUse: 'Après le rinçage du masque',
    benefits: ['Absorbe l’excès d’eau sans créer de frisottis ni abîmer les cuticules'],
    errorsToAvoid: 'Frotter énergiquement les cheveux.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-serviette-microfibre-boucles'
  },

  // ── Outils vendus en boutique qui n'avaient pas encore de fiche guide ──
  {
    id: 'brosse-denman',
    name: 'Brosse 7 Rangs Type Denman',
    category: 'coiffage',
    forWho: 'Boucles 3A à 4C en quête de définition',
    whenToUse: 'Sur cheveux mouillés chargés de produit coiffant (brush styling)',
    benefits: [
      'Sculpte et regroupe les boucles pour une définition nette',
      'Répartit uniformément gel ou crème de la racine aux pointes'
    ],
    errorsToAvoid: 'Brosser à sec : la définition se travaille sur cheveu mouillé et enduit.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-brosse-demelante-7-rangs-type-denman'
  },
  {
    id: 'shampoo-brush',
    name: 'Brosse Massage Cuir Chevelu Silicone',
    category: 'soin',
    forWho: 'Cuir chevelu à build-up, démangeaisons, shampoing qui mousse peu',
    whenToUse: 'Pendant le shampoing ou le soin du cuir chevelu, 1 à 2 fois par semaine',
    benefits: [
      'Décolle les résidus sans agresser avec les ongles',
      'Masse et stimule le cuir chevelu pendant le lavage'
    ],
    errorsToAvoid: 'Frotter fort et vite : ce sont des mouvements lents et circulaires qui nettoient.',
    image: `${IMG}/kurla-accessory.jpg`,
    productSlug: 'preco-brosse-massage-cuir-chevelu-silicone'
  },
  {
    id: 'diffuseur',
    name: 'Diffuseur Universel pour Sèche-Cheveux',
    category: 'coiffage',
    forWho: 'Boucles et afro qui veulent sécher sans casser la définition',
    whenToUse: 'Après le styling, à chaleur douce/moyenne, tête penchée',
    benefits: [
      'Diffuse l’air sans souffler directement sur les boucles (moins de frisottis)',
      'Apporte volume aux racines sans déconstruire le styling'
    ],
    errorsToAvoid: 'Chaleur maximale collée aux longueurs : toujours doux, par sections.',
    image: `${IMG}/kurla-device.jpg`,
    productSlug: 'preco-diffuseur-universel-pour-seche-cheveux'
  },
  {
    id: 'eponge-twist',
    name: 'Éponge Twist / Curl Sponge',
    category: 'coiffage',
    forWho: 'Cheveux courts 4A-4C, hommes, débuts de locs freeform',
    whenToUse: 'Sur cheveux propres, légèrement hydratés, par mouvements circulaires',
    benefits: [
      'Forme coils et twists en quelques minutes sans manipulation brin par brin',
      'Idéale pour entretenir un style court entre deux coiffures'
    ],
    errorsToAvoid: 'L’utiliser sur cheveux emmêlés ou secs : démêler et hydrater d’abord.',
    image: `${IMG}/kurla-men.jpg`,
    productSlug: 'preco-eponge-twist-curl-sponge'
  },
  {
    id: 'bonnet-chauffant',
    name: 'Bonnet Chauffant Soin Profond',
    category: 'soin',
    forWho: 'Cheveux très secs, faible porosité, masques qui « ne prennent pas »',
    whenToUse: 'Par-dessus un masque ou un soin profond, 20 à 30 minutes',
    benefits: [
      'La chaleur douce et indirecte aide le soin à mieux pénétrer la fibre',
      'Transforme le masque du dimanche en vrai rituel efficace'
    ],
    errorsToAvoid: 'Le porter sur cheveux nus sans soin : la chaleur seule dessèche.',
    image: `${IMG}/kurla-device.jpg`,
    productSlug: 'preco-bonnet-chauffant-soin-profond'
  }
];

/**
 * Index inverse : slug produit boutique → fiche guide. Permet à la boutique et
 * aux fiches produit d'afficher « Guide d'utilisation » quand l'objet vendu est
 * documenté ici (un seul objet, deux angles : acheter / apprendre).
 */
export const TOOL_BY_PRODUCT_SLUG: ReadonlyMap<string, ToolItem> = new Map(
  KURLA_TOOLS.filter((tool): tool is ToolItem & { productSlug: string } => Boolean(tool.productSlug))
    .map(tool => [tool.productSlug, tool])
);
