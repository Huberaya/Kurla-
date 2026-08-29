import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';

/**
 * CHANTIER 15B — banc « cockpit catalogue et approvisionnement ».
 *
 * Le critère du chantier : une personne qui ouvre l'écran peut répondre à
 * « ce produit peut-il être vendu, et sinon qu'est-ce qui manque » sans ouvrir
 * une base de données. Ce banc vérifie que la réponse affichée est vraie :
 *
 *  1. les blocages sont **nommés** et rattachés aux produits concernés ;
 *  2. le coût servi est `null` avec sa raison — jamais un chiffre estimé ;
 *  3. les documents listés sont ceux **réellement enregistrés**, pas ceux
 *     annoncés dans un devis ;
 *  4. un produit sans fournisseur est compté à part, pas noyé dans les
 *     blocages éditoriaux ;
 *  5. le récapitulatif de sourcing compte des demandes et des réponses qui
 *     existent ;
 *  6. la route est protégée, sans effet.
 */

const ADMIN = 'admin-cockpit-1';

function reset(): void {
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryProducts = [];
  serverDb.inMemorySourcingItems = [];
  serverDb.inMemoryProductBatches = [];
  serverDb.inMemoryBatchAllocations = [];
  serverDb.inMemoryRfqs = [];
  serverDb.inMemoryRfqResponses = [];
}

function record(slug: string, extra: any = {}): any {
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
    targetAudiences: ['tous_publics'],
    ...extra
  };
}

