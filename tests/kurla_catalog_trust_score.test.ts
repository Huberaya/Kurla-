import assert from 'node:assert/strict';
import {
  CATALOG_TRUST_CHECKS,
  computeCatalogTrustScore,
  readCatalogTrustStatus,
} from '../src/lib/catalogTrustScore';

function productWith(status: string, overrides: Record<string, string> = {}) {
  return Object.fromEntries(
    CATALOG_TRUST_CHECKS.map(check => [check.column, overrides[check.id] ?? status])
  );
}

const verified = computeCatalogTrustScore(productWith('verified'));
assert.deepEqual(verified, {
  verifiedCount: 7,
  max: 7,
  availableCount: 7,
  value: 7,
  percentage: 100,
  status: 'verified'
});

const partial = computeCatalogTrustScore(productWith('pending', { ingredients: 'verified', claims: 'verified' }));
assert.equal(partial.status, 'partial');
assert.equal(partial.verifiedCount, 2);
assert.equal(partial.value, 2);
assert.equal(partial.percentage, 29);
assert.equal(partial.availableCount, 7);

const absent = computeCatalogTrustScore({ id: 'no-validation-data' });
assert.equal(absent.status, 'insufficient_data');
assert.equal(absent.value, null);
assert.equal(absent.percentage, null);
assert.equal(absent.verifiedCount, 0);

const snakeCase = computeCatalogTrustScore({
  ingredientVerificationStatus: 'verified',
  claimsValidationStatus: 'verified',
  certificationsValidationStatus: 'verified',
  imagesValidationStatus: 'verified',
  brandVerificationStatus: 'verified',
  translationsValidationStatus: 'verified',
  stockValidationStatus: 'verified',
});
assert.equal(snakeCase.status, 'verified');
assert.equal(readCatalogTrustStatus({ ingredientVerificationStatus: 'verified' }, 'ingredient_verification_status'), 'verified');

console.log('✓ Trust Score public : verified, partial et insufficient_data sans score inventé');
