/**
 * CHANTIER D1 — PROFONDEUR DES BESOINS DE FIBRE.
 *
 * Constat à l'origine de ce module, mesuré dans le code : chaque branche de
 * `calculateKurlaFit` retournait un booléen. `hydrater_cheveux` était donc
 * « vrai » de la même façon pour un 4C à porosité faible et pour un 2A à
 * porosité forte — alors que le geste conseillé est opposé. La porosité
 * apparaissait bien dans les preuves affichées, mais elle ne changeait rien à
 * la décision ni au conseil rendu.
 *
 * Ce que ce module ajoute, et ce qu'il ne fait PAS :
 *
 * - Il n'ajoute pas de besoin et ne retire aucune éligibilité. Le booléen
 *   d'origine reste seul responsable de « ce besoin est-il pertinent ». C'est
 *   volontaire : un besoin devenu conditionnel pourrait redevenir orphelin, le
 *   défaut réparé au chantier A.
 * - Il ajoute deux choses à un besoin déjà couvert : une **intensité** (à quel
 *   point les signaux déclarés le rendent pressant) et des **nuances** (le
 *   geste change selon la fibre).
 * - Chaque nuance est rattachée à un champ déclaré. Si le champ vaut
 *   `inconnu`, la nuance n'existe pas : KURLA ne devine pas une caractéristique
 *   pour se donner un conseil à formuler.
 * - L'intensité ne participe PAS au score. Le chantier F décidera de la
 *   pondération. D1 fournit la mesure, pas la formule.
 *
 * Les nuances décrivent des gestes et des précautions. Elles ne promettent
 * aucun résultat, n'établissent aucun diagnostic, et ne préjugent pas de la
 * composition exacte d'une fiche produit.
 */

import { BeautyProfile, UNKNOWN } from './beautyProfile';

export interface NeedNuance {
  /** Champ du profil qui déclenche la nuance. Traçable, jamais déduit. */
  field: string;
  /** Valeur déclarée, lisible. */
  value: string;
  /** Le conseil différencié. */
  advice: string;
}

export interface NeedDepth {
  /** 0–100. Somme des signaux déclarés, écrêtée. */
  intensity: number;
  nuances: NeedNuance[];
  /**
   * Ce que KURLA ne peut pas savoir, dit plutôt qu'estimé. Une limite n'est pas
   * un conseil atténué : c'est l'absence d'une donnée sans laquelle le conseil
   * serait une supposition. Même principe que `TractionFitResult.limitations`.
   */
  limitations: string[];
}

/**
 * Les cinq besoins de fibre traités par D1.
 */
export const FIBRE_NEEDS = [
  'hydrater_cheveux',
  'reduire_casse',
  'definir_boucles',
  'reduire_frisottis',
  'demeler_cheveux'
] as const;

/**
 * CHANTIER D2 — les cinq besoins de coiffure.
 *
 * Frontière avec `styleFit.ts` : ce module-ci ne redit rien de ce que
 * `assessStyleFit`, `assessTractionFit` ou `assessWigFit` établissent déjà —
 * l'occlusion sous perruque, les résidus sans rinçage complet, la priorité au
 * cuir chevelu, la texture fluide, le risque de traction et ses durées de port.
 * D2 ajoute ce qui dépend des **autres** champs déclarés : fréquence de lavage,
 * temps disponible, longueur, densité, coloration, traitements, sensibilité
 * cutanée. Et il nomme ce que le profil ne déclare pas du tout.
 */
export const STYLE_NEEDS = [
  'entretenir_tresses',
  'entretenir_locks',
  'entretenir_perruque',
  'proteger_chaleur',
  'proteger_nuit'
] as const;

/**
 * CHANTIER D3 — cuir chevelu et barbe.
 *
 * Deux frontières tenues :
 *
 * - `styleFit.ts` établit déjà la priorité au cuir chevelu quand une coiffure
 *   protecteur est portée, et `assessTractionFit` renvoie déjà vers un
 *   professionnel sur signal d'escalade. D3 ne redit ni l'un ni l'autre : il
 *   traite l'état **déclaré** du cuir chevelu, indépendamment de toute coiffure.
 * - `needsHub.ts` porte déjà, pour ces besoins, un texte `seeDoctor` (« consultez
 *   un dermatologue », « avis dermatologique »). C'est une surface éditoriale
 *   distincte — `NEEDS_HUB` n'est lu que par `needTexturePages.ts` et
 *   `NeedHubPage.tsx`, jamais par le moteur — mais D3 ne reformule pas ces
 *   phrases pour autant. Le banc le vérifie.
 */
