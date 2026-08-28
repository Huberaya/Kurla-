import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 8.2c — inventaire : stock par produit et par variante, synchronisé
 * vers Supabase. Sorti de `serverDb.ts`.
 */
export async function syncInventoryToSupabase(store: SupabaseServerStore, realId: string, quantity: number, _reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    try {
      const { error } = await supabase.rpc('set_inventory_quantity_atomic', {
        p_product_id: realId,
        p_variant_id: null,
        p_quantity: quantity
      });
      ensureDatabaseSuccess('mise à jour atomique de l’inventaire', error);
    } catch (err) {
      console.error('[serverDb] syncInventoryToSupabase error:', err);
      throw err;
    }
  }

export async function getInventoryByProductId(store: SupabaseServerStore, productId: string): Promise<{ quantity: number; reserved_quantity: number; available_quantity: number }> {
    const product = await store.getProductById(productId);
    const realId = product ? product.id : productId;

    let memInv = store.inMemoryInventory.get(realId);
    if (!memInv && realId !== productId) {
      memInv = store.inMemoryInventory.get(productId);
    }

    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity, available_quantity').eq('product_id', realId).is('variant_id', null).maybeSingle();
        ensureDatabaseSuccess('lecture de l’inventaire', error);
        if (data) {
          const q = Number(data.quantity);
          const resQ = Number(data.reserved_quantity || 0);
          const val = { quantity: q, reserved_quantity: resQ, available_quantity: Number(data.available_quantity ?? q - resQ) };
          store.inMemoryInventory.set(realId, val);
          if (realId !== productId) store.inMemoryInventory.set(productId, val);
          return val;
        }
      } catch (err) {
        console.error('[serverDb] getInventoryByProductId error:', err);
        throw err;
      }
    }

    if (memInv) return {
      quantity: memInv.quantity,
      reserved_quantity: memInv.reserved_quantity,
      available_quantity: memInv.available_quantity ?? memInv.quantity - memInv.reserved_quantity
    };

    const defaultQty = product && typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
    const defaultInv = { quantity: defaultQty, reserved_quantity: 0, available_quantity: defaultQty };
    store.inMemoryInventory.set(realId, defaultInv);
    if (realId !== productId) store.inMemoryInventory.set(productId, defaultInv);
    return defaultInv;
  }

export async function getAvailableStock(store: SupabaseServerStore, productId: string): Promise<number> {
    const inv = await getInventoryByProductId(store, productId);
    return Math.max(0, inv.available_quantity ?? (inv.quantity - inv.reserved_quantity));
  }

export async function getInventoryByVariantId(store: SupabaseServerStore, productId: string, variantId: string): Promise<{ quantity: number; reserved_quantity: number; available_quantity: number }> {
    const product = await store.getProductById(productId);
    const realId = product ? product.id : productId;
    const cacheKey = `${realId}:${variantId}`;
    const cached = store.inMemoryInventory.get(cacheKey);
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.from('inventory').select('id, quantity, reserved_quantity, available_quantity').eq('product_id', realId).eq('variant_id', variantId).maybeSingle();
      ensureDatabaseSuccess('lecture de l’inventaire de la variante', error);
      if (data) {
        const quantity = Number(data.quantity);
        const reservedQuantity = Number(data.reserved_quantity || 0);
        const value = { quantity, reserved_quantity: reservedQuantity, available_quantity: Number(data.available_quantity ?? quantity - reservedQuantity) };
        store.inMemoryInventory.set(cacheKey, value);
        return value;
      }
    }
    if (cached) return {
      quantity: cached.quantity,
      reserved_quantity: cached.reserved_quantity,
      available_quantity: cached.available_quantity ?? cached.quantity - cached.reserved_quantity
    };
    const variant = product?.variants?.find((item: any) => item.id === variantId);
    const quantity = Number(variant?.stock_quantity || variant?.stockQuantity || 0);
    const reservedQuantity = Number(variant?.reserved_quantity || variant?.reservedQuantity || 0);
    const value = { quantity, reserved_quantity: reservedQuantity, available_quantity: quantity - reservedQuantity };
    store.inMemoryInventory.set(cacheKey, value);
    return value;
  }

export async function syncVariantInventoryToSupabase(store: SupabaseServerStore, productId: string, variantId: string, quantity: number, _reserved_quantity: number): Promise<void> {
    const supabase = getSupabaseServerClient();
    if (!supabase) return;
    const { error } = await supabase.rpc('set_inventory_quantity_atomic', {
      p_product_id: productId,
      p_variant_id: variantId,
      p_quantity: quantity
    });
    ensureDatabaseSuccess('mise à jour atomique de l’inventaire de la variante', error);
  }
