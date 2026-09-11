import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createEmptyBeautyProfile, normalizeBeautyProfile } from '../src/lib/beautyProfile';
import { normalizeSkinProfileTaxonomy, skinProfileTaxonomyUnknowns, SKIN_TAXONOMY_VERSION } from '../src/lib/skinProfileTaxonomy';
import { buildSkinRoutine } from '../src/lib/skinRoutine';
import { serverDb } from '../src/lib/serverDb';

let checks = 0;
function ok(label: string, test: () => void): void {
  test();
  checks += 1;
  console.log(`✓ ${label}`);
}

async function okAsync(label: string, test: () => Promise<void>): Promise<void> {
  await test();
  checks += 1;
  console.log(`✓ ${label}`);
}

ok('type, préoccupations et objectifs restent des dimensions distinctes', () => {
  const normalized = normalizeSkinProfileTaxonomy({
    skinType: 'sensible',
    skinConcerns: ['HPI', 'taches'],
    skinObjectives: ['uniformiser', 'proteger_spf'],
  });
  assert.equal(normalized.skinType, 'sensible');
  assert.deepEqual(normalized.skinConcerns, ['taches']);
  assert.deepEqual(normalized.skinObjectives, ['uniformiser', 'proteger_spf']);
  assert.notEqual(normalized.skinType, normalized.skinConcerns[0]);
});

ok('les codes inconnus deviennent inconnus et ne sont pas conservés comme faits', () => {
  const unknowns = skinProfileTaxonomyUnknowns({
    skinType: 'peau_magique',
    skinConcerns: ['hpi_inventee'],
    skinObjectives: ['eclaircir'],
  });
  assert.equal(unknowns.length, 3);
  const normalized = normalizeBeautyProfile({ skin: { skinType: 'peau_magique', skinConcerns: ['hpi_inventee'], skinObjectives: ['eclaircir'] } });
  assert.equal(normalized.skin.skinType, 'inconnu');
  assert.deepEqual(normalized.skin.skinConcerns, ['inconnu']);
  assert.deepEqual(normalized.skin.skinObjectives, ['inconnu']);
});

ok('toneDepth ne déduit jamais un phototype', () => {
  const profile = normalizeBeautyProfile({ skin: { toneDepth: 'tres_fonce', phototypeConsent: false } });
  assert.equal(profile.skin.phototype, undefined);
  assert.equal(profile.skin.phototypeConsent, false);
});

ok('la routine n’active pas la règle IV–VI sans phototype explicite', () => {
  const empty = createEmptyBeautyProfile();
  empty.skin.toneDepth = 'tres_fonce';
  const mineralSpf = {
    id: 'spf-test', name: 'SPF 50 minéral', brand: 'Test', category: 'peau', slug: 'spf-test', price: 10,
    rating: 0, reviewsCount: 0, image: '', badges: [], forWho: '', notIdealIf: '', howToUse: '', routineStep: 'SPF',
    keyIngredients: ['Zinc Oxide'], inci: 'Aqua, Zinc Oxide', description: 'SPF', inStock: true,
  } as any;
  const routineWithoutPhototype = buildSkinRoutine(empty, [mineralSpf], { tier: 'Essentielle' });
  assert.equal(routineWithoutPhototype.steps.some(step => step.alert?.includes('trace blanche')), false);

  const explicit = createEmptyBeautyProfile();
  explicit.skin.phototype = 6;
  explicit.skin.phototypeConsent = true;
  const routineWithPhototype = buildSkinRoutine(explicit, [mineralSpf], { tier: 'Essentielle' });
  assert.equal(routineWithPhototype.steps.some(step => step.alert?.includes('trace blanche')), true);
});

await okAsync('les produits peau écrivent des codes séparés et refusent un objectif inventé', async () => {
  serverDb.inMemoryTaxonomies = [];
  serverDb.inMemoryTaxonomyTerms = [];
  const saved = await serverDb.saveCatalogProduct('admin-c2', {
    id: 'c2-skin-product',
    name: 'Produit test C2',
    slug: 'produit-test-c2',
    category: 'peau',
    price: 10,
    stockQuantity: 1,
    countryAvailability: ['FR'],
    skinTypes: ['sensible'],
    skinConcerns: ['HPI'],
    skinObjectives: ['uniformiser'],
    images: [{ url: 'https://example.test/c2.jpg' }],
  });
  const row = serverDb.inMemoryProducts.find((product: any) => product.id === saved.id) as any;
  assert.deepEqual(row.skinTypes, ['sensible']);
  assert.deepEqual(row.skinConcerns, ['taches']);
  assert.deepEqual(row.skinObjectives, ['uniformiser']);
  assert.equal(row.skinTaxonomyVersion, SKIN_TAXONOMY_VERSION);
  await assert.rejects(
    () => serverDb.saveCatalogProduct('admin-c2', { ...row, id: 'c2-invalid', slug: 'c2-invalid', skinObjectives: ['eclaircir'] }),
    /Vocabulaire contrôlé/
  );
});

ok('le contrat C2 versionne le catalogue et sépare skin_concerns en base', () => {
  const migration = readFileSync('supabase/migrations/20260918000000_skin_taxonomy_v2.sql', 'utf8');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS skin_concerns/);
  assert.match(migration, /skin_texture_code/);
  assert.match(migration, /skin_finish_code/);
  assert.match(migration, /skin_supported_phototypes/);
  assert.match(migration, /skin_taxonomy_version/);
  assert.equal(SKIN_TAXONOMY_VERSION, '2026-09-18.c2');
});

console.log(`\n${checks} contrôles C2 taxonomie/profil passés.\n`);
