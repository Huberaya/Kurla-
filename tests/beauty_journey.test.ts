/**
 * CHANTIER 8.4 — Beauty Journey.
 *
 * Le récit est une fonction pure : ce banc la teste directement, sans base ni
 * réseau, sur trois situations — rien, trop peu, assez. L'enjeu n'est pas
 * d'afficher des courbes mais de ne rien affirmer de faux : sous trois mesures,
 * la tendance doit rester « non déterminée » ; une variation d'un point sur dix
 * est du bruit, pas une évolution ; une comparaison de photos à trois jours
 * d'écart ne veut rien dire.
 *
 * S'y ajoute une garde éditoriale : le récit ne doit contenir ni promesse de
 * résultat, ni vocabulaire médical.
 */
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.KURLA_TEST_NO_SERVER = 'true';

const { buildBeautyJourney } = await import('../src/lib/beautyJourney');
const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');

const DAY = 86_400_000;
const ORIGIN = Date.parse('2026-05-01T10:00:00.000Z');
const at = (days: number) => new Date(ORIGIN + days * DAY).toISOString();

function journalEntry(days: number, scores: Record<string, number>) {
  return {
    id: `journal-${days}`,
    entryDate: at(days).slice(0, 10),
    signals: [],
    productsUsed: [],
    createdAt: at(days),
    ...scores
  } as any;
}

function photo(days: number) {
  return { id: `photo-${days}`, storagePath: `p/${days}`, mimeType: 'image/jpeg', sizeBytes: 1000, consentAt: at(days), createdAt: at(days) };
}

// ---------------------------------------------------------------------------
// 1. Rien : le parcours le dit, et n'invente pas de tendance
// ---------------------------------------------------------------------------
const empty = buildBeautyJourney({ journal: [], photos: [], profileHistory: [], feedback: [], loyaltyEvents: [], level: 1 });
assert.equal(empty.eventCount, 0, 'aucun fait, aucun événement');
assert.equal(empty.comparison, null, 'pas de photo, pas de comparaison');
assert.ok(empty.milestones.every(milestone => !milestone.reached), 'aucun jalon ne doit être atteint sans activité');
assert.ok(empty.gaps.length >= 2, 'les manques doivent être énoncés');
assert.ok(empty.narrative.join(' ').includes('commence'), 'le récit doit dire que le parcours n’a pas commencé');
assert.ok(empty.disclaimers.length >= 2, 'les réserves d’usage sont permanentes');
assert.ok(empty.evolution.every(metric => metric.trend === 'indetermine'), 'sans mesure, aucune tendance');

// ---------------------------------------------------------------------------
// 2. Trop peu : une mesure ne fait pas une tendance
// ---------------------------------------------------------------------------
const thin = buildBeautyJourney({
  journal: [journalEntry(0, { hydrationScore: 3 })],
  photos: [photo(0)],
  profileHistory: [],
  feedback: [],
  loyaltyEvents: [{ kind: 'journal_entry', axis: 'pratique', points: 6, occurredAt: at(0) }],
  level: 1
});
const thinHydration = thin.evolution.find(metric => metric.metric === 'hydrationScore')!;
assert.equal(thinHydration.readable, false, 'une seule mesure n’est pas lisible');
assert.equal(thinHydration.trend, 'indetermine', 'pas de tendance sur une mesure');
assert.equal(thinHydration.delta, null, 'pas d’écart calculé sur une mesure');
assert.ok(thin.gaps.some(gap => gap.includes('au moins 3')), 'le manque de mesures doit être expliqué');
assert.equal(thin.comparison, null, 'une seule photo ne permet aucune comparaison');

// ---------------------------------------------------------------------------
// 3. Assez : la tendance est calculée, et seulement là
// ---------------------------------------------------------------------------
const rich = buildBeautyJourney({
  journal: [
    journalEntry(0, { hydrationScore: 3, breakageScore: 8 }),
    journalEntry(14, { hydrationScore: 5, breakageScore: 7 }),
    journalEntry(28, { hydrationScore: 6, breakageScore: 6 }),
    journalEntry(42, { hydrationScore: 7, breakageScore: 5 })
  ],
  photos: [photo(0), photo(30)],
  profileHistory: [],
  feedback: [{ id: 'f1', signal: 'démangeaisons', observedAt: at(10), createdAt: at(10) } as any],
  loyaltyEvents: [
    { kind: 'profile_completed', axis: 'connaissance', points: 40, occurredAt: at(0) },
    ...Array.from({ length: 12 }, (_, index) => ({ kind: 'routine_task_done', axis: 'pratique', points: 4, occurredAt: at(index + 1) }))
  ],
  level: 3
});

const hydration = rich.evolution.find(metric => metric.metric === 'hydrationScore')!;
assert.equal(hydration.readable, true, 'quatre mesures : la tendance est lisible');
assert.equal(hydration.trend, 'hausse', '3 → 7 est une hausse déclarée');
assert.equal(hydration.delta, 4, 'l’écart est celui des valeurs déclarées');
assert.equal(hydration.first?.value, 3, 'la première mesure');
assert.equal(hydration.last?.value, 7, 'la dernière mesure');

const breakage = rich.evolution.find(metric => metric.metric === 'breakageScore')!;
assert.equal(breakage.trend, 'baisse', '8 → 5 est une baisse déclarée — le mot « amélioration » n’est pas employé');

assert.ok(rich.comparison, 'deux photos à 30 jours : comparaison possible');
assert.equal(rich.comparison!.daysApart, 30, 'l’écart est calculé en jours');