export const SCALP_NEEDS = [
  'cuir_chevelu',
  'apaiser_cuir_chevelu',
  'barbe'
] as const;

export function isFibreNeed(need: string): boolean {
  return (FIBRE_NEEDS as readonly string[]).includes(need);
}

export function isStyleNeed(need: string): boolean {
  return (STYLE_NEEDS as readonly string[]).includes(need);
}

export function isScalpNeed(need: string): boolean {
  return (SCALP_NEEDS as readonly string[]).includes(need);
}

const EMPTY: NeedDepth = { intensity: 0, nuances: [], limitations: [] };

function known(value: string | undefined): boolean {
  return typeof value === 'string' && value !== '' && value !== UNKNOWN;
}

function formatValue(value: string): string {
  return value.replaceAll('_', ' ');
}

/**
 * Accumulateur local. `push` ignore silencieusement une nuance dont le champ
 * n'est pas déclaré : c'est ce qui garantit qu'aucun conseil n'apparaît sans
 * son fondement.
 */
function depthBuilder() {
  const nuances: NeedNuance[] = [];
  const limitations: string[] = [];
  let intensity = 0;
  return {
    push(field: string, value: string, advice: string | null) {
      if (advice !== null && known(value)) {
        nuances.push({ field, value: formatValue(value), advice });
      }
    },
    /**
     * Une limite est inconditionnelle : elle existe parce que la donnée manque,
     * pas parce qu'un champ a une valeur. Elle ne passe donc pas par `known`.
     */
    limit(text: string) {
      limitations.push(text);
    },
    raise(amount: number) {
      intensity = Math.min(100, intensity + amount);
    },
    result(): NeedDepth {
      return { intensity, nuances, limitations };
    }
  };
}

/** Textures dont la géométrie rend le démêlage mécanique plus risqué. */
const TIGHT_TEXTURES = ['4A', '4B', '4C', 'locks'];

function hasTightTexture(textures: string[]): boolean {
  return textures.some(texture => TIGHT_TEXTURES.includes(texture));
}

// --- hydrater_cheveux ------------------------------------------------------

function hydrationAdviceForPorosity(porosity: string): string | null {
  switch (porosity) {
    case 'faible':
      return 'Porosité faible : la cuticule laisse peu entrer l’eau. Une hydratation appliquée sur cheveux encore humides pénètre mieux qu’une couche épaisse posée sur fibre sèche, et les textures lourdes restent en surface sans hydrater.';
    case 'moyenne':
      return 'Porosité moyenne : l’hydratation tient sans précaution particulière. C’est la régularité qui fait la différence, pas la quantité appliquée.';
    case 'forte':
      return 'Porosité forte : l’eau entre vite et ressort aussi vite. Sceller après l’hydratation compte autant que l’hydratation elle-même.';
    default:
      return null;
  }
}

function hydrationAdviceForThickness(thickness: string): string | null {
  switch (thickness) {
    case 'fine':
      return 'Cheveu fin : les beurres épais alourdissent et plaquent. Une texture légère, concentrée sur les longueurs et les pointes, hydrate sans coûter le volume.';
    case 'epaisse':
      return 'Cheveu épais : une texture riche se justifie, surtout sur les pointes. Elle peut être insuffisante sur une fibre fine.';
    default:
      return null;
  }
}

function hydrationAdviceForDensity(density: string): string | null {
  return density === 'forte'
    ? 'Densité élevée : appliquez en sections. Sinon les longueurs internes ne reçoivent rien et seules les mèches de surface sont traitées.'
    : null;
}

function hydrationDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;

  if (hair.dryness === 'forte') d.raise(20);
  if (hair.zones.ends.dryness === 'forte') d.raise(15);
  if (hair.porosity === 'forte') d.raise(15);
  if (hair.length === 'long' || hair.length === 'tres_long') d.raise(10);
  const styled = hair.protectiveStyles.filter(style => style !== 'aucun' && style !== UNKNOWN);
  if (styled.length > 0) d.raise(10);

  d.push('hair.porosity', hair.porosity, hydrationAdviceForPorosity(hair.porosity));
  d.push('hair.strandThickness', hair.strandThickness, hydrationAdviceForThickness(hair.strandThickness));
  d.push('hair.density', hair.density, hydrationAdviceForDensity(hair.density));
  if (styled.length > 0) {
    d.push('hair.protectiveStyles', styled.join(', '),
      'Sous coiffure, les longueurs ne sont pas réhydratées au quotidien : un apport ciblé racines et lisières, et une reprise du soin au retrait, évitent que la sécheresse s’installe sans être vue.');
  }

  return d.result();
}

