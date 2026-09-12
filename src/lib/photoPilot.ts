import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

import { normalizePhototype } from './skinPhototype';
import { GEMINI_MODEL, getGeminiClient } from '../server/ai/client';

export const PHOTO_PILOT_SCOPE = 'skin_cosmetic_observation' as const;
export const PHOTO_PILOT_PROMPT_VERSION = 'C8-photo-pilot-prompt-v1';
export const PHOTO_PILOT_RULES_VERSION = 'C8-photo-pilot-rules-v1';
export const PHOTO_PILOT_SCHEMA_VERSION = 'C8-photo-pilot-response-schema-v1';
export const PHOTO_PILOT_QUALITY_VERSION = 'C8-photo-quality-gate-v1';
export const PHOTO_PILOT_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_PILOT_MIN_WIDTH = 640;
export const PHOTO_PILOT_MIN_HEIGHT = 640;
export const PHOTO_PILOT_MAX_PER_PHOTO = 1;
export const PHOTO_PILOT_MAX_PER_MEMBER_30_DAYS = 3;

export const PHOTO_PILOT_PHOTOTYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
export const PHOTO_PILOT_PHOTOTYPE_TO_FITZPATRICK: Record<typeof PHOTO_PILOT_PHOTOTYPES[number], 1 | 2 | 3 | 4 | 5 | 6> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
export type PhotoPilotPhototype = typeof PHOTO_PILOT_PHOTOTYPES[number];

export const PHOTO_PILOT_LIGHTING = ['daylight_even', 'indoor_even'] as const;
export type PhotoPilotLighting = typeof PHOTO_PILOT_LIGHTING[number];

export const PHOTO_PILOT_OBSERVATION_CODES = [
  'visible_texture',
  'visible_dryness',
  'visible_redness',
  'visible_pigmentation_variation',
  'visible_shine',
  'not_assessable'
] as const;
export type PhotoPilotObservationCode = typeof PHOTO_PILOT_OBSERVATION_CODES[number];

export interface PhotoPilotMetadata {
  phototype: PhotoPilotPhototype;
  lighting: PhotoPilotLighting;
}

export interface PhotoQualityAssessment {
  accepted: boolean;
  code: 'accepted' | 'unsupported_format' | 'too_small' | 'too_large' | 'invalid_dimensions' | 'too_dark' | 'too_bright' | 'low_detail' | 'decode_failed';
  message: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width?: number;
  height?: number;
  bytes: number;
  metrics?: {
    meanLuminance: number;
    luminanceSpread: number;
    clippedLowRatio: number;
    clippedHighRatio: number;
    edgeEnergy: number;
    focusEnergy: number;
  };
}

export interface PhotoPilotObservation {
  code: PhotoPilotObservationCode;
  level: 'not_assessed' | 'low' | 'moderate' | 'high';
  note: string;
}

export interface PhotoPilotOutput {
  scope: typeof PHOTO_PILOT_SCOPE;
  observations: PhotoPilotObservation[];
  limitations: string[];
  noDiagnosis: true;
  noPhototypeInference: true;
  noIdentityInference: true;
  safetyAdvice: 'En cas de douleur, d’évolution rapide ou d’inquiétude, demandez l’avis d’un professionnel de santé.';
  disclosure: 'AI générative utilisée comme aide cosmétique expérimentale, sans diagnostic.';
}

export interface PhotoPilotProvenance {
  scope: typeof PHOTO_PILOT_SCOPE;
  provider: 'google_gemini';
  model: string;
  promptVersion: string;
  rulesVersion: string;
  responseSchemaVersion: string;
  qualityGateVersion: string;
  inputSha256: string;
  declaredPhototype: PhotoPilotPhototype;
  declaredLighting: PhotoPilotLighting;
  phototypeSource: 'member_declared';
  lightingSource: 'member_declared';
  independentValidation: {
    status: 'pilot_stratified_not_validated';
    protocol: 'C8-photo-pilot-validation-v1';
    requiredStrata: readonly string[];
  };
}

export interface PhotoPilotRunResult {
  output: PhotoPilotOutput;
  model: string;
  provider: 'google_gemini';
}

export const PHOTO_PILOT_REQUIRED_STRATA = PHOTO_PILOT_PHOTOTYPES.flatMap(phototype => PHOTO_PILOT_LIGHTING.map(lighting => `${phototype}:${lighting}`));
const MEDICAL_WORDS = /diagnos|patholog|maladie|ecz[eé]ma|m[eé]lanome|cancer|infection|acn[eé] s[eé]v[eè]re|rosac[eé]e|dermat/i;

