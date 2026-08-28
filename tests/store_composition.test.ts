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

  // --- noyau resté dans serverDb.ts ------------------------------------------
  await check('getProducts', () => serverDb.getProducts());
  await check('getStatusSummary', async () => serverDb.getStatusSummary());

  assert.deepEqual(failures, [], `appels en échec sur le store composé :\n${failures.join('\n')}`);
  assert.ok(calls >= 20, `trop peu de méthodes exercées : ${calls}`);
  console.log(
    `[PASS] Chantier 8.2 : ${calls} méthodes des domaines extraits appelées avec succès sur le store composé.`
  );
}

run().catch(error => {
  console.error('[FAIL] Chantier 8.2 — composition du store :', error);
  process.exitCode = 1;
});
