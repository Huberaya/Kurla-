import assert from 'node:assert/strict';

import { serverDb } from '../src/lib/serverDb';
import { buildSitemap } from '../scripts/generateSitemap';
import { fetchProductPages, productPagesFrom } from '../scripts/seoEntities';
import { recordCatalogValidation, getCatalogPublicationReadiness } from '../src/lib/db/catalogStore';

/**
 * Banc « fiches produit dans le sitemap ».
 *
 * Le sitemap de production comptait 45 URLs et **0 fiche produit** (mesuré le
 * 29/08/2026). La cause : `fetchProductPages` interrogeait
 * `products?status=eq.published`, or la table `products` n'a aucune colonne
 * `status` — la publication porte sur `catalog_status`. PostgREST renvoyait une
 * erreur, avalée par le `catch`, et la fonction retournait `[]`.
 *
 * Ce banc vérifie l'invariant qui compte, et que la simple correction du nom de
 * colonne n'aurait pas garanti : **le sitemap n'annonce jamais une fiche que le
 * catalogue ne sert pas.** La règle de publiabilité exige neuf conditions au
 *-delà du statut ; filtrer sur le statut seul aurait annoncé des pages mortes.
 */

async function runSitemapProductTests(): Promise<void> {
  // ---------------------------------------------------------------
  // 1. L'invariant : rien d'annoncé qui ne soit servi, et réciproquement.
  //    Exercé sur un ensemble NON VIDE — un banc qui passe sur zéro produit
  //    ne prouve rien, et c'est exactement ce qu'il faisait avant.
  // ---------------------------------------------------------------
  serverDb.inMemoryProducts = [];
  serverDb.inMemoryCatalogValidationEvents = [];
  const ADMIN = 'admin-sitemap-1';
  const CHECKS = ['ingredients', 'claims', 'images', 'stock', 'brand', 'certifications', 'translations'];

  await serverDb.importCatalogRecords(ADMIN, [
    {
      supplierSku: 'S1', name: 'Produit publié', slug: 'produit-publie', brand: 'KURLA', price: 10, vatRate: 20,
      stockQuantity: 5, countryAvailability: ['FR'], catalogCategoryTags: ['cuir_chevelu'], targetAudiences: ['tous_publics'],
      description: 'Un produit de test réellement publiable.', ingredients: 'Aqua, Glycérine',
      image: 'https://images.test/produit-publie.jpg'
    },
    {
      supplierSku: 'S2', name: 'Produit brouillon', slug: 'produit-brouillon', brand: 'KURLA', price: 12, vatRate: 20,
      stockQuantity: 3, countryAvailability: ['FR'], catalogCategoryTags: ['cuir_chevelu'], targetAudiences: ['tous_publics'],
      description: 'Un produit qui ne doit jamais apparaître dans le sitemap.', ingredients: 'Aqua',
      image: 'https://images.test/produit-brouillon.jpg'
    }
  ], 'manual');

  const beforePublish = await serverDb.getPublicProducts();
  assert.equal(beforePublish.length, 0, 'un produit fraîchement importé est un brouillon, pas une fiche publique');

  // Publication du premier uniquement, par le même chemin que le script du
  // chantier 14 : contrôles enregistrés, puis statut.
  const all = await serverDb.getAdminCatalogProducts();
  const toPublish = all.find(product => product.slug === 'produit-publie');
  assert.ok(toPublish, 'le produit à publier doit exister');
  // Les droits sur les visuels ne s'écrivent que si des visuels sont
  // redéclarés (`imagesChanged`) : passer le seul statut ne suffit pas.
  await serverDb.saveCatalogProduct(ADMIN, {
    ...toPublish,
    isActive: true,
    imageOwnershipStatus: 'licensed',
    images: [{ url: 'https://images.test/produit-publie.jpg', ownershipStatus: 'licensed' }]
  });
  for (const check of CHECKS) {
    await recordCatalogValidation(serverDb as never, ADMIN, toPublish.id, check, 'passed', undefined, 'Contrôle de test.');
  }
  const readiness = await getCatalogPublicationReadiness(serverDb as never, toPublish.id);
  assert.equal(readiness.ready, true, `le produit devrait être publiable, manque : ${readiness.missing.map(m => m.label).join(', ')}`);
  await serverDb.updateCatalogStatus(toPublish.id, 'published');

  const served = await serverDb.getPublicProducts();
  assert.equal(served.length, 1, 'exactement un produit doit être servi');
  assert.equal(served[0].slug, 'produit-publie');

  const servedSlugs = new Set(served.map(product => product.slug));
  const announced = productPagesFrom(served);
  assert.equal(announced.length, 1, 'une seule fiche doit être annoncée');

  // Chaque URL annoncée correspond à un produit réellement servi.
  for (const page of announced) {
    const slug = decodeURIComponent(page.path.replace('/produit/', ''));
    assert.ok(servedSlugs.has(slug), `le sitemap annonce « ${slug} » que le catalogue ne sert pas`);
  }
  // Et chaque produit servi est annoncé : c'est ce qui manquait en production.
  for (const slug of servedSlugs) {
    assert.ok(announced.some(page => page.path === `/produit/${encodeURIComponent(slug)}`),
      `le produit servi « ${slug} » est absent du sitemap`);
  }
  // Le brouillon ne doit jamais être annoncé — c'est ce qu'aurait produit un
  // simple filtre sur le statut.
  assert.ok(!announced.some(page => page.path.includes('produit-brouillon')),
    'un brouillon ne doit jamais apparaître dans le sitemap');

  // ---------------------------------------------------------------
  // 2. Le sitemap contient réellement les URLs produit.
  // ---------------------------------------------------------------
  const sitemap = buildSitemap(announced);
  for (const slug of servedSlugs) {
    assert.ok(sitemap.includes(`/produit/${encodeURIComponent(slug)}`),
      `le sitemap généré ne contient pas /produit/${slug}`);
  }
  assert.ok(!sitemap.includes('produit-brouillon'), 'le XML ne doit pas contenir le brouillon');
  assert.ok(sitemap.includes('<?xml'), 'le sitemap doit rester un XML valide');
  const urlCount = (sitemap.match(/<loc>/g) || []).length;
  assert.ok(urlCount > announced.length, 'le sitemap doit contenir les routes statiques en plus des fiches');

  // ---------------------------------------------------------------
  // 3. Sans credentials, aucune URL n'est inventée.
  // ---------------------------------------------------------------
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  const withoutCredentials = await fetchProductPages();
  assert.deepEqual(withoutCredentials, [], 'sans base, le sitemap ne doit annoncer aucune fiche produit');

  // ---------------------------------------------------------------
  // 4. La transformation pure : chemin, titre, description.
  // ---------------------------------------------------------------
  const pages = productPagesFrom([
    { slug: 'creme-definition-boucles-twists', name: 'Crème définition boucles', description: 'Définit sans cartonner.' },
    { slug: 'baume-apaisant', name: 'Baume apaisant' },
    { slug: '', name: 'Sans slug' },
    { slug: '  ', name: 'Slug vide' },
    { name: 'Aucun slug du tout' }
  ]);
  assert.equal(pages.length, 2, 'les produits sans slug réel ne doivent pas produire d’URL');
  assert.equal(pages[0].path, '/produit/creme-definition-boucles-twists');
  assert.equal(pages[0].title, 'Crème définition boucles | KURLA Beauty');
  assert.equal(pages[0].description, 'Définit sans cartonner.');
  // Sans description, le texte de repli nomme le produit au lieu d'inventer.
  assert.match(pages[1].description, /Baume apaisant/);

  // Un slug avec caractère réservé doit être encodé, pas cassé.
  const encoded = productPagesFrom([{ slug: 'soin été/2026', name: 'Soin' }]);
  assert.equal(encoded[0].path, `/produit/${encodeURIComponent('soin été/2026')}`);
  assert.ok(!encoded[0].path.includes(' '), 'un espace non encodé casserait l’URL');

  // Troncature à 300 caractères.
  const long = productPagesFrom([{ slug: 'long', name: 'Long', description: 'x'.repeat(500) }]);
  assert.equal(long[0].description.length, 300);

  console.log(`[PASS] Sitemap produits : transformation pure correcte, aucune URL inventée sans base, ${announced.length} fiche(s) annoncée(s) exactement égale(s) aux ${servedSlugs.size} produit(s) servi(s), URLs présentes dans le XML.`);
}

runSitemapProductTests().catch(error => {
  console.error('[FAIL] Sitemap produits :', error);
  process.exitCode = 1;
});
