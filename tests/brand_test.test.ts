/**
 * CHANTIER 8.6c2 — Espace marque : tests produits ciblés (feature 41).
 *
 * Ce banc vérifie ce qui rend ce service acceptable :
 *
 *   1. Une marque cible des BESOINS, jamais des personnes. Toute tentative de
 *      cibler par e-mail, ville, âge ou identifiant est refusée nommément.
 *   2. Le rapport ne reçoit que des effectifs : il ne peut pas divulguer ce
 *      qu'il ne reçoit jamais.
 *   3. k-anonymité appliquée : une cellule sous k est absente du rapport, et
 *      sous k au global la distribution des signaux vaut `null`.
 *   4. Un retrait de consentement retire les déclarations du membre.
 *   5. Un résultat négatif a la même place qu'un résultat positif.
 *   6. Aucun vocabulaire de la preuve : ce sont des résultats déclarés.
 */
import assert from 'node:assert/strict';

process.env.KURLA_STORE_MODE = 'memory';
process.env.KURLA_TEST_NO_SERVER = 'true';

const {
  BRAND_TEST_CAVEATS,
  BRAND_TEST_K_THRESHOLD,
  BRAND_TEST_TRANSITIONS,
  FORBIDDEN_COHORT_KEYS,
  buildBrandTestReport,
  brandTestReportBreaches,
  canDeclareBrandTestOutcome,
  canJoinBrandTest,
  canTransitionBrandTest,
  describeSignal,
  profileMatchesCohort,
  profileMatchesNeed,
  validateCohortDefinition
} = await import('../src/lib/brandTest');
const { RECOGNIZED_NEED_CODES } = await import('../src/lib/kurlaFit');
const { normalizeBeautyProfile } = await import('../src/lib/beautyProfile');

const KNOWN_NEEDS = [...RECOGNIZED_NEED_CODES];

// ---------------------------------------------------------------------------
// 1. Cohorte : on cible des besoins, pas des personnes
// ---------------------------------------------------------------------------
const valid = validateCohortDefinition({ needs: ['hydrater_cheveux', 'cuir_chevelu'] }, KNOWN_NEEDS);
assert.equal(valid.ok, true, 'une cohorte de besoins est acceptée');
assert.deepEqual((valid as any).cohort.needs, ['hydrater_cheveux', 'cuir_chevelu']);

const targeted = validateCohortDefinition(
  { needs: ['hydrater_cheveux'], emails: ['a@b.fr'], city: 'Paris', age: 34 },
  KNOWN_NEEDS
);
assert.equal(targeted.ok, false, 'cibler par e-mail, ville ou âge est refusé');
assert.deepEqual((targeted as any).refusedKeys.sort(), ['age', 'city', 'emails'], 'les clés refusées sont nommées');
assert.ok((targeted as any).reason.includes('ne cible pas des personnes'), 'le refus explique la règle');

for (const key of FORBIDDEN_COHORT_KEYS) {
  const refused = validateCohortDefinition({ needs: ['hydrater_cheveux'], [key]: 'x' }, KNOWN_NEEDS);
  assert.equal(refused.ok, false, `la clé « ${key} » est refusée`);
}

const invented = validateCohortDefinition({ needs: ['blanchir_la_peau'] }, KNOWN_NEEDS);
assert.equal(invented.ok, false, 'un besoin inventé est refusé');
assert.ok((invented as any).reason.includes('blanchir_la_peau'), 'le besoin inconnu est nommé');

const empty = validateCohortDefinition({ needs: [] }, KNOWN_NEEDS);
assert.equal(empty.ok, false, 'une cohorte sans besoin est refusée');

const smuggled = validateCohortDefinition({ needs: ['hydrater_cheveux'], budget: 5000 }, KNOWN_NEEDS);
assert.equal(smuggled.ok, false, 'une clé hors vocabulaire — même inoffensive — est refusée');

