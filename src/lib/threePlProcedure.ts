/**
 * CHANTIER 11 — 3PL année 1 : tampon / partenaire = `product_sources.model=3pl`.
 *
 * Source de vérité de l’offre = C4. `fulfillment.ts` reste la **compat Hair**
 * (tampon 75 SKU `p01`…, shortlist Etx/Huboo/Cubyn). Aucune API WMS, aucun ASN
 * électronique, aucun stock d’entrepôt inventé.
 *
 * Cosmétique Skin : 3PL tampon est le modèle an 1 (pas le badge dropship 24–48h).
 * Le tampon Hair 75 n’est pas étendu aux soins peau.
 */

import { TAMPON_3PL, TAMPON_META, normalizeLaunchId } from './fulfillment';
import { isSkinCosmeticCategory, mailtoHref } from './dropshipProcedure';
import { selectPrimarySource, type ProductSource } from './supplyModel';

export const THREE_PL_WMS_LIVE = false;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isThreePlSource(source: ProductSource | null | undefined): boolean {
  return source?.model === '3pl';
}

/**
 * L’offre ★ primaire gagne. Une 3PL secondaire n’ôte pas un dropship / affiliation.
 */
export function selectThreePlSource(sources: ProductSource[]): ProductSource | null {
  const primary = selectPrimarySource(sources);
  if (primary?.model === '3pl' && primary.available) return primary;
  if (primary) return null;
  return sources.find(source => source.model === '3pl' && source.available) || null;
}

export function isHairTamponSku(productId?: string | null): boolean {
  const id = text(productId);
  if (!id) return false;
  const n = normalizeLaunchId(id);
  return TAMPON_3PL.some(row => row.productId === n || row.productId === id);
}

/** Qté tampon Hair (constante). Skin : null — pas de 15 inventé. */
export function tamponQtyForProduct(productId?: string | null): number | null {
  const id = text(productId);
  if (!id) return null;
  const n = normalizeLaunchId(id);
  const row = TAMPON_3PL.find(item => item.productId === n || item.productId === id);
  return row ? row.qty : null;
}

export function hairTamponUnits(): number {
  return TAMPON_META.totalUnits;
}

export type ThreePlInboundInput = {
  poNumber: string;
  productName: string;
  productId: string;
  quantity: number | null;
  unitCostEur: number | null;
  logisticianName: string;
  logisticianEmail: string | null;
  supplierName: string;
  shipsFrom: string | null;
  category?: string | null;
};

export type ThreePlDocument = {
  subject: string;
  body: string;
  mailtoHref: string | null;
  wmsLive: false;
};

/** Bon fournisseur : livraison DIRECTE chez le 3PL. N’envoie rien. */
export function buildThreePlInboundPo(input: ThreePlInboundInput): ThreePlDocument {
  const hair = isHairTamponSku(input.productId);
  const qty = input.quantity != null && Number.isFinite(input.quantity) && input.quantity > 0
    ? Math.round(input.quantity)
    : tamponQtyForProduct(input.productId);
  const qtyLabel = qty != null ? `${qty}` : 'quantité à obtenir';
  const unit = input.unitCostEur != null && Number.isFinite(input.unitCostEur) && input.unitCostEur > 0
    ? `${input.unitCostEur.toFixed(2)} € HT /u`
    : 'coût à obtenir — pas de 0 inventé';
  const lineTotal = qty != null && input.unitCostEur != null && Number.isFinite(input.unitCostEur) && input.unitCostEur > 0
    ? `${(qty * input.unitCostEur).toFixed(2)} € HT`
    : 'à obtenir';
  const subject = `Bon de commande 3PL tampon — ${input.poNumber} — ${input.productName}`;
  const body = `BON DE COMMANDE — KURLA — ${input.poNumber}
Date : ${new Date().toLocaleDateString('fr-FR')}
Fournisseur : ${input.supplierName}
Logisticien 3PL : ${input.logisticianName}${input.logisticianEmail ? ` (${input.logisticianEmail})` : ''}

OBJET : tampon / consignation chez 3PL (procédure année 1 — pas de WMS)

Livraison : DIRECTE chez le 3PL. 0 carton à Paris.

LIGNE :
  • ${qtyLabel}× ${input.productName} [${input.productId}] — ${unit} → ${lineTotal}
  • Entrepôt / origine : ${input.shipsFrom || 'à obtenir'}
${hair
    ? `  • Tampon Hair lancement : constante fulfillment.ts (${TAMPON_META.totalUnits} u. au total, launchCatalog.ts inchangé)\n`
    : '  • Skin : pas de quantité tampon inventée — saisir la qté réelle.\n'}
Conditions :
  • Facturation HT, TVA selon régime
  • Merci de confirmer n° de suivi dès expédition
  • Annonce de réception = mailto, pas un ASN électronique
${isSkinCosmeticCategory(input.category)
    ? '  • COSMÉTIQUE SKIN : 3PL tampon OK. Pas de badge boutique 24–48h (CPNP / douane).\n'
    : ''}
KURLA Beauty — kurlabeauty.vercel.app
`;
  const email = text(input.logisticianEmail);
  return {
    subject,
    body,
    mailtoHref: email ? mailtoHref(email, subject, body) : null,
    wmsLive: false,
  };
}

