/**
 * VUES DE GOUVERNANCE « MISE EN VENTE » (chantier 17/09 — lot 1 : B + C).
 *
 * Trois fonctions pures, sans DOM ni réseau, couvertes par le banc
 * `kurla_catalog_pipeline` :
 *
 *   - `derivePipelineStage` / `buildCatalogPipeline`  (chantier B)
 *       Un produit avance dans 6 stades, d'un seul tenant appro → boutique :
 *         IDENTIFIÉ (candidat appro, pas de fiche) → FICHE CRÉÉE (draft)
 *         → DOSSIER EN COURS → CONFORME (critères verts, à publier)
 *         → PUBLIÉ (visible en boutique) → VENDABLE (checkout OK).
 *       L'« anomalie boutique » = publié ET visible ET non conforme : c'est
 *       exactement le cas que l'exploitant a choisi de laisser en boutique pour
 *       tester, et qu'il veut SIGNALÉ, pas masqué.
 *   - `findBoutiqueAnomalies`  (chantier C1)
 *       La liste nominative des fiches visibles en boutique mais non conformes.
 *   - `buildExpiryWatch`  (chantier C2)
 *       Veille réglementaire : documents CPNP / pers. responsable / CPSR / PIF
 *       expirés ou expirant sous 60 jours, mappés aux produits concernés.
 *       Un document SANS date n'est pas surveillé (on ne devine pas une date).
 *
 * Principe de la plateforme : tout est dérivé des données réelles (consolidated,
 * catalogue, publication-readiness, fournisseurs), jamais inventé ; un champ
 * inconnu reste absent, et l'absence est une information.
 */

export type PipelineStage = 'identified' | 'draft' | 'dossier' | 'conforme' | 'publie' | 'vendable';

export const PIPELINE_STAGES: Array<{ id: PipelineStage; label: string }> = [
  { id: 'identified', label: 'Identifié (appro)' },
  { id: 'draft', label: 'Fiche créée' },
  { id: 'dossier', label: 'Dossier en cours' },
  { id: 'conforme', label: 'Conforme — à publier' },
  { id: 'publie', label: 'Publié en boutique' },
  { id: 'vendable', label: 'Vendable' }
];

export interface PipelineProductInput {
  id: string;
  name?: string;
  slug?: string;
  catalogStatus?: string;
  isTestListing?: boolean;
  supplierId?: string | null;
  truth?: { isPubliclyListable?: boolean; isCheckoutEligible?: boolean } | null;
}

export interface PipelineRow {
  id: string;
  kind: 'product' | 'candidate';
  name: string;
  slug?: string;
  stage: PipelineStage;
  /** Publié ET visible en boutique ET non conforme → à signaler (jamais masqué). */
  anomaly: boolean;
  isTest: boolean;
  /** Critères manquants nommés (publication-readiness). */
  missing: string[];
  supplierName: string | null;
  catalogStatus: string | null;
  priceEur: number | null;
  /** Pour le deep link vers le catalogue (fiches uniquement). */
  focusProductId?: string;
}

export interface PipelineInput {
  /** Lignes consolidées (produits + candidats) — la population « 250+ ». */
  rows: Array<{ kind: 'product' | 'candidate'; id: string; name: string; supplierName: string | null; priceEur: number | null }>;
  /** Catalogue admin (tous statuts). */
  products: PipelineProductInput[];
  /** publication-readiness perProduct. */
  readiness: Array<{ productId: string; ready: boolean; missing: string[] }>;
}

export interface PipelineResult {
  rows: PipelineRow[];
  counts: Record<PipelineStage, number>;
  total: number;
  anomalies: number;
  testCount: number;
  /** Matrice de filtres : les critères manquants les plus fréquents (nommés). */
  topCriteria: Array<{ label: string; count: number }>;
}

/**
 * Stade d'une FICHE (pas d'un candidat). Portes dérivées, pas de donnée
 * inventée : `isCheckoutEligible`/`isPubliclyListable` viennent de la truth
 * layer, `ready` de la publication-readiness.
 */
