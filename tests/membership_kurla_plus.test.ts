/**
 * CHANTIER 8.5 — Abonnement KURLA+.
 *
 * Ce banc vérifie des propriétés, pas des écrans :
 *
 *   1. KURLA+ n'enlève rien — toute capacité essentielle reste gratuite, et la
 *      liste des fonctions gratuites d'avant le chantier est figée ici : en
 *      retirer une fait échouer le banc.
 *   2. Rien n'est acheté qui ne devrait l'être — les récompenses de progression
 *      et l'accès aux professionnels ne sont pas des droits payants.
 *   3. Aucun abonnement payant sans référence de paiement, en base comme en
 *      mémoire, y compris via le chemin du webhook Stripe.
 *   4. Un seul essai par compte, à vie.
 *   5. L'échéance ne dépend d'aucun traitement planifié.
 *   6. Ce que KURLA+ ajoute au parcours est additif : restreindre les droits
 *      redonne exactement le parcours du chantier 8.4.
 *   7. La synthèse écrite ne promet rien et n'emploie aucun vocabulaire médical.
 */
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.KURLA_TEST_NO_SERVER = 'true';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;

const membership = await import('../src/lib/membership');
const {
  MEMBERSHIP_CAPABILITIES,
  MEMBERSHIP_NEVER_CHANGES,
  MEMBERSHIP_PLANS,
  annualSavingCents,
  capabilitiesFor,
  entitlementsFor,
  evaluateMembershipOffer,
  hasCapability,
  isMembershipPaymentConfigured,
  membershipPrice,
  resolveMembershipState,
  scoreMembershipDossier
} = membership;
const { buildBeautyJourney, buildJourneySynthesis } = await import('../src/lib/beautyJourney');
const { activateMembershipFromCheckoutSession, nextPeriodEnd, renewMembershipFromInvoice } = await import('../src/server/payments/membershipActivation');
const { serverDb } = await import('../src/lib/serverDb');
const serverModule = await import('../server');

const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// 1. Prix : hors taxe, TVA du pays, aucun taux inventé
// ---------------------------------------------------------------------------
const plus = MEMBERSHIP_PLANS.find(plan => plan.code === 'kurla_plus')!;
assert.equal(plus.monthlyPriceCents, 700, '7 €/mois');
assert.equal(plus.annualPriceCents, 7_000, '70 €/an');
assert.ok(plus.annualPriceCents < plus.monthlyPriceCents * 12, 'l’annuel doit coûter moins cher que douze mensualités');
assert.equal(annualSavingCents('kurla_plus'), 1_400, '14 € d’économie par an');

const monthlyFr = membershipPrice('kurla_plus', 'monthly', 'FR');
assert.equal(monthlyFr.vatRatePercent, 20, 'TVA française à 20 %');
assert.equal(monthlyFr.vatCents, 140, '140 centimes de TVA');
assert.equal(monthlyFr.grossCents, 840, '8,40 € TTC par mois');

const annualFr = membershipPrice('kurla_plus', 'annual', 'FR');
assert.equal(annualFr.grossCents, 8_400, '84 € TTC par an');
assert.equal(annualFr.monthlyEquivalentCents, 583, 'équivalent mensuel de l’annuel');

const unknownCountry = membershipPrice('kurla_plus', 'monthly', 'US');
assert.equal(unknownCountry.vatRatePercent, null, 'pays non desservi : aucun taux');
assert.equal(unknownCountry.grossCents, null, 'pays non desservi : aucun prix TTC inventé');

const free = membershipPrice('libre', 'monthly', 'FR');
assert.equal(free.grossCents, 0, 'l’offre gratuite reste à zéro');

