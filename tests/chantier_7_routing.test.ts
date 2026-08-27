/**
 * CHANTIER 7 — SEO, SSR & internationalisation.
 * Sous-chantier 7.1 : routeur déclaratif et table de métadonnées.
 *
 * Ce banc ne vérifie pas le rendu visuel — il vérifie que le remplacement de la
 * cascade de `if (pathname === ...)` par une table déclarative n'a rien perdu et
 * n'a rien cassé. Trois risques réels sont couverts :
 *
 * 1. **Régression** : une des 48 URLs historiques ne serait plus résolue. La
 *    liste est figée ci-dessous comme fixture, volontairement recopiée à la
 *    main depuis l'ancienne cascade : si elle était dérivée de la nouvelle
 *    table, le test ne pourrait pas détecter une perte.
 * 2. **Divergence** : une page ajoutée d'un seul côté — composant sans
 *    métadonnées, ou métadonnées sans composant. C'est le piège classique des
 *    sitemap générés à la main.
 * 3. **Priorité** : `/routines` doit rester la page liste et ne pas être
 *    absorbée par `/routines/:slug`. L'ancienne cascade garantissait cela par
 *    son ordre d'écriture ; la table doit le garantir explicitement.
 */
import { strict as assert } from 'node:assert';

import { ROUTE_META, matchRouteMeta, indexableRoutes, compilePathPattern } from '../src/lib/routeMeta';
import { ROUTES, resolveRoute, auditRouteTable } from '../src/lib/routeTable';

/**
 * Les 48 URLs que l'ancienne cascade de `App.tsx` traitait. Fixée à la main.
 * Toute valeur paramétrée utilise un exemple concret.
 */
const LEGACY_PATHS: string[] = [
  '/',
  '/assistant-beaute',
  '/diagnostic/cheveux',
  '/diagnostic/peau',
  '/diagnostic/enfant',
  '/diagnostic/protective-style',
  '/diagnostic/resultat/resultat-123',
  '/account',
  '/account/kurla-id',
  '/account/hair-id',
  '/account/skin-id',
  '/account/routine-id',
  '/account/routine-tracker',
  '/account/progress',
  '/account/shelf',
  '/account/wash-day',
  '/account/protective-timeline',
  '/account/saved',
  '/recherche',
  '/routine-builder',
  '/cout-routine',
  '/mes-reservations',
  '/famille',
  '/kids',
  '/protective-styles',
  '/melanin-skin',
  '/hommes',
  '/outils',
  '/guides/outils',
  '/guides/ingredients',
  '/community',
  '/boutique',
  '/produit/masque-karite-brut',
  '/ingredient/glycerin',
  '/pros-verifies',
  '/routines',
  '/routines/matinale-4c',
  '/professionnels',
  '/professionnels/rejoindre',
  '/professionnels/profil/aicha-diop',
  '/journal',
  '/journal/porosite-faible',
  '/pro/dashboard',
  '/admin',
  '/manifeste',
  '/cgv',
  '/confidentialite',
  '/commande/confirmation',
];

/** Les 18 URLs que l'ancienne cascade enrobait dans `<ProtectedRoute>`. */
const LEGACY_PROTECTED: string[] = [
  '/account',
  '/account/kurla-id',
  '/account/hair-id',
  '/account/skin-id',
  '/account/routine-id',
  '/account/routine-tracker',
  '/account/progress',
  '/account/shelf',
  '/account/wash-day',
  '/account/protective-timeline',
  '/account/saved',
  '/recherche',
  '/routine-builder',
  '/cout-routine',
  '/mes-reservations',
  '/famille',
  '/pro/dashboard',
  '/admin',
];

