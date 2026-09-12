/**
 * BANC — Conseil riche du diagnostic peau (couche `knowledge/skinAdvisory`)
 * ============================================================================
 *
 * Constat qui a motivé ce banc (mesuré, 13/09/2026) : la routine du résultat
 * était identique pour tous les profils, les justifications d’étape étaient
 * génériques (voire placeholder), et la base de connaissance n’était exploitée
 * que par un bloc statique — le résultat donnait l’impression d’un
 * questionnaire vide de substance.
 *
 * KURLA doit être le meilleur conseiller : le résultat doit renseigner,
 * informer, former et éduquer — sans jamais inventer ni donner d’avis médical.
 *
 * Ce banc verrouille le contrat du conseil :
 *  1. Richesse — chaque étape porte pourquoi / comment / à attendre (jamais vide) ;
 *  2. Contexte — la routine s’adapte au profil déclaré (grasse vs sèche sensible) ;
 *  3. Leçons — 1 à 3 modules pédagogiques sélectionnés sur les préoccupations,
 *     chacun avec sa source ;
 *  4. Observations — J+7 / J+14 / J+30, questions concrètes et spécifiques ;
 *  5. Résumé — composé des réponses déclarées, jamais inventé (inconnu = inconnu) ;
 *  6. Formulation — aucune phrase réservée aux autres modules, aucun vocabulaire
 *     médical ; le résumé IA, s’il existe, n’est jamais écrasé ;
 *  7. Cheveux inchangé — le parcours cheveux ne reçoit ni leçons ni observations ;
 *  8. Déterminisme — mêmes réponses, même résultat.
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_diagnostic_advisory.test.ts
 */

import assert from 'node:assert/strict';
import {
  buildDiagnosticResultModel,
  type DiagnosticRoutineStep
} from '../src/lib/diagnosticResult';
import {
  buildSkinAdvisoryRoutine,
  buildSkinAdvisorySummary,
  pickSkinLessons,
  pickSkinObservations
} from '../src/lib/knowledge/skinAdvisory';

let checks = 0;
const ok = async (label: string, fn: () => void | Promise<void>) => {
  await fn();
  checks++;
  console.log(`  ✓ ${label}`);
};

/** Formulations produites par d’autres modules — le conseil ne les redit pas. */
const RESERVED_ELSEWHERE = [
  'texture fluide',
  'seule zone réellement accessible',
  'occlusif de la formule',
  'retirez la perruque la nuit',
  'lavage clarifiant régulier',
  'consultez un dermatologue',
  'avis dermatologique',
  'doivent être montrés à un dermatologue',
  'Rétinol + AHA',
  'Rétinol + BHA',
  'Rétinol + vitamine C',
  'AHA + BHA'
];

/** Vocabulaire médical — le conseil est cosmétique, jamais médical. */
const MEDICAL_VOCAB = ['traitement', 'guérir', 'guérison', 'prescription', 'ordonnance', 'maladie', 'thérapie', 'pathologie', 'diagnostic médical'];

const ALL_STEPS = (model: ReturnType<typeof buildDiagnosticResultModel>): DiagnosticRoutineStep[] =>
  [...model.morning, ...model.evening, ...model.weekly];

const ALL_TEXT = (model: ReturnType<typeof buildDiagnosticResultModel>): string[] => [
  model.summary,
  ...ALL_STEPS(model).flatMap(step => [step.action, step.why, step.how || '', step.expect || '']),
  ...model.lessons.flatMap(lesson => [lesson.title, lesson.lesson, lesson.source]),
  ...model.observations.map(obs => obs.question),
  model.advisoryLoop || ''
];

