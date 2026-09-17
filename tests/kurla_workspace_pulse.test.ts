import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isSkinCosmeticCategory } from '../src/lib/dropshipProcedure';
import {
  buildWorkspacePulse,
  countWorkspaceCatalog,
  formatPulseNumber,
  isHairKitCategory,
  kitProductIds,
  cosmeticProductIds,
  sumLineRevenueForIds,
  summarizeRfq,
  withOpsFacts,
} from '../src/lib/workspacePulse';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const kit = { id: 'p1', category: 'kits', catalogStatus: 'published', isActive: true };
const serum = { id: 'skin-serum', category: 'peau', catalogStatus: 'published', isActive: true };
const draftSerum = { id: 'skin-draft', category: 'peau', catalogStatus: 'draft', isActive: true };
const leaveIn = { id: 'p2', category: 'cheveux', catalogStatus: 'published', isActive: true };

assert.equal(isHairKitCategory('kits'), true);
assert.equal(isHairKitCategory('kit-decouverte'), true);
assert.equal(isHairKitCategory('peau'), false);
assert.equal(isSkinCosmeticCategory('peau'), true);
assert.equal(isSkinCosmeticCategory('kits'), false, 'un kit n’est pas un soin cosmétique peau');

const kitCounts = countWorkspaceCatalog([kit, kit, draftSerum]);
assert.equal(kitCounts.cosmeticSkuInCatalog, 1);
assert.equal(kitCounts.publishedCosmeticSku, 0);
assert.equal(kitCounts.kitSkuInScope, 2);
assert.equal(kitCounts.pipelineDraftCount, 1);

const paid = [
  { items: [{ productId: 'p1', quantity: 2, unitPrice: 21 }] },
  { items: [{ productId: 'skin-serum', quantity: 1, price: 32 }] },
];
assert.equal(sumLineRevenueForIds(paid, kitProductIds([kit, serum])), 42);
assert.equal(sumLineRevenueForIds(paid, cosmeticProductIds([kit, serum])), 32);
assert.equal(sumLineRevenueForIds([], new Set(['p1'])), 0, 'liste vide = 0 mesuré, pas un 0 inventé');

const leak = buildWorkspacePulse({
  workspace: 'skin',
  products: [kit],
  metrics: { revenueTest: 42, avgOrderValue: 42, totalOrders: 1, paidOrdersCount: 1, uniqueCustomers: 1, estimatedMargin: 10, estimatedMarginRate: 20, popularProducts: [{ productId: 'p1', name: 'Kit', quantity: 2 }], lowStockProducts: [{ id: 'p1' }], outOfStockProducts: [] },
  cosmeticRevenueEur: 0,
  kitRevenueEur: 42,
});
assert.equal(leak.workspace, 'skin');
assert.equal(leak.publishedCosmeticSku, 0);
assert.equal(leak.displayRevenueEur, 0, 'le CA Skin n’affiche pas les kits');
assert.equal(leak.displayOrders, 0);
assert.equal(leak.honestZeroSales, true);
assert.equal(leak.hairRevenueLeak, true);
assert.equal(leak.leakedRevenueEur, 42);
assert.equal(leak.popularProducts.length, 0);
assert.equal(leak.displayLowStock.length, 0);
assert.match(leak.hint, /kits capillaires/i);
assert.equal(leak.revenueLabel, 'Ventes Skin');
assert.equal(leak.identifiedCount, null, 'un RFQ / identifié non lu reste null');
assert.equal(leak.rfqOpen, null);
assert.equal(leak.docsMissing, null);

const leakFromCatalogOnly = buildWorkspacePulse({
  workspace: 'skin',
  products: [kit],
  metrics: { revenueTest: 99, totalOrders: 3 },
});
assert.equal(leakFromCatalogOnly.displayRevenueEur, 0, 'catalogue chargé, 0 soin → tout le CA scopé est Hair');
assert.equal(leakFromCatalogOnly.leakedRevenueEur, 99);
assert.equal(leakFromCatalogOnly.hairRevenueLeak, true);

const productsNotLoaded = buildWorkspacePulse({
  workspace: 'skin',
  products: [],
  metrics: { revenueTest: 50, totalOrders: 2 },
});
assert.equal(productsNotLoaded.displayRevenueEur, 50, 'catalogue non chargé : on ne zéroise pas');
assert.equal(productsNotLoaded.hairRevenueLeak, false);
assert.equal(productsNotLoaded.honestZeroSales, false);

