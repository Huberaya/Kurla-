/**
 * BANC — L2 « Réassort / réachat » : le signal devient une action tracée
 * ========================================================================
 *
 * Promesse du plan de chantiers : produit ouvert 28 jours → notification →
 * ajout panier en 1 geste, et le réassort apparaît dans l'historique.
 *
 * Ce banc verrouille :
 *  - le signal de cycle : ouvert ≥ 28 j → « Temps de réappro » ; sans date
 *    d'ouverture déclarée, KURLA ne devine pas ;
 *  - la notification : dédupliquée (1 cycle d'ouverture = 1 rappel),
 *    idempotence du run ;
 *  - l'historique : le réassort effectué est tracé, lisible par la membre,
 *    jamais visible par une autre.
 *
 * Tests sur le store en mode mémoire (l'auth HTTP exige un jeton Supabase
 * réel, convention des bancs existants).
 *
 * Exécution : KURLA_STORE_MODE=memory KURLA_TEST_NO_SERVER=true npx tsx tests/kurla_restock_l2.test.ts
 */

import assert from 'node:assert/strict';

import { serverDb } from '../src/lib/serverDb';
import { intelligenceStore } from '../src/lib/intelligenceStore';
import { runShelfReplenishmentAlerts, recordRestockEvent, listRestockEvents } from '../src/lib/db/replenishmentStore';
import { evaluateRestockCycle, ShelfItem } from '../src/lib/shelf';

