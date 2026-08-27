export const CATALOG_CATEGORIES = [
  { slug: 'cheveux_ondules', department: 'cheveux', label: 'Cheveux ondulés' },
  { slug: 'cheveux_boucles', department: 'cheveux', label: 'Cheveux bouclés' },
  { slug: 'cheveux_frises', department: 'cheveux', label: 'Cheveux frisés' },
  { slug: 'cheveux_crepus', department: 'cheveux', label: 'Cheveux crépus' },
  { slug: 'locks', department: 'cheveux', label: 'Locks' },
  { slug: 'tresses', department: 'cheveux', label: 'Tresses' },
  { slug: 'extensions', department: 'cheveux', label: 'Extensions' },
  { slug: 'perruques', department: 'cheveux', label: 'Perruques' },
  { slug: 'cheveux_colores', department: 'cheveux', label: 'Cheveux colorés' },
  { slug: 'cheveux_defrises', department: 'cheveux', label: 'Cheveux défrisés' },
  { slug: 'barbe', department: 'cheveux', label: 'Barbe' },
  { slug: 'cuir_chevelu', department: 'cheveux', label: 'Cuir chevelu' },
  { slug: 'peau_seche', department: 'peau', label: 'Peau sèche' },
  { slug: 'peau_grasse', department: 'peau', label: 'Peau grasse' },
  { slug: 'peau_mixte', department: 'peau', label: 'Peau mixte' },
  { slug: 'peau_sensible', department: 'peau', label: 'Peau sensible' },
  { slug: 'imperfections', department: 'peau', label: 'Imperfections' },
  { slug: 'acne', department: 'peau', label: 'Acné' },
  { slug: 'taches', department: 'peau', label: 'Taches' },
  { slug: 'hyperpigmentation', department: 'peau', label: 'Hyperpigmentation' },
  { slug: 'cicatrices', department: 'peau', label: 'Cicatrices' },
  { slug: 'rasage', department: 'peau', label: 'Rasage' },
  { slug: 'poils_incarnes', department: 'peau', label: 'Poils incarnés' },
  { slug: 'protection_solaire', department: 'peau', label: 'Protection solaire' },
  { slug: 'corps', department: 'peau', label: 'Corps' },
  { slug: 'levres', department: 'peau', label: 'Lèvres' },
  { slug: 'mains', department: 'peau', label: 'Mains' },
  { slug: 'pieds', department: 'peau', label: 'Pieds' }
] as const;

export const CATALOG_AUDIENCES = [
  { slug: 'bebes', label: 'Bébés' },
  { slug: 'enfants', label: 'Enfants' },
  { slug: 'adolescents', label: 'Adolescents' },
  { slug: 'femmes', label: 'Femmes' },
  { slug: 'hommes', label: 'Hommes' },
  { slug: 'seniors', label: 'Seniors' },
  { slug: 'tous_publics', label: 'Tous publics' },
  { slug: 'professionnels', label: 'Professionnels' }
] as const;

export type CatalogRow = Record<string, string>;

function canonicalHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function detectDelimiter(header: string): ',' | ';' | '\t' {
  const counts = [',', ';', '\t'].map(delimiter => ({ delimiter, count: header.split(delimiter).length - 1 }));
  return counts.sort((a, b) => b.count - a.count)[0].delimiter as ',' | ';' | '\t';
}

function parseLine(line: string, delimiter: ',' | ';' | '\t'): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseCatalogCsv(csv: string): CatalogRow[] {
  if (typeof csv !== 'string' || !csv.trim()) throw new Error('Le fichier CSV est vide.');
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) throw new Error('Le CSV doit contenir une ligne d’en-têtes et au moins une ligne produit.');
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map(canonicalHeader);
  if (!headers.length || headers.some(header => !header)) throw new Error('En-têtes CSV invalides.');
  return lines.slice(1).map(line => {
    const cells = parseLine(line, delimiter);
    return headers.reduce<CatalogRow>((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
}

export function parseArrayCell(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseArrayCell(parsed);
    } catch {
      // Fall through to a conservative delimiter split; the row will still
      // remain unpublished until its facts are checked.
    }
  }
  return trimmed.split(/[|;]/).map(item => item.trim()).filter(Boolean);
}

export function parseJsonCell(value: unknown, fallback: unknown = []): unknown {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function firstValue(row: CatalogRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/** Convert the documented CSV vocabulary to the server's camelCase payload. */
export function catalogCsvRowToInput(row: CatalogRow): Record<string, unknown> {
  const input: Record<string, unknown> = {
    id: firstValue(row, 'id', 'product_id', 'reference'),
    slug: firstValue(row, 'slug', 'handle'),
    name: firstValue(row, 'name', 'nom', 'product_name'),
    brand: firstValue(row, 'brand', 'marque'),
    price: firstValue(row, 'price', 'prix'),
    originalPrice: firstValue(row, 'original_price', 'prix_avant'),
    promotionPrice: firstValue(row, 'promotion_price', 'prix_promotion'),
    promotionStartsAt: firstValue(row, 'promotion_starts_at', 'promotion_debut'),
    promotionEndsAt: firstValue(row, 'promotion_ends_at', 'promotion_fin'),
    vatRate: firstValue(row, 'vat_rate', 'tva', 'tva_rate'),
    priceIncludesVat: firstValue(row, 'price_includes_vat', 'prix_ttc'),
    category: firstValue(row, 'category', 'departement', 'department'),
    subCategory: firstValue(row, 'subcategory', 'sub_category', 'sous_categorie'),
    catalogCategoryTags: parseArrayCell(firstValue(row, 'catalog_category_tags', 'categories', 'category_tags')),
    targetAudiences: parseArrayCell(firstValue(row, 'target_audiences', 'audiences', 'publics')),
    description: firstValue(row, 'description'),
    image: firstValue(row, 'image', 'image_url', 'hero_image'),
    images: parseJsonCell(firstValue(row, 'images', 'gallery_images'), []),
    ingredients: parseArrayCell(firstValue(row, 'ingredients', 'composition', 'key_ingredients')),
    inci: firstValue(row, 'inci'),
    warnings: parseArrayCell(firstValue(row, 'warnings', 'avertissements')),
    certifications: parseJsonCell(firstValue(row, 'certifications'), []),
    countryAvailability: parseArrayCell(firstValue(row, 'country_availability', 'countries', 'pays_disponibilite')),
    isActive: firstValue(row, 'is_active', 'active') || undefined,
    isPromo: firstValue(row, 'is_promo', 'promotion') || undefined,
    sourceSupplier: firstValue(row, 'source_supplier', 'supplier', 'fournisseur'),
    supplierSku: firstValue(row, 'supplier_sku', 'supplier_reference', 'reference_fournisseur'),
    stockQuantity: firstValue(row, 'stock_quantity', 'stock', 'quantite_stock'),
    inStock: firstValue(row, 'in_stock', 'disponible'),
    variants: parseJsonCell(firstValue(row, 'variants', 'variantes'), [])
  };
  return input;
}

export function parseBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return defaultValue;
  return ['true', '1', 'yes', 'oui', 'y'].includes(value.trim().toLowerCase());
}
