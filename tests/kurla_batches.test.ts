import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { computeServedCostCents, memoryOrderItemKey } from '../src/lib/db/batchStore';

/**
 * CHANTIER 16D — banc « lot, coût servi, double sourcing ».
 *
 * Critère du chantier : « quelles commandes contiennent le lot X » a une réponse
 * en une requête. Ce banc vérifie ce qui rend cette réponse digne de foi :
 *
 *  1. un lot exige une référence, un produit existant, une quantité et un coût —
 *     et le coût servi **se calcule**, il ne s'estime pas ;
 *  2. l'allocation refuse les trois façons dont une traçabilité devient
 *     menteuse : lot d'un autre produit, ligne sur-allouée, lot vidé au-delà de
 *     sa quantité ;
 *  3. la trace remonte bien la commande qui contient le lot ;
 *  4. le double sourcing ne se décrète pas : sans besoin de sourcing rattaché,
 *     la réponse est **indéterminée**, pas « oui » ;
 *  5. les 6 routes sont montées et protégées, sans effet.
 *
 * Le coût servi attendu ici (375 centimes pour 1 000 unités à 3,50 € avec
 * 250 € de fret) est la valeur que la colonne générée en base a réellement
 * renvoyée lors de la vérification de la migration — le mode mémoire et la base
 * doivent dire la même chose.
 */

const ADMIN = 'admin-batches-1';

function reset(): void {
  serverDb.inMemorySuppliers = [];
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryProducts = [];
  serverDb.inMemorySourcingItems = [];
  serverDb.inMemoryRfqs = [];
  serverDb.inMemoryRfqResponses = [];
  serverDb.inMemoryProductBatches = [];
  serverDb.inMemoryBatchAllocations = [];
  serverDb.inMemoryOrders = [];
}

function record(slug: string): any {
  return {
    supplierSku: `SKU-${slug}`, name: `Produit ${slug}`, slug, brand: 'KURLA',
    price: 19.9, vatRate: 20, stockQuantity: 5, countryAvailability: ['FR'],
    catalogCategoryTags: ['cuir_chevelu'], targetAudiences: ['tous_publics']
  };
}

