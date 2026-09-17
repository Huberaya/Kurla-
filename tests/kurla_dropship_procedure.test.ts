/**
 * CHANTIER 9 — Dropship année 1 branché sur product_sources.
 * 0 API. Cosmétique Skin ≠ 24–48h. Hair accessoires (fulfillment.ts) intacts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DROPSHIP_TOOLS_IMMEDIATE, isDropshipToolProduct } from '../src/lib/fulfillment';
import {
  badgesForDropshipToggle,
  buildDropshipPurchaseOrder,
  canPersistDropship24hBadge,
  dropshipYear1Checklist,
  isSkinCosmeticCategory,
  mailtoHref,
  promisesDropship24h,
  stripDropship24hBadges,
  YEAR1_DROPSHIP_MAX_LEAD_DAYS,
} from '../src/lib/dropshipProcedure';
import type { ProductSource } from '../src/lib/supplyModel';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

const dropshipSource = (over: Partial<ProductSource> = {}): ProductSource => ({
  id: 'src-ds-1',
  productId: 'prod-1',
  supplierId: 'sup-1',
  partnerName: null,
  model: 'dropshipping',
  isPrimary: true,
  costCents: 400,
  feeCents: null,
  fulfillmentCostCents: null,
  commissionPct: null,
  affiliateUrl: null,
  cookieDays: null,
  leadTimeDays: 1,
  shipsFrom: 'NL',
  currency: 'EUR',
  available: true,
  notes: null,
  ...over,
});

function main(): void {
  assert.equal(YEAR1_DROPSHIP_MAX_LEAD_DAYS, 2);
  assert.equal(isSkinCosmeticCategory('peau'), true);
  assert.equal(isSkinCosmeticCategory('teint'), true);
  assert.equal(isSkinCosmeticCategory('accessoires'), false);
  assert.equal(isSkinCosmeticCategory('cheveux'), false);
  assert.equal(canPersistDropship24hBadge('peau'), false);
  assert.equal(canPersistDropship24hBadge('accessoires'), true);

  assert.equal(promisesDropship24h({ id: 'peau-ess-001', category: 'peau', badges: ['dropship_24_48h'] }), false);
  assert.equal(promisesDropship24h({ id: 'peau-c9', category: 'peau' }, [dropshipSource({ productId: 'peau-c9' })]), false);

  assert.equal(promisesDropship24h({ id: 'acc-c9', category: 'accessoires' }, [dropshipSource({ productId: 'acc-c9', leadTimeDays: 1 })]), true);
  assert.equal(promisesDropship24h({ id: 'acc-slow', category: 'accessoires' }, [dropshipSource({ productId: 'acc-slow', leadTimeDays: 5 })]), false);

  assert.equal(isDropshipToolProduct({ id: 'p35', category: 'accessoires' }), true);
  assert.equal(promisesDropship24h({ id: 'p35', category: 'accessoires' }), true);
  assert.ok((DROPSHIP_TOOLS_IMMEDIATE as readonly string[]).includes('p35'));

  assert.deepEqual(badgesForDropshipToggle(true, 'peau', true), []);
  assert.deepEqual(badgesForDropshipToggle(true, 'accessoires', false), ['dropship_24_48h']);
  assert.deepEqual(stripDropship24hBadges(['dropship_24_48h', 'hero']), ['hero']);

  const po = buildDropshipPurchaseOrder({
    poNumber: 'KURLA-DS-C9',
    productName: 'Peigne afro',
    productId: 'p35',
    quantity: 2,
    unitCostEur: 2,
    supplierName: 'AfricanFabs',
    supplierEmail: 'info@africanfabs.com',
    shipsFrom: 'NL',
    leadTimeDays: 1,
    category: 'accessoires',
  });
  assert.equal(po.promises24h, true);
  assert.match(po.body, /KURLA-DS-C9/);
  assert.match(po.body, /pas d’API/i);
  assert.ok(po.mailtoHref && po.mailtoHref.startsWith('mailto:'));
  assert.equal(mailtoHref('a@b.c', 's', 'b').startsWith('mailto:'), true);

  const skinPo = buildDropshipPurchaseOrder({
    poNumber: 'KURLA-DS-SKIN',
    productName: 'Sérum',
    productId: 'peau-c9',
    quantity: 1,
    unitCostEur: null,
    supplierName: 'Weleda',
    supplierEmail: null,
    shipsFrom: null,
    leadTimeDays: 1,
    category: 'peau',
  });
  assert.equal(skinPo.promises24h, false);
  assert.equal(skinPo.mailtoHref, null);
  assert.match(skinPo.body, /COSMÉTIQUE SKIN/i);
  assert.match(skinPo.body, /à obtenir/);

  const check = dropshipYear1Checklist({
    product: { id: 'p35', category: 'accessoires' },
    source: dropshipSource({ productId: 'p35' }),
    supplierEmail: 'info@africanfabs.com',
  });
  assert.equal(check.ok, true);
  assert.equal(check.promises24h, true);

  const skinCheck = dropshipYear1Checklist({
    product: { id: 'peau-c9', category: 'peau', badges: ['dropship_24_48h'] },
    source: dropshipSource({ productId: 'peau-c9' }),
    supplierEmail: 'ops@weleda.test',
  });
  assert.equal(skinCheck.promises24h, false);
  assert.ok(skinCheck.items.some(item => item.id === 'cosmetic' && item.ok));

  const moduleSrc = read('src/lib/dropshipProcedure.ts');
  assert.doesNotMatch(moduleSrc, /emailService/);
  assert.doesNotMatch(moduleSrc, /fetch\(/);
  assert.doesNotMatch(moduleSrc, /aliexpress|spocket|cjdropship/i);

  const fulfillment = read('src/lib/fulfillment.ts');
  assert.match(fulfillment, /DROPSHIP_TOOLS_IMMEDIATE/);
  assert.doesNotMatch(fulfillment, /dropshipProcedure/);
  const launch = read('src/lib/launchCatalog.ts');
  assert.doesNotMatch(launch, /dropshipProcedure/);
  assert.doesNotMatch(launch, /productSourceStore/);

  const panel = read('src/components/ProductSourcesPanel.tsx');
  assert.match(panel, /buildDropshipPurchaseOrder/);
  assert.match(panel, /mailtoHref|mailto:/);
  assert.doesNotMatch(panel, /workspace === ['\"]skin['\"]/);

  const catalog = read('src/components/CatalogAdminPanel.tsx');
  assert.match(catalog, /canPersistDropship24hBadge|isSkinCosmeticCategory/);
  assert.match(catalog, /badgesForDropshipToggle/);

  const guide = read('src/components/DropshipGuidePanel.tsx');
  assert.match(guide, /product_sources/);
  assert.match(guide, /Cosmétique Skin/);

  const store = read('src/lib/db/productSourceStore.ts');
  assert.equal(store.includes("from '../fulfillment'"), false);
  assert.equal(store.includes('dropshipProcedure'), false);

  console.log('[PASS] Dropship C9 : product_sources, 0 API, Skin ≠ 24–48h, Hair p35 intact.');
}

main();
