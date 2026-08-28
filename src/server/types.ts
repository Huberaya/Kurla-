import type { NextFunction, Request, Response } from 'express';

import type { UserRole } from '../types';

/**
 * CHANTIER 8.1 — types partagés de la couche HTTP.
 *
 * Isolés dans leur propre module pour qu'aucun import circulaire n'apparaisse
 * entre `http.ts` (limitation, enveloppe asynchrone) et `auth.ts` (identité) :
 * les deux ont besoin de ces types, aucun n'a besoin de l'autre pour les définir.
 */

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

export type AsyncRouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => unknown;
