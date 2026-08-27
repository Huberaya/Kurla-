import assert from 'node:assert/strict';
import { isProductSuitableForAgeBand } from '../src/lib/familyProfiles';

assert.equal(isProductSuitableForAgeBand({ recommendedAgeBand: 'child', minorSafetyStatus: 'verified', imageSupervisionStatus: 'verified' }, 'child'), true);
assert.equal(isProductSuitableForAgeBand({ recommendedAgeBand: 'child', minorSafetyStatus: 'verified', imageSupervisionStatus: 'verified', adultOnlyActives: ['retinol'] }, 'child'), false);
assert.equal(isProductSuitableForAgeBand({ recommendedAgeBand: 'child', minorSafetyStatus: 'verified', imageSupervisionStatus: 'pending' }, 'child'), false);

process.env.KURLA_TEST_NO_SERVER = 'true';
const { serverDb } = await import('../src/lib/serverDb');
const { app } = await import('../server');
import http from 'node:http';

await serverDb.initialize([]);
const space = await serverDb.createFamilySpace('family-owner', { name: 'Maison test' });
const child = await serverDb.saveFamilyMember('family-owner', {
  familyId: space.id,
  displayName: 'Lina',
  profileKind: 'child',
  ageBand: 'child',
  parentalConsent: false
});
assert.equal(child.consentStatus, 'pending');

await assert.rejects(() => serverDb.saveFamilyPlan('family-owner', {
  familyId: space.id,
  title: 'Routine enfant',
  planType: 'routine',
  audience: 'selected',
  memberIds: [child.id],
  status: 'active'
}), /consentement parental/);

const granted = await serverDb.saveFamilyMember('family-owner', {
  familyId: space.id,
  id: child.id,
  displayName: 'Lina',
  profileKind: 'child',
  ageBand: 'child',
  parentalConsent: true
});
assert.equal(granted.consentStatus, 'granted');
const plan = await serverDb.saveFamilyPlan('family-owner', {
  familyId: space.id,
  title: 'Routine enfant',
  planType: 'routine',
  audience: 'selected',
  memberIds: [child.id],
  schedule: [{ date: '2026-09-01', label: 'Lavage doux' }],
  status: 'active'
});
assert.equal(plan.status, 'active');
assert.equal((await serverDb.getFamilyDashboard('family-owner')).plans.length, 1);

const revoked = await serverDb.saveFamilyMember('family-owner', {
  familyId: space.id,
  id: child.id,
  displayName: 'Lina',
  profileKind: 'child',
  ageBand: 'child',
  parentalConsent: false
});
assert.equal(revoked.consentStatus, 'revoked');

async function request(path: string) {
  const listener = http.createServer(app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try { return await fetch(`http://127.0.0.1:${port}${path}`); } finally { await new Promise<void>(resolve => listener.close(() => resolve())); }
}
assert.equal((await request('/api/family')).status, 401);
console.log('[PASS] Espace famille : profils séparés, consentement mineur, verrouillage des plans et route protégée vérifiés.');
