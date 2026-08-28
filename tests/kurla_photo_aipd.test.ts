import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import {
  PHOTO_AIPD,
  PHOTO_MAX_PER_MEMBER,
  PHOTO_RETENTION_DAYS,
  purgeExpiredBeautyProfilePhotos
} from '../src/lib/photoAipd';

/**
 * CHANTIER 9 (bloc A3) — banc « photo encadrée par AIPD » (feature 11).
 *
 * L'analyse d'impact ne vaut que si elle est appliquée. Ce banc vérifie donc
 * trois choses :
 *  1. l'analyse est **lisible avant l'envoi** (route publique) et cohérente avec
 *     le document `docs/KURLA_AIPD_PHOTO.md` ;
 *  2. la **rétention annoncée est réellement appliquée** — la purge détruit les
 *     photos périmées et laisse les autres ;
 *  3. la purge globale est **réservée à l'administration**.
 */

const DAY = 24 * 60 * 60 * 1000;

function photo(id: string, userId: string, createdAt: string) {
  return {
    id,
    storagePath: `${userId}/${id}`,
    mimeType: 'image/jpeg',
    sizeBytes: 2048,
    consentAt: createdAt,
    createdAt
  } as never;
}

async function runPhotoAipdTests(): Promise<void> {
  // ---------------------------------------------------------------------
  // 1. L'analyse d'impact est publique, complète et cohérente.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/privacy/photo-aipd`);
    assert.equal(response.status, 200);
    const body = await response.json() as {
      aipd: typeof PHOTO_AIPD;
      retentionDays: number;
      maxPhotosPerMember: number;
    };
    assert.equal(body.aipd.reference, 'AIPD-KURLA-PHOTO-v1');
    assert.equal(body.retentionDays, 180);
    assert.equal(body.maxPhotosPerMember, 10);
    assert.ok(body.aipd.purposes.length >= 2);
    assert.ok(body.aipd.limits.some(limit => /diagnostic médical/i.test(limit)));
    assert.ok(body.aipd.notProcessed.some(item => /reconnaissance faciale/i.test(item)));

    // La purge globale n'est pas ouverte à n'importe qui.
    const purge = await fetch(`${baseUrl}/api/admin/maintenance/photo-purge`, { method: 'POST' });
    assert.equal(purge.status, 401);
    const forged = await fetch(`${baseUrl}/api/admin/maintenance/photo-purge`, {
      method: 'POST',
      headers: { 'x-user-id': 'attacker', 'x-admin-key': 'forged' }
    });
    assert.equal(forged.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  // Le document humain et la constante exécutable portent la même référence :
  // l'un ne peut pas dériver de l'autre sans que ce banc tombe.
  const document = readFileSync(join(process.cwd(), 'docs', 'KURLA_AIPD_PHOTO.md'), 'utf8');
  assert.ok(document.includes(PHOTO_AIPD.reference));
  assert.ok(document.includes(`${PHOTO_RETENTION_DAYS} jours`));
  assert.equal(PHOTO_AIPD.retentionDays, PHOTO_RETENTION_DAYS);
  assert.equal(PHOTO_AIPD.maxPhotosPerMember, PHOTO_MAX_PER_MEMBER);

  // ---------------------------------------------------------------------
  // 2. La rétention annoncée est appliquée : purge sélective.
  // ---------------------------------------------------------------------
  const now = new Date('2026-08-28T12:00:00.000Z');
  const member = 'photo-member';
  const lapsed = 'photo-lapsed';
  const neighbour = 'photo-neighbour';

  serverDb.inMemoryBeautyProfilePhotos.set(member, [
    photo('p-recent', member, new Date(now.getTime() - 10 * DAY).toISOString()),
    photo('p-old', member, new Date(now.getTime() - (PHOTO_RETENTION_DAYS + 1) * DAY).toISOString())
  ]);
  serverDb.inMemoryBeautyProfilePhotos.set(lapsed, [
    photo('p-gone', lapsed, new Date(now.getTime() - (PHOTO_RETENTION_DAYS + 40) * DAY).toISOString())
  ]);
  serverDb.inMemoryBeautyProfilePhotos.set(neighbour, [
    photo('p-fresh', neighbour, new Date(now.getTime() - 2 * DAY).toISOString())
  ]);

  const result = await purgeExpiredBeautyProfilePhotos(serverDb, now);
  assert.equal(result.retentionDays, PHOTO_RETENTION_DAYS);
  assert.equal(result.photosPurged, 2);
  assert.equal(result.membersAffected, 2);

  const kept = serverDb.inMemoryBeautyProfilePhotos.get(member) ?? [];
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 'p-recent');
  assert.equal(serverDb.inMemoryBeautyProfilePhotos.has(lapsed), false);
  assert.equal((serverDb.inMemoryBeautyProfilePhotos.get(neighbour) ?? []).length, 1);

  // Une seconde purge ne trouve plus rien : l'opération est idempotente.
  const again = await purgeExpiredBeautyProfilePhotos(serverDb, now);
  assert.equal(again.photosPurged, 0);
  assert.equal(again.membersAffected, 0);

  console.log('[PASS] Photo AIPD banc : analyse publique et cohérente, rétention réellement appliquée, purge réservée à l’admin.');
}

runPhotoAipdTests().catch(error => {
  console.error('[FAIL] Photo AIPD banc :', error);
  process.exitCode = 1;
});
