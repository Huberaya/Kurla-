import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

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
    const report = await serverDb.linkAllDeclaredIngredients();
    res.json(report);
  }));

  app.get('/api/admin/catalog/ingredient-coverage', rateLimit('admin-ingredient-coverage', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const coverage = await serverDb.getIngredientGraphCoverage();
    res.json(coverage);
  }));
}
