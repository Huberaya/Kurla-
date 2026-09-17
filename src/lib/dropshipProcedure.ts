/**
 * CHANTIER 9 — Dropshipping année 1 : badge, bon de commande, mailto.
 *
 * Source de vérité de l’offre = `product_sources.model` (C4).
 * `fulfillment.ts` reste la **compat Hair accessoires** (IDs `p*` intacts).
 * Aucune API AfricanFabs / Afro Wholesale / agrégateur : procédure manuelle.
 *
 * Cosmétique Skin (`peau` / `teint` / `soins_visage`) ≠ promesse 24–48h
 * (CPNP / douane). Un soin peut avoir une offre `dropshipping` ; ça n’ouvre
 * pas le badge boutique 24–48h.
 */

import { isDropshipToolProduct } from './fulfillment';
import { dropshipEligibility } from './productLifecycle';
import { selectPrimarySource, type ProductSource } from './supplyModel';

export const YEAR1_DROPSHIP_MAX_LEAD_DAYS = 2;

export const DROPSHIP_24H_BADGES = ['dropship', 'dropship_24_48h', 'dropship_24-48h'] as const;

const SKIN_COSMETIC = new Set(['peau', 'teint', 'soins_visage', 'skin', 'skincare']);

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isSkinCosmeticCategory(category?: string | null): boolean {
  return SKIN_COSMETIC.has(text(category).toLowerCase());
}

export function isDropship24hBadge(value: unknown): boolean {
  return typeof value === 'string' && (DROPSHIP_24H_BADGES as readonly string[]).includes(value);
}

/** La case admin 24–48h ne s’écrit pas sur un cosmétique Skin. Hair inchangé. */
export function canPersistDropship24hBadge(category?: string | null): boolean {
  return !isSkinCosmeticCategory(category);
}

export function stripDropship24hBadges(badges: unknown): string[] {
  if (!Array.isArray(badges)) return [];
  return badges.map(value => String(value).trim()).filter(value => value && !isDropship24hBadge(value));
}

/**
 * Badges à persister depuis le toggle admin. Skin cosmétique : jamais
 * `dropship_24_48h`, même si la case est cochée.
 */
export function badgesForDropshipToggle(
  wantDropship24h: boolean,
  category?: string | null,
  hasExistingId?: boolean,
): string[] | undefined {
  if (!canPersistDropship24hBadge(category)) {
    return hasExistingId ? stripDropship24hBadges([]) : undefined;
  }
  if (wantDropship24h) return ['dropship_24_48h'];
  return hasExistingId ? [] : undefined;
}

/**
 * Promesse boutique 24–48h. Skin cosmétique : toujours false.
 * Accessoire + offre dropshipping : true si délai inconnu ou ≤ 2 j.
 * Sinon compat Hair (`fulfillment.ts` IDs / catégorie accessoires / badges).
 */
export function promisesDropship24h(
  product: { id?: string | null; category?: string | null; badges?: unknown },
  sources?: ProductSource[],
): boolean {
  if (isSkinCosmeticCategory(product.category)) return false;
  if (Array.isArray(sources) && sources.length > 0 && dropshipEligibility(product.category) === 'allowed') {
    const primary = selectPrimarySource(sources);
    if (primary?.model === 'dropshipping' && primary.available) {
      return primary.leadTimeDays == null || primary.leadTimeDays <= YEAR1_DROPSHIP_MAX_LEAD_DAYS;
    }
    return false;
  }
  return isDropshipToolProduct({
    id: String(product.id || ''),
    category: product.category || undefined,
    badges: Array.isArray(product.badges) ? product.badges as string[] : undefined,
  });
}

export function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type DropshipPurchaseOrderInput = {
  poNumber: string;
  productName: string;
  productId: string;
  quantity: number;
  unitCostEur: number | null;
  supplierName: string;
  supplierEmail: string | null;
  shipsFrom: string | null;
  leadTimeDays: number | null;
  category?: string | null;
};

export type DropshipPurchaseOrder = {
  subject: string;
  body: string;
  mailtoHref: string | null;
  promises24h: boolean;
};

