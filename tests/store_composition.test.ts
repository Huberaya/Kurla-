/**
 * CHANTIER 8.2 — la composition du store fonctionne à l'exécution.
 *
 * `tests/store_api_inventory.test.ts` vérifie que les 166 méthodes existent
 * toujours (nom + arité). Ce banc va plus loin : il appelle réellement une
 * méthode de chaque domaine extrait — profil beauté, espace famille,
 * notifications, support — sur le singleton, en écriture puis en relecture.
 *
 * Si un module de domaine n'est pas recollé sur l'instance, ou si une référence
 * `this.` a été mal traduite en `store.` à l'extraction, l'appel échoue ici
 * alors que la compilation, elle, passerait.
 */
import assert from 'node:assert/strict';

import { serverDb } from '../src/lib/serverDb';

const uid = 'composition-probe-user';

async function run(): Promise<void> {
  await serverDb.initialize([
    {
      id: 'composition-probe-product',
      slug: 'sonde-composition',
      name: 'Sonde composition',
      brand: 'Kurla',
      price: 19.9,
      currency: 'EUR',
      category: 'haircare',
      audiences: ['women'],
      hairTypes: ['4c'],
      concerns: ['dryness'],
      is_active: true,
      stock_quantity: 5
    } as any
  ]);

  const failures: string[] = [];
  let calls = 0;
  const check = async (label: string, fn: () => Promise<any>): Promise<any> => {
    calls += 1;
    try {
      return await fn();
    } catch (error: any) {
      failures.push(`${label} -> ${error?.message?.slice(0, 120)}`);
      return undefined;
    }
  };

  // --- profil beauté (src/lib/db/beautyProfileStore.ts) ----------------------
  await check('saveBeautyProfile', () => serverDb.saveBeautyProfile(uid, { hairType: '4c', porosity: 'high' }));
  const profile = await check('getBeautyProfile', () => serverDb.getBeautyProfile(uid));
  assert.ok(profile, 'le profil beauté écrit doit être relisible');
  await check('getBeautyProfileHistory', () => serverDb.getBeautyProfileHistory(uid));
  const photo = await check('uploadBeautyProfilePhoto', () =>
    serverDb.uploadBeautyProfilePhoto(uid, Buffer.from('sonde'), 'photo' as any, new Date().toISOString())
  );
  assert.ok(photo?.id, 'la photo téléversée doit porter un identifiant');
  await check('getBeautyProfilePhotos', () => serverDb.getBeautyProfilePhotos(uid));
  await check('deleteBeautyProfilePhotos', () => serverDb.deleteBeautyProfilePhotos(uid));
  await check('deleteBeautyProfile', () => serverDb.deleteBeautyProfile(uid));

  // --- espace famille (src/lib/db/familyStore.ts) ----------------------------
  const space = await check('createFamilySpace', () => serverDb.createFamilySpace(uid, { name: 'Foyer sonde' }));
  assert.ok(space?.id, 'l’espace famille créé doit être renvoyé');
  const owned = await check('getOwnedFamilySpace', () => serverDb.getOwnedFamilySpace(uid, space.id));
  assert.ok(owned, 'l’espace famille doit être relisible pour son propriétaire');
  await check('getFamilyDashboard', () => serverDb.getFamilyDashboard(uid));

  // --- notifications et emails (src/lib/db/notificationsStore.ts) ------------
  const notification = await check('sendNotification', () =>
    serverDb.sendNotification(uid, 'sonde', 'Sonde composition', 'message de sonde')
  );
  assert.ok(notification?.id, 'la notification doit porter un identifiant');
  const notifications = await check('getNotifications', () => serverDb.getNotifications(uid));
  assert.ok(Array.isArray(notifications) && notifications.length >= 1, 'la notification envoyée doit être relue');
  await check('markNotificationRead', () => serverDb.markNotificationRead(notification.id, uid));
  await check('getNotificationPreferences', () => serverDb.getNotificationPreferences(uid));
  await check('updateNotificationPreferences', () => serverDb.updateNotificationPreferences(uid, { email: true } as any));

  // --- support client (src/lib/db/supportStore.ts) ---------------------------
  const ticket = await check('createSupportTicket', () =>
    serverDb.createSupportTicket(uid, undefined, 'commande', 'Sonde composition', 'bonjour')
  );
  assert.ok(ticket?.id, 'le ticket de support doit être créé');
  await check('getSupportMessages', () => serverDb.getSupportMessages(ticket.id));
  await check('getAllSupportTickets', () => serverDb.getAllSupportTickets());
  const byUser = await check('getSupportTicketsByUser', () => serverDb.getSupportTicketsByUser(uid));
  assert.ok(Array.isArray(byUser) && byUser.length >= 1, 'le ticket créé doit être rattaché à son utilisateur');

  // --- livraison (src/lib/db/shippingStore.ts) -------------------------------
  await check('getShippingAddresses', () => serverDb.getShippingAddresses(uid));
  await check('getShippingRates', () => serverDb.getShippingRates('FR'));
  await check('getShipmentByOrderId', () => serverDb.getShipmentByOrderId('commande-inexistante'));

  // --- retours et remboursements (src/lib/db/returnsStore.ts) ----------------
  await check('getReturnsByUser', () => serverDb.getReturnsByUser(uid));
  await check('getAllReturns', () => serverDb.getAllReturns());

  // --- sessions de l'assistant IA (src/lib/db/aiSessionStore.ts) -------------
  await check('getAiSessions', () => serverDb.getAiSessions(uid));

  // --- candidatures professionnelles (professionalApplicationStore.ts) -------
  await check('getProfessionalApplications', () => serverDb.getProfessionalApplications());
  const directory = await check('getPublicProfessionalDirectory', () => serverDb.getPublicProfessionalDirectory());
  assert.ok(Array.isArray(directory), 'l’annuaire public des professionnels doit être une liste');

  // --- administration (src/lib/db/adminStore.ts) -----------------------------
  await check('recordCatalogSearch', async () => serverDb.recordCatalogSearch('sonde composition', 0));
  const adminMetrics = await check('getAdminAnalyticsMetrics', () => serverDb.getAdminAnalyticsMetrics());
  assert.ok(adminMetrics && typeof adminMetrics.searchesWithoutResultsCount === 'number', 'les KPI admin doivent être agrégés');
  await check('recordAdminAudit', () => serverDb.recordAdminAudit(uid, 'sonde_composition', { source: 'banc' }));

  // --- catalogue (src/lib/db/catalogStore.ts) --------------------------------
  const products = await check('getProducts', () => serverDb.getProducts());
  assert.ok(Array.isArray(products) && products.length >= 1, 'le catalogue initialisé doit contenir le produit de sonde');
  const productId = (products[0] as any).id;
  const product = await check('getProductById', () => serverDb.getProductById(productId));
  assert.ok(product, 'le produit de sonde doit être relisible par identifiant');
  await check('getPublicProducts', () => serverDb.getPublicProducts());
  await check('getProductReviews', () => serverDb.getProductReviews(productId));
  await check('getCatalogTaxonomy', () => serverDb.getCatalogTaxonomy());
  // Le dépôt d'avis vérifié exige un achat réglé : la porte de confiance doit
  // refuser, et ce refus doit passer par le store composé sans se casser.
  calls += 1;
  await assert.rejects(
    () => serverDb.createProductReview(uid, productId, 5, 'Sonde de composition', 'Titre sonde'),
    /achat réglé/,
    'un avis vérifié sans achat réglé doit être refusé'
  );

  // --- inventaire (src/lib/db/inventoryStore.ts) -----------------------------
  const inventory = await check('getInventoryByProductId', () => serverDb.getInventoryByProductId(productId));
  assert.ok(inventory && typeof inventory.quantity === 'number', 'l’inventaire doit renvoyer une quantité');
  await check('getAvailableStock', () => serverDb.getAvailableStock(productId));
  await check('getInventoryByVariantId', () => serverDb.getInventoryByVariantId(productId, 'variante-inexistante'));

  // --- contenus éditoriaux (src/lib/db/contentStore.ts) ----------------------
  await check('getRoutines', () => serverDb.getRoutines());
  await check('getRoutineBySlug', () => serverDb.getRoutineBySlug('routine-inexistante'));

  // --- panier et commandes (src/lib/db/orderStore.ts) ------------------------
  await check('saveCart', () => serverDb.saveCart(uid, null, [{ productId, quantity: 2 }]));
  const cart = await check('getCart', () => serverDb.getCart(uid, null));
  assert.ok(Array.isArray(cart) && cart.length >= 1, 'le panier enregistré doit être relu');

  const orderId = 'ORD-COMPOSITION-8-2C';
  const order = await check('saveOrder', () =>
    serverDb.saveOrder({
      id: orderId,
      userId: uid,
      customerEmail: 'sonde@composition.test',
      items: [{ productId, quantity: 2, price: 19.9, name: 'Sonde composition' }],
      total: 39.8,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any)
  );
  assert.ok(order?.id === orderId, 'la commande doit être créée (verrou de stock inclus)');
  const reloaded = await check('getOrderById', () => serverDb.getOrderById(orderId));
  assert.ok(reloaded?.id === orderId, 'la commande doit être relisible');
  await check('getOrdersByCustomer', () => serverDb.getOrdersByCustomer(uid));
  const history = await check('getOrderStatusHistory', () => serverDb.getOrderStatusHistory(orderId));
  assert.ok(Array.isArray(history) && history.length >= 1, 'la création doit tracer une entrée d’historique');
  assert.equal(serverDb.isTransitionAllowed('payment_pending_webhook', 'paid'), true, 'transition attendue autorisée');

  // --- noyau resté dans serverDb.ts ------------------------------------------
  await check('getProducts', () => serverDb.getProducts());
  await check('getStatusSummary', async () => serverDb.getStatusSummary());

  assert.deepEqual(failures, [], `appels en échec sur le store composé :\n${failures.join('\n')}`);
  assert.ok(calls >= 45, `trop peu de méthodes exercées : ${calls}`);
  console.log(
    `[PASS] Chantier 8.2 : ${calls} méthodes des domaines extraits appelées avec succès sur le store composé.`
  );
}

run().catch(error => {
  console.error('[FAIL] Chantier 8.2 — composition du store :', error);
  process.exitCode = 1;
});
