/**
 * CHANTIER « RÉCONCILIATION DES PAIEMENTS » — l'argent encaissé fait foi.
 *
 * Constat en production le 2026-09-05 : 38 commandes sur 39 bloquées à
 * « payment_pending_webhook ». Le webhook Stripe était le seul chemin vers
 * « payé » ; la page de confirmation se contentait de lire le statut.
 *
 * Un webhook manqué — déploiement en cours, indisponibilité, secret tourné —
 * et la cliente a payé pendant que sa commande restait en attente : pas
 * d'expédition, pas d'e-mail, rien dans l'administration.
 *
 * Ce banc vérifie que la confirmation est possible par un autre chemin, et
 * qu'aucune de ces portes ne s'ouvre à tort : on ne marque pas payée une
 * session qui ne l'est pas, on ne rejoue pas deux fois les effets, et on
 * n'écrase pas un remboursement.
 */
import { strict as assert } from 'node:assert';
import { serverDb } from '../src/lib/serverDb';
import { confirmOrderPaidFromCheckoutSession } from '../src/server/payments/reconcileCheckout';

await serverDb.initialize([]);

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ✓ ${label}`);
};

interface SessionOptions {
  id?: string;
  orderId?: string;
  amountCents?: number;
  currency?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'no_payment_required';
  sessionStatus?: 'complete' | 'expired' | 'open';
  paymentIntent?: string;
}

function session(options: SessionOptions): any {
  const orderId = options.orderId ?? 'ORD-RECONCILE-1';
  return {
    id: options.id ?? 'cs_test_reconcile_1',
    object: 'checkout.session',
    status: options.sessionStatus ?? 'complete',
    payment_status: options.paymentStatus ?? 'paid',
    amount_total: options.amountCents ?? 1490,
    currency: options.currency ?? 'eur',
    payment_intent: options.paymentIntent ?? 'pi_test_reconcile_1',
    metadata: { orderId }
  };
}

async function saveOrder(id: string, status: string, total = 14.9) {
  await serverDb.saveOrder({
    id,
    userId: 'usr_reconcile_test',
    customerEmail: 'reconcile.test@kurla-beauty.com',
    items: [{ productId: 'leave-in-hydratant', quantity: 1, price: total, name: 'Leave-In test' }],
    total,
    status: status as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any);
}

const readStatus = async (orderId: string) => {
  const order = await serverDb.findOrder({ orderId });
  return order?.status;
};

// ——— 1. Une session payée rattrape une commande restée en attente ———
{
  await saveOrder('ORD-RECONCILE-1', 'payment_pending_webhook');
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-1') o.stripeSessionId = 'cs_test_reconcile_1';
  });

  const result = await confirmOrderPaidFromCheckoutSession(session({}));
  assert.equal(result.outcome, 'paid', 'une session payée doit marquer la commande payée');
  assert.equal(await readStatus('ORD-RECONCILE-1'), 'paid');
  ok('webhook manqué, cliente redirigée : la commande devient payée');
}

// ——— 2. Idempotence : rejouer ne rejoue pas les effets ———
{
  const again = await confirmOrderPaidFromCheckoutSession(session({}));
  assert.equal(again.outcome, 'already_paid');
  assert.equal(await readStatus('ORD-RECONCILE-1'), 'paid');
  ok('la même session rejouée ne décompte rien deux fois');
}

// ——— 3. Montant différent : on n'écrit rien ———
{
  await saveOrder('ORD-RECONCILE-2', 'payment_pending_webhook', 29.9);
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-2') o.stripeSessionId = 'cs_test_reconcile_2';
  });

  const result = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_reconcile_2',
    orderId: 'ORD-RECONCILE-2',
    amountCents: 1490 // 14,90 € annoncés, 29,90 € attendus
  }));
  assert.equal(result.outcome, 'rejected');
  assert.equal(await readStatus('ORD-RECONCILE-2'), 'payment_pending_webhook');
  ok('montant incohérent : la commande reste en attente plutôt que d’être payée à tort');
}

// ——— 4. Devise étrangère : refus ———
{
  await saveOrder('ORD-RECONCILE-3', 'payment_pending_webhook');
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-3') o.stripeSessionId = 'cs_test_reconcile_3';
  });

  const result = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_reconcile_3',
    orderId: 'ORD-RECONCILE-3',
    currency: 'usd'
  }));
  assert.equal(result.outcome, 'rejected');
  assert.equal(await readStatus('ORD-RECONCILE-3'), 'payment_pending_webhook');
  ok('devise incohérente : refus, la commande n’est pas marquée payée');
}

// ——— 5. Session non payée : checkout abandonné, pas un incident ———
{
  await saveOrder('ORD-RECONCILE-4', 'payment_pending_webhook');
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-4') o.stripeSessionId = 'cs_test_reconcile_4';
  });

  const result = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_reconcile_4',
    orderId: 'ORD-RECONCILE-4',
    paymentStatus: 'unpaid'
  }));
  assert.equal(result.outcome, 'unpaid');
  assert.equal(await readStatus('ORD-RECONCILE-4'), 'payment_pending_webhook');
  ok('panier abandonné : aucun paiement inventé');
}

// ——— 6. Session expirée : signalée, jamais marquée payée ———
{
  await saveOrder('ORD-RECONCILE-5', 'payment_pending_webhook');
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-5') o.stripeSessionId = 'cs_test_reconcile_5';
  });

  const result = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_reconcile_5',
    orderId: 'ORD-RECONCILE-5',
    paymentStatus: 'unpaid',
    sessionStatus: 'expired'
  }));
  assert.equal(result.outcome, 'expired');
  assert.equal(await readStatus('ORD-RECONCILE-5'), 'payment_pending_webhook');
  ok('session expirée : identifiée comme telle, jamais confirmée');
}

// ——— 7. Un remboursement n'est jamais écrasé par un paiement tardif ———
{
  await saveOrder('ORD-RECONCILE-6', 'refunded');
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-6') o.stripeSessionId = 'cs_test_reconcile_6';
  });

  const result = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_reconcile_6',
    orderId: 'ORD-RECONCILE-6'
  }));
  assert.equal(result.outcome, 'status_locked');
  assert.equal(await readStatus('ORD-RECONCILE-6'), 'refunded');
  ok('commande remboursée : une confirmation tardive ne la repasse pas en payée');
}

// ——— 8. Aucune commande, et session appartenant à une autre commande ———
{
  const orphan = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_inconnu',
    orderId: 'ORD-INTROUVABLE'
  }));
  assert.equal(orphan.outcome, 'no_order');

  await saveOrder('ORD-RECONCILE-7', 'payment_pending_webhook');
  (serverDb as any).inMemoryOrders.forEach((o: any) => {
    if (o.id === 'ORD-RECONCILE-7') o.stripeSessionId = 'cs_test_reconcile_7';
  });

  const mismatch = await confirmOrderPaidFromCheckoutSession(session({
    id: 'cs_test_reconcile_7',
    orderId: 'ORD-AUTRE-COMMANDE'
  }));
  assert.equal(mismatch.outcome, 'rejected', 'la session doit appartenir à la commande');
  assert.equal(await readStatus('ORD-RECONCILE-7'), 'payment_pending_webhook');
  ok('session inconnue ou étrangère : aucune écriture');
}

console.log(`\nCHANTIER RÉCONCILIATION PAIEMENTS — ${checks} contrôles passés.\n`);
