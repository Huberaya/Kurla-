import { strict as assert } from 'node:assert';
import { serverDb } from '../src/lib/serverDb';
import { sendPushNotification } from '../src/lib/pushDelivery';

async function main(): Promise<void> {
  const userId = '00000000-0000-0000-0000-000000000071';
  const endpoint = 'https://push.example.test/subscription/kurla-user-71';
  const first = await serverDb.savePushSubscription(userId, {
    endpoint,
    keys: { p256dh: 'p'.repeat(32), auth: 'a'.repeat(16) },
    expirationTime: null
  });
  assert.equal(first.userId, userId);
  assert.equal((await serverDb.getPushSubscriptions(userId)).length, 1);

  const updated = await serverDb.savePushSubscription(userId, {
    endpoint,
    keys: { p256dh: 'q'.repeat(32), auth: 'b'.repeat(16) }
  });
  assert.equal(updated.id, first.id);
  assert.equal(updated.keys.p256dh, 'q'.repeat(32));

  await assert.rejects(
    () => serverDb.savePushSubscription(userId, { endpoint: 'http://not-https.example', keys: { p256dh: 'p'.repeat(32), auth: 'a'.repeat(16) } }),
    /Endpoint push invalide/
  );
  assert.equal(await sendPushNotification(serverDb, userId, { title: 'Test', body: 'No VAPID in local tests.' }), 0);

  await serverDb.deletePushSubscription(userId, endpoint);
  assert.equal((await serverDb.getPushSubscriptions(userId)).length, 0);
  console.log('[PASS] Web Push : validation, upsert idempotent, suppression et absence de livraison sans VAPID.');
}

main().catch(error => {
  console.error('[FAIL] Web Push :', error);
  process.exitCode = 1;
});
