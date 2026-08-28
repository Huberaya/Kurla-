import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { intelligenceStore } from '../src/lib/intelligenceStore';
import {
  RETAINED_FOR_LEGAL_REASONS,
  deleteUserData,
  exportUserData
} from '../src/lib/db/privacyStore';

/**
 * CHANTIER 9 (bloc A2) — banc « vos données » (feature 43).
 *
 * Trois choses sont vérifiées, parce que ce sont les trois façons dont un
 * droit RGPD rate en pratique :
 *
 *  1. **Personne n'agit sur le compte d'un autre.** Sans session, ni l'export
 *     ni la suppression ne répondent autre chose que 401 — les en-têtes
 *     `x-user-id` forgés ne valent rien (déjà couvert par le banc
 *     authorization, re-vérifié ici sur ces deux routes).
 *  2. **L'export contient réellement les données**, section par section, et
 *     déclare ce qui est conservé pour obligation légale.
 *  3. **La suppression efface vraiment** : après l'appel, les collections sont
 *     vides pour ce membre — et celles d'un autre membre sont intactes.
 */

const MEMBER = 'privacy-member-a';
const NEIGHBOUR = 'privacy-member-b';

async function expectStatus(baseUrl: string, path: string, init: RequestInit, expected: number): Promise<void> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${path} : HTTP ${expected} attendu, reçu ${response.status} : ${body}`);
  }
}

async function runPrivacyTests(): Promise<void> {
  // --- Graine : un membre rempli, et un voisin qui ne doit pas bouger. ---
  // Les objets sont volontairement minimaux : seules les clés que lit la
  // couche vie privée comptent ici.
  serverDb.inMemoryBeautyProfiles.set(MEMBER, { userId: MEMBER, profile: { hairTexture: '4c' }, confidence: { score: 0.4 }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' } as never);
  serverDb.inMemoryBeautyProfiles.set(NEIGHBOUR, { userId: NEIGHBOUR, profile: { hairTexture: '3b' }, confidence: { score: 0.5 }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' } as never);
  serverDb.inMemoryShippingAddresses.set(MEMBER, [{ id: 'addr-1', userId: MEMBER, city: 'Paris' }] as never);
  serverDb.inMemoryNotifications.push({ id: 'notif-1', userId: MEMBER, title: 'Rappel routine' } as never);
  serverDb.inMemoryNotifications.push({ id: 'notif-2', userId: NEIGHBOUR, title: 'Rappel routine' } as never);
  serverDb.inMemoryTickets.push({ id: 'ticket-1', userId: MEMBER, status: 'open' } as never);
  serverDb.inMemoryLoyaltyAccounts.set(MEMBER, { userId: MEMBER, points: 240 } as never);
  await intelligenceStore.addShelfItem(MEMBER, { productId: 'prod-member', category: 'hair' });
  await intelligenceStore.addShelfItem(NEIGHBOUR, { productId: 'prod-neighbour', category: 'skin' });

  // -----------------------------------------------------------------------
  // 1. Aucune action sur le compte d'autrui.
  // -----------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    await expectStatus(baseUrl, '/api/account/export', {}, 401);
    await expectStatus(baseUrl, '/api/account/export', { headers: { 'x-user-id': MEMBER } }, 401);
    await expectStatus(baseUrl, '/api/account/delete', { method: 'POST' }, 401);
    await expectStatus(baseUrl, '/api/account/delete', { method: 'POST', headers: { 'x-user-id': MEMBER } }, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  // -----------------------------------------------------------------------
  // 2. L'export est complet et dit ce qui est conservé.
  // -----------------------------------------------------------------------
  const exported = await exportUserData(serverDb, MEMBER);
  assert.equal(exported.userId, MEMBER);
  assert.deepEqual(exported.retainedForLegalReasons, ['orders', 'payments', 'refunds', 'shipments']);
  assert.deepEqual(RETAINED_FOR_LEGAL_REASONS, ['orders', 'payments', 'refunds', 'shipments']);

  const profile = exported.sections.beautyProfile as { hairTexture?: string } | null;
  assert.equal(profile?.hairTexture, '4c');
  assert.equal((exported.sections.shippingAddresses as unknown[]).length, 1);
  assert.equal((exported.sections.notifications as unknown[]).length, 1);
  assert.equal((exported.sections.supportTickets as unknown[]).length, 1);
  assert.equal((exported.sections.shelf as unknown[]).length, 1);

  // L'export ne contient pas de section « orders » : ces pièces sont conservées
  // pour obligation légale, pas versées dans l'export personnel.
  assert.equal('orders' in exported.sections, false);
  assert.equal('payments' in exported.sections, false);

  // -----------------------------------------------------------------------
  // 3. La suppression efface — et n'efface que ce membre.
  // -----------------------------------------------------------------------
  const deletion = await deleteUserData(serverDb, MEMBER);
  assert.equal(deletion.userId, MEMBER);
  assert.deepEqual(deletion.retainedForLegalReasons, RETAINED_FOR_LEGAL_REASONS);
  // En mode mémoire il n'existe pas de compte d'authentification à supprimer :
  // le drapeau reste honnêtement à false plutôt que de prétendre à un succès.
  assert.equal(deletion.accountDeleted, false);
  assert.ok(typeof deletion.deletedAt === 'string' && deletion.deletedAt.length > 0);

  assert.equal(serverDb.inMemoryBeautyProfiles.has(MEMBER), false);
  assert.equal(serverDb.inMemoryShippingAddresses.has(MEMBER), false);
  assert.equal(serverDb.inMemoryLoyaltyAccounts.has(MEMBER), false);
  assert.equal(serverDb.inMemoryNotifications.some(notification => notification.userId === MEMBER), false);
  assert.equal(serverDb.inMemoryTickets.some(ticket => ticket.userId === MEMBER), false);
  assert.equal((await intelligenceStore.getShelf(MEMBER)).length, 0);

  // Le voisin est intact : la suppression est bornée au compte demandé.
  assert.equal(serverDb.inMemoryBeautyProfiles.has(NEIGHBOUR), true);
  assert.equal(serverDb.inMemoryNotifications.some(notification => notification.userId === NEIGHBOUR), true);
  assert.equal((await intelligenceStore.getShelf(NEIGHBOUR)).length, 1);

  // Un second export après suppression ne renvoie plus rien de personnel.
  const after = await exportUserData(serverDb, MEMBER);
  assert.equal(after.sections.beautyProfile, null);
  assert.equal((after.sections.shippingAddresses as unknown[]).length, 0);
  assert.equal((after.sections.notifications as unknown[]).length, 0);
  assert.equal((after.sections.supportTickets as unknown[]).length, 0);
  assert.equal((after.sections.shelf as unknown[]).length, 0);
  assert.deepEqual(after.retainedForLegalReasons, RETAINED_FOR_LEGAL_REASONS);

  console.log('[PASS] Privacy banc : export complet, suppression effective, aucune action sur un autre compte.');
}

runPrivacyTests().catch(error => {
  console.error('[FAIL] Privacy banc :', error);
  process.exitCode = 1;
});
