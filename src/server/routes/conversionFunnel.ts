/**
 * KURLA — L3 « Dashboard de conversion » : route admin du funnel.
 * =============================================================================
 *
 * GET /api/admin/conversion-funnel — 4 étapes (diagnostic → routine → panier →
 * payé) × 3 vues (tous pôles / cheveux / peau), avec variation vs période
 * précédente (30 j) et flag dès −20 %.
 *
 * Modèle C6 (traction) : admin obligatoire, lecture de tables réelles, aucune
 * donnée inventée ; si une table est indisponible, l'étape correspondante est
 * marquée non mesurable plutôt qu'affichée à zéro. En mode mémoire (bancs), la
 * base Supabase n'existe pas → 503, comme le cockpit de traction.
 */

import type { Express, Response } from 'express';

import { getSupabaseServerClient } from '../../lib/supabaseClient';
import { aggregateConversionFunnel } from '../../lib/db/conversionFunnel';
import { asyncRoute, rateLimit } from '../http';
import { requireAdmin } from '../auth';
import type { AuthenticatedRequest } from '../types';

async function readRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  table: string,
  columns: string,
  limit = 10000
): Promise<{ rows: any[]; available: boolean }> {
  try {
    const { data, error } = await supabase.from(table).select(columns).limit(limit);
    if (error) return { rows: [], available: false };
    return { rows: Array.isArray(data) ? data : [], available: true };
  } catch {
    return { rows: [], available: false };
  }
}

export function registerConversionFunnelRoutes(app: Express): void {
  app.get(
    '/api/admin/conversion-funnel',
    rateLimit('admin-conversion-funnel', 30, 60_000),
    asyncRoute(async (req: AuthenticatedRequest, res: Response) => {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      const supabase = getSupabaseServerClient();
      if (!supabase) {
        res.status(503).json({ error: 'Base indisponible pour le funnel de conversion.' });
        return;
      }

      const [profiles, routines, carts, cartItems, orders, orderItems, products] = await Promise.all([
        readRows(supabase, 'beauty_profiles', 'user_id,profile,created_at,updated_at', 20000),
        readRows(supabase, 'routine_plans', 'user_id,status,created_at', 20000),
        readRows(supabase, 'carts', 'id,user_id,updated_at', 20000),
        readRows(supabase, 'cart_items', 'cart_id,product_id', 20000),
        readRows(supabase, 'orders', 'id,user_id,status,created_at', 20000),
        readRows(supabase, 'order_items', 'order_id,product_id', 20000),
        readRows(supabase, 'products', 'id,category', 5000)
      ]);

      const productCategories: Record<string, string | undefined> = {};
      for (const row of products.rows) {
        if (typeof row?.id === 'string' && typeof row?.category === 'string') {
          productCategories[row.id] = row.category;
        }
      }

      const result = aggregateConversionFunnel({
        beautyProfiles: profiles.rows,
        routinePlans: routines.rows,
        carts: carts.rows,
        cartItems: cartItems.rows,
        orders: orders.rows,
        orderItems: orderItems.rows,
        productCategories,
        sourceAvailable: {
          diagnostic: profiles.available,
          routine: routines.available,
          panier: carts.available && cartItems.available,
          paye: orders.available && orderItems.available
        }
      });

      res.json(result);
    })
  );
}
