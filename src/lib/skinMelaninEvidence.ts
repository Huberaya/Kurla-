/**
 * C5 — ontologie HPI et preuves de photoprotection.
 *
 * Cette couche ne déduit jamais une information à partir d'une couleur, d'une
 * origine supposée, d'une photo ou d'un phototype. Elle conserve séparément :
 * - ce que la personne décrit comme marque ou pigmentation ;
 * - la réaction déclarée au soleil ;
 * - les résultats de tests produit et leur traçabilité.
 *
 * Les états `verified` ne sont accordés que lorsqu'une preuve est localisable,
 * datée et relue. Une revendication fournisseur ou une simple URL n'est donc
 * pas transformée en preuve par ce module.
 */

import type { SkinBeautyProfile } from './beautyProfile';

export const SKIN_MELANIN_EVIDENCE_VERSION = '2026-09-19.c5';

export const HPI_CODES = [
  'post_inflammatory_marks',
  'post_acne_marks',
  'post_friction_marks',
  'sun_related_darkening',
  'uneven_tone_observed',
  'unknown',
] as const;

export type HpiCode = typeof HPI_CODES[number];

export const HPI_CODE_LABELS: Record<HpiCode, string> = {
  post_inflammatory_marks: 'Marques après inflammation — auto-déclarées',
  post_acne_marks: 'Marques après boutons — auto-déclarées',
  post_friction_marks: 'Marques associées à un frottement — auto-déclarées',
  sun_related_darkening: 'Assombrissement après exposition solaire — auto-déclaré',
  uneven_tone_observed: 'Teint perçu comme irrégulier — sans diagnostic',
  unknown: 'Non renseigné',
};

export const HPI_TRIGGER_CODES = ['acne', 'irritation', 'friction', 'sun_exposure', 'unknown'] as const;
export type HpiTriggerCode = typeof HPI_TRIGGER_CODES[number];

export type HpiObservation = {
  code: HpiCode;
  trigger: HpiTriggerCode;
  zones: string[];
  source: 'self_reported' | 'controlled_observation' | 'not_assessed';
  capturedAt?: string;
  /** Toujours false : cette ontologie ne pose pas de diagnostic médical. */
  medicalDiagnosis: false;
};

/**
 * Les champs historiques du profil sont mappés vers une ontologie explicite.
 * Un champ absent produit `unknown`; il n'est pas remplacé par une hypothèse.
 */
export function hpiObservationFromProfile(profile: Pick<SkinBeautyProfile, 'hyperpigmentationTendency' | 'postInflammatoryMarks' | 'skinConcerns'> | null | undefined): HpiObservation {
  const tendency = String(profile?.hyperpigmentationTendency || '').toLowerCase();
  const marks = String(profile?.postInflammatoryMarks || '').toLowerCase();
  const concerns = Array.isArray(profile?.skinConcerns) ? profile.skinConcerns.map(value => String(value).toLowerCase()) : [];

  if (marks === 'frequentes' || marks === 'frequente') {
    return { code: 'post_inflammatory_marks', trigger: 'unknown', zones: [], source: 'self_reported', medicalDiagnosis: false };
  }
  if (tendency === 'frequente' || tendency === 'occasionnelle') {
    return { code: 'post_inflammatory_marks', trigger: 'unknown', zones: [], source: 'self_reported', medicalDiagnosis: false };
  }
  if (concerns.some(value => /taches|hyperpigmentation|teint_non_uniforme/.test(value))) {
    return { code: 'uneven_tone_observed', trigger: 'unknown', zones: [], source: 'self_reported', medicalDiagnosis: false };
  }
  return { code: 'unknown', trigger: 'unknown', zones: [], source: 'not_assessed', medicalDiagnosis: false };
}

export function normalizeHpiCode(value: unknown): HpiCode {
  const token = String(value || '').trim().toLowerCase();
  return (HPI_CODES as readonly string[]).includes(token) ? token as HpiCode : 'unknown';
}

