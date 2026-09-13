/**
 * KURLA SKIN — base de connaissance peau.
 *
 * Deux constats ont précédé ce fichier, et ils expliquent sa forme :
 *
 * 1. **Elle n'était lue par personne.** `SKIN_KNOWLEDGE` était importé dans
 *    `AiRoutineAnalysis` et jamais consulté. Une base de connaissance morte ne
 *    trompe personne tant qu'elle reste invisible — elle devient un mensonge
 *    dès qu'on l'affiche. Elle est donc désormais branchée sur le résultat du
 *    diagnostic, et les références produit qu'elle cite sont vérifiées par un
 *    test contre le catalogue réel.
 *
 * 2. **Il manquait le profil acnéique**, alors que c'est le cas où la peau
 *    riche en mélanine paie le prix le plus durable : le bouton guérit en
 *    quelques jours, la marque sombre peut rester des mois. Traiter
 *    l'imperfection sans agresser compte plus que l'assécher vite.
 *
 * Règle de fond : ces textes ne sont pas des avis médicaux. Aucun diagnostic,
 * aucun traitement, aucune prescription — des règles de soin grand public,
 * écrites pour des peaux que la littérature cosmétique a longtemps ignorées.
 */

export interface SkinTypeInfo {
  type: string;
  name: string;
  description: string;
  melaninKeyPoints: string[];
  recommendedIngredients: string[];
  ingredientsToAvoid: string[];
  keyProducts: string[];
}

export type SkinKnowledgeProfile = SkinTypeInfo & { key: string };

export const SKIN_KNOWLEDGE: Record<string, SkinTypeInfo> = {
  'melanin-pigmentation': {
    type: 'Peau Mélaninée - Taches & Teint Irrégulier',
    name: 'Peau Riche en Mélanine avec Taches Post-Imperfections',
    description: 'La peau riche en mélanine réagit à l’inflammation (boutons, frottements, soleil) par une surproduction de pigment. Une routine douce sans agression est primordiale.',
    melaninKeyPoints: [
      'Toujours porter un écran solaire SPF 30 ou 50 à fini 100% invisible (sans traces blanches ou grisâtres)',
      'Éviter de percer les boutons pour prévenir l’hyperpigmentation post-inflammatoire',
      'Privilégier la niacinamide, la vitamine C stabilisée et l’acide azélaïque à faible dose',
      'Hydrater en profondeur car une peau déshydratée sécrète plus de sébum et marque plus vite'
    ],
    recommendedIngredients: ['Niacinamide (5%)', 'Vitamine C', 'Acide Hyaluronique', 'Céramides', 'Filtres SPF invisibles'],
    ingredientsToAvoid: ['Alcool dénaturé en haut de liste', 'Gommages physiques à gros grains abrasifs', 'Parfums synthétiques forts'],
    keyProducts: ['SPF 50 invisible fluide', 'Sérum niacinamide 5%', 'Nettoyant doux sans parfum']
  },
  'melanin-oily': {
    type: 'Peau Mélaninée Grasse',
    name: 'Peau Riche en Mélanine Grasse : Ni Décaper, Ni Sauter l’Hydratation',
    description: 'La peau grasse a une réputation de « peau à décaper » — et c’est précisément l’erreur qui la fait produire encore plus. Le sébum en excès masque souvent une peau déshydratée sous la couche, qui compense en sécrétant davantage et marque plus vite : l’objectif n’est pas d’assécher, c’est d’équilibrer.',
    melaninKeyPoints: [
      'Nettoyez sans décaper : un nettoyage doux, deux fois par jour maximum — le décapi provoque un sébum de compensation, et l’irritation laisse des taches sur peau mélaninée.',
      'Ne sautez JAMAIS l’hydratation, même grasse : une texture légère (gel) suffit ; la déshydratation est ce qui fait sécréter plus et marquer plus vite.',
      'Les points noirs, c’est de l’oxydation pas de la saleté : du salicylique à 2 % (0,5–1 % si peau réactive) en usage cadencé, pas d’extraction à la main — chaque micro-écorchure prépare une tache.',
      'L’écran 30+ en fini invisible tous les jours : la version fluide se porte aussi bien sur peau grasse que sur peau sèche — et c’est l’étape que les peaux grasses sautent le plus.',
    ],
    recommendedIngredients: ['Nettoyant doux sans parfum', 'Gel hydratant léger (acide hyaluronique)', 'Salicylique 2 % en usage cadencé', 'SPF 30+ fini invisible fluide'],
    ingredientsToAvoid: ['Les savons et gommages « décapi » à effet mat immédiat', 'L’alcool dénaturé haut en liste (assèche, puis compense)', 'Couper l’hydratation « parce que c’est gras »'],
    keyProducts: ['Nettoyant doux sans parfum', 'Gel acide hyaluronique', 'Exfoliant AHA/BHA 1×/sem', 'SPF 50 invisible fluide'],
  },
  'melanin-dry': {
    type: 'Peau Mélaninée Sèche / Déshydratée',
    name: 'Peau Sèche à Teint Terne',
    description: 'Sensible aux variations de climat (eau calcaire européenne, vent froid d’hiver). La peau peut paraître cendrée si elle manque de lipides ou d’eau.',
    melaninKeyPoints: [
      'Appliquer la crème sur peau encore légèrement humide après le nettoyage',
      'Utiliser une eau thermale ou une brume apaisante avant le sérum',
      'Ne pas sauter le SPF même en hiver'
    ],
    recommendedIngredients: ['Beurre de karité pur', 'Glycérine', 'Squalane végétal', 'Céramides NP'],
    ingredientsToAvoid: ['Nettoyants sulfatés asséchants', 'Savons décapants'],
    keyProducts: ['Crème céramides + squalane', 'Gel acide hyaluronique', 'Nettoyant doux sans parfum']
  },
  'melanin-acne': {
    type: 'Peau Mélaninée à Imperfections',
    name: 'Peau à Imperfections — sans laisser de marques',
    description: 'Sur peau riche en mélanine, le bouton disparaît en quelques jours ; la marque sombre qu’il laisse, elle, peut rester des mois. L’objectif n’est donc pas d’assécher vite, c’est de calmer sans abîmer la barrière.',
    melaninKeyPoints: [
      'Ne jamais percer ni triturer : c’est la première cause de marque sombre durable',
      'SPF invisible chaque matin, même par temps gris : les marques post-bouton foncent aux UV',
      'Un seul actif exfoliant à la fois — BHA et rétinol ne s’additionnent pas, ils s’irritent',
      'Assécher n’est pas nettoyer : une barrière abîmée s’enflamme davantage, et marque plus',
      'Laisser huit à douze semaines à un actif avant d’en changer ; les marques mettent des mois à s’estomper'
    ],
    recommendedIngredients: ['Acide azélaïque', 'Niacinamide (5%)', 'BHA (acide salicylique) en usage hebdomadaire', 'Céramides', 'Filtres SPF invisibles'],
    ingredientsToAvoid: ['Gommages à gros grains', 'Alcool dénaturé en haut de liste', 'Huiles essentielles appliquées sur un bouton', 'Superposition BHA + rétinol le même soir'],
    keyProducts: ['Nettoyant doux sans parfum', 'Sérum niacinamide 5%', 'Exfoliant AHA/BHA 1×/sem', 'SPF 50 invisible fluide']
  }
};

