import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { evaluateCatalogSourcingReadiness } from '../src/lib/catalogSourcingReadiness';
import { catalogCsvRowToInput } from '../src/lib/catalogManagement';
import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 2 — banc sourcing réel → fiche catalogue.
 *
 * Ce banc ne fabrique aucune donnée fournisseur : il vérifie que l'absence est
 * remontée, qu'une entité non résolue ne devient pas une entité vérifiée, que
 * les preuves expirées restent visibles et qu'une référence achetable possède
 * bien son contrat commercial/documentaire complet.
 */

const SUPPLIER_ID = 'supplier-real-1';
const PRODUCT_ID = 'product-real-1';

const BASE_PRODUCT = {
  id: PRODUCT_ID,
  slug: 'produit-real',
  name: 'Produit réellement sourcé',
  category: 'peau',
  source_supplier: 'Laboratoire réel',
  supplier_id: SUPPLIER_ID,
  supplier_sku: 'SKU-REAL-001',
  size_label: '50 ml',
  price: 24.9,
  vat_rate: 20,
  price_includes_vat: true,
  country_availability: ['FR', 'BE'],
  image_url: 'https://supplier.example/real.jpg',
  image_ownership_status: 'licensed',
  inci: 'Aqua, Glycerin',
  stock_quantity: 12,
  in_stock: true,
  stock_validation_status: 'verified',
  returns_policy: 'Retour sous 14 jours selon les conditions affichées.',
  ingredient_verification_status: 'verified',
  claims_validation_status: 'verified',
  images_validation_status: 'verified',
  certifications_validation_status: 'verified',
  translations_validation_status: 'verified',
  brand_verification_status: 'verified',
  catalog_status: 'published',
  is_active: true,
};

const SUPPLIER = {
  id: SUPPLIER_ID,
  legalName: 'Laboratoire réel',
  legalNameNormalized: 'laboratoire reel',
  supplierType: 'contract_manufacturer',
  country: 'FR',
  moqUnits: 10,
  leadTimeDays: 5,
  certifications: [],
  verificationStatus: 'verified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const REQUIRED_DOCUMENTS = [
  { id: 'doc-cpsr', supplierId: SUPPLIER_ID, documentType: 'cpsr', issuedOn: '2026-01-01', fileUrl: 'https://files.example/cpsr.pdf' },
  { id: 'doc-cpnp', supplierId: SUPPLIER_ID, documentType: 'cpnp_notification', issuedOn: '2026-01-01', fileUrl: 'https://files.example/cpnp.pdf' },
  { id: 'doc-rp', supplierId: SUPPLIER_ID, documentType: 'responsible_person', issuedOn: '2026-01-01', fileUrl: 'https://files.example/rp.pdf' },
];

async function run(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. Évaluation pure : aucune source n'est devinée.
  // ---------------------------------------------------------------
  const csvFacts = catalogCsvRowToInput({
    name: 'Produit importé',
    supplier_sku: 'SKU-CSV-1',
    size_label: '50 ml',
    returns_policy: 'Retour sous 14 jours',
    image_ownership_status: 'licensed',
  });
  assert.equal(csvFacts.supplierSku, 'SKU-CSV-1');
  assert.equal(csvFacts.sizeLabel, '50 ml');
  assert.equal(csvFacts.returnsPolicy, 'Retour sous 14 jours');
  assert.equal(csvFacts.imageOwnershipStatus, 'licensed');

  const noSource = evaluateCatalogSourcingReadiness({ id: 'draft-only', category: 'peau' });
  assert.equal(noSource.state, 'no_source');
  assert.equal(noSource.ready, false);
  assert.ok(noSource.missing.some(item => item.field === 'source_supplier'));
  assert.ok(noSource.missing.some(item => item.field === 'supplier_sku'));
  assert.ok(noSource.missing.some(item => item.field === 'vat_rate'));

  const unresolved = evaluateCatalogSourcingReadiness({
    ...BASE_PRODUCT,
    supplier_id: 'supplier-does-not-exist',
  }, { supplier: null });
  assert.equal(unresolved.state, 'supplier_unresolved');
  assert.match(unresolved.missing.find(item => item.field === 'supplier_id')?.label || '', /introuvable/);

  const expired = evaluateCatalogSourcingReadiness(BASE_PRODUCT, {
    supplier: { ...SUPPLIER, verificationStatus: 'pending' },
    documents: REQUIRED_DOCUMENTS.map(document => ({ ...document, expiresOn: '2025-12-31' })),
    today: '2026-09-10',
  });
  assert.equal(expired.state, 'supplier_pending');
  assert.ok(expired.expiredDocuments.includes('cpsr'));
  assert.ok(expired.missing.some(item => item.label.includes('document fournisseur expiré : cpsr')));

  // ---------------------------------------------------------------
  // 2. Rapport store : produit, fournisseur, SKU et preuves sont nommés.
  // ---------------------------------------------------------------
  serverDb.inMemoryProducts = [BASE_PRODUCT] as never[];
  serverDb.inMemorySuppliers = [SUPPLIER] as never[];
  serverDb.inMemorySupplierDocuments = REQUIRED_DOCUMENTS as never[];

  const report = await serverDb.getCatalogSourcingReadinessReport();
  assert.equal(report.products, 1);
  assert.equal(report.readyToBuy, 1);
  const row = report.perProduct[0];
  assert.equal(row.productId, PRODUCT_ID);
  assert.equal(row.supplierId, SUPPLIER_ID);
  assert.equal(row.supplierName, 'Laboratoire réel');
  assert.equal(row.supplierSku, 'SKU-REAL-001');
  assert.deepEqual(new Set(row.heldDocuments), new Set(['cpsr', 'cpnp_notification', 'responsible_person']));
  assert.deepEqual(row.expiredDocuments, []);
  assert.deepEqual(row.missingRecommendedDocuments, ['pif', 'gmp_iso_22716']);
  assert.deepEqual(row.missing, []);

  // ---------------------------------------------------------------
  // 3. Publication : la porte sourcing s'applique aux vraies fiches
  //    catégorisées, sans transformer une précommande/formulation cible en
  //    disponibilité achetable.
  // ---------------------------------------------------------------
  const incomplete = { ...BASE_PRODUCT, id: 'product-incomplete', catalog_status: 'draft', supplier_sku: undefined, stock_quantity: 0, in_stock: false };
  serverDb.inMemoryProducts = [incomplete] as never[];
  const readiness = await serverDb.getCatalogPublicationReadiness('product-incomplete');
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.some(item => item.field === 'supplier_sku'));
  assert.ok(readiness.missing.some(item => item.field === 'stock_quantity'));
  await assert.rejects(
    () => serverDb.updateCatalogStatus('product-incomplete', 'published'),
    /Publication refusée/
  );
  assert.equal((serverDb.inMemoryProducts[0] as any).catalog_status, 'draft');

  // ---------------------------------------------------------------
  // 4. La vue est strictement réservée à l'administration.
  // ---------------------------------------------------------------
  const { app } = await import('../server');
  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });
  try {
    const { port } = listener.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/catalog/sourcing-readiness`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Sourcing catalogue : absence non inventée, fournisseur/SKU/preuves nommés, expirés visibles, publication réelle bloquée, route admin protégée.');
}

run().catch(error => {
  console.error('[FAIL] Sourcing catalogue :', error);
  process.exitCode = 1;
});