// --- reduire_casse ---------------------------------------------------------

function breakageAdviceForElasticity(elasticity: string): string | null {
  switch (elasticity) {
    case 'faible':
      return 'Élasticité faible : la fibre casse avant de s’étirer. Un apport protéiné léger en alternance avec l’hydratation est prioritaire, et il faut éviter tout étirement au démêlage.';
    case 'forte':
      return 'Élasticité très élevée, cheveu mou : c’est souvent un excès d’hydratation et un manque de structure. Réduire les humectants et réintroduire un apport protéiné léger vaut mieux qu’hydrater davantage.';
    case 'equilibree':
      return 'Élasticité équilibrée : la fibre s’étire et revient. La casse vient alors d’abord de la manipulation, pas d’un déséquilibre — la prudence au démêlage et aux coiffures en tension est le levier principal.';
    default:
      return null;
  }
}

function breakageDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;

  if (hair.breakage === 'frequente' || hair.zones.ends.breakage === 'frequente') d.raise(25);
  if (hair.fiberCondition === 'fragile') d.raise(20);
  if (hair.elasticity === 'faible') d.raise(15);
  const treatments = hair.chemicalTreatments.filter(item => item !== 'aucun' && item !== UNKNOWN);
  if (treatments.length > 0) d.raise(15);
  if (hair.coloring === 'decoloration' || hair.coloring === 'permanente') d.raise(10);
  if (hair.density === 'faible' && hair.breakage === 'frequente') d.raise(10);

  d.push('hair.elasticity', hair.elasticity, breakageAdviceForElasticity(hair.elasticity));
  if (treatments.length > 0) {
    d.push('hair.chemicalTreatments', treatments.join(', '),
      'Une fibre traitée chimiquement a une structure modifiée : l’hydratation seule ne répare pas cette casse. Elle se gère en alternant hydratation et apport protéiné léger, et en espaçant les traitements.');
  }
  if (hair.coloring === 'decoloration') {
    d.push('hair.coloring', hair.coloring,
      'Une décoloration fragilise durablement la fibre : concentrez le soin sur les longueurs décolorées plutôt que sur l’ensemble, et évitez de cumuler chaleur et démêlage à sec sur ces zones.');
  }
  if (hair.density === 'faible') {
    d.push('hair.density', hair.density,
      'Densité faible : une casse même modérée se voit vite en perte de volume. Les coiffures en tension sur les lisières sont le premier poste à surveiller.');
  }

  return d.result();
}

// --- definir_boucles -------------------------------------------------------

function definitionAdviceForCurlPattern(pattern: string): string | null {
  switch (pattern) {
    case 'ondulations':
    case 'boucles_larges':
      return 'Ondulations ou boucles larges : un produit riche alourdit et détend le motif. Une texture légère, appliquée sur cheveux très mouillés, tient la forme sans l’écraser.';
    case 'boucles_serrees':
    case 'spirales':
      return 'Boucles serrées ou spirales : appliquez par sections en remontant vers la racine, sur cheveux très mouillés. Le motif se forme à l’application, pas au séchage.';
    case 'zigzag':
      return 'Motif en Z : la définition se lit en volume et en texture plus qu’en spirale visible, et le rétrécissement au séchage est important. Juger le résultat sur cheveu sec évite de surdoser le produit.';
    case 'frisure_serree':
      return 'Frisure très serrée, peu définie : chercher une définition comparable à une boucle large mène à surdoser les produits sans résultat. La priorité est l’hydratation et la douceur au toucher, pas la forme.';
    case 'mixte':
      return 'Plusieurs motifs sur la tête : un seul produit ne rendra pas un résultat uniforme. Traiter les zones séparément, ou accepter une définition inégale, évite de conclure à tort que le produit ne convient pas.';
    default:
      return null;
  }
}

function definitionDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;

  if (hair.stylingHabits.includes('wash_and_go')) d.raise(20);
  if (known(hair.curlPattern) && hair.curlPattern !== 'mixte') d.raise(10);
  if (hair.frizz === 'frequents') d.raise(10);
  if (hasTightTexture(hair.texturePatterns)) d.raise(10);

  d.push('hair.curlPattern', hair.curlPattern, definitionAdviceForCurlPattern(hair.curlPattern));
  if (hair.frizz === 'frequents') {
    d.push('hair.frizz', hair.frizz,
      'Frisottis fréquents et définition tirent en sens opposés : les tenues fortes assèchent souvent la fibre. Traiter d’abord la sécheresse déclarée rend la définition plus facile qu’en augmentant la tenue.');
  }
  if (hasTightTexture(hair.texturePatterns)) {
    d.push('hair.texturePatterns', hair.texturePatterns.join(', '),
      'Sur texture serrée, la définition se travaille en sections avec les doigts ou un peigne à dents larges, sur cheveux saturés d’eau. Un brossage à sec casse le motif et la fibre.');
  }

  return d.result();
}