function runRoutingTests(): void {
  // -------------------------------------------------------------------
  // 1. Aucune régression : les 48 URLs historiques résolvent toujours.
  // -------------------------------------------------------------------
  const unresolved = LEGACY_PATHS.filter(path => resolveRoute(path) === null);
  assert.deepEqual(
    unresolved,
    [],
    `URLs historiques devenues non résolues : ${unresolved.join(', ')}`
  );

  // -------------------------------------------------------------------
  // 2. Aucune divergence entre composants et métadonnées.
  // -------------------------------------------------------------------
  const audit = auditRouteTable();
  assert.deepEqual(
    audit.missingComponent,
    [],
    `Routes ayant des métadonnées mais aucun composant : ${audit.missingComponent.join(', ')}`
  );
  assert.deepEqual(
    audit.missingMeta,
    [],
    `Routes ayant un composant mais aucune métadonnée : ${audit.missingMeta.join(', ')}`
  );

  // -------------------------------------------------------------------
  // 3. Unicité : pas de chemin déclaré deux fois.
  // -------------------------------------------------------------------
  const metaPaths = ROUTE_META.map(route => route.path);
  const duplicatedMeta = metaPaths.filter((path, index) => metaPaths.indexOf(path) !== index);
  assert.deepEqual(duplicatedMeta, [], `Chemins dupliqués dans ROUTE_META : ${duplicatedMeta.join(', ')}`);

  const entryPaths = ROUTES.map(entry => entry.path);
  const duplicatedEntries = entryPaths.filter((path, index) => entryPaths.indexOf(path) !== index);
  assert.deepEqual(duplicatedEntries, [], `Chemins dupliqués dans ROUTES : ${duplicatedEntries.join(', ')}`);

  // -------------------------------------------------------------------
  // 4. Recouvrement : un motif paramétré ne doit jamais pouvoir absorber une
  //    route statique déclarée plus bas dans le tableau.
  //
  //    C'est la seule situation où l'ordre du tableau change le comportement,
  //    puisque `:param` capture exactement un segment : `/routines` et
  //    `/routines/:slug` ne se recouvrent pas et leur ordre est sans effet.
  //    Le danger apparaît le jour où quelqu'un ajoute `/guides/:sujet` au-dessus
  //    de `/guides/ingredients` — la page statique deviendrait inaccessible.
  //    Le contrôle est donc portant sur l'avenir, pas sur l'état actuel.
  // -------------------------------------------------------------------
  const compiledPatterns = ROUTE_META.flatMap(route =>
    [route.path, ...(route.aliases || [])].map(pattern => ({
      routePath: route.path,
      pattern,
      parameterized: pattern.includes(':'),
      regex: compilePathPattern(pattern).regex,
    }))
  );
  const order = new Map<string, number>();
  ROUTE_META.forEach((route, index) => order.set(route.path, index));

  const shadowed: string[] = [];
  for (const absorber of compiledPatterns) {
    if (!absorber.parameterized) continue;
    for (const target of compiledPatterns) {
      if (target.parameterized) continue;
      if (!absorber.regex.test(target.pattern)) continue;
      // Le motif paramétré correspond au chemin statique : il ne gagne que s'il
      // est déclaré avant, et dans ce cas la page statique devient joignable
      // par aucune URL.
      if ((order.get(absorber.routePath) ?? 0) < (order.get(target.routePath) ?? 0)) {
        shadowed.push(`${absorber.pattern} masque ${target.pattern}`);
      }
    }
  }
  assert.deepEqual(shadowed, [], `Motifs paramétrés masquant une route statique : ${shadowed.join(', ')}`);

  // Les routes à un seul segment et leurs formes paramétrées doivent rester
  // distinguables : c'est ce qui garantit que `/routines` n'est pas absorbé.
  const priorityCases: Array<[string, string]> = [
    ['/routines', '/routines'],
    ['/routines/matinale-4c', '/routines/:slug'],
    ['/professionnels', '/professionnels'],
    ['/professionnels/rejoindre', '/professionnels/rejoindre'],
    ['/professionnels/profil/aicha-diop', '/professionnels/profil/:slug'],
    ['/journal', '/journal'],
    ['/journal/porosite-faible', '/journal/:slug'],
    ['/account', '/account'],
    ['/account/shelf', '/account/shelf'],
    ['/outils', '/outils'],
  ];
  for (const [pathname, expected] of priorityCases) {
    const resolved = resolveRoute(pathname);
    assert.ok(resolved, `${pathname} doit résoudre`);
    assert.equal(
      resolved.entry.path,
      expected,
      `${pathname} doit résoudre vers « ${expected} », obtenu « ${resolved.entry.path} »`
    );
  }

  // -------------------------------------------------------------------
  // 5. Extraction des paramètres.
  // -------------------------------------------------------------------
  assert.equal(resolveRoute('/produit/masque-karite-brut')?.params.slug, 'masque-karite-brut');
  assert.equal(resolveRoute('/ingredient/glycerin')?.params.ingredientId, 'glycerin');
  assert.equal(resolveRoute('/professionnels/profil/aicha-diop')?.params.slug, 'aicha-diop');
  assert.equal(resolveRoute('/diagnostic/resultat/resultat-123')?.params.resultId, 'resultat-123');
  // Un segment encodé doit arriver décodé au composant.
  assert.equal(resolveRoute('/produit/masque%20karite')?.params.slug, 'masque karite');

  // -------------------------------------------------------------------
  // 6. Alias : `/guides/outils` sert la page `/outils` et pointe vers elle
  //    comme canonique, sinon deux URLs concurrentes se partagent le rang.
  // -------------------------------------------------------------------
  const alias = resolveRoute('/guides/outils');
  assert.ok(alias, '/guides/outils doit résoudre');
  assert.equal(alias.entry.path, '/outils');
  assert.equal(alias.meta.canonicalPath, '/outils');
  assert.equal(alias.meta.isAlias, true);
  assert.equal(resolveRoute('/outils')?.meta.isAlias, false);

  // -------------------------------------------------------------------
  // 7. Authentification préservée : exactement les 18 URLs historiques.
  // -------------------------------------------------------------------
  const nowProtected = LEGACY_PATHS.filter(path => resolveRoute(path)?.entry.auth !== undefined);
  assert.deepEqual(
    [...nowProtected].sort(),
    [...LEGACY_PROTECTED].sort(),
    'L’ensemble des routes protégées a changé par rapport à l’ancienne cascade.'
  );

  // Les garde-fous par rôle doivent avoir survécu au passage en données.
  assert.deepEqual(resolveRoute('/pro/dashboard')?.entry.auth?.roles, ['professional', 'admin', 'superadmin']);
  assert.equal(resolveRoute('/pro/dashboard')?.entry.auth?.roleLabel, 'professionnel certifié');
  assert.deepEqual(resolveRoute('/admin')?.entry.auth?.roles, ['admin', 'superadmin']);
  assert.equal(resolveRoute('/admin')?.entry.auth?.roleLabel, 'administrateur');
  assert.equal(resolveRoute('/famille')?.entry.auth?.roleLabel, 'membre de KURLA');
  // `/famille` exige une session mais aucun rôle précis.
  assert.equal(resolveRoute('/famille')?.entry.auth?.roles, undefined);

  // -------------------------------------------------------------------
  // 8. Indexabilité : le privé ne doit jamais être référençable.
  // -------------------------------------------------------------------
  const mustNotBeIndexed = ROUTE_META.filter(route =>
    route.path === '/admin' ||
    route.path === '/pro/dashboard' ||
    route.path === '/commande/confirmation' ||
    route.path.startsWith('/account') ||
    route.path.startsWith('/diagnostic/resultat')
  );
  assert.ok(mustNotBeIndexed.length >= 15, 'Le jeu de routes privées semble incomplet.');
  const wronglyIndexed = mustNotBeIndexed.filter(route => route.indexable).map(route => route.path);
  assert.deepEqual(wronglyIndexed, [], `Routes privées déclarées indexables : ${wronglyIndexed.join(', ')}`);

  // Toute route protégée doit être non indexable : publier l'URL d'un espace
  // compte ne sert personne et expose une page vide au moteur.
  const protectedButIndexed = ROUTES
    .filter(entry => entry.auth && ROUTE_META.find(route => route.path === entry.path)?.indexable)
    .map(entry => entry.path);
  assert.deepEqual(protectedButIndexed, [], `Routes protégées mais indexables : ${protectedButIndexed.join(', ')}`);

  // Et l'inverse doit rester utile : le catalogue et le contenu sont publiables.
  const indexable = new Set(indexableRoutes().map(route => route.path));
  for (const expected of ['/boutique', '/produit/:slug', '/ingredient/:ingredientId', '/guides/ingredients', '/pros-verifies', '/journal/:slug', '/']) {
    assert.ok(indexable.has(expected), `${expected} devrait être indexable.`);
  }

  // -------------------------------------------------------------------
  // 9. Qualité des métadonnées : un moteur refuse ce qui est vide ou dupliqué.
  // -------------------------------------------------------------------
  for (const route of ROUTE_META) {
    assert.ok(route.title.trim().length > 0, `${route.path} : titre vide`);
    assert.ok(route.description.trim().length > 0, `${route.path} : description vide`);
    assert.ok(
      route.description.length <= 320,
      `${route.path} : description de ${route.description.length} caractères, au-delà de ce qu'un moteur affiche`
    );
    if (route.indexable) {
      assert.ok(route.changefreq, `${route.path} : une page indexable doit déclarer une fréquence de changement`);
      assert.ok(typeof route.priority === 'number', `${route.path} : une page indexable doit déclarer un poids sitemap`);
    }
  }

  // Deux pages ne doivent pas porter le même titre : c'est le signal le plus
  // courant d'une génération de métadonnées restée à l'état de gabarit.
  const titles = ROUTE_META.map(route => route.title);
  const duplicatedTitles = titles.filter((title, index) => titles.indexOf(title) !== index);
  assert.deepEqual(duplicatedTitles, [], `Titres dupliqués : ${duplicatedTitles.join(' | ')}`);

  // -------------------------------------------------------------------
  // 10. Une URL inconnue ne doit rien résoudre : c'est ce qui déclenche la 404.
  // -------------------------------------------------------------------
  assert.equal(resolveRoute('/ceci-nexiste-pas'), null);
  assert.equal(matchRouteMeta('/ceci-nexiste-pas'), null);
  // Un slash final ne doit pas casser la résolution.
  assert.equal(resolveRoute('/boutique/')?.entry.path, '/boutique');

  console.log(
    `[PASS] Chantier 7.1 : ${ROUTE_META.length} routes déclaratives, ${LEGACY_PATHS.length} URLs historiques toujours résolues, ` +
    `${indexableRoutes().length} indexables, ${LEGACY_PROTECTED.length} protégées, aucune divergence composant/métadonnées.`
  );
}

try {
  runRoutingTests();
} catch (error) {
  console.error('[FAIL] Chantier 7.1 — routeur déclaratif :', error);
  process.exitCode = 1;
}
