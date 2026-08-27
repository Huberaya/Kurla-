import { strict as assert } from 'node:assert';
import {
  agreementRate,
  assessProfessionalTrust,
  isBookable,
  MINIMUM_ENDORSEMENTS_FOR_RATE,
  MINIMUM_REVIEWS_FOR_RATING,
  ProfessionalTrustInput,
  summarizeRealReviews
} from '../src/lib/professionalTrust';
import {
  annualCostOf,
  compareRoutines,
  simulateAnnualCost
} from '../src/lib/routineEconomics';
import { randomUUID } from 'node:crypto';
import { professionalStore } from '../src/lib/professionalStore';
import { getSupabaseServerClient } from '../src/lib/supabaseClient';

const base: ProfessionalTrustInput = {
  professionalId: 'pro-1',
  identityVerified: false,
  qualificationOnFile: false,
  charterAccepted: false,
  reviewRatings: []
};

async function runChantierBTests() {
  // ==================================================================
  // TRUST SCORE PROFESSIONNEL
  // ==================================================================

  // ------------------------------------------------------------------
  // 1. Les poids somment à 100, un professionnel complet obtient 100
  // ------------------------------------------------------------------
  {
    const full = assessProfessionalTrust({
      ...base,
      identityVerified: true,
      identityVerifiedAt: '2026-01-01T00:00:00.000Z',
      qualificationOnFile: true,
      qualificationLabel: 'BP Coiffure',
      charterAccepted: true,
      reviewRatings: Array.from({ length: MINIMUM_REVIEWS_FOR_RATING }, () => 5),
      endorsementStats: { total: MINIMUM_ENDORSEMENTS_FOR_RATE, approved: MINIMUM_ENDORSEMENTS_FOR_RATE }
    });

    assert.equal(full.score, 100, 'un professionnel complet doit obtenir 100');
    assert.equal(full.publishable, true);
    const weightSum = full.components.reduce((sum, component) => sum + component.weight, 0);
    assert.equal(weightSum, 100, 'les poids doivent sommer à 100');
    assert.equal(full.components.length, 5, 'les 5 composantes doivent être restituées');
  }

  // ------------------------------------------------------------------
  // 2. Sans identité vérifiée, rien n'est publié — score null, pas 0
  // ------------------------------------------------------------------
  {
    const anonymous = assessProfessionalTrust({
      ...base,
      qualificationOnFile: true,
      charterAccepted: true,
      reviewRatings: Array.from({ length: 20 }, () => 5)
    });

    assert.equal(anonymous.publishable, false);
    assert.equal(anonymous.score, null, 'un score non publié doit être null, jamais 0');
    assert.equal(isBookable(anonymous), false, 'un professionnel non vérifié n’est pas réservable');
    assert.ok(
      anonymous.statement.includes('Identité non vérifiée'),
      'la raison de non-publication doit être explicite'
    );
  }

  // ------------------------------------------------------------------
  // 3. publishable dépend de l'identité seule, pas du diplôme
  // ------------------------------------------------------------------
  {
    const noDiploma = assessProfessionalTrust({
      ...base,
      identityVerified: true,
      identityVerifiedAt: '2026-01-01T00:00:00.000Z'
    });

    assert.equal(noDiploma.publishable, true, 'l’identité vérifiée suffit à publier');
    assert.equal(noDiploma.score, 30, 'seule l’identité (30 points) est satisfaite');
    assert.ok(
      noDiploma.limitations.some(limitation => limitation.includes('autodidactes')),
      'l’absence de diplôme ne doit jamais être présentée comme une incompétence'
    );
  }

  // ------------------------------------------------------------------
  // 4. summarizeRealReviews prend des notes, filtre les valeurs hors bornes
  // ------------------------------------------------------------------
  {
    const summary = summarizeRealReviews([5, 5, 1, 1, 1]);
    assert.equal(summary.count, 5);
    assert.equal(summary.average, 2.6);
    assert.equal(summary.publishable, true);
  }

  {
    const filtered = summarizeRealReviews([5, 9, 0, 5, 5, 5, 5]);
    assert.equal(filtered.count, 5, 'les notes hors de 1..5 doivent être écartées');
  }

  {
    const scarce = summarizeRealReviews([5, 5]);
    assert.equal(scarce.count, 2);
    assert.equal(scarce.average, null, 'sous le seuil la moyenne doit être supprimée');
    assert.equal(scarce.publishable, false);
    assert.ok(scarce.suppressionReason?.includes('seuil'), 'la raison de suppression doit être donnée');
  }

  // ------------------------------------------------------------------
  // 5. Taux d'accord avec l'IA : jamais une moyenne globale, jamais sous le seuil
  // ------------------------------------------------------------------
  {
    assert.equal(agreementRate(undefined).rate, null, 'sans co-signature le taux doit être null');
    assert.equal(agreementRate({ total: 0, approved: 0 }).rate, null);
    assert.equal(agreementRate({ total: 3, approved: 1 }).publishable, false, 'sous le seuil, non publié');
    assert.equal(agreementRate({ total: 3, approved: 1 }).rate, null);
  }

  {
    const half = agreementRate({
      total: MINIMUM_ENDORSEMENTS_FOR_RATE,
      approved: MINIMUM_ENDORSEMENTS_FOR_RATE / 2
    });
    assert.equal(half.rate, 0.5);
    assert.equal(half.publishable, true);
    assert.ok(half.detail.includes('50 %'), 'le taux réel doit être affiché');
  }

  // ------------------------------------------------------------------
  // 6. Chaque composante est restituée avec une explication lisible
  // ------------------------------------------------------------------
  {
    const minimal = assessProfessionalTrust({
      ...base,
      identityVerified: true,
      identityVerifiedAt: '2026-01-01T00:00:00.000Z'
    });

    assert.ok(
      minimal.components.every(component => typeof component.detail === 'string' && component.detail.length > 0),
      'chaque composante doit porter une explication, satisfaite ou non'
    );
    assert.ok(minimal.limitations.length > 0, 'les limitations ne doivent jamais être vides');
    assert.ok(minimal.statement.includes('Manque'), 'ce qui manque doit être nommé');
  }

  // ------------------------------------------------------------------
  // 7. La composante avis suit le seuil, et la note n'est jamais inventée
  // ------------------------------------------------------------------
  {
    const fewReviews = assessProfessionalTrust({ ...base, identityVerified: true, reviewRatings: [5, 5] });
    const realReviews = fewReviews.components.find(component => component.key === 'real_reviews');
    assert.ok(realReviews && !realReviews.satisfied, 'sous le seuil la composante avis n’est pas satisfaite');
    assert.equal(fewReviews.reviews.average, null);
    assert.equal(fewReviews.reviews.publishable, false);
  }

  {
    const enoughReviews = assessProfessionalTrust({
      ...base,
      identityVerified: true,
      reviewRatings: Array.from({ length: MINIMUM_REVIEWS_FOR_RATING }, () => 5)
    });
    assert.equal(enoughReviews.reviews.average, 5);
    assert.equal(enoughReviews.reviews.publishable, true);
    assert.ok(enoughReviews.components.find(component => component.key === 'real_reviews')?.satisfied);
  }

  // ------------------------------------------------------------------
  // 8. Réservable = identité vérifiée, séparé du score
  // ------------------------------------------------------------------
  {
    assert.equal(isBookable({ publishable: true }), true);
    assert.equal(isBookable({ publishable: false }), false);
  }

  // ==================================================================
  // ÉCONOMIE DE ROUTINE
  // ==================================================================

  // ------------------------------------------------------------------
  // 9. Coût annuel à partir du rendement déclaré
  // ------------------------------------------------------------------
  {
    const sixMonths = annualCostOf({ price: 24, estimatedYield: '6 mois' });
    assert.equal(sixMonths.months, 6);
    assert.equal(sixMonths.monthly, 4);
    assert.equal(sixMonths.annual, 48, '24 € pour 6 mois -> 48 € par an');
  }

  {
    // 3 semaines < 1 mois : le produit le moins cher en rayon coûte le plus cher à l'année
    const threeWeeks = annualCostOf({ price: 9, estimatedYield: '3 semaines' });
    assert.ok(threeWeeks.months !== null && threeWeeks.months < 1);
    assert.ok(threeWeeks.annual !== null && threeWeeks.annual > 150);
  }

  // ------------------------------------------------------------------
  // 10. Rendement non déclaré ou ambigu -> null, jamais une estimation
  // ------------------------------------------------------------------
  {
    const unknown = annualCostOf({ price: 24 });
    assert.equal(unknown.annual, null);
    assert.equal(unknown.monthly, null);
    assert.equal(unknown.months, null);
    assert.ok(unknown.limitation && unknown.limitation.length > 0, 'la limitation doit expliquer le null');
  }

  {
    assert.equal(annualCostOf({ price: 24, estimatedYield: '250 ml' }).annual, null, 'un volume n’est pas une durée');
    assert.equal(annualCostOf({ price: 24, estimatedYield: 'environ 250 ml' }).annual, null);
    assert.equal(annualCostOf({ price: 24, estimatedYield: '' }).annual, null);
  }

  // ------------------------------------------------------------------
  // 11. Le total est marqué partiel, jamais présenté comme un total
  // ------------------------------------------------------------------
  {
    const simulation = simulateAnnualCost([
      { id: 'a', label: 'Shampooing', price: 24, estimatedYield: '6 mois' },
      { id: 'b', label: 'Masque', price: 30 }
    ]);

    assert.equal(simulation.annualTotalKnown, 48, 'le total ne doit inclure que le connu');
    assert.equal(simulation.partial, true);
    assert.equal(simulation.unknownCount, 1);
    assert.equal(simulation.lines.length, 2);
    assert.equal(simulation.lines[1].annualCost, null);
    assert.ok(
      simulation.statement.includes('pas un total complet'),
      'un total partiel ne doit pas être annoncé comme un total'
    );
    assert.ok(simulation.limitations.some(limitation => limitation.includes('partiel')));
  }

  {
    const complete = simulateAnnualCost([
      { id: 'a', label: 'Shampooing', price: 24, estimatedYield: '6 mois' }
    ]);
    assert.equal(complete.partial, false);
    assert.equal(complete.unknownCount, 0);
    assert.equal(complete.monthlyTotalKnown, 4);
    assert.ok(complete.statement.includes('48.00 € par an'));
  }

  // ------------------------------------------------------------------
  // 12. Le cas contre-intuitif : le moins cher en rayon coûte plus cher à l'année
  // ------------------------------------------------------------------
  {
    const comparison = compareRoutines(
      {
        id: 'cheap',
        label: 'Routine petit prix',
        minutesPerDay: 5,
        items: [{ id: 'c1', label: 'Shampooing', price: 9, estimatedYield: '3 semaines' }]
      },
      {
        id: 'premium',
        label: 'Routine premium',
        minutesPerDay: 25,
        items: [{ id: 'p1', label: 'Shampooing', price: 24, estimatedYield: '6 mois' }]
      }
    );

    const costRow = comparison.rows.find(row => row.label === 'Coût annuel connu');
    assert.ok(costRow, 'la ligne de coût annuel doit exister');
    assert.equal(costRow.better, 'b', 'le produit le plus cher à l’achat est ici le moins cher à l’année');
    assert.ok(costRow.difference !== null && costRow.difference > 100);

    const timeRow = comparison.rows.find(row => row.label === 'Minutes par jour');
    assert.ok(timeRow);
    assert.equal(timeRow.better, 'a');
    assert.equal(timeRow.difference, 20);

    assert.ok(comparison.verdict.includes('premium'), 'le verdict doit nommer la routine la moins chère');
  }

  // ------------------------------------------------------------------
  // 13. À coût égal, aucune routine n'est désignée — et l'efficacité n'est pas jugée
  // ------------------------------------------------------------------
  {
    const equal = compareRoutines(
      { id: 'a', label: 'A', items: [{ id: 'a1', label: 'X', price: 10, estimatedYield: '2 mois' }] },
      { id: 'b', label: 'B', items: [{ id: 'b1', label: 'Y', price: 20, estimatedYield: '4 mois' }] }
    );

    const costRow = equal.rows.find(row => row.label === 'Coût annuel connu');
    assert.ok(costRow);
    assert.equal(costRow.better, 'equal', 'à coût égal, aucune routine n’est désignée moins chère');
    assert.equal(costRow.difference, 0);
    assert.ok(
      equal.limitations.some(limitation => limitation.includes('efficace')),
      'la limitation doit dire que la comparaison ne juge pas l’efficacité'
    );
  }

  // ------------------------------------------------------------------
  // 14. Comparaison impossible quand un rendement manque
  // ------------------------------------------------------------------
  {
    const incomplete = compareRoutines(
      { id: 'a', label: 'A', items: [{ id: 'a1', label: 'X', price: 10 }] },
      { id: 'b', label: 'B', items: [{ id: 'b1', label: 'Y', price: 20, estimatedYield: '4 mois' }] }
    );

    const costRow = incomplete.rows.find(row => row.label === 'Coût annuel connu');
    assert.ok(costRow);
    assert.equal(costRow.better, 'incomparable', 'sans rendement des deux côtés, pas de comparaison');
    assert.equal(costRow.difference, null);
    assert.ok(incomplete.verdict.includes('impossible'));
    assert.ok(
      incomplete.limitations.some(limitation => limitation.includes('s\'inverser')),
      'il doit être dit que la comparaison peut s’inverser une fois les rendements connus'
    );

    const unknownRow = incomplete.rows.find(row => row.label === 'Articles au rendement non déclaré');
    assert.ok(unknownRow);
    assert.equal(unknownRow.a, 1);
    assert.equal(unknownRow.b, 0);
    assert.equal(unknownRow.better, 'b');
  }

  console.log('[PASS] chantiers b professional');
}

