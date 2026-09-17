import React, { useEffect, useMemo, useState } from 'react';
import type { ReturnInsightSummary } from '../lib/returnInsight';
import { evaluateKurlaReady } from '../lib/kurlaReadyScore';
import { Check, CheckCircle2, FileText, Image as ImageIcon, Package, Plus, RefreshCw, Save, Upload, X, ArrowRight } from 'lucide-react';
import { fetchAdminCatalogProducts } from '../lib/adminCatalogProducts';
import { ColumnFilterStrip, applyColumnFilters, emptyFilterState, type ColumnFilter } from '../lib/columnFilters';
import { ProductSheet } from './ProductSheet';
import { SupplierSheet, useAdminRecords } from './SupplierSheet';
import { getAdminRecordsVersion } from '../lib/adminRecordsStore';

type CatalogAdminPanelProps = {
  headers: HeadersInit;
  onSuccess?: (message: string) => void;
  onOpenGuide?: () => void;
  /** Workspace catalogue affiché par le dashboard admin. */
  scope?: 'all' | 'hair' | 'skin';
  /** « À faire aujourd'hui » : fiche à focaliser (préremplit le filtre de recherche). */
  focusProductId?: string;
  focusLabel?: string;
};

type VariantDraft = {
  id?: string;
  name: string;
  price: string;
  stockQuantity: string;
  size: string;
  format: string;
  color: string;
  shade: string;
  scent: string;
  sku: string;
  isActive: boolean;
};

type ProductDraft = {
  id?: string;
  name: string;
  slug: string;
  brand: string;
  category: 'cheveux' | 'peau';
  subCategory: string;
  price: string;
  originalPrice: string;
  promotionPrice: string;
  promotionStartsAt: string;
  promotionEndsAt: string;
  isPromo: boolean;
  vatRate: string;
  priceIncludesVat: boolean;
  stockQuantity: string;
  isActive: boolean;
  countryAvailability: string;
  description: string;
  image: string;
  imageOwnershipStatus: 'brand_provided' | 'licensed' | 'unverified';
  images: string;
  ingredients: string;
  inci: string;
  warnings: string;
  certifications: string;
  catalogCategoryTags: string[];
  targetAudiences: string[];
  recommendedAgeBand: string;
  recommendedAgeMin: string;
  recommendedAgeMax: string;
  minorSafetyStatus: 'verified' | 'pending' | 'not_provided';
  adultOnlyActives: string;
  parentalSupervisionRequired: boolean;
  imageSupervisionStatus: 'verified' | 'pending' | 'not_provided';
  sourceSupplier: string;
  supplierSku: string;
  supplierId: string;
  variants: VariantDraft[];
  isDropship: boolean;
};

const emptyVariant = (): VariantDraft => ({ name: '', price: '', stockQuantity: '0', size: '', format: '', color: '', shade: '', scent: '', sku: '', isActive: true });
const emptyDraft = (): ProductDraft => ({
  name: '', slug: '', brand: '', category: 'cheveux', subCategory: '', price: '', originalPrice: '', promotionPrice: '',
  promotionStartsAt: '', promotionEndsAt: '', isPromo: false, vatRate: '20', priceIncludesVat: true, stockQuantity: '0',
  isActive: false, countryAvailability: 'FR', description: '', image: '', imageOwnershipStatus: 'unverified', images: '', ingredients: '', inci: '', warnings: '',
  certifications: '[]', catalogCategoryTags: [], targetAudiences: [], recommendedAgeBand: 'not_provided', recommendedAgeMin: '', recommendedAgeMax: '', minorSafetyStatus: 'not_provided', adultOnlyActives: '', parentalSupervisionRequired: false, imageSupervisionStatus: 'not_provided', sourceSupplier: '', supplierSku: '', supplierId: '', variants: [], isDropship: false
});

function inputClass(): string {
  return 'w-full px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-kurla-cream text-xs focus:outline-none focus:border-kurla-copper';
}
function labelClass(): string {
  return 'text-[10px] uppercase tracking-wider font-bold text-kurla-amber';
}
function splitLines(value: string): string[] {
  return value.split(/[|;\n]/).map(item => item.trim()).filter(Boolean);
}
function variantFromApi(variant: any): VariantDraft {
  return {
    id: variant.id,
    name: variant.name || variant.label || '',
    price: String(variant.price ?? ''),
    stockQuantity: String(variant.stockQuantity ?? variant.stock_quantity ?? 0),
    size: variant.option_type === 'size' ? (variant.option_value || '') : '',
    format: variant.format_label || '',
    color: variant.color || '',
    shade: variant.shade || '',
    scent: variant.scent || '',
    sku: variant.sku || '',
    isActive: variant.isActive ?? variant.is_active !== false
  };
}
function draftFromProduct(product: any): ProductDraft {
  return {
    id: product.id,
    name: product.name || '', slug: product.slug || '', brand: product.brand || '', category: product.category === 'peau' ? 'peau' : 'cheveux',
    subCategory: product.subCategory || product.subcategory || '', price: String(product.price ?? ''), originalPrice: String(product.originalPrice ?? ''),
    promotionPrice: String(product.promotionPrice ?? product.promotion_price ?? ''), promotionStartsAt: product.promotionStartsAt ? product.promotionStartsAt.slice(0, 16) : '',
    promotionEndsAt: product.promotionEndsAt ? product.promotionEndsAt.slice(0, 16) : '', isPromo: product.isPromo === true || product.is_promo === true,
    vatRate: String(product.vatRate ?? product.vat_rate ?? 20), priceIncludesVat: product.priceIncludesVat !== false,
    stockQuantity: String(product.stockQuantity ?? product.stock_quantity ?? 0), isActive: product.isActive === true || product.is_active === true,
    countryAvailability: (product.countryAvailability || []).join(', '), description: product.description || '', image: product.image || '',
    imageOwnershipStatus: product.imageOwnershipStatus || product.image_ownership_status || 'unverified',
    images: (product.galleryImages || []).map((image: any) => image.url).filter(Boolean).join('\n'), ingredients: (product.ingredients || []).join(' | '),
    inci: product.inci || '', warnings: (product.warnings || []).join(' | '), certifications: JSON.stringify(product.certifications || [], null, 2),
    catalogCategoryTags: product.catalogCategoryTags || [], targetAudiences: product.targetAudiences || [],
    recommendedAgeBand: product.recommendedAgeBand || product.recommended_age_band || 'not_provided',
    recommendedAgeMin: String(product.recommendedAgeMin ?? product.recommended_age_min ?? ''),
    recommendedAgeMax: String(product.recommendedAgeMax ?? product.recommended_age_max ?? ''),
    minorSafetyStatus: product.minorSafetyStatus || product.minor_safety_status || 'not_provided',
    adultOnlyActives: (product.adultOnlyActives || product.adult_only_actives || []).join(' | '),
    parentalSupervisionRequired: product.parentalSupervisionRequired === true || product.parental_supervision_required === true,
    imageSupervisionStatus: product.imageSupervisionStatus || product.image_supervision_status || 'not_provided',
    sourceSupplier: product.sourceSupplier || '', supplierSku: product.supplierSku || '', supplierId: product.supplierId || '', variants: (product.variants || []).map(variantFromApi),
    isDropship: Array.isArray((product as any).badges) ? ((product as any).badges.includes('dropship') || (product as any).badges.includes('dropship_24_48h')) : ['p35','p36','p41','p16','p21','p23','p17','p18','p19','p37','p45','p38'].includes(String((product as any).id).replace(/^launch-/,''))
  };
}

/**
 * « Fiche 360 » (17/09 phase 2) — assemble, pour une fiche, les trois points de
 * vue de l'acheteur depuis les données déjà chargées : commercial (état de
 * publication + manques nommés), appro (fournisseur rattaché + lots reçus) et
 * demande (précommandes). Fonction pure, sans DOM ni réseau : le banc
 * `kurla_catalog_workbench` la couvre. Aucune donnée n'est déduite : un champ
 * inconnu reste null, jamais supposé.
 */
