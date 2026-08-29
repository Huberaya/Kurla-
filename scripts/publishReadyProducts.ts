/**
 * Publie les produits que l'application elle-même déclare prêts.
 *
 * Ce script n'applique AUCUNE règle de publiabilité : il lit
 * `getCatalogPublicationReadinessReport` — la fonction de l'écran de validation
 * — et ne change le statut que des produits `ready === true`. Un produit non
 * prêt reste untouched, et le rapport dit pourquoi.
 *
 * p14 et p15 sont exclus : reprise d'un nom de concurrent, décision utilisateur.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... \
 *   NODE_OPTIONS=--experimental-websocket npx tsx scripts/publishReadyProducts.ts [--apply]
 */
import { serverDb } from '../src/lib/serverDb';
import { getCatalogPublicationReadinessReport, updateCatalogStatus } from '../src/lib/db/catalogStore';

const DELIBERATELY_EXCLUDED = ['p14', 'p15'];
const env = (name: string): string => (process.env[name] || '').trim();

async function main(): Promise<void> {
  if (!env('SUPABASE_URL') || !(env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'))) {
    console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.');
    process.exit(2);
  }
  const apply = process.argv.includes('--apply');
  const report = await getCatalogPublicationReadinessReport(serverDb as never);

  const targets = report.perProduct.filter(
    product => product.ready
      && !DELIBERATELY_EXCLUDED.includes(product.productId)
      && product.catalogStatus !== 'published'
  );

  console.log(`\n${report.products} produits, ${report.readyToPublish} prêts, ${targets.length} à publier.\n`);
  if (targets.length === 0) {
    console.log('Rien à publier.\n');
    return;
  }

  for (const product of targets) {
    console.log(`  ${product.productId.padEnd(4)} ${product.catalogStatus} → published   ${product.title}`);
    if (apply) await updateCatalogStatus(serverDb as never, product.productId, 'published');
  }
  console.log(apply ? '\nStatuts écrits.\n' : '\nMODE LECTURE SEULE — rien n’a été écrit (--apply pour écrire).\n');
}

main().catch(error => {
  console.error('Échec :', error instanceof Error ? error.message : error);
  process.exit(1);
});
