import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess, toPublicProduct } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.2c — contenus éditoriaux publiés (routines), sortis de
 * `serverDb.ts`.
 */
export async function getRoutines(store: SupabaseServerStore): Promise<any[]> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return [];
    const { data: routineRows, error: routineError } = await supabase.from('routines').select('*').eq('status', 'published').order('created_at', { ascending: false });
    ensureDatabaseSuccess('lecture des routines publiées', routineError);
    const { data: itemRows, error: itemError } = await supabase.from('routine_items').select('*').order('step_number', { ascending: true });
    ensureDatabaseSuccess('lecture des produits de routine', itemError);
    const products = await store.getProducts({ publishedOnly: true });
    const productsById = new Map(products.map(product => [product.id, product]));
    return (routineRows || []).map((routine: any) => {
      if (routine.image_url && (routine.images_validation_status !== 'verified' || !['brand_provided', 'licensed'].includes(routine.image_ownership_status))) return null;
      const rawItems = (itemRows || []).filter((item: any) => item.routine_id === routine.id);
      const items = rawItems.map((item: any) => ({ ...item, product: productsById.get(item.product_id) }));
      if (!items.length || items.some((item: any) => !item.product)) return null;
      const steps = items.map((item: any) => ({
        number: item.step_number,
        title: item.title || item.product.name,
        description: item.description || '',
        productName: item.product.name,
        productId: item.product.id,
        variantId: item.variant_id || undefined,
        quantity: item.quantity
      }));
      return {
        id: routine.id,
        slug: routine.slug,
        title: routine.title,
        subtitle: routine.subtitle || '',
        category: routine.category || 'cheveux',
        badge: routine.badge || '',
        benefit: routine.benefit || '',
        duration: routine.duration || '',
        frequency: routine.frequency || '',
        price: Number(routine.price),
        originalPrice: routine.original_price == null ? undefined : Number(routine.original_price),
        image: routine.image_url || '',
        products: items.map((item: any) => toPublicProduct(item.product)),
        steps
      };
    }).filter(Boolean);
  }

export async function getRoutineBySlug(store: SupabaseServerStore, slug: string): Promise<any | undefined> {
    return (await getRoutines(store)).find(routine => routine.slug === slug);
  }
