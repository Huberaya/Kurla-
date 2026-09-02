export interface ToolItem {
  id: string;
  name: string;
  /** Section « geste » du guide (source unique : GESTURES). */
  gesture: GestureId;
  /** Conservé pour compatibilité avec d'anciens usages éventuels. */
  category: 'sommeil' | 'demelage' | 'coiffage' | 'soin';
  forWho: string;
  whenToUse: string;
  benefits: string[];
  errorsToAvoid: string;
  /** Astuce issue des usages de la communauté (fora, coiffeurs, créateurs). */
  communityTip?: string;
  image: string;
  /**
   * HARMONISATION BOUTIQUE ↔ GUIDE : slug du produit réellement vendu en
   * boutique. La fiche guide affiche alors l'image, le prix et le lien du
   * produit catalogue (source unique de vérité). `undefined` = outil documenté
   * mais pas encore commercialisé.
   */
  productSlug?: string;
}

export type GestureId =
  | 'demeler'
  | 'laver'
  | 'soin-profond'
  | 'secher'
  | 'definir'
  | 'heatless'
  | 'nuit'
  | 'locs';

export interface GestureSection {
  id: GestureId;
  title: string;
  intro: string;
  /** Question pré-remplie pour l'assistante IA. */
  aiQuestion: string;
}

/**
 * LE GUIDE PAR GESTES — la page /outils n'est pas un second catalogue : elle
 * enseigne le bon geste, puis renvoie vers l'unique fiche boutique de l'outil.
 * L'ordre des sections suit un wash day réel, du démêlage à la nuit.
 */
export const GESTURES: GestureSection[] = [
  {
    id: 'demeler',
    title: 'Démêler sans casse',
    intro:
      "80 % de la casse mécanique se joue ici. La règle communautaire est unanime : on ne démêle jamais un cheveu texturé à sec. Cheveu humidifié, enduit d'après-shampoing ou de leave-in, travaillé par sections, des pointes vers les racines.",
    aiQuestion: 'Comment démêler mes cheveux sans les casser, étape par étape ?'
  },
  {
    id: 'laver',
    title: 'Laver & soigner le cuir chevelu',
    intro:
      "Un cuir chevelu sain est le socle de la pousse. Le shampoing se masse au cuir chevelu (pas aux longueurs), lentement, en cercles. Entre les wash days, les huiles s'appliquent à la racine avec précision — surtout sous braids et vanilles.",
    aiQuestion: 'À quelle fréquence laver mes cheveux et comment entretenir mon cuir chevelu ?'
  },
  {
    id: 'soin-profond',
    title: 'Soin profond & chaleur douce',
    intro:
      "Le secret le mieux partagé des routines 4B/4C : la chaleur douce ouvre les écailles et démultiplie l'effet d'un masque. 15 à 30 minutes sous bonnet chauffant ou vapeur, toutes les une à deux semaines — c'est le geste qui transforme un masque correct en soin profond.",
    aiQuestion: 'Comment faire un soin profond efficace à la maison sur cheveux crépus ?'
  },
  {
    id: 'secher',
    title: 'Sécher sans frisottis',
    intro:
      "La serviette éponge classique est l'ennemie n°1 de la définition : friction, frisottis, casse. Microfibre ou t-shirt en coton pour absorber sans frotter, puis diffuseur à chaleur douce si besoin de volume — jamais d'air brûlant collé aux longueurs.",
    aiQuestion: 'Comment sécher mes boucles sans créer de frisottis ?'
  },
  {
    id: 'definir',
    title: 'Coiffer, définir & styliser',
    intro:
      "La définition se travaille sur cheveu humide et enduit de produit — jamais à sec. Chaque texture a son outil signature : brosse type Denman pour clumper les boucles, éponge pour les coils courts, pick métal pour le volume aux racines sans défaire la définition.",
    aiQuestion: 'Comment définir mes boucles et garder la définition plusieurs jours ?'
  },
  {
    id: 'heatless',
    title: 'Boucles sans chaleur',
    intro:
      "La tendance la plus forte de la communauté : boucler sans fer, pendant la nuit. Flexi rods pour boucles souples, perm rods pour coils serrés, bigoudis satin pour dormir confortablement. Cheveu légèrement humide + mousse ou lait coiffant = tenue de plusieurs jours.",
    aiQuestion: 'Comment faire des boucles sans chaleur qui tiennent plusieurs jours ?'
  },
  {
    id: 'nuit',
    title: 'Protéger la nuit',
    intro:
      "Le coton absorbe l'hydratation et casse la fibre par friction : huit heures par nuit, chaque nuit. Le satin (bonnet, durag, taie, headwrap) est LE réflexe fondateur des routines afro — c'est l'outil au meilleur rapport bénéfice/prix de tout ce guide.",
    aiQuestion: 'Comment protéger mes cheveux la nuit pour garder ma coiffure ?'
  },
  {
    id: 'locs',
    title: 'Locs, tresses & protective styles',
    intro:
      "Les coiffures protectrices ne protègent que si elles sont entretenues : racines resserrées sans excès de tension, cuir chevelu hydraté sous les tresses, protection nocturne adaptée au volume. Des outils de niche, rarement bien expliqués — les voici.",
    aiQuestion: "Comment entretenir mes locs ou mes braids au quotidien ?"
  }
];

