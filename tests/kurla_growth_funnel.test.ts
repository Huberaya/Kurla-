import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { app } from '../server';
import { serverDb } from '../src/lib/serverDb';

async function run(): Promise<void> {
  serverDb.inMemoryGrowthFunnelEvents = [];
  await serverDb.recordGrowthFunnelEvent({ id: 'event_page_001', eventName: 'page_view', sessionId: 'session_001', path: '/', props: {}, occurredAt: new Date().toISOString() });
  await serverDb.recordGrowthFunnelEvent({ id: 'event_page_002', eventName: 'page_view', sessionId: 'session_002', path: '/diagnostic', props: {}, occurredAt: new Date().toISOString() });
  await serverDb.recordGrowthFunnelEvent({ id: 'event_diag_001', eventName: 'diagnostic_start', sessionId: 'session_002', path: '/diagnostic', props: { diagnostic_type: 'hair' }, occurredAt: new Date().toISOString() });
  await serverDb.recordGrowthFunnelEvent({ id: 'event_diag_002', eventName: 'diagnostic_complete', sessionId: 'session_002', path: '/diagnostic/result', props: { diagnostic_type: 'hair' }, occurredAt: new Date().toISOString() });
  const metrics = await serverDb.getGrowthFunnelMetrics(30);
  assert.equal(metrics.pageViews, 2);
  assert.equal(metrics.uniqueSessions, 2);
  assert.equal(metrics.diagnosticStarts, 1);
  assert.equal(metrics.diagnosticCompletes, 1);
  assert.equal(metrics.diagnosticCompletionRatePct, 100);

  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { listener.once('listening', resolve); listener.once('error', reject); });
  try {
    const { port } = listener.address() as AddressInfo;
    const valid = await fetch(`http://127.0.0.1:${port}/api/events/funnel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: 'event_api_001', eventName: 'add_to_cart', sessionId: 'session_api_1', path: '/boutique', props: { item_id: 'launch-p08', value: 42, email: 'must-not-be-stored' } })
    });
    assert.equal(valid.status, 204);
    const invalid = await fetch(`http://127.0.0.1:${port}/api/events/funnel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: 'customer_email', sessionId: 'session_api_1' })
    });
    assert.equal(invalid.status, 400);
    const afterApi = await serverDb.getGrowthFunnelMetrics(30);
    assert.equal(afterApi.addToCarts, 1);
    assert.equal((afterApi as any).email, undefined);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  }

  console.log('[PASS] Growth Funnel : événements first-party anonymisés, métriques de sessions/diagnostic, whitelist props et endpoint public validés.');
}

run().catch(error => {
  console.error('[FAIL] Growth Funnel:', error);
  process.exitCode = 1;
});
