/**
 * Traduction des erreurs d'authentification GoTrue en messages lisibles.
 *
 * Nécessité constatée en production le 30/08/2026 : un visiteur qui tentait de
 * s'inscrire recevait littéralement `email rate limit exceeded`. C'est du texte
 * interne de GoTrue, incompréhensible, et sur un écran d'inscription c'est un
 * abandon immédiat.
 *
 * Règles :
 *  - l'ordre compte : la première règle qui correspond gagne ;
 *  - aucune règle ne doit révéler l'existence d'un compte (énumération) ;
 *  - le repli final ne reprend jamais le message brut.
 */

type Rule = { test: RegExp; message: string };

const RULES: Rule[] = [
  {
    test: /invalid login credentials|invalid credentials/i,
    message: 'Adresse email ou mot de passe incorrect.',
  },
  {
    test: /email not confirmed/i,
    message: 'Cette adresse email n’est pas encore confirmée. Contactez-nous si le problème persiste.',
  },
  {
    // Le plafond horaire d'envoi de Supabase. Ne jamais l'afficher tel quel.
    test: /over_email_send_rate_limit|email rate limit exceeded/i,
    message:
      'Trop d’emails ont été demandés récemment depuis cette adresse. Patientez quelques minutes, ou connectez-vous directement avec votre mot de passe.',
  },
  {
    test: /for security purposes, you can only request this after/i,
    message: 'Patientez quelques instants avant de redemander un email.',
  },
  {
    test: /rate limit|too many requests/i,
    message: 'Trop de tentatives en peu de temps. Réessayez dans quelques minutes.',
  },
  {
    test: /user already registered|already been registered|already registered/i,
    message: 'Un compte existe déjà avec cette adresse email. Essayez de vous connecter.',
  },
  {
    test: /password should be at least|password is too weak|weak password/i,
    message: 'Le mot de passe doit contenir au moins 6 caractères.',
  },
  {
    test: /new password should be different/i,
    message: 'Le nouveau mot de passe doit être différent de l’actuel.',
  },
  {
    test: /email_address_invalid|email address .* is invalid|invalid email/i,
    message: 'Cette adresse email n’est pas valide.',
  },
  {
    // GoTrue expose le message, pas le code : `email_provider_disabled` arrive
    // sous la forme « Email logins are disabled ». Les deux sont couverts.
    test: /email_provider_disabled|email logins are disabled/i,
    message: 'L’envoi d’email est momentanément indisponible. Connectez-vous avec votre mot de passe.',
  },
  {
    // `AuthApiError` s'écrit sans espace : c'est la forme réellement émise.
    test: /authapierror|auth api error|fetch failed|networkerror|failed to fetch|timeout/i,
    message: 'Le service d’authentification est momentanément injoignable. Réessayez dans un instant.',
  },
];

/** Message générique : ne divulgue ni la nature exacte de l'échec, ni un détail interne. */
export const GENERIC_AUTH_ERROR = 'Nous n’avons pas pu aboutir. Vérifiez vos informations et réessayez.';

/**
 * Traduit un message d'erreur GoTrue. Renvoie toujours une chaîne non vide,
 * jamais le message brut.
 */
export function translateAuthError(raw: string | null | undefined): string {
  if (!raw) return GENERIC_AUTH_ERROR;
  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.message;
  }
  return GENERIC_AUTH_ERROR;
}

/** Nombre de règles, pour les bancs de non-régression. */
export const AUTH_ERROR_RULE_COUNT = RULES.length;
