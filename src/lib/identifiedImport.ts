/**
 * CHANTIER 13 — Import identifié (~500).
 *
 * CSV / Excel / JSON → `sourcing_fond_positions` (besoin 1–50, rang 1–5)
 * ou `sourcing_product_candidates`. Jamais `products`, jamais `published`.
 * Dédoublon marque+nom (C2). Excel lu sans PIM Hair et sans paquet xlsx.
 */
import { inflateRawSync } from 'node:zlib';

import {
  IDENTIFIED_WRITE_TABLES,
  draftsFromTabularRows,
  parseIdentifiedImportText,
  type IdentifiedImportDraft,
  type IdentifiedImportPlan,
} from './identifiedProducts';

export const IDENTIFIED_IMPORT_XLSX_LIMIT_BYTES = 4 * 1024 * 1024;

export function fondItemIdForNeed(need: number): string {
  return `fond-50-n${String(need).padStart(2, '0')}`;
}

export type IdentifiedImportSource = {
  text?: string;
  json?: unknown;
  xlsx?: Buffer | Uint8Array;
  xlsxBase64?: string;
  fileName?: string;
};

export type IdentifiedFondWrite = {
  sourcingItemId: string;
  rang: number;
  marque: string;
  produit: string;
  format: string | null;
  prixConstateCents: number | null;
  statutPrix: string;
  fournisseurCanal: string;
};

export type IdentifiedCandidateWrite = {
  brand: string;
  product: string;
  category: string;
  notes?: string;
  publicPriceCents?: number | null;
};

export type IdentifiedWriteSink = {
  existingItemIds: Set<string>;
  occupiedRangs: Map<string, Set<number>>;
  writeFond: (row: IdentifiedFondWrite) => Promise<void> | void;
  writeCandidate: (row: IdentifiedCandidateWrite) => Promise<{ id: string }> | { id: string };
};

export type IdentifiedImportWritten = {
  title: string;
  brand: string;
  table: 'sourcing_fond_positions' | 'sourcing_product_candidates';
  id: string;
  reason: string;
};

export type IdentifiedImportCommit = {
  written: IdentifiedImportWritten[];
  skippedDuplicates: number;
  rejected: number;
  fondWritten: number;
  candidateWritten: number;
  published: 0;
  fallbacks: Array<{ title: string; reason: string }>;
};

export type IdentifiedImportApplyResult = {
  dryRun: boolean;
  plan: IdentifiedImportPlan;
  commit: IdentifiedImportCommit | null;
  imported: number;
  skippedDuplicates: number;
  rejected: number;
  fondWritten: number;
  candidateWritten: number;
  published: 0;
};

function fileNameOf(source: IdentifiedImportSource): string {
  return String(source.fileName || '').trim();
}

