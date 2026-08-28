import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import type { AsyncRouteHandler } from './types';

/**
 * CHANTIER 8.1 — plomberie HTTP, extraite de `server.ts`.
 *
 * Déplacée telle quelle : ces fonctions étaient déjà indépendantes du domaine
 * métier. Les sortir permet aux modules de routes de les importer sans
 * réimporter tout le serveur (et donc sans recréer l'application Express).
 */

export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function requestAddress(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimit(name: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${name}:${requestAddress(req)}`;
    const current = rateLimitBuckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    // Keep this process-local fallback bounded. A multi-instance deployment
    // should place a shared limiter at the edge as well.
    if (rateLimitBuckets.size > 10000) {
      for (const [bucketKey, value] of rateLimitBuckets) {
        if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
      }
    }

    if (bucket.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Trop de requêtes. Réessayez plus tard.' });
    }
    next();
  };
}

/**
 * Enveloppe les gestionnaires asynchrones : une promesse rejetée devient un
 * appel à `next(error)` au lieu d'une requête qui pend jusqu'au timeout.
 */
export function asyncRoute(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** En-têtes de sécurité et identifiant de requête, appliqués à toute réponse. */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  const requestId = typeof req.headers['x-request-id'] === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(req.headers['x-request-id'])
    ? req.headers['x-request-id']
    : randomUUID();
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.on('finish', () => {
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({
        event: 'http_server_error',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode
      }));
    }
  });
  next();
}

/**
 * Message d'erreur renvoyé au client. Le détail technique ne sort du processus
 * qu'hors production : une stack trace en production est une fuite d'information.
 */
export function safeApiError(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/** Identifiant anonyme déclaré par le client, borné à un format sûr. */
export function getAnonymousId(req: Request): string | null {
  const candidate = req.body?.anonymousId || req.headers['x-anonymous-id'];
  if (typeof candidate !== 'string') return null;
  const value = candidate.trim();
  return /^[a-zA-Z0-9_-]{8,128}$/.test(value) ? value : null;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * URL publique de l'application, dans l'ordre : configuration explicite, origine
 * de la requête, en-têtes de proxy. Utilisée pour les liens envoyés par email et
 * les URLs de retour Stripe — un lien construit sur `localhost` en production
 * serait un email mort.
 */
export function getAppUrl(req: Request): string {
  const envUrl = process.env.VITE_APP_URL;
  if (envUrl && envUrl.trim() !== '' && envUrl !== 'http://localhost:3000') {
    return envUrl.replace(/\/$/, '');
  }
  const origin = req.headers['origin'] || req.headers['referer'];
  if (origin && typeof origin === 'string') {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch (e) {}
  }
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}
