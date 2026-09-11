import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

import {
  PHOTO_PILOT_MAX_PER_MEMBER_30_DAYS,
  PHOTO_PILOT_PROMPT_VERSION,
  PHOTO_PILOT_SCHEMA_VERSION,
  PHOTO_PILOT_QUALITY_VERSION,
  PHOTO_PILOT_RULES_VERSION,
  assessPhotoQuality,
  buildPhotoPilotPrompt,
  sanitizePhotoPilotOutput,
  validatePhotoPilotMetadata
} from '../src/lib/photoPilot';
import { serverDb } from '../src/lib/serverDb';
import { exportUserData } from '../src/lib/db/privacyStore';

function png(width: number, height: number, value: (x: number, y: number) => [number, number, number]): Uint8Array {
  const image = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [r, g, b] = value(x, y);
      image.data[index] = r;
      image.data[index + 1] = g;
      image.data[index + 2] = b;
      image.data[index + 3] = 255;
    }
  }
  return PNG.sync.write(image);
}

async function run(): Promise<void> {
  // Test de route : une identité forgée par en-tête ne peut pas atteindre le
  // pilote ni provoquer une sortie IA.
  const { app } = await import('../server');
  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', resolve);
    listener.once('error', reject);
  });
  try {
    const { port } = listener.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/beauty-profile/photos/not-owned/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'forged-user' },
      body: JSON.stringify({ phototype: 'IV', lighting: 'daylight_even' })
    });
    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  }

  const usable = png(640, 640, (x, y) => [40 + ((x * 31 + y * 17) % 190), 35 + ((x * 19 + y * 29) % 195), 30 + ((x * 13 + y * 23) % 200)]);
  const accepted = assessPhotoQuality(usable, 'image/png');
  assert.equal(accepted.accepted, true);
  assert.equal(accepted.code, 'accepted');
  assert.equal(accepted.width, 640);
  assert.equal(accepted.height, 640);
  assert.ok(accepted.metrics?.edgeEnergy);
  const jpegRgba = Buffer.alloc(640 * 640 * 4);
  for (let i = 0; i < jpegRgba.length; i += 4) {
    jpegRgba[i] = 70 + (i % 150);
    jpegRgba[i + 1] = 80 + ((i / 4) % 140);
    jpegRgba[i + 2] = 90 + ((i / 16) % 130);
    jpegRgba[i + 3] = 255;
  }
  const jpegQuality = assessPhotoQuality(jpeg.encode({ data: jpegRgba, width: 640, height: 640 }, 80).data, 'image/jpeg');
  assert.equal(jpegQuality.accepted, true);

  const soft = assessPhotoQuality(png(640, 640, (x, y) => [35 + Math.floor(x / 8), 45 + Math.floor(y / 8), 55 + Math.floor((x + y) / 16)]), 'image/png');
  assert.equal(soft.accepted, false);
  assert.equal(soft.code, 'low_detail');
  const dark = assessPhotoQuality(png(640, 640, () => [1, 1, 1]), 'image/png');
  assert.equal(dark.accepted, false);
  assert.equal(dark.code, 'too_dark');
  const small = assessPhotoQuality(png(320, 320, (x, y) => [x % 255, y % 255, 80]), 'image/png');
  assert.equal(small.code, 'too_small');
  const webp = assessPhotoQuality(new Uint8Array(Buffer.from('RIFF0000WEBPVP8X')), 'image/webp');
  assert.equal(webp.accepted, false);
  assert.ok(['invalid_dimensions', 'unsupported_format'].includes(webp.code));

  assert.equal(validatePhotoPilotMetadata({ phototype: 'IV', lighting: 'daylight_even' }).ok, true);
  assert.equal(validatePhotoPilotMetadata({ phototype: 4, lighting: 'daylight_even' }).ok, true);
  assert.equal(validatePhotoPilotMetadata({ phototype: 'unknown', lighting: 'daylight_even' }).ok, false);
  assert.equal(validatePhotoPilotMetadata({ phototype: 'IV', lighting: 'backlit' }).ok, false);

  const prompt = buildPhotoPilotPrompt({ phototype: 'IV', lighting: 'daylight_even' });
  assert.ok(prompt.includes(PHOTO_PILOT_PROMPT_VERSION));
  assert.match(prompt, /jamais un diagnostic/i);
  assert.match(prompt, /ne les infère pas/i);
  const safe = sanitizePhotoPilotOutput({ observations: [{ code: 'visible_redness', level: 'high', note: 'diagnostic de maladie' }, { code: 'visible_texture', level: 'low', note: 'texture visible' }] });
  assert.equal(safe.noDiagnosis, true);
  assert.equal(safe.noPhototypeInference, true);
  assert.ok(safe.observations.every(item => !/diagnos|maladie/i.test(item.note)));
  assert.match(safe.safetyAdvice, /professionnel de santé/i);
  assert.match(safe.disclosure, /sans diagnostic/i);

  const userId = 'c8-provenance-test';
  const photoId = 'c8-photo-test';
  serverDb.inMemoryPhotoAiAnalyses = [];
  const first = await serverDb.createPhotoAiAnalysis({
    userId,
    photoId,
    status: 'quality_rejected',
    scope: 'skin_cosmetic_observation',
    provider: 'none',
    model: 'none',
    promptVersion: PHOTO_PILOT_PROMPT_VERSION,
    rulesVersion: PHOTO_PILOT_RULES_VERSION,
    qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
    inputSha256: 'a'.repeat(64),
    declaredPhototype: 'IV',
    declaredLighting: 'daylight_even',
    quality: { code: 'too_dark' },
    errorCode: 'too_dark'
  });
  const rows = await serverDb.listPhotoAiAnalyses(userId, photoId);
  assert.equal(rows[0].id, first.id);
  assert.equal(rows[0].inputSha256, 'a'.repeat(64));
  assert.equal(rows[0].promptVersion, PHOTO_PILOT_PROMPT_VERSION);
  assert.equal(rows[0].rulesVersion, PHOTO_PILOT_RULES_VERSION);
  assert.equal(rows[0].responseSchemaVersion, PHOTO_PILOT_SCHEMA_VERSION);
  assert.equal(rows[0].qualityGateVersion, PHOTO_PILOT_QUALITY_VERSION);
  assert.equal(rows[0].declaredPhototype, 'IV');
  assert.equal(rows[0].declaredLighting, 'daylight_even');
  assert.ok(PHOTO_PILOT_MAX_PER_MEMBER_30_DAYS >= 1);

  const exported = await exportUserData(serverDb, userId);
  assert.equal((exported.sections.photoAiAnalyses as any[]).length, 1);
  const storedPhoto = await serverDb.uploadBeautyProfilePhoto(userId, usable, 'image/png', new Date().toISOString());
  assert.deepEqual(Array.from(await serverDb.getBeautyProfilePhotoBytes(userId, storedPhoto.id) || []), Array.from(usable));
  await serverDb.createPhotoAiAnalysis({
    userId,
    photoId: storedPhoto.id,
    status: 'quality_rejected',
    scope: 'skin_cosmetic_observation',
    provider: 'none',
    model: 'none',
    promptVersion: PHOTO_PILOT_PROMPT_VERSION,
    rulesVersion: PHOTO_PILOT_RULES_VERSION,
    responseSchemaVersion: PHOTO_PILOT_SCHEMA_VERSION,
    qualityGateVersion: PHOTO_PILOT_QUALITY_VERSION,
    inputSha256: 'b'.repeat(64),
    errorCode: 'too_dark'
  });
  await serverDb.deleteBeautyProfilePhoto(userId, storedPhoto.id);
  assert.equal(await serverDb.getBeautyProfilePhotoBytes(userId, storedPhoto.id), undefined);
  assert.equal((await serverDb.listPhotoAiAnalyses(userId, storedPhoto.id)).length, 0);

  console.log('[PASS] C8 photo pilot: qualité, métadonnées déclarées, versions, provenance, export/suppression et langage non médical validés.');
}

run().catch(error => {
  console.error('[FAIL] C8 photo pilot:', error);
  process.exitCode = 1;
});