export interface Product360Input {
  product: { id: string; name?: string; catalogStatus?: string; inStock?: boolean; stockQuantity?: number; isPreorder?: boolean } | null;
  supplier: { legalName?: string; country?: string; moqUnits?: number | null; leadTimeDays?: number | null; verificationStatus?: string } | null;
  readiness: { ready: boolean; missing: string[] } | null;
  batches: Array<{ receivedOn?: string; quantityReceived?: number; unitCost?: number | null }>;
  demandRow: { qtyFirm?: number; qtyPending?: number; qtyToSource?: number; orderCountFirm?: number } | null;
}

export function buildProduct360(input: Product360Input) {
  const { product, supplier, readiness, batches, demandRow } = input;
  const lastLot = batches
    .filter(batch => Number.isFinite(Number(batch.unitCost)) && Number(batch.unitCost) > 0)
    .sort((a, b) => String(b.receivedOn || '').localeCompare(String(a.receivedOn || '')))[0];
  const qtyFirm = Number(demandRow?.qtyFirm) || 0;
  const qtyPending = Number(demandRow?.qtyPending) || 0;
  const qtyToSource = Number(demandRow?.qtyToSource) || 0;
  return {
    commercial: {
      status: product?.catalogStatus || 'inconnu',
      ready: readiness ? readiness.ready : null,
      missing: readiness ? readiness.missing || [] : []
    },
    supply: {
      supplierName: supplier ? String(supplier.legalName || '') || null : null,
      country: supplier?.country || null,
      moqUnits: supplier && Number.isFinite(Number(supplier.moqUnits)) ? Number(supplier.moqUnits) : null,
      leadTimeDays: supplier && Number.isFinite(Number(supplier.leadTimeDays)) ? Number(supplier.leadTimeDays) : null,
      verified: supplier?.verificationStatus === 'verified',
      lotsReceived: batches.length,
      lastLotCostEur: lastLot ? Math.round(Number(lastLot.unitCost)) / 100 : null
    },
    demand: {
      hasDemand: qtyFirm > 0 || qtyPending > 0 || qtyToSource > 0,
      qtyFirm,
      qtyPending,
      qtyToSource
    }
  };
}