async function runBatchTests(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. Le coût servi se calcule, il ne s'estime pas.
  // ---------------------------------------------------------------
  assert.equal(computeServedCostCents(1000, 350, 25000, 0, 0), 375, '350 × 1000 + 25 000 = 375 000, soit 375 par unité');
  assert.equal(computeServedCostCents(500, 350, 10000, 0, 0), 370);
  // Division entière : arrondi au centime inférieur, jamais au supérieur.
  assert.equal(computeServedCostCents(3, 100, 1, 0, 0), 100, '(300 + 1) / 3 = 100,33 → 100');

  reset();
  await serverDb.importCatalogRecords(ADMIN, [record('shampoing-doux'), record('masque-porosite')], 'manual');
  const products = await serverDb.getAdminCatalogProducts();
  const shampoo = products.find(product => product.slug === 'shampoing-doux');
  const mask = products.find(product => product.slug === 'masque-porosite');

  const noReference = await serverDb.createBatch(ADMIN, { productId: shampoo.id, quantityReceived: 1000, unitCostCents: 350, receivedOn: '2026-08-01' })
    .then(() => null).catch(error => error);
  assert.match(String(noReference?.message), /référence de lot est obligatoire/);

  const noCost = await serverDb.createBatch(ADMIN, { lotReference: 'LOT-1', productId: shampoo.id, quantityReceived: 1000, receivedOn: '2026-08-01' })
    .then(() => null).catch(error => error);
  assert.match(String(noCost?.message), /coût unitaire/);

  const unknownProduct = await serverDb.createBatch(ADMIN, { lotReference: 'LOT-1', productId: 'inexistant', quantityReceived: 1000, unitCostCents: 350, receivedOn: '2026-08-01' })
    .then(() => null).catch(error => error);
  assert.match(String(unknownProduct?.message), /Produit introuvable/);

  const unknownSupplier = await serverDb.createBatch(ADMIN, { lotReference: 'LOT-1', productId: shampoo.id, supplierId: 'inexistant', quantityReceived: 1000, unitCostCents: 350, receivedOn: '2026-08-01' })
    .then(() => null).catch(error => error);
  assert.match(String(unknownSupplier?.message), /Fournisseur introuvable/);

  const badDates = await serverDb.createBatch(ADMIN, { lotReference: 'LOT-1', productId: shampoo.id, quantityReceived: 1000, unitCostCents: 350, receivedOn: '2026-08-01', expiresOn: '2026-01-01' })
    .then(() => null).catch(error => error);
  assert.match(String(badDates?.message), /expiration précède/);

  const supplier = await serverDb.createSupplier(ADMIN, { legalName: 'Hair Liss', supplierType: 'contract_manufacturer' });
  const batch = await serverDb.createBatch(ADMIN, {
    lotReference: 'LOT-2026-001', productId: shampoo.id, supplierId: supplier.id,
    quantityReceived: 1000, unitCostCents: 350, freightCents: 25000, receivedOn: '2026-08-01'
  });
  assert.equal(batch.servedCostCents, 375, 'le coût servi doit correspondre à la valeur produite par la colonne générée en base');
  assert.equal(batch.currency, 'EUR');

  // ---------------------------------------------------------------
  // 2. L'allocation refuse les trois traçabilités menteuses.
  // ---------------------------------------------------------------
  serverDb.inMemoryOrders = [{
    id: 'ORD-TEST-1',
    userId: 'user-1',
    customerEmail: 'client@test.local',
    status: 'paid',
    total: 19.9,
    currency: 'EUR',
    createdAt: '2026-08-05T10:00:00.000Z',
    items: [
      { productId: shampoo.id, quantity: 3, price: 19.9, name: 'Produit shampoing-doux' },
      { productId: mask.id, quantity: 1, price: 24.9, name: 'Produit masque-porosite' }
    ]
  }] as never;

  const shampooLine = memoryOrderItemKey('ORD-TEST-1', shampoo.id);
  const maskLine = memoryOrderItemKey('ORD-TEST-1', mask.id);

  // a) lot d'un autre produit que la ligne
  const crossProduct = await serverDb.allocateBatchToOrderItem(ADMIN, { batchId: batch.id, orderItemId: maskLine, quantity: 1 })
    .then(() => null).catch(error => error);
  assert.match(String(crossProduct?.message), /porte le produit/, 'un lot ne peut pas être alloué à la ligne d’un autre produit');

  // b) ligne sur-allouée
  const overLine = await serverDb.allocateBatchToOrderItem(ADMIN, { batchId: batch.id, orderItemId: shampooLine, quantity: 4 })
    .then(() => null).catch(error => error);
  assert.match(String(overLine?.message), /déjà allouée/, 'on ne peut pas allouer plus que la ligne');

  // c) lot vidé au-delà de sa quantité
  const smallBatch = await serverDb.createBatch(ADMIN, {
    lotReference: 'LOT-2026-002', productId: shampoo.id, supplierId: supplier.id,
    quantityReceived: 1, unitCostCents: 400, receivedOn: '2026-08-02'
  });
  assert.equal(smallBatch.servedCostCents, 400);
  await serverDb.allocateBatchToOrderItem(ADMIN, { batchId: smallBatch.id, orderItemId: shampooLine, quantity: 1 });
  const overBatch = await serverDb.allocateBatchToOrderItem(ADMIN, { batchId: smallBatch.id, orderItemId: shampooLine, quantity: 1 })
    .then(() => null).catch(error => error);
  assert.match(String(overBatch?.message), /le lot contient 1 unité/, 'on ne peut pas vider un lot au-delà de sa quantité');

  const unknownLine = await serverDb.allocateBatchToOrderItem(ADMIN, { batchId: batch.id, orderItemId: 'ORD-TEST-1:inexistant', quantity: 1 })
    .then(() => null).catch(error => error);
  assert.match(String(unknownLine?.message), /Ligne de commande introuvable/);

  // ---------------------------------------------------------------
  // 3. Le critère : quelles commandes contiennent le lot.
  // ---------------------------------------------------------------
  await serverDb.allocateBatchToOrderItem(ADMIN, { batchId: batch.id, orderItemId: shampooLine, quantity: 2 });

  const trace = await serverDb.getOrdersContainingBatch(smallBatch.id);
  assert.equal(trace.length, 1, 'le petit lot est dans une commande');
  assert.equal(trace[0].orderId, 'ORD-TEST-1');
  assert.equal(trace[0].orderStatus, 'paid');
  assert.equal(trace[0].allocatedQuantity, 1);
  assert.equal(trace[0].servedCostCents, 400);
  assert.equal(trace[0].lotReference, 'LOT-2026-002');

  const traceBig = await serverDb.getOrdersContainingBatch(batch.id);
  assert.equal(traceBig.length, 1);
  assert.equal(traceBig[0].allocatedQuantity, 2);
  assert.equal(traceBig[0].orderedQuantity, 3);

  const emptyTrace = await serverDb.getOrdersContainingBatch('lot-inexistant');
  assert.deepEqual(emptyTrace, [], 'un lot inconnu ne remonte aucune commande');

  // ---------------------------------------------------------------
  // 3bis. Les lignes allouables exposent la capacité restante réelle.
  // ---------------------------------------------------------------
  let allocatable = await serverDb.listAllocatableOrderItems(shampoo.id);
  assert.equal(allocatable.length, 1, 'une ligne de commande porte ce produit');
  assert.equal(allocatable[0].orderId, 'ORD-TEST-1');
  assert.equal(allocatable[0].orderedQuantity, 3);
  // 1 unité du petit lot + 2 du grand ont été allouées plus haut.
  assert.equal(allocatable[0].allocatedQuantity, 3);
  assert.equal(allocatable[0].remainingQuantity, 0, 'rien ne doit rester à allouer');

  const maskLines = await serverDb.listAllocatableOrderItems(mask.id);
  assert.equal(maskLines.length, 1);
  assert.equal(maskLines[0].remainingQuantity, 1, 'la ligne de masque n’a rien d’alloué');

  const noProduct = await serverDb.listAllocatableOrderItems('')
    .then(() => null).catch(error => error);
  assert.match(String(noProduct?.message), /produit est obligatoire/);

  // ---------------------------------------------------------------
  // 4. Le double sourcing ne se décrète pas.
  // ---------------------------------------------------------------
  let report = await serverDb.getDoubleSourcingReport();
  assert.equal(report.products, 1, 'un seul produit a reçu un lot');
  assert.equal(report.undetermined, 1, 'sans besoin de sourcing rattaché, la qualification est indéterminée');
  assert.equal(report.rows[0].hasSecondSource, null, 'la réponse doit être null, pas true');
  assert.equal(report.rows[0].qualificationBasis, null);

  // Avec un besoin rattaché mais aucun autre fournisseur qualifié : faux.
  reset();
  await serverDb.importCatalogRecords(ADMIN, [record('shampoing-doux')], 'manual');
  const product2 = (await serverDb.getAdminCatalogProducts())[0];
  const supplier2 = await serverDb.createSupplier(ADMIN, { legalName: 'Façonnier Unique', supplierType: 'contract_manufacturer' });
  const item = await serverDb.createSourcingItem(ADMIN, {
    wave: 'vague-1', title: 'Après-shampoing rincé', category: 'soin capillaire',
    rationale: 'Le catalogue lave et scelle, mais ne démêle pas sous la douche.',
    requiredDocuments: ['cpsr', 'gmp_iso_22716']
  });
  const batch2 = await serverDb.createBatch(ADMIN, {
    lotReference: 'LOT-2026-010', productId: product2.id, supplierId: supplier2.id, sourcingItemId: item.id,
    quantityReceived: 100, unitCostCents: 300, receivedOn: '2026-08-01'
  });
  report = await serverDb.getDoubleSourcingReport();
  assert.equal(report.withoutSecondSource, 1);
  assert.equal(report.rows[0].hasSecondSource, false, 'sans second fournisseur qualifié, la réponse est false');
  assert.equal(report.rows[0].qualificationBasis, item.id);
  assert.deepEqual(report.rows[0].requiredDocuments.sort(), ['cpsr', 'gmp_iso_22716']);

  // Un second fournisseur qualifié existe → vrai.
  const alternative = await serverDb.createSupplier(ADMIN, { legalName: 'Second Façonnier', supplierType: 'contract_manufacturer' });
  for (const documentType of ['cpsr', 'gmp_iso_22716']) {
    await serverDb.addSupplierDocument(ADMIN, {
      supplierId: alternative.id, documentType, fileUrl: `https://doc.test/${documentType}.pdf`, issuedOn: '2026-06-01'
    });
  }
  report = await serverDb.getDoubleSourcingReport();
  assert.equal(report.withSecondSource, 1);
  assert.equal(report.rows[0].hasSecondSource, true);
  assert.deepEqual(report.rows[0].qualifiedAlternatives.map(entry => entry.supplierId), [alternative.id]);

  // Un fournisseur qui n'a qu'une partie des documents n'est pas qualifié.
  const partial = await serverDb.createSupplier(ADMIN, { legalName: 'Façonnier Partiel', supplierType: 'contract_manufacturer' });
  await serverDb.addSupplierDocument(ADMIN, {
    supplierId: partial.id, documentType: 'cpsr', fileUrl: 'https://doc.test/cpsr.pdf', issuedOn: '2026-06-01'
  });
  report = await serverDb.getDoubleSourcingReport();
  assert.deepEqual(report.rows[0].qualifiedAlternatives.map(entry => entry.supplierId), [alternative.id],
    'un fournisseur sans tous les documents exigés n’est pas une alternative qualifiée');
  assert.ok(batch2.id);

  // ---------------------------------------------------------------
  // 5. Les 6 routes : montées, protégées, sans effet.
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
      ['GET', '/api/admin/batches', undefined],
      ['POST', '/api/admin/batches', { lotReference: 'SONDE', productId: 'sonde', quantityReceived: 10, unitCostCents: 100, receivedOn: '2026-08-01' }],
      ['GET', '/api/admin/batches/sonde/trace', undefined],
      ['POST', '/api/admin/batches/sonde/allocations', { orderItemId: 'sonde', quantity: 1 }],
      ['GET', '/api/admin/double-sourcing', undefined],
      ['GET', '/api/admin/order-items?productId=sonde', undefined]
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
    assert.equal((await serverDb.listBatches()).length, 0, 'aucun lot ne doit être créé sans jeton');
    assert.equal(serverDb.inMemoryBatchAllocations.length, 0, 'aucune allocation sans jeton');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Lots banc : coût servi calculé et identique à la base, allocation refusant les trois traçabilités menteuses, trace remontant la commande, lignes allouables à capacité restante exacte, double sourcing indéterminé plutôt que décrété, 6 routes protégées.');
}

runBatchTests().catch(error => {
  console.error('[FAIL] Lots banc :', error);
  process.exitCode = 1;
});
