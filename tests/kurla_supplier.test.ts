import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { normalizeSupplierName, SupplierAmbiguityError } from '../src/lib/db/supplierStore';

/**
 * CHANTIER 16A — banc « référentiel fournisseurs ».
 *
 * Ce qui est vérifié, parce que ce sont les façons dont un approvisionnement
 * perd sa traçabilité :
 *
 *  1. **deux écritures du même nom ne font qu'une seule entité** — c'est le
 *     critère d'acceptation du chantier, mesuré par un comptage et non par une
 *     impression ;
 *  2. **l'ambiguïté est remontée, jamais tranchée** : deux entités plausibles
 *     font échouer l'opération en les nommant, et rien n'est écrit ;
 *  3. un fournisseur découvert par un import naît `not_provided` — un nom
 *     écrit dans un CSV n'est pas une vérification ;
 *  4. un document de conformité sans fichier, sans date, ou expiré avant
 *     d'être émis, est refusé ;
 *  5. l'import fournisseur rattache le produit à l'entité résolue et enregistre
 *     la raison sociale canonique, pas la chaîne du fichier ;
 *  6. la route d'import reste protégée : sans jeton, aucun effet.
 */

const ADMIN = 'admin-supplier-1';

function reset(): void {
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryProducts = [];
  // Le journal d'import (catalog_imports / catalog_import_rows) n'existe qu'en
  // base réelle : en mode mémoire il n'y a rien à réinitialiser.
}

function makeRecord(slug: string): any {
  return {
    supplierSku: `SKU-${slug}`,
    name: `Produit ${slug}`,
    slug,
    brand: 'KURLA',
    price: 19.9,
    vatRate: 20,
    stockQuantity: 5,
    countryAvailability: ['FR'],
    catalogCategoryTags: ['cuir_chevelu'],
    targetAudiences: ['tous_publics']
  };
}

