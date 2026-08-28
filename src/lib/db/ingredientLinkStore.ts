import { getSupabaseServerClient } from '../supabaseClient';
import { normalizeInciName, resolveIngredient } from '../ingredientGraph';
import type { IngredientLinkSource } from '../ingredientGraph';
import { getProductById } from './catalogStore';
import { ensureDatabaseSuccess } from './internal';

import { INGREDIENT_LINK_SOURCES } from '../ingredientGraph';

import type { Ingredient, ProductIngredientLink } from '../ingredientGraph';
import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 10 (bloc B1) — LIAISON PRODUIT × INGRÉDIENT.
 *
 * Constat vérifié avant d'écrire une ligne : `product_ingredients` était lu
 * partout (compliance, filtrage juridictionnel, score de confiance, texture
 * gap, note par archétype) et **écrit nulle part**. Le graphe n'était pas
 * incomplet, il était impossible à alimenter — d'où toutes les cellules en
 * « données insuffisantes ».
 *
 * Deux règles gouvernent cette couche :
 *
 *  1. **On ne devine jamais une correspondance.** Une mention déclarée qui ne
 *     correspond à aucune entité du référentiel est remontée comme
 *     `unmatched`, pas rattachée au hasard : une liaison fausse corrompt
 *     silencieusement toutes les statistiques en aval.
 *  2. **La provenance est portée par la ligne.** `source` distingue ce que la
 *     marque déclare (`declared`), ce qui vient de la liste INCI du produit
 *     (`inci_label`), ce que la marque a confirmé (`brand_confirmed`) et ce
 *     qui a été analysé (`lab_analysed`). Une composition « déclarée » n'a pas
 *     la même valeur qu'une composition analysée, et l'écran le dit.
 */

export interface IngredientLinkInput {
  /** Identifiant du référentiel, si l'opérateur le connaît déjà. */
  ingredientId?: unknown;
  /** Sinon, la mention telle que déclarée (« Beurre de Karité », « Glycerin »…). */
  declared?: unknown;
  inciRank?: unknown;
  declaredRole?: unknown;
  declaredConcentrationPercent?: unknown;
  isKeyIngredient?: unknown;
  source?: unknown;
}

export interface RejectedIngredient {
  declared: string;
  reason: string;
}

export interface IngredientLinkResult {
  productId: string;
  links: ProductIngredientLink[];
  rejected: RejectedIngredient[];
  /** Vrai seulement si aucune mention n'est restée sans correspondance. */
  complete: boolean;
}

function normalizeSource(value: unknown): IngredientLinkSource {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (INGREDIENT_LINK_SOURCES as readonly string[]).includes(raw) ? (raw as IngredientLinkSource) : 'declared';
}

function toRank(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 200 ? Math.trunc(parsed) : null;
}

function mapLinkRow(row: any): ProductIngredientLink {
  return {
    productId: row.product_id ?? row.productId,
    ingredientId: row.ingredient_id ?? row.ingredientId,
    inciRank: row.inci_rank ?? row.inciRank ?? null,
    declaredRole: row.declared_role ?? row.declaredRole ?? undefined,
    declaredConcentrationPercent: row.declared_concentration_percent ?? row.declaredConcentrationPercent ?? null,
    isKeyIngredient: Boolean(row.is_key_ingredient ?? row.isKeyIngredient),
    source: normalizeSource(row.source)
  };
}

function mapIngredientRow(row: any): Ingredient {
  return {
    id: row.id,
    inciName: row.inci_name ?? row.inciName ?? '',
    inciNameNormalized: row.inci_name_normalized ?? row.inciNameNormalized ?? normalizeInciName(row.inci_name ?? row.inciName),
    commonNames: Array.isArray(row.common_names) ? row.common_names : (Array.isArray(row.commonNames) ? row.commonNames : []),
    functions: Array.isArray(row.functions) ? row.functions : [],
    family: row.family ?? undefined,
    origin: row.origin ?? undefined,
    isFragrance: Boolean(row.is_fragrance ?? row.isFragrance),
    isAllergenRegulated: Boolean(row.is_allergen_regulated ?? row.isAllergenRegulated),
    comedogenicityIndex: row.comedogenicity_index ?? row.comedogenicityIndex ?? null,
    maxConcentrationEuPercent: row.max_concentration_eu_percent ?? row.maxConcentrationEuPercent ?? null,
    description: row.description ?? undefined,
    verificationStatus: row.verification_status ?? row.verificationStatus ?? 'not_provided'
  };
}

/** Le référentiel d'ingrédients : ce qui existe réellement, rien de plus. */
export async function getIngredientCatalog(store: SupabaseServerStore): Promise<Ingredient[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('ingredients').select('*');
    ensureDatabaseSuccess('lecture du référentiel d’ingrédients', error);
    return (data || []).map(mapIngredientRow);
  }
  return store.inMemoryIngredients.map(mapIngredientRow);
}

