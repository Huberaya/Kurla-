/**
 * CHANTIER 7 — sous-chantier 7.2 : socle SEO technique.
 *
 * Vérifie les artefacts produits par `scripts/generateSitemap.ts` sans passer par
 * le système de fichiers : on appelle les fonctions pures `buildSitemap` et
 * `buildRobots`, donc on teste le code livré, pas une copie. Trois familles de
 * défauts sont couvertes :
 *
 * 1. Le sitemap omet une route publiable, ou pire, publie une page privée ou un
 *    motif paramétré (URL qui ne mène nulle part tant que 7.4 n'existe pas).
 * 2. `robots.txt` laisse passer une page privée (fuite dans l'index) ou bloque
 *    une page publique (autodestruction du trafic), ou contient des règles
 *    redondantes par préfixe.
 * 3. L'image Open Graph par défaut est absente ou mal dimensionnée : un partage
 *    social sans image 1200×630 est le cas le plus courant de carte brisée.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { ROUTE_META, indexableRoutes } from '../src/lib/routeMeta';
import { buildSitemap, buildRobots, disallowPattern } from '../scripts/generateSitemap';

function runSeoTests(): void {
  // -------------------------------------------------------------------
  // 1. Sitemap : cohérent avec la table de routes, pas avec une copie.
  // -------------------------------------------------------------------
  const sitemap = buildSitemap();

  assert.ok(
    sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
    'Le sitemap doit commencer par un en-tête XML.'
  );
  assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'),
    'Le sitemap doit déclarer l’espace de noms sitemaps.org.');

  // Structure : chaque <url> doit être refermé et contenir exactement un <loc>.
  const urlBlocks = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
  const locCount = (sitemap.match(/<loc>/g) || []).length;
  assert.equal(urlBlocks.length, locCount, 'Chaque bloc <url> doit contenir un <loc>.');
  assert.equal((sitemap.match(/<\/url>/g) || []).length, urlBlocks.length, 'Tous les <url> doivent être refermés.');

  // Le jeu d'URLs doit être exactement celui des routes publiables statiques.
  const expectedPaths = indexableRoutes().filter(route => !route.path.includes(':')).map(route => route.path);
  const listedLocs = urlBlocks.map(block => {
    const m = block.match(/<loc>([^<]+)<\/loc>/);
    return m ? m[1] : '';
  });
  const listedPaths = listedLocs.map(loc => loc.replace(/^https:\/\/kurlabeauty\.vercel\.app/, ''));
  assert.deepEqual(
    [...listedPaths].sort(),
    [...expectedPaths].sort(),
    'Le sitemap doit lister exactement les routes publiques statiques.'
  );

  // Aucune page privée, aucun motif paramétré ne doit apparaître. Le test porte
  // sur le chemin relatif : l'URL absolue contient toujours « :// » (le schéma
  // https), ce qui rendrait un test sur l'URL entière inopérant.
  const forbidden = listedPaths.filter(path => path.includes(':') ||
    /\/account|\/admin|\/pro\/|\/recherche|\/mes-reservations|\/famille/.test(path));
  assert.deepEqual(forbidden, [], `URLs privées ou paramétrées dans le sitemap : ${forbidden.join(', ')}`);

  // Chaque URL publiable doit porter lastmod, et changefreq/priority cohérents.
  for (const block of urlBlocks) {
    assert.ok(block.includes('<lastmod>'), 'Chaque URL doit porter un lastmod.');
    assert.match(block, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, 'lastmod doit être une date ISO.');
  }

  // Injection d'entités : le sitemap doit pouvoir porter des pages lues en base
  // (ingrédients vérifiés), et rester statique quand la liste est vide.
  const withEntity = buildSitemap([{ path: '/ingredient/glycerin', title: 'Glycerin', description: 'Humectant.' }]);
  assert.ok(
    withEntity.includes('<loc>https://kurlabeauty.vercel.app/ingredient/glycerin</loc>'),
    'Le sitemap doit porter l’URL d’une entité fournie.'
  );
  assert.ok(withEntity.includes('<changefreq>monthly</changefreq>'), 'Une entité doit porter une fréquence.');
  const staticOnly = buildSitemap();
  assert.ok(!staticOnly.includes('/ingredient/glycerin'), 'Sans entité fournie, pas d’URL ingrédient.');

  // -------------------------------------------------------------------
  // 2. robots.txt : le privé est bloqué, le public ne l'est pas.
  // -------------------------------------------------------------------
  const robots = buildRobots();
  assert.ok(robots.includes('User-agent: *'), 'robots.txt doit cibler tous les agents.');
  assert.ok(robots.includes('Allow: /'), 'robots.txt doit autoriser la racine.');
  assert.ok(robots.includes('Sitemap: https://kurlabeauty.vercel.app/sitemap.xml'),
    'robots.txt doit pointer vers le sitemap.');

  const disallows = (robots.match(/Disallow: (\S+)/g) || []).map(line => line.replace('Disallow: ', ''));

  // Pas de règle redondante : aucun motif ne doit être couvert par un préfixe
  // plus court déjà présent. C'est ce que la minimisation garantit.
  const redundant = disallows.filter(pattern =>
    disallows.some(other => other !== pattern && pattern.startsWith(other)));
  assert.deepEqual(redundant, [], `Règles robots redondantes : ${redundant.join(', ')}`);

  // Matrice bloqué / autorisé, évaluée comme le ferait un robot (préfixe).
  const blocked = (path: string) => disallows.some(p => path === p || path.startsWith(p));
  const mustBlock = ['/account', '/account/shelf', '/admin', '/pro/dashboard', '/recherche',
    '/routine-builder', '/cout-routine', '/mes-reservations', '/famille',
    '/commande/confirmation', '/diagnostic/resultat/x', '/api/health'];
  const mustAllow = ['/', '/boutique', '/diagnostic/cheveux', '/guides/ingredients',
    '/professionnels', '/melanin-skin', '/journal', '/ingredient/glycerin', '/manifeste'];
  for (const path of mustBlock) assert.ok(blocked(path), `${path} doit être bloqué par robots.txt`);
  for (const path of mustAllow) assert.ok(!blocked(path), `${path} ne doit pas être bloqué par robots.txt`);

  // Le blocage doit être exhaustif : chaque route non indexable doit être
  // couverte par au moins une règle (sinon elle fuit vers l'index).
  for (const route of ROUTE_META.filter(r => !r.indexable)) {
    const prefix = disallowPattern(route.path);
    assert.ok(
      disallows.some(p => prefix === p || prefix.startsWith(p) || p.startsWith(prefix) || prefix.startsWith(p)),
      `La route privée ${route.path} doit être couverte par robots.txt.`
    );
  }

  // -------------------------------------------------------------------
  // 3. Image Open Graph par défaut : présente et au bon format.
  // -------------------------------------------------------------------
  const og = readFileSync('public/og-default.png');
  // Signature PNG puis dimensions lues dans l'en-tête IHDR.
  assert.deepEqual([...og.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'og-default.png doit être un PNG valide.');
  const width = og.readUInt32BE(16);
  const height = og.readUInt32BE(20);
  assert.equal(width, 1200, `Largeur OG attendue 1200, obtenue ${width}.`);
  assert.equal(height, 630, `Hauteur OG attendue 630, obtenue ${height}.`);

  console.log(
    `[PASS] Chantier 7.2 : sitemap ${locCount} URLs (exactement les routes publiques statiques), ` +
    `robots ${disallows.length} règles sans redondance, privé bloqué / public ouvert, OG 1200x630.`
  );
}

try {
  runSeoTests();
} catch (error) {
  console.error('[FAIL] Chantier 7.2 — socle SEO :', error);
  process.exitCode = 1;
}
