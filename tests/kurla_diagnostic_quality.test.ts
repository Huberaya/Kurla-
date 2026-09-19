import assert from 'node:assert/strict';

import {
  buildHairAdvisoryRoutine,
  buildHairAdvisorySummary,
  pickHairLessons,
  pickHairObservations,
} from '../src/lib/knowledge/hairAdvisory';
import { getHairDiagnosticSegment, getSegmentFocusLabel } from '../src/lib/diagnosticSegments';
import { BANNED_MEDICAL_VOCAB, BANNED_RESERVED_EXPRESSIONS, BANNED_GENERIC_PHRASES } from '../src/lib/knowledge/aiGuardrail';
import { deriveHairObservations, HAIR_DERIVATION_RULES } from '../src/lib/knowledge/diagnosticDerivations';
import { HAIR_SCIENCE_CARDS } from '../src/lib/knowledge/hairScience';

/**
 * BANC — D5 : PROTOCOLE D'ÉVALUATION QUALITÉ DU DIAGNOSTIC (programme
 * « solidification du diagnostic », 19/09 — docs/CHANTIERS_DIAGNOSTIC_SOLIDIFICATION.md).
 *
 * 25 profils de référence couvrant tous les segments × besoins ×
 * caractéristiques. Pour chacun, la checklist d'attentes de contenu :
 *
 *  1. LE CYCLE EST ANNONCÉ — le résumé nomme le cycle du segment (pas de
 *     réponse qui « flotte » sans dire quel cycle elle suit).
 *  2. LA PRÉOCCUPATION EST REPRISE — la réponse à la question adaptative
 *     (focus) apparaît dans le résumé.
 *  3. L'ÉTAPE QUI SERVIT LE FOCUS EXISTE — avec le focus la routine gagne
 *     une étape ; sans le focus elle n'existe pas (jamais inventée).
 *  4. ZÉRO GÉNÉRIQUE — ni phrases bannies, ni vocabulaire médical, ni
 *     expressions réservées ailleurs.
 *  5. STRUCTURE — ≥6 étapes, action/why/how/expect de longueur minimale.
 *
 *  6. OBSERVATIONS DÉRIVÉES (assertion D1, active depuis sa livraison) —
 *     chaque profil doit avoir ≥2 observations dérivées du CROISEMENT des
 *     réponses (table `HAIR_DERIVATION_RULES`), reprises au résumé,
 *     chacune fondée sur une carte `hairScience` existante (traçabilité),
 *     et RÉACTIVES : retirer un champ retiré une dérivation. Les marqueurs
 *     causaux restent rapportés comme signal de style.
 */

type Profile = {
  name: string;
  texture: string;
  style: string;
  focus?: string;
  priority: string;
  scalp?: string;
  porosity?: string;
  frequency: string;
  length?: string;
  experience?: string;
  /** Mot-clé qui prouve que le cycle du segment est annoncé dans le résumé. */
  cycleSignal: string;
};

