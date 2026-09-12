import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { authenticateRequest, type AuthenticatedRequest } from '../auth';
import { intelligenceStore } from '../../lib/intelligenceStore';
import {
  analyseRoutineCoverage,
  buildRoutineComplements,
} from '../../lib/routineComplements';

/**
 * L1 — « Complète votre routine » (cross-sell explicable).
 *
 * `GET /api/routine/complements?products=id1,id2`
 *
 * - `products` : ids (ou slugs) des produits du contexte — le panier, ou le
 *   produit de la fiche. Max 10 ; sans paramètre la réponse est vide, jamais
 *   une erreur.
 * - Authentification FACULTATIVE : connectée, l'étagère (Shelf) compte — une
 *   étape déjà couverte chez elle n'est pas re-vendue, et un produit possédé
 *   n'est jamais proposé. Invitée, le contexte se limite au panier/fiche.
 *
 * La réponse contient la couverture calculée (`context.covered/missing`) :
 * l'interface peut montrer POURQUOI chaque proposition est là, et le banc le
 * fige.
 */
export function registerRoutineComplementRoutes(app: Express): void {
  app.get('/api/routine/complements', rateLimit('routine-complements', 120, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raw = Array.isArray(req.query.products)
        ? req.query.products.join(',')
        : typeof req.query.products === 'string' ? req.query.products : '';
      const ids = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);

      // L'invitée a droit aux compléments : sans étagère, le contexte est le
      // panier/fiche seul. requireUser renverrait un 401 — volontairement pas.
      const user = await authenticateRequest(req);

      const catalog = await serverDb.getPublicProducts();
      const contextProducts = catalog.filter(p => ids.includes(p.id) || (p.slug ? ids.includes(p.slug) : false));

      // Aucun produit du contexte résolu (ids inconnus) : on ne devine pas une
      // routine entière — proposer 3 soins à quelqu'un dont on ne connaît aucun
      // produit, ce serait un carrousel générique. L1 ne fait pas ça.
      if (contextProducts.length === 0) {
        return res.json({ suggestions: [], context: { covered: [], missing: [] }, personalized: Boolean(user), count: 0 });
      }

      const shelfItems = user ? await intelligenceStore.getShelf(user.id) : [];

      const context = analyseRoutineCoverage({ contextProducts, shelfItems });
      const suggestions = buildRoutineComplements(catalog, { contextProducts, shelfItems });

      res.json({
        suggestions,
        context,
        personalized: Boolean(user),
        count: suggestions.length,
      });
    } catch (error) {
      console.error('[RoutineComplements] error:', error);
      res.status(500).json({ error: safeApiError(error, 'Impossible de calculer les compléments de routine.') });
    }
  }));
}
