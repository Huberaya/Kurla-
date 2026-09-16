/**
 * CHANTIER 15A — INVENTAIRE VÉRIFIÉ DE LA SURFACE D'ADMINISTRATION.
 *
 * Constat qui a ouvert le chantier : **30 routes `/api/admin/*`** pour
 * **2 pages** côté client, et aucune d'elles n'avait jamais tourné sous une
 * vraie session — aucun profil `admin` n'existait en production. Une surface
 * que personne ne peut ouvrir est une surface que personne n'entretient.
 *
 * Ce banc fige trois faits mesurés, pas des intentions :
 *
 *  1. **l'inventaire exact** (méthode + chemin + fichier + ligne). Une route
 *     admin ajoutée ou retirée doit être un acte conscient ;
 *  2. **la garde avant l'effet** : chaque gestionnaire doit exiger un rôle
 *     admin *avant* tout appel au store. C'est l'invariant de sécurité, et il
 *     est vérifiable statiquement — le vérifier ici coûte moins cher que de le
 *     découvrir en production ;
 *  3. **les appelants réels** : quelles routes un écran appelle vraiment. Une
 *     route sans appelant n'est pas interdite, mais elle doit être nommée :
 *     c'est la dette, et elle est mesurable.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const FIXTURE = path.join(process.cwd(), 'tests', 'fixtures', 'admin_route_inventory.json');

interface AdminRoute {
  method: string;
  path: string;
  file: string;
  line: number;
  guard: string | null;
  callers: string[];
}

const REGISTRATION = /app\.(get|post|patch|put|delete)\(\s*'([^']*api\/admin[^']*)'/;
const GUARD = /require(Admin|Superadmin|Support|Brand|User)\(/;
const EFFECT = /(serverDb\.|supabase\.|await\s+\w+\(store)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

function relative(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

/**
 * Fichiers réellement atteints depuis les points d'entrée.
 *
 * Mesuré le 16/09/2026 : ce banc comptait comme « appelée » toute route
 * présente dans un fichier de `src/`, **monté ou non**. Après le retrait de la
 * famille « Gouvernance Skin », 17 composants sont devenus inatteignables —
 * plus aucun écran ne les affiche — sans que le compte d'appelants bouge d'un
 * iota. L'inventaire continuait de lire leurs `fetch()` et de déclarer ces
 * routes couvertes.
 *
 * Un `fetch()` dans un fichier que rien n'importe n'est pas un appelant :
 * c'est du code mort qui se fait passer pour de la couverture. On ne parcourt
 * donc que les fichiers atteints par le graphe des importations.
 */
function fichiersAtteints(): Set<string> {
  const entrees = ['src/main.tsx', 'src/App.tsx']
    .map(f => path.join(process.cwd(), f))
    .filter(f => existsSync(f));

  const resolu = (depuis: string, source: string): string | null => {
    if (!source.startsWith('.')) return null;
    const base = path.resolve(path.dirname(depuis), source);
    for (const candidat of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
      if (existsSync(candidat) && statSync(candidat).isFile()) return candidat;
    }
    return null;
  };

  const vus = new Set<string>();
  const aTraiter = [...entrees];
  while (aTraiter.length > 0) {
    const courant = aTraiter.pop()!;
    if (vus.has(courant)) continue;
    vus.add(courant);
    const texte = readFileSync(courant, 'utf8');
    for (const m of texte.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const cible = resolu(courant, m[1]);
      if (cible) aTraiter.push(cible);
    }
  }
  return vus;
}

