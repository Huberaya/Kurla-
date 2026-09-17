/**
 * CHANTIER 15 — Recettes Hair non-régression + portes publish / docs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEmptyBeautyProfile, normalizeBeautyProfile } from '../src/lib/beautyProfile';
import {
  HAIR_DROPSHIP_TOOL_IDS,
  HAIR_LAUNCH_CORE_IDS,
  HAIR_TAMPON_IDS,
  HAIR_TAMPON_UNITS,
  IDENTIFIED_IMPORT_TABLES,
  gateNeverPublishesTestListing,
  hairAccessoryStillDropship24h,
  hairCartStillWorks,
  hairCatalogGuardForbidsLaunchEdits,
  hairDropshipToolIds,
  hairLaunchIds,
  hairTamponIds,
  identifiedImportTargetsAreSafe,
  identifiedPlanNeverWritesProducts,
  identifiedTableIsSafe,
  isTestListingNeverCheckout,
  publicListBlocked,
  skinDraftFromCandidateStaysPrivate,
  tamponIsHairLaunchSubset,
  tamponUnitCount,
} from '../src/lib/hairPublishGates';
import { calculateKurlaFit } from '../src/lib/kurlaFit';
import { isProductInWorkspace } from '../src/server/workspaceScope';

let checks = 0;
const ok = (label: string, fn: () => void) => { fn(); checks += 1; console.log(`  ✓ ${label}`); };

console.log('\n=== C15 — Recettes Hair + portes publish / docs ===\n');

ok('cœur Hair p01–p18 toujours dans launchCatalog', () => {
  const ids = new Set(hairLaunchIds());
  for (const id of HAIR_LAUNCH_CORE_IDS) assert.ok(ids.has(id), `manque ${id}`);
  assert.ok(hairLaunchIds().length >= 18);
});

ok('tampon 3PL = 5 héros Hair × 15 = 75, sous-ensemble du lancement', () => {
  assert.deepEqual(hairTamponIds(), [...HAIR_TAMPON_IDS]);
  assert.equal(tamponUnitCount(), HAIR_TAMPON_UNITS);
  assert.equal(tamponIsHairLaunchSubset(), true);
});

ok('outils dropship Hair (p35…) inchangés', () => {
  assert.deepEqual(hairDropshipToolIds(), [...HAIR_DROPSHIP_TOOL_IDS]);
});

ok('CATALOG_GUARD interdit de retoucher LAUNCH_PRODUCTS', () => {
  assert.equal(hairCatalogGuardForbidsLaunchEdits(), true);
});

ok('accessoire Hair 24–48h ; cosmétique Skin jamais 24–48h', () => {
  assert.equal(hairAccessoryStillDropship24h(), true);
});

ok('panier Hair accessoire intact ; test listing Skin sans Ajouter', () => {
  assert.equal(hairCartStillWorks(), true);
});

ok('Kurla Fit Hair : couverture complète = 100', () => {
  const empty = createEmptyBeautyProfile();
  const profile = normalizeBeautyProfile({
    ...empty,
    hair: {
      ...empty.hair,
      texturePatterns: ['4C'],
      curlPattern: 'mixte',
      porosity: 'forte',
      density: 'forte',
      dryness: 'forte',
      breakage: 'frequente',
      scalpCondition: 'gras',
      scalpConcerns: ['demangeaisons'],
    },
  });
  const fit = calculateKurlaFit({ category: 'cheveux', needs: ['hydrater_cheveux', 'reduire_casse'] }, profile);
  assert.equal(fit.score, 100);
});

ok('kits restent dans le workspace Skin (C12) ; accessoires restent Hair', () => {
  assert.equal(isProductInWorkspace({ category: 'kits' }, 'skin'), true);
  assert.equal(isProductInWorkspace({ category: 'accessoires' }, 'hair'), true);
  assert.equal(isProductInWorkspace({ category: 'peau' }, 'hair'), false);
});

ok('porte boutique : draft / formulation / test listing jamais listables ni checkout', () => {
  assert.equal(publicListBlocked({ catalog_status: 'draft', is_active: true, brand: 'K' }), true);
  assert.equal(publicListBlocked({
    catalog_status: 'published',
    is_active: true,
    brand: 'KURLA',
    source_supplier: 'KURLA Skincare — formulation interne',
  }), true);
  const testListing = {
    catalog_status: 'published',
    is_active: true,
    is_test_listing: true,
    brand: 'EOLYS',
    image: 'https://cdn.example/x.jpg',
  };
  assert.equal(isTestListingNeverCheckout(testListing), true);
});

ok('porte C4 : jamais de proposition publish sur une fiche test', () => {
  assert.equal(gateNeverPublishesTestListing(), true);
});

ok('C8 : fiche née d’un candidat Skin = draft inactive, hors boutique, pas un id p*', () => {
  assert.equal(skinDraftFromCandidateStaysPrivate(), true);
});

ok('import identifié : tables fond/candidats, jamais products / published', () => {
  assert.deepEqual([...IDENTIFIED_IMPORT_TABLES], ['sourcing_fond_positions', 'sourcing_product_candidates']);
  assert.equal(identifiedTableIsSafe('products'), false);
  assert.equal(identifiedImportTargetsAreSafe(), true);
  assert.equal(identifiedPlanNeverWritesProducts(), true);
});

ok('politique stricte OFF par défaut (SQL)', () => {
  const sql = readFileSync('supabase/migrations/20261003000000_publication_policy.sql', 'utf8');
  assert.match(sql, /strict_mode boolean NOT NULL DEFAULT false/);
});

ok('route import identifié : requireAdmin avant écriture', () => {
  const src = readFileSync('src/server/routes/prospects.ts', 'utf8');
  const idx = src.indexOf("app.post('/api/admin/sourcing/identified-import'");
  assert.ok(idx >= 0);
  const slice = src.slice(idx, idx + 500);
  assert.match(slice, /requireAdmin/);
});

ok('fichiers Hair protégés toujours présents, C15 ne les réécrit pas', () => {
  const launch = readFileSync('src/lib/launchCatalog.ts', 'utf8');
  const fulfillment = readFileSync('src/lib/fulfillment.ts', 'utf8');
  assert.match(launch, /export const LAUNCH_PRODUCTS/);
  assert.match(fulfillment, /export const TAMPON_3PL/);
  assert.match(fulfillment, /Aucune modification de src\/lib\/launchCatalog\.ts/);
  const gates = readFileSync('src/lib/hairPublishGates.ts', 'utf8');
  assert.match(gates, /Ne réécrit/);
});

console.log(`\n[PASS] C15 Hair / portes : ${checks} recettes.`);
