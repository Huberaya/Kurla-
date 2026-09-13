/**
 * Départements du catalogue.
 *
 * Deux règles, et elles ne sont pas décoratives :
 *
 *  1. **`accessoires` et `kits` ne sont PAS cosmétiques.** Ils sont exclus du
 *     CPNP par `isAccessoryProduct` / `requiresCosmeticCompliance`. Les
 *     rattacher par erreur à `COSMETIC_CATEGORIES` imposerait un dossier
 *     réglementaire à un peigne.
 *  2. **`enfants` et `hommes` sont des départements transverses**, pas des
 *     familles de produits : une routine enfant peut contenir un shampoing.
 *     Ils ne déclenchent donc rien par eux-mêmes — c'est la sous-catégorie qui
 *     décide.
 */
export const CATALOG_DEPARTMENTS = [
  { slug: 'cheveux', label: 'Cheveux', cosmetic: true },
  { slug: 'peau', label: 'Peau', cosmetic: true },
  { slug: 'maquillage', label: 'Maquillage', cosmetic: true },
  { slug: 'parfum', label: 'Parfum', cosmetic: true },
  { slug: 'hygiene', label: 'Hygiène & soin du corps', cosmetic: true },
  { slug: 'ongles', label: 'Ongles', cosmetic: true },
  { slug: 'accessoires', label: 'Accessoires & outils', cosmetic: false },
  { slug: 'kits', label: 'Kits & routines', cosmetic: false },
  { slug: 'enfants', label: 'Enfants', cosmetic: false },
  { slug: 'hommes', label: 'Hommes', cosmetic: false },
] as const;

export type CatalogDepartmentSlug = typeof CATALOG_DEPARTMENTS[number]['slug'];

/** Départements dont les produits relèvent du règlement cosmétique. */
export const COSMETIC_DEPARTMENTS: readonly string[] = CATALOG_DEPARTMENTS
  .filter(department => department.cosmetic)
  .map(department => department.slug);

/**
 * Normalise un département saisi. Retourne `null` si inconnu.
 *
 * Les deux motifs historiques sont conservés : « peau » et « cheveu »
 * apparaissent dans les imports CSV sous des formes variées (« Peau sèche »,
 * « cheveux crépus »…). Les nouveaux départements sont reconnus par leur slug,
 * avec ou sans accent.
 */
