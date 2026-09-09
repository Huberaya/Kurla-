/**
 * CHANTIER C-03 — banc du phototype.
 *
 * Ce que ce banc verrouille, au-delà des fonctions :
 *
 *  1. **Le seuil mélanine.** Phototypes IV à VI. C'est la définition
 *     technique du positionnement de KURLA. Si ce seuil bouge, toute la
 *     personnalisation change de population — le test doit donc le dire.
 *
 *  2. **La normalisation.** Le phototype arrive d'une interface, d'une base ou
 *     d'une ancienne session. Une saisie invalide doit produire `null`, jamais
 *     une valeur par défaut silencieuse qui classerait quelqu'un à tort.
 *
 *  3. **Le refus de la déduction par la couleur.** Le module demande le
 *     comportement au soleil, pas la teinte. Une même carnation peut
 *     correspondre à deux phototypes. C'est un choix éthique autant que
 *     clinique, et il est testé.
 */
import { strict as assert } from 'node:assert';
import { createEmptyBeautyProfile, mergeBeautyProfile, normalizeBeautyProfile } from '../src/lib/beautyProfile';
import {
  FITZPATRICK,
  type Fitzpatrick,
  FITZPATRICK_LEVELS,
  MELANIN_RICH_THRESHOLD,
  PHOTOTYPE_OPTIONS,
  isMelaninRich,
  normalizePhototype,
  phototypeImplications
} from '../src/lib/skinPhototype';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// ——— 1. Le seuil « peau riche en mélanine » est IV ———
{
  assert.equal(MELANIN_RICH_THRESHOLD, 4);
  assert.equal(isMelaninRich(1), false);
  assert.equal(isMelaninRich(3), false);
  assert.equal(isMelaninRich(4), true);
  assert.equal(isMelaninRich(5), true);
  assert.equal(isMelaninRich(6), true);
  ok('riches en mélanine : phototypes IV, V, VI — et seulement ceux-là');
}

// ——— 2. Absence de phototype : pas de supposition ———
{
  assert.equal(isMelaninRich(null), false);
  assert.equal(isMelaninRich(undefined), false);
  const implications = phototypeImplications(null);
  assert.equal(implications.invisibleSunscreenRequired, false);
  assert.deepEqual(implications.watchpoints, []);
  ok('sans phototype : aucune supposition, aucune recommandation mélanine');
}

// ——— 3. Normalisation : saisies valides ———
{
  assert.equal(normalizePhototype(1), 1);
  assert.equal(normalizePhototype('5'), 5);
  assert.equal(normalizePhototype(' 3 '), 3);
  assert.equal(normalizePhototype('Phototype VI'), 6);
  ok('saisies valides reconnues : nombre, chaîne, libellé');
}

// ——— 4. Normalisation : saisies invalides ———
{
  assert.equal(normalizePhototype(0), null);
  assert.equal(normalizePhototype(7), null);
  assert.equal(normalizePhototype(3.5), null);
  assert.equal(normalizePhototype(''), null);
  assert.equal(normalizePhototype('très claire'), null, 'la couleur perçue ne détermine pas le phototype');
  assert.equal(normalizePhototype(null), null);
  assert.equal(normalizePhototype(undefined), null);
  assert.equal(normalizePhototype({}), null);
  ok('saisies invalides rejetées sans valeur par défaut silencieuse');
}

// ——— 5. Implications produit sur peau riche en mélanine ———
{
  const six = phototypeImplications(6);
  assert.equal(six.invisibleSunscreenRequired, true);
  assert.equal(six.postInflammatoryRisk, 'élevé');
  assert.ok(six.cautionWithActives.length >= 3);
  assert.ok(six.watchpoints.length >= 3);
  assert.ok(
    six.watchpoints.some(point => /SPF/.test(point)),
    'le SPF invisible doit être énoncé explicitement'
  );
  ok('phototype VI : SPF invisible exigé, risque pigmentaire élevé, vigilance énoncée');
}

// ——— 6. Phototype IV : risque modéré, pas élevé ———
{
  const four = phototypeImplications(4);
  assert.equal(four.postInflammatoryRisk, 'modéré');
  const five = phototypeImplications(5);
  assert.equal(five.postInflammatoryRisk, 'élevé');
  ok('le risque est gradué : modéré en IV, élevé en V et VI');
}

