export const UNKNOWN = 'inconnu';

export type HairZoneKey = 'scalp' | 'lengths' | 'ends';

export interface HairZoneProfile {
  dryness: string;
  fiberCondition: string;
  breakage: string;
  concerns: string[];
}

export interface HairBeautyProfile {
  texturePatterns: string[];
  curlPattern: string;
  porosity: string;
  density: string;
  strandThickness: string;
  length: string;
  fiberCondition: string;
  dryness: string;
  breakage: string;
  elasticity: string;
  scalpCondition: string;
  scalpConcerns: string[];
  chemicalTreatments: string[];
  coloring: string;
  protectiveStyles: string[];
  washFrequency: string;
  stylingHabits: string[];
  availableTime: string;
  budget: string;
  zones: Record<HairZoneKey, HairZoneProfile>;
}

export interface SkinBeautyProfile {
  toneDepth: string;
  undertone: string;
  sensitivity: string;
  hyperpigmentationTendency: string;
  acne: string;
  postInflammatoryMarks: string;
  hydration: string;
  activeTolerance: string;
  sunExposure: string;
  spfUsage: string;
  concernZones: string[];
  texturePreference: string;
  finishPreference: string;
  reactionHistory: string;
}

export interface BeautyEnvironmentProfile {
  climate: string;
  humidity: string;
  waterQuality: string;
  season: string;
}

export interface BeautyProfile {
  version: 1;
  hair: HairBeautyProfile;
  skin: SkinBeautyProfile;
  environment: BeautyEnvironmentProfile;
  photoConsent: boolean;
}

export interface ProfileConfidence {
  overall: number;
  hair: number;
  skin: number;
  environment: number;
  knownFields: number;
  totalFields: number;
  missingLabels: string[];
}

export interface BeautyProfileRecord {
  userId: string;
  profile: BeautyProfile;
  confidence: ProfileConfidence;
  createdAt: string;
  updatedAt: string;
}

export interface BeautyProfileHistoryEntry {
  id: string;
  profile: BeautyProfile;
  confidence: ProfileConfidence;
  source: string;
  createdAt: string;
}

export interface BeautyProfilePhoto {
  id: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  consentAt: string;
  createdAt: string;
}

