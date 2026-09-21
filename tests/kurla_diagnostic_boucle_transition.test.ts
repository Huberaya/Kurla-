// Banc D10 — les questions « bouclés 3B–3C » (séchage, fixant) et « transition »
// (position du fade) : F = le bout-en-bout est prouvé (aucune réponse sans
// effet), E = les gardes de segment tiennent (une réponse hors profil ne doit
// JAMAIS paraître, même rémanente d'un ancien profil).
// La même discipline qu'au banc crépu D9 : ce qui n'est pas écrit ici n'existe pas.
import { readFileSync } from 'node:fs';
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../src/lib/knowledge/hairAdvisory.ts';

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok:', name); }
}
function txt(x: unknown): string {
  return JSON.stringify(x);
}
function frisee(extra: Record<string, unknown> = {}) {
  return buildHairAdvisoryCtx({
    texture: 'frisee', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    length: 'moyenne', experience: 'habituee', priority: 'definition', style: 'naturel',
    ...extra,
  } as any);
}

// --- F. Le bout-en-bout : la réponse traverse jusqu'au rendu ---
{
  const ctx = frisee({ curlyDry: 'serviette', curlyHold: 'gel' });
  ok('F1_ctx_transmet_reponses', ctx.curlyDry === 'serviette' && ctx.curlyHold === 'gel');

  const routine: any = buildHairAdvisoryRoutine(frisee({ curlyDry: 'serviette' }));
  const step = routine.morning.find((x: any) => x.action === 'Séchage et finition, calés sur vos habitudes');
  ok('F2_sechage_serviette_sert_la_finale', !!step && /presse — t-shirt de coton ou microfibre/.test(String(step.how ?? '')));

  const routine2: any = buildHairAdvisoryRoutine(frisee({ curlyDry: 'diffuse_chaud' }));
  ok('F3_diffuseur_chaud_garde_les_gardes', /protecteur de chaleur/.test(txt(routine2)) && /air coupé aux trois quarts/.test(txt(routine2)));

  const routine3: any = buildHairAdvisoryRoutine(frisee({ curlyHold: 'gel' }));
  ok('F4_gel_sert_la_finale', /casser le film/.test(txt(routine3)) && /huile/.test(txt(routine3)));
  const routine4: any = buildHairAdvisoryRoutine(frisee({ curlyHold: 'mousse' }));
  ok('F5_mousse_sert_la_pose', /cheveu très mouillé/.test(txt(routine4)));

  // F6. Compatibilité ascendante stricte : profils « inconnue » ≡ payload sans les clés.
  const a = buildHairAdvisoryRoutine(frisee({ curlyDry: 'inconnue', curlyHold: 'inconnue' }));
  const b = buildHairAdvisoryRoutine(frisee({}));
  ok('F6_inconnu_comme_avant', txt(a) === txt(b));

  // F7. Transition : chaque position change « Le choix honnête ».
  const def = (transitionStep: string) => buildHairAdvisoryCtx({
    texture: 'defrisee', style: 'naturel', porosity: 'moyenne', scalp: 'normal',
    frequency: '1x_semaine', priority: 'casse', transitionStep,
  } as any);
  const honestHow = (transitionStep: string) => {
    const r: any = buildHairAdvisoryRoutine(def(transitionStep));
    const step = (r.weekly as any[]).find(x => x.action === 'Le choix honnête : fade ou continuité');
    return step ? String(step.how ?? '') : '';
  };
  ok('F7_majorite_stabilise', /c’est la stabilisation/.test(honestHow('majorite')));
  ok('F8_minorite_protege_fade', /Le fade est engagé/.test(honestHow('minorite')));
  ok('F9_quasi_nulle_quitte_reparation', /quitte le mode réparation/.test(honestHow('quasi_nulle')));
  ok('F10_transition_inconnue_comme_avant',
    txt(buildHairAdvisoryRoutine(def('inconnue'))) === txt(buildHairAdvisoryRoutine(def('absente'))));

  // F11. Le résumé rend les décisions (jamais une décision que le cycle ne tient pas).
  const summary = buildHairAdvisorySummary(frisee({ curlyDry: 'diffuse_froid', curlyHold: 'creme' })) as string;
  ok('F11_resume_rend_les_deux', /diffuseur froid ou tiède/.test(summary) && /Fixation à la crème/.test(summary));
  const summaryT = buildHairAdvisorySummary(def('minorite')) as string;
  ok('F12_resume_rend_transition', /Transition engagée/.test(summaryT));
}

