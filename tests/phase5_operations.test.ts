import fs from 'fs';
import path from 'path';
import { serverDb } from '../src/lib/serverDb';
import { emailService } from '../src/lib/emailService';
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
    const emailResult = await emailService.sendEmail({
      to: emailA,
      subject: `[KURLA BEAUTY] Commande #${orderId} reçue`,
      template: 'order_created',
      data: { orderId, total: 48 }
    });
    results.push({
      testId: 2,
      testName: 'Notification et log email transactionnel',
      passed: notif.id.length > 0 && emailResult.success,
      details: `Notification in-app créée (#${notif.id}) et email provider (${emailService.getProviderName()}) loggé.`
    });
  } catch (err: any) {
    results.push({ testId: 2, testName: 'Notification et log email transactionnel', passed: false, details: err.message });
  }

  // Test 3: Passage à paid, mise à jour stock & notification
  try {
    const pBefore = await serverDb.getProductById('leave-in-hydratant');
    const qBefore = pBefore?.stockQuantity || 0;
    await serverDb.updateOrderStatus(orderId, 'paid');
    const pAfter = await serverDb.getProductById('leave-in-hydratant');
    const qAfter = pAfter?.stockQuantity || 0;
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
    const trackNum = shippingService.generateTrackingNumber('colissimo');
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
      passed: !!shipment?.trackingNumber && shipment.trackingNumber.length > 0 && shipment.carrier === 'colissimo',
      details: `Expédié via ${shipment.carrier} N°: ${shipment.trackingNumber} (${shipment.trackingUrl}).`
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
  try {
    const ret = await serverDb.createReturnRequest(userA, orderId, 'Produit non adapté', [{ productId: 'leave-in-hydratant', quantity: 1 }]);
    returnId = ret.id;
    results.push({
      testId: 9,
      testName: 'Demande de retour client',
      passed: ret.status === 'requested' && ret.quantity === 1,
      details: `Demande de retour #${ret.id} enregistrée.`
    });
  } catch (err: any) {
    results.push({ testId: 9, testName: 'Demande de retour client', passed: false, details: err.message });
  }

  // Test 10: Acceptation du retour par l'admin
  try {
    const updated = await serverDb.updateReturnStatus(returnId, 'approved', 'Retour accepté par le service client.');
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
    const qBefore = pBefore?.stockQuantity || 0;

    const ref = await serverDb.processStripeRefund(orderId, returnId, 48, 'Retour approuvé');

    const pAfter = await serverDb.getProductById('leave-in-hydratant');
    const qAfter = pAfter?.stockQuantity || 0;

    results.push({
      testId: 11,
      testName: 'Remboursement Stripe test & réintégration du stock',
      passed: ref.status === 'succeeded' && qAfter >= qBefore,
      details: `Remboursement #${ref.id} émis (${ref.amount} EUR), stock restauré à ${qAfter}.`
    });

    results.push({
      testId: 12,
      testName: 'Enregistrement de la transaction de remboursement',
      passed: ref.stripeRefundId !== undefined && ref.amount === 48,
      details: `Transaction Stripe enregistrée avec ID #${ref.stripeRefundId}.`
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
      passed: ticket.status === 'open' && ticket.subjectCategory === 'livraison',
      details: `Ticket support #${ticket.id} créé.`
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
      passed: msg.senderRole === 'customer',
      details: `Message client ajouté à #${ticketId}.`
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

  return results;
}