// ---------------------------------------------------------------------------
// 2. Le vocabulaire des besoins n'est pas décoratif
// ---------------------------------------------------------------------------
const maximalProfile = normalizeBeautyProfile({
  hair: {
    curlPattern: 'spirales',
    dryness: 'forte',
    breakage: 'frequente',
    scalpConcerns: ['demangeaisons'],
    protectiveStyles: ['tresses', 'locks', 'perruque'],
    texturePatterns: ['locks'],
    stylingHabits: ['wash_and_go']
  },
  skin: {
    spfUsage: 'jamais',
    sunExposure: 'forte',
    hyperpigmentationTendency: 'frequente',
    postInflammatoryMarks: 'frequentes',
    acne: 'reguliere',
    sensitivity: 'elevee',
    activeTolerance: 'faible',
    hydration: 'seche'
  }
});
const emptyProfile = normalizeBeautyProfile({});

for (const need of KNOWN_NEEDS) {
  assert.equal(
    profileMatchesNeed(maximalProfile, need),
    true,
    `le besoin « ${need} » doit correspondre à un profil qui le déclare — sinon le code est mort`
  );
  assert.equal(profileMatchesNeed(emptyProfile, need), false, `un profil vide ne déclare pas « ${need} »`);
}
assert.equal(
  profileMatchesCohort(maximalProfile, { needs: ['hydrater_cheveux'] }),
  true,
  'la cohorte reconnaît le membre'
);
assert.equal(
  profileMatchesCohort(emptyProfile, { needs: ['hydrater_cheveux'] }),
  false,
  'un profil vide n’entre dans aucune cohorte'
);

// ---------------------------------------------------------------------------
// 3. Cycle de vie : on ne recrute pas avant d'être accepté
// ---------------------------------------------------------------------------
assert.deepEqual(BRAND_TEST_TRANSITIONS.rejected, [], 'un refus est définitif');
assert.deepEqual(BRAND_TEST_TRANSITIONS.closed, [], 'un test clôturé ne rouvre pas');
assert.equal(canTransitionBrandTest('submitted', 'running'), false, 'pas de test sans acceptation');
assert.equal(canTransitionBrandTest('submitted', 'recruiting'), false, 'pas de recrutement sans acceptation');
for (const step of [['submitted', 'approved'], ['approved', 'recruiting'], ['recruiting', 'running'], ['running', 'closed']] as const) {
  assert.equal(canTransitionBrandTest(step[0], step[1]), true, `${step[0]} → ${step[1]} est autorisé`);
}
assert.equal(canJoinBrandTest('recruiting'), true, 'on rejoint pendant le recrutement');
assert.equal(canJoinBrandTest('running'), false, 'on ne rejoint pas un test déjà en cours');
assert.equal(canDeclareBrandTestOutcome('running'), true, 'on déclare pendant le test');
assert.equal(canDeclareBrandTestOutcome('recruiting'), false, 'rien à déclarer avant le début');
assert.equal(canDeclareBrandTestOutcome('closed'), false, 'un test clôturé n’accepte plus de déclaration');

// ---------------------------------------------------------------------------
// 4. Rapport : la cellule sous k est absente, pas arrondie
// ---------------------------------------------------------------------------
const rows = [
  { need: 'hydrater_cheveux', participants: 45, positive: 30, neutral: 10, negative: 5, unknown: 0, withdrawals: 2 },
  { need: 'cuir_chevelu', participants: 12, positive: 11, neutral: 1, negative: 0, unknown: 0, withdrawals: 0 }
];
const report = buildBrandTestReport({
  testId: 'test-1',
  brandName: 'Marque A',
  productName: 'Soin hydratant',
  hypothesis: 'Le soin répond-il au besoin d’hydratation des longueurs ?',
  cohortNeeds: ['hydrater_cheveux', 'cuir_chevelu'],
  rows
});
assert.equal(report.cells.length, 1, 'une seule cellule atteint le seuil');
assert.equal(report.cells[0].need, 'hydrater_cheveux');
assert.equal(report.totals.suppressedCells, 1, 'la cellule sous k est comptée');
assert.equal(report.kThreshold, BRAND_TEST_K_THRESHOLD, 'le seuil appliqué est annoncé');
assert.equal(BRAND_TEST_K_THRESHOLD, 30, 'le seuil est celui des cohortes k-anonymes');
assert.ok(
  !JSON.stringify(report.cells).includes('"cuir_chevelu"'),
  'la cellule sous k n’apparaît nulle part dans les cellules publiées'
);
assert.equal(report.cells[0].positiveShare, Number((30 / 45).toFixed(3)), 'la part est calculée sur les signaux interprétables');

