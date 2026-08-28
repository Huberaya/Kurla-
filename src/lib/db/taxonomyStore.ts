import { PRODUCT_VOCABULARY_FIELDS, TAXONOMY_REFERENCE, TAXONOMY_TERMS } from '../taxonomyReference';
import { getSupabaseServerClient } from '../supabaseClient';
import { ensureDatabaseSuccess } from './internal';

import type { SupabaseServerStore } from '../serverDb';

/**
 * CHANTIER 10 (bloc B3) — VOCABULAIRES CONTRÔLÉS APPLIQUÉS À L'ÉCRITURE.
 *
 * Les termes de référence existent en base depuis `20260847` (5 taxonomies,
 * 50 termes), mais rien ne les faisait respecter : `concerns`, `hair_types` et
 * `needs` restaient des chaînes libres. Un vocabulaire que personne n'applique
 * n'est pas un vocabulaire, c'est une liste de souhaits — et sans codes
 * stables, aucune agrégation par besoin n'est fiable.
 *
 * Trois règles :
 *  1. **Un code inconnu est refusé**, pas silently conservé : c'est le seul
 *     moyen d'empêcher la dérive de repartir.
 *  2. **Un synonyme déclaré est résolu vers son code canonique** et la
 *     résolution est signalée — la dérive `cuir_chevelu` /
 *     `apaiser_cuir_chevelu` devient visible au lieu d'être masquée.
 *  3. **Si le vocabulaire n'est pas chargé, on ne bloque pas l'écriture** : on
 *     le dit (`vocabularyLoaded: false`). Refuser d'écrire parce qu'une
 *     référence manque produirait une panne là où il n'y a qu'une lacune.
 */

export interface TaxonomyTerm {
  id: string;
  taxonomy: string;
  code: string;
  labelFr: string;
  labelEn: string;
  synonyms: string[];
  sortOrder: number;
}

export interface VocabularyCheck {
  /** Faux si au moins une valeur est hors vocabulaire. */
  valid: boolean;
  /** Faux si la référence n'a pas pu être lue : dans ce cas rien n'est refusé. */
  vocabularyLoaded: boolean;
  values: Record<string, string[]>;
  resolvedFromSynonym: Array<{ field: string; from: string; to: string }>;
  unknown: Array<{ field: string; value: string; taxonomy: string }>;
}

function normalizeCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function getTaxonomies(store: SupabaseServerStore): Promise<Array<{ id: string; label: string; description: string }>> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from('kurla_taxonomies').select('id, label, description');
    ensureDatabaseSuccess('lecture des taxonomies', error);
    if (Array.isArray(data) && data.length > 0) return data as never;
  }
  if (store.inMemoryTaxonomies.length > 0) return store.inMemoryTaxonomies;
  return TAXONOMY_REFERENCE.map(item => ({ ...item }));
}

export async function getTaxonomyTerms(store: SupabaseServerStore, taxonomyId?: string): Promise<TaxonomyTerm[]> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    let query = supabase.from('kurla_taxonomy_terms').select('id, taxonomy_id, code, label_fr, label_en, synonyms, sort_order').order('sort_order', { ascending: true });
    if (taxonomyId) query = query.eq('taxonomy_id', taxonomyId);
    const { data, error } = await query;
    ensureDatabaseSuccess('lecture des termes de vocabulaire', error);
    if (Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        taxonomy: row.taxonomy_id,
        code: row.code,
        labelFr: row.label_fr ?? '',
        labelEn: row.label_en ?? '',
        synonyms: Array.isArray(row.synonyms) ? row.synonyms : [],
        sortOrder: row.sort_order ?? 0
      }));
    }
  }
  const fromMemory = store.inMemoryTaxonomyTerms.length > 0 ? store.inMemoryTaxonomyTerms : TAXONOMY_TERMS;
  const terms = fromMemory.map((term: any) => ({
    id: term.id,
    taxonomy: term.taxonomy ?? term.taxonomy_id,
    code: term.code,
    labelFr: term.labelFr ?? term.label_fr ?? '',
    labelEn: term.labelEn ?? term.label_en ?? '',
    synonyms: Array.isArray(term.synonyms) ? term.synonyms : [],
    sortOrder: term.sortOrder ?? term.sort_order ?? 0
  })) as TaxonomyTerm[];
  return taxonomyId ? terms.filter(term => term.taxonomy === taxonomyId) : terms;
}