const PROFILES: Profile[] = [
  // — locks (5)
  { name: 'L1', texture: 'locksee', style: 'locks', focus: 'locks_allonger', priority: 'pousse', frequency: '1x_semaine', cycleSignal: 'cycle locks' },
  { name: 'L2', texture: 'locksee', style: 'locks', focus: 'locks_propre', priority: 'hydratation', frequency: '1x_semaine', cycleSignal: 'cycle locks' },
  { name: 'L3', texture: 'locksee', style: 'locks', focus: 'locks_cuirs', priority: 'cuir_chevelu', scalp: 'demangeaisons', frequency: '1x_semaine', cycleSignal: 'cycle locks' },
  { name: 'L4', texture: 'locksee', style: 'locks', focus: 'locks_regularite', priority: 'definition', frequency: '2x_semaine', cycleSignal: 'cycle locks' },
  { name: 'L5', texture: 'locksee', style: 'locks', focus: 'locks_douceur', priority: 'hydratation', scalp: 'sec', porosity: 'faible', frequency: '1x_semaine', experience: 'debutante', length: 'courte', cycleSignal: 'cycle locks' },
  // — protectrice (5)
  { name: 'P1', texture: 'frisee', style: 'braids', focus: 'prot_tension', priority: 'casse', porosity: 'forte', frequency: '1x_semaine', cycleSignal: 'cycle protectrice' },
  { name: 'P2', texture: 'crepue', style: 'twists', focus: 'prot_lavage', priority: 'hydratation', porosity: 'forte', frequency: '2x_semaine', cycleSignal: 'cycle protectrice' },
  { name: 'P3', texture: 'frisee', style: 'braids', focus: 'prot_duree', priority: 'definition', porosity: 'moyenne', frequency: '1x_semaine', cycleSignal: 'cycle protectrice' },
  { name: 'P4', texture: 'crepue', style: 'twists', focus: 'prot_cuirs', priority: 'cuir_chevelu', scalp: 'irritation', frequency: 'irreguliere', cycleSignal: 'cycle protectrice' },
  { name: 'P5', texture: 'frisee', style: 'braids', focus: 'prot_longueurs', priority: 'pousse', scalp: 'sec', porosity: 'faible', frequency: '1x_semaine', length: 'longue', cycleSignal: 'cycle protectrice' },
  // — perruque / tissage (4)
  { name: 'W1', texture: 'crepue', style: 'wig', focus: 'wig_cuirs', priority: 'cuir_chevelu', scalp: 'demangeaisons', frequency: '1x_semaine', cycleSignal: 'protège le dessous' },
  { name: 'W2', texture: 'crepue', style: 'wig', focus: 'wig_transpiration', priority: 'hydratation', porosity: 'forte', frequency: '2x_semaine', experience: 'habituee', cycleSignal: 'protège le dessous' },
  { name: 'W3', texture: 'frisee', style: 'wig', focus: 'wig_edges', priority: 'casse', frequency: '1x_semaine', cycleSignal: 'protège le dessous' },
  { name: 'W4', texture: 'crepue', style: 'wig', focus: 'wig_entretien', priority: 'hydratation', porosity: 'moyenne', frequency: 'irreguliere', cycleSignal: 'protège le dessous' },
  // — enfant (3)
  { name: 'E1', texture: 'crepue', style: 'enfant', focus: 'enf_demeler', priority: 'demelage_enfant', frequency: '1x_semaine', cycleSignal: 'enfant' },
  { name: 'E2', texture: 'crepue', style: 'enfant', focus: 'enf_cuirs', priority: 'cuir_chevelu', scalp: 'demangeaisons', frequency: '1x_semaine', experience: 'debutante', cycleSignal: 'enfant' },
  { name: 'E3', texture: 'frisee', style: 'enfant', focus: 'enf_patience', priority: 'hydratation', scalp: 'sec', porosity: 'faible', frequency: 'irreguliere', cycleSignal: 'enfant' },
  // — transition (4)
  { name: 'T1', texture: 'defrisee', style: 'naturel', focus: 'trans_ligne', priority: 'casse', porosity: 'forte', frequency: '1x_semaine', cycleSignal: 'transition' },
  { name: 'T2', texture: 'defrisee', style: 'naturel', focus: 'trans_melanges', priority: 'definition', frequency: '2x_semaine', cycleSignal: 'transition' },
  { name: 'T3', texture: 'defrisee', style: 'naturel', focus: 'trans_fibre', priority: 'casse', scalp: 'sec', porosity: 'faible', frequency: '1x_semaine', cycleSignal: 'transition' },
  { name: 'T4', texture: 'defrisee', style: 'braids', focus: 'trans_racines', priority: 'hydratation', porosity: 'forte', frequency: '1x_semaine', cycleSignal: 'protectrice' },
  // — naturel (crépu / bouclé) (4)
  { name: 'N1', texture: 'crepue', style: 'naturel', focus: 'cresp_hydratation', priority: 'hydratation', scalp: 'sec', porosity: 'forte', frequency: '1x_semaine', cycleSignal: 'cycle naturel' },
  { name: 'N2', texture: 'crepue', style: 'naturel', focus: 'cresp_demelage', priority: 'casse', frequency: '2x_semaine', cycleSignal: 'cycle naturel' },
  { name: 'N3', texture: 'frisee', style: 'naturel', focus: 'boucle_frisottis', priority: 'definition', porosity: 'forte', frequency: '1x_semaine', cycleSignal: 'cycle naturel' },
  { name: 'N4', texture: 'frisee', style: 'naturel', focus: 'boucle_definition', priority: 'definition', porosity: 'moyenne', frequency: '1x_semaine', experience: 'expert', length: 'longue', cycleSignal: 'cycle naturel' },
];

// ————————————————— vocabulaire interdit (mêmes listes que kurla_hair_advisory) —————————————————