/** Ne classe jamais un phototype, une HPI ou un sous-ton depuis toneDepth. */
export function inferFromToneDepth(_toneDepth: unknown): null {
  return null;
}

export const PHOTOTYPE_TEST_SCOPE = ['IV', 'V', 'VI'] as const;
export type PhototypeTestScope = typeof PHOTOTYPE_TEST_SCOPE[number];

export const LIGHT_TEST_CODES = ['daylight_indirect', 'daylight_direct', 'indoor_visible'] as const;
export type LightTestCode = typeof LIGHT_TEST_CODES[number];

export const EVIDENCE_TYPES = ['spf_uva', 'white_cast', 'visible_light', 'undertone'] as const;
export type PhotoprotectionEvidenceType = typeof EVIDENCE_TYPES[number];

export type EvidenceStatus = 'verified' | 'pending' | 'rejected' | 'not_provided';
export type EvidenceSourceKind = 'supplier_document' | 'laboratory_report' | 'controlled_test' | 'scientific_literature' | 'brand_claim' | 'user_observation';

export type TraceableEvidence = {
  type: PhotoprotectionEvidenceType;
  status: EvidenceStatus;
  sourceKind: EvidenceSourceKind;
  sourceLabel: string;
  sourceId?: string;
  sourceUrl?: string;
  storagePath?: string;
  capturedAt?: string;
  reviewedAt?: string;
  method?: string;
};

export function isTraceableVerifiedEvidence(evidence: Partial<TraceableEvidence> | null | undefined): boolean {
  if (!evidence || evidence.status !== 'verified') return false;
  if (!evidence.sourceKind || !String(evidence.sourceLabel || '').trim()) return false;
  if (!evidence.sourceId && !evidence.sourceUrl && !evidence.storagePath) return false;
  if (!evidence.capturedAt || !evidence.reviewedAt) return false;
  return Boolean(String(evidence.method || '').trim());
}

export type PhotoprotectionInput = {
  isSpf: boolean;
  spfUvaEvidenceStatus?: EvidenceStatus;
  whitecastRisk?: 'none' | 'low' | 'medium' | 'high' | 'not_tested';
  whitecastTestStatus?: EvidenceStatus;
  testedPhototypes?: unknown[];
  testedLights?: unknown[];
  isTinted?: boolean;
  testedUndertones?: unknown[];
  visibleLightClaim?: boolean;
  visibleLightTestStatus?: EvidenceStatus | 'not_applicable';
  evidence?: Array<Partial<TraceableEvidence>>;
};

export type PhotoprotectionReadiness = {
  isSpf: boolean;
  ready: boolean;
  missing: Array<{ field: string; label: string }>;
  evidenceTypes: Record<PhotoprotectionEvidenceType, boolean>;
  testedPhototypes: PhototypeTestScope[];
  testedLights: LightTestCode[];
};

function normalizePhototypes(values: unknown[] | undefined): PhototypeTestScope[] {
  const normalized = (values || []).map(value => String(value).toUpperCase().replace('FITZPATRICK ', ''));
  return PHOTOTYPE_TEST_SCOPE.filter(value => normalized.includes(value));
}

function normalizeLights(values: unknown[] | undefined): LightTestCode[] {
  const aliases: Record<string, LightTestCode> = {
    daylight: 'daylight_indirect',
    indirect_daylight: 'daylight_indirect',
    daylight_indirect: 'daylight_indirect',
    direct_daylight: 'daylight_direct',
    daylight_direct: 'daylight_direct',
    visible_light: 'indoor_visible',
    indoor_visible: 'indoor_visible',
  };
  return Array.from(new Set((values || []).map(value => aliases[String(value).toLowerCase().trim()]).filter(Boolean)));
}

