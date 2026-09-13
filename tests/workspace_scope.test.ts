import assert from 'node:assert/strict';

import {
  filterOrderItems,
  isProductInWorkspace,
  orderForWorkspace,
  orderFullyInWorkspace,
  orderInWorkspace,
  professionalInWorkspace,
  prospectInWorkspace,
  readWorkspaceScope,
  returnForWorkspace,
  sourcingItemInWorkspace,
} from '../src/server/workspaceScope';

assert.equal(readWorkspaceScope({ header: (name: string) => name === 'x-kurla-workspace' ? 'skin' : undefined, query: {} } as any), 'skin');
assert.equal(readWorkspaceScope({ header: () => undefined, query: { scope: 'hair' } } as any), 'hair');
assert.equal(readWorkspaceScope({ header: () => 'other', query: {} } as any), undefined);

const skin = { id: 'skin-1', category: 'peau' };
const hair = { id: 'hair-1', category: 'cheveux' };
assert.equal(isProductInWorkspace(skin, 'skin'), true);
assert.equal(isProductInWorkspace({ id: 'kit-1', category: 'kits' }, 'skin'), true);
assert.equal(isProductInWorkspace({ id: 'unknown-1', category: 'accessoires' }, 'hair'), true);
assert.equal(isProductInWorkspace(skin, 'hair'), false);
assert.equal(isProductInWorkspace(hair, 'hair'), true);
assert.equal(isProductInWorkspace(hair, 'skin'), false);

const scope = new Set(['skin-1']);
const order = {
  id: 'order-1',
  items: [
    { productId: 'skin-1', quantity: 1 },
    { productId: 'hair-1', quantity: 1 },
  ],
} as any;
assert.equal(orderInWorkspace(order, scope), true);
assert.equal(orderFullyInWorkspace(order, scope), false);
assert.equal(orderFullyInWorkspace({ ...order, items: [{ productId: 'skin-1' }] } as any, scope), true);
assert.deepEqual(filterOrderItems(order.items, scope), [{ productId: 'skin-1', quantity: 1 }]);
assert.deepEqual(orderForWorkspace({ ...order, total: 30 } as any, scope)?.items, [{ productId: 'skin-1', quantity: 1 }]);
assert.equal(orderForWorkspace({ ...order, total: 30 } as any, scope)?.total, 0);
assert.equal(orderInWorkspace({ ...order, items: [{ productId: 'hair-1' }] } as any, scope), false);
assert.equal(orderForWorkspace({ ...order, items: [{ productId: 'hair-1' }] } as any, scope), undefined);
assert.deepEqual(returnForWorkspace({ id: 'return-1', items: [{ productId: 'hair-1' }, { productId: 'skin-1' }] }, scope)?.items, [{ productId: 'skin-1' }]);

assert.equal(professionalInWorkspace({ profession: 'Esthéticienne spécialisée SPF et phototypes' }, 'skin'), true);
assert.equal(professionalInWorkspace({ profession: 'Coiffeur cheveux texturés' }, 'skin'), false);
assert.equal(professionalInWorkspace({ profession: 'Coiffeur cheveux texturés' }, 'hair'), true);
assert.equal(sourcingItemInWorkspace({ category: 'skincare', title: 'Whitecast SPF' }, 'skin'), true);
assert.equal(sourcingItemInWorkspace({ category: 'accessoire', title: 'Bonnet satin cheveux' }, 'hair'), true);
assert.equal(prospectInWorkspace({ specialty: 'skin solar SPF' }, 'skin'), true);
assert.equal(prospectInWorkspace({ specialty: 'marque cheveux texturés' }, 'skin'), false);

console.log('[PASS] Workspace scope : lectures, filtres de lignes et gardes Skin/Hair vérifiés.');