/** Bon de commande année 1. N’envoie rien : `mailto:` ou copie. Prix inconnu = « à obtenir ». */
export function buildDropshipPurchaseOrder(input: DropshipPurchaseOrderInput): DropshipPurchaseOrder {
  const qty = Number.isFinite(input.quantity) && input.quantity > 0 ? Math.round(input.quantity) : 1;
  const skin = isSkinCosmeticCategory(input.category);
  const promises24h = !skin
    && (input.leadTimeDays == null || input.leadTimeDays <= YEAR1_DROPSHIP_MAX_LEAD_DAYS)
    && dropshipEligibility(input.category) === 'allowed';
  const unit = input.unitCostEur != null && Number.isFinite(input.unitCostEur) && input.unitCostEur > 0
    ? `${input.unitCostEur.toFixed(2)} € HT /u`
    : 'coût à obtenir — pas de 0 inventé';
  const lineTotal = input.unitCostEur != null && Number.isFinite(input.unitCostEur) && input.unitCostEur > 0
    ? `${(qty * input.unitCostEur).toFixed(2)} € HT`
    : 'à obtenir';
  const delay = input.leadTimeDays != null
    ? `${input.leadTimeDays} j`
    : (promises24h ? '24–48h (accessoire, à confirmer par écrit)' : 'à confirmer par écrit');
  const subject = `Bon de commande dropship — ${input.poNumber} — ${input.productName}`;
  const body = `BON DE COMMANDE — KURLA — ${input.poNumber}
Date : ${new Date().toLocaleDateString('fr-FR')}
Fournisseur : ${input.supplierName}${input.supplierEmail ? ` (${input.supplierEmail})` : ''}

OBJET : dropship à l’unité (procédure année 1 — pas d’API)

Livraison : directe chez le 3PL / cliente selon accord écrit. 0 carton à Paris.

LIGNE :
  • ${qty}× ${input.productName} [${input.productId}] — ${unit} → ${lineTotal}
  • Expédié depuis : ${input.shipsFrom || 'à confirmer'}
  • Délai annoncé : ${delay}

Conditions :
  • Facturation HT, TVA selon régime, paiement selon grille fournisseur
  • Merci de confirmer picking / délai par écrit avant expédition
${skin
    ? '  • COSMÉTIQUE SKIN : pas de promesse 24–48h (CPNP / douane). Affiliation ou 3PL tampon, pas un badge boutique 24–48h.\n'
    : '  • Accessoire non cosmétique : pas de dossier CPNP. Promesse 24–48h seulement si le délai est confirmé ≤ 2 j.\n'}
KURLA Beauty — kurlabeauty.vercel.app
`;
  const email = text(input.supplierEmail);
  return {
    subject,
    body,
    mailtoHref: email ? mailtoHref(email, subject, body) : null,
    promises24h,
  };
}

export type DropshipProcedureItem = { id: string; ok: boolean; label: string };

export function dropshipYear1Checklist(input: {
  product: { id?: string | null; category?: string | null; badges?: unknown };
  source: ProductSource | null;
  supplierEmail?: string | null;
}): { ok: boolean; items: DropshipProcedureItem[]; promises24h: boolean } {
  const source = input.source;
  const dropship = source?.model === 'dropshipping';
  const items: DropshipProcedureItem[] = [
    { id: 'source', ok: dropship === true, label: dropship ? 'Offre product_sources en dropshipping' : 'Pas d’offre dropshipping — saisir une source' },
    { id: 'supplier', ok: Boolean(source?.supplierId), label: source?.supplierId ? 'Fournisseur enregistré (pas un nom libre)' : 'Fournisseur du référentiel manquant' },
    {
      id: 'mailto',
      ok: Boolean(text(input.supplierEmail)),
      label: text(input.supplierEmail) ? 'mailto prêt (e-mail réel)' : 'E-mail fournisseur à obtenir — rien n’est envoyé',
    },
    {
      id: 'api',
      ok: true,
      label: 'Procédure manuelle année 1 — aucune API dropship',
    },
    {
      id: 'cosmetic',
      ok: !isSkinCosmeticCategory(input.product.category) || !promisesDropship24h(input.product, source ? [source] : undefined),
      label: isSkinCosmeticCategory(input.product.category)
        ? 'Cosmétique Skin : pas de badge 24–48h (CPNP)'
        : 'Hors cosmétique Skin — 24–48h possible si accessoire',
    },
  ];
  return {
    ok: items.every(item => item.ok),
    items,
    promises24h: promisesDropship24h(input.product, source ? [source] : undefined),
  };
}