// --- reduire_frisottis -----------------------------------------------------

function frizzAdviceForPorosity(porosity: string): string | null {
  switch (porosity) {
    case 'forte':
      return 'Porosité forte : la cuticule soulevée laisse l’humidité de l’air entrer et sortir, ce qui produit le frisotti. Un scellant après le soin agit sur ce mécanisme, là où un produit coiffant seul ne fait que masquer.';
    case 'faible':
      return 'Porosité faible : le frisotti vient moins d’une cuticule abîmée que d’un manque d’hydratation retenue. Insister sur l’hydratation avant de chercher à plaquer.';
    default:
      return null;
  }
}

function frizzAdviceForHumidity(humidity: string): string | null {
  switch (humidity) {
    case 'forte':
      return 'Air très humide : les humectants attirent l’eau de l’air et peuvent accentuer le frisotti au lieu de le réduire. Un film protecteur en dernière étape tient mieux dans ces conditions.';
    case 'faible':
      return 'Air sec : les humectants ont peu d’eau à capter et peuvent assécher la surface. Un corps gras léger en finition retient l’hydratation déjà apportée.';
    default:
      return null;
  }
}

function frizzDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const humidity = profile.environment.humidity;

  if (hair.frizz === 'frequents') d.raise(20);
  if (hair.dryness === 'forte') d.raise(15);
  if (hair.porosity === 'forte') d.raise(15);
  if (humidity === 'forte' || humidity === 'faible') d.raise(10);

  d.push('hair.porosity', hair.porosity, frizzAdviceForPorosity(hair.porosity));
  d.push('environment.humidity', humidity, frizzAdviceForHumidity(humidity));
  if (hair.dryness === 'forte') {
    d.push('hair.dryness', hair.dryness,
      'Sécheresse forte déclarée : une partie du frisotti est un symptôme de déshydratation. Le traiter comme un problème de coiffage laisse la cause en place.');
  }
  if (hasTightTexture(hair.texturePatterns)) {
    d.push('hair.texturePatterns', hair.texturePatterns.join(', '),
      'Sur texture serrée, ce qui est appelé « frisotti » est parfois simplement le motif naturel non hydraté. Vérifier l’hydratation avant de chercher à lisser évite de traiter un cheveu sain comme un cheveu abîmé.');
  }

  return d.result();
}

// --- demeler_cheveux -------------------------------------------------------

function detangleAdviceForTexture(textures: string[]): string | null {
  return hasTightTexture(textures)
    ? 'Texture serrée : démêlez sur cheveux saturés d’eau et de produit glissant, en partant des pointes et en remontant vers la racine, aux doigts ou au peigne à dents larges. Démêler à sec concentre la casse sur les nœuds.'
    : null;
}

function detangleAdviceForPorosity(porosity: string): string | null {
  return porosity === 'forte'
    ? 'Porosité forte : la fibre gorgée d’eau est à son plus fragile. Essorer avant de démêler et ne jamais tirer sur un nœud réduit la casse au moment le plus risqué.'
    : null;
}

function detangleAdviceForThickness(thickness: string): string | null {
  return thickness === 'fine'
    ? 'Cheveu fin : il s’emmêle vite et supporte mal la traction. Travaillez en petites sections plutôt qu’en passant plusieurs fois sur la même mèche.'
    : null;
}

function detangleDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;

  if (hair.breakage === 'frequente') d.raise(20);
  if (hair.elasticity === 'faible') d.raise(15);
  if (hasTightTexture(hair.texturePatterns)) d.raise(15);
  if (hair.porosity === 'forte') d.raise(10);

  d.push('hair.texturePatterns', hair.texturePatterns.join(', '), detangleAdviceForTexture(hair.texturePatterns));
  d.push('hair.porosity', hair.porosity, detangleAdviceForPorosity(hair.porosity));
  d.push('hair.strandThickness', hair.strandThickness, detangleAdviceForThickness(hair.strandThickness));
  if (hair.elasticity === 'faible') {
    d.push('hair.elasticity', hair.elasticity,
      'Élasticité faible : la fibre casse au lieu de s’étirer. Ne jamais étirer un nœud pour le défaire — le défaire mèche par mèche, ou le laisser au prochain lavage, coûte moins cher à la fibre.');
  }

  return d.result();
}