export function derivePipelineStage(
  product: PipelineProductInput,
  readiness: { ready: boolean; missing: string[] } | null
): { stage: PipelineStage; anomaly: boolean } {
  const listable = !!product.truth?.isPubliclyListable;
  const sellable = !!product.truth?.isCheckoutEligible;
  const published = product.catalogStatus === 'published';
  const ready = readiness ? readiness.ready : false;
  // Anomalie boutique : visible en boutique mais non conforme. C'est le cas
  // que l'exploitant a volontairement laissé pour tester — on le SIGNALE.
  const anomaly = published && listable && !ready;
  if (sellable) return { stage: 'vendable', anomaly };
  if (published && listable) return { stage: 'publie', anomaly };
  if (ready) return { stage: 'conforme', anomaly };
  if (product.catalogStatus === 'draft') return { stage: 'draft', anomaly };
  return { stage: 'dossier', anomaly };
}

export function buildCatalogPipeline(input: PipelineInput): PipelineResult {
  const productById = new Map(input.products.map(p => [String(p.id), p]));
  const readyById = new Map(input.readiness.map(r => [String(r.productId), r]));

  const rows: PipelineRow[] = [];
  for (const row of input.rows) {
    if (row.kind === 'candidate') {
      rows.push({
        id: String(row.id), kind: 'candidate', name: row.name, stage: 'identified',
        anomaly: false, isTest: false, missing: [], supplierName: row.supplierName,
        catalogStatus: null, priceEur: row.priceEur
      });
      continue;
    }
    const product = productById.get(String(row.id));
    if (!product) {
      // Ligne « produit » du consolidé sans fiche catalogue : on reste honnête,
      // on la range « identifié » (pas de fiche créée) au lieu d'inventer un stade.
      rows.push({
        id: String(row.id), kind: 'product', name: row.name, stage: 'identified',
        anomaly: false, isTest: false, missing: [], supplierName: row.supplierName,
        catalogStatus: null, priceEur: row.priceEur
      });
      continue;
    }
    const readiness = readyById.get(String(product.id)) || null;
    const { stage, anomaly } = derivePipelineStage(product, readiness);
    rows.push({
      id: String(product.id), kind: 'product',
      name: row.name || product.name || product.id,
      slug: product.slug, stage, anomaly,
      isTest: !!product.isTestListing,
      missing: readiness?.missing || [],
      supplierName: row.supplierName,
      catalogStatus: product.catalogStatus || null,
      priceEur: row.priceEur,
      focusProductId: String(product.id)
    });
  }

  const counts: Record<PipelineStage, number> = {
    identified: 0, draft: 0, dossier: 0, conforme: 0, publie: 0, vendable: 0
  };
  let anomalies = 0;
  let testCount = 0;
  const criterionCounts = new Map<string, number>();
  for (const r of rows) {
    counts[r.stage] += 1;
    if (r.anomaly) anomalies += 1;
    if (r.isTest) testCount += 1;
    for (const m of r.missing) criterionCounts.set(m, (criterionCounts.get(m) || 0) + 1);
  }
  const topCriteria = [...criterionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));

  return { rows, counts, total: rows.length, anomalies, testCount, topCriteria };
}

/* ------------------------------------------------------------------ */
/* Chantier C1 — anomalies en boutique (signalées, jamais masquées)     */
/* ------------------------------------------------------------------ */

export interface BoutiqueAnomaly {
  productId: string;
  name: string;
  slug?: string;
  isTest: boolean;
  missing: string[];
}

/**
 * Les fiches PUBLIÉES et VISIBLES en boutique mais NON CONFORMES. C'est la
 * liste que l'exploitant veut voir nommée dans le catalogue. Trier par nombre
 * de manquants (le plus « malade » d'abord), puis par nom.
 */
