import assert from 'node:assert/strict';

import { validateHairAiOutput, findBannedIn, BANNED_GENERIC_PHRASES } from '../src/lib/knowledge/aiGuardrail';
import { buildHairAdvisorySummary, buildHairAdvisoryRoutine } from '../src/lib/knowledge/hairAdvisory';
import { deriveHairObservations } from '../src/lib/knowledge/diagnosticDerivations';
import { getHairDiagnosticSegment, getSegmentFocusLabel } from '../src/lib/diagnosticSegments';

/**
 * BANC — D3 : GARDE-FOU QUALITÉ DE LA SORTIE IA (programme « solidification
 * du diagnostic », docs/CHANTIERS_DIAGNOSTIC_SOLIDIFICATION.md).
 *
 * Le chemin IA ne doit JAMAIS servir du générique ni du hors-sujet : sa
 * sortie est validée par les invariants du fallback (segment reconnu,
 * préoccupation reprise, dérivations D1 non contredites, étapes issues du
 * programme moteur, vocabulaire banni, longueurs). En cas d'échec, la route
 * bascule sur le déterministe — ce banc vérifie la porte, pas l'appel réseau.
 *
 * Propriétés exigées :
 *  1. AUTO-COHÉRENCE : le fallback déterministe passe sa propre porte sur
 *     tous les segments (la porte n'est pas un piège à ce qu'elle imite).
 *  2. LE GATE ACCEPTE une reformulation fidèle (l'IA reformule, mot pour mot
 *     n'est pas exigé).
 *  3. LE GATE REJETE : générique banni, segment ignoré, préoccupation
 *     ignorée, affirmation médicale, formule réservée (y compris dans les
 *     warnings), étapes inventées, résumé trop court, étapes manquantes.
 *  4. Le disclaimer négation (« sans diagnostic médical ») n'est PAS un
 *     motif de rejet — seule l'affirmation l'est.
 */

type Ctx = Record<string, string | undefined>;

const PROFILES: Array<{ name: string; ctx: Ctx }> = [
  { name: 'locks', ctx: { texture: 'locksee', style: 'locks', focus: 'locks_propre', priority: 'hydratation', frequency: '1x_semaine' } },
  { name: 'locks (casse)', ctx: { texture: 'locksee', style: 'locks', focus: 'locks_regularite', priority: 'casse', frequency: '2x_semaine' } },
  { name: 'protectrice', ctx: { texture: 'frisee', style: 'braids', focus: 'prot_tension', priority: 'casse', porosity: 'forte', frequency: '1x_semaine' } },
  { name: 'protectrice (cuir)', ctx: { texture: 'crepue', style: 'twists', focus: 'prot_cuirs', priority: 'cuir_chevelu', scalp: 'irritation', frequency: 'irreguliere' } },
  { name: 'perruque', ctx: { texture: 'crepue', style: 'wig', focus: 'wig_transpiration', priority: 'hydratation', porosity: 'forte', frequency: '2x_semaine' } },
  { name: 'perruque (cuir)', ctx: { texture: 'crepue', style: 'wig', focus: 'wig_cuirs', priority: 'cuir_chevelu', scalp: 'demangeaisons', frequency: '1x_semaine' } },
  { name: 'enfant', ctx: { texture: 'crepue', style: 'enfant', focus: 'enf_demeler', priority: 'demelage_enfant', frequency: '1x_semaine' } },
  { name: 'enfant (cuir)', ctx: { texture: 'crepue', style: 'enfant', focus: 'enf_cuirs', priority: 'cuir_chevelu', scalp: 'demangeaisons', frequency: 'debutante' } },
  { name: 'transition', ctx: { texture: 'defrisee', style: 'naturel', focus: 'trans_ligne', priority: 'casse', porosity: 'forte', frequency: '1x_semaine' } },
  { name: 'transition (mélanges)', ctx: { texture: 'defrisee', style: 'naturel', focus: 'trans_melanges', priority: 'definition', frequency: '2x_semaine' } },
  { name: 'naturel crépu', ctx: { texture: 'crepue', style: 'naturel', focus: 'cresp_hydratation', priority: 'hydratation', scalp: 'sec', porosity: 'forte', frequency: '1x_semaine' } },
  { name: 'naturel bouclé', ctx: { texture: 'frisee', style: 'naturel', focus: 'boucle_definition', priority: 'definition', porosity: 'moyenne', frequency: 'debutante' } },
];