async function main() {
  console.log('Banc conseil diagnostic peau — réponses riches, vérifiées, pédagogiques\n');

  const profileMarks: Record<string, unknown> = {
    skinType: 'mixte',
    sensitivity: 'moyenne',
    skinConcerns: ['taches', 'sensibilite'],
    skinObjectives: ['attenuer_taches', 'apaiser'],
    hyperpigmentationTendency: 'frequente',
    spfUsage: 'parfois',
    hydrationLevel: 'confortable'
  };
  const modelMarks = buildDiagnosticResultModel({ answers: profileMarks, result: null, products: [], isSkin: true });

  // --- 1. Richesse : chaque étape porte pourquoi / comment / à attendre -----
  await ok('richesse : chaque étape de routine porte pourquoi, comment et à attendre', () => {
    const steps = ALL_STEPS(modelMarks);
    assert.ok(steps.length >= 6, `routine incomplète : ${steps.length} étapes`);
    for (const step of steps) {
      assert.ok(step.action.length >= 8, `étape sans action lisible : ${step.action}`);
      assert.ok(step.why.length >= 40, `justification trop courte pour « ${step.action} » : ${step.why}`);
      assert.ok(step.how && step.how.length >= 40, `usage « comment » manquant ou trop court pour « ${step.action} »`);
      assert.ok(step.expect && step.expect.length >= 40, `horizon « à attendre » manquant ou trop court pour « ${step.action} »`);
    }
  });

  // --- 2. Contexte : la routine s’adapte au profil déclaré ------------------
  await ok('contexte : routine grasse/imperfections ≠ routine très sèche/sensible', () => {
    const oily = buildSkinAdvisoryRoutine({ skinType: 'grasse', hydrationLevel: 'brillante', skinConcerns: ['imperfections'], skinObjectives: ['reduire_imperfections'], acne: 'reguliere' });
    const drySensitive = buildSkinAdvisoryRoutine({ skinType: 'tres_seche', sensitivity: 'elevee', sensitivities: ['parfum'], skinConcerns: ['secheresse', 'sensibilite'], skinObjectives: ['hydrater', 'renforcer_barriere'] });
    const oilyText = JSON.stringify(oily);
    const dryText = JSON.stringify(drySensitive);
    assert.notEqual(oilyText, dryText, 'deux profils opposés produisent la même routine');
    assert.ok(/calmer sans abîmer/i.test(oilyText), 'routine imperfections : le conseil « calmer sans assécher » doit être présent');
    assert.ok(/un seul actif à la fois/i.test(dryText), 'routine très sensible : la méthode du changement unique doit être présente');
    assert.ok(/encore légèrement humide/i.test(dryText), 'routine sèche : l’hydratation sur peau humide doit être présente');
  });

  await ok('contexte : SPF non quotidien → le SPF devient le point d’attention', () => {
    const daily = buildSkinAdvisoryRoutine({ spfUsage: 'quotidien' });
    const lapsed = buildSkinAdvisoryRoutine({ spfUsage: 'parfois' });
    assert.ok(/votre carnation/i.test(JSON.stringify(lapsed.morning)), 'profil SPF irrégulier : le pas du matin insiste sur l’adaptation carnation');
    assert.notEqual(JSON.stringify(daily.morning[2].action), JSON.stringify(lapsed.morning[2].action), 'le pas SPF doit se distinguer selon l’usage déclaré');
  });

  // --- 3. Leçons : sélectionnée sur les préoccupations, sourcée -------------
  await ok('leçons : 1 à 3 modules, sélectionnés sur les préoccupations, chacun sourcé', () => {
    const lessons = modelMarks.lessons;
    assert.ok(lessons.length >= 1 && lessons.length <= 3, `nombre de leçons hors contrat : ${lessons.length}`);
    for (const lesson of lessons) {
      assert.ok(lesson.lesson.length >= 100, `leçon trop courte : ${lesson.title}`);
      assert.ok(lesson.source.length >= 10, `leçon sans source : ${lesson.title}`);
    }
    const keys = lessons.map(lesson => lesson.key);
    assert.ok(keys.includes('hpi'), 'profil taches/HPI : la leçon HPI doit être présente');
    assert.ok(new Set(keys).size === keys.length, 'leçons dupliquées');

    const oilyLessons = pickSkinLessons({ skinType: 'grasse', skinConcerns: ['imperfections', 'points_noirs'], skinObjectives: ['reduire_imperfections', 'affiner_grain'] });
    assert.ok(oilyLessons.some(lesson => lesson.key === 'imperfections'), 'profil imperfections : la leçon correspondante doit être présente');

    const emptyLessons = pickSkinLessons({});
    assert.ok(emptyLessons.length >= 1, 'profil sans priorité : le diagnostic doit quand même enseigner (au moins une leçon)');
  });

  // --- 4. Observations : J+7 / J+14 / J+30, spécifiques au thème -----------
  await ok('observations : trois jalons J+7 / J+14 / J+30, questions concrètes', () => {
    const obs = modelMarks.observations;
    assert.equal(obs.length, 3, `attendu 3 observations, obtenu ${obs.length}`);
    assert.deepEqual(obs.map(o => o.day), ['J+7', 'J+14', 'J+30'], 'jalons hors contrat');
    for (const o of obs) assert.ok(o.question.length >= 30, `observation trop vague : ${o.question}`);
    assert.ok(/marques/i.test(obs[1].question), 'profil HPI : l’observation J+14 doit porter sur les marques');

    const dryObs = pickSkinObservations({ skinType: 'seche', skinConcerns: ['secheresse'] });
    assert.ok(/tiraillement/i.test(JSON.stringify(dryObs)), 'profil sécheresse : les observations doivent porter sur les tiraillements');
  });

  // --- 5. Résumé : personnalisé, jamais inventé ----------------------------
  await ok('résumé : compose les réponses déclarées, annonce la réévaluation J+30', () => {
    assert.ok(/mixte/i.test(modelMarks.summary), 'résumé ne redit pas le type déclaré');
    assert.ok(/J\+30/.test(modelMarks.summary), 'résumé n’annonce pas la boucle de réévaluation');
    assert.ok(/taches/i.test(modelMarks.summary), 'résumé ne cite pas les priorités déclarées');
  });

  await ok('résumé : profil tout inconnu → rien n’est déduit, la routine reste complète', () => {
    const unknownAnswers: Record<string, unknown> = {
      skinType: 'inconnu', sensitivity: 'inconnu', spfUsage: 'inconnu',
      hydrationLevel: 'inconnu', hyperpigmentationTendency: 'inconnu',
      skinConcerns: ['inconnu'], skinObjectives: ['inconnu'], sensitivities: ['inconnu']
    };
    const model = buildDiagnosticResultModel({ answers: unknownAnswers, result: null, products: [], isSkin: true });
    assert.ok(/pas encore caractéris/i.test(model.summary), 'résumé doit dire que le type est inconnu, pas l’inventer');
    const steps = ALL_STEPS(model);
    assert.ok(steps.length >= 6, 'routine incomplète sur profil inconnu');
    for (const step of steps) {
      assert.ok(step.why.length >= 40 && step.how && step.how.length >= 40, `étape incomplète sur profil inconnu : ${step.action}`);
    }
    assert.ok(model.lessons.length >= 1, 'profil inconnu : au moins une leçon d’entretien');
  });

  // --- 6. Formulation : ni phrases réservées, ni vocabulaire médical --------
  await ok('formulation : aucune phrase réservée aux autres modules, aucun vocabulaire médical', () => {
    const profiles: Array<Record<string, unknown>> = [
      profileMarks,
      { skinType: 'grasse', skinConcerns: ['imperfections', 'points_noirs', 'grain_irregulier'], skinObjectives: ['reduire_imperfections', 'affiner_grain'] },
      { skinType: 'sensible', sensitivity: 'elevee', sensitivities: ['parfum', 'retinol'], skinConcerns: ['sensibilite', 'rougeurs'], skinObjectives: ['apaiser', 'renforcer_barriere'] },
      { skinType: 'mature', skinConcerns: ['rides', 'teint_terne'], skinObjectives: ['prevenir_age', 'eclat'] },
      { skinConcerns: ['inconnu'], skinObjectives: ['simplifier'] }
    ];
    for (const answers of profiles) {
      const model = buildDiagnosticResultModel({ answers, result: null, products: [], isSkin: true });
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
      answers: profileMarks,
      result: { summary: 'Résumé IA de contrôle.', recommendedRoutine: '', reason: '', steps: [], warnings: [], productHandles: [], requiresHumanReview: false, generatedWithAI: true, source: 'test' } as any,
      products: [], isSkin: true
    });
    assert.equal(model.summary, 'Résumé IA de contrôle.', 'le résumé IA doit primer sur le résumé local');
    assert.ok(model.lessons.length >= 1, 'les leçons restent présentes même avec un résumé IA');
  });

  // --- 7. Cheveux inchangé ----------------------------------------------------
  await ok('parcours cheveux : ni leçons ni observations, routine inchangée', () => {
    const hairModel = buildDiagnosticResultModel({
      answers: { texture: 'boucle', priority: 'hydrater_cheveux', budget: 'moins_40' },
      result: null, products: [], isSkin: false
    });
    assert.deepEqual(hairModel.lessons, [], 'le parcours cheveux ne reçoit pas les leçons peau');
    assert.deepEqual(hairModel.observations, [], 'le parcours cheveux ne reçoit pas les observations peau');
    assert.equal(hairModel.advisoryLoop, null, 'le parcours cheveux ne reçoit pas la note de boucle');
    for (const step of ALL_STEPS(hairModel)) assert.ok(step.why.length > 0, `étape cheveux sans justification : ${step.action}`);
  });

  // --- 8. Déterminisme -------------------------------------------------------
  await ok('déterminisme : mêmes réponses, même résultat (deux fois de suite)', () => {
    const a = buildDiagnosticResultModel({ answers: profileMarks, result: null, products: [], isSkin: true });
    const b = buildDiagnosticResultModel({ answers: profileMarks, result: null, products: [], isSkin: true });
    assert.deepEqual(a, b, 'deux constructions diffèrent — le conseil serait aléatoire');
    const summary = buildSkinAdvisorySummary(profileMarks as any, ['taches', 'apaiser']);
    assert.equal(summary, buildSkinAdvisorySummary(profileMarks as any, ['taches', 'apaiser']));
  });

  console.log(`\n[PASS] Conseil diagnostic peau : ${checks} contrats verrouillés (richesse, contexte, leçons sourcées, observations J+7/14/30, résumé honnête, formulation, déterminisme).`);
}

main().catch(error => {
  console.error('[FAIL] Conseil diagnostic peau :', error);
  process.exitCode = 1;
});