/**
 * Visuels de repli (familles du catalogue, hébergés sur le storage KURLA).
 * Utilisés uniquement si le produit boutique lié n'est pas chargé.
 */
const IMG = 'https://qzwgsarfdegqtfdnqiql.supabase.co/storage/v1/object/public/product-images';

export const KURLA_TOOLS: ToolItem[] = [
  /* ── Démêler sans casse ─────────────────────────────────────────── */
  {
    id: 'peigne-dents-larges',
    name: 'Peigne à Dents Larges Anti-Casse',
    gesture: 'demeler',
    category: 'demelage',
    forWho: 'Toutes textures — le point de départ universel',
    whenToUse: 'Sous la douche, pendant la pose de l’après-shampoing',
    benefits: [
      'Répartit le soin et sépare les sections sans casser les boucles',
      'Premier passage idéal avant brosse ou coiffage'
    ],
    errorsToAvoid: 'Commencer par les racines au lieu des pointes.',
    communityTip: 'Le cheveu est prêt à être démêlé quand il glisse « comme une algue » sous le soin.',
    image: `${IMG}/real/p16.jpg?v=2`,
    productSlug: 'preco-peigne-demeloir-a-dents-larges'
  },
  {
    id: 'brosse-flex',
    name: 'Brosse Démêlante Flexible',
    gesture: 'demeler',
    category: 'demelage',
    forWho: 'Cheveux 3A à 4C & cheveux d’enfants',
    whenToUse: 'Sur cheveux mouillés, imbibés de leave-in ou d’après-shampoing',
    benefits: [
      'Rangées flexibles qui s’écartent au lieu d’arracher',
      'Rend le démêlage nettement moins douloureux — plébiscitée pour les enfants'
    ],
    errorsToAvoid: 'L’utiliser sur cheveux 4C totalement secs.',
    communityTip: 'Travaillez en 4 à 8 sections pincées : la brosse démêle mieux et vous cassez deux fois moins.',
    image: `${IMG}/real/p20.jpg?v=2`,
    productSlug: 'preco-brosse-demelante-flexible-dents-picots'
  },
  {
    id: 'brosse-denman',
    name: 'Brosse 7 Rangs Type Denman',
    gesture: 'demeler',
    category: 'demelage',
    forWho: 'Boucles 3B à 4C cherchant boucles groupées et définies',
    whenToUse: 'Après le démêlage, sur cheveu mouillé chargé en produit coiffant',
    benefits: [
      'Groupe les boucles (« clumping ») pour un wash-and-go net',
      'Lisse la cuticule et distribue le produit uniformément'
    ],
    errorsToAvoid: 'Brosser à sec : la définition se travaille sur cheveu mouillé et enduit.',
    communityTip: 'L’astuce 4C historique : retirer 2 rangées sur 7 (« modding ») pour réduire la tension sur les coils serrés.',
    image: `${IMG}/real/p19.jpg`,
    productSlug: 'preco-brosse-demelante-7-rangs-type-denman'
  },
  {
    id: 'pinces-croco',
    name: 'Pinces de Sectionnement Crocodile',
    gesture: 'demeler',
    category: 'demelage',
    forWho: 'Indispensables dès que le cheveu est dense (3C-4C)',
    whenToUse: 'À chaque wash day : démêlage, application de soin, coiffage',
    benefits: [
      'Le sectionnement est LA règle n°1 des routines 4B/4C',
      'Zéro traction sur les racines contrairement aux élastiques'
    ],
    errorsToAvoid: 'Travailler toute la chevelure d’un bloc « pour aller plus vite ».',
    image: `${IMG}/real/p23.jpg`,
    productSlug: 'preco-pinces-de-sectionnement-crocodile'
  },
  {
    id: 'vaporisateur-continu',
    name: 'Vaporisateur Brume Continue',
    gesture: 'demeler',
    category: 'soin',
    forWho: 'Toutes textures, indispensable 4A-4C',
    whenToUse: 'Avant démêlage à sec impossible, refresh du matin, réhydratation',
    benefits: [
      'Brume fine et continue qui réhumidifie sans tremper',
      'Réactive les produits coiffants entre deux wash days'
    ],
    errorsToAvoid: 'Laisser stagner de l’eau non renouvelée pendant des semaines.',
    communityTip: 'Recette refresh : eau + une noisette de leave-in dans le flacon, secouer avant chaque usage.',
    image: `${IMG}/real/p18.jpg`,
    productSlug: 'preco-flacon-vaporisateur-brume-continue'
  },

  /* ── Laver & soigner le cuir chevelu ────────────────────────────── */
  {
    id: 'shampoo-brush',
    name: 'Brosse Massage Cuir Chevelu Silicone',
    gesture: 'laver',
    category: 'soin',
    forWho: 'Tous cuirs chevelus, y compris sensibles ou sous braids',
    whenToUse: 'À chaque shampoing ou co-wash',
    benefits: [
      'Décolle les résidus sans agresser (les ongles, eux, irritent)',
      'Stimule la microcirculation, associée à une meilleure pousse'
    ],
    errorsToAvoid: 'Frotter fort et vite : ce sont des mouvements lents et circulaires qui nettoient.',
    image: `${IMG}/real/p36.jpg`,
    productSlug: 'preco-brosse-massage-cuir-chevelu-silicone'
  },
  {
    id: 'masseur-electrique',
    name: 'Masseur Cuir Chevelu Électrique 3-en-1',
    gesture: 'laver',
    category: 'soin',
    forWho: 'Routine scalp care avancée, cuir chevelu tendu ou pousse lente',
    whenToUse: '5 à 10 minutes, plusieurs fois par semaine, sur cheveux secs ou huilés',
    benefits: [
      'Le geste « growth » star de la communauté, sans effort',
      'Aide à répartir huiles et sérums uniformément'
    ],
    errorsToAvoid: 'L’utiliser sur des tresses très serrées les premiers jours (cuir chevelu déjà sollicité).',
    image: `${IMG}/real/p49.jpg`,
    productSlug: 'preco-masseur-cuir-chevelu-electrique-3-en-1'
  },
  {
    id: 'applicateur-cuir-chevelu',
    name: 'Flacon Applicateur Embout Précis',
    gesture: 'laver',
    category: 'soin',
    forWho: 'Soins du cuir chevelu, porteurs de braids, twists, vanilles',
    whenToUse: 'Application d’huiles (ricin, romarin…) raie par raie',
    benefits: [
      'Dépose la juste dose à la racine, sans gaspiller ni graisser les longueurs',
      'Seul moyen propre d’hydrater un cuir chevelu sous coiffure protectrice'
    ],
    errorsToAvoid: 'Appliquer des quantités excessives qui coulent.',
    image: `${IMG}/real/p26.jpg`,
    productSlug: 'preco-flacon-applicateur-embout-precis'
  },
  {
    id: 'bonnet-douche',
    name: 'Bonnet de Douche Doublé Satin',
    gesture: 'laver',
    category: 'soin',
    forWho: 'Tous ceux qui espacent leurs wash days (et ils ont raison)',
    whenToUse: 'Douches sans lavage, poses de soins gras',
    benefits: [
      'Protège coiffure et brushing de l’humidité de la douche',
      'Doublure satin : zéro friction ni marque sur les longueurs'
    ],
    errorsToAvoid: 'Le ranger humide : on le sèche à l’air libre entre deux usages.',
    image: `${IMG}/real/p25.jpg`,
    productSlug: 'preco-bonnet-de-douche-reutilisable-double-satin'
  },

  /* ── Soin profond & chaleur douce ───────────────────────────────── */
  {
    id: 'bonnet-chauffant',
    name: 'Bonnet Chauffant Soin Profond',
    gesture: 'soin-profond',
    category: 'soin',
    forWho: 'Cheveux secs, poreux, abîmés — le rituel 4B/4C par excellence',
    whenToUse: '15-30 min par-dessus un masque, toutes les 1 à 2 semaines',
    benefits: [
      'La chaleur douce ouvre les écailles : le masque pénètre vraiment',
      'Version micro-ondes sans fil : on reste libre de bouger'
    ],
    errorsToAvoid: 'Le porter sur cheveux nus sans soin : la chaleur seule dessèche.',
    communityTip: 'Le hack communautaire : une charlotte plastique sous le bonnet garde la chaleur deux fois plus longtemps.',
    image: `${IMG}/real/p44.jpg`,
    productSlug: 'preco-bonnet-chauffant-soin-profond'
  },
  {
    id: 'steamer-portable',
    name: 'Steamer Portable Cheveux',
    gesture: 'soin-profond',
    category: 'soin',
    forWho: 'Basse porosité, cheveux très secs, adeptes du soin salon à la maison',
    whenToUse: 'Séances vapeur de 10-20 min sur masque ou leave-in',
    benefits: [
      'La vapeur hydrate plus en profondeur que la chaleur sèche',
      'Idéal cheveux basse porosité qui « refusent » les soins'
    ],
    errorsToAvoid: 'Approcher la buse trop près du cuir chevelu : la vapeur se diffuse à distance.',
    image: `${IMG}/real/p47.jpg`,
    productSlug: 'preco-steamer-portable-cheveux'
  },

  /* ── Sécher sans frisottis ──────────────────────────────────────── */
  {
    id: 'serviette-microfibre',
    name: 'Serviette Microfibre Boucles',
    gesture: 'secher',
    category: 'soin',
    forWho: 'Toutes boucles, 3A à 4C — l’upgrade le plus rapide qui soit',
    whenToUse: 'À la sortie de la douche, en tamponnant ou en plopping',
    benefits: [
      'Absorbe l’excès d’eau sans friction ni frisottis',
      'Résultat visible dès le premier wash day'
    ],
    errorsToAvoid: 'Frotter énergiquement les cheveux.',
    communityTip: 'Le « plopping » : boucles retournées dans la serviette 10-20 min avant les produits coiffants.',
    image: `${IMG}/real/p37.jpg`,
    productSlug: 'preco-serviette-microfibre-boucles'
  },
  {
    id: 'diffuseur',
    name: 'Diffuseur Universel pour Sèche-Cheveux',
    gesture: 'secher',
    category: 'coiffage',
    forWho: 'Boucles 3A à 4A surtout — volume et définition sans dégât',
    whenToUse: 'Après les produits coiffants, chaleur douce, tête penchée',
    benefits: [
      'Sèche en respectant la formation des boucles',
      'Volume aux racines sans casser la définition'
    ],
    errorsToAvoid: 'Chaleur maximale collée aux longueurs : toujours doux, par sections.',
    communityTip: 'Technique « hover » : diffuser sans toucher d’abord, « scrunching » seulement en fin de séchage.',
    image: `${IMG}/real/p43.jpg`,
    productSlug: 'preco-diffuseur-universel-pour-seche-cheveux'
  },
  {
    id: 'brosse-vapeur',
    name: 'Brosse Vapeur Nano-Mist Électrique',
    gesture: 'secher',
    category: 'coiffage',
    forWho: 'Refresh express, frisottis rebelles, coiffage des enfants pressés',
    whenToUse: 'Le matin sur cheveux secs, pour lisser et réhydrater en un geste',
    benefits: [
      'Brume nano + brossage : dompte les frisottis sans mouiller',
      'Recharge USB-C, se glisse dans un sac'
    ],
    errorsToAvoid: 'Vouloir remplacer le vrai wash day : c’est un outil de retouche, pas de lavage.',
    image: `${IMG}/real/p48.jpg?v=2`,
    productSlug: 'preco-brosse-vapeur-nano-mist-electrique'
  },

  /* ── Coiffer, définir & styliser ────────────────────────────────── */
  {
    id: 'eponge-twist',
    name: 'Éponge Twist / Curl Sponge',
    gesture: 'definir',
    category: 'coiffage',
    forWho: 'Cheveux courts 4A-4C, hommes, freeform locs débutantes',
    whenToUse: 'Sur cheveu propre, hydraté, légèrement humide, en cercles',
    benefits: [
      'Crée coils et twists définis en quelques minutes',
      'Double face : picots pour coils serrés, alvéoles pour twists larges'
    ],
    errorsToAvoid: 'L’utiliser sur cheveux emmêlés ou secs : démêler et hydrater d’abord.',
    image: `${IMG}/real/p41.jpg`,
    productSlug: 'preco-eponge-twist-curl-sponge'
  },
  {
    id: 'peigne-afro-pick',
    name: 'Peigne Afro Métal (Fro Pick)',
    gesture: 'definir',
    category: 'coiffage',
    forWho: 'Afros libres, twist-out, wash-and-go en manque de volume',
    whenToUse: 'En touche finale, aux racines uniquement',
    benefits: [
      'Soulève les racines pour un volume spectaculaire',
      'Ne défait pas la définition des longueurs si on reste à la racine'
    ],
    errorsToAvoid: 'Peigner des racines aux pointes : le pick reste à la racine.',
    image: `${IMG}/real/p35.jpg`,
    productSlug: 'preco-peigne-afro-metal-volume-racines'
  },
  {
    id: 'brosse-edges',
    name: 'Brosse à Edges + Peigne de Précision',
    gesture: 'definir',
    category: 'coiffage',
    forWho: 'Finitions baby hairs, contours nets, ponytails sleek',
    whenToUse: 'En dernière étape, avec un gel edge control',
    benefits: [
      'Double embout : brosse pour lisser, peigne pour dessiner',
      'Le détail qui « finit » une coiffure protectrice'
    ],
    errorsToAvoid: 'Brosser les edges quotidiennement avec traction : c’est la zone la plus fragile.',
    image: `${IMG}/real/p21.jpg`,
    productSlug: 'preco-brosse-a-edges-peigne-de-precision'
  },
  {
    id: 'peigne-queue-de-rat',
    name: 'Peigne à Queue de Rat Métal',
    gesture: 'definir',
    category: 'coiffage',
    forWho: 'Tresses, twists, cornrows — toutes coiffures à raies',
    whenToUse: 'Pour tracer des séparations nettes avant tressage ou twists',
    benefits: [
      'Raies précises = coiffures protectrices propres et durables',
      'La pointe métal glisse sans accrocher la fibre'
    ],
    errorsToAvoid: 'S’en servir pour démêler : ses dents fines sont réservées au coiffage.',
    image: `${IMG}/real/p38.jpg`,
    productSlug: 'preco-peigne-a-queue-de-rat-metal'
  },
  {
    id: 'chouchous-satin',
    name: 'Chouchous Satin & Spirales Sans Casse',
    gesture: 'definir',
    category: 'coiffage',
    forWho: 'Attaches quotidiennes, puffs, pineapple du soir',
    whenToUse: 'Chaque fois que vous attachez — jamais d’élastique nu',
    benefits: [
      'Le satin glisse : zéro casse à l’attache et au retrait',
      'Tenue sans marquer ni scier la fibre'
    ],
    errorsToAvoid: 'Les élastiques fins en caoutchouc : ils cisaillent le cheveu.',
    communityTip: 'Le « pineapple » : puff très haut et lâche au coucher, boucles préservées au réveil.',
    image: `${IMG}/real/p45.jpg`,
    productSlug: 'preco-chouchous-satin-spirales-sans-casse'
  },

  /* ── Boucles sans chaleur ───────────────────────────────────────── */
  {
    id: 'flexi-rods',
    name: 'Flexi Rods Mousse (lot de 7)',
    gesture: 'heatless',
    category: 'coiffage',
    forWho: 'Boucles souples à crépues cherchant des boucles élastiques sans fer',
    whenToUse: 'Sur cheveu à peine humide + mousse, pose de nuit ou séchage à l’air',
    benefits: [
      'Boucles rebondies calibrées, zéro chaleur, zéro dégât',
      'Mousse pliable : plus confortable qu’un bigoudi rigide'
    ],
    errorsToAvoid: 'Dérouler avant séchage complet : la boucle retombe.',
    image: `${IMG}/real/p39.jpg`,
    productSlug: 'preco-flexi-rods-mousse'
  },
  {
    id: 'perm-rods',
    name: 'Perm Rods / Bigoudis Froids',
    gesture: 'heatless',
    category: 'coiffage',
    forWho: 'Coils serrés et définis sur cheveux courts à mi-longs, TWA',
    whenToUse: 'Sur sections fines humides + produit coiffant, séchage complet',
    benefits: [
      'Le perm rod set : un classique intemporel des salons afro',
      'Coils uniformes qui durent une semaine avec une bonne nuit satin'
    ],
    errorsToAvoid: 'Sections trop grosses : le cheveu ne sèche pas à cœur.',
    image: `${IMG}/real/p40.jpg`,
    productSlug: 'preco-perm-rods-bigoudis-froids'
  },
  {
    id: 'bigoudis-satin',
    name: 'Bigoudis Satin Heatless (lot de 6)',
    gesture: 'heatless',
    category: 'coiffage',
    forWho: 'Boucles du réveil sans une minute de coiffage le matin',
    whenToUse: 'Pose du soir sur cheveu sec ou à peine humide',
    benefits: [
      'Surface satin : on dort dessus sans friction ni marque',
      'Boucles souples au réveil, tenue de 2-3 jours'
    ],
    errorsToAvoid: 'Serrer trop près des racines : tension inutile sur le cuir chevelu.',
    image: `${IMG}/real/p22.jpg`,
    productSlug: 'preco-bigoudis-satin-heatless'
  },

  /* ── Protéger la nuit ───────────────────────────────────────────── */
  {
    id: 'bonnet-satin',
    name: 'Bonnet Satin + Taie d’Oreiller (set)',
    gesture: 'nuit',
    category: 'sommeil',
    forWho: 'Tout cheveu texturé, braids, locks, tissages — sans exception',
    whenToUse: 'Toutes les nuits. Le bonnet protège, la taie rattrape s’il glisse',
    benefits: [
      'Empêche la déshydratation et la casse causées par le coton',
      'Préserve coiffure, définition et edges au réveil',
      'Le set couvre les deux scénarios : bonnet en place ou échappé'
    ],
    errorsToAvoid: 'Serrer le lien élastique trop fort sur le front.',
    communityTip: 'Standard communautaire : le duo bonnet + taie, car un bonnet seul finit toujours par glisser une nuit sur deux.',
    image: `${IMG}/real/p17.jpg`,
    productSlug: 'preco-bonnet-satin-nuit-taie-d-oreiller'
  },
  {
    id: 'durag-satin',
    name: 'Durag Satin',
    gesture: 'nuit',
    category: 'sommeil',
    forWho: 'Waves, cheveux courts, protection compressive légère',
    whenToUse: 'Nuit et sessions « wolfing » entre les brossages',
    benefits: [
      'Maintient le motif des waves entre deux brossages',
      'Compression douce qui couche le cheveu sans l’assécher'
    ],
    errorsToAvoid: 'Le nouer trop serré : marque frontale et tension inutile.',
    image: `${IMG}/real/p46.jpg`,
    productSlug: 'preco-durag-satin'
  },
  {
    id: 'foulard-headwrap',
    name: 'Foulard Headwrap Satin Premium',
    gesture: 'nuit',
    category: 'sommeil',
    forWho: 'Protection stylée de jour, nuits sous tresses, bad hair days assumés',
    whenToUse: 'De jour comme de nuit, seul ou par-dessus un bonnet',
    benefits: [
      'Multi-usages : turban de jour, protection de nuit, accessoire mode',
      'Doublure glissante qui respecte edges et longueurs'
    ],
    errorsToAvoid: 'Les foulards 100 % coton portés à même les cheveux chaque nuit.',
    image: `${IMG}/real/p24.jpg?v=2`,
    productSlug: 'preco-foulard-headwrap-satin-premium'
  },
  {
    id: 'filet-tresses',
    name: 'Filet de Protection Tresses & Vanilles',
    gesture: 'nuit',
    category: 'sommeil',
    forWho: 'Braids longues, vanilles, twists volumineuses que le bonnet ne contient plus',
    whenToUse: 'Toutes les nuits pendant la durée de la coiffure protectrice',
    benefits: [
      'Contient le volume sans écraser la coiffure',
      'Limite les frisottis sur les longueurs de tresses = coiffure qui dure'
    ],
    errorsToAvoid: 'Dormir tresses libres : les frisottis apparaissent en quelques nuits.',
    image: `${IMG}/real/p27.jpg`,
    productSlug: 'preco-filet-de-protection-tresses-vanilles'
  },

  /* ── Locs, tresses & protective styles ──────────────────────────── */
  {
    id: 'interlocking-locs',
    name: 'Outil Interlocking / Aiguille Locs',
    gesture: 'locs',
    category: 'coiffage',
    forWho: 'Locs établies ou en formation, entretien des racines soi-même',
    whenToUse: 'Resserrage des racines toutes les 4 à 8 semaines',
    benefits: [
      'Resserre proprement sans produit ni chaleur',
      'Autonomie : plus besoin de salon pour chaque retouche'
    ],
    errorsToAvoid: 'Resserrer trop souvent ou trop fort : c’est la première cause d’amincissement des locs.',
    image: `${IMG}/real/p42.jpg`,
    productSlug: 'preco-outil-interlocking-aiguille-d-entretien-des-locs'
  },
  {
    id: 'kit-threading',
    name: 'Kit African Threading',
    gesture: 'locs',
    category: 'coiffage',
    forWho: 'Étirement sans chaleur, tradition remise au goût du jour',
    whenToUse: 'Sur cheveu propre et hydraté, pose de quelques heures à quelques jours',
    benefits: [
      'Étire les longueurs sans un degré de chaleur',
      'Technique ancestrale, protectrice et économique'
    ],
    errorsToAvoid: 'Enrouler le fil trop serré aux racines.',
    image: `${IMG}/real/p50.jpg`,
    productSlug: 'preco-kit-african-threading'
  }
];