// --- E. Les gardes : une réponse hors profil ne doit JAMAIS paraître ---
{
  // E1. Locks tressées-depuis-curls : une réponse rémanente « serviette » ne doit
  // jamais imposer un séchage au diffuseur à un cuir chevelu en locks.
  const locks = buildHairAdvisoryCtx({
    texture: 'bouclee', style: 'locks', porosity: 'moyenne', scalp: 'normal',
    frequency: '1x_semaine', priority: 'pousse', curlyDry: 'serviette', curlyHold: 'gel', transitionStep: 'majorite',
  } as any);
  ok('E1_locks_ignorent_boucles_et_transition',
    !/Séchage et finition/.test(txt(buildHairAdvisoryRoutine(locks))) &&
    !/Séchage déclaré|Fixation au/.test(buildHairAdvisorySummary(locks) as string) &&
    !/Transition :|Transition engagée|Transition presque/.test(buildHairAdvisorySummary(locks) as string));

  // E2. Enfant : les deux questions ne lui sont pas posées — rémanence ignorée.
  const kid = buildHairAdvisoryCtx({
    texture: 'frisee', style: 'enfant', porosity: 'moyenne', scalp: 'normal',
    frequency: '1x_semaine', priority: 'demelage_enfant', curlyDry: 'serviette', curlyHold: 'gel',
  } as any);
  const kidRoutine = buildHairAdvisoryRoutine(kid);
  ok('E2_enfant_ne recoit ni sechage ni fixant',
    !/Séchage et finition/.test(txt(kidRoutine)) &&
    !/Séchage déclaré|Fixation au/.test(buildHairAdvisorySummary(kid) as string));

  // E3. Pas de transition → la position déclarée est ignorée, même menteuse.
  const notTransition = frisee({ transitionStep: 'majorite' });
  ok('E3_hors_transition_ignore',
    !/stabilisation/.test(txt(buildHairAdvisoryRoutine(notTransition))) &&
    !/Transition :/.test(buildHairAdvisorySummary(notTransition) as string));

  // E4. Transition + locks (réponse d un avant-lock) : rien.
  const transLocks = buildHairAdvisoryCtx({
    texture: 'defrisee', style: 'locks', transitionStep: 'minorite',
  } as any);
  ok('E4_transition_locks_ignoree',
    !/Le fade est engagé/.test(txt(buildHairAdvisoryRoutine(transLocks))) &&
    !/Transition engagée/.test(buildHairAdvisorySummary(transLocks) as string));

  // E5. Défrisé + « aucun » chaleur/chimie : la contradiction D9 est fermée —
  // on ne félicite plus des longueurs « vierges de chaleur » qui sortent du défrisant.
  const defAucun = buildHairAdvisoryCtx({
    texture: 'defrisee', style: 'naturel', porosity: 'moyenne', scalp: 'normal',
    frequency: '1x_semaine', priority: 'casse', chemicalHeat: 'aucun',
  } as any);
  const rDef: any = buildHairAdvisoryRoutine(defAucun);
  ok('E5_defrise_plus_de_recompense_vierge',
    !/vierges de chaleur/.test(buildHairAdvisorySummary(defAucun) as string) && !/r[èe]gle des trois/.test(txt(rDef)));
  // … et le vrai « aucun » (vierges) garde sa récompense.
  const vierges = buildHairAdvisoryCtx({
    texture: 'bouclee', style: 'naturel', porosity: 'moyenne', scalp: 'normal',
    frequency: '1x_semaine', priority: 'casse', chemicalHeat: 'aucun',
  } as any);
  ok('E6_vierges_gardent_la_ligne', /vierges de chaleur/.test(buildHairAdvisorySummary(vierges) as string));

  // E7. Déféri en style (texture pas crépue ni défrisée) : boucles hors profil → rien.
  const defrie = buildHairAdvisoryCtx({
    texture: 'lisse', style: 'defrie', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    priority: 'protection', curlyDry: 'serviette', curlyHold: 'gel',
  } as any);
  ok('E7_lisse_defri_ignore_boucles', !/Séchage et finition/.test(txt(buildHairAdvisoryRoutine(defrie))));

  // E8. Le builder partagé est le seul tuyau : les trois clés D10 y sont passées.
  const src = readFileSync(new URL('../src/lib/knowledge/hairAdvisory.ts', import.meta.url), 'utf8');
  ok('E8_builder_passe_les_cles',
    /curlyDry: str\('curlyDry'\)/.test(src) &&
    /curlyHold: str\('curlyHold'\)/.test(src) &&
    /transitionStep: str\('transitionStep'\)/.test(src));
  for (const f of ['src/server/routes/recommendations.ts', 'src/lib/diagnosticResult.ts']) {
    const t = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    ok('E9_pas_de_liste_blanche_locale_' + f.split('/').pop(), !/curlyDry|curlyHold|transitionStep/.test(t));
  }

  // E10. La page pose les questions au bon segment (gates d affichage).
  const ui = readFileSync(new URL('../src/pages/DiagnosticHairPage.tsx', import.meta.url), 'utf8');
  ok('E10_ui_gates_curly', /\.\.\.\(isCurlyNow \? \['curlyDry', 'curlyHold'\] : \[\]\)/.test(ui));
  ok('E11_ui_transition_remplace_chaleur', /\[isTransitionNow \? 'transitionStep' : 'chemicalHeat'\]/.test(ui));
  ok('E12_ui_defauts_inconnus', /curlyDry: 'inconnue'/.test(ui) && /curlyHold: 'inconnue'/.test(ui) && /transitionStep: 'inconnue'/.test(ui));
}

if (failed > 0) { console.error('ÉCHECS:', failed); process.exit(1); }
console.log('Banc bouclés + transition : OK');
