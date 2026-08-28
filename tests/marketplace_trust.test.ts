import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serverDb } from '../src/lib/serverDb';
import { MOCK_PRODUCTS } from '../src/data/mockData';
import { readServerSources } from './support/serverSources';

async function run() {
  await serverDb.initialize(MOCK_PRODUCTS);
  assert.equal((await serverDb.getProducts({ publishedOnly: true })).length, 0, 'Les données de développement ne doivent jamais entrer dans le catalogue public.');

  const migration = await readFile(new URL('../supabase/migrations/20260833000000_marketplace_trust.sql', import.meta.url), 'utf8');
  for (const required of [
    'brand_verification_status',
    'product_is_publishable',
    'catalog_validation_events',
    'product_questions',
    'product_waitlist',
    'product_subscriptions',
    'image_ownership_status',
    'verified_purchase'
  ]) assert.ok(migration.includes(required), `Migration marketplace incomplète : ${required}`);

  const source = await readFile(new URL('../src/services/productService.ts', import.meta.url), 'utf8');
  assert.equal(source.includes("products: MOCK_PRODUCTS"), false, 'Le client ne doit pas utiliser le catalogue mock comme fallback.');
  const serverSource = await readServerSources();
  assert.ok(serverSource.includes('serverDb.getPublicProducts()'), 'La route publique doit utiliser la projection publique.');
  assert.equal(serverSource.includes("res.json({ products, source"), false, 'La route publique ne doit pas exposer la source interne.');
  console.log('[PASS] Marketplace trust: gate de publication, absence de fallback mock client et tables de confiance vérifiés.');
}

run().catch(error => {
  console.error('[FAIL] Marketplace trust tests:', error);
  process.exitCode = 1;
});
