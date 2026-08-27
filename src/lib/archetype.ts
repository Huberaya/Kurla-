/**
 * KURLA INTELLIGENCE — Archétypes et cohortes k-anonymes.
 *
 * « Les personnes ayant un profil similaire au vôtre… » n'est licite et utile
 * que si la cohorte est assez grande pour qu'aucun individu ne soit
 * identifiable. Sous le seuil k, KURLA ne publie rien : elle dit qu'elle ne
 * sait pas encore, plutôt que de produire une statistique sur trois personnes.
 */

import { BeautyProfile, UNKNOWN } from './beautyProfile';

export const DEFAULT_K_ANONYMITY_THRESHOLD = 30;

export type TextureBand = 'wavy' | 'curly' | 'coily' | 'kinky' | 'unclassified';
export type PorosityBand = 'low' | 'medium' | 'high' | 'unclassified';
export type DensityBand = 'low' | 'medium' | 'high' | 'unclassified';
export type ToneBand = 'light' | 'medium' | 'deep' | 'unclassified';
export type SensitivityBand = 'resilient' | 'reactive' | 'unclassified';
export type ClimateBand = 'dry' | 'temperate' | 'humid' | 'unclassified';

export interface ArchetypeKey {
  hairTextureBand: TextureBand;
  porosityBand: PorosityBand;
  densityBand: DensityBand;
  toneDepthBand: ToneBand;
  sensitivityBand: SensitivityBand;
  climateBand: ClimateBand;
}

export interface Archetype extends ArchetypeKey {
  id: string;
  labelFr: string;
  memberCount: number;
  kAnonymityThreshold: number;
  isPublishable: boolean;
}

export interface ArchetypeDerivation {
  key: ArchetypeKey;
  id: string;
  labelFr: string;
  /** Nombre de dimensions réellement renseignées sur six. */
  knownDimensions: number;
  /** 0 à 1. Un archétype dérivé de deux champs n'a pas la même valeur qu'un autre dérivé de six. */
  confidence: number;
  missingLabels: string[];
}

function known(value: unknown): boolean {
  return typeof value === 'string' && value !== '' && value !== UNKNOWN;
}

/**
 * Regroupement par bandes, et non par valeurs exactes. Regrouper par valeur
 * exacte produirait des milliers de cellules vides ; regrouper trop largement
 * produirait des moyennes sans signification. Trois à quatre modalités par
 * dimension est le compromis retenu.
 */
export function deriveTextureBand(curlPattern: string, texturePatterns: string[]): TextureBand {
  if (known(curlPattern)) {
    const value = curlPattern.toLowerCase();
    if (value.startsWith('2') || value.includes('ondule') || value.includes('wavy')) return 'wavy';
    if (value.startsWith('3a') || value.startsWith('3b') || value.includes('boucle_large')) return 'curly';
    if (value.startsWith('3c') || value.startsWith('4a') || value.includes('frisure_serree')) return 'coily';
    if (value.startsWith('4b') || value.startsWith('4c') || value.includes('crepu')) return 'kinky';
  }
  const patterns = texturePatterns.map(pattern => pattern.toLowerCase()).join(' ');
  if (patterns.includes('4c') || patterns.includes('4b') || patterns.includes('crepu')) return 'kinky';
  if (patterns.includes('3c') || patterns.includes('4a') || patterns.includes('frise')) return 'coily';
  if (patterns.includes('3a') || patterns.includes('3b') || patterns.includes('boucle')) return 'curly';
  if (patterns.includes('2a') || patterns.includes('2b') || patterns.includes('2c') || patterns.includes('ondule')) return 'wavy';
  return 'unclassified';
}

export function derivePorosityBand(porosity: string): PorosityBand {
  const value = porosity.toLowerCase();
  if (value.includes('faible') || value.includes('low')) return 'low';
  if (value.includes('moyenne') || value.includes('medium')) return 'medium';
  if (value.includes('forte') || value.includes('haute') || value.includes('high')) return 'high';
  return 'unclassified';
}

export function deriveDensityBand(density: string): DensityBand {
  const value = density.toLowerCase();
  if (value.includes('faible') || value.includes('clairseme') || value.includes('low')) return 'low';
  if (value.includes('moyenne') || value.includes('medium')) return 'medium';
  if (value.includes('forte') || value.includes('dense') || value.includes('high')) return 'high';
  return 'unclassified';
}

export function deriveToneBand(toneDepth: string): ToneBand {
  const value = toneDepth.toLowerCase();
  if (!known(toneDepth)) return 'unclassified';
  if (value.includes('clair') || value.includes('light')) return 'light';
  if (value.includes('moyen') || value.includes('medium')) return 'medium';
  if (value.includes('fonce') || value.includes('profond') || value.includes('deep')) return 'deep';
  return 'unclassified';
}

export function deriveSensitivityBand(sensitivity: string, reactionHistory: string): SensitivityBand {
  const value = `${sensitivity} ${reactionHistory}`.toLowerCase();
  if (value.includes('reactive') || value.includes('sensible') || value.includes('allergi') || value.includes('reaction')) return 'reactive';
  if (value.includes('resiliente') || value.includes('tolerante') || value.includes('peu sensible')) return 'resilient';
  return 'unclassified';
}

