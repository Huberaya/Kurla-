import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * D2 — LA BOUCLE QUI BOUCLE (programme « solidification du diagnostic »).
 * Acceptation visée : « diagnostic J+0 + journal (davantage de casse + cuir
 * chevelu qui démange) → à J+30, la routine DIFFÈRE de J+0 sur les points
 * causaux, et la page d'évolution les nomme ; nudge L4 validé. »
 */

const {
  buildHairEvolutionReport,
  SIGNAL_CONVERSION_RULES,
  JOURNAL_SIGNAL_LABELS,
} = await import('../src/lib/knowledge/profileEvolution');
const { computeNudges } = await import('../src/lib/retentionNudges');
const { normalizeBeautyProfile } = await import('../src/lib/beautyProfile');
const { buildHairAdvisoryRoutine } = await import('../src/lib/knowledge/hairAdvisory');

const results: Array<{ name: string; ok: boolean; note?: string }> = [];
const test = (name: string, fn: () => void) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, note: err instanceof Error ? err.message : String(err) });
  }
};

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString().slice(0, 10);

const BASE_CTX = {
  texture: 'crepue',
  style: 'naturel',
  focus: 'secheresse',
  priority: 'hydratation',
  porosity: 'moyenne',
  scalp: 'sec',
  frequency: '2x',
};

// 1) TABLE COMPLÈTE — aucun signal du journal sans réponse nommée.
test('table de conversion : chaque signal du journal a une issue', () => {
  const handled = new Set<string>(Object.keys(JOURNAL_SIGNAL_LABELS));
  for (const signal of handled) {
    const has = (SIGNAL_CONVERSION_RULES as unknown as Array<{ signal: string | null }>).some(rule => rule.signal === signal);
    assert.ok(has, `signal sans règle : ${signal}`);
  }
  const skinScope = ['spots_improving', 'spots_not_improving', 'skin_tight'];
  for (const signal of skinScope) {
    const rule = (SIGNAL_CONVERSION_RULES as unknown as Array<{ signal: string | null; reason: string }>).find(r => r.signal === signal);
    assert.ok(rule && /peau/i.test(rule.reason), `le signal peau ${signal} doit renvoyer explicitement au parcours peau`);
  }
});

// 2) SCÉNARIO D'ACCEPTATION — casse + démangeaisons à J+30.
test('J+0 → J+30 : le journal change la routine sur les points causaux', () => {
  const report = buildHairEvolutionReport(BASE_CTX, [
    { entryDate: iso(3 * DAY), signals: ['more_breakage'], breakageScore: 2 },
    { entryDate: iso(1 * DAY), signals: ['more_breakage', 'scalp_itchy'], breakageScore: 1, comfortScore: 2 },
  ], new Date(now - 30 * DAY).toISOString());

  assert.equal(report.available, true);
  const changes = report.changes as Array<{ field: string; to: string; causedBy: string; reason: string }>;
  const priority = changes.find(c => c.field === 'priority');
  const scalp = changes.find(c => c.field === 'scalp');
  assert.ok(priority && priority.to === 'Démêler sans casse', 'la casse doit devenir la priorité');
  assert.ok(scalp && /Démangeaisons/.test(scalp.to), 'les démangeaisons doivent être reprises');
  // chaque changement CITE sa cause (exigence : nommer, pas déduire en silence)
  for (const change of changes) {
    assert.ok(change.causedBy && change.causedBy.length > 3, `changement sans cause citée : ${change.field}`);
    assert.ok(change.reason.length > 40, `justification trop courte sur ${change.field}`);
  }
  // la routine DIFFÈRE réellement sur les points causaux : une étape nouvelle
  // ou une étape dont le geste/le pourquoi est recalé — la comparaison porte
  // sur le texte complet de l'étape (action + pourquoi + attente).
  const moved = (report.added as string[]).length + (report.changed as string[]).length;
  assert.ok(moved >= 2, 'le moteur na pas bougé sur les points causaux (add+changed < 2)');
  assert.match(report.after.summary, /casse/i, 'le résumé doit nommer la casse');
  assert.ok(!/démangeaisons/i.test(report.before.summary), 'le résumé J+0 ne doit pas déjà contenir les démangeaisons');
  assert.match(report.after.summary, /démangeaisons/i, 'le résumé J+30 doit nommer les démangeaisons');
  assert.ok((report.changed as string[]).some(a => a.length > 10), 'les étapes recalées doivent être nommées');
  assert.equal(report.entriesUsed, 2);
  assert.equal(report.entriesIgnored, 0);
});

