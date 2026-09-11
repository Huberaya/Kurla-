/**
 * BANC — la suite de tests doit pouvoir se terminer
 * =================================================
 *
 * Deux réglages, trouvés l'un après l'autre, empêchaient `npm test`
 * d'aboutir. Ils ne produisaient pas d'échec : ils produisaient une
 * attente sans fin, et une attente ne se lit pas comme une erreur.
 *
 * 1. `package.json` fixait `NODE_OPTIONS=--max-old-space-size=3072` —
 *    3 Go — sur une machine de 2 Go. Mesuré avant correction :
 *
 *      3 072 Mo → aucune sortie après 241 s (tué)
 *      1 400 Mo → 0 erreur en 169 s
 *      1 200 Mo → tué (SIGABRT) en 44 s
 *
 * 2. `tsconfig.json` n'excluait aucun répertoire. Avec `allowJs`, `tsc`
 *    analysait les 118 fichiers de `dist/` — son propre résultat de
 *    build, 9,2 Mo de JS groupé — en plus des 537 du projet. D'où un
 *    besoin mémoire au ras de la machine :
 *
 *      dist/ analysé → 655 fichiers, 169 s, ~1,4 Go de tas, blocage
 *      dist/ exclu   → 536 fichiers,  30 s, 1 024 Mo suffisent
 *
 * La vérification des types ferme la suite : on voyait donc « code 124 »
 * après vingt minutes en croyant la suite en échec, alors que les ~90
 * bancs passaient. On contournait à la main, chacun de son côté, et les
 * vrais échecs restaient invisibles — deux inventaires de référence
 * (routes admin, API du store) étaient faux depuis plusieurs chantiers
 * sans que personne ne le voie. Corriger la mémoire les a révélés.
 *
 * Ce banc interdit le retour des deux réglages.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  \u2713 ${label}`);
}

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const pkg = JSON.parse(lire('../package.json'));
const lanceur = lire('../scripts/tsc.mjs');
const tsconfig = JSON.parse(lire('../tsconfig.json'));

ok('aucune limite de mémoire n’est figée dans les scripts', () => {
  const chaines = [pkg.scripts?.test ?? '', pkg.scripts?.lint ?? ''];
  for (const chaine of chaines) {
    assert.ok(!/--max-old-space-size=\d+/.test(chaine),
      'une limite en dur refait dépendre la suite de la machine qui la lance');
  }
});

ok('la vérification des types passe par le lanceur adaptatif', () => {
  assert.equal(pkg.scripts?.lint, 'node scripts/tsc.mjs');
});

ok('le type checking ferme la chaîne, il ne la coupe pas en deux', () => {
  // La chaîne est un « && » : un banc qui échoue masque tout ce qui le suit.
  // Placé au milieu, un défaut de typage cachait dix-sept bancs fonctionnels.
  // En dernière position, les résultats fonctionnels restent toujours lisibles.
  const test = (pkg.scripts?.test ?? '').trim();
  assert.ok(test.endsWith('npm run lint'),
    'npm test doit se terminer par la vérification des types');
  assert.equal((test.match(/npm run lint/g) ?? []).length, 1,
    'une seule passe de typage : la répéter double la durée pour rien');
});

ok('la limite se calcule sur la mémoire disponible, pas sur la totale', () => {
  // Une machine qui annonce 2 Go peut n'avoir plus que 1,3 Go de libre
  // une fois les autres processus lancés. Prendre 75 % du total conduit
  // droit au tas saturé : le ramasse-miettes s'emballe, plus rien n'avance,
  // et aucun signal d'erreur ne sort.
  assert.ok(lanceur.includes('os.freemem'),
    'la limite doit venir de la mémoire disponible au moment du lancement');
  assert.ok(lanceur.includes('os.totalmem'), 'la taille de la machine reste un plafond');
  assert.ok(lanceur.includes('KURLA_TSC_MEMORY'), 'une surcharge doit rester possible en CI');
});

ok('un blocage sans fin est interrompu, pas subi', () => {
  // Avant : vingt-cinq minutes d'attente puis un « code 124 » anonyme.
  assert.ok(/KURLA_TSC_TIMEOUT/.test(lanceur), 'un délai doit être réglable');
  assert.ok(lanceur.includes('SIGKILL'), 'le processus bloqué doit être coupé');
});

ok('un épuisement du tas est diagnostiqué, pas tué en silence', () => {
  // Sans ce message, on ne lit qu'un « Aborted » anonyme et on cherche la
  // faute dans le code source au lieu de la chercher dans la mémoire.
  assert.ok(lanceur.includes('134'), 'le code d’abandon de V8 doit être reconnu');
  assert.ok(/Mémoire insuffisante/.test(lanceur), 'la cause doit être nommée');
});

ok('la suite construit ce qu’elle vérifie', () => {
  // Le banc de prérendu lit dist/index.html. Sans build préalable, la suite
  // s'arrêtait en ENOENT sur un dépôt frais — un échec d'environnement
  // présenté comme un échec de code. npm exécute « pretest » avant « test ».
  assert.ok(/npm run build/.test(pkg.scripts?.pretest ?? ''),
    'un pretest doit produire dist/ avant les bancs qui le lisent');
});

ok('le build ne type-check pas son propre résultat', () => {
  // Avec allowJs et sans exclude, tsc absorbait les 118 fichiers de dist/ :
  // 9,2 Mo de JS groupé qui faisaient passer la passe de 30 s à 169 s et
  // poussaient le tas au ras de la mémoire de la machine.
  const exclus: string[] = tsconfig.exclude ?? [];
  for (const repertoire of ['dist', 'build', 'node_modules']) {
    assert.ok(exclus.includes(repertoire),
      `tsconfig.json doit exclure « ${repertoire} » : sinon tsc analyse le build`);
  }
});

console.log(`\n${checks} contrôles passés — suite exécutable : la vérification des types s’adapte à la machine\n`);
