import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

process.env.KURLA_STORE_MODE = 'memory';
process.env.KURLA_TEST_NO_SERVER = 'true';
process.env.NODE_ENV = 'test';
process.env.KURLA_TEST_AUTH_TOKEN = 'workspace-integration-admin-token';
process.env.KURLA_TEST_AUTH_ROLE = 'admin';
process.env.KURLA_TEST_AUTH_USER_ID = 'workspace-integration-admin';
process.env.KURLA_TEST_AUTH_EMAIL = 'workspace-integration-admin@example.invalid';

const { app } = await import('../server');
const { serverDb } = await import('../src/lib/serverDb');

const now = new Date().toISOString();
const auth = (workspace: 'skin' | 'hair'): HeadersInit => ({
  Authorization: `Bearer ${process.env.KURLA_TEST_AUTH_TOKEN}`,
  'X-Kurla-Workspace': workspace,
  'Content-Type': 'application/json'
});

function product(id: string, category: 'peau' | 'cheveux') {
  return {
    id,
    slug: id,
    name: category === 'peau' ? 'Sérum Skin de test' : 'Leave-in Hair de test',
    brand: 'KURLA TEST',
    price: category === 'peau' ? 20 : 25,
    basePrice: category === 'peau' ? 20 : 25,
    category,
    description: category === 'peau' ? 'Nettoie et hydrate sans promesse médicale.' : 'Guérit l’eczéma, résultat garanti.',
    isActive: true,
    is_active: true,
    catalogStatus: 'draft',
    catalog_status: 'draft',
    inStock: true,
    stockQuantity: 10,
    countryAvailability: ['FR'],
    concerns: [],
    needs: [],
    ingredients: [],
    variants: []
  };
}

function order(id: string, items: Array<{ productId: string; price: number; name: string }>) {
  return {
    id,
    userId: `user-${id}`,
    customerEmail: `${id.toLowerCase()}@example.invalid`,
    items: items.map(item => ({ ...item, quantity: 1 })),
    total: items.reduce((sum, item) => sum + item.price, 0),
    status: 'paid',
    createdAt: now,
    updatedAt: now
  };
}

