/**
 * BUREAU DES ACHATS — plan d'action de la responsable achats.
 *
 * Ordonne le travail de sourcing en PHASES concrètes, de la revente rapide
 * (compte grossiste → gamme vendable vite) au façonnage lent (héros KURLA),
 * en passant par les marques et les accessoires.
 *
 * Chaque phase pointe vers des prospects RÉELS (ids du seed) et dit quoi
 * demander. Aucun prix, MOQ, délai ni contact n'est inventé : la « checklist
 * de demande » est ce qu'il faut OBTENIR du fournisseur, pas ce qu'il a donné.
 * Les réponses réelles se remplissent dans l'onglet Contacts / Références.
 */

export interface PurchasingPhase {
  id: string;
  order: number;
  title: string;
  /** Horizon temporel indicatif (relatif, pas une promesse fournisseur). */
  horizon: string;
  route: 'A' | 'B' | 'A+B';
  /** Objectif de la phase en une phrase. */
  objective: string;
  /** Pourquoi cet ordre (logique de responsable achats). */
  rationale: string;
  /** Prospects concernés (ids réels du seed). */
  prospectIds: string[];
  /** Ce qu'il faut demander au fournisseur (la liste de devis/infos). */
  askFor: string[];
  /** Résultat attendu qui fait passer à l'étape suivante. */
  doneWhen: string;
  /** Besoins du plan d'assortiment couverts par cette phase (mots-clés). */
  covers: string[];
}

/** Checklist standard d'une demande de prix / référencement (revente). */
export const RFQ_CHECKLIST_RETAIL: string[] = [
  'Grille de tarifs de gros / prix revendeur (€ HT, par quantité)',
  'Quantité minimum de commande (MOQ) et minimum de première commande',
  'Délai de livraison France/UE et frais de port',
  'Échantillons : possibilité et coût avant commande',
  'Dropshipping possible (oui/non) si stock déporté',
  'Visuels autorisés + argumentaire produit pour la fiche',
  'Pour les cosmétiques : INCI/DIP et conformité UE (PIF, CPSR, CPNP) à la marque',
];

/** Checklist standard d'une demande de façonnage (marque KURLA). */
export const RFQ_CHECKLIST_PRIVATE_LABEL: string[] = [
  'Devis à MOQ (500 / 1 000 / 5 000 unités) par formule',
  'Délai de développement + production, et capacité mensuelle',
  'PIF + CPSR + notification CPNP fournis par le laboratoire',
  'Formules existantes (stock) vs développement sur mesure',
  'Matières premières, origine et certifications (ISO 22716, Cosmos, vegan)',
  'Conditionnement, étiquetage, et possibilités de coques/visuels',
  'Échantillons de laboratoire avant tout engagement',
];

