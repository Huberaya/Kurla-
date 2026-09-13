/**
 * BANC — aucun banc laissé pour compte
 * ====================================
 *
 * Mesuré le 13/09/2026, avant d'écrire une ligne : **17 bancs sur 140
 * n'étaient exécutés par personne.**
 *
 * Le banc de rendu des pages (`e2e/smoke.spec.ts`) avait déjà souffert de ce
 * mal : 48 tests, complets, jamais lancés par aucune action — jusqu'à ce
 * qu'on s'en aperçoive, des semaines plus tard. Le mal n'était pas local : il
 * était systémique. Un banc qu'aucune chaîne n'appelle n'est pas un banc
 * cassé, c'est un banc **absent** — et il donne la même impression de
 * couverture qu'un banc vert.
 *
 * Trois états possibles pour un fichier `tests/*.test.ts`, et un seul est
 * acceptable pour chacun :
 *
 *   1. **exécuté** — atteint, transitivement, par au moins un point d'entrée
 *      de `package.json` ;
 *   2. **module** — il n'est pas un banc mais une bibliothèque, importée par
 *      un autre banc. Son nom en `.test.ts` est un piège de lecture : la
 *      liste est fermée et vérifiée ci-dessous ;
 *   3. **base réelle** — il exige une base Supabase vivante et n'est lancé
 *      qu'à la demande (`npm run test:realdb`), jamais en automatique.
 *
 * Tout autre fichier est un orphelin : ce banc échoue.
 *
 * Pourquoi un fichier de référence ne suffisait pas : un inventaire se
 * régénère d'une commande, et on le régénère sans le lire — deux inventaires
 * étaient faux depuis plusieurs chantiers sans que personne ne le voie. Ici,
 * la liste fermée est dans le code du banc : l'allonger est un acte délibéré,
 * qui se voit dans la revue.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const RACINE = process.cwd();

const pkg = JSON.parse(readFileSync(path.join(RACINE, 'package.json'), 'utf8'));
const scripts: Record<string, string> = pkg.scripts ?? {};

/** Les portes d'entrée : tout ce qu'un humain ou une action peut déclencher. */
const ENTREES = [
  'test',
  'test:realdb',
  'test:integration',
  'test:atomic-stock-integration',
  'test:schema-contract',
  'test:chantier-b:realdb',
  'test:chantier-7-ingredients',
  'test:chantier-7-jurisdiction-integration',
  'test:smoke'
];

/**
 * Modules : nommés `*.test.ts`, mais ce sont des bibliothèques.
 *
 * Vérifié le 13/09/2026 : les quatre sont importés par
 * `tests/supabase.test.ts` (lignes 6-8 et 183). Ils ne s'exécutent pas seuls.
 * Ajouter un nom ici, c'est assumer un nouveau piège de lecture — le banc le
 * signalera à la revue.
 */
const MODULES_CONNUS = [
  'phase3_cart_orders.test.ts',
  'phase4_webhook_stock.test.ts',
  'rls_two_users.test.ts',
  'supabase_auth.test.ts'
];

/**
 * Bancs de base réelle : ils écrivent dans une vraie base et ne se lancent
 * qu'à la demande. Les automatiser sans projet de préproduction, c'est
 * risquer d'écrire dans la production — la décision appartient au porteur.
 */
const BASE_REELLE_CONNUE = [
  'chantier_7_ingredients.realdb.test.ts',
  'chantier_7_jurisdiction.integration.test.ts',
  'phase7_atomic_stock.integration.test.ts',
  'real_database_preflight.test.ts',
  'schema_query_contract.integration.test.ts',
  'supabase_integration.test.ts'
];

/** Fichiers atteints depuis une porte d'entrée, chaînage compris. */
function atteintsDepuis(entree: string): Set<string> {
  const fichiers = new Set<string>();
  const vus = new Set<string>();
  const pile = [entree];
  while (pile.length > 0) {
    const nom = pile.pop()!;
    if (vus.has(nom)) continue;
    vus.add(nom);
    const commande = String(scripts[nom] ?? '');
    for (const m of commande.matchAll(/(?:^|\s)(?:tsx\s+)?(tests\/[A-Za-z0-9_.\-]+\.ts)/g)) fichiers.add(m[1]);
    for (const m of commande.matchAll(/npm run ([a-z0-9:\-]+)/g)) pile.push(m[1]);
  }
  return fichiers;
}

const parEntree = new Map<string, Set<string>>(ENTREES.map((e) => [e, atteintsDepuis(e)]));
const parTest = parEntree.get('test')!;
const parNimporteQuelleEntree = new Set<string>();
for (const fichiers of parEntree.values()) for (const f of fichiers) parNimporteQuelleEntree.add(f);

const surDisque = readdirSync(path.join(RACINE, 'tests'))
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => `tests/${f}`)
  .sort();

let verifications = 0;
function ok(label: string, fn: () => void): void {
  fn();
  verifications += 1;
  console.log(`  ✓ ${label}`);
}

// ---------------------------------------------------------------------------
// 1. Aucun fichier n'est hors de portée de toute porte d'entrée
// ---------------------------------------------------------------------------

/** Un module est un fichier importé ailleurs : il vit par son importeur. */
function estImporteAilleurs(nomFichier: string): boolean {
  const nu = nomFichier.replace('tests/', '').replace(/\.test\.ts$/, '');
  const motif = new RegExp(`['"](?:\\.\\.\\/|\\.\\/)?(?:tests\\/)?${nu}(?:\\.test)?['"]`);
  for (const dossier of ['tests', 'src', 'scripts', 'e2e']) {
    const chemin = path.join(RACINE, dossier);
    if (!existsSync(chemin)) continue;
    for (const fichier of readdirSync(chemin, { recursive: true })) {
      const cible = path.join(chemin, String(fichier));
      if (!/\.(ts|tsx|mjs|js)$/.test(cible)) continue;
      if (cible.endsWith(nomFichier)) continue;
      try {
        if (motif.test(readFileSync(cible, 'utf8'))) return true;
      } catch { /* fichier illisible : on passe */ }
    }
  }
  return false;
}

