// Banc D11 — locks/microlocks : maturité, méthode d'entretien racine, séchage.
// Même discipline qu'aux bancs D9/D10 : F = chaque réponse a un effet rendu
// vérifié bout-en-bout (aucune question décorative) ; E = les gardes de segment
// tiennent (une réponse locks hors locks, ou hors profil locks, ne doit JAMAIS
// rien injecter — rémanence d'un ancien profil comprise).
import { readFileSync } from 'node:fs';
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../src/lib/knowledge/hairAdvisory.ts';

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok:', name); }
}
const txt = (x: unknown) => JSON.stringify(x);
function locks(extra: Record<string, unknown> = {}) {
  return buildHairAdvisoryCtx({
    texture: 'locksee', style: 'locks', porosity: 'moyenne', scalp: 'normal',
    frequency: '1x_semaine', length: 'moyenne', experience: 'habituee', priority: 'pousse',
    ...extra,
  } as any);
}
const allSteps = (ctx: any) => {
  const r: any = buildHairAdvisoryRoutine(ctx);
  return [...r.morning, ...r.evening, ...r.weekly];
};
const byAction = (ctx: any, action: string) => allSteps(ctx).find((x: any) => x.action === action);

// --- F. Effets rendus ---
{
  // F1. Le tuyau unique (buildHairAdvisoryCtx) emporte les trois réponses.
  const ctx = locks({ locStage: 'neuve', locCare: 'palm', locDry: 'sec' });
  ok('F1_ctx_transmet', ctx.locStage === 'neuve' && ctx.locCare === 'palm' && ctx.locDry === 'sec');

  // F2. Maturité : chaque étape de vie change le « Racines » — et elle seule.
  const rac = byAction(locks({ locStage: 'neuve' }), 'Racines : le travail de la lock');
  ok('F2_neuve_sert_la_patience', /raccourcissement fait partie du processus/.test(String(rac?.why)));
  const racA = byAction(locks({ locStage: 'ado' }), 'Racines : le travail de la lock');
  ok('F3_ado_sert_la_consolidation', /se consolide sans être blindée/.test(String(racA?.why)));
  const racM = byAction(locks({ locStage: 'mature' }), 'Racines : le travail de la lock');
  ok('F4_mature_ouvre_le_rythme', /supportent un entretien plus espacé/.test(String(racM?.why)));
  const racU = byAction(locks({ locStage: 'inconnu' }), 'Racines : le travail de la lock');
  ok('F5_inconnu_aucune_phrase_stage', !/raccourcissement|blindée|plus espacé/.test(String(racU?.why)));

  // F6. Méthode : freeform REMPLACE le discours retwist (hebdo + entre-deux),
  // c'est l'inverse exact de la faute « méthode récitée » corrigée au D10.
  const ff = byAction(locks({ locCare: 'freeform' }), 'Racines : le travail de la lock');
  const ffE = byAction(locks({ locCare: 'freeform' }), 'Entretenir entre deux lavages');
  ok('F6_freeform_remplace_le_retwist',
    /Rien ne sera retordu ici/.test(String(ff?.how)) && !/palm rolling des pointes/.test(String(ff?.how)) &&
    /rien à retordre/.test(String(ffE?.how)));
  const il = byAction(locks({ locCare: 'interlock' }), 'Racines : le travail de la lock');
  ok('F7_interlock_pose_le_plafond', /autour de huit semaines, jamais moins/.test(String(il?.how)) && /racine perd sa prise/.test(String(il?.how)));
  const pr = byAction(locks({ locCare: 'palm' }), 'Racines : le travail de la lock');
  ok('F8_palm_interdit_le_quotidien', /surtout pas tous les jours/.test(String(pr?.how)) && /frisottis entre deux séances est normal/.test(String(pr?.how)));

  // F9. Séchage : l'étape dédiée n'existe QUE si la réponse existe ; chaque
  // réponse y rend son fragment exact.
  const dryingExpected: Record<string, RegExp> = {
    sec: /le bon réflexe qui ferme le chapitre des odeurs|ferme le chapitre des odeurs/,
    seche: /vérifier à la main/,
    humide: /première cause d’odeur/,
    lentes: /rinçage plus long/,
  };
  for (const [k, re] of Object.entries(dryingExpected)) {
    const d = byAction(locks({ locDry: k }), 'Sécher les locks jusqu’au cœur');
    ok('F9_sechage_' + k, !!d && re.test(String(d.how)));
  }
  ok('F10_sechage_inconnu_aucune_etape', !byAction(locks({ locDry: 'inconnu' }), 'Sécher les locks jusqu’au cœur'));

  // F11. Compatibilité ascendante STRICTE : inconnu partout ≡ payload sans les clés.
  ok('F11_inconnu_comme_avant',
    txt(buildHairAdvisoryRoutine(locks({ locStage: 'inconnu', locCare: 'inconnu', locDry: 'inconnu' }))) ===
    txt(buildHairAdvisoryRoutine(locks({}))));

  // F12. Le résumé rend les trois décisions, ligne par ligne, jamais plus.
  const sum = buildHairAdvisorySummary(locks({ locStage: 'neuve', locCare: 'interlock', locDry: 'humide' })) as string;
  ok('F12_resume_trois_lignes',
    /Maturité : locks de moins de six mois/.test(sum) && /Entretien déclaré : interlocking/.test(sum) && /couchées humides/.test(sum));
  const sum2 = buildHairAdvisorySummary(locks({ locStage: 'inconnu', locCare: 'freeform', locDry: 'inconnu' })) as string;
  ok('F13_resume_seulement_ce_qu_on_sait',
    /libre pousse/.test(sum2) && !/Maturité :/.test(sum2) && !/Séchage :/.test(sum2));
}

