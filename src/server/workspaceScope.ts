import type { Request } from 'express';

import type { ServerOrder } from '../lib/serverDb';

export type WorkspaceScope = 'skin' | 'hair';

/**
 * Workspace is an application scope, not a second database.  The value is
 * accepted only from a server route after authentication and is used to filter
 * the existing products.category model.
 */
export function readWorkspaceScope(req: Request): WorkspaceScope | undefined {
  const header = req.header('x-kurla-workspace');
  const query = typeof req.query.scope === 'string' ? req.query.scope : undefined;
  const value = (header || query || '').trim().toLowerCase();
  return value === 'skin' || value === 'hair' ? value : undefined;
}

export function isProductInWorkspace(product: any, scope: WorkspaceScope): boolean {
  const category = String(product?.category || product?.department || '').trim().toLowerCase();
  const isSkin = category === 'peau' || category === 'skin' || category === 'skincare' || category === 'kits' || category.startsWith('kit-peau');
  return scope === 'skin' ? isSkin : !isSkin;
}

export function productIdFromOrderItem(item: any): string | undefined {
  const value = item?.productId ?? item?.product_id;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function orderInWorkspace(order: ServerOrder, productIds: Set<string>): boolean {
  return Array.isArray(order.items) && order.items.some(item => {
    const productId = productIdFromOrderItem(item);
    return Boolean(productId && productIds.has(productId));
  });
}

export function orderFullyInWorkspace(order: ServerOrder, productIds: Set<string>): boolean {
  return Array.isArray(order.items) && order.items.length > 0 && order.items.every(item => {
    const productId = productIdFromOrderItem(item);
    return Boolean(productId && productIds.has(productId));
  });
}

export function filterOrderItems<T extends { productId?: string; product_id?: string }>(items: T[] | undefined, productIds: Set<string>): T[] {
  return (Array.isArray(items) ? items : []).filter(item => {
    const productId = productIdFromOrderItem(item);
    return Boolean(productId && productIds.has(productId));
  });
}

/** Return a redacted order view: mixed-workspace line items and their aggregate are never exposed. */
export function orderForWorkspace(order: ServerOrder, productIds: Set<string>): ServerOrder | undefined {
  const items = filterOrderItems(order.items, productIds);
  if (items.length === 0) return undefined;
  const total = items.reduce((sum, item) => sum + (Number.isFinite(Number(item.price)) ? Number(item.price) : 0) * Math.max(0, Number(item.quantity || 0)), 0);
  return { ...order, items, total };
}

export function returnForWorkspace(returnRequest: any, productIds: Set<string>): any | undefined {
  if (!Array.isArray(returnRequest?.items)) return returnRequest;
  const items = filterOrderItems(returnRequest.items, productIds);
  return items.length > 0 ? { ...returnRequest, items } : undefined;
}

export function professionalInWorkspace(application: any, scope: WorkspaceScope): boolean {
  const text = `${application?.profession || ''} ${application?.specialty || ''} ${application?.experience || ''}`.toLowerCase();
  const category = String(application?.category || '').toLowerCase();
  const skin = category === 'skincare_expert' || /peau|skin|dermato|esth[ée]t|phototype|m[ée]lan|spf|cosm[ée]t/.test(text);
  return scope === 'skin' ? skin : !skin;
}

export function sourcingItemInWorkspace(item: any, scope: WorkspaceScope): boolean {
  const text = `${item?.category || ''} ${item?.title || ''} ${item?.rationale || ''} ${item?.specification || ''}`.toLowerCase();
  const skin = /peau|skin|spf|m[ée]lan|whitecast|phototype|teint|skincare|cosm[ée]t/.test(text);
  return scope === 'skin' ? skin : !skin;
}

export function prospectInWorkspace(prospect: any, scope: WorkspaceScope): boolean {
  const text = `${prospect?.specialty || ''} ${prospect?.contactType || prospect?.contact_type || ''} ${prospect?.name || ''} ${prospect?.notes || ''}`.toLowerCase();
  const skin = /peau|skin|spf|solar|solaire|m[ée]lan|whitecast|phototype|teint|skincare|cosm[ée]t/.test(text);
  return scope === 'skin' ? skin : !skin;
}

export function candidateInWorkspace(candidate: any, scope: WorkspaceScope): boolean {
  const text = `${candidate?.category || ''} ${candidate?.product || ''} ${candidate?.routineStep || candidate?.routine_step || ''} ${candidate?.brand || ''} ${candidate?.notes || ''}`.toLowerCase();
  const skin = /peau|skin|spf|solar|solaire|m[ée]lan|whitecast|phototype|teint|skincare|cosm[ée]t/.test(text);
  return scope === 'skin' ? skin : !skin;
}
