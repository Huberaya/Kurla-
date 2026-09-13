import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/node';

import { serverDb } from '../lib/serverDb';

let enabled = false;

export function initServerMonitoring(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || enabled) return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
  });
  enabled = true;
  console.log('[Monitoring] Sentry server activé.');
}

// ---------------------------------------------------------------------------
// LE REPLI — quand Sentry n'est pas configuré, l'erreur allait nulle part
// ---------------------------------------------------------------------------
//
// Mesuré le 13/09/2026 : `/api/health` répond `monitoring.configured: false`.
// `captureServerException` s'arrêtait donc sur `if (!enabled) return;` — une
// erreur serveur sortait dans la sortie standard du conteneur, puis
// disparaissait avec lui. Aucune trace, aucun compte, aucune alerte.
//
// Le repli écrit l'incident dans `audit_logs` (table existante, déjà en base,
// lue par l'administration, sans migration à appliquer). Ce n'est pas Sentry :
// pas de regroupement par version, pas de trace complète. C'est un journal
// d'incidents daté, comptable et interrogeable — ce qui suffit à répondre à
// la seule question qui compte en production : **est-ce que ça arrive ?**
//
// Deux gardes, parce qu'un journal peut devenir une arme contre soi-même :
//
//   · une empreinte par (message, méthode, chemin) et un délai de carence —
//     une boucle d'erreurs n'écrit pas mille fois la même ligne ;
//   · un plafond par processus — une panne générale ne sature pas la table.

const DELAI_CARENCE_MS = 10 * 60_000;
const ECRITURES_MAX_PAR_PROCESSUS = 40;

const dernierEcrit = new Map<string, number>();
let ecritures = 0;

/**
 * Une même erreur vue mille fois est un incident, pas mille incidents.
 * L'empreinte est stable dans le temps : on peut la retrouver d'un
 * déploiement à l'autre, et la citer dans une issue.
 */
export function empreinteIncident(message: string, methode = '', chemin = ''): string {
  return createHash('sha1')
    .update(`${String(methode).toUpperCase()} ${String(chemin)}\n${String(message)}`)
    .digest('hex')
    .slice(0, 12);
}

/**
 * Faut-il écrire cet incident maintenant ?
 *
 * Extrait pour être testable : c'est la seule partie du repli qui a un
 * effet de bord (elle modifie le compteur). Le reste est de l'attente.
 */
export function peutConsigner(empreinte: string, maintenant = Date.now()): boolean {
  if (ecritures >= ECRITURES_MAX_PAR_PROCESSUS) return false;
  const precedent = dernierEcrit.get(empreinte);
  if (precedent !== undefined && maintenant - precedent < DELAI_CARENCE_MS) return false;
  dernierEcrit.set(empreinte, maintenant);
  ecritures += 1;
  return true;
}

/** État du garde-fou — pour les bancs et pour `/api/health`. */
export function etatDuRepli(): { ecritures: number; plafond: number; carenceMs: number; empreintes: number } {
  return {
    ecritures,
    plafond: ECRITURES_MAX_PAR_PROCESSUS,
    carenceMs: DELAI_CARENCE_MS,
    empreintes: dernierEcrit.size
  };
}

/** Remise à zéro : les bancs l'appellent, la production jamais. */
export function reinitialiserRepli(): void {
  dernierEcrit.clear();
  ecritures = 0;
}

/**
 * Consigne l'incident en base. Ne lève jamais, et ne dépasse jamais
 * `bureauMs` : l'appelant est le gestionnaire d'erreurs, il a une réponse
 * 500 à envoyer et une base peut être lente.
 */
async function consignerAvecBorne(
  error: unknown,
  context: Record<string, string | number | undefined>
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const empreinte = empreinteIncident(message, String(context.method ?? ''), String(context.path ?? ''));
  if (!peutConsigner(empreinte)) return;

  const ecriture = serverDb.consignerIncident({
    empreinte,
    message,
    chemin: String(context.path ?? ''),
    methode: String(context.method ?? ''),
    statut: Number(context.status ?? 500),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deploiement: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    requestId: context.requestId != null ? String(context.requestId) : null,
    survenuLe: new Date().toISOString()
  });

  const borne = new Promise<void>((resolve) => setTimeout(resolve, 1500).unref?.());
  // `Promise.race` laisse l'écriture en vol si la borne gagne. Ce n'est pas
  // une fuite : `consignerIncident` avale ses propres erreurs, et le
  // processus serverless est coupé de toute façon. La borne évite seulement
  // qu'une base lente retienne la réponse 500.
  await Promise.race([ecriture.then(() => undefined).catch(() => undefined), borne]);
}

/**
 * Asynchrone depuis le 13/09/2026 : le repli écrit en base, et une écriture
 * se termine. L'appelant — le gestionnaire d'erreurs — l'attend **avant**
 * d'envoyer sa réponse, sinon la plateforme coupe le processus et l'incident
 * part avec lui.
 */
export async function captureServerException(
  error: unknown,
  context: Record<string, string | number | undefined> = {}
): Promise<void> {
  if (enabled) {
    Sentry.withScope(scope => {
      for (const [key, value] of Object.entries(context)) {
        if (value !== undefined) scope.setTag(key, String(value));
      }
      Sentry.captureException(error);
    });
    return;
  }
  await consignerAvecBorne(error, context);
}

export async function flushServerMonitoring(timeoutMs = 1500): Promise<void> {
  if (enabled) await Sentry.flush(timeoutMs);
}

export function isServerMonitoringEnabled(): boolean {
  return enabled;
}

/**
 * Où vont les erreurs de ce processus ?
 *
 * Répond à une question qu'on ne pouvait pas poser avant : `configured:
 * false` voulait dire « aucune trace », sans le dire. La réponse est dans
 * `/api/health`, donc dans une réponse HTTP, donc sondable.
 */
export function destinationDesErreurs(): 'sentry' | 'journal_audit' {
  return enabled ? 'sentry' : 'journal_audit';
}