// ——— 7. Phototypes clairs : pas de recommandation mélanine ———
{
  for (const level of [1, 2, 3] as Fitzpatrick[]) {
    const implications = phototypeImplications(level);
    assert.equal(implications.invisibleSunscreenRequired, false);
    assert.deepEqual(implications.cautionWithActives, []);
  }
  ok('phototypes I à III : aucune consigne mélanine imposée');
}

// ——— 8. Aucune terminologie médicale ———
{
  const interdit = ['mélanome', 'diagnostic médical', 'pathologie', 'maladie', 'tumeur', 'cancer'];
  const corpus = JSON.stringify(FITZPATRICK) + JSON.stringify(phototypeImplications(6)) + JSON.stringify(PHOTOTYPE_OPTIONS);
  const found = interdit.filter(term => corpus.toLowerCase().includes(term));
  assert.deepEqual(found, [], `vocabulaire médical interdit détecté : ${found.join(', ')}`);
  ok('vocabulaire strictement cosmétique — aucun terme médical');
}

// ——— 9. La question porte sur le comportement au soleil ———
{
  const labels = PHOTOTYPE_OPTIONS.map(option => option.label);
  assert.equal(PHOTOTYPE_OPTIONS.length, 6);
  assert.ok(
    labels.every(label => /brûle|bronze/.test(label)),
    'chaque option doit décrire une réaction au soleil, jamais une teinte'
  );
  assert.ok(
    labels.every(label => !/claire|foncée|noire|mate|blanche/.test(label)),
    'aucune option ne doit demander de se classer par couleur de peau'
  );
  ok('le phototype est demandé par comportement au soleil, pas par couleur');
}

// ——— 10. Couverture complète de l'échelle ———
{
  assert.equal(FITZPATRICK_LEVELS.length, 6);
  for (const level of FITZPATRICK_LEVELS) {
    assert.ok(FITZPATRICK[level], `phototype ${level} documenté`);
    assert.equal(FITZPATRICK[level].melaninRich, level >= 4);
    assert.ok(FITZPATRICK[level].sunReaction.length > 0);
  }
  ok('les six niveaux sont documentés et cohérents avec le seuil');
}

// ——— 11. Le diagnostic peau n'efface pas le profil cheveux ———
{
  const current = createEmptyBeautyProfile();
  current.hair.curlPattern = 'crepus';
  current.hair.porosity = 'faible';
  current.environment.climate = 'humide';

  // Ce que le diagnostic peau envoie réellement : la peau, et rien d'autre.
  const merged = mergeBeautyProfile(current, {
    skin: { sensitivity: 'elevee', phototype: 6, phototypeConsent: true }
  });

  assert.equal(merged.skin.phototype, 6, 'le phototype est bien écrit');
  assert.equal(merged.hair.curlPattern, 'crepus', 'le profil cheveux survit');
  assert.equal(merged.hair.porosity, 'faible', 'la porosité survit');
  assert.equal(merged.environment.climate, 'humide', 'l’environnement survit');
  ok('un appel partiel n’efface plus le profil cheveux ni l’environnement');
}

// ——— 12. Le consentement conditionne la conservation ———
{
  const current = createEmptyBeautyProfile();
  current.skin.phototype = 5;
  current.skin.phototypeConsent = true;

  const withdrawn = mergeBeautyProfile(current, { skin: { phototypeConsent: false } });
  assert.equal(withdrawn.skin.phototype, undefined, 'sans consentement, le phototype disparaît');
  assert.equal(withdrawn.skin.phototypeConsent, false);
  ok('retirer le consentement supprime le phototype');
}

// ——— 13. Un phototype non consenti n'est jamais enregistré ———
{
  const profile = normalizeBeautyProfile({
    skin: { phototype: 6, phototypeConsent: false }
  });
  assert.equal(profile.skin.phototype, undefined);
  ok('phototype renseigné mais non consenti : non enregistré');
}

// ——— 14. Robustesse de la fusion ———
{
  const current = createEmptyBeautyProfile();
  assert.deepEqual(mergeBeautyProfile(current, null).skin, current.skin, 'entrant nul');
  assert.deepEqual(mergeBeautyProfile(current, 'invalide').skin, current.skin, 'entrant invalide');
  const cleaned = mergeBeautyProfile(current, { skin: { phototype: 99 } });
  assert.equal(cleaned.skin.phototype, undefined, 'phototype hors échelle rejeté');
  ok('entrées invalides rejetées sans corrompre le profil');
}

console.log(`\nCHANTIER PHOTOTYPE — ${checks} contrôles passés.\n`);