/** Réponses du diagnostic utilisées pour choisir un profil. */
export type SkinKnowledgeAnswers = {
  acne?: string;
  skinConcerns?: string[];
  skinObjectives?: string[];
  skinType?: string;
  hydrationLevel?: string;
  hyperpigmentationTendency?: string;
};

const IGNORED = ['inconnu', 'inconnue'];
const ACTIVE_ACNE = ['occasionnelle', 'reguliere'];
const DRY_SKIN_TYPES = ['seche', 'tres_seche'];
const MARK_PRONE = ['frequente', 'occasionnelle'];

function profile(key: string): SkinKnowledgeProfile | null {
  const info = SKIN_KNOWLEDGE[key];
  return info ? { key, ...info } : null;
}

/**
 * Choisit le profil de connaissance à afficher, à partir des réponses.
 *
 * L'ordre n'est pas neutre : l'acné passe avant les taches, parce qu'une
 * imperfection mal traitée est précisément ce qui produit les taches sur une
 * peau mélaninée. Traiter la conséquence en laissant la cause en place
 * condamne la routine à courir après ses propres marques.
 *
 * Renvoie `null` quand aucune réponse ne pointe vers un profil. Un profil
 * approximatif affiché « par défaut » serait une invention.
 */
export function pickSkinKnowledgeProfile(answers: SkinKnowledgeAnswers | null | undefined): SkinKnowledgeProfile | null {
  if (!answers) return null;

  const concerns = (answers.skinConcerns || []).filter(value => value && !IGNORED.includes(value));
  const objectives = (answers.skinObjectives || []).filter(value => value && !IGNORED.includes(value));
  const acne = answers.acne && !IGNORED.includes(answers.acne) ? answers.acne : undefined;

  if ((acne && ACTIVE_ACNE.includes(acne)) || concerns.includes('imperfections') || objectives.includes('reduire_imperfections')) {
    return profile('melanin-acne');
  }
  if (
    concerns.includes('taches')
    || concerns.includes('teint_non_uniforme')
    || objectives.includes('attenuer_taches')
    || (answers.hyperpigmentationTendency && MARK_PRONE.includes(answers.hyperpigmentationTendency))
  ) {
    return profile('melanin-pigmentation');
  }
  if (answers.skinType === 'grasse') {
    return profile('melanin-oily');
  }
  if (
    (answers.skinType && DRY_SKIN_TYPES.includes(answers.skinType))
    || answers.hydrationLevel === 'deshydratee'
    || concerns.includes('secheresse')
    || concerns.includes('deshydratation')
  ) {
    return profile('melanin-dry');
  }
  return null;
}
