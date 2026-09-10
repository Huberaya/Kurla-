import assert from 'node:assert/strict';
import {
  buildNeedTexturePages,
  getNeedTexturePageDescriptor,
  getHairTextureTerm,
  productMatchesHairTexture,
} from '../src/lib/needTexturePages';

const pages = buildNeedTexturePages();
assert.ok(pages.length > 0);
assert.equal(new Set(pages.map(page => page.path)).size, pages.length);
assert.ok(pages.every(page => /^\/besoin\/[\w-]+\/[34][ABC]$/.test(page.path)));
assert.ok(pages.some(page => page.path === '/besoin/hydrater-cheveux/4C'));
assert.equal(getHairTextureTerm('4c')?.labelFr, 'Crépus 4C');
assert.equal(getNeedTexturePageDescriptor('spf', '4C'), null);
assert.equal(getNeedTexturePageDescriptor('hydrater-cheveux', 'unknown'), null);

assert.equal(productMatchesHairTexture({ targetHairTypes: ['4A-4C'] }, '4B'), true);
assert.equal(productMatchesHairTexture({ targetHairTypes: ['4A-4C'] }, '3C'), false);
assert.equal(productMatchesHairTexture({ targetHairTypes: ['3A-4C'] }, '4B'), true);
assert.equal(productMatchesHairTexture({ targetHairTypes: [] }, '4B'), false);
assert.equal(productMatchesHairTexture({ name: 'sans-cible' }, '4B'), false);

console.log(`✓ ${pages.length} pages besoin×texture dérivées des taxonomies existantes, sans combinaison invalide`);
