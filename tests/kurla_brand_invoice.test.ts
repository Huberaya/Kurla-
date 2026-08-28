import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

import { serverDb } from '../src/lib/serverDb';
import { exportUserData, deleteUserData } from '../src/lib/db/privacyStore';

/**
 * CHANTIER 12 (bloc D2) — banc « facturation du contrat marque ».
 *
 * Ce qui est vérifié, parce que ce sont les façons dont une facturation rate :
 *  1. on ne facture qu'un contrat actif, et au prix du contrat — le montant
 *     n'est pas un paramètre, donc un écart est impossible ;
 *  2. `paid` ne se déclare pas : il exige un statut de paiement confirmé, la
 *     bonne devise et un montant identique ;
 *  3. une seule facture en attente par contrat ;
 *  4. le rapport k-anonyme n'est livré qu'après règlement, et le refus nomme la
 *     facture et son montant ;
 *  5. sans configuration de paiement, la route dit 503 — jamais un faux succès.
 */

const BRAND = 'brand-1';
const ADMIN = 'admin-1';

const CLAUSES = {
  acceptsAggregateOnly: true,
  acceptsNoPersonalDataTransfer: true,
  confirmsTermsVersionRead: true
};

async function runBrandInvoiceTests(): Promise<void> {
  serverDb.inMemoryBrandContracts = [];
  serverDb.inMemoryBrandInvoices = [];
  serverDb.inMemoryBrandTestRequests = [];

  const contract = await serverDb.issueBrandContract(ADMIN, {
    brandUserId: BRAND,
    brandName: 'Marque Test',
    contactEmail: 'contact@marque.test',
    priceCents: 45000
  });

  // ---------------------------------------------------------------------
  // 1. Pas de facture sans contrat actif.
  // ---------------------------------------------------------------------
  await assert.rejects(() => serverDb.issueBrandInvoice(ADMIN, contract.id), /Seul un contrat actif/);

  await serverDb.signBrandContract(BRAND, contract.id, CLAUSES);
  await assert.rejects(() => serverDb.issueBrandInvoice(ADMIN, contract.id), /Seul un contrat actif/,
    'la signature de la marque seule ne suffit pas à facturer');
  await serverDb.countersignBrandContract(ADMIN, contract.id);

  const invoice = await serverDb.issueBrandInvoice(ADMIN, contract.id);
  assert.equal(invoice.status, 'pending');
  assert.equal(invoice.amountCents, 45000, 'le montant doit être celui du contrat signé');
  assert.match(invoice.invoiceNumber, /^KURLA-B2B-\d{6}-[0-9A-F]{8}$/);

  // Une seconde facture en attente est refusée.
  await assert.rejects(() => serverDb.issueBrandInvoice(ADMIN, contract.id), /déjà en attente/);

  // ---------------------------------------------------------------------
  // 2. « Réglée » exige une preuve, pas une déclaration.
  // ---------------------------------------------------------------------
  await assert.rejects(
    () => serverDb.markBrandInvoicePaidFromSession({ invoiceId: invoice.id, amountTotalCents: 45000, currency: 'eur', paymentStatus: 'unpaid' }),
    /Paiement non confirmé/
  );
  await assert.rejects(
    () => serverDb.markBrandInvoicePaidFromSession({ invoiceId: invoice.id, amountTotalCents: 1, currency: 'eur', paymentStatus: 'paid' }),
    /Montant incohérent/
  );
  await assert.rejects(
    () => serverDb.markBrandInvoicePaidFromSession({ invoiceId: invoice.id, amountTotalCents: 45000, currency: 'usd', paymentStatus: 'paid' }),
    /Devise incohérente/
  );

  // Le rapport n'est toujours pas livré.
  const accessBefore = await serverDb.resolveBrandReportAccess(contract.id);
  assert.equal(accessBefore.allowed, false);
  assert.match(accessBefore.reason || '', /en attente de règlement/);
  assert.equal(accessBefore.amountCents, 45000);

  const paid = await serverDb.markBrandInvoicePaidFromSession({
    invoiceId: invoice.id,
    amountTotalCents: 45000,
    currency: 'eur',
    paymentStatus: 'paid',
    sessionId: 'cs_test_123',
    paymentIntentId: 'pi_test_123'
  });
  assert.equal(paid.status, 'paid');
  assert.ok(paid.paidAt);
  assert.equal(paid.stripeSessionId, 'cs_test_123');

  const accessAfter = await serverDb.resolveBrandReportAccess(contract.id);
  assert.equal(accessAfter.allowed, true);
  assert.equal(accessAfter.invoiceId, invoice.id);

  // Une facture réglée ne s'annule pas.
  await assert.rejects(() => serverDb.voidBrandInvoice(invoice.id, 'erreur de saisie'), /ne s’annule pas/);

  // ---------------------------------------------------------------------
  // 3. Contrat sans prix : aucune facture possible.
  // ---------------------------------------------------------------------
  const freeContract = await serverDb.issueBrandContract(ADMIN, {
    brandUserId: 'brand-2',
    brandName: 'Marque Sans Prix',
    contactEmail: 'contact@sansprix.test'
  });
  await serverDb.signBrandContract('brand-2', freeContract.id, CLAUSES);
  await serverDb.countersignBrandContract(ADMIN, freeContract.id);
  await assert.rejects(() => serverDb.issueBrandInvoice(ADMIN, freeContract.id), /aucun prix/);

  // ---------------------------------------------------------------------
  // 4. Une nouvelle facture est émissible une fois la précédente réglée, et
  //    son annulation est tracée. Le règlement acquis ne disparaît pas.
  // ---------------------------------------------------------------------
  const secondInvoice = await serverDb.issueBrandInvoice(ADMIN, contract.id);
  assert.equal(secondInvoice.status, 'pending');
  await assert.rejects(() => serverDb.voidBrandInvoice(secondInvoice.id, 'x'), /motif d’annulation/);
  const voided = await serverDb.voidBrandInvoice(secondInvoice.id, 'Demande de la marque, test reporté.');
  assert.equal(voided.status, 'void');
  assert.ok(voided.voidedAt);

  const accessAfterVoid = await serverDb.resolveBrandReportAccess(contract.id);
  assert.equal(accessAfterVoid.allowed, true, 'annuler une facture en attente ne retire pas un règlement déjà acquis');

  // ---------------------------------------------------------------------
  // 5. RGPD : les factures sortent à l'export et partent à la suppression.
  // ---------------------------------------------------------------------
  const exported = await exportUserData(serverDb, BRAND);
  const exportedInvoices = exported.sections.brandInvoices as Array<{ status: string }>;
  assert.equal(exportedInvoices.length, 2, 'la facture réglée et la facture annulée sont toutes deux des données du compte');
  assert.ok(exportedInvoices.some(item => item.status === 'paid'));
  assert.ok(exportedInvoices.some(item => item.status === 'void'));
  assert.deepEqual(exported.exportErrors, []);

  await deleteUserData(serverDb, BRAND);
  assert.equal(serverDb.inMemoryBrandInvoices.some(item => item.brandUserId === BRAND), false);

  // ---------------------------------------------------------------------
  // 6. Routes : écriture authentifiée, paiement indisponible dit 503.
  // ---------------------------------------------------------------------
  const listener = (await import('../server')).app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    listener.once('listening', () => resolve());
    listener.once('error', reject);
  });

  try {
    const { port } = listener.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const issue = await fetch(`${baseUrl}/api/admin/brand-contracts/${contract.id}/invoices`, { method: 'POST' });
    assert.equal(issue.status, 401);

    const mine = await fetch(`${baseUrl}/api/brand-invoices/mine`);
    assert.equal(mine.status, 401);

    const checkout = await fetch(`${baseUrl}/api/brand-invoices/${invoice.id}/checkout`, { method: 'POST' });
    assert.equal(checkout.status, 401);

    const voidRoute = await fetch(`${baseUrl}/api/admin/brand-invoices/${invoice.id}/void`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'test' })
    });
    assert.equal(voidRoute.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => listener.close(error => (error ? reject(error) : resolve())));
  }

  console.log('[PASS] Facturation banc : montant copié du contrat, « réglée » exige une preuve Stripe, rapport livré après règlement, facture couverte par le RGPD.');
}

runBrandInvoiceTests().catch(error => {
  console.error('[FAIL] Facturation banc :', error);
  process.exitCode = 1;
});
