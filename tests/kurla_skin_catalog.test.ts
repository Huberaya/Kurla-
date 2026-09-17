import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isCatalogPubliclyListable } from '../src/lib/catalogTruth';
import { SKIN_CATALOG_CATEGORY, WRITE_TARGET_BY_INTENT, unifyCandidate, unifyFondPosition } from '../src/lib/productLifecycle';
import { buildFicheFromCandidate } from '../src/lib/sourcingFicheLink';
import {
  applySkinCatalogFields,
  assertCatalogDraftHasRealPrice,
  catalogDraftIsPublic,
  catalogEntryEligibility,
  candidateIdFromIdentified,
  enterCatalogFromCandidate,
  isSkinCatalogCandidate,
  isSkinCatalogDraft,
  sealCatalogDraft,
  selectSkinCatalogDrafts,
  SKIN_CATALOG_WRITE_TARGET,
} from '../src/lib/skinCatalog';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const skinCandidate = {
  id: 'cand-skin-c8',
  product: 'Sérum Niacinamide 10 %',
  brand: 'INKEY',
  category: 'peau',
  public_price_cents: 1350,
  needs: ['hydrater'],
};
const hairCandidate = {
  id: 'cand-hair-c8',
  product: 'Bonnet satin',
  brand: 'KURLA',
  category: 'accessoires',
  public_price_cents: 1290,
};
const prospect = { id: 'prospect-1', name: 'Ankorstore' };

