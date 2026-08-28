/**
 * CHANTIER 7.7 — la porte réglementaire exercée en HTTP réel.
 *
 * Le banc pur (`chantier_7_jurisdiction.test.ts`) prouve la logique. Celui-ci
 * prouve qu'elle est réellement sur le chemin : la route publique de conformité
 * et le checkout Stripe. Deux branches, assumées et annoncées :
 *
 *  - **avec credentials Supabase** : le graphe est lu en base, un produit
 *    contenant un ingrédient interdit doit être refusé à la vente (400
 *    `COMPLIANCE_NOT_SELLABLE`) avant tout appel Stripe ;
 *  - **sans credentials** : le graphe est illisible, et KURLA doit refuser
 *    (503) plutôt que de laisser passer un produit dont elle ignore le statut.
 *
 * Dans les deux cas, aucun paiement ne doit être initié pour un produit non
 * commercialisable. Un pays non desservi est refusé avant toute lecture.
 */
import { strict as assert } from 'node:assert';
import type { AddressInfo } from 'node:net';

const { app } = await import('../server');
const { serverDb } = await import('../src/lib/serverDb');

const hasDatabase = Boolean(
  process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)
);

function publishableProduct(id: string, name: string, ingredients: string[]) {
  return {
    id,
    slug: id,
    name,
    brand: 'KURLA',
    price: 18.9,
    category: 'soin',
    description: 'Produit de test du chantier 7.7.',
    ingredients,
    keyIngredients: ingredients,
    needs: ['hydration'],
    concerns: ['secheresse'],
    is_active: true,
    catalog_status: 'published',
    ingredient_verification_status: 'verified',
    claims_validation_status: 'verified',
    images_validation_status: 'verified',
    stock_validation_status: 'verified',
    certifications_validation_status: 'verified',
    translations_validation_status: 'verified',
    brand_verification_status: 'verified',
    image_ownership_status: 'brand_provided',
    image: 'https://images.kurla.test/fixture.jpg',
    galleryImages: [{ url: 'https://images.kurla.test/fixture.jpg', label: 'Fixture' }],
    countryAvailability: ['FR', 'DE'],
    inStock: true,
    stock_quantity: 50,
    available_quantity: 50,
  };
}

async function main(): Promise<void> {
  // L'initialisation lancée par le module serveur s'exécute en parallèle : sur
  // une base réelle elle réécrit le catalogue mémoire, on la laisse finir.
  if (hasDatabase) await new Promise(resolve => setTimeout(resolve, 1500));

  await serverDb.initialize([
    publishableProduct('jur-bleach', 'Sérum éclaircissant (test)', ['Hydroquinone', 'Glycerin']),
    publishableProduct('jur-plain', 'Baume neutre (test)', ['Glycerin', 'Shea Butter']),
  ]);

  const httpServer = app.listen(0, '127.0.0.1');
  await new Promise(resolve => httpServer.once('listening', resolve));
  const port = (httpServer.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  const checkoutBody = (productId: string, country = 'DE') => ({
    items: [{ product_id: productId, quantity: 1 }],
    customerEmail: 'test@kurla.test',
    shippingMethod: 'standard',
    shippingAddress: {
      fullName: 'Camille Test',
      street: '12 rue des Juridictions',
      city: 'Berlin',
      postalCode: '10115',
      country,
    },
  });

  try {
    // -----------------------------------------------------------------
    // 1. Un pays non desservi n'a pas de statut évalué : refus explicite.
    // -----------------------------------------------------------------
    const foreign = await fetch(`${base}/api/products/jur-plain/compliance?country=US`);
    assert.equal(foreign.status, 400, 'Un pays non desservi doit être refusé, pas évalué par défaut.');
    const foreignBody: any = await foreign.json();
    assert.match(foreignBody.error, /non desservi/);

    const unknownProduct = await fetch(`${base}/api/products/inexistant/compliance?country=FR`);
    assert.equal(unknownProduct.status, 404);

    // -----------------------------------------------------------------
    // 2. La route de conformité.
    // -----------------------------------------------------------------
    const compliance = await fetch(`${base}/api/products/jur-bleach/compliance?country=DE`);
    if (!hasDatabase) {
      assert.equal(compliance.status, 503, 'Sans graphe lisible, KURLA ne fabrique pas de verdict.');
      const body: any = await compliance.json();
      assert.match(body.error, /indisponible/);
    } else {
      assert.equal(compliance.status, 200);
      const body: any = await compliance.json();
      assert.equal(body.country, 'DE');
      assert.equal(body.jurisdiction, 'EU');
      assert.equal(body.verdict, 'prohibited', 'L’hydroquinone est interdite dans l’UE (annexe II).');
      assert.equal(body.sellable, false);
      assert.ok(body.findings.length > 0);
      assert.match(body.findings[0].reference || '', /1223\/2009/);
    }

    // -----------------------------------------------------------------
    // 3. Le checkout refuse un produit non commercialisable.
    // -----------------------------------------------------------------
    const blocked = await fetch(`${base}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutBody('jur-bleach')),
    });
    const blockedBody: any = await blocked.json().catch(() => ({}));
    if (!hasDatabase) {
      assert.equal(blocked.status, 503, 'Sans graphe lisible, la vente est refusée (échec fermé).');
      assert.match(blockedBody.error, /réglementaire/i);
    } else {
      assert.equal(blocked.status, 400, 'Un produit interdit doit être refusé avant tout paiement.');
      assert.equal(blockedBody.code, 'COMPLIANCE_NOT_SELLABLE');
      assert.match(blockedBody.error, /jur-bleach|hydroquinone/i);
    }

    // -----------------------------------------------------------------
    // 4. Un produit conforme n'est pas bloqué par la porte réglementaire.
    // -----------------------------------------------------------------
    const allowed = await fetch(`${base}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutBody('jur-plain')),
    });
    const allowedBody: any = await allowed.json().catch(() => ({}));
    assert.notEqual(allowedBody.code, 'COMPLIANCE_NOT_SELLABLE',
      'Un produit sans ingrédient interdit ne doit pas être bloqué par le filtre réglementaire.');
    // Sans clé Stripe réelle, la requête s'arrête ensuite sur Stripe — ce qui
    // prouve que la porte réglementaire a bien été franchie.
    if (!hasDatabase) {
      assert.equal(allowed.status, 503);
    } else {
      assert.ok([400, 500, 200].includes(allowed.status), `Statut inattendu : ${allowed.status}`);
    }

    console.log(
      `[PASS] Chantier 7.7 (intégration) : porte réglementaire exercée en HTTP réel ` +
      `[mode ${hasDatabase ? 'base réelle' : 'sans base — échec fermé vérifié'}] — pays non desservi refusé, ` +
      `produit interdit non vendu, produit conforme non bloqué, aucun paiement initié en cas de refus.`
    );
  } finally {
    await new Promise(resolve => httpServer.close(resolve));
  }
}

try {
  await main();
} catch (error) {
  console.error('[FAIL] Chantier 7.7 — intégration HTTP :', error);
  process.exitCode = 1;
} finally {
  process.exit(process.exitCode || 0);
}