export async function getProductIngredientLinks(store: SupabaseServerStore, productId: string): Promise<ProductIngredientLink[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('product_ingredients').select('*').eq('product_id', productId).order('inci_rank', { ascending: true, nullsFirst: false });
    ensureDatabaseSuccess('lecture de la composition liée', error);
    return (data || []).map(mapLinkRow);
  }
  return store.inMemoryProductIngredients
    .filter(link => link.productId === productId)
    .sort((a, b) => (a.inciRank ?? Number.MAX_SAFE_INTEGER) - (b.inciRank ?? Number.MAX_SAFE_INTEGER));
}

/**
 * Rattache des ingrédients à un produit, à partir d'identifiants connus ou de
 * mentions déclarées. Ce qui ne correspond à rien est **rendu**, pas deviné.
 */
export async function attachProductIngredients(
  store: SupabaseServerStore,
  adminId: string,
  productId: string,
  items: IngredientLinkInput[]
): Promise<IngredientLinkResult> {
  const product = await getProductById(store, productId);
  if (!product) throw new Error('Produit introuvable.');
  if (!Array.isArray(items) || items.length === 0) throw new Error('Aucun ingrédient à rattacher.');

  const catalog = await getIngredientCatalog(store);
  const existing = await getProductIngredientLinks(store, productId);
  const links: ProductIngredientLink[] = [];
  const rejected: RejectedIngredient[] = [];

  for (const item of items) {
    const declaredLabel = typeof item?.declared === 'string' ? item.declared.trim() : '';
    const requestedId = typeof item?.ingredientId === 'string' ? item.ingredientId.trim() : '';

    let resolved: Ingredient | null = null;
    let reason = '';
    if (requestedId) {
      resolved = catalog.find(candidate => candidate.id === requestedId) ?? null;
      if (!resolved) reason = `Aucun ingrédient du référentiel ne porte l'identifiant « ${requestedId} ».`;
    } else if (declaredLabel) {
      resolved = resolveIngredient(declaredLabel, catalog);
      if (!resolved) reason = 'Aucune correspondance dans le référentiel — la mention n’est pas rattachée plutôt que devinée.';
    } else {
      reason = 'Renseignez `ingredientId` ou `declared`.';
    }

    if (!resolved) {
      rejected.push({ declared: declaredLabel || requestedId, reason });
      continue;
    }

    links.push({
      productId,
      ingredientId: resolved.id,
      inciRank: toRank(item?.inciRank),
      declaredRole: typeof item?.declaredRole === 'string' ? item.declaredRole.trim().slice(0, 160) : undefined,
      declaredConcentrationPercent: typeof item?.declaredConcentrationPercent === 'number' ? item.declaredConcentrationPercent : null,
      isKeyIngredient: item?.isKeyIngredient === true,
      source: normalizeSource(item?.source)
    });
  }

  await persistLinks(store, adminId, productId, links, existing);

  return { productId, links, rejected, complete: rejected.length === 0 && links.length > 0 };
}

/**
 * Alimente le graphe à partir de la liste déjà déclarée sur le produit
 * (`products.ingredients`). L'ordre déclaré est conservé comme rang INCI :
 * c'est l'ordre de concentration, et c'est ce que le score de confiance lit.
 */
export async function linkDeclaredIngredients(
  store: SupabaseServerStore,
  productId: string,
  source: IngredientLinkSource = 'declared'
): Promise<IngredientLinkResult> {
  const product = await getProductById(store, productId);
  if (!product) throw new Error('Produit introuvable.');

  const declared = Array.isArray(product.ingredients) ? product.ingredients.filter((name: unknown) => typeof name === 'string' && name.trim() !== '') : [];
  const catalog = await getIngredientCatalog(store);
  const existing = await getProductIngredientLinks(store, productId);
  const links: ProductIngredientLink[] = [];
  const rejected: RejectedIngredient[] = [];

  declared.forEach((name: string, index) => {
    const resolved = resolveIngredient(name, catalog);
    if (!resolved) {
      rejected.push({ declared: name, reason: 'Aucune correspondance dans le référentiel — à créer ou à corriger, jamais deviné.' });
      return;
    }
    links.push({
      productId,
      ingredientId: resolved.id,
      inciRank: index + 1,
      isKeyIngredient: index === 0,
      source
    });
  });

  await persistLinks(store, adminIdForSystem(store), productId, links, existing);

  return { productId, links, rejected, complete: rejected.length === 0 && links.length > 0 };
}

/**
 * Alimentation en lot : tous les produits dont la liste déclarée n'est pas
 * encore rattachée. Le rapport distingue ce qui est lié de ce qui reste à
 * traiter — un lot qui prétend tout avoir lié alors que la moitié des
 * mentions n'a pas de correspondance serait un mensonge opérationnel.
 */
