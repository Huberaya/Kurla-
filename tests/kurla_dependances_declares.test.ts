/**
 * BANC — toute dépendance importée doit être déclarée
 * ===================================================
 *
 * Le 11/09/2026, toute l'API de production est tombée d'un coup, en 500,
 * avec `Cannot find module 'web-push'`. La cause : `src/lib/pushDelivery.ts`
 * importait `web-push`, mais le paquet n'était déclaré dans aucune section
 * de `package.json`. Il n'a donc jamais été installé à la construction —
 * et, chargé en tête de module, il empêchait le serveur entier de démarrer.
 * `/api/health`, `/api/products`, le panier, tout était hors service, alors
 * que la page d'accueil continuait de répondre 200 : la panne était
 * invisible au premier coup d'œil.
 *
 * Localement, rien ne le voyait non plus : le paquet traînait dans
 * `node_modules`, la vérification des types passait, les bancs passaient.
 * Seule la production, où l'installation part de `package.json`, trahissait
 * le manque.
 *
 * Ce banc compare les importations réelles du code aux dépendances
 * déclarées. Il ne juge pas de l'utilité d'un paquet : il signale un écart
 * entre ce que le code exige et ce que le projet annonce installer.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;

const pkg = JSON.parse(readFileSync(join(RACINE, 'package.json'), 'utf8'));
const DECLAREES = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);

// Modules fournis par Node lui-même — jamais à déclarer.
const BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto',
  'dgram', 'dns', 'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module',
  'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring',
  'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls',
  'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib',
]);

const A_PARCOURIR = ['src', 'api', 'scripts', 'tests', 'server.ts', 'vite.config.ts'];

function fichiersSources(chemin: string): string[] {
  const absolu = join(RACINE, chemin);
  let etat;
  try { etat = statSync(absolu); } catch { return []; }
  if (etat.isFile()) return /\.(ts|tsx|mts|cts|mjs|js|jsx)$/.test(absolu) ? [absolu] : [];
  if (!etat.isDirectory()) return [];
  return readdirSync(absolu).flatMap((entree) => {
    if (entree === 'node_modules' || entree === 'dist' || entree.startsWith('.')) return [];
    return fichiersSources(join(chemin, entree));
  });
}

/** Ramène `@scope/paquet/sous-chemin` ou `paquet/sous-chemin` à son paquet. */
function paquetDe(specificateur: string): string | null {
  if (specificateur.startsWith('@/')) return null;          // alias vers le projet
  if (specificateur.startsWith('.') || specificateur.startsWith('/')) return null;
  if (specificateur.startsWith('node:')) return null;
  if (specificateur.startsWith('virtual:')) return null;
  const segments = specificateur.split('/');
  const nom = specificateur.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
  if (!nom) return null;
  if (BUILTINS.has(nom)) return null;
  return nom;
}

