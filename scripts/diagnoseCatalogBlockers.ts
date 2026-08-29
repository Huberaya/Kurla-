/**
 * Diagnostic des blocages de publication du catalogue.
 *
 * Répond à une seule question, produit par produit : « ce produit peut-il être
 * publié, et sinon qu'est-ce qui manque ? » — sans ouvrir une base de données.
 *
 * Il ne réimplémente aucune règle : il appelle
 * `getCatalogPublicationReadinessReport`, la fonction même qui alimente l'écran
 * de validation du catalogue. Le verdict affiché est donc celui de
 * l'application, pas une seconde lecture qui pourrait diverger.
 *
 * Usage :
 *   SUPABASE_URL=https://<projet>.supabase.co \
 *   SUPABASE_SECRET_KEY=<clé> \
 *   NODE_OPTIONS=--experimental-websocket npx tsx scripts/diagnoseCatalogBlockers.ts
 *
 * Lecture seule : ce script n'écrit rien en base.
 */
import { serverDb } from '../src/lib/serverDb';
import { getCatalogPublicationReadinessReport } from '../src/lib/db/catalogStore';

// Les deux marques reprises d'un concurrent sont volontairement hors catalogue :
// elles ne doivent pas être publiées, et leur blocage n'est pas une anomalie.
const DELIBERATELY_EXCLUDED = ['p14', 'p15'];

const env = (name: string): string => (process.env[name] || '').trim();

async function main(): Promise<void> {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const key = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis. Aucun diagnostic inventé sans base réelle.');
    process.exit(2);
  }

  const report = await getCatalogPublicationReadinessReport(serverDb as never);

  const excluded = report.perProduct.filter(product => DELIBERATELY_EXCLUDED.includes(product.productId));
  const inScope = report.perProduct.filter(product => !DELIBERATELY_EXCLUDED.includes(product.productId));

  console.log(`\nCatalogue : ${report.products} produits — ${report.publishedStatus} au statut published, ${report.readyToPublish} prêts à publier.`);
  if (report.publishedButNotListable > 0) {
    console.log(`⚠️  ${report.publishedButNotListable} produit(s) au statut published mais NON servables : le sitemap ne doit pas les annoncer.`);
  }

  const blocked = inScope.filter(product => !product.ready);
  const publishable = inScope.filter(product => product.ready);

  console.log(`\nPérimètre (hors ${DELIBERATELY_EXCLUDED.join(', ')}, exclus volontairement) : ${inScope.length} produits — ${publishable.length} prêts, ${blocked.length} bloqués.\n`);

  if (publishable.length > 0) {
    console.log('PRÊTS À PUBLIER');
    for (const product of publishable) {
      console.log(`  ✅ ${product.productId.padEnd(4)} ${product.catalogStatus.padEnd(12)} ${product.title}`);
    }
    console.log('');
  }

  // Regrouper par combinaison de blocages : si onze produits butent sur la
  // même chose, c'est un seul chantier et non onze.
  const byReason = new Map<string, typeof blocked>();
  for (const product of blocked) {
    const signature = product.missing.slice().sort().join(' | ') || '(aucun blocage nommé)';
    if (!byReason.has(signature)) byReason.set(signature, []);
    byReason.get(signature)!.push(product);
  }

  console.log('BLOQUÉS — regroupés par motif');
  for (const [signature, products] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${products.length} produit(s) — motif : ${signature}`);
    for (const product of products) {
      console.log(`     · ${product.productId.padEnd(4)} ${product.catalogStatus.padEnd(12)} ${product.title}`);
    }
  }

  if (excluded.length > 0) {
    console.log('\nEXCLUS VOLONTAIREMENT (reprise d’un nom de concurrent — ne pas publier)');
    for (const product of excluded) {
      console.log(`  ⛔ ${product.productId.padEnd(4)} ${product.title}`);
    }
  }

  console.log(`\nGénéré le ${report.generatedAt}. Lecture seule, aucune écriture.\n`);
}

main().catch(error => {
  console.error('Échec du diagnostic :', error instanceof Error ? error.message : error);
  process.exit(1);
});
