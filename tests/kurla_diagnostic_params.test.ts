import assert from 'node:assert/strict';

import { buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../src/lib/knowledge/hairAdvisory';
import { deriveHairObservations } from '../src/lib/knowledge/diagnosticDerivations';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';
import { validateHairAiOutput } from '../src/lib/knowledge/aiGuardrail';
import { getHairDiagnosticSegment, getSegmentFocusLabel } from '../src/lib/diagnosticSegments';
import { buildHairKit } from '../src/lib/knowledge/careKit';

/**
 * BANC — D4 : LES PARAMÈTRES MANQUANTS (programme « solidification du
 * diagnostic », docs/CHANTIERS_DIAGNOSTIC_SOLIDIFICATION.md).
 *
 * Un paramètre n'existe que s'il fait le trajet complet :
 *   option du formulaire → règle du moteur (étape de routine VÉRIFIABLE) →
 *   phrase du résumé → dérivation tracée → assertion de ce banc.
 *
 * Acceptation du doc : 3 paires de profils (même segment, un seul
 * paramètre changé) dont les routines DIFFÈRENT visiblement — jamais un
 * simple mot collé sur un résumé identique.
 */

type Ctx = Record<string, string | undefined>;

const actions = (ctx: Ctx) => {
  const r = buildHairAdvisoryRoutine(ctx);
  return { all: [...r.morning, ...r.evening, ...r.weekly], morning: r.morning, evening: r.evening, weekly: r.weekly };
};
const actionSet = (ctx: Ctx) => new Set(actions(ctx).all.map(s => s.action));

async function main() {
  let checks = 0;
  const ok = (label: string, fn: () => void) => { fn(); checks += 1; console.log(`  ✓ ${label}`); };

  // ——— Paire 1 : longueur (même profil, seule la longueur change) ———
  const baseLong = { texture: 'crepue', style: 'naturel', focus: 'cresp_hydratation', priority: 'hydratation', frequency: '1x_semaine' };
  ok('longueur : courte vs longue → étapes distinctes et résumé distinct', () => {
    const courte = { ...baseLong, length: 'courte' };
    const longue = { ...baseLong, length: 'longue' };
    assert.ok(actionSet(longue).has('Contrôle des pointes'), 'longue ne gagne pas le contrôle des pointes');
    assert.ok(!actionSet(courte).has('Contrôle des pointes'), 'le contrôle des pointes fuite sur une longueur courte');
    assert.ok(actionSet(courte).has('Doser selon la longueur'), 'courte ne gagne pas le dosage court');
    assert.ok(!actionSet(longue).has('Doser selon la longueur'), 'le dosage court fuite sur une longueur longue');
    const sCourte = buildHairAdvisorySummary(courte);
    const sLongue = buildHairAdvisorySummary(longue);
    assert.ok(sCourte !== sLongue, 'résumés identiques malgré la longueur');
    assert.ok(/longueur courte déclarée/i.test(sCourte), 'la longueur courte n’est pas annoncée au résumé');
    assert.ok(/Longueur longue déclarée/.test(sLongue), 'la longueur longue n’est pas annoncée au résumé');
    // Dérivation dédiée (traçable), présente AU RÉSUMÉ.
    const dLongue = deriveHairObservations(longue).find(d => d.id === 'longueur_frottement');
    assert.ok(dLongue && sLongue.includes(dLongue.text), 'la dérivation longueur longue n’est pas reprise au résumé');
    const dCourte = deriveHairObservations(courte).find(d => d.id === 'longueur_courte_lisibilite');
    assert.ok(dCourte && sCourte.includes(dCourte.text), 'la dérivation longueur courte n’est pas reprise au résumé');
  });

  // ——— Paire 2 : fréquence réellement utilisée ———
  // Le paramètre ajoute une ÉTAPE là où le cycle n'a pas encore de geste
  // d'entre-deux (transition) ; là où il l'a déjà (enfant, avec son
  // « Rafraîchissement léger si besoin »), la déduplication doit jouer.
  const baseFreq = { texture: 'defrisee', style: 'naturel', focus: 'trans_ligne', priority: 'casse' };
  ok('fréquence : moins d’1× vs 1× → le recharge entre lavages est une étape, pas une phrase', () => {
    const rare = { ...baseFreq, frequency: 'less_1x' };
    const hebdo = { ...baseFreq, frequency: '1x_semaine' };
    assert.ok(actions(rare).evening.some(s => s.action === 'Recharger l’hydratation entre deux lavages'), 'less_1x ne recharge pas l’hydratation');
    assert.ok(!actions(hebdo).evening.some(s => s.action === 'Recharger l’hydratation entre deux lavages'), 'le recharge fuite sur un rythme hebdo');
    assert.ok(/moins d’un lavage par semaine/i.test(buildHairAdvisorySummary(rare)), 'le rythme rare n’est pas annoncé');
    const dRare = deriveHairObservations(rare).find(d => d.id === 'rare_hydratation_entre');
    assert.ok(dRare && buildHairAdvisorySummary(rare).includes(dRare.text), 'la dérivation rythme rare n’est pas au résumé');
  });
  ok('fréquence : le cycle qui a déjà son geste d’entre-deux ne se voit pas dupliqué', () => {
    const kidRare = { texture: 'crepue', style: 'enfant', focus: 'enf_demeler', priority: 'demelage_enfant', frequency: 'less_1x' };
    const kidActions = actions(kidRare).all.map(s => s.action);
    assert.ok(kidActions.some(a => a === 'Rafraîchissement léger si besoin'), 'l’enfant a bien son geste natif');
    assert.ok(!kidActions.includes('Recharger l’hydratation entre deux lavages'), 'déduplication manquée : deux gestes équivalents chez l’enfant');
  });
  ok('fréquence : 2× sur porosité forte → la règle croisée remplace le double discours', () => {
    const forte2x = { texture: 'crepue', style: 'naturel', focus: 'cresp_demelage', priority: 'casse', porosity: 'forte', frequency: '2x_semaine' };
    const ids = deriveHairObservations(forte2x).map(d => d.id);
    assert.ok(ids.includes('forte_relavage'), 'pas de règle croisée forte+2×');
    assert.ok(!ids.includes('freq_2x'), 'la règle 2× générique tourne en double avec la croisée');
    assert.ok(buildHairAdvisorySummary(forte2x).includes(deriveHairObservations(forte2x).find(d => d.id === 'forte_relavage')!.text), 'la croisée n’est pas au résumé');
  });

  // ——— Paire 3 : expérience ———
  const baseExp = { texture: 'frisee', style: 'naturel', focus: 'boucle_definition', priority: 'definition', porosity: 'moyenne', frequency: '1x_semaine' };
  ok('expérience : débutante gagne l’étape « un geste par semaine », jamais l’inverse', () => {
    const debutante = { ...baseExp, experience: 'debutante' };
    const habituee = { ...baseExp, experience: 'habituee' };
    assert.ok(actions(debutante).weekly.some(s => s.action === 'Un geste nouveau par semaine'), 'débutante sans étape de progression');
    assert.ok(!actions(habituee).weekly.some(s => s.action === 'Un geste nouveau par semaine'), 'l’étape débutante fuite sur une habituée');
    assert.ok(debutante !== undefined && buildHairAdvisorySummary(debutante) !== buildHairAdvisorySummary(habituee), 'résumés identiques malgré l’expérience');
  });
  ok('expérience : experte gagne le réglage fin (élasticité, temps de pose)', () => {
    const expert = { ...baseExp, experience: 'expert' };
    assert.ok(actions(expert).weekly.some(s => s.action.startsWith('Régler fin')), 'experte sans étape de réglage');
    const d = deriveHairObservations(expert).find(x => x.id === 'expert_reglages');
    assert.ok(d && buildHairAdvisorySummary(expert).includes(d.text), 'la dérivation experte n’est pas au résumé');
  });

  // ——— Rétrocompatibilité : l'ancienne réponse frequency='debutante' est
  // comprise comme une expérience, plus jamais comme un rythme ———
  ok('réponse héritée : frequency « debutante » → expérience débutante, pas un rythme', () => {
    const legacy = { texture: 'crepue', style: 'naturel', focus: 'cresp_hydratation', priority: 'hydratation', frequency: 'debutante' };
    const summary = buildHairAdvisorySummary(legacy);
    assert.ok(!/rythme\s*:\s*pour débuter/i.test(summary), 'le vieux texte « Rythme : pour débuter » est revenu');
    assert.ok(actions(legacy).weekly.some(s => s.action === 'Un geste nouveau par semaine'), 'le pont hérité ne joue pas l’étape débutante');
    assert.ok(deriveHairObservations(legacy).some(d => d.id === 'freq_debut'), 'la dérivation débutante ne suit pas le pont hérité');
  });

  // ——— Fiche technique (page + kit) : les nouvelles lignes s'affichent ———
  ok('fiche technique : longueur et expérience déclarées, jamais déduites', () => {
    const answers = { ...baseExp, length: 'longue', experience: 'expert', budget: '40_70', email: '' };
    const model = buildDiagnosticResultModel({ answers, result: null, products: [], isSkin: false });
    const labels = model.profileFields.map(f => f.label);
    assert.ok(labels.includes('Longueur actuelle'), 'la longueur manque à la fiche');
    assert.ok(labels.includes('Expérience capillaire'), 'l’expérience manque à la fiche');
    const longueur = model.profileFields.find(f => f.label === 'Longueur actuelle');
    assert.ok(longueur && /Longue/.test(longueur.value), 'la valeur déclarée de longueur ne s’affiche pas');
    const kit = buildHairKit(answers as any, buildHairAdvisoryRoutine(answers as any), [], model.profileFields);
    assert.ok(JSON.stringify(kit.profileLines).includes('Longueur actuelle'), 'la fiche technique du kit a perdu la longueur');
    // profil sans les réponses neuves → « Non renseigné », jamais une devinette.
    const oldAnswers = { ...baseExp, budget: '40_70', email: '' } as Record<string, unknown>;
    delete oldAnswers.length; delete oldAnswers.experience;
    const oldModel = buildDiagnosticResultModel({ answers: oldAnswers, result: null, products: [], isSkin: false });
    const oldLongueur = oldModel.profileFields.find(f => f.label === 'Longueur actuelle');
    assert.ok(oldLongueur && /Non renseigné/.test(oldLongueur.value), 'champ absent deviné au lieu de « Non renseigné »');
  });

  // ——— Auto-cohérence D3 : le déterministe enrichi passe toujours sa porte ———
  ok('garde-fou D3 : le nouveau déterministe passe sa propre porte (6 profils à paramètres)', () => {
    const profiles: Ctx[] = [
      { ...baseLong, length: 'courte' }, { ...baseLong, length: 'longue' },
      { ...baseFreq, frequency: 'less_1x' }, { ...baseExp, experience: 'debutante' },
      { ...baseExp, experience: 'expert' },
      { texture: 'defrisee', style: 'naturel', focus: 'trans_ligne', priority: 'casse', frequency: 'less_1x', length: 'longue', experience: 'expert' },
    ];
    for (const ctx of profiles) {
      const seg = getHairDiagnosticSegment(ctx.texture, ctx.style);
      const routine = buildHairAdvisoryRoutine(ctx);
      const engineActions = [...routine.morning, ...routine.evening, ...routine.weekly].map(s => s.action);
      const out = {
        summary: buildHairAdvisorySummary(ctx),
        recommendedRoutine: `Routine KURLA — ${seg ? seg.label : 'profil déclaré'}`,
        reason: 'Les étapes suivent le cycle du profil déclaré, la longueur, le rythme et l’expérience — conseil cosmétique, pas médical.',
        steps: engineActions.slice(0, 8),
        warnings: [],
      };
      const v = validateHairAiOutput(out, {
        segmentId: seg?.id ?? null,
        focusLabel: getSegmentFocusLabel(ctx.focus) || null,
        derived: deriveHairObservations(ctx),
        engineActions,
      });
      assert.ok(v.ok, `déterministe rejeté (${JSON.stringify(ctx)}) → ${v.reasons.join(' ; ')}`);
    }
  });

  // ——— Étapes paramétrées = étapes soignées (jamais un greffon bâclé) ———
  ok('qualité des étapes paramétrées : why/how/expect ≥ 40, action ≠ doublon du cycle', () => {
    const withParams = { ...baseLong, length: 'longue', frequency: '2x_semaine', experience: 'expert' };
    const without = { ...baseLong };
    const baseSet = actionSet(without);
    const added = actions(withParams).all.filter(s => !baseSet.has(s.action));
    assert.ok(added.length >= 2, `au moins pointes + réglage fin attendus, reçu ${added.length}`);
    for (const s of added) {
      assert.ok(s.why.length >= 40, `why trop court : ${s.action}`);
      assert.ok(s.how.length >= 40, `how trop court : ${s.action}`);
      assert.ok(s.expect.length >= 40, `expect trop court : ${s.action}`);
    }
  });

  console.log(`[PASS] D4 : ${checks} contrats — longueur, fréquence réelle, expérience : option → règle moteur → résumé → dérivation → fiche, pont hérité compris.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
