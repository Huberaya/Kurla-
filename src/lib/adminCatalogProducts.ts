/**
 * LISTE DES PRODUITS ADMINISTRABLES — chargement partagé (17/09/2026).
 *
 * Mesuré avant d'écrire ce fichier : l'onglet « Catalogue produits » montait
 * TROIS panneaux qui demandaient chacun la même liste, chacun de son côté —
 * BoutiqueAnomalyBanner, CatalogAdminPanel et ProductNeedsEditor — soit trois
 * requêtes identiques au montage du même onglet.
 *
 * « Identiques » est une mesure, pas une supposition. Le serveur lit l'espace
 * dans `readWorkspaceScope` (src/server/workspaceScope.ts) qui donne la
 * priorité à l'en-tête `x-kurla-workspace` sur le `?scope=` de l'URL, et
 * `adminHeaders` (AdminDashboardPage) porte toujours cet en-tête. Les trois
 * URL différaient donc uniquement par des paramètres que le serveur IGNORE :
 * le bandeau d'anomalies n'en passait aucun, le panneau catalogue passait
 * l'espace courant, et l'éditeur de besoins passait `all` — qui n'est ni
 * 'skin' ni 'hair', donc rejeté, l'en-tête s'appliquant dans les trois cas.
 * Les URL ne sont pas recopiées ici à dessein : l'inventaire des routes admin
 * (`tests/admin_route_inventory.test.ts`) compte les appelants en cherchant la
 * chaîne de la route dans tout `src`, commentaires compris.
 *
 * Une seule fonction les remplace : la clé de regroupement est l'URL +
 * l'en-tête d'espace, donc deux espaces différents ne peuvent jamais partager
 * une réponse.
 *
 * Regroupement STRICTEMENT CONCURRENTIEL : l'entrée est retirée du tableau dès
 * que la promesse est réglée. Rien n'est mis en cache après coup — après une
 * écriture, `loadData()` recharge réellement la liste. Ce module ne change que
 * le nombre de requêtes simultanées, jamais les données affichées.
 *
 * La réponse retournée est une COPIE par appelant (`structuredClone`) : un
 * `Response.json()` ne se lit qu'une fois, et un panneau qui muterait la liste
 * ne doit pas salir celle du voisin.
 */

export const ADMIN_CATALOG_PRODUCTS_URL = '/api/admin/catalog/products';

/** Clé de regroupement : deux requêtes ne sont fusionnées que si l'URL ET
 *  l'espace demandé sont identiques. */
export function productsRequestKey(url: string, workspace?: string): string {
  return `${url}#${(workspace || '').trim().toLowerCase() || 'aucun'}`;
}

export function readWorkspaceHeader(headers?: HeadersInit): string {
  if (!headers) return '';
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get('x-kurla-workspace') || '';
  }
  if (Array.isArray(headers)) {
    const hit = headers.find(([name]) => String(name).toLowerCase() === 'x-kurla-workspace');
    return hit ? String(hit[1]) : '';
  }
  for (const [name, value] of Object.entries(headers as Record<string, string>)) {
    if (String(name).toLowerCase() === 'x-kurla-workspace') return String(value);
  }
  return '';
}

/** Forme réelle de la réponse de la route admin de la liste produits :
 *  `res.json({ products, count, scope })` (catalogGovernance.ts). */
export interface AdminCatalogProductsResponse {
  products: any[];
  count?: number;
  scope?: string;
  error?: string;
}

/** Tableau des requêtes en cours, injectable pour le banc. */
export type Inflight = Map<string, Promise<AdminCatalogProductsResponse>>;

const defaultInflight: Inflight = new Map();

/**
 * Charge la liste des produits administrables. Plusieurs appels simultanés
 * avec la même clé partagent UNE requête réseau et reçoivent chacun leur
 * copie du JSON.
 */
export async function fetchAdminCatalogProducts(
  headers: HeadersInit,
  options: { url?: string; inflight?: Inflight; fetchImpl?: typeof fetch } = {}
): Promise<AdminCatalogProductsResponse> {
  const url = options.url || ADMIN_CATALOG_PRODUCTS_URL;
  const table = options.inflight || defaultInflight;
  const doFetch = options.fetchImpl || fetch;
  const workspace = readWorkspaceHeader(headers);
  const key = productsRequestKey(url, workspace);

  const running = table.get(key);
  if (running) return structuredClone(await running);

  const request = (async () => {
    const response = await doFetch(url, { headers });
    const body: AdminCatalogProductsResponse = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Catalogue indisponible.');
    return body;
  })();

  table.set(key, request);
  try {
    const body = await request;
    return structuredClone(body);
  } finally {
    // Retrait dès la résolution (succès ou échec) : jamais de cache périmé.
    if (table.get(key) === request) table.delete(key);
  }
}