// 3) LES JAUGES SEULES DÉCLENCHENT (signaux absents, scores en alerte).
test('jauge casse ≤ 2 sans signal : la règle frappe aussi', () => {
  const report = buildHairEvolutionReport(BASE_CTX, [
    { entryDate: iso(2 * DAY), breakageScore: 1 },
    { entryDate: iso(1 * DAY), breakageScore: 3 },
  ], new Date(now - 31 * DAY).toISOString());
  const changes = report.changes as Array<{ field: string; causedBy: string }>;
  const hit = changes.find(c => c.field === 'priority');
  assert.ok(hit, 'la moyenne des jauges (2) doit déclencher la règle casse');
  assert.match(hit.causedBy, /jauge/i, 'la cause doit citer la jauge, pas un signal inventé');
});

// 4) PAS D'ÉCRASEMENT SILENCIEUX — une valeur déclarée forte protège.
test('porosité déclarée : product_heavy confirme, nadore pas', () => {
  const declared = buildHairEvolutionReport(BASE_CTX, [
    { entryDate: iso(1 * DAY), signals: ['product_heavy'] },
  ], new Date(now - 30 * DAY).toISOString());
  const porosityChange = (declared.changes as Array<{ field: string }>).find(c => c.field === 'porosity');
  assert.equal(porosityChange, undefined, 'la porosité moyenne déclarée ne doit PAS être écrasée');
  const confirmations = declared.confirmations as Array<{ reason: string }>;
  assert.ok(confirmations.some(c => /porosité déclarée/i.test(c.reason)), 'la confirmation doit expliquer la protection');

  const unknown = buildHairEvolutionReport({ ...BASE_CTX, porosity: 'inconnue' }, [
    { entryDate: iso(1 * DAY), signals: ['product_heavy'] },
  ], new Date(now - 30 * DAY).toISOString());
  const hit = (unknown.changes as Array<{ field: string; to: string }>).find(c => c.field === 'porosity');
  assert.ok(hit && hit.to === 'Faible', 'porosité inconnue : le comportement observé la déduit');
});

// 5) « ROUTINE TROP LONGUE » — le raccourcisseur agit sur le moteur.
test('routine_too_long : les ajouts de confort passent en réserve', () => {
  const longCtx = { ...BASE_CTX, length: 'longue', experience: 'expert' };
  const full = buildHairAdvisoryRoutine(longCtx);
  const fullActions = [...full.morning, ...full.evening, ...full.weekly].map(s => s.action);
  assert.ok(fullActions.some(a => /pointes/i.test(a)) && fullActions.some(a => /élasticité|temps de pose/i.test(a)), 'le J+0 doit porter les ajouts longueur/expérience');

  const report = buildHairEvolutionReport(longCtx, [
    { entryDate: iso(2 * DAY), signals: ['routine_too_long'] },
  ], new Date(now - 30 * DAY).toISOString());
  const changes = report.changes as Array<{ field: string; to: string }>;
  assert.ok(changes.some(c => c.field === 'shorten' && /Resserrée/.test(c.to)), 'le champ shorten doit être annoncé');
  const afterActions = [...report.after.morning, ...report.after.evening, ...report.after.weekly];
  assert.ok(!afterActions.some(a => /pointes/i.test(a)), 'les ajouts doivent avoir disparu');
  assert.ok(!afterActions.some(a => /élasticité|temps de pose/i.test(a)), 'les ajouts doivent avoir disparu');
  const baseActions = fullActions.filter(a => !/pointes|élasticité|temps de pose/i.test(a));
  for (const action of baseActions) assert.ok(afterActions.includes(action), `le socle ne doit rien perdre : « ${action} »`);
  for (const col of ['morning', 'evening', 'weekly'] as const) {
    for (const action of (report.after as unknown as Record<string, string[]>)[col]) {
      assert.ok((report.before as unknown as Record<string, string[]>)[col].includes(action), `le raccourcissement ne doit rien ajouter en silence (${col})`);
    }
  }
  const afterTotal = ['morning', 'evening', 'weekly'].reduce((n, col) => n + (report.after as unknown as Record<string, string[]>)[col].length, 0);
  assert.ok(afterTotal < fullActions.length, 'la version resserrée doit compter moins d’étapes');
  assert.ok((report.removed as string[]).length > 0, 'le rapport doit nommer ce qui est retiré');
  assert.match(report.after.summary, /socle/, 'le résumé doit expliquer le choix du socle');
});

