/**
 * Santé de la livraison des e-mails.
 *
 * Ce module existe à cause d'une panne réelle, constatée le 2026-09-03 :
 * la production renvoyait « API resend HTTP 401 : API key is invalid » depuis
 * le 1er septembre. Trois jours pendant lesquels aucune confirmation de
 * commande, aucune notification d'expédition et aucune réinitialisation de mot
 * de passe n'est partie — alors que les paiements, eux, passaient.
 *
 * Pourquoi c'est passé inaperçu : une clé invalide ne fait échouer aucune
 * requête HTTP du site. La commande est enregistrée, la cliente est redirigée
 * vers une page de confirmation, tout semble normal. La seule trace vivait
 * dans une table que personne n'ouvre.
 *
 * La règle retenue : **dix échecs consécutifs ne sont pas un incident isolé,
 * c'est une configuration cassée.** On remonte alors un état d'interruption
 * (`outage`) qui doit être affiché, pas journalisé en silence.
 */
import type { NotificationDeliveryLog } from './db/types';

export interface EmailHealth {
  provider: string;
  isRealProvider: boolean;
  counts: { sent: number; failed: number; logged: number; total: number };
  /** Vrai quand les dernières tentatives ont TOUTES échoué : panne, pas incident. */
  outage: boolean;
  lastError: string | null;
  lastAttemptAt: string | null;
  recent: Array<{ status: string; provider?: string; error?: string; createdAt: string }>;
}

/** Nombre de tentatives consécutives examinées pour conclure à la panne. */
export const OUTAGE_WINDOW = 10;

/**
 * Seuil minimal d'observations. Avec un seul échec on ne conclut rien : un
 * fournisseur peut refuser un envoi ponctuellement (adresse invalide, pièce
 * jointe refusée) sans que la configuration soit en cause.
 */
const MIN_SAMPLES_FOR_OUTAGE = 3;

export function computeEmailHealth(
  logs: NotificationDeliveryLog[],
  provider: string,
  isRealProvider: boolean
): EmailHealth {
  const emails = (logs || []).filter(log => log.channel === 'email');

  let failed = 0;
  let sent = 0;
  let logged = 0;
  let lastError: string | null = null;
  let lastAttemptAt: string | null = null;

  for (const entry of emails) {
    if (entry.status === 'failed') failed += 1;
    else if (entry.status === 'sent') sent += 1;
    else logged += 1;

    const createdAt = entry.createdAt || '';
    if (!lastAttemptAt || createdAt > lastAttemptAt) {
      lastAttemptAt = createdAt || null;
      lastError = entry.status === 'failed' ? entry.error || 'Échec sans détail.' : null;
    }
  }

  const recent = emails.slice(0, OUTAGE_WINDOW);
  const outage =
    recent.length >= MIN_SAMPLES_FOR_OUTAGE && recent.every(entry => entry.status === 'failed');

  return {
    provider,
    isRealProvider,
    counts: { sent, failed, logged, total: emails.length },
    outage,
    lastError,
    lastAttemptAt,
    recent: recent.map(entry => ({
      status: entry.status,
      provider: entry.provider,
      error: entry.error,
      createdAt: entry.createdAt
    }))
  };
}

/**
 * Le bandeau doit-il s'afficher ?
 *
 * Deux situations distinctes, aussi graves l'une que l'autre : le fournisseur
 * n'est pas configuré du tout, ou il est configuré mais rejette les envois.
 */
export function shouldWarn(health: EmailHealth): boolean {
  return health.outage || !health.isRealProvider;
}
