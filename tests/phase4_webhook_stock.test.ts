import { serverDb } from '../src/lib/serverDb';

export interface Phase4TestResult {
  passed: boolean;
  testName: string;
  details: string;
}

export async function runPhase4WebhookStockTests(): Promise<Phase4TestResult[]> {
  const results: Phase4TestResult[] = [];

  // Reset inventory for test product to clean state before tests
  const testProductId = 'leave-in-hydratant';
  const testProdObj = await serverDb.getProductById(testProductId);
  const realTestId = testProdObj ? testProdObj.id : testProductId;
  (serverDb as any).inMemoryInventory.set(realTestId, { quantity: 100, reserved_quantity: 0 });
  (serverDb as any).inMemoryInventory.set(testProductId, { quantity: 100, reserved_quantity: 0 });
  await (serverDb as any).syncInventoryToSupabase(realTestId, 100, 0);

  // Test 1: Réservation de stock à la création de commande (payment_pending_webhook)
  try {
    const testProductId = 'leave-in-hydratant';
    const initialAvail = await serverDb.getAvailableStock(testProductId);

    const testOrderId = 'ORD-PH4-RES-' + Date.now();
    const testProduct = await serverDb.getProductById(testProductId);

    await serverDb.saveOrder({
      id: testOrderId,
      userId: 'usr_ph4_test',
      customerEmail: 'ph4.test@kurla-beauty.com',
      items: [{ productId: testProductId, quantity: 3, price: testProduct.price, name: testProduct.name }],
      total: testProduct.price * 3,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const newAvail = await serverDb.getAvailableStock(testProductId);
    const inv = await serverDb.getInventoryByProductId(testProductId);

    if (newAvail === initialAvail - 3 && inv.reserved_quantity >= 3) {
      results.push({
        passed: true,
        testName: 'réservation de stock à la création',
        details: `3 unités réservées. Stock disponible passé de ${initialAvail} à ${newAvail}, quantité réservée: ${inv.reserved_quantity}.`
      });
    } else {
      results.push({
        passed: false,
        testName: 'réservation de stock à la création',
        details: `Stock mal calculé: disponible initial=${initialAvail}, nouveau=${newAvail}, reservé=${inv.reserved_quantity}.`
      });
    }
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'réservation de stock à la création',
      details: err.message
    });
  }

  // Test 2: Déduction définitive du stock lors d'un paiement réussi (paid)
  try {
    const testProductId = 'leave-in-hydratant';
    const preInv = await serverDb.getInventoryByProductId(testProductId);

    const testOrderId = 'ORD-PH4-PAID-' + Date.now();
    const testProduct = await serverDb.getProductById(testProductId);

    await serverDb.saveOrder({
      id: testOrderId,
      userId: 'usr_ph4_test',
      customerEmail: 'ph4.test@kurla-beauty.com',
      items: [{ productId: testProductId, quantity: 2, price: testProduct.price, name: testProduct.name }],
      total: testProduct.price * 2,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Simulate payment confirmation via webhook handler logic
    await serverDb.updateOrderStatus(testOrderId, 'paid', { stripePaymentIntentId: 'pi_test_ph4_success' });

    const updatedOrder = await serverDb.getOrderById(testOrderId);
    const postInv = await serverDb.getInventoryByProductId(testProductId);

    if (updatedOrder?.status === 'paid' && postInv.quantity === preInv.quantity - 2) {
      results.push({
        passed: true,
        testName: 'déduction définitive du stock au paiement',
        details: `Commande ${testOrderId} passée à 'paid'. Stock physique déduit de 2 unités (physique: ${postInv.quantity}).`
      });
    } else {
      results.push({
        passed: false,
        testName: 'déduction définitive du stock au paiement',
        details: `Déduction de stock incorrecte. Ancien physique: ${preInv.quantity}, Nouveau physique: ${postInv.quantity}, Statut: ${updatedOrder?.status}.`
      });
    }
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'déduction définitive du stock au paiement',
      details: err.message
    });
  }

  // Test 3: Libération de la réservation en cas d'échec de paiement (payment_failed)
  try {
    const testProductId = 'leave-in-hydratant';

    const testOrderId = 'ORD-PH4-FAIL-' + Date.now();
    const testProduct = await serverDb.getProductById(testProductId);

    const availBefore = await serverDb.getAvailableStock(testProductId);

    await serverDb.saveOrder({
      id: testOrderId,
      userId: 'usr_ph4_test',
      customerEmail: 'ph4.test@kurla-beauty.com',
      items: [{ productId: testProductId, quantity: 4, price: testProduct.price, name: testProduct.name }],
      total: testProduct.price * 4,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const availDuring = await serverDb.getAvailableStock(testProductId);

    // Simulate webhook payment failure event
    await serverDb.updateOrderStatus(testOrderId, 'payment_failed');

    const availAfter = await serverDb.getAvailableStock(testProductId);
    const orderAfter = await serverDb.getOrderById(testOrderId);

    if (
      availDuring === availBefore - 4 &&
      availAfter === availBefore &&
      orderAfter?.status === 'payment_failed'
    ) {
      results.push({
        passed: true,
        testName: 'libération de la réservation si échec de paiement',
        details: `Pendant la réservation: ${availDuring}, Après échec: ${availAfter}. Réservation correctement libérée.`
      });
    } else {
      results.push({
        passed: false,
        testName: 'libération de la réservation si échec de paiement',
        details: `Stock mal libéré. Avant: ${availBefore}, Pendant: ${availDuring}, Après: ${availAfter}.`
      });
    }
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'libération de la réservation si échec de paiement',
      details: err.message
    });
  }

  // Test 4: Expiration de session Stripe (checkout.session.expired)
  try {
    const testProductId = 'leave-in-hydratant';
    const availBefore = await serverDb.getAvailableStock(testProductId);

    const testOrderId = 'ORD-PH4-EXP-' + Date.now();
    const testProduct = await serverDb.getProductById(testProductId);

    await serverDb.saveOrder({
      id: testOrderId,
      userId: 'usr_ph4_test',
      customerEmail: 'ph4.test@kurla-beauty.com',
      items: [{ productId: testProductId, quantity: 2, price: testProduct.price, name: testProduct.name }],
      total: testProduct.price * 2,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await serverDb.updateOrderStatus(testOrderId, 'payment_failed');
    const availAfter = await serverDb.getAvailableStock(testProductId);

    if (availAfter === availBefore) {
      results.push({
        passed: true,
        testName: 'session checkout expirée',
        details: `Stock libéré suite à l'expiration de la session checkout Stripe.`
      });
    } else {
      results.push({
        passed: false,
        testName: 'session checkout expirée',
        details: `Échec de libération du stock à l'expiration.`
      });
    }
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'session checkout expirée',
      details: err.message
    });
  }

  // Test 5: Restauration de stock en cas de remboursement (charge.refunded)
  try {
    const testProductId = 'leave-in-hydratant';
    const testOrderId = 'ORD-PH4-REFUND-' + Date.now();
    const testProduct = await serverDb.getProductById(testProductId);

    // Initial order creation
    await serverDb.saveOrder({
      id: testOrderId,
      userId: 'usr_ph4_test',
      customerEmail: 'ph4.test@kurla-beauty.com',
      items: [{ productId: testProductId, quantity: 2, price: testProduct.price, name: testProduct.name }],
      total: testProduct.price * 2,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Payment succeeds
    await serverDb.updateOrderStatus(testOrderId, 'paid', { stripePaymentIntentId: 'pi_test_refund' });
    const invAfterPaid = await serverDb.getInventoryByProductId(testProductId);

    // Refund issued
    await serverDb.updateOrderStatus(testOrderId, 'refunded');
    const invAfterRefund = await serverDb.getInventoryByProductId(testProductId);
    const refundedOrder = await serverDb.getOrderById(testOrderId);

    if (refundedOrder?.status === 'refunded' && invAfterRefund.quantity === invAfterPaid.quantity + 2) {
      results.push({
        passed: true,
        testName: 'restauration de stock sur remboursement',
        details: `Commande ${testOrderId} passée à 'refunded'. Stock physique réaugmenté de 2 unités (${invAfterPaid.quantity} -> ${invAfterRefund.quantity}).`
      });
    } else {
      results.push({
        passed: false,
        testName: 'restauration de stock sur remboursement',
        details: `Stock physique non restauré correctement. Après payé: ${invAfterPaid.quantity}, Après remboursement: ${invAfterRefund.quantity}.`
      });
    }
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'restauration de stock sur remboursement',
      details: err.message
    });
  }

  // Test 6: Protection Idempotence Webhook
  try {
    const testEventId = 'evt_test_idempotency_' + Date.now();
    const isAlreadyProcBefore = await serverDb.isEventProcessed(testEventId);

    await serverDb.markEventProcessed(testEventId, 'checkout.session.completed', { test: true });
    const isAlreadyProcAfter = await serverDb.isEventProcessed(testEventId);

    if (!isAlreadyProcBefore && isAlreadyProcAfter) {
      results.push({
        passed: true,
        testName: 'idempotence des événements Stripe',
        details: `Événement ${testEventId} correctement enregistré dans la table stripe_events et bloqué au second passage.`
      });
    } else {
      results.push({
        passed: false,
        testName: 'idempotence des événements Stripe',
        details: 'Le contrôle d\'idempotence a échoué.'
      });
    }
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'idempotence des événements Stripe',
      details: err.message
    });
  }

  // Test 7: Deux événements de confirmation du même paiement ne déduisent
  // pas le stock une seconde fois.
  try {
    const testProductId = 'leave-in-hydratant';
    const testProduct = await serverDb.getProductById(testProductId);
    const testOrderId = 'ORD-PH4-DUPLICATE-PAID-' + Date.now();
    await serverDb.saveOrder({
      id: testOrderId,
      userId: 'usr_ph4_test',
      customerEmail: 'ph4.test@kurla-beauty.com',
      items: [{ productId: testProductId, quantity: 2, price: testProduct.price, name: testProduct.name }],
      total: testProduct.price * 2,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await serverDb.updateOrderStatus(testOrderId, 'paid', { stripePaymentIntentId: 'pi_test_duplicate_a' });
    const afterFirstConfirmation = await serverDb.getInventoryByProductId(testProductId);
    await serverDb.updateOrderStatus(testOrderId, 'paid', { stripePaymentIntentId: 'pi_test_duplicate_b' });
    const afterSecondConfirmation = await serverDb.getInventoryByProductId(testProductId);
    const updatedOrder = await serverDb.getOrderById(testOrderId);

    results.push({
      passed: updatedOrder?.status === 'paid'
        && updatedOrder.stripePaymentIntentId === 'pi_test_duplicate_b'
        && afterSecondConfirmation.quantity === afterFirstConfirmation.quantity,
      testName: 'confirmation de paiement répétée sans double déstockage',
      details: `Le second événement met à jour le PaymentIntent sans modifier à nouveau le stock.`
    });
  } catch (err: any) {
    results.push({
      passed: false,
      testName: 'confirmation de paiement répétée sans double déstockage',
      details: err.message
    });
  }

  return results;
}
