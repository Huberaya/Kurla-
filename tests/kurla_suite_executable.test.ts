/**
 * BANC — la suite de tests doit pouvoir se terminer
 * =================================================
 *
 * `package.json` fixait `NODE_OPTIONS=--max-old-space-size=3072` pour la
 * vérification des types. Sur une machine de 2 Go, la limite dépasse la
 * mémoire physique : le processus ne rend jamais la main. Mesuré :
 *
 *   3 072 Mo → aucune sortie après 241 s (tué)
 *   1 400 Mo → 0 erreur en 169 s
 *   1 200 Mo → tué (SIGABRT) en 44 s
 *
 * La vérification des types est la DERNIÈRE étape de `npm test`. Tout le
 * monde voyait donc « code 124 » après vingt minutes en croyant la suite
 * en échec, alors que les ~75 bancs passaient : on contournait à la main,
 * chacun de son côté, et personne ne voyait les vrais échecs.
 *
 * Conséquence directe et mesurée : deux inventaires de référence étaient
 * faux depuis plusieurs chantiers (routes admin et API du store) sans que
 * personne ne le voie — la suite n'allait jamais jusqu'à eux. Corriger la
 * mémoire a immédiatement révélé les deux.
 *
 * Ce banc interdit le retour du réglage figé.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  \u2713 ${label}`);
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lanceur = readFileSync(new URL('../scripts/tsc.mjs', import.meta.url), 'utf8');

ok('aucune limite de mémoire n’est figée dans les scripts', () => {
  const chaines = [pkg.scripts?.test ?? '', pkg.scripts?.lint ?? ''];
  for (const chaine of chaines) {
    assert.ok(!/--max-old-space-size=\d+/.test(chaine),
      'une limite en dur refait dépendre la suite de la machine qui la lance');
  }
});

ok('la vérification des types passe par le lanceur adaptatif', () => {
  assert.ok((pkg.scripts?.test ?? '').includes('scripts/tsc.mjs'),
    'npm test doit appeler scripts/tsc.mjs');
  assert.equal(pkg.scripts?.lint, 'node scripts/tsc.mjs');
});

ok('le lanceur calcule la limite depuis la mémoire de la machine', () => {
  assert.ok(lanceur.includes('os.totalmem'), 'la limite doit venir de la machine, pas d’une constante');
  assert.ok(lanceur.includes('KURLA_TSC_MEMORY'), 'une surcharge doit rester possible en CI');
});

ok('un épuisement du tas est diagnostiqué, pas tué en silence', () => {
  // Sans ce message, on ne lit qu'un « Aborted » anonyme et on cherche la
  // faute dans le code source au lieu de la chercher dans la mémoire.
  assert.ok(lanceur.includes('134'), 'le code d’abandon de V8 doit être reconnu');
  assert.ok(/Mémoire insuffisante/.test(lanceur), 'la cause doit être nommée');
});

console.log(`\n${checks} contrôles passés — suite exécutable : la vérification des types s’adapte à la machine\n`);
