import fs from 'fs';
import path from 'path';

export interface Phase7TestResult {
  passed: boolean;
  testName: string;
  details: string;
}

/**
 * The CI environment does not always have a Supabase project configured. The
 * structural checks still prevent a regression to read-then-write stock code;
 * the same migration is exercised against PostgreSQL by
 * test:atomic-stock-integration when credentials are available.
 */
export function runPhase7AtomicStockTests(): Phase7TestResult[] {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260839000000_atomic_stock_lifecycle.sql');
  const serverDbPath = path.join(process.cwd(), 'src', 'lib', 'serverDb.ts');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const serverDb = fs.readFileSync(serverDbPath, 'utf8');
  const results: Phase7TestResult[] = [];

  const requiredSql = [
    'available_quantity INTEGER',
    'GENERATED ALWAYS AS (quantity - reserved_quantity) STORED',
    'inventory_reserved_not_exceed_quantity',
    'idx_inventory_product_variant_unique',
    'CREATE OR REPLACE FUNCTION public.create_order_with_stock_reservation',
    'CREATE OR REPLACE FUNCTION public.transition_order_stock',
    'CREATE OR REPLACE FUNCTION public.restore_stock_atomic',
    'CREATE OR REPLACE FUNCTION public.set_inventory_quantity_atomic',
    'pg_advisory_xact_lock',
    'FOR UPDATE',
    'CREATE OR REPLACE FUNCTION public.finalize_refund',
    'stock_restored'
  ];
  const missingSql = requiredSql.filter(statement => !migration.includes(statement));
  results.push({
    passed: missingSql.length === 0,
    testName: 'RPC transactionnel du cycle de stock',
    details: missingSql.length === 0
      ? 'Réservation, confirmation, libération, restauration idempotente, verrous et disponibilité calculée présents.'
      : `Éléments SQL manquants : ${missingSql.join(', ')}`
  });

  const saveOrderStart = serverDb.indexOf('public async saveOrder');
  const saveOrderEnd = serverDb.indexOf('public async updateOrderStripeSession', saveOrderStart);
  const saveOrderSource = serverDb.slice(saveOrderStart, saveOrderEnd);
  const updateStart = serverDb.indexOf('public async updateOrderStatus');
  const updateEnd = serverDb.indexOf('// ============================================================', updateStart);
  const updateSource = serverDb.slice(updateStart, updateEnd);
  const usesAtomicCreate = saveOrderSource.includes("rpc('create_order_with_stock_reservation'");
  const usesAtomicTransition = updateSource.includes("rpc('transition_order_stock'");
  const hasLegacyStockWrite = updateSource.includes("from('inventory').update") || updateSource.includes("from('products').update");
  results.push({
    passed: usesAtomicCreate && usesAtomicTransition && !hasLegacyStockWrite,
    testName: 'serverDb ne contourne pas les RPC de stock',
    details: usesAtomicCreate && usesAtomicTransition && !hasLegacyStockWrite
      ? 'saveOrder et updateOrderStatus délèguent les écritures Supabase au PostgreSQL transactionnel.'
      : 'Une séquence Supabase indépendante de lecture/modification du stock subsiste dans le cycle commande.'
  });

  const hasRetryGuard = migration.includes("IF v_old_status = p_new_status")
    && migration.includes("NOT v_existing.stock_restored")
    && migration.includes('Use finalize_refund for an idempotent stock restoration');
  results.push({
    passed: hasRetryGuard,
    testName: 'retries webhook et échec partiel',
    details: hasRetryGuard
      ? 'Même statut sans effet de bord, ligne de remboursement verrouillée et restauration dans la transaction.'
      : 'La garde d’idempotence du cycle stock est incomplète.'
  });

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = runPhase7AtomicStockTests();
  for (const result of results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] [Phase 7] ${result.testName}: ${result.details}`);
  }
  if (results.some(result => !result.passed)) process.exitCode = 1;
}
