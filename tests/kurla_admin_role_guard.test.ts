import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/**
 * Banc « le rôle d'un compte ne s'écrit jamais depuis le client ».
 *
 * Constat du 29/08/2026 : `AuthContext.fetchProfile` upsertait un profil de
 * repli avec `role: 'customer'` en dur, sur `onConflict: 'id'`. PostgREST ne
 * met à jour que les colonnes fournies — donc une simple lecture de profil en
 * échec **rétrogradait un compte existant**, y compris le seul superadmin.
 *
 * Et la rétrogradation est à sens unique : la politique RLS
 * « Profiles update policy » autorise l'écriture via `OR public.is_admin()`,
 * si bien que l'administrateur peut écraser son propre rôle ; ensuite
 * `is_admin()` renvoie faux et l'accès est définitivement perdu.
 *
 * Ce banc est une **garde de non-régression sur les sources**, pas un test
 * comportemental : reproduire la rétrogradation exigerait une session
 * administrateur réelle, qu'aucun banc ne peut fabriquer. Il vérifie les trois
 * conditions qui, ensemble, rendent la rétrogradation impossible.
 */
async function runAdminRoleGuardTests(): Promise<void> {
  const authContext = await readFile('src/context/AuthContext.tsx', 'utf8');
  const authMigration = await readFile('supabase/migrations/20260805100000_phase2_auth_profiles.sql', 'utf8');
  const initSchema = await readFile('supabase/migrations/20260804000000_init_kurla_schema.sql', 'utf8');

  // 1. Aucun payload d'upsert de profil ne doit porter `role`.
  /**
   * Les commentaires sont retirés avant l'inspection : la garde doit lire le
   * code, pas la prose. Sans cela, le commentaire qui *explique* pourquoi
   * `role` est absent — et qui cite le littéral fautif — faisait échouer le
   * banc sur un fichier déjà corrigé.
   */
  const stripComments = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  const payloadNames = ['newProfilePayload', 'profilePayload'];
  for (const name of payloadNames) {
    const start = authContext.indexOf(`const ${name}`);
    assert.ok(start > -1, `le payload « ${name} » est introuvable`);
    const payload = stripComments(authContext.slice(start, authContext.indexOf('};', start)));
    assert.ok(
      !/\brole\s*:/.test(payload),
      `le payload « ${name} » écrit \`role\` : une écriture de profil rétrograderait un compte existant`
    );
    assert.ok(/\bid\s*:/.test(payload), `le payload « ${name} » doit porter l’identifiant`);
  }

  // 1bis. Une inscription sans session ne doit pas installer de fausse session.
  assert.ok(
    /if \(data\.user && !data\.session\)/.test(authContext),
    'signUp ne distingue plus le cas « email de confirmation en attente » : il réinstallerait une demi-connexion'
  );

  // 2. La politique RLS doit continuer d'interdire l'auto-escalade.
  const updatePolicy = authMigration.slice(
    authMigration.indexOf('CREATE POLICY "Profiles update policy"'),
    authMigration.indexOf(';', authMigration.indexOf('CREATE POLICY "Profiles update policy"'))
  );
  assert.ok(updatePolicy.length > 0, 'politique « Profiles update policy » introuvable');
  assert.ok(
    /role IS NOT DISTINCT FROM/.test(updatePolicy),
    'la politique de mise à jour ne protège plus la colonne `role` : un compte pourrait s’auto-escalader'
  );

  // 3. Omettre `role` doit rester sans danger : la colonne a un défaut.
  assert.ok(
    /role TEXT NOT NULL DEFAULT 'customer'/.test(initSchema),
    'la colonne `role` n’a plus de défaut NOT NULL : omettre la colonne à l’insertion échouerait'
  );

  console.log(
    '[PASS] Garde rôle admin : aucun payload d’upsert de profil n’écrit `role`, signUp distingue l’attente de confirmation, la politique RLS interdit toujours l’auto-escalade, et la colonne `role` a son défaut NOT NULL.'
  );
}

runAdminRoleGuardTests().catch(error => {
  console.error('[FAIL] Garde rôle admin :', error);
  process.exitCode = 1;
});