// === CHANTIER D2 — besoins de coiffure ====================================

// --- entretenir_tresses ----------------------------------------------------

function braidsDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;

  const washedOften = hair.washFrequency === 'plusieurs_fois_semaine' || hair.washFrequency === 'une_fois_semaine';
  const long = hair.length === 'long' || hair.length === 'tres_long';
  if (washedOften) d.raise(15);
  if (hair.stylingHabits.includes('coiffures_serrees')) d.raise(15);
  if (hair.density === 'forte') d.raise(10);
  if (long) d.raise(10);
  if (hair.availableTime === 'moins_15_min') d.raise(10);

  if (washedOften) {
    d.push('hair.washFrequency', hair.washFrequency,
      'Lavage fréquent déclaré alors que des tresses sont portées : la base des tresses sèche mal entre deux lavages. Espacer, ou sécher réellement le cuir chevelu après chaque lavage, compte davantage que le produit utilisé.');
  }
  if (hair.stylingHabits.includes('coiffures_serrees')) {
    d.push('hair.stylingHabits', hair.stylingHabits.join(', '),
      'Habitude de coiffures serrées déclarée, en plus des tresses actuellement portées : la tension se répète d’une pose à l’autre. Demander une pose plus lâche la fois suivante est le seul levier qui agit sur la cause.');
  }
  d.push('hair.density', hair.density, hair.density === 'forte'
    ? 'Densité élevée : beaucoup de tresses, donc un séchage lent à la base. C’est la zone où l’humidité reste piégée le plus longtemps.'
    : null);
  d.push('hair.length', hair.length, long
    ? 'Cheveux longs tressés : le poids se reporte sur les racines. C’est une contrainte indépendante du serrage choisi à la pose.'
    : null);
  d.push('hair.availableTime', hair.availableTime, hair.availableTime === 'moins_15_min'
    ? 'Moins de 15 minutes par session déclarées : une routine d’entretien plus longue ne sera pas tenue. Une étape réellement faite vaut mieux qu’un programme complet abandonné.'
    : null);

  return d.result();
}

// --- entretenir_locks ------------------------------------------------------

function locksCareDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;

  const spaced = hair.washFrequency === 'moins_frequent' || hair.washFrequency === 'tous_les_10_14_jours';
  const long = hair.length === 'long' || hair.length === 'tres_long';
  if (spaced) d.raise(15);
  if (hair.porosity === 'forte') d.raise(10);
  if (long) d.raise(10);
  if (hair.availableTime === 'moins_15_min') d.raise(10);

  d.push('hair.washFrequency', hair.washFrequency, spaced
    ? 'Lavage espacé déclaré : sur locks, ce qui n’est pas rincé régulièrement reste dans la mèche. L’espacement se compense par un rinçage plus long, pas par davantage de produit.'
    : null);
  d.push('hair.porosity', hair.porosity, hair.porosity === 'forte'
    ? 'Porosité forte : la mèche absorbe et retient ce qu’on y dépose. Une petite quantité suffit ; en ajouter ne pénètre pas plus et s’accumule.'
    : null);
  d.push('hair.length', hair.length, long
    ? 'Locks longues : le poids tire sur les racines en permanence. C’est une contrainte continue, distincte de celle d’une coiffure posée pour quelques semaines.'
    : null);
  d.push('hair.availableTime', hair.availableTime, hair.availableTime === 'moins_15_min'
    ? 'Moins de 15 minutes par session déclarées : l’entretien des locks se prête mal aux routines longues. Mieux vaut un rinçage complet court et régulier qu’un soin riche occasionnel.'
    : null);

  d.limit('Le stade des locks — démarrage ou locks installées — n’est déclaré nulle part dans le profil. Les besoins diffèrent : des locks en démarrage supportent mal la manipulation, des locks installées davantage. Faute de cette information, ce conseil reste général.');

  return d.result();
}

// --- entretenir_perruque ---------------------------------------------------

function wigCareDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const skin = profile.skin;

  if (skin.sensitivity === 'elevee') d.raise(20);
  if (skin.activeTolerance === 'faible') d.raise(10);
  if (hair.washFrequency === 'moins_frequent') d.raise(10);

  d.push('skin.sensitivity', skin.sensitivity, skin.sensitivity === 'elevee'
    ? 'Peau déclarée très sensible, sous perruque : le cuir chevelu est occlus et tout ce qui est appliqué reste au contact prolongé. Introduire un produit à la fois, sur une zone réduite d’abord, permet d’identifier ce qui ne convient pas.'
    : null);
  d.push('skin.activeTolerance', skin.activeTolerance, skin.activeTolerance === 'faible'
    ? 'Tolérance aux actifs déclarée faible : sous occlusion, un actif pénètre davantage et irrite davantage. Les concentrations élevées sont les premières à écarter ici.'
    : null);
  d.push('hair.washFrequency', hair.washFrequency, hair.washFrequency === 'moins_frequent'
    ? 'Lavage espacé déclaré : la perruque et le cuir chevelu dessous ne suivent pas le même rythme. Les traiter comme un seul objet conduit à laver l’un trop souvent et l’autre pas assez.'
    : null);

  d.limit('La nature de la fibre de la perruque — synthétique ou cheveux humains — n’est déclarée nulle part dans le profil. La différence est déterminante : une fibre synthétique ne supporte pas la chaleur. KURLA ne recommande donc aucun usage d’outil chauffant sur la perruque.');
  d.limit('Le mode de fixation — lace collée, bonnet, clips — n’est pas déclaré non plus. Les conseils ci-dessus portent sur le cuir chevelu et la fibre, pas sur le retrait d’une colle.');

  return d.result();
}

// --- proteger_chaleur ------------------------------------------------------

function heatDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const treatments = hair.chemicalTreatments.filter(item => item === 'defrisage' || item === 'lissage');

  if (hair.coloring === 'decoloration') d.raise(25);
  if (treatments.length > 0) d.raise(20);
  if (hair.fiberCondition === 'fragile') d.raise(15);
  if (hair.porosity === 'forte') d.raise(10);
  if (hair.elasticity === 'faible') d.raise(10);

  if (hair.coloring === 'decoloration') {
    d.push('hair.coloring', hair.coloring,
      'Fibre décolorée et outils chauffants déclarés : c’est la combinaison la plus à risque. Température la plus basse utilisable, un seul passage par mèche, et ne pas repasser sur une mèche encore chaude.');
  }
  if (treatments.length > 0) {
    d.push('hair.chemicalTreatments', treatments.join(', '),
      'Un défrisage ou un lissage a déjà modifié la structure de la fibre : la chaleur s’ajoute à une modification existante au lieu de partir d’une fibre intacte. Espacer les deux agit davantage que renforcer le protecteur.');
  }
  d.push('hair.fiberCondition', hair.fiberCondition, hair.fiberCondition === 'fragile'
    ? 'Fibre déclarée fragile : un protecteur thermique réduit l’exposition, il ne la supprime pas. Sur une fibre fragile, réduire la fréquence d’usage est le levier principal.'
    : null);
  d.push('hair.porosity', hair.porosity, hair.porosity === 'forte'
    ? 'Porosité forte : la cuticule est déjà soulevée, la chaleur la soulève davantage. C’est une raison de baisser la température, pas d’augmenter la quantité de produit.'
    : null);
  if (hasTightTexture(hair.texturePatterns)) {
    d.push('hair.texturePatterns', hair.texturePatterns.join(', '),
      'Sur texture serrée, un lissage thermique répété modifie le motif de façon durable. Ce qui est en jeu est la texture déclarée elle-même, pas seulement l’état de la fibre.');
  }

  d.limit('Ni l’outil ni sa température ne sont déclarés. KURLA ne peut donc pas indiquer de réglage : ces conseils portent sur la fréquence et la préparation, pas sur une valeur de température.');

  return d.result();
}

// --- proteger_nuit ---------------------------------------------------------

function nightDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const long = hair.length === 'long' || hair.length === 'tres_long';
  const styled = hair.protectiveStyles.filter(style => style !== 'aucun' && style !== UNKNOWN);

  if (long) d.raise(15);
  if (hair.zones.ends.breakage === 'frequente') d.raise(15);
  if (hasTightTexture(hair.texturePatterns)) d.raise(10);
  if (hair.strandThickness === 'fine') d.raise(10);
  if (styled.length > 0) d.raise(10);

  d.push('hair.length', hair.length, long
    ? 'Cheveux longs : les frottements s’accumulent la nuit, sur plusieurs heures. Réduire le contact agit davantage qu’un soin appliqué le matin sur des longueurs déjà marquées.'
    : null);
  if (hasTightTexture(hair.texturePatterns)) {
    d.push('hair.texturePatterns', hair.texturePatterns.join(', '),
      'Texture serrée : le frottement répété défait les mèches et casse aux points de contact. Une matière lisse au contact — bonnet ou taie — agit sur la cause mécanique, qu’aucun produit ne remplace.');
  }
  d.push('hair.zones.ends.breakage', hair.zones.ends.breakage, hair.zones.ends.breakage === 'frequente'
    ? 'Casse déclarée sur les pointes : ce sont elles qui touchent en premier. Les regrouper avant de dormir les retire de la zone de frottement.'
    : null);
  d.push('hair.strandThickness', hair.strandThickness, hair.strandThickness === 'fine'
    ? 'Cheveu fin : il supporte mal le frottement répété, et la perte se voit en volume avant de se voir en casse.'
    : null);
  if (styled.length > 0) {
    d.push('hair.protectiveStyles', styled.join(', '),
      'Une coiffure protectrice est portée : la coiffure frotte aussi. Protection nocturne et coiffure protectrice se cumulent, elles ne se remplacent pas.');
  }

  return d.result();
}

// === CHANTIER D3 — cuir chevelu et barbe ==================================

function scalpAdvice(scalpCondition: string): string | null {
  switch (scalpCondition) {
    case 'sec':
      return 'Cuir chevelu sec : il manque d’eau, pas de lavage. Un tensioactif doux et une hydratation du cuir chevelu passent avant tout produit « purifiant », qui aggraverait la sécheresse.';
    case 'gras':
      return 'Cuir chevelu à tendance grasse : la fréquence de lavage et la qualité du rinçage sont le levier principal. Un produit asséchant déclenche souvent davantage de sébum, pas moins.';
    case 'sensible':
      return 'Cuir chevelu sensible : un seul changement à la fois, puis plusieurs jours d’observation. Ce qui irrite est rarement identifiable quand plusieurs produits changent en même temps.';
    case 'normal':
      return 'Cuir chevelu équilibré : l’enjeu est de le rester. Changer de routine sans raison est le premier facteur de déséquilibre.';
    default:
      return null;
  }
}

// --- cuir_chevelu ----------------------------------------------------------

function scalpDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const water = profile.environment.waterQuality;
  const overWashed = hair.scalpCondition === 'sec' && hair.washFrequency === 'plusieurs_fois_semaine';

  if (hair.scalpCondition === 'sensible') d.raise(15);
  if (overWashed) d.raise(15);
  if (hair.scalpCondition === 'gras') d.raise(10);
  if (water === 'calcaire') d.raise(10);
  if (profile.skin.sensitivity === 'elevee') d.raise(10);

  d.push('hair.scalpCondition', hair.scalpCondition, scalpAdvice(hair.scalpCondition));
  if (overWashed) {
    d.push('hair.washFrequency', hair.washFrequency,
      'Cuir chevelu sec et lavages plusieurs fois par semaine : la fréquence peut entretenir la sécheresse qu’elle est censée traiter. Espacer est à tester avant d’ajouter un produit.');
  }
  d.push('environment.waterQuality', water, water === 'calcaire'
    ? 'Eau calcaire déclarée : les dépôts minéraux restent sur le cuir chevelu après rinçage et peuvent être pris pour des squames. C’est une cause externe, qu’aucun soin du cuir chevelu ne corrige.'
    : null);
  d.push('skin.sensitivity', profile.skin.sensitivity, profile.skin.sensitivity === 'elevee'
    ? 'Peau déclarée très sensible : le cuir chevelu est une peau et réagit généralement aux mêmes choses. Parfums et actifs concentrés sont à écarter ici aussi.'
    : null);

  return d.result();
}

// --- apaiser_cuir_chevelu --------------------------------------------------

function scalpSootheDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const signs = hair.scalpConcerns.filter(concern => ['demangeaisons', 'sensibilite', 'pellicules'].includes(concern));

  if (signs.length > 1) d.raise(20);
  if (hair.scalpConcerns.includes('demangeaisons')) d.raise(10);
  if (hair.scalpCondition === 'sensible') d.raise(10);
  if (profile.skin.activeTolerance === 'faible') d.raise(10);

  d.push('hair.scalpConcerns', signs.join(', '), signs.length > 1
    ? 'Plusieurs signes d’irritation déclarés ensemble : ils ont souvent une cause commune. Traiter un seul signe conduit à ajouter des produits plutôt qu’à retirer celui qui ne convient pas.'
    : null);
  if (hair.scalpConcerns.includes('pellicules') && hair.scalpCondition === 'sec') {
    d.push('hair.scalpCondition', hair.scalpCondition,
      'Squames déclarées sur un cuir chevelu sec : un cuir chevelu qui manque d’eau desquame aussi. Hydrater avant de traiter comme des pellicules évite d’employer un produit inadapté.');
  }
  if (hair.scalpConcerns.includes('pellicules') && hair.scalpCondition === 'gras') {
    d.push('hair.scalpCondition', hair.scalpCondition,
      'Squames déclarées sur un cuir chevelu gras : cette combinaison ne se traite pas comme une simple sécheresse. Si elle persiste malgré une routine adaptée, elle sort du champ de ce conseil.');
  }
  d.push('skin.activeTolerance', profile.skin.activeTolerance, profile.skin.activeTolerance === 'faible'
    ? 'Tolérance aux actifs déclarée faible : sur un cuir chevelu déjà irrité, un actif concentré aggrave au lieu d’apaiser. Commencer sans actif, puis introduire progressivement.'
    : null);

  d.limit('Le profil déclare un signe, pas une cause. Squames et démangeaisons peuvent avoir plusieurs origines, que KURLA ne distingue pas et ne diagnostique pas : ce conseil porte sur les gestes qui n’en aggravent aucune.');

  return d.result();
}

// --- barbe -----------------------------------------------------------------

function beardDepth(profile: BeautyProfile): NeedDepth {
  const d = depthBuilder();
  const hair = profile.hair;
  const skin = profile.skin;
  const acneic = skin.acne === 'occasionnelle' || skin.acne === 'reguliere';

  if (hair.facialHair === 'dense') d.raise(15);
  if (skin.sensitivity === 'elevee') d.raise(15);
  if (acneic) d.raise(15);
  if (skin.hydration === 'seche') d.raise(10);

  d.push('hair.facialHair', hair.facialHair, hair.facialHair === 'dense'
    ? 'Pilosité faciale dense : le produit atteint difficilement la peau sous la barbe. Appliquer en écartant les poils, en quantité suffisante pour atteindre la peau et pas seulement le poil.'
    : null);
  if (skin.sensitivity === 'elevee') {
    d.push('skin.sensitivity', skin.sensitivity,
      'Peau déclarée très sensible : sous la barbe il y a deux objets de soin, le poil et la peau dessous. Une réaction vient le plus souvent de la peau — c’est elle qu’il faut observer.');
  }
  if (acneic) {
    d.push('skin.acne', skin.acne,
      'Imperfections déclarées : une texture riche pour la barbe peut les aggraver dans cette zone. Un nettoyage qui atteint la peau et une texture légère passent avant l’entretien du poil.');
  }
  d.push('skin.hydration', skin.hydration, skin.hydration === 'seche'
    ? 'Peau déclarée sèche : la peau sous la barbe se déshydrate et desquame, ce qui se voit en pellicules sur le poil. Traiter la peau règle ce que traiter le poil ne règle pas.'
    : null);

  d.limit('La longueur de la barbe n’est déclarée nulle part dans le profil, et la peau sous la barbe n’est pas décrite séparément du reste du visage. Ces conseils s’appuient donc sur les champs peau généraux.');

  return d.result();
}

// --- Point d'entrée --------------------------------------------------------

/**
 * Retourne la profondeur d'un besoin. Pour un besoin non encore approfondi —
 * les 8 besoins peau, chantier E — le résultat est vide : l'absence de nuance
 * signifie « pas encore traité », jamais « aucun conseil à donner ».
 */
export function assessNeedDepth(need: string, profile: BeautyProfile): NeedDepth {
  switch (need) {
    // D1 — fibre.
    case 'hydrater_cheveux':
      return hydrationDepth(profile);
    case 'reduire_casse':
      return breakageDepth(profile);
    case 'definir_boucles':
      return definitionDepth(profile);
    case 'reduire_frisottis':
      return frizzDepth(profile);
    case 'demeler_cheveux':
      return detangleDepth(profile);
    // D2 — coiffure.
    case 'entretenir_tresses':
      return braidsDepth(profile);
    case 'entretenir_locks':
      return locksCareDepth(profile);
    case 'entretenir_perruque':
      return wigCareDepth(profile);
    case 'proteger_chaleur':
      return heatDepth(profile);
    case 'proteger_nuit':
      return nightDepth(profile);
    // D3 — cuir chevelu et barbe.
    case 'cuir_chevelu':
      return scalpDepth(profile);
    case 'apaiser_cuir_chevelu':
      return scalpSootheDepth(profile);
    case 'barbe':
      return beardDepth(profile);
    default:
      return EMPTY;
  }
}