async function runSupplierTests(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. Le pliage du nom : casse, diacritiques, ponctuation, forme juridique.
  // ---------------------------------------------------------------
  assert.equal(normalizeSupplierName('LABORATOIRE X'), normalizeSupplierName('laboratoire x'));
  assert.equal(normalizeSupplierName('Laboratoires Biotic Phocéa'), normalizeSupplierName('laboratoires biotic phocea'));
  assert.equal(normalizeSupplierName('Laboratoire X  SAS'), normalizeSupplierName('laboratoire x'));
  assert.equal(normalizeSupplierName('Hair Liss & Co.'), normalizeSupplierName('hair liss'));
  assert.equal(normalizeSupplierName('   '), '');
  assert.equal(normalizeSupplierName(undefined), '');

  // ---------------------------------------------------------------
  // 2. CRITÈRE D'ACCEPTATION — deux imports nommant le même fournisseur de deux
  //    façons produisent UNE seule entité.
  // ---------------------------------------------------------------
  reset();
  const firstImport = await serverDb.importCatalogRecords(ADMIN, [makeRecord('huile-cuir-chevelu')], 'supplier', 'Laboratoire Alvend SAS');
  assert.equal(firstImport.imported, 1, 'le premier import doit passer');
  const secondImport = await serverDb.importCatalogRecords(ADMIN, [makeRecord('baume-barbe')], 'supplier', 'LABORATOIRE ALVEND');
  assert.equal(secondImport.imported, 1, 'le second import doit passer');

  const suppliers = await serverDb.listSuppliers();
  assert.equal(suppliers.length, 1, `deux écritures doivent donner une seule entité, obtenu ${suppliers.length}`);
  assert.equal(suppliers[0].legalNameNormalized, 'laboratoire alvend');

  const products = await serverDb.getAdminCatalogProducts();
  assert.equal(products.length, 2, 'les deux produits doivent exister');
  const attached = products.filter(product => product.supplierId === suppliers[0].id);
  assert.equal(attached.length, 2, `les deux produits doivent pointer la même entité, obtenu ${attached.length}`);
  // Le nom enregistré est la raison sociale retenue, pas la chaîne du fichier.
  assert.equal(attached[0].sourceSupplier, suppliers[0].legalName);
  assert.equal(attached[1].sourceSupplier, suppliers[0].legalName);

  // ---------------------------------------------------------------
  // 3. Un fournisseur découvert par un import naît non vérifié.
  // ---------------------------------------------------------------
  assert.equal(suppliers[0].verificationStatus, 'not_provided');
  assert.equal(suppliers[0].supplierType, 'unknown', 'le type n’est pas deviné');

  // ---------------------------------------------------------------
  // 4. L'ambiguïté est remontée, jamais tranchée.
  // ---------------------------------------------------------------
  reset();
  await serverDb.createSupplier(ADMIN, { legalName: 'Laboratoire Alvend' });
  await serverDb.createSupplier(ADMIN, { legalName: 'Alvend Nature' });

  const ambiguousImport = await serverDb.importCatalogRecords(ADMIN, [makeRecord('serum-test')], 'supplier', 'Alvend')
    .then(() => null)
    .catch(error => error);
  assert.ok(ambiguousImport instanceof SupplierAmbiguityError, 'une ambiguïté doit lever SupplierAmbiguityError');
  assert.equal(ambiguousImport.candidates.length, 2, 'les deux entités en concurrence doivent être nommées');
  assert.match(ambiguousImport.message, /Tranchez explicitement/);
  // Rien n'a été écrit : ni produit, ni fournisseur supplémentaire.
  assert.equal((await serverDb.getAdminCatalogProducts()).length, 0, 'aucun produit ne doit être écrit sur une ambiguïté');
  assert.equal((await serverDb.listSuppliers()).length, 2, 'aucun fournisseur ne doit être créé sur une ambiguïté');

  // La création directe refuse aussi de choisir.
  const ambiguousCreate = await serverDb.createSupplier(ADMIN, { legalName: 'Alvend' }).then(() => null).catch(error => error);
  assert.ok(ambiguousCreate instanceof SupplierAmbiguityError);

  // ---------------------------------------------------------------
  // 5. Un document de conformité exige une preuve.
  // ---------------------------------------------------------------
  reset();
  const supplier = await serverDb.createSupplier(ADMIN, { legalName: 'Hair Liss', supplierType: 'contract_manufacturer', country: 'FR' });
  assert.equal(supplier.id, 'hair-liss', 'l’identifiant est dérivé du nom normalisé');
  // Créer deux fois la même entité ne la duplique pas.
  const again = await serverDb.createSupplier(ADMIN, { legalName: 'HAIR LISS SARL' });
  assert.equal(again.id, supplier.id);
  assert.equal((await serverDb.listSuppliers()).length, 1);

  const noFile = await serverDb.addSupplierDocument(ADMIN, { supplierId: supplier.id, documentType: 'cpsr', issuedOn: '2026-05-02' })
    .then(() => null).catch(error => error);
  assert.match(String(noFile?.message), /exige un fichier/);

  const noDate = await serverDb.addSupplierDocument(ADMIN, { supplierId: supplier.id, documentType: 'cpsr', fileUrl: 'https://doc.test/cpsr.pdf' })
    .then(() => null).catch(error => error);
  assert.match(String(noDate?.message), /date d’émission/);

  const incoherent = await serverDb.addSupplierDocument(ADMIN, {
    supplierId: supplier.id, documentType: 'oeko_tex', fileUrl: 'https://doc.test/oeko.pdf', issuedOn: '2026-05-02', expiresOn: '2026-01-01'
  }).then(() => null).catch(error => error);
  assert.match(String(incoherent?.message), /précède la date d’émission/);

  const badType = await serverDb.addSupplierDocument(ADMIN, { supplierId: supplier.id, documentType: 'label_magique', fileUrl: 'https://doc.test/x.pdf', issuedOn: '2026-05-02' })
    .then(() => null).catch(error => error);
  assert.match(String(badType?.message), /Type de document inconnu/);

  const unknownSupplier = await serverDb.addSupplierDocument(ADMIN, { supplierId: 'inexistant', documentType: 'cpsr', fileUrl: 'https://doc.test/c.pdf', issuedOn: '2026-05-02' })
    .then(() => null).catch(error => error);
  assert.match(String(unknownSupplier?.message), /Fournisseur introuvable/);

  const accepted = await serverDb.addSupplierDocument(ADMIN, {
    supplierId: supplier.id, documentType: 'gmp_iso_22716', fileUrl: 'https://doc.test/iso22716.pdf',
    issuedOn: '2026-05-02', expiresOn: '2027-05-02', reference: 'CERT-22716-001'
  });
  assert.equal(accepted.recordedBy, ADMIN, 'l’auteur de l’enregistrement est tracé');

  const expired = await serverDb.addSupplierDocument(ADMIN, {
    supplierId: supplier.id, documentType: 'certificate_of_analysis', fileUrl: 'https://doc.test/coa.pdf',
    issuedOn: '2024-01-01', expiresOn: '2024-06-01'
  });
  const compliance = await serverDb.getSupplierCompliance(supplier.id);
  assert.deepEqual(compliance.heldTypes.sort(), ['certificate_of_analysis', 'gmp_iso_22716']);
  assert.deepEqual(compliance.expiredTypes, ['certificate_of_analysis'], 'un document périmé doit être signalé');
  assert.equal(compliance.documents.length, 2);
  assert.ok(expired.id);

  // ---------------------------------------------------------------
  // 6. La route d'import reste protégée : sans jeton, aucun effet.
  // ---------------------------------------------------------------
  reset();
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });
  const port = (listener.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const response = await fetch(`${baseUrl}/api/admin/catalog/import/supplier`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ supplier: 'Fournisseur sans jeton', records: [makeRecord('sans-jeton')] })
    });
    assert.equal(response.status, 401, 'sans jeton la route doit refuser');
    assert.equal((await serverDb.listSuppliers()).length, 0, 'aucun fournisseur ne doit être créé sans jeton');
    assert.equal((await serverDb.getAdminCatalogProducts()).length, 0, 'aucun produit ne doit être créé sans jeton');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Fournisseurs banc : deux écritures = une seule entité, ambiguïté remontée sans écriture, fournisseur découvert non vérifié, document de conformité exige une preuve, route protégée.');
}

runSupplierTests().catch(error => {
  console.error('[FAIL] Fournisseurs banc :', error);
  process.exitCode = 1;
});
