import { getSupabaseClient } from '../lib/supabaseClient';
import { MOCK_PRODUCTS } from '../data/mockData';
import { Product, ProductGalleryImage } from '../types';
import { useState, useEffect, useCallback } from 'react';

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

export interface SupabaseProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price: number;
  stock_quantity: number;
}

export interface SupabaseProductImage {
  id: string;
  product_id: string;
  url: string;
  alt?: string;
  position: number;
}

export interface SupabaseInventory {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  reserved_quantity: number;
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
 * Maps raw Supabase row and related table data into a clean, strongly-typed Product object.
 */
function mapSupabaseToProduct(
  p: any,
  imagesMap: Record<string, SupabaseProductImage[]>,
  variantsMap: Record<string, SupabaseProductVariant[]>,
  inventoryMap: Record<string, SupabaseInventory[]>
): Product {
  const productId = String(p.id);
  
  // 1. Images from public.product_images
  const prodImages = imagesMap[productId] || [];
  const galleryImages: ProductGalleryImage[] = prodImages.map((img, idx) => ({
    url: img.url,
    label: img.alt || p.name,
    type: idx === 0 ? 'hero' : 'detail',
    isOfficial: true
  }));

  // Primary image
  const primaryImage = p.image_url || p.image || (prodImages.length > 0 ? prodImages[0].url : 'https://images.unsplash.com/photo-1608248597261-e4d09123fe1c?auto=format&fit=crop&w=800&q=80');

  // 2. Inventory from public.inventory
  const prodInventory = inventoryMap[productId] || [];
  let availableStock = p.stock_quantity ?? 100;
  if (prodInventory.length > 0) {
    availableStock = prodInventory.reduce((acc, inv) => acc + Math.max(0, (inv.quantity || 0) - (inv.reserved_quantity || 0)), 0);
  }

  // 3. Price from public.products (or variants)
  const price = Number(p.price) || 0;

  // 4. Badges
  let badges: string[] = Array.isArray(p.badges) && p.badges.length > 0 ? p.badges : [];
  if (badges.length === 0) {
    if (p.is_promo) badges.push('Offre Spéciale');
    if (p.is_new) badges.push('Nouveauté');
    if (badges.length === 0) badges.push('Certifié KURLA Fit');
  }

  return {
    id: productId,
    slug: String(p.slug || p.id),
    name: p.name,
    brand: p.brand || 'KURLA Botanicals',
    category: (p.category as any) || 'cheveux',
    subCategory: p.subcategory || p.subCategory,
    price,
    originalPrice: p.original_price ? Number(p.original_price) : p.originalPrice,
    rating: p.rating ? Number(p.rating) : 4.9,
    reviewsCount: p.reviews_count ? Number(p.reviews_count) : (p.reviewsCount || 28),
    image: primaryImage,
    badges,
    forWho: p.for_who || p.forWho || (p.hair_types?.length ? `Idéal pour types ${p.hair_types.join(', ')}` : 'Formulé pour cheveux texturés & peaux mélaninées.'),
    notIdealIf: p.not_ideal_if || p.notIdealIf || 'Aucune contre-indication majeure.',
    howToUse: p.how_to_use || p.howToUse || 'Appliquer sur cheveux humides ou peau propre.',
    routineStep: p.routine_step || p.routineStep || 'Soin quotidien',
    keyIngredients: p.ingredients || p.keyIngredients || [],
    inci: p.inci || (p.ingredients ? p.ingredients.join(', ') : 'Aqua, Glycerin, Natural Oils'),
    description: p.description || '',
    inStock: (p.in_stock !== false) && availableStock > 0,
    needs: p.concerns || p.needs || [],
    countryAvailability: p.country_availability || p.countryAvailability || ['FR', 'BE', 'DOM', 'AFR', 'INT'],
    communityBrand: p.community_brand ?? p.communityBrand ?? true,
    galleryImages: galleryImages.length > 0 ? galleryImages : (p.galleryImages || undefined),
  };
}

/**
 * Main function to fetch products, brands, categories, images, variants, and inventory from Supabase or server API.
 */
export async function getProductsFromSupabase(): Promise<FetchProductsResponse> {
  const supabase = getSupabaseClient();

  // Helper to attempt backend API endpoint fallback
  async function fetchFromBackendApi(): Promise<Product[] | null> {
    try {
      const origin = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const apiRes = await fetch(`${origin}/api/products`);
      if (apiRes.ok) {
        const apiJson = await apiRes.json();
        if (apiJson.products && Array.isArray(apiJson.products) && apiJson.products.length > 0) {
          return apiJson.products;
        }
      }
    } catch (e) {
      console.warn('[productService] Backend API fetch fallback note:', e);
    }
    return null;
  }

  if (supabase) {
    try {
      // Primary query to public.products
      const { data: rawProducts, error: pError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (!pError && rawProducts && rawProducts.length > 0) {
        // Fetch related tables in parallel: public.brands, public.categories, public.product_images, public.product_variants, public.inventory
        const [brandsRes, categoriesRes, imagesRes, variantsRes, inventoryRes] = await Promise.allSettled([
          supabase.from('brands').select('*'),
          supabase.from('categories').select('*'),
          supabase.from('product_images').select('*'),
          supabase.from('product_variants').select('*'),
          supabase.from('inventory').select('*')
        ]);

        const brands: SupabaseBrand[] = brandsRes.status === 'fulfilled' && brandsRes.value.data ? brandsRes.value.data : [];
        const categories: SupabaseCategory[] = categoriesRes.status === 'fulfilled' && categoriesRes.value.data ? categoriesRes.value.data : [];
        const rawImages: SupabaseProductImage[] = imagesRes.status === 'fulfilled' && imagesRes.value.data ? imagesRes.value.data : [];
        const rawVariants: SupabaseProductVariant[] = variantsRes.status === 'fulfilled' && variantsRes.value.data ? variantsRes.value.data : [];
        const rawInventory: SupabaseInventory[] = inventoryRes.status === 'fulfilled' && inventoryRes.value.data ? inventoryRes.value.data : [];

        // Group images, variants, and inventory by product_id
        const imagesMap: Record<string, SupabaseProductImage[]> = {};
        rawImages.forEach(img => {
          if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
          imagesMap[img.product_id].push(img);
        });

        const variantsMap: Record<string, SupabaseProductVariant[]> = {};
        rawVariants.forEach(v => {
          if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
          variantsMap[v.product_id].push(v);
        });

        const inventoryMap: Record<string, SupabaseInventory[]> = {};
        rawInventory.forEach(inv => {
          if (!inventoryMap[inv.product_id]) inventoryMap[inv.product_id] = [];
          inventoryMap[inv.product_id].push(inv);
        });

        // Map all products
        const products = rawProducts.map(p => mapSupabaseToProduct(p, imagesMap, variantsMap, inventoryMap));

        return {
          products,
          brands,
          categories,
          source: 'supabase',
          count: products.length,
          error: null
        };
      } else if (pError) {
        console.warn('[productService] Client-side direct Supabase query skipped/unavailable, switching to backend store:', pError.message);
      }
    } catch (err: any) {
      console.warn('[productService] Direct Supabase connection unavailable in client context, trying backend API:', err?.message || err);
    }
  }

  // Attempt backend API server fallback
  const apiProducts = await fetchFromBackendApi();
  if (apiProducts && apiProducts.length > 0) {
    return {
      products: apiProducts,
      brands: [],
      categories: [],
      source: 'supabase',
      count: apiProducts.length,
      error: null
    };
  }

  // Development Fallback
  return {
    products: MOCK_PRODUCTS,
    brands: [],
    categories: [],
    source: 'fallback',
    count: MOCK_PRODUCTS.length,
    error: null
  };
}

/**
 * Fetch a single product by slug or id from Supabase or fallback.
 */
export async function getProductBySlugOrIdFromSupabase(slugOrId: string): Promise<{
  product: Product | null;
  source: 'supabase' | 'fallback';
  error: Error | null;
}> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
        .maybeSingle();

      if (!error && data) {
        // Fetch product images and inventory
        const [imagesRes, inventoryRes] = await Promise.allSettled([
          supabase.from('product_images').select('*').eq('product_id', data.id),
          supabase.from('inventory').select('*').eq('product_id', data.id)
        ]);

        const images = imagesRes.status === 'fulfilled' && imagesRes.value.data ? imagesRes.value.data : [];
        const inventory = inventoryRes.status === 'fulfilled' && inventoryRes.value.data ? inventoryRes.value.data : [];

        const mapped = mapSupabaseToProduct(data, { [data.id]: images }, {}, { [data.id]: inventory });
        return { product: mapped, source: 'supabase', error: null };
      }
    } catch (e: any) {
      console.warn('[productService] Direct fetch for single product not available:', e?.message || e);
    }
  }

  // Try backend API for product
  try {
    const origin = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const apiRes = await fetch(`${origin}/api/products`);
    if (apiRes.ok) {
      const apiJson = await apiRes.json();
      if (apiJson.products && Array.isArray(apiJson.products)) {
        const found = apiJson.products.find((p: any) => p.slug === slugOrId || p.id === slugOrId);
        if (found) {
          return { product: found, source: 'supabase', error: null };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Development Fallback
  const fallback = MOCK_PRODUCTS.find(p => p.slug === slugOrId || p.id === slugOrId) || null;
  return { product: fallback, source: 'fallback', error: null };
}

/**
 * Custom React Hook to fetch products and manage state (loading, error, count, source).
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<SupabaseBrand[]>([]);
  const [categories, setCategories] = useState<SupabaseCategory[]>([]);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getProductsFromSupabase();
    setProducts(result.products);
    setBrands(result.brands);
    setCategories(result.categories);
    setSource(result.source);
    setCount(result.count);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { products, brands, categories, source, count, loading, error, refetch: loadData };
}

/**
 * Custom React Hook to fetch a single product by slug or id.
 */
export function useProduct(slugOrId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [source, setSource] = useState<'supabase' | 'fallback'>('fallback');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!slugOrId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getProductBySlugOrIdFromSupabase(slugOrId);
    setProduct(result.product);
    setSource(result.source);
    setError(result.error);
    setLoading(false);
  }, [slugOrId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { product, source, loading, error, refetch: loadData };
}
