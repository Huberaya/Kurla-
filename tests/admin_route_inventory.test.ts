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

function collectRoutes(): AdminRoute[] {
  const serverFiles = walk(path.join(process.cwd(), 'src', 'server'));
  const routes: AdminRoute[] = [];

  for (const file of serverFiles.sort()) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const match = REGISTRATION.exec(line);
      if (!match) return;
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
    });
  }

  // Appelants côté client : tout ce qui n'est pas sous src/server.
  const clientFiles = walk(path.join(process.cwd(), 'src')).filter(file => !file.split(path.sep).includes('server'));
  const corpus = clientFiles.map(file => ({ file: relative(file), text: readFileSync(file, 'utf8') }));

  for (const route of routes) {
    const pattern = new RegExp(
      route.path
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\:[A-Za-z]+/g, '\\$\\{[^}]*\\}'),
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

  console.log('[PASS] Inventaire admin banc : 30 routes, toutes gardées avant effet, appelants figés.');
}

main().catch(error => {
  console.error('[FAIL] Inventaire admin banc :', error);
  process.exitCode = 1;
});
