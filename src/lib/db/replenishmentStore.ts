import { randomUUID } from 'node:crypto';

import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';
import { notificationExists, sendNotification } from './notificationsStore';
import { intelligenceStore } from '../intelligenceStore';
import {
  evaluateReplenishment,
  evaluateRestockCycle,
  ReplenishmentSignal,
  RestockCycleSignal,
} from '../shelf';

import type { SupabaseServerStore } from '../serverDb';

/**
 * L2 — réassort : le signal devient une action, et l'action laisse une trace.
 *
 * Deux signaux complémentaires, jamais superposés sans raison :
 *  - % restant + consommation déclarée → « Bientôt à court » (existant) ;
 *  - date d'ouverture ≥ 28 j (seuil configurable) → « Temps de réappro »,
 *    pour les membres qui ne déclarent aucune consommation.
 *
 * Chaque alerte est matérialisée en notification in-app avec une clé de
 * déduplication stable : un même article n'alerte qu'une fois (par cycle
 * d'ouverture). L'idempotence est la même que pour les nudges de rétention.
 *
 * `recordRestockEvent` trace le geste de réassort (ajout au panier depuis le
 * flux étagère) : c'est lui qui alimente l'historique du profil. Un produit
 * hors catalogue (libellé libre) reste traçable : product_id NULL.
 */

export interface RestockEvent {
  id: string;
  userId: string;
  shelfItemId?: string;
  productId?: string;
  productName?: string;
  source: string;
  createdAt: string;
}

function mapRestockRow(row: any): RestockEvent {
  return {
    id: row.id,
    userId: row.user_id,
    shelfItemId: row.shelf_item_id || undefined,
    productId: row.product_id || undefined,
    productName: row.product_name || undefined,
    source: row.source || 'shelf',
    createdAt: row.created_at,
  };
}

export interface ReplenishmentAlertResult {
  signals: ReplenishmentSignal[];
  due: ReplenishmentSignal[];
  cycleDue: RestockCycleSignal[];
  notificationsSent: number;
}

/**
 * Évalue les deux signaux de réassort d'un membre et matérialise les
 * notifications dues (dédoublonnées). Le run est idempotent : rappeler la
 * fonction le même jour n'envoie jamais deux fois la même alerte.
 */
export async function runShelfReplenishmentAlerts(
  store: SupabaseServerStore,
  userId: string,
  weeklyUsagePercent: number
): Promise<ReplenishmentAlertResult> {
  const usage = Number(weeklyUsagePercent);
  // L'étagère vit dans intelligenceStore (Supabase ET repli mémoire) :
  // une seule voie de lecture, comme les nudges de rétention.
  const items = await intelligenceStore.getShelf(userId);
  const eligible = items.filter(item => item.status === 'owned' || item.status === 'in_use');

  const signals = eligible.map(item =>
    evaluateReplenishment(item, { weeklyUsagePercent: Number.isFinite(usage) && usage > 0 ? usage : 0 })
  );
  const due = signals.filter(signal => signal.shouldNotify);
  const cycles = eligible.map(item => evaluateRestockCycle(item));
  const cycleDue = cycles.filter(cycle => cycle.shouldNotify);

  let notificationsSent = 0;
  for (const signal of due) {
    const dedupeKey = `replenishment:${signal.itemId}`;
    if (await notificationExists(store, dedupeKey)) continue;
    await sendNotification(
      store,
      userId,
      'replenishment',
      'Bientôt à court',
      signal.message,
      '/account/shelf',
      undefined,
      dedupeKey
    );
    notificationsSent += 1;
  }
  for (const cycle of cycleDue) {
    // La clé porte la date d'ouverture : rouvrir un produit (nouvelle
    // openedAt) autorise un nouveau rappel, sans jamais de doublon au sein
    // d'un même cycle d'ouverture.
    const dedupeKey = `restock:cycle:${cycle.itemId}:${(cycle.openedAt || '').slice(0, 10)}`;
    if (await notificationExists(store, dedupeKey)) continue;
    await sendNotification(
      store,
      userId,
      'restock',
      'Temps de réappro',
      cycle.message,
      '/account/shelf',
      undefined,
      dedupeKey
    );
    notificationsSent += 1;
  }

  return { signals, due, cycleDue, notificationsSent };
}

/**
 * Trace un réassort effectué (le geste, pas l'achat : l'ordre fait le reste).
 * `productName` est borné : c'est un libellé d'affichage, pas une donnée
 * structurée.
 */
export async function recordRestockEvent(
  store: SupabaseServerStore,
  userId: string,
  input: { shelfItemId?: unknown; productId?: unknown; productName?: unknown; source?: unknown }
): Promise<RestockEvent> {
  const event: RestockEvent = {
    id: randomUUID(),
    userId,
    shelfItemId: typeof input.shelfItemId === 'string' && input.shelfItemId.trim() ? input.shelfItemId.trim() : undefined,
    productId: typeof input.productId === 'string' && input.productId.trim() ? input.productId.trim() : undefined,
    productName: typeof input.productName === 'string' && input.productName.trim() ? input.productName.trim().slice(0, 200) : undefined,
    source: typeof input.source === 'string' && input.source.trim() ? input.source.trim().slice(0, 40) : 'shelf',
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('restock_events')
      .insert({
        user_id: userId,
        shelf_item_id: event.shelfItemId ?? null,
        product_id: event.productId ?? null,
        product_name: event.productName ?? null,
        source: event.source,
        created_at: event.createdAt,
      })
      .select('*')
      .single();
    ensureDatabaseSuccess('enregistrement du réassort', error);
    return mapRestockRow(data);
  }

  store.inMemoryRestockEvents.push(event);
  return event;
}

/** Historique du profil : les réassorts de la membre, plus récent d'abord. */
export async function listRestockEvents(
  store: SupabaseServerStore,
  userId: string,
  limit = 50
): Promise<RestockEvent[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('restock_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    ensureDatabaseSuccess('lecture des réassorts', error);
    return (data || []).map(mapRestockRow);
  }
  return store.inMemoryRestockEvents
    .filter(event => event.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