// --- E. Gardes ---
{
  // E1. Hors locks : toute réponse locks est une rémanence — le moteur l'ignore.
  const bouclee = buildHairAdvisoryCtx({
    texture: 'frisee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    priority: 'definition', locStage: 'neuve', locCare: 'interlock', locDry: 'humide',
  } as any);
  ok('E1_hors_locks_ignore',
    !byAction(bouclee, 'Sécher les locks jusqu’au cœur') &&
    !/Maturité :|Entretien déclaré :/.test(buildHairAdvisorySummary(bouclee) as string));

  // E2. Boucles sous locks : l'inverse aussi — réponses curly rémanentes ignorées
  // (déjà verrouillées au D10, rappelé ici pour le segment).
  const lk = locks({ curlyDry: 'serviette', curlyHold: 'gel', locDry: 'sec' });
  const lkSteps = allSteps(lk);
  ok('E2_boucles_remanentes_hors_jeu',
    !lkSteps.some((x: any) => x.action === 'Séchage et finition, calés sur vos habitudes') &&
    lkSteps.some((x: any) => x.action === 'Sécher les locks jusqu’au cœur'));

  // E3. Perruque / protectrice qui aurait connu locks avant : rien.
  const wig = buildHairAdvisoryCtx({
    texture: 'crepue', style: 'wig', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    locStage: 'mature', locCare: 'palm', locDry: 'lentes',
  } as any);
  ok('E3_perruque_ignore_les_reponses_locks',
    !/Maturité :|Entretien déclaré :|Séchage : sèche/.test(buildHairAdvisorySummary(wig) as string) &&
    !byAction(wig, 'Sécher les locks jusqu’au cœur'));

  // E4. Enfant SANS locks (style enfant, texture crépue) : questions non posées,
  // réponse rémanente ignorée — et l'enfant AVEC locks peut répondre (le gardien
  // entretient la pousse : la consigne « pas de lutte contre le shrinkage » le
  // concerne), donc pas de garde enfant ici, volontairement.
  const kid = buildHairAdvisoryCtx({
    texture: 'crepue', style: 'enfant', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    priority: 'demelage_enfant', locDry: 'humide', locCare: 'interlock',
  } as any);
  ok('E4_enfant_sans_locks_ignore', !byAction(kid, 'Sécher les locks jusqu’au cœur'));

  // E5. Valeurs inventées / payload corrompu : whitelist moteur, rien ne passe.
  const corrupt = locks({ locStage: 'quatorze mois', locCare: '<script>', locDry: 'yes' });
  ok('E5_valeurs_inconnues_blanche',
    !byAction(corrupt, 'Sécher les locks jusqu’au cœur') &&
    !/Maturité :|Entretien déclaré :/.test(buildHairAdvisorySummary(corrupt) as string));

  // E6. Le builder partagé est le seul tuyau ; aucune liste blanche locale n'est
  // réapparue chez les consommateurs (règle née du D9).
  const src = readFileSync(new URL('../src/lib/knowledge/hairAdvisory.ts', import.meta.url), 'utf8');
  ok('E6_builder_passe_les_cles',
    /locStage: str\('locStage'\)/.test(src) && /locCare: str\('locCare'\)/.test(src) && /locDry: str\('locDry'\)/.test(src));
  for (const f of ['src/server/routes/recommendations.ts', 'src/lib/diagnosticResult.ts']) {
    const t = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    ok('E7_pas_de_liste_blanche_locale_' + f.split('/').pop(), !/locStage|locCare|locDry/.test(t));
  }

  // E8. La page ne pose les questions qu'aux locks, avec défauts « inconnu ».
  const ui = readFileSync(new URL('../src/pages/DiagnosticHairPage.tsx', import.meta.url), 'utf8');
  ok('E8_ui_gates_locks', /\.\.\.\(lockedNow \? \['locStage', 'locCare', 'locDry'\] : \[\]\)/.test(ui));
  ok('E9_ui_defauts_inconnus', /locStage: 'inconnu'/.test(ui) && /locCare: 'inconnu'/.test(ui) && /locDry: 'inconnu'/.test(ui));

  // E9b. Cohérence interne : une étape de séchage ne peut jamais sortir du
  // cycle locks/enfant même si flags mentait (défense en profondeur du builder).
  const incoherent = buildHairAdvisoryCtx({ texture: 'frisee', style: 'naturel', locDry: 'humide' } as any);
  ok('E9b_double_garde', !byAction(incoherent, 'Sécher les locks jusqu’au cœur'));
}

if (failed > 0) { console.error('ÉCHECS:', failed); process.exit(1); }
console.log('Banc locks (maturité, méthode, séchage) : OK');