/** Annonce de réception au logisticien. Ce n’est pas un ASN WMS. */
export function buildThreePlInboundNotice(input: ThreePlInboundInput): ThreePlDocument {
  const qty = input.quantity != null && Number.isFinite(input.quantity) && input.quantity > 0
    ? Math.round(input.quantity)
    : tamponQtyForProduct(input.productId);
  const qtyLabel = qty != null ? `${qty} unités` : 'quantité à obtenir';
  const subject = `[KURLA] Annonce réception tampon — ${input.poNumber} — pas un ASN WMS`;
  const body = `Bonjour ${input.logisticianName},

Annonce de réception (procédure année 1 — pas de WMS, pas d’ASN électronique).

Réf : ${input.poNumber}
Produit : ${input.productName} [${input.productId}]
Quantité : ${qtyLabel}
Fournisseur amont : ${input.supplierName}
Origine : ${input.shipsFrom || 'à obtenir'}

Merci de confirmer réception par écrit (e-mail). Aucun stock n’est poussé depuis un portail Huboo / Cubyn / Etx.

Bien à vous,
KURLA Beauty
`;
  const email = text(input.logisticianEmail);
  return {
    subject,
    body,
    mailtoHref: email ? mailtoHref(email, subject, body) : null,
    wmsLive: false,
  };
}

export type ThreePlProcedureItem = { id: string; ok: boolean; label: string };

export function threePlYear1Checklist(input: {
  product: { id?: string | null; category?: string | null };
  source: ProductSource | null;
  logisticianEmail?: string | null;
}): { ok: boolean; items: ThreePlProcedureItem[]; wmsLive: false } {
  const source = input.source;
  const threePl = source?.model === '3pl';
  const hair = isHairTamponSku(input.product.id);
  const items: ThreePlProcedureItem[] = [
    {
      id: 'source',
      ok: threePl === true,
      label: threePl ? 'Offre product_sources en 3PL' : 'Pas d’offre 3PL — saisir une source modèle 3pl',
    },
    {
      id: 'logistician',
      ok: Boolean(source?.supplierId),
      label: source?.supplierId ? 'Logisticien = fournisseur enregistré (pas un nom libre)' : 'Logisticien du référentiel manquant',
    },
    {
      id: 'mailto',
      ok: Boolean(text(input.logisticianEmail)),
      label: text(input.logisticianEmail) ? 'mailto 3PL prêt (e-mail réel)' : 'E-mail logisticien à obtenir — rien n’est envoyé',
    },
    {
      id: 'wms',
      ok: true,
      label: 'Procédure manuelle année 1 — pas de WMS, pas d’ASN',
    },
    {
      id: 'qty',
      ok: true,
      label: hair
        ? `Tampon Hair : ${tamponQtyForProduct(input.product.id)} u. (constante fulfillment.ts)`
        : 'Skin : quantité tampon à obtenir — pas de 15 inventé',
    },
    {
      id: 'cosmetic',
      ok: true,
      label: isSkinCosmeticCategory(input.product.category)
        ? 'Cosmétique Skin : 3PL tampon OK, pas de promesse 24–48h'
        : hair
          ? `Hair tampon lancement : ${TAMPON_META.totalUnits} u. chez 3PL (launchCatalog.ts intact)`
          : 'Hors cosmétique Skin — 3PL = logisticien nommé',
    },
  ];
  return {
    ok: items.every(item => item.ok),
    items,
    wmsLive: false,
  };
}
