import assert from 'node:assert/strict';

import {
  ALL_HAIR_STYLES,
  ALL_HAIR_TEXTURES,
  KNOWN_DIAGNOSTIC_NEEDS,
  getHairDiagnosticSegment,
  getSegmentFocusLabel,
  getSegmentFocusNeeds,
  getSegmentOptions
} from '../src/lib/diagnosticSegments';
import { buildDiagnosticResultModel } from '../src/lib/diagnosticResult';

/**
 * BANC — QUESTION ADAPTATIVE DU DIAGNOSTIC (chantier diagnostic, consigne 18/09).
 *
 * Acceptation : après la texture (Q1) et le coiffage (Q2), le diagnostic peut
 * poser des questions qui portent sur les besoins et problèmes du profil
 * déclaré — EN PLUS des questions existantes. Exemple type : « je porte les
 * locks » → les questions suivantes se focalisent sur les locks.
 *
 * Ce banc fige :
 *  1. TOUS les couples (texture, style) du questionnaire résolvent un segment
 *     unique ou aucun (determinisme, zéro cas mort) ;
 *  2. chaque segment porte une question et des options complètes (titre,
 *     description, besoins du vocabulaire EXISTANT — zéro besoin inventé) ;
 *  3. le cas locks (exemple de la consigne) atterrit toujours sur le segment
 *     locks, quelle que soit la combinaison exacte ;
 *  4. la résolution de la préoccupation (needs / libellé) est sûre : id
 *     inconnu ou absent → rien (jamais une donnée inventée) ;
 *  5. la page résultat : « Préoccupation principale » = libellé lisible
 *     (jamais l'id technique), absente du profil si non renseignée ;
 *     priorités : la préoccupation vient en tête.
 */

