/**
 * BANC — Conseil riche du diagnostic cheveux (couche `knowledge/hairAdvisory`)
 * ============================================================================
 *
 * Miroir du banc `kurla_diagnostic_advisory` (peau) : KURLA doit être le
 * meilleur conseiller sur les DEUX pôles — le résultat du diagnostic cheveux
 * renseigne, informe, forme et éduque, sans jamais inventer ni donner
 * d’avis médical. Cheveux = niveau référence : ce banc verrouille le contrat
 * complet du conseil cheveux.
 *
 * Contrat verrouillé :
 *  1. Richesse — chaque étape porte pourquoi / comment / à attendre (jamais vide) ;
 *  2. Contexte — la routine s’adapte au profil déclaré (casse, locks,
 *     protectrice, porosité faible, cuir chevelu, enfant) ;
 *  3. Leçons — 1 à 3 modules pédagogiques sélectionnés sur les priorités,
 *     chacun avec sa source ;
 *  4. Observations — J+7 / J+14 / J+30, questions concrètes et spécifiques ;
 *  5. Résumé — composé des réponses déclarées, jamais inventé (inconnu = inconnu) ;
 *  6. Formulation — aucune phrase réservée aux autres modules (styleFit,
 *     needsHub), aucun vocabulaire médical ; le résumé IA, s’il existe,
 *     n’est jamais écrasé ;
 *  7. Séparation des pôles — aucun contenu peau dans le conseil cheveux,
 *     et réciproquement ;
 *  8. Déterminisme — mêmes réponses, même résultat.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_hair_advisory.test.ts
 */

import assert from 'node:assert/strict';
import { BANNED_MEDICAL_VOCAB, BANNED_RESERVED_EXPRESSIONS } from '../src/lib/knowledge/aiGuardrail';
import {
  buildDiagnosticResultModel,
  type DiagnosticRoutineStep
} from '../src/lib/diagnosticResult';
import {
  buildHairAdvisoryRoutine,
  buildHairAdvisorySummary,
  pickHairLessons,
  pickHairObservations,
  type HairAdvisoryContext
} from '../src/lib/knowledge/hairAdvisory';
import { ADVISORY_LOOP_NOTE } from '../src/lib/knowledge/advisoryLoop';

let checks = 0;
const ok = async (label: string, fn: () => void | Promise<void>) => {
  await fn();
  checks++;
  console.log(`  ✓ ${label}`);
};

/** Listes importées de la porte D3 (source unique) : la porte et le banc
 * partagent exactement le même vocabulaire interdit. */
const RESERVED_ELSEWHERE = BANNED_RESERVED_EXPRESSIONS;
const MEDICAL_VOCAB = BANNED_MEDICAL_VOCAB;

const ALL_STEPS = (model: ReturnType<typeof buildDiagnosticResultModel>): DiagnosticRoutineStep[] =>
  [...model.morning, ...model.evening, ...model.weekly];

const ALL_TEXT = (model: ReturnType<typeof buildDiagnosticResultModel>): string[] => [
  model.summary,
  ...ALL_STEPS(model).flatMap(step => [step.action, step.why, step.how || '', step.expect || '']),
  ...model.lessons.flatMap(lesson => [lesson.title, lesson.lesson, lesson.source]),
  ...model.observations.map(obs => obs.question),
  model.advisoryLoop || ''
];

const PROFILE_FULL: Record<string, unknown> = {
  texture: 'crepue',
  style: 'naturel',
  priority: 'hydratation',
  porosity: 'forte',
  scalp: 'normal',
  frequency: '1x_semaine',
  budget: '40_70'
};

