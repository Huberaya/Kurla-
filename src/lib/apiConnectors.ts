/**
 * CHANTIER 16 — Connecteurs API (fail-closed).
 *
 * Audit §9 #16 : seulement si un fournisseur a une API réelle **et** un
 * contrat nommé. Aucun contrat n’est dans le dépôt → **aucun appel réseau**.
 * C9–C11 restent la procédure année 1 (badge, PO, mailto). Hair `p*` /
 * tampon 75 inchangés. Pas d’agrégateur (AliExpress / CJ / Spocket).
 */
import { AFFILIATE_TRACKING_LIVE } from './affiliateOffer';
import { isSkinCosmeticCategory } from './dropshipProcedure';
import { isDropshipToolId } from './fulfillment';
import { THREE_PL_WMS_LIVE } from './threePlProcedure';
import type { ProductSource } from './supplyModel';

export const API_CONNECTORS_YEAR1 = false;
export const API_CONNECTORS_VERSION = '2026-09-17.c16.v1';

/** Vide volontairement : un id ici = un contrat signé, daté, nommé. */
export const SIGNED_CONNECTOR_CONTRACTS: readonly string[] = [];

export type ConnectorKind = 'dropship' | 'affiliation' | '3pl';

export type ConnectorId =
  | 'africanfabs'
  | 'afrowholesale'
  | 'etx'
  | 'huboo'
  | 'cubyn'
  | 'affiliate_network';

export type ConnectorAction = 'sync_stock' | 'push_order' | 'asn' | 'generate_affiliate_link' | 'postback';

export type ConnectorCatalogEntry = {
  id: ConnectorId;
  kind: ConnectorKind;
  label: string;
  /** Site public — jamais fetché. */
  publicSite: string;
  signedContractId: null;
  live: false;
};

export const CONNECTOR_CATALOG: readonly ConnectorCatalogEntry[] = [
  { id: 'africanfabs', kind: 'dropship', label: 'AfricanFabs B.V.', publicSite: 'https://africanfabs.com', signedContractId: null, live: false },
  { id: 'afrowholesale', kind: 'dropship', label: 'Afro Wholesale', publicSite: 'https://afrowholesale.eu', signedContractId: null, live: false },
  { id: 'etx', kind: '3pl', label: 'Etx Logistique', publicSite: 'https://etx-logistique.fr', signedContractId: null, live: false },
  { id: 'huboo', kind: '3pl', label: 'Huboo', publicSite: 'https://www.huboo.com', signedContractId: null, live: false },
  { id: 'cubyn', kind: '3pl', label: 'Cubyn', publicSite: 'https://www.cubyn.com', signedContractId: null, live: false },
  { id: 'affiliate_network', kind: 'affiliation', label: 'Réseau d’affiliation', publicSite: '', signedContractId: null, live: false },
];

export const FORBIDDEN_AGGREGATORS = ['aliexpress', 'cjdropshipping', 'spocket', 'zendrop'] as const;

export type ConnectorCall = {
  connectorId: string;
  action: ConnectorAction;
  productId?: string | null;
  category?: string | null;
  sourceModel?: ProductSource['model'] | null;
  /** Un id inventé est ignoré. */
  claimedContractId?: string | null;
};

export type ConnectorRefusal = {
  ok: false;
  live: false;
  connectorId: string;
  action: ConnectorAction;
  reason: string;
};

export function connectorById(id: string): ConnectorCatalogEntry | null {
  return CONNECTOR_CATALOG.find(row => row.id === id) || null;
}

export function isConnectorLive(_id: ConnectorId): false {
  return false;
}

export function liveConnectors(): ConnectorCatalogEntry[] {
  return CONNECTOR_CATALOG.filter(row => row.live);
}

export function year1ApisAreOff(): boolean {
  return API_CONNECTORS_YEAR1 === false
    && THREE_PL_WMS_LIVE === false
    && AFFILIATE_TRACKING_LIVE === false
    && SIGNED_CONNECTOR_CONTRACTS.length === 0
    && liveConnectors().length === 0
    && CONNECTOR_CATALOG.every(row => row.live === false && row.signedContractId === null);
}

function modelMatches(kind: ConnectorKind, model?: ProductSource['model'] | null): boolean {
  if (!model) return true;
  if (kind === 'dropship') return model === 'dropshipping';
  if (kind === '3pl') return model === '3pl';
  return model === 'affiliation';
}

/** Toujours un refus nommé. Jamais un 200 inventé. */
export function attemptConnectorCall(call: ConnectorCall): ConnectorRefusal {
  const id = String(call.connectorId || '').trim().toLowerCase();
  const base: ConnectorRefusal = {
    ok: false,
    live: false,
    connectorId: id || call.connectorId,
    action: call.action,
    reason: 'pas de contrat API nommé — procédure mailto (C9–C11)',
  };
  if ((FORBIDDEN_AGGREGATORS as readonly string[]).includes(id)) {
    return { ...base, reason: 'agrégateur hors année 1 (AliExpress / CJ / Spocket / Zendrop)' };
  }
  const entry = connectorById(id);
  if (!entry) {
    return { ...base, reason: 'connecteur inconnu — pas d’appel réseau' };
  }
  if (call.claimedContractId && !SIGNED_CONNECTOR_CONTRACTS.includes(call.claimedContractId)) {
    return { ...base, reason: 'contrat inventé — absent du registre signé' };
  }
  if (entry.signedContractId == null || !SIGNED_CONNECTOR_CONTRACTS.includes(entry.signedContractId)) {
    if (entry.kind === 'dropship' && isSkinCosmeticCategory(call.category)) {
      return { ...base, reason: 'cosmétique Skin ≠ API dropship 24–48h — pas de contrat, mailto seulement' };
    }
    if (!modelMatches(entry.kind, call.sourceModel)) {
      return { ...base, reason: `modèle d’offre « ${call.sourceModel} » ≠ connecteur ${entry.kind} — pas d’appel` };
    }
    return base;
  }
  return { ...base, reason: 'connecteur listé mais année 1 : API éteinte' };
}

export function hairAccessoryDoesNotNeedApi(productId: string): boolean {
  return isDropshipToolId(productId);
}

export function apiConnectorsAdminNote(): string {
  return 'Connecteurs API : 0 contrat signé, 0 appel réseau. Dropship / 3PL / affiliation restent mailto (C9–C11).';
}