// ---------------------------------------------------------------------------
// 5. Sous k au global : rien n'est publié du tout
// ---------------------------------------------------------------------------
const tiny = buildBrandTestReport({
  testId: 'test-2',
  brandName: 'Marque B',
  productName: 'Sérum',
  hypothesis: 'Tolérance ?',
  cohortNeeds: ['peau_sensible'],
  rows: [{ need: 'peau_sensible', participants: 20, positive: 19, neutral: 1, negative: 0, unknown: 0, withdrawals: 0 }]
});
assert.equal(tiny.totals.publishable, false, '20 participants : le test n’est pas publiable');
assert.equal(tiny.signals, null, 'aucune distribution de signaux n’est publiée sous le seuil');
assert.equal(tiny.cells.length, 0, 'aucune cellule publiée');
assert.equal(tiny.totals.suppressedCells, 1, 'la cellule est comptée comme supprimée');

// ---------------------------------------------------------------------------
// 6. Retraits exclus, résultats négatifs à égalité
// ---------------------------------------------------------------------------
const withWithdrawals = buildBrandTestReport({
  testId: 'test-3',
  brandName: 'Marque C',
  productName: 'Masque',
  hypothesis: 'Réduction de la casse ?',
  cohortNeeds: ['reduire_casse'],
  rows: [{ need: 'reduire_casse', participants: 40, positive: 18, neutral: 4, negative: 18, unknown: 0, withdrawals: 7 }]
});
assert.equal(withWithdrawals.totals.withdrawals, 7, 'les retraits sont comptés');
assert.equal(withWithdrawals.cells[0].participants, 40, 'les retirés ne sont pas dans l’effectif');
assert.equal(withWithdrawals.signals?.positive, 18);
assert.equal(withWithdrawals.signals?.negative, 18, 'un résultat négatif compte autant qu’un positif');
assert.equal(withWithdrawals.cells[0].positiveShare, 0.45, 'la part de positifs n’est pas arrangée');

// ---------------------------------------------------------------------------
// 7. Aucune donnée personnelle ne traverse
// ---------------------------------------------------------------------------
const serialized = JSON.stringify(report);
for (const forbidden of ['userId', 'email', '@', 'consentAt', 'participant-']) {
  assert.equal(serialized.includes(forbidden), false, `le rapport ne contient pas « ${forbidden} »`);
}
assert.equal(describeSignal('more_hydration').valence, 'positif');
assert.equal(describeSignal('reaction').valence, 'negatif');
assert.equal(describeSignal('no_change').valence, 'neutre');
assert.equal(describeSignal('signal_invente').known, false, 'un signal inconnu n’est pas interprété');

// ---------------------------------------------------------------------------
// 8. Garde éditoriale : pas de vocabulaire de la preuve
// ---------------------------------------------------------------------------
assert.deepEqual(brandTestReportBreaches(report), [], 'un rapport sain ne contient aucun mot de la preuve');
const overclaiming = {
  caveats: BRAND_TEST_CAVEATS,
  productName: 'Sérum éclaircissant',
  hypothesis: 'Efficacité cliniquement prouvée sur les taches'
};
const breaches = brandTestReportBreaches(overclaiming);
assert.ok(breaches.includes('cliniquement'), 'le vocabulaire clinique est détecté');
assert.ok(breaches.includes('prouvé'), '« prouvée » est détecté par sous-chaîne');
assert.ok(
  BRAND_TEST_CAVEATS.some(line => line.includes('n’est pas un essai clinique')),
  'la nature déclarative des résultats est écrite'
);
assert.ok(
  BRAND_TEST_CAVEATS.some(line => line.includes('ne revend aucune donnée personnelle')),
  'l’absence de revente de données est écrite'
);

