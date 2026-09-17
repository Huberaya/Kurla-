/**
 * CHANTIER 11 — 3PL année 1 : tampon / partenaire = product_sources.model=3pl.
 * 0 WMS. Hair tampon 75 (fulfillment.ts) intact. Cosmétique Skin ≠ 24–48h.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TAMPON_3PL, TAMPON_META } from '../src/lib/fulfillment';
import {
  THREE_PL_WMS_LIVE,
  buildThreePlInboundNotice,
  buildThreePlInboundPo,
  hairTamponUnits,
  isHairTamponSku,
  isThreePlSource,
  selectThreePlSource,
  tamponQtyForProduct,
  threePlYear1Checklist,
} from '../src/lib/threePlProcedure';
import { routeFulfillment, type ProductSource } from '../src/lib/supplyModel';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

const threePlSource = (over: Partial<ProductSource> = {}): ProductSource => ({
  id: 'src-3pl-1',
  productId: 'peau-c11',
  supplierId: 'sup-3pl',
  partnerName: null,
  model: '3pl',
  isPrimary: true,
  costCents: null,
  feeCents: null,
  fulfillmentCostCents: null,
  commissionPct: null,
  affiliateUrl: null,
  cookieDays: null,
  leadTimeDays: 3,
  shipsFrom: 'FR',
  currency: 'EUR',
  available: true,
  notes: null,
  ...over,
});

function main(): void {
  assert.equal(THREE_PL_WMS_LIVE, false);
  assert.equal(hairTamponUnits(), 75);
  assert.equal(TAMPON_META.totalUnits, 75);
  assert.match(TAMPON_META.catalogImpact, /launchCatalog\.ts inchangé/);
  assert.equal(TAMPON_3PL.length, 5);
  assert.deepEqual(TAMPON_3PL.map(row => row.productId), ['p01', 'p04', 'p08', 'p09', 'p12']);
  assert.ok(TAMPON_3PL.every(row => row.qty === 15));

  assert.equal(isHairTamponSku('p01'), true);
  assert.equal(isHairTamponSku('launch-p01'), true);
  assert.equal(isHairTamponSku('peau-c11'), false);
  assert.equal(tamponQtyForProduct('p01'), 15);
  assert.equal(tamponQtyForProduct('peau-c11'), null);

  const dropshipPrimary: ProductSource[] = [
    threePlSource({ id: 'ds', model: 'dropshipping', isPrimary: true }),
    threePlSource({ id: '3pl', isPrimary: false }),
  ];
  assert.equal(selectThreePlSource(dropshipPrimary), null);
  assert.equal(isThreePlSource(selectThreePlSource([threePlSource()])), true);

  const route = routeFulfillment({
    sources: [threePlSource()],
    supplierNameById: { 'sup-3pl': 'Etx Logistique' },
  });
  assert.equal(route.model, '3pl');
  assert.equal(route.responsibleKind, '3pl');
  assert.equal(route.blockers.length, 0);

  const unnamed = routeFulfillment({ sources: [threePlSource({ supplierId: null })] });
  assert.ok(unnamed.blockers.some(item => /logisticien 3PL non identifié/.test(item)));

  const hairPo = buildThreePlInboundPo({
    poNumber: 'KURLA-3PL-HAIR',
    productName: 'Shampoing crème',
    productId: 'p01',
    quantity: null,
    unitCostEur: 7.1,
    logisticianName: 'Etx Logistique',
    logisticianEmail: 'ops@etx.test',
    supplierName: 'Distristar',
    shipsFrom: 'FR',
    category: 'cheveux',
  });
  assert.equal(hairPo.wmsLive, false);
  assert.match(hairPo.body, /DIRECTE chez le 3PL/);
  assert.match(hairPo.body, /0 carton à Paris/);
  assert.match(hairPo.body, /15×/);
  assert.match(hairPo.body, /fulfillment\.ts/);
  assert.ok(hairPo.mailtoHref && hairPo.mailtoHref.startsWith('mailto:'));
  assert.doesNotMatch(hairPo.body, /ASN électronique envoyé|API Huboo connectée/i);

  const skinPo = buildThreePlInboundPo({
    poNumber: 'KURLA-3PL-SKIN',
    productName: 'Sérum',
    productId: 'peau-c11',
    quantity: null,
    unitCostEur: null,
    logisticianName: 'Logisticien C11',
    logisticianEmail: null,
    supplierName: 'Logisticien C11',
    shipsFrom: null,
    category: 'peau',
  });
  assert.equal(skinPo.mailtoHref, null);
  assert.match(skinPo.body, /quantité à obtenir/);
  assert.match(skinPo.body, /coût à obtenir/);
  assert.match(skinPo.body, /COSMÉTIQUE SKIN/);
  assert.match(skinPo.body, /Pas de badge boutique 24–48h/);
  assert.doesNotMatch(skinPo.body, /tampon Hair 75 étendu/);

  const notice = buildThreePlInboundNotice({
    poNumber: 'KURLA-3PL-SKIN',
    productName: 'Sérum',
    productId: 'peau-c11',
    quantity: null,
    unitCostEur: null,
    logisticianName: 'Logisticien C11',
    logisticianEmail: 'ops@3pl.test',
    supplierName: 'Marque C11',
    shipsFrom: 'FR',
    category: 'peau',
  });
  assert.equal(notice.wmsLive, false);
  assert.match(notice.subject, /pas un ASN WMS/i);
  assert.match(notice.body, /pas d’ASN électronique/i);
  assert.match(notice.body, /Aucun stock n’est poussé/);
  assert.ok(notice.mailtoHref && notice.mailtoHref.startsWith('mailto:'));

  const check = threePlYear1Checklist({
    product: { id: 'peau-c11', category: 'peau' },
    source: threePlSource(),
    logisticianEmail: 'ops@3pl.test',
  });
  assert.equal(check.wmsLive, false);
  assert.equal(check.ok, true);
  assert.ok(check.items.some(item => item.id === 'wms' && item.ok && /pas de WMS/i.test(item.label)));
  assert.ok(check.items.some(item => item.id === 'cosmetic' && /pas de promesse 24–48h/i.test(item.label)));
  assert.ok(check.items.some(item => item.id === 'qty' && /pas de 15 inventé/i.test(item.label)));

  const missing = threePlYear1Checklist({
    product: { id: 'peau-c11', category: 'peau' },
    source: null,
    logisticianEmail: null,
  });
  assert.equal(missing.ok, false);

  const hairCheck = threePlYear1Checklist({
    product: { id: 'p01', category: 'cheveux' },
    source: threePlSource({ productId: 'p01' }),
    logisticianEmail: 'ops@etx.test',
  });
  assert.ok(hairCheck.items.some(item => item.id === 'qty' && /15 u\./.test(item.label)));

  const moduleSrc = read('src/lib/threePlProcedure.ts');
  assert.doesNotMatch(moduleSrc, /emailService/);
  assert.doesNotMatch(moduleSrc, /fetch\(/);
  assert.doesNotMatch(moduleSrc, /huboo\.com|cubyn\.io|wmsLive\s*=\s*true/i);
  assert.match(moduleSrc, /THREE_PL_WMS_LIVE = false/);

  const fulfillment = read('src/lib/fulfillment.ts');
  assert.match(fulfillment, /TAMPON_3PL/);
  assert.doesNotMatch(fulfillment, /threePlProcedure/);
  const launch = read('src/lib/launchCatalog.ts');
  assert.doesNotMatch(launch, /threePlProcedure/);
  assert.doesNotMatch(launch, /productSourceStore/);

  const panel = read('src/components/ProductSourcesPanel.tsx');
  assert.match(panel, /buildThreePlInboundPo/);
  assert.match(panel, /pas de WMS/i);
  assert.doesNotMatch(panel, /workspace === ['\"]skin['\"]/);

  const tampon = read('src/components/TamponOrderPanel.tsx');
  assert.match(tampon, /TAMPON_3PL\.map/);
  assert.match(tampon, /product_sources\.model=3pl/);
  assert.match(tampon, /Pas de WMS/);
  assert.match(tampon, /p01/);
  assert.match(tampon, /p12/);

  const guide = read('src/components/DropshipGuidePanel.tsx');
  assert.match(guide, /product_sources/);
  assert.match(guide, /Pas de WMS Huboo\/Cubyn/);
  assert.doesNotMatch(guide, /list-disc liid/);
  assert.doesNotMatch(guide, /^Name=/m);

  const store = read('src/lib/db/productSourceStore.ts');
  assert.equal(store.includes('threePlProcedure'), false);
  const catalog = read('src/lib/db/catalogStore.ts');
  assert.doesNotMatch(catalog, /threePlProcedure/);

  console.log('[PASS] 3PL C11 : product_sources, 0 WMS, Hair tampon 75 intact, Skin ≠ 24–48h.');
}

main();
