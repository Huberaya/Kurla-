import { getAdminCatalogProducts, getCatalogPublicationReadinessReport } from './catalogStore';
import { listSourcingItems, listRfqs, compareRfqResponses } from './sourcingStore';
import { listSupplierDocuments } from './supplierStore';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 15B — COCKPIT CATALOGUE ET APPROVISIONNEMENT.
 *
 * Le critère du chantier tient en une phrase : *une personne qui ouvre l'écran
 * peut répondre à « ce produit peut-il être vendu, et sinon qu'est-ce qui
 * manque » sans ouvrir une base de données.*
 *
 * Cette fonction réunit les quatre sources qui existaient séparément — état de
 * publication (chantier 14), provenance (16A), documents de conformité (16B),
 * besoins de sourcing (16C) — en une seule lecture.
 *
 * Deux décisions d'honnêteté, qui comptent plus que l'ergonomie :
 *
 *  1. **Le coût servi est `null`, avec sa raison.** Il n'existe ni lot, ni prix
 *     d'achat saisi : c'est le chantier 16D. Afficher un coût calculé à partir
 *     de rien serait un chiffre inventé dans l'écran le plus regardé de
 *     l'administration.
 *  2. **Aucune liste de « documents manquants » par produit.** Un produit n'a
 *     pas d'exigences documentaires propres : les exigences vivent sur le
 *     besoin de sourcing. L'écran dit donc ce que nous **avons** pour le
 *     fournisseur du produit, et signale l'absence de fournisseur — il ne
 *     fabrique pas une liste d'attentes.
 */

export interface ProductCockpitRow {
  productId: string;
  title: string;
  slug?: string;
  catalogStatus: string;
  ready: boolean;
  missing: string[];
  supplierId?: string;
  supplierName?: string;
  /** Ce que le fournisseur du produit a réellement au référentiel. */
  documentsHeld: string[];
  expiredDocuments: string[];
  /** Toujours `null` avant le chantier 16D. */
  servedCostCents: null;
  servedCostReason: string;
}

export interface SourcingWaveSummary {
  wave: string;
  items: number;
  toSource: number;
  inRfq: number;
  awarded: number;
  abandoned: number;
  rfqCount: number;
  responseCount: number;
}

export interface OperationsCockpit {
  generatedAt: string;
  products: number;
  readyToPublish: number;
  publishedStatus: number;
  publishedButNotListable: number;
  rows: ProductCockpitRow[];
  /** Les blocages nommés, agrégés : c'est la liste de travail. */
  blockers: Array<{ label: string; count: number; productIds: string[] }>;
  productsWithoutSupplier: number;
  sourcing: {
    waves: SourcingWaveSummary[];
    itemCount: number;
    rfqCount: number;
    responseCount: number;
    awardedCount: number;
  };
  servedCostAvailable: false;
  servedCostReason: string;
}

const SERVED_COST_REASON =
  'Le coût servi n’est pas disponible : il suppose des lots et des prix d’achat enregistrés, ce que le chantier 16D met en place. Aucune valeur n’est estimée ici.';

export async function getOperationsCockpit(store: SupabaseServerStore): Promise<OperationsCockpit> {
  const [report, catalog, items] = await Promise.all([
    getCatalogPublicationReadinessReport(store),
    getAdminCatalogProducts(store),
    listSourcingItems(store)
  ]);

  // Documents par fournisseur, lus une seule fois : plusieurs produits peuvent
  // venir du même fournisseur, et relire à chaque ligne fausserait le coût.
  const documentsBySupplier = new Map<string, { held: string[]; expired: string[] }>();
  const supplierIds = [...new Set(catalog.map(product => product.supplierId).filter(Boolean))] as string[];
  const today = new Date().toISOString().slice(0, 10);
  for (const supplierId of supplierIds) {
    const documents = await listSupplierDocuments(store, supplierId);
    documentsBySupplier.set(supplierId, {
      held: [...new Set(documents.map(document => document.documentType))],
      expired: [...new Set(documents.filter(document => document.expiresOn && document.expiresOn < today).map(document => document.documentType))]
    });
  }

  const byId = new Map(catalog.map(product => [product.id, product]));
  const blockerMap = new Map<string, string[]>();

  const rows: ProductCockpitRow[] = report.perProduct.map(entry => {
    const product = byId.get(entry.productId);
    const supplierId = product?.supplierId;
    const documents = supplierId ? documentsBySupplier.get(supplierId) : undefined;
    for (const label of entry.missing) {
      const current = blockerMap.get(label) || [];
      current.push(entry.productId);
      blockerMap.set(label, current);
    }
    return {
      productId: entry.productId,
      title: entry.title,
      slug: product?.slug,
      catalogStatus: entry.catalogStatus,
      ready: entry.ready,
      missing: entry.missing,
      supplierId,
      supplierName: product?.sourceSupplier,
      documentsHeld: documents?.held ?? [],
      expiredDocuments: documents?.expired ?? [],
      servedCostCents: null,
      servedCostReason: SERVED_COST_REASON
    };
  });

  // Un produit sans fournisseur n'est pas « en retard » : il n'a simplement
  // aucune provenance enregistrée. Le compteur est distinct pour ne pas noyer
  // les blocages éditoriaux sous un problème d'approvisionnement.
  const productsWithoutSupplier = rows.filter(row => !row.supplierId).length;

  // Agrégation des besoins de sourcing par vague, avec le nombre de demandes
  // et de réponses réellement enregistrées.
  const waves = new Map<string, SourcingWaveSummary>();
  let rfqTotal = 0;
  let responseTotal = 0;
  let awardedTotal = 0;
  for (const item of items) {
    const rfqs = await listRfqs(store, item.id);
    const comparison = await compareRfqResponses(store, item.id);
    rfqTotal += rfqs.length;
    responseTotal += comparison.responseCount;
    if (item.status === 'awarded') awardedTotal += 1;
    const summary = waves.get(item.wave) || {
      wave: item.wave, items: 0, toSource: 0, inRfq: 0, awarded: 0, abandoned: 0, rfqCount: 0, responseCount: 0
    };
    summary.items += 1;
    summary.rfqCount += rfqs.length;
    summary.responseCount += comparison.responseCount;
    if (item.status === 'to_source') summary.toSource += 1;
    else if (item.status === 'in_rfq') summary.inRfq += 1;
    else if (item.status === 'awarded') summary.awarded += 1;
    else if (item.status === 'abandoned') summary.abandoned += 1;
    waves.set(item.wave, summary);
  }

  return {
    generatedAt: new Date().toISOString(),
    products: report.products,
    readyToPublish: report.readyToPublish,
    publishedStatus: report.publishedStatus,
    publishedButNotListable: report.publishedButNotListable,
    rows,
    blockers: [...blockerMap.entries()]
      .map(([label, productIds]) => ({ label, count: productIds.length, productIds }))
      .sort((a, b) => b.count - a.count),
    productsWithoutSupplier,
    sourcing: {
      waves: [...waves.values()].sort((a, b) => a.wave.localeCompare(b.wave)),
      itemCount: items.length,
      rfqCount: rfqTotal,
      responseCount: responseTotal,
      awardedCount: awardedTotal
    },
    servedCostAvailable: false,
    servedCostReason: SERVED_COST_REASON
  };
}