let checks = 0;
const ok = async (label: string, fn: () => void | Promise<void>) => {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

const item = (extra: Partial<ShelfItem>): ShelfItem => ({
  id: `shelf-${Math.random().toString(36).slice(2, 8)}`,
  userId: 'u-l2',
  status: 'in_use',
  ingredientIds: [],
  createdAt: daysAgo(40),
  updatedAt: daysAgo(1),
  ...extra,
} as ShelfItem);

async function main() {
  // ── 1. Signal de cycle (pur) ──────────────────────────────────────────────
  await ok('cycle : ouvert 29 jours → « il est temps de prévoir le réassort »', async () => {
    const signal = evaluateRestockCycle(item({ id: 'a1', freeLabel: 'Shampoing karité', openedAt: daysAgo(29) }));
    assert.equal(signal.shouldNotify, true);
    assert.equal(signal.daysSinceOpened, 29);
    assert.match(signal.message, /ouvert depuis 29 jours/);
    assert.match(signal.message, /réassort/i);
  });

  await ok('cycle : ouvert 10 jours → rien à faire', async () => {
    const signal = evaluateRestockCycle(item({ id: 'a2', freeLabel: 'Crème', openedAt: daysAgo(10) }));
    assert.equal(signal.shouldNotify, false);
    assert.match(signal.message, /rien à faire/);
  });

  await ok('cycle : sans date d’ouverture déclarée, KURLA ne devine pas', async () => {
    const signal = evaluateRestockCycle(item({ id: 'a3', freeLabel: 'Sérum' }));
    assert.equal(signal.shouldNotify, false);
    assert.equal(signal.daysSinceOpened, null);
    assert.match(signal.message, /ne devine pas/);
  });

  await ok('cycle : un article terminé ou abandonné n’alerte pas', async () => {
    assert.equal(evaluateRestockCycle(item({ id: 'a4', openedAt: daysAgo(60), status: 'finished' })).shouldNotify, false);
    assert.equal(evaluateRestockCycle(item({ id: 'a5', openedAt: daysAgo(60), status: 'abandoned' })).shouldNotify, false);
  });

  await ok('cycle : le seuil est configurable (28 j par défaut)', async () => {
    const at = item({ id: 'a6', openedAt: daysAgo(29) });
    assert.equal(evaluateRestockCycle(at, { reminderDays: 28 }).shouldNotify, true);
    assert.equal(evaluateRestockCycle(at, { reminderDays: 30 }).shouldNotify, false);
  });

  // ── 2. Notifications (store, mode mémoire) ────────────────────────────────
  const USER = 'u-l2-notify';
  const OTHER = 'u-l2-autre';

  await ok('notification : ouvert 29 j → 1 alerte « Temps de réappro », dédupliquée au 2e run', async () => {
    await intelligenceStore.addShelfItem(USER, {
      freeLabel: 'Shampoing doux karité',
      productId: 'p-l2-shampoing',
      status: 'in_use',
      openedAt: daysAgo(29),
    });

    const first = await runShelfReplenishmentAlerts(serverDb, USER, 10);
    assert.equal(first.cycleDue.length, 1, 'le cycle dû est attendu');
    assert.equal(first.notificationsSent, 1, '1 notification au premier run');

    const notifs = await serverDb.getNotifications(USER);
    const restock = notifs.filter(n => n.type === 'restock');
    assert.equal(restock.length, 1);
    assert.equal(restock[0].title, 'Temps de réappro');
    assert.match(restock[0].message, /ouvert depuis/);
    assert.equal(restock[0].link, '/account/shelf');

    // Idempotence : le même jour, le même cycle → rien n'est renvoyé.
    const second = await runShelfReplenishmentAlerts(serverDb, USER, 10);
    assert.equal(second.notificationsSent, 0, 'un second run renvoie une alerte en double');
  });

  await ok('notification : % restant ≤ 20 + consommation déclarée → « Bientôt à court »', async () => {
    await intelligenceStore.addShelfItem(USER, {
      freeLabel: 'Gel hydratant',
      productId: 'p-l2-gel',
      status: 'in_use',
      openedAt: daysAgo(5),
      estimatedRemainingPercent: 15,
    });

    const result = await runShelfReplenishmentAlerts(serverDb, USER, 10);
    const shelfAfter = await intelligenceStore.getShelf(USER);
    const gel = shelfAfter.find(i => i.freeLabel === 'Gel hydratant');
    assert.ok(gel, 'le gel doit être sur l’étagère');
    assert.equal(result.due.length, 1, 'le signal % restant est dû');
    assert.ok(result.cycleDue.every(c => c.itemId !== gel.id), '5 jours d’ouverture ne déclenchent pas le cycle');
    // Le shampoing (29 j) est toujours en cycle dû, mais son alerte a déjà
    // été envoyée au run précédent : seule la nouvelle alerte part.
    assert.equal(result.notificationsSent, 1, 'une alerte déjà envoyée est renvoyée');

    const notifs = await serverDb.getNotifications(USER);
    assert.ok(notifs.some(n => n.type === 'replenishment' && n.title === 'Bientôt à court'));
  });

  await ok('notification : un autre membre ne voit rien des alertes de celui-ci', async () => {
    const notifs = await serverDb.getNotifications(OTHER);
    assert.equal(notifs.length, 0);
  });

  // ── 3. Historique des réassorts (store, mode mémoire) ─────────────────────
  await ok('historique : un réassort est tracé puis lu, plus récent d’abord', async () => {
    const first = await recordRestockEvent(serverDb, USER, {
      shelfItemId: 's-1',
      productId: 'p-l2-shampoing',
      productName: 'Shampoing doux karité',
      source: 'shelf',
    });
    await new Promise(resolve => setTimeout(resolve, 5));
    const second = await recordRestockEvent(serverDb, USER, {
      shelfItemId: 's-2',
      productId: 'p-l2-gel',
      productName: 'Gel hydratant',
      source: 'shelf',
    });

    const history = await listRestockEvents(serverDb, USER);
    assert.equal(history.length, 2);
    assert.equal(history[0].id, second.id, 'le plus récent doit être en tête');
    assert.equal(history[1].id, first.id);
    assert.equal(history[0].productName, 'Gel hydratant');
  });

  await ok('historique : un réassort hors catalogue reste traçable (product_id absent)', async () => {
    const event = await recordRestockEvent(serverDb, USER, {
      shelfItemId: 's-3',
      productName: 'Huile de ricin (marque externe)',
      source: 'shelf',
    });
    assert.equal(event.productId, undefined);
    const history = await listRestockEvents(serverDb, USER);
    assert.ok(history.some(e => e.id === event.id && e.productName?.includes('ricin')));
  });

  await ok('historique : bornage du libellé et source par défaut', async () => {
    const longName = 'x'.repeat(500);
    const event = await recordRestockEvent(serverDb, USER, {
      productName: longName,
      source: 42,
    });
    assert.ok(event.productName!.length <= 200, 'le libellé doit être borné');
    assert.equal(event.source, 'shelf', 'une source invalide retombe sur le défaut');
  });

  await ok('historique : la confidentialité par utilisateur tient', async () => {
    const otherHistory = await listRestockEvents(serverDb, OTHER);
    assert.equal(otherHistory.length, 0, 'un autre membre lit l’historique de celui-ci');
  });

  console.log(`\n${checks} contrôles passés — L2 réassort (cycle 28 j, notifications, historique)\n`);
}

main().catch(error => {
  console.error('[FAIL] L2 réassort :', error);
  process.exitCode = 1;
});
