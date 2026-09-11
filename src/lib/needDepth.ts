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
}

/**
 * Les cinq besoins de fibre traités par D1. Les huit autres besoins capillaires
 * relèvent de D2 (coiffure) et D3 (cuir chevelu et barbe).
 */
export const FIBRE_NEEDS = [
  'hydrater_cheveux',
  'reduire_casse',
  'definir_boucles',
  'reduire_frisottis',
  'demeler_cheveux'
] as const;

export function isFibreNeed(need: string): boolean {
  return (FIBRE_NEEDS as readonly string[]).includes(need);
}

const EMPTY: NeedDepth = { intensity: 0, nuances: [] };

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
  let intensity = 0;
  return {
    push(field: string, value: string, advice: string | null) {
      if (advice !== null && known(value)) {
        nuances.push({ field, value: formatValue(value), advice });
      }
    },
    raise(amount: number) {
      intensity = Math.min(100, intensity + amount);
    },
    result(): NeedDepth {
      return { intensity, nuances };
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

// --- Point d'entrée --------------------------------------------------------

/**
 * Retourne la profondeur d'un besoin. Pour un besoin hors D1, le résultat est
 * vide : l'absence de nuance signifie « pas encore approfondi », jamais
 * « aucun conseil à donner ».
 */
export function assessNeedDepth(need: string, profile: BeautyProfile): NeedDepth {
  switch (need) {
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
    default:
      return EMPTY;
  }
}