/** Export CSV d'une sélection de fiches (RFC4180 : CRLF + échappements). Fonction pure, testée. */
export function productsSelectionToCsv(rows: Array<{
  id: string; name: string; slug?: string; brand?: string | null; price: number;
  catalogStatus: string; supplierName: string | null; ready: boolean; missing: string[];
}>): string {
  const header = ['Reference', 'Nom', 'Slug', 'Marque', 'Prix_eur', 'Statut', 'Fournisseur', 'Publiable', 'Manquants'];
  const escape = (value: string | number | boolean | null): string => {
    const text = value == null ? '' : typeof value === 'boolean' ? (value ? 'oui' : 'non') : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([row.id, row.name, row.slug || '', row.brand, row.price, row.catalogStatus, row.supplierName, row.ready, row.missing.join(' | ')].map(escape).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export const CatalogAdminPanel: React.FC<CatalogAdminPanelProps> = ({ headers, onSuccess, onOpenGuide, scope = 'all', focusProductId, focusLabel }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [imports, setImports] = useState<any[]>([]);
  // Référentiel fournisseurs : joint côté écran par supplier_id pour afficher
  // le contact réel de chaque produit (jamais inventé — il vient de la table suppliers).
  const [suppliersRef, setSuppliersRef] = useState<any[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft());
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierJson, setSupplierJson] = useState('[]');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  // Les fiches test / sourcing (migration 20260926000000) sont noyées parmi
  // tout le catalogue admin : ce filtre les isole en un clic.
  const [showTestOnly, setShowTestOnly] = useState(false);
  const [error, setError] = useState('');
  // Intelligence des retours : signalement equipe catalogue, jamais client.
  const [returnInsights, setReturnInsights] = useState<Record<string, ReturnInsightSummary>>({});
  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  // B1 — disponibilité CPNP/RP/CPSR par produit (enrichi par publication-readiness)
  const [readinessMap, setReadinessMap] = useState<Record<string, { ready: boolean; missing: string[] }>>({});

  const loadCatalog = async () => {
    setBusy(true);
    setError('');
    try {
      // Liste produits via le chargement partagé (17/09) : trois panneaux de
      // cet onglet la demandaient séparément — une seule requête au montage.
      // `?scope=` a disparu de l'URL : readWorkspaceScope donne la priorité à
      // l'en-tête x-kurla-workspace, toujours présent, donc le paramètre ne
      // changeait rien. Le filtre par catégorie est conservé tel quel (il est
      // idempotent sur une liste déjà bornée à l'espace).
      const catalog = await fetchAdminCatalogProducts(headers);
      const [taxonomyResponse, importsResponse, suppliersResponse] = await Promise.all([
        fetch('/api/admin/catalog/taxonomy', { headers }),
        fetch('/api/admin/catalog/imports', { headers }),
        fetch('/api/admin/suppliers', { headers })
      ]);
      const taxonomy = await taxonomyResponse.json();
      const importData = await importsResponse.json();
      const suppliersData = await suppliersResponse.json().catch(() => ({}));
      const allProducts = catalog.products || [];
      setProducts(scope === 'all' ? allProducts : allProducts.filter((product: any) => (scope === 'skin' ? product.category === 'peau' : product.category !== 'peau')));
      setCategories(taxonomy.categories || []);
      setAudiences(taxonomy.audiences || []);
      setImports(importData.imports || []);
      if (suppliersResponse.ok) setSuppliersRef(suppliersData.suppliers || []);
      // B1+B3 — état de publication (inclut désormais CPNP/RP/CPSR) pour afficher les manques nominativement
      try {
        const readinessResponse = await fetch('/api/admin/catalog/publication-readiness', { headers });
        if (readinessResponse.ok) {
          const readinessData = await readinessResponse.json();
          const map: Record<string, { ready: boolean; missing: string[] }> = {};
          (readinessData.perProduct || []).forEach((item: any) => { map[item.productId] = { ready: !!item.ready, missing: item.missing || [] }; });
          setReadinessMap(map);
        }
      } catch { /* readiness non bloquant */ }
    } catch (loadError: any) {
      setError(loadError.message || 'Impossible de charger le catalogue.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { loadCatalog(); }, [scope]);

  // « À faire aujourd'hui » : focalise la fiche demandée en préremplissant le
  // filtre (le filtre cherche sur nom / marque / slug). Se réactive quand la
  // cible change, pas à chaque rendu.
  useEffect(() => {
    if (!focusProductId) return;
    setFilter(focusLabel || focusProductId);
  }, [focusProductId, focusLabel]);

  useEffect(() => {
    if (draft.id) return;
    setDraft(current => ({ ...current, category: scope === 'skin' ? 'peau' : scope === 'hair' ? 'cheveux' : current.category }));
  }, [scope, draft.id]);

  const isTestCard = (product: any) => product?.truth?.isTestListing === true || product?.isTestListing === true || product?.is_test_listing === true;
  const testCardCount = useMemo(() => products.filter(isTestCard).length, [products]);
  // Filtres rapides de l'acheteur (17/09 phase 2) : prêts / bloqués / sans
  // fournisseur — comptés sur les données réelles (readiness, supplierId).
  const [quickFilter, setQuickFilter] = useState<'all' | 'ready' | 'blocked' | 'nosupplier'>('all');
  const quickCounts = useMemo(() => ({
    ready: products.filter(p => readinessMap[p.id]?.ready).length,
    blocked: products.filter(p => readinessMap[p.id] && !readinessMap[p.id].ready).length,
    nosupplier: products.filter(p => !p.supplierId).length
  }), [products, readinessMap]);
  // Sélection multiple → actions groupées (rattachement fournisseur, export CSV).
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkSupplierId, setBulkSupplierId] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  // Vue 360 : une fiche, tout d'un coup (commercial / appro / demande).
  const [view360Id, setView360Id] = useState<string | null>(null);
  const [view360Data, setView360Data] = useState<{ batches: any[]; demandRow: any | null } | null>(null);
  // Fiches flottantes (17/09) : ouvrir la fiche d'un produit ou d'un
  // fournisseur LÀ où le manque apparaît, au lieu de chercher dans quel onglet
  // se trouve le seul écran qui écrit.
  const [sheetProduct, setSheetProduct] = useState<string | null>(null);
  const [sheetSupplier, setSheetSupplier] = useState<string | null>(null);
  const records = useAdminRecords();
  // Après un enregistrement depuis une fiche, la liste se recharge : la
  // nouvelle valeur apparaît ici sans recharger la page.
  useEffect(() => { if (records.version > 0) loadCatalog(); }, [records.version]); // eslint-disable-line react-hooks/exhaustive-deps
  // Filtres par champ (17/09) : le même motif que dans Fournisseurs — un
  // filtre par colonne, combinables entre eux, aucun filtre = liste complète.
  // Posés en barre nommée plutôt que sous des en-têtes parce que les fiches
  // produits sont des cartes, pas un tableau. Le calcul vient de
  // src/lib/columnFilters (banc kurla_column_filters) : accents ignorés,
  // 0 considéré comme une donnée, filtres combinés en ET.
  const columnFilters = useMemo<ColumnFilter[]>(() => [
    { key: 'name', kind: 'text', get: (product: any) => product.name, extra: (product: any) => [product.slug] },
    { key: 'brand', kind: 'text', get: (product: any) => product.brand },
    { key: 'status', kind: 'enum', get: (product: any) => product.catalogStatus, options: [
      { value: 'published', label: 'Publié' },
      { value: 'draft', label: 'Brouillon' },
      { value: 'archived', label: 'Archivé' },
    ] },
    { key: 'category', kind: 'enum', get: (product: any) => product.category, options: (categories.length ? categories : ['peau', 'cheveux', 'kits', 'accessoires']).map((category: any) => { const value = typeof category === 'string' ? category : category?.value || category?.slug || category?.name; return { value: String(value), label: String(typeof category === 'string' ? category : category?.label || category?.name || value) }; }).filter((option: any) => option.value) },
    { key: 'supplier', kind: 'enum', get: (product: any) => product.supplierId || '', options: [{ value: '__empty__', label: 'Sans fournisseur' }, ...suppliersRef.map((supplier: any) => ({ value: String(supplier.id), label: supplier.legalName || supplier.tradeName || String(supplier.id) }))], presentLabels: { filled: 'Avec fournisseur', empty: 'Sans fournisseur' } },
    { key: 'price', kind: 'numeric', get: (product: any) => Number(product.price || 0), unit: ' €' },
    { key: 'stock', kind: 'numeric', get: (product: any) => (product.stockQuantity == null ? NaN : Number(product.stockQuantity)), unit: ' u' },
    { key: 'inci', kind: 'present', get: (product: any) => product.inci, presentLabels: { filled: 'INCI renseigné', empty: 'INCI manquant' } },
  ], [categories, suppliersRef]);
  const [columnFilterState, setColumnFilterState] = useState(() => emptyFilterState([
    { key: 'name' }, { key: 'brand' }, { key: 'status' }, { key: 'category' },
    { key: 'supplier' }, { key: 'price' }, { key: 'stock' }, { key: 'inci' },
  ] as ColumnFilter[]));
  const setColumnFilter = (key: string, value: string) => setColumnFilterState(prev => ({ ...prev, [key]: value }));
  // Allègement (17/09) : 138 fiches rendues d'un coup, chacune avec ses
  // badges, son bloc fournisseur et ses manques, c'est une page interminable.
  // On rend les 50 premières de la vue filtrée ; le reste sur demande. Les
  // filtres restent au-dessus du plafond : « Tout afficher » ne les perd pas.
  const PRODUCT_PAGE = 50;
  const [showAllProducts, setShowAllProducts] = useState(false);
  const baseFilteredProducts = useMemo(() => products.filter(product => {
    if (showTestOnly && !isTestCard(product)) return false;
    if (quickFilter === 'ready' && !readinessMap[product.id]?.ready) return false;
    if (quickFilter === 'blocked' && !(readinessMap[product.id] && !readinessMap[product.id].ready)) return false;
    if (quickFilter === 'nosupplier' && product.supplierId) return false;
    // Recherche globale : nom, marque, slug, INCI, ingrédients.
    const haystack = `${product.name} ${product.brand || ''} ${product.slug} ${product.inci || ''} ${(product.ingredients || []).join(' ')}`.toLowerCase();
    return haystack.includes(filter.toLowerCase());
  }), [products, filter, showTestOnly, quickFilter, readinessMap]);
  // Les filtres par champ s'appliquent APRÈS la recherche globale et les
  // filtres rapides : ils précisent, ils ne remplacent pas.
  const filteredProducts = useMemo(
    () => applyColumnFilters(baseFilteredProducts, columnFilters, columnFilterState),
    [baseFilteredProducts, columnFilters, columnFilterState]
  );
  const shownProducts = useMemo(
    () => (showAllProducts ? filteredProducts : filteredProducts.slice(0, PRODUCT_PAGE)),
    [filteredProducts, showAllProducts]
  );
  const toggleSelect = (id: string) => setSelection(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const selectVisible = () => setSelection(prev => { const next = new Set(prev); filteredProducts.forEach(p => next.add(String(p.id))); return next; });
  const clearSelection = () => setSelection(new Set());

  const openView360 = async (productId: string) => {
    setView360Id(productId);
    setView360Data(null);
    try {
      const [batchesResponse, demandResponse] = await Promise.all([
        fetch(`/api/admin/batches?productId=${encodeURIComponent(productId)}`, { headers }),
        fetch('/api/admin/preorder-demand', { headers })
      ]);
      const [batchesJson, demandJson] = await Promise.all([batchesResponse.json(), demandResponse.json()]);
      setView360Data({
        batches: batchesJson.batches || [],
        demandRow: (demandJson.products || []).find((row: any) => String(row.productId) === String(productId)) || null
      });
    } catch {
      setView360Data({ batches: [], demandRow: null });
    }
  };

  const linkSuppliersBulk = async () => {
    if (!bulkSupplierId || selection.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    setBulkMessage('');
    const ids = Array.from(selection).map(String);
    const results = await Promise.allSettled(ids.map(id =>
      fetch(`/api/admin/catalog/products/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers, body: JSON.stringify({ supplierId: bulkSupplierId })
      }).then(response => response.json().then(data => ({ ok: response.ok, data })))
    ));
    const failed = results.map((result, index) => ({ id: ids[index], result })).filter(x => x.result.status === 'rejected' || !x.result.value.ok);
    const supplier = suppliersRef.find(s => String(s.id) === String(bulkSupplierId));
    if (failed.length === 0) {
      setBulkMessage(`✓ ${ids.length} fiche(s) rattachée(s) à « ${supplier?.legalName || bulkSupplierId} ».`);
      clearSelection();
    } else {
      setBulkMessage(`${ids.length - failed.length}/${ids.length} rattachée(s) — ${failed.length} refusée(s) : ${failed.slice(0, 3).map(f => f.id).join(', ')}${failed.length > 3 ? '…' : ''}`);
    }
    setBulkBusy(false);
    loadCatalog();
  };

  const exportSelectionCsv = () => {
    const rows = products.filter(p => selection.has(String(p.id))).map(p => ({
      id: String(p.id),
      name: String(p.name || ''),
      slug: p.slug,
      brand: p.brand || null,
      price: Number(p.price) || 0,
      catalogStatus: p.catalogStatus || 'draft',
      supplierName: p.supplierId && supplierById[p.supplierId] ? supplierById[p.supplierId].legalName : null,
      ready: !!readinessMap[p.id]?.ready,
      missing: readinessMap[p.id]?.missing || []
    }));
    if (rows.length === 0) return;
    const csv = productsSelectionToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `selection-catalogue-kurla-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBulkMessage(`✓ ${rows.length} fiche(s) exportée(s) en CSV.`);
  };
  const supplierById = useMemo(() => {
    const index: Record<string, any> = {};
    for (const item of suppliersRef) index[item.id] = item;
    return index;
  }, [suppliersRef]);

  const setField = (field: keyof ProductDraft, value: any) => setDraft(current => ({ ...current, [field]: value }));
  const toggleValue = (field: 'catalogCategoryTags' | 'targetAudiences', value: string) => {
    setDraft(current => ({ ...current, [field]: current[field].includes(value) ? current[field].filter(item => item !== value) : [...current[field], value] }));
  };
  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => setDraft(current => ({
    ...current,
    variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant)
  }));

  const payloadFromDraft = () => {
    let certifications: unknown = [];
    try {
      certifications = draft.certifications.trim() ? JSON.parse(draft.certifications) : [];
      if (!Array.isArray(certifications)) throw new Error('Les certifications doivent être un tableau JSON.');
    } catch (parseError: any) {
      throw new Error(parseError.message || 'Certifications JSON invalides.');
    }
    return {
      ...(draft.id ? { id: draft.id } : {}), name: draft.name, slug: draft.slug, brand: draft.brand, category: scope === 'skin' ? 'peau' : scope === 'hair' ? 'cheveux' : draft.category, subCategory: draft.subCategory,
      price: draft.price, originalPrice: draft.originalPrice || undefined, promotionPrice: draft.promotionPrice || undefined,
      promotionStartsAt: draft.promotionStartsAt || undefined, promotionEndsAt: draft.promotionEndsAt || undefined, isPromo: draft.isPromo,
      vatRate: draft.vatRate, priceIncludesVat: draft.priceIncludesVat, stockQuantity: draft.stockQuantity, isActive: draft.isActive,
      countryAvailability: splitLines(draft.countryAvailability).map(country => country.toUpperCase()), description: draft.description, image: draft.image, imageOwnershipStatus: draft.imageOwnershipStatus,
      images: splitLines(draft.images).map(url => ({ url, ownershipStatus: draft.imageOwnershipStatus, validationStatus: 'pending' })), ingredients: splitLines(draft.ingredients), inci: draft.inci, warnings: splitLines(draft.warnings), certifications,
      catalogCategoryTags: draft.catalogCategoryTags, targetAudiences: draft.targetAudiences,
      recommendedAgeBand: draft.recommendedAgeBand,
      recommendedAgeMin: draft.recommendedAgeMin || undefined,
      recommendedAgeMax: draft.recommendedAgeMax || undefined,
      minorSafetyStatus: draft.minorSafetyStatus,
      adultOnlyActives: splitLines(draft.adultOnlyActives),
      parentalSupervisionRequired: draft.parentalSupervisionRequired,
      imageSupervisionStatus: draft.imageSupervisionStatus,
      sourceSupplier: draft.sourceSupplier, supplierSku: draft.supplierSku, supplierId: draft.supplierId || undefined,
      badges: draft.isDropship ? ['dropship_24_48h'] : (draft.id ? [] : undefined),
      variants: draft.variants.map(variant => ({ id: variant.id, name: variant.name, price: variant.price || draft.price, stockQuantity: variant.stockQuantity, sku: variant.sku,
        optionType: variant.size ? 'size' : variant.format ? 'format' : variant.shade ? 'shade' : variant.scent ? 'scent' : undefined,
        optionValue: variant.size || variant.format || variant.shade || variant.scent || undefined, formatLabel: variant.format, color: variant.color, shade: variant.shade,
        scent: variant.scent, isActive: variant.isActive }))
    };
  };

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch(draft.id ? `/api/admin/catalog/products/${draft.id}` : '/api/admin/catalog/products', {
        method: draft.id ? 'PATCH' : 'POST', headers, body: JSON.stringify(payloadFromDraft())
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Produit non enregistré.');
      onSuccess?.(draft.id ? 'Produit catalogue mis à jour.' : 'Produit catalogue créé en brouillon.');
      setDraft(emptyDraft()); await loadCatalog();
    } catch (saveError: any) { setError(saveError.message || 'Impossible d’enregistrer le produit.'); }
    finally { setBusy(false); }
  };

  const importCsv = async () => {
    if (!csvText.trim()) return setError('Sélectionnez un CSV avant de lancer l’import.');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/catalog/import/csv', { method: 'POST', headers, body: JSON.stringify({ csv: csvText, fileName: csvFile?.name }) });
      const data = await response.json();
      if (!response.ok && !data.import) throw new Error(data.error || 'Import CSV refusé.');
      onSuccess?.(`Import CSV terminé : ${data.import?.imported || 0} ligne(s) importée(s), ${data.import?.rejected || 0} rejetée(s).`);
      setCsvText(''); setCsvFile(null); await loadCatalog();
    } catch (importError: any) { setError(importError.message || 'Impossible d’importer le CSV.'); }
    finally { setBusy(false); }
  };

  const importSupplier = async () => {
    let records: unknown;
    try { records = JSON.parse(supplierJson); } catch { return setError('Le flux fournisseur doit être un tableau JSON valide.'); }
    if (!Array.isArray(records)) return setError('Le flux fournisseur doit être un tableau JSON.');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/catalog/import/supplier', { method: 'POST', headers, body: JSON.stringify({ supplier, records }) });
      const data = await response.json();
      if (!response.ok && !data.import) throw new Error(data.error || 'Import fournisseur refusé.');
      onSuccess?.(`Flux fournisseur terminé : ${data.import?.imported || 0} ligne(s) importée(s), ${data.import?.rejected || 0} rejetée(s).`);
      await loadCatalog();
    } catch (importError: any) { setError(importError.message || 'Impossible d’importer le fournisseur.'); }
    finally { setBusy(false); }
  };

  const loadReturnInsight = async (productId: string) => {
    setInsightLoading(productId);
    setError('');
    try {
      const response = await fetch(`/api/admin/return-insights/${encodeURIComponent(productId)}`, { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Intelligence des retours indisponible.');
      setReturnInsights(current => ({ ...current, [productId]: data.summary }));
    } catch (insightError: any) {
      setError(insightError.message || 'Intelligence des retours indisponible.');
    } finally {
      setInsightLoading(null);
    }
  };

  const markValidation = async (productId: string, checkType: string) => {
    if (!confirm(`Confirmer que le contrôle « ${checkType} » a été vérifié à partir d’une source réelle ?`)) return;
    try {
      const response = await fetch('/api/admin/catalog/validation', { method: 'POST', headers, body: JSON.stringify({ productId, checkType, status: 'passed', note: 'Contrôle confirmé par un administrateur depuis le catalogue.' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Validation refusée.');
      onSuccess?.(`Contrôle ${checkType} enregistré sans inventer de donnée.`); await loadCatalog();
    } catch (validationError: any) { setError(validationError.message || 'Validation impossible.'); }
  };

  const setStatus = async (product: any, status: string) => {
    try {
      const response = await fetch(`/api/admin/catalog/${product.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Statut refusé.');
      onSuccess?.(`Statut de ${product.name} mis à jour.`); await loadCatalog();
    } catch (statusError: any) { setError(statusError.message || 'Impossible de modifier le statut.'); }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-copper/30 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif-title font-bold flex items-center gap-2"><Package className="w-5 h-5 text-kurla-copper" /> Catalogue commercial administrable</h2>
            <p className="text-xs text-kurla-cream/55 mt-2">Les produits importés restent en brouillon et non publiés tant que les contrôles de confiance ne sont pas tous confirmés.</p>
          </div>
          <button onClick={loadCatalog} className="px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/10 text-xs flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Actualiser</button>
        </div>
        {error && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">{error}</div>}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="text-emerald-300 mt-0.5">📘</span>
            <p className="text-[11px] leading-relaxed text-emerald-100">
              <strong>Guide dropship 0 carton</strong> intégré : 7 étapes, modèles, checklist &amp; toggle autonome <code className="px-1 py-0.5 rounded bg-kurla-ink border border-emerald-500/20 text-emerald-200">☑ Dropship 24–48h</code> — ouvre le guide en 1 clic.
            </p>
          </div>
          {onOpenGuide && (
            <button onClick={onOpenGuide} className="shrink-0 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow">
              Ouvrir le guide <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={saveDraft} className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-5">
          <div className="flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><Save className="w-4 h-4 text-kurla-amber" /> {draft.id ? 'Modifier la fiche' : 'Créer une fiche manuelle'}</h3>{draft.id && <button type="button" onClick={() => setDraft(emptyDraft())} className="text-xs text-kurla-cream/50">Nouvelle fiche</button>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelClass()}>Nom *</span><input required value={draft.name} onChange={e => setField('name', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Slug</span><input value={draft.slug} onChange={e => setField('slug', e.target.value)} className={inputClass()} placeholder="généré si vide" /></label>
            <label className="space-y-1"><span className={labelClass()}>Marque</span><input value={draft.brand} onChange={e => setField('brand', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Département *</span><select value={scope === 'skin' ? 'peau' : scope === 'hair' ? 'cheveux' : draft.category} onChange={e => setField('category', e.target.value)} disabled={scope !== 'all'} className={inputClass()}><option value="cheveux">Cheveux</option><option value="peau">Peau</option></select></label>
            <label className="space-y-1"><span className={labelClass()}>Sous-catégorie</span><input value={draft.subCategory} onChange={e => setField('subCategory', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Prix TTC *</span><input required type="number" min="0" step="0.01" value={draft.price} onChange={e => setField('price', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Prix avant promotion</span><input type="number" min="0" step="0.01" value={draft.originalPrice} onChange={e => setField('originalPrice', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>TVA (%)</span><input type="number" min="0" max="100" step="0.01" value={draft.vatRate} onChange={e => setField('vatRate', e.target.value)} className={inputClass()} /></label>
          </div>

          <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-3"><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.isPromo} onChange={e => setField('isPromo', e.target.checked)} /> Promotion active</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.priceIncludesVat} onChange={e => setField('priceIncludesVat', e.target.checked)} /> Prix TTC</label></div>{draft.isPromo && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label className="space-y-1"><span className={labelClass()}>Prix promo *</span><input required type="number" min="0" step="0.01" value={draft.promotionPrice} onChange={e => setField('promotionPrice', e.target.value)} className={inputClass()} /></label><label className="space-y-1"><span className={labelClass()}>Début</span><input type="datetime-local" value={draft.promotionStartsAt} onChange={e => setField('promotionStartsAt', e.target.value)} className={inputClass()} /></label><label className="space-y-1"><span className={labelClass()}>Fin</span><input type="datetime-local" value={draft.promotionEndsAt} onChange={e => setField('promotionEndsAt', e.target.value)} className={inputClass()} /></label></div>}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className={labelClass()}>Stock de base</span><input type="number" min="0" step="1" value={draft.stockQuantity} onChange={e => setField('stockQuantity', e.target.value)} className={inputClass()} /></label>
            <label className="space-y-1"><span className={labelClass()}>Pays (codes ISO, INT)</span><input value={draft.countryAvailability} onChange={e => setField('countryAvailability', e.target.value)} className={inputClass()} placeholder="FR, BE, CH" /></label>
            <label className="col-span-2 flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer">
              <input type="checkbox" checked={draft.isDropship} onChange={e => setField('isDropship', e.target.checked)} className="mt-0.5 accent-emerald-500" />
              <span className="text-[11px] leading-tight">
                <span className="font-bold text-emerald-300">Dropship 24–48h (partenaire UE) — 0 stock chez toi</span>
                <span className="block text-kurla-cream/60">Coche uniquement si le fournisseur, le délai et le flux d’expédition sont documentés pour ce SKU. Décoche pour les soins/kits tant que la source, le lot et les preuves ne sont pas validés. Le badge boutique passe au vert uniquement après les contrôles serveur.</span>
              </span>
            </label>
            <label className="space-y-1 sm:col-span-2"><span className={labelClass()}>Image principale (URL vérifiable)</span><input value={draft.image} onChange={e => setField('image', e.target.value)} className={inputClass()} placeholder="https://…" /></label>
            <label className="space-y-1"><span className={labelClass()}>Provenance image</span><select value={draft.imageOwnershipStatus} onChange={e => setField('imageOwnershipStatus', e.target.value)} className={inputClass()}><option value="unverified">Non vérifiée</option><option value="brand_provided">Fournie par la marque</option><option value="licensed">Sous licence documentée</option></select></label>
            <p className="text-[10px] text-kurla-cream/45 self-end pb-2">Le choix est une attestation opérateur, pas une preuve automatique. Le contrôle Images reste à valider.</p>
            <label className="space-y-1 sm:col-span-2"><span className={labelClass()}>Autres images (une URL par ligne)</span><textarea rows={3} value={draft.images} onChange={e => setField('images', e.target.value)} className={inputClass()} /></label>
          </div>

          <div className="space-y-2"><span className={labelClass()}>Catégories administrées</span><div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-kurla-ink">{categories.map(category => <label key={category.slug} className="text-[11px] flex items-center gap-2"><input type="checkbox" checked={draft.catalogCategoryTags.includes(category.slug)} onChange={() => toggleValue('catalogCategoryTags', category.slug)} />{category.label}</label>)}</div></div>
          <div className="space-y-2"><span className={labelClass()}>Publics</span><div className="flex flex-wrap gap-2 p-3 rounded-xl bg-kurla-ink">{audiences.map(audience => <label key={audience.slug} className="text-[11px] flex items-center gap-2"><input type="checkbox" checked={draft.targetAudiences.includes(audience.slug)} onChange={() => toggleValue('targetAudiences', audience.slug)} />{audience.label}</label>)}</div></div>

          <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-copper/25 space-y-3"><div><p className={labelClass()}>Sécurité enfants et adolescents</p><p className="text-[11px] text-kurla-cream/50 mt-1">Aucun produit n’est proposé à un mineur sans âge recommandé, vérification de sécurité et visuel validé.</p></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><select value={draft.recommendedAgeBand} onChange={e => setField('recommendedAgeBand', e.target.value)} className={inputClass()}><option value="not_provided">Âge recommandé non renseigné</option><option value="baby">Bébé</option><option value="child">Enfant</option><option value="teen">Adolescent</option><option value="adult">Adulte</option><option value="all_ages">Tous âges</option></select><input type="number" min="0" placeholder="Âge min." value={draft.recommendedAgeMin} onChange={e => setField('recommendedAgeMin', e.target.value)} className={inputClass()} /><input type="number" min="0" placeholder="Âge max." value={draft.recommendedAgeMax} onChange={e => setField('recommendedAgeMax', e.target.value)} className={inputClass()} /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><select value={draft.minorSafetyStatus} onChange={e => setField('minorSafetyStatus', e.target.value)} className={inputClass()}><option value="not_provided">Sécurité mineur non renseignée</option><option value="pending">Sécurité mineur à vérifier</option><option value="verified">Sécurité mineur vérifiée</option></select><select value={draft.imageSupervisionStatus} onChange={e => setField('imageSupervisionStatus', e.target.value)} className={inputClass()}><option value="not_provided">Images non supervisées</option><option value="pending">Images à superviser</option><option value="verified">Images supervisées</option></select></div><textarea rows={2} value={draft.adultOnlyActives} onChange={e => setField('adultOnlyActives', e.target.value)} className={inputClass()} placeholder="Actifs réservés aux adultes, si la source en mentionne (séparer par |)" /><label className="flex items-center gap-2 text-[11px] text-kurla-cream/75"><input type="checkbox" checked={draft.parentalSupervisionRequired} onChange={e => setField('parentalSupervisionRequired', e.target.checked)} /> Supervision parentale nécessaire à l’utilisation</label></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="space-y-1"><span className={labelClass()}>Composition / ingrédients</span><textarea rows={3} value={draft.ingredients} onChange={e => setField('ingredients', e.target.value)} className={inputClass()} placeholder="Séparer par |" /></label><label className="space-y-1"><span className={labelClass()}>INCI</span><textarea rows={3} value={draft.inci} onChange={e => setField('inci', e.target.value)} className={inputClass()} /></label><label className="space-y-1"><span className={labelClass()}>Avertissements</span><textarea rows={3} value={draft.warnings} onChange={e => setField('warnings', e.target.value)} className={inputClass()} placeholder="Uniquement ceux fournis par la source" /></label><label className="space-y-1"><span className={labelClass()}>Certifications (JSON)</span><textarea rows={3} value={draft.certifications} onChange={e => setField('certifications', e.target.value)} className={inputClass()} placeholder='[] si non renseigné' /></label></div>
          <label className="space-y-1 block"><span className={labelClass()}>Description</span><textarea rows={3} value={draft.description} onChange={e => setField('description', e.target.value)} className={inputClass()} /></label>

          <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-copper/25 space-y-3">
            <div>
              <p className={labelClass()}>Fournisseur & sourcing</p>
              <p className="text-[11px] text-kurla-cream/50 mt-1">Chaque produit référence une entité du référentiel fournisseurs : son contact s’affiche automatiquement ici et sur la fiche. Sans rattachement, le produit est marqué « sourcing à qualifier ».</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="space-y-1"><span className={labelClass()}>Fournisseur (référentiel)</span>
                <select value={draft.supplierId} onChange={e => setField('supplierId', e.target.value)} className={inputClass()}>
                  <option value="">— aucun (à qualifier) —</option>
                  {suppliersRef.map(item => <option key={item.id} value={item.id}>{item.legalName}{item.country ? ` (${item.country})` : ''}</option>)}
                </select></label>
              <label className="space-y-1"><span className={labelClass()}>Libellé sourcing (texte libre)</span><input value={draft.sourceSupplier} onChange={e => setField('sourceSupplier', e.target.value)} className={inputClass()} placeholder="Ex. Distristar — achat-revente" /></label>
              <label className="space-y-1"><span className={labelClass()}>SKU fournisseur</span><input value={draft.supplierSku} onChange={e => setField('supplierSku', e.target.value)} className={inputClass()} /></label>
            </div>
            {draft.supplierId && supplierById[draft.supplierId] && (
              <p className="text-[11px] text-kurla-cream/65">
                Contact : <span className="font-bold">{supplierById[draft.supplierId].contactName || 'non renseigné'}</span>
                {supplierById[draft.supplierId].contactEmail ? <> · <a href={`mailto:${supplierById[draft.supplierId].contactEmail}`} className="text-kurla-amber underline">{supplierById[draft.supplierId].contactEmail}</a></> : null}
                {supplierById[draft.supplierId].website ? <> · <a href={supplierById[draft.supplierId].website} target="_blank" rel="noreferrer" className="text-kurla-amber underline">{supplierById[draft.supplierId].website.replace(/^https?:\/\//, '')}</a></> : null}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-kurla-ink border border-kurla-cream/10 space-y-3"><div className="flex items-center justify-between"><span className={labelClass()}>Variantes : tailles, formats, couleurs, parfums</span><button type="button" onClick={() => setDraft(current => ({ ...current, variants: [...current.variants, emptyVariant()] }))} className="px-2.5 py-1.5 rounded-lg bg-kurla-copper text-[11px] font-bold flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter</button></div>{draft.variants.map((variant, index) => <div key={index} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border border-kurla-cream/10"><input placeholder="Nom / libellé *" value={variant.name} onChange={e => updateVariant(index, 'name', e.target.value)} className={inputClass()} /><input placeholder="Prix" type="number" min="0" step="0.01" value={variant.price} onChange={e => updateVariant(index, 'price', e.target.value)} className={inputClass()} /><input placeholder="Stock" type="number" min="0" value={variant.stockQuantity} onChange={e => updateVariant(index, 'stockQuantity', e.target.value)} className={inputClass()} /><input placeholder="SKU" value={variant.sku} onChange={e => updateVariant(index, 'sku', e.target.value)} className={inputClass()} /><input placeholder="Taille" value={variant.size} onChange={e => updateVariant(index, 'size', e.target.value)} className={inputClass()} /><input placeholder="Format" value={variant.format} onChange={e => updateVariant(index, 'format', e.target.value)} className={inputClass()} /><input placeholder="Couleur / teinte" value={variant.color || variant.shade} onChange={e => { updateVariant(index, 'color', e.target.value); updateVariant(index, 'shade', e.target.value); }} className={inputClass()} /><input placeholder="Parfum" value={variant.scent} onChange={e => updateVariant(index, 'scent', e.target.value)} className={inputClass()} /><label className="text-[11px] flex items-center gap-2"><input type="checkbox" checked={variant.isActive} onChange={e => updateVariant(index, 'isActive', e.target.checked)} /> Variante active</label><button type="button" onClick={() => setDraft(current => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) }))} className="text-[11px] text-rose-300 flex items-center gap-1"><X className="w-3 h-3" /> Retirer</button></div>)}</div>
          <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.isActive} onChange={e => setField('isActive', e.target.checked)} /> Fiche active (publication toujours soumise aux contrôles)</label><button disabled={busy} type="submit" className="px-5 py-2.5 rounded-xl bg-kurla-copper hover:bg-kurla-amber disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Enregistrer</button></div>
        </form>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4"><h3 className="font-bold flex items-center gap-2"><Upload className="w-4 h-4 text-kurla-amber" /> Import CSV</h3><p className="text-[11px] text-kurla-cream/50">Séparateur virgule, point-virgule ou tabulation. Les tableaux utilisent |. Les variantes et certifications peuvent être des tableaux JSON. Champs principaux : name, slug, brand, price, vat_rate, promotion_price, stock_quantity, country_availability, composition, warnings, images.</p><input type="file" accept=".csv,text/csv" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setCsvFile(file); setCsvText(await file.text()); }} className="text-xs w-full" /><button onClick={importCsv} disabled={busy || !csvText} className="px-4 py-2 rounded-xl bg-kurla-copper disabled:opacity-50 text-xs font-bold">Importer le CSV</button></div>
          <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4"><h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-kurla-amber" /> Import fournisseur</h3><p className="text-[11px] text-kurla-cream/50">Collez le flux JSON fourni par le partenaire. Aucune certification, image ou disponibilité n’est complétée automatiquement.</p><input value={supplier} onChange={e => setSupplier(e.target.value)} className={inputClass()} placeholder="Nom exact du fournisseur" /><textarea rows={8} value={supplierJson} onChange={e => setSupplierJson(e.target.value)} className={inputClass()} placeholder='[{"supplierSku":"…","name":"…","price":0}]' /><button onClick={importSupplier} disabled={busy} className="px-4 py-2 rounded-xl bg-kurla-copper disabled:opacity-50 text-xs font-bold">Importer le flux</button></div>
          <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-3"><h3 className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-kurla-amber" /> Journal des imports</h3>{imports.length === 0 ? <p className="text-xs text-kurla-cream/45">Aucun import enregistré.</p> : imports.slice(0, 8).map(item => <div key={item.id} className="text-[11px] flex justify-between gap-2 border-b border-kurla-cream/5 pb-2"><span>{item.source_type}{item.supplier ? ` • ${item.supplier}` : ''}</span><span className={item.status === 'completed' ? 'text-emerald-300' : 'text-amber-300'}>{item.status} • {item.rows_imported}/{item.rows_received}</span></div>)}</div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-kurla-espresso border border-kurla-cream/10 space-y-4"><div className="space-y-2.5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><h3 className="font-bold">Fiches produits ({filteredProducts.length}/{products.length})</h3><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher (nom, marque, slug, INCI)…" className="sm:w-80 px-3 py-2 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-xs" /></div><div className="flex flex-wrap items-center gap-1.5">{([['all', 'Toutes', null], ['ready', 'Prêtes', quickCounts.ready], ['blocked', 'Bloquées', quickCounts.blocked], ['nosupplier', 'Sans fournisseur', quickCounts.nosupplier], ['test', 'Test / sourcing', testCardCount]] as Array<['all' | 'ready' | 'blocked' | 'nosupplier' | 'test', string, number | null]>).map(([key, label, count]) => { const active = key === 'test' ? showTestOnly : quickFilter === key; return <button key={key} type="button" onClick={() => key === 'test' ? setShowTestOnly(v => !v) : setQuickFilter(current => current === key ? 'all' : key)} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${active ? 'bg-kurla-copper/20 text-kurla-copper border-kurla-copper/40' : 'bg-kurla-ink border-kurla-cream/15 text-kurla-cream/60 hover:border-kurla-copper/30'}`}>{label} ({count ?? 0})</button>; })}<button type="button" onClick={selectVisible} className="ml-auto px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/60 hover:border-kurla-copper/30">Sélectionner la vue</button></div>{selection.size > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-kurla-copper/30 bg-kurla-copper/[0.07] px-3 py-2"><span className="text-[11px] font-bold text-kurla-copper">{selection.size} sélectionnée{selection.size > 1 ? 's' : ''}</span><select value={bulkSupplierId} onChange={e => setBulkSupplierId(e.target.value)} className="px-2 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px]"><option value="">Fournisseur…</option>{suppliersRef.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.legalName}</option>)}</select><button type="button" onClick={linkSuppliersBulk} disabled={!bulkSupplierId || bulkBusy} className="px-3 py-1.5 rounded-lg bg-kurla-copper text-white text-[11px] font-bold hover:bg-kurla-cocoa disabled:opacity-40 disabled:cursor-not-allowed">{bulkBusy ? 'Rattachement…' : 'Rattacher au fournisseur'}</button><button type="button" onClick={exportSelectionCsv} className="px-3 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 hover:border-kurla-copper/30">Exporter la sélection (CSV)</button><button type="button" onClick={clearSelection} className="px-3 py-1.5 rounded-lg text-[11px] text-kurla-cream/45 hover:text-kurla-cream">Tout désélectionner</button>{bulkMessage && <span className="text-[11px] text-kurla-cream/65 w-full sm:w-auto">{bulkMessage}</span>}</div>}<ColumnFilterStrip
                    filters={columnFilters}
                    state={columnFilterState}
                    onChange={setColumnFilter}
                    onReset={() => setColumnFilterState(emptyFilterState(columnFilters))}
                    total={baseFilteredProducts.length}
                    shown={filteredProducts.length}
                  />{filteredProducts.length > shownProducts.length && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setShowAllProducts(true)} className="px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 hover:border-kurla-copper/40 hover:text-kurla-cream">
                        Afficher les {filteredProducts.length} fiches (les {shownProducts.length} premières sont à l’écran)
                      </button>
                      <span className="text-[11px] text-kurla-cream/45">Un filtre précis évite de tout dérouler.</span>
                    </div>
                  )}{showAllProducts && filteredProducts.length > PRODUCT_PAGE && (
                    <button type="button" onClick={() => setShowAllProducts(false)} className="px-3 py-1.5 rounded-xl bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/60 hover:border-kurla-copper/40">
                      Revenir aux {PRODUCT_PAGE} premières fiches
                    </button>
                  )}{view360Id && (() => { const product = products.find(p => String(p.id) === String(view360Id)); const supplier = product?.supplierId ? supplierById[product.supplierId] : null; const summary = buildProduct360({ product: product || null, supplier: supplier || null, readiness: product ? readinessMap[product.id] || null : null, batches: view360Data?.batches || [], demandRow: view360Data?.demandRow || null }); return <div className="rounded-2xl border border-kurla-copper/30 bg-kurla-ink p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><span className="font-bold text-sm truncate">{product?.name || view360Id}</span><span className="px-2 py-0.5 rounded-full text-[10px] bg-kurla-copper/15 text-kurla-amber shrink-0">{summary.commercial.status}</span></div><button type="button" onClick={() => { setView360Id(null); setView360Data(null); }} className="px-3 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/60 hover:border-kurla-copper/30 shrink-0">← Retour aux fiches</button></div>{view360Data === null && <p className="text-[11px] text-kurla-cream/45">Lecture des lots et de la demande pour cette fiche…</p>}{view360Data !== null && <div className="grid md:grid-cols-3 gap-3"><div className="rounded-xl bg-kurla-espresso border border-kurla-cream/10 p-3 space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Commercial</p>{summary.commercial.ready === true && <p className="text-[11px] text-emerald-300">✓ Prête à publier — tous les contrôles au vert.</p>}{summary.commercial.ready === false && <><p className="text-[11px] font-bold text-rose-300">⛔ Bloquée — {summary.commercial.missing.length} manquant(s) :</p><ul className="space-y-0.5">{summary.commercial.missing.map(item => <li key={item} className="text-[10px] text-rose-200/70">· {item}</li>)}</ul></>}{summary.commercial.ready === null && <p className="text-[11px] text-kurla-cream/45">État de publication non chargé.</p>}<p className="text-[10px] text-kurla-cream/50">Statut : {summary.commercial.status}{product?.isPreorder ? ' · précommande' : ''} · stock {product?.stockQuantity ?? 0}</p>{product?.inci && <details className="text-[10px] text-kurla-cream/50"><summary className="cursor-pointer text-kurla-amber/80 font-bold">INCI (extrait)</summary><p className="mt-1 leading-relaxed line-clamp-6 whitespace-pre-wrap">{String(product.inci).slice(0, 600)}{String(product.inci).length > 600 ? '…' : ''}</p></details>}</div><div className="rounded-xl bg-kurla-espresso border border-kurla-cream/10 p-3 space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Approvisionnement</p>{summary.supply.supplierName ? <p className="text-[11px] text-kurla-cream/75"><span className="font-bold text-kurla-cream">{summary.supply.supplierName}</span>{summary.supply.country ? ` (${summary.supply.country})` : ''} · {summary.supply.verified ? <span className="text-emerald-300">vérifié</span> : <span className="text-amber-300">vérification en cours</span>}</p> : <p className="text-[11px] text-amber-300/85">Fournisseur non rattaché — à sourcer.</p>}<p className="text-[10px] text-kurla-cream/50">MOQ : {summary.supply.moqUnits != null ? summary.supply.moqUnits : '—'} · Délai : {summary.supply.leadTimeDays != null ? `${summary.supply.leadTimeDays} j` : '—'}</p><p className="text-[10px] text-kurla-cream/50">Lots reçus : {summary.supply.lotsReceived}{summary.supply.lastLotCostEur != null ? ` · dernier coût ${summary.supply.lastLotCostEur.toFixed(2).replace('.', ',')} €/u` : ''}</p>{view360Data.batches.slice(0, 4).map((batch, index) => <p key={index} className="text-[10px] text-kurla-cream/40">· {batch.lotReference || 'lot'} {batch.receivedOn ? `du ${String(batch.receivedOn).slice(0, 10)}` : ''} — {batch.quantityReceived ?? '—'} u{Number.isFinite(Number(batch.unitCost)) && Number(batch.unitCost) > 0 ? ` à ${(Number(batch.unitCost) / 100).toFixed(2).replace('.', ',')} €/u` : ''}</p>)}</div><div className="rounded-xl bg-kurla-espresso border border-kurla-cream/10 p-3 space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-kurla-amber">Demande</p>{summary.demand.hasDemand ? <><p className="text-[11px] text-kurla-cream/75">{summary.demand.qtyFirm} ferme{summary.demand.qtyFirm > 1 ? 's' : ''} · {summary.demand.qtyPending} en attente</p><p className="text-[10px] text-kurla-cream/50">À couvrir au total : <span className="font-bold text-kurla-copper">{summary.demand.qtyToSource}</span> (kits déroulés)</p></> : <p className="text-[11px] text-kurla-cream/45">Aucune demande enregistrée pour cette fiche.</p>}</div></div>}</div>; })()}</div>{filteredProducts.length === 0 ? <p className="text-xs text-kurla-cream/45">{products.length === 0 ? 'Aucune fiche catalogue.' : 'Aucune fiche ne correspond à ces filtres.'}</p> : <div className="space-y-3">{shownProducts.map(product => <div key={product.id} className={`p-4 rounded-2xl bg-kurla-ink border ${selection.has(String(product.id)) ? 'border-kurla-copper/50' : 'border-kurla-cream/10'}`}><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div className="flex items-start gap-3 flex-1 min-w-0"><input type="checkbox" aria-label={`Sélectionner ${product.name}`} checked={selection.has(String(product.id))} onChange={() => toggleSelect(String(product.id))} className="mt-1.5 w-4 h-4 accent-[#B4642C] shrink-0" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setSheetProduct(String(product.id))} title="Ouvrir la fiche produit" className="font-bold text-sm text-left hover:text-kurla-amber underline decoration-kurla-copper/40 underline-offset-2">{product.name}</button><span className="px-2 py-0.5 rounded-full text-[10px] bg-kurla-copper/15 text-kurla-amber">{product.catalogStatus || 'draft'}</span><span className={`px-2 py-0.5 rounded-full text-[10px] ${product.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}`}>{product.isActive ? 'actif' : 'inactif'}</span>{isTestCard(product) && <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20">test / sourcing</span>}{(() => { const ready = evaluateKurlaReady(product); return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ready.state === 'ready' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' : ready.state === 'partial' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-rose-500/15 text-rose-300 border-rose-500/20'}`} title={[...ready.hardBlockers, ...ready.qualityGaps].join(' · ')}>KURLA Ready {ready.score}/100</span>; })()}{Array.isArray(product.badges) && (product.badges.includes('dropship') || product.badges.includes('dropship_24_48h')) && <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">24–48h dropship</span>}</div><p className="text-[11px] text-kurla-cream/55 mt-1">{product.brand || 'Marque non renseignée'} • {Number(product.price || 0).toFixed(2)} € • stock {product.stockQuantity ?? 0} • modifié {product.lastCatalogUpdatedAt ? new Date(product.lastCatalogUpdatedAt).toLocaleString('fr-FR') : 'date non renseignée'}</p>{(() => { const ready = evaluateKurlaReady(product); if (ready.hardBlockers.length === 0 && ready.qualityGaps.length === 0) return null; return <p className="text-[10px] mt-1 leading-relaxed">{ready.hardBlockers.length > 0 && <span className="text-rose-300/85">⛔ Bloque la vente : {ready.hardBlockers.join(' · ')}</span>}{ready.hardBlockers.length > 0 && ready.qualityGaps.length > 0 && ' — '}{ready.qualityGaps.length > 0 && <span className="text-amber-300/70">à compléter : {ready.qualityGaps.join(' · ')}</span>}</p>; })()}{(() => { const linked = product.supplierId ? supplierById[product.supplierId] : null; return linked ? <p className="text-[11px] mt-1 text-kurla-cream/70">Fournisseur : <button type="button" onClick={() => setSheetSupplier(String(linked.id))} title="Ouvrir la fiche fournisseur" className="font-bold text-kurla-amber underline underline-offset-2">{linked.legalName}</button>{linked.country ? ` (${linked.country})` : ''} — {linked.contactName || 'contact non nommé'}{linked.contactEmail ? <> · <a href={`mailto:${linked.contactEmail}`} className="text-kurla-amber underline">{linked.contactEmail}</a></> : <span className="text-amber-300"> · e-mail à compléter</span>}{linked.website ? <> · <a href={linked.website} target="_blank" rel="noreferrer" className="text-kurla-amber underline">{String(linked.website).replace(/^https?:\/\//, '')}</a></> : null}</p> : <p className="text-[11px] mt-1 text-amber-300/85">Fournisseur non rattaché — sourcing à qualifier{product.sourceSupplier ? ` (${product.sourceSupplier})` : ''}</p>; })()}
{readinessMap[product.id] && !readinessMap[product.id].ready && (
  <div className="mt-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20">
    <p className="text-[10px] font-bold text-amber-300">⛔ Publication bloquée — {readinessMap[product.id].missing.length} manque(s) :</p>
    <p className="text-[10px] text-amber-200/70 leading-relaxed">{readinessMap[product.id].missing.join(' · ')}</p>
    {readinessMap[product.id].missing.some((m: string) => m.includes('CPNP') || m.includes('Responsable') || m.includes('CPSR') || m.includes('cpsr') || m.includes('cpnp')) && (
      <p className="text-[10px] text-amber-300 mt-1">→ Joignez CPSR + notification CPNP + attestation Personne Responsable au dossier fournisseur vérifié, ou basculez ce SKU vers une source UE dont le dossier est effectivement disponible.</p>
    )}
  </div>
)}
{readinessMap[product.id]?.ready && product.catalogStatus !== 'published' && (
  <p className="text-[10px] text-emerald-300 mt-1.5">✓ Prêt à publier — tous les contrôles (y compris CPNP/RP/CPSR si cosmétique) sont au vert.</p>
)}
</div></div><div className="flex flex-wrap items-center gap-2"><select value={product.catalogStatus || 'draft'} onChange={e => setStatus(product, e.target.value)} className="px-2 py-1.5 rounded-lg bg-kurla-espresso border border-kurla-cream/15 text-[11px]"><option value="draft">brouillon</option><option value="pending_review">à vérifier</option><option value="published">publier</option><option value="unavailable">indisponible</option></select><button onClick={() => loadReturnInsight(product.id)} disabled={insightLoading === product.id} className="px-3 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"><RefreshCw className={`w-3 h-3 ${insightLoading === product.id ? 'animate-spin' : ''}`} /> Retours</button><button onClick={() => setDraft(draftFromProduct(product))} className="px-3 py-1.5 rounded-lg bg-kurla-copper text-[11px] font-bold">Modifier</button><button onClick={() => openView360(String(product.id))} className="px-3 py-1.5 rounded-lg bg-kurla-ink border border-kurla-cream/15 text-[11px] font-bold text-kurla-cream/70 hover:border-kurla-copper/30">Vue 360</button></div></div><div className="flex flex-wrap gap-1.5 mt-3">{Object.entries(product.validation || {}).map(([check, status]) => <button key={check} onClick={() => status === 'verified' ? undefined : markValidation(product.id, check)} disabled={status === 'verified'} className={`px-2 py-1 rounded-lg text-[10px] border ${status === 'verified' ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10'}`}><span className="capitalize">{check}</span>: {String(status)}{status !== 'verified' && <Check className="inline w-3 h-3 ml-1" />}</button>)}</div>{returnInsights[product.id] && <div className="mt-3 p-3 rounded-xl border border-kurla-cream/10 bg-kurla-espresso space-y-2"><p className="text-[10px] uppercase tracking-wider text-kurla-amber font-bold">Intelligence des retours — interne</p><p className="text-[11px] text-kurla-cream/65">{returnInsights[product.id].totalReturns} retour(s) enregistré(s), dont {returnInsights[product.id].informativeReturns} avec une raison exploitable.</p>{returnInsights[product.id].topReasons.length > 0 && <ul className="space-y-1">{returnInsights[product.id].topReasons.map(reason => <li key={reason.reason} className="text-[11px] text-kurla-cream/60">• {reason.label} — {reason.count} signalement(s), {Math.round(reason.share * 100)} %</li>)}</ul>}{returnInsights[product.id].catalogAlert && <p className="text-[11px] text-amber-300 font-semibold">⚠ {returnInsights[product.id].catalogAlert}</p>}{returnInsights[product.id].archetypeHotspots.length > 0 && <p className="text-[11px] text-kurla-cream/55">Cohortes concernées : {returnInsights[product.id].archetypeHotspots.map(hotspot => hotspot.archetypeId).join(', ')}.</p>}{returnInsights[product.id].limitations.length > 0 && <ul className="space-y-0.5">{returnInsights[product.id].limitations.map((limitation, index) => <li key={index} className="text-[10px] text-kurla-cream/40">· {limitation}</li>)}</ul>}<p className="text-[10px] text-kurla-cream/35">Ces signaux sont réservés à l’équipe catalogue. Ils ne sont jamais affichés aux clientes.</p></div>}</div>)}</div>}</div>
      {sheetProduct && (
        <ProductSheet
          productId={sheetProduct}
          headers={headers}
          suppliers={suppliersRef.map((supplier: any) => ({ id: String(supplier.id), legalName: supplier.legalName, tradeName: supplier.tradeName }))}
          onOpenSupplier={supplierId => { setSheetProduct(null); setSheetSupplier(supplierId); }}
          onClose={() => setSheetProduct(null)}
        />
      )}
      {sheetSupplier && (
        <SupplierSheet
          supplierId={sheetSupplier}
          headers={headers}
          linkedProducts={products.filter((product: any) => String(product.supplierId || '') === String(sheetSupplier)).length}
          onClose={() => setSheetSupplier(null)}
        />
      )}
    </div>
  );
};