const ACCEPTED_SOURCE_KINDS: Record<PhotoprotectionEvidenceType, EvidenceSourceKind[]> = {
  spf_uva: ['supplier_document', 'laboratory_report'],
  white_cast: ['supplier_document', 'laboratory_report', 'controlled_test'],
  visible_light: ['supplier_document', 'laboratory_report', 'controlled_test'],
  undertone: ['supplier_document', 'laboratory_report', 'controlled_test'],
};

function evidenceFor(type: PhotoprotectionEvidenceType, evidence: Array<Partial<TraceableEvidence>>): boolean {
  return evidence.some(item => item.type === type
    && ACCEPTED_SOURCE_KINDS[type].includes(item.sourceKind as EvidenceSourceKind)
    && isTraceableVerifiedEvidence(item));
}

/**
 * Porte C5 pour un SPF. La lumière visible n'est exigée que lorsqu'une fiche
 * revendique cette protection ou lorsqu'elle est teintée ; elle est sinon
 * explicitement `not_applicable`, jamais présentée comme prouvée.
 */
export function evaluatePhotoprotectionEvidence(input: PhotoprotectionInput): PhotoprotectionReadiness {
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const phototypes = normalizePhototypes(input.testedPhototypes);
  const lights = normalizeLights(input.testedLights);
  const evidenceTypes = {
    spf_uva: evidenceFor('spf_uva', evidence) || input.spfUvaEvidenceStatus === 'verified',
    white_cast: evidenceFor('white_cast', evidence) || input.whitecastTestStatus === 'verified',
    visible_light: evidenceFor('visible_light', evidence) || input.visibleLightTestStatus === 'verified',
    undertone: evidenceFor('undertone', evidence),
  };

  if (!input.isSpf) {
    return { isSpf: false, ready: true, missing: [], evidenceTypes, testedPhototypes: phototypes, testedLights: lights };
  }

  const missing: Array<{ field: string; label: string }> = [];
  if (!evidenceTypes.spf_uva) missing.push({ field: 'spf_uva_evidence_status', label: 'preuve SPF/UVA traçable et relue' });
  if (!input.whitecastRisk || input.whitecastRisk === 'not_tested') missing.push({ field: 'whitecast_risk', label: 'risque white cast documenté' });
  if (!evidenceTypes.white_cast) missing.push({ field: 'whitecast_test_status', label: 'test white cast traçable et relu' });
  for (const phototype of PHOTOTYPE_TEST_SCOPE) {
    if (!phototypes.includes(phototype)) missing.push({ field: 'tested_phototypes', label: `phototype ${phototype} absent du test` });
  }
  if (!lights.includes('daylight_indirect') && !lights.includes('daylight_direct')) {
    missing.push({ field: 'tested_lights', label: 'test en lumière du jour absent' });
  }
  const requiresVisibleLight = input.visibleLightClaim === true || input.isTinted === true;
  if (requiresVisibleLight && input.visibleLightTestStatus !== 'verified' && !evidenceTypes.visible_light) {
    missing.push({ field: 'visible_light_test_status', label: 'preuve lumière visible absente pour cette revendication/teinte' });
  }
  if (requiresVisibleLight && !lights.includes('indoor_visible')) {
    missing.push({ field: 'tested_lights', label: 'test de rendu en lumière visible absent' });
  }
  if (input.isTinted && (!input.testedUndertones || input.testedUndertones.length === 0)) {
    missing.push({ field: 'tested_undertones', label: 'sous-tons testés absents pour le SPF teinté' });
  }
  if (input.isTinted && !evidenceTypes.undertone) {
    missing.push({ field: 'undertone_evidence', label: 'preuve traçable des tests de sous-tons absente' });
  }

  return {
    isSpf: true,
    ready: missing.length === 0,
    missing: missing.filter((item, index, all) => all.findIndex(other => other.field === item.field && other.label === item.label) === index),
    evidenceTypes,
    testedPhototypes: phototypes,
    testedLights: lights,
  };
}
