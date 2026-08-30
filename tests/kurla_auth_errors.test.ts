import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { translateAuthError, GENERIC_AUTH_ERROR } from '../src/lib/authErrors';

/**
 * Banc « aucune erreur brute de GoTrue ne sort à l'écran ».
 *
 * Fait déclencheur, mesuré en production le 30/08/2026 :
 *   POST /auth/v1/signup → 429 {"error_code":"over_email_send_rate_limit",
 *                               "msg":"email rate limit exceeded"}
 * Ce texte interne était affiché tel quel au visiteur, sur l'écran
 * d'inscription — le pire endroit possible.
 */
async function runAuthErrorTests(): Promise<void> {
  // 1. Le message réellement observé en production est traduit.
  assert.equal(
    translateAuthError('email rate limit exceeded'),
    'Trop d’emails ont été demandés récemment depuis cette adresse. Patientez quelques minutes, ou connectez-vous directement avec votre mot de passe.'
  );
  assert.ok(!/rate limit/i.test(translateAuthError('email rate limit exceeded')),
    'le terme technique « rate limit » filtre encore dans le message');

  // 2. Les autres erreurs GoTrue sont couvertes.
  const couples: Array<[string, string]> = [
    ['Invalid login credentials', 'Adresse email ou mot de passe incorrect.'],
    ['Email not confirmed', 'Cette adresse email n’est pas encore confirmée. Contactez-nous si le problème persiste.'],
    ['User already registered', 'Un compte existe déjà avec cette adresse email. Essayez de vous connecter.'],
    ['Password should be at least 6 characters', 'Le mot de passe doit contenir au moins 6 caractères.'],
    ['New password should be different from the old password', 'Le nouveau mot de passe doit être différent de l’actuel.'],
    ['Email address "x" is invalid', 'Cette adresse email n’est pas valide.'],
    ['Email logins are disabled', 'L’envoi d’email est momentanément indisponible. Connectez-vous avec votre mot de passe.'],
    ['For security purposes, you can only request this after 30 seconds.', 'Patientez quelques instants avant de redemander un email.'],
    ['AuthApiError: request failed', 'Le service d’authentification est momentanément injoignable. Réessayez dans un instant.'],
  ];
  for (const [brute, attendu] of couples) {
    assert.equal(translateAuthError(brute), attendu, `erreur non traduite correctement : ${brute}`);
  }

  // 3. Le repli ne divulgue jamais le message brut.
  const inconnue = 'PGRST301: JWT expired at row 42 of auth.users';
  assert.equal(translateAuthError(inconnue), GENERIC_AUTH_ERROR);
  assert.ok(!translateAuthError(inconnue).includes('PGRST301'), 'le repli divulgue un détail interne');
  assert.equal(translateAuthError(''), GENERIC_AUTH_ERROR);
  assert.equal(translateAuthError(null), GENERIC_AUTH_ERROR);
  assert.equal(translateAuthError(undefined), GENERIC_AUTH_ERROR);

  // 4. Le contexte ne renvoie plus aucun message brut.
  const authContext = await readFile('src/context/AuthContext.tsx', 'utf8');
  assert.ok(!/err\.message \|\|/.test(authContext), 'un repli `err.message ||` subsiste : message brut exposé');
  assert.ok(!/error: uErr\.message/.test(authContext), 'updatePassword expose encore uErr.message brut');
  assert.ok(/import \{ translateAuthError \}/.test(authContext), 'translateAuthError n’est plus importé');

  // 5. Le repli simulé de connexion a disparu.
  assert.ok(!/role: 'customer',\s*\n\s*country: 'FR'/.test(authContext),
    'le faux profil `role: customer` du repli simulé est revenu');
  assert.ok(/if \(!supabase\) \{\s*\n(?:.*\n)*?\s*return \{ success: false/.test(authContext),
    'une authentification non vérifiable doit échouer, pas réussir');

  console.log(
    `[PASS] Erreurs d'authentification : ${couples.length + 1} messages GoTrue traduits, repli opaque, aucun message brut, repli simulé supprimé.`
  );
}

runAuthErrorTests().catch(error => {
  console.error('[FAIL] Erreurs d’authentification :', error);
  process.exitCode = 1;
});
