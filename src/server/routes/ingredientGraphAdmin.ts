import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { getProductIngredientLinks } from '../../lib/db/ingredientLinkStore';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';
import { isProductInWorkspace, readWorkspaceScope } from '../workspaceScope';

async function productInScope(productId: string, scope: ReturnType<typeof readWorkspaceScope>): Promise<boolean> {
  if (!scope) return true;
  const product = (await serverDb.getAdminCatalogProducts()).find(item => String(item.id) === productId || String(item.slug) === productId);
  return Boolean(product && isProductInWorkspace(product, scope));
}

/**
 * CHANTIER 10 (bloc B1) — alimentation du graphe d'ingrédients.
 *
 * Trois opérations d'administration, parce que le graphe était lu partout et
 * écrit nulle part :
 *  - rattacher des ingrédients à un produit (identifiants connus ou mentions
 *    déclarées) ;
 *  - alimenter en lot à partir des listes déjà déclarées sur les produits ;
 *  - mesurer la couverture réelle, sans arrondi optimiste.
 *
 * Ce qui n'a pas de correspondance dans le référentiel est renvoyé à
 * l'opérateur, jamais rattaché au hasard.
 */
export function registerIngredientGraphRoutes(app: Express): void {
  app.post('/api/admin/catalog/:productId/ingredients', rateLimit('admin-product-ingredients', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    if (scope && !(await productInScope(req.params.productId, scope))) {
      return res.status(404).json({ error: 'Produit introuvable dans cet espace.' });
    }

    const items = (req.body?.ingredients ?? req.body?.items) as unknown;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Fournissez une liste `ingredients` non vide.' });
    }

    try {
      const result = await serverDb.attachProductIngredients(admin.id, req.params.productId, items as never);
      // 207-like : on dit franchement que tout n'a pas été rattaché.
      res.status(result.complete ? 201 : 207).json(result);
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Rattachement impossible.' });
    }
  }));

  app.post('/api/admin/catalog/ingredients/link-declared', rateLimit('admin-ingredient-link', 5, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (readWorkspaceScope(req)) {
      return res.status(400).json({ error: 'Le rattachement global des ingrédients exige un contexte sans workspace filtré.' });
    }
    const report = await serverDb.linkAllDeclaredIngredients();
    res.json(report);
  }));

  app.get('/api/admin/catalog/ingredient-coverage', rateLimit('admin-ingredient-coverage', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const scope = readWorkspaceScope(req);
    if (!scope) {
      const coverage = await serverDb.getIngredientGraphCoverage();
      return res.json(coverage);
    }
    const products = (await serverDb.getAdminCatalogProducts()).filter(product => isProductInWorkspace(product, scope));
    const counts = await Promise.all(products.map(async product => (await getProductIngredientLinks(serverDb, String(product.id))).length));
    const links = counts.reduce((total, count) => total + count, 0);
    const productsWithLinkedIngredients = counts.filter(count => count > 0).length;
    res.json({
      generatedAt: new Date().toISOString(),
      products: products.length,
      productsWithLinkedIngredients,
      productsWithoutLinkedIngredients: products.length - productsWithLinkedIngredients,
      links,
      // The ingredient catalog has no workspace relation in the current schema.
      ingredientsInCatalog: null,
      coveragePercent: products.length === 0 ? 0 : Math.round((productsWithLinkedIngredients / products.length) * 100),
      scope
    });
  }));
}
