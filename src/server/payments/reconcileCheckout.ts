/**
 * Réconciliation du paiement d'une commande.
 *
 * ── Le défaut que ce module corrige ────────────────────────────────────────
 *
 * Le webhook Stripe était le SEUL chemin qui faisait passer une commande de
 * « payment_pending_webhook » à « paid ». La page de confirmation, elle, ne
 * faisait que lire le statut.
 *
 * Conséquence : un webhook manqué — déploiement en cours, indisponibilité
 * passagère du fournisseur, secret tourné, événement perdu — et la cliente a
 * payé, l'argent est encaissé, mais la commande reste « en attente » à vie.
 * Pas d'expédition, pas d'e-mail, et rien dans l'administration qui signale
 * quoi que ce soit : la panne n'existe pour personne.
 *
 * Constaté en production le 2026-09-05 : 38 commandes sur 39 bloquées à
 * « payment_pending_webhook ».
 *
 * ── La règle ───────────────────────────────────────────────────────────────
 *
 * L'argent encaissé fait foi, pas le webhook. Si Stripe dit « payé », la
 * commande est payée — quel que soit le chemin par lequel on l'apprend.
 *
 * La confiance n'est jamais accordée au client : le montant et la devise sont
 * vérifiés contre la commande avant toute écriture, et l'identifiant de
 * session doit correspondre. Une session expirée n'est jamais marquée payée :
 * elle ne peut plus l'être.
 *
 * Tout est idempotent. Rejouer la même session trois fois produit le même
 * résultat et n'applique les effets qu'une seule fois.
 */

import type Stripe from 'stripe';
import { incrementCouponUsage } from '../../lib/db/couponStore';
import { serverDb } from '../../lib/serverDb';
import { getStripeClient } from './stripeClient';

export type ReconcileOutcome =
  /** La commande vient d'être marquée payée. */
  | 'paid'
  /** Elle l'était déjà : rien à faire, aucun effet rejoué. */
  | 'already_paid'
  /** Aucune commande ne correspond à cette session. */
  | 'no_order'
  /** La commande existe mais son statut interdit la transition. */
  | 'status_locked'
  /** Session non payée — checkout abandonné, pas un incident. */
  | 'unpaid'
  /** Session expirée : elle ne pourra plus jamais être payée. */
  | 'expired'
  /** Montant, devise ou identifiant incohérent : on refuse l'écriture. */
  | 'rejected'
  /** Le fournisseur n'a pas pu être interrogé. */
  | 'unavailable';

export interface ReconcileResult {
  outcome: ReconcileOutcome;
  orderId?: string;
  detail?: string;
}

/** Statuts qui verrouillent la commande : un paiement tardif ne les écrase pas. */
const LOCKED_STATUSES = ['refunded', 'partially_refunded', 'cancelled', 'payment_failed'];

/** Statuts depuis lesquels on peut encore confirmer un paiement. */
const PENDING_STATUSES = ['payment_pending_webhook', 'pending_payment'];

/**
 * Applique l'état « payé » à la commande d'une session Stripe, avec toutes les
 * vérifications. Ne lève pas : elle rapporte. Un échec de réconciliation ne
 * doit jamais empêcher une page de s'afficher.
 */
