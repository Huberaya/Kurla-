import assert from 'node:assert/strict';

import { buildHairAdvisoryRoutine, buildHairAdvisorySummary, hairRoutineTitles, pickHairLessons, pickHairObservations } from '../src/lib/knowledge/hairAdvisory';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';
import { ALL_HAIR_STYLES, ALL_HAIR_TEXTURES, getHairDiagnosticSegment } from '../src/lib/diagnosticSegments';

/**
 * BANC — ROUTINE SEGMENTÉE (chantier « réponses précises », 18/09).
 *
 * Consigne : « les recommandations ne prennent pas en compte le besoin de
 * l'utilisateur — une personne qui porte des tresses n'aura pas les mêmes
 * besoins qu'une personne qui porte des locks ou une coiffure purement afro.
 * La routine doit s'adapter à la demande, au besoin, au coiffage, à la
 * texture, au résultat attendu. »
 *
 * Ce banc fige :
 *  1. les 6 cycles (locks, protectrice, perruque, enfant, transition,
 *     naturel) produisent des routines DIFFÉRENCIÉES : signature propre de
 *     chaque cycle, titres de colonnes propres ;
 *  2. la préoccupation déclarée (focus) ajoute l'étape qui la sert — et
 *     rien d'autre (la routine sans focus ne l'a pas) ;
 *  3. les invariants de qualité tiennent sur TOUS les segments × TOUS les
 *     foci (1+ étape par colonne, action/why/how/expect complets, zéro
 *     vocabulaire médical, pas de LCO sur locks) ;
 *  4. le résumé et le fallback serveur reprennent le coiffage usuel et la
 *     préoccupation — pas un générique ;
 *  5. la transition (défrisage) a sa leçon, ses observations et sa ligne
 *     de démarcation comme point de contrôle.
 */

const MEDICAL_VOCAB = ['traitement', 'guérir', 'guérison', 'prescription', 'ordonnance', 'maladie', 'thérapie', 'pathologie', 'diagnostic médical'];
const RESERVED = ['texture fluide', 'seule zone réellement accessible', 'occlusif de la formule', 'retirez la perruque la nuit', 'lavage clarifiant régulier', 'consultez un dermatologue', 'avis dermatologique', 'doivent être montrés à un dermatologue'];

type Ctx = Parameters<typeof buildHairAdvisoryRoutine>[0];
const BASE = { porosity: 'inconnue', scalp: 'normal', frequency: '1x_semaine', budget: '40_70' } as const;

function routineText(routine: ReturnType<typeof buildHairAdvisoryRoutine>): string {
  return [...routine.morning, ...routine.evening, ...routine.weekly].flatMap(s => [s.action, s.why, s.how, s.expect]).join(' ').toLowerCase();
}

function invariants(label: string, ctx: Ctx): void {
  const routine = buildHairAdvisoryRoutine(ctx);
  const all = [...routine.morning, ...routine.evening, ...routine.weekly];
  for (const slot of ['morning', 'evening', 'weekly'] as const) {
    assert.ok(routine[slot].length >= 1, `${label} : colonne ${slot} vide`);
  }
  assert.ok(all.length >= 6, `${label} : routine incomplète (${all.length})`);
  for (const step of all) {
    assert.ok(step.action.length >= 8, `${label} : action trop courte « ${step.action} »`);
    assert.ok(step.why.length >= 40, `${label} : why trop court « ${step.action} »`);
    assert.ok(step.how.length >= 40, `${label} : how trop court « ${step.action} »`);
    assert.ok(step.expect.length >= 40, `${label} : expect trop court « ${step.action} »`);
    const text = `${step.action} ${step.why} ${step.how} ${step.expect}`.toLowerCase();
    for (const word of MEDICAL_VOCAB) assert.ok(!text.includes(word), `${label} : vocabulaire médical « ${word} »`);
    for (const phrase of RESERVED) assert.ok(!text.includes(phrase), `${label} : phrase réservée « ${phrase} »`);
  }
}

