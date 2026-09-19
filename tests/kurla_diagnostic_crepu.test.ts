/**
 * D9 — LE QUESTIONNAIRE CRÉPU 4A–4C (20/09, consigne : « le diagnostic est le
 * cœur du métier ; rédige un questionnaire efficace en expert »).
 *
 * Quatre questions manquaient pour un diagnostic précis sur crépus très
 * serrés : sous-motif (4a/4b/4c), élasticité au rinçage, largeur du cheveu,
 * passé chaleur/chimie. Ce banc verrouille les trois contrats :
 *  1. formulaire : la bonne question au bon moment (motif = crépu non locks ;
 *     chaleur/chimie = jamais à un enfant), défaut « inconnu » partout ;
 *  2. moteur : chaque réponse CHANGE quelque chose, et rien n'est affirmé
 *     quand la réponse manque (compatibilité stricte avec les réponses anciennes) ;
 *  3. honnêteté par cycle : la phrase « le masque est décidé » n'apparaît que
 *     là où le cycle a un masque à décider.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { buildHairAdvisoryRoutine, buildHairAdvisorySummary } = await import('../src/lib/knowledge/hairAdvisory');
const { deriveHairObservations } = await import('../src/lib/knowledge/diagnosticDerivations');
const { BANNED_MEDICAL_VOCAB, BANNED_RESERVED_EXPRESSIONS, BANNED_GENERIC_PHRASES } = await import('../src/lib/knowledge/aiGuardrail');

const CREPUE = { texture: 'crepue', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine', length: 'moyenne', experience: 'habituee', priority: 'hydratation' };
const allText = (ctx: any): { steps: any[]; full: string } => {
  const r: any = buildHairAdvisoryRoutine(ctx);
  const steps = [...r.morning, ...r.evening, ...r.weekly];
  const full = steps.map((x: any) => `${x.action} ${x.why} ${x.how} ${x.expect}`).join('\n') + '\n' + (buildHairAdvisorySummary(ctx) as string);
  return { steps, full };
};
const weeklyActions = (ctx: any) => ((buildHairAdvisoryRoutine(ctx) as any).weekly as any[]).map(x => x.action);

const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);

/* ── 1. FORMULAIRE ─────────────────────────────────────────────── */