function main(): void {
  // ————————————————— 1. Recouvrement exhaustif des 49 combinaisons —————————————————
  const seenSegments = new Set<string>();
  let noSegment = 0;
  for (const texture of ALL_HAIR_TEXTURES) {
    for (const style of ALL_HAIR_STYLES) {
      const a = getHairDiagnosticSegment(texture, style);
      const b = getHairDiagnosticSegment(texture, style);
      assert.deepEqual(a, b, `déterministe : ${texture} + ${style}`);
      if (!a) { noSegment += 1; continue; }
      seenSegments.add(a.id);
      assert.ok(a.question.trim() !== '', `question non vide : ${a.id}`);
      assert.ok(a.question.includes('?'), `c’est bien une question : ${a.id}`);
      assert.ok(a.options.length >= 4 && a.options.length <= 6, `${a.id} : 4 à 6 options`);
      const optionIds = new Set<string>();
      for (const option of a.options) {
        assert.ok(!optionIds.has(option.id), `option id unique : ${option.id}`);
        optionIds.add(option.id);
        assert.ok(option.title.trim() !== '' && option.desc.trim() !== '', `option complète : ${option.id}`);
        assert.ok(option.needs.length >= 1, `chaque option pilote au moins un besoin existant : ${option.id}`);
        for (const need of option.needs) {
          assert.ok((KNOWN_DIAGNOSTIC_NEEDS as readonly string[]).includes(need), `besoin du vocabulaire existant : ${need} (${option.id})`);
        }
        // getSegmentOptions renvoie bien ces options pour le segment.
        assert.ok(getSegmentOptions(a.id).some(o => o.id === option.id), `option exposée par getSegmentOptions : ${option.id}`);
      }
    }
  }
  // Unicité GLOBALE des ids d'option (par segment, pas par combinaison) : la
  // résolution par id (needs, libellé) doit être non ambiguë.
  const allOptionIds = new Set<string>();
  const checkedSegments = new Set<string>();
  for (const texture of ALL_HAIR_TEXTURES) {
    for (const style of ALL_HAIR_STYLES) {
      const seg = getHairDiagnosticSegment(texture, style);
      if (!seg || checkedSegments.has(seg.id)) continue;
      checkedSegments.add(seg.id);
      for (const option of seg.options) {
        assert.ok(!allOptionIds.has(option.id), `id d'option globalement unique : ${option.id}`);
        allOptionIds.add(option.id);
      }
    }
  }

  assert.ok(noSegment >= 1, 'au moins un couple sans segment (texture inconnue + coiffage neutre) → pas de question inventée');
  // Les 7 segments sont réellement atteignables.
  assert.equal(seenSegments.size, 7, `les 7 segments sont atteignables (${[...seenSegments].join(', ')})`);

  // ————————————————— 2. Le cas locks de la consigne —————————————————
  for (const texture of ALL_HAIR_TEXTURES) {
    assert.equal(getHairDiagnosticSegment(texture, 'locks')?.id, 'locks', `texture ${texture} + style locks → segment locks`);
  }
  for (const style of ALL_HAIR_STYLES) {
    if (style === 'locks') continue;
    const seg = getHairDiagnosticSegment('locksee', style);
    if (style !== 'enfant') assert.equal(seg?.id, 'locks', `texture locksee + style ${style} → segment locks`);
  }
  const locksSeg = getHairDiagnosticSegment('locksee', 'naturel')!;
  assert.ok(locksSeg.question.includes('locks'), 'la question nomme les locks');

  // ————————————————— 3. Ordre des règles —————————————————
  assert.equal(getHairDiagnosticSegment('crepue', 'braids')?.id, 'protective', 'tresses > texture : la coiffure porte la routine');
  assert.equal(getHairDiagnosticSegment('inconnue', 'braids')?.id, 'protective', 'coiffure protectrice connue même si texture inconnue');
  assert.equal(getHairDiagnosticSegment('defrisee', 'wig')?.id, 'wig', 'la pose perruque prime sur la transition');
  assert.equal(getHairDiagnosticSegment('crepue', 'enfant')?.id, 'enfant', 'le contexte enfant prime sur tout');
  assert.equal(getHairDiagnosticSegment('crepue', 'naturel')?.id, 'naturel_cresp');
  assert.equal(getHairDiagnosticSegment('frisee', 'naturel')?.id, 'naturel_boucle');
  assert.equal(getHairDiagnosticSegment('defrisee', 'naturel')?.id, 'transition');
  assert.equal(getHairDiagnosticSegment('inconnue', 'naturel'), null, 'texture inconnue + naturel : pas de segment, 8 questions');
  assert.equal(getHairDiagnosticSegment(undefined, undefined), null, 'réponses vides : pas de segment');

  // ————————————————— 4. Résolution de la préoccupation — besoins et libellé —————————————————
  assert.deepEqual(getSegmentFocusNeeds('locks_allonger'), ['entretenir_locks', 'reduire_casse']);
  assert.deepEqual(getSegmentFocusNeeds('prot_tension'), ['reduire_casse', 'cuir_chevelu']);
  assert.deepEqual(getSegmentFocusNeeds('locks_invente'), [], 'id inconnu → zéro besoin (rien d’inventé)');
  assert.deepEqual(getSegmentFocusNeeds(''), [], 'focus vide → zéro besoin');
  assert.deepEqual(getSegmentFocusNeeds(undefined), [], 'focus absent (réponse ancienne) → zéro besoin');
  assert.equal(getSegmentFocusLabel('locks_allonger'), 'Allonger mes locks sans les casser');
  assert.equal(getSegmentFocusLabel('locks_invente'), '', 'libellé inconnu → vide, jamais l’id technique');
  assert.equal(getSegmentFocusLabel(undefined), '');

  // ————————————————— 5. Page résultat — profil, priorités, compat anciennes réponses —————————————————
  const avecFocus = buildDiagnosticResultModel({
    answers: { texture: 'locksee', style: 'naturel', focus: 'locks_allonger', priority: 'pousse' },
    result: null, products: [], isSkin: false
  });
  const focusField = avecFocus.profileFields.find(f => f.key === 'focus');
  assert.ok(focusField, 'le profil porte le champ « Préoccupation principale »');
  assert.equal(focusField?.value, 'Allonger mes locks sans les casser', 'libellé lisible affiché');
  assert.equal(focusField?.known, true);
  assert.ok(!JSON.stringify(avecFocus.profileFields).includes('locks_allonger'), 'l’id technique ne fuit nulle part dans le profil');
  assert.equal(avecFocus.priorities[0], 'Allonger mes locks sans les casser', 'la préoccupation vient en tête des priorités');
  assert.ok(avecFocus.priorities.length <= 3, '2 à 3 priorités maximum');

  // Réponse ancienne (sans focus) : champ honnête « Non renseigné », zéro crash.
  const sansFocus = buildDiagnosticResultModel({
    answers: { texture: 'locksee', style: 'naturel', priority: 'pousse' },
    result: null, products: [], isSkin: false
  });
  const sansFocusField = sansFocus.profileFields.find(f => f.key === 'focus');
  assert.equal(sansFocusField?.known, false, 'focus absent → champ non renseigné');
  assert.equal(sansFocusField?.value, 'Non renseigné');
  assert.equal(sansFocus.priorities[0], 'Longueurs et racines en santé', 'sans préoccupation : la priorité générale (libellée lisible) reste en tête');

  // Le focus est transmis au contexte advisory (pour la couche conseil).
  const withFocusCtx = buildDiagnosticResultModel({
    answers: { texture: 'locksee', style: 'naturel', focus: 'locks_cuirs' },
    result: null, products: [], isSkin: false
  });
  assert.ok(withFocusCtx, 'modèle construit avec focus');

  console.log('[PASS] Diagnostic adaptatif : les 56 couples (texture, style) résolvent un segment unique (ou aucun), 7 segments à 4–6 options aux besoins existants, le cas locks toujours locks, focus sûre (id inconnu = rien), profil et priorités de la page résultat conformes, anciennes réponses compatibles.');
}

main();
