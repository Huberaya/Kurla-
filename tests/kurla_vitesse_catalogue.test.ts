/**
 * Vitesse du catalogue (14/09/2026) — une lecture, deux usages.
 * =============================================================
 *
 * Mesuré le 14/09/2026 sur la production : `/api/products` répondait en 0,67 à
 * 0,99 seconde. Le poids n'était pas en cause (tout est déjà servi en Brotli :
 * 297 Ko de HTML pour 31 Ko transférés) — c'était le temps serveur, et
 * précisément deux défauts de lecture :
 *
 *   1. `getProducts` enchaînait cinq `await` séquentiels ;
 *   2. `/api/products` chargeait le catalogue DEUX fois (`getPublicProducts`
 *      pour la liste, `getProducts` pour les devis de kits).
 *
 * Le gain de vitesse se mesure en production, pas ici. Ce banc verrouille ce
 * que le gain ne doit **pas** coûter : la projection servie doit rester
 * strictement identique, et les deux règles du catalogue doivent survivre au
 * partage de la lecture —
 *
 *   1. hors mode test, aucune fiche test n'est servie ;
 *   2. une fiche test n'entre JAMAIS dans le catalogue qui chiffre les devis
 *      de kits, y compris en mode test (elle n'a pas de prix KURLA) ;
 *   3. la liste publique du mode test reste ce qu'elle était.
 *
 * Sans ce banc, « une seule lecture » est une régression silencieuse qui
 * attend son premier devis faux.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.KURLA_TEST_NO_SERVER = 'true';

const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');

const REEL_1 = 'vit-reel-001';
const REEL_2 = 'vit-reel-002';
const BROUILLON = 'vit-reel-003';
const TEST_1 = 'vit-test-001';

/** Les huit vérifications qu'exige la porte de publication réelle. */
const VERIFICATIONS = {
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  image_ownership_status: 'brand_provided'
};

function fiche(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    slug: id,
    title: `Produit ${id}`,
    name: `Produit ${id}`,
    brand: 'KURLA Botanicals',
    category: 'peau',
    subcategory: 'serum',
    price: 19.9,
    in_stock: true,
    stock_quantity: 5,
    image: `https://images.example.org/${id}.jpg`,
    image_url: `https://images.example.org/${id}.jpg`,
    country_availability: ['FR'],
    is_active: true,
    catalog_status: 'published',
    ingredients: ['Glycerin'],
    inci: 'Aqua, Glycerin',
    ...VERIFICATIONS,
    is_test_listing: false,
    ...extra
  };
}

serverDb.inMemoryProducts = [
  fiche(REEL_1),
  fiche(REEL_2),
  // Brouillon : publiable mais pas publié — jamais servi.
  fiche(BROUILLON, { catalog_status: 'draft' }),
  // Fiche test : drapeau test + publiée + active + marque + visuel. Elle passe
  // la porte test, jamais la porte réelle (aucune preuve validée).
  fiche(TEST_1, {
    is_test_listing: true,
    test_listing_note: 'Fiche de revue interne',
    ...VERIFICATIONS,
    ingredient_verification_status: 'not_provided',
    claims_validation_status: 'not_provided',
    image_ownership_status: 'unverified'
  })
] as never[];

async function requestApp(path: string) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const port = (listener.address() as AddressInfo).port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: response.status, cacheControl: response.headers.get('cache-control'), json: await response.json() };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

// ---------------------------------------------------------------------------
// 1. Hors mode test : la projection servie est exactement celle d'avant.
// ---------------------------------------------------------------------------
{
  const { produitsPublics, catalogue } = await serverDb.lireCataloguePublic();

  assert.deepEqual(
    produitsPublics,
    await serverDb.getPublicProducts(),
    'la liste publique doit être identique à ce que rendait getPublicProducts()'
  );
  assert.deepEqual(
    catalogue,
    await serverDb.getProducts({ publishedOnly: true }),
    'le catalogue des devis doit être identique à ce que rendait getProducts()'
  );

  const ids = produitsPublics.map((produit: any) => produit.id).sort();
  assert.deepEqual(ids, [REEL_1, REEL_2].sort(), 'ni le brouillon ni la fiche test ne sont servis');
}

// ---------------------------------------------------------------------------
// 2. Mode test : la liste s'élargit, le catalogue des devis ne bouge pas.
// ---------------------------------------------------------------------------
{
  const { produitsPublics, catalogue } = await serverDb.lireCataloguePublic({ testListings: true });
  const catalogueStrict = await serverDb.getProducts({ publishedOnly: true });

  assert.deepEqual(
    produitsPublics,
    await serverDb.getPublicProducts({ testListings: true }),
    'la liste publique du mode test doit être identique à ce qu’elle était'
  );
  assert.deepEqual(
    catalogue,
    catalogueStrict,
    'les devis de kits restent calculés sur le catalogue strict, même en mode test'
  );

  assert.ok(
    produitsPublics.some((produit: any) => produit.id === TEST_1),
    'le mode test montre la fiche test'
  );
  assert.equal(
    catalogue.some((produit: any) => produit.id === TEST_1),
    false,
    'une fiche test ne doit jamais entrer dans un devis de kit'
  );
}

// ---------------------------------------------------------------------------
// 3. La route : en-tête de cache en public, rien en mode test.
// ---------------------------------------------------------------------------
{
  const publique = await requestApp('/api/products');
  assert.equal(publique.status, 200);
  assert.equal(publique.json.count, 2, 'la route sert les deux fiches réelles publiées');
  assert.equal(publique.json.testMode, false);
  assert.match(
    publique.cacheControl ?? '',
    /s-maxage=60/,
    'le catalogue est mis en cache une minute : il change quelques fois par jour, pas à chaque seconde'
  );
  assert.match(publique.cacheControl ?? '', /stale-while-revalidate=300/);

  const testRoute = await requestApp('/api/products?test=1');
  assert.equal(testRoute.status, 200);
  assert.equal(testRoute.json.testMode, true);
  assert.equal(testRoute.json.count, 3, 'le mode test ajoute la fiche test');
  assert.equal(
    testRoute.cacheControl,
    null,
    'une réponse de mode test n’est pas publique : elle n’est jamais mise en cache'
  );
}