export function normalizeDepartment(raw: unknown): CatalogDepartmentSlug | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const exact = CATALOG_DEPARTMENTS.find(department => department.slug === key);
  if (exact) return exact.slug;
  if (key.includes('peau')) return 'peau';
  if (key.includes('cheveu')) return 'cheveux';
  if (key.includes('maquillage') || key.includes('makeup') || key.includes('make-up')) return 'maquillage';
  if (key.includes('parfum') || key.includes('fragrance') || key.includes('perfume')) return 'parfum';
  if (key.includes('hygiene') || key.includes('douche') || key.includes('savon') || key.includes('bain')) return 'hygiene';
  if (key.includes('ongle') || key.includes('nail') || key.includes('manucure')) return 'ongles';
  if (key.includes('accessoir') || key.includes('outil') || key.includes('textile')) return 'accessoires';
  if (key.includes('kit') || key.includes('routine')) return 'kits';
  if (key.includes('enfant') || key.includes('bebe') || key.includes('kid')) return 'enfants';
  if (key.includes('homme') || key.includes('barbe') || /(^|[^a-z])men([^a-z]|$)/.test(key)) return 'hommes';
  return null;
}

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
  // ── Maquillage : catégorie cosmétique au sens du règlement 1223/2009 ──
  { slug: 'teint', department: 'maquillage', label: 'Teint' },
  { slug: 'levres_maquillage', department: 'maquillage', label: 'Lèvres' },
  { slug: 'yeux_maquillage', department: 'maquillage', label: 'Yeux' },
  { slug: 'ongles_maquillage', department: 'maquillage', label: 'Ongles' },
  { slug: 'outils_maquillage', department: 'maquillage', label: 'Pinceaux & outils' },
  // ── Parfum ──
  { slug: 'eau_de_parfum', department: 'parfum', label: 'Eau de parfum' },
  { slug: 'eau_de_toilette', department: 'parfum', label: 'Eau de toilette' },
  { slug: 'brume_corporelle', department: 'parfum', label: 'Brume corporelle' },
  // ── Hygiène & soin du corps ──
  { slug: 'douche_bain', department: 'hygiene', label: 'Douche & bain' },
  { slug: 'savons', department: 'hygiene', label: 'Savons' },
  { slug: 'deodorants', department: 'hygiene', label: 'Déodorants' },
  { slug: 'soin_corps', department: 'hygiene', label: 'Soin du corps' },
  { slug: 'hygiene_intime', department: 'hygiene', label: 'Hygiène intime' },
  // ── Ongles ──
  { slug: 'vernis', department: 'ongles', label: 'Vernis' },
  { slug: 'soin_ongles', department: 'ongles', label: 'Soin des ongles' },
  { slug: 'outils_manucure', department: 'ongles', label: 'Outils manucure' },
  // ── Accessoires : NON cosmétique, exclu du CPNP ──
  { slug: 'peignes_brosses', department: 'accessoires', label: 'Peignes & brosses' },
  { slug: 'textile_nuit', department: 'accessoires', label: 'Textile de nuit' },
  { slug: 'sectionnement', department: 'accessoires', label: 'Sectionnement & pinces' },
  { slug: 'flacons', department: 'accessoires', label: 'Flacons & applicateurs' },
  { slug: 'electrique', department: 'accessoires', label: 'Appareils électriques' },
  // ── Kits : assemblages, conformité héritée des composants ──
  { slug: 'kit_entry', department: 'kits', label: 'Kit découverte' },
  { slug: 'kit_core', department: 'kits', label: 'Kit essentiel' },
  { slug: 'kit_premium', department: 'kits', label: 'Kit complet' },
  // ── Transverses : la sous-catégorie décide, pas le département ──
  { slug: 'routine_enfant', department: 'enfants', label: 'Routine enfant' },
  { slug: 'routine_bebe', department: 'enfants', label: 'Routine bébé' },
  { slug: 'rasage_barbe', department: 'hommes', label: 'Rasage & barbe' },
  { slug: 'soin_homme', department: 'hommes', label: 'Soin homme' },
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
    imageOwnershipStatus: firstValue(row, 'image_ownership_status', 'image_rights', 'droits_image'),
    images: parseJsonCell(firstValue(row, 'images', 'gallery_images'), []),
    ingredients: parseArrayCell(firstValue(row, 'ingredients', 'composition', 'key_ingredients')),
    inci: firstValue(row, 'inci'),
    warnings: parseArrayCell(firstValue(row, 'warnings', 'avertissements')),
    skinTypes: parseArrayCell(firstValue(row, 'skin_types', 'types_peau')),
    skinConcerns: parseArrayCell(firstValue(row, 'skin_concerns', 'preoccupations_peau')),
    skinObjectives: parseArrayCell(firstValue(row, 'skin_objectives', 'objectifs_peau')),
    skinTaxonomyVersion: firstValue(row, 'skin_taxonomy_version', 'version_taxonomie_peau'),
    skinTextureCode: firstValue(row, 'skin_texture_code', 'texture_code_peau'),
    skinFinishCode: firstValue(row, 'skin_finish_code', 'fini_code_peau'),
    supportedPhototypes: parseArrayCell(firstValue(row, 'skin_supported_phototypes', 'phototypes_compatibles')),
    activeIngredients: parseJsonCell(firstValue(row, 'active_ingredients', 'actifs_concentrations'), []),
    activeConcentrationsStatus: firstValue(row, 'active_concentrations_status', 'verification_concentrations'),
    finish: firstValue(row, 'finish', 'skin_finish', 'fini'),
    spfUvaEvidenceStatus: firstValue(row, 'spf_uva_evidence_status', 'verification_spf_uva'),
    photoprotectionEvidenceStatus: firstValue(row, 'photoprotection_evidence_status', 'verification_photoprotection'),
    whitecastRisk: firstValue(row, 'whitecast_risk', 'risque_whitecast'),
    whitecastTestStatus: firstValue(row, 'whitecast_test_status', 'verification_whitecast'),
    testedPhototypes: parseArrayCell(firstValue(row, 'tested_phototypes', 'phototypes_testes')),
    testedLights: parseArrayCell(firstValue(row, 'tested_lights', 'lumiere_testee', 'lumieres_testees')),
    visibleLightTestStatus: firstValue(row, 'visible_light_test_status', 'verification_lumiere_visible'),
    visibleLightClaim: firstValue(row, 'visible_light_claim', 'revendication_lumiere_visible'),
    testedUndertones: parseArrayCell(firstValue(row, 'tested_undertones', 'sous_tons_testes')),
    undertoneEvidenceStatus: firstValue(row, 'undertone_evidence_status', 'verification_sous_tons'),
    inciVisibilityStatus: firstValue(row, 'inci_visibility_status', 'verification_inci'),
    manufacturingStatus: firstValue(row, 'manufacturing_status', 'verification_fabrication_gmp'),
    lotReference: firstValue(row, 'lot_reference', 'lot'),
    bestBeforeOrPao: firstValue(row, 'best_before_or_pao', 'ddm_pao'),
    isTinted: firstValue(row, 'is_tinted', 'teinte') || undefined,
    certifications: parseJsonCell(firstValue(row, 'certifications'), []),
    countryAvailability: parseArrayCell(firstValue(row, 'country_availability', 'countries', 'pays_disponibilite')),
    sizeLabel: firstValue(row, 'size_label', 'format', 'contenance'),
    returnsPolicy: firstValue(row, 'returns_policy', 'returns', 'retours'),
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