export const PURCHASING_PHASES: PurchasingPhase[] = [
  {
    id: 'phase-grossistes',
    order: 1,
    title: 'Ouvrir les comptes grossistes multimarques',
    horizon: 'Immédiat (semaine 1-2)',
    route: 'A',
    objective: 'Obtenir en un minimum d’échanges une gamme large et vendable (shampoings, leave-in, gels, accessoires) via les grossistes.',
    rationale: 'Le grossiste ouvre l’accès à des dizaines de marques sans négocier compte par compte : c’est le moyen le plus rapide d’atteindre une offre étoffée et de tester la demande.',
    prospectIds: ['c23', 'c15', 'c22'],
    askFor: RFQ_CHECKLIST_RETAIL,
    doneWhen: 'Grille tarifaire reçue d’au moins un grossiste + MOQ et délai connus + 1ère commande d’échantillons possible.',
    covers: ['laver', 'hydrater', 'définir', 'fixer', 'satin', 'outils'],
  },
  {
    id: 'phase-marques-fr',
    order: 2,
    title: 'Ouvrir les comptes revendeurs des marques françaises',
    horizon: 'Semaine 2-4',
    route: 'A',
    objective: 'Référencer les marques françaises plébiscitées pour les cheveux crépus/bouclés, y compris les gammes enfant.',
    rationale: 'Les marques FR apportent la confiance et la proximité (livraison, SAV, enfants) ; elles complètent le grossiste sur les produits phares nourrissants et démêlants.',
    prospectIds: ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07'],
    askFor: RFQ_CHECKLIST_RETAIL,
    doneWhen: 'Comptes revendeurs ouverts (tarifs pro + conditions) pour au moins 3 marques, gammes enfant incluses.',
    covers: ['laver', 'nourrir', 'hydrater', 'démêler', 'enfants', 'cuir chevelu'],
  },
  {
    id: 'phase-marques-eu',
    order: 3,
    title: 'Référencer les marques UE fixation & définition',
    horizon: 'Semaine 3-5',
    route: 'A',
    objective: 'Compléter la gamme coiffage (gels, mousses, crèmes de définition) avec des marques UE distribuées largement.',
    rationale: 'La fixation et la définition sont très demandées et bien servies par les marques UE (CG/vegan) ; elles montent le panier moyen sur le wash & go.',
    prospectIds: ['c08', 'c09', 'c10', 'c11'],
    askFor: RFQ_CHECKLIST_RETAIL,
    doneWhen: 'Conditions de distribution UE connues (prix gros, seuils, livraison FR) pour au moins 2 marques.',
    covers: ['définir', 'fixer'],
  },
  {
    id: 'phase-solaire-peau',
    order: 4,
    title: 'Sécuriser le solaire sans trace & le soin taches (peaux mélanisées)',
    horizon: 'Semaine 4-6',
    route: 'A',
    objective: 'Référencer les SPF sans trace blanche et sérums anti-taches, différenciateurs forts pour les peaux noires et métisses.',
    rationale: 'Le solaire qui laisse un voile blanc est la première objection des peaux mélanisées ; sécuriser ces références tôt crée un motif d’achat distinctif.',
    prospectIds: ['c12', 'c14', 'c13'],
    askFor: [
      ...RFQ_CHECKLIST_RETAIL,
      'Statut d’importation/distribution UE (le produit US peut nécessiter un représentant UE)',
      'Allégations et SPF documentés (pas de promesse non étayée)',
    ],
    doneWhen: 'Au moins un SPF sans trace distribuable en UE avec conformité confirmée.',
    covers: ['solaire', 'taches', 'hydrater peau'],
  },
  {
    id: 'phase-accessoires',
    order: 5,
    title: 'Référencer les accessoires satin premium',
    horizon: 'Semaine 3-6',
    route: 'A',
    objective: 'Proposer bonnets satin et taies de marques françaises qualitatives (revente ou co-branding).',
    rationale: 'Le satin est un achat récurrent à bonne marge ; les marques premium FR valorisent l’offre là où le grossiste fournit l’entrée de gamme.',
    prospectIds: ['c24', 'c25'],
    askFor: [
      'Tarif revente / gros et minimum par couleur',
      'Personnalisation (co-branding / couleur KURLA) et son seuil',
      'Délai et stock disponible',
    ],
    doneWhen: 'Offre satin échelonnée (grossiste entrée de gamme + marque premium) référencée.',
    covers: ['satin'],
  },
  {
    id: 'phase-faconnage',
    order: 6,
    title: 'Lancer le façonnage des produits héros KURLA',
    horizon: 'En parallèle, 2-4 mois',
    route: 'B',
    objective: 'Faire développer par un laboratoire UE les quelques produits héros à la marque KURLA (shampoing clarifiant, leave-in, masque).',
    rationale: 'Le façonnage est long et structurant : on le lance tôt en parallèle de la revente, sans bloquer le lancement. Noesis accepte de petits MOQ (≈500) et fournit PIF/CPSR/CPNP.',
    prospectIds: ['c18', 'c16', 'c17', 'c19', 'c20', 'c21'],
    askFor: RFQ_CHECKLIST_PRIVATE_LABEL,
    doneWhen: 'Un laboratoire retenu avec devis, échantillons reçus et conformité (PIF/CPSR/CPNP) cadrée pour 1 à 3 héros.',
    covers: ['laver', 'nourrir', 'hydrater', 'casse'],
  },
];

/** Étapes du tunnel d'achat (pour les compteurs), du prospect à la réception. */
export const PURCHASE_FUNNEL_STAGES = [
  { id: 'identified', label: 'Fournisseurs identifiés' },
  { id: 'to_contact', label: 'À contacter' },
  { id: 'in_touch', label: 'En contact / négociation' },
  { id: 'samples', label: 'Échantillons reçus' },
  { id: 'agreed', label: 'Accords / comptes ouverts' },
] as const;