/**
 * PAIEMENT DE PRESTATION — chemin mémoire, testable sans Supabase.
 *
 * Ce qui est vérifié ici n'est pas le happy path : c'est l'idempotence. Un
 * webhook Stripe rejoué ne doit ni créer un second paiement, ni re-dater un
 * paiement déjà confirmé.
 */
async function runServicePaymentAssertions(appointmentId: string) {

  // ------------------------------------------------------------------
  // 1. Montant invalide refusé
  // ------------------------------------------------------------------
  {
    await assert.rejects(
      professionalStore.createServicePayment({ appointmentId, amountCents: -100 }),
      /Montant invalide/,
      'un montant négatif doit être refusé'
    );
    await assert.rejects(
      professionalStore.createServicePayment({ appointmentId, amountCents: NaN }),
      /Montant invalide/,
      'un montant non numérique doit être refusé'
    );
  }

  // ------------------------------------------------------------------
  // 2. Idempotence : la même clé ne crée pas un second paiement
  // ------------------------------------------------------------------
  const idempotencyKey = `service:${appointmentId}:svc-1`;
  const first = await professionalStore.createServicePayment({
    appointmentId,
    amountCents: 4500,
    currency: 'eur',
    stripePaymentIntentId: 'pi_test_1',
    idempotencyKey
  });

  assert.equal(first.amountCents, 4500);
  assert.equal(first.currency, 'EUR', 'la devise doit être normalisée en majuscules');
  assert.equal(first.status, 'pending');

  const replayed = await professionalStore.createServicePayment({
    appointmentId,
    amountCents: 4500,
    currency: 'EUR',
    stripePaymentIntentId: 'pi_test_1',
    idempotencyKey
  });

  assert.equal(replayed.id, first.id, 'un rejeu doit retourner le paiement existant, pas en créer un second');

  {
    const all = await professionalStore.getServicePaymentsForAppointment(appointmentId);
    assert.equal(all.length, 1, 'un seul paiement doit exister après rejeu');
  }

  // ------------------------------------------------------------------
  // 3. Retrouver par PaymentIntent — la clé utilisée par un webhook
  // ------------------------------------------------------------------
  {
    const found = await professionalStore.getServicePaymentByIntent('pi_test_1');
    assert.ok(found, 'le paiement doit être retrouvable par son intent');
    assert.equal(found.id, first.id);
    assert.equal(await professionalStore.getServicePaymentByIntent('pi_inexistant'), undefined);
  }

  // ------------------------------------------------------------------
  // 4. Confirmation idempotente : paidAt n'est pas re-daté
  // ------------------------------------------------------------------
  {
    const confirmed = await professionalStore.markServicePaymentPaid(first.id, new Date('2026-08-27T10:00:00.000Z'));
    assert.ok(confirmed);
    assert.equal(confirmed.status, 'paid');
    assert.equal(confirmed.paidAt, '2026-08-27T10:00:00.000Z');

    // Webhook rejoué une heure plus tard : rien ne doit bouger.
    const replay = await professionalStore.markServicePaymentPaid(first.id, new Date('2026-08-27T11:00:00.000Z'));
    assert.ok(replay);
    assert.equal(replay.status, 'paid');
    assert.equal(replay.paidAt, '2026-08-27T10:00:00.000Z', 'un paiement déjà réglé ne doit pas être re-daté');
  }

  // ------------------------------------------------------------------
  // 5. Paiement inconnu : undefined, pas d'exception
  // ------------------------------------------------------------------
  {
    assert.equal(await professionalStore.markServicePaymentPaid('inexistant'), undefined);
  }

  // ------------------------------------------------------------------
  // 6. Deux prestations distinctes sur la même réservation restent séparées
  // ------------------------------------------------------------------
  {
    const second = await professionalStore.createServicePayment({
      appointmentId,
      amountCents: 2000,
      currency: 'EUR',
      stripePaymentIntentId: 'pi_test_2',
      idempotencyKey: `service:${appointmentId}:svc-2`
    });
    assert.notEqual(second.id, first.id, 'des clés différentes doivent créer des paiements distincts');

    const all = await professionalStore.getServicePaymentsForAppointment(appointmentId);
    assert.equal(all.length, 2);
    assert.equal(all[0].amountCents, 4500, 'les paiements doivent être triés par date de création');
  }

  console.log('[PASS] chantiers b service payment');
}

