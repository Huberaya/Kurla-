/**
 * CHANTIER 8.6c1 — Programme experts/créateurs (39) + rémunération au résultat (40).
 *
 * Ce banc vérifie les deux règles qui font ce programme, et le piège qu'elles
 * évitent :
 *
 *   1. La visibilité ne s'achète pas — le score ignore toute propriété monétaire
 *      ajoutée en contrebande.
 *   2. Un clic ne vaut rien — la table de valeurs met clic, shelf et achat à 0.
 *   3. Le taux est identique pour un résultat positif, neutre ou négatif :
 *      payer moins un résultat négatif inciterait à ne rapporter que du
 *      positif. Une part élevée de négatifs suspend le versement pour revue,
 *      elle ne le réduit pas.
 */
import assert from 'node:assert/strict';

process.env.KURLA_TEST_NO_SERVER = 'true';

const {
  ATTRIBUTION_VALUES,
  CREATOR_PROGRAM_DISCLAIMERS,
  CREATOR_TRANSITIONS,
  MIN_OUTCOMES_FOR_PAYOUT,
  NEGATIVE_SHARE_REVIEW_THRESHOLD,
  PAYOUT_RATE_CENTS_PER_OUTCOME,
  VISIBILITY_WEIGHTS,
  attributionRequiresSignal,
  canPublishCreator,
  canTransitionCreator,
  computeCreatorPayout,
  computeCreatorStanding
} = await import('../src/lib/creatorProgram');

let seq = 0;
const attribution = (event: string, outcomeSignal: string | null = null, id?: string) => ({
  id: id ?? `attr-${(seq += 1)}`,
  creatorId: 'createur-1',
  productId: 'prod-1',
  event,
  outcomeSignal,
  occurredAt: '2026-08-28T10:00:00.000Z'
});
const repeat = (count: number, event: string, signal: string | null = null) =>
  Array.from({ length: count }, () => attribution(event, signal));

// ---------------------------------------------------------------------------
// 1. La table de valeurs : un clic ne vaut rien
// ---------------------------------------------------------------------------
assert.deepEqual(Object.keys(ATTRIBUTION_VALUES).sort(), ['add_to_shelf', 'click', 'outcome_declared', 'purchase'], 'quatre types d’événements, pas plus');
assert.equal(ATTRIBUTION_VALUES.click, 0, 'un clic vaut zéro');
assert.equal(ATTRIBUTION_VALUES.add_to_shelf, 0, 'une intention vaut zéro');
assert.equal(ATTRIBUTION_VALUES.purchase, 0, 'un achat seul ne prouve pas un résultat');
assert.equal(ATTRIBUTION_VALUES.outcome_declared, 1, 'seul un résultat déclaré compte');
assert.ok(
  Object.values(VISIBILITY_WEIGHTS).every(weight => typeof weight === 'number'),
  'les poids de visibilité sont numériques'
);
assert.equal(
  Object.keys(VISIBILITY_WEIGHTS).some(key => /paid|budget|sponsor|price|money/i.test(key)),
  false,
  'aucun poids de visibilité ne porte sur de l’argent'
);

// ---------------------------------------------------------------------------
// 2. Visibilité : elle dérive des contributions, et ignore l'argent
// ---------------------------------------------------------------------------
const base = { contributions: 10, endorsements: 5, contradictions: 0, outcomeReports: 15 };
const baseStanding = computeCreatorStanding(base);
assert.ok(baseStanding.visibilityScore > 0, 'un profil actif a une visibilité');
assert.equal(baseStanding.rankable, true, 'et il est classable');

const moreContributions = computeCreatorStanding({ ...base, contributions: 20 });
assert.ok(
  moreContributions.visibilityScore > baseStanding.visibilityScore,
  'davantage de contributions vérifiées augmente la visibilité'
);

const contradicted = computeCreatorStanding({ ...base, contradictions: 4 });
assert.ok(
  contradicted.visibilityScore < baseStanding.visibilityScore,
  'des contradictions argumentées font baisser la visibilité'
);
assert.ok(contradicted.drivers.some(driver => driver.includes('pénalité')), 'la pénalité est expliquée');

const empty = computeCreatorStanding({ contributions: 0, endorsements: 0, contradictions: 0, outcomeReports: 0 });
assert.equal(empty.visibilityScore, 0, 'sans contribution, aucune visibilité');
assert.equal(empty.rankable, false, 'et hors classement');

