/**
 * CHANTIER 2 — Produits identifiés (hors boutique).
 *
 * Population : `sourcing_fond_positions` + `sourcing_product_candidates`
 * encore au stade `identified`. Jamais une fiche `products` publiée.
 * L'import 500 (chantier 13) écrira ici ; ce module en fige la **cible**
 * et la prévisualisation. Aucune ligne n'atterrit en `published`.
 */

import { DOCUMENTED_SKIN_NEEDS, documentedNeed, skinNeedForDocumentedNeed } from './skinNeedMapping';
import {
  CANONICAL_TABLES,
  WRITE_TARGET_BY_INTENT,
  identifiedDedupKey,
  parseConsolidatedPositionId,
  unifyCandidate,
  unifyFondPosition,
  type UnifiedRecord,
} from './productLifecycle';
import type { SkinNeed } from './skinTaxonomy';

export const IDENTIFIED_IMPORT_LIMIT = 1000;

export const IDENTIFIED_WRITE_TABLES = {
  coverage: CANONICAL_TABLES.identifiedCoverage,
  candidate: CANONICAL_TABLES.identifiedCandidate,
} as const;

export type IdentifiedKind = 'fond_position' | 'candidate';

export type IdentifiedFilters = {
  search?: string;
  kind?: IdentifiedKind | 'all';
  documentedNeed?: number | null;
  skinNeed?: SkinNeed | 'none' | 'all';
  unresolvedSupplier?: boolean;
};

export type IdentifiedCounts = {
  total: number;
  fond: number;
  candidate: number;
  withDocumentedNeed: number;
  withoutBoutiqueNeed: number;
  unresolvedSupplier: number;
  duplicateGroups: number;
};

export function isIdentifiedRecord(record: UnifiedRecord): boolean {
  if (record.lifecycle.stage !== 'identified') return false;
  if (record.lifecycle.isPublic) return false;
  return record.kind === 'fond_position' || record.kind === 'candidate';
}

export function selectIdentified(records: UnifiedRecord[]): UnifiedRecord[] {
  return records.filter(isIdentifiedRecord);
}