/* ────────────────────────────────────────────────────────────────────
 * LES MEILLEURS OUTILS PAR TYPE DE CHEVEUX
 * Synthèse des usages dominants de la communauté (fora spécialisés,
 * coiffeurs, presse capillaire) croisée avec le catalogue KURLA.
 * ──────────────────────────────────────────────────────────────────── */
export interface HairTypeKit {
  id: string;
  label: string;
  emoji: string;
  headline: string;
  advice: string;
  /** ids de ToolItem, du plus indispensable au plus optionnel. */
  essentials: string[];
  upgrades: string[];
}

export const HAIR_TYPE_KITS: HairTypeKit[] = [
  {
    id: '3a-3b',
    label: '3A – 3B',
    emoji: '🌀',
    headline: 'Boucles souples : dompter les frisottis',
    advice:
      "Votre ennemi n'est pas le nœud, c'est la friction. Le trio microfibre + peigne large + diffuseur produit des résultats visibles dès le premier wash day. Ne brossez jamais à sec, attachez en satin, et laissez vos boucles tranquilles une fois stylées.",
    essentials: ['peigne-dents-larges', 'serviette-microfibre', 'diffuseur', 'bonnet-satin', 'chouchous-satin'],
    upgrades: ['vaporisateur-continu', 'bigoudis-satin', 'brosse-vapeur']
  },
  {
    id: '3c-4a',
    label: '3C – 4A',
    emoji: '🌪️',
    headline: 'Boucles serrées : hydrater et définir',
    advice:
      "La définition se gagne sur cheveu mouillé : brosse flexible pour démêler, brosse type Denman pour grouper les boucles, diffuseur pour sécher sans les défaire. Un soin profond sous chaleur douce toutes les deux semaines change la texture au toucher.",
    essentials: ['brosse-flex', 'brosse-denman', 'vaporisateur-continu', 'diffuseur', 'bonnet-satin'],
    upgrades: ['bonnet-chauffant', 'serviette-microfibre', 'applicateur-cuir-chevelu', 'flexi-rods']
  },
  {
    id: '4b-4c',
    label: '4B – 4C',
    emoji: '👑',
    headline: 'Cheveux crépus : sectionner, hydrater, sceller',
    advice:
      "Les règles d'or de la communauté 4C : ne JAMAIS démêler à sec, toujours par sections (pinces croco), cheveu chargé en leave-in. La Denman se « modde » (retirez 2 rangées) pour réduire la tension. Et le soin profond sous bonnet chauffant n'est pas un luxe — c'est le cœur de la routine.",
    essentials: ['pinces-croco', 'brosse-flex', 'peigne-dents-larges', 'vaporisateur-continu', 'bonnet-chauffant', 'bonnet-satin'],
    upgrades: ['brosse-denman', 'steamer-portable', 'applicateur-cuir-chevelu', 'peigne-afro-pick', 'kit-threading']
  },
  {
    id: 'locs-tresses',
    label: 'Locs & tresses',
    emoji: '🪢',
    headline: 'Protective styles : entretenir sans tension',
    advice:
      "Une coiffure protectrice ne protège que si le cuir chevelu reste hydraté (applicateur à embout précis) et si la nuit est couverte (filet + headwrap). Pour les locs : resserrage à l'interlocking toutes les 4-8 semaines, jamais plus serré que nécessaire.",
    essentials: ['applicateur-cuir-chevelu', 'filet-tresses', 'foulard-headwrap', 'interlocking-locs', 'peigne-queue-de-rat'],
    upgrades: ['masseur-electrique', 'brosse-edges', 'bonnet-douche']
  },
  {
    id: 'courts-waves',
    label: 'Courts & waves',
    emoji: '🌊',
    headline: 'Cheveux courts, waves & TWA',
    advice:
      "Sur cheveux courts, tout se joue à la racine et à la surface : éponge twist pour les coils, durag pour coucher les waves, brosse silicone pour un cuir chevelu impeccable. Le perm rod set reste la référence pour des coils définis sur TWA.",
    essentials: ['eponge-twist', 'durag-satin', 'shampoo-brush', 'peigne-afro-pick'],
    upgrades: ['perm-rods', 'brosse-edges', 'masseur-electrique']
  }
];

export const TOOL_BY_ID: ReadonlyMap<string, ToolItem> = new Map(
  KURLA_TOOLS.map(tool => [tool.id, tool])
);

export const TOOL_BY_PRODUCT_SLUG: ReadonlyMap<string, ToolItem> = new Map(
  KURLA_TOOLS.filter((tool): tool is ToolItem & { productSlug: string } => Boolean(tool.productSlug))
    .map(tool => [tool.productSlug, tool])
);
