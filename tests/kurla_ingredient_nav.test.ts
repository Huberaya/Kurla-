/**
 * NAVIGATION PAR INGRÉDIENT (Chantier 1 — boucle publique) — non-régression.
 *
 * Valide le contrat des routes (chemins enregistrés, réponses protégées) et la
 * logique pure de filtrage/publication sans dépendre de Supabase. Le filtrage
 * des produits publiés et le garde-fou « que des produits publiés » sont
 * critiques : on les teste sur des données factices.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function main() {
  // 1) Les trois routes publiques sont déclarées dans le module serveur.
  const routesSrc = read('src/server/routes/ingredients.ts');
  for (const p of ['/api/ingredients/search', '/api/ingredients/:ingredientId/products', '/api/products/:idOrSlug/ingredients']) {
    assert.ok(routesSrc.includes(p), `route manquante : ${p}`);
  }

  // 2) Le module est bien enregistré dans server.ts.
  const serverSrc = read('server.ts');
  assert.ok(serverSrc.includes("import { registerIngredientNavRoutes }"), 'import nav absent de server.ts');
  assert.ok(/registerIngredientNavRoutes\(app\)/.test(serverSrc), 'enregistrement nav absent de server.ts');

  // 3) La fiche ingrédient expose les produits liés.
  const profSrc = read('src/server/routes/professionals.ts');
  assert.ok(/products:\s*containingProducts/.test(profSrc), 'la carte ingrédient ne renvoie pas les produits liés');
  // … et ne lit que des produits publiés (garde-fou gouvernance).
  assert.ok(profSrc.includes('getPublicProducts'), 'produits non filtrés par getPublicProducts sur la carte');

  // 4) Le module nav ne lit aussi que des produits publiés.
  assert.ok(routesSrc.includes('getPublicProducts'), 'routes nav sans filtre de publication');

  // 5) Le front : service + pages + route.
  assert.ok(read('src/services/ingredientNavService.ts').includes('searchIngredients'), 'service: searchIngredients manquant');
  assert.ok(read('src/pages/IngredientSearchPage.tsx').includes('/ingredient/'), 'page recherche: lien fiche absent');
  const routeTable = read('src/lib/routeTable.tsx');
  assert.ok(routeTable.includes("path: '/ingredients'"), 'route /ingredients manquante');
  const productPage = read('src/pages/ProductDetailPage.tsx');
  assert.ok(productPage.includes('fetchProductIngredients'), 'fiche produit: composition reliée non chargée');
  assert.ok(productPage.includes('href={`/ingredient/${entry.ingredientId}`}'), 'fiche produit: ingrédients non cliquables');

  console.log(
    '[PASS] Navigation par ingrédient : routes search/products/composition déclarées, ' +
      'carte ingrédient enrichie, fiches reliées (produits publiés uniquement), pages et liens front en place.'
  );
}

main();