// ---------------------------------------------------------------------------
// 9. Store : le consentement précède la déclaration, le retrait retire
// ---------------------------------------------------------------------------
const { serverDb } = await import('../src/lib/serverDb');

const hairCohort = { needs: ['hydrater_cheveux', 'cuir_chevelu'] };

/**
 * CHANTIER 12 (bloc D) — depuis le contrat marque, une demande de test exige un
 * contrat actif. Le banc le vérifie au passage, puis pose le contrat dont la
 * suite a besoin.
 */
const contractInput = {
  brandUserId: 'brand-user-1',
  brandName: 'Marque Test',
  contactEmail: 'contact@marque-test.fr'
};
await assert.rejects(
  () => serverDb.createBrandTestRequest({
    ...contractInput,
    productName: 'Soin hydratant',
    hypothesis: 'Le soin répond-il au besoin d’hydratation des longueurs ?',
    cohort: hairCohort,
    targetParticipants: 40,
    durationDays: 45
  }),
  /contrat/i,
  'sans contrat signé, aucune demande de test ne doit passer'
);

const brandContract = await serverDb.issueBrandContract('admin-1', contractInput);
await serverDb.signBrandContract('brand-user-1', brandContract.id, {
  acceptsAggregateOnly: true,
  acceptsNoPersonalDataTransfer: true,
  confirmsTermsVersionRead: true
});
await serverDb.countersignBrandContract('admin-1', brandContract.id);

const request = await serverDb.createBrandTestRequest({
  brandUserId: 'brand-user-1',
  brandName: 'Marque Test',
  contactEmail: 'contact@marque-test.fr',
  productName: 'Soin hydratant',
  hypothesis: 'Le soin répond-il au besoin d’hydratation des longueurs ?',
  cohort: hairCohort,
  targetParticipants: 40,
  durationDays: 45
});
assert.equal(request.status, 'submitted', 'une demande naît déposée');

// À ce stade le test n'est pas ouvert : le premier refus porte sur le statut.
await assert.rejects(
  () => serverDb.declareBrandTestOutcome(request.id, 'member-1', 'more_hydration'),
  /n’accepte pas de déclaration/,
  'déclarer avant le début du test est refusé'
);
await assert.rejects(
  () => serverDb.joinBrandTest(request.id, 'member-1'),
  /n’accepte plus|profil|correspondent/,
  'on ne rejoint pas un test non recruté'
);

await serverDb.reviewBrandTestRequest(request.id, 'approved');
await assert.rejects(
  () => serverDb.reviewBrandTestRequest(request.id, 'running'),
  /Transition refusée/,
  'pas de test sans ouverture du recrutement'
);
await serverDb.reviewBrandTestRequest(request.id, 'recruiting');

const dryProfile = { hair: { dryness: 'forte', porosity: 'haute' }, skin: {} };
const scalpProfile = { hair: { scalpConcerns: ['demangeaisons'] }, skin: {} };
const offCohortProfile = { hair: { curlPattern: 'ondulations' }, skin: { hydration: 'confortable' } };

// 34 membres « hydratation » + 12 membres « cuir chevelu » (cellule sous k).
const dryMembers: string[] = [];
for (let index = 0; index < 34; index += 1) {
  const userId = `member-dry-${index}`;
  await serverDb.saveBeautyProfile(userId, dryProfile, 'test');
  await serverDb.joinBrandTest(request.id, userId);
  dryMembers.push(userId);
}
const scalpMembers: string[] = [];
for (let index = 0; index < 12; index += 1) {
  const userId = `member-scalp-${index}`;
  await serverDb.saveBeautyProfile(userId, scalpProfile, 'test');
  await serverDb.joinBrandTest(request.id, userId);
  scalpMembers.push(userId);
}

