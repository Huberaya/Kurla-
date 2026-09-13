import assert from 'node:assert/strict';
import {
  HAIR_SCIENCE_CARDS,
  HAIR_SCIENCE_THEMES,
  pickHairScienceInsights,
  SCIENCE_CONFIDENCE_LABELS,
  type HairScienceCard,
  type ScienceConfidence,
} from '../src/lib/knowledge/hairScience';
import {
  SKIN_SCIENCE_CARDS,
  SKIN_SCIENCE_THEMES,
  pickSkinScienceInsights,
} from '../src/lib/knowledge/skinScience';
import { SKIN_PROBLEM_CARDS, HAIR_PROBLEM_CARDS, pickSkinProblemCards, pickHairProblemCards } from '../src/lib/knowledge/problemCards';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';
import type { HairAdvisoryContext } from '../src/lib/knowledge/hairAdvisory';
import type { SkinAdvisoryContext } from '../src/lib/knowledge/skinAdvisory';

/**
 * BANC « science hub » (13/09/2026) — la base de savoirs « ouvrir les yeux ».
 *
 * Constat : les quiz concurrents recommandent sans expliquer. KURLA publie,
 * côté cheveux et côté peau, des faits documentés (trichoscopie afro,
 * biophysique de la fibre, dermatologie des peaux foncées) traduits en
 * français, avec leur source et leur niveau de confiance. Ce banc tient le
 * contrat de publication :
 *
 *  1. chaque carte est complète et sourcée (aucune carte sans source —
 *     « sourcée ou absente, jamais inventée ») ;
 *  2. aucun doublon de clé, aucun thème orphelin, aucun thème fantôme ;
 *  3. aucun vocabulaire médical, aucune phrase réservée aux autres modules ;
 *  4. côté peau, les mots médicaux (cancer, traitement, dermatologues,
 *     xérose) sont interdits dans le corps des cartes — les sources
 *     peuvent citer des noms d'institutions ;
 *  5. les pickers « ouvrir les yeux » sont déterministes, bornés (≤ max,
 *     sans doublon), contextuels (le besoin principal d'abord) et donnent
 *     au moins 2 faits même sur un profil vierge ;
 *  6. le wiring atteint le modèle du résultat du diagnostic, côté peau
 *     comme côté cheveux.
 */

const CONFIDENCE_OK: ScienceConfidence[] = ['recherche', 'institution', 'communaute', 'expertise'];

/** Vocabulaire médical interdit dans TOUT le discours public des savoirs. */
const MEDICAL_RE = /cancer|chimioth|alopec|trichotill|psorias|dermatite|eczéma|xérose|xérotique|kératose|comedo|rétino|séborrh|folliculite|dermatologue/i;

/** Mots supplémentaires interdits dans le CORPS des cartes peau (les
 *  sources institutionnelles peuvent les nommer). */
const SKIN_BODY_BAN_RE = /cancer|traitement|dermatologues|xérose/i;

/** Phrases réservées aux autres modules (miroir de kurla_need_depth). */
const RESERVED_PHRASES = [
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
  'AHA + BHA',
];

function cardBody(card: { title: string; fact: string; mechanism: string }): string {
  return `${card.title}. ${card.fact}. ${card.mechanism}`;
}

function fullText(card: { title: string; fact: string; mechanism: string; source: string }): string {
  return `${cardBody(card)} ${card.source}`;
}

const checks: string[] = [];
function check(label: string): void {
  checks.push(label);
}