// L'argent ajouté en contrebande ne change rien au score.
const smuggled = computeCreatorStanding({ ...base, budget: 50_000, sponsoredSlot: true } as any);
assert.equal(
  smuggled.visibilityScore,
  baseStanding.visibilityScore,
  'un budget ajouté en contrebande ne change pas la visibilité'
);
assert.deepEqual(smuggled.drivers, baseStanding.drivers, 'ni son explication');

// Le score reste borné, même avec des valeurs absurdes.
const absurd = computeCreatorStanding({ contributions: 10_000, endorsements: 10_000, contradictions: 0, outcomeReports: 10_000 });
assert.equal(absurd.visibilityScore, 100, 'le score est plafonné à 100');
const absurdPenalty = computeCreatorStanding({ contributions: 10, endorsements: 0, contradictions: 1_000, outcomeReports: 0 });
assert.equal(absurdPenalty.visibilityScore, 0, 'et ne descend pas sous zéro');

// ---------------------------------------------------------------------------
// 3. Statut : publier exige une vérification
// ---------------------------------------------------------------------------
assert.equal(canTransitionCreator('applied', 'verified'), true, 'une candidature peut être vérifiée');
assert.equal(canTransitionCreator('applied', 'published'), false, 'mais pas publiée directement');
assert.equal(canTransitionCreator('verified', 'published'), true, 'un profil vérifié peut être publié');
assert.equal(canTransitionCreator('published', 'verified'), false, 'on ne revient pas en arrière');
assert.equal(canTransitionCreator('suspended', 'verified'), true, 'une suspension peut être levée par vérification');
assert.equal(canTransitionCreator('rejected', 'published'), false, 'un refus ne mène nulle part');
assert.deepEqual(CREATOR_TRANSITIONS.rejected, [], 'aucune transition depuis un refus');
assert.equal(canPublishCreator('applied'), false, 'publier exige une vérification');
assert.equal(canPublishCreator('verified'), true, 'seul un profil vérifié est publiable');
assert.equal(canPublishCreator('suspended'), false, 'un profil suspendu ne l’est pas');

// ---------------------------------------------------------------------------
// 4. Rémunération : le clic ne rapporte rien
// ---------------------------------------------------------------------------
const clicks = computeCreatorPayout('createur-1', repeat(1_000, 'click'));
assert.equal(clicks.payoutCents, 0, '1 000 clics ne rapportent rien');
assert.equal(clicks.status, 'sous_le_seuil', 'et le statut le dit');
assert.equal(clicks.counts.click, 0, 'les clics sont comptés à zéro');
assert.equal(clicks.examined, 1_000, 'mais ils sont examinés');
assert.match(clicks.explanation, /ne donnent droit à rien/, 'l’explication est explicite');

const intent = computeCreatorPayout('createur-1', [
  ...repeat(500, 'add_to_shelf'),
  ...repeat(200, 'purchase')
]);
assert.equal(intent.payoutCents, 0, '500 ajouts au shelf et 200 achats ne rapportent rien');

const outcomes = computeCreatorPayout('createur-1', [
  ...repeat(4, 'outcome_declared', 'more_hydration'),
  ...repeat(3, 'outcome_declared', 'less_breakage'),
  ...repeat(3, 'outcome_declared', 'no_change')
]);
assert.equal(outcomes.paidEvents, 10, '10 résultats déclarés');
assert.equal(outcomes.payoutCents, 10 * PAYOUT_RATE_CENTS_PER_OUTCOME, '10 × le taux');
assert.equal(outcomes.status, 'versable', 'le versement est possible');
assert.equal(outcomes.positive, 7, '7 positifs');
assert.equal(outcomes.neutral, 3, '3 neutres');
assert.equal(outcomes.negative, 0, 'aucun négatif');

// ---------------------------------------------------------------------------
// 5. Le piège évité : le signe du résultat ne change pas le taux
// ---------------------------------------------------------------------------
const allPositive = computeCreatorPayout('createur-1', repeat(10, 'outcome_declared', 'more_hydration'));
const allNegativeButFew = computeCreatorPayout('createur-1', [
  ...repeat(5, 'outcome_declared', 'more_hydration'),
  ...repeat(5, 'outcome_declared', 'reaction')
]);
assert.equal(allPositive.payoutCents, allNegativeButFew.payoutCents, 'même montant, que les résultats soient positifs ou partagés');
assert.equal(allPositive.payoutCents, 10 * PAYOUT_RATE_CENTS_PER_OUTCOME, 'le taux ne dépend pas du signe');
assert.match(allNegativeButFew.explanation, /identique quel que soit le signe/, 'et l’explication le dit');

