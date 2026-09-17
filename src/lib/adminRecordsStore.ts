/**
 * MAGASIN PARTAGÉ DES FICHES — fournisseurs et produits (17/09/2026).
 *
 * Le problème, tel que mesuré avant d'écrire :
 *
 *   · toutes les écritures fournisseur passaient par UN seul panneau
 *     (`SupplierAdminPanel`, 5 appelants de la route PATCH, tous dans ce
 *     fichier) — depuis le catalogue, on lisait « Fournisseur non rattaché »
 *     sans aucun moyen d'aller compléter la fiche ;
 *   · chaque panneau gardait ses données dans son propre `useState` : une
 *     modification faite ailleurs ne se propageait pas. Il fallait recharger
 *     la page pour la voir, donc personne ne savait si sa saisie avait pris.
 *
 * Ce module pose UN magasin partagé, abonné via `useSyncExternalStore` :
 *
 *   · une fiche fournisseur ou produit chargée une fois est relue par tous les
 *     panneaux qui l'affichent ;
 *   · après un enregistrement, les panneaux abonnés rechargent — la
 *     modification apparaît partout sans recharger la page ;
 *   · **mise à jour optimiste** : l'écran affiche immédiatement la valeur
 *     saisie, puis se corrige tout seul si le serveur refuse.
 *
 * Deux règles de sécurité, non négociables :
 *
 *   1. **Un échec n'est jamais laissé à l'écran comme une réussite.** La
 *      valeur optimiste est restaurée et l'erreur du serveur est retournée à
 *      l'appelant, qui l'affiche.
 *   2. **Une écriture invalide en cours bloque toute écriture ultérieure**
 *      (`dirty`), pour ne jamais empiler deux versions divergentes de la même
 *      fiche.
 *
 * Aucune route inventée : ce module n'appelle que des routes admin existantes.
 */

export type SupplierRecord = Record<string, any>;
export type ProductRecord = Record<string, any>;

interface StoreState {
  suppliers: Record<string, SupplierRecord>;
  products: Record<string, ProductRecord>;
  /** Compteur incrémenté à chaque écriture acceptée : c'est lui qui réveille
   *  les panneaux abonnés (ils rechargent leur propre liste). */
  version: number;
  /** Étiquettes des écritures en cours — tant qu'il y en a, on n'écrit plus. */
  dirty: string[];
}

let state: StoreState = { suppliers: {}, products: {}, version: 0, dirty: [] };
const listeners = new Set<() => void>();
/** Requêtes en vol, pour ne pas charger deux fois la même fiche. */
const inflightSuppliers = new Map<string, Promise<SupplierRecord | null>>();
const inflightProducts = new Map<string, Promise<ProductRecord | null>>();

