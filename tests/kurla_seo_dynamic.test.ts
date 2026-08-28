import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';

import { applySeoHead, matchKnownRoute, stripSeoTags } from '../src/lib/seoHead';
import { renderSpaDocument, resetShellCache } from '../src/server/seoResolver';
import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 13 — banc « SEO des pages dynamiques ».
 *
 * Deux défauts vérifiés en production avant d'écrire ce code :
 *   * `/produit/ce-produit-n-existe-pas` → **HTTP 200** (soft 404) ;
 *   * `dist/boutique/index.html` portait **3 balises canoniques**, les deux
 *     premières pointant sur l'accueil, parce que le prérendu ajoutait ses
 *     balises sans retirer les précédentes.
 *
 * Le banc vérifie la correction des deux, sur le code livré.
 */

const SHELL = `<html lang="fr"><head>
    <title>Coquille</title>
    <meta name="description" content="Coquille" />
  </head><body><div id="root"></div></body></html>`;

async function runSeoTests(): Promise<void> {
  /**
   * L'import du serveur est fait en premier, volontairement : il réinitialise
   * les collections en mémoire. Semer avant cet import reviendrait à tester sur
   * un catalogue vidé — vérifié le 28/08/2026, c'est exactement ce qui faisait
   * échouer ce banc.
   */
  const { app } = await import('../server');
  const { mountSpaFallback } = await import('../src/server/spaFallback');

  // ---------------------------------------------------------------------
  // 1. Idempotence : appliquer deux fois ne produit qu'une canonique.
  // ---------------------------------------------------------------------
  const once = applySeoHead(SHELL, { title: 'Boutique', description: 'Catalogue', canonical: 'https://x.test/boutique' });
  const twice = applySeoHead(once, { title: 'Manifeste', description: 'Nos engagements', canonical: 'https://x.test/manifeste' });

  assert.equal(once.match(/rel="canonical"/g)?.length, 1, 'une application doit produire exactement une canonique');
  assert.equal(twice.match(/rel="canonical"/g)?.length, 1, 'deux applications successives ne doivent pas empiler les canoniques');
  assert.match(twice, /rel="canonical" href="https:\/\/x\.test\/manifeste"/, 'la canonique conservée est la dernière appliquée');
  assert.equal(twice.match(/<title>/g)?.length, 1, 'un seul titre');
  assert.match(twice, /<title>Manifeste<\/title>/);
  assert.equal(twice.match(/property="og:title"/g)?.length, 1, 'un seul og:title');
  assert.doesNotMatch(twice, /Coquille/, 'les métadonnées de la coquille ne survivent pas');

  // stripSeoTags retire tout ce que le module pose, et ne touche pas au reste.
  const stripped = stripSeoTags(twice);
  assert.doesNotMatch(stripped, /rel="canonical"|property="og:|application\/ld\+json|name="robots"/);
  assert.match(stripped, /<div id="root">/, 'le corps du document est intact');

  // Échappement : une donnée ne peut pas fermer le bloc JSON-LD.
  const injected = applySeoHead(SHELL, {
    title: 'Piège',
    description: 'x',
    canonical: 'https://x.test/piege',
    jsonLd: { note: '</script><script>alert(1)</script>' }
  });
  assert.doesNotMatch(injected, /<\/script><script>alert/, 'une donnée ne doit pas pouvoir injecter une balise');
  // Seul `<` est échappé, ce qui suffit : la séquence dangereuse `</script` ne
  // peut plus apparaître dans le bloc.
  assert.match(injected, /\\u003c\/script>/, 'le « < » de la donnée est échappé');
  assert.doesNotMatch(injected, /<\/script><script>/, 'aucune balise ne survit dans la donnée');

  // ---------------------------------------------------------------------
  // 2. Reconnaissance des chemins : la condition du 404 franc.
  // ---------------------------------------------------------------------
  assert.ok(matchKnownRoute('/boutique'), 'une route statique connue est reconnue');
  assert.ok(matchKnownRoute('/boutique/'), 'un slash final ne change rien');
  const productMatch = matchKnownRoute('/produit/leave-in-hydratant');
  assert.ok(productMatch, 'une fiche produit est une route connue');
  assert.equal(productMatch!.params.slug, 'leave-in-hydratant');
  assert.equal(matchKnownRoute('/page-qui-n-existe-pas'), null, 'un chemin inconnu n’est pas reconnu');
  assert.equal(matchKnownRoute('/api/whatever'), null);

  // ---------------------------------------------------------------------
  // 3. Rendu serveur : 404 franc, entité réelle, page privée.
  // ---------------------------------------------------------------------
  // Un produit n'est exposé au référencement que s'il est réellement publiable :
  // la fixture porte donc tous les statuts de vérification exigés par
  // `isPublishableProduct`, comme en production.
  serverDb.inMemoryProducts = [
    {
      id: 'p-1',
      slug: 'leave-in-hydratant',
      name: 'Leave-in Hydratant',
      description: 'Hydratation des boucles 4C.',
      brand: 'KURLA Botanicals',
      price: 24,
      is_active: true,
      catalog_status: 'published',
      ingredient_verification_status: 'verified',
      claims_validation_status: 'verified',
      images_validation_status: 'verified',
      stock_validation_status: 'verified',
      certifications_validation_status: 'verified',
      translations_validation_status: 'verified',
      brand_verification_status: 'verified',
      image_ownership_status: 'brand_provided',
      ingredients: ['Glycerin', 'Niacinamide'],
      image: 'https://images.example.org/leave-in.jpg',
      country_availability: ['FR', 'BE']
    },
    // Publié en apparence mais non vérifié : il ne doit PAS être référençable.
    {
      id: 'p-2',
      slug: 'produit-non-verifie',
      name: 'Produit non vérifié',
      brand: 'KURLA Botanicals',
      price: 12,
      is_active: true,
      catalog_status: 'published',
      claims_validation_status: 'not_provided',
      ingredients: ['Glycerin'],
      image: 'https://images.example.org/x.jpg',
      country_availability: ['FR']
    }
  ] as never[];
  serverDb.inMemoryIngredients = [
    { id: 'glycerin', inci_name: 'Glycerin', description: 'Humectant.', verification_status: 'verified' }
  ] as never[];

  const distPath = 'dist';
  resetShellCache();

  const unknown = await renderSpaDocument('/page-qui-n-existe-pas', distPath);
  assert.equal(unknown.status, 404, 'un chemin inconnu doit répondre 404, pas 200');
  assert.match(unknown.html, /name="robots" content="noindex, nofollow"/, 'une page introuvable n’est pas indexable');
  assert.match(unknown.html, /<title>Page introuvable/);

  const missingProduct = await renderSpaDocument('/produit/ce-produit-n-existe-pas', distPath);
  assert.equal(missingProduct.status, 404, 'une fiche produit inexistante est un 404, pas un soft 404');
  assert.match(missingProduct.html, /noindex/);

  const product = await renderSpaDocument('/produit/leave-in-hydratant', distPath);
  assert.equal(product.status, 200);
  assert.match(product.html, /<title>Leave-in Hydratant \| KURLA Beauty<\/title>/, 'la fiche porte son propre titre');
  assert.match(product.html, /rel="canonical" href="[^"]*\/produit\/leave-in-hydratant"/, 'la canonique pointe sur la fiche, pas sur l’accueil');
  assert.equal(product.html.match(/rel="canonical"/g)?.length, 1);
  assert.match(product.html, /"@type":"Product"/, 'le JSON-LD déclare un produit');
  assert.match(product.html, /<h1>Leave-in Hydratant/, 'une amorce de contenu lisible sans JavaScript');

  const unpublished = await renderSpaDocument('/produit/produit-non-verifie', distPath);
  assert.equal(unpublished.status, 404, 'un produit non publiable ne doit pas être référençable');

  const ingredient = await renderSpaDocument('/ingredient/glycerin', distPath);
  assert.equal(ingredient.status, 200);
  assert.match(ingredient.html, /Glycerin : fiche ingrédient/);

  const missingIngredient = await renderSpaDocument('/ingredient/inexistant', distPath);
  assert.equal(missingIngredient.status, 404);

  // Une page privée connue reste servie : ce n'est pas une erreur.
  const privatePage = await renderSpaDocument('/account', distPath);
  assert.equal(privatePage.status, 200, 'une route connue mais non prérendue reste servie');

  // ---------------------------------------------------------------------
  // 4. De bout en bout, à travers l'application.
  // ---------------------------------------------------------------------
  // Le repli SPA est monté explicitement : c'est lui que l'on teste, pas le 404
  // par défaut d'Express.
  mountSpaFallback(app, distPath);
  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const unknownRoute = await fetch(`${baseUrl}/page-qui-n-existe-pas`);
    assert.equal(unknownRoute.status, 404, 'HTTP : un chemin inconnu répond 404');
    const unknownBody = await unknownRoute.text();
    assert.match(unknownBody, /noindex/, 'le 404 servi est bien celui du repli SPA, pas celui d’Express');

    const productRoute = await fetch(`${baseUrl}/produit/leave-in-hydratant`);
    assert.equal(productRoute.status, 200);
    const html = await productRoute.text();
    assert.match(html, /Leave-in Hydratant/);

    // Un chemin d'API inconnu ouvert dans un navigateur reçoit une page 404,
    // pas du JSON : c'est ce que produit la réécriture Vercel.
    const apiAsPage = await fetch(`${baseUrl}/api/route-inconnue`, { headers: { accept: 'text/html,application/xhtml+xml' } });
    assert.equal(apiAsPage.status, 404);
    const apiAsPageBody = await apiAsPage.text();
    assert.match(apiAsPageBody, /noindex/, 'une navigation vers un chemin inconnu reçoit la page 404');
    assert.match(apiAsPage.headers.get('content-type') || '', /text\/html/);

    const apiStillJson = await fetch(`${baseUrl}/api/route-inconnue`, { headers: { accept: 'application/json' } });
    assert.equal(apiStillJson.status, 404);
    assert.match(apiStillJson.headers.get('content-type') || '', /application\/json/, 'le 404 API reste du JSON');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  // ---------------------------------------------------------------------
  // 5. En mode serverless, le serveur monte le repli tout seul.
  //    C'est le défaut qui faisait répondre 200 en production : le montage
  //    vivait dans startServer(), que Vercel n'appelle jamais.
  // ---------------------------------------------------------------------
  const probe = execFileSync('npx', ['tsx', 'tests/support/serverless_probe.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, KURLA_STORE_MODE: 'memory', KURLA_SERVERLESS: 'true' },
    encoding: 'utf8'
  });
  assert.match(probe, /STATUS:404/, `en mode serverless, un chemin inconnu doit répondre 404 — reçu : ${probe.trim()}`);
  assert.match(probe, /NOINDEX:oui/, 'le 404 serverless porte bien noindex');

  console.log('[PASS] SEO banc : tête appliquée sans doublon, fiche produit avec sa canonique et son JSON-LD, chemin inconnu en 404 franc.');
}

runSeoTests().catch(error => {
  console.error('[FAIL] SEO banc :', error);
  process.exitCode = 1;
});
