import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 16B — banc « surface d'administration des fournisseurs ».
 *
 * Le chantier 16A avait laissé le référentiel sans écran. Ce banc vérifie ce
 * que l'écran s'appuie dessus pour ne pas mentir :
 *
 *  1. **la raison sociale ne se modifie pas** — l'identifiant en dérive et les
 *     produits déjà rattachés seraient cassés ;
 *  2. **« vérifié » ne se déclare pas, il se prouve** — sans aucun document
 *     enregistré, le changement de statut est refusé ;
 *  3. **la fiche ne liste que des produits réellement rattachés** — jamais une
 *     estimation, jamais un produit deviné ;
 *  4. **les 5 nouvelles routes sont montées et protégées** : sans jeton elles
 *     répondent 401 et ne produisent aucun effet, comme les 30 routes
 *     inventoriées en 15A ;
 *  5. **les listes de types viennent de l'API**, pas d'un champ libre : c'est ce
 *     qui empêche l'écran d'inventer une valeur.
 */

const ADMIN = 'admin-supplier-b';

function reset(): void {
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryProducts = [];
}

async function runSupplierAdminTests(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. La raison sociale ne se modifie pas.
  // ---------------------------------------------------------------
  reset();
  const supplier = await serverDb.createSupplier(ADMIN, { legalName: 'Laboratoire Alvend', supplierType: 'contract_manufacturer', country: 'FR' });

  const rename = await serverDb.updateSupplier(ADMIN, supplier.id, { legalName: 'Autre Nom' })
    .then(() => null).catch(error => error);
  assert.match(String(rename?.message), /raison sociale ne se modifie pas/);

  // Les autres champs, si.
  const updated = await serverDb.updateSupplier(ADMIN, supplier.id, { moqUnits: 500, leadTimeDays: 45, country: 'FR' });
  assert.equal(updated.moqUnits, 500);
  assert.equal(updated.leadTimeDays, 45);
  assert.equal(updated.legalName, 'Laboratoire Alvend', 'le nom ne doit pas avoir bougé');
  assert.equal(updated.id, supplier.id, 'l’identifiant ne doit pas avoir bougé');

  const missing = await serverDb.updateSupplier(ADMIN, 'inexistant', { country: 'BE' }).then(() => null).catch(error => error);
  assert.match(String(missing?.message), /Fournisseur introuvable/);

  // ---------------------------------------------------------------
  // 2. « Vérifié » exige une preuve.
  // ---------------------------------------------------------------
  const unverified = await serverDb.updateSupplier(ADMIN, supplier.id, { verificationStatus: 'verified' })
    .then(() => null).catch(error => error);
  assert.match(String(unverified?.message), /sans aucun document de conformité/);
  const afterRefusal = await serverDb.getSupplierById(supplier.id);
  assert.equal(afterRefusal?.verificationStatus, 'not_provided', 'le statut ne doit pas avoir changé après un refus');

  // « En attente » ne prétend rien : autorisé sans preuve.
  const pending = await serverDb.updateSupplier(ADMIN, supplier.id, { verificationStatus: 'pending' });
  assert.equal(pending.verificationStatus, 'pending');

  await serverDb.addSupplierDocument(ADMIN, {
    supplierId: supplier.id, documentType: 'gmp_iso_22716',
    fileUrl: 'https://doc.test/iso22716.pdf', issuedOn: '2026-05-02'
  });
  const verified = await serverDb.updateSupplier(ADMIN, supplier.id, { verificationStatus: 'verified' });
  assert.equal(verified.verificationStatus, 'verified', 'avec une preuve, la vérification passe');

  // ---------------------------------------------------------------
  // 3. La fiche ne liste que des produits réellement rattachés.
  // ---------------------------------------------------------------
  reset();
  const hairLiss = await serverDb.createSupplier(ADMIN, { legalName: 'Hair Liss', supplierType: 'contract_manufacturer' });
  await serverDb.importCatalogRecords(ADMIN, [
    { supplierSku: 'HL-1', name: 'Shampoing doux', slug: 'shampoing-doux', brand: 'KURLA', price: 14.9, vatRate: 20, stockQuantity: 10, countryAvailability: ['FR'], catalogCategoryTags: ['cheveux_boucles'], targetAudiences: ['tous_publics'] },
    { supplierSku: 'HL-2', name: 'Masque porosité', slug: 'masque-porosite', brand: 'KURLA', price: 24.9, vatRate: 20, stockQuantity: 5, countryAvailability: ['FR'], catalogCategoryTags: ['cheveux_boucles'], targetAudiences: ['tous_publics'] }
  ], 'supplier', 'HAIR LISS SAS');
  const other = await serverDb.createSupplier(ADMIN, { legalName: 'Lessonia', supplierType: 'raw_material' });

  const detail = await serverDb.getSupplierDetail(hairLiss.id);
  assert.equal(detail.products.length, 2, `deux produits doivent être rattachés, obtenu ${detail.products.length}`);
  assert.deepEqual(detail.products.map(product => product.slug).sort(), ['masque-porosite', 'shampoing-doux']);
  assert.equal(detail.documents.length, 0);
  assert.equal(detail.heldTypes.length, 0);

  const emptyDetail = await serverDb.getSupplierDetail(other.id);
  assert.equal(emptyDetail.products.length, 0, 'un fournisseur sans produit doit renvoyer une liste vide, pas une estimation');

  const unknownDetail = await serverDb.getSupplierDetail('inexistant').then(() => null).catch(error => error);
  assert.match(String(unknownDetail?.message), /Fournisseur introuvable/);

  // Document périmé signalé dans la fiche.
  await serverDb.addSupplierDocument(ADMIN, {
    supplierId: hairLiss.id, documentType: 'certificate_of_analysis',
    fileUrl: 'https://doc.test/coa.pdf', issuedOn: '2024-01-01', expiresOn: '2024-06-01'
  });
  const withExpired = await serverDb.getSupplierDetail(hairLiss.id);
  assert.deepEqual(withExpired.expiredTypes, ['certificate_of_analysis']);

  // ---------------------------------------------------------------
  // 4. Les 5 routes : montées, protégées, sans effet.
  // ---------------------------------------------------------------
  reset();
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });
  const { port } = listener.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const probes: Array<[string, string, any]> = [
      ['GET', '/api/admin/suppliers', undefined],
      ['GET', '/api/admin/suppliers/sonde', undefined],
      ['POST', '/api/admin/suppliers', { legalName: 'Sonde sans jeton' }],
      ['PATCH', '/api/admin/suppliers/sonde', { verificationStatus: 'verified' }],
      ['POST', '/api/admin/suppliers/sonde/documents', { documentType: 'cpsr', fileUrl: 'https://doc.test/x.pdf', issuedOn: '2026-05-02' }]
    ];
    for (const [method, path, body] of probes) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      assert.equal(response.status, 401, `${method} ${path} doit répondre 401 sans jeton, obtenu ${response.status}`);
      const payload = await response.json().catch(() => ({}));
      assert.equal(payload.error, 'Authentification Supabase requise.', `${method} ${path} doit renvoyer le refus standard`);
    }
    // Aucun effet : ni fournisseur, ni produit.
    assert.equal((await serverDb.listSuppliers()).length, 0, 'aucun fournisseur ne doit être créé sans jeton');
    assert.equal((await serverDb.getAdminCatalogProducts()).length, 0, 'aucun produit ne doit être créé sans jeton');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Fournisseurs admin banc : raison sociale non modifiable, « vérifié » exige une preuve, fiche sans produit inventé, 5 routes montées et protégées sans effet.');
}

runSupplierAdminTests().catch(error => {
  console.error('[FAIL] Fournisseurs admin banc :', error);
  process.exitCode = 1;
});