export async function confirmOrderPaidFromCheckoutSession(
  session: Stripe.Checkout.Session,
  options: { reason?: string } = {}
): Promise<ReconcileResult> {
  const order = await serverDb.findOrder({ stripeSessionId: session.id, orderId: session.metadata?.orderId });

  if (!order) {
    return { outcome: 'no_order', detail: `Aucune commande pour la session ${session.id}.` };
  }

  if (order.status === 'paid') {
    return { outcome: 'already_paid', orderId: order.id };
  }

  if (!PENDING_STATUSES.includes(order.status)) {
    return {
      outcome: 'status_locked',
      orderId: order.id,
      detail: `Statut « ${order.status} » : transition vers « paid » refusée.`
    };
  }

  // Une session Stripe ne ment pas sur son propre statut, mais la commande
  // reste la référence pour le montant : c'est elle que la cliente a accepté.
  if (session.status === 'expired') {
    return { outcome: 'expired', orderId: order.id };
  }

  if (session.payment_status !== 'paid') {
    return {
      outcome: 'unpaid',
      orderId: order.id,
      detail: `Session ${session.status} / paiement ${session.payment_status || 'absent'}.`
    };
  }

  const expectedCents = Math.round(order.total * 100);
  if (session.amount_total !== expectedCents) {
    return {
      outcome: 'rejected',
      orderId: order.id,
      detail: `Montant incohérent : attendu ${expectedCents}, reçu ${session.amount_total ?? 'null'}.`
    };
  }

  if (session.currency && session.currency.toLowerCase() !== 'eur') {
    return {
      outcome: 'rejected',
      orderId: order.id,
      detail: `Devise incohérente : ${session.currency}.`
    };
  }

  if (session.metadata?.orderId && session.metadata.orderId !== order.id) {
    return {
      outcome: 'rejected',
      orderId: order.id,
      detail: 'La session appartient à une autre commande.'
    };
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  await serverDb.updateOrderStatus(order.id, 'paid', {
    stripePaymentIntentId: paymentIntentId,
    changedByRole: 'system',
    reason: options.reason || 'Paiement confirmé auprès de Stripe'
  });

  // Le coupon n'est consommé qu'une fois, parce qu'on n'arrive ici qu'après
  // avoir écarté le cas « déjà payé ».
  if (order.couponCode) {
    await incrementCouponUsage(order.couponCode);
  }

  return { outcome: 'paid', orderId: order.id };
}

/**
 * Interroge Stripe pour une commande et aligne son statut sur la réalité de
 * l'encaissement. C'est le point d'entrée de la réconciliation.
 */
export async function reconcileOrderPayment(orderId: string): Promise<ReconcileResult> {
  const stripe = getStripeClient();
  if (!stripe) return { outcome: 'unavailable', orderId, detail: 'Client Stripe non configuré.' };

  const order = await serverDb.findOrder({ orderId });
  if (!order) return { outcome: 'no_order', orderId };
  if (!order.stripeSessionId) {
    return { outcome: 'no_order', orderId, detail: 'Commande sans session Stripe.' };
  }
  if (order.status === 'paid') return { outcome: 'already_paid', orderId };
  if (LOCKED_STATUSES.includes(order.status)) {
    return { outcome: 'status_locked', orderId, detail: `Statut « ${order.status} ». ` };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  } catch (error: any) {
    return {
      outcome: 'unavailable',
      orderId,
      detail: `Session illisible : ${error?.message || error}`
    };
  }

  return confirmOrderPaidFromCheckoutSession(session, {
    reason: 'Réconciliation : paiement vérifié auprès de Stripe'
  });
}

export interface SweepResult {
  examined: number;
  paid: string[];
  cancelled: string[];
  skipped: number;
  unavailable: number;
}

/**
 * Balaye les commandes restées en attente et les aligne sur la réalité de
 * l'encaissement.
 *
 * Deux issues, deux traitements :
 *   — Stripe dit « payé »  → la commande devient payée. Le webhook avait été
 *     manqué ; la cliente avait payé pour rien.
 *   — Session expirée      → la commande est annulée. Une session Stripe
 *     expirée ne peut plus jamais être réglée : la garder en attente
 *     encombre l'administration et, surtout, maintient le stock réservé d'un
 *     panier abandonné. Annuler le libère.
 *
 * Le délai de carence évite de rattraper une cliente en train de payer : une
 * commande de moins de trente minutes peut très bien être en cours.
 */
export async function reconcilePendingOrders(
  options: { limit?: number; olderThanMinutes?: number } = {}
): Promise<SweepResult> {
  const olderThanMinutes = Math.min(Math.max(options.olderThanMinutes ?? 30, 1), 60 * 24 * 30);
  const olderThan = new Date(Date.now() - olderThanMinutes * 60_000);

  const orders = await serverDb.listOrdersByStatus(['payment_pending_webhook', 'pending_payment'], {
    limit: options.limit ?? 50,
    olderThan
  });

  const result: SweepResult = {
    examined: orders.length,
    paid: [],
    cancelled: [],
    skipped: 0,
    unavailable: 0
  };

  for (const order of orders) {
    try {
      const outcome = await reconcileOrderPayment(order.id);

      if (outcome.outcome === 'paid') {
        result.paid.push(order.id);
        continue;
      }

      if (outcome.outcome === 'expired') {
        await serverDb.updateOrderStatus(order.id, 'cancelled', {
          changedByRole: 'system',
          reason: 'Session de paiement Stripe expirée : la commande ne peut plus être réglée.'
        });
        result.cancelled.push(order.id);
        continue;
      }

      if (outcome.outcome === 'unavailable') {
        result.unavailable += 1;
        continue;
      }

      result.skipped += 1;
    } catch (error: any) {
      // Une commande qui échoue ne doit pas interrompre le balayage des
      // suivantes.
      console.error(`[Réconciliation] commande ${order.id} :`, error?.message || error);
      result.unavailable += 1;
    }
  }

  return result;
}