function collectRoutes(): AdminRoute[] {
  const serverFiles = walk(path.join(process.cwd(), 'src', 'server'));
  const routes: AdminRoute[] = [];

  for (const file of serverFiles.sort()) {
    const texte = readFileSync(file, 'utf8');
    const lines = texte.split('\n');
    // L'expression est appliquée au fichier ENTIER, plus ligne par ligne.
    //
    // Mesuré le 15/09/2026 : quatre routes admin échappaient à cet inventaire
    // — `conversion-funnel`, `launch/traction`, `strategy/cockpit` et, le
    // jour même, `copilote` — uniquement parce que leur enregistrement est
    // écrit sur plusieurs lignes (`app.get(` seul sur la sienne). Un
    // inventaire qui se dit exact et qui perd des routes sur une histoire de
    // retours à la ligne n'est pas exact : il rassure. Les quatre étaient
    // correctement gardées, mais personne ne le vérifiait.
    const global = new RegExp(REGISTRATION.source, 'g');
    let found: RegExpExecArray | null;
    while ((found = global.exec(texte)) !== null) {
      const match = found;
      const index = texte.slice(0, match.index).split('\n').length - 1;
      // La garde doit précéder le premier effet dans le corps du gestionnaire.
      const body = lines.slice(index, index + 45).join('\n');
      const guard = GUARD.exec(body);
      const effect = EFFECT.exec(body);
      const guardFirst = guard && (!effect || guard.index < effect.index);
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file: `${relative(file)}:${index + 1}`,
        line: index + 1,
        guard: guardFirst ? guard![0] : null,
        callers: []
      });
    }
  }

  // Appelants côté client : tout ce qui n'est pas sous src/server **et qui est
  // atteint** depuis les points d'entrée (voir `fichiersAtteints`).
  const atteints = fichiersAtteints();
  const clientFiles = walk(path.join(process.cwd(), 'src'))
    .filter(file => !file.split(path.sep).includes('server') && atteints.has(file));
  const corpus = clientFiles.map(file => ({ file: relative(file), text: readFileSync(file, 'utf8') }));

  // Les fichiers inatteints qui appellent pourtant l'admin : ce n'est plus de
  // la couverture, c'est du code mort. Nommé, pas ignoré.
  const morts = walk(path.join(process.cwd(), 'src'))
    .filter(file => !file.split(path.sep).includes('server') && !atteints.has(file))
    .filter(file => /['"`]\/api\/admin/.test(readFileSync(file, 'utf8')))
    .map(relative);
  if (morts.length > 0) {
    console.log(`[INFO] ${morts.length} fichier(s) inatteint(s) appellent encore l'admin (code mort) :\n       ${morts.join('\n       ')}`);
  }

  for (const route of routes) {
    const pattern = new RegExp(
      route.path
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // Le deux-points n'est pas dans la classe échappée ci-dessus : chercher
        // « \\: » ne pouvait donc jamais matcher, et toute route paramétrée
        // passait pour orpheline même appelée. Corrigé au chantier 16B, où un
        // écran appelle enfin des routes à paramètre.
        .replace(/:[A-Za-z]+/g, '\\$\\{[^}]*\\}')
        // Frontière finale : sans elle, /api/admin/suppliers matchait aussi les
        // lignes appelant /api/admin/suppliers/:id/documents, et une route
        // orpheline pouvait passer pour appelée par simple préfixe commun.
        + '(?=[`\'"?\\s]|$)',
      'g'
    );
    for (const { file, text } of corpus) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const line = text.slice(0, match.index).split('\n').length;
        route.callers.push(`${file}:${line}`);
      }
    }
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

async function main(): Promise<void> {
  const routes = collectRoutes();

  assert.ok(routes.length >= 25, `Attendu au moins 25 routes admin, obtenu ${routes.length}.`);

  // -------------------------------------------------------------------
  // 1. Aucune route admin sans garde avant effet.
  // -------------------------------------------------------------------
  const unguarded = routes.filter(route => route.guard === null);
  assert.deepEqual(
    unguarded.map(route => `${route.method} ${route.path} (${route.file})`),
    [],
    'Route(s) admin sans garde de rôle avant le premier effet.'
  );

  // -------------------------------------------------------------------
  // 2. Les routes sans appelant client sont nommées, pas ignorées.
  // -------------------------------------------------------------------
  const orphans = routes.filter(route => route.callers.length === 0);
  const called = routes.filter(route => route.callers.length > 0);
  assert.ok(called.length > 0, 'Aucune route admin n’est appelée par le client.');
  console.log(`[INFO] ${called.length}/${routes.length} routes admin appelées par un écran ; ${orphans.length} sans appelant.`);

  // -------------------------------------------------------------------
  // 3. Comparaison à l'inventaire de référence.
  // -------------------------------------------------------------------
  const snapshot = routes.map(route => ({
    method: route.method,
    path: route.path,
    file: route.file,
    guard: route.guard,
    callers: route.callers
  }));

  if (process.env.KURLA_UPDATE_FIXTURE === '1' || !existsSync(FIXTURE)) {
    writeFileSync(FIXTURE, `${JSON.stringify({ generatedAt: new Date().toISOString(), routes: snapshot }, null, 2)}\n`);
    console.log(`[PASS] Inventaire admin créé : ${routes.length} routes figées dans ${path.relative(process.cwd(), FIXTURE)}.`);
    return;
  }

  const reference = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { routes: typeof snapshot };
  const key = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
  const refKeys = new Set(reference.routes.map(key));
  const curKeys = new Set(snapshot.map(key));
  const added = [...curKeys].filter(k => !refKeys.has(k));
  const removed = [...refKeys].filter(k => !curKeys.has(k));
  assert.deepEqual({ added, removed }, { added: [], removed: [] },
    'La surface d’administration a changé. Une route admin ajoutée ou retirée doit être volontaire.');

  // Les appelants font partie de l'inventaire : un écran qui cesse d'appeler
  // une route est une régression invisible autrement.
  const callerDrift = snapshot
    .map(route => ({ route: key(route), now: route.callers.length, before: reference.routes.find(r => key(r) === key(route))?.callers.length ?? 0 }))
    .filter(entry => entry.now !== entry.before);
  assert.deepEqual(callerDrift, [],
    'Le nombre d’appelants client a changé pour ces routes admin (un écran a cessé d’appeler, ou un nouvel écran est apparu).');

  console.log(`[PASS] Inventaire admin banc : ${routes.length} routes, toutes gardées avant effet, appelants figés.`);
}

main().catch(error => {
  console.error('[FAIL] Inventaire admin banc :', error);
  process.exitCode = 1;
});
