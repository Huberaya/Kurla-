// Banc VAGUE 1 (20/09) — C11 (limites affichées), C4 (temps du jour de lavage),
// C3 (eau calcaire + comportement selon l'air).
// Même discipline qu'aux bancs D9–D14 : F = chaque réponse a un effet vérifié
// bout-en-bout ; E = les gardes tiennent (valeurs inventées, rémanences).
import { readFileSync } from 'node:fs';
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../src/lib/knowledge/hairAdvisory.ts';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult.ts';
import { AI_GUARDRAILS, pickFreeTextForTriage } from '../src/lib/ai/guardrails.ts';

let failed = 0;
function ok(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok:', name); }
}
const txt = (x: unknown) => JSON.stringify(x);
const all = (ctx: any) => { const r: any = buildHairAdvisoryRoutine(ctx); return [...r.morning, ...r.evening, ...r.weekly]; };
const body = (ctx: any) => txt(all(ctx)) + buildHairAdvisorySummary(ctx);

const crepue = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'crepue', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'hydratation', ...extra,
} as any);
const wig = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'crepue', style: 'wig', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'protection', ...extra,
} as any);
const protect = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'crepue', style: 'braids', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'entretien_protective', ...extra,
} as any);
const ondee = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'ondulee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'definition', ...extra,
} as any);

/* ------------------------------------------------------------------ */
/* C4 — le temps du jour de lavage                                     */
/* ------------------------------------------------------------------ */
{
  const court = crepue({ washTime: 'court' });
  ok('C4_1_court_technique_deux_sections', /deux sections, pas de pinces/.test(txt(all(court))));
  ok('C4_2_court_masque_confondu', /le masque se confond avec le conditionneur/.test(txt(all(court))));
  ok('C4_3_court_au_resume', /Jour de lavage : moins de 20 minutes/.test(buildHairAdvisorySummary(court) as string));
  ok('C4_4_court_ne_supprime_pas_le_demelage', /Conditionner et démêler/.test(txt(all(court))));
  ok('C4_5_court_ne_supprime_pas_le_masque', /Masque/.test(txt(all(court))));

  // Le croisement qui vaut la question : court + lavages espacés = la fréquence
  // est le vrai levier (sourcé r/Naturalhair). Sans ce croisement, la phrase
  // doit disparaître — elle ne s'applique pas à quelqu'un qui lave déjà souvent.
  const courtRare = crepue({ washTime: 'court', frequency: 'less_1x' });
  ok('C4_6_court_x_rare_le_frein_est_la_frequence', /c’est démêler un cheveu qui n’a pas eu le temps de se nouer/.test(txt(all(courtRare))));
  const courtHebdo = crepue({ washTime: 'court', frequency: '1x_semaine' });
  ok('C4_7_court_x_hebdo_pas_de_lecon_de_frequence', !/c’est démêler un cheveu qui n’a pas eu le temps/.test(txt(all(courtHebdo))));

  const moyen = crepue({ washTime: 'moyen' });
  ok('C4_8_moyen_quatre_sections', /quatre sections, démêlage pendant que l’après-shampoing pose/.test(txt(all(moyen))));
  const long = crepue({ washTime: 'long' });
  ok('C4_9_long_pre_demelage', /défaire les nœuds aux doigts la veille/.test(txt(all(long))));
  ok('C4_10_long_masque_temps_de_pose', /Le temps de pose est votre avantage/.test(txt(all(long))));
  ok('C4_11_long_au_resume', /vous avez du temps/.test(buildHairAdvisorySummary(long) as string));

  ok('C4_12_inconnu_aucun_effet', !/Jour de lavage/.test(body(crepue())) && !/deux sections, pas de pinces/.test(txt(all(crepue()))));
  ok('C4_13_valeur_inventee_tombe_bien', !/deux sections, pas de pinces/.test(txt(all(crepue({ washTime: 'trois_heures' })))));
  // Le temps du jour de lavage est universel : locks, enfant et perruque lavent aussi.
  const locksCourt = crepue({ style: 'locks', washTime: 'court' });
  // D9 — le garde du vocabulaire : le mot « démêlage » (et sa famille) est
  // interdit sur locks. La vague 1 ne doit pas le réintroduire par une porte
  // dérobée (résumé, masque) alors qu'il est absent de l'étape de lavage.
  ok('C4_14_universel_locks_resume', /Jour de lavage : moins de 20 minutes/.test(buildHairAdvisorySummary(locksCourt) as string));
  // Les seules occurrences du mot sur locks sont des NÉGATIONS du moteur
  // (« ce n’est pas la démêler », « aucun peigne ») — la matrice les distingue
  // déjà. Ici on vérifie que la vague 1 n'ajoute aucune PRESCRIPTION du genre.
  const sumLocksCourt = buildHairAdvisorySummary(locksCourt) as string;
  ok('C4_15_locks_variante_dediee', /le temps se gagne au séchage/.test(sumLocksCourt) && !/d[ée]m[êe]l|peigne/i.test(sumLocksCourt));
  ok('C4_15b_locks_masque_sans_demelage', /le soin se confond avec le conditionneur — on le pose, on rince/.test(txt(all(locksCourt)))
    && !/on démêle dedans/.test(txt(all(locksCourt))));
  const locksLong = crepue({ style: 'locks', washTime: 'long' });
  const sumLocksLong = buildHairAdvisorySummary(locksLong) as string;
  ok('C4_16_locks_long_rincage_et_sechage', /il va au rinçage et au séchage complet/.test(sumLocksLong) && !/d[ée]m[êe]l|peigne/i.test(sumLocksLong));
}

