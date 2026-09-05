/**
 * CHANTIER « RÉFÉRENCEMENT COMMERCIAL » — le prix doit exister pour un moteur.
 *
 * Constat, en production, le 2026-09-05 : la fiche produit servait un JSON-LD
 * `WebPage` générique. Ni prix, ni disponibilité, ni marque, ni image. Pour un
 * moteur, la page la plus commerciale du site était une page comme une autre :
 * aucun résultat enrichi possible, aucune exploitabilité shopping.
 *
 * La cause : `buildRouteHtml` écrivait toujours la même tête, quelle que soit
 * l'entité. Les données produit existaient, elles étaient écrasées au prérendu.
 *
 * Ce banc vérifie la transformation pure — celle qui décide de ce qu'un moteur
 * lit — sans dépendre de la base.
 */
import { strict as assert } from 'node:assert';
import { productPagesFrom } from '../scripts/seoEntities';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const SITE = 'https://kurlabeauty.vercel.app';

// ——— 1. Une fiche annonce un Produit, avec son prix et sa disponibilité ———
{
  const [page] = productPagesFrom(
    [{
      id: 'p-1',
      slug: 'shampoing-clarifiant',
      name: 'Shampoing Clarifiant',
      brand: 'As I Am',
      price: 14.9,
      image_url: 'https://exemple.test/a.jpg',
      category: 'cheveux',
      in_stock: true,
      description: 'Cuir chevelu gras, accumulation de produits.'
    }],
    SITE
  );

  assert.equal(page.path, '/produit/shampoing-clarifiant');
  assert.equal(page.ogType, 'product');

  const ld = page.jsonLd as any;
  assert.equal(ld['@type'], 'Product');
  assert.equal(ld.name, 'Shampoing Clarifiant');
  assert.equal(ld.brand.name, 'As I Am');
  assert.equal(ld.offers.price, '14.90');
  assert.equal(ld.offers.priceCurrency, 'EUR');
  assert.equal(ld.offers.availability, 'https://schema.org/InStock');
  assert.equal(ld.offers.url, `${SITE}/produit/shampoing-clarifiant`);
  assert.deepEqual(ld.image, ['https://exemple.test/a.jpg']);
  ok('la fiche annonce un Produit : prix, devise, disponibilité, image');
}

// ——— 2. Une précommande n'est pas annoncée « en stock » ———
{
  const [page] = productPagesFrom(
    [{ id: 'p-2', slug: 'preco-kit', name: 'Kit Précommande', price: 89.9, isPreorder: true, in_stock: true }],
    SITE
  );
  const ld = page.jsonLd as any;
  assert.equal(ld.offers.availability, 'https://schema.org/PreOrder');
  assert.match(page.priceLabel as string, /89,90 €/);
  assert.match(page.priceLabel as string, /précommande/i);
  ok('précommande : annoncée PreOrder, jamais « en stock »');
}

// ——— 3. Rupture de stock ———
{
  const [page] = productPagesFrom(
    [{ id: 'p-3', slug: 'rupture', name: 'Produit épuisé', price: 20, in_stock: false }],
    SITE
  );
  assert.equal((page.jsonLd as any).offers.availability, 'https://schema.org/OutOfStock');
  ok('rupture annoncée comme telle');
}

// ——— 4. La remise l'emporte sur le prix de base ———
{
  const [page] = productPagesFrom(
    [{ id: 'p-4', slug: 'promo', name: 'Produit remisé', price: 30, promotion_price: 19.5, in_stock: true }],
    SITE
  );
  assert.equal((page.jsonLd as any).offers.price, '19.50');
  ok('prix remisé servi au moteur, pas le prix barré');
}

// ——— 5. Un produit sans prix ne fabrique pas de fausse offre ———
{
  const [page] = productPagesFrom(
    [{ id: 'p-5', slug: 'sans-prix', name: 'Produit sans prix', in_stock: true }],
    SITE
  );
  assert.equal((page.jsonLd as any).offers, undefined, 'mieux vaut aucune offre qu’une offre fausse');
  assert.match(page.priceLabel as string, /En stock/);
  ok('sans prix : aucune offre inventée');
}

// ——— 6. Robustesse : produits invalides ignorés ———
{
  const pages = productPagesFrom([null, {}, { slug: '   ' }, { slug: 'ok', name: 'Ok' }] as any[], SITE);
  assert.equal(pages.length, 1, 'seuls les produits avec un slug sont publiés');
  assert.equal(pages[0].path, '/produit/ok');
  ok('entrées invalides ignorées sans casser la génération');
}

console.log(`\nCHANTIER RÉFÉRENCEMENT PRODUIT — ${checks} contrôles passés.\n`);
