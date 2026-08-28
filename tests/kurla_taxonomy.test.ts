import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { TAXONOMY_REFERENCE, TAXONOMY_TERMS } from '../src/lib/taxonomyReference';

/**
 * CHANTIER 10 (bloc B3) — banc « vocabulaires contrôlés appliqués ».
 *
 * Trois garanties :
 *  1. la référence du code **est** celle de la migration — le banc relit le SQL
 *     et fait tomber la suite en cas de divergence, sinon le vocabulaire du
 *     code dérive silencieusement de celui de la base ;
 *  2. un code hors référentiel est refusé à l'écriture, un synonyme déclaré est
 *     résolu vers son code canonique **et la résolution est signalée** ;
 *  3. le vocabulaire est lisible publiquement : une liste fermée que le client
 *     ne peut pas lire est une liste que personne ne respecte.
 */

const MIGRATION = join(process.cwd(), 'supabase', 'migrations', '20260847000000_kurla_taxonomy_terms.sql');

async function runTaxonomyTests(): Promise<void> {
  // ---------------------------------------------------------------------
  // 1. Le code et la migration disent la même chose.
  // ---------------------------------------------------------------------
  const sql = readFileSync(MIGRATION, 'utf8');
  const taxonomyBlock = sql.split('INSERT INTO public.kurla_taxonomies')[1].split('ON CONFLICT')[0];
  const sqlTaxonomies = Array.from(taxonomyBlock.matchAll(/\('([a-z_]+)',/g)).map(match => match[1]);
  assert.deepEqual(
    TAXONOMY_REFERENCE.map(item => item.id).sort(),
    Array.from(new Set(sqlTaxonomies)).sort(),
    'les taxonomies du code et de la migration divergent'
  );

  const sqlTermCodes = Array.from(sql.matchAll(/^\s*\('[a-z0-9_]+',\s*'([a-z_]+)',\s*'([^']+)',/gm))
    .map(match => `${match[1]}:${match[2]}`);
  const codeTermCodes = TAXONOMY_TERMS.map(term => `${term.taxonomy}:${term.code}`);
  assert.equal(codeTermCodes.length, sqlTermCodes.length, 'le nombre de termes diffère entre le code et la migration');
  assert.deepEqual(codeTermCodes.slice().sort(), sqlTermCodes.slice().sort(), 'les termes du code et de la migration divergent');
  assert.ok(TAXONOMY_TERMS.length >= 50, 'au moins 50 termes attendus');

  // ---------------------------------------------------------------------
  // 2. Vérification : codes valides, synonyme, valeur inventée.
  // ---------------------------------------------------------------------
  serverDb.inMemoryTaxonomies = [];
  serverDb.inMemoryTaxonomyTerms = [];

  const clean = await serverDb.checkProductVocabulary({
    concerns: ['hydrater_cheveux', 'reduire_casse'],
    hairTypes: ['4C', '3B'],
    countryAvailability: ['FR', 'BE']
  });
  assert.equal(clean.vocabularyLoaded, true);
  assert.equal(clean.valid, true);
  assert.deepEqual(clean.unknown, []);
  assert.deepEqual(clean.values.concerns, ['hydrater_cheveux', 'reduire_casse']);

  const viaSynonym = await serverDb.checkProductVocabulary({ concerns: ['sec', 'dry'] });
  assert.equal(viaSynonym.valid, true);
  assert.deepEqual(viaSynonym.values.concerns, ['hydrater_cheveux'], 'les deux synonymes doivent converger vers un seul code canonique');
  assert.equal(viaSynonym.resolvedFromSynonym.length, 2);
  assert.equal(viaSynonym.resolvedFromSynonym[0].to, 'hydrater_cheveux');

  const invented = await serverDb.checkProductVocabulary({
    concerns: ['hydrater_cheveux', 'blanchir_la_peau'],
    hairTypes: ['type_inexistant']
  });
  assert.equal(invented.valid, false);
  assert.deepEqual(invented.unknown.map(item => item.value).sort(), ['blanchir_la_peau', 'type_inexistant']);
  assert.equal(invented.unknown[0].taxonomy, 'need');

  // ---------------------------------------------------------------------
  // 3. L'écriture produit applique la règle.
  // ---------------------------------------------------------------------
  const baseInput = {
    name: 'Sérum vocabulaire',
    slug: 'serum-vocabulaire',
    brand: 'KURLA Botanicals',
    category: 'cheveux',
    price: 19.9,
    stockQuantity: 5,
    countryAvailability: ['FR'],
    images: [{ url: 'https://example.com/image.jpg' }],
    ingredients: ['Glycerin']
  };

  await assert.rejects(
    () => serverDb.saveCatalogProduct('admin-1', { ...baseInput, concerns: ['blanchir_la_peau'] }),
    /Vocabulaire contrôlé/
  );

  const saved = await serverDb.saveCatalogProduct('admin-1', { ...baseInput, concerns: ['sec'], hairTypes: ['4c'] });
  const row = serverDb.inMemoryProducts.find((product: any) => product.id === saved.id);
  assert.deepEqual(row.concerns, ['hydrater_cheveux'], 'le synonyme doit être écrit sous son code canonique');
  // En mode mémoire l'enregistrement porte les clés normalisées du catalogue
  // (`hairTypes`) ; c'est cette valeur qui est écrite, pas la saisie d'origine.
  assert.deepEqual(row.hairTypes, ['4C'], 'la casse ne doit pas créer un code parallèle');

  // ---------------------------------------------------------------------
  // 4. Audit du fonds existant.
  // ---------------------------------------------------------------------
  serverDb.inMemoryProducts.push({
    id: 'p-hors-vocabulaire',
    title: 'Produit ancien',
    concerns: ['besoin_invente'],
    hair_types: ['4C'],
    country_availability: ['FR']
  } as never);

  const audit = await serverDb.getVocabularyAudit();
  assert.equal(audit.vocabularyLoaded, true);
  assert.ok(audit.productsWithUnknownValues >= 1);
  assert.ok(audit.perProduct.some(entry => entry.productId === 'p-hors-vocabulaire'));

  // ---------------------------------------------------------------------
  // 5. Routes : vocabulaire public, audit réservé à l'administration.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const publicVocabulary = await fetch(`${baseUrl}/api/taxonomies`);
    assert.equal(publicVocabulary.status, 200);
    const body = await publicVocabulary.json() as { taxonomies: unknown[]; terms: unknown[]; count: number };
    assert.ok(body.taxonomies.length >= 5);
    assert.ok(body.count >= 50);

    const filtered = await fetch(`${baseUrl}/api/taxonomies?taxonomy=texture`);
    const filteredBody = await filtered.json() as { terms: Array<{ taxonomy: string }> };
    assert.ok(filteredBody.terms.length > 0);
    assert.ok(filteredBody.terms.every(term => term.taxonomy === 'texture'));

    const auditRoute = await fetch(`${baseUrl}/api/admin/catalog/vocabulary-audit`, {
      headers: { 'x-user-id': 'attacker', 'x-admin-key': 'forged' }
    });
    assert.equal(auditRoute.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Vocabulaires banc : code = migration, synonymes résolus et signalés, valeur inventée refusée, vocabulaire public.');
}

runTaxonomyTests().catch(error => {
  console.error('[FAIL] Vocabulaires banc :', error);
  process.exitCode = 1;
});