const importes = surDisque.filter((f) => !parNimporteQuelleEntree.has(f) && estImporteAilleurs(f));
const orphelins = surDisque.filter((f) => !parNimporteQuelleEntree.has(f) && !estImporteAilleurs(f));

ok(`les ${surDisque.length} fichiers de banc sont tous atteints par une porte d'entrée`, () => {
  assert.deepEqual(orphelins, [], `banc(s) qu'aucune commande n'exécute :\n  ${orphelins.join('\n  ')}\nDéclarer un lanceur dans package.json et le chaîner, ou le ranger en module.`);
});

ok('les modules nommés *.test.ts sont exactement ceux connus', () => {
  const trouves = importes.map((f) => f.replace('tests/', '')).sort();
  assert.deepEqual(trouves, [...MODULES_CONNUS].sort(),
    `Un fichier est importé sans être exécuté. Deux cas : un nouveau module (l'ajouter à MODULES_CONNUS en assumant le piège de nommage), ou un banc oublié (le chaîner). Trouvés : ${trouves.join(', ')}`);
});

// ---------------------------------------------------------------------------
// 2. Ce qui n'est pas exécuté par `npm test` doit être justifié nommément
// ---------------------------------------------------------------------------

const horsSuite = surDisque.filter((f) => !parTest.has(f)).map((f) => f.replace('tests/', '')).sort();
const attendusHorsSuite = [...MODULES_CONNUS, ...BASE_REELLE_CONNUE].sort();

ok('rien ne sort de la suite sans être nommé dans ce banc', () => {
  assert.deepEqual(horsSuite, attendusHorsSuite,
    `Écart sur les bancs hors « npm test ».\n  Non justifiés : ${horsSuite.filter((f) => !attendusHorsSuite.includes(f)).join(', ')}\n  Justifiés mais absents : ${attendusHorsSuite.filter((f) => !horsSuite.includes(f)).join(', ')}`);
});

// ---------------------------------------------------------------------------
// 3. Un lanceur déclaré n'est pas une preuve d'exécution
// ---------------------------------------------------------------------------

ok('chaque lanceur test:* qui pointe vers un banc existant est atteint', () => {
  const nonAtteints: string[] = [];
  for (const [nom, commande] of Object.entries(scripts)) {
    if (!/^test:/.test(nom)) continue;
    const fichiers = [...String(commande).matchAll(/(tests\/[A-Za-z0-9_.\-]+\.ts)/g)].map((m) => m[1]);
    const cibles = fichiers.filter((f) => existsSync(path.join(RACINE, f)));
    if (cibles.length === 0) continue;
    // Le lanceur est-il appelé, directement ou non, par une porte d'entrée ?
    const appele = ENTREES.some((entree) => {
      const vus = new Set<string>();
      const pile = [entree];
      while (pile.length > 0) {
        const courant = pile.pop()!;
        if (vus.has(courant)) continue;
        vus.add(courant);
        if (courant === nom) return true;
        for (const m of String(scripts[courant] ?? '').matchAll(/npm run ([a-z0-9:\-]+)/g)) pile.push(m[1]);
      }
      return false;
    });
    // Ou bien son fichier est-il exécuté directement par une porte d'entrée ?
    const fichierExecute = cibles.some((f) => parNimporteQuelleEntree.has(f));
    if (!appele && !fichierExecute) nonAtteints.push(`${nom} → ${cibles.join(', ')}`);
  }
  assert.deepEqual(nonAtteints, [],
    `lanceur(s) déclaré(s) mais jamais appelé(s) — croire qu'un banc tourne parce qu'il a une commande est exactement le mal que ce banc soigne :\n  ${nonAtteints.join('\n  ')}`);
});

// ---------------------------------------------------------------------------
// 4. Le banc de rendu, justement : écrit, complet, longtemps jamais lancé
// ---------------------------------------------------------------------------

ok('le banc de rendu des pages est exécuté par une action planifiée', () => {
  const brut = readFileSync(path.join(RACINE, '.github', 'workflows', 'rendu-pages.yml'), 'utf8');
  assert.match(brut, /schedule:/, 'le banc de rendu doit être planifié, pas seulement déclenchable à la main');
  assert.match(brut, /npm run test:smoke/, 'la commande du banc doit être celle de package.json');
});

ok('la suite complète est exécutée par une action, pas seulement à la main', () => {
  const brut = readFileSync(path.join(RACINE, '.github', 'workflows', 'production-safety.yml'), 'utf8');
  assert.match(brut, /npm test/, '« npm test » doit tourner dans l’intégration continue : personne ne le lance à la main à chaque commit');
  assert.match(brut, /schedule:/, 'une exécution planifiée couvre ce qu’un push ne voit pas (données, tiers, dérive)');
});

console.log(`\n  · ${surDisque.length} fichiers de banc · ${parTest.size} exécutés par « npm test » · ${MODULES_CONNUS.length} modules · ${BASE_REELLE_CONNUE.length} bancs de base réelle · 0 orphelin.`);
console.log(`\n[PASS] Bancs orphelins : ${verifications} vérifications — aucun fichier « *.test.ts » n'est hors de portée, rien ne sort de « npm test » sans être nommé et justifié ici, et aucun lanceur déclaré n'est laissé sans appel.`);
