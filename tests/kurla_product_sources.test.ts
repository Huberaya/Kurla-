/**
 * CHANTIER 4 — offres N:N via `product_sources`.
 *
 * Invariants : une offre exige un fournisseur enregistré ; un nom libre n’est
 * pas une identité ; la première source est ★ ; unique ★ par produit ; la
 * primaire se projette sur `products.supplier_id` ; une primaire héritée sans
 * supplierId ne vide pas Hair ; PATCH produit/fournisseur ne crée pas de
 * source ; `fulfillment.ts` / `launchCatalog.ts` intacts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { serverDb } from '../src/lib/serverDb';
import { createSupplier } from '../src/lib/db/supplierStore';
import {
  createProductSource,
  listProductSources,
  projectPrimarySupplier,
  updateProductSource,
} from '../src/lib/db/productSourceStore';
import { CANONICAL_TABLES, WRITE_TARGET_BY_INTENT } from '../src/lib/productLifecycle';

const ADMIN = 'admin-c4';
const SRC = join(process.cwd(), 'src');
const read = (relative: string) => readFileSync(join(SRC, relative), 'utf8');

function reset(): void {
  serverDb.inMemoryProducts = [
    { id: 'peau-c4-1', name: 'Sérum C4', category: 'peau', supplierId: null, supplier_id: null, source_supplier: null },
    { id: 'p-hair-c4', name: 'Huile Hair C4', category: 'cheveux', supplierId: 'sup-hair-legacy', supplier_id: 'sup-hair-legacy', source_supplier: 'Distristar (Bobigny)' },
  ];
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryProductSources = [];
}

let checks = 0;
function ok(label: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    checks += 1;
    console.log(`  ✓ ${label}`);
  });
}

async function main(): Promise<void> {
  reset();

  await ok('l’offre canonique reste product_sources (C1, pas une table offers)', () => {
    assert.equal(CANONICAL_TABLES.offer, 'product_sources');
    assert.equal(WRITE_TARGET_BY_INTENT.record_offer, 'product_sources');
  });

  const weleda = await createSupplier(serverDb, ADMIN, { legalName: 'Weleda C4 SAS' });
  const eolys = await createSupplier(serverDb, ADMIN, { legalName: 'EOLYS Beaute C4' });

  await ok('refuser un nom libre comme identité', async () => {
    await assert.rejects(
      () => createProductSource(serverDb, ADMIN, {
        productId: 'peau-c4-1',
        partnerName: 'Un partenaire du web',
        model: 'dropshipping',
      }),
      /nom libre n’est pas une offre|fournisseur enregistré/,
    );
    assert.equal((await listProductSources(serverDb, 'peau-c4-1')).length, 0);
  });

  await ok('refuser une affiliation sans lien réel', async () => {
    await assert.rejects(
      () => createProductSource(serverDb, ADMIN, {
        productId: 'peau-c4-1',
        supplierId: weleda.id,
        model: 'affiliation',
      }),
      /lien d’affiliation/,
    );
  });

  await ok('première source auto-★, coût inconnu = null, partnerName ignoré, projection', async () => {
    const source = await createProductSource(serverDb, ADMIN, {
      productId: 'peau-c4-1',
      supplierId: weleda.id,
      partnerName: 'ce texte ne doit pas être persisté',
      model: 'dropshipping',
      isPrimary: false,
    });
    assert.equal(source.isPrimary, true, 'première source = primaire même si le client n’a pas coché ★');
    assert.equal(source.partnerName, null);
    assert.equal(source.costCents, null);
    assert.equal(source.supplierId, weleda.id);
    const product = serverDb.inMemoryProducts.find(row => row.id === 'peau-c4-1');
    assert.equal(product?.supplierId, weleda.id);
    assert.equal(product?.supplier_id, weleda.id);
    assert.equal(product?.source_supplier, null, 'marqueur formulation intact (ici vide)');
  });

  await ok('N sources, une seule ★, projection suit la nouvelle primaire', async () => {
    const second = await createProductSource(serverDb, ADMIN, {
      productId: 'peau-c4-1',
      supplierId: eolys.id,
      model: '3pl',
      costCents: 890,
    });
    assert.equal(second.isPrimary, false);
    const listed = await listProductSources(serverDb, 'peau-c4-1');
    assert.equal(listed.length, 2);
    assert.equal(listed.filter(s => s.isPrimary).length, 1);
    assert.equal(listed.find(s => s.isPrimary)?.supplierId, weleda.id);

    const promoted = await updateProductSource(serverDb, ADMIN, second.id!, { isPrimary: true });
    assert.equal(promoted.isPrimary, true);
    const after = await listProductSources(serverDb, 'peau-c4-1');
    assert.equal(after.filter(s => s.isPrimary).length, 1);
    assert.equal(after.find(s => s.isPrimary)?.id, second.id);
    const product = serverDb.inMemoryProducts.find(row => row.id === 'peau-c4-1');
    assert.equal(product?.supplierId, eolys.id);
  });

  await ok('une primaire héritée sans supplierId ne vide pas Hair', async () => {
    serverDb.inMemoryProductSources.push({
      id: 'legacy-aff-c4',
      product_id: 'p-hair-c4',
      supplier_id: null,
      partner_name: 'Partenaire affiliation historique',
      model: 'affiliation',
      is_primary: true,
      affiliate_url: 'https://partenaire.example/ref=kurla',
      available: true,
      cost_cents: null,
    });
    const projected = await projectPrimarySupplier(serverDb, 'p-hair-c4');
    assert.equal(projected, null);
    const hair = serverDb.inMemoryProducts.find(row => row.id === 'p-hair-c4');
    assert.equal(hair?.supplierId, 'sup-hair-legacy');
    assert.equal(hair?.supplier_id, 'sup-hair-legacy');
    assert.equal(hair?.source_supplier, 'Distristar (Bobigny)');
  });

  await ok('PATCH refuse de renommer le fournisseur d’une offre', async () => {
    const listed = await listProductSources(serverDb, 'peau-c4-1');
    const first = listed[0];
    assert.ok(first?.id);
    await assert.rejects(
      () => updateProductSource(serverDb, ADMIN, first.id!, { partnerName: 'Autre nom' }),
      /ne se renomme pas/,
    );
    await assert.rejects(
      () => updateProductSource(serverDb, ADMIN, first.id!, { supplierId: eolys.id }),
      /ne se renomme pas/,
    );
  });

  await ok('PATCH produit/fournisseur ne crée pas de source ; fulfillment/launchCatalog intacts', () => {
    const assign = read('server/routes/suppliers.ts');
    const block = assign.slice(assign.indexOf('products/:productId/supplier'));
    assert.ok(!block.includes('product_sources') && !block.includes('createProductSource'), 'l’affectation 1:1 ne fabrique pas d’offre');
    assert.ok(!read('lib/fulfillment.ts').includes('productSourceStore'));
    assert.ok(!read('lib/launchCatalog.ts').includes('productSourceStore'));
    assert.ok(!read('lib/db/productSourceStore.ts').includes('from \'../fulfillment\''));
  });

  await ok('UI : plus de nom libre à la saisie, référentiel ?all=1, héritage nommé', () => {
    const panel = read('components/ProductSourcesPanel.tsx');
    assert.ok(!panel.includes('ou nom du partenaire'));
    assert.ok(!panel.includes('partnerName:'));
    assert.ok(panel.includes('/api/admin/suppliers?all=1'));
    assert.ok(panel.includes('nom libre, pas une fiche'));
    assert.ok(panel.includes('<SupplierName'));
    assert.ok(panel.includes('Un nom libre n’est pas une offre'));
    const routes = read('server/routes/sourcing.ts');
    assert.ok(routes.includes('createProductSource'));
    assert.ok(routes.includes('primarySupplierId'));
    assert.ok(!routes.includes('partner_name: body.partnerName'));
  });

  console.log(`\n[PASS] Offres N:N (chantier 4) : ${checks} contrôles — fiche obligatoire, projection ★, Hair non vidé, 0 table offers.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
