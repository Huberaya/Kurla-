import type { IncomingMessage, ServerResponse } from 'node:http';
import { app, prepareServerlessRuntime } from '../server';

/**
 * KURLA Beauty — point d'entrée serverless.
 *
 * Ce fichier fait exister le backend Express derrière le même domaine que le
 * front. Sans lui, un déploiement purement statique renvoie la page 404 de
 * l'hébergeur pour chaque appel `/api/*`, et l'application affiche un
 * « NOT_FOUND » d'infrastructure au lieu d'une erreur métier.
 *
 * Deux points non négociables :
 *
 * 1. Le chemin conserve son préfixe `/api`. Selon la forme de la réécriture
 *    déclarée dans `vercel.json`, la fonction peut recevoir `/api/products`
 *    (chemin d'origine) ou `/products` (préfixe retiré). Les routes Express
 *    sont déclarées avec le préfixe, donc on le rétablit dans les deux cas au
 *    lieu de dépendre d'une sémantique de plateforme.
 *
 * 2. Le démarrage est attendu avant de servir. `startServer()` n'est jamais
 *    appelé ici : c'est la plateforme qui possède le listener. `prepareServerlessRuntime()`
 *    rejoue l'assertion de configuration production puis l'initialisation du
 *    store, exactement comme le fait le processus persistant.
 */

let startup: Promise<{ ready: boolean; error: string | null }> | null = null;

function withApiPrefix(url: string): string {
  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) return url;
  return `/api${url.startsWith('/') ? '' : '/'}${url}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  req.url = withApiPrefix(req.url || '/');

  // Memoized: one platform container performs the startup sequence once and
  // every warm invocation reuses the result.
  startup = startup || prepareServerlessRuntime();
  const { ready, error } = await startup;

  if (!ready) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'Le serveur KURLA n’a pas pu démarrer : la configuration du déploiement est incomplète.',
      detail: error,
      hint: 'Vérifiez les variables d’environnement du projet (SUPABASE_URL, SUPABASE_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_ENABLED, STRIPE_WEBHOOK_SECRET, VITE_APP_URL, EMAIL_PROVIDER, EMAIL_PROVIDER_API_KEY).',
    }));
    return;
  }

  // Express accepts the platform request/response pair directly.
  app(req as never, res as never);
}
