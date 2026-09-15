/**
 * Service worker : un cache qui suit la construction (15/09/2026).
 * ================================================================
 *
 * Symptôme : sur téléphone, les pages restaient blanches — diagnostic,
 * boutique, outils — alors qu'un navigateur neuf affichait tout. La cause
 * n'était ni le réseau ni le code de l'écran : le service worker gardait un
 * cache nommé « kurla-shell-v1 » en dur. Jamais vidé, jamais invalidé, il
 * continuait de servir l'application d'avant la mise en ligne — une version
 * dont les fichiers n'existent plus sur le serveur.
 *
 * Contrat verrouillé :
 *   1. le nom du cache dérive d'un identifiant de construction, pas d'une
 *      constante : deux mises en ligne ne partagent jamais le même cache ;
 *   2. l'identifiant est nettoyé — rien ne peut y introduire un caractère
 *      qui casserait le nom du cache ;
 *   3. le marqueur est bien présent dans la source, donc l'estampillage a
 *      quelque chose à remplacer (sinon il ne se passe rien et le défaut
 *      revient sans bruit) ;
 *   4. le service worker ne met jamais /api/ en cache : c'est la règle
 *      numéro un du fichier, celle qui protège les données personnelles.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(import.meta.dirname, '..');
const { estampiller, nettoyer, MARQUEUR } = await import('../scripts/stampServiceWorker.ts');

// 1 et 2 : le nom du cache suit la construction, et rien ne peut le casser.
const modele = "const CACHE = 'kurla-shell-" + MARQUEUR + "';";
assert.equal(estampiller(modele, 'f5f27d0'), "const CACHE = 'kurla-shell-f5f27d0';");
assert.notEqual(estampiller(modele, 'aaa'), estampiller(modele, 'bbb'), 'deux constructions, deux caches');
assert.equal(nettoyer('sha/avec des espaces'), 'shaavecdesespaces');
assert.equal(nettoyer('$(rm -rf)'), 'rm-rf');
assert.equal(nettoyer(''), 'inconnu', 'un identifiant vide ne doit pas donner un nom de cache vide');

// Le remplacement porte sur toutes les occurrences, pas seulement la première.
assert.equal(estampiller(MARQUEUR + '/' + MARQUEUR, 'x'), 'x/x');

// 3 : la source porte bien le marqueur.
const source = fs.readFileSync(path.join(racine, 'public', 'sw.js'), 'utf-8');
assert.ok(source.includes(MARQUEUR), `public/sw.js doit contenir le marqueur ${MARQUEUR}`);
assert.ok(
  source.split(MARQUEUR).length === 2,
  'le marqueur doit apparaître une seule fois : ailleurs, le nom du cache ne serait plus le seul estampillé',
);
// Le nom figé ne doit pas revenir : c'est la constante qui compte, pas le
// commentaire qui raconte l'ancien défaut.
const ligneCache = source.split('\n').find((ligne) => ligne.includes('const CACHE'));
assert.ok(ligneCache, 'la constante de cache doit exister');
assert.ok(
  ligneCache.includes(MARQUEUR),
  `la constante de cache doit porter le marqueur, pas un nom figé : ${ligneCache?.trim()}`,
);

// Si le projet a été compilé, le résultat ne doit plus porter le marqueur.
const construit = path.join(racine, 'dist', 'sw.js');
if (fs.existsSync(construit)) {
  const livre = fs.readFileSync(construit, 'utf-8');
  assert.ok(!livre.includes(MARQUEUR), 'dist/sw.js a été compilé sans estampillage : le défaut des pages blanches revient');
}

// 4 : l'API n'entre jamais en cache.
assert.ok(source.includes("url.pathname.startsWith('/api/')"), 'la règle « jamais /api/ » doit rester dans le service worker');
assert.ok(source.includes('url.origin !== self.location.origin'), 'les requêtes croisées ne doivent pas être mises en cache');

console.log('[PASS] Service worker : cache estampillé par construction, identifiant nettoyé, marqueur présent dans la source, /api/ jamais mise en cache.');