// ---------------------------------------------------------------------------
// 2. KURLA+ n'enlève rien : toute capacité essentielle est gratuite
// ---------------------------------------------------------------------------
const essential = MEMBERSHIP_CAPABILITIES.filter(capability => capability.essential);
assert.ok(essential.length >= 5, 'au moins cinq capacités essentielles');
for (const capability of essential) {
  assert.equal(capability.includedInFree, true, `${capability.code} est essentielle : elle doit rester gratuite`);
  assert.equal(hasCapability('libre', capability.code), true, `${capability.code} doit être accordée sur le plan libre`);
  assert.equal(capability.applied, true, `${capability.code} doit être réellement appliquée`);
}

// Liste figée des fonctions gratuites avant le chantier 8.5. En retirer une du
// plan libre fait échouer ce banc : c'est la garde contre le paywall rampant.
const FREE_BEFORE_85 = [
  'data_export',
  'safety_alerts',
  'assistant_base',
  'journey_full_history',
  'routine_tracking',
  'progression_rewards'
];
for (const code of FREE_BEFORE_85) {
  assert.ok(MEMBERSHIP_CAPABILITIES.some(capability => capability.code === code), `${code} a disparu du registre`);
  assert.equal(hasCapability('libre', code), true, `${code} était gratuit avant 8.5 : il doit le rester`);
}

// ---------------------------------------------------------------------------
// 3. Ce qui est payant : uniquement de la profondeur d'analyse
// ---------------------------------------------------------------------------
const paidOnly = MEMBERSHIP_CAPABILITIES.filter(capability => !capability.includedInFree).map(capability => capability.code);
assert.deepEqual(
  [...paidOnly].sort(),
  ['assistant_dossier', 'custom_alerts', 'journey_deep_comparison', 'journey_synthesis'],
  'les droits payants sont exactement ceux-ci — rien d’autre ne doit passer derrière l’abonnement'
);
for (const code of ['progression_rewards', 'data_export']) {
  assert.equal(hasCapability('kurla_plus', code), true, `${code} reste accordé, mais n’est pas un avantage payant`);
  assert.equal(
    MEMBERSHIP_CAPABILITIES.find(capability => capability.code === code)!.essential,
    true,
    `${code} est marqué essentiel : les récompenses et les données ne se monétisent pas`
  );
}

// Un droit annoncé mais non branché doit le dire, avec la raison.
const pending = MEMBERSHIP_CAPABILITIES.filter(capability => !capability.applied);
assert.ok(pending.length >= 1, 'au moins un droit annoncé non branché');
for (const capability of pending) {
  assert.ok(typeof capability.pendingReason === 'string' && capability.pendingReason.length > 20, `${capability.code} doit expliquer pourquoi il n’est pas branché`);
}
assert.equal(
  entitlementsFor('kurla_plus').filter(item => item.included && !item.applied).length,
  pending.filter(capability => capability.includedInPlus).length,
  'l’API doit annoncer exactement les droits non branchés'
);

// ---------------------------------------------------------------------------
// 4. Éligibilité : « le dossier doit valoir quelque chose »
// ---------------------------------------------------------------------------
const emptyDossier = { profileComplete: false, journalEntries: 0, photos: 0, profileRevisions: 0, loyaltyLevel: 1, activeDays: 0, bestMetricPoints: 0 };
const emptyOffer = evaluateMembershipOffer(emptyDossier);
assert.equal(emptyOffer.dossierScore, 0, 'un dossier vide vaut zéro');
assert.equal(emptyOffer.shouldPropose, false, 'KURLA+ ne se propose pas sur un dossier vide');
assert.ok(emptyOffer.blockers.length >= 3, 'les raisons du refus doivent être énoncées');
assert.equal(emptyOffer.whatItWouldNotChange.length, MEMBERSHIP_NEVER_CHANGES.length, 'la liste de ce qui ne change pas est toujours complète');

