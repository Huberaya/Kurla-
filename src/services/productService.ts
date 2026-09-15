import { Product } from '../types';
import type { FicheCiblePeau } from '../lib/skinRangeTarget';
import type { FicheAvenirProduit } from '../lib/db/catalogStore';
import type { SkinKitQuote } from '../lib/skinKitPricing';
import { apiErrorMessage } from '../lib/apiDiagnostics';
import { useCallback, useEffect, useState } from 'react';

export interface SupabaseBrand {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
}

export interface SupabaseCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export interface FetchProductsResponse {
  products: Product[];
  skinKits: SkinKitQuote[];
  brands: SupabaseBrand[];
  categories: SupabaseCategory[];
  source: 'supabase' | 'fallback';
  count: number;
  error: Error | null;
}

/**
 * The browser consumes the customer API only. It never queries the internal
 * catalog tables directly, which keeps validation notes and operational fields
 * on the server/admin side.
 */
interface SsrProductContext {
  initialProducts?: Product[];
  initialProduct?: Product | null;
}

function ssrProductContext(): SsrProductContext | null {
  if (typeof window !== 'undefined') return null;
  return (globalThis as typeof globalThis & { __KURLA_SSR_CONTEXT?: SsrProductContext }).__KURLA_SSR_CONTEXT || null;
}

/**
 * MODE TEST (migration 20260926000000) : `?test=1` dans l'URL active la
 * lecture des fiches test fournisseur pour toute la session de navigation.
 * Le drapeau est conservé en sessionStorage pour survivre à la navigation
 * interne ; le retirer de l'URL ne suffit pas à l'enlever (volontaire : un
 * clic sur un lien interne ne doit pas faire disparaître les fiches test).
 * La boutique réelle, sans ce paramètre, ne charge jamais ces fiches.
 */
export function isTestModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === '1') {
      window.sessionStorage.setItem('kurla_test_mode', '1');
      return true;
    }
    if (params.has('test') && params.get('test') !== '1') {
      window.sessionStorage.removeItem('kurla_test_mode');
    }
    return window.sessionStorage.getItem('kurla_test_mode') === '1';
  } catch {
    return false;
  }
}

/** Adresse du catalogue public, selon le mode test en cours. */
function urlCataloguePublic(): string {
  return isTestModeActive() ? '/api/products?test=1' : '/api/products';
}

async function fetchPublicProducts(): Promise<{ products: Product[]; skinKits: SkinKitQuote[] }> {
  const response = await fetch(urlCataloguePublic());
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'Le catalogue publié est indisponible.'));
  return {
    products: Array.isArray(data.products) ? data.products : [],
    skinKits: Array.isArray(data.skinKits) ? data.skinKits : []
  };
}

/**
 * UN SEUL TÉLÉCHARGEMENT DU CATALOGUE POUR TOUTE L'APPLICATION (15/09/2026).
 *
 * Mesuré sur téléphone (iPhone, processeur ralenti 4×, 4G lente) :
 * `GET /api/products` partait **trois fois** sur la page d'accueil, parce que
 * le panier, la recherche et l'aperçu boutique appellent chacun `useProducts()`
 * et que le hook déclenchait sa propre requête. Trois fois 159 Ko décodés —
 * 477 Ko de JSON à analyser par un processeur déjà occupé — pour un catalogue
 * identique, au même instant.
 *
 * Le vol en cours est donc partagé : le premier appelant lance la requête,
 * les suivants se branchent sur la même promesse. Aucune mise en cache : la
 * donnée n'est pas conservée au-delà du vol, donc rien ne peut être périmé.
 * Un `refetch` explicite reste libre de relancer une lecture (`forcer`).
 */
