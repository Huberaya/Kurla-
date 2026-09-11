import assert from 'node:assert/strict';

import {
  evaluatePhotoprotectionEvidence,
  hpiObservationFromProfile,
  inferFromToneDepth,
  isTraceableVerifiedEvidence,
} from '../src/lib/skinMelaninEvidence';

let checks = 0;
function ok(label: string): void {
  checks += 1;
  console.log(`✓ ${label}`);
}

{
  const observation = hpiObservationFromProfile({
    hyperpigmentationTendency: 'frequente',
    postInflammatoryMarks: 'frequentes',
    skinConcerns: ['taches'],
  });
  assert.equal(observation.code, 'post_inflammatory_marks');
  assert.equal(observation.medicalDiagnosis, false);
  assert.equal(observation.source, 'self_reported');
  ok('l’HPI est une observation auto-déclarée, jamais un diagnostic');
}

{
  const observation = hpiObservationFromProfile({
    hyperpigmentationTendency: 'inconnu',
    postInflammatoryMarks: 'inconnu',
    skinConcerns: [],
  });
  assert.equal(observation.code, 'unknown');
  assert.equal(inferFromToneDepth('foncée'), null);
  assert.equal(inferFromToneDepth('deep'), null);
  ok('aucune HPI ni phototype n’est déduite d’une profondeur de ton');
}

{
  const readiness = evaluatePhotoprotectionEvidence({
    isSpf: true,
    spfUvaEvidenceStatus: 'not_provided',
    whitecastRisk: 'not_tested',
    whitecastTestStatus: 'not_provided',
    testedPhototypes: ['V'],
    testedLights: [],
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.some(item => item.field === 'spf_uva_evidence_status'));
  assert.ok(readiness.missing.some(item => item.label.includes('phototype IV')));
  assert.ok(readiness.missing.some(item => item.field === 'tested_lights'));
  ok('un SPF sans dossier SPF/UVA, white cast et IV–VI reste bloqué');
}

const completeEvidence = [
  { type: 'spf_uva' as const, status: 'verified' as const, sourceKind: 'laboratory_report' as const, sourceLabel: 'Rapport SPF/UVA relu', sourceId: 'lab-spf-001', capturedAt: '2026-09-10', reviewedAt: '2026-09-11', method: 'rapport laboratoire rattaché au SKU' },
  { type: 'white_cast' as const, status: 'verified' as const, sourceKind: 'controlled_test' as const, sourceLabel: 'Test rendu phototypes IV-VI', sourceId: 'test-white-001', capturedAt: '2026-09-10', reviewedAt: '2026-09-11', method: 'lumière du jour indirecte, grille C5' },
  { type: 'visible_light' as const, status: 'verified' as const, sourceKind: 'laboratory_report' as const, sourceLabel: 'Rapport lumière visible relu', sourceId: 'lab-visible-001', capturedAt: '2026-09-10', reviewedAt: '2026-09-11', method: 'méthode déclarée dans le rapport' },
  { type: 'undertone' as const, status: 'verified' as const, sourceKind: 'controlled_test' as const, sourceLabel: 'Test sous-tons relu', sourceId: 'test-undertone-001', capturedAt: '2026-09-10', reviewedAt: '2026-09-11', method: 'essai contrôlé sous lumière du jour et intérieure' },
];

{
  const readiness = evaluatePhotoprotectionEvidence({
    isSpf: true,
    spfUvaEvidenceStatus: 'verified',
    whitecastRisk: 'low',
    whitecastTestStatus: 'verified',
    testedPhototypes: ['IV', 'V', 'VI'],
    testedLights: ['daylight_indirect', 'indoor_visible'],
    visibleLightClaim: true,
    visibleLightTestStatus: 'verified',
    isTinted: true,
    testedUndertones: ['golden', 'neutral', 'red'],
    evidence: completeEvidence,
  });
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.missing, []);
  ok('un SPF teinté ne passe qu’avec preuves SPF/UVA, white cast, lumière visible et sous-tons');
}

{
  const readiness = evaluatePhotoprotectionEvidence({
    isSpf: true,
    spfUvaEvidenceStatus: 'verified',
    whitecastRisk: 'low',
    whitecastTestStatus: 'verified',
    testedPhototypes: ['IV', 'V', 'VI'],
    testedLights: ['daylight_indirect'],
    visibleLightClaim: true,
    visibleLightTestStatus: 'not_provided',
    evidence: completeEvidence.filter(item => item.type !== 'visible_light'),
  });
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.some(item => item.field === 'visible_light_test_status'));
  ok('une revendication lumière visible sans test est refusée');
}

{
  const readiness = evaluatePhotoprotectionEvidence({
    isSpf: true,
    spfUvaEvidenceStatus: 'verified',
    whitecastRisk: 'low',
    whitecastTestStatus: 'verified',
    testedPhototypes: ['IV', 'V', 'VI'],
    testedLights: ['daylight_indirect'],
    visibleLightClaim: false,
    visibleLightTestStatus: 'not_applicable',
    evidence: completeEvidence.filter(item => item.type === 'spf_uva' || item.type === 'white_cast'),
  });
  assert.equal(readiness.ready, true);
  ok('sans revendication lumière visible, le non-applicable est explicite et non présenté comme une preuve');
}

{
  assert.equal(isTraceableVerifiedEvidence({
    status: 'verified',
    sourceKind: 'brand_claim',
    sourceLabel: 'Page marketing',
    sourceUrl: 'https://brand.example/spf',
  }), false, 'une URL marketing sans date, méthode et relecture ne suffit pas');
  assert.equal(isTraceableVerifiedEvidence(completeEvidence[0]), true);
  ok('la traçabilité exige source localisable, date, méthode et relecture');
}

console.log(`\nC5 mélanine / HPI / photoprotection — ${checks} contrôles passés.\n`);
