import { createRequire } from 'node:module';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * KURLA Beauty — point d'entrée serverless.
 *
 * Ce fichier fait exister le backend Express derrière le même domaine que le
 * front. Sans lui, un déploiement purement statique renvoie la page 404 de
 * l'hébergeur pour chaque appel `/api/*`, et l'application affiche un
 * « NOT_FOUND » d'infrastructure au lieu d'une erreur métier.
 *
 * Pourquoi un bundle précompilé plutôt qu'un `import '../server'` :
 * `package.json` déclare `"type": "module"` et `tsconfig.json` `module: ESNext`.
 * Le chargeur ESM de Node exige alors l'extension dans chaque spécificateur
 * relatif, alors que tout `src/**` importe sans extension (`./src/lib/serverDb`).
 * Compiler tel quel produit une cascade de `Cannot find module`. Le serveur est
 * donc bundlé par esbuild en `api/_server.cjs` pendant le build Vercel
 * (`--packages=external` : les dépendances restent résolues depuis
 * `node_modules`), ce qui supprime tout import relatif à l'exécution.
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
 *    appelé ici : c'est la plateforme qui possède le listener.
 *    `prepareServerlessRuntime()` rejoue l'assertion de configuration production
 *    puis l'initialisation du store, exactement comme le fait le processus
 *    persistant.
 *
 * Aucune erreur n'est laissée opaque : un échec de chargement ou de démarrage
 * est répondu en JSON avec le message réel, parce que les journaux d'exécution
 * ne sont pas toujours accessibles et qu'une 500 de plateforme ne dit rien.
 */

interface ServerBundle {
  app: (req: never, res: never) => void;
  prepareServerlessRuntime: () => Promise<{ ready: boolean; error: string | null }>;
}

/** Forme plate : sans `strictNullChecks`, une union discriminée ne se réduit pas
 *  de façon fiable à la compilation. */
interface StartupOutcome {
  ready: boolean;
  error: string | null;
  crashed: boolean;
}

// `_server.cjs` est du CommonJS dans un paquet `"type": "module"` : il faut un
// `require`, et celui d'ESM se construit depuis l'URL du module courant.
const requireCjs = createRequire(import.meta.url);

let serverModule: ServerBundle | null = null;
let loadFailure: string | null = null;

function loadServer(): ServerBundle | null {
  if (serverModule) return serverModule;
  if (loadFailure) return null;
  try {
    serverModule = requireCjs('./_server.cjs') as ServerBundle;
    return serverModule;
  } catch (error) {
    loadFailure = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return null;
  }
}

let startup: Promise<{ ready: boolean; error: string | null }> | null = null;

/**
 * `prepareServerlessRuntime()` est contractuellement censée retourner l'échec
 * comme donnée. Si elle lève malgré tout, l'invocation ne doit pas se terminer
 * en 500 opaque : on répond en JSON avec le message réel.
 */
async function runStartup(server: ServerBundle): Promise<StartupOutcome> {
  try {
    startup = startup || server.prepareServerlessRuntime();
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

function withApiPrefix(url: string): string {
  if (url === '/api' || url.startsWith('/api/') || url.startsWith('/api?')) return url;
  return `/api${url.startsWith('/') ? '' : '/'}${url}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  req.url = withApiPrefix(req.url || '/');

  const server = loadServer();
  if (!server) {
    answerJson(res, 500, {
      error: 'Le serveur KURLA n’a pas pu être chargé.',
      detail: loadFailure,
      hint: 'Le bundle api/_server.cjs doit être produit par le build (esbuild server.ts --bundle --outfile=api/_server.cjs).',
    });
    return;
  }

  const { ready, error, crashed } = await runStartup(server);

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

  // Express accepte directement la paire requête/réponse de la plateforme.
  server.app(req as never, res as never);
}
