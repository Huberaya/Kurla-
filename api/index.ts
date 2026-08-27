import type { IncomingMessage, ServerResponse } from 'node:http';

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

// Le module serveur est charge a la premiere invocation et non a l'import : un
// echec de chargement (module introuvable dans le bundle, dependance native
// absente) doit pouvoir etre repondu en JSON plutot que de produire une 500
// opaque de plateforme sans aucun message exploitable.
let serverModule: Promise<typeof import('../server')> | null = null;
function loadServer(): Promise<typeof import('../server')> {
  serverModule = serverModule || import('../server');
  return serverModule;
}

let startup: Promise<{ ready: boolean; error: string | null }> | null = null;

function withApiPrefix(url: string): string {
  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) return url;
  return `/api${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Forme plate : sans `strictNullChecks`, une union discriminée ne se réduit
 *  pas de façon fiable à la compilation. */
interface StartupOutcome {
  ready: boolean;
  error: string | null;
  crashed: boolean;
}

/**
 * `prepareServerlessRuntime()` est contractuellement censée retourner l'échec
 * comme donnée. Si elle lève malgré tout, l'invocation ne doit pas pour autant
 * se terminer en 500 opaque : on répond en JSON avec le message réel.
 */
async function runStartup(
  prepare: () => Promise<{ ready: boolean; error: string | null }>
): Promise<StartupOutcome> {
  try {
    startup = startup || prepare();
    const value = await startup;
    return { ready: value.ready, error: value.error, crashed: false };
  } catch (error) {
    startup = null;
    return {
      ready: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      crashed: true
    };
  }
}

function answerJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  req.url = withApiPrefix(req.url || '/');

  let app: (req: never, res: never) => void;
  let prepareServerlessRuntime: () => Promise<{ ready: boolean; error: string | null }>;
  try {
    ({ app, prepareServerlessRuntime } = await loadServer());
  } catch (error) {
    answerJson(res, 500, {
      error: 'Le serveur KURLA n’a pas pu être chargé.',
      detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    });
    return;
  }

  // Memoized: one platform container performs the startup sequence once and
  // every warm invocation reuses the result.
  const { ready, error, crashed } = await runStartup(prepareServerlessRuntime);

  if (crashed) {
    answerJson(res, 500, {
      error: 'Le démarrage du serveur KURLA a échoué de façon inattendue.',
      detail: error,
    });
    return;
  }

  if (!ready) {
    answerJson(res, 503, {
      error: 'Le serveur KURLA n’a pas pu démarrer : la configuration du déploiement est incomplète.',
      detail: error,
      hint: 'Vérifiez les variables d’environnement du projet (SUPABASE_URL, SUPABASE_SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_ENABLED, STRIPE_WEBHOOK_SECRET, VITE_APP_URL, EMAIL_PROVIDER, EMAIL_PROVIDER_API_KEY).',
    });
    return;
  }

  // Express accepts the platform request/response pair directly.
  app(req as never, res as never);
}