// Listes importées de la porte D3 (source unique — la porte et les bancs ne
// peuvent plus diverger) : MEDICAL_VOCAB, RESERVED_ELSEWHERE, GENERIC_BANNED.
const MEDICAL_VOCAB = BANNED_MEDICAL_VOCAB;
const RESERVED_ELSEWHERE = BANNED_RESERVED_EXPRESSIONS;
const GENERIC_BANNED = BANNED_GENERIC_PHRASES;

// Marqueurs d'une phrase DÉRIVÉE de la combinaison des réponses (pas une
// reprise de case). Depuis D1, l'assertion porte sur les dérivation ELLES-
// MÊMES (texte exact présent au résumé) ; le compteur de marqueurs reste
// comme signal de style causal des phrases.
const DERIVED_MARKERS = ['d’où', 'c’est ce qui', 'probablement', 'le geste qui', 'la cause', 'ce qui change', 's’installe', 'viennent de', 'vient de'];

// Les clés science de toutes les règles doivent exister (traçabilité D1 :
// une déduction sans carte source est une déduction interdite).
const SCIENCE_KEYS = new Set(HAIR_SCIENCE_CARDS.map(card => card.key));
for (const rule of HAIR_DERIVATION_RULES) {
  assert.ok(rule.keys.length >= 1, `règle « ${rule.id} » sans carte science source`);
  for (const key of rule.keys) assert.ok(SCIENCE_KEYS.has(key), `règle « ${rule.id} » pointe vers une clé science inexistante : ${key}`);
}

function ctxOf(p: Profile) {
  return { texture: p.texture, style: p.style, focus: p.focus, priority: p.priority, scalp: p.scalp, porosity: p.porosity, frequency: p.frequency, length: p.length, experience: p.experience };
}

function allText(p: Profile): string[] {
  const ctx = ctxOf(p);
  const routine = buildHairAdvisoryRoutine(ctx);
  const steps = [...routine.morning, ...routine.evening, ...routine.weekly];
  return [
    buildHairAdvisorySummary(ctx),
    ...steps.flatMap(s => [s.action, s.why, s.how, s.expect]),
    ...pickHairLessons(ctx).flatMap(l => [l.lesson, l.source]),
    ...pickHairObservations(ctx).map(o => o.question),
  ];
}

function derivedCount(summary: string): number {
  const sentences = summary.split(/(?<=[.?!])\s+/).filter(Boolean);
  return sentences.filter(sentence => {
    const low = sentence.toLowerCase();
    return DERIVED_MARKERS.some(marker => low.includes(marker.toLowerCase()));
  }).length;
}

