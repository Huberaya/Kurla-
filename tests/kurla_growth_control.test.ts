import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { app } from '../server';
import { serverDb } from '../src/lib/serverDb';
import { calculateGrowthPlan, GROWTH_GLOBAL_GATES, GROWTH_LADDER, GROWTH_OPERATING_MODEL } from '../src/lib/growthControl';

async function run(): Promise<void> {
  const plan = calculateGrowthPlan({ targetClients: 100, conversionPct: 1, diagnosticRatePct: 35, cacEur: 20, aovEur: 42, repeat90dPct: 20, grossMarginPct: 45 });
  assert.equal(plan.visitors, 10000);
  assert.equal(plan.diagnostics, 3500);
  assert.equal(plan.budgetEur, 2000);
  assert.equal(plan.firstOrderRevenueEur, 4200);
  assert.equal(plan.repeatOrders, 20);
  assert.equal(GROWTH_LADDER.map(rung => rung.clients).join(','), '100,1000,10000,50000,100000,1000000');
  assert.equal(GROWTH_GLOBAL_GATES.length, 6);
  assert.ok(GROWTH_GLOBAL_GATES.every(gate => gate.trigger.length > 20));
  assert.equal(GROWTH_OPERATING_MODEL.yearOneOwnStock, false);
  assert.deepEqual(GROWTH_OPERATING_MODEL.acquisition, ['affiliation', 'dropshipping', '3PL']);

  serverDb.inMemoryGrowthTasks = [];
  serverDb.inMemoryGrowthCampaigns = [];
  serverDb.inMemoryGrowthMarkets = [];
  const first = await serverDb.seedGrowthControl();
  assert.ok(first.tasks.length >= 50);
  assert.ok(first.tasks.some(task => task.title.includes('aucun stock propre année 1')));
  assert.ok(first.campaigns.length >= 5);
  assert.ok(first.markets.length >= 8);
  const counts = [first.tasks.length, first.campaigns.length, first.markets.length];
  const second = await serverDb.seedGrowthControl();
  assert.deepEqual([second.tasks.length, second.campaigns.length, second.markets.length], counts);

  const task = await serverDb.updateGrowthTask(first.tasks[0].id, { status: 'in_progress' });
  assert.equal(task?.status, 'in_progress');
  const campaign = await serverDb.updateGrowthCampaign(first.campaigns[0].id, { status: 'active', actualClients: 3, actualSpendEur: 30 });
  assert.equal(campaign?.status, 'active');
  assert.equal(campaign?.actualClients, 3);
  const market = await serverDb.updateGrowthMarket(first.markets[0].id, { status: 'validation', actualClients: 30 });
  assert.equal(market?.status, 'validation');

  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { listener.once('listening', resolve); listener.once('error', reject); });
  try {
    const { port } = listener.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/growth/command-center`, { headers: { 'x-user-id': 'forged-admin' } });
    assert.equal(response.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  }

  console.log('[PASS] Growth Control Center: équations, escalier, seed idempotent, édition des tâches/campagnes/marchés et garde admin validés.');
}

run().catch(error => {
  console.error('[FAIL] Growth Control Center:', error);
  process.exitCode = 1;
});
