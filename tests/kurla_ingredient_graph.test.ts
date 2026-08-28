import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 10 (bloc B1) — banc « alimentation du graphe d'ingrédients ».
 *
 * Le graphe était lu partout et écrit nulle part. Ce banc vérifie la couche
 * d'écriture sur quatre points :
 *  1. une mention déclarée qui correspond au référentiel est rattachée, avec
 *     son rang et sa provenance ;
 *  2. une mention sans correspondance est **rendue**, jamais devinée ;
 *  3. l'opération est idempotente — relancer ne duplique pas les liaisons ;
 *  4. la couverture annoncée correspond à ce qui est réellement en base, et
 *     les routes d'alimentation restent fermées au public.
 */

const PRODUCT = 'p-graphe';
const NEIGHBOUR = 'p-voisin';

function seed(): void {
  serverDb.inMemoryIngredients = [
    { id: 'glycerin', inci_name: 'Glycerin', inci_name_normalized: 'glycerin', common_names: ['glycérine', 'glycérine végétale'], functions: ['humectant'], verification_status: 'verified' },
    { id: 'niacinamide', inci_name: 'Niacinamide', inci_name_normalized: 'niacinamide', common_names: ['vitamine B3'], functions: ['brightening'], verification_status: 'verified' },
    { id: 'parfum', inci_name: 'Parfum (Fragrance)', inci_name_normalized: 'parfum fragrance', common_names: ['parfum', 'fragrance'], functions: ['fragrance'], is_fragrance: true, verification_status: 'verified' }
  ] as never[];

  serverDb.inMemoryProducts = [
    {
      id: PRODUCT,
      slug: 'serum-test',
      title: 'Sérum d’essai',
      brand: 'KURLA Botanicals',
      ingredients: ['Glycérine Végétale', 'Vitamine B3', 'Extrait de Lotus Inconnu', 'Parfum'],
      ingredient_verification_status: 'not_provided',
      catalog_status: 'draft'
    },
    {
      id: NEIGHBOUR,
      slug: 'voisin',
      title: 'Produit voisin sans composition',
      brand: 'KURLA Botanicals',
      ingredients: [],
      ingredient_verification_status: 'not_provided',
      catalog_status: 'draft'
    }
  ] as never[];

  serverDb.inMemoryProductIngredients = [];
}

async function runIngredientGraphTests(): Promise<void> {
  seed();

  // ---------------------------------------------------------------------
  // 1. Alimentation depuis la liste déclarée.
  // ---------------------------------------------------------------------
  const result = await serverDb.linkDeclaredIngredients(PRODUCT);
  assert.equal(result.productId, PRODUCT);
  assert.equal(result.links.length, 3);
  assert.equal(result.complete, false, 'une mention sans correspondance empêche l’état « complet »');
  assert.deepEqual(result.rejected.map(item => item.declared), ['Extrait de Lotus Inconnu']);

  const links = await serverDb.getProductIngredientLinks(PRODUCT);
  assert.equal(links.length, 3);
  assert.equal(links[0].ingredientId, 'glycerin');
  assert.equal(links[0].inciRank, 1, 'le rang suit l’ordre déclaré, qui est l’ordre de concentration');
  assert.equal(links[0].source, 'declared');
  assert.equal(links[0].isKeyIngredient, true);
  assert.equal(links[1].ingredientId, 'niacinamide', 'l’alias « Vitamine B3 » doit résoudre via common_names');
  assert.equal(links[2].ingredientId, 'parfum');

  // Aucune liaison inventée pour la mention inconnue.
  assert.equal(links.some(link => link.ingredientId.includes('lotus')), false);

  // Le statut de vérification progresse honnêtement : déclaré ≠ vérifié.
  const product = serverDb.inMemoryProducts.find((item: any) => item.id === PRODUCT);
  assert.equal(product.ingredient_verification_status, 'pending');

  // ---------------------------------------------------------------------
  // 2. Idempotence : relancer ne duplique rien.
  // ---------------------------------------------------------------------
  serverDb.inMemoryProductIngredients = [];
  await serverDb.linkDeclaredIngredients(PRODUCT);
  const again = await serverDb.linkDeclaredIngredients(PRODUCT);
  assert.equal(again.links.length, 3);
  assert.equal((await serverDb.getProductIngredientLinks(PRODUCT)).length, 3);

  // ---------------------------------------------------------------------
  // 3. Rattachement explicite : identifiant connu, identifiant faux.
  // ---------------------------------------------------------------------
  const explicit = await serverDb.attachProductIngredients('admin-1', NEIGHBOUR, [
    { ingredientId: 'glycerin', inciRank: 1, declaredRole: 'humectant', isKeyIngredient: true, source: 'inci_label' },
    { ingredientId: 'introuvable', declared: 'Huile de Licorne' },
    { declared: 'Niacinamide', source: 'brand_confirmed' }
  ]);
  assert.equal(explicit.links.length, 2);
  assert.equal(explicit.rejected.length, 1);
  assert.equal(explicit.rejected[0].declared, 'Huile de Licorne');
  assert.match(explicit.rejected[0].reason, /Aucun ingrédient du référentiel/);
  assert.equal(explicit.complete, false);

  const neighbourLinks = await serverDb.getProductIngredientLinks(NEIGHBOUR);
  assert.equal(neighbourLinks.length, 2);
  assert.equal(neighbourLinks[0].source, 'inci_label', 'la provenance déclarée par l’opérateur est conservée');
  assert.equal(neighbourLinks[1].source, 'brand_confirmed');

  // ---------------------------------------------------------------------
  // 4. Couverture réelle + routes fermées au public.
  // ---------------------------------------------------------------------
  const coverage = await serverDb.getIngredientGraphCoverage();
  assert.equal(coverage.products, 2);
  assert.equal(coverage.productsWithLinkedIngredients, 2);
  assert.equal(coverage.links, 5);
  assert.equal(coverage.ingredientsInCatalog, 3);
  assert.equal(coverage.coveragePercent, 100);

  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const attach = await fetch(`${baseUrl}/api/admin/catalog/${PRODUCT}/ingredients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'attacker', 'x-admin-key': 'forged' },
      body: JSON.stringify({ ingredients: [{ ingredientId: 'glycerin' }] })
    });
    assert.equal(attach.status, 401);

    const batch = await fetch(`${baseUrl}/api/admin/catalog/ingredients/link-declared`, { method: 'POST' });
    assert.equal(batch.status, 401);

    const coverageRoute = await fetch(`${baseUrl}/api/admin/catalog/ingredient-coverage`);
    assert.equal(coverageRoute.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Graphe d’ingrédients banc : liaisons tracées, aucune correspondance devinée, idempotent, routes fermées au public.');
}

runIngredientGraphTests().catch(error => {
  console.error('[FAIL] Graphe d’ingrédients banc :', error);
  process.exitCode = 1;
});