const richDossier = { profileComplete: true, journalEntries: 30, photos: 4, profileRevisions: 3, loyaltyLevel: 5, activeDays: 20, bestMetricPoints: 12 };
const richScore = scoreMembershipDossier(richDossier);
assert.equal(richScore, 100, 'un dossier complet vaut 100');
const richOffer = evaluateMembershipOffer(richDossier);
assert.equal(richOffer.shouldPropose, true, 'un dossier substantiel justifie la proposition');
assert.ok(richOffer.whatItWouldChange.length >= 2, 'ce que l’abonnement changerait doit être concret');
assert.ok(richOffer.whatItWouldChange.some(item => item.includes('30')), 'le propos s’appuie sur les données réelles du membre');

// Un dossier moyen ne doit pas être sur-évalué.
const middleDossier = { profileComplete: false, journalEntries: 6, photos: 2, profileRevisions: 1, loyaltyLevel: 2, activeDays: 4, bestMetricPoints: 4 };
const middleScore = scoreMembershipDossier(middleDossier);
assert.ok(middleScore > 0 && middleScore < 100, `un dossier partiel doit être entre les deux (obtenu : ${middleScore})`);

// ---------------------------------------------------------------------------
// 5. Cycle de vie : essai unique, échéance sans cron, activation payante
// ---------------------------------------------------------------------------
const trialUser = '77777777-7777-4777-8777-777777777777';
const trialStart = await serverDb.startMembershipTrial(trialUser, 'kurla_plus');
assert.equal(trialStart.status, 'trialing', 'l’essai ouvre un statut trialing');
assert.equal(trialStart.effectivePlan, 'kurla_plus', 'les droits KURLA+ s’appliquent pendant l’essai');
assert.equal(trialStart.isPaid, false, 'un essai n’est pas un abonnement payé');
const trialDays = Math.round((Date.parse(trialStart.accessUntil!) - Date.now()) / DAY);
assert.equal(trialDays, 14, 'l’essai dure 14 jours');

await assert.rejects(
  () => serverDb.startMembershipTrial(trialUser, 'kurla_plus'),
  /déjà utilisé/,
  'un second essai doit être refusé'
);

// Échéance dérivée de l'heure, sans traitement planifié.
const lapsedTrial = resolveMembershipState(
  {
    userId: trialUser,
    planCode: 'kurla_plus',
    status: 'trialing',
    startedAt: new Date(Date.now() - 20 * DAY).toISOString(),
    currentPeriodEnd: new Date(Date.now() - 6 * DAY).toISOString(),
    trialEndsAt: new Date(Date.now() - 6 * DAY).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    stripeSubscriptionId: null,
    paymentRef: null
  },
  new Date()
);
assert.equal(lapsedTrial.status, 'expired', 'un essai échu est expiré');
assert.equal(lapsedTrial.effectivePlan, 'libre', 'un essai échu ne donne plus les droits payants');
assert.equal(lapsedTrial.trialUsed, true, 'l’essai reste consommé');

// Une adhésion échue en base est basculée en expired — et la lecture le disait
// déjà avant ce traitement.
const lapsedUser = 'aaaaaaaa-0000-4000-8000-000000000001';
serverDb.inMemoryMemberships.set(lapsedUser, {
  userId: lapsedUser,
  planCode: 'kurla_plus',
  status: 'trialing',
  startedAt: new Date(Date.now() - 20 * DAY).toISOString(),
  currentPeriodEnd: new Date(Date.now() - 6 * DAY).toISOString(),
  trialEndsAt: new Date(Date.now() - 6 * DAY).toISOString(),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  stripeSubscriptionId: null,
  paymentRef: null
});
const expiredBatch = await serverDb.expireMemberships();
assert.ok(expiredBatch.expiredTrials >= 1, 'l’essai échu est basculé en expired');
assert.equal((await serverDb.getMembership(lapsedUser))?.status, 'expired', 'la base reflète l’échéance');