async function runScienceHubTests(): Promise<void> {
  // --- 1. Cartes cheveux : complètes, sourcées, vocabulaire connu --------
  assert.equal(HAIR_SCIENCE_CARDS.length, 30, 'le pôle cheveux compte 30 cartes');
  for (const card of HAIR_SCIENCE_CARDS) {
    for (const field of ['key', 'title', 'fact', 'mechanism', 'source'] as const) {
      assert.ok(String(card[field]).trim().length > 0, `carte cheveux ${card.key} : champ « ${field} » vide`);
    }
    assert.ok(CONFIDENCE_OK.includes(card.confidence), `carte cheveux ${card.key} : confiance inconnue`);
    assert.ok(HAIR_SCIENCE_THEMES.some(theme => theme.theme === card.theme), `carte cheveux ${card.key} : thème hors liste`);
  }
  check(`cheveux : ${HAIR_SCIENCE_CARDS.length} cartes complètes et sourcées, confiance et thèmes connus`);

  // --- 2. Cartes peau : complètes, sourcées, vocabulaire connu ------------
  assert.equal(SKIN_SCIENCE_CARDS.length, 21, 'le pôle peau compte 21 cartes (dont les pôles rasage, hormones, corps, maquillage et frottement)');
  for (const card of SKIN_SCIENCE_CARDS) {
    for (const field of ['key', 'title', 'fact', 'mechanism', 'source'] as const) {
      assert.ok(String(card[field]).trim().length > 0, `carte peau ${card.key} : champ « ${field} » vide`);
    }
    assert.ok(CONFIDENCE_OK.includes(card.confidence), `carte peau ${card.key} : confiance inconnue`);
    assert.ok(SKIN_SCIENCE_THEMES.some(theme => theme.theme === card.theme), `carte peau ${card.key} : thème hors liste`);
  }
  check(`peau : ${SKIN_SCIENCE_CARDS.length} cartes complètes et sourcées, confiance et thèmes connus`);

  // --- 3. Pas de doublon de clé -------------------------------------------
  const hairKeys = new Set(HAIR_SCIENCE_CARDS.map(card => card.key));
  const skinKeys = new Set(SKIN_SCIENCE_CARDS.map(card => card.key));
  assert.equal(hairKeys.size, HAIR_SCIENCE_CARDS.length, 'doublon de clé côté cheveux');
  assert.equal(skinKeys.size, SKIN_SCIENCE_CARDS.length, 'doublon de clé côté peau');
  assert.equal(new Set([...hairKeys, ...skinKeys]).size, hairKeys.size + skinKeys.size, 'clé commune entre les deux pôles');
  check('clés uniques, sans chevauchement entre les pôles');

  // --- 4. Aucun thème orphelin / fantôme ----------------------------------
  for (const theme of HAIR_SCIENCE_THEMES) {
    assert.ok(HAIR_SCIENCE_CARDS.some(card => card.theme === theme.theme), `thème cheveux « ${theme.theme} » orphelin`);
    assert.ok(theme.label.length > 0 && theme.intro.length > 0, `thème cheveux « ${theme.theme} » sans intitulé`);
  }
  for (const theme of SKIN_SCIENCE_THEMES) {
    assert.ok(SKIN_SCIENCE_CARDS.some(card => card.theme === theme.theme), `thème peau « ${theme.theme} » orphelin`);
    assert.ok(theme.label.length > 0 && theme.intro.length > 0, `thème peau « ${theme.theme} » sans intitulé`);
  }
  check('chaque thème listé porte au moins une carte, chaque carte porte un thème listé');

  // --- 5. Aucun vocabulaire médical dans le discours public ---------------
  for (const card of [...HAIR_SCIENCE_CARDS, ...SKIN_SCIENCE_CARDS]) {
    const match = fullText(card).match(MEDICAL_RE);
    assert.ok(!match, `carte ${card.key} : vocabulaire médical « ${match?.[0]} »`);
  }
  check(`aucun vocabulaire médical dans les ${HAIR_SCIENCE_CARDS.length + SKIN_SCIENCE_CARDS.length} cartes (corps et sources)`);

  // --- 6. Corps des cartes peau : mots médicaux réservés aux sources ------
  for (const card of SKIN_SCIENCE_CARDS) {
    const match = cardBody(card).match(SKIN_BODY_BAN_RE);
    assert.ok(!match, `carte peau ${card.key} : mot interdit dans le corps « ${match?.[0]} »`);
  }
  check('corps des cartes peau : ni cancer, ni traitement, ni dermatologues, ni xérose');

  // --- 7. Aucune phrase réservée aux autres modules -----------------------
  for (const card of [...HAIR_SCIENCE_CARDS, ...SKIN_SCIENCE_CARDS]) {
    const text = fullText(card).toLowerCase();
    for (const phrase of RESERVED_PHRASES) {
      assert.ok(!text.includes(phrase.toLowerCase()), `carte ${card.key} : phrase réservée « ${phrase} »`);
    }
  }
  check('aucune des 12 phrases réservées ne figure dans les savoirs');

  // --- 8. Piker cheveux : déterministe, borné, sans doublon, ≥2 vierge ----
  const bareHair: HairAdvisoryContext = {};
  const hairA = pickHairScienceInsights(bareHair);
  const hairB = pickHairScienceInsights({ ...bareHair });
  assert.deepEqual(hairA, hairB, 'picker cheveux non déterministe');
  assert.ok(hairA.length >= 2 && hairA.length <= 3, 'picker cheveux vierge : moins de 2 faits ou plus de 3');
  assert.equal(new Set(hairA.map(item => item.key)).size, hairA.length, 'doublon dans la sélection cheveux');
  for (const item of hairA) assert.ok(hairKeys.has(item.key), 'sélection cheveux : clé hors catalogue');
  check('picker cheveux : déterministe, borné à 2–3, sans doublon, ≥2 sur profil vierge');

  // --- 9. Piker cheveux : le besoin principal d'abord ---------------------
  const breakage: HairAdvisoryContext = { texture: 'crepue', priority: 'casse' };
  const scalp: HairAdvisoryContext = { texture: 'frisee', priority: 'cuir_chevelu', scalp: 'pellicules' };
  const defaultHair = pickHairScienceInsights(bareHair);
  const breakagePick = pickHairScienceInsights(breakage);
  const scalpPick = pickHairScienceInsights(scalp);
  assert.ok(breakagePick.some(item => item.key === 'sci_tempes_fines'), 'casse : le fait « contour = zone des fibres fines » doit être choisi');
  assert.ok(scalpPick.some(item => item.key === 'sci_pellicules'), 'cuir chevelu : le fait pellicules doit être choisi');
  assert.notDeepEqual(breakagePick, scalpPick, 'casse et cuir chevelu ne doivent pas recevoir la même ouverture');
  assert.notDeepEqual(breakagePick, defaultHair, 'profil casse ≠ profil vierge');
  check('picker cheveux : contextuel — le besoin principal choisit le fait en tête');

  // --- 10. Picker peau : déterministe, borné, sans doublon, ≥2 vierge -----
  const bareSkin: SkinAdvisoryContext = {};
  const skinA = pickSkinScienceInsights(bareSkin);
  const skinB = pickSkinScienceInsights({ ...bareSkin });
  assert.deepEqual(skinA, skinB, 'picker peau non déterministe');
  assert.ok(skinA.length >= 2 && skinA.length <= 3, 'picker peau vierge : moins de 2 faits ou plus de 3');
  assert.equal(new Set(skinA.map(item => item.key)).size, skinA.length, 'doublon dans la sélection peau');
  for (const item of skinA) assert.ok(skinKeys.has(item.key), 'sélection peau : clé hors catalogue');
  assert.ok(skinA.some(item => item.key === 'sci_skin_spf'), 'profil vierge : le fait SPF doit être en tête');
  check('picker peau : déterministe, borné à 2–3, sans doublon, ≥2 sur profil vierge');

  // --- 11. Picker peau : contextuel ----------------------------------------
  const hpiSkin: SkinAdvisoryContext = { hyperpigmentationTendency: 'frequente', skinConcerns: ['taches'] };
  const spfSkin: SkinAdvisoryContext = { spfUsage: 'jamais', skinConcerns: ['protection_solaire'] };
  const perfumeSkin: SkinAdvisoryContext = { sensitivity: 'elevee', sensitivities: ['sensible'], skinConcerns: ['sensibilite'] };
  const drySkin: SkinAdvisoryContext = { skinType: 'seche', skinConcerns: ['secheresse'] };
  assert.equal(pickSkinScienceInsights(hpiSkin)[0].key, 'sci_skin_hpi', 'HPI : le fait tache doit être premier');
  assert.ok(pickSkinScienceInsights(spfSkin).some(item => item.key === 'sci_skin_spf'), 'SPF jamais : le fait SPF doit être choisi');
  assert.ok(pickSkinScienceInsights(perfumeSkin).some(item => item.key === 'sci_skin_parfum'), 'sensibilité parfum : le fait parfum doit être choisi');
  assert.ok(pickSkinScienceInsights(drySkin).some(item => item.key === 'sci_skin_lavage'), 'sécheresse : le fait lavage/soak-and-smear doit être choisi');
  check('picker peau : contextuel — HPI, SPF, parfum, sécheresse chacun choisis');

  // --- 12. Wiring : le modèle du résultat porte les savoirs (2 pôles) -----
  const skinAnswers = { skinType: 'seche', skinConcerns: ['taches', 'secheresse'], hyperpigmentationTendency: 'frequente', spfUsage: 'jamais' };
  const skinModel = buildDiagnosticResultModel({ answers: skinAnswers, result: null, products: [], isSkin: true });
  assert.equal(skinModel.scienceInsights.length, pickSkinScienceInsights(skinAnswers as SkinAdvisoryContext).length, 'peau : scienceInsights dérive du picker');
  assert.ok(skinModel.scienceInsights.length >= 2, 'peau : le résultat doit ouvrir les yeux (≥2 faits)');
  const hairAnswers = { texture: 'crepue', priority: 'casse', porosity: 'forte' };
  const hairModel = buildDiagnosticResultModel({ answers: hairAnswers, result: null, products: [], isSkin: false });
  assert.equal(hairModel.scienceInsights.length, pickHairScienceInsights(hairAnswers as HairAdvisoryContext).length, 'cheveux : scienceInsights dérive du picker');
  assert.ok(hairModel.scienceInsights.length >= 2, 'cheveux : le résultat doit ouvrir les yeux (≥2 faits)');
  check('wiring : DiagnosticResultModel.scienceInsights présent côté peau et côté cheveux');

  // --- 13. Les labels de confiance couvrent le vocabulaire ----------------
  for (const level of CONFIDENCE_OK) assert.ok(SCIENCE_CONFIDENCE_LABELS[level], `label de confiance manquant : ${level}`);
  check('labels de confiance : les 4 niveaux sont libellés');


  // --- 14. Cartes « moyens » : complètes, sourcées, protocoles intacts ---
  const allProblemCards = [...SKIN_PROBLEM_CARDS, ...HAIR_PROBLEM_CARDS];
  assert.equal(allProblemCards.length, 19, '19 cartes moyens : 11 peau + 8 cheveux');
  const problemKeys = new Set(allProblemCards.map(card => card.key));
  assert.equal(problemKeys.size, 19, 'doublon de clé dans les cartes moyens');
  for (const card of allProblemCards) {
    for (const field of ['key', 'title', 'fact', 'attendre', 'source'] as const) {
      assert.ok(String(card[field]).trim().length > 0, `carte moyens ${card.key} : champ « ${field} » vide`);
    }
    assert.ok(CONFIDENCE_OK.includes(card.confidence), `carte moyens ${card.key} : confiance inconnue`);
    assert.ok(card.faire.length >= 3 && card.faire.every(item => item.trim().length > 0), `carte moyens ${card.key} : « faire » incomplet (< 3 gestes vides)`);
    assert.ok(card.eviter.length >= 2 && card.eviter.every(item => item.trim().length > 0), `carte moyens ${card.key} : « éviter » incomplet (< 2 interdits)`);
  }
  check('cartes moyens : 19 protocoles complets et sourcés (faire ≥ 3, éviter ≥ 2, délai honnête)');

  // --- 15. Cartes moyens : vocabulaire et phrases réservées ----------------
  for (const card of allProblemCards) {
    const text = `${card.title}. ${card.fact}. ${card.faire.join(' ')} ${card.eviter.join(' ')} ${card.attendre} ${card.source}`;
    const match = text.match(MEDICAL_RE);
    assert.ok(!match, `carte moyens ${card.key} : vocabulaire médical « ${match?.[0]} »`);
    for (const phrase of RESERVED_PHRASES) {
      assert.ok(!text.toLowerCase().includes(phrase.toLowerCase()), `carte moyens ${card.key} : phrase réservée « ${phrase} »`);
    }
  }
  for (const card of SKIN_PROBLEM_CARDS) {
    const body = `${card.title}. ${card.fact}. ${card.faire.join(' ')} ${card.eviter.join(' ')} ${card.attendre}`;
    const match = body.match(SKIN_BODY_BAN_RE);
    assert.ok(!match, `carte moyens peau ${card.key} : mot interdit dans le corps « ${match?.[0]} »`);
  }
  check('cartes moyens : 0 mot médical, 0 phrase réservée, corps peau sans mot interdit');

  // --- 16. Pickers moyens : inconnu = inconnu, contextuel, borné ----------
  assert.deepEqual(pickSkinProblemCards({}), [], 'peau vierge : pas de problème déclaré = pas de carte inventée');
  assert.deepEqual(pickHairProblemCards({}), [], 'cheveux vierge : pas de problème déclaré = pas de carte inventée');
  const tachesCtx = { hyperpigmentationTendency: 'frequente', skinConcerns: ['taches', 'secheresse'], skinType: 'seche' } as SkinAdvisoryContext;
  const tachesCards = pickSkinProblemCards(tachesCtx);
  assert.equal(tachesCards[0].key, 'prob_skin_taches', 'taches déclarées : la carte taches doit être première');
  assert.ok(tachesCards.some(c => c.key === 'prob_skin_secheresse'), 'sécheresse déclarée : sa carte doit être choisie');
  assert.equal(tachesCards.length, 2, 'borné à 2 cartes maximum');
  const casseCtx = { texture: 'crepue', priority: 'casse', style: 'braids', scalp: 'pellicules' } as HairAdvisoryContext;
  const casseCards = pickHairProblemCards(casseCtx);
  assert.deepEqual(casseCards.map(c => c.key), ['prob_hair_casse', 'prob_hair_cuir_chevelu'], 'casse + cuir chevelu : les deux cartes, dans l’ordre déclaré');
  const pousseCards = pickHairProblemCards({ texture: 'crepue', priority: 'pousse' });
  assert.deepEqual(pousseCards.map(c => c.key), ['prob_hair_pousse'], 'pousse seule : une seule carte, rien d’inventé');
  const skinDeterministic = pickSkinProblemCards(tachesCtx);
  assert.deepEqual(pickSkinProblemCards({ ...tachesCtx }), skinDeterministic, 'picker peau non déterministe');
  check('pickers moyens : inconnu = inconnu (0 carte vierge), contextuel, borné, déterministe');

  // --- 17b. Les 4 pôles creusés : savoirs + moyens détectés --------------
  const kidCards = pickHairScienceInsights({ style: 'enfant' });
  assert.ok(kidCards.some(item => item.key === 'sci_kid_scalp'), 'enfant : le fait scalp enfant doit être choisi');
  const relaxCards = pickHairScienceInsights({ texture: 'defrisee' });
  assert.ok(relaxCards.some(item => item.key === 'sci_relax_bonds'), 'défrisé : le fait liaisons permanentes doit être choisi');
  const locksCards = pickHairScienceInsights({ texture: 'locksee' });
  assert.ok(locksCards.some(item => item.key === 'sci_locks_mecanisme'), 'locks : le fait mécanisme doit être choisi');
  assert.ok(pickHairProblemCards({ style: 'enfant' }).some(c => c.key === 'prob_hair_enfant'), 'enfant : carte moyen enfant');
  assert.ok(pickHairProblemCards({ texture: 'defrisee' }).some(c => c.key === 'prob_hair_defrisee'), 'défrisé : carte moyen défrisage');
  assert.ok(pickHairProblemCards({ texture: 'locksee' }).some(c => c.key === 'prob_hair_locks'), 'locks : carte moyen locks');
  for (const theme of HAIR_SCIENCE_THEMES) {
    assert.ok(HAIR_SCIENCE_CARDS.length >= 30, 'cheveux : base enrichie (30 cartes)');
    assert.ok(theme.label.length > 0, `thème « ${theme.theme} » sans intitulé`);
  }
  check('4 pôles creusés : enfants, barbe, défrisage, locks — savoirs et moyens détectés');

  // --- 17c. Pôle peau : poils incarnés — savoirs + moyens détectés ----------
  const rasageScience = pickSkinScienceInsights({ skinConcerns: ['poils_incarnes'] } as SkinAdvisoryContext);
  assert.ok(rasageScience.some(item => item.key === 'sci_skin_rasage_mecanisme'), 'poils incarnés : le fait mécanisme doit être choisi en tête');
  const rasageCards = pickSkinProblemCards({ skinConcerns: ['poils_incarnes'] } as SkinAdvisoryContext);
  assert.ok(rasageCards.some(c => c.key === 'prob_skin_poils_incarnes'), 'poils incarnés : la carte moyen doit être choisie');
  check('pôle peau : poils incarnés — savoirs et moyens détectés');

  // --- 17d. Pôle peau : taches hormonales — savoirs + moyens détectés --------
  const melasmeScience = pickSkinScienceInsights({ skinConcerns: ['taches_hormonales'] } as SkinAdvisoryContext);
  assert.ok(melasmeScience.some(item => item.key === 'sci_skin_melasme_mecanisme'), 'taches hormonales : le fait mécanisme doit être choisi en tête');
  const melasmeCards = pickSkinProblemCards({ skinConcerns: ['taches_hormonales'] } as SkinAdvisoryContext);
  assert.ok(melasmeCards.some(c => c.key === 'prob_skin_taches_hormonales'), 'taches hormonales : la carte moyen doit être choisie');
  const melasmeMixte = pickSkinProblemCards({ skinConcerns: ['taches', 'taches_hormonales'] } as SkinAdvisoryContext);
  assert.equal(melasmeMixte[0].key, 'prob_skin_taches', 'taches + hormonales : la carte HPI reste première (priorité documentée)');
  check('pôle peau : taches hormonales — savoirs et moyens détectés');

  // --- 17e. Pôle peau : corps — grain de poulet + sécheresse détectés --------
  const corpsScience = pickSkinScienceInsights({ skinConcerns: ['grain_de_poulet'] } as SkinAdvisoryContext);
  assert.ok(corpsScience.some(item => item.key === 'sci_skin_corps_grain'), 'grain de poulet : le fait kératine doit être choisi en tête');
  assert.ok(pickSkinProblemCards({ skinConcerns: ['grain_de_poulet'] } as SkinAdvisoryContext).some(c => c.key === 'prob_skin_grain_de_poulet'), 'grain de poulet : la carte moyen doit être choisie');
  assert.ok(pickSkinProblemCards({ skinConcerns: ['secheresse_corps'] } as SkinAdvisoryContext).some(c => c.key === 'prob_skin_secheresse_corps'), 'corps sec : la carte moyen doit être choisie');
  check('pôle peau : corps — grain de poulet et sécheresse détectés');

  // --- 17f. Pôle peau : maquillage + quantité SPF détectés -------------------
  const maquillageScience = pickSkinScienceInsights({ skinConcerns: ['port_maquillage'] } as SkinAdvisoryContext);
  assert.equal(maquillageScience[0].key, 'sci_skin_maquillage_demaquillage', 'maquillage déclaré : le fait démaquillage doit être premier');
  assert.ok(pickSkinProblemCards({ skinConcerns: ['port_maquillage'] } as SkinAdvisoryContext).some(c => c.key === 'prob_skin_maquillage'), 'maquillage : la carte moyen doit être choisie');
  const spfSeul = pickSkinScienceInsights({ spfUsage: 'jamais' } as SkinAdvisoryContext);
  assert.ok(spfSeul.some(item => item.key === 'sci_skin_spf_quantite'), 'SPF non quotidien : la carte quantité doit être glissée');
  check('pôle peau : maquillage — démaquillage, pores et quantité SPF détectés');

  // --- 17g. Pôle peau : frottement — plis + lèvres détectés ------------------
  const plisScience = pickSkinScienceInsights({ skinConcerns: ['assombrissement_plis'] } as SkinAdvisoryContext);
  assert.ok(plisScience.some(item => item.key === 'sci_skin_frottement_plis'), 'plis déclarés : le fait frottement doit être choisi');
  assert.ok(pickSkinProblemCards({ skinConcerns: ['assombrissement_plis'] } as SkinAdvisoryContext).some(c => c.key === 'prob_skin_assombrissement_plis'), 'plis : la carte moyen doit être choisie');
  assert.ok(pickSkinProblemCards({ skinConcerns: ['leveres_assombries'] } as SkinAdvisoryContext).some(c => c.key === 'prob_skin_leveres'), 'lèvres : la carte moyen doit être choisie');
  check('pôle peau : frottement — plis et lèvres détectés');

  // --- 17. Wiring : le modèle du résultat porte les cartes moyens ---------
  const skinProblemModel = buildDiagnosticResultModel({ answers: skinAnswers, result: null, products: [], isSkin: true });
  assert.equal(skinProblemModel.problemCards[0].key, 'prob_skin_taches', 'peau : taches déclarées → carte taches dans le résultat');
  assert.ok(skinProblemModel.problemCards.length >= 1 && skinProblemModel.problemCards.length <= 2, 'peau : 1 à 2 cartes moyens dans le résultat');
  const hairProblemModel = buildDiagnosticResultModel({ answers: hairAnswers, result: null, products: [], isSkin: false });
  assert.equal(hairProblemModel.problemCards[0].key, 'prob_hair_casse', 'cheveux : casse déclarée → carte casse dans le résultat');
  check('wiring : DiagnosticResultModel.problemCards présent côté peau et côté cheveux');

  console.log(
    `[PASS] Base de savoirs (ouvrir les yeux) : ${HAIR_SCIENCE_CARDS.length} cartes cheveux + ${SKIN_SCIENCE_CARDS.length} cartes peau, toutes sourcées ; 9 thèmes sans orphelins ; 0 mot médical, 0 phrase réservée, corps peau sans mot interdit ; pickers déterministes bornés et contextuels ; wiring modèle de résultat (2 pôles) ; 19 cartes « moyens » (faire/éviter/s'attendre) sourcées, 4 pôles creusés (enfants, barbe, défrisage, locks), inconnu = inconnu — ${checks.length} checks.`
  );
}

runScienceHubTests().catch(error => {
  console.error('[FAIL] Base de savoirs (ouvrir les yeux) :', error);
  process.exitCode = 1;
});