/**
 * Fraîcheur du catalogue : au-delà, on relit.
 *
 * Trente secondes, pas davantage — et c'est un choix assumé, pas une
 * optimisation gratuite. Mesuré sur téléphone, une section de l'accueil se
 * monte trois secondes après la fin du premier téléchargement et relançait
 * donc une requête pour un catalogue déjà en mémoire. Sans cette fenêtre,
 * « partager le vol » ne sert qu'aux appelants strictement simultanés.
 *
 * Le risque est connu et borné : un visiteur peut voir un catalogue vieux
 * de trente secondes au plus. Aucun prix ni aucun stock n'en dépend — ils
 * sont recalculés côté serveur au panier et à la commande.
 */
const FRAICHEUR_CATALOGUE_MS = 30_000;

interface VolCatalogue {
  url: string;
  promesse: Promise<{ products: Product[]; skinKits: SkinKitQuote[] }>;
}

interface SuccesCatalogue {
  url: string;
  obtenuLe: number;
  produits: Product[];
  kits: SkinKitQuote[];
}

let volCatalogue: VolCatalogue | null = null;
let dernierSucces: SuccesCatalogue | null = null;

/**
 * Oublie le catalogue déjà lu. Sert à la sortie de session, au changement de
 * mode test, et aux bancs — jamais au rendu courant.
 */
export function reinitialiserCataloguePublic(): void {
  volCatalogue = null;
  dernierSucces = null;
}

export async function cataloguePublicPartage(
  forcer = false,
): Promise<{ products: Product[]; skinKits: SkinKitQuote[] }> {
  const url = urlCataloguePublic();

  // Déjà lu, et encore frais : on réutilise.
  if (
    !forcer
    && dernierSucces
    && dernierSucces.url === url
    && Date.now() - dernierSucces.obtenuLe < FRAICHEUR_CATALOGUE_MS
  ) {
    return { products: dernierSucces.produits, skinKits: dernierSucces.kits };
  }

  // Vol en cours : on s'y branche au lieu de lancer une requête de plus.
  if (!forcer && volCatalogue && volCatalogue.url === url) return volCatalogue.promesse;

  const promesse = fetchPublicProducts().then((resultat) => {
    dernierSucces = { url, obtenuLe: Date.now(), produits: resultat.products, kits: resultat.skinKits };
    return resultat;
  });
  volCatalogue = { url, promesse };
  // Le vol n'est libéré qu'une fois terminé : les appelants arrivés pendant le
  // trajet partagent la même réponse au lieu de relancer la même requête.
  void promesse.catch(() => {}).then(() => {
    if (volCatalogue && volCatalogue.promesse === promesse) volCatalogue = null;
  });
  return promesse;
}

export async function getProductsFromSupabase(forcer = false): Promise<FetchProductsResponse> {
  try {
    const result = await cataloguePublicPartage(forcer);
    return { products: result.products, skinKits: result.skinKits, brands: [], categories: [], source: 'supabase', count: result.products.length, error: null };
  } catch (error: any) {
    return {
      products: [],
      skinKits: [],
      brands: [],
      categories: [],
      source: 'fallback',
      count: 0,
      error: error instanceof Error ? error : new Error('Le catalogue publié est indisponible.')
    };
  }
}

/**
 * CHANTIER CONSOLIDATION — la fiche produit n'entraîne plus tout le catalogue.
 *
 * `GET /api/products/:slug` renvoie la même projection publique que la liste,
 * limitée à un produit. Un 404 est un état métier (non publié / retiré), pas
 * une panne : il est remonté sans essai de repli réseau.
 */
async function fetchPublicProduct(slugOrId: string): Promise<Product | null> {
  const response = await fetch(`/api/products/${encodeURIComponent(slugOrId)}`);
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La fiche produit est indisponible.'));
  return data.product ?? null;
}

export async function getProductBySlugOrIdFromSupabase(slugOrId: string): Promise<{
  product: Product | null;
  source: 'supabase' | 'fallback';
  error: Error | null;
}> {
  try {
    const product = await fetchPublicProduct(slugOrId);
    return product
      ? { product, source: 'supabase', error: null }
      : { product: null, source: 'supabase', error: new Error('Ce produit n’est pas publié ou n’est plus disponible.') };
  } catch (error: any) {
    return {
      product: null,
      source: 'fallback',
      error: error instanceof Error ? error : new Error('Ce produit n’est pas disponible pour le moment.')
    };
  }
}