async function requestApp(listener: ReturnType<typeof app.listen>, path: string, init: RequestInit = {}) {
  const address = listener.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

function resetMemoryStore(): void {
  const skinProduct = product('skin-product', 'peau');
  const hairProduct = { ...product('hair-product', 'cheveux'), supplierId: 'supplier-hair' };
  serverDb.inMemoryProducts = [skinProduct, hairProduct];
  serverDb.inMemoryOrders = [
    order('ORD-SKIN-1', [{ productId: 'skin-product', price: 20, name: 'Sérum Skin de test' }]),
    order('ORD-HAIR-1', [{ productId: 'hair-product', price: 25, name: 'Leave-in Hair de test' }]),
    order('ORD-MIX-1', [
      { productId: 'skin-product', price: 20, name: 'Sérum Skin de test' },
      { productId: 'hair-product', price: 25, name: 'Leave-in Hair de test' }
    ])
  ] as any;
  serverDb.inMemoryReturns = [
    { id: 'return-skin', orderId: 'ORD-SKIN-1', items: [{ productId: 'skin-product', quantity: 1 }], status: 'requested' },
    { id: 'return-hair', orderId: 'ORD-HAIR-1', items: [{ productId: 'hair-product', quantity: 1 }], status: 'requested' },
    { id: 'return-mix', orderId: 'ORD-MIX-1', items: [
      { productId: 'skin-product', quantity: 1 },
      { productId: 'hair-product', quantity: 1 }
    ], status: 'requested' }
  ] as any;
  serverDb.inMemoryTickets = [
    { id: 'ticket-skin', orderId: 'ORD-SKIN-1', userId: 'user-ORD-SKIN-1', status: 'open' },
    { id: 'ticket-hair', orderId: 'ORD-HAIR-1', userId: 'user-ORD-HAIR-1', status: 'open' },
    { id: 'ticket-mix', orderId: 'ORD-MIX-1', userId: 'user-ORD-MIX-1', status: 'open' }
  ] as any;
  serverDb.inMemorySuppliers = [{ id: 'supplier-hair', legalName: 'Fournisseur Hair de test', supplierType: 'brand' }] as any;
  serverDb.inMemorySupplierDocuments = [];
  serverDb.inMemoryRefunds = [];
  serverDb.inMemoryShipments = new Map();
  serverDb.inMemoryMessages = [];
  serverDb.inMemorySupportEvents = [];
  serverDb.inMemoryReturnEvents = [];
  serverDb.inMemoryStatusHistory = [];
  serverDb.inMemoryAdminSearchEvents = [];
  serverDb.inMemoryAdminAiUsageEvents = [];
}

await serverDb.initialize([]);
resetMemoryStore();

const listener = app.listen(0, '127.0.0.1');
await new Promise<void>((resolve, reject) => {
  listener.once('listening', () => resolve());
  listener.once('error', reject);
});

try {
  const skinCatalogResponse = await requestApp(listener, '/api/admin/catalog/products', { headers: auth('skin') });
  assert.equal(skinCatalogResponse.status, 200);
  const skinCatalog = await skinCatalogResponse.json() as any;
  assert.deepEqual(skinCatalog.products.map((item: any) => item.id), ['skin-product']);

  const hairCatalogResponse = await requestApp(listener, '/api/admin/catalog/products', { headers: auth('hair') });
  assert.equal(hairCatalogResponse.status, 200);
  const hairCatalog = await hairCatalogResponse.json() as any;
  assert.deepEqual(hairCatalog.products.map((item: any) => item.id), ['hair-product']);

  const skinClaimsResponse = await requestApp(listener, '/api/admin/catalog/claims-audit', { headers: auth('skin') });
  assert.equal(skinClaimsResponse.status, 200);
  const skinClaims = await skinClaimsResponse.json() as any;
  assert.equal(skinClaims.scope, 'skin');
  assert.deepEqual(skinClaims.perProduct.map((item: any) => item.productId), ['skin-product']);
  assert.equal(skinClaims.flagged, 0);
  assert.equal(JSON.stringify(skinClaims).includes('hair-product'), false);

  const foreignClaimsResponse = await requestApp(listener, '/api/admin/catalog/claims-audit?productId=hair-product', { headers: auth('skin') });
  assert.equal(foreignClaimsResponse.status, 404);

  const hairClaimsResponse = await requestApp(listener, '/api/admin/catalog/claims-audit', { headers: auth('hair') });
  assert.equal(hairClaimsResponse.status, 200);
  const hairClaims = await hairClaimsResponse.json() as any;
  assert.equal(hairClaims.flagged, 1);
  assert.equal(hairClaims.perProduct[0].hits.some((hit: any) => hit.ruleId === 'therapeutic_claim'), true);
  assert.equal(hairClaims.perProduct[0].hits.some((hit: any) => hit.ruleId === 'guaranteed_result'), true);

  const skinSupplierResponse = await requestApp(listener, '/api/admin/suppliers', { headers: auth('skin') });
  assert.equal(skinSupplierResponse.status, 200);
  const skinSuppliers = await skinSupplierResponse.json() as any;
  assert.deepEqual(skinSuppliers.suppliers.map((item: any) => item.id), [], 'un fournisseur rattaché uniquement à Hair ne doit pas apparaître dans Skin');
  const foreignSupplierDetail = await requestApp(listener, '/api/admin/suppliers/supplier-hair', { headers: auth('skin') });
  assert.equal(foreignSupplierDetail.status, 404);

  const foreignIngredientMutation = await requestApp(listener, '/api/admin/catalog/hair-product/ingredients', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ ingredients: [{ declared: 'Ingrédient étranger' }] })
  });
  assert.equal(foreignIngredientMutation.status, 404);
  const scopedIngredientCoverage = await requestApp(listener, '/api/admin/catalog/ingredient-coverage', { headers: auth('skin') });
  assert.equal(scopedIngredientCoverage.status, 200);
  const ingredientCoverage = await scopedIngredientCoverage.json() as any;
  assert.equal(ingredientCoverage.products, 1);
  assert.equal(ingredientCoverage.ingredientsInCatalog, null);

  const foreignReturnInsight = await requestApp(listener, '/api/admin/return-insights/hair-product', { headers: auth('skin') });
  assert.equal(foreignReturnInsight.status, 404);
  const foreignProfessionalVerification = await requestApp(listener, '/api/admin/professionals/foreign-professional/verify', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ documentRef: 'foreign-document' })
  });
  assert.equal(foreignProfessionalVerification.status, 404);

  const skinOrdersResponse = await requestApp(listener, '/api/orders', { headers: auth('skin') });
  assert.equal(skinOrdersResponse.status, 200);
  const skinOrders = await skinOrdersResponse.json() as any;
  assert.deepEqual(skinOrders.orders.map((item: any) => item.id), ['ORD-SKIN-1', 'ORD-MIX-1']);
  const redactedMixedSkinOrder = skinOrders.orders.find((item: any) => item.id === 'ORD-MIX-1');
  assert.deepEqual(redactedMixedSkinOrder.items.map((item: any) => item.productId), ['skin-product']);
  assert.equal(JSON.stringify(skinOrders).includes('hair-product'), false);

  const skinReturnsResponse = await requestApp(listener, '/api/returns', { headers: auth('skin') });
  assert.equal(skinReturnsResponse.status, 200);
  const skinReturns = await skinReturnsResponse.json() as any;
  assert.deepEqual(skinReturns.returns.map((item: any) => item.id), ['return-skin', 'return-mix']);
  assert.deepEqual(skinReturns.returns.find((item: any) => item.id === 'return-mix').items.map((item: any) => item.productId), ['skin-product']);
  assert.equal(JSON.stringify(skinReturns).includes('hair-product'), false);

  const skinTicketsResponse = await requestApp(listener, '/api/support/tickets', { headers: auth('skin') });
  assert.equal(skinTicketsResponse.status, 200);
  const skinTickets = await skinTicketsResponse.json() as any;
  assert.deepEqual(skinTickets.tickets.map((item: any) => item.id), ['ticket-skin']);

  const skinMetricsResponse = await requestApp(listener, '/api/admin/metrics', { headers: auth('skin') });
  assert.equal(skinMetricsResponse.status, 200);
  const skinMetrics = await skinMetricsResponse.json() as any;
  assert.equal(skinMetrics.metrics.totalOrders, 2, 'la commande mixte reste attribuable à Skin, mais avec ses seules lignes Skin');
  assert.equal(skinMetrics.metrics.registeredUsersCount, null, 'une métrique globale non attribuable ne doit pas fuiter');
  assert.equal(JSON.stringify(skinMetrics).includes('hair-product'), false);

  const skinDashboardResponse = await requestApp(listener, '/api/admin/dashboard', { headers: auth('skin') });
  assert.equal(skinDashboardResponse.status, 200);
  const skinDashboard = await skinDashboardResponse.json() as any;
  assert.deepEqual(skinDashboard.dashboard.products.map((item: any) => item.id), ['skin-product']);
  assert.equal(JSON.stringify(skinDashboard).includes('hair-product'), false);

  const foreignOrderMutation = await requestApp(listener, '/api/admin/orders/ORD-HAIR-1/status', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ status: 'processing' })
  });
  assert.equal(foreignOrderMutation.status, 404);
  assert.equal(serverDb.inMemoryOrders.find(order => order.id === 'ORD-HAIR-1')?.status, 'paid');

  const mixedOrderMutation = await requestApp(listener, '/api/admin/orders/ORD-MIX-1/status', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ status: 'processing' })
  });
  assert.equal(mixedOrderMutation.status, 404, 'une mutation globale ne doit pas agir sur une commande mixte');

  const allowedOrderMutation = await requestApp(listener, '/api/admin/orders/ORD-SKIN-1/status', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ status: 'processing' })
  });
  assert.equal(allowedOrderMutation.status, 200);
  assert.equal(serverDb.inMemoryOrders.find(order => order.id === 'ORD-SKIN-1')?.status, 'processing');

  const foreignReturnMutation = await requestApp(listener, '/api/admin/returns/return-hair/status', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ status: 'approved' })
  });
  assert.equal(foreignReturnMutation.status, 404);
  assert.equal(serverDb.inMemoryReturns.find(item => item.id === 'return-hair')?.status, 'requested');

  const foreignTicketMutation = await requestApp(listener, '/api/admin/support/tickets/ticket-hair/status', {
    method: 'POST',
    headers: auth('skin'),
    body: JSON.stringify({ status: 'resolved' })
  });
  assert.equal(foreignTicketMutation.status, 404);
  assert.equal(serverDb.inMemoryTickets.find(item => item.id === 'ticket-hair')?.status, 'open');

  const foreignCatalogMutation = await requestApp(listener, '/api/admin/catalog/products/hair-product', {
    method: 'PATCH',
    headers: auth('skin'),
    body: JSON.stringify({ name: 'Tentative étrangère' })
  });
  assert.equal(foreignCatalogMutation.status, 404);
  assert.equal(serverDb.inMemoryProducts.find(product => product.id === 'hair-product')?.name, 'Leave-in Hair de test');

  console.log('[PASS] Authenticated workspace integration: lectures, redaction, métriques non attribuables et mutations hors scope vérifiées.');
} finally {
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
}