// Un membre hors cohorte est refusé, pas ignoré en silence.
await serverDb.saveBeautyProfile('member-off', offCohortProfile, 'test');
await assert.rejects(
  () => serverDb.joinBrandTest(request.id, 'member-off'),
  /ne correspondent pas au besoin ciblé/,
  'un membre hors cohorte est refusé'
);

await serverDb.reviewBrandTestRequest(request.id, 'running');
await assert.rejects(
  () => serverDb.joinBrandTest(request.id, 'member-late'),
  /n’accepte plus de participants/,
  'un test en cours n’accepte plus de participants'
);

// 30 positifs, 4 négatifs sur la cohorte hydratation : le négatif compte autant.
for (let index = 0; index < 30; index += 1) {
  await serverDb.declareBrandTestOutcome(request.id, dryMembers[index], 'more_hydration');
}
for (let index = 30; index < 34; index += 1) {
  await serverDb.declareBrandTestOutcome(request.id, dryMembers[index], 'less_hydration');
}
for (const userId of scalpMembers) {
  await serverDb.declareBrandTestOutcome(request.id, userId, 'scalp_calm');
}
await assert.rejects(
  () => serverDb.declareBrandTestOutcome(request.id, dryMembers[0], 'signal_invente'),
  /inconnu/,
  'un signal inconnu est refusé'
);
// Test en cours, membre jamais inscrit : le refus porte sur le consentement.
await serverDb.saveBeautyProfile('member-no-consent', dryProfile, 'test');
await assert.rejects(
  () => serverDb.declareBrandTestOutcome(request.id, 'member-no-consent', 'more_hydration'),
  /consentement/i,
  'déclarer sans consentement est refusé'
);

const storeReport = await serverDb.buildBrandTestReportForRequest(request.id);
const hydrationCell = storeReport.cells.find(cell => cell.need === 'hydrater_cheveux');
assert.ok(hydrationCell, 'la cellule hydratation atteint le seuil');
assert.equal(hydrationCell.participants, 34, 'les 34 déclarants sont comptés');
assert.equal(hydrationCell.positive, 30);
assert.equal(hydrationCell.negative, 4, 'les négatifs sont comptés, pas filtrés');
assert.equal(storeReport.cells.length, 1, 'la cellule cuir chevelu (12) est sous k');
assert.equal(storeReport.totals.suppressedCells, 1, 'la cellule sous k est comptée');
assert.equal(storeReport.totals.publishable, true);
assert.equal(storeReport.signals?.negative, 4);

// Le retrait retire : les déclarations du membre sortent de l'agrégat.
await serverDb.withdrawFromBrandTest(request.id, dryMembers[0]);
const afterWithdrawal = await serverDb.buildBrandTestReportForRequest(request.id);
const hydrationAfter = afterWithdrawal.cells.find(cell => cell.need === 'hydrater_cheveux');
assert.equal(hydrationAfter.participants, 33, 'le membre retiré n’est plus compté');
assert.equal(hydrationAfter.positive, 29, 'sa déclaration positive est retirée');
assert.equal(afterWithdrawal.totals.withdrawals, 1, 'le retrait reste compté');
await assert.rejects(
  () => serverDb.declareBrandTestOutcome(request.id, dryMembers[0], 'more_hydration'),
  /retiré/,
  'un membre retiré ne peut plus déclarer'
);

// Aucune donnée personnelle ne traverse le rapport.
const serializedReport = JSON.stringify(afterWithdrawal);
for (const userId of [...dryMembers, ...scalpMembers]) {
  assert.equal(serializedReport.includes(userId), false, `le rapport ne contient pas « ${userId} »`);
}