function mimeSupported(mime: string): mime is PhotoQualityAssessment['mimeType'] {
  return mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
}

function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30 || new TextDecoder().decode(bytes.subarray(0, 4)) !== 'RIFF' || new TextDecoder().decode(bytes.subarray(8, 12)) !== 'WEBP') return null;
  const type = new TextDecoder().decode(bytes.subarray(12, 16));
  if (type === 'VP8X' && bytes.length >= 30) {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  return null;
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) + bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && segmentLength >= 7) return { height: (bytes[offset + 3] << 8) + bytes[offset + 4], width: (bytes[offset + 5] << 8) + bytes[offset + 6] };
    offset += segmentLength;
  }
  return null;
}

function dimensions(bytes: Uint8Array, mime: PhotoQualityAssessment['mimeType']): { width: number; height: number } | null {
  if (mime === 'image/png') return readPngDimensions(bytes);
  if (mime === 'image/jpeg') return readJpegDimensions(bytes);
  return readWebpDimensions(bytes);
}

function luminanceMetrics(rgba: Uint8Array, width: number, height: number) {
  const samples: number[] = [];
  const grid: number[][] = [];
  const columns = Math.min(48, width);
  const rows = Math.min(48, height);
  for (let row = 0; row < rows; row += 1) {
    const y = Math.floor((row + 0.5) * height / rows);
    const gridRow: number[] = [];
    for (let column = 0; column < columns; column += 1) {
      const x = Math.floor((column + 0.5) * width / columns);
      const index = (y * width + x) * 4;
      const alpha = rgba[index + 3] ?? 255;
      const value = alpha < 16 ? NaN : 0.2126 * rgba[index] + 0.7152 * rgba[index + 1] + 0.0722 * rgba[index + 2];
      gridRow.push(value);
      if (!Number.isNaN(value)) samples.push(value);
    }
    grid.push(gridRow);
  }
  if (samples.length < 16) throw new Error('not_enough_pixels');
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const clippedLowRatio = samples.filter(value => value <= 4).length / samples.length;
  const clippedHighRatio = samples.filter(value => value >= 251).length / samples.length;
  let edgeTotal = 0;
  let edgeCount = 0;
  for (let index = 1; index < samples.length; index += 1) {
    edgeTotal += Math.abs(samples[index] - samples[index - 1]);
    edgeCount += 1;
  }
  const edgeEnergy = edgeCount ? edgeTotal / edgeCount : 0;
  let focusTotal = 0;
  let focusCount = 0;
  for (let row = 1; row < grid.length - 1; row += 1) {
    for (let column = 1; column < grid[row].length - 1; column += 1) {
      const center = grid[row][column];
      const left = grid[row][column - 1];
      const right = grid[row][column + 1];
      const top = grid[row - 1][column];
      const bottom = grid[row + 1][column];
      if ([center, left, right, top, bottom].some(Number.isNaN)) continue;
      focusTotal += Math.abs(4 * center - left - right - top - bottom);
      focusCount += 1;
    }
  }
  const focusEnergy = focusCount ? focusTotal / focusCount : 0;
  return { meanLuminance: Math.round(mean * 100) / 100, luminanceSpread: Math.round((max - min) * 100) / 100, clippedLowRatio, clippedHighRatio, edgeEnergy: Math.round(edgeEnergy * 100) / 100, focusEnergy: Math.round(focusEnergy * 100) / 100 };
}

function decodeRgba(bytes: Uint8Array, mime: PhotoQualityAssessment['mimeType']): { data: Uint8Array; width: number; height: number } | null {
  if (mime === 'image/jpeg') {
    const decoded = jpeg.decode(Buffer.from(bytes), { useTArray: true });
    return { data: decoded.data, width: decoded.width, height: decoded.height };
  }
  if (mime === 'image/png') {
    const decoded = PNG.sync.read(Buffer.from(bytes));
    return { data: decoded.data, width: decoded.width, height: decoded.height };
  }
  return null;
}