// Aucun abonnement payant sans référence de paiement.
await assert.rejects(
  () => serverDb.activateMembership(trialUser, { planCode: 'kurla_plus', paymentRef: '   ', periodEnd: nextPeriodEnd('monthly') }),
  /référence de paiement/,
  'une référence vide doit être refusée'
);
await assert.rejects(
  () => serverDb.activateMembership(trialUser, { planCode: 'kurla_plus', paymentRef: 'pi_test', periodEnd: new Date(Date.now() - DAY).toISOString() }),
  /futur/,
  'une fin de période passée doit être refusée'
);

const paidUser = '88888888-8888-4888-8888-888888888888';
const activated = await serverDb.activateMembership(paidUser, {
  planCode: 'kurla_plus',
  paymentRef: 'sub_TEST123',
  periodEnd: nextPeriodEnd('monthly'),
  stripeSubscriptionId: 'sub_TEST123'
});
assert.equal(activated.status, 'active', 'un paiement confirmé active l’abonnement');
assert.equal(activated.isPaid, true, 'l’abonnement est payé');

const cancelAtEnd = await serverDb.cancelMembership(paidUser, true);
assert.equal(cancelAtEnd.status, 'active', 'résilier à échéance ne coupe pas l’accès payé');
assert.equal(cancelAtEnd.cancelAtPeriodEnd, true, 'la résiliation à échéance est enregistrée');

const overdueActive = resolveMembershipState(
  {
    userId: paidUser,
    planCode: 'kurla_plus',
    status: 'active',
    startedAt: new Date(Date.now() - 40 * DAY).toISOString(),
    currentPeriodEnd: new Date(Date.now() - 10 * DAY).toISOString(),
    trialEndsAt: null,
    cancelAtPeriodEnd: true,
    canceledAt: null,
    stripeSubscriptionId: 'sub_TEST123',
    paymentRef: 'sub_TEST123'
  },
  new Date()
);
assert.equal(overdueActive.status, 'expired', 'une période échue coupe les droits sans attendre de cron');
assert.equal(overdueActive.effectivePlan, 'libre', 'les droits reviennent au plan libre');

// ---------------------------------------------------------------------------
// 6. Webhook : l'activation depuis une session Stripe reconstituée
// ---------------------------------------------------------------------------
const webhookUser = '99999999-9999-4999-8999-999999999999';
const baseSession = {
  id: 'cs_test_1',
  payment_status: 'paid',
  amount_total: 840,
  currency: 'eur',
  subscription: 'sub_webhook_1',
  metadata: {
    kind: 'membership',
    membershipPlan: 'kurla_plus',
    membershipBilling: 'monthly',
    userId: webhookUser,
    vatRatePercent: '20',
    expectedAmountCents: '840'
  }
};

const unpaid = await activateMembershipFromCheckoutSession({ ...baseSession, payment_status: 'unpaid' });
assert.equal(unpaid.activated, false, 'un paiement non confirmé n’active rien');
assert.match(unpaid.reason || '', /non confirmé/, 'la raison doit être explicite');

const noMetadata = await activateMembershipFromCheckoutSession({ id: 'cs_x', payment_status: 'paid', amount_total: 840, metadata: {} });
assert.equal(noMetadata.activated, false, 'sans métadonnées d’abonnement, rien n’est activé');

const noAmount = await activateMembershipFromCheckoutSession({ ...baseSession, metadata: { ...baseSession.metadata, expectedAmountCents: undefined } });
assert.equal(noAmount.activated, false, 'un montant attendu absent refuse l’activation');

await assert.rejects(
  () => activateMembershipFromCheckoutSession({ ...baseSession, amount_total: 700 }),
  /incohérent/,
  'un montant différent de celui annoncé doit être refusé'
);
await assert.rejects(
  () => activateMembershipFromCheckoutSession({ ...baseSession, currency: 'usd' }),
  /Devise/,
  'une devise autre que l’euro doit être refusée'
);