function isLegacyXls(name: string): boolean {
  return /\.xls$/i.test(name) && !/\.xlsx$/i.test(name);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function u16(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

function u32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

/** ZIP minimal (store + deflate) — assez pour un .xlsx, pas un PIM. */
export function unzipXlsx(input: Buffer | Uint8Array): Map<string, Buffer> {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  let eocd = -1;
  const min = Math.max(0, buf.length - 22 - 65535);
  for (let p = buf.length - 22; p >= min; p -= 1) {
    if (buf[p] === 0x50 && buf[p + 1] === 0x4b && buf[p + 2] === 0x05 && buf[p + 3] === 0x06) {
      eocd = p;
      break;
    }
  }
  if (eocd < 0) throw new Error('Excel : archive ZIP illisible.');
  const entries = u16(buf, eocd + 10);
  let p = u32(buf, eocd + 16);
  const out = new Map<string, Buffer>();
  for (let n = 0; n < entries; n += 1) {
    if (p + 46 > buf.length || u32(buf, p) !== 0x02014b50) break;
    const method = u16(buf, p + 10);
    const compSize = u32(buf, p + 20);
    const nameLen = u16(buf, p + 28);
    const extraLen = u16(buf, p + 30);
    const commentLen = u16(buf, p + 32);
    const localOff = u32(buf, p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8').replace(/\\/g, '/');
    if (localOff + 30 > buf.length || u32(buf, localOff) !== 0x04034b50) {
      throw new Error(`Excel : entrée « ${name} » illisible.`);
    }
    const localNameLen = u16(buf, localOff + 26);
    const localExtra = u16(buf, localOff + 28);
    const dataStart = localOff + 30 + localNameLen + localExtra;
    const compressed = buf.slice(dataStart, dataStart + compSize);
    let data: Buffer;
    if (method === 0) data = compressed;
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`Excel : compression ${method} non lue (« ${name} »).`);
    out.set(name.replace(/^\//, ''), data);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function colIndexFromRef(ref: string): number {
  const letters = ref.replace(/\d/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const blocks = xml.match(/<si[\s>][\s\S]*?<\/si>/g) || [];
  for (const block of blocks) {
    const parts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => decodeXmlEntities(m[1]));
    out.push(parts.join(''));
  }
  return out;
}

function cellText(cellXml: string, strings: string[]): string {
  const type = /(?:\s|:)t="([^"]+)"/.exec(cellXml)?.[1] || '';
  if (type === 'inlineStr') {
    const parts = [...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => decodeXmlEntities(m[1]));
    return parts.join('');
  }
  const value = /<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1] ?? '';
  if (type === 's') {
    const index = Number(value);
    return Number.isInteger(index) && strings[index] != null ? strings[index] : '';
  }
  return decodeXmlEntities(value);
}

function sheetToRows(sheetXml: string, strings: string[]): string[][] {
  const rows: string[][] = [];
  const rowBlocks = sheetXml.match(/<row\b[\s\S]*?<\/row>/g) || [];
  for (const rowXml of rowBlocks) {
    const cells = rowXml.match(/<c\b[\s\S]*?<\/c>/g) || [];
    const line: string[] = [];
    for (const cellXml of cells) {
      const ref = /(?:\s|:)r="([A-Z]+\d+)"/.exec(cellXml)?.[1] || '';
      const col = ref ? colIndexFromRef(ref) : line.length;
      while (line.length < col) line.push('');
      line[col] = cellText(cellXml, strings);
    }
    if (line.some(cell => cell.trim())) rows.push(line);
  }
  return rows;
}

function firstSheetPath(files: Map<string, Buffer>): string {
  const workbook = files.get('xl/workbook.xml')?.toString('utf8') || '';
  const rels = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
  const rid = /<sheet\b[^>]*r:id="([^"]+)"/.exec(workbook)?.[1];
  if (rid && rels) {
    const rel = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)
      || new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`).exec(rels);
    if (rel) {
      let target = rel[1].replace(/^\//, '');
      if (!target.startsWith('xl/')) target = `xl/${target.replace(/^\.\//, '')}`;
      if (files.has(target)) return target;
    }
  }
  for (const name of files.keys()) {
    if (/^xl\/worksheets\/sheet1\.xml$/i.test(name)) return name;
  }
  throw new Error('Excel : aucune feuille lisible.');
}

export function parseIdentifiedXlsx(input: Buffer | Uint8Array): IdentifiedImportDraft[] {
  const files = unzipXlsx(input);
  const sheet = files.get(firstSheetPath(files));
  if (!sheet) throw new Error('Excel : feuille introuvable.');
  const strings = files.has('xl/sharedStrings.xml')
    ? sharedStrings(files.get('xl/sharedStrings.xml')!.toString('utf8'))
    : [];
  const rows = sheetToRows(sheet.toString('utf8'), strings);
  if (rows.length === 0) return [];
  return draftsFromTabularRows(rows);
}

export function parseIdentifiedImportSource(source: IdentifiedImportSource): IdentifiedImportDraft[] {
  const name = fileNameOf(source);
  if (isLegacyXls(name)) {
    throw new Error('Excel 97 (.xls) non lu — enregistrez en .xlsx ou CSV.');
  }
  if (source.xlsx || source.xlsxBase64) {
    const bytes = source.xlsx
      ? (Buffer.isBuffer(source.xlsx) ? source.xlsx : Buffer.from(source.xlsx))
      : Buffer.from(String(source.xlsxBase64 || ''), 'base64');
    if (bytes.length > IDENTIFIED_IMPORT_XLSX_LIMIT_BYTES) {
      throw new Error(`Excel trop volumineux (plafond ${IDENTIFIED_IMPORT_XLSX_LIMIT_BYTES} octets).`);
    }
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('Excel : le fichier n’est pas un .xlsx (ZIP).');
    }
    return parseIdentifiedXlsx(bytes);
  }
  if (source.json !== undefined) {
    const payload = typeof source.json === 'string' ? source.json : JSON.stringify(source.json);
    return parseIdentifiedImportText(payload);
  }
  return parseIdentifiedImportText(source.text || '');
}

function priceCents(priceEur: number | null | undefined): number | null {
  if (priceEur == null || !(priceEur > 0)) return null;
  return Math.round(priceEur * 100);
}

function nextRang(occupied: Set<number>, preferred: number | null | undefined): number | null {
  if (preferred != null && preferred >= 1 && preferred <= 5 && !occupied.has(preferred)) return preferred;
  for (const rang of [1, 2, 3, 4, 5]) {
    if (!occupied.has(rang)) return rang;
  }
  return null;
}

