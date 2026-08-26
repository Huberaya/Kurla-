import { Product } from '../types';
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
async function fetchPublicProducts(): Promise<Product[]> {
  const response = await fetch('/api/products');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Le catalogue publié est indisponible.');
  return Array.isArray(data.products) ? data.products : [];
}

export async function getProductsFromSupabase(): Promise<FetchProductsResponse> {
  try {
    const products = await fetchPublicProducts();
    return { products, brands: [], categories: [], source: 'supabase', count: products.length, error: null };
  } catch (error: any) {
    return {
      products: [],
      brands: [],
      categories: [],
      source: 'fallback',
      count: 0,
      error: error instanceof Error ? error : new Error('Le catalogue publié est indisponible.')
    };
  }
}

export async function getProductBySlugOrIdFromSupabase(slugOrId: string): Promise<{
  product: Product | null;
  source: 'supabase' | 'fallback';
  error: Error | null;
}> {
  try {
    const products = await fetchPublicProducts();
    const product = products.find(item => item.slug === slugOrId || item.id === slugOrId) || null;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<SupabaseBrand[]>([]);
  const [categories, setCategories] = useState<SupabaseCategory[]>([]);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getProductsFromSupabase();
    setProducts(result.products);
    setBrands(result.brands);
    setCategories(result.categories);
    setSource(result.source);
    setCount(result.count);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  return { products, brands, categories, source, count, loading, error, refetch: loadData };
}

export function useProduct(slugOrId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');
  const [loading, setLoading] = useState(true);
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