async function main() {
  console.log('Banc conseil diagnostic cheveux — réponses riches, vérifiées, pédagogiques\n');

  const modelFull = buildDiagnosticResultModel({ answers: PROFILE_FULL, result: null, products: [], isSkin: false });

  // --- 1. Richesse -----------------------------------------------------------
  await ok('richesse : chaque étape porte pourquoi, comment et à attendre', () => {
    const steps = ALL_STEPS(modelFull);
    assert.ok(steps.length >= 6, `routine incomplète : ${steps.length} étapes`);
    for (const slot of ['morning', 'evening', 'weekly'] as const) {
      assert.ok(modelFull[slot].length >= 1, `colonne vide : ${slot}`);
    }
    for (const step of steps) {
      assert.ok(step.action.length >= 8, `action trop courte : « ${step.action} »`);
      assert.ok(step.why.length >= 40, `pourquoi trop court : « ${step.action} »`);
      assert.ok(step.how && step.how.length >= 40, `comment manquant : « ${step.action} »`);
      assert.ok(step.expect && step.expect.length >= 40, `à attendre manquant : « ${step.action} »`);
    }
  });

  // --- 2. Contexte : la routine suit le profil déclaré ------------------------
  await ok('locks : la priorité « définir les boucles » ne définit rien — cycle locks intact (test utilisateur 19/09)', () => {
    const model = buildDiagnosticResultModel({
      answers: { texture: 'locksee', style: 'locks', priority: 'definition', focus: 'locks_pousse', porosity: 'forte', scalp: 'demangeaisons', frequency: '2x', length: 'moyenne', experience: 'habituee' },
      result: {}, products: [], isSkin: false,
    } as any);
    const steps = ALL_STEPS(model);
    const actions = steps.map(step => step.action).join(' | ');
    assert.ok(actions.includes('Conditionner sans défaire les locks'), 'les locks reçoivent le conditionneur sans peigne');
    assert.ok(!/démêler|outil à dents|pré-démêler aux doigts|passer un peigne/i.test(actions), 'aucune action locks ne prescrit un démêlage');
    for (const step of steps) {
      assert.ok(!/démêlage plus facile|démêlage se fait avant/.test(`${step.why} ${step.how} ${step.expect}`), `le vocabulaire du peigne n'a rien à faire ici : ${step.action}`);
    }
    const summary = model.summary;
    assert.ok(!summary.includes('Votre priorité est définir les boucles'), 'la ligne de priorité générique ne doit pas contredire le cycle');
    assert.match(summary, /ne s.’applique pas|n’y a plus de boucle|il n.y a plus de boucle/iu, 'la priorité inapplicable est dite, pas tue');
    assert.match(summary, /À J\+30, notez une observation précise — hydratation des locks, cuir chevelu, tension aux racines/u);
  });

  await ok('locks + casse : le pourquoi parle de racines et pointes, jamais de nœuds', () => {
    const routine = buildHairAdvisoryRoutine({ texture: 'locksee', style: 'locks', priority: 'casse', scalp: 'normal', frequency: '1x_semaine' } as any);
    const all = [...routine.morning, ...routine.evening, ...routine.weekly];
    assert.ok(!all.some(step => /emmêlé|chaque nœud/i.test(step.why + step.expect)), 'ni lavage ni masque ne doivent promettre un démêlage à une lock');
    assert.ok(all.some(step => /tension du retwist|racines.*pointes|pointes.*racines/i.test(step.why)), 'la casse sur locks est nommée à sa source (racine/pointes)');
  });

  await ok('naturel + casse : le chemin démêlage reste intact (garde de non-régression)', () => {
    const routine = buildHairAdvisoryRoutine({ texture: 'crepue', style: 'naturel', priority: 'casse', scalp: 'normal', frequency: '1x_semaine' } as any);
    const all = [...routine.morning, ...routine.evening, ...routine.weekly];
    const detangle = all.filter(step => /démêl/i.test(step.action + step.why));
    assert.ok(detangle.length >= 2, 'la casse en cheveux naturels doit continuer à traverser la routine');
  });

  await ok('contexte : priorité casse → démêlage protégé en tête de routine', () => {
    const model = buildDiagnosticResultModel({
      answers: { texture: 'crepue', style: 'naturel', priority: 'casse', porosity: 'moyenne', scalp: 'normal', frequency: '2x_semaine', budget: '40_70' },
      result: null, products: [], isSkin: false
    });
    const wash = ALL_STEPS(model).filter(step => step.why.toLowerCase().includes('démêlage') || step.action.toLowerCase().includes('démêler'));
    assert.ok(wash.length >= 2, 'la casse doit traverser la routine (démêlage, conditionneur)');
    assert.ok(model.lessons.some(lesson => lesson.key === 'hair_lesson_fibre'), 'leçon fibre attendue');
    assert.ok(model.observations[0].question.toLowerCase().includes('démêlage') || model.observations[0].question.toLowerCase().includes('peigne'), 'observation J+7 orientée casse');
  });

  await ok('contexte : locks → cycle lavage/entretien, sans LCO ni retwist des longueurs', () => {
    const model = buildDiagnosticResultModel({
      answers: { texture: 'locksee', style: 'locks', priority: 'pousse', porosity: 'inconnue', scalp: 'normal', frequency: '1x_semaine', budget: '70_100' },
      result: null, products: [], isSkin: false
    });
    const text = ALL_STEPS(model).flatMap(step => `${step.action} ${step.why} ${step.how || ''}`).join(' ').toLowerCase();
    assert.ok(text.includes('retwist') || text.includes('palm rolling'), 'le cycle lock doit être présent');
    assert.ok(!text.includes('lco'), 'pas de LCO sur locks');
    assert.ok(model.lessons.some(lesson => lesson.key === 'hair_lesson_locks'), 'leçon locks attendue');
    assert.ok(model.lessons.some(lesson => lesson.key === 'hair_lesson_pousse'), 'leçon pousse attendue');
  });

  await ok('contexte : coiffure protectrice + cuir chevelu sensible → entretien sous la coiffure', () => {
    const model = buildDiagnosticResultModel({
      answers: { texture: 'frisee', style: 'braids', priority: 'cuir_chevelu', porosity: 'inconnue', scalp: 'demangeaisons', frequency: '1x_semaine', budget: 'moins_40' },
      result: null, products: [], isSkin: false
    });
    const between = model.evening.map(step => `${step.action} ${step.why} ${step.how || ''}`).join(' ').toLowerCase();
    assert.ok(between.includes('aqueuse') || between.includes('aqueux'), 'l’entretien sous tresses doit être aqueux/léger');
    assert.ok(model.weekly.some(step => step.action.toLowerCase().includes('nettoyage profond')), 'nettoyage profond occasionnel attendu');
    assert.ok(model.lessons.some(lesson => lesson.key === 'hair_lesson_scalp' || lesson.key === 'hair_lesson_protective'), 'leçon cuir chevelu ou protectrice attendue');
  });

  await ok('contexte : porosité faible → textures légères, sans LCO', () => {
    const model = buildDiagnosticResultModel({
      answers: { texture: 'frisee', style: 'naturel', priority: 'definition', porosity: 'faible', scalp: 'normal', frequency: 'debutante', budget: '40_70' },
      result: null, products: [], isSkin: false
    });
    const wash = model.morning.map(step => `${step.action} ${step.why}`).join(' ').toLowerCase();
    assert.ok(wash.includes('léger'), 'la porosité faible appelle des textures légères');
    assert.ok(!wash.includes('lco'), 'pas de scellement LCO sur porosité faible');
  });

  // --- 3. Leçons --------------------------------------------------------------
  await ok('leçons : sélection bornée (≤3), sourcée, sans doublon', () => {
    const loaded: HairAdvisoryContext = {
      texture: 'crepue', style: 'braids', priority: 'casse',
      porosity: 'forte', scalp: 'demangeaisons', frequency: 'irreguliere', budget: '70_100'
    };
    const lessons = pickHairLessons(loaded);
    assert.ok(lessons.length >= 1 && lessons.length <= 3, `nombre de leçons hors contrat : ${lessons.length}`);
    assert.equal(new Set(lessons.map(l => l.key)).size, lessons.length, 'doublon de leçons');
    for (const lesson of lessons) {
      assert.ok(lesson.title.length > 0 && lesson.lesson.length > 40 && lesson.source.length > 0, 'leçon incomplète');
      assert.ok(lesson.source.includes('KURLA Cheveux'), 'source non sourcée sur la base KURLA Cheveux');
    }
    assert.ok(lessons.some(l => l.key === 'hair_lesson_fibre'), 'priorité casse → leçon fibre en tête');
    assert.ok(lessons.some(l => l.key === 'hair_lesson_scalp'), 'cuir chevelu sensible → leçon cuir chevelu');
  });

  await ok('leçons : priorité pousse → leçon honnête (aucun produit n’accélère la pousse)', () => {
    const lessons = pickHairLessons({ priority: 'pousse' });
    const pousse = lessons.find(l => l.key === 'hair_lesson_pousse');
    assert.ok(pousse, 'leçon pousse attendue');
    assert.ok(/aucun produit n’accélère la pousse/i.test(pousse.lesson), 'l’honnêteté sur la pousse est verrouillée');
  });

  // --- 4. Observations ---------------------------------------------------------
  await ok('observations : J+7 / J+14 / J+30, spécifiques au thème principal', () => {
    const days = modelFull.observations.map(o => o.day);
    assert.deepEqual(days, ['7', '14', '30'], 'dates d’observations');
    const scalp = buildDiagnosticResultModel({
      answers: { texture: 'crepue', style: 'naturel', priority: 'cuir_chevelu', porosity: 'inconnue', scalp: 'pellicules', frequency: '1x_semaine', budget: 'moins_40' },
      result: null, products: [], isSkin: false
    });
    assert.ok(scalp.observations.some(o => o.question.toLowerCase().includes('cuir chevelu')), 'observations cuir chevelu attendues');
  });

  // --- 5. Résumé ----------------------------------------------------------------
  await ok('résumé : composé des réponses déclarées, jamais inventé', () => {
    const summary = buildHairAdvisorySummary({
      texture: 'crepue', style: 'naturel', priority: 'casse', porosity: 'forte', scalp: 'sec', frequency: 'debutante', budget: '40_70'
    });
    assert.ok(summary.toLowerCase().includes('crépue'), 'texture déclarée reprise');
    assert.ok(summary.toLowerCase().includes('démêler sans casse'), 'priorité déclarée reprise');
    assert.ok(/porosité forte/i.test(summary), 'porosité déclarée reprise');
    assert.ok(/cuir chevelu/i.test(summary), 'cuir chevelu déclaré repris');
    assert.ok(/accélère/i.test(buildHairAdvisorySummary({ priority: 'pousse' })), 'honnêteté pousse dans le résumé');
  });

  await ok('résumé : profil tout inconnu → rien n’est déduit, la routine reste complète', () => {
    const unknownAnswers: Record<string, unknown> = {
      texture: 'inconnue', style: 'inconnue', priority: 'inconnue',
      porosity: 'inconnue', scalp: 'inconnue', frequency: 'inconnue', budget: 'inconnue'
    };
    const model = buildDiagnosticResultModel({ answers: unknownAnswers, result: null, products: [], isSkin: false });
    assert.ok(/pas encore caractéris/i.test(model.summary), 'le résumé doit dire que la texture est inconnue, pas l’inventer');
    const steps = ALL_STEPS(model);
    assert.ok(steps.length >= 5, 'routine incomplète sur profil inconnu');
    for (const step of steps) {
      assert.ok(step.why.length >= 40 && step.how && step.how.length >= 40, `étape incomplète sur profil inconnu : ${step.action}`);
    }
    assert.ok(model.lessons.length >= 1, 'profil inconnu : au moins une leçon d’entretien');
    assert.ok(model.lessons.some(l => l.key === 'hair_lesson_entretien'), 'profil inconnu → leçon entretien');
  });

  // --- 6. Formulation ------------------------------------------------------------
  await ok('formulation : aucune phrase réservée aux autres modules, aucun vocabulaire médical', () => {
    const profiles: Array<Record<string, unknown>> = [
      PROFILE_FULL,
      { texture: 'crepue', style: 'naturel', priority: 'casse', porosity: 'moyenne', scalp: 'normal', frequency: '2x_semaine', budget: '40_70' },
      { texture: 'locksee', style: 'locks', priority: 'pousse', porosity: 'inconnue', scalp: 'normal', frequency: '1x_semaine', budget: '70_100' },
      { texture: 'frisee', style: 'braids', priority: 'cuir_chevelu', porosity: 'inconnue', scalp: 'demangeaisons', frequency: '1x_semaine', budget: 'moins_40' },
      { texture: 'crepue', style: 'wig', priority: 'hydratation', porosity: 'faible', scalp: 'irritation', frequency: 'irreguliere', budget: 'premium' },
      { texture: 'crepue', style: 'enfant', priority: 'demelage_enfant', porosity: 'inconnue', scalp: 'sec', frequency: 'debutante', budget: 'moins_40' },
      { texture: 'defrisee', style: 'naturel', priority: 'definition', porosity: 'inconnue', scalp: 'pellicules', frequency: 'irreguliere', budget: '40_70' }
    ];
    for (const answers of profiles) {
      const model = buildDiagnosticResultModel({ answers, result: null, products: [], isSkin: false });
      const text = ALL_TEXT(model).join('\n');
      for (const reserved of RESERVED_ELSEWHERE) {
        assert.ok(!text.includes(reserved), `phrase réservée reprise par le conseil : « ${reserved} »`);
      }
      for (const word of MEDICAL_VOCAB) {
        assert.ok(!text.toLowerCase().includes(word.toLowerCase()), `vocabulaire médical dans le conseil : « ${word} »`);
      }
    }
  });

  await ok('résumé IA : s’il existe, il n’est jamais écrasé par le résumé local', () => {
    const model = buildDiagnosticResultModel({
      answers: PROFILE_FULL,
      result: { summary: 'Résumé IA de contrôle.', recommendedRoutine: '', reason: '', steps: [], warnings: [], productHandles: [], requiresHumanReview: false, generatedWithAI: true, source: 'test' } as any,
      products: [], isSkin: false
    });
    assert.equal(model.summary, 'Résumé IA de contrôle.', 'le résumé IA doit primer sur le résumé local');
    assert.ok(model.lessons.length >= 1, 'les leçons restent présentes même avec un résumé IA');
    assert.equal(model.generatedWithAI, true, 'badge IA conservé');
  });

  // --- 7. Suivi & boucle ---------------------------------------------------------
  await ok('suivi : observations et note de boucle L4 présentes côté cheveux', () => {
    assert.ok(modelFull.followUp.firstObservation.includes('cuir chevelu'), 'première observation adaptée aux cheveux');
    assert.equal(modelFull.advisoryLoop, ADVISORY_LOOP_NOTE, 'note de boucle L4 commune');
    assert.equal(modelFull.routineTitles.morning, 'Jour de lavage');
    assert.equal(modelFull.routineTitles.evening, 'Entre deux lavages');
    assert.equal(modelFull.routineTitles.weekly, 'À faire chaque semaine');
  });

  // --- 8. Séparation des pôles -----------------------------------------------------
  await ok('séparation : aucun contenu peau dans le conseil cheveux (et réciproquement)', () => {
    const hairText = ALL_TEXT(modelFull).join('\n').toLowerCase();
    assert.ok(!hairText.includes('hpi'), 'contenu HPI (peau) dans le conseil cheveux');
    assert.ok(!hairText.includes('spf'), 'contenu SPF (peau) dans le conseil cheveux');
    for (const lesson of modelFull.lessons) assert.ok(lesson.key.startsWith('hair_lesson_'), `leçon non-cheveux : ${lesson.key}`);
    const skinModel = buildDiagnosticResultModel({
      answers: { skinType: 'mixte', sensitivity: 'moyenne', skinConcerns: ['taches'], skinObjectives: ['attenuer_taches'] },
      result: null, products: [], isSkin: true
    });
    const skinText = ALL_TEXT(skinModel).join('\n').toLowerCase();
    assert.ok(!skinText.includes('lco'), 'contenu LCO (cheveux) dans le conseil peau');
    assert.ok(!skinText.includes('locks'), 'contenu locks (cheveux) dans le conseil peau');
    for (const lesson of skinModel.lessons) assert.ok(!lesson.key.startsWith('hair_lesson_'), 'leçon cheveux contaminant le pôle peau');
  });

  // --- 9. Déterminisme ---------------------------------------------------------------
  await ok('déterminisme : mêmes réponses, même résultat (deux fois de suite)', () => {
    const a = buildDiagnosticResultModel({ answers: PROFILE_FULL, result: null, products: [], isSkin: false });
    const b = buildDiagnosticResultModel({ answers: PROFILE_FULL, result: null, products: [], isSkin: false });
    assert.deepEqual(a, b, 'deux constructions diffèrent — le conseil serait aléatoire');
    const r1 = buildHairAdvisoryRoutine(PROFILE_FULL as HairAdvisoryContext);
    const r2 = buildHairAdvisoryRoutine(PROFILE_FULL as HairAdvisoryContext);
    assert.deepEqual(r1, r2, 'routine non déterministe');
  });

  console.log(`\n${checks} checks conseil diagnostic cheveux validés.`);
}

main().catch(error => {
  console.error('\nÉCHEC banc kurla_hair_advisory :', error);
  process.exit(1);
});