const reachedCodes = rich.milestones.filter(milestone => milestone.reached).map(milestone => milestone.code);
for (const expected of ['premier_pas', 'premiere_observation', 'trente_jours', 'comparaison_possible', 'routine_tenue', 'niveau_3']) {
  assert.ok(reachedCodes.includes(expected), `le jalon « ${expected} » doit être atteint`);
}

// Chronologie : complète et du plus récent au plus ancien
assert.ok(rich.timeline.length >= 18, 'toutes les sources doivent apparaître dans la chronologie');
const dates = rich.timeline.map(event => Date.parse(event.date));
assert.ok(dates.every((value, index) => index === 0 || value <= dates[index - 1]), 'la chronologie doit être triée du plus récent au plus ancien');

// ---------------------------------------------------------------------------
// 4. Le bruit n'est pas une tendance
// ---------------------------------------------------------------------------
const noisy = buildBeautyJourney({
  journal: [journalEntry(0, { hydrationScore: 5 }), journalEntry(10, { hydrationScore: 6 }), journalEntry(20, { hydrationScore: 5 })],
  photos: [],
  profileHistory: [],
  feedback: [],
  loyaltyEvents: [],
  level: 1
});
const noisyHydration = noisy.evolution.find(metric => metric.metric === 'hydrationScore')!;
assert.equal(noisyHydration.trend, 'stable', 'un point d’écart sur dix est du bruit, pas une évolution');

// Deux photos trop proches : pas de comparaison
const closePhotos = buildBeautyJourney({
  journal: [], photos: [photo(0), photo(3)], profileHistory: [], feedback: [], loyaltyEvents: [], level: 1
});
assert.equal(closePhotos.comparison, null, 'deux photos à trois jours d’écart ne permettent pas de comparaison');

// ---------------------------------------------------------------------------
// 5. Garde éditoriale : ni promesse, ni vocabulaire médical
// ---------------------------------------------------------------------------
const FORBIDDEN = ['garanti', 'garantit', 'guérison', 'guérir', 'traitement', 'médicament', 'diagnostic médical', 'résultat assuré', 'efficacité prouvée', 'cliniquement prouvé'];
for (const scenario of [empty, thin, rich, noisy]) {
  const text = [...scenario.narrative, ...scenario.disclaimers, ...scenario.gaps].join(' ').toLowerCase();
  for (const word of FORBIDDEN) {
    assert.ok(!text.includes(word), `le récit ne doit jamais employer « ${word} »`);
  }
}
// Chaque valeur chiffrée du récit est attribuée à une déclaration
assert.ok(
  rich.narrative.some(sentence => sentence.includes('déclaré')),
  'les évolutions doivent être présentées comme des déclarations, pas comme des mesures'
);
assert.ok(
  empty.disclaimers.some(line => line.includes('pas un avis médical')),
  'la réserve médicale doit être explicite'
);

// ---------------------------------------------------------------------------
// 6. Garde d'honnêteté : mutation volontaire
// ---------------------------------------------------------------------------
// Si la tendance était calculée sur deux mesures, ce test échouerait.
const twoPoints = buildBeautyJourney({
  journal: [journalEntry(0, { hydrationScore: 3 }), journalEntry(20, { hydrationScore: 9 })],
  photos: [], profileHistory: [], feedback: [], loyaltyEvents: [], level: 1
});
assert.equal(
  twoPoints.evolution.find(metric => metric.metric === 'hydrationScore')!.trend,
  'indetermine',
  'un écart spectaculaire sur deux mesures ne doit pas produire de tendance'
);

// ---------------------------------------------------------------------------
// 7. HTTP : le parcours est privé
// ---------------------------------------------------------------------------
async function requestApp(path: string) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`);
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const response = await requestApp('/api/beauty-journey');
assert.equal(response.status, 401, 'le parcours doit refuser une requête sans jeton');

// ---------------------------------------------------------------------------
// 8. Bout en bout : les faits réels alimentent le parcours
// ---------------------------------------------------------------------------
await serverDb.initialize([]);
const userId = '66666666-6666-4666-8666-666666666666';
await serverDb.applyLoyaltyEvent(userId, 'profile_completed', 'journey-profile', 'journey:profile');
await serverDb.applyLoyaltyEvent(userId, 'scan_performed', '3760000000000', 'journey:scan');
await serverDb.createProgressJournalEntry(userId, { note: 'Sonde parcours', metrics: { hydrationScore: 4 } });

const journey = await serverDb.getBeautyJourney(userId);
assert.ok(journey.eventCount >= 3, 'les faits enregistrés doivent apparaître dans le parcours');
assert.ok(journey.timeline.some(event => event.label.includes('Scan')), 'le scan doit apparaître dans la chronologie');
assert.ok(journey.milestones.some(milestone => milestone.code === 'premier_pas' && milestone.reached), 'le premier jalon doit être atteint');
assert.equal(await serverDb.getBeautyJourneyPersistence(), 'server_fallback', 'sans Supabase, l’origine des données doit être annoncée');

console.log(
  `[PASS] Chantier 8.4 — narration testée sur 5 scénarios (vide, une mesure, bruit, données riches, bout en bout) : ` +
    `${rich.eventCount} faits chronologiques, tendance ${hydration.trend} ${hydration.first?.value}→${hydration.last?.value}/10, ` +
    `comparaison à ${rich.comparison?.daysApart} jours, ${reachedCodes.length} jalons, aucune promesse ni vocabulaire médical.`
);