/* ------------------------------------------------------------------ */
/* C3 — l'eau et l'air                                                 */
/* ------------------------------------------------------------------ */
{
  const dur = crepue({ water: 'calcaire' });
  ok('C3_1_calcaire_chelateur', /un chélateur \(EDTA, acide phytique ou citrique/.test(txt(all(dur))));
  ok('C3_2_calcaire_jamais_hebdo', /une fois par mois, jamais toutes les semaines/.test(txt(all(dur))));
  // Cuir chevelu normal, au naturel : aucun nettoyage profond n'est prévu —
  // la clause doit quand même être rendue (sinon la réponse est décorative).
  ok('C3_22_calcaire_rendu_sans_nettoyage_profond', /un chélateur \(EDTA/.test(txt(all(dur))));
  ok('C3_23_complement_au_nettoyage_profond', /c’est ce nettoyage-ci qui doit être chélateur/.test(txt(all(protect({ water: 'calcaire' })))));
  ok('C3_3_calcaire_au_resume', /Eau calcaire déclarée/.test(buildHairAdvisorySummary(dur) as string));
  // La clause vit dans les TROIS cycles de lavage (naturel, protectrice, perruque) :
  // une porteuse sous pose a la même eau que tout le monde.
  // En protectrice et sous perruque, c'est le nettoyage profond qui porte la clause
  // (ces cycles n'ont pas l'étape « laver » du cycle naturel).
  ok('C3_4_calcaire_cycle_protectrice', /chélateur \(EDTA/.test(txt(all(protect({ water: 'calcaire' })))));
  ok('C3_5_calcaire_cycle_perruque', /chélateur \(EDTA/.test(txt(all(wig({ water: 'calcaire' })))));
  const douce = crepue({ water: 'douce' });
  ok('C3_6_eau_douce_confirmation', /Eau douce déclarée : rien à corriger/.test(txt(all(douce))));
  ok('C3_7_inconnu_aucun_effet', !/chélateur/.test(body(crepue())) && !/Eau calcaire/.test(buildHairAdvisorySummary(crepue()) as string));
  ok('C3_8_valeur_inventee_tombe_bien', !/chélateur/.test(body(crepue({ water: 'de_pluie' }))));

  const gonfle = crepue({ humidity: 'gonfle' });
  ok('C3_9_gonfle_glycerine', /La glycérine en tête de liste attire alors l’eau de l’air/.test(txt(all(gonfle))));
  ok('C3_10_gonfle_filmogenes', /humectants filmogènes/.test(txt(all(gonfle))));
  ok('C3_11_gonfle_au_resume', /vos cheveux gonflent par temps humide/.test(buildHairAdvisorySummary(gonfle) as string));
  // La nuance crépue est sourcée (Curly Nikki) : un cheveu très sec tolère souvent
  // la glycérine plus longtemps — elle ne doit pas être servie à une ondulée.
  ok('C3_12_gonfle_nuance_crepue_seulement', /très sec tolère souvent la glycérine/.test(txt(all(gonfle)))
    && !/très sec tolère souvent la glycérine/.test(txt(all(ondee({ humidity: 'gonfle' })))));
  const sec = crepue({ humidity: 'sec' });
  ok('C3_13_sec_inverse_glycerine', /la glycérine fait ici l’inverse/.test(txt(all(sec))));
  ok('C3_14_sec_au_resume', /Air sec déclaré/.test(buildHairAdvisorySummary(sec) as string));
  const sallonge = crepue({ humidity: 'sallonge' });
  ok('C3_15_sallonge_surcharge', /c’est une surcharge d’eau, pas un manque/.test(txt(all(sallonge))));
  const stable = crepue({ humidity: 'ne_bouge_pas' });
  ok('C3_16_ne_bouge_pas_rien_a_prevoir', /aucun ajustement saisonnier à prévoir/.test(txt(all(stable))));
  // L'humidité se lit dans les trois branches d'hydratation : ondes, LCO, porosité faible.
  ok('C3_17_humidite_branche_ondes', /la glycérine fait ici l’inverse/.test(txt(all(ondee({ humidity: 'sec' })))));
  ok('C3_21_humidite_ondes_gonfle', /La glycérine en tête de liste/.test(txt(all(ondee({ humidity: 'gonfle' })))));
  ok('C3_18_humidite_branche_porosite_faible', /la glycérine fait ici l’inverse/.test(txt(all(crepue({ porosity: 'faible', humidity: 'sec' })))));
  ok('C3_19_inconnu_aucun_effet', !/glycérine/i.test(body(crepue())) && !/Humidité :/.test(buildHairAdvisorySummary(crepue()) as string));
  ok('C3_20_valeur_inventee_tombe_bien', !/glycérine/i.test(body(crepue({ humidity: 'tropical' }))));
}

/* ------------------------------------------------------------------ */
/* C11 — ce que le diagnostic ne peut pas dire                         */
/* ------------------------------------------------------------------ */
{
  const model = (answers: Record<string, unknown>, isSkin = false) => buildDiagnosticResultModel({
    answers, result: null, products: [], isSkin,
  });

  const complet = model({
    texture: 'crepue', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    length: 'moyenne', experience: 'habituee', priority: 'hydratation', budget: '40_70', focus: '',
    washTime: 'moyen', water: 'douce', humidity: 'ne_bouge_pas',
  });
  ok('C11_1_profil_complet_confiance_haute', complet.confidence.level === 'haute' && complet.confidence.label === 'Profil complet');
  ok('C11_2_redflags_cheveux_trois', complet.redFlags.length === 3);
  ok('C11_3_redflags_signaux_pro', complet.redFlags.some(f => /Des plaques, des zones qui dégarnissent/.test(f))
    && complet.redFlags.some(f => /brûle, suinte ou fait mal/.test(f))
    && complet.redFlags.some(f => /résiste à trois lavages doux/.test(f)));
  ok('C11_4_perimetre_non_medical', /ne pose aucun diagnostic médical/.test(complet.scopeNote));

  // Deux manques non critiques → confiance moyenne, et ils sont NOMMÉS.
  const moyen = model({
    texture: 'crepue', style: 'naturel', porosity: 'inconnue', scalp: 'normal', frequency: '1x_semaine',
    length: 'moyenne', experience: 'inconnue', priority: 'hydratation', budget: '40_70',
    washTime: 'moyen', water: 'douce', humidity: 'ne_bouge_pas',
  });
  ok('C11_5_confiance_moyenne', moyen.confidence.level === 'moyenne' && moyen.confidence.label === 'Profil solide, à affiner');
  ok('C11_6_manques_nommes', /porosité/.test(moyen.confidence.note) && /expérience/.test(moyen.confidence.note));

  // Un manque CRITIQUE (texture) → « à affiner », même avec un seul manque :
  // ce n'est pas le compte qui décide seul, c'est aussi lequel manque.
  const critique = model({
    texture: 'inconnue', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    length: 'moyenne', experience: 'habituee', priority: 'hydratation', budget: '40_70',
    washTime: 'moyen', water: 'douce', humidity: 'ne_bouge_pas',
  });
  ok('C11_7_manque_critique_a_affiner', critique.confidence.level === 'a_ajuster' && critique.confidence.label === 'Profil à affiner');
  ok('C11_8_critique_nomme', /texture/i.test(critique.confidence.note));

  // Peau : les signaux ne sont pas ceux du cheveu — un mauvais copier-coller
  // serait exactement le genre d'erreur que ce bloc doit rendre impossible.
  const peau = model({ skinType: 'seche', sensitivity: 'moyenne', routine: 'simple', budget: '40_70' }, true);
  ok('C11_9_redflags_peau_differents', peau.redFlags.length === 3
    && peau.redFlags.some(f => /qui saigne ou ne cicatrise pas/.test(f))
    && !peau.redFlags.some(f => /cuir chevelu/.test(f)));

  // Le bloc est rendu dans la page, avec la confiance calculée (pas un texte fixe).
  const ui = readFileSync(new URL('../src/pages/DiagnosticResultPage.tsx', import.meta.url), 'utf8');
  ok('C11_10_bloc_rendu_dans_la_page', /Ce que ce diagnostic ne peut pas dire/.test(ui)
    && /model\.confidence\.level/.test(ui) && /model\.redFlags\.map/.test(ui) && /model\.scopeNote/.test(ui));
}

/* ------------------------------------------------------------------ */
/* Triage médical : les identifiants du questionnaire ne sont pas un    */
/* propos de santé (fausse urgence trouvée en parcourant la vague 1)    */
/* ------------------------------------------------------------------ */
{
  const ids = { texture: 'crepue', style: 'naturel', humidity: 'gonfle', water: 'calcaire', washTime: 'court', scalp: 'irritation' };
  const texteIds = pickFreeTextForTriage(ids);
  ok('T1_ids_techniques_hors_triage', texteIds === '');
  ok('T2_aucune_fausse_urgence', !AI_GUARDRAILS.triage(texteIds).emergency);
  // Le filet de sécurité reste entier : une phrase écrite par la personne,
  // elle, est toujours détectée (c'est la seule chose que le triage doit voir).
  const libre = { notes: 'ma gorge gonfle et je narrive plus a respirer' };
  ok('T3_texte_libre_toujours_detecte', AI_GUARDRAILS.triage(pickFreeTextForTriage(libre)).emergency);
  const route = readFileSync(new URL('../src/server/routes/recommendations.ts', import.meta.url), 'utf8');
  ok('T4_route_ne_trie_plus_le_json_brut', /pickFreeTextForTriage\(answersForAi\)/.test(route) && !/JSON\.stringify\(answersForAi\)/.test(route));
}

if (failed > 0) { console.error('ÉCHECS:', failed); process.exit(1); }
console.log('Banc vague 1 (C11 + C4 + C3) : OK');
