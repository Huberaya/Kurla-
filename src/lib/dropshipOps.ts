/**
 * ONGLET « DROPSHIPPING » DU CATALOGUE (20/09, demande de l'utilisatrice).
 *
 * Vue transversale de ce que le catalogue compte en dropshipping : une ligne
 * par produit ayant une offre `product_sources.model = 'dropshipping'` ou un
 * badge boutique 24–48h. Le guide (« Guide dropship 0 carton ») explique la
 * méthode ; CET onglet répond à « où j'en suis, produit par produit ».
 *
 * Règles du dépôt, appliquées ici sans exception :
 *  - aucune donnée inventée : coût null = « à obtenir », jamais 0 ;
 *  - cosmétique skin / catégories réservées : la promesse 24–48h ne s'écrit
 *    pas (dropshipEligibility + règles dropshipProcedure) ;
 *  - un badge sans offre fournisseur est une ANOMALIE, pas une fonctionnalité.
 */
import type { ProductSource } from './supplyModel';
import { dropshipEligibility, type DropshipEligibility } from './productLifecycle';
import { isDropship24hBadge, promisesDropship24h, YEAR1_DROPSHIP_MAX_LEAD_DAYS } from './dropshipProcedure';

export type DropshipRow = {
  productId: string;
  name: string;
  category: string | null;
  /** Nom du fournisseur de l'offre principale — vide si aucune offre. */
  supplierName: string;
  hasOffer: boolean;
  available: boolean;
  leadTimeDays: number | null;
  /** Coût d'achat en centimes ; null = inconnu (affiché « à obtenir »). */
  costCents: number | null;
  /** Promesse boutique réellement tenable (calculée, pas déclarée). */
  promises24h: boolean;
  /** Badge 24–48h présent sur la fiche produit. */
  badge24h: boolean;
  eligibility: DropshipEligibility;
  anomalies: string[];
};

export type DropshipOpsTotals = {
  products: number;
  withOffer: number;
  availableNow: number;
  promised24h: number;
  anomalies: number;
};

export type DropshipOps = { rows: DropshipRow[]; totals: DropshipOpsTotals };

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Construit les lignes + les totaux. `products` = fiches du catalogue admin,
 * `sources` = TOUTES les offres (tous modèles, tous produits),
 * `suppliers` = registre des fournisseurs (id → nom).
 */
export function computeDropshipOps(
  products: any[],
  sources: ProductSource[],
  suppliers: Array<{ id?: string; name?: string }> = []
): DropshipOps {
  const allByProduct = new Map<string, ProductSource[]>();
  const dropByProduct = new Map<string, ProductSource[]>();
  for (const s of sources || []) {
    const key = String(s.productId ?? '');
    if (!key) continue;
    if (!allByProduct.has(key)) allByProduct.set(key, []);
    allByProduct.get(key)!.push(s);
    if (s.model === 'dropshipping') {
      if (!dropByProduct.has(key)) dropByProduct.set(key, []);
      dropByProduct.get(key)!.push(s);
    }
  }
  const supplierName = new Map<string, string>();
  for (const s of suppliers || []) {
    if (s?.id) supplierName.set(String(s.id), text((s as any).name));
  }

  const rows: DropshipRow[] = [];
  for (const p of products || []) {
    const id = String(p?.id ?? p?.slug ?? '').trim();
    if (!id) continue;
    const badges: unknown[] = Array.isArray(p.badges) ? p.badges : [];
    const badge24h = badges.some(isDropship24hBadge);
    const dropshipSources = dropByProduct.get(id) || [];
    if (dropshipSources.length === 0 && !badge24h) continue; // hors sujet de l'onglet
    const primary = dropshipSources.find(s => s.isPrimary) || dropshipSources[0] || null;
    const category = text(p.category) || null;
    const eligibility = dropshipEligibility(category);
    const promises24h = promisesDropship24h({ id, category, badges }, allByProduct.get(id));

    const anomalies: string[] = [];
    if (!primary) {
      anomalies.push('Badge 24–48h sans offre fournisseur — la promesse ne repose sur rien.');
    } else {
      if (!primary.available) anomalies.push('Offre déclarée indisponible : plus aucune commande ne peut être transmise.');
      if (primary.leadTimeDays == null) anomalies.push('Délai inconnu : à obtenir du fournisseur (rien n’est compté par défaut).');
      else if (primary.leadTimeDays > YEAR1_DROPSHIP_MAX_LEAD_DAYS) anomalies.push(`Délai fournisseur de ${primary.leadTimeDays} j > ${YEAR1_DROPSHIP_MAX_LEAD_DAYS} j : la promesse boutique doit être suspendue.`);
      if (primary.costCents == null) anomalies.push('Coût d’achat inconnu : à obtenir avant tout prix de vente.');
      if (!text(primary.supplierId ?? undefined) && !text(primary.partnerName ?? undefined)) anomalies.push('Offre rattachée à aucun fournisseur identifié.');
    }
    if (badge24h && eligibility === 'forbidden') anomalies.push('Catégorie non éligible au dropship KURLA : le badge 24–48h n’a pas à y figurer.');
    if (primary && eligibility === 'forbidden') anomalies.push('Offre dropshipping sur une catégorie réservée : à reclasser (3PL ou stock).');

    rows.push({
      productId: id,
      name: text(p.name) || text(p.title) || id,
      category,
      supplierName: primary ? (supplierName.get(String(primary.supplierId ?? '')) || text(primary.partnerName) || '') : '',
      hasOffer: !!primary,
      available: !!primary?.available,
      leadTimeDays: primary?.leadTimeDays ?? null,
      costCents: primary?.costCents ?? null,
      promises24h,
      badge24h,
      eligibility,
      anomalies,
    });
  }

  const totals: DropshipOpsTotals = {
    products: rows.length,
    withOffer: rows.filter(r => r.hasOffer).length,
    availableNow: rows.filter(r => r.hasOffer && r.available).length,
    promised24h: rows.filter(r => r.promises24h).length,
    anomalies: rows.reduce((n, r) => n + r.anomalies.length, 0),
  };
  return { rows, totals };
}

/** Formatage commun : jamais de zéro inventé, jamais de promesse muette. */
export function formatLeadTime(days: number | null): string {
  return days == null ? 'à obtenir' : `${days} j`;
}
export function formatCost(cents: number | null): string {
  return cents == null ? 'à obtenir' : `${(cents / 100).toFixed(2)} € HT`;
}
