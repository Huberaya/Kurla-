import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyseShelfConflicts } from '../src/lib/routineConflicts';
import { intelligenceStore } from '../src/lib/intelligenceStore';

const migration = await readFile(new URL('../supabase/migrations/20260921000000_skin_journal_shelf_inci.sql', import.meta.url), 'utf8');
const skinJournalRoute = await readFile(new URL('../src/server/routes/skinJournal.ts', import.meta.url), 'utf8');
const beautyRoute = await readFile(new URL('../src/server/routes/beautyProfile.ts', import.meta.url), 'utf8');
const journalPage = await readFile(new URL('../src/pages/SkinJournalPage.tsx', import.meta.url), 'utf8');
const shelfPage = await readFile(new URL('../src/pages/ShelfPage.tsx', import.meta.url), 'utf8');
const barcode = await readFile(new URL('../src/lib/barcodeLookup.ts', import.meta.url), 'utf8');

for (const column of ['ingredient_ids', 'inci_names', 'inci_source', 'inci_unresolved_count']) {
  assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`));
}
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.skin_journal_entries/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.skin_observance_days/);
assert.match(migration, /outcome_observations_scope_check/);
assert.match(migration, /shelf_item_id IS NOT NULL/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(skinJournalRoute, /\/api\/skin\/journal/);
assert.match(skinJournalRoute, /\/api\/skin\/observance/);
assert.match(beautyRoute, /photos\/:photoId\/url/);
assert.match(beautyRoute, /photos\/:photoId/);
assert.match(journalPage, /api\/skin\/journal/);
assert.match(journalPage, /photoFile/);
assert.match(journalPage, /api\/skin\/observance/);
assert.doesNotMatch(journalPage, /skin: \{ \.\.\.profile\.skin, journal: next/);
assert.match(shelfPage, /inciNames/);
assert.match(shelfPage, /open_beauty_facts/);
assert.match(shelfPage, /BarcodeDetector/);
assert.match(barcode, /ingredientTags/);

const userId = 'c6-c7-test-user';
await intelligenceStore.deleteIntelligenceData(userId);
const shelfItem = await intelligenceStore.addShelfItem(userId, {
  freeLabel: 'Produit scanné',
  status: 'in_use',
  routineStep: 'skin_treatment',
  ingredientIds: ['retinol']
});
const observation = await intelligenceStore.recordOutcome(userId, {
  shelfItemId: shelfItem.id,
  signal: 'more_hydration'
});
assert.equal(observation.shelfItemId, shelfItem.id, 'Un produit libre du Shelf doit pouvoir recevoir un outcome.');
assert.equal(observation.productId, undefined, 'Un outcome libre ne doit pas inventer un product_id catalogue.');

const partial = analyseShelfConflicts([
  {
    ...shelfItem,
    inciUnresolvedCount: 2
  }
], []);
assert.equal(partial.partiallyAnalysed.length, 1, 'Un INCI partiellement rattaché doit rester explicitement incomplet.');
assert.match(partial.message, /non rattachée|incomplète/);

await intelligenceStore.deleteIntelligenceData(userId);
console.log('✓ C6/C7 : journal privé, observance, outcomes Shelf libre, scan INCI et compatibilité incomplète protégés');