export function filterIdentified(records: UnifiedRecord[], filters: IdentifiedFilters = {}): UnifiedRecord[] {
  const search = (filters.search || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return records.filter(record => {
    if (filters.kind && filters.kind !== 'all' && record.kind !== filters.kind) return false;
    if (typeof filters.documentedNeed === 'number' && record.documentedNeed !== filters.documentedNeed) return false;
    if (filters.skinNeed && filters.skinNeed !== 'all') {
      if (filters.skinNeed === 'none') {
        if (record.skinNeed != null) return false;
      } else if (record.skinNeed !== filters.skinNeed) {
        return false;
      }
    }
    if (filters.unresolvedSupplier === true && record.supplierId) return false;
    if (search) {
      const hay = `${record.title} ${record.brand || ''} ${record.unresolvedSupplierLabel || ''} ${record.uid}`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

export function duplicateGroups(records: UnifiedRecord[]): Array<{ key: string; records: UnifiedRecord[] }> {
  const map = new Map<string, UnifiedRecord[]>();
  for (const record of records) {
    const key = identifiedDedupKey(record.brand, record.title);
    if (!key || key === '|') continue;
    const list = map.get(key) || [];
    list.push(record);
    map.set(key, list);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ key, records: list }));
}

export function countIdentified(records: UnifiedRecord[]): IdentifiedCounts {
  const identified = selectIdentified(records);
  return {
    total: identified.length,
    fond: identified.filter(record => record.kind === 'fond_position').length,
    candidate: identified.filter(record => record.kind === 'candidate').length,
    withDocumentedNeed: identified.filter(record => record.documentedNeed != null).length,
    withoutBoutiqueNeed: identified.filter(record => record.skinNeed == null).length,
    unresolvedSupplier: identified.filter(record => !record.supplierId).length,
    duplicateGroups: duplicateGroups(identified).length,
  };
}

type ConsolidatedLike = {
  kind?: string;
  id?: string;
  name?: string;
  brand?: string | null;
  priceEur?: number | null;
  supplierName?: string | null;
  linkedProductId?: string | null;
};

/**
 * Unifie le consolidé **sans** les fiches catalogue : un produit `products`
 * n'est plus un identifié. Un candidat déjà lié à une fiche sort du stade.
 */
export function identifiedFromConsolidated(rows: ConsolidatedLike[]): UnifiedRecord[] {
  const unified: UnifiedRecord[] = [];
  for (const row of rows || []) {
    if (row.kind === 'position') {
      const parsed = parseConsolidatedPositionId(String(row.id || ''));
      unified.push(unifyFondPosition({
        sourcingItemId: parsed.sourcingItemId,
        rang: parsed.rang ?? undefined,
        produit: row.name,
        marque: row.brand || undefined,
        priceEur: row.priceEur,
        fournisseur_canal: row.supplierName || undefined,
      }));
      continue;
    }
    if (row.kind === 'candidate') {
      unified.push(unifyCandidate({
        id: row.id,
        product: row.name,
        brand: row.brand || undefined,
        supplierName: row.supplierName,
        priceEur: row.priceEur,
        draft_product_id: row.linkedProductId,
      }));
    }
  }
  return selectIdentified(unified);
}

export type IdentifiedImportDraft = {
  brand: string;
  title: string;
  documentedNeed: number | null;
  channelLabel: string | null;
  ean: string | null;
  /** Présent seulement si le fichier le demande — alors on refuse. */
  forbiddenTarget?: string | null;
};

export type IdentifiedImportDecision = {
  draft: IdentifiedImportDraft;
  writeTarget: typeof IDENTIFIED_WRITE_TABLES[keyof typeof IDENTIFIED_WRITE_TABLES];
  dedupKey: string;
  duplicateOf: string | null;
  skinNeed: SkinNeed | null;
};

export type IdentifiedImportPlan = {
  accepted: IdentifiedImportDecision[];
  rejected: Array<{ draft: IdentifiedImportDraft; reason: string }>;
  wouldPublish: number;
};

function cell(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function needNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : null;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
      continue;
    }
    if ((ch === ',' || ch === ';') && !quoted) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function draftFromObject(raw: Record<string, unknown>): IdentifiedImportDraft {
  const forbidden = cell(raw.catalog_status || raw.catalogStatus || raw.target || raw.table || '');
  return {
    brand: cell(raw.brand || raw.marque),
    title: cell(raw.title || raw.name || raw.produit || raw.product),
    documentedNeed: needNumber(raw.need || raw.documentedNeed || raw.besoin),
    channelLabel: cell(raw.channel || raw.fournisseur || raw.fournisseur_canal) || null,
    ean: cell(raw.ean || raw.barcode) || null,
    forbiddenTarget: forbidden || null,
  };
}

export function parseIdentifiedImportText(raw: string): IdentifiedImportDraft[] {
  const text = String(raw || '').trim();
  if (!text) return [];
  if (text.startsWith('[') || text.startsWith('{')) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.rows || parsed.products || parsed.identified;
    if (!Array.isArray(rows)) throw new Error('JSON : tableau d’identifiés attendu.');
    return rows.slice(0, IDENTIFIED_IMPORT_LIMIT).map((row) => draftFromObject(row && typeof row === 'object' ? row as Record<string, unknown> : {}));
  }
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/^\ufeff/, ''));
  const looksLikeHeader = header.some(h => ['brand', 'marque', 'name', 'produit', 'product', 'title', 'need', 'besoin'].includes(h));
  const start = looksLikeHeader ? 1 : 0;
  const idx = (aliases: string[]) => header.findIndex(h => aliases.includes(h));
  const iBrand = looksLikeHeader ? idx(['brand', 'marque']) : 0;
  const iTitle = looksLikeHeader ? idx(['name', 'title', 'produit', 'product', 'nom']) : 1;
  const iNeed = looksLikeHeader ? idx(['need', 'besoin', 'documentedneed']) : 2;
  const iChannel = looksLikeHeader ? idx(['channel', 'fournisseur', 'fournisseur_canal', 'canal']) : 3;
  const iEan = looksLikeHeader ? idx(['ean', 'barcode', 'gtin']) : 4;
  const iStatus = looksLikeHeader ? idx(['catalog_status', 'catalogstatus', 'status', 'cible', 'target', 'table']) : -1;
  return lines.slice(start, start + IDENTIFIED_IMPORT_LIMIT).map((line) => {
    const cols = splitCsvLine(line);
    const at = (i: number) => (i >= 0 ? cols[i] || '' : '');
    return {
      brand: at(iBrand),
      title: at(iTitle),
      documentedNeed: needNumber(at(iNeed)),
      channelLabel: at(iChannel) || null,
      ean: at(iEan) || null,
      forbiddenTarget: iStatus >= 0 ? at(iStatus) || null : null,
    };
  });
}