export function deriveClimateBand(climate: string, humidity: string): ClimateBand {
  const value = `${climate} ${humidity}`.toLowerCase();
  if (value.includes('sec') || value.includes('aride') || value.includes('dry')) return 'dry';
  if (value.includes('humide') || value.includes('tropical') || value.includes('humid')) return 'humid';
  if (value.includes('tempere') || value.includes('temperate')) return 'temperate';
  return 'unclassified';
}

export function archetypeIdOf(key: ArchetypeKey): string {
  return [
    key.hairTextureBand,
    key.porosityBand,
    key.densityBand,
    key.toneDepthBand,
    key.sensitivityBand,
    key.climateBand
  ].join('__');
}

const TEXTURE_LABELS: Record<TextureBand, string> = {
  wavy: 'ondulés',
  curly: 'bouclés',
  coily: 'frisés serrés',
  kinky: 'crépus',
  unclassified: 'texture non précisée'
};

const POROSITY_LABELS: Record<PorosityBand, string> = {
  low: 'porosité faible',
  medium: 'porosité moyenne',
  high: 'porosité forte',
  unclassified: 'porosité non précisée'
};

const TONE_LABELS: Record<ToneBand, string> = {
  light: 'carnation claire',
  medium: 'carnation moyenne',
  deep: 'carnation profonde',
  unclassified: 'carnation non précisée'
};

export function archetypeLabel(key: ArchetypeKey): string {
  const parts = [
    `Cheveux ${TEXTURE_LABELS[key.hairTextureBand]}`,
    POROSITY_LABELS[key.porosityBand],
    TONE_LABELS[key.toneDepthBand]
  ];
  return parts.join(' · ');
}

/**
 * Dérive l'archétype d'un profil. Ne complète jamais un champ inconnu : une
 * dimension absente reste `unclassified`, et la confiance baisse en proportion.
 */
export function deriveArchetype(profile: BeautyProfile | undefined): ArchetypeDerivation {
  const hair = profile?.hair;
  const skin = profile?.skin;
  const environment = profile?.environment;

  const key: ArchetypeKey = {
    hairTextureBand: deriveTextureBand(hair?.curlPattern || '', hair?.texturePatterns || []),
    porosityBand: derivePorosityBand(hair?.porosity || ''),
    densityBand: deriveDensityBand(hair?.density || ''),
    toneDepthBand: deriveToneBand(skin?.toneDepth || ''),
    sensitivityBand: deriveSensitivityBand(skin?.sensitivity || '', skin?.reactionHistory || ''),
    climateBand: deriveClimateBand(environment?.climate || '', environment?.humidity || '')
  };

  const missingLabels: string[] = [];
  if (key.hairTextureBand === 'unclassified') missingLabels.push('motif de boucle / texture');
  if (key.porosityBand === 'unclassified') missingLabels.push('porosité');
  if (key.densityBand === 'unclassified') missingLabels.push('densité');
  if (key.toneDepthBand === 'unclassified') missingLabels.push('profondeur de carnation');
  if (key.sensitivityBand === 'unclassified') missingLabels.push('sensibilité cutanée');
  if (key.climateBand === 'unclassified') missingLabels.push('climat');

  const knownDimensions = 6 - missingLabels.length;

  return {
    key,
    id: archetypeIdOf(key),
    labelFr: archetypeLabel(key),
    knownDimensions,
    confidence: Number((knownDimensions / 6).toFixed(2)),
    missingLabels
  };
}

export interface CohortStatistic {
  archetypeId: string;
  labelFr: string;
  memberCount: number;
  kAnonymityThreshold: number;
  publishable: boolean;
  /** Message affiché quand la cohorte est trop petite : on dit qu'on ne sait pas. */
  suppressionReason?: string;
}

/**
 * Garde-fou de k-anonymité. Toute statistique communautaire passe par ici.
 */
export function evaluateCohort(
  archetypeId: string,
  labelFr: string,
  memberCount: number,
  kAnonymityThreshold = DEFAULT_K_ANONYMITY_THRESHOLD
): CohortStatistic {
  const publishable = memberCount >= kAnonymityThreshold;
  return {
    archetypeId,
    labelFr,
    memberCount,
    kAnonymityThreshold,
    publishable,
    suppressionReason: publishable
      ? undefined
      : `Cohorte de ${memberCount} profil${memberCount > 1 ? 's' : ''}, sous le seuil de ${kAnonymityThreshold} : KURLA ne publie pas de statistique qui pourrait rendre une personne identifiable.`
  };
}

/**
 * Repli progressif : si la cohorte complète est trop petite, on relâche les
 * dimensions les moins déterminantes (climat, puis densité, puis sensibilité)
 * jusqu'à obtenir une cohorte publiable — ou jusqu'à renoncer.
 *
 * Relâcher une dimension n'est pas tricher : c'est déclarer explicitement que
 * la comparaison porte sur un périmètre plus large.
 */
export function fallbackCohortDimensions(): (keyof ArchetypeKey)[] {
  return ['climateBand', 'densityBand', 'sensitivityBand', 'toneDepthBand', 'porosityBand'];
}

export function relaxArchetypeKey(key: ArchetypeKey, dimension: keyof ArchetypeKey): ArchetypeKey {
  const relaxed = { ...key };
  const value = relaxed[dimension];
  if (typeof value === 'string' && value !== 'unclassified') {
    (relaxed as Record<string, string>)[dimension] = 'unclassified';
  }
  return relaxed;
}

export function specificityOf(key: ArchetypeKey): number {
  return Object.values(key).filter(value => value !== 'unclassified').length;
}