function setState(patch: Partial<StoreState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function subscribeAdminRecords(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Instantané stable : `useSyncExternalStore` exige une référence identique
 *  tant que rien n'a changé, sinon React boucle. */
export function getAdminRecordsSnapshot(): StoreState {
  return state;
}

export function getAdminRecordsVersion(): number {
  return state.version;
}

export function isWritingAdminRecords(): boolean {
  return state.dirty.length > 0;
}

export function readSupplier(supplierId: string): SupplierRecord | null {
  return state.suppliers[String(supplierId)] || null;
}

export function readProduct(productId: string): ProductRecord | null {
  return state.products[String(productId)] || null;
}

/** Nom d'affichage d'un fournisseur : l'enseigne d'abord, la raison sociale
 *  ensuite, l'identifiant en dernier recours. Jamais de nom inventé. */
export function supplierDisplayName(supplier: SupplierRecord | null | undefined): string {
  if (!supplier) return '';
  return String(supplier.tradeName || supplier.legalName || supplier.id || '');
}

function headersWith(headers: HeadersInit): HeadersInit {
  return headers;
}

/**
 * Charge une fiche fournisseur dans le magasin. Plusieurs panneaux peuvent
 * l'appeler en même temps : une seule requête part, les autres attendent.
 */
export async function loadSupplier(
  supplierId: string,
  headers: HeadersInit,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {}
): Promise<SupplierRecord | null> {
  const id = String(supplierId);
  if (!id) return null;
  const cached = state.suppliers[id];
  const running = inflightSuppliers.get(id);
  if (running) return running;
  if (cached) return cached;

  const doFetch = options.fetchImpl || fetch;
  const base = options.baseUrl || '';
  const request = (async () => {
    const response = await doFetch(`${base}/api/admin/suppliers/${encodeURIComponent(id)}`, { headers: headersWith(headers) });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Fiche fournisseur indisponible.');
    const supplier: SupplierRecord = body?.supplier || body || {};
    setState({ suppliers: { ...state.suppliers, [id]: supplier } });
    return supplier;
  })();

  inflightSuppliers.set(id, request);
  try {
    return await request;
  } finally {
    inflightSuppliers.delete(id);
  }
}

/** Charge une fiche produit dans le magasin (même contrat que loadSupplier). */
export async function loadProduct(
  productId: string,
  headers: HeadersInit,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {}
): Promise<ProductRecord | null> {
  const id = String(productId);
  if (!id) return null;
  const cached = state.products[id];
  const running = inflightProducts.get(id);
  if (running) return running;
  if (cached) return cached;

  const doFetch = options.fetchImpl || fetch;
  const base = options.baseUrl || '';
  const request = (async () => {
    const response = await doFetch(`${base}/api/admin/catalog/products/${encodeURIComponent(id)}`, { headers: headersWith(headers) });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Fiche produit indisponible.');
    const product: ProductRecord = body?.product || body || {};
    setState({ products: { ...state.products, [id]: product } });
    return product;
  })();

  inflightProducts.set(id, request);
  try {
    return await request;
  } finally {
    inflightProducts.delete(id);
  }
}

export interface WriteResult {
  ok: boolean;
  error?: string;
  record?: Record<string, any>;
}

/**
 * Écrit une fiche fournisseur. Mise à jour optimiste, restaurée en cas
 * d'échec. Retourne toujours un résultat — l'appelant affiche l'erreur.
 *
 * `legalName` n'est jamais envoyé : le serveur la refuse explicitement
 * (l'identifiant en dérive), l'envoyer ferait échouer toute la saisie.
 */
export async function writeSupplier(
  supplierId: string,
  patch: Record<string, any>,
  headers: HeadersInit,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {}
): Promise<WriteResult> {
  const id = String(supplierId);
  const { legalName: _ignored, legal_name: _ignored2, id: _ignored3, ...safe } = patch || {};
  const keys = Object.keys(safe);
  if (keys.length === 0) return { ok: true, record: state.suppliers[id] || null };
  if (state.dirty.length > 0) {
    return { ok: false, error: 'Un enregistrement est déjà en cours — attendez sa fin pour ne pas écraser une autre saisie.' };
  }

  const previous = state.suppliers[id] || null;
  setState({
    suppliers: previous ? { ...state.suppliers, [id]: { ...previous, ...safe } } : state.suppliers,
    dirty: [...state.dirty, `supplier:${id}`],
  });

  const doFetch = options.fetchImpl || fetch;
  const base = options.baseUrl || '';
  try {
    const response = await doFetch(`${base}/api/admin/suppliers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: headersWith(headers),
      body: JSON.stringify(safe),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Fournisseur non mis à jour.');
    const saved: SupplierRecord = body?.supplier || { ...(previous || {}), ...safe };
    setState({
      suppliers: { ...state.suppliers, [id]: saved },
      version: state.version + 1,
      dirty: state.dirty.filter(entry => entry !== `supplier:${id}`),
    });
    return { ok: true, record: saved };
  } catch (error: any) {
    // Restauration : l'écran ne garde pas une valeur que le serveur a refusée.
    setState({
      suppliers: previous ? { ...state.suppliers, [id]: previous } : state.suppliers,
      dirty: state.dirty.filter(entry => entry !== `supplier:${id}`),
    });
    return { ok: false, error: String(error?.message || 'Fournisseur non mis à jour.') };
  }
}

/** Écrit une fiche produit. Même contrat que writeSupplier. */
export async function writeProduct(
  productId: string,
  patch: Record<string, any>,
  headers: HeadersInit,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {}
): Promise<WriteResult> {
  const id = String(productId);
  const { id: _ignored, ...safe } = patch || {};
  const keys = Object.keys(safe);
  if (keys.length === 0) return { ok: true, record: state.products[id] || null };
  if (state.dirty.length > 0) {
    return { ok: false, error: 'Un enregistrement est déjà en cours — attendez sa fin pour ne pas écraser une autre saisie.' };
  }

  const previous = state.products[id] || null;
  setState({
    products: previous ? { ...state.products, [id]: { ...previous, ...safe } } : state.products,
    dirty: [...state.dirty, `product:${id}`],
  });

  const doFetch = options.fetchImpl || fetch;
  const base = options.baseUrl || '';
  try {
    const response = await doFetch(`${base}/api/admin/catalog/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: headersWith(headers),
      body: JSON.stringify(safe),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Produit non mis à jour.');
    const saved: ProductRecord = body?.product || { ...(previous || {}), ...safe };
    setState({
      products: { ...state.products, [id]: saved },
      version: state.version + 1,
      dirty: state.dirty.filter(entry => entry !== `product:${id}`),
    });
    return { ok: true, record: saved };
  } catch (error: any) {
    setState({
      products: previous ? { ...state.products, [id]: previous } : state.products,
      dirty: state.dirty.filter(entry => entry !== `product:${id}`),
    });
    return { ok: false, error: String(error?.message || 'Produit non mis à jour.') };
  }
}

/**
 * Rattache (ou détache) un fournisseur à un produit.
 *
 * Route DÉDIÉE, mesurée avant d'écrire : `ProductSupplierPanel` rattache par
 * `PATCH /api/admin/products/:id/supplier`, et non par le PATCH produit.
 * Passer par la mauvaise route aurait donné un enregistrement qui « réussit »
 * à l'écran sans rien changer en base — exactement le symptôme que ce chantier
 * doit supprimer.
 *
 * `supplierId: null` détache : c'est un acte explicite, jamais un effet de bord
 * d'un champ laissé vide.
 */
export async function writeProductSupplierLink(
  productId: string,
  link: { supplierId: string | null; supplierSku?: string },
  headers: HeadersInit,
  options: { fetchImpl?: typeof fetch; baseUrl?: string } = {}
): Promise<WriteResult> {
  const id = String(productId);
  if (state.dirty.length > 0) {
    return { ok: false, error: 'Un enregistrement est déjà en cours — attendez sa fin pour ne pas écraser une autre saisie.' };
  }
  const previous = state.products[id] || null;
  const optimistic = {
    supplierId: link.supplierId,
    ...(link.supplierSku !== undefined ? { supplierSku: link.supplierSku } : {}),
  };
  setState({
    products: previous ? { ...state.products, [id]: { ...previous, ...optimistic } } : state.products,
    dirty: [...state.dirty, `link:${id}`],
  });

  const doFetch = options.fetchImpl || fetch;
  const base = options.baseUrl || '';
  try {
    const response = await doFetch(`${base}/api/admin/products/${encodeURIComponent(id)}/supplier`, {
      method: 'PATCH',
      headers: headersWith(headers),
      body: JSON.stringify(link),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error || 'Rattachement refusé.');
    setState({
      products: { ...state.products, [id]: { ...(previous || {}), ...optimistic } },
      version: state.version + 1,
      dirty: state.dirty.filter(entry => entry !== `link:${id}`),
    });
    return { ok: true, record: { ...(previous || {}), ...optimistic } };
  } catch (error: any) {
    setState({
      products: previous ? { ...state.products, [id]: previous } : state.products,
      dirty: state.dirty.filter(entry => entry !== `link:${id}`),
    });
    return { ok: false, error: String(error?.message || 'Rattachement refusé.') };
  }
}

/** Vide le magasin (changement d'espace, déconnexion, test). */
export function resetAdminRecords(): void {
  inflightSuppliers.clear();
  inflightProducts.clear();
  setState({ suppliers: {}, products: {}, version: 0, dirty: [] });
}
