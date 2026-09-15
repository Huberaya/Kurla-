/**
 * RECHERCHE GLOBALE UNIFIÉE (§24, mission 16/09/2026).
 *
 * Une seule requête traverse : catalogue, positions de fond, candidats
 * sourcing, fournisseurs. Taper « hyperpigmentation » doit ressortir les
 * fiches du catalogue ET les références identifiées en approvisionnement.
 *
 * Règle : on ne retourne que ce qui matche réellement — insensible aux
 * accents et à la casse, sur des champs nommés (le « pourquoi » du résultat
 * est affiché). Aucun résultat inventé, aucun flou sémantique.
 */

export type GlobalSearchHit = {
  kind: 'product' | 'position' | 'candidate' | 'supplier';
  id: string;
  name: string;
  detail: string | null;
  /** Champ(s) qui ont matché — affiché tel quel (« marque », « besoins »…). */
  matchedOn: string[];
};

export type GlobalSearchResult = {
  query: string;
  hits: GlobalSearchHit[];
  counts: { product: number; position: number; candidate: number; supplier: number };
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function includesNormalized(haystack: unknown, needle: string): boolean {
  if (haystack == null) return false;
  const text = Array.isArray(haystack) ? haystack.join(' ') : String(haystack);
  return normalize(text).includes(needle);
}

export function searchAcrossCatalog(
  query: string,
  args: {
    products?: any[];
    positions?: any[];
    candidates?: any[];
    prospects?: any[];
    suppliers?: any[];
  },
): GlobalSearchResult {
  const needle = normalize(query || '');
  const hits: GlobalSearchHit[] = [];
  if (needle.length < 2) {
    return { query, hits, counts: { product: 0, position: 0, candidate: 0, supplier: 0 } };
  }

  for (const product of args.products || []) {
    const matchedOn: string[] = [];
    if (includesNormalized(product?.name, needle)) matchedOn.push('nom');
    if (includesNormalized(product?.brand, needle)) matchedOn.push('marque');
    if (includesNormalized(product?.slug, needle)) matchedOn.push('SKU/slug');
    if (includesNormalized(product?.category, needle)) matchedOn.push('catégorie');
    if (includesNormalized(product?.needs, needle) || includesNormalized(product?.concerns, needle)) matchedOn.push('besoins');
    if (includesNormalized(product?.sourceSupplier, needle)) matchedOn.push('fournisseur');
    if (includesNormalized(product?.inci, needle)) matchedOn.push('INCI');
    if (matchedOn.length > 0) {
      hits.push({
        kind: 'product',
        id: String(product.id),
        name: String(product.name || product.id),
        detail: [product.brand, product.category, product.catalogStatus].filter(Boolean).join(' · ') || null,
        matchedOn,
      });
    }
  }

  for (const position of args.positions || []) {
    const matchedOn: string[] = [];
    if (includesNormalized(position?.produit, needle)) matchedOn.push('nom');
    if (includesNormalized(position?.marque, needle)) matchedOn.push('marque');
    if (includesNormalized(position?.fournisseur_canal, needle)) matchedOn.push('canal');
    if (matchedOn.length > 0) {
      hits.push({
        kind: 'position',
        id: `pos-${position?.sourcing_item_id ?? 'x'}-${position?.rang ?? position?.id}`,
        name: String(position?.produit || position?.id),
        detail: [position?.marque, position?.format, position?.fournisseur_canal].filter(Boolean).join(' · ') || null,
        matchedOn,
      });
    }
  }

  const prospectById = new Map((args.prospects || []).map(p => [String(p?.id), p]));
  for (const candidate of args.candidates || []) {
    const prospect = prospectById.get(String(candidate?.prospect_id));
    const matchedOn: string[] = [];
    if (includesNormalized(candidate?.product, needle)) matchedOn.push('nom');
    if (includesNormalized(candidate?.brand, needle)) matchedOn.push('marque');
    if (includesNormalized(candidate?.category, needle)) matchedOn.push('catégorie');
    if (prospect && includesNormalized(prospect?.name, needle)) matchedOn.push('fournisseur');
    if (matchedOn.length > 0) {
      hits.push({
        kind: 'candidate',
        id: String(candidate?.id),
        name: String(candidate?.product || candidate?.id),
        detail: [candidate?.brand, prospect?.name].filter(Boolean).join(' · ') || null,
        matchedOn,
      });
    }
  }

  for (const supplier of args.suppliers || []) {
    const matchedOn: string[] = [];
    if (includesNormalized(supplier?.legal_name, needle) || includesNormalized(supplier?.trade_name, needle)) matchedOn.push('nom');
    if (includesNormalized(supplier?.country, needle)) matchedOn.push('pays');
    if (includesNormalized(supplier?.supplier_type, needle)) matchedOn.push('type');
    if (matchedOn.length > 0) {
      hits.push({
        kind: 'supplier',
        id: String(supplier?.id),
        name: String(supplier?.legal_name || supplier?.trade_name || supplier?.id),
        detail: [supplier?.country, supplier?.contact_email].filter(Boolean).join(' · ') || null,
        matchedOn,
      });
    }
  }

  return {
    query,
    hits,
    counts: {
      product: hits.filter(h => h.kind === 'product').length,
      position: hits.filter(h => h.kind === 'position').length,
      candidate: hits.filter(h => h.kind === 'candidate').length,
      supplier: hits.filter(h => h.kind === 'supplier').length,
    },
  };
}
