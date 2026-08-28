import fs from 'fs';
import path from 'path';
import { serverDb } from '../src/lib/serverDb';
import { SEED_PRODUCTS } from './fixtures/seedProducts';
import { getSupabaseClient } from '../src/lib/supabaseClient';
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
  const hardeningMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260826000000_harden_existing_schema.sql');
  const refundIntegrityMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260827000000_refund_integrity.sql');
  const cartOrderIntegrityMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260828000000_cart_order_integrity.sql');
  const operationsIntegrityMigrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260829000000_operations_integrity.sql');

  if (!fs.existsSync(migrationPath) || !fs.existsSync(seedPath) || !fs.existsSync(phase2MigrationPath) || !fs.existsSync(hardeningMigrationPath) || !fs.existsSync(refundIntegrityMigrationPath) || !fs.existsSync(cartOrderIntegrityMigrationPath) || !fs.existsSync(operationsIntegrityMigrationPath)) {
    throw new Error('Test Failed: Supabase migration or seed SQL file is missing!');
  }
  const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
  const seedContent = fs.readFileSync(seedPath, 'utf-8');
  const phase2Content = fs.readFileSync(phase2MigrationPath, 'utf-8');
  const hardeningContent = fs.readFileSync(hardeningMigrationPath, 'utf-8');
  const refundIntegrityContent = fs.readFileSync(refundIntegrityMigrationPath, 'utf-8');
  const cartOrderIntegrityContent = fs.readFileSync(cartOrderIntegrityMigrationPath, 'utf-8');
  const operationsIntegrityContent = fs.readFileSync(operationsIntegrityMigrationPath, 'utf-8');

  if (!sqlContent.includes('CREATE TABLE IF NOT EXISTS public.products') || !sqlContent.includes('ROW LEVEL SECURITY')) {
    throw new Error('Test Failed: SQL Schema Migration does not contain required tables or RLS policies!');
  }
  if (!seedContent.includes('INSERT INTO public.products') || !seedContent.includes('SELECT COUNT(*) FROM public.products;')) {
    throw new Error('Test Failed: SQL Seed Migration does not contain product inserts or count verification!');
  }
  if (!phase2Content.includes('CREATE TRIGGER on_auth_user_created') || !phase2Content.includes('public.profiles')) {
    throw new Error('Test Failed: Phase 2 Auth SQL migration does not contain trigger or profile updates!');
  }
  const requiredHardeningStatements = [
    'ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS user_id',
    'ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS stripe_refund_id',
    'ADD CONSTRAINT orders_status_check',
    'ADD CONSTRAINT shipments_status_check',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_stripe_refund_id',
    'RAISE EXCEPTION'
  ];
  for (const statement of requiredHardeningStatements) {
    if (!hardeningContent.includes(statement)) {
      throw new Error(`Test Failed: schema hardening migration is missing: ${statement}`);
    }
  }
  const requiredRefundIntegrityStatements = [
    'ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS idempotency_key',
    'ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS stock_restored',
    'ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS items',
    'CREATE OR REPLACE FUNCTION public.finalize_refund',
    'pg_advisory_xact_lock',
    'CREATE OR REPLACE FUNCTION public.claim_stripe_event',
    'CREATE OR REPLACE FUNCTION public.mark_stripe_event_error',
    'REVOKE ALL ON FUNCTION public.finalize_refund'
  ];
  for (const statement of requiredRefundIntegrityStatements) {
    if (!refundIntegrityContent.includes(statement)) {
      throw new Error(`Test Failed: refund integrity migration is missing: ${statement}`);
    }
  }
  const requiredCartOrderStatements = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_user_id_unique',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_anonymous_id_unique',
    'CREATE POLICY "Users manage own cart items"',
    'ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key',
    'CREATE OR REPLACE FUNCTION public.replace_cart',
    'CREATE OR REPLACE FUNCTION public.reserve_stock_for_order',
    'CREATE OR REPLACE FUNCTION public.release_stock_for_order'
  ];
  for (const statement of requiredCartOrderStatements) {
    if (!cartOrderIntegrityContent.includes(statement)) {
      throw new Error(`Test Failed: cart/order integrity migration is missing: ${statement}`);
    }
  }
  const requiredOperationsIntegrityStatements = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_order_id_unique',
    'DELETE FROM public.shipments',
    'UPDATE public.shipping_events',
    "status IN ('preparing', 'label_created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed')",
    'type IN (',
    "'order_payment_pending_webhook'",
    "'order_returned'"
  ];
  for (const statement of requiredOperationsIntegrityStatements) {
    if (!operationsIntegrityContent.includes(statement)) {
      throw new Error(`Test Failed: operations integrity migration is missing: ${statement}`);
    }
  }
  console.log('[PASS] 1. Supabase schema migrations, explicit hardening, refund integrity, cart/order integrity, operations integrity and demo seed SQL files validated.');

  // 2. Initialize Persistent Product Catalog
  await serverDb.initialize(SEED_PRODUCTS);
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
  if (!(await serverDb.claimEventForProcessing(testEvtId, 'payment_intent.succeeded'))) {
    throw new Error('Test Failed: first webhook claim was not granted!');
  }
  if (await serverDb.claimEventForProcessing(testEvtId, 'payment_intent.succeeded')) {
    throw new Error('Test Failed: concurrent webhook claim was granted twice!');
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
    if (res.skipped) {
      console.log(`[SKIP] [Phase 2] ${res.description}: ${res.message}`);
    } else if (res.passed) {
      phase2PassedCount++;
      console.log(`[PASS] [Phase 2] ${res.description}: ${res.message}`);
    } else {
      console.error(`[FAIL] [Phase 2] ${res.description}: ${res.message}`);
      throw new Error(`Phase 2 Test Failed: ${res.description} - ${res.message}`);
    }
  }

  // 9. Execute RLS Multi-User Security Audit Suite (Compte A vs Compte B without SUPABASE_SECRET_KEY)
  const { runRlsMigrationStaticChecks, runMultiUserSimulationTests } = await import('./rls_two_users.test');
  const rlsReports = [...runRlsMigrationStaticChecks(), ...runMultiUserSimulationTests()];
  console.log('\n============================================================');
  console.log('AUDIT DES POLITIQUES RLS ET FONCTIONS SQL (SÉCURITÉ PHASE 2)');
  console.log('============================================================');
  for (const rep of rlsReports) {
      console.log(`\n--- ${rep.category.toUpperCase()}${rep.simulated ? ' (SIMULATION LOCALE)' : ''} ---`);
    for (const c of rep.checks) {
      console.log(`${rep.simulated ? '[SIMULATION]' : (c.passed ? '[PASS]' : '[FAIL]')} ${c.item}: ${c.details}`);
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

  console.log(`\nLocal suites completed (${phase2PassedCount}/${phase2Results.length} Phase 2 checks executed, ${phase3PassedCount}/${phase3Results.length} Phase 3, ${phase4PassedCount}/${phase4Results.length} Phase 4, ${phase5PassedCount}/${phase5Results.length} Phase 5 passed). Run npm run test:integration for real Supabase A/B authorization.`);
}

runTests().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});