const negativeHeavy = computeCreatorPayout('createur-1', [
  ...repeat(3, 'outcome_declared', 'more_hydration'),
  ...repeat(7, 'outcome_declared', 'reaction')
]);
assert.equal(negativeHeavy.status, 'en_attente_de_revue', 'une majorité de résultats négatifs part en revue');
assert.equal(negativeHeavy.payoutCents, 0, 'et rien n’est versé avant revue');
assert.equal(negativeHeavy.negativeShare, 0.7, 'la part négative est mesurée');
assert.ok(
  negativeHeavy.negativeShare > NEGATIVE_SHARE_REVIEW_THRESHOLD,
  'au-dessus du seuil de revue'
);
assert.match(
  negativeHeavy.explanation,
  /le taux n’est pas réduit/,
  'l’explication dit pourquoi le taux n’est pas réduit'
);

// ---------------------------------------------------------------------------
// 6. Seuils, doublons, événements inconnus
// ---------------------------------------------------------------------------
const tooFew = computeCreatorPayout('createur-1', repeat(MIN_OUTCOMES_FOR_PAYOUT - 1, 'outcome_declared', 'more_hydration'));
assert.equal(tooFew.status, 'sous_le_seuil', 'sous le seuil, rien n’est versé');
assert.equal(tooFew.payoutCents, 0, 'montant nul');
assert.match(tooFew.explanation, /micro-paiements/, 'et la raison est donnée');

const duplicated = computeCreatorPayout('createur-1', [
  attribution('outcome_declared', 'more_hydration', 'attr-dup'),
  attribution('outcome_declared', 'more_hydration', 'attr-dup'),
  attribution('outcome_declared', 'more_hydration', 'attr-dup'),
  attribution('outcome_declared', 'less_breakage', 'attr-4'),
  attribution('outcome_declared', 'less_breakage', 'attr-5')
]);
assert.equal(duplicated.examined, 5, 'cinq événements examinés');
assert.equal(duplicated.paidEvents, 3, 'mais trois seulement comptent : les doublons sont écartés');
assert.equal(duplicated.ignored, 2, 'deux ignorés');

const unknown = computeCreatorPayout('createur-1', [
  ...repeat(4, 'outcome_declared', 'more_hydration'),
  attribution('vue_publicitaire'),
  attribution('outcome_declared', 'signal_inconnu')
]);
assert.equal(unknown.paidEvents, 5, 'l’événement inconnu n’est pas un résultat');
assert.equal(unknown.ignored, 1, 'un événement inconnu est ignoré, pas traité');
assert.equal(unknown.unknownSignal, 1, 'et un signal non reconnu est compté à part');
assert.equal(unknown.payoutCents, 5 * PAYOUT_RATE_CENTS_PER_OUTCOME, 'le calcul reste juste');

const nothing = computeCreatorPayout('createur-1', []);
assert.equal(nothing.examined, 0, 'aucun événement');
assert.equal(nothing.negativeShare, null, 'aucune part inventée sans donnée');
assert.equal(nothing.payoutCents, 0, 'rien à verser');

// ---------------------------------------------------------------------------
// 7. Garde éditoriale
// ---------------------------------------------------------------------------
const FORBIDDEN = ['résultat garanti', 'guérison', 'traitement', 'thérapeutique', 'cliniquement prouvé', 'sponsorisé'];
const text = [...CREATOR_PROGRAM_DISCLAIMERS].join(' ').toLowerCase();
for (const word of FORBIDDEN) {
  assert.equal(text.includes(word), false, `le programme ne doit pas promettre « ${word} »`);
}
assert.ok(
  CREATOR_PROGRAM_DISCLAIMERS.some(line => line.includes('déclarations de membres')),
  'la nature déclarative des résultats est rappelée'
);
assert.ok(
  CREATOR_PROGRAM_DISCLAIMERS.some(line => line.includes('ne s’achète pas')),
  'l’absence d’emplacement payant est écrite'
);

// ---------------------------------------------------------------------------
// 8. Store : les compteurs de visibilité viennent de faits enregistrés
// ---------------------------------------------------------------------------
process.env.KURLA_STORE_MODE = 'memory';
const { serverDb } = await import('../src/lib/serverDb');

const publishedArticle = (slug: string, author: string) => ({
  id: `article-${slug}`,
  slug,
  title: `Contenu ${slug}`,
  category: 'soins',
  content_type: 'article',
  topic: 'cheveux_textures',
  language: 'fr',
  excerpt: 'Résumé du contenu.',
  read_time: 4,
  author,
  content: 'Contenu vérifié, sourcé.',
  sources: [{ label: 'Revue dermatologique', url: 'https://example.org/etude' }],
  evidence_level: 'high',
  medical_warning: null,
  translations: { en: { title: 'Content', content: 'Verified content.' } },
  faq: [],
  related_product_ids: [],
  status: 'published',
  published_at: '2026-08-01T10:00:00.000Z',
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T10:00:00.000Z'
});

