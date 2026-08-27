/**
 * CHANTIER 7.6 — vérification VIES des numéros de TVA.
 *
 * VIES est le service officiel de la Commission européenne qui dit si un numéro
 * de TVA intracommunautaire est valide. C'est la seule base acceptable pour
 * appliquer une auto-liquidation : un numéro bien formé peut être inexistant.
 *
 * Endpoint vérifié en conditions réelles le 2026-08-28 :
 *   POST https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number
 *   → succès : `{ countryCode, vatNumber, requestDate, valid: true, name, address,
 *                requestIdentifier, traderNameMatch, … }`
 *   → service saturé : `{ actionSucceed: false, errorWrappers: [{ error:
 *                "MS_MAX_CONCURRENT_REQ" }] }` (l'État membre ne répond pas)
 *
 * **Échec fermé.** Toute erreur, tout délai dépassé, toute réponse ambiguë donne
 * « non vérifié », et la TVA normale reste appliquée. Ne pas pouvoir vérifier ne
 * doit jamais exonérer : ce serait une perte de taxe sur une simple panne.
 *
 * Désactivé par défaut (`VIES_VERIFICATION_ENABLED`) : le paiement ne doit pas
 * dépendre d'un service tiers tant que le B2B n'est pas ouvert.
 */

import { isValidVatNumberFormat, normalizeVatNumber, SELLER_COUNTRY } from './vat';

export const VIES_ENDPOINT = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';

export interface VatVerificationResult {
  verified: boolean;
  /** Numéro normalisé, ou `null` si la saisie n'a pas la forme attendue. */
  vatNumber: string | null;
  /** Date renvoyée par VIES, pour l'audit de la facture. */
  checkedAt: string | null;
  /** Identifiant de la réponse VIES, à conserver comme preuve. */
  requestIdentifier: string | null;
  /** Raison lisible, y compris en cas d'échec : rien n'est deviné. */
  reason: string;
  /** Nom renvoyé par VIES (assujetti), quand il est fourni. */
  traderName: string | null;
}

function notVerified(reason: string, vatNumber: string | null = null): VatVerificationResult {
  return {
    verified: false,
    vatNumber,
    checkedAt: null,
    requestIdentifier: null,
    reason,
    traderName: null,
  };
}

/** La vérification en ligne est-elle activée ? */
export function isViesVerificationEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.VIES_VERIFICATION_ENABLED || '').toLowerCase() === 'true';
}

/**
 * Vérifie un numéro auprès de VIES.
 *
 * `fetchImpl` est injectable : le banc exerce cette fonction réelle avec un
 * `fetch` de test, au lieu de tester une copie de la logique.
 */
export async function verifyVatNumber(input: {
  country: string;
  vatNumber: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): Promise<VatVerificationResult> {
  const country = typeof input.country === 'string' ? input.country.trim().toUpperCase() : '';
  const normalized = normalizeVatNumber(country, input.vatNumber);

  if (!normalized || !isValidVatNumberFormat(country, normalized)) {
    return notVerified('Numéro de TVA absent ou de forme invalide.', normalized);
  }
  if (country === SELLER_COUNTRY) {
    return notVerified(
      'Numéro du pays du vendeur : l’auto-liquidation intracommunautaire ne s’applique pas.',
      normalized
    );
  }
  if (!isViesVerificationEnabled(input.env)) {
    return notVerified(
      'Vérification VIES désactivée : la TVA normale est appliquée par défaut.',
      normalized
    );
  }

  const doFetch = input.fetchImpl || fetch;
  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(VIES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        countryCode: country,
        vatNumber: normalized.slice(country.length),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return notVerified(`VIES a répondu ${response.status} : numéro non vérifié.`, normalized);
    }
    const payload = (await response.json()) as Record<string, unknown>;

    // Réponse d'échec du service (État membre saturé, numéro refusé côté MS).
    if (payload.actionSucceed === false) {
      const code = Array.isArray(payload.errorWrappers)
        ? (payload.errorWrappers[0] as Record<string, unknown>)?.error
        : undefined;
      return notVerified(`VIES n’a pas pu statuer (${String(code || 'erreur inconnue')}).`, normalized);
    }

    if (payload.valid !== true) {
      return notVerified('Numéro de TVA inconnu ou invalide selon VIES.', normalized);
    }

    return {
      verified: true,
      vatNumber: normalized,
      checkedAt: typeof payload.requestDate === 'string' ? payload.requestDate : new Date().toISOString(),
      requestIdentifier: typeof payload.requestIdentifier === 'string' && payload.requestIdentifier
        ? payload.requestIdentifier
        : null,
      reason: 'Numéro de TVA vérifié auprès de VIES.',
      traderName: typeof payload.name === 'string' && payload.name !== '---' ? payload.name : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erreur inconnue';
    return notVerified(`Vérification VIES impossible (${message}) : TVA normale appliquée.`, normalized);
  } finally {
    clearTimeout(timer);
  }
}
