import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 10 (bloc B2) — banc « la publication veut dire quelque chose ».
 *
 * Avant : `isPublishableProduct` filtrait l'affichage, mais rien n'empêchait de
 * passer un produit à `published` sans la moindre vérification — le statut
 * mentait, et il sert de condition dans des politiques en base.
 *
 * Ce banc vérifie :
 *  1. un produit incomplet ne peut PAS passer à `published`, et le refus nomme
 *     ce qui manque ;
 *  2. un produit complet passe, et devient réellement visible ;
 *  3. les autres statuts (brouillon, en revue, indisponible) restent libres —
 *     la porte ne porte que sur la publication ;
 *  4. le rapport distingue « statut publié » et « réellement listable ».
 */

const INCOMPLETE = 'p-incomplet';
const COMPLETE = 'p-complet';
const LYING = 'p-statut-menteur';

function verified(extra: Record<string, unknown> = {}) {
  return {
    is_active: true,
    catalog_status: 'draft',
    ingredient_verification_status: 'verified',
    claims_validation_status: 'verified',
    images_validation_status: 'verified',
    stock_validation_status: 'verified',
    certifications_validation_status: 'verified',
    translations_validation_status: 'verified',
    brand_verification_status: 'verified',
    image_ownership_status: 'brand_provided',
    brand: 'KURLA Botanicals',
    ingredients: ['Glycerin', 'Niacinamide'],
    image: 'https://images.example.org/produit.jpg',
    country_availability: ['FR', 'BE'],
    price: 18.9,
    ...extra
  };
}

async function runCatalogPublicationTests(): Promise<void> {
  serverDb.inMemoryProducts = [
    verified({ id: INCOMPLETE, slug: 'incomplet', title: 'Produit incomplet', claims_validation_status: 'not_provided', certifications_validation_status: 'pending', image_ownership_status: 'unknown', country_availability: [] }),
    verified({ id: COMPLETE, slug: 'complet', title: 'Produit complet' }),
    verified({ id: LYING, slug: 'menteur', title: 'Publié sans vérification', catalog_status: 'published', claims_validation_status: 'not_provided' })
  ] as never[];

  // ---------------------------------------------------------------------
  // 1. Refus nominatif.
  // ---------------------------------------------------------------------
  const readiness = await serverDb.getCatalogPublicationReadiness(INCOMPLETE);
  assert.equal(readiness.ready, false);
  const labels = readiness.missing.map(item => item.label).join(' | ');
  assert.match(labels, /allégations non vérifié/);
  assert.match(labels, /certifications non vérifié/);
  assert.match(labels, /droits sur les visuels non établis/);
  assert.match(labels, /aucun marché renseigné/);

  await assert.rejects(
    () => serverDb.updateCatalogStatus(INCOMPLETE, 'published'),
    /Publication refusée/
  );
  const stillDraft = serverDb.inMemoryProducts.find((item: any) => item.id === INCOMPLETE);
  assert.equal(stillDraft.catalog_status, 'draft', 'un refus ne doit pas modifier le statut');

  // ---------------------------------------------------------------------
  // 2. Un produit complet passe et devient visible.
  // ---------------------------------------------------------------------
  const completeReadiness = await serverDb.getCatalogPublicationReadiness(COMPLETE);
  assert.deepEqual(completeReadiness.missing, []);
  assert.equal(completeReadiness.ready, true);

  await serverDb.updateCatalogStatus(COMPLETE, 'published');
  const published = serverDb.inMemoryProducts.find((item: any) => item.id === COMPLETE);
  assert.equal(published.catalog_status, 'published');

  const publicProducts = await serverDb.getPublicProducts();
  assert.ok(publicProducts.some((product: any) => product.id === COMPLETE), 'le produit complet doit être réellement listable');
  assert.equal(publicProducts.some((product: any) => product.id === LYING), false, 'un statut publié sans vérification ne rend pas le produit visible');

  // ---------------------------------------------------------------------
  // 3. Les autres transitions restent libres.
  // ---------------------------------------------------------------------
  await serverDb.updateCatalogStatus(INCOMPLETE, 'pending_review');
  assert.equal(stillDraft.catalog_status, 'pending_review');
  await serverDb.updateCatalogStatus(COMPLETE, 'unavailable');
  assert.equal(published.catalog_status, 'unavailable');
  await serverDb.updateCatalogStatus(COMPLETE, 'draft');
  assert.equal(published.catalog_status, 'draft');

  // ---------------------------------------------------------------------
  // 4. Le rapport distingue le statut de la réalité.
  // ---------------------------------------------------------------------
  await serverDb.updateCatalogStatus(COMPLETE, 'published');
  const report = await serverDb.getCatalogPublicationReadinessReport();
  assert.equal(report.products, 3);
  assert.equal(report.publishedStatus, 2, 'COMPLETE et LYING portent le statut published');
  assert.equal(report.readyToPublish, 1, 'seul COMPLETE satisfait les exigences');
  assert.equal(report.publishedButNotListable, 1, 'LYING est publié sans être listable');
  const lying = report.perProduct.find(entry => entry.productId === LYING);
  assert.ok(lying && lying.missing.length > 0);

  // ---------------------------------------------------------------------
  // 5. Les routes d'état restent fermées au public.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const globalReport = await fetch(`${baseUrl}/api/admin/catalog/publication-readiness`, {
      headers: { 'x-user-id': 'attacker', 'x-admin-key': 'forged' }
    });
    assert.equal(globalReport.status, 401);

    const productReport = await fetch(`${baseUrl}/api/admin/catalog/${COMPLETE}/readiness`);
    assert.equal(productReport.status, 401);

    const statusChange = await fetch(`${baseUrl}/api/admin/catalog/${INCOMPLETE}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'published' })
    });
    assert.equal(statusChange.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Publication catalogue banc : refus nominatif, produit complet réellement visible, rapport fidèle, routes fermées.');
}

runCatalogPublicationTests().catch(error => {
  console.error('[FAIL] Publication catalogue banc :', error);
  process.exitCode = 1;
});
