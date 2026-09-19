import type { HairAdvisoryContext } from './hairAdvisory';

/**
 * D1 — LA COUCHE D'INTERPRÉTATION du diagnostic cheveux (programme
 * « solidification du diagnostic », docs/CHANTIERS_DIAGNOSTIC_SOLIDIFICATION.md).
 *
 * Chaque règle croise AU MOINS DEUX champs des réponses (jamais la reprise
 * d'une seule case) et produit une observation qui DECIDE quelque chose :
 * pourquoi ce geste est là, ce que la combinaison des réponses veut dire.
 *
 * Traçabilité exigée par D1 : chaque règle pointe vers des clés de cartes
 * `hairScience` (`HAIR_SCIENCE_CARDS`). Le banc D5 vérifie que chaque clé
 * existe — une déduction sans carte source est une déduction interdite.
 *
 * Les textes suivent la charte du résumé : pas de vocabulaire médical, pas
 * de promesse, apostrophe typographique, aucune phrase bannie (le banc les
 * scanne).
 */

export interface HairDerivation {
  readonly id: string;
  readonly text: string;
  /** Clés des cartes science qui fondent l'observation (traçabilité D1). */
  readonly keys: readonly string[];
}

interface Normalized {
  texture: string;
  style: string;
  focus: string;
  priority: string;
  porosity: string;
  scalp: string;
  frequency: string;
  length: string;
  experience: string;
  isLong: boolean;
  isShort: boolean;
  isLocked: boolean;
  isProtective: boolean;
  isWig: boolean;
  isKid: boolean;
  isCoily: boolean;
  isCurly: boolean;
  isTextured: boolean;
  scalpTrouble: boolean;  pattern: string;
}

function normalize(ctx: HairAdvisoryContext): Normalized {
  const texture = String(ctx.texture ?? '');
  const style = String(ctx.style ?? '');
  const scalp = String(ctx.scalp ?? '');
  // D4 : « je débute » vivait dans la fréquence ; le pont garde les réponses
  // anciennes comprises comme de l'expérience, et libère la fréquence.
  const legacyBeginner = ctx.frequency === 'debutante';
  return {
    texture,
    style,
    focus: String(ctx.focus ?? ''),
    priority: String(ctx.priority ?? ''),
    porosity: String(ctx.porosity ?? ''),
    scalp,
    frequency: legacyBeginner ? '' : String(ctx.frequency ?? ''),
    length: String(ctx.length ?? ''),
    experience: String(ctx.experience ?? (legacyBeginner ? 'debutante' : '')),
    isLong: ctx.length === 'longue',
    isShort: ctx.length === 'courte',
    pattern: texture === 'crepue' && ['4a', '4b', '4c'].includes(String(ctx.coilyPattern ?? '')) ? String(ctx.coilyPattern) : '',
    isLocked: texture === 'locksee' || style === 'locks',
    isProtective: texture === 'protective' || style === 'braids' || style === 'twists',
    isWig: style === 'wig',
    isKid: style === 'enfant' || ctx.priority === 'demelage_enfant',
    isCoily: texture === 'crepue',
    isCurly: texture === 'frisee' || texture === 'bouclee' || texture === 'ondulee',
    isTextured: texture === 'crepue' || texture === 'frisee' || texture === 'bouclee' || texture === 'ondulee',
    scalpTrouble: scalp === 'sec' || scalp === 'demangeaisons' || scalp === 'pellicules' || scalp === 'irritation',
  };
}

interface DerivationRule {
  readonly id: string;
  readonly when: (c: Normalized) => boolean;
  readonly text: string;
  readonly keys: readonly string[];
}

/**
 * Table ordonnée : les règles les plus spécifiques au segment d'abord, les
 * réglages de rythme ensuite, les filets structurels en dernier.
 * `deriveHairObservations` retient les N premières règles déclenchées.
 */