export function findBoutiqueAnomalies(
  products: PipelineProductInput[],
  readiness: Array<{ productId: string; ready: boolean; missing: string[] }>
): BoutiqueAnomaly[] {
  const readyById = new Map(readiness.map(r => [String(r.productId), r]));
  const found: BoutiqueAnomaly[] = [];
  for (const p of products) {
    const r = readyById.get(String(p.id));
    if (!r) continue;
    const published = p.catalogStatus === 'published';
    const listable = !!p.truth?.isPubliclyListable;
    if (published && listable && !r.ready) {
      found.push({
        productId: String(p.id),
        name: p.name || p.id,
        slug: p.slug,
        isTest: !!p.isTestListing,
        missing: r.missing || []
      });
    }
  }
  found.sort((a, b) => (b.missing.length - a.missing.length) || a.name.localeCompare(b.name));
  return found;
}

/* ------------------------------------------------------------------ */
/* Chantier C2 — veille d'expiration réglementaire (CPNP / RP / CPSR)   */
/* ------------------------------------------------------------------ */

export const TRACKED_DOCUMENT_TYPES = new Set(['cpnp_notification', 'responsible_person', 'cpsr', 'pif']);
export const EXPIRY_WATCH_DAYS = 60;

export interface ExpiryWatchInputSupplier {
  id: string;
  legalName?: string;
  tradeName?: string;
  /** Documents de conformité tenus (types suivis), avec date d'expiration. */
  complianceDocs?: Array<{ documentType: string; expiresOn?: string | null }> | null;
}

export interface ExpiryAlert {
  supplierId: string;
  supplierName: string;
  documentType: string;
  expiresOn: string;
  state: 'expired' | 'expiring';
  daysLeft: number;
  affectedProducts: Array<{ id: string; name: string }>;
}

const DOCUMENT_LABEL: Record<string, string> = {
  cpnp_notification: 'Notification CPNP',
  responsible_person: 'Personne responsable UE',
  cpsr: 'CPSR',
  pif: 'PIF'
};

export function documentTypeLabel(type: string): string {
  return DOCUMENT_LABEL[type] || type;
}

/**
 * Veille d'expiration : pour chaque fournisseur, les documents de conformité
 * suivis qui sont EXPIRÉS ou expirant sous EXPIRY_WATCH_DAYS jours, mappés aux
 * produits rattachés. Un document sans date d'expiration est ignoré (on ne
 * devine pas). `now` est injectable pour figer le calcul dans les tests.
 */
export function buildExpiryWatch(
  suppliers: ExpiryWatchInputSupplier[],
  products: Array<{ id: string; name?: string; supplierId?: string | null }>,
  now: Date = new Date()
): ExpiryAlert[] {
  const productsBySupplier = new Map<string, Array<{ id: string; name: string }>>();
  for (const p of products) {
    if (!p.supplierId) continue;
    const key = String(p.supplierId);
    const list = productsBySupplier.get(key) || [];
    list.push({ id: String(p.id), name: p.name || p.id });
    productsBySupplier.set(key, list);
  }

  const alerts: ExpiryAlert[] = [];
  for (const supplier of suppliers) {
    const docs = supplier.complianceDocs || [];
    for (const doc of docs) {
      if (!TRACKED_DOCUMENT_TYPES.has(doc.documentType)) continue;
      if (!doc.expiresOn) continue; // pas de date → pas de veille (honnêteté)
      const exp = new Date(doc.expiresOn);
      if (Number.isNaN(exp.getTime())) continue;
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86_400_000);
      const state: 'expired' | 'expiring' = daysLeft < 0 ? 'expired' : 'expiring';
      if (state === 'expiring' && daysLeft > EXPIRY_WATCH_DAYS) continue;
      alerts.push({
        supplierId: String(supplier.id),
        supplierName: String(supplier.legalName || supplier.tradeName || supplier.id),
        documentType: doc.documentType,
        expiresOn: String(doc.expiresOn).slice(0, 10),
        state,
        daysLeft,
        affectedProducts: productsBySupplier.get(String(supplier.id)) || []
      });
    }
  }
  // Expirés d'abord (plus graves), puis le plus proche de l'expiration.
  alerts.sort((a, b) => {
    if (a.state !== b.state) return a.state === 'expired' ? -1 : 1;
    return a.daysLeft - b.daysLeft;
  });
  return alerts;
}
