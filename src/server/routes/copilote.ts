import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit, safeApiError } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * COPILOTE — `GET /api/admin/copilote`.
 *
 * Le pouls de la plateforme en une réponse : visites, visiteurs, diagnostics,
 * inscriptions, panier, caisse, achats, commandes, catalogue et santé.
 *
 * Ce qui distingue cette route d'un tableau de bord ordinaire : **elle ne
 * rend jamais un 0 à la place d'un chiffre qu'elle n'a pas pu lire.** Chaque
 * indicateur porte son état (`mesure`, `aucun`, `non_mesurable`) et sa
 * lecture. Le détail est dans `src/lib/db/copiloteStore.ts`.
 */
export function registerCopiloteRoutes(app: Express): void {
  app.get(
    '/api/admin/copilote',
    rateLimit('admin-copilote', 60, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const joursDemandes = Number((req.query as Record<string, unknown>).jours);
      const jours = Number.isFinite(joursDemandes) && joursDemandes > 0 ? joursDemandes : 30;
      const depuis24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      try {
        const [pouls, produits, incidents] = await Promise.all([
          serverDb.lirePoulsPlateforme({ jours }),
          serverDb.compterProduitsActifs(),
          serverDb.compterIncidentsRecents(depuis24h)
        ]);

        res.json({
          genereLe: new Date().toISOString(),
          periodeJours: pouls.periodeJours,
          source: pouls.source,
          indicateurs: pouls.indicateurs,
          lecture: pouls.lecture,
          avertissements: pouls.avertissements,
          // Le catalogue et la santé ne sont pas des événements : ils se lisent
          // en base, et ils suivent la même règle (null, jamais 0, si muets).
          produitsActifs: produits.compte,
          sante: {
            incidents24h: incidents.compte,
            incidentsSource: incidents.source
          },
          // Rappel de ce que cette route ne fait pas, pour qu'on ne lui
          // demande pas l'inverse dans six mois.
          neFaitPas: [
            'Aucun chiffre n’est estimé, interpolé ou déduit : tout est lu.',
            'Aucun identifiant de session ni donnée personnelle n’est exposé — uniquement des comptes.',
            'Les commandes en attente de webhook Stripe ne sont pas comptées comme des ventes.'
          ]
        });
      } catch (error) {
        res.status(500).json({ error: safeApiError(error, 'copilote') });
      }
    })
  );
}