// ---------------------------------------------------------------------------
// 10. Routes : les règles sont publiques, une marque ne lit que son rapport
// ---------------------------------------------------------------------------
import http from 'node:http';

async function requestApp(path: string, init?: { method?: string; body?: unknown }) {
  const serverModule = await import('../server');
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, json, text };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const programRoute = await requestApp('/api/brand-tests/program');
assert.equal(programRoute.status, 200, 'les règles de l’espace marque sont publiques');
assert.equal(programRoute.json.cohort.allowedKeys.join(','), 'needs,archetypeIds', 'deux clés de cohorte, pas plus');
assert.ok(programRoute.json.cohort.refusedKeys.includes('emails'), 'les clés refusées sont publiées');
assert.equal(programRoute.json.publication.kThreshold, BRAND_TEST_K_THRESHOLD, 'le seuil k est publié');
assert.ok(programRoute.json.neverProvided.length >= 4, 'ce qui n’est jamais fourni est écrit');
assert.ok(
  !/placement|sponsor|exclusivit/i.test(programRoute.text),
  'l’espace marque ne vend aucun placement'
);

const applyWithoutAccount = await requestApp('/api/brand-tests/apply', {
  method: 'POST',
  body: { brandName: 'X', contactEmail: 'a@b.fr', productName: 'Soin', hypothesis: 'Une hypothèse assez longue.', cohort: { needs: ['hydrater_cheveux'] }, targetParticipants: 40, durationDays: 30 }
});
assert.equal(applyWithoutAccount.status, 401, 'on ne dépose pas de demande sans compte');

const availableWithoutAccount = await requestApp('/api/brand-tests/available');
assert.equal(availableWithoutAccount.status, 401, 'l’éligibilité exige un compte');

const reportWithoutBrand = await requestApp(`/api/brand-tests/${request.id}/report`);
assert.equal(reportWithoutBrand.status, 401, 'le rapport exige un compte marque');

const mineWithoutBrand = await requestApp('/api/brand-tests/mine');
assert.equal(mineWithoutBrand.status, 401, 'la liste des tests exige un compte marque');

const adminWithoutAccount = await requestApp('/api/admin/brand-tests');
assert.equal(adminWithoutAccount.status, 401, 'la revue des demandes exige un compte administrateur');

const unknownReport = await requestApp('/api/brand-tests/test-inexistant/report');
assert.equal(unknownReport.status, 401, 'un test inexistant n’est pas devinable sans compte marque');

await serverDb.reviewBrandTestRequest(request.id, 'closed');
await assert.rejects(
  () => serverDb.declareBrandTestOutcome(request.id, dryMembers[1], 'more_hydration'),
  /n’accepte pas de déclaration/,
  'un test clôturé n’accepte plus de déclaration'
);
assert.deepEqual(BRAND_TEST_TRANSITIONS.closed, [], 'un test clôturé ne rouvre pas');

console.log(
  `[PASS] Chantier 8.6c2 — espace marque, tests produits ciblés : ` +
    `${FORBIDDEN_COHORT_KEYS.length} clés de ciblage personnel refusées nommément, ${KNOWN_NEEDS.length} codes de besoins vivants, ` +
    `cellule à 12 participants absente du rapport (k=${BRAND_TEST_K_THRESHOLD}), 20 participants → aucune distribution publiée, ` +
    `18 positifs et 18 négatifs comptés à égalité, 7 retraits exclus, aucun identifiant dans le rapport, vocabulaire de la preuve détecté · ` +
    `store : ${storeReport.cells[0].participants} déclarants comptés dont ${storeReport.cells[0].negative} négatifs, ` +
    `membre hors cohorte refusé, retrait → ${afterWithdrawal.cells[0].participants} participants et ${afterWithdrawal.totals.withdrawals} retrait compté, ` +
    `rapport sans aucun des ${dryMembers.length + scalpMembers.length} identifiants semés · ` +
    `routes : règles publiques, 6 accès refusés sans compte.`
);