const FORBIDDEN_PUBLISH = /^(published|publie|boutique|products|catalogue|catalog)$/i;

export function planIdentifiedImport(
  drafts: IdentifiedImportDraft[],
  existing: UnifiedRecord[],
): IdentifiedImportPlan {
  const existingKeys = new Map<string, string>();
  for (const record of selectIdentified(existing)) {
    existingKeys.set(identifiedDedupKey(record.brand, record.title), record.uid);
  }
  const seenInFile = new Map<string, string>();
  const accepted: IdentifiedImportDecision[] = [];
  const rejected: IdentifiedImportPlan['rejected'] = [];
  let wouldPublish = 0;

  for (const draft of drafts) {
    const forbidden = cell(draft.forbiddenTarget);
    if (forbidden && FORBIDDEN_PUBLISH.test(forbidden)) {
      wouldPublish += 1;
      rejected.push({ draft, reason: `cible interdite « ${forbidden} » — l’import identifié n’écrit jamais ${WRITE_TARGET_BY_INTENT.publish}` });
      continue;
    }
    if (!draft.title) {
      rejected.push({ draft, reason: 'nom de produit manquant' });
      continue;
    }
    if (draft.documentedNeed != null && !documentedNeed(draft.documentedNeed)) {
      rejected.push({ draft, reason: `besoin ${draft.documentedNeed} hors des 50 documentés` });
      continue;
    }
    const key = identifiedDedupKey(draft.brand, draft.title);
    const duplicateOf = existingKeys.get(key) || seenInFile.get(key) || null;
    const writeTarget = draft.documentedNeed != null
      ? IDENTIFIED_WRITE_TABLES.coverage
      : IDENTIFIED_WRITE_TABLES.candidate;
    accepted.push({
      draft,
      writeTarget,
      dedupKey: key,
      duplicateOf,
      skinNeed: draft.documentedNeed != null ? skinNeedForDocumentedNeed(draft.documentedNeed) : null,
    });
    if (!seenInFile.has(key)) seenInFile.set(key, `file:${draft.brand}|${draft.title}`);
  }

  return { accepted, rejected, wouldPublish };
}

export function importNeverPublishes(plan: IdentifiedImportPlan): boolean {
  if (plan.wouldPublish > 0) return false;
  return plan.accepted.every(row =>
    row.writeTarget === IDENTIFIED_WRITE_TABLES.coverage
    || row.writeTarget === IDENTIFIED_WRITE_TABLES.candidate
  );
}

export const DOCUMENTED_NEED_OPTIONS = DOCUMENTED_SKIN_NEEDS.map(need => ({
  number: need.number,
  title: need.title,
  skinNeed: need.skinNeed,
}));
