import type { Express, NextFunction, Request, Response } from 'express';
import path from 'node:path';

import { renderSpaDocument } from './seoResolver';

/**
 * CHANTIER 13 — MONTAGE DU REPLI SPA.
 *
 * Extrait de `startServer` pour une raison précise : tant que ce montage vivait
 * à l'intérieur de la fonction de démarrage, aucun banc ne pouvait le traverser.
 * Le premier banc écrit ici « passait » ses assertions HTTP sur le 404 par défaut
 * d'Express — c'est-à-dire pour la mauvaise raison. Extraire le montage permet de
 * tester le comportement réellement livré.
 *
 * Comportement : un chemin inconnu répond 404 (tête `noindex`), une fiche produit
 * ou ingrédient reçoit sa propre canonique, et une route connue mais non
 * prérendue (espace compte) reste servie.
 */
export function mountSpaFallback(app: Express, distPath: string = path.join(process.cwd(), 'dist')): void {
  app.get('*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rendered = await renderSpaDocument(req.path, distPath);
      res.status(rendered.status).type('html').send(rendered.html);
    } catch (error) {
      next(error);
    }
  });
}