export function assessPhotoQuality(raw: Uint8Array, mime: string): PhotoQualityAssessment {
  const bytes = raw.byteLength;
  const normalizedMime = mime as PhotoQualityAssessment['mimeType'];
  if (!mimeSupported(mime)) return { accepted: false, code: 'unsupported_format', message: 'Le pilote accepte uniquement JPEG, PNG ou WebP.', mimeType: normalizedMime, bytes };
  if (bytes === 0 || bytes > PHOTO_PILOT_MAX_BYTES) return { accepted: false, code: 'too_large', message: 'La photo est vide ou dépasse la limite de 5 Mo.', mimeType: normalizedMime, bytes };
  const size = dimensions(raw, normalizedMime);
  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) return { accepted: false, code: 'invalid_dimensions', message: 'Les dimensions de la photo ne sont pas lisibles.', mimeType: normalizedMime, bytes };
  if (size.width < PHOTO_PILOT_MIN_WIDTH || size.height < PHOTO_PILOT_MIN_HEIGHT) return { accepted: false, code: 'too_small', message: `La photo doit mesurer au moins ${PHOTO_PILOT_MIN_WIDTH} × ${PHOTO_PILOT_MIN_HEIGHT} pixels.`, mimeType: normalizedMime, bytes, width: size.width, height: size.height };
  if (size.width > 8000 || size.height > 8000) return { accepted: false, code: 'invalid_dimensions', message: 'Les dimensions de la photo sont hors limites pour ce pilote.', mimeType: normalizedMime, bytes, width: size.width, height: size.height };

  // WebP est stockable par le profil, mais volontairement hors pilote tant
  // qu'un décodeur indépendant n'est pas branché : on ne simule pas ses métriques.
  if (normalizedMime === 'image/webp') return { accepted: false, code: 'unsupported_format', message: 'Le pilote photo n’accepte pas encore WebP ; utilisez JPEG ou PNG.', mimeType: normalizedMime, bytes, width: size.width, height: size.height };
  try {
    const decoded = decodeRgba(raw, normalizedMime);
    if (!decoded) throw new Error('decode_failed');
    const metrics = luminanceMetrics(decoded.data, decoded.width, decoded.height);
    if (metrics.meanLuminance < 12 || metrics.clippedLowRatio > 0.92) return { accepted: false, code: 'too_dark', message: 'Éclairage trop sombre ou détails bouchés : reprenez la photo en lumière régulière.', mimeType: normalizedMime, bytes, width: size.width, height: size.height, metrics };
    if (metrics.meanLuminance > 245 || metrics.clippedHighRatio > 0.92) return { accepted: false, code: 'too_bright', message: 'Éclairage trop fort ou détails brûlés : évitez le flash direct et reprenez la photo.', mimeType: normalizedMime, bytes, width: size.width, height: size.height, metrics };
    if (metrics.luminanceSpread < 20 || metrics.edgeEnergy < 1 || metrics.focusEnergy < 0.35) return { accepted: false, code: 'low_detail', message: 'La photo ne contient pas assez de détail exploitable : évitez le flou et les aplats.', mimeType: normalizedMime, bytes, width: size.width, height: size.height, metrics };
    return { accepted: true, code: 'accepted', message: 'Qualité compatible avec le pilote expérimental.', mimeType: normalizedMime, bytes, width: size.width, height: size.height, metrics };
  } catch {
    return { accepted: false, code: 'decode_failed', message: 'La photo ne peut pas être décodée pour le contrôle qualité.', mimeType: normalizedMime, bytes, width: size.width, height: size.height };
  }
}

export function validatePhotoPilotMetadata(value: unknown): { ok: true; metadata: PhotoPilotMetadata } | { ok: false; message: string } {
  const rawPhototype = (value as any)?.phototype;
  const romanPhototype = typeof rawPhototype === 'string' ? PHOTO_PILOT_PHOTOTYPES.indexOf(rawPhototype as PhotoPilotPhototype) + 1 : 0;
  const phototypeNumber = normalizePhototype(rawPhototype) || (romanPhototype >= 1 ? romanPhototype as 1 | 2 | 3 | 4 | 5 | 6 : null);
  const phototype = phototypeNumber ? PHOTO_PILOT_PHOTOTYPES[phototypeNumber - 1] : undefined;
  const lighting = typeof (value as any)?.lighting === 'string' ? (value as any).lighting : '';
  if (!phototype) return { ok: false, message: 'Le phototype déclaré I à VI (ou 1 à 6) est requis pour ce pilote ; il n’est jamais déduit de la photo.' };
  if (!(PHOTO_PILOT_LIGHTING as readonly string[]).includes(lighting)) return { ok: false, message: 'Un éclairage régulier déclaré (jour ou intérieur) est requis pour ce pilote.' };
  return { ok: true, metadata: { phototype, lighting: lighting as PhotoPilotLighting } };
}

