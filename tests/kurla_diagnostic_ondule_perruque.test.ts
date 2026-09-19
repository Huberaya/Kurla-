// Banc D12 — ondulé 2 et perruque. Même discipline qu'aux bancs D9–D11 :
// F = chaque réponse/un rendu nouveau a un effet vérifié bout-en-bout ;
// E = les gardes de segment tiennent (rémanences, enfants, cycles voisins).
import { readFileSync } from 'node:fs';
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary, pickHairLessons } from '../src/lib/knowledge/hairAdvisory.ts';
import { getHairDiagnosticSegment, ALL_HAIR_TEXTURES } from '../src/lib/diagnosticSegments.ts';

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok:', name); }
}
const txt = (x: unknown) => JSON.stringify(x);
const all = (ctx: any) => { const r: any = buildHairAdvisoryRoutine(ctx); return [...r.morning, ...r.evening, ...r.weekly]; };
const ondee = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'ondulee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'definition', ...extra,
} as any);
const wig = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'crepue', style: 'wig', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'protection', ...extra,
} as any);

// --- F. Ondulé 2 ---
{
  ok('F1_tuyau_et_label', ALL_HAIR_TEXTURES.includes('ondulee') && (buildHairAdvisorySummary(ondee()) as string).length > 40);
  const o = ondee();
  const bodyO = txt(all(o)) + buildHairAdvisorySummary(o);
  ok('F2_regle_des_ondes_presente', /Hydrater léger — la règle des ondes/.test(bodyO) && /dos noisette — jamais l’avant-bras/.test(bodyO));
  ok('F3_LCO_jamais_servie_a_un_ondule', !/Hydrater puis sceller/.test(bodyO));
  ok('F4_rythme_de_lavage_ondule', /le calendrier cède à la racine/.test(bodyO));
  ok('F5_resume_regle_maitresse', /Ondulée 2A–2C : la règle maîtresse est la légèreté/.test(bodyO));

  const oLow = ondee({ porosity: 'faible' });
  ok('F6_ondulee_porosite_faible_a_sabranche',
    /Soins légers, bien placés/.test(txt(all(oLow))) && !/Hydrater puis sceller/.test(txt(all(oLow))));

  // F7 : les réponses boucles du D10 sont désormais reçues par l'ondulée —
  // avec le même gate (jamais sous locks, jamais enfant).
  const oC = ondee({ curlyDry: 'air', curlyHold: 'mousse' });
  ok('F7_reponses_boucles_recues',
    /Séchage et finition, calés sur vos habitudes/.test(txt(all(oC))) && /ne plus toucher les mèches/.test(txt(all(oC))));

  // F8 : la leçon LCO ne doit JAMAIS contredire la règle des ondes ; elle reste
  // pour la boucle voisine.
  const lessonsOndulee = txt(pickHairLessons(ondee({ priority: 'hydratation' }) as never));
  const lessonsBoucle = txt(pickHairLessons(buildHairAdvisoryCtx({
    texture: 'bouclee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine', priority: 'hydratation',
  } as any) as never));
  ok('F8_lecon_LCO_exclue_pour_ondulee', !/LCO/.test(lessonsOndulee) && /LCO/.test(lessonsBoucle));

  // F9 : sous locks, la branche locks prime (le rythme ondulé n'y a rien à faire).
  const oL = ondee({ style: 'locks', priority: 'pousse' });
  ok('F9_ondulee_sous_locks_garde_cycle_locks',
    !/le calendrier cède à la racine/.test(txt(all(oL))) && !/Hydrater léger — la règle des ondes/.test(txt(all(oL))));

  ok('F10_segment_ondulee_naturel', getHairDiagnosticSegment('ondulee', 'naturel')?.id === 'naturel_boucle');
  ok('F11_segment_ondulee_locks', getHairDiagnosticSegment('ondulee', 'locks')?.id === 'locks');
}

// --- F. Perruque : fixation et portée ---
{
  const wGlue = wig({ wigBond: 'glue', wigWear: 'jamais_retiree' });
  const bodyW = txt(all(wGlue)) + buildHairAdvisorySummary(wGlue);
  ok('F12_colle_solvant_patch', /jamais à l’arraché/.test(bodyW) && /24 heures avant, pli du coude/.test(bodyW));
  ok('F13_portee_plafond', /Six semaines est un plafond, pas un objectif/.test(bodyW));
  ok('F14_soiree_signaux_depose', /démangeaison persistante, brûlure ou odeur sous la pose = dépose immédiate/.test(bodyW));
  ok('F15_resume_deux_lignes', /Pose déclarée : colle/.test(bodyW) && /Rythme de pose : portée continue/.test(bodyW));

  const wTape = wig({ wigBond: 'tape', wigWear: 'deux_quatre' });
  ok('F16_tape_residu_mi_parcours',
    /résidu se dissout \(dissolvant ou huile légère sur coton\) AVANT de frotter/.test(txt(all(wTape))) &&
    /contrôle à blanc à mi-parcours/.test(txt(all(wTape))));

  const wGlueless = wig({ wigBond: 'glueless', wigWear: 'quotidienne' });
  const bodyG = txt(all(wGlueless)) + buildHairAdvisorySummary(wGlueless);
  ok('F17_glueless_confirme_sansColle',
    /la dépose est libre/.test(bodyG) && /ce rythme est le modèle/.test(bodyG) &&
    !/jamais à l’arraché/.test(bodyG) && !/Un point d’abord : porter sans dépose/.test(bodyG));

  const wOne = wig({ wigWear: 'une_semaine' });
  ok('F18_hebdo_format_standard', /format standard sain/.test(txt(all(wOne))));

  // F19 : inconnu = comportement d'avant, au JSON près (les deux segments).
  ok('F19_inconnu_comme_avant',
    txt(buildHairAdvisoryRoutine(wig({ wigBond: 'inconnu', wigWear: 'inconnu' }))) === txt(buildHairAdvisoryRoutine(wig({}))) &&
    txt(all(ondee({ curlyDry: 'inconnue', curlyHold: 'inconnue' }))) === txt(all(ondee({}))));
}

