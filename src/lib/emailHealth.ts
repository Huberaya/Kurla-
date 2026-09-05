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
  /** Cause classée de la dernière panne, ou null si tout va bien. */
  cause: EmailCause | null;
  /** Ce qui ne va pas, en une phrase — lisible par quelqu'un qui ne code pas. */
  what: string | null;
  /** La réparation exacte. Pas « vérifier la configuration » : l'action. */
  fix: string | null;
  recent: Array<{ status: string; provider?: string; error?: string; createdAt: string }>;
}

/**
 * Causes de panne que l'on sait nommer. Chacune correspond à une réparation
 * différente : confondre « clé invalide » et « domaine non vérifié » fait
 * perdre des heures à chercher au mauvais endroit — c'est exactement ce qui
 * s'est produit ici.
 */
export type EmailCause =
  | 'invalid_key'
  | 'domain_not_verified'
  | 'testing_mode'
  | 'rate_limited'
  | 'bad_recipient'
  | 'no_sender'
  | 'unknown';

const DOMAIN_NOT_VERIFIED = /domain is not verified/i;
const DOMAIN_IN_MESSAGE = /The ([a-z0-9][a-z0-9.-]*\.[a-z]{2,}) domain is not verified/i;
const INVALID_KEY = /api key is invalid|unauthorized|401/i;
const TESTING_MODE = /only send testing emails to your own email address/i;
const OWN_ADDRESS = /your own email address \(([^)]+)\)/i;
const RATE_LIMITED = /rate limit|too many requests|429/i;
const BAD_RECIPIENT = /invalid `to`|recipient|422/i;

/**
 * Traduit un message brut de fournisseur en cause nommée + réparation.
 *
 * Le message brut est conservé à côté du diagnostic : face à un fournisseur,
 * c'est la trace exacte qui compte. Mais un opérateur qui lit « 403 The
 * kurla-beauty.com domain is not verified » alors qu'il possède kurla.eu part
 * chercher un domaine qui n'existe pas.
 */
export function classifyEmailError(error: string | null | undefined): {
  cause: EmailCause;
  what: string;
  fix: string;
} {
  const raw = (error || '').trim();
  if (!raw) return { cause: 'unknown', what: 'Échec sans détail.', fix: 'Consulter les journaux du fournisseur.' };

  if (INVALID_KEY.test(raw)) {
    return {
      cause: 'invalid_key',
      what: "La clé d'API du fournisseur est refusée.",
      fix: "Régénérer la clé chez le fournisseur, puis remplacer EMAIL_PROVIDER_API_KEY dans Vercel (Project Settings → Environment Variables → production et preview), puis redéployer."
    };
  }

  if (DOMAIN_NOT_VERIFIED.test(raw)) {
    const domain = raw.match(DOMAIN_IN_MESSAGE)?.[1] ?? "indiqué dans l'erreur";
    return {
      cause: 'domain_not_verified',
      what: `Le domaine expéditeur « ${domain} » n'est pas vérifié chez le fournisseur.`,
      fix: `Deux options : vérifier « ${domain} » en ajoutant chez son registrar les enregistrements SPF/DKIM/DMARC fournis par le fournisseur — ou, si ce domaine n'est pas le vôtre, renseigner EMAIL_FROM avec une adresse d'un domaine déjà vérifié.`
    };
  }

  if (TESTING_MODE.test(raw)) {
    const owner = raw.match(OWN_ADDRESS)?.[1];
    return {
      cause: 'testing_mode',
      what: "Le compte fournisseur est en mode test : il n'accepte d'envoyer qu'à son propre propriétaire.",
      fix: `Vérifier un domaine chez le fournisseur pour envoyer aux clientes.${owner ? ` En attendant, seul ${owner} peut recevoir.` : ''}`
    };
  }

  if (RATE_LIMITED.test(raw)) {
    return {
      cause: 'rate_limited',
      what: "Le fournisseur refuse les envois pour cause de quota dépassé.",
      fix: "Attendre la fin de la fenêtre de quota, ou relever la limite du compte. Ce n'est pas un défaut de configuration."
    };
  }

  if (BAD_RECIPIENT.test(raw)) {
    return {
      cause: 'bad_recipient',
      what: "L'adresse destinataire a été refusée.",
      fix: "Incident isolé : une adresse invalide ne met pas la configuration en cause. Vérifier la commande concernée."
    };
  }

  return {
    cause: 'unknown',
    what: "Le fournisseur a refusé l'envoi pour une raison non identifiée.",
    fix: "Reproduire avec un envoi de test et transmettre le message exact au support du fournisseur."
  };
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

  //
  // La règle n'est pas « tous les échecs » mais « aucun succès ». La différence
  // compte : le journal réel mélange cinq échecs Resend et quatre entrées
  // « logged » d'une période en mode console. Exiger que les dix dernières
  // soient toutes des échecs laissait passer la panne, alors qu'aucun e-mail
  // n'était jamais arrivé.
  const recent = emails.slice(0, OUTAGE_WINDOW);
  const hasFailure = recent.some(entry => entry.status === 'failed');
  const hasSuccess = recent.some(entry => entry.status === 'sent');
  const outage = recent.length >= MIN_SAMPLES_FOR_OUTAGE && hasFailure && !hasSuccess;

  const diagnosis = outage || !isRealProvider ? classifyEmailError(lastError) : null;

  return {
    provider,
    isRealProvider,
    counts: { sent, failed, logged, total: emails.length },
    outage,
    lastError,
    lastAttemptAt,
    cause: diagnosis?.cause ?? null,
    what: diagnosis?.what ?? null,
    fix: diagnosis?.fix ?? null,
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