export const HAIR_TEXTURE_OPTIONS = [
  { value: '2A', label: '2A · ondulations légères' },
  { value: '2B-2C', label: '2B–2C · ondulations marquées' },
  { value: '3A-3B', label: '3A–3B · boucles larges' },
  { value: '3C', label: '3C · boucles serrées' },
  { value: '4A', label: '4A · spirales serrées' },
  { value: '4B', label: '4B · motif en Z' },
  { value: '4C', label: '4C · frisure très serrée' },
  { value: 'locks', label: 'Locks / microlocks' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const CURL_PATTERN_OPTIONS = [
  { value: 'ondulations', label: 'Ondulations' },
  { value: 'boucles_larges', label: 'Boucles larges' },
  { value: 'boucles_serrees', label: 'Boucles serrées' },
  { value: 'spirales', label: 'Spirales visibles' },
  { value: 'zigzag', label: 'Motif zigzag / en Z' },
  { value: 'frisure_serree', label: 'Frisure très serrée, peu définie' },
  { value: 'mixte', label: 'Plusieurs motifs sur la tête' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const POROSITY_OPTIONS = [
  { value: 'faible', label: 'Faible · met du temps à s’imbiber' },
  { value: 'moyenne', label: 'Moyenne · s’imbibe progressivement' },
  { value: 'forte', label: 'Forte · absorbe et sèche vite' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const DENSITY_OPTIONS = [
  { value: 'faible', label: 'Faible · cuir chevelu visible' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'forte', label: 'Forte · beaucoup de volume' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const THICKNESS_OPTIONS = [
  { value: 'fine', label: 'Fin' },
  { value: 'moyenne', label: 'Moyen' },
  { value: 'epaisse', label: 'Épais' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const LENGTH_OPTIONS = [
  { value: 'tres_court', label: 'Très court' },
  { value: 'court', label: 'Court' },
  { value: 'mi_long', label: 'Mi-long' },
  { value: 'long', label: 'Long' },
  { value: 'tres_long', label: 'Très long' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const CONDITION_OPTIONS = [
  { value: 'fragile', label: 'Fragile / sensibilisée' },
  { value: 'correct', label: 'État correct' },
  { value: 'saine', label: 'Saine et résistante' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const DRYNESS_OPTIONS = [
  { value: 'faible', label: 'Peu sèche' },
  { value: 'moyenne', label: 'Modérément sèche' },
  { value: 'forte', label: 'Très sèche' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const BREAKAGE_OPTIONS = [
  { value: 'aucune', label: 'Peu ou pas de casse' },
  { value: 'occasionnelle', label: 'Casse occasionnelle' },
  { value: 'frequente', label: 'Casse fréquente' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const ELASTICITY_OPTIONS = [
  { value: 'faible', label: 'Le cheveu casse ou ne s’étire presque pas' },
  { value: 'equilibree', label: 'S’étire puis revient' },
  { value: 'forte', label: 'Très extensible / mou' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SCALP_OPTIONS = [
  { value: 'sec', label: 'Sec' },
  { value: 'normal', label: 'Équilibré' },
  { value: 'gras', label: 'À tendance grasse' },
  { value: 'sensible', label: 'Sensible / réactif' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SCALP_CONCERN_OPTIONS = [
  { value: 'pellicules', label: 'Pellicules' },
  { value: 'demangeaisons', label: 'Démangeaisons' },
  { value: 'sensibilite', label: 'Sensibilité / tiraillements' },
  { value: 'sebum', label: 'Excès de sébum' },
  { value: 'aucun', label: 'Aucune de ces situations' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const TREATMENT_OPTIONS = [
  { value: 'aucun', label: 'Aucun traitement chimique' },
  { value: 'defrisage', label: 'Défrisage / relaxer' },
  { value: 'lissage', label: 'Lissage' },
  { value: 'permanente', label: 'Permanente' },
  { value: UNKNOWN, label: 'Je ne sais pas / je préfère ne pas répondre' }
];

export const COLORING_OPTIONS = [
  { value: 'aucune', label: 'Pas de coloration' },
  { value: 'semi_permanente', label: 'Coloration semi-permanente' },
  { value: 'permanente', label: 'Coloration permanente' },
  { value: 'decoloration', label: 'Décoloration / mèches' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const PROTECTIVE_STYLE_OPTIONS = [
  { value: 'aucun', label: 'Aucun actuellement' },
  { value: 'tresses', label: 'Tresses / braids' },
  { value: 'twists', label: 'Twists' },
  { value: 'locks', label: 'Locks / microlocks' },
  { value: 'perruque', label: 'Perruque / lace' },
  { value: 'vanilles', label: 'Vanilles' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const WASH_FREQUENCY_OPTIONS = [
  { value: 'plusieurs_fois_semaine', label: 'Plusieurs fois par semaine' },
  { value: 'une_fois_semaine', label: 'Environ une fois par semaine' },
  { value: 'tous_les_10_14_jours', label: 'Tous les 10 à 14 jours' },
  { value: 'moins_frequent', label: 'Moins souvent / sous protective style' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const STYLING_HABIT_OPTIONS = [
  { value: 'chaleur', label: 'Chaleur directe' },
  { value: 'demelage', label: 'Démêlage fréquent' },
  { value: 'coiffures_serrees', label: 'Coiffures serrées' },
  { value: 'hydratation_reguliere', label: 'Ré-hydratation régulière' },
  { value: 'wash_and_go', label: 'Wash and go / définition' },
  { value: 'aucune', label: 'Aucune habitude particulière' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const TIME_OPTIONS = [
  { value: 'moins_15_min', label: 'Moins de 15 min par session' },
  { value: '15_30_min', label: '15 à 30 min' },
  { value: '30_60_min', label: '30 à 60 min' },
  { value: 'plus_60_min', label: 'Plus d’une heure' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const BUDGET_OPTIONS = [
  { value: 'moins_40', label: 'Moins de 40 € par mois' },
  { value: '40_70', label: '40 à 70 € par mois' },
  { value: '70_100', label: '70 à 100 € par mois' },
  { value: 'premium', label: 'Plus de 100 € par mois' },
  { value: UNKNOWN, label: 'Je préfère ne pas préciser' }
];

export const TONE_OPTIONS = [
  { value: 'clair', label: 'Clair' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'fonce', label: 'Foncé' },
  { value: 'tres_fonce', label: 'Très foncé' },
  { value: UNKNOWN, label: 'Je ne sais pas / je préfère ne pas classer' }
];

export const UNDERTONE_OPTIONS = [
  { value: 'chaud', label: 'Chaud · doré / jaune' },
  { value: 'froid', label: 'Froid · rosé / rouge' },
  { value: 'neutre', label: 'Neutre' },
  { value: 'olive', label: 'Olive' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SENSITIVITY_OPTIONS = [
  { value: 'faible', label: 'Peu sensible' },
  { value: 'moyenne', label: 'Modérément sensible' },
  { value: 'elevee', label: 'Très sensible / réactive' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const HYPERPIGMENTATION_OPTIONS = [
  { value: 'rare', label: 'Les marques apparaissent rarement' },
  { value: 'occasionnelle', label: 'Parfois après une inflammation' },
  { value: 'frequente', label: 'Les marques apparaissent facilement' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const ACNE_OPTIONS = [
  { value: 'aucune', label: 'Pas d’imperfections actuellement' },
  { value: 'occasionnelle', label: 'Imperfections occasionnelles' },
  { value: 'reguliere', label: 'Imperfections régulières' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const HYDRATION_OPTIONS = [
  { value: 'confortable', label: 'Confortable' },
  { value: 'deshydratee', label: 'Déshydratée / tiraille' },
  { value: 'seche', label: 'Sèche' },
  { value: 'brillante', label: 'Brillante / excès de sébum' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const ACTIVE_TOLERANCE_OPTIONS = [
  { value: 'faible', label: 'Je réagis facilement aux actifs' },
  { value: 'moyenne', label: 'Je tolère les actifs doux' },
  { value: 'elevee', label: 'Je tolère la plupart des actifs' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SUN_EXPOSURE_OPTIONS = [
  { value: 'faible', label: 'Faible / surtout en intérieur' },
  { value: 'moderee', label: 'Modérée' },
  { value: 'forte', label: 'Forte / activités extérieures' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SPF_OPTIONS = [
  { value: 'quotidien', label: 'Tous les jours' },
  { value: 'parfois', label: 'Parfois / selon la saison' },
  { value: 'jamais', label: 'Jamais pour le moment' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SKIN_ZONE_OPTIONS = [
  { value: 'visage_entier', label: 'Visage entier' },
  { value: 'front', label: 'Front' },
  { value: 'joues', label: 'Joues' },
  { value: 'menton', label: 'Menton / mâchoire' },
  { value: 'cou', label: 'Cou / décolleté' },
  { value: 'corps', label: 'Corps' },
  { value: UNKNOWN, label: 'Je ne sais pas' }
];

export const TEXTURE_OPTIONS = [
  { value: 'gel', label: 'Gel léger' },
  { value: 'lotion', label: 'Lotion fluide' },
  { value: 'creme', label: 'Crème' },
  { value: 'baume', label: 'Baume riche' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const FINISH_OPTIONS = [
  { value: 'mat', label: 'Mat' },
  { value: 'naturel', label: 'Naturel' },
  { value: 'glowy', label: 'Glowy / lumineux' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const CLIMATE_OPTIONS = [
  { value: 'tempere', label: 'Tempéré' },
  { value: 'froid_sec', label: 'Froid et sec' },
  { value: 'chaud_sec', label: 'Chaud et sec' },
  { value: 'chaud_humide', label: 'Chaud et humide' },
  { value: 'variable', label: 'Variable selon les saisons' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const HUMIDITY_OPTIONS = [
  { value: 'faible', label: 'Air plutôt sec' },
  { value: 'moyenne', label: 'Humidité variable' },
  { value: 'forte', label: 'Air très humide' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const WATER_OPTIONS = [
  { value: 'douce', label: 'Eau douce' },
  { value: 'calcaire', label: 'Eau calcaire / dure' },
  { value: 'filtre', label: 'Eau filtrée ou adoucie' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

export const SEASON_OPTIONS = [
  { value: 'printemps', label: 'Printemps' },
  { value: 'ete', label: 'Été' },
  { value: 'automne', label: 'Automne' },
  { value: 'hiver', label: 'Hiver' },
  { value: 'toute_annee', label: 'Toute l’année / je veux adapter' },
  { value: UNKNOWN, label: 'Je ne sais pas encore' }
];

const emptyZone = (): HairZoneProfile => ({
  dryness: UNKNOWN,
  fiberCondition: UNKNOWN,
  breakage: UNKNOWN,
  concerns: [UNKNOWN]
});

export function createEmptyBeautyProfile(): BeautyProfile {
  return {
    version: 1,
    hair: {
      texturePatterns: [UNKNOWN],
      curlPattern: UNKNOWN,
      porosity: UNKNOWN,
      density: UNKNOWN,
      strandThickness: UNKNOWN,
      length: UNKNOWN,
      fiberCondition: UNKNOWN,
      dryness: UNKNOWN,
      breakage: UNKNOWN,
      elasticity: UNKNOWN,
      scalpCondition: UNKNOWN,
      scalpConcerns: [UNKNOWN],
      chemicalTreatments: [UNKNOWN],
      coloring: UNKNOWN,
      protectiveStyles: [UNKNOWN],
      washFrequency: UNKNOWN,
      stylingHabits: [UNKNOWN],
      availableTime: UNKNOWN,
      budget: UNKNOWN,
      zones: { scalp: emptyZone(), lengths: emptyZone(), ends: emptyZone() }
    },
    skin: {
      toneDepth: UNKNOWN,
      undertone: UNKNOWN,
      sensitivity: UNKNOWN,
      hyperpigmentationTendency: UNKNOWN,
      acne: UNKNOWN,
      postInflammatoryMarks: UNKNOWN,
      hydration: UNKNOWN,
      activeTolerance: UNKNOWN,
      sunExposure: UNKNOWN,
      spfUsage: UNKNOWN,
      concernZones: [UNKNOWN],
      texturePreference: UNKNOWN,
      finishPreference: UNKNOWN,
      reactionHistory: ''
    },
    environment: {
      climate: UNKNOWN,
      humidity: UNKNOWN,
      waterQuality: UNKNOWN,
      season: UNKNOWN
    },
    photoConsent: false
  };
}

function safeString(value: unknown, fallback = UNKNOWN): string {
  return typeof value === 'string' && value.trim().length <= 300 ? value.trim() || fallback : fallback;
}

function safeArray(value: unknown, fallback: string[] = [UNKNOWN]): string[] {
  if (!Array.isArray(value)) return fallback;
  const values = value.filter(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 100).map(item => item.trim());
  return values.length > 0 ? Array.from(new Set(values)).slice(0, 20) : fallback;
}

function normalizeZone(value: unknown): HairZoneProfile {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    dryness: safeString(input.dryness),
    fiberCondition: safeString(input.fiberCondition),
    breakage: safeString(input.breakage),
    concerns: safeArray(input.concerns)
  };
}

export function normalizeBeautyProfile(input: unknown): BeautyProfile {
  const base = createEmptyBeautyProfile();
  const value = input && typeof input === 'object' ? input as Record<string, any> : {};
  const hair = value.hair && typeof value.hair === 'object' ? value.hair : {};
  const skin = value.skin && typeof value.skin === 'object' ? value.skin : {};
  const environment = value.environment && typeof value.environment === 'object' ? value.environment : {};
  const zones = hair.zones && typeof hair.zones === 'object' ? hair.zones : {};

  return {
    version: 1,
    hair: {
      texturePatterns: safeArray(hair.texturePatterns),
      curlPattern: safeString(hair.curlPattern),
      porosity: safeString(hair.porosity),
      density: safeString(hair.density),
      strandThickness: safeString(hair.strandThickness),
      length: safeString(hair.length),
      fiberCondition: safeString(hair.fiberCondition),
      dryness: safeString(hair.dryness),
      breakage: safeString(hair.breakage),
      elasticity: safeString(hair.elasticity),
      scalpCondition: safeString(hair.scalpCondition),
      scalpConcerns: safeArray(hair.scalpConcerns),
      chemicalTreatments: safeArray(hair.chemicalTreatments),
      coloring: safeString(hair.coloring),
      protectiveStyles: safeArray(hair.protectiveStyles),
      washFrequency: safeString(hair.washFrequency),
      stylingHabits: safeArray(hair.stylingHabits),
      availableTime: safeString(hair.availableTime),
      budget: safeString(hair.budget),
      zones: {
        scalp: normalizeZone(zones.scalp),
        lengths: normalizeZone(zones.lengths),
        ends: normalizeZone(zones.ends)
      }
    },
    skin: {
      toneDepth: safeString(skin.toneDepth),
      undertone: safeString(skin.undertone),
      sensitivity: safeString(skin.sensitivity),
      hyperpigmentationTendency: safeString(skin.hyperpigmentationTendency),
      acne: safeString(skin.acne),
      postInflammatoryMarks: safeString(skin.postInflammatoryMarks),
      hydration: safeString(skin.hydration),
      activeTolerance: safeString(skin.activeTolerance),
      sunExposure: safeString(skin.sunExposure),
      spfUsage: safeString(skin.spfUsage),
      concernZones: safeArray(skin.concernZones),
      texturePreference: safeString(skin.texturePreference),
      finishPreference: safeString(skin.finishPreference),
      reactionHistory: safeString(skin.reactionHistory, '')
    },
    environment: {
      climate: safeString(environment.climate),
      humidity: safeString(environment.humidity),
      waterQuality: safeString(environment.waterQuality),
      season: safeString(environment.season)
    },
    photoConsent: value.photoConsent === true
  };
}

function isKnown(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0 && !(value.length === 1 && value[0] === UNKNOWN);
  return typeof value === 'string' && value !== '' && value !== UNKNOWN;
}

const hairLabels: Array<[string, string]> = [
  ['hair.texturePatterns', 'motif(s) de texture'], ['hair.curlPattern', 'motif de boucle ou frisure'], ['hair.porosity', 'porosité'], ['hair.density', 'densité'], ['hair.strandThickness', 'épaisseur du cheveu'], ['hair.length', 'longueur'], ['hair.fiberCondition', 'état de la fibre'], ['hair.dryness', 'sécheresse'], ['hair.breakage', 'casse'], ['hair.elasticity', 'élasticité'], ['hair.scalpCondition', 'état du cuir chevelu'], ['hair.scalpConcerns', 'signes du cuir chevelu'], ['hair.chemicalTreatments', 'traitements chimiques'], ['hair.coloring', 'coloration'], ['hair.protectiveStyles', 'styles protecteurs'], ['hair.washFrequency', 'fréquence de lavage'], ['hair.stylingHabits', 'habitudes de coiffage'], ['hair.availableTime', 'temps disponible'], ['hair.budget', 'budget']
];
const skinLabels: Array<[string, string]> = [
  ['skin.toneDepth', 'profondeur de carnation'], ['skin.undertone', 'sous-ton'], ['skin.sensitivity', 'sensibilité cutanée'], ['skin.hyperpigmentationTendency', 'tendance à l’hyperpigmentation'], ['skin.acne', 'imperfections'], ['skin.postInflammatoryMarks', 'marques post-inflammatoires'], ['skin.hydration', 'hydratation'], ['skin.activeTolerance', 'tolérance aux actifs'], ['skin.sunExposure', 'exposition solaire'], ['skin.spfUsage', 'usage du SPF'], ['skin.concernZones', 'zones concernées'], ['skin.texturePreference', 'préférence de texture'], ['skin.finishPreference', 'préférence de fini']
];

function readPath(profile: BeautyProfile, path: string): unknown {
  return path.split('.').reduce((current: any, key) => current?.[key], profile as any);
}

export function calculateProfileConfidence(profileInput: BeautyProfile): ProfileConfidence {
  const profile = normalizeBeautyProfile(profileInput);
  const hairValues = hairLabels.map(([path]) => readPath(profile, path));
  const zoneValues = Object.values(profile.hair.zones).flatMap(zone => [zone.dryness, zone.fiberCondition, zone.breakage, zone.concerns]);
  const skinValues = skinLabels.map(([path]) => readPath(profile, path));
  const environmentValues = Object.values(profile.environment);
  const allValues = [...hairValues, ...zoneValues, ...skinValues, ...environmentValues];
  const knownFields = allValues.filter(isKnown).length;
  const totalFields = allValues.length;
  const knownHair = [...hairValues, ...zoneValues].filter(isKnown).length;
  const knownSkin = skinValues.filter(isKnown).length;
  const knownEnvironment = environmentValues.filter(isKnown).length;
  const missingLabels = [...hairLabels, ...skinLabels]
    .filter(([path]) => !isKnown(readPath(profile, path)))
    .map(([, label]) => label);

  return {
    overall: Math.round((knownFields / totalFields) * 100),
    hair: Math.round((knownHair / (hairValues.length + zoneValues.length)) * 100),
    skin: Math.round((knownSkin / skinValues.length) * 100),
    environment: Math.round((knownEnvironment / environmentValues.length) * 100),
    knownFields,
    totalFields,
    missingLabels
  };
}
