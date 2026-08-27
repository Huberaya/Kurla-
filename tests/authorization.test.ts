import type { AddressInfo } from 'node:net';
import { app } from '../server';

/**
 * Negative HTTP authorization tests for the identity/permissions chantier.
 * They deliberately use the legacy client-controlled headers: none may grant
 * access, with or without a fake bearer token.
 */
async function expectStatus(baseUrl: string, path: string, init: RequestInit, expected: number) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${path}: expected HTTP ${expected}, received ${response.status}: ${body}`);
  }
}

async function runAuthorizationNegativeTests() {
  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const address = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await expectStatus(baseUrl, '/api/orders', {}, 401);
    await expectStatus(baseUrl, '/api/orders', {
      headers: {
        'x-user-id': 'user-B',
        'x-user-email': 'victim@example.com'
      }
    }, 401);
    await expectStatus(baseUrl, '/api/orders', {
      headers: {
        'x-admin-key': 'forged-legacy-admin-key',
        'x-user-id': 'attacker'
      }
    }, 401);
    await expectStatus(baseUrl, '/api/admin/metrics', {
      headers: { 'x-admin-key': 'forged-legacy-admin-key' }
    }, 401);
    await expectStatus(baseUrl, '/api/shipments/ORD-private', {
      headers: { 'x-user-id': 'attacker' }
    }, 401);
    await expectStatus(baseUrl, '/api/admin/metrics', {
      headers: {
        Authorization: 'Bearer definitely-not-a-valid-supabase-token',
        'x-admin-key': 'forged-legacy-admin-key'
      }
    }, 401);
    await expectStatus(baseUrl, '/api/beauty-profile', {
      headers: { 'x-user-id': 'attacker', 'x-user-email': 'victim@example.com' }
    }, 401);
    await expectStatus(baseUrl, '/api/beauty-recommendations', {
      headers: { 'x-user-id': 'attacker' }
    }, 401);

    // Co-signature professionnelle : le corps de la requête déclarait autrefois
    // `professionalVerified: true` et un `professionalId` arbitraire, ce qui
    // permettait de forger la co-signature d'un professionnel vérifié. L'identité
    // est désormais résolue depuis le compte authentifié.
    const forgedEndorsement = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'attacker' },
      body: JSON.stringify({
        professionalId: 'victime-professionnelle',
        professionalName: 'Studio usurpé',
        professionalVerified: true,
        clientUserId: 'cliente-victime',
        stance: 'approved',
        rationale: 'Co-signature forgée par un compte sans profil professionnel.',
        isDisplayable: true
      })
    };
    await expectStatus(baseUrl, '/api/endorsements', forgedEndorsement, 401);

    // Espace professionnel et dossiers partagés : aucune donnée sans jeton valide.
    await expectStatus(baseUrl, '/api/professional/me', { headers: { 'x-user-id': 'attacker' } }, 401);
    await expectStatus(baseUrl, '/api/professional/dossier-shares', { headers: { 'x-user-id': 'attacker' } }, 401);

    console.log('[PASS] Negative authorization HTTP tests: forged identity/admin headers never grant access.');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  }
}

runAuthorizationNegativeTests().catch(error => {
  console.error('[FAIL] Negative authorization HTTP tests:', error);
  process.exitCode = 1;
});