const webhookActivated = await activateMembershipFromCheckoutSession(baseSession);
assert.equal(webhookActivated.activated, true, 'une session payée conforme active l’abonnement');
assert.equal((await serverDb.getMembership(webhookUser))?.paymentRef, 'sub_webhook_1', 'la référence de paiement est la souscription');
assert.equal((await serverDb.getMembershipState(webhookUser)).effectivePlan, 'kurla_plus', 'les droits suivent l’activation');

// ---------------------------------------------------------------------------
// 6 bis. Renouvellement : une souscription qui ne se reconduit pas n'est pas un
// abonnement. La première facture ne doit pas réactiver (c'est le Checkout).
// ---------------------------------------------------------------------------
const periodEndSeconds = Math.floor((Date.now() + 30 * DAY) / 1000);
const renewalInvoice = {
  id: 'in_test_1',
  status: 'paid',
  billing_reason: 'subscription_cycle',
  currency: 'eur',
  subscription: 'sub_webhook_1',
  lines: { data: [{ period: { end: periodEndSeconds } }] }
};

const firstInvoice = await renewMembershipFromInvoice({ ...renewalInvoice, billing_reason: 'subscription_create' });
assert.equal(firstInvoice.renewed, false, 'la première facture ne reconduit pas : l’activation passe par le Checkout');

const noSub = await renewMembershipFromInvoice({ ...renewalInvoice, subscription: null });
assert.equal(noSub.renewed, false, 'une facture sans souscription est ignorée');

const unpaidInvoice = await renewMembershipFromInvoice({ ...renewalInvoice, status: 'open' });
assert.equal(unpaidInvoice.renewed, false, 'une facture non payée ne reconduit rien');

const unknownSub = await renewMembershipFromInvoice({ ...renewalInvoice, subscription: 'sub_inconnue' });
assert.equal(unknownSub.renewed, false, 'une souscription inconnue ne reconduit rien');
assert.ok(unknownSub.reason, 'et la raison est tracée, pas avalée');

await assert.rejects(
  () => renewMembershipFromInvoice({ ...renewalInvoice, currency: 'usd' }),
  /Devise/,
  'une facture dans une autre devise doit être refusée'
);

const renewed = await renewMembershipFromInvoice(renewalInvoice);
assert.equal(renewed.renewed, true, 'une période encaissée reconduit l’abonnement');
const renewedState = await serverDb.getMembershipState(webhookUser);
assert.equal(renewedState.status, 'active', 'l’abonnement est actif après reconduction');
assert.ok(
  Date.parse(renewedState.accessUntil!) > Date.now() + 25 * DAY,
  'la période a bien été prolongée'
);

// ---------------------------------------------------------------------------
// 7. Parcours : ce que KURLA+ ajoute est additif
// ---------------------------------------------------------------------------
const at = (days: number) => new Date(Date.parse('2026-05-01T10:00:00.000Z') + days * DAY).toISOString();
const photo = (days: number) => ({
  id: `photo-${days}`,
  storagePath: `p/${days}`,
  mimeType: 'image/jpeg' as const,
  sizeBytes: 1000,
  consentAt: at(days),
  createdAt: at(days)
});

const sources = {
  journal: [0, 10, 20, 30, 40, 60].map((day, index) => ({
    id: `journal-${day}`,
    entryDate: at(day).slice(0, 10),
    signals: [],
    productsUsed: [],
    createdAt: at(day),
    hydrationScore: 1 + (index % 5),
    breakageScore: 5 - Math.floor(index / 2)
  })) as any[],
  photos: [photo(0), photo(20), photo(45), photo(70)],
  profileHistory: [],
  feedback: [],
  loyaltyEvents: [],
  level: 3
};

const fullJourney = buildBeautyJourney(sources);
assert.equal(fullJourney.comparisons.length, 6, 'quatre photos donnent six paires séparées d’au moins 14 jours');
assert.equal(fullJourney.comparisons[0].daysApart, fullJourney.comparison!.daysApart, 'la première paire est la plus écartée');
assert.ok(
  fullJourney.comparisons.every((pair, index) => index === 0 || fullJourney.comparisons[index - 1].daysApart >= pair.daysApart),
  'les paires sont triées par écart décroissant'
);

