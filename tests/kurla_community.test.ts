import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { deleteUserData, exportUserData } from '../src/lib/db/privacyStore';

/**
 * CHANTIER 11 (bloc C) — banc « petite communauté ».
 *
 * Ce qui est vérifié, parce que ce sont les façons dont une communauté rate :
 *  1. on peut **lire** — questions, réponses et avis sont exposés, et les
 *     questions sans réponse sont signalées comme telles ;
 *  2. le rôle affiché est **déduit** du statut réel, jamais déclaré par
 *     l'auteur (un membre ne peut pas se dire « professionnel vérifié ») ;
 *  3. seul le demandeur marque la réponse utile — aucun compteur public ;
 *  4. les contenus communautaires sont des données personnelles : ils sortent
 *     dans l'export RGPD et partent à la suppression du compte.
 */

const ASKER = 'asker-1';
const NEIGHBOUR = 'asker-2';
const MEMBER = 'member-1';
const PRO = 'pro-1';

function seed(): void {
  serverDb.inMemoryProfessionalApplications = [
    { id: 'app-1', userId: PRO, name: 'Amina Traoré', email: 'a@example.org', phone: '0100000000', city: 'Paris', profession: 'Coiffeuse', experience: '10 ans', acceptsCharter: true, status: 'approved', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
  ] as never[];

  serverDb.inMemoryProductQuestions = [
    { id: 'q-1', productId: 'p-1', question: 'Ce leave-in alourdit-il les boucles 4C ?', userId: ASKER, createdAt: '2026-08-01T10:00:00.000Z' },
    { id: 'q-2', productId: 'p-1', question: 'Peut-on l’utiliser sur cheveux défrisés ?', userId: NEIGHBOUR, createdAt: '2026-08-02T10:00:00.000Z' }
  ] as never[];

  serverDb.inMemoryQuestionAnswers = [];

  serverDb.inMemoryProductReviews = [
    { id: 'r-1', productId: 'p-1', rating: 5, comment: 'Bonne hydratation.', author: 'Client vérifié', userId: ASKER, verifiedPurchase: true, createdAt: '2026-08-03T10:00:00.000Z', status: 'approved' },
    { id: 'r-2', productId: 'p-1', rating: 4, comment: 'Correct.', author: 'Client vérifié', userId: NEIGHBOUR, verifiedPurchase: true, createdAt: '2026-08-04T10:00:00.000Z', status: 'approved' }
  ] as never[];
}

async function runCommunityTests(): Promise<void> {
  seed();

  // ---------------------------------------------------------------------
  // 1. Le rôle est déduit du statut réel, pas déclaré.
  // ---------------------------------------------------------------------
  const memberAnswer = await serverDb.answerProductQuestion(MEMBER, 'customer', 'q-1', 'Je l’utilise sur 4C, une noisette suffit.');
  assert.equal(memberAnswer.authorRole, 'member');

  // Le même rôle annoncé ('customer') mais un dossier professionnel approuvé
  // en base : c'est le statut réel qui tranche.
  const proAnswer = await serverDb.answerProductQuestion(PRO, 'customer', 'q-1', 'En salon je le recommande après le leave-in.');
  assert.equal(proAnswer.authorRole, 'professional');

  const staffAnswer = await serverDb.answerProductQuestion('admin-1', 'admin', 'q-1', 'Réponse de l’équipe KURLA : oui, en petite quantité.');
  assert.equal(staffAnswer.authorRole, 'kurla');

  // Un membre qui se prétend professionnel sans dossier vérifié reste membre.
  const impostor = await serverDb.answerProductQuestion('member-2', 'professional', 'q-2', 'Je suis professionnelle, faites confiance.');
  assert.equal(impostor.authorRole, 'member', 'un rôle auto-déclaré sans dossier approuvé ne doit pas donner le badge professionnel');

  await assert.rejects(
    () => serverDb.answerProductQuestion(MEMBER, 'customer', 'q-1', 'court'),
    /entre 10 et 2 000 caractères/
  );

  // ---------------------------------------------------------------------
  // 2. La lecture expose les fils et signale ce qui attend une réponse.
  // ---------------------------------------------------------------------
  const threads = await serverDb.getProductQuestionThreads('p-1');
  assert.equal(threads.length, 2);
  const first = threads.find(thread => thread.id === 'q-1');
  assert.equal(first!.answers.length, 3);
  assert.equal(first!.open, false);
  assert.ok(first!.answers.some(answer => answer.authorRole === 'professional'));

  const second = threads.find(thread => thread.id === 'q-2');
  assert.equal(second!.answers.length, 1);
  // Aucune identité d'auteur n'est exposée.
  assert.equal(JSON.stringify(threads).includes(ASKER), false, 'l’identifiant du demandeur ne doit pas être publié');
  assert.equal(JSON.stringify(threads).includes(PRO), false, 'l’identifiant du professionnel ne doit pas être publié');

  // ---------------------------------------------------------------------
  // 3. Seul le demandeur marque la réponse utile.
  // ---------------------------------------------------------------------
  await assert.rejects(
    () => serverDb.markQuestionResolved(MEMBER, 'q-1', memberAnswer.id),
    /Seule la personne qui a posé la question/
  );
  const resolved = await serverDb.markQuestionResolved(ASKER, 'q-1', proAnswer.id);
  assert.equal(resolved.resolvedAnswerId, proAnswer.id);
  await assert.rejects(
    () => serverDb.markQuestionResolved(ASKER, 'q-1', 'reponse-inexistante'),
    /Réponse introuvable/
  );

  // ---------------------------------------------------------------------
  // 4. L'état de la communauté est calculé, pas estimé.
  // ---------------------------------------------------------------------
  const overview = await serverDb.getCommunityOverview();
  assert.equal(overview.questionsAsked, 2);
  assert.equal(overview.memberAnswers, 4);
  assert.equal(overview.questionsWithAnswer, 2);
  assert.equal(overview.openQuestions, 0);
  assert.equal(overview.reviewsApproved, 2);
  assert.equal(overview.verifiedProfessionals, 1);

  // ---------------------------------------------------------------------
  // 5. RGPD : les contenus communautaires sont exportés puis supprimés.
  // ---------------------------------------------------------------------
  const exported = await exportUserData(serverDb, ASKER);
  assert.equal((exported.sections.productReviews as unknown[]).length, 1);
  assert.equal((exported.sections.productQuestions as unknown[]).length, 1);
  assert.equal((exported.sections.questionAnswers as unknown[]).length, 0, 'le demandeur n’a pas écrit de réponse');

  const memberExport = await exportUserData(serverDb, MEMBER);
  assert.equal((memberExport.sections.questionAnswers as unknown[]).length, 1);
  const impostorExport = await exportUserData(serverDb, 'member-2');
  assert.equal((impostorExport.sections.questionAnswers as unknown[]).length, 1, 'la réponse du membre qui se prétendait professionnel est bien rattachée à son compte');

  const deletion = await deleteUserData(serverDb, ASKER);
  assert.equal(deletion.userId, ASKER);
  assert.equal(serverDb.inMemoryProductReviews.some(review => review.userId === ASKER), false);
  assert.equal(serverDb.inMemoryProductQuestions.some(question => question.userId === ASKER), false);

  // Le voisin est intact.
  assert.equal(serverDb.inMemoryProductReviews.some(review => review.userId === NEIGHBOUR), true);
  assert.equal(serverDb.inMemoryProductQuestions.some(question => question.userId === NEIGHBOUR), true);

  // ---------------------------------------------------------------------
  // 5bis. La seule « liste » de la communauté : les questions sans réponse.
  // ---------------------------------------------------------------------
  serverDb.inMemoryProducts = [
    { id: 'p-1', slug: 'leave-in-hydratant', name: 'Leave-in Hydratant' }
  ] as never[];
  const openList = await serverDb.getOpenCommunityQuestions();
  assert.equal(openList.length, 0, 'les deux questions ont reçu une réponse : la liste doit être vide');

  await serverDb.answerProductQuestion(MEMBER, 'customer', 'q-2', 'Une réponse de membre sur la seconde question.');
  const openAfter = await serverDb.getOpenCommunityQuestions();
  assert.equal(openAfter.length, 0);

  // Une question neuve, sans aucune réponse, apparaît — avec le lien produit réel.
  serverDb.inMemoryProductQuestions.push({
    id: 'q-3', productId: 'p-1', question: 'Convient-il aux enfants ?', userId: 'asker-3', createdAt: '2026-08-05T10:00:00.000Z'
  } as never);
  const withOpen = await serverDb.getOpenCommunityQuestions();
  assert.equal(withOpen.length, 1);
  assert.equal(withOpen[0]!.id, 'q-3');
  assert.equal(withOpen[0]!.productSlug, 'leave-in-hydratant', 'le lien doit pointer sur /produit/:slug, pas sur l’identifiant');
  assert.equal(withOpen[0]!.productName, 'Leave-in Hydratant');

  // ---------------------------------------------------------------------
  // 6. Lecture publique, écriture authentifiée.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const overviewRoute = await fetch(`${baseUrl}/api/community`);
    assert.equal(overviewRoute.status, 200);
    const body = await overviewRoute.json() as { questionsAsked: number; reviewsApproved: number };
    assert.ok(typeof body.questionsAsked === 'number');

    const openRoute = await fetch(`${baseUrl}/api/community/questions`);
    assert.equal(openRoute.status, 200);
    const openBody = await openRoute.json() as { questions: Array<{ productSlug?: string }> };
    assert.ok(Array.isArray(openBody.questions));

    const questionsRoute = await fetch(`${baseUrl}/api/products/p-1/questions`);
    assert.equal(questionsRoute.status, 200);
    const questionsBody = await questionsRoute.json() as { questions: unknown[] };
    assert.ok(questionsBody.questions.length >= 1);

    const reviewsRoute = await fetch(`${baseUrl}/api/products/p-1/reviews`);
    assert.equal(reviewsRoute.status, 200);

    const write = await fetch(`${baseUrl}/api/products/p-1/questions/q-2/answers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': 'attacker' },
      body: JSON.stringify({ body: 'Une réponse assez longue pour passer.' })
    });
    assert.equal(write.status, 401);

    const resolve = await fetch(`${baseUrl}/api/community/questions/q-2/resolved`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answerId: 'x' })
    });
    assert.equal(resolve.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Communauté banc : lecture réelle, rôle déduit du statut, marquage réservé au demandeur, contenus couverts par le RGPD.');
}

runCommunityTests().catch(error => {
  console.error('[FAIL] Communauté banc :', error);
  process.exitCode = 1;
});
