import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * D6 — PARITÉ PEAU (programme « solidification du diagnostic »).
 * Acceptation visée : « banc peau miroir du banc cheveux vert ». Le banc
 * vérifie d'abord que le CONTRAT est identique des deux côtés (mêmes touches
 * de rapport), puis la table de conversion peau, le scénario J+30, le
 * garde-fou IA peau (miroir de D3) et l'instantané de diagnostic cutané.
 */

const {
  buildHairEvolutionReport,
  buildSkinEvolutionReport,
  SKIN_EVOLUTION_RULES,
  skinSignalLabel,
} = await import('../src/lib/knowledge/profileEvolution');
const { validateSkinAiOutput, BANNED_MEDICAL_VOCAB } = await import('../src/lib/knowledge/aiGuardrail');
const { buildSkinAdvisoryRoutine, buildSkinFallback, buildSkinEngineSteps, skinExfoliationBlocked, buildSkinPromptNote } = await import('../src/lib/knowledge/skinAdvisory');
const { normalizeBeautyProfile, SKIN_CONCERN_OPTIONS } = await import('../src/lib/beautyProfile');

const results: Array<{ name: string; ok: boolean; note?: string }> = [];
const test = (name: string, fn: () => void) => {
  try { fn(); results.push({ name, ok: true }); }
  catch (err) { results.push({ name, ok: false, note: err instanceof Error ? err.message : String(err) }); }
};

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString().slice(0, 10);

const SKIN_J0 = {
  skinType: 'normale',
  sensitivity: 'faible',
  hydrationLevel: 'normale',
  skinConcerns: ['grain_irregulier'],
  skinObjectives: ['affiner_grain'],
  spfUsage: 'jamais',
};

// 1) CONTRAT DE PARITÉ — le rapport peau a EXACTEMENT les mêmes touches que
//    le rapport cheveux. C'est ça, « même plateforme, standards communs ».
test('contrat : rapport peau = rapport cheveux, touches identiques', () => {
  const at = new Date(now - 31 * DAY).toISOString();
  const hair = buildHairEvolutionReport({ texture: 'crepue', style: 'naturel' }, [{ entryDate: iso(2 * DAY), signals: ['more_breakage'] }], at);
  const skin = buildSkinEvolutionReport(SKIN_J0, [{ date: iso(2 * DAY), concerns: ['rougeurs'], feelingScore: 2 }], at);
  assert.equal(hair.available, true);
  assert.equal(skin.available, true);
  const hairKeys = Object.keys(hair).sort().join('|');
  const skinKeys = Object.keys(skin).sort().join('|');
  assert.equal(skinKeys, hairKeys, 'un domaine ne doit ni ajouter ni retirer une touche du contrat');
  const hairChangeKeys = Object.keys(hair.changes[0] ?? {}).sort().join('|');
  const skinChangeKeys = Object.keys(skin.changes[0] ?? {}).sort().join('|');
  assert.ok(hairChangeKeys && skinChangeKeys, 'les deux rapports doivent produire des changements structurés');
  assert.equal(skinChangeKeys, hairChangeKeys, 'un changement doit être décrit par les mêmes champs des deux côtés');
  for (const sub of ['before', 'after'] as const) {
    assert.equal(Object.keys(skin[sub]).sort().join('|'), Object.keys(hair[sub]).sort().join('|'), `la structure ${sub} diverge entre domaines`);
  }
});

// 2) TABLE COMPLÈTE — chaque préoccupation que le journal peut recevoir a une
//    issue nommée (régle miroir du test cheveux « aucun signal sans réponse »).
test('table peau : les 12 préoccupations du journal ont toutes une issue', () => {
  const ids = SKIN_CONCERN_OPTIONS.map((o: { value: string }) => o.value).filter((v: string) => v !== 'inconnue' && v !== 'unknown' && v !== '').slice(0, 12);
  assert.equal(ids.length, 12);
  const handled = new Set(SKIN_EVOLUTION_RULES.map((r: { signal: string }) => r.signal));
  for (const id of ids) {
    assert.ok(handled.has(id), `préoccupation du journal sans règle : ${id}`);
    const rule = SKIN_EVOLUTION_RULES.find((r: { signal: string }) => r.signal === id);
    assert.ok(rule.reason.length > 40, `justification trop courte pour ${id}`);
  }
  // les alias du journal cheveux (que D2 renvoyait explicitement ici) sont bien reçus
  assert.ok(handled.has('spots_not_improving') && handled.has('skin_tight'));
});

