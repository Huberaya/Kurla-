// Banc VAGUE 2 (21/09) — C2 (densité), C5 (porosité honnête), C6 (croisé peau ↔ cheveux).
// Même discipline qu'aux bancs D9–Vague 1 : chaque réponse a un effet vérifié
// bout-en-bout ; les valeurs inventées tombent bien ; les rémanences hors segment
// sont ignorées.
import { buildHairAdvisoryCtx, buildHairAdvisoryRoutine, buildHairAdvisorySummary } from '../src/lib/knowledge/hairAdvisory.ts';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult.ts';

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
const bouclee = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'bouclee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'definition', curlyDry: 'diffuse_chaud', curlyHold: 'gel', ...extra,
} as any);
const ondee = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'ondulee', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '2x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'definition', ...extra,
} as any);
const locks = (extra: Record<string, unknown> = {}) => buildHairAdvisoryCtx({
  texture: 'crepue', style: 'locks', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
  length: 'moyenne', experience: 'habituee', priority: 'hydratation', locStage: 'mature', locCare: 'palm', locDry: 'seche', ...extra,
} as any);

/* ------------------------------------------------------------------ */
/* C2 — la densité (la variable manquante)                             */
/* ------------------------------------------------------------------ */
{
  // 1. Sections adaptées à la densité (démêlage).
  const dense = crepue({ density: 'dense', pattern: '4c' });
  ok('C2_1_dense_sections_6_8', /6 à 8 sections/.test(txt(all(dense))));

  const clairsemee = crepue({ density: 'clairsemee', pattern: '4c' });
  ok('C2_2_clairsemee_sections_2_4', /2 à 4 sections/.test(txt(all(clairsemee))));

  // 2. Les pièges de combinaison — les deux cas où la largeur SEULE trompe.
  const fineDense = crepue({ density: 'dense', strandWidth: 'fine' });
  ok('C2_3_fine_dense_pas_de_beurre_qui_couche', /cheveu fin, nombreux[\s\S]*?beurre.*?couche/.test(txt(all(fineDense))));
  const epaisseClair = crepue({ density: 'clairsemee', strandWidth: 'epaisse' });
  ok('C2_4_epaisse_clairsemee_pas_de_volume_en_flacon', /épais.*?peu nombreux[\s\S]*?ne créera pas de densit/.test(txt(all(epaisseClair))));

  // 3. Densité seule (sans largeur connue) — dosage différent.
  const denseSeul = crepue({ density: 'dense' });
  ok('C2_5_dense_dose_par_section', /noisette par section/.test(txt(all(denseSeul))));
  const clairSeul = crepue({ density: 'clairsemee' });
  ok('C2_6_clair_rien_en_racine', /dose légère.*?longueurs.*?rien en racine/.test(txt(all(clairSeul)))
    || /rien en racine/.test(txt(all(clairSeul))));

  // 4. Temps de séchage — seulement si la branche séchage existe (bouclés au naturel).
  const boucleeDense = bouclee({ density: 'dense' });
  ok('C2_7_dense_sechage_long', /deux fois plus de temps de s[ée]chage/.test(txt(all(boucleeDense)))
    || /comptez .* temps de s[ée]chage/.test(txt(all(boucleeDense))));
  const boucleeClair = bouclee({ density: 'clairsemee' });
  ok('C2_8_clair_sechage_rapide', /s[ée]chage est rapide/.test(txt(all(boucleeClair))));

  // 5. Ondulé aussi hérite du dosage densité (la question n'est pas réservée au crépu).
  const ondeeDense = ondee({ density: 'dense', wavyPattern: '2b' });
  ok('C2_9_ondee_dense_dose_par_section', /noisette par section/.test(txt(all(ondeeDense)))
    || /dense/.test(txt(all(ondeeDense))));

  // 6. Résumé — la ligne densité y paraît (tous segments, y compris locks).
  const sumDense = buildHairAdvisorySummary(dense) as string;
  ok('C2_10_dense_au_resume', /Densit[ée] forte/.test(sumDense) && /dose par section/.test(sumDense));
  const sumClair = buildHairAdvisorySummary(clairsemee) as string;
  ok('C2_11_clair_au_resume', /Densit[ée] faible/.test(sumClair) && /ne.*?remplira.*?en flacon/.test(sumClair));
  const locksDense = locks({ density: 'dense' });
  const sumLocks = buildHairAdvisorySummary(locksDense) as string;
  ok('C2_12_densite_universelle_locks', /Densit[ée] forte/.test(sumLocks));

  // 7. Inconnue / valeur inventée = AUCUN effet (pas de « 6 sections » en silence).
  const sans = crepue();
  ok('C2_13_inconnue_aucun_effet',
    !/6 à 8 sections/.test(txt(all(sans)))
    && !/2 à 4 sections/.test(txt(all(sans)))
    && !/noisette par section/.test(txt(all(sans)))
    && !/temps de s[ée]chage/.test(txt(all(sans))));
  ok('C2_14_inventee_aucun_effet', !/noisette par section/.test(txt(all(crepue({ density: 'hyperdense' })))));

  // 8. Confiance §2c : la densité compte dans le profil déclaré.
  const model = (answers: Record<string, unknown>, isSkin = false) => buildDiagnosticResultModel({ answers, result: null, products: [], isSkin });
  const baseComplet = { texture: 'crepue', style: 'naturel', porosity: 'moyenne', scalp: 'normal', frequency: '1x_semaine',
    length: 'moyenne', experience: 'habituee', priority: 'hydratation', budget: '40_70', focus: '',
    washTime: 'moyen', water: 'douce', humidity: 'ne_bouge_pas', strandWidth: 'moyenne' };
  const avec = model({ ...baseComplet, density: 'dense' });
  const sans2 = model({ ...baseComplet });
  ok('C2_15_profil_avec_densite_complet', avec.confidence.level === 'haute' && /complet/.test(avec.confidence.label));
  // Une densité manquante dégrade légèrement la confiance (champ OPTIONAL)
  // — elle n'est pas critique, mais elle apparaît dans le profil et les manques.
  ok('C2_16_densite_figure_dans_le_profil', avec.profileFields.some((f: any) => f.key === 'density' && f.known));
  ok('C2_17_densite_manquante_dans_les_manques', sans2.profileFields.some((f: any) => f.key === 'density' && !f.known));
}

// ---------------------------------------------------------------------------
// C5 / C6 — RÉSERVÉS (la Vague 2 ne porte que C2 pour ce commit ; les tests
// C5 et C6 sont ajoutés par les commits suivants, dans ce même fichier).
// ---------------------------------------------------------------------------

if (failed > 0) { console.error(`\n${failed} FAIL(S)`); process.exit(1); }
console.log('\nBanc vague 2 (C2) : OK');