const creator = await serverDb.createCreatorApplication({
  userId: 'user-creator-1',
  displayName: 'Awa Diallo',
  kind: 'expert',
  specialty: 'Cheveux texturés et cuir chevelu sensible',
  biography: 'Dix ans de pratique en salon, spécialisation sur les cuirs chevelus sensibles.'
});
assert.equal(creator.status, 'applied', 'une candidature naît « déposée », jamais publiée');

serverDb.inMemoryAdminArticles.push(
  publishedArticle('tresses', 'Awa Diallo'),
  publishedArticle('porosite', 'awa diallo '),
  publishedArticle('cuir-chevelu', 'Awa Diallo'),
  publishedArticle('autre-auteur', 'Quelqu’un d’autre'),
  { ...publishedArticle('brouillon', 'Awa Diallo'), status: 'draft' }
);

for (const signal of ['more_hydration', 'less_breakage', 'scalp_calm', 'definition_improved']) {
  await serverDb.recordCreatorAttribution({ creatorId: creator.id, event: 'outcome_declared', outcomeSignal: signal });
}
for (let index = 0; index < 3; index += 1) {
  await serverDb.recordCreatorAttribution({ creatorId: creator.id, event: 'click' });
}

const standing = await serverDb.getCreatorStanding(creator.id);
assert.equal(standing.standing.contributions, 3, 'trois contenus publiés signés comptent, un brouillon et un autre auteur non');
assert.equal(standing.standing.outcomeReports, 4, 'les résultats déclarés sont comptés');
assert.equal(standing.standing.endorsements, 0, 'sans profil professionnel lié, aucun appui n’est inventé');
assert.equal(standing.standing.contradictions, 0, 'sans profil professionnel lié, aucune contradiction n’est inventée');
assert.equal(standing.standing.visibilityScore, 11, '6,75 pts de contributions + 4 pts de résultats, arrondis');
assert.equal(standing.standing.rankable, true, 'trois contributions vérifiées suffisent à être classé');
assert.equal(standing.isListed, false, 'une candidature déposée n’est pas dans l’annuaire');

// Un champ monétaire ajouté en contrebande sur la candidature ne change rien.
(serverDb.inMemoryCreatorApplications.find(item => item.id === creator.id) as any).budgetAds = 50_000;
const standingAfterBudget = await serverDb.getCreatorStanding(creator.id);
assert.equal(
  standingAfterBudget.standing.visibilityScore,
  standing.standing.visibilityScore,
  'un budget ajouté en base ne fait pas bouger la visibilité'
);

const emptyDirectory = await serverDb.getPublicCreatorDirectory();
assert.equal(emptyDirectory.length, 0, 'l’annuaire public est vide tant que rien n’est vérifié');

// ---------------------------------------------------------------------------
// 9. Store : publier exige une vérification, la base rejoue la règle
// ---------------------------------------------------------------------------
await assert.rejects(
  () => serverDb.reviewCreatorApplication(creator.id, 'published'),
  /Transition refusée/,
  'passer de « déposée » à « publiée » est refusé'
);

const verified = await serverDb.reviewCreatorApplication(creator.id, 'verified', 'Diplôme et pratique vérifiés.');
assert.equal(verified.status, 'verified');
assert.ok(verified.verifiedAt, 'la vérification est datée');

const published = await serverDb.reviewCreatorApplication(creator.id, 'published');
assert.equal(published.status, 'published');
assert.equal(canPublishCreator('verified'), true, 'seul « vérifié » ouvre la publication');

const directory = await serverDb.getPublicCreatorDirectory();
assert.equal(directory.length, 1, 'le profil vérifié puis publié apparaît');
assert.equal(directory[0].displayName, 'Awa Diallo');
assert.equal(directory[0].visibilityScore, 11, 'l’annuaire affiche le score réel, pas un score décoratif');
assert.equal((directory[0] as any).email, undefined, 'aucune donnée de contact n’est exposée');

await assert.rejects(
  () => serverDb.reviewCreatorApplication(creator.id, 'rejected'),
  /Transition refusée/,
  'un profil publié ne peut être que suspendu'
);
const suspended = await serverDb.reviewCreatorApplication(creator.id, 'suspended', 'Part de résultats négatifs à revoir.');
assert.equal(suspended.status, 'suspended');
assert.equal((await serverDb.getPublicCreatorDirectory()).length, 0, 'un profil suspendu disparaît de l’annuaire');
assert.equal((await serverDb.reviewCreatorApplication(creator.id, 'verified')).status, 'verified', 'une suspension est réversible');