// 3) SCÉNARIO D'ACCEPTATION — J+0 grain + exfoliation OK ; J+30 rougeurs +
//    inconfort → le moteur RETIRE l'exfoliation et bascule en barrière.
test('J+0 → J+30 : la routine peau diffère sur les points causaux', () => {
  const report = buildSkinEvolutionReport(SKIN_J0, [
    { date: iso(9 * DAY), concerns: ['rougeurs'], feelingScore: 2 },
    { date: iso(2 * DAY), concerns: ['rougeurs', 'secheresse'], feelingScore: 1 },
  ], new Date(now - 30 * DAY).toISOString());
  assert.equal(report.available, true);
  const changes = report.changes as Array<{ field: string; to: string; causedBy: string }>;
  assert.ok(changes.length >= 2, 'rougeurs + sécheresse + jauge doivent produire plusieurs ajustements');
  for (const change of changes) assert.ok(change.causedBy && change.causedBy.length > 3, `changement sans cause citée : ${change.field}`);
  // le geste exfoliant du J+0 ne peut pas survivre à une barrière en alerte
  assert.match((report.after as any).weekly.join(' '), /aucune exfoliation/i, 'le moteur doit refuser l’exfoliation recalculée');
  assert.ok((report.removed as string[]).length + (report.changed as string[]).length + (report.added as string[]).length > 0, 'aucune étape ne bouge — la boucle peau est morte');
  assert.match(report.after.summary, /rougeurs/i, 'le résumé doit reprendre la préoccupation née du journal');
  assert.ok((report.changes as Array<{ field: string }>).some(c => c.field === 'skinObjectives'), 'la jauge inconfort doit ajouter un objectif de barrière');
  assert.ok(report.entriesUsed === 2 && report.entriesIgnored === 0);
});

// 4) UN JOURNAL QUI VA BIEN NE RIEN CHANGE — et le dit.
test('confort ≥ 4, aucune préoccupation : rien n’est ajouté, c’est confirmé', () => {
  const report = buildSkinEvolutionReport(SKIN_J0, [
    { date: iso(4 * DAY), feelingScore: 5 },
    { date: iso(1 * DAY), feelingScore: 4 },
  ], new Date(now - 30 * DAY).toISOString());
  assert.equal((report.changes as unknown[]).length, 0, 'un ressenti bon ne doit jamais déclencher de modification');
  assert.equal((report.added as unknown[]).length, 0);
  assert.equal((report.removed as unknown[]).length, 0);
  assert.equal((report.changed as unknown[]).length, 0);
  assert.ok((report.confirmations as Array<{ reason: string }>).some(c => /régularité/i.test(c.reason)), 'la confirmation doit expliquer que continuer suffit');
});

// 5) PAS D'EMPILEMENT — une préoccupation déjà déclarée n'est pas ajoutée deux fois.
test('déjà déclaré au diagnostic : confirmation, pas doublon', () => {
  const base = { ...SKIN_J0, skinConcerns: ['secheresse'] };
  const report = buildSkinEvolutionReport(base, [{ date: iso(1 * DAY), concerns: ['secheresse'] }], new Date(now - 30 * DAY).toISOString());
  assert.equal((report.changes as unknown[]).length, 0);
  const nextConcerns = (report.nextContext as any).skinConcerns as string[];
  assert.equal(nextConcerns.filter(c => c === 'secheresse').length, 1, 'la préoccupation ne doit pas être dupliquée');
  assert.ok((report.confirmations as Array<{ reason: string }>).some(c => /depuis le départ/i.test(c.reason)));
  // le résumé avant/après ne doit pas diverger sur un profil inchangé
  assert.equal(report.after.summary.includes('deux temps'), report.before.summary.includes('deux temps'));
});