// Les quatre formes d'importation à repérer : import/export … depuis un
// paquet, import nu, import dynamique, et require. Les motifs sont écrits
// sans jamais nommer un paquet en clair — un commentaire qui citerait un
// spécificateur serait pris pour une importation réelle.
const MOTIFS = [
  /(?:^|[;\s])(?:import|export)\b[\s\S]{0,400}?\bfrom\s*['"]([^'"]+)['"]/g,
  /(?:^|[;\s])import\s*['"]([^'"]+)['"]/g,
  /(?:^|[;\s])import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /(?:^|[;\s])require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const manquantes: { fichier: string; paquet: string }[] = [];
const fichiers = A_PARCOURIR.flatMap(fichiersSources);

for (const fichier of fichiers) {
  const source = readFileSync(fichier, 'utf8');
  const trouves = new Set<string>();
  for (const motif of MOTIFS) {
    for (const [, specification] of source.matchAll(motif)) {
      const paquet = paquetDe(specification);
      if (paquet && !DECLAREES.has(paquet)) trouves.add(paquet);
    }
  }
  for (const paquet of trouves) {
    manquantes.push({ fichier: relative(RACINE, fichier), paquet });
  }
}

/**
 * Un JSON à clé dupliquée reste valide : le parseur garde la dernière
 * occurrence et ne dit rien. Mesuré ici avant correction, sur une clé
 * `test:need-depth` déclarée deux fois dans `package.json` : toute
 * assertion du type « cette clé existe » passait à côté, et seul esbuild
 * signalait le doublon, en warning, noyé dans la sortie du build.
 *
 * On ne peut donc pas compter sur `JSON.parse` pour le voir — il l'absorbe.
 * Ce petit analyseur parcourt le texte et signale toute clé répétée **au
 * sein d'un même objet** (deux objets différents peuvent légitimement
 * porter la même clé).
 */
function clefsEnDouble(texte: string): string[] {
  const doublons: string[] = [];
  const pile: { cles: Set<string>; chemin: string }[] = [];
  let i = 0;

  const sauterBlancs = () => { while (i < texte.length && /\s/.test(texte[i])) i += 1; };

  function lireChaine(): string {
    i += 1; // guillemet ouvrant
    let sortie = '';
    while (i < texte.length) {
      const c = texte[i];
      if (c === '\\') { sortie += texte[i] + texte[i + 1]; i += 2; continue; }
      if (c === '"') { i += 1; return sortie; }
      sortie += c;
      i += 1;
    }
    return sortie;
  }

  function valeur(chemin: string): void {
    sauterBlancs();
    const c = texte[i];
    if (c === '{') return objet(chemin);
    if (c === '[') return tableau(chemin);
    if (c === '"') { lireChaine(); return; }
    while (i < texte.length && !/[\s,}\]]/.test(texte[i])) i += 1; // nombre, true, false, null
  }

  function objet(chemin: string): void {
    i += 1; // accolade ouvrante
    pile.push({ cles: new Set(), chemin });
    for (;;) {
      sauterBlancs();
      if (i >= texte.length) return;
      if (texte[i] === '}') { i += 1; break; }
      if (texte[i] === ',') { i += 1; continue; }
      const clef = lireChaine();
      const courant = pile[pile.length - 1];
      if (courant.cles.has(clef)) doublons.push(`${courant.chemin || 'racine'}.${clef}`);
      else courant.cles.add(clef);
      sauterBlancs();
      if (texte[i] === ':') i += 1;
      valeur(chemin ? `${chemin}.${clef}` : clef);
    }
    pile.pop();
  }

  function tableau(chemin: string): void {
    i += 1; // crochet ouvrant
    for (;;) {
      sauterBlancs();
      if (i >= texte.length) return;
      if (texte[i] === ']') { i += 1; return; }
      if (texte[i] === ',') { i += 1; continue; }
      valeur(chemin);
    }
  }

  valeur('');
  return doublons;
}

let checks = 0;
function ok(label: string, fn: () => void): void {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

ok(`${fichiers.length} fichiers analysés, aucune dépendance importée sans être déclarée`, () => {
  if (manquantes.length === 0) return;
  const detail = manquantes
    .map(({ fichier, paquet }) => `      ${paquet}  (importé par ${fichier})`)
    .join('\n');
  assert.fail(
    `${manquantes.length} paquet(s) importé(s) mais absent(s) de package.json —\n` +
    `      introuvables à l'installation, ils feront échouer la production :\n${detail}`
  );
});

ok('les dépendances déclarées sont toutes installées localement', () => {
  // L'inverse du contrôle précédent : un paquet déclaré mais introuvable
  // dans node_modules annonce une installation incomplète.
  const introuvables = [...DECLAREES].filter((nom) => {
    try { statSync(join(RACINE, 'node_modules', nom)); return false; } catch { return true; }
  });
  assert.deepEqual(introuvables, [],
    `déclaré(s) dans package.json mais absent(s) de node_modules : ${introuvables.join(', ')}`);
});

ok('package.json n’a aucune clé déclarée deux fois', () => {
  const doublons = clefsEnDouble(readFileSync(join(RACINE, 'package.json'), 'utf8'));
  assert.deepEqual(doublons, [],
    `clé(s) répétée(s) — JSON.parse garde la dernière sans rien dire : ${doublons.join(', ')}`);
});

ok('le détecteur de doublons voit juste (auto-vérification)', () => {
  // Un garde-fou qui ne se teste pas lui-même peut se taire indéfiniment.
  assert.deepEqual(clefsEnDouble('{"a":1,"a":2}'), ['racine.a'], 'doublon simple non vu');
  assert.deepEqual(clefsEnDouble('{"scripts":{"x":1,"x":2}}'), ['scripts.x'], 'doublon imbriqué non vu');
  assert.deepEqual(clefsEnDouble('{"a":1}'), [], 'faux positif sur un objet sain');
  // Une chaîne peut contenir accolades, virgules et deux-points : elle ne
  // doit pas être prise pour de la structure.
  assert.deepEqual(
    clefsEnDouble('{"a":"{\\"b\\":1, }","c":2}'), [],
    'une valeur textuelle a été prise pour un objet'
  );
  // Deux objet frères peuvent porter la même clé sans que ce soit un doublon.
  assert.deepEqual(clefsEnDouble('{"a":{"x":1},"b":{"x":2}}'), [],
    'même clé dans deux objets différents : ce n’est pas un doublon');
});

console.log(`\n${checks} contrôles passés — dépendances : ce que le code importe, le projet l’installe\n`);
