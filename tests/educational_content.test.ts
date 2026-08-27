import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.KURLA_TEST_NO_SERVER = 'true';
const migration = readFileSync('supabase/migrations/20260843000000_educational_content_journal.sql', 'utf8');
const { serverDb } = await import('../src/lib/serverDb');

assert.match(migration, /content_type/);
assert.match(migration, /evidence_level/);
assert.match(migration, /translations/);
assert.match(migration, /Public read published educational content/);

await serverDb.initialize([]);
await serverDb.saveAdminEntity('admin-test', 'content', {
  title: 'Brouillon', slug: 'brouillon', content: 'Contenu en revue', status: 'draft'
});
assert.equal((await serverDb.getPublishedArticles()).length, 0, 'un brouillon ne doit pas être public');

await serverDb.saveAdminEntity('admin-test', 'content', {
  title: 'Guide cuir chevelu', slug: 'guide-cuir-chevelu', content: 'Contenu vérifié', status: 'published',
  contentType: 'guide', topic: 'scalp_health', language: 'fr', author: 'Équipe éditoriale',
  evidenceLevel: 'moderate',
  sources: [{ label: 'Référence éditoriale', url: 'https://example.org/reference' }],
  translations: { fr: { title: 'Guide cuir chevelu', content: 'Contenu vérifié' } }
});
const published = await serverDb.getPublishedArticles();
assert.equal(published.length, 1);
assert.equal(published[0].contentType, 'guide');
assert.equal(published[0].topic, 'scalp_health');
assert.equal(published[0].sources[0].label, 'Référence éditoriale');
assert.equal(published[0].evidenceLevel, 'moderate');

await assert.rejects(() => serverDb.saveAdminEntity('admin-test', 'content', {
  title: 'Publication incomplète', slug: 'publication-incomplete', content: 'Texte', status: 'published',
  contentType: 'article', topic: 'general', language: 'fr', author: 'Auteur'
}), /source/);

console.log('[PASS] Contenus éducatifs : brouillon masqué, publication documentée et métadonnées publiques vérifiées.');
