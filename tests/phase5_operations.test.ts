import fs from 'fs';
import path from 'path';
import { serverDb } from '../src/lib/serverDb';
import { shippingService } from '../src/lib/shippingService';

export interface Phase5TestResult {
  testId: number;
  testName: string;
  passed: boolean;
  details: string;
}

export async function runPhase5OperationsTests(): Promise<Phase5TestResult[]> {
  const results: Phase5TestResult[] = [];
  const userA = 'user_a_phase5_' + Date.now();
  const userB = 'user_b_phase5_' + Date.now();
  const emailA = 'user.a@kurla.com';
  const orderId = 'ORD-P5-' + Date.now();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Test 1: Création commande & 1er statut
  try {
    const order = await serverDb.saveOrder({
      id: orderId,
      userId: userA,
      customerEmail: emailA,
      items: [{ productId: 'leave-in-hydratant', quantity: 2, price: 24, name: 'Leave-In Hydratant' }],
      total: 48,
      status: 'payment_pending_webhook',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const history = await serverDb.getOrderStatusHistory(orderId);
    results.push({
      testId: 1,
      testName: 'Création commande et premier statut',
      passed: order.status === 'payment_pending_webhook' && history.length >= 1,
      details: `Commande créée #${order.id} avec statut ${order.status} et ${history.length} entrée(s) d'historique.`
    });
  } catch (err: any) {
    results.push({ testId: 1, testName: 'Création commande et premier statut', passed: false, details: err.message });
  }

  // Test 2: Notification "commande reçue" et log d'email
  try {
    const notif = await serverDb.sendNotification(userA, 'order_created', 'Commande reçue', `Commande #${orderId} enregistrée.`, `/account?tab=orders`, orderId);
    const emailResult = await serverDb.sendTransactionalEmail({
      to: emailA,
      subject: `[KURLA BEAUTY] Commande #${orderId} reçue`,
      template: 'order_created',
      data: { orderId, total: 48 }
    }, userA, notif.id);
    const deliveryLogs = await serverDb.getNotificationDeliveryLogs(userA);
    results.push({
      testId: 2,
      testName: 'Notification et log email transactionnel',
      passed: uuidPattern.test(notif.id)
        && emailResult.success
        && emailResult.delivered === false
        && emailResult.status === 'logged'
        && deliveryLogs.some(log => log.channel === 'email' && log.status === 'logged' && log.provider === 'console'),
      details: `Notification in-app créée avec UUID (#${notif.id}) ; email provider console journalisé explicitement comme non envoyé.`
    });
  } catch (err: any) {
    results.push({ testId: 2, testName: 'Notification et log email transactionnel', passed: false, details: err.message });
  }

  // Test 3: Passage à paid, mise à jour stock & notification
  try {
    const pBefore = await serverDb.getProductById('leave-in-hydratant');
    const inventoryBefore = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qBefore = pBefore?.stockQuantity ?? inventoryBefore.quantity;
    await serverDb.updateOrderStatus(orderId, 'paid');
    const pAfter = await serverDb.getProductById('leave-in-hydratant');
    const inventoryAfter = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qAfter = pAfter?.stockQuantity ?? inventoryAfter.quantity;
    const notifs = await serverDb.getNotifications(userA);

    results.push({
      testId: 3,
      testName: 'Statut PAID & déstockage',
      passed: qAfter === Math.max(0, qBefore - 2) && notifs.some(n => n.type === 'payment_confirmed'),
      details: `Stock mis à jour (${qBefore} -> ${qAfter}), notification payment_confirmed déclenchée.`
    });
  } catch (err: any) {
    results.push({ testId: 3, testName: 'Statut PAID & déstockage', passed: false, details: err.message });
  }

  // Test 4: Passage à processing
  try {
    await serverDb.updateOrderStatus(orderId, 'processing', { reason: 'Préparation en entrepôt' });
    const order = await serverDb.getOrderById(orderId);
    results.push({
      testId: 4,
      testName: 'Statut PROCESSING',
      passed: order?.status === 'processing',
      details: `Commande #${orderId} passée en PROCESSING.`
    });
  } catch (err: any) {
    results.push({ testId: 4, testName: 'Statut PROCESSING', passed: false, details: err.message });
  }

  // Test 5: Passage à packed
  try {
    await serverDb.updateOrderStatus(orderId, 'packed', { reason: 'Colis emballé' });
    const order = await serverDb.getOrderById(orderId);
    results.push({
      testId: 5,
      testName: 'Statut PACKED',
      passed: order?.status === 'packed',
      details: `Commande #${orderId} passée en PACKED.`
    });
  } catch (err: any) {
    results.push({ testId: 5, testName: 'Statut PACKED', passed: false, details: err.message });
  }

  // Test 6: Passage à shipped avec tracking number
  try {
    // Manual mode never fabricates a tracking number: this simulates the real
    // identifier entered by an operator after receiving it from Colissimo.
    const trackNum = '8A12345678901';
    const trackUrl = shippingService.generateTrackingUrl('colissimo', trackNum);
    const shipment = await serverDb.upsertShipment({
      id: `ship-${Date.now()}`,
      orderId,
      userId: userA,
      carrier: 'colissimo',
      method: 'Colissimo Domicile',
      price: 4.90,
      trackingNumber: trackNum,
      trackingUrl: trackUrl,
      status: 'shipped',
      shippedAt: new Date().toISOString()
    });
    await serverDb.updateOrderStatus(orderId, 'shipped');

    results.push({
      testId: 6,
      testName: 'Statut SHIPPED avec suivi transporteur',
      passed: !!shipment?.trackingNumber && shipment.trackingNumber.length > 0 && shipment.carrier === 'colissimo' && uuidPattern.test(shipment.id),
      details: `Expédié via ${shipment.carrier} avec UUID ${shipment.id}, N°: ${shipment.trackingNumber} (${shipment.trackingUrl}).`
    });
  } catch (err: any) {
    results.push({ testId: 6, testName: 'Statut SHIPPED avec suivi transporteur', passed: false, details: err.message });
  }

  // Test 7: Passage à delivered
  try {
    await serverDb.updateOrderStatus(orderId, 'delivered');
    const shipment = await serverDb.getShipmentByOrderId(orderId);
    const order = await serverDb.getOrderById(orderId);
    results.push({
      testId: 7,
      testName: 'Statut DELIVERED',
      passed: order?.status === 'delivered',
      details: `Commande livrée avec succès (#${orderId}).`
    });
  } catch (err: any) {
    results.push({ testId: 7, testName: 'Statut DELIVERED', passed: false, details: err.message });
  }

  // Test 8: Rejet de transition invalide (delivered -> pending_payment)
  try {
    let thrown = false;
    try {
      await serverDb.updateOrderStatus(orderId, 'pending_payment');
    } catch (e: any) {
      thrown = true;
    }
    results.push({
      testId: 8,
      testName: 'Rejet transition de statut invalide',
      passed: thrown,
      details: thrown ? 'Transition delivered -> pending_payment correctement rejetée.' : 'ERREUR: La transition invalide a été acceptée !'
    });
  } catch (err: any) {
    results.push({ testId: 8, testName: 'Rejet transition de statut invalide', passed: false, details: err.message });
  }

  // Test 9: Demande de retour par le client
  let returnId = '';
  let refundIdForRetry = '';
  try {
    const ret = await serverDb.createReturnRequest(userA, orderId, 'Produit non adapté', [{ productId: 'leave-in-hydratant', quantity: 1 }]);
    returnId = ret.id;
    results.push({
      testId: 9,
      testName: 'Demande de retour client',
      passed: ret.status === 'requested' && ret.quantity === 1 && uuidPattern.test(ret.id),
      details: `Demande de retour #${ret.id} enregistrée avec UUID valide.`
    });
  } catch (err: any) {
    results.push({ testId: 9, testName: 'Demande de retour client', passed: false, details: err.message });
  }

  // Test 10: Acceptation du retour par l'admin
  try {
    const updated = await serverDb.updateReturnStatus(returnId, 'approved', 'Retour accepté par le service client.');
    await serverDb.updateReturnStatus(returnId, 'received', 'Réception physique confirmée.');
    results.push({
      testId: 10,
      testName: 'Validation retour par Admin',
      passed: updated?.status === 'approved',
      details: `Retour #${returnId} approuvé par l'administrateur.`
    });
  } catch (err: any) {
    results.push({ testId: 10, testName: 'Validation retour par Admin', passed: false, details: err.message });
  }

  // Test 11 & 12: Remboursement Stripe test & réintégration au stock
  try {
    const pBefore = await serverDb.getProductById('leave-in-hydratant');
    const inventoryBefore = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qBefore = pBefore?.stockQuantity ?? inventoryBefore.quantity;

    const ref = await serverDb.processStripeRefund(orderId, returnId, 24, 'Retour approuvé');

    refundIdForRetry = ref.stripeRefundId || '';
    const pAfter = await serverDb.getProductById('leave-in-hydratant');
    const inventoryAfter = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qAfter = pAfter?.stockQuantity ?? inventoryAfter.quantity;

    results.push({
      testId: 11,
      testName: 'Remboursement Stripe test & réintégration du stock',
      passed: ref.status === 'succeeded' && qAfter === qBefore + 1,
      details: `Remboursement #${ref.id} émis (${ref.amount} EUR), une unité restaurée (${qBefore} -> ${qAfter}).`
    });

    results.push({
      testId: 12,
      testName: 'Enregistrement de la transaction de remboursement',
      passed: ref.stripeRefundId !== undefined && ref.amount === 24 && ref.stockRestored === true,
      details: `Transaction Stripe enregistrée avec ID #${ref.stripeRefundId}, stockRestored=${ref.stockRestored}.`
    });
  } catch (err: any) {
    results.push({ testId: 11, testName: 'Remboursement Stripe test & réintégration du stock', passed: false, details: err.message });
    results.push({ testId: 12, testName: 'Enregistrement de la transaction de remboursement', passed: false, details: err.message });
  }

  // Test 13: Ouverture ticket support
  let ticketId = '';
  try {
    const ticket = await serverDb.createSupportTicket(userA, orderId, 'livraison', 'Retard de livraison Colissimo', 'Mon colis est bloqué depuis 2 jours.');
    ticketId = ticket.id;
    results.push({
      testId: 13,
      testName: 'Création ticket support client',
      passed: ticket.status === 'open' && ticket.subjectCategory === 'livraison' && uuidPattern.test(ticket.id),
      details: `Ticket support #${ticket.id} créé avec UUID valide.`
    });
  } catch (err: any) {
    results.push({ testId: 13, testName: 'Création ticket support client', passed: false, details: err.message });
  }

  // Test 14: Message client sur ticket
  try {
    const msg = await serverDb.addSupportMessage(ticketId, userA, 'customer', 'Voici mon numéro d accusé de réception.');
    results.push({
      testId: 14,
      testName: 'Message client sur ticket support',
      passed: msg.senderRole === 'customer' && uuidPattern.test(msg.id),
      details: `Message client ${msg.id} ajouté à #${ticketId}.`
    });
  } catch (err: any) {
    results.push({ testId: 14, testName: 'Message client sur ticket support', passed: false, details: err.message });
  }

  // Test 15: Réponse Admin au ticket support
  try {
    const msg = await serverDb.addSupportMessage(ticketId, 'admin_user', 'admin', 'Bonjour, nous avons contacté le transporteur. Il sera livré aujourd hui.');
    const tickets = await serverDb.getSupportTicketsByUser(userA);
    const updated = tickets.find(t => t.id === ticketId);

    results.push({
      testId: 15,
      testName: 'Réponse Admin au ticket support',
      passed: msg.senderRole === 'admin' && updated?.status === 'in_progress',
      details: `Réponse admin postée, statut du ticket passé à in_progress.`
    });
  } catch (err: any) {
    results.push({ testId: 15, testName: 'Réponse Admin au ticket support', passed: false, details: err.message });
  }

  // Test 16: Clôture du ticket & notification
  try {
    await serverDb.updateSupportTicketStatus(ticketId, 'resolved');
    const tickets = await serverDb.getSupportTicketsByUser(userA);
    const updated = tickets.find(t => t.id === ticketId);
    results.push({
      testId: 16,
      testName: 'Fermeture ticket & vérification statut',
      passed: updated?.status === 'resolved',
      details: `Ticket #${ticketId} résolu avec succès.`
    });
  } catch (err: any) {
    results.push({ testId: 16, testName: 'Fermeture ticket & vérification statut', passed: false, details: err.message });
  }

  // Test 17: Modification préférences notification
  try {
    const prefs = await serverDb.updateNotificationPreferences(userA, { marketingEmails: true, inAppNotifications: true });
    results.push({
      testId: 17,
      testName: 'Mise à jour préférences de notification',
      passed: prefs.marketingEmails === true && prefs.transactionalEmails === true,
      details: `Préférences utilisateur mises à jour (marketing=true, transactional=true).`
    });
  } catch (err: any) {
    results.push({ testId: 17, testName: 'Mise à jour préférences de notification', passed: false, details: err.message });
  }

  // Test 18: Isolation notifications (User A vs User B)
  try {
    await serverDb.sendNotification(userB, 'order_received', 'Confidentiel User B', 'Accès restreint', undefined, 'ORD-B');
    const notifsA = await serverDb.getNotifications(userA);
    const notifsB = await serverDb.getNotifications(userB);

    const leaked = notifsA.some(n => n.userId === userB || n.title === 'Confidentiel User B');
    results.push({
      testId: 18,
      testName: 'Isolation des notifications entre utilisateurs',
      passed: !leaked && notifsB.length > 0,
      details: leaked ? 'FUITE DE DONNÉES DETECTÉE !' : 'Utilisateur A n a pas accès aux notifications de Utilisateur B.'
    });
  } catch (err: any) {
    results.push({ testId: 18, testName: 'Isolation des notifications entre utilisateurs', passed: false, details: err.message });
  }

  // Test 19: Isolation tickets support (User A vs User B)
  try {
    const ticketB = await serverDb.createSupportTicket(userB, undefined, 'compte', 'Ticket confidentiel B', 'Secret');
    const ticketsA = await serverDb.getSupportTicketsByUser(userA);

    const leaked = ticketsA.some(t => t.id === ticketB.id);
    results.push({
      testId: 19,
      testName: 'Isolation des tickets support entre utilisateurs',
      passed: !leaked,
      details: leaked ? 'FUITE DE TICKETS DETECTÉE !' : 'Utilisateur A n a pas accès aux tickets de Utilisateur B.'
    });
  } catch (err: any) {
    results.push({ testId: 19, testName: 'Isolation des tickets support entre utilisateurs', passed: false, details: err.message });
  }

  // Test 20: Métriques du tableau de bord commercial
  try {
    const metrics = await serverDb.getAdminAnalyticsMetrics();
    results.push({
      testId: 20,
      testName: 'Calcul métriques analytics tableau de bord commercial',
      passed: metrics.totalOrders >= 1 && typeof metrics.revenueTest === 'number' && metrics.lowStockProducts !== undefined,
      details: `Métriques: Total Commandes=${metrics.totalOrders}, Revenu=${metrics.revenueTest} EUR, Panier Moyen=${metrics.avgOrderValue.toFixed(2)} EUR.`
    });
  } catch (err: any) {
    results.push({ testId: 20, testName: 'Calcul métriques analytics tableau de bord commercial', passed: false, details: err.message });
  }

  // Test 21: Retry idempotent d'un remboursement déjà traité
  try {
    const pBeforeRetry = await serverDb.getProductById('leave-in-hydratant');
    const retry = await serverDb.processStripeRefund(orderId, returnId, 24, 'Retour approuvé');
    const pAfterRetry = await serverDb.getProductById('leave-in-hydratant');
    results.push({
      testId: 21,
      testName: 'Idempotence du remboursement et absence de double restauration',
      passed: retry.stripeRefundId === refundIdForRetry && pAfterRetry?.stockQuantity === pBeforeRetry?.stockQuantity,
      details: `Retry réutilise le remboursement ${retry.stripeRefundId} sans modifier à nouveau le stock.`
    });
  } catch (err: any) {
    results.push({ testId: 21, testName: 'Idempotence du remboursement et absence de double restauration', passed: false, details: err.message });
  }

  // Test 22: Webhook de remboursement final après un remboursement partiel
  try {
    const pBeforeWebhook = await serverDb.getProductById('leave-in-hydratant');
    const inventoryBeforeWebhook = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qBeforeWebhook = pBeforeWebhook?.stockQuantity ?? inventoryBeforeWebhook.quantity;
    const webhookRefund = await serverDb.recordStripeRefundFromWebhook(orderId, {
      eventId: `evt-refund-${Date.now()}`,
      stripeRefundId: `re_webhook_${Date.now()}`,
      amount: 48,
      currency: 'EUR'
    });
    const pAfterWebhook = await serverDb.getProductById('leave-in-hydratant');
    const inventoryAfterWebhook = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qAfterWebhook = pAfterWebhook?.stockQuantity ?? inventoryAfterWebhook.quantity;
    const duplicateWebhook = await serverDb.recordStripeRefundFromWebhook(orderId, {
      eventId: `evt-refund-${Date.now() - 1}`,
      stripeRefundId: webhookRefund.stripeRefundId,
      amount: 48,
      currency: 'EUR'
    });
    const pAfterDuplicateWebhook = await serverDb.getProductById('leave-in-hydratant');
    const inventoryAfterDuplicateWebhook = await serverDb.getInventoryByProductId('leave-in-hydratant');
    const qAfterDuplicateWebhook = pAfterDuplicateWebhook?.stockQuantity ?? inventoryAfterDuplicateWebhook.quantity;
    results.push({
      testId: 22,
      testName: 'Webhook final et restauration résiduelle idempotente',
      passed: webhookRefund.status === 'succeeded'
        && qAfterWebhook === qBeforeWebhook + 1
        && duplicateWebhook.stripeRefundId === webhookRefund.stripeRefundId
        && qAfterDuplicateWebhook === qAfterWebhook,
      details: `status=${webhookRefund.status}, stock=${qBeforeWebhook}->${qAfterWebhook}->${qAfterDuplicateWebhook}, refund=${webhookRefund.stripeRefundId}, duplicate=${duplicateWebhook.stripeRefundId}.`
    });
  } catch (err: any) {
    results.push({ testId: 22, testName: 'Webhook final et restauration résiduelle idempotente', passed: false, details: err.message });
  }

  // Test 23: Validation ownership and quantities on return requests
  try {
    const validationOrderId = `ORD-P5-VALIDATION-${Date.now()}`;
    await serverDb.saveOrder({
      id: validationOrderId,
      userId: userA,
      customerEmail: emailA,
      items: [{ productId: 'leave-in-hydratant', quantity: 2, price: 24, name: 'Leave-In Hydratant' }],
      total: 48,
      status: 'delivered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    let ownerRejected = false;
    let quantityRejected = false;
    try {
      await serverDb.createReturnRequest(userB, validationOrderId, 'Produit non adapté', [{ productId: 'leave-in-hydratant', quantity: 1 }]);
    } catch {
      ownerRejected = true;
    }
    try {
      await serverDb.createReturnRequest(userA, validationOrderId, 'Produit non adapté', [{ productId: 'leave-in-hydratant', quantity: 3 }]);
    } catch {
      quantityRejected = true;
    }

    results.push({
      testId: 23,
      testName: 'Validation propriétaire et quantités des retours',
      passed: ownerRejected && quantityRejected,
      details: `Accès d’un autre utilisateur rejeté=${ownerRejected}, quantité supérieure à la commande rejetée=${quantityRejected}.`
    });
  } catch (err: any) {
    results.push({ testId: 23, testName: 'Validation propriétaire et quantités des retours', passed: false, details: err.message });
  }

  // Test 24: Une commande ne conserve qu’une expédition courante
  try {
    const first = await serverDb.upsertShipment({
      id: `legacy-shipment-${Date.now()}`,
      orderId,
      userId: userA,
      carrier: 'colissimo',
      method: 'Colissimo Domicile',
      price: 4.90,
      trackingNumber: 'COLISSIMO-UPDATED',
      trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois',
      status: 'in_transit'
    });
    const current = await serverDb.getShipmentByOrderId(orderId);
    results.push({
      testId: 24,
      testName: 'Unicité de l’expédition par commande',
      passed: uuidPattern.test(first.id) && current?.id === first.id && current.trackingNumber === 'COLISSIMO-UPDATED',
      details: `Expédition courante unique pour #${orderId}, UUID=${current?.id}.`
    });
  } catch (err: any) {
    results.push({ testId: 24, testName: 'Unicité de l’expédition par commande', passed: false, details: err.message });
  }

  // Test 25: Préférences respectées et email console explicitement non livré
  try {
    await serverDb.updateNotificationPreferences(userA, {
      emailNotifications: false,
      inAppNotifications: false
    });
    const before = (await serverDb.getNotifications(userA)).length;
    const routed = await serverDb.notifyUser(
      userA,
      'routine_reminder',
      'Rappel test',
      'Rappel non envoyé lorsque les préférences le désactivent.',
      '/account?tab=routine',
      undefined,
      {
        to: emailA,
        subject: '[KURLA BEAUTY] Rappel test',
        template: 'routine_reminder',
        data: { taskTitle: 'Test', scheduledFor: new Date().toISOString().slice(0, 10) }
      },
      `preference-test:${Date.now()}`
    );
    const after = (await serverDb.getNotifications(userA)).length;
    const logs = await serverDb.getNotificationDeliveryLogs(userA);
    const latest = logs.find(log => log.channel === 'email');
    results.push({
      testId: 25,
      testName: 'Préférences et distinction email non livré',
      passed: before === after && routed.email?.delivered === false && routed.email?.status === 'logged'
        && latest?.error?.includes('désactivé'),
      details: `In-app inchangée (${before} -> ${after}), email marqué ${routed.email?.status} / delivered=${routed.email?.delivered}.`
    });
    await serverDb.updateNotificationPreferences(userA, { emailNotifications: true, inAppNotifications: true });
  } catch (err: any) {
    results.push({ testId: 25, testName: 'Préférences et distinction email non livré', passed: false, details: err.message });
  }

  return results;
}
