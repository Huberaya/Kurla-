/**
 * CHANTIER 7 — sous-chantier 7.3 : prérendu au build.
 *
 * Teste la fonction pure `buildRouteHtml` sur un gabarit en mémoire, donc le code
 * livré. Quatre défauts réels sont couverts :
 *
 * 1. Le <head> d'une route n'est pas réécrit : un moteur non-JS verrait alors le
 *    titre unique d'index.html et tout 7.1/7.2 resterait lettre morte.
 * 2. L'amorce de contenu manque : la page serait « vide » avant exécution du JS.
 * 3. Le gabarit d'origine est détruit (script de montage ou feuilles de style
 *    perdus) : la page prérendue ne s'hydraterait plus pour les humains.
 * 4. Une métadonnée mal échappée injecte du HTML : risque de balisage cassé,
 *    voire d'injection, dès qu'un titre contient un caractère spécial.
 */
import { strict as assert } from 'node:assert';

import { buildRouteHtml } from '../scripts/prerender';
import { indexableRoutes } from '../src/lib/routeMeta';
import type { RouteMeta } from '../src/lib/routeMeta';

const TEMPLATE = `<!doctype html>
<html lang="fr" class="dark">
  <head>
    <meta charset="UTF-8" />
    <title>Titre par défaut</title>
    <meta name="description" content="Description par défaut." />
    <script type="module" crossorigin src="/assets/index-XXX.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-YYY.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const SITE = 'https://kurlabeauty.vercel.app';

function runPrerenderTests(): void {
  const boutique = indexableRoutes().find(route => route.path === '/boutique');
  assert.ok(boutique, 'La route /boutique doit exister et être publiable.');
  const html = buildRouteHtml(TEMPLATE, boutique, SITE);

  // 1. <head> réécrit pour la route.
  assert.ok(html.includes('<title>Boutique cheveux texturés et peau mélaninée | KURLA</title>'),
    'Le titre doit être celui de la route, pas celui du gabarit.');
  assert.ok(!html.includes('<title>Titre par défaut</title>'), 'Le titre par défaut doit avoir disparu.');
  assert.ok(!html.includes('content="Description par défaut."'), 'La description par défaut doit avoir disparu.');
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}/boutique"`), 'Le canonique doit pointer la route.');
  assert.ok(html.includes('name="robots" content="index, follow"'), 'Une route publique doit être indexable.');

  // 2. Amorce de contenu présente.
  assert.ok(html.includes('<h1>Boutique cheveux texturés et peau mélaninée | KURLA</h1>'),
    'L’amorce doit porter le <h1> de la route.');
  assert.ok(html.includes('Catalogue neutre'), 'L’amorce doit reprendre la description de la route.');

  // 3. Le gabarit d'origine est conservé : la page doit pouvoir s'hydrater.
  assert.ok(html.includes('src="/assets/index-XXX.js"'), 'Le script de montage doit être conservé.');
  assert.ok(html.includes('href="/assets/index-YYY.css"'), 'La feuille de style doit être conservée.');
  assert.ok(html.includes('<div id="root">'), 'Le conteneur React doit être conservé.');
  assert.ok(html.includes('application/ld+json'), 'Les données structurées doivent être présentes.');

  // 4. Échappement : un titre hostile ne doit pas injecter de balisage.
  const hostile: RouteMeta = {
    path: '/test',
    title: 'Titre <script>alert(1)</script> & "guillemets"',
    description: 'Desc <b>gras</b> & plus',
    indexable: true,
  };
  const hostileHtml = buildRouteHtml(TEMPLATE, hostile, SITE);
  assert.ok(!hostileHtml.includes('<script>alert(1)</script>'),
    'Un <script> dans un titre ne doit pas survivre à l’échappement.');
  assert.ok(hostileHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),
    'Le titre hostile doit être échappé en entités.');
  assert.ok(!hostileHtml.includes('content="Desc <b>gras</b>'),
    'Une description hostile ne doit pas injecter de balise.');

  // La liste prérendue doit être exactement les routes publiques statiques.
  // 22 routes à la fin du chantier 7, 23 au chantier 8.6b (`/api-docs`),
  // 24 au chantier 8.6c1 (`/createurs`), 25 au chantier 8.6c2 (`/marques`) :
  // les règles de l'espace marque sont publiques, parce qu'une marque doit
  // pouvoir lire ce qu'elle n'obtiendra jamais avant de signer.
  const staticPublic = indexableRoutes().filter(route => !route.path.includes(':'));
  assert.equal(staticPublic.length, 25, `Attendu 25 routes statiques, obtenu ${staticPublic.length}.`);
  assert.ok(
    staticPublic.some(route => route.path === '/api-docs'),
    'La documentation de l’API publique doit être prérendue.'
  );
  assert.ok(
    staticPublic.some(route => route.path === '/createurs'),
    'Le programme experts/créateurs doit être prérendu : ses règles sont publiques.'
  );
  assert.ok(
    staticPublic.some(route => route.path === '/marques'),
    'L’espace marque doit être prérendu : ses règles et ses interdits sont publics.'
  );
  assert.ok(
    !staticPublic.some(route => route.path === '/marque/tests'),
    'Le tableau de bord marque est privé : il ne doit pas être prérendu ni indexé.'
  );

  console.log(
    `[PASS] Chantier 7.3 : prérendu réécrit le <head> par route, amorce <h1> + description, ` +
    `gabarit hydratable conservé, échappement anti-injection, ${staticPublic.length} routes statiques.`
  );
}

try {
  runPrerenderTests();
} catch (error) {
  console.error('[FAIL] Chantier 7.3 — prérendu :', error);
  process.exitCode = 1;
}
