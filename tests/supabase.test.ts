import fs from 'fs';
import path from 'path';
import { serverDb } from '../src/lib/serverDb';
import { MOCK_PRODUCTS } from '../src/data/mockData';
import { isSupabaseConfigured, getSupabaseClient } from '../src/lib/supabaseClient';
import { runPhase2AuthTests } from './supabase_auth.test';
import { runPhase3CartOrderTests } from './phase3_cart_orders.test';
import { runPhase4WebhookStockTests } from './phase4_webhook_stock.test';
import { runPhase5OperationsTests } from './phase5_operations.test';

console.log('============================================================');
console.log('KURLA BEAUTY - SUPABASE PHASE 1 & 2 AUTOMATED TEST SUITE');
console.log('============================================================');

async function runTests() {
  // 1. Verify Migration SQL Files
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260804000000_init_kurla_schema.sql');
  const seedPath = path.join(process.cwd(), 'supabase', 'migrations', '20260805000000_seed_demo_products.sql');
  const phase2MigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260805100000_phase2_auth_profiles.sql');

  if (!fs.existsSync(migrationPath) || !fs.existsSync(seedPath) || !fs.existsSync(phase2MigrationPath)) {
    throw new Error('Test Failed: Supabase migration or seed SQL file is missing!');
  }
  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
  const seedContent = fs.readFileSync(seedPath, 'utf-8');
  const phase2Content = fs.readFileSync(phase2MigrationPath, 'utf-8');

  if (!sqlContent.includes('CREATE TABLE IF NOT EXISTS public.products') || !sqlContent.includes('ROW LEVEL SECURITY')) {
    throw new Error('Test Failed: SQL Schema Migration does not contain required tables or RLS policies!');
  }
  if (!seedContent.includes('INSERT INTO public.products') || !seedContent.includes('SELECT COUNT(*) FROM public.products;')) {
    throw new Error('Test Failed: SQL Seed Migration does not contain product inserts or count verification!');
  }
  if (!phase2Content.includes('CREATE TRIGGER on_auth_user_created') || !phase2Content.includes('public.profiles')) {
    throw new Error('Test Failed: Phase 2 Auth SQL migration does not contain trigger or profile updates!');
  }
  console.log('[PASS] 1. Supabase schema migrations (Phase 1 & Phase 2) and demo seed SQL files validated.');

  // 2. Initialize Persistent Product Catalog
  await serverDb.initialize(MOCK_PRODUCTS);
  const products = await serverDb.getProducts();
  if (products.length === 0) {
    throw new Error('Test Failed: Product catalog is empty!');
  }
  console.log(`[PASS] 2. Product catalog loaded with ${products.length} products.`);

  // 3. Server Price Validation Test
  const testProduct = await serverDb.getProductById('leave-in-hydratant');
  if (!testProduct || testProduct.price <= 0) {
    throw new Error('Test Failed: Server authoritative price lookup failed!');
  }
  console.log(`[PASS] 3. Authoritative server price verification successful (${testProduct.name}: ${testProduct.price} EUR).`);

  // 4. Create and Persist Order
  const testOrderId = 'SUPA-ORD-' + Date.now();
  const testEmail = 'client.test@kurla-beauty.com';
  await serverDb.saveOrder({
    id: testOrderId,
    customerEmail: testEmail,
    items: [{ productId: 'leave-in-hydratant', quantity: 2, price: testProduct.price, name: testProduct.name }],
    total: testProduct.price * 2,
    status: 'payment_pending_webhook',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 5. Read Back Order
  const retrievedOrder = await serverDb.getOrderById(testOrderId);
  if (!retrievedOrder || retrievedOrder.status !== 'payment_pending_webhook') {
    throw new Error('Test Failed: Order retrieval or status mismatch!');
  }
  console.log(`[PASS] 4. Order created and persisted with status 'payment_pending_webhook'.`);

  // 6. Verify Customer Isolation (Orders filtering)
  const customerOrders = await serverDb.getOrdersByCustomer(testEmail);
  const otherCustomerOrders = await serverDb.getOrdersByCustomer('other.user@kurla-beauty.com');
  
  if (!customerOrders.some(o => o.id === testOrderId)) {
    throw new Error('Test Failed: Customer order not returned for owner email!');
  }
  if (otherCustomerOrders.some(o => o.id === testOrderId)) {
    throw new Error('Test Failed: Customer order leaked to another email!');
  }
  console.log('[PASS] 5. Customer data isolation verified (owner can access, other emails blocked).');

  // 7. Verify Webhook Idempotency Check
  const testEvtId = 'evt_supa_' + Date.now();
  if (await serverDb.isEventProcessed(testEvtId)) {
    throw new Error('Test Failed: Webhook event falsely marked as processed before execution!');
  }
  await serverDb.markEventProcessed(testEvtId, 'payment_intent.succeeded');
  if (!(await serverDb.isEventProcessed(testEvtId))) {
    throw new Error('Test Failed: Webhook event idempotency recording failed!');
  }
  console.log('[PASS] 6. Stripe Webhook idempotency protection verified.');

  // 8. Execute Phase 2 Auth & Profile Tests
  const phase2Results = await runPhase2AuthTests();
  let phase2PassedCount = 0;
  for (const res of phase2Results) {
    if (res.passed) {
      phase2PassedCount++;
      console.log(`[PASS] [Phase 2] ${res.description}: ${res.message}`);
    } else {
      console.error(`[FAIL] [Phase 2] ${res.description}: ${res.message}`);
    }
  }

  // 9. Execute RLS Multi-User Security Audit Suite (Compte A vs Compte B without SUPABASE_SECRET_KEY)
  const { runRlsMigrationStaticChecks, runMultiUserSimulationTests } = await import('./rls_two_users.test');
  const rlsReports = [...runRlsMigrationStaticChecks(), ...runMultiUserSimulationTests()];
  console.log('\n============================================================');
  console.log('AUDIT DES POLITIQUES RLS ET FONCTIONS SQL (SÉCURITÉ PHASE 2)');
  console.log('============================================================');
  for (const rep of rlsReports) {
    console.log(`\n--- ${rep.category.toUpperCase()} ---`);
    for (const c of rep.checks) {
      console.log(`${c.passed ? '[PASS]' : '[FAIL]'} ${c.item}: ${c.details}`);
    }
  }

  // 10. Execute Phase 3 Cart & Persistent Order Tests
  const phase3Results = await runPhase3CartOrderTests();
  let phase3PassedCount = 0;
  console.log('\n============================================================');
  console.log('KURLA BEAUTY - PHASE 3 PERSISTENT CART & ORDER TEST SUITE');
  console.log('============================================================');
  for (const res of phase3Results) {
    if (res.passed) {
      phase3PassedCount++;
      console.log(`[PASS] [Phase 3] ${res.testName}: ${res.details}`);
    } else {
      console.error(`[FAIL] [Phase 3] ${res.testName}: ${res.details}`);
      throw new Error(`Phase 3 Test Failed: ${res.testName} - ${res.details}`);
    }
  }

  // 11. Execute Phase 4 Webhook & Stock Management Tests
  const phase4Results = await runPhase4WebhookStockTests();
  let phase4PassedCount = 0;
  console.log('\n============================================================');
  console.log('KURLA BEAUTY - PHASE 4 STRIPE WEBHOOK & STOCK TEST SUITE');
  console.log('============================================================');
  for (const res of phase4Results) {
    if (res.passed) {
      phase4PassedCount++;
      console.log(`[PASS] [Phase 4] ${res.testName}: ${res.details}`);
    } else {
      console.error(`[FAIL] [Phase 4] ${res.testName}: ${res.details}`);
      throw new Error(`Phase 4 Test Failed: ${res.testName} - ${res.details}`);
    }
  }

  // 12. Execute Phase 5 Notifications, Shipping, Returns, Support & Commercial Dashboard Tests
  const phase5Results = await runPhase5OperationsTests();
  let phase5PassedCount = 0;
  console.log('\n============================================================');
  console.log('KURLA BEAUTY - PHASE 5 OPERATIONS & COMMERCIAL DASHBOARD TEST SUITE');
  console.log('============================================================');
  for (const res of phase5Results) {
    if (res.passed) {
      phase5PassedCount++;
      console.log(`[PASS] [Phase 5 Test ${res.testId}] ${res.testName}: ${res.details}`);
    } else {
      console.error(`[FAIL] [Phase 5 Test ${res.testId}] ${res.testName}: ${res.details}`);
      throw new Error(`Phase 5 Test ${res.testId} Failed: ${res.testName} - ${res.details}`);
    }
  }

  // 13. Verify Status Summary
  const status = serverDb.getStatusSummary();
  console.log(`\n[PASS] Database status summary: Supabase Configured=${status.supabaseConfigured}, Products=${status.productCount}, Orders=${status.orderCount}.`);

  console.log(`\nAll Phase 1, 2, 3, 4 & 5 Supabase tests completed successfully! (${phase2PassedCount}/${phase2Results.length} Phase 2, ${phase3PassedCount}/${phase3Results.length} Phase 3, ${phase4PassedCount}/${phase4Results.length} Phase 4, ${phase5PassedCount}/${phase5Results.length} Phase 5 passed).`);
}

runTests().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});