test('F1 la page pose les quatre questions, aux bons profils seulement', () => {
  const src = readFileSync(new URL('../src/pages/DiagnosticHairPage.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes("current === 'pattern'"), 'question « motif crépu » absente du formulaire');
  assert.ok(src.includes("current === 'elasticity'"), 'question « élasticité » absente du formulaire');
  assert.ok(src.includes("current === 'strandWidth'"), 'question « largeur du cheveu » absente du formulaire');
  assert.ok(src.includes("current === 'chemicalHeat'"), 'question « passé chaleur/chimie » absente du formulaire');
  // motif : crépu ET non locks ; chaleur/chimie : jamais à un enfant.
  assert.ok(src.includes("const isCrepueNow = answers.texture === 'crepue' && !lockedNow;"), 'le motif doit être posé au crépu hors locks');
  assert.ok(/\.\.\.\(isKidNow \? \[\] : \['chemicalHeat'\]\)/.test(src), 'la question chaleur/chimie ne doit jamais être posée à un enfant');
});

test('F2 chaque option des nouvelles questions est explicative — et « inconnu » existe partout', () => {
  const src = readFileSync(new URL('../src/pages/DiagnosticHairPage.tsx', import.meta.url), 'utf8');
  for (const q of ["current === 'pattern'", "current === 'elasticity'", "current === 'strandWidth'", "current === 'chemicalHeat'"]) {
    const i = src.indexOf(q);
    assert.ok(i > -1);
    const block = src.slice(i, src.indexOf("{current === '", i + 10) > i ? src.indexOf("{current === '", i + 10) : src.length);
    const options = block.match(/\{ id: '/g) || [];
    assert.ok(options.length >= 4, `${q}: moins de 4 options`);
    assert.ok(block.includes('inconnu'), `${q}: pas de porte de sortie « je ne sais pas »`);
    assert.ok((block.match(/desc: '/g) || []).length >= options.length - 1, `${q}: des options sans explication`);
  }
});

test('F3 défauts « inconnu » dans HAIR_DEFAULTS — les réponses anciennes restent comprises', () => {
  const src = readFileSync(new URL('../src/pages/DiagnosticHairPage.tsx', import.meta.url), 'utf8');
  for (const k of ["coilyPattern: 'inconnu'", "elasticity: 'inconnu'", "strandWidth: 'inconnue'", "chemicalHeat: 'inconnue'"]) {
    assert.ok(src.includes(k), `HAIR_DEFAULTS sans défaut pour ${k}`);
  }
});

/* ── 2. MOTEUR : chaque réponse change quelque chose ───────────── */

test('E1 compatibilité stricte : absence = « inconnu » = comportement d’avant', () => {
  const sans = allText({ ...CREPUE });
  const avec = allText({ ...CREPUE, coilyPattern: 'inconnu', elasticity: 'inconnu', strandWidth: 'inconnue', chemicalHeat: 'inconnue' });
  assert.equal(avec.full, sans.full, 'les défauts « inconnu » ne doivent rien changer au texte');
  assert.ok(!/Motif 4|Élasticité|Cheveu fin|Cheveu épais|vierges de chaleur/.test(sans.full), 'une ligne D9 fuitte sans les réponses');
});

test('E2 élasticité « mou » : le masque de force est DÉCIDÉ (plus de « ou »)', () => {
  const acts = weeklyActions({ ...CREPUE, elasticity: 'mou' });
  assert.ok(acts.includes('Masque de force, puis hydratation'), `weekly = ${acts.join(' | ')}`);
  const { full } = allText({ ...CREPUE, elasticity: 'mou' });
  assert.match(full, /force d’abord, hydratation ensuite, en alternance/);
  assert.match(full, /10 à 15 minutes, pas une heure/);
});

test('E3 élasticité « cassant » : hydratation d’abord — l’inverse du réflexe catalogue', () => {
  const acts = weeklyActions({ ...CREPUE, elasticity: 'cassant' });
  assert.ok(acts.some(a => /^Masque d’hydratation d’abord/.test(a)), acts.join(' | '));
  const { full } = allText({ ...CREPUE, elasticity: 'cassant' });
  assert.match(full, /le masque de force n’arrivera que si le test change/);
});

test('E4 élasticité « ressort » : PAS de cure systématique — le moteur sait aussi ne rien prescrire', () => {
  const acts = weeklyActions({ ...CREPUE, elasticity: 'ressort' });
  assert.ok(acts.some(a => /^Masque hydratant hebdomadaire/.test(a)), acts.join(' | '));
  const { full } = allText({ ...CREPUE, elasticity: 'ressort' });
  assert.match(full, /réflexe de catalogue, pas un diagnostic/);
});

test('E5 locks : la décision protéinée ne s’applique pas, et le résumé ne la prétend pas', () => {
  const LOCKS = { ...CREPUE, texture: 'locksee', style: 'locks', priority: 'cuir_chevelu' };
  const acts = weeklyActions({ ...LOCKS, elasticity: 'mou' });
  assert.ok(acts.includes('Masque : hydratation, ou force'), 'le cycle locks garde son masque-rinçage');
  const { full } = allText({ ...LOCKS, elasticity: 'mou' });
  assert.ok(!/routine a donc d[ée]cid[ée]/.test(full), 'le résumé locks ne doit rien prétendre de décidé');
  assert.match(full, /espacement des retwists et un rinçage long/, 'la réponse locks à l’élasticité molle doit être dite');
});

test('E6 largeur du cheveu : fine = alléger, épaisse = enrichir — et rien sinon', () => {
  const fin = allText({ ...CREPUE, strandWidth: 'fine' }).full;
  assert.match(fin, /huile l[ée]g[èe]re plut[ôo]t qu’un beurre/);
  assert.match(fin, /il s’arrache quand on insiste/);
  const epais = allText({ ...CREPUE, strandWidth: 'epaisse' }).full;
  assert.match(epais, /le beurre riche est le bon choix/);
  assert.match(epais, /les textures riches et les temps de pose longs ne sont pas un exc[èe]s/);
  const rien = allText({ ...CREPUE, strandWidth: 'moyenne' }).full;
  assert.ok(!/Cheveu fin|beurre riche est le bon choix/.test(rien), 'moyen = routine standard, sans phrase');
});

test('E7 motif : 4b/4c quadrillent le démêlage, 4a non — et le motif disparaît sur locks', () => {
  const qc = allText({ ...CREPUE, coilyPattern: '4c' }).full;
  assert.match(qc, /quadriller la t[êe]te en sections/);
  assert.match(qc, /le shrinkage efface une grande partie de la longueur visible/);
  const qa = allText({ ...CREPUE, coilyPattern: '4a' }).full;
  assert.ok(!/quadriller la t[êe]te en sections/.test(qa), 'le 4A n’a pas besoin du quadrillage');
  assert.match(qa, /atout — la d[ée]finition se joue/);
  const locks = allText({ ...CREPUE, texture: 'locksee', style: 'locks', coilyPattern: '4c', priority: 'casse' }).full;
  assert.ok(!/Motif 4/.test(locks), 'plus de question de définition une fois la lock formée');
});

test('E8 chaleur/chimie : chaque réponse ajoute SA règle, « aucun » n’ajoute rien', () => {
  const heatA = weeklyActions({ ...CREPUE, chemicalHeat: 'chaleur' });
  assert.ok(heatA.some(a => /^Chaleur : la r[èe]gle des trois/.test(a)), 'chaleur déclarée sans étape');
  assert.ok(!heatA.some(a => /^D[ée]marcation/.test(a)), 'démarcation sans produit = erreur');
  const prodW = weeklyActions({ ...CREPUE, chemicalHeat: 'produit' });
  assert.ok(prodW.some(a => /^D[ée]marcation/.test(a)), 'produit déclaré sans étape démarcation');
  assert.ok(!prodW.some(a => /^Chaleur/.test(a)), 'chaleur non déclarée = étape chaleur interdite');
  const both = weeklyActions({ ...CREPUE, chemicalHeat: 'les_deux' });
  assert.ok(both.some(a => /^Chaleur/.test(a)) && both.some(a => /^D[ée]marcation/.test(a)));
  const { full } = allText({ ...CREPUE, chemicalHeat: 'les_deux' });
  assert.match(full, /jamais les deux la m[êe]me semaine sur la m[êe]me m[èe]che/);
  const aucun = weeklyActions({ ...CREPUE, chemicalHeat: 'aucun' });
  assert.ok(!aucun.some(a => /^Chaleur|^D[ée]marcation/.test(a)), '« aucun » doit ajouter ZÉRO étape…');
  assert.match(allText({ ...CREPUE, chemicalHeat: 'aucun' }).full, /vierges de chaleur et de produit.*prot[èe]ge ce capital/s, '…mais une phrase de récompense');
});

test('E9 le cycle protectrice, la perruque et la transition tiennent la promesse aussi', () => {
  for (const ctx of [
    { ...CREPUE, style: 'braids', chemicalHeat: 'chaleur' },
    { ...CREPUE, style: 'wig', chemicalHeat: 'produit' },
    { ...CREPUE, texture: 'defrisee', chemicalHeat: 'les_deux' },
  ]) {
    const acts = weeklyActions(ctx);
    if (ctx.chemicalHeat === 'chaleur') assert.ok(acts.some(a => /^Chaleur/.test(a)), `${ctx.style}: résumé promet, cycle ne montre pas`);
    if (ctx.chemicalHeat === 'produit') assert.ok(acts.some(a => /^D[ée]marcation/.test(a)), `${ctx.style}:idem`);
    if (ctx.chemicalHeat === 'les_deux') assert.ok(acts.some(a => /^Chaleur/.test(a)) && acts.some(a => /^D[ée]marcation/.test(a)), `${ctx.style}:idem`);
  }
  // transition : le résumé reste observationnel (son cycle n'a pas de masque)
  const trans = allText({ ...CREPUE, texture: 'defrisee', elasticity: 'mou' }).full;
  assert.ok(!/routine a donc d[ée]cid[ée]/.test(trans), 'la transition ne doit pas prétendre décider un masque qu’elle ne pose pas');
  assert.match(trans, /prochain lavage complet/);
});

test('E10 enfant : la garde moteur ignore même une réponse chimie détournée', () => {
  const kid = { ...CREPUE, style: 'enfant', priority: 'demelage_enfant', chemicalHeat: 'les_deux', elasticity: 'mou', coilyPattern: '4c' };
  const acts = weeklyActions(kid);
  assert.ok(!acts.some(a => /^Chaleur|^D[ée]marcation/.test(a)), 'étape chimie sur un enfant');
  assert.ok(!acts.some(a => /Masque de force/.test(a)), 'décision protéinée hors cycle enfant');
  const { full } = allText(kid);
  assert.ok(!/Chaleur : la r[èe]gle|vierges de chaleur/.test(full), 'le résumé enfant ne doit rien dire de la question non posée');
});

test('E11 dérivation : le 4C a SA phrase de shrinkage (et pas deux)', () => {
  const c4 = (deriveHairObservations as any)({ ...CREPUE, priority: 'pousse', coilyPattern: '4c' });
  const ids = c4.map((x: any) => x.id);
  assert.ok(ids.includes('pousse_longueur_4c'), 'variante 4C absente');
  assert.ok(!ids.includes('pousse_longueur'), 'les deux phrases de shrinkage ne doivent pas coexister');
  const base = (deriveHairObservations as any)({ ...CREPUE, priority: 'pousse', coilyPattern: 'inconnu' });
  const idsB = base.map((x: any) => x.id);
  assert.ok(idsB.includes('pousse_longueur') && !idsB.includes('pousse_longueur_4c'), 'sans motif 4C, l’ancienne phrase s’applique');
});

test('E12 vocabulaire : les nouvelles phrases ne glissent ni promesse ni jargon interdit', () => {
  const banned = [...BANNED_MEDICAL_VOCAB, ...BANNED_RESERVED_EXPRESSIONS, ...BANNED_GENERIC_PHRASES].map(v => v.toLowerCase());
  for (const ctx of [
    { ...CREPUE, coilyPattern: '4c', elasticity: 'mou', strandWidth: 'fine', chemicalHeat: 'les_deux' },
    { ...CREPUE, texture: 'locksee', style: 'locks', elasticity: 'cassant', chemicalHeat: 'produit', priority: 'casse' },
    { ...CREPUE, style: 'enfant', priority: 'demelage_enfant', elasticity: 'ressort' },
  ]) {
    const { full } = allText(ctx);
    const low = full.toLowerCase();
    for (const b of banned) assert.ok(!low.includes(b), `banni « ${b} » sur ${ctx.style}/${ctx.priority}`);
    assert.ok(full.length > 800, 'profil complet trop maigre');
  }
});

test('E13 longueur des actions : les nouvelles étapes restent lisibles sur mobile', () => {
  for (const chem of ['aucun', 'chaleur', 'produit', 'les_deux'] as const) {
    for (const a of weeklyActions({ ...CREPUE, chemicalHeat: chem })) {
      assert.ok(a.length <= 70, `action > 70 : ${a}`);
    }
  }
});

test('E14 tuyau unifié : une seule traduction réponses→contexte, partagée serveur + page résultat', () => {
  const engine = readFileSync(new URL('../src/lib/knowledge/hairAdvisory.ts', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../src/server/routes/recommendations.ts', import.meta.url), 'utf8');
  const resultModel = readFileSync(new URL('../src/lib/diagnosticResult.ts', import.meta.url), 'utf8');
  const i = engine.indexOf('export function buildHairAdvisoryCtx');
  assert.ok(i > -1, 'le builder partagé a disparu du moteur');
  const body = engine.slice(i, engine.indexOf('\n}', i + 40));
  for (const key of ['coilyPattern', 'elasticity', 'strandWidth', 'chemicalHeat']) {
    assert.ok(body.includes(`str('${key}')`), `le builder ne transmet plus « ${key} »`);
  }
  assert.ok(route.includes('buildHairAdvisoryCtx(answers'), 'la route serveur ne passe plus par le builder partagé');
  assert.ok(resultModel.includes('buildHairAdvisoryCtx(answers'), 'la page résultat ne passe plus par le builder partagé');
  // Interdiction formalisée : pas de re-liste blanche locale (c'est le piège de 20/09).
  assert.ok(!/const advisoryCtx = isHair ? \{/.test(route), 'la route serveur a recréé une liste blanche locale');
  assert.ok(!/const hairAdvisoryCtx: HairAdvisoryContext = \{/.test(resultModel), 'la page résultat a recréé une liste blanche locale');
});

/* ── exécute ────────────────────────────────────────────────────── */
let pass = 0;
const failed: string[] = [];
for (const [name, fn] of tests) {
  try { fn(); pass += 1; console.log(`  ✓ ${name}`); }
  catch (e: any) { failed.push(name); console.log(`  ✗ ${name}\n      ${String(e.message).slice(0, 200)}`); }
}
console.log(`\nD9 questionnaire crépu : ${pass}/${tests.length} tests passés`);
if (failed.length) process.exitCode = 1;
