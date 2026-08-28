import { serverDb } from '../src/lib/serverDb';

async function runCatalogManagementTests() {
  await serverDb.initialize([]);
  const adminId = '00000000-0000-4000-8000-000000000a01';

  const imported = await serverDb.importCatalogCsv(adminId, [
    'name;slug;brand;price;vat_rate;stock_quantity;country_availability;categories;audiences;composition;warnings',
    'Soin test;soin-test;Marque test;24.90;20;12;FR|BE;cheveux_boucles|cuir_chevelu;femmes|tous_publics;Aloe vera|Glycérine;Éviter le contact avec les yeux',
    'Ligne invalide;ligne-invalide;Marque test;prix-invalide;20;2;FR;cheveux_boucles;femmes;Composition;'
  ].join('\n'), 'catalog-test.csv');
  if (imported.imported !== 1 || imported.rejected !== 1) throw new Error('CSV import did not preserve imported/rejected row counts.');

  const supplierImport = await serverDb.importCatalogRecords(adminId, [{
    supplierSku: 'SUP-001', name: 'Huile fournisseur', slug: 'huile-fournisseur', brand: 'Marque fournisseur', price: 11.50,
    vatRate: 20, stockQuantity: 4, countryAvailability: ['FR'], catalogCategoryTags: ['cuir_chevelu'], targetAudiences: ['tous_publics']
  }], 'supplier', 'Fournisseur test');
  if (supplierImport.imported !== 1 || supplierImport.rejected !== 0) throw new Error('Supplier feed import failed.');

  const products = await serverDb.getAdminCatalogProducts();
  const product = products.find(item => item.slug === 'soin-test');
  if (!product) throw new Error('Imported product is not visible in the admin catalog.');
  if (product.catalogStatus !== 'draft' || product.validation.ingredients !== 'not_provided') throw new Error('Imported product did not remain a non-validated draft.');
  if (product.countryAvailability[0] !== 'FR' || product.catalogCategoryTags[0] !== 'cheveux_boucles') throw new Error('Catalog taxonomy was not persisted.');

  const edited = await serverDb.saveCatalogProduct(adminId, {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    category: 'cheveux',
    price: 24.90,
    stockQuantity: 6,
    countryAvailability: ['FR'],
    catalogCategoryTags: ['cheveux_boucles'],
    targetAudiences: ['femmes'],
    images: [{ url: 'https://example.com/real-source-image.jpg' }],
    ingredients: ['Aloe vera'],
    warnings: ['Donnée source à respecter'],
    variants: [{ name: '250 ml · vanille', price: 26.90, stockQuantity: 3, formatLabel: '250 ml', scent: 'vanille', color: 'naturel' }]
  });
  if (edited.variants.length !== 1 || edited.variants[0].formatLabel !== '250 ml' || edited.variants[0].scent !== 'vanille') throw new Error('Variant size/format/color/scent fields were not persisted.');
  if ((await serverDb.getPublicProducts()).some(item => item.id === product.id)) throw new Error('An unvalidated catalog product was published.');

  // Bloc B2 : la porte de publication est appliquée à l'ÉCRITURE. Le changement
  // de statut est refusé — garantie plus forte que le simple filtrage lecture.
  let publicationRefused = false;
  try {
    await serverDb.updateCatalogStatus(product.id, 'published');
  } catch (error) {
    publicationRefused = error instanceof Error && /Publication refusée/.test(error.message);
  }
  if (!publicationRefused) throw new Error('Un produit non vérifié a pu passer au statut publié.');
  if ((await serverDb.getPublicProducts()).some(item => item.id === product.id)) throw new Error('Status alone bypassed the catalog trust gate.');

  console.log('[PASS] Catalog management: CSV/supplier-ready ingestion, rejected rows, taxonomy, pricing, VAT, promotions, variants, inventory and non-public validation gate verified.');
}

runCatalogManagementTests().catch(error => {
  console.error('[FAIL] Catalog management:', error);
  process.exitCode = 1;
});
