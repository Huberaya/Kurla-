import type { Express, Response } from 'express';

import { serverDb } from '../../lib/serverDb';
import { evaluateEditorialCompliance } from '../../lib/editorialCompliance';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

/**
 * CHANTIER 9 (bloc A4) — CMS sous AI Act, article 50(4).
 *
 * Deux routes d'administration :
 *  - écrire un article, la publication étant refusée tant que la règle n'est
 *    pas satisfaite (422 avec les champs manquants, pas un 500 vague) ;
 *  - auditer le fonds existant, article par article.
 *
 * Le refus porte sur la **publication**, pas sur la rédaction : un brouillon
 * généré par IA reste enregistrable, la rédaction a besoin de travailler.
 */
export function registerEditorialComplianceRoutes(app: Express): void {
  app.post('/api/admin/content/articles', rateLimit('admin-content-article', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const input = (req.body ?? {}) as Record<string, unknown>;
    try {
      const article = await serverDb.saveContentArticle(input, admin.id);
      res.status(input?.status === 'published' ? 201 : 200).json({ article });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enregistrement impossible.';
      // Une règle de conformité non satisfaite n'est pas une erreur serveur :
      // on renvoie 422 avec la raison, pour que la rédaction sache quoi corriger.
      if (message.startsWith('Publication refusée')) {
        const compliance = evaluateEditorialCompliance({
          generatedBy: input.generatedBy,
          aiDisclosure: input.aiDisclosure,
          editorialReview: input.editorialReview
        });
        return res.status(422).json({ error: message, mode: compliance.mode, missing: compliance.missing });
      }
      return res.status(400).json({ error: message });
    }
  }));

  app.get('/api/admin/content/compliance', rateLimit('admin-content-compliance', 20, 60_000), asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    const report = await serverDb.getEditorialComplianceReport();
    res.json(report);
  }));
}
