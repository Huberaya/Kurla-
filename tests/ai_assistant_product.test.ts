import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serverDb } from '../src/lib/serverDb';
import { MOCK_PRODUCTS } from '../src/data/mockData';
import { KURLA_KNOWLEDGE_BASE, selectKnowledgeCards } from '../src/lib/ai/knowledgeBase';

async function run() {
  await serverDb.initialize(MOCK_PRODUCTS);
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';

  await assert.rejects(
    () => serverDb.createAiSession(owner, 'test', 'fr', 'FR', false),
    /consentement explicite/
  );

  const session = await serverDb.createAiSession(owner, 'routine cheveux', 'fr', 'FR', true, 'réduire la casse');
  assert.equal(session.memoryConsent, true);
  const userMessage = await serverDb.addAiMessage(session.id, 'user', 'Comment réduire la casse ?', {}, []);
  const assistantMessage = await serverDb.addAiMessage(session.id, 'assistant', JSON.stringify({ usefulProducts: [] }), { kind: 'structured_answer' }, ['hair-fibre']);
  assert.notEqual(userMessage.id, assistantMessage.id);

  const ownSession = await serverDb.getAiSession(owner, session.id);
  assert.equal(ownSession?.messages.length, 2);
  assert.equal(ownSession?.messages[1].sourceIds[0], 'hair-fibre');
  assert.equal(await serverDb.getAiSession(other, session.id), undefined);
  assert.equal((await serverDb.getAiSessions(owner)).length, 1);

  await serverDb.recordAiFeedback(owner, 'incorrect', 'Vérifier cette réponse', session.id, assistantMessage.id);
  const review = await serverDb.requestAiHumanReview(owner, 'Réponse à vérifier', { answer: 'test' }, session.id, assistantMessage.id);
  assert.equal(review.status, 'pending');

  await serverDb.deleteAiSessions(owner);
  assert.equal(await serverDb.getAiSession(owner, session.id), undefined);

  const safetyCards = selectKnowledgeCards('brûlure et réaction', ['safety']);
  assert.ok(safetyCards.some(card => card.id === 'safety-medical-triage'));
  assert.ok(KURLA_KNOWLEDGE_BASE.every(card => ['internal_review_pending', 'validated'].includes(card.status)));

  const serverSource = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.equal(serverSource.includes("Sérum SPF 50+ Invisible Peau Mélaninée"), false);
  assert.equal(serverSource.includes("fitScore: 96"), false);
  console.log('[PASS] AI product: consentement, isolation des sessions, sources, feedback et revue humaine validés.');
}

run().catch(error => {
  console.error('[FAIL] AI product tests:', error);
  process.exitCode = 1;
});