export function useProducts() {
  const initial = ssrProductContext()?.initialProducts || [];
  const [products, setProducts] = useState<Product[]>(initial);
  const [skinKits, setSkinKits] = useState<SkinKitQuote[]>([]);
  const [brands, setBrands] = useState<SupabaseBrand[]>([]);
  const [categories, setCategories] = useState<SupabaseCategory[]>([]);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');
  const [count, setCount] = useState(initial.length);
  const [loading, setLoading] = useState(typeof window !== 'undefined' || initial.length === 0);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async (forcer = false) => {
    setLoading(true);
    const result = await getProductsFromSupabase(forcer);
    setProducts(result.products);
    setSkinKits(result.skinKits);
    setBrands(result.brands);
    setCategories(result.categories);
    setSource(result.source);
    setCount(result.count);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  // « Rafraîchir » doit vraiment relire : c'est le seul cas qui court-circuite
  // le vol partagé. Le montage, lui, se contente de s'y brancher.
  const refetch = useCallback(() => loadData(true), [loadData]);
  return { products, skinKits, brands, categories, source, count, loading, error, refetch };
}

export function useProduct(slugOrId: string) {
  const initialProduct = ssrProductContext()?.initialProduct || null;
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [source, setSource] = useState<'supabase' | 'fallback'>(initialProduct ? 'supabase' : 'fallback');
  const [loading, setLoading] = useState(typeof window !== 'undefined' || !initialProduct);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!slugOrId) { setProduct(null); setLoading(false); return; }
    setLoading(true);
    const result = await getProductBySlugOrIdFromSupabase(slugOrId);
    setProduct(result.product);
    setSource(result.source);
    setError(result.error);
    setLoading(false);
  }, [slugOrId]);

  useEffect(() => { loadData(); }, [loadData]);
  return { product, source, loading, error, refetch: loadData };
}

/**
 * Gamme peau en cours de formulation.
 *
 * Volontairement séparé de `fetchPublicProducts` : ce ne sont pas des produits
 * achetables, et les mélanger ferait croire au reste de l'application qu'une
 * cible de formulation peut entrer dans un panier. Aucun appelant ne doit
 * alimenter un comparateur, un panier ou un schéma Product avec ces fiches.
 */
async function fetchSkinRangeTargets(): Promise<FicheCiblePeau[]> {
  const response = await fetch('/api/peau/gamme');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La gamme en cours de formulation est indisponible.'));
  return Array.isArray(data.fiches) ? data.fiches : [];
}

export function useSkinRangeTargets() {
  const [fiches, setFiches] = useState<FicheCiblePeau[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setFiches(await fetchSkinRangeTargets());
      setError(null);
    } catch (err) {
      setFiches([]);
      setError(err instanceof Error ? err : new Error('La gamme en cours de formulation est indisponible.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  return { fiches, loading, error, refetch: loadData };
}

/**
 * Boutique — produits « bientôt disponibles » (sourcing en cours).
 *
 * Même raison que la gamme : ces fiches ne sont pas des produits achetables.
 * Aucun appelant ne doit alimenter un panier, un comparateur ou un schéma
 * Product avec elles — le bouton d'achat est structurellement absent du
 * composant qui les affiche.
 */
async function fetchComingSoonProducts(): Promise<FicheAvenirProduit[]> {
  const response = await fetch('/api/produits/avenir');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiErrorMessage(response, data, 'La liste des produits à venir est indisponible.'));
  return Array.isArray(data.fiches) ? data.fiches : [];
}

export function useComingSoonProducts() {
  const [fiches, setFiches] = useState<FicheAvenirProduit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setFiches(await fetchComingSoonProducts());
      setError(null);
    } catch (err) {
      setFiches([]);
      setError(err instanceof Error ? err : new Error('La liste des produits à venir est indisponible.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  return { fiches: fiches as FicheAvenirProduit[], loading, error, refetch: loadData };
}
