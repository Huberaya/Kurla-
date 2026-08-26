import type { AddressInfo } from 'node:net';
import { app } from '../server';
import { emailService } from '../src/lib/emailService';

async function runProductionHardeningTests() {
  const listener = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const address = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${baseUrl}/api/health`, {
      headers: { 'x-request-id': 'hardening-test-001' }
    });

    if (health.status !== 200) throw new Error(`Health endpoint returned HTTP ${health.status}.`);
    if (health.headers.get('x-powered-by')) throw new Error('Express fingerprint header is still exposed.');
    if (health.headers.get('x-content-type-options') !== 'nosniff') throw new Error('X-Content-Type-Options header is missing.');
    if (health.headers.get('x-frame-options') !== 'SAMEORIGIN') throw new Error('X-Frame-Options header is missing.');
    if (health.headers.get('x-request-id') !== 'hardening-test-001') throw new Error('Request correlation ID was not propagated.');

    const invalidJson = await fetch(`${baseUrl}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-anonymous-id': 'hardening-guest-001' },
      body: '{'
    });
    if (invalidJson.status !== 400) throw new Error(`Invalid JSON returned HTTP ${invalidJson.status} instead of 400.`);
    if (!invalidJson.headers.get('x-request-id')) throw new Error('Invalid JSON response has no request correlation ID.');

    const largeBody = await fetch(`${baseUrl}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-anonymous-id': 'hardening-guest-002' },
      body: JSON.stringify({ items: [], padding: 'x'.repeat(110_000) })
    });
    if (largeBody.status !== 413) throw new Error(`Oversized JSON returned HTTP ${largeBody.status} instead of 413.`);

    let lastAiResponse: Response | undefined;
    for (let i = 0; i < 31; i += 1) {
      lastAiResponse = await fetch(`${baseUrl}/api/ai/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'routine hydratation' })
      });
    }
    if (lastAiResponse?.status !== 429) throw new Error('AI endpoint rate limiter did not reject the 31st request.');

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const productionConsoleEmail = await emailService.sendEmail({
      to: 'hardening@example.com',
      subject: 'Production guard test',
      template: 'order_created',
      data: { orderId: 'hardening', total: 1 }
    });
    if (productionConsoleEmail.success) throw new Error('Console email provider is still accepted in production.');
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    console.log('[PASS] Production hardening: security headers, request IDs, body limits, rate limiting and email fail-closed guard verified.');
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  }
}

runProductionHardeningTests().catch(error => {
  console.error('[FAIL] Production hardening tests:', error);
  process.exitCode = 1;
});