const rejectedCreator = await serverDb.createCreatorApplication({
  userId: 'user-creator-2',
  displayName: 'Refusé',
  kind: 'creator',
  specialty: 'Contenu',
  biography: 'Une candidature qui sera refusée pour vérifier que le refus est définitif.'
});
await serverDb.reviewCreatorApplication(rejectedCreator.id, 'rejected');
await assert.rejects(
  () => serverDb.reviewCreatorApplication(rejectedCreator.id, 'verified'),
  /Transition refusée/,
  'un refus est définitif'
);

// ---------------------------------------------------------------------------
// 10. Routes : les règles sont publiques, personne ne se publie seul
// ---------------------------------------------------------------------------
import http from 'node:http';

async function requestApp(path: string, init?: { method?: string; body?: unknown }) {
  const serverModule = await import('../server');
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, json, text };
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const program = await requestApp('/api/creators/program');
assert.equal(program.status, 200, 'les règles du programme sont lisibles sans compte');
assert.equal(program.json.payout.attributionValues.click, 0, 'un clic vaut zéro, publié');
assert.equal(program.json.payout.attributionValues.purchase, 0, 'un achat vaut zéro, publié');
assert.equal(program.json.payout.attributionValues.outcome_declared, 1, 'seul un résultat déclaré compte');
assert.equal(program.json.payout.rateCentsPerOutcome, PAYOUT_RATE_CENTS_PER_OUTCOME, 'le taux annoncé est le taux appliqué');
assert.deepEqual(program.json.visibility.purchasableInputs, [], 'aucune entrée de visibilité n’est achetable');
assert.ok(
  Object.keys(program.json.visibility.weights).every(key => !/price|budget|paid|sponsor|bid/i.test(key)),
  'aucun poids de visibilité ne porte sur de l’argent'
);

const directoryResponse = await requestApp('/api/creators');
assert.equal(directoryResponse.status, 200, 'l’annuaire est public');
assert.equal(directoryResponse.json.orderedBy, 'contributions_verifiees', 'le classement est annoncé');
assert.ok(
  !/placement|sponsor|boost|premium/i.test(directoryResponse.text),
  'l’annuaire ne propose aucun placement'
);

const applyWithoutAccount = await requestApp('/api/creators/apply', {
  method: 'POST',
  body: { displayName: 'Sans compte', kind: 'creator', specialty: 'Contenu', biography: 'x'.repeat(60) }
});
assert.equal(applyWithoutAccount.status, 401, 'on ne dépose pas de candidature sans compte');

const attributionWithoutAccount = await requestApp('/api/creators/attributions', {
  method: 'POST',
  body: { creatorId: creator.id, event: 'outcome_declared' }
});
assert.equal(attributionWithoutAccount.status, 401, 'on n’enregistre pas d’attribution sans compte');

const adminWithoutAccount = await requestApp('/api/admin/creators');
assert.equal(adminWithoutAccount.status, 401, 'la revue des candidatures exige un compte administrateur');

// La règle « un événement payant exige un signal qualifié » a une source unique.
assert.equal(attributionRequiresSignal('outcome_declared'), true, 'un résultat déclaré exige un signal');
for (const event of ['click', 'add_to_shelf', 'purchase']) {
  assert.equal(attributionRequiresSignal(event), false, `${event} n’exige rien : il ne rapporte rien`);
}
await assert.rejects(
  () => serverDb.recordCreatorAttribution({ creatorId: creator.id, event: 'vue_publicitaire' as any }),
  /inconnu/,
  'un événement inconnu n’entre pas en base'
);

console.log(
  `[PASS] Chantier 8.6c1 — programme experts/créateurs et rémunération au résultat : ` +
    `1 000 clics → ${clicks.payoutCents} centime, 700 intentions et achats → ${intent.payoutCents} centime, ` +
    `${outcomes.paidEvents} résultats déclarés → ${outcomes.payoutCents} centimes, même taux pour ${allPositive.positive} positifs et ${allNegativeButFew.negative} négatifs, ` +
    `${negativeHeavy.negativeShare * 100} % de négatifs → revue sans versement, budget en contrebande sans effet sur la visibilité (${baseStanding.visibilityScore}/100), ` +
    `publication réservée aux profils vérifiés, ` +
    `visibilité comptée sur ${standing.standing.contributions} contenus publiés et ${standing.standing.outcomeReports} résultats déclarés (${standing.standing.visibilityScore}/100), ` +
    `règles du programme publiées sans compte.`
);
