import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';

process.env.KURLA_TEST_NO_SERVER = 'true';

const migration = readFileSync('supabase/migrations/20260838000000_admin_dashboard.sql', 'utf8');
const serverDbModule = await import('../src/lib/serverDb');
const serverModule = await import('../server');
const serverDb = serverDbModule.serverDb;

function assertIncludes(value: string, fragment: string, message: string) {
  assert.ok(value.includes(fragment), `${message}: « ${fragment} » absent`);
}

async function requestApp(path: string, init: RequestInit = {}) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, init);
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

assertIncludes(migration, 'CREATE TABLE IF NOT EXISTS public.content_articles', 'table articles');
assertIncludes(migration, 'CREATE TABLE IF NOT EXISTS public.ai_knowledge_sources', 'table sources IA');
assertIncludes(migration, 'CREATE TABLE IF NOT EXISTS public.coupons', 'table coupons');
assertIncludes(migration, 'CREATE TABLE IF NOT EXISTS public.catalog_search_events', 'table recherches');
assertIncludes(migration, 'CREATE TABLE IF NOT EXISTS public.ai_usage_events', 'table usage IA');
assertIncludes(migration, 'CREATE POLICY "Admins manage articles"', 'RLS articles');
assertIncludes(migration, 'CREATE POLICY "Admins manage AI knowledge sources"', 'RLS sources IA');
assertIncludes(migration, 'CREATE POLICY "Admins manage coupons"', 'RLS coupons');

const source = readFileSync('src/lib/serverDb.ts', 'utf8');
assert.match(source, /const sourceOrders: ServerOrder\[\] = supabase \? supaOrders : this\.inMemoryOrders/);
assert.match(source, /searchesWithoutResultsCount: zeroResultSearches\.length/);
assert.match(source, /popularProducts/);
assert.match(source, /aiUsageRate/);
assert.doesNotMatch(source, /totalOrders:\s*\d+/);
assert.doesNotMatch(source, /revenueTest:\s*\d+(?:\.\d+)?/);

await serverDb.initialize([]);
const createdArticle = await serverDb.saveAdminEntity('00000000-0000-4000-8000-000000000a02', 'article', {
  title: 'Article de test admin',
  slug: 'article-test-admin',
  content: 'Contenu contrôlé par le test.',
  status: 'draft'
});
assert.equal(createdArticle.status, 'draft');
const localDashboard = await serverDb.getAdminDashboardData();
assert.ok(localDashboard.articles.some((article: any) => article.id === createdArticle.id));
assert.ok(localDashboard.logs.some((log: any) => log.action === 'admin_article_save'));
const metrics = await serverDb.getAdminAnalyticsMetrics();
for (const key of ['totalOrders', 'revenueTest', 'avgOrderValue', 'refundsCount', 'searchesWithoutResultsCount', 'popularProducts', 'aiUsageRate', 'openTicketsCount']) {
  assert.ok(Object.prototype.hasOwnProperty.call(metrics, key), `métrique ${key} absente`);
}

const dashboardResponse = await requestApp('/api/admin/dashboard');
assert.equal(dashboardResponse.status, 401, 'le dashboard admin doit refuser une requête sans JWT');
const mutationResponse = await requestApp('/api/admin/entities/article', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'forbidden', slug: 'forbidden', content: 'forbidden' })
});
assert.equal(mutationResponse.status, 401, 'une mutation admin doit refuser une requête sans JWT');

console.log('[PASS] Admin dashboard: sources persistées, KPI agrégés sans valeurs en dur, RLS, garde JWT et journalisation locale vérifiés.');
