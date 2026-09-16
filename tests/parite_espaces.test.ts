/**
 * BANC — les deux espaces de travail montent les mêmes écrans
 * ===========================================================
 *
 * Demande du 16/09/2026 : « j'ai regardé le dashboard Kurla Hair et c'est la
 * même configuration que j'attends dans Kurla Skin. Je veux que les onglets et
 * les sections soient pareils. »
 *
 * Avant ce chantier, l'espace peau affichait **cinq écrans de plus** que
 * l'espace cheveux : une famille « Gouvernance Skin » entière (3 onglets) et
 * quatre panneaux glissés dans des onglets partagés, chacun protégé par un
 * `workspace === 'skin'`. Le résultat : deux applications qui portaient le même
 * nom et ne se ressemblaient pas.
 *
 * Ce qu'on garde, et qui est légitime :
 *   - un **libellé** qui dit « Skin » ou « Hair » ;
 *   - un **filtre de données** (`scope="skin"`, `prosFilter`) — peau et cheveux
 *     sont deux jeux de données, pas deux applications.
 *
 * Ce qu'on interdit, et que ce banc attrape :
 *   - un panneau monté pour un seul espace ;
 *   - une famille d'onglets ajoutée pour un seul espace ;
 *   - un onglet d'arrivée différent selon l'espace.
 *
 * Sans ce banc, la dérive est silencieuse : un `&& workspace === 'skin'` se
 * glisse en une ligne, et il faut comparer les deux écrans à la main pour le
 * voir. Ici la comparaison est faite à chaque exécution.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const FICHIER = path.join(process.cwd(), 'src', 'pages', 'AdminDashboardPage.tsx');

/** Espaces de travail dont la parité est exigée. */
const ESPACES = ['skin', 'hair'] as const;

function main(): void {
  const texte = readFileSync(FICHIER, 'utf8');
  const lignes = texte.split('\n');

  // ---------------------------------------------------------------------
  // 1. Aucun écran monté pour un seul espace.
  //
  // On cherche les lignes qui conditionnent un montage, et on retire celles
  // où la condition ne porte que sur une props (libellé, classe, filtre) —
  // celles-là ne changent ni les onglets ni les sections.
  // ---------------------------------------------------------------------
  const montagesConditionnels = lignes
    .map((ligne, index) => ({ ligne, numero: index + 1 }))
    .filter(({ ligne }) => ESPACES.some(espace => ligne.includes(`workspace === '${espace}'`)))
    // On ne retient que les conditions qui **montent** quelque chose : une
    // accolade ouvrant directement sur la condition, ou un `&& <Composant`.
    // Un libellé ou un filtre de données peut varier par espace sans rien
    // changer aux onglets ni aux sections.
    .filter(({ ligne }) => /^\s*\{\s*workspace === '/.test(ligne) || /&&\s*</.test(ligne))
    .map(({ ligne, numero }) => `src/pages/AdminDashboardPage.tsx:${numero} → ${ligne.trim()}`);

  assert.deepEqual(
    montagesConditionnels,
    [],
    'Un panneau est monté pour un seul espace de travail. Peau et cheveux doivent afficher les mêmes sections.'
  );

  // ---------------------------------------------------------------------
  // 2. Aucune famille d'onglets propre à un espace.
  // ---------------------------------------------------------------------
  const famillesPropres = lignes
    .map((ligne, index) => ({ ligne, numero: index + 1 }))
    .filter(({ ligne }) =>
      ESPACES.some(espace => new RegExp(`const \\w*[Nn]av\\w* = workspace === '${espace}'`).test(ligne)))
    .map(({ ligne, numero }) => `src/pages/AdminDashboardPage.tsx:${numero} → ${ligne.trim()}`);

  assert.deepEqual(
    famillesPropres,
    [],
    'Une famille d’onglets n’existe que pour un espace. La navigation doit être identique.'
  );

  // ---------------------------------------------------------------------
  // 3. Même onglet d'arrivée : peau et cheveux ouvrent le même écran.
  // ---------------------------------------------------------------------
  const corpsTabInitial = /const tabInitial = \(\): AdminTab => \{([\s\S]*?)\n\};/.exec(texte);
  assert.ok(corpsTabInitial, 'Fonction tabInitial introuvable : l’onglet d’arrivée n’est plus vérifiable.');
  const retours = [...corpsTabInitial![1].matchAll(/return '([a-z0-9_]+)'/g)].map(m => m[1]);
  assert.deepEqual(
    retours,
    ['copilote', 'analytics'],
    `Onglets d’arrivée inattendus : ${retours.join(', ')}. Aucun ne doit être propre à un espace.`
  );

  // ---------------------------------------------------------------------
  // 4. Les deux espaces partagent une seule et même liste d'onglets.
  // ---------------------------------------------------------------------
  const nav = /const navGroups = (.+);/.exec(texte);
  assert.ok(nav, 'Déclaration de navGroups introuvable.');
  const terme = nav![1].trim();
  const melange = /\.\.\.\w*[Nn]av\w*/.test(terme) && !/^\w+$/.test(terme.replace(/\s+/g, ''));
  assert.equal(
    melange,
    false,
    `navGroups assemble plusieurs sources (${terme}) : un espace peut donc recevoir des onglets que l’autre n’a pas.`
  );

  console.log('[PASS] Parité des espaces : aucun écran, onglet ni famille propre à peau ou à cheveux.');
}

main();
