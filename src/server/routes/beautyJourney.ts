import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { asyncRoute, rateLimit } from '../http';
import { requireUser } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 8.4 — Beauty Journey : la narration de l'évolution.
 * CHANTIER 8.5 — ce que KURLA+ y ajoute.
 *
 * Une seule route, en lecture seule : le parcours ne collecte rien, il relit ce
 * que la personne a déjà déclaré et le lui rend lisible.
 *
 * KURLA+ ne coupe aucune fenêtre : l'historique reste entier pour tout le monde.
 * Ce qui est réservé à l'abonnement, c'est la synthèse écrite et le nombre de
 * paires de photos comparées. La réponse dit lequel des deux s'applique, et
 * pourquoi — un droit non débloqué est nommé, jamais laissé à deviner.
 */
export function registerBeautyJourneyRoutes(app: Express): void {
  app.get('/api/beauty-journey', rateLimit('beauty-journey', 30, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;
    const [state, persistence] = await Promise.all([
      serverDb.getMembershipState(user.id),
      serverDb.getBeautyJourneyPersistence()
    ]);
    const view = await serverDb.getBeautyJourneyView(user.id, state.effectivePlan);
    res.json({
      journey: view.journey,
      synthesis: view.synthesis,
      synthesisUnavailableReason: view.synthesisUnavailableReason,
      comparisonLimit: view.comparisonLimit,
      membershipPlan: state.effectivePlan,
      persistence
    });
  }));
}