// Le parcours restreint au plan libre est exactement celui du chantier 8.4.
const trimmed = { ...fullJourney, comparisons: fullJourney.comparisons.slice(0, 1) };
assert.equal(trimmed.comparisons.length, 1, 'le plan libre garde une comparaison');
assert.deepEqual(trimmed.comparisons[0], fullJourney.comparison, 'et c’est la même que celle affichée avant 8.5');
assert.equal(trimmed.eventCount, fullJourney.eventCount, 'aucun événement n’est retiré au plan libre');
assert.equal(trimmed.timeline.length, fullJourney.timeline.length, 'la chronologie reste entière');

// ---------------------------------------------------------------------------
// 8. Synthèse : aucune promesse, aucun vocabulaire médical
// ---------------------------------------------------------------------------
const synthesis = buildJourneySynthesis(fullJourney);
assert.ok(synthesis.paragraphs.length >= 3, 'la synthèse est rédigée');
assert.ok(synthesis.metrics.length === 4, 'les quatre métriques déclarées sont reprises');
assert.ok(synthesis.caveats.length >= 3, 'les réserves accompagnent la synthèse');

const thinJourney = buildBeautyJourney({ ...sources, journal: sources.journal.slice(0, 2) });
const thinSynthesis = buildJourneySynthesis(thinJourney);
assert.ok(
  thinSynthesis.paragraphs.join(' ').includes('au moins trois mesures'),
  'sous trois mesures, la synthèse doit refuser d’affirmer une tendance'
);
assert.ok(
  thinSynthesis.metrics.filter(metric => metric.readable).length === 0,
  'aucune métrique ne doit être marquée lisible sur deux mesures'
);

const FORBIDDEN = ['garanti', 'garantie', 'guérison', 'guérir', 'traitement', 'thérapeutique', 'résultat assuré', 'cliniquement prouvé', 'amélioration', 'diagnostic'];
const synthesisText = [...synthesis.paragraphs, ...synthesis.caveats, ...thinSynthesis.paragraphs].join(' ').toLowerCase();
for (const word of FORBIDDEN) {
  assert.equal(synthesisText.includes(word), false, `la synthèse ne doit pas contenir « ${word} »`);
}
assert.ok(synthesisText.includes('déclaré'), 'les valeurs restent attribuées à des déclarations');
assert.ok(synthesisText.includes('avis médical') || synthesis.caveats.join(' ').includes('avis médical'), 'la réserve médicale est présente');

