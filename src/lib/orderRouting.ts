/**
 * JONCTION COMMANDE → ROUTEUR (16/09/2026).
 *
 * Au paiement, chaque ligne de commande reçoit sa route de fulfillment
 * FIGÉE : qui expédie, par quel modèle, depuis où, en combien de jours.
 * Un snapshot — si la source du produit change ensuite, l'histoire de la
 * commande ne change pas.
 *
 * Une ligne sans source (ou source indisponible) n'est PAS devinée : elle
 * remonte bloquée avec son motif, et la commande entière est marquée
 * « intervention requise ».
 */

import { routeFulfillment, type ProductSource } from './supplyModel';

export type OrderItemInput = {
  id?: string;
  productId: string;
  name?: string | null;
  quantity?: number;
};

export type OrderItemRoute = {
  orderItemId: string | null;
  productId: string;
  productName: string;
  quantity: number;
  sourceId: string | null;
  model: string | null;
  responsible: string;
  responsibleKind: string;
  leadTimeDays: number | null;
  shipsFrom: string | null;
  blockers: string[];
};

export type OrderRoutingPlan = {
  routes: OrderItemRoute[];
  /** Toute la commande est-elle exécutable en l'état ? */
  blocked: boolean;
  blockedCount: number;
  /** « Qui est responsable de l'expédition de cette commande ? » — par responsable. */
  responsibleSummary: Record<string, number>;
};

export function routeOrderItems(
  items: OrderItemInput[],
  sourcesByProduct: Record<string, ProductSource[]>,
  supplierNameById: Record<string, string> = {},
): OrderRoutingPlan {
  const routes: OrderItemRoute[] = [];
  const responsibleSummary: Record<string, number> = {};
  let blockedCount = 0;

  for (const item of items || []) {
    const productId = String(item?.productId || '');
    if (!productId) continue;
    const route = routeFulfillment({ sources: sourcesByProduct[productId] || [], supplierNameById });
    if (route.blockers.length > 0) blockedCount += 1;
    const key = route.blockers.length > 0 ? 'à déterminer' : route.responsible;
    responsibleSummary[key] = (responsibleSummary[key] || 0) + (Number(item.quantity) > 0 ? Number(item.quantity) : 1);
    routes.push({
      orderItemId: item.id != null ? String(item.id) : null,
      productId,
      productName: String(item.name || productId),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      sourceId: route.sourceId,
      model: route.blockers.length > 0 ? null : route.model,
      responsible: route.responsible,
      responsibleKind: route.responsibleKind,
      leadTimeDays: route.leadTimeDays,
      shipsFrom: route.shipsFrom,
      blockers: route.blockers,
    });
  }

  return { routes, blocked: blockedCount > 0, blockedCount, responsibleSummary };
}
