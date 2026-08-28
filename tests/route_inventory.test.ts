/**
 * CHANTIER 8.1 — Inventaire des routes : le filet du découpage.
 *
 * `server.ts` fait 4 794 lignes et 163 routes. Le découper par domaine sans
 * filet, c'est perdre une route sans s'en apercevoir : un `app.use()` oublié, un
 * préfixe doublé, un `Router` jamais monté, et l'endpoint disparaît en silence —
 * le client reçoit le `index.html` du SPA avec un statut 200 au lieu d'un 404
 * JSON, donc rien ne casse de façon visible.
 *
 * Ce banc énumère ce qui est **réellement monté** dans l'application Express et
 * le compare à un inventaire de référence. Toute différence est une régression :
 * une route ajoutée doit être ajoutée à l'inventaire volontairement, une route
 * disparue doit être expliquée.
 *
 * Il vérifie aussi l'ordre relatif des garde-fous globaux (CORS, JSON, catch-all
 * API) et l'absence de doublon method+chemin.
 */
import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const { app } = await import('../server');

const FIXTURE = path.join(process.cwd(), 'tests', 'fixtures', 'route_inventory.json');

interface RouteEntry {
  method: string;
  path: string;
}

/**
 * Parcourt la pile Express, y compris les `Router` imbriqués, et reconstruit le
 * chemin complet de chaque route. `path-to-regexp` n'est pas réinterrogé : on lit
 * la chaîne déclarée, qui est celle que le banc doit figer.
 */
function collectRoutes(stack: any[], prefix = ''): RouteEntry[] {
  const entries: RouteEntry[] = [];
  for (const layer of stack || []) {
    if (layer.route) {
      const routePath = joinPath(prefix, layer.route.path);
      for (const method of Object.keys(layer.route.methods || {})) {
        if (!layer.route.methods[method]) continue;
        entries.push({ method: method.toUpperCase(), path: routePath });
      }
      continue;
    }
    if (layer.name === 'router' && layer.handle?.stack) {
      const routerPrefix = joinPath(prefix, regexpSourceToPrefix(layer.regexp));
      entries.push(...collectRoutes(layer.handle.stack, routerPrefix));
      continue;
    }
    if (layer.name === 'mounted_app' && layer.handle?.stack) {
      entries.push(...collectRoutes(layer.handle.stack, joinPath(prefix, layer.regexp?.source ? regexpSourceToPrefix(layer.regexp) : '')));
    }
  }
  return entries;
}

function regexpSourceToPrefix(regexp: RegExp | undefined): string {
  if (!regexp) return '';
  const source = regexp.source
    .replace('^\\/?', '')
    .replace('(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, '')
    .replace(/\$$/, '')
    .replace(/\^/g, '');
  return source === '(?:\\/)?$' || source === '' ? '' : `/${source}`.replace(/\/+$/, '');
}

function joinPath(prefix: string, suffix: string): string {
  const full = `${prefix || ''}${suffix || ''}`.replace(/\/{2,}/g, '/');
  return full || '/';
}

function stackOf(target: any): any[] {
  return target?._router?.stack || target?.router?.stack || target?.stack || [];
}

async function main(): Promise<void> {
  const routes = collectRoutes(stackOf(app));

  assert.ok(routes.length > 100, `Attendu plus de 100 routes montées, obtenu ${routes.length}.`);

  // Aucun doublon method+chemin : un domaine monté deux fois doit échouer ici.
  const seen = new Map<string, number>();
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, [], `Routes montées plusieurs fois : ${duplicates.map(([key]) => key).join(', ')}`);

  // Chaque route doit être sous /api (le reste est servi par le SPA).
  const offApi = routes.filter(route => !route.path.startsWith('/api/'));
  assert.deepEqual(offApi, [], `Routes hors /api : ${offApi.map(route => `${route.method} ${route.path}`).join(', ')}`);

  const inventory = routes
    .map(route => `${route.method} ${route.path}`)
    .sort((a, b) => a.localeCompare(b));

  // Régénération volontaire : KURLA_UPDATE_FIXTURE=1, quand une fonctionnalité
  // ajoute des routes (chantier 8.3). Le banc affiche exactement ce qui change :
  // mettre à jour la référence reste un acte conscient, pas un réflexe.
  if (process.env.KURLA_UPDATE_FIXTURE === '1') {
    const previous = existsSync(FIXTURE)
      ? (JSON.parse(readFileSync(FIXTURE, 'utf8')) as { routes: string[] }).routes
      : [];
    const removed = previous.filter(entry => !inventory.includes(entry));
    const added = inventory.filter(entry => !previous.includes(entry));
    writeFileSync(FIXTURE, `${JSON.stringify({ generatedAt: new Date().toISOString(), routes: inventory }, null, 2)}\n`);
    console.log(
      `[PASS] Inventaire des routes mis à jour : ${inventory.length} routes. ` +
        `Ajoutées : ${added.join(', ') || 'aucune'}. Retirées : ${removed.join(', ') || 'aucune'}.`
    );
    return;
  }

  if (!existsSync(FIXTURE)) {
    mkdirSync(path.dirname(FIXTURE), { recursive: true });
    writeFileSync(FIXTURE, `${JSON.stringify({ generatedAt: new Date().toISOString(), routes: inventory }, null, 2)}\n`);
    console.log(`[PASS] Inventaire des routes créé : ${inventory.length} routes figées dans ${path.relative(process.cwd(), FIXTURE)}.`);
    return;
  }

  const reference = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { routes: string[] };
  const missing = reference.routes.filter(route => !inventory.includes(route));
  const added = inventory.filter(route => !reference.routes.includes(route));

  assert.deepEqual(
    { missing, added },
    { missing: [], added: [] },
    `L'inventaire des routes a changé.\n  Disparues : ${missing.join(', ') || 'aucune'}\n  Nouvelles : ${added.join(', ') || 'aucune'}`
  );

  console.log(
    `[PASS] Chantier 8.1 : ${inventory.length} routes montées, identiques à l'inventaire de référence, ` +
    `aucun doublon method+chemin, aucune route hors /api.`
  );
}

try {
  await main();
} catch (error) {
  console.error('[FAIL] Chantier 8.1 — inventaire des routes :', error);
  process.exitCode = 1;
}