// --- E. Gardes ---
{
  // E1. Locks sous perruque : cycle locks (D5) → les réponses perruque sont
  // ignorées À LA SOURCE, résumé compris.
  const lk = buildHairAdvisoryCtx({ texture: 'locksee', style: 'wig', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine', priority: 'pousse', wigBond: 'glue', wigWear: 'jamais_retiree' } as any);
  ok('E1_locks_sous_perruque_sans_effet_perruque',
    !/jamais à l’arraché|Six semaines est un plafond/.test(txt(all(lk)) + buildHairAdvisorySummary(lk)));

  // E2. Enfant sous perruque (priorité démêlage) : cycle enfant → pas de
  // promesse adhésif (la matrice l'a trouvé, la garde vit dans flags).
  const kid = buildHairAdvisoryCtx({ texture: 'crepue', style: 'wig', priority: 'demelage_enfant', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine', wigBond: 'glue', wigWear: 'jamais_retiree' } as any);
  ok('E2_enfant_perruque_sans_promesse_adhesif',
    !/Six semaines est un plafond|Pose déclarée|démangeaison persistante/.test(txt(all(kid)) + buildHairAdvisorySummary(kid)));

  // E3. Hors perruque : rémanence ignorée (une bouclée qui aurait répondu « colle »).
  const horsWig = ondee({ wigBond: 'glue', wigWear: 'jamais_retiree' });
  ok('E3_hors_perruque_remanence_ignoree',
    !/jamais à l’arraché|Pose déclarée/.test(txt(all(horsWig)) + buildHairAdvisorySummary(horsWig)));

  // E4. Valeurs inventées = blanc (payload corrompu).
  const junk = wig({ wigBond: 'gel forte', wigWear: 'toujours' });
  ok('E4_valeurs_hors_whitelist_ignorees', !/jamais à l’arraché|Six semaines/.test(txt(all(junk)) + buildHairAdvisorySummary(junk)));

  // E5. Le tuyau reste unique : le builder emporte les deux clés, et aucune
  // liste blanche locale n'est réapparue chez les consommateurs.
  const src = readFileSync(new URL('../src/lib/knowledge/hairAdvisory.ts', import.meta.url), 'utf8');
  ok('E6_builder_passe_les_cles', /wigBond: str\('wigBond'\)/.test(src) && /wigWear: str\('wigWear'\)/.test(src));
  for (const f of ['src/server/routes/recommendations.ts', 'src/lib/diagnosticResult.ts']) {
    const t = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    ok('E7_pas_de_liste_blanche_locale_' + f.split('/').pop(), !/wigBond|wigWear/.test(t));
  }

  // E8. La page pose les questions au bon moment, avec les défauts « inconnu ».
  const ui = readFileSync(new URL('../src/pages/DiagnosticHairPage.tsx', import.meta.url), 'utf8');
  ok('E8_ui_gates_perruque', /\.\.\.\(isWigNow \? \['wigBond', 'wigWear'\] : \[\]\)/.test(ui));
  ok('E9_ui_gate_enfant_exclu', /const isWigNow = answers\.style === 'wig' && !lockedNow && answers\.priority !== 'demelage_enfant';/.test(ui));
  ok('E10_ui_carte_ondulee', /id: 'ondulee', title: 'Ondulée \(2A–2C\)'/.test(ui));
  ok('E11_ui_defauts_inconnus', /wigBond: 'inconnu'/.test(ui) && /wigWear: 'inconnu'/.test(ui));
  ok('E12_curlyGate_trois_textures', /answers\.texture === 'frisee' \|\| answers\.texture === 'bouclee' \|\| answers\.texture === 'ondulee'/.test(ui));

  // E13. Compat vieux payloads : le jeton « ondee » (ancien, inexistant) ne
  // doit rien casser — il tombe dans le comportement générique.
  const legacy = buildHairAdvisoryCtx({ texture: 'ondee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine', priority: 'definition' } as any);
  ok('E13_ancien_faux_jeton_tombe_bien',
    !/Hydrater léger — la règle des ondes/.test(txt(all(legacy))) && !/Ondulée 2A–2C/.test(buildHairAdvisorySummary(legacy) as string));
}

if (failed > 0) { console.error('ÉCHECS:', failed); process.exit(1); }
console.log('Banc ondulé + perruque : OK');