const realSkin = buildWorkspacePulse({
  workspace: 'skin',
  products: [serum, kit],
  metrics: { revenueTest: 74, avgOrderValue: 37, totalOrders: 2, paidOrdersCount: 2, uniqueCustomers: 2 },
  cosmeticRevenueEur: 32,
  kitRevenueEur: 42,
});
assert.equal(realSkin.displayRevenueEur, 32, 'soin peau réel : on n’efface pas le CA Skin');
assert.equal(realSkin.honestZeroSales, false);
assert.equal(realSkin.hairRevenueLeak, true);
assert.equal(realSkin.leakedRevenueEur, 42);
assert.equal(realSkin.publishedCosmeticSku, 1);

const draftOnly = buildWorkspacePulse({
  workspace: 'skin',
  products: [draftSerum],
  metrics: { revenueTest: 20, totalOrders: 1 },
  cosmeticRevenueEur: 20,
  kitRevenueEur: 0,
});
assert.equal(draftOnly.publishedCosmeticSku, 0);
assert.equal(draftOnly.displayRevenueEur, 20, 'une commande d’un brouillon peau reste du Skin');
assert.equal(draftOnly.honestZeroSales, false);
assert.equal(draftOnly.hairRevenueLeak, false);

const hair = buildWorkspacePulse({
  workspace: 'hair',
  products: [leaveIn, kit],
  metrics: { revenueTest: 120, avgOrderValue: 40, totalOrders: 3, paidOrdersCount: 3, uniqueCustomers: 2, estimatedMargin: 30, estimatedMarginRate: 25, popularProducts: [{ productId: 'p1', name: 'Kit', quantity: 2 }] },
  cosmeticRevenueEur: 0,
  kitRevenueEur: 80,
});
assert.equal(hair.displayRevenueEur, 120, 'Hair : pass-through du CA scopé');
assert.equal(hair.hairRevenueLeak, false);
assert.equal(hair.honestZeroSales, false);
assert.equal(hair.popularProducts.length, 1);
assert.equal(hair.revenueLabel, "Chiffre d'Affaires Test");

assert.deepEqual(summarizeRfq(null), null);
assert.deepEqual(summarizeRfq([]), { needs: 0, rfqOpen: 0, awaitingReply: 0 }, 'liste vide = 0 réel');
assert.equal(summarizeRfq([{ status: 'in_rfq', sentAwaitingCount: 2 }, { status: 'identified' }])?.rfqOpen, 1);

const merged = withOpsFacts(leak, { rfqOpen: 0, docsMissing: 3, identifiedCount: 0 });
assert.equal(merged.rfqOpen, 0);
assert.equal(merged.docsMissing, 3);
assert.equal(merged.identifiedCount, 0);
assert.equal(formatPulseNumber(null), '—');
assert.equal(formatPulseNumber(0, 'count'), '0', '0 mesuré s’affiche 0, pas un tiret');
assert.equal(formatPulseNumber(0, 'eur'), '0.00 €');

const dashboard = read('src/pages/AdminDashboardPage.tsx');
assert.match(dashboard, /WorkspacePulsePanel/, 'bandeau KPI monté sur le tableau de bord');
assert.doesNotMatch(dashboard, /workspace === ['"]skin['"]\s*&&\s*</, 'pas de JSX Skin-only : parité Hair / Skin');
assert.match(dashboard, /honestZeroSales/, 'l’onglet commercial et la demande utilisent le pulse');
assert.match(dashboard, /displayRevenueEur/, 'le CA affiché passe par le pulse');

const panel = read('src/components/WorkspacePulsePanel.tsx');
assert.match(panel, /fetchAdminCatalogProducts/, 'le bandeau réutilise le fetch catalogue partagé');
assert.match(panel, /\/api\/admin\/sourcing\/items/, 'RFQ lu depuis la route existante');
assert.match(panel, /\/api\/admin\/sourcing\/ops/, 'docs lus depuis la route existante');
assert.doesNotMatch(panel, /workspace === ['"]skin['"]\s*&&\s*</);
assert.doesNotMatch(panel, /^\s*\{\s*workspace === ['"]skin['"]/m);

const store = read('src/lib/db/adminStore.ts');
assert.match(store, /workspacePulse/, 'métriques admin enrichies, pas une nouvelle route');
assert.doesNotMatch(store, /revenueTest:\s*0/, 'pas de CA test hardcodé à 0');

const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
assert.ok(pkg.scripts['test:workspace-pulse']?.includes('kurla_workspace_pulse.test.ts'));
assert.match(pkg.scripts.test, /test:workspace-pulse/);
assert.ok(pkg.scripts.test.indexOf('test:threepl-procedure') < pkg.scripts.test.indexOf('test:workspace-pulse'));

console.log('[PASS] kurla_workspace_pulse: 0 SKU peau ≠ CA kits ; Hair inchangé ; RFQ/docs null vs 0 ; parité bandeau.');