function main(): void {
  assert.equal(SKIN_CATALOG_WRITE_TARGET, WRITE_TARGET_BY_INTENT.enter_catalog);
  assert.equal(SKIN_CATALOG_CATEGORY, 'peau');

  assert.equal(isSkinCatalogCandidate(skinCandidate), true);
  assert.equal(isSkinCatalogCandidate(hairCandidate), false);
  assert.equal(isSkinCatalogCandidate({ category: 'soins_visage' }), true);
  assert.equal(isSkinCatalogCandidate({ category: 'cheveux' }), false);

  const skin = enterCatalogFromCandidate(skinCandidate, prospect);
  assert.equal(skin.catalog_status, 'draft');
  assert.equal(skin.is_active, false);
  assert.equal(skin.category, 'peau');
  assert.equal(skin.price, 13.5);
  assert.equal('sourceSupplier' in skin, false, 'Skin : source_supplier n’est pas un nom de prospect');
  assert.deepEqual(skin.needs, ['hydrater']);
  assert.equal(catalogDraftIsPublic(skin), false);
  assert.equal(isCatalogPubliclyListable(skin), false);

  const injected = enterCatalogFromCandidate({
    ...skinCandidate,
    catalog_status: 'published',
    is_active: true,
    id: 'src-would-be-coming-soon',
  }, prospect);
  assert.equal(injected.catalog_status, 'draft');
  assert.equal(injected.is_active, false);
  assert.equal('id' in injected && String(injected.id).startsWith('src-'), false);
  assert.equal(catalogDraftIsPublic(injected), false);

  const hair = enterCatalogFromCandidate(hairCandidate, prospect);
  assert.equal(hair.catalog_status, 'draft');
  assert.equal(hair.is_active, false);
  assert.equal(hair.category, 'accessoires');
  assert.equal(hair.sourceSupplier, 'Ankorstore', 'Hair : C3 conserve le prospect nommé');
  assert.equal(catalogDraftIsPublic(hair), false);

  assert.throws(
    () => enterCatalogFromCandidate({ ...skinCandidate, public_price_cents: 0 }, prospect),
    /prix public à obtenir/i,
  );
  assert.throws(
    () => enterCatalogFromCandidate({ ...skinCandidate, product: '  ' }, prospect),
    /nom de produit/i,
  );

  const raw = buildFicheFromCandidate(skinCandidate, prospect);
  const sealed = sealCatalogDraft({ ...raw, catalog_status: 'published', is_active: true, isActive: true });
  assert.equal(sealed.catalog_status, 'draft');
  assert.equal(sealed.is_active, false);
  assert.throws(() => assertCatalogDraftHasRealPrice(sealCatalogDraft(buildFicheFromCandidate({ ...skinCandidate, public_price_cents: null }, null))), /prix public/i);

  const withNeed = applySkinCatalogFields(sealed, { needs: ['taches'] });
  assert.equal(withNeed.category, 'peau');
  assert.deepEqual(withNeed.needs, ['taches']);
  assert.equal('sourceSupplier' in withNeed, false);

  const fond = unifyFondPosition({ sourcingItemId: 'fond-50-n01', rang: 1, produit: 'CeraVe', marque: 'CeraVe', priceEur: 12 });
  assert.equal(catalogEntryEligibility(fond).ok, false);
  assert.match(catalogEntryEligibility(fond).reason, /fond restent identifiées/i);

  const cand = unifyCandidate({ id: 'abc', product: 'Sérum', brand: 'INKEY', category: 'peau', priceEur: 13.5 });
  assert.equal(candidateIdFromIdentified(cand), 'abc');
  assert.equal(catalogEntryEligibility(cand).ok, true);

  const noPrice = unifyCandidate({ id: 'noprice', product: 'Sérum', category: 'peau' });
  assert.equal(catalogEntryEligibility(noPrice).ok, false);
  assert.match(catalogEntryEligibility(noPrice).reason, /prix public/i);

  const linked = unifyCandidate({ id: 'linked', product: 'Sérum', priceEur: 10, draft_product_id: 'prod-1' });
  assert.equal(catalogEntryEligibility(linked).ok, false);

  const drafts = selectSkinCatalogDrafts([
    { id: 'peau-draft', category: 'peau', catalog_status: 'draft', is_active: false, name: 'Brouillon Skin' },
    { id: 'peau-ess-001', category: 'peau', catalog_status: 'draft', is_active: false, source_supplier: 'KURLA Skincare — formulation interne' },
    { id: 'p35', category: 'accessoires', catalog_status: 'draft', is_active: false, name: 'Hair draft' },
    { id: 'peau-pub', category: 'peau', catalog_status: 'published', is_active: true, name: 'ne doit pas passer sans preuves' },
  ]);
  assert.equal(drafts.every(row => isSkinCatalogDraft(row)), true);
  assert.ok(drafts.some(row => row.id === 'peau-draft'));
  assert.ok(drafts.some(row => row.id === 'peau-ess-001'));
  assert.equal(drafts.some(row => row.id === 'p35'), false, 'draft Hair hors C8');
  assert.equal(isSkinCatalogDraft({ category: 'accessoires', catalog_status: 'draft' }), false);

  const route = readFileSync(join(root, 'src/server/routes/sourcing.ts'), 'utf8');
  const createFiche = route.slice(route.indexOf("app.post('/api/admin/sourcing/candidates/:id/create-fiche'"));
  const handler = createFiche.slice(0, createFiche.indexOf("app.get('/api/admin/sourcing/sources'"));
  assert.match(handler, /enterCatalogFromCandidate/);
  assert.doesNotMatch(handler, /\.from\('products'\)/);
  assert.doesNotMatch(handler, /catalog_status:\s*['"]published['"]/);
  assert.match(handler, /publishesToBoutique:\s*false/);
  assert.match(handler, /isPublic:\s*false/);

  const panel = readFileSync(join(root, 'src/components/IdentifiedProductsPanel.tsx'), 'utf8');
  assert.match(panel, /create-fiche/);
  assert.match(panel, /catalogEntryEligibility/);
  assert.doesNotMatch(panel, /workspace === ['"]skin['"]/);

  const dash = readFileSync(join(root, 'src/pages/AdminDashboardPage.tsx'), 'utf8');
  assert.match(dash, /IdentifiedProductsPanel[\s\S]*onOpenCatalog/);

  console.log('[PASS] Catalogue Skin C8 : drafts hors boutique, 0 publish accidentel, Hair intact, create-fiche scellé.');
}

main();
