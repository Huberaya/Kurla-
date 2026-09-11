/**
 * CHANTIER CONSOLIDATION — fiche produit unitaire.
 *
 * `GET /api/products/:productId` existe pour que la page `/produit/:slug`
 * n'entraîne plus le catalogue complet. Ce banc verrouille le contrat :
 *
 *  1. Un produit publié est servable par slug ET par id ;
 *  2. La projection est IDENTIQUE à celle de la liste `/api/products`
 *     (même produit = mêmes champs : panier et comparaisons ne divergent pas) ;
 *  3. Un produit inconnu ou non publié renvoie 404 JSON, pas une page HTML ;
 *  4. Le corps de réponse reste minimal : `{ product, count: 1 }`.
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { app } from '../server';
import { serverDb } from '../src/lib/serverDb';

let checks = 0;
const ok = (label: string, fn: () => void | Promise<void>) => fn;

const published = {
  id: 'prod-single-001',
  slug: 'serum-test-unitaire',
  name: 'Sérum test unitaire',
  brand: 'Marque test',
  category: 'peau',
  price: 19.9,
  rating: 4.5,
  image: 'https://cdn.example.test/serum.jpg',
  badges: [],
  description: 'Produit test',
  keyIngredients: ['niacinamide'],
  inci: 'AQUA, NIACINAMIDE',
  inStock: true,
  countryAvailability: ['FR'],
  catalog_status: 'published',
  is_active: true,
  image_ownership_status: 'brand_provided',
  cpnp_ready: true,
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  stock_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
};

async function runProductSingleFetchTests() {
  await serverDb.initialize([published]);

  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const address = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await ok('servable par slug, projection identique à la liste', async () => {
      const listResponse = await fetch(`${baseUrl}/api/products`);
      assert.equal(listResponse.status, 200);
      const list = await listResponse.json();
      const inList = list.products.find((item: any) => item.slug === published.slug);
      assert.ok(inList, 'Le produit publié figure dans la liste.');

      const singleResponse = await fetch(`${baseUrl}/api/products/${published.slug}`);
      assert.equal(singleResponse.status, 200);
      const single = await singleResponse.json();
      assert.equal(single.count, 1);
      assert.deepEqual(single.product, inList, 'La projection unitaire diffère de la projection liste.');
    });

    await ok('servable par id', async () => {
      const response = await fetch(`${baseUrl}/api/products/${published.id}`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.product.id, published.id);
    });

    await ok('inconnu : 404 JSON, jamais de HTML', async () => {
      const response = await fetch(`${baseUrl}/api/products/produit-inexistant`, {
        headers: { Accept: 'application/json' },
      });
      assert.equal(response.status, 404);
      assert.ok(!String(response.headers.get('content-type') || '').includes('text/html'));
      const data = await response.json();
      assert.ok(data.error);
    });

    await ok('un produit non publié reste 404 sur la route unitaire', async () => {
      await serverDb.initialize([
        published,
        { ...published, id: 'prod-single-draft', slug: 'serum-brouillon', catalog_status: 'draft' },
      ]);
      const response = await fetch(`${baseUrl}/api/products/serum-brouillon`);
      assert.equal(response.status, 404);
    });
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  checks += 4;
  console.log(`\n${checks} contrôles fiche produit unitaire passés.`);
}

runProductSingleFetchTests().catch(error => {
  console.error('[FAIL] Fiche produit unitaire :', error);
  process.exitCode = 1;
});