export function buildPhotoPilotPrompt(metadata: PhotoPilotMetadata): string {
  return `KURLA ${PHOTO_PILOT_PROMPT_VERSION}. Tu fournis une observation cosmétique expérimentale d'une image de peau, jamais un diagnostic. Le phototype ${metadata.phototype} et l'éclairage ${metadata.lighting} sont déclarés par la personne uniquement pour stratifier l'évaluation ; ne les infère pas, ne les corrige pas et n'infère ni origine, ni âge, ni identité.\n\nObserve seulement des éléments visuellement prudents : texture visible, aspect de sécheresse visible, rougeur visible, variation de pigmentation visible, brillance visible. Si ce n'est pas clairement observable, code not_assessable. N'emploie aucun nom de maladie, aucune pathologie, aucune conclusion médicale, aucun niveau de risque et aucune promesse.\n\nRéponds en JSON avec observations [{code, level, note}] et limitations []. Les niveaux sont not_assessed, low, moderate ou high ; high décrit seulement une visibilité cosmétique, jamais une gravité médicale. Ajoute noDiagnosis=true, noPhototypeInference=true et noIdentityInference=true. Si la personne indique une douleur, une évolution rapide ou une inquiétude, recommande seulement l’avis d’un professionnel de santé, sans nommer de pathologie.`;
}

export function sanitizePhotoPilotOutput(raw: unknown): PhotoPilotOutput {
  const input = raw && typeof raw === 'object' ? raw as any : {};
  const observations: PhotoPilotObservation[] = Array.isArray(input.observations)
    ? input.observations.map((entry: any): PhotoPilotObservation => {
      const code = (PHOTO_PILOT_OBSERVATION_CODES as readonly string[]).includes(entry?.code) ? entry.code as PhotoPilotObservationCode : 'not_assessable';
      const level = ['not_assessed', 'low', 'moderate', 'high'].includes(entry?.level) ? entry.level : 'not_assessed';
      const note = typeof entry?.note === 'string' && !MEDICAL_WORDS.test(entry.note) ? entry.note.slice(0, 300) : 'Non évaluable de façon suffisamment fiable sur cette image.';
      return { code, level, note };
    }).slice(0, 8)
    : [];
  const safeObservations: PhotoPilotObservation[] = observations.length ? observations : [{ code: 'not_assessable', level: 'not_assessed', note: 'Aucune observation suffisamment fiable n’a été retenue.' }];
  const limitations = Array.isArray(input.limitations)
    ? input.limitations.filter((value: unknown): value is string => typeof value === 'string' && !MEDICAL_WORDS.test(value)).map(value => value.slice(0, 300)).slice(0, 8)
    : [];
  return {
    scope: PHOTO_PILOT_SCOPE,
    observations: safeObservations,
    limitations: Array.from(new Set([...limitations, 'Pilote expérimental : l’image ne permet ni diagnostic, ni mesure clinique, ni validation de phototype.'])),
    noDiagnosis: true,
    noPhototypeInference: true,
    noIdentityInference: true,
    safetyAdvice: 'En cas de douleur, d’évolution rapide ou d’inquiétude, demandez l’avis d’un professionnel de santé.',
    disclosure: 'AI générative utilisée comme aide cosmétique expérimentale, sans diagnostic.'
  };
}

export function photoPilotProvenance(inputSha256: string, metadata: PhotoPilotMetadata, model = GEMINI_MODEL): PhotoPilotProvenance {
  return {
    scope: PHOTO_PILOT_SCOPE,
    provider: 'google_gemini',
    model,
    promptVersion: PHOTO_PILOT_PROMPT_VERSION,
    rulesVersion: PHOTO_PILOT_RULES_VERSION,
    responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
    qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
    inputSha256,
    declaredPhototype: metadata.phototype,
    declaredLighting: metadata.lighting,
    phototypeSource: 'member_declared',
    lightingSource: 'member_declared',
    independentValidation: { status: 'pilot_stratified_not_validated', protocol: 'C8-photo-pilot-validation-v1', requiredStrata: PHOTO_PILOT_REQUIRED_STRATA }
  };
}

export async function runPhotoPilot(raw: Uint8Array, mimeType: 'image/jpeg' | 'image/png', metadata: PhotoPilotMetadata): Promise<PhotoPilotRunResult> {
  const ai = getGeminiClient();
  if (!ai) throw new Error('PHOTO_AI_NOT_CONFIGURED');
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ inlineData: { mimeType, data: Buffer.from(raw).toString('base64') } }, { text: buildPhotoPilotPrompt(metadata) }],
    config: { temperature: 0, maxOutputTokens: 1200, responseMimeType: 'application/json' }
  });
  let parsed: unknown;
  try { parsed = JSON.parse(response.text || '{}'); } catch { throw new Error('PHOTO_AI_INVALID_JSON'); }
  return { output: sanitizePhotoPilotOutput(parsed), model: GEMINI_MODEL, provider: 'google_gemini' };
}
