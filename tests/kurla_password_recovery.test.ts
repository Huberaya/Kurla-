import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/**
 * Banc « la réinitialisation de mot de passe aboutit quelque part ».
 *
 * Constat du 29/08/2026 : `updateUser` n'était appelé **nulle part** dans le
 * dépôt et l'événement `PASSWORD_RECOVERY` n'était pas traité. Supabase ouvrait
 * bien une session de récupération, mais aucune interface ne proposait de
 * définir un nouveau mot de passe : cliquer sur le lien de réinitialisation
 * était une impasse, quelle que soit l'URL de redirection configurée.
 *
 * Garde sur les sources — un test comportemental exigerait un vrai jeton de
 * récupération, qu'aucun banc ne peut fabriquer.
 */
async function runPasswordRecoveryTests(): Promise<void> {
  const authContext = await readFile('src/context/AuthContext.tsx', 'utf8');
  const panel = await readFile('src/components/PasswordRecoveryPanel.tsx', 'utf8');
  const accountPage = await readFile('src/pages/CustomerAccountPage.tsx', 'utf8');
  const app = await readFile('src/App.tsx', 'utf8');

  // 1. L'événement de récupération est traité.
  assert.ok(
    /event === 'PASSWORD_RECOVERY'/.test(authContext),
    "l'événement PASSWORD_RECOVERY n'est plus traité : la session de récupération passerait inaperçue"
  );
  assert.ok(
    /setIsPasswordRecovery\(true\)/.test(authContext),
    "le drapeau de récupération n'est plus levé"
  );

  // 2. Le mot de passe est réellement écrit.
  assert.ok(
    /supabase\.auth\.updateUser\(\{ password:/.test(authContext),
    'updateUser n’est plus appelé : aucun moyen de définir un nouveau mot de passe'
  );

  // 3. Le panneau existe, est conditionné, et monté au niveau de l'application.
  assert.ok(/if \(!isPasswordRecovery/.test(panel), 'le panneau n’est plus conditionné à l’état de récupération');
  assert.ok(/updatePassword\(password\)/.test(panel), 'le panneau n’appelle plus updatePassword');
  assert.ok(
    /<PasswordRecoveryPanel \/>/.test(app),
    'PasswordRecoveryPanel n’est plus monté dans App : la réinitialisation redeviendrait une impasse'
  );
  assert.ok(
    /from '\.\/components\/PasswordRecoveryPanel'/.test(app),
    "l'import de PasswordRecoveryPanel a disparu de App.tsx"
  );
  // Le panneau doit être rendu sur toutes les routes : le lien de
  // réinitialisation dépose sur la racine, pas sur /account.
  assert.ok(
    !/<PasswordRecoveryPanel \/>/.test(accountPage),
    'PasswordRecoveryPanel est monté à la fois dans App et dans la page compte : double rendu'
  );

  console.log(
    '[PASS] Réinitialisation de mot de passe : PASSWORD_RECOVERY traité, updateUser appelé, panneau conditionné et monté sur toutes les routes.'
  );
}

runPasswordRecoveryTests().catch(error => {
  console.error('[FAIL] Réinitialisation de mot de passe :', error);
  process.exitCode = 1;
});
