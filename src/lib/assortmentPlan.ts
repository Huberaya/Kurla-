/**
 * PLAN D'ASSORTIMENT KURLA — vue expert « responsable achats ».
 *
 * Répond à la question amont du sourcing : **de quels produits avons-nous
 * besoin, et qui faut-il contacter pour les obtenir ?**
 *
 * Le plan découpe l'offre par DOMAINE (cheveux / peau & solaire / enfant /
 * outils) puis par BESOIN = la fonction remplie pour la cliente (hydrater,
 * réduire la casse, soigner le cuir chevelu, protéger du soleil sans trace
 * blanche…). Chaque besoin liste :
 *   - les types de produits à commander (orientations, pas de fausses SKU) ;
 *   - les prospects RÉELS déjà identifiés (ids du seed `prospectSeed.ts`) ;
 *   - le type de contact à chercher s'il manque ;
 *   - la route d'achat (A = revente de marques, B = façonnage KURLA).
 *
 * Règle d'or tenue : ce module ne contient AUCUN nom de contact, prix, MOQ ni
 * délai inventé. Il pointe vers des prospects dont le contact est suivi dans
 * `sourcing_prospects` ; un besoin sans prospect est marqué comme un
 * **fournisseur à identifier** (c'est une information, pas une omission).
 */

export type AssortmentDomain = 'hair' | 'skin' | 'kids' | 'tools';
export type SourcingRoute = 'A' | 'B' | 'A+B';
export type NeedPriority = 'essential' | 'important' | 'later';

export interface AssortmentNeed {
  id: string;
  domain: AssortmentDomain;
  /** Le besoin vu par la cliente, ex. « Réduire la casse ». */
  concern: string;
  /** Bénéfice produit attendu (ce que la formulation doit faire). */
  benefit: string;
  /** Note experte : pourquoi c'est stratégique pour les cheveux/peaux texturés. */
  why: string;
  priority: NeedPriority;
  /** Types de produits à commander (orientations d'achat, pas des références inventées). */
  productTypes: string[];
  /** Étapes de routine candidates correspondantes (pour matcher les candidats réels seedés). */
  routineSteps: string[];
  /** Types de contacts à solliciter pour ce besoin. */
  contactTypes: Array<'brand_fr' | 'brand_eu' | 'skin_solar' | 'distributor' | 'contract_manufacturer'>;
  /** Prospects réels (ids du seed) déjà identifiés pour ce besoin. */
  prospectIds: string[];
  /** true si le besoin passe avantageusement par le grossiste multimarques. */
  viaDistributor?: boolean;
  /** true si aucun fournisseur n'est encore identifié (travail de sourcing à ouvrir). */
  supplierGap?: boolean;
  routeHint: SourcingRoute;
}

export const ASSORTMENT_DOMAINS: Array<{ id: AssortmentDomain; label: string; hint: string }> = [
  { id: 'hair', label: 'Cheveux', hint: 'Crépus, bouclés, frisés, défrisés, locks & tresses' },
  { id: 'skin', label: 'Peau & Solaire', hint: 'Peaux mélanisées, hyperpigmentation, soleil sans trace' },
  { id: 'kids', label: 'Enfants', hint: 'Cheveux texturés des enfants, douceur & démêlage' },
  { id: 'tools', label: 'Outils & Protection', hint: 'Satin, démêlage, application — matériel de routine' },
];

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  brand_fr: 'Marque française (revente)',
  brand_eu: 'Marque européenne (revente)',
  skin_solar: 'Marque soin/solaire peaux mélanisées',
  distributor: 'Grossiste / distributeur multimarques',
  contract_manufacturer: 'Façonnier (marque KURLA)',
};

