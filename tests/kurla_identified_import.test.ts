/**
 * CHANTIER 13 — Import identifié (CSV / Excel / JSON → fond | candidats).
 *
 * Jamais `published`, jamais l'import catalogue Hair.
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  commitIdentifiedImport,
  fondItemIdForNeed,
  parseIdentifiedImportSource,
  parseIdentifiedXlsx,
  type IdentifiedFondWrite,
  type IdentifiedWriteSink,
} from '../src/lib/identifiedImport';
import {
  IDENTIFIED_WRITE_TABLES,
  parseIdentifiedImportText,
  planIdentifiedImport,
  importNeverPublishes,
} from '../src/lib/identifiedProducts';
import { WRITE_TARGET_BY_INTENT } from '../src/lib/productLifecycle';
import { serverDb } from '../src/lib/serverDb';

function crc32(buf: Buffer): number {
  let c = ~0 >>> 0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (~c) >>> 0;
}

function zipStore(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf8');
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const localFull = Buffer.concat([local, nameBuf, data]);
    locals.push(localFull);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBuf]));
    offset += localFull.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(centrals.length, 8);
  eocd.writeUInt16LE(centrals.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

function inlineCell(ref: string, text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<c r="${ref}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
}

function numCell(ref: string, value: number): string {
  return `<c r="${ref}" t="n"><v>${value}</v></c>`;
}

function buildInlineXlsx(rows: Array<Array<string | number>>): Buffer {
  const sheetRows = rows.map((row, i) => {
    const r = i + 1;
    const cells = row.map((value, col) => {
      const ref = `${String.fromCharCode(65 + col)}${r}`;
      return typeof value === 'number' ? numCell(ref, value) : inlineCell(ref, value);
    }).join('');
    return `<row r="${r}">${cells}</row>`;
  }).join('');
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  return zipStore({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Identifiés" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
  });
}

function memorySink(opts?: { items?: string[]; occupied?: Array<[string, number]> }): IdentifiedWriteSink & {
  fond: IdentifiedFondWrite[];
  candidates: Array<{ id: string; brand: string; product: string }>;
  products: unknown[];
} {
  const fond: IdentifiedFondWrite[] = [];
  const candidates: Array<{ id: string; brand: string; product: string }> = [];
  const occupiedRangs = new Map<string, Set<number>>();
  for (const [item, rang] of opts?.occupied || []) {
    const set = occupiedRangs.get(item) || new Set<number>();
    set.add(rang);
    occupiedRangs.set(item, set);
  }
  return {
    fond,
    candidates,
    products: [],
    existingItemIds: new Set(opts?.items || []),
    occupiedRangs,
    writeFond: (row) => { fond.push(row); },
    writeCandidate: (row) => {
      const created = { id: `pc-test-${candidates.length + 1}`, brand: row.brand, product: row.product };
      candidates.push(created);
      return created;
    },
  };
}

async function main(): Promise<void> {
  console.log('\n=== C13 Import identifié ===\n');

  // 1. CSV sans besoin → candidat
  {
    const drafts = parseIdentifiedImportText('marque,nom,besoin,canal\nC13Marque,Sérum test,,pharmacie');
    const plan = planIdentifiedImport(drafts, []);
    const sink = memorySink();
    const commit = await commitIdentifiedImport(plan, sink);
    assert.equal(commit.published, 0);
    assert.equal(commit.fondWritten, 0);
    assert.equal(commit.candidateWritten, 1);
    assert.equal(sink.candidates[0].product, 'Sérum test');
    assert.equal(sink.products.length, 0);
    console.log('  · CSV sans besoin → candidat, 0 publié');
  }

  // 2. Besoin 24 + item fond → position rang 1
  {
    const drafts = parseIdentifiedImportText('marque,nom,besoin\nC13Hydra,Crème profonde,24');
    const plan = planIdentifiedImport(drafts, []);
    assert.equal(plan.accepted[0].writeTarget, IDENTIFIED_WRITE_TABLES.coverage);
    const sink = memorySink({ items: [fondItemIdForNeed(24)] });
    const commit = await commitIdentifiedImport(plan, sink);
    assert.equal(commit.fondWritten, 1);
    assert.equal(sink.fond[0].sourcingItemId, 'fond-50-n24');
    assert.equal(sink.fond[0].rang, 1);
    assert.equal(sink.fond[0].prixConstateCents, null, 'pas de prix inventé');
    assert.equal(commit.published, 0);
    console.log('  · besoin 24 + item → fond rang 1, prix null');
  }

  // 3. Item absent → candidat (on n’invente pas sourcing_items)
  {
    const drafts = parseIdentifiedImportText('marque,nom,besoin\nC13Abs,Huile,24');
    const plan = planIdentifiedImport(drafts, []);
    const sink = memorySink({ items: [] });
    const commit = await commitIdentifiedImport(plan, sink);
    assert.equal(commit.fondWritten, 0);
    assert.equal(commit.candidateWritten, 1);
    assert.match(commit.fallbacks[0].reason, /absent/);
    console.log('  · item fond absent → candidat, pas d’item inventé');
  }

  // 4. Rangs 1–5 saturés → candidat
  {
    const drafts = parseIdentifiedImportText('marque,nom,besoin\nC13Sat,Sixième,24');
    const plan = planIdentifiedImport(drafts, []);
    const occupied: Array<[string, number]> = [1, 2, 3, 4, 5].map(r => ['fond-50-n24', r]);
    const sink = memorySink({ items: ['fond-50-n24'], occupied });
    const commit = await commitIdentifiedImport(plan, sink);
    assert.equal(commit.fondWritten, 0);
    assert.equal(commit.candidateWritten, 1);
    assert.match(commit.fallbacks[0].reason, /saturés/);
    console.log('  · 5 rangs occupés → candidat');
  }

  // 5. Doublon ignoré à l’écriture
  {
    const drafts = parseIdentifiedImportText('marque,nom\nC13Dup,Même crème\nC13Dup,Même crème');
    const plan = planIdentifiedImport(drafts, []);
    assert.ok(plan.accepted[1].duplicateOf);
    const sink = memorySink();
    const commit = await commitIdentifiedImport(plan, sink);
    assert.equal(commit.skippedDuplicates, 1);
    assert.equal(commit.candidateWritten, 1);
    console.log('  · doublon marque+nom ignoré');
  }

  // 6. published refusé, 0 écriture boutique
  {
    const drafts = parseIdentifiedImportText('marque,nom,cible\nC13Pub,Crème boutique,published');
    const plan = planIdentifiedImport(drafts, []);
    assert.equal(plan.wouldPublish, 1);
    assert.equal(importNeverPublishes(plan), false);
    const sink = memorySink();
    const commit = await commitIdentifiedImport(plan, sink);
    assert.equal(commit.written.length, 0);
    assert.equal(commit.published, 0);
    assert.equal(commit.rejected, 1);
    console.log('  · cible published refusée, 0 écrit');
  }

  // 7. Excel inlineStr
  {
    const xlsx = buildInlineXlsx([
      ['Marque', 'Produit', 'Besoin', 'Fournisseur / canal', 'Prix constaté (€)'],
      ['C13Xlsx', 'Gel nettoyant', 24, 'pharmacie', 12.5],
    ]);
    const drafts = parseIdentifiedXlsx(xlsx);
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0].brand, 'C13Xlsx');
    assert.equal(drafts[0].title, 'Gel nettoyant');
    assert.equal(drafts[0].documentedNeed, 24);
    assert.equal(drafts[0].priceEur, 12.5);
    const fromSource = parseIdentifiedImportSource({ xlsx, fileName: 'lot.xlsx' });
    assert.equal(fromSource[0].title, 'Gel nettoyant');
    console.log('  · .xlsx inlineStr + prix lu, pas inventé');
  }

  // 8. .xls refusé
  {
    let refused = false;
    try {
      parseIdentifiedImportSource({ fileName: 'vieux.xls', text: 'a,b' });
    } catch (error: any) {
      refused = /xlsx ou CSV/i.test(error.message);
    }
    assert.equal(refused, true);
    console.log('  · .xls binaire refusé nommément');
  }

  // 9. Fichier fond réel (250 lignes) — parse only
  {
    const file = path.join(process.cwd(), 'docs/sourcing/SOURCING_FOND_50_BESOINS_5_PRODUITS_2026-09-14.xlsx');
    const drafts = parseIdentifiedXlsx(readFileSync(file));
    assert.equal(drafts.length, 250, `attendu 250 positions, obtenu ${drafts.length}`);
    assert.equal(drafts[0].brand, 'CeraVe');
    assert.match(drafts[0].title, /lavante/i);
    assert.equal(drafts[0].documentedNeed, 1);
    assert.ok((drafts[0].priceEur || 0) > 0);
    const plan = planIdentifiedImport(drafts, []);
    assert.equal(plan.wouldPublish, 0);
    assert.equal(importNeverPublishes(plan), true);
    assert.ok(plan.accepted.every(row => row.writeTarget === IDENTIFIED_WRITE_TABLES.coverage));
    console.log('  · xlsx fond 250 lignes lu, 0 published');
  }

  // 10. Store mémoire : apply n’écrit pas products
  {
    const beforeProducts = serverDb.inMemoryProducts.length;
    await serverDb.createSourcingItem('admin-c13', {
      id: 'fond-50-n24',
      wave: 'fond-c13',
      title: 'Hydrater en profondeur',
      category: 'peau',
      rationale: 'Banc C13 — item déjà là, pas inventé à l’import.',
    });
    const unique = `C13Store-${Date.now()}`;
    const result = await serverDb.applyIdentifiedImport('admin-c13', {
      text: `marque,nom,besoin\n${unique},Crème store,24`,
      dryRun: false,
    });
    assert.equal(result.published, 0);
    assert.equal(result.fondWritten, 1);
    assert.equal(serverDb.inMemoryProducts.length, beforeProducts, 'aucune fiche products');
    const preview = await serverDb.applyIdentifiedImport('admin-c13', {
      text: `marque,nom,besoin\n${unique}-dry,Crème dry,24`,
      dryRun: true,
    });
    assert.equal(preview.dryRun, true);
    assert.equal(preview.imported, 0);
    assert.equal(preview.fondWritten, 0);
    console.log('  · store : fond écrit, products inchangé, dryRun n’écrit pas');
  }

  // 11. Cible C2 = C13
  assert.equal(WRITE_TARGET_BY_INTENT.import_identified, 'sourcing_fond_positions | sourcing_product_candidates');

  // 12. Route gardée, pas l’import Hair
  {
    const routes = readFileSync(path.join(process.cwd(), 'src/server/routes/prospects.ts'), 'utf8');
    const idxGuard = routes.indexOf("app.post('/api/admin/sourcing/identified-import'");
    const idxAdmin = routes.indexOf('requireAdmin', idxGuard);
    const idxApply = routes.indexOf('applyIdentifiedImport', idxGuard);
    assert.ok(idxGuard >= 0);
    assert.ok(idxAdmin > idxGuard && idxAdmin < idxApply, 'requireAdmin avant l’écriture');
    assert.equal(routes.includes('importCatalogRecords'), false);
    assert.equal(routes.includes("catalog/import/csv"), false);
    const panel = readFileSync(path.join(process.cwd(), 'src/components/IdentifiedProductsPanel.tsx'), 'utf8');
    assert.ok(panel.includes('/api/admin/sourcing/identified-import'));
    assert.equal(panel.includes('/api/admin/catalog/import/csv'), false);
    assert.equal(panel.includes('workspace === \'skin\' && <'), false);
    const storeSrc = readFileSync(path.join(process.cwd(), 'src/lib/db/identifiedImportStore.ts'), 'utf8');
    assert.equal(storeSrc.includes('from(\'products\')'), false);
    assert.equal(storeSrc.includes('importCatalog'), false);
    console.log('  · route requireAdmin, pas d’import Hair, parité panneau');
  }

  console.log('\n  C13 identifié : écriture fond/candidats, 0 publié.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