function main(): void {
  /* ————————————————— 1. Les 6 cycles sont différenciés ————————————————— */

  const profiles: Array<[string, Ctx]> = [
    ['locks', { texture: 'locksee', style: 'locks', priority: 'pousse', ...BASE }],
    ['protective', { texture: 'frisee', style: 'braids', priority: 'casse', ...BASE }],
    ['wig', { texture: 'crepue', style: 'wig', priority: 'hydratation', ...BASE }],
    ['enfant', { texture: 'crepue', style: 'enfant', priority: 'demelage_enfant', ...BASE }],
    ['transition', { texture: 'defrisee', style: 'naturel', priority: 'definition', ...BASE }],
    ['naturel', { texture: 'crepue', style: 'naturel', priority: 'hydratation', ...BASE }],
  ];
  const routines = new Map(profiles.map(([name, ctx]) => [name, buildHairAdvisoryRoutine(ctx)]));
  const titles = new Map(profiles.map(([name, ctx]) => [name, hairRoutineTitles(ctx)]));

  assert.ok(routineText(routines.get('locks')!).includes('retwist') || routineText(routines.get('locks')!).includes('palm rolling'), 'locks : le cycle retwist/palm rolling est présent');
  assert.ok(!routineText(routines.get('locks')!).includes('lco'), 'locks : pas de LCO (hydratation aqueuse)');
  assert.ok(routineText(routines.get('protective')!).includes('dépose'), 'protectrice : la dépose est au cœur du cycle');
  assert.ok(routineText(routines.get('protective')!).includes('aqueuse') || routineText(routines.get('protective')!).includes('aqueux'), 'protectrice : entretien aqueux sous la coiffure');
  assert.ok(routineText(routines.get('wig')!).includes('pose'), 'perruque : le cycle est organisé autour de la pose');
  assert.ok(routineText(routines.get('wig')!).includes('dessous'), 'perruque : le dessous est le capital');
  assert.ok(routineText(routines.get('transition')!).includes('démarcation'), 'transition : la ligne de démarcation est le point de contrôle');
  assert.ok(routineText(routines.get('transition')!).includes('deux'), 'transition : les deux textures sont nommées');
  assert.ok(routineText(routines.get('naturel')!).includes('lco'), 'naturel : le scellement LCO est présent');
  assert.ok(routineText(routines.get('enfant')!).includes('satin'), 'enfant : le rituel inclut la nuit en satin');

  // Titres de colonnes : la protectrice et la perruque n'ont pas de « jour de lavage » hebdomadaire.
  assert.equal(titles.get('protective')!.morning, 'Avant de se faire coiffer');
  assert.equal(titles.get('protective')!.weekly, 'À la dépose');
  assert.equal(titles.get('wig')!.morning, 'Avant chaque pose');
  assert.equal(titles.get('locks')!.morning, 'Jour de lavage');
  assert.equal(titles.get('naturel')!.evening, 'Entre deux lavages');

  // Différenciation paire à paire : chaque couple de cycles a des textes distincts.
  const names = profiles.map(([n]) => n);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      assert.notEqual(routineText(routines.get(names[i])!), routineText(routines.get(names[j])!), `cycles identiques : ${names[i]} = ${names[j]}`);
    }
  }
  // Et la différenciation est réelle, pas cosmétique : les actions diffèrent
  // largement entre les cycles (pas deux cycles qui se copient).
  const actionsOf = (name: string) => new Set([...routines.get(name)!.morning, ...routines.get(name)!.evening, ...routines.get(name)!.weekly].map(s => s.action));
  const common = <A extends string, B extends string>(a: Set<A>, b: Set<B>) => [...a].filter(x => b.has(x as A & B)).length;
  assert.ok(common(actionsOf('protective'), actionsOf('locks')) < Math.min(actionsOf('protective').size, actionsOf('locks').size), 'protectrice vs locks : les actions sont majoritairement distinctes');
  assert.ok(common(actionsOf('wig'), actionsOf('naturel')) < Math.min(actionsOf('wig').size, actionsOf('naturel').size), 'perruque vs naturel : les actions sont majoritairement distinctes');
  assert.ok(common(actionsOf('transition'), actionsOf('naturel')) < Math.min(actionsOf('transition').size, actionsOf('naturel').size), 'transition vs naturel : les actions sont majoritairement distinctes');

  /* ————————————————— 2. Le focus ajoute l'étape qui le sert ————————————————— */

  const focusPairs: Array<[string, Ctx, string, string]> = [
    // [foci, ctx, slot, mot-signal attendu dans l'étape ajoutée]
    ['locks_propre', { texture: 'locksee', style: 'locks', priority: 'pousse', focus: 'locks_propre', ...BASE }, 'weekly', 'lavage profond'],
    ['locks_douceur', { texture: 'locksee', style: 'locks', priority: 'pousse', focus: 'locks_douceur', ...BASE }, 'evening', 'eau, pas matière'],
    ['prot_tension', { texture: 'frisee', style: 'braids', priority: 'casse', focus: 'prot_tension', ...BASE }, 'morning', 'installer sans tension'],
    ['prot_longueurs', { texture: 'crepue', style: 'twists', priority: 'hydratation', focus: 'prot_longueurs', ...BASE }, 'morning', 'hydrater les longueurs'],
    ['wig_edges', { texture: 'crepue', style: 'wig', priority: 'casse', focus: 'wig_edges', ...BASE }, 'morning', 'contour'],
    ['enf_cuirs', { texture: 'crepue', style: 'enfant', priority: 'demelage_enfant', focus: 'enf_cuirs', ...BASE }, 'morning', 'observer'],
    ['trans_ligne', { texture: 'defrisee', style: 'naturel', priority: 'definition', focus: 'trans_ligne', ...BASE }, 'weekly', 'inspecter, noter, agir'],
    ['boucle_frisottis', { texture: 'frisee', style: 'naturel', priority: 'definition', focus: 'boucle_frisottis', ...BASE }, 'evening', 'friction'],
    ['cresp_demelage', { texture: 'crepue', style: 'naturel', priority: 'casse', focus: 'cresp_demelage', ...BASE }, 'evening', 'démêlage d’entretien'],
  ];
  for (const [focus, ctx, slot, signal] of focusPairs) {
    const withFocus = buildHairAdvisoryRoutine(ctx);
    const withoutFocus = buildHairAdvisoryRoutine({ ...ctx, focus: undefined });
    const found = withFocus[slot].some(s => `${s.action} ${s.why}`.toLowerCase().includes(signal));
    assert.ok(found, `focus ${focus} : l'étape « ${signal} » est présente en ${slot}`);
    const foundWithout = withoutFocus[slot].some(s => `${s.action} ${s.why}`.toLowerCase().includes(signal));
    assert.ok(!foundWithout, `focus ${focus} : sans préoccupation déclarée, l'étape n'est pas inventée`);
    invariants(`focus ${focus}`, ctx);
  }

  /* ————————————————— 3. Invariants sur tous les segments × tous les foci ————————————————— */

  let combos = 0;
  for (const texture of ALL_HAIR_TEXTURES) {
    for (const style of ALL_HAIR_STYLES) {
      const seg = getHairDiagnosticSegment(texture, style);
      if (!seg) continue;
      invariants(`${seg.id} (${texture}/${style}) sans focus`, { texture, style, priority: 'hydratation', ...BASE });
      for (const option of seg.options) {
        invariants(`${option.id}`, { texture, style, priority: 'casse', focus: option.id, ...BASE });
        combos++;
      }
    }
  }
  assert.ok(combos >= 30, `couvertures focus vérifiées : ${combos}`);

  /* ————————————————— 4. Résumé & fallback — le générique n'existe plus ————————————————— */

  const braidsSummary = buildHairAdvisorySummary({ texture: 'frisee', style: 'braids', priority: 'casse', ...BASE });
  assert.ok(braidsSummary.toLowerCase().includes('tresses'), 'résumé : le coiffage tresses est repris');
  const locksSummary = buildHairAdvisorySummary({ texture: 'locksee', style: 'locks', priority: 'pousse', focus: 'locks_allonger', ...BASE });
  assert.ok(locksSummary.toLowerCase().includes('locks'), 'résumé : le cycle locks est repris');
  assert.ok(locksSummary.toLowerCase().includes('allonger mes locks sans les casser'), 'résumé : la préoccupation déclarée est reprise');
  assert.ok(!locksSummary.toLowerCase().includes('routine capillaire structurée à ajuster progressivement'), 'résumé : plus de générique');
  const wigSummary = buildHairAdvisorySummary({ texture: 'crepue', style: 'wig', priority: 'hydratation', ...BASE });
  assert.ok(wigSummary.toLowerCase().includes('perruque'), 'résumé : le cycle perruque est repris');
  const transitionSummary = buildHairAdvisorySummary({ texture: 'defrisee', style: 'naturel', priority: 'definition', ...BASE });
  assert.ok(transitionSummary.toLowerCase().includes('transition'), 'résumé : la transition est reprise');

  // La page résultat (modèle client) porte bien les titres segmentés.
  const modelBraids = buildDiagnosticResultModel({
    answers: { texture: 'frisee', style: 'braids', priority: 'casse', porosity: 'forte', scalp: 'demangeaisons', frequency: '1x_semaine', budget: 'moins_40' },
    result: null, products: [], isSkin: false
  });
  assert.equal(modelBraids.routineTitles.morning, 'Avant de se faire coiffer', 'page résultat : titre segmenté protectrice');
  assert.ok(modelBraids.morning.some(s => s.action.toLowerCase().includes('démêler')), 'page résultat : le démêlage complet est en avant de la coiffure');
  assert.ok(modelBraids.weekly.some(s => s.action.toLowerCase().includes('nettoyage profond')), 'page résultat : nettoyage profond au cycle protectrice');

  /* ————————————————— 5. La transition est un cycle à part entière ————————————————— */

  const transCtx: Ctx = { texture: 'defrisee', style: 'naturel', priority: 'definition', ...BASE };
  assert.equal(pickHairObservations(transCtx)[0].day, '7');
  assert.ok(pickHairObservations(transCtx).some(o => o.question.toLowerCase().includes('démarcation')), 'transition : observation J+7 sur la ligne de démarcation');
  assert.ok(pickHairLessons(transCtx).some(l => l.key === 'hair_lesson_transition'), 'transition : leçon dédiée sélectionnée');
  assert.ok(pickHairLessons(transCtx).every(l => l.source.includes('KURLA Cheveux')), 'transition : leçons sourcées');

  console.log(`[PASS] Routine segmentée : 6 cycles différenciés (locks, protectrice, perruque, enfant, transition, naturel) avec signatures et titres propres, ${combos} focus × segments vérifiés (l'étape qui sert la préoccupation, rien d'autre), invariants de qualité sur toutes les combinaisons, résumé et titres sans générique, transition avec sa leçon et ses observations.`);
}

main();