/**
 * Vérifie — et normalise — les valeurs de vocabulaire d'un produit.
 *
 * Retourne les valeurs à écrire (`values`), ce qui a été résolu depuis un
 * synonyme, et ce qui est hors vocabulaire. L'appelant décide : le chemin
 * d'écriture produit refuse, un audit se contente de compter.
 */
export async function checkProductVocabulary(store: SupabaseServerStore, input: Record<string, unknown>): Promise<VocabularyCheck> {
  const terms = await getTaxonomyTerms(store).catch(() => [] as TaxonomyTerm[]);
  const values: Record<string, string[]> = {};
  const resolvedFromSynonym: VocabularyCheck['resolvedFromSynonym'] = [];
  const unknown: VocabularyCheck['unknown'] = [];

  if (terms.length === 0) {
    return { valid: true, vocabularyLoaded: false, values, resolvedFromSynonym, unknown };
  }

  const byTaxonomy = new Map<string, TaxonomyTerm[]>();
  for (const term of terms) {
    const list = byTaxonomy.get(term.taxonomy) ?? [];
    list.push(term);
    byTaxonomy.set(term.taxonomy, list);
  }

  for (const { field, taxonomy } of PRODUCT_VOCABULARY_FIELDS) {
    const raw = input?.[field];
    if (raw === undefined) continue;
    const entries = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() !== '' ? [raw] : []);
    const candidates = byTaxonomy.get(taxonomy) ?? [];
    const resolved: string[] = [];

    for (const entry of entries) {
      const needle = normalizeCode(entry);
      if (!needle) continue;

      const exact = candidates.find(term => normalizeCode(term.code) === needle);
      if (exact) {
        if (!resolved.includes(exact.code)) resolved.push(exact.code);
        continue;
      }

      const viaSynonym = candidates.find(term => term.synonyms.some(synonym => normalizeCode(synonym) === needle));
      if (viaSynonym) {
        resolvedFromSynonym.push({ field, from: String(entry), to: viaSynonym.code });
        if (!resolved.includes(viaSynonym.code)) resolved.push(viaSynonym.code);
        continue;
      }

      unknown.push({ field, value: String(entry), taxonomy });
    }

    if (entries.length > 0) values[field] = resolved;
  }

  return {
    valid: unknown.length === 0,
    vocabularyLoaded: true,
    values,
    resolvedFromSynonym,
    unknown
  };
}

/**
 * Audit du fonds existant : quelles valeurs écrites avant la règle sortent du
 * vocabulaire. Un audit qui ne nomme pas les produits concernés ne permet pas
 * de corriger — la liste est donc explicite.
 */
export async function getVocabularyAudit(store: SupabaseServerStore): Promise<{
  generatedAt: string;
  vocabularyLoaded: boolean;
  products: number;
  productsWithUnknownValues: number;
  unknownTotal: number;
  perProduct: Array<{ productId: string; title: string; unknown: Array<{ field: string; value: string; taxonomy: string }> }>;
}> {
  const supabase = getSupabaseServerClient();
  let rows: any[] = [];
  if (supabase) {
    const { data, error } = await supabase.from('products').select('id, title, concerns, hair_types, country_availability');
    ensureDatabaseSuccess('audit des vocabulaires produit', error);
    rows = data || [];
  } else {
    rows = store.inMemoryProducts;
  }

  const perProduct: Array<{ productId: string; title: string; unknown: Array<{ field: string; value: string; taxonomy: string }> }> = [];
  let unknownTotal = 0;
  let vocabularyLoaded = true;

  for (const row of rows) {
    const check = await checkProductVocabulary(store, {
      concerns: row.concerns,
      hairTypes: row.hair_types ?? row.hairTypes,
      countryAvailability: row.country_availability ?? row.countryAvailability
    });
    if (!check.vocabularyLoaded) vocabularyLoaded = false;
    if (check.unknown.length === 0) continue;
    unknownTotal += check.unknown.length;
    perProduct.push({
      productId: String(row.id),
      title: String(row.title || row.id),
      unknown: check.unknown
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    vocabularyLoaded,
    products: rows.length,
    productsWithUnknownValues: perProduct.length,
    unknownTotal,
    perProduct
  };
}
