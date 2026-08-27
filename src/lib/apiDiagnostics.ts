/**
 * Diagnostic des échecs d'appel API.
 *
 * Problème résolu : quand le front est déployé sans le backend derrière le même
 * domaine, chaque `fetch('/api/…')` reçoit la page d'erreur de l'hébergeur
 * (HTML, ou un JSON de la forme `{"error":{"code":"NOT_FOUND"}}`). Les aides
 * `parseError`/`parseResponse` attendent `error` sous forme de **chaîne** ;
 * elles retombaient donc soit sur un message générique, soit affichaient le
 * code d'infrastructure brut à l'utilisateur.
 *
 * Le serveur KURLA répond toujours `{"error":"<message en clair>"}`. Toute
 * réponse d'erreur qui n'a pas cette forme ne vient pas de KURLA : c'est un
 * problème de déploiement, et c'est comme tel qu'il est décrit.
 *
 * L'intercepteur couvre les ~90 appels `fetch` existants sans les réécrire.
 */

export const API_UNAVAILABLE_EVENT = 'kurla:api-unavailable';

export interface ApiFailureDetail {
  status: number;
  url: string;
  message: string;
}

const HOST_NOT_SERVING_API = 'Le serveur d’application KURLA n’est pas joignable sur ce domaine : l’API n’y est pas déployée. Le backend Express doit être servi derrière le même domaine (fonction serverless api/index.ts + réécriture /api).';

/**
 * Décrit un échec qui ne provient pas du serveur KURLA.
 * Exporté pour être réutilisable par un test unitaire sans navigateur.
 */
export function describeApiFailure(status: number, contentType: string, bodyText: string, headers?: { vercelId?: string | null }): string {
  const isHtml = contentType.includes('text/html') || bodyText.trimStart().startsWith('<');
  const platform = headers?.vercelId || (bodyText.includes('vercel') ? 'Vercel' : null);
  const suffix = platform ? ` (réponse de ${platform})` : '';

  if (status === 404) {
    return `${HOST_NOT_SERVING_API}${suffix}`;
  }
  if (status === 405) {
    return `Méthode HTTP refusée par l’infrastructure pour cet appel${suffix}. La route API correspondante n’est probablement pas exposée par le déploiement.`;
  }
  if (status === 502 || status === 503 || status === 504) {
    return `Le service KURLA est momentanément indisponible (HTTP ${status})${suffix}. Réessayez dans un instant.`;
  }
  if (isHtml) {
    return `Réponse inattendue de l’infrastructure (HTTP ${status})${suffix} : l’API n’a pas traité la demande.`;
  }
  return `Réponse inattendue de l’infrastructure (HTTP ${status})${suffix}.`;
}

/**
 * Une erreur KURLA est toujours un objet JSON dont `error` est une chaîne.
 * Tout le reste (HTML, `error` objet, corps vide, JSON non objet) est traité
 * comme une réponse d'infrastructure.
 */
export function isKurlaErrorResponse(bodyText: string): boolean {
  if (!bodyText.trim()) return false;
  try {
    const parsed = JSON.parse(bodyText);
    return Boolean(parsed) && typeof parsed === 'object' && typeof (parsed as { error?: unknown }).error === 'string';
  } catch {
    return false;
  }
}

function resolveRequestUrl(input: RequestInfo | URL): string | null {
  try {
    if (typeof input === 'string') return new URL(input, window.location.origin).pathname;
    if (input instanceof URL) return input.pathname;
    if (typeof Request !== 'undefined' && input instanceof Request) return new URL(input.url).pathname;
  } catch {
    return null;
  }
  return null;
}

let installed = false;

/**
 * Enveloppe `window.fetch` pour remplacer le corps des erreurs
 * d'infrastructure par un message exploitable. Idempotent.
 */
export function installApiFailureInterceptor(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    const pathname = resolveRequestUrl(input);
    // Seules les réponses d'erreur de nos propres routes sont réécrites.
    if (!pathname || !pathname.startsWith('/api/') || response.ok) return response;

    const contentType = response.headers.get('content-type') || '';
    const bodyText = await response.clone().text().catch(() => '');
    if (isKurlaErrorResponse(bodyText)) return response;

    const message = describeApiFailure(response.status, contentType, bodyText, {
      vercelId: response.headers.get('x-vercel-id'),
    });

    window.dispatchEvent(new CustomEvent<ApiFailureDetail>(API_UNAVAILABLE_EVENT, {
      detail: { status: response.status, url: pathname, message },
    }));

    return new Response(JSON.stringify({ error: message, hostFailure: true, status: response.status }), {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  };
}

/**
 * Message d'erreur à afficher pour une réponse déjà lue.
 *
 * À utiliser par les aides `parseError`/`parseResponse` des services : elles ont
 * déjà consommé le corps, donc on leur passe le résultat du `json()` au lieu de
 * relire la réponse. Si `error` est une chaîne (forme KURLA), elle est reprise
 * telle quelle ; sinon l'échec est décrit comme un problème d'infrastructure.
 */
export function apiErrorMessage(response: Response, data: unknown, fallback: string): string {
  const error = (data as { error?: unknown } | null)?.error;
  if (typeof error === 'string' && error.trim()) return error;

  const contentType = response.headers.get('content-type') || '';
  const vercelId = response.headers.get('x-vercel-id');
  const nestedMessage = (error as { message?: unknown } | null)?.message;

  // Une erreur d'hébergeur est identifiable même sans corps exploitable : le
  // statut et l'en-tête de plateforme suffisent à la décrire.
  if (response.status >= 500 || response.status === 404 || vercelId || contentType.includes('text/html')) {
    const rawBody = typeof nestedMessage === 'string' ? nestedMessage : JSON.stringify(data ?? '');
    return describeApiFailure(response.status, contentType, rawBody, { vercelId });
  }

  return fallback;
}