// 6) LES SIGNALS PEAU DU JOURNAL CHEVEUX ARRIVENT À BORD (promesse de D2 tenue).
test('alias du journal cheveux : skin_tight ajuste la routine peau', () => {
  const report = buildSkinEvolutionReport(SKIN_J0, [], new Date(now - 30 * DAY).toISOString(), ['skin_tight']);
  const changes = report.changes as Array<{ field: string; to: string; causedBy: string }>;
  assert.equal(changes.length, 1);
  assert.match(changes[0].to, /Sécheresse/i);
  assert.match(changes[0].causedBy, /Peau qui tire/i, 'la cause doit citer le libellé du signal, pas son id');
  const again = buildSkinEvolutionReport(SKIN_J0, [], null, ['spots_improving']);
  assert.equal((again.changes as unknown[]).length, 0);
  assert.ok((again.confirmations as Array<{ reason: string }>).some(c => /Progression confirmée/i.test(c.reason)));
});

// 7) FENÊTRE ET HONNÊTETÉ DES DATES (miroir du test cheveux).
test('entrées hors fenêtre ignorées ; sans diagnostic peau : indisponible', () => {
  const report = buildSkinEvolutionReport(SKIN_J0, [
    { date: iso(45 * DAY), concerns: ['rides'] },
    { date: new Date(now + 40 * DAY).toISOString().slice(0, 10), concerns: ['cernes'] },
    { date: iso(2 * DAY), concerns: ['rides'] },
  ], new Date(now - 30 * DAY).toISOString());
  assert.equal(report.entriesUsed, 1);
  assert.equal(report.entriesIgnored, 2);
  const none = buildSkinEvolutionReport(null, [{ date: iso(1 * DAY), concerns: ['rides'] }], null);
  assert.equal(none.available, false);
  assert.match(none.whyUnavailable as string, /peau/i);
  // déterminisme : même entrée, même rapport (le contrat capillaire s'applique ici aussi)
  const a = JSON.stringify(report);
  const b = JSON.stringify(buildSkinEvolutionReport(SKIN_J0, [
    { date: iso(45 * DAY), concerns: ['rides'] },
    { date: new Date(now + 40 * DAY).toISOString().slice(0, 10), concerns: ['cernes'] },
    { date: iso(2 * DAY), concerns: ['rides'] },
  ], new Date(now - 30 * DAY).toISOString()));
  assert.equal(a, b);
});

// 8) GARDE-FOU IA PEAU (miroir D3) — la porte rejette ce que le moteur refuse.
test('validateSkinAiOutput : la porte peau tient le programme', () => {
  const ctx = { ...SKIN_J0 };
  const gate = { engineActions: buildSkinEngineSteps(ctx), exfoliationBlocked: skinExfoliationBlocked(ctx), anchors: ['normale', 'grain_irregulier'] };
  assert.equal(gate.exfoliationBlocked, false, 'J+0 : grain régulier, exfoliation permise');
  const fallback = buildSkinFallback(ctx, ['grain_irregulier']);
  // L'IA imite le moteur SANS recycler la clause d'exclusion du fallback :
  // « sans diagnostic médical » est banni du texte servi par l'IA (la porte
  // ne s'applique pas au déterministe, qui en assume la mention).
  const faithful = { summary: fallback.summary, recommendedRoutine: fallback.recommendedRoutine, reason: 'Les étapes suivent le cycle du profil déclaré : type de peau, sensibilité, préoccupations et SPF — chaque geste répond à une réponse du questionnaire.', steps: fallback.steps, warnings: [] };
  const pass = validateSkinAiOutput(faithful, gate);
  assert.ok(pass.ok, `la sortie fidèle au moteur doit passer : ${pass.reasons.join(' ; ')}`);

  const medical = { ...faithful, summary: `${faithful.summary} En cas de dermatite persistante, un traitement médical sera nécessaire.` };
  const banned = validateSkinAiOutput(medical, gate);
  assert.equal(banned.ok, false);
  assert.match(banned.reasons.join(' '), /vocabulaire banni/);

  const offProgram = { ...faithful, steps: ['Dormer huit heures par nuit.', 'Boire deux litres d’eau.', 'Prendre des compléments alimentaires.'] };
  const drift = validateSkinAiOutput(offProgram, gate);
  assert.equal(drift.ok, false, 'les étapes hors-programme doivent être rejetées');

  const fragile = { ...SKIN_J0, skinConcerns: ['rougeurs', 'sensibilite'], sensitivity: 'elevee' };
  const fragileGate = { engineActions: buildSkinEngineSteps(fragile), exfoliationBlocked: skinExfoliationBlocked(fragile), anchors: ['sensible'] };
  assert.equal(fragileGate.exfoliationBlocked, true);
  const exfoliant = { ...faithful, summary: `${faithful.summary} Une exfoliation douce deux fois par semaine lissera le grain.` };
  const rejected = validateSkinAiOutput(exfoliant, fragileGate);
  assert.equal(rejected.ok, false);
  assert.match(rejected.reasons.join(' '), /exfoliation/i, 'l’exfoliation sur barrière fragile doit être refusée par la porte');
});