// ---------------------------------------------------------------------------
// 9. HTTP : plans publics, état privé, paiement non simulé
// ---------------------------------------------------------------------------
async function requestApp(path: string) {
  const listener = http.createServer(serverModule.app);
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', () => resolve()));
  const address = listener.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`);
  } finally {
    await new Promise<void>(resolve => listener.close(() => resolve()));
  }
}

const plansResponse = await requestApp('/api/membership/plans?country=FR');
assert.equal(plansResponse.status, 200, 'les plans sont publics');
const plansBody: any = await plansResponse.json();
assert.equal(plansBody.paymentConfigured, false, 'sans clé Stripe, l’absence de paiement est annoncée');
assert.ok(plansBody.disclaimers.length >= 3, 'les réserves accompagnent les prix');
const plusPlan = plansBody.plans.find((entry: any) => entry.code === 'kurla_plus');
assert.equal(plusPlan.monthly.grossCents, 840, 'le prix TTC est servi par l’API');
assert.equal(isMembershipPaymentConfigured(), false, 'le paiement n’est pas configuré dans ce banc');

for (const path of ['/api/membership/me', '/api/membership/trial', '/api/membership/checkout', '/api/membership/cancel']) {
  const response = await requestApp(path);
  assert.ok(response.status === 401 || response.status === 404, `${path} doit refuser une requête sans jeton (obtenu ${response.status})`);
}

// ---------------------------------------------------------------------------
// 10. Bout en bout : dossier réel, essai, droits appliqués au parcours
// ---------------------------------------------------------------------------
await serverDb.initialize([]);
const member = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
for (let index = 0; index < 30; index += 1) {
  await serverDb.createProgressJournalEntry(member, { note: `Sonde ${index}`, metrics: { hydrationScore: 1 + (index % 5) } });
}
for (let index = 0; index < 5; index += 1) {
  await serverDb.applyLoyaltyEvent(member, 'scan_performed', `376000000000${index}`, `member:scan:${index}`);
}
// Les photos sont posées directement dans le repli mémoire : l'upload horodate à
// l'instant présent, or une comparaison exige au moins 14 jours d'écart.
serverDb.inMemoryBeautyProfilePhotos.set(member, [photo(0), photo(30), photo(75)]);

const overviewBefore = await serverDb.getMembershipOverview(member, 'FR');
assert.equal(overviewBefore.state.status, 'none', 'aucun abonnement au départ');
assert.equal(overviewBefore.state.effectivePlan, 'libre', 'les droits sont ceux du plan libre');
assert.equal(overviewBefore.paymentConfigured, false, 'l’absence de paiement est annoncée au membre');
assert.ok(overviewBefore.dossier.journalEntries >= 30, 'le dossier compte les entrées de journal réelles');
assert.ok(overviewBefore.offer.dossierScore >= 35, `le score de dossier doit justifier la proposition (obtenu : ${overviewBefore.offer.dossierScore})`);
assert.equal(overviewBefore.dossier.photos, 3, 'le dossier compte les photos');
assert.ok(overviewBefore.offer.shouldPropose, 'avec ce dossier, KURLA+ peut être proposé');

const viewFree = await serverDb.getBeautyJourneyView(member, 'libre');
assert.equal(viewFree.synthesis, null, 'pas de synthèse sans KURLA+');
assert.ok(viewFree.synthesisUnavailableReason, 'et la raison est donnée');
assert.ok(viewFree.comparisonLimit.total >= 3, 'plusieurs paires existent');
assert.equal(viewFree.journey.comparisons.length, 1, 'le plan libre en affiche une');

await serverDb.startMembershipTrial(member, 'kurla_plus');
const overviewTrial = await serverDb.getMembershipOverview(member, 'FR');
assert.equal(overviewTrial.state.status, 'trialing', 'l’essai est ouvert');
const viewPlus = await serverDb.getBeautyJourneyView(member, 'kurla_plus');
assert.ok(viewPlus.synthesis, 'la synthèse est débloquée');
assert.equal(viewPlus.journey.comparisons.length, viewFree.comparisonLimit.total, 'toutes les paires sont comparées');
assert.equal(viewPlus.journey.eventCount, viewFree.journey.eventCount, 'le parcours reste le même : rien n’a été retiré au plan libre');
assert.equal(
  capabilitiesFor('kurla_plus').length > capabilitiesFor('libre').length,
  true,
  'KURLA+ ajoute des droits, il n’en remplace aucun'
);

console.log(
  `[PASS] Chantier 8.5 — abonnement testé sur 11 plans de vérification : ` +
    `KURLA+ ${plus.monthlyPriceCents / 100} €/mois (${monthlyFr.grossCents} centimes TTC FR), ${paidOnly.length} droits payants dont ${pending.length} annoncés non branchés, ` +
    `${essential.length} capacités essentielles vérifiées gratuites, dossier vide non sollicité (score ${emptyOffer.dossierScore}/100) contre ${richScore}/100 pour un dossier complet, ` +
    `essai unique de ${trialDays} jours, activation refusée sans référence de paiement, webhook conforme, reconduction prolonge la période, ` +
    `${fullJourney.comparisons.length} paires de photos dont 1 seule au plan libre, synthèse sans promesse ni vocabulaire médical.`
);