// 6) HONNÊTETÉ DES DATES — rien avant le diagnostic, rien de futur.
test('entrées hors fenêtre ignorées et comptées', () => {
  const report = buildHairEvolutionReport(BASE_CTX, [
    { entryDate: iso(45 * DAY), signals: ['more_breakage'] },   // avant J+0 : hors sujet
    { entryDate: new Date(now + 40 * DAY).toISOString().slice(0, 10), signals: ['reaction'] }, // futur : jamais deviné
    { entryDate: iso(2 * DAY), signals: ['scalp_itchy'] },
  ], new Date(now - 30 * DAY).toISOString());
  assert.equal(report.entriesUsed, 1);
  assert.equal(report.entriesIgnored, 2);
  assert.equal((report.changes as unknown[]).length, 1, 'seule lentrée dans la fenêtre agit');
});

// 7) PAS DE DIAGNOSTIC — la page doit être honnête, pas inventer.
test('sans instantané de diagnostic : indisponible, jamais une base inventée', () => {
  const report = buildHairEvolutionReport(null, [{ entryDate: iso(1 * DAY), signals: ['more_breakage'] }], null);
  assert.equal(report.available, false);
  assert.match(report.whyUnavailable as string, /diagnostic/i);
});

// 8) DÉTERMINISME — mêmes entrées, même rapport (le banc l'exige).
test('deux exécutions produisent un rapport identique', () => {
  const entries = [{ entryDate: iso(2 * DAY), signals: ['more_breakage', 'product_heavy'], breakageScore: 1 }];
  const at = new Date(now - 30 * DAY).toISOString();
  const a = JSON.stringify(buildHairEvolutionReport(BASE_CTX, entries, at));
  const b = JSON.stringify(buildHairEvolutionReport(BASE_CTX, entries, at));
  assert.equal(a, b);
});

// 9) NUDGE L4 — la promesse tient : lien vers la page qui existe, message honnête.
test('nudge L4 : pointe sur la page d’évolution et ne promet plus le vide', () => {
  const diagnosticAt = new Date(now - 31 * DAY).toISOString();
  const nudges = computeNudges({
    userId: 'u-evolution',
    shelf: [],
    washCycle: null,
    observations: [],
    orders: [],
    productReviews: [],
    evolution: { diagnosticAt, outcomes: [], routineCompletedTasks: [], journalEntries: [{ date: new Date(now - 2 * DAY).toISOString() }] },
  }, new Date(now)) as Array<{ kind: string; link: string; message: string; title: string }>;
  const evolution = nudges.find(n => n.kind === 'profile_evolution');
  assert.ok(evolution, 'le nudge L4 doit se déclencher sur le seul journal cheveux');
  assert.equal(evolution.link, '/account/routine-evolution');
  assert.match(evolution.title, /évolué/i);
  // La formulation ne doit plus promettre un recalage automatique du profil.
  assert.doesNotMatch(evolution.message, /ont été recalées/i);
  assert.match(evolution.message, /chaque changement est justifié/i);
});

// 10) INSTANTANÉ — le normaliseur garde la ligne (énumérations, pas de texte libre).
test('instantané de diagnostic : assaini, jamais de texte libre stocké', () => {
  const normalized = normalizeBeautyProfile({
    diagnostic: { at: '2026-09-01T10:00:00.000Z', texture: 'crepue', note: 'mon cuir chevelu gratte beaucoup, je préfère les bains d’huile maison' },
  });
  assert.equal(normalized.diagnostic?.texture, 'crepue');
  assert.equal((normalized.diagnostic as unknown as Record<string, unknown>).note, undefined, 'un champ inconnu ne doit pas entrer dans le profil');
  assert.equal(normalizeBeautyProfile({ diagnostic: { texture: 'crepue' } }).diagnostic, null, 'sans date, pas d’instantané');
  assert.equal(normalizeBeautyProfile({}).diagnostic, null);
});

// 11) LE CHEMIN EXISTE — table de routes (contrat statique, sans serveur).
test('la page /account/routine-evolution est déclarée dans la route table', () => {
  const table = readFileSync(resolve('src/lib/routeTable.tsx'), 'utf8');
  assert.match(table, /path: '\/account\/routine-evolution', auth: \{\}/);
  assert.match(table, /RoutineEvolutionPage/);
});

let failed = 0;
for (const result of results) {
  if (result.ok) {
    console.log(`  ✓ ${result.name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${result.name}\n      ${result.note}`);
  }
}
console.log(`\nD2 boucle d'évolution : ${results.length - failed}/${results.length} tests passés`);
if (failed > 0) process.exitCode = 1;