async function runCockpitTests(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. Le cockpit lit le réel : blocages nommés, produits comptés.
  // ---------------------------------------------------------------
  reset();
  await serverDb.importCatalogRecords(ADMIN, [record('shampoing-doux'), record('masque-porosite')], 'manual');

  let cockpit = await serverDb.getOperationsCockpit();
  assert.equal(cockpit.products, 2, `deux produits doivent être comptés, obtenu ${cockpit.products}`);
  assert.equal(cockpit.rows.length, 2);
  assert.equal(cockpit.rows.every(row => typeof row.ready === 'boolean'), true, 'chaque produit doit porter un verdict binaire');

  // Les blocages nommés couvrent tous les produits non prêts.
  const notReady = cockpit.rows.filter(row => !row.ready);
  const blockedIds = new Set(cockpit.blockers.flatMap(blocker => blocker.productIds));
  for (const row of notReady) {
    assert.ok(blockedIds.has(row.productId), `le produit ${row.productId} n'est pas prêt mais aucun blocage ne le nomme`);
  }
  for (const blocker of cockpit.blockers) {
    assert.ok(blocker.label.length > 0, 'un blocage sans libellé ne dit rien à personne');
    assert.equal(blocker.count, blocker.productIds.length, 'le compteur doit correspondre à la liste');
  }

  // ---------------------------------------------------------------
  // 2. Le coût servi n'est jamais estimé : sans lot, il est null et le dit.
  //    (Chantier 16D : la valeur devient réelle dès qu'un lot est reçu, mais
  //    elle reste calculée à partir de coûts saisis — jamais avancée.)
  // ---------------------------------------------------------------
  assert.equal(cockpit.servedCostAvailable, false, 'sans aucun lot, aucun coût servi ne doit être disponible');
  assert.equal(cockpit.productsWithServedCost, 0);
  for (const row of cockpit.rows) {
    assert.equal(row.servedCostCents, null, `le coût servi de ${row.productId} doit rester null tant qu'aucun lot n'existe`);
    assert.equal(row.batchCount, 0);
    assert.match(row.servedCostReason, /Aucun lot reçu/, 'la raison doit nommer l’absence de lot');
  }

  // Un lot reçu rend le coût servi réel — et la valeur est celle du calcul,
  // pas une estimation : 1 000 unités à 350 c avec 25 000 c de fret = 375 c.
  const shampooRow = cockpit.rows.find(row => row.slug === 'shampoing-doux');
  assert.ok(shampooRow, 'le produit shampoing-doux doit être présent');
  const firstBatch = await serverDb.createBatch(ADMIN, {
    lotReference: 'LOT-COCKPIT-1', productId: shampooRow.productId,
    quantityReceived: 1000, unitCostCents: 350, freightCents: 25000, receivedOn: '2026-08-01'
  });
  assert.equal(firstBatch.servedCostCents, 375);
  cockpit = await serverDb.getOperationsCockpit();
  assert.equal(cockpit.servedCostAvailable, true);
  assert.equal(cockpit.productsWithServedCost, 1);
  const withCost = cockpit.rows.find(row => row.productId === shampooRow.productId);
  assert.equal(withCost.servedCostCents, 375, 'le cockpit doit afficher le coût servi calculé, pas une estimation');
  assert.equal(withCost.batchCount, 1);
  assert.match(withCost.servedCostReason, /Moyenne pondérée sur 1 lot/);
  const stillNull = cockpit.rows.find(row => row.slug === 'masque-porosite');
  assert.equal(stillNull.servedCostCents, null, 'un produit sans lot ne doit toujours pas avoir de coût servi');

  // ---------------------------------------------------------------
  // 3. Provenance et documents : seulement ce qui existe.
  // ---------------------------------------------------------------
  assert.equal(cockpit.productsWithoutSupplier, 2, 'les deux produits n’ont aucune provenance');
  assert.ok(cockpit.rows.every(row => row.documentsHeld.length === 0));

  const supplier = await serverDb.createSupplier(ADMIN, { legalName: 'Hair Liss', supplierType: 'contract_manufacturer' });
  await serverDb.addSupplierDocument(ADMIN, {
    supplierId: supplier.id, documentType: 'gmp_iso_22716',
    fileUrl: 'https://doc.test/iso22716.pdf', issuedOn: '2026-05-02'
  });
  await serverDb.importCatalogRecords(ADMIN, [record('huile-cuir-chevelu')], 'supplier', 'HAIR LISS SAS');

  cockpit = await serverDb.getOperationsCockpit();
  assert.equal(cockpit.products, 3);
  assert.equal(cockpit.productsWithoutSupplier, 2, 'un seul produit a une provenance');
  const linked = cockpit.rows.find(row => row.supplierId === supplier.id);
  assert.ok(linked, 'le produit rattaché doit apparaître avec son fournisseur');
  assert.deepEqual(linked.documentsHeld, ['gmp_iso_22716'], 'seul le document réellement enregistré doit apparaître');
  assert.deepEqual(linked.expiredDocuments, []);

  // Un document périmé est signalé, pas compté comme acquis.
  await serverDb.addSupplierDocument(ADMIN, {
    supplierId: supplier.id, documentType: 'certificate_of_analysis',
    fileUrl: 'https://doc.test/coa.pdf', issuedOn: '2024-01-01', expiresOn: '2024-06-01'
  });
  cockpit = await serverDb.getOperationsCockpit();
  const linked2 = cockpit.rows.find(row => row.supplierId === supplier.id);
  assert.deepEqual(linked2.expiredDocuments, ['certificate_of_analysis']);
  assert.equal(linked2.documentsHeld.length, 2);

  // ---------------------------------------------------------------
  // 4. Le récapitulatif de sourcing compte ce qui existe.
  // ---------------------------------------------------------------
  assert.equal(cockpit.sourcing.itemCount, 0);
  assert.equal(cockpit.sourcing.rfqCount, 0);
  assert.equal(cockpit.sourcing.responseCount, 0);
  assert.equal(cockpit.sourcing.waves.length, 0);

  const item = await serverDb.createSourcingItem(ADMIN, {
    wave: 'vague-1', title: 'Après-shampoing rincé', category: 'soin capillaire',
    rationale: 'Le catalogue lave et scelle, mais ne démêle pas sous la douche.',
    requiredDocuments: ['gmp_iso_22716', 'cpsr']
  });
  const rfq = await serverDb.createRfq(ADMIN, item.id);
  await serverDb.markRfqSent(ADMIN, rfq.id, { supplierId: supplier.id, sentOn: '2026-08-29' });
  await serverDb.recordRfqResponse(ADMIN, rfq.id, { receivedOn: '2026-09-01', unitPriceCents: 420, currency: 'EUR' });

  cockpit = await serverDb.getOperationsCockpit();
  assert.equal(cockpit.sourcing.itemCount, 1);
  assert.equal(cockpit.sourcing.rfqCount, 1);
  assert.equal(cockpit.sourcing.responseCount, 1);
  assert.equal(cockpit.sourcing.awardedCount, 0, 'rien n’est attribué tant que les documents manquent');
  assert.equal(cockpit.sourcing.waves.length, 1);
  const wave = cockpit.sourcing.waves[0];
  assert.equal(wave.wave, 'vague-1');
  assert.equal(wave.inRfq, 1);
  assert.equal(wave.responseCount, 1);

  // ---------------------------------------------------------------
  // 5. La route est protégée, sans effet.
  // ---------------------------------------------------------------
  reset();
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });
  const { port } = listener.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/operations/cockpit`, { headers: { 'content-type': 'application/json' } });
    assert.equal(response.status, 401, 'sans jeton la route doit répondre 401');
    const payload = await response.json().catch(() => ({}));
    assert.equal(payload.error, 'Authentification Supabase requise.');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Cockpit banc : blocages nommés par produit, coût servi calculé à partir des lots et null sans lot, documents limités à ce qui est enregistré, provenance absente comptée à part, sourcing compté au réel, route protégée.');
}

runCockpitTests().catch(error => {
  console.error('[FAIL] Cockpit banc :', error);
  process.exitCode = 1;
});