export async function linkAllDeclaredIngredients(store: SupabaseServerStore): Promise<{
  productsScanned: number;
  productsLinked: number;
  linksCreated: number;
  unmatchedTotal: number;
  perProduct: Array<{ productId: string; linked: number; unmatched: string[] }>;
}> {
  const supabase = getSupabaseServerClient();
  let productIds: string[] = [];
  if (supabase) {
    const { data, error } = await supabase.from('products').select('id');
    ensureDatabaseSuccess('lecture des produits à relier', error);
    productIds = (data || []).map((row: any) => String(row.id));
  } else {
    productIds = store.inMemoryProducts.map((product: any) => String(product.id));
  }

  const perProduct: Array<{ productId: string; linked: number; unmatched: string[] }> = [];
  let linksCreated = 0;

  for (const productId of productIds) {
    const already = await getProductIngredientLinks(store, productId);
    if (already.length > 0) continue;
    const result = await linkDeclaredIngredients(store, productId);
    if (result.links.length === 0 && result.rejected.length === 0) continue;
    linksCreated += result.links.length;
    perProduct.push({ productId, linked: result.links.length, unmatched: result.rejected.map(item => item.declared) });
  }

  return {
    productsScanned: productIds.length,
    productsLinked: perProduct.filter(entry => entry.linked > 0).length,
    linksCreated,
    unmatchedTotal: perProduct.reduce((total, entry) => total + entry.unmatched.length, 0),
    perProduct
  };
}

/** Couverture réelle du graphe, sans arrondi optimiste. */
export async function getIngredientGraphCoverage(store: SupabaseServerStore): Promise<{
  generatedAt: string;
  products: number;
  productsWithLinkedIngredients: number;
  productsWithoutLinkedIngredients: number;
  links: number;
  ingredientsInCatalog: number;
  coveragePercent: number;
}> {
  const supabase = getSupabaseServerClient();
  let productIds: string[] = [];
  if (supabase) {
    const { data, error } = await supabase.from('products').select('id');
    ensureDatabaseSuccess('lecture des produits pour la couverture du graphe', error);
    productIds = (data || []).map((row: any) => String(row.id));
  } else {
    productIds = store.inMemoryProducts.map((product: any) => String(product.id));
  }

  const catalog = await getIngredientCatalog(store);
  let links = 0;
  let withIngredients = 0;
  for (const productId of productIds) {
    const count = (await getProductIngredientLinks(store, productId)).length;
    links += count;
    if (count > 0) withIngredients += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    products: productIds.length,
    productsWithLinkedIngredients: withIngredients,
    productsWithoutLinkedIngredients: productIds.length - withIngredients,
    links,
    ingredientsInCatalog: catalog.length,
    coveragePercent: productIds.length === 0 ? 0 : Math.round((withIngredients / productIds.length) * 100)
  };
}

/** Les liaisons ne sont pas écrasées aveugément : l'existant est préservé. */
async function persistLinks(
  store: SupabaseServerStore,
  adminId: string,
  productId: string,
  links: ProductIngredientLink[],
  existing: ProductIngredientLink[]
): Promise<void> {
  if (links.length === 0) return;
  const supabase = getSupabaseServerClient();

  for (const link of links) {
    const duplicate = existing.find(item => item.ingredientId === link.ingredientId);
    const merged: ProductIngredientLink = duplicate
      ? { ...duplicate, ...link, inciRank: link.inciRank ?? duplicate.inciRank ?? null }
      : link;

    if (supabase) {
      const { error } = await supabase.from('product_ingredients').upsert({
        product_id: productId,
        ingredient_id: merged.ingredientId,
        inci_rank: merged.inciRank ?? null,
        declared_role: merged.declaredRole ?? null,
        declared_concentration_percent: merged.declaredConcentrationPercent ?? null,
        is_key_ingredient: merged.isKeyIngredient,
        source: merged.source
      }, { onConflict: 'product_id,ingredient_id' });
      ensureDatabaseSuccess('enregistrement de la liaison produit × ingrédient', error);
    }

    const memoryIndex = store.inMemoryProductIngredients.findIndex(item => item.productId === productId && item.ingredientId === merged.ingredientId);
    if (memoryIndex >= 0) store.inMemoryProductIngredients[memoryIndex] = merged;
    else store.inMemoryProductIngredients.push(merged);
  }

  if (supabase) {
    // La composition est désormais reliée au référentiel : le statut de
    // vérification des ingrédients du produit passe de « non fourni » à
    // « déclaré », sans prétendre à une vérification qui n'a pas eu lieu.
    const { data } = await supabase.from('products').select('ingredient_verification_status').eq('id', productId).maybeSingle();
    if (data && data.ingredient_verification_status === 'not_provided') {
      await supabase.from('products').update({ ingredient_verification_status: 'pending', last_catalog_updated_at: new Date().toISOString() }).eq('id', productId).then(() => undefined, () => undefined);
    }
  } else {
    const product = store.inMemoryProducts.find((item: any) => item.id === productId);
    if (product && product.ingredient_verification_status === 'not_provided') product.ingredient_verification_status = 'pending';
  }

  void adminId;
}

/**
 * Les liaisons automatiques ne sont pas une action d'administration nommée :
 * elles portent l'origine système plutôt qu'un identifiant inventé.
 */
function adminIdForSystem(_store: SupabaseServerStore): string {
  return 'system:ingredient-linker';
}