function candidatePayload(draft: IdentifiedImportDraft, extraNote?: string): IdentifiedCandidateWrite {
  const notes = [
    draft.ean ? `EAN ${draft.ean}` : '',
    draft.channelLabel ? `canal : ${draft.channelLabel}` : '',
    extraNote || '',
  ].filter(Boolean).join(' · ') || undefined;
  return {
    brand: draft.brand || 'à qualifier',
    product: draft.title,
    category: 'peau',
    notes,
    publicPriceCents: priceCents(draft.priceEur ?? null),
  };
}

function fondPayload(draft: IdentifiedImportDraft, sourcingItemId: string, rang: number): IdentifiedFondWrite {
  const cents = priceCents(draft.priceEur ?? null);
  return {
    sourcingItemId,
    rang,
    marque: draft.brand || 'à qualifier',
    produit: draft.title,
    format: draft.format || null,
    prixConstateCents: cents,
    statutPrix: cents != null ? 'saisi à l’import — à vérifier' : 'à vérifier (import identifié)',
    fournisseurCanal: draft.channelLabel || 'à qualifier (import identifié)',
  };
}

export async function commitIdentifiedImport(
  plan: IdentifiedImportPlan,
  sink: IdentifiedWriteSink,
): Promise<IdentifiedImportCommit> {
  const written: IdentifiedImportWritten[] = [];
  const fallbacks: IdentifiedImportCommit['fallbacks'] = [];
  let skippedDuplicates = 0;
  const occupied = new Map<string, Set<number>>();
  for (const [itemId, rangs] of sink.occupiedRangs) occupied.set(itemId, new Set(rangs));

  for (const row of plan.accepted) {
    if (row.duplicateOf) {
      skippedDuplicates += 1;
      continue;
    }
    const draft = row.draft;
    if (row.writeTarget === IDENTIFIED_WRITE_TABLES.coverage && draft.documentedNeed != null) {
      const itemId = fondItemIdForNeed(draft.documentedNeed);
      const itemExists = sink.existingItemIds.has(itemId);
      const used = occupied.get(itemId) || new Set<number>();
      const rang = itemExists ? nextRang(used, draft.rang ?? null) : null;
      if (itemExists && rang != null) {
        const payload = fondPayload(draft, itemId, rang);
        await sink.writeFond(payload);
        used.add(rang);
        occupied.set(itemId, used);
        written.push({
          title: draft.title,
          brand: draft.brand,
          table: IDENTIFIED_WRITE_TABLES.coverage,
          id: `pos-${itemId}-${rang}`,
          reason: `fond besoin ${draft.documentedNeed} rang ${rang}`,
        });
        continue;
      }
      const reason = !itemExists
        ? `besoin ${draft.documentedNeed} : item ${itemId} absent — écrit en candidat (pas de sourcing_items inventé)`
        : `besoin ${draft.documentedNeed} : rangs 1–5 saturés — écrit en candidat`;
      fallbacks.push({ title: draft.title, reason });
      const created = await sink.writeCandidate(candidatePayload(draft, reason));
      written.push({
        title: draft.title,
        brand: draft.brand,
        table: IDENTIFIED_WRITE_TABLES.candidate,
        id: created.id,
        reason,
      });
      continue;
    }
    const created = await sink.writeCandidate(candidatePayload(draft));
    written.push({
      title: draft.title,
      brand: draft.brand,
      table: IDENTIFIED_WRITE_TABLES.candidate,
      id: created.id,
      reason: 'sans besoin 1–50 → candidat',
    });
  }

  return {
    written,
    skippedDuplicates,
    rejected: plan.rejected.length,
    fondWritten: written.filter(row => row.table === IDENTIFIED_WRITE_TABLES.coverage).length,
    candidateWritten: written.filter(row => row.table === IDENTIFIED_WRITE_TABLES.candidate).length,
    published: 0,
    fallbacks,
  };
}

export function applyResultFromPlan(
  plan: IdentifiedImportPlan,
  commit: IdentifiedImportCommit | null,
  dryRun: boolean,
): IdentifiedImportApplyResult {
  return {
    dryRun,
    plan,
    commit,
    imported: commit?.written.length ?? 0,
    skippedDuplicates: commit?.skippedDuplicates ?? plan.accepted.filter(row => row.duplicateOf).length,
    rejected: plan.rejected.length,
    fondWritten: commit?.fondWritten ?? 0,
    candidateWritten: commit?.candidateWritten ?? 0,
    published: 0,
  };
}