/**
 * Construit une reservation reelle lorsque le store est branche sur Supabase.
 *
 * Le banc tournait historiquement sur le chemin memoire, ou un identifiant de
 * reservation est une chaine libre. En base, `service_payments.appointment_id`
 * est un UUID dote d'une cle etrangere vers `appointments` : la chaine
 * `appt-test-1` y est refusee par `invalid input syntax for type uuid`. Le banc
 * construit donc sa propre chaine profiles -> professionnel -> prestation ->
 * reservation, puis la detruit, pour ne dependre d'aucune donnee ambiante.
 */
async function createAppointmentFixture(): Promise<{
  appointmentId: string;
  dispose: () => Promise<void>;
}> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { appointmentId: 'appt-test-1', dispose: async () => {} };
  }

  const suffix = Date.now();
  const professionalId = randomUUID();
  const serviceId = randomUUID();
  const appointmentId = randomUUID();

  // `profiles.id` porte une cle etrangere vers `auth.users` (invisible depuis
  // information_schema faute de droits sur le schema auth) : un UUID invente est
  // refuse par `profiles_id_fkey`. On cree donc de vrais comptes ; le trigger
  // `on_auth_user_created` cree leur profil public a la volee.
  const createdUsers: string[] = [];
  const accounts: Array<{ label: string; email: string }> = [
    { label: 'compte du professionnel', email: `pro-${suffix}@kurla.test` },
    { label: 'compte du client', email: `client-${suffix}@kurla.test` }
  ];
  for (const account of accounts) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: `Kurla-${suffix}-Test!`,
      email_confirm: true
    });
    if (error || !data?.user?.id) {
      throw new Error(`Fixture de reservation (${account.label}) impossible a creer: ${error?.message || 'utilisateur absent'}`);
    }
    createdUsers.push(data.user.id);
  }
  const [professionalUserId, clientUserId] = createdUsers;

  // Les constructeurs PostgREST sont thenables sans etre de vrais Promise : le
  // type annonce est donc PromiseLike, seule forme commune exploitable ici.
  type InsertResult = { error: { message: string } | null };
  const inserts: Array<{ label: string; insert: () => PromiseLike<InsertResult> }> = [
    {
      label: 'fiche professionnelle',
      insert: () => supabase.from('professional_profiles').insert({
        id: professionalId,
        user_id: professionalUserId,
        display_name: `Professionnel de test ${suffix}`,
        city: 'Paris',
        profession: 'Coiffeuse'
      })
    },
    {
      label: 'prestation',
      insert: () => supabase.from('professional_services').insert({
        id: serviceId,
        professional_id: professionalId,
        name: 'Soin de test',
        duration_minutes: 60,
        price_cents: 4500
      })
    },
    {
      label: 'reservation',
      insert: () => supabase.from('appointments').insert({
        id: appointmentId,
        professional_id: professionalId,
        client_user_id: clientUserId,
        service_id: serviceId,
        scheduled_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        duration_minutes: 60
      })
    }
  ];

  for (const step of inserts) {
    const { error } = await step.insert();
    if (error) throw new Error(`Fixture de reservation (${step.label}) impossible a creer: ${error.message}`);
  }

  return {
    appointmentId,
    dispose: async () => {
      // Ordre inverse des cles etrangeres. `appointments.professional_id` est en
      // RESTRICT : la reservation doit disparaitre avant la fiche professionnelle.
      const cleanup: Array<[string, string, string]> = [
        ['service_payments', 'appointment_id', appointmentId],
        ['appointments', 'id', appointmentId],
        ['professional_services', 'id', serviceId],
        ['professional_profiles', 'id', professionalId]
      ];
      for (const [table, column, value] of cleanup) {
        const { error } = await supabase.from(table).delete().eq(column, value);
        if (error) console.error(`[AVERTISSEMENT] nettoyage de ${table}: ${error.message}`);
      }
      // Supprimer les comptes entraine leurs profils en cascade.
      for (const userId of createdUsers) {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) console.error(`[AVERTISSEMENT] nettoyage du compte ${userId}: ${error.message}`);
      }
    }
  };
}

async function runServicePaymentTests() {
  const { appointmentId, dispose } = await createAppointmentFixture();
  try {
    await runServicePaymentAssertions(appointmentId);
  } finally {
    await dispose();
  }
}

runChantierBTests()
  .then(runServicePaymentTests)
  .catch(error => {
    console.error('[FAIL] chantiers b professional', error);
    process.exitCode = 1;
  });