export const ASSORTMENT_NEEDS: AssortmentNeed[] = [
  // ---------------------------------------------------------------- CHEVEUX
  {
    id: 'hair-clarify',
    domain: 'hair',
    concern: 'Clarifier / purifier',
    benefit: 'Éliminer les résidus (build-up), produits coiffants et silicones avant un soin profond.',
    why: 'Les routines riches (gels, beurres) accumulent des dépôts qui étouffent la fibre et le cuir chevelu. Un shampoing clarifiant 1 à 2 fois par mois est la base du wash day sain.',
    priority: 'essential',
    productTypes: ['Shampoing clarifiant / purifiant', 'Shampoing à base de tensioactifs doux mais nettoyants'],
    routineSteps: ['Shampoing'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor', 'contract_manufacturer'],
    prospectIds: ['c04', 'c15', 'c16', 'c17', 'c18'],
    viaDistributor: true,
    routeHint: 'A+B',
  },
  {
    id: 'hair-wash-gentle',
    domain: 'hair',
    concern: 'Laver en douceur / hydrater',
    benefit: 'Nettoyer sans dessécher, respecter le film hydrolipidique des cheveux crépus.',
    why: 'Les cheveux très texturés sont naturellement secs : le lavage doit être doux (shampoing hydratant ou co-wash) pour ne pas aggraver la sécheresse entre deux clarifications.',
    priority: 'essential',
    productTypes: ['Shampoing hydratant / nourrissant', 'Co-wash (après-shampoing lavant)'],
    routineSteps: ['Shampoing'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor'],
    prospectIds: ['c01', 'c02', 'c15'],
    viaDistributor: true,
    routeHint: 'A',
  },
  {
    id: 'hair-scalp',
    domain: 'hair',
    concern: 'Prendre soin du cuir chevelu',
    benefit: 'Apaiser démangeaisons et tiraillements, assainir, soutenir la pousse à la racine.',
    why: 'Un cuir chevelu sain conditionne la pousse et limite la casse aux tempes, notamment sous coiffures protectrices tendues. C\'est un besoin fréquent et peu couvert.',
    priority: 'important',
    productTypes: ['Sérum / lotion cuir chevelu apaisant', 'Soin antipelliculaire doux', 'Huile de soin des racines'],
    routineSteps: ['Huile'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor', 'contract_manufacturer'],
    prospectIds: ['c07', 'c15', 'c16', 'c20'],
    viaDistributor: true,
    routeHint: 'A+B',
  },
  {
    id: 'hair-deep-nutrition',
    domain: 'hair',
    concern: 'Nourrir en profondeur',
    benefit: 'Régénérer la fibre très sèche/abîmée avec un masque riche (beurres, huiles, actifs).',
    why: 'L\'étape « deep condition » du wash day réintroduit lipides et eau. Sans masque riche, les cheveux crépus restent cassants malgré les leave-in.',
    priority: 'essential',
    productTypes: ['Masque nourrissant riche (karité, ricin, avocat)', 'Soin reconstructeur profond'],
    routineSteps: ['Masque'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor'],
    prospectIds: ['c01', 'c03', 'c15'],
    viaDistributor: true,
    routeHint: 'A',
  },
  {
    id: 'hair-moisturize-leavein',
    domain: 'hair',
    concern: 'Hydrater au quotidien (leave-in)',
    benefit: 'Apporter et retenir l\'eau dans la fibre entre les wash days, base de la rétention hydrique.',
    why: 'Le leave-in hydratant est LE produit du quotidien des cheveux texturés : sans lui, l\'hydratation du wash day s\'évapore en 48 h.',
    priority: 'essential',
    productTypes: ['Leave-in hydratant / lait crème', 'Lotion hydratante vaporisable (refresher)'],
    routineSteps: ['Leave-in', 'Après-shampoing'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor'],
    prospectIds: ['c02', 'c08', 'c01', 'c15'],
    viaDistributor: true,
    routeHint: 'A',
  },
  {
    id: 'hair-anti-breakage',
    domain: 'hair',
    concern: 'Réduire la casse / renforcer',
    benefit: 'Reconstruire la fibre avec des protéines/kératine et limiter la cassure aux longueurs et pointes.',
    why: 'La casse est la première frustration des cheveux crépus. Des soins protéinés ciblés (en alternance avec l\'hydratation) réduisent nettement la perte de longueur.',
    priority: 'important',
    productTypes: ['Soin reconstructeur protéiné / kératine', 'Masque force & croissance', 'Sérum anti-casse pointes'],
    routineSteps: ['Masque', 'Leave-in'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor', 'contract_manufacturer'],
    prospectIds: ['c15', 'c10', 'c16', 'c18'],
    viaDistributor: true,
    routeHint: 'A+B',
  },
  {
    id: 'hair-seal',
    domain: 'hair',
    concern: 'Sceller l\'hydratation (beurres & huiles)',
    benefit: 'Refermer la fibre avec un corps gras pour emprisonner l\'eau du leave-in (méthode LOC/LCO).',
    why: 'Sans beurre ou huile de scellement, l\'hydratation ne tient pas. C\'est le geste signature de la rétention hydrique des cheveux crépus.',
    priority: 'essential',
    productTypes: ['Beurre de karité pur / beurre de mangue', 'Huiles de scellement (ricin, coco, jojoba, avocat)', 'Crème de scellement épaisse (butter cream)'],
    routineSteps: ['Huile'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor'],
    prospectIds: ['c02', 'c07', 'c15'],
    viaDistributor: true,
    routeHint: 'A',
  },
  {
    id: 'hair-detangle',
    domain: 'hair',
    concern: 'Démêler sans tiraillement',
    benefit: 'Glisser sur les nœuds pour limiter la casse mécanique au peigne.',
    why: 'Le démêlage est l\'étape où se produit l\'essentiel de la casse. Un bon slip (après-shampoing / leave-in) change tout, surtout sur cheveux crépus et enfants.',
    priority: 'essential',
    productTypes: ['Après-shampoing démêlant riche', 'Leave-in « slip » démêlant'],
    routineSteps: ['Après-shampoing', 'Leave-in'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor'],
    prospectIds: ['c01', 'c06', 'c15'],
    viaDistributor: true,
    routeHint: 'A',
  },
  {
    id: 'hair-define',
    domain: 'hair',
    concern: 'Définir les boucles / twists',
    benefit: 'Modeler des boucles et twists définis, souples et sans frisottis.',
    why: 'La curling cream / crème de définition est le cœur du résultat « boucles nettes » attendu par la cliente bouclée à crépue.',
    priority: 'important',
    productTypes: ['Crème de définition boucles/twists (curling cream)', 'Crème soufflée / twist butter'],
    routineSteps: ['Coiffage', 'Leave-in'],
    contactTypes: ['brand_fr', 'brand_eu', 'distributor'],
    prospectIds: ['c08', 'c02', 'c05', 'c15'],
    viaDistributor: true,
    routeHint: 'A',
  },
  {
    id: 'hair-hold',
    domain: 'hair',
    concern: 'Fixer sans dessécher',
    benefit: 'Tenir la coiffure (wash & go, twist-out) avec un gel ou une mousse qui ne blanchit pas et ne rend pas rêche.',
    why: 'La fixation fait durer la coiffure 3 à 7 jours. Les gels/mousses adaptés aux cheveux texturés sont très demandés et bien représentés chez les marques UE.',
    priority: 'important',
    productTypes: ['Gel de définition forte tenue', 'Mousse coiffante « juicy »', 'Gel de tenue légère'],
    routineSteps: ['Fixation'],
    contactTypes: ['brand_eu', 'brand_fr', 'distributor'],
    prospectIds: ['c08', 'c09', 'c10', 'c11'],
    routeHint: 'A',
  },
  {
    id: 'hair-protective',
    domain: 'hair',
    concern: 'Entretenir les coiffures protectrices',
    benefit: 'Hydrater et apaiser sous tresses/locks/tresses collées pendant plusieurs semaines.',
    why: 'Les coiffures protectrices durent 4 à 8 semaines ; sans sprays/huiles d\'entretien, la fibre et les tempes souffrent. C\'est aussi le déclencheur des relances « retrait de coiffure ».',
    priority: 'important',
    productTypes: ['Spray brillance / anti-démangeaisons tresses & locks', 'Huile braids/locs', 'Mousse de fixation de tresses'],
    routineSteps: ['Coiffage', 'Huile'],
    contactTypes: ['brand_fr', 'distributor', 'contract_manufacturer'],
    prospectIds: ['c07', 'c15', 'c19'],
    viaDistributor: true,
    routeHint: 'A+B',
  },

  // ----------------------------------------------------------------- PEAU
  {
    id: 'skin-cleanse',
    domain: 'skin',
    concern: 'Nettoyer la peau',
    benefit: 'Nettoyer en douceur sans agresser la barrière cutanée des peaux mélanisées.',
    why: 'Le nettoyage est la base de la routine visage ; un nettoyant trop agressif déclenche tiraillements et hyperpigmentation post-inflammatoire.',
    priority: 'important',
    productTypes: ['Gel nettoyant doux visage', 'Savon surgras / pain dermatologique corps'],
    routineSteps: [],
    contactTypes: ['contract_manufacturer', 'skin_solar'],
    prospectIds: ['c20', 'c21', 'c18'],
    routeHint: 'B',
  },
  {
    id: 'skin-moisturize',
    domain: 'skin',
    concern: 'Hydrater visage & corps',
    benefit: 'Maintenir l\'hydratation et l\'élasticité des peaux sèches à très sèches.',
    why: 'Les peaux mélanisées paraissent souvent plus sèches et réclament des textures riches. La crème hydratante est un achat récurrent.',
    priority: 'important',
    productTypes: ['Crème hydratante visage', 'Lait / beurre corps nourrissant'],
    routineSteps: [],
    contactTypes: ['contract_manufacturer', 'skin_solar'],
    prospectIds: ['c20', 'c18', 'c13'],
    routeHint: 'B',
  },
  {
    id: 'skin-sunscreen',
    domain: 'skin',
    concern: 'Protéger du soleil sans trace blanche',
    benefit: 'SPF large spectre adapté aux peaux noires/métisses : zéro résidu blanc, fini invisible.',
    why: 'Le filtre solaire qui laisse un voile blanc est la première objection des peaux mélanisées — et la protection solaire reste indispensable (hyperpigmentation, vieillissement). Différenciateur fort.',
    priority: 'essential',
    productTypes: ['Fluide solaire SPF 50 sans trace', 'Crème teintée protectrice'],
    routineSteps: ['Solaire'],
    contactTypes: ['skin_solar'],
    prospectIds: ['c12', 'c14'],
    routeHint: 'A',
  },
  {
    id: 'skin-dark-spots',
    domain: 'skin',
    concern: 'Corriger les taches / éclat',
    benefit: 'Atténuer hyperpigmentation, cicatrices et marques post-inflammatoires sur peau mélanisée.',
    why: 'L\'uniformisation du teint est la demande n°1 des peaux noires et métisses. Des sérums ciblés (et sûrs) sont très attendus.',
    priority: 'important',
    productTypes: ['Sérum anti-taches / éclat', 'Soin contour spécifique mélanine'],
    routineSteps: [],
    contactTypes: ['skin_solar'],
    prospectIds: ['c13'],
    routeHint: 'A',
  },
  {
    id: 'skin-soothe',
    domain: 'skin',
    concern: 'Apaiser / peau sensible',
    benefit: 'Calmer rougeurs, réactivité et tiraillements sans ingrédient agressif.',
    why: 'Une offre sensible sécurise les clientes qui réagissent aux actifs concentrés (acides, parfums).',
    priority: 'later',
    productTypes: ['Crème apaisante / barrière', 'Sérum calmant'],
    routineSteps: [],
    contactTypes: ['contract_manufacturer'],
    prospectIds: ['c20', 'c18'],
    routeHint: 'B',
  },

  // --------------------------------------------------------------- ENFANTS
  {
    id: 'kids-wash',
    domain: 'kids',
    concern: 'Laver & hydrater les enfants',
    benefit: 'Nettoyer les cheveux texturés des enfants avec des formules très douces, sans tiraillement.',
    why: 'Les gammes enfants sont un achat de confiance (les mères choisissent avec exigence) et un levier de fidélisation précoce.',
    priority: 'important',
    productTypes: ['Shampoing doux enfant', 'Après-shampoing / leave-in enfant'],
    routineSteps: ['Enfant', 'Shampoing', 'Après-shampoing'],
    contactTypes: ['brand_fr'],
    prospectIds: ['c01', 'c02', 'c06'],
    routeHint: 'A',
  },
  {
    id: 'kids-style',
    domain: 'kids',
    concern: 'Démêler & coiffer les enfants',
    benefit: 'Faciliter le coiffage quotidien sans douleur (crèmes, lotions démêlantes douces).',
    why: 'Le coiffage sans tiraillement est un soulagement concret pour les parents et le bien-être des enfants.',
    priority: 'important',
    productTypes: ['Lotion / crème coiffante enfant', 'Beurre doux démêlant enfant'],
    routineSteps: ['Enfant', 'Leave-in'],
    contactTypes: ['brand_fr'],
    prospectIds: ['c01', 'c02', 'c06'],
    routeHint: 'A',
  },

  // ----------------------------------------------------- OUTILS & PROTECTION
  {
    id: 'tools-night-protection',
    domain: 'tools',
    concern: 'Protéger la nuit (satin)',
    benefit: 'Préserver hydratation et coiffure pendant le sommeil avec le satin (friction réduite).',
    why: 'Le bonnet/taie en satin est un réflexe de rétention hydratante et de durabilité des coiffures. Achat récurrent, forte marge. Grossistes PB (AfricanFabs, Afro Wholesale) et marques françaises premium (Curly Nights, Studio Boucle Paris) identifiés, à contacter pour le prix de gros et la revente.',
    priority: 'important',
    productTypes: ['Bonnet de nuit en satin', 'Taie d\'oreiller satin', 'Foulard / headwrap satin'],
    routineSteps: ['Accessoire'],
    contactTypes: ['distributor', 'brand_fr'],
    prospectIds: ['c22', 'c23', 'c24', 'c25'],
    routeHint: 'A',
  },
  {
    id: 'tools-detangling',
    domain: 'tools',
    concern: 'Outils de démêlage & d\'application',
    benefit: 'Le bon matériel (peignes dents larges, brosses, flacons) pour appliquer les routines sans casser.',
    why: 'Les accessoires prolongent l\'usage des produits et complètent le panier moyen. Le grossiste B2B Afro Wholesale (PB, livraison UE) couvre peignes afro, brosses et bonnets en gros.',
    priority: 'later',
    productTypes: ['Peigne afro dents larges', 'Brosse démêlante flexible', 'Flacon applicateur / vaporisateur', 'Brosse de style (Denman-like)'],
    routineSteps: ['Accessoire'],
    contactTypes: ['distributor'],
    prospectIds: ['c23', 'c22'],
    viaDistributor: true,
    routeHint: 'A',
  },
];

/** Tous les ids de prospects référencés par le plan (pour contrôle d'intégrité). */
export const ASSORTMENT_PROSPECT_IDS: string[] = Array.from(
  new Set(ASSORTMENT_NEEDS.flatMap((n) => n.prospectIds))
).sort();