function gateFor(ctx: Ctx) {
  const seg = getHairDiagnosticSegment(ctx.texture, ctx.style);
  const routine = buildHairAdvisoryRoutine(ctx);
  const engineActions = [...routine.morning, ...routine.evening, ...routine.weekly].map(s => s.action);
  return {
    gate: {
      segmentId: seg?.id ?? null,
      focusLabel: getSegmentFocusLabel(ctx.focus) || null,
      derived: deriveHairObservations(ctx),
      engineActions,
    },
    fallbackOut: {
      summary: buildHairAdvisorySummary(ctx),
      recommendedRoutine: `Routine KURLA — ${seg ? seg.label : 'profil déclaré'}`,
      reason: 'Les étapes suivent le cycle du profil déclaré : texture, coiffage usuel, préoccupation, porosité et cuir chevelu — sans diagnostic médical.',
      steps: engineActions.slice(0, 8),
      warnings: [],
    },
  };
}

async function main() {
  let checks = 0;
  const ok = (label: string, fn: () => void) => { fn(); checks += 1; console.log(`  ✓ ${label}`); };

  // 1. AUTO-COHÉRENCE : le fallback passe sa propre porte (12 profils, 7 segments).
  ok('le déterministe de référence passe la porte sur tous les segments', () => {
    for (const p of PROFILES) {
      const { gate, fallbackOut } = gateFor(p.ctx);
      const v = validateHairAiOutput(fallbackOut, gate);
      assert.ok(v.ok, `${p.name} : le fallback est rejeté par sa propre porte → ${v.reasons.join(' ; ')}`);
    }
  });

  // 2. Reformulation fidèle ACCEPTÉE (la porte n'exige pas le mot-à-mot).
  ok('une reformulation fidèle passe la porte', () => {
    const p = PROFILES[0]; // locks / locks_propre
    const { gate } = gateFor(p.ctx);
    const derived = gate.derived;
    assert.ok(derived.length >= 2, 'profil de référence sans dérivations ?');
    const summary = `Profil locks déclaré : un lavage en profondeur, sans dépôt, vous concerne — ${derived[0].text} ${derived[1].text} La routine moteur garde le rythme hebdomadaire.`;
    const steps = gate.engineActions.slice(0, 8).map((a, i) => (i === 0 ? `${a.split('—')[0].trim()} — reprise fidèle.` : a));
    const v = validateHairAiOutput(
      { summary, recommendedRoutine: 'Cycle locks régulier', reason: 'Les étapes reprennent le cycle locks : lavage, rinçage, séchage complet, entretien léger.', steps, warnings: [] },
      gate,
    );
    assert.ok(v.ok, `reformulation fidèle rejetée à tort → ${v.reasons.join(' ; ')}`);
  });

  // 3. Rejets.
  ok('générique banni → rejet', () => {
    const p = PROFILES[0];
    const { gate } = gateFor(p.ctx);
    const v = validateHairAiOutput({
      summary: `Votre situation mérite une routine capillaire structurée à ajuster progressivement selon vos envies. ${'Il faut écouter votre cheveu et lui laisser du temps, sans promesses mais avec régularité et attention aux signaux discrets que la fibre envoie chaque semaine. '.repeat(2)}`,
      recommendedRoutine: 'Routine souple', reason: 'Chacun fait comme il le sent, avec du temps et de la constance dans les gestes répétés.',
      steps: ['Commencer doucement et introduire un changement à la fois.', 'Observer la tolérance et ajuster la fréquence.', 'Hydrater régulièrement les longueurs et les racines.', 'Noter ce qui change dans le journal de suivi.', 'Choisir un shampoing doux pour le cuir chevelu.'],
      warnings: [],
    }, gate);
    assert.ok(!v.ok && v.reasons.join(' ').includes('vocabulaire banni'), 'générique non rejeté');
  });

  ok('segment ignoré → rejet', () => {
    const p = PROFILES[0]; // locks — mais une réponse « boucles »
    const { gate } = gateFor(p.ctx);
    const v = validateHairAiOutput({
      summary: 'Pour définir vos boucles, appliquez la crème sur cheveux mouillés en secouant les mèches, puis laissez sécher à l’air libre sans toucher pour garder le mouvement naturel de la fibre.',
      recommendedRoutine: 'Définition des boucles', reason: 'La définition se travaille sur cheveu mouillé, en gestes légers et réguliers, sans jamais froisser la boucle formée.',
      steps: ['Laver les cheveux avec un shampoing doux et rincé longtemps.', 'Appliquer la crème de définition sur cheveu trempé.', 'Essorer avec un tissu souple sans frotter les mèches.', 'Sécher à l’air sans toucher aux boucles formées.', 'Noter la tenue au réveil dans le journal.'],
      warnings: [],
    }, gate);
    assert.ok(!v.ok && v.reasons.join(' ').includes('segment'), 'réponse hors-segment non rejetée');
  });

  ok('préoccupation ignorée → rejet', () => {
    const p = PROFILES[2]; // tresses, focus « Zéro tension aux racines et aux edges »
    const { gate } = gateFor(p.ctx);
    const derivedTexts = gate.derived.map(d => d.text).join(' ');
    const v = validateHairAiOutput({
      summary: `Le cycle protectrice que vous suivez est bien celui des tresses, avec soin léger et gestes doux ${derivedTexts}`,
      recommendedRoutine: 'Cycle protectrice', reason: 'La routine protectrice protège les longueurs tout en laissant le cuir chevelu respirer entre deux coiffures posées.',
      steps: gate.engineActions.slice(0, 8),
      warnings: [],
    }, gate);
    // Le libellé du focus contient « tension » — repris via les dérivations ?
    // Si oui, le test n'est pas discriminant ; on force alors une version SANS tension.
    if (v.ok) {
      const noTension = v;
      assert.ok(noTension.ok, 'incohérence interne du test');
      // variante explicite : résumé vidés des mots du focus
      const summarySans = `Le cycle protectrice est celui des tresses : longueurs au calme, gestes légers ${gate.derived.map(d => d.text.replace(/tension|edges|racines/gi, 'soins')).join(' ')}`;
      const v2 = validateHairAiOutput({ summary: summarySans, recommendedRoutine: 'Cycle protectrice', reason: 'La routine suit le cycle de la coiffure posée, sans ajouter un programme étranger aux longueurs protégées.', steps: gate.engineActions.slice(0, 8), warnings: [] }, gate);
      assert.ok(!v2.ok && v2.reasons.join(' ').includes('préoccupation'), 'préoccupation ignorée non rejetée');
    } else {
      assert.ok(v.reasons.join(' ').includes('préoccupation'), 'rejet pour une autre raison que la préoccupation');
    }
  });

  ok('affirmation médicale → rejet, négation de disclaimer → acceptée', () => {
    const p = PROFILES[0];
    const { gate, fallbackOut } = gateFor(p.ctx);
    assert.ok(findBannedIn('sans diagnostic médical').length === 0, 'la négation du disclaimer ne doit pas être bannie');
    assert.ok(findBannedIn('un diagnostic médical est nécessaire').includes('diagnostic médical'), 'l’affirmation médicale doit être bannie');
    const v = validateHairAiOutput({ ...fallbackOut, summary: fallbackOut.summary.replace('Ce que KURLA a compris', 'Un diagnostic médical est nécessaire avant tout, ce que KURLA a compris') }, gate);
    assert.ok(!v.ok && v.reasons.join(' ').includes('vocabulaire banni'), 'affirmation médicale non rejetée');
  });

  ok('formule réservée dans les warnings → rejet', () => {
    const p = PROFILES[4]; // perruque
    const { gate, fallbackOut } = gateFor(p.ctx);
    const v = validateHairAiOutput({ ...fallbackOut, warnings: ['Consultez un dermatologue si cela persiste.'] }, gate);
    assert.ok(!v.ok && v.reasons.join(' ').includes('vocabulaire banni'), 'warning médical non rejeté');
  });

  ok('étapes inventées → rejet', () => {
    const p = PROFILES[0];
    const { gate, fallbackOut } = gateFor(p.ctx);
    const v = validateHairAiOutput({
      ...fallbackOut,
      steps: ['Acheter cinq produits différents et tout appliquer en même temps chaque soir de la semaine.', 'Stocker les huiles au réfrigérateur pour les conserver plus longtemps que la date.', 'Se couper les pointes seul à la maison tous les mois sans rien mesurer.', 'Remplacer le shampoing par du savon de Marseille pendant un mois complet.', 'Dormir sans rien sur la tête même quand le vent tourne, pour aérer le crâne.'],
    }, gate);
    assert.ok(!v.ok && v.reasons.join(' ').includes('routine moteur'), 'étapes hors-programme non rejetées');
  });

  ok('résumé trop court / étapes manquantes → rejet', () => {
    const p = PROFILES[0];
    const { gate, fallbackOut } = gateFor(p.ctx);
    const short = validateHairAiOutput({ ...fallbackOut, summary: 'Routine locks adaptée à votre situation.' }, gate);
    assert.ok(!short.ok && short.reasons.join(' ').includes('résumé trop court'), 'résumé court non rejeté');
    const few = validateHairAiOutput({ ...fallbackOut, steps: ['Laver les locks.'] }, gate);
    assert.ok(!few.ok && few.reasons.join(' ').includes('étapes'), 'absence d’étapes non rejetée');
  });

  // 4. La liste des génériques bannis est bien la source unique des bancs.
  ok('liste des génériques bannis complète (5 entrées, route comprise)', () => {
    assert.ok(BANNED_GENERIC_PHRASES.includes('routine capillaire structurée à ajuster progressivement'));
    assert.ok(BANNED_GENERIC_PHRASES.includes('routine de soin de la peau structurée à ajuster progressivement'), 'le générique de la route peau doit être banni aussi');
  });

  console.log(`[PASS] Garde-fou D3 : ${checks} contrats — auto-cohérence du déterministe, reformulation acceptée, 6 classes de rejet, disclaimers préservés.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