export const HAIR_DERIVATION_RULES: readonly DerivationRule[] = [
  // — locks —
  {
    id: 'locks_temps',
    when: c => c.isLocked && (c.priority === 'pousse' || c.focus === 'locks_allonger'),
    text: 'Votre objectif est la longueur : pour une lock, la longueur se gagne en densifiant avec le temps, pas en forçant — aucun produit ne remplace les phases du lockage, c’est pourquoi la routine mise sur la régularité plutôt que sur l’effort.',
    keys: ['sci_locks_temps', 'sci_locks_mecanisme'],
  },
  {
    id: 'locks_eau',
    when: c => c.isLocked && (c.priority === 'hydratation' || c.focus === 'locks_propre' || c.focus === 'locks_douceur'),
    text: 'Hydrater des locks passe par l’aqueux, pas par l’épais : les formules riches restent piégées dans la lock et nourrissent le résidu — c’est ce qui alourdit les locks et fatigue le cuir chevelu à la longue.',
    keys: ['sci_locks_scalp'],
  },
  {
    id: 'locks_sechage',
    when: c => c.isLocked && (c.porosity === 'forte' || c.frequency === '2x_semaine'),
    text: 'Vos cheveux boivent vite : une lock gorgée d’eau met plus de temps à sécher au cœur, et c’est là que les odeurs s’installent — le séchage complet fait donc partie du lavage, pas de la coiffure.',
    keys: ['sci_locks_scalp'],
  },
  {
    id: 'locks_scalp',
    when: c => c.isLocked && c.scalpTrouble,
    text: 'Un inconfort du cuir chevelu sous les locks met le plus souvent le résidu en cause : rien ne s’échappe facilement d’une lock — c’est pourquoi le shampoing sans résidu et le lavage aux doigts passent avant l’ajout de n’importe quel produit.',
    keys: ['sci_locks_scalp'],
  },

  // Lavage des locks : réglage de rythme — placé après le procès général pour
  // que les dérivations porosité/cuir chevelu restent dans la fenêtre des 4.
  // — coiffures protectrices (tresses, twists) et perruque / tissage —
  {
    id: 'prot_tension',
    when: c => (c.isProtective || c.isWig) && (c.focus === 'prot_tension' || c.focus === 'wig_edges' || c.focus === 'trans_racines'),
    text: 'Vos zones les plus exposées sont le contour et la raie : ce sont les cheveux les plus fins de la tête — douleur, rougeur ou traction là-bas, c’est le signal de desserrer le jour même, pas de « laisser le temps faire ».',
    keys: ['sci_tension', 'sci_tempes_fines'],
  },
  {
    id: 'prot_scalp',
    when: c => c.isProtective && !c.isWig && c.scalpTrouble,
    text: 'Le cuir chevelu sous tresses ou twists ne se rince pas comme au naturel : ce qui démange vient de ce qui s’accumule dessous plus que d’un manque de produit — d’où l’entretien aqueux léger plutôt qu’une huile de plus.',
    keys: ['sci_sebum'],
  },
  {
    id: 'wig_env',
    when: c => c.isWig && (c.focus === 'wig_transpiration' || c.scalpTrouble),
    text: 'Sous perruque ou tissage, chaleur et transpiration restent prises avec vous : c’est le micro-environnement qui irrite, pas un cuir chevelu « fragile » — les jours de repos entre deux poses changent plus que n’importe quel produit ajouté dessous.',
    keys: ['sci_tension', 'sci_pellicules'],
  },
  {
    id: 'prot_freq',
    when: c => (c.isProtective || c.isWig) && c.frequency === 'irreguliere',
    text: 'Un rythme irrégulier sous coiffure laisse le cuir chevelu sans repère, alors que c’est dessous que tout se joue — c’est pourquoi un jour fixe de rinçage, même bref, devient le premier réglage avant tout produit.',
    keys: ['sci_pellicules'],
  },

  // — transition / défrisé —
  {
    id: 'trans_deux_natures',
    when: c => c.texture === 'defrisee',
    text: 'Votre cheveu a deux natures sur la même tête : la repousse en coil et la longueur défrisée, que le chimique a reformée de façon définitive — c’est pourquoi la routine sépare les deux zones au lieu de traiter « une » chevelure.',
    keys: ['sci_relax_bonds'],
  },
  {
    id: 'trans_ligne',
    when: c => c.texture === 'defrisee' && (c.priority === 'casse' || c.focus === 'trans_ligne' || c.focus === 'trans_fibre'),
    text: 'En transition, la casse se concentre sur la ligne de démarcation — repousse naturelle contre longueur traitée : c’est le point fragile que les professionnels surveillent, d’où la douceur aux racines avant n’importe quel produit de longueur.',
    keys: ['sci_relax_timing'],
  },
  {
    id: 'trans_poro',
    when: c => c.texture === 'defrisee' && (c.porosity === 'inconnue' || c.porosity === 'forte'),
    text: 'Une longueur défrisée est poreuse par définition, pas par accident : la cuticule a été ouverte par le chimique et rend l’eau aussi vite qu’elle la prend — c’est ce qui fixe l’équilibre à chercher : ni trop de protéines, ni trop d’eau.',
    keys: ['sci_relax_porosite'],
  },
  {
    id: 'trans_zones',
    when: c => c.texture === 'defrisee' && c.focus === 'trans_melanges',
    text: 'Deux textures ne boivent pas à la même vitesse : la repousse demande de l’eau, la longueur traitée demande du scellement — c’est pourquoi la routine garde un geste distinct par zone plutôt qu’un produit unique pour toute la tête.',
    keys: ['sci_relax_porosite', 'sci_liaisons'],
  },

  // — hydratation / porosité (tous segments sauf locks) —
  {
    id: 'sebum_route',
    when: c => !c.isLocked && c.priority === 'hydratation' && (c.isTextured || c.texture === 'defrisee'),
    text: 'Vos longueurs ne reçoivent pas ce que votre cuir chevelu produit : le sébum ne voyage pas dans une fibre courbée — la sécheresse des longueurs est structurelle, pas un manque de soin de votre part, et c’est ce qui remet l’eau ajoutée au centre.',
    keys: ['sci_sebum'],
  },
  {
    id: 'poro_forte',
    when: c => c.porosity === 'forte',
    text: 'Porosité forte : la cuticule est ouverte, votre cheveu boit vite et rend l’eau tout aussi vite — c’est ce qui rend l’ordre du geste (eau d’abord, scellement juste après) plus décisif que la liste des produits.',
    keys: ['sci_porosite_test'],
  },
  {
    id: 'poro_faible',
    when: c => c.porosity === 'faible',
    text: 'Porosité faible : la cuticule résiste à l’entrée de l’eau — empiler les produits ne la force pas, cela l’alourdit, c’est pourquoi la routine choisit des textures légères, appliquées sur cheveu humide.',
    keys: ['sci_porosite_test'],
  },
  {
    id: 'poro_moyenne',
    when: c => c.porosity === 'moyenne',
    text: 'Porosité moyenne : un équilibre, ni fuite ni barrage — c’est ce qui rend la routine type tenable chez vous, et vos ajustements se feront sur le ressenti entre deux lavages, pas sur un protocole de plus.',
    keys: ['sci_porosite_test'],
  },

  // — cuir chevelu (hors locks / protectrice, déjà traités par leurs règles) —
  {
    id: 'scalp_pellicules',
    when: c => c.scalp === 'pellicules',
    text: 'Les squames blanches sur un cuir chevelu texturé signalent un manque d’eau plus qu’un excès de gras : c’est pourquoi la routine commence par un lavage doux — décaper ajouterait du sec au sec.',
    keys: ['sci_pellicules'],
  },
  {
    id: 'scalp_sec',
    when: c => c.scalp === 'sec' && !c.isLocked,
    text: 'Cuir chevelu qui tire et longueurs sèches sont un seul et même dossier : la fibre courbée ne transporte rien dans aucun sens — d’où deux gestes séparés, l’un pour le cuir chevelu, l’autre pour les longueurs, jamais un produit unique pour les deux.',
    keys: ['sci_sebum'],
  },
  {
    id: 'scalp_demange',
    when: c => (c.scalp === 'demangeaisons' || c.scalp === 'irritation') && !c.isLocked && !c.isProtective && !c.isWig,
    text: 'Démangeaisons et irritation sur cheveux libres tiennent au rythme et au rinçage plus qu’au produit lui-même : un résidu de shampoing irrit davantage qu’un manque — c’est pourquoi la routine pose d’abord le lavage doux et le rinçage long.',
    keys: ['sci_pellicules'],
  },

  // — casse / définition / pousse —
  {
    id: 'casse_friction',
    when: c => !c.isKid && !c.isWig && (c.priority === 'casse' || c.focus === 'prot_longueurs' || c.focus === 'enf_demeler'),
    text: 'Ce qui casse au quotidien n’est pas la séance de démêlage, c’est le reste : frottements de la nuit, longueurs qui se frottent entre elles — le satin est le geste au meilleur rapport effort/résultat qui existe, c’est pourquoi il passe avant n’importe quelle crème.',
    keys: ['sci_friction'],
  },
  {
    id: 'definition_eau',
    when: c => !c.isLocked && !c.isKid && !c.isProtective && (c.priority === 'definition' || c.focus === 'boucle_definition' || c.focus === 'boucle_frisottis'),
    text: 'La boucle s’écrit dans l’eau et se fixe au séchage : ses liaisons se défont à l’humidité et se reforment en séchant — définir est donc un geste sur cheveu mouillé, pas une retouche à sec ; c’est ce qui explique la méthode de la routine plutôt qu’un produit fixant.',
    keys: ['sci_liaisons'],
  },
  {
    id: 'pousse_longueur',
    when: c => c.priority === 'pousse' && !c.isLocked && c.pattern !== '4c' && (c.isTextured || c.texture === 'defrisee'),
    text: 'Sur un motif serré, la longueur visible à sec peut perdre jusqu’aux trois quarts de la longueur réelle : c’est la rétraction naturelle de la boucle, pas de la longueur perdue — vos progrès se mesurent aux pointes et à la casse, pas au miroir du matin.',
    keys: ['sci_shrinkage'],
  },
  {
    id: 'pousse_longueur_4c',
    when: c => c.priority === 'pousse' && !c.isLocked && c.pattern === '4c',
    text: 'Sur un motif 4C, le shrinkage peut effacer les trois quarts de la longueur visible — parfois plus : c’est la géométrie de la fibre, pas une perte. Un mètre ruban au lavage, noté une fois par mois, remplace le miroir du matin : c’est la seule mesure qui ne ment pas sur cette texture.',
    keys: ['sci_shrinkage'],
  },

  // — enfant —
  {
    id: 'kid_methode',
    when: c => c.isKid && !c.isLocked,
    text: 'Le cuir chevelu d’un enfant est plus fin et ses follicules en construction : la tension y laisse des marques plus vite — démêler des pointes vers la racine et s’arrêter quand l’enfant grimace ne sont pas des précautions optionnelles, c’est la méthode qui tient.',
    keys: ['sci_kid_scalp', 'sci_kid_demelage'],
  },
  {
    id: 'kid_methode_locks',
    when: c => c.isKid && c.isLocked,
    text: 'Le cuir chevelu d’un enfant est plus fin et ses follicules en construction : la tension y laisse des marques plus vite. Sur des locks — même petites — rien ne se démêle au peigne : le cuir chevelu se travaille du bout des doigts, section par section, et la patience de l’enfant vaut plus que n’importe quel outil. S’arrêter quand l’enfant grimace n’est pas une option, c’est la méthode qui tient.',
    keys: ['sci_kid_scalp'],
  },
  {
    id: 'kid_scalp',
    when: c => c.isKid && c.scalpTrouble,
    text: 'Chez l’enfant, squames et démangeaisons viennent d’un cuir chevelu en manque d’eau : les produits « anti-pelliculaires » pensés pour les adultes décapent — c’est pourquoi le lavage doux et l’hydratation légère priment, sans rien de plus.',
    keys: ['sci_kid_pellicules'],
  },

  // — rythme de lavage —
  {
    id: 'freq_2x',
    when: c => c.frequency === '2x_semaine' && !c.isLocked && c.porosity !== 'forte',
    text: 'Deux lavages par semaine, c’est aussi deux séances de démêlage par semaine : chaque lavage est une fenêtre de casse — c’est pourquoi la routine allège les manipulations entre les deux plutôt que d’ajouter des produits.',
    keys: ['sci_friction', 'sci_section_plate'],
  },
  {
    id: 'freq_debut',
    when: c => c.experience === 'debutante' && !c.isLocked,
    text: 'En débutant, la première victoire est la tenue du rythme, pas le produit parfait : la douceur vaut plus que la liste — c’est ce qui explique trois gestes courts plutôt qu’un rituel complet qui ne tiendrait pas deux semaines.',
    keys: ['sci_cgm'],
  },
  {
    id: 'freq_irregulier',
    when: c => c.frequency === 'irreguliere' && !c.isProtective && !c.isWig,
    text: 'Un rythme irrégulier ne laisse aucune prise à l’observation : impossible de relier un progrès ou une gêne à une fréquence — c’est pourquoi choisir un jour de lavage, même imparfait, rend le J+7 lisible.',
    keys: ['sci_typing'],
  },

  // — D4 : longueur, fréquence réelle, expérience —
  {
    id: 'longueur_frottement',
    when: c => c.isLong && (c.isTextured || c.texture === 'defrisee'),
    text: 'Vos longueurs portent leur propre poids : les zones fines subissent davantage de frottement au fil des jours — c’est ce qui rend la protection de nuit et le démêlage par sections non optionnels chez vous.',
    keys: ['sci_friction', 'sci_section_plate'],
  },
  {
    id: 'longueur_courte_lisibilite',
    when: c => c.isShort,
    text: 'Sur une longueur courte, les problèmes se voient plus vite — nœuds, sécheresse, tiraillements apparaissent avant de s’installer : c’est ce qui permet à KURLA de régler votre routine à la semaine plutôt qu’à la saison.',
    keys: ['sci_typing'],
  },
  {
    id: 'rare_hydratation_entre',
    when: c => c.frequency === 'less_1x',
    text: 'Laver peu, c’est ne rien apporter en eau la plupart des jours : l’hydratation vient donc de la brume entre les lavages, pas du shampoing — c’est pourquoi l’aqueux léger est une étape, pas un appoint.',
    keys: ['sci_sebum'],
  },
  {
    id: 'forte_relavage',
    when: c => c.porosity === 'forte' && c.frequency === '2x_semaine',
    text: 'Porosité forte lavée deux fois par semaine : chaque lavage rend l’eau que vous venez d’apporter — c’est ce qui impose le second lavage plus doux qu’un premier, ou un simple rinçage aux longueurs.',
    keys: ['sci_pellicules', 'sci_porosite_test'],
  },
  {
    id: 'expert_reglages',
    when: c => c.experience === 'expert',
    text: 'Vous connaissez votre cheveu : KURLA ne vous enseigne pas les gestes, il vous donne les points de mesure — l’élasticité d’une mèche humide et le temps de pose sont les deux molettes que la routine vous laisse régler.',
    keys: ['sci_relax_porosite', 'sci_typing'],
  },

  // — remplissages de segment (1 seul champ) : relégués après toutes les
  // règles croisées, pour ne jamais éjecter une dérivation du plafond de 4 —
  {
    id: 'locks_process',
    when: c => c.isLocked,
    text: 'La lock se forme par friction et par temps, pas par produit : les cheveux perdus chaque jour restent pris dans le cœur de la lock et la compactent — la routine accompagne ce phénomène, elle ne cherche pas à le forcer.',
    keys: ['sci_locks_mecanisme'],
  },
  {
    id: 'locks_lavage',
    when: c => c.isLocked && (c.frequency === '1x_semaine' || c.frequency === '2x_semaine'),
    text: 'Votre rythme de lavage est juste pour des locks ; le vrai réglage est après l’eau : une lock mal séchée se dégrade plus vite qu’une lock lavée de trop — c’est ce qui rend le temps de séchage non négociable.',
    keys: ['sci_locks_scalp'],
  },

  // — filets structurels (garantissent ≥1 dérivée sur tout profil) —
  {
    id: 'filet_sebum',
    when: c => c.isTextured || c.texture === 'defrisee',
    text: 'Retenez ceci avant tout le reste : sur une fibre courbée, rien ne remonte du cuir chevelu tout seul — la sécheresse des longueurs est une question de géographie, pas de négligence, et c’est ce qui remet l’eau ajoutée au centre de la routine.',
    keys: ['sci_sebum'],
  },
  {
    id: 'filet_court',
    when: () => true,
    text: 'KURLA garde la routine volontairement courte : le profil complet — motif, porosité, cuir chevelu, rythme — pilote des gestes tenables, pas une liste idéale — les ajustements viendront de vos observations notées, jamais d’une intuition.',
    keys: ['sci_typing'],
  },
];

/** Observations dérivées d'un profil : les règles déclenchées, specificity d'abord, 4 maximum. */
export function deriveHairObservations(ctx: HairAdvisoryContext, max = 4): HairDerivation[] {
  const c = normalize(ctx);
  return HAIR_DERIVATION_RULES.filter(rule => rule.when(c))
    .slice(0, Math.max(0, max))
    .map(rule => ({ id: rule.id, text: rule.text, keys: rule.keys }));
}