async function main() {
  const report: string[] = [];
  let minDerived = Infinity;

  for (const p of PROFILES) {
    const ctx = ctxOf(p);
    const summary = buildHairAdvisorySummary(ctx).toLowerCase();
    const routine = buildHairAdvisoryRoutine(ctx);
    const all = [...routine.morning, ...routine.evening, ...routine.weekly];

    // 1. Le cycle est annoncé.
    assert.ok(summary.includes(p.cycleSignal.toLowerCase()), `${p.name} : le résumé n'annonce pas le cycle (« ${p.cycleSignal} »)`);

    // 2. La préoccupation déclarée est reprise.
    const label = getSegmentFocusLabel(p.focus);
    assert.ok(label, `${p.name} : focus inconnu « ${p.focus} »`);
    assert.ok(summary.includes(label.toLowerCase()), `${p.name} : le résumé ne reprend pas la préoccupation « ${label} »`);

    // 3. L'étape du focus existe avec le focus, absente sans.
    const withoutFocus = buildHairAdvisoryRoutine({ ...ctx, focus: undefined });
    const baseActions = new Set([...withoutFocus.morning, ...withoutFocus.evening, ...withoutFocus.weekly].map(s => s.action));
    const added = all.filter(s => !baseActions.has(s.action));
    assert.ok(added.length >= 1, `${p.name} : le focus n'ajoute aucune étape`);

    // 4. Zéro générique / médical / réservé.
    for (const text of allText(p)) {
      const low = text.toLowerCase();
      for (const phrase of GENERIC_BANNED) assert.ok(!low.includes(phrase), `${p.name} : phrase générique bannie présente : « ${phrase} »`);
      for (const term of MEDICAL_VOCAB) assert.ok(!low.includes(term), `${p.name} : vocabulaire médical interdit : « ${term} »`);
      for (const phrase of RESERVED_ELSEWHERE) assert.ok(!low.includes(phrase), `${p.name} : expression réservée ailleurs : « ${phrase} »`);
    }

    // 5. Structure.
    assert.ok(all.length >= 6, `${p.name} : routine incomplète (${all.length})`);
    for (const slot of ['morning', 'evening', 'weekly'] as const) {
      assert.ok(routine[slot].length >= 1, `${p.name} : colonne ${slot} vide`);
    }
    for (const s of all) {
      assert.ok(s.action.length >= 8, `${p.name} : action trop courte : « ${s.action} »`);
      assert.ok(s.why.length >= 40, `${p.name} : why trop court sur « ${s.action} »`);
      assert.ok(s.how.length >= 40, `${p.name} : how trop court sur « ${s.action} »`);
      assert.ok(s.expect.length >= 40, `${p.name} : expect trop court sur « ${s.action} »`);
    }

    // 6. (D1 — assertion active) Observations dérivées : ≥2 par profil et
    // réellement présentes dans le résumé, pas un stock statique.
    const derivations = deriveHairObservations(ctx);
    assert.ok(derivations.length >= 2, `${p.name} : moins de 2 observations dérivées (${derivations.length})`);
    const summaryText = buildHairAdvisorySummary(ctx);
    const seen = derivations.filter(d => summaryText.includes(d.text));
    assert.ok(seen.length >= 2, `${p.name} : seulement ${seen.length} dérivée(s) reprise(s) au résumé`);
    for (const d of seen) assert.ok(d.text.length >= 80, `${p.name} : dérivation trop courte pour être une interprétation : « ${d.text} »`);
    // Les dérivations RÉAGISSENT aux réponses : retirer un champ doit
    // retirer au moins une dérivation (sinon la règle est un texte figé).
    if (p.porosity) {
      const idsWith = derivations.map(d => d.id).join(',');
      const idsWithout = deriveHairObservations({ ...ctx, porosity: undefined }).map(d => d.id).join(',');
      assert.notEqual(idsWith, idsWithout, `${p.name} : retirer la porosité ne change aucune dérivation — règle figée ?`);
    }
    if (p.scalp) {
      const idsWith = derivations.map(d => d.id).join(',');
      const idsWithout = deriveHairObservations({ ...ctx, scalp: undefined }).map(d => d.id).join(',');
      assert.notEqual(idsWith, idsWithout, `${p.name} : retirer le cuir chevelu ne change aucune dérivation — règle figée ?`);
    }
    minDerived = Math.min(minDerived, seen.length);
    report.push(`  ${p.name} ${p.texture}/${p.style} focus=${p.focus ?? '—'} : ✓ cycle ✓ focus ✓ étape+ ✓ sans générique | dérivées au résumé : ${seen.length} (marqueurs causaux : ${derivedCount(summaryText)})`);
  }

  // Baseline D5 : la différenciation inter-profils est réelle (pas deux
  // profils du même segment qui reçoivent un résumé identique).
  const byName = new Map<string, string>();
  for (const p of PROFILES) byName.set(p.name, buildHairAdvisorySummary(ctxOf(p)));
  for (let i = 0; i < PROFILES.length; i += 1) {
    for (let j = i + 1; j < PROFILES.length; j += 1) {
      const a = PROFILES[i]; const b = PROFILES[j];
      if (a.texture === b.texture && a.style === b.style && a.focus === b.focus) {
        assert.ok(byName.get(a.name) !== byName.get(b.name), `${a.name}=${b.name} : résumés identiques pour des caractéristiques différentes`);
      }
    }
  }

  console.log('[D5] Baseline qualité du diagnostic (25 profils de référence) :');
  for (const line of report) console.log(line);
  assert.ok(minDerived >= 2, `D1 : au moins un profil sous le seuil de 2 dérivées (min = ${minDerived})`);
  console.log(`[D5] Observations dérivées au résumé : minimum ${minDerived} (assertion D1 ≥2 partout — active)`);
  console.log('[PASS] Protocole D5 : 25 profils — cycle annoncé, préoccupation reprise, étape focus additive, zéro générique/médical/réservé, structure complète. Assertions D1 actives : ≥2 observations dérivées tracées hairScience, réactives au retrait d’un champ.');
}

main().catch((error) => { console.error(error); process.exit(1); });