// 9) LE MOTEUR PARLE À L'IA (note de prompt) — pas de routine flottante.
test('note de prompt peau : profil, priorités, référence moteur, refus documenté', () => {
  const note = buildSkinPromptNote(SKIN_J0, ['grain_irregulier']);
  assert.match(note, /Référence moteur des étapes/);
  assert.match(note, /Priorités du questionnaire/);
  const fragile = buildSkinPromptNote({ skinType: 'sensible', skinConcerns: ['rougeurs'] }, []);
  assert.match(fragile, /Exfoliation refusée par le moteur/);
});

// 10) INSTANTANÉ PEAU — la boucle a son point de départ, assaini.
test('instantané : les réponses peau sont stockées en énumérations seules', () => {
  const normalized = normalizeBeautyProfile({
    diagnostic: {
      atSkin: '2026-09-01T10:00:00.000Z',
      skinType: 'mixte',
      skinConcerns: 'secheresse,taches',
      skinObjectives: 'hydrater',
      noteLibre: 'mon visage tire beaucoup en ce moment'
    }
  });
  const snap = normalized.diagnostic as any;
  assert.equal(snap.skinType, 'mixte');
  assert.equal(snap.skinConcerns, 'secheresse,taches');
  assert.equal(snap.noteLibre, undefined, 'le texte libre ne doit pas entrer dans le profil');
  assert.equal(snap.at, '', 'sans diagnostic cheveux, la moitié capillaire reste vide');
  const hairOnly = normalizeBeautyProfile({ diagnostic: { at: '2026-09-01T10:00:00.000Z', texture: 'crepue' } }).diagnostic as any;
  assert.equal(hairOnly.skinType, '', 'et réciproquement');
});

// 11) LE FIL EST CÂBLÉ — route évolutive bi-domaine et entrée depuis le journal peau.
test('câblage : evolution bi-domaine servie, journal peau reliée', () => {
  const route = readFileSync(resolve('src/server/routes/adaptiveRoutines.ts'), 'utf8');
  assert.match(route, /skinReport/);
  assert.match(route, /domain === 'skin'/);
  assert.match(route, /getSkinJournalEntries/);
  const journalPage = readFileSync(resolve('src/pages/SkinJournalPage.tsx'), 'utf8');
  assert.match(journalPage, /\/account\/routine-evolution/);
  const page = readFileSync(resolve('src/pages/RoutineEvolutionPage.tsx'), 'utf8');
  assert.match(page, /Routines peau/);
  assert.match(page, /\/diagnostic\/peau/);
  // le label de signal doit exister pour les alias (aucun id brut affiché)
  assert.match(skinSignalLabel('skin_tight'), /Peau qui tire/);
});

// 12) PARITÉ DES GARDES — le vocabulaire banni peau est le même garde commun.
test('garde-fou : la liste bannie est partagée, pas dupliquée', () => {
  assert.ok(BANNED_MEDICAL_VOCAB.length >= 8, 'le vocabulaire médical banni doit rester la référence unique');
  const guardrail = readFileSync(resolve('src/lib/knowledge/aiGuardrail.ts'), 'utf8');
  const uses = guardrail.match(/findBannedIn\(/g)?.length ?? 0;
  assert.ok(uses >= 2, 'la porte peau doit réutiliser findBannedIn, pas réécrire une liste');
  assert.doesNotMatch(guardrail, /const SKIN_BANNED[A-Z_]*\s*=/, 'aucune liste parallèle bannie tolérée');
});

let failed = 0;
for (const result of results) {
  if (result.ok) console.log(`  ✓ ${result.name}`);
  else { failed += 1; console.log(`  ✗ ${result.name}\n      ${result.note}`); }
}
console.log(`\nD6 parité peau : ${results.length - failed}/${results.length} tests passés`);
if (failed > 0) process.exitCode = 1;
